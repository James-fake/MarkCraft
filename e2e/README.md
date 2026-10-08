# MarkCraft 真机 E2E 测试（Playwright）

这一层补的是 **jsdom 单测覆盖不到的「真实运行」**：真实布局、真实 canvas / Excalidraw 绘制、
真实 IndexedDB 持久化、文件下载落盘、首屏开屏动画与主题防闪烁、PWA 等。

## 运行

```bash
npm run e2e            # 跑全部 E2E（自动复用/拉起 dev server）
npm run e2e:ui         # Playwright UI 模式（可视化调试）
npm run e2e:report     # 打开上次的 HTML 报告
```

单文件 / 单用例：

```bash
npx playwright test e2e/02-editor.spec.ts
npx playwright test e2e/02-editor.spec.ts -g "往返"
```

## 前置条件

- 使用**系统已安装的 Edge**（`channel: 'msedge'`），无需下载浏览器内核。
- 首次运行前如未装依赖：`npm i -D @playwright/test`（已在 devDependencies 中）。

## 目录结构

| 文件 | 覆盖范围 |
| --- | --- |
| `fixtures.ts` | 诊断收集（console error / pageerror）+ 导航辅助（`gotoView` / `gotoAuxView` / `waitForAppReady` / `skipSplash`） |
| `00-boot.spec.ts` | 应用启动、默认落点、深链 |
| `01-shell.spec.ts` | 开屏动画、主题/密度防闪烁、菜单栏、命令面板、侧栏、状态栏 |
| `02-editor.spec.ts` | 新建笔记、源码/所见即所得双模式、MD↔富文本往返、工具栏 |
| `03-files.spec.ts` | 拖拽导入、空态文件列表、同名去重、IndexedDB 持久化 |
| `04-io.spec.ts` | 另存为（12 格式 + 真实下载）、导入（html/txt → Markdown） |
| `05-kb.spec.ts` | 知识库 7 个 Tab、双链图谱 SVG 渲染与导航浮层 |
| `06-canvas.spec.ts` | 白板 Excalidraw 真机挂载、视图切换、白板列表/回收站 |
| `07-blog.spec.ts` | 博客工作室、主题市场全量展示、主题切换驱动预览 |
| `08-longtail.spec.ts` | 日记、设置、主题切换、全局搜索、快捷键、PWA（需生产构建） |

## 与 jsdom 单测的分工

- **Vitest + jsdom**（`src/**/*.test.tsx`）：逻辑、纯函数、store、组件渲染与交互（大量浏览器 API 被桩掉）。
- **Playwright E2E**（`e2e/**`）：上面桩掉的那部分 —— 真实渲染、真实存储、真实下载、真实资源加载。

## 已知环境注意（本地沙箱 / CI）

1. **dev server 需绑 `127.0.0.1`**：Vite 默认只绑 IPv6（`::1`），而 Playwright 的 webServer 存活探测
   走 IPv4 → 会误判「服务没起」而自行拉起第二个 dev server。配置里已用 `npm run dev -- --host 127.0.0.1`。
2. **代理**：若环境设置了 `http_proxy`，浏览器需 `--no-proxy-server` 直连本地（配置已内置）。
3. **不录屏**：`video` 需要 ffmpeg 二进制，故关闭；失败时保留 `trace`（含 DOM 快照）与截图。
4. **产物清理**：跑之前若 `test-results/` 累积过大，某些沙箱的批量删除守卫会拦截 Playwright 的清理 ——
   先手动 `rm -rf test-results e2e-report` 再跑即可。

## 写新用例的约定

- 用 `fixtures.ts` 的 `test`（自带 `diag` 诊断），**不要**直接 import `@playwright/test`。
- 非启动链路的用例先 `await skipSplash(page)` 跳过开屏动画提速。
- 主视图用 `gotoView(page, 'editor' | 'diary' | 'canvas' | 'graph' | 'kb' | 'blog')`；
  `welcome` / `settings` 是 aux 视图，用 `gotoAuxView`。
- 断言避免依赖 `toHaveText` 的精确文本（所见即所得默认开启实时预览，会带 markdown 标记），优先 `toContainText`。
