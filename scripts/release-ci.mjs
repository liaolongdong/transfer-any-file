#!/usr/bin/env node
/**
 * GitHub Actions adapter for `scripts/release.mjs`.
 *
 * Four commands: three turn one plan document into the things a workflow step needs, the last answers
 * the question a *merged* release asks when nobody ran a plan (which version on this branch is still
 * untagged).
 *
 *     node scripts/release-ci.mjs output      plan.json   # -> $GITHUB_OUTPUT
 *     node scripts/release-ci.mjs summary     plan.json   # -> $GITHUB_STEP_SUMMARY
 *     node scripts/release-ci.mjs pr-body     plan.json pr-body.md
 *     node scripts/release-ci.mjs pending-tag             # -> vX.Y.Z on stdout, or nothing
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

const [, , command, planFile, outputFile] = process.argv;

if (!command) {
  process.stderr.write(
    'usage: node scripts/release-ci.mjs <output|summary|pr-body> <plan.json> [out.md]\n' +
      '   or: node scripts/release-ci.mjs pending-tag\n',
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
  out.push('3. 商店那一步**默认只上传包、不提交审核**（`CHROMEWEBSTORE.md` 三次被拒之后定的默认值）。');
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

switch (command) {
  case 'output':
    writeOutputs(['releasable', 'version', 'tag', 'subject'], readPlan(planFile));
    break;
  case 'summary':
    appendSummary(summaryLines(readPlan(planFile)));
    break;
  case 'pr-body':
    if (!outputFile) {
      process.stderr.write('release-ci: pr-body 需要第三个参数作为输出文件\n');
      process.exit(2);
    }
    fs.writeFileSync(path.resolve(process.cwd(), outputFile), prBody(readPlan(planFile)), 'utf8');
    break;
  case 'pending-tag':
    pendingTag();
    break;
  default:
    process.stderr.write(`release-ci: 未知命令 ${command}（可用：output / summary / pr-body / pending-tag）\n`);
    process.exit(2);
}
