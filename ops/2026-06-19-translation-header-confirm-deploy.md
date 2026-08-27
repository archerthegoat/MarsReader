# 2026-06-19 Translation, Header, and Confirm Deploy

Goal: fix the article Chinese translation tab, tighten the reader header, and remove browser-native confirmation dialogs.

Root cause:

- Title translation records in `entry_translations` could exist without `content_json`.
- `getTranslation()` returned those title-only rows, so the article detail API treated them like translation assets even though no translated body existed.
- The front end also used the global AI profile for translation, while rewrite and agent already had purpose-specific profile selection.

Scope:

- Return `null` from `getTranslation()` unless translated body blocks exist.
- Add a translation-specific AI profile slot and selector.
- Add a custom confirmation dialog component and replace `window.confirm` usages.
- Reduce reader header vertical weight and split primary actions from admin-only destructive actions.
- Add a server-side warning log for translation generation failures.

Local verification:

- `node --check public/app.js`
- `node --check lib/store.js`
- `node --check server.js`
- `git diff --check`
- Confirmed no `window.confirm`, `window.alert`, or `window.prompt` usages remain in the front-end.
- Data-layer test passed: title-only translation rows return `null`; full translation rows still return content.
- Browser smoke passed on local service: translation tab shows empty state and translation model selector; console has no errors.

Production deployment:

- Backup: `/opt/qiaomu-apps/qmreader/backups/translation-header-confirm-20260619T130454Z`
- Deployed files: `lib/store.js`, `server.js`, `public/app.js`, `public/index.html`, `public/styles.css`, and this ops note.
- Restarted `qmreader` at `2026-06-19 13:05:37 UTC`; service is active with PID `2260785`.

Production verification:

- Homepage references `/styles.css?v=121` and `/app.js?v=121`.
- Homepage contains `translation-profile-select` and `confirm-modal`.
- Screenshot article `345540d0702939efb7a140d2b0c19236` now returns `{"translation":null}` for title-only translation data.
- Production front-end bundle has no `window.confirm`, `window.alert`, or `window.prompt` usages.
- Production CSS contains the reader toolbar grouping and custom confirm modal rules.
- `journalctl -u qmreader --since "10 minutes ago"` shows a clean restart and no new translation errors.

Rollback:

- Restore the backed-up files in `/opt/qiaomu-apps/qmreader/backups/translation-header-confirm-20260619T130454Z/`.
- Restart `qmreader`.
