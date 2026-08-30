# Mars Reader v1.1.1 macOS LaunchAgent decision and acceptance report

Date: `2026-08-30 +08`

Architecture decision: `APPROVED`

Implementation status: `IMPLEMENTED`

Automated verification: `PASS`

Human acceptance: `PASS`

Commit, push, and tag: `AUTHORIZED` after human acceptance `PASS`

## Decision

Mars Reader will use a native per-user macOS LaunchAgent for local persistent operation. The LaunchAgent runs `server.js` directly, binds only to `127.0.0.1:8080`, retains normal login authentication, restarts unexpected exits, and writes stdout and stderr to user-owned local log files.

The repository contains only portable management code, tests, and documentation. The generated plist, absolute project and Node paths, logs, `.env`, credentials, cookies, SQLite files, and caches remain outside Git.

Local source changes are not deployed automatically. `npm run local:deploy` runs the full test suite and syntax checks first, then restarts and verifies the service only if every gate passes.

## Objective and verified starting facts

Objective:

- Keep Mars Reader available after a terminal or Codex execution session closes.
- Make normal stop, start, restart, status, log inspection, update, and removal understandable and reversible.
- Keep the service local-only and avoid adding a third-party process manager.
- Make the reusable capability part of the v1.1 line without committing machine-specific state.

Verified starting facts:

- The application is a Node/Express service started by [`server.js`](../server.js).
- [`package.json`](../package.json) previously exposed foreground `start`, `dev`, and `dev:hot` commands only.
- [`scripts/hot-server.js`](../scripts/hot-server.js) is development-oriented, enables local auth bypass by default, and is not the stable persistent-service boundary.
- The repository already contains a Linux systemd installer at [`scripts/install-systemd-service.sh`](../scripts/install-systemd-service.sh), but no macOS service manager.
- The local `.env` is excluded from Git and owner-readable only. Its broad host and secure-cookie settings are unsuitable for plain-HTTP localhost persistence, so the LaunchAgent overrides only the four local transport/auth variables.
- No Docker executable, LaunchAgent plist, persistent Mars Reader log directory, or service listener existed at the start of this work.
- Remote `main` and the peeled `v1.1.0` tag pointed to commit `f8494ce62738b53e6f6c8731ffdde8f83f943e9b` before implementation.

## Constraints and assumptions

- macOS user session only; no root privileges and no pre-login LaunchDaemon.
- Node and npm must already be installed.
- The project stays at its current path. Moving it requires reinstalling the LaunchAgent.
- The stable service listens on `127.0.0.1:8080` and uses normal authentication.
- Existing `.env` values continue to supply AI, administrator, refresh, and other application configuration.
- Existing `data/` remains the only application data location and is never deleted by service-management actions.
- Human browser acceptance remains separate from automated process and HTTP checks.

## Alternatives considered

| Alternative | Benefit | Rejection reason |
| --- | --- | --- |
| Foreground `npm start` | No new files | Dies with its owning terminal or task; no persistent logs or recovery. |
| `nohup` or `tmux` | Small setup | No native login lifecycle, weak status semantics, and manual recovery. |
| LaunchAgent running `dev:hot` | Source edits restart quickly | Development auth bypass and incomplete-code restarts are inappropriate for the stable personal service. |
| PM2 | Rich process controls | Adds a global third-party dependency and a second lifecycle model. |
| Docker Compose | Reproducible container boundary | Docker is not installed and is disproportionate for this single local Node service. |
| LaunchDaemon | Runs before login | Requires root, broadens permissions, and conflicts with user-owned data and configuration. |
| GitHub self-hosted runner or automatic pull | Remote CI/CD | Expands the trust boundary and can replace a working local service with unaccepted code. |

## Runtime and repository contracts

### LaunchAgent contract

- Label: `com.marsreader.local`
- Generated plist: `~/Library/LaunchAgents/com.marsreader.local.plist`
- Working directory: detected repository root
- Program: detected stable `node` path plus `server.js`
- Environment overrides:
  - `NODE_ENV=production`
  - `HOST=127.0.0.1`
  - `PORT=8080`
  - `COOKIE_SECURE=0`
  - `MARSREADER_LOCAL_AUTH_BYPASS=0`
- Lifecycle: `RunAtLoad=true`, `KeepAlive=true`, five-second launchd throttle
- File creation mask: `077`
- Logs:
  - `~/Library/Logs/MarsReader/stdout.log`
  - `~/Library/Logs/MarsReader/stderr.log`

The plist intentionally contains no AI key, password, cookie, browser storage, or database value.

### Management command contract

| Command | Contract |
| --- | --- |
| `npm run service:install` | Validate macOS dependencies, generate and lint the plist atomically, load it, then require launchd PID, PID-owned listener, and HTTP 200. |
| `npm run service:start` | Load the installed plist or restart an already loaded service, then run the same health gate. |
| `npm run service:stop` | Boot out the service for the current login session; the plist remains and loads again at a later login. |
| `npm run service:restart` | Restart the service and require PID, listener ownership, and HTTP 200. |
| `npm run service:status` | Report loaded state, launchd state, PID, listener ownership, HTTP status, and log paths without printing environment secrets. |
| `npm run service:logs` | Print a bounded tail of stdout and stderr; do not follow indefinitely. |
| `npm run service:uninstall` | Boot out the service and remove only the generated plist; preserve logs, `.env`, and `data/`. |
| `npm run local:deploy` | Run tests and syntax checks; restart only after every validation command succeeds. |

### Health contract

HTTP 200 alone is insufficient because another process might own port 8080. A healthy result requires all three conditions:

1. `launchctl print` reports a current service PID.
2. That exact PID owns the TCP listener on port 8080.
3. `GET http://127.0.0.1:8080/` returns HTTP 200.

## Lifecycle states

| State | launchd | Listener/HTTP | Allowed transition |
| --- | --- | --- | --- |
| Not installed | No plist and not loaded | Unreachable | `service:install` |
| Installed and running | Loaded with PID | PID owns 8080 and root returns 200 | restart, stop, uninstall, local deploy |
| Stopped for session | Plist exists but not loaded | Unreachable | start, uninstall, next user login |
| Restarting | Loaded, PID may change | Temporarily unreachable | automatic recovery or explicit stop |
| Failed | Loaded without healthy owned listener | Unreachable or wrong owner | inspect logs, repair dependency/code/port, restart |
| Uninstalled | Plist removed and not loaded | Unreachable | install; logs/data remain |

## Failure and edge-state matrix

| Condition | Expected behavior | Evidence and recovery |
| --- | --- | --- |
| Node process exits unexpectedly | launchd retries after throttling | PID changes; stderr and launchctl last-exit evidence remain. |
| New code has a syntax or test failure | `local:deploy` stops before restart | Non-zero command output; existing service PID remains unchanged. |
| New code starts but fails at runtime | launchd may retry repeatedly | `service:status` is not healthy; inspect stderr, roll back code, restart. |
| Port 8080 is owned by another process | Health gate fails even if HTTP answers | PID-owned-listener check is false; stop the conflicting process or change the approved contract. |
| Node path disappears after an upgrade | launchd cannot start | stderr/launchctl failure; rerun `service:install` from a working Node environment. |
| Repository directory moves | Working directory or `server.js` is missing | Reinstall from the new repository path. |
| `.env` is missing | Base reader may start with defaults; configured AI/admin behavior may be unavailable | Status can be healthy while affected features remain partial; restore `.env` separately without committing it. |
| AI provider or network is unavailable | Service remains up; dependent AI calls fail closed | Browser/API error remains a feature-level failure, not a LaunchAgent failure. |
| Mac sleeps | Process and network pause | Resume after wake; no availability claim while sleeping. |
| User logs out | User LaunchAgent stops | It starts again after the same user logs in. |
| Log files grow | launchd does not rotate them | Inspect size periodically; log rotation is an unresolved follow-up and is not silently added here. |
| Stop is requested | `bootout` prevents KeepAlive from relaunching it in the current session | HTTP becomes unreachable; `service:start` restores it. |

## Permissions, privacy, and observability

- No root or administrator action is required.
- The generated plist is mode `0600`; the log directory is mode `0700`; service-created files use umask `077`.
- The service binds only to IPv4 loopback. No LAN or public listener is part of this version.
- Normal application login remains enabled. Local auth bypass is explicitly disabled.
- The manager never prints or embeds `.env` values beyond the five fixed non-secret LaunchAgent variables.
- Logs may still contain application error text, source URLs, or user identifiers produced by the existing server. They remain local and must not be pasted into Git or reports without sanitization.
- `service:status` separates loaded state, process identity, listener ownership, and HTTP reachability rather than inferring health from one signal.

## Migration and rollback

Migration:

1. Run repository tests and syntax checks.
2. Install the generated LaunchAgent.
3. Verify launchd PID, listener ownership, HTTP 200, log paths, and local-only binding.
4. Exercise restart, stop, stopped-state observation, and start.
5. Leave the service running for human browser acceptance.

Rollback:

1. Run `npm run service:uninstall` to boot out the user service and remove its generated plist.
2. Confirm port 8080 is no longer owned by Mars Reader.
3. Keep `.env`, `data/`, and logs unchanged.
4. Use foreground `npm start` if temporary manual operation is needed.
5. Revert the v1.1.1 repository change if its code must be removed; no data migration is required.

## Implementation phases

1. Add the portable macOS service manager and focused tests.
2. Add package commands, documentation, version metadata, and this report.
3. Run the full suite, syntax checks, plist lint, diff checks, and secret/path review.
4. Install and verify the local service lifecycle.
5. Present the exact diff and evidence. The human approved commit, fast-forward merge, `main` push, and the `v1.1.1` tag after acceptance `PASS` on `2026-08-30`.

## Automated verification record

| Check | Result | Evidence |
| --- | --- | --- |
| Full Node test suite | `PASS` | `npm test`: 100 tests passed, 0 failed. `npm run local:deploy` repeated the same 100-test gate before restart. |
| Node syntax checks | `PASS` | `server.js`, `public/app.js`, `scripts/macos-launchagent.js`, `scripts/hot-server.js`, and the new test file passed `node --check`. |
| Generated plist lint | `PASS` | Unit fixture and installed plist both passed `/usr/bin/plutil -lint`; installed plist is mode `0600` and log directory is mode `0700`. |
| Secret and absolute-path review | `PASS` | Changed repository files had no current-user absolute path, private-key marker, token-shaped value, or assigned API key/password/token; `git diff --check` passed. |
| Install and HTTP health | `PASS` | Initial install produced PID `42270`; launchd PID, PID-owned `127.0.0.1:8080` listener, and HTTP 200 all agreed. |
| Unexpected-exit recovery | `PASS` | Exact verified PID `42270` was terminated; launchd recovered as PID `42414` with owned listener and HTTP 200. |
| Stop/start lifecycle | `PASS` | Stop produced not-loaded, no listener, and HTTP 000; start recovered as PID `42911`. Final local deploy restarted to PID `42996`. |
| Authentication boundary | `PASS` | Installed environment reports loopback host, non-secure localhost cookie, and auth bypass `0`; `/api/me` returned `authBypass=false`. |
| Data readability after forced exit | `PASS` | SQLite `PRAGMA quick_check` returned `ok`; `data/cache.json` parsed successfully. |
| Runtime stderr | `PASS` | Final stderr log size was zero bytes; stdout contained the expected loopback listening message. |

Automated verification is not human acceptance.

## Human browser acceptance checklist

Acceptance owner: human user

Status: `PASS` — reported by the human user on `2026-08-30`; no failure notes were supplied.

### Exact build and starting state

- Branch: `codex/v1.1.1-macos-launchagent`
- Build: package version `1.1.1`; use the exact working-tree diff presented at handoff until a commit is separately approved.
- Service: installed and reported healthy by `npm run service:status`.
- URL: <http://127.0.0.1:8080/>
- Browser: built-in Browser, one reusable tab; do not open duplicate tabs for each state.
- Desktop viewport: `1440 × 900`, zoom `100%`.
- Narrow viewport: `390 × 844`, zoom `100%`.
- Test data: existing local Mars Reader database and existing account only. Do not create, delete, or publish user content for this operational check.
- Before starting, record the current service PID from `npm run service:status` and confirm no temporary process is occupying port 8080.

### Ordered checks

1. In one terminal, run `npm run service:status`.
   - Expected: loaded `yes`, state `running`, a numeric PID, listener owned by service `yes`, and HTTP `200`.
2. Open the single Browser tab at <http://127.0.0.1:8080/> at `1440 × 900`, `100%` zoom.
   - Expected: the normal Mars Reader shell loads; no certificate warning or local-auth-bypass identity appears.
3. Use the existing login state. If logged out, use the existing account through the normal login UI.
   - Expected: authentication works over local HTTP; protected reader state is available after login.
4. With the mouse, select an existing source and article, then open and close the existing writing desk without generating content.
   - Expected: navigation, article loading, and panel layout behave as in v1.1.0; no service-management UI is introduced.
5. With the keyboard, tab through the visible primary controls, activate one safe navigation control with Enter or Space, and return focus to the article.
   - Expected: focus remains visible, order remains logical, and no control is skipped because of the new startup mode.
6. Scroll the source/article area and the article body independently, then return to the previous reading position.
   - Expected: existing scroll regions remain usable; no jump or stuck scroll is introduced.
7. Hard-refresh the same tab once.
   - Expected: the initial loading state resolves, current assets load, and existing content returns without a stale disconnected page.
8. Inspect Browser console and network activity for the load and one existing API read.
   - Expected: document and required assets/API calls complete without new startup, cookie, mixed-content, or connection errors. Record unrelated feed/provider failures separately.
9. Run `npm run service:restart`, keep using the same Browser tab, and reload after the command reports healthy.
   - Expected: PID changes, the same URL recovers, authentication remains normal, and saved local data remains present.
10. Run `npm run service:stop`, wait one second, and reload the same tab.
    - Expected: the browser shows a connection failure; `service:status` reports not loaded/unreachable; the service does not relaunch itself in the current session.
11. Run `npm run service:start`, then reload the same tab.
    - Expected: the command requires the three-part health gate, the browser recovers, and existing state is unchanged.
12. Resize the same Browser tab to `390 × 844` at `100%` zoom.
    - Expected: the existing responsive navigation and reading surface remain readable; horizontal overflow, clipped controls, focus traps, or inaccessible scroll regions are absent.
13. Where the existing dataset naturally exposes loading, empty, partial, error, or stale feed states, visit one example without modifying data.
    - Expected: those product states remain distinguishable from a service-down connection error. If a state is not naturally available, record `N/A`; do not manufacture user data.
14. Close the terminal that ran a status or restart command, wait at least ten seconds, and reload the same Browser tab.
    - Expected: the LaunchAgent-managed service remains available because it is not owned by that terminal.
15. Run `npm run service:logs`.
    - Expected: bounded stdout/stderr output is available; do not paste unsanitized URLs, identifiers, or errors into GitHub.

### Cleanup and final state

- Leave the service installed and running unless the user explicitly chooses rollback.
- Close the single acceptance tab after recording results.
- Do not remove `.env`, logs, SQLite, cache, or browser storage.
- If any temporary failure injection was added outside this checklist, stop it and rerun `service:restart` plus `service:status`.

### Acceptance notes

| Check | PASS / FAIL / N/A | Notes |
| --- | --- | --- |
| Desktop load and normal authentication |  |  |
| Mouse, keyboard, focus, and scroll |  |  |
| Restart and data continuity |  |  |
| Stopped/error state and recovery |  |  |
| Narrow responsive view |  |  |
| Loading/empty/partial/error/stale distinctions |  |  |
| Console and network |  |  |
| Terminal independence |  |  |
| Overall human acceptance | PASS | Human reported overall `PASS` in the Codex task on `2026-08-30`; no itemized failure notes were supplied. |

Overall human acceptance changed from `PENDING` to `PASS` only after the human explicitly reported `PASS`.

## Unresolved risks

- Standard launchd file logs do not rotate automatically; long-term size control is not part of v1.1.1.
- A code change can pass static and unit checks yet still fail at startup; launchd retry plus stderr and rollback remain necessary.
- The generated plist captures the current project and Node paths. Moving the repository or replacing the Node shim requires reinstalling.
- User logout stops the service, and Mac sleep interrupts availability. A pre-login or always-awake service is explicitly out of scope.
- The current application has no dedicated health endpoint, so the service contract uses the root document plus process/listener identity.

## Approval and source evidence

- The human approved the v1.1.1 direction, the exact roadmap diff, and implementation in the Codex task on `2026-08-30`.
- The human authorized commit, fast-forward merge, `main` push, and `v1.1.1` tagging after evidence review and acceptance `PASS` on `2026-08-30`.
- Planning authority: [`开发路径图.md`](../开发路径图.md)
- Local operation instructions: [`README.md`](../README.md)
- Runtime entrypoint and signal handling: [`server.js`](../server.js)
- Existing hot-reload boundary: [`scripts/hot-server.js`](../scripts/hot-server.js)
- Existing Linux service precedent: [`scripts/install-systemd-service.sh`](../scripts/install-systemd-service.sh)
- Package commands and version: [`package.json`](../package.json)
