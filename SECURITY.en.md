# Security Policy

[简体中文](SECURITY.md) · English

## Supported versions

Only the latest build of `main` is supported. There is no back-port list: the extension
ships as one self-contained bundle, so every install runs the same code and a fix is simply
the next release.

## What the attack surface actually is

The claims below are structural and checkable, and they explain why most reports of the
common categories do not apply to this project.

| Property              | State                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permissions           | Exactly one: `storage`. No `host_permissions`, no `<all_urls>`, no content scripts.                                                                                                   |
| Network calls         | None of its own. `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `sendBeacon` do not appear in `entrypoints/`, `components/`, `composables/` or `utils/`.                  |
| Remote code           | None. No CDN assets, no `eval`, no `new Function`.                                                                                                                                    |
| File contents at rest | Never written anywhere. They live in the tab's memory during a conversion and are handed back as a download.                                                                          |
| History               | File names, formats and sizes only, in `chrome.storage.local`, on the device.                                                                                                         |
| Untrusted input       | Uploaded files, clipboard content, ZIP entries and stored values are validated at the boundary; HTML / SVG / Markdown derived from them is sanitised with DOMPurify before rendering. |

Verify it with `pnpm verify:offline` (the same assertion CI runs): it greps the four first-party
directories for those entry points and checks that `wxt.config.ts` still declares `storage` with
no `host_permissions`. A grep over `.output/chrome-mv3` is not the right check: the bundled
converters carry request code on paths this extension never enters. Those paths cannot do anything useful even if one
were reached: with no host permission and no content script, a request from the extension page is an ordinary
CORS-restricted web call that cannot read a response or touch any website's data. The guarantee that actually carries
the weight is the first one — no first-party code calls a request API.

## Reporting a vulnerability

Prefer a **private security advisory**: the **Security** tab of
[the repository](https://github.com/liaolongdong/transfer-any-file/security/policy) exposes
"Report a vulnerability", which keeps the details off the public issue tracker. If that form is
unavailable on this repository, email `924902324@qq.com`.

Please include:

- The revision (`git rev-parse HEAD`) or the store version number.
- What is compromised, and from whose position — a converter producing a wrong file is a bug,
  not a vulnerability; code that reads a file the user never selected, or that moves data
  off-device, is a vulnerability.
- A reproduction. If the reproduction needs a sensitive file, describe it instead of attaching it.

There is no formal response SLA on a one-maintainer project, but the ordering is simple:
a confirmed issue that could leak or corrupt user data outranks everything else in the queue.

Open a normal [issue](https://github.com/liaolongdong/transfer-any-file/issues) instead for
conversion errors, UI problems and format requests — those are not security reports.
