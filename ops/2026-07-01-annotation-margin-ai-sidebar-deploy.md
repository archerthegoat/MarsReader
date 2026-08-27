# 2026-07-01 annotation margin and AI sidebar deploy

## Goal

- Keep the right-side context pane focused on AI companion reading only.
- Move highlighted discussions into article-side margin notes, similar to document-review products where anchored comments stay beside the referenced text.
- Keep narrow viewports safe by falling back to the existing in-article annotation list.

## Local Verification

- `node --check public/app.js`
- `node --check server.js`
- `node --check lib/store.js`
- `node --check lib/fetcher.js`
- Local server on `127.0.0.1:3099` with `STARTUP_REFRESH_DELAY_MS=-1`.
- Chrome DevTools Protocol visual checks:
  - Desktop with AI collapsed: temporary annotation renders as a right-side margin note and text highlight.
  - Desktop with AI open: right pane shows AI companion only, no annotation discussion panel, and margin notes collapse.
  - Mobile viewport `390x844`: no horizontal overflow; annotation margin is hidden.

## Deployment

- Backed up production static files to `/opt/qiaomu-apps/qmreader/backups/20260701T090820Z/`.
- Synced:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - this ops note
- No service restart required; Express static assets are read from disk and `index.html` now references bumped asset query strings.
## Live Verification

- `https://rss.qiaomu.ai/` references `/styles.css?v=133` and `/app.js?v=131`.
- `https://rss.qiaomu.ai/app.js?v=131` and `https://rss.qiaomu.ai/styles.css?v=133` return HTTP 200.
- `qmreader` is active on the VPS and the local `/api/sources` health probe succeeds.
- Browser click-path verification on production:
  - Desktop with AI collapsed: an injected annotation renders as a right-side margin note and text highlight.
  - Desktop with AI open: right pane shows AI companion only, no annotation discussion panel, and margin notes collapse.
  - Mobile viewport `390x844`: annotation margin is hidden and there is no horizontal overflow.

Screenshots captured locally:

- `/tmp/qmreader-live-click-margin.png`
- `/tmp/qmreader-live-click-agent.png`
- `/tmp/qmreader-live-click-mobile.png`
