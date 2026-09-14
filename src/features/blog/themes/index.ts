export type { ThemeIndexData } from './types'
export { escapeHtml } from './types'
export { getInkWashCss, getInkWashIndexHtml } from './inkWash'
export { getTerminalCss, getTerminalIndexHtml } from './terminal'
export { getNewspaperCss, getNewspaperIndexHtml } from './newspaper'
export { getGlassmorphismCss, getGlassmorphismIndexHtml } from './glassmorphism'
export { getBentoCss, getBentoIndexHtml } from './bento'
export { getNarrativeCss, getNarrativeIndexHtml } from './narrative'
export { getCyberpunkCss, getCyberpunkIndexHtml } from './cyberpunk'
export { getAuroraCss, getAuroraIndexHtml } from './aurora'
export { getAcademiaCss, getAcademiaIndexHtml } from './academia'
export { getRetroCss, getRetroIndexHtml } from './retro'
export { getGardenCss, getGardenIndexHtml } from './garden'
export { getMidnightCss, getMidnightIndexHtml } from './midnight'
export { getCustomCss, getCustomIndexHtml } from './custom'

import { getInkWashCss } from './inkWash'
import { getTerminalCss } from './terminal'
import { getNewspaperCss } from './newspaper'
import { getGlassmorphismCss } from './glassmorphism'
import { getBentoCss } from './bento'
import { getNarrativeCss } from './narrative'
import { getCyberpunkCss } from './cyberpunk'
import { getAuroraCss } from './aurora'
import { getAcademiaCss } from './academia'
import { getRetroCss } from './retro'
import { getGardenCss } from './garden'
import { getMidnightCss } from './midnight'
import { getCustomCss } from './custom'
import { getInkWashIndexHtml } from './inkWash'
import { getTerminalIndexHtml } from './terminal'
import { getNewspaperIndexHtml } from './newspaper'
import { getGlassmorphismIndexHtml } from './glassmorphism'
import { getBentoIndexHtml } from './bento'
import { getNarrativeIndexHtml } from './narrative'
import { getCyberpunkIndexHtml } from './cyberpunk'
import { getAuroraIndexHtml } from './aurora'
import { getAcademiaIndexHtml } from './academia'
import { getRetroIndexHtml } from './retro'
import { getGardenIndexHtml } from './garden'
import { getMidnightIndexHtml } from './midnight'
import { getCustomIndexHtml } from './custom'
import {
  getPoetryCss,
  getTypewriterCss,
  getOceanCss,
  getSunsetCss,
  getEditorialCss,
  getTrendingCss,
  getDispatchCss,
  getCarbonCss,
  getBlueprintCss,
  getHackerCss,
  getShowcaseCss,
  getMosaicCss,
  getGalleryCss,
  getCinematicCss,
  getDocsCss,
  getWikiCss,
  getNeonCss,
  getOrigamiCss,
  getSwissCss,
  getBauhausCss,
  getArtdecoCss,
  getZenCss,
  getBrutalistCss,
  getVaporwaveCss,
  getPixelCss,
  getNeumorphismCss,
  getCorporateCss,
  getFashionCss,
  getForestCss,
  getNotionCss,
  getCafeCss,
  getTravelCss,
  getMusicCss,
  getSketchCss,
  getCosmosCss,
  getClaymorphismCss,
  getIceCrystalCss,
  getRamsCss,
  getLuxuryCss,
  getComicCss,
  getSteampunkCss,
  getGothicCss,
  getNoirCss,
  getRecipeCss,
  getTimelineCss,
  getFeedCss,
  getPastelCss,
  getNewsletterCss,
} from './newThemes'
import type { ThemeIndexData } from './types'

export function getThemeStyleCss(themeStyle: string, isDark: boolean): string {
  switch (themeStyle) {
    case 'ink-wash': return getInkWashCss(isDark)
    case 'terminal': return getTerminalCss(isDark)
    case 'newspaper': return getNewspaperCss(isDark)
    case 'glassmorphism': return getGlassmorphismCss(isDark)
    case 'bento': return getBentoCss(isDark)
    case 'narrative': return getNarrativeCss(isDark)
    case 'cyberpunk': return getCyberpunkCss(isDark)
    case 'aurora': return getAuroraCss(isDark)
    case 'academia': return getAcademiaCss(isDark)
    case 'retro': return getRetroCss(isDark)
    case 'garden': return getGardenCss(isDark)
    case 'midnight': return getMidnightCss(isDark)
    case 'custom': return getCustomCss(isDark)
    case 'poetry': return getPoetryCss(isDark)
    case 'typewriter': return getTypewriterCss(isDark)
    case 'ocean': return getOceanCss(isDark)
    case 'sunset': return getSunsetCss(isDark)
    case 'editorial': return getEditorialCss(isDark)
    case 'trending': return getTrendingCss(isDark)
    case 'dispatch': return getDispatchCss(isDark)
    case 'carbon': return getCarbonCss(isDark)
    case 'blueprint': return getBlueprintCss(isDark)
    case 'hacker': return getHackerCss(isDark)
    case 'showcase': return getShowcaseCss(isDark)
    case 'mosaic': return getMosaicCss(isDark)
    case 'gallery': return getGalleryCss(isDark)
    case 'cinematic': return getCinematicCss(isDark)
    case 'docs': return getDocsCss(isDark)
    case 'wiki': return getWikiCss(isDark)
    case 'neon': return getNeonCss(isDark)
    case 'origami': return getOrigamiCss(isDark)
    case 'swiss': return getSwissCss(isDark)
    case 'bauhaus': return getBauhausCss(isDark)
    case 'artdeco': return getArtdecoCss(isDark)
    case 'zen': return getZenCss(isDark)
    case 'brutalist': return getBrutalistCss(isDark)
    case 'vaporwave': return getVaporwaveCss(isDark)
    case 'pixel': return getPixelCss(isDark)
    case 'neumorphism': return getNeumorphismCss(isDark)
    case 'corporate': return getCorporateCss(isDark)
    case 'fashion': return getFashionCss(isDark)
    case 'forest': return getForestCss(isDark)
    case 'notion': return getNotionCss(isDark)
    case 'cafe': return getCafeCss(isDark)
    case 'travel': return getTravelCss(isDark)
    case 'music': return getMusicCss(isDark)
    case 'sketch': return getSketchCss(isDark)
    case 'cosmos': return getCosmosCss(isDark)
    case 'claymorphism': return getClaymorphismCss(isDark)
    case 'ice-crystal': return getIceCrystalCss(isDark)
    case 'rams': return getRamsCss(isDark)
    case 'luxury': return getLuxuryCss(isDark)
    case 'comic': return getComicCss(isDark)
    case 'steampunk': return getSteampunkCss(isDark)
    case 'gothic': return getGothicCss(isDark)
    case 'noir': return getNoirCss(isDark)
    case 'recipe': return getRecipeCss(isDark)
    case 'timeline': return getTimelineCss(isDark)
    case 'feed': return getFeedCss(isDark)
    case 'pastel': return getPastelCss(isDark)
    case 'newsletter': return getNewsletterCss(isDark)
    default: return ''
  }
}

export function getThemeStyleIndexHtml(themeStyle: string, data: ThemeIndexData): string {
  switch (themeStyle) {
    case 'ink-wash': return getInkWashIndexHtml(data)
    case 'terminal': return getTerminalIndexHtml(data)
    case 'newspaper': return getNewspaperIndexHtml(data)
    case 'glassmorphism': return getGlassmorphismIndexHtml(data)
    case 'bento': return getBentoIndexHtml(data)
    case 'narrative': return getNarrativeIndexHtml(data)
    case 'cyberpunk': return getCyberpunkIndexHtml(data)
    case 'aurora': return getAuroraIndexHtml(data)
    case 'academia': return getAcademiaIndexHtml(data)
    case 'retro': return getRetroIndexHtml(data)
    case 'garden': return getGardenIndexHtml(data)
    case 'midnight': return getMidnightIndexHtml(data)
    case 'custom': return getCustomIndexHtml(data)
    default: return ''
  }
}
