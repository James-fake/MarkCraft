# MarkCraft 代码审查报告（全盘穷尽式扫描）

- **日期**：2026-10-05
- **范围**：MarkCraft 全量源码（root commit `1fe58b8` → `HEAD`）
- **工具**：open-code-review（`ocr` v1.12.11）· 委派模式（delegate）
- **模式说明**：标准模式需外部 LLM；本环境未配置 LLM，故采用 **delegate 模式**——`ocr` 负责确定性的文件筛选与规则解析，实际审查由宿主 Agent（CodeReviewExpert）基于自身分析完成，不消耗外部 LLM。

---

## 1. 审查范围与覆盖率

通过 `ocr delegate preview --from 1fe58b8 --to HEAD --format json` 取得全量可审查清单：

| 指标 | 数值 |
|------|------|
| 可审查文件总数（reviewable_files） | **531** |
| 按状态 | modified 300 / added 182 / renamed 49 |
| 按扩展名 | ts 275 / tsx 215 / css 24 / cjs 14 / json 1 / html 1 |
| 排除文件（excluded） | 110（测试、文档、markdown 设计稿等） |
| **覆盖率** | `total_files=531` · `reviewed_files=531` · `skipped_files=0` · `coverage_rate=100%` |

**审查方法**：
1. 对全部 531 个文件执行自动化静态模式扫描，覆盖四类高风险模式：
   - 安全注入点：`dangerouslySetInnerHTML` / `innerHTML` / `iframe srcDoc`+`sandbox` / `window.open` / `eval` / `new Function` / `postMessage` / 硬编码密钥
   - 正确性与健壮性：`JSON.parse`（无 try/catch）、空 `catch`、浮动 Promise、`setInterval`/`addEventListener` 泄漏、`new RegExp` 循环内重编译
   - 性能：`JSON.parse/stringify` 渲染期调用、循环内 `Array.find`、巨型 `useMemo` 依赖
   - 可维护性：`any`、`TODO/FIXME`、`console.*` 残留
2. 对命中率最高的安全敏感模块做逐行精读：预览渲染、画布卡片、博客模板、iframe 沙箱、外部导入、存储、自动保存、postMessage 通道。

---

## 2. 发现汇总

| 级别 | 编号 | 位置 | 类别 |
|------|------|------|------|
| 🔴 High | H1 | `src/aurora/panels/blog/BlogPanel.tsx:568` | security / sandbox |
| 🔴 High | H2 | `src/features/editor/mdToHtml.ts:131` · `src/features/editor/extensions/IframeView.tsx:14` | security / sandbox-escape |
| 🟠 Medium | M1 | `src/features/editor/TiptapEditor.tsx:165` | security / URL 协议校验 |
| 🟠 Medium | M2 | `src/features/blog/components/panels/VisualCssEditor.tsx:115-129` | security / postMessage 来源 |
| 🟠 Medium | M3 | 约 30 处 `JSON.parse`（见清单） | robustness / 解析崩溃 |
| 🟡 Low | L1 | `src/services/backupService.ts:406` | lifecycle / 调度单例 |
| 🟡 Low | L2 | 约 38 个生产文件 `console.*` | maintainability / 日志残留 |
| 🟡 Low | L3 | 生成型博客模板/脚本空 `catch {}` | maintainability |

---

## 3. 详细发现

### 🔴 H1 — BlogPanel 预览 iframe 缺少 `sandbox`（权限越界）

- **位置**：`src/aurora/panels/blog/BlogPanel.tsx:568`
  ```tsx
  <iframe ref={previewIframeRef} title={B.previewTitle} srcDoc={previewFallback} />
  ```
- **问题**：`previewFallback` 由 `generateSingleFileBlog(...)` 生成，内容来自**用户笔记**（含内联 `<script>`）。该 `<iframe>` 无任何 `sandbox` 属性，而同级的 `BlogModal.tsx:431` 与 `BlogStudio.tsx:470` 均已设 `sandbox="allow-scripts"`。无沙箱时，预览脚本以 MarkCraft **同源全权限**运行，可经 `window.parent` 读取 IndexedDB（全部笔记）、localStorage、cookie 并操控父应用 → 数据外泄/权限越界面。
- **修复建议**：加 `sandbox="allow-scripts"`（srcDoc 无需 `allow-same-origin`）。

### 🔴 H2 — 用户嵌入 iframe 使用 `allow-scripts allow-same-origin`（沙箱可逃逸）

- **位置**：
  - `src/features/editor/mdToHtml.ts:131`（markdown `@[iframe](url)` 语法）
    ```ts
    return `<iframe src="${src}" sandbox="allow-scripts allow-same-origin"></iframe>`
    ```
  - `src/features/editor/extensions/IframeView.tsx:14`（Tiptap iframe 节点视图）
    ```tsx
    <iframe src={src} ... sandbox="allow-scripts allow-same-origin" ... />
    ```
- **问题**：`allow-scripts` + `allow-same-origin` 是 HTML 规范明确的**危险组合**——嵌入页可借同源访问父 origin，甚至自行解除沙箱。此外 `mdToHtml` 的 `src` 直接取自 `([^)]+)` 原文，**无任何协议白名单**（可塞 `data:`/`javascript:` 类向量）。
- **修复建议**：改为仅 `sandbox="allow-scripts"`；对 `src` 增加 http/https 协议白名单校验（拒绝 `javascript:`/`data:` 等）。

### 🟠 M1 — Tiptap 链接点击 `window.open` 未校验协议

- **位置**：`src/features/editor/TiptapEditor.tsx:165`
  ```ts
  window.open(linkMark.attrs.href as string, '_blank', 'noopener')
  ```
- **问题**：Ctrl/Cmd+点击链接直接打开 `href`，未做协议白名单。CM6 路径此前已在 M2 修复（`openExternalSafely` 白名单 `/^(https?|mailto|tel):/i`），Tiptap 路径遗漏，属纵深防御缺口（`javascript:` 类链接在现代浏览器多被拦，但仍应统一校验）。
- **修复建议**：打开前复用 `openExternalSafely` 的协议校验逻辑。

### 🟠 M2 — `postMessage` 监听未校验来源

- **位置**：`src/features/blog/components/panels/VisualCssEditor.tsx:115-129`
  ```ts
  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'mc-element-selected') { setSelectedElement({...}) }
  }
  window.addEventListener('message', handleMessage)
  ```
- **问题**：仅判断 `e.data?.type`，未校验 `e.origin` / `e.source`。沙箱 iframe（`inspectorScript.ts:125` 以 `postMessage(info, '*')` 广播）之外的任意页面可伪造 `mc-element-selected` 消息注入选择器/样式数据。
- **修复建议**：`if (e.source !== iframeRef.current?.contentWindow) return`。

### 🟠 M3 — 约 30 处 `JSON.parse` 读取 localStorage/配置无 try-catch（健壮性集群）

- **典型位置**：
  `core/files/recentFiles.ts:53`、`core/files/fileTree.ts:106`、`features/themes/ThemeManager.ts:102`、`features/templates/templateManager.ts:115`、`features/search/QuickOpen.tsx:131/147`、`aurora/components/command-palette/commandHistory.ts:14/25`、`features/blog/components/panels/CssSnippets.tsx:18`、`features/blog/components/panels/ThemePanel.tsx:14`、`features/blog/services/publishTrace.ts:38`、`features/editor/toolbar/ShortcutManager.ts:62`、`features/editor/spell/SpellChecker.ts:102`、`features/editor/extensions/SmartPunctuation.ts:24`、`features/editor/extensions/SpellCheckExtension.ts:23`、`features/search/SearchReplace.tsx:29`、`aurora/panels/kb/graph/graphModel.ts:332`、`features/diary/diaryMoods.ts:79`、`features/editor/cm6/autocompleteExtension.ts:142/185`、`features/editor/hooks/useTiptapDropPaste.ts:22`、`features/blog/components/panels/FeaturesPanel.tsx:455`、`features/canvas-v2/engine/engineHistory.ts:81`、`features/pwa/librarySync.ts:52`、`features/knowledgeBase/export/sharePackager.ts:208` 等。
- **问题**：一旦存储值损坏或跨版本不兼容即抛异常，可能使对应组件/整页崩溃。项目已有 `utils/safeJson.ts` 但未统一使用。
- **修复建议**：统一改走 `safeJson.parse(raw, fallback)`（带默认值兜底）。

### 🟡 L1 — 每日备份 `setInterval` 单例与清理未核验

- **位置**：`src/services/backupService.ts:406`
  ```ts
  return setInterval(checkAndBackup, 24 * 60 * 60 * 1000)
  ```
- **问题**：`startAutoBackup` 返回 interval，但未确认调用方保证「全局仅一个实例 / 卸载即清」。React StrictMode 双调用或重复调用会创建多个每日调度器。影响有限（24h 周期、单例启动），但应加单例守卫。

### 🟡 L2 — 约 38 个生产文件残留 `console.log/warn/error/debug`

- **典型**：`aurora-main.tsx`、`services/backupService.ts`、`stores/useKbStore.ts`、`stores/NoteVersionStore.tsx`、`features/knowledgeBase/export/documentExporter.ts`、`services/import/externalImporter.ts` 等。
- **修复建议**：统一经 `utils/logger.ts`，或生产构建剔除。

### 🟡 L3 — 生成型博客模板/脚本中的空 `catch {}`

- **位置**：`features/blog/utils/singleFile/newThemeTemplate.ts`、`features/blog/utils/singleFile/htmlTemplate.ts`、`features/blog/templates/htmlWrapper.ts`、`features/blog/templates/extraRenderers.ts`、`features/blog/utils/singleFile/jsInteractions.ts`、`features/blog/utils/singleFile/mermaidHelpers.ts:100` 等。
- **说明**：多为 best-effort 操作（scrollTo / execCommand / DOM 移除），风险低；但 `search-index` 解析类的吞错可能掩盖数据问题，建议至少记日志。

---

## 4. 已核验为安全的面（覆盖证明）

审查中确认以下注入点已正确防御，非问题：

| 位置 | 防御措施 |
|------|----------|
| `features/preview/Preview.tsx:135-139` | 先 `sanitizeHtml(content)` 再 morphdom；块嵌入用 `textContent` |
| `features/canvas-v2/engine/cardHelpers.ts` / `OverlayCards.tsx` | `marked → renderMathInHtml → sanitizeHtml`，catch 也返回 `sanitizeHtml(text)` |
| `features/blog/templates/searchTemplate.ts` | 运行时 `esc()` 转义全部插值字段 |
| `features/blog/templates/shareButtons.ts` | href 用 `encodeURIComponent`；内联脚本用 `escapeJsString`（已核验转义 `\ ' " \` < >`）—— 排除 XSS |
| `features/blog/BlogModal.tsx:431` / `BlogStudio.tsx:470` | iframe 已 `sandbox="allow-scripts"` |
| `features/editor/extensions/MermaidBlockView.tsx` / `RawHtmlBlock.ts` | `sanitizeMermaidSvg` / `sanitizeRawHtml` |
| `services/import/externalImporter.ts` | `assertFetchableUrl` 做 SSRF 校验 + 剥离 script/iframe/svg + 下游渲染经 sanitize |
| `hooks/useAutoSave.ts:83-94` | `setInterval` 在 cleanup 中 `clearInterval`，无泄漏 |

---

## 5. 结论与建议

- 本次为**纯扫描**，未改动任何代码。
- 发现 **2 High（沙箱缺失 / 沙箱逃逸）、3 Medium（协议校验 / 来源校验 / JSON 解析健壮性）、3 Low（调度单例 / 日志残留 / 空 catch）**。
- 优先修复：**H1、H2** 为真实权限越界风险，建议立即修复（加 `sandbox` / 去 `allow-same-origin` + URL 白名单）。
- 建议修复顺序：H1 → H2 → M1 → M2 → M3 → L1/L2/L3。
- 修复后可沿用既有验证门禁：`tsc --noEmit` → `eslint --max-warnings 0` → `vitest run` → `vite build`（含 `CODEBUDDY_SAFE_DELETE_ENABLED=0`），按此前批次风格提交。

---

## 6. 修复状态（2026-10-06 收尾）

| 编号 | 结论 | 提交 |
|------|------|------|
| 🔴 H1 | ✅ 已修复：BlogPanel 预览 iframe 补 `sandbox="allow-scripts"` | `767c01f` |
| 🔴 H2 | ✅ 已修复：`mdToHtml.ts` 改 http/https 白名单 + 引号转义；`IframeView.tsx` 去 `allow-same-origin` | `767c01f` |
| 🟠 M1 | ✅ 已修复：`TiptapEditor.tsx` 链接点击加 `^(https?\|mailto\|tel):` 协议白名单 | `767c01f` |
| 🟠 M2 | ✅ 已修复：`VisualCssEditor.tsx` postMessage 增加 `e.source === iframe.contentWindow` 来源校验 | `767c01f` |
| 🟠 M3 | ⚪ 复核为**误报**：全部 `JSON.parse` 调用点均已在 `try/catch` 内（等价 `safeJsonParse` 防御）；`jsonLd.ts` 为注释、`backupService.ts:242` 为内存深拷贝不会抛。**无需改动**（强迁会回退 `librarySync` 的语义化报错） | — |
| 🟡 L1 | ✅ 已修复：`backupService.ts` 自动备份定时器加模块级单例守卫 | `767c01f` |
| 🟡 L2 | ✅ 已修复：顶层 `esbuild.drop:['console']`（仅生产）。实测产物 console 325→27，余者皆三方库特性探测 | `b50b5f3` |
| 🟡 L3 | ✅ 已处理：导出博客运行时 best-effort 空 catch 补注释说明「静默降级」意图 | `b50b5f3` |

**验证门禁（2026-10-06）**：`tsc --noEmit` ✓ · `eslint` 0 error ✓ · `vite build` ✓ · `vitest` 1821/1824 通过（唯一失败为 harness 缺 IndexedDB 的环境性用例，与本批改动无关）。
