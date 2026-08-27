# 2026-06-25 Selection Copy Change

Goal: let readers copy selected article text from the same selection popover used for inline annotation comments.

Scope:

- Add a `复制选中` action to the annotation popover.
- Preserve the raw selected text for copying while keeping the normalized quote for annotation anchoring.
- Keep annotation submission payload limited to the existing server fields.
- Bump static asset cache versions to `v=122`.

Local verification:

- `node --check public/app.js`
- `git diff --check`
- Chrome smoke with the system Chrome binary: open local service, open an article, select reader text, confirm the annotation popover shows `复制选中`, click it, and see `选中文本已复制`.
- Observed favicon 404s from Google for `igerman.cc`; no JavaScript errors from this change.

Production deployment:

- Backup: `/opt/qiaomu-apps/qmreader/backups/selection-copy-20260625T012518Z`
- Deployed files: `public/app.js`, `public/index.html`, `public/styles.css`, and this ops note.
- Runtime: standalone `qmreader` systemd service behind Nginx; static file sync only, no restart required.
- Production verification confirmed `/app.js?v=122`, `/styles.css?v=122`, and `annotation-popover-copy` are served by `https://rss.qiaomu.ai/`.
- Live Chrome smoke passed on `https://rss.qiaomu.ai/`: open an article, select reader text, confirm `复制选中` appears, click it, and see `选中文本已复制`.
- Observed one Google favicon 404 for `igerman.cc`; no JavaScript errors from the selection-copy change.

Rollback:

- Restore `public/app.js`, `public/index.html`, and `public/styles.css` from `/opt/qiaomu-apps/qmreader/backups/selection-copy-20260625T012518Z/`.
- Restart `qmreader` only if static file serving behaves unexpectedly.
