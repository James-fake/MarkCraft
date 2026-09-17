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

---

# §7 批 2 执行记录：盲区扫描（2026-09-17 · **只扫不删** ✅）

> 工具：`.workbuddy/deadcss-batch2.mjs`（可达性 + 任意前缀类名 + 库命名空间三层过滤）
> 原始输出：`.workbuddy/deadcss/batch2-report.log`
> 本批**零删除、零改动**。产出是清单与判据。

## 7.1 盲区的真因：不是「漏扫了文件」，是「前缀把文件挡在正则之外」

§6.2 把盲区描述成「12 个文件从未被扫描」。实际复核后更准确的表述是：

批 1 扫描器的类名提取正则是 `\.((?:aurora|mc)-[a-zA-Z0-9_-]+)` —— **硬要求 `aurora-` / `mc-` 前缀**。
而盲区文件里的类名是 `.tiptap-*` / `.kb-*` / `.cv-*` / `.vh-*` / `.markdown-preview` / `.code-block-*` / `.hover-*` / `.material-*` …
**全部不带这两个前缀** → `deadcss-scan.mjs` 即使遍历到了这些文件，也一条类名都提取不出来。

所以盲区 = **「前缀 namespace 之外的一切」**，不是「目录之外的一切」。这条修正很重要：只要项目继续引入非 `aurora-`/`mc-` 前缀的新类名族，同样的盲区就会再次出现。

## 7.2 第一层产出：可达性（比死类清单更值钱）

入口确认：**项目没有 `src/main.tsx` / `src/App.tsx`**，`index.html` 的 `<script type="module">` 直接指向 `src/aurora/aurora-main.tsx` —— Aurora 就是唯一真实应用。

从入口做静态 import 闭包（含 CSS 的 `@import` 链）：**26 / 28 个 CSS 文件可达**。**2 个孤儿**：

| 文件 | 行数 | 证据（全部静态可证） |
|---|---|---|
| `src/features/canvas-v2/components/canvas.css` | **295** | ① 全仓零 `import` 该文件（canvas-v2 目录内只有 `excalidraw-hide-ui.css` 被 import）；② 其 25 个 `.cv-*` 类零 TS 消费者；③ `AutoLayoutPanel.tsx` 实际走 **内联 style + `var(--cv-*)` 变量**，不依赖这些类；④ `canvasTheme.ts` 的 `injectCanvasTheme()` **只注入变量块**，不注入本文件 |
| `src/index.css` | **11** | 纯 `@import` 聚合器，全仓零引用（aurora-main 已逐个 import 同名文件，`:15`–`:23`）。属历史入口残留 |

⚠️ **迁移风险**：`canvasTheme.ts:110` 有一条
`html[data-density="comfortable"] .cv-pill-btn { … }`
它指向的正是**孤儿文件里的类** —— 因为该文件从未加载，这条注入规则**恒不生效**。删 `canvas.css` 时必须一并处置它，否则留下一条永久空转的规则（现在的状态是「半死」）。

## 7.3 死类清单（**124 类 / ≈860 行**）

扫描器口径 126 类 / 877 行；扣除 2 条厂商隐藏规则（见 7.4③）后为 **124 类 / ≈860 行**。

| 文件 | 行数 | 死类 | 纯死块 | 混合块 | 涉行 |
|---|---|---|---|---|---|
| `src/styles/mermaid.css` | 1233 | **34** | 41 | 7 | 331 |
| `src/features/canvas-v2/components/canvas.css`（孤儿）| 295 | **19** | 29 | 5 | ≈165 |
| `src/features/knowledgeBase/kb-ui.css` | 633 | **56** | 70 | 27 | 151 |
| `src/styles/components.css` | 252 | **7** | 23 | 6 | 111 |
| `src/styles/tiptap.css` | 1295 | **4** | 7 | 3 | 64 |
| `src/styles/syntax.css` | 246 | **2** | 3 | — | 29 |
| `src/styles/desktop-chrome.css` | 281 | **2** | 3 | — | 11 |
| `src/styles/markdown.css` | 466 | 0 | — | — | 干净 |
| `src/features/editor/versionHistory.css` | 331 | 0 | — | — | 干净 |
| `src/features/canvas-v2/engine/excalidraw-hide-ui.css` | 83 | 0 | — | — | 全库类，保护 |
| `src/styles/base.css` / `scrollbar.css` / `fonts.css` | 280 | 0 | — | — | 元素选择器为主 |

**按族看，成因高度集中（4 个族占 109 / 124 类）：**

| 族 | 类数 | 成因 |
|---|---|---|
| `kb-*` 旧代 | 56 | KB 面板迁 Aurora 后，旧「外壳 + 工具层」被 `aurora-kb-*` 取代（`kb-h1`→`kb-h2`…、`kb-card`→`aurora-kb-card`、`kb-kb-grid`→`aurora-kb-kbcard`、`kb-note-*`→`aurora-kb-notes*`）。**现役内嵌组件层**（`kb-searchpanel-*` / `kb-modal` / `kb-btn` / `kb-result-*` / `kb-match-*` …）仍活 |
| `math-*` 旧代 | 25 | `MathPopover.tsx` 换了实现：新代 `math-popover-tab-btn` / `-group-tabs` / `-symbol-*` / `-template-*`；旧代 `math-popover-tabs/title/footer/insert-btn/hint` + `math-symbols-*` + `math-templates-*` + `inline-math-preview*` 全废 |
| `.cv-*` 孤儿族 | 19 | 见 7.2 |
| `plantuml-* / mermaid-rendered / lint-marker / line-number*` | 10 | 渲染状态改用 **`data-rendered` 属性**而非 `-rendered` 类；行号渲染迁 CodeMirror 内置 gutter（`.cm-lineNumbers`）；lint 类名迁为 `lint-line-marker` |

## 7.4 四个假阳性陷阱（本轮主要方法论产出，全部在 node_modules 里实锤）

**① 模板前缀必须限定在 `className` 上下文 —— 这条坑掩盖了 56 个真死类**

`src/stores/kbTypes.ts:94` 有一个 ID 生成器：

```ts
return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
```

它产出的裸前缀 `kb-` 被当成「类名前缀模板」，于是 `kb-ui.css` 里**整个 `kb-*` 命名空间（66 类）全部被判为「疑似动态」** —— 一个与 CSS 毫无关系的 ID 生成器，把本批最大的一块死代码整片藏了起来。

修法：抽取模板前缀前，先看反引号**前 120 字符**有没有 `className | classList | clsx | cn( | class=` 之类上下文，无则丢弃。
批 1 没踩到这个坑，纯属运气：`aurora-` / `mc-` 前缀恰好没有裸前缀 ID 生成器。

**② 库的「作用域后缀」类** —— `node_modules/highlight.js/lib/core.js:122`：

```js
const scopeToCSSClass = (name, { prefix }) => { … `${x}${"_".repeat(i + 1)}` … }
```

即 hljs v11 在运行时给 `<span>` 同时挂 `hljs-*` 与 `function_` / `language_` / `class_` 这类**下划线后缀**类。它们只以复合选择器形态出现（`.hljs-title.function_`），单看类名完全像我们的类。

**③ 库的 DOM 类（在 node_modules 实锤）**

| 来源 | 类名 |
|---|---|
| `@tiptap/extension-table` | `selectedCell` / `column-resize-handle` / `tableWrapper` / `resize-cursor` |
| `@tiptap/extension-placeholder` | `is-editor-empty` |
| `@excalidraw/excalidraw` | `layer-ui__wrapper` / `Tooltip__label` / `dropdown-menu` |
| KaTeX | `minner` / `katex-display` |
| tldraw（`.tl-` 前缀）| `tl-toolbar` / `tl-watermark_SEE-LICENSE` —— 出现在孤儿 `canvas.css` 里，是**厂商水印/工具栏隐藏规则**，非死 |

⚠️ **反向坑**：`katex-inline-wrapper` / `katex-display-wrapper` **是活类**（由 `src/features/shared/utils/mathRenderer.ts:151/167/169` 生成）—— 它们只是"长得像库类"。前缀豁免若写成 `/^katex/` 会把这两个真相干的类一起埋掉。正确写法是精确匹配 `^katex$|^katex-(display|html|mathml|version|error)$`。

**④ 超串陷阱的第三形态：** 一个**死类**恰是**活类的真前缀**（与批 1 的"父活子死"方向相反）

| 死 | 活 | 说明 |
|---|---|---|
| `.tiptap-math-inline` | `.tiptap-math-inline-katex` | DOM 只有后者 |
| `.lint-marker` | `.lint-line-marker` | 生成处只有后者 |
| `.hover-bg` | `var(--hover-bg)` / `--cv-hover-bg` | 后者是 **CSS 变量**不是类 |

## 7.5 两处「不只是死代码」——单列，本批不删

**(a) `.tiptap-math-inline` 疑似命名错位（失效样式，非纯死）**

`tiptap.css:456` / `:470`（含 light 变体）给 `.tiptap-math-inline` 定样式；而 DOM 侧只有 `EditableNodeView` 的 `editable-node` 包装 + 内层 `tiptap-math-inline-katex`（`MathInlineNodeView.tsx:19`）。
→ 这两条规则**从未生效**。删掉是安全的（无视觉变化），但如果原意是给行内公式容器加样式，那它是**一个待修的 bug**而非垃圾。
**处置建议**：标注为「失效样式」，先不删，等与作者确认意图。

**(b) `desktop-chrome.css` 的「覆盖陷阱」与已死 token**

- 它是**有意的第二层 `:root`**（文件注释明写「仅追加…同名 token 在此覆盖」），且 `aurora-main.tsx` 的加载顺序 `:5 tokens.css → :16 desktop-chrome.css` 保证它**后加载**。
- 当前 `--mc-accent` 两边同为 `#7C8CFF`（`tokens.css:46` / `desktop-chrome.css:74`），**无可见分歧**；但**改 tokens.css 不生效**（被后加载者覆盖）。这正是本项目反复出现过的「双源」坑。
- **纯死 token（0 引用）**：「方案 A 桌面转型」契约中的尺寸族 `--mc-spine-w` / `--mc-dock-h` / `--mc-dock-radius` / `--mc-rightpanel-*` / `--mc-hover-surface` —— Spine56 / Dock44 / RightPanel280 已被 Aurora 外壳（MenuBar + Sidebar + StatusBar）取代。
- 4 个 `.material-*` 类中：`material-sidebar`（`FileTree.tsx:309`）/ `material-popover`（`EditorContextMenu` / `TableContextMenu`）**活**；`material-solid` / `material-hud` **死**。

## 7.6 判死口径（批 2 版 · 比批 1 厚一层）

```
① 定义存在（CSS 里真的定义了该类）
② 无字面量消费者（src/**/*.{ts,tsx}，排除 .test，**词边界 token** 匹配）
③ 不落在模板字面量前缀下（**且该前缀必须来自 className 上下文**）← 本批新增
④ 不属库命名空间（前缀类 / 作用域后缀类 / 选择器级库上下文）    ← 本批新增
⑤ 可达性：该 CSS 文件确实在 Aurora 加载闭包内（否则不是"死类"而是"孤儿文件"）← 本批新增
```
`③` 与 `④` 是本批踩出来的；`⑤` 是把"孤儿文件"从"死类"里分离出来的关键层。

## 7.7 建议的下一轮切分（批 2.5 / 批 3）

| 组 | 内容 | 类数 | 行数 | 风险 | 前置条件 |
|---|---|---|---|---|---|
| **2.5-A** | 删 2 个孤儿文件 + 处置 `canvasTheme.ts:110` 空转规则 | — | ≈306 | **最低**（死文件，零消费者）| 需先与作者确认 canvas-v2 视觉路线 |
| **2.5-B** | `mermaid.css` 数学旧代 25 类 + `plantuml/mermaid/lint/行号` 10 类 | 35 | ≈331 | 低 | 命中 7 处混合块 → 需成员级摘除 |
| **2.5-C** | `kb-ui.css` 旧代 56 类 | 56 | ≈151 | 中 | 命中 **27 处混合块**（新旧代同块）；且 **10 类仅测试引用** → 须先把 `kbDensity.test.ts` / `pointerGating.test.ts` 的断言升级为「零定义」 |
| **3** | `components.css` 工具类 7 + `syntax.css` 行号 2 + `desktop-chrome.css` 2；`tiptap-math-inline` 待定性 | 11 | ≈151 | 低–中 | (a) 命名错位待作者确认 |
| **3.5** | `desktop-chrome.css` 死 token 族 + 覆盖陷阱收敛 | — | — | 中 | 与前一轮「死 CSS」不同性质，建议**独立成题**（token 单源治理）|

**一句话**：批 2 的最大产出不是"又找到 860 行"，而是**三条判据的补厚**（③ 上下文限定的模板前缀 / ④ 库命名空间 / ⑤ 可达性）—— 缺任一条都会出错，且错的方向不同（③④ 会**误杀活类**，⑤ 会**把孤儿误报成死类**）。

---

# §8 批 2.5-A 执行记录：孤儿文件清剿（2026-09-17 已落地 ✅）

## 8.0 本轮最值的一条（方法论）

> **「零 import」是删**文件**的判据，「零消费者」是删**成员**的判据 —— 两者不可互替。**
> 而「零 import」必须用**可达性闭包**求，不能用 grep 计数：`src/index.css` 自己零引用，但它聚合的 9 个文件全在入口里（它是**冗余**）；反过来 `canvas.css` 既零引用、其成员也零消费者（它是**废墟**）。同是「零 import」，一个是冗余、一个是孤儿 —— 处置相同，但**理由必须分清**，否则守卫会写错（前者只需删文件，后者还需处置消费侧的悬空引用）。

## 8.1 落地清单

| 动作 | 对象 | 量 |
|---|---|---|
| 删文件 | `src/index.css`（重复聚合器） | −10 |
| 删文件 | `src/features/canvas-v2/components/canvas.css`（孤儿） | −294 |
| 移除空转规则 | `canvasTheme.ts` 的 `CANVAS_DENSITY_OVERRIDE` 中 `.cv-pill-btn { height:38px; … }` | −5 |
| 改测试断言 | `canvasTheme.test.ts`（改断 `.canvas-v2-root` + 反向断 `.cv-pill-btn` 不存在） | +4/−1 |
| 守卫同批 | `deadCssPurge.test.ts` 新增「孤儿 CSS 文件清剿（2.5-A）」6 例 | +52 |
| 文档标注 | `aurora/docs/design/05-canvas-panel.md §11` | +5/−1 |

**净删除 304 行**，零新增依赖、零功能变更。

## 8.2 判定「可整文件安全删除」的三条判据

1. **可达性**：项目**没有 `src/main.tsx`**，`index.html` 的 module script 直指 `src/aurora/aurora-main.tsx`。以其做 import 闭包 → 28 个 CSS 中 26 可达、**2 个孤儿**。
2. **不冗余性**：`src/index.css` 聚合的 9 个文件在 `aurora-main.tsx:15-23` **各有独立的真实 import** ⇒ 删聚合器**不改变任何加载路径**。
3. **无消费者**：`canvas.css` 的 19 个 `.cv-*` 类在全仓 TS/TSX **零引用**；`engine/*.tsx` 的 className 只剩 `excalidraw-canvas-host` / `note-card-md`。引擎亦已收敛 —— `canvasPersistence.ts:4` 明写「引擎收敛后底层只有 CanvasEngine（Excalidraw 混合架构）一种实现」，`package.json` **无 tldraw 依赖**（`tl-*` 仅存在于 `@tldraw/state` 这个 atom 库与注释里）⇒ `.tl-container` / `.tl-toolbar` / `.tl-watermark_SEE-LICENSE` 三条 tldraw 覆盖规则**全部失效**。

## 8.3 为什么「删孤儿文件」必须连带处置 `canvasTheme.ts:110`

`.cv-pill-btn` 的**唯一定义处**就是被删的 canvas.css，而它的消费者同时缺席（零 DOM）⇒ **定义与消费者双缺**，这条注入规则是恒不生效的 no-op。
留着它 = 留一个**指向已删文件的悬空引用**，且会让下一个读代码的人误以为「顶栏按钮有密度联动」。

## 8.4 连带发现：`--cv-*` 变量的**三源**与断链（独立决策项，**本轮不修**）

| 源 | 选择器 | 状态 |
|---|---|---|
| `styles/base.css:44-68 / 138-162` | `:root`（暗/亮各一套，注释「知识库组件专用变量（Canvas View 系列）」） | ✅ **唯一真正生效**，24 个变量 |
| `canvasTheme.ts` 的 LIGHT/DARK 注入 | `.tl-container, .canvas-v2-root` | ❌ **死选择器** —— 两者均无 DOM |
| `canvas.css` 的 `@media` 断点 | `.cv-root, .tl-container, .canvas-v2-root` | ❌ 随文件删除失效（且它覆盖的 `--cv-rail-w` / `--cv-topbar-h` **本身也零消费者**） |

**后果**：`canvasTheme` 独有的约 25 个变量（`--cv-card-border` / `--cv-card-border-selected` / `--cv-card-shadow*` / `--cv-accent-soft` / `--cv-toolbar-bg` / `--cv-toolbar-border` / `--cv-drawer-bg` / `--cv-overlay-bg` / `--cv-hover-bg` / `--cv-active-bg` / `--cv-meta-bg` / `--cv-radius-*` / `--cv-space-*` / `--cv-elev-*` / `--cv-dot-grid` …）**全程未定义**，
而 `OverlayCards.tsx`（27 处）、`KanbanView.tsx`（22）、`TimelineView.tsx`（19）、`AutoLayoutPanel.tsx`（18）、`MindMapView.tsx`（10）等 **8 个文件**正以**无 fallback** 的 `var(--cv-*)` 消费它们。

**真机实锤**（`probe-deadcss-batch2.5a.mjs`，四视图一致）：

```
ℹ️ 变量活性：base.css 系 5/5 有值（--cv-bg --cv-card-bg --cv-text-main --cv-text-secondary --cv-accent）
ℹ️ 变量断链：仅 canvasTheme 系 0/5 有值 —— 全部为空 ⇒ 注入从未生效
ℹ️ 注入 style #canvas-v2-theme 存在=false · 宿主类 DOM 计数：.canvas-v2-root=0 · .tl-container=0
```

另：`injectCanvasTheme()` 全仓**零调用点**（唯一调用者 `watchThemeChange` 自身也零调用）→ 连 `<style id="canvas-v2-theme">` 都从未被创建。

**修法（待拍板）**：把注入选择器改挂 `:root`，或在真实宿主元素上挂 `.canvas-v2-root`。**这会改变白板浮层的实际观感**，故不属「死代码清剿」，单列。
同时意味着：§11 所记「§18 桌面原生对齐」中，凡靠 `canvasTheme` 令牌承载的那几项（实心 `--cv-toolbar-bg`/`--cv-drawer-bg`、圆角 4/8/12、`--cv-card-shadow*`/`--cv-elev-*` 归 none）**实际从未生效**。

## 8.5 真机取证（`probe-deadcss-batch2.5a.mjs`，四视图）

**取证目标是证明「删它不可能改变渲染」**，三重闭环：
① 源码零 import → ② Vite dev **不做 tree-shaking**，只要进了模块图，CSS 必以 `style[data-vite-dev-id]` 下发（本项目已有此经验：ui.css 经 barrel 间接下发）→ ③ 实测该指纹 **0 命中**。

```
✅ 外壳渲染就绪：.aurora-sidebar-item ×8（四视图：欢迎页/白板12/编辑器256/博客）
✅ CSSOM 读取有效：83 表 / 605200 字符（防"空扫描假绿"）
✅ 孤儿文件未进模块图：dev style 标签 28 个，其中孤儿 CSS 指纹 0 个
✅ 已删规则在 CSSOM 零命中（.cv-* / .tl-*）
✅ 反向护栏：5 个活选择器仍在 CSSOM
ℹ️ 画布宿主尺寸：1171×508 px（非 0 ⇒ 未塌陷）
✅ 零新增错误（另 1 条为已知预存，批 1 A/B 已定性，非本轮引入）
```

⚠️ **本轮踩到一个真陷阱**：探针初版用**固定 `sleep(3000)`** 等页面 → 读到**白屏**，而白屏下「CSSOM 零命中」「孤儿文件未出现」会**全部假绿**（`sheets=0` / `sidebar×0`）。
拦住它的是 `CSSOM 读取有效：sheetCount>3 && cssLen>10000` 这条自检 —— **「零命中」类断言必须先证明「扫描面非空」**。
正解：**就绪轮询** `sidebar-item.length>0 && styleSheets.length>8`，而非固定睡眠（Vite dev 首载 Aurora 700+ 模块需数十秒）。

## 8.6 守卫同批交付（`deadCssPurge.test.ts` 新增 6 例 → 合计 96 例全绿）

- **文件级**：两个孤儿文件 `existsSync === false`。
- **反向护栏 ×2**：① `index.css` 聚合的 9 个样式仍各有真实加载点（证明它是**冗余而非必需**）；② **同名活文件 `aurora/styles/panels/canvas.css` 仍在**。
  ⚠️ 仓内**有两个 `canvas.css`** —— 按 basename 匹配会张冠李戴，本组一律用**完整相对路径**。
- **CSS 回流**：`.cv-*` 前缀锚（`/\.cv-/`）+ `.tl-container` / `.tl-toolbar` / `.tl-watermark` 三条；锚点**内建自检**（`--cv-bg: #ffffff;` 不命中 ⇒ 变量不是类）。
- **有意不做 code 侧断言**：`canvasTheme.ts` 注释里仍会出现这些类名、`.tl-container` 还留在注入字符串中待决策 → 加了会误红。等 §8.4 落地后再补。

**负向验证**：恢复 2 个文件 + 造 `.cv-pill-btn` / `.tl-toolbar` 样本 → **4 项精确报红** → 撤除后静态守卫 67 passed；全量 vitest **1320 passed / 2 skipped / 0 failed**，tsc 干净。

---

# §9 批 2.5-C 执行记录（2026-09-17 已落地 ✅）

**命题**：`src/features/knowledgeBase/kb-ui.css` 的 **66 个零承载者类**成员级清剿。

## 9.0 为什么 2.5-A 与 2.5-C 不可互替（方法论）

| | 2.5-A | 2.5-C |
|---|---|---|
| 对象 | **孤儿文件**（零 import） | **成员**（文件仍在加载闭包内） |
| 判据 | 可达性闭包：不可达 = 整文件候选 | 词边界 token：零承载者 = 成员候选 |
| 处置 | 删**整个文件** | 删**成员**，文件留下 |
| 做错的代价 | — | 对活文件做整文件删 → 面板直接崩 |

`kb-ui.css` 可达（← `panels/kb/KbPanel.tsx`），但 116 类里只有 46 类有真实承载者。
**「文件可达」≠「文件里每个类都活」** —— 这是本轮与 2.5-A 的分水岭。

## 9.1 落地清单（净 −267 行，116 类 → 46 类）

| 文件 | 变化 |
|---|---|
| `src/features/knowledgeBase/kb-ui.css` | 632 → 362 行，删 66 类 + 3 个 `@media` 空壳 + 2 个孤儿 `@keyframes` + 族注释 |
| `src/aurora/styles/tokens.css` | 指针门控块内两条**悬空选择器** `.kb-kbcard:hover` / `.kb-note:hover` 移除；抬头注释的名录同步校正 |
| `src/features/knowledgeBase/kbDensity.test.ts` | **断言升级**（见 9.3） |
| `src/aurora/styles/pointerGating.test.ts` | **B 组 → A 组迁移**（见 9.3） |
| `src/aurora/styles/deadCssPurge.test.ts` | 新增 66×2 自动生成断言 + 32 条反向护栏 + 4 组锚点自检（96 → 243 例） |

**集合差取证**（比 `git diff` 行数可靠）：`git show HEAD:<f>` 与工作区各抽类名 → 差集
**删 70 / 增 0**，其中 66 = 守卫声明项，另 4 个（`is-collapsed` / `is-empty` / `ok` / `err`）
是**只附在已删属主上**的状态/限定类，随属主一并消失 —— 属预期连带，非误删。

## 9.2 三类连带处置（同批交付，最易漏）

1. **消费侧悬空引用（跨文件）**：`tokens.css` 的指针门控块里有两条订着 `.kb-kbcard:hover` /
   `.kb-note:hover` 的规则。类删了、规则还在 = 死选择器常驻。**必须同批清**，否则守卫
   自己的 A 组断言（「全仓 CSS 零定义」）会立刻变红 —— 这也正是它该起的作用。
2. **孤儿 `@keyframes`**：`kbFadeUp`（引用者 `.kb-stat` / `.kb-kbcard` 全删）、
   `kbSpin`（`.kb-spin` 已删）。**块解析抓不到 `@keyframes`（无类名）**，须单独按
   `animation:` 引用计数判定。`kbShellIn` / `kbTabIn` / `kbPop` 仍有活引用，保留。
3. **`@media` 空壳**：`max-width: 820px`（仅 `.kb-grid-2`）、`860px`（整个 `.kb-nav` 族）、
   `620px`（全为已删类）→ 三块删到空，须**连容器一起删**，否则留下空 `@media`。

## 9.3 「仅测试引用」10 类：先升级断言，再删（本轮最值的一条）

批 2 扫描出 10 个类**只在 `.test.ts` 里出现**：`kb-topbar` / `kb-manage` / `kb-nav` /
`kb-nav-item` / `kb-content` / `kb-stat` / `kb-kbcard` / `kb-tpl-card` / `kb-note` / `kb-row`。

**它们不是活类，是「测试制造的维护假象」**：两侧断言把旧整窗外壳类名当成
「密度载体 / 门控成员」来验，让死类名看起来**被测试覆盖**，从而躲过清剿。

| 测试 | 旧断言（护着死类） | 升级后 |
|---|---|---|
| `kbDensity.test.ts` | 密度载体 = `.kb-topbar` `.kb-nav` `.kb-nav-item` `.kb-content` `.kb-manage` `.kb-row` | 改指 **6 条真实载体**：`.kb-btn` `.kb-icon-btn` `.kb-searchpanel-top` `.kb-searchpanel-filter` `.kb-searchpanel-list` `.kb-result-head` |
| `pointerGating.test.ts` | `cases` 收 `.kb-kbcard:hover` / `.kb-note:hover`；`retiredButAlive`（B 组，断言「有定义」）含 `kb-stat` `kb-tpl-card` | `cases` 摘掉两条；`kb-stat` `kb-tpl-card` **迁入 A 组**（断言「零定义」）；B 组只剩 `aurora-card--hoverable` |

⚠️ **迁组是升级，不是放宽**：B 组断言「仍有定义」，会在删除时变红并提示迁移；
A 组断言「全仓零定义」，强度更高。测试文件里的那段说明本身就是这条迁移路径的
**自述文档** —— 本轮只是照着走。

## 9.4 真机取证（`probe-deadcss-batch2.5c.mjs`，五视角）

`kb-ui.css` 仍在渲染路径上，所以验证不只是"删干净了"，更要证明"**没删错**"。

```
视角 默认 / editor / blog / kb(管理) / kb-detail
✅ CSSOM 读取有效：83 表 / 587743 字符（防"空扫描假绿"）
✅ kb-ui.css 仍在模块图（本批是成员级删，文件须保留；dev style 28 个）
✅ 66 个已删类在 CSSOM 零命中 / 在 DOM 零命中          （删干净了）
✅ 反向护栏：26 个活类仍在 CSSOM
✅ .aurora-kb.kb-shell 复合覆盖仍生效：contain=paint      ← 最强信号
✅ 外壳已收回文档流：position=relative / z-index=auto
✅ --kb-* 令牌链有值：primary=#7C8CFF border=#292E30 glass=#1A1C24 radius=8px
ℹ️ 令牌重映射对照：:root --mc-accent=#7C8CFF → .kb-shell --kb-primary=#7C8CFF
✅ .kb-shell 几何正常：1185×560 px @top=42（非 0 ⇒ 未塌陷/未铺满视口）
✅ KB 二级栏渲染：1185×52 px（= --mc-subbar-h，未被密度误伤）
ℹ️ 搜索面板 DOM：.kb-searchpanel ×1（搜索子标签已激活）
✅ 零新增错误 / 零未捕获异常 / 零 Log error
```

**为什么盯 `contain: paint`**：它由 `panels/kb.css` 的复合选择器 `.aurora-kb.kb-shell`
（权重 0/2/0）设置，同时依赖「kb-ui.css 的 `.kb-shell` 还在」+「kb.css 的复合块还在」
**两侧**。任一侧被误删，`contain` 立刻不再是 `paint`，而面板会重新铺满视口、被侧栏
与顶栏裁切（历史事故，见 kb.css 注释）。这是本批唯一能同时验证两侧的**单点信号**。
令牌链同理：`--kb-primary` 实测 `#7C8CFF` 与 `:root --mc-accent` **相等**，
证明「Aurora 的 `--mc-*` 重映射」仍压过 kb-ui.css 的浅色 fallback。

**深链限制（新踩到）**：`#view=` **只携带视图名**（`viewState.ts` 用
`location.hash.slice('#view='.length)` 直取 `MainView`），kbId **不在 hash 里**
⇒ 进 KB 详情只能**真实点击库卡片**。而全新 profile 的 IndexedDB 是空的 → 管理页空态
→ 无卡片可点 ⇒ 探针必须先**真实走一遍「新建知识库」**（点空态按钮 → 弹窗 →
原生 setter + `input` 事件填受控 input → 点「创建知识库」）。

## 9.5 守卫同批交付 + 负向验证（13/13）

`deadCssPurge.test.ts`：66 项**自动生成**正反两套断言（CSS 侧 + code 侧），
外加——**保留类反向护栏 32 例** / **令牌源 2 例** / **孤儿关键帧 2+3 例** /
**门控块净化 1 例** / **锚点自检 4 例** / **清单规模锚定 1 例**。

⚠️ **锚点必须处理「死类是活类的真前缀」**：
`kb-content` 是**活类** `kb-content-inner` 的真前缀，而本文件其它组惯用
`\.name(?![a-zA-Z0-9])`（尾部允许 `-` 以网住 BEM 后代）→ 会命中活类 ⇒ 断言恒真 = **假绿**。
故对 `kb-content` / `kb-pop` 改用「**精确排除已知活扩展**」`(?!-inner)` / `(?!-mask)`：
既保住 BEM 后代覆盖（`.kb-content__body` 仍被网住），又不误伤活类
（`.kb-content-inner__x` 也不误伤 —— 排除写的是**裸后缀**，护住整个分支）。

**负向验证 13 组注入全部精确报红，且 6 个关联文件逐字节零残留**。它抓到 **3 个真守卫缺陷**：
1. 门控块净化正则写成 `\bkb-[\w-]*\s*(?=[,{])` → 漏掉 `.kb-kbcard:hover,`（`[\w-]*` 停在 `:` 前，
   `\s*` 又要求紧跟分隔符）⇒ **恒绿**。改为允许伪类后缀 `\.kb-[\w-]*(?::[\w-]+)*\s*[,{]`。
2. `kb-shell 仍是 --kb-* 令牌源` 用 `toContain('--kb-text')` → 被 `--kb-text-main:` **满足**，
   令牌真被掏空也照样绿。改为断言**声明** `toContain('--kb-text:')`。
3. 两处负向样本自身太弱（`.kb-content-inner` 有 2 处、`.kb-shell` 有 10 处出现，
   只改第一处时守卫**本就不该报红**）→ 样本必须**整类抹除**。

**教训**：守卫最常见的失败不是「漏检」而是「**断言写瞎后恒真**」。
只有注入回归看它红不红，才能区分「守卫通过」与「守卫根本没在工作」。
另：负向脚本用 `vitest -t "<用例名>"` 定向跑时，**`-t` 是正则** —— 用例名里的
`kb-*` 会被当量词，导致整条匹配不上、243 例全 skip 而**假绿**。过滤串必须避开 `*`。

## 9.6 回归与提交

- 全量 vitest：**112 文件 / 1499 passed / 2 skipped / 0 failed**（本轮 +179 例）
- `tsc --noEmit`：干净
- 真机：`PROBE_RC=0`
- 提交 `style(kb): 清剿 kb-ui.css 66 个死类（116→46）+ 消费侧悬空引用处置 · 2.5-C`

## 9.7 后续可选（未动）

| 项 | 内容 | 主要风险 |
|---|---|---|
| **3.5** | `desktop-chrome.css` 死 token + `components.css` 7 类 | token 单源治理，非纯删；**本轮已为它备好一条输入**：清剿后 `--kb-*` 里出现仅剩声明、无消费者的令牌（如 `--kb-radius-pill` / `--kb-bg-card` / `--kb-warning-*`），属 3.5 的采集面 |
| **批 3** | `aurora-editor` 23 类旧自绘 DOM | 需先建 L3 真机采集器 |
| **2.5-B** | `mermaid.css` 35 类（含 7 处混合块） | 与 2.5-C 同型，可直接复用本轮全套脚本与判据 |
| **断链题** | `canvasTheme.ts` 注入选择器改挂 `:root` | 会改白板浮层观感，待拍板（§8.4） |
