import type { DeployConfig, DeployProgressCallback } from './deployTypes'
import { fetchWithTimeout } from './fetchWithTimeout'

const API_BASE = 'https://api.vercel.com'

/**
 * Vercel 上传接口要求 `x-vercel-digest` 为文件的 **SHA-1** 十六进制串。
 *
 * ⚠️ 官方文档明确：`x-vercel-digest` = "The file SHA1 used to check the integrity"，
 * 且 `maxLength: 40` —— SHA-1 十六进制正好 40 字符，SHA-256 是 64 字符，超限会被
 * 400 "Digest is not valid" 拒绝。原实现误用 SHA-256，必然上传失败。
 */
async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 引用已上传文件时，deployment 的 files 元素形状（官方：`{ file, sha, size }`） */
interface VercelFileRef {
  file: string
  sha: string
  size: number
}

export const vercelAdapter = {
  platformName: 'Vercel',
  defaultBranch: 'main',

  async validateToken(token: string): Promise<{ login: string; name: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/v2/user`, {
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

    // 2. 上传文件（以 SHA-1 摘要为标识；deployment 阶段按 { file, sha, size } 引用）
    onProgress({ stage: 'uploading', message: '上传文件到 Vercel...', messageKey: 'deployStagePreparing', progress: 15 })
    const filePayloads: VercelFileRef[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress({ stage: 'uploading', message: `上传文件 (${i + 1}/${files.length}): ${file.path}`, messageKey: 'deployStageUploading', messageParams: { current: String(i + 1), total: String(files.length), path: file.path }, progress: 15 + Math.floor((i / files.length) * 40) })

      const bytes = new TextEncoder().encode(file.content)
      const digest = await sha1Hex(file.content)

      const res = await fetchWithTimeout(`${API_BASE}/v2/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'x-vercel-digest': digest,
          'Content-Length': String(bytes.byteLength),
        },
        body: bytes,
      })
      // 200 = 上传成功；409 = 同摘要文件已存在（内容去重），二者皆可继续
      if (!res.ok && res.status !== 409) {
        throw new Error(`Failed to upload file ${file.path}: ${res.statusText}`)
      }

      // ⚠️ 引用形状必须是 { file, sha, size }：原实现推的是 { file: data?.uid || path, path }，
      //    而 /v2/files 的响应体是 { urls } —— 根本没有 uid，且缺 sha/size，部署必然失败。
      filePayloads.push({ file: file.path, sha: digest, size: bytes.byteLength })
    }

    // 3. 创建或获取 Project
    onProgress({ stage: 'creating-repo', message: '创建 Vercel 项目...', messageKey: 'deployStageCreatingProject', progress: 60 })
    let projectId: string
    const listRes = await fetchWithTimeout(`${API_BASE}/v9/projects?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const listData = await listRes.json()
    const existing = listData.projects?.find((p: { id: string; name: string }) => p.name === projectName)
    if (existing) {
      projectId = existing.id
    } else {
      const createRes = await fetchWithTimeout(`${API_BASE}/v9/projects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, framework: null }),
      })
      if (!createRes.ok) throw new Error(`Failed to create project: ${(await createRes.json()).message}`)
      const createData = await createRes.json()
      projectId = createData.id
    }

    // 4. 创建 Deployment
    // ⚠️ body 形状按官方文档校正：
    //    - `name` 为必填（部署 URL 用的项目名）
    //    - 项目标识参数是 `project`（接受 id 或名），**不是** `projectId`（原实现传的 `projectId` 会被忽略）
    //    - `projectSettings` 为项目首次部署所需
    onProgress({ stage: 'committing', message: '创建部署...', messageKey: 'deployStageCreatingDeployment', progress: 75 })
    const deployRes = await fetchWithTimeout(`${API_BASE}/v13/deployments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectName,
        project: projectId,
        files: filePayloads,
        target: 'production',
        projectSettings: { framework: null },
      }),
    })
    if (!deployRes.ok) throw new Error(`Failed to create deployment: ${(await deployRes.json()).message}`)
    const deployData = await deployRes.json()

    // 5. 等待部署完成
    onProgress({ stage: 'configuring-pages', message: '等待部署完成...', messageKey: 'deployStageWaiting', progress: 90 })
    let deploymentUrl = deployData.url ? `https://${deployData.url}` : ''
    let ready = false
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const checkRes = await fetchWithTimeout(`${API_BASE}/v13/deployments/${deployData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      // 原实现不校验 checkRes.ok：接口报错时 JSON 无 state，会一直空转 30 次后误报成功
      if (!checkRes.ok) {
        throw new Error(`Failed to check deployment status: ${checkRes.statusText}`)
      }
      const checkData = await checkRes.json()
      // 新版接口用 readyState（旧字段 state 作兼容兜底）
      const state = checkData.readyState ?? checkData.state
      if (state === 'READY') {
        deploymentUrl = `https://${checkData.url}`
        ready = true
        break
      }
      if (state === 'ERROR' || state === 'CANCELED') {
        throw new Error(`Vercel deployment failed (${state}): ${checkData.errorMessage || ''}`)
      }
    }
    // 轮询耗尽仍未 READY → 不能报成功（原实现会带着旧 URL 直接宣布部署成功）
    if (!ready) {
      throw new Error('Vercel deployment timed out: deployment not READY after 60s')
    }

    onProgress({ stage: 'done', message: 'Vercel 部署成功！', messageKey: 'deployStageDone', messageParams: { platform: 'Vercel' }, progress: 100, url: deploymentUrl })
    return deploymentUrl
  },
}
