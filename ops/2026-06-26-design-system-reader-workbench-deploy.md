# 2026-06-26 Design System Reader Workbench Deploy

## Scope

- Add a reader preference toolbar for immersive mode, font size, line height, column width, and reading font.
- Reframe the right context pane as a workbench with annotation discussion, AI reading, and article information panels.
- Group AI reading prompts by task: understanding, verification, critique, action, writing, and extended reading.
- Make the hot ranking mechanism transparent with QScore signals, penalties, and time decay.
- Improve keyboard flow for article navigation, reader tabs, starring, liking, AI, copy, and immersive mode.
- Tighten shared UI tokens, focus indicators, and responsive guards for desktop and mobile reading.

## Local Verification

- `node --check public/app.js`
- `node --check server.js`
- `node --check scripts/refresh-worker.js`
- `git diff --check`
- Local Chrome smoke on `http://127.0.0.1:8095`:
  - desktop article opens with reader preferences, QScore, context workbench, and AI prompt groups
  - immersive mode hides side panes and keeps no horizontal overflow
  - mobile 390px viewport has no horizontal overflow and shows the context pane as a bottom sheet

## Production Target

- Host: `myvps`
- App: `/opt/qiaomu-apps/qmreader`
- Domain: `https://rss.qiaomu.ai`
- Runtime: systemd `qmreader`

## Production Verification

- Remote backup: `/opt/qiaomu-apps/qmreader/backups/design-system-reader-workbench-20260625T163556Z`
- Synced:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - this ops note
- Runtime stayed on systemd `qmreader`; static file sync only, no restart required. `systemctl is-active qmreader` returned `active`.
- Verified `https://rss.qiaomu.ai/` serves `/styles.css?v=127` and `/app.js?v=125`.
- Verified production `app.js` contains `AI_READING_TASKS`, `entryQualityBreakdown`, and `setReaderImmersive`.
- Verified production `styles.css` contains the design system reader workbench pass, reader immersive rules, and QScore explainer rules.
- Verified `https://rss.qiaomu.ai/api/entries?limit=2` returns entries.
- Live Chrome smoke passed on `https://rss.qiaomu.ai/`:
  - desktop article opens with reader preferences, context workbench, QScore, and AI prompt groups
  - prompt groups are `理解 / 核查 / 反驳 / 行动 / 写作 / 延伸`
  - immersive mode hides side panes and keeps no horizontal overflow
  - 390px mobile viewport has reader preferences in grid layout and no body/app horizontal overflow
  - no page errors and no `rss.qiaomu.ai` 4xx responses during smoke
