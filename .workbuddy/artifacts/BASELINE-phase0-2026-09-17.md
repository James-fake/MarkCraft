# MarkCraft 解耦 · 阶段基线快照（Phase 0 · 2026-09-17）

> **用途**：作为 Phase 1–5 每阶段改动前后的**对照基准**。任何阶段的收尾验证都必须与本表逐项比对，
> 不允许「凭感觉认为没坏」。原始依赖图输出见同目录 `depgraph-phase0-baseline.txt`（392 行）。
>
> 依据：《MarkCraft_解耦实施方案_2026-09-17.md》Phase 0.4。

---

## 1. 三项质量指标（基线）

| 指标 | 基线值 | 采集命令 |
|------|--------|---------|
| 类型校验 `tsc` | **0 错误** | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` |
| 全量测试 `vitest` | **112 文件全通过；1499 passed / 2 skipped / 0 failed** | `node node_modules/vitest/vitest.mjs run` |
| 架构守卫 ESLint | **0 error / 16 warning** | 见 §1.1 |
| 模块级循环依赖 | **8 个**（§3） | `node scripts/_depgraph.cjs` |

### 1.1 守卫命令（与 lint-staged 一致）

```bash
node node_modules/eslint/bin/eslint.js --no-eslintrc -c .eslintrc.guard.cjs \
  --ext .ts,.tsx src/features src/stores src/services
```

> ⚠️ 该命令**没有** `--max-warnings 0`：本阶段新规则以 `warn` 落地是有意的，
> 目的是「先建闸口、再清存量」——若一上来就是 error，Phase 1/2 的迁移提交会被尚未清理的存量卡死。

---

## 2. 守卫违规明细（16 处 · 全部 warn · 待逐条清零）

### 2.1 `local/no-store-to-feature` —— 9 处（Phase 2 清零）

| 文件 | 行 | 被禁来源 |
|------|----|---------|
| `src/stores/kbStore.ts` | 17 | `../features/fileManager/fileManagerUtils` |
| `src/stores/BlockIndexStore.tsx` | 4 | `../features/fileManager/fileManagerUtils` |
| `src/stores/LinkIndexStore.tsx` | 3 | `../features/fileManager/fileManagerUtils` |
| `src/stores/TagIndexStore.tsx` | 3 | `../features/tags/tagExtractor` |
| `src/stores/TagIndexStore.tsx` | 4 | `../features/fileManager/fileManagerUtils` |
| `src/stores/SettingsStore.tsx` | 2 | `../features/shared/utils/plantumlConstants` |
| `src/stores/FileStore.tsx` | 6 | `../features/fileManager/recentFilesManager` |
| `src/stores/FileStore.tsx` | 7 | `../features/fileManager/defaultDocsZh` |
| `src/stores/FileStore.tsx` | 8 | `../features/fileManager/defaultDocsEn` |

### 2.2 `local/no-service-to-feature` —— 4 处（Phase 2 清零）

| 文件 | 行 | 被禁来源 |
|------|----|---------|
| `src/services/backupService.ts` | 4 | `../features/fileManager/fileManagerUtils` |
| `src/services/fileService.ts` | 2 | `../features/fileManager/fileManagerUtils` |
| `src/services/fileService.ts` | 3 | `../features/fileManager/defaultDocsZh` |
| `src/services/fileService.ts` | 4 | `../features/fileManager/defaultDocsEn` |

### 2.3 `local/no-service-to-store` —— 3 处（Phase 1 清零）

| 文件 | 行 | 被禁来源 | 性质 |
|------|----|---------|------|
| `src/services/backupService.ts` | 2 | `../stores/storage/migrate` | 基础设施寄居 |
| `src/services/backupService.ts` | 3 | `../stores/storage/db` | 基础设施寄居 |
| `src/services/fileService.ts` | 6 | `../stores/storage/migrate` | 基础设施寄居 |

> 注意：反向的 `stores → services`（4 处）是**允许**的，不在守卫范围。
> 那 4 处是领域操作函数（`fileService` 文件树 CRUD / `blockReference` / `undoRedoManager`），方向自然。

---

## 3. 模块级循环依赖（8 个 · 目标：Phase 5 后归零）

| # | 环 | 断环 Phase |
|---|----|-----------|
| #1 | `stores > hooks > stores` | Phase 4/5 |
| #2 | `stores > services > stores` | **Phase 1** |
| #3 | `stores > features/shared > stores` | Phase 4 |
| #4 | `stores > services > features/fileManager > stores` | **Phase 2** |
| #5 | `stores > services > features/fileManager > features/templates > stores` | **Phase 2** |
| #6 | `features/editor > features/toolbar > features/editor` | Phase 5 |
| #7 | `aurora/app > aurora/panels > aurora/app` | Phase 3 |
| #8 | `aurora/app > aurora/panels > aurora/components > aurora/app` | Phase 3 |

> 5 环以 `stores` 为节点（#1–#5），3 环在 Aurora 外壳内部（#6–#8）。

---

## 4. 关键入度 / 出度（Phase 0 实测）

**入度（被依赖程度 = 基础性）**

| 模块 | 入度 |
|------|------|
| `stores` | 102 |
| `types` | 79 |
| `components/ui` | 54 |
| `features/shared` | 52 |
| `aurora/icons` | 35 |
| `features/fileManager` | 24 |
| `services` | 23 |
| `utils` | 16 |
| `hooks` | 13 |

**出度（依赖外部模块引用点 = 协调性）**

| 模块 | 出度 |
|------|------|
| `aurora/panels` | **165** |
| `features/editor` | **95** |
| `features/blog` | 32 |
| `features/toolbar` | 29 |
| `features/knowledgeBase` | 26 |
| `aurora/app` | 25 |
| `stores` | 18 |

**健康基础层**（高入度、近零出度）：`types`（出 1）／`components/ui`（**出 0**）／`utils`（**出 0**）／`aurora/icons`（出 1）。

**身份撕裂**（既是底座又依赖别人 → 循环策源地）：`stores`（入 102 / 出 18）、`features/shared`（入 52 / 出 9）。

---

## 5. Phase 0 同时修掉的一个**预存缺陷**（非本次引入）

**现象**：`.eslintrc.guard.cjs` 只加载 `local` 插件，而源码中存在
`// eslint-disable-next-line react-hooks/exhaustive-deps` 指令。ESLint 对
「disable 指令引用了未加载插件的规则」**直接报 error**，实测 **7 处假错误**。

**为什么危险**：那 7 处分布在 `CssEditor.tsx` / `CssPanel.tsx` / `useBlogGenerator.ts` /
`WheelPicker.tsx`(×2) / `NoteContextPanel.tsx`(×2)。只要提交触碰这些文件的对应行，
**pre-commit 就会被与架构毫无关系的原因卡死**，且报错信息会把人引向"react-hooks 规则有问题"的错误方向。

**证伪方式（确认预存）**：用 `git show HEAD:.eslintrc.guard.cjs` 导出 HEAD 版配置复跑 →
同样 **7 errors / 0 warnings**，与本次新增规则无关。

**修复**：守卫配置 `plugins: ['local', 'react-hooks']` —— **只加载插件、不启用任何规则**。
指令因此可解析，且因未启用 react-hooks 规则，**不会新增任何 lint 债诊断**（仍完全不触碰既有 ~200 条债）。

**修复后**：`16 problems (0 errors, 16 warnings)` —— 纯信号、零假阳性。

---

## 6. Phase 0 交付物清单

| 类别 | 内容 |
|------|------|
| 新增目录骨架 | `src/core/{files,tags,storage,constants,data}/index.ts`（空导出，含各目录职责与下沉来源注释） |
| 新增别名 | `@core` → `src/core`（`tsconfig.json` paths 与 `vite.config.ts` alias **双处同改**） |
| 新增守卫规则 | `scripts/eslint-local-rules/_forbidden-import.cjs`（工厂）+ `no-store-to-feature` / `no-service-to-feature` / `no-service-to-store` |
| 守卫接线 | `scripts/eslint-plugin-local/index.cjs` 注册；`.eslintrc.guard.cjs` 加 2 个 override（warn） |
| 缺陷修复 | `.eslintrc.guard.cjs` 补 `react-hooks` 插件（见 §5） |
| 基线归档 | 本文件 + `depgraph-phase0-baseline.txt` |

### 6.1 守卫负向验证（Phase 0 实测通过）

守卫的 5 条代码路径 **逐条注入探针验证**（`src/{stores,services}/__negprobe.ts`，验证后已删）：

| 代码路径 | 探针形态 | 结果 |
|---------|---------|------|
| 别名 + import | `import a from '@features/...'` | ✅ 报红 |
| 相对路径 + import | `import b from '../features/...'` | ✅ 报红 |
| 别名 + export-all | `export * from '@features/diary'` | ✅ 报红 |
| 相对路径 + export-named | `export { x } from '../features/...'` | ✅ 报红 |
| 别名 + 动态 import | `import('@features/...')` | ✅ 报红 |
| 相对路径 + require | `require('../features/blog')` | ✅ 报红 |
| services → stores（别名 + export-all） | `export * from '@stores/storage/migrate'` | ✅ 报红 |

**8/8 精确命中**，探针删除后守卫回到 16 警告基线（零残留）。
> 意义：当前 16 处真实违规**全是「相对路径 + import」单一形态**——若不注入探针，
> 其余 5 条代码路径将处于「写了但从未被验证」的假安全状态。
> 另：`export ... from` 是本方案新增覆盖的形态，全仓实测 4 处**全部在 aurora 层向下**（合法），
> 说明升级到新守卫**零新增误报**。
