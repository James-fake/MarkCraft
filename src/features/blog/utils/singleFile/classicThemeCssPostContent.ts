/**
 * Classic theme CSS — post content styles: post detail, post content,
 * tags, back-link, footer, page sections, tag filter, responsive
 */

import type { ClassicCssConfig } from './classicThemeCssBase'

export function getClassicCssPostContent(params: ClassicCssConfig): string {
  const { colors, fonts } = params

  return `
    .post-detail-wrapper {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 0 40px 100px;
      position: relative;
      z-index: 1;
    }

    .post-header {
      margin-bottom: 56px;
      padding: 80px 0 40px;
      position: relative;
    }

    .post-header-deco {
      position: absolute;
      top: 0;
      left: 0;
      width: 100px;
      height: 4px;
      background: linear-gradient(90deg, var(--accent-warm), var(--accent-rose), var(--accent-violet));
      border-radius: 2px;
    }

    .post-header-ornament {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 32px;
    }

    .ornament-line {
      width: 40px;
      height: 1px;
      background: var(--border-color);
    }

    .ornament-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-warm);
    }

    .post-header h1 {
      font-family: ${fonts.heading};
      font-size: 3em;
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 24px;
      color: var(--text-primary);
      letter-spacing: -0.03em;
    }

    .post-content {
      font-size: 1.05em;
      line-height: 2;
      color: var(--text-primary);
      position: relative;
    }

    .post-content::before {
      content: '';
      position: absolute;
      left: -24px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, var(--accent-warm), var(--accent-rose), var(--accent-violet), transparent);
      border-radius: 1px;
    }

    .post-content h1, .post-content h2, .post-content h3, .post-content h4 {
      font-family: ${fonts.heading};
      margin-top: 2.5em;
      margin-bottom: 0.8em;
      line-height: 1.35;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .post-content h2[id], .post-content h3[id] {
      scroll-margin-top: 80px;
    }

    .post-content h2 {
      font-size: 1.6em;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
      position: relative;
    }

    .post-content h2::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 50px;
      height: 2px;
      background: linear-gradient(90deg, var(--accent-warm), var(--accent-rose));
    }

    .post-content h3 { font-size: 1.3em; }
    .post-content p { margin-bottom: 1.4em; }
    .post-content > p:first-of-type::first-letter {
      font-family: ${fonts.heading};
      font-size: 3.2em;
      font-weight: 900;
      float: left;
      line-height: 0.8;
      margin: 6px 12px 0 0;
      color: var(--accent-warm);
    }
    .post-content ul, .post-content ol { margin-bottom: 1.4em; padding-left: 1.8em; }
    .post-content li { margin-bottom: 0.5em; }

    .post-content blockquote {
      border-left: 3px solid var(--accent-warm);
      padding: 20px 28px;
      margin: 1.5em 0;
      margin-left: -20px;
      background: ${colors.primaryLight};
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      color: var(--text-secondary);
      font-style: italic;
      position: relative;
    }

    .post-content blockquote::before {
      content: '"';
      position: absolute;
      top: -12px;
      left: 16px;
      font-family: ${fonts.heading};
      font-size: 3.5em;
      color: var(--accent-warm);
      opacity: 0.15;
      line-height: 1;
    }

    .post-content pre {
      background: var(--bg-code);
      border: 1px solid var(--border-color);
      padding: 24px;
      border-radius: var(--radius-sm);
      overflow-x: auto;
      margin: 1.5em 0;
      font-size: 0.88em;
      line-height: 1.7;
      position: relative;
    }

    .post-content code {
      font-family: ${fonts.mono};
      font-size: 0.88em;
    }

    .post-content :not(pre) > code {
      background: ${colors.primaryLight};
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 0.82em;
      color: var(--accent-warm);
      border: 1px solid ${colors.primaryLight};
    }

    .post-content img {
      max-width: 100%;
      height: auto;
      border-radius: var(--radius-sm);
      margin: 2em 0;
      box-shadow: var(--shadow-card);
    }

    .post-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 1.5em 0;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .post-content th {
      background: ${colors.primaryLight};
      font-weight: 600;
      font-size: 0.88em;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .post-content th, .post-content td {
      border: 1px solid var(--border-color);
      padding: 12px 18px;
      text-align: left;
    }

    .post-content hr {
      border: none;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--border-color), transparent);
      margin: 3em 0;
    }

    .post-tags {
      margin-top: 56px;
      padding-top: 36px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .post-tags-label {
      font-size: 0.75em;
      color: var(--text-muted);
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 56px;
      padding: 14px 28px;
      border-radius: 28px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 0.88em;
      font-weight: 500;
      transition: all var(--transition);
      backdrop-filter: blur(10px);
    }

    .back-link:hover {
      border-color: var(--accent-warm);
      color: var(--accent-warm);
      background: ${colors.primaryLight};
      transform: translateX(-4px);
    }

    .site-footer {
      border-top: 1px solid var(--border-color);
      padding: 48px 40px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8em;
      position: relative;
      z-index: 1;
    }

    .site-footer::before {
      content: '';
      display: block;
      width: 40px;
      height: 2px;
      background: linear-gradient(90deg, var(--accent-warm), var(--accent-rose));
      margin: 0 auto 24px;
      border-radius: 1px;
    }

    .page-section { display: none; }
    .page-section.active { display: block; animation: fadeIn 0.5s ease; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .tag-filter-active .tag-item { display: none; }
    .tag-filter-active .tag-group { display: none; }
    .tag-filter-active .tag-item.show { display: flex; }
    .tag-filter-active .tag-group.show { display: block; }

    @media (max-width: 768px) {
      .header-inner { padding: 14px 20px; }
      .hero-section { grid-template-columns: 1fr; padding: 60px 0 48px; gap: 0; }
      .hero-right { display: none; }
      .hero-title { font-size: 2.2em; }
      .post-grid { grid-template-columns: 1fr; }
      .featured-card { padding: 32px 24px; }
      .featured-card h2 { font-size: 1.5em; }
      .featured-number { font-size: 4em; }
      .featured-deco { display: none; }
      .post-header h1 { font-size: 2em; }
      .main-content, .post-detail-wrapper { padding-left: 20px; padding-right: 20px; }
      .timeline-content { flex-direction: column; gap: 4px; }
      .timeline-date { min-width: auto; }
      .post-content::before { display: none; }
      .post-content blockquote { margin-left: 0; }
      .post-body-layout { grid-template-columns: 1fr; }
      .post-toc { display: none; }
    }
  `
}
