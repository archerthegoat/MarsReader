# 2026-07-03 Anonymous Submit Link Deploy

## Goal

Allow logged-out readers to submit links to the `读者提交` source. Anonymous submissions use the existing `读者` author fallback and still enter the title translation / rewrite pipeline.

## Changes

- `server.js`
  - Removed `requireLogin` from `POST /api/submit-link`.
  - Passes `req.user || {}` to `fetcher.submitLink()`.
  - Reads the returned entry with optional viewer context.
- `public/app.js`
  - `openSubmitLinkModal()` no longer redirects logged-out users to login.
  - `submitReaderLink()` no longer requires login.
  - `submitArticleLinkToSite()` submits directly for logged-out users.
  - Success copy now says `已收录到读者提交，正在生成中文改写`.
- `public/index.html`
  - Bumped `app.js` cache key to `v=151`.

## Local Verification

- `node --check server.js`
- `node --check public/app.js`
- `git diff --check -- server.js public/app.js public/index.html`
- Local anonymous API smoke on `127.0.0.1:3099` with model keys intentionally blank:
  - `POST /api/submit-link`
  - HTTP 200
  - returned `sourceId: user-submitted`
  - returned `author: 读者`
- Local headless Chrome CDP assertions:
  - logged-out submit modal opens without auth
  - logged-out article link submit calls `/api/submit-link`
  - success path switches to `filterSource: user-submitted`

## Deploy

- Remote app: `myvps:/opt/qiaomu-apps/qmreader`
- Service: `qmreader`
- Backup: `/opt/qiaomu-apps/qmreader/backups/20260703T0108-anonymous-submit-link`
- Synced files:
  - `server.js`
  - `public/app.js`
  - `public/index.html`
- Restart: `systemctl restart qmreader`

## Live Verification

- `https://rss.qiaomu.ai/` references `/app.js?v=151`.
- `https://rss.qiaomu.ai/app.js?v=151` returns HTTP 200.
- Remote `server.js` route is `app.post('/api/submit-link', async ...)`.
- No-cookie live `POST /api/submit-link` with an existing submitted URL returned HTTP 200.
- Returned entry:
  - id `057a6f402b595b0fb917854ad1070124`
  - source `user-submitted`
  - author `读者`
  - title `给AI做求职面试`
- `GET /api/entries?source=user-submitted&limit=3` shows the anonymous submission at the top of `读者提交`.
- `journalctl -u qmreader` shows service active and `Submitted link rewritten: 057a6f402b595b0fb917854ad1070124`.
