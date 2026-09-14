import { ThemeColors } from './themeColors'

export function getComponentStyles(colors: ThemeColors): string {
  const { accent, accentLight } = colors
  return `
    .post-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 24px 28px;
      margin-bottom: 20px;
      transition: all 0.25s ease;
      box-shadow: var(--shadow-sm);
    }

    .post-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
      border-color: var(--accent);
    }

    .post-card h2 {
      font-family: 'Noto Serif SC', Georgia, serif;
      font-size: 1.35em;
      font-weight: 600;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .post-card h2 a { color: var(--text-primary); }
    .post-card h2 a:hover { color: var(--accent); }

    .post-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      color: var(--text-muted);
      font-size: 0.85em;
      margin-bottom: 10px;
    }

    .post-meta .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .post-meta svg { width: 14px; height: 14px; opacity: 0.7; }

    .post-description {
      color: var(--text-secondary);
      font-size: 0.95em;
      line-height: 1.7;
      margin-bottom: 12px;
    }

    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }

    .tag {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.78em;
      font-weight: 500;
      background: var(--accent-light);
      color: var(--accent);
      transition: all 0.2s;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .tag:hover {
      border-color: var(--accent);
      background: var(--accent-light);
    }

    .category-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.78em;
      font-weight: 500;
      background: ${accentLight};
      color: ${accent};
    }

    .page-title {
      font-family: 'Noto Serif SC', Georgia, serif;
      font-size: 1.8em;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .page-subtitle {
      color: var(--text-secondary);
      font-size: 1em;
      margin-bottom: 32px;
    }

    .archive-section { margin-bottom: 36px; }

    .archive-year {
      font-family: 'Noto Serif SC', Georgia, serif;
      font-size: 1.6em;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border-color);
    }

    .archive-item {
      display: flex;
      align-items: baseline;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .archive-item:last-child { border-bottom: none; }

    .archive-item .date {
      color: var(--text-muted);
      font-size: 0.85em;
      font-family: 'Inter', monospace;
      min-width: 90px;
      flex-shrink: 0;
    }

    .archive-item a {
      font-size: 1em;
      font-weight: 500;
      color: var(--text-primary);
    }

    .archive-item a:hover { color: var(--accent); }

    .tag-cloud-section {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 40px;
      padding: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
    }

    .tag-cloud-section .tag {
      font-size: 0.9em;
      padding: 6px 16px;
    }

    .tag-cloud-section .tag-level-1 { font-size: 0.8em; opacity: 0.7; }
    .tag-cloud-section .tag-level-2 { font-size: 0.95em; opacity: 0.8; }
    .tag-cloud-section .tag-level-3 { font-size: 1.1em; }
    .tag-cloud-section .tag-level-4 { font-size: 1.3em; font-weight: 600; }
    .tag-cloud-section .tag-level-5 { font-size: 1.5em; font-weight: 700; }
    .tag-count-inline { font-size: 0.75em; opacity: 0.6; }

    .tag-group {
      margin-bottom: 32px;
    }

    .tag-group h3 {
      font-size: 1.2em;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tag-group h3 .tag-count {
      font-size: 0.7em;
      font-weight: 500;
      background: var(--accent-light);
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 10px;
    }

    .post-detail { max-width: var(--max-width); margin: 0 auto; padding: 32px 24px 64px; }

    .post-header {
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .post-header h1 {
      font-family: 'Noto Serif SC', Georgia, serif;
      font-size: 2em;
      font-weight: 700;
      line-height: 1.35;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .post-content {
      font-size: 1.05em;
      line-height: 1.9;
      color: var(--text-primary);
    }

    .post-content h1, .post-content h2, .post-content h3, .post-content h4 {
      font-family: 'Noto Serif SC', Georgia, serif;
      margin-top: 2em;
      margin-bottom: 0.8em;
      line-height: 1.4;
      color: var(--text-primary);
    }

    .post-content h2 { font-size: 1.5em; padding-bottom: 6px; border-bottom: 1px solid var(--border-color); }
    .post-content h3 { font-size: 1.25em; }

    .post-content p { margin-bottom: 1.2em; }

    .post-content ul, .post-content ol {
      margin-bottom: 1.2em;
      padding-left: 1.8em;
    }

    .post-content li { margin-bottom: 0.4em; }

    .post-content blockquote {
      border-left: 4px solid var(--accent);
      padding: 12px 20px;
      margin: 1.2em 0;
      background: var(--accent-light);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      color: var(--text-secondary);
      font-style: italic;
    }

    .post-content pre {
      background: var(--bg-code);
      border: 1px solid var(--border-color);
      padding: 20px;
      border-radius: var(--radius-sm);
      overflow-x: auto;
      margin: 1.2em 0;
      font-size: 0.9em;
      line-height: 1.6;
      position: relative;
    }

    /* Code copy button */
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
      background: var(--accent-light);
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
      background: var(--accent-light);
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

    .post-content code {
      font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
      font-size: 0.9em;
    }

    .post-content :not(pre) > code {
      background: var(--accent-light);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      color: var(--accent);
    }

    .post-content img {
      max-width: 100%;
      height: auto;
      border-radius: var(--radius-sm);
      margin: 1.5em 0;
      box-shadow: var(--shadow-md);
    }

    .post-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 1.2em 0;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .post-content th {
      background: var(--bg-secondary);
      font-weight: 600;
    }

    .post-content th, .post-content td {
      border: 1px solid var(--border-color);
      padding: 10px 16px;
      text-align: left;
    }

    .post-content hr {
      border: none;
      border-top: 2px solid var(--border-color);
      margin: 2em 0;
    }

    .post-tags {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .post-tags-label {
      font-size: 0.85em;
      color: var(--text-muted);
      font-weight: 500;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 40px;
      padding: 10px 20px;
      border-radius: 20px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 0.9em;
      font-weight: 500;
      transition: all 0.2s;
    }

    .back-link:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-light);
    }

    .site-footer {
      border-top: 1px solid var(--border-color);
      padding: 24px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85em;
    }

    .social-links {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .social-links a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      color: var(--text-muted);
      transition: all 0.2s;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
    }

    .social-links a:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-light);
      transform: translateY(-2px);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }

    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.4; }
    .empty-state p { font-size: 1.1em; }

    /* 阅读进度条 */
    .reading-progress {
      position: fixed; top: 0; left: 0; height: 3px; width: 0;
      background: var(--accent); z-index: 1000;
      transition: width 0.1s ease; box-shadow: 0 0 6px var(--accent);
    }

    /* 滚动导航按钮 */
    .scroll-nav {
      position: fixed; bottom: 32px; right: 32px;
      display: flex; flex-direction: column; gap: 8px; z-index: 999;
    }
    .scroll-nav-btn {
      width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer;
      background: var(--accent); color: #fff;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; visibility: hidden; transform: translateY(20px);
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .scroll-nav-btn.visible { opacity: 1; visibility: visible; transform: translateY(0); }
    .scroll-nav-btn:hover { transform: translateY(-4px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
    @media (max-width: 768px) { .scroll-nav { bottom: 20px; right: 20px; } .scroll-nav-btn { width: 40px; height: 40px; } }

    /* 图片灯箱 */
    #lightbox-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); display: none;
      align-items: center; justify-content: center; z-index: 9999; cursor: zoom-out;
    }
    #lightbox-overlay img { max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
    .post-content img[data-lightbox] { cursor: zoom-in; }

    /* 上一篇/下一篇导航 */
    .post-nav {
      display: flex; justify-content: space-between; gap: 16px;
      margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border-color);
    }
    .post-nav-prev, .post-nav-next {
      display: flex; flex-direction: column; gap: 4px;
      padding: 16px 20px; border-radius: var(--radius-sm);
      background: var(--bg-card); border: 1px solid var(--border-color);
      transition: all 0.2s; max-width: 48%;
    }
    .post-nav-next { text-align: right; margin-left: auto; }
    .post-nav-prev:hover, .post-nav-next:hover { border-color: var(--accent); background: var(--accent-light); }
    .post-nav-label { font-size: 0.78em; color: var(--text-muted); }
    .post-nav-title { font-size: 0.95em; font-weight: 500; color: var(--text-primary); }
    .post-nav-placeholder { flex: 1; }

    /* 相关文章推荐 */
    .related-posts { margin-top: 48px; }
    .related-posts-title { font-size: 1.2em; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); }
    .related-posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .related-post-card { padding: 16px 20px; border-radius: var(--radius-sm); background: var(--bg-card); border: 1px solid var(--border-color); transition: all 0.2s; }
    .related-post-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .related-post-card h4 { font-size: 0.95em; font-weight: 500; margin-bottom: 6px; }
    .related-post-card h4 a { color: var(--text-primary); }
    .related-post-card h4 a:hover { color: var(--accent); }
    .related-post-card .related-date { font-size: 0.78em; color: var(--text-muted); }

    /* Related posts (single-file mode) */
    .related-posts{margin:32px 0;padding:24px 0;border-top:1px solid var(--border-color,rgba(128,128,128,0.2))}
    .related-title{font-size:1.1em;font-weight:600;margin-bottom:16px;color:var(--text-primary,#333)}
    .related-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
    .related-card{display:block;padding:16px;border-radius:8px;background:var(--bg-card,rgba(128,128,128,0.05));border:1px solid var(--border-color,rgba(128,128,128,0.2));text-decoration:none;transition:all 0.2s}
    .related-card:hover{border-color:var(--accent,#e74c3c);transform:translateY(-2px)}
    .related-card-title{font-size:0.95em;font-weight:500;color:var(--text-primary,#333);margin-bottom:8px}
    .related-card-meta{display:flex;align-items:center;gap:8px;font-size:0.8em;color:var(--text-muted,#888)}
    .related-tag{padding:2px 8px;border-radius:10px;background:var(--accent-light,rgba(231,76,60,0.08));color:var(--accent,#e74c3c);font-size:0.85em}

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

    /* 面包屑导航 */
    .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 0.85em; color: var(--text-muted); margin-bottom: 24px; flex-wrap: wrap; }
    .breadcrumb a { color: var(--text-secondary); }
    .breadcrumb a:hover { color: var(--accent); }
    .breadcrumb-sep { opacity: 0.5; }
    .breadcrumb-current { color: var(--text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }

    /* 置顶文章标识 */
    .pinned-badge {
      display: inline-block; font-size: 0.72em; padding: 2px 10px;
      border-radius: 4px; background: var(--accent); color: #fff;
      margin-bottom: 8px; font-weight: 600; letter-spacing: 0.03em;
    }
    .post-card-pinned { border-color: var(--accent); border-width: 2px; }

    /* 打赏功能 */
    .reward-section { text-align: center; margin-top: 48px; padding: 32px 24px; border-top: 1px solid var(--border-color); }
    .reward-title { font-size: 1.05em; font-weight: 600; color: var(--text-primary); margin-bottom: 20px; }
    .reward-qrcodes { display: flex; justify-content: center; gap: 32px; flex-wrap: wrap; }
    .reward-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .reward-item img { width: 140px; height: 140px; object-fit: contain; border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
    .reward-item span { font-size: 0.85em; color: var(--text-muted); }

    /* 文章赞/踩 */
    .vote-section { display: flex; justify-content: center; align-items: center; gap: 24px; margin-top: 32px; padding: 24px 0; border-top: 1px solid var(--border-color); }
    .vote-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: none; border: 2px solid var(--border-color);
      border-radius: 24px; padding: 8px 18px; cursor: pointer;
      transition: all 0.25s ease; font-size: 14px; color: #888;
    }
    .vote-btn:hover { border-color: var(--accent); background: var(--accent-light); transform: scale(1.05); }
    .vote-btn:active { transform: scale(0.95); }
    .vote-btn.active.vote-up { border-color: #22c55e; background: rgba(34,197,94,0.1); color: #22c55e; }
    .vote-btn.active.vote-down { border-color: #ef4444; background: rgba(239,68,68,0.1); color: #ef4444; }
    .vote-icon { font-size: 18px; line-height: 1; }
    .vote-count { font-weight: 600; min-width: 12px; text-align: center; }

    /* 友情链接页 */
    .friend-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .friend-link-card {
      display: flex; align-items: center; gap: 16px; padding: 20px 24px;
      border-radius: var(--radius); background: var(--bg-card);
      border: 1px solid var(--border-color); transition: all 0.25s;
    }
    .friend-link-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .friend-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .friend-info strong { font-size: 1em; color: var(--text-primary); }
    .friend-info p { font-size: 0.85em; color: var(--text-muted); margin-top: 4px; }

    /* 关于页面 */
    .about-page { text-align: center; }
    .about-avatar { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 24px; object-fit: cover; border: 3px solid var(--accent); }
    .about-bio { font-size: 1.05em; color: var(--text-secondary); line-height: 1.8; max-width: 600px; margin: 0 auto 32px; }
    .about-skills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 32px; }
    .about-skill-tag { padding: 6px 16px; border-radius: 20px; background: var(--accent-light); color: var(--accent); font-size: 0.85em; font-weight: 500; }
    .about-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
    .about-contact a { padding: 8px 20px; border-radius: 20px; background: var(--bg-card); border: 1px solid var(--border-color); font-size: 0.9em; color: var(--text-secondary); transition: all 0.2s; }
    .about-contact a:hover { border-color: var(--accent); color: var(--accent); }

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
    .breadcrumb a:hover{color:var(--accent)}
    .breadcrumb-current{color:var(--text-primary,#333)}

    /* TOC scroll spy active state */
    .toc-link.active{color:var(--accent);font-weight:600}

    /* Page transition animation */
    @keyframes pageFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

    @media (max-width: 640px) {
      .header-inner { flex-direction: column; gap: 12px; }
      .hero-section h2 { font-size: 1.5em; }
      .post-card { padding: 18px 20px; }
      .post-header h1 { font-size: 1.5em; }
      .archive-item { flex-direction: column; gap: 4px; }
      .archive-item .date { min-width: auto; }
    }
  `
}
