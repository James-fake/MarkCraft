/**
 * 内置「MarkCraft 使用文档」的**历史文件名**（多语言）
 * ==========================================================================
 * 用途有两处，共用同一份字面量，避免漂移：
 *   ① `stores/kbSeed.ts` —— 老用户升级时按旧名把历史文档**迁移**进内置文件夹
 *      （保持原名以护住 `[[双链]]`）；
 *   ② `core/files/usageDocs.ts` —— 判定「哪些文件是内置说明书本身」（只读简介页）。
 *
 * 为什么必须包含旧名：迁移进来的历史文档（如《用户手册》全文）同样是**内置说明书**，
 * 若不在判定清单里，它们会在编辑器里变成可编辑的普通笔记 —— 与「内置说明只读」相悖。
 *
 * ⚠️ 元数据放这里（`core/data`，纯数据、无依赖），不要写回 store：
 *    `usageDocs.ts`（core）需要它，而 core 不得反向依赖 stores。
 */
export const USAGE_DOC_LEGACY_NAMES_ZH: Record<string, string[]> = {
  'md-tutorial': ['Markdown 入门教程.md'],
  'link-guide': ['知识链接体系指南.md'],
  'user-manual': ['用户手册.md'],
}

export const USAGE_DOC_LEGACY_NAMES_EN: Record<string, string[]> = {
  'md-tutorial': ['Markdown Beginner Tutorial.md', 'Markdown Tutorial.md'],
  'link-guide': ['Knowledge Linking Guide.md'],
  'user-manual': ['User Manual.md'],
}
