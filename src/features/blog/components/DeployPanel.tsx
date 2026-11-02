import { useState } from 'react'
import { deployToPages, validateDeployToken } from '../services/deployService'
import type { DeployPlatform, DeployProgress } from '../services/deployService'
import type { BlogGenerationResult } from '../utils/blogMultiFileGenerator'
import type { Translations } from '@src/types/translations'
import { SectionLabel, useStudioTheme } from './StudioControls'

interface DeployPanelProps {
  result: BlogGenerationResult
  t: Translations
}

const PLATFORMS: Array<{ id: DeployPlatform; label: string; icon: string; color: string; colorLight: string; badgeKey?: 'deployGiteeBadge' }> = [
  { id: 'github', label: 'GitHub', icon: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z', color: '#e4e4e7', colorLight: '#333' },
  // Gitee Pages 自 2024-05 起暂停服务（官方 issue I9RGKI）：内容可推送，但站点不会上线 —— 角标明示
  { id: 'gitee', label: 'Gitee', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z', color: '#c71d23', colorLight: '#c71d23', badgeKey: 'deployGiteeBadge' },
  { id: 'vercel', label: 'Vercel', icon: 'M12 2L2 19.5h20L12 2z', color: '#fff', colorLight: '#171717' },
  { id: 'cloudflare', label: 'CF Pages', icon: 'M6.5 4.5c1.5-1 3.5-1.5 5.5-1.5s4 .5 5.5 1.5M3 8c1.5-1.5 4-2.5 9-2.5s7.5 1 9 2.5M4 12c1.5-2 4-3 8-3s6.5 1 8 3', color: '#f48120', colorLight: '#f48120' },
  { id: 'netlify', label: 'Netlify', icon: 'M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z', color: '#00c7b7', colorLight: '#00c7b7' },
]

const TOKEN_HINTS: Record<DeployPlatform, { placeholder: string; hintKey: 'deployTokenHintGithub' | 'deployTokenHintGitee' | 'deployTokenHintVercel' | 'deployTokenHintCloudflare' | 'deployTokenHintNetlify' }> = {
  github: { placeholder: 'ghp_xxxx...', hintKey: 'deployTokenHintGithub' },
  gitee: { placeholder: 'gitee token...', hintKey: 'deployTokenHintGitee' },
  vercel: { placeholder: 'vercel token...', hintKey: 'deployTokenHintVercel' },
  cloudflare: { placeholder: 'cloudflare api token...', hintKey: 'deployTokenHintCloudflare' },
  netlify: { placeholder: 'netlify personal access token...', hintKey: 'deployTokenHintNetlify' },
}

/**
 * 解析部署进度文案：服务层发出的是语言无关的 `messageKey` + 参数，
 * 此处按当前语言解析；无 messageKey（如 error 阶段的原始异常文本）时回退 message。
 */
function resolveProgressMessage(progress: DeployProgress, t: Translations): string {
  if (!progress.messageKey) return progress.message
  const template = (t.blogCss as unknown as Record<string, string>)[progress.messageKey]
  if (!template) return progress.message
  return Object.entries(progress.messageParams || {}).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, v),
    template,
  )
}

/** 解析非致命警告（语言包键 → 文案）；无键或键缺失时返回 null */
function resolveWarning(progress: DeployProgress, t: Translations): string | null {
  if (!progress.warningKey) return null
  return (t.blogCss as unknown as Record<string, string>)[progress.warningKey] ?? null
}

export default function DeployPanel({ result, t }: DeployPanelProps) {
  const { isDark } = useStudioTheme()
  const d = isDark

  const [platform, setPlatform] = useState<DeployPlatform>('github')
  // 安全：部署 PAT 仅驻内存，绝不落 localStorage。
  // （此前明文存 'deploy_token'，叠加博客预览的同源 XSS 即可被注入脚本读取外泄。）
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('')
  const [owner, setOwner] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [progress, setProgress] = useState<DeployProgress | null>(null)
  const [validated, setValidated] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validateError, setValidateError] = useState<string | null>(null)

  const handleValidate = async () => {
    setValidating(true)
    setValidateError(null)
    try {
      const user = await validateDeployToken(platform, token)
      setOwner(user.login)
      setRepo(prev => prev || (
        platform === 'gitee' ? `${user.login}.gitee.io` :
        platform === 'github' ? `${user.login}.github.io` :
        'markcraft-blog'
      ))
      setValidated(true)
      // 不持久化 token（见上）；如需跨会话保留，请走系统钥匙串而非 localStorage。
    } catch (e: unknown) {
      setValidateError(e instanceof Error ? e.message : t.blogCss.deployValidateFailed)
      setValidated(false)
    } finally {
      setValidating(false)
    }
  }

  const handleDeploy = async () => {
    setDeploying(true)
    setProgress({ stage: 'authenticating', message: t.blogCss.deployStart, progress: 0 })
    try {
      await deployToPages(result.files, { platform, token, owner, repo }, setProgress)
    } catch (e: unknown) {
      setProgress({ stage: 'error', message: e instanceof Error ? e.message : t.blogCss.deployFailed, progress: 0 })
    } finally {
      setDeploying(false)
    }
  }

  const progressPercent = progress?.progress ?? 0
  const tokenHint = TOKEN_HINTS[platform]

  return (
    <div>
      {/* 区块标题不带步骤编号：本面板在 Aurora 导出面板中是与「预览与下载」并列的出路，
          不是串行步骤（2026-11-02 去 "Step 3 ·" 前缀——旧编号体系中它被标为第 3 步，
          实际排在第 4 位，且与 Aurora 侧中文「步骤 N」编号体系混排） */}
      <SectionLabel>{t.blogCss.deployStep}</SectionLabel>

      {/* Platform Selector */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 10,
        padding: 3, borderRadius: 10,
        background: d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        border: d ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)',
      }}>
        {PLATFORMS.map(p => {
          const isActive = platform === p.id
          return (
            <button key={p.id}
              onClick={() => { setPlatform(p.id); setValidated(false); setValidateError(null) }}
              style={{
                flex: 1, padding: '6px 4px', border: 'none', borderRadius: 7,
                background: isActive ? 'rgba(250,204,21,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid #fbbf24' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isActive ? (d ? p.color : p.colorLight) : (d ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')} style={{ transition: 'fill 0.2s ease' }}>
                <path d={p.icon} />
              </svg>
              <span style={{
                fontSize: 8, fontWeight: isActive ? 700 : 500,
                color: isActive ? '#fbbf24' : (d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'),
                letterSpacing: '0.02em', transition: 'color 0.2s ease',
              }}>
                {p.label}
              </span>
              {p.badgeKey && (
                <span style={{
                  fontSize: 7, lineHeight: 1.2, fontWeight: 600, letterSpacing: '0.02em',
                  color: d ? 'rgba(248,113,113,0.75)' : 'rgba(220,38,38,0.75)',
                }}>
                  {t.blogCss[p.badgeKey]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Token Input */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          fontSize: 9, fontWeight: 600, color: d ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5,
        }}>
          Personal Access Token
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            borderRadius: 8, overflow: 'hidden',
            border: `1px solid ${validated ? 'rgba(52,211,153,0.2)' : validateError ? 'rgba(239,68,68,0.2)' : (d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)')}`,
            background: validated ? 'rgba(52,211,153,0.03)' : (d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
            transition: 'border-color 0.2s ease, background 0.2s ease',
          }}>
            {/* Status indicator */}
            <div style={{
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {validated ? (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={d ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              )}
            </div>
            <input type="password" value={token}
              onChange={e => { setToken(e.target.value); setValidated(false); setValidateError(null) }}
              placeholder={tokenHint.placeholder}
              style={{
                flex: 1, padding: '7px 8px 7px 0', fontSize: 11,
                border: 'none', background: 'transparent',
                color: d ? '#e4e4e7' : '#1a1a1a', outline: 'none',
                fontFamily: "'Fira Code', 'Consolas', monospace",
                letterSpacing: '0.02em',
              }}
            />
          </div>
          <button onClick={handleValidate} disabled={!token || validating}
            style={{
              padding: '7px 12px', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 8,
              background: token ? 'rgba(250,204,21,0.06)' : (d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
              color: token ? '#fbbf24' : (d ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'),
              cursor: token ? 'pointer' : 'not-allowed',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
              transition: 'all 0.2s ease', whiteSpace: 'nowrap',
            }}
          >
            {validating ? '...' : t.blogCss.deployValidate}
          </button>
        </div>
        {/* Hint */}
        <div style={{
          fontSize: 9, color: d ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)', marginTop: 4,
          paddingLeft: 28,
        }}>
          {t.blogCss[tokenHint.hintKey]}
        </div>
        {/* Validate error */}
        {validateError && (
          <div style={{
            fontSize: 10, color: 'rgba(239,68,68,0.7)', marginTop: 4,
            paddingLeft: 28, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {validateError}
          </div>
        )}
      </div>

      {/* Repo Input (after validation) */}
      {validated && (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 9, fontWeight: 600, color: d ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5,
          }}>
            {t.blogCss.deployRepoName}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center',
            borderRadius: 8, overflow: 'hidden',
            border: d ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.1)',
            background: d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          }}>
            <div style={{
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="rgba(250,204,21,0.5)" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <input type="text" value={repo} onChange={e => setRepo(e.target.value)}
              style={{
                flex: 1, padding: '7px 8px 7px 0', fontSize: 11,
                border: 'none', background: 'transparent',
                color: d ? '#e4e4e7' : '#1a1a1a', outline: 'none',
                fontFamily: "'Fira Code', 'Consolas', monospace",
              }}
            />
          </div>
        </div>
      )}

      {/* Deploy Button */}
      {validated && (
        <button
          onClick={handleDeploy}
          disabled={deploying || !repo}
          style={{
            width: '100%', padding: '11px 16px', border: 'none', borderRadius: 10,
            background: (deploying || !repo)
              ? 'rgba(250,204,21,0.06)'
              : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: (deploying || !repo)
              ? 'rgba(250,204,21,0.3)'
              : '#1a1a1a',
            cursor: (deploying || !repo) ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            boxShadow: (deploying || !repo)
              ? 'none'
              : '0 4px 16px rgba(250,204,21,0.25)',
          }}
          onMouseEnter={(e) => {
            if (deploying || !repo) return
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(250,204,21,0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = (deploying || !repo) ? 'none' : '0 4px 16px rgba(250,204,21,0.25)'
          }}
        >
          {deploying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          )}
          {deploying ? t.blogCss.deployInProgress : t.blogCss.deployButton}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </button>
      )}

      {/* Progress */}
      {progress && (
        <div style={{
          marginTop: 10, borderRadius: 10,
          border: `1px solid ${progress.stage === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(250,204,21,0.1)'}`,
          background: progress.stage === 'error' ? 'rgba(239,68,68,0.03)' : 'rgba(250,204,21,0.03)',
          padding: '10px 12px',
        }}>
          {/* Progress message */}
          <div style={{
            fontSize: 10, fontWeight: 500,
            color: progress.stage === 'error' ? 'rgba(239,68,68,0.7)' : (d ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {progress.stage === 'done' ? (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : progress.stage === 'error' ? (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="rgba(239,68,68,0.7)" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            )}
            {resolveProgressMessage(progress, t)}
          </div>

          {/* Progress bar */}
          {progress.stage !== 'done' && progress.stage !== 'error' && (
            <div style={{
              width: '100%', height: 4, borderRadius: 2,
              background: d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)', overflow: 'hidden',
            }}>
              <div style={{
                width: `${progressPercent}%`, height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}

          {/* Success URL */}
          {progress.stage === 'done' && progress.url && (
            <div style={{
              marginTop: 6, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(52,211,153,0.06)',
              border: '1px solid rgba(52,211,153,0.12)',
            }}>
              <div style={{ fontSize: 9, color: 'rgba(52,211,153,0.5)', marginBottom: 3, fontWeight: 600, letterSpacing: '0.04em' }}>
                {t.blogCss.deploySuccess}
              </div>
              <a href={progress.url} target="_blank" rel="noopener"
                style={{
                  fontSize: 11, color: '#34d399', textDecoration: 'none',
                  fontFamily: "'Fira Code', monospace",
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {progress.url}
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          )}

          {/* 非致命警告：部署已成功，但有环节未达成（如 Pages 未能自动启用） */}
          {progress.stage === 'done' && resolveWarning(progress, t) && (
            <div style={{
              marginTop: 6, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(250,204,21,0.06)',
              border: '1px solid rgba(250,204,21,0.18)',
              fontSize: 10, lineHeight: 1.5, color: 'rgba(250,204,21,0.85)',
              display: 'flex', alignItems: 'flex-start', gap: 5,
            }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{resolveWarning(progress, t)}</span>
            </div>
          )}

          {/* Error message */}
          {progress.stage === 'error' && (
            <div style={{
              fontSize: 10, color: 'rgba(239,68,68,0.7)', lineHeight: 1.5,
            }}>
              {progress.message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
