import JSZip from 'jszip'
import type { DeployConfig, DeployProgressCallback } from './deployTypes'
import { fetchWithTimeout } from './fetchWithTimeout'

const API_BASE = 'https://api.netlify.com/api/v1'

export const netlifyAdapter = {
  platformName: 'Netlify',
  defaultBranch: 'main',

  async validateToken(token: string): Promise<{ login: string; name: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Invalid Netlify token')
    const data = await res.json()
    return { login: data.email || data.id, name: data.full_name || data.email }
  },

  async deploy(
    files: Array<{ path: string; content: string }>,
    config: DeployConfig,
    onProgress: DeployProgressCallback
  ): Promise<string> {
    const token = config.token
    const siteName = config.repo || 'markcraft-blog'

    // 1. 验证 Token
    onProgress({ stage: 'authenticating', message: '验证 Netlify 身份...', messageKey: 'deployStageAuthenticating', messageParams: { platform: 'Netlify' }, progress: 5 })
    await this.validateToken(token)

    // 2. 创建或获取 Site
    onProgress({ stage: 'creating-repo', message: '检查 Netlify 站点...', messageKey: 'deployStageCreatingRepo', progress: 15 })
    let siteId: string
    const listRes = await fetchWithTimeout(`${API_BASE}/sites?filter=all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const sites = await listRes.json()
    const existing = sites.find((s: { id: string; name: string }) => s.name === siteName)
    if (existing) {
      siteId = existing.id
    } else {
      const createRes = await fetchWithTimeout(`${API_BASE}/sites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siteName }),
      })
      if (!createRes.ok) throw new Error(`Failed to create site: ${(await createRes.json()).message}`)
      const createData = await createRes.json()
      siteId = createData.id
    }

    // 3. 打包文件并部署
    // Netlify 的 /sites/{id}/deploys 以「站点内容 ZIP」为准（Content-Type: application/zip）；
    // 原实现用 formData.append('functions', …)，那是 Netlify Functions 的字段，
    // 站点文件根本不会被部署（审查 M4-netlifyAdapter）。
    onProgress({ stage: 'uploading', message: '上传文件到 Netlify...', messageKey: 'deployStagePreparing', progress: 25 })
    const zip = new JSZip()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress({ stage: 'uploading', message: `打包文件 (${i + 1}/${files.length}): ${file.path}`, messageKey: 'deployStagePackaging', messageParams: { current: String(i + 1), total: String(files.length), path: file.path }, progress: 25 + Math.floor((i / files.length) * 50) })
      zip.file(file.path, file.content)
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    onProgress({ stage: 'committing', message: '创建 Netlify 部署...', messageKey: 'deployStageCreatingDeploy', progress: 80 })
    const deployRes = await fetchWithTimeout(`${API_BASE}/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
      body: zipBlob,
    })
    if (!deployRes.ok) throw new Error(`Failed to create deployment: ${(await deployRes.json()).message}`)
    const deployData = await deployRes.json()

    // 采用 API 响应里的真实 URL，不再硬编码 https://{siteName}.netlify.app
    const deploymentUrl = deployData.ssl_url || deployData.url || `https://${siteName}.netlify.app`
    onProgress({ stage: 'done', message: 'Netlify 部署成功！', messageKey: 'deployStageDone', messageParams: { platform: 'Netlify' }, progress: 100, url: deploymentUrl })
    return deploymentUrl
  },
}
