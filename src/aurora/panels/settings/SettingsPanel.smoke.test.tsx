import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { RealProviders } from '../../providers/RealProviders'
import { SettingsPanel } from './SettingsPanel'

/**
 * Phase 2 换芯·SettingsPanel 烟雾测试
 * 目标：证明 5 个 section 从 mock useState 改为真实 useSettings() / 真实 ThemeManager /
 * 真实 ShortcutManager 后，整面板在真实 Provider 树下能挂载、各分类读取真实数据、
 * 且写入会持久化到 markcraft_settings（localStorage）。
 */
function renderSettings() {
  const utils = render(
    <RealProviders>
      <SettingsPanel nav={() => {}} toast={() => {}} />
    </RealProviders>,
  )
  const panel = utils.container.querySelector('.aurora-settings') as HTMLElement
  return { ...utils, panel, p: within(panel) }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('Aurora SettingsPanel · 真实数据换芯', () => {
  it('通用页读取真实默认设置并支持写入持久化', () => {
    const { panel, p } = renderSettings()

    // 默认分类即「通用」，应出现真实字段（非 mock 的 autoUpdate/openLastFile 等）
    expect(p.getByText('自动保存间隔（秒）')).toBeTruthy()
    expect(p.getByText('启动时显示侧边栏')).toBeTruthy()

    // 真实默认 autoSaveInterval = 30（ScrollNumberInput 已改为按钮触发器，读其值文本）
    const num = panel.querySelector('.aurora-settings__number') as HTMLButtonElement
    expect(num).toBeTruthy()
    expect(num.querySelector('.aurora-number__value')?.textContent).toBe('30')

    // 写入应持久化到 localStorage markcraft_settings：点开数字滚轮，点选 45
    fireEvent.click(num)
    const target = screen.getAllByText('45').find((el) => el.closest('.aurora-wheel__item')) as HTMLElement
    expect(target).toBeTruthy()
    fireEvent.click(target)
    const saved = JSON.parse(localStorage.getItem('markcraft_settings') || '{}')
    expect(saved.autoSaveInterval).toBe(45)
  })

  it('外观页绑定真实主题 / 字体 / 代码主题来源', () => {
    const { p } = renderSettings()
    fireEvent.click(p.getByText('外观'))

    // 真实 theme 来源（getThemes），至少应渲染主题模式分组与代码主题 select
    expect(p.getByText('主题模式')).toBeTruthy()
    expect(p.getByText('代码主题')).toBeTruthy()
    expect(p.getByText('界面字体')).toBeTruthy()
  })

  it('编辑器页绑定真实编辑体验开关', () => {
    const { p } = renderSettings()
    fireEvent.click(p.getByText('编辑器'))

    // 真实 keys：拼写检查 / 智能标点 / 自动配对 Markdown 等
    expect(p.getByText('拼写检查')).toBeTruthy()
    expect(p.getByText('智能标点')).toBeTruthy()
    expect(p.getByText('自动配对 Markdown')).toBeTruthy()
    // 不存在的 mock 字段不应出现
    expect(p.queryByText('显示行号')).toBeNull()
    expect(p.queryByText('自动换行')).toBeNull()
    // 去重：以下会话态开关仅由编辑器内联控制，设置面板不应再暴露
    expect(p.queryByText('自动补全')).toBeNull()
    expect(p.queryByText('专注模式')).toBeNull()
    expect(p.queryByText('打字机模式')).toBeNull()
    expect(p.queryByText('实时预览')).toBeNull()
  })

  it('快捷键页读取真实 ShortcutManager 绑定（非硬编码列表）', () => {
    const { p, panel } = renderSettings()
    fireEvent.click(p.getByText('快捷键'))

    // 真实 ShortcutManager 分类标题与绑定标签
    expect(panel.textContent).toMatch(/文件/)
    expect(panel.textContent).toMatch(/编辑/)
    expect(panel.textContent).toMatch(/新建文档|打开文件|保存/)
  })

  it('D9 恢复默认设置弹出二次确认对话框（非即时重置）', () => {
    const { p } = renderSettings()
    fireEvent.click(p.getByText('数据'))
    fireEvent.click(p.getByText('恢复默认'))
    // ConfirmProvider 弹出的对话框（role=dialog）应出现
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
  })

  it('D11 关于页外链真实可点（window.open），无后端项置灰', () => {
    const { p } = renderSettings()
    fireEvent.click(p.getByText('关于'))
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    fireEvent.click(p.getByText('官方网站'))
    expect(openSpy).toHaveBeenCalledWith('https://github.com/markcraft/markcraft', '_blank', 'noopener,noreferrer')
    openSpy.mockRestore()
    // 无后端项（检查更新）应 disabled
    const updateBtn = p.getByText('检查更新').closest('button') as HTMLButtonElement
    expect(updateBtn.disabled).toBe(true)
  })

  it('D1 编辑器页提供「默认编辑器模式」下拉（源码/所见即所得）', () => {
    const { p } = renderSettings()
    fireEvent.click(p.getByText('编辑器'))
    const trigger = p.getByText('默认编辑器模式').closest('.aurora-settings__item')!.querySelector('.aurora-select') as HTMLButtonElement
    expect(trigger).toBeTruthy()
    fireEvent.click(trigger)
    const values = screen.getAllByRole('option').map(o => o.getAttribute('data-value'))
    expect(values).toEqual(expect.arrayContaining(['source', 'wysiwyg']))
  })

  it('D3 通用页提供「界面语言」下拉（复用 LanguageStore）', () => {
    const { p } = renderSettings()
    const trigger = p.getByText('界面语言').closest('.aurora-settings__item')!.querySelector('.aurora-select') as HTMLButtonElement
    expect(trigger).toBeTruthy()
    fireEvent.click(trigger)
    const values = screen.getAllByRole('option').map(o => o.getAttribute('data-value'))
    expect(values).toEqual(expect.arrayContaining(['zh', 'en']))
  })

  it('D5 图片页按图床类型展开配置区（默认 picgo → 命令路径）', () => {
    const { p } = renderSettings()
    fireEvent.click(p.getByText('图片'))
    expect(p.getByText('PicGo 上传命令路径')).toBeTruthy()
  })

  it('D6 导出页「默认导出样式」为真实预设下拉（非自由文本）', () => {
    const { p } = renderSettings()
    fireEvent.click(p.getByText('导出'))
    const trigger = p.getByText('默认导出样式').closest('.aurora-settings__item')!.querySelector('.aurora-select') as HTMLButtonElement
    expect(trigger).toBeTruthy()
    fireEvent.click(trigger)
    // 真实枚举来自 exportStyleManager：default / academic / technical / minimal
    const values = screen.getAllByRole('option').map(o => o.getAttribute('data-value'))
    expect(values).toEqual(expect.arrayContaining(['default', 'academic', 'technical', 'minimal']))
  })

  it('D12 设置界面已移除搜索框（无全局搜索输入，常规项正常渲染）', () => {
    const { p } = renderSettings()
    // 搜索框已删除：不应再存在 placeholder 为「搜索设置项...」的输入框
    expect(p.queryByPlaceholderText('搜索设置项...')).toBeNull()
    // 默认进入「通用」分类，常规设置项仍正常渲染
    expect(p.getByText('自动保存间隔（秒）')).toBeTruthy()
  })

  it('D13 用户分类（账户设置）：昵称 / 头像 / 生日齐全', () => {
    const { panel, p } = renderSettings()
    fireEvent.click(p.getByRole('tab', { name: '用户' }))
    expect(p.getByText('昵称')).toBeTruthy()
    expect(p.getByText('头像')).toBeTruthy()
    expect(p.getByText('生日')).toBeTruthy()
    // 生日改为苹果滚轮鼓触发按钮
    const trigger = panel.querySelector('.aurora-datewheel-trigger') as HTMLButtonElement
    expect(trigger).toBeTruthy()
    // 默认昵称回退「用户」展示在预览卡
    expect(panel.querySelector('.aurora-settings__user-card')).toBeTruthy()
    expect(panel.querySelector('.aurora-settings__user-nickname')?.textContent).toBe('用户')
  })

  it('D14 initialCategory="user" 进入即定位到用户分类', () => {
    const utils = render(
      <RealProviders>
        <SettingsPanel nav={() => {}} toast={() => {}} initialCategory="user" />
      </RealProviders>,
    )
    const panel = utils.container.querySelector('.aurora-settings') as HTMLElement
    const p = within(panel)
    expect(p.getByText('昵称')).toBeTruthy()
  })
})
