import { describe, it, expect } from 'vitest'
import { extractBlocks } from '../blockReference'
import {
  MATERIAL_FOLDER_NAME,
  annotateBlockIds,
  appendFootnoteDef,
  buildFootnoteAppendix,
  buildMaterialCitation,
  buildMaterialNote,
  collectBlockCandidates,
  filterBlockCandidates,
  findChildFolderIdByName,
  parseMaterialSource,
  type ClipSource,
  type NodeLike,
} from '../clipMaterial'

/** 确定性 ID 生成器，便于断言 */
function seqIdGen(prefix = 'b') {
  let n = 0
  return () => `${prefix}${++n}`
}

const SRC: ClipSource = {
  url: 'https://example.com/post',
  title: '示例文章',
  clippedAt: '2026-08-05',
}

describe('annotateBlockIds - 正常路径', () => {
  it('为普通段落追加块 ID，且能被 extractBlocks 解析回来', () => {
    const md = '这是一段足够长的正文内容。'
    const out = annotateBlockIds(md, seqIdGen())
    expect(out).toBe('这是一段足够长的正文内容。 ^b1')

    const blocks = extractBlocks(out, 'f1', 'a.md')
    expect(blocks.has('b1')).toBe(true)
    expect(blocks.get('b1')!.text).toBe('这是一段足够长的正文内容。')
  })

  it('多个段落各自获得独立块 ID', () => {
    const md = '第一段内容足够长。\n\n第二段内容也足够长。'
    const out = annotateBlockIds(md, seqIdGen())
    expect(out).toBe('第一段内容足够长。 ^b1\n\n第二段内容也足够长。 ^b2')
    expect(extractBlocks(out, 'f1', 'a.md').size).toBe(2)
  })

  it('连续多行段落只在最后一行标注（与 extractBlocks 语义一致）', () => {
    const md = '第一行内容较长。\n第二行内容较长。'
    const out = annotateBlockIds(md, seqIdGen())
    expect(out).toBe('第一行内容较长。\n第二行内容较长。 ^b1')
    const blocks = extractBlocks(out, 'f1', 'a.md')
    expect(blocks.get('b1')!.text).toBe('第一行内容较长。\n第二行内容较长。')
  })

  it('连续列表项作为一个块，标注在最后一项', () => {
    const md = '- 第一项内容\n- 第二项内容\n- 第三项内容'
    const out = annotateBlockIds(md, seqIdGen())
    expect(out).toBe('- 第一项内容\n- 第二项内容\n- 第三项内容 ^b1')
  })

  it('标题行不被污染，其后的段落正常标注', () => {
    const md = '# 标题\n\n正文内容足够长的段落。'
    const out = annotateBlockIds(md, seqIdGen())
    expect(out).toBe('# 标题\n\n正文内容足够长的段落。 ^b1')
  })
})

describe('annotateBlockIds - 边界与异常', () => {
  it('空字符串原样返回', () => {
    expect(annotateBlockIds('', seqIdGen())).toBe('')
  })

  it('纯空白内容不产生任何块 ID', () => {
    const out = annotateBlockIds('\n\n   \n', seqIdGen())
    expect(out).not.toContain('^')
  })

  it('跳过引用行、分割线与表格行', () => {
    const md = '> 剪藏来源：https://x.com\n\n---\n\n| 列1 | 列2 |\n| --- | --- |\n| a | b |'
    const out = annotateBlockIds(md, seqIdGen())
    expect(out).toBe(md)
  })

  it('跳过代码围栏内部内容', () => {
    const md = '```js\nconst a = 1234567890\nconsole.log(a)\n```\n\n围栏之后的正文段落。'
    const out = annotateBlockIds(md, seqIdGen())
    expect(out).toBe('```js\nconst a = 1234567890\nconsole.log(a)\n```\n\n围栏之后的正文段落。 ^b1')
  })

  it('未闭合的代码围栏不会被标注', () => {
    const md = '```js\nconst a = 1234567890\nconsole.log(a)'
    expect(annotateBlockIds(md, seqIdGen())).toBe(md)
  })

  it('幂等：已有块 ID 的行不会重复追加', () => {
    const once = annotateBlockIds('这是一段足够长的正文内容。', seqIdGen())
    const twice = annotateBlockIds(once, seqIdGen('x'))
    expect(twice).toBe(once)
    expect(twice).not.toContain('^x1')
  })

  it('过短的碎片块不标注', () => {
    const out = annotateBlockIds('更多', seqIdGen())
    expect(out).toBe('更多')
  })

  it('frontmatter 区域不被标注', () => {
    const md = '---\ntitle: 一个比较长的标题文本\nsource: https://example.com\n---\n\n正文内容足够长的段落。'
    const out = annotateBlockIds(md, seqIdGen())
    expect(out).toContain('title: 一个比较长的标题文本\n')
    expect(out).not.toContain('source: https://example.com ^')
    expect(out).toContain('正文内容足够长的段落。 ^b1')
  })

  it('纯图片行不标注', () => {
    const md = '![封面图片说明文字](https://example.com/a.png)'
    expect(annotateBlockIds(md, seqIdGen())).toBe(md)
  })
})

describe('buildMaterialNote', () => {
  it('生成 frontmatter + 标题 + 来源行 + 带块 ID 的正文', () => {
    const note = buildMaterialNote(SRC, '正文内容足够长的段落。', seqIdGen())
    expect(note.startsWith('---\n')).toBe(true)
    expect(note).toContain('title: 示例文章')
    expect(note).toContain('source: https://example.com/post')
    expect(note).toContain('clipped: 2026-08-05')
    expect(note).toContain('type: clip')
    expect(note).toContain('# 示例文章')
    expect(note).toContain('> 剪藏来源：[示例文章](https://example.com/post) · 2026-08-05')
    expect(note).toContain('正文内容足够长的段落。 ^b1')
  })

  it('标题含 YAML 特殊字符时自动加引号', () => {
    const note = buildMaterialNote({ ...SRC, title: '深入理解: React 原理' }, '正文足够长的段落内容。', seqIdGen())
    expect(note).toContain('title: "深入理解: React 原理"')
  })

  it('可选的 author / site 字段按需写入', () => {
    const withMeta = buildMaterialNote({ ...SRC, author: '张三', siteName: 'Example' }, '正文足够长的段落内容。', seqIdGen())
    expect(withMeta).toContain('author: 张三')
    expect(withMeta).toContain('site: Example')
    const withoutMeta = buildMaterialNote(SRC, '正文足够长的段落内容。', seqIdGen())
    expect(withoutMeta).not.toContain('author:')
    expect(withoutMeta).not.toContain('site:')
  })

  it('空正文也能生成合法素材笔记', () => {
    const note = buildMaterialNote(SRC, '', seqIdGen())
    expect(note).toContain('source: https://example.com/post')
    expect(note.endsWith('\n')).toBe(true)
  })

  it('无标题时回退为「网页剪藏」', () => {
    const note = buildMaterialNote({ ...SRC, title: '' }, '正文足够长的段落内容。', seqIdGen())
    expect(note).toContain('title: 网页剪藏')
    expect(note).toContain('# 网页剪藏')
  })
})

describe('parseMaterialSource', () => {
  it('往返解析 buildMaterialNote 生成的来源元数据', () => {
    const note = buildMaterialNote({ ...SRC, author: '张三' }, '正文足够长的段落内容。', seqIdGen())
    const parsed = parseMaterialSource(note)
    expect(parsed).not.toBeNull()
    expect(parsed!.url).toBe(SRC.url)
    expect(parsed!.title).toBe(SRC.title)
    expect(parsed!.clippedAt).toBe('2026-08-05')
    expect(parsed!.author).toBe('张三')
  })

  it('解析带引号的 YAML 标量', () => {
    const note = buildMaterialNote({ ...SRC, title: '深入理解: React 原理' }, '正文足够长的段落内容。', seqIdGen())
    expect(parseMaterialSource(note)!.title).toBe('深入理解: React 原理')
  })

  it('兼容旧剪藏格式 “> 来源：url”', () => {
    const parsed = parseMaterialSource('# 老剪藏\n\n> 来源：https://old.example.com/a\n\n正文')
    expect(parsed).toEqual({ url: 'https://old.example.com/a', title: '', clippedAt: '' })
  })

  it('兼容 “> 剪藏来源：[标题](url)” 格式', () => {
    const parsed = parseMaterialSource('> 剪藏来源：[标题A](https://x.com/a) · 2026-01-01')
    expect(parsed).toEqual({ url: 'https://x.com/a', title: '标题A', clippedAt: '' })
  })

  it('无来源信息返回 null', () => {
    expect(parseMaterialSource('# 普通笔记\n\n正文内容')).toBeNull()
  })

  it('空内容返回 null', () => {
    expect(parseMaterialSource('')).toBeNull()
  })

  it('frontmatter 缺少 source 键时回退到正文来源行', () => {
    const content = '---\ntitle: 无源\n---\n\n> 来源：https://fallback.example.com'
    expect(parseMaterialSource(content)!.url).toBe('https://fallback.example.com')
  })
})

describe('buildMaterialCitation', () => {
  it('reference：生成块引用，支持别名', () => {
    expect(buildMaterialCitation({ blockId: 'abc123', mode: 'reference' }).inline).toBe('((abc123))')
    expect(buildMaterialCitation({ blockId: 'abc123', mode: 'reference', alias: '论据' }).inline).toBe('((abc123|论据))')
  })

  it('embed：生成块嵌入', () => {
    expect(buildMaterialCitation({ blockId: 'abc123', mode: 'embed' }).inline).toBe('!((abc123))')
  })

  it('quote：生成带出处的引用块', () => {
    const r = buildMaterialCitation({ blockId: 'abc123', mode: 'quote', text: '第一行\n第二行', source: SRC })
    expect(r.inline).toBe('> 第一行\n> 第二行\n>\n> —— [示例文章](https://example.com/post)')
  })

  it('quote：无来源时只生成引用块', () => {
    const r = buildMaterialCitation({ blockId: 'abc123', mode: 'quote', text: '一句话' })
    expect(r.inline).toBe('> 一句话')
    expect(r.footnoteDef).toBeUndefined()
  })

  it('footnote：生成脚注标记与来源定义', () => {
    const r = buildMaterialCitation({ blockId: 'abc123', mode: 'footnote', text: '((abc123))', source: SRC })
    expect(r.inline).toBe('((abc123))[^src-abc123]')
    expect(r.footnoteDef).toBe('[^src-abc123]: 来源：[示例文章](https://example.com/post)')
  })

  it('footnote：无来源时退化为本地块出处', () => {
    const r = buildMaterialCitation({ blockId: 'abc123', mode: 'footnote' })
    expect(r.inline).toBe('((abc123))[^src-abc123]')
    expect(r.footnoteDef).toBe('[^src-abc123]: 来源：本地块 ^abc123')
  })

  it('来源缺少 url 时视为无来源', () => {
    const r = buildMaterialCitation({ blockId: 'abc123', mode: 'footnote', source: { url: '', title: 't', clippedAt: '' } })
    expect(r.footnoteDef).toBe('[^src-abc123]: 来源：本地块 ^abc123')
  })

  it('空 blockId 返回空文本，不产生副作用', () => {
    expect(buildMaterialCitation({ blockId: '  ', mode: 'reference' })).toEqual({ inline: '' })
  })
})

describe('appendFootnoteDef', () => {
  it('追加脚注定义到文末', () => {
    const out = appendFootnoteDef('正文内容', '[^src-a]: 来源：X')
    expect(out).toBe('正文内容\n\n[^src-a]: 来源：X\n')
  })

  it('同名脚注已存在时不重复追加', () => {
    const base = '正文\n\n[^src-a]: 来源：X\n'
    expect(appendFootnoteDef(base, '[^src-a]: 来源：Y')).toBe(base)
  })

  it('空定义原样返回', () => {
    expect(appendFootnoteDef('正文', '')).toBe('正文')
  })

  it('空内容时不产生前导空行', () => {
    expect(appendFootnoteDef('', '[^src-a]: 来源：X')).toBe('[^src-a]: 来源：X\n')
  })
})

describe('buildFootnoteAppendix（编辑器增量插入）', () => {
  const DEF = '[^src-a]: 来源：X'

  it('文末无换行时补两个换行', () => {
    expect(buildFootnoteAppendix('正文', DEF)).toBe(`\n\n${DEF}\n`)
  })

  it('文末已有一个换行时只补一个', () => {
    expect(buildFootnoteAppendix('正文\n', DEF)).toBe(`\n${DEF}\n`)
  })

  it('文末已有空行时不再补换行', () => {
    expect(buildFootnoteAppendix('正文\n\n', DEF)).toBe(`${DEF}\n`)
  })

  it('空文档直接插入定义', () => {
    expect(buildFootnoteAppendix('', DEF)).toBe(`${DEF}\n`)
  })

  it('同名脚注已存在时返回 null（不重复插入）', () => {
    expect(buildFootnoteAppendix('正文\n\n[^src-a]: 来源：旧\n', DEF)).toBeNull()
  })

  it('空定义返回 null', () => {
    expect(buildFootnoteAppendix('正文', '')).toBeNull()
  })

  it('与 appendFootnoteDef 结果对齐（拼接等价）', () => {
    const doc = '正文\n'
    const appendix = buildFootnoteAppendix(doc, DEF)!
    expect((doc + appendix).trim()).toBe(appendFootnoteDef(doc, DEF).trim())
  })
})

describe('collectBlockCandidates / filterBlockCandidates', () => {
  const clip = buildMaterialNote(SRC, '剪藏正文中的一段素材内容。', () => 'mat001')
  const tree: NodeLike = {
    id: 'root',
    name: 'root',
    type: 'folder',
    children: [
      {
        id: 'f-mat',
        name: MATERIAL_FOLDER_NAME,
        type: 'folder',
        children: [{ id: 'n1', name: '示例文章.md', type: 'file', content: clip }],
      },
      { id: 'n2', name: '我的笔记.md', type: 'file', content: '我自己写的一段观点内容。 ^own001' },
      { id: 'n3', name: '空文件.md', type: 'file', content: '' },
    ],
  }

  it('收集全库块并标记素材来源', () => {
    const list = collectBlockCandidates(tree)
    expect(list).toHaveLength(2)
    const mat = list.find(c => c.blockId === 'mat001')!
    expect(mat.isMaterial).toBe(true)
    expect(mat.sourceUrl).toBe(SRC.url)
    expect(mat.sourceTitle).toBe('示例文章')
    const own = list.find(c => c.blockId === 'own001')!
    expect(own.isMaterial).toBe(false)
    expect(own.text).toBe('我自己写的一段观点内容。')
  })

  it('根节点为空时返回空数组', () => {
    expect(collectBlockCandidates(null)).toEqual([])
    expect(collectBlockCandidates(undefined)).toEqual([])
  })

  it('重复块 ID 只保留首个', () => {
    const dup: NodeLike = {
      id: 'root', name: 'root', type: 'folder',
      children: [
        { id: 'a', name: 'a.md', type: 'file', content: '第一处的内容文本。 ^same01' },
        { id: 'b', name: 'b.md', type: 'file', content: '第二处的内容文本。 ^same01' },
      ],
    }
    const list = collectBlockCandidates(dup)
    expect(list).toHaveLength(1)
    expect(list[0].fileId).toBe('a')
  })

  it('按正文 / 文件名 / 来源标题过滤', () => {
    const list = collectBlockCandidates(tree)
    expect(filterBlockCandidates(list, '素材').map(c => c.blockId)).toEqual(['mat001'])
    expect(filterBlockCandidates(list, '我的笔记').map(c => c.blockId)).toEqual(['own001'])
    expect(filterBlockCandidates(list, '示例文章').map(c => c.blockId)).toEqual(['mat001'])
  })

  it('素材块排在普通块之前', () => {
    const list = collectBlockCandidates(tree)
    expect(filterBlockCandidates(list, '')[0].blockId).toBe('mat001')
  })

  it('空查询返回全部候选；limit 生效', () => {
    const list = collectBlockCandidates(tree)
    expect(filterBlockCandidates(list, '')).toHaveLength(2)
    expect(filterBlockCandidates(list, '', 1)).toHaveLength(1)
    expect(filterBlockCandidates(list, '', 0)).toEqual([])
  })

  it('无匹配时返回空数组', () => {
    expect(filterBlockCandidates(collectBlockCandidates(tree), '不存在的关键词zzz')).toEqual([])
  })
})

describe('findChildFolderIdByName', () => {
  const tree: NodeLike = {
    id: 'root', name: 'root', type: 'folder',
    children: [
      { id: 'f1', name: MATERIAL_FOLDER_NAME, type: 'folder', children: [] },
      { id: 'n1', name: MATERIAL_FOLDER_NAME, type: 'file', content: '' },
    ],
  }

  it('返回同名子文件夹的 id', () => {
    expect(findChildFolderIdByName(tree, MATERIAL_FOLDER_NAME)).toBe('f1')
  })

  it('同名文件不会被误判为文件夹', () => {
    const onlyFile: NodeLike = {
      id: 'root', name: 'root', type: 'folder',
      children: [{ id: 'n1', name: MATERIAL_FOLDER_NAME, type: 'file', content: '' }],
    }
    expect(findChildFolderIdByName(onlyFile, MATERIAL_FOLDER_NAME)).toBeNull()
  })

  it('无 children 或根为空时返回 null', () => {
    expect(findChildFolderIdByName({ id: 'r', name: 'r', type: 'folder' }, MATERIAL_FOLDER_NAME)).toBeNull()
    expect(findChildFolderIdByName(null, MATERIAL_FOLDER_NAME)).toBeNull()
  })
})
