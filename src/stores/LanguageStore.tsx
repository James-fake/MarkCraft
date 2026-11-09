import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Language } from '../locales'
import { zh } from '../locales/zh'
import { en } from '../locales/en'

const translationsMap: Record<Language, typeof zh> = { zh, en }

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: typeof zh
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'zh',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: zh,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('markcraft-language')
    if (saved === 'en' || saved === 'zh') return saved
    // 首次运行：跟随系统语言（中文系统→中文，其他→英文），用户可在设置/引导中改
    const nav = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : ''
    return nav.startsWith('zh') ? 'zh' : 'en'
  })

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('markcraft-language', lang)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => {
      const next = prev === 'zh' ? 'en' : 'zh'
      localStorage.setItem('markcraft-language', next)
      return next
    })
  }, [])

  const t = translationsMap[language]

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
