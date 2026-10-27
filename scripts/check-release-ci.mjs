#!/usr/bin/env node
/**
 * 商店响应四条命令的契约守卫：`item-version` / `upload-state` / `submit-check` / `publish-state`，
 * 外加第九条 `approval-gate`——它读的不是商店而是 GitHub 自己（那道审批门的保护规则）。
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
 * - 只读档 `store_status` 的五处：作业在、不挂 `environment`、`if` 认 `store_status_only`、版本号仍经
 *   `item-version` 读（同一条 `crxVersion` 路径只许一个实现），以及 `release` 作业的 `if` 把这一档排除
 *   在构建与上传之外。
 * - 审批门自证 `approval-gate` 的四处：两处调用都在（上传前报告、提审前拦下）、拦下那一处在 `:publish`
 *   **之前**、它失败时真的 `exit 1`、以及它读的环境名就是 `store_submit` 挂着的那个 `environment.name`。
 *   这一组防的是同一类静默：引用一个不存在的环境不会失败，GitHub 会建一个不带保护规则的同名环境。
 *
 * 末尾还有一组不是文本匹配而是**临时 git 树**的夹具（`checkReleaseStartPoint`），钉 `scripts/release.mjs`
 * 的统计起点：标签落后于 changelog 里最高的版本小节时，起点必须是写下那一小节的提交。这组必须自己造树，
 * 因为缺陷长在两路信号的优先关系上——商店侧停在旧版、`main` 连发几版而中间那些标签没人推时，
 * 每次合并 Release PR 都会把上一版收录的提交再列一遍并算出更高的下一版（2026-10-27 的现实形态）。
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

  // ---- approval-gate
  // 钉的全是「闸门算不算真实存在」这一件事。放行只有一种形状（required_reviewers + 至少一名审查员），
  // 其余一律拦下——被拦下的代价是一次红灯，误放行的代价是一次没有人点头的提审，不可撤回。
  {
    name: 'gate-ok-one-reviewer',
    cmd: 'approval-gate',
    body: {
      name: 'cws-release',
      protection_rules: [
        {
          type: 'required_reviewers',
          prevent_self_review: false,
          reviewers: [{ reviewer: { type: 'User', login: 'owner' } }],
        },
      ],
    },
    exit: 0,
    starts: '审批门自证通过：1 名必需审查员，prevent_self_review=false',
  },
  {
    name: 'gate-ok-two-reviewers',
    cmd: 'approval-gate',
    body: {
      protection_rules: [
        {
          type: 'required_reviewers',
          prevent_self_review: true,
          reviewers: [{ reviewer: { login: 'a' } }, { reviewer: { login: 'b' } }],
        },
      ],
    },
    exit: 0,
    out: '审批门自证通过：2 名必需审查员，prevent_self_review=true',
  },
  {
    name: 'gate-shell-environment',
    cmd: 'approval-gate',
    body: { name: 'cws-release', protection_rules: [] },
    exit: 1,
    err: '没有 required_reviewers',
  },
  {
    name: 'gate-wait-timer-only',
    cmd: 'approval-gate',
    body: { protection_rules: [{ type: 'wait_timer', wait_timer: 30 }] },
    exit: 1,
    err: '没有 required_reviewers',
  },
  {
    name: 'gate-zero-reviewers',
    cmd: 'approval-gate',
    body: { protection_rules: [{ type: 'required_reviewers', reviewers: [] }] },
    exit: 1,
    err: '名单是空的',
  },
  {
    name: 'gate-no-protection-field',
    cmd: 'approval-gate',
    body: { name: 'cws-release', can_admins_bypass: true },
    exit: 1,
    err: '没有 protection_rules 数组',
  },
  { name: 'gate-unparseable', cmd: 'approval-gate', body: 'not json', exit: 1, err: '读不到环境的响应' },
  { name: 'gate-no-argument', cmd: 'approval-gate', exit: 1, err: '需要环境响应的路径' },
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
 * `release.yml` 里 submit-check 那一段的四处形状，外加只读档的第五组。缺陷正好长在两个文件的接缝上，
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

  // ── 只读档（store_status）那五处 ────────────────────────────
  // 这一档存在的唯一理由是「不写商店、也不要人批准」，所以它随时能跑；两个前提一旦被顺手改掉，
  // 它就退化成「想验凭据就得先传一次包」，而那条链路恰恰是凭据配错时最贵的一次试错。
  const statusAt = lines.findIndex(l => /^ {2}store_status:$/.test(l));
  if (statusAt === -1) {
    failures.push('release.yml：找不到 store_status 作业——验凭据链重新只能靠一次真上传来暴露。');
  } else {
    const nextJob = lines.findIndex((l, i) => i > statusAt && /^ {2}[a-z_]+:$/.test(l));
    const statusBlock = lines.slice(statusAt, nextJob === -1 ? lines.length : nextJob).join('\n');
    if (/^[ \t]+environment:/m.test(statusBlock))
      failures.push('release.yml：store_status 挂了 environment——一次只读查询变成一次审批，这一档就没用了。');
    if (!/store_status_only == 'true'/.test(statusBlock))
      failures.push('release.yml：store_status 的作业级 if 不再认 store_status_only，它会跟着每次发布一起跑。');
    // 同一条 crxVersion 字段路径只许有一个实现（`item-version`），否则三档读的分数线可以不一样。
    if (!/release-ci\.mjs item-version item\.json/.test(statusBlock))
      failures.push('release.yml：store_status 没有用 item-version 读线上版本号——crxVersion 出现了第二个实现。');
  }
  // 只读那一档不许顺带构建与上传：release 作业的 if 必须把 store_status_only 否定掉。
  const headBlock = lines.slice(0, statusAt === -1 ? lines.length : statusAt).join('\n');
  if (!/!\(github\.event_name == 'workflow_dispatch' &&[\s\S]{0,120}store_status_only == 'true'\)/.test(headBlock))
    failures.push(
      'release.yml：release 作业的 if 不再否定 store_status_only——跑一次只读查询会顺带构建、打包，' +
        '并在 dry_run 没勾时把包传给商店。',
    );

  // ── 审批门自证（approval-gate）那四处 ────────────────────────
  // 引用一个不存在的环境不会失败，GitHub 会建一个没有保护规则的同名环境，于是「作业挂了 environment」
  // 与「有人必须先点头」可以是两件事。这四处钉的是：这道自证存在、它在动手之前跑、它会真的拦下来，
  // 以及它查的就是这道门本身指向的那个环境。
  const gateCalls = wf.match(/release-ci\.mjs approval-gate/g) || [];
  if (gateCalls.length < 2)
    failures.push(
      `release.yml：approval-gate 只被调用 ${String(gateCalls.length)} 次——应当是两处：上传前只报告（每次发布都跑，` +
        '好让「Actions 令牌读不到环境」这类意外在有人开自动提审之前暴露），提审前才拦。',
    );
  const submitAt = lines.findIndex(l => /^ {2}store_submit:$/.test(l));
  if (submitAt === -1) {
    failures.push('release.yml：找不到 store_submit 作业——审批门无从谈起，自证也无从谈起。');
  } else {
    const submitBlock = lines.slice(submitAt).join('\n');
    const gatePos = submitBlock.indexOf('approval-gate');
    // 比对的是真正那次写请求的 URL，不是正文里提到 `:publish` 的地方——注释里说这个词说了好几次，
    // 拿第一次出现的位置比就会把「拦在动手之前」误判成「拦在动手之后」。
    const publishPos = submitBlock.search(/\$api\/\$name:publish/);
    if (publishPos === -1)
      failures.push(
        'release.yml：store_submit 里找不到 `$api/$name:publish` 那行——排序钉失去参照，这道守卫会一直报绿。',
      );
    if (gatePos === -1)
      failures.push('release.yml：store_submit 里没有 approval-gate——环境被删过一次就变成无人批准直接提审。');
    else if (publishPos !== -1 && gatePos > publishPos)
      failures.push(
        'release.yml：store_submit 里的 approval-gate 排在 :publish 之后——拦在不可撤回的动作后面等于没拦。',
      );
    else {
      // 只要求这条判据存在：这一步失败必须让作业变红，否则自证只是日志里的一句话。
      const nextStep = submitBlock.indexOf('- name:', gatePos + 1);
      const gateStep = submitBlock.slice(gatePos, nextStep === -1 ? submitBlock.length : nextStep);
      if (!/exit 1/.test(gateStep))
        failures.push('release.yml：store_submit 的闸门自证失败时没有 exit 1——它会在说完「不提审」之后继续提审。');
    }
    // 自证读的环境名必须就是这道门指向的环境，否则查的是一个、等的是另一个。
    // 只在自证真的在这个作业里时才核对：步骤被整块删掉时上面那条已经说清楚了，这里再报一句
    // 「环境名读不出来」会把人往「是不是改了环境名」的方向带——那是另一件没发生的事。
    const envName = /^\s+name:\s*([a-z0-9-]+)\s*$/m.test(submitBlock)
      ? submitBlock.match(/^\s+name:\s*([a-z0-9-]+)\s*$/m)[1]
      : null;
    if (gatePos !== -1) {
      if (!envName)
        failures.push('release.yml：store_submit 的 environment.name 读不出来——无法核对自证查的是哪个环境。');
      else if (!submitBlock.includes(`environments/${envName}`))
        failures.push(
          `release.yml：这道门挂的是 environment「${envName}」，但自证读的不是它——查一个环境、等另一个环境的批准，两个都不可信。`,
        );
    }
  }
}

/**
 * `release.mjs` 统计起点的夹具——这一组钉的不是命令，而是那个纯函数在三棵树上的取值。
 *
 * 为什么必须是夹具而不是文本匹配：缺陷长在「标签」与「changelog 最高小节」这两路信号的优先关系上，
 * 只有真 git 树能同时给出 `git describe` 的答案和 `-S` 找不找得到那一笔提交。2026-10-27 的现实形态是
 * 商店侧还停在旧版、`main` 已经连发四版而中间那些标签没人推（`RELEASE_PAT` 未配），于是每次合并
 * Release PR 都让起点仍停在那枚旧标签上，把上一版已经收录的提交再列一遍、算出更高的下一版、开下一个 PR。
 *
 * 三条判据互相是对照组，少任何一条都可能是量具没干活：
 * - **落后**：标签 `v1.0.0` 之后又有一笔 `feat`，再一笔 `chore(release)` 把 `## [1.1.0]` 写进 changelog。
 *   起点必须是那笔发布提交（`startSource=changelog-heading`、收录 0 条、无可发布内容），
 *   而不是那枚标签（那就是上面那个循环）。标签名写进 `range` 里，所以「夹具没建起来、只是没标签」
 *   和「真的判定标签落后」在这里是分得开的两种绿。
 * - **有牙**：同一棵树再加一笔 `feat`，必须重新变成可发布、且**只**收录这一笔。
 *   缺这一条，「什么都不报」也能满足上一条。
 * - **抢回来**：把 `v1.1.0` 补在那笔发布提交上，起点必须回到标签路径——钉的是修正没有把标签一路降级，
 *   配好 `RELEASE_PAT` 之后链路照旧按标签走。
 *
 * @param {string[]} failures
 */
function checkReleaseStartPoint(failures) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-release-plan-'));
  try {
    const repo = path.join(base, 'repo');
    fs.mkdirSync(path.join(repo, 'scripts'), { recursive: true });
    // 复制的是 ROOT 里那份脚本，不是 `release-ci.mjs`：被钉的必须是待验证的那棵树里真正会跑的实现，
    // 否则 CHECK_CI_ROOT 指到临时树时，这条守卫会拿仓库里的旧脚本去验一棵新造的树。
    fs.copyFileSync(path.join(ROOT, 'scripts', 'release.mjs'), path.join(repo, 'scripts', 'release.mjs'));

    const zh = sections => ['# 更新日志', '', '## [未发布]', '', ...sections].join('\n');
    const en = sections => ['# Changelog', '', '## [Unreleased]', '', ...sections].join('\n');
    const releaseSection = (version, bullets) => [
      `## [${version}] - 2026-01-01`,
      '',
      '### 新增',
      '',
      ...bullets.map(subject => `- ${subject}`),
      '',
    ];
    /** 写这几份文件与 package.json，提交，返回新 HEAD——每一步都必须真的有改动，空提交会让 git 报错。 */
    const commit = (message, files, version) => {
      for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(repo, name), text, 'utf8');
      const pkg = `${JSON.stringify({ name: 'fixture', version }, null, 2)}\n`;
      fs.writeFileSync(path.join(repo, 'package.json'), pkg, 'utf8');
      g(repo, ['add', '-A']);
      g(repo, ['commit', '-m', message]);
      return g(repo, ['rev-parse', 'HEAD']);
    };

    g(repo, ['init']);
    g(repo, ['config', 'user.name', 'guard']);
    g(repo, ['config', 'user.email', 'guard@example.invalid']);
    commit('feat: 甲功能', { 'CHANGELOG.md': zh([]), 'CHANGELOG.en.md': en([]) }, '1.0.0');
    g(repo, ['tag', 'v1.0.0']);
    commit('feat: 乙功能', { 'feature.txt': '乙\n' }, '1.0.0');
    // 这一笔就是「发布提交」：它把 `## [1.1.0]` 写进两份 changelog、把 package.json 抬到 1.1.0，
    // 而 `## [未发布]` 留在空的状态——与合并 Release PR 之后的 main 同形。
    const releaseCommit = commit(
      'chore(release): 1.1.0 —— 双语 changelog 提升与版本 bump',
      {
        'CHANGELOG.md': zh(releaseSection('1.1.0', ['甲功能', '乙功能'])),
        'CHANGELOG.en.md': en(releaseSection('1.1.0', ['Feature A', 'Feature B'])),
      },
      '1.1.0',
    );

    // ── 1. 标签落后 ────────────────────────────────────────────
    const behind = plan(repo, base, 'behind');
    if (behind.startSource !== 'changelog-heading')
      failures.push(
        `起点-标签落后：startSource=${behind.startSource} 应为 changelog-heading（起点仍是 ${behind.range}，` +
          '于是上一版收录的提交会被再列一遍，每次合并都多开一个 Release PR）。',
      );
    if (behind.releasable !== false || behind.counts.listed !== 0)
      failures.push(
        `起点-标签落后：releasable=${String(behind.releasable)} listed=${String(behind.counts.listed)}，` +
          `应为 false / 0（收录的正是 ${JSON.stringify(behind.entries.map(entry => entry.zh))}）。`,
      );
    if (!behind.range.includes('标签 v1.0.0 已落后'))
      failures.push(
        `起点-标签落后：range=${JSON.stringify(behind.range)} 里没有「标签 v1.0.0 已落后」——` +
          '这棵树大概根本没建出标签，那条 changelog-heading 是「无 tag」的回落，不是本条要钉的修正。',
      );

    // ── 2. 有牙：新工作仍要报可发布，而且只报这一笔 ──────────────
    const newWork = commit('feat: 丙功能', { 'feature.txt': '丙\n' }, '1.1.0');
    const armed = plan(repo, base, 'armed');
    if (armed.releasable !== true || armed.counts.listed !== 1 || armed.entries[0].hash !== newWork.slice(0, 7))
      failures.push(
        `起点-有牙：releasable=${String(armed.releasable)} listed=${String(armed.counts.listed)} ` +
          `entries=${JSON.stringify(armed.entries.map(entry => entry.hash))}，应为 true / 1 / [${newWork.slice(0, 7)}]` +
          '——修正把该报的也一起压住了，那条 changelog-heading 就成了沉默。',
      );

    // ── 3. 抢回来：标签补到最新版本时，起点回到标签路径 ──────────
    g(repo, ['tag', 'v1.1.0', releaseCommit]);
    const tagged = plan(repo, base, 'tagged');
    if (tagged.startSource !== 'tag' || tagged.range !== 'v1.1.0..HEAD')
      failures.push(
        `起点-标签优先：startSource=${tagged.startSource} range=${JSON.stringify(tagged.range)}，` +
          '应为 tag 与 `v1.1.0..HEAD`——配好 RELEASE_PAT 之后这条链路得按标签走。',
      );
    if (tagged.releasable !== true || tagged.counts.listed !== 1)
      failures.push(
        `起点-标签优先：releasable=${String(tagged.releasable)} listed=${String(tagged.counts.listed)}，` +
          '应为 true / 1（标签路径也要能看见那一笔新 feat，否则两条路都瞎）。',
      );
  } catch (error) {
    failures.push(
      `起点夹具没能跑完（量具自己出错等于这一组没有守卫）：${error && error.message ? error.message : error}`,
    );
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

/** 在夹具树里跑一次只读计划，返回 `--json` 的那份报告。 */
function plan(repo, base, name) {
  const out = path.join(base, `plan-${name}.json`);
  const r = spawnSync('node', [path.join(repo, 'scripts', 'release.mjs'), '--json', out], {
    cwd: repo,
    encoding: 'utf8',
    env: gitEnv(),
  });
  if (r.status !== 0)
    throw new Error(`release.mjs（${name}）exit=${String(r.status)}：${(r.stderr || r.stdout || '').trim()}`);
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

/** 夹具里跑 git：去掉继承来的 worktree 指针，并禁掉签名——本机或 runner 的全局配置不该改变这条守卫。 */
function g(repo, args) {
  const r = spawnSync('git', ['-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: gitEnv(),
  });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} exit=${String(r.status)}：${(r.stderr || '').trim()}`);
  return (r.stdout || '').trim();
}

/** `GIT_DIR` 之类由外层传进来的指针会把临时树当成别人的工作区来操作，一律摘掉。 */
function gitEnv() {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_COMMON_DIR;
  return env;
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
  checkReleaseStartPoint(failures);
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
  `OK  release-ci：${String(CASES.length)} 条判定与契约句子一致，` +
    '外加 release.yml 的接缝钉四组（标签拼接 / submit-check 的 case 形状 / 只读档 / 审批门自证，形状清单见本文件头），' +
    '再加 release.mjs 统计起点夹具三棵树（标签落后 / 有牙 / 标签优先）',
);
