# OakenShield

OakenShield is a Chrome extension for personal focus protection. It lets users define distraction keywords, detects matching URLs/searches/form input, shows a friction modal before continuing, and tracks focus-related activity locally in the browser.

This product is original independent software created by the seller. No resale, PLR, or unauthorized third-party software is included.

## What It Does

- Blocks or slows down distracting searches and URLs based on keywords chosen by the user.
- Shows an interruption modal when a protected keyword is detected.
- Lets the user go back, resist the distraction, or continue intentionally.
- Includes a floating dashboard shortcut that can be dragged or disabled.
- Tracks daily blocked/resisted/continued counts.
- Tracks local time summaries for visited domains and AI-tool usage.
- Stores settings and usage data locally in the browser.

## What It Does Not Do

- It does not send browsing history, keywords, stats, or usage data to a server.
- It does not include analytics, ads, affiliate tracking, or telemetry.
- It does not collect payment information. Distribution is handled by Gumroad.
- It does not guarantee productivity, mental health outcomes, or behavior change.
- It is not affiliated with Google, Chrome, Gumroad, OpenAI, Anthropic, Google Gemini, Perplexity, Mistral, or any website it may detect.

## Installation

1. Download and unzip the OakenShield package.
2. Open Chrome and go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the unzipped `OakenShield` folder.
6. Pin the extension from the Chrome toolbar if desired.
7. Open the extension popup or options page and add your focus keywords.

## Permissions

OakenShield requests the following Chrome permissions:

- `storage`: saves keywords, settings, stats, time summaries, and floating icon position locally.
- `tabs`: detects tab changes, opens the dashboard, and updates the floating icon visibility across tabs.
- `alarms`: records time summaries on a periodic heartbeat while the browser is active.
- `<all_urls>` host access: allows the content script to detect protected keywords across websites.

These permissions are used only for the extension features described above.

## Data Storage

OakenShield uses `chrome.storage.local`. Data stays in the user's browser profile unless the user exports, copies, syncs, or backs it up separately through their own browser/device setup.

See `PRIVACY.md` for the full privacy policy.

## License

This is proprietary software distributed for free through Gumroad. Users receive a personal license to install and use OakenShield. Redistribution, resale, sublicensing, repackaging, public posting, or claiming authorship is not allowed.

See `LICENSE.md` for the full end-user license terms.

## Support

Support information, known limitations, compatibility notes, and free-download guidance are available in `SUPPORT.md`.

Gumroad product page: https://4285792892889.gumroad.com/l/bgyiih
