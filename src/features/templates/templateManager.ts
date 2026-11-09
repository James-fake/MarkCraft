// 模板管理层（features 壳）
//
// P2-4：内置模板数据（BUILTIN_TEMPLATES / BUILTIN_EXAMPLES / 日记模板解析）与纯变量替换
// applyTemplate 已下沉至 `services/templates`。此处保留「数据 + 纯应用」的薄壳语义以兼容
// 既有 import 路径，并承载 UI / 存储专用逻辑（共享模板导入导出、用户自定义模板 localStorage）。

import {
  BUILTIN_TEMPLATES,
  BUILTIN_EXAMPLES,
  getExamples,
  getExampleById,
  type Template,
  type ExampleDoc,
} from '@services/templates/templateData'
import { applyTemplate, applyTemplateWithCursor } from '@services/templates/templateApply'
import { safeJsonParseOrNull } from '@utils/safeJson'
import { platform } from '@platform'

export { BUILTIN_TEMPLATES, BUILTIN_EXAMPLES, getExamples, getExampleById, applyTemplate, applyTemplateWithCursor }
export type { Template, ExampleDoc }

// 社区/共享模板文件格式
export interface SharedTemplateFile {
  type: 'markcraft-template'
  version: 1
  template: Omit<Template, 'isBuiltIn'>
}

const SHARED_TEMPLATE_TYPE = 'markcraft-template'

// 生成唯一 ID（避免覆盖已有模板）
function genTemplateId(prefix = 'user'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// 净化文件名（用于导出下载）
function sanitizeFileName(name: string): string {
  return (name || 'template').replace(/[^\w一-龥-]+/g, '_')
}

/**
 * 导入共享/社区模板文件（支持 .json 与 .md）
 * - .json：MarkCraft 共享模板格式 { type, version, template } 或直接是 Template 对象
 * - .md：以首个 H1 作为名称，正文作为内容
 * 导入后存入用户自定义模板并返回该模板。
 */
export async function importSharedTemplate(file: File): Promise<Template> {
  const text = await file.text()
  let name = file.name.replace(/\.(json|md|markdown)$/i, '')
  let icon = '📄'
  let content = ''

  if (file.name.toLowerCase().endsWith('.json')) {
    // M-2：导入文件是外部/不受信任源，解析失败（非合法 JSON）必须降级而非抛异常中断导入流程。
    const data = safeJsonParseOrNull<Partial<SharedTemplateFile> & Partial<Template>>(text)
    if (data) {
      const tpl = (data as SharedTemplateFile).template ?? (data as Template)
      content = tpl.content ?? ''
      name = tpl.name ?? name
      icon = tpl.icon ?? icon
    } else {
      // 非合法 JSON：退化为把原文当作 .md 正文导入。
      content = text
    }
  } else {
    content = text
    const m = text.match(/^#\s+(.+)$/m)
    if (m) name = m[1].trim()
  }

  const tmpl: Template = {
    id: genTemplateId(),
    name,
    nameEn: name,
    icon,
    content,
    isBuiltIn: false,
  }
  saveUserTemplate(tmpl)
  return tmpl
}

/**
 * 导出模板为共享 .json 文件（社区分享用）。
 * 接收任意模板（内置或自定义），导出时标记为 isBuiltIn:false。
 */
export function exportTemplateAsFile(tmpl: Template): void {
  const payload: SharedTemplateFile = {
    type: SHARED_TEMPLATE_TYPE,
    version: 1,
    template: {
      id: tmpl.id,
      name: tmpl.name,
      nameEn: tmpl.nameEn,
      icon: tmpl.icon,
      content: tmpl.content,
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  void platform.saveBlob(blob, `${sanitizeFileName(tmpl.name)}.markcraft-template.json`).catch(() => {})
}

// 用户自定义模板存储
const USER_TEMPLATES_KEY = 'markcraft-user-templates'

export function getUserTemplates(): Template[] {
  try {
    const stored = localStorage.getItem(USER_TEMPLATES_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    // ⚠️ 形状校验（2026-11-03 审查 P2）：localStorage 被污染成非数组时，
    //    `[...getUserTemplates()]` 会抛 TypeError，整个模板弹窗崩溃。
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Template =>
        !!t && typeof t === 'object' && typeof (t as Template).id === 'string' && typeof (t as Template).name === 'string',
    );
  } catch { return []; }
}

export function saveUserTemplate(template: Template): void {
  const templates = getUserTemplates();
  const idx = templates.findIndex(t => t.id === template.id);
  if (idx >= 0) templates[idx] = template;
  else templates.push(template);
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(templates));
}

export function deleteUserTemplate(id: string): void {
  const templates = getUserTemplates().filter(t => t.id !== id);
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(templates));
}

/** 把一段内容存为新的用户模板（「存为模板」：当前笔记 / 选中内容）。 */
export function saveNoteAsTemplate(name: string, content: string, icon = '📄'): Template {
  const tmpl: Template = {
    id: genTemplateId(),
    name: name || '未命名模板',
    nameEn: name || 'Untitled template',
    icon,
    content,
    isBuiltIn: false,
  }
  saveUserTemplate(tmpl)
  return tmpl
}

/** 重命名用户模板（内置模板不可改；中英名同步）。 */
export function renameUserTemplate(id: string, name: string): void {
  const templates = getUserTemplates();
  const idx = templates.findIndex(t => t.id === id);
  if (idx < 0) return;
  templates[idx] = { ...templates[idx], name, nameEn: name };
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(templates));
}

// —— 收藏 / 最近使用（模板快速访问，localStorage）——
const FAVORITES_KEY = 'markcraft-template-favorites'
const RECENT_KEY = 'markcraft-template-recent'
const RECENT_MAX = 6

function readIdList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

export function getFavoriteTemplateIds(): string[] {
  return readIdList(FAVORITES_KEY)
}

export function isTemplateFavorite(id: string): boolean {
  return getFavoriteTemplateIds().includes(id)
}

/** 切换收藏；返回切换后是否已收藏。 */
export function toggleTemplateFavorite(id: string): boolean {
  const favs = getFavoriteTemplateIds()
  const idx = favs.indexOf(id)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.push(id)
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
  return idx < 0
}

export function getRecentTemplateIds(): string[] {
  return readIdList(RECENT_KEY)
}

/** 记录一次使用（置顶，去重，最多 RECENT_MAX 条）。 */
export function pushRecentTemplate(id: string): void {
  const recents = getRecentTemplateIds().filter(r => r !== id)
  recents.unshift(id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, RECENT_MAX)))
}

export function getAllTemplates(): Template[] {
  return [...BUILTIN_TEMPLATES, ...getUserTemplates()];
}
