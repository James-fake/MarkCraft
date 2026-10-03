import type { DeployConfig, DeployProgressCallback } from './deployTypes'

const API_BASE = 'https://api.vercel.com'

export const vercelAdapter = {
  platformName: 'Vercel',
  defaultBranch: 'main',

  async validateToken(token: string): Promise<{ login: string; name: string }> {
    const res = await fetch(`${API_BASE}/v2/user`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Invalid Vercel token')
    const data = await res.json()
    return { login: data.user.username, name: data.user.name || data.user.username }
  },

  async deploy(
    files: Array<{ path: string; content: string }>,
    config: DeployConfig,
    onProgress: DeployProgressCallback
  ): Promise<string> {
    const token = config.token
    const projectName = config.repo || 'markcraft-blog'

    // 1. 验证 Token
    onProgress({ stage: 'authenticating', message: '验证 Vercel 身份...', messageKey: 'deployStageAuthenticating', messageParams: { platform: 'Vercel' }, progress: 5 })
    await this.validateToken(token)

    // 2. 上传文件
    onProgress({ stage: 'uploading', message: '上传文件到 Vercel...', messageKey: 'deployStagePreparing', progress: 15 })
    const filePayloads = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress({ stage: 'uploading', message: `上传文件 (${i + 1}/${files.length}): ${file.path}`, messageKey: 'deployStageUploading', messageParams: { current: String(i + 1), total: String(files.length), path: file.path }, progress: 15 + Math.floor((i / files.length) * 40) })

      const res = await fetch(`${API_BASE}/v2/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'x-vercel-digest': await sha256(file.content),
        },
        body: new TextEncoder().encode(file.content),
      })
      // 200 or 409 (already exists) are both fine
      if (!res.ok && res.status !== 409) {
        throw new Error(`Failed to upload file ${file.path}: ${res.statusText}`)
      }

      const data = res.status !== 409 ? await res.json() : null
      filePayloads.push({
        file: data?.uid || file.path,
        path: file.path,
      })
    }

    // 3. 创建或获取 Project
    onProgress({ stage: 'creating-repo', message: '创建 Vercel 项目...', messageKey: 'deployStageCreatingProject', progress: 60 })
    let projectId: string
    const listRes = await fetch(`${API_BASE}/v9/projects?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const listData = await listRes.json()
    const existing = listData.projects?.find((p: { id: string; name: string }) => p.name === projectName)
    if (existing) {
      projectId = existing.id
    } else {
      const createRes = await fetch(`${API_BASE}/v9/projects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, framework: null }),
      })
      if (!createRes.ok) throw new Error(`Failed to create project: ${(await createRes.json()).message}`)
      const createData = await createRes.json()
      projectId = createData.id
    }

    // 4. 创建 Deployment
    onProgress({ stage: 'committing', message: '创建部署...', messageKey: 'deployStageCreatingDeployment', progress: 75 })
    const deployRes = await fetch(`${API_BASE}/v13/deployments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        files: filePayloads,
        target: 'production',
      }),
    })
    if (!deployRes.ok) throw new Error(`Failed to create deployment: ${(await deployRes.json()).message}`)
    const deployData = await deployRes.json()

    // 5. 等待部署完成
    onProgress({ stage: 'configuring-pages', message: '等待部署完成...', messageKey: 'deployStageWaiting', progress: 90 })
    let deploymentUrl = deployData.url ? `https://${deployData.url}` : ''
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const checkRes = await fetch(`${API_BASE}/v13/deployments/${deployData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const checkData = await checkRes.json()
      if (checkData.state === 'READY') {
        deploymentUrl = `https://${checkData.url}`
        break
      }
      if (checkData.state === 'ERROR') {
        throw new Error('Vercel deployment failed')
      }
    }

    onProgress({ stage: 'done', message: 'Vercel 部署成功！', messageKey: 'deployStageDone', messageParams: { platform: 'Vercel' }, progress: 100, url: deploymentUrl })
    return deploymentUrl
  },
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
