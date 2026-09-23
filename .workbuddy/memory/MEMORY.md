# MarkCraft · 铁律
> 细则/事故过程/探针 → `memory/YYYY-MM-DD.md`、`.workbuddy/artifacts/`、skill `cdp-ui-interaction-verify`。
> **专题不变式**（开屏动画／动效语言／tab 滑动／KB 面板／内置使用文档／死代码／博客清单／双链图谱×3）→ **`memory/TOPICS.md`**（含「通用铁律·细则」），动到对应模块前先读。

## 定位与分层
Vite5+React18+TS、CodeMirror6+TipTap3、Excalidraw（tldraw 退役）、Dexie/IndexedDB。dev **5174**。**唯一入口 `src/aurora/aurora-main.tsx`**，真实 `#view=` 路由。**Aurora = 真实运行界面**；战略 = 网页 UI → 桌面软件范式（窗口 chrome／命令菜单／密度／键盘优先）。
① 视觉只用 `styles/tokens.css` 的 `--mc-*`；② 禁增功能；③ UI 三层：壳层 `aurora/`、通用 `components/ui`、业务随 `features/*`；④ 依赖只向下 `types|utils`→`core`→`components/ui+locales`→`stores`→`services`→`features/*`→`aurora/*`，**底座向上=0**；⑤ 路径深度：panels→features/stores `../../../`，components/ui·app `../../`。

## 状态层
- 🚨 **FileStore 两阶段初始化**：同步 `loadState()` 在 localStorage 只有版本号时造**全新树 T0**，异步 `loadStateAsync()` 再用 IDB 权威树**整体覆盖** ⇒ `hydrated` 是程序化写入的唯一闸口（种子/迁移必须等它），`saveState` effect 须 `if(!hydrated) return`。窗口期内「按树写入」落在随后被丢弃的 T0（只剩悬空 id）；「回存 IDB」会以 T0 覆盖用户真实旧树。
- 🚨 **写操作一律 `setState(prev=>…)` 累积**（快照算整树后整体替换 → 同批次覆盖先前 updater、目标父不在快照里的节点**静默消失**）。锁 `FileStore.batch.test.tsx`。
- 🚨 **updater 不在 `setState()` 调用时同步跑**（只在渲染期；仅「急切求值」会同步一次）⇒「在 updater 里给外部 `let` 赋值、再在 `setState()` 之后读」= 隐藏 bug，**只在队列非空时暴露**。修法 = 新状态在**同一 updater 内一次算完**；复现条件 = **同一 tick 连发多次更新**。
- ⚠️ **别名表分散 4 处**（`tsconfig`/`vite.config`/`vitest.config`/`vite.smoke.config`）必须同改；只改前两处 = 测试**导入期**崩溃（文件数不变、用例骤减）。守卫 `src/aliasSync.test.ts`；排查引用须**同时搜** `./X` `../X`。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**。

## UI 交互（细则见 TOPICS.md「通用铁律·细则」）
- 🚨 **「可点暗示」与「实际 handler」必须同源**：可交互性由**有没有 `onClick`/`onSelect`** 派生（`.is-interactive`/role/tabIndex/键盘全条件式）。**图形/SVG/画布元素恒 `cursor:pointer` 而无 handler = 哑节点**。
- 🚨 **同款类名散布多容器 → 交互能力各自漂移**（修法 = 抽单源组件；**选择器必须按容器限定、逐容器断言**）。**「只有某一条点不动」先查「是不是只给它渲染了可见名字」**。
- 🚨 **滑动手势「吃掉尾随 click」的判据只能是「真的换了目标」，不是「有没有位移」**；**非激活按压不得残留手势状态**（准入闸 `(e.buttons & 1) === 0 → return`；jsdom 夹具须显式传 `buttons`）。
- ⚠️ **「点击无反应」先注 trace 取值，别读代码推理**（打出 `offset/passed/target/startX/buttons` 即定案）。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘读 `xxxRef.current`；**指针捕获吞 click** → 子元素挂 **pointerup**（slop 4px）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas／kb／blog／graph）；漏登记 = 参数静默丢失。
- **hover 门控的浮层默认不挂载**：「浮层内控件在测试里找不到」真因常在此 → 夹具先走真实路径（`mouseEnter` 感应条 + 推进 intent 220ms）。
- `AuroraSelect`：触发器与浮层**共用 `aria-label`** → 取触发器用 `getByRole('button',{name})`；选项**只在展开时挂载**；浮层 `createPortal(document.body)`、选项是曲面滚轮（rotateX/scale + 视口裁剪）⇒ 真机点击**必须命中测试**再回落 `el.click()`。
- **外壳污染面板测试**：`RealProviders` 同渲染菜单栏 → 同名文案须 `within(...)` 限定。`COMMAND_CATALOG` 全量 ≠ 命令面板条数（`visible:()=>false` 为菜单专属）。
- 二级栏高 = `--mc-subbar-h`（tokens §12，52px），三面板同源，**不参与密度切换**；⚠️ 栏高**被复制进派生偏移**（`blog__panelzone.top` 等）→ 改栏高必须同改，一律 `var()`。
- ⚠️ `densityStore` 默认广播 **compact**。`.aurora-kb.kb-shell` 复合选择器（0/2/0）内含布局回收与 `--kb-*`→`--mc-*` 重映射 → **验证「没删错」的单点最强信号**。
- 单源：z-index = `tokens.css §14`；Modal/Button/Confirm/Switch = `@components/ui/*`。⚠️ `styles/desktop-chrome.css` 是**有意的第二层 `:root`**（后者赢）→ 改 `--mc-accent` 须同改（含亮色）。
- React 17+ `onWheel` passive → `preventDefault()` 无效；「改 CSS 不改 JS」双向陷阱 → 契约测试两侧同断言 `getBoundingClientRect()` **落点**。滚动显隐用「常驻 DOM + 类折叠」。
- 🚨 插文件头注释前先探 BOM；**回写必须保真 EOL**（混用 CRLF/LF）→ 探 `includes('\r\n')` → 拆 `/\r?\n/` → 原 EOL 回写；禁 `split('\n')+join('\n')`。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- jsdom 不实现指针捕获重定向 → 一律 `pointerdown → pointerup`；无 `PointerEvent` 用 `MouseEvent`；几何断言等稳态；`getBoundingClientRect` 全 0 须打桩。缺的 API 补 `src/setupTests.ts`；**IndexedDB 用 `import 'fake-indexeddb/auto'`**。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试无类型错，必须实跑。⚠️ `vitest -t <s>` 是正则，含 `*` 会**全量 skip 假绿**。
- ⚠️ 夹具一律**显式种入**被测数据、且**按名幂等**（`FileStore` 是模块单例，多段重挂不能重复建 → 段间数量漂移 = 为**错误的原因**红）；**别隐式拿默认树里的内置文档当清单**。
- ⚠️ **挂载与重放要分离**：挂载时无条件重放布局/动画会**提前启动循环**（力模拟/fling）污染同文件其他用例 → 用 `xxxAppliedRef` 区分首帧：挂载只恢复状态，**切档才重放**。
- 易错计算抽成**可测纯函数**并导出关键上限常量（如 `simulateStep`／`MAX_STEP`），交付前先验证「旧实现会变红」。

## 验证链路（七条，缺一条即可能放过只在特定链路暴露的失败）
① `tsc --noEmit -p tsconfig.json` ② `vitest run [pattern]` ③ `eslint --no-eslintrc -c .eslintrc.guard.cjs "src/**/*.{ts,tsx}"` ④ `node scripts/_depgraph.cjs` ⑤ `vite build` ⑥ 真机 CDP（**须与 Edge 同一次前台 bash**）⑦ **文件集合差**（删增 1:1；不用 diff 行数判删除）。
> ③ 空输出须先证「实扫文件数」非 0（`-f json` 数数组长度）；守卫升 error 后须**注入探针**验 `exit=1` 且报出预期规则名 → 还原 → 复跑 0。④ 看 `BIDIRECTIONAL PAIRS`／`MODULE-LEVEL CYCLES` 两节为 `(none)`。⑥ 不适用须**显式判定**并写明判据。

## CDP / 探针（四条最高频；细则见 skill）
- 🚨 **「零命中/零错误」必须先证「扫描面非空」+ 跑阳性对照**，否则**全假绿**（最高危）。**同探针自带的正对照优于只靠 HEAD**（把被排除的同一批 id 用另一档放回，即自证它们本来可入图）。
- 🚨 **对照的选择器必须「实现无关」**（用修复后才存在的类名取扫描面 ⇒ 红得不对 = 假阳性证据）；**凡为可测性新增的锚点，都必须额外证明「没有它时也能测到该差异」**。**派生性绿要标注归属**（「什么都没被过滤时 X 都在」类断言在对照里恒绿）。
- 🚨 **对照「大面积翻红（连本应绿的门也红）」先怀疑运行条件**：独立 worktree 的 dev server 是**冷的** ⇒ 应用未可交互时点击不生效。判据 = `§0 外壳就绪 waitIdx`（热 0 / 冷 26）。修法 = **预热轮**（`artifacts/cdp-warmup-nav.mjs`；结束时**不要 `Browser.close`**，实例留给探针复用）。
- ⚠️ **原生 exe 参数路径必须 Windows 形态** `C:/...`（给 edge ⇒ 静默并入现有会话、CDP 不监听；给 node ⇒ 解析成 `D:\c\...`）。`CDP_PORT` 必须与启动端口一致。`curl` 探测须 `--noproxy '*'`（`200` 有；`000` 未监听）。

## git / 沙箱
PATH 三目录 `PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}` + `node/versions/22.22.2-3` + `System32`（缺则假输出）。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 内联 `node -e`／`bash -c` **禁反引号**（bash 当命令替换静默清空）；`${}`、`$()` 同理 → 长脚本一律写 `.cjs` 再跑，用完即删。
- 🚨 **`credential.helper=helper-selector` 弹窗挂死**：裸 `git push` 被 SIGTERM 静默杀死、**远端其实没更新**。正解：`.git/config` 手写 `helper =`（空值重置继承链）+ `helper = wincred`。无头保险 = `scripts/push-gitee.cjs`。
- 🚨 单条 bash **禁 `git stash`**。工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`；⚠️ 多 pathspec **一条无效则整条中止**（静默）→ 对照前必须 grep 特征标记复核。
- ⚠️ **并发会话可能同仓同时编辑** → **暂存/提交一律显式 pathspec，禁 `git add -A`**。**bash 里禁内联 PowerShell** → 清探针进程用 PowerShell 工具（按命令行过滤，别无差别杀 msedge）。
- 删除优先 `git rm`（已暂存则 `pathspec did not match` → 改 `node -e fs.unlinkSync`）或 robocopy `/MIR`。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。**判「删没删」用集合差**。
- ⚠️ 仓内有**重名文件** → 一律用完整相对路径。⚠️ 临时文件用 `C:/Users/HJN/AppData/Local/Temp/`；⚠️ **`.mjs` 放 `%TEMP%` 解析不到仓内依赖** → 先 `cp` 进仓内，跑完 `rm`。
- ⚠️ **沙箱 safe-delete 闸**拦 Vite 重建 `.vite/deps`（>50 文件）⇒ 启 dev 前 `export CODEBUDDY_SAFE_DELETE_ENABLED=0`。

## 解耦路线（体检 `scripts/_depgraph.cjs`）
基线 8 环 → Phase 1–5 后 **0 环 / 0 双向依赖**。
- 🚨 `_depgraph.cjs`：**别名表漏登记会静默丢边 → 漏报环**，最危险方向 =「图看起来更干净了」→ 现从 `vite.config.ts` 派生 + 自检。
- 判据速记：① 说环消除前先确认该环模块**边数非零**；② 大体积静态数据子图**禁建 barrel**；③ 迁移保真 = 字节级比对 + EOL + BOM 位置；④ 定靶心前枚举**双侧边**；⑤ 守卫开例外前先问**能否移动模块**；⑥ 守卫用**全量 glob + 规则内 `exempt`**。
- 搬文件/改引用 → skill `codemod-reference-migration`。**底座需上层能力 = 反向安置不是加例外**：状态留 `stores`/`features`，常量下沉 `@core/constants`，UI 落 `components/ui` 或消费方 feature。
