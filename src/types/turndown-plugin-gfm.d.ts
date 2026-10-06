/**
 * turndown-plugin-gfm 无自带类型定义，此处补声明。
 * 导出与包内 lib/turndown-plugin-gfm.es.js 一致。
 */
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown'

  /** turndown 插件：接收服务实例并注册规则 */
  type Plugin = (service: TurndownService) => void

  /** 一次性启用全部 GFM 规则（表格 / 删除线 / 任务列表） */
  export const gfm: Plugin
  /** 仅 GFM 表格 */
  export const tables: Plugin
  /** 仅删除线 */
  export const strikethrough: Plugin
  /** 仅任务列表 */
  export const taskListItems: Plugin
  /** 仅高亮代码块 */
  export const highlightedCodeBlock: Plugin
}
