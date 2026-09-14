import { BlogConfig } from './types'
import { wrapHtml } from './utils'

export function generateSearchHtml(config: BlogConfig): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const body = `
    <div class="search-container" style="padding-top:40px;">
      <h1 class="page-title">${bl === 'en' ? 'Search' : '搜索'}</h1>
      <p class="page-subtitle">${bl === 'en' ? 'Search all posts' : '搜索所有文章'}</p>
      <div style="margin-top:24px;">
        <input type="text" id="search-input" placeholder="${bl === 'en' ? 'Type to search...' : '输入关键词搜索...'}" autocomplete="off"
          style="width:100%;padding:12px 16px;font-size:16px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);outline:none;font-family:inherit;">
      </div>
      <div id="search-results" style="margin-top:20px;"></div>
    </div>
    <script>
      let searchData = [];
      fetch('search-index.json').then(r => r.json()).then(data => { searchData = data; }).catch(() => {});

      function doSearch(query) {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return searchData.filter(item =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.tags.some(t => t.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
        ).slice(0, 20);
      }

      const input = document.getElementById('search-input');
      const results = document.getElementById('search-results');
      input.addEventListener('input', function() {
        const q = this.value;
        if (!q.trim()) { results.innerHTML = ''; return; }
        const items = doSearch(q);
        results.innerHTML = items.length ? items.map(item =>
          '<a href="posts/' + item.slug + '/index.html" style="display:block;padding:16px;margin-bottom:8px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);text-decoration:none;transition:all 0.2s;">' +
          '<div style="font-weight:600;font-size:1.05em;margin-bottom:4px;">' + item.title + '</div>' +
          '<div style="font-size:0.85em;color:var(--text-muted);">' + item.date + (item.category ? ' · ' + item.category : '') + '</div>' +
          (item.description ? '<div style="font-size:0.9em;color:var(--text-secondary);margin-top:6px;">' + item.description + '</div>' : '') +
          '</a>'
        ).join('') : '<div style="text-align:center;padding:40px;color:var(--text-muted);">${bl === 'en' ? 'No results found' : '未找到相关文章'}</div>';
      });
    </script>
  `
  return wrapHtml(bl === 'en' ? 'Search' : '搜索', body, config)
}
