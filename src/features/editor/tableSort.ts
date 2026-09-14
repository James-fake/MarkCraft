/**
 * Tiptap 表格排序纯逻辑（E4：P3 表格编辑深度）
 * 与 TableBubbleMenu 解耦，便于 vitest 直接覆盖排序正确性。
 */
import type { Node as PMNode } from '@tiptap/pm/model'
import type { JSONContent } from '@tiptap/core'

/** 提取表格全部行：每行 = 每列单元格纯文本数组 */
export function collectTableRows(table: PMNode): string[][] {
  const rows: string[][] = []
  table.forEach((rowNode: PMNode) => {
    const cells: string[] = []
    rowNode.forEach((cellNode: PMNode) => cells.push(cellNode.textContent ?? ''))
    rows.push(cells)
  })
  return rows
}

/** 首行是否为表头行（tableHeader 节点） */
export function tableHasHeader(table: PMNode): boolean {
  const firstRow = table.firstChild
  return firstRow?.firstChild?.type.name === 'tableHeader'
}

/**
 * 按指定列排序：表头行保持不动，仅排数据行。
 * 数值感知（10 > 2，非字典序），null/undefined 视为空串垫底。
 */
export function sortTableRows(
  rows: string[][],
  colIndex: number,
  dir: 'asc' | 'desc',
  hasHeader: boolean,
): string[][] {
  if (!rows.length) return rows
  const order = sortRowOrder(rows, colIndex, dir, hasHeader)
  return order.map((i) => rows[i])
}

/**
 * 返回排序后的行索引顺序（表头行保持原位）。
 * 与 sortTableRows 等价，但保留原数组引用（用于按行 JSON 重组）。
 */
export function sortRowOrder(
  rows: string[][],
  colIndex: number,
  dir: 'asc' | 'desc',
  hasHeader: boolean,
): number[] {
  const indices = rows.map((_, i) => i)
  const dataStart = hasHeader ? 1 : 0
  const headerIdx = indices.slice(0, dataStart)
  const dataIdx = indices.slice(dataStart)

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  dataIdx.sort((ia, ib) => {
    const va = rows[ia][colIndex] ?? ''
    const vb = rows[ib][colIndex] ?? ''
    const cmp = collator.compare(va, vb)
    return dir === 'asc' ? cmp : -cmp
  })

  return [...headerIdx, ...dataIdx]
}

/** 提取表格全部行节点 JSON（保留每行 attrs / cell 结构与格式，供按新序重组） */
export function collectTableRowJSONs(table: PMNode): JSONContent[] {
  const out: JSONContent[] = []
  table.forEach((rowNode: PMNode) => {
    out.push(rowNode.toJSON() as JSONContent)
  })
  return out
}

/** 由排序后的行数据构造新的 table 节点 JSON（供 insertContentAt 替换） */
export function buildTableNodeFromRows(
  rows: string[][],
  cellType: 'tableCell' | 'tableHeader',
): JSONContent {
  return {
    type: 'table',
    content: rows.map((r) => buildTableRowJSON(r, cellType)),
  }
}

/** 构造单行节点 JSON（供逐行 replaceWith 替换，保留表格结构/列宽/选区） */
export function buildTableRowJSON(
  cells: string[],
  cellType: 'tableCell' | 'tableHeader',
): JSONContent {
  return {
    type: 'tableRow',
    content: cells.map((c) => ({
      type: cellType,
      content: [{ type: 'paragraph', content: c ? [{ type: 'text', text: c }] : [] }],
    })),
  }
}
