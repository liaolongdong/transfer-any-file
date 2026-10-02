#!/usr/bin/env node
/**
 * 把「发布提交合回功能分支」这一步里 git 会静默做错的 CHANGELOG 重建成正确形状。
 *
 * 为什么需要它（2026-10-02 在隔离副本里实测出来的，不是推测）：`release.mjs --write` 生成的发布提交
 * 只做两件事——在 `## [未发布]` 与它那 150 条之间插入版本标题 `## [1.1.0] - <日期>`，再把 `package.json`
 * 的版本号提上去；功能分支这一侧则往 `## [未发布]` 的各个分组**开头**插了新条目。两处插入点相邻但不在
 * 同一行，于是三方合并不报冲突、绿着就过去了，结果是本轮那 11 条未发布的内容被划到 `## [1.1.0]` 名下、
 * `## [未发布]` 变成空的：仓库里的发布记录把没上线的功能记成了 1.1.0 的一部分，而下一次 `release.mjs`
 * 会以为没有东西可发。`v1.1.0` 标签指向发布提交本身，`release.yml` 又是从标签的工作树里 awk 出
 * `## [X.Y.Z]` 区块当发布说明的，所以 GitHub Release 的正文不受影响——坏的是 `main` 上这两份文件，
 * 而且没有任何一道门禁会为此变红。
 *
 * 修法不靠人眼：以两份权威输入重建——已发布那侧（默认 `MERGE_HEAD`）给出版本小节的原文，
 * 未发布那侧（默认 `ORIG_HEAD`）给出本轮条目的原文与分组顺序。输出 = 未发布那侧到 `## [未发布]` 为止的
 * 头部 + 「未发布 body 里不属于该版本小节的那些条目（连着所在分组，逐字节搬）」+ 已发布那侧从版本标题
 * 起到文末的尾部。落盘前四条断言必须成立，任何一条不过就直接失败、一个字都不写：
 *
 * 1. 该版本的每一条都能在分支的未发布区里找到（找不到=两侧不是同一次提升，重建没有依据）；
 * 2. 重建后全文条目总数与分支那份相同（不弄丢、不弄多——开发过程中正是它拦住了「末组之后的旧条目被
 *    当成块间散文整段搬进未发布区」这一版写法）；
 * 3. 版本小节之后的历史区两侧逐字相同（不同=分支上改过已发布版本的正文，那没有确定答案，交给人判——
 *    这种情况下另一份也不写，成对的文件只修一份等于把它们拆成两种形状）；
 * 4. 中英两份的版本条数与未发布条数各自相等（`CHANGELOG.md` / `CHANGELOG.en.md` 成对的约定）。
 *
 * 重建出的两份直接通过 `pnpm format:check`：搬运时按 Markdown 的段落间距把接缝补齐，所以修完不必再跑一遍
 * `pnpm format`——「修好了」和「守卫绿了」之间不该留一步给人忘。
 *
 * 用法：
 *   node scripts/repair-release-merge.mjs                       # 合并之后就地重建两份 CHANGELOG
 *   node scripts/repair-release-merge.mjs --check               # 只报告不写：合并后的自检
 *   node scripts/repair-release-merge.mjs <已发布> <未发布> [--check]
 *
 * 默认那两个 ref 正是 `git merge --no-commit` 留下的两个：`MERGE_HEAD` 是被合进来的发布提交，
 * `ORIG_HEAD` 是合并前的分支尖端。脚本只读本地文件与 `git show`，不 fetch、不 push、不碰远端。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const FILES = ['CHANGELOG.md', 'CHANGELOG.en.md'];

/**
 * 未发布小节的标题行，按**整行精确**匹配而不是按子串找：`CHANGELOG.en.md` 的正文里就出现过
 * 「`## [未发布]` / `## [Unreleased]`」这句话，按子串锚过去会读到一段无关的旧正文——而且读得下去、
 * 不报错。量具静默说谎比报错危险，这条在本脚本的开发过程中真的踩过一次。
 */
const UNRELEASED_HEADINGS = ['## [未发布]', '## [Unreleased]'];
const VERSION_HEADING_RE = /^## \[\d+\.\d+\.\d+\]/;
const GROUP_HEADING_RE = /^### /;
const BULLET_RE = /^\s*- /;
/** 条目块的边界：分组标题或版本小节标题。 */
const BLOCK_STOP_RE = /^#{2,3} /;

const rawArgs = process.argv.slice(2);
const check = rawArgs.includes('--check');
const positional = rawArgs.filter(arg => arg !== '--check');
const releasedRef = positional[0] ?? 'MERGE_HEAD';
const unreleasedRef = positional[1] ?? 'ORIG_HEAD';

function fail(message) {
  process.stderr.write(`repair-release-merge: ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(FILES[0]) || !fs.existsSync(FILES[1])) {
  fail('当前目录下读不到两份 CHANGELOG——请在仓库根目录运行本脚本');
}

function gitShow(ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch {
    fail(`读不到 ${ref}:${file}——不在合并现场就给显式 ref：node scripts/repair-release-merge.mjs <已发布> <未发布>`);
  }
}

/** 从 `from` 起下一个 `## ` 小节标题的行号；扫到尾返回数组长度。 */
function nextSectionStart(lines, from) {
  for (let i = from; i < lines.length; i += 1) if (/^## /.test(lines[i])) return i;
  return lines.length;
}

/**
 * 把 [from, to) 里的条目切成块：一条 `- ` 起始行 + 它的续行 + 紧跟其后的空行。
 * 分隔空行归**上一条**条目，删掉一条时段落间距跟着一起走，接缝处不会留下双空行。
 */
function bulletBlocks(lines, from, to) {
  const blocks = [];
  for (let i = from; i < to; i += 1) {
    if (!BULLET_RE.test(lines[i])) continue;
    let end = i + 1;
    while (end < to && !BULLET_RE.test(lines[end]) && !BLOCK_STOP_RE.test(lines[end])) end += 1;
    while (end < to && lines[end].trim() === '') end += 1;
    blocks.push({ start: i, end, key: lines[i].trim() });
    i = end - 1;
  }
  return blocks;
}

/**
 * 把 [from, to) 按 `### ` 分组标题切段。第一个分组标题之前的零星行（小节标题后面那个空行、
 * 引导段）自成一短段，它没有分组标题，于是只在自己真留下条目时才贡献内容。
 */
function groupRanges(lines, from, to) {
  const groups = [];
  let start = from;
  for (let i = from; i < to; i += 1) {
    if (!GROUP_HEADING_RE.test(lines[i])) continue;
    if (i > start) groups.push({ start, end: i });
    start = i;
  }
  if (start < to) groups.push({ start, end: to });
  return groups;
}

function unreleasedAnchor(lines, file, ref) {
  const hits = lines
    .map((line, index) => (UNRELEASED_HEADINGS.includes(line.trim()) ? index : -1))
    .filter(index => index >= 0);
  if (hits.length !== 1) {
    fail(
      `${ref}:${file} 里精确匹配到 ${hits.length} 行未发布标题，应当只有 1 行（${UNRELEASED_HEADINGS.join(' 或 ')}）` +
        (hits.length > 1 ? `；命中的在第 ${hits.map(h => h + 1).join('、')} 行` : ''),
    );
  }
  return hits[0];
}

function versionHeadingIndex(lines, from, file, ref) {
  for (let i = from; i < lines.length; i += 1) if (VERSION_HEADING_RE.test(lines[i])) return i;
  fail(`${ref}:${file} 的未发布小节之后没有版本标题——这一侧真的是发布提交吗？`);
  return -1;
}

function trimTrailingBlanks(lines) {
  const out = [...lines];
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  return out;
}

/**
 * 未发布 body 里属于本轮的那部分：逐分组过滤，只留不在版本小节里的条目，并**在每组最后一条保留条目
 * 处收笔**——末条之后的旧条目属于已发布那一版，整段丢掉（早先按「块间散文」把它们一起搬走，条目数
 * 直接翻倍，是断言 2 拦下来的）。整组一条都不剩就连分组标题一起丢，未发布区不该挂着空的 `### 变更`。
 *
 * 分组标题前必须补一个空行：上一条目的块把它的分隔空行吃进去了（`bulletBlocks` 的约定），而紧跟其后的
 * `### ` 标题若直接贴上就会少一行间距——`prettier --check` 对重建结果报的正是这一格（`59a60` / `79a80`）。
 * 补在接缝上而不是改块的切法：切法要保证「删掉一条时段落间距跟着走」，两件事各管各的才都不落空。
 */
function pickUnreleased(lines, from, to, versionKeys) {
  const picked = [];
  const needsGapBeforeHeading = chunk =>
    chunk.length > 0 && GROUP_HEADING_RE.test(chunk[0]) && picked.length > 0 && picked[picked.length - 1].trim() !== '';
  const push = chunk => {
    if (needsGapBeforeHeading(chunk)) picked.push('');
    picked.push(...chunk);
  };
  for (const group of groupRanges(lines, from, to)) {
    const blocks = bulletBlocks(lines, group.start, group.end).filter(block => !versionKeys.has(block.key));
    if (blocks.length === 0) continue;
    push(lines.slice(group.start, blocks[0].start));
    for (let index = 0; index < blocks.length; index += 1) {
      if (index > 0) push(lines.slice(blocks[index - 1].end, blocks[index].start));
      push(lines.slice(blocks[index].start, blocks[index].end));
    }
  }
  return trimTrailingBlanks(picked);
}

/** 算出某个文件的正确内容与读数；返回 null 表示这一份需要人工判断（断言 3）。 */
function build(file) {
  const released = gitShow(releasedRef, file).split('\n');
  const unreleased = gitShow(unreleasedRef, file).split('\n');

  const relAnchor = unreleasedAnchor(released, file, releasedRef);
  const devAnchor = unreleasedAnchor(unreleased, file, unreleasedRef);
  const versionIdx = versionHeadingIndex(released, relAnchor + 1, file, releasedRef);
  const versionHeading = released[versionIdx].trim();

  const relBodyEnd = nextSectionStart(released, versionIdx + 1);
  const devBodyEnd = nextSectionStart(unreleased, devAnchor + 1);

  // 断言 3：历史区两侧逐字相同，否则重建没有依据。
  if (released.slice(relBodyEnd).join('\n') !== unreleased.slice(devBodyEnd).join('\n')) {
    process.stdout.write(`${file}: 已发布小节之后的历史区两侧不一致——分支上动过旧版本的正文，这一份请手工合并\n`);
    return null;
  }

  const versionBlocks = bulletBlocks(released, versionIdx + 1, relBodyEnd);
  const devBlocks = bulletBlocks(unreleased, devAnchor + 1, devBodyEnd);
  const versionKeys = new Set(versionBlocks.map(block => block.key));
  const devKeys = new Set(devBlocks.map(block => block.key));

  // 断言 1：那一版的每一条都确实在分支的未发布区里。
  const missing = versionBlocks.filter(block => !devKeys.has(block.key));
  if (missing.length > 0) {
    fail(
      `${file}: ${versionHeading} 有 ${missing.length} 条在 ${unreleasedRef} 的未发布区里找不到` +
        `（第一条：${missing[0].key.slice(0, 60)}）——两侧不是同一次提升，请手工合并`,
    );
  }

  const body = pickUnreleased(unreleased, devAnchor + 1, devBodyEnd, versionKeys);
  const head = unreleased.slice(0, devAnchor + 1);
  const tail = released.slice(versionIdx);
  // 小节标题与正文之间、正文与版本标题之间，各留恰好一个空行。
  const middle = body.length === 0 ? [] : ['', ...body, ''];
  const content = [...head, ...middle, ...tail].join('\n');

  return {
    file,
    content,
    versionHeading,
    versionCount: versionBlocks.length,
    unreleasedCount: body.filter(line => BULLET_RE.test(line)).length,
    totalBefore: unreleased.filter(line => BULLET_RE.test(line)).length,
    totalAfter: content.split('\n').filter(line => BULLET_RE.test(line)).length,
    same: fs.readFileSync(file, 'utf8') === content,
  };
}

/**
 * 两份都先算完、四条断言全部成立之后才写盘。顺序在这里是要紧的：那两份文件是成对的
 * （`CHANGELOG.md` / `CHANGELOG.en.md` 必须同形），所以「算完一份就写一份」会让中英两份
 * 分裂成两种形状——而断言 4 正是那条只能在**两份都算完之后**才能做的检查。
 */
const reports = [];
const manual = [];
for (const file of FILES) {
  const built = build(file);
  if (!built) {
    manual.push(file);
    continue;
  }
  // 断言 2：全文条目总数守恒。
  if (built.totalAfter !== built.totalBefore) {
    fail(`${file}: 条目总数 ${built.totalBefore} → ${built.totalAfter}，重建弄丢或弄多了内容，一个字都不写`);
  }
  reports.push(built);
}

// 断言 3 的出口：任何一份需要人工判断，另一份也**不写**，交人把两份一起合。
if (manual.length > 0) {
  fail(
    `${manual.join(' 与 ')} 需要人工判断——两份 CHANGELOG 是成对的，只修其中一份会让它们从此不同形，` +
      '所以本脚本一个字都没写',
  );
}

// 断言 4：中英成对。
const [zh, en] = reports;
if (zh.versionHeading !== en.versionHeading) {
  fail(`两份的版本小节标题不一致：${zh.versionHeading} / ${en.versionHeading}`);
}
if (zh.unreleasedCount !== en.unreleasedCount || zh.versionCount !== en.versionCount) {
  fail(
    `中英两份不对成：未发布 ${zh.unreleasedCount}/${en.unreleasedCount} 条，` +
      `${zh.versionHeading} ${zh.versionCount}/${en.versionCount} 条`,
  );
}

for (const report of reports) {
  if (!check && !report.same) fs.writeFileSync(report.file, report.content);
}

for (const report of reports) {
  const state = report.same ? '已是正确形状' : check ? '是合并后的错形状' : '已重建';
  process.stdout.write(
    `${report.file}: ${report.versionHeading} ${report.versionCount} 条 · 未发布 ${report.unreleasedCount} 条 · ` +
      `全文 ${report.totalAfter} 条 · 工作树${state}\n`,
  );
}

if (check) {
  const dirty = reports.filter(report => !report.same);
  if (dirty.length > 0) {
    process.stdout.write(
      `需要修：${dirty.map(report => report.file).join(' 与 ')}——未发布条目被划进了已发布版本，而 git 不会报冲突。\n` +
        '确认无误后执行：node scripts/repair-release-merge.mjs\n',
    );
    process.exit(1);
  }
  process.stdout.write('检查通过：未发布与已发布小节分界正确。\n');
}
