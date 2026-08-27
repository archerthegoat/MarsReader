# Security Policy

## Supported Versions

QMReader is maintained from the `main` branch. Public reports should target the latest published code unless a release tag says otherwise.

## Reporting A Vulnerability

Please do not open a public issue for vulnerabilities or leaked credentials.

Report security issues privately to the maintainer:

- GitHub: [@archerthegoat](https://github.com/archerthegoat)
- X: [@vista8](https://x.com/vista8)
- Website: [qiaomu.ai](https://qiaomu.ai)

Include:

- A short description of the issue.
- Affected route, file, or deployment mode.
- Reproduction steps or a minimal proof of concept.
- Whether any secret, account, or private content may be exposed.

## Secret Handling

- Keep `.env`, `.env.local`, runtime SQLite files, cache files, logs, and screenshots out of Git.
- The repository intentionally ships only `.env.example` with empty key values.
- Server-side provider keys are loaded from environment variables or env files.
- User-supplied AI keys are stored in browser localStorage and are sent only to the QMReader backend for provider calls.
- Public comments, chat messages, translations, and rewrites are public assets; do not paste private keys or confidential content into them.

## Network Boundary

QMReader rejects non-HTTPS AI base URLs and blocks localhost/private network AI base URLs. This reduces SSRF risk but does not replace normal deployment hardening.
