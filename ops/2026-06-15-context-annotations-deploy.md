# 2026-06-15 右侧划线讨论部署记录

- 目标：把文章右侧栏升级为“划线讨论 / AI Agent”双 Tab，并让划线绑定当前原文、翻译或改写版本，旧版本划线保留为历史讨论。
- 本地验证：`node --check` 覆盖 `lib/store.js`、`server.js`、`public/app.js`；Playwright 覆盖右侧划线列表、旧版本标记、真实选区发布、AI Agent Tab 切换。
- 生产方式：`rss.qiaomu.ai` 为 systemd standalone 服务，运行目录 `/opt/qiaomu-apps/qmreader`，端口 `127.0.0.1:3088`。
- 部署策略：仅同步 `lib/store.js`、`public/app.js`、`public/index.html`、`public/styles.css`，保留生产 `data/qmreader.sqlite` 和 `.env`。
