import type { DeployConfig, DeployProgressCallback } from './deployTypes'
import { fetchWithTimeout } from './fetchWithTimeout'

const API_BASE = 'https://api.cloudflare.com/client/v4'

export const cloudflareAdapter = {
  platformName: 'Cloudflare Pages',
  defaultBranch: 'main',

  async validateToken(token: string): Promise<{ login: string; name: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Invalid Cloudflare token')
    const data = await res.json()
    if (!data.success) throw new Error('Invalid Cloudflare token')
    return { login: data.result.username, name: data.result.username }
  },

  async deploy(
    files: Array<{ path: string; content: string }>,
    config: DeployConfig,
    onProgress: DeployProgressCallback
  ): Promise<string> {
    const token = config.token
    const projectName = config.repo || 'markcraft-blog'

    // 1. 验证 Token & 获取 Account ID
    onProgress({ stage: 'authenticating', message: '验证 Cloudflare 身份...', messageKey: 'deployStageAuthenticating', messageParams: { platform: 'Cloudflare' }, progress: 5 })
    const userRes = await fetchWithTimeout(`${API_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const userData = await userRes.json()
    if (!userData.success) throw new Error('Failed to get Cloudflare accounts')
    const accountId = userData.result[0]?.id
    if (!accountId) throw new Error('No Cloudflare account found')

    // 2. 创建或获取 Project
    onProgress({ stage: 'creating-repo', message: '检查 Cloudflare Pages 项目...', messageKey: 'deployStageCheckingProject', progress: 15 })
    const projectRes = await fetchWithTimeout(`${API_BASE}/accounts/${accountId}/pages/projects/${projectName}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!projectRes.ok) {
      const createRes = await fetchWithTimeout(`${API_BASE}/accounts/${accountId}/pages/projects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, production_branch: 'main' }),
      })
      if (!createRes.ok) throw new Error(`Failed to create project: ${(await createRes.json()).errors?.[0]?.message}`)
    }

    // 3. 上传文件并创建部署
    onProgress({ stage: 'uploading', message: '上传文件到 Cloudflare Pages...', messageKey: 'deployStagePreparing', progress: 25 })
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress({ stage: 'uploading', message: `打包文件 (${i + 1}/${files.length}): ${file.path}`, messageKey: 'deployStagePackaging', messageParams: { current: String(i + 1), total: String(files.length), path: file.path }, progress: 25 + Math.floor((i / files.length) * 50) })
      formData.append('directory', new Blob([file.content], { type: 'application/octet-stream' }), file.path)
    }

    onProgress({ stage: 'committing', message: '创建 Cloudflare Pages 部署...', messageKey: 'deployStageCreatingDeploy', progress: 80 })
    const deployRes = await fetchWithTimeout(`${API_BASE}/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!deployRes.ok) throw new Error(`Failed to create deployment: ${(await deployRes.json()).errors?.[0]?.message}`)
    const deployData = await deployRes.json()

    const deploymentUrl = deployData.result?.url ? `https://${deployData.result.url}` : `https://${projectName}.pages.dev`
    onProgress({ stage: 'done', message: 'Cloudflare Pages 部署成功！', messageKey: 'deployStageDone', messageParams: { platform: 'Cloudflare Pages' }, progress: 100, url: deploymentUrl })
    return deploymentUrl
  },
}
