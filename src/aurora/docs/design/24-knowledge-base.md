# 24 · 知识库（Knowledge Base）规范

> 对应 `panels/kb/KbPanel.tsx` 与 `KbManagePanel.tsx`。数据全部 mock（`kbData.ts` `MOCK_KBS` 等）。

## 1. 知识库面板（KbPanel）

- 子栏居中 Segmented 声明 **11 个 Tab**：`overview / notes / search / tasks / goals / review / chat / dependency / moc / blindspot / export`。
- ⚠️ **仅 `overview` 渲染真实内容（`OverviewTab`）**；其余 10 个渲染 `PlaceholderTab`（"结构已就位，内容待填充"）。即当前实质是 Overview 屏 + 占位桩。

> 使用优化④（2026-09-10）：① 修复 `kb-ui.css` 从未被任何入口加载的历史缺陷（kb-searchpanel 等全部 kb-* 组件类裸奔、搜索 tab 布局堆叠左上角）——KbPanel 顶部显式 import，主题差异仍由 kb.css `.aurora-kb.kb-shell` 复合选择器重映射兜底；② **问答（chat）/导出（export）从覆盖层弹窗页面化**：KbChatPanel / KbExportMenu 增 `variant="page"`（无遮罩/无 portal/无关闭按钮，卡片填充 tab 内容区），移入 renderPanel 主分支 `.aurora-kb-tabfill` 容器，与其他功能页形式一致；`#kb-overlay-root` 仅余文件依赖面板仍走覆盖层。
>
> 使用优化④b（2026-09-10）：问答输入框白底白字不可读——KbChatPanel 的 textarea 内联样式缺 `backgroundColor`/`color`（浏览器默认白底 + Aurora 全局白字）；补 KB_COLORS.bgCard/textMain，并加 `.kb-chatpanel-input` 类在 kb-ui.css 补 `::placeholder` 暗色规则。
- **Overview 区域**：
  1. KPI 行 5 卡：笔记文件 / 关联画布 / 标签 / 总字数 / 双链数（可点击）。
  2. 健康度卡（4 条）+ AI 摘要卡（本地 badge + 重新生成 按钮）。
  3. 最近活动 5 项 + 标签体系 8 标签（可点击）。
  4. 专属图谱 mini SVG（`MiniGraph`，7 个静态节点：current/file/tag）。
- 子栏：返回 + 编辑/发布博客/删除（均 `toast` 桩）。
- `breadcrumbs`：`['知识库', kbName]`；状态栏：kbName / `fileCount 篇笔记` / `双链 243 · 标签 34`。

## 2. 知识库管理（KbManagePanel）

- 页头（标题 + 计数）+ 新建知识库 按钮（**仅当已有 ≥1 个知识库时显示**）；新建/导入统一弹窗（`KbCreateModal`：模式分段「新建知识库」「导入」+ 名称*/描述/创建+取消）。KB 卡片网格（末尾新建磁贴已移除）。空态：居中引导语「还没有知识库 / 点击下方按钮，创建你的第一个知识库」+ 其下独立「新建知识库」按钮；空态下页头右上角主创建按钮隐藏，创建首个库后恢复。
- 导入 Popover 3 项：Obsidian Vault / Notion 导出 / 网页剪藏（web 模式显示 URL 输入）。⚠️ 所有 handler 为 `toast` 桩。
- 卡片点击 → `openKb(id)` → `nav('kb', id)`。数据 `MOCK_KBS`（4 项）。

## 3. 未实现 / 范围外（本面板）

- 无面板内左侧导航（已移除）；除 Overview 外无真实 Tab 内容；mini 图谱节点不可交互；无重命名/健康度下钻。
- 无单 KB 编辑/删除/重命名；列表无搜索/筛选；无 grid⇄list 切换；breadcrumb 单级；导入非真实。
