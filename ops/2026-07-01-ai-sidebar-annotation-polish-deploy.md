# 2026-07-01 AI sidebar and annotation polish deploy

## Goal

- Fix cramped annotation margin cards by replacing full discussion cards with compact article-side notes.
- Simplify AI companion reading from a widget-heavy layout to the native QMReader panel.
- Add restrained design-engineering polish for press feedback, short transitions, and reduced-motion handling.

## Local Verification

- `node --check public/app.js`
- `node --check server.js`
- Chrome DevTools Protocol visual checks on `127.0.0.1:3099`:
  - Real click path opens an article, injects a temporary annotation, and renders a compact 218px margin note without button overflow.
  - Opening AI companion hides margin notes, removes the annotation side panel, uses native AI UI, shows five quick tasks, and keeps the send button at `34x34`.
  - Mobile viewport `390x844` has no horizontal overflow and hides annotation margins.

Screenshots captured locally:

- `/tmp/qmreader-click-margin.png`
- `/tmp/qmreader-click-agent.png`
- `/tmp/qmreader-click-mobile.png`

## Deployment

- Backed up production files to `/opt/qiaomu-apps/qmreader/backups/20260701T092921Z-ai-sidebar-annotation-polish/`.
- Synced:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - this ops note
- No service restart required; Express serves the updated static files and `index.html` references bumped asset query strings.
## Live Verification

- `https://rss.qiaomu.ai/` references `/styles.css?v=134` and `/app.js?v=132`.
- `https://rss.qiaomu.ai/app.js?v=132` and `https://rss.qiaomu.ai/styles.css?v=134` return HTTP 200.
- `qmreader` is active on the VPS and the local `/api/sources` health probe succeeds.
- Root-level orphan files from an initial incorrect `rsync` target were removed.
- Fresh production click-path browser verification:
  - Desktop with AI collapsed: an injected annotation renders as a compact right-side margin note and text highlight.
  - Desktop with AI open: native AI companion is active, the annotation margin is hidden, the old annotation side panel is absent, and the prompt rail shows five tasks.
  - Mobile viewport `390x844`: reader remains open, annotation margin is hidden, and there is no horizontal overflow.

Screenshots captured locally:

- `/tmp/qmreader-fresh-live-margin.png`
- `/tmp/qmreader-fresh-live-agent.png`
- `/tmp/qmreader-fresh-live-mobile.png`
