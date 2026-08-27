# 2026-07-01 Non-intrusive annotation rail deploy

## Goal

- Keep annotation discussion visually attached to the article right edge.
- Ensure annotation cards never change article content width or horizontal position.
- Avoid horizontal scrollbars in both the page and the reader pane.

## Implementation

- Convert the annotation margin from a grid column into an absolutely positioned rail.
- Use `#reader-pane` container queries:
  - below `960px` reader-pane width: hide the margin rail.
  - `960px` to `1229px`: show a compact `132px` annotation card.
  - `1230px` and up: show the full `218px` annotation card with quote/actions.
- Keep mobile and narrow desktop layouts from rendering margin cards.
- Bump `index.html` asset query strings to `/styles.css?v=135` and `/app.js?v=133`.

## Local Verification

- `node --check public/app.js`
- `node --check server.js`
- Chrome DevTools Protocol click-path checks on `127.0.0.1:3099` with a real article and injected annotation:
  - `1560x1000`: compact `132px` card visible; content width delta `0`; content left delta `0`; no page or reader-pane horizontal overflow.
  - `1920x1000`: full `218px` card visible; content width delta `0`; content left delta `0`; no page or reader-pane horizontal overflow.
  - `390x900`: margin hidden; content width delta `0`; content left delta `0`; no page or reader-pane horizontal overflow.

Screenshots captured locally:

- `/tmp/qmreader-rail-compact2-1560.png`
- `/tmp/qmreader-rail-compact2-1920.png`
- `/tmp/qmreader-rail-compact2-390.png`

## Deployment

- Verified VPS access to `myvps`; `qmreader` was active and `/root/qiaomu-server-guide.md` confirmed `rss.qiaomu.ai` maps to `/opt/qiaomu-apps/qmreader` on `127.0.0.1:3088`.
- Backed up production files to `/opt/qiaomu-apps/qmreader/backups/20260701T122856Z-non-intrusive-annotation-rail/`.
- Synced:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - this ops note
- No service restart required; Express serves the updated static files.

## Live Verification

- `https://rss.qiaomu.ai/` references `/styles.css?v=135` and `/app.js?v=133`.
- `https://rss.qiaomu.ai/styles.css?v=135` and `https://rss.qiaomu.ai/app.js?v=133` return HTTP 200.
- `qmreader` is active on the VPS and the local `/api/sources` probe succeeds.
- Chrome DevTools Protocol production checks on `https://rss.qiaomu.ai/articles/24eac1397b344405eb0ff2ede64dc02f`:
  - `1560x1000`: compact `132px` card visible; content width delta `0`; content left delta `0`; no page or reader-pane horizontal overflow.
  - `1920x1000`: full `218px` card visible; content width delta `0`; content left delta `0`; no page or reader-pane horizontal overflow.
  - `390x900`: margin hidden; content width delta `0`; content left delta `0`; no page or reader-pane horizontal overflow.

Screenshots captured locally:

- `/tmp/qmreader-live-direct-rail-1560.png`
- `/tmp/qmreader-live-direct-rail-1920-retry.png`
- `/tmp/qmreader-live-direct-rail-390.png`
