# 2026-07-01 Reader-first context tabs deploy

## Goal

- Prioritize readable article width and reduce wasted reader padding.
- Keep AI companion visible by default.
- Move inline annotation margin cards into a right-side tab that switches with AI companion.
- Keep the article/context resizer movable while preserving a minimum reader width.

## Local Verification

- `node --check public/app.js`
- `node --check server.js`
- `git diff --check -- public/index.html public/app.js public/styles.css ops/2026-07-01-reader-first-context-tabs-deploy.md`
- Local Chrome DevTools Protocol checks on `127.0.0.1:3099`:
  - `1560x1000`: AI companion is the default tab, reader pane is `720px`, content width is `612px`, no document horizontal overflow.
  - `1560x1000`: annotation comments switch into the right-side tab; old annotation margin rail is hidden.
  - `1366x900`: reader pane is `754px`; forcing the context pane wide clamps it so the reader pane remains at least `700px`.
  - `390x900`: no document horizontal overflow.

## Deployment

- Verified `myvps` access and `/root/qiaomu-server-guide.md` mapping:
  - `rss.qiaomu.ai` -> `/opt/qiaomu-apps/qmreader`
  - service: `qmreader`
  - private origin: `127.0.0.1:3088`
- Backed up production files to `/opt/qiaomu-apps/qmreader/backups/20260701T205356Z-reader-first-context-tabs/`.
- Synced:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - this ops note
- No service restart required; Express serves the updated static files.

## Live Verification

- `https://rss.qiaomu.ai/` references `/styles.css?v=136` and `/app.js?v=134`.
- `https://rss.qiaomu.ai/styles.css?v=136` and `https://rss.qiaomu.ai/app.js?v=134` return HTTP 200.
- `qmreader` is active on the VPS.
- Chrome DevTools Protocol production checks on `https://rss.qiaomu.ai/`:
  - `1560x1000`: AI companion is the default tab, reader pane is `720px`, content width is `612px`, no document horizontal overflow.
  - `1560x1000`: annotation comments render in the right-side tab; old annotation margin rail is hidden.
  - `1366x900`: reader pane is `754px`, content width is `654px`, no document horizontal overflow.
  - `390x900`: no document horizontal overflow.

Screenshots captured locally:

- `/tmp/qmreader-live-final-1560-agent.png`
- `/tmp/qmreader-live-final-1560-annotations.png`
- `/tmp/qmreader-live-final-1366-agent.png`
- `/tmp/qmreader-live-final-390-reading.png`
