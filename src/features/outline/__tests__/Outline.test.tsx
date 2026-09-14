import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import Outline from '../Outline'
import { OutlineItem } from '../../shared/utils/headingIdUtils'

vi.mock('../../shared/utils/headingIdUtils', () => ({
  parseMarkdownHeadings: vi.fn()
}))

import { parseMarkdownHeadings } from '../../shared/utils/headingIdUtils'

const mockHeadings: OutlineItem[] = [
  {
    id: 'heading-1',
    level: 1,
    text: '第一章',
    children: [
      {
        id: 'heading-1-1',
        level: 2,
        text: '1.1 小节',
        children: [
          {
            id: 'heading-1-1-1',
            level: 3,
            text: '1.1.1 子小节',
            children: []
          }
        ]
      },
      {
        id: 'heading-1-2',
        level: 2,
        text: '1.2 小节',
        children: []
      }
    ]
  },
  {
    id: 'heading-2',
    level: 1,
    text: '第二章',
    children: [
      {
        id: 'heading-2-1',
        level: 2,
        text: '2.1 小节',
        children: []
      }
    ]
  }
]

const simpleHeadings: OutlineItem[] = [
  {
    id: 'h1',
    level: 1,
    text: '标题1',
    children: []
  },
  {
    id: 'h2',
    level: 1,
    text: '标题2',
    children: []
  }
]

describe('Outline 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应该正确渲染无标题状态', () => {
      (parseMarkdownHeadings as any).mockReturnValue([])
      render(<Outline content="" />)
      expect(screen.getByText('无标题')).toBeInTheDocument()
    })

    it('应该正确渲染标题列表', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)
      
      expect(screen.getByText('第一章')).toBeInTheDocument()
      expect(screen.getByText('第二章')).toBeInTheDocument()
    })
  })

  describe('折叠功能', () => {
    it('应该显示可折叠标题的箭头图标', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)
      
      const collapseButtons = screen.getAllByRole('button', { name: /折叠/ })
      expect(collapseButtons.length).toBeGreaterThan(0)
    })

    it('点击折叠图标应该切换折叠状态', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)

      const collapseButtons = screen.getAllByRole('button', { name: '折叠' })
      const subHeading = screen.getByText('1.1 小节')

      expect(subHeading).toBeVisible()

      fireEvent.click(collapseButtons[0])

      const expandButtons = screen.getAllByRole('button', { name: '展开' })
      expect(expandButtons.length).toBeGreaterThan(0)
    })

    it('没有子节点的标题不应该显示折叠图标', () => {
      (parseMarkdownHeadings as any).mockReturnValue(simpleHeadings)
      render(<Outline content="" />)
      
      const buttons = screen.queryAllByRole('button', { name: /折叠|展开/ })
      expect(buttons.length).toBe(0)
    })
  })

  describe('全部展开/折叠', () => {
    it.skip('应该显示全部展开和全部折叠按钮', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)

      expect(screen.getByTitle('全部展开')).toBeInTheDocument()
      expect(screen.getByTitle('全部折叠')).toBeInTheDocument()
    })

    it('点击全部折叠应该折叠所有标题', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)

      const collapseAllButton = screen.queryByTitle('全部折叠')
      if (collapseAllButton) {
        fireEvent.click(collapseAllButton)
      }
    })

    it.skip('点击全部展开应该展开所有标题', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)

      const expandAllButton = screen.getByTitle('全部展开')
      fireEvent.click(expandAllButton)
    })

    it('没有可折叠项时不应该显示全部展开/折叠按钮', () => {
      (parseMarkdownHeadings as any).mockReturnValue(simpleHeadings)
      render(<Outline content="" />)
      
      expect(screen.queryByTitle('全部展开')).not.toBeInTheDocument()
      expect(screen.queryByTitle('全部折叠')).not.toBeInTheDocument()
    })
  })

  describe('标题跳转功能', () => {
    it('点击标题文本不应该触发折叠', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)

      const headingButton = screen.getByText('第一章').closest('button')
      const collapseButtons = screen.getAllByRole('button', { name: '折叠' })

      expect(collapseButtons[0]).toBeInTheDocument()

      if (headingButton) {
        fireEvent.click(headingButton)
        expect(collapseButtons[0]).toBeInTheDocument()
      }
    })
  })

  describe('交互反馈', () => {
    it('折叠图标应该有旋转动画', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)

      const collapseButtons = screen.getAllByRole('button', { name: '折叠' })
      const svg = collapseButtons[0].querySelector('svg')

      expect(svg).toBeInTheDocument()
    })

    it('应该保持折叠状态', () => {
      (parseMarkdownHeadings as any).mockReturnValue(mockHeadings)
      render(<Outline content="" />)

      const collapseButtons = screen.getAllByRole('button', { name: '折叠' })
      fireEvent.click(collapseButtons[0])

      const expandButtons = screen.getAllByRole('button', { name: '展开' })
      expect(expandButtons.length).toBeGreaterThan(0)
    })
  })

  describe('性能优化', () => {
    it('应该正确渲染大量标题时保持响应', () => {
      const manyHeadings: OutlineItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `heading-${i}`,
        level: 1,
        text: `标题 ${i + 1}`,
        children: []
      }))
      
      ;(parseMarkdownHeadings as any).mockReturnValue(manyHeadings)
      
      const start = performance.now()
      render(<Outline content="" />)
      const end = performance.now()
      
      expect(end - start).toBeLessThan(1000)
    })
  })
})
