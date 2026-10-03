// 日记纯逻辑工具（D4 单一数据源）
//
// 原定义于旧整屏日记页 DiaryView.tsx（dv- 前缀 UI，已退役）。换芯后 Aurora
// DiaryPanel 仍依赖这些纯函数，故迁至逻辑层 features/diary 独立维护，与 UI 解耦。
// 这样整屏 DiaryView 组件（含 .dv-modal / 全套 dv- 样式）可安全删除，而真实
// 日记界面所需的文本解析能力不受影响。

export const DAILY_PROMPTS = [
  '今天最让你感到开心的一件事是什么？',
  '如果给今天打分（1-10），你会打几分？为什么？',
  '今天你学到了什么新东西？',
  '此刻你最想感谢谁？',
  '今天有没有什么事情让你改变了看法？',
  '如果重来一次，今天你会做哪件事的不同选择？',
  '最近让你感到有压力的事情是什么？可以怎么化解？',
  '描述一个今天注意到的小细节。',
  '你今天为未来的自己做了什么？',
  '今天和谁的交流让你印象最深？',
  '现在的你，和一年前相比有什么不同？',
  '今天有没有一个瞬间让你想记录下来？',
  '你最近在坚持什么？感觉如何？',
  '如果今天是一种颜色，它会是什么颜色？为什么？',
  '写下三件今天值得感恩的小事。',
  '最近有什么想做但一直没开始的事？',
  '今天的你休息得好吗？身体感觉如何？',
  '有什么话是你今天想说但没说出口的？',
  '本周你最期待的事情是什么？',
  '用一句话总结今天。',
]

/** 每日引导问题·英文（与 DAILY_PROMPTS 一一对应，消费端按界面语言取） */
export const DAILY_PROMPTS_EN: string[] = [
  'What made you happiest today?',
  'If you rated today 1-10, what would you give it, and why?',
  'What new thing did you learn today?',
  'Who are you most grateful to right now?',
  'Did anything today change your mind about something?',
  'If you could redo today, what would you do differently?',
  'What has been weighing on you lately, and how could you ease it?',
  'Describe one small detail you noticed today.',
  'What did you do today for your future self?',
  'Which conversation today stayed with you the most?',
  'How are you different from who you were a year ago?',
  'Was there a moment today you wanted to capture?',
  'What are you currently keeping up, and how does it feel?',
  'If today were a color, which one, and why?',
  'Write down three small things from today you are grateful for.',
  'What is something you want to start but have not?',
  'Did you rest well today? How does your body feel?',
  'Is there something you wanted to say today but did not?',
  'What are you most looking forward to this week?',
  'Summarize today in one sentence.',
]

export function countWords(content: string): number {
  return content.replace(/[#>*`_~\-[\]()!|]/g, '').replace(/\s+/g, '').length
}

export function extractTags(content: string): string[] {
  const tags = new Set<string>()
  const re = /(^|[^\S\r\n])#([^\s#`][^\s#`]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    tags.add(m[2])
  }
  return [...tags]
}

export function makeExcerpt(content: string): string {
  const body = content
    .split('\n')
    .filter(l => !/^#{1,6}\s/.test(l) && l.trim() !== '' && !/^-\s*\[\s?\]\s*$/.test(l.trim()))
    .join(' ')
    .replace(/[#>*`_~[\]()!|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return body.length > 90 ? body.slice(0, 90) + '…' : body
}
