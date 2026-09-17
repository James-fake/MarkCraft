# MarkCraft 源码结构与优化 · 穷尽式审计报告

> 审计日期：2026-09-17 · 审计视角：Software Architect（架构与可维护性）
> 审计对象：`D:\TracSolo_Project\MarkdownEditor qoder` 整个 `src/` 代码树与根配置
> 基线依据：`.workbuddy/memory/MEMORY.md` 中记录的架构铁律、死代码判据、测试铁律

---

## 0. 执行摘要

### 0.1 整体健康度

| 维度 | 评级 | 结论 |
|------|------|------|
| 分层与依赖方向 | ✅ 良好 | `features/stores/services/hooks` 对 UI 层（`aurora`/`components/ui`）**零反向依赖**，铁律基本守住 |
| 测试体系 | ✅ 健全 | 约 115 个测试文件，vitest **1499 passed / 2 skipped / 0 failed** |
| 配置与构建 | ✅ 健康 | tsconfig / vite 别名体系一致完整；分包策略合理；Excalidraw 资源修复到位 |
| 死代码治理 | ⚠️ 残留 | 已知 2 个零消费者组件、1 个零调用函数、1 处命名分裂待清理 |
| 结构卫生 | ⚠️ 待治 | 设计文档混入 `src/`、构建缓存残留、`features` 内含大量 UI 组件引发架构张力 |
| 单文件体量 | ⚠️ 风险 | 存在 52 个 >600 行文件，最大 `newThemes.ts` 达 **22752 行** |

### 0.2 首要发现（按优先级）

1. **【架构张力·P0】** `features` 层实际承载 **159 个 `.tsx`（占全仓 UI 组件 64%）**，与铁律"UI 落 `src/aurora/`，`features` 是逻辑层"的表述存在偏差。需澄清架构意图：是 feature-sliced 自包含（feature 含 UI+逻辑）还是越界？
2. **【死代码·P0】** `components/ui` 的 `Input.tsx`、`EmptyState.tsx` **零真实消费者**（仅桶导出使其进模块图）。
3. **【死函数·P1】** `canvasTheme.ts` 的 `injectCanvasTheme()` **零运行时调用**，其注入的 25 个 `--cv-*` 变量全程未定义、8 个 canvas-v2 文件无 fallback 消费（MEMORY 🔴 待决）。
4. **【命名分裂·P1】** `backupService.ts` 同时存在于 `services/` 与 `features/export/`，两者职责不同但同名，易混淆。
5. **【结构卫生·P1】** `aurora/docs/design/` 20 份设计/审计 md 混入 `src/` 代码树；根目录 8+14 份 vite/vitest `*.timestamp-*.mjs` 构建缓存残留（已被 .gitignore 忽略，仅本地整洁问题）。
6. **【配置冗余·P2】** `@workers` 别名在 tsconfig/vite 配置但**零引用**（悬空死配置）。

---

## 1. 审计范围与方法

**范围**：`src/` 全量（717 文件）+ 根目录构建/配置文件。

**方法（穷尽式 = 全量静态扫描 + 结构化核查，非逐行阅读 717 文件）**：
- 用受管 Node 编写结构扫描器（`scripts/_audit_scan.cjs`、`scripts/_audit_tree.cjs`）遍历全树，输出文件计数、按层分布、重名文件、超大文件清单。
- 用 Grep 工具分维度扫描 import 方向：`features|stores|services|hooks` → `aurora|components/ui` 的反向依赖；已知死代码（EmptyState / Input / injectCanvasTheme / backupService / ToastProvider）的引用闭包；`@workers` 悬空别名验证。
- 逐项核验 MEMORY 中登记的待决项（死代码判据、命名冲突）。
- 读取 `tsconfig.json` / `vite.config.ts` / `.gitignore` 评估配置健康度。

**扫描面非空声明**：本报告所有"零引用 / 零调用"结论，均通过对 `src/` 全量 Grep 与可达性闭包得出（非抽样）。

---

## 2. 项目结构全景

### 2.1 总体统计

```
总文件数：717
  .ts   408
  .tsx  263   ← 其中 UI 组件分布：aurora 74 / features 159 / components/ui 16
  .css   26
  .md    20   ← 全部位于 aurora/docs/design/（设计文档）
```

### 2.2 顶层目录职责矩阵

| 目录 | 文件数 | ts | tsx | css | 职责定位 | 评估 |
|------|-------|----|-----|----|---------|------|
| `src/features` | 475 | 313 | 159 | 3 | 业务模块（逻辑 + 大量 UI） | ⚠️ 含 UI，与铁律张力 |
| `src/aurora` | 143 | 36 | 74 | 13 | **真实运行界面**（外壳/面板/样式） | ✅ 合规 |
| `src/stores` | 24 | 11 | 13 | 0 | 状态层（Dexie/IndexedDB） | ✅ |
| `src/components` | 20 | 3 | 16 | 1 | 基础 UI 库（`components/ui`） | ✅ |
| `src/locales` | 12 | 12 | 0 | 0 | 国际化 | ✅ |
| `src/services` | 11 | 11 | 0 | 0 | 服务层（备份/裁剪等） | ✅ |
| `src/hooks` | 10 | 9 | 1 | 0 | 共享 hooks | ✅ |
| `src/styles` | 9 | 0 | 0 | 9 | 全局样式（tiptap/mermaid 等） | ⚠️ 与 aurora/styles 职责重叠 |
| `src/types` | 4 | 4 | 0 | 0 | 全局类型 | ✅ |
| `src/utils` | 4 | 4 | 0 | 0 | 工具 | ✅ |
| `src/app` | 1 | 1 | 0 | 0 | 入口逻辑（`useAppLogic`） | ✅ |
| `src/__tests__` / `*.d.ts` / 根测试 | — | — | — | — | 杂项 | — |

### 2.3 子模块分布（二级）

**`features/`（475）** — 最大逻辑层，子模块：
```
blog(123)  editor(153)  canvas-v2(30)  export(22)  knowledgeBase(28)  toolbar(25)
shared(19) themes(7)    diary(8)        pwa(9)      lint(11)          templates(8)
commandPalette(4) dashboard(2) fileManager(8) imageUpload(2) import(3) migrate(1)
navigation(1) outline(3) preview(1) settings(1) tags(1)
```

**`aurora/`（143）** — 真实 UI 外壳：
```
app(11)  components(17)  docs(20→设计文档)  hooks(7)  panels(63)  styles(21)  themes(1)
```

**`stores/`（24）**：`storage(4)` + 业务 store + `__tests__(3)`。

> 📌 结构观察：`features/editor`(153) 与 `features/blog`(123) 是两个巨无霸模块，合计占 features 的 58%。`features/toolbar`(25)、`features/preview`(1)、`features/settings`(1) 等**带 UI 语义的子模块**落在逻辑层，是架构张力的直接体现。

---

## 3. 分层与依赖方向审计（核心）

### 3.1 反向依赖扫描结果

| 来源层 | 目标（UI 层） | 命中 | 结论 |
|--------|--------------|------|------|
| `src/features` | `aurora` / `components/ui` | **0** | ✅ 合规（唯一 3 处 `./aurora` 是 `features/blog/themes/aurora.ts` 局部模块，非 UI 层） |
| `src/stores` | `aurora` / `components/ui` | **0** | ✅ 合规 |
| `src/services` | `aurora` / `components/ui` | **0** | ✅ 合规 |
| `src/hooks` | `aurora` / `components/ui` | **0** | ✅ 合规 |

**结论**：依赖方向铁律（依赖只向下、0 反向依赖）**完全守住**。逻辑/状态/服务/ hooks 层均不依赖具体 UI 层，架构边界在"禁止反向"维度上是健康的。

### 3.2 架构张力：features 内含 UI（非反向，但是混淆源）

虽然无"反向依赖"，但存在**横向混淆**：

- `features/` 含 **159 个 `.tsx`**（占全仓 `.tsx` 263 的 **64%**）。典型如：
  - `features/toolbar/`：`WysiwygToolbar.tsx`、`WysiwygToolbarButton.tsx`、`groups/*Dropdown.tsx` 等真实 UI 组件
  - `features/editor/components/`：`DraftInsightPanel`、`WritingAidPanel`、`FloatingFormatToolbar` 等
  - `features/blog/components/panels/`：`VisualCssEditor`、`CssEditor`、`ColorPanel`、`ThemePanel` 等
- Grep 证实 `aurora` 层**未直接 import `features/toolbar`**（零匹配）——toolbar UI 由 `features/editor` 在逻辑层内部消费，再经 `aurora/panels/editor` 间接组装。

**架构判断（trade-off）**：
- 若项目意图是 **feature-sliced design**（每个 feature 自包含 UI+逻辑），则当前结构合理，但需**修订铁律表述**：把 `features` 重新定义为"自包含业务模块"，`aurora` 降格为"shell + 面板路由 + 基础 UI 组合层"。
- 若铁律"UI 只落 aurora"是硬约束，则应将纯展示型组件（尤其 `features/toolbar`、`features/*/components/panels` 中的 presentational 部分）迁至 `aurora` 或 `components/ui`。
- **无论哪种，当前"铁律说 A、代码做 B"的不一致本身就是最大风险**——新成员无法据此判断该把新 UI 放哪。

### 3.3 悬空别名

- `@workers`（tsconfig `paths` + vite `alias` 均配置）在全仓 **零引用** → 死配置，建议删除或补 `@src/workers` 实际目录。

---

## 4. 死代码与冗余审计

### 4.1 零消费者组件（桶导出型死代码）

| 组件 | 定义 | 引用情况 | 处置 |
|------|------|---------|------|
| `components/ui/Input.tsx` | `export { Input }` | 全仓 `import {...Input}` **零匹配**（仅 `index.ts` 桶导出） | 删除 + 移除桶导出；或补消费者 |
| `components/ui/EmptyState.tsx` | `export default EmptyState` | 全仓仅 `index.ts` 桶导出 + `ui.css` 注释提及；**无真实 import** | 同上 |

> 📌 判死依据（MEMORY 死代码判据）：桶导出 `export { Input }` 会让 `Input.tsx` 被任何 `from '.../components/ui'` 连带挂入模块图（dev 无 tree-shaking），**看 import 计数会误判为"活"**；必须看可达性闭包——二者均无外部消费者，确属死代码。

### 4.2 零调用函数（活跃文件中的死函数）

- `features/canvas-v2/theme/canvasTheme.ts` → `injectCanvasTheme()`：
  - 仅自身文件内部 + `canvasTheme.test.ts` 引用，**零运行时调用点**。
  - 其注入的选择器 `.tl-container, .canvas-v2-root` **两者皆无 DOM**（tldraw 已退役、canvas-v2 挂载点非此选择器）。
  - 导致约 25 个 `--cv-*` 变量全程未定义，8 个 canvas-v2 文件以无 fallback 的 `var(--cv-*)` 消费（真机实测 0/5 有值）。
  - **性质≠死代码，是"功能缺口或无效注入"**：要么接入调用点（需在 canvas-v2 挂载时调用），要么删除注入逻辑与未定义变量。属 MEMORY 标记的 🔴 待决策项。

### 4.3 命名冲突 / 分裂

| 文件对 | A | B | 性质 | 建议 |
|--------|---|---|------|------|
| `backupService.ts` | `services/backupService.ts`（`startAutoBackupScheduler`，被 `app/useAppLogic` 用） | `features/export/backupService.ts`（`exportWorkspaceZip`，被 `aurora/panels/settings/DataSection` 用） | **两文件都有消费者、职责不同但同名** | 重命名为 `autoBackupService` / `workspaceExport` 以消除混淆 |
| `ToastProvider.tsx` | `aurora/app/ToastProvider.tsx` | `components/ui/ToastProvider.tsx` | **有意 re-export 兼容层**（已收敛为单一实现） | ✅ 非问题，保留 |

### 4.4 重复文件名（需按完整路径区分，非均冗余）

- `components.css` ×2：`aurora/styles/components.css`(1150行)、`styles/components.css` — 两者职责可能重叠，需 CSS 审计确认（见 §6.4）。
- `types.ts` ×4、重名 `index.ts` ×17：均为**局部模块文件**（不同目录的私有 types/index），正常，非冗余。
- `fileManager.ts` ×2：`locales/zh/fileManager.ts`、`types/fileManager.ts` — 需确认是否为翻译键与类型定义的巧合同名（疑似 locales 误入 types 概念）。

---

## 5. 结构卫生问题

### 5.1 设计文档混入 `src/`

`aurora/docs/design/` 含 **20 份**设计/审计 md（如 `00-design-tokens.md`、`AUDIT-REVIEW-consistency-2026-09-06.md`、`REMEDIATION-ui-consistency-2026-09-02.md`、`G-间距映射清单.md` 等）。
- 不进入 tsc/vite 编译（.md），但**污染 `src/` 代码树结构**、增加 Vite 模块图扫描噪音。
- 根目录已有 `docs/` 目录，应整体迁移至 `docs/design/` 或独立 `design-docs/`，并在 `.gitignore` 或 `tsconfig.include` 明确排除。

### 5.2 构建缓存残留（本地非 git 污染）

- 根目录 `vite.config.ts.timestamp-*.mjs` ×**8**（最新 `1789656519116`）、`vitest.config.ts.timestamp-*.mjs` ×**14**。
- 已被 `.gitignore` 第 12 行 `*.timestamp-*.mjs` 忽略 → **不入库**，仅本地磁盘整洁问题。
- 根因：dev server 被 harness 回收时未清理临时配置（正常退出会删）。建议：加 `scripts/clean-tmp.mjs` 或 `npm run clean` 钩子；或升级 Vite 后确认退出清理。

### 5.3 超大文件（可维护性风险）

全仓 **52 个文件 >600 行**。Top 10：

| 行数 | 文件 | 性质 |
|------|------|------|
| 22752 | `features/blog/themes/newThemes.ts` | 🔴 极端巨型（主题定义数据）— 建议按主题拆分 |
| 2756 | `features/fileManager/defaultDocsEn.ts` | 默认文档数据，可外置为 `.md`/JSON |
| 2629 | `aurora/styles/panels/editor.css` | 面板样式，可拆分 |
| 2103 | `features/fileManager/defaultDocsZh.ts` | 同上 |
| 1730 | `aurora/panels/kb/GraphPanel.tsx` | 知识图谱面板，可拆分 |
| 1453 | `features/canvas-v2/engine/CanvasEngine.ts` | 引擎核心，可拆分 |
| 1329 | `aurora/panels/blog/BlogPanel.tsx` | 博客面板 |
| 1299 | `features/blog/utils/singleFile/newThemeTemplate.ts` | 模板数据 |
| 1295 | `styles/tiptap.css` | 全局编辑器样式 |
| 1286 | `aurora/styles/panels/canvas.css` | 面板样式 |

> 📌 `newThemes.ts` 22752 行单一文件是**最高优先级的可维护性炸弹**——任何主题改动都需载入/审阅该文件，diff/review 成本极高。建议按主题（aurora/garden/cyberpunk/...）拆分为 `themes/aurora/*.ts` 多文件 + 索引聚合。

### 5.4 CSS 职责重叠

`styles/`（全局 9 css）与 `aurora/styles/`（21 css）并存；两个 `components.css` 并存。需一次 CSS 审计明确：
- 全局令牌/第三方样式（tiptap/mermaid/katex）放 `styles/`
- 面板/外壳样式放 `aurora/styles/`
- 避免二者对同一概念各写一套。

---

## 6. 测试与质量

### 6.1 测试规模

- 测试文件 ≈ **115**（`*.test.ts` ≈65 + `*.test.tsx` ≈50）。
- 覆盖分布：aurora（smoke 测试多）、features（逻辑单测多）、stores/services/hooks 均有。
- 基线：vitest **1499 passed / 2 skipped / 0 failed**（MEMORY 登记）。
- 已建 CI 门禁：husky v9 + lint-staged + 本地 ESLint 守卫 `local/no-aurora-ui-import`（仅拦逻辑层→UI 层反向依赖，不碰既有 lint 债）。

### 6.2 质量属性评估

| 属性 | 现状 | 风险点 |
|------|------|--------|
| 可维护性 | 中 | 巨型文件、features 含 UI 致边界模糊 |
| 可扩展性 | 良 | feature 模块化清晰，新增模块有固定范式 |
| 可靠性 | 良 | 测试覆盖广、CI 门禁到位 |
| 一致性 | 中 | 死组件/死函数残留、双 components.css 潜在重叠 |
| 可观测性 | 中 | 无显式日志/监控体系（桌面端可接受） |

---

## 7. 配置与构建审计

### 7.1 别名体系（✅ 健康）

`tsconfig.json` 与 `vite.config.ts` 的 alias **完全一致**，覆盖 13 个 `@alias`（`@features/@stores/@aurora/@components/@services/@utils/@hooks/@app/@locales/@styles/@workers/@src`）。`baseUrl="."` + `paths` 配对正确，移动文件不再引爆 `../../../` 深相对引用。

### 7.2 构建配置（✅ 合理）

- `manualChunks` 分包：excalidraw / pdfjs / mermaid / marked / katex / tiptap / codemirror 独立分包，压低主入口体积。
- 内置 `excalidrawLocalAssets` 插件：本地化 Excalidraw 资源 + 修复沙箱 safe-delete 守卫对字体的破坏（`.DELETE.<hash>` 还原）。这是**针对本环境的必要工程化**，保留。
- VitePWA：`maximumFileSizeToCacheInBytes: 12MiB`（因 Excalidraw 分包超默认 2MiB 上限）。
- `define: process.env.NODE_ENV` 完整表达式替换（避免 Excalidraw 进错分支死循环）——注释充分。

### 7.3 待修配置

- `@workers` 悬空别名（零引用）→ 删除或补目录。
- 根目录 `vite.config.ts.timestamp-*.mjs`(8) / `vitest.config.ts.timestamp-*.mjs`(14) → 清理脚本。

---

## 8. 优化路线图（P0 / P1 / P2）

> 优先级沿用项目既定分级：P0=架构正确性/一致性基石；P1=质量与可维护性；P2=整洁与收尾。

### P0 — 先决（决策类，需用户拍板）
1. **澄清分层意图**：明确 `features` 是否允许含 UI（feature-sliced）。据此修订铁律表述与 MEMORY，统一"新 UI 放哪"的判断标准。
2. **清理零消费者组件**：删除 `components/ui/Input.tsx`、`EmptyState.tsx` 及其桶导出（或补消费者）。删除后须跑 `deadCssPurge.test.ts` + 全量 vitest 验证零回归。

### P1 — 质量与可维护性
3. **收敛 `backupService` 命名**：`services/backupService` → `autoBackupService`；`features/export/backupService` → `workspaceExport`（或反之），消除同名混淆。
4. **处置 `injectCanvasTheme` 死函数**：要么在 canvas-v2 挂载点接入调用（修复 25 个 `--cv-*` 未定义），要么删除注入逻辑与无 fallback 的 `var(--cv-*)` 消费。需先真机验证 canvas-v2 观感变化。
5. **迁移 `aurora/docs/design/` 出 `src/`**：移至 `docs/design/`，保持 `.md` 不在 tsc include 内。
6. **拆分 `newThemes.ts`（22752 行）**：按主题文件拆分 + 索引聚合，降低单文件 review/构建风险。
7. **清理构建缓存**：加 `npm run clean` 删除 `*.timestamp-*.mjs`；或评估 Vite 退出清理。

### P2 — 收尾与监控
8. **删除 `@workers` 悬空别名**（或补 `@src/workers` 目录）。
9. **CSS 职责审计**：厘清 `styles/` vs `aurora/styles/`、两个 `components.css` 的重叠，收敛令牌源（延续 MEMORY 中 `desktop-chrome.css` 第二层 `:root` 治理）。
10. **超大文件治理**：`defaultDocs*.ts`（外置为 md/JSON）、`GraphPanel`/`CanvasEngine`/`BlogPanel` 按职责拆分。
11. **监控回归**：将"0 反向依赖""无悬空别名""无零消费者桶导出"纳入 ESLint 守卫 / CI 卡点，防止本次审计发现的问题回潮。

---

## 9. 附录：审计证据索引

| 结论 | 验证方式 | 关键证据 |
|------|---------|---------|
| 0 反向依赖 | Grep `from '...aurora'\|components/ui` 于 features/stores/services/hooks | 4 层均 0 命中（features 的 `./aurora` 经 Glob 确认为 `features/blog/themes/aurora.ts` 局部模块） |
| Input/EmptyState 死代码 | Grep `import {...Input}` 全仓 + 读 `components/ui/index.ts` | `index.ts:3/13` 桶导出；外部 import 零匹配 |
| injectCanvasTheme 零调用 | Grep `injectCanvasTheme` 全仓 | 仅 `canvasTheme.ts` 内部 + `canvasTheme.test.ts` |
| 双 backupService 分裂 | Grep `backupService` 全仓 | `app/useAppLogic`→services 版；`DataSection`→features/export 版 |
| 双 ToastProvider 有意 | 读 `aurora/app/ToastProvider.tsx` | 第 6 行 `export { ... } from '../../components/ui/ToastProvider'` |
| @workers 悬空 | Grep `@workers\|workers/` 全仓 | 0 命中 |
| aurora/docs 混入 | Glob `src/aurora/docs/**` | 20 个 .md 设计/审计文档 |
| 构建缓存残留 | Glob `vite.config.ts.timestamp-*` / `vitest.config.ts.timestamp-*` | 8 + 14 份；`.gitignore` 第 12 行已忽略 |
| 测试规模 | Glob `src/**/*.test.{ts,tsx}` | ≈115 文件；基线 1499 passed |
| 配置健康 | 读 `tsconfig.json` / `vite.config.ts` | alias 一致；manualChunks + Excalidraw 修复到位 |
| features 含 UI | 结构扫描 + Grep `features/toolbar` 被 aurora import | 159 `.tsx`；aurora→features/toolbar 零命中 |

---

*审计工具脚本（临时）：`scripts/_audit_scan.cjs`（结构全景）、`scripts/_audit_tree.cjs`（二级树）。审计完成后可保留作后续优化基线比对，或删除。*
