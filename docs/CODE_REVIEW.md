# MarkCraft 代码审查标准与流程

> 目的：把「代码质量参差不齐」的现状，收敛为一套可执行、可审计的代码审查机制。
> 适用范围：所有进入 `master` 的改动（`src/`、`electron/`、`scripts/`、`docs/` 中与代码相关的部分）。
> 配套工具：OpenCodeReview（`ocr`）+ husky + lint-staged + vitest + tsc。项目级审查规则见仓库根 `.opencodereview/rule.json`。

---

## 1. 现状与机制缺口

| 已有机制 | 作用 | 缺口 |
| --- | --- | --- |
| `husky` pre-commit → `lint-staged` | 仅对暂存文件跑 `.eslintrc.guard.cjs` | 只查**分层守卫**（`local/no-aurora-ui-import`），不审逻辑/安全/质量 |
| `.eslintrc.cjs` 主配置 | eslint:recommended + TS + react-hooks | 规则多为 `warn`，**不阻断**合并 |
| PR 模板 `ui.md`（§18 闸门） | UI 改动 14 项自查 | 纯人工勾选，无自动校验 |
| 三处 `tsc` 类型检查 | src / electron / e2e | 本地必跑；CI 自动化待迁移（见下行） |
| **CI 工作流** | `.github/workflows/code-review.yml`（**GitHub Actions**）：tsc×3 + vitest + lint 硬门禁 + OCR 辅助 | **仓库托管在 Gitee，GitHub Actions 不会触发 → 当前 CI 实际未生效**；需迁移 Gitee Go（`.workflow/*.yml`）或镜像到 GitHub |

**核心缺口**：门禁**内容**已就绪（tsc×3 / vitest / lint，本地等价实跑全绿），但**承载平台不匹配**——工作流是 GitHub Actions，仓库在 Gitee，故当前 CI **不自动运行**；需迁移 Gitee Go 或镜像 GitHub。逐行 AI 审查（OCR）为**辅助定位**：`ocr review` 不按发现严重级别返回非零，High 项由 reviewer 人工把关，不自动阻断。

---

## 2. 审查分级（按改动风险）

| 级别 | 触发条件 | 审查强度 |
| --- | --- | --- |
| **S0 红线** | 改动 `@platform` / `electron/` / `src/locales` / 分层守卫 / 打包配置 | 必须两人 review + 全量测试 + 打包冒烟 |
| **S1 高影响** | 改动 `src/aurora`（UI）、`src/stores`、导入管线、模板系统 | 一人 review + 相关冒烟测试 |
| **S2 常规** | 新功能、重构、bug 修复 | 一人 review |
| **S3 轻微** | 文案、样式微调、注释、文档 | 作者自检即可，可不 blocking |

> 分级用于决定 reviewer 数量与测试范围，**不降低**通用与专项检查清单的适用性。

---

## 3. 审查流程（5 步）

### 步骤 1 — 提交前自检（作者）
本地必须全绿，否则不提 PR：
```bash
npx tsc --noEmit                 # src 类型
npm run typecheck:electron       # electron 主进程类型
npm run typecheck:e2e            # e2e 类型
npx vitest run                   # 单元/冒烟（147 用例基线）
npm run lint                     # eslint（含分层守卫，max-warnings 0）
```
- 确认本次改动未引入 mixed 行尾假 diff（`git ls-files --eol <改动文件>` 排查）。
- 如改了 `src/locales`，确认 zh/common.ts / en.ts / zh/index.ts **三处同步**。

### 步骤 2 — 创建 PR（作者）
- 用 `.github/PULL_REQUEST_TEMPLATE/ui.md`：UI 改动逐条勾 §18 闸门；非 UI 注明「不涉及 UI」。
- PR 描述写清：背景、改动范围、风险级别（S0–S3）、自测结果、是否需重新打包。

### 步骤 3 — 自动审查门禁（CI，已配置但当前不生效）
> ⚠️ **平台不匹配**：工作流是 GitHub Actions（`.github/workflows/code-review.yml`），但仓库托管在 **Gitee**（`gitee.com/James-fake/markcraft`），GitHub Actions **不会触发** → 当前 CI 不自动运行。要在 Gitee 上真正自动跑，需接 **Gitee Go**（`.workflow/*.yml`）或把仓库镜像到 GitHub。在此之前，合并前须**本地实跑**下列等价命令。
- **硬门禁（阻断合并）**：`lint + 三处 tsc + vitest`，任一失败即打回（本地实跑等价；CI 自动化待迁移）。
- **OpenCodeReview（辅助，不自动阻断）**：CI 中跑 `ocr review`，按 `.opencodereview/rule.json` 出 High/Medium/Low 评论。**注意**：`ocr review` 不按发现严重级别返回非零退出码，无法在 CI 层按 High 自动阻断；High 项由 reviewer 在 PR 中人工把关（见步骤 5 / §6）。若将来要机器阻断，须在 CI 中解析 `--format json` 的 severity 并显式 `exit 1`（见 §7.3 备注）。
- 仅依赖既有 husky 不足以守住合并，CI 的硬门禁是合并前最后一道自动闸。

### 步骤 4 — 人工评审（reviewer）
reviewer 按 §5 通用清单 + §6 专项清单逐条核对，重点不是「找风格问题」，而是：
- 改动是否落在正确的架构层（分层方向）
- 是否有本项目已知的陷阱复发（行尾、i18n、Electron 边界、打包）
- 失败处理是否真实（而非吞异常）

### 步骤 5 — 合并标准
满足**全部**方可合并：
- CI 硬门禁全绿（lint / tsc×3 / vitest）
- OCR 报告的 **High 项已由 reviewer 确认修复或明确接受**（OCR 不自动阻断，须人工把关）
- 至少 1 名 reviewer Approval（S0 需 2 名）
- 所有 reviewer 提出的 Medium 已修复或记录为 follow-up
- 关联 issue / 模板勾选完整

---

## 4. 通用审查清单（所有改动）

- [ ] 类型安全：无 `any`、无 `as` 滥用、未用变量以 `_` 前缀
- [ ] 空值/Null 安全：可空字段有兜底，避免 NPE（OCR 系统规则会查）
- [ ] 错误处理：不吞异常；失败路径有真实处理或明确注释
- [ ] 性能：不在 render 中创建大对象/函数；避免不必要的重渲染
- [ ] 并发/异步：async 有 await；竞态有防护（如文件监听防抖、Vault 回显抑制）
- [ ] 测试：关键逻辑有单测；bug 修复带回归测试；测试针对行为而非实现
- [ ] 可读性：命名达意；复杂逻辑有注释；无大段死代码
- [ ] 安全：不泄露密钥；外部输入经 sanitize（如 `sanitizeHtml`、`sanitizeMermaidSvg`）

---

## 5. MarkCraft 专项审查清单（项目特有，必查）

- [ ] **分层守卫**：`src/features|stores|services` 未 import `src/aurora`（含 `@aurora` 与相对 `../aurora`）。（红线，eslint `local/no-aurora-ui-import` error 级）
- [ ] **i18n 三处同步**：新增/改文案键，zh/common.ts + en.ts + zh/index.ts 类型三处齐备。
- [ ] **行尾一致性**：改动文件非 mixed 行尾；若误改产生假 diff，用 `git cat-file` 取原始字节修复，禁止直接 Edit 重写。
- [ ] **Electron 边界**：业务代码经 `@platform`，无直接 `require('electron')` / 读 `window.markcraft`；`mc:*` IPC 通道三处同步（preload / `types/electron.d.ts` / `src/platform/electron.ts`）。
- [ ] **pre-commit 守卫陷阱**：新增的 `eslint-disable` 指令引用的规则名，其插件必须在 `.eslintrc.guard.cjs` 的 `plugins` 中加载，否则 ESLint 报「Definition for rule ... was not found」假错误卡提交。
- [ ] **打包陷阱**：改打包配置（`build` 字段 / `electron-builder`）时，知悉 EBUSY（Defender 锁 asar）/ EPERM（rename）/ safe-delete 限制；优先换全新输出目录重试。
- [ ] **UI 设计基线**：改 `src/aurora` 须过 §18 闸门（token 色值、圆角、字号、动效 < 300ms、危险操作右置、弹层走 Modal、可达性）。（**豁免提示**：非模态锚定气泡浮层 `AvatarPicker.tsx` 见 §18 §3.4 例外、用户头像个性化配色见 §18 §4.1 豁免，均为 2026-11-08 经产品决策拍板的需求驱动规范偏离 + 显式豁免，勿按「弹层走 Modal / 禁硬编码 hex」旧表述打回。）
- [ ] **测试噪音识别**：jsdom 下 Dexie `MissingAPIError` 是环境噪音，不代表失败；多文件并行 `vitest` 的 `Temp\web` EPERM 中断同理。

---

## 6. 红线（Blocking / High，违反即打回）

1. 反向依赖守卫被破坏（逻辑层 import `src/aurora`）。
2. `src/locales` 三处不同步导致类型错误或运行时缺翻译。
3. 直接在渲染进程读 `window.markcraft` 或 `require('electron')`。
4. 引入硬编码密钥、未 sanitize 的外部输入、或会真实破坏用户数据的操作（无确认/无备份）。
5. 把整个文件因行尾/格式化重写，产生与改动无关的巨型 diff。
6. 跳过既有测试或 `@platform` 契约，导致打包态功能退化（如 Pandoc 解析分支未覆盖）。

---

## 7. 工具链集成

### 7.1 OpenCodeReview（逐行 AI 审查）
```bash
npm install -g @alibaba-group/open-code-review   # 安装 ocr CLI（本机已有受管 Node）
ocr config provider                              # 配置 LLM（交互式）
ocr llm test                                      # 连通验证
ocr review --audience agent --background "业务背景" # 审工作副本
ocr review --from master --to <branch>             # 审分支
```
- 项目规则：仓库根 `.opencodereview/rule.json`（覆盖分层守卫 / i18n / Electron 边界 / 设计基线 / 行尾 / 测试噪音 + 系统通用规则）。
- 评论分级：bug 与安全问题 = High（**由 reviewer 人工阻塞合并**；`ocr review` 本身不按级别退出）；吹毛求疵与误报被静默丢弃。

### 7.2 本地 pre-push 接入（可选）
在 `.husky/` 加 `pre-push` 钩子跑 `ocr review --from master --to HEAD`，把 OCR 推到合并前最后一关（需本机已配 LLM）。

### 7.3 CI 工作流（配置已提交，但当前不生效：Gitee × GitHub Actions）
> ⚠️ **托管平台不匹配**：本仓库远端是 **Gitee**（`gitee.com/James-fake/markcraft`），而本工作流是 **GitHub Actions**（`.github/workflows/code-review.yml`）。GitHub Actions 只会在 GitHub 仓库的 PR 上运行，**在 Gitee 上不会触发**。因此当前 CI 实际**不生效**。两条落地路径：① 迁移 **Gitee Go**（在 `.workflow/` 下写 `MasterPipeline.yml` / `PRPipeline.yml`，步骤同下，用 Gitee Go 的 npm/script 插件）；② 把仓库镜像到 GitHub 并启用 Actions。在此之前，合并前须本地实跑等价门禁（已实跑通过：tsc×3=0 / lint=0 / vitest 全 passed）。
- 触发：`pull_request` → `master`（仅在 GitHub 托管时生效）。
- **硬门禁（阻断合并）**：`npx tsc --noEmit && npm run typecheck:electron && npm run typecheck:e2e`、`npx vitest run`、`npm run lint`——任一失败 PR 变红。
- **OpenCodeReview（辅助，`continue-on-error: true`）**：需 Secrets `OCR_LLM_TOKEN` + `OCR_LLM_MODEL`；`ocr review --from master --to "$GITHUB_HEAD_REF" --audience agent`。**不自动阻断**，原因见下。

> **为什么 OCR 不阻断**：`ocr review` 的退出码只在「所有被选文件都审查失败」时非零，**不会因发现 High 而失败**（`--help` 无 severity 阈值开关）。因此无法靠去掉 `continue-on-error` 让 High 阻塞；强行阻断需在 CI 里用 `--format json` 解析 severity 并 `exit 1`，且强依赖 LLM 可用——把外部 LLM 当硬合并门禁，会因 token 缺失或服务抖动误伤全部 PR，故本项目定位为「辅助 + reviewer 人工把关」。
>
> **若确需机器阻断 High**（可选，谨慎）：在 OCR 步骤后追加一步——`ocr review --format json -o report.json`，再用 `jq`/node 检测是否存在 `severity=="high"`，有则 `exit 1`。仅在该 Secret 必配、且接受 LLM 抖动风险时启用。

---

## 8. 附则

- 本标准为「活文档」：随架构演化（如分层守卫范围调整、新陷阱出现）由 reviewer 在 PR 中同步更新本文件。
- 与现有「设计基线 §18」「PR 模板 ui.md」互补，不替代——UI 闸门仍是 UI PR 的合并前提。
- 审查不是挑刺：优先拦住「会破坏架构/数据/打包」的 High 项，Low 级风格问题以建议形式给出。
