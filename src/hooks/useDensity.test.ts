import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDensity, scaleGap, DEFAULT_DENSITY, DENSITY_ATTR } from './useDensity'

describe('useDensity', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(DENSITY_ATTR)
  })
  afterEach(() => {
    document.documentElement.removeAttribute(DENSITY_ATTR)
  })

  it('DOM 无 data-density 时返回默认 compact', () => {
    const { result } = renderHook(() => useDensity())
    expect(result.current).toBe(DEFAULT_DENSITY)
    expect(result.current).toBe('compact')
  })

  it('读取已存在的 data-density="comfortable"', () => {
    document.documentElement.setAttribute(DENSITY_ATTR, 'comfortable')
    const { result } = renderHook(() => useDensity())
    expect(result.current).toBe('comfortable')
  })

  it('DOM 属性变化时通过 MutationObserver 实时更新', async () => {
    const { result } = renderHook(() => useDensity())
    expect(result.current).toBe('compact')

    await act(async () => {
      document.documentElement.setAttribute(DENSITY_ATTR, 'comfortable')
    })
    expect(result.current).toBe('comfortable')

    await act(async () => {
      document.documentElement.setAttribute(DENSITY_ATTR, 'compact')
    })
    expect(result.current).toBe('compact')
  })
})

describe('scaleGap', () => {
  it('compact 模式返回原值', () => {
    expect(scaleGap(20, 'compact')).toBe(20)
    expect(scaleGap(16, 'compact')).toBe(16)
    expect(scaleGap(14, 'compact')).toBe(14)
    expect(scaleGap(12, 'compact')).toBe(12)
  })

  it('comfortable 模式按 1.25 放大并取整', () => {
    expect(scaleGap(20, 'comfortable')).toBe(25)
    expect(scaleGap(16, 'comfortable')).toBe(20)
    expect(scaleGap(14, 'comfortable')).toBe(18)
    expect(scaleGap(12, 'comfortable')).toBe(15)
  })
})
