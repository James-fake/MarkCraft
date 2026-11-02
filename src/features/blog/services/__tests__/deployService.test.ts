import { describe, it, expect, vi, beforeEach } from 'vitest'
import { webcrypto } from 'node:crypto'

// jsdom 环境可能缺 crypto.subtle（Vercel 适配器用它算 SHA-1），补 Node 的 WebCrypto
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

/**
 * 部署链路的网络出口桩。
 *
 * 该链路此前**零测试覆盖**，导致「base_tree 传了 commit 而非 tree」「Vercel digest 用错算法」
 * 这类只在真机才暴露的问题长期潜伏。这里用可编程的 fetch 桩把「请求序列 + 请求体形状」
 * 钉死，使这些约束在单测层即可回归。
 */
const mock = vi.hoisted(() => {
  const calls: Array<{ method: string; url: string; body: unknown; headers: Record<string, string> }> = []
  const state: { handler: ((url: string, init?: RequestInit) => Res | undefined) | null } = { handler: null }
  return { calls, state }
})

vi.mock('../fetchWithTimeout', () => ({
  fetchWithTimeout: async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    let parsed: unknown
    if (typeof init?.body === 'string') {
      try { parsed = JSON.parse(init.body) } catch { parsed = init.body }
    }
    mock.calls.push({
      method,
      url,
      body: parsed,
      headers: (init?.headers ?? {}) as Record<string, string>,
    })
    const hit = mock.state.handler?.(url, init)
    const status = hit?.status ?? 404
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: `HTTP ${status}`,
      json: async () => hit?.body,
    } as unknown as Response
  },
}))

import { deployToPages, validateDeployToken } from '../deployService'
import type { DeployProgress } from '../deployTypes'

type Res = { status: number; body?: unknown }
type Rule = { method: string; match: RegExp; res: Res }

let rules: Rule[] = []

/** 注册一条路由规则；同 URL 重复注册时**后注册的优先** */
function on(method: string, match: RegExp, res: Res) {
  rules.push({ method, match, res })
}

function find(method: string, url: string): Res | undefined {
  for (let i = rules.length - 1; i >= 0; i--) {
    const r = rules[i]
    if (r.method === method && r.match.test(url)) return r.res
  }
  return undefined
}

const call = (method: string, re: RegExp) => mock.calls.filter((c) => c.method === method && re.test(c.url))
const lastCall = (method: string, re: RegExp) => call(method, re).at(-1)
/** 取最后一次请求的 JSON body（测试桩保证 body 为对象） */
const lastJsonBody = (method: string, re: RegExp) =>
  (lastCall(method, re)?.body ?? {}) as Record<string, unknown>

beforeEach(() => {
  mock.calls.length = 0
  rules = []
  mock.state.handler = (url, init) => find((init?.method ?? 'GET').toUpperCase(), url)
})

/** GitHub 仓库「已存在且默认分支为 main」的通用前置 */
function seedGithubRepo(defaultBranch = 'main') {
  on('GET', /\/user$/, { status: 200, body: { login: 'octocat', name: 'The Octocat' } })
  on('GET', /\/repos\/octocat\/blog$/, { status: 200, body: { default_branch: defaultBranch } })
  on('POST', /\/git\/blobs$/, { status: 201, body: { sha: 'BLOB1' } })
  on('POST', /\/git\/trees$/, { status: 201, body: { sha: 'TREE_NEW' } })
  on('POST', /\/git\/commits$/, { status: 201, body: { sha: 'COMMIT_NEW' } })
  on('PATCH', /\/git\/refs\/heads\//, { status: 201, body: {} })
  on('POST', /\/pages$/, { status: 201, body: {} })
}

describe('deployToPages · GitHub', () => {
  it('base_tree 传的是 tree SHA、parent 传的是 commit SHA（不得混用）', async () => {
    seedGithubRepo()
    on('GET', /\/git\/ref\/heads\/gh-pages$/, { status: 404 })
    on('GET', /\/git\/ref\/heads\/main$/, { status: 200, body: { object: { sha: 'COMMIT1' } } })
    on('GET', /\/git\/commits\/COMMIT1$/, { status: 200, body: { tree: { sha: 'TREE1' } } })

    const progress: DeployProgress[] = []
    const url = await deployToPages(
      [{ path: 'index.html', content: '<h1>hi</h1>' }],
      { platform: 'github', token: 't', owner: 'octocat', repo: 'blog' },
      (p) => progress.push(p),
    )

    const treeBody = lastJsonBody('POST', /\/git\/trees$/)
    // 🚨 核心回归：base_tree 必须是 tree 对象（TREE1），绝不能是 commit（COMMIT1）
    expect(treeBody.base_tree).toBe('TREE1')
    expect(treeBody.base_tree).not.toBe('COMMIT1')
    expect(treeBody.tree).toEqual([{ path: 'index.html', sha: 'BLOB1', mode: '100644', type: 'blob' }])

    const commitBody = lastJsonBody('POST', /\/git\/commits$/)
    expect(commitBody.tree).toBe('TREE_NEW')
    expect(commitBody.parents).toEqual(['COMMIT1'])

    expect(progress.at(-1)).toMatchObject({ stage: 'done', url: 'https://octocat.github.io/blog' })
    expect(progress.at(-1)!.warningKey).toBeUndefined()
    expect(url).toBe('https://octocat.github.io/blog')
  })

  it('默认分支为 master 时也能解析（不硬编码 main）', async () => {
    seedGithubRepo('master')
    on('GET', /\/git\/ref\/heads\/gh-pages$/, { status: 404 })
    on('GET', /\/git\/ref\/heads\/main$/, { status: 404 })
    on('GET', /\/git\/ref\/heads\/master$/, { status: 200, body: { object: { sha: 'MCOMMIT' } } })
    on('GET', /\/git\/commits\/MCOMMIT$/, { status: 200, body: { tree: { sha: 'MTREE' } } })

    await deployToPages([{ path: 'a.html', content: 'a' }], { platform: 'github', token: 't', owner: 'octocat', repo: 'blog' }, () => {})

    expect(lastJsonBody('POST', /\/git\/trees$/).base_tree).toBe('MTREE')
    expect(lastJsonBody('POST', /\/git\/commits$/).parents).toEqual(['MCOMMIT'])
  })

  it('空仓库（无任何分支）：不带 base_tree、不带 parents（首次提交）', async () => {
    seedGithubRepo('main')
    on('GET', /\/git\/ref\/heads\//, { status: 404 }) // gh-pages / main / master 全不存在

    await deployToPages([{ path: 'a.html', content: 'a' }], { platform: 'github', token: 't', owner: 'octocat', repo: 'blog' }, () => {})

    const treeBody = lastJsonBody('POST', /\/git\/trees$/)
    expect(treeBody).not.toHaveProperty('base_tree')
    expect(lastJsonBody('POST', /\/git\/commits$/)).not.toHaveProperty('parents')
  })

  it('Pages 已启用（409）→ 仍成功且无警告', async () => {
    seedGithubRepo()
    on('GET', /\/git\/ref\/heads\/main$/, { status: 200, body: { object: { sha: 'COMMIT1' } } })
    on('GET', /\/git\/commits\/COMMIT1$/, { status: 200, body: { tree: { sha: 'TREE1' } } })
    on('POST', /\/pages$/, { status: 409, body: { message: 'Conflict' } })

    const progress: DeployProgress[] = []
    await deployToPages([{ path: 'a.html', content: 'a' }], { platform: 'github', token: 't', owner: 'octocat', repo: 'blog' }, (p) => progress.push(p))
    expect(progress.at(-1)!.stage).toBe('done')
    expect(progress.at(-1)!.warningKey).toBeUndefined()
  })

  it('Pages 启用失败（403 无权限）→ 部署仍成功，但带「需手动启用」警告（不再假成功）', async () => {
    seedGithubRepo()
    on('GET', /\/git\/ref\/heads\/main$/, { status: 200, body: { object: { sha: 'COMMIT1' } } })
    on('GET', /\/git\/commits\/COMMIT1$/, { status: 200, body: { tree: { sha: 'TREE1' } } })
    on('POST', /\/pages$/, { status: 403, body: { message: 'Upgrade to Pro' } })

    const progress: DeployProgress[] = []
    await deployToPages([{ path: 'a.html', content: 'a' }], { platform: 'github', token: 't', owner: 'octocat', repo: 'blog' }, (p) => progress.push(p))
    expect(progress.at(-1)!.stage).toBe('done')
    expect(progress.at(-1)!.warningKey).toBe('deployPagesManualHint')
  })
})

describe('deployToPages · Gitee', () => {
  /** Gitee 仓库「已存在且默认分支为 master」的通用前置（分支形状是 { commit: { sha } }，与 GitHub 不同） */
  function seedGiteeRepo() {
    on('GET', /\/user$/, { status: 200, body: { login: 'giteecat', name: 'Gitee Cat' } })
    on('GET', /\/repos\/giteecat\/blog$/, { status: 200, body: { default_branch: 'master' } })
    on('GET', /\/repos\/giteecat\/blog\/branches\/master$/, { status: 200, body: { commit: { sha: 'GCOMMIT1' } } })
    on('GET', /\/repos\/giteecat\/blog\/git\/commits\/GCOMMIT1$/, { status: 200, body: { tree: { sha: 'GTREE1' } } })
    on('POST', /\/git\/blobs$/, { status: 201, body: { sha: 'GBLOB1' } })
    on('POST', /\/git\/trees$/, { status: 201, body: { sha: 'GTREE_NEW' } })
    on('POST', /\/git\/commits$/, { status: 201, body: { sha: 'GCOMMIT_NEW' } })
    on('PATCH', /\/git\/refs\/heads\//, { status: 200, body: {} })
    on('POST', /\/pages\/builds$/, { status: 201, body: {} })
  }

  it('Pages 端点 404（服务已下架，Gitee Pages 2024-05 停服）→ 部署成功但警告为「服务不可用」，而非误导性的「需手动开启」', async () => {
    seedGiteeRepo()
    on('POST', /\/pages\/builds$/, { status: 404, body: { message: 'Not Found' } })

    const progress: DeployProgress[] = []
    const url = await deployToPages(
      [{ path: 'index.html', content: '<h1>hi</h1>' }],
      { platform: 'gitee', token: 't', owner: 'giteecat', repo: 'blog' },
      (p) => progress.push(p),
    )

    // 内容推送本身完成（Git Data API 不受 Pages 停服影响）
    expect(lastJsonBody('POST', /\/git\/trees$/).base_tree).toBe('GTREE1')
    expect(progress.at(-1)!.stage).toBe('done')
    // 🚨 核心回归：404 必须归类为「服务不可用」——此时仓库里根本没有 Pages 入口可手动开启
    expect(progress.at(-1)!.warningKey).toBe('deployPagesUnavailable')
    expect(url).toBe('https://giteecat.gitee.io/blog')
  })

  it('Pages 已启用 / 构建中（409 / 400）→ 幂等成功且无警告', async () => {
    for (const status of [400, 409]) {
      seedGiteeRepo()
      on('POST', /\/pages\/builds$/, { status, body: { message: 'Conflict' } })

      const progress: DeployProgress[] = []
      await deployToPages([{ path: 'a.html', content: 'a' }], { platform: 'gitee', token: 't', owner: 'giteecat', repo: 'blog' }, (p) => progress.push(p))
      expect(progress.at(-1)!.stage).toBe('done')
      expect(progress.at(-1)!.warningKey).toBeUndefined()
    }
  })
})

describe('deployToPages · Vercel', () => {
  it('digest 为 SHA-1（40 位十六进制），且 files 载荷为 { file, sha, size }；body 带 name 与 project', async () => {
    on('GET', /\/v2\/user$/, { status: 200, body: { user: { username: 'me', name: 'Me' } } })
    on('POST', /\/v2\/files$/, { status: 200, body: { urls: [] } })
    on('GET', /\/v9\/projects\?/, { status: 200, body: { projects: [] } })
    on('POST', /\/v9\/projects$/, { status: 200, body: { id: 'prj_1' } })
    on('POST', /\/v13\/deployments$/, { status: 200, body: { id: 'dpl_1', url: 'x.vercel.app' } })
    on('GET', /\/v13\/deployments\/dpl_1$/, { status: 200, body: { readyState: 'READY', url: 'x.vercel.app' } })

    const progress: DeployProgress[] = []
    const url = await deployToPages(
      [{ path: 'index.html', content: 'hello' }],
      { platform: 'vercel', token: 't', owner: '', repo: 'my-blog' },
      (p) => progress.push(p),
    )

    expect(url).toBe('https://x.vercel.app')
    expect(progress.at(-1)!.stage).toBe('done')

    // digest 头必须是 40 位十六进制（SHA-1）；SHA-256 是 64 位，会被 Vercel 以 400 "Digest is not valid" 拒绝
    const upload = lastCall('POST', /\/v2\/files$/)!
    expect(upload.headers['x-vercel-digest']).toMatch(/^[0-9a-f]{40}$/)

    const deployBody = lastJsonBody('POST', /\/v13\/deployments$/)
    const files = deployBody.files as Array<Record<string, unknown>>
    const sha = files[0].sha as string
    expect(sha).toMatch(/^[0-9a-f]{40}$/)
    expect(sha).toBe(upload.headers['x-vercel-digest'])

    // files 元素形状必须是 { file, sha, size }
    expect(files[0]).toEqual({ file: 'index.html', sha, size: 5 })
    // name 为必填、项目标识参数是 project（不是 projectId）
    expect(deployBody.name).toBe('my-blog')
    expect(deployBody.project).toBe('prj_1')
    expect(deployBody).not.toHaveProperty('projectId')
  })
})

describe('validateDeployToken', () => {
  it('GitHub：token 无效时抛出（携带状态码的 DeployApiError）', async () => {
    on('GET', /\/user$/, { status: 401, body: { message: 'Bad credentials' } })
    await expect(validateDeployToken('github', 'bad')).rejects.toThrow('Bad credentials')
  })
})
