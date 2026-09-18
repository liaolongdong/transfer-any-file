# Chrome Web Store 上架指南 · Transfer Any File

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

5. 注册成功后，记录下 Dashboard 的访问地址（后续配置 CI/CD 时需要）

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
  - 中文详细说明：2,845 字符（上限 16,000）
  - 英文详细说明：7,948 字符（上限 16,000）
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

| 权限 | 用途说明 |
|------|----------|
| `storage` | 保存用户的转换历史（文件名、格式和体积，从不保存文件内容）和界面偏好（主题、颜色模式、语言、通知和确认开关、自定义快捷键）。数据仅存储在设备本地：扩展未声明任何 host 权限，其自身代码不发起任何网络请求。没有更窄的权限可以实现这些功能。 |

**完整中英文说明**（可直接粘贴）：
```
storage: persists the user's own conversion history (file names, formats and sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut) via chrome.storage.local. Nothing leaves the device: the extension declares no host permissions and its own code issues no network request. No narrower permission can do this.
```

### 5. 点击 **"提交审核"** (Submit for Review)

---

## 第三步：配置 CI/CD 自动化发布

### 3.1 获取 OAuth 凭据

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)

2. 创建新项目（或选择已有项目）

3. 启用 **Chrome Web Store API**：
   - 搜索 "Chrome Web Store API"
   - 点击 "启用"

4. 创建 OAuth 2.0 凭据：
   - 进入 "API 和服务" → "凭据"
   - 点击 "创建凭据" → "OAuth 客户端 ID"
   - 应用类型选择 **"桌面应用"**
   - 记录下 **Client ID** 和 **Client Secret**

5. 生成 Refresh Token：
   
   在浏览器中打开以下 URL（替换 YOUR_CLIENT_ID）：
   
   ```
   https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob
   ```
   
   授权后获取授权码，然后用以下命令交换 refresh token：
   
   ```bash
   curl -X POST \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=AUTHORIZATION_CODE" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob" \
     https://oauth2.googleapis.com/token
   ```
   
   响应中的 `refresh_token` 即为所需值。

### 3.2 配置 GitHub Secrets

在 GitHub Repository Settings → Secrets and variables → Actions 中配置以下 4 个 secrets：

```bash
CHROME_EXTENSION_ID  # 32 位扩展 ID（从 CWS Dashboard 获取）
CHROME_CLIENT_ID     # Google Cloud OAuth Client ID
CHROME_CLIENT_SECRET # Google Cloud OAuth Client Secret  
CHROME_REFRESH_TOKEN # OAuth Refresh Token
```

> ⚠️ **重要提示**：
> - 复制 secret 值时确保不带空格/换行等不可见字符
> - 扩展 ID 必须是 32 位 a-p 小写字母
> - OAuth 应用在 Testing 模式下 refresh token 约 7 天过期，建议发布为 In production

### 3.3 发布流程

当前配置使用 `wxt-publish-extension` CLI 工具：

1. **打 Tag**：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **自动触发**：`.github/workflows/release.yml` 会自动执行：
   - 验证 tag 与 package.json 版本一致
   - 运行所有检查（`verify:meta`、`verify:offline`、`verify:listing`）
   - 构建并打包扩展
   - 验证包内容（manifest.json 在根目录，无仓库文件）
   - 创建 GitHub Release
   - 校验 OAuth 凭据
   - 提交到 Chrome Web Store

3. **Dry Run 测试**（可选）：
   ```bash
   # 在 GitHub Actions 页面手动触发 workflow_dispatch
   # 勾选 dry_run 选项进行预演，不实际发布
   ```

---

## 第四步：获取扩展 ID

提交审核通过后，在 Chrome Web Store Dashboard 中获取 32 位扩展 ID：

1. 打开 Dashboard → 找到你的扩展
2. 扩展 ID 显示在页面 URL 中：`.../webstore/detail/[EXTENSION_ID]/edit`
3. 复制该 ID 并更新 GitHub Secrets 中的 `CHROME_EXTENSION_ID`

---

## 第五步：后续版本更新

### 5.1 版本升级流程

1. 修改 `package.json` 中的版本号
2. 更新 `CHANGELOG.md` 和 `CHANGELOG.en.md`
3. 提交并打新 tag：
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. **重要**：新版本必须高于商店线上已发布的版本，否则会被拒绝

### 5.2 注意事项

- ✅ **每次更新都要升版本号**：版本号等于或低于已上线版本的更新会被直接拒
- ✅ **保持文案一致性**：所有商店字段必须与 `_locales` 文件逐字一致
- ✅ **重新运行验证**：`pnpm verify:meta`、`pnpm verify:offline`、`pnpm verify:listing`

---

## 常见问题

### Q1: OAuth token 过期怎么办？

A: 刷新 token 的流程：
1. 将 OAuth 应用发布为 In production（避免 7 天过期）
2. 或重新走授权流程生成新的 refresh token
3. 更新 GitHub Secrets 中的 `CHROME_REFRESH_TOKEN`

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
dry_run: true  # 只验证，不实际发布
```

---

## 相关文档

- **商店文案完整模板**：`CHROMEWEBSTORE.md`
- **权限与隐私申报**：`CHROMEWEBSTORE.md` → "权限与隐私申报"
- **拒审记录与应对**：`CHROMEWEBSTORE.md` → "拒审记录与政策口径"
- **产品说明页**：https://liaolongdong.github.io/transfer-any-file/
- **隐私政策**：https://liaolongdong.github.io/transfer-any-file/privacy.html

---

## 配置检查清单

发布前请确保：

- [ ] GitHub Secrets 配置齐全（4 个）
- [ ] OAuth 应用状态正常（In production 或 token 未过期）
- [ ] 扩展 ID 格式正确（32 位 a-p 字母）
- [ ] 所有验证通过（`pnpm verify:all`）
- [ ] 商店文案与 `_locales` 文件一致
- [ ] 隐私政策 URL 可达
- [ ] 版本号高于线上版本

---

## 联系方式

- **问题反馈**：[GitHub Issues](https://github.com/liaolongdong/transfer-any-file/issues)
- **邮箱**：[924902324@qq.com](mailto:924902324@qq.com)
- **微信**：`lld_1025`（备注「taf」）
