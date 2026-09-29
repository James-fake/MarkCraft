import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup, within } from '@testing-library/react'
import { RealProviders } from '../../providers/RealProviders'
import { resolveAuroraNav } from '../aurora-nav'
import { WelcomePanel } from './WelcomePanel'

/**
 * Aurora WelcomePanel 烟雾测试（L1 Launchpad v2）
 * 目标：证明欢迎页 = 中性启动器（不谈写作/文档），品牌行 / 人情味问候 /
 * 左大卡(编辑器=上次停留) / 右 2×3 模块网格均渲染，且旧「企业后台」右栏
 * （4 KPI + 365 天热力图）已彻底删除。
 * 查询限定在 .aurora-welcome 容器内，避开 App 书脊侧边栏的同名 label。
 */
function renderWelcome(nav = vi.fn()) {
  const utils = render(
    <RealProviders>
      <WelcomePanel nav={nav} toast={() => {}} />
    </RealProviders>,
  )
  const panel = utils.container.querySelector('.aurora-welcome') as HTMLElement
  return { ...utils, panel, nav }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('Aurora WelcomePanel · L1 Launchpad v2', () => {
  it('挂载无崩溃：品牌 + 问候 + 左大卡 + 右 6 tile 渲染，旧 KPI/热力图已删除', () => {
    const { panel } = renderWelcome()
    const scope = within(panel)

    // 品牌行
    expect(scope.getByText('MarkCraft')).toBeTruthy()

    // 人情味问候（按时段 + 显示名；显示名取自用户资料昵称，默认回退「用户」）
    const hello = panel.querySelector('.aurora-welcome__hello')
    expect(hello?.textContent).toMatch(/好，/)

    // 左大卡：编辑器 = 上次停留
    expect(scope.getByText('编辑器')).toBeTruthy()
    expect(scope.getByText('上次停留')).toBeTruthy()
    // CTA：无最近文档时为「新建笔记」，有则为「继续编辑」
    const cta = panel.querySelector('.aurora-welcome__hero-cta')
    expect(cta?.textContent).toMatch(/(新建笔记|继续编辑)/)

    // 右 2×3 模块网格（6 tile）
    expect(scope.getByText('日记')).toBeTruthy()
    expect(scope.getByText('知识库')).toBeTruthy()
    expect(scope.getByText('白板')).toBeTruthy()
    expect(scope.getByText('博客')).toBeTruthy()
    expect(scope.getByText('设置')).toBeTruthy()
    expect(scope.getByText('搜索')).toBeTruthy()

    // 旧「企业后台」右栏已删除：无 KPI、无 dash、无 main 两栏、无最近文档列表
    expect(panel.querySelector('.aurora-welcome__dash')).toBeNull()
    expect(panel.querySelector('.aurora-welcome__main')).toBeNull()
    expect(panel.querySelector('.aurora-welcome__quickstart')).toBeNull()
    expect(scope.queryByText('笔记')).toBeNull()
    expect(scope.queryByText('字数')).toBeNull()
    expect(scope.queryByText('链接')).toBeNull()
    expect(scope.queryByText('标签')).toBeNull()
    expect(scope.queryByText('最近文件')).toBeNull()
  })

  it('点击模块 tile → 真实导航到对应路由', () => {
    const nav = vi.fn()
    const { panel } = renderWelcome(nav)
    const scope = within(panel)

    fireEvent.click(scope.getByText('日记'))
    expect(nav).toHaveBeenCalledWith(resolveAuroraNav('日记'))

    fireEvent.click(scope.getByText('知识库'))
    expect(nav).toHaveBeenCalledWith(resolveAuroraNav('知识库'))

    fireEvent.click(scope.getByText('白板'))
    expect(nav).toHaveBeenCalledWith(resolveAuroraNav('白板'))

    fireEvent.click(scope.getByText('博客'))
    expect(nav).toHaveBeenCalledWith(resolveAuroraNav('博客'))

    fireEvent.click(scope.getByText('设置'))
    expect(nav).toHaveBeenCalledWith(resolveAuroraNav('设置'))
  })

  it('点击左大卡 CTA → 导航编辑器（无最近文档新建 / 有则继续）', () => {
    const nav = vi.fn()
    const { panel } = renderWelcome(nav)
    const cta = panel.querySelector('.aurora-welcome__hero-cta')!

    fireEvent.click(cta)
    expect(nav).toHaveBeenCalledWith(resolveAuroraNav('编辑器'))
  })

  it('点击搜索 tile → 打开命令面板不崩溃', () => {
    const { panel } = renderWelcome()
    const scope = within(panel)
    expect(() => fireEvent.click(scope.getByText('搜索'))).not.toThrow()
  })
})
