# 2026-07-03 AI selected-text context layout deploy

Target: `rss.qiaomu.ai` on `myvps:/opt/qiaomu-apps/qmreader`

## Changes

- Force the AI companion form to use a single-column grid so the selected-text context card sits above the composer instead of beside it.
- Make the context card and composer span the full available panel width.
- Add width, overflow, and word-break guards for long selected text and mixed Chinese/English content.
- Bump `styles.css` from `v=153` to `v=154`.

## Local Verification

- `node --check public/app.js`
- `git diff --check -- public/styles.css public/index.html`
- Local Chrome CDP checks on `http://127.0.0.1:3099/`:
  - Desktop `1512x900`: context card is above composer, both are `279px`, horizontal overflow `0`.
  - Desktop `1225x768`: context card is above composer, both are `255px`, horizontal overflow `0`.
  - Mobile `390x844`: context card is above composer, both are `366px`, horizontal overflow `0`.

Screenshots captured locally:

- `/tmp/qmreader-agent-context-1512.png`
- `/tmp/qmreader-agent-context-1225.png`
- `/tmp/qmreader-agent-context-mobile.png`

## Deployment

- Backup: `/opt/qiaomu-apps/qmreader/backups/20260703T0044-agent-context-layout`
- Synced:
  - `public/index.html`
  - `public/styles.css`
- No service restart required; `qmreader` stayed active as the systemd Node service on `127.0.0.1:3088`.

## Live Verification

- `https://rss.qiaomu.ai/` references `/styles.css?v=154` and `/app.js?v=149`.
- `https://rss.qiaomu.ai/styles.css?v=154` returns HTTP 200 with the new context-card layout rules.
- `systemctl is-active qmreader` returned `active`.
- Live Chrome CDP checks:
  - Desktop `1225x768`: context card is above composer, both are `255px`, horizontal overflow `0`, no JS exceptions.
  - Mobile `390x844`: context card is above composer, both are `366px`, horizontal overflow `0`, no JS exceptions.
  - A separate mobile live load produced no `Network.loadingFailed` events.

Screenshots captured live:

- `/tmp/qmreader-live-agent-context-1225.png`
- `/tmp/qmreader-live-agent-context-mobile-open.png`

## Rollback

Restore `public/index.html` and `public/styles.css` from `/opt/qiaomu-apps/qmreader/backups/20260703T0044-agent-context-layout/`. Restart is not expected to be necessary for this static-file rollback.
