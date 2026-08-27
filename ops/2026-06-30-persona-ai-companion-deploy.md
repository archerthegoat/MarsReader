# 2026-06-30 Persona AI Companion Deploy

## Scope

- Replace the large AI companion reading-task panel with Persona-mounted chat UI.
- Keep editable custom prompt chips directly above the Persona composer.
- Add `/api/entry/:id/chat/stream` as an SSE adapter for the existing article chat backend.
- Self-host Persona runtime files under `public/vendor/persona/`.

## Local Verification

- `node --check public/app.js`
- `node --check server.js`
- `curl` checks for Persona JS/CSS and the unauthenticated SSE 401 path.
- Playwright desktop and mobile smoke checks for Persona mount, prompt row, width containment, and prompt manager modal.

## Deploy Notes

- Target: `rss.qiaomu.ai`
- Remote path: `/opt/qiaomu-apps/qmreader`
- Runtime: systemd service `qmreader` on `127.0.0.1:3088`
- Do not sync `data/`, `.env`, or `node_modules/`.
