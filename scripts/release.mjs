#!/usr/bin/env node
/**
 * Release preparation — the half of the release chain that turns `main` into a versioned release.
 *
 * ## Why a script and not a checklist
 *
 * `AGENTS.md` fixes one truth: `package.json#version` **is** the manifest version, and a `vX.Y.Z` tag is
 * what `release.yml` builds from. Between those two facts sit three stores a manual release has to keep
 * in step by hand — the version number, the bilingual changelog pair, and the slice of history this
 * release covers. Getting one wrong is silent: a tag that disagrees with `package.json` fails in CI
 * (`release.yml` compares them), but a `## [1.1.0]` heading written over the wrong set of commits fails
 * nothing at all. This script makes that third thing computable instead of remembered.
 *
 * ## What it refuses to do
 *
 * It never pushes, never publishes, never calls the store, and never rewrites a sentence whose content is
 * an evidence claim. `docs/index.html` states its version beside dates and measured numbers, and
 * `verify:numbers` exists precisely because such numbers get re-taken from a build rather than carried
 * forward — an automated edit there would fabricate a claim. Those places are listed for a human.
 *
 * ## The changelog question, answered conservatively
 *
 * Entries come from Conventional Commit subjects (`feat` / `fix` / `perf` / `refactor` / `security`),
 * grouped into Keep a Changelog headings in both languages; `docs` / `chore` / `ci` / `test` / `build` /
 * `style` are noise, matching how this repository already writes release notes.
 *
 * If `## [未发布]` already holds hand-written prose — which it does for the whole post-1.0.0 stretch —
 * that prose **is** the release notes and is carried over verbatim; the generated list is reported, not
 * written, because a second list of the same work under duplicate headings would make the section worse
 * to read. `--with-commit-list` opts into that index anyway. Once `未发布` is back to empty, later
 * releases are generated end to end.
 *
 * ## Modes
 *
 *     node scripts/release.mjs                        plan only (default — writes nothing)
 *     node scripts/release.mjs --write                apply the changelog pair + package.json
 *     node scripts/release.mjs --write --commit --tag  ... plus the release commit and the `vX.Y.Z` tag
 *
 * The tag stays lightweight: `CONTRIBUTING.md` documents `git tag vX.Y.Z && git push --tags`, and
 * `release.yml` reads the version out of the ref name alone.
 *
 * Flags: `--bump major|minor|patch`, `--version X.Y.Z`, `--from <rev>`, `--as-of YYYY-MM-DD`,
 * `--with-commit-list`, `--require-en`, `--allow-dirty`, `--json <path>`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Bilingual pair: Chinese is the main file, `.en.md` its counterpart (`.qoder/rules/wxt-rules.md` §10). */
const CHANGELOG_FILES = {
  zh: { file: 'CHANGELOG.md', unreleased: '## [未发布]', label: '未发布' },
  en: { file: 'CHANGELOG.en.md', unreleased: '## [Unreleased]', label: 'Unreleased' },
};

/**
 * Keep a Changelog headings in emission order. The first three spellings are the ones already used in
 * the repository's own sections; `性能` and `安全` are needed because `perf:` and `security:` commits
 * exist in this history and no existing heading would hold them.
 */
const GROUPS = [
  { key: 'breaking', zh: '破坏性变更', en: 'Breaking Changes' },
  { key: 'added', zh: '新增', en: 'Added' },
  { key: 'changed', zh: '变更', en: 'Changed' },
  { key: 'fixed', zh: '修复', en: 'Fixed' },
  { key: 'performance', zh: '性能', en: 'Performance' },
  { key: 'security', zh: '安全', en: 'Security' },
  { key: 'other', zh: '其他', en: 'Other' },
];

/** Conventional Commit type → group key. Anything else that is not noise falls through to `other`. */
const TYPE_TO_GROUP = {
  feat: 'added',
  fix: 'fixed',
  perf: 'performance',
  refactor: 'changed',
  revert: 'changed',
  security: 'security',
};

/**
 * Types kept out of the changelog: they describe how the work was done, not what a user gets.
 */
const NOISE_TYPES = new Set(['build', 'chore', 'ci', 'deps', 'docs', 'release', 'style', 'test']);

/** `type(scope)!: subject`. */
const CONVENTIONAL_RE = /^([a-zA-Z]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/;
/** A release commit made by this script — never listed in its own changelog. */
const RELEASE_SUBJECT_RE = /^chore\(release\):/;
/** A released-version section heading, newest-first in this repository but matched numerically anyway. */
const SEMVER_SECTION_RE = /^## \[(\d+\.\d+\.\d+)\](?: - [^\n]*)?[ \t]*$/;

const VERSION_RE = /^\d+\.\d+\.\d+$/;
const RECORD_SEP = '\x1e';
const FIELD_SEP = '\t';

const argv = process.argv.slice(2);
const has = name => argv.includes(`--${name}`);
const valueOf = name => {
  const inline = argv.find(arg => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  const next = index >= 0 ? argv[index + 1] : undefined;
  return next && !next.startsWith('--') ? next : undefined;
};

const OPTS = {
  write: has('write'),
  commit: has('commit'),
  tag: has('tag'),
  withCommitList: has('with-commit-list'),
  requireEn: has('require-en'),
  allowDirty: has('allow-dirty'),
  bump: valueOf('bump'),
  version: valueOf('version'),
  from: valueOf('from'),
  asOf: valueOf('as-of'),
  json: valueOf('json'),
};

if (OPTS.commit && !OPTS.write) fail('--commit 需要一起写文件，请同时给出 --write');
if (OPTS.tag && !OPTS.commit) fail('--tag 只给已落盘的发布提交贴标记，请同时给出 --write --commit');
if (OPTS.bump && !['major', 'minor', 'patch'].includes(OPTS.bump)) {
  fail(`--bump 只接受 major / minor / patch，收到「${OPTS.bump}」`);
}
if (OPTS.version && !VERSION_RE.test(OPTS.version)) fail(`--version 需要 X.Y.Z，收到「${OPTS.version}」`);
if (OPTS.asOf && !/^\d{4}-\d{2}-\d{2}$/.test(OPTS.asOf)) fail(`--as-of 需要 YYYY-MM-DD，收到「${OPTS.asOf}」`);

/**
 * Run git inside this repository and return trimmed stdout.
 *
 * `execFileSync` with an argument array rather than a shell string: commit subjects and bodies here
 * carry `（`, `→` and backticks, and a shell in between is one more chance to lose them.
 *
 * @param {string[]} gitArgs Arguments passed to `git`.
 * @param {{allowFail?: boolean}} [options] `allowFail` returns `null` instead of aborting, for the
 *   queries whose empty answer is a fact (no tags yet, no matches) rather than a broken repository.
 * @returns {string|null}
 */
function git(gitArgs, { allowFail = false } = {}) {
  try {
    return execFileSync('git', gitArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      // A permitted-empty answer ("no tags yet") is a fact, not a failure — git's stderr would only put
      // a `fatal:` line above the report and make a clean run look broken.
      stdio: ['ignore', 'pipe', allowFail ? 'ignore' : 'inherit'],
    }).trim();
  } catch (error) {
    if (allowFail) return null;
    const detail = String(error.stderr || error.message)
      .trim()
      .split('\n')[0];
    fail(`git ${gitArgs.join(' ')} 失败：${detail}`);
    return null;
  }
}

/** @param {string} message */
function fail(message) {
  process.stderr.write(`release: ${message}\n`);
  process.exit(1);
}

// `node scripts/release.mjs | head -5` is a normal thing to do with a planner, and Node answers a closed
// stdout with an unhandled EPIPE stack trace. Exiting quietly keeps the pipe usable and hides nothing:
// every real failure above goes through `fail`, which reports on stderr before exiting.
process.stdout.on('error', error => {
  if (error && error.code === 'EPIPE') process.exit(0);
  throw error;
});

/** Refuse to build a release on top of somebody's unfinished work — the tree is shared. */
function assertCleanTree() {
  // Untracked files are deliberately not part of this check: a release commit stages three named paths,
  // so a new file nobody has added yet cannot ride along. Modified or deleted tracked files can, and do.
  const dirty = git(['status', '--porcelain', '--untracked-files=no']);
  if (dirty && !OPTS.allowDirty) {
    const count = dirty.split('\n').filter(Boolean).length;
    fail(`工作树有 ${count} 处未提交的已跟踪改动。发布提交会把它们一起带走；先处理，或确认无误后加 --allow-dirty。`);
  }
}

/**
 * Find the commit this release starts from, most precise signal first.
 *
 * 1. `--from`, when given.
 * 2. The newest `v*` tag reachable from HEAD.
 * 3. No tag yet — the very first cut, which is exactly this repository's state: the commit that wrote
 *    the highest `## [X.Y.Z] - <date>` heading into the changelog. That heading is a statement about a
 *    released version, so by definition the work after it belongs to this one. It survives a repo where
 *    tags were never pushed, which a tag-only rule would not.
 * 4. Neither: the root commit, i.e. all of history, said out loud.
 *
 * @returns {{rev: string, source: string, label: string}}
 */
function resolveStartPoint() {
  if (OPTS.from) {
    const rev = git(['rev-parse', '--verify', `${OPTS.from}^{commit}`], { allowFail: true });
    if (!rev) fail(`--from ${OPTS.from} 不是可解析的提交`);
    return { rev, source: '--from', label: OPTS.from };
  }

  const described = git(['describe', '--tags', '--abbrev=0', 'HEAD'], { allowFail: true });
  if (described) return { rev: git(['rev-parse', `${described}^{commit}`]), source: 'tag', label: described };

  const newest = newestReleasedHeading(CHANGELOG_FILES.zh.file);
  if (newest) {
    const hits = (
      git(['log', '-S', newest.heading, '--format=%H', '--', CHANGELOG_FILES.zh.file], { allowFail: true }) || ''
    )
      .split('\n')
      .filter(Boolean);
    const rev = hits.at(-1);
    if (rev) {
      return {
        rev,
        source: 'changelog-heading',
        label: `${newest.version}（无 tag，改用写入该标题的提交 ${rev.slice(0, 7)}）`,
      };
    }
    // The heading is the answer only if history can point at the commit that wrote it. A heading with no
    // such commit is the previous release sitting uncommitted in this worktree — and falling through to
    // "all of history" there would quietly produce a changelog that re-lists an already-released version.
    fail(
      `${CHANGELOG_FILES.zh.file} 里的「${newest.heading}」还找不到写下它的提交：` +
        `上一版大概尚未提交。先提交那一版，或用 --from <rev> 指定本次起点。`,
    );
  }

  const root = git(['rev-list', '--max-parents=0', 'HEAD']).split('\n')[0];
  return { rev: root, source: 'root', label: '仓库起点（既无 tag 也无版本标题，将汇总全部历史）' };
}

/**
 * Read the highest `## [X.Y.Z] - <date>` heading out of a changelog, with its raw heading line.
 *
 * Highest rather than last-in-file: the pair is written newest-first today, and a back-filled 0.9.0
 * section must not be mistaken for the current release point.
 *
 * @param {string} file Repository-relative changelog path.
 */
function newestReleasedHeading(file) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let best = null;
  for (const line of text.split('\n')) {
    const match = SEMVER_SECTION_RE.exec(line);
    if (!match) continue;
    if (!best || compareVersions(match[1], best.version) > 0) best = { version: match[1], heading: line.trim() };
  }
  return best;
}

/** Numeric compare over already-validated `X.Y.Z` strings. */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/**
 * Collect and classify the commits between the start point and HEAD.
 *
 * Merge commits are skipped: this repository merges pull requests (`Merge pull request #6 …`), so a
 * merge line adds nothing its contained commits do not already say. Records are separated by `%x1e`
 * because `%B` is multi-line and `%s` may contain nearly anything else.
 *
 * @param {string} fromRev
 */
function collectCommits(fromRev) {
  const raw =
    git(
      [
        'log',
        `${fromRev}..HEAD`,
        '--no-merges',
        '--reverse',
        `--pretty=format:%H${FIELD_SEP}%ad${FIELD_SEP}%s${FIELD_SEP}%B${RECORD_SEP}`,
        '--date=short',
      ],
      { allowFail: true },
    ) || '';

  // `--pretty=format:` joins records with a newline, so every record but the first arrives with a
  // leading one — left in place it becomes part of `%H` and a six-character hash prints as a blank line
  // plus `ce95da`. A sha never starts with whitespace, so stripping it is exact rather than lossy.
  const records = raw
    .split(RECORD_SEP)
    .map(record => record.replace(/^\s+/, ''))
    .filter(record => record.length > 0);
  /** @type {Array<{hash: string, short: string, date: string, subject: string, scope: string, group: string, breaking: boolean, en: string}>} */
  const entries = [];
  const skipped = { noise: [], release: [], unparseable: [] };

  for (const record of records) {
    const [hash, date, subject, body] = readRecord(record);
    if (RELEASE_SUBJECT_RE.test(subject)) {
      skipped.release.push({ hash, subject });
      continue;
    }
    const parsed = CONVENTIONAL_RE.exec(subject);
    if (!parsed) {
      skipped.unparseable.push({ hash, subject });
      entries.push(
        makeEntry({ hash, date, subject: subject.trim(), body, scope: '', group: 'other', breaking: false }),
      );
      continue;
    }
    const [, typeRaw, scope = '', bang, description] = parsed;
    const type = typeRaw.toLowerCase();
    if (NOISE_TYPES.has(type)) {
      skipped.noise.push({ hash, subject });
      continue;
    }
    const breaking = Boolean(bang) || /(^|\n)(BREAKING[ -]CHANGE|不兼容变更)\s*:/.test(body || '');
    entries.push(
      makeEntry({
        hash,
        date,
        subject: description.trim(),
        body,
        scope: scope.trim(),
        group: breaking ? 'breaking' : TYPE_TO_GROUP[type] || 'other',
        breaking,
      }),
    );
  }

  return { entries, skipped, total: records.length };
}

/** Split one `%H⇥%ad⇥%s⇥%B` record back into its four fields, keeping tabs inside the body intact. */
function readRecord(record) {
  const fields = record.split(FIELD_SEP);
  const hash = fields.shift() || '';
  const date = fields.shift() || '';
  const subject = fields.shift() || '';
  return [hash, date, subject.trim(), fields.join(FIELD_SEP)];
}

/**
 * Build one changelog entry, resolving its English line.
 *
 * The English side comes from a `Changelog-En:` commit trailer when present. Chinese-only subjects are
 * the norm here, so a missing trailer is *reported* rather than silently translated: inventing English
 * prose for somebody else's commit is exactly the kind of unverified claim this project's documentation
 * rules exist to stop.
 */
function makeEntry({ hash, date, subject, body, scope, group, breaking }) {
  const en = /(?:^|\n)Changelog-En:[ \t]*(.+?)[ \t]*$/m.exec(body || '');
  return {
    hash,
    short: hash.slice(0, 7),
    date,
    subject,
    scope,
    group: GROUPS.some(entry => entry.key === group) ? group : 'other',
    breaking,
    en: en ? en[1].trim() : '',
  };
}

/** Decide the next version from the commits themselves unless `--bump` / `--version` overrides. */
function decideVersion(currentVersion, entries) {
  if (OPTS.version) return { version: OPTS.version, bump: 'explicit' };
  let bump = 'patch';
  if (entries.some(entry => entry.breaking)) bump = 'major';
  else if (entries.some(entry => entry.group === 'added')) bump = 'minor';
  if (OPTS.bump) bump = OPTS.bump;
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  const version =
    bump === 'major'
      ? `${major + 1}.0.0`
      : bump === 'minor'
        ? `${major}.${minor + 1}.0`
        : `${major}.${minor}.${patch + 1}`;
  return { version, bump };
}

/** One bullet: `**scope**: subject (`hash`)`, full-width punctuation on the Chinese side. */
function renderBullet(entryItem, lang) {
  const text = lang === 'zh' ? entryItem.subject : entryItem.en || entryItem.subject;
  const lead = entryItem.scope ? (lang === 'zh' ? `**${entryItem.scope}**：` : `**${entryItem.scope}**: `) : '';
  const tail = lang === 'zh' ? `（\`${entryItem.short}\`）` : ` (\`${entryItem.short}\`)`;
  return `${lead}${text}${tail}`;
}

/** Grouped entries, ready to become the body of a version section. */
function renderGenerated(entries, lang) {
  const blocks = [];
  for (const group of GROUPS) {
    const members = entries.filter(entry => entry.group === group.key);
    if (!members.length) continue;
    const heading = lang === 'zh' ? group.zh : group.en;
    blocks.push(`### ${heading}\n\n${members.map(entry => `- ${renderBullet(entry, lang)}`).join('\n')}`);
  }
  return blocks.join('\n\n');
}

/**
 * Flat commit index, used only when a hand-written section and a machine list are both wanted.
 *
 * Nested under one `###` heading on purpose: the hand-written prose already owns `### 新增` and friends,
 * and a second section with the same heading in the same version is unreadable.
 */
function renderCommitIndex(entries, lang) {
  const heading = lang === 'zh' ? '### 本次收录的提交' : '### Commits in this release';
  const note =
    lang === 'zh'
      ? `以下 ${entries.length} 条提交由 \`scripts/release.mjs\` 按提交信息列出的索引，说明以上方正文为准。`
      : `Index of the ${entries.length} commits behind the prose above, generated by \`scripts/release.mjs\`; the section text is authoritative.`;
  const subgroups = GROUPS.map(group => {
    const members = entries.filter(entry => entry.group === group.key);
    if (!members.length) return null;
    const label = lang === 'zh' ? group.zh : group.en;
    return `#### ${label}\n\n${members.map(entry => `- ${renderBullet(entry, lang)}`).join('\n')}`;
  }).filter(Boolean);
  return `${heading}\n\n${note}\n\n${subgroups.join('\n\n')}`;
}

/**
 * Read the `## [未发布]` block out of a changelog.
 *
 * Returns the file plus the block's line offsets so the writer can splice without a second parse. A
 * body that is only whitespace counts as empty — that is the normal state between releases.
 */
function readUnreleased(file, heading) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.trim() === heading);
  if (start < 0) {
    fail(`${file} 里找不到标题「${heading}」—— 该标题是这套双语约定的锚点，改它必须同步本脚本。`);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  const body = lines.slice(start + 1, end).join('\n');
  return { text, lines, start, end, body, hasContent: body.trim().length > 0 };
}

/**
 * Splice the promoted section into one changelog file.
 *
 * Blank runs are normalised only at the two seams this function writes, never inside the carried body:
 * 918 lines of somebody's prose are not this script's to reflow.
 */
function writeChangelog(lang, plan) {
  const meta = CHANGELOG_FILES[lang];
  const current = readUnreleased(meta.file, meta.unreleased);
  const carried = current.hasContent ? trimBlankEdges(current.body) : '';
  const generated = renderGenerated(plan.entries, lang);

  let body;
  if (carried) {
    body = plan.appendIndex ? `${carried}\n\n${renderCommitIndex(plan.entries, lang)}` : carried;
  } else {
    body = generated;
  }
  if (!body.trim()) fail(`${meta.file} 的 ${plan.version} 区块会是空的，中止`);

  const versionSection = [`## [${plan.version}] - ${plan.date}`, '', body, ''].join('\n');
  const out = [
    ...current.lines.slice(0, current.start),
    meta.unreleased,
    '',
    versionSection,
    ...current.lines.slice(current.end),
  ];
  fs.writeFileSync(path.join(ROOT, meta.file), `${out.join('\n').replace(/\n+$/, '\n')}`, 'utf8');
  return {
    file: meta.file,
    carriedHandWritten: Boolean(carried),
    appendedCommitIndex: Boolean(carried && plan.appendIndex),
    generatedBullets: carried && !plan.appendIndex ? 0 : plan.entries.length,
  };
}

/** Drop leading/trailing blank lines and nothing else. */
function trimBlankEdges(text) {
  const lines = text.split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join('\n');
}

/** Bump `package.json#version` with a targeted replace — re-serialising the JSON would reformat the file. */
function writePackage(currentVersion, nextVersion) {
  const file = path.join(ROOT, 'package.json');
  const text = fs.readFileSync(file, 'utf8');
  const needle = `"version": "${currentVersion}"`;
  const hits = text.split(needle).length - 1;
  if (hits !== 1) fail(`package.json 里 ${needle} 出现 ${hits} 次，无法安全替换`);
  fs.writeFileSync(file, text.replace(needle, `"version": "${nextVersion}"`), 'utf8');
}

/**
 * Every tracked place still carrying the old version, minus what must never be auto-edited or is noise.
 *
 * `CHANGELOG*` is a record and keeps saying `1.0.0` where it did; `pnpm-lock.yaml`'s hits are unrelated
 * dependency versions; `.qoder/` is internal; `docs/convert/` is generated (refresh it with
 * `pnpm pages:render`). `package.json` is what this script just bumped, and a workflow's `e.g. v1.0.0`
 * or a script comment is an example rather than a claim — reporting them would bury the real list, which
 * is outward prose a human has to re-evidence.
 */
function findStaleMentions(oldVersion) {
  const out = git(
    [
      'grep',
      '-n',
      '-F',
      oldVersion,
      '--',
      '.',
      ':(exclude)CHANGELOG.md',
      ':(exclude)CHANGELOG.en.md',
      ':(exclude)pnpm-lock.yaml',
      ':(exclude).qoder/**',
      ':(exclude)docs/convert/**',
      ':(exclude)package.json',
      ':(exclude)scripts/**',
      ':(exclude).github/workflows/**',
    ],
    { allowFail: true },
  );
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map(row => {
      const fileEnd = row.indexOf(':');
      const rest = row.slice(fileEnd + 1);
      const lineEnd = rest.indexOf(':');
      return {
        file: row.slice(0, fileEnd),
        line: Number(rest.slice(0, lineEnd)),
        text: rest
          .slice(lineEnd + 1)
          .trim()
          .slice(0, 140),
      };
    });
}

/** Abort before writing anything the repository would then have to reason about. */
function assertPlan(plan) {
  // Plan mode answers "is there a release to cut?" and a plain no is not an error: CI runs this on every
  // push to `main`, and most pushes have nothing to record. Only the modes that change files may abort.
  if (!OPTS.write) return;
  if (!plan.entries.length && !plan.carried) {
    fail(
      `没有可收录的提交：${plan.range} 之内 ${plan.total} 条全被当作噪声（docs/chore/ci/test 等）。\n` +
        `  确实要发这一版：先把说明写进 ${CHANGELOG_FILES.zh.file} 的「${CHANGELOG_FILES.zh.label}」再跑，` +
        `或加 --with-commit-list 用提交索引成文。`,
    );
  }
  if (OPTS.requireEn && plan.missingEnglish.length) {
    const listed = plan.missingEnglish.map(item => item.hash).join(' ');
    fail(`--require-en：${plan.missingEnglish.length} 条提交没有 Changelog-En: 尾注（${listed}）。`);
  }
}

function main() {
  assertCleanTree();

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const currentVersion = pkg.version;
  if (!VERSION_RE.test(currentVersion)) fail(`package.json#version 不是 X.Y.Z：${currentVersion}`);

  const point = resolveStartPoint();
  const collected = collectCommits(point.rev);
  const { version, bump } = decideVersion(currentVersion, collected.entries);
  const date = OPTS.asOf || new Date().toISOString().slice(0, 10);

  const zh = readUnreleased(CHANGELOG_FILES.zh.file, CHANGELOG_FILES.zh.unreleased);
  const en = readUnreleased(CHANGELOG_FILES.en.file, CHANGELOG_FILES.en.unreleased);
  const carried = zh.hasContent || en.hasContent;

  const highest = newestReleasedHeading(CHANGELOG_FILES.zh.file);
  if (highest && compareVersions(highest.version, currentVersion) > 0) {
    fail(`CHANGELOG.md 已有 ${highest.version}，而 package.json 还是 ${currentVersion} —— 先把两者对齐`);
  }
  if (!carried && compareVersions(version, currentVersion) <= 0 && !OPTS.version && !OPTS.bump) {
    fail(`按提交算出的 ${version} 不高于 ${currentVersion}，请显式给出 --bump 或 --version`);
  }
  if (zh.text.includes(`## [${version}]`) || en.text.includes(`## [${version}]`)) {
    fail(`${version} 的区块已存在于 changelog：这一次没有新内容，或用 --version 指定别的号`);
  }

  const plan = {
    version,
    previousVersion: currentVersion,
    bump,
    date,
    tag: `v${version}`,
    subject: `chore(release): ${version} —— 双语 changelog 提升与版本 bump`,
    range: `${point.label}..HEAD`,
    startSource: point.source,
    entries: collected.entries,
    total: collected.total,
    carried,
    appendIndex: carried && OPTS.withCommitList,
    missingEnglish: collected.entries
      .filter(entry => !entry.en)
      .map(entry => ({ hash: entry.short, subject: entry.subject })),
  };
  assertPlan(plan);

  // Nothing to record and nothing hand-written: a fact about this push, not a failure. Reported through
  // the same JSON shape so `release-prepare.yml` can say "本轮无可发布内容" instead of going red.
  const releasable = plan.entries.length > 0 || plan.carried;

  const changelogs = [];
  if (releasable && OPTS.write) {
    changelogs.push(writeChangelog('zh', plan), writeChangelog('en', plan));
    writePackage(currentVersion, version);
    if (OPTS.commit) commitRelease(plan);
    if (OPTS.tag) git(['tag', plan.tag]);
  }

  const report = {
    releasable,
    version: plan.version,
    previousVersion: plan.previousVersion,
    bump: plan.bump,
    tag: plan.tag,
    date: plan.date,
    range: plan.range,
    startSource: plan.startSource,
    counts: {
      total: plan.total,
      listed: plan.entries.length,
      noise: collected.skipped.noise.length,
      release: collected.skipped.release.length,
      unparseable: collected.skipped.unparseable.length,
    },
    groups: Object.fromEntries(
      GROUPS.map(group => [group.key, plan.entries.filter(entry => entry.group === group.key).length]),
    ),
    carriedHandWritten: plan.carried,
    appendedCommitIndex: plan.appendIndex,
    entries: plan.entries.map(entry => ({
      hash: entry.short,
      group: entry.group,
      scope: entry.scope,
      zh: entry.subject,
      en: entry.en || entry.subject,
      breaking: entry.breaking,
    })),
    missingEnglish: plan.missingEnglish,
    staleVersionMentions: findStaleMentions(currentVersion),
    written: OPTS.write && releasable,
    writtenChangelogs: changelogs.map(entry => entry.file),
    committed: OPTS.commit && releasable,
    tagged: OPTS.tag && releasable,
    subject: plan.subject,
  };

  printHuman(report);
  if (OPTS.json) {
    const target = path.resolve(ROOT, OPTS.json);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
}

function printHuman(report) {
  const write = line => process.stdout.write(`${line}\n`);
  if (!report.releasable) {
    const reason = report.counts.total
      ? `${report.range} 之内 ${report.counts.total} 条提交全属噪声（docs/chore/ci/test 等）`
      : `${report.range} 之内没有新提交`;
    write(`本轮无可发布内容：${reason}，且 ${CHANGELOG_FILES.zh.file} 的「${CHANGELOG_FILES.zh.label}」是空的。`);
    write('计划与 JSON 已按现状输出，未改任何文件。');
    return;
  }
  write(`发布计划  ${report.previousVersion} → ${report.version}（${report.bump}）· 日期 ${report.date}`);
  write(`  统计区间  ${report.range}   [起点来源: ${report.startSource}]`);
  write(
    `  提交      共 ${report.counts.total}，收录 ${report.counts.listed}，` +
      `噪声 ${report.counts.noise}，发布提交 ${report.counts.release}，无前缀 ${report.counts.unparseable}`,
  );
  const groups = Object.entries(report.groups).filter(([, count]) => count > 0);
  if (groups.length) write(`  分组      ${groups.map(([key, count]) => `${key}=${count}`).join('  ')}`);
  write(
    `  手写区块  ${report.carriedHandWritten ? '有 —— 原样提升为本版正文' : '无 —— 正文由提交信息生成'}` +
      `${report.appendedCommitIndex ? '（另附提交索引）' : ''}`,
  );
  if (report.missingEnglish.length) {
    write(`  英文行    ${report.missingEnglish.length} 条缺 Changelog-En: 尾注，英文那份先沿用中文主语：`);
    for (const item of report.missingEnglish.slice(0, 10)) write(`      - ${item.hash} ${item.subject}`);
    if (report.missingEnglish.length > 10) write(`      …另有 ${report.missingEnglish.length - 10} 条`);
  }
  write('');
  write(
    report.written
      ? `已写入 CHANGELOG.md / CHANGELOG.en.md / package.json${report.committed ? '，并已提交' : ''}${report.tagged ? `，已打标签 ${report.tag}` : ''}。`
      : '未写入任何文件（默认是计划模式）。',
  );
  if (!report.written) write('  确认后执行：node scripts/release.mjs --write --commit --tag');
  write('');
  write(`以下文件仍写着 ${report.previousVersion}；它们是对外说明或历史记录，本脚本不代改：`);
  if (!report.staleVersionMentions.length) write('  （无）');
  for (const [file, hits] of groupByFile(report.staleVersionMentions)) write(`  ${file}  (${hits.length} 处)`);
  write('');
  write(`  逐行清单：git grep -n -F '${report.previousVersion}'`);
}

/** Group the stale-mention rows by file, keeping first-seen order. */
function groupByFile(rows) {
  const map = new Map();
  for (const row of rows) map.set(row.file, [...(map.get(row.file) || []), row]);
  return map;
}

/**
 * Create the release commit over exactly the three files this script owns.
 *
 * Paths are staged explicitly rather than with `-A`: the worktree is shared with concurrent sessions,
 * and a blanket add would carry somebody else's half-finished edit into a release.
 */
function commitRelease(plan) {
  const files = [CHANGELOG_FILES.zh.file, CHANGELOG_FILES.en.file, 'package.json'];
  git(['add', ...files]);
  const message = [
    plan.subject,
    `统计区间 ${plan.range}（起点来源 ${plan.startSource}），收录 ${plan.entries.length} 条提交。`,
    plan.carried
      ? `「${CHANGELOG_FILES.zh.label}」里的手写正文原样提升为 ${plan.version} 的发布说明。`
      : `发布说明由 ${plan.entries.length} 条 Conventional Commits 生成。`,
    `package.json#version 同步到 ${plan.version}；release.yml 按这个号产出商店包与 GitHub Release。`,
  ];
  git(['commit', '-m', message.join('\n\n')]);
}

main();
