#!/usr/bin/env node
/**
 * 用 Google Cloud 服务账号换一枚 Chrome Web Store 的 access_token，并把 curl 要用的两行 header
 * 落到一个 600 权限的配置文件里。`release.yml` 的商店步骤先跑这一条，再用 `curl --config` 打 API。
 *
 * 为什么不是原来那套 refresh token：Chrome Web Store API v1.1 的凭据是「桌面应用」OAuth 客户端 +
 * `redirect_uri=urn:ietf:wg:oauth:2.0:oob` 授权码换出来的 refresh token，而 Google 在 2022-02-28 起
 * 禁止新客户端使用该 redirect_uri、2023-01-31 起对**所有**客户端关闭——授权端点在检查客户端之前就返回
 * `错误 400: bad_request`，所以那条链路今天已经拿不到 token 了。v2 支持服务账号（服务器对服务器），
 * 没有「7 天过期」「要点浏览器同意页」「OAuth 应用要发布为 In production」这三件事。v1.1 本身在
 * 2026-10-15 停止服务，所以旧的那套不是「还能用但不方便」，而是两头都要没了。
 *
 * 官方要求的请求形状（https://developer.chrome.com/docs/webstore/service-accounts）：
 * 用 JSON 私钥签一个 RS256 的 JWT，claims 为 `iss`/`scope`/`aud`/`iat`/`exp`，
 * 以 `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` + `assertion=<JWT>` POST 到
 * `https://oauth2.googleapis.com/token`，拿回来的 `access_token` 当作 Bearer 用。
 *
 * 只做认证、不碰商店的三个端点：上传 / fetchStatus / publish 留在工作流里用 runner 自带的 `curl` 打，
 * 与 `gh release create` 而不是第三方 action 是同一条理由——发布路径上不引入第三方东西。
 *
 * 密钥的三种粘贴形状都要能吃，因为它们是三种真实来源：Google 下载的整个 JSON 文件、从 JSON 里复制出来
 * 的 `private_key` 字段值（换行是字面量 `\n`、`=` 是字面量 `\u003d`）、以及已经还原成多行的 PEM。
 * GitHub 的 secret 是多行的，第三种是「做对」的写法，前两种是人实际会粘的东西；认不出来就报一句
 * 「这三类之一」的错误，比在 CI 里抛一个 OpenSSL 的 ASN.1 栈更容易修。
 *
 * 用法：
 *   node scripts/cws-token.mjs <curl-config-path>
 * 环境变量（Actions 里必须显式写在步骤的 `env:` 下，secrets 不会自动变成同名变量）：
 *   CWS_SERVICE_ACCOUNT_EMAIL        — 服务账号的 client_email
 *   CWS_SERVICE_ACCOUNT_PRIVATE_KEY  — 该服务账号的 JSON 私钥（三种形状之一）
 *
 * 输出纪律：access_token 与 JWT 都不打印、不进 argv、不进 `$GITHUB_ENV`；它只活在这个进程和那个
 * 600 的文件里，工作流的 `trap` 在步骤退出时删掉它。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath, URLSearchParams } from 'node:url';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

/**
 * JWT 的有效期。Google 允许到 1 小时，这里取 5 分钟：它只用来换 token，一次请求就消耗掉了，
 * 而比 1 小时短意味着即使这次运行失败、日志里残留的任何东西也在几分钟内失去价值。
 * 不能太短：runner 与 Google 之间的时钟偏差加上一次慢请求，30 秒那一档会造成偶发的 `invalid_grant`。
 */
const ASSERTION_LIFETIME_S = 300;

/**
 * 把三种粘贴形状还原成 Node 能直接吃的 PEM 字符串。
 *
 * @param {string} raw 密钥原文（可能是 JSON 文件、转义过的字段值，或多行 PEM）
 * @returns {string} PEM；无法识别时抛错，错误信息只说形状问题，不回显密钥内容
 */
export function normalizePrivateKey(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('私钥是空的');

  let pem = text;
  if (text.startsWith('{')) {
    // 整个 JSON 密钥文件：private_key 字段里的 \n 与 \u003d 由 JSON.parse 负责还原。
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('像是 JSON 密钥文件却解析失败（复制时多半截断了）');
    }
    if (typeof parsed?.private_key !== 'string' || !parsed.private_key) {
      throw new Error('JSON 里没有非空的 private_key 字段');
    }
    pem = parsed.private_key.trim();
  } else if (!pem.includes('\n') && pem.includes('\\n')) {
    // 从 JSON 里复制出来的字段值：换行还是字面量 \n，等号可能还是 \u003d。
    pem = pem
      .replace(/\\n/g, '\n')
      .replace(/\\u003d/g, '=')
      .trim();
  }

  if (!pem.includes('-----BEGIN')) throw new Error('认不出 PEM 头（期望 "-----BEGIN ... PRIVATE KEY-----"）');
  try {
    // createPrivateKey 会自己辨 PKCS#8 / PKCS#1，所以这里不锁 type：Google 发的是 PKCS#8，
    // 但把人给的形状再收窄一道只会造出第三种失败原因。
    crypto.createPrivateKey(pem);
  } catch (error) {
    throw new Error(`私钥不是一把能用的 RSA 私钥：${error.message}`, { cause: error });
  }
  return pem;
}

/**
 * 签出 JWT 本体。
 *
 * @param {{clientEmail: string, privateKey: string, now?: number}} input 服务账号邮箱与 PEM 私钥
 * @returns {{assertion: string, claims: object}} 三段式 JWT 与其 payload（payload 不含密钥材料）
 */
export function buildAssertion({ clientEmail, privateKey, now = Date.now() }) {
  const iat = Math.floor(now / 1000);
  const claims = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + ASSERTION_LIFETIME_S,
  };
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(privateKey).toString('base64url');
  return { assertion: `${signingInput}.${signature}`, claims };
}

/**
 * 换 access_token。`fetchImpl` 是唯一的注入点，为了在没有网络的机器上也能验请求形状。
 *
 * @param {string} assertion JWT 断言
 * @param {typeof globalThis.fetch} [fetchImpl]
 * @returns {Promise<string>} access_token
 */
export async function exchangeForAccessToken(assertion, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: JWT_BEARER_GRANT, assertion }).toString(),
  });

  if (!res.ok) {
    // 非 2xx 的响应体不会含可用凭据，而 Google 在这里给的就是原因（invalid_grant / accessNotConfigured …），
    // 所以打印它，这是这一步唯一有用的现场信息。
    const body = await res.text().catch(error => error.message);
    throw new Error(`HTTP ${res.status}：${body || '(空响应体)'}`);
  }

  const payload = await res.json().catch(() => ({}));
  if (typeof payload.access_token !== 'string' || !payload.access_token) {
    // 200 却没有 access_token：打印字段名而不是值，免得把一次异常响应写成日志里的凭据。
    throw new Error(`HTTP 200 但响应里没有 access_token（实际字段：${Object.keys(payload).join(', ') || '无'}）`);
  }
  return payload.access_token;
}

/**
 * curl 配置文件的内容：两行 header，与 v2 要求的形状一一对应。
 *
 * @param {string} accessToken
 * @returns {string}
 */
export function curlConfigContents(accessToken) {
  return [`header = "Authorization: Bearer ${accessToken}"`, 'header = "x-goog-api-version: 2"', ''].join('\n');
}

async function main() {
  const [configPath] = process.argv.slice(2);
  if (!configPath) {
    process.stderr.write('用法：node scripts/cws-token.mjs <curl-config-path>\n');
    process.exit(2);
    return;
  }

  const clientEmail = (process.env.CWS_SERVICE_ACCOUNT_EMAIL ?? '').trim();
  const rawKey = process.env.CWS_SERVICE_ACCOUNT_PRIVATE_KEY ?? '';
  if (!clientEmail || !rawKey.trim()) {
    const missing = [!clientEmail && 'CWS_SERVICE_ACCOUNT_EMAIL', !rawKey.trim() && 'CWS_SERVICE_ACCOUNT_PRIVATE_KEY']
      .filter(Boolean)
      .join('、');
    process.stderr.write(
      `cws-token: 缺少 ${missing}（Actions 里得写在步骤的 env: 下，secrets 不会自动成为同名变量）\n`,
    );
    process.exit(1);
    return;
  }

  let privateKey;
  try {
    privateKey = normalizePrivateKey(rawKey);
  } catch (error) {
    process.stderr.write(`cws-token: 私钥读不出来：${error.message}\n`);
    process.exit(1);
    return;
  }

  try {
    const { assertion } = buildAssertion({ clientEmail, privateKey });
    const accessToken = await exchangeForAccessToken(assertion);
    fs.writeFileSync(configPath, curlConfigContents(accessToken), { mode: 0o600 });
    // writeFileSync 的 mode 只在"创建"时生效：目标已存在（工作流里 mktemp 先建了它）就一个字都不改，
    // 于是一份 644 的旧文件会带着 token 继续留在那儿。chmod 单独一步，这句主张才不依赖调用顺序。
    fs.chmodSync(configPath, 0o600);
    // 只报告"拿到了"，不报告它是什么。
    process.stdout.write(`已把两行 header 写入 ${configPath}（0600）；access_token 与 JWT 均不打印。\n`);
  } catch (error) {
    process.stderr.write(`cws-token: 令牌交换失败 —— ${error.message}\n`);
    process.exit(1);
  }
}

// 被 import 时不执行 CLI：`release.yml` 直接跑它，而本地验证要能打开这几个函数逐条断言。
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  main();
}
