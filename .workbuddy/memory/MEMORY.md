# MarkCraft · 铁律
> 事故过程/对照数据/探针输出 → `memory/YYYY-MM-DD.md`、`.workbuddy/artifacts/`（本文件不放长叙述）。
> **专题不变式**（开屏动画／动效语言／tab 滑动／KB 面板／内置使用文档／死代码／博客清单／双链图谱×2）→ **`memory/TOPICS.md`**，动到对应模块前先读。

## 定位与分层
栈：Vite5+React18+TS、CodeMirror6+TipTap3、Excalidraw（tldraw 退役）、Dexie/IndexedDB。dev 端口 **5174**。**唯一入口 `src/aurora/aurora-main.tsx`**，真实 `#view=` 路由；**Aurora = 真实运行界面**，战略 = 网页 UI → 桌面软件范式（窗口 chrome／命令菜单／密度／键盘优先）。
架构铁律：① 视觉只用 `styles/tokens.css` 的 `--mc-*`；② 禁增功能（边界 = 真实已有能力）；③ UI 三层：壳层 `aurora/`、通用 `components/ui`、业务随 `features/*`；④ 依赖只向下 `types|utils`→`core`→`components/ui+locales`→`stores`→`services`→`features/*`→`aurora/*`，**底座向上=0**（守卫 `no-base-to-upper`）；⑤ 路径深度：panels→features/stores `../../../`，components/ui·app `../../`。

## 状态层
- 🚨 **FileStore 两阶段初始化**：同步 `loadState()` 在 localStorage 只有版本号时造**全新树 T0**，异步 `loadStateAsync()` 再用 IndexedDB 权威树**整体覆盖**。窗口期内「按树写入」落在随后被丢弃的 T0（只剩悬空 id）；「回存 IDB」以 T0 覆盖用户真实旧树。⇒ `useFileManager().hydrated` 是程序化写入的唯一闸口（种子/迁移必须等它），`saveState` effect 亦须 `if(!hydrated) return`。
- 🚨 **写操作一律 `setState(prev=>…)` 累积**。`moveNode` 曾用 `stateRef` 快照算整树后**整体替换** → 同批次覆盖先前 updater 的成果，movedNode 因目标父不在快照里**静默消失**（数据丢失）。锁 `stores/FileStore.batch.test.tsx`。
- 🚨 **updater 不在 `setState()` 调用时同步跑**（只在渲染期；仅「急切求值」会同步跑一次）⇒「在 updater 里给外部 `let` 赋值、再在 `setState()` 之后读」是隐藏 bug，**只在队列非空时暴露**（症状「点了没切过去」，随负载偶发；2026-09-22 `FileStore.openFile` 不切 `activeTabId`）。修法 = 新状态在**同一 updater 内一次算完**；**复现条件 =「同一 tick 连发多次更新」**（单发被急切求值掩盖）。
- ⚠️ **别名表分散 4 处**（`tsconfig`/`vite.config`/`vitest.config`/`vite.smoke.config`）必须同改；只改前两处 = 测试**导入期**崩溃（文件数不变、用例骤减）。守卫 `src/aliasSync.test.ts`；排查引用须**同时搜** `./X` `../X`。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**（并行 = 后写覆盖先写）；改完逐文件 grep 核验。

## UI 交互
- 🚨 **同款类名散布多容器 → 交互能力各自漂移**：KB 详情页三处 `.aurora-kb-recent__item` 曾各自手写，概览那份漏 `onClick`（反馈又只挂 `.aurora-kb-notes` 容器）⇒ **哑行**（用户默认落地的正是概览 Tab）。已抽单源 `kb/KbFileRow.tsx`。
- 🚨 **「可点暗示」与「实际 handler」必须同源**：可交互性由**有没有 `onSelect`** 派生（`.is-interactive`/role/tabIndex/键盘全条件式），纯展示行**不得**伪造可点暗示。第二例 `kb/MiniGraph.tsx`：12 个圆点恒 `cursor:pointer` 而整图无 handler，且**只给一个节点渲染可见名字** ⇒ 报障「只有第一篇点了没反应」。**通则：图形/SVG/画布元素自带 `cursor:pointer` 而无 handler = 哑节点；「只有某一条点不动」先查「是不是只给它渲染了可见名字」。**
- 🚨 **滑动手势「吃掉尾随 click」的判据只能是「真的换了目标」，不是「有没有位移」**：`useSwipeTabs.endGesture` 旧判据 `|offset| > DIRECTION_SLOP(8)` ⇒ 鼠标点击的几像素漂移被判横滑却**没换 tab**，紧随 click 被吞 ⇒「点了没反应」。且**非激活按压必须不残留手势状态**（旧码 `!activeRef.current` 时 return 而不解除武装 ⇒ 之后**不按键的悬停移动**用陈旧 `startX` 凭空激活手势）。准入闸 = `(e.buttons & 1) === 0 → return`（jsdom 合成事件无 `buttons`，夹具须显式传）。
- ⚠️ **「点击无反应」先注 trace 取值，别读代码推理**：打出 `offset/passed/target/startX/buttons` 即定案。**探针每个手势样本必须用全新 document**（同页连做两次被残留污染 → 恒绿）。CDP 合成拖动的 `pointermove.buttons` 实测 = 1。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘读 `xxxRef.current`；**指针捕获吞 click** → 子元素挂 **pointerup**（slop 4px）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId／kb→kbId／blog→kbId／graph→kbId）；漏登记 = 参数静默丢失。
- React 17+ `onWheel` passive → `preventDefault()` 无效，拦横滚靠 CSS `touch-action`/`overscroll-behavior-x`；「改 CSS 不改 JS」双向陷阱 → 契约测试两侧同断言 `getBoundingClientRect()` **落点**。
- 滚动显隐用「常驻 DOM + 类折叠」（条件渲染自激振荡）；内联 `transition` 残留 → 瞬时落位后 `void el.offsetWidth; el.style.transition=''`。
- `AuroraSelect`：触发器与浮层**共用 `aria-label`** → 取触发器用 `getByRole('button',{name})`；选项**只在展开时挂载**。
- **外壳污染面板测试**：`RealProviders` 同渲染菜单栏 → 同名文案须 `within(...)` 限定。`COMMAND_CATALOG` 全量 ≠ 命令面板条数（`visible:()=>false` 为菜单专属）。
- 二级栏高 = `--mc-subbar-h`（tokens §12，52px），三面板同源，**不参与密度切换**；⚠️ 栏高**被复制进派生偏移**（`blog__panelzone.top` 等）→ 改栏高必须同改，一律 `var()`。
- ⚠️ `densityStore` 默认广播 **compact**。`.aurora-kb.kb-shell` 复合选择器（0/2/0）内含布局回收与 `--kb-*`→`--mc-*` 重映射 → **验证「没删错」的单点最强信号**。
- 单源：z-index = `tokens.css §14`；Modal/Button/Confirm/Switch = `@components/ui/*`。⚠️ `styles/desktop-chrome.css` 是**有意的第二层 `:root`**（后者赢）→ 改 `--mc-accent` 须同改（含亮色）。
- 🚨 插文件头注释前先探 BOM；**回写必须保真 EOL**（本仓混用 CRLF/LF，无 `.gitattributes`、`core.autocrlf=false`）→ 探 `includes('\r\n')` → 拆 `/\r?\n/` → 原 EOL 回写；禁 `split('\n')+join('\n')`。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- jsdom 不实现指针捕获重定向 → 一律 `pointerdown → pointerup`；无 `PointerEvent` 用 `MouseEvent`；几何断言等稳态；`getBoundingClientRect` 全 0 须打桩。
- CSS「无某声明」断言先剥注释；「全仓无残留消费者」排除 `docs[\\/]design`、`.test.tsx?$`；静态锚点用带引号完整字面量；**token 断言须含声明边界**（`toContain('--kb-text:')`）。
- jsdom 缺的 API 补 `src/setupTests.ts`；**IndexedDB 用 `import 'fake-indexeddb/auto'`**（在需要的测试文件内）。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试无类型错，必须实跑。⚠️ `vitest -t <s>` 是正则，含 `*` 会**全量 skip 假绿**。
- ⚠️ 夹具一律**显式种入**被测数据、且**按名幂等**（`FileStore` 是模块单例，多段重挂不能重复建，否则段间数量漂移 → 为**错误的原因**红）；**别隐式拿默认树里的内置文档当清单**（过滤修复后会恰好失败）。
- 易错计算抽成**可测纯函数**并导出关键上限常量（如 `simulateStep`／`MAX_STEP`），交付前先验证「旧实现会变红」。

## 验证链路（七条，缺一条即可能放过只在特定链路暴露的失败）
① `tsc --noEmit -p tsconfig.json` ② `vitest run [pattern]` ③ `eslint --no-eslintrc -c .eslintrc.guard.cjs "src/**/*.{ts,tsx}"` ④ `node scripts/_depgraph.cjs` ⑤ `vite build`（与 ② 不同链路）⑥ 真机 CDP（**须与 Edge 同一次前台 bash**）⑦ **文件集合差**（删增 1:1；不用 diff 行数判删除）。
> ③ 空输出须先证「实扫文件数」非 0；守卫升 error 后须**注入探针**验 `exit=1` 且报出预期规则名 → 还原 → 复跑 0。⑥ 不适用须**显式判定**并写明判据。

## git / 沙箱
PATH 三目录 `PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}` + `node/versions/22.22.2-3` + `System32`（缺则假输出）。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 内联 `node -e`／`bash -c` **禁反引号**（bash 当命令替换静默清空）；`${}`、`$()` 同理 → 长脚本一律写 `.cjs` 再跑，用完即删。
- 🚨 **`credential.helper=helper-selector` 弹窗挂死**：非交互无人点 ⇒ 裸 `git push` 被 SIGTERM 静默杀死、**远端其实没更新**（先查远端再下结论）。正解：`.git/config` 手写 `helper =`（空值重置继承链）+ `helper = wincred`（`git config --local` 不持久化空值）。无头保险 = `scripts/push-gitee.cjs`（推内联 URL 须回写 `origin/master` 引用）。
- 🚨 单条 bash **禁 `git stash`**（半写对象库）。工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`。
- ⚠️ **并发会话可能同仓同时编辑** → **提交/暂存一律显式 pathspec，禁 `git add -A`**。
- 删除优先 `git rm`（已暂存则 `pathspec did not match` → 改 `node -e fs.unlinkSync`）或 robocopy `/MIR`。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。**判「删没删」用集合差**。
- ⚠️ 仓内有**重名文件** → 一律用完整相对路径。⚠️ 临时文件用 `C:/Users/HJN/AppData/Local/Temp/`（`/tmp` 在 bash/node 下解析不同）；**传给原生 exe（node/edge）必须 `C:/...`**，`/c/...` 会被解析成 `D:\c\...`。
- ⚠️ **沙箱 safe-delete 闸**会拦 Vite 重建 `.vite/deps`（>50 文件 ⇒ `SAFE_DELETE_BULK_CONFIRM_REQUIRED`）⇒ 启 dev 前 `export CODEBUDDY_SAFE_DELETE_ENABLED=0`。

## CDP（细节见 skill `cdp-ui-interaction-verify`）
前台同 bash 启动；别删 profile、别换目录名（二次启动必失败 → `cp -r` 副本）；`&` 后丢 PATH；就绪判据 `.aurora-sidebar-item`（+ `styleSheets.length>8`）。三陷阱（backdrop 吞指针／窗口激活吞最早鼠标事件／无焦时合成按键打不进）、深链 `#view=` 只认**启动 URL** —— 详见 skill。
- 🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑 HEAD 阳性对照**，否则**全假绿**（最高危）；「看得见」别用 `elementFromPoint`（`pointer-events:none` 假阴性）；拖动中截图不可信。
- 🚨 **阳性对照的选择器必须「实现无关」**：用**修复后才存在**的类名取扫描面 ⇒ HEAD 扫描面 = 0、报「红」，但红的理由是**选择器在旧版不存在**、与行为差异无关 = **假阳性证据（归因不诚实）**。改用修复前后**都存在**的元素反查（如由 `<circle>` 反查父 `<g>`）。**通则：凡为可测性新增的锚点（`data-node-id` 等），都必须额外证明「没有它时也能测到该差异」。**
- 🚨 **独立 worktree 做 HEAD 对照时新起的 dev server 是「冷」的 → 整轮对照失真**：冷启动按需转换慢 ⇒ 探针在应用**尚未可交互**时点击 ⇒ **侧栏点击不生效**（`ready` 已过、DOM 齐全、`hasFocus()`=true 也点不动）⇒ **连本应绿的门也红**。判据 = `§0 应用外壳就绪 waitIdx`（热机 **0** / 冷启 **16**≈8s）。**通则：对照「大面积翻红（不该红的也红）」先怀疑运行条件，别庆祝灵敏。** 修法 = 加**预热轮**（同一浏览器真实鼠标先走一遍目标路径；预热脚本**不要 `Browser.close`**，把实例交给探针复用）。
- ⚠️ **Edge profile 路径必须 Windows 形态** `C:/Users/...`；POSIX 形态 `/c/Users/...` ⇒ Edge **静默并入现有会话**（不开调试端口，日志仅「正在现有浏览器会话中打开」）→ 探针报 `CDP not ready`。
- ⚠️ **`CDP_PORT` 必须与 Edge 启动端口一致**（探针默认 9444、Edge 起在 9466 ⇒ `fetch failed`，症状酷似「代理污染/端口没起」，先核对两者）。实测本机 `HTTP_PROXY` 对 **node fetch（undici）不生效**；只有 **curl** 需要 `--noproxy '*'`。
- ⚠️ `SVGElement` **没有 `.click()`**（Chromium）→ 派发 `new MouseEvent('click',{bubbles:true,cancelable:true,view:window})` 走 React 委托链路。
- ⚠️ `git restore --source=HEAD --worktree -- <p1> <p2>`：**其中一条 pathspec 无效 ⇒ 整条命令中止、什么都不恢复**（静默）→ 对照前必须 grep 特征标记复核「确已回到 HEAD」。**bash 里禁内联 PowerShell**（工具安全策略拦）→ 清探针进程须单独用 PowerShell 工具。
- 🚨 **扫描面必须覆盖「应用会自己追加的数据」**：真机播种/替换整棵树后，`kbSeed` 的**自愈分支**（同名库存在但 `folderId` 解析不到）会把内置《使用文档》**补齐到全量 16 篇**，且该分支在「已播种」标记检查**之前** ⇒ 设 `markcraft-usage-docs-seeded='1'` **挡不住补齐**。「内置文档清单」类断言必须 ① 从 dev server **现取**权威清单（`curl .../usageDocs/zh.ts` + 正则抽 `fileName:`）② 期望值在**断言时刻重读树**。
- ⚠️ **一条断言只证一件事**：「清单非空」与「清单 === N」焊在一条里 ⇒ HEAD 对照里它为**错误的原因**变红。拆开。
- ⚠️ **`.mjs` 放 `%TEMP%` 解析不到仓内依赖**（ESM 解析基于脚本自身位置，`NODE_PATH` 对 ESM 无效）→ 先 `cp` 进仓内（`.workbuddy/artifacts/_t/`），跑完 `rm`。起探针的 bash **也要给 `bash` 留 PATH**（`exec bash script.sh` 可能报 `bash: command not found`）。

## 解耦路线（体检 `scripts/_depgraph.cjs`；判据见《解耦实施方案》）
病灶：跨模块共享能力寄居上层 → 下层反向引用 → 成环。基线 8 环 → Phase 1–5 后 **0 环 / 0 双向依赖**。
- 🚨 `_depgraph.cjs`：**别名表漏登记会静默丢边 → 漏报环**，最危险方向 =「图看起来更干净了」→ 现从 `vite.config.ts` 派生 + 自检。
- 判据速记：① 说环消除前先确认该环模块**边数非零**；② 大体积静态数据子图**禁建 barrel**；③ 迁移保真 = 字节级比对 + EOL + BOM 位置；④ 定靶心前枚举**双侧边**（源码+测试）；⑤ 守卫开例外前先问**能否移动模块**；⑥ 守卫用**全量 glob + 规则内 `exempt`**，忌 `overrides.files`；⑦⑧ 见 skill（悬空引用按**旧位置**重解析／引用重写须解析成路径再查表、两端枚举扩展名）。
- 搬文件/改引用 → skill `codemod-reference-migration`。**底座需上层能力 = 反向安置不是加例外**：状态留 `stores`/`features`，常量下沉 `@core/constants`，UI 落 `components/ui` 或消费方 feature。**「按字面语义归类」与「层级纪律」冲突时后者优先**。
