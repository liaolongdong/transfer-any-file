#!/usr/bin/env node
/**
 * GitHub Actions adapter for `scripts/release.mjs`.
 *
 * Six commands: three turn one plan document into the things a workflow step needs, one answers the
 * question a *merged* release asks when nobody ran a plan (which version on this branch is still
 * untagged), and two read the Chrome Web Store's own answer back to the workflow.
 *
 *     node scripts/release-ci.mjs output        plan.json   # -> $GITHUB_OUTPUT
 *     node scripts/release-ci.mjs summary       plan.json   # -> $GITHUB_STEP_SUMMARY
 *     node scripts/release-ci.mjs pr-body       plan.json pr-body.md
 *     node scripts/release-ci.mjs pending-tag               # -> vX.Y.Z on stdout, or nothing
 *     node scripts/release-ci.mjs item-version  item.json   # -> the live version, or nothing
 *     node scripts/release-ci.mjs upload-state  resp.json   # -> the store's receipt, or exit 1
 *
 * ## Why this is a file and not `node -e '…'` in the workflow
 *
 * Because it was inline, it was untestable, and it was wrong: a `node -e '…'` payload sits inside a
 * bash single-quoted string, so the first `lines.push('')` in the JavaScript closes that string and
 * bash goes on reading the rest as shell. The step then fails with an error that names neither this
 * script nor YAML. Out here the same code is quoted by nothing, checked by ESLint and Prettier, and
 * runnable against a real `plan.json` before anything is merged.
 *
 * ## Contract with `release.mjs`
 *
 * Only the JSON report is read by the three renderers — `releasable`, `version`, `tag`, `subject`,
 * `range`, `startSource`, `counts`, `entries`, `missingEnglish`, `staleVersionMentions`. Nothing in
 * them recomputes a version or re-reads git, so the plan and the prose in the PR cannot disagree.
 * `pending-tag` is the one command that reads the repository directly, because it runs on a commit
 * where no plan was produced (the merge of a release PR) and it must not trust the branch name alone.
 * `item-version` and `upload-state` read neither: they parse response bodies `release.yml` just
 * downloaded from the store, which is the only way to know what version that store is serving and
 * whether it took the package that was just uploaded.
 *
 * The plan path is resolved against the current directory (Actions runs steps from the workspace
 * root), which is where `release.mjs --json` writes it.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Keep a Changelog headings, Chinese side. The PR body is an operations surface, and per
 * `.qoder/rules/wxt-rules.md` §10 those are written in Chinese; the English section headings live in
 * `release.mjs`, which is the only place that writes `CHANGELOG.en.md`.
 */
const GROUP_LABELS = {
  breaking: '破坏性变更',
  added: '新增',
  changed: '变更',
  fixed: '修复',
  performance: '性能',
  security: '安全',
  other: '其他',
};

/** Emission order matters: it is the order the changelog sections use. */
const GROUP_ORDER = ['breaking', 'added', 'changed', 'fixed', 'performance', 'security', 'other'];

const [, , command, inputFile, outputFile] = process.argv;

if (!command) {
  process.stderr.write(
    'usage: node scripts/release-ci.mjs <output|summary|pr-body> <plan.json> [out.md]\n' +
      '   or: node scripts/release-ci.mjs pending-tag\n' +
      '   or: node scripts/release-ci.mjs item-version <item.json>\n' +
      '   or: node scripts/release-ci.mjs upload-state <resp.json>\n',
  );
  process.exit(2);
}

/** @returns {any} the report written by `release.mjs --json` */
function readPlan(file) {
  if (!file) {
    process.stderr.write(
      'release-ci: 这条命令需要 plan.json 的路径（先跑 node scripts/release.mjs --json plan.json）\n',
    );
    process.exit(2);
  }
  const target = path.resolve(process.cwd(), file);
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    process.stderr.write(
      `release-ci: 读不到 ${target}（先跑 node scripts/release.mjs --json ${file}）：${error.message}\n`,
    );
    process.exit(1);
  }
  if (typeof plan.releasable !== 'boolean' || !plan.counts || !Array.isArray(plan.entries)) {
    process.stderr.write(`release-ci: ${target} 不像 release.mjs 的计划输出，字段不齐\n`);
    process.exit(1);
  }
  return plan;
}

/**
 * Append one `key=value` line to `$GITHUB_OUTPUT`.
 *
 * Multiline values would need Actions' delimiter syntax; every value written here is single-line by
 * construction, and the guard says so loudly instead of producing a silently truncated output.
 */
function writeOutputs(entries, plan) {
  const target = process.env.GITHUB_OUTPUT;
  if (!target) {
    process.stderr.write('release-ci: 没有 $GITHUB_OUTPUT，这一步只能在 Actions 里跑\n');
    process.exit(1);
  }
  const lines = [];
  for (const key of entries) {
    const value = plan[key];
    if (value === undefined || value === null) {
      process.stderr.write(`release-ci: 计划里没有 ${key}\n`);
      process.exit(1);
    }
    const text = String(value);
    if (text.includes('\n')) {
      process.stderr.write(`release-ci: ${key} 含换行，不能直接写成 step output\n`);
      process.exit(1);
    }
    lines.push(`${key}=${text}`);
  }
  fs.appendFileSync(target, `${lines.join('\n')}\n`, 'utf8');
}

function appendSummary(lines) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  // Off Actions there is nowhere to put it; the summary step is presentation, not a gate.
  if (!target) {
    process.stdout.write(`${lines.join('\n')}\n`);
    return;
  }
  fs.appendFileSync(target, `${lines.join('\n')}\n`, 'utf8');
}

/** Group entries by their Keep a Changelog bucket, in the section order the changelog uses. */
function groupByBucket(entries) {
  const buckets = new Map();
  for (const entry of entries) {
    if (!buckets.has(entry.group)) buckets.set(entry.group, []);
    buckets.get(entry.group).push(entry);
  }
  return GROUP_ORDER.filter(key => buckets.has(key)).map(key => [key, buckets.get(key)]);
}

function summaryLines(plan) {
  if (!plan.releasable) {
    const reason = plan.counts.total
      ? `\`${plan.range}\` 之内 ${plan.counts.total} 条提交全属噪声（docs / chore / ci / test 等）`
      : `\`${plan.range}\` 之内没有新提交`;
    return [
      '### 本轮无可发布内容',
      '',
      `- ${reason}。`,
      '- `CHANGELOG.md` 的「未发布」是空的，所以这一版没有可提升的正文。',
      '- 什么都没写，也没有开 PR。攒够实质改动、或把说明手写进「未发布」之后，下一次合并会自动重新计算。',
    ];
  }
  return [
    `### 待审阅的发布：${plan.version}`,
    '',
    `- 区间：\`${plan.range}\`（起点来源 ${plan.startSource}）`,
    `- 提交：共 ${plan.counts.total}，收录 ${plan.counts.listed}，噪声 ${plan.counts.noise}`,
    `- 正文来源：${plan.carriedHandWritten ? '手写「未发布」区块原样提升' : `由 ${plan.counts.listed} 条提交信息生成`}`,
    `- 缺英文行：${plan.missingEnglish.length} 条`,
    `- 下一步：推 \`release/${plan.tag}\` 分支并开 Release PR，合并它才打标签`,
  ];
}

/**
 * Render the Release PR body.
 *
 * The body is the review surface, so it answers the four questions a reviewer actually has: what is
 * this version and why that number, what is in it, what still needs a human before merging, and what
 * happens on merge. The last one names the store default (upload without review) because that is the
 * consequence someone approving the merge is accepting.
 */
function prBody(plan) {
  const out = [];
  out.push(`发布 **${plan.version}**（上一版 ${plan.previousVersion}，判定为 ${plan.bump}）。`);
  out.push('');
  out.push(`- 统计区间：\`${plan.range}\`，起点来源 ${plan.startSource}`);
  out.push(
    `- 提交：共 ${plan.counts.total}，收录 ${plan.counts.listed}，噪声 ${plan.counts.noise}，` +
      `发布提交 ${plan.counts.release}，无前缀 ${plan.counts.unparseable}`,
  );
  out.push(`- 正文：${plan.carriedHandWritten ? '手写「未发布」区块原样提升，未改写一个字' : '由提交信息生成'}`);
  out.push('');

  out.push('## 本次收录');
  out.push('');
  for (const [group, members] of groupByBucket(plan.entries)) {
    out.push(`### ${GROUP_LABELS[group] || group}（${members.length}）`);
    out.push('');
    for (const entry of members) {
      const scope = entry.scope ? `**${entry.scope}**：` : '';
      out.push(`- ${scope}${entry.zh}（\`${entry.hash}\`）`);
    }
    out.push('');
  }

  if (plan.missingEnglish.length) {
    out.push(`## 合并前请补：${plan.missingEnglish.length} 条缺英文说明`);
    out.push('');
    out.push('`CHANGELOG.en.md` 里这些条目暂时沿用了中文主语。两种补法：在本 PR 里直接改英文那份，');
    out.push('或给对应提交加 `Changelog-En:` 尾注后重跑本工作流（关掉再开，或 `workflow_dispatch` 的 `prepare`）。');
    out.push('');
    for (const item of plan.missingEnglish.slice(0, 40)) out.push(`- \`${item.hash}\` ${item.subject}`);
    if (plan.missingEnglish.length > 40) out.push(`- …另有 ${plan.missingEnglish.length - 40} 条`);
    out.push('');
  }

  if (plan.staleVersionMentions.length) {
    const files = [...new Set(plan.staleVersionMentions.map(hit => hit.file))];
    out.push(`## 仍写着 ${plan.previousVersion} 的对外文档（本 PR 不代改）`);
    out.push('');
    out.push('这些句子旁边就是日期与实测数字，改它们要重新取证，所以由人来做：');
    out.push('');
    for (const file of files) out.push(`- \`${file}\``);
    out.push('');
    out.push(`逐行清单：\`git grep -n -F '${plan.previousVersion}'\``);
    out.push('');
  }

  out.push('## 合并之后会发生什么');
  out.push('');
  out.push(`1. 本工作流的 tag 步骤给合并后的 \`main\` 打上 \`${plan.tag}\`。`);
  out.push(
    `2. 已有的 \`release.yml\` 被该标签触发：五道守卫 → 构建 → \`wxt zip\` → 包内容校验 → ` +
      `GitHub Release（发布说明取本次的 \`## [${plan.version}]\` 区块）。`,
  );
  out.push('3. 商店那一步**默认只上传包、不提交审核**（`.github/CHROMEWEBSTORE.md` 三次被拒之后定的默认值）。');
  out.push('');
  out.push('详细说明见 `.github/RELEASE_AUTOMATION.md`。');
  out.push('');
  out.push(`<!-- generated by scripts/release-ci.mjs from the plan over ${plan.range} -->`);
  return `${out.join('\n')}\n`;
}

/**
 * The tag this checkout should have, or nothing.
 *
 * Two independent stores have to agree before a tag is worth creating: the changelog's highest
 * `## [X.Y.Z]` heading (what was documented) and `package.json#version` (what `release.yml` builds and
 * what the store package is named after). A branch name is not evidence — it is what a *closed* release
 * PR would still carry, and tagging from it alone can put `v9.9.9` on a commit that says 1.1.0.
 */
function pendingTag() {
  const cwd = process.cwd();
  let text;
  try {
    text = fs.readFileSync(path.resolve(cwd, 'CHANGELOG.md'), 'utf8');
  } catch (error) {
    process.stderr.write(`release-ci: 读不到 CHANGELOG.md：${error.message}\n`);
    process.exit(1);
  }
  const versions = [...text.matchAll(/^## \[(\d+\.\d+\.\d+)\](?: - [^\n]*)?[ \t]*$/gm)].map(match => match[1]);
  if (!versions.length) {
    process.stderr.write('release-ci: CHANGELOG.md 里还没有任何已发布版本的区块\n');
    process.exit(0);
  }
  const newest = versions.reduce((a, b) => (compare(a, b) >= 0 ? a : b));
  const pkg = JSON.parse(fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf8')).version;
  if (newest !== pkg) {
    process.stderr.write(`release-ci: CHANGELOG.md 最高是 ${newest}，package.json 是 ${pkg} —— 两者没对上，不猜标签\n`);
    process.exit(0);
  }
  process.stdout.write(`v${newest}\n`);
}

/** Numeric compare over already-validated `X.Y.Z` strings. */
function compare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Chrome Web Store version strings are `X.Y` to `X.Y.Z.W`; anything else is not a version. */
const STORE_VERSION_RE = /^\d+(\.\d+){1,3}$/;

/**
 * The version the store is serving, or nothing.
 *
 * `release.yml` asks `GET /v2/publishers/{publisherId}/items/{itemId}:fetchStatus` before uploading, because the
 * store accepts only a package whose version is strictly higher than the live one — and the only place it says so
 * is Google's response body, after a multi-megabyte upload. A number printed here turns that into a one-line
 * "线上已是 1.2.0".
 *
 * v2 puts the number in `publishedItemRevisionStatus.distributionChannels[].crxVersion`（"the extension version
 * provided in the manifest of the uploaded package"）。v1.1 那两个平铺字段（`current_version` / `version`）随着
 * 那个端点一起在 2026-10-15 退役，所以这里只认嵌套的那一个形状，不再保留读旧字形的回落。
 *
 * **Silence is the answer whenever the shape is not recognised, and that is deliberate.** A guess would be worse
 * than abstaining — reading a non-version string as the live version would fail a release that the store would
 * have accepted. So this exits 0 with nothing on stdout for every case it is unsure about (unreadable file,
 * non-JSON body, top level that isn't an object, no `publishedItemRevisionStatus` —— 条目还没发布过，正是第一次
 * 上传的正常状态 —— 没有渠道、多个渠道的 `crxVersion` 互不一致、值不是版本号形状), and the workflow's matching
 * branch is "skip the pre-flight", leaving the upload's own response body as the source of truth. This command
 * never fails a step.
 */
function itemVersion(file) {
  if (!file) {
    process.stderr.write('release-ci: item-version 需要 GET 响应体的路径，例如 item-version item.json\n');
    process.exit(0);
    return;
  }
  const target = path.resolve(process.cwd(), file);

  let item;
  try {
    item = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    // HTTP 200 from a proxy or a login page is JSON-parse failure, not a store answer.
    process.stderr.write(`release-ci: ${target} 不是可解析的 JSON，跳过版本预检：${error.message}\n`);
    process.exit(0);
    return;
  }
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    process.stderr.write('release-ci: 商店响应不是一个对象，跳过版本预检\n');
    process.exit(0);
    return;
  }

  const channels = item.publishedItemRevisionStatus?.distributionChannels;
  if (!Array.isArray(channels) || channels.length === 0) {
    process.stderr.write(
      `release-ci: 响应里没有 publishedItemRevisionStatus.distributionChannels` +
        `（顶层字段：${Object.keys(item).join(', ') || '无'}），跳过版本预检\n`,
    );
    process.exit(0);
    return;
  }

  const found = channels
    .map(channel => (typeof channel?.crxVersion === 'string' ? channel.crxVersion.trim() : ''))
    .filter(version => STORE_VERSION_RE.test(version));

  if (!found.length) {
    process.stderr.write(
      `release-ci: ${channels.length} 个 distributionChannels 里没有像版本号的 crxVersion，跳过版本预检\n`,
    );
    process.exit(0);
    return;
  }
  if (new Set(found).size > 1) {
    process.stderr.write(
      `release-ci: 多个渠道的 crxVersion 不一致（${[...new Set(found)].join(' / ')}），跳过版本预检\n`,
    );
    process.exit(0);
    return;
  }
  process.stdout.write(`${found[0]}\n`);
}

/**
 * What the store said about the package that was just uploaded, and whether to treat it as accepted.
 *
 * `POST /upload/v2/{name}:upload` gives 200 for a package it then refuses: the answer to「商店收下了没有」is the
 * `uploadState` field, which v2 types as a documented enum（`UPLOAD_STATE_UNSPECIFIED` / `SUCCEEDED` /
 * `IN_PROGRESS` / `FAILED` / `NOT_FOUND`）。v1.1 的三个状态字段（`status` / `statusCode` / `updateStatus`）没有
 * 这种文档，所以那一步只按 HTTP 码判成败、把响应体原样打出来；这条区别就是这里肯读它、那里不肯的理由。
 *
 * **Only the two explicitly negative values fail the step.** Everything unrecognised is reported and passed
 * through — including a body that isn't JSON or has no `uploadState` at all, in which case the workflow's HTTP
 * code check stands as the verdict. Turning「我读不懂」into「上传失败」would be a false red on a store that
 * accepted the package, and a false red on the publish job costs a release.
 *
 * `IN_PROGRESS` is the documented async case（"If `upload_state` is `UPLOAD_IN_PROGRESS`, you can poll for
 * updates using the fetchStatus method"）, so it prints where to look next: the `:publish` call that follows
 * publishes the *submitted* revision, and an unfinished upload is not one yet.
 *
 * stdout 上是一行可以直接进 step summary 的话，附带商店从包里读出的 `crxVersion`（它同时是「商店解析到的正是
 * 这一版」的现场证据）；非零退出时信息走 stderr，与 `item-version` 一样不抛栈。
 */
function uploadState(file) {
  if (!file) {
    process.stderr.write('release-ci: upload-state 需要 POST 响应体的路径，例如 upload-state resp.json\n');
    process.exit(0);
    return;
  }
  const target = path.resolve(process.cwd(), file);

  let body;
  try {
    body = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    process.stderr.write(`release-ci: 商店的上传响应不是可解析的 JSON，按 HTTP 码判定：${error.message}\n`);
    process.exit(0);
    return;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    process.stderr.write('release-ci: 商店的上传响应不是一个对象，按 HTTP 码判定\n');
    process.exit(0);
    return;
  }

  const state = typeof body.uploadState === 'string' ? body.uploadState.trim() : '';
  const version = typeof body.crxVersion === 'string' ? body.crxVersion.trim() : '';
  const suffix = version ? `（商店从包里读到的是 ${version}）` : '';

  if (state === 'FAILED' || state === 'NOT_FOUND') {
    process.stderr.write(`release-ci: 商店把这次上传判为 ${state}${suffix}\n`);
    process.exit(1);
    return;
  }
  if (!state) {
    process.stderr.write(
      `release-ci: 响应里没有 uploadState（顶层字段：${Object.keys(body).join(', ') || '无'}），按 HTTP 码判定\n`,
    );
    process.exit(0);
    return;
  }
  if (state === 'IN_PROGRESS') {
    process.stdout.write(
      `商店仍在解包（uploadState=IN_PROGRESS）${suffix}；接着的 publish 提审可能因此报错，` +
        '进度可用 fetchStatus 再读一次。\n',
    );
    return;
  }
  process.stdout.write(`商店回执：uploadState=${state}${suffix}\n`);
}

switch (command) {
  case 'output':
    writeOutputs(['releasable', 'version', 'tag', 'subject'], readPlan(inputFile));
    break;
  case 'summary':
    appendSummary(summaryLines(readPlan(inputFile)));
    break;
  case 'pr-body':
    if (!outputFile) {
      process.stderr.write('release-ci: pr-body 需要第三个参数作为输出文件\n');
      process.exit(2);
    }
    fs.writeFileSync(path.resolve(process.cwd(), outputFile), prBody(readPlan(inputFile)), 'utf8');
    break;
  case 'pending-tag':
    pendingTag();
    break;
  case 'item-version':
    itemVersion(inputFile);
    break;
  case 'upload-state':
    uploadState(inputFile);
    break;
  default:
    process.stderr.write(
      `release-ci: 未知命令 ${command}（可用：output / summary / pr-body / pending-tag / item-version / upload-state）\n`,
    );
    process.exit(2);
}
