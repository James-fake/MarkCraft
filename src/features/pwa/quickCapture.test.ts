import { describe, it, expect } from 'vitest'
import { FileNode } from '../../types/fileManager'
import { findNode } from '../../services/fileService'
import {
  deriveQuickNoteName,
  buildQuickNote,
  findInboxId,
  insertQuickNote,
  INBOX_FOLDER_NAME,
  QUICK_CAPTURE_PREFIX,
} from './quickCapture'

function makeRoot(): FileNode {
  return {
    id: 'root',
    name: 'root',
    type: 'folder',
    children: [
      { id: 'inbox', name: INBOX_FOLDER_NAME, type: 'folder', children: [] },
      { id: 'f1', name: 'a.md', type: 'file', content: 'x', createdAt: 1, updatedAt: 1 },
    ],
  }
}

describe('quickCapture', () => {
  it('deriveQuickNoteName 取首行摘要', () => {
    const name = deriveQuickNoteName('# 今天想到一个绝妙的点子\n正文', new Date('2026-08-06T22:10:00'))
    expect(name).toContain('今天想到一个绝妙的点子')
    expect(name.startsWith(QUICK_CAPTURE_PREFIX)).toBe(true)
  })

  it('deriveQuickNoteName 长首行被截断', () => {
    const long = '一'.repeat(40)
    const name = deriveQuickNoteName(long)
    expect(name.length).toBeLessThanOrEqual(QUICK_CAPTURE_PREFIX.length + 3 + 24 + 1)
    expect(name.endsWith('…')).toBe(true)
  })

  it('deriveQuickNoteName 空内容回退到时间戳', () => {
    const name = deriveQuickNoteName('   \n  ', new Date('2026-08-06T22:10:00'))
    expect(name).toContain('2026-08-06 22:10')
  })

  it('buildQuickNote 返回合法文件节点', () => {
    const note = buildQuickNote('hello', { now: 1700000000000, id: 'q1' })
    expect(note.type).toBe('file')
    expect(note.id).toBe('q1')
    expect(note.content).toBe('hello')
    expect(note.createdAt).toBe(1700000000000)
    expect(note.name).toContain('hello')
  })

  it('findInboxId 递归找到收件箱', () => {
    const root = makeRoot()
    expect(findInboxId(root)).toBe('inbox')
  })

  it('findInboxId 无收件箱返回 null', () => {
    const root: FileNode = { id: 'r', name: 'r', type: 'folder', children: [] }
    expect(findInboxId(root)).toBeNull()
  })

  it('insertQuickNote 插入到收件箱下', () => {
    const root = makeRoot()
    const note = buildQuickNote('速记', { now: 1, id: 'n1' })
    const { root: next, parentId } = insertQuickNote(root, note, 'inbox')
    expect(parentId).toBe('inbox')
    expect(findNode(next, 'n1')).toBeTruthy()
    // 原根不应被改写（不可变更新）
    expect(findNode(root, 'n1')).toBeNull()
  })

  it('insertQuickNote 无收件箱时落到根', () => {
    const root: FileNode = { id: 'r', name: 'r', type: 'folder', children: [] }
    const note = buildQuickNote('x', { now: 1, id: 'n2' })
    const { root: next, parentId } = insertQuickNote(root, note)
    expect(parentId).toBe('r')
    expect(findNode(next, 'n2')).toBeTruthy()
  })
})
