# QMReader reader space and Agent redesign deploy

Date: 2026-06-26

Target: `rss.qiaomu.ai` on `myvps:/opt/qiaomu-apps/qmreader`

Scope:

- Move favorite, like, and dislike actions back into the reader toolbar next to copy link.
- Collapse reader preferences into an `Aa` popover and add more reading font choices.
- Remove the right-side article info tab and keep the context workbench focused on annotations and AI reading.
- Refine the AI reading panel around context chips, message stream, task prompts, and composer.
- Reduce default side column widths and reader padding to increase real article content space.

Local verification:

- `node --check public/app.js`
- `node --check server.js`
- `node --check scripts/refresh-worker.js`
- `git diff --check`
- Chrome/Playwright smoke at `127.0.0.1:8095` for desktop and mobile:
  - Reader content width is 476px at 1440px viewport.
  - Reader signal rail is hidden.
  - Favorite, like, dislike, and `Aa` settings are visible in the toolbar.
  - Reader preferences are hidden by default, open as an opaque popover, and include seven font choices.
  - Context workbench has only two tabs: annotations and AI reading.
  - AI panel opens without horizontal overflow.

Deployment plan:

1. Verify SSH access and target runtime.
2. Back up current `public/index.html`, `public/app.js`, and `public/styles.css`.
3. Sync updated static files and this ops note.
4. Verify live cache-busted assets and representative article UI.

Live deployment:

- Backup: `/opt/qiaomu-apps/qmreader/backups/reader-space-agent-redesign-20260625T171324Z`
- Synced:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `ops/2026-06-26-reader-space-agent-redesign-deploy.md`

Live verification:

- `systemctl is-active qmreader` -> `active`
- `https://rss.qiaomu.ai/` references `/styles.css?v=128` and `/app.js?v=126`
- `https://rss.qiaomu.ai/styles.css?v=128` -> HTTP 200
- `https://rss.qiaomu.ai/app.js?v=126` -> HTTP 200
- Chrome smoke on `https://rss.qiaomu.ai/articles/浏览器兼容性数据库--81ee7b74bb34`:
  - Reader content width is 476px at 1440px viewport.
  - Reader signal rail is hidden.
  - Copy, favorite, like, dislike, and `Aa` settings controls are visible in the toolbar.
  - Reader preferences popover is opaque and has seven font choices.
  - Context workbench has only annotations and AI reading tabs.
  - AI panel opens and composer renders.
  - Desktop and 390px mobile checks have no horizontal overflow.
