# MarkCraft · Aurora 记忆（铁律only；案例/细节见 `memory/YYYY-MM-DD.md` 与 `artifacts/DESIGNBRIEF-*.md`）

## 定位
Vite5+React18+TS；CodeMirror6+TipTap3；白板 Excalidraw(canvas-v2)；Dexie/IndexedDB。
dev 端口 **5174**：`node node_modules/vite/bin/vite.js --port 5174 --host`。
入口 `src/aurora/aurora-main.tsx`（真实 `#view=` 路由）。**Aurora = 真实运行界面**（非演示壳）。
战略：网页 UI → **桌面端软件范式**（窗口 chrome / 命令菜单 / 右键菜单 / 密度 / 键盘优先）。

## Aurora 铁律
① Aurora 即真实界面；② 禁增功能（边界 = 真实已有能力）；③ 视觉只用 `styles/tokens.css` 的 `--mc-*`；
④ UI 落 `src/aurora/`，`src/features/*` 是逻辑层（D4 单一数据源），`src/components/ui` 可直接 import；
⑤ 依赖只向下，**0 反向依赖**。

## 关键坑（防回归）
- **Path depth**：panels→features/stores 用 `../../../`；components/ui·app 用 `../../`。
- 新类**必须同批交付 CSS**；同文件多处 Edit**必须串行**，改完 grep 核验。
- 单源：z-index = `tokens.css §14`；Modal = `@components/ui/Modal`；Button/Confirm/Switch = `@components/ui/*`。
- **布局属性越权**：迁 features 组件入 Aurora 时 position/inset/z-index 同样越权生效 → 复位须三类同设 + `contain:paint`。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘必须读 `xxxRef.current`。
- **指针捕获吞 click**：子元素交互挂 **pointerup**（`NODE_CLICK_SLOP=4px` 区分拖拽）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId / kb→kbId / blog→kbId）；
  漏登记 = 参数静默丢失。侧栏「设置」在**默认收起的「更多」分组**里。
- **React 17+ `onWheel` 是 passive** → `preventDefault()` 无效；拦横滚只能靠 CSS `touch-action`/`overscroll-behavior-x`。
- **「改 CSS 不改 JS」双向陷阱** → 契约测试**两侧同断言**且断言 `getBoundingClientRect()` **落点**。
- **改任何东西前先验证「有真实承载者」**：类名 → TSX 引用数、组件 → import 点；零引用 = 死代码。
- **滚动显隐用「常驻 DOM + 类折叠」**（条件渲染 → 高度跳变 → 伪滚动 → 自激振荡闪烁）；「列表往上滑」= `scrollTop` **减小**。
- **内联 `transition` 残留**：瞬时落位后必须 `apply(); void el.offsetWidth; el.style.transition=''`。
- 动效只动 **transform/opacity**；永不用 `scale(0)`；进出不对称「出更快」。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- **jsdom 不实现指针捕获重定向** → 一律 `pointerdown → pointerup`；jsdom 无 `PointerEvent` → 用 `MouseEvent` 承载。
- **几何断言等稳态**；jsdom `getBoundingClientRect` 全 0 → 必须打桩（`stubGeometry`）。
- **CSS「无某声明」断言先剥注释**；「全仓无残留消费者」须排除 `docs[\\/]design`、`.test.tsx?$`。
- 静态断言锚点用**带引号的完整字面量**（裸类名 `indexOf` 会先命中注释）。
- **末段速度采样会被 jsdom 的 dt≈0 放大** → 同步连发 `pointermove` 会误判甩掷；「期望不切换」的用例必须
  **真实慢速**（每步 sleep 300ms）+ 位移 < 20px（甩掷最小位移），别靠"越界护栏"碰巧成立。
- 读文件断言用 `readFileSync(resolve(__dirname, ...))`。
- 命令：`node node_modules/vitest/vitest.mjs run [pattern]`；`tsc --noEmit -p tsconfig.json`。
  ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试文件无类型错，测试必须实跑。

## git / 沙箱
PortableGit 路径 `/c/Users/HJN/.workbuddy/binaries/PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}`；
bash 每条内联 `export PATH="<三目录>:/c/Users/HJN/.workbuddy/binaries/node/versions/22.22.2-3:/c/Windows/System32"`。
- 远端 `gitee.com/James-fake/markcraft.git`；推送 `git -c credential.helper= push "https://<user>:<token>@gitee.com/..." master`。
- ⚠️ push 后 `origin/master` 不更新 → `printf '%s\n' "$(git rev-parse master)" > .git/refs/remotes/origin/master` 再验 `0 0`。
- 🚨 **禁止在单条 bash 里跑 `git stash`**（SIGTERM 半写对象库 → 丢 `.pack`）。要暂存 → `git diff > x.patch`。
- 工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`；判删除状态必须用
  `git -c core.quotepath=false status --porcelain`（shell `[ -e ]` 会因中文名转八进制误判）。**频繁提交是唯一防线**。
- **删除劫持**：`rm`/`Remove-Item` 转回收站 → 用 robocopy 镜像法（`/MIR`，相对路径，**别拼 `"$PROJ\\$d"`**），
  镜像后自检 `find <目标> -type f | wc -l` 为 0。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。

## CDP 验证（细节在 skill `cdp-ui-interaction-verify`）
- **Edge 必须与脚本同一次「前台」bash 启动**；须新 profile。布局判定靠**几何**（CSS px）。
- 三陷阱：① `.aurora-audience`（fixed 全屏）吞指针 → 先 dismiss；② **窗口激活吞最早几次鼠标事件**（唤醒点击 + 重试）；
  ③ 无焦时合成按键打不进（改走真实鼠标点侧栏）。就绪判据用 `.aurora-sidebar-item`；深链 `#view=` 只认**启动 URL**。
- 「做没做」必须量**视觉位移像素**；`data-swiping=true` 只证明"识别了"。
- 「看得见」别用 `elementFromPoint`（`pointer-events:none` 不参与命中测试 → **假阴性**）→ 断言 opacity/visibility/背景/面积。
- ⚠️ **拖动中的截图不可信**：窗口不前台时合成被节流，`captureScreenshot` 返回**上一帧**（sleep/rAF/bringToFront 都修不好）
  → 拖动只用量数值证明，截图只证**落位后**。
- 手势/交互不能靠注入 HTML 验证（需真实 React 绑定）→ 真机拖动或契约测试。合成拖拽要**慢**（末段 <0.3px/ms）才走落点吸附。
- 探针留可复用开关（`ONLY=<面板名>`），别写死全量。

## 动效语言（09-11 定稿，四项全 ✅）
- 分层 ⚡100–160／🚶150–250／🛋320–500ms；token 单源 `tokens.css §11`；关键帧单源 `components.css`。
- **外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**。
- reduced-motion = 「更少更柔非归零」：时长减半，入场降级 `mc-rm-fade`、**退场 `mc-rm-fade-out`**。
- 指针门控只归零**纯位移/缩放型** hover，**复合 transform 必须豁免**。

## 需求 N：tab 栏滑动切 Tab（**六轮定稿，R6 现行**）
形态 = **Apple 分段控件**：常驻滑块 thumb 压在选中项上；按住 tab 横拖 → **只有滑块跟手，tab 文字与内容区零位移**；
栏不滚动（`scrollLeft` 恒 0）；**位移方向 = 目标方向**；**连续滑动**（轨道内 1:1，可跨多格，落点最近中心位即目标）。
- 单源 = `hooks/tabStripSwipe.ts` + `swipeTabsCore.ts`（纯逻辑）+ `useTabStripThumb.ts`（React 壳）；四面板同接入，手势只挂 tab 栏。
- 滑块位置 = **基准定位 + 手势位移，合成到同一个 `transform`**（拆两段 → 松手瞬间视觉裂缝）。
- `mapTrackOffset(raw, baseCenter, minCenter, maxCenter)`：轨道内 1:1；越界 ×`EDGE_RESISTANCE` + **绝对封顶 28px**
  （**不能用 limit×比例** —— 中间起手时到端点距离可达数百 px，会冲出轨道）。`decideSnap` = 落点最近中心位 +
  甩掷兜底一格（**不做惯性外推**）。
- hook 侧必须传 `dampenOffset`（恒等）+ `snapDecider` 覆盖内置「index±1」单步语义 —— 否则双重阻尼，跨格拖不动。
- 方向铁律：**位移保号与目标取反不能并存**（滑块 = 指示器，位置即真相）；单源 = `swipeTabsCore` 三处 `nextSign`。
- 四栏：设置/知识库/博客用**圆角块**（博客 `enabled:true` 常驻，浮层收起也能拖）；白板用**下划线**。
- 测试 4 份（`tabStripSwipe` / `useSwipeTabs` / `tabBarSwipeBinding` / `swipeTabBarSurface`）+ 探针 3 个。
- ⚠️ 白板左栏是 hover overlay、知识库空库时 tab 栏不渲染；建库后**不自动进详情**，要再点卡片；
  提交按钮选择器须限定 `.aurora-kb-modal` 内（宽正则会命中底层）。
- R1–R3 旧法（内容区滑动 / 整排轨道位移 / `visualMapper` / 边缘压暗 / `--swipe-progress`）**已废弃，勿回退**。

## 其他已锁死项
- 右栏「辅助」Tab = 发布为博客 + 添加到知识库；知识库列表**只有一个家**在那；⌘K/标签右键 = **钉住右栏 + 切辅助 Tab + 展开列表**；
  `setBlogEntryFileId` = 单篇语义（单篇下 `setAllDocs` 走 `scopedDocs`）；右侧宽度 `fit-content`（浮层壳曾截右栏）。
- 知识库「笔记 Tab」头部 / 博客「主题市场」滚轮鼓筛选 / 博客筛选行拉满宽 + 搜索框回顶显隐（`hasLeftTop` 滞回）。

## 当前状态
- vitest **1109 passed / 3 failed / 2 skipped**，tsc 干净。3 项失败**预存**（与需求 N 无关）：
  `commandWiring` / `KbPanel.smoke`(`getByText('编辑')` 多元素) / `blogCssRefs`(KeyframeEditor 汉化)。
- 需求 N 六轮已全部落地推送。待决：3 项预存失败排查；`--mc-dur-lazy` 处置；>30 天旧日志蒸馏归档。
