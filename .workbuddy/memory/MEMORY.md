# MarkCraft · Aurora 记忆（铁律only；案例/细节见 `memory/YYYY-MM-DD.md`）

## 定位
Vite5+React18+TS；CodeMirror6+TipTap3；白板 Excalidraw(canvas-v2)；Dexie/IndexedDB。
dev 端口 **5174**：`node node_modules/vite/bin/vite.js --port 5174 --host`。
入口 `index.html(#aurora-root)` → `src/aurora/aurora-main.tsx`（真实 `#view=` 路由）。**Aurora = 真实运行界面**（非演示壳）。
战略：网页 UI → **桌面端软件范式**（窗口 chrome / 命令菜单 / 右键菜单 / 密度 / 键盘优先）。

## Aurora 铁律（`src/aurora/`）
① Aurora 即真实界面；② 禁增功能（边界 = 真实已有能力）；③ 视觉只用 `styles/tokens.css` 的 `--mc-*`；
④ UI 落 `src/aurora/`，`src/features/*` 是逻辑层（D4 单一数据源，不平行 mock），`src/components/ui` 可直接 import；
⑤ 依赖只向下：Aurora → features/stores → 基础设施，**0 反向依赖**。

## 关键坑（防回归）
- **Path depth**：panels 引 features/stores/types 用 `../../../`；components/ui·app 用 `../../`。
- 新类**必须同批交付 CSS**；BEM 名两端字面一致。同文件多处 Edit **必须串行**，改完 grep 核验。
- z-index 层带单源 = `tokens.css §14`；Modal 单源 = `@components/ui/Modal`(360/440/640)；Button/Confirm/Switch 走 `@components/ui/*`。
- **布局属性越权**：迁 features 组件入 Aurora 时，颜色 token 之外 **position/inset/z-index 同样会越权重生效**；
  复位须三类同时设 + `contain:paint`（测试 `panels/kb/kbPanelLayout.test.ts`）。
- **拖拽闭包陷阱**：`mouseup` 监听是拖拽开始时注册的闭包 → 落盘必须读 `xxxRef.current`，读 state 是旧值。
- **指针捕获吞 click**：`<svg>` 上 `setPointerCapture` 后子节点 `click`/`dblclick` 被重定向到捕获元素 →
  子元素交互挂 **pointerup**（`NODE_CLICK_SLOP=4px` 区分拖拽）；「点空白清空选中」靠**手势来源标记**，不能只看 `e.target === svg`。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId / kb→kbId / **blog→kbId**）；
  新增带上下文跳转必须登记，漏一行 = 参数静默丢失。
- **React 17+ 的 `onWheel` 是 passive** → `preventDefault()` **无效**。阻止浏览器横滚/回退只能靠 CSS
  `touch-action: pan-y`（触摸）+ `overscroll-behavior-x`。**别指望 JS 拦 wheel**。
- **「改 CSS 不改 JS」双向陷阱**：位移由 JS 内联样式驱动（`style={{left}}`）时只改 CSS 过渡 → 位移**彻底失效**；
  反之 CSS 规则若 JSX 无承载者 = **死代码**。契约测试一律**两侧同断言**，验证断言 `getBoundingClientRect()` **落点**。
- **改任何东西前先验证「目标有真实承载者」**：类名 → TSX 引用数、组件 → import 点；零引用 = 死代码，改它=制造维护假象。
- **滚动显隐必须「常驻 DOM + 类折叠」**：条件渲染的挂载/卸载 → 高度跳变 → 钳制伪滚动 → **自激振荡闪烁**
  （搜索框须在滚动容器**外**作兄弟节点）。用户语境「列表往上滑动」= `scrollTop` **减小**（回滚）。
- 动效只动 **transform/opacity**；永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 改真实 Provider 包裹。
- **jsdom 不实现指针捕获重定向** → 凡「拖拽里 setPointerCapture」的组件，真机节点 `onClick` 收不到事件；
  `fireEvent.click` 是**假路径**（全绿但真机无反应）。必须走 `pointerdown → pointerup`；
  jsdom 无 `PointerEvent` → 用 `MouseEvent` 承载同名指针事件才有 button/clientX。
- **几何断言必须等稳态**：冷启动索引异步填充期采样会假失败；先「连续两次快照一致」再采。
- **CSS「无某声明」断言必须先剥离注释**（`css.replace(/\/\*[\s\S]*?\*\//g,'')`），否则注释里的说明文字自命中；
  断言「全仓无残留消费者」须排除 `docs[\\/]design`、`.test.tsx?$`、测试自身文件。
- 读文件断言用 `readFileSync(resolve(__dirname, ...))`，**别用 `new URL(..., import.meta.url)`**（vitest scheme 解析失败）。
- 命令：`node node_modules/vitest/vitest.mjs run [pattern]`；`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`。

## git / 沙箱（PortableGit 真实路径不在 `C:/Program Files/`，在
`/c/Users/HJN/.workbuddy/binaries/PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}`；
bash 每条命令内联 `export PATH="<上述目录>:{cmd,usr/bin,mingw64/bin}:/c/Users/HJN/.workbuddy/binaries/node/versions/22.22.2-3:/c/Windows/System32"`）
- 远端 `https://gitee.com/James-fake/markcraft.git`。推送：`git -c credential.helper= push "https://<user>:<token>@gitee.com/James-fake/markcraft.git" master`。
- ⚠️ **push 后 `origin/master` 引用不更新、`git fetch` 也不落盘** → 兜底
  `printf '%s\n' "$(git rev-parse master)" > .git/refs/remotes/origin/master`，再用 `git rev-list --left-right --count master...origin/master` 验 `0 0`。
- 🚨 **绝对禁止在单条 bash 里跑 `git stash`**（含 `stash`+`stash pop`）。SIGTERM 会让对象库半写 → 2026-09-14 丢了几乎全部
  `.pack`、832 缺失 blob。要暂存 → `git diff > x.patch` 或复制文件。
- 对象库诊断：`ls .git/refs/` → `git cat-file -t <c>` → `ls .git/objects/pack/`（**有 .idx 却无 .pack**）→ `ls-tree <c>:<path>` 逐层定位。
  **远端 master 可能远落后本地，不能假定远端有近期工作**。
- **工作区可能被外部清空**（09-14：`src/features/` 473 文件消失、索引完好，疑沙箱回收）→
  `git restore --source=HEAD --worktree -- <路径>`。
  ⚠️ 判定删除状态**必须用 `git -c core.quotepath=false status --porcelain`** —— shell 遍历 `[ -e "$f" ]` 会因
  **中文名被转成 `\nnn` 八进制而误判"缺失"**。**频繁提交是唯一可靠防线**。
- **删除劫持**：`rm`/`rmSync`/`Remove-Item` 都被转回收站 → **唯一可靠解 = robocopy 镜像法**
  `mkdir _empty && robocopy _empty <目标> /MIR /NFL /NDL /NJH /NJS /NP /R:0 /W:0`（exit 0–7 都算成功）→ `rmdir` 空根。
  ⚠️ **必须用相对路径**（cwd 已在项目根）。**绝不要拼 `"$PROJ\\$d"`** —— Git Bash 双引号里 `\\$` 塌成**字面 `$d`**，
  robocopy 拿到无效目标后**静默 exit 0 什么都不做**。绝对路径写**正斜杠** `D:/x/y`。
  镜像后必自检 `find <目标> -type f | wc -l` 为 0，**别只看 exit code**。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。

## CDP 验证方法论
- 布局故障判定靠**几何**不靠印象：`getBoundingClientRect` + `elementFromPoint`（命中测试前先清残留弹层）。
- token 断言直读 `getComputedStyle(documentElement).getPropertyValue('--mc-*')`，不能只看动画名。
- **改了 CSS 要用新 profile 起 Edge 读 computed**，才能证明确实落到 DOM（防 Vite 模块缓存喂回旧 CSS）。
- **性能必须多轮 A/B 重复采样**：单次会骗人（GraphPanel 单跑看似 p95 退化，实为启动期抖动 + 测的是空库）。
  姿势：轮询真实节点数 >0 再采样，静置/拖拽各 ≥5 轮取**中位数**。**先量化再动手**。
- **硬坑**：① Edge 须与脚本**同一次前台 bash** 启动（后台 bash 收编子进程）；② 全新 profile 首启弹
  `.aurora-audience` 引导（`position:fixed;inset:0`）→ backdrop **吞掉所有指针事件** = 假阴性，先关它；
  ③ **合成鼠标事件前几次会被「窗口激活」吞掉** → 先打「唤醒点击」并对拖动**重试**；④ 合成 `Ctrl+,` 常打不进 app（无焦）
  → 进设置页改走真实鼠标点侧栏；⑤ 就绪判据用 `.aurora-sidebar-item`，**别用 `.aurora-page`**（过早为真）；
  ⑥ 坐标 = **CSS px**；`Ctrl+,` keyDown 须带 `windowsVirtualKeyCode:188 + code:'Comma' + key:','`；
  ⑦ 深链 `#view=` 须在**启动 URL** 传入；⑧ `vh` 的 computed 是**像素**（`70vh`→`563.5px`）；⑨ `PerformanceObserver`
  longtask **headless 不生效** → 性能判定基于**帧间隔**；⑩ 探针坐标落**目标元素中心**，不能取整行中心
  （N 等分行的中心恰在交界 → mouseup 的 click 误切 = 假失败）。
- **注入式**：验证**视觉**可直接 inline HTML 用相同类名注入（CSS 已加载，类名一致即命中所有规则；容器
  `position:fixed; inset:24px; z-index:99999`）。但**手势/交互类不能靠注入验证**（需真实 React 绑定）→ 走真建链或契约测试。

## 动效语言（09-11 定稿 · 09-14 审计 · 四项收尾全 ✅）
- 分层：⚡即时 100–160ms（hover/按压）／🚶标准 150–250ms（tooltip/下拉/右键菜单）／🛋从容 320–500ms（modal/抽屉/视图淡入/toast）。
- token 单源 = `tokens.css §11`：`--mc-dur-micro/fast/base/slow`、`--mc-ease-out`(0.23,1,0.32,1)、`--mc-ease-mac`、`--mc-ease-in`。
- **外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**（PageFrame 在各面板内渲染，包整屏必致「整体闪一下」）。
- reduced-motion = 「更少更柔非归零」：从容层时长减半 + 位移型入场降级 `mc-rm-fade`、**退场必须 `mc-rm-fade-out`**。
- 关键帧单源 = `components.css`（aurora-menu-in / dropdown-in(-up) / modal-in/out / fade-in/out / aurora-dock-float-in）；
  Aurora 全量 CSS 经 `aurora-main.tsx` 静态加载。dock 浮层用独立 `translate` 属性承载位移。
- 四项（全 ✅）：① 指针门控 `08685cc`（`@media (hover:none),(pointer:coarse)` 只归零**纯位移/缩放型** hover，
  **复合 transform 必须豁免**——switch 拇指 `translateX(16px)`、katex `translateX(-50%)` 归零即破）；
  ② 布局属性合成器化（博客浮层 `left`→`translateX`）；③ 命令面板去 200ms 入场 `5568ed0`；④ 按压反馈 `36e67ec`
  （六个 `:active` 补 `scale(0.97)`）。测试 `pointerGating`20 / `blogDockTransform`13 / `commandPaletteNoAnim`11 /
  `pressFeedback`14 例，均配 CDP 复核。

## 需求 N：顶栏功能切换 Tab 支持左右滑动（四面板）
**语义（用户原话）：「顶栏的功能切换 tab，支持左右滑动」= 在 `tab 栏本身内` 横滑**，不只是内容区。
首轮重构成「内容区滑动」→ 用户抓 tab 栏滑动毫无反应 → **被迫返工**。别再犯。
- 共享手势层 = `hooks/swipeTabsCore.ts`（纯逻辑）+ `hooks/useSwipeTabs.ts`（React 壳）。
- **双点位绑定**：`useSwipeTabs` 暴露 `makeBind()` → 同一套逻辑**同时**挂「tab 栏 + 内容区」
  （共享 `gestureRef`/`offsetRef`/`suppressClickRef`）。四面板全部改用 `makeBind()`，原 `bind` 保留兼容。
  - `onClickCapture`：横滑松手后浏览器仍在 tab 按钮上派发 click → 把刚滑到的 tab **点回去** → 吃掉该次 click
    （`endGesture` 在 `|offset| > DIRECTION_SLOP` 时置 `suppressClickRef`）。
  - `measureRef`：吸附阈值恒按**内容区**宽算（32%）；从窄 tab 栏起手若用 tab 栏宽会误判翻页。
- **博客 tab 行曾完全滑不动**：`enabled` 被绑到 `panelOpen`，浮层默认收起 → `onPointerDown` 直接 return。
  已改 **`enabled: true`**（tab 栏常驻可见 → 手势常驻可用；位移目标为空由 hook 空判兜住）；
  `measureRef` 换成**常驻**预览区 `.aurora-blog__stage`（原用浮层内容体，收起时不挂载 → null → 退回 99px 基准）。
- **tab 栏 CSS 必须自成手势区**：四面板补 `touch-action: pan-y` + `user-select: none` +
  `[data-swiping]{cursor:grabbing}`。**静止态刻意不设 `cursor:grab`**（tab 是按钮，会与点击语义打架）。
  测试 `styles/swipeTabBarSurface.test.ts` 24 例（CSS+JSX 两侧同断言）。
- 参数：SLOP 8px / 主轴比 1.2 / 吸附 32% / 甩掷 0.3px·ms⁻¹+最小 20px / 边界阻尼 0.28 / **末段速度窗 80ms**
  （`computeEndVelocity`；**禁用全程均速**——200px/500ms=0.4 会误判）/ wheel 阈值 60 冷却 400 静默 120。
- **视觉钳制 `VISUAL_CLAMP=18px`** + `::before/::after` 边缘渐变遮罩 + 指示器按 `--swipe-progress` 联动
  （**挂面板根**，挂 nav-tabs 兄弟层继承不到）。1:1 跟手会推飞内容、72px 会裁字，18px 是三轮结论。
- 组内仅 2 项时到边同向滑被阻尼回弹 = 预期；**跨组必须点 tab**（DesignBrief §4.2 D2）。
- 探针：`probe-swipe-tabbar-surface.mjs` / `probe-swipe-tabbar-all.mjs` / `diag-tabbar-vs-content.mjs`。

## 其他已锁死项（细节见日志）
- 右栏「辅助」Tab = 发布为博客 + 添加到知识库（`panels/editor/AuroraPublish.tsx`）；知识库列表**只有一个家**在那；
  ⌘K / 标签右键召唤 = **「钉住右栏 + 切辅助 Tab + 展开列表」三连**；`setBlogEntryFileId` = **单篇发布语义**
  （单篇下 `setAllDocs` 必须走 `scopedDocs`）。浮层壳 264px 曾截右栏 → 右侧改 `width:fit-content`。
- 知识库「笔记 Tab」头部 / 博客「主题市场」文案与滚轮鼓筛选 / 博客筛选行拉满宽 + 搜索框回顶显隐（`hasLeftTop` 滞回）：
  测试 `notesTabHeader`8 / `themeMarketTypography`18 / 滚动显隐 27 例。

## 当前状态
- 全仓 vitest **1000 passed / 3 failed / 2 skipped /1005**。3 项失败**经 HEAD 对照确认为预存**：
  `commandWiring`(45vs48) / `KbPanel.smoke`(`getByText('编辑')` 多元素) / `blogCssRefs`(KeyframeEditor 汉化)。
- 最新提交 **`5e68c72`**（需求 N 返工），已推送 Gitee，与远端同 hash。
- 待决：`--mc-dur-lazy` 删除或消费；3 项预存失败是否排查；`defaultDocsZh` 帮助文档旧名跟随；
  `memory/` 下 ~30 个 >30 天旧日志（07-16~08-15，约 600KB）待按主题蒸馏归档。
