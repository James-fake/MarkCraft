# PLAN 02 — 布局属性动画合成器化（left / height → transform）

> **状态：✅ 已完成（2026-09-14）—— 但实际执行内容与原计划有重大出入，见下。**
>
> | 项 | 原计划 | 实际结论 |
> |---|---|---|
> | **改动 A** 博客浮层 `left` → `translateX` | HIGH，要改 | ✅ **已改**（真实收益，CDP 19/19 验证含右贴边 0px 等价） |
> | **改动 B** 柱状图 `height` → `scaleY` | HIGH，要改 | ❌ **不执行 —— 该柱状图是死 CSS** |
>
> **改动 B 为何取消（三层证据）**：
> 1. `canvas.css` 的 `.aurora-dash-bar__fill` 及其所属 `aurora-dash-*` 家族（**47 个类名**，
>    行 824–1151 与 1450–1479）在 `src/**/*.{ts,tsx}` 中**零引用**。用脚本逐类名核对：
>    `node .workbuddy/artifacts/probe-dash-css.mjs` → 死 47 / 活 0。属 Aurora 演示期仪表盘**残留**。
> 2. `src/features/dashboard/DashboardPanel.tsx`（计划误以为的「真正在用的柱状图」）**也是死组件**：
>    全仓唯一引用 `@features/dashboard` 的是 `GraphPanel.tsx:12` 的 `useDashboardData`（数据 hook，
>    非面板）。审计文档亦记载 `tools.openDashboard` 命令与仪表盘子视图**已于 2026-09-01 删除**
>    （`04-dashboard-panel.md:3`、`05-canvas-panel.md:69`、`commandWiring.test.tsx:25`）。
> 3. 项目里**真正在用**的、带 rAF 循环的图表是 `GraphPanel.tsx`（双链图谱）。已用 CDP 直测其拖拽期
>    性能：`avg 17.12ms → 16.72ms`（Δ−0.40ms，**优于**基线）、`>33ms 掉帧 3 → 0`。
>    **当前规模（8 节点 / 29 DOM 元素）下无实证退化**，故不执行优化。
>
> **规模边界（诚实声明）**：额外注入压力测试显示，即使每帧全量改写 1200 个 SVG 元素，
> `avg≈17.3ms` 仍守住 60fps（`probe-graph-scale.mjs`）。但这**只说明当前规模无问题**。
> `GraphPanel.tsx:735-744` 的 `loop(){ step(); bump(); }` 每帧 dispatch 触发 React 重渲染，
> 若未来图谱增长到数百节点，须重测 —— 已记入待办，不作为本轮改动。

- **严重度**：HIGH（性能）
- **基线 commit**：`075821f`
- **预估改动**：2 个文件（`blog.css`、`canvas.css`）
- **依赖**：无（但建议在 PLAN 01 之后做，避免选择器冲突排查干扰）
- **风险**：中（涉及定位机制改写，需真机拖拽验证）

---

## 0. 落地实况（改动 A）

| 文件 | 改动 |
|---|---|
| `src/aurora/styles/panels/blog.css:155-181` | `transition: left ...` → `transition: transform var(--mc-dur-base) var(--mc-ease-spring)`；`will-change: left` → `will-change: transform, opacity`；`left: 0` 保留为**静态基准位**（translateX 的坐标系锚点） |
| `src/aurora/panels/blog/BlogPanel.tsx:1220` | `style={{ left: panelLeft }}` → `style={{ transform: \`translateX(${panelLeft}px)\` }}` |

**关键前置调查结论（决定改动是「只改 CSS」还是「CSS+JS 双改」）**：
- `panelLeft` 是 React state（`BlogPanel.tsx:1026`），由 `setPanelLeft` 写入（行 1038 / 1067）。
- `edgeMax()`（行 1031）用 `offsetWidth` 测量，**不读 DOM 的 `style.left`**。
- 全仓 `panelzone` 相关的 `style.left` / `getComputedStyle(...).left` 读取点：**零**；测试断言：**零**。
- → 属计划 §2.2 情形 **(c) 拖拽实时计算**，但 JS 状态源是 React state 而非 DOM，
  因此**判定逻辑无需改动**，只需换内联属性名 + CSS 过渡属性。

**验证**：契约测试 `src/aurora/styles/panels/blogDockTransform.test.ts`（13 例）；
CDP `cdp-verify-blog-dock.mjs` **19/19**，含核心等价性断言
（右贴边 `gap=0.00px`、`translateX=1210.0` = 容器宽−浮层宽 `1210.0`、往返可逆、缩放后仍贴合）；
全量回归 **895 passed / 3 failed / 2 skipped**；tsc 0。

---

## 1. 背景（执行者须知）

AUDIT.md §5 铁律：**只动画 `transform` 和 `opacity`**。
`width/height/left/top/margin/padding` 会触发 layout → paint → composite 全链路，掉帧且耗电。

本次审计定位到两处**明确应立即修**的布局属性动画（另有两处属结构性权衡，见 §4 不改）：

| 位置 | 现状 | 问题 |
| --- | --- | --- |
| `src/aurora/styles/panels/blog.css:176` | `transition: left var(--mc-dur-base) var(--mc-ease-spring); will-change: left;` | 博客浮层停靠用 `left` 位移 —— 教科书级反模式；`will-change: left` 还会额外提升图层却无效 |
| `src/aurora/styles/panels/canvas.css:939` | `.aurora-dash-bar__fill { transition: height var(--mc-dur-slow) var(--mc-ease-out); }` | 柱状图高度动画。用 `scaleY` + `transform-origin: bottom` 可全程留在合成器 |

---

## 2. 改动 A：博客浮层 `left` → `transform: translateX()`

### 2.1 先读现状
```bash
sed -n '150,200p' src/aurora/styles/panels/blog.css
```
需确认：`.aurora-blog__panelzone` 的 `position`（应含 `fixed` 或 `absolute`）与当前的 `left` 取值来源
（由 JS 内联样式设置，还是类切换 `is-left` / `is-right`）。

### 2.2 关键前置调查（执行者必做，勿跳过）
```bash
grep -rn "panelzone" src/aurora/panels/blog/BlogPanel.tsx | head -40
grep -rn "left" src/aurora/panels/blog/BlogPanel.tsx | grep -i "panel\|dock\|style" | head -20
```
**目的**：找出是谁在写 `left`。三种可能，对应三种改法：

- **(a) 由 CSS 类切换**（`.is-left { left: 0 }` / `.is-right { left: auto; right: 0 }`）→
  改为用 `transform` 做位移：保留一个基准位置，用 `translateX(-100% / 0)` 切换。**最干净。**
- **(b) 由 JS 内联 `style.left = ...px` 设置** → 改为 `style.transform = \`translateX(${x}px)\``。
  同时把 CSS 的 `transition: left` 改为 `transition: transform`。
- **(c) 由拖拽实时计算** → 若 `left` 在 **拖拽过程中逐帧更新**，则属于 Apple §2 直接操纵范畴，
  `transform` 仍是正确解（且 `will-change: transform` 才有效）。

### 2.3 目标代码（以 (b) 最常见情形为例）
```css
.aurora-blog__panelzone {
  /* 原：transition: left var(--mc-dur-base) var(--mc-ease-spring); will-change: left; */
  transition: transform var(--mc-dur-base) var(--mc-ease-spring);
  will-change: transform, opacity;
}
```
- 时长/曲线**保持不变**（`--mc-dur-base` 280ms + `--mc-ease-spring`）——这是既定决策，不要顺手改曲线。
- `will-change` 从 `left` 换成 `transform, opacity`（与 `components.css:835` 的既有写法一致）。

### 2.4 若采用 transform，需同步处理
- 若 JS 用 `getBoundingClientRect().left` 做命中/停靠判定，**改判定源为 transform 后的 rect**（rect 会自动反映 transform，通常无需改）。
- 若 JS 用读取的 `element.style.left` 做状态判断，**必须改读 `transform` 或改用 state 判定**——
  这是本计划最易踩的坑：`left` 变量失效会导致停靠逻辑静默错位。

---

## 3. 改动 B：柱状图 `height` → `scaleY` —— ❌ **已取消（该柱状图是死代码）**

> **结论：本节不执行。** 保留原文仅为记录调查路径。
>
> **取消理由**：本节假设 `.aurora-dash-bar__fill` 是活的柱状图实现，实际上：
> - 它所属的 `aurora-dash-*` 家族（47 个类名）在 TSX 中**零引用**，
>   证明脚本：`node .workbuddy/artifacts/probe-dash-css.mjs`（输出「死 47 / 活 0」）。
> - 本应消费它的 `features/dashboard/DashboardPanel.tsx` **也是死组件**（无入口，命令已删）。
> - 项目真正在用的 `GraphPanel.tsx` 经 CDP 直测**无实证性能问题**（拖拽期帧率优于基线）。
>
> 因此「改 height → scaleY」既没有真实承载者，也没有性能实证支撑。
> 若强行改动，改的是一段永不渲染的 CSS —— 属无谓风险，违背「不凭观感优化」原则。
>
> **遗留治理项（独立于本计划）**：`aurora-dash-*` 死 CSS（约 380 行）建议单独清理，
> 但因属「退役代码清理」而非动效优化，本轮未混入提交，留待单独决策。

### 3.1 原文（记录用）

```css
/* src/aurora/styles/panels/canvas.css:936-941 —— 该规则零引用，不生效 */
.aurora-dash-bar__fill {
  width: 100%;
  max-width: 22px;
  border-radius: var(--mc-radius-sm) var(--mc-radius-sm) 0 0;
  background: linear-gradient(180deg, var(--mc-accent), var(--mc-accent-pressed));
  transition: height var(--mc-dur-slow) var(--mc-ease-out);
}
```

~~### 3.2 调查（必做）~~（已完成调查，见上方取消理由）

~~### 3.3 transform-origin 必须显式声明~~（不适用）

---

## 4. 明确不改的两处（记录，勿动）

| 位置 | 现状 | 为何保留 |
| --- | --- | --- |
| `shell.css:317` / `shell.css:683` | `transition: width var(--mc-dur-slow) var(--mc-ease-mac)` | **侧栏折叠**。侧栏是布局上下文的一部分，改用 transform 会脱离文档流、破坏相邻内容重排，属**不得已的正确选择**。已在审计报告标注为「结构性权衡」。 |
| `editor.css:1140` | `transition: width var(--mc-dur-slow) var(--mc-ease-mac)` | 同上（右栏/inspector 宽度）。 |
| `shell.css:436` | `transition: grid-template-rows` | **`grid-template-rows` 折叠动画**是当前 CSS 里实现「高度自适应内容折叠」的现代标准手法（`0fr`↔`1fr`），比 `max-height` 猜测值更准确。属**有意为之的正确方案**，改为 transform 需 JS 测高，得不偿失。保留。 |

> 执行者若认为需改以上任一项，**先停下来问**，不要擅自改。

---

## 5. 验证（实况）

### 5.1 静态
```bash
node_modules/typescript/bin/tsc --noEmit -p tsconfig.json   # → 0 错误
node node_modules/vitest/vitest.mjs run src/aurora/styles/panels/blogDockTransform.test.ts  # → 13 passed
```

### 5.2 真机验证（`cdp-verify-blog-dock.mjs`，19/19 全绿）
核心断言（**几何等价性是改造正确性的真正判据**，只看 transform 值不足以证明位置对）：

| 断言 | 结果 |
|---|---|
| B1/B2 transition 落在 transform、不含 left | ✅ |
| B3 时长 = 0.28s（`--mc-dur-base` 未被顺手改动） | ✅ |
| B5 左贴边左缘贴合容器 | `gap=0.00px` |
| C1 拖拽期过渡关闭（实时跟手） | `prop=none dur=0s` |
| C2 拖拽期 transform 紧随指针 | `matrix(1,0,0,1,1132.5,0)` |
| **D1 右贴边右缘贴合容器** | **`gap=0.00px`**（zoneRight 1570.0 = containerRight 1570.0） |
| **D4 translateX 值 = 容器宽 − 浮层宽** | **`1210.0` = `1210.0`** |
| D5 未溢出容器右缘 | ✅ |
| E1 甩回左贴边（往返可逆） | `gap=0.00px` |
| F1 窗口缩放后仍贴合 | `gap=0.00px` |

### 5.3 全量回归
```bash
node node_modules/vitest/vitest.mjs run
```
**结果**：`895 passed / 3 failed / 2 skipped`，失败项名称与基线一致（无新增）。

### 5.4 性能实证（针对被取消的改动 B）
```bash
node .workbuddy/artifacts/probe-dash-css.mjs      # 死 CSS 判定：死 47 / 活 0
node .workbuddy/artifacts/probe-graph-real.mjs    # GraphPanel 真实拖拽帧率
```
**GraphPanel 真实拖拽**：`avg 17.12ms → 16.72ms`（Δ−0.40ms），`>33ms 掉帧 3 → 0` → **无退化，不优化**。

---

## 6. 硬性范围边界

- ✅ 允许改：`blog.css`（panelzone 的 left→transform）、`canvas.css`（dash-bar 的 height→scaleY）、
  以及**仅当需要时**对应的 JS 写入点（`BlogPanel.tsx` 的样式赋值处）
- ❌ 禁止改：侧栏/右栏 `width`、`grid-template-rows`（见 §4）
- ❌ 禁止顺手调整任何时长或曲线
- ❌ 禁止引入新依赖（不引入动画库）

---

## 7. 完成定义（DoD）

- [x] `blog.css` 无 `left` 过渡；`will-change` 改为 transform/opacity
- [x] JS 写入点同步（`style.left` → `style.transform: translateX`）—— **只改 CSS 不改 JS 会让位移彻底失效**
- [x] 右贴边几何与改前**逐像素等价**（CDP D1/D4 `0.00px` / `1210.0=1210.0`）
- [x] 停靠逻辑未错位、往返可逆、缩放后仍贴合（CDP 19/19）
- [x] 全量回归无新增失败（895/3/2）
- [x] 契约测试 13 例
- [x] ~~`canvas.css` 柱状图走 transform: scaleY~~ → **取消（死代码，见 §3）**
- [x] 记忆追加一条（含「left→transform 时 JS 写入点需同步」「死代码不得纳入改动范围」两个坑）
