# P0 隐私披露 + 转换层数据完整性 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 `.qoder/specs/2026-09-19-p0-data-integrity-design.md` 的 9 个修复项，使扩展重新具备提交 Chrome Web Store 的条件，并消除转换层的静默数据损坏。

**Architecture:** 两阶段。阶段一（F-1…F-4）是隐私边界与 CI 守卫，四项彼此独立、任一单独可发；阶段二（F-5…F-9）是转换层语义，有硬顺序依赖（F-9 必须先于 F-8 落地才有意义）。转换层断言全部落在既有 Playwright harness 上，纯逻辑（registry BFS）另建一个 Node 侧快照守卫。

**Tech Stack:** WXT + Vue 3 + TypeScript + Element Plus（MV3）、SheetJS 0.18.5、pdf.js 6.2.108、jsPDF 4.2.1、DOMPurify 3.4.12、fflate 0.8.3、Playwright。

**规格是唯一事实来源。** 本文件只写「怎么做」；「为什么这样决定」在规格里，冲突时以规格为准。

---

## 关于测试基础设施的三个前提

执行前必须知道，否则会按错模型写测试：

1. **项目无单元测试框架**（`AGENTS.md` 明写无 vitest）。转换层断言的唯一落点是 `scripts/e2e-test.mjs`。
2. **e2e 不加载扩展**：`e2e-test.mjs:319-327` 用 `chromium.launch({channel:'chrome'})` + `newPage()`，把 `.output/chrome-mv3` 当普通网页用 HTTP 起服务，并 `addInitScript(mockChromeStorage())` 伪造 `chrome.storage`。因此**任何依赖真实扩展 API（`chrome.runtime.getURL` 等）的断言都不可用**。
3. **`pnpm test:e2e` = build + 跑测试**，单轮数分钟。改一次转换器就跑全量是最贵的做法，所以 Task 0.3 先给 harness 加场景过滤器。
   **执行期实测修正**：既有 ~30 个节的函数体不看 `section()` 返回值，所以过滤跑**并不省时间**；
   它的实际价值是目标节的结果不被埋在长日志里，以及 `not a full suite run` 那行让过滤跑无法被误当成全绿。
   需要真正省时就直接跑全量。
4. **`downloadBatchArtifact(page)`（原名 `downloadLastResult`，Task 1.1 已改名）只处理单文件产物**：
   它点批次主下载按钮，单文件批次拿到该文件、多文件批次拿到 ZIP，而它只解**一层**容器。
   因此内置了熔断——`suggestedFilename()` 以 `.zip` 结尾就抛错。
   本计划所有复用点（2.1b / 2.2 / 2.3 / 2.5 / 2.6）都刻意用**单文件**夹具；
   若某次改动让夹具变成多表/多页从而产出 ZIP，会直接抛错而不是静默给出不可 grep 的字节——这是设计，不要拆掉熔断。
   另外：断言用的 marker **不得含 `=`**（altChunk 的 HTML 段会被 QP 转义成 `=3D`），
   且必须是**夹具唯一**的串，不能用 `iVBORw0KGgo` 这类通用魔数——详见 Task 1.1 的实测修正块。

## 文件结构

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `utils/converters/html-to-docx.ts` | 改 | 阶段一：补 `stripRemoteResources`；阶段二：sanitize 前调 SVG 栅格化 |
| `utils/core/svg-embed.ts` | 建 | 内联 `<svg>` → PNG data URL，只服务 DOCX 边界 |
| `utils/core/svg-raster-common.ts` | 建 | 从 `svg-rasterize.ts` 抽出的 SVG 尺寸推导，两个消费方共用 |
| `utils/converters/svg-rasterize.ts` | 改 | 改为复用 `svg-raster-common`，行为不变 |
| `utils/converters/md-to-html.ts` | 改 | SVG 白名单（F-9） |
| `utils/converters/csv-to-xlsx.ts` | 改 | 值保真重建（F-6） |
| `utils/converters/xlsx-to-csv.ts` | 改 | 读取/写出选项归位 + 日期双形态（F-7） |
| `utils/converters/xlsx-to-json.ts` | 改 | 同上，出真数字真布尔（F-7） |
| `utils/core/csv-guard.ts` | 改 | 公式单元格分支 + 改写错误 JSDoc（F-7） |
| `utils/core/types.ts` | 改 | `Converter.edgePreference?`（F-5b） |
| `utils/core/registry.ts` | 改 | adjacency 按 `(edgePreference, 注册序)` 稳定插入（F-5b） |
| `utils/converters/html-to-pdf.ts` | 改 | 页面切片 JPEG→PNG（F-5a）+ 声明偏好 |
| `utils/converters/html-to-png.ts` | 改 | 声明 `edgePreference`（F-5b） |
| `scripts/check-path-snapshot.mjs` | 建 | 静态解析转换器 + 重放 BFS，对比基线（F-5b 守卫） |
| `scripts/__baseline__/conversion-paths.json` | 建 | 182 对源×目标的路径基线 |
| `scripts/make-fixtures.cjs` | 改 | 新增 5 个夹具 |
| `scripts/e2e-test.mjs` | 改 | 下载读取助手 + 场景过滤 + 5 组新场景 |
| `docs/privacy.html` | 改 | 补两项存储披露（F-2） |
| `docs/index.html` | 改 | 移除商店死链（F-3） |
| `scripts/check-offline.mjs` | 改 | 产物断言缺失即失败 + `--source-only`（F-4） |
| `.github/workflows/ci.yml` | 改 | 产物断言挪到 build 之后（F-4）+ 挂 `verify:paths` |
| `package.json` | 改 | `verify:offline:source`、`verify:paths` |
| `CHANGELOG.md` / `.en.md`、`README.md` / `.en.md`、`AGENTS.md`、`.qoder/rules/wxt-rules.md`、`CHROMEWEBSTORE.md` | 改 | 文档同步 |

## 硬顺序

阶段一 F-1…F-4 彼此独立，可任意顺序、单独提交、单独回滚。
阶段二必须按 **2.1a → 2.1b → 2.1c → 2.2 → 2.3 → 2.4 → 2.5 → 2.6**：
F-9（2.5）必须先于 F-8（2.6），因为 `md-to-html` 的 `USE_PROFILES:{html:true}` 不含任何 svg 标签，
不先放开，走到 `html→docx` 时已经没有 `<svg>` 可栅格化。

## 阶段 0 · 准备工作

### Task 0.1：建立回归基线（改代码之前）

**Files:** 无修改，只测量。

- [ ] **Step 1: 确认工作树干净并记录构建产物指纹**

```bash
cd /Users/liaolongdong/code/chrome-plugins/transfer-any-file
git status --short          # 期望：无输出
pnpm build                  # 期望：成功，输出 .output/chrome-mv3
pnpm package                # 期望：产出 .output/transfer-any-file-1.0.0-chrome.zip
ls -la .output/transfer-any-file-1.0.0-chrome.zip
```

> **执行期修正（Task 0.1）**：`pnpm build` 是 `wxt build`，**不产 zip**；zip 由 `pnpm package`（`wxt zip`）生成。凡是「改了代码要看 zip 体积」的步骤都必须先 `pnpm package`，否则量到的是旧包。

记下 zip 字节数。当前基线是 **1,138,593 B**（Task 0.1 实测确认，且与 `.output/chrome-mv3` 逐文件字节等价）。F-5a 之后必须重测并写进 CHANGELOG。

- [ ] **Step 2: 跑全量，确认起点是绿的**

```bash
pnpm lint:all && pnpm verify:meta && pnpm verify:offline && pnpm verify:listing && pnpm test:e2e
```

期望：**全部通过**，e2e 报 `216/216`。若起点不是绿的，**停下**先报告——不能在已红的基线上做归因。

- [ ] **Step 3: 记录 git 锚点**

```bash
git rev-parse HEAD; git rev-parse HEAD > .git/P0_BASELINE_ANCHOR
```

期望：`fd2fe62`（规格提交）或其后。

### Task 0.2：读规格与项目规则

- [ ] **Step 1:** 完整读 `.qoder/specs/2026-09-19-p0-data-integrity-design.md`。§0 的硬不变量（权限只有 `storage`、不改 `fat:` 键集、不新增可见交互、中英 i18n 键集相等）在本计划里没有对应任务，因为它们是**约束**而非待办——任何任务若需要触碰，停下询问。
- [ ] **Step 2:** 读 `.qoder/rules/wxt-rules.md` §9（安全与隐私）与 §12（验证）、`AGENTS.md` 的「常见陷阱」。

### Task 0.3：给 harness 加「只跑相关场景」的能力

**Files:**
- Modify: `scripts/e2e-test.mjs`（`section()` 定义处 + 汇总输出处）

- [ ] **Step 1: 写门控**

在 `scripts/e2e-test.mjs` 的 `function section(name) { ... }` **之前**插入：

```js
/**
 * Scenario filter. `E2E_ONLY` is a comma-separated list of case-insensitive substrings; when set,
 * `section()` reports every other section as skipped. Exists because a full run costs minutes and
 * the phase-2 converter tasks each need one or two scenarios — without a filter the temptation is
 * to skip verification entirely.
 */
const ONLY = (process.env.E2E_ONLY || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
let skippedSections = 0;
```

然后把 `section()` 整体替换为：

```js
function section(name) {
  if (ONLY.length > 0 && !ONLY.some(needle => name.toLowerCase().includes(needle))) {
    skippedSections++;
    console.log(`\n▸ ${name}  (skipped by E2E_ONLY)`);
    return false;
  }
  console.log(`\n▸ ${name}`);
  return true;
}
```

`section()` 现在有返回值，**既有调用全部忽略它，行为不变**；新场景用返回值做门。

> **执行期实测修正（Task 0.3）**：既有 ~30 个节都写成 `section('X'); try { … } catch { fail() }`，
> 函数体**不看返回值**，所以设了 `E2E_ONLY` 之后它们的浏览器操作照旧执行——
> 过滤跑与全量跑耗时几乎相同（实测两次都 216/216，skipped 计数 77）。
> 本任务只交付机制，**不做既有调用点的改造**（30 处 try 块的重排风险远大于收益，
> 也超出本计划范围）。因此：
> - 收益随阶段二推进逐步兑现——本计划新增的 5 个节都用 `if (section('…')) { … }` 包住，会被真跳过；
> - 不要指望 `E2E_ONLY=…` 比全量快，它的实际价值是**让目标节的结果不被埋在长日志里**，
>   以及那行 `not a full suite run` 让过滤跑无法被误当成全绿；
> - 后续任务验证时，若需要真正的省时，跑全量 `pnpm test:e2e` 即可，不必纠结过滤器。

- [ ] **Step 2: 让跳过成为可见的**

在文件末尾打印 `passed` / `failed` 汇总的位置追加：

```js
if (skippedSections > 0) console.log(`  ! ${skippedSections} sections skipped by E2E_ONLY — not a full suite run`);
```

- [ ] **Step 3: 验证过滤生效**

```bash
E2E_ONLY="offline sentinel" pnpm test:e2e 2>&1 | tail -30
```

期望：只有 `Offline Sentinel` 真跑，其余打印 `(skipped by E2E_ONLY)`，末尾出现 `N sections skipped`。

- [ ] **Step 4: 提交**

```bash
git add scripts/e2e-test.mjs
git commit -m "test(e2e): E2E_ONLY 场景过滤器，跳过的节显式计数而非静默通过

单轮全量 e2e 数分钟，阶段二每个转换器任务只需一两节；没有过滤能力的代价是直接跳过验证。
被跳过的节计入 skipped 并在汇总行显式提示，避免过滤跑被当成全绿。"
```

## 阶段一 · 隐私边界与 CI 守卫（F-1…F-4）

### Task 1.1：`html→docx` 剥离远程子资源（F-1）

**Files:**
- Modify: `utils/converters/html-to-docx.ts:18-26`
- Modify: `scripts/make-fixtures.cjs`（新增夹具）
- Modify: `scripts/e2e-test.mjs`（下载助手 + 新场景）

- [ ] **Step 1: 加下载读取助手**

在 `scripts/e2e-test.mjs` 的 `pickTarget()` 之后插入：

```js
/**
 * Download the current single-file result and return its bytes as a latin1 string, so a test can
 * grep the artifact itself rather than trusting what the UI claimed. Containers are unzipped
 * first, because a marker inside a deflated DOCX member is invisible in the raw bytes.
 *
 * latin1 is deliberate: it is a byte-preserving 1:1 encoding, so `includes('canary/img.png')`
 * matches raw bytes without a decode step, and no assertion here depends on text decoding
 * correctly. The members we probe (the MHT altChunk, CSV bodies) are all ASCII.
 *
 * Downloads are intercepted rather than read from app state: the Vue instance does not expose
 * `batchResults`, and reaching for it would mean adding a debug-only global to production source
 * to satisfy a test.
 */
async function downloadBatchArtifact(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    (await page.$('.result-download .el-button')).click(),
  ]);
  const buf = fs.readFileSync(await download.path());
  if (buf.readUInt32LE(0) === 0x04034b50) {
    const { unzipSync } = await import('fflate');
    const members = unzipSync(new Uint8Array(buf));
    return Object.values(members)
      .map(u => Buffer.from(u).toString('latin1'))
      .join('\n');
  }
  return buf.toString('latin1');
}
```

- [ ] **Step 2: 加夹具**

在 `scripts/make-fixtures.cjs` 的 `main()` 内、写 `sample-archive.zip` 之前加：

> **自检修正 → 已被 Task 1.1 实测推翻，按下面的事实执行**：原判断「MHT 部件常带 quoted-printable / base64，不解码就 includes 会假红」是**错的**。实测 `html-docx-js-typescript` 产物：altChunk 是 `word/afchunk.mht`，HTML 段虽**声明** `Content-Transfer-Encoding: quoted-printable`，但该库唯一的 QP 变换是 `src=` → `src=3D`（`src/utils.ts` 的 `htmlSource.replace(/\=/g, '=3D')`），不折行、不对 HTML 段做 base64；ZIP 条目是 **stored（method=0，jszip 默认）而非 deflate**。
>
> 结论三条：① **不需要 `decodeMimeParts`**，加了反而坏事——base64 段一旦解码成二进制，`data:` 探针就消失了。② **探针 marker 不得含 `=`**（含 `=` 会被 QP 变换成 `=3D` 而命不中）；`canary/img.png` 与 `/canary/anchor` 都不含 `=`，red→green 有效。③ `downloadBatchArtifact` 的 JSDoc 已按实测改写。
>
> **计划原有两条断言被证伪并已替换（后续任务照替换后的写法）**：
> 1. `includes('data:image/png;base64,')` **修复前后恒为 false**——`getMHTdocument()` 会把带双引号的 `data:` src 从 altChunk **摘出去**做成独立 base64 MIME part，img 改写成 `file:///C:/fake/image0.png`，该字面量不进产物。照抄会让对照断言永久报「over-eager filter」假失败。改为探测 payload 标记 **`iVBORw0KGgo`**，语义更强（既证明 strip 没吃内联图，也证明 Word 无需外联即可渲染）。
> 2. `.result-download .el-button` 命中的是结果行的**预览**按钮（`ResultDownload.vue:125`），只表现为 download timeout。正确选择器 **`.result-download .download-actions .el-button`**（`:165-176`）。Task 2.1b / 2.2 / 2.3 / 2.5 / 2.6 复用已提交的 `downloadBatchArtifact`，无需再改。
>
> **提交清单必须含生成的夹具**：`fixtures/` 全是 tracked 文件，而 `ci.yml:65` 直接跑 `node scripts/e2e-test.mjs` **且没有 make-fixtures 步骤**——不提交新夹具 CI 必 `ENOENT`。本计划各任务 `git add` 凡涉及新夹具都要加上 `fixtures/<file>`。
>
> **两条既存坑记账（本计划不修）**：① `node scripts/make-fixtures.cjs` 非确定性重写 4 个已跟踪二进制夹具（jsPDF 时间戳、`_rels` 随机 Id），跑完记得 `git checkout --` 还原无关 diff；② `isLocalUrl` 把协议相对 URL（`//host/x.png`）判为 relative 而放行，DOCX 路径上 Word 只当本地解析、本次缺陷已闭合，但 srcdoc / 栅格化边界会按 http(s) 解析，收紧属独立决策。

```js
  // F-1 fixture: the DOCX boundary is the one untrusted-HTML consumer that had no subresource
  // stripping. The data: image is the control — it must SURVIVE, because mammoth inlines every
  // DOCX image as a data URL and a strip that eats those "passes" the privacy check while
  // breaking the feature. The anchor is the second control: hrefs are content, not subresources.
  const egressHtml = `<!doctype html><html><head>
<style>@import url('http://127.0.0.1:9876/canary/css-import');
body{background:url('http://127.0.0.1:9876/canary/css-bg.png')}</style></head><body>
<img src="http://127.0.0.1:9876/canary/img.png">
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==">
<a href="http://127.0.0.1:9876/canary/anchor">link</a>
</body></html>`;
  fs.writeFileSync(path.join(outDir, 'sample-egress.html'), egressHtml);
```

```bash
node scripts/make-fixtures.cjs && ls -la fixtures/sample-egress.html
```

期望：文件存在，约 500 B。

- [ ] **Step 3: 写会失败的断言**

在 `scripts/e2e-test.mjs` 现有 `Offline Sentinel` 一节**之后**插入（放后面是为了复用同一台 harness server 与同一个 `canaryHits`）。

```js
  // ═══════════════════════════════════════════
  //  F-1 — DOCX boundary must not carry remote subresources into a Word document
  // ═══════════════════════════════════════════

  if (section('DOCX Subresource Egress')) {
    try {
      await resetWorkbench(page);
      const fi = await page.$('input[type="file"]');
      const egressHtml = fs
        .readFileSync(path.join(FIXTURE_PATH, 'sample-egress.html'), 'utf8')
        .replaceAll('127.0.0.1:9876', `127.0.0.1:${PORT}`);
      await fi.setInputFiles({ name: 'sample-egress.html', mimeType: 'text/html', buffer: Buffer.from(egressHtml) });
      await page.waitForTimeout(1000);
      await pickTarget(page, 'Word (.docx)');
      await (await page.$('.convert-btn')).click();
      await page.waitForFunction(
        () => {
          const alert = document.querySelector('.el-alert__title');
          return alert && alert.textContent.length > 0;
        },
        { timeout: 30000 },
      );
      await page.waitForTimeout(500);

      const docxText = await downloadBatchArtifact(page);

      const wanted = ['canary/img.png', 'canary/css-import', 'canary/css-bg.png'];
      const survived = wanted.filter(m => docxText.includes(m));
      if (survived.length === 0) {
        ok('Remote img / @import / style url() stripped from the DOCX altChunk');
      } else {
        fail('DOCX egress strip', `survived: ${survived.join(', ')}`);
      }

      if (docxText.includes('data:image/png;base64,')) {
        ok('Inline data: image preserved (mammoth images must not be collateral damage)');
      } else {
        fail('DOCX data: control', 'the data: image was stripped too — over-eager filter');
      }

      if (docxText.includes('/canary/anchor')) {
        ok('Anchor href preserved (surgical strip, not blanket)');
      } else {
        fail('DOCX anchor control', 'anchor href was stripped — the filter is not surgical');
      }
    } catch (e) {
      fail('DOCX Subresource Egress', e.message);
    }
  }
```

- [ ] **Step 4: 跑，确认它红**

```bash
pnpm build && E2E_ONLY="docx subresource" pnpm test:e2e 2>&1 | grep -A6 "DOCX egress strip"
```

期望：**FAIL** — `DOCX egress strip: survived: canary/img.png, ...`。
这一步是归因证明：夹具、下载拦截、断言三者都工作，只有实现还没有。
若报 `download timeout` 或 `file input not found`，**先修 Step 1 的助手**，不要跳到 Step 5。

- [ ] **Step 5: 写实现**

`utils/converters/html-to-docx.ts` import 块加：

```ts
import { stripRemoteResources } from '~/utils/core/html-sanitize';
```

把 `:18-24` 的 `const sanitized = DOMPurify.sanitize(...)` 整体替换为：

```ts
    // DOMPurify keeps remote URLs by design — its job is executable markup, not egress. Here the
    // markup is not rendered by us: `asBlob` packs it into an MHT altChunk that Microsoft Word
    // fetches *on the user's machine* when they open the file. A remote <img> therefore becomes a
    // tracking pixel issued by a different application, outside every CSP and outside what
    // `verify:offline` can see, from a tool whose stated guarantee is that nothing is requested.
    // Same boundary rule already applied at html-raster.ts:84 and in both preview components.
    const sanitized = stripRemoteResources(
      DOMPurify.sanitize(htmlString, {
        WHOLE_DOCUMENT: true,
        USE_PROFILES: { html: true },
        ADD_TAGS: ['link', 'style', 'meta'],
        ADD_ATTR: ['target'],
      }) as string,
    );
```

- [ ] **Step 6: 跑，确认绿**

```bash
pnpm build && E2E_ONLY="docx subresource" pnpm test:e2e 2>&1 | grep -A6 "DOCX Subresource Egress"
```

期望：三条 `ok` 全过（remote 剥离、`data:` 保留、锚点保留）。

- [ ] **Step 7: 确认没破既有离线哨兵**

```bash
E2E_ONLY="offline sentinel" pnpm test:e2e 2>&1 | grep -A5 "Offline Sentinel"
```

期望：原有两条 `ok` 仍过。

- [ ] **Step 8: 提交**

```bash
git add utils/converters/html-to-docx.ts scripts/make-fixtures.cjs scripts/e2e-test.mjs
git commit -m "fix(security): html→docx 边界剥离远程子资源，堵住 Word 打开时的外联

DOMPurify 保留 https: URL 是它职责内的正确行为，但本路径的产物不是我们渲染的——
asBlob 把标记打进 MHT altChunk，用户用 Word 打开时由 Word 去抓 <img src> / url() /
@import。发起请求的是另一个应用，CSP 与 verify:offline 都看不见，而产品的标题承诺
正是「无网络请求」。

stripRemoteResources 已在 html-raster 与两个预览组件使用，本处是漏网的最后一个
不可信 HTML 消费方；isLocalUrl 放行 data:/blob:，故 mammoth 内联的 base64 图不受影响
——e2e 把这条连同锚点一起作为对照断言，防止「隐私检查通过但功能被顺手打死」。"
```

### Task 1.2：隐私政策补两项存储披露（F-2）

**Files:**
- Modify: `docs/privacy.html`（英文清单约 `:191-193`、中文清单约 `:250-252`）
- Modify: `CHROMEWEBSTORE.md`（若含同等枚举）

- [ ] **Step 1: 定位两处清单**

```bash
grep -n "theme colour\|light/dark\|keyboard shortcut\|panel layout\|last six targets" docs/privacy.html
grep -n "主题\|深浅\|快捷键\|面板布局\|最近.*目标" docs/privacy.html
```

期望：各命中一处，分别落在英文段与中文段。记下确切行号——规格写的是「约」。

- [ ] **Step 2: 确认代码里的完整键集**

```bash
grep -c "fat:" utils/storage.ts && grep -n "fat:" utils/storage.ts
```

期望 12 个键。逐条对照隐私政策，确认**只缺** `fat:outputOptions` 与 `fat:presets`。若发现第三处缺失，停下——那是新缺陷，不在本计划范围。

- [ ] **Step 3: 补英文条目**

在英文清单 `panel layout` 之前插入两项，沿用该 `<li>` 的既有标记结构：

```html
image output options (longest edge, quality, size ceiling and PDF render density),
conversion presets (including the preset names you type, together with their target format and output options),
```

- [ ] **Step 4: 补中文条目（同位置、同结构）**

```html
图片输出参数（最长边、质量、体积上限与 PDF 渲染清晰度）、
转换预设（包含你自己输入的预设名称，以及它记录的目标格式与输出参数）、
```

- [ ] **Step 5: 措辞纪律**

两条都必须落在既有框架内：**仅存本机、不上传、可清除**。不写「加密存储」（不属实），不写「匿名」（无标识符概念）。预设名是**用户自己键入的自由文本**，这是这份披露里唯一真正带用户内容的一项，必须明写，不能含糊成「偏好设置」。

- [ ] **Step 6: 核对 CWS 披露块**

```bash
grep -n -i "预设\|preset\|输出参数\|output option" CHROMEWEBSTORE.md
```

若其隐私披露小节也逐项枚举，补同样两项。

- [ ] **Step 7: 验证**

```bash
pnpm verify:listing && pnpm verify:meta && pnpm build && grep -c "预设\|preset" docs/privacy.html
```

期望：两条 verify 通过；计数比改动前增加；构建成功。

- [ ] **Step 8: 提交**

```bash
git add docs/privacy.html CHROMEWEBSTORE.md
git commit -m "docs(privacy): 补 fat:presets 与 fat:outputOptions 两项本地存储披露

utils/storage.ts 声明 12 个 fat: 键，隐私政策逐项枚举却只列了 10 项。漏掉的
fat:presets 存的是用户自己键入的预设名称——这是全部本地数据里唯一真正带用户内容的一项，
出现在一份会被 Chrome Web Store 审核、也是全站唯一对外承诺数据边界的文档里，
属于披露不完整而非措辞不准。"
```

### Task 1.3：移除产品页商店死链（F-3）

**Files:**
- Modify: `docs/index.html:5414`（zh-CN）、`:5417`（en）

- [ ] **Step 1: 确认现状与参照物**

```bash
grep -n "chrome.google.com/webstore/detail/ITEM_ID" docs/index.html
sed -n '27,34p' README.md
```

期望：index.html 命中 2 行；README 侧显示同一占位符被 HTML 注释包着（正确做法的参照物）。

- [ ] **Step 2: 改中文侧** — 把 `:5414` 整行

```html
                  >上架后将在 Chrome 应用商店提供一键安装，商店页面链接：<a href="https://chrome.google.com/webstore/detail/ITEM_ID" target="_blank" rel="noopener">CWS 商店页面</a></span
```

改为

```html
                  >尚未上架 Chrome 应用商店。上架后此处会提供一键安装链接与商店页面地址。</span
```

- [ ] **Step 3: 改英文侧（对称）** — 把 `:5417` 整行

```html
                  >Once published, one-click install will be available via Chrome Web Store: <a href="https://chrome.google.com/webstore/detail/ITEM_ID" target="_blank" rel="noopener">CWS store page</a></span
```

改为

```html
                  >Not yet published to the Chrome Web Store. Once it is, this spot will carry the one-click install link and the listing URL.</span
```

- [ ] **Step 4: 确认产物里已无该 URL**

```bash
pnpm build && grep -rn "webstore/detail/ITEM_ID" .output/chrome-mv3/ docs/ ; echo "exit=$?"
```

期望：两处都搜不到，`exit=1`。

- [ ] **Step 5: 提交**

```bash
git add docs/index.html
git commit -m "docs(website): 移除指向未上架商店的活链接

index.html 把 https://chrome.google.com/webstore/detail/ITEM_ID 渲染成真实 <a href>
并随 static.yml 发到 GitHub Pages；扩展尚未上架，该 URL 是占位符字面量，对爬虫与
AI 检索都表现为死链。README 侧同一占位符本就用 HTML 注释包住，此处对齐。
AGENTS.md 明文：勿引用不存在的商店链接。"
```

### Task 1.4：产物 manifest 守卫必须真的执行（F-4）

**Files:**
- Modify: `scripts/check-offline.mjs:88-104`
- Modify: `package.json`、`.github/workflows/ci.yml`
- Modify: `AGENTS.md`、`.qoder/rules/wxt-rules.md`

- [ ] **Step 1: 先证明当前守卫确实没跑**

```bash
cd /Users/liaolongdong/code/chrome-plugins/transfer-any-file
mv .output /tmp/output.bak
pnpm verify:offline; echo "exit=$?"
mv /tmp/output.bak .output
```

期望：输出含 `(no .output/chrome-mv3 build found — checked the manifest source only)` 且 **`exit=0`**。这就是缺陷本身：守卫静默跳过。记下这行，Step 5 拿它做对照。

- [ ] **Step 2: 改成缺失即失败，并加 `--source-only`**

`scripts/check-offline.mjs`，把 `:88-104` 整段替换为：

```js
// Assert on the artifact the browser actually loads: a WXT module or a manifest transform can add
// permissions the source config never mentions. This is the only guard for that, and until now it
// was gated on the artifact merely existing — so on a fresh CI checkout (.output is gitignored, and
// the lint job runs before any build) it silently skipped and the suite still printed OK. A guard
// that never ran is the bug it was written to catch, hence: missing artifact is a failure unless the
// caller asked for the source-only pass.
const sourceOnly = process.argv.includes('--source-only');
const builtManifest = path.join(ROOT, '.output', 'chrome-mv3', 'manifest.json');

if (sourceOnly) {
  console.log('(source-only pass: artifact manifest check skipped by design)');
} else if (!fs.existsSync(builtManifest)) {
  failures.push(
    '.output/chrome-mv3/manifest.json not found — the manifest permission check runs against the ' +
      'artifact the browser loads. Run "pnpm build" first, or pass --source-only for the ' +
      'source-only pass used by the CI lint job.',
  );
} else {
  const manifest = JSON.parse(fs.readFileSync(builtManifest, 'utf8'));
  const granted = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  if (granted.length !== 1 || granted[0] !== 'storage') {
    failures.push(
      `.output/chrome-mv3/manifest.json permissions must be ["storage"], found: ${JSON.stringify(granted)}`,
    );
  }
  if (manifest.host_permissions !== undefined || manifest.optional_permissions !== undefined) {
    failures.push('.output/chrome-mv3/manifest.json carries host_permissions or optional_permissions');
  }
}
```

- [ ] **Step 3: 加 npm script** — `package.json` 的 `scripts`，在 `verify:offline` 之后加：

```json
    "verify:offline:source": "node scripts/check-offline.mjs --source-only",
```

- [ ] **Step 4: 改 CI 拓扑** — `.github/workflows/ci.yml`：把 lint job 里的 `pnpm verify:offline` 换成 `pnpm verify:offline:source`；在 build job 的构建步骤之后追加：

```yaml
      - name: Verify offline (built manifest)
        run: pnpm verify:offline
```

- [ ] **Step 5: 关键——证明新守卫真的会失败**

一个从没跑过的守卫正是这条缺陷本身；加完不验证等于重犯。

```bash
cp wxt.config.ts /tmp/wxt.config.ts.bak
```

在 `wxt.config.ts` 的 `permissions: ["storage"],` 之后临时插入一行：

```ts
    host_permissions: ['<all_urls>'],
```

```bash
pnpm build && pnpm verify:offline; echo "exit=$?"
```

期望：**FAIL**，输出含 `manifest.json carries host_permissions or optional_permissions`，`exit=1`。**这一条不通过就说明守卫仍是假的。**

再验证 source-only 在无产物时仍绿：

```bash
rm -rf .output && pnpm verify:offline:source; echo "exit=$?"
```

期望：通过，打印 `(source-only pass: ...)`，`exit=0`。

- [ ] **Step 6: 撤回临时改动并复验**

```bash
cp /tmp/wxt.config.ts.bak wxt.config.ts && rm /tmp/wxt.config.ts.bak
git diff --stat wxt.config.ts    # 期望：无输出
pnpm build && pnpm verify:offline; echo "exit=$?"
```

期望：通过，`exit=0`。

- [ ] **Step 7: 同步文档** — `AGENTS.md` 常用命令表的 `verify:offline` 行、`.qoder/rules/wxt-rules.md` §12 与「验证」小节里凡描述「产物只有 storage 权限」之处，改为反映真实拓扑：源码层在 lint job，产物层在 build job 之后，缺任一步都不算守全。

- [ ] **Step 8: 提交**

```bash
git add scripts/check-offline.mjs package.json .github/workflows/ci.yml AGENTS.md .qoder/rules/wxt-rules.md
git commit -m "fix(ci): verify:offline 的产物 manifest 断言缺失即失败，并挪到 build 之后

该断言包在 if (fs.existsSync(builtManifest)) 里，else 只 console.log；而 ci.yml 的 lint
job 跑在干净检出上、.output 又已 gitignore——于是「浏览器实际加载的那份包只有 storage
权限」这条唯一能防住 WXT 模块/manifest transform 偷偷加权限的检查，在 CI 中恒为未执行，
verify:offline 照样绿，AGENTS.md 还把它写成已经守着的样子。

改为缺失即失败 + --source-only 显式变体。已用临时注入 host_permissions 的方式证明新断言
确实会红（撤回后复验通过）——一个从没跑过的守卫正是这条缺陷本身。"
```

**阶段一完成判据：** `pnpm lint:all && pnpm verify:meta && pnpm verify:offline && pnpm verify:listing && pnpm build && pnpm test:e2e` 全绿。**此时可独立提交商店审核。**

## 阶段二 · 转换层语义（F-5…F-9）

### Task 2.1a：路径快照守卫（先建，作为 F-5b 的护栏）

> **执行期实测修正（Task 2.1a 已完成于 `a7f7bd5`；下面四条覆盖本任务的计划文本，后续任务以实际实现为准）**
>
> 1. **本任务 Step 2-4 的解析器是坏的，只能解析出 28/48 条边。** 漏掉三种真实写法：
>    `image-convert.ts` 的工厂参数是**循环变量**（调用里没有 `FileFormat.` 字面量，12 条全漏）、
>    `image-to-html.ts` 与 `image-to-pdf.ts` 的 `from` 写成**简写属性 `from,`**（正则看不见，9 条全漏）。
>    实际实现改为显式解析 `utils/converters/index.ts` 的 `register()` 调用序列，
>    并加了三条防漏边自检（注释掉一条 register / 把 `from` 改成非字面量 / 换成未知工厂 → 三者都必须变红）。
> 2. **Step 7 的字面改行不可能变红，且计划版脚本天生跑不红它。** ① 调换 `mdToHtmlConverter` /
>    `htmlToMdConverter` 这两条边落在**不同邻接表**，换序不改变任何列表顺序；② 计划版解析器按
>    `fs.readdirSync` 字母序建邻接表、**根本不读 `index.ts`**，对任何注册换序天然无感。
>    实际改用唯一能翻转路由的变异：**`register(htmlToPdfConverter)` ↔ `register(htmlToPngConverter)`**，
>    实测 14 对变红（`html/md/docx/xlsx/csv/txt/json → jpg|webp`），撤回后回绿。
>    **这条同时坐实了 2.1c 的立项前提。**
> 3. **Step 4 的 `JSON.stringify(obj, null, 2)` 写基线过不了 `prettier --check`**（Prettier 会把短字符串数组
>    收回单行），`--update` 的产物自身不合规。实际实现改为「一行一对」手写序列化。
> 4. **BFS 保真的实测结论，不要照抄计划的暗示**：「`target` 判断在 `visited` 之前」这类细节今天
>    **不是判别性的**——两种变体（出队时标记 visited、target 判断后置）与镜像实现结果完全相同。
>    真正决定快照的是**邻接表顺序 = 注册顺序**。仍保留逐行精确镜像，因为 2.1c 的偏好插入靠那两行落地。
>
> **遗交给 Task 3.1**：`AGENTS.md` 常用命令表与 `.qoder/rules/wxt-rules.md` 目前**都没有** `verify:paths`，
> 未来会话看不到这条守卫，必须补上。

**Files:** Create `scripts/check-path-snapshot.mjs`、`scripts/__baseline__/conversion-paths.json`；Modify `package.json`、`.github/workflows/ci.yml`

- [ ] **Step 1: 写快照脚本** — 创建 `scripts/check-path-snapshot.mjs`，内容见下一个 Step。

- [ ] **Step 2: 脚本头部与解析部分** — 文件前半（注释说明「为什么静态解析而非 import registry」+ `collectEdges` / `dedupe`）：

```js
/**
 * Conversion-path snapshot.
 *
 * `ConverterRegistry.findConversionPath` is a plain BFS over an adjacency list built in
 * `initConverters()` registration order, and it returns the FIRST shortest path. Two equal-length
 * routes therefore resolve by which `register()` call happened earlier — so source file order is
 * an undeclared input to which artifact a user gets. `Converter.edgePreference` (F-5b) makes that
 * declared; this script is what proves the declaration changed nothing.
 *
 * It parses the converter modules' literals rather than importing them: the real registry only
 * exists inside the built page, and the e2e harness serves that page over HTTP with a mocked
 * chrome.storage (it never loads the extension), so reaching a module singleton would mean adding
 * a debug global to production source for the test's benefit.
 *
 * Run with --update to rewrite the baseline after an INTENTIONAL semantics change.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'scripts', '__baseline__', 'conversion-paths.json');
const CONVERTER_DIR = path.join(ROOT, 'utils', 'converters');
const UPDATE = process.argv.includes('--update');

const FORMATS = ['md', 'html', 'docx', 'pdf', 'xlsx', 'csv', 'txt', 'json', 'png', 'jpg', 'webp', 'bmp', 'gif', 'svg'];

/** FileFormat.MD -> 'md', mirroring utils/core/types.ts:2-17. */
function enumValue(expr) {
  const m = /FileFormat\.([A-Z0-9]+)/.exec(expr);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Collect edges from every converter module. Covers the three shapes the codebase uses: a single
 * `const x: Converter = { from, to }`, an array literal of such objects, and a factory called once
 * per target (`createSvgRasterConverter(FileFormat.PNG)`).
 */
function collectEdges() {
  const edges = [];
  for (const entry of fs.readdirSync(CONVERTER_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'index.ts') continue;
    const src = fs.readFileSync(path.join(CONVERTER_DIR, entry.name), 'utf8');
    const source = `utils/converters/${entry.name}`;
    for (const m of src.matchAll(/\bfrom:\s*(FileFormat\.[A-Z0-9]+)/g)) {
      const from = enumValue(m[1]);
      const tail = src.slice(m.index, m.index + 400);
      const toMatch = /\bto:\s*(FileFormat\.[A-Z0-9]+)/.exec(tail);
      const prefMatch = /\bedgePreference:\s*(\d+)/.exec(tail);
      if (!from || !toMatch) continue;
      edges.push({ from, to: enumValue(toMatch[1]), preference: prefMatch ? Number(prefMatch[1]) : 0, source });
    }
    const fromMatch = /\bfrom:\s*FileFormat\.([A-Z0-9]+)/.exec(src);
    if (fromMatch) {
      const from = fromMatch[1].toLowerCase();
      for (const m of src.matchAll(/create\w*Converter\(\s*FileFormat\.([A-Z0-9]+)\s*\)/g)) {
        const to = m[1].toLowerCase();
        if (!edges.some(e => e.from === from && e.to === to)) edges.push({ from, to, preference: 0, source });
      }
    }
  }
  return dedupe(edges);
}

/** Mirror register(): a duplicate from→to overwrites the converter but keeps the first position. */
function dedupe(edges) {
  const seen = new Map();
  for (const e of edges) {
    const key = `${e.from}->${e.to}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  return [...seen.values()];
}
```

- [ ] **Step 3: 脚本后半（上半）** — 紧接 Step 2 追加邻接表与 BFS：

```js
function buildAdjacency(edges) {
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    const list = adj.get(e.from);
    if (!list.some(x => x.to === e.to)) list.push({ to: e.to, preference: e.preference });
  }
  for (const list of adj.values()) list.sort((a, b) => a.preference - b.preference);
  return adj;
}

/** The same algorithm as utils/core/registry.ts:69-98, over the parsed adjacency. */
function findPath(adj, from, to) {
  if (from === to) return [];
  const visited = new Set([from]);
  const queue = [[from, []]];
  let head = 0;
  while (head < queue.length) {
    const [current, p] = queue[head++];
    for (const { to: target } of adj.get(current) ?? []) {
      const next = [...p, `${current}>${target}`];
      if (target === to) return next;
      if (!visited.has(target)) {
        visited.add(target);
        queue.push([target, next]);
      }
    }
  }
  return null;
}

function snapshot(adj) {
  const out = {};
  for (const from of FORMATS) {
    for (const to of FORMATS) {
      if (from !== to) out[`${from}->${to}`] = findPath(adj, from, to);
    }
  }
  return out;
}
```

- [ ] **Step 4: 脚本后半（下半）** — 追加主流程与基线比对：

```js
const edges = collectEdges();
const snap = snapshot(buildAdjacency(edges));
const serialized = `${JSON.stringify({ edgeCount: edges.length, paths: snap }, null, 2)}\n`;

if (UPDATE) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, serialized);
  console.log(`baseline written: ${edges.length} edges, ${Object.keys(snap).length} pairs`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('no baseline. Run with --update after verifying edgeCount is 48.');
  process.exit(1);
}

const expected = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const diffs = [];
if (expected.edgeCount !== edges.length) diffs.push(`edgeCount ${expected.edgeCount} -> ${edges.length}`);
for (const key of Object.keys(expected.paths)) {
  const a = JSON.stringify(expected.paths[key]);
  const b = JSON.stringify(snap[key]);
  if (a !== b) diffs.push(`${key}: ${a} -> ${b}`);
}
if (diffs.length > 0) {
  console.error(`path snapshot drifted (${String(diffs.length)} difference(s)):`);
  for (const d of diffs.slice(0, 20)) console.error(`  ${d}`);
  console.error('\nIf the change is intentional, review each diff, then re-run with --update.');
  process.exit(1);
}
console.log(`path snapshot OK: ${String(edges.length)} edges, ${String(Object.keys(snap).length)} pairs`);
```

- [ ] **Step 5: 生成基线并核对边数**

```bash
node scripts/check-path-snapshot.mjs --update
```

期望：`baseline written: 48 edges, 182 pairs`。**若 `edgeCount` 不是 48，停下**——解析器漏了某种转换器写法，先修解析器。拿错的基线去守 F-5b 比没有基线更糟。

- [ ] **Step 6: 确认守卫现在是绿的**

```bash
node scripts/check-path-snapshot.mjs
```

期望：`path snapshot OK: 48 edges, 182 pairs`，退出码 0。

- [ ] **Step 7: 确认守卫真的会红**（同时证明「注册顺序决定路由」这个前提）

`sed -n '32,33p' utils/converters/index.ts` 后，把 `:32` 与 `:33` 两行 `register(mdToHtmlConverter)` / `register(htmlToMdConverter)` 顺序调换，跑 `node scripts/check-path-snapshot.mjs; echo "exit=$?"`。期望 **FAIL**、`exit=1`（`md→*` 路由变了）。然后 `git checkout utils/converters/index.ts && node scripts/check-path-snapshot.mjs` 回到绿。**这一步是 F-5b 的前提证明，不可跳过。**

- [ ] **Step 8: 挂进 package.json 与 CI** — scripts 加 `"verify:paths": "node scripts/check-path-snapshot.mjs",`；`.github/workflows/ci.yml` 的 lint job 在 `verify:offline:source` 之后加：

```yaml
      - name: Verify conversion paths
        run: pnpm verify:paths
```

- [ ] **Step 9: 提交**

```bash
git add scripts/check-path-snapshot.mjs scripts/__baseline__/conversion-paths.json package.json .github/workflows/ci.yml
git commit -m "test(core): 转换路径快照守卫，把注册顺序对路由的影响显式化

findConversionPath 是按注册顺序遍历邻接表的朴素 BFS 且返回第一条最短路径，
两条等长路由谁赢取决于 index.ts 里谁先 register()——源文件顺序成了
「用户拿到什么产物」的隐式输入，而这件事此前没有任何断言守着。
e2e 对页脚数字的唯一自动检查是 includes('14') && includes('48')，连子串都能骗过。

脚本静态解析转换器源码而非 import registry：真实 registry 只活在构建产物页面里，
而 e2e 是把 .output 当普通网页起 HTTP 服务 + mock chrome.storage（并不加载扩展），
要摸到那个模块单例就得给生产代码加调试全局。基线 48 边 / 182 对；
已用调换 index.ts 注册顺序的方式验证守卫会变红后撤回。"
```

### Task 2.1b：PDF 页面切片改 PNG（F-5a）

> **执行期实测修正 + 用户二次决策（已完成于 `38069ec` + `0e9be27`）**
>
> 1. **本任务 Step 2/4 的断言写法不成立**：`HTML→PDF` 只是 `conversions` 数据表里的一行，
>    整个表共用一个 try 块，没有「场景自己的 try 块」可追加；且 `E2E_ONLY="html to pdf"`
>    匹配不到任何小节名（小节名用 `→` 字符），过滤后 grep 为空**看着像没失败、实际是没跑**。
>    实际实现改为独立小节 + `E2E_ONLY="pdf"`，并把断言从「整文件 includes `/FlateDecode`」
>    收窄到**逐个 image XObject 读 `/Filter`** + 结构前置「切片数 == 页数」
>    （否则「0 个切片、0 个 DCT」也会假绿）。
> 2. **「图片多的文档体积略增」是错的，实测 4.3–5.5×**，且**升压缩档位救不回来**：
>    `'FAST'`→`'MEDIUM'` 只把照片页从 4.78× 买到 4.32×，这是无损编码换 DCT 的**格式代价**。
>    顺带纠正：`'NONE'` 不是弱压缩档，而是**完全不压缩**（大一个数量级）。
>    jsPDF 真实映射（`jspdf.es.js` @4.2.1）：`FAST`=zlib1+Sub(Predictor 11)、
>    `MEDIUM`=zlib6+Average(13)、`SLOW`=zlib9+Paeth(14)、未识别值=zlib4+Up(12)；
>    `processJPEG` 完全忽略该参数，所以对 JPEG 它一直是 no-op。
> 3. **`JSON→PDF` 实测 +21%**（`json-to-html` 给 token 上色，不是平坦白底），
>    是「文本页必然更小」的真实反例。其余 6 类文本文档**变小 7–25%**。
> 4. **选定 `'SLOW'`，规则是逐份 Pareto 而非合计最小**：十份文档每一份都比 `FAST` 小 1–8%
>    （合计 −3.6%），代价是每页编码 CPU **1.6–3.3×**、满幅页的不可取消窗口 ≈0.28 s → ≈0.9 s。
>    按「合计最小」会选出 `MEDIUM`，而那个「好看」全靠两页照片翻本。
> 5. **用户二次决策（原批准基于「体积略增」，该前提已被推翻）**：
>    **接受照片型页 4–5× 的格式代价**，理由换来的是文字永远清晰 + 12 条
>    `html/md/docx/xlsx/csv/txt/json → jpg|webp` 路由不再有二代际损失。
>    **Task 3.1 必须把这条如实写进 CHANGELOG 与 README 限制小节**，
>    不得写成笼统的「常见情形不付代价」。
> 6. **新发现（用户决定记入挂账、本轮不修）**：`renderHtmlToCanvas` 存在布局竞态
>    （`LAYOUT_SETTLE_MS`），同一份 HTML 两次栅格化可得 800×6215 与 800×6214、5 页与 6 页。
>    **「同一文档两次转 PDF 页数可能不同」是产品级隐患**，非本次引入。
>    也因此**没有**给体积加 e2e 断言——字节阈值必然随布局时序抖动，做不到非 flaky。

**Files:** Modify `utils/converters/html-to-pdf.ts:50-52`、`scripts/e2e-test.mjs`

- [ ] **Step 1: 确认既有 PDF 断言不含字节阈值**

```bash
grep -n "pdf" scripts/e2e-test.mjs | grep -i "size\|KB\|MB" | head
```

期望：无按字节阈值断言 PDF 输出。若出现，停下——那是需要一起调的既有断言。

- [ ] **Step 2: 加产物质量断言（先让它红）**

在 e2e 的 HTML→PDF 场景 try 块内、最后一个 `ok()` 之后追加：

```js
      // The slice format is observable in the artifact: jsPDF writes the image XObject's Filter,
      // so a PNG slice says /FlateDecode and a JPEG slice says /DCTDecode.
      const pdfBytes = await downloadBatchArtifact(page);
      if (pdfBytes.includes('/FlateDecode') && !pdfBytes.includes('/DCTDecode')) {
        ok('PDF page slices are PNG (Flate), not JPEG (DCT)');
      } else {
        fail('PDF slice format', `Flate=${String(pdfBytes.includes('/FlateDecode'))} DCT=${String(pdfBytes.includes('/DCTDecode'))}`);
      }
```

```bash
pnpm build && E2E_ONLY="html to pdf" pnpm test:e2e 2>&1 | grep -A3 "PDF slice format"
```

期望：**FAIL**（`DCT=true`）。

- [ ] **Step 3: 改实现** — `utils/converters/html-to-pdf.ts:50-52` 替换为：

```ts
        // PNG, not JPEG. Two reasons, and the second is the one that reaches users:
        // (a) a document that goes on to an image target (MD→JPG routes md→html→pdf→jpg) was
        //     JPEG-compressed here and JPEG-compressed again at the encoder, a guaranteed
        //     generational loss; (b) text edges are exactly what JPEG's ringing artefact ruins,
        //     and every document→PDF output is mostly text. Flat white pages with glyph edges
        //     also deflate smaller than lossy DCT block noise, so the common case does not pay
        //     for this. Photo-heavy documents do grow — accepted, and disclosed in CHANGELOG.
        const pageImgData = pageCanvas.toDataURL('image/png');
        const pageImgHeightMm = (remainingH * imgWidth) / canvas.width;
        pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageImgHeightMm, undefined, 'FAST');
```

- [ ] **Step 4: 跑，确认绿**

```bash
pnpm build && E2E_ONLY="html to pdf" pnpm test:e2e 2>&1 | grep -A3 "PDF slice format"
```

期望：`✓ PDF page slices are PNG (Flate), not JPEG (DCT)`。

- [ ] **Step 5: 跑全部 PDF 场景 + 重测体积**

```bash
E2E_ONLY="pdf" pnpm test:e2e 2>&1 | tail -40 && pnpm package && ls -la .output/transfer-any-file-1.0.0-chrome.zip
```

期望：所有 PDF 场景绿（特别是「HTML→PDF 成功」与「MD→PDF 多步链」）。记下新 zip 字节数，与 Task 0.1 的 1,138,593 B 对比，写进 CHANGELOG。

- [ ] **Step 6: 提交**

```bash
git add utils/converters/html-to-pdf.ts scripts/e2e-test.mjs
git commit -m "fix(converters): html→pdf 页面切片从 JPEG 改为 PNG

两个后果，第二个才是给用户的：(a) 文档继续转图片时（MD→JPG 走 md→html→pdf→jpg）
在这里已经 JPEG 压过一次、到编码器又压一次，是必然的代际损失；(b) 文字边缘正是
JPEG 振铃伪影最伤的地方，而所有文档→PDF 的产物基本都是文字为主。
白底 + 字形边缘的切片 PNG deflate 后常比带损的 DCT 块噪声更小，常见情形不为此付代价。
图片密集的文档体积会上升，已在 CHANGELOG 说明。

产物层面可断言：jsPDF 按切片格式写 XObject 的 Filter，PNG 是 /FlateDecode、
JPEG 是 /DCTDecode，故断言直接读下载到的 PDF 字节。"
```

### Task 2.1c：路由偏好显式化（F-5b）

> **执行期实测记录（已完成于 `4074b82`，零漂移、221/221）**
>
> 1. **守卫是镜像，不是被测物——本计划最重要的方法论教训。** `check-path-snapshot.mjs` 的
>    `buildAdjacency` 自己重写了一遍 `register()`（push + 稳定 sort），所以真实
>    `registry.ts` 的插入循环若写成 `>=` 这类 off-by-one，`verify:paths` **照样打印 OK**。
>    实现者用 jiti 在 node 里加载**真实的** `registry.ts` 补测三条：
>    0-after-10 确实插到前面（`["webp","pdf","jpg"]`）、全 0 时与旧 `push()` 逐位相同、
>    真 `findConversionPath` 跑 182 对零差异且变异复现出与守卫**完全相同的 14 条翻转**。
>    **Task 3.1 给 `AGENTS.md` / rules 补 `verify:paths` 时必须写明这条限制**，
>    否则后来者会把「守卫绿」当成「registry 正确」的证据，而它两者都不是。
> 2. **第 15 对并列路由，本任务刻意未声明（挂账）**：`svg→pdf` 有四条等长 2 步路
>    （`svg>png>pdf` 今日赢家 / `svg>jpg>pdf` / `svg>webp>pdf` / `svg>html>pdf`），
>    胜者由 `utils/converters/svg-rasterize.ts:108-112` 的数组字面量顺序 + `index.ts:93` 决定。
>    今天赢的恰好是四种里语义最优的（无损 PNG 进 PDF、按图 sizing），属**脆弱性而非缺陷**。
>    **动到 svg 边的 Task 2.4 / 2.6 应顺手为这族声明 `edgePreference`。**
> 3. `edgePreference: 0` 对排序是字面 no-op，作用是把「这条边刻意在前」写成代码；
>    真正防回归的是 png 的 `10` 加快照。
> 4. **完成判据里的 `216/216` 已过期**：Task 1.1 与 2.1b 各加了节，现为 **221/221**。
> 5. Step 5 的 `git checkout` 复原指令确认可疑（会连 2.1b 的切片改动一起撤回），
>    实际用「先 `git add` 目标态再变异、改回后 `git diff --exit-code` + sha256 双证」替代；
>    注意 `git diff --exit-code` 比的是索引，不先 stage 就恒为非 0、证明不了任何东西。

**Files:** Modify `utils/core/types.ts:116-120`、`utils/core/registry.ts:13-24`、`utils/converters/html-to-pdf.ts`、`utils/converters/html-to-png.ts`

- [ ] **Step 1: 加类型字段** — `utils/core/types.ts` 的 `Converter` 接口（`:116-120`）替换为：

```ts
// A single converter plugin interface
export interface Converter {
  from: FileFormat;
  to: FileFormat;
  /**
   * Tie-breaker among equal-length conversion routes, lower winning.
   *
   * `findConversionPath` is a BFS over an adjacency list and returns the FIRST shortest path, so
   * when two routes tie — `html→pdf→jpg` vs `html→png→jpg` — the winner was decided by which
   * `register()` call happened earlier in `initConverters()`. That made source-file order an
   * undeclared input to which artifact a user receives. This field makes the choice a property of
   * the edge. Absent means 0, i.e. "no declared preference", and ties among equals still fall back
   * to registration order — declared, not accidental.
   */
  edgePreference?: number;
  convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult>;
}
```

- [ ] **Step 2: 让 registry 按偏好稳定插入** — `utils/core/registry.ts` 的 `register()`（`:13-24`）替换为：

```ts
  register(converter: Converter): void {
    const key = this.makeKey(converter.from, converter.to);
    const targets = this.adjacency.get(converter.from);
    if (targets) {
      if (!targets.includes(converter.to)) {
        // Insert by declared preference, keeping equal preferences in registration order. The BFS
        // in findConversionPath iterates this array and returns the first shortest path it meets,
        // so this position IS the route choice for tied lengths.
        const preference = converter.edgePreference ?? 0;
        let insertAt = targets.length;
        for (let i = 0; i < targets.length; i++) {
          const other = this.getConverter(converter.from, targets[i]);
          if ((other?.edgePreference ?? 0) > preference) {
            insertAt = i;
            break;
          }
        }
        targets.splice(insertAt, 0, converter.to);
      }
    } else {
      this.adjacency.set(converter.from, [converter.to]);
    }
    this.converters.set(key, converter);
  }
```

- [ ] **Step 3: 声明 `html` 出边偏好** — `html-to-pdf.ts` 转换器对象里 `to: FileFormat.PDF,` 之后加：

```ts
    // Ties with html→png→<image> for any image target, and the tie is resolved here rather than by
    // registration order. Kept ahead of html→png deliberately: routing a document to an image
    // through PDF is a FEATURE — it is what gives you one A4 page per image, the useful answer for
    // a multi-page document. The alternative, html→png→jpg, hands back a single 800px-wide strip of
    // the whole document. The real defect on that path was the double JPEG encode, and that is
    // fixed at the source (PNG slices), not by re-pointing the route.
    edgePreference: 0,
```

`html-to-png.ts` 里 `to: FileFormat.PNG,` 之后加：

```ts
    // Explicitly behind html→pdf for tied image targets; see html-to-pdf.ts.
    edgePreference: 10,
```

- [ ] **Step 4: 跑守卫，确认零漂移**

```bash
node scripts/check-path-snapshot.mjs
```

期望：`path snapshot OK: 48 edges, 182 pairs`，**必须完全绿**。若出现任何 diff，说明 `edgePreference` 取值选错或解析器读偏好有问题——**停下修到零漂移**。这是「不改变产品语义、只去掉隐式依赖」的判据，不是可选步骤。

- [ ] **Step 5: 反向验证偏好在起作用**

把 `html-to-pdf.ts` 的 `edgePreference: 0` 临时改成 `100`，跑 `node scripts/check-path-snapshot.mjs; echo "exit=$?"`。期望 **FAIL**，`html→jpg`、`md→jpg` 等条目变红（路由改走 png 了）。然后 `git checkout utils/converters/html-to-pdf.ts` 后重跑回绿。**这一步证明偏好不是装饰。**

> 注意：Step 5 的 `git checkout` 会连 F-5a 的 PNG 改动一起撤回。改用 `git diff` 确认后再手工把 `edgePreference` 改回 `0`，或把本 Step 挪到 Step 6 之后用编辑而非 checkout 复原。

- [ ] **Step 6: 全量验证**

```bash
pnpm lint:all && pnpm build && pnpm test:e2e
```

期望：全绿。

- [ ] **Step 7: 提交**

```bash
git add utils/core/types.ts utils/core/registry.ts utils/converters/html-to-pdf.ts utils/converters/html-to-png.ts
git commit -m "refactor(core): 等长路由的偏好从注册顺序改为边上声明

findConversionPath 是按注册顺序遍历邻接表的 BFS 且返回第一条最短路径，
所以 html→pdf→jpg 与 html→png→jpg 谁赢，取决于 index.ts 里两个 register() 的先后——
源文件顺序成了「用户拿到什么产物」的隐式输入。今天没人写错，下次加一条 html→* 边
就会静默改变所有图片目标的路由。

Converter.edgePreference 把这件事变成边的属性。取值刻意使现有路由零漂移
（verify:paths 的 182 对全部一致），即只去掉隐式依赖、不改产品语义；
已反向验证把偏好改成 100 会让守卫变红，说明它不是装饰。

html→pdf 保持在 html→png 之前是有意的：文档转图片走 PDF 才给「每页一张 A4 图」，
走 png 是整篇一张 800px 宽的细长条。那条路上真正的缺陷是二次 JPEG 编码，
已在切片处修掉，不靠改路由绕过。"
```

### Task 2.2：`csv→xlsx` 值保真（F-6）

**Files:** Modify `utils/converters/csv-to-xlsx.ts`、`scripts/make-fixtures.cjs`、`scripts/e2e-test.mjs`

- [ ] **Step 1: 先实测 `csv_to_sheet` 的 `raw` 到底做什么**（规格标了「实现前必须实测」）

创建临时探针 `scripts/.probe-csv-typing.mjs`：

```js
import * as XLSX from 'xlsx';
const csv = 'zip,acct,note,dt,days\n00424,12345678901234567890,=1+1,2024-01-05,1/2\n1234.5,42,ok,1.50,1e5';
for (const opts of [{}, { raw: true }, { raw: false }]) {
  const ws = XLSX.utils.csv_to_sheet(csv, opts);
  const row = ['A2', 'B2', 'C2', 'D2', 'E2', 'A3', 'B3', 'C3', 'D3', 'E3']
    .map(ref => `${ref}=${ws[ref]?.t}:${JSON.stringify(ws[ref]?.v)}`)
    .join('  ');
  console.log(JSON.stringify(opts), '->', row);
}
```

```bash
node scripts/.probe-csv-typing.mjs
```

**决策规则**（把实测输出原样贴进 Step 6 的提交信息）：

- 若 `{raw:true}` 那行所有格都是 `t:'s'` → 采用 `csv_to_sheet(text, { raw: true })`，进 Step 3。
- 若三行完全相同（`raw` 对该函数无效）→ 改用 Step 3 末尾的**手工切分变体**。
- 若 `{raw:true}` 反而更积极转类型 → 同上，用手工切分变体。

```bash
rm scripts/.probe-csv-typing.mjs
```

- [ ] **Step 2: 加夹具**

`scripts/make-fixtures.cjs` 的 `main()` 内加：

```js
  // F-6 fixture: every column is one SheetJS used to destroy. `00424` and `12345678901234567890`
  // are the leading-zero and precision cases, `=1+1` the formula re-arm, `2024-01-05` / `1/2`
  // the date-inference pair, and `1234.5` the control that SHOULD still be a number.
  fs.writeFileSync(
    path.join(outDir, 'sample-typing.csv'),
    'zip,acct,note,dt,fraction,amount\n00424,12345678901234567890,=1+1,2024-01-05,1/2,1234.5\n',
  );
```

```bash
node scripts/make-fixtures.cjs && cat fixtures/sample-typing.csv
```

- [ ] **Step 3: 写实现** — `utils/converters/csv-to-xlsx.ts` 整体替换为：

```ts
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { guardCsvValue } from '~/utils/core/csv-guard';

/**
 * A numeric string survives the round trip only if parsing and re-printing returns the exact same
 * characters. That single test is what keeps `00424` (→ `424`), `1.50` (→ `1.5`), `1e5`
 * (→ `100000`) and any 20-digit account (→ `1.23457E+19`) as text, without a pile of special
 * cases — they all fail to reproduce themselves.
 */
function isExactNumber(value: string): boolean {
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) return false;
  const n = Number(value);
  return Number.isFinite(n) && String(n) === value;
}

/**
 * CSV → XLSX without re-typing the data.
 *
 * The previous implementation was `XLSX.read(text, {type:'string'})` straight into `write`, which
 * hands every field to SheetJS's type inferrer. Measured on `00424,12345678901234567890,=1+1,
 * 2024-01-05,1/2`: leading zeros dropped, a 20-digit account widened to `12345678901234567000`,
 * `=1+1` emitted as a LIVE FORMULA (`<c><f>1+1</f></c>`) that Excel computes on open, the date
 * replaced by `45296.33383`, and `1/2` turned into 2001-01-02. Every one of those destroys a column
 * the user cared about — zip, IBAN, account number, DOB — and the formula is precisely the vector
 * csv-guard exists to stop, re-armed on the way out.
 *
 * Date-like strings are never guessed. A text cell with `z:'@'` also stops Excel re-inferring on
 * open, which would otherwise undo the whole exercise.
 */
const csvToXlsxConverter: Converter = {
  from: FileFormat.CSV,
  to: FileFormat.XLSX,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, text] = await Promise.all([import('xlsx'), decodeTextBlob(input, 'errors.csvDecode')]);
    if (!text.trim()) {
      throw new Error('errors.csvDecode');
    }

    // Probe-verified in the commit history that raw:true keeps every parsed field a string cell.
    const sheet = XLSX.utils.csv_to_sheet(text, { raw: true });
    const workbook = XLSX.utils.book_append_sheet(XLSX.utils.book_new(), sheet, 'Sheet1');

    for (const key of Object.keys(sheet)) {
      if (key.startsWith('!')) continue;
      const cell = sheet[key];
      if (!cell || cell.t !== 's' || typeof cell.v !== 'string') continue;
      const safe = guardCsvValue(cell.v);
      if (safe !== cell.v) {
        cell.v = safe;
      } else if (isExactNumber(cell.v)) {
        cell.t = 'n';
        cell.v = Number(cell.v);
        continue;
      }
      cell.z = '@';
    }

    // Pin every remaining text cell, including ones the loop above skipped for a missing `v`.
    const range = sheet['!ref'];
    if (range) {
      const ref = XLSX.utils.decode_range(range);
      for (let r = ref.s.r; r <= ref.e.r; r++) {
        for (let c = ref.s.c; c <= ref.e.c; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c })];
          if (cell && cell.t === 's') cell.z = '@';
        }
      }
    }

    const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return { blob, filename: 'converted.xlsx' };
  },
};

export default csvToXlsxConverter;
```

**手工切分变体**（仅当 Step 1 判定 `raw` 不可靠时）：把 `csv_to_sheet` 那行换成
`const sheet = XLSX.utils.aoa_to_sheet(rows);`，其中 `rows` 是把 CSV 按 RFC 4180 切成
`string[][]`（引号内的逗号与换行不切）的结果；`aoa_to_sheet` 对全字符串数组产出 `t:'s'` 单元格。
其余循环与断言不变。

- [ ] **Step 4: 写断言**

```js
  // ═══════════════════════════════════════════
  //  F-6 — CSV→XLSX must not re-type the data
  // ═══════════════════════════════════════════

  if (section('CSV Typing Fidelity')) {
    try {
      const result = await convertFile(page, 'sample-typing.csv', 'Excel (.xlsx)');
      if (!result.alertTitle.includes('完成')) throw new Error(`conversion failed: ${result.alertTitle}`);
      const xlsxText = await downloadBatchArtifact(page);

      const checks = [
        ['leading zeros kept', xlsxText.includes('00424')],
        ['20-digit account intact', xlsxText.includes('12345678901234567890')],
        ['formula neutralized', xlsxText.includes("'=1+1")],
        ['date kept as text', xlsxText.includes('2024-01-05')],
        ['fraction kept as text', xlsxText.includes('1/2')],
        ['real number still numeric', xlsxText.includes('1234.5')],
      ];
      const broken = checks.filter(([, pass]) => !pass).map(([name]) => name);
      if (broken.length === 0) ok('CSV→XLSX preserves zip / account / date / fraction and still numbers 1234.5');
      else fail('CSV typing fidelity', broken.join('; '));

      if (!xlsxText.includes('<f>')) {
        ok('No live formula emitted');
      } else {
        fail('CSV formula re-arm', 'the xlsx contains an <f> element');
      }
    } catch (e) {
      fail('CSV Typing Fidelity', e.message);
    }
  }
```

- [ ] **Step 5: 跑，确认绿**

```bash
pnpm build && E2E_ONLY="csv typing" pnpm test:e2e 2>&1 | grep -A6 "CSV Typing Fidelity"
```

期望：两条 `ok`。若 `leading zeros kept` 失败而其余过，说明 `z:'@'` 没落到该格，检查 Step 3 的 `!ref` 遍历。

- [ ] **Step 6: 提交**

```bash
git add utils/converters/csv-to-xlsx.ts scripts/make-fixtures.cjs scripts/e2e-test.mjs
git commit -m "fix(converters): csv→xlsx 不再让 SheetJS 推断类型，顺带堵住公式重新激活

原实现是 XLSX.read(text,{type:'string'}) 直接 write，等于把每个字段交给类型推断器。
实测一行 00424,12345678901234567890,=1+1,2024-01-05,1/2 的结果：前导零丢失、
20 位账号变 12345678901234567000、=1+1 变成 Excel 打开即算的活公式（正是 csv-guard
要防的东西在出口被重新武装）、日期变 45296.33383、1/2 变 2001-01-02。
邮编 / IBAN / 账号 / 生日这几列是这条路径唯一有意义的列，全被毁。

数字判定只有一条：解析再打印能否逐字符还原自己。00424 / 1.50 / 1e5 / 20 位账号
全部自然落网，不需要一堆特例。日期串一律不猜。文本单元格钉 z:'@'，
否则 Excel 打开时重新推断，前面这些白做。

csv_to_sheet 的 raw 语义实测输出见 Task 2.2 Step 1 的探针记录（三行 READ 输出原样粘在
本条 commit message 末尾，作为采用 csv_to_sheet 而非手工切分的依据）。"
```

### Task 2.3：`xlsx→csv/json` 值保真与公式策略（F-7）

**Files:** Modify `utils/converters/xlsx-to-csv.ts:30,38-42,51-55`、`utils/converters/xlsx-to-json.ts:10,17`、`utils/core/csv-guard.ts:19-36`

- [ ] **Step 1: 实测 `raw:true` + `cellDates:true` 下日期的输出形态**（规格标了必须实测）。临时探针 `scripts/.probe-xlsx-dates.mjs`：

```js
import * as XLSX from 'xlsx';
const wb = XLSX.utils.book_new();
const ws = { '!ref': 'A1:B1', A1: { t: 'd', v: new Date(2024, 0, 5) }, B1: { t: 'd', v: new Date(2024, 0, 5, 14, 30, 0) } };
XLSX.utils.book_append_sheet(wb, ws, 'S');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
for (const read of [{ type: 'buffer', cellDates: true }, { type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss' }]) {
  const s = XLSX.read(buf, read).Sheets.S;
  console.log('READ', JSON.stringify(read), 'types', s.A1.t, s.B1.t);
  console.log('  csv_raw ', JSON.stringify(XLSX.utils.sheet_to_csv(s, { raw: true })));
  console.log('  json_raw', JSON.stringify(XLSX.utils.sheet_to_json(s, { raw: true })));
}
```

```bash
node scripts/.probe-xlsx-dates.mjs && rm scripts/.probe-xlsx-dates.mjs
```

**决策规则**（目标：纯日期出 `2024-01-05`、带时间的出 `2024-01-05 14:30:00`）：某组合已正好给出该形态则采用那组选项、可省掉 Step 2 的 `sheetToValueCsv`；若纯日期被写成 `2024-01-05 00:00:00` 或被写成 `Fri Jan 05 2024 …` 则**必须**走 Step 2 的显式归一，不接受退化。实测结论原样写进 Step 8 的提交信息。

- [ ] **Step 2: 改 `xlsx-to-csv.ts` 的读取选项** — `:30` 替换为：

```ts
    // dateNF belongs on READ, not on sheet_to_csv: format_cell returns the cached display text
    // (`cell.w`) whenever it exists, and `w` is built during parsing — so the `dateNF` previously
    // passed to sheet_to_csv could never apply and dates arrived as `3/15/24`, US order, with the
    // time silently dropped. `raw:false` is not a read option at all; option normalization discards
    // it.
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss' });
```

在 `safeEntryName` 之后加两个局部函数（`formatIsoDate` 保证纯日期不带零时间，`sheetToValueCsv` 用 `raw:true` 出值而非出显示文本，并自行按 RFC 4180 加引号）：

```ts
/** `yyyy-mm-dd`, plus ` hh:mm:ss` only when the time is actually non-zero. */
function formatIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0
    ? date
    : `${date} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Emit values, not display text: `1,234.50` and `25.0%` are what a cell LOOKS like, and a CSV
 *  consumer wants the number. */
function sheetToValueCsv(XLSX: typeof import('xlsx'), sheet: import('xlsx').WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  return rows
    .map(cells =>
      cells
        .map(cell => {
          const text = cell instanceof Date ? formatIsoDate(cell) : String(cell);
          return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\n');
}
```

`:38-42` 与 `:51-55` 两处 `XLSX.utils.sheet_to_csv(guardFormulaCells(...), {...})` 分别改为 `sheetToValueCsv(XLSX, guardFormulaCells(workbook.Sheets[sheetNames[0]]))` 与 `sheetToValueCsv(XLSX, guardFormulaCells(workbook.Sheets[name]))`。

- [ ] **Step 3: 改 `xlsx-to-json.ts`** — `:10` → `const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss' });`；`:17` 的 `{ raw: false }` → `{ raw: true }`；并在 `rowsOf` 上方加：

```ts
    // raw:true so JSON carries real numbers and booleans. With raw:false every value came back as
    // SheetJS's display text — `1,234.50` and `25.0%` as strings, and not a single number in the
    // whole document, which defeats the point of converting to JSON.
```

- [ ] **Step 4: 改 `csv-guard.ts`** — `:19-36` 的 JSDoc 与函数替换为：

```ts
/**
 * Neutralize dangerous cells of a worksheet in place before serialization.
 *
 * Two distinct vectors, and the first pass only handled one of them:
 *
 * 1. A `t:'s'` cell whose text starts with `=`, `+`, `-`, `@`, TAB or CR is re-parsed as a formula
 *    by Excel on open. Prefixing an apostrophe makes Excel render it literally.
 * 2. A cell carrying `f` — a formula — which SheetJS hands through with `t:'n'` and no cached
 *    value. The previous version of this function skipped those *on the documented assumption that
 *    "formula-result cells are serialized from their typed values, not re-parsed as text by
 *    Excel"*. That assumption is the bug: `sheet_to_csv` copies the formula text straight out
 *    (`=HYPERLINK(...)` reappears in the CSV, re-arming vector 1 on the way out), while
 *    `sheet_to_json` and `sheet_to_html` drop the column entirely with no error. Files written by
 *    openpyxl, LibreOffice and pandas carry formulas without cached values, so this is not exotic.
 *
 * Formula cells are therefore downgraded to guarded text and their `f` removed. The stale cached
 * display text (`w`) is dropped in every branch so the emitted value is the guarded one.
 */
export function guardFormulaCells(sheet: WorkSheet): WorkSheet {
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue;
    const cell = sheet[key];
    if (!cell) continue;
    if (cell.f !== undefined) {
      cell.t = 's';
      cell.v = guardCsvValue(String(cell.v ?? ''));
      delete cell.f;
      delete cell.w;
      continue;
    }
    if (cell.t === 's' && typeof cell.v === 'string' && DANGEROUS_PREFIX.test(cell.v)) {
      cell.v = `'${cell.v}`;
      delete cell.w;
    }
  }
  return sheet;
}
```

- [ ] **Step 5: HTML 侧明确不动** — `utils/converters/data-to-html.ts` 与 `utils/core/preview.ts` 的 `sheet_to_html` **不加 `raw`**。HTML 是给人看的，`1,234.50` 与 `25.0%` 是正确输出。跑 `grep -n "sheet_to_html" utils/converters/data-to-html.ts utils/core/preview.ts` 确认两处均未改动即可，无需提交。

- [ ] **Step 6: 加夹具** — `make-fixtures.cjs` 的 `main()` 内加（复用文件已 import 的 `XLSX`）：

```js
  // F-7 fixture: a workbook whose cells are typed AND formatted, so the display-text-vs-value
  // difference is visible, plus a formula with no cached value (what openpyxl/LibreOffice emit).
  {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['amount', 'ratio', 'date', 'datetime', 'flag'],
      [1234.5, 0.25, new Date(2024, 0, 5), new Date(2024, 0, 5, 14, 30), true],
    ]);
    ws['A2'].z = '#,##0.00';
    ws['C2'].z = 'yyyy-mm-dd';
    ws['D2'].z = 'yyyy-mm-dd hh:mm:ss';
    ws.F2 = { t: 'n', f: 'A2*2' };
    ws['!ref'] = 'A1:F2';
    XLSX.utils.book_append_sheet(wb, ws, 'Money');
    fs.writeFileSync(path.join(outDir, 'sample-typed.xlsx'), XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
```

- [ ] **Step 7: 写断言**

```js
  // ═══════════════════════════════════════════
  //  F-7 — XLSX→CSV/JSON emit values, and formulas never survive as formulas
  // ═══════════════════════════════════════════

  if (section('XLSX Value Fidelity')) {
    try {
      const csvRun = await convertFile(page, 'sample-typed.xlsx', 'CSV (.csv)');
      if (!csvRun.alertTitle.includes('完成')) throw new Error(`csv failed: ${csvRun.alertTitle}`);
      const csv = await downloadBatchArtifact(page);
      const csvChecks = [
        ['amount is the value not the display text', csv.includes('1234.5') && !csv.includes('1,234.50')],
        ['ratio is 0.25 not 25.0%', csv.includes('0.25') && !csv.includes('25.0%')],
        ['plain date has no zero time', csv.includes('2024-01-05') && !csv.includes('2024-01-05 00:00:00')],
        ['datetime keeps its time', csv.includes('2024-01-05 14:30:00')],
        ['formula downgraded to guarded text', csv.includes("'A2*2") || csv.includes("'=A2*2")],
      ];
      const csvBroken = csvChecks.filter(([, p]) => !p).map(([n]) => n);
      if (csvBroken.length === 0) ok('XLSX→CSV emits values with ISO dates and neutralizes the formula');
      else fail('XLSX→CSV values', csvBroken.join('; '));

      await resetWorkbench(page);
      const jsonRun = await convertFile(page, 'sample-typed.xlsx', 'JSON (.json)');
      if (!jsonRun.alertTitle.includes('完成')) throw new Error(`json failed: ${jsonRun.alertTitle}`);
      const json = await downloadBatchArtifact(page);
      if (/"amount":\s*1234\.5/.test(json)) ok('XLSX→JSON emits a real number, not "1,234.50"');
      else fail('XLSX→JSON numeric', `no unquoted amount in: ${json.slice(0, 200)}`);
      if (!json.includes('"1,234.50"')) ok('No display-text numbers left in the JSON');
      else fail('XLSX→JSON display text', 'still quoting the formatted value');
    } catch (e) {
      fail('XLSX Value Fidelity', e.message);
    }
  }
```

- [ ] **Step 8: 跑，确认绿 + 既有场景未破**

```bash
pnpm build && E2E_ONLY="xlsx value fidelity" pnpm test:e2e 2>&1 | grep -A10 "XLSX Value Fidelity"
E2E_ONLY="csv,json,xlsx" pnpm test:e2e 2>&1 | tail -30
```

期望：五条 csv 断言 + 两条 json 断言全过；既有 CSV/JSON/XLSX 场景仍绿。

- [ ] **Step 9: 提交**

```bash
git add utils/converters/xlsx-to-csv.ts utils/converters/xlsx-to-json.ts utils/core/csv-guard.ts scripts/make-fixtures.cjs scripts/e2e-test.mjs
git commit -m "fix(converters): xlsx→csv/json 输出值而非显示文本，公式单元格三处策略统一

format_cell 只要 cell.w 存在就返回读取期算好的显示文本，所以 sheet_to_csv 上传
dateNF 永远不生效（它是读取期选项）、raw:false 也不是合法读取选项被归一化丢弃；
结果是 1234.5 变成带引号的 1,234.50、日期时间变 3/15/24 且时间静默丢失、
JSON 里一个数字都没有。

guardFormulaCells 只处理 t:'s'，而 SheetJS 把公式单元格以 t:'n' + f 透传：
sheet_to_csv 把公式文本原样抄进 CSV（防护函数本身成了把公式复制出去的通道）、
sheet_to_json 整列凭空消失且不报错、sheet_to_html 输出空 td。
openpyxl / LibreOffice / pandas 写出的文件天然带无缓存值的公式。

其 JSDoc 把「formula-result cells 不会被 Excel 重新解析」写成前提，而这正是漏洞成因，
一并改写。日期双形态实测输出见 Task 2.3 Step 1 记录。"
```

### Task 2.4：抽出 SVG 尺寸推导（F-8 的前置重构）

**Files:** Create `utils/core/svg-raster-common.ts`；Modify `utils/converters/svg-rasterize.ts:13-53,77-83`

- [ ] **Step 1: 建共享模块** — 创建 `utils/core/svg-raster-common.ts`，导出三个函数：

```ts
import { MAX_DIM } from '~/utils/core/image-utils';

const DEFAULT_DIM = 1024;

/**
 * Remove scripts and event handler attributes from an SVG element.
 *
 * Defense in depth: `<img>` rendering already disables scripts, and DOMPurify's svg profile is the
 * primary gate. Both callers do it, so it lives here rather than being copied.
 */
export function stripSvgActiveContent(svg: Element): void {
  svg.querySelectorAll('script').forEach(el => el.remove());
  svg.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    }
  });
}
```

- [ ] **Step 2: 同文件追加尺寸推导**（从 `svg-rasterize.ts:13-53` 迁入，改为接受**已净化的字符串**）：

```ts
/**
 * Normalize an already-sanitized SVG document for rasterization: give the root element explicit
 * pixel dimensions so `<img>` reports a usable intrinsic size.
 *
 * Split out of `svg-rasterize.ts` so the DOCX boundary (`svg-embed`) rasterizes an inline `<svg>`
 * with the same size rules instead of copying them. Sanitization is the CALLER's job and happens
 * first — this assumes the markup already went through a DOMPurify svg profile.
 */
export function normalizeSvgForRaster(svgText: string): { serialized: string; width: number; height: number } {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('errors.imageDecode');
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') throw new Error('errors.imageDecode');

  // Relative units carry no meaning for a raster canvas, but `parseFloat` would happily read
  // "100%" as 100 and "20em" as 20 — anything that is not a plain number or px length counts as
  // missing and falls back to the viewBox (or the default square).
  const pixelAttr = (name: string): number => {
    const raw = svg.getAttribute(name)?.trim() ?? '';
    return /^\d+(?:\.\d+)?(?:px)?$/i.test(raw) ? parseFloat(raw) : NaN;
  };
  let width = pixelAttr('width');
  let height = pixelAttr('height');
  const viewBox = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!Number.isFinite(width) || width <= 0) width = viewBox && viewBox[2] > 0 ? viewBox[2] : DEFAULT_DIM;
  if (!Number.isFinite(height) || height <= 0) height = viewBox && viewBox[3] > 0 ? viewBox[3] : DEFAULT_DIM;
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  return { serialized: new XMLSerializer().serializeToString(svg), width, height };
}

/** Scale to fit `MAX_DIM` on the longest edge; never upscales. */
export function fitToMaxDim(w: number, h: number): { w: number; h: number } {
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  }
  return { w, h };
}
```

- [ ] **Step 3: 让 `svg-rasterize.ts` 复用** — import 块加：

```ts
import { normalizeSvgForRaster, stripSvgActiveContent, fitToMaxDim } from '~/utils/core/svg-raster-common';
```

删掉本地 `DEFAULT_DIM` 常量与不再需要的 `MAX_DIM` 直接引入（`loadImage` / `encodeCanvas` / `releaseCanvas` 保留）。`:13-53` 的 `prepareSvg` 替换为：

```ts
async function prepareSvg(input: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const { default: DOMPurify } = await import('dompurify');
  const text = await decodeTextBlobLenient(input);
  const clean = DOMPurify.sanitize(text, { USE_PROFILES: { svg: true, svgFilters: true } }) as string;
  const parsed = new DOMParser().parseFromString(clean, 'image/svg+xml');
  if (parsed.documentElement?.tagName.toLowerCase() === 'svg') stripSvgActiveContent(parsed.documentElement);
  const { serialized, width, height } = normalizeSvgForRaster(new XMLSerializer().serializeToString(parsed));
  return { blob: new Blob([serialized], { type: 'image/svg+xml' }), width, height };
}
```

- [ ] **Step 4: 用 `fitToMaxDim` 收尺寸** — `createSvgRasterConverter` 里的 `:77-83`（`let w = ...` 到 `h = Math.round(h * scale);` 那一段）替换为：

```ts
      const { w, h } = fitToMaxDim(img.naturalWidth || width, img.naturalHeight || height);
```

- [ ] **Step 5: 验证行为未变**

```bash
pnpm lint:all && pnpm build && E2E_ONLY="svg" pnpm test:e2e 2>&1 | tail -25
```

期望：既有 SVG→PNG/JPG/WEBP 场景全绿，产物尺寸与改动前一致。

- [ ] **Step 6: 提交**

```bash
git add utils/core/svg-raster-common.ts utils/converters/svg-rasterize.ts
git commit -m "refactor(converters): SVG 尺寸推导抽为共享模块，为 DOCX 边界铺路

svg-rasterize 的 viewBox 回落、相对单位拒读、MAX_DIM 缩放这三段规则，DOCX 边界栅格化
内联 <svg> 时需要同样的行为；抽出来而不是复制。prepareSvg 顺带从「接受 Blob」改成
「净化后交给共享函数」，让两个调用方都能复用。

纯重构，既有 SVG→图片的尺寸与产物断言逐条不变。"
```

### Task 2.5：`md-to-html` 放开 SVG 白名单（F-9，必须先于 F-8）

**Files:** Modify `utils/converters/md-to-html.ts:22-25`、`scripts/make-fixtures.cjs`、`scripts/e2e-test.mjs`

- [ ] **Step 1: 加夹具（含恶意样本）** — `make-fixtures.cjs` 的 `main()` 内加：

```js
  // F-9 fixture: an inline <svg> diagram in markdown. The html-only DOMPurify profile used to
  // delete the whole graphic at this step, so every downstream target (docx, png, and the html
  // file itself) silently lost it. The second file is the same shape carrying an attack payload —
  // widening the profile must keep the graphic and drop the active content.
  fs.writeFileSync(
    path.join(outDir, 'sample-svg-diagram.md'),
    '# Diagram\n\n<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30">\n  <rect width="40" height="30" fill="#f00"/>\n  <text x="2" y="15">hi</text>\n</svg>\n\nAfter.\n',
  );
  fs.writeFileSync(
    path.join(outDir, 'sample-svg-attack.md'),
    '# Evil\n\n<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">\n  <script>alert(1)</script>\n  <foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(2)"/></body></foreignObject>\n  <rect width="10" height="10" fill="#0f0"/>\n</svg>\n',
  );
```

```bash
node scripts/make-fixtures.cjs && ls -la fixtures/sample-svg-*.md
```

- [ ] **Step 2: 写会失败的断言**

```js
  // ═══════════════════════════════════════════
  //  F-9 — markdown inline SVG must survive md→html, and its active content must not
  // ═══════════════════════════════════════════

  if (section('Markdown Inline SVG')) {
    try {
      const r = await convertFile(page, 'sample-svg-diagram.md', 'HTML (.html)');
      if (!r.alertTitle.includes('完成')) throw new Error(`failed: ${r.alertTitle}`);
      const html = await downloadBatchArtifact(page);
      if (html.includes('<svg') && html.includes('<rect')) {
        ok('Inline <svg> survives md→html');
      } else {
        fail('md→html svg survival', 'the svg graphic was deleted by the sanitize profile');
      }

      await resetWorkbench(page);
      const a = await convertFile(page, 'sample-svg-attack.md', 'HTML (.html)');
      if (!a.alertTitle.includes('完成')) throw new Error(`attack failed: ${a.alertTitle}`);
      const attackHtml = (await downloadBatchArtifact(page)).toLowerCase();
      const leftovers = ['<script', 'foreignobject', 'onerror'].filter(m => attackHtml.includes(m));
      if (leftovers.length === 0 && attackHtml.includes('<rect')) {
        ok('svg profile keeps the graphic and drops script / foreignObject / on* handlers');
      } else {
        fail('md→html svg sanitization', `leftovers=${leftovers.join(',')} rect=${String(attackHtml.includes('<rect'))}`);
      }
    } catch (e) {
      fail('Markdown Inline SVG', e.message);
    }
  }
```

- [ ] **Step 3: 跑，确认第一条红**

```bash
pnpm build && E2E_ONLY="markdown inline svg" pnpm test:e2e 2>&1 | grep -A6 "md→html svg survival"
```

期望：**FAIL** — `the svg graphic was deleted by the sanitize profile`。

- [ ] **Step 4: 改 profile** — `utils/converters/md-to-html.ts:22-25` 替换为：

```ts
    // The svg profiles are here because an inline <svg> diagram in markdown IS the content, and
    // with an html-only profile DOMPurify deleted the entire graphic — so md→html, md→docx and
    // md→png all silently lost it. This is not a new trust decision: svg-to-html.ts already runs
    // the same { svg, svgFilters } pair over user-uploaded SVG files, and the svg profile carries
    // its own deny list (script, set, animate, foreignObject, use), with on* attributes stripped
    // by DOMPurify's defaults. Same boundary, same profile — the two were simply inconsistent.
    const htmlBody = DOMPurify.sanitize(await marked(markdown), {
      USE_PROFILES: { html: true, svg: true, svgFilters: true },
      ADD_ATTR: ['target'],
    });
```

- [ ] **Step 5: 跑，确认两条都绿**

```bash
pnpm build && E2E_ONLY="markdown inline svg" pnpm test:e2e 2>&1 | grep -A6 "Markdown Inline SVG"
```

期望：两条 `ok`。**第二条是安全断言，不许跳过**——它证明放开白名单没有把 `<script>` 和 `<foreignObject>` 一起放进来。

- [ ] **Step 6: 全量回归**

```bash
pnpm lint:all && pnpm build && pnpm test:e2e
```

期望：全绿。

- [ ] **Step 7: 提交**

```bash
git add utils/converters/md-to-html.ts scripts/make-fixtures.cjs scripts/e2e-test.mjs
git commit -m "fix(converters): md→html 的净化 profile 放开 svg/svgFilters，内联图示不再整幅被删

USE_PROFILES:{html:true} 不含任何 svg 标签，Markdown 里的内联 <svg> 在上一步就被删干净，
md→html、md→docx、md→png 三条路都静默丢图。这也是 F-8 的前置：不在这里放开，
到了 html→docx 边界已经没有 <svg> 可栅格化。

不是新引入的信任决策——svg-to-html.ts 早就用同一对 profile 处理用户上传的不可信 SVG，
svg 档自带 svgDisallowed（script/set/animate/foreignObject/use），on* 由 DOMPurify 默认剥离。
两个边界此前只是不一致。

配一条恶意样本断言（<script> + <foreignObject> + onerror 经 md→html 后必须都不在、
而 <rect> 必须在），证明放开的是图形不是活动的内容。"
```

### Task 2.6：内联 SVG 栅格化进 DOCX（F-8）

**Files:** Create `utils/core/svg-embed.ts`；Modify `utils/converters/html-to-docx.ts`、`scripts/e2e-test.mjs`

- [ ] **Step 1: 写 `svg-embed.ts` 上半** — 创建 `utils/core/svg-embed.ts`：

```ts
import { normalizeSvgForRaster, stripSvgActiveContent, fitToMaxDim } from '~/utils/core/svg-raster-common';
import { loadImage, releaseCanvas } from '~/utils/core/image-utils';

/**
 * Rasterize one sanitized SVG markup string to a PNG data URL.
 *
 * `<img>` rendering does not execute scripts, but that is an argument about one renderer, not a
 * guarantee for the bytes we are about to write into someone's document — so the caller sanitizes
 * with the svg profile first (see `replaceInlineSvgWithPng`).
 */
async function rasterizeSvg(svgMarkup: string): Promise<string> {
  const { default: DOMPurify } = await import('dompurify');
  let clean = DOMPurify.sanitize(svgMarkup, { USE_PROFILES: { svg: true, svgFilters: true } }) as string;

  const parsed = new DOMParser().parseFromString(clean, 'image/svg+xml');
  if (parsed.documentElement?.tagName.toLowerCase() === 'svg') {
    stripSvgActiveContent(parsed.documentElement);
    clean = new XMLSerializer().serializeToString(parsed);
  }

  const { serialized, width, height } = normalizeSvgForRaster(clean);
  const objectUrl = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml' }));
  let img: HTMLImageElement;
  try {
    img = await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const { w, h } = fitToMaxDim(img.naturalWidth || width, img.naturalHeight || height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('errors.renderFailed');
    // White ground: a transparent SVG would otherwise composite against nothing in Word.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } finally {
    releaseCanvas(canvas);
  }
}
```

- [ ] **Step 2: `svg-embed.ts` 下半** — 同文件追加导出函数：

```ts
/**
 * Replace every inline `<svg>` in a document with a rasterized PNG `<img>`.
 *
 * Exists for one consumer: the DOCX boundary. `asBlob` packs our markup into an MHT altChunk that
 * Microsoft Word renders, and Word's HTML import does not draw inline SVG — so an SVG→DOCX or
 * md→DOCX batch reported success while handing the user a valid, blank .docx. A raster always
 * paints, at the cost of losing vector scaling, which is the accepted trade.
 */
export async function replaceInlineSvgWithPng(html: string): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const svgs = Array.from(doc.querySelectorAll('svg'));
  if (svgs.length === 0) return html;

  for (const node of svgs) {
    const markup = new XMLSerializer().serializeToString(node);
    let dataUrl: string;
    try {
      dataUrl = await rasterizeSvg(markup);
    } catch {
      // A single unpaintable diagram must not fail the whole document. Dropping it is what the
      // old behaviour did anyway; now at least the other images and all the text survive.
      node.remove();
      continue;
    }
    const imgEl = doc.createElement('img');
    imgEl.setAttribute('src', dataUrl);
    imgEl.setAttribute('alt', '');
    node.replaceWith(imgEl);
  }

  const doctype = /^\s*(<!doctype[^>]*>)/i.exec(html)?.[1] ?? '';
  return doctype + doc.documentElement.outerHTML;
}
```

- [ ] **Step 3: 接进 `html-to-docx.ts`** — import 块加 `import { replaceInlineSvgWithPng } from '~/utils/core/svg-embed';`，把 Task 1.1 之后那段 `const sanitized = stripRemoteResources(DOMPurify.sanitize(htmlString, {...}))` 整体替换为：

```ts
    // Order matters twice over. Inline SVG has to be rasterized BEFORE the sanitize step, because
    // USE_PROFILES:{html:true} contains no svg tag at all and would delete the graphic before
    // anything could paint it. And remote references have to be stripped AFTER, because Word — not
    // us — renders this markup on the user's machine.
    const withPngDiagrams = await replaceInlineSvgWithPng(htmlString);
    const sanitized = stripRemoteResources(
      DOMPurify.sanitize(withPngDiagrams, {
        WHOLE_DOCUMENT: true,
        USE_PROFILES: { html: true },
        ADD_TAGS: ['link', 'style', 'meta'],
        ADD_ATTR: ['target'],
      }) as string,
    );
```

- [ ] **Step 4: 写断言**

```js
  // ═══════════════════════════════════════════
  //  F-8 — inline SVG must actually paint inside a .docx (was: a valid blank file)
  // ═══════════════════════════════════════════

  if (section('DOCX Inline SVG')) {
    for (const [label, fixture] of [
      ['md→docx', 'sample-svg-diagram.md'],
      ['svg→docx', 'sample.svg'],
    ]) {
      try {
        await resetWorkbench(page);
        const r = await convertFile(page, fixture, 'Word (.docx)');
        if (!r.alertTitle.includes('完成')) throw new Error(`${label} failed: ${r.alertTitle}`);
        const docx = await downloadBatchArtifact(page);
        // 探针必须是**夹具唯一**的串，不能用通用 PNG 魔数 iVBORw0KGgo：本节会往同一个 docx 里
        // 内嵌一张 SVG 栅格出的 PNG，用通用头会在图被吃掉时仍然绿。
        if (docx.includes('AAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQ') && !docx.includes('<svg')) {
          ok(`${label} carries a rasterized PNG and no inline <svg> for Word to fail on`);
        } else {
          fail(`${label} inline svg`, `png=${String(docx.includes('data:image/png'))} svgLeft=${String(docx.includes('<svg'))}`);
        }
      } catch (e) {
        fail(`DOCX Inline SVG ${label}`, e.message);
      }
    }
  }
```

- [ ] **Step 5: 跑，确认绿**

```bash
pnpm build && E2E_ONLY="docx inline svg" pnpm test:e2e 2>&1 | grep -A6 "DOCX Inline SVG"
```

期望：两条 `ok`（`md→docx` 与 `svg→docx`）。

- [ ] **Step 6: 规格 §3 全清单**

```bash
pnpm lint:all && pnpm verify:meta && pnpm verify:offline && pnpm verify:listing && pnpm verify:paths && pnpm build && pnpm test:e2e
```

期望：全绿。

- [ ] **Step 7: 提交**

```bash
git add utils/core/svg-embed.ts utils/converters/html-to-docx.ts scripts/e2e-test.mjs
git commit -m "fix(converters): DOCX 边界把内联 SVG 栅格成 PNG，svg→docx 不再产出空白文件

svg→html 产出内联 <svg>（对浏览器是正确的），下一步 html→docx 用 USE_PROFILES:{html:true}
净化，而该 profile 不含任何 svg 标签——整幅图形在进 asBlob 之前就被删干净，
asBlob 照常返回一个合法的一页空白 .docx，批次报告成功。

选栅格而非 base64 SVG 内嵌：Word 对 MHT altChunk 里 data:image/svg+xml 的支持在本机无法验证
（没有 Word），而 svg-rasterize 的栅格能力是现成的，代价是 docx 内丢矢量。
每个 SVG 在栅格化前先过 svg profile——画布走 <img> 不执行脚本是关于一个渲染器的事实，
不是对我们即将写进用户文档的那段字节的保证。

单个图形栅格失败只丢该节点，不让整篇文档失败。"
```

## 阶段三 · 文档同步与收尾

### Task 3.1：CHANGELOG 双语对

- [ ] **Step 1: 写中文条目** — `CHANGELOG.md` 在 `## [Unreleased]`（或新建 `## [1.0.1]`）下覆盖：F-1 安全、F-2 披露、F-3 死链、F-4 守卫、F-5a PDF 质量与体积（含新 zip 字节数）、F-5b 无行为变化、F-6 CSV 类型保真（**含 Excel「以文本形式存储的数字」这个副作用**）、F-7 xlsx 值保真与公式、F-8/F-9 SVG。

- [ ] **Step 2: 写英文条目，与中文逐条对称** — `CHANGELOG.en.md` 同结构。中文是主文件、`.en.md` 是对照，**改一边必须同步另一边**。

- [ ] **Step 3: 确认 release 抽取仍可用**

```bash
grep -n "^## \[" CHANGELOG.md | head -3
```

期望：新版本号标题存在——`release.yml` 从中文主文件抽 `## [X.Y.Z]` 区块作为 GitHub Release 说明。

- [ ] **Step 4: 提交**

```bash
git add CHANGELOG.md CHANGELOG.en.md
git commit -m "docs(changelog): 记录隐私披露补全、CI 守卫落地与转换层数据保真修复"
```

### Task 3.2：交付说明

- [ ] **Step 1: 确认无法本机验证的三项已写明** —— ① Word 打开 docx 的实际渲染（本机无 Word，F-8 只能断言产物里有 PNG）；② `raw:true` 日期形态，以 Task 2.3 Step 1 实测为准；③ `csv_to_sheet` 的 `raw` 语义，以 Task 2.2 Step 1 实测为准。

- [ ] **Step 2: 汇总验证结果**

```bash
pnpm lint:all && pnpm verify:meta && pnpm verify:offline && pnpm verify:listing && pnpm verify:paths && pnpm build && pnpm package && pnpm test:e2e
ls -la .output/transfer-any-file-1.0.0-chrome.zip
```

逐条记录通过数与 zip 字节数（对比 Task 0.1 的 1,138,593 B 基线）。

- [ ] **Step 3: 自审全量 diff**

```bash
git diff "$(cat .git/P0_BASELINE_ANCHOR)..HEAD" --stat   # 若未存锚点，用 Task 0.1 Step 3 记下的 SHA
```

（Task 0.1 Step 3 执行时请顺手 `git rev-parse HEAD > .git/P0_BASELINE_ANCHOR`，本步骤与 Task 3.2 都读它。）

然后 `git diff "$(cat .git/P0_BASELINE_ANCHOR)..HEAD"` 通读一遍。

检查：无遗留调试 `console`（两个 `.probe-*.mjs` 必须已删）、无 `eslint-disable`、无无关格式化、`.qoder/specs` 与本计划未被误改。

## 完成判据

- 规格 F-1…F-9 全部落地，每项有对应提交与断言。
- 七条命令全绿：`lint:all` / `verify:meta` / `verify:offline` / `verify:listing` / `verify:paths` / `build` / `test:e2e`。
- `verify:paths` 的 182 对路径**零漂移**（F-5b 的语义不变量）。
- 权限仍只有 `storage`，且已用注入 `host_permissions` 的方式证明新守卫会红。
- 阶段一结束即可提交商店审核；阶段二不阻塞提交，但会改变 PDF 与 xlsx 产物，建议一并发版。

