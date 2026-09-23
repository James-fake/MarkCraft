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

## 双链图谱 · 知识库范围（2026-09-23 报障修复，提交 91ede7d）
从知识库「查看完整图谱」进入的图谱**只画该库文件节点**（库外文件不画；库内互链 + 库内笔记**用到的标签**保留）；侧栏/菜单栏/命令面板进入**保持全局**（用户拍板）。
- 传递链 = `KbPanel#openFullGraph()`（kbId 拼接**单源**，哑组件不各自拼）→ `useAuroraShell` 的 **param→params 映射表**补 `graph → { kbId }`（⚠️ 漏登记 = 参数静默丢失）→ `AuroraShell#case 'graph'` 按 `params.kbId` 传参。
- 裁剪 = 纯函数 `scopeGraphToKb(data, kbFileIds)` **两步法**：① 取库内文件；② 由「一端是库内文件的边」收集被触达 tag；边两端都须落在 `库内文件 ∪ 本库tag` 内。⚠️ 一步法（直接用文件 id 集合过滤边）会把「文件→tag」边因 tag 端点不在集合内而**整条误删 → 标签全消失**（测试抓到过，不是假绿）。库内文件口径 = `getKbFiles(rootFolder, kb)`（与博客清单/KB 详情**同源**）。
- 范围隔离 = `graphSession` 增 `kbId` + `readScopedSession(kbId)`（范围不符即视为无现场），否则**全局图的视口/选中会串到范围图**。往返 = `navReturn` 带 `kbId` + 标签「XX 库 · 图谱」→ 返回回**同范围**图谱；范围内侧栏「知识库」改跳该库详情（闭环）。
- 可测性 = 图谱节点 `<g>` 挂 `data-node-id`/`data-node-type`；**节点身份定位必须靠数据锚点，别靠 label 文本**（label 只在孤立/热点/悬停节点渲染）。

## 双链图谱 · 节点拖拽（2026-09-23 报障修复）
报障 =「抓住阶段快速滑动，松手后个别节点飞得很远」+「拖拽不够丝滑」。力模拟抽成**纯函数** `simulateStep(p)`（`kb/GraphPanel.tsx`，导出供测试）。
参数：`REP=24000, LINK_DIST=140, LINK_K=0.035, GRAVITY=0.012, MIN_SEP=36, VEL_DECAY=0.86, MAX_STEP=16(导出), DRAG_ALPHA=0.2(拖拽期 alpha 下限)`。三处根因修复：
1. 🚨 **斥力奇点**：旧码 `d<1` 时把 d² 夹到 1，却**仍用原始 dx/dy 归一化** ⇒ 两节点近重合时得到**万倍冲量**（被撞节点"飞出去"）。改为 `const eff = d < MIN_SEP ? MIN_SEP : d; const f = (REP/(eff*eff))*alpha`——**必须用夹后的 `eff`**。
2. 🚨 **拖拽速度残留**：被拖节点须每帧 `vx = vy = 0`（钉住、不累积），`onPointerUp` 亦须**显式归零**——否则松手瞬间把甩动累积的速度一次性释放 = 「飞出去」。
3. **单帧位移上限** `MAX_STEP`：任何极端力都不允许一帧瞬移（兜底）。

**性能（丝滑）**：`onPointerMove` 只登记 `dragPtrRef.current` + 确保 loop 在跑（弃每帧 `toWorld()` 与 `reheat(0.35)` 打满 alpha）；`getBoundingClientRect()` 在 `pointerdown` 缓存进 `dragRef.rect`（弃每帧强制重排）；线性 `nodes.find()` → `nodeById` Map（`useMemo` 按 `graphRev` 重建）；CSS `.aurora-graph__svg.is-dragging` 关闭 node/edge/dot/label 的过渡、当前节点脉冲、活跃发光（都是持续重绘源）。

**回归锁**：`kb/graphForce.test.ts`（5 例纯函数：① 奇点消除 + 近重合 30 步速度/位移有界 ② 拖拽 20 帧速度恒 0 且位置严格跟手 + 松手后逐帧 ≤ MAX_STEP ③ 非力导向拖拽不吸附）；`GraphPanel.smoke.test.tsx` 加 `is-dragging` 锚点断言（move 中 true、up 后 false）。

**量化验证法（可复用）**：探针 `cdp-verify-graph-drag.mjs` 用 `MutationObserver` 逐帧量每节点单帧位移 —— 修复版峰值 37px、跟手误差 0.5px、松手落点漂移 3.9–14.7px；**HEAD 旧物理逐帧峰值 446px（落在被拖拽节点上）**，精确复现「飞出去」。⚠️ 对照只还原纯函数内部三处；若连 `onPointerUp` 归零一起去掉，节点会「不跟手 / 模拟停摆」，机制已变 ⇒ **不是干净的归因**，不要拿那版数据下结论。
