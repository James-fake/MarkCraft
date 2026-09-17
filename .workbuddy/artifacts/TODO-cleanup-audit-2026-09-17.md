# MarkCraft 待办清单 · 死 CSS 清剿 + 结构审计待决

> 自 `.workbuddy/memory/MEMORY.md` 移出（2026-09-17）。原因：MEMORY.md 定位是「**铁律 only**」，
> 而待办清单属**上下文**而非防回归判据；且 MEMORY.md 体积超限导致注入时被截断（会把后半段铁律一起丢掉）。
> 完整审计结论见 `MarkCraft_源码结构审计报告_2026-09-17.md`。

---
## 死 CSS 清剿与待决
- 已完成（明细见每日日志）：批 1（−868 行／96 类）、批 2 盲区扫描（死类 124≈860 行）、批 2.5-A 孤儿文件（−304 行）、批 2.5-C `kb-ui.css`（632→362 行）。守卫 `deadCssPurge.test.ts`+`pointerGating.test.ts`。
- 🔴 **待决策（独立成题）**：`canvasTheme.ts` 注入选择器 `.tl-container, .canvas-v2-root` **两者皆无 DOM** ⇒ 其独有约 25 个 `--cv-*` **全程未定义**，而 8 个 canvas-v2 文件以**无 fallback** 的 `var(--cv-*)` 消费（`injectCanvasTheme()` **零调用点**）。修法 = 改挂 `:root`，**会改变白板浮层观感**。
- 后续：**2.5-B** `mermaid.css` 35 类／**批 3** `aurora-editor` 23 类旧自绘 DOM（**需先建真机 class 挂载采集器**）／**3.5** `desktop-chrome.css` 死 token／`Input.tsx`+`EmptyState.tsx` 零消费者／`--mc-dur-lazy`／`tiptap-math-inline` 命名错位（定样式但 DOM 只有 `-katex`，**待与作者确认**）／侧栏「小标题栏」层级不统一（36px vs 52px）→ 可选抽 `--mc-panel-head-h`。

## 结构审计待决（详见 `MarkCraft_源码结构审计报告_2026-09-17.md`）
- ✅ **已拍板**：① features 含 159 `.tsx` 承认 **feature-sliced 变体**（已修订铁律④）；② `toolbar` 并入 `features/editor/toolbar/`。
- 待办 4 项：`backupService.ts` 同名分裂（`services/` vs `features/export/`）→ 重命名消歧；`aurora/docs/design/` 20 份 md 混入 `src/`；悬空别名 `@workers`（零引用）；**巨型文件 `features/blog/themes/newThemes.ts` 22752 行**（按主题拆分，最高优先级）。
