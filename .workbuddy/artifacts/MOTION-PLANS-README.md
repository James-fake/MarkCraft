# MarkCraft 动效优化计划 · 索引（2026-09-14）

- **审计报告**：[`MOTION-AUDIT-2026-09-14.md`](./MOTION-AUDIT-2026-09-14.md)
- **基线 commit**：`075821f`
- **审计基准**：`emilkowalski-skills`（improve-animations / apple-design）+ `macos-design-guidelines`

---

## 总评

MarkCraft 的动效系统完成度**远超一般生产代码库**，已内化 Apple *Designing Fluid Interfaces* 的核心要义
（速度交接、软回弹、进出不对称、原点感知、材质化、区分出入场的 reduced-motion）。
**「是否符合 Apple 交互动画效果」= 核心机制符合，部分超出。**

零违规项：`scale(0)` 零处、UI 入场误用 `ease-in` 零处、reduced-motion 超规格。
残余问题均为**工程收尾**性质，非理念缺失。

---

## 计划清单与执行顺序

| 顺序 | 计划 | 问题 | 严重度 | 风险 | 文件 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| **1** | [`MOTION-PLAN-01-hover-gating.md`](./MOTION-PLAN-01-hover-gating.md) | 312 处 hover 零指针门控 | HIGH | 低 | `tokens.css` | ✅ **已完成** |
| **2** | [`MOTION-PLAN-04-press-feedback.md`](./MOTION-PLAN-04-press-feedback.md) | 主按钮族缺 `scale(0.97)` 按压反馈 | MEDIUM | 低 | `components.css`、`panels/blog.css` | ✅ **已完成** |
| **3** | [`MOTION-PLAN-02-compositor-props.md`](./MOTION-PLAN-02-compositor-props.md) | `left`/`height` 布局属性动画 | HIGH | 中 | `blog.css`、`BlogPanel.tsx` | ✅ **已完成**（改动 B 取消·死代码） |
| **4** | [`MOTION-PLAN-03-command-palette.md`](./MOTION-PLAN-03-command-palette.md) | ⌘K 面板 200ms 入场（100+/天 应零动画） | MEDIUM | 低 | `command-palette.css` | ✅ **已完成** |

### 依赖关系
- **01 与 04 可并行**（改不同文件段，无交集）。
- **02 需在 01 之后**：01 新增的全局 media 块会改变 hover 行为，先落地可避免 02 真机验证时
  混淆「停靠位移异常」与「指针门控副作用」。
- **03 独立**，随时可做；但建议放最后，因为它是**理念性删除**，需要用户拍板接受
  「⌘K 不再有任何出现动画」这一体验变化。（已于 2026-09-14 完成。）

### 推荐路径
```
01（指针门控，零风险高收益）
 → 04（按压反馈，纯新增）
 → 02（合成器化，需 Performance 录制验证）
 → 03（去动画，需用户确认体验）
```

---

## 共识前提（执行者须知）

1. **不引入动画库**。项目全程纯 CSS + 原生 Pointer Events，这是既定架构，不要为了 spring 引入 Framer Motion。
2. **不动既定决策**。侧栏/右栏 `width` 过渡、`grid-template-rows` 折叠、视图切换 420ms 纯 opacity
   均为有注释记录的有意选择，已在审计中标为「保留」。要改先问。
3. **不动时长曲线**。`--mc-dur-*` / `--mc-ease-*` 是单源 token，本次审计未发现任何需要调整的 token 值。
4. **全量回归基线**：`848 passed / 3 failed / 2 skipped`
   （3 项已知失败：commandWiring 45vs48、KbPanel「编辑」双匹配、blogCssRefs）。
   任何计划完成后 passed 不得低于基线，failed 不得新增。
   > 滚动基线：`075821f` = 848 → PLAN-01 后 = 868 → PLAN-04 后 = 882 → PLAN-02 后 = 895 → PLAN-03 后 = **906**。

---

## 进度追踪

| 计划 | 完成时间 | commit | 备注 |
| --- | --- | --- | --- |
| 01 | 2026-09-14 | `08685cc` | `tokens.css` 新增门控块；`pointerGating.test.ts` 20 例；CDP 12/12 全绿；全量 868/3/2 |
| 04 | 2026-09-14 | `36e67ec` | `components.css` 5 变体 + `blog.css` 1 变体补 `scale(0.97)`；`pressFeedback.test.ts` 14 例；CDP 19/19 全绿；全量 882/3/2 |
| 02 | 2026-09-14 | （本批） | 改动 A：`blog.css` + `BlogPanel.tsx` 位移改 `translateX`；`blogDockTransform.test.ts` 13 例；CDP 19/19（右贴边 0px 等价）；全量 895/3/2。**改动 B 取消**：目标柱状图是死 CSS |
| 03 | 2026-09-14 | （本批） | `command-palette.css` 删两处 animation + 两个 keyframes；`commandPaletteNoAnim.test.ts` 11 例；CDP 11/11（`animationName=none`、0/250ms 快照一致）；全量 906/3/2 |

---

## 调查中发现的独立治理项（不属动效优化）

> 三项治理项 **已于 2026-09-14 全部收口**：①② 清理完成，③ 经量化证明无需优化。

### ① `aurora-dash-*` 死 CSS（约 380 行）— ✅ **已清理（2026-09-14）**
- **位置**：`src/aurora/styles/panels/canvas.css` 行 824–1151（仪表盘视图）+ 1450–1479（编辑布局）
- **证据**：47 个 `aurora-dash-*` 类名在 `src/**/*.{ts,tsx}` 中**零引用**，
  判定脚本 `.workbuddy/artifacts/probe-dash-css.mjs`（输出「死 47 / 活 0」）
- **成因**：Aurora 演示期仪表盘面板已退役（`src/aurora/panels/dashboard/` 目录不存在），CSS 未同步删除
- **处置**：已删除两区块共 **367 行**（含区块注释头）。删后 `canvas.css` 2190 → 1823 行；
  tsc 干净、全量回归 906/3/2（3 项预存失败不变）。剩余 `.aurora-dash` 字样仅在历史设计文档
  `src/aurora/docs/design/G-间距映射清单-2026-09-06.md`（留作溯源，非代码）。**单独提交，未混入动效提交。**

### ② 仪表盘死组件 — ✅ **已清理（2026-09-14）**
- **证据**：全仓唯一引用 `@features/dashboard` 的是 `GraphPanel.tsx:12` 的 `useDashboardData`（数据 hook）。
  面板本体零引用；`commandWiring.test.tsx:25` 记载 `tools.openDashboard` 命令「已随仪表盘删除」
- **处置**：删除 `DashboardPanel.tsx`（723 行）+ `BookmarkContent.tsx`（270 行）= **993 行**；
  `index.ts` barrel 删除两条死导出（保留 `useDashboardData`）；修正 `useDashboardData.ts` 两处
  指向已删组件的过时注释；`README.md` 项目树同步。tsc 干净、全量 906/3/2。
- **注意**：`useDashboardData` **是活的**（`GraphPanel.tsx` 依赖它做链接健康），未删除

### ③ GraphPanel 每帧 React 重渲染 — ✅ **已量化，结论：无需优化（2026-09-14 复核）**
- **位置**：`src/aurora/panels/kb/GraphPanel.tsx:735-744` `loop(){ step(); bump(); rAF(loop) }`，
  `bump` = useReducer dispatch（行 273）→ 每帧触发 React 重渲染 + SVG reconcile
- **机制澄清**：该 rAF 循环**有终止条件**（`alpha <= 0.01` 且非拖拽 → `runningRef=false` 且不再 rAF），
  不是无限每帧渲染。`tick` 全文件仅被 `byId`（行 1019）消费 → 重渲染成本限定在可接受范围。
- **A/B 重复采样实测**（`probe-graph-ab.mjs`，5 轮 × 2 组，8 节点）：

  | 组 | avg | p95 | max | >33ms 总计 |
  | --- | --- | --- | --- | --- |
  | A 静置期 | 16.62ms | 18.10ms | 46.10ms | 8 |
  | B 拖拽期（模拟运行） | **16.47ms** | **18.30ms** | 21.10ms | **0** |

  **Δavg = −0.15ms，Δp95 = +0.20ms** → 拖拽期无劣化；静置期的高 max 属偶发抖动（A 组 5 轮中 3 轮有尖峰，
  B 组 5 轮全零掉帧）。**当前 8 节点规模无实证退化，不做优化。**
- **⚠️ 方法论教训**：单次采样（`probe-graph-perf.mjs` 首次运行）曾显示拖拽 `p95=37.6ms / max=62.8ms`，
  看似退化——但那是**启动期抖动**且当时图谱是**空库**（`nodes:0`，`svgReady` 抢跑。
  **`svgReady`（SVG 挂载）≠ 数据就绪**）。必须：① 轮询 `.aurora-graph__dot` 数量 >0 再采样；
  ② 多次重复取中位数，单次不足以定论。
- **触发条件**：若图谱涨到数百节点须重测（`probe-graph-ab.mjs` 可直接复用）
- **另注**：`step()` 内 edges 循环用 `nodes.find()`（O(n) 查找）→ 大图时是 O(n·e) 热点，但当前规模无影响
