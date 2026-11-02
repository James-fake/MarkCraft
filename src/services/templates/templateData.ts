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
    content: `# 会议记录\n\n**日期**: {{date}}\n**参与人**: \n**主题**: \n\n## 议程\n1. \n\n## 讨论内容\n{{cursor}}\n\n## 待办事项\n- [ ] \n`,
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
    content: `# {{date}}\n\n## 今日计划\n- [ ] {{cursor}}\n\n## 今日记录\n\n## 心得与感悟\n\n## 明日计划\n- [ ] \n`,
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
  // —— 第二批：跨领域 / 跨人群（20 个）——
  {
    id: 'course-notes',
    name: '课程笔记',
    nameEn: 'Course Notes',
    icon: '🎓',
    content: `# {{title}} · 课程笔记\n\n**课程**：\n**讲师**：\n**日期**：{{date}}\n\n## 本节要点\n1. \n\n## 关键概念\n- **概念**：解释\n\n## 例题 / 演示\n\n## 我的疑问\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'exam-review',
    name: '复习计划',
    nameEn: 'Exam Review Plan',
    icon: '📖',
    content: `# 复习计划：{{title}}\n\n**考试日期**：\n**剩余天数**：\n\n## 考试范围\n- \n\n## 知识点清单\n- [ ] \n- [ ] \n\n## 易错点\n- \n\n## 每日安排\n| 日期 | 内容 | 完成 |\n|------|------|------|\n| {{date}} | | [ ] |\n`,
    isBuiltIn: true,
  },
  {
    id: 'paper-notes',
    name: '文献笔记',
    nameEn: 'Paper Notes',
    icon: '🔬',
    content: `# {{title}}\n\n**作者**：\n**发表**：\n**阅读日期**：{{date}}\n\n## 研究问题\n- \n\n## 方法\n- \n\n## 主要结论\n1. \n\n## 我的评价与启发\n- \n\n## 可复用引用\n> \n`,
    isBuiltIn: true,
  },
  {
    id: 'interview',
    name: '面试记录',
    nameEn: 'Interview Notes',
    icon: '💼',
    content: `# 面试记录：{{title}}\n\n**公司 / 岗位**：\n**日期**：{{date}}\n**面试官**：\n\n## 考察问题\n1. \n2. \n\n## 我的回答复盘\n- \n\n## 反问环节\n- \n\n## 待跟进\n- [ ] \n`,
    isBuiltIn: true,
  },
  {
    id: 'one-on-one',
    name: '一对一沟通',
    nameEn: '1:1 Meeting',
    icon: '🤝',
    content: `# 1:1 · {{date}}\n\n**对象**：\n**周期**：\n\n## 对方近况\n- \n\n## 进展与卡点\n- \n\n## 反馈与建议\n- \n\n## 下一步\n- [ ] \n`,
    isBuiltIn: true,
  },
  {
    id: 'performance-review',
    name: '绩效自评',
    nameEn: 'Performance Review',
    icon: '📈',
    content: `# 绩效自评：{{title}}\n\n**周期**：{{date}}\n**岗位**：\n\n## 目标达成\n- 目标 → 结果\n\n## 亮点\n- \n\n## 不足与改进\n- \n\n## 下阶段目标\n- [ ] \n`,
    isBuiltIn: true,
  },
  {
    id: 'talk-outline',
    name: '演讲大纲',
    nameEn: 'Talk Outline',
    icon: '🎤',
    content: `# {{title}}\n\n**场合**：\n**时长**：\n**听众**：\n\n## 一句话主旨\n> \n\n## 结构\n1. 开场钩子\n2. 核心观点一\n3. 核心观点二\n4. 收尾与行动号召\n\n## 可能的提问\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'video-script',
    name: '视频脚本',
    nameEn: 'Video Script',
    icon: '🎬',
    content: `# 视频脚本：{{title}}\n\n**时长**：\n**平台**：\n**拍摄日期**：{{date}}\n\n## 标题 / 封面文案\n- \n\n## 分镜\n| 镜头 | 画面 | 口播 | 时长 |\n|------|------|------|------|\n| 1 | | | |\n\n## 结尾 CTA\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'podcast-outline',
    name: '播客提纲',
    nameEn: 'Podcast Outline',
    icon: '🎧',
    content: `# 播客提纲 · {{title}}\n\n**期数**：\n**嘉宾**：\n**录制日期**：{{date}}\n\n## 开场\n- \n\n## 话题\n1. \n2. \n\n## 金句预备\n> \n\n## 结尾 / 下期预告\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'social-post',
    name: '社媒文案',
    nameEn: 'Social Post',
    icon: '📱',
    content: `# 社媒文案 · {{date}}\n\n**平台**：\n**主题**：\n\n## 钩子（首句 / 前 3 秒）\n- \n\n## 正文\n- \n\n## 话题标签\n# \n\n## 互动引导\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'workout-log',
    name: '健身日志',
    nameEn: 'Workout Log',
    icon: '🏋️',
    content: `# 训练日志 · {{date}}\n\n**部位**：\n**时长**：\n\n## 热身\n- \n\n## 正式组\n| 动作 | 重量 | 组数×次数 | RPE |\n|------|------|-----------|-----|\n| | | | |\n\n## 有氧 / 拉伸\n- \n\n## 感受与下次调整\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'recipe',
    name: '食谱记录',
    nameEn: 'Recipe',
    icon: '🍳',
    content: `# {{title}}\n\n**份量**： **耗时**：\n\n## 食材\n- \n\n## 步骤\n1. \n2. \n\n## 小贴士\n- \n\n**记录日期**：{{date}}\n`,
    isBuiltIn: true,
  },
  {
    id: 'budget',
    name: '月度预算',
    nameEn: 'Monthly Budget',
    icon: '💰',
    content: `# {{date}} 预算与记账\n\n## 收入\n- \n\n## 固定支出\n- \n\n## 变动支出\n- \n\n## 结余与储蓄目标\n- \n\n## 本月反思\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'habit-tracker',
    name: '习惯打卡',
    nameEn: 'Habit Tracker',
    icon: '🌱',
    content: `# 习惯打卡 · {{date}}\n\n## 本月目标\n- \n\n## 打卡\n| 习惯 | 一 | 二 | 三 | 四 | 五 | 六 | 日 |\n|------|----|----|----|----|----|----|----|\n| | | | | | | | |\n\n## 连续天数\n- \n\n## 感受\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'movie-notes',
    name: '观影笔记',
    nameEn: 'Movie Notes',
    icon: '🍿',
    content: `# 观影 · {{title}}\n\n**类型**： **评分**：\n**观看日期**：{{date}}\n\n## 一句话印象\n> \n\n## 打动我的点\n- \n\n## 存疑 / 不喜欢\n- \n\n## 想推荐给谁\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'prd',
    name: '需求文档',
    nameEn: 'PRD',
    icon: '📐',
    content: `# PRD：{{title}}\n\n**版本**： **日期**：{{date}}\n**负责人**：\n\n## 背景与目标\n- \n\n## 用户与场景\n- \n\n## 功能需求\n| 编号 | 需求 | 优先级 | 验收标准 |\n|------|------|--------|----------|\n| | | | |\n\n## 非目标\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'user-interview',
    name: '用户访谈',
    nameEn: 'User Interview',
    icon: '🗣️',
    content: `# 用户访谈 · {{date}}\n\n**受访者**：\n**场景**：\n\n## 访谈目标\n- \n\n## 关键问题与回答\n1. \n\n## 痛点 / 原声\n> \n\n## 洞察与行动项\n- [ ] \n`,
    isBuiltIn: true,
  },
  {
    id: 'bug-report',
    name: 'Bug 报告',
    nameEn: 'Bug Report',
    icon: '🐞',
    content: `# Bug：{{title}}\n\n**日期**：{{date}} **严重度**：\n\n## 环境\n- 版本 / 系统：\n\n## 复现步骤\n1. \n2. \n\n## 期望 vs 实际\n- 期望：\n- 实际：\n\n## 日志 / 截图\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'competitor-analysis',
    name: '竞品分析',
    nameEn: 'Competitor Analysis',
    icon: '⚔️',
    content: `# 竞品分析 · {{title}}\n\n**日期**：{{date}}\n\n## 竞品清单\n- \n\n## 对比维度\n| 维度 | 我们 | 竞品A | 竞品B |\n|------|------|-------|-------|\n| | | | |\n\n## 我们的机会\n- \n\n## 威胁\n- \n`,
    isBuiltIn: true,
  },
  {
    id: 'event-plan',
    name: '活动策划',
    nameEn: 'Event Plan',
    icon: '🎪',
    content: `# 活动策划：{{title}}\n\n**时间**：{{date}} **地点**：\n**人数**：\n\n## 目标\n- \n\n## 流程\n| 时间 | 环节 | 负责人 |\n|------|------|--------|\n| | | |\n\n## 物料清单\n- [ ] \n\n## 预算\n- \n`,
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
