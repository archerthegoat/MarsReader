# 2026-06-15 划线点评部署记录

- 目标：上线文章划线点评一期和二期，包括选中文字点评、正文高亮、回复、有用反馈、个人/贡献主页资产、公开 RSS 和 sitemap。
- 本地验证：`node --check` 已覆盖 `lib/store.js`、`server.js`、`public/app.js`；本地 API smoke 已验证创建划线点评、回复、有用反馈和我的划线资产；Playwright 已验证阅读器显示划线点评和正文高亮。
- 生产方式：`rss.qiaomu.ai` 当前为 systemd 服务 `qmreader.service`，运行目录 `/opt/qiaomu-apps/qmreader`，端口 `127.0.0.1:3088`。
- 部署策略：仅同步 `lib/store.js`、`server.js`、`public/app.js`、`public/index.html`、`public/styles.css`，保留生产 `data/qmreader.sqlite` 和 `.env`。
