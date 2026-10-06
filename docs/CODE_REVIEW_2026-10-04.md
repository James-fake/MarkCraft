# MarkCraft 代码审查报告

- **日期**：2026-10-04
- **工具**：OpenCodeReview（`ocr` v1.12.11，**delegate 委派模式**）
- **审查范围**：全项目非测试源码（`src/**/*.ts(x)`，排除 `*.test.*` 与 `src/locales/**` 数据）
- **覆盖率**：**689 / 689 个可审查源文件（100%）**，分 10 个批次并行审查
- **方式说明**：本机未配置 LLM endpoint（`ocr review` 标准模式不可用），故采用 OCR 的 **delegate 委派模式**——OCR 负责确定性的文件筛选与规则解析，逐行审查由宿主 Agent 完成。所有 **Critical/High** 结论均已人工回读源码核对，关键项以可运行复现验证。

> 严重度：**Critical** 必修（崩溃/数据丢失/安全）｜**High** 应修｜**Medium** 建议修。

---

## 一、Critical（必须修复）

### C1. WYSIWYG 编辑内容会被回滚 + 自动保存被丢弃 —— 数据丢失
`src/features/editor/hooks/useTiptapContentSync.ts:33-36, 87`

effect 每次运行都无条件清掉挂起的防抖 `onChange`，随后 `value !== lastEmittedMd.current` 时执行 `setContent(markdownToHtml(value))`；而 effect 依赖里含 `undoRedo`——`UndoRedoProvider` 的 `contextValue` 每次渲染都是**新对象字面量**（`UndoRedoStore.tsx:94`），且 `pushHistory` 每次都 `notify()`（`undoRedoManager.ts:101`）→ 触发 50ms 后的 `forceRender`（`:22-27`）。因此**每敲一个字**：

1. `onUpdate` 设 `lastEmittedMd = V1`、调度 300ms 后的 `onChange(V1)`、`pushHistory`；
2. 50ms 后 provider 重渲染 → `undoRedo` 身份变化 → 本 effect 重跑；
3. effect 第 33-36 行**清掉**了刚调度的 `onChange(V1)`（自动保存丢失）；
4. `value`（父级仍是旧值 V0）≠ `lastEmittedMd`(V1) → 第 81 行 `setContent(V0)` **把编辑器内容回滚**。

**已用单元复现验证**：以「value 陈旧 + undoRedo 换身份」重现，`setContent` 被再次调用（回滚），`debounceTimerRef.current` 变 `null`（`onChange` 被丢弃）。

**修复**：把 `clearTimeout` 移入 `if (fileIdChanged)` 分支内（仅切文件时清）；并将 `undoRedo` 从依赖数组移除、改用 ref 读取，避免无关 store 渲染重跑本 effect。

---

### C2. KaTeX `trust: true` → 预览态存储型 XSS
`src/utils/mathRenderer.ts:34`

`DEFAULT_OPTIONS.trust = true` 允许 KaTeX 输出任意协议链接。笔记中 `$\href{javascript:alert(1)}{x}$` 会渲染出可点击的 `javascript:` 链接；`trust:true` 同时放开 `\includegraphics`（远程图片/追踪）与 `\htmlData`。且 `useMarkdownRenderer.ts:106-107` 是 `renderedHtml = mathHtml ?? baseHtml`——KaTeX 输出**替换**了已净化的 HTML 且**不再二次净化**，故绕过 DOMPurify。

**修复**：`trust: false`（或传 `trust` 回调，仅放行 `http/https/mailto`）；必要时对 KaTeX 结果再跑一次 `sanitizeHtml`。

---

### C3. 自定义 CSS 可逃逸 `<style>` → XSS
`src/features/blog/utils/cssSanitizer.ts:15-40`（使用点：`htmlTemplate.ts:344-345`、`newThemeTemplate.ts:524-525`、`htmlWrapper.ts:151-152`）

`sanitizeCssFast` 只替换 7 个旧式向量（`expression()`/`javascript:` 等），**不处理 `</style>`、`</script>`、`<`**。自定义 CSS 以 `${sanitizeCssFast(customCss)}` 原样插进 `<style>…</style>`，故 `x{}</style><script>alert(1)</script><style>` 直接逃逸并在预览/发布页执行。

**修复**：在 `DANGEROUS_PATTERNS` 增加 `</style`/`</script`，或对 CSS 先做 `<` 转义/剥离；`CssPanel` 现有的“仅提示”应升级为拦截。

---

### C4. 博客预览 iframe 沙箱组合使注入直达应用源
`src/features/blog/BlogStudio.tsx:462-470`

`<iframe srcDoc={previewHtml} sandbox="allow-scripts allow-same-origin">`：`srcdoc` 继承应用源，`allow-scripts + allow-same-origin` 同时给 → 生成 HTML 里的任意脚本可访问 `parent`/`localStorage`。C2/C3/C5 等注入点在此升级为**应用源 XSS**。

**修复**：去掉 `allow-same-origin`（仅保留 `allow-scripts`），改用 `postMessage` 与预览通信（检查器已如此）。

---

### C5. JSON-LD 未转义 → `</script>` 逃逸
`src/features/blog/utils/singleFile/htmlTemplate.ts:314,332`（及 `newThemeTemplate.ts:234,252,907,925`、`templates/seoUtils.ts:74,83`）

`<script type="application/ld+json">${JSON.stringify(schema)}</script>`：`JSON.stringify` **不转义 `<`**。标题 `</script><script>alert(1)</script>` 会提前闭合脚本块并注入。

**修复**：序列化后 `.replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')`，或改用 `<script type="application/json">` + `textContent`。

---

### C6. 部署 Token 明文存 `localStorage`
`src/features/blog/components/DeployPanel.tsx:48,69`

`localStorage.getItem('deploy_token')` / `setItem('deploy_token', token)` 明文持久化 GitHub/Gitee/Vercel/Cloudflare/Netlify 的 PAT；叠加 C4 的同源 XSS，注入脚本可直接读取并外泄。

**修复**：Token 仅驻内存（或系统钥匙串），不落 `localStorage`。

---

### C7. 导出 `.mcshare` / 静态站：同名文件互相覆盖（静默丢文件）
`src/features/knowledgeBase/export/sharePackager.ts:97-98,109-110`

`const safeName = file.name.split(/[\\/]/).pop()` 后直接 `filesFolder.file(safeName, content)`，**无重名去重**。`a/README.md` 与 `b/README.md` 在 zip 内同名 → JSZip 后者覆盖前者，导出即丢文件（画布同理）。

**修复**：维护 used-name 集合追加后缀，或保留相对路径作为 zip 内路径。

---

### C8. 静态站导出：Markdown 链接 URL 未转义 → 属性逃逸 XSS
`src/features/knowledgeBase/export/staticSiteExporter.ts:12-23`

`escapeHtml` 只转义 `& < >`（不转义引号），随后 `result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')` 把未转义的 URL 填入 `href`。笔记内容含 `[x](a" onmouseover="alert(1))` 或 `javascript:` 时属性逃逸/脚本链接；导入他人 `.mcshare` 再导出即为存储型 XSS。

**修复**：对 URL 单独转义（含引号）并仅允许 `http(s):`/相对路径。

---

## 二、High（应修复）

### H1. 编辑器：原始 HTML 块与媒体嵌入在重新加载后内容丢失
- `src/features/editor/extensions/RawHtmlBlock.ts:20` —— `html` 属性无 `parseHTML`/`renderHTML`，而序列化端用 `data-html="…"`（`mdToHtml.ts:147`）。`<details>` 等包裹的原始 HTML 块解析为 `attrs.html === ''`，加载/保存即丢内容。
- `src/features/editor/extensions/MediaEmbed.ts:29` —— `src/type` 从包裹 `div[data-media-embed]` 默认解析，但 `src` 在子 `<video>/<audio>`、类型在 `data-media-type`。`![audio](x)` 重载为 `<video src="null">`。

**修复**：补显式 `parseHTML`/`renderHTML`，从正确来源读写属性。

### H2. `htmlToMd`：表格/任务列表单元格内联格式在保存时被抹平
`src/features/editor/htmlToMd.ts:384-412`（表格）、`:150-155`（任务列表）

用 `child.textContent` / `divEl.textContent` 重建单元格，丢弃 `content`（已转换的内联 markdown）→ 粗体/斜体/链接/行内代码在 HTML→MD 往返中丢失。

**修复**：改用 Turndown 传入的 `content`。

### H3. 画布卡片渲染的净化旁路
`src/features/canvas-v2/engine/cardHelpers.ts:43-44`

`catch { return text }` 在 `marked`/`sanitizeHtml` 抛错时返回**未净化**原文，调用方 `OverlayCards.tsx:240` 直接 `dangerouslySetInnerHTML`。

**修复**：catch 分支返回 `sanitizeHtml(text)` 或空串。

### H4. 备份导出：跨目录同名被误改名 + manifest 名不一致
`src/features/export/backupService.ts:184-191,247`

`usedNames` 是**跨目录共享**的单一 Set，不同目录下本不冲突的 `README.md` 也会被改成 `README-2.md`；且 manifest 用原始名（`resolveRelativePath`），与实际落盘名不符，破坏导出回环。

**修复**：以「所在目录」为作用域去重，manifest 使用最终落盘名。

### H5. `SettingsStore` 的“一次性”编辑器模式迁移并非一次性
`src/stores/SettingsStore.tsx:127-130`

每次加载都把持久化的 `editorMode === 'source'` 无条件改回 `'wysiwyg'` 并回写，**无迁移标记**。用户主动选择源码模式会在下次启动被静默还原，与注释“不再覆盖”矛盾。

**修复**：加持久化迁移标志，首次转换后置位，之后不再改动 `editorMode`。

### H6. `LinkIndexStore` 就地改共享状态对象
`src/stores/LinkIndexStore.tsx:121,132,158,180`

`new Map(prev)` 仅浅拷贝（entry 对象与旧 state 共享），随后就地改 `targetEntry.backlinks` 等。违反 React 不可变约定；StrictMode 下 updater 跑两次 → 反链/未链接提及被**重复追加**；且未变身份的 entry 不触发依赖引用相等的消费者重渲染。

**修复**：改前克隆 entry（`newIndex.set(id, { ...entry, backlinks: [...] })`）。

### H7. 画布面板：effect 依赖 hook 返回的新对象 → 自激 IDB 扫描循环
`src/aurora/panels/canvas/CanvasPanel.tsx:165`

`useKbStore()` 每次渲染返回**新对象**，却被放进 effect 依赖（`[doc?.id, kbStore]`）。画布属于某 KB 时：effect → `setOwningKb(新对象)` → 重渲染 → 依赖变化 → effect 再跑 → 再次 `loadKb` 全部 KB。**自持的 IDB 扫描 + 渲染循环**。

**修复**：依赖稳定回调（如 `const { getKbsContainingCanvas } = useKbStore()`），而非整个 hook 对象。

### H8. 画布自动保存：防抖未 flush 即被清理 → 丢编辑
`src/aurora/panels/canvas/CanvasPanel.tsx:329`

800ms 防抖的 cleanup 只 `clearTimeout` **不 flush**：切画布/卸载在 800ms 内会静默丢弃最后一次编辑；且回调闭包序列化的是旧 `engine` 而读 `docRef.current`，跨文档时会把旧场景写进新文档。

**修复**：cleanup 用调度时捕获的 `engine`/`doc` 立即 flush；或切文档前阻塞至 flush 完成。

### H9. 事件监听 add/remove 引用不匹配 → 泄漏
- `src/aurora/panels/editor/FileTree.tsx:275-281` —— 注册用匿名箭头、移除用**另一个**新函数 → 移除无效；每次右键菜单打开累积 2 个全局 listener。
- `src/features/editor/toolbar/WysiwygToolbar.tsx:116-125` —— `editor.on('transaction', 匿名箭头)` 却 `editor.off('transaction', handler)`（handler 只注册给 `selectionUpdate`）→ transaction 回调永不移除，卸载后仍 `setEditorTick`。

**修复**：把处理函数提为具名 const，add/remove 传同一引用。

### H10. 博客模板多处注入（HTML/CSS/JS 上下文混用转义）
- `templates/searchTemplate.ts:38-44` —— 客户端搜索用 `innerHTML` 拼接 `search-index.json` 字段（title/description/slug）**未转义**；同项目 `indexTemplate.ts:35`、`tagsTemplate.ts:29` 有转义。标题含 `<img src=x onerror=…>` 即执行。
- `templates/postTemplate.ts:47,50,112,136` —— `post.slug` 原样进引号属性/href（slug 取自 frontmatter 未 slugify）。
- `templates/seriesTemplate.ts:46,118` —— `background-image: url(${escapeHtml(coverImage)})` 在 **CSS 上下文**用 HTML 转义，浏览器先 HTML 解码再解析 CSS，`escapeHtml` 不挡 `)`/`;`/`\` → CSS 注入。
- `templates/shareButtons.ts:24,27` —— `rawUrl` 拼进内联 JS 字符串 `writeText('${rawUrl}')`，含 `'` 即闭合字面量。
- `templates/postTemplate.ts:67-68` —— 打赏二维码 `src="${reward.wechatQrcode}"` 未转义。
- `templates/styleBuilder/themeColors.ts:32-33` —— `customColor` 未校验即入 `--accent`（`customCss` 有净化，`customColor` 没有）→ CSS 注入。
- `themes/custom.ts:145-171` —— `getCustomIndexHtml` 全字段不转义（当前无引用，属**潜在**，一旦接线即成 XSS）。

**修复**：统一到一套转义工具（`escapeHtml`/`escapeAttr`/`escapeCss`/`escapeJsString`）；URL 走协议白名单；`customColor` 校验 `/^#([0-9a-f]{3}|[0-9a-f]{6})$/i`。

### H11. Mermaid `securityLevel:'loose'` + `innerHTML`
`src/features/blog/utils/singleFile/mermaidHelpers.ts:66,91`、`src/features/editor/extensions/mermaidCache.ts:41,53`、`MermaidBlockView.tsx:105,128`

Loose 模式允许标签内嵌 HTML/事件处理器，渲染结果直接 `innerHTML = svg`；博客侧 mermaid 代码块在 `marked`/DOMPurify **之前**被提取，故不进净化。恶意 ```mermaid 块可执行。

**修复**：`securityLevel:'strict'`，并对 SVG 结果跑 DOMPurify。

### H12. `BlogModal` 以 `blob:` 打开生成 HTML（无沙箱）
`src/features/blog/BlogModal.tsx:207-210`

`window.open(blob:url)` 的 blob 继承创建者源、且此路径无沙箱 → C3/C5 注入以完整应用源权限执行。

**修复**：不直接打开未沙箱的生成 HTML；先修根因注入点。

### H13. 外部导入无协议/主机校验（SSRF/本地探测）
`src/services/import/externalImporter.ts:196`

`fetch(url, { credentials:'omit' })` 对用户传入 URL 无校验，可指向 `file:`/内网地址。

**修复**：仅放行 `http:`/`https:`，拦截私有网段与非法协议。

---

## 三、Medium（建议修复，择要）

**正确性 / 数据**
- `src/hooks/useMathRender.ts:16-20` —— `prevRef` 初始化为初始 `baseHtml`，首挂载即命中 `===` 早返回，**首屏 KaTeX 不渲染**（恢复标签页时公式显示原始 `katex-*` 标记）。改为哨兵初值。
- `src/core/storage/imageStore.ts:92` —— `textToStorage` 回退丢 `image:` 前缀，输出非法相对路径 `img_3`；图片被清理后再保存即**永久丢引用**。
- `src/features/editor/FrontMatterPanel.tsx:100-119` —— Apply 仅回写面板 13 个字段，文件里其它自定义 YAML 键被**静默删除**。
- `src/features/editor/hooks/useTiptapDropPaste.ts:55` —— 正则带 `m` 标志，多行剪贴板只要含一行纯 `[[Note]]` 即拦截，丢弃其余文本。
- `src/features/blog/utils/cssMinifier.ts:24-42` —— 正则压缩未跳过字符串/`url()`，`content:"a: b"`、`url(data:…base64,…)` 会被改坏，导出 CSS 静默损坏。
- `src/features/migrate/MigrateWizard.tsx:112,119-121` —— 单文件写入 `try{}catch{}` 吞错，只报成功数；`createFolder('root', file.name)` 无重名/非法字符处理。
- `src/features/export/utils/exportHtml.ts:92` —— `DOMPurify.sanitize(..., { ADD_TAGS:['style'] })` 显式放行 `<style>`，笔记内嵌 CSS（`position:fixed` 覆盖层、外链追踪）进入导出 HTML。
- `src/features/appRuntime/useAppLogic.ts:73-79` —— 卸载清理用 `lastSavedContentRef`（仅在 `!isDirty` 更新）建 'save' 版本，版本快照可能滞后于真实内容。
- `src/aurora/panels/diary/DiaryPanel.tsx:226` —— `writeDiary` 吞错：`createFile` 返回 `null` 时仍 `setStatus('saved')`，UI 显示“已保存”但未落盘。
- `src/aurora/panels/canvas/PropsTab.tsx:52` —— 受控输入 `value={s.text.replace(/ {2,}/g,' ')}` 却回写 `e.target.value`，连续空格被静默改写。
- `src/features/blog/templates/seriesTemplate.ts:94` —— `post.seriesOrder <= (post.seriesOrder || 0)` 自比恒真，每篇系列文都显示“已读”。

**性能**
- `src/stores/kbStore.ts:391` —— 规则匹配分支对**每个文件** `getNodePath` 全树 DFS → O(n²)，`getKbFiles` 在渲染期被调用。
- `src/aurora/panels/kb/graph/useGraphDerived.ts:161-183` —— `focusGroup` 分支 `nodesRef.find` 逐节点 → O(N²)，力导向每帧重渲染。
- `src/features/knowledgeBase/ai/kbChat.ts:96-97` —— 每文件每段**串行** `await ai.embed`，无缓存/批处理。
- `src/features/search/useGlobalSearch.ts:342,415,417,482,485` —— 逐行循环内 `new RegExp(...)` 重复编译。
- `src/features/blog/hooks/useBlogGenerator.ts:538-542`、`components/RightPanel.tsx:379` —— 每次渲染对全部文件 `new Blob([content]).size`。
- `src/aurora/panels/blog/BlogPanel.tsx:220` —— `previewFallback` 在渲染路径同步 `generateSingleFileBlog` 全部文档，每次改站点标题/描述即全量重生成。
- `src/aurora/panels/diary/DiaryPanel.tsx:117` —— 每次按键触发全文件树递归 + 逐文件 `countWords/extractTags`。
- `src/features/editor/extensions/MarkdownInlineInputRules.ts:228` 等 —— 每个 `appendTransaction` 全文档遍历（~10 次全量 pass/键），`rainbowBrackets.ts:27-65` 逐括号从 0 重扫 → O(n²)。

**资源 / 生命周期**
- `src/components/ui/ToastProvider.tsx:92,139` —— `timers` 卸载不清；`requestExit` 覆盖前不 clear。
- `src/components/ui/Modal.tsx:97` —— body 滚动锁无引用计数，叠加弹窗先关内层会解锁仍开着的模态。
- `src/components/ui/ScrollButtons.tsx:66` + `utils/smoothScroll.ts:38` —— 定时器/rAF 无取消，卸载后仍写 `scrollTop`。
- `src/aurora/panels/kb/graph/graphExport.ts:81,107` —— `URL.createObjectURL` 从不 `revoke`。
- `src/aurora/panels/editor/RightSidebar.tsx:120-139` —— 拖拽中卸载则 window 监听泄漏。
- `src/features/editor/extensions/TransitionExtension.ts:48-85` —— `decorations()` 里做副作用 + 定时器累积。
- `src/features/editor/extensions/MermaidBlockView.tsx:141` —— 在 `setTimeout` 回调里 `return () => {cancelled=true}`，返回值被丢弃，取消逻辑为死代码。

**逻辑 / 一致性**
- `src/features/editor/cm6/lintExtension.ts:19,21` 与 `extensions/LintExtension.ts:33` —— `LintIssue.line` 为 0-based，但 `>=1` 过滤丢掉首行、`doc.line(issue.line)`/`lineIndex = issue.line - 1` 整体错位一行（`useCM6State.ts:265` 用 `+1` 正确，两处不一致）。
- `src/features/editor/draftBlindSpot.ts:40,78` —— 模块级 `/g` 正则 `.test()` 的 `lastIndex` 跨调用残留，结果不稳定。
- `src/features/editor/cm6/useCM6UndoRedo.ts:7-8` —— `undo/redoCallbackRef` 为**模块级单例**（注释称实例级），多编辑器时串扰。
- `src/features/editor/TableBubbleMenu.tsx:27` —— `querySelector('table')` 恒取首个表格，多表时定位错误。
- `src/features/editor/cm6/useCM6State.ts:330,340` —— Cmd+Click 链接 `window.open(url)` 无协议校验。
- `src/aurora/panels/canvas/CanvasInspectorPanel.tsx:86`、`CanvasSidebarPanel.tsx:105` —— 形状签名缺 `x/y/w/h/rotation/parentId` 等，拖拽/缩放/旋转后检查器与缩略图不刷新。
- `src/aurora/panels/canvas/CanvasPanel.tsx:135` —— 依赖 `[canvasId, CP]`，切语言会重跑 loader 并覆盖当前画布。
- `src/aurora/app/useAuroraShell.ts:55-63` —— popstate 不重置 `auxView`，welcome/settings 下浏览器后退“失灵”。
- `src/aurora/app/auroraActions.ts:71-74` —— `tools.openBlockBacklinks` 不 `nav('editor')`，非编辑视图下静默无效。
- `src/aurora/app/AuroraShell.tsx:301-310` —— 命令注册 effect 依赖 `toast` 对象（每次 provider 渲染新身份）→ 每次 toast 触发全量重注册 + 面板重渲染。
- `src/aurora/panels/editor/FileTree.tsx:124-139` —— “自动展开全部文件夹”依赖 `[rootFolder]`（每次写入新对象）→ 打字时把用户手动折叠的文件夹重新展开。
- `src/aurora/panels/editor/FileTree.tsx:196-204` —— 重名检测恒查根级 children，深层重名漏判/误判。
- `src/aurora/panels/aurora-nav.ts:109,126` —— 侧栏角标为写死假数字（`editor:256`、`diary:365`、`canvas:12`）。
- `src/features/blog/services/vercelAdapter.ts:96-112` —— 轮询 30×2s 未就绪仍报“部署成功”；`checkRes.ok` 未校验。
- `src/features/blog/services/netlifyAdapter.ts:57,69` —— FormData 字段名非 Netlify 规范；返回 URL 硬编码、忽略 API 响应。
- `src/features/blog/services/*.ts` —— 所有网络调用无超时/`AbortController`/重试，挂起即无限转圈。
- `src/features/blog/services/giteeAdapter.ts:22` —— token 放 URL `?access_token=`，泄漏进历史/referrer/日志。
- `src/components/ui/ConfirmProvider.tsx:38` —— 并发 `confirm()` 覆盖 resolver，先前的 Promise 永不 settle（挂起）。
- `src/stores/useFileTreeActions.ts:36-39` —— 在 `setState` updater 内 `setTimeout` 调度副作用（非纯），StrictMode 下重复调度。

**i18n**
- `src/aurora/app/auroraActions.ts:58,82`、`components/command-palette/CommandPalette.tsx:326` —— 新建文件恒名 `未命名-…`、新建文件夹恒名 `新文件夹`、命令面板底部恒显 `${n} 个结果`，英文界面下仍出中文。

---

## 四、已核对为非问题（避免重复报）

- `services/sanitizeHtml.ts:44` 允许 `iframe`+`srcdoc`：DOMPurify 3.4.8 实测会剥离 srcdoc 内 `<script>`、移除 `on*`，**不可利用**。
- `mdToHtml.ts` 的 `alt`/`src` 插值、各 `dangerouslySetInnerHTML`：主链路均经 `renderMarkdown`（marked + DOMPurify）净化。
- `services/fileService.ts` 同步 `loadState`(localStorage) + 异步 `loadStateAsync`(IDB)：为有意的两段式水合，非丢数据。
- `aurora-main.tsx` 的 `innerHTML` 写入为静态串或已做 `<>&` 转义。
- 大量 `escapeHtml`/`escapeAttr` 的**博客主题**索引生成器（academia/aurora/bento 等）转义正确；48 个 `generators/*` 仅插值硬编码颜色，无注入面。
- `DeleteKbModal` 递归删除 KB 文件夹：确认文案已明确警示。
- 未发现 `eval`/`Function` 构造、原型污染、`innerHTML` 明文注入（除上述已列项）。

---

## 五、建议处理顺序

1. **立即**：C1（编辑器回滚/丢保存，影响核心体验与数据）、C2（数学 XSS）。
2. **发布前**：C3–C8（博客/导出注入链 + token 落盘 + 导出丢文件）、H1–H3、H5–H8。
3. **随后**：H4、H9–H13 与 Medium 中的性能/泄漏项。
4. **工程债**：统一转义工具（`escapeHtml/escapeAttr/escapeCss/escapeJsString`）、统一 `line` 0/1-based 约定、`UndoRedoProvider` 的 `contextValue` 加 `useMemo`（可同时缓解 C1 类问题）。

> 说明：C1 已用一次性单元复现确认（复现脚本为临时文件，已删除）；其余 Critical/High 均回读源码核对。
