import { ThemeColors } from './themeColors'

export function getBaseStyles(colors: ThemeColors): string {
  const { accent, accentLight, isDark } = colors
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
      --accent-warm: ${accent};
      --accent-cool: ${isDark ? '#06b6d4' : '#0891b2'};
      --accent-violet: ${isDark ? '#a78bfa' : '#7c3aed'};
      --accent-rose: ${isDark ? '#fb7185' : '#e11d48'};
      --accent-emerald: ${isDark ? '#34d399' : '#059669'};
      --accent: ${accent};
      --accent-light: ${accentLight};
      --shadow-card: ${isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.04)'};
      --shadow-card-hover: ${isDark ? '0 12px 40px rgba(0,0,0,0.4)' : '0 12px 40px rgba(0,0,0,0.08)'};
      --radius: 16px;
      --radius-sm: 10px;
      --max-width: 800px;
      --transition: 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.8;
      color: var(--text-primary);
      background: var(--bg-secondary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
    }

    body::before {
      content: '';
      position: fixed;
      top: -50%;
      right: -30%;
      width: 80vw;
      height: 80vw;
      background: radial-gradient(circle, ${accentLight} 0%, transparent 70%);
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
      background: radial-gradient(circle, ${isDark ? 'rgba(167,139,250,0.03)' : 'rgba(124,58,237,0.02)'} 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    a { color: var(--accent); text-decoration: none; transition: all var(--transition); }
    a:hover { color: var(--accent-rose); }

    .site-header {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      background: ${isDark ? 'rgba(10,10,15,0.8)' : 'rgba(250,250,248,0.8)'};
      border-bottom: 1px solid var(--border-color);
    }

    .header-inner {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 18px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .site-title {
      font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
      font-size: 1.6em;
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

    .site-nav {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .site-nav a {
      padding: 8px 18px;
      border-radius: 24px;
      font-size: 0.85em;
      font-weight: 500;
      color: var(--text-secondary);
      transition: all var(--transition);
      letter-spacing: 0.02em;
    }

    .site-nav a:hover {
      background: ${accentLight};
      color: var(--accent);
    }

    .main-content {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 0 32px 80px;
      position: relative;
      z-index: 1;
    }

    .hero-section {
      padding: 80px 0 60px;
      position: relative;
    }

    .hero-section::before {
      content: '';
      position: absolute;
      top: 40px;
      left: -60px;
      width: 120px;
      height: 120px;
      border: 2px solid ${accentLight.replace(/[\d.]+\)$/, '0.15)')};
      border-radius: 50%;
      animation: float 8s ease-in-out infinite;
    }

    .hero-section::after {
      content: '';
      position: absolute;
      top: 100px;
      right: -40px;
      width: 80px;
      height: 80px;
      border: 2px solid ${isDark ? 'rgba(167,139,250,0.1)' : 'rgba(124,58,237,0.06)'};
      border-radius: 4px;
      transform: rotate(45deg);
      animation: float 10s ease-in-out infinite reverse;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }

    .hero-section h2 {
      font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
      font-size: 3.2em;
      font-weight: 900;
      margin-bottom: 16px;
      color: var(--text-primary);
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, var(--accent-warm), var(--accent-rose), var(--accent-violet));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-section p {
      font-size: 1.15em;
      color: var(--text-secondary);
      font-weight: 300;
      max-width: 560px;
    }
  `
}
