# MarkCraft 模块职责边界与耦合分析

> 分析日期：2026-09-17 · 视角：Software Architect（架构分层 / 依赖治理）
> 输入：`MarkCraft_源码结构审计报告_2026-09-17.md` + 现网代码全量静态分析
> 方法：Node 解析 555 个非测试源文件（`src/**/*.ts|tsx`，排除 `.test.*`/`.d.ts`）的全部 `import` / `export ... from` / 动态 `import()`，按模块聚合为**耦合矩阵**，计算入度/出度，检出双向依赖与模块级环，再抽查源码确认耦合形态。
> 说明：计数口径 = "引用该模块的**文件数**"（同一文件多次引用同一模块只计 1），用于衡量耦合广度而非频次。

---

## 1. 结论摘要（先读这一页）

MarkCraft 的**反向依赖铁律在"UI 层"维度是守住的**（逻辑/状态层零依赖 `aurora`/`components/ui` 的具体 UI）；但在**"基础 vs 业务"维度存在系统性倒置**——状态层与基础设施层反向依赖业务模块内的纯工具，形成 **8 个模块级循环**。

**根因单一且同构**：

> **"跨模块共享的能力"被就近寄居在某个上层模块里 → 上层拥有共享物 → 下层为使用它而反向引用 → 必然成环。**

同一病灶在三处独立复现：

| 寄居物 | 寄居位置（错） | 谁被迫反向引用 | 应然位置 |
|--------|--------------|--------------|---------|
| `collectAllFiles` / `createInitialFileTree` / `recentFilesManager` / `defaultDocsZh·En` | `features/fileManager/` | `stores`(5 文件)、`services`(2 文件) | `src/core/files/` 或 `src/utils/` |
| `tagExtractor`（extractTags/buildTagTree） | `features/tags/` | `stores/TagIndexStore` | `src/core/tags/` |
| `plantumlConstants` | `features/shared/utils/` | `stores/SettingsStore` | `src/utils/` 或 `src/constants/` |
| `navReturn`（面板间导航上下文） | `aurora/app/` | `aurora/panels/`(3 面板) | `aurora/navigation/`（共享层） |

**解耦的关键洞察**：这**不是**"把 import 改成别名"的机械工作，而是**把被动共享能力从上层模块剥离、下沉到无环的基础层**。一旦下沉，8 个环中的 **6 个自动消失**。

---

## 2. 模块画像：入度 / 出度矩阵

- **入度**（被多少模块引用）＝ 基础性。高入度 = 被广泛依赖的底座。
- **出度**（引用了多少外部模块）＝ 协调性。高出度 = 组装者 / 耦合中心。

| 模块 | 文件数 | 入度 | 出度 | 角色判定 | 评估 |
|------|-------|------|------|---------|------|
| `stores` | 24 | **102** | 18 | 状态底座 | 🔴 **基础性第一却出度 18** → 既被所有人依赖又依赖别人，循环总根源 |
| `types` | 4 | **79** | 1 | 纯类型基础 | ✅ 干净（出度 1 为 `locales`） |
| `components/ui` | 20 | **54** | 0 | UI 基元库 | ✅ 纯基础，零出度 |
| `features/shared` | 19 | **52** | 9 | ⚠️ **混合桶** | 🔴 既被 `stores` 依赖（常量），又依赖 `stores`（其 ui 组件）→ 双重身份 |
| `aurora/icons` | 1 | 35 | 1 | 图标资源 | ✅ 良好 |
| `features/fileManager` | 8 | 24 | 7 | ⚠️ 职责过载 | 🔴 被 `stores`/`services` 依赖其工具 → 越界 |
| `services` | 11 | 23 | 7 | 基础设施 | ⚠️ 与 `stores` 循环 |
| `utils` | 4 | 16 | 0 | 纯工具 | ✅ 零出度，标准基础层 |
| `hooks` | 10 | 13 | 8 | 共享 hooks | ⚠️ 与 `stores` 循环 |
| `aurora/components` | 17 | 12 | 16 | 外壳组件 | ⚠️ 与 `aurora/app` 循环 |
| `features/canvas-v2` | 30 | 10 | 7 | 白板业务 | ✅ 相对独立 |
| `features/editor` | 153 | 9 | **95** | 🔴 耦合中心 | 🔴 依赖 9 个其他 feature，重型扇出 |
| `aurora/styles` | 21 | 9 | 0 | 样式 | ✅ |
| `aurora/panels` | 63 | 2 | **165** | 组装层 | ⚠️ 高扇出属正常，但 165 说明与**全部**业务模块强绑 |
| `aurora/app` | 11 | 5 | 25 | 外壳装配 | ⚠️ 循环参与者 |
| `features/blog` | 123 | 1 | 32 | 业务（大） | ✅ 独立度高（入度仅 1，几乎自洽） |
| `features/toolbar` | 25 | 2 | 29 | ⚠️ 编辑器 UI | 🔴 与 `editor` 循环，且是"UI 落在逻辑层"的典型 |
| `features/knowledgeBase` | 28 | 4 | 26 | 业务 | ✅ 较独立 |

**读法**：
- `types` / `components/ui` / `utils` / `aurora/icons` 是**健康基础层**（高入度、低出度）。
- `stores` 与 `features/shared` 是**两个"身份撕裂"的模块**（高入度 + 非零出度指向同类或下层），是全部循环的策源地。
- `aurora/panels`(165) 与 `features/editor`(95) 是**两个高扇出枢纽**，任何模块重组都会牵动它们。

---

## 3. 循环依赖清单（8 环）与根因

静态分析检出 **8 个模块级环**：

| # | 环 | 根因 | 性质 |
|---|----|------|------|
| 1 | `stores > hooks > stores` | `hooks/useTheme`→`SettingsStore`、`useMarkdownRenderer`→`LanguageStore`；反向 `stores`→`hooks` 1 处 | 🟡 小规模，可断 |
| 2 | `stores > services > stores` | `services/backupService`→`collectAllFiles`(fileManager) 且两者都用 `stores` | 🔴 根因在共享工具寄居 |
| 3 | `stores > features/shared > stores` | `stores/SettingsStore`→`shared/utils/plantumlConstants`（常量）；反向 `shared/ui/*`→`LanguageStore` | 🔴 **shared 身份撕裂** |
| 4 | `stores > services > features/fileManager > stores` | `stores` 与 `services` 都依赖 `fileManagerUtils` | 🔴 共享工具寄居 |
| 5 | `stores > services > features/fileManager > features/templates > stores` | 同上 + `DailyNoteService` 链 | 🔴 同上 |
| 6 | `features/editor > features/toolbar > features/editor` | `editor/EditorSlots`→`toolbar`（渲染工具栏 UI）；`toolbar/MarkdownToolbar`→`editor`（取编辑器状态） | 🔴 **双向强耦合** |
| 7 | `aurora/app > aurora/panels > aurora/app` | `panels`→`app/navReturn`（导航返回上下文） | 🔴 共享状态寄居 app |
| 8 | `aurora/app > aurora/panels > aurora/components > aurora/app` | 同上 + `components`→`app` 1 处 | 🔴 同上 |

**分布特征**：8 环中 **5 环以 `stores` 为节点**（#1–#5），**3 环在 Aurora 外壳内部**（#7–#8 及部分 #6 同源）。即：**状态层与外壳层各有一处"共享物寄居"病灶**。

---

## 4. 耦合点清单（含严重度与证据）

### 🔴 C1 —— `stores` 反向依赖业务模块（分层倒置，最高危）
状态层为使用**纯函数/常量/数据**而 import `features/*`。

| 消费点 | 被依赖物（错位于 features） |
|--------|---------------------------|
| `stores/kbStore.ts:17`、`BlockIndexStore.tsx:4`、`LinkIndexStore.tsx:3` | `features/fileManager/fileManagerUtils.collectAllFiles` |
| `stores/TagIndexStore.tsx:3` | `features/tags/tagExtractor.{extractTags,buildTagTree,TagNode}` |
| `stores/TagIndexStore.tsx:4` | `features/fileManager/fileManagerUtils.collectAllFiles` |
| `stores/SettingsStore.tsx:2` | `features/shared/utils/plantumlConstants.DEFAULT_PLANTUML_ENDPOINT` |
| `stores/FileStore.tsx:6,7,8` | `features/fileManager/{recentFilesManager, defaultDocsZh, defaultDocsEn}` |

**为何是问题**：`stores` 是入度 102 的地基，却依赖入度 24 的业务模块 → **地基踩在楼层上**。任何 `fileManager` 重构都会震塌状态层。

### 🔴 C2 —— `services` 同样越界依赖 `features/fileManager`
`services/backupService.ts:4` → `collectAllFiles`；`services/fileService.ts:2,3,4` → `createInitialFileTree`、`defaultDocsZh/En`。与 C1 同构，是环节点 #2/#4/#5 的一半。

### 🔴 C3 —— `features/shared` 身份撕裂（"基础层"与"UI 层"同居）
`features/shared` 被 52 处依赖，内含三类异质物：
- `utils/*`（`mathRenderer`、`plantuml*`、`frontMatter`、`headingIdUtils`、`mermaidCache`、`imageHelpers`…）→ **基础能力**
- `ui/*`（`EmojiPicker`、`ErrorBoundary`、`FrontMatterPanel`、`OptimizeImagesModal`、`ScrollButtons`）→ **业务 UI 组件**
- `storage/imageStore` → **数据访问**

其中 `ui/FrontMatterPanel.tsx`、`ui/OptimizeImagesModal.tsx` 依赖 `@stores/LanguageStore`；而 `stores` 又依赖 `utils/plantumlConstants`。**同一目录同时充当"被底层依赖"和"依赖底层"两种角色 → 环 #3 不可避免。**

### 🔴 C4 —— `features/editor ↔ features/toolbar` 双向依赖
- `editor/EditorSlots.tsx`、`editor/extensions/MermaidBlockView.tsx` → `features/toolbar`（渲染工具栏）
- `toolbar/MarkdownToolbar.tsx` → `features/editor`（取编辑器状态）

**性质**：工具栏是编辑器的**专属 UI**，却与编辑器平级并互相引用。且 `features/toolbar` 含 25 个 `.tsx` 真实 UI 组件，是"UI 落在逻辑层"的集中体现（呼应审计报告 P0 架构张力）。

### 🔴 C5 —— Aurora 外壳内 `panels → app/navReturn`
`aurora/panels/kb/KbPanel.tsx:14`、`editor/EditorPanel.tsx:6,7`、`kb/GraphPanel.tsx:20` → `../../app/navReturn`（`setEditorReturn`/`getEditorReturn`/`clearEditorReturn`）。
**性质**：跨面板共享的**导航返回上下文**被 `app` 私有化 → `app`（组合 panels）与 `panels`（引用 app）成环 #7。

### 🟡 C6 —— `features/editor` 高扇出（依赖 9 个 feature）
`editor → shared(26)`、`→ lint(3)`、`→ toolbar(2)`、`→ export(2)`、`→ themes/preview/outline/search/imageUpload/fileManager(各1)`。
`features/editor` 有 153 文件、出度 95，是**最大耦合枢纽**。其中 `EditorLayout.tsx` / `EditorSlots.tsx` 承担了过多编排职责（"上帝组件"雏形）。

### 🟡 C7 —— `aurora/panels` 高扇出（165）
依赖几乎所有业务模块（`features/editor|canvas-v2|fileManager|diary|knowledgeBase|blog|export|import|templates|pwa|themes|settings|dashboard|commandPalette`…）。作为组装层高扇出可接受，但当前是**"逐个 import 具体实现"**的硬绑，缺一层"面板注册/契约"抽象。

### 🟡 C8 —— `features/fileManager` 职责过载
- 被 `stores`(5)/`services`(2) 依赖其**工具**（应为基础设施）→ C1/C2
- 内含 `defaultDocsZh.ts`(2103 行) / `defaultDocsEn.ts`(2756 行) **默认文档内容数据**（应为数据/种子资源）
- 同时提供 `recentFilesManager` 等**状态相关**能力

三类职责（基础工具 / 种子数据 / 业务逻辑）挤在一个 8 文件模块里。

### 🟡 C9 —— 横向耦合分散（feature 间 24 条边）
`editor→shared(26)` 为主，另有 `toolbar→fileManager(2)`、`fileManager→templates(1)`、`migrate→knowledgeBase(1)`、`dashboard→fileManager(1)`、`pwa→fileManager(1)`、`editor→{lint,export,themes,preview,outline,search,imageUpload}`。
**每个 feature 都知道太多邻居**，`fileManager` 被当作"万能数据源"横向依赖（入度 24）。

### ⚪ C10 —— `hooks ↔ stores` 小环
`hooks/useTheme.ts:2`→`SettingsStore`、`useMarkdownRenderer.ts:5`→`LanguageStore`；反向 `stores`→`hooks` 1 处。规模小，但同样是"共享 hook 与状态互相纠缠"。

---

## 5. 职责边界：现状 vs 应然

| 层 | 现状职责 | **应然职责** | 允许依赖 |
|----|---------|------------|---------|
| `types/` | 全局类型 | 全局共享类型（无逻辑） | 无（除 `locales`） |
| `utils/` | 通用工具 | **全部纯函数工具**（含从 fileManager/tags/shared 下沉者） | 无 |
| `core/`〔新建〕 | — | **无 UI 的领域基础能力**：文件树收集/初始化、标签提取、常量/种子数据 | `types` `utils` |
| `stores/` | 状态 + 反向依赖业务 | **纯状态与持久化**（Dexie/IndexedDB）；不得依赖 `features` | `types` `utils` `core` `services`(若 services 已成基础) |
| `services/` | 基础设施 + 依赖 fileManager | **无 UI 的横切服务**（备份/文件/同步） | `types` `utils` `core` `stores` |
| `locales/` | i18n | 文案与语言包 | `types` |
| `components/ui/` | 基础 UI 基元 | **唯一 UI 基元库**（Button/Modal/Input/Switch/Icon/Toast…） | `types` `utils` |
| `features/*/` | 业务逻辑 **+ 大量 UI** | **业务逻辑 + 该 feature 自包含 UI**（明确二分：`logic/` 与 `ui/`） | `types` `utils` `core` `stores` `services` `components/ui` `@该feature自身` |
| `aurora/` | 外壳 + 面板 + 样式 | **壳层**：window chrome / 命令 / 面板装配 | 全部下层 + `features` |
| `aurora/navigation/`〔新建〕 | — | 面板间共享导航上下文（`navReturn` 迁入） | `types` |

**三条新增硬边界（建议入守卫）**：
1. `stores` / `services` **禁止** import `features/**`（当前违规 7 处，见 C1/C2）。
2. `features/shared` **禁止**被 `stores`/`services` 依赖（其基础物下沉后自然满足）。
3. `aurora/app` 与 `aurora/panels` **禁止**互相 import（共享物迁 `aurora/navigation` 后自然满足）。

---

## 6. 解耦可行性结论

### 6.1 有利条件
- ✅ **UI 层反向依赖已零违规**（前次解耦 Batch A–D 的成果），本次是**"基础/业务"维度的第二轮**，方向明确。
- ✅ 别名体系（`@features/@stores/@core...`）已就位，迁移文件**不必改深相对路径**，改动面可控。
- ✅ 已有 ESLint 反向依赖守卫基建（`.eslintrc.guard.cjs` + `scripts/eslint-plugin-local/`），可**直接扩规则**承接新边界。
- ✅ 测试体量大（1499 例），迁移后回归可信度高。
- ✅ 8 环中 **6 环根因同为"共享能力寄居"**，一次下沉可连带修复，**性价比极高**。

### 6.2 不利条件 / 风险
- ⚠️ `stores` 被 102 处依赖、`aurora/panels` 出度 165 → **牵一发动全身**，必须靠别名与守卫降低风险。
- ⚠️ `features/editor`(153 文件/出度 95) 与 `features/blog`(123 文件) 体量巨大，拆分需谨慎分段。
- ⚠️ `features/shared` 被 52 处引用，**按内容分层拆分**会产生大量 import 变更点（但每处都是机械替换 + 别名可控）。
- ⚠️ 部分"疑似耦合"可能是**设计有意**（如 `services` 与 `stores` 的依赖方向），实施前需与作者确认意图（尤其 `hooks↔stores`）。

### 6.3 优先序（按"收益/风险比"）

| 优先级 | 动作 | 消除的环 | 风险 |
|--------|------|---------|------|
| **P0** | 抽 `src/core/`，下沉 `fileManagerUtils`/`tagExtractor`/`plantumlConstants`/`recentFilesManager`/默认文档数据 | #2 #3 #4 #5（4 环） | 低（纯移动 + 别名） |
| **P0** | `stores`/`services` 禁止 import `features` 的守卫落规则 | 防回流 | 低 |
| **P1** | 抽 `aurora/navigation/`，迁 `navReturn` | #7 #8（2 环） | 低 |
| **P1** | `features/shared` 按 `utils→utils/core`、`ui→components/ui或feature内`、`storage→services/stores` 拆分 | 巩固 #3 | 中（52 处引用） |
| **P1** | 明确 `features/toolbar` 归属（并入 `editor` 或下沉为 `components/editor-kit`），断 #6 | #6 | 中 |
| **P2** | `features/editor` 内部分层（`logic/` + `ui/` + `extensions/`）+ 给 `aurora/panels` 加"面板契约层"降低扇出 | — | 中高 |
| **P2** | `features/fileManager` 三职责分离（工具→core、数据→data、逻辑留原地） | 巩固 | 中 |

> 结论：**先做 P0 两件事（抽 `core/` + 落守卫），可一次性消掉 8 环中的 4 环、并锁死回流路径**——这是投入产出比最高的起点，也应作为后续所有解耦动作的地基。

---

## 7. 数据索引（可复现）

| 数据 | 来源 |
|------|------|
| 模块耦合矩阵 / 入出度 / 双向依赖 / 模块级环 | `scripts/_depgraph.cjs` 输出（Node 解析 555 文件的全量 import） |
| `stores→features` 违规 7 处 | Grep `features/` in `src/stores`（`kbStore:17`、`BlockIndexStore:4`、`LinkIndexStore:3`、`TagIndexStore:3,4`、`SettingsStore:2`、`FileStore:6,7,8`） |
| `services→features` 违规 4 处 | Grep `features/` in `src/services`（`backupService:4`、`fileService:2,3,4`） |
| `hooks↔stores` | `hooks/useTheme:2`、`hooks/useMarkdownRenderer:5` |
| `shared→stores` | `shared/ui/OptimizeImagesModal:4`、`shared/ui/FrontMatterPanel:3` |
| `panels→app` | `panels/kb/KbPanel:14`、`panels/editor/EditorPanel:6,7`、`panels/kb/GraphPanel:20` |
| `features/shared` 构成 | Glob `src/features/shared/**`（19 文件：storage 2 / ui 5 / utils 11 / test 1） |

**配套实施方案见 →** `MarkCraft_解耦实施方案_2026-09-17.md`
