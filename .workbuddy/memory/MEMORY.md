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

## UI 交互（细则 TOPICS.md）
- 🚨 可点暗示与 handler 同源：可交互性由有无 `onClick/onSelect` 派生；SVG/画布恒 `cursor:pointer` 无 handler = 哑节点。
- 🚨 同款类名多容器→交互漂移 ⇒ 抽单源；探针选择器须按容器限定、逐容器断言（`querySelectorAll()[0]` 会测到另一列表→全绿仍报障）。
- 🚨 滑动吃尾随 click 判据只可「真换目标」非「有位移」；非激活按压不得残留手势态（准入 `(e.buttons&1)===0→return`）。
- ⚠️ 文件头注释先探 BOM；回写保真 EOL（仓混 CRLF/LF）→ 拆 `/\r?\n/` 原 EOL 回写。
- 视图上下文单源 = `useAuroraShell.nav` 映射；漏登记=参数静默丢。
- **格式工具栏「高亮／下划线」= split button 家族**：主按钮/快捷键/右键菜单三入口同语义＝「应用上次色」，
  只有面板里显式挑色才改写上次色 ⇒ 改任一处必须三处对齐；色表单源 `extensions/highlightColors.ts`。
  调色板定位＝**居中于按钮正下方**（`useDropdownPosition` 须传 `align:'center'` **且必传 `panelRef`**）。
  下划线改**前景色**须用不透明 hex；`auto`＝真的跟随正文（判据是 decoColor===父级 color）。细则 TOPICS.md。

## 验证链路（七条）
① `tsc --noEmit -p tsconfig.json` ② `vitest run` ③ eslint guard ④ `node scripts/_depgraph.cjs` ⑤ `vite build` ⑥ 真机 CDP ⑦ 文件集合差。③④⑥ 细则 TOPICS.md。

## 测试/真机 高压线
- ⚠️ tsconfig 不含 `*.test.*` ⇒ tsc 干净≠测试无类型错；`vitest -t <s>` 正则含 `*` 全 skip 假绿。
- ⚠️ 夹具显式种入被测数据且幂等；空态显式 `closeAllTabs()`；一条断言只证一事。
- 🚨 零命中/零错误 须先证「扫描面非空」+ 跑 HEAD 阳性对照；对照选择器须实现无关（用修复后才存在的类名=假阳性）。
- 🚨 合成输入：预热点**真实文本块**、确认 `visibilityState==='visible'`（hidden 时重新 `bringToFront`）；「点击无反应」须**双路取证**。
- 🚨 探针**禁整页 reload**（renderer 会僵死：CDP 能连但每条 eval 超时且永不恢复）⇒ 改
  `PUT /json/new?about:blank` 新建目标 + **先注入 `__bootAt` 再导航**（比 reload 更强的冷启动证据）；
  探针 `send()` 必须带超时 + 进度落盘，否则静默挂死且日志随 stdout 缓冲蒸发。细则 TOPICS.md。

## git/沙箱
PATH：`PortableGit/1.2.0/{cmd,usr/bin,mingw64/bin}`+`node/22.22.2-3`+`System32`。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 内联 `node -e`/`bash -c` 禁反引号（`${}`/`$()` 同理）→ 长脚本写 `.cjs` 用完删。
- 🚨 `credential.helper=helper-selector` 弹窗挂死 ⇒ 裸 `git push` 被 SIGTERM 静默杀、远端没更新；正解 `.git/config` 手写 `helper=`（空值）+`helper=wincred`；无头保险 `scripts/push-gitee.cjs`。
- ⚠️ 暂存/提交显式 pathspec 禁 `git add -A`；单条 bash 禁 `git stash`。
