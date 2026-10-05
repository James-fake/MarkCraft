import type { PlatformAdapter, GitTreeItem, GitUser, GitBranchRef, GitSha } from './deployTypes'
import { fetchWithTimeout } from './fetchWithTimeout'

const GITEE_API = 'https://gitee.com/api/v5'

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

  async fetch(path: string, token: string, options?: RequestInit) {
    // token 不能放 URL（会泄漏进浏览器历史 / Referer / 服务端日志）；改用 Authorization 头，
    // 与 githubAdapter / cloudflareAdapter 的做法保持一致
    const url = `${GITEE_API}${path}`
    const res = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message || `Gitee API error: ${res.status}`)
    }
    if (res.status === 204) return null
    return res.json()
  },

  async validateToken(token: string) {
    const user = await this.fetch<GitUser>('/user', token)
    return { login: user.login, name: user.name || user.login }
  },

  async ensureRepo(owner: string, repo: string, token: string) {
    try {
      await this.fetch(`/repos/${owner}/${repo}`, token)
    } catch {
      await this.fetch('/user/repos', token, {
        method: 'POST',
        body: JSON.stringify({ name: repo, auto_init: true, homepage: this.getPagesUrl(owner, repo), private: false, has_issues: false, has_wiki: false }),
      })
    }
  },

  async getBranchRef(owner: string, repo: string, branch: string, token: string) {
    try {
      const branchInfo = await this.fetch<GitBranchRef>(`/repos/${owner}/${repo}/branches/${branch}`, token)
      return branchInfo.commit.sha
    } catch {
      const masterBranch = await this.fetch<GitBranchRef>(`/repos/${owner}/${repo}/branches/master`, token)
      return masterBranch.commit.sha
    }
  },

  async createBlob(owner: string, repo: string, content: string, token: string) {
    const blob = await this.fetch<GitSha>(`/repos/${owner}/${repo}/git/blobs`, token, {
      method: 'POST',
      body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' }),
    })
    return blob.sha
  },

  async createTree(owner: string, repo: string, tree: GitTreeItem[], baseTreeSha: string, token: string) {
    const result = await this.fetch<GitSha>(`/repos/${owner}/${repo}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree }),
    })
    return result.sha
  },

  async createCommit(owner: string, repo: string, message: string, treeSha: string, parentSha: string, token: string) {
    const commit = await this.fetch<GitSha>(`/repos/${owner}/${repo}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
    })
    return commit.sha
  },

  async updateBranchRef(owner: string, repo: string, branch: string, commitSha: string, token: string) {
    try {
      await this.fetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitSha, force: true }),
      })
    } catch {
      await this.fetch(`/repos/${owner}/${repo}/git/refs`, token, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitSha }),
      })
    }
  },

  async configurePages(owner: string, repo: string, branch: string, token: string) {
    try {
      await this.fetch(`/repos/${owner}/${repo}/pages/builds`, token, {
        method: 'POST',
        body: JSON.stringify({ branch }),
      })
    } catch { /* Pages may not be enabled */ }
  },
}
