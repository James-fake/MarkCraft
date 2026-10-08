# 博客「一键发布」代码层修复说明

- **日期**：2026-10-08
- **范围**：`src/features/blog/services/`（部署链路）+ `DeployPanel` 展示层 + i18n
- **约束**：**5 个平台全部保留**；**Cloudflare 按要求暂不处理**
- **验证**：`tsc --noEmit` 通过；新增 7 条单测全绿；全量 vitest 无回归

---

## 一、为什么修

上一轮真机测试暴露出：这条链路**零测试覆盖**（`services/__tests__/` 下没有 `deployService.test.ts`，
也没有任何 `*Adapter.test.ts`），且从未被真机验证过。经代码核查 + 实测 + 官方文档比对，确认存在
多处会直接导致失败的缺陷。

---

## 二、修复清单

### 1. 🔴 `base_tree` 传错对象类型（GitHub / Gitee）—— 阻断性

**原实现**：`getBranchRef()` 取 `refs/heads/X → object.sha`（这是 **commit** SHA），直接当 `base_tree` 传给
`POST /git/trees`。

**为什么错**：GitHub 官方文档对 `base_tree` 的定义是
> "The SHA1 of an existing Git **tree object** which will be used as the base for the new tree...
> normally you'd set `base_tree` to the SHA1 of the Git **tree object** of the current latest commit."

即必须传 **tree 对象**的 SHA，而代码传的是 **commit** 的 SHA —— 两者是不同的 Git 对象、SHA 也不同。

**修复**：
- `PlatformAdapter.getBranchRef` → `getBranchHead`，返回 `BranchHead { commitSha, treeSha }`
  （`commitSha` 给 `createCommit` 的 `parents`，`treeSha` 给 `createTree` 的 `base_tree`）；
- 新增 commit→tree 解引用（`GET /git/commits/{sha}` → `tree.sha`）。

### 2. 🔴 Vercel 三处缺陷 —— 阻断性

| 项 | 原实现 | 问题 | 修复 |
| --- | --- | --- | --- |
| 上传摘要 | `crypto.subtle.digest('SHA-256')` | 官方：`x-vercel-digest` = "The file **SHA1** used to check the integrity"，`maxLength: 40`；SHA-256 是 64 字符 → **超限被 400 拒绝** | 改用 **SHA-1** |
| `files` 载荷 | `{ file: data?.uid \|\| path, path }` | 官方：引用已上传文件时形状为 **`{ file, sha, size }`**；且 `/v2/files` 响应体是 `{ urls }`，**根本没有 `uid`** | 改为 `{ file: path, sha: digest, size: byteLength }` |
| 部署 body | `{ projectId, files, target }` | 官方文档：`name` 为 **Required**，项目标识参数是 **`project`**（不是 `projectId`）；原实现两者皆错 | 改为 `{ name, project, files, target, projectSettings }` |

### 3. 🟠 分支回退硬编码 `main` —— 阻断性（特定账号）

**原实现**：目标分支（gh-pages）不存在时，直接读 `heads/main`。

**问题**：账号默认分支若是 `master`（老账号 / 企业设置），直接失败。

**修复**：解析顺序改为 **目标分支 → 仓库真实默认分支（`GET /repos/{owner}/{repo}` 的 `default_branch`）
→ main / master 兜底**；每个候选独立 try，全部不存在（空仓库）时返回 `null`。

### 4. 🟠 空仓库首提交无路径

**修复**：`createTree` 的 `base_tree` 与 `createCommit` 的 `parents` 均改为可空 —— 仓库无任何分支时
走「不基于已有 tree、无父提交」的首次提交，不再直接抛错。

### 5. 🟠 `configurePages` 静默吞错 → 假成功

**原实现**：`catch { /* may already be configured */ }` 一律吞掉。

**问题**：私有仓库开 Pages 需 GitHub Pro —— 被拒时用户仍会看到「部署成功 + 访问 URL」，但站点不可用。

**修复**：
- 适配器只在**幂等状态**（GitHub 409「已启用」；Gitee 400/409）时吞错，其余上抛；
- 新增 `DeployApiError`（携带 HTTP 状态码），替代原来丢状态码的裸 `Error`；
- 部署编排里 `configurePages` 失败**不中断部署**（内容已推送、启用是幂等可重试的），
  而是以 `warningKey` 附带「需手动启用 Pages」提示；
- `DeployPanel` 在成功态一并展示该警告 —— 把「假成功」变成「成功 + 明确告知」。

### 6. 🟡 附带修正

- Vercel 轮询兼容新字段 `readyState`（旧 `state` 作兜底），并识别 `CANCELED`。

---

## 三、测试覆盖（该链路首次有测试）

新增 `src/features/blog/services/__tests__/deployService.test.ts`（7 条，用可编程 fetch 桩）：

1. **GitHub：`base_tree` 必须是 tree SHA、`parents` 必须是 commit SHA**（直接钉死本次核心回归）；
2. GitHub：默认分支为 `master` 时也能解析；
3. GitHub：空仓库 → 不带 `base_tree` / 不带 `parents`；
4. GitHub：Pages 409（已启用）→ 成功且无警告；
5. GitHub：Pages 403（无权限）→ 成功 **+ 警告**（不再假成功）；
6. **Vercel：digest 为 40 位 SHA-1、`files` 形状为 `{file,sha,size}`、body 带 `name` 与 `project`**；
7. `validateDeployToken` 失败时抛出携带状态码的错误。

---

## 四、未处理（按要求保留）

- **Cloudflare Pages**：实测其 API **不支持 CORS**（OPTIONS 预检 400、响应无 `Access-Control-Allow-Origin`），
  浏览器直连必然被拦。按要求本次**不动**，平台入口保留。
  后续若要打通，需改为服务端中转或自建代理。
- **Gitee 鉴权头**：仍用 `Authorization: Bearer`（原实现如此，为避免引入新风险未改动）；
  若真机验证发现 Gitee 不接受该形式，需改用其支持的鉴权方式。
- **真机发布验证**：以上修复使代码与官方 API 契约对齐，但**「真的能发布成功」仍需一次真实部署**
  （需有效 PAT，且会在目标账号下真实建/改仓库）。

---

## 五、改动文件

| 文件 | 改动 |
| --- | --- |
| `services/deployTypes.ts` | 新增 `BranchHead` / `GitCommitObject` / `DeployApiError`；`PlatformAdapter` 契约更新；`DeployProgress.warningKey` |
| `services/githubAdapter.ts` | base_tree 修复、分支解析、可空 base/parent、Pages 错误上抛 |
| `services/giteeAdapter.ts` | 同构修复 |
| `services/vercelAdapter.ts` | SHA-1 digest、files 载荷形状、部署 body 参数、readyState |
| `services/deployService.ts` | 用 `getBranchHead`；Pages 失败降级为警告 |
| `components/DeployPanel.tsx` | 成功态展示警告 |
| `locales/zh/blog.ts`、`locales/zh/index.ts`、`locales/en.ts` | 新增 `deployPagesManualHint` |
| `services/__tests__/deployService.test.ts` | **新增**（7 条） |
