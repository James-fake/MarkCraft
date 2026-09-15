/* 诊断：当前视图 / 侧栏结构 / 设置项是否存在（一次性排查，非长期资产） */
(() => {
  const sb = document.querySelector('.aurora-sidebar') || document.querySelector('[class*="sidebar"]')
  const items = [...document.querySelectorAll('.aurora-sidebar-item')].map(e => {
    const r = e.getBoundingClientRect()
    return { t: (e.textContent || '').trim().slice(0, 8), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  return {
    hash: location.hash,
    navTabs: !!document.querySelector('.aurora-settings__nav-tabs'),
    pages: [...document.querySelectorAll('[class*="aurora-page"]')].map(e => e.className).slice(0, 5),
    sidebarClass: sb ? sb.className : null,
    sidebarChildren: sb ? [...sb.querySelectorAll('*')].slice(0, 40).map(e => e.className).filter(Boolean) : [],
    items,
  }
})()
