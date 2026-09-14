import type { DeployConfig, DeployProgressCallback } from './deployTypes'

const API_BASE = 'https://api.netlify.com/api/v1'

export const netlifyAdapter = {
  platformName: 'Netlify',
  defaultBranch: 'main',

  async validateToken(token: string): Promise<{ login: string; name: string }> {
    const res = await fetch(`${API_BASE}/user`, {
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
    onProgress({ stage: 'authenticating', message: '验证 Netlify 身份...', progress: 5 })
    await this.validateToken(token)

    // 2. 创建或获取 Site
    onProgress({ stage: 'creating-repo', message: '检查 Netlify 站点...', progress: 15 })
    let siteId: string
    const listRes = await fetch(`${API_BASE}/sites?filter=all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const sites = await listRes.json()
    const existing = sites.find((s: { id: string; name: string }) => s.name === siteName)
    if (existing) {
      siteId = existing.id
    } else {
      const createRes = await fetch(`${API_BASE}/sites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siteName }),
      })
      if (!createRes.ok) throw new Error(`Failed to create site: ${(await createRes.json()).message}`)
      const createData = await createRes.json()
      siteId = createData.id
    }

    // 3. 上传文件并部署
    onProgress({ stage: 'uploading', message: '上传文件到 Netlify...', progress: 25 })
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress({ stage: 'uploading', message: `打包文件 (${i + 1}/${files.length}): ${file.path}`, progress: 25 + Math.floor((i / files.length) * 50) })
      formData.append('functions', new Blob([file.content], { type: 'application/octet-stream' }), file.path)
    }

    onProgress({ stage: 'committing', message: '创建 Netlify 部署...', progress: 80 })
    const deployRes = await fetch(`${API_BASE}/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!deployRes.ok) throw new Error(`Failed to create deployment: ${(await deployRes.json()).message}`)
    await deployRes.json()

    const deploymentUrl = `https://${siteName}.netlify.app`
    onProgress({ stage: 'done', message: 'Netlify 部署成功！', progress: 100, url: deploymentUrl })
    return deploymentUrl
  },
}
