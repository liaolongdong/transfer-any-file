# Chrome Web Store 上架指南 · Transfer Any File

简体中文 · [English](CWS_PUBLISHING_GUIDE.en.md)

本文档记录 Transfer Any File 上架 Chrome Web Store 的完整流程和关键配置。

## 📋 前置条件

- Google 账号（已有）
- 双币/全币种信用卡或借记卡（用于支付 $5 注册费）
- 稳定的网络代理（访问 Google 服务）

---

## 第一步：注册 Chrome Web Store 开发者账号

1. 打开 Chrome Web Store Developer Dashboard：
   https://chrome.google.com/webstore/devconsole

2. 使用 Google 账号登录

3. 接受开发者协议

4. 支付 $5 美元一次性注册费（使用双币/全币种卡）

5. 注册成功后，记下 devconsole 地址里那段 UUID（发布商 ID，第三步配 secrets 时要用）

> **提示**：注册过程中需要访问 Google 服务，建议选择网络稳定的时段操作。

---

## 第二步：创建扩展商品

在 Developer Dashboard 中：

### 1. 点击 **"新建商品"** (New Item)

### 2. 上传扩展 zip 包

```
.output/transfer-any-file-{version}-chrome.zip
```

> 💡 **版本管理**：zip 文件名中的版本号跟随 `package.json`，上传时以 `.output/` 目录中最新构建产物为准。确保版本号高于商店线上已发布的版本（首次提交无此限制）。

### 3. 填写商店信息（Store Listing）

#### **基本信息**：

- **名称（Name）**：
  - 中文（默认语言）：`文件格式任意转换助手 — 离线转换无上传` (28/75 字符)
  - 英文：`Transfer Any File — Offline File Format Converter` (49/75 字符)
  - ⚠️ **必须与 `public/_locales/*/messages.json` 的 `extensionName` 逐字一致**

- **摘要（Short Description）** (132 字符硬限制)：
  - 中文：**`在本机浏览器内互转 14 种常见的文档、表格与图片格式。支持混合批量、多步链路、预览编辑与 ZIP 打包，全程离线，不上传、无账号。`** (66/132 字符)
  - 英文：**`Convert between 14 common document, spreadsheet and image file formats right in your browser — offline, in batches, no uploads.`** (127/132 字符)
  - ✅ **权威来源**：`public/_locales/zh_CN/messages.json` 与 `en/messages.json` 的 `extensionDescription`（manifest 通过 `__MSG_extensionDescription__` 引用）
  - ⚠️ **商店列表必须粘贴同一句话**——两份副本逐字一致，否则审核会判定描述与 manifest 不符

- **详细描述（Full Description）**：
  - 参见 `CHROMEWEBSTORE.md` 中的"商店文案"章节
  - 中文详细说明：3,142 字符（上限 16,000）
  - 英文详细说明：8,902 字符（上限 16,000）
  - ✅ **已避开关键词堆砌风险**：所有字段均不使用逗号/冒号分隔的格式名列表

- **分类（Category）**：Productivity

- **单一目的（Single Purpose）**：

  ```
  Converts user-selected documents, spreadsheets and images between common file formats entirely on the local machine.
  ```

- **主要语言（Primary Language）**：Chinese (China)

- **附加语言（Additional Languages）**：English (United States)

#### **图形素材**：

- **商店图标**：128×128 px (`public/icon/128.png`)
- **截图**：至少 1 张、**每语言页最多 5 张**，尺寸只能 **1280×800**，格式 JPEG / 24 位 PNG
  - 中文页：从 `docs/assets/store/screens/` 选择 5 张 `-zh.png` 文件
  - 英文页：从 `docs/assets/store/screens/` 选择 5 张英文 caption 版
  - ✅ **推荐顺序**：`screen-01-workbench`、`02-batch`、`03-zip`、`04-preview`、`07-presets`
- **小幅推广图片**（可选）：440×280 px (`docs/assets/store/cws-small-promo.png`)
- **大幅推广图片**（可选）：1400×560 px (`docs/assets/store/cws-marquee-promo.png`)

#### **隐私政策**：

- **隐私政策 URL**：`https://liaolongdong.github.io/transfer-any-file/privacy.html`
- ✅ **已验证可达性**：`curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1` 返回 `HTTP/2 200`

#### **数据使用声明**：

- ✅ **勾选**：This developer collects user data
- **数据处理说明**：
  - 用户文件：读取后在本地内存中处理，不上传
  - 转换历史：仅存储文件名、格式和体积元数据（app-activity）
  - 偏好设置：存储在扩展本地 storage
  - ❌ **不收集**：任何用户文件内容、不上传、不共享给第三方
- **隐私政策文本**：
  ```
  Files are read into the extension page's memory, converted there, and returned to the user as a download. Conversion history and preferences are stored locally via chrome.storage.local. No data is transmitted, uploaded, synced or shared with anyone, including the developer; there is no server.
  ```

### 4. 权限合理性说明（Justification）

| 权限      | 用途说明                                                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage` | 保存用户的转换历史（文件名、格式和体积，从不保存文件内容）和界面偏好（主题、颜色模式、语言、通知和确认开关、自定义快捷键）。数据仅存储在设备本地：扩展未声明任何 host 权限，其自身代码不发起任何网络请求。没有更窄的权限可以实现这些功能。 |

**完整中英文说明**（可直接粘贴）：

```
storage: persists the user's own conversion history (file names, formats and sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut) via chrome.storage.local. Nothing leaves the device: the extension declares no host permissions and its own code issues no network request. No narrower permission can do this.
```

### 5. 点击 **"提交审核"** (Submit for Review)

---

## 第三步：配置 CI/CD 自动化发布

### 3.1 取服务账号凭据（Chrome Web Store API v2）

发布走的是 **API v2 + 服务账号**：不再有 Client ID / Client Secret / Refresh Token 那三件，也不需要在
浏览器里点一次「同意」。换掉它的理由是那条老链路两头都断了——它的授权 URL 用的是
`redirect_uri=urn:ietf:wg:oauth:2.0:oob`，Google 自 2022-02-28 起禁止新客户端使用该 redirect_uri、
2023-01-31 起对**所有**客户端关闭，授权端点在检查客户端之前就回「错误 400: bad_request」；而 v1.1 那套
端点本身在 **2026-10-15** 停止服务。

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)，创建新项目（或选已有项目）
2. 「API 和服务」→「库」→ 搜 **Chrome Web Store API** → 启用。
   没启用时令牌照样换得到、调用却被回 `403 accessNotConfigured`，所以这一步是那条链路的第一道关
3. 「IAM 和管理」→「服务账号」→ 创建服务账号。名字随意；**GCP 的 IAM 角色一个都不必加**——
   商店授权看的是这个账号在不在你这个发布商的成员列表里（第 5 步），不是 GCP 里的角色
4. 「服务账号」→ 该账号 →「密钥」→「添加密钥」→「新建密钥」→ JSON → 下载。
   要用的就是文件里那两个字段：`client_email` 与 `private_key`。
   下载完**别让它留在仓库目录里**——`git add .` 会连它一起收走，而这条链路只从 GitHub Secrets 读它，
   本机不需要留这份文件（`.gitignore` 里那条 `.env.submit` 守的是旧形状，守不住一个随机命名的 JSON）
5. 打开开发者信息中心 <https://chrome.google.com/webstore/devconsole>，进「账号」页把第 4 步那个
   `client_email` 加为成员。**一个发布商目前只能加一个服务账号**，所以同属这个发布商的几个扩展
   共用它一个就行，不必各建一个
6. 记下**发布商 ID**：devconsole 地址栏 `https://chrome.google.com/webstore/devconsole/<uuid>` 里那段
   UUID，它就是 v2 资源名 `publishers/{publisherId}/items/{itemId}` 的第一段

> v2 只有五个动作：`fetchStatus` / `upload` / `publish` / `cancelSubmission` / `setPublishedDeployPercentage`。
> 里面**没有**「创建条目」也**没有**「改可见范围」——那两件事仍然只在后台手工做，所以本文第二节不会消失。

### 3.2 配置 GitHub Secrets

在 GitHub Repository Settings → Secrets and variables → Actions 中配置以下 secrets：

**发布商级（同属一个发布商的仓库填同一套值）：**

```bash
CWS_PUBLISHER_ID                 # 发布商 ID：devconsole 地址里的那段 UUID
CWS_SERVICE_ACCOUNT_EMAIL        # 服务账号的 client_email
CWS_SERVICE_ACCOUNT_PRIVATE_KEY  # 该服务账号的私钥
```

**本扩展专用：**

```bash
CHROME_EXTENSION_ID_TAF  # Transfer Any File 扩展 ID（从 CWS Dashboard 获取，32 位 a-p 小写字母）
```

> ⚠️ **重要提示**：
>
> - 私钥的三种粘贴形状都吃得下：整份 JSON 文件、从 JSON 里复制出来的 `private_key` 字段值（那里的换行
>   还是字面量的反斜杠 n、等号还是 JSON 转义写法）、以及已经还原成多行的 PEM。认不出时会说清是哪一类
>   问题，并且绝不把密钥打进日志——见 `scripts/cws-token.mjs`
> - 但**推荐粘整份 JSON 或多行 PEM**：人手工把转义还原成真换行，是这三种形状里最容易出错的一种
> - 前三个值是发布商级别的：GitHub 个人账号没有组织级 secret 共享，所以**每个仓库里各填一次**（值相同）
> - 扩展 ID 必须是 32 位 a-p 小写字母，复制时别带空格/换行等不可见字符
> - 服务账号没有「token 7 天过期」这件事：每次运行由 `scripts/cws-token.mjs` 现签一枚 5 分钟有效的 RS256
>   JWT 去换 access_token，也不需要把 OAuth 应用发布为 In production。旧文档里那两条提醒随 refresh token
>   一起作废

### 3.3 发布流程

当前配置用 runner 自带的 `curl` 直接打 Chrome Web Store API v2 的上传 / 发布端点，**不引入第三方 npm 包
或 action**；只有换令牌那一步交给第一方的 `scripts/cws-token.mjs`（RS256 签名在 shell 里写不出来）：

1. **准备版本**（推荐路径，全自动见 `.github/RELEASE_AUTOMATION.md`）：合并到 `main` 之后，
   `release-prepare.yml` 会算出版本号、提升双语 changelog 的「未发布」区块，并开一个 Release PR。
   **合并那个 PR 就是批准发布**，标签由同一条工作流在合并之后打上。手工做法同样有效：

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **自动触发**：`.github/workflows/release.yml` 被标签触发后自动执行：
   - 验证 tag 与 package.json 版本一致
   - 运行源码层检查（`verify:meta`、`verify:offline:source`、`verify:numbers`、`verify:listing`）
   - 构建扩展，随后对产物再跑一次 `verify:offline`（断言浏览器实际加载的那份 manifest 只有 `storage` 权限）与 `verify:remote-code`，最后打包
   - 验证包内容（manifest.json 在根目录，无仓库文件）
   - 创建 GitHub Release
   - 校验服务账号凭据（现签一枚 JWT 换 access_token，失败时把 Google 的响应体原样打出来）与扩展 ID 格式
   - **版本预检**：先用 `:fetchStatus` 读商店现在挂着的版本号（v2 把它写在
     `publishedItemRevisionStatus.distributionChannels[].crxVersion`），本次要传的不严格高于它就直接停下。
     这条判断放在上传之前才有意义：放在之后，几兆字节已经传完，而商店只接受更高的版本
   - 上传包（请求体就是 zip 的原始字节），再读商店的回执 `uploadState`：明确为 `FAILED` / `NOT_FOUND`
     就变红，读不懂的只报告不拦；然后**默认到此为止**，不调用提审接口

3. **要提审有两个入口**，默认那条工作流不会替你做：
   - **开发者后台**（首选）：Dashboard → 该商品 → Package 页点 **"提交审核"**，见「第二步 · 5. 点击
     "提交审核" (Submit for Review)」。它只发提审请求，不再动包。
   - **重跑工作流**：Actions → Release → Run workflow，填同一个 tag、`dry_run` 取消勾选、勾上
     `submit_for_review`。这一次是「上传 + 提审」连着做完，所以同一个包会重新传一遍；如果上次上传之后
     条目已能读到这个版本号，版本预检会先把这次运行拦下——那是正常保护，改走后台那个按钮即可。

4. **Dry Run 测试**（可选）：
   ```bash
   # 在 GitHub Actions 页面手动触发 workflow_dispatch
   # 勾选 dry_run 选项进行预演，不实际发布
   ```

---

## 第四步：获取扩展 ID

提交审核通过后，在 Chrome Web Store Dashboard 中获取 32 位扩展 ID：

1. 打开 Dashboard → 找到你的扩展
2. 扩展 ID 显示在页面 URL 中：`.../webstore/detail/[EXTENSION_ID]/edit`
3. 复制该 ID 并更新 GitHub Secrets 中的 `CHROME_EXTENSION_ID_TAF`

---

## 第五步：后续版本更新

### 5.1 版本升级流程

1. 改动合进 `main`，`release-prepare.yml` 会开出一个 Release PR（版本自动定为 `1.1.0`，
   依据是提交类型），核对它的正文并合并进去，就是批准发布 —— 细节见 `.github/RELEASE_AUTOMATION.md`
2. 想在本机先看一眼计划：

   ```bash
   pnpm release:plan          # 只算版本与 changelog，不写任何文件
   pnpm release:cut           # 本机落地：写双语文档 + 提交 + 打标签（不会推送）
   ```

3. 手工路径也仍然有效——改 `package.json` 版本号、补 `CHANGELOG.md` 与 `CHANGELOG.en.md`、再打标签：

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. **重要**：新版本必须高于商店线上已发布的版本，否则会被拒绝。`release.yml` 在上传之前会把这条
   规则自己查一遍（见 3.3 的「版本预检」），不再依赖商店的报错来告知

### 5.2 注意事项

- ✅ **每次更新都要升版本号**：版本号等于或低于已上线版本的更新会被直接拒
- ✅ **上传不等于提审**：默认那一步只把包传上去，审核要人显式要求（3.3 第 3 条）
- ✅ **保持文案一致性**：所有商店字段必须与 `_locales` 文件逐字一致
- ✅ **重新运行验证**：`pnpm verify:meta`、`pnpm verify:offline`、`pnpm verify:numbers`、`pnpm verify:listing`（离线那条含产物层，本地要先 `pnpm build`；`verify:numbers` 比对对外文档里的数字与代码里的数字；推 tag 时由 `release.yml` 按构建前/后两层跑齐）

---

## 常见问题

### Q1: 服务账号那条链路报错，怎么定位到哪一环？

A: 按顺序看，四种失败各有各的现场：

1. `403 accessNotConfigured` → GCP 项目没启用 Chrome Web Store API（3.1 第 2 步）
2. 换令牌就 `400`（`invalid_grant` / `unauthorized_client`）→ `CWS_SERVICE_ACCOUNT_EMAIL` 与这份私钥
   不是同一个服务账号，或私钥在粘贴时被改坏了。前者重新配对一对，后者看第 3 条
3. 步骤日志写着「私钥读不出来」→ 粘的不是那三种形状之一，常见于手工把转义还原成真换行还原坏了
4. **令牌换得到、商店调用却 401/403** → 服务账号邮箱没加进开发者信息中心的「账号」页。
   这一条在「校验服务账号凭据」那一步是查不出来的：那一步只做本地能做的两件事（密钥读得出、令牌换得到），
   邮箱是不是成员只有商店调用才知道

老文档里「token 过期」那一问已经不存在了：服务账号每次现签现用，没有需要续期的长期令牌。

### Q2: 扩展 ID 格式错误？

A: 确保：

- 32 位小写字母（a-p）
- 没有空格、换行等不可见字符
- 直接从 Dashboard URL 复制，不要手动输入

### Q3: 审核被拒怎么办？

A: 参考 `CHROMEWEBSTORE.md` 中的"拒审记录与政策口径"章节，常见原因：

- 关键词堆砌：不要在名称、摘要中使用逗号/冒号分隔的格式名列表
- 描述与 manifest 不一致：确保所有字段逐字匹配
- 隐私政策不可达：确保 URL 返回 HTTP 200

### Q4: 如何测试发布流程？

A: 使用 dry run 模式：

```yaml
# 手动触发 workflow_dispatch
dry_run: true # 只验证，不实际发布
```

### Q5: 包上传成功了，商店那边怎么没开始审核？

A: 这是默认行为，不是故障。`release.yml` 默认只把包传上去，提审要人显式发起。首选到开发者后台的
Package 页点 **"提交审核"**，它只发请求、不再动包；也可以用 `workflow_dispatch` 再跑一次 Release
工作流（填同一个 tag、取消勾选 `dry_run`、勾上 `submit_for_review`），差别是这一次会把同一个包重新
传一遍——若条目已能读到那个版本号，版本预检会先把这次运行拦下。两条路的区别与前提见 3.3 第 3 条。

---

## 相关文档

- **商店文案完整模板**：`CHROMEWEBSTORE.md`
- **权限与隐私申报**：`CHROMEWEBSTORE.md` → "权限与隐私申报"
- **拒审记录与应对**：`CHROMEWEBSTORE.md` → "拒审记录与政策口径"
- **发版自动化（Release PR、标签、secrets 清单）**：`.github/RELEASE_AUTOMATION.md`
- **产品说明页**：https://liaolongdong.github.io/transfer-any-file/
- **隐私政策**：https://liaolongdong.github.io/transfer-any-file/privacy.html

---

## 配置检查清单

发布前请确保：

- [ ] GitHub Secrets 配置齐全（发布商级 3 个 + 本扩展专用 1 个；要让标签自动触发发版，再加 `RELEASE_PAT`）
- [ ] 服务账号邮箱已加进开发者信息中心的「账号」页（漏了这步，令牌照样换得到，是商店调用才回 401/403）
- [ ] GCP 项目已启用 Chrome Web Store API
- [ ] 扩展 ID 格式正确（32 位 a-p 字母，`CHROME_EXTENSION_ID_TAF`）
- [ ] 所有验证通过（`pnpm lint:all && pnpm verify:meta && pnpm verify:listing && pnpm build && pnpm verify:offline`）
- [ ] 商店文案与 `_locales` 文件一致
- [ ] 隐私政策 URL 可达
- [ ] 版本号高于线上版本

---

## 联系方式

- **问题反馈**：[GitHub Issues](https://github.com/liaolongdong/transfer-any-file/issues)
- **邮箱**：[924902324@qq.com](mailto:924902324@qq.com)
- **微信**：`lld_1025`（备注「taf」）
