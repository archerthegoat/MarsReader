# Product Hunt Official-Site Rewrite Deploy

- Time: 2026-07-03 23:16 +08
- Domain: https://rss.qiaomu.ai/
- Remote app: `myvps:/opt/qiaomu-apps/qmreader`
- Runtime: systemd `qmreader`, `127.0.0.1:3088`
- Backup: `/opt/qiaomu-apps/qmreader/backups/ph-official-rewrite-20260703T150620Z`

## Changes

- Restored auto rewrite coverage for all selected/latest source entries instead of skipping non-paper news aggregators.
- For Product Hunt entries, auto/manual rewrites now try to fetch official-site context before calling `deepseek.rewriteEntry`.
- Product Hunt official-site fetch uses RSS external links first, then Product Hunt `r/p/...` links, with Jina Reader fallback when Product Hunt blocks server-side redirects.
- Product Hunt rewrite hash includes official-site URL/title/summary/content at generation time.
- Single-source refresh now checks the latest entries for that source, so previously skipped Product Hunt/GitHub Trending items can be backfilled even if the RSS item itself did not change.

## Verification

- Local:
  - `node --check lib/fetcher.js`
  - `node --check lib/deepseek.js`
  - `node --check lib/background-jobs.js`
  - `node --check scripts/refresh-worker.js`
  - `node --check server.js`
  - `git diff --check -- lib/fetcher.js lib/deepseek.js lib/background-jobs.js server.js`
  - Product Hunt smoke: Vox official URL resolved to `https://aasis21.github.io/vox/`; rewrite hash changed when official context was attached.
- Remote:
  - `node --check` passed for changed backend files before restart.
  - `systemctl restart qmreader`; service active.
  - Triggered Product Hunt refresh hint: latest 3 Product Hunt entries now have `deepseek-v4-flash` rewrites using official-site context.
  - Triggered GitHub Trending refresh hint: latest 3 GitHub Trending entries now have `deepseek-v4-flash` rewrites.
  - Public checks: `https://rss.qiaomu.ai/` returned 200 HTML; `/api/sources` returned 200 JSON.
  - Public rewrite API checks: Product Hunt Vox rewrite exists with `stale: false`; GitHub Trending `usestrix/strix` rewrite exists with `stale: false`.

## Notes

- Product Hunt may block direct server-side requests with Cloudflare. The fallback does not block rewrites when official-site context cannot be fetched; those entries remain subject to the normal minimum-content check.
- Product Hunt rewrites include ephemeral official-site context at generation time, so detail GET responses treat existing Product Hunt rewrites as not stale to avoid false stale markers from the base RSS-only entry hash.
