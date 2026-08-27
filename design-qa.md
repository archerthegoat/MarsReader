# Mars Reader AI 写推文流程 Demo · Design QA

## Source visual truth

- 选定视觉稿：`/Users/archer/.codex/generated_images/01a03744-47bf-7b81-971d-a35aaa556b7d/exec-7030e600-ff06-4884-8b30-a483ab45724c.png`
- 视觉稿尺寸：1070 × 1470 px，portrait；作为右侧写作工作区的源视觉，不要求与整页工作台做 1:1 像素缩放。
- 产品上下文截图：`/var/folders/b0/khtmft7d1cz0dw33dsc0dry80000gn/T/TemporaryItems/NSIRD_screencaptureui_J4pde8/Screenshot 2026-08-26 at 8.25.21 PM.png`
- 视觉稿核心状态：浅色 Mars Reader 工作台；三步流程展开；默认“分享改写”；展示文章更新提示、任务选择、用户输入、写作规则、理解确认和草稿进度。

## Implementation evidence

- URL：`http://marsreader.localhost:18081/marsreader-visual-demo.html`
- 工作区文件：`/Users/archer/LocalProjects/MarsReader/public/marsreader-visual-demo.html`
- 浏览器：Codex In-app Browser；本地热部署页面。
- 完整浏览器截图：`/private/tmp/marsreader-option2-implementation-final.png`
- 右侧工作区截图：`/private/tmp/marsreader-option2-desk-final.png`
- 捕获 viewport：1440 × 1024 CSS px；device scale factor 1；页面无横向溢出。
- 右侧工作区 DOM 尺寸：438 × 898 CSS px；内部纵向滚动承载第三步和草稿区域。
- 默认状态：三步展开；文章内容可能已更新；任务“分享改写”；输出“短帖”；语气“自然分享”；草稿尚未生成。

## Comparison

### Full-view comparison

- 左侧导航、中间文章阅读区、右侧 AI 写推文区组成完整个人阅读工作台，右侧仍保持独立工作区的视觉边界。
- 选定稿的三步式信息架构被保留，步骤标记、任务选择、写作守则、理解确认和草稿状态均按同一顺序出现。
- 源稿是独立 portrait 工作区，成品把它嵌入 Mars Reader 四栏工作台；比例差异是产品上下文要求，不视为视觉漂移。

### Focused comparison: 右侧 AI 写推文工作区

- 头部保留“AI 写推文”、文章参考条、内容可能已更新提示和重新获取入口。
- 第 1 步新增三种明确任务：“分享改写”“润色原稿”“观点补全”，并将用户内容与本次写作要求拆成两个独立输入。
- 第 2 步保留输出形式、语气风格和三项写作守则；选中态、折叠态和步骤标记可操作。
- 第 3 步展示“任务 / 核心判断 / 来源 / 输出”的理解摘要，以及自然表达检查；只有确认后才进入模拟生成。
- 草稿区域包含生成进度、停止、重新生成、复制、清空和自动保存状态。
- 图标使用仓库现有 Lucide 图标素材；未使用 emoji、手绘 SVG、CSS 图形或占位图片。

## Required fidelity surfaces

- Fonts and typography：沿用现有系统无衬线字体、中文 fallback、Mars Reader 的紧凑字号层级；右栏正文、标签和状态文本均使用不同光学权重，长标题使用省略避免覆盖。
- Spacing and layout rhythm：右栏采用 48 px 步骤轨道 + 内容列；面板间距、字段间距、按钮高度和内部滚动经过 1440 × 1024 浏览器截图检查；窄桌面 980 × 900 检查无横向溢出。
- Colors and visual tokens：沿用冷白 / 浅灰纸面、炭黑文字、低饱和 Mars 红 active 色、绿色守则状态色；没有新增渐变或高噪声装饰。
- Image quality and asset fidelity：本 Demo 没有新增位图资产；品牌 Logo 复用 `/public/favicon.svg`；界面图标来自已有 `public/lucide-icons.js`，未以文字符号替代。
- Copy and content：统一使用“AI 写推文”“我的观点 / 原稿”“本次写作要求”“文章只作参考”；卡兹克 Skill 只转化为自然表达检查原则，不露出个人模仿身份或虚构亲历。

## Primary interactions tested

- 切换“润色原稿”后，输入标签、必填提示、placeholder、理解摘要同步更新。
- 切换“编号要点”和“克制分析”后，输出摘要同步更新。
- 关闭“不编造经历”守则后，active 状态确实关闭；重新点击“怎么写”可折叠并恢复。
- 点击“重新获取文章”后，更新状态变为“上下文已更新”，提示文案同步变化。
- 点击“确认并生成”后，生成按钮禁用、进度推进、停止按钮可用；点击“停止生成”后状态恢复为可继续修改。
- 再次生成完成后，进度为 100%，草稿可编辑并显示自动保存时间。
- 手动编辑草稿后进入“正在保存…”再到“已自动保存”；复制后显示“已复制到剪贴板”；清空后草稿为空并显示“草稿已清空”。
- 980 × 900 窄桌面检查：工作区改为纵向布局，右栏位于文章区之后，`body.scrollWidth` 没有超过 viewport。
- 控制台检查：error / warn 日志为空。

## Comparison history

### Iteration 1

- Finding：模拟编号草稿使用过短截断的用户首句，可能出现半句断裂，影响“先理解再起稿”的可信度。
- Fix：改为按完整首句取样，仅在超过 88 字时用省略号收束；重新加载并完成生成验收。
- Post-fix evidence：`/private/tmp/marsreader-option2-implementation-final.png`；生成结果为完整编号条目，进度 100%，自动保存状态可读。

## Findings

- 没有可阻断核心使用的 P0 / P1 / P2 问题。
- P3 follow-up：正式接入时需要把“自然表达检查”从静态演示状态改成服务端实际校验结果，并让“本次写作要求”进入可审计的请求结构；本 Demo 按确认范围不接 API、不写数据库。

## Open Questions

- 这是独立 Demo，不代表正式版最终的右栏宽度、文章区比例或生成接口；正式开发前仍需单独确认数据契约、错误状态和保存边界。
- 生成示例为本地模拟文本，用来展示状态切换，不应被当作 DeepSeek 实际输出质量证据。

## Implementation Checklist

- [x] 复现选定的三步式桌面工作区视觉。
- [x] 拆分用户内容与本次写作要求。
- [x] 支持三种写作任务、四种输出形式、三种语气和三项守则。
- [x] 支持理解确认、生成中、停止、完成、编辑、自动保存、复制和清空状态。
- [x] 保留文章更新提示和重新获取入口。
- [x] 完成 1440 × 1024 桌面端与 980 × 900 窄桌面端浏览器检查。
- [x] 检查控制台错误和横向溢出。

## Final result

passed

## Production workbench QA · 2026-08-26

- URL：`http://marsreader.localhost:18081/`（cache-busted build：`styles.css?v=176`、`app.js?v=176`）。
- 浏览器：Codex In-app Browser；使用同一已打开标签完成检查。
- 桌面截图：`/private/tmp/marsreader-production-1440.png`；窄桌面截图：`/private/tmp/marsreader-production-980.png`。
- 1440 × 1024：左侧导航、中间原文、右侧 AI 写推文同时可见；右侧工作区宽度约 389px；页面没有横向溢出。
- 980 × 900：左侧导航按响应式规则收起，原文与右侧工作区保持并排；`document.documentElement.scrollWidth` 等于 viewport 宽度 980px。
- 任务交互：分享改写、润色原稿、观点补全可切换；润色原稿会同步显示必填提示和对应 placeholder。
- 输出交互：短帖、长帖、编号要点、Thread 与自然分享、克制分析、观点鲜明的选中态和理解摘要同步更新。
- 面板交互：收起右侧栏后左侧导航仍保持展开；重新展开后右侧工作区恢复；AI 伴读和划线评论入口保持隐藏。
- 生产状态：文章更新提示、已有草稿加载、可编辑草稿、自动保存文案和停止/复制/清空控件均可见。
- 控制台：error / warn 日志为空。
- 生成边界：本次浏览器验收未向 DeepSeek 发起真实生成请求，因为当前本地环境没有可用 API Key；请求契约、任务映射、人称边界、格式/语气和 SQLite 持久化由自动化测试覆盖。

### Production result

核心工作台 UI 与交互验收通过；真实 DeepSeek 生成留待用户重新配置 API Key 后进行一次人工验收。

Final result: passed
