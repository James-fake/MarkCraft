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
    return (saved === 'en' || saved === 'zh') ? saved : 'zh'
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
