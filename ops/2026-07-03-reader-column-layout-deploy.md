# 2026-07-03 reader column layout deploy

Target: `rss.qiaomu.ai` on `myvps:/opt/qiaomu-apps/qmreader`

## Changes

- Prevent narrow desktop reader layouts from squeezing the article list below its usable minimum when the article AI side panel is preferred open.
- Let the left sidebar collapse state win over desktop reading CSS, so the leftmost sidebar toggle works in article reading mode.
- Add separator ARIA value metadata for the list/context splitters.
- Keep reader padding tighter when the right panel is collapsed so the article uses more of its own space.

## Verification

- `node --check public/app.js`
- `git diff --check -- public/app.js public/styles.css public/index.html`
- Live resources:
  - `https://rss.qiaomu.ai/` references `/styles.css?v=153` and `/app.js?v=149`.
  - `https://rss.qiaomu.ai/app.js?v=149` and `https://rss.qiaomu.ai/styles.css?v=153` return HTTP 200.
- Live Chrome checks:
  - At 1225px with right panel preference open, initial article layout auto-collapses the right panel without persisting the user preference: `232px 303px 4px 686px 0px 0px`.
  - Leftmost sidebar toggle collapses to a 64px rail and preserves a 303px article list: `64px 303px 4px 854px 0px 0px`.
  - Manual right-panel open on the same narrow width collapses the left workbench instead of squeezing columns: `0px 0px 0px 961px 4px 260px`.
  - Immersive reading exits and restores the left side with one click on `#left-collapse-toggle`.
  - At 1512px, the full reader plus AI panel remains open: `232px 303px 4px 709px 4px 260px`.

## Deployment

- First backup: `/opt/qiaomu-apps/qmreader/backups/20260703T002752Z-reader-column-layout`
- Second backup: `/opt/qiaomu-apps/qmreader/backups/20260703T002940Z-reader-column-layout-v2`
- Deployed static files:
  - `public/app.js`
  - `public/styles.css`
  - `public/index.html`
- Runtime stayed on systemd `qmreader`; `systemctl is-active qmreader` returned `active`.

## Rollback

Restore the backed-up files from either backup directory into `/opt/qiaomu-apps/qmreader/public/`. Restart is not expected to be necessary for static file rollback.
