/* 诊断：知识库 / 白板视图导航后到底渲染了什么（为何 tab 栏缺失） */
(async () => {
  const out = {}
  const goto = async (label) => {
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 600))
      const active = [...document.querySelectorAll('.aurora-sidebar-item--active')].map(e => (e.textContent || '').trim()).join('|')
      if (active.includes(label)) return active
      document.querySelectorAll('.aurora-sidebar-item').forEach(e => {
        if ((e.textContent || '').includes(label)) e.click()
      })
    }
    return [...document.querySelectorAll('.aurora-sidebar-item--active')].map(e => (e.textContent || '').trim()).join('|') || 'NONE'
  }
  for (const label of ['知识库', '白板']) {
    const active = await goto(label)
    await new Promise(r => setTimeout(r, 1200))
    const page = document.querySelector('.aurora-page')
    out[label] = {
      activeSidebar: active,
      pageChildClasses: page ? [...page.children].map(e => e.className) : null,
      hasSubbar: !!document.querySelector('.aurora-kb-subbar, .aurora-csp'),
      classesFound: ['aurora-kb', 'aurora-kb-subbar-tabs', 'aurora-csp', 'aurora-csp__tabs']
        .filter(c => !!document.querySelector('.' + c)),
      headText: page ? (page.textContent || '').replace(/\s+/g, ' ').slice(0, 200) : null,
      bodyClasses: [...document.querySelectorAll('body *')].slice(0, 0).length,
      hasEmptyState: !!document.querySelector('[class*="empty"], [class*="placeholder"]'),
    }
  }
  return out
})()
