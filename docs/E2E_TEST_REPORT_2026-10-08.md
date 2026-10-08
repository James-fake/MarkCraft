# MarkCraft 全真测试报告（E2E）

- **日期**：2026-10-08
- **范围**：MarkCraft 全部功能模块（22 个 feature 模块）
- **方法**：Playwright 驱动**系统真实 Edge**（非 jsdom 模拟），对真实运行的界面做端到端走查
- **结果**：**41 个用例 · 40 通过 · 1 跳过（PWA，需生产构建）· 0 失败 · 耗时 3.7 分钟**

---

## 一、为什么要做这一层

项目原有 **104 个测试文件 / 1800+ 用例**，全部是 Vitest + jsdom。它们能覆盖逻辑与组件渲染，
但 `src/setupTests.ts` 里塞满了浏览器 API 桩（`canvas.getContext`、`Path2D`、`matchMedia`、
`elementFromPoint`、`document.defaultView.CSS`）——**桩的存在本身即证明大量真实行为是被「模拟」而非「验证」的**。

本轮补的正是这一层：真实布局、真实 canvas / Excalidraw 绘制、真实 IndexedDB、文件下载落盘、
首屏开屏动画与主题防闪烁、真实键盘/拖拽/资源加载。

---

## 二、结果总览

| 套件 | 覆盖 | 用例 | 结果 |
| --- | --- | --- | --- |
| `00-boot` | 应用启动、默认落点、深链 | 4 | ✅ 4/4 |
| `01-shell` | 开屏动画、主题/密度防闪烁、菜单栏、命令面板、侧栏、状态栏 | 9 | ✅ 9/9 |
| `02-editor` | 新建笔记、源码/所见即所得双模式、MD↔富文本往返、工具栏 | 5 | ✅ 5/5 |
| `03-files` | 拖拽导入、空态文件列表、同名去重、IndexedDB 持久化 | 3 | ✅ 3/3 |
| `04-io` | 另存为（12 格式 + 真实下载）、导入（html/txt → Markdown） | 4 | ✅ 4/4 |
| `05-kb` | 知识库 7 个 Tab、双链图谱 SVG 渲染、导航浮层 | 3 | ✅ 3/3 |
| `06-canvas` | Excalidraw 真机挂载、视图切换、白板列表/回收站 | 4 | ✅ 4/4 |
| `07-blog` | 博客工作室、主题市场全量展示、主题切换驱动预览 | 3 | ✅ 3/3 |
| `08-longtail` | 日记、设置、主题切换、全局搜索、快捷键、PWA | 6 | ✅ 5/5 + 1 跳过 |

**模块覆盖**：编辑器、文件管理、导入、导出、知识库、双链图谱、白板、博客、日记、设置、
搜索、命令面板、主题、外壳/启动、PWA、模板/大纲/预览（间接）、迁移/同步（未覆盖，见 §6）。

---

## 三、真机验证通过的关键点（jsdom 永远测不到）

1. **Excalidraw 引擎真机挂载成功**，且无 `ChunkLoadError`。
   `index.html` 里记录过真实故障：Edge 跟踪防护拦截 unpkg 会导致 Excalidraw vendor chunk 加载失败、
   白板全无响应 —— 本项专门验证该路径已由本地 `EXCALIDRAW_ASSET_PATH` 兜住。
2. **首屏开屏动画**（打字机 9 字符）真实播放并在 1600ms 后退场，正确写入 `mc-splash-seen`。
3. **主题 / 密度防闪烁**：首屏在任何 CSS 渲染前同步打上 `html[data-theme]` / `html[data-density]`。
4. **Markdown ↔ 富文本往返一致性**：源码写 `# 标题` + `**加粗**` → 切到所见即所得渲染出 `<h1>` 与 `<strong>`；
   反向输入亦能回写为 Markdown。
5. **12 种导出格式齐备**，且「另存为 Markdown」真实产出可下载文件（文件名 `.md`）。
6. **导入保真**：拖入含 `<table>` 的 `.html` → 源码产出 GFM 表格（`| 列A | 列B |`），
   证明 `turndown-plugin-gfm` 修复生效（turndown 默认丢弃表格）。
7. **一次拖入两个同名文件去重正确**（`dupname.md` + `dupname (1).md`）—— 即 2026-10-07 审查 M1 修复的真机验证。
8. **IndexedDB 持久化**：新建笔记 → 刷新 → 文件仍在。
9. **命令面板 / 菜单栏 / 全局搜索 / 快捷键**（Ctrl+K、Ctrl+Shift+F、Ctrl+N）真实可用。

---

## 四、发现的问题

> **修复状态（2026-10-08 更新）**：以下 4 项**均已修复**，并补了回归测试。
> 修复说明见 [`BLOG_DEPLOY_FIX` 同级的 `E2E_FIXES_2026-10-08.md`](./E2E_FIXES_2026-10-08.md)。
> 其中 L-1 的根因比本文初稿描述的更严重：`saveState` 本身是 **300ms 防抖**，
> 防抖窗口内刷新时**连写都没开始**（不只是「写入未完成」）。

### ✅ 已修复 🟠 M-1 直接深链 `#view=kb` 时知识库列表为空（刷新竞态）

- **复现**：全新环境，直接打开 `#view=kb`。
- **现象**：界面显示「还没有知识库 / 创建你的第一个知识库」，状态栏「知识库 0」；
  但控制台日志明确显示播种已成功：
  `[kbSeed] 播种完成：{kbId: kb-1791389417002-t3ebpy, folderId: 1791389416423-2c4zilul0}`，
  且 `localStorage['markcraft-usage-docs-seeded'] === '1'`、IndexedDB 库 `markcraft` 已建。
- **根因（推断）**：`KbManagePanel` 挂载时取一次 `getKbList()`；播种是异步的、完成在其后，
  且面板**不会在播种完成后重新拉取** → 列表停留在空态。
- **影响**：走正常路径（先进入应用、待播种完成后再点「知识库」）一切正常 —— 故属**边界竞态**，
  而非「播种功能坏了」。深链直达用户会看到空列表。
- **建议**：播种完成后通知 KB 列表刷新（或用 store 订阅替代一次性拉取）。
- **✅ 修复**：`kbStore` 新增 `subscribeKbList`（列表唯一写入口 `writeKbList` 落盘后广播；
  订阅瞬间补推一次当前值），`KbManagePanel` 由「挂载取一次」改为订阅。
  回归：单测（`KbManagePanel.smoke` 新增竞态用例）+ E2E（直接深链 `#view=kb`）。

### ✅ 已修复 🟡 L-1 新建笔记后立即刷新会丢数据（持久化写入窗口）

- **复现**：新建笔记 → 立刻 `reload()` → 文件消失；等待约 2s 再刷新则正常。
- **根因**：`FileStore` 的 `saveState` 在 state 变化时同步触发，但底层 **IndexedDB 写入是异步的**；
  未落盘即刷新会打断写入。
- **影响**：用户在新建后「秒关标签/秒刷新」的极端操作下可能丢内容。
- **建议**：`beforeunload` 时 flush 待写队列（项目已有 S6b beforeunload 备份机制，可复用）。
- **✅ 修复**：`fileService` 新增 `flushPendingSave()`，并在 **pagehide / beforeunload / 切到后台** 三条
  路径上自动调用（补写防抖窗口内尚未落盘的快照）；`saveStateSync` 同时作废挂起的旧快照，
  避免旧数据反向覆盖新数据。回归：单测 6 条（含 pagehide / beforeunload 实际触发）+ E2E
  （新建后**不再等待**、立即刷新）。

### ✅ 已修复 🟡 L-2 导出入口隐蔽、命令面板无入口

- 「另存为」只挂在**编辑器工具栏的「更多」下拉**里，且命令面板（47 条命令）**没有** `file.saveAs`。
- 应用内置的《使用文档》却写着「点击工具栏『另存为』即可选择」—— 与命令面板缺项不一致。
- **建议**：把 `file.saveAs` 注册进命令面板目录（`commandCatalog.ts`），成本极低、可达性显著提升。
- **✅ 修复**：`file.saveAs` 已进命令目录 + 接上真实动作（经 `EditorCommandBridge.saveAs` →
  `EditorLayout.openSaveAs` → CM6/Tiptap 各自句柄）；顺带把内置《使用文档》声明却从未绑定的
  **Ctrl+Shift+S** 真正绑定。回归：`commandWiring` 单测 + E2E（命令面板与快捷键两条路径）。

### ✅ 已修复 🟡 L-3 全局搜索的 Escape 仅在输入框聚焦时生效

- **现象**：`GlobalSearch` 的 Escape 走组件内 React `onKeyDown`（`GlobalSearch.tsx:148`），
  **只有事件目标落在浮层内时才响应**。浮层打开瞬间若自动聚焦未完成，Escape 会穿透到编辑器、浮层关不掉。
- **影响**：真实用户通常无感（输入框会自动聚焦），但在自动聚焦竞态窗口内按 Escape 会失效。
  测试中已通过「先点输入框再按 Escape」规避。
- **建议**：把 Escape 处理提升为 window 级监听（与其它浮层一致），不再依赖焦点。
- **✅ 修复**：Escape 已提升为 **window 级** `keydown` 监听（浮层打开期间注册），
  并从容器上的 React `onKeyDown` 中移除该分支以免双触发。回归：E2E —— 打开浮层后
  **刻意不点输入框**、直接按 Escape，必须能关闭（守的就是那 50ms 自动聚焦竞态窗口）。

---

## 五、经确认为「设计而非缺陷」的行为

| 现象 | 结论 |
| --- | --- |
| 所见即所得里标题仍显示 `#`（`h1.textContent` 形如 `# 往返标题`） | **设计**。`SettingsStore` 默认 `livePreview: true`，实时预览会以装饰形式保留 markdown 标记 |
| 导出并非「死 UI」 | 可达（工具栏「更多 → 另存为」），12 格式齐全并真实产出文件 |
| 知识库默认 7 个 Tab（非 11 个） | 与源码注释一致（任务/目标/回顾/盲区 4 入口已移除） |

---

## 六、本轮未覆盖 / 建议后续补测

1. **PWA Service Worker**：dev 模式不注册 SW，需对**生产构建**跑（用例已写好，`E2E_PROD=1` 启用）。
2. **64 个博客主题逐个渲染**：本轮只验「全量展示 + 抽样切换」，未逐主题截图比对。
3. **DOCX / PDF 的深度校验**：导入侧只测了 html/txt；导出侧只验了 md 下载与格式清单，
   未对 docx/pdf/epub 产物做内容级校验。
4. **白板卡片编辑与关系推断**：只验到引擎挂载与列表 UI，未驱动真实画布绘制。
5. **迁移向导（Obsidian/Notion）、库同步**：需外部文件与长流程，本轮未覆盖。
6. **跨模块长链路**：如「知识库 → 发布博客 → 导出」的端到端串联。

---

## 七、如何运行

```bash
npm run e2e          # 全量（自动复用/拉起 dev server）
npm run e2e:ui       # 可视化调试
npm run e2e:report   # HTML 报告
```

详见 `e2e/README.md`。产物（截图 / trace / HTML 报告）落在 `e2e-report/` 与 `test-results/`（均已 gitignore）。
