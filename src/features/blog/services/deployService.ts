import type { DeployConfig, DeployProgressCallback, PlatformAdapter, GitTreeItem } from './deployTypes'
import { DeployApiError } from './deployTypes'
import { githubAdapter } from './githubAdapter'
import { giteeAdapter } from './giteeAdapter'
import { vercelAdapter } from './vercelAdapter'
import { cloudflareAdapter } from './cloudflareAdapter'
import { netlifyAdapter } from './netlifyAdapter'

function getGitAdapter(platform: DeployConfig['platform']): PlatformAdapter {
  switch (platform) {
    case 'github': return githubAdapter
    case 'gitee': return giteeAdapter
    default: throw new Error(`${platform} does not use git adapter`)
  }
}

export async function validateDeployToken(platform: DeployConfig['platform'], token: string) {
  if (platform === 'vercel') return vercelAdapter.validateToken(token)
  if (platform === 'cloudflare') return cloudflareAdapter.validateToken(token)
  if (platform === 'netlify') return netlifyAdapter.validateToken(token)
  return getGitAdapter(platform).validateToken(token)
}

export async function deployToPages(
  files: Array<{ path: string; content: string }>,
  config: DeployConfig,
  onProgress: DeployProgressCallback
): Promise<string> {
  // Vercel 部署
  if (config.platform === 'vercel') {
    return vercelAdapter.deploy(files, config, onProgress)
  }

  // Cloudflare Pages 部署
  if (config.platform === 'cloudflare') {
    return cloudflareAdapter.deploy(files, config, onProgress)
  }

  // Netlify 部署
  if (config.platform === 'netlify') {
    return netlifyAdapter.deploy(files, config, onProgress)
  }

  // GitHub / Gitee 部署
  const adapter = getGitAdapter(config.platform)
  const branch = config.branch || adapter.defaultBranch

  onProgress({ stage: 'authenticating', message: `验证 ${adapter.platformName} 身份...`, messageKey: 'deployStageAuthenticating', messageParams: { platform: adapter.platformName }, progress: 5 })
  const user = await adapter.validateToken(config.token)
  config.owner = user.login

  onProgress({ stage: 'creating-repo', message: '检查仓库...', messageKey: 'deployStageCreatingRepo', progress: 10 })
  await adapter.ensureRepo(config.owner, config.repo, config.token)

  onProgress({ stage: 'uploading', message: '准备上传...', messageKey: 'deployStagePreparing', progress: 20 })
  // ⚠️ 基准分支尖端要区分两个 SHA：
  //    - treeSha  → createTree 的 base_tree（文档要求 tree 对象）
  //    - commitSha→ createCommit 的 parent（文档要求 commit 对象）
  //    仓库为空（无任何分支）时 head 为 null → 走「无 base、无 parent」的首次提交。
  const head = await adapter.getBranchHead(config.owner, config.repo, branch, config.token)

  const treeItems: GitTreeItem[] = []
  const totalFiles = files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress({ stage: 'uploading', message: `上传文件 (${i + 1}/${totalFiles}): ${file.path}`, messageKey: 'deployStageUploading', messageParams: { current: String(i + 1), total: String(totalFiles), path: file.path }, progress: 20 + Math.floor((i / totalFiles) * 50) })
    const sha = await adapter.createBlob(config.owner, config.repo, file.content, config.token)
    treeItems.push({ path: file.path, sha, mode: '100644' as const, type: 'blob' as const })
  }

  onProgress({ stage: 'committing', message: '创建提交...', messageKey: 'deployStageCommitting', progress: 75 })
  const treeSha = await adapter.createTree(config.owner, config.repo, treeItems, head?.treeSha ?? null, config.token)
  const commitSha = await adapter.createCommit(config.owner, config.repo, `Deploy blog - ${new Date().toISOString()}`, treeSha, head?.commitSha ?? null, config.token)

  onProgress({ stage: 'committing', message: '更新分支...', messageKey: 'deployStageUpdatingBranch', progress: 90 })
  await adapter.updateBranchRef(config.owner, config.repo, branch, commitSha, config.token)

  // Pages 配置失败不致命（内容已推送、Pages 启用是幂等且可重试的）：
  // 但**不能静默吞掉** —— 否则用户会看到「部署成功 + URL」而站点实际不可访问。
  // 改为成功态附带 warning，UI 一并展示，让用户知道需要手动开启 Pages。
  //
  // ⚠️ 404 单独分类：端点不存在 ≠ 无权限。Gitee Pages 已于 2024-05 暂停服务，
  // /pages/builds 恒返 404 —— 此时"请手动开启"是误导（根本没有入口可开），
  // 必须明确告知"站点不会上线"。
  let pagesWarningKey: string | undefined
  onProgress({ stage: 'configuring-pages', message: '配置 Pages...', messageKey: 'deployStageConfiguringPages', progress: 95 })
  try {
    await adapter.configurePages(config.owner, config.repo, branch, config.token)
  } catch (err) {
    pagesWarningKey = err instanceof DeployApiError && err.status === 404
      ? 'deployPagesUnavailable'
      : 'deployPagesManualHint'
  }

  const deployUrl = adapter.getPagesUrl(config.owner, config.repo)
  onProgress({ stage: 'done', message: `${adapter.platformName} 部署成功！`, messageKey: 'deployStageDone', messageParams: { platform: adapter.platformName }, progress: 100, url: deployUrl, warningKey: pagesWarningKey })
  return deployUrl
}

export type { DeployPlatform, DeployConfig, DeployProgress } from './deployTypes'
