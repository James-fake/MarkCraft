# 使用优化⑤ · 知识图谱 GraphPanel 四项优化（2026-09-10）

## 完成内容
用户四项诉求全部落地并通过 tsc / build / CDP 15 断言 / 截图四重验证：

| # | 诉求 | 实施 |
|---|------|------|
| 1 | 删顶栏「着色」按钮 | 按钮及其联动删除；顶栏只剩搜索 + 节点类型，着色配置统一收敛到左栏 |
| 2 | 导航列表重排 + 居中 | 四区结构：视图控制（图谱模式/布局）→ 筛选与显示（标签/连接强度/显示组）→ 着色（分组导航/分组着色）→ 信息（链接健康）；发丝 divider 分区；色板圆圈行 + 添加分组按钮居中 |
| 3 | 删列表内图例 | 左栏图例区块 + legendOpen 状态 + `.aurora-graph__legend*` CSS 全系删除；图例职责由底部状态栏承担（保留） |
| 4 | 分组着色默认折叠 | grpOpen 初始 false；折叠为 CSS 隐藏，grp-form 留在 DOM，测试兼容 |

## 改动文件
- `src/aurora/panels/kb/GraphPanel.tsx` —— 顶栏按钮删除、左栏 8 区块重排、「显示」组、图例删除、默认折叠、文件头注释更新
- `src/aurora/styles/panels/graph.css` —— 图例规则删除、折叠选择器清理、色板行/添加按钮居中
- `src/aurora/docs/design/28-knowledge-graph.md` —— §2 重排注释 + 图例行❌ + §5 状态栏描述修正

## 验证
- tsc --noEmit = 0；vite build = 0（全新 outDir + emptyOutDir false）
- CDP（#view=graph）：15 断言全绿（顶栏无着色 / 8 区块精确顺序 / 左栏图例删·状态栏留 / 默认折叠+DOM 保留 / 展开交互 / swatch justify-content:center / addBtn align-self:center）
- 截图三张：u5-graph-default.png / u5-graph-rail-folded.png / u5-graph-grp-open.png

## 遗留
- `.workbuddy/tmp-dist-u5` 构建临时目录因 safe-delete shim trash 中断未能删除（不阻塞，可手动删）
- vitest 沙箱不可用（既有环境问题），验证链以 tsc+build+CDP 为权威

## 下一步
等待用户「具体使用优化」第 6 项指令。
