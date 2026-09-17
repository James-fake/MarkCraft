# MarkCraft · Aurora 记忆
铁律 only。案例见 `memory/YYYY-MM-DD.md`；专题见 `artifacts/*`、`MarkCraft_解耦实施方案_2026-09-17.md`。

## 定位与铁律
Vite5+React18+TS；CodeMirror6+TipTap3；白板 Excalidraw（tldraw 已退役）；Dexie/IndexedDB。
dev 端口 **5174**：`node node_modules/vite/bin/vite.js --port 5174 --host`。**入口只有 `src/aurora/aurora-main.tsx`（无 `src/main.tsx`）**，真实 `#view=` 路由。
**Aurora = 真实运行界面**；战略：网页 UI → **桌面端软件范式**（窗口 chrome／命令菜单／密度／键盘优先）。
① Aurora 即真实界面；② 禁增功能（边界 = 真实已有能力）；③ 视觉只用 `styles/tokens.css` 的 `--mc-*`；
④ UI 三层分置：壳层 UI 落 `aurora/`；通用 UI 落 `components/ui`；**业务专属 UI 随 `features/*` 自包含**（feature-sliced 变体，2026-09-17 拍板，不整体迁 aurora）。
⑤ 依赖只向下，**0 跨层反向依赖**。⑥ **分层**（解耦后）：`types|utils` → **`core`** → `components/ui+locales` → `stores` → `services` → `features/*` → `aurora/*`。

## 关键坑（防回归）
- **Path depth**：panels→features/stores `../../../`；components/ui·app `../../`。
- ⚠️ **别名表分散 4 处**：`tsconfig.json`/`vite.config.ts`/`vitest.config.ts`/`vite.smoke.config.ts` → 新增别名**必须四处同改**。只改前两处 = 「dev 正常但 vitest 崩」（实测 20 测试文件**导入期**崩溃：文件数不变、用例骤减 1499→1334 = 加载失败非断言失败）。守卫 = `src/aliasSync.test.ts`（6 例，比键集合+目标目录，逐字符剥离 JSONC 注释）。**休眠配置的绿灯不算证明**。
- **排查「谁引用了目录 X」必须同时搜 `./X` `../X` 同层相对形态** —— 只搜目录路径串会漏掉整类「同层就近引用」。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**（并行 = 后写覆盖先写、静默丢改动；症状 = tsc 报「声明未使用」+「找不到该名称」的自相矛盾组合）。跨文件可并行。改完**逐文件 grep 核验关键行**。
- 🚨 **加文件头注释前先探 BOM**（`b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF`）：BOM 是**文件级**元数据、不属行结构，「插头/截断/拼接」必须显式搬运，否则从「文件头 BOM」退化成「行中零宽字符」—— 语法无害（tsc/测试全绿）却破坏保真搬迁。
- 单源：z-index = `tokens.css §14`；Modal = `@components/ui/Modal`；Button/Confirm/Switch = `@components/ui/*`。
- ⚠️ **`styles/desktop-chrome.css` 是有意的第二层 `:root`**（加载序 tokens → desktop-chrome，后者赢）→ **只改 tokens.css 的 `--mc-accent` 不生效**，须同改 desktop-chrome（含亮色）。
- **布局属性越权**：迁 features 组件入 Aurora 时 position/inset/z-index 越权生效 → 复位须三类同设 + `contain:paint`。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘必须读 `xxxRef.current`（读 state = 旧值）。
- **指针捕获吞 click**：子元素交互挂 **pointerup**（`NODE_CLICK_SLOP=4px` 区分拖拽）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId / kb→kbId / blog→kbId）；漏登记 = 参数静默丢失。侧栏「设置」在默认收起的「更多」分组。
- **React 17+ `onWheel` passive** → `preventDefault()` 无效；拦横滚靠 CSS `touch-action`/`overscroll-behavior-x`。
- **「改 CSS 不改 JS」双向陷阱** → 契约测试两侧同断言，且断言 `getBoundingClientRect()` **落点**。
- **滚动显隐用「常驻 DOM + 类折叠」**（条件渲染 → 高度跳变 → 伪滚动 → 自激振荡闪烁）；「列表往上滑」= `scrollTop` 减小。
- **内联 `transition` 残留**：瞬时落位后必须 `void el.offsetWidth; el.style.transition=''`。
- 动效只动 **transform/opacity**；永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。
- **`AuroraSelect` 触发器(button)与浮层(dialog)共用同一 `aria-label`** → 退场窗口内两者同在 DOM，`getByLabelText` 报多元素 → 取触发器用 `getByRole('button',{name})`。
- **`AuroraSelect` 只在展开时挂载选项** → 断言选项文案须先展开，并一并断言底层 value 是否仍是裸关键字。
- **外壳污染面板测试的全局查询**：`RealProviders` 一并渲染菜单栏 → 同名文案须 `within(.aurora-kb-subbar-actions)` 限定。
- **`COMMAND_CATALOG` 全量 ≠ 命令面板条数**：`visible:()=>false` 的是菜单专属 →「一条不丢」按**可见子集**逐 id 对齐。
- **二级栏高 = `--mc-subbar-h`（tokens.css §12，52px）+ 内缩 `--mc-subbar-pad-x`（14px）**，三面板同源（`.aurora-kb-subbar`/`.aurora-blog__subbar`/`.aurora-ctop`），**不参与密度切换**。⚠️ 栏高**被复制进派生偏移**（`blog__panelzone.top`、`subbar-right.right`）→ 改栏高必须同改，一律 `var()`。
- ⚠️ **`densityStore` 默认广播 `compact`**（非 comfortable）→ 排查实际渲染值先确认密度档（只读声明值会把 42 当 46）。
- **`.aurora-kb.kb-shell` 是复合选择器（权重 0/2/0）**：布局回收落点（`contain:paint`+`position:relative`）在 panels/kb.css 复合块；其 `--kb-*` 浅色 fallback 由该块重映射到 `--mc-*` → **验证「没删错」的单点最强信号**。

## 死代码判定（判据 > 清单）
- **判死先验「有真实承载者」**：类名 → TSX 引用数、组件 → import 点。
- **「零 import」≠「不进包」**：桶（`components/ui/index.ts`）的 `export { Input }` 让 `Input.tsx`（及 `import './ui.css'`）被任何 `from '.../components/ui'` 连带挂进模块图（dev 无 tree-shaking）→ 真机 `style[data-vite-dev-id]` 实测照样下发。**判死看依赖图可达性，不看 import 计数。**
- 🚨 **「零 import」删文件，「零消费者」删成员 —— 不可互替**。「零 import」须用**可达性闭包**求：`src/index.css` 零引用但聚合的 9 文件全在入口 → **冗余**；`canvas-v2/.../canvas.css` 零引用**且**成员零消费者 → **孤儿**（还须处置消费侧悬空引用）。
- **模板拼接必须排除**（`` `aurora-btn--${size}` `` → 字面量 `aurora-btn--sm` 从不出现）；前缀抽取**只取最后一个空白分隔词**；模板前缀**必须限定 `className` 上下文**（否则 `kbTypes.ts` 的 ID 生成器会把整个 `kb-*`（66 类）伪装成动态，**掩盖 56 个真死类**）。
- **库命名空间必须豁免**（node_modules 实锤）：hljs／TipTap／Excalidraw／KaTeX／tldraw。⚠️ 反向坑：`katex-inline-wrapper` 是**活类** → 豁免须精确 `^katex$|^katex-(display|html|mathml|version|error)$`，**别写 `/^katex/`**。
- 超串有**第三形态**：**死类是活类的真前缀**（`.tiptap-math-inline` vs `-katex`；`.lint-marker` vs `lint-line-marker`；`.hover-bg` vs 变量 `var(--hover-bg)`）。
- ⚠️ **扫描盲区的真因是「前缀」不是「目录」**：类名正则硬要求 `aurora-`/`mc-` → `.tiptap-*`/`.kb-*`/`.cv-*` 全被挡在外。**每引入一个新前缀族就会再现一次同样的盲区。**
- **清剿守卫双锚点**：CSS 用 `\.name(?![a-zA-Z0-9])`（允许 `_`/`-` 即 BEM 后代）；代码用 `(?<![\w-])name(?![a-zA-Z0-9])`（**无前导点**，否则漏检 `className="mc-tooltip"`）。尾部 `\b` 会漏 `name__arrow`；不约束尾部会误伤 `.aurora-tooltips`。⚠️ 前缀族尾部**不得**挂边界 → 守卫静默假绿；**真前缀陷阱**下须精确排除活扩展裸后缀（`(?!-inner)`/`(?!-mask)`）。
- **混合选择器组摘成员**：补 `{` 前先剥尾逗号，否则产出 `.x, {`（非法）→ 浏览器**整条丢弃、活类样式静默误杀**。删除后必扫 `,\s*\{`／跨行 `,\n{`／独立 `,` 行／括号配平。判据靠「合并规则带声明存活」。
- **`@media` 删到空须连容器删**；**`@keyframes` 不被类名解析覆盖** → 须按 `animation:` 引用计数单独判定孤儿。

## 测试铁律 + 验证链路
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- **jsdom 不实现指针捕获重定向** → 一律 `pointerdown → pointerup`；无 `PointerEvent` → 用 `MouseEvent` 承载。
- **几何断言等稳态**；`getBoundingClientRect` 全 0 → 必须打桩（`stubGeometry`）。
- **CSS「无某声明」断言先剥注释**；「全仓无残留消费者」须排除 `docs[\\/]design`、`.test.tsx?$`。静态锚点用**带引号的完整字面量**。
- **末段速度采样被 jsdom dt≈0 放大** → 「期望不切换」用例须真实慢速（每步 sleep 300ms）+ 位移 < 20px。
- **jsdom 缺的 API 统一补 `src/setupTests.ts`**（`ResizeObserver`/`Path2D`/`scrollIntoView`/`elementFromPoint`/`matchMedia`）；缺 `matchMedia` 让 `CssPanel` 挂载即崩。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试文件无类型错，测试必须实跑。
- ⚠️ **`vitest -t <s>` 是正则**：用例名含 `*` 当量词 → 整条匹配不上 → **全量 skip 假绿**。
- ⚠️ **token 断言须含声明边界**：`toContain('--kb-text')` 被 `--kb-text-main:` 满足 → 用 `toContain('--kb-text:')`。
- **仅测试引用的类 = 测试制造的维护假象** → **须先升级断言再删**。
- 命令：`node node_modules/vitest/vitest.mjs run [pattern]`；`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`。
- **验证链路六条（必须全跑，缺一条即可能放过只在特定链路暴露的失败）**：① `tsc --noEmit` ② `vitest run`（走 vitest 别名）③ `eslint --no-eslintrc -c .eslintrc.guard.cjs "src/**/*.{ts,tsx}"` ④ `node scripts/_depgraph.cjs` ⑤ **`vite build`**（走 vite 别名，与 ② 不同链路）⑥ **真机 CDP**（`artifacts/cdp-verify-*.mjs`，**须与 Edge 同一次前台 bash**）—— 凡「迁移物是导航/手势/焦点上下文」或「行为依赖真实 `nav()` 跳转」必跑（jsdom 覆盖不到这一层）。
  > ③ 空输出/零违规**须先证明「实扫文件数」非 0**；守卫升 error 后**须注入探针**验证 `exit=1` 且报出预期规则名 → 字节级还原 → 全量复跑 `exit=0`（证明无残留）。只测绿灯验不出守卫死活。

## git / 沙箱
PortableGit `/c/Users/HJN/.workbuddy/binaries/PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}`；bash 每条内联 `export PATH="<三目录>:/c/Users/HJN/.workbuddy/binaries/node/versions/22.22.2-3:/c/Windows/System32"`。
- 远端 `gitee.com/James-fake/markcraft.git`；推送 `git push origin master`。推送后 `origin/master` ref 不更新 → `printf '%s\n' "$(git rev-parse master)" > .git/refs/remotes/origin/master`，再验 `git rev-list --left-right --count master...origin/master` = `0 0`。
- 🚨 **禁止在单条 bash 里跑 `git stash`**（SIGTERM 半写对象库 → 丢 `.pack`）。要暂存 → `git diff > x.patch`。
- 工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`；判删除状态用 `git -c core.quotepath=false status --porcelain`（`[ -e ]` 因中文名转八进制误判）。**频繁提交是唯一防线**。
- **删除劫持**：`rm`/`Remove-Item` 转回收站 → robocopy 镜像法（`/MIR`、相对路径），镜像后自检 `find <目标> -type f | wc -l` 为 0。批量删优先 `git rm`；⚠️ 若删除已暂存，`git rm` 报 `pathspec did not match` → 改 `node -e 'fs.unlinkSync(...)'`。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。
- **判「删没删」用集合差，不用 diff 行数**：大段删除会让 `git diff -U0` 把**未删除**的相邻行报成 `-`（实测把活关键帧报成已删）→ 正解 `git show HEAD:<f>` 与工作区各抽类名 → `comm`。
- 🚨 **回写文件必须保真换行符**：本仓混用（`blog.css`/`tokens.css`/`MEMORY.md` **CRLF**；部分 test/css LF；无 `.gitattributes`、`core.autocrlf=false`）。正解：探 `raw.includes('\r\n')` → 拆 `/\r?\n/` → 回写原 EOL；禁用 `split('\n')+join('\n')`。核对**不能比 CR 计数**（删行后 CR 自然变少 → 假警报）。**新建文件先按目标实测 EOL 写**。
- ⚠️ **仓内有重名文件**：两个 `canvas.css` → 脚本/守卫一律用**完整相对路径**。
- ⚠️ **bash 引号陷阱**：`node -e "…"` 内出现 ASCII 双引号会**截断 shell 字符串**（实测报 `Expected ',', got '<eof>'`）→ 长脚本改写 `%TEMP%/*.cjs` 再 `node` 执行（顺带免掉反引号转义地狱），用完即删。

## CDP 验证（细节全在 skill `cdp-ui-interaction-verify`）
- 前台同 bash 启动；**别删 profile、换新目录名**；同 profile 二次启动必失败 → `cp -r` 副本；`&` 之后 shell 丢 PATH。就绪判据 `.aurora-sidebar-item`。
- 三陷阱：`.aurora-audience` backdrop 吞指针（先 dismiss）／窗口激活吞最早几次鼠标事件／无焦时合成按键打不进（改点真实鼠标）。
- 深链 `#view=` 只认**启动 URL** 且只携带视图名 → 空 IndexedDB 须先真实建库。
- 🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑 HEAD 阳性对照** → 否则**全假绿**（最高危）。
- 「做没做」量**视觉位移像素**；「看得见」别用 `elementFromPoint`（`pointer-events:none` 假阴性）；**拖动中截图不可信**。
- 间距断言量 `Range.selectNodeContents(el).getClientRects()`（元素 `top` 不含自带 padding → 假阴性）；受控 input 用**原生 setter + `input` 事件**。

## 解耦路线（`scripts/_depgraph.cjs` 常备体检；**详见方案文档**）
**病灶一句**：**跨模块共享能力被就近寄居在上层模块 → 下层反向引用 → 必然成环。**基线 **8 个模块级环**。
**三处寄居**：① 业务工具寄居 `features/*` → 环 #3#4#5；② 持久化基建寄居 `stores/storage/` → 环 #2；③ 导航共享态寄居 `aurora/app/navReturn` → 环 #7#8。
**方向判定**：`stores→services` 4 处是**领域操作函数** → 自然保留；`hooks→stores` 保留，`stores→hooks` 1 处**需反转**。
**进度**（细节见方案文档）：✅ **P0** 地基（core 骨架〔**刻意不建根 barrel**〕+ `@core` 别名 **4 处同改** + 3 守卫 warn）→ ✅ **P1** 断 #2（`stores/storage/*`→`@core/storage/*`，目录**整删不做 re-export 壳**）→ ✅ **P2** 断 #4 #5 + #3 直接形态（**7→5**：6 文件下沉 `core/*`；**`stores`/`services`→`features` = 0**〔最硬信号〕）→ ✅ **P3** 断 #7 #8（**5→3**：`navReturn`→`aurora/navigation/`、`UserAccountNav`→`components/shell/`、`RealProviders`→`aurora/providers/`；新增守卫 `no-reverse-to-aurora-app` **落地即 error·零例外**）→ ⏳ **P4** `features/shared` 拆三类（靶心 = 断**反向边 `shared→stores`**）｜**P5** toolbar **并入 `features/editor/toolbar/`** + 反转 `stores→hooks` 断 #6#1｜**P6** 后置。
**基线（P3 后）**：tsc 0｜vitest **113 文件 / 1505 passed · 2 skipped · 0 failed**｜守卫 **0 违规**（671 文件实扫）｜`vite build` 成功（3514 modules）｜**3 环**。
  残留环（3）：`features/editor>toolbar>editor`（P5）、`stores>hooks>stores`、**`stores>hooks>features/shared>stores`（P2 新暴露，方案未预见）** —— 后两条 P4/P5 任一即断（交集）。
- 🚨 **`_depgraph.cjs` 已加固**：原**硬编码别名表**未登记 `@core` → 导入**静默丢边 → 漏报环**（实测 `core` 边数 = 0）。**最危险的失败方向是「图看起来更干净了」**。现从 `vite.config.ts` 派生（失败即 fail-fast）+ 根路径按脚本位置推算 + 「本项目别名漏登记」自检段。
- **关键判据**：① 宣布「某环已消除」前**先确认该环涉及模块在边列表中有非零边数**（否则可能是工具没看见）；② **含大体积静态数据的子图禁建 barrel**（桶会把它连带挂进每个消费者 —— `core/files` 若做桶，4859 行种子文档会拖进所有 `recentFiles` 使用者）；③ 迁移保真三件套：字节级比对 + EOL 探针 + **BOM 位置**；④ **定靶心前枚举「双侧边」（源码 + 测试）** —— 模块级环**只计源码**（`_depgraph.cjs:72` 排除 `.test`），只看环会误判「搬 1 处就够」（实测 `panels→app` 17 处里 **14 处是测试边**）；⑤ **守卫要为某类文件开例外时，先问「能否移动模块」**（移动优于例外：`RealProviders` 寄居 `aurora/app` 会逼守卫为 12 个测试开例外 → 迁 `aurora/providers/` 后**零例外**）；⑥ 守卫作用域用**全量 glob + 规则内 `exempt`**（工厂已支持），**忌 `overrides.files` 列举子目录** —— 列举 = 新目录即盲区。
- 入度基线 stores 102／types 79／components/ui 54／shared 52；出度 aurora/panels **165**／features/editor **95**。

## 专题铁律（细节见 artifacts / 每日日志）
- **动效语言**：分层 ⚡100–160／🚶150–250／🛋320–500ms；**外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**；reduced-motion =「更少更柔非归零」（入场 `mc-rm-fade`、**退场 `mc-rm-fade-out`**）；指针门控只归零**纯位移/缩放型** hover，**复合 transform 必须豁免**。
- **浮层退场**（原语 `components/ui/usePresence`；时长常量须与 CSS 逐字对齐；`[data-exiting='true']` 必带 `pointer-events:none`）。命令面板／FileTree·Outline 展开／Tooltip hover-out／视图切换生效；Toast·Modal **有意不动**。
- **N · tab 滑动切 Tab**：Apple 分段控件，**滑块跟手、内容零位移**、方向=目标、连续跨格；hook 必传 `dampenOffset`(恒等)+`snapDecider`；**位移保号与目标取反不能并存**。六条栏：`settings__nav-tabs`/`kb-subbar-tabs`/`blog__subseg`/`blog__tabs`/`csp__tabs`/`ctop__switcher`。⚠️ 白板**空白板引导锁定态**停用手势。R1–R3 旧法**已废弃勿回退**。
- **KB 面板**：subbar 52px。⚠️ `.aurora-kb-notes` 顶 padding 仅 2px 是为**自带 `__head` 的 Tab** 设计 → **无 head 的复用者必自带留白**（`__lead`）。基线锁 `kbTopSpacing.test.ts`+`notesTabHeader.test.ts`。⚠️ 空库不渲染 tab 栏、建库后**不自动进详情**；提交按钮选择器须限定 `.aurora-kb-modal` 内。

## 待办清单（**正文已移出** → `artifacts/TODO-cleanup-audit-2026-09-17.md`）
- 🔴 **死 CSS 最高待决**：`canvasTheme.ts` 注入的 `.tl-container, .canvas-v2-root` **皆无 DOM** ⇒ 其独有 ~25 个 `--cv-*` 全程未定义，却被 8 个 canvas-v2 文件以**无 fallback** 的 `var(--cv-*)` 消费（`injectCanvasTheme()` **零调用点**）；修法 = 改挂 `:root`，**会改白板浮层观感**。
- ⚙️ **结构审计最高优先**：巨型文件 `features/blog/themes/newThemes.ts` **22752 行** → 按主题拆分。
- 其余（死 CSS 批 2.5-B/批 3/3.5、`Input.tsx`+`EmptyState.tsx` 零消费者、`--mc-dur-lazy`、`tiptap-math-inline` 命名错位、`@workers` 悬空别名、`aurora/docs/design/` 混入 `src/`、`backupService.ts` 同名分裂）见上述 artifacts 文件。
