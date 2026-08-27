## Summary

Describe the user-visible change and any migration or deployment notes.

## Verification

- [ ] `node --check server.js`
- [ ] `node --check lib/background-jobs.js`
- [ ] `node --check lib/fetcher.js`
- [ ] `node --check lib/deepseek.js`
- [ ] `node --check lib/store.js`
- [ ] `node --check lib/sources.js`
- [ ] `node --check scripts/refresh-worker.js`
- [ ] `node --check public/app.js`

## Safety

- [ ] I did not commit `.env`, API keys, tokens, cookies, SQLite files, cache files, logs, screenshots, or `node_modules`.
- [ ] Public docs/examples contain placeholders only.

## Screenshots Or Output

Add current screenshots/API output only when relevant, and remove secrets first.
