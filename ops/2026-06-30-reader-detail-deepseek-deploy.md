# 2026-06-30 reader detail and DeepSeek auto-rewrite deploy

Target: `rss.qiaomu.ai` on `myvps:/opt/qiaomu-apps/qmreader`

Started: `2026-06-30 06:59:07 UTC`

Goal:

- Simplify reader feedback counts, article tabs, rewrite controls, and the right context pane.
- Hide the Chinese translation tab from the main article detail flow while keeping legacy asset routes available.
- Default DeepSeek rewrite generation to `deepseek-v4-flash`.
- Make refresh-triggered auto rewrite cover enabled sources by default.

Local verification before deploy:

- `node --check server.js`
- `node --check lib/deepseek.js`
- `node --check lib/background-jobs.js`
- `node --check public/app.js`
- Desktop Chrome smoke on local `http://127.0.0.1:18080`: detail page shows two tabs, inline feedback counts, simplified rewrite header, no repeated context title, and no horizontal overflow.
- Mobile Chrome smoke at 390px: two tabs, inline feedback buttons, no horizontal overflow.

Deployment plan:

- Backup changed production files under `/opt/qiaomu-apps/qmreader/backups/reader-detail-deepseek-20260630T065907Z`.
- Sync only touched runtime/docs files, preserving production `data/`, `.env`, and unrelated ops history.
- Restart systemd `qmreader`.
- Verify public HTML asset versions, service status, API response, and live reader DOM.

Live deployment:

- Backup: `/opt/qiaomu-apps/qmreader/backups/reader-detail-deepseek-20260630T065907Z`
- Synced files:
  - `README.md`
  - `server.js`
  - `lib/background-jobs.js`
  - `lib/deepseek.js`
  - `public/app.js`
  - `public/index.html`
  - `public/styles.css`
  - `ops/2026-06-30-reader-detail-deepseek-deploy.md`
- Remote checks passed:
  - `node --check server.js`
  - `node --check lib/deepseek.js`
  - `node --check lib/background-jobs.js`
  - `node --check public/app.js`
- Restarted `qmreader`; `systemctl is-active qmreader` returned `active`.
- Verified `https://rss.qiaomu.ai/` serves `/styles.css?v=129` and `/app.js?v=127`.
- Verified `https://rss.qiaomu.ai/styles.css?v=129` contains the reader detail simplification pass.
- Verified `https://rss.qiaomu.ai/app.js?v=127` contains `DEFAULT_REWRITE_MODEL = 'deepseek-v4-flash'`.
- Verified `https://rss.qiaomu.ai/api/entries?limit=2` returns entries.
- Live Chrome smoke on `https://rss.qiaomu.ai/`:
  - Article detail shows only `原文` and `中文改写` tabs.
  - Feedback buttons render inline counts: `收藏 0`, `赞 0`, `踩 0`.
  - Rewrite header has no model select.
  - Right sidebar has no context workbench header and no repeated article title.
  - Desktop and 390px mobile have no horizontal overflow.
  - No `rss.qiaomu.ai` 4xx responses and no page errors during smoke.
- Journal after restart shows a clean startup; only the existing Node SQLite experimental warning is present.

Rollback:

- Restore the backed-up files from `/opt/qiaomu-apps/qmreader/backups/reader-detail-deepseek-20260630T065907Z/`.
- Restart `qmreader`.
