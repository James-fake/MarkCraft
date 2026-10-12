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
| 三处 `tsc` 类型检查 | src / electron / e2e | 无 CI 在合并前自动跑 |
| **CI 工作流** | —— | **不存在**（`.github/` 仅 PR 模板） |

**核心缺口**：缺少「逐行自动审查」与「合并前门禁」。本文件 + `.opencodereview/rule.json` + 建议的 CI 一并补齐。

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

### 步骤 3 — 自动审查门禁（CI，建议启用）
- **lint + 三处 tsc + vitest** 作为 PR 必过检查（见 §7 CI 模板）。
- **OpenCodeReview 自动评论**：CI 中跑 `ocr review --from main --to <branch>`，按 `.opencodereview/rule.json` 出 High/Medium/Low 评论；**High 项阻塞合并**。
- 仅依赖既有 husky 不足以守住合并，CI 是合并前最后一道自动闸。

### 步骤 4 — 人工评审（reviewer）
reviewer 按 §5 通用清单 + §6 专项清单逐条核对，重点不是「找风格问题」，而是：
- 改动是否落在正确的架构层（分层方向）
- 是否有本项目已知的陷阱复发（行尾、i18n、Electron 边界、打包）
- 失败处理是否真实（而非吞异常）

### 步骤 5 — 合并标准
满足**全部**方可合并：
- CI 全绿（lint / tsc×3 / vitest / OCR High=0）
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
- [ ] **UI 设计基线**：改 `src/aurora` 须过 §18 闸门（token 色值、圆角、字号、动效 < 300ms、危险操作右置、弹层走 Modal、可达性）。
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
ocr review --from main --to <branch>               # 审分支
```
- 项目规则：仓库根 `.opencodereview/rule.json`（覆盖分层守卫 / i18n / Electron 边界 / 设计基线 / 行尾 / 测试噪音 + 系统通用规则）。
- 评论分级：bug 与安全问题 = High（阻塞）；吹毛求疵与误报被静默丢弃。

### 7.2 本地 pre-push 接入（可选）
在 `.husky/` 加 `pre-push` 钩子跑 `ocr review --from main --to HEAD`，把 OCR 推到合并前最后一关（需本机已配 LLM）。

### 7.3 CI 工作流（建议，需配置 `secrets.OCR_LLM_TOKEN`）
```yaml
# .github/workflows/code-review.yml
name: code-review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit && npm run typecheck:electron && npm run typecheck:e2e
      - run: npx vitest run
      - run: npm i -g @alibaba-group/open-code-review
      - run: ocr config set llm.auth_token ${{ secrets.OCR_LLM_TOKEN }}
      - run: ocr config set llm.model <your-model>
      - run: ocr review --from main --to ${{ github.head_ref }} --audience agent
        continue-on-error: true   # High 项由后续步骤转 blocking
```
> 落地前需：① 提交本 `code-review.yml`；② 在仓库 Secrets 配置 `OCR_LLM_TOKEN` 与模型；③ 将 OCR High 评论转为 PR 的 required review。

---

## 8. 附则

- 本标准为「活文档」：随架构演化（如分层守卫范围调整、新陷阱出现）由 reviewer 在 PR 中同步更新本文件。
- 与现有「设计基线 §18」「PR 模板 ui.md」互补，不替代——UI 闸门仍是 UI PR 的合并前提。
- 审查不是挑刺：优先拦住「会破坏架构/数据/打包」的 High 项，Low 级风格问题以建议形式给出。
