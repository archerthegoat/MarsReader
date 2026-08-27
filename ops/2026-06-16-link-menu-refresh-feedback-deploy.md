# 2026-06-16 正文链接菜单与频道刷新反馈部署记录

- 目标：正文/改写/翻译中的链接默认显示下划线；点击正文链接出现“打开网页 / 收录到网站”菜单；当前频道刷新按钮提供“正在检查 / 暂无更新 / 新增 X 篇 / 检查失败”反馈。
- 本地验证：`node --check public/app.js`、`node --check server.js`、`git diff --check` 通过；Playwright 验证正文链接菜单、提交链接预填、链接下划线和频道刷新即时 toast 反馈。
- 生产方式：`rss.qiaomu.ai` 为 systemd standalone 服务，运行目录 `/opt/qiaomu-apps/qmreader`，前端静态文件由 Node/Express 提供。
- 部署策略：备份生产 `public/app.js`、`public/index.html`、`public/styles.css` 后同步最小静态文件；无需修改数据库或重启服务，验证线上 HTML 版本号和关键交互。
- 生产验证：线上 HTML 已加载 `styles.css?v=116`、`app.js?v=119`、`source-refresh-status` 和 `article-link-menu`；Playwright 打开 Simon Willison 文章验证 17 个正文链接带下划线，点击链接出现“打开网页 / 收录到网站”，访客点收录进入登录弹窗，无前端脚本错误。
