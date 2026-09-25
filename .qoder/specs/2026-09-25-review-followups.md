# 深度评审后续待办（2026-09-25 收口时留下）

> 八轮评审（`20ce72a` → `20d0964`）收口时，剩下这些项没做。分三组：需要产品决策、需要新证据、被别人占住。
> 每条都写清了落点与验证命令，动手前先看「阻塞」一栏。

## 状态快照（写这份清单的时刻）

- 分支 `feat/p0-data-integrity` 已推到 `20d0964`，领先 `origin/main` **99 笔**（未开 PR、未合主干）。
- 全量门禁口径：e2e **303/303**、八道守卫全 0、产物 **3,772,676 B / 68 文件**。
- 工作区另有约 39 项属**另一个并发会话**的在途工作（文件名模板、`utils/storage.ts`、i18n 字典、站点生成页、README/CHANGELOG）。下面标了「占住」的条目都卡在这。

---

## A. 需要产品决策才能动（改了就是可观察行为或数据格式）

### A1 历史导入的体积上限越过 Chrome 配额，失败静默

- **缺陷**：`composables/useHistory.ts` 的 `MAX_IMPORT_BYTES = 16 MB`，而 `chrome.storage.local` 配额是 10 MB；`utils/storage.ts:55` 的 `storageSet` 是 `Promise<void>` 且 `catch {}` 吞掉一切（含 `QUOTA_BYTES`）。结果：导入一个 12 MB 档案，界面提示成功、列表当场可见，**刷新后全空**。
- **两个方向，选一个**：① 把上限降到安全值（≤ 8 MB，留出现有记录与并发标签页的余量）；② 让 `storageSet` 返回成功/失败，导入侧据实报错（更正确，但改的是所有存储写入点的公共契约）。
- **落点**：`utils/storage.ts`（**占住**）、`composables/useHistory.ts`、`scripts/e2e-test.mjs:3604` 的 `const CAP = 16 * 1024 * 1024`（**占住**，它镜像这个常量，改一处不改它就是假绿灯）、`README*` / `CHANGELOG*` / `docs/*` 里提到导入阈值的句子（**占住**）。
- **验证**：`pnpm lint:all && pnpm test:e2e && pnpm verify:numbers`。

### A2 Ctrl+`+` 绑不上，且它不是解析 bug 而是格式冲突

- **缺陷**：`utils/core/shortcut.ts` 用 `'+'` 同时当**分隔符**（`split('+')`:77、`join('+')`:122/191）和**键名**，所以 `+` 这个键无法往返。
- **为什么没直接修**：任何修法都要改 `fat:shortcutMap` 的**序列化形状**，老用户存的绑定需要迁移或容错。属于规则 §11 的「改数据格式」。
- **落点**：`utils/core/shortcut.ts`（干净，我方可改）、`composables/useShortcuts.ts`、可能的迁移分支 + 中英文案。
- **验证**：`pnpm lint:all && pnpm test:e2e`（e2e 里有快捷键小节）。

### A3 ZIP 图片条目该不该压——旧实测记录已被推翻，方向反了

- **证据**：真路线上量，多页 PDF→PNG 导出的 12 张页 level 6 比 store 小 **39.3%**、共 118 ms；→JPEG 小 **58.6%**、共 60 ms。仓库里那句「图片只省 3%」量的是**高熵噪声页**，被误当成典型值。
- **结论**：该改的是**批量 ZIP**（把 `png`/`jpg` 收进 `utils/core/format.ts` 的 `ZIP_COMPRESSIBLE_EXT`），不是让转换器停压；`webp` **仍未量**。level 1 是中间档（37.0% / 62 ms），level 9 不值（39.6% / 432 ms）。
- **落点**：`utils/core/format.ts` + `composables/useConversion.ts`（**占住**）+ `README.en.md` 的「already-compressed targets are stored as-is」与 `CHANGELOG*` 的按条目那条（**全被占住**）。
- **验证**：`pnpm test:e2e && pnpm verify:numbers`，并补一次真产物字节测量写回 JSDoc（**样本形状必须写明**，否则又被下一个人外推）。

### A4 重命名可以绕过 `conversion-policy`

- **缺陷**：策略按**识别出的格式**判定，而识别是扩展名优先、MIME 兜底（`utils/core/file-detect.ts`）；把 `data.json` 改名成 `data.txt` 就换了一条路。
- **性质**：改它等于改产品语义（「文件名说的」与「内容是的」谁优先），不是 bug fix。**需要产品定调**。
- **落点**：`utils/core/conversion-policy.ts`、`utils/core/file-detect.ts`。

### A5 产物里的英文 `[Image: alt]` token

- **缺陷**：`utils/converters/text-formats.ts:67` 在 html→txt/CSV/JSON 输出里写死英文 `[Image: ...]` / `[Image]`，中文用户的产物里混英文。
- **两条路**：给转换器注入语言（`ctx` 里带 locale，避免 `utils → composables` 的分层违规），或接受它是**技术标记**不改。改了产物字节，属可观察行为。
- **落点**：`utils/converters/text-formats.ts`、`utils/i18n/*`（**占住**）、可能的新 i18n key。

### A6 趋势图对单条离群值没有防御（明确决定不做，留档）

- **现象**：`resultSize` 存成 `1e300` 会让 `HistoryTrendChart.vue:27` 的 `maxSize` 把其他所有柱压到零高度。
- **为什么不做**：只是难看、不崩；而且产品侧**没有任何文档化的字节上限**能当天花板，凭空写一个数字等于把假设写成断言。要做就先定 A1 的那个上限，两条共用同一个数。

---

## B. 需要补证据 / 补覆盖

### B1 轮次 1–2 的修复仍无 e2e 覆盖

- **缺什么**：CSV 类型推断改写数据（`20ce72a`）与远程代码判据补严（`3772903`）两类回归，现在只有守卫与人工验证兜着。
- **落点**：`scripts/e2e-test.mjs`（**占住**，对方 staged +186/−3）。
- **注意**：加断言会改**断言总数**，而它是对外契约——要同步 `scripts/__baseline__/e2e-assertions.json` 与 30 份散文，跑 `pnpm verify:numbers`。只有增删断言才需要同步，改实现不需要。

### B2 这批改动在 CI 上的结果还没核过

- 本机跑过 303/303，CI 的三条 job（lint / build / e2e）值得再看一眼，尤其 e2e 在无并发负载的机器上更干净。
- 本机**没有 `gh` CLI**，`git ls-remote` 也常常不返回；看 CI 要么开 Actions 页面，要么 `curl` + PAT。推送后核远端 ref 用：
  `curl -s --http1.1 --max-time 20 "https://github.com/liaolongdong/transfer-any-file.git/info/refs?service=git-upload-pack" | grep -a <branch>`

### B3 合主干 / 发版

- 99 笔未进 `main`；未发布意味着 Pages 上的 `/convert/` 落地页仍是 404、GitHub 曝光为 0（详见机会清单那份记录）。
- 版本号仍是 `1.0.0`，`CHANGELOG*` 与 `CHROMEWEBSTORE.md` 在对方手里。**发布动作一律由所有者执行**，核对点见 `.github/visibility-checklist.md`。

---

## C. 已知但优先级低（都是别人占着或需要设计）

| 项 | 落点 | 为什么先放着 |
| --- | --- | --- |
| `U+202A–202E` / 零宽字符穿过 `toLegalBase` | `utils/core/name-template.ts` | 对方本轮新增的文件，正在写 |
| 跨标签页 read-modify-write 竞态（无 last-write-wins） | `composables/useHistory.ts` 等所有 mutator | Wave D 老账，要设计合并策略 |
| `exportData` 没有 `await initPromise` | `composables/useHistory.ts` | 只关掉毫秒级竞态，且 `exportData` 是同步 API，改 async 涟漪进 `HistoryPanel.vue` |
| 非激活语言 i18n 字典懒加载 | `utils/i18n/*` | 拆词典会危及 `seedLocale` 那条语言 seed，动的是首帧文案来源 |
| `css-*.js` 78 KB 仍在首屏 preload 图 | `components/options/HistoryPanel.vue` 的常驻挂载 | 要减只能让筛选栏晚一帧出现＝可观察交互变化，§11 要先问 |

---

**口径提醒**：动手前先确认要改的文件不在上面那些「占住」的清单里；`git status` 里属于别人的暂存项一律不进自己的提交（用 pathspec 提）。任何新增可见文案必须中英同时给，改到对外文档里的数字要跑 `pnpm verify:numbers`。
