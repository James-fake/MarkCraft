# MarkCraft · 打开文件与导入优化 实施方案

- **日期**：2026-10-07
- **状态**：设计稿（待评审 → 实施）
- **范围**：`打开文件` 交互精简、拖拽导入格式统一、导入内容保真、图片存储与桌面化
- **不改动**：文件存储模型（仍为 Markdown-first）、现有编辑器双内核

---

## 0. 背景与目标

当前"打开文件"与"拖拽打开"存在三处体验/能力问题：

1. **交互冗余**：点「打开文件」先弹一个中间弹窗，弹窗里还要再点一次「点击选择文件」才调起系统文件框。
2. **能力不一致**：「打开文件」支持 `.md/.markdown/.txt/.docx/.html/.htm`，但**拖拽**只支持 `.md/.markdown/.txt`。
3. **保真不足**：导入 docx/html 后与原稿差异大——**表格会丢**、图片处理不统一、列表/标题层级不完整。

**目标**：让"打开"与"拖拽"共用同一条导入管线，一步直达系统文件框，导入内容尽可能还原原稿，且图片存储方式对未来桌面化友好。

---

## 1. 需求分解与已确认决策

| 编号 | 需求 | 用户已确认的决策 |
|------|------|------------------|
| **A** | 删除"打开文件"的中间弹窗 | 点击后**直接**调起系统文件选择框 |
| **B** | 拖拽支持格式与"打开文件"统一 | 拖拽也支持 `.docx/.html/.htm` |
| **C** | 导入时自动匹配格式、尽量还原 | **随当前编辑模式自适应**：WYSIWYG→富文本呈现；Markdown→高质量 Markdown |
| **#3** | 拖拽/打开的文件命名 | 新建文件并打开；**同名加序号**（`名称 (1)`、`名称 (2)`…） |
| **#4** | docx 图片存储方式 | 选**最利于未来桌面化**的方案 |
| **#5** | 节奏 | **先产出本实施文档**，评审后再实施 |

---

## 2. 现状分析（关键事实，含代码定位）

### 2.1 「打开文件」链路（A 的改造点）
- 命令注册：`src/features/commandPalette/commandCatalog.ts:32`（`file.importFile`）
- 命令动作：`src/aurora/app/auroraActions.ts:78`
  ```ts
  'file.importFile': () => { nav('editor'); modalOpen('import') },
  ```
- 弹窗渲染：`src/features/editor/editorIntegration.tsx:281-287` 渲染 `<ImportDialog>`，回调 `handleImportFile`
- 弹窗本体：`src/features/import/ImportDialog.tsx` —— 内含**隐藏 `<input type="file">`** + 「点击选择文件」label（`SUPPORTED_TYPES = '.md,.markdown,.txt,.docx,.html,.htm'`），`handleFileChange` 里做"按扩展名分发导入"。

> 结论：**分发导入逻辑其实已经存在**，只是被"必须先进弹窗"包了一层。去掉弹窗 = 把这段逻辑改成"用户手势内直接 `input.click()`"。

### 2.2 拖拽链路（B 的改造点）
- 全局 drop 监听：`src/aurora/app/AuroraShell.tsx:218-236`
  ```ts
  for (const file of Array.from(files)) {
    if (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt')) {
      const content = await file.text()
      const fileName = file.name.replace(/\.(md|markdown|txt)$/, '')
      createFile('root', fileName, content)
    }
  }
  ```
- 编辑器内图片拖放：`src/features/editor/hooks/useTiptapDropPaste.ts` → `useTiptapImageHandler.ts`（只处理 `image/*`）。

> 结论：拖拽白名单硬编码在 `AuroraShell` 里，**只认 md/markdown/txt**；docx/html 直接被跳过。

### 2.3 转换链路（C 的改造点）
- `src/features/import/importDocx.ts`：
  ```ts
  mammoth.convertToHtml({ arrayBuffer }) → new TurndownService(...) → turndown(html)
  ```
- `src/features/import/importHtml.ts`：同样是**裸 `TurndownService`**。

> **重大发现**：`turndown` 默认**不转换表格**（遇到 `<table>` 直接产出空内容）。也就是说**当前 docx/html 里的表格在导入时被静默丢弃**——这是"和原稿差异大"的头号根因。此外 mammoth 提取的图片（base64）经 turndown 会变成 `![](data:image/...)` 巨型内联串，未走 `assets/` 资产化。

### 2.4 内容模型（决定 C 的走向）
- `src/features/editor/TiptapEditor.tsx:94` 注释原文：
  > 「统一走 `ctx.value` / `ctx.onChange`（**两模式都是 markdown 源**）」
- `TiptapEditor.tsx:188-190`：`onUpdate` 里 `ed.getHTML()` → `htmlToMarkdown()` 序列化回 Markdown。

> **结论（关键）**：MarkCraft 是 **Markdown-first**。WYSIWYG 模式并非另存 HTML，而是"Markdown ↔ 富文本"双向渲染。因此 **A/B/C 三条路径最终都应产出同一份高质量 Markdown**；编辑模式只决定**呈现**，不改变**存储**。

### 2.5 编辑模式状态（C 的模式判定）
- `src/stores/SettingsStore.tsx:8`：`editorMode: 'source' | 'wysiwyg'`（默认 `'wysiwyg'`，见 `:72`）。
- 局部状态机：`src/aurora/panels/editor/useEditorModeSwitch.ts`。

> 结论：导入时可读 `settings.editorMode` 判定当前模式。

### 2.6 图片资产模型（#4 的基础）
- `src/core/storage/imageStore.ts`：内存 `Map` 图片仓库 + `RELATIVE_PATH_MAP`（`relativePath → imageId`）。
- `useTiptapImageHandler.ts:24-36`：当 `useRelativeImagePath` 开启时，图片被 `storeBase64Image` 存入仓库，并以 **`assets/image_<时间戳>_<随机>.<ext>` 相对路径**插入文档。
- `src/core/storage/blobStore.ts`：IndexedDB（Dexie）blob 表，目前主要给内嵌 PDF 用（表结构 `BlobRecord{fileId, blob}` 是通用的）。
- 导出侧 `export/utils/exportImage.ts` 等已按 `assets/` 语义处理图片。

> 结论：**"相对路径 `assets/` + 资产存储" 这套模型已经存在**，正是桌面化最友好的形态。docx 图片应复用这套，而非内联 base64。

### 2.7 文件创建与重名（#3 的改造点）
- `src/stores/useFileTreeActions.ts:23` `createFile(parentId, name, content, openAfterCreate)`：**不做任何重名检测**，同名会并存。

---

## 3. 关键设计决策

### 3.1 统一导入管线（单一事实源）
新增一个**唯一的导入入口**，A/B 两条路径都调用它：

```ts
// src/features/import/importFile.ts（新增）
export interface ImportedFile { baseName: string; content: string }

/** 把任意受支持文件转成 Markdown 内容（MarkCraft 的规范格式） */
export async function importFileToMarkdown(file: File): Promise<ImportedFile> {
  const name = file.name
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const baseName = name.replace(/\.[^.]+$/, '')
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
    return { baseName, content: await file.text() }
  }
  if (ext === 'docx') return { baseName, content: await importDocxToMarkdown(file) }
  if (ext === 'html' || ext === 'htm') return { baseName, content: importHtmlToMarkdown(await file.text()) }
  throw new Error(`不支持的格式：.${ext}`)
}

/** 受支持扩展名（单一来源，供 accept / 拖拽白名单共用） */
export const SUPPORTED_EXT = ['md', 'markdown', 'txt', 'docx', 'html', 'htm'] as const
export const SUPPORTED_ACCEPT = SUPPORTED_EXT.map(e => `.${e}`).join(',')
```

- **accept 属性**与**拖拽白名单**都从这里取，彻底消除"两处硬编码不一致"。
- 后续加格式（如 `.rtf/.odt`）只改这一处。

### 3.2 模式自适应（C）
鉴于 §2.4 的 Markdown-first 事实，采用**"单份内容 + 模式决定呈现"**的设计：

- **产出**：始终是一份**高质量 GFM Markdown**（含标题/嵌套列表/引用/代码/链接/表格/`assets/` 图片）。
- **Markdown（source）模式**：用户直接看到这份 Markdown 源码——即"高质量 Markdown 转换"。
- **WYSIWYG 模式**：同一份 Markdown 立即被 Tiptap 渲染为富文本——即"所见即所得富文本"。

> 即：**不需要两条转换分支**；把 Markdown 做"高质量"，两种模式自然各得其所。这是最简洁、且与现有架构一致的做法。

**可选增强（提升 WYSIWYG 保真）**：对 Markdown 语法**无法表达**的结构（典型：**合并单元格**的复杂表格），在 WYSIWYG 模式下可内联一个 HTML 块 `<table>` 以求高保真；在 source 模式下则降级为纯 Markdown 管道表格。**此项默认关闭，作为可选项在 §7 待确认。**

### 3.3 去重命名（#3）
在 `fileService.ts` 增加纯函数（无副作用，便于单测）：

```ts
/** 在 parentId 下为 baseName 生成不冲突的 .md 文件名：A → A (1) → A (2) … */
export function uniqueFileName(root: FileNode, parentId: string, baseName: string): string
```

- 仅作用于**导入路径**（打开/拖拽），不改动既有 `createFile` 语义，避免影响其它调用方。
- 判重范围：同一父节点下的**同名文件**（`base.md`、`base (1).md` …）。

### 3.4 图片存储（#4）：`assets/` 相对路径 + 持久化资产
**推荐：相对路径 `assets/` + 资产存储（IndexedDB）**，理由（面向桌面化）：

| 方案 | 桌面化友好度 | 说明 |
|------|--------------|------|
| 内联 base64 | ✗ 差 | 正文体积膨胀、难 diff、桌面端会撑大文件 |
| **`assets/` 相对路径 + 资产存储** | ✓ **最佳** | 正文干净；逻辑路径 `assets/x.png` 在桌面端**1:1 映射为工作区真实文件**；可随笔记整目录迁移/打包 |
| 上传图床 | △ 视情况 | 依赖网络与第三方，离线桌面端不友好 |

- **落地**：docx 图片经 `mammoth.convertImage` 提取 → `imageStore.storeBase64Image()` → `registerRelativePath('assets/image_<ts>_<rand>.<ext>', id)` → 正文写 `![](assets/...)`。
- **持久化**：当前 `IMAGE_STORE` 是**内存 Map**，刷新即丢；需将图片 blob 落入 IndexedDB（复用 `db.blobs` 或新增 `assets` 表，按 `fileId` 关联，随文件删除级联清理）。**这是保证导入图片不丢的必要动作。**
- **桌面化路径**：未来 Tauri/Electron 下，`assets/` 逻辑路径解析为工作区真实文件（写入磁盘），Web 下解析为 IndexedDB blob 的 object URL——**同一套引用，两种后端**。

---

## 4. 详细实施步骤

> 建议分 4 个可独立验证、独立提交的阶段。每阶段结束跑既有门禁（见 §5）。

### 阶段 1 · 去弹窗（A）
**改动文件**
- 新增 `src/features/import/importFile.ts`（§3.1 的统一入口 + `openFilePicker()`）。
- `src/features/import/openFilePicker.ts`（新增）：
  ```ts
  import { SUPPORTED_ACCEPT } from './importFile'
  /** 在用户手势内直接调起系统文件框（不再经过中间弹窗） */
  export function openFilePicker(onPick: (file: File) => void): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = SUPPORTED_ACCEPT
    input.style.display = 'none'
    input.onchange = () => {
      const f = input.files?.[0]
      if (f) onPick(f)
      input.remove()
    }
    document.body.appendChild(input)
    input.click() // ⚠️ 必须在用户手势的同步调用栈内
  }
  ```
- `src/aurora/app/auroraActions.ts:78`：改为
  ```ts
  'file.importFile': () => {
    nav('editor')
    openFilePicker(async (file) => {
      const { baseName, content } = await importFileToMarkdown(file)
      const name = uniqueFileName(rootFolder, 'root', baseName)
      createFile('root', name, content)
    })
  },
  ```
- `src/features/editor/editorIntegration.tsx:281-287`：移除 `<ImportDialog>` 渲染。
- `src/features/import/ImportDialog.tsx`：删除（连同其 locales 键，或保留键位兼容）。
- 复查 `TiptapEditor.tsx:484` 的隐藏 `<input accept=".md,.markdown">`（`handleFileChange`）——统一并入 `importFile.ts`，避免第二套 accept。

**验收**：点「打开文件」→ **直接**出现系统文件框；选文件后新建并打开；无中间弹窗。

### 阶段 2 · 拖拽格式统一（B）
**改动文件**
- `src/aurora/app/AuroraShell.tsx:218-236`：白名单改用 `SUPPORTED_EXT`；命中则走 `importFileToMarkdown` + `uniqueFileName` + `createFile('root', …)`。
- **与图片拖放的协调**：全局 drop 只处理**文档格式**；`image/*` 仍交由编辑器 `useTiptapImageHandler` 处理（避免"图片被当成文档新建文件"）。
- 多文件拖入：逐个新建（各自去重命名）。

**验收**：把 `.docx/.html/.txt/.md` 拖进窗口 → 均新建并打开；图片拖到编辑器仍正常插入。

### 阶段 3 · 高质量转换 + 图片提取（C 核心）
**改动文件**
- `src/features/import/importDocx.ts`：接入 **GFM 表格** + **图片资产化**：
  ```ts
  const options = {
    convertImage: mammoth.images.imgElement(async (image) => {
      const base64 = await image.read('base64')
      const ext = (image.contentType?.split('/')[1] ?? 'png').replace('jpeg', 'jpg')
      const id = imageStore.storeBase64Image(`data:${image.contentType};base64,${base64}`)
      const rel = `assets/image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      registerRelativePath(rel, id)
      return { src: rel }
    }),
  }
  const { value } = await mammoth.convertToHtml({ arrayBuffer }, options)
  return gfmTurndown(value)
  ```
- `src/features/import/importHtml.ts`：同样接入 **GFM 表格**。
- **新增依赖**：`turndown-plugin-gfm`（提供 `tables/strikethrough/taskListItems` 规则）。若不便新增依赖，则在 `importFile.ts` 内**手写表格/删除线规则**（turndown 支持 `addRule`）。
  - 抽出共用的 `gfmTurndown()`，docx/html 复用，避免重复配置。

**验收**：docx 含标题/有序无序列表/表格/图片 → 导入后 Markdown 中标题为 `#`、列表为 `-`/`1.`、**表格为 GFM 管道表格**、图片为 `![](assets/...)`；WYSIWYG 下这些均正确渲染。

### 阶段 4 · 图片持久化（#4 收尾）
**改动文件**
- `src/core/storage/imageStore.ts` / `db`：为导入图片建立**持久化**（IndexedDB）。方案：新增 `assets` 表（`{ id, fileId, blob, mime }`）或复用 `db.blobs`；`storeBase64Image` 后异步落库；启动时按需水合。
- 级联清理：文件删除时 `deleteBlobsByFile(fileId)` 已存在，扩展覆盖 assets。

**验收**：导入含图 docx → 刷新页面 → 图片仍在（不丢）。

---

## 5. 验证方案（沿用既有门禁）
1. `npx tsc --noEmit` —— 类型检查
2. `npx eslint . --ext ts,tsx --report-unused-disable-directives` —— 0 error
3. `npx vitest run` —— 单测（新增 `uniqueFileName` / `importFileToMarkdown` / 表格转换的单测）
4. `CODEBUDDY_SAFE_DELETE_ENABLED=0 npm run build` —— 生产构建
5. **手动验收清单**（§4 各阶段"验收"）

**建议新增单测**：
- `uniqueFileName`：无冲突 / 已有 `A (1)` 时给 `A (2)` / 跨扩展名隔离。
- `importFileToMarkdown`：各扩展名分发正确；不支持格式抛错。
- 表格转换：`<table>` → GFM 管道表格（当前会丢，作为回归护栏）。

---

## 6. 风险与边界

| 风险/边界 | 说明 | 应对 |
|-----------|------|------|
| **Markdown 表达力上限** | 合并单元格、精确字号/颜色/行距在 GFM 中**无对应语法**，无法 100% 还原 | 优雅降级为管道表格；高保真需求见 §3.2 可选 HTML 块 |
| 浏览器手势限制 | `input.click()` 必须在用户手势同步栈内，否则被拦截 | `openFilePicker` 保持同步；命令桥接避免异步穿越 |
| 图片持久化改动面 | 涉及 `imageStore`/`db`，需谨慎迁移 | 增量：先落库、再水合；保留内存层作缓存 |
| 与编辑器图片拖放冲突 | 全局 drop 与编辑器 drop 同时监听 | 全局只处理文档格式，`image/*` 交给编辑器 |
| 大文件性能 | docx 含大量图片时 base64→blob 有内存峰值 | 逐张处理 + 限制单图大小（沿用 2MB 上限逻辑） |
| i18n | 删除弹窗会移除若干 locales 键 | 保留键位或同步清理 en/zh |

---

## 7. 待确认项（实施前请拍板）

1. **保真上限**：是否接受"Markdown-first"带来的上限（**合并单元格表格、精确排版无法 100% 还原**）？若不可接受，则需为导入文档引入"富内容存储"，属**较大架构变更**。
2. **WYSIWYG 内联 HTML 块**：是否允许在 WYSIWYG 模式下对复杂表格内联 HTML 块以提升保真？（默认：**否**，统一走纯 GFM Markdown。）
3. **新增依赖**：是否允许新增 `turndown-plugin-gfm`？（否则手写表格规则。）
4. **图片持久化**：确认导入图片落 IndexedDB（避免刷新丢失）——建议**是**。
5. **拖入多文件**：是否逐个新建并打开（建议**是**）；打开后是否自动切到该文件（建议**是**）。

---

## 附：改动文件清单（预估）

**新增**
- `src/features/import/importFile.ts`（统一入口 + 常量 + gfmTurndown）
- `src/features/import/openFilePicker.ts`

**修改**
- `src/aurora/app/auroraActions.ts`（命令改为直接调起文件框）
- `src/aurora/app/AuroraShell.tsx`（拖拽白名单 + 统一管线 + 去重命名）
- `src/features/import/importDocx.ts`（GFM 表格 + 图片资产化）
- `src/features/import/importHtml.ts`（GFM 表格）
- `src/stores/useFileTreeActions.ts` 或 `src/services/fileService.ts`（`uniqueFileName`）
- `src/core/storage/imageStore.ts` / `src/core/storage/db.ts`（图片持久化）
- `src/features/editor/editorIntegration.tsx`（移除 ImportDialog）

**删除**
- `src/features/import/ImportDialog.tsx`

**测试（新增/修改）**
- `importFile.test.ts`、`uniqueFileName.test.ts`、`importDocx.table.test.ts`

---

## 8. 实施记录（2026-10-07 完成）

**状态**：阶段 1–4 已完成并验证；§7 的 5 项按「推荐默认值」拍板。

### 关键决策修正（#4 图片存储）
实施中发现：应用渲染管线**只解析 `image:<id>` 占位符**（`useEditorState.ts:279`、`imagePreviewExtension.ts:41` 经 `isImagePlaceholder` + `getBase64Image`），**`assets/` 相对路径全仓无消费者**（`getImageIdByRelativePath` 无调用）——即 `assets/` 直写在 Web 端不会渲染。

故 docx 图片**不采用** `assets/` 直写，改用应用既有的 **`image:` 占位符管线**（与粘贴/拖拽图片完全一致）：
- 渲染期：`getBase64Image` 解析显示；
- 保存期：`textToStorage` 内联 base64 随笔记持久化（**无需另建 IndexedDB 持久化**）；
- 导出期：`backupService.transformContentForExport` 落盘为 **`assets/<id>.<ext>` 相对引用**（即桌面端布局）。

→ 因此**原「阶段 4 图片持久化」取消**：应用已通过「占位符 → 保存内联 base64」持久化；桌面端由导出路径产出 `assets/`。这是与现有架构最一致、且天然桌面友好的做法。

### 实际改动
**新增**
- `src/features/import/importFile.ts`（`SUPPORTED_EXT`/`SUPPORTED_ACCEPT` 单一来源、`importFileToMarkdown`）
- `src/features/import/openFilePicker.ts`（用户手势内直达系统文件框）
- `src/features/import/importFlow.ts`（`pickAndImportFile` 编排：导入 → 去重命名 → 新建并打开）
- `src/features/import/gfmTurndown.ts`（共享 GFM turndown）
- `src/types/turndown-plugin-gfm.d.ts`（补类型声明）
- 测试：`services/__tests__/uniqueFileName.test.ts`、`features/import/__tests__/importFile.test.ts`、`features/import/__tests__/importHtml.test.ts`

**修改**
- `src/aurora/app/auroraActions.ts`（`file.importFile` 直达文件框）
- `src/aurora/panels/editor/EditorPanel.tsx`（工具栏 open 直达文件框 + `useToast`）
- `src/aurora/app/AuroraShell.tsx`（拖拽白名单改 `isSupportedFile` + 统一管线 + 去重命名）
- `src/features/import/importDocx.ts`（GFM 表格 + 图片 → `image:` 占位符）
- `src/features/import/importHtml.ts`（GFM 表格 + 图片 → `image:` 占位符）
- `src/services/fileService.ts`（`uniqueFileName` 下沉至此，首号改 `(1)`）
- `src/aurora/panels/editor/editorPanelShared.ts`（改为转出 `uniqueFileName`）
- `src/features/editor/editorIntegration.tsx`（移除 ImportDialog）
- `src/aurora/app/commandWiring.test.tsx`（断言更新：不再走 import 弹窗）
- `package.json`（+`turndown-plugin-gfm`）

**删除**
- `src/features/import/ImportDialog.tsx`

### 验证结果
- `tsc --noEmit` ✓ exit 0
- `eslint` ✓ 0 error（72 warning 为既有风格项，未新增）
- `vitest run` ✓ 146/147 文件通过、1784 passed；唯一失败为 `BlogPanel.smoke.test.tsx`（harness 缺 IndexedDB，环境性，与本次无关）
- 新增单测 15 个全绿（去重命名 5 / 统一入口 6 / GFM 保真 4）
