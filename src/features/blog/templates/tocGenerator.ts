export interface TocItem {
  id: string
  text: string
  level: number
}

export function generateToc(htmlContent: string): TocItem[] {
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi
  const items: TocItem[] = []
  const usedIds = new Set<string>()

  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const level = parseInt(match[1])
    const text = match[2].replace(/<[^>]*>/g, '').trim()
    let id = slugifyForId(text)
    let counter = 1
    while (usedIds.has(id)) { id = `${slugifyForId(text)}-${counter}`; counter++ }
    usedIds.add(id)
    items.push({ id, text, level })
  }
  return items
}

export function addHeadingIds(htmlContent: string): string {
  const headingRegex = /<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/gi
  const usedIds = new Set<string>()

  return htmlContent.replace(headingRegex, (match, level, attrs, content) => {
    if (/id=/.test(attrs)) return match
    const text = content.replace(/<[^>]*>/g, '').trim()
    let id = slugifyForId(text)
    let counter = 1
    while (usedIds.has(id)) { id = `${slugifyForId(text)}-${counter}`; counter++ }
    usedIds.add(id)
    return `<h${level} id="${id}"${attrs}>${content}</h${level}>`
  })
}

function slugifyForId(text: string): string {
  return text.toLowerCase().replace(/[^\w\s\u4e00-\u9fff-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'heading'
}

export function generateTocHtml(items: TocItem[]): string {
  if (items.length === 0) return ''
  const minLevel = Math.min(...items.map(i => i.level))
  const links = items.map(item => {
    const indent = (item.level - minLevel) * 16
    return `<a href="#${item.id}" class="toc-link" style="padding-left: ${indent + 12}px">${item.text}</a>`
  }).join('\n')
  return `<nav class="toc"><div class="toc-title">目录</div>${links}</nav>`
}

export function getTocStyles(): string {
  return `
    .post-layout { display: grid; grid-template-columns: 1fr 220px; gap: 32px; align-items: start; }
    .toc { position: sticky; top: 80px; max-height: calc(100vh - 100px); overflow-y: auto; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.88em; line-height: 1.6; }
    .toc-title { font-weight: 600; margin-bottom: 10px; color: var(--text-primary); font-size: 0.95em; }
    .toc-link { display: block; padding: 4px 12px; color: var(--text-secondary); border-radius: 6px; transition: all 0.15s; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .toc-link:hover { color: var(--accent); background: var(--accent-light); }
    .toc-link.active { color: var(--accent); font-weight: 500; }
    @media (max-width: 1024px) { .post-layout { grid-template-columns: 1fr; } .toc { display: none; } }
  `
}

export function getTocScript(): string {
  return `<script>(function(){var links=document.querySelectorAll('.toc-link');var headings=[];links.forEach(function(link){var id=link.getAttribute('href').slice(1);var el=document.getElementById(id);if(el)headings.push({el:el,link:link});});if(!headings.length)return;function update(){var scrollY=window.scrollY+100;var current=headings[0];for(var i=0;i<headings.length;i++){if(headings[i].el.offsetTop<=scrollY)current=headings[i];}links.forEach(function(l){l.classList.remove('active');});if(current)current.link.classList.add('active');}window.addEventListener('scroll',update,{passive:true});update();var toc=document.querySelector('.toc');if(toc){toc.addEventListener('wheel',function(e){var delta=e.deltaY;var up=toc.scrollTop>0;var down=toc.scrollTop+toc.clientHeight<toc.scrollHeight;if((delta<0&&up)||(delta>0&&down)){e.preventDefault();toc.scrollTop+=delta;}},{passive:false});}})();</script>`
}
