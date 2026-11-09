import type { CSSProperties } from 'react'

export interface BrandLogoProps {
  /** 像素尺寸（正方形） */
  size?: number
  className?: string
  style?: CSSProperties
}

/**
 * MarkCraft 统一品牌图标 —— 与 `build/icon.svg` / `build/icon.png` / EXE 窗口图标同源
 * （macOS 质感「折角便签」：品牌色 #7C8CFF 连续圆角舞台 + 白纸折角 + 压印 M + 顶部高光 +
 * 边缘 rim light + 纸张柔和投影；path 绘制，无字体依赖）。
 *
 * 所有品牌露出（TitleBar / 首启引导 / 关于页）统一引用此处，杜绝「多图标漂移」。
 */
export function BrandLogo({ size = 72, className, style }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      style={style}
      role="img"
      aria-label="MarkCraft"
    >
      <defs>
        <linearGradient id="mcBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9AA7FF" />
          <stop offset="0.5" stopColor="#7C8CFF" />
          <stop offset="1" stopColor="#5E6BD6" />
        </linearGradient>
        <linearGradient id="mcSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mcPaper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#EEF1FB" />
        </linearGradient>
        <filter id="mcNoteShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#1a1f4a" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect x="8" y="8" width="496" height="496" rx="124" fill="url(#mcBg)" />
      <rect x="8" y="8" width="496" height="496" rx="124" fill="url(#mcSheen)" />

      <g transform="rotate(-5 256 256)" filter="url(#mcNoteShadow)">
        <path d="M96 96 L372 96 L416 140 L416 416 L96 416 Z" fill="url(#mcPaper)" />
        <path d="M372 96 L416 140 L416 96 Z" fill="#E2E6F5" />
        <path d="M372 96 L416 140" fill="none" stroke="#C7CCE8" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M176 336 L176 192 L216 192 L256 264 L296 192 L336 192 L336 336 L304 336 L304 248 L256 326 L208 248 L208 336 Z"
          fill="#7C8CFF"
        />
        <g stroke="#7C8CFF" strokeWidth="9" strokeLinecap="round" opacity="0.2">
          <line x1="150" y1="362" x2="362" y2="362" />
          <line x1="150" y1="388" x2="362" y2="388" />
          <line x1="150" y1="412" x2="318" y2="412" />
        </g>
      </g>

      <rect x="8" y="8" width="496" height="496" rx="124" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="3" />
    </svg>
  )
}
