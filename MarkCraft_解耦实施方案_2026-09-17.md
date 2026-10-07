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
| S1 | **持久化基础设施下沉** ✅ | `stores/storage/{db,migrate,blobStore}.ts` + `__tests__/` → `src/core/storage/`（8 处引用已更新，`stores/storage/` 目录整体移除） | #2 ✅ |
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
1. ❌ `stores` / `services` **禁止** import `features/**`（基线 9+4 处 → **Phase 2 已归零并升 error**；实测两层出边已无 features）。
2. ❌ `services` **禁止** import `stores/**`（基线 3 处 → **Phase 1 已归零并升 error**；环 #2 消失）。
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
> ⑥ 别名改动必须 **4 处同改**：`tsconfig.json` / `vite.config.ts` / `vitest.config.ts` / `vite.smoke.config.ts`
>   —— Phase 1 实测：只改前两处 → **vitest 20 个测试文件导入期崩溃**。契约测试 `src/aliasSync.test.ts` 已看守；
>   `scripts/_depgraph.cjs` 改为从 `vite.config.ts` **派生**，不再是第 5 份副本。
> ⑦ 排查「谁引用了某目录 X」时，**必须同时搜 `./X` / `../X` 同层相对形态** —— 只搜目录路径字符串会漏掉
>   整类「同层就近引用」（Phase 1 实测漏 2 处，且它们恰是 `stores → stores/storage` 的形态）。
> ⑧ **验证工具本身要先证「看得见」**：`_depgraph.cjs` 遇到未登记别名会**静默丢边** → 漏报环，症状是「图更干净了」。
>   任何阶段宣布「环已消除」前，先确认该环涉及的模块在边列表中**有非零边数**（Phase 1 实测 `core` 边数为 0）。

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

### Phase 1 —— 下沉持久化基础设施 → 断环 #2 ✅ 已完成（2026-09-17）

| 动作 | 细节 | 状态 |
|------|------|------|
| 1.1 迁移 | `stores/storage/{db,migrate,blobStore}.ts` + `__tests__/db.test.ts` → `core/storage/`（**字节级搬迁**，`Buffer.compare` 实测 identical，CRLF 保留）。原清单只列 db/migrate，**追加 `blobStore.ts`**：它与二者同属一个「持久化基建」簇，只迁两个会让 `stores/storage/` 残留同性质文件、目录无法消失 | ✅ |
| 1.2 更新引用 | 实测 **8 处 / 7 文件**（原方案只识别出 3 处），全部改为 `@core/storage/*` | ✅ |
| 1.3 兼容壳 | **有意不做**（偏离原方案，理由见下） | ⏭️ |
| 1.4 收紧守卫 | `local/no-service-to-store` 由 warn 升 **error**，并注入探针验证「真阻断」（exit=1） | ✅ |

**实测验收**：环 #2 `stores > services > stores` **消失**（8 环 → 7 环）；`tsc` 0 错误；`vitest` **113 文件 / 1505 passed · 2 skipped · 0 failed**（基线 1499 + 新增契约 6）；守卫 13 warning / **0 error**；`core` 出度 = **0**（纯叶子层，分层承重假设成立）。

#### ⚠️ 1.2 的关键修正：原方案漏掉了 2 处消费者

原方案与耦合分析都写「消费方：services 的 3 处 + FileStore 等 stores」。实测漏了 **2 处**：

| 漏掉的引用点 | 形态 | 为什么被漏 |
|---|---|---|
| `src/stores/kbStore.ts:6` | `import { db } from './storage/db'` | **同目录相对路径**，不含 `stores/storage` 字样 → 以 `stores/storage` 为模式的检索恒不可见 |
| `src/stores/NoteVersionStore.tsx:2` | 同上 | 同上 |

> 教训（已升为判据）：**排查「谁引用了 X 目录」不能只搜目录路径字符串**，必须同时搜「同目录相对引用」`./X/...`、`../X/...`。否则会漏掉「同层内部就近引用」这一整类——而它们恰恰是 `stores → stores/storage` 的形态。

#### ⏭️ 1.3 为何不做 re-export 兼容壳

原方案为「避免一次性改爆」而保留 `stores/storage/index.ts` 壳。实测该目录**原本就没有 `index.ts`**，且真实爆炸半径只有 **8 处引用**（方案预估「stores 入度 102 波及面大」是针对 `stores/*` 整体，不是 `stores/storage/*`）。
在这种量级下，兼容壳反而有害：它会留下**第二个导入源**（同一能力可从 `@core/storage/*` 与 `stores/storage/*` 两条路径进入），正是漂移的温床。
故一次改净、直接删除目录（实测删后 `stores/` 下 18 项、零残留引用）。

#### 🚨 1.5 过程中挖出的两个真问题（原方案未预见）

**① 别名表实际有 4 处，方案纪律⑥只写了 2 处 → 20 个测试文件导入期崩溃**

方案「统一纪律⑥」写「别名改动必须 `tsconfig.json` 与 `vite.config.ts` 同步」。实测别名表复制在 **4 处**：
`tsconfig.json` / `vite.config.ts` / **`vitest.config.ts`** / **`vite.smoke.config.ts`**。

Phase 1 首次引用 `@core` 时只改了前两处 → **vitest 解析不到 `@core`，20 个测试文件在导入期直接崩溃**（1499 → 1334 用例，测试文件数不变 ⇒ 是加载失败而非断言失败）。

> 最阴险的地方：Phase 0 加别名后 `tsc` + `vitest` **全绿**，但那只说明「别名尚无人引用的休眠期」，绿灯给了「两处就够」的假信心。**休眠配置的绿灯不能当作已生效的证明。**
>
> 处置：补齐 4 处；新增契约测试 `src/aliasSync.test.ts`（6 例）把 4 份钉在一起 —— 不只比「键集合」，还比「目标目录」（防「键补齐、值写错」）；并负向验证过（移除一处 → 2 例精确报红 → 还原全绿）。

**② `_depgraph.cjs` 对 `@core` 失明 → 会静默丢边、漏报环**

该工具原用**硬编码别名表**（第 5 份副本），未登记 `@core` → `resolveSpec` 返回 null → `@core/*` 的导入被**静默丢弃**，实测 `core` 的边数为 **0**。
而 30 条未解析项里 3 条真问题（`@core/storage/*`）被 `@tiptap/*`、`@codemirror/*` 等 npm 包淹没，肉眼几乎无法发现。

> 这是最危险的失败方向：**图看起来「更干净了」，真相是它没看见。** 而该工具是后续每个阶段「环是否消失」的唯一判据 —— 带着失明的地图推进，等于用假绿验收。

处置（3 项）：
1. 别名表改为**从 `vite.config.ts` 派生**（解析失败即 fail-fast，拒绝以残缺图下结论）→ 第 5 份副本被彻底消除，不可能再漂移；
2. 输出新增自检段：把未解析项按「首段是否存在于 node_modules」分成「本项目别名漏登记」与「第三方包」，前者单独报警；
3. 顺手修掉硬编码的本机绝对路径 `ROOT`，改为按脚本位置推算（该工具已定为常备体检工具，不应绑死单机）。

**风险实际发生情况**：🟢 低（Dexie 封装迁移不涉逻辑）—— 但**风险不在迁移本身，而在验证链路**（别名漏处 + 工具失明）。原方案的风险评估把注意力放在了「迁多少文件」，低估了「判据本身是否可靠」。

---

### Phase 2 —— 下沉业务工具 → 断环 #4 #5 + #3 直接形态 ✅ 已完成（2026-09-17）

| 动作 | 从 | 到 | 消费方（实测） | 状态 |
|------|----|----|--------------|------|
| 2.1 | `features/fileManager/fileManagerUtils.ts` | `core/files/fileTree.ts` | **19 文件**（stores 4 / services 2 / features 3 / aurora 10） | ✅ |
| 2.2 | `features/fileManager/recentFilesManager.ts` | `core/files/recentFiles.ts` | 5 文件（stores 1 / features/toolbar 2 / aurora 2） | ✅ |
| 2.3 | `features/fileManager/defaultDocs{Zh,En}.ts` | `core/data/defaultDocs/{zh,en}.ts` | 6 处 / 3 文件 | ✅ |
| 2.4 | `features/tags/tagExtractor.ts` | `core/tags/tagExtractor.ts` | 1 文件（`stores/TagIndexStore`）；`features/tags/` 随之空目录删除 | ✅ |
| 2.5 | `features/shared/utils/plantumlConstants.ts` | `core/constants/plantuml.ts` | 2 文件（`stores/SettingsStore` + 同族 `plantumlEncoder`） | ✅ |
| 2.6 | 收紧守卫 | `no-store-to-feature` / `no-service-to-feature` 由 warn 升 **error** | — | ✅ |

**实测验收**

| 判据 | 结果 |
|------|------|
| **`stores` / `services` 对 `features` 依赖** | **= 0** ✅ `stores` 出边仅 core(7)/types(5)/services(4)/locales(1)/hooks(1)；`services` 出边仅 types(2)/core(2)/utils(1) |
| 环 `#4` `stores > services > features/fileManager > features/templates > stores` | **消失** ✅ |
| 环 `#5` `stores > services > features/fileManager > stores` | **消失** ✅ |
| 环 `#3` `stores > features/shared > stores` | **直接形态消失** ✅／**间接形态浮现** ⚠️ 见 2.z |
| 环总数 | 7 → **5**（消 3 条目标环，同时暴露 1 条未被预见的间接环） |
| `tsc` | 0 错误 ✅ |
| `vitest` | **113 文件 / 1505 passed · 2 skipped · 0 failed** ✅ 与 Phase 1 基线**逐项一致** ⇒ 迁移零回归 |
| 守卫 | **672 文件实扫**（作用域内 497）/ **0 违规**；探针验证「真阻断」 |
| `core` 出度 | 仍为 **0**（纯叶子层假设持续成立）✅ |

#### ⚠️ 2.1 的关键约束：原担心「需先切分」实际不成立

方案要求「`fileManagerUtils` 若同时含 fileManager 专属逻辑，需**先切分**，不得整体照搬」。**实测该文件 300 行通篇为纯函数**（树遍历 / 生成 id / `findNode` / `collectAllFiles`…）+ 一段 localStorage 读写（`loadState` / `saveState` / `migrateAddLinkGuide`），**零 JSX、零 store / hook 引用** ⇒ 无专属逻辑需要剥离，可整体搬迁。
（说明 Phase 0 之前的若干轮重构已把它清理干净，此处无需再切一次。原方案的谨慎是合理的，只是前提没有成立。）

#### ⚠️ 2.x 结构校正：`core/*` 不保留占位 `index.ts`

Phase 0 为「目录职责自证」在 `core/{files,tags,constants,data}/index.ts` 各建了 `export {}` 占位。**Phase 2 落地后全部删除**（连 Phase 1 已删的 `core/storage/index.ts` 共 5 个），理由两条：

1. 这些文件**零消费者**（实测无任何 `'@core/files'` 形态导入）—— 按本项目判据「判死先验有真实承载者」，空模块没有承载者；
2. 更关键：若把它们改成 barrel（`export * from './fileTree'`），**任何只想用 `recentFiles` 的消费者都会被连带挂进 `fileTree`，而 `fileTree` 静态 import 了 4859 行种子文档**（`zh.ts` 2103 行 + `en.ts` 2756 行，源码共约 146 KB）—— dev 无 tree-shaking，这笔代价会转嫁给每一个消费者。

> **判据（新增）**：只要子图内含「大体积静态数据」，该目录就**禁止提供 barrel**，消费者一律精确到文件（`@core/files/fileTree`）。
> 这与 `plantumlConstants` 当初「单独成文件以免连带 pako」是同一原理。本次迁移恰好**强化**了那个设计意图：`plantuml.ts` 迁入 `core/constants` 后，与 `shared/utils`（含 `plantumlEncoder` → pako）目录彻底脱钩，隔离比原先更彻底。

#### 🚨 2.y 过程中挖出的真问题：BOM 会被「加注释头」挤到行中间

按 Phase 1 惯例给 6 个迁移文件加「来源注释头」时，`src/core/data/defaultDocs/zh.ts` **原文件带 UTF-8 BOM**（`EF BB BF`）。BOM 本是文件首字节，插入注释头后它被挤到 **byte-offset 483**（注释头之后、`export` 之前）—— 从「文件头 BOM」退化成「行中零宽字符」。

> 语法上无害（U+FEFF 在 JS/TS 中按空白处理，`tsc` / 测试全绿），但它**破坏了「保真搬迁」**：BOM 是**文件级**元数据，不属于行结构，任何「插头 / 截断 / 拼接」操作都必须显式搬运它。
> 处置：用 `Buffer` 级操作定点搬回 offset 0（字节数守恒 65208 → 65208，实测 BOM offsets = `[0]`）。
>
> **判据（新增）**：改任何文件头之前先探 BOM（`b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF`），并把「BOM 位置」列入搬迁前后的一致性核对项。
> 本次 6 个文件仅 `zh.ts` 命中 —— 属**低频但静默**的坑：它不会让任何检查变红，只会悄悄改变文件形态。

#### 📐 2.z 对后续阶段的实质澄清：环 #3 的根因边是 `features/shared → stores`

`_depgraph` 出边实测：`features/shared` 有一条 **`→ stores : 2`** 的**反向边**（而 `stores → features/shared` 已归零）。
即环 #3 在 `#4` / `#5` 消失后仍以间接形态存活，**唯一成因就是这条反向边**；`stores > hooks (1)` 与 `hooks > features/shared (2)` 都只是通路。

> 因此 **Phase 4 的靶心应精确表述为：消除 `features/shared → stores`（2 处）**。
> 原方案写「`features/shared` 不再被 `stores`/`services` 依赖」方向没错，但**说反了主次** —— 要断的是 shared 对 stores 的引用，而不是 stores 对 shared 的引用（后者已为 0，无需再动）。

#### 📉 2.w 估算偏差（与 Phase 1 同向：实际改动面 > 方案预估）

| 项 | 方案预估 | 实测 |
|---|---|---|
| import 改动 | 「约 15 处」 | **33 处 specifier / 25 文件**（含迁移文件自身 2 处内部路径） |
| 守卫违规存量 | 「9 处 + 4 处」= 13 | 与 Phase 1 实测一致 ✅（本次归零） |
| 环消除 | 「#3 #4 #5 消失」 | #4 #5 全消 ✅；#3 仅直接形态消失，间接形态留给 Phase 4 |

漏算主因：**aurora 侧 10 处**与**注释提及 3 处**（`export/backupService` / `pwa/librarySync` / `welcome/WelcomePanel`，随迁改注释措辞）未计入预估。

**风险实际发生情况**：🟡 中 → 实际 🟢 低（纯搬迁、零逻辑改写、零回归）。真正的成本依旧不在「迁移」而**在验证链路**：本阶段为此额外补了一条 Phase 1 没跑的链路 —— **生产构建**（`vite build`），因为 `@core/*` 深路径解析在不同打包链路上未必同构。

---

### Phase 3 —— Aurora 外壳解环 → 断环 #7 #8 ✅ 已完成（2026-09-18）

> **里程碑 M3 达成**：Aurora 内部两类环 `aurora/app > aurora/panels > aurora/app`、
> `aurora/app > aurora/panels > aurora/components > aurora/app` 全部消失（**模块级环 5 → 3**）。
> `aurora/app` 由此成为**纯装配层**（只剩 AuroraShell / auroraActions / commandAdapter / AudienceOnboarding / useAuroraShell）。

**实际动作（较原计划 +2 项，见 §3.x / §3.y）**

| # | 动作 | 实测细节 |
|---|------|---------|
| 3.1 | `aurora/app/navReturn.ts` → **`aurora/navigation/navReturn.ts`** | 29 行 · 零依赖模块级单例；字节级保真搬迁（`Buffer.compare` identical / 957B）。新建目录 `aurora/navigation/` |
| 3.2 | 更新引用 | **6 处 / 5 文件**：源码 3（`EditorPanel.tsx`×2、`GraphPanel.tsx`、`KbPanel.tsx`）+ 测试 2（`EditorPanel.smoke`、`GraphPanel.smoke`）；另 `kb/graphSession.ts:12` 注释里的路径提及同步更新 |
| 3.3 | `aurora/app/UserAccountNav.ts` → **`aurora/components/shell/`** | 方案原文「`aurora/components → aurora/app` 的 1 处」经枚举确认**就是它**。40 行 ctx + 消费 hook；Provider 在 `AuroraShell`（app）、消费方在 `Sidebar`（components/shell）→ 定义寄居 app 即环 #8 的第三条边。落点有既有先例：`CommandPaletteContext` 同样被 app + panels 共同向下引用 |
| 3.4 | **`aurora/app/RealProviders.tsx` → `aurora/providers/`** ← 方案未预见 | 被 `AuroraShell`（真实运行）+ **12 个 `.smoke.test.tsx`（夹具）**共用。见 §3.x |
| 3.5 | **删 `aurora/app/ToastProvider.tsx`（re-export 兼容壳）** | 7 行纯转发 `export { ToastProvider, useToast } from '../../components/ui/ToastProvider'`，唯一消费者是 `AuroraShell`（同目录）。删壳后 `AuroraShell` 直引 `../../components/ui/ToastProvider`。依据同 Phase 2 判据：**双导入源比一次改净更危险** |
| 3.6 | 新增守卫 **`no-reverse-to-aurora-app`（落地即 error）** | 作用域 `src/aurora/**`（**含测试文件，无例外**）；自身豁免写在规则内 `exempt`。见 §3.y |

**验收实测**

| 验收项 | 目标 | 实测 | 判据 |
|--------|------|------|------|
| 模块级环 | 消 #7 #8 | ✅ **5 → 3** | `scripts/_depgraph.cjs` 环清单 |
| `aurora/panels → aurora/app` | 0 | ✅ **0** | aurora 跨子模块边枚举（源码 + 测试**全 0**） |
| `aurora/components → aurora/app` | 0 | ✅ **0** | 同上 |
| `tsc --noEmit` | 0 错 | ✅ **0** | — |
| 全量测试 | 不减 | ✅ **113 文件 / 1505 passed · 2 skipped · 0 failed** | 与 Phase 2 基线**逐项一致** ⇒ 零回归 |
| 守卫（静态） | 0 违规 | ✅ **671 文件实扫 / 0 违规**（其中 aurora 109 文件，含 36 个测试文件） | `-f json` 统计，非空输出 |
| 守卫（真阻断） | 注入即拦 | ✅ **7/7 探针** | 注入 → `exit=1` 精确报规则 → 字节级还原 → 复跑 `exit=0` |
| 生产构建 | 通过 | ✅ 3525 modules | `vite build` |
| **真机链路** | 编辑器 ↔ 知识库返回 | ✅ **14/14** | CDP 探针，**全部动作走真实鼠标点击**（见 §3.z） |

**双侧边枚举（本阶段的靶心定位法）**

本阶段没有直接照着方案原文动手，而是先枚举 aurora 四个子模块之间的**全部文件级边**：

```
app -> panels      11 处   ← 装配层正当职责，保留
app -> components   4 处   ← 同上，保留
app -> types        1 处
panels -> app      17 处   ← 其中 navReturn 3 处（源码）+ RealProviders 12 处（测试）+ navReturn 2 处（测试）
components -> app   2 处   ← UserAccountNav 1 处（源码）+ RealProviders 1 处（测试）
```

这一步是必要的：`_depgraph` 的模块级环**只计源码文件**（`_depgraph.cjs:72` 排除 `.test`），
而 `panels → app` 的 17 处里 **14 处来自测试**。若不先枚举，会得出两种相反的错误结论 ——
要么以为「搬走 navReturn 就够」，要么以为「测试边也要清但不知道有几条」。

#### §3.w 靶心校正：方案原文「禁止互相 import」不成立 —— 只拦单向

方案 3.4 原文写「`aurora/app` 与 `aurora/panels` 禁止**互相** import」。实测该措辞会**误伤正常架构**：

- `aurora/app → aurora/panels` **11 处**是装配层的**正当职责**（`AuroraShell` 的职责就是组装并渲染所有面板）；
  若一并禁止，等于让 shell 无法渲染界面。
- 只有 `panels/components → app` 方向才成环。

故守卫实现为**单向**：`aurora/app` 是 aurora 内的**最高位**，任何子模块不得反向引用它（入口 `aurora-main.tsx` 与 app 自身豁免）。
**判据**：单向守卫下全量 0 违规且 7/7 探针通过；若按原文双向实现，仅 `app → panels` 就会产生 11 处误报。

#### §3.x `RealProviders` 必须搬：否则守卫只能留「测试例外」这个后门

`RealProviders` 是「精确复刻 `src/App.tsx` Provider 嵌套链」的地基组件，被两类消费者共用：
**真实运行**（`AuroraShell`）+ **12 个测试文件**（作为 `render` 的 wrapper 夹具）。

它留在 `aurora/app/` 的代价是结构性的：**守卫若想真正封死 `panels → app`，就必须为 `.test.tsx` 开一个例外** ——
而「测试夹具长期寄居装配层」恰恰会持续激励错误依赖（新测试照抄旧路径）。
搬到 `aurora/providers/`（一个被 app 与测试**共同向下引用**的地基目录）后：

- `panels → app`、`components → app` 的边**含测试边一并归零**；
- 守卫得以**零例外**（`src/aurora/**` 全量），测试文件被真实覆盖 —— 探针 5 已验证这一点；
- `RealProviders` 相对 `stores/`、`components/ui` 的深度与旧位置相同（均为二级），**内部 import 一行未改**。

**一般化判据：当某个模块的存在会迫使守卫开门时，正确的处理是移动模块，而不是给守卫留例外。**

#### §3.y 守卫工厂新增 `exempt` 能力：避免「新增目录即盲区」复发

守卫工厂 `_forbidden-import.cjs` 原本只支持「禁止目标」判定。本阶段给它加了 `exempt`（整体豁免清单），
带动一处小重构：把路径包含判定抽成 `inPath()`，让 **forbidden 与 exempt 两侧共用同一套语义**
（两侧不一致会出现「豁免判不中、禁止判得中」的不对称误报）。

为什么需要它：`no-reverse-to-aurora-app` 要排除「app 目录自身」与「入口文件」。
若改用 `overrides.files` 列举子目录来排除，**每新增一个 aurora 子模块就再现一次同样的盲区**
（这正是本仓已反复踩过的坑：「扫描盲区的真因是前缀/枚举，不是目录」）。
最终形态 = **作用域用全量 glob `src/aurora/**` + 豁免写在规则内**，新增目录自动被覆盖。
**探针 3（在新建的 `aurora/navigation/` 内注入反向引用 → 正确报错）就是这条设计的验收。**

#### §3.z 真机 CDP 验证：14/14 通过（含一条防假绿自检）

方案对该阶段明确要求「迁移后须跑一次真机 CDP 验证编辑器↔知识库返回链路」—— 因为
`navReturn` 是**模块级单例导航上下文**，jsdom 覆盖不到「真实 `nav()` 路由跳转」这一层。
探针：`.workbuddy/artifacts/cdp-verify-navreturn-phase3.mjs`（冷 profile，IndexedDB 为空）。

**与 jsdom 的分工（先说清哪条是谁验的）**

| 层 | 覆盖者 | 已验证内容 |
|----|--------|-----------|
| 图谱侧登记 | jsdom | `GraphPanel.smoke:196` 断言单击 file 节点后 `getEditorReturn()` = `{view:'graph', label:'双链图谱'}` |
| 图谱分支芯片 + 回跳 | jsdom | `EditorPanel.smoke:184` 断言 `.aurora-editor__return` 文案 + 点击后回跳 graph 且来源被清除 |
| **kbId 分支端到端** | **CDP（本探针）** | 建库 → 详情 → 跳编辑器 → 芯片 → **真实鼠标点芯片** → 回详情；`nav('kb', kbId)` 参数映射是否真把 kbId 带回 |
| 真实路由切换 | **CDP** | hash 实测 `#view=kb` → `#view=editor` → `#view=kb` |

**关键设计：先跑「自检段」，否则下游断言全是假绿**

`getEditorReturn()` 是**模块级单例**，若它永远返回旧值，芯片就会常在 ——
那么「芯片存在」这条断言无论链路通不通都成立。故探针第一步先导航到**编辑器且不经过任何来源登记**，断言：

- ✅ 自检#0a 编辑器真实挂载（`.aurora-editor*` 节点数 = 2）→ **证明扫描面非空**；
- ✅ 自检#0b **无来源登记时芯片必须为 `null`** → 证明芯片确由 `returnCtx` **条件渲染**。

**14/14 断言全通过，且全部动作 `via=real`（真实鼠标点击，无一退化到合成 `click()` 兜底）**

| # | 断言 | 实测证据 |
|---|------|---------|
| 0a/0b | 自检（扫描面 + 条件渲染） | 节点数=2；芯片 `null` |
| 1–3b | 落到管理页 → **真实走完建库流程** → 库卡片 → 详情页 | 受控 input 用**原生 setter + `input` 事件**写入（坑 F）；详情库名与卡片一致 |
| 4 | 点「新建笔记」→ 编辑器出现返回芯片 | hash `#view=kb` → `#view=editor` **真实路由切换** |
| 5 | 芯片文案精确 = `← 返回 P3返回库-71382` | 与库名逐字一致 |
| 6 | **真实鼠标点芯片 → 回详情页** | `subbar=true` 且 `manage=false`（非退化为管理页） |
| 7 | 回跳**带回了 kbId**（同一库，非首项兜底） | 详情库名 === 建库名 |
| 8 | 回跳后芯片消失（`clearEditorReturn` 生效） | 芯片 `null` |
| 9–11 | 链路 B（点库内笔记条目）同构复验 | 同上，全绿 |

> ⚠️ 断言 7 的价值超出本阶段：它同时验证了 `useAuroraShell.nav` 的 **param → params 映射表**没漏登记 `kbId`
> （本项目已知坑：映射表漏登记会导致参数**静默丢失**，回跳会退化成管理页）。若只看「是否有芯片」，这条漏网。

**风险实际发生情况**：🟡 中 → 实际 🟢 低。额外成本集中在**验证**而非迁移：本阶段新增了「真机 CDP」这条链路，
并首次为守卫引入「零例外」设计（其代价是必须先完成 §3.x 的模块移动）。

#### §3.v 过程中的偏差与一次真实失误

1. **一次路径深度算错（被 tsc 拦住）**：删 ToastProvider 壳后把 `AuroraShell` 的引用写成
   `'../components/ui/ToastProvider'`（只上溯一级 → 解析到不存在的 `aurora/components/ui/`）。
   正确为 `'../../components/ui/ToastProvider'`（`aurora/app/` 是二级目录，出到 `src/` 需两级）。
   **tsc 立即报 `TS2307 Cannot find module`** —— 这正是「迁移后必须跑 tsc」的价值；教训：**同层相对引用要数深度**。
2. **一条 vitest 结果是无效的**：修正上述路径前后各启动过一轮 vitest，第一轮启动时刻早于修正，
   其绿灯不可采信 → 已重跑并以重跑结果为准。**教训：验证必须在改动定稿后启动，否则绿灯是"时间窗侥幸"。**
3. **shell 缺 `grep`**：`vitest run | grep ...` 报 `grep: command not found`（该 shell 无 coreutils），
   导致一轮 vitest 实际未产出结果。**改用无管道后台运行 + 工具侧过滤。**
4. **`_depgraph.cjs:53` 的子模块白名单是空操作**：`if (['panels','app',...].includes(s)) return 'aurora/'+s;`
   与下一行 fallback `return 'aurora/' + (s || '_')` 语义完全相同 —— 白名单冗余但**无害**
   （新目录 `aurora/navigation` / `aurora/providers` 已确认被正确登记为独立模块，未出现 Phase 1 的 `@core` 失明）。
   留待 Phase 6 清理时一并简化。

---

### Phase 4 —— `features/shared` 解散：按「消费者层级」四分归位 → 消环 #3 残余 ✅ 已完成（2026-09-18）

> **靶心校准确认**：方案 Phase 2 时定位的根因边 `features/shared → stores`（2 处）本轮实测**正是**
> `ui/FrontMatterPanel.tsx` 与 `ui/OptimizeImagesModal.tsx` 各自 `import @stores/LanguageStore`。
> 另实测出**第二个可用断点**：`hooks → features/shared`（2 处 —— `useMarkdownRenderer`→`headingIdUtils`、
> `useMathRender`→`mathRenderer`）。环上三条边任一消除即可断环，本轮两条反向边**都已消除**。

#### §4.A 归类判据 —— 本步真正的决策（方案表只给到「utils / ui / storage 三批」的粗粒度）

| 判据 | 归属 | 命中 |
|------|------|------|
| 零依赖纯工具，且**迁出前**被 ≥2 个顶层模块消费 | `src/utils/`（L0） | 5 |
| 零依赖纯类型（跨层共享） | `src/utils/`（L0） | 1 |
| 仅 1 个模块消费 → 就近；或含**框架扩展**语义 | 消费方 feature | 4 |
| 通用 UI（无业务语义、无 store 依赖） | `src/components/ui/`（L2） | 2 |
| 业务 UI（读 store / 含业务语义） | 消费方 feature | 2 |
| 跨模块持久化基建 | `src/core/storage/`（L1） | 2 |
| 测试 | 随被测文件 | 1 |

> 🚨 **方案字面目标被实测否决 1 项 —— `plantumlEncoder` 不能落 `src/utils/`。**
> 它依赖 **L1 的 `@core/constants/plantuml`**，而 §2.1 层级图明确 L0「只允许 `utils → types`」；
> 落 `src/utils/` 就等于新增一条 `utils → core` 越权边，且会与刚建好的底座守卫直接冲突。
> 故改用「单消费者就近」：它唯一消费者是 `features/editor/extensions/PlantUmlBlockView`。
> 同一判据下 `mermaidCache`（静态依赖 mermaid 重库）与 `ShortcutManager`（5 个消费者全在 toolbar）一并就近安置。
> ——这条修正说明：**「按文件字面语义归类」会与「层级纪律」冲突，后者优先。**

#### §4.B 搬运明细（18 文件；实测 7 个字节级一致 / 11 个仅两类改动）

| # | 从 | 到 | 消费方（实测） |
|---|----|----|--------------|
| 4a-1 | `shared/utils/emojiData.ts` | `src/utils/emojiData.ts` | editor/cm6 + toolbar |
| 4a-2 | `shared/utils/frontMatter.ts` | `src/utils/frontMatter.ts` | blog×5 + editor |
| 4a-3 | `shared/utils/headingIdUtils.ts` | `src/utils/headingIdUtils.ts` | aurora + editor×3 + export + outline×4 + hooks |
| 4a-4 | `shared/utils/imageHelpers.ts` | `src/utils/imageHelpers.ts` | editor×2 + OptimizeImagesModal |
| 4a-5 | `shared/utils/mathRenderer.ts` | `src/utils/mathRenderer.ts` | canvas-v2 + hooks |
| 4a-6 | `shared/utils/lintTypes.ts` | `src/utils/lintTypes.ts` | aurora×2 + editor×10 + lint |
| 4a-7 | `shared/utils/HighlightMark.ts` | `features/editor/extensions/` | editor/hooks + toolbar（TipTap 扩展，与 4 个兄弟 `*Mark.ts` 同类） |
| 4a-8 | `shared/utils/mermaidCache.ts` | `features/editor/extensions/` | MermaidBlockView（同目录） |
| 4a-9 | `shared/utils/plantumlEncoder.ts` | `features/editor/extensions/` | PlantUmlBlockView（同目录）；**不可入 L0**（见 §4.A） |
| 4a-10 | `shared/utils/ShortcutManager.ts` | `src/features/toolbar/` | toolbar×5（Phase 5 随迁） |
| 4a-11 | `shared/__tests__/plantumlEncoder.test.ts` | `features/editor/extensions/__tests__/` | —（随被测文件） |
| 4b-1 | `shared/ui/ErrorBoundary.tsx` | `src/components/ui/` | editor（通用件） |
| 4b-2 | `shared/ui/ScrollButtons.tsx` | `src/components/ui/` | editor + preview（通用件，跨 feature） |
| 4b-3 | `shared/ui/EmojiPicker.tsx` | `features/toolbar/` | 两个 toolbar |
| 4b-4 | `shared/ui/FrontMatterPanel.tsx` | `src/features/editor/` | EditorSlots　🎯 **反向边 1** |
| 4b-5 | `shared/ui/OptimizeImagesModal.tsx` | `src/features/editor/` | EditorSlots　🎯 **反向边 2** |
| 4c-1 | `shared/storage/imageStore.ts` | `src/core/storage/` | 6 个模块 / 16 处（editor·blog·export·aurora） |
| 4c-2 | `shared/storage/imageStoreTypes.ts` | `src/core/storage/` | editor×6（与实现同置） |

**字节比对的准确结论（提交前复核订正）**：18 个搬迁文件里 **7 个 `Buffer.compare` 字节级一致**
（`emojiData` / `frontMatter` / `headingIdUtils` / `imageHelpers` / `mathRenderer` / `ErrorBoundary` / `ScrollButtons`）。
另 **11 个**因两类改动而不一致，已逐文件出全量差异核验 —— **差异仅此两类，零逻辑改动**：

| 改动类型 | 命中 | 说明 |
|---------|------|------|
| ① 搬迁溯源注释头 | 9 文件（3–6 行） | 只加在**「落点不自明」**的文件上：`lintTypes`（为何不入 `src/types`）、`imageStore`（为何升 L1）、`plantumlEncoder`（为何**不可**入 L0）、`HighlightMark`（名为 utils 实为 TipTap Mark）、`FrontMatterPanel`/`OptimizeImagesModal`（🎯 反向边成因）等。落点自明的通用件（如 `ErrorBoundary`→`components/ui`）不加，避免噪音 |
| ② import specifier 改写 | 11 文件 | `../utils/emojiData` → `@utils/emojiData`、`../storage/imageStore` → `@core/storage/imageStore`、`../plantumlEncoder` → 同目录相对（风格归一）—— 与 §4.C 同源 |

> ⚠️ **教训**：早期记录的「18 文件全部字节级一致」**不成立**。当时只对「纯工具类」抽样比对就外推到了全量。
> 正解是**逐文件 `git show HEAD:<旧> | git hash-object` 比对，并把不一致者逐个出 diff** —— 因为「文件被移动」与「文件被改动」是两件事，
> 只看 `Buffer.compare` 通过的那几个，会把「11 个有改动」掩成「全绿」。这与 §7「空输出 / 零违规必须先排除根本没扫到东西」是同一类误判。
**收尾**：`src/features/shared/` 四层子目录（`utils/` `ui/` `storage/` `__tests__/`）全部清空并删除目录本身。
`features/shared` 字符串全仓命中 = **16 行**（`src/` 13 + `scripts/` 3），**全部是 `//` 注释**，
**零 import / 零路径解析残留**（12 行 Phase 4 溯源头 + `plantuml.ts` 与两条守卫文件的「历史来源」说明，均正确保留）。

#### §4.C 引用改写：81 处 specifier（方案估 ~52），最终引用面 72 import 点 / 55 文件

改写**不是字符串替换**，而是「解析成绝对路径 → 按表映射 → 按新位置生成 specifier」，覆盖 6 种形态：

| 形态 | 例 |
|------|-----|
| 别名 | `@features/shared/utils/lintTypes` |
| 跨层相对 | `../features/shared/utils/headingIdUtils` |
| 同 feature 相对 | `../../shared/utils/frontMatter` |
| 同父目录相对 | `../shared/ui/ErrorBoundary` |
| 同目录相对（shared 内部互引） | `./imageStoreTypes` |
| 工具调用 | `await import('../shared/storage/imageStore')` |

#### §4.D 过程中挖出 3 个真实缺陷（方案均未预见）

**① 🚨 别名形态被静默跳过（5 处漏改）**
自建搬迁引擎对**相对路径**做了扩展名候选解析（`../x` → 试 `../x.ts`），但对**别名形态**只把剩余段
直接拼成路径 → 得到不带扩展名的绝对路径 → 查表失败 → **静默跳过**。
症状：4a 首轮改写 43 处后，「残留自检」仍报 `@features/shared/utils/lintTypes` 等 5 处。
修法有两步，缺一不可：① 别名形态同样做扩展名候选；② **查表端也要枚举扩展名** ——
因为源文件此时已被搬走，磁盘上不存在，靠 `existsSync` 补扩展名必然落空。

> 这与 Phase 2 的「必须同时搜 `./X` 同层相对形态」是同一类坑的镜像：
> **凡靠字符串/形态匹配定位的扫描，都会在某一种形态上静默失明**；判别式应当是「解析成路径再比对」。

**② 🚨 文件自身搬走后，它的内部相对引用会「改换基准」**
`shared/ui/OptimizeImagesModal.tsx` 内部写着 `import ... from '../storage/imageStore'`。
4a 轮次处理它时，该 specifier 解析到 `shared/storage/imageStore.ts`（不在 4a 范围内）→ **正确地跳过**；
但 4b 把它搬到 `features/editor/` 后，同一个 `'../storage/imageStore'` 变成按 `features/` 求值
→ **指向不存在的目录**。由 `tsc` 精确捕获（`TS2307`，全仓仅此 1 处）。
修法：对**自身也搬迁过**的文件，用**旧位置**重解析悬空 specifier。

> 教训：搬文件不是「改引用」一件事，还有**「被搬文件自己的引用基准」**这一项。

**③ 查表键不匹配 → 风格退化（同目录却写别名），且不会触发任何检查**
引擎用 `NEW_OF.get(file)` 取 importer 新位置，但 `file` 来自相对遍历（`src/features/...`）
而查表键是绝对路径 → 取不到 → 退化成别名形态。结果 2 处：
`core/storage/imageStore.ts` 里把同目录的 `./imageStoreTypes` 写成 `@core/storage/imageStoreTypes`；
搬迁后的测试文件把 `../plantumlEncoder` 写成 `@features/editor/extensions/plantumlEncoder`。
**功能正确、tsc/vitest 全绿，但违反本仓「同目录用相对路径」的约定** —— 属只有"看"才能发现的缺陷。已做风格归一。

#### §4.E 新增守卫 `no-base-to-upper`（落地即 error）

方案 Phase 4 **未要求**新增守卫，但本步成果必须锁死 —— 否则 `features/shared` 必然换个名字复活。
落点选在「底座层」：

- **作用域**：`src/utils/**` + `src/core/**`
- **禁止项**：8 个上层目录（components / hooks / locales / stores / services / features / aurora / app）
- **落地时存量违规 = 0**（实测 `src/utils` 与 `src/core` 的向上依赖均为 0）→ 直接 error，无 warn 过渡期

它锁住的正是 `features/shared` 的成因：**自称「共享层」却引用 `@stores/LanguageStore`**。
若底座确需上层能力，正确解法是**反向安置**而非加例外：状态相关逻辑留 `stores`/`features`、
常量下沉 `@core/constants`（Phase 2 的 plantuml 已是先例）、UI 相关文件落 `components/ui` 或消费方 feature。

**未纳入**两处（均实测为 0，但各有技术障碍，留待单独决策）：

| 层 | 障碍 |
|----|------|
| `src/components/ui/**` | 其禁止项若含 `src/components`，会**误伤 ui 内部相对互引**（`./Input` 解析到 `src/components/ui/Input`，被判为落在 `src/components` 下）→ 需独立规则，不能与 utils/core 共用一条 |
| `src/types/**` | `src/types/translations.ts` 存在**预存的 `types → locales` 边（L0 → L2）**，属独立历史遗留，需单独决策 |

**附带卫生修正**：Phase 3 新建的 `no-reverse-to-aurora-app.cjs` 曾以 LF 落盘，与同目录其余 5 个文件
的 CRLF 不一致 → 已归一（纯 EOL 变更，无内容改动）。

#### §4.F 验证（八条链路）

| # | 链路 | 结果 |
|---|------|------|
| ① | `tsc --noEmit -p tsconfig.json` | **0 错** |
| ② | vitest 全量 | **113 文件 / 1505 passed · 2 skipped · 0 failed**（与 P2/P3 基线逐项一致 ⇒ 零回归） |
| ③ | 守卫真阻断 | 671 文件实扫 **0 违规**；**10/10 注入探针** —— 别名 + 相对双形态 × utils/core 两层；3 个负向探针不误报（同目录互引 / 向下 `core→utils` / 作用域外 aurora）；Phase 3 守卫回归仍生效；探针后复跑 `exit=0` 无污染 |
| ④ | 架构体检 | **模块级环 5 → 2**；`features/shared` 从出边表消失；`utils` 出边为空（纯叶子层） |
| ⑤ | 生产构建 | `vite build` 成功（走 `vite.config.ts` 别名，与 ② 是不同解析链路） |
| ⑥ | 真机 CDP | **本步不适用**（判据见 §7：仅当迁移物是导航/手势/焦点上下文、或行为依赖真实 `nav()` 跳转时才必须）—— 本步迁移物为纯函数 / 工具 / UI 组件，jsdom 覆盖充分 |
| ⑦ | 文件集合差 | `git` 集合差核对：**18 删 = 18 增，1:1 全对**（**不用 diff 行数判删除** —— 大段删除会让 `git diff -U0` 把未删除的相邻行报成 `-`） |
| ⑧ | 残留扫描 | `features/shared` 命中 16 行 —— **全部是 `//` 注释**（溯源头 + 历史来源），零 import 残留；另加**字节级搬迁比对**：7 字节一致 / 11 两类改动（见 §4.B） |

#### §4.G 残留（Phase 5 已清）

| 项 | 现状 | 归属 |
|----|------|------|
| 环 `features/editor > features/toolbar > features/editor` | **已消** ✅（27 文件并入 `features/editor/toolbar/`，实测字节级 0 差异） | Phase 5.1 ✅ |
| 环 `stores > hooks > stores` | **已消** ✅（`ThemeStore` re-export 壳删除，消费者直连真源） | Phase 5.2 ✅ |
| `hooks → features/themes` 1 处 | **已消** ✅（`useTheme` 移入 `features/themes/`，hooks 目录零向上依赖） | Phase 5.3 ✅ |
| `src/types/translations.ts → @locales/zh` 1 处 | **L0 → L2 向上边**（本轮守卫未纳入 types 的原因） | 待决（建议随 Phase 6 处理） |

---

### Phase 5 —— 编辑器工具栏归属 + hooks/stores 方向收敛 → 断环 #6 #1 ✅ 已完成（2026-09-18）

**5.1 `features/editor ↔ features/toolbar`**（已决策：选 A，并入 `features/editor/toolbar/`）

| 方案 | 内容 | 优势 | 代价 |
|------|------|------|------|
| **5.1-A（推荐）** | `features/toolbar/*` 并入 `features/editor/toolbar/` | 同域内依赖天然合法；符合"工具栏是编辑器专属 UI"语义；消除跨 feature 环 | 改动 25 文件路径 + 约 5 处 import |
| 5.1-B | 整体迁 `components/ui/editor-kit/`（或 `aurora/components/editor-kit/`） | 迎合"UI 落 aurora/基元库"铁律 | 工具栏与编辑器强耦合，跨层依赖会变成 `editor → components/ui/editor-kit`，语义变差 |

> **已选 A（2026-09-17 拍板）**：`toolbar` 与 `editor` 的耦合是**领域内聚**，不是层次污染；并入同域比"按 UI/逻辑强行切开"更健康。

**5.2 `hooks ↔ stores`**
- 反转 `stores → hooks` 的 1 处（`stores` 不应调用 React hook；若为 hook 化逻辑，应改为纯函数放 `core`）。
- 保留 `hooks → stores`（hook 读状态，方向正确）。
- ⚠️ 实测该 `stores → hooks` 边（1 处）**同时是环 #3 间接形态的通路之一**（`stores → hooks → features/shared → stores`），故本步是 Phase 4 之外的**第二个断点**（详见 Phase 4 交集注）。
- ✅ **Phase 4 完成后**：`stores → hooks → features/shared → stores` 已随 `features/shared` 解散而消失（5 → 2 环），
  故本步现在**只需**处理 `stores > hooks > stores` 这一条环，不再承担 Phase 4 的替代断点职责。
- 🔍 **Phase 4 新发现（建议本步一并审视）**：`hooks → features/themes` 1 处。它不是环，但方向可疑 ——
  `hooks` 是被 `stores` 与多个 `features` 共用的下层，若继续向上引用 feature，会为「`stores → hooks → features`」
  埋下通路。处理选项：把 `features/themes` 的该能力下沉 `@core`，或把该 hook 移入 `features/themes`。

**验收**：环 #1 #6 消失；**8 环全部清零**（`_depgraph.cjs` 复核 `MODULE-LEVEL CYCLES = (none)`）✅。
**风险**：🟡 中。Phase 5 完成后应做**一次完整真机回归**（四视图 + 编辑器工具栏交互）。✅ 已做（见下）。

#### §5.A 实测回填（2026-09-18）

| 项 | 计划 | 实测 |
|----|------|------|
| 5.1 搬迁 | 25 文件 + ~5 处 import | **27 文件**整体搬迁（`features/toolbar/` → `features/editor/toolbar/`，`renameSync` + `Buffer.compare` 字节级 0 差异）；消费者 import 4 处（EditorSlots ×2 / MermaidBlockView / ShortcutsSection）+ 路径字面量·注释 7 处（`motionExit.test.ts` CONSUMERS 锚点 ×4 为 `readFileSync` 实读必同步项） |
| 5.2 反转 | 删 `stores → hooks` 1 处 | `ThemeStore.tsx` 为纯 re-export 壳（12 行零独立逻辑）→ **删除**；8 个消费者改直连 `@features/themes/useTheme`（preview/Preview、editor/{CodeMirrorEditor, EditorLayout, cm6/useCM6State, extensions/MermaidBlockView}、aurora/panels/{EditorPanel, CanvasPanel}、blog/BlogStudio） |
| 5.3 审视 | `hooks → features/themes` 1 处 | `hooks/useTheme.ts` **移入** `features/themes/useTheme.ts`（5.2/5.3 合并处理），`features/themes/index.ts` barrel 补 export；hooks 目录零向上依赖 |
| 验证链路 | 七条全跑 | ① tsc 0 错 ② vitest **1493 passed / 2 skipped / 0 failed**（与并发会话删引导后基线一致，零回归）③ 守卫 668 文件 / 0 诊断 ④ `_depgraph.cjs` **`MODULE-LEVEL CYCLES = (none)`** ⑤ `vite build` 成功（`--outDir dist-p5-verify` 规避沙箱 emptyDir）⑥ ⑦ 见下 |
| **⑥ 真机 CDP 回归** | 四视图 + 工具栏交互 | **全部通过** ✅：kb / canvas / blog 三视图外壳渲染正常；editor 视图真实走「空态新建笔记 → 命名 → 创建」流程后 WYSIWYG 工具栏渲染（22 按钮，1344×38.7px，ProseMirror 挂载）；**标题下拉 ✅ / 高亮色板 ✅（点击后 absolute 浮层 1→2、色点 8 个）/ EmojiPicker ✅（320px portal）/ 加粗 ✅（`insertText` → 全选 → 点加粗 → `.ProseMirror strong` 真实生效）**；**主题切换（5.2 useTheme 回归）dark→light→dark 往返 ✅**（MenuBar「视图 → 切换深色/浅色主题」真实点击）；控制台仅 1 条已知预存 React 警告（canvas 切换 setState），零 Phase 5 相关错误 |
| ⑦ 文件集合差 | 删增 1:1 | 27 rename + `useTheme` rename + `ThemeStore` 删除，集合核对一致 |

> **CDP 探针三教训（复用探针时防状态污染）**：① 复用同一浏览器会话跑多轮探针，前一轮**未关闭的浮层**会被下一轮的 toggle 点击**关闭**（本轮高亮下拉假阴性即此因）——每轮交互前先外点复位；② editor 视图空态不渲染工具栏（`activeFileId` 为空），须先真实建文档（React 受控 input 用原生 setter + `input` 事件，坑 F）；③ 工具栏按钮 `title` 是**本地化文案**（「插入特殊符号」非 "Emoji"），选择器先查 locales。

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
| Phase 1 | **4**（实测）✅ | **8 处 / 7 文件**（实测）✅ | 0 | 🟢 低 |
| Phase 2 | **6**（实测）✅ | **33 处 / 25 文件**（实测）✅ | 0 | 🟢 低（实测） |
| Phase 3 | **4**（3 迁 + 1 删，实测）✅ | **21 处 / 17 文件**（实测）✅ | 1 | 🟢 低（实测） |
| Phase 4 | **18**（实测）✅ | **81 处**（实测；案例 55 文件，最终引用面 72 import 点）✅ | 1 | 🟢 低（实测） |
| Phase 5 | **28**（27 + useTheme，实测）✅ 另删 ThemeStore 壳 1 | **12 处**（4 + 8，实测）+ 路径字面量/注释 7 处 ✅ | 0 | 🟢 低（实测，估🟡未兑现） |
| Phase 6 | — | — | 面板注册表等 | 🟠 中高 |
| **合计（P0–P5 已完成部分）** | **60 文件迁移**（实测） | **155 处 import 更新**（实测） | **5 条守卫** | — |

### 4.2 对现有质量基线的预期影响

| 指标 | 基线 | 现状（Phase 4 完成后） |
|------|------|---------------------|
| 模块级循环 | 8 个 | **0 个** ✅（Phase 1 消 #2；Phase 2 消 #4 / #5 + #3 直接形态；Phase 3 消 #7 #8；Phase 4 消 #3 残余；**Phase 5 消 #6 #1 —— 8 环全清零，`_depgraph.cjs` 复核 `MODULE-LEVEL CYCLES = (none)`**） |
| `stores`/`services` → `features` 违规 | 9 + 4 处 | **0** ✅（Phase 2 达成，且守卫升 error 锁死） |
| **底座层向上依赖**（`src/utils` / `src/core`） | 未度量 | **0** ✅（Phase 4 实测，并新增 `no-base-to-upper` 守卫锁死） |
| `features/shared` 目录 | 19 文件 / 52 处引用 | **已解散** ✅（18 文件按消费者层级四分归位；目录删除） |
| 反向依赖（逻辑层→UI 层） | 0（已守） | 保持 **0** ✅ |
| 测试用例 | 1499 passed / 2 skipped / 0 failed | **1505 passed / 2 skipped / 0 failed** ✅（+6 契约测试；断言零放宽） |
| `tsc` | 干净 | 保持干净 ✅ |
| 生产构建 | — | `vite build` 成功（Phase 2 起纳入常规验收，P2/P3/P4 连续通过）✅ |
| 运行时行为 / 视觉 | — | **零变化** ✅（纯结构迁移）。Phase 3 真机链路验证（编辑器↔知识库返回 14/14）；**Phase 5 完整真机 CDP 回归通过**（四视图 + 工具栏三下拉/EmojiPicker/加粗 + 主题切换往返，§5.A） |

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
Phase 1  持久化下沉 → 断环 #2                                       ✅ 完成    【里程碑 M1 ✅：stores↔services 解环（8→7 环）】
   ↓
Phase 2  业务工具下沉 → 断环 #4 #5 + #3 直接形态                    ✅ 完成    【里程碑 M2 ✅：stores/services→features 依赖=0；7→5 环】
   ↓
Phase 3  Aurora 解环 → 断环 #7 #8                                  ✅ 完成    【里程碑 M3 ✅：外壳无环；5→3 环 + 真机 14/14】
   ↓
Phase 4  features/shared 解散：按消费者层级四分归位 → 消环 #3 残余      ✅ 完成    【3→2 环；底座向上依赖归零并加守卫】
   ↓
Phase 5  toolbar 归属 + hooks/stores 收敛 → 断环 #6 #1              ✅ 完成    【里程碑 M4 ✅：8 环全清零 + 完整真机回归（四视图 + 工具栏交互 + 主题切换）】
   ↓
Phase 6  结构性重构（editor 内部分层 / panels 契约层 / fileManager 瘦身）  ← 独立排期
```

**每个里程碑的放行条件**：`tsc` 干净 + `vitest` 全绿 + `_depgraph.cjs` 复核环已消除 + ESLint 守卫 0 违规 + （M3/M4）真机 CDP 零回归。

---

## 7. 附：验证与守卫清单

**验证工具**：`scripts/_depgraph.cjs`（模块耦合矩阵 / 环检测，常备架构体检工具）
**契约测试**：`src/aliasSync.test.ts`（6 例）看守「别名表 4 处同改」——不只比键集合，还比目标目录

**验证链路（七条必须全跑 —— 缺一条就可能放过只在特定链路暴露的失败）**

| # | 链路 | 命令 | 为什么不能省 |
|---|------|------|-------------|
| ① | 类型 | `tsc --noEmit -p tsconfig.json` | 基础 |
| ② | 单测 | `node node_modules/vitest/vitest.mjs run` | 走 `vitest.config.ts` 别名 —— **Phase 1 正是在此暴露 20 文件导入期崩溃** |
| ③ | 守卫 | `node node_modules/eslint/bin/eslint.js --no-eslintrc -c .eslintrc.guard.cjs "src/**/*.{ts,tsx}"` | 架构闸口；**须核「实扫文件数」非 0**，空输出要先证明不是「零文件被扫」 |
| ④ | 架构 | `node scripts/_depgraph.cjs` | 「环是否真消失」的唯一判据 |
| ⑤ | **生产构建** | `node node_modules/vite/bin/vite.js build` | 走 `vite.config.ts` 别名，**与 ② 是不同的解析链路** —— Phase 2 起纳入常规验收 |
| ⑥ | **真机 CDP** | 见 `.workbuddy/artifacts/cdp-verify-*.mjs`（须与 Edge 同一次前台 bash 启动） | **jsdom 覆盖不到的那一层**：真实浏览器 + 真实 IndexedDB + 真实 hash 路由。凡「迁移物是导航/手势/焦点上下文」或「行为依赖真实 `nav()` 跳转」时必须跑 —— Phase 3 起纳入「涉交互迁移」的常规验收 |
| ⑦ | **文件集合差** | `git ls-tree -r --name-only HEAD -- src` vs 工作区实际文件 | **判「删没删」只能用集合差，不能用 diff 行数** —— 大段删除会让 `git diff -U0` 把**未删除的相邻行**报成 `-`（实测曾把活着的关键帧报成已删）。Phase 4 起纳入常规验收 |

> ⚠️ **判据（Phase 1 血的教训）**：**休眠配置的绿灯不算证明。** 新增别名 / 守卫后必须有一次**真实引用**，才能证明它真的生效；
> 反之，空输出 / 零违规也必须先排除「根本没扫到东西」才能采信。
>
> **守卫真阻断验证法（Phase 2 定型，后续每加一条守卫都要做）**：向作用域内文件注入一行违规 import → 期望 `exit=1` 且**报出预期规则名** → 字节级还原 → 全量复跑 `exit=0`（证明探针无残留）。
> 只测「绿灯」是验不出守卫死活的。

> **Phase 1 已加固 `_depgraph.cjs`**（原因见 §Phase 1 的 ① ②）：
> ① 别名表改为**从 `vite.config.ts` 派生** —— 原硬编码副本未登记 `@core`，会对该别名的导入**静默丢边 → 漏报环**；
> ② 根路径改为按脚本位置推算（原硬编码本机绝对路径，换机即失效）；
> ③ 输出新增自检段，把「本项目别名漏登记」从 `@tiptap/*`、`@codemirror/*` 等 npm 包噪声中摘出来单独报警。
**守卫文件**：`.eslintrc.guard.cjs`（lint-staged 闸口）+ `scripts/eslint-local-rules/*.cjs`
+ 共用工厂 `scripts/eslint-local-rules/_forbidden-import.cjs`（判定逻辑单源）

**守卫规则现状**：

| # | 规则 | 禁止 | 落地状态 |
|---|------|------|---------|
| 1 | `local/no-store-to-feature` | `stores/**` → `features/**` | ✅ **Phase 2 已升 error**（基线 9 处归零；672 文件实扫 0 违规；注入探针实测阻断 exit=1） |
| 2 | `local/no-service-to-feature` | `services/**` → `features/**` | ✅ **Phase 2 已升 error**（基线 4 处归零；同上探针实测阻断） |
| 3 | `local/no-service-to-store` | `services/**` → `stores/**` | ✅ **Phase 1 已升 error**（存量 3 处清零；注入探针实测阻断 exit=1） |
| 4 | `local/no-reverse-to-aurora-app` | aurora 子模块 → `aurora/app/**`（**单向**；app 自身与入口豁免） | ✅ **Phase 3 新增，落地即 error**（作用域 `src/aurora/**` **含测试、零例外**；671 文件实扫 0 违规；**7/7 注入探针**含 2 个豁免反向验证） |
| 5 | `local/no-base-to-upper` | **底座层**（`utils/**`、`core/**`）→ 任意上层（components/hooks/locales/stores/services/features/aurora/app） | ✅ **Phase 4 新增，落地即 error**（实测存量违规 = 0；671 文件实扫 0 违规；**10/10 注入探针**含别名+相对双形态与 3 个负向不误报） |
| 6 | `local/no-aurora-ui-import` | `features/stores/services` → `aurora/**` | ✅ 既有规则，保持不变（error，当前 0 违规） |

> ⚠️ **原计划的 `local/no-app-panels-cycle`（`aurora/app` ⇄ `aurora/panels` 互禁）已作废**：
> Phase 3 枚举 aurora 内部全部边后确认 `app → panels` 11 处是**装配层的正当职责**（AuroraShell 的职责就是渲染各面板），
> 双向禁止会产生 11 处误报。实际落地为**单向** `no-reverse-to-aurora-app`（即上表第 4 条）。

> 1–3 均覆盖 5 种形态：`import` / `import type` / 动态 `import()` / `require()` / `export ... from`。

**参考文档**：
- `MarkCraft_模块职责与耦合分析_2026-09-17.md`（本方案依据）
- `MarkCraft_源码结构审计报告_2026-09-17.md`（结构全景与死代码）
