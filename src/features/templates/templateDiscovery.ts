import {
  BUILTIN_TEMPLATES,
  BUILTIN_EXAMPLES,
  Template,
  ExampleDoc,
  saveUserTemplate,
  getAllTemplates,
  importSharedTemplate,
} from './templateManager'

/**
 * P2-7 模板/用户案例发现层
 *
 * 设计原则（诚实本地）：
 * - 全部内容离线可用、非强制云；"社区"模板为本地内置样例，一键获取即落盘到用户模板。
 * - 导入共享模板走既有 importSharedTemplate（读取本地文件），不上传任何内容。
 * - UI 须显著标注「本地 · 非强制云」。
 */

export type DiscoveryKind = 'builtin-template' | 'example' | 'community'

export interface DiscoveryEntry {
  id: string
  name: string
  nameEn: string
  icon: string
  /** 适用场景，用于卡片副标题（双语，消费端按界面语言取） */
  scene: string
  sceneEn: string
  /** 一句话介绍（双语） */
  description: string
  descriptionEn: string
  kind: DiscoveryKind
}

/** 社区模板：本地内置的"社区共享"样例（离线可用，一键获取即落盘） */
export interface CommunityTemplate extends Omit<Template, 'isBuiltIn'> {
  scene: string
  sceneEn: string
  description: string
  descriptionEn: string
}

export const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  {
    id: 'community-weekly-review',
    name: '周复盘模板',
    nameEn: 'Weekly Review',
    icon: '🔁',
    scene: '复盘',
    sceneEn: 'Review',
    description: '回顾本周高光与卡点，聚焦下周最重要的一件事。',
    descriptionEn: 'Review this week’s wins and blockers, and focus on the single most important thing for next week.',
    content: `# 周复盘（{{date}}）

## 本周高光
- 

## 卡住的事
- 

## 下周聚焦
- [ ] 

## 一句话感悟
> 
`,
  },
  {
    id: 'community-reading-club',
    name: '读书会策划',
    nameEn: 'Reading Club Plan',
    icon: '📚',
    scene: '共读',
    sceneEn: 'Reading group',
    description: '为一次共读活动准备议程、讨论点与招募文案。',
    descriptionEn: 'Prepare the agenda, discussion points and promo copy for a group reading event.',
    content: `# 读书会：{{title}}

**时间**：{{date}}
**领读人**：
**共读书目**：

## 议程
1. 破冰与自我介绍
2. 核心章节共读
3. 开放讨论

## 讨论问题
- 这本书最打动你的是哪一段？
- 它改变了你对 ___ 的看法吗？

## 招募文案
欢迎来参加本期读书会，我们一起把一本书读厚、再读薄。
`,
  },
  {
    id: 'community-product-launch',
    name: '产品发布稿',
    nameEn: 'Product Launch',
    icon: '🚀',
    scene: '发布',
    sceneEn: 'Launch',
    description: '面向用户的发布长文：痛点、方案、行动召唤。',
    descriptionEn: 'A user-facing launch article: the pain point, the solution, and the call to action.',
    content: `# 我们发布了 {{title}}

**日期**：{{date}}

## 为什么做这件事
用一段真实的痛点开场，让读者点头。

## 它解决了什么
- 痛点一 → 我们的做法
- 痛点二 → 我们的做法

## 怎么用
三步上手：安装、连接、开写。

## 行动召唤
立即试用，并告诉我你的第一感受。
`,
  },
  {
    id: 'community-content-calendar',
    name: '内容日历',
    nameEn: 'Content Calendar',
    icon: '🗓️',
    scene: '运营',
    sceneEn: 'Marketing',
    description: '把一周的内容主题排进日历，保持节奏不空窗。',
    descriptionEn: 'Lay a week of content topics into the calendar to keep a steady rhythm.',
    content: `# 内容日历（{{date}} 起）

## 周一
- 主题：
- 形式：短文 / 视频 / Newsletter

## 周三
- 主题：
- 形式：

## 周五
- 主题：
- 形式：

## 本周目标
- [ ] 发布 3 篇
- [ ] 收集 5 条读者反馈
`,
  },
]

const BUILTIN_DESCRIPTIONS: Record<string, string> = {
  meeting: '结构化记录议程、讨论与待办。',
  'book-notes': '摘录、观点与读后感的统一框架。',
  'project-plan': '目标、里程碑与风险一览。',
  'daily-journal': '每日三问，沉淀当下。',
  'task-list': '待办 / 进行中 / 已完成分栏。',
  'weekly-report': '本周完成与下周计划。',
  okr: '目标与关键结果追踪。',
  retro: '项目复盘：好与待改进。',
  idea: '一闪而过的灵感速记。',
  travel: '行程与清单一次备齐。',
  'blog-post': '从钩子到行动召唤的发文骨架。',
  newsletter: '编者按 + 精选 + 思考的通讯骨架。',
  series: '系列专栏的发布地图。',
}

const BUILTIN_DESCRIPTIONS_EN: Record<string, string> = {
  meeting: 'Structured agenda, discussion and action items.',
  'book-notes': 'One framework for excerpts, opinions and reading notes.',
  'project-plan': 'Goals, milestones and risks at a glance.',
  'daily-journal': 'Three daily questions to capture the moment.',
  'task-list': 'To-do / in progress / done columns.',
  'weekly-report': 'This week’s completions and next week’s plan.',
  okr: 'Track objectives and key results.',
  retro: 'Project retro: what went well and what to improve.',
  idea: 'Quick capture for a fleeting spark.',
  travel: 'Itinerary and checklists in one place.',
  'blog-post': 'A post skeleton from hook to call to action.',
  newsletter: 'Newsletter skeleton: editorial note, picks, thoughts.',
  series: 'A publishing map for a series of columns.',
}

function mapBuiltin(t: Template): DiscoveryEntry {
  return {
    id: t.id,
    name: t.name,
    nameEn: t.nameEn,
    icon: t.icon,
    scene: '模板',
    sceneEn: 'Template',
    description: BUILTIN_DESCRIPTIONS[t.id] ?? '',
    descriptionEn: BUILTIN_DESCRIPTIONS_EN[t.id] ?? '',
    kind: 'builtin-template',
  }
}

function mapExample(e: ExampleDoc): DiscoveryEntry {
  return {
    id: e.id,
    name: e.name,
    nameEn: e.nameEn,
    icon: e.icon,
    scene: e.scene,
    // ExampleDoc.scene 为英文标签（blog / newsletter / series），中英同值
    sceneEn: e.scene,
    description: '可一键载入的成稿范例。',
    descriptionEn: 'One-click loadable finished examples.',
    kind: 'example',
  }
}

function mapCommunity(c: CommunityTemplate): DiscoveryEntry {
  return {
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    icon: c.icon,
    scene: c.scene,
    sceneEn: c.sceneEn,
    description: c.description,
    descriptionEn: c.descriptionEn,
    kind: 'community',
  }
}

/** 获取全部可发现条目：内置模板 + 范例 + 社区模板 */
export function getDiscoveryEntries(): DiscoveryEntry[] {
  return [
    ...BUILTIN_TEMPLATES.map(mapBuiltin),
    ...BUILTIN_EXAMPLES.map(mapExample),
    ...COMMUNITY_TEMPLATES.map(mapCommunity),
  ]
}

export function discoverEntryById(id: string): DiscoveryEntry | undefined {
  return getDiscoveryEntries().find(e => e.id === id)
}

export interface AcquireResult {
  ok: boolean
  kind: DiscoveryKind | null
  /** 结果文案键（展示文案由 UI 经 t.templates.acquireMsg 解析，数据层不持文案） */
  messageKey: 'notFound' | 'acquired' | 'builtinReady' | 'loadReady'
  template?: Template
}

/**
 * 一键获取：
 * - 社区模板：落盘到用户自定义模板（saveUserTemplate），返回 template 供后续"分享"。
 * - 内置模板 / 范例：本就可用，返回提示文案，不重复落盘。
 */
export function acquireEntry(id: string): AcquireResult {
  const entry = discoverEntryById(id)
  if (!entry) {
    return { ok: false, kind: null, messageKey: 'notFound' }
  }
  if (entry.kind === 'community') {
    const src = COMMUNITY_TEMPLATES.find(c => c.id === id)
    if (!src) return { ok: false, kind: 'community', messageKey: 'notFound' }
    const tmpl: Template = {
      id: src.id,
      name: src.name,
      nameEn: src.nameEn,
      icon: src.icon,
      content: src.content,
      isBuiltIn: false,
    }
    saveUserTemplate(tmpl)
    return { ok: true, kind: 'community', messageKey: 'acquired', template: tmpl }
  }
  if (entry.kind === 'builtin-template') {
    const t = BUILTIN_TEMPLATES.find(t => t.id === id)
    if (t) return { ok: true, kind: 'builtin-template', messageKey: 'builtinReady', template: t }
  }
  return { ok: true, kind: entry.kind, messageKey: 'loadReady' }
}

/** 重新导出：导入共享/社区模板文件（读取本地文件，不上云） */
export function importDiscoveryFile(file: File): Promise<Template> {
  return importSharedTemplate(file)
}

/** 便捷查询：社区模板获取后是否已存在于用户模板中 */
export function isCommunityAcquired(id: string): boolean {
  return getAllTemplates().some(t => t.id === id && !t.isBuiltIn)
}

/** 取用于"分享/导出"的模板对象（内置与社区可分享；范例为内容不可分享） */
export function getShareTemplate(id: string): Template | undefined {
  const builtin = BUILTIN_TEMPLATES.find(t => t.id === id)
  if (builtin) return builtin
  const community = COMMUNITY_TEMPLATES.find(c => c.id === id)
  if (community) {
    return {
      id: community.id,
      name: community.name,
      nameEn: community.nameEn,
      icon: community.icon,
      content: community.content,
      isBuiltIn: false,
    }
  }
  return undefined
}
