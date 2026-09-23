# MarkCraft · 铁律
> 细则/事故过程/探针 → `memory/YYYY-MM-DD.md`、`.workbuddy/artifacts/`、skill `cdp-ui-interaction-verify`。
> **本文件只留高频铁律（避免注入时被截断）；全部「细则版」铁律 + 专题不变式 → `memory/TOPICS.md`**（编辑器 chrome·返回按钮／内置使用文档／双链图谱／KB 面板／动效／tab 滑动／死代码／博客清单／哑节点／测试夹具／CDP 探针／验证链路／git 与沙箱／解耦），动到对应模块前先读。

## 定位与分层
Vite5+React18+TS、CodeMirror6+TipTap3、Excalidraw（tldraw 退役）、Dexie/IndexedDB。dev **5174**。**唯一入口 `src/aurora/aurora-main.tsx`**，真实 `#view=` 路由。**Aurora = 真实运行界面**；战略 = 网页 UI → 桌面软件范式（窗口 chrome／命令菜单／密度／键盘优先）。
① 视觉只用 `styles/tokens.css` 的 `--mc-*`；② 禁增功能（边界 = 真实已有能力）；③ UI 三层：壳层 `aurora/`、通用 `components/ui`、业务随 `features/*`；④ 依赖只向下 `types|utils`→`core`→`components/ui+locales`→`stores`→`services`→`features/*`→`aurora/*`，**底座向上=0**。

## 状态层 · FileStore（数据丢失级）
- 🚨 **两阶段初始化**：同步 `loadState()` 在 localStorage 只有版本号时造**全新树 T0**，异步 `loadStateAsync()` 用 IDB 权威树**整体覆盖** ⇒ **`hydrated` 是程序化写入的唯一闸口**（种子/迁移必须等它），`saveState` effect 须 `if(!hydrated) return`。窗口期内「按树写入」落在随后被丢弃的 T0（只剩悬空 id）；「回存 IDB」会以 T0 覆盖用户真实旧树。
- 🚨 **写操作一律 `setState(prev=>…)` 累积**：用 `stateRef` 快照算整树后整体替换 → 同批次覆盖先前 updater，且目标父不在快照里的节点**静默消失**。锁 `FileStore.batch.test.tsx`。
- 🚨 **`setState(updater)` 的 updater 不在调用时同步跑**（只在渲染期；仅 React「急切求值」同步一次）⇒「在 updater 里给外部 `let` 赋值、再在 `setState()` 之后读」= 隐藏 bug，**只在队列非空时暴露**。修法 = 新状态**在同一个 updater 里一次算完**；复现 = **同一 tick 内连发多次更新**（单发会被急切求值掩盖）。
- ⚠️ **别名表分散 4 处**（`tsconfig`／`vite.config`／`vitest.config`／`vite.smoke.config`）必须同改；只改前两处 = 测试**导入期**崩溃（文件数不变、用例骤减）。守卫 `src/aliasSync.test.ts`；搜引用须**同时搜** `./X` `../X`。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**（并行 = 后写覆盖先写），改完逐文件 grep 核验。

## UI 交互（细则见 TOPICS.md）
- 🚨 **「可点暗示」与「实际 handler」必须同源**：可交互性由**有没有 `onClick`/`onSelect`** 派生（`.is-interactive`／role／tabIndex 全条件式）。**图形/SVG/画布元素恒 `cursor:pointer` 而无 handler = 哑节点**。
- 🚨 **同款类名散布多容器 → 交互能力各自漂移**：修法 = 抽单源组件；**探针选择器必须按容器限定、逐容器断言**（`querySelectorAll(类名)[0]` 会测到另一个列表 → 全绿却仍报障）。「只有某一条点不动」先查「是不是只给它渲染了可见名字」。
- 🚨 **滑动手势「吃掉尾随 click」的判据只能是「真的换了目标」**，不是「有没有位移」；**非激活按压不得残留手势状态**（准入闸 `(e.buttons & 1) === 0 → return`；jsdom 夹具须显式传 `buttons`）。⚠️ **「点击无反应」先注 trace 取值**（打 `offset/passed/target/startX/buttons` 即定案），别读代码推理。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas／kb／blog／graph）；漏登记 = 参数静默丢失。
- 🚨 插文件头注释先探 BOM；**回写必须保真 EOL**（本仓混用 CRLF/LF）→ 探 `includes('\r\n')` → 拆 `/\r?\n/` → **原 EOL 回写**；禁 `split('\n')+join('\n')`。

## 验证链路（七条，缺一条即可能放过只在特定链路暴露的失败）
① `tsc --noEmit -p tsconfig.json` ② `vitest run [pattern]` ③ `eslint --no-eslintrc -c .eslintrc.guard.cjs "src/**/*.{ts,tsx}"` ④ `node scripts/_depgraph.cjs` ⑤ `vite build` ⑥ 真机 CDP（**须与 Edge 同一次前台 bash**）⑦ **文件集合差**（删增 1:1；不用 diff 行数判删除）。③④⑥ 的验收细则见 TOPICS.md。

## 测试与真机的三条高压线（细则见 TOPICS.md）
- ⚠️ tsconfig **不含** `*.test.*` ⇒ tsc 干净 ≠ 测试无类型错，必须实跑；⚠️ `vitest -t <s>` 是正则，含 `*` 会**全量 skip 假绿**。
- ⚠️ 夹具一律**显式种入**被测数据且**按名幂等**（`FileStore` 是模块单例 ⇒ **空态须显式 `closeAllTabs()` 造**）；**别隐式拿默认树里的内置文档当清单**；**一条断言只证一件事**。
- 🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑 HEAD 阳性对照**，否则**全假绿**（最高危）；**对照选择器必须「实现无关」**（用修复后才存在的类名取扫描面 = 假阳性证据）；**对照「连本应绿的门也红」先怀疑运行条件**（独立 worktree 的 dev server 是冷的 → 预热轮）。

## git / 沙箱（三条静默失败；细则见 TOPICS.md）
PATH 三目录 `PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}` + `node/versions/22.22.2-3` + `System32`（缺则假输出）。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 内联 `node -e`／`bash -c` **禁反引号**（bash 当命令替换静默清空）；`${}`、`$()` 同理 → 长脚本一律写 `.cjs` 再跑，用完即删。
- 🚨 **`credential.helper=helper-selector` 弹窗挂死**：非交互无人点 ⇒ 裸 `git push` 被 SIGTERM 静默杀死、**远端其实没更新**（先查远端再下结论）。正解：`.git/config` 手写 `helper =`（空值重置继承链）+ `helper = wincred`。无头保险 = `scripts/push-gitee.cjs`。
- ⚠️ **暂存/提交一律显式 pathspec，禁 `git add -A`**（并发会话可能同仓同时编辑）；**单条 bash 禁 `git stash`**。
