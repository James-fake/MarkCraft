# MarkCraft · 铁律（案例见 memory/YYYY-MM-DD.md；专题见 artifacts/ 与《解耦实施方案》）

## 定位与分层
栈：Vite5+React18+TS、CodeMirror6+TipTap3、Excalidraw 白板（tldraw 退役）、Dexie/IndexedDB。
dev 端口 **5174**（`node node_modules/vite/bin/vite.js --port 5174 --host`）。**入口只有 `src/aurora/aurora-main.tsx`**，真实 `#view=` 路由。**Aurora = 真实运行界面**，战略是网页 UI → 桌面软件范式（窗口 chrome／命令菜单／密度／键盘优先）。
铁律：① 视觉只用 `styles/tokens.css` 的 `--mc-*`；② 禁增功能（边界 = 真实已有能力）；③ UI 三层分置：壳层 `aurora/`、通用 `components/ui`、业务专属随 `features/*`；④ 依赖只向下，分层 `types|utils`→`core`→`components/ui+locales`→`stores`→`services`→`features/*`→`aurora/*`，**底座向上依赖=0**（守卫 `no-base-to-upper`）；⑤ Path depth：panels→features/stores `../../../`，components/ui·app `../../`。

## 关键坑
- 🚨 **FileStore 是两阶段初始化**：同步 `loadState()` 在 localStorage 只有版本号时造**全新树 T0** → 异步 `loadStateAsync()` 用 IndexedDB 权威树**整体覆盖**。窗口期内「按树写入」会落在随后被丢弃的 T0 上（只剩悬空 id）；「回存 IDB」会以 T0 覆盖用户真实旧树。⇒ `useFileManager().hydrated` 是程序化写入的唯一闸口（种子／迁移必须等它），`saveState` effect 亦须 `if(!hydrated) return`。
- 🚨 **写操作一律 `setState(prev=>…)` 累积**。`moveNode` 曾用 `stateRef` 快照算出整树后 `rootFolder:newRoot` **整体替换** → 同批次内覆盖先前 updater 的成果，且 movedNode 因目标父不在快照里**静默消失**（数据丢失）。回归锁 `stores/FileStore.batch.test.tsx`（注入探针验过会变红）。
- ⚠️ **别名表分散 4 处**（`tsconfig`/`vite.config`/`vitest.config`/`vite.smoke.config`）必须同改；只改前两处症状 = 测试**导入期**崩溃（文件数不变、用例骤减）。守卫 `src/aliasSync.test.ts`。排查引用须**同时搜** `./X` `../X` 同层相对形态。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**（并行=后写覆盖先写）；改完逐文件 grep 核验。
- 🚨 **同款类名散布多容器 → 交互能力各自漂移**（2026-09-21 报障「点知识库笔记没进编辑器，停在详情页」）：KB 详情页三处 `.aurora-kb-recent__item`（笔记 Tab／概览「最近活动」／依赖 Tab）曾**各自手写** → 概览那份漏了 `onClick`，且交互反馈只挂 `.aurora-kb-notes` 容器 ⇒ **哑行**（用户默认落地的正是概览 Tab）。已抽单源 `src/aurora/panels/kb/KbFileRow.tsx`：**可交互性由「有没有 onSelect」派生**（`.is-interactive`），纯展示行**不得**伪造可点暗示。新窗口的专项探针 `.workbuddy/artifacts/cdp-verify-kb-note-open.mjs`（控制组 + 真实鼠标事件流分层）；**同款类名多容器时探针必须按容器限定选择器、逐容器断言**，`querySelectorAll(类名)[0]` 会测到另一个列表 → 全绿却仍报障。
- 🚨 **「可点暗示」与「实际 handler」必须同源**（第二例，2026-09-22）：KB 概览「专属图谱」`MiniGraph` 的 12 个节点圆点恒 `cursor:pointer` 但**整图无任何 handler**，且全图**只给一个节点渲染可见名字**（`currentId = miniNodes[0]` = 引用最多的首篇）⇒ 报障「**只有第一篇** `00 开始使用.md` 点了会停在知识库详情页」。已抽 `src/aurora/panels/kb/MiniGraph.tsx`：可交互性由 `onSelect` 派生（`.is-interactive`/role/tabIndex/键盘全条件式）、每节点补 `<title>` 让名字可发现。**通则：图形/SVG/画布类元素自带 `cursor:pointer` 而无 handler = 哑节点；「只有某一条点不动」先查「是不是只给它渲染了可见名字」。** 探针 `.workbuddy/artifacts/cdp-verify-kb-minigraph-click.mjs`。
- 🚨 插文件头注释前先探 BOM；**回写必须保真 EOL**（本仓混用 CRLF/LF，无 `.gitattributes`、`core.autocrlf=false`）→ 探 `includes('\r\n')` → 拆 `/\r?\n/` → 原 EOL 回写；禁 `split('\n')+join('\n')`。
- 单源：z-index = `tokens.css §14`；Modal/Button/Confirm/Switch = `@components/ui/*`。⚠️ `styles/desktop-chrome.css` 是**有意的第二层 `:root`**（后者赢）→ 改 `--mc-accent` 须同改（含亮色）。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘读 `xxxRef.current`；**指针捕获吞 click** → 子元素挂 **pointerup**（slop 4px）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId／kb→kbId／blog→kbId）；漏登记 = 参数静默丢失。
- React 17+ `onWheel` passive → `preventDefault()` 无效，拦横滚靠 CSS `touch-action`/`overscroll-behavior-x`；「改 CSS 不改 JS」双向陷阱 → 契约测试两侧同断言 `getBoundingClientRect()` **落点**。
- 滚动显隐用「常驻 DOM + 类折叠」（条件渲染自激振荡）；内联 `transition` 残留 → 瞬时落位后 `void el.offsetWidth; el.style.transition=''`。
- `AuroraSelect`：触发器与浮层**共用 `aria-label`** → 取触发器用 `getByRole('button',{name})`；选项**只在展开时挂载**。
- **外壳污染面板测试**：`RealProviders` 同渲染菜单栏 → 同名文案须 `within(...)` 限定。`COMMAND_CATALOG` 全量 ≠ 命令面板条数（`visible:()=>false` 为菜单专属）。
- 二级栏高 = `--mc-subbar-h`（tokens §12，52px），三面板同源，**不参与密度切换**；⚠️ 栏高**被复制进派生偏移**（`blog__panelzone.top` 等）→ 改栏高必须同改，一律 `var()`。
- ⚠️ `densityStore` 默认广播 **compact**。`.aurora-kb.kb-shell` 复合选择器（0/2/0）内含布局回收与 `--kb-*`→`--mc-*` 重映射 → **验证「没删错」的单点最强信号**。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- jsdom 不实现指针捕获重定向 → 一律 `pointerdown → pointerup`；无 `PointerEvent` 用 `MouseEvent`；几何断言等稳态；`getBoundingClientRect` 全 0 须打桩。
- CSS「无某声明」断言先剥注释；「全仓无残留消费者」排除 `docs[\\/]design`、`.test.tsx?$`；静态锚点用带引号完整字面量；**token 断言须含声明边界**（`toContain('--kb-text:')`）。
- jsdom 缺的 API 补 `src/setupTests.ts`；**IndexedDB 用 `import 'fake-indexeddb/auto'`**（在需要的测试文件内）。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试无类型错，必须实跑。⚠️ `vitest -t <s>` 是正则，含 `*` 会**全量 skip 假绿**。

## 验证链路（七条，缺一条即可能放过只在特定链路暴露的失败）
① `tsc --noEmit -p tsconfig.json` ② `vitest run [pattern]` ③ `eslint --no-eslintrc -c .eslintrc.guard.cjs "src/**/*.{ts,tsx}"` ④ `node scripts/_depgraph.cjs` ⑤ `vite build`（与 ② 不同链路）⑥ 真机 CDP（**须与 Edge 同一次前台 bash**）⑦ **文件集合差**（删增 1:1；不用 diff 行数判删除）。
> ③ 空输出须先证明「实扫文件数」非 0；守卫升 error 后须**注入探针**验 `exit=1` 且报出预期规则名 → 还原 → 复跑 0。⑥ 不适用须**显式判定**并写明判据。

## git / 沙箱
PATH 三目录 `PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}` + `node/versions/22.22.2-3` + `System32`（缺则假输出）。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 内联 `node -e`／`bash -c` **禁反引号**（bash 当命令替换静默清空）；`${}`、`$()` 同理 → 长脚本一律写 `.cjs` 再跑，用完即删。
- 🚨 **`credential.helper=helper-selector` 弹窗挂死**：非交互无人点 ⇒ 裸 `git push` 被 SIGTERM 静默杀死、**远端其实没更新**（先查远端再下结论）。正解：`.git/config` 手写 `helper =`（空值重置继承链）+ `helper = wincred`（`git config --local` 不持久化空值）。无头保险 = `scripts/push-gitee.cjs`（推内联 URL 须回写 `origin/master` 引用）。
- 🚨 单条 bash **禁 `git stash`**（半写对象库）。工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`。
- ⚠️ **并发会话可能同仓同时编辑** → **提交/暂存一律显式 pathspec，禁 `git add -A`**。
- 删除优先 `git rm`（已暂存则 `pathspec did not match` → 改 `node -e fs.unlinkSync`）或 robocopy `/MIR`。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。**判「删没删」用集合差**。
- ⚠️ 仓内有**重名文件** → 一律用完整相对路径。⚠️ **`/tmp` 在 bash/node 下解析不同** → 临时文件用 `C:/Users/HJN/AppData/Local/Temp/`。

## CDP（细节见 skill `cdp-ui-interaction-verify`）
前台同 bash 启动；别删 profile、别换目录名（二次启动必失败 → `cp -r` 副本）；`&` 后丢 PATH；就绪判据 `.aurora-sidebar-item`。
三陷阱（backdrop 吞指针／窗口激活吞最早鼠标事件／无焦时合成按键打不进）、深链 `#view=` 只认**启动 URL** —— 详见 skill。
🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑 HEAD 阳性对照**，否则**全假绿**（最高危）；「看得见」别用 `elementFromPoint`（`pointer-events:none` 假阴性）；拖动中截图不可信。
- 🚨 **阳性对照的选择器必须「实现无关」**：第一版探针用**修复后才存在**的类名取扫描面 ⇒ HEAD 版扫描面 = 0、报「红」——但红的理由是**选择器在旧版不存在**，与行为差异无关 = **假阳性证据（归因不诚实）**。改用修复前后**都存在**的元素反查（如由 `<circle>` 反查父 `<g>`）后，HEAD 的「红」才落在真正行为上（`interactive=0/12`、点后仍 `#view=kb`）。
- ⚠️ **Edge profile 路径必须 Windows 形态** `C:/Users/...`；POSIX 形态 `/c/Users/...` ⇒ Edge **静默并入现有会话**（不开新调试端口、日志仅「正在现有浏览器会话中打开」）→ 探针报 `CDP not ready`。
- ⚠️ `SVGElement` **没有 `.click()`**（Chromium）→ 派发 `new MouseEvent('click',{bubbles:true,cancelable:true,view:window})` 走 React 委托链路。
- ⚠️ `git restore --source=HEAD --worktree -- <p1> <p2>`：**其中一条 pathspec 无效 ⇒ 整条命令中止、什么都不恢复**（静默，极易漏看）→ 对照前必须 grep 特征标记复核「确已回到 HEAD」。**bash 里禁内联 PowerShell**（工具安全策略会拦）→ 清探针进程须单独用 PowerShell 工具。

## 解耦路线（体检 `scripts/_depgraph.cjs`；判据见《解耦实施方案》）
病灶：跨模块共享能力寄居上层 → 下层反向引用 → 成环。基线 8 环 → Phase 1–5 完成后 **0 环 / 0 双向依赖**（`_depgraph.cjs` 实测）。
- 🚨 `_depgraph.cjs`：**别名表漏登记会静默丢边 → 漏报环**，最危险方向 = 「图看起来更干净了」→ 现从 `vite.config.ts` 派生 + 自检。
- 判据速记：① 说环消除前先确认该环模块**边数非零**；② 大体积静态数据子图**禁建 barrel**；③ 迁移保真 = 字节级比对 + EOL + BOM 位置；④ 定靶心前枚举**双侧边**（源码+测试）；⑤ 守卫开例外前先问**能否移动模块**；⑥ 守卫用**全量 glob + 规则内 `exempt`**，忌 `overrides.files`；⑦⑧ 见 skill（悬空引用按**旧位置**重解析 / 引用重写须解析成路径再查表、两端枚举扩展名）。
- 搬文件/改引用 → skill `codemod-reference-migration`。**底座需上层能力 = 反向安置不是加例外**：状态留 `stores`/`features`，常量下沉 `@core/constants`，UI 落 `components/ui` 或消费方 feature。**「按字面语义归类」与「层级纪律」冲突时后者优先**。

## 专题铁律（细节见 artifacts / 每日日志）
- **开屏动画**：落 `index.html` **内联层**（React 方案要等 bundle ⇒ 长空白）；仅首次；双 rAF 交接；`MIN_TOTAL`+`HARD_CAP` 兜底；只动 opacity/transform/filter。⚠️ 字号必须给**真上限**：旧 `clamp(28px,3.2vw,40px)` 在常见宽度恒被顶到 40 = **假响应式** → 用 `clamp(40px, min(5vw,10vh), 72px)`（`vh` 项防矮窗把字顶到屏高 14%），blur/光标宽一并改 **em** 随字号等比。
- **动效语言**：⚡100–160／🚶150–250／🛋320–500ms；**外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**；reduced-motion = 更少更柔非归零；指针门控只归零**纯位移/缩放** hover，复合 transform 必须豁免。永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。
- **浮层退场**：原语 `components/ui/usePresence`（时长常量与 CSS 逐字对齐；`[data-exiting='true']` 必带 `pointer-events:none`）。Toast·Modal 有意不动。
- **N · tab 滑动切 Tab**：滑块跟手、内容零位移；hook 必传 `dampenOffset`+`snapDecider`；白板空白板引导锁定态停用手势。
- **KB 面板**：subbar 52px。⚠️ `.aurora-kb-notes` 顶 padding 仅 2px 是为**自带 `__head` 的 Tab** 设计 → 无 head 的复用者必自带留白（`__lead`）。空库不渲染 tab 栏；建库后不自动进详情。
- **内置使用文档 · 播种**（`stores/kbSeed.ts`）：首启默认「MarkCraft 使用文档」KB（16 篇/语言，`core/data/defaultDocs/usageDocs/*`）。必须等 `hydrated`；三硬约束 = **幂等**／**不复活**（`localStorage['markcraft-usage-docs-seeded']='1'` 后删除不重建）／**零丢失**（旧文档只 `moveNode` 迁移、保原名护 [[双链]]）。**判据分岔**：库**不存在** = 用户删的 → 不复活；库**存在但 folderId 悬空** = 历史竞态损坏 → **自愈**（重建文件夹 + 补齐 + `rebindKbFolder`，保 kb.id／规则／任务）。播种必须显式 `createFile(..., false)`，否则 16 篇全开成标签页；入口 = 设置→关于→使用文档。
- **内置使用文档 · 纯净度（2026-09-22）**：① **不进编辑器文件列表** ② 点开即**只读简介页**（隐藏左栏、标签栏含关闭 ×、编辑模式选择框、左右检查器）。判定**单源** = `core/files/usageDocs.ts#resolveUsageDocsScope`（按**文件夹名**命中 `USAGE_DOC_FOLDER` zh/en；`hiddenIds` 必须 `walk` **整棵子树**含文件夹 —— 用 `collectAllFiles` 会留「父级已过滤、自己还在」的**孤儿行**），经 `hooks/useUsageDocsScope` 供 FileTree／EmptyFileBrowser／EditorPanel 共用；**过滤是视图层，数据不动**（文件仍在树里、仍属知识库）。`EditorPanel` 按 `isUsageDoc` 条件渲染裁 chrome，主区换 `UsageDocBrief`（复用 `features/preview/Preview`；⚠️ 它**无条件**注入 `.preview-image-delete-btn` → 须在 `.aurora-brief` 作用域内 `display:none`）。顶部**并无 trash 删除按钮**（与删除相关的只有「标签关闭 ×」+ 格式条「删除线」，二者随裁剪消失）。探针 `.workbuddy/artifacts/cdp-verify-usagedoc-brief.mjs`。
- **死代码清剿** → skill `dead-code-purge`（判据/双锚点守卫/前缀盲区/事故全在其内）。常记：**「零 import」≠「不进包」**（桶 re-export 连带挂进模块图，dev 无 tree-shaking）→ 判死看**依赖图可达性**；「零 import」删文件 ≠「零消费者」删成员。
