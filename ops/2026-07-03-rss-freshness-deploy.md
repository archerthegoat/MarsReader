# 2026-07-03 RSS freshness deploy

Target: `rss.qiaomu.ai` on `myvps:/opt/qiaomu-apps/qmreader`

Started: `2026-07-03 20:58 +08`

Goal:

- Reduce perceived RSS latency by adding lightweight source freshness sweeps.
- Make fetched RSS entries visible before title translation and auto rewrite finish.
- Avoid dropping fresh items from feeds whose raw item order is not strictly newest-first.
- Reduce opportunistic refresh failures from short SQLite lock waits.

Planned local checks:

- `node --check server.js`
- `node --check lib/fetcher.js`
- `node --check lib/background-jobs.js`
- `node --check lib/store.js`
- `node --check scripts/refresh-worker.js`
- `node --check public/app.js`
- Targeted `producthunt` refresh smoke

Local verification:

- `node --check server.js`
- `node --check lib/fetcher.js`
- `node --check lib/background-jobs.js`
- `node --check lib/store.js`
- `node --check scripts/refresh-worker.js`
- `node --check public/app.js`
- `git diff --check`
- Local `producthunt` refresh worker surfaced current entries headed by `Vox`, `Osloq`, and `Glaze by Raycast`.
- IPC smoke confirmed worker message order `started -> progress -> progress -> fetchDone -> done`, so the web process can reload RSS cache before AI post-processing completes.
- Local HTTP smoke on `127.0.0.1:18080` confirmed `/app.js?v=153`, `/api/sources`, and Product Hunt entries.

Deployment plan:

- Sync only changed runtime/docs files, preserving production `data/`, `.env`, and unrelated files.
- Restart `qmreader.service`.
- Verify `https://rss.qiaomu.ai/` serves the bumped app asset.
- Verify `/api/sources` reports healthy sources and freshness background state.
- Verify targeted Product Hunt refresh can surface current feed items.

Live deployment:

- Backup: `/opt/qiaomu-apps/qmreader/backups/rss-freshness-20260703T130357Z`
- Synced changed runtime/docs files only: `server.js`, `README.md`, `lib/fetcher.js`, `lib/background-jobs.js`, `lib/store.js`, `scripts/refresh-worker.js`, `public/app.js`, `public/index.html`, and this ops note.
- Remote `node --check` passed for `server.js`, `lib/fetcher.js`, `lib/background-jobs.js`, `lib/store.js`, `scripts/refresh-worker.js`, and `public/app.js`.
- Restarted `qmreader.service`; `systemctl is-active qmreader` returned `active`.
- Live `https://rss.qiaomu.ai/` returned 200 and served `/app.js?v=153`.
- Live `/api/sources` reported 37 enabled sources and no enabled-source errors.
- Triggered Product Hunt refresh via `/api/sources/producthunt/refresh-hint`; live Product Hunt entries are now headed by `Vox`, `Osloq`, `Glaze by Raycast`, `Tamamon`, and `Goals from Loops`.
- Freshness sweep self-test passed after restart: at `2026-07-03T13:08:49Z`, the scheduler refreshed `github_trending` with `reason: freshness-sweep`, status `ok`, and no new `database is locked` / worker error logs.

Rollback:

- Restore backed-up changed files from the deployment backup directory.
- Restart `qmreader.service`.
