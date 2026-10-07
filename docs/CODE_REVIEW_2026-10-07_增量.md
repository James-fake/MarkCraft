# MarkCraft 代码审查 · 增量报告（2026-10-07）

- **审查对象**：`1d76204`（打开文件与导入优化）、`0364b9d`（空态引导新增「打开文件」）
- **方式**：宿主 Agent 逐行精读 + 历史报告闭环核查（沿用 `ocr` delegate 模式，本机无 LLM endpoint）
- **核心结论**：历史两轮报告（10-04 / 10-05）**已闭环**；但 10-07 的两个功能提交**此前从未被审查**，本次补审发现 **1 Medium + 4 Low**。其中 **M1 已修复**、**L3 复核后撤销**（属有意设计），**L1 / L2 / L4 也已一并修复** → 本轮补审项**全部闭环**（详见 §四）。

---

## 一、历史报告闭环核查

### 1.1 10-05 报告（H1/H2/M1/M2/L1/L2/L3）

该报告自带「修复状态表」（`CODE_REVIEW_2026-10-05.md` §6），逐项闭环：H1/H2/M1/M2/L1 → `767c01f`，L2/L3 → `b50b5f3`，M3 复核为**误报**（全部 `JSON.parse` 已在 try/catch 内）。✅

### 1.2 10-04 报告（C1–C8 / H1–H13 / Medium 四类 / i18n）

该报告**没有状态表**，故采用「报告后文件是否被改动」+ 抽样回读源码双重核查：

| 抽查项 | 结论 |
|---|---|
| `useMathRender.ts` 首屏 KaTeX 不渲染 | ✅ 已修：`prevRef` 改 `null` 哨兵初值 + 注释说明 |
| `draftBlindSpot.ts` `/g` 正则 lastIndex 残留 | ✅ 已修：使用前重置 `lastIndex` |
| `useCM6UndoRedo.ts` 模块级单例串扰 | ✅ 已修：改 `useRef` 实例级 |
| `ToastProvider.tsx` 定时器卸载不清 | ✅ 已修：cleanup 遍历 `clearTimeout` |
| `ConfirmProvider.tsx` 并发 confirm 挂起 | ✅ 已修：新增 `queueRef` 队列 |
| `lintExtension.ts` line 0-based 错位 | ✅ 已修：区间 `[0,totalLines)` + `+1` 转 1-based |
| `graphExport.ts` blob URL 从不 revoke | ✅ 已修：`download()` 内统一回收 blob: |
| `aurora-nav.ts` 假数字角标 | ⚠️ **部分修**：新函数已去 count，旧导出仍留假数据 → 见 **L4** |

修复批次链完整：`f46f71f`(Critical) → `6a428be`/`96ad744`/`eccbdf0`/`5ed25cc`(High) → `4e5c48c`/`20cc672`/`afdaf9e`/`3cf70b5`/`16c5d68`/`75aafd4`(Medium) → `767c01f`/`b50b5f3`(10-05 项)。

---

## 二、本轮新发现（10-07 改动）

### 🟠 M1 — 拖拽多个同名文件时重名去重失效（与本次需求目标冲突）

- **位置**：`src/aurora/app/AuroraShell.tsx:227-238`
  ```tsx
  for (const file of Array.from(files)) {
    if (!isSupportedFile(file.name)) continue
    try {
      const { baseName, content } = await importFileToMarkdown(file)
      const name = uniqueFileName(rootFolder, baseName)   // ← rootFolder 为 effect 闭包快照
      createFile('root', name, content)
    } catch (err) { toast.show(..., 'error') }
  }
  ```
- **根因**：`rootFolder` 在 effect 建立时捕获（依赖数组 `[createFile, rootFolder, toast]`），**循环内不会更新**；`createFile` 改的是 store，需重渲染 + effect 重建才反映到闭包。而 `uniqueFileName`（`fileService.ts:168`）只读 `root.children`。
- **触发**：一次拖入 `a.md` + `a.md`（或 `a.md` + `a.txt`，两者都映射为 `a.md`）→ 两次判定均基于**同一旧快照**、都认为"不冲突" → 返回同一个 `a.md` → **重名文件并存**。跨目录拖两个同名文件是常见操作。
- **影响**：直接违反需求 #3「同名加序号」。
- **修复建议**：循环内维护本轮已用名集合，与快照名合并去重：
  ```tsx
  const taken = new Set(
    (rootFolder.children ?? []).filter((c) => c.type === 'file').map((c) => c.name),
  )
  for (const file of Array.from(files)) {
    if (!isSupportedFile(file.name)) continue
    const { baseName, content } = await importFileToMarkdown(file)
    let name = `${baseName}.md`
    if (taken.has(name)) {
      let i = 1
      while (taken.has(`${baseName} (${i}).md`)) i++
      name = `${baseName} (${i}).md`
    }
    taken.add(name)
    createFile('root', name, content)
  }
  ```
  更彻底的做法：给 `uniqueFileName` 增加可选参数 `extraTaken?: Set<string>`，保持单一来源不被破坏。

- **✅ 修复状态（2026-10-07）**：已按「更彻底」方案落地 ——
  - `fileService.ts`：`uniqueFileName(root, base, extraTaken?: Iterable<string>)`，去重算法仍只在 `uniqueFileName` 一处（未在调用侧复制序号逻辑）。
  - `AuroraShell.tsx`：拖拽循环新增 `const taken = new Set<string>()`，每次 `uniqueFileName(rootFolder, baseName, taken)` 后 `taken.add(name)`。
  - `uniqueFileName.test.ts`：新增 2 条用例（批量连续生成 `笔记.md / 笔记 (1).md / 笔记 (2).md`；`extraTaken` 与快照已有文件合并判重 → `笔记 (2).md`）。
  - 验证：`tsc --noEmit` ✓ · 该测试文件 7/7 ✓ · `eslint` ✓。

### 🟡 L1 — `pickAndImportFile` 同样捕获 `rootFolder` 快照，快速连续导入存在重名竞态

- **位置**：`src/features/import/importFlow.ts:24,29`
- 单次调用只导一个文件，但若第一次导入（如大 docx 转换耗时）尚未完成时用户再次触发「打开文件」并选中同名文件，两次都用同一 `deps.rootFolder` 快照 → 重名。触发窗口小，风险 Low。
- **修复建议**：与 M1 同源 —— 由调用方在回调时取最新 root，或让 `createFile` 内部兜底去重。

### 🟡 L2 — `openFilePicker` 仅靠 `cancel` 事件清理 input，缺兼容兜底

- **位置**：`src/features/import/openFilePicker.ts:24`
  ```ts
  input.addEventListener('cancel', () => input.remove())
  ```
- 依赖 `cancel` 事件（Chrome 113+ / Firefox 91+ / Safari 16.4+ 才支持）。更旧环境下用户取消选择时，隐藏 input 永久残留 `<body>`，每次调用累积一个节点。
- **修复建议**：加窗口重新聚焦兜底，例如
  `window.addEventListener('focus', () => setTimeout(() => input.remove(), 0), { once: true })`。

### ✅ L3 — 复核后**撤销**：属有意设计，非缺陷

- 原判：`uniqueFileName` 只收 `type === 'file'`，根下同名文件夹不避让。
- 复核：`uniqueFileName.test.ts` 已有用例「仅按文件判重，文件夹同名不算冲突」**明确固化了该行为**，即「文件与文件夹允许同名」是有意设计。故撤销此项。
- 说明：本次顺手把该用例标题补上「（有意设计）」字样，避免后续审查再次误报。

### 🟡 L4 — 遗留常量 `AURORA_SIDEBAR_GROUPS` 仍带假数字角标

- **位置**：`src/aurora/panels/aurora-nav.ts:73,74,90`（`count: 256 / 365 / 12`）
- 修复只改了生产用函数 `buildAuroraSidebarGroups`（:111/:112/:128 已去 count）；旧导出 `AURORA_SIDEBAR_GROUPS` 未清理，仍被 `Sidebar.test.tsx`、`auroraNav.contract.test.ts` 当 fixture 引用。**生产无消费者**（已 grep 确认）→ 当前无 UI 影响，但属误导性死数据，未来误接线即复现原缺陷。
- **修复建议**：删除该导出，测试改用 `buildAuroraSidebarGroups(zhTranslations)`；或至少标 `@deprecated`。

---

## 三、已核验为正确（避免误报）

| 项 | 结论 |
|---|---|
| `openFilePicker` 的 `input.click()` 时机 | ✅ 在用户手势同步栈内，不会被浏览器拦截 |
| `importFlow` 的浮动 Promise | ✅ `void (async …)()` + try/catch 包裹，无 unhandled rejection |
| 拖拽后是否自动打开 | ✅ `createFile` 第 4 参默认 `openAfterCreate = true`，与注释「新建并打开」一致 |
| 三处落点父节点一致性 | ✅ 根 id 恒为 `'root'`（`fileTree.ts:56`），`handleCreateNote` 的 `rootFolder.id`、`importFlow` 默认 `'root'`、拖拽硬编码 `'root'` 三者等价 |
| `importFile` 扩展名边界 | ✅ `.md`（点开头）等异常名走 `default` 抛错，由 `onError` 提示兜底 |
| 空态新按钮（`0364b9d`） | ✅ 复用既有 `openImport`；i18n 三处同步；`.aurora-editor__empty-actions` 无其他消费者；`Icon.folderOpen` 存在于注册表 |
| 拖拽事件监听清理 | ✅ 四个 `document` 监听在 effect cleanup 中成对移除，引用一致 |

---

## 四、修复状态（2026-10-07）

| 编号 | 状态 | 落地 |
|---|---|---|
| 🟠 M1 | ✅ 已修 | `uniqueFileName` 加 `extraTaken?: Iterable<string>`；`AuroraShell` 拖拽循环累积 `taken` |
| 🟡 L1 | ✅ 已修 | `ImportFlowDeps.rootFolder` → **`getRootFolder: () => FileNode`**（在文件选中回调内延迟求值）；`EditorPanel` / `AuroraShell` 各加 `rootFolderRef`，`auroraActions` 的 deps 增 `getRootFolder`。顺带使 `EditorPanel.openImport` 的 `useCallback` 可去掉 `rootFolder` 依赖 |
| 🟡 L2 | ✅ 已修 | `openFilePicker` 增 `window focus`（`{ once: true }`）兜底清理 + `cleanup` 幂等标志 |
| 🟡 L4 | ✅ 已修 | 删 `AURORA_SIDEBAR_GROUPS` 三处假 `count`，并补注释说明其「语言无关结构基准」定位 |
| ✅ L3 | 撤销 | 复核为有意设计（既有测试已固化「文件夹同名不算冲突」） |

**验证门禁（2026-10-07）**：`tsc --noEmit` ✓ · `eslint` ✓ · `vitest` 146/147 文件（1833 passed / 1 failed，唯一失败为 `BlogPanel.smoke` 缺 IndexedDB 的**环境性**用例，与本次改动无关）。

> **L1 为何不用「在 `createFile` 内部兜底去重」**：`createFile` 的 `newFile`（含 `generateId()` 副作用）必须在 `setState` updater **之外**构造（见 `useFileTreeActions.ts:33-34` 的 StrictMode 注释），故无法在 updater 内安全地基于最新树重算文件名。改用「延迟取值」是当前约束下最干净的解法。

> 说明：本报告为**补审**，只覆盖 10-07 增量与历史闭环核查，未重跑全量扫描。修复后建议沿用既有门禁：`tsc --noEmit` → `eslint` → `vitest run` → `vite build`。
