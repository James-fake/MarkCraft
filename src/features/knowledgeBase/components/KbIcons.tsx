/**
 * KbIcons — 知识库统一线性图标集（描边 SVG，currentColor）
 * 用于替代 emoji，弱化「AI 感」、提升精致度与一致性。
 */
import React from 'react'

interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

const svgProps = (size = 18, strokeWidth = 1.7, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
})

export const IconBook: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M5 4h11a2 2 0 0 1 2 2v13a1 1 0 0 0-1-1H6a2 2 0 0 0-2 2V4Z" />
    <path d="M5 4v14a2 2 0 0 0 2 2h11" />
  </svg>
)

export const IconFolder: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
)

export const IconPlus: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconImport: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M12 3v11" />
    <path d="m8 10 4 4 4-4" />
    <path d="M5 19h14" />
  </svg>
)

export const IconEdit: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

export const IconTrash: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
)

export const IconSearch: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

export const IconNotes: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6M9 16h6" />
  </svg>
)

export const IconLink: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </svg>
)

export const IconMap: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
)

export const IconSparkles: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
  </svg>
)

export const IconChat: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.9-5A8 8 0 1 1 21 12Z" />
  </svg>
)

export const IconTarget: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" />
  </svg>
)

export const IconCalendar: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
)

export const IconExport: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M12 15V4" />
    <path d="m8 8 4-4 4 4" />
    <path d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
  </svg>
)

export const IconGrid: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

export const IconActivity: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </svg>
)

export const IconTag: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M3 11V5a2 2 0 0 1 2-2h6l9 9-8 8-9-9Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </svg>
)

export const IconChevronLeft: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const IconClose: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconFileText: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v4h4M9 13h6M9 17h6" />
  </svg>
)

export const IconLayers: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
)

export const IconNetwork: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <circle cx="12" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="19" cy="19" r="2" />
    <path d="M12 7v4M12 11 6.5 17M12 11l5.5 6" />
  </svg>
)

export const IconAlert: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 9v5M12 17h.01" />
  </svg>
)

export const IconBulb: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
  </svg>
)

export const IconCompass: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </svg>
)

export const IconCheck: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="m5 12 5 5 9-11" />
  </svg>
)

export const IconInbox: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M3 13h5l1 3h6l1-3h5" />
    <path d="M5 5h14l2 8v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4l2-8Z" />
  </svg>
)

export const IconPaperclip: React.FC<IconProps> = ({ size, className, strokeWidth }) => (
  <svg {...svgProps(size, strokeWidth, className)}>
    <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 1 1 5 5L10.5 18a2 2 0 1 1-3-3l8-8" />
  </svg>
)
