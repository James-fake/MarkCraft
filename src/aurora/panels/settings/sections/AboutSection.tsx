import { useCallback, useState } from 'react'
import { Button } from '@components/ui/Button'
import { BrandLogo } from '../../../components/BrandLogo'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'
import { ensureUsageDocsKb } from '@stores/kbSeed'
import { APP_VERSION } from '@features/telemetry/config'
import { PrivacyPolicyModal } from '@features/telemetry/PrivacyPolicyModal'
import { TermsOfServiceModal } from '@features/telemetry/TermsOfServiceModal'
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
// 真实地址（2026-10-09 收尾审查填写）：仓库在 Gitee（= git remote origin）。
// 暂无独立官网 → official 指向仓库主页（真实可点，胜过假域名）。
// ⚠️ 仓库当前**尚无 LICENSE 文件** → license 留空渲染为「即将推出」，不制造 404 死链。
// 隐私政策 / 服务条款为应用内文档（docs/*.md），由下方 docModal 打开，不在此列为外链。
const ABOUT_LINKS: Record<string, string> = {
  official: 'https://gitee.com/James-fake/markcraft',
  feedback: 'https://gitee.com/James-fake/markcraft/issues',
  license: '',
}

function openExternal(url: string) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function AboutSection({
  query,
  toast,
  nav,
  onOpenBrowser,
}: {
  query?: string
  toast?: (msg: string) => void
  nav?: (id: string, param?: string) => void
  /** 在**应用内浏览器视图**打开外链（如 Gitee 仓库 / Issues）；缺省回退 window.open */
  onOpenBrowser?: (url: string) => void
}) {
  const { q, match } = useSettingsQuery(query)
  const { rootFolder, createFolder, createFile, moveNode, updateFileContent } = useFileManager()
  const { t, language } = useLanguage()
  const A = t.settingsAbout
  const [opening, setOpening] = useState(false)
  // 应用内文档弹层：'privacy' = 隐私政策，'terms' = 服务条款；null = 关闭
  const [docModal, setDocModal] = useState<'privacy' | 'terms' | null>(null)

  /** 打开内置使用文档：确保知识库已播种 → 直达该知识库详情页 */
  const openUsageDocs = useCallback(async () => {
    if (opening) return
    setOpening(true)
    try {
      const kbId = await ensureUsageDocsKb({ rootFolder, lang: language, createFolder, createFile, moveNode, updateFileContent })
      if (kbId) {
        nav?.('kb', kbId)
      } else {
        // 已播种过但知识库已被删除：不复活种子，退回知识库列表让用户自行决定
        toast?.(A.docDeleted)
        nav?.('kb')
      }
    } catch (err) {
      toast?.(A.openDocsFailed.replace('{msg}', (err as Error).message))
    } finally {
      setOpening(false)
    }
  }, [opening, rootFolder, language, createFolder, createFile, moveNode, updateFileContent, nav, toast, A.docDeleted, A.openDocsFailed])

  const hasAny = !q || match(A.matchTitle, A.matchKeywords)
  if (!hasAny) return null

  return (
    <div className="aurora-settings__about">
      <BrandLogo size={72} className="aurora-settings__about-logo" />
      <div className="aurora-settings__about-name">MarkCraft</div>
      <div className="aurora-settings__about-version">v{APP_VERSION}</div>

      <div className="aurora-settings__about-actions">
        <Button size="sm" variant="secondary" disabled title={A.noUpdateBackend}>
          {A.checkUpdate}
          <span className="aurora-settings__soon">{A.soon}</span>
        </Button>
        <Button size="sm" variant="ghost" disabled title={A.noChangelogBackend}>
          {A.changelogBtn}
          <span className="aurora-settings__soon">{A.soon}</span>
        </Button>
      </div>

      <div className="aurora-settings__about-section">
        <div className="aurora-settings__about-section-title">{A.thanks}</div>
        <div className="aurora-settings__changelog">
          <div>{A.thanksIntro}</div>
          <div>React · TypeScript · Vite · CodeMirror · KaTeX</div>
          <div>Lucide Icons · Node.js · Electron</div>
        </div>
      </div>

      <div className="aurora-settings__about-section">
        <div className="aurora-settings__about-section-title">{A.links}</div>
        <div className="aurora-settings__about-links">
          {/* 全部用原生 button：隐私政策 / 服务条款等合规入口必须 Tab 可达、Enter/Space 可激活 */}
          <button
            type="button"
            className="aurora-settings__about-link"
            title={A.openKbTitle}
            data-testid="about-usage-docs"
            onClick={() => { void openUsageDocs() }}
          >
            {A.usageDocs}
          </button>
          {([
            { key: 'official', label: A.official },
            { key: 'feedback', label: A.feedback },
            { key: 'privacy', label: A.privacy },
            { key: 'terms', label: A.terms },
            { key: 'license', label: A.license },
          ] as const).map(({ key, label }) => {
            // 隐私政策 / 服务条款：应用内文档弹层（复用产品 Markdown 渲染管线）
            if (key === 'privacy' || key === 'terms') {
              return (
                <button
                  key={key}
                  type="button"
                  className="aurora-settings__about-link"
                  title={A.openInApp}
                  data-testid={`about-${key}`}
                  onClick={() => setDocModal(key)}
                >
                  {label}
                </button>
              )
            }
            const url = ABOUT_LINKS[key]
            const enabled = Boolean(url)
            return (
              <button
                key={key}
                type="button"
                disabled={!enabled}
                aria-disabled={!enabled}
                className={[
                  'aurora-settings__about-link',
                  enabled ? '' : 'aurora-settings__about-link--disabled',
                ].filter(Boolean).join(' ')}
                title={enabled ? (onOpenBrowser ? A.openInApp : A.openNewWindow) : A.soon}
                onClick={() => { if (enabled) (onOpenBrowser ?? openExternal)(url) }}
              >
                {label}
                {!enabled && <span className="aurora-settings__soon">{A.soon}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 应用内文档：隐私政策 / 服务条款（单一事实来源 docs/*.md） */}
      <PrivacyPolicyModal
        isOpen={docModal === 'privacy'}
        onClose={() => setDocModal(null)}
        title={A.privacy}
      />
      <TermsOfServiceModal
        isOpen={docModal === 'terms'}
        onClose={() => setDocModal(null)}
        title={A.terms}
      />
    </div>
  )
}
