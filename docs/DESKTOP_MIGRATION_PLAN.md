# MarkCraft 桌面化落地计划（Electron + 本地文件存储）

- **日期**：2026-10-08
- **状态**：待评审（本文件是实施依据，改动需先过这里）

---

## 0. 已定决策（用户已拍板）

| # | 决策 | 说明 |
|---|---|---|
| D1 | **壳选 Electron** | 不用 Tauri |
| D2 | **笔记以本地文件存储** | 磁盘上真实的 `.md` 文件，不再是 IndexedDB 里的虚拟树 |
| D3 | **能「打开原文件所在位置」** | Electron `shell.showItemInFolder(path)` |
| D4 | **不保留网页版** | 不再对外发布 Web 版；Web 构建仅作开发/测试用途 |

---

## 1. 目标架构

```
┌─────────────────────────────────────────────────┐
│ main（主进程 · Node）                            │
│  窗口管理（frameless）· IPC handlers             │
│  fs 读写 · 文件监听 · 原生对话框 · shell 集成      │
│  http 请求（主进程发 → 无 CORS 限制）             │
│  (可选) Pandoc sidecar                          │
└────────────────────┬────────────────────────────┘
                     │ contextBridge（白名单 IPC）
┌────────────────────┴────────────────────────────┐
│ preload                                          │
│  window.markcraft = { fs, dialog, shell,         │
│                       window, http, watch }      │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────┐
│ renderer（现有 React 应用）                       │
│  ★ 只 import src/platform/，不直接碰 IPC          │
│    - electron 实现（正式）                        │
│    - browser 实现（dev / 单测 / E2E 替身）         │
└─────────────────────────────────────────────────┘
```

**铁律**：renderer 侧业务代码**不得**直接访问 `window.markcraft` / `window.electronAPI`，一律经 `src/platform/`。
理由：① 让单测与 E2E 能在无 Electron 的环境跑；② 换壳/换实现只改一处。

---

## 2. 存储设计（最关键）

### 2.1 采用 Vault（仓库）模式

MarkCraft 的**知识库 / 双链 / 图谱 / MOC / 日记**都要求「一个文件夹作为容器」才成立，故：

- 用户「打开文件夹」= 打开一个 **Vault**；Vault 内所有 `.md` 自动纳入双链/图谱/搜索。
- 另保留「打开单个文件」入口（对应双击 `.md` 的直觉），此时以该文件**所在文件夹**为隐式 Vault。
- 最近打开的 Vault 列表（持久化在应用配置，不在 Vault 内）。

### 2.2 数据归属

| 数据 | 迁移后位置 |
|---|---|
| 笔记正文 | **Vault 内的真实 `.md` 文件**（唯一真相） |
| 图片 | Vault 内 `assets/`（编辑器引用**相对路径**，不再用 `image:<id>` 占位符） |
| 白板 / 画布 | Vault 内 `.excalidraw` / 自定义扩展名文件 |
| Vault 级配置（知识库规则、博客配置） | Vault 内隐藏目录（如 `.markcraft/`）或 Vault 内 `*.json` |
| 应用级配置（主题、快捷键、窗口状态） | Electron `userData` 目录 |
| **索引 / 缓存**（图谱、全文搜索） | 内存 + 可重建的磁盘缓存（**不是真相来源**） |

### 2.3 必须处理的新问题

1. **外部修改感知**：用户在 VS Code 改了文件 → 需 `chokidar` 监听 + 增量更新索引；冲突时以磁盘为准并提示重载。
2. **大 Vault 性能**：全量扫描在万级文件下会卡 → 首启建索引、之后增量。
3. **原子写入**：写文件用「临时文件 + rename」，避免崩溃产生半截文件。
4. **编码与换行**：统一 UTF-8；换行符保留原样（不要每次保存都改写整份文件）。
5. **老用户迁移**：首启检测到 IndexedDB 有数据 → 引导「导出为文件夹」→ 用户选目标目录 → 落成真实文件 → 标记已迁移（**不删旧数据**，留退路）。

---

## 3. 影响面清单（逐项）

| 模块 | 现状 | 迁移后 |
|---|---|---|
| `stores/FileStore.tsx` + `useFileTreeActions` | IndexedDB 虚拟树 | 改为「磁盘目录树 + 索引」；树结构来自 `fs.readDir` |
| `services/fileService.ts` | `saveState/loadState` 走 IDB | 退化为「窗口状态 / 最近 Vault」等应用级配置 |
| 导入（`features/import`） | 读文件 → 入 IDB | 读文件 → **复制/写入 Vault**（或原地引用，需定策略） |
| 导出（`features/export`） | Blob → `<a download>` | **原生保存对话框 + 写文件** |
| SaveAs 弹层 | `showSaveFilePicker`（11 处 FSA） | 原生 `dialog.showSaveDialog` |
| 图片 | `image:<id>` 占位符 + 导出时落 `assets/` | 直接写 `assets/`，正文存相对路径 |
| 知识库 | `folderId` 关联虚拟文件夹 | 关联 **Vault 内真实文件夹路径** |
| 双链 / 图谱 / MOC | 扫 IDB 树 | 扫 Vault 磁盘（走索引） |
| 搜索 | 扫 IDB | ripgrep 式扫描或自建索引 |
| 窗口控制 | `window.blur()` / `requestFullscreen()`（假的） | `BrowserWindow` 真实最小化/最大化/关闭 |
| 标题栏 | 自定义 chrome，但无拖拽区 | 加 `-webkit-app-region: drag` + 无边框窗口 |
| 博客部署 | renderer 直接 fetch（受 CORS 限制） | **挪到主进程** → CORS 消失（Cloudflare 顺带可用） |
| PWA | `vite-plugin-pwa` + SW | 桌面构建**关闭 SW** |
| `electron.d.ts` 的 `pandoc` 契约 | 死代码（无主进程） | 接上真实主进程 → EPUB 走 Pandoc |

---

## 4. 测试策略（重要）

| 层 | 环境 | 说明 |
|---|---|---|
| 单测（Vitest + jsdom） | 无 Electron | 走 `platform` 的 **browser 替身**（IndexedDB / 内存） |
| E2E（Playwright） | 真实浏览器 | **现有 43 个用例保留**，走 browser 替身 |
| E2E（Electron） | Playwright `_electron.launch()` | **新增少量**关键用例：真实读写文件、reveal in folder、窗口控制、打包产物冒烟 |

**不把 43 个用例改写成 Electron 版**——收益低、成本高。桌面专属行为用新增的 Electron E2E 覆盖。

---

## 5. 分阶段计划

| 阶段 | 内容 | 可验证产出 |
|---|---|---|
| **P1** ✅ | `src/platform/` 抽象层（接口 + browser 实现 + 单例），把现有 11 处 FSA、下载、窗口控制收敛进去 | tsc ✓ · 现有 149 单测 + 43 E2E 全绿（行为不变） |
| **P2** ✅ | Electron 骨架：main + preload + 编译脚本 + frameless 窗口 + 真实窗口控制 | `npm run electron:dev` 能起窗口；窗口控制可用（Electron E2E 5/5） |
| **P3** ✅ | 打通 fs：`fs` IPC + 目录树读取 + 打开文件夹 + **打开原文件所在位置** | 真实桌面壳经 IPC 读写磁盘；readDirectory 读树（含递归）、writeFile 原子写、reveal 可用；Electron E2E 11/11（09+10）全绿 |
| **P4** ✅ | 存储切换（分 A/B/C/D）：A 核心 VaultService + 双后端分派 + 读写落盘；B rename/move/delete 全联动；C 文件监听（外部改动可感知）；D IndexedDB→Vault 迁移引导 | 桌面端经 `platform.fs` 读 Vault 真实 `.md` 到文件树，编辑/重命名/删除/移动经 `syncTree` 落盘，外部增删改由 fs.watch 跟随刷新（含自身回显抑制），旧 IDB 笔记可一次性迁移到 Vault |
| **P5** ✅ | 打包分发：`electron-builder` → 绿色版 exe + NSIS 安装包 + `.md` 文件关联 | `electron-builder` 产出 NSIS 安装包 + portable 绿色版 exe，`.md`/`.markdown` 文件关联；打包产物冒烟 E2E 通过 |
| **P6** ✅ | 网络请求挪主进程（解 CORS）+ Pandoc sidecar（真 EPUB） | 跨域 API（GitHub/Vercel/Cloudflare/AI 端点）经主进程发出不被拦；EPUB 有 Pandoc 时走真转换、无则回退内置生成器 |

### P1 完成情况（2026-10-08）

**收敛结果 —— 业务代码里浏览器专属 API 已归零：**

| 类别 | 收敛前 | 收敛后 |
|---|---|---|
| File System Access API | 11 处直接调用 | **0**（仅 `src/platform/browser.ts` 内部保留） |
| 下载 | 3 份**重复的 `downloadBlob`** + 14 处内联 `<a download>` | **16 处统一走 `platform.saveBlob()`** |
| `createObjectURL`（业务代码） | 13 处 | **1 处**（`exportImage.ts` 的 `img.src` 图片预览，非下载） |
| 窗口控制 | `window.blur()` / `requestFullscreen` 散落 | 统一 `platform.window.*` |

**关键设计决定：**

- **不暴露 `FileSystemFileHandle`** —— 桌面端没有这个对象（拿到的是原生路径），故抽象为最小语义的 `SaveTarget { name, kind, write(blob, filename?) }`；`filename` 支持**相对路径**（自动建中间目录），以覆盖博客导出的 `posts/x/index.html` 这类嵌套。
- **保持 `downloadBlob` 的同步签名** —— 3 份 helper 改为内部委托 `platform.saveBlob()` 后，**13 个调用点零改动**。
- **`canPickFiles` 与 `canPickDirectory` 刻意分开** —— `BlogModal` 查目录能力、`OptimizeImagesModal` 查文件能力，混用会误报。

**新增测试：** `src/platform/browser.test.ts`（16 条契约测试）—— 它是 **P2 Electron 实现的对标基准**（「取消返回 null」「非取消错误上抛」「目录写入支持嵌套相对路径」等语义在此钉死）。

**已知遗留（不影响 P1 目标）：** `BlogPanel` 有 1 处 `window.open(blobUrl)` 的**新标签预览**（非下载），桌面端应改为「系统浏览器打开」或内部预览窗口 —— 需产品决策，留待 P2。

---

### P3 完成情况（2026-10-08）

**打通 fs，桌面端能真实读写磁盘 + 打开原文件所在位置：**

| 层 | 改动 |
|---|---|
| `electron.d.ts` | 新增 `MarkCraftFsAPI` / `MarkCraftDialogAPI` / `MarkCraftShellAPI`，并入 `MarkCraftDesktopAPI` |
| `electron/main` | `bindFsIpc`（readDir / readFile / writeFile 原子写 / exists / stat / mkdir / rename / remove / reveal）+ `bindDialogIpc`（openDirectory / openFile / saveFile） |
| `electron/preload` | 暴露 `window.markcraft.fs` / `dialog` / `shell`，全部走 IPC |
| `src/platform/types` | 新增 `FsAPI` / `DialogAPI` / `DirEntry` 契约，扩展 `Platform`（`fs` / `dialog` 必选） |
| `src/platform/electron` | 真实 `fs` / `dialog` 实现 + `revealInFolder` 走 `shell.showItemInFolder`（D3） |
| `src/platform/browser` | 诚实降级：浏览器 `fs` 一律拒绝（不静默吞）、`dialog` 一律返回 `null` |

**关键设计决定：**
- **原子写**：`writeFile` 先写 `<path>.<pid>.<ts>.tmp` 再 `rename`，避免崩溃留下半截文件（计划 §2.3.3）；父目录不存在自动 `mkdir -p`。
- **递归读跳过隐藏目录**：`readDirectory({recursive:true})` 默认跳过 `.git` / `.markcraft`，避免万级 Vault 误扫；`includeHidden` 可显式开启（P4 用）。
- **浏览器 `fs` 拒绝而非 no-op**：防止桌面专属逻辑在 web 路径被悄悄吞掉产生隐性回归（契约测试见 `browser.test.ts` 仅覆盖既有面；fs 行为由 Electron E2E 10 覆盖）。

**验证：** vitest 1878 通过 / 2 跳过；playwright 54 通过（含 web 43 + electron 11）；electron:compile 与 `tsc -p tsconfig.electron.json` 零错误。

---

### P4-A 完成情况（2026-10-08）

**核心 VaultService + FileStore 双后端分派（桌面端真实磁盘落盘）：**

| 层 | 改动 |
|---|---|
| `src/services/vaultService.ts`（新） | `loadVault(root)` 经 `platform.fs.readDirectory` 建文件树（递归 + 跳点文件）+ 读 `.md` 内容到节点；`syncTree(folder, root)` 300ms 防抖增量对账（新增/重命名/删除/内容改 → 落盘）；`readLastVault / persistVaultRoot`（`localStorage.markcraft.lastVault`，仅桌面端） |
| `src/stores/FileStore.tsx` | 加载分支：`platform.kind==='electron' && lastVault` → `loadVault`；否则保持 IndexedDB。保存分支：同上条件 → `syncTree` 落盘；否则 `saveState`（IDB）。新增 `openVault()`：原生目录选择 → `loadVault` → 记最近 Vault。上下文暴露 `vaultRoot / openVault` |
| `src/stores/fileStoreShared.ts` | `FileManagerContextType` 扩展 `vaultRoot / openVault` |
| `src/services/vaultService.test.ts`（新） | 6 用例：建树、跳点文件、edit→write、rename→rename、delete→remove、create→write、无变更不写盘（用 in-memory fs mock） |

**关键设计决定：**
- **双后端分派**：以 `platform.kind` 为唯一分派点（`@platform` 已是 P1 抽象），加载/保存两个 effect 各分支一条，零业务代码感知。
- **内容内联进文件树**：`FileNode.content` 保留（备份/渲染/搜索/双链/MOC 全部直接读，零下游改造），P4 集中只改 FileStore 两个 effect。
- **增量对账 `syncTree`**：以 `id → {path, mtime}` 的快照为基线，与当前 `rootFolder` 求差集（add/delete/rename/contentChanged）再分别调 `platform.fs.writeFile / rename / remove`；单点对账比"对每个节点 diff 路径"省 IPC。
- **隐藏目录过滤**：`loadVault` 不传 `includeHidden`，自动跳过 `.markcraft/` 等，与 P3 `readDirectory` 默认行为一致。
- **最近 Vault 用 `localStorage` 而非 `electron-store`**：与 P2 `markcraft.kind` 探测同源（preload 注入即有 localStorage），零新依赖；将来要迁 `electron-store` 只换实现。
- **P4 关键约束守住**：网页/jsdom 单测与 web E2E 仍走 IndexedDB，FileStore 加载/保存两 effect 的 else 分支逐字节不变 → 既有 54 用例零回归。

**验证：** tsc --noEmit ✓；tsc -p tsconfig.electron.json ✓；vaultService 6/6 ✓；Electron Vault E2E 3/3 ✓（`e2e/11-electron-vault.spec.ts`：根目录/子目录 `.md` 真实读入 + `.markcraft` 不渲染）。

**P4 后续子阶段：**
- **P4-B**：rename/move/delete 联动校验 + 文件名冲突去重（已部分经 `syncTree` 覆盖，需补回归用例）
- **P4-C** ✅：`mc:fs:watch` 主进程监听 → preload `platform.fs.watch(path, cb)` → FileStore 受控刷新（详见下文）
- **P4-D**：首次启动检测到 IndexedDB 存量时弹一次性「迁移到 Vault」引导（导出 `.md` 副本到用户选定目录，保留 IDB 不破坏）

### P4-C 完成情况（2026-10-08）

**文件监听 —— 外部改动可感知（资源管理器 / git / IDE）：**

| 层 | 改动 |
|---|---|
| `electron/main` | `bindFsWatchIpc`：`fs.watch(root, {recursive:true})` 零依赖（Windows ✓ / macOS Node 20+ ✓ / Linux 顶层 only 文档化）；per-path 200ms 防抖 + 隐藏段过滤（`split('.')` 跳过 `.markcraft` 等） + statSync 分类（create/change/delete，非 `.md`/非目录丢弃）；`webContents.send('mc:fs:watch')` 推送；`wc.once('destroyed')` 自动回收避免泄漏 |
| `electron/preload` | `window.markcraft.fs.watch(root, cb)`：注册 `mc:fs:watch` 监听 + invoke 拿 id，返回**取消订阅函数**（闭包跨 contextBridge 合法；invoke 期间被取消也能补 invoke `mc:fs:unwatch`） |
| `types/electron.d.ts` | `MarkCraftFsAPI.watch` 签名（`onEvent: ({type,path}) => void` → `() => void`） |
| `src/platform/types` | `FsAPI.watch` 契约 + 跨平台差异注释 |
| `src/platform/electron` | `desktopFs.watch` 委托 preload |
| `src/platform/browser` | `watch: () => () => {}` no-op 取消函数（让调用方双端复用） |
| `src/stores/FileStore` | 新增 `useEffect([vaultRoot])`：electron+vaultRoot → `platform.fs.watch`；事件 500ms 全局防抖 → `loadVault` + `resetSync(tree, root)`（清基线防 save effect 全树回写风暴）→ `setState` 换根 |

**关键设计决定：**
- **零依赖 `fs.watch`**：不引入 chokidar；用 Node 内置 recursive watch，主平台（Windows/macOS）可靠；Linux 顶层 only 限制在 main 注释文档化，P4-C+ 必要时再换 chokidar。
- **per-path 200ms + 全局 500ms 双层防抖**：合并外部短时 burst（git pull 一秒内改几十个文件），避免 reload 风暴；loadVault 后必须 `resetSync` 清基线，否则 save effect 看到「全树变更」会回写所有文件。
- **事件过滤在主进程**：非 `.md` 文件（如 `.tmp` / IDE 锁文件）和隐藏目录内的改动直接丢弃，不污染渲染端；节省 IPC。
- **MVP 权衡 —— 编辑器本地草稿不同步**：watch 触发 reload 会刷新文件树和**内存树**（含打开文件的磁盘内容），但 `EditorPanel.localContent` 仍以用户最后编辑版为准；保存会覆盖外部改动。P4-C+ 引入「外部改动 vs 未保存编辑」的冲突解决（dirty 检测 + 提示）再补。
- **`wc.once('destroyed')` 自动回收**：用户关闭窗口即停监听 + 清防抖 timer，零泄漏；多个窗口监同一根目录自然得多个 watcher（轻微冗余可接受）。

**验证：** tsc --noEmit + tsc -p tsconfig.electron.json 零错误；vitest 1873 通过 / 2 跳过 / 0 失败断言（151 文件全过，2 unhandled Dexie 既有噪音）；playwright 59 通过 / 1 跳过（54 既有 + 3 新 11-vault + 2 新 12-watch）。

---

### P5 完成情况（2026-10-08）

**打包分发 —— `electron-builder` 出真 exe：**

| 项 | 内容 |
|---|---|
| 依赖 | `electron-builder@26.15.3`（devDependency） |
| 配置 | `package.json` `build` 字段：`appId=com.markcraft.app`、`productName=MarkCraft`、`directories.output=release`、`files=[out/**, dist/**, package.json]`（**不含 node_modules** —— main 由 esbuild 全量 bundle、renderer 由 Vite 全量 bundle，均自包含）、`asar=true` |
| 目标 | win：`nsis`（安装包）+ `portable`（绿色版）；mac：`dmg`/`zip`；linux：`AppImage` |
| 文件关联 | `.md` / `.markdown` → `role: Editor`（双击用 MarkCraft 打开） |
| 脚本 | `electron:pack`（--dir 快速验证）、`electron:dist`（全平台）、`electron:dist:win`（Windows x64） |
| 产物 | `MarkCraft-Setup-0.1.0-x64.exe`（NSIS 安装包）+ `MarkCraft-Portable-0.1.0-x64.exe`（绿色版） |

**关键设计决定 / 踩坑：**
- **生产 `base: './'`**（vite.config）：打包后渲染进程经 `app.isPackaged` 走 `loadFile(dist/index.html)`（file:// 协议），绝对 `/assets/...` 会 404 白屏 → 生产改相对 base；dev 仍 '/'（E2E 走 dev server 不受影响）。
- **`index.html` 相对图标**：原 `/vite.svg` 是模板残留死链（public/ 里根本没有），改 `./icon.svg` 并删除死链。
- **⚠️ `EPERM rename` 陷阱（本环境实测）**：electron-builder 默认「解压 electron.zip 到 `win-unpacked.tmp` → rename 为 `win-unpacked`」，Windows Defender 实时扫描锁住 `electron.exe`（~240MB）句柄 → `rename` 抛 `EPERM: operation not permitted`。**规避**：`scripts/prepare-electron-dist.cjs` 预解压缓存 zip 到 `.electron-dist/`，配 `build.electronDist=.electron-dist` → electron-builder 走「**拷贝**」分支（copy 不触发独占锁）。已写进 `electron:pack/dist` 脚本链，可复现。
- **下载走 npmmirror**：electron / nsis / winCodeSign 等二进制默认从 GitHub 拉，国内易超时；设 `ELECTRON_MIRROR` + `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/...` 秒下。
- **nsis 与 portable 必须区分 artifactName**：两者都是 `.exe`，默认同名会互相覆盖（首轮实测 portable 覆盖了 nsis）→ `nsis.artifactName`/`portable.artifactName` 分别加 `-Setup` / `-Portable` 后缀。
- **`files` 不含 node_modules**：因 main/renderer 均已全量 bundle，运行时零 node_modules 依赖 → 包体更小、无原生模块 ABI 问题（@electron/rebuild 会跑但无实际原生依赖）。
- **应用图标 ✅（2026-10-08）**：`build/icon.svg`（品牌源图，M 用 path 免字体依赖）+ `scripts/gen-icon.cjs`（用**已装 Electron** 离屏渲染 → `build/icon.png` 1024×1024，零新增依赖）+ `npm run electron:icon`；`build.win/mac/linux.icon` 均指向它，electron-builder 自动转 ICO/ICNS。构建日志已无 `default Electron icon is used`。
- **代码签名 📄（需真实证书）**：electron-builder 自动读 `CSC_LINK`/`CSC_KEY_PASSWORD`（Windows `.pfx`）/ `APPLE_ID` 等（macOS 公证），**无需改配置**。完整指引见 `docs/CODE_SIGNING.md`。⚠️ 自签名证书不能解决分发（SmartScreen 只认受信任 CA），拿到真实 OV/EV 证书前发布产物仍为未签名。

**验证：** `npm run electron:pack`（--dir）产出 `win-unpacked/MarkCraft.exe`（246MB）并**真机起窗渲染**（`e2e/13-electron-packaged.spec.ts` 2/2：非白屏 + 无致命资源错误，证明 file:// 相对资源加载成功）；`electron-builder --win` 产出 NSIS 安装包 + portable 绿色版 exe。

---

### P4-B 完成情况（2026-10-08）

**rename / move / delete 全链路回归 —— 修 2 个真实 bug + 补 8 个用例：**

| 项 | 内容 |
|---|---|
| **Bug 1（修）** | `doSync` 对**目录改名/移动**只 `mkdir` 新路径、**不 rename 旧目录** → 旧空目录残留在磁盘。改为 `mkdir(dirname)` + `fs.rename(prev, cur)`（连同子树搬迁；walk 保证父先于子，子节点随后各自标记已同步）。 |
| **Bug 2（修）** | 文件/目录 rename 失败（源已不在盘上，如外部已删）时被 `.catch` 静默吞掉 → **改名丢文件**。改为 fallback：文件走 `writeFile(cur.path, content)`，目录走 `mkdir(cur.path)`。 |
| **Bug 3（修，P4-C 回填）** | **自身写入回显**：应用写盘 → fs.watch 把这次改动当「外部改动」回推 → 触发整 Vault reload，既浪费又**盖掉进行中的 UI 操作**（实测：改名后紧跟删除，reload 把刚删的节点从磁盘读回）。修法：主进程 `selfWrites` 记录自己刚写的路径，`classifyAndSend` 在 3s 窗口内忽略（`writeFile`/`rename`(双路径)/`remove`/`mkdir` 都标记）。 |
| 单测 | `vaultService.test.ts` 6 → **12 个**：补 move 文件到子目录 / 文件夹改名 / 移动文件夹（整树）/ 删除文件夹（.md 移除、目录留盘）/ 改名去后缀 / 旧路径缺失退化。mock 的 `rename` 升级为**递归**（目录整树迁移）+ **源缺失抛 ENOENT**（贴近真实 fs）。 |
| E2E | 新增 `e2e/14-electron-vault-crud.spec.ts` 3/3：空态新建 → 磁盘 .md；文件树右键重命名 → 磁盘改名；右键删除+确认 → 磁盘移除。覆盖「UI 动作 → FileStore → syncTree → 磁盘」完整链路。 |

**关键设计决定：**
- **删除文件夹「目录留盘」策略保留**（只删其中的 `.md`）：Vault 里可能有用户手放的非笔记目录/文件，loadVault 不纳管，删目录会误伤 → 保守留盘。
- **回显抑制放在主进程**：只有主进程确切知道「这次写盘是不是自己发起的」，放渲染端只能靠 mtime 猜测 → 更准、更省。
- **TTL 3s**：覆盖 watcher 200ms 去抖 + 渲染端 500ms reload 去抖的往返延迟；代价是「应用写某文件后 3s 内该文件的外部改动会被漏掉」——概率极低，可接受。

**验证：** tsc 两套零错误；vaultService 12/12；Electron E2E 11/12/14 全绿（11=3、12=2、14=3）；全量见下方提交记录。

---

### P4-D 完成情况（2026-10-08）

**IndexedDB 旧笔记 → 本地 Vault 一次性迁移引导：**

| 层 | 改动 |
|---|---|
| `vaultService.ts` | 新增纯函数 `flattenNotes(rootFolder, skipIds)` —— 收集全树笔记的**相对路径 + 内容**（文件名补 `.md`，跳过内置说明书），供迁移落盘 |
| `FileStore` | 加载分支新增检测：`electron` + 未选 Vault + IDB 有笔记 + 未忽略过 → `legacyMigration = {count}`；新增 `migrateLegacyToVault()`（选目录 → `flattenNotes` 逐篇 `writeFile` → `loadVault` 回读 → 采用为 Vault）与 `dismissLegacyMigration()`（localStorage 置位，不再弹） |
| `fileStoreShared.ts` | `FileManagerContextType` 扩展 `legacyMigration / migrateLegacyToVault / dismissLegacyMigration` |
| `aurora/components/LegacyMigrationPrompt.tsx`（新） | 复用共享 `Modal` + `Button` 呈现引导；挂载于 `AuroraShell`（全局） |
| i18n | 新增 `legacyMigration` 段（`zh/common.ts` + `en.ts` + `zh/index.ts` 类型声明） |
| `electron/main` | `mc:dialog:openDirectory` 加 `MARKCRAFT_TEST_OPEN_DIR` 测试钩子（原生目录对话框无法无头驱动；仅显式设 env 时生效） |

**关键设计决定：**
- **保留 IDB 不破坏**：迁移只读内存树写盘，绝不删 IDB → 失败/后悔都能回退。
- **跳过内置「使用文档」**（`builtinFileIds`）：它们不该落成真实文件。
- **一次性 + 可忽略**：`markcraft.legacyMigrationDismissed` 置位后不再弹；迁移成功同样置位。
- **仅桌面端**：浏览器环境 IDB 就是「家」，无需迁移。
- **测试钩子最小化**：只在 `openDirectory` 一处、只在显式 env 下短路，生产路径逐字节不变。

**验证：** tsc 两套零错误；vaultService 14/14（含 `flattenNotes` 2 例）；Electron E2E 11/12/14/15 全绿（15 = 检测弹窗 + 迁移落盘 2 例，用 `--user-data-dir` 隔离 IDB 并 `evaluate` 种入旧数据）。

---

### P6 完成情况（2026-10-08）

#### P6.1 网络请求挪主进程（解 CORS）

渲染进程是 Chromium（跨域受 CORS 约束），主进程是 Node（**不受限**）—— 跨域 API 经主进程发出即不被拦。

| 层 | 改动 |
|---|---|
| `src/platform/types` | 新增 `NetAPI` / `NetFetchInit`（`fetch(url, init?) → Response`，额外支持 `timeoutMs`），并入 `Platform` |
| `src/platform/browser` | `net.fetch` 直连全局 fetch（浏览器仍受 CORS）；调用时读全局，测试桩可替换 |
| `src/platform/electron` | `net.fetch` 把 `RequestInit` 归一化（string / Uint8Array / ArrayBuffer / Blob / URLSearchParams）→ IPC → 主进程 fetch → **重建标准 `Response`**（含 204/205/304 无 body 处理） |
| `electron/main` | `bindNetIpc`：`mc:net:fetch` 用 Node 全局 `fetch` + `AbortSignal.timeout`；超时抛 `NET_TIMEOUT:<ms>` 供渲染端识别 |
| `electron/preload` | 暴露 `window.markcraft.net.fetch` |
| 消费方迁移 | `fetchWithTimeout`（**5 个 deploy 适配器的统一出口**，零调用方改动）、`ThemeMarket`、`externalImporter`、`aiService`（3 处） |

**关键设计：**
- **返回标准 `Response`** → 调用方零改动（`fetchWithTimeout` 签名不变，5 个适配器无感）。
- **超时语义保留**：改由主进程执行（`timeoutMs` 经 IPC 传入），渲染端把 `NET_TIMEOUT` 映射回 `FetchTimeoutError`。
- **不支持的 body 形态回退渲染端 fetch**，行为与迁移前逐字一致。

#### P6.2 Pandoc sidecar（真 EPUB）

| 层 | 改动 |
|---|---|
| `scripts/fetch-pandoc.cjs` | 下载 Pandoc（默认 3.12.1）→ `resources/pandoc/<platform>/`；`npm run fetch:pandoc` |
| `electron/main` | `resolvePandocCommand`（打包内 `process.resourcesPath/pandoc/` → 开发态 `resources/pandoc/` → 系统 PATH）；`bindPandocIpc`（`mc:pandoc:available` 探测 `--version`、`mc:pandoc:convert` spawn + stdin/stdout，60s 超时） |
| `electron/preload` | 暴露 `window.markcraft.pandoc.{available,convert}` |
| `src/platform` | 新增 `PandocAPI` 并入 `Platform`（browser 恒不可用）；**`exportEpub.ts` 从直接读 `window.markcraft` 改为走 `@platform`**（补齐 P1 遗留的越层访问） |
| `package.json` | `build.extraResources` 把 `resources/pandoc` 打进 `process.resourcesPath/pandoc` |

**关键设计决定 —— 二进制「可选下载」而非入库：**
- `pandoc.exe` **解压后 224.6MB**（静态链接 Haskell），入库会让仓库爆炸。
- 故：二进制 **gitignore**（`resources/pandoc/*`，仅留 `.gitkeep`）；需要真 EPUB 时 `npm run fetch:pandoc` 再打包；**没跑也不影响** —— `exportEpub` 回退内置最小 EPUB 生成器（行为与 P6 前一致）。
- **实测体积影响**（2026-10-08 收尾审查更正）：NSIS 用 LZMA 把静态二进制压得很狠，**安装包仅 185MB → 201MB（+16MB）**；代价主要在**安装后磁盘占用 +225MB**（~246MB → ~470MB）。故「可选」而非默认打包仍是对的取舍。
- 三级解析（打包内 → 开发态 → 系统 PATH）让「自带」与「用系统装的 pandoc」都能工作。

**验证：** tsc 两套零错误；E2E 16（主进程网络代理 3/3，用本地 HTTP 服务器做确定性目标 + 超时用例）、E2E 17（Pandoc 转换 2/2：Markdown→EPUB 返回真 ZIP + mimetype；无二进制时 skip）；browser.test 18/18（含 net 2 例）。

---

## 6. 待定决策（状态）

| # | 问题 | 结论（用户拍板） |
|---|---|---|
| Q1 | 导入外部文件时，复制进 Vault 还是原地引用？ | **复制进 Vault**（可预期、可迁移；原文件不受影响） |
| Q2 | Vault 级配置放隐藏目录 `.markcraft/` 还是散落 `*.json`？ | **`.markcraft/`**（不污染用户视野，可整体忽略） |
| Q3 | 是否支持多 Vault 同时打开？ | **先单 Vault**（最近打开列表记忆，多 Vault 留后续） |
| Q4 | 打包工具 | 已改：弃 `electron-vite`（安装 EBUSY），改用项目既有 **esbuild** 直接编译 main/preload |
| Q5 | 首发是否签名？ | **先不签**（见 §7，下载页附 SHA256） |
| Q6 | 版本号策略 | 首个可分发版本定 **`0.1.0`**，之后语义化 |

> ⚠️ P4 关键约束（实现时务必遵守）：网页 / jsdom 单测 / 浏览器 E2E 仍走 **IndexedDB 后端**（既有行为不变，54 用例全绿为回归证据）；
> 只有 `platform.kind === 'electron'` 才走**真实磁盘后端**。即 FileStore 必须支持双后端分派，不能让 `platform.fs` 在浏览器路径被硬依赖。

---

## 7. 代码签名结论（2026 实况）

- **不必须买**。不买：首启有 SmartScreen「未知发布者」警告（点「更多信息 → 仍要运行」可过），部分企业/杀软会拦。
- **⚠️ EV 的「即时免警告」特权 2024 年后已被微软取消**：现在信誉按**下载量/使用量**评估，**新签名程序无论 OV/EV 首次都可能触发警告**；EV 权重更高 → 所需下载量远小于 OV。
- **Azure Artifact Signing**（$9.99/月）资格限美/加/EU/英 → **中国大陆开发者不可用**。
- 国内可买（个人也能买）：**Certum OV ¥1200/年 · Certum EV ¥2500/年**（云签名免 UKey）；GlobalSign ¥2800/¥4000；Comodo ¥3200/¥4200；DigiCert ¥4400/¥6600。2026-02 起有效期最长 459 天。
- **建议**：首发**不签**，下载页写明提示 + 附 **SHA256 校验值**；等有用户量或进企业渠道时上 **Certum EV**。

---

## 8. 主要风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 存储重写波及面大（FileStore 是核心） | 高 | 分阶段：P1 先抽象，P3/P4 才动存储；每阶段保持测试全绿 |
| 万级文件 Vault 性能 | 中 | 首启建索引 + 增量更新；搜索下沉到 ripgrep |
| 外部修改与内存状态冲突 | 中 | 以磁盘为准 + 监听 + 提示重载 |
| Electron 包体（~100MB+） | 中 | 用 `asar` + 剔除无用 locale；接受（Electron 固有） |
| 老用户数据迁移失败 | 高 | 迁移不删旧数据、可重试、失败给明确指引 |
