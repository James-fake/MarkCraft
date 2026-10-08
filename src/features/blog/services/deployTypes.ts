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
  /**
   * 非致命警告（语言包键）：部署本身已成功，但有环节未达成（如 Pages 未能自动启用）。
   * 用于把「假成功」变成「成功 + 明确告知」，UI 需在成功态一并展示。
   */
  warningKey?: string
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
/** Git commit 对象（用于从 commit 解引用出它指向的 tree） */
export interface GitCommitObject { sha: string; tree: { sha: string } }

/**
 * 分支尖端（branch head）的完整信息。
 *
 * ⚠️ 为什么不能只返回一个 SHA：Git 的 tree 创建接口（`POST /git/trees`）的 `base_tree`
 * 参数要求的是 **tree 对象**的 SHA，而「新 commit 的 parent」要求的是 **commit 对象**的 SHA。
 * 二者是不同对象、SHA 也不同。只拿 `refs/heads/X → object.sha`（那是 commit）直接当
 * `base_tree` 传，等于把 commit 当 tree 用 —— 与官方文档不符
 * （文档原文：`base_tree` = "The SHA1 of an existing Git **tree object** ..."）。
 * 故这里把两者一并解析出来，各自用在正确的参数上。
 */
export interface BranchHead {
  /** 分支尖端 commit 的 SHA —— 用作 createCommit 的 parent */
  commitSha: string
  /** 该 commit 指向的 tree 的 SHA —— 用作 createTree 的 base_tree */
  treeSha: string
}

/**
 * 远端 API 错误（携带 HTTP 状态码）。
 *
 * 适配器需要按状态码区分「幂等可忽略」（如 Pages 已启用 = 409）与「真失败」，
 * 而原来只抛 `new Error(message)` 会丢掉状态码，导致调用方只能 `catch {}` 一律吞掉，
 * 把「私有库开 Pages 需 GitHub Pro 而被拒」这类真失败伪装成成功。
 */
export class DeployApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'DeployApiError'
    this.status = status
  }
}

export interface PlatformAdapter {
  apiBase: string
  platformName: string
  defaultBranch: string
  getPagesUrl(owner: string, repo: string): string
  getDefaultRepo(username: string): string
  fetch<T = unknown>(path: string, token: string, options?: RequestInit): Promise<T>
  validateToken(token: string): Promise<{ login: string; name: string }>
  ensureRepo(owner: string, repo: string, token: string): Promise<void>
  /**
   * 解析部署基准分支的尖端。
   *
   * 解析顺序：目标分支（如 gh-pages）→ 仓库真实默认分支（`GET /repos/{owner}/{repo}` 的
   * `default_branch`，不再硬编码 main/master）→ 常见兜底名。
   * 仓库完全为空（没有任何分支）时返回 `null`，由调用方走「无 base、无 parent」的首次提交路径。
   */
  getBranchHead(owner: string, repo: string, branch: string, token: string): Promise<BranchHead | null>
  createBlob(owner: string, repo: string, content: string, token: string): Promise<string>
  /** `baseTreeSha` 必须是 **tree** 的 SHA；传 `null` 表示不基于任何已有 tree（空仓库首提交） */
  createTree(owner: string, repo: string, tree: GitTreeItem[], baseTreeSha: string | null, token: string): Promise<string>
  /** `parentSha` 传 `null` 表示根提交（无父） */
  createCommit(owner: string, repo: string, message: string, treeSha: string, parentSha: string | null, token: string): Promise<string>
  updateBranchRef(owner: string, repo: string, branch: string, commitSha: string, token: string): Promise<void>
  configurePages(owner: string, repo: string, branch: string, token: string): Promise<void>
}
