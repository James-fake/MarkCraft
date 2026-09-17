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
