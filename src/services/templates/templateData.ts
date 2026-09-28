// 模板静态数据层（P2-4 下沉）
//
// 原 `features/templates/templateManager.ts` 中的「内置模板数据 + 范例数据 + 日记模板解析」
// 是与 UI / 存储解耦的纯数据，下沉到 services 后：
//  - features/fileManager（DailyNoteService）可直接按固定 id 解析每日日记模板，
//    不再反向依赖 features/templates（消除 feature→feature 反向借用边）；
//  - features/templates/templateManager 改为「数据 + 纯应用」的薄壳 + UI/存储专用逻辑。
//
// 数据内容逐字节沿用原文件，行为不变。

export interface Template {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  content: string;
  isBuiltIn: boolean;
}

// 内置模板
export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: 'meeting',
    name: '会议记录',
    nameEn: 'Meeting Notes',
    icon: '📋',
    content: `# 会议记录\n\n**日期**: {{date}}\n**参与人**: \n**主题**: \n\n## 议程\n1. \n\n## 讨论内容\n\n## 待办事项\n- [ ] \n`,
    isBuiltIn: true,
  },
  {
    id: 'book-notes',
    name: '读书笔记',
    nameEn: 'Book Notes',
    icon: '📚',
    content: `# {{title}}\n\n**作者**: \n**阅读日期**: {{date}}\n\n## 摘要\n\n## 核心观点\n1. \n\n## 精彩摘录\n> \n\n## 读后感\n`,
    isBuiltIn: true,
  },
  {
    id: 'project-plan',
    name: '项目计划',
    nameEn: 'Project Plan',
    icon: '🚀',
    content: `# 项目计划\n\n**项目名称**: \n**开始日期**: {{date}}\n**预计完成**: \n\n## 目标\n- \n\n## 里程碑\n1. \n\n## 任务清单\n- [ ] \n\n## 风险与对策\n| 风险 | 概率 | 影响 | 对策 |\n|------|------|------|------|\n| | | | |\n`,
    isBuiltIn: true,
  },
  {
    id: 'daily-journal',
    name: '每日日记',
    nameEn: 'Daily Journal',
    icon: '📔',
    content: `# {{date}}\n\n## 今日计划\n- [ ] \n\n## 今日记录\n\n## 心得与感悟\n\n## 明日计划\n- [ ] \n`,
    isBuiltIn: true,
  },
  {
    id: 'task-list',
    name: '任务清单',
    nameEn: 'Task List',
    icon: '✅',
    content: `# 任务清单\n\n**创建日期**: {{date}}\n\n## 待办\n- [ ] \n\n## 进行中\n- [ ] \n\n## 已完成\n- [x] \n`,
    isBuiltIn: true,
  },
  {
    id: 'weekly-report',
    name: '周报',
    nameEn: 'Weekly Report',
    icon: '📝',
    content: `# 周报（{{date}}）\n\n## 本周完成\n- \n\n## 进行中\n- \n\n## 下周计划\n- \n\n## 风险与阻塞\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'okr',
    name: 'OKR 目标管理',
    nameEn: 'OKR',
    icon: '🎯',
    content: `# OKR：{{title}}\n\n## Objective\n目标：\n\n## Key Results\n- KR1：（当前 / 目标）\n- KR2：\n- KR3：\n\n## 周进度\n| 周次 | 进展 | 风险 |\n|------|------|------|\n| W1 | | |\n`,
    isBuiltIn: true,
  },
  {
    id: 'retro',
    name: '项目复盘',
    nameEn: 'Retrospective',
    icon: '🔍',
    content: `# 项目复盘：{{title}}\n\n## 背景与目标\n- \n\n## 做得好的\n- \n\n## 待改进\n- \n\n## 行动项\n- [ ] \n`,
    isBuiltIn: true,
  },
  {
    id: 'idea',
    name: '灵感速记',
    nameEn: 'Idea Capture',
    icon: '💡',
    content: `# 灵感：{{title}}\n\n## 一句话\n- \n\n## 展开\n- \n\n## 关联\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'travel',
    name: '旅行计划',
    nameEn: 'Travel Plan',
    icon: '✈️',
    content: `# 旅行计划：{{title}}\n\n**日期**：{{date}}\n\n## 行程\n- Day 1：\n- Day 2：\n\n## 清单\n- [ ] \n`,
    isBuiltIn: true,
  },
  // —— P1-6 写作/博客/Newsletter 场景模板 ——
  {
    id: 'blog-post',
    name: '博客发文',
    nameEn: 'Blog Post',
    icon: '✍️',
    content: `# 博客发文：{{title}}\n\n**副标题**：用一句话讲清这篇文章的价值\n**日期**：{{date}}\n**标签**：#写作 #工具\n\n![封面](https://)\n\n## 开篇\n用一段钩子抓住读者：痛点、反直觉观点，或一个故事。\n\n## 正文\n### 小标题一\n抛出观点，配一个具体例子。\n\n### 小标题二\n再深入一层，给出可执行的建议。\n\n## 总结\n回顾核心观点，给读者一个能立刻上手的下一步。\n\n## 行动召唤\n欢迎评论、关注或订阅，让更多同好看到。`,
    isBuiltIn: true,
  },
  {
    id: 'newsletter',
    name: 'Newsletter 期',
    nameEn: 'Newsletter Issue',
    icon: '📰',
    content: `# Newsletter · 第 ___ 期\n\n**日期**：{{date}}\n**本期主题**：\n\n## 编者按\n用三句话说明本期为什么值得读。\n\n## 精选一\n[链接](https://) —— 一句话点评。\n\n## 精选二\n[链接](https://) —— 一句话点评。\n\n## 一句话思考\n本周最值得反复琢磨的一句话。\n\n## 订阅与反馈\n回复告诉我你最想看的内容。`,
    isBuiltIn: true,
  },
  {
    id: 'series',
    name: '系列专栏',
    nameEn: 'Series Column',
    icon: '📚',
    content: `# 系列专栏：{{title}}\n\n**简介**：这个系列要解决什么问题、面向谁。\n**状态**：规划中\n\n## 已发布\n- [EP01] 主题 —— [链接](https://)\n- [EP02] 主题 —— [链接](https://)\n\n## 待发布规划\n- [EP03] 主题\n- [EP04] 主题\n\n## 读者地图\n从入门到精通的成长路径。`,
    isBuiltIn: true,
  },
];

// —— P1-6 范例库：可一键载入的成稿范例（非模板，不套变量）——
export interface ExampleDoc {
  id: string
  name: string
  nameEn: string
  scene: string
  icon: string
  content: string
}

export const BUILTIN_EXAMPLES: ExampleDoc[] = [
  {
    id: 'ex-blog-local-first',
    name: '范例 · 博客《本地优先写作》',
    nameEn: 'Example · Blog "Local-First Writing"',
    scene: 'blog',
    icon: '✍️',
    content: `# 本地优先写作：把笔记真正留在自己手里

**副标题**：为什么我把博客、笔记和知识库都搬回了本地文件
**日期**：{{date}}
**标签**：#写作 #本地优先 #PKM

## 开篇
云笔记用着方便，却总让我隐隐不安：哪天服务关停，我的第二大脑就归零了。本地优先，是把主动权拿回来的第一步。

## 正文
### 数据属于你
所有内容以纯文本 Markdown 落盘，不依赖任何私有格式。

### 离线也能写
没有网络也能创作，灵感从不被加载圈打败。

### 可随时导出
标准格式意味着你永远可以带着全部历史离开。

## 总结
本地优先不是退步，而是对"自己的内容自己作主"的坚持。

## 行动召唤
今晚就把一篇旧文导出为纯文本，感受那种踏实。`,
  },
  {
    id: 'ex-newsletter-issue',
    name: '范例 · Newsletter 第 12 期',
    nameEn: 'Example · Newsletter Issue 12',
    scene: 'newsletter',
    icon: '📰',
    content: `# Newsletter · 第 12 期

**日期**：{{date}}
**本期主题**：写作工具的「 ownership 」

## 编者按
这一期我们只聊一件事：你在谁手里。

## 精选一
[本地优先软件清单](https://) —— 一份不依赖云端的工具索引。

## 精选二
[纯文本的力量](https://) —— 为什么 Markdown 二十年不过时。

## 一句话思考
「免费」的产品，往往你才是被售卖的那个。

## 订阅与反馈
回复告诉我，你最舍不得删的本地文件是什么。`,
  },
  {
    id: 'ex-series-pkm',
    name: '范例 · 系列《从零搭 PKM》',
    nameEn: 'Example · Series "Build a PKM from Scratch"',
    scene: 'series',
    icon: '📚',
    content: `# 系列专栏：从零搭一套 PKM

**简介**：面向注重自主的知识写作者，用 6 篇把个人知识系统搭起来。
**状态**：进行中

## 已发布
- [EP01] 为什么需要 PKM —— [链接](https://)
- [EP02] 选一个本地优先的编辑器 —— [链接](https://)

## 待发布规划
- [EP03] 双向链接与图谱
- [EP04] 每日笔记习惯
- [EP05] 写作与发布闭环

## 读者地图
从「存文件」到「连思想」，再到「发作品」。`,
  },
]

export function getExamples(): ExampleDoc[] {
  return BUILTIN_EXAMPLES
}

export function getExampleById(id: string): ExampleDoc | undefined {
  return BUILTIN_EXAMPLES.find(e => e.id === id)
}

/**
 * 日记模板匹配（P2-4 下沉）
 *
 * 按固定 id `daily-journal` 解析每日日记模板。原 `DailyNoteService` 通过
 * `getAllTemplates().find(t => t.id === 'daily-journal')` 取内置日记模板；
 * 用户自定义模板经 UI 落盘时由 `genTemplateId` 生成随机 id，不会取得 `daily-journal`
 * 这一固定 id，故「内置优先匹配」与「全量匹配」在实践中等价，行为不变。
 */
export function resolveDailyJournalTemplate(): Template | undefined {
  return BUILTIN_TEMPLATES.find(t => t.id === 'daily-journal')
}
