import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { LanguageProvider, useLanguage } from './LanguageStore'

/**
 * 语言默认跟随系统（首次运行、未显式保存时）：
 * 中文系统 → 'zh'，其他 → 'en'；已保存的语言优先于系统语言。
 */
function setNavLanguage(lang: string) {
  Object.defineProperty(navigator, 'language', { value: lang, configurable: true })
}

function readLanguage() {
  let captured = ''
  function Probe() {
    captured = useLanguage().language
    return null
  }
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  )
  return captured
}

describe('LanguageStore · 首次运行跟随系统语言', () => {
  const original = navigator.language

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    setNavLanguage(original)
    cleanup()
  })

  it('系统为中文（zh-CN）→ 默认 zh', () => {
    setNavLanguage('zh-CN')
    expect(readLanguage()).toBe('zh')
  })

  it('系统为其他语言（en-US）→ 默认 en', () => {
    setNavLanguage('en-US')
    expect(readLanguage()).toBe('en')
  })

  it('已显式保存的语言优先于系统语言', () => {
    localStorage.setItem('markcraft-language', 'en')
    setNavLanguage('zh-CN')
    expect(readLanguage()).toBe('en')

    localStorage.setItem('markcraft-language', 'zh')
    setNavLanguage('en-US')
    expect(readLanguage()).toBe('zh')
  })
})
