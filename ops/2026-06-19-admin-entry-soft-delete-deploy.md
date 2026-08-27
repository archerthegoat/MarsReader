# 2026-06-19 Admin Entry Soft Delete Deploy

Goal: allow logged-in admins to delete pages from the front-end while preserving historical article assets.

Scope:

- Add `entries.deleted_at`, `deleted_by`, and `deleted_reason` soft-delete fields.
- Hide soft-deleted entries from reader lists, article detail lookup, submitted links, source counts, contributors, and public asset queries.
- Add `DELETE /api/entry/:id` behind `requireAdmin`.
- Show a front-end "删除页面" action only for admins on the article detail page.

Data behavior:

- Articles are not physically deleted.
- Existing translations, rewrites, comments, annotations, chat messages, stats, and reactions stay in the database.
- Feed refreshes and submitted links must not resurrect a deleted entry.

Local verification:

- `node --check` passed for `lib/store.js`, `lib/fetcher.js`, `server.js`, and `public/app.js`.
- `git diff --check` passed.
- Data-layer delete test passed: deleted entries become unreadable and resubmission is blocked.
- HTTP test passed: guest delete returns 403, admin delete returns 200, deleted entry returns 404 and is hidden from `/api/entries`.

Production deploy:

- Backup created on VPS: `/opt/qiaomu-apps/qmreader/backups/admin-entry-soft-delete-20260619T124424Z`.
- Synced files into `/opt/qiaomu-apps/qmreader`.
- Removed accidental root-level rsync copies: `store.js`, `fetcher.js`, `app.js`, `index.html`, and `styles.css`.
- Remote `node --check` passed for `lib/store.js`, `lib/fetcher.js`, `server.js`, and `public/app.js`.
- Restarted `qmreader.service`; status is `active`.
- Verified `https://rss.qiaomu.ai/` returns 200 and serves `styles.css?v=117`, `app.js?v=120`, and the admin-only delete button markup.
- Verified `https://rss.qiaomu.ai/api/sources` returns source metadata.
- Verified anonymous `DELETE /api/entry/:id` returns 403.

Rollback:

- Restore the backed-up files in `/opt/qiaomu-apps/qmreader/backups/<timestamp>/`.
- Restart `qmreader`.
- The soft-delete columns can remain; old code ignores them.
