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
  /**
   * 语言包键（t.blogCss 下的键名）。
   * 服务层为纯函数，无法访问 React 语言上下文，故进度文案走「键 + 参数」结构，
   * 由 UI 层（DeployPanel）用当前语言解析；`message` 保留为中文兜底/非 UI 消费方使用。
   */
  messageKey?: string
  /** messageKey 文案中的占位符参数，如 { current, total, path, platform } */
  messageParams?: Record<string, string>
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

/** GitHub/Gitee API 响应常用形状（fetch 为外部 HTTP 边界；调用点按需在泛型参数处给出具体类型） */
export interface GitUser { login: string; name?: string }
export interface GitBranchRef { commit: { sha: string } }
export interface GitRefObject { object: { sha: string } }
export interface GitSha { sha: string }

export interface PlatformAdapter {
  apiBase: string
  platformName: string
  defaultBranch: string
  getPagesUrl(owner: string, repo: string): string
  getDefaultRepo(username: string): string
  fetch<T = unknown>(path: string, token: string, options?: RequestInit): Promise<T>
  validateToken(token: string): Promise<{ login: string; name: string }>
  ensureRepo(owner: string, repo: string, token: string): Promise<void>
  getBranchRef(owner: string, repo: string, branch: string, token: string): Promise<string>
  createBlob(owner: string, repo: string, content: string, token: string): Promise<string>
  createTree(owner: string, repo: string, tree: GitTreeItem[], baseTreeSha: string, token: string): Promise<string>
  createCommit(owner: string, repo: string, message: string, treeSha: string, parentSha: string, token: string): Promise<string>
  updateBranchRef(owner: string, repo: string, branch: string, commitSha: string, token: string): Promise<void>
  configurePages(owner: string, repo: string, branch: string, token: string): Promise<void>
}
