# MarkCraft · 铁律（案例见 memory/YYYY-MM-DD.md；专题见 artifacts/ 与《解耦实施方案》）

## 定位与分层
Vite5+React18+TS；CodeMirror6+TipTap3；白板 Excalidraw（tldraw 已退役）；Dexie/IndexedDB。
dev 端口 **5174**（`node node_modules/vite/bin/vite.js --port 5174 --host`）。**入口只有 `src/aurora/aurora-main.tsx`**，真实 `#view=` 路由。**Aurora = 真实运行界面**，战略是网页 UI → 桌面软件范式（窗口 chrome／命令菜单／密度／键盘优先）。
铁律：① 视觉只用 `styles/tokens.css` 的 `--mc-*`；② 禁增功能（边界 = 真实已有能力）；③ UI 三层分置：壳层 `aurora/`、通用 `components/ui`、业务专属随 `features/*`；④ 依赖只向下，分层 `types|utils`→`core`→`components/ui+locales`→`stores`→`services`→`features/*`→`aurora/*`，**底座向上依赖=0**（守卫 `no-base-to-upper`）；⑤ Path depth：panels→features/stores `../../../`，components/ui·app `../../`。

## 关键坑
- ⚠️ **别名表分散 4 处**（`tsconfig`/`vite.config`/`vitest.config`/`vite.smoke.config`）必须同改；只改前两处症状 = 测试**导入期**崩溃（文件数不变、用例骤减）。守卫 `src/aliasSync.test.ts`。排查引用须**同时搜** `./X` `../X` 同层相对形态。
- 新类**必须同批交付 CSS**；**同文件多处 Edit 必须串行**（并行=后写覆盖先写）；改完逐文件 grep 核验。
- 🚨 插文件头注释前先探 BOM；**回写必须保真 EOL**（本仓混用 CRLF/LF，无 `.gitattributes`、`core.autocrlf=false`）→ 探 `includes('\r\n')` → 拆 `/\r?\n/` → 原 EOL 回写；禁 `split('\n')+join('\n')`。
- 单源：z-index = `tokens.css §14`；Modal/Button/Confirm/Switch = `@components/ui/*`。⚠️ `styles/desktop-chrome.css` 是**有意的第二层 `:root`**（后者赢）→ 改 `--mc-accent` 须同改（含亮色）。
- **拖拽闭包陷阱**：监听闭包在拖拽开始时注册 → 落盘读 `xxxRef.current`；**指针捕获吞 click** → 子元素挂 **pointerup**（slop 4px）。
- **视图上下文单源** = `useAuroraShell.nav` 的 param→params 映射表（canvas→canvasId／kb→kbId／blog→kbId）；漏登记 = 参数静默丢失。
- React 17+ `onWheel` passive → `preventDefault()` 无效，拦横滚靠 CSS `touch-action`/`overscroll-behavior-x`；「改 CSS 不改 JS」双向陷阱 → 契约测试两侧同断言 `getBoundingClientRect()` **落点**。
- 滚动显隐用「常驻 DOM + 类折叠」（条件渲染自激振荡）；内联 `transition` 残留 → 瞬时落位后 `void el.offsetWidth; el.style.transition=''`。
- `AuroraSelect`：触发器与浮层**共用 `aria-label`** → 取触发器用 `getByRole('button',{name})`；选项**只在展开时挂载**。
- **外壳污染面板测试**：`RealProviders` 同渲染菜单栏 → 同名文案须 `within(...)` 限定。`COMMAND_CATALOG` 全量 ≠ 命令面板条数（`visible:()=>false` 为菜单专属）。
- 二级栏高 = `--mc-subbar-h`（tokens §12，52px），三面板同源，**不参与密度切换**；⚠️ 栏高**被复制进派生偏移**（`blog__panelzone.top` 等）→ 改栏高必须同改，一律 `var()`。
- ⚠️ `densityStore` 默认广播 **compact**。`.aurora-kb.kb-shell` 复合选择器（0/2/0）内含布局回收与 `--kb-*`→`--mc-*` 重映射 → **验证「没删错」的单点最强信号**。

## 测试铁律
- 严禁同时 `vi.mock` TagIndexStore 与 LinkIndexStore（循环依赖静默崩溃）→ 用真实 Provider 包裹。
- jsdom 不实现指针捕获重定向 → 一律 `pointerdown → pointerup`；无 `PointerEvent` 用 `MouseEvent`；几何断言等稳态；`getBoundingClientRect` 全 0 须打桩。
- CSS「无某声明」断言先剥注释；「全仓无残留消费者」排除 `docs[\\/]design`、`.test.tsx?$`；静态锚点用带引号完整字面量；**token 断言须含声明边界**（`toContain('--kb-text:')`）。
- jsdom 缺的 API 补 `src/setupTests.ts`；**IndexedDB 用 `import 'fake-indexeddb/auto'`**（在需要的测试文件内）。
- ⚠️ tsconfig **不含** `*.test.*` → tsc 干净 ≠ 测试无类型错，必须实跑。⚠️ `vitest -t <s>` 是正则，含 `*` 会**全量 skip 假绿**。

## 验证链路（七条，缺一条即可能放过只在特定链路暴露的失败）
① `tsc --noEmit -p tsconfig.json` ② `vitest run [pattern]` ③ `eslint --no-eslintrc -c .eslintrc.guard.cjs "src/**/*.{ts,tsx}"` ④ `node scripts/_depgraph.cjs` ⑤ `vite build`（与 ② 不同链路）⑥ 真机 CDP（**须与 Edge 同一次前台 bash**）⑦ **文件集合差**（删增 1:1；不用 diff 行数判删除）。
> ③ 空输出须先证明「实扫文件数」非 0；守卫升 error 后须**注入探针**验 `exit=1` 且报出预期规则名 → 还原 → 复跑 0。⑥ 不适用须**显式判定**并写明判据。

## git / 沙箱
PATH 三目录 `PortableGit/versions/1.2.0/{cmd,usr/bin,mingw64/bin}` + `node/versions/22.22.2-3` + `System32`（缺则假输出）。远端 `gitee.com/James-fake/markcraft.git`。
- 🚨 内联 `node -e`／`bash -c` **禁反引号**（bash 当命令替换静默清空）；`${}`、`$()` 同理 → 长脚本一律写 `.cjs` 再跑，用完即删。
- 🚨 **`credential.helper=helper-selector` 弹窗挂死**：非交互无人点 ⇒ 裸 `git push` 被 SIGTERM 静默杀死、**远端其实没更新**（先查远端再下结论）。正解：`.git/config` 手写 `helper =`（空值重置继承链）+ `helper = wincred`（`git config --local` 不持久化空值）。无头保险 `scripts/push-gitee.cjs`；推内联 URL 须回写 `.git/refs/remotes/origin/master`。
- 🚨 单条 bash **禁 `git stash`**（半写对象库）。工作区可能被外部清空 → `git restore --source=HEAD --worktree -- <路径>`。
- ⚠️ **并发会话可能同仓同时编辑** → **提交/暂存一律显式 pathspec，禁 `git add -A`**。
- 删除优先 `git rm`（已暂存则 `pathspec did not match` → 改 `node -e fs.unlinkSync`）或 robocopy `/MIR`。`.workbuddy` 仅 `memory/`、`artifacts/` 入库。**判「删没删」用集合差**。
- ⚠️ 仓内有**重名文件** → 一律用完整相对路径。⚠️ **`/tmp` 在 bash/node 下解析不同** → 临时文件用 `C:/Users/HJN/AppData/Local/Temp/`。

## CDP（细节见 skill `cdp-ui-interaction-verify`）
前台同 bash 启动；别删 profile、别换目录名（二次启动必失败 → `cp -r` 副本）；`&` 后丢 PATH；就绪判据 `.aurora-sidebar-item`。
三陷阱：backdrop 吞指针／窗口激活吞最早鼠标事件／无焦时合成按键打不进。深链 `#view=` 只认**启动 URL**。
🚨 「零命中/零错误」必须先证**扫描面非空** + HEAD 阳性对照 → 否则**全假绿**。「看得见」别用 `elementFromPoint`；拖动中截图不可信。

## 解耦路线（体检 `scripts/_depgraph.cjs`；判据见《解耦实施方案》）
病灶：跨模块共享能力寄居上层 → 下层反向引用 → 成环。基线 8 环 → Phase 1–5 完成后 **0 环 / 0 双向依赖**（`_depgraph.cjs` 实测）。
- 🚨 `_depgraph.cjs` 已加固：硬编码别名表漏登记会**静默丢边 → 漏报环**；最危险方向是「图看起来更干净了」。现从 `vite.config.ts` 派生 + 别名自检。
- 判据速记：① 说环消除前先确认该环模块有非零边数；② 含大体积静态数据的子图禁建 barrel；③ 迁移保真 = 字节级比对 + EOL + BOM 位置；④ 定靶心前枚举双侧边（源码+测试）；⑤ 守卫开例外前先问能否移动模块；⑥ 守卫用全量 glob + 规则内 `exempt`，忌 `overrides.files`；⑦ 被搬文件引用按新位置求值可能悬空（按**旧位置**重解析）；⑧ 引用重写须解析成路径再查表、两端都枚举扩展名。
- 搬文件/改引用 → skill `codemod-reference-migration`。**底座需上层能力 = 反向安置不是加例外**：状态留 `stores`/`features`，常量下沉 `@core/constants`，UI 落 `components/ui` 或消费方 feature。**「按字面语义归类」与「层级纪律」冲突时后者优先**。

## 专题铁律（细节见 artifacts / 每日日志）
- **开屏动画**：落 `index.html` **内联层**（React 方案要等 bundle ⇒ 长空白）；仅首次；双 rAF 交接；`MIN_TOTAL` + `HARD_CAP` 兜底；只动 opacity/transform/filter。
- **动效语言**：⚡100–160／🚶150–250／🛋320–500ms；**外壳（MenuBar/Sidebar/StatusBar）永不参与视图切换动画**；reduced-motion = 更少更柔非归零；指针门控只归零**纯位移/缩放** hover，复合 transform 必须豁免。永不用 `scale(0)`（起手 0.96/0.97）；进出不对称「出更快」。
- **浮层退场**：原语 `components/ui/usePresence`（时长常量与 CSS 逐字对齐；`[data-exiting='true']` 必带 `pointer-events:none`）。Toast·Modal 有意不动。
- **N · tab 滑动切 Tab**：滑块跟手、内容零位移；hook 必传 `dampenOffset`+`snapDecider`；白板空白板引导锁定态停用手势。
- **KB 面板**：subbar 52px。⚠️ `.aurora-kb-notes` 顶 padding 仅 2px 是为**自带 `__head` 的 Tab** 设计 → 无 head 的复用者必自带留白（`__lead`）。空库不渲染 tab 栏；建库后不自动进详情。
- **死代码清剿** → skill `dead-code-purge`：① 「零 import」≠「不进包」（桶 re-export 会连带挂进模块图，dev 无 tree-shaking）→ 判死看**依赖图可达性**；② 「零 import」删文件／「零消费者」删成员不可互替；③ 盲区真因是「前缀」不是「目录」。
- **内置使用文档播种**（`stores/kbSeed.ts`）：首启默认存在「MarkCraft 使用文档」KB，笔记 = 各功能说明（16 篇/语言，`core/data/defaultDocs/usageDocs/*`）。三硬约束：**幂等**／**不复活**（`localStorage['markcraft-usage-docs-seeded']='1'` 后删除不重建）／**零丢失**（老用户旧文档只 `moveNode` 迁移、保原名护 [[双链]]）。播种必须显式 `createFile(..., false)`，否则 16 篇全开成标签页。入口：设置→关于→使用文档 → `nav('kb', id)`。
