import type {
  PlatformAdapter,
  GitTreeItem,
  GitUser,
  GitRefObject,
  GitSha,
  GitCommitObject,
  BranchHead,
} from './deployTypes'
import { DeployApiError } from './deployTypes'
import { fetchWithTimeout } from './fetchWithTimeout'

const GITHUB_API = 'https://api.github.com'

/** Pages 已启用时 GitHub 返回 409 —— 这是唯一幂等可忽略的情况 */
const PAGES_ALREADY_ENABLED = 409

/**
 * 统一的 GitHub 请求出口：注入鉴权头，并把失败响应包装成携带 **HTTP 状态码** 的
 * `DeployApiError`（原实现抛裸 `Error` 会丢状态码，导致调用方只能一律 `catch {}` 吞错）。
 */
async function ghFetch<T = unknown>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ message: res.statusText }))) as { message?: string }
    throw new DeployApiError(body?.message || `GitHub API error: ${res.status}`, res.status)
  }
  if (res.status === 204) return null as T
  return (await res.json()) as T
}

/**
 * 解析分支尖端的 commit SHA。
 *
 * 候选顺序：目标分支（gh-pages）→ **仓库真实默认分支**（`default_branch`，不硬编码）
 * → main / master 兜底。全部不存在（空仓库）时返回 null。
 *
 * 原实现只试「目标分支 → main」：账号默认分支是 master 时直接失败；
 * 且仓库刚 `auto_init` 建好时存在最终一致性延迟，故这里对每个候选独立 try。
 */
async function resolveBranchCommitSha(
  owner: string,
  repo: string,
  branch: string,
  token: string,
): Promise<string | null> {
  const tried = new Set<string>()
  const candidates: string[] = []
  const push = (b?: string | null) => {
    if (b && !tried.has(b)) {
      tried.add(b)
      candidates.push(b)
    }
  }

  push(branch)
  try {
    const info = await ghFetch<{ default_branch?: string }>(`/repos/${owner}/${repo}`, token)
    push(info?.default_branch)
  } catch {
    /* 读不到仓库信息时继续用兜底名 */
  }
  push('main')
  push('master')

  for (const b of candidates) {
    try {
      const ref = await ghFetch<GitRefObject>(`/repos/${owner}/${repo}/git/ref/heads/${b}`, token)
      if (ref?.object?.sha) return ref.object.sha
    } catch {
      /* 该分支不存在，试下一个 */
    }
  }
  return null
}

/** 由 commit SHA 解引用出它指向的 **tree** SHA（`base_tree` 需要的是 tree，不是 commit） */
async function resolveTreeSha(owner: string, repo: string, commitSha: string, token: string): Promise<string> {
  const commit = await ghFetch<GitCommitObject>(`/repos/${owner}/${repo}/git/commits/${commitSha}`, token)
  const treeSha = commit?.tree?.sha
  if (!treeSha) {
    throw new DeployApiError(`无法从 commit ${commitSha} 解析出 tree SHA`, 500)
  }
  return treeSha
}

export const githubAdapter: PlatformAdapter = {
  apiBase: GITHUB_API,
  platformName: 'GitHub',
  defaultBranch: 'gh-pages',

  getPagesUrl(owner: string, repo: string): string {
    return repo === `${owner}.github.io`
      ? `https://${owner}.github.io`
      : `https://${owner}.github.io/${repo}`
  },

  getDefaultRepo(username: string): string {
    return `${username}.github.io`
  },

  fetch<T = unknown>(path: string, token: string, options?: RequestInit): Promise<T> {
    return ghFetch<T>(path, token, options)
  },

  async validateToken(token: string) {
    const user = await ghFetch<GitUser>('/user', token)
    return { login: user.login, name: user.name || user.login }
  },

  async ensureRepo(owner: string, repo: string, token: string) {
    try {
      await ghFetch(`/repos/${owner}/${repo}`, token)
    } catch {
      await ghFetch('/user/repos', token, {
        method: 'POST',
        body: JSON.stringify({ name: repo, auto_init: true, homepage: this.getPagesUrl(owner, repo) }),
      })
    }
  },

  async getBranchHead(owner: string, repo: string, branch: string, token: string): Promise<BranchHead | null> {
    const commitSha = await resolveBranchCommitSha(owner, repo, branch, token)
    if (!commitSha) return null
    const treeSha = await resolveTreeSha(owner, repo, commitSha, token)
    return { commitSha, treeSha }
  },

  async createBlob(owner: string, repo: string, content: string, token: string) {
    const blob = await ghFetch<GitSha>(`/repos/${owner}/${repo}/git/blobs`, token, {
      method: 'POST',
      body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' }),
    })
    return blob.sha
  },

  async createTree(owner: string, repo: string, tree: GitTreeItem[], baseTreeSha: string | null, token: string) {
    // base_tree 必须是 tree 的 SHA；空仓库（baseTreeSha=null）时不带该字段，从零建树
    const body: Record<string, unknown> = { tree }
    if (baseTreeSha) body.base_tree = baseTreeSha
    const result = await ghFetch<GitSha>(`/repos/${owner}/${repo}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return result.sha
  },

  async createCommit(
    owner: string,
    repo: string,
    message: string,
    treeSha: string,
    parentSha: string | null,
    token: string,
  ) {
    const body: Record<string, unknown> = { message, tree: treeSha }
    if (parentSha) body.parents = [parentSha]
    const commit = await ghFetch<GitSha>(`/repos/${owner}/${repo}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return commit.sha
  },

  async updateBranchRef(owner: string, repo: string, branch: string, commitSha: string, token: string) {
    try {
      await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitSha, force: true }),
      })
    } catch {
      await ghFetch(`/repos/${owner}/${repo}/git/refs`, token, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitSha }),
      })
    }
  },

  async configurePages(owner: string, repo: string, branch: string, token: string) {
    try {
      await ghFetch(`/repos/${owner}/${repo}/pages`, token, {
        method: 'POST',
        body: JSON.stringify({ source: { branch, path: '/' } }),
      })
    } catch (err) {
      // 已启用 → 幂等可忽略；其余（403 无权限 / 私有库需 Pro / 404 等）必须上抛，
      // 否则用户会看到「部署成功 + 访问 URL」而站点其实不可用。
      if (err instanceof DeployApiError && err.status === PAGES_ALREADY_ENABLED) return
      throw err
    }
  },
}
