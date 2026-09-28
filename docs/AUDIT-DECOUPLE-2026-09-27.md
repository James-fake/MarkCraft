# MarkCraft 代码结构穷尽式审查 · 解耦与组件化报告

> 生成日期：2026-09-27 ｜ 口径：`scripts/_depgraph.cjs` 模块级依赖图 + `.workbuddy/artifacts/audit-decouple-structure.cjs` 文件级穷尽审计
> 产物：`audit-decouple-structure.out.txt` / `.json` ｜ 模块图快照：`depgraph-snapshot-20260927.txt`

---

## 0. 结论速览

| 维度 | 结论 | 级别 |
|---|---|---|
| 模块级分层（types→core→services→stores→hooks→components/ui→features→aurora） | ✅ **零环、零双向对**（本轮实测，非历史结论） | 健康 |
| 分层违规残留（审计时） | V6 ×4（aurora/components→features/commandPalette）、V8 ×1（EditorPanel→@app/useAppLogic） | ~~P1~~ **已清零** |
| **架构缺陷：全局副作用随视图切换中断** | `useAppLogic`（MOC 自动更新 S5 / 备份调度 S7 / beforeunload）只挂在 `EditorPanel`，切走即停 | **P0** |
| 巨型文件 | ≥400 行共 **83 个**；第一名 `features/blog/themes/newThemes.ts` **22,752 行** | P1 |
| 壳层业务渗漏 | aurora/panels 按设计允许引用 features（组合层），但 EditorPanel 一文件引 7 个 feature，职责过宽 | P2 |
| 跨 feature 依赖 | 21 条边，绝大多数是「editor→子能力」合法扇出；仅 2 处方向可疑 | P2 |
| 死代码 | 文件级零引入候选仅 2 个，经核查**均非死码**（桶导出 / 测试基建） | 无需动作 |

**总体判断**：项目分层纪律良好（历次解耦已清 8 环），不存在环状耦合。当前真正的解耦空间集中在四件事：
① 全局副作用挂载点错误（P0）；② 两个纯函数搬家清掉 V6/V8（P1）；③ 博客主题 22.7k 行巨型文件的插件化拆分（P1）；④ 面板级组件化与 EditorPanel 瘦身（P2）。

---

## 1. 审计基线（权威数字）

| 口径 | 文件数 | 行数 |
|---|---|---|
| src 全量（ts/tsx/css/js/cjs） | 730 | 178,390 |
| 其中 TS/TSX | 704 | 161,780 |
| 其中 CSS | 26 | 16,610 |
| 审计脚本口径（剔除 `*.test.*` / `setupTests` / `__tests__`） | 568 | — |

模块级依赖图（`_depgraph.cjs`，2026-09-27 快照）：

- 节点/边：8 个层带、568 文件级节点；**BIDIRECTIONAL：无**；**CYCLES：无**。
- 出度热点：`aurora/panels`（179）＝组合层正常扇出；`features/editor`（127）＝编辑器聚合域正常。
- 入度热点：`stores`（99）、`types`（82）＝被依赖地基，符合设计。

> 定性：**「环状耦合」这一类问题在本项目已不存在**。下文所有发现均为「单向但放错位置 / 单向但体量失控 / 单向但职责过宽」三类。

---

## 2. 分层违规矩阵（V1–V8）——**截至 2026-09-27 夜：全部归零**

> 审计时的 5 处违规（V6 ×4 / V8 ×1）已在 P0、P1-2 两轮实施中清零；
> 复跑 `audit-decouple-structure.cjs` 的 §1 输出为 `(none)`。以下保留原文以便追溯。

守卫规则全集见 `.workbuddy/artifacts/audit-decouple-structure.cjs`（V1–V8 逐条落码）。残留违规共 **5 处**：

### V6 — aurora/components 通用层不得依赖业务 features：4 处

全部指向 `features/commandPalette`，且被引的两个模块是**零依赖纯函数**：

| 文件 | 引用 |
|---|---|
| `aurora/components/command-palette/CommandPalette.tsx` | `@features/commandPalette`（桶） |
| `aurora/components/shell/MenuBar.tsx` | `commandRegistry` + `shortcutFormat` |
| `aurora/components/shell/PageFrame.tsx` | `commandRegistry` |

**修复方案（P1，半天）**：`commandRegistry.ts`（零 import、无 React）与 `shortcutFormat.ts`（同性质）下沉到 `services/command/`；`features/commandPalette` 桶内 re-export 保持旧路径兼容一轮，随后改 4 处 import 指向 `@services/command/*`，删除 re-export。V6 归零。

### V8 — 禁引旧壳 `app`：1 处

`aurora/panels/editor/EditorPanel.tsx → @app/useAppLogic`。

该文件是旧 Web 壳（`src/app/App.tsx` 已退役）遗留的唯一活性逻辑。但它同时暴露了本报告最重要的架构缺陷（见 §3），修复方案合并处理：**`useAppLogic` 迁入 `hooks/`（或 `services/`）并以 AuroraShell 为唯一挂载点**，V8 随迁移自然归零。

---

## 3. P0 架构缺陷：全局副作用随视图切换中断

### 现象

`src/app/useAppLogic.ts`（217 行）承载 7 组全局副作用：

| # | 副作用 | 中断后果 |
|---|---|---|
| S1/S2 | 自动保存（防抖 + flush） | 当前只服务编辑器视图，尚可接受 |
| S5 | **MOC 自动更新**（LinkIndexStore 变化 → 回写 MOC 文件） | 用户在白板/图谱/知识库视图改链接关系后切走，MOC **不更新** |
| S7 | **备份调度器**（定时快照） | 长时间停留在白板等视图时**备份停摆** |
| S6 | beforeunload 提醒 | 切视图后丢保护 |

### 根因

`AuroraShell.renderView` 是 switch/case：view ≠ editor 时 `EditorPanel` **卸载**，挂在其组件树上的 `useAppLogic` effect 链整体停止。而 S5/S7 是**应用级**职责，不是编辑器视图职责。

### 修复方案（P0，1 天）

1. `useAppLogic.ts` 从 `src/app/` 迁至 `src/hooks/useAppLogic.ts`（或按依赖下沉 `services/`）。
2. 拆分挂载层级：
   - **应用级**（S5 MOC 自动更新、S7 备份调度、beforeunload）：挂 `AuroraShell` 一次性，数据来源改从 `FileStore`/`LinkIndexStore` 读取而非 props。
   - **视图级**（S1/S2 自动保存、版本快照）：保留在 `EditorPanel`——这些本来就只对活跃编辑器有意义。
3. 回归点：切到白板/图谱视图后 MOC 更新与备份定时器仍存活（补一条 vitest 断言 effect 挂载不随 view 卸载）。

---

## 4. 巨型文件 TOP 与分解计划

≥400 行共 **83 个**。TOP15：

| 行数 | 文件 | 定性 |
|---|---|---|
| 22,752 | `features/blog/themes/newThemes.ts` | **唯一真巨型**：16 个博客主题塞一文件 |
| 2,764 / 2,111 | `core/data/defaultDocs/{en,zh}.ts` | 内容数据，免于逻辑拆分 |
| 2,203 | `aurora/panels/kb/GraphPanel.tsx` | 面板巨型，P2 拆子组件 |
| 1,453 | `features/canvas-v2/engine/CanvasEngine.ts` | 引擎单类，暂缓 |
| 1,346 | `aurora/panels/blog/BlogPanel.tsx` | 面板巨型，P2 |
| 1,027 | `aurora/panels/editor/EditorPanel.tsx` | P2 瘦身（见 §6） |
| 964 / 819 / 817 … | EditorLayout / GlobalSearch / WysiwygToolbar | 特性内聚，暂缓 |

### 4.1 头号目标：博客主题插件化（P1）

`features/blog` 共 49,641 行，其中 **themes 子目录 30,873 行（16 主题）**：

```
features/blog
  ├─ themes/          30,873 行 / 16 文件   ← newThemes.ts 独占 22,752
  ├─ components/panels 4,887 / 16
  ├─ utils/singleFile  4,592 / 11（newThemeTemplate.ts 1,299）
  ├─ components        2,561 / 12
  ├─ templates         1,823+918 / 26+4
  ├─ services          1,333 / 12
  └─ 其余（根/utils/hooks）≈ 3,000
```

**方案**：按「一主题一文件」拆 `themes/<name>.ts`，`newThemes.ts` 退化为桶（仅 re-export）。进一步可在拆完后把 `themes/` 整目录视为**主题插件目录**（约定导出 `themeId/name/css` 的插件契约），后续新增主题零侵入——这正是「方便后期增加功能」的最大单点收益。

**安全注意**：`newThemes.ts` 经 `features/blog/themes/index.ts:92` 桶导出被消费，拆分必须保持桶 API 不变（本轮已证实它不是死码，勿按零引入误删）。

### 4.2 数据类巨型（免拆）

`defaultDocs/*`、`locales/*`（zh 952 / en 875）是内容与文案数据，逻辑复杂度为零，不投入拆分成本。

---

## 5. 死代码核查（零引入候选，全部排除）

| 候选 | 判定 | 依据 |
|---|---|---|
| `features/blog/themes/newThemes.ts` | ❌ 非死码 | `features/blog/themes/index.ts:92` 桶导出 |
| `setupTests.ts` | ❌ 非死码 | vitest 测试基建 |

> 教训复核：本轮审计脚本初版曾误报 551 个「死文件」，根因是 `resolveSpec` 未探测 `.ts/.tsx/index` 后缀导致 fan-in 记到幽灵键上。已修复并复测。**任何「零引入」结论必须带扩展名探测 + 桶导出排查，否则是假阳性工厂。**

---

## 6. 壳层组合与面板组件化（P2）

### 6.1 aurora/panels → features 引用面（设计允许，但暴露职责宽度）

| 引 features 数 | 面板 | 备注 |
|---|---|---|
| 7 | `editor/EditorPanel.tsx` | editor/fileManager/import/lint/pwa/templates/themes —— **职责过宽，瘦身首选** |
| 3 | `diary/DiaryPanel.tsx` | 可接受 |
| 2 | BlogPanel / CanvasPanel / CanvasSidebarPanel / UsageDocBrief / GraphPanel / KbPanel / ShortcutsSection | 正常 |

**EditorPanel 瘦身方向（P2）**：import/lint/pwa/templates 四块接线抽成 `features/editor/editorIntegration.tsx` 聚合 hook（slots 模式已有雏形 `EditorSlots.tsx`），EditorPanel 回归「布局 + 组合」角色。

### 6.2 panel→panel 横向耦合（仅 1 处业务性）

- `editor/EditorPanel.tsx → blog/BlogPanel`（`setBlogEntryFileId`）：应改为经由一个 `services/blogEntry.ts`（或 store 动作）中转，面板之间不直接 import。（另一处 `aurora-nav → shell/Sidebar` 属壳内导航合法引用。）

### 6.3 跨 feature 依赖（21 条边）定性

- **合法扇出（19 条）**：`editor→{themes,lint,preview,outline,search,export,imageUpload,fileManager}`、`preview→themes`、`canvas 系→themes` 等，都是「编辑器/预览聚合子能力」的既定设计，且有明确下层方向。
- **方向可疑（2 条）**：`fileManager/DailyNoteService → templates`、`migrate/MigrateWizard → knowledgeBase`。均为低频功能对低层域的反向借用，实际风险小；如追求纯粹，把 templates 的「日记模板匹配」下沉 services 即可（P2 可选，不强制）。

---

## 7. 目标组件化结构（增量达成，不动运行时）

```
src/
  types/ locales/ utils/        L0 地基（不动）
  core/                         L1 纯领域（不动）
  services/                     L2  ← + command/（commandRegistry、shortcutFormat）
                                     + blogEntry.ts（可选：替代 panel→panel）
  stores/                       L3（不动）
  hooks/                        L4  ← + useAppLogic（自 app/ 迁入；应用级副作用部分上提 AuroraShell）
  components/ui/                L5  ← V6 清零后不再依赖 features
  features/                     L6
    blog/themes/                ← 拆为 16 个单主题文件 + 桶；长远即「主题插件目录」
    editor/                     ← 新增 editorIntegration 聚合接线（吸收 EditorPanel 7→1）
  aurora/                       L7 壳 + panels（panels 只组合 features 桶 API）
```

原则：**只搬家、只拆文件、不改运行时行为**；每一步保持七条验证链路（tsc / vitest / eslint guard / depgraph / build / CDP / 文件集合差）全绿后提交。

---

## 8. 解耦路线图（P0–P2）

| 级别 | 事项 | 动作 | 预估 | 验收 | 状态 |
|---|---|---|---|---|---|
| **P0** | useAppLogic 视图切换副作用中断 | 拆分为 `useAppGlobalEffects`（S5/S7/S6b，挂 AuroraShell 常驻）+ `useAppLogic`（S1/S2/S3/S4/S6a，留 EditorPanel）；落在新域 `features/appRuntime`，旧壳 `src/app` 与 `@app` 别名一并删除 | 1 天 | 切视图后 MOC/备份仍存活 + vitest 断言 | ✅ **已实施**（2026-09-27，V8 归零） |
| **P1-1** | V8 清零 | 随 P0 迁移自动归零 | — | eslint guard / 审计脚本 V8=0 |
| **P1-2** | V6 清零 | commandRegistry/shortcutFormat 下沉 services/command，改 4 处 import | 0.5 天 | V6=0 + CommandPalette/菜单行为回归 |
| **P1-3** | newThemes.ts 拆分 | 一主题一文件 + 桶兼容 | 1–2 天（可脚本化） | 桶 API 不变 + 博客主题目检 |
| **P2-1** | panel→panel 解耦 | setBlogEntryFileId 走 services 中转 | 0.5 天 | 审计脚本 panel→panel=0 | ✅ **已实施**（2026-09-28，`1d838c6`） |
| **P2-2** | EditorPanel 瘦身 | 抽 editorIntegration 聚合接线 | 1 天 | 引 features 数 7→1 | ✅ **已实施**（2026-09-28，见 §13） |
| **P2-3** | GraphPanel/BlogPanel 拆子组件 | 按区块拆内部组件文件 | 1–2 天 | 行数 <800/文件，行为不变 | ✅ **已实施**（2026-09-28，见 §14） |
| **P2-4（可选）** | 两条方向可疑 feature 边 | templates 匹配下沉 services | 0.5 天 | 审计脚本只剩合法扇出 |

执行顺序建议：**P0 → P1-2 → P1-1 → P1-3 → P2 逐项串行**（沿用「单条迭代、每轮截图/链路验证」节奏）。

---

## 9. 附：复现审计

```bash
# 模块级依赖图 + 快照
node scripts/_depgraph.cjs
# 文件级穷尽审计（V1–V8 / 巨型文件 / blog 结构 / 渗漏 / 死代码候选 / 跨 feature 边）
node .workbuddy/artifacts/audit-decouple-structure.cjs
```

审计脚本含扩展名探测修复与两类假阳性排除（桶导出、测试基建），可直接作为后续「解耦验收」的量化基线工具。

---

## 10. 实施记录 · P0（2026-09-27 完成）

**结论**：应用级副作用不再随视图切换停摆；V8（禁引旧壳 `app`）归零，旧壳目录与别名彻底删除。

| 变更 | 说明 |
|---|---|
| 新增 `features/appRuntime/useAppGlobalEffects.ts` | 承载 **S5 MOC 自动更新 / S7 备份调度 / S6b beforeunload**，只依赖 store（FileStore / LinkIndex / TagIndex），无参数 |
| 迁移 `src/app/useAppLogic.ts` → `features/appRuntime/useAppLogic.ts` | 保留 **S1 自动保存 / S2 版本快照 / S3 块索引 / S4 块解析器 / S6a tab dirty**（编辑器耦合） |
| `AuroraShell.tsx` | `ShellInner` 调用 `useAppGlobalEffects()`，常驻挂载，与视图无关 |
| `EditorPanel.tsx` | 仅挂载视图级 `useAppLogic`；不再透传 `isAnyTabDirty` |
| 删除 `src/app/` + 4 处 `@app` 别名 | tsconfig / vite / vitest / vite.smoke 同改（`aliasSync.test.ts` 守卫通过） |

**为何落在 `features/` 而非 `hooks/`**：守卫规则 V7 禁止 `hooks → features`，而 MOC 生成仍在 `features/fileManager`；故新建业务域 `appRuntime` 承载「应用运行时副作用」，两端（aurora 壳 / 编辑器面板）引用它都是合法方向。

**验证**：tsc 干净 · 全量 vitest **1767 通过 / 0 失败** · ESLint 反向依赖守卫 0 error（回归锁已按守卫移至 `aurora/app/`）· 依赖图无环无双向 · 结构审计 §1 仅剩 V6×4 · vite build 通过 · 真机 CDP 冒烟（白板视图启动 + 来回切换视图无异常）。

**回归锁**：`src/aurora/app/useAppGlobalEffects.test.tsx` —— ① 非编辑器视图也启动备份调度器；② 编辑器面板卸载（切白板）后调度器不清理、也不重复启动。

---

## 11. 实施记录 · P1-2（V6 清零，2026-09-27 完成）

**结论**：`aurora/components`（通用层）不再依赖任何业务 `features`；V1–V8 全部归零。

| 变更 | 说明 |
|---|---|
| `services/command/commandRegistry.ts`（新，原 `features/commandPalette/`） | 零 import 纯模块：命令注册表 + `CommandIds` + `CategoryLabels` + 类型 |
| `services/command/shortcutFormat.ts`（新，原同上） | 零 import 纯模块：`IS_MAC` / `normalizeShortcutToken` / `formatShortcut` |
| 4 处违规改指 `@services/command/*` | `CommandPalette.tsx`（桶导入）、`MenuBar.tsx`×2、`PageFrame.tsx` |
| 其余消费方一并改指 | `AuroraShell.tsx`、`commandAdapter.ts`、`commandWiring.test.tsx`、`MenuBar.smoke.test.tsx` |
| `features/commandPalette/index.ts` | 保留**兼容再导出**（catalog + 两个 services 模块），旧路径不炸，后续可自行收敛 |
| `commandCatalog.ts` | 类型引用改指 `@services/command/commandRegistry` |
| 顺带修 `MenuBar.tsx` | 既有 `no-case-declarations` ESLint **error**（case 块内 `const target` 未加块级作用域） |

**判据**：中层通用组件（`aurora/components`）需要的是「命令数据结构 + 快捷键显示」这类**零依赖纯能力**，本就不该落在业务层；下沉后通用层只依赖 `services`，方向合法。

**验证**：tsc 干净 · 全量 vitest **1767 通过 / 0 失败** · ESLint 0 error · 审计 §1 = `(none)` · vite build 通过 · 真机 CDP 冒烟（菜单栏下拉正常、accelerator 显示 `Ctrl+N`/`Ctrl+S` 等、零控制台错误）。

---

## 12. 实施记录 · P1-3（`newThemes.ts` 22,752 行拆分）

**结论**：头号巨型文件消失——`features/blog/themes/newThemes.ts` 从 **22,752 行 → 57 行桶**；内容按「一主题一文件」拆为 `themes/generators/<theme>.ts`（**48 个**）。

| 项 | 拆分前 | 拆分后 |
|---|---|---|
| `newThemes.ts` | 22,752 行（48 个 `getXCss` 生成器挤在一个文件） | 57 行桶（`export * from './generators/<theme>'`） |
| 单文件最大体量 | 22,752 行 | 763 行（单个主题生成器， inherent CSS 模板体量） |
| 新增主题成本 | 在 22k 行文件里定位插入点 | 在 `generators/` 加一个文件 + 桶里登记一行（**零侵入**） |

**为什么能安全拆**：该文件由 48 个**互不依赖**的 `getXCss(isDark): string` 纯函数组成，每个自带注释头、无共享状态、无跨函数调用——天然可按函数切分。

**安全措施**：拆分脚本先做「原文件函数体 vs 拆分后函数体」**逐函数 sha256 校验**（含注释头、行尾归一化），一致才落盘；校验失败即中止、不改写原文件。

**诚实备注（副作用）**：≥400 行文件数由 83 → 108。因为每个主题生成器本身就是 300–700 行的 CSS 模板字符串，切得更碎没有意义；换来的是「单文件最大体量从 22.7k 降到 763 行」和「新增主题零侵入」，这是本次治理的核心收益。

**回归锁**：`src/features/blog/themes/newThemes.barrel.test.ts` —— ① 桶仍导出全部 48 个生成器（API 不缩水）；② 每个生成器明暗两模式均返回含 `:root` 的合法 CSS；③ 明暗产物确有差异（`getCinematicCss`/`getNeonCss` 签名 `_isDark` 不使用该参数，已作对照组排除）。

**验证**：tsc 干净 · 全量 vitest **1770 通过 / 0 失败** · ESLint 0 error · 审计 §2 TOP30 已无该文件 · vite build 通过。

---

## 13. 实施记录 · P2-1 / P2-2（2026-09-28 完成）

### P2-1 panel→panel 解耦（`1d838c6`）

- **根因**：「发布为博客」要把目标文件 id 带给尚未挂载的博客面板，该标记原是 `BlogPanel.tsx` 的**模块级变量** ⇒ `EditorPanel → BlogPanel` 面板横向 import（审计中唯一的业务性 panel→panel 边）。
- **解法**：通道下沉 `services/blogEntry.ts`（零依赖、无 React、无 store）——生产者 `setBlogEntryFileId(id)`，消费者 `peekBlogEntryFileId()` / `clearBlogEntryFileId()`（读后即清）。**刻意不用 store**：这是一次性、消费即清除的导航意图，不是需要订阅/持久化的状态。
- **回归锁**：`services/__tests__/blogEntry.test.ts` + `panelCrossImport.test.ts`（结构性守卫）+ CDP 真机探针（跨面板组件树重建后意图仍送达、消费后不残留）。

### P2-2 EditorPanel 瘦身（features 域引用 8 → 1）

- **拆分判据（唯一）**：这段东西是「功能接线」还是「布局」？接线（自动保存/版本快照 S1–S4/S6a、lint、六个 feature 弹层、模板插入、快速捕捉、导入、主题）→ `features/editor/editorIntegration.tsx`（`useEditorIntegration` 聚合 hook，353 行）；布局（窗格/浮栏显示态、hover-intent、面包屑、工具栏与右栏摆位）→ 留在 EditorPanel（1027 → 819 行）。
- **边界（刻意保留在面板）**：`AuroraLintList` 是 aurora 本地组件，features 反向依赖 aurora 会触发换界面守卫 ⇒ integration 只产出 lint 状态与回调，面板负责渲染；`auroraModal` 的 `AuroraModalId` 联合类型同理——integration 声明为 string，面板侧做窄化适配（`id as AuroraModalId`）。
- **类型保真**：integration 接口的 `theme` 保留 `useTheme` 的 `ThemeType` 派生类型，不在边界退化为 string（否则下游要再断言回来）。
- **顺带修复**：① `versionHistory.open` 进入命令桥 effect 依赖数组（消除 exhaustive-deps warning）；② cmdBridge cleanup 改用捕获的同一份 ref 对象（消除 react-hooks 警告，语义不变）。
- **验收**：EditorPanel 的 features 域引用 editor/fileManager/import/lint/pwa/templates/themes/appRuntime **8 → 1**（只剩 `@features/editor/*`）。

**真机 CDP 双轮探针（合并覆盖全部关键判据，`p22-editor-wiring.png`）**：

| 判据 | 结果 |
|---|---|
| lint 接线：状态栏入口 → 点击 → `.aurora-lint-panel` 打开且有计数 | ✅（第 1 轮，计数「1 错误」） |
| dirty → 自动保存 → Ctrl+S 手动保存（S1/S6a 接线） | ✅（第 2 轮，未保存→已保存、字数增长、无异常） |
| ⌘K → 命令桥 openVersionHistory → **integration.modals 渲染的弹层打开** | ✅（第 2 轮，命中「版本历史」命令 1 节点，`.vh-count` 出现） |
| Escape 关闭无残留 / 全程零页面错误 | ✅（两轮均 0 条） |

**探针踩坑记录（复用价值）**：① Vite 默认绑 localhost 解析为 IPv6 回环，探针 fetch 127.0.0.1 会「进程已起但连不上」⇒ 必须 `--host 127.0.0.1`；② Edge spawn 路径在 bash 里反斜杠被吞 ⇒ 用正斜杠 + `--remote-debugging-address=127.0.0.1`；③ FileStore 两阶段初始化会用 IDB 覆盖 localStorage，新 profile 下数据种子不可靠 ⇒ 探针改走真实 UI（新建笔记按钮）造数据；④ 所见即所得（TipTap）会规范化「未闭合代码块」⇒ lint 取证必须在修改内容之前，且用 `# 一级标题`/`### 三级标题` 的层级跳跃制造 warning；⑤ 「未保存」态窗口只有防抖 500ms，键入后须立即抓取。

**验证**：tsc 干净 · 全量 vitest **1777 通过 / 0 失败**（136 文件）· ESLint 0 error（两文件 CLEAN）· 依赖图无环无双向 · vite build 通过（3589 模块）。

**路线图状态**：P0 / P1-1 / P1-2 / P1-3 / P2-1 / P2-2 / **P2-3** 全部完成；仅剩 P2-4（可选：两条可疑 feature 边）。

## 14. 实施记录 · P2-3（2026-09-28 完成）

**GraphPanel.tsx 2203 → 617 行**，全部产出文件 <800 行验收线（BlogPanel 主文件 541 行）：

| 文件 | 行数 | 职责 |
|---|---|---|
| `kb/GraphPanel.tsx` | 617 | 状态编排 + 组合（PageFrame/侧栏/画布/浮层三件套装配） |
| `kb/graph/graphModel.ts` | 350 | 模型/物理常量/simulateStep/工具（P2-3 首批） |
| `kb/graph/graphScope.ts` | 106 | 三档范围/现场隔离/裁剪谓词（P2-3 首批） |
| `kb/graph/useGraphScopeData.ts` | 136 | 范围状态族/kbDocs/裁剪集合/realData 映射 |
| `kb/graph/useGraphDerived.ts` | 186 | 邻接/模式作用域/可见性/分组聚合/搜索命中/dim 判定 |
| `kb/graph/useGraphEngine.ts` | 408 | 视口/力模拟 rAF 循环/指针手势/场景恢复与写回 |
| `kb/graph/GraphSidebar.tsx` | 360 | 左缘 hoverzone 导航浮层（范围/视图/筛选/分组/链接健康） |
| `kb/graph/GraphCanvasArea.tsx` | 220 | 顶部筛选条 + SVG 节点/边渲染 |
| `kb/graph/GraphOverlays.tsx` | 283 | 视图控制/导出菜单/信息卡/右键菜单/状态栏/空态 |
| `kb/graph/graphExport.ts` | 93 | PNG/SVG/JSON 导出（纯函数） |
| `blog/BlogPanel.tsx` | 541 | 状态编排 + 组合 |
| `blog/blogStudioModel.ts` 等 4 文件 | 233/78/324/254 | 注册表/原子控件/设置面板组/CSS+导出面板 |

**行为不变性证据**：纯机械搬家 + props 接线，无逻辑改写。jsdom 全量挂载的 `GraphPanel.smoke/scope` 与物理回归锁 `graphForce`（MAX_STEP 不变式）全绿；契约测试扫描面随拆分同步扩为「宿主+子模块拼接」（`themeMarketTypography` / `motionExit` 消费者断言——两处都是「断言实现语义而非文件位置」的判据，判据本身未动）。

**验证**：tsc 干净 · 全量 vitest **1777 通过 / 0 失败**（136 文件）· ESLint 0 error · 依赖图无环无双向 · vite build 通过（3602 模块）。

**路线图状态**：解耦六项全部完成，仅剩 P2-4（可选）。
