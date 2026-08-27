# 2026-06-25 Product Layout IA Deploy

## Scope

- Refine the reader/product layout after the interaction review.
- Add list scope controls for latest, hot, unread, and asset-backed articles.
- Move admin source management into a full workspace page instead of a modal-only flow.
- Add a right-side article information inspector for metadata, public assets, and utility actions.
- Tighten desktop reader signal rail and mobile reader overflow behavior.

## Local Verification

- `node --check public/app.js`
- `node --check server.js`
- `git diff --check`
- CSS brace balance check
- Local SPA routes: `/admin`, `/me`
- Local Chrome screenshots:
  - `/tmp/qmreader-layout-article-v2.png`
  - `/tmp/qmreader-layout-home-v2.png`
  - `/tmp/qmreader-layout-mobile-cdp.png`

## Production Target

- Host: `myvps`
- App: `/opt/qiaomu-apps/qmreader`
- Domain: `https://rss.qiaomu.ai`
- Runtime: systemd `qmreader`

## Production Verification

- Remote backup: `/opt/qiaomu-apps/qmreader/backups/20260625T110537`
- Synced:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `server.js`
  - this ops note
- Restarted `qmreader`; service returned `active`.
- Verified `https://rss.qiaomu.ai/` serves `/styles.css?v=126` and `/app.js?v=124`.
- Verified `/admin` returns `HTTP/2 200`.
- Verified production CSS contains the information architecture pass.
- Verified production JS contains admin page, list scope, and article info panel handlers.
- Verified live DOM at `https://rss.qiaomu.ai/articles/dopamine-fracking--514f85967b84`:
  - `scrollWidth=1440` at desktop viewport
  - list scope bar present
  - article info tab present
  - reader signal rail present
  - reader tabs ordered `原文 | 中文改写 | 中文翻译`
- Verified `/api/entries?limit=2` and `/api/sources` return valid JSON.
- Checked `journalctl -u qmreader -n 30`; no runtime errors after restart.
