import type {
  PlatformAdapter,
  GitTreeItem,
  GitUser,
  GitBranchRef,
  GitSha,
  GitCommitObject,
  BranchHead,
} from './deployTypes'
import { DeployApiError } from './deployTypes'
import { fetchWithTimeout } from './fetchWithTimeout'

const GITEE_API = 'https://gitee.com/api/v5'

/**
 * URL **path segment** 编码：owner/repo/branch 来自用户配置，含 `?`/`#`/`../` 时直接插值
 * 会造成查询注入或路径穿越。只逐段编码，**不要**编码整个 URL（保留 API 路径结构）。
 */
function enc(value: string): string {
  return encodeURIComponent(value)
}

/** Pages 已启用 / 构建已存在时 Gitee 返回 400/409 —— 幂等可忽略 */
const PAGES_IDEMPOTENT_STATUSES = new Set([400, 409])

/**
 * 统一的 Gitee 请求出口：注入鉴权头，并把失败响应包装成携带 **HTTP 状态码** 的 `DeployApiError`。
 *
 * 安全说明：token 不能放 URL（会泄漏进浏览器历史 / Referer / 服务端日志），故一律走
 * `Authorization: Bearer` 头，与 githubAdapter / cloudflareAdapter 的做法保持一致。
 */
async function giteeFetch<T = unknown>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(`${GITEE_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ message: res.statusText }))) as { message?: string }
    throw new DeployApiError(body?.message || `Gitee API error: ${res.status}`, res.status)
  }
  if (res.status === 204) return null as T
  return (await res.json()) as T
}

/**
 * 解析分支尖端的 commit SHA。
 * 候选顺序：目标分支 → 仓库真实默认分支（`default_branch`）→ main / master 兜底 → null（空仓库）。
 * （Gitee 的分支接口返回形状是 `{ commit: { sha } }`，与 GitHub 的 git/ref 不同。）
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
    const info = await giteeFetch<{ default_branch?: string }>(`/repos/${enc(owner)}/${enc(repo)}`, token)
    push(info?.default_branch)
  } catch {
    /* 读不到仓库信息时继续用兜底名 */
  }
  push('main')
  push('master')

  for (const b of candidates) {
    try {
      const branchInfo = await giteeFetch<GitBranchRef>(`/repos/${enc(owner)}/${enc(repo)}/branches/${enc(b)}`, token)
      if (branchInfo?.commit?.sha) return branchInfo.commit.sha
    } catch {
      /* 该分支不存在，试下一个 */
    }
  }
  return null
}

/** 由 commit SHA 解引用出它指向的 **tree** SHA（`base_tree` 需要 tree，不是 commit） */
async function resolveTreeSha(owner: string, repo: string, commitSha: string, token: string): Promise<string> {
  const commit = await giteeFetch<GitCommitObject>(`/repos/${enc(owner)}/${enc(repo)}/git/commits/${commitSha}`, token)
  const treeSha = commit?.tree?.sha
  if (!treeSha) {
    throw new DeployApiError(`无法从 commit ${commitSha} 解析出 tree SHA`, 500)
  }
  return treeSha
}

export const giteeAdapter: PlatformAdapter = {
  apiBase: GITEE_API,
  platformName: 'Gitee',
  defaultBranch: 'master',

  getPagesUrl(owner: string, repo: string): string {
    return repo === `${owner}.gitee.io`
      ? `https://${owner}.gitee.io`
      : `https://${owner}.gitee.io/${repo}`
  },

  getDefaultRepo(username: string): string {
    return `${username}.gitee.io`
  },

  fetch<T = unknown>(path: string, token: string, options?: RequestInit): Promise<T> {
    return giteeFetch<T>(path, token, options)
  },

  async validateToken(token: string) {
    const user = await giteeFetch<GitUser>('/user', token)
    return { login: user.login, name: user.name || user.login }
  },

  async ensureRepo(owner: string, repo: string, token: string) {
    try {
      await giteeFetch(`/repos/${enc(owner)}/${enc(repo)}`, token)
    } catch {
      await giteeFetch('/user/repos', token, {
        method: 'POST',
        body: JSON.stringify({ name: repo, auto_init: true, homepage: this.getPagesUrl(owner, repo), private: false, has_issues: false, has_wiki: false }),
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
    const blob = await giteeFetch<GitSha>(`/repos/${enc(owner)}/${enc(repo)}/git/blobs`, token, {
      method: 'POST',
      body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' }),
    })
    return blob.sha
  },

  async createTree(owner: string, repo: string, tree: GitTreeItem[], baseTreeSha: string | null, token: string) {
    // base_tree 必须是 tree 的 SHA；空仓库（baseTreeSha=null）时不带该字段
    const body: Record<string, unknown> = { tree }
    if (baseTreeSha) body.base_tree = baseTreeSha
    const result = await giteeFetch<GitSha>(`/repos/${enc(owner)}/${enc(repo)}/git/trees`, token, {
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
    const commit = await giteeFetch<GitSha>(`/repos/${enc(owner)}/${enc(repo)}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return commit.sha
  },

  async updateBranchRef(owner: string, repo: string, branch: string, commitSha: string, token: string) {
    // 同 githubAdapter（2026-11-03 审查 P1）：去掉无条件 force，交给服务端 fast-forward 校验。
    try {
      await giteeFetch(`/repos/${enc(owner)}/${enc(repo)}/git/refs/heads/${enc(branch)}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitSha }),
      })
    } catch (err) {
      if (err instanceof DeployApiError && (err.status === 422 || err.status === 400)) {
        throw new Error(
          `部署被拒绝：远端分支「${branch}」已被其他提交推进（非快进）。请刷新后重试；若该分支仅用于部署，可改用独立分支。`,
        )
      }
      await giteeFetch(`/repos/${enc(owner)}/${enc(repo)}/git/refs`, token, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitSha }),
      })
    }
  },

  async configurePages(owner: string, repo: string, branch: string, token: string) {
    try {
      await giteeFetch(`/repos/${enc(owner)}/${enc(repo)}/pages/builds`, token, {
        method: 'POST',
        body: JSON.stringify({ branch }),
      })
    } catch (err) {
      // 构建已在进行 / Pages 已启用 → 幂等；其余错误上抛（避免「假成功」）
      if (err instanceof DeployApiError && PAGES_IDEMPOTENT_STATUSES.has(err.status)) return
      throw err
    }
  },
}
