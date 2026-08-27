# 2026-07-03 Change Password Deploy

## Goal

Add an in-app password change flow so logged-in QMReader users do not need server-side `.env` resets.

## Changes

- `lib/store.js`
  - Added `updateUserPassword(userId, { currentPassword, newPassword })`.
  - Verifies the current password before replacing the password hash and salt.
  - Rejects passwords that fail the existing 8-128 character policy.
  - Rejects setting the same password again.
- `server.js`
  - Added `POST /api/me/password` behind `requireLogin`.
- `public/index.html`
  - Added `账号菜单 -> 修改密码`.
  - Added the change-password modal.
  - Bumped `app.js` to `v=152`.
- `public/app.js`
  - Added open/close/submit handlers for the change-password modal.
  - Success updates local `state.me`, closes the modal, and shows `密码已修改`.

## Local Verification

- `node --check server.js`
- `node --check public/app.js`
- `node --check lib/store.js`
- `git diff --check -- lib/store.js server.js public/app.js public/index.html`
- Local API smoke with a temporary user:
  - register returned 200
  - wrong current password returned 401
  - password change returned 200
  - old password login returned 401
  - new password login returned 200 with session cookie
- Local headless Chrome CDP:
  - account menu shows `修改密码`
  - modal opens
  - submit calls `/api/me/password`
  - success closes modal and shows `密码已修改`

## Deploy

- Remote app: `myvps:/opt/qiaomu-apps/qmreader`
- Service: `qmreader`
- Backup: `/opt/qiaomu-apps/qmreader/backups/20260703T0134-change-password`
- Synced files:
  - `lib/store.js`
  - `server.js`
  - `public/app.js`
  - `public/index.html`
- Restart: `systemctl restart qmreader`

## Live Verification

- `https://rss.qiaomu.ai/` references `/app.js?v=152`.
- `https://rss.qiaomu.ai/app.js?v=152` returns HTTP 200.
- No-cookie `POST /api/me/password` returns HTTP 401.
- Remote code contains:
  - `app.post('/api/me/password', requireLogin, ...)`
  - `updateUserPassword`
  - `account-menu-password`
  - `change-password-modal`
- Live admin password roundtrip without exposing secrets:
  - current password login returned 200
  - change to temporary password returned 200
  - old password login returned 401
  - temporary password login returned 200
  - change back to current password returned 200
  - final current password login returned 200
- Service remains active; journal shows normal restart and startup.
