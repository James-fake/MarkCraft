/**
 * 博客工作室「主题市场」文案排版契约测试
 * ------------------------------------------------------------
 * 事故背景（2026-09-14 用户截图报障）：主题市场里「文字乱七八糟，不够统一」——
 *  1）卡片名称行「赛博朋克 Cyberpunk」在两列窄卡里被 CJK 逐字断行成「赛博朋 克」+「Cyberpunk」交错；
 *  2）描述单行截断丢字严重（「学术论文风格，严…」），每张卡截的位置各不相同；
 *  3）卡片 tag 直接渲染英文 key（academic / typography / fullwidth…），与筛选行的中文 chip 割裂；
 *     其中 fullwidth/illustration 连真层 THEME_STYLE_TAGS 都没有中文名（数据源缺项，两层都回退英文）；
 *  4）分类行与风格行是两组一模一样的 pill 挤在一起，没有分组标识，语义不明。
 *
 * 修复（本测试锁死，防回归）：
 *  - 数据源 useBlogGenerator.THEME_STYLE_TAGS 补齐 fullwidth→通栏、illustration→插画（单一数据源，两层共用）；
 *  - 卡片 tag 经 tagLabel() 映射为中文（与真层 ThemePanel.getTagLabel 同一映射语义）；
 *  - 名称行中/英名各自 nowrap 成不可拆的词，容器 flex-wrap 放不下时英文名整词掉行；
 *  - 描述两行截取（-webkit-line-clamp:2）+ min-height 锁两行，网格行高齐平；
 *  - 两组筛选行首加「分类/风格」分组微标签；
 *  - 2026-09-14 晚追加：分类/风格两组筛选由整排 chip 点选改为 AuroraSelect 滚轮鼓单选
 *    （与设置页功能选项同一套交互），风格状态从 string[] 多选收敛为单值字符串。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, '../../styles/panels/blog.css'), 'utf-8')
// 🧩 P2-3（2026-09-28）BlogPanel 拆分后，主题市场的渲染体在 settingPanels.tsx、
//    常量/数据源在 blogStudioModel.ts、宿主编排在 BlogPanel.tsx ——
//    本契约断言的是「实现语义」而非「文件位置」，故扫描面 = 拆分后全部子模块拼接。
const tsx = ['BlogPanel.tsx', 'settingPanels.tsx', 'blogStudioModel.ts', 'studioAtoms.tsx', 'deployPanels.tsx']
  .map((f) => readFileSync(resolve(__dirname, f), 'utf-8'))
  .join('\n')
const gen = readFileSync(resolve(__dirname, '../../../features/blog/hooks/useBlogGenerator.ts'), 'utf-8')

const rule = (selector: string) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${esc}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

describe('主题市场 · 名称行（词不拆，整词换行）', () => {
  it('中文名 b 禁止单词内断行（white-space: nowrap）', () => {
    expect(rule('.aurora-blog-theme__name b')).toMatch(/white-space:\s*nowrap/)
  })

  it('英文名 span 同样 nowrap（作为整词参与换行，不再被截断成两截）', () => {
    expect(rule('.aurora-blog-theme__name span')).toMatch(/white-space:\s*nowrap/)
  })

  it('名称容器允许整体换行（flex-wrap: wrap）——放不下时英文名整词掉到第二行', () => {
    expect(rule('.aurora-blog-theme__name')).toMatch(/flex-wrap:\s*wrap/)
  })
})

describe('主题市场 · 描述（两行截取替代单行省略）', () => {
  it('desc 使用 -webkit-line-clamp 两行截取', () => {
    const r = rule('.aurora-blog-theme__desc')
    expect(r).toMatch(/-webkit-line-clamp:\s*2/)
    expect(r).toMatch(/-webkit-box-orient:\s*vertical/)
  })

  it('desc 不再是单行 nowrap 省略（旧写法会在窄卡里一截了之）', () => {
    expect(rule('.aurora-blog-theme__desc')).not.toMatch(/white-space:\s*nowrap/)
  })

  it('desc min-height 锁两行，描述短的主题卡不塌高', () => {
    expect(rule('.aurora-blog-theme__desc')).toMatch(/min-height:\s*calc\(/)
  })
})

describe('主题市场 · 卡片 tag 中文映射（单一数据源）', () => {
  it('数据源 THEME_STYLE_TAGS 补齐 fullwidth→通栏、illustration→插画（此前两层 UI 均回退英文 key）', () => {
    expect(gen).toMatch(/key:\s*'fullwidth',\s*zh:\s*'通栏'/)
    expect(gen).toMatch(/key:\s*'illustration',\s*zh:\s*'插画'/)
  })

  it('卡片 tag 不再直接渲染 key，必须经 tagLabel() 映射', () => {
    expect(tsx).toMatch(/tagLabel\(tg\)/)
    expect(tsx).not.toMatch(/<em key=\{tg\}>\{tg\}<\/em>/)
  })

  it('tagLabel 回退语义与真层 getTagLabel 一致（映射不到时显示原 key，不抛错）', () => {
    expect(tsx).toMatch(/tagLabel = \(tg: string\) => THEME_STYLE_TAGS\.find\(\(t\) => t\.value === tg\)\?\.label \?\? tg/)
  })
})

describe('主题市场 · 筛选分组标识', () => {
  it('分类行与风格行行首各有「分类」「风格」分组微标签', () => {
    expect(tsx).toMatch(/aurora-blog-chipgroup__label">分类</)
    expect(tsx).toMatch(/aurora-blog-chipgroup__label">风格</)
  })

  it('分组微标签有样式定义且与选择器触发器同高对齐（height: 28px）', () => {
    const r = rule('.aurora-blog-chipgroup__label')
    expect(r).toMatch(/height:\s*28px/)
    expect(r).toMatch(/font-size:\s*var\(--mc-font-xs\)/)
  })
})

describe('主题市场 · 筛选改滚轮鼓选择（与设置页 AuroraSelect 同一套交互）', () => {
  it('分类行与风格行均使用 AuroraSelect 滚轮鼓选择器（替代整排 chip 点选）', () => {
    expect(tsx).toMatch(/aurora-blog-chipgroup__label">分类<\/span>\s*\n\s*<AuroraSelect/)
    expect(tsx).toMatch(/aurora-blog-chipgroup__label">风格<\/span>\s*\n\s*<AuroraSelect/)
  })

  it('筛选行不再夹带 StudioChip（chip 仅保留给文档列表全选/全不选等非筛选场景）', () => {
    expect(tsx).not.toMatch(
      /chipgroup__label">分类<\/span>[\s\S]{0,400}?StudioChip[\s\S]{0,400}?chipgroup__label">风格/,
    )
  })

  it('风格为滚轮单选：状态从 string[] 收敛为单值字符串（空串 = 全部），多选 toggleTag 已删除', () => {
    expect(tsx).toMatch(/const \[tag, setTag\] = useState\(''\)/)
    expect(tsx).not.toMatch(/toggleTag/)
    expect(tsx).not.toMatch(/const \[tags, setTags\]/)
  })

  it('风格滚轮选项头部补「全部」，其后展开单一数据源 THEME_STYLE_TAGS', () => {
    expect(tsx).toMatch(/value: '',\s*label: '全部'/)
    expect(tsx).toMatch(/THEME_STYLE_FILTER_OPTIONS[\s\S]{0,200}\.\.\.THEME_STYLE_TAGS/)
  })

  it('过滤逻辑随单选收敛：未选风格（空串）放行全部，否则命中当前风格', () => {
    expect(tsx).toMatch(/!tag \|\| t\.tags\.includes\(tag\)/)
  })

  it('分类滚轮沿用单一数据源 THEME_CATEGORIES（内含「全部」选项，value=all）', () => {
    expect(tsx).toMatch(/<AuroraSelect value=\{cat\} options=\{THEME_CATEGORIES\}/)
    expect(gen).toMatch(/key: 'all',\s*zh: '全部'/)
  })
})

describe('主题市场 · 筛选行宽 + 搜索框滚动显现', () => {
  it('两个滚轮触发器拉满行宽（flex:1），右缘与下方卡片网格对齐', () => {
    // 复合选择器带 selector list，rule() 单选择器匹配不中，这里直接截取规则体
    const body = css.match(/\.aurora-blog-tabs \.aurora-select--custom[\s\S]*?\{([\s\S]*?)\}/)?.[1] ?? ''
    expect(body).toMatch(/flex:\s*1\s+1\s+auto/)
    expect(body).toMatch(/min-width:\s*0/)
    expect(tsx).toMatch(/chipgroup__label">分类<\/span>\s*\n\s*<AuroraSelect/)
  })

  it('搜索框常驻 DOM（不条件渲染），初始收起 + is-hidden 类折叠 + 已输入查询时保持可见', () => {
    // 条件渲染是闪烁根因：挂载/卸载令滚动区高度跳变 → 钳制伪滚动 → 自激振荡
    expect(tsx).toMatch(/const \[searchVisible, setSearchVisible\] = useState\(false\)/)
    expect(tsx).not.toMatch(/\{searchVisible && \(\s*\n\s*<div className="aurora-blog-search">/)
    expect(tsx).toMatch(/className=\{`aurora-blog-search \$\{searchVisible \|\| query\.trim\(\) \? '' : 'is-hidden'\}`\}/)
    expect(tsx).toMatch(/tabIndex=\{searchVisible \|\| query\.trim\(\) \? 0 : -1\}/)
  })

  it('回顶显示判据（用户定稿：刚进入不显示，滚回顶端才现身）：hasLeftTop 标志区分初始顶端与回顶动作', () => {
    expect(tsx).toMatch(/const SEARCH_TOP_SHOW = 2/)
    expect(tsx).toMatch(/const SEARCH_TOP_HIDE = 12/)
    // 越过 HIDE 才置位「离开过顶端」；收起态回顶（≤SHOW）且 hasLeftTop 才显示
    expect(tsx).toMatch(/if \(st > SEARCH_TOP_HIDE\) hasLeftTopRef\.current = true/)
    expect(tsx).toMatch(/searchVisibleRef\.current \? st <= SEARCH_TOP_HIDE : st <= SEARCH_TOP_SHOW && hasLeftTopRef\.current/)
    expect(tsx).toMatch(/if \(next !== searchVisibleRef\.current\)/)
    // 方向状态机的累计/锁定机制已退役
    expect(tsx).not.toMatch(/SEARCH_MARKET_SCROLL_HYST|SEARCH_MARKET_FLIP_LOCKOUT_MS|lockUntilRef|pendingRef/)
  })

  it('展开锚定双跑（清动画伪状态）：panelOpen 展开时归顶端 + 重置收起初始态 + SETTLE 后再锚定一次', () => {
    expect(tsx).toMatch(/const SEARCH_SETTLE_MS = 500/)
    expect(tsx).toMatch(/panelOpen: boolean/)
    expect(tsx).toMatch(/useEffect\(\(\) => \{\s*\n\s*if \(!panelOpen\) return/)
    expect(tsx).toMatch(/if \(scroller\) scroller\.scrollTop = 0/)
    expect(tsx).toMatch(/hasLeftTopRef\.current = false/)
    expect(tsx).toMatch(/window\.setTimeout\(anchor, SEARCH_SETTLE_MS\)/)
    expect(tsx).toMatch(/window\.clearTimeout\(timer\)/)
    // BlogPanel 把浮层开关传给样式面板
    expect(tsx).toMatch(/<StylePanel cfg=\{cfg\} setCfg=\{setCfg\} panelOpen=\{panelOpen\} \/>/)
  })

  it('搜索框在滚动容器外（FileTree 同构）：折叠/展开不触碰滚动区内容高度，sticky 方案已退役', () => {
    expect(tsx).toMatch(/<div className="aurora-blog-market">/)
    expect(tsx).toMatch(/className="aurora-blog-panel__scroll"/)
    expect(tsx).not.toMatch(/aurora-blog-panel__scroll--market/)
    expect(css).toMatch(/\.aurora-blog-market \{[^}]*height:\s*100%/)
    expect(css).toMatch(/\.aurora-blog-market \.aurora-blog-panel__scroll \{[^}]*flex:\s*1/)
    const search = css.match(/\.aurora-blog-search\s*\{[\s\S]*?\}/)?.[0] ?? ''
    expect(search).toMatch(/max-height:\s*44px/)
    expect(search).toMatch(/transition:[\s\S]*max-height/)
    expect(search).not.toMatch(/position:\s*sticky/)
    expect(css).toMatch(/\.aurora-blog-search\.is-hidden\s*\{[^}]*max-height:\s*0/)
  })
})
