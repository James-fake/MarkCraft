/**
 * Classic theme CSS — card & list styles: featured card, grid card,
 * classic card, tags, timeline, tag groups
 */

import type { ClassicCssConfig } from './classicThemeCssBase'

export function getClassicCssCards(params: ClassicCssConfig): string {
  const { isDark, colors, fonts } = params

  return `
    .featured-card {
      display: block;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 48px 52px;
      margin-bottom: 48px;
      transition: all var(--transition);
      box-shadow: var(--shadow-card);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(10px);
      color: var(--text-primary);
    }

    .featured-card:hover {
      box-shadow: var(--shadow-card-hover);
      transform: translateY(-6px);
      border-color: var(--accent-warm);
      background: var(--bg-card-hover);
    }

    .featured-card-inner { position: relative; z-index: 1; }

    .featured-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.65em;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      background: transparent;
      color: var(--text-secondary);
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
    }

    .featured-number {
      display: none;
    }

    .featured-card:hover .featured-number {
      display: none;
    }

    .featured-card h2 {
      font-family: ${fonts.heading};
      font-size: 2em;
      font-weight: 900;
      margin-bottom: 16px;
      line-height: 1.25;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }

    .featured-card h2 a { color: inherit; }
    .featured-card h2 a:hover { color: var(--accent-warm); }

    .featured-card:hover h2 a { color: var(--accent-warm); }

    .featured-excerpt {
      color: var(--text-secondary);
      font-size: 1em;
      line-height: 1.9;
      margin-bottom: 20px;
      font-weight: 300;
      max-width: 600px;
    }

    .featured-cta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88em;
      font-weight: 600;
      color: var(--accent-warm);
      transition: all var(--transition);
    }

    .featured-cta svg { transition: transform var(--transition); }
    .featured-card:hover .featured-cta svg { transform: translateX(6px); }

    .featured-deco {
      display: none;
    }

    .deco-circle {
      display: none;
    }

    .deco-diamond {
      display: none;
    }

    .deco-dot {
      display: none;
    }

    .post-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 48px;
    }

    .grid-card {
      display: block;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      transition: all var(--transition);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      backdrop-filter: blur(10px);
      color: var(--text-primary);
    }

    .grid-card:hover {
      box-shadow: var(--shadow-card-hover);
      transform: translateY(-4px);
      border-color: var(--border-hover);
      background: var(--bg-card-hover);
    }

    .grid-card-inner {
      padding: 32px 28px;
      position: relative;
    }

    .grid-card--left .grid-card-inner { padding-left: 36px; }
    .grid-card--right .grid-card-inner { padding-right: 36px; }

    .grid-card-num {
      font-family: ${fonts.heading};
      font-size: 2.4em;
      font-weight: 900;
      color: ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'};
      line-height: 1;
      margin-bottom: 8px;
      transition: color var(--transition);
    }

    .grid-card:hover .grid-card-num {
      color: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
    }

    .grid-card-line {
      width: 32px;
      height: 2px;
      background: linear-gradient(90deg, var(--accent-warm), var(--accent-rose));
      margin-bottom: 16px;
      transition: width var(--transition);
    }

    .grid-card:hover .grid-card-line { width: 64px; }

    .grid-card h3 {
      font-family: ${fonts.heading};
      font-size: 1.25em;
      font-weight: 700;
      margin-bottom: 10px;
      line-height: 1.35;
      letter-spacing: -0.01em;
      color: var(--text-primary);
    }

    .grid-card h3 a { color: inherit; }
    .grid-card h3 a:hover { color: var(--accent-warm); }

    .grid-card:hover h3 a { color: var(--accent-warm); }

    .grid-excerpt {
      color: var(--text-secondary);
      font-size: 0.88em;
      line-height: 1.7;
      margin-bottom: 14px;
      font-weight: 300;
    }

    .grid-cta {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8em;
      font-weight: 500;
      color: var(--accent-warm);
      transition: all var(--transition);
    }

    .grid-cta svg { transition: transform var(--transition); }
    .grid-card:hover .grid-cta svg { transform: translateX(4px); }

    .post-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      color: var(--text-muted);
      font-size: 0.78em;
      margin-bottom: 12px;
      font-weight: 400;
    }

    .post-meta .meta-item { display: flex; align-items: center; gap: 5px; }
    .post-meta svg { width: 13px; height: 13px; opacity: 0.6; }

    .tag-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }

    .tag {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.72em;
      font-weight: 500;
      background: ${colors.primaryLight};
      color: var(--accent-warm);
      transition: all var(--transition);
      cursor: pointer;
      border: 1px solid transparent;
      letter-spacing: 0.02em;
    }

    .tag:hover {
      border-color: var(--accent-warm);
      background: ${colors.primaryLight};
    }

    .tag--cloud {
      padding: 8px 20px;
      font-size: 0.85em;
      border-radius: 24px;
      gap: 6px;
    }

    .tag-num {
      font-size: 0.8em;
      opacity: 0.6;
    }

    .category-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.72em;
      font-weight: 500;
      background: ${isDark ? 'rgba(52,211,153,0.08)' : 'rgba(5,150,105,0.05)'};
      color: var(--accent-emerald);
      border: 1px solid ${isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.1)'};
    }

    .page-header {
      padding: 80px 0 48px;
      position: relative;
    }

    .page-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, var(--accent-warm), var(--accent-rose), var(--accent-violet), transparent);
    }

    .page-title {
      font-family: ${fonts.heading};
      font-size: 3em;
      font-weight: 900;
      margin-bottom: 8px;
      color: var(--text-primary);
      letter-spacing: -0.03em;
    }

    .page-subtitle {
      color: var(--text-secondary);
      font-size: 1em;
      margin-bottom: 0;
      font-weight: 300;
    }

    .timeline-year { margin-bottom: 48px; }

    .timeline-year-label {
      font-family: ${fonts.heading};
      font-size: 2.4em;
      font-weight: 900;
      color: var(--text-primary);
      margin-bottom: 24px;
      letter-spacing: -0.03em;
      position: relative;
      display: inline-block;
    }

    .timeline-year-label::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-warm), var(--accent-rose));
      border-radius: 2px;
    }

    .timeline-group {
      position: relative;
      padding-left: 32px;
      border-left: 2px solid var(--border-color);
    }

    .timeline-item {
      display: flex;
      align-items: baseline;
      gap: 0;
      padding: 16px 0;
      position: relative;
      color: var(--text-primary);
      transition: all var(--transition);
    }

    .timeline-item:hover { padding-left: 12px; }

    .timeline-dot {
      position: absolute;
      left: -38px;
      top: 22px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid var(--accent-warm);
      background: var(--bg-secondary);
      transition: all var(--transition);
    }

    .timeline-item:hover .timeline-dot {
      background: var(--accent-warm);
      box-shadow: 0 0 0 4px ${colors.primaryLight};
    }

    .timeline-content {
      display: flex;
      align-items: baseline;
      gap: 20px;
    }

    .timeline-date {
      font-family: ${fonts.mono};
      font-size: 0.8em;
      color: var(--text-muted);
      min-width: 100px;
      flex-shrink: 0;
    }

    .timeline-title {
      font-family: ${fonts.heading};
      font-weight: 600;
      font-size: 1.05em;
    }

    .timeline-item:hover .timeline-title { color: var(--accent-warm); }

    .tag-cloud-section {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 48px;
      padding: 32px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      backdrop-filter: blur(10px);
    }

    .tag-group { margin-bottom: 36px; }

    .tag-group h3 {
      font-size: 1.3em;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: ${fonts.heading};
    }

    .tag-group h3 .tag-count {
      font-size: 0.65em;
      font-weight: 500;
      background: ${colors.primaryLight};
      color: var(--accent-warm);
      padding: 3px 10px;
      border-radius: 12px;
      font-family: ${fonts.body};
    }

    .tag-post-item {
      display: flex;
      align-items: baseline;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      transition: all var(--transition);
    }

    .tag-post-item:hover { padding-left: 8px; }
    .tag-post-item:last-child { border-bottom: none; }

    .tag-post-date {
      font-family: ${fonts.mono};
      font-size: 0.78em;
      color: var(--text-muted);
      min-width: 90px;
    }

    .tag-post-title {
      font-family: ${fonts.heading};
      font-weight: 500;
    }

    .tag-post-item:hover .tag-post-title { color: var(--accent-warm); }
  `
}
