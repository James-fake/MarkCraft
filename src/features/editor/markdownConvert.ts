/**
 * Markdown ⇄ HTML 转换入口（P5-1 拆分为 barrel：实现按方向分文件，导出路径保稳）。
 * 全部消费方（CodeMirrorEditor / TiptapEditor / hooks / 测试）仍从本模块导入，无需改动。
 *
 * - md → html：见 ./mdToHtml（占位符管线 / callout / wikiLink / 数学公式 / mermaid 等）
 * - html → md：见 ./htmlToMd（Turndown 规则注册 / 脚注与公式占位符回填等）
 */
export { markdownToHtml } from './mdToHtml'
export { htmlToMarkdown } from './htmlToMd'
