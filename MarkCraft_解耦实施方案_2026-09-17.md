# MarkCraft 项目解耦实施方案

> 编制日期：2026-09-17 · 角色：Software Architect
> 依据：`MarkCraft_模块职责与耦合分析_2026-09-17.md`（8 个模块级环 / 10 个耦合点）+ `MarkCraft_源码结构审计报告_2026-09-17.md`
> 目标：把 MarkCraft 改造为**结构化、组件化**架构 —— 无环分层、职责单一、边界可守卫，便于后期维护与新增功能

---

## 0. 目标与非目标

### 0.1 目标（Outcome）
1. **消除全部 8 个模块级循环依赖**，建立**严格单向的分层依赖**。
2. **职责单一化**：每个模块只承担一类职责（状态 / 领域操作 / 纯能力 / UI 基元 / 业务 / 壳层）。
3. **边界可守卫**：新增边界**全部落 ESLint 规则**，防回潮（延续既有 `local/no-aurora-ui-import` 基建）。
4. **新增功能有明确落点**：给定"要加一个功能"，能从架构文档一眼得出它该放哪、可依赖谁。

### 0.2 非目标（Explicitly NOT doing）
- ❌ 不改任何**运行时行为 / 视觉 / 交互**（纯结构治理，例外可见性零变化）。
- ❌ 不重写业务逻辑、不引入新框架/状态库/测试框架。
- ❌ 不做"为了解耦而解耦"的过度抽象（如为 2 处依赖引入事件总线）。
- ❌ 不追求"目录绝对整齐"，只解决**真实耦合与职责错位**。
- ⚠️ `features` 内含 UI 的"架构张力"（审计 P0）**本方案只做二分与归档，不做整体搬迁** —— 原因见 §5.2。

---

## 1. 解耦范围

### 1.1 在范围内（In Scope）

| # | 范围 | 具体对象 | 消除的环 |
|---|------|---------|---------|
| S1 | **持久化基础设施下沉** | `stores/storage/{db,migrate}.ts` → `src/core/storage/` | #2 |
| S2 | **业务工具下沉** | `features/fileManager/{fileManagerUtils,recentFilesManager,defaultDocsZh,defaultDocsEn}`、`features/tags/tagExtractor`、`features/shared/utils/plantumlConstants` → `src/core/` | #3 #4 #5 |
| S3 | **Aurora 共享导航层** | `aurora/app/navReturn.ts` → `aurora/navigation/` | #7 #8 |
| S4 | **`features/shared` 按内容分层拆分** | `utils/*`→`utils|core`、`ui/*`→`components/ui|归属 feature`、`storage/*`→`services|core/storage` | #3 #1 |
| S5 | **编辑器工具栏归属收敛** | `features/toolbar/*` 与 `features/editor` 的循环 | #6 |
| S6 | **`hooks ↔ stores` 方向收敛** | 反转 `stores→hooks` 的 1 处 | #1 |
| S7 | **边界守卫落地** | 新增 5 条 ESLint 禁则 | 防回流 |
| S8 | **（后置）结构性重构** | `features/editor` 内部分层、`aurora/panels` 契约层、`fileManager` 三职责分离 | — |

### 1.2 不在范围内（Out of Scope）
- `features/blog`(123 文件)、`features/canvas-v2`(30)、`features/knowledgeBase`(28) 等**高独立度业务模块**：它们入度极低（blog 入度 1），无循环，**不动**。
- `components/ui`、`types`、`utils`、`aurora/icons`：已是健康基础层，**不动**。
- `styles/*` 与 `aurora/styles/*` 的 CSS 职责重叠：属 CSS 治理，独立成题。
- 死代码清理（`Input`/`EmptyState`/`injectCanvasTheme`）、`newThemes.ts` 拆分：审计报告已立项，与本方案并行不耦合。

---

## 2. 目标模块划分与依赖关系

### 2.1 目标分层（严格单向，箭头 = 允许依赖方向）

```
┌──────────────────────────────────────────────────────────────┐
│ L6  aurora/            壳层：window chrome / 命令 / 面板装配    │
│       ├── navigation/  ← 新增：跨面板共享导航上下文            │
│       ├── app/  panels/  components/  styles/  themes/  icons  │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│ L5  features/*         业务模块（每个 feature = 自包含单元）    │
│       logic + ui + extensions（同一 feature 内允许互相依赖）    │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│ L4  services/          领域操作 / 横切服务（无 UI、无状态存储） │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│ L3  stores/            状态与持久化编排（Dexie/IndexedDB）      │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│ L2  components/ui/  +  locales/        UI 基元 / 文案           │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│ L1  core/  ← 新增：无 UI 的领域基础能力（纯函数 + 常量 + 数据）  │
│       files/  tags/  storage/  constants/  data/               │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│ L0  types/  +  utils/          零依赖底座（只允许 utils→types） │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 允许依赖矩阵（行 = 消费者，列 = 被依赖；✅=允许 ❌=禁止）

| ↓依赖 / 被依赖→ | types | utils | core | locales | comp/ui | stores | services | features | aurora |
|-----------------|:-----:|:-----:|:----:|:-------:|:-------:|:------:|:--------:|:--------:|:------:|
| `types`         | —     | ❌    | ❌   | ❌      | ❌      | ❌     | ❌       | ❌       | ❌     |
| `utils`         | ✅    | —     | ❌   | ❌      | ❌      | ❌     | ❌       | ❌       | ❌     |
| **`core`**      | ✅    | ✅    | —    | ❌      | ❌      | ❌     | ❌       | ❌       | ❌     |
| `locales`       | ✅    | ❌    | ❌   | —       | ❌      | ❌     | ❌       | ❌       | ❌     |
| `components/ui` | ✅    | ✅    | ✅   | ❌      | —       | ❌     | ❌       | ❌       | ❌     |
| **`stores`**    | ✅    | ✅    | ✅   | ✅      | ❌      | —      | ✅       | ❌       | ❌     |
| **`services`**  | ✅    | ✅    | ✅   | ✅      | ❌      | ❌      | —        | ❌       | ❌     |
| `features/*`    | ✅    | ✅    | ✅   | ✅      | ✅      | ✅     | ✅       | ✅(同域) | ❌     |
| `hooks/`        | ✅    | ✅    | ✅   | ❌      | ✅      | ✅     | ✅       | ✅       | ❌     |
| `aurora/**`     | ✅    | ✅    | ✅   | ✅      | ✅      | ✅     | ✅       | ✅       | ✅     |

**三条本次新增的强约束**：
1. ❌ `stores` / `services` **禁止** import `features/**`（当前违规 7+4 处 → C1/C2）。
2. ❌ `services` **禁止** import `stores/**`（当前违规 2 处 → 环 #2；`stores/storage` 下沉后自然满足）。
3. ❌ `aurora/app` 与 `aurora/panels` **禁止互相 import**（当前 2+3 处 → 环 #7/#8；`navReturn` 迁移后自然满足）。

> ⚠️ `stores ↔ stores`（同层内）与 `features ↔ features`（同域内）允许，本方案不强制打散。

### 2.3 新增目录与别名

| 新增 | 内容 | 动机 |
|------|------|------|
| `src/core/` | `files/`（文件树收集/初始化/最近文件）、`tags/`（标签提取）、`storage/`（Dexie/IndexedDB 封装）、`constants/`、`data/`（默认文档种子） | 承载"被多层共享的无 UI 能力"，断开分层倒置 |
| `src/aurora/navigation/` | `navReturn.ts` | 跨面板共享导航上下文，归壳层而非 app |
| 别名 `@core` → `src/core` | 同步改 `tsconfig.json` paths + `vite.config.ts` alias | 迁移不改深相对路径（沿用 Batch A–D 成果） |

---

## 3. 分阶段实施步骤

> **统一纪律（每阶段都必须遵守，源自项目既有铁律）**：
> ① 每阶段独立提交，**频繁提交是唯一防线**；② 同一文件多处 Edit **必须串行**（并行会静默丢改动）；
> ③ 回写文件**保真换行符**（本仓 CRLF/LF 混用）；④ 守卫断言**必须负向验证**（注入回归 → 确认真报红 → 撤除）；
> ⑤ 涉及视觉/交互的改动才需真机 CDP 取证，纯结构迁移以 **tsc + vitest 全绿 + 守卫零违规**为准；
> ⑥ 别名改动必须 **tsconfig.json 与 vite.config.ts 同步**。

---

### Phase 0 —— 地基准备（不改任何业务代码）✅ 已完成（2026-09-17）

| 动作 | 细节 | 状态 |
|------|------|------|
| 0.1 建骨架 | 建 `src/core/{files,tags,storage,constants,data}/index.ts`（空导出，含各目录职责与下沉来源注释）。**刻意不建根 barrel `src/core/index.ts`** —— 桶会让整个子图被任何消费者连带挂进模块图（dev 无 tree-shaking） | ✅ |
| 0.2 加别名 | `tsconfig.json` paths 与 `vite.config.ts` alias 同步加 `@core` → `src/core`（含 `@core/*`），双处同改 | ✅ |
| 0.3 扩守卫（warn） | `.eslintrc.guard.cjs` 加 3 条新禁则为 **warn**，规则落 `scripts/eslint-local-rules/`。**抽出共用工厂 `_forbidden-import.cjs`**：三条规则只有「禁止目标」与文案不同，判定逻辑同构，复制三份会导致后续修 bug 漏改。工厂在 `no-aurora-ui-import` 模式基础上**多覆盖 `export ... from`**（实测全仓 4 处均在 aurora 层向下 → 零新增误报） | ✅ |
| 0.4 基线快照 | 归档 `.workbuddy/artifacts/BASELINE-phase0-2026-09-17.md` + `depgraph-phase0-baseline.txt` | ✅ |

**实测验收**：`tsc` **0 错误**；`vitest` **112 文件全通过 / 1499 passed · 2 skipped · 0 failed**；守卫 **0 error / 16 warning**；模块级环 **8 个**。

> ⚠️ **修正原估算**：原方案写「守卫以 warn 报出当前 9 处违规（7 stores + 2 services）」，**实测为 16 处** ——
> `no-store-to-feature` **9** 处、`no-service-to-feature` **4** 处、`no-service-to-store` **3** 处。
> 原数字是「文件数」与「语句数」混用所致。明细见基线快照 §2（精确到文件:行号，供 Phase 1/2 逐条核销）。

**本阶段额外修掉一个预存缺陷（非本次引入）**：守卫配置只加载 `local` 插件，而源码含
`// eslint-disable-next-line react-hooks/exhaustive-deps` 指令 → ESLint 对「指令引用未加载插件的规则」
直接报 error，产生 **7 处假错误**，会让 pre-commit 在与架构无关的原因上卡死。
已用 HEAD 版配置复现证实为预存，修复方式为 `plugins: ['local', 'react-hooks']`
（**只加载插件、不启用规则** → 指令可解析且不新增任何 lint 债）。

**守卫负向验证**：注入探针 + 删除，逐条证明 5 条代码路径（别名/相对 × import/export-all/export-named/动态 import/require）
共 **8/8 精确命中**。意义在于：16 处真实违规**全是「相对路径 + import」单一形态**，
不注入探针则其余路径处于「写了但从未被验证」的假安全状态。

**风险**：无（零业务改动，运行时/视觉零变化）。

---

### Phase 1 —— 下沉持久化基础设施 → 断环 #2

| 动作 | 细节 |
|------|------|
| 1.1 迁移 | `stores/storage/db.ts` → `core/storage/db.ts`；`stores/storage/migrate.ts` → `core/storage/migrate.ts`；`stores/storage/index.ts` 若存在一并迁 |
| 1.2 更新引用 | 消费方：`services/backupService.ts:2,3`、`services/fileService.ts:6`、`stores/*`（FileStore 等）、`stores/storage/__tests__/db.test.ts` → 改用 `@core/storage/*` |
| 1.3 兼容 | 保留 `stores/storage/index.ts` 作 **re-export 壳**（1 个迭代后删），避免一次性改爆 |
| 1.4 收紧守卫 | 把"`services` 禁止 import `stores/**`"由 warn 升 **error** |

**验收**：`stores ↔ services` 环消失（`_depgraph.cjs` 复核无 `stores > services > stores`）；`tsc` + `vitest` 全绿；守卫 0 违规。
**风险**：🟢 低。Dexie 封装迁移不涉逻辑；唯一注意 `db.test.ts` 路径断言。

---

### Phase 2 —— 下沉业务工具 → 断环 #3 #4 #5（本方案最高收益步）

| 动作 | 从 | 到 | 主要消费方（需更新） |
|------|----|----|---------------------|
| 2.1 | `features/fileManager/fileManagerUtils.ts` | `core/files/fileTree.ts` | `stores/{kbStore,BlockIndexStore,LinkIndexStore,TagIndexStore}`、`services/{backupService,fileService}`、`features/fileManager/*` 内部、`aurora` 若有引用 |
| 2.2 | `features/fileManager/recentFilesManager.ts` | `core/files/recentFiles.ts` | `stores/FileStore.tsx:6` 等 |
| 2.3 | `features/fileManager/defaultDocsZh.ts` / `defaultDocsEn.ts` | `core/data/defaultDocs/{zh,en}.ts` | `stores/FileStore.tsx:7,8`、`services/fileService.ts:3,4` |
| 2.4 | `features/tags/tagExtractor.ts` | `core/tags/tagExtractor.ts` | `stores/TagIndexStore.tsx:3`、`features/tags/*` 内部 |
| 2.5 | `features/shared/utils/plantumlConstants.ts` | `core/constants/plantuml.ts` | `stores/SettingsStore.tsx:2`、其他引用方 |
| 2.6 | 收紧守卫 | 把"`stores`/`services` 禁止 import `features/**`"由 warn 升 **error** |

**关键约束**：2.1 的下沉**必须完整**——`fileManagerUtils` 若同时含少量 fileManager 专属逻辑，需**先切分**（纯函数进 `core`，专属留 `features/fileManager`），不得整体照搬。
**验收**：环 #3 #4 #5 消失；`stores`/`services` 对 `features` 依赖 = **0**（Grep 复核）；全绿。
**风险**：🟡 中。迁 6 文件 + 约 15 处 import；`defaultDocs*`(共 4859 行)移动后注意**大文件不重排内容**（避免无意义 diff）。

---

### Phase 3 —— Aurora 外壳解环 → 断环 #7 #8

| 动作 | 细节 |
|------|------|
| 3.1 迁移 | `aurora/app/navReturn.ts` → `aurora/navigation/navReturn.ts` |
| 3.2 更新引用 | `aurora/panels/kb/KbPanel.tsx:14`、`panels/editor/EditorPanel.tsx:6,7`、`panels/kb/GraphPanel.tsx:20`、相关 `.smoke.test.tsx` → 改相对路径（`../../navigation/navReturn`） |
| 3.3 清理反向 | 检查 `aurora/components → aurora/app` 的 1 处，若为同类共享物一并归位 |
| 3.4 加守卫 | 新增规则："`aurora/app` 与 `aurora/panels` 禁止互相 import" → error |

**验收**：环 #7 #8 消失；Aurora 内 `app`/`panels` 无互相 import；全绿。
**风险**：🟡 中。涉及 5 处源码 + 多个 smoke 测试；`navReturn` 是导航上下文，**迁移后须跑一次真机 CDP** 验证"编辑器↔知识库返回"链路仍正常。

---

### Phase 4 —— `features/shared` 按内容分层拆分 → 断环 #3 残部/#1

| 内容类 | 现状 | 目标 |
|--------|------|------|
| `utils/*`（11 文件：`mathRenderer`、`plantuml*`、`frontMatter`、`headingIdUtils`、`mermaidCache`、`imageHelpers`、`emojiData`、`ShortcutManager`、`HighlightMark`、`lintTypes`） | 寄居 features | `src/utils/` 或 `src/core/utils/`（按是否含领域语义） |
| `ui/*`（5 文件：`EmojiPicker`、`ErrorBoundary`、`FrontMatterPanel`、`OptimizeImagesModal`、`ScrollButtons`） | 寄居 features | 通用件（`ErrorBoundary`/`ScrollButtons`）→ `components/ui/`；业务件 → 归入消费方 feature（如 `features/editor`） |
| `storage/imageStore(.ts|Types.ts)` | 寄居 features | `core/storage/imageStore` 或 `services/` |
| `__tests__/plantumlEncoder.test.ts` | 随迁 | 跟随被测文件 |

**收尾**：`features/shared/` 目录**清空后删除**（或保留仅放真正"跨 feature 业务共享"，且**禁止**再被 `stores`/`services` 依赖）。
**验收**：`features/shared` 不再被 `stores`/`services` 依赖；`stores↔shared` 环消失；全绿 + 守卫零违规。
**风险**：🟡 中高。`shared` 被 **52 处**引用 → 建议按"类"分批（utils 一批、ui 一批、storage 一批）**三次提交**，每批独立验证。

---

### Phase 5 —— 编辑器工具栏归属 + hooks/stores 方向收敛 → 断环 #6 #1

**5.1 `features/editor ↔ features/toolbar`**（已决策：选 A，并入 `features/editor/toolbar/`）

| 方案 | 内容 | 优势 | 代价 |
|------|------|------|------|
| **5.1-A（推荐）** | `features/toolbar/*` 并入 `features/editor/toolbar/` | 同域内依赖天然合法；符合"工具栏是编辑器专属 UI"语义；消除跨 feature 环 | 改动 25 文件路径 + 约 5 处 import |
| 5.1-B | 整体迁 `components/ui/editor-kit/`（或 `aurora/components/editor-kit/`） | 迎合"UI 落 aurora/基元库"铁律 | 工具栏与编辑器强耦合，跨层依赖会变成 `editor → components/ui/editor-kit`，语义变差 |

> **已选 A（2026-09-17 拍板）**：`toolbar` 与 `editor` 的耦合是**领域内聚**，不是层次污染；并入同域比"按 UI/逻辑强行切开"更健康。

**5.2 `hooks ↔ stores`**
- 反转 `stores → hooks` 的 1 处（`stores` 不应调用 React hook；若为 hook 化逻辑，应改为纯函数放 `core`）。
- 保留 `hooks → stores`（hook 读状态，方向正确）。

**验收**：环 #1 #6 消失；**8 环全部清零**（`_depgraph.cjs` 复核 `MODULE-LEVEL CYCLES = (none)`）。
**风险**：🟡 中。Phase 5 完成后应做**一次完整真机回归**（四视图 + 编辑器工具栏交互）。

---

### Phase 6 —— 结构性重构（后置，独立排期）

| 动作 | 说明 |
|------|------|
| 6.1 `features/editor` 内部分层 | 153 文件按 `logic/`（cm6、extensions、convert）、`ui/`（EditorLayout、EditorSlots、面板）、`toolbar/` 归档；给"上帝组件"`EditorLayout`/`EditorSlots` 拆编排职责 |
| 6.2 `aurora/panels` 契约层 | 由"逐个 import 具体实现"改为**面板注册表**（`{ id, title, load: () => import(...) }`），降低 165 扇出、支持懒加载 |
| 6.3 `features/fileManager` 三职责彻底分离 | 工具（已迁 core）/ 种子数据（已迁 core/data）/ 业务逻辑（留原地），模块瘦身至单一职责 |
| 6.4 架构文档固化 | 把 §2 分层与允许依赖矩阵写入 `docs/ARCHITECTURE.md`，作为新增功能的落点判据 |

---

## 4. 影响评估

### 4.1 改动面估算

| 阶段 | 迁移文件 | 需更新 import 的文件（估） | 新增文件 | 阻碍度 |
|------|---------|------------------------|---------|--------|
| Phase 0 | 0 | 0 | `core/*` 骨架 5 个 + 守卫规则 3 个 | 🟢 无 |
| Phase 1 | 2–3 | ~6 | 0 | 🟢 低 |
| Phase 2 | 6 | ~15 | 0 | 🟡 中 |
| Phase 3 | 1 | ~6（含 4 测试） | 0 | 🟡 中 |
| Phase 4 | 17 | ~52 | 0 | 🟡 中高 |
| Phase 5 | 25（若选 A） | ~5 | 0 | 🟡 中 |
| Phase 6 | — | — | 面板注册表等 | 🟠 中高 |
| **合计（P0–P2）** | **~51 文件迁移** | **~84 处 import 更新** | **~8** | — |

### 4.2 对现有质量基线的预期影响

| 指标 | 现状 | 预期 |
|------|------|------|
| 模块级循环 | **8 个** | **0 个**（Phase 5 后） |
| `stores`/`services` → `features` 违规 | 11 处 | **0**（Phase 2 后，且守卫 lock） |
| 反向依赖（逻辑层→UI 层） | 0（已守） | 保持 0 |
| 测试用例 | 1499 passed / 2 skipped / 0 failed | **不减**；迁移涉及的测试做路径更新，断言不放宽 |
| `tsc` | 干净 | 保持干净 |
| 运行时行为 / 视觉 | — | **零变化**（纯结构迁移） |

### 4.3 性能影响
- 迁移**不新增**运行时开销（只是文件位置与 import 路径变化）。
- Phase 6.2 的"面板注册表 + 动态 import"**可能正向改善**首屏（按需加载面板），但属**行为变更**，需单独验证与拍板，**不混入本次纯解耦**。

---

## 5. 风险提示与缓解

### 5.1 风险清单

| # | 风险 | 等级 | 缓解措施 |
|---|------|------|---------|
| R1 | **`stores` 是入度 102 的地基**，迁移/改动波及面大 | 🔴 高 | ① 别名 `@core` 化，**不改深相对路径**；② Phase 1/2 **保留 `stores/storage/index.ts` re-export 壳**过渡；③ 每阶段独立提交 + 全量 vitest |
| R2 | **本仓 CRLF/LF 混用**，回写易丢换行符 → 整文件 diff | 🟡 中 | 严格执行铁律：探 `raw.includes('\r\n')` → 拆 `/\r?\n/` → 回写原 EOL；**禁 `split('\n')+join('\n')`**；大文件（`defaultDocs*` 4859 行）**只移动不重排** |
| R3 | **同文件多处 Edit 并行 → 静默丢改动**（症状：tsc 报"声明未使用"+"找不到名称"自相矛盾） | 🟡 中 | 同文件 Edit **串行**；改完**逐文件 grep 核验**关键行，不只看 Edit 返回 success |
| R4 | **守卫断言可能"空转"**（通过 ≠ 有效） | 🟡 中 | 每条新守卫**必须负向验证**：注入违规 → 确认报红 → 撤除；再全绿 |
| R5 | Phase 4 触及 `shared` **52 处引用**，一次性改风险集中 | 🟡 中 | 按"utils / ui / storage"**三类三批**提交，每批独立验证 |
| R6 | Phase 3 改 `navReturn` 可能影响**编辑器↔知识库返回链路** | 🟡 中 | 迁移后进行**真机 CDP 取证**（四视图导航往返），而非只看单测 |
| R7 | **`features` 含 UI 的架构张力**：若强行"UI 全迁 aurora"，会与 R1 叠加成巨量改动 | 🔴 高 | 本方案**明确不做整体搬迁**（见 5.2），只在 Phase 4/5 做**局部归属收敛** |
| R8 | 部分"疑似耦合"可能是**设计有意**（`hooks↔stores`、`services→stores`） | 🟡 中 | Phase 1/5 动手前**与作者确认意图**；若确认有意，则改为"在架构文档中显式声明例外 + 守卫加白名单"，而非强改 |
| R9 | 别名/守卫改动可能出现 **tsconfig 与 vite 不同步** → dev 正常但 tsc 报错（或反之） | 🟢 低 | 别名一律**双处同改**，改后跑 `tsc --noEmit` + dev server 冒烟 |
| R10 | 迁移过程中**工作区被外部清空**（本仓历史发生过） | 🟡 中 | 每阶段**频繁提交**；必要时 `git restore --source=HEAD --worktree -- <路径>` |

### 5.2 关于"features 含 159 个 .tsx"的处置说明（已拍板：承认 feature-sliced 变体）

审计报告把此列为 **P0 架构张力**，但**本方案不安排"整体搬迁到 aurora"**，理由（trade-off）：

- `features` 内 UI 是**业务内聚**的（工具栏随编辑器、博客面板随 blog），搬到 `aurora` 会制造**跨层反向依赖**（`features` 逻辑需要自己的 UI 时只能反向引用 aurora）——**那是比现状更坏的架构**。
- 正确做法是**承认 feature-sliced 变体**：`features/*` = 自包含业务单元（logic + ui），`aurora` = 壳层 + 装配 + 基础组合。据此**修订铁律表述**（原"UI 落 aurora / features 是逻辑层"改为"业务 UI 随 feature 自包含；壳层 UI 落 aurora；通用 UI 落 components/ui"）。
- 本方案只在 Phase 4/5 做**局部归位**：通用件（`ErrorBoundary`/`ScrollButtons`）→ `components/ui`；编辑器专属（toolbar）→ 与 editor 同域。

> 该决策**已于 2026-09-17 由用户拍板**：承认 feature-sliced 变体，**据此修订铁律 ④**（原"UI 落 aurora / features 是逻辑层"改为"业务 UI 随 feature 自包含；壳层 UI 落 aurora；通用 UI 落 components/ui"）。已同步更新 `MEMORY.md` 铁律与 ESLint 守卫语义规划。

---

## 6. 建议执行顺序与里程碑

```
Phase 0  地基（core 骨架 + @core 别名 + 守卫 warn + 基线快照）      ← 0.5 天
   ↓
Phase 1  持久化下沉 → 断环 #2                                       ← 0.5 天   【里程碑 M1：stores↔services 解环】
   ↓
Phase 2  业务工具下沉 → 断环 #3 #4 #5                              ← 1 天     【里程碑 M2：stores/services 对 features 依赖=0】
   ↓
Phase 3  Aurora 解环 → 断环 #7 #8                                  ← 1 天     【里程碑 M3：外壳无环】
   ↓
Phase 4  features/shared 分层拆分 → 断环 #3 残部/#1                 ← 1.5 天
   ↓
Phase 5  toolbar 归属 + hooks/stores 收敛 → 断环 #6 #1              ← 1 天     【里程碑 M4：8 环全清零 + 真机回归】
   ↓
Phase 6  结构性重构（editor 内部分层 / panels 契约层 / fileManager 瘦身）  ← 独立排期
```

**每个里程碑的放行条件**：`tsc` 干净 + `vitest` 全绿 + `_depgraph.cjs` 复核环已消除 + ESLint 守卫 0 违规 + （M3/M4）真机 CDP 零回归。

---

## 7. 附：验证与守卫清单

**验证工具**：`scripts/_depgraph.cjs`（模块耦合矩阵 / 环检测，本次已建，建议保留为常备架构体检工具）
**守卫文件**：`.eslintrc.guard.cjs`（lint-staged 闸口）+ `scripts/eslint-local-rules/*.cjs`
+ 共用工厂 `scripts/eslint-local-rules/_forbidden-import.cjs`（判定逻辑单源）

**守卫规则现状**：

| # | 规则 | 禁止 | 落地状态 |
|---|------|------|---------|
| 1 | `local/no-store-to-feature` | `stores/**` → `features/**` | ✅ Phase 0 已落（warn，9 处存量）→ Phase 2 清零点后升 error |
| 2 | `local/no-service-to-feature` | `services/**` → `features/**` | ✅ Phase 0 已落（warn，4 处存量）→ Phase 2 清零点后升 error |
| 3 | `local/no-service-to-store` | `services/**` → `stores/**` | ✅ Phase 0 已落（warn，3 处存量）→ Phase 1 下沉后升 error |
| 4 | `local/no-app-panels-cycle` | `aurora/app` ⇄ `aurora/panels` 互禁 | ⏳ Phase 3 落地 |
| 5 | `local/no-aurora-ui-import` | `features/stores/services` → `aurora/**` | ✅ 既有规则，保持不变（error，当前 0 违规） |

> 1–3 均覆盖 5 种形态：`import` / `import type` / 动态 `import()` / `require()` / `export ... from`。

**参考文档**：
- `MarkCraft_模块职责与耦合分析_2026-09-17.md`（本方案依据）
- `MarkCraft_源码结构审计报告_2026-09-17.md`（结构全景与死代码）
