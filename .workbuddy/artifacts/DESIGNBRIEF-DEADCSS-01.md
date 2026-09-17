# DESIGNBRIEF · 死 CSS 清剿与存量盘点（2026-09-17）

> 范围：`src/aurora/styles/**` + `src/components/ui/*.css`
> 关联提交：`3b3e9b2`（已推送）
> 配套工具：`.workbuddy/deadcss-scan.mjs`（扫描器 v2）、`.workbuddy/probe-deadcss-purge.mjs`（真机取证）

---

## §1 本轮已完成：tooltip 平行遗留清剿

### 1.1 待决项的原表述 vs 实际

原待决项写的是「`.aurora-tooltip` 死 CSS（`components.css` 零消费者）处置」——听起来是**一处**。
查下来是**两套平行实现全死**，而且还牵出一处「样式漏删」。

| 目标 | 位置 | 状态 |
|---|---|---|
| `.aurora-tooltip` + `__arrow` + `--top/--bottom` + `@keyframes aurora-tooltip-in` | `aurora/styles/components.css` | 零消费者 |
| `.mc-tooltip` + placement 变体 + `@keyframes mc-tooltip-in` | `components/ui/ui.css` | 零消费者 |
| `Tooltip.tsx`（133 行）+ barrel 两行导出 | `components/ui/` | **零 import** |
| `.mc-lazy-fallback/spinner/text` + `@keyframes mc-spin` | `components/ui/ui.css` | **LazyBoundary 组件已在 Phase 4-① 删除，样式漏删** |
| `@keyframes mc-fade-in` | `components/ui/ui.css` | 零使用者 |
| z-index 注册表 `2000 Tooltip 提示带` 行 + reduced-motion 名单两处登记 | `aurora/styles/tokens.css` | 随上游一并注销 |

### 1.2 判定依据（不是猜的）

1. **全仓引用扫描**：`aurora-tooltip` / `mc-tooltip` 的引用只落在「CSS 自身定义 + `docs/design` 设计文档 +
   `pointerGating.test.ts` 的死类黑名单 + `tokens.css` 注释」——**没有一处真实渲染**。
2. **设计文档自己早已判死**（只是从没落地）：
   - `AUDIT-FULL-CONSISTENCY-2026-09-06.md ㉘`：「2000×2 为 tooltip 平行遗留（mc-tooltip 注释自证无消费方，**待退役**）」
   - `AUDIT-REVIEW-consistency-2026-09-06.md`：「`.mc-lazy`/`.mc-tooltip` 为死代码 …（LazyBoundary/Tooltip 无消费者，**待确认后删**）」
3. **真实生效的悬停提示机制一直是原生 `title={...}`**：`shell.css` 侧栏书脊注释明示
   「hover tooltip 已由 SidebarItem 原生 `title={label}` 提供（macOS Safari/Chrome 渲染原生悬浮提示）」。

> 这轮做的，本质是**把一条已登记的设计审计 TODO 落地**，不是新决策。

### 1.3 删除清单（净 −273 行）

```
src/aurora/styles/components.css   |  61 +-----------------     （Tooltip 段 + 头注释）
src/aurora/styles/tokens.css       |   3 -                     （z-index 注册表 + reduced-motion ×2）
src/components/ui/Tooltip.tsx      | 133 ---------  (git rm)
src/components/ui/index.ts         |   2 -
src/components/ui/ui.css           |  76 +---------------------  （tooltip + lazy + 2 个孤儿关键帧）
5 files changed, 2 insertions(+), 273 deletions(-)
```

### 1.4 守卫：`src/aurora/styles/deadCssPurge.test.ts`（28 例）

| 断言族 | 内容 |
|---|---|
| 不得回流 | 清剿选择器/关键帧在全仓 CSS **零定义**（剥注释后断言，避免命中说明文字） |
| 不得残消费 | 全仓 TS/TSX（排除测试自身）**零引用** |
| 不得复活 | `Tooltip.tsx` 不存在、barrel 不再导出 `Tooltip*` |
| **反向护栏** | `Button` / `Modal` / `Switch` / `ConfirmProvider` / `Icon` 五个**活**导出必须仍在（防误伤） |
| 清单健康度 | 无重复项 / 扫描非空（防路径写错假绿）/ 正则边界 / 目录锚点 |

**三条断言族全部做了负向验证**（注入回归 → 确认真的报红 → 撤除）。连跑三轮才定型，过程见 §3。

### 1.5 真机取证（本次预期视觉增量 = 0）

删的是没有渲染者的东西，所以验证目标不是「看变化」，而是「**确认什么都没变**」：

```
就绪判据 .aurora-sidebar-item : 8         ✅
样式表 83 张 / CSSOM 624KB
  ├ 9 个清剿目标               : 全部已清除  ✅（真机 CSSOM 里确实不再下发）
  ├ DOM 挂载数                 : 全 0       ✅
  └ 外壳 sidebar/menubar/titlebar: 三项健在  ✅
运行时错误（console/Log/exception）: 0 条   ✅（证 Tooltip.tsx 删除未断链）
```

---

## §2 路径上的两个方法论级发现

### 2.1 「零 import」≠「不进包」（**反直觉，容易误判**）

`Input.tsx` 零直接导入，但 `ui.css` 的规则**确实在运行时下发**。原因：

```
components/ui/index.ts
  └─ export { Input } from './Input'      ← 桶里有这一行
       └─ Input.tsx: import './ui.css'    ← 于是 ui.css 跟着进图

任何 `import { Button } from '.../components/ui'`（Button/Modal/Icon 的消费方）
都会把**整个桶图**带进依赖图 —— dev 不做 tree-shaking。
```

真机证据（`style[data-vite-dev-id]` 与 `performance.getEntriesByType('resource')`）：

```
命中样式标签 : .../src/components/ui/ui.css
命中资源请求 : .../components/ui/Input.tsx 、.../components/ui/EmptyState.tsx
```

→ **判死代码必须看依赖图可达性，不能只看 import 计数。**
（这同时解释了为什么 `.aurora-emptystate*` / `.aurora-field*` 虽然「无人使用」却仍在包里：
它们是**未用但随桶下发**的规则，删它们等于删组件，属另一类决策。）

### 2.2 判死必须先排除「模板拼接」

纯字面量扫描会**把活类误判为死**。实锤三例：

| 源码写法 | 字面量 `xxx--sm` 是否存在 | 真实状态 |
|---|---|---|
| `Button.tsx:58` `` `aurora-btn--${size}` `` | ❌ 不存在 | **活** |
| `Modal.tsx:158` `` `aurora-modal--${size}` `` | ❌ 不存在 | **活** |
| `ToastProvider.tsx:168` `` `aurora-toast--${t.kind}` `` | ❌ 不存在 | **活** |

扫描器已升级为三档：**A 高危死候选 / B 疑似动态（禁盲删）/ C 仅测试引用**；
且前缀抽取**只取最后一个空白分隔词**——
`` `aurora-modal aurora-modal--${size}` `` 若整段当前缀会含空格，`startsWith` 永不命中 → 假阳性涌进 A 档（已修）。

---

## §3 踩坑记录（守卫断言自身的边界）

第一版代码锚点写了带前导点的 `\.mc-tooltip` → **漏检 `className="mc-tooltip"`**（TSX 里是无点裸名）。
补尾部约束时又连撞两次：

| 尾部写法 | `aurora-tooltip__arrow` | `.aurora-tooltips` | 结论 |
|---|---|---|---|
| 不写 | 命中 ✅ | 误伤 ❌ | 太宽 |
| `\b` | **漏检 ❌**（`_` 是词字符，不构成边界） | 正确 ✅ | 太窄 |
| `(?![a-zA-Z0-9])` | 命中 ✅ | 正确 ✅ | **正解** |

最终：CSS 锚点 `\.name(?![a-zA-Z0-9])`，代码锚点 `(?<![\w-])name(?![a-zA-Z0-9])`。

另：`mc-spin` 是 `--mc-spine-w`（书脊宽 token）的子串，裸 `includes` 会假阳性 → 一律走正则。

---

## §4 存量盘点：191 条 A 档高危候选（**本轮未动，待决策**）

### 4.1 总量

全 `src/` **28 个样式文件、1167 个 `aurora-*`/`mc-*` 类**中：

| 档 | 数量 | 含义 |
|---|---|---|
| **A 高危死候选** | **191** | 无字面量引用 **且** 不落在任何模板前缀下 |
| B 疑似动态 | 19 | 落在模板前缀下（含确认活的 `aurora-btn--sm/md/lg`、`aurora-input--sm/lg`）→ 禁盲删 |
| C 仅测试引用 | 10 | `aurora-card` / `aurora-kanban` / `aurora-mindmap` / `aurora-sticky` 等 |

> 未纳入扫描的前缀族：`kb-*` / `dv2-*` / `cv-*`（在 `features/*` 层，属另一批）。
> 扫描器是**候选生成器**，不是判决书：实际删除必须逐族人工复核。

### 4.2 A 档按族分布（Top）

```
23  aurora-editor__*    dash-kpi*/dash-cell/dash-heat/preview*/split*/token-*/keymap/line*/source/wysiwyg
20  aurora-timeline__*  card*/axis/scale/tick-year/today/node      ← 白板遗留
18  aurora-kanban__*    col*/card*/tag*/list/count/more/search-hud  ← 白板遗留
14  aurora-csp__*       mini-card*/star/tag-act*/childcount/linkcard-ctx/pin
10  aurora-list-item__* components 层遗留（含 --active/--cozy/--selected）
10  aurora-goto-dialog__*  整块（title/input/prefix/hint/error/actions）
 8  aurora-cip__*  ·  7 aurora-sticky__*  ·  7 aurora-mindmap__*  ·  5 aurora-shape*（含 --rect/--circle/--diamond）
 5  aurora-card__*  ·  4 aurora-properties__*  ·  4 aurora-kb-manage/minigraph  ·  3 aurora-modal__desc 等
```

### 4.3 根因：白板迁 `canvas-v2` 后旧自绘 CSS 整族废墟

```
RealCanvasView.tsx
  └─ import { MindMapView } from '@features/canvas-v2/components/views/MindMapView'
     import { KanbanView }  from '@features/canvas-v2/components/views/KanbanView'
     import { TimelineView }from '@features/canvas-v2/components/views/TimelineView'
     import { useCanvasEngine } from '@features/canvas-v2/engine/useCanvasEngine'
```

白板已切到 canvas-v2（Excalidraw 引擎 + 新视图组件），
`canvas.css` 里旧的 `kanban / sticky / timeline / mindmap / shape / pen-path / connection / freewrap`
**全部失去消费者**，目前仍随包下发。

### 4.4 一个刺眼的旁证

`tokens.css §12` 的指针类型门控注释里**早就自认**：

> ⚠️ 仅列 TSX 真实在用的选择器；已退役/死 CSS
> （`aurora-card--hoverable` / `aurora-sticky` / `aurora-kanban__card` /
> `aurora-mindmap__node` / `kb-stat` / `kb-tpl-card`）不予收录——
> 门槛只应约束真实界面，避免给「已死规则」制造维护假象。

→ **项目清楚它们是死的，只是从没删。**这轮 tooltip 清剿开了头，剩下的是把同一件事做完。

### 4.5 建议的下一轮做法（若要继续）

1. **逐族而非逐类**：按 §4.2 的族为单位复核 + 删除（每族一次提交，便于回滚）。
2. **删前补一层机器判据**：把 A 档清单喂给「依赖图可达性」检查（而非字面量扫描），排除模板拼接残留。
3. **删后同批交付守卫**：把族名加进 `deadCssPurge.test.ts` 的 `PURGED` 清单即自动获得同等保护。
4. **真机回归按族取证**：白板族可复用 `probe-deadcss-purge.mjs` 的 CSSOM 断言思路。

---

## §5 本轮验证汇总

| 项 | 结果 |
|---|---|
| 全量 vitest | **1275 passed / 0 failed / 2 skipped**（112 文件，+28 为本轮新增守卫） |
| `tsc --noEmit` | 干净 |
| 守卫负向验证 | 3 处注入回归 → 恰好 3 红 → 撤除回绿 → 零探针残留 |
| 真机（Edge CDP@9448） | 应用照常启动 + 9 个清剿目标从 CSSOM 消失 + 零运行时错误 |
| 净变更 | −273 行 |

---

## §6 存量清剿方案（2026-09-17 提案 · 待拍板）

> 展开 §4.5 的建议。配套量化工具：`.workbuddy/deadcss-impact.mjs`（复用扫描器同一判死口径，避免两套标准）。

### 6.1 量化：A 档的真实分量

| 指标 | 数值 |
|---|---|
| 已扫描 CSS | 28 文件 / **12499 行** |
| A 档死候选 | **183 类 / 1359 行** = 已扫 CSS 的 **10.9%** |
| 「父活子死」混合块 | **0 处** —— 原报「5 处」是 `includes` 子串假阳性（`aurora-kanban__card` 含 `aurora-kanban`）所致，已由 token 边界重判推翻，见 §6.6 |
| **从未纳入扫描** | **12 文件 / 5310 行** ← 见 6.2，这是本轮新发现的盲区 |

按可删行排序（Top 12 族）：

| 族 | 类数 | 可删行 | 死因 |
|---|---|---|---|
| `aurora-editor` | 23 | 231 | **旧自绘编辑器 DOM**（见 6.3）|
| `aurora-kanban` | 18 | 199 | 白板已迁 `canvas-v2` |
| `aurora-timeline` | 20 | 160 | 白板已迁 `canvas-v2` |
| `aurora-blog` | 10 | 125 | 博客改版遗留（code/deploy/platform/tree）|
| `aurora-list` | 10 | 118 | components 层遗留 |
| `aurora-shape` | 5 | 49 | 白板遗留 |
| `aurora-canvas` | 5 | 45 | 白板遗留 |
| `aurora-mindmap` | 7 | 41 | 白板已迁 `canvas-v2` |
| `aurora-mode` | 3 | 41 | — |
| `aurora-token` | 11 | 37 | 旧编辑器语法高亮 token |
| `aurora-goto` | 10 | 37 | goto 对话框整块换实现 |
| `aurora-sidebar` | 3 | 36 | — |
| （其余 21 族 ≤32 行）| | | |

### 6.2 盲区：5310 行 CSS 从未被扫描

上一轮扫描器只覆盖 `src/aurora/styles/**` + `src/components/ui/*.css`。实际 `src/` 下还有 12 个 CSS 文件：

| 文件 | 行数 | 加载点 | 风险 |
|---|---|---|---|
| `src/styles/tiptap.css` | 1294 | `aurora-main.tsx` | 活 |
| `src/styles/mermaid.css` | 1232 | `aurora-main.tsx` | 活 |
| `src/features/knowledgeBase/kb-ui.css` | 632 | `KbPanel.tsx:29` | 活，**但内含 `.kb-stat*` 族已被 `tokens.css` 注释判为「已退役」** |
| `src/styles/markdown.css` | 465 | `aurora-main.tsx` | 活 |
| `src/features/editor/versionHistory.css` | 330 | `VersionHistoryPanel.tsx:4` | 活 |
| `src/features/canvas-v2/components/canvas.css` | 294 | 白板新实现 | 活（前缀 `.cv`/`.tl`）|
| `src/styles/desktop-chrome.css` | 280 | `aurora-main.tsx` | 活 |
| `src/styles/components.css` | 251 | `aurora-main.tsx` | 活 |
| `src/styles/syntax.css` | 245 | `aurora-main.tsx` | 活 |
| `src/styles/base.css` | 182 | `aurora-main.tsx` | 活 |
| `src/styles/scrollbar.css` + `fonts.css` | 95 | `aurora-main.tsx` | 活 |
| `src/index.css` | 10 | 入口 | 活 |

两点结论：① 这些文件**都有真实 import**，不是废墟；② 但**文件活 ≠ 里面每个类都活**——`.kb-stat*` 就是反例。所以盲区要扫，但只能先扫后删。

### 6.3 比「白板废墟」更值的一处

`aurora-editor` 的 23 条死类，读下来是**一整套旧自绘编辑器的 DOM 结构**：

```
__line / __line--active / __line-number / __line-content   ← 自绘行号栏
__source / __wysiwyg / __preview / __preview-content       ← 自绘双栏
__split / __split-pane / __split-divider                   ← 自绘分栏
__cursor / __keymap / --zen                                ← 光标与键位表
```

现编辑器已换 **CodeMirror 6 + TipTap**，这套 DOM 不再产生。而 `editor.css` 是**全仓最大的样式文件（2717 行）**——这批废墟的绝对量很可能超过白板族。

### 6.4 判死标准要加厚到第三层

上一轮的教训（模板拼接、桶导出可达性、正则边界）说明：**静态判死有三类系统性误判**。所以方案的核心不是「拿 183 条开工」，而是先把判死标准做扎实。

| 层 | 判据 | 能排除 | 状态 |
|---|---|---|---|
| **L1 字面量** | 全仓 `className` / `.html` / 模板字符串扫描 | — | ✅ 已有 |
| **L2 动态生成排除** | 不在任何模板前缀下；无 `classList` / CSS 变量拼装 | 模板拼接（`` `aurora-btn--${size}` ``）| ✅ 已有（扫描器 B 档）|
| **L3 渲染实证** | 真机遍历所有视图与状态 → 采集「**实际挂载过的 class 全集**」→ 与 CSS 定义集合作差 | 字符串生成、条件渲染、滞后加载 | ⛔ **待建** |

L3 是本次方案的增量，也是判据的终点：把「代码里没写」升级为「**真实浏览器里从没出现过**」。技术上就是 `probe-deadcss-purge.mjs`（已在读 CSSOM）扩展一个 class 挂载采集器。

### 6.5 三批路线（按风险从低到高，一族一提交）

| 批 | 范围 | 判据 | 预计 | 需要 L3 |
|---|---|---|---|---|
| **批 1 · 整族废墟** | 白板 8 族（kanban/timeline/sticky/mindmap/shape/connection/pen/freewrap）+ 旧编辑器 2 族（token-\*/goto）+ 博客 4 族 | 新实现已就位 + 旧类零引用 + 部分项目自认 | **−700~800 行** | 否 |
| **批 2 · 补扫盲区** | 6.2 的 12 个文件 / 5310 行 | 仅产出候选清单 | **只扫不删** | 否 |
| **批 3 · 活族死分支** | `aurora-editor`(231) / `list-item`(118) / `csp`(18) / `canvas`(45) / `mode`(41) / `properties`(31) / `footnote`(32) / `backlinks`(26) | L3 实证 | −400~500 行 | **是** |

**不删清单**（明确登记，防后人误删）：

- **B 档 19 条** —— 模板拼接，含确认活的 `aurora-btn--sm/md/lg`、`aurora-input--sm/lg`。
- **C 档 10 条** —— 仅测试引用。
- **`pointerGating.test.ts:106-111` 的 `dead` 数组** —— 不是不能删，而是删完要**同步升级这条断言**：从「已退役选择器不收录门控」升级为「全仓零定义」。这批正是项目自认的死类（`aurora-card--hoverable` / `aurora-sticky` / `aurora-kanban__card` / `aurora-mindmap__node`），与 `tokens.css §12` 注释里那 6 项同源。

### 6.6 每批固定五步

1. **族级人工复核** CSS 块——尤其可能存在的「父活子死」混合块（批 1 实测为 0 处），只摘选择器、不删整块。
2. **（批 3 必做）L3 真机实证**：遍历视图/状态采集挂载类，确认目标类从未出现。
3. **删除 + 同批守卫**：把族名加进 `deadCssPurge.test.ts` 的 `PURGED` 清单，自动获得同等保护。
4. **负向验证**：注入回归 → 确认真的报红 → 撤除（前一轮连跑三轮才定型）。
5. **全量验证**：全量 vitest + `tsc` + 真机零视觉回归取证（`probe-deadcss-purge.mjs`）。

### 6.7 收益

| 项 | 说明 |
|---|---|
| **维护认知（真收益）** | 10.9% 的 CSS 是废墟。你正在做的 UI 精炼，每改一处都要判断「这条规则还有用吗」——清掉等于给后续所有 UI 工作清地基 |
| **防假象** | `tokens.css §12` 注释自陈：「门槛只应约束真实界面，避免给『已死规则』制造维护假象」。这正是把该顾虑工程化 |
| **包体积（小收益）** | 预估生产构建省 8–12KB（gzip 前）|

### 6.8 一句话方案

> 不把它当一次性清理：**先删零歧义的白板/旧编辑器废墟（−700~800 行）→ 再补扫 5310 行盲区出第二批清单（只扫不删）→ 最后对活族死分支建 L3 真机采集器后清**。全程一族一提交 + 守卫同批交付 + 负向验证。

---

## §6.9 批 1 执行记录（2026-09-17 已落地 ✅）

**结果：4 文件 · 净 −868 行 · 96 个类名 · 0 误删 · 守卫 87 项（全绿）· 全量 1314 passed / 0 failed · tsc 干净。**

| 文件 | 变化 | 内容 |
|---|---|---|
| `panels/canvas.css` | 1938 → 1285（−653） | 白板 8 族：kanban / timeline / sticky / mindmap / shape / connection / freewrap / pen + `@keyframes aurora-timeline-pulse` |
| `panels/editor.css` | 2717 → 2628（−89） | 旧编辑器 2 族：`aurora-token-*` / `aurora-goto-dialog*` |
| `panels/blog.css` | 1276 → 1157（−119） | 博客 4 族：blog-code / deploy / platform(s) / tree / select |
| `components.css` | 1156 → 1149（−7） | 共享 `<select>` 组内摘掉 blog 死成员（`platform`/`ctop__select select`） |

### 三条踩坑与修正（都是"看起来对、其实错"的坑）

1. **误判源：`includes` 子串假阳性。**
   `aurora-kanban__card` 是 `aurora-kanban` 的**超串** → 用 `srcCode.includes(cls)` 判死时，族根类被黑名单字面量"救活"，产出 **12 处假混合块**（进而让 §6.1 误报"5 处父活子死"）。
   **修正**：判死一律走 token 边界 `/(?<![\w-])((?:aurora|mc)-[a-zA-Z0-9_-]+)/g`。重判后 **混合块 = 0**，批 1 全部为纯死块。

2. **删除器残骸：混合组摘成员时留下悬空逗号。**
   原实现把 `{` 补到幸存成员行，却**没剥尾逗号** → 产出
   ```css
   .aurora-blog-input,
   .aurora-blog-textarea, {   /* ← 非法选择器：浏览器整条丢弃 */
   ```
   活类 `.aurora-blog-textarea` 的基样式被**静默误杀**（另两条 `::placeholder` / `:focus` 幸存，所以肉眼不易发现）。
   **修正**：补 `{` 前先 `replace(/[\s,]+$/, '')`；并加**全仓扫描**：`,\s*\{` / 跨行 `,\n{` / 独立 `,` 行 / 括号配平（4 文件 `{`=`}` 全等）。

3. **取证法：判"删没删"必须用集合差，不能用 diff 行数。**
   大段删除会让 `git diff -U0` 把**未删除**的相邻行报成 `-`：`@keyframes aurora-blog-shimmer` / `aurora-blog-spin` 一度显示"已删"，实际仍在 blog.css 且被 `.aurora-blog-generate.is-loading::after` 与 `.spin` 引用（都活）。
   **修正**：`git show HEAD:<f>` 与工作区各自抽类名 → `comm`。真实结论 **HEAD 764 类 → 668 类，真删 96、真增 0，且 96 个全部落在批 1 族内**（族外误删 0）。若按 diff 行数记账，会同时**高估删除量**并**把活关键帧写进守卫清单**（守卫会自己变红）。

4. **工具链坑：回写丢换行符 → 整文件 diff。**
   删除器/清理器都用 `raw.split('\n')` + `kept.join('\n')` 回写。`blog.css` 在 HEAD 是 **CRLF**，
   于是被整体转成 LF，git 把**未改动的 1157 行**全记为「重写」（`git diff --numstat` 从 `1/120`
   变成 `1157/1276`）—— 代码语义零变化，但**提交不可 review**。
   **修正**：先探出原 EOL（`raw.includes('\r\n')`），拆分用 `/\r?\n/`、回写用原 EOL；
   并加**全仓换行风格核对**（「CR==LF ⇒ CRLF」判风格，逐文件比对 HEAD，现已全一致）。
   ⚠️ 判据陷阱：不能直接比 CR 计数 —— CRLF 下 CR≈行数，删了行 CR 自然变少，会出**假警报**。

### 真机取证（`probe-deadcss-batch1.mjs`，四视图 × 冷/热 profile）

视角：默认视图 / 白板 canvas / 编辑器 editor / 博客 blog，均以 `?_p=N` 变体强制**重新加载**（深链 `#view=` 只认启动 URL）。四个视图全绿：

| 检查 | 结果 |
|---|---|
| 外壳渲染 | `.aurora-sidebar-item ×8`，四视图 `active` 分别落到 欢迎页/白板12/编辑器256/博客 ✅ |
| 清剿生效 | 15 族 + 1 关键帧在 **CSSOM** 零命中（83 表 / 605196 字符）✅ |
| DOM 残留 | 挂载类集合里零命中 ✅ |
| 反向护栏 | 8 个活选择器全在 CSSOM（跨 4 个被改文件）✅ |
| **决定性反证** | `.aurora-blog-input, .aurora-blog-textarea { box-sizing:border-box; width:100% }` **带声明存活** —— 残骸 bug 未复发 ✅ |
| 检测法自证 | 对照组 `.aurora-select` 合并规则同样命中（证明该检测非空转）✅ |
| 畸形选择器 | CSSOM 内空选择器段 = 0 ✅ |

**唯一错误：预存，非本批引入（已 A/B 证明）。** 报 `Warning: Can't call setState on a component that is not yet mounted … setState App`，出现在**切到「白板」视图**时（旧探针只加载默认视图，故从未暴露）。A/B 做法：把 4 个 CSS 临时还原到 HEAD（**先备份**）后重跑 → **同一条警告同样出现**，遂定性为预存 React 生命周期问题；还原后复核内容 md5（忽略 EOL）一致、numstat 回到 `0/653`/`0/89`/`1/120`/`0/6`。

**顺带收获 —— 探针阳性对照**：HEAD 版的同一次运行里，16 项清剿检查**全部正确报「仍残留」**。这证明"零命中"是真的零命中，而不是探针本身失效造成的假绿。（建议：以后新探针都跑一次 HEAD 版做阳性对照。）

### 守卫同批交付（本批新增 22 条清单项 × 2 面 = 44 断言）

- `deadCssPurge.test.ts` → `PURGED` 增 15 族 + 1 真删关键帧；锚点三处特殊形态（`platforms?` 复数、`aurora-token-` 前缀族、`aurora-pen` 不误吃 `aurora-pending`）各有正交断言锁死。
- `pointerGating.test.ts` → 原 `dead` 数组**拆成两组**（比原计划"整体升级"更准确）：
  - **A 组**（批 1 已整族删）= `aurora-sticky` / `aurora-kanban__card` / `aurora-mindmap__node` → 由「不在门控块里」**升级**为「全仓 CSS 零定义」；
  - **B 组**（仅视觉退役、类仍活着）= `aurora-card--hoverable`(components.css) / `kb-stat` / `kb-tpl-card`(kb-ui.css) → 保留原弱断言，并加一条**诚实绊线**：一旦它们真被删，本行变红 → 提示**迁到 A 组**，而不是让名单静默失真。

### 与 §6.5 的偏差说明

原路线写「一族一提交」，实际按**批**提交：4 文件同族同类，拆开提交反而会让中间态（删了 CSS 但守卫未更新）暴露一次假绿。守卫随批同批落地，改动原子性更好。

### 顺带核验

**悬空动画引用 = 0**（全仓 45 个 `@keyframes` 定义 ↔ 45 个被引用名，且双向相等 → 既无悬空引用、也无孤儿关键帧）。这条是本批特有风险（删了 1 个关键帧），单列成一次性脚本核验通过。

**侧栏「小标题栏」是否该与二级子栏统一？—— 结论：不该，属不同层级。**

| 选择器 | 高度 | 内缩 | 层级 |
|---|---|---|---|
| `.aurora-kb-subbar` / `.aurora-blog__subbar` / `.aurora-ctop` | **52px** = `var(--mc-subbar-h)` | `0 var(--mc-subbar-pad-x)`（14px）| **视图级**二级栏：撑在内容区顶部，**跨视图等高**是刚性要求（切换不跳高）|
| `.aurora-filetree__topbar`（文件面板）/ `.aurora-outline__header`（大纲面板）| **36px**（硬编码）| `0 8px 0 12px` | **面板级**内部标题行：在侧栏*里面*，标题 + 收起按钮 |

两者**已各自自洽**：两个面板标题行同为 36px + 同款 padding。把 36 提到 52 会**白丢 16px 侧栏纵向空间**，且侧栏本就有自己的密度尺度（`--mc-sidebar-item-h` 32/40）。**不动。**

唯一可选（P2，本轮不做）：`height:36px` 的「面板内标题行」形态在 editor(2) / graph(2) / settings(1) 共约 5 处重复，可抽 `--mc-panel-head-h` token。属**收敛**而非**统一**，且不解决任何现存视觉问题。
