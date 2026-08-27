# Contributing

QMReader is primarily maintained for 向阳乔木's reading workflow, but focused contributions are welcome.

## Good Contribution Areas

- RSS source fixes and new source definitions.
- Fetch freshness and background worker reliability.
- Privacy/security boundary improvements.
- Deployment documentation for self-hosted installs.
- Bug fixes with clear reproduction steps.
- UI fixes that preserve the quiet reader-first workflow.

## Before You Open A PR

1. Keep changes scoped. Avoid unrelated refactors.
2. Do not commit `.env`, API keys, SQLite files, cache files, logs, screenshots, or `node_modules`.
3. Run the relevant checks:

```bash
node --check server.js
node --check lib/background-jobs.js
node --check lib/fetcher.js
node --check lib/deepseek.js
node --check lib/store.js
node --check lib/sources.js
node --check scripts/refresh-worker.js
node --check public/app.js
```

4. If the change affects live behavior, describe how you verified it locally or on a test deployment.
5. If the change affects public docs, keep `README.md` Chinese-first and English-accessible.

## Commit And PR Style

- Use concise commit messages.
- Explain user-visible impact first.
- Include screenshots or API output only when they are current and do not contain secrets.
- For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
