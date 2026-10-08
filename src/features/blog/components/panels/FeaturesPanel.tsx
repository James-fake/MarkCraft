import { useState } from 'react'
import { PanelProps, useLabels } from './shared'
import { SectionLabel, StudioInput, StudioChip, useStudioTheme } from '../StudioControls'
import { useToast } from '@components/ui/ToastProvider'
import { platform } from '@platform'
import { useDensity, scaleGap } from '@hooks/useDensity'
import type { RewardConfig, FriendLink, AboutConfig, SeriesConfig } from '../../templates'

interface FeaturesPanelProps extends PanelProps {
}

export function FeaturesPanel({ designConfig, handleDesignChange }: FeaturesPanelProps) {
  const { t } = useLabels()
  const { isDark } = useStudioTheme()
  const d = isDark
  const density = useDensity()
  const panelGap = scaleGap(16, density)
  const toast = useToast()
  
  const [addingFriend, setAddingFriend] = useState(false)
  const [newFriend, setNewFriend] = useState<FriendLink>({ name: '', url: '' })
  
  // 系列文章管理
  const [addingSeries, setAddingSeries] = useState(false)
  const [newSeries, setNewSeries] = useState<SeriesConfig>({ name: '', slug: '' })

  const toggleReward = () => {
    const reward = designConfig.reward as RewardConfig | undefined
    const current = reward?.enable || false
    handleDesignChange('reward', { enable: !current, wechatQrcode: reward?.wechatQrcode, alipayQrcode: reward?.alipayQrcode, title: reward?.title })
  }

  const updateRewardField = (key: keyof RewardConfig, value: unknown) => {
    const reward = designConfig.reward as RewardConfig | undefined
    handleDesignChange('reward', { ...reward!, [key]: value } as RewardConfig)
  }

  const toggleAbout = () => {
    const about = designConfig.aboutConfig as AboutConfig | undefined
    const current = about?.enable || false
    handleDesignChange('aboutConfig', { enable: !current, avatar: about?.avatar, bio: about?.bio, skills: about?.skills, contact: about?.contact })
  }

  const updateAboutField = (key: keyof AboutConfig, value: unknown) => {
    const about = designConfig.aboutConfig as AboutConfig | undefined
    handleDesignChange('aboutConfig', { ...about!, [key]: value } as AboutConfig)
  }

  const addFriendLink = () => {
    if (!newFriend.name || !newFriend.url) return
    const currentLinks = (designConfig.friendLinks || []) as FriendLink[]
    handleDesignChange('friendLinks', [...currentLinks, { ...newFriend }])
    setNewFriend({ name: '', url: '' })
    setAddingFriend(false)
  }

  const removeFriendLink = (index: number) => {
    const currentLinks = (designConfig.friendLinks || []) as FriendLink[]
    const newLinks = currentLinks.filter((_, i) => i !== index)
    handleDesignChange('friendLinks', newLinks)
  }

  // 系列文章管理函数
  const addSeries = () => {
    if (!newSeries.name) return
    const slug = newSeries.slug || newSeries.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const currentSeries = (designConfig.seriesConfig || []) as SeriesConfig[]
    handleDesignChange('seriesConfig', [...currentSeries, { ...newSeries, slug }])
    setNewSeries({ name: '', slug: '' })
    setAddingSeries(false)
  }

  const removeSeries = (index: number) => {
    const currentSeries = (designConfig.seriesConfig || []) as SeriesConfig[]
    const newSeriesList = currentSeries.filter((_, i) => i !== index)
    handleDesignChange('seriesConfig', newSeriesList)
  }

  const cardBorder = d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)'
  const cardBg = d ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)'
  const toggleBorderActive = '2px solid rgba(167,139,250,0.6)'
  const toggleBorderInactive = d ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.12)'
  const toggleBgActive = 'rgba(167,139,250,0.1)'
  const toggleTextActive = d ? '#e4e4e7' : '#1a1a1a'
  const toggleTextInactive = d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.55)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: panelGap }}>
      <div>
        <SectionLabel>{t.blogStudio.articleFeatures}</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button
            onClick={() => handleDesignChange('enableBusuanzi', !designConfig.enableBusuanzi)}
            style={{
              flex: '1 1 auto', padding: '8px 12px', fontSize: 11, fontWeight: 500,
              border: designConfig.enableBusuanzi ? toggleBorderActive : toggleBorderInactive,
              borderRadius: 8, cursor: 'pointer',
              backgroundColor: designConfig.enableBusuanzi ? toggleBgActive : cardBg,
              color: designConfig.enableBusuanzi ? toggleTextActive : toggleTextInactive,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            👁️ {t.blogStudio.viewsCount}
          </button>
          <button
            onClick={() => handleDesignChange('enableApplause', !designConfig.enableApplause)}
            style={{
              flex: '1 1 auto', padding: '8px 12px', fontSize: 11, fontWeight: 500,
              border: designConfig.enableApplause ? toggleBorderActive : toggleBorderInactive,
              borderRadius: 8, cursor: 'pointer',
              backgroundColor: designConfig.enableApplause ? toggleBgActive : cardBg,
              color: designConfig.enableApplause ? toggleTextActive : toggleTextInactive,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            👏 {t.blogStudio.applause}
          </button>
          <button
            onClick={() => handleDesignChange('enablePwa', !designConfig.enablePwa)}
            style={{
              flex: '1 1 auto', padding: '8px 12px', fontSize: 11, fontWeight: 500,
              border: designConfig.enablePwa ? toggleBorderActive : toggleBorderInactive,
              borderRadius: 8, cursor: 'pointer',
              backgroundColor: designConfig.enablePwa ? toggleBgActive : cardBg,
              color: designConfig.enablePwa ? toggleTextActive : toggleTextInactive,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            📱 PWA
          </button>
        </div>
      </div>

      <div>
        <SectionLabel>{t.blogStudio.reward}</SectionLabel>
        <div style={{ border: `1px solid ${cardBorder}`, borderRadius: 10, background: cardBg, padding: 12 }}>
          <button
            onClick={toggleReward}
            style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 500,
              border: ((designConfig.reward as RewardConfig | undefined)?.enable) ? toggleBorderActive : toggleBorderInactive,
              borderRadius: 6, cursor: 'pointer', width: 'fit-content',
              backgroundColor: ((designConfig.reward as RewardConfig | undefined)?.enable) ? toggleBgActive : 'transparent',
              color: ((designConfig.reward as RewardConfig | undefined)?.enable) ? toggleTextActive : toggleTextInactive,
              fontFamily: "'Inter', sans-serif",
              marginBottom: 10,
            }}
          >
            {(designConfig.reward as RewardConfig | undefined)?.enable ? '✅ ' + t.blogStudio.enabled : t.blogStudio.enableReward}
          </button>
          {(designConfig.reward as RewardConfig | undefined)?.enable && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <StudioInput
                value={(designConfig.reward as RewardConfig | undefined)?.title || ''}
                onChange={(v) => updateRewardField('title', v)}
                placeholder={t.blogStudio.rewardTitle}
              />
              <StudioInput
                value={(designConfig.reward as RewardConfig | undefined)?.wechatQrcode || ''}
                onChange={(v) => updateRewardField('wechatQrcode', v)}
                placeholder={t.blogStudio.wechatQrcode}
              />
              <StudioInput
                value={(designConfig.reward as RewardConfig | undefined)?.alipayQrcode || ''}
                onChange={(v) => updateRewardField('alipayQrcode', v)}
                placeholder={t.blogStudio.alipayQrcode}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionLabel>{t.blogStudio.aboutPage}</SectionLabel>
        <div style={{ border: `1px solid ${cardBorder}`, borderRadius: 10, background: cardBg, padding: 12 }}>
          <button
            onClick={toggleAbout}
            style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 500,
              border: ((designConfig.aboutConfig as AboutConfig | undefined)?.enable) ? toggleBorderActive : toggleBorderInactive,
              borderRadius: 6, cursor: 'pointer', width: 'fit-content',
              backgroundColor: ((designConfig.aboutConfig as AboutConfig | undefined)?.enable) ? toggleBgActive : 'transparent',
              color: ((designConfig.aboutConfig as AboutConfig | undefined)?.enable) ? toggleTextActive : toggleTextInactive,
              fontFamily: "'Inter', sans-serif",
              marginBottom: 10,
            }}
          >
            {(designConfig.aboutConfig as AboutConfig | undefined)?.enable ? '✅ ' + t.blogStudio.enabled : t.blogStudio.enableAbout}
          </button>
          {(designConfig.aboutConfig as AboutConfig | undefined)?.enable && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <StudioInput
                value={(designConfig.aboutConfig as AboutConfig | undefined)?.avatar || ''}
                onChange={(v) => updateAboutField('avatar', v)}
                placeholder={t.blogStudio.avatarUrl}
              />
              <textarea
                value={(designConfig.aboutConfig as AboutConfig | undefined)?.bio || ''}
                onChange={(e) => updateAboutField('bio', e.target.value)}
                placeholder={t.blogStudio.bio}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 12,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 6,
                  backgroundColor: d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  color: d ? '#e4e4e7' : '#1a1a1a',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                  resize: 'vertical',
                }}
              />
              <div>
                <label style={{ fontSize: 10, opacity: d ? 0.5 : 0.6, marginBottom: 4, display: 'block' }}>
                  {t.blogStudio.skills}
                </label>
                <input
                  type="text"
                  value={(designConfig.aboutConfig as AboutConfig | undefined)?.skills?.join(', ') || ''}
                  onChange={(e) => updateAboutField('skills', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  placeholder="JavaScript, React, TypeScript"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 12,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 6,
                    backgroundColor: d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    color: d ? '#e4e4e7' : '#1a1a1a',
                    outline: 'none',
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, opacity: d ? 0.5 : 0.6, marginBottom: 4, display: 'block' }}>
                  {t.blogStudio.contact}
                </label>
                <input
                  type="text"
                  value={(designConfig.aboutConfig as AboutConfig | undefined)?.contact?.map((c: { label: string; url: string }) => `${c.label}:${c.url}`).join('; ') || ''}
                  onChange={(e) => {
                    const contacts = e.target.value.split(';').map((s: string) => s.trim()).filter(Boolean).map((s: string) => {
                      const [label, url] = s.split(':')
                      return { label: label?.trim() || '', url: url?.trim() || '' }
                    })
                    updateAboutField('contact', contacts)
                  }}
                  placeholder="GitHub:https://github.com; Email:xxx@example.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 12,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 6,
                    backgroundColor: d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    color: d ? '#e4e4e7' : '#1a1a1a',
                    outline: 'none',
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionLabel>{t.blogStudio.friendLinks}</SectionLabel>
          <StudioChip label={t.blogStudio.addFriend} onClick={() => setAddingFriend(true)} />
        </div>
        <div style={{ border: `1px solid ${cardBorder}`, borderRadius: 10, background: cardBg, padding: 12 }}>
          {addingFriend && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${cardBorder}` }}>
              <StudioInput
                value={newFriend.name}
                onChange={(v) => setNewFriend(prev => ({ ...prev, name: v }))}
                placeholder={t.blogStudio.friendName}
              />
              <StudioInput
                value={newFriend.url}
                onChange={(v) => setNewFriend(prev => ({ ...prev, url: v }))}
                placeholder={t.blogStudio.friendUrl}
              />
              <StudioInput
                value={newFriend.avatar || ''}
                onChange={(v) => setNewFriend(prev => ({ ...prev, avatar: v }))}
                placeholder={t.blogStudio.friendAvatar}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <StudioChip label={t.blogStudio.confirm} onClick={addFriendLink} />
                <StudioChip label={t.blogStudio.cancel} onClick={() => setAddingFriend(false)} variant="danger" />
              </div>
            </div>
          )}
          {((designConfig.friendLinks as FriendLink[] | undefined)?.length || 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', opacity: d ? 0.3 : 0.4, fontSize: 11 }}>
              {t.blogStudio.noFriendLinks}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(designConfig.friendLinks as FriendLink[] | undefined)?.map((link, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px', border: `1px solid ${cardBorder}`, borderRadius: 6 }}>
                  <img
                    src={link.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>'}
                    alt={link.name}
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/%3E%3C/svg%3E' }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: d ? '#e4e4e7' : '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {link.name}
                    </div>
                    <div style={{ fontSize: 9, opacity: d ? 0.4 : 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {link.url}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFriendLink(index)}
                    style={{
                      width: 22, height: 22, border: 'none', borderRadius: 6,
                      background: d ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
                      color: '#ef4444', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 系列文章 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionLabel>{t.blogStudio.seriesArticles}</SectionLabel>
          <StudioChip label={t.blogStudio.addSeries} onClick={() => setAddingSeries(true)} />
        </div>
        <div style={{ border: `1px solid ${cardBorder}`, borderRadius: 10, background: cardBg, padding: 12 }}>
          {addingSeries && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${cardBorder}` }}>
              <StudioInput
                value={newSeries.name}
                onChange={(v) => setNewSeries(prev => ({ ...prev, name: v }))}
                placeholder={t.blogStudio.seriesName}
              />
              <StudioInput
                value={newSeries.slug}
                onChange={(v) => setNewSeries(prev => ({ ...prev, slug: v }))}
                placeholder={t.blogStudio.seriesSlug}
              />
              <StudioInput
                value={newSeries.description || ''}
                onChange={(v) => setNewSeries(prev => ({ ...prev, description: v }))}
                placeholder={t.blogStudio.seriesDescription}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <StudioChip label={t.blogStudio.confirm} onClick={addSeries} />
                <StudioChip label={t.blogStudio.cancel} onClick={() => setAddingSeries(false)} variant="danger" />
              </div>
            </div>
          )}
          {((designConfig.seriesConfig as SeriesConfig[] | undefined)?.length || 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', opacity: d ? 0.3 : 0.4, fontSize: 11 }}>
              {t.blogStudio.noSeries}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(designConfig.seriesConfig as SeriesConfig[] | undefined)?.map((series, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px', border: `1px solid ${cardBorder}`, borderRadius: 6 }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: d ? '#e4e4e7' : '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📚 {series.name}
                    </div>
                    <div style={{ fontSize: 9, opacity: d ? 0.4 : 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      /{series.slug}
                    </div>
                  </div>
                  <button
                    onClick={() => removeSeries(index)}
                    style={{
                      width: 22, height: 22, border: 'none', borderRadius: 6,
                      background: d ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
                      color: '#ef4444', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 配置导入导出 */}
      <div>
        <SectionLabel>{t.blogStudio.configImportExport}</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const configData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                config: designConfig
              }
              const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' })
              void platform
                .saveBlob(blob, `markcraft-config-${new Date().toISOString().split('T')[0]}.json`)
                .catch(() => {})
            }}
            style={{
              flex: 1, padding: '8px 12px', fontSize: 11, fontWeight: 500,
              border: `1px solid ${cardBorder}`,
              borderRadius: 8, cursor: 'pointer',
              backgroundColor: cardBg,
              color: d ? '#e4e4e7' : '#1a1a1a',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            📤 {t.blogStudio.exportConfig}
          </button>
          <button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json'
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                
                try {
                  const text = await file.text()
                  const data = JSON.parse(text)
                  
                  if (data.version && data.config) {
                    // 导入完整配置
                    const { config } = data
                    
                    // 更新各个配置字段
                    handleDesignChange('siteTitle', config.siteTitle)
                    handleDesignChange('siteDescription', config.siteDescription)
                    handleDesignChange('author', config.author)
                    handleDesignChange('language', config.language)
                    handleDesignChange('layout', config.layout)
                    handleDesignChange('colorScheme', config.colorScheme)
                    handleDesignChange('colorLightness', config.colorLightness)
                    handleDesignChange('colorSaturation', config.colorSaturation)
                    handleDesignChange('colorSharpness', config.colorSharpness)
                    handleDesignChange('customColor', config.customColor)
                    handleDesignChange('theme', config.theme)
                    handleDesignChange('font', config.font)
                    handleDesignChange('themeStyle', config.themeStyle)
                    handleDesignChange('customCss', config.customCss || '')
                    handleDesignChange('customCssDark', config.customCssDark || '')
                    handleDesignChange('enableBusuanzi', config.enableBusuanzi)
                    handleDesignChange('enableApplause', config.enableApplause)
                    handleDesignChange('reward', config.reward)
                    handleDesignChange('friendLinks', config.friendLinks)
                    handleDesignChange('aboutConfig', config.aboutConfig)
                    handleDesignChange('seriesConfig', config.seriesConfig)
                    handleDesignChange('enablePwa', config.enablePwa)
                    
                    toast.show(t.blogStudio.importSuccess, 'success')
                  } else {
                    toast.show(t.blogStudio.invalidConfig, 'info')
                  }
                } catch (err) {
                  toast.show(t.blogStudio.importFailed, 'error')
                }
              }
              input.click()
            }}
            style={{
              flex: 1, padding: '8px 12px', fontSize: 11, fontWeight: 500,
              border: `1px solid ${cardBorder}`,
              borderRadius: 8, cursor: 'pointer',
              backgroundColor: cardBg,
              color: d ? '#e4e4e7' : '#1a1a1a',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease',
            }}
          >
            📥 {t.blogStudio.importConfig}
          </button>
        </div>
      </div>
    </div>
  )
}