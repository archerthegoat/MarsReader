# 2026-06-15 iGermán 源与右栏拖拽部署记录

- 目标：新增 `https://igerman.cc/rss.xml` 订阅源，优化划线讨论/卡片样式，去掉卡片左侧竖线装饰，并让文章详情和右侧上下文栏之间支持拖动调宽。
- 本地验证：`igerman` 源抓取成功，返回 7 篇文章；`node --check` 覆盖 `lib/sources.js`、`server.js`、`public/app.js`；浏览器验证右侧栏拖拽后宽度持久化，划线/点评/资产预览卡片左侧边框为 0px。
- 记忆更新：已在 Codex memory ad-hoc note 记录“不使用卡片左侧竖线装饰”的 UI 偏好。
- 生产方式：`rss.qiaomu.ai` 为 systemd standalone 服务，运行目录 `/opt/qiaomu-apps/qmreader`，端口 `127.0.0.1:3088`。
- 部署策略：同步 `lib/sources.js`、`public/app.js`、`public/index.html`、`public/styles.css`、`README.md` 和本记录；保留生产 `data/qmreader.sqlite`、`data/cache.json` 和 `.env`。
- 生产验证：已同步并重启 `qmreader`，手动触发 `igerman` 单源刷新；线上 API 返回 5 篇 `iGermán` 文章，首页包含 `context-resizer` 和 `app.js?v=118`，Playwright 验证右侧栏拖拽可持久化且没有前端脚本错误。
