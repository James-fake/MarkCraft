import type { PlatformAdapter, GitTreeItem, GitUser, GitRefObject, GitSha } from './deployTypes'

const GITHUB_API = 'https://api.github.com'

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

  async fetch(path: string, token: string, options?: RequestInit) {
    const res = await fetch(`${GITHUB_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message || `GitHub API error: ${res.status}`)
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
        body: JSON.stringify({ name: repo, auto_init: true, homepage: this.getPagesUrl(owner, repo) }),
      })
    }
  },

  async getBranchRef(owner: string, repo: string, branch: string, token: string) {
    try {
      const ref = await this.fetch<GitRefObject>(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token)
      return ref.object.sha
    } catch {
      const mainRef = await this.fetch<GitRefObject>(`/repos/${owner}/${repo}/git/ref/heads/main`, token)
      return mainRef.object.sha
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
      await this.fetch(`/repos/${owner}/${repo}/pages`, token, {
        method: 'POST',
        body: JSON.stringify({ source: { branch, path: '/' } }),
      })
    } catch { /* Pages may already be configured */ }
  },
}
