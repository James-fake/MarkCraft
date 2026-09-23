# MarkCraft · 铁律
> 细则/事故/探针 → `memory/YYYY-MM-DD.md`、`artifacts/`、`TOPICS.md`（动对应模块前先读）。

## 定位与分层
Vite5+React18+TS、CodeMirror6+TipTap3、Excalidraw、Dexie/IDB。dev **5174**。唯一入口 `src/aurora/aurora-main.tsx`（真实 `#view=` 路由）。
① 视觉只用 `--mc-*`；② 禁增功能；③ UI 三层：壳 `aurora/`、通用 `components/ui`、业务 `features/*`；④ 依赖只向下，底座向上=0。

## 状态层 FileStore（数据丢失级）
- 🚨 两阶段初始化（`loadState` 造 T0 → `loadStateAsync` 用 IDB 整体覆盖）⇒ **`hydrated` 是程序化写入唯一闸口**，`saveState` 须 `if(!hydrated)return`。
- 🚨 写操作一律 `setState(prev=>…)` 累积；快照整树替换会覆盖同批次 updater、静默丢节点（锁 `FileStore.batch.test.tsx`）。
- 🚨 updater 不同步跑（仅「急切求值」一次）⇒ updater 内写外部 `let` 再读 = 隐藏 bug（队列非空才暴露）；修法：新状态同一 updater 一次算完。
- ⚠️ 别名表 4 处（tsconfig/vite/vitest/vite.smoke）须同改（守卫 `src/aliasSync.test.ts`）；新类须同批交付 CSS；同文件多处 Edit 串行；改完逐文件 grep。

## 视觉 / token（细则 TOPICS.md）
- 🚨 **portal 浮层（createPortal→body）逃出 `#aurora-root` 作用域**：重映射 `--editor-*`→`--mc-*` 的那层**只写在 `#aurora-root{}` 内** ⇒ 浮层里 `--editor-*`/`--hover-bg`/`--code-bg` 静默回落旧 slate + 旧蓝 = **「最旧一版 UI」**。正解：浮层加 `className="aurora-dropdown"` 复用单源基底（材质/边框/圆角/阴影/z-index 1000），内部**只引用全局 `--mc-*`**，行用 `aurora-dropdown__item`。锁 `portalOverlayBasis.test.ts`。
- 🚨 **`--mc-*` 运行时真值由第二层 `:root`（`src/styles/desktop-chrome.css`）决定**（`bg-elevated #1A1C24`／`border-subtle #292E30`／`text-primary #E6E8EF`，与 `tokens.css` 字面值不同）⇒ token 断言/探针**读 CSSOM 真值，禁抄字面值**。
- ⚠️ 文件头注释先探 BOM；回写保真 EOL（仓混 CRLF/LF）→ 拆 `/\r?\n/` 原 EOL 回写。

## UI 交互（细则 TOPICS.md）
- 🚨 可点暗示与 handler 同源：可交互性由有无 `onClick/onSelect` 派生；SVG/画布恒 `cursor:pointer` 无 handler = 哑节点。
- 🚨 同款类名多容器→交互漂移 ⇒ 抽单源；探针须按容器限定选择器、逐容器断言（`querySelectorAll()[0]` 会测到另一列表→全绿仍报障）。
- 🚨 **同名入口散布多工具栏**（`title="更多"` 源码/WYSIWYG 各一个，其一隐藏 rect 高 0）⇒ 探针须按**可见性 + 所属工具栏**限定，否则点了隐藏那个、症状酷似「产品坏了」。
- 🚨 滑动吃尾随 click 判据只可「真换目标」非「有位移」；非激活按压不得残留手势态（准入 `(e.buttons&1)===0→return`）。
- 视图上下文单源 = `useAuroraShell.nav` 映射；漏登记=参数静默丢。
- **高亮／下划线 = split button 家族**：主按钮/快捷键/右键菜单＝「应用上次色」，只有显式挑色才改写上次色 ⇒ 改任一处三处对齐；调色板**居中于按钮正下方**（`useDropdownPosition` 须传 `align:'center'` **且必传 `panelRef`**）。

## 验证链路（七条）
① `tsc --noEmit -p tsconfig.json` ② `vitest run` ③ eslint guard ④ `node scripts/_depgraph.cjs` ⑤ `vite build` ⑥ 真机 CDP ⑦ 文件集合差。③④⑥ 细则 TOPICS.md。

## 测试/真机 高压线
- ⚠️ tsconfig 不含 `*.test.*` ⇒ tsc 干净≠测试无类型错；`vitest -t <s>` 正则含 `*` 全 skip 假绿。
- ⚠️ 夹具显式种入被测数据且幂等；空态显式 `closeAllTabs()`；一条断言只证一事。
- 🚨 零命中/零错误 须先证「扫描面非空」+ 跑 HEAD 阳性对照；对照选择器须实现无关（用修复后才存在的类名=假阳性）。
- 🚨 **「全量跑」与「临时还原 HEAD 做对照」不可并发** ⇒ vitest collect 期会读到 HEAD 源码、产出**假失败**（本轮实测）；判 flaky 用隔离复跑。
- 🚨 合成输入：预热点**真实文本块**、确认 `visibilityState==='visible'`（hidden 时 `bringToFront`）；「点击无反应」须**双路取证**。
- 🚨 探针**禁整页 reload**（renderer 僵死：能连但每条 eval 超时且不恢复）⇒ 改 `PUT /json/new?about:blank` + **先注入 `__bootAt` 再导航**；`send()` 须带超时 + 进度落盘，否则静默挂死。

## git/沙箱
PATH：`PortableGit/1.2.0/{cmd,usr/bin,mingw64/bin}`+`node/22.22.2-3`+`System32`。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 内联 `node -e`/`bash -c` 禁反引号（`${}`/`$()` 同理）→ 长脚本写 `.cjs` 用完删。
- 🚨 `credential.helper=helper-selector` 弹窗挂死 ⇒ 裸 `git push` 被 SIGTERM 静默杀、远端没更新；正解 `.git/config` 手写 `helper=`（空值）+`helper=wincred`；无头保险 `scripts/push-gitee.cjs`。
- ⚠️ 暂存/提交显式 pathspec 禁 `git add -A`；单条 bash 禁 `git stash`。
