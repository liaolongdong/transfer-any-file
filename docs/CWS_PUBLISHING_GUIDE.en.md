# Chrome Web Store Publishing Guide · Transfer Any File

This document records the complete process and key configurations for publishing Transfer Any File to Chrome Web Store.

## 📋 Prerequisites

- Google account (already have)
- Dual-currency credit/debit card (for $5 registration fee)
- Stable network proxy (to access Google services)

---

## Step 1: Register as Chrome Web Store Developer

1. Open Chrome Web Store Developer Dashboard:
   https://chrome.google.com/webstore/devconsole

2. Log in with your Google account

3. Accept the developer agreement

4. Pay the one-time $5 registration fee (use dual-currency card)

5. After successful registration, note the Dashboard access URL (needed for CI/CD configuration)

> **Tip**: Registration requires accessing Google services; choose a time with stable network conditions.

---

## Step 2: Create Extension Listing

In Developer Dashboard:

### 1. Click **"New Item"**

### 2. Upload extension zip package

```
.output/transfer-any-file-{version}-chrome.zip
```

> 💡 **Version Management**: The version number in the zip filename follows `package.json`. Use the latest build artifact from `.output/` directory. Ensure the version is higher than the published version on the store (no restriction for first submission).

### 3. Fill in Store Information (Store Listing)

#### **Basic Information**:

- **Name**:
  - Chinese (default language): `文件格式任意转换助手 — 离线转换无上传` (28/75 characters)
  - English: `Transfer Any File — Offline File Format Converter` (49/75 characters)
  - ⚠️ **Must match `public/_locales/*/messages.json` `extensionName` verbatim**

- **Short Description** (132 character hard limit):
  - Chinese: **`在本机浏览器内互转 14 种常见的文档、表格与图片格式。支持混合批量、多步链路、预览编辑与 ZIP 打包，全程离线，不上传、无账号。`** (66/132 characters)
  - English: **`Convert between 14 common document, spreadsheet and image file formats right in your browser — offline, in batches, no uploads.`** (127/132 characters)
  - ✅ **Authoritative source**: `extensionDescription` in `public/_locales/zh_CN/messages.json` and `en/messages.json` (manifest references via `__MSG_extensionDescription__`)
  - ⚠️ **Store listing must paste the same sentence** — both versions must match exactly, otherwise review will flag inconsistency between description and manifest

- **Full Description**:
  - See "Store Copy" section in `CHROMEWEBSTORE.md`
  - Chinese detailed description: 2,845 characters (limit 16,000)
  - English detailed description: 7,948 characters (limit 16,000)
  - ✅ **Avoids keyword stuffing risk**: No format name lists separated by commas/colons in any field

- **Category**: Productivity

- **Single Purpose**:
  ```
  Converts user-selected documents, spreadsheets and images between common file formats entirely on the local machine.
  ```

- **Primary Language**: Chinese (China)

- **Additional Languages**: English (United States)

#### **Graphics & Assets**:

- **Store Icon**: 128×128 px (`public/icon/128.png`)
- **Screenshots**: At least 1, **up to 5 per language page**, size must be **1280×800**, format JPEG / 24-bit PNG
  - Chinese page: Select 5 `-zh.png` files from `docs/assets/store/screens/`
  - English page: Select 5 English caption versions from `docs/assets/store/screens/`
  - ✅ **Recommended order**: `screen-01-workbench`, `02-batch`, `03-zip`, `04-preview`, `07-presets`
- **Small Promo Tile** (optional): 440×280 px (`docs/assets/store/cws-small-promo.png`)
- **Marquee Promo Tile** (optional): 1400×560 px (`docs/assets/store/cws-marquee-promo.png`)

#### **Privacy Policy**:

- **Privacy Policy URL**: `https://liaolongdong.github.io/transfer-any-file/privacy.html`
- ✅ **Reachability verified**: `curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1` returns `HTTP/2 200`

#### **Data Usage Declaration**:

- ✅ **Check**: This developer collects user data
- **Data handling description**:
  - User files: Read and processed in local memory, not uploaded
  - Conversion history: Only metadata (filename, format, size) stored, never file contents
  - Preferences: Stored in extension local storage
  - ❌ **Not collected**: Any user file contents, no uploads, no sharing with third parties
- **Privacy policy text**:
  ```
  Files are read into the extension page's memory, converted there, and returned to the user as a download. Conversion history and preferences are stored locally via chrome.storage.local. No data is transmitted, uploaded, synced or shared with anyone, including the developer; there is no server.
  ```

### 4. Permissions Justification

| Permission | Purpose |
|------------|---------|
| `storage` | Persists the user's own conversion history (file names, formats and sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut). Data only stored locally on device: extension declares no host permissions, its own code issues no network requests. No narrower permission can achieve these functions. |

**Complete bilingual explanation** (ready to paste):
```
storage: persists the user's own conversion history (file names, formats and sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut) via chrome.storage.local. Nothing leaves the device: the extension declares no host permissions and its own code issues no network request. No narrower permission can do this.
```

### 5. Click **"Submit for Review"**

---

## Step 3: Configure CI/CD Automated Publishing

### 3.1 Obtain OAuth Credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/)

2. Create new project (or select existing)

3. Enable **Chrome Web Store API**:
   - Search for "Chrome Web Store API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **"Desktop app"**
   - Note down **Client ID** and **Client Secret**

5. Generate Refresh Token:
   
   Open the following URL in browser (replace YOUR_CLIENT_ID):
   
   ```
   https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob
   ```
   
   After authorization, exchange the authorization code for refresh token:
   
   ```bash
   curl -X POST \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=AUTHORIZATION_CODE" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob" \
     https://oauth2.googleapis.com/token
   ```
   
   The `refresh_token` in response is what you need.

### 3.2 Configure GitHub Secrets

Configure these 4 secrets in GitHub Repository Settings → Secrets and variables → Actions:

```bash
CHROME_EXTENSION_ID  # 32-character extension ID (from CWS Dashboard)
CHROME_CLIENT_ID     # Google Cloud OAuth Client ID
CHROME_CLIENT_SECRET # Google Cloud OAuth Client Secret  
CHROME_REFRESH_TOKEN # OAuth Refresh Token
```

> ⚠️ **Important notes**:
> - Ensure secret values have no spaces/newlines or invisible characters when copying
> - Extension ID must be 32 lowercase letters (a-p)
> - OAuth apps in Testing mode have ~7-day refresh token expiry; recommend publishing as In production

### 3.3 Publishing Flow

Current configuration uses `wxt-publish-extension` CLI tool:

1. **Create Tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Auto-trigger**: `.github/workflows/release.yml` automatically executes:
   - Verify tag matches package.json version
   - Run all checks (`verify:meta`, `verify:offline`, `verify:listing`)
   - Build and package extension
   - Validate package contents (manifest.json at root, no repo files)
   - Create GitHub Release
   - Verify OAuth credentials
   - Submit to Chrome Web Store

3. **Dry Run Test** (optional):
   ```yaml
   # Manually trigger workflow_dispatch from GitHub Actions page
   dry_run: true  # Verification only, no actual publishing
   ```

---

## Step 4: Get Extension ID

After approval, obtain the 32-character extension ID from Chrome Web Store Dashboard:

1. Open Dashboard → Find your extension
2. Extension ID appears in page URL: `.../webstore/detail/[EXTENSION_ID]/edit`
3. Copy this ID and update `CHROME_EXTENSION_ID` in GitHub Secrets

---

## Step 5: Subsequent Version Updates

### 5.1 Version Upgrade Process

1. Modify version number in `package.json`
2. Update `CHANGELOG.md` and `CHANGELOG.en.md`
3. Commit and create new tag:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. **Important**: New version must be higher than the published version on store, otherwise will be rejected

### 5.2 Notes

- ✅ **Increment version for each update**: Versions equal to or lower than already published will be directly rejected
- ✅ **Maintain文案consistency**: All store fields must match `_locales` files verbatim
- ✅ **Re-run validations**: `pnpm verify:meta`, `pnpm verify:offline`, `pnpm verify:listing`

---

## FAQ

### Q1: What if OAuth token expires?

A: To refresh token:
1. Publish OAuth app to In production status (avoid 7-day expiry)
2. Or re-authenticate to generate new refresh token
3. Update `CHROME_REFRESH_TOKEN` in GitHub Secrets

### Q2: Extension ID format error?

A: Ensure:
- 32 lowercase letters (a-p)
- No spaces, newlines or invisible characters
- Copy directly from Dashboard URL, don't type manually

### Q3: Rejected during review?

A: Refer to "Rejection Records and Policy Guidelines" section in `CHROMEWEBSTORE.md`. Common reasons:
- Keyword stuffing: Don't use format name lists separated by commas/colons in name/summary
- Description inconsistent with manifest: Ensure all fields match verbatim
- Privacy policy unreachable: Ensure URL returns HTTP 200

### Q4: How to test publishing flow?

A: Use dry run mode:
```yaml
# Manually trigger workflow_dispatch
dry_run: true  # Verify only, no actual publishing
```

---

## Related Documentation

- **Complete store copy template**: `CHROMEWEBSTORE.md`
- **Permissions and privacy disclosure**: `CHROMEWEBSTORE.md` → "Permissions and Privacy Disclosure"
- **Rejection records and responses**: `CHROMEWEBSTORE.md` → "Rejection Records and Policy Guidelines"
- **Product page**: https://liaolongdong.github.io/transfer-any-file/
- **Privacy policy**: https://liaolongdong.github.io/transfer-any-file/privacy.html

---

## Pre-publishing Checklist

Before publishing, ensure:

- [ ] GitHub Secrets configured completely (4 items)
- [ ] OAuth app status normal (In production or token not expired)
- [ ] Extension ID format correct (32 a-p lowercase letters)
- [ ] All validations passed (`pnpm verify:all`)
- [ ] Store copy consistent with `_locales` files
- [ ] Privacy policy URL reachable
- [ ] Version number higher than online version

---

## Contact

- **Issue reporting**: [GitHub Issues](https://github.com/liaolongdong/transfer-any-file/issues)
- **Email**: [924902324@qq.com](mailto:924902324@qq.com)
- **WeChat**: `lld_1025` (note "taf")
