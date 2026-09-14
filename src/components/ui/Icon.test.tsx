import { render } from '@testing-library/react'
import { iconNames } from './Icon'

describe('Icon 注册表', () => {
  it('包含图谱桌面化所需的新增图标', () => {
    const required = ['trophy', 'puzzle', 'clipboard', 'ruler', 'hierarchy', 'vector', 'diagram']
    for (const name of required) {
      expect(iconNames).toContain(name)
    }
  })

  it('新增图标为非 emoji 名称（避免回退到 emoji 安全网）', () => {
    const required = ['trophy', 'puzzle', 'clipboard', 'ruler', 'hierarchy', 'vector', 'diagram']
    for (const name of required) {
      expect(name).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })
})
