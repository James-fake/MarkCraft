# TiptapEditor 每键击全量序列化 · 性能方案设计

> 来源：2026-11-03 穷尽式审查 P1（「每次键击同步整篇 htmlToMarkdown + 12 轮全文档扫描」）。
> 本文只做设计，不含实现。实施前请先跑「阶段 0」拿到本机数据。

## 1. 现状成本模型

WYSIWYG 模式每次键击（`onUpdate`，`TiptapEditor.tsx:203-237`）依次执行：

| # | 步骤 | 成本 | 状态 |
| --- | --- | --- | --- |
| 1 | `ed.getHTML()` | ProseMirror DOMSerializer 遍历**全文档**生成 HTML 字符串 | 每键击 |
| 2 | `htmlToMarkdown(html)` | 6 段 regex 预处理 + Turndown **全文档**遍历；`extractDivBlock` 对每个公式块重置 `lastIndex` 从头重扫 → 最坏 O(k²·n) | 每键击 |
| 3 | `djb2Hash(md)` + Map 写 | O(n) 字符串哈希 | 每键击 |
| 4 | `undoRedo.pushHistory(...)` | 有 `groupKey`（`wysiwyg-typing`）+ 800ms 窗口合并，**撤销栈不会膨胀**；但每次 push 都 `subscribe()` → UndoRedoProvider 50ms 防抖 `forceRender` → **整个 Provider 子树 reconcile** | 每键击 |
| 5 | `onPushUndo(md, ...)` | 主编辑路径未传（`EditorLayout.tsx:546` 的 `<TiptapEditor>` 没有该 prop），实际空转 | 无害 |
| 6 | `scheduleLintCheck(md)` | 500ms 防抖 | ✅ 已防抖 |
| 7 | **`lintMarkdown(md, t)` + `setLintIssues(...)`** | **同步全量 lint**（`text.split('\n')` + 5 类检查，其中 `isPositionInCodeBlockFast` 是 O(n²)），并触发 `setState` → 又一次重渲染 | ❌ **与第 6 步完全重复，且绕过防抖** |
| 8 | `onChangeRef.current(md)` | 300ms 防抖 | ✅ 已防抖 |

### 三个真问题

1. **第 7 步是纯重复**：`scheduleLintCheck` 内部已经做了 `lintMarkdown`（`useTiptapLint.ts:29-35`），`onUpdate` 里又同步跑一次。等于每键击两遍全量 lint，其中一遍还绕过防抖。
2. **第 1+2 步是全量序列化**：连续输入 N 个字符 = N 次「DOM 序列化 + Turndown 全文档遍历」，而其中只有最后一次的结果会被 300ms 后的 `onChange` 用上——前 N-1 次的结果只服务于 `lastEmittedMd`/`recentEmits`/`htmlSnapshot`（回声判定缓存）。
3. **第 4 步的重渲染频率**：pushHistory 本身便宜，但它把 `forceRender` 拖成「每 50ms 一次」。编辑器子树（含 12 个 NodeView）持续 reconcile，与输入延迟叠加。

### 附加成本（不在 onUpdate 里，但同属「每 transaction」）

- **12 个 `appendTransaction` 插件**各自在 `docChanged` 时做全文档 `descendants` + regex：`TaskListInputRule`、`IframeNode`、`MediaEmbed`、`PdfEmbed`、`MathInline`、`LinkInputRule`、`ImageInputRule`、`FootnoteInputRule`、`HeadingIdAssign`、`MarkdownInlineInputRules`、`ClearMarksOnEnter`、`SearchExtension`。
- `SearchExtension` 在搜索激活时每键击全量重建 DecorationSet（无 `DecorationSet.map` 增量）。

## 2. 目标与验收

**目标**（以 200KB 文档、连续输入 100 字符为基准）：

- 单次键击主线程占用从「全量序列化 + 全量 lint」降到「O(1) 标记 + 一次调度」；
- 连续输入的序列化次数从 100 次降到 1-3 次；
- 输入延迟 P95 < 16ms（一帧）。

**验收**：

1. `stressAndPerf.test.ts` 新增一档「模拟 100 次键击的 onUpdate 总耗时」，设数量级上限；
2. 8 个 flush 点的单测（见 §3.2）逐个覆盖；
3. 手工：200KB 文档连续输入无卡顿；输入后立刻切文件/关窗口**不丢字**；Ctrl+Z 粒度正常（800ms 合并窗口保持不变）。

## 3. 分阶段方案

### 阶段 0 · 先测量（必做，0.5h）

在 `onUpdate` 里加 dev-only 埋点（`import.meta.env.DEV` 守卫，生产 tree-shake）：

```ts
const t0 = performance.now()
const html = ed.getHTML()
const t1 = performance.now()
const md = htmlToMarkdown(html)
const t2 = performance.now()
// … lint / pushHistory 各自打点
if (import.meta.env.DEV) perfAcc.add({ getHtml: t1 - t0, toMd: t2 - t1, /* … */ })
```

用 3 档文档（1KB / 50KB / 200KB）各敲 100 字，输出 P50/P95 与占比。

**为什么必须**：阶段 1 的收益取决于 lint 占比，阶段 2 的收益取决于序列化占比。不测就动手，很可能优化掉占比最小的那段。

### 阶段 0 实测结果（2026-11-04，jsdom）

基准已落在 `src/testing/stressAndPerf.test.ts` 的「WYSIWYG 每键击成本剖面」档，
探针模块为 `src/features/editor/perfProbe.ts`。

| 文档规模 | 测量次数 | `htmlToMarkdown` | `lintMarkdown` | 单次键击合计 |
| --- | --- | --- | --- | --- |
| ~28KB（buildDoc 100 节） | 100 | 85.3s（**87.5%**） | 12.1s（12.5%） | 975ms |
| ~8KB（buildDoc 30 节，入全量套件的档） | 20 | 4.18s（**94.8%**） | 0.23s（5.2%） | 220ms |

> jsdom 的 DOM 比浏览器重数倍，绝对时长不代表真机；**占比**是可信的。

**结论**：序列化（Turndown 全文档）是绝对大头（87-95%），**阶段 2 是核心**；阶段 1 只能拿到 5-12%，但因零风险仍先做。`getHTML` 无法在 jsdom 复现（需 ProseMirror 实例），真机占比由 `perfProbe` 的 dev 日志补充。

### 阶段 1 · 合并重复的 lint 计算（零风险，收益立竿见影）

**先纠正一个容易误判的点**：两处 lint 调用不是「完全重复」——它们**计算重复、作用不同**：

- `scheduleLintCheck(md)`（`useTiptapLint.ts:29-35`）→ `setLintIssues(issues)`：只更新 **React state**（popover / 状态栏用）；
- `onUpdate` 里的 `ed.commands.setLintIssues(issues)`（`TiptapEditor.tsx:234-235`）→ 把 issues 送进 **ProseMirror 装饰**（编辑器内联下划线高亮），这是装饰的**唯一**更新路径。

所以不能直接删任何一处，否则要么 popover 不更新、要么高亮消失。正确做法是**一次计算、两处应用**：

```ts
// useTiptapLint 增加 onIssues 回调
interface UseTiptapLintParams {
  lintMarkdown: (text: string, t?: Translations) => LintIssue[]
  t?: Translations
  /** 计算完成后统一应用（React state 之外，调用方用它把 issues 送到编辑器装饰） */
  onIssues?: (issues: LintIssue[]) => void
}

const scheduleLintCheck = useCallback((md: string) => {
  if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
  lintTimerRef.current = setTimeout(() => {
    const issues = lintMarkdown(md, t)
    setLintIssues(issues)      // React 侧
    onIssuesRef.current?.(issues) // 装饰侧（editor 由调用方闭包提供）
  }, 500)
}, [lintMarkdown, t])
```

`TiptapEditor` 侧：

```ts
const { /* … */ scheduleLintCheck } = useTiptapLint({
  lintMarkdown,
  t,
  onIssues: (issues) => {
    const ed = editorRef.current
    if (ed && !ed.isDestroyed) ed.commands.setLintIssues(issues)
  },
})

// onUpdate 里只保留这一行
scheduleLintCheck(md)
```

**行为差异**：lint 高亮的出现时机从「即时」变为「停顿 500ms 后」。lint 是辅助提示，打字时不应闪烁——这个延迟是**改善**而非退化。

**预期收益**：每键击的 lint 次数从 2 次（一次同步 + 一次防抖）降到 1 次（防抖），且不再有同步 setState 触发的额外重渲染。这是三项里最容易拿到、风险最低的收益。

### 阶段 2 · 序列化防抖 + 明确 flush 点（核心，中等风险）

#### 2.1 onUpdate 精简为「只做标记与调度」

```ts
onUpdate: ({ editor: ed }) => {
  if (isInternalUpdate.current || isUndoRedoRef.current) return
  // ① 立即置 dirty（不能等防抖：用户敲完立刻关窗口，否则会被判定为「未修改」）
  dirtyRef.current = true
  // ② 记录光标（撤销恢复用，O(1)）
  const { from, to } = ed.state.selection
  selectionRef.current = { from, to }
  // ③ lint 仍然防抖（500ms，已有）
  scheduleLintCheck(lastSerializedMd.current ?? '')  // 注意：用上一次序列化结果，避免为此再序列化一次
  // ④ 序列化防抖：250ms 内只做最后一次
  scheduleSerialize()
}
```

`scheduleSerialize`：

```ts
const SERIALIZE_DEBOUNCE_MS = 250
const serializeNow = useCallback((reason: FlushReason) => {
  if (!dirtyRef.current) return
  const ed = editorRef.current
  if (!ed || ed.isDestroyed) return
  const html = ed.getHTML()
  const md = htmlToMarkdown(html)
  dirtyRef.current = false
  lastEmittedMd.current = md
  pendingMdRef.current = null
  recentEmitsRef.current.add(md)      // 有界清理保持不变
  htmlSnapshotRef.current.set(djb2Hash(md), { md, html })
  const { from, to } = selectionRef.current
  const fileId = fileIdRef.current
  if (fileId) undoRedo.pushHistory(fileId, md, from, to, 'wysiwyg-typing')
  onChangeRef.current(md)             // 注意：这里不再需要 300ms 二次防抖
  if (import.meta.env.DEV) logger.debug('[tiptap] flush:', reason)
}, [])
```

**撤销栈粒度不变**：`pushHistory` 有 `groupKey='wysiwyg-typing'` + 800ms 合并窗口，把 push 从「每键击」挪到「每 250ms 停顿」不改变用户感知（原来 800ms 内也只压一条）。

#### 2.2 八个 flush 点（**必须全覆盖，这是不丢字的唯一保障**）

| # | 时机 | 位置 | 不 flush 的后果 |
| --- | --- | --- | --- |
| 1 | 切换文件（`fileId` 变化） | `useTiptapContentSync` 的 `fileIdChanged` 分支**之前** | 切走后最后 250ms 的输入写进新文件 / 丢失 |
| 2 | 组件卸载 | `useEffect` cleanup | 关闭标签页丢最后一段 |
| 3 | 失焦 | `editor.on('blur')` | 点其他面板后内容未同步到 store |
| 4 | Ctrl+S / 手动保存 | `useTiptapFileOps` 保存入口 | 保存的是旧内容 |
| 5 | undo / redo 执行前 | `handleUndo` / `handleRedo` 开头 | 撤销基于过期快照，撤销后内容回退错位 |
| 6 | 切换编辑模式（WYSIWYG ↔ 源码） | `EditorLayout` 的 `flushContent()` | 源码模式看到旧内容（该函数已有，接上即可） |
| 7 | 预览 / 导出 / 发布前 | 消费 `lastEmittedMd` 的入口 | 预览与导出落后 250ms |
| 8 | `beforeunload` | window 监听 | 关窗口丢最后一段 |

> 现有代码里 `EditorLayout.flushContent()` 已经是「模式切换前把内容同步出去」的既有设施，阶段 2 应复用它而不是新造。

#### 2.3 回声判定要纳入 pending 值

`useTiptapContentSync` 用 `value === lastEmittedMd.current || recentEmits.has(value)` 判断「父级 value 只是自己的回声」。防抖窗口内 `lastEmittedMd` 还是**上一次**的值，父级此刻传下来的新 value 可能是上一轮的——判定会失败并走 `setContent` 回滚。

**对策**：新增 `pendingMdRef`，在 `scheduleSerialize` 时**不**更新它，但在 `serializeNow` 完成后清空；回声判定改成三者取或：

```ts
const isOwnEcho =
  value === lastEmittedMd.current ||
  value === pendingMdRef.current ||
  recentEmits.current.has(value)
```

（若阶段 2 只做「序列化防抖」而不改 `onChange` 时机，则 `pendingMdRef` 可省；但只要 `onChange` 也进了防抖，就**必须**加。）

#### 2.4 风险与对策

| 风险 | 对策 |
| --- | --- |
| 丢字（最大风险） | 8 个 flush 点 + 单测逐个覆盖；`dirtyRef` 即时置位；卸载/`beforeunload` 双保险 |
| 父级 value 回流误判 → `setContent` 回滚 | 回声判定纳入 `pendingMdRef`（§2.3） |
| 撤销粒度变化 | 保持 `groupKey` + 800ms 窗口不变；实测「一次 Ctrl+Z 回退多少」与现状一致 |
| 光标位置过期 | `selectionRef` 每次 transaction 更新（O(1)），flush 时读取 |
| 统计/字数显示滞后 250ms | 字数统计读 `lastEmittedMd`，可接受；若要即时，改为读 `editor.state.doc.textContent.length`（O(n) 但比序列化便宜一个数量级） |

#### 2.5 预期收益

连续输入 100 字符：`getHTML + htmlToMarkdown` 从 100 次降到 1-3 次；`pushHistory` 的 `forceRender` 从每 50ms 一次降到每 250ms 一次。

### 阶段 3 · `extractDivBlock` 线性化（中风险，纯算法）

现状（`htmlToMd.ts:43-90`）：每个 `data-type` div 都 `exec` 一次，找到配对 `</div>` 后**重建整个字符串**并重置 `lastIndex` 重扫 → k 个块最坏 O(k²·n)。

改法：一次扫描用**栈**记录配对区间，然后**从后往前**替换（避免 index 位移）：

```ts
// 伪代码
const spans: Array<{ start: number; end: number; value: string }> = []
// 单次遍历：遇到 <div … data-type="X" …> 入栈，遇到 </div> 出栈并记录 span
// 逆序替换：result = result.slice(0, s) + placeholder + result.slice(e)
```

**验收**：新增单测覆盖「嵌套 div」「多公式块（10+）」「无公式」「属性值含 `>`」；`mathPipeline.test.ts` 与 `mdToHtml.roundtrip.test.ts` 不回归。

**收益**：公式密集文档（如 500 块）从「500 次全文扫描」降到 1 次。

### 阶段 4 · 合并 `appendTransaction` 插件（中风险，可选）

12 个插件各自在 `docChanged` 时做全文档 `descendants`。两种做法：

- **保守**：给每个插件加早退——只在「本次 transaction 的变更范围」内判断（`tr.mapping` 能给出变更区间），不再全文扫描；
- **彻底**：合并为单一 `MarkdownAutoConvert` 插件，一次 `descendants` 收集候选节点，再按优先级分派给各规则函数（现有规则函数已独立，改造主要是「共享一次遍历」）。

**风险**：插件之间存在「共享 meta key 防递归」的约定（`appendTransactionSource`），合并时必须保留该语义，否则会出现互相触发死循环。

**建议**：先做保守方案（早退），观察收益后再决定是否合并。

## 4. 明确不建议的方案

| 方案 | 不做的理由 |
| --- | --- |
| **增量序列化**（只序列化变更 block） | Turndown 不支持增量；需自研 block 级 markdown 序列化器，与现有规则（表格/双链/callout/mermaid/脚注）重复实现，维护成本远超收益。阶段 2 的防抖已能拿到 90% 的收益。 |
| **直接 doc → markdown**（跳过 `getHTML`） | 同上：等于重写一套序列化器。且 `htmlSnapshotRef` 的「md↔html」对应关系是回声判定的一部分，改直转要重构该机制。 |
| **用 Web Worker 序列化** | 序列化需要 ProseMirror doc/DOM 访问，跨线程要序列化整个 doc（成本不低于直接做）；且 Turndown 依赖 DOM API。收益不确定、复杂度高。 |
| **降低 `getHTML` 频率但保留每键击 lint** | 顺序错了——阶段 1 是零风险的重复删除，应先做。 |

## 5. 实施顺序与工作量

| 阶段 | 内容 | 风险 | 预估 | 依赖 |
| --- | --- | --- | --- | --- |
| 0 | 埋点测量 | 无 | 0.5h | — |
| 1 | 删重复 lint | 极低 | 0.5h | 0（也可直接做） |
| 2 | 序列化防抖 + 8 flush 点 | 中 | 4-6h | 0 的数据 |
| 3 | extractDivBlock 线性化 | 中 | 2h | 无 |
| 4 | 插件早退/合并 | 中高 | 4h+ | 2 完成后复测 |

**建议节奏**：阶段 1 单独一个 PR（零风险、可立即合并）；阶段 2 一个 PR（含 8 个 flush 点单测）；阶段 3 一个 PR；阶段 4 视阶段 2 复测结果决定是否做。

## 6. 回滚策略

- 阶段 1：单行改动，回滚即恢复同步 lint。
- 阶段 2：`SERIALIZE_DEBOUNCE_MS` 设为 `0` 即退化为「每键击序列化」（`scheduleSerialize` 直接调 `serializeNow`），无需回滚代码。
- 阶段 3：`extractDivBlock` 保留旧实现为 `extractDivBlockLegacy`，用一个常量切换，便于对照。

## 7. 实施记录（2026-11-04）

四个阶段均已落地，与设计的偏差与理由如实记录：

| 项 | 设计 | 实际 | 理由 |
| --- | --- | --- | --- |
| 防抖窗口 | 250ms | **150ms** | 现状 `onChange` 是 300ms 防抖，取 150ms 让「切文件丢字窗口」反而**收窄一半**；连续输入的合并效果不减 |
| `pendingMdRef` | 需要，防回声误判 | **未引入** | 阶段 2 后 `lastEmittedMd` 只在 flush 时更新，父级 value 与它同步延后，`isOwnEcho` 天然命中；实测无需额外兜底 |
| 调度实现 | 写在 `TiptapEditor` 内 | **抽成 `serializeScheduler.ts`** | 「不丢字」必须可单测；纯模块用 fake timers 锁住了防抖合并、8 个 flush 时机、幂等、dispose、外部 clearTimeout 一致性（15 条） |
| flush 点 #1（切文件） | 在 `useTiptapContentSync` 里 flush | **靠 `onBlur` 覆盖 + contentSync 的 clearTimeout 兜底** | 用户点文件树必然先 blur（DOM 事件先于 React state 更新），flush 时 activeFileId 还是旧文件 → 不串文件；程序化切文件（Vault reload 换 id）若在此 flush 反而会把内容写到新文件，故保留 clearTimeout 丢弃挂起（窗口仅 150ms，仍优于原 300ms） |
| flush 点 #4（保存） | 保存入口 | **`handle.openSaveAs` 加 flush** | 另存为弹层读父级 value，不 flush 会导出旧内容 |
| 探针 | dev 打点 | `perfProbe.ts` + `stressAndPerf` 基准档 | 两档实测：序列化占 87.5%（28KB）/ 94.8%（8KB），确认阶段 2 是核心 |
| 阶段 4 | 插件早退 | **核验后确认已具备，未改** | 12 个 `appendTransaction` 插件全部已有 `transactions.some(tr => tr.docChanged)` 早退；彻底合并成单一插件需保留 `appendTransactionSource` 防递归语义、改动 12 处，风险高于阶段 2 之后的剩余收益，按「先保守、观察后再决定」暂缓 |

**新增/改动文件**：`perfProbe.ts`、`serializeScheduler.ts`（新）、`stressAndPerf.test.ts`、`useTiptapLint.ts` + `.test.ts`、`serializeScheduler.test.ts`、`htmlToMd.ts` + `htmlToMd.extractDiv.test.ts`、`TiptapEditor.tsx`。

**验收（2026-11-04）**：全量 vitest **194 文件 / 2258 通过**（0 失败、0 unhandled error）、三处 tsc 全绿、`npm run lint --max-warnings 0` 全绿。新增回归锁：`useTiptapLint.test.ts` 3 条、`serializeScheduler.test.ts` 15 条、`htmlToMd.extractDiv.test.ts` 7 条、`stressAndPerf` 成本剖面 1 条。

**真机复测建议**：`perfProbe` 的 dev 日志（`[tiptap-perf]`）会在开发态每 100 次键击输出 `serializeRate`；阶段 2 后该值应从接近 100% 降到个位数百分比。建议用 200KB 文档连续输入观察输入延迟与 `serializeRate`。
