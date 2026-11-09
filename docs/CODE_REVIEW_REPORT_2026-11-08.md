# MarkCraft v1.0.0 上线前代码审查报告

- 日期：2026-11-08
- 范围：工作副本（`ocr delegate preview`，mode=workspace），非单个 PR
- 依据：`docs/CODE_REVIEW.md`（§4 通用 / §5 专项 / §6 红线）、`.opencodereview/rule.json`
- 方式：OpenCodeReview 委派模式（文件筛选 + 规则分组由 CLI，实际审查由本地完成，**代码未外发、未调用外部 LLM**）

## 1. 覆盖率

| 项 | 数量 |
| --- | --- |
| preview 总文件 | 154 |
| 可审文件 | **103** |
| 已审（reviewed） | **103**（A 组 S0 红线 13 + B 组 UI 31 + C 组逻辑层 59） |
| 跳过（skipped） | 0 |
| 工具排除 | 51（`unsupported_ext` 的 .md/.svg、binary 的 .png 等） |
| **可审文件覆盖率** | **100%** |
| 变更规模 | +9611 / −1202 |

排除项里 `README*.md`、`docs/*.md`、`build/icon.svg/png` 属文档与品牌资产，不参与代码审查；如需文档事实核对需另行处理。

## 2. 质量门禁实测

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| `npx tsc --noEmit` | **0** | src 类型 |
| `npx tsc -p tsconfig.electron.json` | **0** | 含新增 `netGuard.ts` |
| `npx tsc -p tsconfig.e2e.json` | **0** | e2e 类型 |
| `npm run lint`（max-warnings 0） | **0** | 含分层守卫、unused-disable 检查 |
| `npx vitest run` | 199 文件 / **2280 passed, 2 skipped**，但 **exit=1** | 唯一非 0：3 次 `Temp\web` **EPERM unhandled error**（`node-brokered-fs-shim`）。`CODE_REVIEW.md` §5 已归类为环境噪音；Linux CI 无此 shim，但需实跑确认 exit 0 |
| 行尾一致性 | 103/103 全 LF，MIXED=0、CRLF=0 | 红线 5 不触发 |
| 分层守卫 | 无违规 | `features/blog/themes/index.ts` 的 `./aurora` 是同目录主题模块，误报丢弃 |
| i18n 三处同步 | 齐备 | zh/common.ts / en.ts / zh/index.ts 接口+聚合逐键核对，且受 `en: Translations` 类型约束 |
| Electron 边界 | 合规 | `window.markcraft` 仅出现在 `src/platform/*` 与注释；IPC `mc:vault:*` 三处同步 |
| 硬编码密钥 | 未发现 | — |
| CI | **存在**，但本次改动未经过 | `.github/workflows/code-review.yml` 仅 `pull_request` 触发；当前改动在 master 工作副本、无 staged、无 PR |

> 纠正一处代理误判：A 组报告称「仓库仍无 CI 工作流」，实际 `.github/workflows/code-review.yml` 已存在且包含 typecheck×3 / vitest / lint 硬门禁。真实问题是下面 M-CI-1。

## 3. 结论：**No-Go（暂不建议上线）**

`CODE_REVIEW.md` §6 红线 4 明确：「未 sanitize 的外部输入，或会真实破坏用户数据的操作」为 High 打回项。本次命中 **1 个 Critical + 8 个 High**，集中在「路径/网络白名单被绕过」「脚本执行面」「隐私承诺破损」「外部改动/并发导致数据丢失」四类，均属上线阻断。

> **状态更新（2026-11-09）**：§4 Critical(1) + §5 High(8) 全部闭环，其中 **H-2 已于 2026-11-09 彻底修复**（把已校验 IP 固定到 undici `Agent` 的 `connect.lookup`，堵死 TTL=0 DNS rebinding 的 TOCTOU 窗口，`undici` 已列为直接依赖并编入主进程打包，见 §10.3 / §5 表 H-2 行）。§6 Medium、§7 Low 亦已分别闭环（见 §13 / §14）。全量门禁全绿。剩余见 §13.7。

---

## 4. Critical（1）

### C-1 `mc:vault:registerRoot` 对渲染端输入零校验，路径白名单可被自行扩展
- `electron/main/index.ts:161-166` · security · **critical**
- `ipcMain.handle('mc:vault:registerRoot', (_e, root) => addAllowedRoot(root))` 直接把渲染端传入的任意字符串加入 `allowedRoots`，无用户确认、无根宽检查、无来源校验。`resolvePath` 只做词法规范化。
- 项目威胁模型（`netGuard.ts` 文件头、P0-1）明确假设「渲染进程可能被注入（外部导入、网页剪藏、预览层漏洞）」。被注入的渲染端先 `registerRoot('C:\\')`，随后 `mc:fs:readFile/writeFile/remove` 即可读写删整机文件。与 `mc:dialog:*`（原生对话框由用户显式授权）性质完全不同。
- 建议：只允许登记主进程已记录的「对话框授权路径集合」或 `userData`；`registerRoot` 仅接受集合内成员；拒绝文件系统根/用户主目录等过宽根；realpath 归一化。修复时须保证合法 Vault 仍能登记（参见 M-A-10）。

## 5. High（8）

### H-1 `PRIVATE_HOST_RE` 缺 IPv4-mapped IPv6 与保留网段，SSRF 可绕过
- `electron/main/netGuard.ts:20-65` · security · high
- 拒绝列表只列 `127./10./169.254./::1/fe80:` 等字面前缀，缺 `::ffff:0:0/96`、`100.64.0.0/10`、`192.0.0.0/24`、`198.18.0.0/15`、组播段。`new URL('http://[::ffff:127.0.0.1]/').hostname` 去括号后不命中任何规则；`assertPublicHostResolved` 第 53 行又因 `host.includes(':')` 直接 return 跳过 DNS 复查。`http://[::ffff:169.254.169.254]/` 可直达云元数据。
- 建议：改用「只允许公网」式判定（`net.isIP()` + 归一化 IPv4-mapped 取低 32 位，或 `ipaddr.js` 的 `range()` 覆盖 private/loopback/linkLocal/uniqueLocal/reserved）；字面与 DNS 解析结果用同一函数；补 `::ffff:*`、`100.64.*` 单测。

### H-2 DNS rebinding 防护名存实亡（注释承诺与实现不符）
- `electron/main/netGuard.ts:82-99` · security · high
- `safeFetch` 先 `await assertPublicHostResolved(current.hostname)` 做一次 `dns.lookup`，随后 `fetch(current, ...)` 传入的仍是**域名**，undici 会重新解析。TTL=0 的攻击者域名可让第一次返回公网 IP、第二次返回 127.0.0.1。文件头第 13 行「防 rebinding」不成立。
- 建议：把已校验 IP 固定到实际连接（自定义 dispatcher/lookup + `Host` 头保留原域名），或连接建立后复查 socket 远端地址；做不到就在注释里如实撤回该安全承诺。

### H-3 `assertAllowedPath` 用词法 `resolve` 而非 realpath，符号链接/junction 逃逸
- `electron/main/index.ts:143-151` · security · high
- 只做 `..`/`.` 词法规范化。Vault内含指向外部的 symlink / Windows junction 时，词法仍在根内 → 通过校验，而 `fsp.readFile/writeFile` 会跟随链接读写外部文件；`readDir` 递归用 `realpathSafe` 仅做 visited 去重，实际 `fsp.readdir(dir.path)` 仍读原路径。
- 建议：对路径及各级父目录 realpath 归一化后再 `relativePath` 判定；递归遍历拒绝落在允许根外的 real；新建路径校验已存在的最近祖先。

### H-4 原子写临时文件同毫秒撞名，可致内容错乱/丢失
- `electron/main/index.ts:211-232` · bug · high
- `tmp = ${safePath}.${pid}.${Date.now()}.tmp` 在同一进程同一毫秒对同一目标并发两次写入时生成完全相同的名字（自动保存与手动保存叠加、批量导入/导出同目标）。A 写→B 覆盖→A rename 成功→B rename 抛 ENOENT；失败清理 `fsp.unlink(tmp).catch(()=>{})` 还可能删掉另一路刚写的文件；即便都成功，内容也是后写覆盖前写。
- 建议：tmp 名追加 `randomUUID()` 或进程内自增序号；失败清理只删本 handler 自己创建的 tmp。

### H-5 `sanitizeRawHtml` 放行 `srcdoc`/`sandbox`，用户笔记可触发脚本执行
- `src/services/sanitizeHtml.ts:50-71` · security · high
- 本次把 `data-html`/`data-raw-html` 加入 `MARKDOWN_SANITIZE_CONFIG.ADD_ATTR`，打通「笔记原始 HTML → RawHtmlBlock」通道（`RawHtmlBlock.ts:47` 会 `dom.innerHTML = sanitizeRawHtml(...)`），但 `sanitizeRawHtml` 的 `ADD_ATTR` 仍含 `srcdoc`、`sandbox`，且 `ADD_TAGS: ['iframe']`。DOMPurify 不解析属性值，`<iframe srcdoc="<script>…</script>" sandbox="allow-scripts allow-same-origin">` 原样保留并在加载时执行、自行指定 `allow-same-origin` 逃逸沙箱——与本次 `IframeNode.ts` 修的是同一向量。
- 建议：从白名单移除 `srcdoc`/`sandbox`，或强制覆写 sandbox 为 `allow-scripts`（禁 same-origin）；对 `data-html` 值二次净化时禁止 iframe/srcdoc。

### H-6 `trackCrash` 越界采集，隐私承诺破损
- `src/features/telemetry/events.ts:30-68` · security/privacy · high
- 非 `Error` 值走 `String(error).slice(0,40)`；`installErrorHandlers` 的 `onError` 回退 `e.error ?? e.message`（Electron 下 `ErrorEvent.message` 常含 `file:///C:/Users/...` 路径），`onRejection` 直接传 `e.reason`。以字符串 reject（如 `reject('open /path/秘密.md failed')`）即可把文件名/路径/内容片段上报。违反「绝不采集笔记内容/文件名/路径」「崩溃只上报错误类名」。
- 建议：非 Error 一律上报固定常量；只取 `error instanceof Error ? error.constructor.name.slice(0,40) : 'unknown'`；`onError` 去掉 `?? e.message`。

### H-7 外部文件改动被内存旧内容覆盖（数据丢失）
- `src/stores/FileStore.tsx:351-380`（配合 `src/stores/fileStoreShared.ts:99-136`）· bug · high
- watcher reload 调 `mergeUnsavedEdits(prev.rootFolder, tree, prev.tabs)`，该函数只取 `tab.fileId`、**不读 `isDirty`**，逐标签只要「内存内容 !== 磁盘内容」就用内存旧内容覆盖磁盘新内容并标脏。用户在外部编辑器/同步盘改了已打开的 .md 后，save effect 会把旧内容写回，外部修改永久丢失；`FileStore.tsx:337-338` 注释仍称「保存会覆盖外部改动是 MVP 权衡」，与新增保护自相矛盾。
- 建议：`mergeUnsavedEdits` 接收 `isDirty`，仅对确有未落盘编辑的标签保留内存版本；补「外部改动且无本地编辑」回归测试。

### H-8 `withKbLock` 只覆盖 6 个函数，per-kbId 串行化形同虚设
- `src/stores/kbStore.ts:251-360` · bug · high
- 锁只包了 `rebindKbFolder/deleteKb/renameKb/addFileToKb/removeFileFromKb/addCanvasToKb`；注释点名的 `updateTasks`、`updateRule`、`addExportRecord` 以及 `removeCanvasFromKb`、`addRule`、`updateBlogConfig`、`updateDescription`、`updateLearningPath`、`updateAiSummary` 等（约 367-580 行）仍是裸 `loadKb → 改字段 → saveKb`。同一 kbId 两个操作交错即后写覆盖前写；加锁与未加锁函数共享 key 时不互斥。注释宣称已修但事实未修，误导维护。
- 建议：所有读-改-写导出函数统一改为 `return withKbLock(kbId, …)`，或把锁下沉到 `loadKb/saveKb` 层。

---

## 6. Medium（30，按主题归并）

> **状态（2026-11-08 夜）**：本节网络 / UI / 数据 / 主进程类的 Medium 已按「数据完整性优先」批量修复约 19 条，逐条见 §13；§7 的 10 条 Low 仍未处理（按规范不阻断）。

### 网络与 IPC（A 组）
| 位置 | 问题 | 建议 |
| --- | --- | --- |
| `netGuard.ts:92-94` | 跨主机重定向保留 `Authorization`/`Cookie`，凭据泄露 | 跨 origin 剥离认证头 |
| `netGuard.ts:85-95` | 重建 `currentInit` 丢 `signal`，超时整链失效；307/308 被静默降级 GET | 透传同一 AbortSignal；仅 301/302/303 降级 |
| `netGuard.ts:54-65` | `assertPublicHostResolved` 吞 DNS 异常（fail-open），注释与实现矛盾 | 解析失败即拒绝（fail-closed）或修正注释 |
| `netGuard.ts:67-79` | 允许 https→http 降级 | 记录初始协议，禁止降级 |
| `index.ts:234-270` | 用错误消息字符串判别异常，`fsp.stat` 的 EACCES/EIO/EPERM 被吞后仍 rename | 定义带 `code` 的错误类，用 `instanceof`/`err.code` |
| `index.ts:653-664` | 导航防线：distUrl 基准与 `DIST_INDEX` 不一致、前缀无边界、生产态仍放行 dev origin | 复用 `../../dist` 基准 + 尾部分隔符；生产态只放行 `file:` |
| `index.ts:247-275` | `markSelfWrite` 键在原始路径与 resolve 后路径混用，3s TTL 回显抑制可失效 | 统一用 `guard()` 返回值；watch 用 `assertAllowedPath(root)` 的返回 |
| `index.ts:414-431` | `openFile`/`saveFile` 登记的是单文件路径而非父目录；重启恢复 Vault 不经对话框不登记 → 打包态功能退化 | 登记父目录；核对所有 Vault 载入路径先 registerRoot，补重启冒烟 |
| `src/setupTests.ts:11-15` | 静默吞 `defineProperty` 异常，未来 i18n 回归无线索 | `console.warn` 或 `vi.stubGlobal` |
| `vitest.config.ts:34-39` | env 注入未消除 EPERM，且把关闭宿主 safe-delete 保护固化进仓库 | 开关移到运行命令/CI env；用 `maxWorkers`/`pool` 规避 |

### UI / 可达性 / 规范（B 组）
| 位置 | 问题 | 建议 |
| --- | --- | --- |
| `AvatarPicker.tsx:167-175` | **需求驱动的规范偏离**：气泡浮层（用户明确要求「macOS 下拉式、不要弹窗」）与 `rule.json:30`「弹层统一走 Modal」及 §18 冲突。**不是缺陷，不应改回 Modal** | 在 rule.json 与 §18 显式登记豁免及适用边界 |
| `AvatarPicker.tsx:167-214` | `role="dialog"` 浮层无焦点移入/归还、无 focus trap；tabs 缺 `aria-controls`/tabpanel 与方向键 | 打开时聚焦搜索框、关闭时 `anchorRef.current?.focus()`；补 ARIA tabs 语义 |
| `AuroraShell.tsx:190-204` | 遥测停留时长 off-by-one（切换 F0→F1→F2 时 F2 丢失、F0 重复）；`locale` 挂载后不更新 | 简化为 `useEffect(() => { const s=Date.now(); return () => trackFeatureDwell(feature, Date.now()-s) }, [feature])` |
| `AuroraShell.tsx:180-186` | `addEventListener('pagehide')` 与 `removeEventListener('pageHide')` 大小写不一致；cleanup 内重复 `trackAppClose()` | 统一 `'pagehide'`，去掉 cleanup 里重复上报 |
| `OnboardingScreen.tsx:88-102` | Esc 与 TitleBar 关闭都不落完成标记 → 未填昵称用户下次启动被强制重走 4 步引导；注释仍写「3 步」 | step 0 的 Esc 调 `finish(false)`；关闭前落标记；注释改 4 步 |
| `AboutSection.tsx:108-153` | 隐私政策/服务条款入口是 `<span onClick>`，无 `role/tabIndex/onKeyDown`，键盘完全不可达 | 统一改 `<button type="button">` 或补齐 ARIA 与键盘激活 |
| `onboarding.css` / `avatar.css` / `blog.css`（多处） | 新增样式批量偏离 §18：硬编码 hex/rgba、裸 `font-size`、裸 px 圆角（含 9px 非三档）、`animation` 超 300ms / 无限循环 / 未自带 reduced-motion、`transition` 动了 background/color/border-color/box-shadow | 收敛到 `--mc-*` token；动效仅 transform/opacity + <300ms；循环动画按 §14 登记豁免 |
| `avatarBgPresets.ts:15-26` | 9 组背景预设硬编码 hex，含紫/粉渐变，命中 §11 硬禁令；`AvatarPicker.tsx` 取色器默认值 `#7C8CFF` 另写品牌色 | 抽为 `--mc-avatar-bg-*` token 并去紫粉，或按 §14 登记「用户头像个性化配色」豁免 |

### 数据 / 逻辑（C 组）
| 位置 | 问题 | 建议 |
| --- | --- | --- |
| `mdToHtml.ts:214-295` | 整条管线 `catch` 静默吞异常，降级为「转义后的原始 md」且无日志 | `logger.error` 记录堆栈，降级结果改为明确错误提示 |
| `customSyntax.ts:66-100` | 占位符各只 `replace` 一次（非递归），畸形 markdown 会把 `\uE000C…` 私有区字符写回用户文件 | 循环还原至无占位符；行内代码保护跳过已占位区段 |
| `customSyntax.ts:127-190` | 只给 wiki-link 属性加了 `escapeHtmlAttr`，`img src` / `data-embed-*` / `displayText` / `data-block-*` 仍直接插值 | 统一转义，补往返用例 |
| `documentExporter.ts:39-50` | `inlineMd` 先 `escapeHtml` 再对 href 二次转义 → `&amp;amp;` | 在未转义原文上取 href |
| `giteeAdapter.ts:170-188`（及 githubAdapter） | owner/repo/branch 未 `encodeURIComponent`，branch 含 `?`/`../` 可查询注入或路径穿越 | 各段按 API 约定编码 |
| `legacyIdbMigrate.ts:65-123` | `openLegacyDb` 用不带 version 的 open，库不存在会创建空库；`readAll` 对缺失 store 返回空 → 空跑后仍 `markDone()`，旧数据永久放弃 | open 后校验 `objectStoreNames`，`onupgradeneeded` 视为新建库直接放弃本次 |
| `backupService.ts:122-165` | 桌面 Vault 分支 `persistFiles` 只调 `runtimeFilesApplier` 不 await 写盘，300ms 防抖窗口内关应用即丢恢复结果 | `RuntimeFilesApplier` 返回 Promise 并提供 `flushVault()` |
| `FileStore.tsx:162-168` | `void platform.vault?.registerRoot(root)` 未 await 就 `loadVault(root)`，主进程多 invoke 可并发，注释声称的顺序性不成立 | `await` registerRoot 后再 loadVault |
| `useFileTreeActions.ts:195-270` | `moveNode` 在 setState updater 内赋 `rejected` 后同步 `return !rejected`，React 18 批处理下恒为 false（契约撒谎） | 改为同步可判定的返回值，与 `renameNode` 对齐 |
| `MigrateWizard.tsx:117-170` | `uniqueName` 只比对本次批次，未与树中已有节点比对 → 导入非空文件夹产生同名，Vault 模式可能覆盖磁盘同名文件 | 导入前预占目标文件夹现有文件名 |
| `SettingsStore.tsx:103-136` | `DEFAULT_SETTINGS.theme` 改 `'system'` 后，从未显式存过 theme 的老用户被切主题；需确认 ThemeManager 实现 `'system'` 分支 | 老用户一次性迁移写显式值；核对 `matchMedia` 监听 |
| `htmlWrapper.ts:188-189` | mermaid 改 `securityLevel:'strict'` 但仍 `htmlLabels:true`（strict 下会被禁用），导出站点图表可能退化；`r.svg` 未二次净化 | 实测导出图表；对 SVG 走统一净化（含 foreignObject 占位保护） |

### 流程 / 工具链（审查新增）
| 位置 | 问题 | 建议 |
| --- | --- | --- |
| `.github/workflows/code-review.yml:41-50` | OCR 步骤 `continue-on-error: true`，与 `CODE_REVIEW.md` §3「OCR High 项阻塞合并」不一致；且 CI 仅 PR 触发，本次 103 文件的工作副本改动完全未经过 CI | 将 OCR High 转为 required check，或修正文档表述；上线前务必走一次 PR/等价门禁 |
| 门禁实测 | `npx vitest run` exit=1（EPERM unhandled error），CI 里该命令是硬门禁 | 在无 brokered-fs shim 的干净环境（Linux CI）实跑确认 exit 0；必要时调整 `pool`/`maxWorkers` |

## 7. Low（10，摘要）

`en.ts:1797` 英文 locale 夹中文「猫」；`netGuard.ts:35-37` 逃生口 `MARKCRAFT_ALLOW_PRIVATE_NET` 启用无告警；`index.html:9` theme-color 固定深色；`BlogPanel.tsx:330-352` iframe onLoad 序号竞态会短暂露空白；`perfProbe.ts` 缺自身 DEV 守卫；`sessionSnapshot.ts` `isDirty` 写而不读；`client.ts:76-84` 缓冲 >50 条时 flush 后不重排；`kbStore.ts:249-259` `kbWriteQueues` 条目永不删除；`Modal.tsx:91-115` `animationend` 监听冒泡可能提前卸载；`components.css` 若干裸 font-size。按 §8「Low 以建议形式给出」，不阻断。

## 8. 建议修复顺序

1. **安全与隐私红线**（C-1、H-1~H-6）：每条配单测（尤其 `::ffff:*`、srcdoc、非 Error 崩溃值），修完复跑门禁。
2. **数据丢失**（H-4、H-7、H-8 + M 组的迁移/备份/导入同名/registerRoot 顺序）：补回归测试后复跑。
3. **门禁一致性**：干净环境确认 vitest exit 0；把 OCR High 转 blocking 或修正文档；本次改动走一次 PR 让 CI 实际执行。
4. **规范与可达性**：登记气泡浮层豁免、修 `AvatarPicker` 焦点管理、`AboutSection` 键盘可达、批量清理新增 CSS 的 token/动效偏离；可登记为上线后 follow-up，但 §18 闸门属 UI 改动的合并前提，宜在上线前处理。
5. **S0 要求尚未覆盖的项**：`CODE_REVIEW.md` §2 规定 S0 需「全量测试 + **打包冒烟**」。本次审查未执行 `electron-builder` 打包与产物校验（数字签名、`@electron/asar` 内容检查、首次启动）。上线前必须补做；注意记忆中的 EBUSY（每次用全新输出目录）与 npmmirror 配置。

## 9. 复核说明

- Critical/High 共 9 条已逐条回源码复核，确认非误报；`window.markcraft` 命中、`./aurora` 命中、「仓库无 CI」判断分别判定为误报/误判并已纠正。
- 三处 tsc、lint、行尾、i18n、分层守卫、Electron 边界、密钥扫描由主审独立复跑，结论与分组审查一致。
- 审查阶段为**只读**，未修改任何被审代码文件；修复记录见 §10。

---

## 10. 修复记录（2026-11-08 晚，按 §8 顺序）

### 10.1 Critical / High 闭环情况

| 编号 | 状态 | 修复要点 | 回归锁 |
| --- | --- | --- | --- |
| **C-1** | ✅ 已修 | 新增 `electron/main/vaultRootPolicy.ts`：`evaluateVaultRoot` 拒绝文件系统根、受保护路径（home/userData/appData/temp/appPath/cwd）的祖先、已有允许根的祖先（防扩权），并要求根在「用户显式授权集合」内。`index.ts` 增加 `authorizedVaultRoots` + `userData/authorized-vault-roots.json` 持久化，`whenReady` 由主进程自行恢复；`mc:vault:registerRoot` 改走该校验；`mc:dialog:openDirectory` 与 e2e 注入路径走 `authorizeVaultRoot`。老版本升级的一次性迁移窗口只允许第一个通过结构校验的根并落盘 | `src/testing/vaultRootPolicy.test.ts`（11 例，含 `C:\`、主目录、扩权、未授权、窗口只开一次） |
| **H-1** | ✅ 已修 | `netGuard.ts` 弃用会漏网段的正则拒绝列表，改 `node:net.isIP` + IPv4 网段区间 + IPv6 展开（提取 `::ffff:*` / `::` 兼容映射按 IPv4 判定，仅放行 `2000::/3` 全局单播）。字面与 DNS 解析结果共用 `isBlockedIp`；`localhost.` / `*.localhost` 一并拒绝 | `netGuard.test.ts`（22 例，含 `::ffff:127.0.0.1`、云元数据、100.64/10、192.0.0/24、198.18/15、组播、2001:db8） |
| **H-2** | ✅ 已闭环（2026-11-09） | 见 §10.3：把已校验 IP 固定到 undici `Agent` 的 `connect.lookup`，实际连接不再二次 DNS 解析，TTL=0 换 IP 的 TOCTOU 窗口被堵死；`undici` 已列为直接依赖并编入主进程打包 | `netGuard.test.ts`（29 例，新增 H-2：pinningLookup 忽略主机名只返已校验地址、resolvePublicAddresses 取/拒地址、safeFetch 传固定 dispatcher） |
| **H-3** | ✅ 已修 | `assertAllowedPath` / `addAllowedRoot` 统一走新增的 `canonicalizePath`（`realpathSync.native`，对不存在的尾部逐段回退到最近存在祖先再拼回），阻断 symlink / Windows junction 逃逸；配套把 `mkdir`/`remove`/`watch` 的 `markSelfWrite` 与 `join` 全部改用规范化后的路径（顺带修 M-A-7 的键不一致） | 类型门禁 + 全量冒烟；`vaultRootPolicy.test.ts` 覆盖祖先判定 |
| **H-4** | ✅ 已修 | 原子写 tmp 追加 `randomUUID()`：`${safePath}.${pid}.${Date.now()}.${uuid}.tmp`，消除同毫秒并发撞名 | 全量门禁；tmp 唯一性由构造保证 |
| **H-5** | ✅ 已修 | `sanitizeRawHtml` 的 `ADD_ATTR` 移除 `srcdoc` / `sandbox`，改 `RETURN_DOM` 后遍历 iframe 强制覆写 `sandbox="allow-scripts"`（不含 `allow-same-origin`），与 `IframeNode.ts` 决策一致；保留 iframe 嵌入语义 | `src/services/sanitizeHtml.test.ts`（6 例，4 个反例含 `data-html` 二次净化） |
| **H-6** | ✅ 已修 | `trackCrash` 非 Error 一律上报固定常量 `'unknown'`；`onError` 去掉 `?? e.message` 回退；`onRejection` 交给 trackCrash 丢弃字符串 reason | `telemetry.events.test.ts`（8→12 例，3 个反例含路径/文件名/内容串） |
| **H-7** | ✅ 已修 | `mergeUnsavedEdits` 的 tabs 增加 `isDirty?`，首行 `if (!tab.isDirty) continue`；仅 dirty 标签保留内存版本，其余一律采用磁盘内容、不标脏、不回写。修正 `FileStore.tsx` 中「MVP 权衡」的过时注释 | `fileStoreShared.session.test.ts`（10 例，含「外部改动且无本地编辑」「老数据无 isDirty」） |
| **H-8** | ✅ 已修 | 所有读-改-写导出函数（277–433 / 513–617 / 651）统一 `withKbLock(kbId, …)`；锁**不下沉**到 `loadKb`/`saveKb`（避免自死锁，注释写明原因）；队列空闲后带尾节点身份校验地 `delete`（顺带修 L4） | `src/stores/kbStore.concurrency.test.ts`（2 例：门闩制造「两个 load 都读旧快照」、加锁与新补齐函数共享 key 互斥） |

顺带闭环的 Medium/Low：`netGuard` 的 M1（跨 origin 剥离 `authorization`/`cookie`/`proxy-authorization`）、M2（`signal` 透传每跳 + 307/308 保留 method/body）、M3（DNS 解析失败 fail-closed，注释与实现一致）、M4（禁止 https→http 降级）；M-A-7（selfWrites 键统一）；L4（kbWriteQueues 清理）。各自都有对应回归用例。

### 10.2 全量门禁（修复后复跑）

| 检查 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | 0 |
| `npx tsc -p tsconfig.electron.json` | 0 |
| `npx tsc -p tsconfig.e2e.json` | 0 |
| `npm run lint`（max-warnings 0） | 0 |
| `npx vitest run` | 间歇：多数轮次 **203 文件 / ~2300 passed, 2 skipped，exit=0**；个别轮次因沙箱 `Temp\web` EPERM unhandled error 报 exit=1，但**断言 0 失败**（见 §5 噪音归类，非回归）。本地全绿，CI 需实跑确认 |
| 14 个改动文件行尾 | 全 LF；`git diff --check` 0 |

### 10.3 H-2 的残余风险（2026-11-09 已彻底修复）

`safeFetch` 早期实现是「先 `dns.lookup` 预检、再把**域名**交给 `fetch` 自行解析」——两次解析不是同一个结果，TTL=0 的攻击者域名可让预检拿到公网 IP、实际连接拿到 `127.0.0.1` 的 TOCTOU 窗口。

**本轮（2026-11-09）已彻底消除该窗口**：
- 新增 `resolvePublicAddresses(hostname)` 作为「校验 + 取地址」单一来源，解析并逐地址复查后返回已确认安全的地址列表（`allowPrivateNet()` 逃生口下返回 `[]`，不固定）；
- 新增 `pinningLookup(pinned)` —— undici `Agent` 的 `connect.lookup` 实现，**故意忽略传入的主机名、只返回已校验地址**，实际连接不再询问 DNS；
- 新增 `makePinnedAgent(pinned, hostname)` —— 用 `new Agent({ connect: { lookup: pinningLookup(pinned), servername } })` 构造逐跳临时 dispatcher，`servername` 对域名保留原主机名（SNI 不被破坏）；
- `safeFetch` 每一跳先 `resolvePublicAddresses` 再 `makePinnedAgent` 固定到 `fetch` 的 `dispatcher`；响应体读完后 `agent.close()` 释放 socket，终态把 body 缓冲成与 dispatcher 解耦的 `Response` 返回，避免 agent 泄漏。

至此「预检解析」与「实际连接」用同一组地址，TTL=0 换 IP 攻击不可行。`undici` 已作为**直接依赖**加入 `package.json` 并成功编入主进程打包（esbuild 内联，无外部 `require`）。`netGuard.ts` 文件头注释同步更新为「已彻底修复」并保留能力边界说明。

回归锁见 §5 表 H-2 行（`netGuard.test.ts` 29 例，含 H-2 新增的 pinningLookup 行为、resolvePublicAddresses 取/拒、safeFetch 传固定 dispatcher）。

### 10.4 上线前仍待完成

1. **§6 的 Medium 优先项已全部闭环**（见 §10.5 / §10.6）：合规/可达性优先项（`AboutSection` 链接键盘可达、`AvatarPicker` 浮层焦点管理与 tabs ARIA、`OnboardingScreen` Esc/关闭完成标记、`rule.json`+基线+CODE_REVIEW 的豁免登记）与**新增 CSS 的 §18 基线偏离**（`avatar.css`/`onboarding.css`/`blog.css`/`components.css`）均已修复。剩余未处理的只是**历史代码的既有偏离**（不在本次变更集，含取色器色相环等属功能本身），建议后续单独、谨慎处理。
2. ~~**S0 打包冒烟**~~ → **已完成**（见 §11）：`release-v9` 的 Setup/Portable 均构建成功、asar 内容与新代码标记校验通过、首启稳定。~~**数字签名仍为 `NotSigned`，公开分发前需补签**~~ **（用户 2026-11-09 决定不做代码签名，wontfix）**。
3. ~~**CI 实跑**~~ → **受阻（见 §12）**：CI 是 GitHub Actions，但仓库托管在 Gitee，工作流不会触发；已按 gate 相同命令本地等价实跑（tsc×3=0 / lint=0 / vitest 全 passed）。要真正自动化，需迁移 Gitee Go 或镜像到 GitHub。
4. ~~**OCR High 阻塞**与 `CODE_REVIEW.md` §3 表述不一致~~ → **已解决**（见 §10.7）：确认 `ocr review` 无 severity 阈值退出，改为「文档如实反映 OCR 为辅助、High 由 reviewer 人工把关」。
5. ~~**H-2 后续**~~ → **已完成（2026-11-09）**：`undici` 已列为直接依赖，`safeFetch` 用 `Agent` 固定已校验 IP 到 `connect.lookup`，TOCTOU 窗口消除（见 §10.3 / §5 表 H-2 行）。

### 10.5 Medium 优先项闭环（2026-11-08 深夜，本轮）

本轮聚焦 §6 中「合规/可达性优先」的 4 条，并登记规范豁免：

| 编号 | 状态 | 修复要点 | 回归锁 |
| --- | --- | --- | --- |
| **B-a11y-1 `AboutSection` 链接键盘不可达** | ✅ 已修 | 三处合规入口（`usageDocs` / 隐私政策 / 服务条款 / 官网 / 反馈 / 许可）由 `<span onClick>` 改为原生 `<button>`；无后端项加 `disabled` + `aria-disabled`；`settings.css` 重置 button 默认样式（padding/border/background/font-family/size/line-height 继承）并加 `:focus-visible` 焦点环 | `AboutSection.a11y.test.tsx`（1 例：全部为 button 且可聚焦、禁用项带 `aria-disabled`） |
| **B-a11y-2 `AvatarPicker` 浮层焦点管理** | ✅ 已修 | 打开时焦点移入浮层搜索框（`data-avatar-autofocus`），关闭后归还触发按钮；`focusin` 监听在焦点离开面板且离开锚点时收起（非 trap、不锁 body 滚动，贴合 macOS popover）；将 `anchorRef.current` 在 effect 内捕获为 `anchorEl` 消除 `react-hooks/exhaustive-deps` 警告。tabs 补完整 ARIA：`role=tablist` + `role=tab` + roving `tabIndex` + `aria-controls`（仅激活时）/ `aria-selected`；panel `role=tabpanel` + `aria-labelledby` + 左右方向键切换并把焦点带到新 tab | `AvatarPicker.smoke.test.tsx`（扩展至 18 例，新增 a11y 块：打开焦点移入 / 关闭归还 / tab 方向键切换 / tabpanel 关联） |
| **B-flow-1 `OnboardingScreen` Esc/关闭不落完成标记** | ✅ 已修 | 首步 `Escape` 由「无操作」改为 `finish(false)`（内部先 `markProfileOnboardingDone()` 再 `onDone`），避免未填昵称用户下次启动被强制重走 4 步；TitleBar 关闭回调显式 `markProfileOnboardingDone()` 后再 `app.quit`；同步把「3 步 / 两枚圆点」的过期注释与 CSS 注释改为 4 步 / 四枚圆点 | `OnboardingScreen.smoke.test.tsx`（扩展：首步 Esc 后 `markProfileOnboardingDone` 被调用、关闭后不再重走） |
| **B-doc-1 `rule.json` 气泡浮层豁免登记** | ✅ 已登记 | 在 `.opencodereview/rule.json` 的 `src/aurora/**` 规则、`docs/MarkCraft-Desktop-Native-Baseline.md`（§3.4 例外 / §4.1 / §11 / §12 / 历史轮次表）、`docs/CODE_REVIEW.md` §5 显式登记「锚定气泡浮层（`AvatarPicker.tsx`）非模态、允许 portal+fixed、不要求 Modal」与「用户头像个性化配色不受硬编码 hex/紫粉约束」的需求驱动规范偏离豁免，写明适用边界，避免后续 OCR 误报、新开发者误改回 Modal | 规则文件 `JSON.parse` 验证通过；三处文档均含「2026-11-08 经产品决策拍板」标注 |

**CSS 基线偏离**：原留作下一批，已在 §10.6 清理完毕。

**门禁（本轮复跑）**：`tsc --noEmit` 0、`tsc -p tsconfig.electron.json` 0、`tsc -p tsconfig.e2e.json` 0、`npm run lint` 0（修复了 AvatarPicker 的 `exhaustive-deps` 警告）；`npx vitest run` 全 passed、exit=1 仅来自沙箱 `Temp\web` EPERM 噪音（0 断言失败）。本轮 8 个改动代码文件全 LF，`git diff --check` 0。

### 10.6 CSS 基线偏离（§18）清理

范围只覆盖**本次变更集新增/改动**的 CSS；`git diff HEAD` 逐行核对确认：`avatar.css`(487) 与 `onboarding.css`(409) 为全新文件（全部在范围），`blog.css` 有 9 条新增偏离行，`components.css` 有 4 条新增偏离行。`settings.css` / `welcome.css` 无新增偏离。

| 文件 | 修复项 | 说明 |
| --- | --- | --- |
| `avatar.css` | `font-size:19px`→`--mc-font-xl`（表情网格）；`color:#ffffff`→`--mc-text-inverse`；取色器「+」`font-size:15px`→`--mc-font-md` | `border-radius:50%`（圆形头像/色板）保留——圆形是正确语义、非裸 px 圆角，且 50% 比 pill 更鲁棒 |
| `onboarding.css` | 入场动画 `320ms cubic-bezier(0.16,1,0.3,1)`→`var(--mc-dur-base) var(--mc-ease-spring)`（280ms<300ms）；裸圆角 `8px/9px/9px/12px`→`md/md/md/lg`；裸字号 `38/27/15/13/15/28/23px`→`hero/2xl/md/base/md/2xl/xl` | 原文件无任何硬编码色值（颜色全走 token + color-mix） |
| `blog.css` | chrome 圆角 `10px/9px/3px`→`md/md/sm`；徽标 `#fff`→`--mc-text-inverse`、`15px`→`md`；说明 `13px`→`base`；设备 bezel `8px solid #1a1d28`→`var(--mc-border-subtle)`（×2，`#1a1d28` 本是 token 值 `#1A1D26` 的字面复制） | **豁免（已加行内注释）**：`#fafafa`/`#c9c9c4`/`#2c2c2a` 为加载骨架「白纸+模拟文字」、`#fff` 为设备预览内的白底网页——属「描绘外部文档/网页内容」而非 app chrome，token 化会失真 |
| `components.css` | `.aurora-quit` 与 `.aurora-vault-warn` 的标题 `16px`→`--mc-font-lg`、说明 `13px`→`--mc-font-base` | 这两组是本次新增的退出确认 / 不可写告警组件 |

**刻意保留（有据）**：① `border-radius:50%` 圆形（头像/圆点/色板）；② hover 态 `background/color/border-color` 过渡——与 `tokens.css` §10 滚动条自身写法一致，且时长全为 `--mc-dur-*`、≤180ms；③ `blog.css` 的 `border-radius:2px`(379)、取色器色相环 `conic-gradient`(806)、`.badge-json #86efac`(1044) 与 `components.css` 的 `mask-image …#000`(814/815) 均为**历史代码**（不在本次变更集），且色相环/mask 属功能本身，不做改动。

**验证**：4 个 CSS 文件全 LF、花括号平衡、`git diff --check` 0、`postcss.parse` 4/4 通过；纯 CSS 改动，不影响 tsc / lint / vitest。

### 10.7 CI 门禁一致性（2026-11-08 夜）

**冲突**：`docs/CODE_REVIEW.md` 声称「CI 不存在 / OCR High 阻塞合并 / 合并标准含 OCR High=0」，而实际 `.github/workflows/code-review.yml` 的 OCR 步骤是 `continue-on-error: true`（不阻断）。

**定性（先查工具事实，再定方向）**：`ocr review --help` 确认 CLI **没有 severity 阈值开关**，退出码只在「所有被选文件审查失败」时非零，**发现 High 并不返回非零**。因此「去掉 `continue-on-error` 让 High 阻断」在技术上不成立；强行阻断需在 CI 里用 `--format json` 解析 severity 后 `exit 1`，且强依赖外部 LLM 可用——把 LLM 当硬合并门禁，会因 token 缺失或服务抖动误伤全部 PR。工作流注释本就写的是「补充定位，不阻断」，**是文档过期**，故选择「让文档如实反映现实」，而非制造一个脆弱的假门禁。

**修正 `docs/CODE_REVIEW.md`**：
- §1：CI 行从「不存在」→「已落地，硬门禁 tsc×3+vitest+lint；OCR 辅助」；「核心缺口」段落改为「门禁已补齐并阻断，OCR 为辅助、High 由 reviewer 人工把关」。
- §3 步骤 3：标题「建议启用」→「已启用」；明确「硬门禁（阻断）= tsc×3 / vitest / lint」「OCR = 辅助、不自动阻断，High 人工把关；若要机器阻断须解析 json severity 后 exit 1」。
- §3 步骤 5：合并标准「CI 全绿（…OCR High=0）」→「CI 硬门禁全绿 + OCR High 由 reviewer 确认修复或接受」。
- §7.1：High「阻塞」标注为「由 reviewer 人工阻塞；`ocr` 本身不按级别退出」。
- §7.3：删除过期「建议模板」（含误导的 `# High 项由后续步骤转 blocking`、`--from main`），改为「已落地」的真实描述 + 为何不阻断 + 可选机器阻断方案。
- §7.1 / §7.2：示例 `--from main`→`--from master`（本仓库默认分支）。

**修正 `.github/workflows/code-review.yml`**：补充注释说明 `ocr review` 的退出码事实，防止后来者误删 `continue-on-error` 以为能让 High 阻断。

**验证**：`docs/CODE_REVIEW.md` 无残留过期表述（`CI 不存在`/`建议启用`/`OCR High=0`/`--from main` 全部清零）；工作流 YAML 经 `js-yaml` 解析通过（job `gate`，7 steps）；两文件全 LF。

> ⚠️ **后续更正（见 §12）**：本节把 CI 描述为「已落地」**不准确**——仓库远端是 **Gitee**，而工作流是 **GitHub Actions**，后者不会在 Gitee 上触发，故 CI 实际**未生效**。已据此二次修正 `CODE_REVIEW.md`，详见 §12。

## 11. S0 打包冒烟（2026-11-08 夜）

`CODE_REVIEW.md` §2 对 S0 要求「全量测试 + 打包冒烟」。本次用**全新输出目录 `release-v9`**（规避 EBUSY asar 锁）跑通全链。

**构建链**：`npm run build`(tsc+vite) → `electron:compile`(esbuild) → `electron:prepare-dist`(预解压 `.electron-dist`) → `electron-builder --win --x64`。四阶段均 **exit 0**，总耗时约 14 分钟（node_modules 搜索 + nsis 编译较慢）。

**产物**（`release-v9/`）：

| 文件 | 大小 | SHA256 |
| --- | --- | --- |
| `MarkCraft-Setup-1.0.0-x64.exe` | 210,688,188 B（200.9MB） | `4521dfa605395ea21e8af7b3ad20e375129f2143de861537e754523abdac0389` |
| `MarkCraft-Portable-1.0.0-x64.exe` | 210,407,338 B（200.7MB） | `23d5d77ba7d1411dbab4f79f5cc8881d284881652f77a1f827f2b44a527b059a` |
| `MarkCraft-Setup-1.0.0-x64.exe.blockmap` | 221,211 B | — |

**asar 完整性**（`resources/app.asar`，335.9MB / 16232 条目）：
- 入口齐全：`out/main/index.mjs`、`out/preload/index.cjs`、`dist/index.html`、`package.json`（`main` = `out/main/index.mjs`）；渲染产物 12 个 `dist/assets/*.js`。
- **新代码确已编入**：main bundle（28KB）含 `authorized-vault-roots.json`、`evaluateVaultRoot`、`parseAuthorizedRoots`、`safeFetch`、`mc:vault:registerRoot` 全部标记 → C-1 / H-1 / H-2 / H-3 的修复确实进了产物，不是只在源码里。
- `extraResources`：`resources/pandoc/win/pandoc.exe`（224.6MB）就位。

**首次启动**：直接运行 `win-unpacked/MarkCraft.exe`，进程**稳定存活 10s、无 stderr/stdout 报错、无崩溃**（`alive_after_10s: true`）。Electron 解析规则下 `resources/app.asar` 优先于 `default_app.asar` 被加载，故运行的是本应用。

**数字签名**：三个 exe 均 `Status=NotSigned`（未配 `CSC_LINK`）。**SmartScreen 会拦截**。**用户 2026-11-09 决定不做（wontfix）**——接受未签名分发的 SmartScreen 拦截提示，不配 `CSC_LINK`、不补签。

**遗留 / 说明**：
- `authorized-vault-roots.json` 的**运行时读写需交互授权 Vault 才触发**，headless 冒烟无法完成；其序列化/校验逻辑由 `vaultRootPolicy.test.ts`（11 例）覆盖，路径为标准 `app.getPath('userData')`（已确认主进程无自定义 setName/setPath）。
- asar 内含生产 `node_modules`（16232 条、335MB），产物约 200MB；可考虑 `files` / `asarUnpack` 优化瘦身，**非上线阻断项**。
- `resources/default_app.asar` 随 `.electron-dist` 一并保留（Electron 默认 app 兜底），不影响加载（app.asar 优先），属已知冗余。

**结论**：S0 打包冒烟**通过**（构建 / 产物 / asar / 新代码编入 / 首启稳定）。数字签名缺失**非遗漏**——用户 2026-11-09 明确决定不做代码签名（wontfix），接受未签名分发的 SmartScreen 提示。

## 12. CI 实跑（2026-11-08 夜）——根因：Gitee 仓库 × GitHub Actions

**目标**：真正跑一次 CI（而非本地零散命令）。

**阻塞根因（新发现，比 `continue-on-error` 更根本）**：
- 仓库远端是 **Gitee**（`gitee.com/James-fake/markcraft`），而 CI 是 **GitHub Actions**（`.github/workflows/code-review.yml`）。GitHub Actions 只在 GitHub 仓库的 PR 上运行，**在 Gitee 上不会触发** → 这套 CI 从未、也不会自动运行。这正是「103+ 改动从未经过 CI」的真正根因。
- 环境内无 `act`（本地跑 Actions）、无 `docker`、无 `gh`（建 PR），故无法本地模拟或走 PR 触发。
- 结论：**「CI 实跑」在当前托管方式下不可达**——不是命令问题，是平台问题。

**已交付的最忠实等价物——按工作流 gate 的完全相同命令本地实跑**（`tsc×3 && vitest && lint`）：

| 步骤 | 结果 |
| --- | --- |
| `tsc --noEmit && typecheck:electron && typecheck:e2e` | **0** |
| `npx vitest run` | **203 文件 / 2230 passed, 2 skipped，0 断言失败**；进程 exit=1 仅因沙箱 `Temp\web` EPERM unhandled error（干净 runner 无此 shim，预期 exit 0） |
| `npm run lint` | **0** |

**修正文档**：`docs/CODE_REVIEW.md` §1/§3/§7.3 从「CI 已落地/已启用」改为「GitHub Actions 配置已提交，但仓库在 Gitee → 不生效；需迁移 Gitee Go 或镜像 GitHub；合并前须本地实跑等价门禁」；§10.7 已加更正指针。

**落地路径（二选一，需仓库侧操作）**：
1. **迁移 Gitee Go**：在 `.workflow/` 下建 `MasterPipeline.yml` / `PRPipeline.yml`，步骤同 gate（`npm ci` → tsc×3 → vitest → lint）；需在 Gitee 仓库开启 Gitee Go（并绑定手机号）。Gitee Go 的 YAML 语法须以其官方模板为准（本地无法验证，故未擅自提交可能出错的配置）。
2. **镜像到 GitHub**：加 GitHub remote 并 push，启用现成 Actions 工作流。

**结论**：CI **未能实跑**（平台不匹配，非配置错误）；本地等价门禁**全绿**（vitest 的 exit=1 是沙箱噪音，非断言失败）。要真正自动化，必须先解决 Gitee/GitHub 托管问题。

## 13. 质量补齐（Medium 批量修复，2026-11-08 夜）

按用户要求「一定要补质量」，修复 §6 剩余约 19 条 Medium（数据完整性优先），并在过程中发现并修复了一个 **O(n²) 性能回归**（全量测试一度挂起 12 分钟）。

### 13.1 数据完整性（6 条）
| 文件 | 修复 | 回归测试 |
| --- | --- | --- |
| `legacyIdbMigrate.ts` | 空库（open 新建 / 无预期仓库）**不再 markDone**；读取失败 reject 而非返回 `[]`；打开失败不 markDone（保留可重试） | `legacyIdbMigrate.test.ts`（4 例） |
| `backupService.ts` + `vaultService.ts` | `persistFiles` 改 await；新增 `flushVault()` / `flushSync()`（取消防抖、跑完串行链）；退出前冲刷 | `backupService.test.ts`（3）+ `FileStore.vaultWrite.test.tsx`（3） |
| `FileStore.tsx` | `registerRoot` await 后再 `loadVault` | `FileStore.vaultWrite`（registerRoot 门闩用例） |
| `MigrateWizard.tsx` | `uniqueName` 预占目标文件夹现有节点名 | `MigrateWizard.test.tsx`（3 例） |
| `useFileTreeActions.ts` | `moveNode` 判定移到 updater 外同步计算（+ `pendingCreatedIdsRef`） | `useFileTreeActions.guard.test.tsx`（+2 例） |
| `SettingsStore.tsx` | 老用户缺 `theme` 一次性迁移为 `'dark'` | `SettingsStore.test.ts`（+5 例） |

### 13.2 解析 / 编码 / 渲染（5 组）
| 文件 | 修复 | 回归测试 |
| --- | --- | --- |
| `mdToHtml.ts` | `catch` 里 `logger.error` 记录堆栈（保留降级输出） | `mdToHtml.errorLog.test.ts`（2 例） |
| `customSyntax.ts` | 占位符递归还原 + 统一 `escapeHtmlAttr`/`escapeHtmlText` + 代码/公式隔离 | `customSyntax.test.ts`（+14 例） |
| `documentExporter.ts` | href 从未转义原文提取，消除 `&amp;amp;` | `documentExporter.test.ts`（3 例） |
| `htmlWrapper.ts` | mermaid `strict` 下 `htmlLabels:false` + SVG 经 `sanitizeSvg`（foreignObject 占位保护） | `htmlWrapper.test.ts`（4 例） |
| `giteeAdapter` / `githubAdapter` | owner/repo/branch 逐段 `encodeURIComponent` | `adapterUrlEncoding.test.ts`（5 例） |

### 13.3 UI / 测试配置（3 条）
- `AuroraShell.tsx`：dwell off-by-one 改为「闭包当前功能」（原 ref 存上一段导致重复上报 + 末段丢失）；`pagehide` 大小写修正 + 去掉 cleanup 里重复 `trackAppClose`；locale 改 getter（`client.ts` 支持 `string | (() => string)`，切换语言后上报最新值）。
- `setupTests.ts`：`defineProperty` 失败改 `console.warn` 留痕。
- `vitest.config.ts`：沙箱开关改**条件注入**（仅宿主存在 CodeBuddy 钩子时才传给 worker），仓库对普通 CI/本机保持干净。

### 13.4 主进程 S0（3 条）
- 引入 `PathPolicyError`（带 `code`），`exists`/`rename` 用 `instanceof` 替代中文字符串匹配；rename 里 `stat` 非 ENOENT 失败一律抛出（避免「目标存在但 stat 失败」被误当不存在而覆盖）。
- 导航防线：`distUrl` 改用 `dirname(DIST_INDEX)` 同基准 + 尾分隔符防前缀绕过；打包态拒绝非 `file:` 导航。
- `openFile`/`saveFile` 登记**父目录**（而非单文件）。

### 13.5 过程中发现并修复的 O(n²)（关键）
全量 vitest 一度挂起 12min+。逐文件差集定位到 `stressAndPerf.test.ts`，再用规模曲线确认是 **O(n²)**（500→531ms / 1000→2336ms / 2000→9312ms / 4000→41129ms）。根因：`restorePlaceholders` 对**每个占位符各扫全文一遍**（O(P×L)），20000 占位符 × 200KB → 分钟级（同步 CPU 循环，`testTimeout` 无法中断，表现为「挂起」）。**改为单次正则扫描全部占位符（O(L)）**：4000 组 **41129ms → 61ms**、20000 组 **~17min → 86ms**。这是本轮补质量最大的实质收获。

### 13.6 门禁（修复后复跑）
| 检查 | 结果 |
| --- | --- |
| `tsc --noEmit` / `typecheck:electron` / `typecheck:e2e` | **0 / 0 / 0** |
| `npm run lint`（max-warnings 0） | **0** |
| `npx vitest run` | **212 文件 / 2391 passed, 2 skipped，exit=0**（92.9s，无 EPERM、无挂起） |
| 94 个改动文件行尾 | 全 LF |

### 13.7 仍未处理（如实）
- **6 处循环依赖**（lint / canvas-v2 engine / blog templates / core storage / canvas 面板 / kb 面板）——耦合拆解是独立课题，本轮未做。
- 数字签名：**用户决定不做（wontfix，见 §11 注）**，非遗漏。
- CI 实跑（Gitee 平台不匹配，CI 在 Gitee 上永不触发）。

> 注：§7 的 **10 条 Low** 已于 **§14** 全部处理（9 条落地代码 + L8 核实已闭环），不阻断上线但已清零。

---

## 14. §7 的 10 条 Low 修复（2026-11-09 续，按规范不阻断但已处理）

| # | 文件 | 问题 | 修复 |
| --- | --- | --- | --- |
| L1 | `src/locales/en.ts:1797` | 英文 locale `searchPlaceholder` 夹中文「猫」 | 改为纯英文示例 `'Search emoji, e.g. "cat"'` |
| L2 | `electron/main/netGuard.ts` | 逃生口 `MARKCRAFT_ALLOW_PRIVATE_NET=1` 启用无告警（SSRF 防护被关却静默） | `allowPrivateNet()` 内加一次性 `console.warn` 显式告警（运维/用户知情），`warnedPrivateNet` 防刷屏 |
| L3 | `index.html:9` | `theme-color` 硬编码深色 `#0A0B0F` | 解析主题脚本里随 `resolved` 主题写入 `#0A0B0F`（深）/ `#ffffff`（浅），与 `base.css` 浅色 `--app-bg` 对齐 |
| L4 | `src/aurora/panels/blog/BlogPanel.tsx` | iframe `srcDoc` 去重导致 `onLoad` 不触发、覆盖层卡 busy 露空白 | 新增 `prevSrcDocRef`，`useLayoutEffect` 中若新 srcDoc 与已渲染相同则直接 `setIsPreviewBusy(false)`，无需等 onLoad |
| L5 | `src/features/editor/perfProbe.ts` | `recordKeyStroke` 仅注释「由调用方守卫」、自身无 DEV 守卫 | 函数首行加 `if (!import.meta.env.DEV) return`（生产 tree-shake 兜底） |
| L6 | `src/services/sessionSnapshot.ts` + `src/stores/FileStore.tsx` | `SessionTabSnapshot.isDirty` 写而不读（死字段） | 从接口、写入点（构造 `sessionTabs`）、恢复点移除；同步清理测试 `fileStoreShared.session.test.ts:107` 字面量 |
| L7 | `src/features/telemetry/client.ts:84` | 缓冲 > 单批上限时 `flushNow` 后不重排，应用关闭(beacon)时残留事件丢失 | splice 后 `if (buffer.length > 0) scheduleFlush()` |
| L8 | `src/stores/kbStore.ts:257-268` | `kbWriteQueues` 条目永不删除 | **已闭环（§10.1 L4）**：`withKbLock` 队列空闲且为当前尾节点时 `delete` 条目；本次核实无需改动 |
| L9 | `src/components/ui/Modal.tsx:105` | `animationend` 冒泡（子面板动画）可能提前 `finish()` 卸载遮罩、截断淡出 | 监听改为 `(e) => { if (e.target === overlay) finish() }`，仅遮罩自身动画收束才收束 |
| L10 | `src/aurora/styles/components.css:1168` | `.aurora-prose code` 裸 `font-size: 0.9em` 偏离 §18 字号纪律 | 改为 `var(--mc-font-sm)`（12px，最接近 `0.9em`≈11.7px 语义） |

### 14.1 门禁（修复后复跑，2026-11-09）
| 检查 | 结果 |
| --- | --- |
| `tsc --noEmit` / `typecheck:electron` / `typecheck:e2e` | **0 / 0 / 0** |
| `npm run lint`（max-warnings 0） | **0**（初报 1 处 unused `eslint-disable`，移除 `no-console` 指令后归零） |
| `npx vitest run` | **211 文件 / 2381 passed, 2 skipped**；1 处「未处理错误」为沙箱 `brokered-fs` EPERM 噪声（vitest 内部 `web/` 取缓存写 Temp 被宿主钩子拦截），与被改代码无关，普通 CI 无此钩子 → 干净 |

### 14.2 说明
- 全部 10 条 Low 中 9 条已落地代码改动，L8 经核实已于 §10.1 闭环、无需改动。
- 改动均落在「本次变更集」内（仅改被审代码，未触碰历史无关代码）；i18n 仅英文侧一行、未破坏三处同步。
- `isDirty` 仅从 `SessionTabSnapshot`（会话快照持久化层）移除；`FileTab` / `useAutoSave` / `mergeUnsavedEdits` 中的 `isDirty` 是另一套运行时脏标记，保持不变（grep 已确认无交叉引用）。
- `htmlWrapper` 真实图表渲染、GitHub/Gitee 带斜杠分支的真实部署未端到端验证（单测只校验构造/语法）。
