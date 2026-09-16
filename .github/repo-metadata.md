# GitHub 仓库元数据 · Transfer Any File

> 仓库的 About 块（描述、网站、topics）与社交预览图。**事实源是
> [`.github/repo-metadata.json`](repo-metadata.json)**，由
> [`workflows/repo-meta.yml`](workflows/repo-meta.yml) 推送到 GitHub 上；本文件只解释每个值**为什么**这么写，
> 以及怎么落地。商店侧的文案与披露申报不在这里，见 [`CHROMEWEBSTORE.md`](../CHROMEWEBSTORE.md)。

## 当前状态：一个字段都还没落地

2026-09-15 用 `GET /repos/liaolongdong/transfer-any-file` 复核过：仓库存在（默认分支 `main`，license `ISC`
——API 反映的是**已推送**的 `LICENSE`，工作区那份已改成 MIT，所以 LICENSE 提交一落地这里就会读作 `MIT`），
但仍然报告 `description: null`、`homepage: null`、`topics: []`。

原因很具体：本机没装 `gh`，而工作流从未拿到过 `REPO_METADATA_TOKEN`。**不是**「配好了但没生效」。
下面[两条能走通的路径](#两条能走通的路径)任选一条即可，纯手工的路子是仓库的 **Settings → General → About** 区块。

## 仓库名

`transfer-any-file`

`README.md`、`README.en.md`、`docs/index.html`（含 JSON-LD 的 `codeRepository`）、`docs/privacy.html`
和本文件里已经写下的每一个链接都指向 `github.com/liaolongdong/transfer-any-file`，而且这个 slug 等于
`package.json#name`，也等于 manifest 的品牌名。**用别的名字建仓库会静默地把它们全部打断。**

## About 描述 —— 119 字符（GitHub 上限 350）

```
Offline file format converter for Chrome: 14 formats — Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. No uploads.
```

刻意用 `< 120` 字符：这样整串都能落进 Google 摘要的宽度里，不会被截成半句。

它以 `file format converter` 这个**精确短语**开头，这是有意为之——品牌名 slug 主动放弃了这部分关键词覆盖，
而 About 字段正是 GitHub 搜索与搜索引擎摘要读取它的地方。`14 formats` 与工作区页脚算出来的数是同一个
（`entrypoints/options/App.vue → formatCount`）；转换器集合一旦变动，**回到代码里重新取证**，不要沿用本文件。

`verify:listing` 会断言这条描述与商店简介**不是同一句话**（两者受众不同：一个给搜索引擎，一个给商店列表），
并把它按 350 的上限计量。

## Topics —— 20 个，按分组各占一条轴

GitHub 接受未收录的 topic 名，所以「没人搜」不是错误；这里用的是**满额的 20 个**，因此将来新增任何一个
都必须挤掉一个现有的。

| 分组   | Topics                                                                                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目的   | `file-format-converter`, `file-converter`, `file-conversion`, `document-conversion`, `markdown-converter`, `pdf-converter`, `image-conversion`, `xlsx`, `csv`, `batch-processing` |
| 价值   | `offline-first`, `local-first`, `privacy-first`, `privacy-tools`                                                                                                                  |
| 技术栈 | `chrome-extension`, `browser-extension`, `wxt`, `vue3`, `typescript`, `vite`                                                                                                      |

`file-format-converter` 与 `file-converter` **不冗余，两个都要留**。2026-09-07 实测：前者是个小 topic，
其列表页最高只有 340 星——这是一个零星仓库在第一天就能排到靠前位置的唯一入口；后者由 18.8k 星的 ConvertX
占据头部，真正的浏览流量在那里。

2026-09-11 改为用满预算：新增 `markdown-converter`、`xlsx`、`csv` 三个具体格式 topic，因为每一个都指向
「人们真的会搜、而本项目确实做」的转换；同时去掉 `format-conversion`，它与 `file-format-converter`、
`file-conversion` 重复却不贡献新短语。

## 社交预览图

**Settings → General → Social preview** → 上传 `docs/assets/store/github-social-preview.png`
（1280×640，由 `pnpm assets:capture` 生成）。

这是每一次链接被分享时渲染出来的那张图。它和 star 数不一样，**事后没法慢慢养出来**，所以值得在建仓库当天就传。
这个字段**没有任何 API**，只能在设置页传。

## 两条能走通的路径

优先第一条：它让 `.github/repo-metadata.json` 保持唯一事实源，并且任何改动该文件的 `main` 分支推送都会自动
重新应用一遍。

1. **工作流。** 添加仓库 secret `REPO_METADATA_TOKEN`（classic PAT 带 `repo` 作用域，或 fine-grained 且对
   本仓库授予 _Administration → Read and write_），然后到
   **Actions → Sync repository metadata → Run workflow**。没有别的要输入。
2. **一次性 `curl`。** 同一个 token 放进 `$PAT`。要调两次，因为 GitHub 把 About 和 topics 拆在两个端点上；
   而 `topics` 那次会**整表替换**，所以 20 个名字必须一次性全部发出去。

```bash
PAT='…'   # 只在当前这个 shell 里导出，绝不提交

curl -sS -X PATCH https://api.github.com/repos/liaolongdong/transfer-any-file \
  -H "Authorization: Bearer $PAT" -H "Accept: application/vnd.github+json" \
  -d '{"description":"Offline file format converter for Chrome: 14 formats — Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. No uploads.","homepage":"https://liaolongdong.github.io/transfer-any-file/"}'

curl -sS -X PUT https://api.github.com/repos/liaolongdong/transfer-any-file/topics \
  -H "Authorization: Bearer $PAT" -H "Accept: application/vnd.github+json" \
  -d '{"names":["file-format-converter","file-converter","file-conversion","document-conversion","markdown-converter","pdf-converter","image-conversion","xlsx","csv","batch-processing","offline-first","local-first","privacy-first","privacy-tools","chrome-extension","browser-extension","wxt","vue3","typescript","vite"]}'
```

> 为什么必须是 PAT 而不是内置 token：仓库元数据在 repository **administration** 作用域后面，而 administration
> 不在工作流能用 `GITHUB_TOKEN` 申请到的权限列表里——那个调用会返回 403
> `Resource not accessible by integration`。

## 验证是否生效

```bash
curl -sS https://api.github.com/repos/liaolongdong/transfer-any-file | grep -E '"(description|homepage)"'
```

不带凭证也可以，这些字段是公开的。topics 用
`curl -sS -H "Accept: application/vnd.github+json" https://api.github.com/repos/liaolongdong/transfer-any-file/topics`
看，或者直接在仓库首页的 About 侧栏里数。

## 改的时候连带改哪里

| 改动                           | 必须同步                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| About 描述 / homepage / topics | 只改 [`.github/repo-metadata.json`](repo-metadata.json)，然后跑 `pnpm verify:listing`（按 350 计量、检查 topics 数量与去重） |
| 描述里的格式数（`14 formats`） | 回代码取证的同一处：`App.vue → formatCount`，再同步 `README*`、`docs/*`、`CHROMEWEBSTORE.md`                                 |
| topic 列表                     | 本文件的分组表 + `repo-metadata.json`（`verify:meta` 比对 manifest ↔ `package.json` ↔ `repo-metadata.json`）                 |

## 相关文档

- [`CHROMEWEBSTORE.md`](../CHROMEWEBSTORE.md) —— Chrome 应用商店文案、权限与隐私申报、拒审口径
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) —— 贡献流程与全部编码规则
- [`AGENTS.md`](../AGENTS.md) —— 架构、命令与常见陷阱
