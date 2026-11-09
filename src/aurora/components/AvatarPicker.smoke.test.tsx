import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import type { RefObject } from 'react'
import { RealProviders } from '../providers/RealProviders'
import type { UserProfile } from '@stores/UserProfileStore'
import { UserAvatar } from './UserAvatar'
import { AvatarPicker } from './AvatarPicker'
import { AVATAR_EMOJIS, filterAvatarEmojis } from './avatarEmojiData'
import { AVATAR_BG_PRESETS } from './avatarBgPresets'

const baseProfile: UserProfile = {
  nickname: '小明',
  avatarUrl: '',
  avatarEmoji: '',
  avatarBg: '',
  birthday: '',
}

/** jsdom 不做布局，rect 必须打桩，否则所有断言都在验 0 === 0 */
function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left, top, width, height,
    right: left + width, bottom: top + height,
    x: left, y: top, toJSON: () => ({}),
  } as DOMRect
}

const ANCHOR_RECT = rect(400, 200, 52, 52)
const PANEL_RECT = rect(0, 0, 320, 400)

function makeAnchor(): RefObject<HTMLElement | null> {
  const btn = document.createElement('button')
  btn.dataset.avatarAnchor = 'true'
  document.body.appendChild(btn)
  return { current: btn }
}

function renderPicker(profile: UserProfile = baseProfile) {
  const onChange = vi.fn()
  const onClose = vi.fn()
  render(
    <RealProviders>
      <AvatarPicker
        open
        anchorRef={makeAnchor()}
        onClose={onClose}
        profile={profile}
        onChange={onChange}
      />
    </RealProviders>,
  )
  return { onChange, onClose }
}

const bodyQuery = <T extends Element>(sel: string) => document.body.querySelector(sel) as T
const bodyQueryAll = (sel: string) => Array.from(document.body.querySelectorAll(sel)) as HTMLElement[]

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('aurora-avatar-popover')) return PANEL_RECT
    if (this.dataset.avatarAnchor === 'true') return ANCHOR_RECT
    return rect(0, 0, 0, 0)
  })
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true, writable: true })
})

afterEach(() => {
  cleanup()
  document.querySelectorAll('[data-avatar-anchor]').forEach((el) => el.remove())
  vi.restoreAllMocks()
})

describe('UserAvatar · 统一渲染器', () => {
  it('无自定义 → 昵称首字母 + 默认品牌渐变', () => {
    const { container } = render(<UserAvatar profile={baseProfile} size={40} />)
    const el = container.querySelector('.aurora-user-avatar') as HTMLElement
    expect(el.dataset.avatarKind).toBe('initial')
    expect(el.textContent).toBe('小')
    expect(el.getAttribute('style')).toContain('40px')
  })

  it('有表情 → 表情形态；照片优先于表情', () => {
    const emoji = render(<UserAvatar profile={{ ...baseProfile, avatarEmoji: '🐱' }} />)
    expect((emoji.container.firstChild as HTMLElement).dataset.avatarKind).toBe('emoji')
    expect(emoji.container.textContent).toBe('🐱')
    cleanup()

    const photo = render(
      <UserAvatar profile={{ ...baseProfile, avatarUrl: 'data:image/png;base64,AAA', avatarEmoji: '🐱' }} />,
    )
    const el = photo.container.querySelector('.aurora-user-avatar') as HTMLElement
    expect(el.dataset.avatarKind).toBe('photo')
    expect(el.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAA')
  })

  it('自定义浅色背景 → 自动切深色字（可读性）', () => {
    const { container } = render(<UserAvatar profile={{ ...baseProfile, avatarBg: '#FFF3C4' }} />)
    const el = container.querySelector('.aurora-user-avatar') as HTMLElement
    expect(el.style.color).toBe('rgb(27, 32, 48)')
  })
})

describe('表情数据源', () => {
  it('中英关键词都能命中同一个表情', () => {
    expect(filterAvatarEmojis('猫', 'all').some((e) => e.char === '🐱')).toBe(true)
    expect(filterAvatarEmojis('cat', 'all').some((e) => e.char === '🐱')).toBe(true)
  })

  it('分组过滤只返回该组；空查询返回全部', () => {
    expect(filterAvatarEmojis('', 'all')).toHaveLength(AVATAR_EMOJIS.length)
    expect(filterAvatarEmojis('', 'animals').every((e) => e.group === 'animals')).toBe(true)
    expect(filterAvatarEmojis('绝不存在的词', 'all')).toHaveLength(0)
  })
})

describe('AvatarPicker · 锚定气泡浮层（非模态）', () => {
  it('经 portal 挂到 body，且没有模态遮罩 / 底部确认栏', () => {
    renderPicker()
    expect(bodyQuery('.aurora-avatar-popover')).not.toBeNull()
    expect(bodyQuery('.aurora-avatar-popover')?.getAttribute('role')).toBe('dialog')
    expect(document.body.querySelector('.aurora-modal-overlay')).toBeNull()
    expect(document.body.querySelector('.aurora-modal__footer')).toBeNull()
    expect(bodyQueryAll('.aurora-avatar-picker__emoji').length).toBe(AVATAR_EMOJIS.length)
    expect(bodyQueryAll('.aurora-avatar-picker__swatch').length).toBe(AVATAR_BG_PRESETS.length + 1)
  })

  it('居中于锚点、贴在锚点下方，箭头指回锚点中心', () => {
    renderPicker()
    const panel = bodyQuery<HTMLElement>('.aurora-avatar-popover')
    // 性质断言而非魔法数字：中线差 ≤1px、上沿 === 锚点下沿 + gap(10)
    const panelLeft = parseFloat(panel.style.left)
    const panelTop = parseFloat(panel.style.top)
    const anchorCenter = ANCHOR_RECT.left + ANCHOR_RECT.width / 2
    expect(Math.abs(panelLeft + PANEL_RECT.width / 2 - anchorCenter)).toBeLessThanOrEqual(1)
    expect(panelTop).toBe(ANCHOR_RECT.bottom + 10)
    expect(panel.dataset.placement).toBe('bottom')
    expect(panel.style.getPropertyValue('--mc-arrow-x')).toBe('160px')
  })

  it('下方放不下时翻到上方', () => {
    Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true, writable: true })
    renderPicker()
    const panel = bodyQuery<HTMLElement>('.aurora-avatar-popover')
    expect(panel.dataset.placement).toBe('top')
    expect(parseFloat(panel.style.top)).toBeLessThan(ANCHOR_RECT.top)
  })

  it('点选表情即时写回（无「完成」按钮的草稿态）', () => {
    const { onChange } = renderPicker()
    const emojiBtn = bodyQueryAll('.aurora-avatar-picker__emoji').find((b) => b.textContent === '😀') as HTMLElement
    fireEvent.click(emojiBtn)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ avatarUrl: '', avatarEmoji: '😀', avatarBg: '' })
  })

  it('选背景即时写回，且保留已有表情', () => {
    const { onChange } = renderPicker({ ...baseProfile, avatarEmoji: '🐱' })
    fireEvent.click(bodyQueryAll('.aurora-avatar-picker__swatch')[1])
    expect(onChange).toHaveBeenCalledWith({
      avatarUrl: '',
      avatarEmoji: '🐱',
      avatarBg: AVATAR_BG_PRESETS[1].value,
    })
  })

  it('恢复首字母清掉照片与表情', () => {
    const { onChange } = renderPicker({ ...baseProfile, avatarUrl: 'data:image/png;base64,AAA' })
    fireEvent.click(bodyQuery('.aurora-avatar-picker__reset') as HTMLElement)
    expect(onChange).toHaveBeenCalledWith({ avatarUrl: '', avatarEmoji: '', avatarBg: '' })
  })

  it('点外部 / Esc 收起', () => {
    const { onClose } = renderPicker()
    fireEvent.mouseDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('浮层内部滚动不误关', () => {
    const { onClose } = renderPicker()
    const grid = bodyQuery('.aurora-avatar-picker__grid-wrap') as HTMLElement
    fireEvent.scroll(grid)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('搜索与分组可过滤表情', () => {
    renderPicker()
    fireEvent.change(bodyQuery<HTMLInputElement>('.aurora-avatar-picker__search'), {
      target: { value: '猫' },
    })
    const hits = bodyQueryAll('.aurora-avatar-picker__emoji')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.length).toBeLessThan(AVATAR_EMOJIS.length)
    expect(hits.some((b) => b.textContent === '🐱')).toBe(true)
  })

  it('已有照片时默认打开照片页，可切回表情页', () => {
    renderPicker({ ...baseProfile, avatarUrl: 'data:image/png;base64,AAA' })
    expect(bodyQuery('.aurora-avatar-picker__panel--photo')).not.toBeNull()
    const emojiTab = bodyQueryAll('.aurora-avatar-picker__tab').find((b) => b.textContent === '表情') as HTMLElement
    fireEvent.click(emojiTab)
    expect(bodyQuery('.aurora-avatar-picker__grid')).not.toBeNull()
  })
})

describe('AvatarPicker · 键盘可达与 ARIA（a11y）', () => {
  it('打开时焦点移入浮层搜索框，关闭后归还触发按钮', async () => {
    const anchorRef = makeAnchor()
    const onChange = vi.fn()
    const onClose = vi.fn()
    const props = { anchorRef, profile: baseProfile, onChange, onClose }
    const view = render(<RealProviders><AvatarPicker {...props} open /></RealProviders>)
    await vi.waitFor(() => {
      expect(document.activeElement?.classList.contains('aurora-avatar-picker__search')).toBe(true)
    })
    view.rerender(<RealProviders><AvatarPicker {...props} open={false} /></RealProviders>)
    expect(document.activeElement).toBe(anchorRef.current)
  })

  it('tabs 具备完整 ARIA 语义，左右方向键可切换', () => {
    renderPicker()
    const tabs = bodyQueryAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].getAttribute('aria-controls')).toBe('mc-avatar-panel-emoji')
    expect(tabs[0].getAttribute('tabindex')).toBe('0')
    expect(tabs[1].getAttribute('tabindex')).toBe('-1')
    const panel = bodyQuery<HTMLElement>('[role="tabpanel"]')
    expect(panel.id).toBe('mc-avatar-panel-emoji')
    expect(panel.getAttribute('aria-labelledby')).toBe('mc-avatar-tab-emoji')

    fireEvent.keyDown(bodyQuery('[role="tablist"]'), { key: 'ArrowRight' })
    expect(bodyQuery<HTMLElement>('[role="tabpanel"]').id).toBe('mc-avatar-panel-photo')
    expect(bodyQueryAll('[role="tab"]')[1].getAttribute('aria-selected')).toBe('true')
  })

  it('焦点移出浮层即收起（非模态 popover 语义）', () => {
    const { onClose } = renderPicker()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    fireEvent.focusIn(outside)
    expect(onClose).toHaveBeenCalled()
    outside.remove()
  })
})
