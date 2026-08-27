# 2026-06-30 Hugging Face paper interpretation deploy

Target: `rss.qiaomu.ai` on `myvps:/opt/qiaomu-apps/qmreader`

Started: `2026-06-30 08:16:53 UTC`

Goal:

- Treat Hugging Face Papers as a paper-focused source instead of a generic scraped page.
- Render paper metadata, abstract, arXiv/PDF/Hugging Face links in the original reader view.
- Switch the rewrite surface for this source to Qiaomu-style paper interpretation copy.
- Use a dedicated AI prompt/hash path for Hugging Face paper interpretation.

Local verification before deploy:

- `node --check lib/fetcher.js`
- `node --check lib/deepseek.js`
- `node --check public/app.js`
- `node --check server.js`
- `git diff --check`
- Local API smoke: Hugging Face list omits content, entry detail returns `paper-brief` with PDF link.
- Playwright desktop and 390px mobile smoke checks: `论文解读` labels, paper card visible, no horizontal overflow.

Deployment plan:

- Back up changed production files under `/opt/qiaomu-apps/qmreader/backups/huggingface-paper-interpretation-20260630T081653Z`.
- Sync only touched runtime/docs files, preserving production `data/`, `.env`, `node_modules/`, and unrelated ops history.
- Restart systemd `qmreader`.
- Verify public API, static assets, live reader DOM, and service status.

Deployed:

- Backup created at `/opt/qiaomu-apps/qmreader/backups/huggingface-paper-interpretation-20260630T081653Z`.
- Synced files:
  - `README.md`
  - `lib/deepseek.js`
  - `lib/fetcher.js`
  - `lib/sources.js`
  - `public/app.js`
  - `public/index.html`
  - `public/styles.css`
  - `ops/2026-06-30-huggingface-paper-interpretation-deploy.md`
- Remote syntax checks passed:
  - `node --check lib/fetcher.js`
  - `node --check lib/deepseek.js`
  - `node --check public/app.js`
  - `node --check server.js`
- Restarted `qmreader`; `systemctl is-active qmreader` returned `active`.
- Public static checks passed:
  - `/` references `/app.js?v=130`, `/styles.css?v=132`, and `/vendor/persona/index.global.js`.
  - `/app.js?v=130` contains paper UI copy and `isPaperEntry`.
  - `/styles.css?v=132` contains `.paper-brief` and `.paper-meta-list`.
- Public API checks passed:
  - `/api/entry/91989ab0ccf1b6326ea3742d20e5729d` returns `paper-brief` content with arXiv PDF link.
  - `/api/entry/91989ab0ccf1b6326ea3742d20e5729d/rewrite` returns a `rewrite` object with model `deepseek-v4-flash` and a body starting with `### 这篇论文为什么值得看`.
  - `/api/entries?source=huggingface&limit=15` returns `count: 15`, `rewriteCount: 15`.
- Generated fresh paper interpretations for the current Hugging Face batch:
  - `rewritten: 15`
  - `cached: 0`
  - `failed: []`
  - `elapsedMs: 217022`
- Live browser smoke passed on desktop `1440x1000` and mobile `390x844`:
  - Source list shows `Hugging Face Papers`.
  - First paper opens at `/rewrite`.
  - Active tab text is `论文解读`.
  - Original tab text is `原文`.
  - Paper metadata card is visible.
  - Rewrite content is visible and starts with `这篇论文为什么值得看`.
  - No horizontal overflow.
  - One external favicon request returned 404; no `rss.qiaomu.ai` 4xx responses.

Rollback:

```bash
cd /opt/qiaomu-apps/qmreader
sudo cp backups/huggingface-paper-interpretation-20260630T081653Z/README.md README.md
sudo cp backups/huggingface-paper-interpretation-20260630T081653Z/deepseek.js lib/deepseek.js
sudo cp backups/huggingface-paper-interpretation-20260630T081653Z/fetcher.js lib/fetcher.js
sudo cp backups/huggingface-paper-interpretation-20260630T081653Z/sources.js lib/sources.js
sudo cp backups/huggingface-paper-interpretation-20260630T081653Z/app.js public/app.js
sudo cp backups/huggingface-paper-interpretation-20260630T081653Z/index.html public/index.html
sudo cp backups/huggingface-paper-interpretation-20260630T081653Z/styles.css public/styles.css
sudo systemctl restart qmreader
```
