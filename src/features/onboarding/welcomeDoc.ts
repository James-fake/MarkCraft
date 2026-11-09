import type { Language } from '@locales'

/**
 * 首启种子文档 —— 用户在 MarkCraft 里看到的第一篇真实笔记。
 *
 * 设计原则（对应产品决定：不做全屏 tour，让文档自己介绍自己）：
 * - 必须是**真实落盘的文件**，不是演示浮层 —— 用户改一个字就真的改到了自己的笔记；
 * - 只演示「一看就懂、一试就有反馈」的少数语法，不做功能大全（那会劝退）；
 * - 最后一段指向博客一键部署 —— 产品最独特的价值，藏在侧栏第五个图标里太浪费。
 *
 * ⚠️ 正文用「单引号字符串数组 + join」而非模板字符串：内容里有代码围栏（反引号），
 *    用模板字符串需要逐处转义，历史上批量转义脚本踩过坑。
 * ⚠️ 不使用全角空格（会破坏 markdown 缩进语义）。
 */
export type WelcomeDocLang = Extract<Language, 'zh' | 'en'>

export function welcomeDocFileName(lang: WelcomeDocLang): string {
  return lang === 'en' ? 'Welcome to MarkCraft' : '欢迎使用 MarkCraft'
}

const ZH_LINES = [
  '# 欢迎使用 MarkCraft',
  '',
  '这是你的第一篇笔记，已经真实保存在你刚选的文件夹里 —— 不是演示页，也不是临时内容。',
  '把下面任意一行改掉，你就已经开始写了。',
  '',
  '## 先试三件事',
  '',
  '1. 选中这行文字，按 Ctrl+B 加粗，按 Ctrl+K 打开命令面板',
  '2. 行末回车，输入 / 看看能插入什么',
  '3. 左侧「日记」每天自动开一篇新笔记',
  '',
  '## 文档本身就能做的事',
  '',
  '- [x] 任务可以勾选',
  '- [ ] 这条还没做',
  '- ==高亮==、++下划线++、~下标~、^上标^、`行内代码`',
  '- 双链 [[另一篇笔记]]、标签 #开始',
  '- 标题、列表、表格、公式、代码块，直接用 markdown 写',
  '',
  '> [!tip] 这是 Callout',
  '> 输入 `> [!tip]` 就会出现这样的块。',
  '',
  '```javascript',
  '// 代码块有语法高亮',
  "const hello = 'world'",
  '```',
  '',
  '行内公式 $E = mc^2$，块级公式：',
  '',
  '$$',
  '\\int_0^1 x^2 dx = \\frac{1}{3}',
  '$$',
  '',
  '| 导出格式 | 用途 |',
  '| --- | --- |',
  '| PDF / Word | 交付与打印 |',
  '| PNG / JPG | 分享截图 |',
  '| EPUB | 电子书 |',
  '',
  '## 下一步：把这个文件夹变成网站',
  '',
  'MarkCraft 能一键发布成博客，免费托管在 GitHub Pages。',
  '打开左侧「博客」面板，选一个主题，点「一键部署」。',
  '',
]

const EN_LINES = [
  '# Welcome to MarkCraft',
  '',
  'This is your first note, and it already lives in the folder you picked — not a demo,',
  'not a temporary preview. Change any line below and you have started writing.',
  '',
  '## Three things to try',
  '',
  '1. Select this line and press Ctrl+B to bold it; Ctrl+K opens the command palette',
  '2. Press Enter at the end of a line and type / to see what can be inserted',
  '3. "Diary" on the left starts a fresh note every day',
  '',
  '## What a document can do',
  '',
  '- [x] Tasks can be checked',
  '- [ ] This one is still open',
  '- ==Highlight==, ++underline++, ~subscript~, ^superscript^, `inline code`',
  '- Wiki link [[Another note]], tag #start',
  '- Headings, lists, tables, math and code blocks — all plain markdown',
  '',
  '> [!tip] This is a callout',
  '> Type `> [!tip]` and you get a block like this.',
  '',
  '```javascript',
  '// Code blocks are highlighted',
  "const hello = 'world'",
  '```',
  '',
  'Inline math $E = mc^2$, and a block:',
  '',
  '$$',
  '\\int_0^1 x^2 dx = \\frac{1}{3}',
  '$$',
  '',
  '| Export | Use |',
  '| --- | --- |',
  '| PDF / Word | Delivery and print |',
  '| PNG / JPG | Share as image |',
  '| EPUB | E-book |',
  '',
  '## Next: turn this folder into a website',
  '',
  'MarkCraft publishes the whole folder as a blog, hosted free on GitHub Pages.',
  'Open the "Blog" panel, pick a theme, and hit Deploy.',
  '',
]

export function buildWelcomeDoc(lang: WelcomeDocLang): string {
  return (lang === 'en' ? EN_LINES : ZH_LINES).join('\n')
}
