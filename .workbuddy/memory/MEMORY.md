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
- ⚠️ **断言字体类判据不能写「不含某字体名」**：「--mc-font-sans」首项就是 `'Inter'`，且其**运行时真值在第二层 `:root`**（desktop-chrome.css:62 = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` ≠ tokens.css:103 字面值）⇒ 判据只能是「归一化后 == CSSOM 真值」。
- **caveat：`var(--x, <兜底>)` 死兜底 vs 旧 palette 色值**：`--mc-bg-panel` 其实**有定义**（desktop-chrome.css 第二层，暗 `#14161F`／浅 `#FFFFFF`）⇒ versionHistory.css 的 `#f7f7f8` 是**死兜底不是白卡**；而 `--katex-error-color`／`--blockquote-border` 属 base.css `:root` 的**旧 palette 色值**（后者=`#3b82f6` ⇒ 归 §7 蓝色轴）。
- 层级带新增登记：**1095 编辑器遮罩式抽屉组**（版本历史 backdrop **1090** / drawer **1091** / 确认 mask **1095**；落 1000 与 1500 空档，`1100` 已被 kb-ui 占用）。

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
- 🚨 **等 `#aurora-root` 是假绿**（它写在 index.html 里、永远存在）⇒ 必须等「**其内部有内容**」`children.length > 0`。探针步骤 1 还要先判「**是否已有打开的文件**」（`.aurora-tab`）：空库=空态（`.aurora-editor__empty` + `.aurora-editor__newfile-btn`），会话恢复后已有标签页。
- 🚨 **审计脚本判据缺锚点 = 假阳性工厂**：判「旧变量是缺陷」不能只查「是否在重映射表」⇒ 必须三锚点（重映射 / **别处有定义位** / 真·未定义）。定义位收集**必须排除 `getPropertyValue`/`removeProperty`**（读≠写）；TS 侧计算键 `['--x' as string]:` 也要认。本轮据此把 22 处「真缺陷」全部改判为假阳性（真缺陷 0）。
- 🐛 **既有缺口（未修）**：`TiptapEditor.tsx` 的 `modalsValue` 里 `onOpenFrontMatter: () => {}`（同处 `onOptimizeImages`/`onUploadImage`）⇒ **WYSIWYG 模式「文章元信息」无响应**，只有源码模式（CodeMirrorEditor.tsx:316）接线；取证须先切 `.aurora-mode-toggle[title^="源码"]`。

## git/沙箱
PATH：`PortableGit/1.2.0/{cmd,usr/bin,mingw64/bin}`+`node/22.22.2-3`+`System32`。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 内联 `node -e`/`bash -c` 禁反引号（`${}`/`$()` 同理）→ 长脚本写 `.cjs` 用完删。
- 🚨 `credential.helper=helper-selector` 弹窗挂死 ⇒ 裸 `git push` 被 SIGTERM 静默杀、远端没更新；正解 `.git/config` 手写 `helper=`（空值）+`helper=wincred`；无头保险 `scripts/push-gitee.cjs`。
- ⚠️ 暂存/提交显式 pathspec 禁 `git add -A`；单条 bash 禁 `git stash`。
- 🚨 **浮层皮肤回归锁的扫描面必须含「浮层 import 的子模块」**：上轮修好 `MindmapPopover` 却漏掉
  `mindmapTemplates.tsx`（宿主干净、子模块仍用 `--editor-*` + 老蓝）⇒ 只断言宿主文件 = 假绿。
- 🚨 **z-index 魔数是独立于颜色的第二条缺陷轴**：4 个颜色已合规的下拉用内联 `9999` 顶掉了
  `.aurora-dropdown` 的 1000。取值只认 `tokens.css:242-261` 的带表（锚定浮层 1000 / 模态 3000 /
  命令 9000 / ctxmenu 10030）。
- ⚠️ **统计「旧变量/字面量」必须先排除两类假阳性**：① `--button-primary`（`base.css:25` = `var(--mc-accent)`，
  在 `:root` 解析、全局一致）不是隐患；② `var(--x, #hex)` 是死兜底（x 已定义则永不生效），
  与裸字面量 `'#hex'` 的严重性完全不同。
- 🚨 **逃逸机制的实测真像（CDP 证伪）**：「portal 到 body 后 --editor-* 未定义」是错的 —— base.css 在
  :root 就定义了它们，值 = 旧 slate（--editor-bg=#0f172a）。逃逸不是「落 CSS 兜底」，而是**静默命中旧值**
  ⇒ 判据只能是「同变量在 #aurora-root 内外取值不同」（CDP 实测：域外 rgb(15,23,42) / 域内 rgb(16,18,24)）。
- 🚨 **第三条缺陷轴：跨作用域共享子组件**。NoteHoverCard.tsx 被 3 处消费（cm6/wikiLinkHoverTooltip 用
  createRoot 挂 body = 完全逃逸 ⇒ 暗色主题下白卡；另有 NoteContextPanel / CanvasSidebarPanel）⇒ 只查
  「浮层本体」必漏，须沿 import 图查每个子模块的**全部消费方挂载点**。同族单源类：锚定 .aurora-dropdown
  (1000) / 模态 .aurora-modal-overlay(3000，深色遮罩用 --dim 变体) / 命令 .aurora-command*(9000)。
- ⚠️ 大文件（WysiwygToolbar.tsx 宿主自身在作用域内合法用 --editor-*）无法整文件进守卫 ⇒ 守卫须支持
  **片区锚点**（[start, end) 切出只迁移了局部浮层的片段），否则要么漏扫、要么误报。
- ⚠️ 守卫要有牙：写完必须做**注入式阳性对照**（临时塞 --editor-bg + zIndex:9999 跑红再还原）；
  「全绿」本身不是证据。守卫 = src/features/editor/toolbar/portalOverlayBasis.test.ts（**91 例 / 12 浮层 + 层级带**）。
- 🚨 **守卫三条盲区（本轮补齐）**：① **CSS 侧 `z-index` 也必须入表** —— 原守卫只扫 TSX，`versionHistory.css`
  的 1090/1091/1095 长期裸奔；正解：新增「层级带契约 · CSS 侧」用例，把 `z-index` 取值全集与允许集比对，
  并做「值 ↔ 表」双锚点（读**未剥注释**的 tokens.css 断言含该值）。② **规则要片区感知**：宿主文件自身
  在 `#aurora-root` 作用域内合法用 `--editor-*`（WysiwygToolbar）⇒ 规则⑥须支持 `scope:[start,end)`
  切片，否则要么漏扫要么误报。③ **自持 fixed 浮层（非 portal）也在逃逸面**：`EditorLayout.tsx` 的
  `.aurora-toast-container` 用内联 `position:fixed` 自持，不走 createPortal 却同样脱离根作用域 ⇒
  盲区台账须按「是否逃出根作用域」而非「是否 createPortal」列项。
