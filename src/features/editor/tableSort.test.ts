import { describe, it, expect } from 'vitest'
import {
  collectTableRows,
  collectTableRowJSONs,
  tableHasHeader,
  sortTableRows,
  sortRowOrder,
  buildTableNodeFromRows,
} from './tableSort'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Schema, Node } from '@tiptap/pm/model'

/** 构造测试用 PMNode 树（table → tableRow → tableCell/tableHeader → paragraph → text） */
function makeTable(rows: string[][], header = false): PMNode {
  const schema = new Schema({
    nodes: {
      doc: { content: 'table+' },
      paragraph: { content: 'text*' },
      text: { inline: true },
      table: { content: 'tableRow+' },
      tableRow: { content: '(tableCell|tableHeader)+' },
      tableCell: { content: 'paragraph+' },
      tableHeader: { content: 'paragraph+' },
    },
  })
  const cellType = header ? 'tableHeader' : 'tableCell'
  const docJSON = {
    type: 'doc',
    content: [
      {
        type: 'table',
        content: rows.map((r) => ({
          type: 'tableRow',
          content: r.map((c) => ({
            type: cellType,
            content: [{ type: 'paragraph', content: c ? [{ type: 'text', text: c }] : [] }],
          })),
        })),
      },
    ],
  }
  return Node.fromJSON(schema, docJSON).child(0) as PMNode
}

const rows = [
  ['名称', '数量'],
  ['苹果', '10'],
  ['香蕉', '2'],
  ['橙子', '30'],
]

describe('tableSort（E4 Tiptap 表格排序纯逻辑）', () => {
  it('collectTableRows 提取全表文本', () => {
    const table = makeTable(rows, true)
    expect(collectTableRows(table)).toEqual(rows)
  })

  it('tableHasHeader 识别表头行', () => {
    expect(tableHasHeader(makeTable(rows, true))).toBe(true)
    expect(tableHasHeader(makeTable(rows, false))).toBe(false)
  })

  it('升序：表头行不动，数据行按列排序（数值感知 10 < 2 正确）', () => {
    const sorted = sortTableRows(rows, 1, 'asc', true)
    expect(sorted[0]).toEqual(['名称', '数量']) // 表头保留
    expect(sorted.slice(1).map((r) => r[1])).toEqual(['2', '10', '30'])
  })

  it('降序：数据行倒序', () => {
    const sorted = sortTableRows(rows, 1, 'desc', true)
    expect(sorted.slice(1).map((r) => r[1])).toEqual(['30', '10', '2'])
  })

  it('无表头时整表参与排序', () => {
    const sorted = sortTableRows(rows, 0, 'asc', false)
    // Intl.Collator 中文环境按拼音序：橙(chéng) < 名(míng) < 苹(píng) < 香(xiāng)
    expect(sorted.map((r) => r[0])).toEqual(['橙子', '名称', '苹果', '香蕉'])
  })

  it('中文按拼音排序（sensitivity base + numeric）', () => {
    const data = [
      ['丙'],
      ['甲'],
      ['乙'],
    ]
    const sorted = sortTableRows(data, 0, 'asc', false)
    // 拼音序：丙(bǐng) < 甲(jiǎ) < 乙(yǐ)
    expect(sorted.map((r) => r[0])).toEqual(['丙', '甲', '乙'])
  })

  it('buildTableNodeFromRows 生成可插入的 table JSON', () => {
    const node = buildTableNodeFromRows(rows, 'tableHeader')
    expect(node.type).toBe('table')
    expect(node.content).toHaveLength(4)
    const first = node.content[0] as { content: unknown[] }
    expect((first.content[0] as { type: string }).type).toBe('tableHeader')
  })

  it('空表返回原样', () => {
    expect(sortTableRows([], 0, 'asc', true)).toEqual([])
  })

  it('sortRowOrder 返回行索引序（表头 0 保持，数据行按列重排）', () => {
    const order = sortRowOrder(rows, 1, 'asc', true)
    // 表头=0 不动；数量 2→10→30 对应原行 2（香蕉）→1（苹果）→3（橙子）
    expect(order).toEqual([0, 2, 1, 3])
  })

  it('sortRowOrder 与 sortTableRows 结果一致', () => {
    const sorted = sortTableRows(rows, 1, 'asc', true)
    const order = sortRowOrder(rows, 1, 'asc', true)
    expect(order.map((i) => rows[i])).toEqual(sorted)
  })

  it('collectTableRowJSONs 保留行结构（行数与 cell 数不变）', () => {
    const table = makeTable(rows, true)
    const rowJSONs = collectTableRowJSONs(table)
    expect(rowJSONs).toHaveLength(rows.length)
    expect((rowJSONs[0] as { content: unknown[] }).content).toHaveLength(rows[0].length)
    // 首行 cell 类型为 tableHeader（表头）
    const firstCell = ((rowJSONs[0] as { content: { type: string }[] }).content[0]) as { type: string }
    expect(firstCell.type).toBe('tableHeader')
  })
})
