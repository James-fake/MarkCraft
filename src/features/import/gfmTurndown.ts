import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

/**
 * 共享的 HTML → Markdown 转换器（docx / html 导入共用，避免两处配置漂移）。
 *
 * 关键：启用 **GFM**（表格 / 删除线 / 任务列表）。turndown 默认**不转换 `<table>`**
 * ——这正是此前 docx/html 里表格被静默丢弃的根因；开启后表格会正确转为 GFM 管道表格。
 * 其余统一：标题 ATX（`#`）、代码块围栏、列表标记 `-`、强调 `*`。
 */
export function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  })
  td.use(gfm)
  return td
}
