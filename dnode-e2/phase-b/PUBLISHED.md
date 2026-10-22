# Hosted test builds (for the human sessions)

Private claude.ai artifacts, published 2026-10-22 so S01/S08, G01/G02/G06 and B06 can be run on a phone without a local server. Only the owner can open them until they are shared from each page's Share menu.

| App | Link |
| --- | --- |
| Shop (Vietnamese customer UI; "Test desk" link in the footer) | https://claude.ai/artifact/GGNCWHXTmLwjncJ6hdmCxh |
| Breakout (add `#desk` to the link for the test desk) | https://claude.ai/artifact/TypdqgwtnfSnLNkYs1YBBc |
| Batch transformer | https://claude.ai/artifact/E9wjyQmm6nmWxZmYCUmXN1 |

## How the hosted copies differ from `shop/`, `game/`, `batch/`

DNode roots, the kit and every app's logic are byte-identical; each page still runs `verifyBundle` and its root pins before anything executes. Publish-only changes, none in DNode:

- The page HTML has its `<!doctype>`, `<html>`, `<head>`, `<body>`, charset and viewport tags removed, because the artifact host supplies that skeleton.
- `shop/app.js`: kit paths `/kit/…` → `./kit/…` (seven occurrences: three imports and four fetch URLs). The artifact serves supporting files relative to the page.
- `game/host/main.js`: the test desk also opens on `#desk`. The host passes no query string, so `?desk=1` cannot reach the page.
- The 24 kit files the page needs ship beside each page under `kit/` (22 attested files, `generated/release.json` and `generated/trust-key.json`).

Checked before publishing: a local Chromium run of all three copies through a wrapper that mimics the host skeleton. At 390×844 and 1280×800, the kit was admitted and each app ran: the shop added a product to the cart, Breakout launched, and the batch tool accepted the B-T1 file.

## Known limits of the hosted environment

- **Shop:** it needs Web Locks and `localStorage`. If the viewer blocks either, the page refuses to start and says so. State lives only in that browser, which matches the E1 session-state scope.
- **Batch:** the viewer blocks downloads, so use **Copy JSON**. Testing B06 needs CSV files on the device, so a desktop is easier.
- **Breakout:** the viewer's frame may affect keyboard focus. Click or tap the field first.
