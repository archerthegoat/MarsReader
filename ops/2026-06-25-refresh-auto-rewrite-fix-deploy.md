# 2026-06-25 refresh and auto rewrite fix

## Issue

- Daily 08:00 refresh jobs on the VPS started but exited before completion.
- Production logs showed `ambiguous column name: updated_at` in `store.getSubmissionMeta()`.
- The failure happened while building the manual `user-submitted` source cache, which could abort the whole refresh round before title translation and priority-source auto rewrite completed.

## Fix

- Qualify `user_submissions.updated_at` as `s.updated_at` in `getSubmissionMeta()`.
- Make `refreshAll()` isolate unexpected per-source failures so one source cannot stop the rest of the scheduled update.
- Make standalone `scripts/refresh-worker.js` exit after printing its result, so manual refresh checks do not appear stuck after the work is done.

## Local Verification

- `node --check lib/store.js`
- `node --check lib/fetcher.js`
- `node --check lib/background-jobs.js`
- `node --check scripts/refresh-worker.js`
- `store.getSubmissionMeta()` local smoke check

## Deployment

- Backed up production `lib/store.js` and `lib/fetcher.js` to `/opt/qiaomu-apps/qmreader/backups/20260625T015508Z/`.
- Synced `lib/store.js`, `lib/fetcher.js`, and this ops note to `/opt/qiaomu-apps/qmreader`.
- Restarted `qmreader.service`.
- Production `store.getSubmissionMeta()` smoke check passes.
- `user-submitted` refresh passes with status `ok`.
- Targeted source refresh/backfill:
  - `bensbites`: status `ok`, 10 entries, auto rewrite `cached: 3`, `failed: []`.
  - `nlp-elvis`: status `ok`, 5 entries, auto rewrite `rewritten: 1`, `cached: 2`, `failed: []`.
  - `readwise-wise`: status `ok`, 10 entries, auto rewrite `cached: 3`, `failed: []`.
- Full standalone refresh check completed: title translations `35`, auto rewrite `cached: 9`, `failed: []`.
- Synced `scripts/refresh-worker.js` CLI exit fix and restarted `qmreader.service` again so production memory reloads the refreshed disk cache.
- API `/api/sources` after restart shows:
  - `bensbites`: `fetchedAt` `2026-06-25T01:59:06.215Z`, status `ok`.
  - `nlp-elvis`: `fetchedAt` `2026-06-25T01:59:06.501Z`, status `ok`.
  - `readwise-wise`: `fetchedAt` `2026-06-25T01:59:08.302Z`, status `ok`.
- Production DB check shows the latest four entries for `bensbites`, `nlp-elvis`, and `readwise-wise` all have `deepseek-v4-flash` rewrite rows.
- Journal check after deploy shows no new `ambiguous column` or `Refresh worker exited` errors.
