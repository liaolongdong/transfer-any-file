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
  - Chinese detailed description: 3,317 characters (limit 16,000)
  - English detailed description: 9,413 characters (limit 16,000)
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

### 3.0 First work out which pieces are missing right now (read-only, any time)

Every other section of this document describes the **intended state**, while the reasons a chain does not run
almost always live in the repository's settings. GitHub Secrets are **write-only**, so what can be checked is
whether a _name_ is present, never whether its _value_ is right. Run these five before configuring anything —
they are all GETs and write not a single byte:

```bash
R=liaolongdong/transfer-any-file

gh api repos/$R/actions/secrets --jq '.secrets[].name'                     # ① are the four new names present
gh api repos/$R/environments/cws-release --jq '[.protection_rules[].type]' # ② does the gate have teeth
gh api repos/$R/environments/cws-release/secrets --jq '.total_count'       # ③ must be 0
gh api repos/$R/actions/variables --jq '.variables[].name'                 # ④ CWS_AUTO_SUBMIT
git ls-remote --tags origin | wc -l                                        # ⑤ does any tag exist at all
```

| Reading                                                                                                                           | What it means                                                                                                                                                     | Where to fix it |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| ① missing any of `CHROME_EXTENSION_ID_TAF` / `CWS_PUBLISHER_ID` / `CWS_SERVICE_ACCOUNT_EMAIL` / `CWS_SERVICE_ACCOUNT_PRIVATE_KEY` | Both store steps are **silently skipped together**, the summary says "已跳过 Chrome 应用商店", and the run stays green                                            | 3.2             |
| ① contains `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_EXTENSION_ID`                                                             | Those three are the v1.1 leftovers; the new chain never reads them — **do not count them as "three configured"** (Q17)                                            | 3.2             |
| ② is `[]`                                                                                                                         | The environment exists but **there is no gate**: once `store_submit` queues it runs straight through                                                              | 3.4             |
| ② contains only `wait_timer`, no `required_reviewers`                                                                             | A **fake gate**: the timer expires and the job proceeds with nobody approving anything (Q16)                                                                      | 3.4             |
| ③ is not `0`                                                                                                                      | The credentials were configured at environment scope, so only `store_submit` can see them — the upload step lives in the `release` job and cannot                 | 3.2             |
| ④ has no `CWS_AUTO_SUBMIT`                                                                                                        | The submission job does not even queue — deliberate fail-closed behaviour                                                                                         | 3.4 step 6      |
| ⑤ is `0`                                                                                                                          | Depths 1 / 2 / 3 **cannot run right now**: `Check out the tag` uses `inputs.tag`, and a ref that does not exist fails at the checkout. Only depth 0 is unaffected | Q19             |

Readings ② ③ ④ together explain the single most misread situation on this chain: **the pipeline is all green while
the store received nothing**. No step failed — those two steps never executed. `Detect Chrome Web Store credentials`
asserts "all four are non-empty", and a missing one writes a single skip line instead of an error.

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
6. Note the **publisher ID**: open a listing's edit page and the address bar looks like
   `https://chrome.google.com/webstore/devconsole/{A}/{B}/edit` — `{A}` is the segment you need, `{B}` is the
   item (extension) ID. `{A}` is the first segment of the v2 resource name
   `publishers/{publisherId}/items/{itemId}`; for this publisher it is a **36-character UUID containing `-`,
   not a run of digits**. Three candidates all look plausible and exactly one of them works:

   | Candidate                                                        | What it actually is                                                                                          | Can it go in `CWS_PUBLISHER_ID`     |
   | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
   | First segment of the devconsole address bar (36-char UUID shape) | The ID of the publisher (developer account); first segment of the v2 resource path                           | ✅ this is the one                  |
   | "Unique ID" on the service account page (21 digits)              | A number Cloud IAM assigned to _this service account_, used to build `<that number>@iam.gserviceaccount.com` | ❌ unrelated to store authorisation |
   | Cloud project's project number (digits)                          | The GCP project number                                                                                       | ❌                                  |

   > ⚠️ **Nothing else catches a wrong entry in this field.** The v2 API definition only requires that segment
   > to contain no `/`, so "legal shape, but the value is some other number" travels all the way to Google and
   > comes back `403 PERMISSION_DENIED` on the **first, read-only hop** `:fetchStatus` — not 404, and it does
   > not wait for a write endpoint. The `publishers/***/items/***` line in the CI log does not help: `***` is
   > GitHub masking a Secret's value, and any non-empty, well-formed value masks exactly like that. The
   > sibling repository account-password-helper landed on precisely this on 2026-10-11. Secrets are
   > write-only, so the remedy is not "compare against the old value" but **overwrite it once with the string
   > from the address bar**, then verify with the read-only depth below (depth 0 in 3.3). Causes and the
   > judging procedure: FAQ Q14.

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
> - **All four values belong under Repository secrets, not under the `cws-release` environment's secrets.**
>   GitHub makes environment-scoped secrets visible only to jobs that declare that environment, and the
>   **upload** step lives in the `release` job (which does not): the cost of putting them in the wrong scope is
>   not an error but `store_ready=false` with both store steps silently skipped (the symptom is Q6). Only
>   `store_submit` can see environment-level values, which is exactly how you get the hardest shape to
>   explain — "submission went green but no package was ever uploaded"
> - **If the private key in plaintext ever appeared in a chat window, an Issue / PR comment, a CI log, a
>   terminal scrollback or a commit, it is leaked** — rotation is the only remedy, deletion is not: removing
>   the message does not undo it, since it may already be cached or indexed. Four rotation steps: Cloud
>   Console → that service account → Keys → delete the old key → create a new JSON key → paste it into
>   `CWS_SERVICE_ACCOUNT_PRIVATE_KEY` using the method below (a Secret is replaced whole) → run the read-only
>   depth once to confirm the new key works, then **delete the JSON file you downloaded**. **Rotating a key
>   under the same service account leaves `client_email` unchanged**, so step 5 of 3.1 (the Dashboard member
>   row) does not need redoing; only if you retire the account itself and move to a new address do you remove
>   the old email from the Dashboard first — and `CWS_SERVICE_ACCOUNT_EMAIL` must come from **the same JSON
>   file** as the key you paste, because changing only one of the two makes the token exchange fail outright

That "any paste shape works" claim is measured in this repository, not inferred (every exit of
`normalizePrivateKey` was fed each shape; the counts below come from a freshly generated 2048-bit RSA PKCS#8
key on 2026-10-11 — the target shape is **28 lines**, and writing the newlines as the two-character literal
`\n` yields **1 line / 1732 characters**):

| What you pasted                                            | `scripts/cws-token.mjs` | The sentence it reports on failure                                        |
| ---------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| Multi-line PEM (both BEGIN and END present, real newlines) | ✅                      | —                                                                         |
| The whole service-account JSON file                        | ✅                      | — (only "no … in the JSON" if there is no non-empty `private_key` inside) |
| The `private_key` field value, newlines still literal `\n` | ✅                      | — (the script restores them)                                              |
| CRLF line endings, extra blank lines around it             | ✅                      | —                                                                         |
| Pasted together with JSON's surrounding double quotes      | ❌                      | `私钥不是一把能用的 RSA 私钥：error:1E08010C…`                            |
| Only the middle base64, both boundary lines missing        | ❌                      | `认不出 PEM 头（期望 "-----BEGIN …"）`                                    |
| BEGIN present, END missing                                 | ❌                      | `私钥不是一把能用的 RSA 私钥：error:1E08010C…`                            |

So: **"the whole thing on one line" is not a broken shape here** (the script converts literal `\n` back),
what actually goes red is losing the two boundary lines or dragging the quotes in; each of the three failures
has its own sentence and the two quoted above are enough to locate it. The recommended retrieval method still
produces real newlines, so you are not relying on that fallback (`pbcopy` is macOS; on Linux use
`xclip -selection clipboard`):

```bash
SA_JSON=~/Downloads/service-account.json    # the path of the file you downloaded
node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).private_key)' "$SA_JSON" | pbcopy
```

To check before pasting that what is on the clipboard is a usable key (no network, nothing written to disk,
the content is never echoed — only structural facts):

```bash
pbpaste | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{require("crypto").createPrivateKey(s);console.log("parses | lines",s.trimEnd().split("\n").length,"| literal \\n present:",s.includes("\\n"))}catch(e){console.log("still broken: ",e.message)}})'
```

### 3.3 Publishing Flow

Current configuration uses the runner's own `curl` against the Chrome Web Store **API v2** upload / publish
endpoints — **no third-party npm package or action**. Only the token exchange is first-party code
(`scripts/cws-token.mjs`), because an RS256 signature is not something shell can write:

**Four execution depths**, each lower one closer to a real submission. Depth 0 exists because the other three
all presuppose "build + upload", and when the credentials or one of those two IDs is wrong the last thing you
want is to ship a package first and guess afterwards (one of the three 1.0.0 rejections spent its cost exactly
that way):

| Depth                 | How to trigger                                                                         | What it does                                                                                        | Human approval? | When to use it                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| **0 read-only**       | Manual run, tick `store_status_only` (`tag` may stay empty)                            | Sign a fresh token + one `:fetchStatus`; write the live version and store-side state to the summary | No              | Verify credentials before the first real release; check at any time which version is on the store |
| **1 Dry run**         | Manual run, `dry_run` left ticked (it is ticked by default)                            | Build + every guard + package-content checks; no Release, store untouched                           | No              | After touching manifest / dependencies / bundling, confirm the artifact itself is compliant       |
| **2 Upload only**     | Push a `v*` tag; or a manual run that does **not** tick `submit_for_review`            | Runs the release and the upload, then stops (the `release` job never calls `:publish`)              | No              | The default shape: hand the package to the store, decide later whether to involve review          |
| **3 Upload + submit** | Manual run ticking `submit_for_review`, plus `CWS_AUTO_SUBMIT=true` and the gate built | Depth 2 + `store_submit` queues for `cws-release` approval → `:publish` once approved               | **Yes**         | The real release (the tag-push path becomes this depth once the gate is configured)               |

> ⚠️ The depth-0 checkbox is called `store_status_only` and is a field added by this change. GitHub builds the
> dispatch form from **the workflow file as it exists on the ref you select**, so this depth is only visible on
> the branch this file was merged into; triggering from a branch that does not have it shows no such checkbox
> and runs that ref's older definition. Likewise the workflow list on the Actions page is driven by the default
> branch.

1. **Prepare the version** (recommended path; the full automation is in `.github/RELEASE_AUTOMATION.md`):
   once changes land on `main`, `release-prepare.yml` computes the version, promotes the `Unreleased`
   sections of both changelogs and opens a Release PR. **Merging that PR is the approval to release**; the
   same workflow then creates the tag. The manual route still works:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Auto-trigger (the upload job, `release`)**: `.github/workflows/release.yml` automatically executes:
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
     `FAILED` / `NOT_FOUND` turn the step red, anything unreadable is reported and passed through

   **That job then ends. It never calls `:publish`.**

3. **The submit job, `store_submit`, waits at the door**: it carries the `cws-release` environment's
   Required reviewers. Once the gate is configured (3.4) the run shows **Waiting**, and opening it reveals a
   "Review deployments" card with an Approve button next to `cws-release`. **Not one line of that job's script
   runs before somebody presses it**, and until then the store holds nothing but the draft revision just
   uploaded — users see no change.

   After a human approves, the job does three things:

   - Ask `:fetchStatus` again. Approval can come hours or days after the upload — long enough that someone
     clicked "Submit for review" in the dashboard themselves, or long enough that the package is still being
     processed. Publishing straight away in either case either returns an error nobody can read, or worse,
     **publishes whichever revision happens to be in the review queue as if it were this one**. So this step
     reads `submittedItemRevisionStatus` (the revision already submitted for publishing) and
     `lastAsyncUploadState` (only set if an async upload happened within the past 24 hours), and hands the
     decision to `scripts/release-ci.mjs submit-check` — that "response shape → exit code" table is committed as
     `pnpm verify:release-ci`, which CI's lint job replays on every push, so changing a verdict means changing
     the table in the same commit
   - Call `:publish` only when the verdict is "go", with body `{"publishType":"DEFAULT_PUBLISH"}` — publish
     to all users as soon as review passes, the equivalent of the old `publishTarget=default`
   - Skip **without failing** when this version is already on the store's side (submitting twice would put two
     copies of the same package in the review queue), and stop red with the reason written into the annotation
     when the store's state says no

   The publish response goes through `publish-state` as well: HTTP 200 with `state` `REJECTED` / `CANCELLED`
   is always red, and `PUBLISHED_TO_TESTERS` is called out in the receipt as "published to testers only".

4. **Three entry points to submitting**, sorted by who presses the publish key:

   | Entry point                                                           | When to use it                                                            | Re-upload the package?                                                                                                                                                                     |
   | --------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | **The approval gate** (recommended; the default path once configured) | Merge the Release PR → upload runs automatically → someone clicks Approve | No. `:publish` publishes the revision just uploaded                                                                                                                                        |
   | **Developer dashboard**                                               | The gate is not configured, or you want to submit by hand right now       | No. Dashboard → the item → Package page → **"Submit for review"**, see Step 2 item 5                                                                                                       |
   | **Manual workflow run**                                               | You need to release a specific older tag                                  | Yes. Actions → Release → Run workflow, set the tag, uncheck `dry_run`, check `submit_for_review`. The checkbox only decides whether the job queues; once queued it still waits at the gate |

   The old sentence "re-running to submit will be blocked by the version pre-flight, so use the dashboard
   button" described the shape where upload and submit were **one step**. They are two jobs now, so approving
   does not re-upload and cannot be stopped by the pre-flight a second time.

5. **Dry Run test** (optional): check `dry_run` when triggering manually (it is checked by default). It runs
   the build and every guard, creates no GitHub Release, uploads nothing, and the submit job does not even
   queue because `uploaded` is empty.

   ```bash
   # Trigger workflow_dispatch from the GitHub Actions page; the CLI equivalent:
   gh workflow run release.yml -f tag=v1.2.0 -f dry_run=true
   ```

6. **What depth 0 (`store_status`) actually does**: the job builds nothing and installs no dependencies. It
   runs two first-party scripts (`cws-token.mjs` to sign a token, `release-ci.mjs item-version` to read the
   version number) with exactly one store call between them — `:fetchStatus` — and writes not a single byte.
   Two deliberate differences from the other jobs:

   - **No environment** — a read needs nobody's permission; only the write does. Put the gate on it and
     "take a look at which version is live" becomes an approval request.
   - **It does not check out `tag`** — those two scripts were merged in 2026-10, so tags older than them do not
     contain these files; following the tag would fail at the very first step with `Cannot find module`, and
     that failure would have nothing to do with credentials. So it always checks out the ref the run was
     triggered on.

   ```bash
   gh workflow run release.yml -f store_status_only=true      # same on the page: tick Store status only, leave tag empty
   ```

   How to read it: the "live version" line in the summary is the version the store is carrying right now. That
   step being green means the whole chain "service account → access_token → v2 endpoint" works and the four
   Secrets plus the two IDs were configured as **one consistent set**. Red at 403 → check the two causes in
   Q14; red at the token exchange → check the first three items of Q1. If instead it prints
   `fetchStatus HTTP 000` followed by "no response body", that is not a credentials problem — **the store was
   never reached** (curl does not create the response-body file when it cannot connect, which is exactly why
   this step reports the two shapes separately rather than letting a bare `No such file or directory` stand in
   for the verdict); on a directly-connected machine this is the common one, see Q13. Green here does **not**
   mean the listing copy is complete — the API neither writes nor reads those fields.

### 3.4 Configuring the approval gate (environment `cws-release`, once)

This gate is what "merge to main → everything runs automatically up to the store's door → **a human lets it
through**" means in practice. It is not an `if` inside the workflow: an `if` can express "was that checkbox
ticked", and it cannot express "a second pair of eyes looked and agreed". After three rejections of 1.0.0,
"someone looks first" has to be a **state** in the pipeline, not a reminder after it finishes.

**The order is fixed: build the gate, prove it bites, then set the variable.** The consequence of reversing it
is in item 5 below.

1. **Create the environment**. Repository → Settings → **Environments** (left sidebar) → **New environment**.
   The name must be exactly `cws-release` (that is what `environment.name` in the workflow references).
   GitHub's own limits apply: "An environment name may not exceed 255 characters and must be unique within
   the repository", and uniqueness **ignores case** — `CWS-Release` would be treated as the same name while
   the workflow's reference is not the same key. Don't gamble on that.

2. **Add Required reviewers**. On the environment's configuration page tick **Required reviewers** and
   "Enter up to 6 people or teams". Who is on the list matters less than that **at least one entry is not
   the person who will be approving it alone**: the whole point of the gate is a second pair of eyes. Tick
   **Prevent self-review** to stop the person who triggered a run from approving it (on a personal repo with
   only you, **don't** tick it — see FAQ Q8). Before saving, look at
   **Allow administrators to bypass configured protection rules**: while ticked, an admin walks straight
   through the gate. The docs state the way to close it: "Deselect Allow administrators to bypass configured
   protection rules".

   > ⚠️ **This step can only be done in the web UI — do not type it as a command.** Measured this round: on the
   > same environment the `wait_timer` and `can_admins_bypass` fields are both writable over REST, but the
   > required-reviewers rule is not — `reviewers` holding your own id, a nonexistent id, or somebody else's id
   > all answer the identical 422 `Required reviewers must have at least one reviewer`. The measurement table and
   > how to read it are in Q16, which also explains why an environment carrying only `wait_timer` is a **fake
   > gate** that releases on its own.

3. **Leave Deployment branch empty, or write `main`.** With a pattern, GitHub wants "the name pattern for the
   branch or tag that you want to allow" and "Name patterns must be configured for branches or tags
   individually". The submit job checks out a **tag** (`needs.release.outputs.tag`), not a branch — if you
   add a branch restriction here, first confirm a tag-triggered run still passes that rule, or the gate turns
   into "nobody gets through". When in doubt, leave it empty: on this chain the real blocker is
   Required reviewers.

4. **Save** (Configure environment → Save protection rules).

5. **Verify the gate actually exists — before enabling the variable.** GitHub documents that
   "Running a workflow that references an environment that does not exist will create an environment with
   the referenced name", and apart from implicit Pages builds
   "the newly created environment will not have any protection rules or secrets configured" — **an
   auto-created environment is a door with no gate**, and every tag would submit straight to review. So don't
   trust that you clicked Save:

   ```bash
   curl -sS -H "Authorization: Bearer $GH_PAT" -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/<owner>/<repo>/environments/cws-release > /tmp/env.json
   node -e "const e=require('/tmp/env.json');console.log(JSON.stringify((e.protection_rules||[]).map(r=>r.type)))"
   ```

   `protection_rules` must be **non-empty**, and the reviewers entry must be visible in it (GitHub's sample
   response spells its `type` as `required_reviewers`, with `reviewers` listing who was named). A `[]`, or no
   such key at all, is the "environment exists but has no gate" shape — go back to item 2. Take the field
   names from what you actually get back: the test is "non-empty and reviewers visible", not an exact
   document match.

6. **Set the variable.** Repository → Settings → Secrets and variables → Actions → **Variables** →
   **Repository variables** → New:

   ```bash
   CWS_AUTO_SUBMIT = true      # the only value is true; unset or anything else = do not submit (fail-closed)
   ```

   It is the second interlock, not the gate itself. The gate is the environment's Required reviewers; the
   variable is only a **public statement** that "the gate is configured" (which is why it is a variable and
   not a secret — it is not a confidential value). It belongs in the job-level `if` because
   `jobs.<job_id>.if` may read `vars` but **not** `secrets` (the contexts documented for that key are
   github / needs / vars / inputs).

7. **One last real run to prove it**: push a test tag or trigger manually (check `submit_for_review`, leave
   `dry_run` unchecked). The expected shape is: the `release` job goes green and uploads →
   `Submit for review (after approval)` shows **Waiting** → you approve → it finishes in under two minutes.
   If you never saw Waiting and it simply ran to completion, item 5's "environment with no protection rules"
   is what you have — fix it now, and delete `CWS_AUTO_SUBMIT` until you do.

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
   membership is only revealed by the store call itself. **403 has a second cause** — `CWS_PUBLISHER_ID`
   holding some other, equally plausible-looking number; both causes and how to tell them apart are in Q14.
   The cheapest way to answer this question is depth 0 (read-only, zero writes); you do not have to wait for a
   real upload

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

A: Run **depth 0** first to prove the credential chain (`store_status_only`: no build, no store write, no
approval — 3.3 item 6); the two halves below only mean something after that. Then test them separately.
**Everything before the upload** is dry run's job, and it never touches the store:

```bash
gh workflow run release.yml -f tag=v1.2.0 -f dry_run=true     # on the page it's the same as ticking dry_run
```

**The gate and the submit step cannot be tested with dry run** — under dry run `uploaded` is empty, so the submit
job never queues. The reliable test is "let it queue, but don't approve": run once with `submit_for_review`
ticked and `dry_run` unticked, then look at whether it stops at **Waiting**. Stopped at Waiting means the gate is
there; ran straight through to completion means it isn't — check that environment against step 5 of 3.4.

To actually **call off** a release: don't approve. The wait expires on its own after 30 days (Q9). Or press
Cancel workflow on the run page — either way the draft revision already uploaded never appears on the store page,
because it was never submitted for review.

### Q5: The package uploaded but review has not started?

A: First confirm this is the shape you asked for. The upload job **never calls `:publish`**; submitting is another
job's business, and that job queues only when all four conditions hold at once — one missing and it never even
queues:

| Condition                                                          | Where to check                                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| The previous job really uploaded (`uploaded == 'true'`)            | End of that step's log in the `release` job; the failure reason is in the response body |
| All four secrets are present (`store_ready == 'true'`)             | The summary of the "Detect Chrome Web Store credentials" step                           |
| Repository variable `CWS_AUTO_SUBMIT == 'true'`                    | Settings → Secrets and variables → Actions → Variables                                  |
| `submit_for_review` ticked on a manual run (a tag push ignores it) | The Run workflow form of that run                                                       |

All four correct, and the job reads **Waiting** rather than skipped — that is not "review hasn't started", that
is the gate. Ask any one person on its reviewers list to click Approve. The three entry points (gate / dashboard
button / manual run) are compared in the table under item 4 of 3.3.

### Q6: `Submit for review (after approval)` shows skipped, with not one line of log

A: The job-level `if` evaluated false, so none of its script ran — walk the table above in order. The two most
common causes are the variable not being set (**fail-closed is deliberate**: nothing should submit itself before
someone confirmed the gate exists) and forgetting the checkbox on a manual run.

If the store steps inside the `release` job were grey from the start (the summary reads「已跳过 Chrome 应用商店」
— "Chrome Web Store skipped", both steps included), the secrets are incomplete; go back to 3.2 first.

### Q7: Where do I approve? I approved and nothing happened?

A: Actions → that run → at the top of the page, next to the `cws-release` line, there is **Review deployments**;
open the card and click **Approve and deploy**. What is worth knowing:

- **Only someone on the `required_reviewers` list (or an admin allowed to bypass) sees that button.** Everyone
  else sees "Waiting" and nothing else.
- **Any one** reviewer on the list is enough — GitHub's own wording is "Only one of the required reviewers needs
  to approve the job for it to proceed". All six do not have to click.
- What you approve is **the start of the job**, not the release outcome. Only after approval does it call
  `:fetchStatus` and decide whether to press the publish key (item 3 of 3.3).
- No card in sight: confirm this environment really is attached to the job (`environment.name: cws-release`,
  spelled identically), and that the environment is not the empty shell the first run created for you
  (step 5 of 3.4).

### Q8: I'm the only person in this repo, and with Prevent self-review ticked nobody can approve

A: This is the gate's real tension on a personal repo: the gate wants "a second pair of eyes", and you may
genuinely only have one. Three options, ordered by how honest they are:

1. **Add a real second person** (a collaborator, a family member's account, your own second account), so the
   gate means what it claims.
2. **Leave Prevent self-review unticked** and accept approving your own run. The gate still blocks the
   **automation** — a pushed tag no longer releases itself, someone has to press it — it just can't block the
   case where that someone is you.
3. Don't keep a list nobody can approve just so the pipeline looks gated: every release then stalls at Waiting,
   and you end up in the habit of bypassing it, which is worse than having no gate at all.

Whichever you choose, the meaning of `CWS_AUTO_SUBMIT` does not change: it states "the gate is configured", it
never means "skip the gate".

### Q9: If approval takes a long time, does it time out?

A: Two different clocks — don't mix them up:

- **Waiting for approval**: "A workflow may wait for up to 30 days on environment approvals". A tag pushed on
  Friday can still be approved on Monday morning; left alone past 30 days, that wait expires by itself.
- **Running the job after approval**: a single job on GitHub-hosted runners is capped at 6 hours (the 5-day
  figure is for self-hosted runners). This step actually takes under two minutes.

The workflow **deliberately omits** `jobs.store_submit.timeout-minutes`: the documentation does not say whether
that clock runs while a job waits for approval, and if it starts counting at queue time, a 10-minute setting
becomes "a release approved a little late times out on its own" — a failure with nothing readable about it,
landing exactly where a failure is least acceptable.

### Q10: Does the gate work on a private repo / the Free plan?

A: The documentation states "Users with GitHub Free plans can only configure environments for public
repositories" — private repositories need Pro / Team. This repository is public, so the gate works. If you copy
this setup onto a **private repo with Free**: `environment:` references an environment that cannot be created,
and the behaviour degrades into the auto-created empty shell (no protection rules), which means **every tag
submits straight to review** — precisely the case the `CWS_AUTO_SUBMIT` interlock exists to stop. Under that
account tier the right move is to leave the variable unset and submit from the Developer Dashboard's Package
page.

The same page warns that switching a Free-plan public repo to private makes existing protection rules ignored
and locks the configuration entry until you switch back. Visibility is not a free parameter here — don't flip it
after building the gate.

### Q11: The step after approval failed (or the store rejected it) — do I have to re-upload the package?

A: No re-upload. `:publish` publishes **the revision that was already uploaded**, so fix the cause and run the
submit job again. Before it does anything, that job asks `:fetchStatus` itself:

- If this version is **already in the store's review queue** (say you clicked the dashboard button in the
  meantime), `submit-check` returns 10 and the job **skips and stays green** — the queue never ends up holding
  two copies of the same package.
- If the package is still being processed (`lastAsyncUploadState: IN_PROGRESS`) or processing failed, it returns
  20, the job goes red with the reason written into the annotation, and the publish key is **not** pressed.
- If what sits in the queue is a **different** version, also 20 — someone else's revision is not published as if
  it were this one.

Re-uploading is needed in exactly one case: you changed the `package.json` version and pushed a new tag.

### Q12: What is `skipReview`, and why isn't it wired up?

A: v2's `PublishItemRequest` carries three fields besides `publishType`: `skipReview`, `blockOnWarnings` and
`deployInfos`.

- `skipReview` literally means "publish without submitting for review". **This chain does not wire it**: review
  is not a step the caller gets to declare waived. Hooking it up would hand the release script a "bypass the
  store's checks" switch, while the entire reason this chain exists is "a human check before the store's check".
- `blockOnWarnings` means "treat warnings as failure" and is **also deliberately off**: warnings are non-blocking
  by design, so blocking on them would force someone into the dashboard before any retry. Instead
  `publish-state` **prints** them — the receipt ends with「N 条非阻断告警（reason：description / …）」, i.e. N
  non-blocking warnings with each reason, plus its description when there is one — and lets a person decide.
- `deployInfos` belongs to `STAGED_PUBLISH` staged rollout. This chain sends `DEFAULT_PUBLISH` and has no use for
  it; switching to a staged rollout is **a deliberate product decision**, not something a CI edit should bring
  along by accident.

### Q13: I tried verifying the credentials locally and got `fetch failed`, or a dozen seconds of nothing and a timeout

A: That is **the network layer never leaving the machine** — it is not a credentials verdict of any kind.
`scripts/cws-token.mjs` calls `https://oauth2.googleapis.com/token` with `fetch`, and **Node 22 and earlier do
not read `HTTPS_PROXY`** (honouring an environment proxy is Node 24's `NODE_USE_ENV_PROXY`), so the system proxy
that is permanently on here simply does not participate in this path. The sibling repository
account-password-helper measured the same shape on 2026-10-11: a direct connection to the store domain timed out
after 19.9 seconds (`http=000`), and a response only arrived when the proxy was named explicitly. So on machines
like this one:

- "red locally" does **not** imply "credentials wrong" — what it reported was `fetch failed` / a timeout, not a
  status code from the store
- take the green from CI's depth 0 instead (3.3's `store_status_only`): no build, no store write, no approval,
  and runners do not have this proxy problem
- the two checks you can still do locally are both offline: the clipboard self-test in 3.2 (reports line count
  and the predicate, never echoes the key), and `pnpm verify:release-ci` (fixtures against the four
  store-response verdicts, zero network throughout)
- do not `export` the private key into `~/.zshrc` or another startup file to "save pasting it again"; export it
  in the current shell only, and if you want to know what it looks like use that 3.2 self-test —
  `echo "$CWS_SERVICE_ACCOUNT_PRIVATE_KEY"` puts the whole PEM into the scrollback

### Q14: The token exchanges fine but `:fetchStatus` answers `403 PERMISSION_DENIED`

A: Google's sentence `Permission denied on resource 'publishers/{id}/items/{extId}' (or it might not exist)`
**covers two causes at once**; do not assume it is the "email not added" one:

1. **The service account's email is not on the Developer Dashboard's user page** (3.1 step 5). This one rejects
   even a read-only query, without waiting for a write endpoint — which is precisely why depth 0 can expose it
   on its own.
2. **The two segments assembled into that resource name do not belong to the current publisher**:
   `CWS_PUBLISHER_ID` holding the 21-digit "Unique ID" from the service account page, or the Cloud project's
   project number, or the item ID mis-copied. The three candidates and how to separate them are in 3.1 step 6's
   table.

The procedure is not "first work out what the old value was" — Secrets are write-only, the
`publishers/***/items/***` line in the log is GitHub's mask, any non-empty well-formed value masks that way, and
the shape check forbids only `/` for this segment, so **a wrong value stays green all the way to Google**. The
remedy is therefore to **overwrite the Secret once with the first segment of the Dashboard address bar**
(overwriting is converging), then judge with depth 0 — do not probe with depth 3.

Both 403s are **zero-write**: they land on the `:fetchStatus` hop, no package was uploaded and no new revision
exists, so once fixed you just rerun that workflow — you will not hit the version pre-flight (it compares the
live version number, which has not changed).

### Q15: I filled a tag into the manual run and the first step died with `Cannot find module '…/scripts/cws-token.mjs'`

A: `release` and `store_submit` both check out that tag (`ref: ${{ github.event.inputs.tag }}`), and
`cws-token.mjs` / `release-ci.mjs` are files merged in during this round of changes — **tags older than them do
not have these two scripts in their tree at all** (same logic: until this round reaches `main`, tags made on
`main` still use the old v1.1 chain). This is not a credentials problem: it fails at the first script after the
checkout, before anything that goes on the network. One read-only command settles it:

```bash
git fetch --tags origin
git ls-tree <that tag> scripts/cws-token.mjs     # empty output = that tag has no such file
```

Conclusion: depths 1 / 2 / 3 only mean something for **a tag cut from a ref that contains these scripts**; to
check just the credential chain use depth 0, which always checks out the ref the run was triggered on and is not
subject to this limitation (3.3 item 6).

### Q16: The environment exists and its `protection_rules` contains only `wait_timer` — is that a gate?

**No, and it is worse than having no gate at all.** A wait timer means "release automatically once N minutes have
passed"; it needs nobody's approval. Treating it as a gate is giving an automatic submission a grace period. One
reading decides it: `protection_rules` must contain the `required_reviewers` entry with people actually listed in
`reviewers` (step 5 of 3.4 is the command that reads it).

The other thing measured this round belongs here, because it disproves the assumption "just type the documented
command". On this account that rule can be added **only in the web UI, never over REST**. The same
`PUT /repos/{owner}/{repo}/environments/cws-release`:

| Request body                                                                    | Result (measured 2026-10-18)                             |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `{"wait_timer":1}`                                                              | 200, `protection_rules` gains `wait_timer`               |
| `{"wait_timer":0}`                                                              | 200, the rules are cleared                               |
| `{"can_admins_bypass":false}`                                                   | 200, the field changes                                   |
| `{"reviewers":[{"reviewer_id":<your own id>}]}`                                 | 422 `Required reviewers must have at least one reviewer` |
| The same plus `wait_timer` / `prevent_self_review` / `deployment_branch_policy` | 422, same sentence                                       |
| `{"reviewers":[{"reviewer_id":1}]}` (an id that does not exist)                 | 422, **still the same sentence**                         |

That last line is the tell: the error has nothing to do with whether the id is valid, so GitHub never checked the
number — the whole required-reviewers rule was refused (`gh` uses an OAuth token holding both the `repo` and
`workflow` scopes, and `wait_timer` writes fine, so this is not a missing write permission). The remedy is
therefore: **add it under Settings → Environments → `cws-release` → Required reviewers in the browser**, then
confirm with reading ② of 3.0 that `required_reviewers` is now visible. Until then, do not set `CWS_AUTO_SUBMIT` —
an empty shell and a fake gate both let "merged to main" alert the review queue, and the entire reason this chain
exists is that a human looks first.

### Q17: The repo still has `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_EXTENSION_ID` — does that mean credentials are configured?

No. Those three are leftovers of the v1.1 "OAuth desktop client + refresh token" design, and **the new chain never
reads a single one of them**: `release.yml` reads `CHROME_EXTENSION_ID_TAF`, `CWS_PUBLISHER_ID`,
`CWS_SERVICE_ACCOUNT_EMAIL` and `CWS_SERVICE_ACCOUNT_PRIVATE_KEY`, and its predicate is "all four are non-empty".
Leaving the old three in place breaks nothing, but it makes reading ① of 3.0 easy to miscount — this repo measured
exactly the shape "three old names present, four new names absent", and in that state both store steps are silently
skipped together.

Deleting them is the owner's call: Secrets are write-only, so once deleted the value cannot be recovered and
restoring it means pasting again. The one thing not to do is read `CWS_EXTENSION_ID` as "the extension ID is already
configured" — the key the workflow reads is `CHROME_EXTENSION_ID_TAF`, and a wrong name equals not configured. Worth
noticing: those 32 characters are public anyway (they are the store listing's URL), so copying them into the new key
involves no secrecy at all — `gh secret set CHROME_EXTENSION_ID_TAF` and paste.

### Q18: I merged the Release PR and there is neither a tag nor a `release.yml` run?

`RELEASE_PAT` is missing. GitHub has a hard rule: **events created by `GITHUB_TOKEN` do not trigger other
workflows**, so a tag pushed with the built-in token yields the silent half-failure "the tag exists, the downstream
workflow never ran". How to configure it is in 1.2 of `.github/RELEASE_AUTOMATION.md` (fine-grained token, this one
repository only, Contents + Pull requests permissions).

Without it the chain is not broken, it **steps back one**: `Push the tag` only reports a warning and the summary
prints the three local commands, and completing them in a terminal triggers `release.yml` just the same. Reading ⑤
of 3.0 shows this shape — an empty tag list while `main` already has a version section.

### Q19: I wanted a dry run to check the artifact and the very first step failed?

If reading ⑤ of 3.0 returns `0`, then depths 1 / 2 / 3 **cannot run at all right now**, and the failure has nothing
to do with credentials: the `release` job's `Check out the tag` uses
`ref: ${{ github.event.inputs.tag || github.ref }}`, so a tag you type that does not exist in the repository fails
at the checkout. A dry run starts from that same step — "creates no Release, touches no store" happens later and does
not change the need for a real ref.

Each thing you might want verified has its own entry point:

| What you want to verify                                                   | Use                                                                                                                       | Needs a tag |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| The artifact itself is compliant (build + every guard + package contents) | Locally `pnpm build && pnpm verify:offline && pnpm verify:remote-code`; on CI the build job of `ci.yml` already does this | No          |
| The verdict logic and the seams to `release.yml` were not broken          | `pnpm verify:release-ci` (zero network)                                                                                   | No          |
| Whether the credential chain works                                        | Depth 0, `store_status_only` — it checks out the ref the dispatch started from                                            | No          |
| The whole release chain                                                   | First get a tag per Q18 (configure `RELEASE_PAT` or run the three local lines), then talk about depths 1 / 2 / 3          | **Yes**     |

### Q20: What happens while `uploadState=IN_PROGRESS` — could it submit the previous version?

After the store receives a package it **unpacks asynchronously**, so `:upload` may answer `IN_PROGRESS`. Posting
`:publish` at that moment puts the **previous parsed version** into the review queue — v2's nastiest failure,
because it reports success while shipping the old package.

This chain handles it in two layers rather than by luck. The upload step reads `IN_PROGRESS` and writes only
"the store is still unpacking" into the summary — **it does not turn red** (the package genuinely got through, and
failing there would mark the whole release job broken). What actually stops it is `submit-check` in the submission
job: it asks `:fetchStatus` again, and if `lastAsyncUploadState` is still `IN_PROGRESS` it returns exit code 20, the
job turns red with the reason written out, and **the publish button is not pressed**. Between those two steps sits
the human approval gate of 3.4, so unpacking has usually long finished.

When you drive those two endpoints by hand with curl, this is the one place a polling loop is mandatory: keep
reading `lastAsyncUploadState` from `GET :fetchStatus` and do not POST `:publish` until it settles on `SUCCEEDED` or
`FAILED`. The reference repository polls until settled before submitting; this project delegates the same guarantee
to `submit-check` turning red. Both are sound only on the condition "read, then publish" — never "publish, then read".

### Q21: The wrong package went up — can that submission be cancelled?

It can: v2 has `:cancelSubmission`, but **this repository does not wire it into a subcommand** (the four
store-response verdicts in `scripts/release-ci.mjs` are `item-version` / `upload-state` / `submit-check` /
`publish-state`, and none of them is a cancellation; `release.yml` has no cancellation step either). So there are two real paths today: cancel it by hand on
that item's page in the Developer Dashboard, or use the one-off recipe below. Per Google's documentation the quota
is **6 calls per publisher per day** — do not treat it as a retry button.

```bash
# One-off emergency: cancels this submission only; leaves the package and the GitHub Release alone.
export CWS_SERVICE_ACCOUNT_EMAIL='…@iam.gserviceaccount.com'
SA_JSON=~/Downloads/service-account.json
export CWS_SERVICE_ACCOUNT_PRIVATE_KEY="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).private_key)' "$SA_JSON")"

node scripts/cws-token.mjs /tmp/cws.cfg          # a 600-permission curl config file; the token never enters argv
curl -sS --config /tmp/cws.cfg -X POST \
  "https://chromewebstore.googleapis.com/v2/publishers/$CWS_PUBLISHER_ID/items/$CHROME_EXTENSION_ID_TAF:cancelSubmission" \
  -w '\n[http %{http_code}]\n'
rm -f /tmp/cws.cfg                                # delete it when done
```

This block **was not actually run this round** (there are no credentials, and this machine cannot reach the network
— see Q13), and the endpoint name and quota are as Google's current documentation states. It is written here because
"cancelling a submission" previously had no home in this document at all, not because it is verified working. Before
using it, run depth 0 once to confirm `:fetchStatus` reads the item, and confirm that the two segments from the
address bar (3.1 step 6) assemble into the item you mean to cancel.

### Q22: Could a contributor's fork accidentally submit my item for review?

No — but not because the workflow contains a guard. **`release.yml` in this repository has no
`github.repository == '…'` job-level condition.** What blocks it are three facts about triggers and credentials:
`release.yml` runs only on a `v*` tag `push` and on `workflow_dispatch`, so a `pull_request` never triggers it (PRs
run `ci.yml`); a fork's run receives none of your repository's Secrets, so `store_ready` is permanently `false` and
both store steps skip; and `store_submit` additionally requires `vars.CWS_AUTO_SUBMIT == 'true'`, which nobody has
set on that fork.

To verify the artifact itself on a fork, the zero-credential checks are enough: `verify:offline` and
`verify:remote-code` after `pnpm build` are assertions about the built package, which is exactly what the build job
of `ci.yml` does. The reason no explicit guard is added here: adding one means editing `release.yml`, and those very
strings are pinned by `pnpm verify:release-ci`'s seam table — rewriting a contract table to stop something the
trigger rules already prevent is not a good trade. If it is ever tightened, the change is to that job's `if` **plus**
the contract table in the same commit, not a stray line.

### Q23: What is the environment's `can_admins_bypass`, and should it be off?

It is the environment page's "Allow administrators to bypass configured protection rules", and **GitHub defaults it
to on** — an administrator of the repository walks straight through the gate, which then only constrains everybody
else. For a gate whose entire purpose is "a second pair of eyes", that is an open back door.

Measured this round: this field _is_ writable over REST (`{"can_admins_bypass":false}` returns 200 and does change),
while the required-reviewers rule is not (Q16). So the current state here is "admins can no longer bypass it, but
there is nobody who can approve" — and in that state, once `store_submit` queues, **no one can release it** and the
wait expires by itself after 30 days (Q9). That is precisely why the order in 3.4 is rigid: add the approvers to
`required_reviewers` in the UI first, come back and confirm `protection_rules` shows them, and only then set
`CWS_AUTO_SUBMIT`. On a personal repository with only you in it, pick one of Q8's three options first — the gate
wants a second pair of eyes, and a list containing only the person who triggered the run, with
`prevent_self_review` ticked, means every release deadlocks.

### Q24: Can the API make the item unlisted, or hold it back after approval for staged rollout?

Changing visibility: **no**. v2's `publishType` offers only `DEFAULT_PUBLISH` and `STAGED_PUBLISH`, and Google states
outright that changing an item's visibility through the API is no longer supported — unlisted, trusted testers and
the rest are Dashboard-only. This is the same family of limits as "the API cannot create an item and cannot write
listing copy": the publishing API manages packages and the act of submitting, never what the item _is_.

`STAGED_PUBLISH`: **the flag exists but the rollout half is unusable here.** Swapping that literal in `release.yml`
does turn "approved means live" into "approved means held", but the batching endpoint `:setPublishedDeployPercentage`
requires, per Google's documentation, that the item have **more than 10,000 weekly active users**; below that the
request is refused and the split has to be done in the Dashboard. This project is nowhere near that line, so a real
staged rollout would mean changing how an endpoint that currently cannot be called is invoked — a deliberate product
decision, never something a CI edit slips in (Q12's `deployInfos` bullet is the same point).

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

- [ ] **The five read-only commands of 3.0 were just run**, and that table says which pieces are missing — the
      three causes of "pipeline green, store received nothing" (missing credential, fake gate, variable unset) all
      look like success, and only those five readings tell them apart
- [ ] GitHub Secrets configured completely (3 publisher-level values + 1 extension-specific ID; add `RELEASE_PAT` too if the tag should start the release on its own)
- [ ] **Those four are under Repository secrets**, not the `cws-release` environment's secrets (wrong scope
      raises no error — it silences both store steps together, the fourth ⚠️ bullet of 3.2 plus Q6)
- [ ] Those four are **the new chain's four names**, not the three old ones `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET`
      / `CWS_EXTENSION_ID` (the new chain never reads them — do not count them as configured, Q17)
- [ ] The service account's email is added on the Developer Dashboard's user page (skip this and the token still exchanges — the store call is what answers 401/403)
- [ ] `CWS_PUBLISHER_ID` is **the first segment of the listing's edit-page address bar** (36-character UUID
      shape), not the 21-digit "Unique ID" on the service account page (3.1 step 6's three-candidate table; a
      wrong value only surfaces on the store hop — Q14)
- [ ] The GCP project has the Chrome Web Store API enabled
- [ ] Extension ID format correct (32 a-p lowercase letters, `CHROME_EXTENSION_ID_TAF`)
- [ ] **Run depth 0 once first** (`store_status_only`: read-only, zero writes, no approval) to confirm the
      credential chain works, before considering depths 2 / 3
- [ ] Before any depth 1 / 2 / 3 run, the tag you will type **really exists** (with zero tags in the repository a
      dry run dies at the checkout — Q19)
- [ ] All validations passed (`pnpm lint:all && pnpm verify:meta && pnpm verify:listing && pnpm build && pnpm verify:offline`)
- [ ] Store copy consistent with `_locales` files
- [ ] Privacy policy URL reachable
- [ ] Version number higher than online version
- [ ] **(only if you want auto-submit)** environment `cws-release` exists and its `protection_rules` visibly
      contains the Required reviewers entry — not the empty shell the first run created (step 5 of 3.4 is the
      curl command that proves it)
- [ ] **(same)** that reading is **not** `wait_timer` alone: an auto-releasing fake gate is worse than no gate (Q16)
- [ ] **(same)** the reviewers were added **in the web UI** — this round measured that REST cannot create that
      rule, so do not type it as a command (Q16)
- [ ] **(same)** `can_admins_bypass` is off (it ships on by default, letting an admin walk through — Q23)
- [ ] **(same)** repository variable `CWS_AUTO_SUBMIT=true` is set, and the three boxes above were checked right
      before setting it
- [ ] **(same)** at least one reviewer on the list is **not the person who triggers the release**; on a solo
      personal repo, confirm which of Q8's three options you picked, rather than "ticked Prevent self-review and
      now nobody can approve"

---

## Contact

- **Issue reporting**: [GitHub Issues](https://github.com/liaolongdong/transfer-any-file/issues)
- **Email**: [924902324@qq.com](mailto:924902324@qq.com)
- **WeChat**: `lld_1025` (note "taf")
