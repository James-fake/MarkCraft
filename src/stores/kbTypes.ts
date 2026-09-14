/**
 * 知识库类型定义
 */

/** 知识库文档（单个知识库的完整定义） */
export interface KnowledgeBase {
  id: string                    // 唯一 ID（kb-{timestamp}）
  name: string                  // 知识库名称
  description: string           // 描述
  folderId: string              // 关联的文件树文件夹 ID（独立文件夹）
  createdAt: number
  updatedAt: number

  // 内容关联
  canvasIds: string[]           // 关联的 Canvas 白板 ID 列表
  fileIds: string[]             // 手动添加的额外文件 ID（不在 folderId 下但属于此库）

  // 规则筛选（自动包含符合条件的文件）
  rules: KnowledgeBaseRule[]

  // 博客配置
  blogConfig?: KnowledgeBaseBlogConfig

  // 统计缓存
  stats?: KnowledgeBaseStats

  // P7-A 智能化
  mocFileId?: string                    // 自动生成的 MOC 文件 ID
  blindSpotCache?: BlindSpotReport      // 知识盲区报告缓存
  aiSummary?: string                    // AI 生成的库摘要

  // P7-C 工作流
  learningPath?: LearningPathItem[]     // 学习路径
  tasks?: KbTask[]                      // 任务清单
  writingGoals?: WritingGoal[]          // 写作目标
  reviewSchedule?: ReviewSchedule       // 定期回顾配置
  templateId?: string                   // 创建时使用的模板 ID

  // P7-D 检索
  savedQueries?: SavedQuery[]           // 保存的查询预设

  // P7-E 关联分析
  healthScore?: number                  // 健康度评分（0-100）
  healthCheckedAt?: number             // 上次评分时间

  // P7-B 导出元信息
  exportHistory?: ExportRecord[]       // 导出历史
}

/** 规则筛选条件 */
export interface KnowledgeBaseRule {
  id: string
  type: 'tag' | 'path' | 'name'
  value: string                 // #tag / path:xxx / name:xxx
  enabled: boolean
}

/** 博客配置（一键发布） */
export interface KnowledgeBaseBlogConfig {
  siteTitle: string
  siteDescription: string
  author: string
  layout: 'magazine' | 'minimal' | 'classic'
  colorScheme: string
  theme: 'light' | 'dark'
  font: 'serif' | 'sans' | 'mono'
}

/** 统计数据 */
export interface KnowledgeBaseStats {
  fileCount: number             // 笔记文件数
  canvasCount: number           // 画布数
  totalWords: number            // 总字数
  tagCount: number              // 标签数
  lastActivity: number          // 最近活动时间
  topTags: { tag: string; count: number }[]
  activityHeatmap: { date: string; count: number }[]
}

/** 知识库列表项（轻量，用于列表展示） */
export interface KnowledgeBaseListItem {
  id: string
  name: string
  description: string
  folderId: string
  fileCount: number
  canvasCount: number
  createdAt: number
  updatedAt: number
}

/** 生成唯一知识库 ID */
export function genKbId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** 生成唯一规则 ID */
export function genRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// ─── P7-A 智能化类型 ───

/** 知识盲区报告 */
export interface BlindSpotReport {
  generatedAt: number
  orphanFiles: string[]                 // 孤立文件 ID（无任何链接）
  missingTopics: MissingTopic[]         // 被引用但不存在的话题
  weakConnections: WeakConnection[]     // 链接数 < 2 的文件
  suggestedLinks: SuggestedLink[]       // AI 建议的双链
}

/** 缺失话题 */
export interface MissingTopic {
  topic: string
  referencedBy: string[]
  suggestedName: string
}

/** 弱连接 */
export interface WeakConnection {
  fileId: string
  fileName: string
  linkCount: number
}

/** 建议链接 */
export interface SuggestedLink {
  fromFileId: string
  toFileId: string
  confidence: number                    // 0-1
  reason: string
}

// ─── P7-C 工作流类型 ───

/** 学习路径条目 */
export interface LearningPathItem {
  fileId: string
  order: number
  status: 'pending' | 'learning' | 'completed'
  addedAt: number
  completedAt?: number
  notes?: string
}

/** 知识库任务 */
export interface KbTask {
  id: string
  title: string
  description?: string
  status: 'todo' | 'doing' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate?: number
  relatedFileId?: string
  createdAt: number
  completedAt?: number
}

/** 写作目标 */
export interface WritingGoal {
  id: string
  type: 'wordCount' | 'frequency' | 'streak'
  target: number
  period: 'daily' | 'weekly' | 'monthly'
  startDate: number
  endDate?: number
  progress: number
  history: { date: string; value: number }[]
}

/** 定期回顾配置 */
export interface ReviewSchedule {
  enabled: boolean
  frequency: 'weekly' | 'monthly'
  dayOfWeek?: number                    // 0-6（weekly 用）
  dayOfMonth?: number                   // 1-31（monthly 用）
  lastReviewAt?: number
  nextReviewAt?: number
  autoSummary: boolean
}

// ─── P7-D 检索类型 ───

/** 保存的查询 */
export interface SavedQuery {
  id: string
  name: string
  query: string
  filters: QueryFilters
  createdAt: number
}

/** 查询筛选器 */
export interface QueryFilters {
  tags?: string[]
  tagsNot?: string[]
  pathPattern?: string
  dateRange?: { start: number; end: number }
  wordCountRange?: { min: number; max: number }
  linkCountRange?: { min: number; max: number }
  hasCanvas?: boolean
  tagLogic?: 'and' | 'or'
}

// ─── P7-B 导出类型 ───

/** 导出记录 */
export interface ExportRecord {
  id: string
  type: 'share' | 'static-site' | 'pdf' | 'epub'
  filename: string
  fileCount: number
  exportedAt: number
  sizeBytes: number
}

// ─── P7-E 关联分析类型 ───

/** 推荐文件 */
export interface RecommendedFile {
  fileId: string
  fileName: string
  score: number
  reason: string
}

/** 知识库推荐 */
export interface KbRecommendation {
  kbId: string
  kbName: string
  score: number
  reason: string
}

// ─── P7-C 模板预设类型 ───

/** 知识库模板 */
export interface KbTemplate {
  id: string
  name: string
  icon: string
  description: string
  category: 'study' | 'project' | 'reading' | 'research' | 'custom'
  folderStructure: { name: string; children?: string[] }[]
  presetRules: Omit<KnowledgeBaseRule, 'id' | 'enabled'>[]
  presetTags: string[]
  blogConfig?: Partial<KnowledgeBaseBlogConfig>
  learningPathTemplate?: { fileName: string; notes?: string }[]
}

// ─── P7-A AI 配置类型 ───

/** AI 服务配置 */
export interface AiSettings {
  mode: 'local' | 'remote'
  remoteBaseUrl?: string
  remoteApiKey?: string
  remoteModel?: string
  localEmbeddingModel?: string
  localGenerateModel?: string
}

/** AI 对话结果 */
export interface AiChatResult {
  answer: string
  sources: { fileId: string; snippet: string }[]
}
