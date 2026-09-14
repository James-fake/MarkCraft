# 10 · 博客工作室（Blog Studio）规范

> 对应 `panels/blog/BlogPanel.tsx` + `styles/panels/blog.css`。数据为真实来源（Phase 2 换芯）：文档列表遍历 `FileStore.rootFolder`，主题市场 / 配色复用 `useBlogGenerator` 单一数据源；生成 / 下载 / 部署接真实 `useBlogGenerator` + `DeployPanel`。

## 1. 布局

子栏（顶部水平居中：3 分组 Tab + 组内次级 segmented）+ 可拖拽浮动控制面板（左/右停靠）+ 中央 iframe 预览。

## 2. 分组 Tab（P1-5 信息架构）

6 个子面板折叠为 3 组，组内以次级 segmented 切换（子面板功能不增不减）：

| 分组 | 子面板 |
|---|---|
| **主题** | ① 样式 ② 配色 |
| **数据** | ③ 内容 ④ 功能 |
| **高级** | ⑤ CSS ⑥ 导出 |

1. **样式（StylePanel，默认）**：主题市场搜索 + 分类 chips + 标签 chips + 精品主题网格（收藏/勾选）；主题模式 Segment（浅色/深色）。
2. **配色（ColorPanel）**：配色方案 12 色板 + 自定义 conic；预览；字体 Segment（衬线/无衬线/等宽）。
3. **内容（ContentPanel）**：站点信息输入（标题/描述/作者/语言 select）；真实文档列表（复选 + 全选/全不选，知识库来源时仅显示库内笔记）；内联统计。
4. **功能（FeaturesPanel）**：文章功能 chips（阅读量/点赞/PWA）；打赏 toggle + 微信/支付宝 输入；关于页（简介/技能）；友链 list+add；系列文章 list+add；配置 导出/导入 按钮。
5. **CSS（CssPanel）**：启用自定义主题 toggle → Segment 亮/暗 + 真实 CssEditor（撤销/重做/导入/导出/压缩）+ VisualCssEditor（预览选区注入）+ CssSnippets 片段库。

> 使用优化③（2026-09-10）：① 亮/暗 CSS 模式跟随预览主题模式联动（预览深色 → 自动切「暗色」CSS，不再固定亮色）；② 编辑器外壳 isDark 跟随 Aurora 宿主主题（对齐真实层 studioTheme 语义），不再随博客预览主题割裂；③ 修复 CssEditor 内容显示不清楚根因——CodeMirror 高亮原用亮色 `defaultHighlightStyle`（暗底深字不可读），改为按主题 token 生成的明暗两套 `HighlightStyle`（经 Compartment 注入，isDark 变化热切换不丢编辑器状态），并清理 theme 内 CM6 永不产出的 `.cm-*` 死类规则。
>
> 使用优化③b（2026-09-10）：系统深色（`prefers-color-scheme: dark`）用户开 toggle 后预览被默认暗色示例 CSS（`body{background:#0d0f15}`，注入模板自动包裹 media/data-theme 查询）刷成暗色，与亮色 Segment 割裂——暗色默认示例改为纯注释（无副作用、保留教学）；banner 扩展为双条件（cfg.theme 深色 / 系统深色，matchMedia 监听驱动重渲染），解释"亮色 Segment 但暗色规则生效"的来源。
6. **导出（ExportPanel）**：3 统计；步骤1 真实生成（loading spinner）；步骤2 查看与下载三动作卡（打开=浏览器新标签打开当前站点 / 文件夹 / 单文件）；真实部署面板（平台选择/Token 验证/进度/成功 URL）。

> 使用优化②（2026-09-10）：原顶栏右侧「打开」按钮（`aurora-blog__preview-open`）迁入导出面板步骤 2，与下载卡同构（`aurora-blog-dl`，三列网格）；`handleOpenPreview`（blob URL + 新标签）保留为动作源。顶栏右侧现仅剩设备切换。

交互：分组 Tab 同组再点 = 浮层收/展；切组 = 落到组内首个子面板并展开；次级 segmented 点击 = 切换子面板并展开。

## 3. 默认状态

分组=`主题`、子面板=`样式`、`panelOpen=false`（首次收起，专注预览）、`device='desktop'`、`themeKey='magazine'`、`theme='light'`、`font='serif'`。

默认配置单源（批次债①）：`DEFAULT_CONFIG` 与真实层语义重叠的字段（siteTitle/language/themeKey↔layout/theme/font）从 `DEFAULT_DESIGN_CONFIG` 派生；有意分歧逐项注释（本地化 siteDescription/author、`colorScheme: 'blue-purple'`（P2-C 拍板，真实层默认 'red'）、enableViews/enableLikes/enablePwa 默认开）。生成/发布路径：`onGenerate → handleGenerate(toRealBlogConfig(cfg,…))` 覆盖 hook 内部 designConfig，保证与预览同源——面板配置改任何项，生成产物即时跟随。

## 4. 图标 / 动效

- 分组图标：主题=theme / 数据=layers / 高级=settings；次级 segmented 纯文本。
- 浮动面板拖拽停靠（左右贴边 + 甩动切换）、预览随 device 切换。

## 5. 状态栏

左：`博客工作室` + `N 篇待发布`；右：主题名 / 深浅色 / ⌘K 命令面板。
