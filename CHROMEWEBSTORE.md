# Chrome 应用商店 · 提交与运营手册 — Transfer Any File

> **当前状态（2026-09-21）**：1.0.0 草稿提交过三次审核、**被拒三次**，但第三次换了一条政策。前两次（09-14 /
> 09-15）是同一违规类型、同一参考 ID（`垃圾内容和商店中的排名` / `Yellow Argon`），同一条政策：产品说明中有过多
> 关键字。第一次引用的是**简介**里的 `"Markdown, Word, PDF, Excel, CSV, JSON, HTML, images"`，于是简介、与它同形的
> `Chinese (China)` 简介、以及 marquee 推广图的副标题都改按品类表述。第二次引用的是**详细介绍**里 WHAT YOU CAN
> CONVERT 的三条 family bullet，于是剩下的那处枚举也去了——两次测量的完整对照见
> [拒审记录](#拒审记录与政策口径)。第三次（09-21）的违规类型是 `内容政策`，理由是 **Manifest V3 包里含远程托管
> 代码**，与文案无关：被扫出来的是两份第三方依赖里的死代码路径。按本文件自己 09-15 那条笔记的判据（「如果第三次
> 裁决落在一份**不带列表**的文案上，那时才轮到那个表单」），关键字那条模式这次可以判定为已走完——它没能再拦住我们，
> 而这次也没得申诉，因为被点名的代码确实在包里。
> 条目仍未上线：`manifest.json` 里没有 `key`，整个仓库里也找不到扩展 ID。listing 的**默认语言**自 2026-09-16 起
> 是中文（包里带 `_locales/zh_CN` 与 `_locales/en`），见[语言闸门](#语言闸门)。所以本文件是**可提交素材包 +
> 手工 runbook**，不是现网列表的镜像：把每个字段复制进 [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)，
> 并在权限、功能或图形变化时同步更新它。
>
> **2026-09-08 复核**：GitHub Pages **已上线**（`https://liaolongdong.github.io/transfer-any-file/` 与
> `/privacy.html` 都返回 `HTTP/2 200`），仓库 `liaolongdong/transfer-any-file` 也已存在——但它的 About 仍然是空的
> （`description: null`、`homepage: null`、`topics: []`），说明 `repo-meta.yml` 从未跑过。剩下要手工做的是商店账号
> 本身和那个 About 块（后者见 [`.github/repo-metadata.md`](.github/repo-metadata.md)）。

**怎么用这份文件**

- 要**填后台**：只看[提交速查](#提交速查)，按标签页顺序一次填完，过程中不需要做任何决定。
- 要**改文案**：看[商店文案](#商店文案)，每个字段下面写着为什么是这个值。
- 要**理解为什么不能那样写**：看[拒审记录](#拒审记录与政策口径)——那两次的政策口径决定了这份文件里许多看起来奇怪的取舍。
- **下面所有字符数都是实测值**，权威是 `pnpm verify:listing`：它把每个要粘贴的字段按其真实上限计量，并在本文件与
  `wxt.config.ts`、`package.json`、`.github/repo-metadata.json` 不一致时报错。改完任何粘贴字段都要重跑它。
  商店对超长字段是**静默截断**而不是拒绝提交，所以一个字段多写三个字符，就可能以半句话的形式上线。
- 中文粘贴块**已经有地方贴了**：包里带 `_locales/zh_CN/`，所以 `Chinese (China)` 是这份 listing 的默认语言，
  英文退为附加本地化——机制与代价见[语言闸门](#语言闸门)。

## 目录

- [提交速查](#提交速查) —— 按后台四个标签页排列，可直接照抄
- [商店文案](#商店文案) —— 逐字段：中文解说 + 中英粘贴块
  - [扩展名称](#扩展名称) —— 英文 / 中文
  - [简介](#简介) —— 英文 / 中文
  - [详细介绍](#详细介绍) —— 英文 / 中文
  - [类别与语言](#类别与语言)
- [图形与素材](#图形与素材) —— 图标、七张截图取五张、两张推广图
- [权限与隐私申报](#权限与隐私申报) —— `storage` 说明、数据处理表单、数据使用认证、隐私政策
- [分发与开发者信息](#分发与开发者信息)
- [首次上架（手工步骤）](#首次上架手工步骤) —— 为什么这步无法自动化，以及顺序
- [上架后的运营](#上架后的运营) —— 五个指标分别指向本文件的哪一份素材
- [审核要点](#审核要点) —— 已知限制与发布前检查清单
- [版本历史](#版本历史)
- [拒审记录与政策口径](#拒审记录与政策口径)
- [本文件的变更记录](#本文件的变更记录)
- [相关文档](#相关文档)

---

## 提交速查

按后台标签页顺序填完整张表。短字段逐字给出、可直接粘贴；长文案按小节引用，所以这里不会与被引用的文案漂移。

**开工前，仓库侧六项全过**（在动后台之前跑完，不是填到一半再跑）：

```bash
pnpm verify:listing   # 下面每个字段都在上限内，且与 _locales / manifest / package.json / repo-metadata 一致
pnpm build            # 产出要上传的包
pnpm verify:offline   # 第一方源码不发起网络请求，且上面产物的 manifest 权限仍只有 storage（缺产物即失败）
pnpm verify:remote-code # 产物里没有「从网络取来的代码」，见 09-21 那条拒审（同样缺产物即失败）
ls .output/chrome-mv3/_locales   # 必须同时有 en 与 zh_CN，否则后台只有一种语言可填
curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1   # 必须是 HTTP/2 200，否则提交按钮点了没反应
```

### Tab 1 — Store listing（商店页面）

| 字段                          | 英文取值                                                                                                    | 中文取值（默认语言标签页）                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 名称 Extension Name           | `Transfer Any File — Offline File Format Converter` (49/75)                                                 | `文件格式任意转换助手 — 离线转换无上传` (20/75)                                                                                        |
| 简介 Short description        | `Convert between 14 common document, spreadsheet and image file formats right in your browser...` (127/132) | `在本机浏览器内互转 14 种常见的文档、表格与图片格式。支持混合批量、多步链路、预览编辑与 ZIP 打包，全程离线，不上传、无账号。` (66/132) |
| 详描 Full description         | [英文详细介绍](#英文详细介绍) (8,581 字符)                                                                  | [中文详细介绍](#中文详细介绍) (3,039 字符)                                                                                             |
| 类别 Category                 | `Productivity`                                                                                              | `Productivity`                                                                                                                         |
| 主要语言 Primary Language     | -                                                                                                           | `Chinese (China)`                                                                                                                      |
| 附加语言 Additional Languages | `English (United States)`                                                                                   | -                                                                                                                                      |
| 产品页 Product page           | [https://liaolongdong.github.io/transfer-any-file/](https://liaolongdong.github.io/transfer-any-file/)      | [https://liaolongdong.github.io/transfer-any-file/](https://liaolongdong.github.io/transfer-any-file/)                                 |

```
Transfer Any File — Offline File Format Converter
```

```
Convert between 14 common document, spreadsheet and image file formats right in your browser — offline, in batches, no uploads.
```

**Chinese (China) —— 默认语言标签页，先贴这一套。** 三个字段（名称 20/75、简介 66/132、详描 3,039 字符）在
[商店文案](#商店文案)里；名称与简介同时活在 `public/_locales/zh_CN/messages.json`，`pnpm verify:listing` 逐字比对两边。
那个标签页要等**带 `_locales/zh_CN/` 的包上传之后**才出现——先传包再填表，手上那份旧草稿看不到它是正常的。

### Tab 2 — Screenshots & icon（截图与图标）

图标：`public/icon/128.png`。截图生成七张、后台只收五张，所以两张留在仓库里。按这个顺序从
`docs/assets/store/screens/` 上传：`screen-01-workbench`、`02-batch`、`03-zip`、`04-preview`、`07-presets`。
备胎是 `05-history` 与 `06-dark-mode`——这两项能力在 listing 文案里已经点名，而 `07-presets` 是唯一同时展示输出拨盘
（质量、最长边、目标体积、渲染密度）与那些把它们留住的预设芯片的一张，按「常见问题」的口径，这正是本 listing
能被搜到的最高意图。然后是[图形与素材](#图形与素材)里的两张推广图：**只用一套**，推广图不能本地化。
文案已经烧进 PNG，后台没有 caption 字段。

### Tab 3 — Privacy practices（隐私实践）

| 问题                             | 回答                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| Single purpose                   | 粘贴下方代码块（与[商店文案](#商店文案)里的「单一目的」逐字相同）  |
| 权限说明（`storage`）            | 粘贴下方代码块                                                     |
| Does this item handle user data? | **Yes** —— 先读[数据处理](#数据处理)，不要答「不收集任何用户数据」 |
| Privacy policy URL               | 下方代码块                                                         |
| Limited Use 认证                 | 四项，见[数据使用认证](#数据使用认证)                              |

深夜手填最容易打错的三个字段，逐字：

```
Converts user-selected documents, spreadsheets and images between common file formats entirely on the local machine.
```

```
storage: persists the user's own conversion history (file names, formats and sizes — never file contents), interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut, output file name pattern), image output options (longest edge, quality, target size, PDF render density) and conversion presets (the preset name the user types, together with the target format and output options it records) via chrome.storage.local. Nothing leaves the device: the extension declares no host permissions and its own code issues no network request. No narrower permission can do this.
```

```
https://liaolongdong.github.io/transfer-any-file/privacy.html
```

数据申报那里按实际情况勾选类型（用户文件；本地历史对应 app-activity 那一行），并在描述框里写：

```
Files are read into the extension page's memory, converted there, and returned to the user as a download. Conversion history and preferences are stored locally via chrome.storage.local. No data is transmitted, uploaded, synced or shared with anyone, including the developer; there is no server.
```

### Tab 4 — Distribution（分发）

Public · 全部地区 · 默认价格（free）。32 位 item ID 出现在这一页：**不要提交进 git**，放进
[交接给自动化](#5-交接给自动化条目已存在之后)里说的 `CHROME_EXTENSION_ID_TAF` secret。

### 给审核员的备注（可选，能省一个来回）

```
No account or login is required. After installing, click the toolbar icon: the converter opens as a tab. Test the round trip with any .md or .csv file — the result downloads locally. The extension works with networking disabled.
```

### 付 $5 之前必须先定的两件事

1. **listing 的默认语言。** 已经定了：`Chinese (China)` 为默认、`English (United States)` 为附加本地化，因为包里带
   `_locales/zh_CN`（`manifest.default_locale`）与 `_locales/en`。它是 manifest 决策而不是后台的一个开关，
   要改就得连 `verify:meta` / `verify:listing` 一起改——见[语言闸门](#语言闸门)。
2. **发布者名称。** [分发与开发者信息](#分发与开发者信息)把它留给你；它在 listing 上是公开的，而且必须是
   Google 账单上那个账号持有人或组织的名字。

---

## 商店文案

字段顺序与后台一致，`[必填]` 标的是 Google 的硬要求。粘贴块**逐字节保持原样**——它们是商品文案，不是这份文档的正文，
所以中英两份都留在这里、都会被贴进后台：中文贴默认的 `Chinese (China)` 标签页，英文贴 `English (United States)`。
其中四个名称 / 简介字段另由 `public/_locales/{zh_CN,en}/messages.json` 逐字承载，`pnpm verify:listing` 比对两边。

**扩展名称（Extension Name）** [必填] —— 49 字符，上限 75

```
Transfer Any File — Offline File Format Converter
```

> 2026-09-12 曾靠加 `& Image` 扩到 57 字符，**同一轮又退回 49**。三个测量决定了这次回撤，而第一个测量也正是
> 之前那条理由（「26 个字符的预算没花完」）站不住的原因：
>
> - **长度。** 这个类目里逐个量过的竞品 listing 全部落在 44 字符以内。所以 75 的上限不是一笔该花完的预算，
>   而是类目里没人接近的天花板；49 已经是搜索结果页上最长的那个名字。
> - **那个精确词拿不到。** `image converter` 属于用户量 100,000+ 的那批 listing。零安装阶段加一个排名无望的词
>   换不到任何东西，而图片这一族在被索引的位置已经点名三次：简介里的 `images`、详细介绍图片条目里的六个格式、
>   仓库 topics 里的 `image-conversion`。
> - **Google 对这个字段自己的说法**恰恰不是「预算要花满」：_"Shorter titles are easier to remember and stand out
>   in the store"_、_"Do not stuff the title with keywords"_。名称字段没有任何公开的排名权重，所以这一节以前那句
>   断言属于 folklore。
>
> 一个名词短语，不是列表——剩下的预算是故意留空的。枚举格式的变体（`…Converter for Word, PDF and Images`，
> 实测 74 字符）被考虑过并否掉：它正是关键词堆砌政策所描述的那种形状（那段政策同时警告符号与
> "feature lists or descriptions"，所以拼写出来的单词是折中方案里更安全的半边），而且它会在浏览器自身的扩展界面里
> 被截断。至于「把所有格式都列出来」，连选项都算不上——七类可转换性写全要 103 字符，超过 75 的字段本身。

> 2026-09-06 从 `File Any Transfer` 改名，两个理由：旧名字里既没有 conversion 也没有 format，搜这两个词都到不了它，
> 而这个类目的通用名（`File Converter`、`ConvertX`、`FileForge`、`FileConverter`）已被高安装量项目占住；并且
> `File Any Transfer` 对英文读者会先读成动词短语 "file any transfer"（≈ 提交一份转账申请），跟格式转换接不上。
> 调整词序保留了原来的每个单词。
>
> | 位置                                                                                       | 值                                                                                                                                                                                                                                                        |
> | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | 商店 listing / `_locales/en → extensionName`（manifest 以 `__MSG_extensionName__` 指向它） | `Transfer Any File — Offline File Format Converter`                                                                                                                                                                                                       |
> | 应用内品牌（`utils/i18n/*.ts → appName`）、标签页标题、推广图                              | `Transfer Any File`                                                                                                                                                                                                                                       |
> | GitHub 仓库                                                                                | `transfer-any-file`——与品牌、npm 包名、本 listing 一致，于是 CWS / GitHub / Pages / npm 收敛到**同一个实体**。仓库已在此账号下创建并推送，slug 因此固定；GitHub 搜索覆盖来自 About 描述 + topics，而不是 slug。本地工作目录名与仓库名无关，可以保持现状。 |

### 语言闸门

**闸门已经解决：包里带 `_locales/zh_CN`（`manifest.default_locale`）与 `_locales/en`，listing 的默认语言因此是 `Chinese (China)`。**

Google 只把 listing 本地化到**包**里声明过的 locale：_"Each locale corresponds to one of the
`_locales/LOCALE_CODE` directories included in the extension."_ 在这两个目录进包之前，后台的语言下拉里只有
`English (United States)` 一项，三个 `Chinese (China)` 字段无处可贴——因为那个扩展的中英切换是应用内的 Vue 状态
（`composables/useI18n.ts`），对 manifest 完全不可见。现在包内有两个 locale：

| 目录                                  | 角色                                     | 承载的后台文案                         |
| ------------------------------------- | ---------------------------------------- | -------------------------------------- |
| `public/_locales/zh_CN/messages.json` | `default_locale`，**listing 的默认语言** | 中文名称（20/75）与中文简介（66/132）  |
| `public/_locales/en/messages.json`    | 附加 locale                              | 英文名称（49/75）与英文简介（127/132） |

`public/` 是 WXT 的 `publicDir`，整目录原样落到扩展根，所以 `_locales/` 必须在 `public/` 下——它在扩展根的位置
是 Chrome 硬要求的，不是本项目的位置偏好。`wxt.config.ts` 的 `name` 与 `description` 于是不再是句子而是消息键
（`__MSG_extensionName__` / `__MSG_extensionDescription__`）：Chrome 按浏览器界面语言解析它们，解析不到就回落到
`zh_CN`。这带来两处后台之外的效果——中文系统用户在扩展管理页与安装提示里读到的是中文名，英文系统用户读到的仍是英文名；
而既非中文也非英文的界面语言会拿到中文回落值，那是 `default_locale` 的既定行为，不是缺陷。

**详细介绍不进包**：locale 文件只带名称与简介这两条 Chrome 自己会显示的字符串，两份详细介绍照旧只在[商店文案](#商店文案)里，
各自贴进对应语言的标签页。

后台读到哪个 locale 集合，取决于**最近一次上传的包**。手上那份 1.0.0 草稿上传于 `_locales/` 存在之前，所以
`Chinese (China)` 标签页要等新包上传之后才出现——先传包，再填表，顺序反了就会发现没地方贴。

同步由两条守卫守着：`pnpm verify:listing` 逐字比对两份 locale 文件与本文件的四个名称/简介粘贴块，并断言两个 locale 的
key 集一致、`default_locale` 仍是 `zh_CN`；`pnpm verify:meta` 比对 `_locales/en` 与 `package.json#description`。
改任何一处文案都要同时改另一处，否则 CI 直接变红。

推广图不受语言影响：_"Small promo tiles and marquee promo tiles cannot be localized."_ 一套英文推广图就是正确答案。

**中文名称（Chinese (China) extension name）** —— 28 字符，上限 75

```
文件格式任意转换助手 — 离线转换无上传
```

它就是默认 `Chinese (China)` 标签页的名称，同时也是 `__MSG_extensionName__` 在 `zh_CN` 下的取值——中文系统用户在
扩展管理页与安装提示里看到的正是这一行。**"任意转换"对应英文"Transfer Any File"**，比直译更自然；"助手"比"扩展"更亲和。
破折号后强调核心价值："离线转换无上传"，直接命中隐私敏感用户的最强需求。这个名字用了 20/75 字符，远低于类目天花板；
读起来是名词短语而非列表——与英文字段同一条形状规则。

**简介（Short Description）** [必填] —— 127 字符，上限 132

```
Convert between 14 common document, spreadsheet and image file formats right in your browser — offline, in batches, no uploads.
```

同一句话镜像在三处：本文件的粘贴块、`public/_locales/en/messages.json → extensionDescription` 与
`package.json → description`；`wxt.config.ts → manifest.description` 只用 `__MSG_extensionDescription__` 指向前者。
改就要一起改（`pnpm verify:meta` 与 `pnpm verify:listing` 都会查）。

这就是商店在 2026-09-14 拒掉的那个字段：_产品说明中有过多关键字_，引用的正是此前那句 129 字符里的
`"Markdown, Word, PDF, Excel, CSV, JSON, HTML, images"`。重写之后这个字段该做的事一件没少——动词开头、给出买家唯一会
比较的那个数字（`14`）、说明差异点——但改成按品类描述覆盖范围，不再点名格式。格式名最终确实离开了这次提交：
09-15 的第二次裁决从详细介绍里引用了同样的形状，于是两个 block 现在都按这个字段的写法来。还在承载这些名字的只剩
产品说明页与 GitHub About 块，两者都不是 listing 元数据。

两次拒审留下那条形状规则，也是 marquee 推广图副标题与 batch 截图 caption 跟着一起改的原因：
**任何 store 粘贴字段里都不许有冒号或逗号分隔的格式名列表，烧进 store 图片里的也不行。**
尾部那句 `offline, in batches, no uploads` 留着，因为它报告的是扩展真正执行的行为，而不是罗列买家可能去搜的东西。

**中文简介（Chinese (China) short description）** —— 66 字符，上限 132

```
在本机浏览器内互转 14 种常见的文档、表格与图片格式。支持混合批量、多步链路、预览编辑与 ZIP 打包，全程离线，不上传、无账号。
```

它现在同时是包里 `zh_CN` 的 `__MSG_extensionDescription__`，也就是中文用户安装后在扩展详情页读到的那一句。
而 `zh_CN` 是 listing 的默认语言，所以审核员第一眼读的是这份中文，不再是英文——它此前镜像了英文字段的列表形状，
那形状正是两次拒审引用的东西，所以放着不动就等于把同一条违规搬到主字段上。一刀砍掉那八个格式名，字符数从 98 降到 66。2026-09-11 加上去的东西留着，因为那四个从句点名的是
扩展真正具备的能力（混格式批量、多步链路、预览与编辑、ZIP 下载），而不是文件扩展名。依旧不写 PDF 转 Word、PDF 转 Excel，
因为这个扩展做不到无损的 PDF 转换。

**详细介绍（Detailed Description）** [必填] —— 纯文本，本仓库自设上限 16,000 字符（英文块实测 8,581；下面的中文块实测 3,039）

_Google 没有为这个字段公布长度_——75 与 132 是写在文档里的，16,000 不是。把它当成本仓库自己的守卫
（`pnpm verify:listing`），按后台计数器设定，提交时以那个计数器为准，不要把 16,000 背给审核员。

商店会剥掉 markdown，所以正文用 `•` 项目符号与空行分节。它刻意**不含**实现细节（不出现框架、库或 API 名字），
并且把限制条件前置——"misleading functionality" 是常见的拒审理由。

```
Transfer Any File is an open-source, offline file format converter for Chrome. It converts your files between common formats without uploading them anywhere. Everything happens in a page inside your own browser: no server, no account, no queue, and nothing to wait for on a slow connection.

WHY THAT MATTERS
An online converter has to copy your file onto a machine you do not control before it can do anything with it. For a public dataset that is fine. For an HR spreadsheet, a client contract, a medical report or a draft you have not told anyone about yet, it is not — and "we delete it within 24 hours" is a promise you have to take on trust. This one never has a copy to delete.

WHAT MAKES IT DIFFERENT
• One batch, many source formats. Most converters handle one format at a time. Here a folder of mixed file types goes to a single target in one run, each file resolving its own route — and one unreadable file does not fail the rest.
• Look before you download. Source and result side by side, with text results editable in place, so a wrong output does not mean converting the whole folder again.
• Nothing has to leave the machine. One permission (extension storage), no upload step, and it keeps working with the network switched off — you can disconnect and check for yourself.

WHAT YOU CAN CONVERT
• Fourteen formats across three families: documents, spreadsheets and data files, and images
• Inside the document and data families, any format converts to any other, in either direction
• Six image formats can be read and three can be written, and an image can also be embedded into a document
• 48 direct routes connect the formats. Where two of them share no direct route, the workbench works out the intermediate steps itself and shows the path it will take before it starts
• A pairing is supported whenever the two formats are connected anywhere in that graph, whether or not it looks obvious from the counts above
• A pairing that is reachable but makes no sense — turning a photograph into a spreadsheet, for instance — is greyed out with its reason instead of failing once you press Convert
• The format-by-format matrix, listing every route and every blocked pairing with its reason, is published on the extension's website rather than pasted here

BUILT FOR REAL WORKLOADS
• Batch conversion: drop in a whole folder's worth of files, even a mix of different source formats — each file resolves its own route to the target
• Per-file error reporting: one unreadable file never blocks the rest of the batch, and every failure is listed with its reason
• Failure diagnostics: expand any failed file to see the route it tried and the step that broke, with a one-click copy of that summary for filing an issue
• ZIP download: convert forty files, download one archive. A multi-page source and a multi-sheet workbook are automatically split into one output per page / per sheet
• Paste to convert: copy an image or a block of text and press Ctrl+V (⌘V on Mac)
• Preview and edit: view the source and the result side by side, and correct a text result before downloading it
• Recent targets: the formats you convert to most often are grouped at the top of the target picker
• Image output parameters: an image target exposes a longest edge (800–4096 px), and a compressed image target additionally takes encoder quality (40–90%) and a target file size (20 KB–2 MB); a source that is rendered page by page takes a render density of 96–300 DPI — every knob starts untouched
• PDF page selection: converting a PDF to images can be limited to the pages you name (1-3, 5) instead of the whole document; that choice belongs to the batch in front of you and is never stored, so it cannot silently truncate the next PDF
• Conversion presets: save a target format together with its parameters as a named shortcut (up to 12) and restore the whole setup in one click; a preset works for any batch that can reach that format
• Output names you can write: a result is named after its source file plus the date and time to the second by default, and Preferences takes a pattern of your own; the extension always comes from the real output, so a customised name never claims a format it is not
• Archive intake: drop a .zip and the supported files inside join the batch automatically
• Spreadsheet-friendly encoding: text is read as UTF-8 with a GB18030 then GBK fallback, and written with a byte-order mark so the result opens in a spreadsheet application without garbled characters
• Conversion history: the last 50 runs (file names, formats and sizes only), searchable by file name, filterable, reusable in one click, exportable and importable as JSON
• Undo the previous batch, confirm before a very large batch, and an optional desktop notification when a long job finishes while the tab is in the background
• Personalisation: 6 accent colours, light / dark / follow-system appearance, and a Chinese or English interface
• Keyboard friendly: start a conversion with Ctrl+Enter (⌘Enter), rebindable; in the side-by-side view, 1 / 2 / 3 switch between source, split and result and ← / → move the divider; skip-to-content link and visible focus indicators throughout

HOW TO USE
1. Click the toolbar icon — the workbench opens in a new tab
2. Drop files on the upload area, click to choose them, or paste from the clipboard
3. Pick the target format. Only formats that every selected file can reach are offered; the rest are greyed out with a reason
4. Converting to an image? The output panel appears whenever the target is an image: longest edge, plus quality and a target file size when the target is a compressed one, and a page range when the batch holds a PDF
5. Press Convert, then download a single file or the whole batch as one ZIP
6. Repeat the same setup often? Save the format and its parameters as a named preset and restore both in one click

PRIVACY
• Your files never leave your device. There is no upload step and no server to upload to: converting a file makes no network request, and the whole thing works with the network switched off
• The only permission it requests is access to extension storage, used to keep your conversion history and preferences on this machine
• No analytics, no tracking, no sign-in, no advertising, no paid tier

PLEASE KNOW BEFORE INSTALLING
• A produced PDF is rendered page by page as an image, so it carries no text layer; text you select in a PDF viewer was recognised by that viewer, not by this extension
• Reading a PDF in extracts its text; the original layout and embedded images are not preserved
• Images cannot be turned into text or spreadsheets — that needs OCR, which is not bundled
• Three of the image formats are input-only, because no browser can encode them; an animated source contributes its first frame, and a vector source is rasterised
• One file up to 100 MB is accepted, and a batch is limited to 200 files

QUESTIONS
• Is it free? Yes. Open source under the MIT licence, with no account, no paid tier, no advertising and no feature held back.
• Do I need to be online? No. After installation the interface and every converter run from your own machine, and the text is set in your system fonts instead of a downloaded webfont, so working on a plane or on an air-gapped laptop makes no difference.
• Why can't a screenshot be turned into text? That needs OCR, and no OCR engine is bundled: it would add tens of megabytes and a model download, which the offline guarantee rules out. Those targets are greyed out with that reason instead of failing at convert time.
• How many files can it take at once? Up to 200 files in a batch and 100 MB per file, with a confirmation prompt above 5 files or 20 MB in total. A multi-page source and a multi-sheet workbook become one output per page or per sheet, delivered as a single ZIP.
• Can it make a photo file smaller? Yes, and offline. When the target is a compressed image format you can set a quality level, cap the longest edge, or ask for a file size between 20 KB and 2 MB, which the encoder reaches by walking its quality ladder; every image target takes the longest-edge cap. Nothing is uploaded to do it.
• Where is the conversion history kept? In extension-local storage on your own machine, holding file names, formats and sizes only, never file contents. It can be searched, filtered, exported and cleared from the workbench.
• Also works in other Chromium browsers, not only Chrome.

SUPPORT
Found a bug, or need a format added? Open an issue at https://github.com/liaolongdong/transfer-any-file/issues

Version 1.0.0 — first store submission.
```

**中文详细介绍（Chinese (China) detailed description）** —— 贴给 `Chinese (China)` 标签页的现成文案。逐节镜像英文版。
术语取自已上线的界面（`utils/i18n/zh.ts`）而不是现编：转换工作台 / 批量转换 / 目标格式 / 打包下载 ZIP / 转换历史 /
复用此格式 / 偏好设置 / 主题色 / 显示模式 / 界面语言 / 撤销 / 复制诊断信息 / 最近使用。不要引入界面没用过的同义词。

```
文件格式任意转换助手 是一款开源、完全离线的 Chrome 文件格式转换扩展，在你的电脑本地完成常见文件格式之间的相互转换，全程不上传。所有转换都在你自己浏览器里的一个页面完成：没有服务器、没有账号、不需要排队，也不受网速影响。

为什么值得在意
在线转换器必须先把你的文件复制到一台你控制不了的机器上，才能开始处理。对一份公开数据集来说无所谓；对一份 HR 表格、客户合同、体检报告，或者一份还没告诉任何人的草稿，就不是回事了——而「24 小时内自动删除」只能靠对方遵守承诺。这款扩展从来就没有一份供人删除的副本。

它不一样的地方
• 一次批量，多种源格式。多数转换器一次只能处理一种格式。在这里，一整个文件夹里类型各异的文件可以一次转向同一个目标格式，每个文件各自求出自己的路径——而且一个读不了的文件不会拖垮整批。
• 先看再下。源文件与结果左右对照，文本类结果还能就地修改，输出不满意不必把整个文件夹重转一遍。
• 数据不必离开本机。只申请一项权限（扩展存储），没有上传环节，断网之后照常可用——你可以断开网络自己验证。

能转换什么
• 三大类共 14 种格式：文档、表格与数据文件，以及图片
• 文档类与数据类内部，任意两种格式都能互相转换，两个方向都行
• 图片可读 6 种格式、可写 3 种格式，此外图片还能嵌入文档
• 这些格式之间由 48 条直接路径相连。两个格式没有直连路径时，转换工作台会自动求出中间步骤，并在开始之前显示它将要经过的路径
• 只要两种格式在这张转换图上彼此相连，这个组合就支持，不必先从上面那几行数字里看出端倪
• 图上可达但语义无效的组合（比如把一张照片变成表格）会置灰并给出原因，而不是等你点了「开始转换」才失败
• 逐格式的完整矩阵——每条路径、每个置灰组合及其原因——发布在扩展的官网页面，不列在这里

面向真实工作负载
• 批量转换：一次拖入一整个文件夹的文件，源格式不同也没关系——每个文件各自求出到目标格式的路径
• 逐文件错误报告：单个无法读取的文件不会阻断整批，每个失败文件都会连同原因单独列出
• 失败诊断：展开任意一个失败文件，能看到它尝试的转换路径和出错的那一步，还能一键复制诊断信息用于提交问题
• 打包下载：转换 40 个文件，下载 1 个 ZIP 压缩包。多页的源文件与多工作表的表格文件会自动按"每页一个 / 每表一个"拆分输出
• 粘贴即转换：复制一张图片或一段文字，按 Ctrl+V（Mac 上为 ⌘V）即可
• 预览与编辑：源文件与结果左右对照显示，文本类结果可在下载前就地修改
• 最近使用：你常转的目标格式会以下拉顶部的「最近使用」分组呈现
• 图片输出参数：目标为图片时可设最长边（800–4096 px）；目标为压缩图片格式时还可设质量（40–90%）与目标体积（20 KB–2 MB）；逐页渲染的源文件另可按「清晰度」选 96–300 DPI；不设置即保持默认
• PDF 选页：把 PDF 转成图片时可以只点名要渲染的页（如 1-3, 5），不必整份出图；这个选择只属于眼前这一批、不落存储，所以不会悄悄截断下一份 PDF
• 转换预设：把目标格式连同输出参数存成一个命名快捷方式（最多 12 个），下次一键套用；预设不绑定源格式，凡能转到该格式的批次都能直接用
• 输出文件名：结果默认叫「源文件名 + 精确到秒的日期与时间」，偏好设置里这一串写法可以自定义；扩展名始终取自真实产物，自定义过的名字因此不会与实际格式不符
• 压缩包解包：拖入一个 .zip，其中受支持的文件自动加入批次
• 表格友好的编码：文本按 UTF-8 读取，失败时依次回退 GB18030 与 GBK，写出时带字节序标记，用表格软件打开不乱码
• 转换历史：保留最近 50 次转换的元数据（仅文件名、格式与体积），支持按文件名搜索、筛选、一键「复用此格式」，以及 JSON 导出与导入
• 可撤销上一批结果、超大批次转换前确认、任务在后台标签页完成时可选发送桌面通知
• 个性化：6 种主题色、浅色 / 深色 / 跟随系统三种显示模式，中文与英文界面
• 键盘友好：Ctrl+Enter（⌘Enter）开始转换且可改绑；左右对照视图下按 1 / 2 / 3 切换原文件、并排与结果，按 ← / → 移动分隔条；提供跳转主内容链接与清晰的焦点提示

使用方法
1. 点击工具栏图标——转换工作台在新标签页打开
2. 把文件拖到上传区，或点击选择，或直接从剪贴板粘贴
3. 选择目标格式。下拉框只提供对全部已选文件都可达的格式，其余格式置灰并给出原因
4. 要转成图片？「输出参数」面板只在目标为图片时出现：最长边始终可设，目标为压缩图片格式时还可设质量与目标体积
5. 点击「开始转换」，然后单个下载或把整批「打包下载 ZIP」
6. 每次都转同一套配置？把它存成「转换预设」，之后一键恢复格式与参数

隐私
• 你的文件不会离开本设备。没有上传环节，也没有可供上传的服务器：完成一次转换不发起任何网络请求，断网状态下照常可用
• 唯一申请的权限是扩展存储，用于把转换历史和偏好设置保存在本机
• 无统计埋点、无追踪、无登录、无广告、无付费版本

安装前请了解
• 转出的 PDF 是逐页渲染成的图片，因此其中不含文字层；在 PDF 查看器里能选中复制出的文字，是那个查看器自己识别的，不是本扩展的功能
• 读入 PDF 只提取文本，原有版式与内嵌图片不会保留
• 图片无法转换为文本或表格——那需要 OCR，本扩展未内置
• 有三种图片格式只能作为输入、不能作为输出，因为浏览器未提供它们的编码器；动图源文件取首帧，矢量源文件先展平
• 单文件最大 100 MB，单批最多 200 个文件

常见问题
• 完全免费吗？是。以 MIT 协议开源，没有账号、没有付费版、没有广告，也没有任何功能被保留。
• 需要联网吗？不需要。安装完成后，界面与全部转换器都在你自己的电脑上运行，文字使用系统自带字体而非下载的网络字体，在飞机上或内网隔离的电脑上使用没有区别。
• 为什么不能把截图转成文本？那需要 OCR，而扩展没有内置任何 OCR 引擎——它会带来几十 MB 体积和一次模型下载，与完全离线的承诺冲突。这些目标格式会置灰并给出该原因，而不是等到转换时才失败。
• 一次能处理多少文件？单批最多 200 个文件、单文件最大 100 MB，超过 5 个文件或总计 20 MB 会先弹确认框。多页的源文件与多工作表的表格文件会按每页一个、每表一个的方式输出，并打包为一个 ZIP。
• 能把图片体积压小吗？可以，而且全程离线。目标为压缩图片格式时，可设质量、限制最长边，或指定 20 KB–2 MB 之间的目标体积——编码器用质量阶梯逐级逼近；任何图片目标都支持最长边限制。整个过程不需要上传任何文件。
• 转换历史存在哪里？存在本机的扩展存储中，只包含文件名、格式与体积，绝不保存文件内容。可在工作台内搜索、筛选、导出与清空。
• 除 Chrome 外，其他 Chromium 内核浏览器同样可用。

支持
发现缺陷，或希望新增某种格式？请到 https://github.com/liaolongdong/transfer-any-file/issues 提 issue

1.0.0 版本——首次提交商店。
```

**类别（Category）** [必填]

```
Productivity
```

**单一目的（Single Purpose）** [必填]

```
Converts user-selected documents, spreadsheets and images between common file formats entirely on the local machine.
```

**主要语言（Primary Language）** [必填]

```
Chinese (China)
```

这一项由包的 `default_locale: "zh_CN"` 决定，不是后台自由选的：下拉里的每条语言对应包里一个 `_locales/` 目录，
所以取与 `zh_CN` 对应的那一条（仪表板按显示名列出，可能写作 `Chinese` 或 `中文（简体）`——判断依据是目录名，不是标签文字）。
英文作为附加本地化一起提供，两个标签页各自填一套文案。

**它不决定界面语言。** `default_locale` 只管 Chrome 自己显示的那两条字符串（名称、简介）；工作台界面仍在运行时解析，
存储里的选择优先，没有则按浏览器语言（见 `useI18n.ts` 的 `resolveLocale`），并且随时能在偏好设置里切。
也就是说：商店页对所有人先展示中文，而英文系统用户装完之后界面是英文、扩展名也是英文。

Google 对这种情形只要求一致性：_"localized item metadata shouldn't significantly change the described set of
features"_——上面两份详细介绍与中英两侧的界面能力逐功能对齐。

---

## 图形与素材

| 素材               | 尺寸         | 状态    | 文件名                                        |
| ------------------ | ------------ | ------- | --------------------------------------------- |
| 商店图标           | 128×128 PNG  | ✅ 就绪 | `public/icon/128.png`                         |
| 品牌母版           | 512×512 PNG  | ✅ 就绪 | `docs/assets/icon.png`                        |
| 品牌标记（小尺寸） | 64×64 PNG    | ✅ 就绪 | `docs/assets/icon-mark.png`                   |
| Small Promo Tile   | 440×280 PNG  | ✅ 就绪 | `docs/assets/store/cws-small-promo.png`       |
| Marquee Promo Tile | 1400×560 PNG | ✅ 就绪 | `docs/assets/store/cws-marquee-promo.png`     |
| GitHub 社交预览图  | 1280×640 PNG | ✅ 就绪 | `docs/assets/store/github-social-preview.png` |

这里没有一张是手截的：`pnpm build && pnpm assets:capture` 会从当前构建产物重摄上面每一个文件，以及下面每一张 listing
截图，所以一次 UI 改动不可能留下过期的商店素材。

### Listing 截图

每一行是一个生成帧；五张进轮播、以及进哪五张，由[提交速查 → Tab 2](#tab-2--screenshots--icon截图与图标)决定。
原始截图是 README 与产品说明页所用的那一张；两个 listing 文件是同一张图叠上 caption 条之后的成品，每种商店语言各一份。
**下面的 caption 是镜像，不是源头**——真正烧进 PNG 的是 `scripts/capture-store-assets.mjs` 里的 `SCREEN_CAPTIONS`，
所以要改就改那里，然后重跑 `pnpm build && pnpm assets:capture`。一条 caption 只说它自己那张图能证明的事：ZIP 那一行写的是
「一次混合批量」而不是文件数量，因为脚本为那一帧准备的就是三个文件的批次；而 caption 文本属于 store 元数据，
与 listing 文案受同一套政策评审。

| #   | 原始截图（`docs/assets/screenshots/`） | 英文版（`docs/assets/store/screens/`） | 中文版                       | Caption（EN / ZH）                                                                     |
| --- | -------------------------------------- | -------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| 1   | `workbench-empty.png`                  | `screen-01-workbench.png`              | `screen-01-workbench-zh.png` | Drop, pick a format, convert on your own machine / 拖入、选格式，在你自己电脑上转换    |
| 2   | `batch-files.png`                      | `screen-02-batch.png`                  | `screen-02-batch-zh.png`     | Batch: mixed source formats, one target / 批量：多种源格式，一个目标格式               |
| 3   | `batch-results.png`                    | `screen-03-zip.png`                    | `screen-03-zip-zh.png`       | One mixed batch, one ZIP download / 一次混合批量，一个 ZIP 下载                        |
| 4   | `preview-edit.png`                     | `screen-04-preview.png`                | `screen-04-preview-zh.png`   | Preview side by side, edit before you download / 左右对照预览，下载前直接改            |
| 5   | `history.png`                          | `screen-05-history.png`                | `screen-05-history-zh.png`   | Searchable, filterable history with one-click reuse / 历史可搜索、可筛选、一键复用格式 |
| 6   | `dark-mode.png`                        | `screen-06-dark-mode.png`              | `screen-06-dark-mode-zh.png` | 6 accent colours, light / dark / system / 6 种主题色，浅色 / 深色 / 跟随系统           |
| 7   | `output-preset.png`                    | `screen-07-presets.png`                | `screen-07-presets-zh.png`   | Dial in size and quality, save it as a preset / 尺寸、质量、目标体积，存成一键预设     |

四条约束决定了这一组素材：

- **每个语言页五张，五张就是上限。** Google 要求 _"at least 1—and preferably the maximum allowed 5—screenshots"_，
  所以上面七张里有两张留在仓库。先砍 **#6**（`dark-mode`）：它是证据最弱的一张，而主题支持在 listing 文案里已经写了。
  然后是 **#5**（`history`）：它的搜索、筛选、复用控件在详细介绍里点了名，但那张图本身没有展示任何一次转换。
- **所有截图都会被降到 640×400。** Google：_"all screenshots are downscaled to 640x400 pixels"_。PNG 仍然保持
  1280×800 供高分屏使用，但可读性唯一要看的渲染就是那个减半版——这排比这一组的 caption 条更小的字号，也正是界面按
  原生密度截取、而不是缩小腾出顶部横幅的原因。
- **语言页之间不继承——两个语言页各传一套。** EN 与 ZH 标签页的截图槽互相独立，所以两套都要上传，
  而且中文那套是从中文工作台截的，不是把英文图换字幕。`_locales/zh_CN/` 进包之后中文标签页真的存在了，
  于是 `docs/assets/store/screens/` 里那七张 `-zh` 从「仓库里等着」变成要传上去的东西——每个页各挑五张，挑法相同。
- **Caption 是 store 元数据，而且只能烧进图里。** 后台没有逐张截图的 caption 字段——这一点和 App Store 不同，
  CWS 只存截图及其顺序——所以 caption 唯一能待的地方就是 PNG。这段文本按与详细介绍相同的政策评审，因此它的用词不能越出
  listing 已有的范围：不出现竞品品牌名、不做绝对化的隐私主张、不暗示 PDF 能变表格（`PDF → CSV / JSON / Excel`
  在选择器里是置灰的），也不能把 `PDF → Word` 描述成保留版式，因为它做的是文本提取。它还继承两次拒审留下的形状规则——
  不许有冒号或逗号分隔的格式名列表——所以 `screen-02` 写的是「多种源格式」，而不是点出为那一帧准备的三个文件名。
  图里仍然可读的是界面自身的文本（文件名、格式徽章、预设芯片），把它们抹掉就等于伪造产品。

caption 条是叠上去的，不是裁出来的：界面保持完整的 1280×800 分辨率，色条盖在底部一条上。把界面缩小来腾出顶部横幅，
会让它的 12px 文字掉到可读性以下。

### 图标分两档

两份母版对应两档尺寸：`assets/icon.svg` 在大位置画的是文档页 + 环形转换徽章，`assets/icon-small.svg` 把图形削到
只剩加粗的双向箭头，好让它在 16px 还活得下来。

| 档位   | 母版             | 用在                    |
| ------ | ---------------- | ----------------------- |
| 简化档 | `icon-small.svg` | 48px 以下渲染的一切位置 |
| 详细档 | `icon.svg`       | 48px 及以上             |

这个分法是算术不是口味：详细档母版的文字线在 128 网格上只有 5px 高，缩到 26px 就落在约 1px 上，读起来是一片白斑。
这就是 favicon、落地页导航标记和 small promo tile 都指向 `icon-mark.png` 的原因——扩展被看得最多的位置恰恰是最小的那些。
上面的「品牌母版」喂给 GitHub 仓库头像与 JSON-LD 的 `logo`/`image` 一对，于是 CWS、GitHub、Pages 解析到同一张图。

### 逐张说明

1. `workbench-empty` —— 首次打开的状态：顶栏品牌 + 副标题、拖放区、空历史，以及「支持 14 种格式，48+ 条转换路径」的页脚。给全新用户设定预期。
2. `batch-files` —— 三个混格式文件（Markdown + CSV + Excel）配一个目标，展示多数转换器缺的批量能力。
3. `batch-results` —— 「转换完成！3 个文件」，带逐文件的预览 / 复制 / 下载，以及一个「打包下载 ZIP (3)」。
4. `preview-edit` —— 源 ↔ 结果左右对照，带 渲染 / 源码 / 编辑 / 复制 控件。最强的差异点，也是产品说明页的主图。
5. `history` —— 可搜索、可筛选的历史，带「复用此格式」。
6. `dark-mode` —— 深色外观，证明界面可主题化。
7. `output-preset` —— 一个 PDF、目标 WebP，而且这个目标是点预设芯片选中的、不是下拉框选的：路径条渲染出两步链
   （`PDF → PNG → WebP`），输出那一行带着四个参数（70% 质量、1280 px 最长边、200 KB 目标体积、200 DPI——最后这个
   只因为源文件是 PDF），下面放着三张已保存的芯片。

英文原始截图同时充当 README 与产品页配图。中文截图是中间产物：它们只活到被叠上字幕为止，因为两份 README 与产品页
都复用英文那一套。`scripts/capture-store-assets.mjs` 在一趟运行里跑完两种语言，所以中文标签页不会被留在一张英文界面上。

---

## 权限与隐私申报

### 权限说明

| 权限      | 类型        | 说明（中文摘要；要贴进后台的英文原句见[提交速查 → Tab 3](#tab-3--privacy-practices隐私实践)）                                                                                                                                                                                                                                                                              |
| --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage` | permissions | 通过 `chrome.storage.local` 跨会话保存用户自己的转换历史（文件名、格式、体积——绝不含文件内容）、界面偏好（主题色、显示模式、语言、通知与确认开关、自定义快捷键、输出文件名写法）、图片输出参数（最长边、质量、目标体积、PDF 渲染清晰度）与转换预设（用户自己输入的预设名称，连同它记录的目标格式与输出参数）。什么都不传输：扩展不声明 host 权限，自身代码不发起网络请求。 |

没有 `host_permissions`、没有 content script、没有 `tabs`、没有 `<all_urls>`、没有远程代码。工具栏图标走
`chrome.action.onClicked` → `chrome.runtime.openOptionsPage()`；工作台是扩展页面，因此从不申请访问任何网站。
预期安装提示里**不会**出现数据访问警告。

### 数据处理

**这个扩展会处理用户数据。它不传输任何一份。** 这是两个不同的问题，而表单问的是第一个。

Google 自己的措辞（[user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)）：

> "Generally, by 'handle' we mean collecting, transmitting, using, or sharing user data."
>
> "Extensions are required to disclose how they handle user data, **even when data is processed or stored locally on a
> user's device and is not transmitted to external servers or third parties**."

读取用户选择的文件、保留转换历史、把偏好写进 `chrome.storage.local`，这些都算 handle。所以这个表单**不是**
「什么都不离开本机」就能答完的——那是传输问题，排在同一页更靠后的位置。

| 数据类型     | 是否处理               | 是否传出设备 | 用途                               | 是否共享给第三方 |
| ------------ | ---------------------- | ------------ | ---------------------------------- | ---------------- |
| 个人身份信息 | 否                     | 否           | —                                  | 否               |
| 健康信息     | 否                     | 否           | —                                  | 否               |
| 财务信息     | 否                     | 否           | —                                  | 否               |
| 身份认证信息 | 否                     | 否           | —                                  | 否               |
| 个人通讯     | 否                     | 否           | —                                  | 否               |
| 位置信息     | 否                     | 否           | —                                  | 否               |
| 网页浏览历史 | 否                     | 否           | —                                  | 否               |
| 应用活动     | 是 —— 留在设备本地     | 否           | 转换历史与最近使用的目标格式       | 否               |
| 网站内容     | 否                     | 否           | —                                  | 否               |
| 用户文件     | 是 —— 读取、转换后即弃 | 从不         | 格式转换，随后以下载的形式交还用户 | 否               |

**表单上：如实声明本扩展处理用户数据**，勾选实际发生的那几类（用户文件，以及覆盖本地历史的 app-activity /
其他类型那一行），并在描述框里写那句真话：_全程在设备本地处理，从不传给开发者或任何其他人，标签页关闭后不再保留。_
复选框的文案以 dashboard 当时显示为准，不要照抄本文——Google 会改这份清单，而本文件没法知道下个月它写成什么样。

**不要选「我们不从本扩展收集任何用户数据」。** 对一个要打开用户文件的扩展来说它不准确，而不准确的申报是一条
写明的政策违规，不是格式瑕疵：Google 警告这类不一致 "can result in suspension of the item and, in some instances,
ban of the entire publisher entity"。这是整份文档里唯一可能赔上整个开发者账号的错误。

离线保证真正换来的是那一页**其他**答案——没有传输，于是传输规则那几条根本没有东西要认证。每次提交前用
`pnpm verify:offline` 重跑它背后的断言（`entrypoints/`、`components/`、`composables/`、`utils/` 里没有网络请求入口，
`wxt.config.ts` 不声明任何 host 权限，并且**要上传的那份产物** `.output/chrome-mv3/manifest.json` 的权限仍然只有
`storage`——所以它必须在 `pnpm build` 之后跑，缺产物时它直接失败而不是跳过），并记住 jsPDF / pdf.js 里那些无人调用的
请求路径既读不到响应、也碰不到任何网站的数据。CI 每次 push 两层都跑：lint job 先跑源码层
（`verify:offline:source`，此时还没有产物可查），build job 在 `pnpm build` 之后跑这条完整的。

### 数据使用认证

对上表申报的每一项数据，勾选表单给出的每条声明：

- [x] 数据不会出售给第三方
- [x] 数据不会用于、也不会转让给与条目核心功能无关的目的
- [x] 数据不会用于、也不会转让给信用评估或借贷目的
- [x] Limited Use：数据只在设备本地处理，完全不传输、不共享

### 隐私政策

**隐私政策 URL** [必填] —— ⚠️ 提交前必须可访问

需要它，是因为条目**处理**用户数据，而不是因为某项权限：Google 的 FAQ 直接回答了这种情形——
_"My extension or app handles user data, but only stores information locally. Do I still need to post a privacy policy?
Yes."_

```
https://liaolongdong.github.io/transfer-any-file/privacy.html
```

页面在 `docs/privacy.html`（中英同时呈现、无统计代码、无外部资源）。**2026-09-08 已在线验证**：GitHub Pages 现在把
`docs/` 作为站点根发布，所以 `https://liaolongdong.github.io/transfer-any-file/` 与 `/privacy.html` 都返回
`HTTP/2 200`。本文件更早的版本在这里记过一个 404——那是 GitHub 自己的向导创建的那次部署，它把**仓库根**而不是 `docs/`
发成了站点根；`.github/workflows/static.yml` 已经取代了它。

仍然要验证而不是假设，因为 Pages 之后任何一次回归都会直接卡住提交——后台不接受隐私政策 URL 不可达的提交：

```bash
curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1   # 期望：HTTP/2 200
```

---

## 分发与开发者信息

**可见性**：Public　**地区**：All regions　**价格**：free

| 字段           | 值                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Publisher Name | ⚠️ _需要你来定_ —— CWS 开发者账号的公开名称                                                             |
| Contact Email  | `924902324@qq.com` —— 在商店 listing 上公开展示（2026-09-06 决定）；与 `package.json#author.email` 一致 |
| Support URL    | `https://github.com/liaolongdong/transfer-any-file/issues`                                              |
| Homepage URL   | `https://liaolongdong.github.io/transfer-any-file/`                                                     |

> **没有放微信群的字段。** 社群渠道（微信 `lld_1025`，备注 `taf`）在产品页的 `#contact` 小节和两份 README 里，
> 配图 `docs/assets/wx-qrcode/wechat-qrcode.jpg`。CWS 对用户只暴露上面那三行，所以这张码永远不需要往这个表单里传——
> 而且**不能**烧进截图或推广图，因为那些东西按 listing 文本评审。

---

## 首次上架（手工步骤）

商店**不可能**端到端自动化，假装可以只会浪费一个提交名额。本仓库已经通过 WXT 使用的那个 CLI
（`publish-browser-extension`）原文写着："You are responsible for uploading and submitting an extension for the first
time by hand."。创建条目、粘贴 listing 文本、上传截图、勾选隐私申报全部发生在后台里；API 只能把一个包推给**已存在**的
条目。下面这套顺序做一次，之后的每个版本就只是推一个 tag。

### 1. 账号一次性设置

1. 给这个 Google 账号开启**两步验证**——没开的话，Google 既不给发布也不给更新。
2. 到 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) 注册，交一次性
   **$5** 注册费。
3. 填完开发者资料（身份、地址、电话）并**验证联系邮箱**。邮箱未验证的表现是「Submit for review」点了没反应，
   看起来像后台的 bug，但不是。公开联系邮箱是 `924902324@qq.com`（2026-09-06 决定）。

### 2. 仓库侧前置条件

```bash
pnpm verify:offline:source   # 源码层：第一方源码无网络请求，wxt.config.ts 只有 storage（产物断言见下面第 3 步）
pnpm verify:meta             # 132 字符的简介在 package.json 与 wxt.config.ts 一致
pnpm verify:listing          # 下面每个粘贴字段都在上限内，且与 manifest 一致
curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1   # 必须是 HTTP/2 200
```

隐私政策 URL 是硬闸门：政策不可达的提交会被后台直接拒。它由 GitHub Pages 从 `docs/` 提供
（`.github/workflows/static.yml`），所以那个工作流必须**已经成功完成过一次**部署——跑上面那条 `curl`，不要凭记忆。
在进后台之前做这件事，而不是填到一半才想起来。

### 3. 产出包

`pnpm build && pnpm package` 写出 `.output/transfer-any-file-<version>-chrome.zip`；构建之后补跑一次
`pnpm verify:offline`，它才会断言这份产物的 manifest 权限只有 `storage`。推荐路径是推 tag：
`.github/workflows/release.yml` 会校验 tag 与 `package.json#version` 一致、跑上面两项守卫（离线那条按同样的顺序拆成
构建前的源码层与构建后的产物层）、确认 `manifest.json`
位于压缩包根目录且旁边没有仓库文件，然后把 zip 挂到 GitHub Release 上。

### 4. 填后台条目

这里要贴的东西本文件里全有——**复制，不要重打**：

| 后台标签页         | 本文件里的小节                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store listing      | [商店文案](#商店文案)（`Chinese (China)` 默认：20/75 + 66/132 + 中文详描；`English (United States)`：49/75 + 127/132 + 英文详描；`Productivity`、单一目的）                      |
| Screenshots & icon | [图形与素材](#图形与素材)——**两个语言页各传一套**，各从 7 张 1280×800 里传 5 张（各砍 `history` 与 `dark-mode`）、`public/icon/128.png`、small 与 marquee 推广图（推广图只一套） |
| Privacy practices  | [权限与隐私申报](#权限与隐私申报)——声明条目_处理_用户数据；只在设备本地、从不传输。**不是**「不收集任何用户数据」。                                                              |
| Distribution       | [分发与开发者信息](#分发与开发者信息)（public、全部地区）；item ID 出现在这一页                                                                                                  |

提交审核，然后盯后台的 **Package → status**。配好下面那套凭据之后，也可以用 `release.yml` 打的同一组端点查状态：
GET `https://www.googleapis.com/chromewebstore/v1.1/items/<item ID>`，带 `x-goog-api-version: 2` 和一个
`Authorization: Bearer <access token>`；换 access token 的命令见 `.github/CWS_PUBLISHING_GUIDE.md → 3.1`。

### 5. 交接给自动化（条目已存在之后）

从后台 URL 里复制 32 位 **item ID**，然后为 Chrome Web Store API 生成 OAuth 凭据。Google Cloud 那侧的完整步骤
（在某个项目里启用 _Chrome Web Store API_、创建 OAuth client、用授权码换 refresh token）写在
`.github/CWS_PUBLISHING_GUIDE.md → 3.1`，这里不重复。

补上四个仓库 secrets——本扩展专用的 `CHROME_EXTENSION_ID_TAF`，以及与 account-password-helper 共用的
`CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_REFRESH_TOKEN`（个人账号没有组织级 secret 共享，这三个值仍要在
**每个仓库里各填一次**）——`release.yml` 里的 `Submit to the Chrome Web Store` 步骤就不再说「跳过」，而是从下一个 tag
开始真正发布。它用 runner 自带的 `curl` 打 v1.1 端点：先 PUT `upload/items/<id>` 上传新包，再 POST
`items/<id>?publishTarget=default` 提交审核；不引入第三方 npm 包或 action。头几次运行想先预演，手动触发
workflow_dispatch 时勾 `dry_run`（只做认证与校验，不上传、不提交）。

| 想改的行为                  | 改哪里                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| 限定范围发布（只给白名单）  | 那行 POST 的 `publishTarget` 换成 `trustedTesters`，它是工作流里的字面量，不是仓库变量         |
| 只上传不请求审核（留草稿）  | 注释掉那行 POST；包已经上传，后台的 Package 页会停在草稿态                                     |
| 用 v2 API + service account | 换掉整套端点与鉴权；**当前刻意留在 v1.1**，因为新开发者账号今天拿到的就是 v1.1 的 OAuth client |

### 无法自动化的部分（别排期，然后困惑）

- 创建条目，以及对 listing 文本、截图、推广图、隐私申报的**任何**编辑。
- **GitHub 社交预览图**（Settings → General → Social preview），用 `pnpm assets:capture` 生成的
  `docs/assets/store/github-social-preview.png` 同一张。
- 审核本身：首次提交按 1–5 个工作日规划，并且每次尝试都要抬 `package.json#version`——版本号等于或低于已上线版本的
  更新会被直接拒。

---

## 上架后的运营

后台报的是 listing 级的数字，每一个都指向本文件里的一份素材。先看数字再改东西，改动才能瞄准真正弱的那一项：

| 后台指标                        | 数值偏弱指向什么                                   | 能修它的素材                                   |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| Impressions 曝光                | listing 没被搜到                                   | 名称、简介、20 个 topics——只有这三项影响被发现 |
| Detail-page views ÷ impressions | 在搜索里看到了却没点                               | 图标与第一张截图                               |
| Installs ÷ detail-page views    | 点进来了却没装                                     | 第一张截图、详细介绍的开头几节、权限叙事       |
| Uninstalls 卸载                 | 上手流程或稳定性，不是 listing 文案                | 扩展内部的首次运行行为                         |
| Rating 评分                     | 评论处理；评分下滑会独立压制上面所有指标带来的安装 | 回复评论，并修掉它们报的问题                   |

三条惯例让这些数字可归因：

- 站外推广链接一律带 UTM 参数，例如 `?utm_source=v2ex&utm_medium=post&utm_campaign=launch`。后台的
  **Analytics → Traffic sources** 按 `utm_source` 归组安装，于是一个不出量的渠道是**看得见**的，不是靠猜。
  GitHub 链接带一个普通 `?ref=` 就够——仓库的 **Insights → Traffic → Referrers** 会报出来。
- 在任何地方宣布这个扩展**之前**记下当天基线（曝光、详情页浏览、安装），第一周的波动才有参照。
- 条目上线后再往两份 README 加 Chrome 应用商店徽章——这就是它们的徽章行今天什么都没有的原因：还没有 listing 可指，
  而一个指向不存在条目的徽章比没有徽章更糟。条目存在之后，三个 shields 都用后台 URL 里那 32 位 item ID，三个都链向 listing：
  - `https://img.shields.io/chrome-web-store/v/<ITEM_ID>?label=CWS&logo=googlechrome&logoColor=white&color=4285F4`
  - `https://img.shields.io/chrome-web-store/users/<ITEM_ID>?label=Users&logo=googlechrome&logoColor=white&color=4285F4`
  - `https://img.shields.io/chrome-web-store/rating/<ITEM_ID>?label=Rating&color=4285F4`

  评分徽章至少要有一个评分才读得出有意义的数字，所以头几天它看着会怪。

因为后台给的是 listing 级而不是逐张截图的数字，一次只改一个素材，并让一个统计周期过去再看下一个——一批同时发生的改动
无法归因到其中任何一个。

---

## 审核要点

### 已知限制（审核员问到时主动披露）

- PDF 输出按设计就是图片（jsPDF 逐页渲染），不提供可选中文字的 PDF 导出。已写进详细介绍，避免被读成误导性主张。
  若有人从图片转出的 PDF 里复制出了文字，那是 PDF 查看器自己识别的结果——文件里没有文字层，识别结果也不在文件里；详细介绍、产品页 FAQ 与结果卡片上的提示都按这个口径写。
- PDF 输入只做文本提取；原版式与内嵌图片不保留。
- 没有 OCR，所以 图片 → 文本/数据 在目标选择器里是刻意置灰的，而不是等到转换时才失败。
- BMP / GIF / SVG 只能作为输入，因为浏览器不给它们提供编码器。
- 内联 SVG 进 Word 或 Markdown 时栅格成 PNG 嵌入：Word 的 HTML 导入不画内联 SVG，栅格化是「必定渲染」的那条
  路，代价是那张图在 .docx 与 .md 里是位图，放大不再是矢量。README 与产品页同步写明这一点。
- 四组对比度由端到端套件在 6 主题色 × 浅/深（12 种组合）下断言：顶栏品牌文字对顶栏 ≥ 4.5:1；主按钮标签在
  常态 / hover / 按下三态 ≥ 4.5:1（取自已启用的按钮，因为文本规则豁免禁用控件）；卡片上的焦点环 ≥ 3:1；
  正文信息文字（拖放提示、文件大小、页脚等五串）对各自底色 ≥ 4.5:1。
  最差实测值（2026-09-14）：4.70:1。已知缺口：控件的填充色还需要与它底下的表面满足 3:1（WCAG 1.4.11），
  12 种组合里 10 种满足，浅森林绿与橙色按钮不满足（2.21 / 2.96:1）——这一点写在 README 里，而不是当作已达标呈现。

### 发布前检查清单

- [x] `manifest_version: 3`，只用 MV3 API
- [x] 四个图标尺寸都在，且与各自声明的尺寸一致
- [x] 48px 以下的每个位置都用简化档；详细档只出现在 48px 及以上
- [x] 权限只有 `storage`；每一项权限在上面都有具体说明
- [x] 无远程代码、无 CDN 资源、无 `eval` / `new Function`
- [x] 无混淆（只有 Vite 压缩）；不含 source map
- [x] 描述与实际行为一致，包含限制条件
- [x] **任何粘贴字段、任何烧进图片的文本里，都没有冒号或逗号分隔的格式名列表**——两次拒审引用的就是这个：
      09-14 是简介，09-15 是详细介绍里的 family bullet。`pnpm verify:listing` 量的是长度与跨文件一致性，
      **不是形状**，所以这一条只能靠读：两份简介、两份详细介绍、两张推广图、七条截图 caption。
      2026-09-15 逐条读过并清空；留在受审素材里的格式名只剩截图里界面自身的文本。见[拒审记录](#拒审记录与政策口径)。
- [x] 截图严格 1280×800，由构建产物生成
- [x] 隐私政策文本已撰写（中英），托管在 `docs/` 下
- [x] **GitHub Pages 以 `docs/` 作为站点根** —— 2026-09-08 已验证：`https://liaolongdong.github.io/transfer-any-file/`
      返回 `HTTP/2 200`，这正是 `.github/workflows/static.yml` 的产物结构。更早那次把仓库根发成站点根的部署
      （GitHub 自己的向导建的）已被取代；一旦产物路径有变，重跑下面那条 `curl`。
- [x] **隐私政策 URL 公网可达** —— `HTTP/2 200` 于 2026-09-08 确认，且与隐私申报表一致。每次提交前立刻复查：
      `curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1`——它一旦回归就直接卡住提交
- [x] 公开联系邮箱已选定，且与 `package.json#author.email` 一致
- [ ] **发布者名称待定** —— 必须与 CWS 开发者账号的公开名一致
- [x] 商店名称已改成「品牌 + 关键词」形态（2026-09-06）；`manifest.name` 与它一致
- [x] 仓库已建成 `liaolongdong/transfer-any-file`（默认分支 `main`）
- [ ] 上面的 About 描述 + 20 个 topics 尚未应用（GitHub 搜索覆盖在这里，不在 slug）——见
      [`.github/repo-metadata.md`](.github/repo-metadata.md)（本机没装 `gh`）
- [ ] GitHub 社交预览图尚未上传（`docs/assets/store/github-social-preview.png`）——只能后台操作，没有 API
- [x] `pnpm package` 的 zip 已检查：不含 `.git/`、`node_modules/`、`.test-*`、`CHROMEWEBSTORE.md`、`docs/`、
      `fixtures/` —— 由 `.github/workflows/release.yml` 断言
- [ ] 在被打包的那个 commit 上 `pnpm lint:all`、`pnpm verify:meta`、`pnpm verify:offline`、`pnpm verify:remote-code`、
      `pnpm verify:listing`、`pnpm test:e2e` 全绿

---

## 版本历史

| 版本  | 日期       | 变更                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 状态                 |
| ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1.0.0 | 2026-09-07 | 首次提交：14 种格式 / 46 条直接路径、批量 + ZIP、多步链路、预览与编辑、失败诊断、最近使用的目标分组、历史、6 种主题、中英界面。英文 listing 文案可直接粘贴；中文文案已写好但被 `_locales/` 拦着——见[语言闸门](#语言闸门)。审核后**被拒两次**——09-14 因为简介里的格式列表，09-15 因为详细介绍——同一条政策；见[拒审记录](#拒审记录与政策口径)。重新提交时，每个商店字段都改成按品类而非按格式名表述。09-21 第三次拒绝落在另一根轴上（`内容政策` / Manifest V3 远程托管代码），改的是包而不是文案，见[拒审记录](#拒审记录与政策口径)。 | 被拒 ×3 → 重新提交中 |

---

## 拒审记录与政策口径

两次裁决的价值不在于「被拒了两次」，而在于它们共同划出的那条线：**看形状，不看次数**。这一节留下全部测量，
因为下次有人想把卖点写得更具体时，需要知道代价。第三次（09-21）换了一根轴——不再是文案，而是包里的代码，
所以它单独成节，也提醒一件事：过了文案这关不等于过了政策这关。

### 2026-09-14 · v1.0.0 · 违规类型：垃圾内容和商店中的排名 · 参考 ID `Yellow Argon`

> 违规行为：产品说明中有过多关键字。
> 英文：Summary 里的 "Markdown, Word, PDF, Excel, CSV, JSON, HTML, images"。
> 如何纠正：移除说明中的过多关键字并重新提交产品。
> 计划政策的相关部分：我们禁止发布含有误导性、格式不正确、非描述性、不相关、**过多**或不恰当的元数据的扩展程序，
> 包括但不限于扩展程序的名称、图标、说明、开发者名称、**屏幕截图和宣传图片**。

**被引用的那串到底是什么。** 不是详细介绍——那八个名字待在 129 字符的 **简介**（后台的 short-description 字段）后半段，
而本文件让这个字段与 `wxt.config.ts → manifest.description`、`package.json#description` 逐字节相同。一句话、四个地方，
全部由 `pnpm verify:listing` 断言；只改素材包的话，下一次提交就会从 manifest 里把同一条违规再交一遍。

| 位置                                                       | 改之前                                                                                                                                    | 改之后                                                                                                                                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 简介 / `manifest.description` / `package.json#description` | `Convert 14 file formats locally in your browser: Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. Batch, offline, no uploads.` (129) | `Convert between 14 common document, spreadsheet and image file formats right in your browser — offline, in batches, no uploads.` (127)                                                           |
| `Chinese (China)` 简介                                     | 冒号后面同样的列表，98 字符                                                                                                               | 改成品类表述，66 字符。从未被贴过——语言闸门意味着中文标签页还不存在——但它带的是同一个形状，留着就是给上一个带 `_locales/` 的版本存同一条违规。                                                    |
| Marquee 推广图副标题（1400×560）                           | `Markdown, Word, PDF, Excel, CSV, JSON, HTML and images in one offline workbench.`                                                        | `Documents, spreadsheets and images in one offline workbench.`。审核员引用的那句政策**明确**点了宣传图片，所以烧进图里的列表和文本字段是同一份暴露。用 `pnpm build && pnpm assets:capture` 重摄。 |

**故意没动什么，以及这个选择换来了什么。** 第一轮只碰这一组字段就收手：两份详细介绍保留 WHAT YOU CAN CONVERT
（每个 family 一条）与 COMMON CONVERSIONS（116 个可选组合里点名 31 个）——7,958 / 3,240 字符，94 / 96 个格式名 token。
这些一个字都没被引用，而在同一次尝试里重写它们会毁掉归因。赌注是：第二次裁决如果来了，它就是关于详细介绍的证据，
而不是关于简介的。它精确地兑现了——09-15 的裁决引用的是详细介绍、不是简介，这既确认第一轮的修复落地了，
也认定枚举是唯一还活着的违规。

### 2026-09-15 · v1.0.0 · 违规类型：垃圾内容和商店中的排名 · 参考 ID `Yellow Argon`

> 违规行为：产品说明中有过多关键字。
> 英文：Images 条目下的 "PNG, JPEG, WebP, BMP, GIF and SVG"，Documents 条目下的 "Markdown, HTML, Word (.docx), PDF and
> plain text"，Data 条目下的 "CSV, Excel (.xlsx) and JSON"。
> 如何纠正：移除说明中的过多关键字并重新提交产品。

**被引用的那几串是什么。** 就是 WHAT YOU CAN CONVERT 的三条 family bullet，逐字，两种语言的块里都是——而且审核员
是按 Images / Documents / Data 的顺序列的，也就是相对页面**从下往上**，这说明他们读了那个块，而不是模式匹配。
第一轮给这种情况开的方子（「先砍 COMMON CONVERSIONS，因为同一份枚举产品页上已经有」）把顺序判错了：裁决点名的是
那个更短、看起来更无害的块，那个读起来像功能摘要而不像关键词网格的块。两次裁决的共性不是提及次数，而是**形状**——
`Family: name, name, name`——而这个形状现在已经从 Google 评审的每个字段里消失了。

| 位置                                               | 改之前                                                                                                                                                                                                                                  | 改之后                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EN 详细介绍 —— WHAT YOU CAN CONVERT                | 三条 bullet 在两行里点名 14 个格式                                                                                                                                                                                                      | 改成「按族 + 计数」的 bullet；这个块不再点名任何东西                                                                                                           |
| EN —— COMMON CONVERSIONS                           | 五条 bullet 点名 116 个可选组合里的 31 个                                                                                                                                                                                               | 整节删除；它唯一不重复的那句承诺（没列出的组合只要两种格式在图上相连就照样能转）并进 WHAT YOU CAN CONVERT                                                      |
| ZH —— 能转换什么 / 常用转换                        | 同上，96 个 token                                                                                                                                                                                                                       | 同一刀，剩 3 个 token                                                                                                                                          |
| 两个块里其他每一处                                 | `Markdown / HTML / CSV / JSON / plain text`、`for PNG, JPEG and WebP targets only`、`BMP, GIF and SVG can be converted from`、`Converting to JPEG or WebP`、`Excel-friendly CSV`、`Multi-page PDFs`、`Markdown → HTML → PDF` 这类示例链 | 同样的句子，限定词留着、名字拿掉：a compressed image target、an image target、three of the image formats、a multi-page source、a spreadsheet-friendly encoding |
| `screen-02-batch` 的 caption（两种语言都烧在图里） | `Batch: Markdown, CSV and Excel in one run` / `批量：Markdown、CSV、Excel 一次转完`                                                                                                                                                     | `Batch: mixed source formats, one target` / `批量：多种源格式，一个目标格式`；每一帧与每张推广图重摄                                                           |

**还剩什么被点名，为什么。** 每个块里活下来三个 token：`PDF` 两次，在那两条不写 PDF 就没法表述的限制里
（转出的 PDF 是逐页图片；读入 PDF 会丢版式），`JSON` 一次，指历史导出用的容器。`.zip` 还出现两次，一次是用户拖进来的
东西、一次是批次下载成的东西。全部是句子里的名词，不是列表；而 listing 用来开头的两个数字（`14` 种格式、`48` 条路径）
是算术不是关键词——Google 真正在意的形状是枚举。

**残余暴露在截图里，不在文案里。** 界面渲染的是真实的文件徽章——`Markdown (.md)`、`CSV (.csv)`、`Excel (.xlsx)`——
而 `screen-07` 里的预设芯片字面上就叫 `WebP · 200 KB`、`JPEG · 1600 px`、`PNG · 4096 px`。那就是产品本身：
把批次换成单一格式、或者给夹具改名来藏住它，这些图描述的就是一个扩展并不会做的事。如果第三次裁决点名的是屏幕截图，
那才是该动的杠杆——而到那时候，问题的读法就从文案变成账号模式了。

**申诉：这一次不申。** 第一轮的笔记写着「同一条政策两次拒审，就该用申诉表单了」。这个判断被它自己的前提推翻了：
申诉是针对一项裁决提出异议，而两次裁决引用的文本都确实在提交里，也确实对得上政策自己举的那个反例。
递一份上去等于在一个我们必输的主张上消耗立场。如果第三次裁决落在一份**不带列表**的文案上，那时才轮到那个表单——
那是这个模式不再关于我们文案的临界点。

**重新提交路径。** 被拒的草稿可以继续编辑：上传带 `_locales/` 的新包（`Chinese (China)` 标签页由此出现）、
用上面的块替换两份详细介绍与四个名称/简介字段、两个语言页各传五张重摄的截图、把两张推广图换成重摄的，
并先跑[提交速查](#提交速查)开头的五条前置命令。版本保持 **1.0.0**——「必须高于已上线版本」这条规则在没有任何东西上线时没有可比较的对象，而保持不动也顺便让
`release.yml` 的 tag-等于-版本断言不受影响。同一次尝试里**别改任何其他东西**：让第一轮可归因的那套逻辑在这里同样成立，
下一次裁决应该只关于这一刀。

**这一条归因性已经被 locale 改动削弱了，说清楚。** listing 的默认语言从英文换成中文，意味着一份从未被审过的中文文案
第一次成为主字段。缓解是那条形状规则同样落在这份中文上（简介 98→66、详细介绍按族表述，见上面的实测数字），
但它带的是不同的词，也就带着不同的风险。如果第三次裁决落在中文侧，那不该记成「去列表那一刀没生效」——
先按语言把两份文案分开归因，再决定动哪一份。

### 2026-09-21 · v1.0.0 · 违规类型：内容政策 · 无参考 ID

> 违规行为：Manifest V3 产品包含远程托管代码。
> 政策引用：开发者服务条款、计划政策、品牌推广指南。

**这一次跟文案没有关系。** 前两次裁的是关键字形状，这一次裁的是**包的内容**：MV3 不允许扩展存在「把网络上的东西
当代码执行」的可能。裁决没有点名具体是哪一处（也没给参考 ID），所以修法不是改被引用的那一个字段，而是把产物里
**所有**这一类形状一次清干净——留着任何一处，下一次还是同一条判定。

**产物里实际有什么。** 用 `grep` 扫 `.output/chrome-mv3/` 而不是扫源码，找到的两处都在第三方依赖里，都是本项目
从来不会走到的死代码：

| 位置                               | 形状                                                                                                                                                                           | 为什么它算远程托管代码                                                                   | 我们走到吗                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `chunks/jspdf.*.js`（jsPDF 4.2.1） | `output('pdfobjectnewwindow')` 分支：`var i="https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js"` → `createElement("script")` → `c.src=i` → `appendChild` | 一个远端 URL 直接成为 `<script>` 的 `src`；`options.pdfObjectUrl` 还允许调用方传任意 URL | 否。全仓库只调 `output('blob')`                                     |
| `chunks/pdf-*.js`（pdf.js）        | `_createCDNWrapper`：把 `await import("<url>")` 拼成字符串塞进 Blob，再 `new Worker(blobURL)`                                                                                  | 代码文本在运行时组装后交给解析器                                                         | 否。只在 `workerSrc` 跨源时才走，而我们那份是包内同源的 `.mjs` 资源 |

其余匹配过的形状都不在这条政策的射程里，且刻意**没有**清：jszip 的 `setImmediate` 垫片用一个空 `<script>` 做调度、
lodash 与 `lib-*.js` 的 `Function('return this')()` 取全局、SheetJS 里几百个 `http://purl.oclc.org/…` 的 XML 命名空间
字符串、pdf.js 拿 `https://foo.bar` 当 URL 解析的基准占位。它们要么是间接 eval 的形状（MV3 的 CSP 本来就在运行时
拦死），要么根本不是代码。把它们一起砍掉只会让守卫变成永久噪声，见下。

**为什么两道离线守卫都没看见它。** `verify:offline:source` 读的是第一方源码（干净检出上根本没有产物），
`verify:offline` 断言的是产物 manifest 的权限集合。这两条**都不读第三方 bundle 的文本**，所以一条硬编码的 cdnjs URL
从它们中间完整穿过去；扩展也从来没有运行时症状可看——那段代码不会被调用，浏览器连一次失败请求都不会发。
这是「离线」与「无远程代码」是两条独立主张的第一个实例：前者管我们做不做请求，后者管包里躺着什么。

**修法在构建期，不在运行期。** 加个 `if` 把调用点挡住没有任何意义——商店扫的是字符串本身。所以
`wxt.config.ts` 里 `stripRemotelyHostedCode()` 用 Vite 的 `transform` 钩子把这两段整块删掉（jsPDF 那个 `case` 分支
直接消失，pdf.js 那个包装器变成恒等函数）。这个钩子必须在 `transform` 而不是 `renderChunk`：rolldown 在**所有** JS
钩子之后才压缩，`renderChunk` 看到的仍是未压缩文本，改完再被压缩器重排，等于没改——第一次尝试就是这么失败的。
随之而来的约束是：正则得按各厂商**实际发布形态**写（`jspdf` 只发压缩版 `dist/jspdf.es.min.js`，
`pdfjs-dist/build/pdf.mjs` 是未压缩版），并容忍两种引号风格。

**新守卫：`pnpm verify:remote-code`。** 上面那些正则在依赖升级后可能静默失配，所以断言放在产物上：
无 `http(s)://…js` 字面量、无 `importScripts(`、无 `<script src="http…">`、无 `createCDNWrapper`、无拼出来的
`await import("${…}")`、无 `eval(`，外加 manifest 的 CSP 不放远程脚本源。缺产物即失败，与离线守卫同一套纪律；
`--source-only` 那层给 CI 的 lint job（build 之前）用。接线：`ci.yml` 的 lint 与 build 两个 job、
`release.yml` 里 **Package 之前**（把包递给商店前的最后一道）。

**没变的东西，以及验证。** 功能、交互、权限、存储结构全部未变：被删的两条路径一条不可达（`output('blob')` 是唯一
用到的输出模式），一条在跨源时才触发（我们的 `workerSrc` 是包内资源）。验证按改动范围跑：
`pnpm lint:all`、`pnpm verify:meta`、`pnpm verify:offline`、`pnpm verify:remote-code`（源码层与产物层）、
`pnpm verify:paths`（48 条边不变）、`pnpm verify:listing`，产物体积仍为 3.76 MB；`pnpm test:e2e` 在**同一次构建的产物**上
260/260 全绿，其中走到这两处被改依赖的场景照旧（MD/HTML/TXT/CSV/XLSX/SVG → PDF 出文档，PDF → PNG / WEBP 与两页
PDF → ZIP 解码）。跑这一步的纪律：**`.output/chrome-mv3` 在被测期间不能换**——本轮前三次运行都因为同机另一套套件
中途重构建了它而作废（满屏 30s 截图超时 + 同一目标在相邻场景一会儿可用一会儿不可用），那种运行说明不了任何事。

**申诉仍然不做，但理由和上次不同。** 按 09-15 那条笔记预登记的判据，「第三次裁决落在不带列表的文案上」确实是启动
申诉表单的临界点——可那前提是裁决关于我们的文案。这次不是，而且被点名的代码**真的**在包里：申诉是在否认一个事实。
真正值得记下的是反面信号：一次关于枚举的判定都没有再出现，说明关键字那条模式这一关过了。

**下一次提交只改一个变量。** 包换成新的，listing 文案一个字不动。09-18 那次已经把所有受审字段去过列表化，
这次动的是 zip——所以下一次裁决如果还来，它关于的要么是包，要么是账号，不再是文案，这个区分值一次提交。
版本保持 **1.0.0**。

---

## 本文件的变更记录

> 这些是关于**本文件**的修订记录，不是产品发布说明（产品在 `CHANGELOG.md`）。数字全部由 `pnpm verify:listing` 实测。

- **2026-09-24（输出文件名进 listing）** —— 两份详细介绍的「面向真实工作负载 / BUILT FOR REAL WORKLOADS」各加一条
  bullet，位置同为「转换预设 / Conversion presets」之后。**副作用**：两个粘贴块变长，速查表、字段标签与上架手册
  （中英两份）里被引用的四处字符数按 `pnpm verify:listing` 重测为英文 8,581 / 中文 3,039。名称、简介、单一目的与
  隐私披露逐字节未动：这一栏改的就是扩展自己存储里的一个偏好，`storage` 权限那段说明照旧成立。
- **2026-09-24（PDF 选页进 listing）** —— 两份详细介绍各加一条 bullet，位置同为「图片输出参数 / Image output parameters」之后；
  「使用方法 / HOW TO USE」第 4 步各补同一从句——那个字段确实就长在那块面板里，而 listing 从没提过它。
  **副作用**：两个粘贴块变长，速查表、字段标签与上架手册（中英两份）里被引用的四处字符数按 `pnpm verify:listing` 重测为
  英文 8,315 / 中文 2,959。名称、简介、单一目的与隐私披露逐字节未动：页码范围不落存储，所以 `storage` 权限那段说明照旧成立。
- **2026-09-22（第三次拒审 · 远程托管代码）** —— [拒审记录](#拒审记录与政策口径)新增 2026-09-21 一节，
  并据此改了四处操作性内容：开工前置命令从五项变六项（加 `pnpm verify:remote-code`，它读产物所以必须排在
  `pnpm build` 之后）、顶部当前状态改记「被拒三次」并说明第三次的轴不是文案、版本历史那行补 09-21、
  拒审记录一节的引言点明「过了文案这关不等于过了政策这关」。**所有粘贴字段逐字节未动**，
  `pnpm verify:listing` 与 `pnpm verify:numbers` 已复核。
- **2026-09-20（口径补全）** —— 两份详细介绍的「安装前请了解 / PLEASE KNOW BEFORE INSTALLING」各加同一从句：在 PDF
  查看器里能选中复制出的文字由查看器识别，不是本扩展的功能；[审核要点](#审核要点) 的对应条目补上这条应对口径。
  **副作用**：两个粘贴块随之变长，速查表、字段标签与上架手册里被引用的四处字符数按 `pnpm verify:listing` 重测为
  英文 8,030 / 中文 2,877。此前那几处写着 7,948 与 2,838/2,845——上一轮改措辞时留下的陈旧值，没有任何脚本对比过；
  现在这两个长度是 `pnpm verify:numbers` 推导的第 21、22 个事实，四个引用点由它盯住。
- **2026-09-19（守卫）** —— 上面「开工前」代码块里 `pnpm build` 与 `pnpm verify:offline` 互换次序，第 2 步的前置命令
  换成 `pnpm verify:offline:source`：产物层断言（浏览器实际加载的那份 `manifest.json` 只有 `storage`）只有在构建之后
  才跑得动，而它现在缺产物即失败，不再静默跳过。第 3 步据此补了构建后重跑一次的说法，CI 那两句改成两层。
  **七个粘贴字段与所有小节标题逐字节未动**，`pnpm verify:listing` 已复核。
- **2026-09-16（语言）** —— listing 的默认语言从英文换成中文：包里新增 `public/_locales/zh_CN/messages.json`
  （`manifest.default_locale`）与 `public/_locales/en/messages.json`，`wxt.config.ts` 的 `name` / `description`
  从英文字面量改成 `__MSG_extensionName__` / `__MSG_extensionDescription__`。[语言闸门](#语言闸门)整节由「两条路待选」
  改写为「已解决 + 机制与代价」；Tab 1 的语言行、`主要语言` 字段（`English` → `Chinese (China)`）、中文名称与简介
  两处「被闸门拦着」的说法、截图小节「中文页不存在」的说法、以及后台映射表与重新提交路径随之翻转；前置命令从四条变五条
  （多一条 `ls .output/chrome-mv3/_locales`）。守卫同步扩：`verify:listing` 现在逐字比对两份 locale 文件与本文件四个
  名称/简介粘贴块并断言 key 集一致，`verify:meta` 改比对 `_locales/en` ↔ `package.json#description`
  （此前它比的是 manifest 字面量）。**代价**：一份从未被审过的中文文案第一次成为主字段，见[拒审记录](#拒审记录与政策口径)
  末尾那条归因说明。构建产物已复核：`.output/chrome-mv3/manifest.json` 带 `"default_locale":"zh_CN"`，
  两个 `messages.json` 落在扩展根，包体 3.74 MB（+617 B）。
- **2026-09-16** —— 全文改为中文优先并重排结构：开头的六段「Revised 2026-09-XX」流水账挪到这里、压成条目；
  原来散在各节的「为什么要这样写」并进各自字段；GitHub 仓库元数据整节移出到 [`.github/repo-metadata.md`](.github/repo-metadata.md)；
  加目录。七个粘贴字段与两张推广图相关的取值**逐字节未动**（改前后由 `pnpm verify:listing` 与字段抽取脚本双向校验）。
  章节标题与字段标签中文化时，`scripts/check-store-listing.mjs` 的字面量锚点同步改了，所以 `verify:listing` 与 CI 不断。
  同日稍后：「语言闸门」与「数据处理」两个小节标题去掉 emoji 与破折号——标题文字会进 GitHub 的锚点 slug，
  而指向这两节的链接一共 5 处；三处 `<a id>` 手工锚点一并删除，改由自动 slug 承担。
- **2026-09-15（第二轮，回应第二次拒审）** —— 详细介绍里剩下的枚举全部移除，两种语言都是，连带那条同形状的烧图 caption。
  用同一个脚本对 `git HEAD` 与工作树测量：英文块从 **94 个格式名 token 降到 3**，中文从 **96 降到 3**，
  活下来的三处是两条不提 PDF 就写不出的 PDF 限制，加上历史文件的导出格式。WHAT YOU CAN CONVERT / 能转换什么
  改按族与计数表述覆盖，而 COMMON CONVERSIONS / 常用转换——它点名 116 个可选组合里的 31 个、存在的理由正是承载
  人们会输入的路径短语——整节删除，因为政策那句话描述的就是这个块。字符数几乎没动
  （英文 7,958 → 7,948，中文 3,240 → 2,845），而九十一个格式名离开了英文块：名字原本承担的主张改由句子承担，
  于是 listing 保住了长度、只丢掉列表形状。`screen-02-batch` 的 caption 在两种语言里都失去那三个名字，
  截图随之重摄——被引用的政策原文把屏幕截图和说明并列。路径短语并没有变得不重要——它们搬去 `docs/index.html`，
  那里已经有完整的逐格式矩阵，而那里不适用任何 listing 政策。
- **2026-09-15（第一轮，回应 09-14 拒审）** —— 简介去掉八个名字的格式列表，改按品类描述同样的覆盖，132 里用 127 字符。
  `Chinese (China)` 简介同样裁剪（66/132），而带同一份列表、同样属于受审图片的 marquee 推广图副标题在
  `scripts/capture-store-assets.mjs` 里改掉并重摄。详细介绍**故意没动**：被引用的只有简介，而一次提交只动一个字段
  才能让下一次裁决可归因——这个赌局没兑现，见上一条。本文件里有两个字符数与它们描述的文案漂移了，
  这次按 `pnpm verify:listing`（下面每个数字的权威）纠正：英文详细介绍块是 7,948 字符（不是 6,939），中文是 2,845
  （不是 2,832）。另外，09-12/13 笔记里那些逐 token 密度数字是那一轮的快照——09-14 的新增内容已经改动了它们，
  把它们当历史而不是当前测量。
- **2026-09-14** —— 本轮 shipped 的两个能力进两份详细介绍：图片输出参数（质量、最长边、目标体积，PDF 源另有渲染密度）
  与转换预设，放在「最近使用」之后以保持历史与个性化条目的顺序；使用方法从四步长到六步，覆盖输出面板与保存预设；
  QUESTIONS 新增「能把图片体积压小吗」一对，因为「离线压小图片」是这个 listing 能被搜到的最高意图。
  CSV 那一行从「回退 GBK」更正为解码器真正执行的链（UTF-8 → GB18030 → GBK），产品页同样漂移过。
  所有粘贴字段用 `pnpm verify:listing` 重测。素材包另加第七张 listing 帧 `screen-07-presets`（输出参数 + 预设芯片），
  于是 Tab 2 的五槽选择变成 01–04 + 07，`history` 与 `dark-mode` 转为备胎。
- **2026-09-12/13** —— 英文名靠加图片关键词扩到 57 字符，**同一轮退回 49**（决定它的测量见「扩展名称」）；
  中文名首次引入，33/75（它没有更早的值，这一节本身是新增）。两份详细介绍在本轮加了 COMMON CONVERSIONS / 常用转换，
  因为用户真正输入的路径短语——"markdown to pdf"、"csv to excel"、"png to webp"——在两份文案里哪里都没有——
  然后同一轮又从一整段密排散文回退成五条分类 bullet：该块点名 **116 个可选组合里的 31 个**（EN 711 / ZH 391 字符），
  整篇介绍的格式 token 密度英文从 **93 → 73**、中文从 **95 → 77**，最高的单个 token 是 `PDF` 的 13 次。
  完整的逐格式矩阵——每条直连边、每个多步目标、每个被置灰的组合及其原因——搬到产品页，那里可以承载这份枚举而没有任何
  listing 政策暴露。最后，隐私那句 "makes no network requests of any kind" 改写成行为上可验证的形式，
  这样它经得起审核员挂代理去查。
- **2026-09-11** —— 中文简介用掉未用的字符、两份详细介绍新增 QUESTIONS / 常见问题、listing 截图开始为两种商店语言
  各生成带 caption 的版本，仓库 topics 扩满 20 个预算。
- **2026-09-08** —— 复核 GitHub Pages 已上线、仓库已存在，并纠正此前记为 404 的隐私政策 URL（那次部署由 GitHub 向导
  把仓库根发成站点根，现已被 `static.yml` 取代）。
- **2026-09-06** —— 商店名称从 `File Any Transfer` 改为现在的品牌 + 关键词形态；公开联系邮箱定为
  `924902324@qq.com`。

---

## 相关文档

- **仓库与 About 元数据**：[`.github/repo-metadata.md`](.github/repo-metadata.md)（About 描述、20 个 topics、社交预览图怎么落地）
- **产品说明页与隐私政策**：`docs/index.html`、`docs/privacy.html`（对外文案，含逐格式转换矩阵）
- **编码规则与架构**：`.qoder/rules/wxt-rules.md`、`AGENTS.md`
- **贡献须知与安全策略**：`CONTRIBUTING.md`、`SECURITY.md`（中英成对，英文用 `.en.md`）
- **发布说明**：`CHANGELOG.md`（中文）· `CHANGELOG.en.md`（英文）
- **术语表**：**受审字段** = Google 会按 listing 政策评审的载体：名称、图标、简介、详细介绍、开发者名称、屏幕截图、
  宣传图片。**形状规则** = 不许出现 `族名：名字, 名字, 名字` 这种列表，文本与烧进图里的文本同等对待。
