# Code of Conduct

[简体中文](CODE_OF_CONDUCT.md) · English

The claims in this project are hard ones — "files never leave the machine", "no network requests", "conversion happens locally" — so the standard for arguing about them should be equally hard: can the statement be pointed at code, at build output, or at a measurement? This document extends that standard to how we treat each other.

## How we treat each other

- Comments address the code, not the person who wrote it. "This is missing a boundary check" is fine; "what kind of writing is this" is not.
- When someone new asks "why is this layer extracted", give the reason or admit there isn't one. Long-standing code is not the same as deliberate design.
- Users across languages, platforms and screen sizes are all users of this project. Don't treat any of them as an edge case in how you phrase things.

## How we argue about what is right

- **Claims need evidence.** When you say "slow", "bigger" or "incompatible", attach the number and where it came from (`pnpm build` output, a reading from an e2e run, the `FileFormat` enum). Without a source, write it as a guess.
- **Privacy and offline-ness outrank features.** Any new permission, outbound request, telemetry or data collection needs the maintainer's explicit agreement, and it changes documentation, the privacy policy and the store listing in the same breath. There is no "ship it, document it later".
- **A silent behaviour change counts as a defect.** Changing a default, a data format, a file name or a conversion result without saying so gets bounced in review, even when it is technically more correct.
- **No guessing fixes.** If the root cause is unknown, say it is unknown; don't cover it with a timeout, an `eslint-disable` or a skipped test.

## Reporting and enforcement

Harassment, discrimination or anything else that doesn't belong here: open an issue and say in the title that it is a community matter. Security vulnerabilities go through a private advisory as described in [SECURITY.md](SECURITY.md) — please don't post them publicly. The maintainer restates what was received before acting on it, and writes the outcome and the reasoning down in the open. In a project with a single maintainer, transparency is the entire accountability mechanism.

## Licence

By contributing you agree that your contribution is released under the project's [MIT licence](LICENSE). Contribution rules and development commands are in [CONTRIBUTING.en.md](CONTRIBUTING.en.md).
