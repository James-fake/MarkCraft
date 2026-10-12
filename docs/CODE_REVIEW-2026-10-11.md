# MarkCraft 代码审查报告 · 解耦专项（2026-10-11）

> 依据：`docs/CODE_REVIEW.md`（审查标准 / S0–S3 严重度 / 6 条红线）+ `.opencodereview/rule.json`（项目规则）。
> 范围：分层解耦审计 + 近期未提交改动（滚轮鼓修复、主页版本号移除、关于页更新日志、eslint 收紧与 CI 门禁、any 清理）的代码审查。
> 工具：`eslint`（含 `local/no-aurora-ui-import` 守卫）、`tsc --noEmit`、`madge --circular`。

---

## 一、解耦（分层）审计结果

| 检查项 | 结果 | 说明 |
| --- | --- | --- |
| 分层守卫 `no-aurora-ui-import`（features/stores/services 不得反向 import aurora） | ✅ PASS | eslint 运行 0 违规 |
| `@platform` 边界（业务代码不得 `require('electron')` / 直接读 `window.markcraft`） | ✅ PASS | 无 `require('electron')`；`window.markcraft` 仅出现在 `src/platform/` 边界层 |
| 地基层纯净（`src/components/ui/` 不得依赖 aurora 皮肤） | ✅ PASS | 全目录无 `aurora` 依赖 |
| 类型检查三处（src / electron / e2e） | ✅ PASS | `tsc --noEmit` exit 0 |
| 全量 Lint（`--max-warnings 0`） | ✅ PASS | exit 0（0 error 0 warning） |

### 循环依赖审计（madge）

`madge --circular` 报告 **17 条环形引用**（修复前 18，本次已消除 1 条导出 barrel 循环）。
经逐条核对反向边，**12 条为 type-only 假阳性**（编译期 `import type` 在 emit 时被擦除，运行时不存在环形引用），仅 **5 条为运行时环形引用且均为良性**（ESM 实时绑定，函数声明提升，无 TDZ 风险）：

**Type-only 假阳性（信息项，无需动作）：**
- `core/storage/backend.ts ↔ legacyIdbMigrate.ts`（`legacyIdbMigrate` 仅 `import type { StorageBackend }`）
- `features/canvas-v2/engine/CanvasEngine.ts → engineCameraOps/engineDocument/engineErase/engineQueries → engineTypes`（ops 模块仅 `import type { CanvasEngine }`；`engineTypes` 仅 `import type { CanvasEngine }`）
- `features/lint/markdownLinter.ts → fixFunctions.ts` 及 `→ rules/index.ts → *Rules`（所有规则仅 `import type { LintIssue }`）

**运行时环形引用（S3 可维护性，建议后续治理）：**
1. `aurora/panels/canvas/CanvasPanel.tsx ↔ CanvasTopbar.tsx`（兄弟组件互引）
2. `aurora/panels/kb/KbPanel.tsx ↔ kb/kbSession.ts`（兄弟组件互引）
3–4. `features/blog/templates/utils.ts → htmlWrapper.ts → styleBuilder/index.ts → {commentScript, shareButtons}`（聚合器模式）

> 注：madge 不解析 TS 的 type-only 擦除，故会把上述 type-only 边也计入。真实运行时环形依赖仅上述 5 条，且均处 UI 层 / 聚合器，属低风险代码气味，非运行时缺陷。

### 本次已修复的解耦问题

**`features/export/exportUtils.ts ↔ utils/exportImage.ts` 运行时 barrel 循环依赖（已消除）**

- 成因：`exportUtils` re-export `exportToImage/downloadImage`（来自 `exportImage`），而 `exportImage` 又从 `../exportUtils` 取 `downloadBlob` → 形成运行时环形引用。
- 修复：将 `downloadBlob` 抽离为 leaf 模块 `features/export/utils/downloadBlob.ts`（仅依赖 `@platform`，无回边），`exportUtils` 继续 `export { downloadBlob } from './utils/downloadBlob'` 保持对外 API 不变；`exportImage` 改为 `import { downloadBlob } from './downloadBlob'`。
- 验证：该子树 `madge --circular` 已报 `No circular dependency found!`；`tsc --noEmit` exit 0；相关文件 eslint exit 0。

---

## 二、近期改动代码审查

### 2.1 设置滚轮鼓修复（AuroraSelect / ScrollNumberInput / Option·Number·DateWheelPicker + 新 `useWheelListGestures`）

- **严重度**：无缺陷（S4 正面）
- **评价**：
  - ✅ 手势逻辑正确抽取为共享 hook `useWheelListGestures.ts`（关注点分离，原 3 个组件重复的手势处理收敛为单一来源）—— 这是**正向解耦**。
  - ✅ 滚轮用原生非 passive `addEventListener('wheel', …, {passive:false})`，规避了 React `onWheel` 在根节点 passive 绑定导致 `preventDefault` 失效的经典坑；文档注释充分。
  - ✅ 拖拽用 `setPointerCapture` + 双层 `stopPropagation`，与祖先页面级手势隔离；拖拽中关 `scroll-snap`、松手恢复，逻辑自洽。
  - ✅ 两个浮层（`AuroraSelect`/`ScrollNumberInput`）`onMouseLeave` 加 `e.buttons & 1` 守卫，修复「拖动被误判为切页」。
  - ✅ 变更最小、类型检查与 13/13 SettingsPanel 冒烟测试通过。
- **建议（非阻塞）**：`endDrag` 中 `cont.style.scrollSnapType = ''` 假设 snap 由 stylesheet 类设定；若某调用方用 inline style 设 snap，重置会清掉它。当前 3 个滚轮组件均走 CSS 类，安全；可在 hook 注释中显式约定「调用方须用 CSS 类而非 inline 设定 scroll-snap」以防回归。

### 2.2 主页版本号移除（WelcomePanel / welcome.css / 02-welcome-panel.md）

- ✅ 干净：同步移除 JSX 节点、孤立 CSS 规则与文档注释，无遗留死代码。

### 2.3 关于页「最新更新」补写（AboutSection + i18n）

- ✅ **i18n 三处同步红线达标**：`chg200FixTitle` / `chg200_7…19` 在 `zh/common.ts`、`en.ts`、`zh/index.ts` 三文件均存在（脚本核对，计数一致）。
- ✅ AboutSection 渲染位置正确，置于 v2.0.0 区块之后、v1.8 之前，层级合理。

### 2.4 eslint 收紧 + CI 门禁 + any 清理

- ✅ `no-explicit-any` / `no-unused-vars` 升 error；`dev/**` 与测试文件豁免 `no-console` / `react-refresh`（一次性脚本，不进打包）。
- ✅ CI Lint 步由 `continue-on-error` 软门禁转为**硬门禁**（存量 0 error）。
- ✅ 剩余 `any` 全在 `engineTypes.ts`，为上游 tldraw/Excalidraw 类型声明被 `.DELETE` 破坏导致的有意鸭子类型桥接，已 `eslint-disable` + 注释锁定（替换为具体类型不可行）；非设计债。

---

## 三、问题清单（按严重度）

| 严重度 | 问题 | 位置 | 建议 |
| --- | --- | --- | --- |
| S3 | 运行时环形依赖（UI 兄弟组件互引） | `CanvasPanel ↔ CanvasTopbar`、`KbPanel ↔ kbSession` | 抽共享类型/逻辑到第三模块（如 `kbSession` 的类型与纯函数独立） |
| S3 | 运行时环形依赖（聚合器模式） | `blog/templates` 链路 | `styleBuilder/index` 与 `commentScript/shareButtons` 改为只依赖 `utils` 暴露的纯函数，去掉回边 |
| S4（信息） | 12 条 type-only 假阳性循环 | storage / canvas-v2 / lint | 无需动作；可在 `rule.json` 注明「madge 计数含 type-only，审查时以运行时为准」 |

> 本次**未引入**任何 S0–S2 级缺陷。所有红线（分层守卫 / `@platform` 边界 / i18n 三处同步 / UI 设计基线）均达标。

---

## 四、结论与后续建议

1. **解耦状态良好**：三大红线（分层守卫、平台边界、地基层纯净）全绿；运行时环形依赖仅 5 条良性 UI/聚合器气味，已消除最该修的导出 barrel 循环。
2. **代码审查通过**：近期改动质量达标，无阻断级问题；滚轮鼓修复为优质解耦实践（逻辑抽取共享 hook）。
3. **建议后续（可选，非阻塞）**：
   - 将 5 条运行时环形依赖逐步抽共享模块，目标 `madge --circular` 归零（纯可维护性收益，无功能风险）。
   - 在 `useWheelListGestures` 注释显式约定 scroll-snap 由 CSS 类设定。
   - 尚未提交：上述所有改动（含本次解耦修复）仍为未提交状态，建议走 PR 触发 `code-review` CI 门禁复核。
