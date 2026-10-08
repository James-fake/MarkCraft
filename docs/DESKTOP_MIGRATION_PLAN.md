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
| **P4** 🟡 | 存储切换（分 A/B/C/D）：A 核心 VaultService + 双后端分派 + 读写落盘；B rename/move/delete 全联动；C 文件监听（外部改动可感知）；D IndexedDB→Vault 迁移引导 | A：桌面端经 `platform.fs` 读 Vault 真实 `.md` 到文件树，编辑/重命名/删除/新建经 `syncTree` 落盘；B/C/D 后续 |
| **P5** | 打包分发：`electron-builder` → 绿色版 exe + NSIS 安装包 + `.md` 文件关联 | 双击安装包可装；双击 `.md` 用 MarkCraft 打开 |
| **P6**（可选） | 网络请求挪主进程（解 CORS）+ Pandoc sidecar（真 EPUB） | Cloudflare 部署可用；EPUB 走 Pandoc |

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
- **P4-C**：`mc:fs:watch` 主进程监听 → preload `platform.fs.watch(path, cb)` → FileStore 受控刷新
- **P4-D**：首次启动检测到 IndexedDB 存量时弹一次性「迁移到 Vault」引导（导出 `.md` 副本到用户选定目录，保留 IDB 不破坏）

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
