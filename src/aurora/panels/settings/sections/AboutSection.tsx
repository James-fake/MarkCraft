import { useCallback, useState } from 'react'
import { Button } from '@components/ui/Button'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'
import { ensureUsageDocsKb } from '@stores/kbSeed'
import { useSettingsQuery } from '../settingsSearch'

/**
 * 关于设置分组
 *
 * 链接准则（杜绝「点击无反应」的死占位）：
 * - **使用文档**：指向应用内置知识库「MarkCraft 使用文档」（播种见 stores/kbSeed.ts），
 *   不再是外链 —— 文档随应用分发，离线可读、可编辑、可双链。
 * - 其它外链：真实可点，经 window.open 打开，地址集中常量 ABOUT_LINKS 便于填写真实值。
 * - 无后端项（检查更新 / 更新日志）：明确 disabled + 「即将推出」，不再弹假 toast。
 */
// TODO(用户填写真实地址)：以下为占位地址（开源仓库形态），替换为 MarkCraft 官网等真实地址即可。
const ABOUT_LINKS: Record<string, string> = {
  official: 'https://github.com/markcraft/markcraft',
  feedback: 'https://github.com/markcraft/markcraft/issues',
  license: 'https://github.com/markcraft/markcraft/blob/main/LICENSE',
  // 暂无真实页面：留空 → 渲染为「即将推出」（不制造假链接）
  privacy: '',
  terms: '',
}

function openExternal(url: string) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function AboutSection({
  query,
  toast,
  nav,
}: {
  query?: string
  toast?: (msg: string) => void
  nav?: (id: string, param?: string) => void
}) {
  const { q, match } = useSettingsQuery(query)
  const { rootFolder, createFolder, createFile, moveNode } = useFileManager()
  const { language } = useLanguage()
  const [opening, setOpening] = useState(false)

  /** 打开内置使用文档：确保知识库已播种 → 直达该知识库详情页 */
  const openUsageDocs = useCallback(async () => {
    if (opening) return
    setOpening(true)
    try {
      const kbId = await ensureUsageDocsKb({ rootFolder, lang: language, createFolder, createFile, moveNode })
      if (kbId) {
        nav?.('kb', kbId)
      } else {
        // 已播种过但知识库已被删除：不复活种子，退回知识库列表让用户自行决定
        toast?.('「MarkCraft 使用文档」已被删除，可在知识库中重新创建')
        nav?.('kb')
      }
    } catch (err) {
      toast?.(`打开使用文档失败：${(err as Error).message}`)
    } finally {
      setOpening(false)
    }
  }, [opening, rootFolder, language, createFolder, createFile, moveNode, nav, toast])

  const hasAny = !q || match('关于 MarkCraft', '版本 更新日志 相关链接 官方网站 文档 反馈 隐私 服务条款 开源许可 致谢')
  if (!hasAny) return null

  return (
    <div className="aurora-settings__about">
      <div className="aurora-settings__about-logo">M</div>
      <div className="aurora-settings__about-name">MarkCraft</div>
      <div className="aurora-settings__about-version">v2.0.0 (Aurora) · 构建 2024.08.23</div>

      <div className="aurora-settings__about-actions">
        <Button size="sm" variant="secondary" disabled title="暂无自动更新后端">
          检查更新
          <span className="aurora-settings__soon">即将推出</span>
        </Button>
        <Button size="sm" variant="ghost" disabled title="暂无更新日志后端">
          更新日志
          <span className="aurora-settings__soon">即将推出</span>
        </Button>
      </div>

      <div className="aurora-settings__about-section">
        <div className="aurora-settings__about-section-title">最近更新</div>
        <div className="aurora-settings__changelog">
          <div><strong>v2.0.0 — Aurora 设计</strong></div>
          <div>• 全新 Aurora 设计语言，带来更精致的视觉体验</div>
          <div>• 支持可折叠侧边栏，空间利用更灵活</div>
          <div>• 新增仪表盘面板，数据一目了然</div>
          <div>• 新增白板功能，自由绘图与思维导图</div>
          <div>• 全面优化的 Markdown 编辑器性能</div>
          <div>• 命令面板快速搜索，效率翻倍</div>
          <div style={{ marginTop: 12 }}><strong>v1.8.0</strong></div>
          <div>• 支持多标签页编辑</div>
          <div>• 新增导出 PDF / Word 格式</div>
          <div>• 修复若干已知问题</div>
        </div>
      </div>

      <div className="aurora-settings__about-section">
        <div className="aurora-settings__about-section-title">致谢</div>
        <div className="aurora-settings__changelog">
          <div>感谢所有开源社区的贡献者，以及以下开源项目：</div>
          <div>React · TypeScript · Vite · CodeMirror · KaTeX</div>
          <div>Lucide Icons · Node.js · Electron</div>
        </div>
      </div>

      <div className="aurora-settings__about-section">
        <div className="aurora-settings__about-section-title">相关链接</div>
        <div className="aurora-settings__about-links">
          <span
            className="aurora-settings__about-link"
            title="在应用内打开内置知识库"
            data-testid="about-usage-docs"
            onClick={() => { void openUsageDocs() }}
          >
            使用文档
          </span>
          {([
            { key: 'official', label: '官方网站' },
            { key: 'feedback', label: '反馈问题' },
            { key: 'privacy', label: '隐私政策' },
            { key: 'terms', label: '服务条款' },
            { key: 'license', label: '开源许可' },
          ] as const).map(({ key, label }) => {
            const url = ABOUT_LINKS[key]
            const enabled = Boolean(url)
            return (
              <span
                key={key}
                className={[
                  'aurora-settings__about-link',
                  enabled ? '' : 'aurora-settings__about-link--disabled',
                ].filter(Boolean).join(' ')}
                title={enabled ? '在新窗口打开' : '即将推出'}
                onClick={() => enabled && openExternal(url)}
              >
                {label}
                {!enabled && <span className="aurora-settings__soon">即将推出</span>}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
