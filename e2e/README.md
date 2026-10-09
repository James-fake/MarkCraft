# MarkCraft 真机 E2E 测试（Playwright + Electron）

这一层补的是 **jsdom 单测覆盖不到的「真实运行」**：真实 Electron 窗口、真实磁盘读写与 Vault 落盘、
`fs.watch` 外部改动跟随、主进程网络代理、Pandoc 真 EPUB、打包产物冒烟、安装向导默认存储位置等。

> ⚠️ **本项目只做桌面端**，所有用例都经 `_electron.launch()` 起真实 Electron。
> 原先的浏览器用例（`00-boot` … `08-longtail`）与 `browserPlatform` 已随「移除网页形态」一并删除。

## 运行

```bash
npm run e2e            # 跑全部 E2E（自动复用/拉起 dev server）
npm run e2e:ui         # Playwright UI 模式（可视化调试）
npm run e2e:report     # 打开上次的 HTML 报告
```

单文件 / 单用例：

```bash
npx playwright test e2e/14-electron-vault-crud
npx playwright test e2e/14-electron-vault-crud -g "重命名"
```

## 前置条件

- **`npm run electron:compile`**：多数用例直接启动 `out/main/index.mjs`，需要先编译主进程/preload。
- 打包态用例（`13` / `18`）另需 `npm run electron:pack`（或 `electron:dist:win`）产出 `release*/win-unpacked`；
  未产出时这些用例 **skip** 而非 fail。
- `@playwright/test` 已在 devDependencies 中，无需下载浏览器内核（用例不驱动浏览器）。

## 目录结构

| 文件 | 覆盖范围 |
| --- | --- |
| `09-electron.spec.ts` | 桌面壳：窗口启动、preload 注入 `window.markcraft`、安全基线（contextIsolation） |
| `10-electron-fs.spec.ts` | 真实 fs IPC：读写、原子写、递归读目录、隐藏项、错误语义 |
| `11-electron-vault.spec.ts` | Vault 模式：读入磁盘真实 `.md`、递归子目录、点开头项不进树 |
| `12-electron-vault-watch.spec.ts` | `fs.watch`：外部新增/删除 → 文件树跟随 |
| `13-electron-packaged.spec.ts` | **打包产物**冒烟：起窗渲染、无致命 console error、打包态 Pandoc 可解析 |
| `14-electron-vault-crud.spec.ts` | 界面操作 → 磁盘：新建/重命名/删除真实落盘 |
| `15-electron-vault-migrate.spec.ts` | IndexedDB 旧笔记 → Vault 一次性迁移引导 |
| `16-electron-net.spec.ts` | 主进程网络代理：POST 透传、超时 → `NET_TIMEOUT` |
| `17-electron-pandoc.spec.ts` | Pandoc sidecar：Markdown → 真 EPUB（无二进制时 skip） |
| `18-electron-default-vault.spec.ts` | 安装向导默认存储位置：UTF-16LE 解码、首启采用、新建落盘、右键「打开源文件位置」、优先于历史 lastVault |

## 与 jsdom 单测的分工

- **Vitest + jsdom**（`src/**/*.test.tsx`）：逻辑、纯函数、store、组件渲染与交互。jsdom 里没有
  preload 注入，`platform` 取到的是**测试替身** `src/platform/test.ts`（无 fs / 无对话框）。
- **Playwright E2E**（`e2e/**`）：上面替身拿不到的那部分 —— 真实磁盘、真实 IPC、真实打包产物。

## 已知环境注意（本地沙箱 / CI）

1. **dev server 需绑 `127.0.0.1`**：Vite 默认只绑 IPv6（`::1`），而 Playwright 的 webServer 存活探测
   走 IPv4 → 会误判「服务没起」而自行拉起第二个 dev server。配置里已用 `npm run dev -- --host 127.0.0.1`。
   开发态的 Electron 主进程会加载该 dev server（打包态才走 `file://`）。
2. **`CODEBUDDY_SAFE_DELETE_ENABLED=0`**：某些沙箱的批量删除守卫会拦截 Playwright 对 `test-results` 的清理，
   直接 kill 掉测试进程。
3. **不录屏**：`video` 需要 ffmpeg 二进制，故关闭；失败时保留 `trace`（含 DOM 快照）与截图。
4. **跑测可能停在 teardown**：部分环境下用例全跑完、报告已出，但进程不退出（打包态应用关闭较慢）——
   看结果以日志里的用例行/汇总为准，必要时手动结束进程。

## 写新用例的约定

- 直接 import `@playwright/test` 的 `_electron`，用 `electron.launch({ args: [MAIN_MJS], env })` 起应用。
- 必须清掉 `ELECTRON_RUN_AS_NODE`（MSYS 会注入，导致 Electron 退化为纯 Node）；开发态加
  `MARKCRAFT_DISABLE_GPU=1` + `MARKCRAFT_NO_SANDBOX=1`。
- 需要隔离 IndexedDB / localStorage 时传 `--user-data-dir=<tmp>`。
- 需要避免原生对话框时用测试钩子（如 `MARKCRAFT_TEST_OPEN_DIR`）或 `addInitScript` 预置 `localStorage`。
- 选打包产物按 **exe 文件自身 mtime 降序**（机器上常残留多个 `release*` 目录）。
