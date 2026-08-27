# 2026-06-25 UI refinement deploy

Goal:
- Improve the overall visual polish of `rss.qiaomu.ai` after reviewing the product UI against modern web design best practices.

Scope:
- Refine shared visual tokens for light and dark themes.
- Soften page dividers, panel boundaries, cards, and shadows.
- Normalize button, input, tab, chip, and action-pill sizing.
- Improve article reading typography, spacing, and content hierarchy.
- Reduce noise in favicon placeholders and reader feedback controls.
- Bump the stylesheet cache key.

Local checks:
- `node --check server.js`
- `node --check public/app.js`
- CSS brace balance check
- `git diff --check`
- Local HTTP check on `http://127.0.0.1:8091/`
- Chrome headless screenshot for `/articles/dopamine-fracking--514f8596`

Production deployment:
- Backed up remote `public/styles.css` and `public/index.html` under `/opt/qiaomu-apps/qmreader/backups/<timestamp>/`.
- Synced `public/styles.css`, `public/index.html`, and this ops note to `/opt/qiaomu-apps/qmreader`.
- Restarted `qmreader` systemd service; service returned `active`.
- Verified `https://rss.qiaomu.ai/` serves `/styles.css?v=125`.
- Verified `https://rss.qiaomu.ai/styles.css?v=125` contains the refined product pass.
- Verified article canonical redirect and final article metadata for `Dopamine Fracking`.
- Verified `https://rss.qiaomu.ai/api/entries?limit=3` returns entries.
