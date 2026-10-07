import { describe, it, expect, beforeEach } from 'vitest'
import { setDensitySetting, getDensity, DENSITY_STORAGE_KEY } from '../densityStore'

// 阶段10：密度偏好共享数据源。
// 验证「设置对话框」与「侧边栏切换按钮」所依赖的同一个 store 行为：
// 持久化（mc-sidebar-density）、广播（<html data-density>）、默认 compact、同值 no-op。

describe('densityStore（阶段10：设置对话框密度偏好共享数据源）', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-density')
  })

  it('存储键为 mc-sidebar-density（与阶段4 Sidebar 契约一致，保证原测试不破坏）', () => {
    expect(DENSITY_STORAGE_KEY).toBe('mc-sidebar-density')
  })

  it('默认（本地存储为空）密度为 compact', () => {
    expect(getDensity()).toBe('compact')
  })

  it('setDensitySetting 持久化 + 广播到 <html data-density> + 即时可读', () => {
    setDensitySetting('comfortable')
    expect(localStorage.getItem('mc-sidebar-density')).toBe('comfortable')
    expect(document.documentElement.getAttribute('data-density')).toBe('comfortable')
    expect(getDensity()).toBe('comfortable')
  })

  it('从 comfortable 切回 compact 同样生效', () => {
    setDensitySetting('comfortable')
    setDensitySetting('compact')
    expect(localStorage.getItem('mc-sidebar-density')).toBe('compact')
    expect(document.documentElement.getAttribute('data-density')).toBe('compact')
    expect(getDensity()).toBe('compact')
  })

  it('与当前值相同时为 no-op（不抛错、不改变存储与广播）', () => {
    // 先写入非默认态 comfortable，使存储与广播都带值
    setDensitySetting('comfortable')
    expect(localStorage.getItem('mc-sidebar-density')).toBe('comfortable')
    expect(document.documentElement.getAttribute('data-density')).toBe('comfortable')
    // 再次写入相同值：应直接返回、不抛错、不改变已写入的存储与广播
    expect(() => setDensitySetting('comfortable')).not.toThrow()
    expect(localStorage.getItem('mc-sidebar-density')).toBe('comfortable')
    expect(document.documentElement.getAttribute('data-density')).toBe('comfortable')
    expect(getDensity()).toBe('comfortable')
  })
})
