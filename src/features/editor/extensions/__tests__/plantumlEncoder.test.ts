import { describe, it, expect } from 'vitest'
import { inflateRaw } from 'pako'
import {
  encode6bit,
  encodePlantUml,
  encodePlantUmlBytes,
  ensurePlantUmlWrapper,
  normalizePlantUmlEndpoint,
  buildPlantUmlUrl,
  DEFAULT_PLANTUML_ENDPOINT,
} from '../plantumlEncoder'

const ALPHABET_RE = /^[0-9A-Za-z_-]*$/

describe('encode6bit (PlantUML 64-ary 字母表)', () => {
  it('映射 0-9 → A-Z → a-z → - → _', () => {
    expect(encode6bit(0)).toBe('0')
    expect(encode6bit(9)).toBe('9')
    expect(encode6bit(10)).toBe('A')
    expect(encode6bit(35)).toBe('Z')
    expect(encode6bit(36)).toBe('a')
    expect(encode6bit(61)).toBe('z')
    expect(encode6bit(62)).toBe('-')
    expect(encode6bit(63)).toBe('_')
  })
})

describe('encodePlantUmlBytes', () => {
  it('只输出 PlantUML 字母表字符', () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255, 128, 64, 32])
    const out = encodePlantUmlBytes(bytes)
    expect(out).toMatch(ALPHABET_RE)
    expect(out.length).toBeGreaterThan(0)
  })
})

describe('encodePlantUml', () => {
  it('产出非空、仅含字母表字符的 token', () => {
    const out = encodePlantUml('@startuml\nAlice -> Bob: Hello\n@enduml')
    expect(out).toMatch(ALPHABET_RE)
    expect(out.length).toBeGreaterThan(0)
  })

  it('经 inflate 还原回原始源码（round-trip 校验）', () => {
    const src = '@startuml\nAlice -> Bob: Hello\nBob --> Alice: Hi\n@enduml'
    const encoded = encodePlantUml(src)

    // 逆向 6bit 字母表 → 字节流
    const map: Record<string, number> = {}
    for (let i = 0; i < 64; i++) map[encode6bit(i)] = i
    const bytes: number[] = []
    for (let i = 0; i < encoded.length; i += 4) {
      const triple =
        (map[encoded[i]] << 18) |
        (map[encoded[i + 1]] << 12) |
        (map[encoded[i + 2]] << 6) |
        map[encoded[i + 3]]
      bytes.push((triple >> 16) & 0xff, (triple >> 8) & 0xff, triple & 0xff)
    }
    const inflated = inflateRaw(new Uint8Array(bytes))
    expect(new TextDecoder().decode(inflated)).toBe(src)
  })

  it('不使用标准 base64 字符（避免 URL 编码歧义）', () => {
    const out = encodePlantUml('@startuml\n@enduml')
    expect(out).not.toMatch(/[+/=]/)
  })
})

describe('ensurePlantUmlWrapper', () => {
  it('为裸源码补全 @startuml/@enduml', () => {
    expect(ensurePlantUmlWrapper('Alice -> Bob')).toBe('@startuml\nAlice -> Bob\n@enduml')
  })
  it('已包裹 @startuml 时保持原样', () => {
    const src = '@startuml\nAlice -> Bob\n@enduml'
    expect(ensurePlantUmlWrapper(src)).toBe(src)
  })
  it('保留其它 @start* 图（mindmap/sequence 等）', () => {
    const src = '@startmindmap\n* a\n@endmindmap'
    expect(ensurePlantUmlWrapper(src)).toBe(src)
  })
})

describe('normalizePlantUmlEndpoint', () => {
  it('清除尾部斜杠', () => {
    expect(normalizePlantUmlEndpoint('https://x.com/plantuml/svg/')).toBe('https://x.com/plantuml/svg')
    expect(normalizePlantUmlEndpoint('https://x.com/plantuml/svg///')).toBe('https://x.com/plantuml/svg')
  })
  it('空白输入返回空串（表示禁用）', () => {
    expect(normalizePlantUmlEndpoint('')).toBe('')
    expect(normalizePlantUmlEndpoint('  ')).toBe('')
  })
})

describe('buildPlantUmlUrl', () => {
  it('端点显式为空串时返回 null（禁用远程渲染）；null/undefined 回退默认端点', () => {
    expect(buildPlantUmlUrl('@startuml\n@enduml', '')).toBeNull()
    expect(buildPlantUmlUrl('@startuml\n@enduml', null)).not.toBeNull()
    expect(buildPlantUmlUrl('@startuml\n@enduml', undefined)).not.toBeNull()
  })
  it('端点为 undefined 时回退到默认公共端点', () => {
    expect(buildPlantUmlUrl('@startuml\n@enduml', undefined)).not.toBeNull()
  })
  it('源码为空白时返回 null', () => {
    expect(buildPlantUmlUrl('   ', DEFAULT_PLANTUML_ENDPOINT)).toBeNull()
  })
  it('构造 url = 规范化端点 + 编码 token', () => {
    const url = buildPlantUmlUrl('@startuml\n@enduml', 'https://x.com/svg/')
    expect(url).toBe('https://x.com/svg/' + encodePlantUml('@startuml\n@enduml'))
  })
})
