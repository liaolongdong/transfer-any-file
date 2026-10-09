#!/usr/bin/env node
/**
 * 商店响应四条命令的契约守卫：`item-version` / `upload-state` / `submit-check` / `publish-state`。
 *
 * 为什么这份守卫必须入库：那四条命令是 `release.yml` 里 `case "$rc"` 唯一的数字来源，也是 step
 * summary 上「商店回执」那句话唯一的作者。真商店在本机跑不到，验证它用的仿真夹具又落在 gitignore 的
 * `.test-tmp/` 里——只活在那一轮对话中。守卫进了 `scripts/` 之后，改坏解析逻辑的人在 CI 的 lint job
 * 上撞回来，而不是在下一次真发布时撞回来。
 *
 * 期望值按契约手写，不是从当前输出复制：exit 码取自工作流分支的那三个数（0 放行 / 10 跳过 / 20 拦下；
 * `upload-state` 与 `publish-state` 是 0 / 1），stdout 的形状取自「这句话会被原样 echo 进 step
 * summary」。所以 `submit-check` 只钉到句子的**判决主干**（「可以提审：」「这一版已经在审核队列里」
 * 「商店线上是」……），不钉整句——那几句是给人读的散文，允许重写；不允许的是判决丢了、或者句子从
 * stdout 挪去 stderr（工作流只 echo stdout）。
 *
 * 每条用例真的 spawn 一次 `node scripts/release-ci.mjs`，而不是 import 进来调函数：被工作流依赖的是
 * 那个进程的退出码和两个输出流——尤其 abstain 那几条，它们的解释写在 **stderr 而退出码是 0**，
 * 用只回 stdout 的调用方式会只比对到半个契约还以为比对了全部。
 *
 * 末尾那组钉的是 `release.yml` 自己的文本，因为缺陷正好长在这两个文件的接缝上：
 * - 回执句子由命令自带标签，工作流那行 `echo "- $receipt"` 不许再拼一次前缀（曾经渲染出
 *   「商店回执：商店回执：state=…」，并把标签贴到「商店仍在解包…」那句完全不同的话前面）。
 * - submit-check 那一段的四处形状：调用前有 `rc=0`、调用行带 `|| rc=$?`（否则 `set -e` 在 10 / 20
 *   上先终止，case 读不到判定）、`10)` 分支以 `exit 0` 收尾（少这一支，「已经在商店那边了」会变成
 *   红灯）、`*)` 兜底 `exit 1`（少这一支，商店侧明确拦下时照样往下按 `:publish`）。
 *
 * 调用方式：`pnpm verify:release-ci`，以及 CI 的 lint job。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * 被钉的那两份文件从哪里读。默认是仓库根；`CHECK_CI_ROOT` 指向一棵临时树时，守卫读的是那棵树里的
 * `scripts/release-ci.mjs` 与 `release.yml`——这是给守卫自己做变异验证用的（与 `verify-extension.mjs`
 * 的 `VERIFY_EXT_PATH` 同一手法）：不这样就得就地改坏 `release.yml` 再改回来。CI 里不设这个变量。
 */
const ROOT = path.resolve(process.env.CHECK_CI_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const CI_SCRIPT = 'scripts/release-ci.mjs';
const WORKFLOW = '.github/workflows/release.yml';

const ch = v => ({ crxVersion: v, deployPercentage: 100 });
const published = (...versions) => ({ publishedItemRevisionStatus: { distributionChannels: versions.map(ch) } });
const withSubmitted = (state, version, extra = {}) => ({
  publishedItemRevisionStatus: { distributionChannels: [ch('1.2.0')] },
  submittedItemRevisionStatus: { state, ...(version === null ? {} : { distributionChannels: [ch(version)] }) },
  ...extra,
});

/** 用例里在审版本统一用 1.2.1，好让「线上 1.2.0 / 队列 1.2.2」这些相对关系一眼可辨。 */
const V = '1.2.1';

/**
 * 每条 = 一次真调用。
 * `out` 精确比对 stdout（回执句子就是 step summary 的那一行），`starts` 只比判决主干，
 * `err` 比对 stderr 里那段稳定文字（带绝对路径的解析错误只钉得住前半句）。
 */
const CASES = [
  // ---- item-version：预检只吃它打印的那一行，所以「要么一个版本号、要么什么都不是」是硬契约
  { name: 'iv-one-channel', cmd: 'item-version', body: published(V), exit: 0, out: V },
  { name: 'iv-two-same', cmd: 'item-version', body: published(V, V), exit: 0, out: V },
  {
    name: 'iv-two-differ',
    cmd: 'item-version',
    body: published(V, '1.3.0'),
    exit: 0,
    out: '',
    err: '多个渠道的 crxVersion 不一致',
  },
  {
    name: 'iv-empty-channels',
    cmd: 'item-version',
    body: { publishedItemRevisionStatus: { distributionChannels: [] } },
    exit: 0,
    out: '',
    err: '没有 publishedItemRevisionStatus.distributionChannels',
  },
  {
    name: 'iv-no-state',
    cmd: 'item-version',
    body: { name: 'publishers/p/items/i', itemId: 'i' },
    exit: 0,
    out: '',
    err: '没有 publishedItemRevisionStatus',
  },
  {
    name: 'iv-not-a-version',
    cmd: 'item-version',
    body: published('draft-7'),
    exit: 0,
    out: '',
    err: '没有像版本号的 crxVersion',
  },
  { name: 'iv-spacey', cmd: 'item-version', body: published(` ${V} `), exit: 0, out: V },
  { name: 'iv-four-part', cmd: 'item-version', body: published('1.2.1.4'), exit: 0, out: '1.2.1.4' },
  { name: 'iv-broken-json', cmd: 'item-version', body: '{ not json', exit: 0, out: '', err: '不是可解析的 JSON' },
  { name: 'iv-array-body', cmd: 'item-version', body: [1, 2], exit: 0, out: '', err: '不是一个对象' },
  {
    name: 'iv-html-body',
    cmd: 'item-version',
    body: '<html><body>Sign in</body></html>',
    exit: 0,
    out: '',
    err: '不是可解析的 JSON',
  },
  // v1 的字段形状：v2 里读不到线上版本，预检必须弃权而不是把 1.1.9 当成答案
  {
    name: 'iv-legacy-v11',
    cmd: 'item-version',
    body: { current_version: '1.1.9', version: '1.1.9', kind: 'chromewebstore#item' },
    exit: 0,
    out: '',
    err: '没有 publishedItemRevisionStatus',
  },

  // ---- upload-state
  {
    name: 'up-succeeded',
    cmd: 'upload-state',
    body: { uploadState: 'SUCCEEDED', crxVersion: V, itemId: 'i' },
    exit: 0,
    out: `商店回执：uploadState=SUCCEEDED（商店从包里读到的是 ${V}）`,
  },
  {
    name: 'up-in-progress',
    cmd: 'upload-state',
    body: { uploadState: 'IN_PROGRESS' },
    exit: 0,
    out: '商店仍在解包（uploadState=IN_PROGRESS）；接着的 publish 提审可能因此报错，进度可用 fetchStatus 再读一次。',
  },
  {
    name: 'up-failed',
    cmd: 'upload-state',
    body: { uploadState: 'FAILED', crxVersion: V },
    exit: 1,
    out: '',
    err: '商店把这次上传判为 FAILED',
  },
  {
    name: 'up-not-found',
    cmd: 'upload-state',
    body: { uploadState: 'NOT_FOUND' },
    exit: 1,
    out: '',
    err: '商店把这次上传判为 NOT_FOUND',
  },
  {
    name: 'up-unspecified',
    cmd: 'upload-state',
    body: { uploadState: 'UPLOAD_STATE_UNSPECIFIED' },
    exit: 0,
    out: '商店回执：uploadState=UPLOAD_STATE_UNSPECIFIED',
  },
  { name: 'up-no-state', cmd: 'upload-state', body: { name: 'x' }, exit: 0, out: '', err: '没有 uploadState' },
  { name: 'up-broken-json', cmd: 'upload-state', body: '{', exit: 0, out: '', err: '不是可解析的 JSON' },
  { name: 'up-array-body', cmd: 'upload-state', body: ['a'], exit: 0, out: '', err: '不是一个对象' },

  // ---- submit-check：0 放行 / 10 跳过（不算失败）/ 20 拦下
  {
    name: 'sc-normal-after-upload',
    cmd: 'submit-check',
    version: V,
    body: { ...published('1.2.0'), name: 'x' },
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'sc-first-publish',
    cmd: 'submit-check',
    version: '1.0.0',
    body: { name: 'x', itemId: 'i' },
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'sc-submitted-same',
    cmd: 'submit-check',
    version: V,
    body: withSubmitted('PENDING_REVIEW', V),
    exit: 10,
    starts: '这一版已经在审核队列里',
  },
  {
    name: 'sc-submitted-other',
    cmd: 'submit-check',
    version: V,
    body: withSubmitted('PENDING_REVIEW', '1.2.2'),
    exit: 20,
    starts: '审核队列里已经有',
  },
  {
    name: 'sc-submitted-nover',
    cmd: 'submit-check',
    version: V,
    body: withSubmitted('PENDING_REVIEW', null),
    exit: 20,
    starts: '审核队列里已经有',
  },
  {
    name: 'sc-submitted-staged',
    cmd: 'submit-check',
    version: V,
    body: withSubmitted('STAGED', V),
    exit: 10,
    starts: '这一版已经在审核队列里',
  },
  {
    name: 'sc-submitted-rejected',
    cmd: 'submit-check',
    version: V,
    body: withSubmitted('REJECTED', V),
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'sc-submitted-cancelled',
    cmd: 'submit-check',
    version: V,
    body: withSubmitted('CANCELLED', V),
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'sc-submitted-unspec',
    cmd: 'submit-check',
    version: V,
    body: withSubmitted('ITEM_STATE_UNSPECIFIED', V),
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'sc-published-equal',
    cmd: 'submit-check',
    version: V,
    body: published(V),
    exit: 10,
    starts: '商店线上已经是',
  },
  {
    name: 'sc-published-higher',
    cmd: 'submit-check',
    version: V,
    body: published('1.3.0'),
    exit: 20,
    starts: '商店线上是',
  },
  {
    name: 'sc-published-four-part-equal',
    cmd: 'submit-check',
    version: V,
    body: published('1.2.1.0'),
    exit: 10,
    starts: '商店线上已经是',
  },
  {
    name: 'sc-async-in-progress',
    cmd: 'submit-check',
    version: V,
    body: { ...published('1.2.0'), lastAsyncUploadState: 'IN_PROGRESS' },
    exit: 20,
    starts: '商店还在解包刚上传的 revision',
  },
  {
    name: 'sc-async-failed',
    cmd: 'submit-check',
    version: V,
    body: { ...published('1.2.0'), lastAsyncUploadState: 'FAILED' },
    exit: 20,
    starts: '商店把最近一次上传判为 FAILED',
  },
  {
    name: 'sc-async-succeeded',
    cmd: 'submit-check',
    version: V,
    body: { ...published('1.2.0'), lastAsyncUploadState: 'SUCCEEDED' },
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'sc-taken-down',
    cmd: 'submit-check',
    version: V,
    body: { ...published('1.2.0'), takenDown: true, warned: true },
    exit: 0,
    starts: '可以提审：',
    also: a => a.stdout.includes('被下架') && a.stdout.includes('警告'),
  },
  { name: 'sc-broken-json', cmd: 'submit-check', version: V, body: '{ nope', exit: 0, starts: '读不到商店的条目状态' },
  { name: 'sc-array-body', cmd: 'submit-check', version: V, body: [], exit: 0, starts: '商店的条目状态不是一个对象' },
  {
    name: 'sc-unreadable-channels',
    cmd: 'submit-check',
    version: V,
    body: { publishedItemRevisionStatus: { distributionChannels: [{}] }, name: 'x' },
    exit: 0,
    starts: '可以提审：线上版本号读不到',
  },
  {
    name: 'sc-differing-channels',
    cmd: 'submit-check',
    version: V,
    body: published('1.2.0', '1.4.0'),
    exit: 0,
    starts: '可以提审：线上版本号读不到',
  },

  // ---- publish-state
  {
    name: 'ps-pending',
    cmd: 'publish-state',
    body: { state: 'PENDING_REVIEW', itemId: 'i' },
    exit: 0,
    out: '商店回执：state=PENDING_REVIEW',
  },
  {
    name: 'ps-staged',
    cmd: 'publish-state',
    body: { state: 'STAGED', warningInfo: { warnings: [{ reason: 'R1', description: 'd1' }] } },
    exit: 0,
    out: '商店回执：state=STAGED；1 条非阻断告警（R1：d1）',
  },
  {
    name: 'ps-published',
    cmd: 'publish-state',
    body: { state: 'PUBLISHED' },
    exit: 0,
    out: '商店回执：state=PUBLISHED',
  },
  {
    name: 'ps-testers',
    cmd: 'publish-state',
    body: { state: 'PUBLISHED_TO_TESTERS' },
    exit: 0,
    out: '商店回执：state=PUBLISHED_TO_TESTERS（注意：这表示只发布给了测试人员，不是全体用户）',
  },
  {
    name: 'ps-rejected',
    cmd: 'publish-state',
    body: { state: 'REJECTED' },
    exit: 1,
    out: '',
    err: '商店把这次提交判为 REJECTED',
  },
  {
    name: 'ps-cancelled',
    cmd: 'publish-state',
    body: { state: 'CANCELLED' },
    exit: 1,
    out: '',
    err: '商店把这次提交判为 CANCELLED',
  },
  {
    name: 'ps-unspecified',
    cmd: 'publish-state',
    body: { state: 'ITEM_STATE_UNSPECIFIED' },
    exit: 0,
    out: '商店回执：state=ITEM_STATE_UNSPECIFIED',
  },
  { name: 'ps-no-state', cmd: 'publish-state', body: { name: 'x' }, exit: 0, out: '', err: '没有 state' },
  { name: 'ps-broken-json', cmd: 'publish-state', body: 'nope', exit: 0, out: '', err: '不是可解析的 JSON' },

  // ---- 分支顺序覆盖不到、但确实会走到的形状
  {
    name: 'probe-four-digit-higher',
    cmd: 'submit-check',
    version: V,
    body: published('1.2.1.1'),
    exit: 20,
    starts: '商店线上是',
  },
  {
    name: 'probe-channels-agree-across-formats',
    cmd: 'submit-check',
    version: V,
    body: published('1.2.1.0', V),
    exit: 0,
    starts: '可以提审：线上版本号读不到',
    also: a => a.stdout.includes('互不一致'),
  },
  {
    name: 'probe-submitted-published-is-not-in-review',
    cmd: 'submit-check',
    version: V,
    body: {
      submittedItemRevisionStatus: { state: 'PUBLISHED', distributionChannels: [ch(V)] },
      ...published('1.2.0'),
    },
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'probe-submitted-as-string',
    cmd: 'submit-check',
    version: V,
    body: { submittedItemRevisionStatus: 'n/a' },
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'probe-version-with-v-prefix',
    cmd: 'submit-check',
    version: 'v1.2.1',
    body: {},
    exit: 20,
    out: '',
    err: '必须是本次要发布的版本号',
  },
  {
    name: 'probe-async-unspecified',
    cmd: 'submit-check',
    version: V,
    body: { lastAsyncUploadState: 'UPLOAD_STATE_UNSPECIFIED' },
    exit: 0,
    starts: '可以提审：',
  },
  {
    name: 'probe-in-review-beats-in-progress',
    cmd: 'submit-check',
    version: V,
    body: {
      ...published('1.2.0'),
      lastAsyncUploadState: 'IN_PROGRESS',
      submittedItemRevisionStatus: { state: 'PENDING_REVIEW', distributionChannels: [ch(V)] },
    },
    exit: 10,
    starts: '这一版已经在审核队列里',
  },
  {
    name: 'probe-taken-down-false-silent',
    cmd: 'submit-check',
    version: V,
    body: { ...published('1.2.0'), takenDown: false },
    exit: 0,
    also: a => !a.stdout.includes('下架'),
  },
  {
    name: 'probe-warnings-reach-receipt',
    cmd: 'publish-state',
    body: { state: 'PENDING_REVIEW', warningInfo: { warnings: [{ reason: 'A' }, { description: 'only' }] } },
    exit: 0,
    also: a => a.stdout.includes('2 条非阻断告警') && a.stdout.includes('（无 reason）') && a.stdout.includes('only'),
  },
  {
    name: 'probe-rejected-with-warnings-still-fails',
    cmd: 'publish-state',
    body: { state: 'REJECTED', warningInfo: { warnings: [{ reason: 'POLICY' }] } },
    exit: 1,
    err: 'POLICY',
  },

  // ---- 调用面：参数缺失与未知命令。没有 body 的用例也就不传文件路径，因此同样不能再带版本号
  //      （argv 是位置参数，`submit-check 1.2.1` 会被当成「文件叫 1.2.1」而不是「版本是 1.2.1」）。
  { name: 'iv-missing-file', cmd: 'item-version', exit: 0, out: '', err: '需要 GET 响应体的路径' },
  { name: 'sc-missing-file', cmd: 'submit-check', exit: 20, out: '', err: '需要 GET 响应体的路径' },
  {
    name: 'sc-missing-version',
    cmd: 'submit-check',
    body: published('1.2.0'),
    exit: 20,
    out: '',
    err: '必须是本次要发布的版本号',
  },
  { name: 'unknown-command', cmd: 'bogus', body: { x: 1 }, exit: 2, err: 'submit-check / publish-state' },
];

/**
 * 跑一条用例：body 落进系统临时目录里的一个文件（工作流传的就是文件路径，不是 stdin），
 * 用 spawnSync 而不是 execFileSync——abstain 那几条「stderr 有解释、退出码是 0」，
 * execFileSync 成功时只把 stdout 交回来，等于比对了半个契约还以为全比对了。
 */
function run(caseDef, dir) {
  const argv = [path.join(ROOT, CI_SCRIPT), caseDef.cmd];
  if (caseDef.body !== undefined) argv.push(path.join(dir, `${caseDef.name}.json`));
  if (caseDef.version) argv.push(caseDef.version);
  const r = spawnSync('node', argv, { cwd: ROOT, encoding: 'utf8' });
  return { exit: r.status ?? -1, stdout: (r.stdout || '').trimEnd(), stderr: (r.stderr || '').trimEnd() };
}

function check(caseDef, dir, failures) {
  const a = run(caseDef, dir);
  const problems = [];
  if (a.exit !== caseDef.exit) problems.push(`exit=${String(a.exit)} 应为 ${String(caseDef.exit)}`);
  if ('out' in caseDef && caseDef.out !== null && a.stdout !== caseDef.out)
    problems.push(`stdout=${JSON.stringify(a.stdout)} 应为 ${JSON.stringify(caseDef.out)}`);
  if (caseDef.starts && !a.stdout.startsWith(caseDef.starts))
    problems.push(`stdout 的判决主干不是「${caseDef.starts}」：${JSON.stringify(a.stdout)}`);
  if (caseDef.err && !a.stderr.includes(caseDef.err))
    problems.push(`stderr 里没有「${caseDef.err}」：${JSON.stringify(a.stderr)}`);
  if (caseDef.also && !caseDef.also(a))
    problems.push(`附加断言未过：stdout=${JSON.stringify(a.stdout)} stderr=${JSON.stringify(a.stderr)}`);
  if (problems.length)
    failures.push(
      `${caseDef.name}：${problems.join('；')}\n    exit=${String(a.exit)} out=${JSON.stringify(a.stdout)} err=${JSON.stringify(a.stderr)}`,
    );
  return a;
}

/**
 * `release.yml` 里 submit-check 那一段的三处形状。缺陷正好长在两个文件的接缝上，
 * 命令侧的守卫看不见它——上一轮的「商店回执：商店回执：…」就是这么漏出去又修掉的。
 */
function checkWorkflow(failures) {
  const wf = fs.readFileSync(path.join(ROOT, WORKFLOW), 'utf8');

  const doubled = wf.match(/商店回执：\s*\$\{?[A-Za-z_]\w*[^"\n]*/);
  if (doubled) {
    failures.push(
      `release.yml：把「商店回执：」拼在了命令输出前面（${doubled[0]}）。` +
        '命令的 stdout 自己就带这句话，工作流那行应当是 echo "- $receipt"；再拼一次会渲染出重复标签，' +
        '而 IN_PROGRESS 那条 stdout 根本不是「商店回执：」开头，贴上去了就是一句假话。',
    );
  }

  const lines = wf.split('\n');
  const callAt = lines.findIndex(l => l.includes('submit-check item.json'));
  const esacAt = callAt === -1 ? -1 : lines.findIndex((l, i) => i > callAt && /^[ \t]*esac\b/.test(l));
  if (callAt === -1 || esacAt === -1) {
    failures.push(
      'release.yml：找不到 submit-check 的调用点或它所属的 case 块，下面四条钉因此没有生效——先去修这条守卫。',
    );
    return;
  }
  const callLine = lines[callAt];
  const before = lines.slice(Math.max(0, callAt - 5), callAt).join('\n');
  // `rc=0` 必须写在调用之前：放行时 `|| rc=$?` 不执行，`set -u` 下一没定义过的 rc 会直接中断步骤
  // （`${probe}` 那次同类事故就是这个形状）。
  if (!/\brc=0\b/.test(before))
    failures.push('release.yml：submit-check 调用之前没有 rc=0，放行路径会在 set -u 下自己断掉。');
  // 退出码非零必须由 `||` 接下来：否则 `set -e` 在 10 / 20 上直接终止，case 块根本没机会读它。
  if (!/\|\|\s*rc=\$\?/.test(callLine))
    failures.push('release.yml：调用 submit-check 那行没有 `|| rc=$?`，非零判定会在 case 之前终止步骤。');

  const block = lines.slice(callAt, esacAt).join('\n');
  // 10 = 这一版已经在商店那边了：跳过并且必须是绿灯，落到 `*)` 就变成一次假红。
  const skip = block.match(/\n[ \t]*10\)([\s\S]*?)\n[ \t]*;;/);
  if (!skip) failures.push('release.yml：case 块里没有 10) 分支——「已经在商店那边了」会被 `*)` 判成失败。');
  else if (!/exit 0/.test(skip[1])) failures.push('release.yml：10) 分支没有 exit 0——跳过会被写成红灯。');
  const stop = block.match(/\n[ \t]*\*\)([\s\S]*?)\n[ \t]*;;/);
  if (!stop) failures.push('release.yml：case 块里没有 *) 兜底分支——20（拦下）会一路走过去按 :publish。');
  else if (!/exit 1/.test(stop[1]))
    failures.push('release.yml：*) 分支没有 exit 1——商店侧状态不允许提审时步骤不会变红。');
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-release-ci-'));
const failures = [];
try {
  for (const caseDef of CASES) {
    if (caseDef.body !== undefined) {
      const text = typeof caseDef.body === 'string' ? caseDef.body : `${JSON.stringify(caseDef.body, null, 2)}\n`;
      fs.writeFileSync(path.join(dir, `${caseDef.name}.json`), text, 'utf8');
    }
    check(caseDef, dir, failures);
  }
  checkWorkflow(failures);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\nrelease-ci 契约守卫发现 ${String(failures.length)} 处不一致：`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    '\n这些退出码和句子就是 release.yml 的 case 分支与 step summary 直接吃的东西。' +
      '改契约（而不是改回期望值）请同时改工作流、两份发布手册和这里的表。',
  );
  process.exit(1);
}
console.log(
  `OK  release-ci：${String(CASES.length)} 条商店响应判定与契约句子一致，外加 release.yml 那 5 处接缝钉（1 处标签拼接 + 4 处 case 形状）`,
);
