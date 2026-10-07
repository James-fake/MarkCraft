/**
 * Classic theme CSS — base styles: root variables, body, header, hero
 */

import type { ColorScheme, FontSet } from './colorSchemes'

export interface ClassicCssConfig {
  isDark: boolean
  colors: ColorScheme
  fonts: FontSet
}

export function getClassicCssBase(params: ClassicCssConfig): string {
  const { isDark, colors, fonts } = params

  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Noto+Serif+SC:wght@400;600;700;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-primary: ${isDark ? '#0a0a0f' : '#fafaf8'};
      --bg-secondary: ${isDark ? '#12121a' : '#f5f3ef'};
      --bg-card: ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'};
      --bg-card-hover: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)'};
      --bg-code: ${isDark ? '#0d0d15' : '#f0ede8'};
      --text-primary: ${isDark ? '#e8e6e3' : '#1a1a1a'};
      --text-secondary: ${isDark ? '#8a8a9a' : '#5a5a5a'};
      --text-muted: ${isDark ? '#5a5a6a' : '#9a9a9a'};
      --border-color: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
      --border-hover: ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'};
      --accent-warm: ${colors.primary};
      --accent-cool: ${colors.secondary};
      --accent-violet: ${colors.accent};
      --accent-rose: ${colors.secondary};
      --accent-emerald: ${isDark ? '#34d399' : '#059669'};
      --accent: var(--accent-warm);
      --shadow-card: ${isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.04)'};
      --shadow-card-hover: ${isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.08)'};
      --radius: 8px;
      --radius-sm: 4px;
      --max-width: 900px;
      --transition: 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: ${fonts.body};
      line-height: 1.8;
      color: var(--text-primary);
      background: var(--bg-secondary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: clip;
    }

    body::before {
      content: '';
      position: fixed;
      top: -50%;
      right: -30%;
      width: 80vw;
      height: 80vw;
      display: none;
      pointer-events: none;
      z-index: 0;
    }

    body::after {
      content: '';
      position: fixed;
      bottom: -40%;
      left: -20%;
      width: 70vw;
      height: 70vw;
      display: none;
      pointer-events: none;
      z-index: 0;
    }

    a { color: var(--accent-warm); text-decoration: none; transition: all var(--transition); }
    a:hover { color: var(--accent-rose); }

    .site-header {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      background: ${isDark ? 'rgba(10,10,15,0.75)' : 'rgba(250,250,248,0.75)'};
      border-bottom: 1px solid var(--border-color);
    }

    .header-inner {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 16px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .site-title {
      font-family: ${fonts.heading};
      font-size: 1.5em;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      position: relative;
    }

    .site-title a { color: inherit; }
    .site-title a::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--accent-warm), var(--accent-rose));
      transition: width var(--transition);
    }
    .site-title a:hover::after { width: 100%; }

    .site-nav { display: flex; gap: 2px; align-items: center; }

    .site-nav a {
      padding: 8px 20px;
      border-radius: 24px;
      font-size: 0.82em;
      font-weight: 500;
      color: var(--text-secondary);
      transition: all var(--transition);
      cursor: pointer;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .site-nav a:hover {
      background: ${colors.primaryLight};
      color: var(--accent-warm);
    }

    .main-content {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 0 40px 100px;
      position: relative;
      z-index: 1;
    }

    .hero-section {
      padding: 100px 0 80px;
      position: relative;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 40px;
      align-items: end;
    }

    .hero-left { position: relative; }

    .hero-left::before {
      content: none;
    }

    .hero-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 0.7em;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      background: transparent;
      color: var(--text-secondary);
      margin-bottom: 28px;
      border: 1px solid var(--border-color);
    }

    .hero-label::before {
      content: none;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    .hero-title {
      font-family: ${fonts.heading};
      font-size: 3.8em;
      font-weight: 900;
      line-height: 1.08;
      margin-bottom: 20px;
      color: var(--text-primary);
      letter-spacing: -0.04em;
    }

    .hero-title span {
      background: linear-gradient(135deg, var(--accent-warm), var(--accent-cool));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }

    .hero-desc {
      font-size: 1.1em;
      color: var(--text-secondary);
      max-width: 480px;
      line-height: 1.9;
      font-weight: 300;
    }

    .hero-right {
      display: none;
    }

    .hero-right .vline {
      width: 1px;
      height: 80px;
      background: linear-gradient(to bottom, var(--accent-warm), transparent);
    }

    .hero-right .vlabel {
      writing-mode: vertical-rl;
      font-size: 0.65em;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .hero-divider {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 20px;
    }

    .hero-divider .line {
      flex: 1;
      height: 1px;
      background: var(--border-color);
    }

    .hero-divider .diamond {
      width: 6px;
      height: 6px;
      background: var(--text-muted);
      transform: rotate(45deg);
      flex-shrink: 0;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }
  `
}
