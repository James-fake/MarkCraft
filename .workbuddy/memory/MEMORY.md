# MarkCraft · 铁律（案例见 memory/YYYY-MM-DD.md；专题见 artifacts/ 与《解耦实施方案》）

## 定位与分层
栈：Vite5+React18+TS、CodeMirror6+TipTap3、Excalidraw 白板（tldraw 退役）、Dexie/IndexedDB。
dev 端口 **5174**（`node node_modules/vite/bin/vite.js --port 5174 --host`）。**入口只有 `src/aurora/aurora-main.tsx`**，真实 `#view=` 路由。**Aurora = 真实运行界面**，战略是网页 UI → 桌面软件范式（窗口 chrome／命令菜单／密度／键盘优先）。
铁律：① 视觉只用 `styles/tokens.css` 的 `--mc-*`；② 禁增功能（边界 = 真实已有能力）；③ UI 三层分置：壳层 `aurora/`、通用 `components/ui`、业务专属随 `features/*`；④ 依赖只向下，分层 `types|utils`→`core`→`components/ui+locales`→`stores`→`services`→`features/*`→`aurora/*`，**底座向上依赖=0**（守卫 `no-base-to-upper`）；⑤ Path depth：panels→features/stores `../../../`，components/ui·app `../../`。

## 关键坑
- 🚨 **FileStore 是两阶段初始化**：同步 `loadState()` 在 localStorage 只有版本号时造**全新树 T0** → 异步 `loadStateAsync()` 用 IndexedDB 权威树**整体覆盖**。窗口期内「按树写入」会落在随后被丢弃的 T0 上（只剩悬空 id）；「回存 IDB」会以 T0 覆盖用户真实旧树。⇒ `useFileManager().hydrated` 是程序化写入的唯一闸口（种子／迁移必须等它），`saveState` effect 亦须 `if(!hydrated) return`。
- 🚨 **写操作一律 `setState(prev=>…)` 累积**。`moveNode` 曾用 `stateRef` 快照算出整树后 `rootFolder:newRoot` **整体替换** → 同批次内覆盖先前 updater 的成果，且 movedNode 因目标父不在快照里**静默消失**（数据丢失）。回归锁 `stores/FileStore.batch.test.tsx`（注入探针验过会变红）。
- 🚨 **`setState(updater)` 的 updater 不在调用时同步跑**（只在渲染期），仅 React 的「急切求值」（该 fiber 队列为空）才会同步跑一次 ⇒ **「在 updater 里给外部 `let` 赋值、再在 `setState()` 之后读它」是隐藏 bug，且只在队列非空时暴露**。真实事故（2026-09-22）：`FileStore.openFile` 曾拆两次 setState + `let newActiveTabId` 旁路，导致**打开一个已在标签栏里的文件不切 `activeTabId`**（`isActive` 与 `activeTabId` 互相矛盾 → 渲染错的那一篇；症状「点了没切过去」，随负载偶发）。修法 = 新状态在**同一个 updater 里一次算完**。回归锁同上 ③④，**复现条件是「同一 tick 内连发多次更新」**（单发会被急切求值掩盖）。
- ⚠️ **别名表分散 4 处**（`tsconfig`/`vite.config`/`vitest.config`/`vite.smoke.config`）必须同改；只改前两处症状 = 测试**导入期**崩溃（文件数不变、用例骤减）。守卫 `src/aliasSync.test.ts`。排查引用须**同时搜** `./X` `../X` 同层相对形态。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**（并行=后写覆盖先写）；改完逐文件 grep 核验。
- 🚨 **同款类名散布多容器 → 交互能力各自漂移**（2026-09-21 报障「点知识库笔记没进编辑器，停在详情页」）：KB 详情页三处 `.aurora-kb-recent__item`（笔记 Tab／概览「最近活动」／依赖 Tab）曾**各自手写** → 概览那份漏了 `onClick`，且交互反馈只挂 `.aurora-kb-notes` 容器 ⇒ **哑行**（用户默认落地的正是概览 Tab）。已抽单源 `src/aurora/panels/kb/KbFileRow.tsx`：**可交互性由「有没有 onSelect」派生**（`.is-interactive`），纯展示行**不得**伪造可点暗示。新窗口的专项探针 `.workbuddy/artifacts/cdp-verify-kb-note-open.mjs`（控制组 + 真实鼠标事件流分层）；**同款类名多容器时探针必须按容器限定选择器、逐容器断言**，`querySelectorAll(类名)[0]` 会测到另一个列表 → 全绿却仍报障。
- 🚨 **「可点暗示」与「实际 handler」必须同源**（第二例，2026-09-22）：KB 概览「专属图谱」`MiniGraph` 的 12 个节点圆点恒 `cursor:pointer` 但**整图无任何 handler**，且全图**只给一个节点渲染可见名字**（`currentId = miniNodes[0]` = 引用最多的首篇）⇒ 报障「**只有第一篇** `00 开始使用.md` 点了会停在知识库详情页」。已抽 `src/aurora/panels/kb/MiniGraph.tsx`：可交互性由 `onSelect` 派生（`.is-interactive`/role/tabIndex/键盘全条件式）、每节点补 `<title>` 让名字可发现。**通则：图形/SVG/画布类元素自带 `cursor:pointer` 而无 handler = 哑节点；「只有某一条点不动」先查「是不是只给它渲染了可见名字」。** 探针 `.workbuddy/artifacts/cdp-verify-kb-minigraph-click.mjs`。
- 🚨 插文件头注释前先探 BOM；**回写必须保真 EOL**（本仓混用 CRLF/LF，无 `.gitattributes`、`core.autocrlf=false`）→ 探 `includes('\r\n')` → 拆 `/\r?\n/` → 原 EOL 回写；禁 `split('\n')+join('\n')`。
- 单源：z-index = `tokens.css §14`；Modal/Button/Confirm/Switch = `@components/ui/*`。⚠️ `styles/desktop-chrome.css` 是**有意的第二层 `:root`**（后者赢）→ 改 `--mc-accent` 须同改（含亮色）。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘读 `xxxRef.current`；**指针捕获吞 click** → 子元素挂 **pointerup**（slop 4px）。
- 🚨 **滑动手势的「吃掉尾随 click」判据只能是「真的换了目标」，不是「有没有位移」**：`useSwipeTabs.endGesture` 旧判据 `|offset| > DIRECTION_SLOP(8)` ⇒ 真实鼠标点击的几像素漂移被判成横滑却**没换 tab**，紧随的 click 被吞 ⇒ **用户点了没反应**（2026-09-22「首次点笔记 Tab 停在概览」）。且**非激活按压必须不残留手势状态**：`endGesture` 在 `!activeRef.current` 时 return 而不解除武装 ⇒ 之后**不按键的悬停移动**会用陈旧 `startX` 凭空激活手势、按错误落点换 tab。准入闸 = `(e.buttons & 1) === 0 → return`（jsdom 合成事件无 `buttons`，夹具须显式传）。
- ⚠️ **「点击无反应」类报障先注 trace 取值，别靠读代码推理**（本轮在 `decideSnap` 几何里绕了很久）：把 `offset / passed / target / startX / buttons` 打出来即定案。**探针里每个手势样本必须用一个全新 document**（同页连做两次会被上一次残留污染 → 断言恒绿）。CDP 合成拖动的 `pointermove.buttons` 实测 = 1。
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
- ⚠️ 仓内有**重名文件** → 一律用完整相对路径。⚠️ **`/tmp` 在 bash/node 下解析不同** → 临时文件用 `C:/Users/HJN/AppData/Local/Temp/`；**且传给原生 exe（node/edge）必须是 `C:/...`，`/c/...` 会被解析成 `D:\c\...`**（见 CDP 段）。

## CDP（细节见 skill `cdp-ui-interaction-verify`）
前台同 bash 启动；别删 profile、别换目录名（二次启动必失败 → `cp -r` 副本）；`&` 后丢 PATH；就绪判据 `.aurora-sidebar-item`。
三陷阱（backdrop 吞指针／窗口激活吞最早鼠标事件／无焦时合成按键打不进）、深链 `#view=` 只认**启动 URL** —— 详见 skill。
🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑 HEAD 阳性对照**，否则**全假绿**（最高危）；「看得见」别用 `elementFromPoint`（`pointer-events:none` 假阴性）；拖动中截图不可信。
- 🚨 **阳性对照的选择器必须「实现无关」**：第一版探针用**修复后才存在**的类名取扫描面 ⇒ HEAD 版扫描面 = 0、报「红」——但红的理由是**选择器在旧版不存在**，与行为差异无关 = **假阳性证据（归因不诚实）**。改用修复前后**都存在**的元素反查（如由 `<circle>` 反查父 `<g>`）后，HEAD 的「红」才落在真正行为上（`interactive=0/12`、点后仍 `#view=kb`）。
- ⚠️ **Edge profile 路径必须 Windows 形态** `C:/Users/...`；POSIX 形态 `/c/Users/...` ⇒ Edge **静默并入现有会话**（不开新调试端口、日志仅「正在现有浏览器会话中打开」）→ 探针报 `CDP not ready`。
- ⚠️ `SVGElement` **没有 `.click()`**（Chromium）→ 派发 `new MouseEvent('click',{bubbles:true,cancelable:true,view:window})` 走 React 委托链路。
- ⚠️ `git restore --source=HEAD --worktree -- <p1> <p2>`：**其中一条 pathspec 无效 ⇒ 整条命令中止、什么都不恢复**（静默，极易漏看）→ 对照前必须 grep 特征标记复核「确已回到 HEAD」。**bash 里禁内联 PowerShell**（工具安全策略会拦）→ 清探针进程须单独用 PowerShell 工具。
- ⚠️ **`CDP_PORT` 必须与 Edge 启动端口一致**：探针默认 9444，Edge 起在 9466 ⇒ 报 `fetch failed`，症状酷似「代理污染 / 端口没起」，实际只是**端口没对齐**（先核对两者再查环境）。顺带实测：本机 `HTTP_PROXY` 对 **node fetch（undici）不生效**（`fetch` 200 正常）—— 别当坑 Y 误判；只有 **curl** 需要 `--noproxy '*'`。
- 🚨 **扫描面必须覆盖「应用会自己追加的数据」**：真机播种/替换整棵树后，`kbSeed` 的**自愈分支**（同名库存在但 `folderId` 解析不到）会把内置《使用文档》**补齐到全量 16 篇** —— 该分支在「已播种」标记检查**之前** ⇒ 设 `markcraft-usage-docs-seeded='1'` **挡不住补齐**。所以「内置文档清单」类断言必须 **① 从 dev server 现取权威清单**（`curl http://127.0.0.1:5174/src/core/data/defaultDocs/usageDocs/zh.ts` + 正则抽 `fileName:`），**② 期望值在断言时刻重读树**（别用「播种后立刻读」的旧快照）。两条都缺 → 零命中断言被削弱/侥幸通过（本轮 v1 探针两条都犯）。
- ⚠️ **一条断言只证一件事**：「清单非空」与「清单 === N」焊在一条里 ⇒ HEAD 对照里它会为**错误的原因**变红（归因不诚实）。拆开后 HEAD 对照呈「**恰好该红的红**」（本轮 11/14，三条红归属逐条清楚）。
- 🚨 **独立 worktree 做 HEAD 对照时，新起的 dev server 是「冷」的 —— 会让整轮对照失真**（2026-09-23 实测）：冷 server 首次按需转换模块很慢 ⇒ 探针在应用**尚未可交互**时点击 ⇒ **侧栏点击不生效**（`ready` 已过、DOM 齐全、`hasFocus()`=true，就是点了没反应）。首轮因此跑出 14/30，**连 §1/§2 这两扇本应绿的门也红** ⇒ **无效对照**。
  **判据**：`§0 应用外壳就绪 waitIdx`（主仓热机 **0** / worktree 冷启 **16**≈8s）。**通则：对照"大面积翻红（不该红的门也红）"先怀疑运行条件，而不是庆祝灵敏。**
  **修法**：对照前加**预热轮** —— 同一浏览器用真实鼠标先走一遍目标路径（图谱/知识库/含入口的详情页），让 Vite 完成转换；预热脚本**不要 `Browser.close`**（要把实例交给探针复用）。加预热后恢复 18/30。
- 🚨 **为「可测性」新增的 DOM 锚点，会让对照无法归因**（坑 U 的变体）：本次给图谱节点加 `data-node-id`/`data-node-type`（因 label 只在孤立/热点/悬停渲染、拿不到稳定身份）⇒ HEAD 无这些锚点 ⇒ 依赖它们的数数/身份断言**必然红**，红的原因**不全是行为差异**。**补法 = 再做一次「不依赖新锚点」的取证**（直接数 `.aurora-graph__node`）：HEAD 上 `N_all=23 === N_kb=23`（从知识库进入的图 = 全局图）⇒ 库外文件确实未裁剪、**数数法本身能量到该差异**。通则：**凡为可测性新增的锚点，都必须额外证明「没有它时也能测到差异」**。
- ⚠️ **`.mjs` 放 `%TEMP%` 解析不到仓内依赖**（ESM 包解析基于脚本自身位置，`NODE_PATH` 对 ESM 无效）→ `import 'ws'` 直接 `ERR_MODULE_NOT_FOUND`。临时脚本先 `cp` 进仓内（`.workbuddy/artifacts/_t/`），跑完 `rm`。
- ⚠️ 起探针的 bash **也要给 `bash` 本身留 PATH**：`exec bash script.sh` 在某些 PATH 下报 `bash: command not found` → 用完整 PATH 或 `usr/bin/bash`。

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
- **内置使用文档 · 纯净度（2026-09-22，同日经紧急修复收窄）**：① **不进编辑器文件列表** ② 点开即**只读简介页**（隐藏左栏、标签栏含关闭 ×、编辑模式选择框、左右检查器）。判定**单源** = `core/files/usageDocs.ts#resolveUsageDocsScope`，经 `hooks/useUsageDocsScope` 供 FileTree／EmptyFileBrowser／EditorPanel 共用；**过滤是视图层，数据不动**（文件仍在树里、仍属知识库）。
  🚨 **判据 = 「在内置文件夹内 ∧ 文件名命中内置篇章清单」**（`BUILTIN_USAGE_DOC_FILE_NAMES` = `USAGE_DOC_ALL` zh/en 的 fileName ∪ `legacyNames.ts` 旧名）。**曾错成「整棵内置文件夹子树」→ 把用户放进该文件夹的自己的笔记一起吞掉**（用户报障「所有笔记的工具栏与左右栏都没了」；最易触发路径 = **在内置库详情页点「新建笔记」**，`KbPanel` 用 `createFile(kb.folderId, ...)` 直接建在文件夹里）。两个集合**语义不同、不可混用**：`builtinFileIds` = 只读简介页范围（只有说明书文件本身）；`hiddenIds` = 视图过滤 = `builtinFileIds` ∪（**仅当文件夹内无任何用户内容时**）文件夹自身。边界：文件夹**改名**即不再命中（=用户表达"不要这个内置库"）；内置文档**移出**该文件夹后按普通笔记处理。
  `EditorPanel` 按 `isUsageDoc`（= `builtinFileIds.has(activeFileId)`）条件渲染裁 chrome，主区换 `UsageDocBrief`（复用 `features/preview/Preview`；⚠️ 它**无条件**注入 `.preview-image-delete-btn` → 须在 `.aurora-brief` 作用域内 `display:none`）。顶部**并无 trash 删除按钮**（与删除相关的只有「标签关闭 ×」+ 格式条「删除线」，二者随裁剪消失）。探针 `.workbuddy/artifacts/cdp-verify-usagedoc-brief.mjs`（65 条，含 §5「用户笔记在内置文件夹内仍可编辑」与 §6「退出即无痕」回归；HEAD 对照 60/65，§6 精确翻红 5 条）。
- **内置使用文档 · 瞬态（退出即无痕，2026-09-22 第三轮）**：用户语义 =「只能从知识库点进去看，不能变成编辑器里一个被打开/被记住的文档」→ 三条独立持久化面都要拦：**不进最近**（它另有两个不带过滤的消费者：欢迎页「继续《…》」英雄卡、格式条「插入双链」候选）／**不进标签栏**／**不落盘**（否则「看着它刷新」被记成上次打开的文档）。实现 = **瞬态标签 `Tab.isTransient`**：`FileStore.openFile` 内部自算 `builtinFileIds`（**零调用方改动**，与简介页判定同源）命中即瞬态 → 跳过 `addRecentFile`；`AuroraTabs` 过滤；`saveState(stripTransientTabs(state))` 落盘前净化（⚠️ 只在打开时拦不够——落盘是全量防抖，停留期间随时会写）；`closeTransientTabs` 落回**最后打开的永久文档**，一篇不剩 → 空态。🚨 **回收判据放路由层**（`AuroraShell`：`effectiveView = auxView ?? view` ≠ editor），**不能挂 EditorPanel 卸载清理** —— 根节点 `<StrictMode>` dev 下 `mount→cleanup→mount` 的**假卸载**会当场回收刚点开的那篇（链路恰是「先建临时态→再切路由挂载面板」）；同视图内点侧栏「编辑器」view 不变 → 须在 `onSidebarSelect` 显式回收。打开**普通**文档会顺带回收现存瞬态（VS Code preview-tab 语义）。回归锁：`FileStore.transientTabs.test.tsx`(7) + `AuroraTabs.test.tsx`(3)，注入探针 3 处验证会翻红。
- **死代码清剿** → skill `dead-code-purge`（判据/双锚点守卫/前缀盲区/事故全在其内）。常记：**「零 import」≠「不进包」**（桶 re-export 连带挂进模块图，dev 无 tree-shaking）→ 判死看**依赖图可达性**；「零 import」删文件 ≠「零消费者」删成员。
- **博客工作室 · 待发布清单口径（2026-09-23 报障修复）**：清单 = **编辑器文件列表的镜像** ⇒ 必须用**同一集合** `hiddenIds` 过滤内置《使用文档》，否则默认树里**唯一的 .md（那 16 篇说明书）就全成了"博客文章"**（全新用户清单 100% 是手册）。实现 = `BlogPanel#collectMdFiles(node, hiddenIds)` 取 `useUsageDocsScope().hiddenIds`（写法对齐 `FileTree#visibleRecent`）。
  ⚠️ **边界（有意为之）**：**知识库入口（`kbId`）不过滤** —— 其口径是「与该库详情页笔记列表完全一致」，而内置文档所在的库本身就是说明书的浏览入口；过滤会让**非空库显示成空库**。要改这条得先改 KB 详情页口径、两侧同改，**别只改博客一侧**。
  ⚠️ 夹具教训：`BlogPanel.smoke.test.tsx` 原有夹具**隐式拿"默认树里那 16 篇内置文档"当文档清单** ⇒ 修复后恰好 2 例失败（测的正是被排除的东西）。夹具一律**显式种入普通笔记**、且**按名幂等**（`FileStore` 是模块单例，多段重挂不能重复建，否则 `docs.length` 段间漂移会让用例为**错误的原因**红）。
  ⚠️ 预览的文章标题取自**正文首个标题**（`# 甲` → 显示「甲」），**不是文件名** → 断言内置侧也要按同一口径从数据取标题。
- **双链图谱 · 知识库范围（2026-09-23 报障修复，提交 91ede7d）**：从知识库「查看完整图谱」进入的图谱**只画该库文件节点**（库外文件不画；库内互链 + 库内笔记**用到的标签**保留）；侧栏/菜单栏/命令面板进入**保持全局**（用户拍板）。
  传递链 = `KbPanel#openFullGraph()`（kbId 拼接**单源**，哑组件不各自拼）→ `useAuroraShell` 的 **param→params 映射表**补 `graph → { kbId }`（⚠️ 漏登记 = 参数静默丢失）→ `AuroraShell#case 'graph'` 按 `params.kbId` 传参。
  裁剪 = 纯函数 `scopeGraphToKb(data, kbFileIds)` **两步法**：① 取库内文件；② 由「一端是库内文件的边」收集被触达 tag；边两端都须落在 `库内文件 ∪ 本库tag` 内。⚠️ 一步法（直接用文件 id 集合过滤边）会把「文件→tag」边因 tag 端点不在集合内而**整条误删 → 标签全消失**（测试抓到过，不是假绿）。库内文件口径 = `getKbFiles(rootFolder, kb)`（与博客清单/KB 详情**同源**，folder+手动+规则）。
  范围隔离 = `graphSession` 增 `kbId` + `readScopedSession(kbId)`（范围不符即视为无现场），否则**全局图的视口/选中会串到范围图**。往返 = `navReturn` 带 `kbId` + 标签「XX 库 · 图谱」→ 返回回**同范围**图谱；范围内侧栏「知识库」改跳该库详情（闭环）。
  可测性 = 图谱节点 `<g>` 挂 `data-node-id`/`data-node-type`；**节点身份定位必须靠数据锚点，别靠 label 文本**（label 只在孤立/热点/悬停节点渲染）。
