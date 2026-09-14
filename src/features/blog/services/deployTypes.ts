export type DeployPlatform = 'github' | 'gitee' | 'vercel' | 'cloudflare' | 'netlify'

export interface DeployConfig {
  platform: DeployPlatform
  token: string
  owner: string
  repo: string
  branch?: string
}

export interface DeployProgress {
  stage: 'authenticating' | 'creating-repo' | 'uploading' | 'committing' | 'configuring-pages' | 'done' | 'error'
  message: string
  progress: number
  url?: string
}

export type DeployProgressCallback = (progress: DeployProgress) => void

/** Git tree item for GitHub/Gitee API */
export interface GitTreeItem {
  path: string
  mode: '100644' | '100755' | '040000' | '160000' | '120000'
  type: 'blob' | 'tree' | 'commit'
  sha?: string
  content?: string
}

export interface PlatformAdapter {
  apiBase: string
  platformName: string
  defaultBranch: string
  getPagesUrl(owner: string, repo: string): string
  getDefaultRepo(username: string): string
  fetch(path: string, token: string, options?: RequestInit): Promise<any>
  validateToken(token: string): Promise<{ login: string; name: string }>
  ensureRepo(owner: string, repo: string, token: string): Promise<void>
  getBranchRef(owner: string, repo: string, branch: string, token: string): Promise<string>
  createBlob(owner: string, repo: string, content: string, token: string): Promise<string>
  createTree(owner: string, repo: string, tree: GitTreeItem[], baseTreeSha: string, token: string): Promise<string>
  createCommit(owner: string, repo: string, message: string, treeSha: string, parentSha: string, token: string): Promise<string>
  updateBranchRef(owner: string, repo: string, branch: string, commitSha: string, token: string): Promise<void>
  configurePages(owner: string, repo: string, branch: string, token: string): Promise<void>
}
