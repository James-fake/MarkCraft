import type { DeployConfig, DeployProgressCallback, PlatformAdapter, GitTreeItem } from './deployTypes'
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
  const baseTreeSha = await adapter.getBranchRef(config.owner, config.repo, branch, config.token)

  const treeItems: GitTreeItem[] = []
  const totalFiles = files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress({ stage: 'uploading', message: `上传文件 (${i + 1}/${totalFiles}): ${file.path}`, messageKey: 'deployStageUploading', messageParams: { current: String(i + 1), total: String(totalFiles), path: file.path }, progress: 20 + Math.floor((i / totalFiles) * 50) })
    const sha = await adapter.createBlob(config.owner, config.repo, file.content, config.token)
    treeItems.push({ path: file.path, sha, mode: '100644' as const, type: 'blob' as const })
  }

  onProgress({ stage: 'committing', message: '创建提交...', messageKey: 'deployStageCommitting', progress: 75 })
  const treeSha = await adapter.createTree(config.owner, config.repo, treeItems, baseTreeSha, config.token)
  const commitSha = await adapter.createCommit(config.owner, config.repo, `Deploy blog - ${new Date().toISOString()}`, treeSha, baseTreeSha, config.token)

  onProgress({ stage: 'committing', message: '更新分支...', messageKey: 'deployStageUpdatingBranch', progress: 90 })
  await adapter.updateBranchRef(config.owner, config.repo, branch, commitSha, config.token)

  onProgress({ stage: 'configuring-pages', message: '配置 Pages...', messageKey: 'deployStageConfiguringPages', progress: 95 })
  await adapter.configurePages(config.owner, config.repo, branch, config.token)

  const deployUrl = adapter.getPagesUrl(config.owner, config.repo)
  onProgress({ stage: 'done', message: `${adapter.platformName} 部署成功！`, messageKey: 'deployStageDone', messageParams: { platform: adapter.platformName }, progress: 100, url: deployUrl })
  return deployUrl
}

export type { DeployPlatform, DeployConfig, DeployProgress } from './deployTypes'
