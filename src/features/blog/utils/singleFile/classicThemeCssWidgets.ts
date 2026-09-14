/**
 * Classic theme CSS — widgets & layout styles: TOC, author card, share,
 * reading progress, minimal/classic layouts, sidebar
 */

import type { ClassicCssConfig } from './classicThemeCssBase'

export function getClassicCssWidgets(params: ClassicCssConfig): string {
  const { colors, fonts } = params

  return `
    .reading-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      width: 0%;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-warm), var(--accent-rose), var(--accent-violet));
      z-index: 200;
      transition: width 0.1s linear;
    }

    .post-body-layout {
      display: grid;
      grid-template-columns: 1fr 200px;
      gap: 40px;
      align-items: start;
    }

    .post-toc {
      position: sticky;
      top: 80px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      padding: 20px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      backdrop-filter: blur(10px);
      scrollbar-width: thin;
      scrollbar-color: rgba(128,128,128,0.2) transparent;
    }
    .post-toc::-webkit-scrollbar { width: 3px; }
    .post-toc::-webkit-scrollbar-track { background: transparent; }
    .post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
    .post-toc::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.4); }

    .toc-title {
      font-size: 0.72em;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    .toc-nav a {
      display: block;
      padding: 4px 0;
      font-size: 0.78em;
      color: var(--text-muted);
      transition: all var(--transition);
      line-height: 1.5;
    }

    .toc-nav a.toc-h1 { font-weight: 600; }
    .toc-nav a.toc-h3 { padding-left: 12px; }
    .toc-nav a.toc-h4 { padding-left: 24px; }
    .toc-nav a.toc-h5 { padding-left: 36px; }
    .toc-nav a.toc-h6 { padding-left: 48px; }
    .toc-nav a:hover, .toc-nav a.active { color: var(--accent-warm); }

    .post-author-card {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 48px;
      padding: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      backdrop-filter: blur(10px);
    }

    .author-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-warm), var(--accent-rose));
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${fonts.heading};
      font-size: 1.4em;
      font-weight: 900;
      color: #fff;
      flex-shrink: 0;
    }

    .author-name {
      font-family: ${fonts.heading};
      font-weight: 700;
      font-size: 1.05em;
      color: var(--text-primary);
    }

    .author-bio {
      font-size: 0.85em;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .post-share {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
      padding: 16px 0;
      border-top: 1px solid var(--border-color);
    }

    .share-label {
      font-size: 0.78em;
      font-weight: 500;
      color: var(--text-muted);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .share-copy-btn {
      padding: 8px 18px;
      border-radius: 20px;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-size: 0.82em;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition);
    }

    .share-copy-btn:hover {
      border-color: var(--accent-warm);
      color: var(--accent-warm);
      background: ${colors.primaryLight};
    }

    /* Vote section */
    .vote-section {
      display: flex; justify-content: center; align-items: center; gap: 24px;
      margin: 32px 0; padding: 24px 0;
      border-top: 1px solid var(--border-color);
    }
    .vote-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: none; border: 2px solid var(--border-color);
      border-radius: 24px; padding: 8px 18px; cursor: pointer;
      transition: all 0.25s ease; font-size: 14px; color: #888;
      font-family: inherit;
    }
    .vote-btn:hover { border-color: var(--accent); background: ${colors.primaryLight}; transform: scale(1.05); }
    .vote-btn:active { transform: scale(0.95); }
    .vote-btn.active.vote-up { border-color: #22c55e; background: rgba(34,197,94,0.1); color: #22c55e; }
    .vote-btn.active.vote-down { border-color: #ef4444; background: rgba(239,68,68,0.1); color: #ef4444; }
    .vote-icon { font-size: 18px; line-height: 1; }
    .vote-count { font-weight: 600; min-width: 12px; text-align: center; }

    /* About page */
    .about-page { text-align: center; }
    .about-avatar { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 24px; object-fit: cover; border: 3px solid var(--accent); }
    .about-bio { font-size: 1.05em; color: var(--text-secondary); line-height: 1.8; max-width: 600px; margin: 0 auto 32px; }
    .about-skills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 32px; }
    .about-skill-tag { padding: 6px 16px; border-radius: 20px; background: ${colors.primaryLight}; color: var(--accent); font-size: 0.85em; font-weight: 500; }
    .about-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
    .about-contact a { padding: 8px 20px; border-radius: 20px; background: var(--bg-card); border: 1px solid var(--border-color); font-size: 0.9em; color: var(--text-secondary); transition: all 0.2s; }
    .about-contact a:hover { border-color: var(--accent); color: var(--accent); }

    /* Friend links page */
    .friend-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .friend-link-card { display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-radius: var(--radius); background: var(--bg-card); border: 1px solid var(--border-color); transition: all 0.25s; text-decoration: none; }
    .friend-link-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .friend-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .friend-info strong { font-size: 1em; color: var(--text-primary); }
    .friend-info p { font-size: 0.85em; color: var(--text-muted); margin-top: 4px; }

    /* Series page */
    .series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
    .series-card { display: flex; gap: 16px; padding: 20px; border-radius: var(--radius); background: var(--bg-card); border: 1px solid var(--border-color); transition: all 0.25s; text-decoration: none; }
    .series-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .series-cover { width: 80px; height: 80px; border-radius: 8px; background: ${colors.primaryLight}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
    .series-icon { font-size: 32px; }
    .series-info { flex: 1; min-width: 0; }
    .series-title { font-size: 1.05em; font-weight: 600; margin: 0 0 6px; color: var(--text-primary); }
    .series-description { font-size: 0.85em; color: var(--text-muted); margin: 0 0 8px; }
    .series-meta { font-size: 0.8em; color: var(--text-muted); }
    .series-count { background: ${colors.primaryLight}; color: var(--accent); padding: 2px 8px; border-radius: 10px; }

    /* Reward section */
    .reward-section { text-align: center; margin: 24px 0; padding: 20px 0; border-top: 1px solid var(--border-color); }

    /* Related posts */
    .related-posts{margin:32px 0;padding:24px 0;border-top:1px solid var(--border-color)}
    .related-title{font-size:1.1em;font-weight:600;margin-bottom:16px;color:var(--text-primary)}
    .related-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
    .related-card{display:block;padding:16px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border-color);text-decoration:none;transition:all 0.2s}
    .related-card:hover{border-color:var(--accent);transform:translateY(-2px)}
    .related-card-title{font-size:0.95em;font-weight:500;color:var(--text-primary);margin-bottom:8px}
    .related-card-meta{display:flex;align-items:center;gap:8px;font-size:0.8em;color:var(--text-muted)}
    .related-tag{padding:2px 8px;border-radius:10px;background:${colors.primaryLight};color:var(--accent);font-size:0.85em}

    /* Admonition blocks */
    .admonition{margin:16px 0;padding:16px 20px;border-radius:8px;border-left:4px solid;font-size:0.95em}
    .admonition-title{font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .admonition-content{line-height:1.7}
    .admonition-content p:first-child{margin-top:0}
    .admonition-content p:last-child{margin-bottom:0}
    .admonition.tip{background:rgba(52,211,153,0.08);border-left-color:#34d399;color:var(--text-primary)}
    .admonition.tip .admonition-title{color:#34d399}
    .admonition.warning{background:rgba(251,191,36,0.08);border-left-color:#fbbf24;color:var(--text-primary)}
    .admonition.warning .admonition-title{color:#fbbf24}
    .admonition.danger{background:rgba(239,68,68,0.08);border-left-color:#ef4444;color:var(--text-primary)}
    .admonition.danger .admonition-title{color:#ef4444}
    .admonition.details{background:var(--bg-card);border-left-color:var(--accent)}
    .admonition.details .admonition-title{cursor:pointer;color:var(--accent)}
    .admonition.details .admonition-content{padding-top:8px}

    .reading-time {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    /* Scroll nav buttons */
    .scroll-nav {
      position: fixed;
      bottom: 32px;
      right: 32px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 99;
    }
    .scroll-nav-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px);
      transition: all 0.3s ease;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .scroll-nav-btn.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    .scroll-nav-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-light, rgba(231,76,60,0.08));
      transform: translateY(-4px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }
    @media (max-width: 768px) {
      .scroll-nav { bottom: 20px; right: 20px; }
      .scroll-nav-btn { width: 40px; height: 40px; }
    }

    /* Code copy button */
    .post-content pre {
      position: relative;
    }
    .code-copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-muted);
      font-size: 0.75em;
      font-family: inherit;
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s ease;
      z-index: 10;
    }
    .post-content pre:hover .code-copy-btn {
      opacity: 1;
    }
    .code-copy-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-light, rgba(231,76,60,0.08));
    }
    .code-copy-btn.copied {
      border-color: #22c55e;
      color: #22c55e;
    }

    /* 404 page */
    .not-found-page {
      text-align: center;
      padding: 120px 20px;
    }
    .not-found-code {
      font-size: 8em;
      font-weight: 900;
      color: var(--text-muted);
      opacity: 0.2;
      line-height: 1;
      margin-bottom: 16px;
    }
    .not-found-text {
      font-size: 1.3em;
      color: var(--text-secondary);
      margin-bottom: 32px;
    }
    .not-found-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 24px;
      border-radius: 24px;
      background: var(--accent-light, rgba(231,76,60,0.08));
      color: var(--accent);
      font-weight: 500;
      font-size: 0.95em;
      transition: all 0.2s;
      text-decoration: none;
    }
    .not-found-link:hover {
      background: var(--accent);
      color: #fff;
    }

    .minimal-list {
      display: flex;
      flex-direction: column;
      padding-top: 80px;
    }

    .minimal-item {
      display: flex;
      align-items: baseline;
      gap: 24px;
      padding: 18px 0;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      transition: all var(--transition);
    }

    .minimal-item:first-child {
      border-top: 1px solid var(--border-color);
    }

    .minimal-item:hover {
      padding-left: 12px;
    }

    .minimal-item:hover .minimal-title {
      color: var(--accent-warm);
    }

    .minimal-date {
      font-family: ${fonts.mono};
      font-size: 0.82em;
      color: var(--text-muted);
      min-width: 100px;
      flex-shrink: 0;
    }

    .minimal-title {
      font-family: ${fonts.heading};
      font-weight: 600;
      font-size: 1.1em;
      transition: color var(--transition);
    }

    .classic-layout {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 48px;
      align-items: start;
    }

    .classic-main {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .classic-card {
      display: block;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 28px 32px;
      transition: all var(--transition);
      box-shadow: var(--shadow-card);
      backdrop-filter: blur(10px);
      color: var(--text-primary);
    }

    .classic-card:hover {
      box-shadow: var(--shadow-card-hover);
      transform: translateY(-3px);
      border-color: var(--border-hover);
      background: var(--bg-card-hover);
    }

    .classic-card h3 {
      font-family: ${fonts.heading};
      font-size: 1.3em;
      font-weight: 700;
      margin-bottom: 10px;
      line-height: 1.35;
      letter-spacing: -0.01em;
      color: var(--text-primary);
      transition: color var(--transition);
    }

    .classic-card:hover h3 {
      color: var(--accent-warm);
    }

    .classic-excerpt {
      color: var(--text-secondary);
      font-size: 0.9em;
      line-height: 1.7;
      margin-bottom: 12px;
      font-weight: 300;
    }

    .classic-sidebar {
      position: sticky;
      top: 80px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .sidebar-section {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 24px;
      backdrop-filter: blur(10px);
    }

    .sidebar-title {
      font-family: ${fonts.heading};
      font-size: 0.82em;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }

    .sidebar-tag-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .sidebar-recent {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .sidebar-recent-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      transition: all var(--transition);
    }

    .sidebar-recent-item:last-child {
      border-bottom: none;
    }

    .sidebar-recent-item:hover {
      padding-left: 8px;
    }

    .sidebar-recent-item:hover .sidebar-recent-title {
      color: var(--accent-warm);
    }

    .sidebar-recent-title {
      font-family: ${fonts.heading};
      font-weight: 500;
      font-size: 0.92em;
      line-height: 1.4;
      transition: color var(--transition);
    }

    .sidebar-recent-date {
      font-family: ${fonts.mono};
      font-size: 0.75em;
      color: var(--text-muted);
    }

    /* Image lightbox */
    .lightbox-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:pointer;animation:lightboxIn .2s ease}
    .lightbox-overlay img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,0.5)}
    @keyframes lightboxIn{from{opacity:0}to{opacity:1}}

    /* Breadcrumb navigation */
    .breadcrumb{margin-bottom:16px;font-size:0.85em;color:var(--text-muted,#888)}
    .breadcrumb ol{display:flex;align-items:center;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap}
    .breadcrumb li{display:flex;align-items:center;gap:6px}
    .breadcrumb li+li::before{content:'/';color:var(--border-color,rgba(128,128,128,0.3))}
    .breadcrumb a{color:var(--text-muted,#888);text-decoration:none;transition:color 0.2s}
    .breadcrumb a:hover{color:var(--accent-warm)}
    .breadcrumb-current{color:var(--text-primary,#333)}

    /* TOC scroll spy active state */
    .toc-link.active{color:var(--accent-warm);font-weight:600}

    /* Page transition animation */
    @keyframes pageFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

    @media (max-width: 768px) {
      .classic-layout {
        grid-template-columns: 1fr;
      }
      .classic-sidebar {
        position: static;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .sidebar-section {
        flex: 1;
        min-width: 240px;
      }
      .minimal-item {
        flex-direction: column;
        gap: 4px;
      }
      .minimal-date {
        min-width: auto;
      }
    }
  `
}
