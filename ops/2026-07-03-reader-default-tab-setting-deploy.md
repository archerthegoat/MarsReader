# 2026-07-03 Reader Default Tab Setting Deploy

## Goal

Add a user setting in the personal dashboard for whether opening an article lands on `中文改写` or `原文`, defaulting to `中文改写`.

## Local Verification

- `node --check public/app.js`
- `node --check lib/store.js`
- `node --check server.js`
- `git diff --check -- lib/store.js server.js public/app.js public/index.html public/styles.css`
- Local Playwright checks:
  - Guest list click opens the `rewrite` tab and URL path ends in `/rewrite`.
  - Explicit `?tab=original` opens the `original` tab.
  - A temporary logged-in user can save `原文` in the personal dashboard; `/api/me` returns `defaultReaderTab: "original"`; a later list click opens `original`.
  - Desktop and mobile dashboard layouts have no horizontal overflow.
- Temporary verification users were removed and the SQLite WAL was checkpointed.

## Deployment

- Target: `rss.qiaomu.ai` on `myvps:/opt/qiaomu-apps/qmreader`
- Runtime: systemd `qmreader`
- Backup: `/opt/qiaomu-apps/qmreader/backups/20260703T150802Z-reader-default-tab-setting`
- Files to sync:
  - `lib/store.js`
  - `server.js`
  - `public/app.js`
  - `public/index.html`
  - `public/styles.css`
- Remote checks before restart:
  - `node --check public/app.js`
  - `node --check lib/store.js`
  - `node --check server.js`
- Sync: `rsync -azR ... myvps:/opt/qiaomu-apps/qmreader/`
- Restart: `systemctl restart qmreader`

## Live Verification

- `systemctl is-active qmreader` returned `active`.
- `https://rss.qiaomu.ai/` returned HTTP 200 and references `/app.js?v=154` plus `/styles.css?v=155`.
- `https://rss.qiaomu.ai/app.js?v=154` and `https://rss.qiaomu.ai/styles.css?v=155` returned HTTP 200.
- `https://rss.qiaomu.ai/api/me` returns `{"user":null}` without a session.
- Live Playwright checks:
  - Guest list click opened the `rewrite` tab and URL path ended in `/rewrite`.
  - A temporary logged-in user saw `中文改写` selected by default in the personal dashboard.
  - Saving `原文` returned `defaultReaderTab: "original"` from both the profile response and `/api/me`.
  - After saving `原文`, a list click opened the `original` tab.
  - Mobile dashboard width stayed at `390px` with no horizontal overflow.
- Temporary live verification user was deleted; follow-up query for `codex-live-tab-test-%@example.com` returned `0`.
