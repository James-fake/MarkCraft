import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@stores/LanguageStore'
import {
  compressAvatarFile,
  DEFAULT_AVATAR_BG,
  userDisplayName,
  type UserProfile,
} from '@stores/UserProfileStore'
import useDropdownPosition from '../../features/editor/toolbar/useDropdownPosition'
import { UserAvatar } from './UserAvatar'
import {
  AVATAR_EMOJI_GROUPS,
  filterAvatarEmojis,
  type AvatarEmojiGroup,
} from './avatarEmojiData'
import { AVATAR_BG_PRESETS } from './avatarBgPresets'

/** 一次「选择头像」提交的内容；三个字段永远一起写，避免形态与背景互相残留。 */
export type AvatarPatch = Pick<UserProfile, 'avatarUrl' | 'avatarEmoji' | 'avatarBg'>

const HEX_RE = /^#[0-9a-f]{6}$/i
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
/** 浮层宽度，与 avatar.css 的 .aurora-avatar-popover width 一致；用于把箭头夹在浮层内。 */
const POPOVER_WIDTH = 320
const ARROW_MARGIN = 18

export interface AvatarPickerProps {
  open: boolean
  /** 触发头像的 ref —— 浮层锚定到它（居中、越界翻转由 useDropdownPosition 负责）。 */
  anchorRef: RefObject<HTMLElement | null>
  /** 点外部 / Esc / 窗口尺寸变化时收起。 */
  onClose: () => void
  profile: UserProfile
  /** 点选即生效（macOS 心智）：每次改动立即写回，无「完成 / 取消」。 */
  onChange: (patch: AvatarPatch) => void
  /** 轻提示（图片校验 / 处理失败）。 */
  toast?: (msg: string) => void
}

type Tab = 'emoji' | 'photo'

/**
 * 头像选择器 —— 对齐 macOS「用户与群组」点头像弹出的气泡浮层，而非居中模态对话框。
 *
 * 形态要点：
 * - `createPortal` + `position: fixed`，锚定触发头像下方并居中；复用项目自有的
 *   `useDropdownPosition`（实测面板尺寸、下方放不下翻上方、视口夹取、useLayoutEffect 防首帧闪）。
 * - 顶部带一个始终指向锚点中心的小箭头（`--mc-arrow-x` 由锚点中心与浮层 left 反算）。
 * - 点外部 / Esc / resize / 容器滚动即收起；**不锁 body 滚动**，这是浮层而非模态。
 *
 * 交互要点（macOS 心智）：**点选即时生效**，没有「取消 / 完成」按钮。
 * - 每次改动只提交一份完整 patch（照片/表情/背景三字段），避免形态与背景互相残留；
 * - 选表情清照片、选照片清表情，避免 avatarKind 的优先级让用户「选了表情却还看到旧照片」；
 * - 背景独立保存，对表情与首字母生效；照片会铺满圆形，故在照片页给出说明。
 */
export function AvatarPicker({ open, anchorRef, onClose, profile, onChange, toast }: AvatarPickerProps) {
  const { t, language } = useLanguage()
  const P = t.avatarPicker
  const isEn = language === 'en'

  const panelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<{ emoji: HTMLButtonElement | null; photo: HTMLButtonElement | null }>({
    emoji: null,
    photo: null,
  })
  // onClose 是调用方的内联回调，用 ref 固定，避免焦点 effect 每次渲染重跑导致焦点抖动
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [tab, setTab] = useState<Tab>('emoji')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<AvatarEmojiGroup | 'all'>('all')
  const [busy, setBusy] = useState(false)

  const pos = useDropdownPosition(open, anchorRef, { align: 'center', panelRef, gap: 10 })

  // 每次打开重置临时 UI 状态（搜索词/分组/标签）。资料本身不进草稿态：即时生效。
  useEffect(() => {
    if (!open) return
    setTab(profile.avatarUrl ? 'photo' : 'emoji')
    setQuery('')
    setGroup('all')
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在「打开」这一刻决定初始标签，打开后资料变化不应重置用户正在看的面板
  }, [open])

  // 收起条件：点外部、Esc、窗口缩放、祖先容器滚动。浮层内部滚动必须豁免（表情网格）。
  useEffect(() => {
    if (!open) return
    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      (panelRef.current?.contains(target) || anchorRef.current?.contains(target))

    const onPointerDown = (e: MouseEvent) => {
      if (!isInside(e.target)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onScroll = (e: Event) => {
      if (!isInside(e.target)) onClose()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    // capture=true 才能收到内层可滚动容器的滚动；target 判断把浮层自身滚动排除
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [open, onClose, anchorRef])

  // a11y（非模态浮层语义）：打开时把焦点移入浮层、关闭后归还触发元素；
  // 焦点移出浮层即收起。不做 focus trap、不锁 body 滚动，与 macOS popover 一致。
  // anchorEl 在 effect 内捕获一次：cleanup 时 anchorRef.current 可能已变，且避免 exhaustive-deps 警告。
  useEffect(() => {
    if (!open) return
    const anchorEl = anchorRef.current
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current
      const target = panel?.querySelector<HTMLElement>('[data-avatar-autofocus]') ?? panel
      target?.focus()
    })
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || anchorEl?.contains(target)) return
      onCloseRef.current()
    }
    document.addEventListener('focusin', onFocusIn)
    return () => {
      cancelAnimationFrame(raf)
      // 先摘监听再归还焦点，否则「归还」会被当成「移出」再触发一次 onClose
      document.removeEventListener('focusin', onFocusIn)
      anchorEl?.focus?.()
    }
  }, [open, anchorRef])

  const visibleEmojis = useMemo(() => filterAvatarEmojis(query, group), [query, group])

  /** ARIA tabs：左右方向键在「表情 / 照片」间切换并把焦点带到新 tab。 */
  const onTabListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next: Tab = tab === 'emoji' ? 'photo' : 'emoji'
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  /** 提交一份完整 patch：未改动的字段沿用当前资料，保证三字段永远一致。 */
  const commit = (patch: Partial<AvatarPatch>) => {
    onChange({
      avatarUrl: profile.avatarUrl,
      avatarEmoji: profile.avatarEmoji,
      avatarBg: profile.avatarBg,
      ...patch,
    })
  }

  const customHex = HEX_RE.test(profile.avatarBg) ? profile.avatarBg : '#7C8CFF'
  const hasCustomAvatar = Boolean(profile.avatarUrl || profile.avatarEmoji)
  const activeEmoji = !profile.avatarUrl ? profile.avatarEmoji : ''

  const onPickFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast?.(P.pickImage)
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast?.(P.imageTooLarge)
      return
    }
    setBusy(true)
    try {
      const dataUrl = await compressAvatarFile(file)
      commit({ avatarUrl: dataUrl, avatarEmoji: '' })
    } catch {
      toast?.(P.avatarFailed)
    } finally {
      setBusy(false)
    }
  }

  // 箭头 x = 锚点中心 − 浮层 left，夹进浮层圆角内，保证翻转/夹取后仍指向头像
  const anchorRect = open ? anchorRef.current?.getBoundingClientRect() : undefined
  const arrowX = anchorRect
    ? Math.min(
        Math.max(anchorRect.left + anchorRect.width / 2 - pos.left, ARROW_MARGIN),
        POPOVER_WIDTH - ARROW_MARGIN,
      )
    : POPOVER_WIDTH / 2
  const placement: 'top' | 'bottom' = anchorRect && pos.top < anchorRect.top ? 'top' : 'bottom'

  if (!open) return null

  const panelStyle = {
    top: pos.top,
    left: pos.left,
    '--mc-arrow-x': `${arrowX}px`,
  } as CSSProperties

  return createPortal(
    <div
      ref={panelRef}
      className="aurora-avatar-popover"
      role="dialog"
      aria-label={P.title}
      data-placement={placement}
      tabIndex={-1}
      style={panelStyle}
    >
      {/* —— 顶部：当前头像 + 昵称（macOS 气泡的「所见即所得」）—— */}
      <div className="aurora-avatar-picker__head">
        <UserAvatar profile={profile} size={44} label="" />
        <div className="aurora-avatar-picker__head-meta">
          <span className="aurora-avatar-picker__head-name">{userDisplayName(profile)}</span>
          <span className="aurora-avatar-picker__head-hint">{P.title}</span>
        </div>
        {hasCustomAvatar && (
          <button
            type="button"
            className="aurora-avatar-picker__reset"
            onClick={() => commit({ avatarUrl: '', avatarEmoji: '' })}
          >
            {P.clearAvatar}
          </button>
        )}
      </div>

      {/* —— 形态切换 —— */}
      <div
        className="aurora-avatar-picker__tabs"
        role="tablist"
        aria-label={P.tabsAria}
        onKeyDown={onTabListKeyDown}
      >
        <button
          ref={(el) => { tabRefs.current.emoji = el }}
          id="mc-avatar-tab-emoji"
          type="button"
          role="tab"
          aria-selected={tab === 'emoji'}
          aria-controls={tab === 'emoji' ? 'mc-avatar-panel-emoji' : undefined}
          tabIndex={tab === 'emoji' ? 0 : -1}
          className={`aurora-avatar-picker__tab${tab === 'emoji' ? ' is-active' : ''}`}
          onClick={() => setTab('emoji')}
        >
          {P.tabEmoji}
        </button>
        <button
          ref={(el) => { tabRefs.current.photo = el }}
          id="mc-avatar-tab-photo"
          type="button"
          role="tab"
          aria-selected={tab === 'photo'}
          aria-controls={tab === 'photo' ? 'mc-avatar-panel-photo' : undefined}
          tabIndex={tab === 'photo' ? 0 : -1}
          className={`aurora-avatar-picker__tab${tab === 'photo' ? ' is-active' : ''}`}
          onClick={() => setTab('photo')}
        >
          {P.tabPhoto}
        </button>
      </div>

      {/* —— 表情面板：搜索 + 分组 + 网格 —— */}
      {tab === 'emoji' ? (
        <div
          key="emoji-panel"
          id="mc-avatar-panel-emoji"
          role="tabpanel"
          aria-labelledby="mc-avatar-tab-emoji"
          tabIndex={-1}
          className="aurora-avatar-picker__panel"
        >
          <input
            type="search"
            data-avatar-autofocus
            className="aurora-avatar-picker__search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={P.searchPlaceholder}
            aria-label={P.searchAria}
          />
          <div className="aurora-avatar-picker__groups" role="group" aria-label={P.groupAria}>
            <button
              type="button"
              className={`aurora-avatar-picker__group${group === 'all' ? ' is-active' : ''}`}
              aria-pressed={group === 'all'}
              onClick={() => setGroup('all')}
            >
              {P.groupAll}
            </button>
            {AVATAR_EMOJI_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`aurora-avatar-picker__group${group === g.id ? ' is-active' : ''}`}
                aria-pressed={group === g.id}
                title={isEn ? g.en : g.zh}
                onClick={() => setGroup(g.id)}
              >
                {g.icon}
              </button>
            ))}
          </div>
          <div className="aurora-avatar-picker__grid-wrap">
            {visibleEmojis.length ? (
              <div className="aurora-avatar-picker__grid" role="group" aria-label={P.emojiGridAria}>
                {visibleEmojis.map((item) => (
                  <button
                    key={item.char}
                    type="button"
                    className={`aurora-avatar-picker__emoji${activeEmoji === item.char ? ' is-active' : ''}`}
                    aria-label={isEn ? item.en : item.zh}
                    aria-pressed={activeEmoji === item.char}
                    onClick={() => commit({ avatarUrl: '', avatarEmoji: item.char })}
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            ) : (
              <div className="aurora-avatar-picker__empty">{P.noResults}</div>
            )}
          </div>
        </div>
      ) : (
        <div
          key="photo-panel"
          id="mc-avatar-panel-photo"
          role="tabpanel"
          aria-labelledby="mc-avatar-tab-photo"
          tabIndex={-1}
          className="aurora-avatar-picker__panel aurora-avatar-picker__panel--photo"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="aurora-settings__file-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = '' // 允许重复选同一张
              void onPickFile(file)
            }}
          />
          <div className="aurora-avatar-picker__photo-preview">
            <UserAvatar profile={{ ...profile, avatarEmoji: '' }} size={56} label="" />
          </div>
          <div className="aurora-avatar-picker__photo-title">{P.uploadTitle}</div>
          <button
            type="button"
            className="aurora-btn aurora-btn--md aurora-btn--secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? P.processing : P.uploadBtn}
          </button>
          <span className="aurora-avatar-picker__photo-hint">{P.uploadHint}</span>
          {profile.avatarUrl && (
            <button
              type="button"
              className="aurora-avatar-picker__reset"
              onClick={() => commit({ avatarUrl: '' })}
            >
              {P.removePhoto}
            </button>
          )}
        </div>
      )}

      {/* —— 背景搭配：预设 + 任意取色 —— */}
      <div className="aurora-avatar-picker__bg">
        <div className="aurora-avatar-picker__bg-head">
          <span className="aurora-avatar-picker__bg-label">{P.background}</span>
          <span className="aurora-avatar-picker__bg-hint">{P.backgroundHint}</span>
        </div>
        <div className="aurora-avatar-picker__swatches" role="group" aria-label={P.bgAria}>
          {AVATAR_BG_PRESETS.map((preset) => {
            const bg = preset.value || DEFAULT_AVATAR_BG
            return (
              <button
                key={preset.value || 'default'}
                type="button"
                className={`aurora-avatar-picker__swatch${profile.avatarBg === preset.value ? ' is-active' : ''}`}
                style={{ background: bg }}
                title={isEn ? preset.en : preset.zh}
                aria-label={isEn ? preset.en : preset.zh}
                aria-pressed={profile.avatarBg === preset.value}
                onClick={() => commit({ avatarBg: preset.value })}
              />
            )
          })}
          <label
            className={`aurora-avatar-picker__swatch aurora-avatar-picker__swatch--custom${HEX_RE.test(profile.avatarBg) ? ' is-active' : ''}`}
            style={{ background: customHex }}
            title={P.customColor}
          >
            <input
              type="color"
              value={customHex}
              aria-label={P.customColor}
              onChange={(e) => commit({ avatarBg: e.target.value })}
            />
            <span className="aurora-avatar-picker__swatch-plus" aria-hidden="true">+</span>
          </label>
        </div>
        {tab === 'photo' && profile.avatarUrl && (
          <span className="aurora-avatar-picker__bg-note">{P.bgPhotoNote}</span>
        )}
      </div>
    </div>,
    document.body,
  )
}
