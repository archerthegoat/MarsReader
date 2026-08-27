# 2026-06-25 Selection Copy Close Deploy

Goal: make the selected-text copy action behave like a one-shot action.

Scope:

- Rename the annotation popover copy action from `复制选中` to `复制`.
- Close the annotation popover after selected text is copied successfully.
- Clear the browser text selection after a successful copy.
- Keep the popover open when copy fails so the reader can manually copy.
- Bump static asset cache versions to `v=123`.

Local verification:

- `node --check public/app.js`
- `git diff --check`
- Chrome smoke with the system Chrome binary: open local service, open an article, select reader text, confirm the popover copy button reads `复制`, click it, see `选中文本已复制`, confirm the popover is hidden and selection is cleared.
- Observed favicon 404s from Google for `igerman.cc`; no JavaScript errors from this change.

Production deployment:

- Backup: `/opt/qiaomu-apps/qmreader/backups/selection-copy-close-20260625T014457Z`
- Deployed files: `public/app.js`, `public/index.html`, and this ops note.
- Runtime: standalone `qmreader` systemd service behind Nginx; static file sync only, no restart required.
- Production verification confirmed `/app.js?v=123`, `/styles.css?v=123`, and the popover copy button text `复制` are served by `https://rss.qiaomu.ai/`.
- Live Chrome smoke passed on `https://rss.qiaomu.ai/`: select reader text, click `复制`, see `选中文本已复制`, confirm the popover is hidden and the text selection is cleared.
- Observed Google favicon 404s for `igerman.cc`; no JavaScript errors from the copy-close change.

Rollback:

- Restore `public/app.js` and `public/index.html` from `/opt/qiaomu-apps/qmreader/backups/selection-copy-close-20260625T014457Z/`.
- Restart `qmreader` only if static file serving behaves unexpectedly.
