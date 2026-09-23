# MarkCraft · 专题铁律（细节/事故过程见 `memory/YYYY-MM-DD.md`；探针见 `.workbuddy/artifacts/`）
> 主文件 `memory/MEMORY.md` 只留高频铁律（避免注入时被截断）；本文件存专题不变式，动到对应模块前先读。

## 开屏动画
落 `index.html` **内联层**（React 方案要等 bundle ⇒ 长空白）；仅首次；双 rAF 交接；`MIN_TOTAL`+`HARD_CAP` 兜底；只动 opacity/transform/filter。
⚠️ 字号须给**真上限**：旧 `clamp(28px,3.2vw,40px)` 在常见宽度恒被顶到 40 = **假响应式** → 用 `clamp(40px, min(5vw,10vh), 72px)`（`vh` 项防矮窗把字顶到屏高 14%），blur/光标宽一并改 **em** 随字号等比。

## 动效语言
⚡100–160／🚶150–250／🛋320–500ms；**外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**；reduced-motion = 更少更柔非归零；指针门控只归零**纯位移/缩放** hover，复合 transform 必须豁免。永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。
浮层退场原语 = `components/ui/usePresence`（时长常量与 CSS 逐字对齐；`[data-exiting='true']` 必带 `pointer-events:none`）。Toast·Modal 有意不动。

## tab 滑动切 Tab
滑块跟手、内容零位移；hook 必传 `dampenOffset`+`snapDecider`；白板空白板引导锁定态停用手势。

## KB 面板
subbar 52px。⚠️ `.aurora-kb-notes` 顶 padding 仅 2px 是为**自带 `__head` 的 Tab** 设计 → 无 head 的复用者必自带留白（`__lead`）。空库不渲染 tab 栏；建库后不自动进详情。

## 内置使用文档
`stores/kbSeed.ts` + `core/files/usageDocs.ts`；入口 = 设置→关于→使用文档；16 篇/语言（`core/data/defaultDocs/usageDocs/*`）。四组不变式：
1. **播种**：必须等 `hydrated`；三硬约束 = **幂等**／**不复活**（`localStorage['markcraft-usage-docs-seeded']='1'` 后删除不重建）／**零丢失**（旧文档只 `moveNode` 迁移、保原名护 [[双链]]）。
   **判据分岔**：库**不存在** = 用户删的 → 不复活；库**存在但 folderId 悬空** = 历史竞态损坏 → **自愈**（重建文件夹 + 补齐 + `rebindKbFolder`，保 kb.id／规则／任务）。
   播种必须显式 `createFile(..., false)`，否则 16 篇全开成标签页。
2. **纯净度**：① **不进编辑器文件列表** ② 点开即**只读简介页**（隐藏左栏、标签栏含关闭 ×、编辑模式选择框、左右检查器）。主区换 `UsageDocBrief`（复用 `features/preview/Preview`；⚠️ 它**无条件**注入 `.preview-image-delete-btn` → 须在 `.aurora-brief` 作用域内 `display:none`）。顶部**并无 trash 删除按钮**（与删除相关的只有「标签关闭 ×」+ 格式条「删除线」，二者随裁剪消失）。
3. 🚨 **判定单源** = `core/files/usageDocs.ts#resolveUsageDocsScope`，经 `hooks/useUsageDocsScope` 供 FileTree／EmptyFileBrowser／EditorPanel 共用；**过滤是视图层，数据不动**（文件仍在树里、仍属知识库）。
   **判据 =「在内置文件夹内 ∧ 文件名命中内置篇章清单」**（`BUILTIN_USAGE_DOC_FILE_NAMES` = `USAGE_DOC_ALL` zh/en 的 fileName ∪ `legacyNames.ts` 旧名）。**曾错成「整棵内置文件夹子树」→ 把用户放进该文件夹的自己的笔记一起吞掉**（报障「所有笔记的工具栏与左右栏都没了」；最易触发路径 = **在内置库详情页点「新建笔记」**，`KbPanel` 用 `createFile(kb.folderId, …)` 直接建在文件夹里）。
   两个集合**语义不同、不可混用**：`builtinFileIds` = 只读简介页范围（只有说明书文件本身）；`hiddenIds` = 视图过滤 = `builtinFileIds` ∪（**仅当文件夹内无任何用户内容时**）文件夹自身。边界：文件夹**改名**即不再命中（= 用户表达"不要这个内置库"）；内置文档**移出**该文件夹后按普通笔记处理。
   探针 `cdp-verify-usagedoc-brief.mjs`（65 条，含「用户笔记在内置文件夹内仍可编辑」与「退出即无痕」回归；HEAD 对照 60/65）。
4. **瞬态「退出即无痕」**：用户语义 =「只能从知识库点进去看，不能变成编辑器里一个被打开/被记住的文档」→ 三条独立持久化面都要拦：**不进最近**（它另有两个**不带过滤**的消费者：欢迎页「继续《…》」英雄卡、格式条「插入双链」候选）／**不进标签栏**／**不落盘**（否则「看着它刷新」被记成上次打开的文档）。
   实现 = **瞬态标签 `Tab.isTransient`**：`FileStore.openFile` 内部自算 `builtinFileIds`（**零调用方改动**，与简介页判定同源）命中即瞬态 → 跳过 `addRecentFile`；`AuroraTabs` 过滤；`saveState(stripTransientTabs(state))` 落盘前净化（⚠️ 只在打开时拦不够——落盘是全量防抖，停留期间随时会写）；`closeTransientTabs` 落回**最后打开的永久文档**，一篇不剩 → 空态。
   🚨 **回收判据放路由层**（`AuroraShell`：`effectiveView = auxView ?? view` ≠ editor），**不能挂 EditorPanel 卸载清理** —— 根节点 `<StrictMode>` dev 下 `mount→cleanup→mount` 的**假卸载**会当场回收刚点开的那篇（链路恰是「先建临时态→再切路由挂载面板」）；同视图内点侧栏「编辑器」view 不变 → 须在 `onSidebarSelect` 显式回收。打开**普通**文档会顺带回收现存瞬态（VS Code preview-tab 语义）。
   回归锁：`FileStore.transientTabs.test.tsx`(7) + `AuroraTabs.test.tsx`(3)，注入探针 3 处验证会翻红。

## 死代码清剿
→ skill `dead-code-purge`（判据/双锚点守卫/前缀盲区/事故全在其内）。常记：**「零 import」≠「不进包」**（桶 re-export 连带挂进模块图，dev 无 tree-shaking）→ 判死看**依赖图可达性**；「零 import」删文件 ≠「零消费者」删成员。

## 博客工作室 · 待发布清单口径
清单 = **编辑器文件列表的镜像** ⇒ 必须用**同一集合** `hiddenIds` 过滤内置《使用文档》，否则默认树里**唯一的 .md（那 16 篇说明书）就全成了"博客文章"**（全新用户清单 100% 是手册）。实现 = `BlogPanel#collectMdFiles(node, hiddenIds)` 取 `useUsageDocsScope().hiddenIds`（写法对齐 `FileTree#visibleRecent`）。
⚠️ **边界（有意为之）**：**知识库入口（`kbId`）不过滤** —— 其口径是「与该库详情页笔记列表完全一致」，而内置文档所在的库本身就是说明书的浏览入口；过滤会让**非空库显示成空库**。要改这条得先改 KB 详情页口径、两侧同改，**别只改博客一侧**。
⚠️ 预览的文章标题取自**正文首个标题**（`# 甲` → 显示「甲」），**不是文件名** → 断言内置侧也要按同一口径从数据取标题。

## 双链图谱 · 数据范围（2026-09-23 需求，提交 91ede7d 起；默认档为新增）
**三档范围（同一份全量图的三种过滤谓词）**：`files`（**默认**，文件列表口径）／`kb:<id>`（某知识库）／`all`（全部文件）。范围键 = `'files' | 'all' | 'kb:<库 id>'`，**单一表示**：组件状态、`graphSession` 现场键、localStorage `markcraft-graph-scope` 同用一个编码（避免「同一件事三种编码」漂移）；非法/脏值一律 `parseScopeKey` 回落默认档（**绝不因一条脏值把图画成空白**）。
- **默认档口径 = 排除所有知识库文件**（含内置《MarkCraft 使用文档》），只留不属于任何库的散装笔记（用户拍板）。
- 三档**共用同一个两步裁剪核心** `keepFilesByPredicate(data, keepFile)`：① 由谓词保留文件集合；② 由「一端是保留文件的边」收集被触达 tag；边两端都须落在 `保留文件 ∪ 被触达 tag` 内。⚠️ 一步法（直接用文件 id 集合过滤边）会把「文件→tag」边因 tag 端点不在集合内而**整条误删 → 标签全消失**（测试抓到过，不是假绿）。两个入口 `scopeGraphToKb`（kb 档）与 `excludeGraphFiles`（默认档）都复用该核心 —— 否则「误删标签边」的坑会被复制一份。
- 🔸 **就绪闸 `scopeReady`**：知识库文档未加载完前**不裁剪也不布点**（否则先画全量再收缩 = 图被刷新一次，且违反「默认不含知识库文件」语义）。判据必须区分「一个库都没有」与「清单还没加载」——二者都表现为 `kbList = []`，混淆会让默认档首帧露出全量图，更糟的是把范围内的库误判成「已删除」而回落默认档 ⇒ 用 `kbListed = kbStore.version > 0`。
- 🔸 **现场隔离按范围键**：`graphSession` 存 `scope`，`readScopedSession(scope)` 范围不符即视为无现场（否则**全局图/某库图的视口与选中会串台**）。⚠️ **挂载只恢复状态、切范围才 `applyLayoutRef` 重放布局**（`scopeAppliedRef` 区分首帧）—— 挂载时无条件重放会提前启动力模拟循环，污染同文件其他用例（拖拽冒烟测试因此不稳定）。
- 🔸 **命名消歧**：文件里原有的 `scope` 是「**图谱模式**作用域」（全局/局部/反向/正向/标签，在范围之内再收窄）→ 已改名 `modeScope`；新的 `scope` 专指**数据范围**。两者是不同维度，别合并。
- **入口传递链**：`KbPanel#openFullGraph()`（kbId 拼接**单源**）→ `useAuroraShell` 的 **param→params 映射表**补 `graph → { kbId }`（⚠️ 漏登记 = 参数静默丢失）→ `AuroraShell#case 'graph'` 按 `params.kbId` 传给 `GraphPanel`。路由参数是**入口指令**：`kbId` 变化即覆盖当前范围。
- **入口 → 范围映射**：知识库「查看完整图谱」→ `kb:<id>`；侧栏/菜单栏/命令面板 → 上次记住的档（默认 `files`）。
- **UI**：控件在「图谱导航」浮层最上游的**新分组「数据范围」**（`AuroraSelect` + `className="aurora-graph__scopesel"`，专属类避免误伤「匹配方式」下拉），选项 = 文件列表（默认）/ 全部文件 / 每个知识库一档；非默认档出顶栏范围芯片 + 面包屑 + 一键出口。
- **空态出口**：默认档全空 → 「查看全部文件」（`setScope('all')`）；某库档全空 → 回默认档。两处按钮共用 `.aurora-graph__empty-exit`。
- **往返闭环**：`navReturn` 带 `kbId` + 标签「XX 库 · 图谱」→ 返回回**同范围**图谱；范围内侧栏「知识库」改跳该库详情。
- **可测性**：图谱节点 `<g>` 挂 `data-node-id`/`data-node-type`；**节点身份定位必须靠数据锚点，别靠 label 文本**（label 只在孤立/热点/悬停节点渲染）。
- **回归锁**：`kb/graphScope.test.ts`（14 例纯函数：两步裁剪 + `excludeGraphFiles` 与 `scopeGraphToKb` 互补/空排除集等价/不改入参）、`kb/GraphPanel.scope.test.tsx`（9 例：默认档排除、切档、空态出口、往返闭环、持久化）、`kb/GraphPanel.smoke.test.tsx`（11 例）；真机 = `artifacts/cdp-verify-graph-scope-default.mjs`（36 条；修复版 **36/36**，HEAD 阳性对照 **20/36 —— 恰好 16 条翻红**）。
  ⚠️ 报告须标注**派生性绿**：HEAD 上「知识库文件都在图里」这类断言恒真（什么都没被过滤），不是对照失效。


## 双链图谱 · 节点拖拽（2026-09-23 报障修复）
报障 =「抓住阶段快速滑动，松手后个别节点飞得很远」+「拖拽不够丝滑」。力模拟抽成**纯函数** `simulateStep(p)`（`kb/GraphPanel.tsx`，导出供测试）。
参数：`REP=24000, LINK_DIST=140, LINK_K=0.035, GRAVITY=0.012, MIN_SEP=36, VEL_DECAY=0.86, MAX_STEP=16(导出), DRAG_ALPHA=0.2(拖拽期 alpha 下限)`。三处根因修复：
1. 🚨 **斥力奇点**：旧码 `d<1` 时把 d² 夹到 1，却**仍用原始 dx/dy 归一化** ⇒ 两节点近重合时得到**万倍冲量**（被撞节点"飞出去"）。改为 `const eff = d < MIN_SEP ? MIN_SEP : d; const f = (REP/(eff*eff))*alpha`——**必须用夹后的 `eff`**。
2. 🚨 **拖拽速度残留**：被拖节点须每帧 `vx = vy = 0`（钉住、不累积），`onPointerUp` 亦须**显式归零**——否则松手瞬间把甩动累积的速度一次性释放 = 「飞出去」。
3. **单帧位移上限** `MAX_STEP`：任何极端力都不允许一帧瞬移（兜底）。

**性能（丝滑）**：`onPointerMove` 只登记 `dragPtrRef.current` + 确保 loop 在跑（弃每帧 `toWorld()` 与 `reheat(0.35)` 打满 alpha）；`getBoundingClientRect()` 在 `pointerdown` 缓存进 `dragRef.rect`（弃每帧强制重排）；线性 `nodes.find()` → `nodeById` Map（`useMemo` 按 `graphRev` 重建）；CSS `.aurora-graph__svg.is-dragging` 关闭 node/edge/dot/label 的过渡、当前节点脉冲、活跃发光（都是持续重绘源）。

**回归锁**：`kb/graphForce.test.ts`（5 例纯函数：① 奇点消除 + 近重合 30 步速度/位移有界 ② 拖拽 20 帧速度恒 0 且位置严格跟手 + 松手后逐帧 ≤ MAX_STEP ③ 非力导向拖拽不吸附）；`GraphPanel.smoke.test.tsx` 加 `is-dragging` 锚点断言（move 中 true、up 后 false）。

**量化验证法（可复用）**：探针 `cdp-verify-graph-drag.mjs` 用 `MutationObserver` 逐帧量每节点单帧位移 —— 修复版峰值 37px、跟手误差 0.5px、松手落点漂移 3.9–14.7px；**HEAD 旧物理逐帧峰值 446px（落在被拖拽节点上）**，精确复现「飞出去」。⚠️ 对照只还原纯函数内部三处；若连 `onPointerUp` 归零一起去掉，节点会「不跟手 / 模拟停摆」，机制已变 ⇒ **不是干净的归因**，不要拿那版数据下结论。

## 通用铁律 · 细则（主文件 `MEMORY.md` 只放判据一行，细节在此）
### 哑节点家族（2026-09-21/22 两例）
- KB 详情页 `.aurora-kb-recent__item` 曾散布**三处容器**（笔记 Tab／概览「最近活动」／依赖 Tab），各自手写：概览那份是纯 `div`（无 `onClick`/role/tabIndex），且交互反馈只挂在 `.aurora-kb-notes` 容器上 ⇒ **外观一样、能力为零**；用户默认落地的恰好是概览 Tab。修法 = 抽单源 `kb/KbFileRow.tsx`，`.is-interactive` 由「有没有 `onSelect`」派生。
- `kb/MiniGraph.tsx`：12 个节点圆点恒 `cursor:pointer` 而**整图无任何 handler**，且全图**只给一个节点渲染可见名字**（`currentId = miniNodes[0]` = 引用最多的首篇）⇒ 报障「**只有第一篇** `00 开始使用.md` 点了会停在知识库详情页」。
- 探针：`artifacts/cdp-verify-kb-note-open.mjs`（控制组 + 真实鼠标分层）、`cdp-verify-kb-minigraph-click.mjs`。
### 滑动手势吃 click（2026-09-22 实测 trace）
`down x=436 → act dx=12 → end offset=12 passed=false → click sup=true`（缺陷 1：12px 漂移却抑制 click）；
`down(抖动点击) → click sup=false(切了) → act startX=436 dx=71(悬停!) → end offset=83 passed=true`（缺陷 2：悬停用**陈旧 startX** 凭空激活）。
两条判据：① 抑制条件 = `decision.passed && decision.targetIndex !== next.index`；② `pointerdown` **无条件清零**上一手势抑制标。探针 `artifacts/cdp-verify-kb-tab-first-click.mjs`（13 条；HEAD 10/13）。
### `AuroraSelect` / 滚轮浮层几何
`OptionWheelPicker`：`ITEM_H=34`、视口约 5 项（`5*34+32`）、选项 `.aurora-wheel__item[data-value]`（`role=option`，onClick 挂在该 div 上）；`AuroraSelect` 的 popover `createPortal(document.body)`、`position:fixed`，`width=min(300,max(rect.w,200))`、`top=rect.bottom+6`（越界翻到上方）、`role=dialog`。⇒ **浮层不在触发器的子树里**，"在浮层容器内找选项"必然找不到；真机点击需 `elementFromPoint` 命中测试（旋转/裁剪会偏）。
### 图谱节点身份锚点
`<g class="aurora-graph__node" data-node-id data-node-type>`：**label 只在孤立/热点/悬停/搜索命中的节点上渲染** ⇒ 靠文字认节点会得到一串空串（`GraphPanel.scope.test.tsx` 初版即栽在此）。数 file 节点 = `[data-node-type="file"]`，不含 tag。

## 编辑器 chrome 与「返回来源」按钮（2026-09-23 需求）
**报障**=「从其他功能点笔记进编辑器，顶部返回按钮独占一整行，位置不合理」→ 要求并入**文件打开标签左侧**。
- **机制**：`navReturn.ts` 模块级单例 `setEditorReturn/getEditorReturn/clearEditorReturn` + `EditorReturnContext { view, kbId?, label }`；写入方 = `KbPanel.openInEditor/handleCreateNote`（`view:'kb'`）、`GraphPanel`（图谱点笔记 `view:'graph'`+kbId）、`usageDocBrief`（`view:'kb'`）。回跳规则在 `EditorPanel#handleReturnToSource`：`kb`+kbId→`nav('kb',kbId)`；其它+kbId→`nav(view,kbId)`；无 kbId→`nav(view)`。
- **形态**（用户拍板）= 完整文字「← 返回 甲知识库 · 图谱」，**不是 icon-only**。
- **两个分支都要留回跳入口**：① 内置《使用文档》只读简介页 **不渲染整条工具栏** → 该页渲染一条「只含返回按钮的极简行」(`.aurora-editor__returnbar`)；② 关掉所有标签/空态（同样无工具栏）→ **保留**该极简行。
- 🚨 **单源组件 `panels/editor/EditorReturnButton.tsx`**（`label`/`onReturn`/`inline?`）：避免「工具栏内」与「极简行」两处各自漂移（哑节点教训）。`.aurora-editor__return-arrow`（←）+`.aurora-editor__return-text`（吃 ellipsis）分两层。
- 🚨 **接线位置**：返回按钮是 `.aurora-toolbar__tabs` 的**兄弟**、置于 `AuroraTabs` **之前** —— **不能放进 `AuroraTabs` 内部**（`AuroraTabs` 在无标签时整体不渲染 → 会把按钮一起带走）；后接发丝分隔 `.aurora-editor__tabs-lead-sep`。
- 🚨 **chrome 判据单源**：`const editorChromeShown = !!activeFileId && !isUsageDoc`（原 `activeFileId && !isUsageDoc` 散在三处：工具栏／返回落点／左缘 hoverzone）—— 统一派生，避免漂移。
- 回归锁 `panels/editor/EditorReturnPlacement.test.tsx`（6 例；位置断言用 `compareDocumentPosition`，jsdom 无布局时优于几何）；真机 `artifacts/cdp-verify-editor-return-placement.mjs`（几何：按钮在 tabsZone 内 ∧ right ≤ 首标签 left ∧ 中心 y 差 ≤ 4px ∧ 极简行数=0）。⚠️ **一条断言只证一件事**：语义用例别混落点断言。

## 编辑器高亮（split button + 16 色 + 「记住上次色」，2026-09-23 需求）
- **交互范式**（对齐 Word / VS Code，非自创）：主按钮＝应用/切换**上次色**（**不弹面板**）；右侧 12px
  小箭头＝开调色板。**只有「在调色板里显式挑色」才改写上次颜色**；主按钮 / `Ctrl+Shift+H` /
  右键菜单三条入口同语义＝「应用上次色」。改任一处都要三处对齐。
- **单源**：色表唯一真源 = `features/editor/extensions/highlightColors.ts` 的
  `HIGHLIGHT_COLOR_OPTIONS`（顺序即调色板顺序）；`HIGHLIGHT_COLORS`（正文 rgba）与
  `HIGHLIGHT_UI_COLORS`（UI hex）**键集合必须与它完全一致**（有单测锁）。上次色单一数据源 =
  `SettingsStore.lastHighlightColor`（localStorage `markcraft_settings`），读取一律过 `isHighlightColor`
  校验、非法值回退 `yellow`。
- 🚨 **不许让「扩展」与「偏好」互相 import**：`HighlightMark`（要色表）↔ `highlightColorPref`（要默认色）
  会成环 ⇒ 色常量必须留在独立的纯常量模块，两者都只 import 它。
- 🚨 **markdown 往返的色名正则必须 `[-\w]+`**（不是 `\w+`）：16 色里有 `deep-orange`/`light-blue`/
  `deep-purple`/`light-green` 四个连字符色名，用 `\w+` 会**静默退化成默认黄**（用户挑深橙、落盘是黄）。
- ⚠️ **`yellow` 回写归一化为 `==文本==`**（无后缀）——既有约定，历史两种写法统一成短形态以免每次编辑改 diff。
  测往返时这是**预期**，不要当 bug 改。
- 面板必须 `createPortal(..., document.body)` + `position:fixed`：留在工具栏内会被 `.wysiwyg-toolbar`
  的 `overflow:hidden` **裁掉**（挂载了但屏幕上不可见 ⇒ 用户报「点了没反应」）。
- 探针 `artifacts/cdp-verify-highlight-split.mjs`（33 条）。**同目录另有一条**
  `cdp-verify-highlight-click.mjs` 守「portal 裁切」那条回归，别互相合并。

## 通用铁律 · 细则（续）：主文件 `MEMORY.md` 只留判据，本节存细则
### 二级栏高 / 密度
二级栏高 = `--mc-subbar-h`（tokens §12，52px），三面板同源，**不参与密度切换**；⚠️ 栏高**被复制进派生偏移**（`blog__panelzone.top` 等）→ 改栏高必须同改，一律 `var()`。
⚠️ `densityStore` 默认广播 **compact**；`.aurora-kb.kb-shell` 复合选择器（0/2/0）内含布局回收与 `--kb-*`→`--mc-*` 重映射 → **验证「没删错」的单点最强信号**。
### 单源 token / 双层 `:root`
单源：z-index = `tokens.css §14`；Modal/Button/Confirm/Switch = `@components/ui/*`。⚠️ `styles/desktop-chrome.css` 是**有意的第二层 `:root`**（后者赢）→ 改 `--mc-accent` 须**同改两处**（含亮色）。
### hover 门控浮层
**hover 门控的浮层默认不挂载**：「浮层内控件在测试里找不到」真因常在此 → 夹具先走真实路径（`mouseEnter` 感应条 + 推进 intent 220ms）。
### 外壳污染面板测试
`RealProviders` 同渲染菜单栏 → 同名文案须 `within(...)` 限定。`COMMAND_CATALOG` 全量 ≠ 命令面板条数（`visible:()=>false` 为菜单专属）。
### 拖拽 / 滚动 / 滚轮
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘读 `xxxRef.current`；**指针捕获吞 click** → 子元素挂 **pointerup**（slop 4px）。
- React 17+ `onWheel` passive → `preventDefault()` 无效，拦横滚靠 CSS `touch-action`/`overscroll-behavior-x`；「改 CSS 不改 JS」双向陷阱 → 契约测试两侧同断言 `getBoundingClientRect()` **落点**。
- 滚动显隐用「常驻 DOM + 类折叠」（条件渲染自激振荡）；内联 `transition` 残留 → 瞬时落位后 `void el.offsetWidth; el.style.transition=''`。
- 容器级/`AuroraSelect`：触发器与浮层**共用 `aria-label`** → 取触发器用 `getByRole('button',{name})`；选项**只在展开时挂载**。
### 测试夹具细节
- **挂载与重放要分离**：挂载时无条件重放布局/动画会**提前启动循环**（力模拟/fling）污染同文件其他用例 → 用 `xxxAppliedRef` 区分首帧：挂载只恢复状态，**切档才重放**。
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- jsdom 不实现指针捕获重定向 → 一律 `pointerdown → pointerup`；无 `PointerEvent` 用 `MouseEvent`；几何断言等稳态；`getBoundingClientRect` 全 0 须打桩；缺 API 补 `src/setupTests.ts`；**IndexedDB 用 `import 'fake-indexeddb/auto'`**（在需要的测试文件内）。
- ⚠️ tsconfig **不含** `*.test.*` ⇒ tsc 干净 ≠ 测试无类型错，必须实跑。⚠️ `vitest -t <s>` 是正则，含 `*` 会**全量 skip 假绿**。
- ⚠️ 夹具一律**显式种入**被测数据且**按名幂等**（`FileStore` 是模块单例，多段重挂不能重复建 ⇒ **空态须显式 `closeAllTabs()` 造**）；**别隐式拿默认树里的内置文档当清单**。**一条断言只证一件事**。
- 易错计算抽成**可测纯函数**并导出关键上限常量（如 `simulateStep`／`MAX_STEP`），交付前先验证「旧实现会变红」（同族：`decideSnap`、两步裁剪核心）。
### CDP 探针细则
- 🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑 HEAD 阳性对照**，否则**全假绿**（最高危）。**同探针自带的正对照优于只靠 HEAD**（把被排除的同一批 id 用另一档放回，即自证它们本来可入图）。
- 🚨 **对照的选择器必须「实现无关」**（用修复后才存在的类名取扫描面 ⇒ 红得不对 = 假阳性证据）；**凡为可测性新增的锚点，都必须额外证明「没有它时也能测到该差异」**；**派生性绿要标注归属**。
- 🚨 **对照「大面积翻红（连本应绿的门也红）」先怀疑运行条件**：独立 worktree 的 dev server 是**冷的** ⇒ 应用未可交互时点击不生效。判据 = `§0 外壳就绪 waitIdx`（热 0／冷 26）。修法 = **预热轮**（`artifacts/cdp-warmup-nav.mjs`；结束**不要 `Browser.close`**，实例留给探针复用）。
- ⚠️ **原生 exe 参数路径必须 Windows 形态** `C:/...`（给 edge ⇒ 静默并入现有会话、CDP 不监听；给 node ⇒ 解析成 `D:\c\...`）。`CDP_PORT` 必须与启动端口一致（不一致症状酷似「代理污染/端口没起」）；`curl` 探测须 `--noproxy '*'`。
- 🚨 **断言时机陷阱（2026-09-23 高亮事件）**：派发 `dispatchEvent('mousedown')` 后**同步**测「目标是否还在 DOM」恒为 true——React 在 `setState` 后才重渲染，同步测量时元素尚未卸载。公平判据必须是 **`await sleep(300)` 后**的重渲染态（如 `dropdownStillOpen`）。首版用同步态当 OLD/FIXED 判据 → HEAD 对照假绿；改重渲染态后才有真证据。通则：**凡断言「某事件是否触发卸载/关闭」，必须等一拍重渲染再测**。
- 🚨 **「在 DOM 里」≠「用户看得见」（2026-09-23 高亮按钮事件）**：只断言 `!!document.querySelector(sel)` 会被**裁切类 bug** 骗过——元素已挂载却被祖先 `overflow:hidden` 裁掉、屏幕上不可见，探针仍全绿而用户报「点了没反应」。凡「点击无反应」类报障，判据必须是**可命中性**：`document.elementFromPoint(元素中心)` 命中该元素（或 `el.contains(top)`）+ 断言它**不在**裁剪容器内（`!toolbar.contains(el)`／`panelParent===body`）。
- 三陷阱：backdrop 吞指针／窗口激活吞最早鼠标事件／无焦时合成按键打不进。深链 `#view=` 只认**启动 URL**。`SVGElement` 无 `.click()` → 派发 `new MouseEvent('click',{bubbles:true,cancelable:true,view:window})`。「看得见」别用 `elementFromPoint`（`pointer-events:none` 假阴性）；拖动中截图不可信。
- 🚨 **合成输入的「预热点」必须落在真实文本块上，判据是「编辑器真的拿到焦点」（2026-09-23 高亮 split button）**：导航后头一段合成鼠标事件会被整体丢弃，故需预热；但**预热目标选错会把「没预热成功」误判成「产品坏了」**——点 `.tiptap` 容器的**几何中心**常常落在正文下方空白里，实测 10 次全拿不到焦点（`document.activeElement` 仍是 `BODY`）。正解：点 `.tiptap p/h1/li` 等**真实文本块**，并以 `!!document.activeElement?.closest('.tiptap')` 作为就绪判据（实测 1 次即就绪）。连带：**预热会移动光标 ⇒ 必须在「设选区」之前做**，否则刚设的选区被点掉。
- 🚨 **「点击无反应」的归因要双路取证，别靠读代码推理（2026-09-23）**：同一次失败里同时取 (a) **按钮上的 click 计数器**（`document.addEventListener('click',…,true)` 内判 `btn.contains(e.target)`）——证「事件到没到按钮」；(b) **直调命令 trace**（`ed.chain().focus().unsetHighlight().setHighlight({color:'red'}).run()` 后数 mark）——证「命令层能不能执行」。HEAD 对照实测：`{onBtn:0,onSvgChild:5}`（点击确实到按钮 5 次）而直调 `marksAfterDirect:1` ⇒ 归因干净落在「旧按钮 onClick 只是开关面板、根本不是应用高亮」，而非「探针坏了」。**另：重试型点击只能配「从无到有」的单向谓词**（如 mark 数增加），写成「变了个样」会让重试自相矛盾（把 toggle 又点回去）。
- ⚠️ **返回码会被管道吃掉**：`node probe.mjs | tail -20` 之后 `$?` 是 `tail` 的。要拿探针真实退出码须重定向到文件再 `echo $?`。
### 验证链路 细则
> 七条验证链路（tsc／vitest／eslint 守卫／depgraph／vite build／真机 CDP／文件集合差）本体见 `MEMORY.md`；③ 空输出须先证「实扫文件数」非 0（`-f json` 数数组长度）；守卫升 error 后须**注入探针**验 `exit=1` 且报出预期规则名 → 还原 → 复跑 0；④ 看 `BIDIRECTIONAL PAIRS`／`MODULE-LEVEL CYCLES` 两节为 `(none)`；⑥ 不适用须**显式判定**并写明判据。
### git / 沙箱 完整细则
- 🚨 内联 `node -e`／`bash -c` **禁反引号**（bash 当命令替换静默清空）；`${}`、`$()` 同理 → 长脚本一律写 `.cjs` 再跑，用完即删。
- 🚨 **`credential.helper=helper-selector` 弹窗挂死**：非交互无人点 ⇒ 裸 `git push` 被 SIGTERM 静默杀死、**远端其实没更新**（先查远端再下结论）。正解：`.git/config` 手写 `helper =`（空值重置继承链）+ `helper = wincred`。无头保险 = `scripts/push-gitee.cjs`（推内联 URL 须回写 `origin/master` 引用）。
- ⚠️ **暂存/提交一律显式 pathspec，禁 `git add -A`**（并发会话可能同仓同时编辑）。
- 🚨 单条 bash **禁 `git stash`**（半写对象库）。工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`；⚠️ 多 pathspec **一条无效则整条中止**（静默）→ 对照前必须 grep 特征标记复核「确已回到 HEAD」。
- 删除优先 `git rm`（已暂存则 `pathspec did not match` → 改 `node -e fs.unlinkSync`）或 robocopy `/MIR`；**判「删没删」用集合差**（不用 diff 行数）。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。
- **清探针进程用 PowerShell 工具**（bash 里禁内联 PowerShell；按命令行过滤，别无差别杀 msedge）。
- 仓内有**重名文件** → 一律用完整相对路径。临时文件用 `C:/Users/HJN/AppData/Local/Temp/`；⚠️ **`.mjs` 放 `%TEMP%` 解析不到仓内依赖** → 先 `cp` 进仓内，跑完 `rm`。
- ⚠️ **沙箱 safe-delete 闸**拦 Vite 重建 `.vite/deps`（>50 文件）⇒ 启 dev 前 `export CODEBUDDY_SAFE_DELETE_ENABLED=0`。
- CDP 起浏览器须**与 Edge 同一次前台 bash**；别删 profile、别换目录名（二次启动必失败 → `cp -r` 副本）；`&` 后丢 PATH。
### 解耦路线 完整版
`scripts/_depgraph.cjs` 体检：基线 8 环 → Phase 1–5 后 **0 环 / 0 双向依赖**。
- 🚨 **别名表漏登记会静默丢边 → 漏报环**，最危险方向 =「图看起来更干净了」→ 现从 `vite.config.ts` 派生 + 自检。
- **底座需上层能力 = 反向安置不是加例外**：状态留 `stores`/`features`，常量下沉 `@core/constants`，UI 落 `components/ui` 或消费方 feature。搬文件/改引用 → skill `codemod-reference-migration`。
- 判据速记：① 说环消除前先确认该环模块**边数非零**；② 大体积静态数据子图**禁建 barrel**；③ 迁移保真 = 字节级比对 + EOL + BOM 位置；④ 定靶心前枚举**双侧边**；⑤ 守卫开例外前先问**能否移动模块**；⑥ 守卫用**全量 glob + 规则内 `exempt`**。
### 路径深度
panels→features/stores `../../../`，components/ui·app `../../`（新增文件先对齐）。
