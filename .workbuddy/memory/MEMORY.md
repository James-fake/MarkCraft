# MarkCraft · Aurora 记忆
铁律 only。案例见 `memory/YYYY-MM-DD.md`；专题见 `artifacts/*` 与《解耦实施方案》。

## 定位与铁律
Vite5+React18+TS；CodeMirror6+TipTap3；白板 Excalidraw（tldraw 已退役）；Dexie/IndexedDB。
dev 端口 **5174**：`node node_modules/vite/bin/vite.js --port 5174 --host`。**入口只有 `src/aurora/aurora-main.tsx`（无 `src/main.tsx`）**，真实 `#view=` 路由。
**Aurora = 真实运行界面**；战略：网页 UI → **桌面端软件范式**（窗口 chrome／命令菜单／密度／键盘优先）。
① Aurora 即真实界面；② 禁增功能（边界 = 真实已有能力）；③ 视觉只用 `styles/tokens.css` 的 `--mc-*`；
④ UI 三层分置：壳层 UI 落 `aurora/`；通用 UI 落 `components/ui`；**业务专属 UI 随 `features/*` 自包含**。
⑤ 依赖只向下。⑥ 分层：`types|utils` → `core` → `components/ui+locales` → `stores` → `services` → `features/*` → `aurora/*`；**底座向上依赖 = 0**（守卫 `no-base-to-upper` 锁死）。

## 关键坑（防回归）
- **Path depth**：panels→features/stores `../../../`；components/ui·app `../../`。
- ⚠️ **别名表分散 4 处**（`tsconfig`/`vite.config`/`vitest.config`/`vite.smoke.config`）→ **四处同改**。只改前两处 = 「dev 正常但 vitest 崩」，症状：测试**导入期**崩溃 ⇒ 文件数不变、用例骤减（加载失败，非断言失败）。守卫 `src/aliasSync.test.ts`。
- 排查「谁引用了目录 X」**必须同时搜 `./X` `../X` 同层相对形态**，否则漏掉整类「同层就近引用」。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**（并行 = 后写覆盖先写；症状：tsc 报「声明未使用」+「找不到该名称」）。改完**逐文件 grep 核验**。
- 🚨 **加文件头注释前先探 BOM**（`EF BB BF`）：BOM 是**文件级**元数据，插入/截断/拼接必须显式搬运，否则退化成「行中零宽字符」—— 语法无害却破坏保真搬迁。
- 单源：z-index = `tokens.css §14`；Modal / Button / Confirm / Switch = `@components/ui/*`。
- ⚠️ **`styles/desktop-chrome.css` 是有意的第二层 `:root`**（加载序 tokens → 后者赢）→ **只改 tokens.css 的 `--mc-accent` 不生效**，须同改 desktop-chrome（含亮色）。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘必须读 `xxxRef.current`（读 state = 旧值）。**指针捕获吞 click**：子元素交互挂 **pointerup**（`NODE_CLICK_SLOP=4px` 区分拖拽）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId / kb→kbId / blog→kbId）；漏登记 = 参数静默丢失。
- **React 17+ `onWheel` passive** → `preventDefault()` 无效，拦横滚靠 CSS `touch-action`/`overscroll-behavior-x`。**「改 CSS 不改 JS」双向陷阱** → 契约测试两侧同断言，断言 `getBoundingClientRect()` **落点**。
- **滚动显隐用「常驻 DOM + 类折叠」**（条件渲染会自激振荡闪烁）；「列表往上滑」= `scrollTop` 减小。
- **内联 `transition` 残留**：瞬时落位后必须 `void el.offsetWidth; el.style.transition=''`。动效只动 **transform/opacity**；永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。
- **`AuroraSelect`**：触发器(button)与浮层(dialog)**共用同一 `aria-label`** → 退场窗口内 `getByLabelText` 报多元素 → 取触发器用 `getByRole('button',{name})`；且**只在展开时挂载选项** → 断言文案须先展开，并断言底层 value 是否仍是裸关键字。
- **外壳污染面板测试的全局查询**：`RealProviders` 一并渲染菜单栏 → 同名文案须 `within(.aurora-kb-subbar-actions)` 限定。**`COMMAND_CATALOG` 全量 ≠ 命令面板条数**：`visible:()=>false` 的是菜单专属 → 按**可见子集**逐 id 对齐。
- **二级栏高 = `--mc-subbar-h`（tokens.css §12，52px）+ 内缩 `--mc-subbar-pad-x`（14px）**，三面板同源（`.aurora-kb-subbar`/`.aurora-blog__subbar`/`.aurora-ctop`），**不参与密度切换**；⚠️ 栏高**被复制进派生偏移**（`blog__panelzone.top`、`subbar-right.right`）→ 改栏高必须同改，一律 `var()`。
- ⚠️ **`densityStore` 默认广播 `compact`**（非 comfortable）→ 排查实际渲染值先确认密度档（只读声明值会把 42 当 46）。**`.aurora-kb.kb-shell` 复合选择器（权重 0/2/0）**：布局回收落点与 `--kb-*` → `--mc-*` 重映射同在该块 → **验证「没删错」的单点最强信号**。

## 死代码清剿 → skill `dead-code-purge`
判据、双锚点守卫、前缀盲区、混合选择器组摘成员手术、`@keyframes` 孤儿判定全在该 skill。常记三条：
① **「零 import」≠「不进包」**（桶的 `export { Input }` 会把文件连带挂进模块图，dev 无 tree-shaking）→ **判死看依赖图可达性，不看引用计数**；② **「零 import」删文件 / 「零消费者」删成员，不可互替**；③ **盲区真因是「前缀」不是「目录」**（正则硬编码 `aurora-`/`mc-` → **每引入新前缀族即再现**）。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- **jsdom 不实现指针捕获重定向** → 一律 `pointerdown → pointerup`；无 `PointerEvent` → 用 `MouseEvent` 承载。**几何断言等稳态**；`getBoundingClientRect` 全 0 → 必须打桩（`stubGeometry`）。
- **CSS「无某声明」断言先剥注释**；「全仓无残留消费者」须排除 `docs[\\/]design`、`.test.tsx?$`。静态锚点用**带引号的完整字面量**。**token 断言须含声明边界**（`toContain('--kb-text')` 被 `--kb-text-main:` 满足 → 用 `toContain('--kb-text:')`）。
- **jsdom 缺的 API 统一补 `src/setupTests.ts`**（`ResizeObserver`/`Path2D`/`scrollIntoView`/`elementFromPoint`/`matchMedia`）。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试文件无类型错，测试必须实跑。⚠️ **`vitest -t <s>` 是正则**：用例名含 `*` 当量词 → 匹配不上 → **全量 skip 假绿**。

## 验证链路（**七条**，缺一条即可能放过只在特定链路暴露的失败）
① `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` ② `node node_modules/vitest/vitest.mjs run [pattern]`（走 vitest 别名）③ `eslint --no-eslintrc -c .eslintrc.guard.cjs "src/**/*.{ts,tsx}"` ④ `node scripts/_depgraph.cjs` ⑤ **`vite build`**（走 vite 别名，与 ② 不同链路）⑥ **真机 CDP**（**须与 Edge 同一次前台 bash**；迁移物是导航/手势/焦点上下文、或依赖真实 `nav()` 跳转必跑）⑦ **文件集合差**（删增 1:1 核对；**不用 diff 行数判删除**）。
> ③ 空输出**须先证明「实扫文件数」非 0**；守卫升 error 后**须注入探针**验证 `exit=1` 且报出预期规则名 → 字节级还原 → 复跑 `exit=0`。只测绿灯验不出守卫死活。⑥ 不适用须**显式判定**并写明判据，不得默认省略。

## git / 沙箱
PortableGit `/c/Users/HJN/.workbuddy/binaries/PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}`；bash 每条内联 `export PATH="<三目录>:/c/Users/HJN/.workbuddy/binaries/node/versions/22.22.2-3:/c/Windows/System32"`。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 **禁止在内联 `node -e "..."` / `bash -c` 里出现反引号**（尤其 Markdown 行内代码）：bash 当**命令替换执行后替换为空**且**静默成功**（曾实测掏空 MEMORY.md 两行）；`${}`、`$()` 同理 → **含反引号或长脚本一律写 `.cjs` 再 `node` 执行**，临时脚本用完即删（`scripts/push-gitee.cjs` 等长驻工具除外）。
- 🚨 **推送必须走 `scripts/push-gitee.cjs`**：PortableGit **系统 gitconfig 的 `credential.helper=helper-selector` 极慢（>15s，约 30s 才返回）** → 裸 `git push` 被工具按 SIGTERM 杀掉（整条命令无声死亡、连 RC 都不打印），**且远端实际未更新** ⇒ **先查远端再下结论**。该脚本 = 自管超时（凭证 90s）+ `git credential fill` 取凭证 + 内联 URL push + 输出脱敏 + 自动回写 `origin/master` + `ls-remote` 复核；git 须 `-c http.proxy= -c https.proxy=` 清空代理（`http_proxy=127.0.0.1:*` 会掐死 git https；Node `fetch` 不受影响，可独立复核远端）。
- 推**内联 URL 不会**更新 `origin/master` → 手动回写 `.git/refs/remotes/origin/master`，再验 `rev-list --left-right --count master...origin/master` = `0 0`。
- 🚨 **禁止在单条 bash 里跑 `git stash`**（SIGTERM 半写对象库 → 丢 `.pack`）。要暂存 → `git diff > x.patch`。
- 工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`；判删除状态用 `git -c core.quotepath=false status --porcelain`（`[ -e ]` 因中文名转八进制误判）。⚠️ **并发会话可能同仓库同时编辑**（实测提交后 clean→dirty、凭空冒出他人改动 + 已暂存删除）→ **提交/暂存一律显式 pathspec，禁 `git add -A`**，否则把别人未完成的活儿打包进自己的提交。**频繁提交是唯一防线**。
- **删除劫持** → robocopy 镜像法（`/MIR`、相对路径），镜像后自检文件数为 0；批量删优先 `git rm`（⚠️ 删除已暂存时 `git rm` 报 `pathspec did not match` → 改 `node -e 'fs.unlinkSync(...)'`）。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。**判「删没删」用集合差**（`git diff -U0` 会把**未删除**的相邻行报成 `-`）→ `git show HEAD:<f>` 与工作区各抽类名 → `comm`。
- 🚨 **回写文件必须保真换行符**（本仓混用：`tokens.css`/`MEMORY.md` 等 **CRLF**，部分 test/css LF；无 `.gitattributes`、`core.autocrlf=false`）：探 `raw.includes('\r\n')` → 拆 `/\r?\n/` → 回写原 EOL；禁用 `split('\n')+join('\n')`。核对**不能比 CR 计数**（删行后 CR 自然变少 → 假警报）。
- ⚠️ 仓内有**重名文件** → 脚本/守卫一律用**完整相对路径**。⚠️ **`/tmp` 在 bash 与 node 下解析不同**（node 得 `D:\tmp\`）→ 临时文件用 `C:/Users/HJN/AppData/Local/Temp/`。

## CDP 验证（细节全在 skill `cdp-ui-interaction-verify`）
- 前台同 bash 启动；**别删 profile、别换新目录名**（同 profile 二次启动必失败 → `cp -r` 副本）；`&` 之后 shell 丢 PATH。就绪判据 `.aurora-sidebar-item`。
- 三陷阱：backdrop 吞指针（先 dismiss）／窗口激活吞最早几次鼠标事件／无焦时合成按键打不进。深链 `#view=` 只认**启动 URL** → 空 IndexedDB 须先真实建库。
- 🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑 HEAD 阳性对照** → 否则**全假绿**（最高危）。「看得见」别用 `elementFromPoint`（`pointer-events:none` 假阴性）；**拖动中截图不可信**。

## 解耦路线（体检 `scripts/_depgraph.cjs`；判据全文见《解耦实施方案》）
**病灶一句**：跨模块共享能力被就近寄居在上层模块 → 下层反向引用 → 必然成环。基线 8 环 → 现 **2 环**（`editor>toolbar>editor`〔P5.1〕、`stores>hooks>stores`〔P5.2〕）。
- 🚨 **`_depgraph.cjs` 已加固**：原**硬编码别名表**未登记 `@core` → **静默丢边 → 漏报环**；**最危险的失败方向是「图看起来更干净了」**。现从 `vite.config.ts` 派生 + 别名漏登记自检段。
- 判据速记 ①–⑧：① 说「环已消除」前**先确认该环模块在边列表中有非零边数**；② 含大体积静态数据的子图**禁建 barrel**；③ 迁移保真 = 字节级比对 + EOL 探针 + **BOM 位置**；④ 定靶心前**枚举双侧边（源码+测试）**（环只计源码）；⑤ 守卫要开例外前**先问能否移动模块**；⑥ 守卫用**全量 glob + 规则内 `exempt`**，忌 `overrides.files`；⑦ 被搬文件自身引用按新位置求值**可能悬空**（修法：用**旧位置**重解析）；⑧ 引用重写须**解析成路径再查表映射、两端都枚举扩展名**（形态匹配必在某形态**静默失明**；源文件搬走后靠 `existsSync` 补扩展名**必落空**）。
- **搬文件/改引用 → skill `codemod-reference-migration`**。**底座需上层能力时正解 = 反向安置，不是加例外**：状态逻辑留 `stores`/`features`，常量下沉 `@core/constants`，UI 落 `components/ui` 或消费方 feature。⚠️ **「按字面语义归类」与「层级纪律」冲突时后者优先**（`plantumlEncoder` 字面像 utils，但依赖 L1 → 落 L0 即新增 `utils→core` 越权边）。

## 专题铁律（细节见 artifacts / 每日日志）
- **首屏开屏动画**：落 `index.html` **内联层**（非 React 组件 —— 生产构建有 >500kB chunk，React 方案要等 bundle 下载+执行才出画面 ⇒ 长时间空白）；内联层 HTML 解析即渲染，与主包**并行**，**只遮盖加载不延长加载**。仅首次（`localStorage` 标记）；Handoff 用**双 rAF** 确保 React 首帧已合成再 `__mcSplash.done()`；`MIN_TOTAL` 保动画完整 + `HARD_CAP` 兜底防盖住错误页；动效只动 `opacity/transform/filter`。
- **动效语言**：分层 ⚡100–160／🚶150–250／🛋320–500ms；**外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**；reduced-motion =「更少更柔非归零」；指针门控只归零**纯位移/缩放型** hover，**复合 transform 必须豁免**。
- **浮层退场**（原语 `components/ui/usePresence`；时长常量须与 CSS 逐字对齐；`[data-exiting='true']` 必带 `pointer-events:none`）。命令面板／FileTree·Outline 展开／Tooltip hover-out／视图切换生效；Toast·Modal **有意不动**。
- **N · tab 滑动切 Tab**：Apple 分段控件，**滑块跟手、内容零位移**、方向=目标；hook 必传 `dampenOffset`(恒等)+`snapDecider`。⚠️ 白板**空白板引导锁定态**停用手势。R1–R3 旧法**已废弃勿回退**。
- **KB 面板**：subbar 52px。⚠️ `.aurora-kb-notes` 顶 padding 仅 2px 是为**自带 `__head` 的 Tab** 设计 → **无 head 的复用者必自带留白**（`__lead`）。⚠️ 空库不渲染 tab 栏、建库后**不自动进详情**。

## 待办（全文见 `artifacts/TODO-cleanup-audit-2026-09-17.md`）
🔴 **死 CSS**：`injectCanvasTheme()` 零调用点 ⇒ `.tl-container`/`.canvas-v2-root` 皆无 DOM，其 25 个 `--cv-*` 未定义却被 8 个 canvas-v2 文件**无 fallback** 消费；修法 = 改挂 `:root`。⚙️ `themes/newThemes.ts` **22752 行** → 按主题拆分。
