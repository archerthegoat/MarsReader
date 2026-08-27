# 2026-07-03 submit-link menu flow deploy

Target: `rss.qiaomu.ai` on `myvps:/opt/qiaomu-apps/qmreader`

## Findings

- `读者提交` currently had 6 persisted submissions; the latest persisted submission was `2026-07-01T16:51:21.347Z`, so the user's recent click did not save a new entry.
- Successful `/api/submit-link` saves entries immediately under `sourceId=user-submitted`; title translation happens synchronously before the response, while Chinese rewrite is queued afterward.
- The article inline link menu had two UX gaps:
  - logged-out clicks only showed a toast and did not preserve the pending URL for login;
  - logged-in success reloaded data but did not switch the visible list to `读者提交` or open the new entry.

## Changes

- Route logged-out article-link submissions through the same pending submit/login flow used by the main `提交链接` button.
- After a successful article-link submission, switch to `filterSource='user-submitted'`, reload sources/entries/contributors, render the sidebar/list, and open the returned entry.
- Update the success toast to `已收录到读者提交，正在生成中文改写`.
- Bump `app.js` from `v=149` to `v=150`.

## Local Verification

- `node --check public/app.js`
- `git diff --check -- public/app.js public/index.html`
- Local Chrome CDP behavior check:
  - logged-out click opens auth and preserves pending URL/note;
  - mocked success path posts `/api/submit-link`, switches `filterSource` to `user-submitted`, opens the returned entry, and clears the submitting flag.

## Deployment

- Backup: `/opt/qiaomu-apps/qmreader/backups/20260703T0056-submit-link-menu-flow`
- Synced:
  - `public/index.html`
  - `public/app.js`
- No restart required; `qmreader` stayed active as the systemd Node service on `127.0.0.1:3088`.

## Live Verification

- `https://rss.qiaomu.ai/` references `/app.js?v=150`.
- `https://rss.qiaomu.ai/app.js?v=150` returns HTTP 200 and contains the new submit-link flow.
- `systemctl is-active qmreader` returned `active`.
- Live Chrome CDP behavior check passed:
  - logged-out click opens auth and preserves pending URL/note;
  - mocked success path posts `/api/submit-link`, switches `filterSource` to `user-submitted`, opens the returned entry, shows the new toast, and produces no JS exceptions.

## Rollback

Restore `public/index.html` and `public/app.js` from `/opt/qiaomu-apps/qmreader/backups/20260703T0056-submit-link-menu-flow/`. Restart is not expected to be necessary for this static-file rollback.
