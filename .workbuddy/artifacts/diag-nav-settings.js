/* 诊断：JS 合成点击侧栏「设置」后，视图是否真的切过去（一次性排查） */
(async () => {
  const find = () => [...document.querySelectorAll('.aurora-sidebar-item')].find(e => /设置/.test(e.textContent || ''))
  const before = { hash: location.hash, page: (document.querySelector('.aurora-page') || {}).className }
  const el = find()
  el?.click()
  await new Promise(r => setTimeout(r, 1500))
  const page = document.querySelector('.aurora-page')
  return {
    before,
    afterHash: location.hash,
    navTabs: !!document.querySelector('.aurora-settings__nav-tabs'),
    pageClass: page ? page.className : null,
    pageHead: page ? (page.textContent || '').replace(/\s+/g, ' ').slice(0, 160) : null,
    breadcrumb: [...document.querySelectorAll('[class*="breadcrumb"] *')].map(e => (e.textContent || '').trim()).filter(Boolean).slice(0, 6),
    errorBoundary: (() => { const e = document.querySelector('[class*="error"], .aurora-crash'); return e ? (e.textContent || '').slice(0, 300) : null })(),
  }
})()
