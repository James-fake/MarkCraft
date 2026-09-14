/**
 * Classic theme CSS — composes base, cards, post content, and widgets CSS sections
 */

import type { ClassicCssConfig } from './classicThemeCssBase'
import { getClassicCssBase } from './classicThemeCssBase'
import { getClassicCssCards } from './classicThemeCssCards'
import { getClassicCssPostContent } from './classicThemeCssPostContent'
import { getClassicCssWidgets } from './classicThemeCssWidgets'

export type { ClassicCssConfig } from './classicThemeCssBase'

export function getClassicThemeCss(params: ClassicCssConfig): string {
  return getClassicCssBase(params) + getClassicCssCards(params) + getClassicCssPostContent(params) + getClassicCssWidgets(params)
}
