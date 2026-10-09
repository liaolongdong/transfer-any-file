# Chrome Web Store Publishing Guide · Transfer Any File

[简体中文](CWS_PUBLISHING_GUIDE.md) · English

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

5. Once registered, note the UUID in the devconsole URL — that is the publisher ID, and 3.2 asks for it

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
  - Chinese detailed description: 3,142 characters (limit 16,000)
  - English detailed description: 8,902 characters (limit 16,000)
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

| Permission | Purpose                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`  | Persists the user's own conversion history (file names, formats and sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut). Data only stored locally on device: extension declares no host permissions, its own code issues no network requests. No narrower permission can achieve these functions. |

**Complete bilingual explanation** (ready to paste):

```
storage: persists the user's own conversion history (file names, formats and sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut) via chrome.storage.local. Nothing leaves the device: the extension declares no host permissions and its own code issues no network request. No narrower permission can do this.
```

### 5. Click **"Submit for Review"**

---

## Step 3: Configure CI/CD Automated Publishing

### 3.1 Obtain Service Account Credentials (Chrome Web Store API v2)

Publishing runs on **API v2 with a service account**: there is no Client ID / Client Secret / Refresh Token
any more, and nobody clicks "consent" in a browser. The old chain is dead at both ends — its authorisation URL
uses `redirect_uri=urn:ietf:wg:oauth:2.0:oob`, which Google blocked for new clients on 2022-02-28 and for
**all** clients on 2023-01-31 (the consent endpoint answers `Error 400: bad_request` before it even looks at
the client), and the v1.1 endpoints themselves stop serving on **2026-10-15**.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project (or reuse one)
2. "APIs & Services" → "Library" → search **Chrome Web Store API** → Enable.
   Without this the token still exchanges and the call comes back `403 accessNotConfigured`,
   which is why this step is first in the chain
3. "IAM & Admin" → "Service Accounts" → create one. Name it anything; **you do not need to grant it a single
   GCP IAM role** — the store authorises the account by it appearing in your publisher's member list
   (step 5), not by anything GCP says about it
4. "Service Accounts" → that account → "Keys" → "Add key" → "Create new key" → JSON → download.
   The two fields you need from the file are `client_email` and `private_key`. Once you have pasted them,
   **do not leave that file inside the repository** — `git add .` would sweep it up, and this pipeline only
   reads the values from GitHub Secrets, so the file has no reason to live here. (The `.env.submit` line in
   `.gitignore` guards the older shape; it cannot guard a JSON file with a randomly generated name.)
5. Open the Developer Dashboard at <https://chrome.google.com/webstore/devconsole> and add that
   `client_email` on the "Users" (账号) page. **A publisher can currently have only one service account**,
   so every item under the same publisher shares it — do not create one per extension
6. Note the **publisher ID**: the UUID in `https://chrome.google.com/webstore/devconsole/<uuid>`. It is the
   first segment of the v2 resource name `publishers/{publisherId}/items/{itemId}`

> v2 offers exactly five actions: `fetchStatus` / `upload` / `publish` / `cancelSubmission` /
> `setPublishedDeployPercentage`. Creating an item is **not** among them, and neither is changing the
> visibility — so section 2 of this guide is not going away.

### 3.2 Configure GitHub Secrets

Configure these secrets in GitHub Repository Settings → Secrets and variables → Actions. The first three are
**publisher-level** (the same values in every repository under that publisher); only the extension ID is
per-extension:

**Publisher level:**

```bash
CWS_PUBLISHER_ID                 # Publisher ID: the UUID in the devconsole URL
CWS_SERVICE_ACCOUNT_EMAIL        # The service account's client_email
CWS_SERVICE_ACCOUNT_PRIVATE_KEY  # That service account's private key
```

**This extension only:**

```bash
CHROME_EXTENSION_ID_TAF  # Transfer Any File extension ID (from CWS Dashboard, 32 lowercase a-p letters)
```

> ⚠️ **Important notes**:
>
> - The private key is read in all three shapes people actually paste: the whole JSON file, the `private_key`
>   field value copied out of that JSON (where the newlines are still literal backslash-n and the equals signs
>   are still JSON escapes), and a PEM already restored to real multiple lines. An unrecognisable one is
>   reported by shape, and the key is never printed — see `scripts/cws-token.mjs`
> - Still, **paste the whole JSON or the multi-line PEM**: hand-restoring the escapes is the easiest of the
>   three shapes to get wrong
> - GitHub has no org-level secret sharing for personal accounts, so the three publisher values go into
>   **each repository** (identical values)
> - Extension ID must be 32 lowercase letters (a-p), with no spaces or newlines from the copy
> - A service account has no "~7-day token expiry": each run signs a fresh 5-minute RS256 JWT and exchanges it
>   for an access token, and there is no OAuth app to publish as "In production". Both of those older warnings
>   retired with the refresh token

### 3.3 Publishing Flow

Current configuration uses the runner's own `curl` against the Chrome Web Store **API v2** upload / publish
endpoints — **no third-party npm package or action**. Only the token exchange is first-party code
(`scripts/cws-token.mjs`), because an RS256 signature is not something shell can write:

1. **Prepare the version** (recommended path; the full automation is in `.github/RELEASE_AUTOMATION.md`):
   once changes land on `main`, `release-prepare.yml` computes the version, promotes the `Unreleased`
   sections of both changelogs and opens a Release PR. **Merging that PR is the approval to release**; the
   same workflow then creates the tag. The manual route still works:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Auto-trigger**: `.github/workflows/release.yml` automatically executes:
   - Verify tag matches package.json version
   - Run the source-layer checks (`verify:meta`, `verify:offline:source`, `verify:numbers`, `verify:listing`)
   - Build the extension, run `verify:offline` and `verify:remote-code` again against the artifact (asserting the manifest the browser loads holds only `storage`, and that the bundle carries no remotely hosted code), then package it
   - Validate package contents (manifest.json at root, no repo files)
   - Create GitHub Release
   - Verify the service account credentials (sign a fresh JWT and exchange it for an access token; on failure
     print Google's response body verbatim) and the extension ID format
   - **Version pre-flight**: read the version the store currently carries with `:fetchStatus` (in v2 it lives
     at `publishedItemRevisionStatus.distributionChannels[].crxVersion`) and stop unless this package is
     strictly higher. Deciding this _before_ the upload is the point: afterwards the megabytes are already
     sent and the only witness is the store's own response
   - Upload the package (the request body is the raw zip bytes) and read the store's receipt, `uploadState`:
     `FAILED` / `NOT_FOUND` turn the step red, anything unreadable is reported and passed through. Then
     **stop by default**: the submit-for-review call is not made

3. **Two ways to submit for review** — the workflow above will not do it for you:
   - **Developer dashboard** (preferred): on the item's Package page click **"Submit for review"**,
     see item 5 of Step 2. It only sends the request and does not touch the package.
   - **Run the workflow again**: Actions → Release → Run workflow, same tag, uncheck `dry_run`, check
     `submit_for_review`. That run does upload _and_ submit back to back, so the same package is uploaded a
     second time; if the item already reports that version, the version pre-flight stops the run first — that
     is the guard working, so use the dashboard button instead.

4. **Dry Run Test** (optional):
   ```yaml
   # Manually trigger workflow_dispatch from GitHub Actions page
   dry_run: true # Verification only, no actual publishing
   ```

---

## Step 4: Get Extension ID

After approval, obtain the 32-character extension ID from Chrome Web Store Dashboard:

1. Open Dashboard → Find your extension
2. Extension ID appears in page URL: `.../webstore/detail/[EXTENSION_ID]/edit`
3. Copy this ID and update `CHROME_EXTENSION_ID_TAF` in GitHub Secrets

---

## Step 5: Subsequent Version Updates

### 5.1 Version Upgrade Process

1. Land the changes on `main` and let `release-prepare.yml` open a Release PR (the version comes out as
   `1.1.0` on its own, derived from the commit types) — reviewing and merging that PR is the approval to
   release. Details in `.github/RELEASE_AUTOMATION.md`
2. To look at the plan locally first:

   ```bash
   pnpm release:plan          # compute version and changelog, write nothing
   pnpm release:cut           # apply locally: bilingual docs + commit + tag (never pushes)
   ```

3. The manual route is still available — edit the `package.json` version, update `CHANGELOG.md` and
   `CHANGELOG.en.md`, then tag:

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. **Important**: the new version must be higher than the one already published on the store, otherwise it is
   rejected. `release.yml` now checks that rule itself before uploading (the "version pre-flight" in 3.3)
   instead of waiting for the store to report it

### 5.2 Notes

- ✅ **Increment version for each update**: Versions equal to or lower than already published will be directly rejected
- ✅ **Uploading is not submitting for review**: by default that step only pushes the package up; the review request needs an explicit human decision (item 3 of 3.3)
- ✅ **Maintain copy consistency**: All store fields must match `_locales` files verbatim
- ✅ **Re-run validations**: `pnpm verify:meta`, `pnpm verify:offline`, `pnpm verify:numbers`, `pnpm verify:listing` (the offline one includes the artifact layer, so build locally first with `pnpm build`; `verify:numbers` reconciles the figures in the outward prose against the code; on a tag push `release.yml` runs both layers, before and after the build)

---

## FAQ

### Q1: How do I tell which link in the service account chain broke?

A: Four failures, four different scenes — check them in this order:

1. `403 accessNotConfigured` → the GCP project has not enabled the Chrome Web Store API (3.1 step 2)
2. The token exchange itself returns `400` (`invalid_grant` / `unauthorized_client`) → the
   `CWS_SERVICE_ACCOUNT_EMAIL` and this private key are not the same service account, or the key broke on the
   way in. Pair them again, or look at 3
3. The step says「私钥读不出来」(private key unreadable) → what was pasted is not one of the three shapes;
   most often a hand-restored escape sequence that no longer parses
4. **The token exchanges fine but the store call returns 401/403** → the service account's email was never
   added on the Developer Dashboard's user page. The "Verify Chrome Web Store service account" step cannot see
   this: it only proves the two things that are checkable locally (the key parses, the token exchanges), and
   membership is only revealed by the store call itself

The old "what if the token expires" question no longer exists: a service account signs what it uses, there is
no long-lived token to renew.

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
dry_run: true # Verify only, no actual publishing
```

### Q5: The package uploaded but review has not started?

A: That is the default, not a failure. `release.yml` only pushes the package up; the review request has to be
started by a person. Prefer the developer dashboard's Package page and click **"Submit for review"** — it sends
the request without touching the package. Alternatively run the Release workflow again via `workflow_dispatch`
(same tag, uncheck `dry_run`, check `submit_for_review`), which uploads the same package a second time and may
therefore be stopped by the version pre-flight. Item 3 of 3.3 spells out both routes.

---

## Related Documentation

`CHROMEWEBSTORE.md` is written in Chinese (it is paste-ready material for the CWS console, not a bilingual doc),
so its section names are quoted verbatim below:

- **Complete store copy template**: `CHROMEWEBSTORE.md`
- **Permissions and privacy disclosure**: `CHROMEWEBSTORE.md` → "权限与隐私申报"
- **Rejection records and responses**: `CHROMEWEBSTORE.md` → "拒审记录与政策口径"
- **Release automation (Release PR, tags, secrets list)**: `.github/RELEASE_AUTOMATION.md`
- **Product page**: https://liaolongdong.github.io/transfer-any-file/
- **Privacy policy**: https://liaolongdong.github.io/transfer-any-file/privacy.html

---

## Pre-publishing Checklist

Before publishing, ensure:

- [ ] GitHub Secrets configured completely (3 publisher-level values + 1 extension-specific ID; add `RELEASE_PAT` too if the tag should start the release on its own)
- [ ] The service account's email is added on the Developer Dashboard's user page (skip this and the token still exchanges — the store call is what answers 401/403)
- [ ] The GCP project has the Chrome Web Store API enabled
- [ ] Extension ID format correct (32 a-p lowercase letters, `CHROME_EXTENSION_ID_TAF`)
- [ ] All validations passed (`pnpm lint:all && pnpm verify:meta && pnpm verify:listing && pnpm build && pnpm verify:offline`)
- [ ] Store copy consistent with `_locales` files
- [ ] Privacy policy URL reachable
- [ ] Version number higher than online version

---

## Contact

- **Issue reporting**: [GitHub Issues](https://github.com/liaolongdong/transfer-any-file/issues)
- **Email**: [924902324@qq.com](mailto:924902324@qq.com)
- **WeChat**: `lld_1025` (note "taf")
