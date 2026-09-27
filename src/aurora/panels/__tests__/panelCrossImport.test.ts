import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * P2-1 回归锁（静态守卫）：**平级面板之间不得直接 import**。
 *
 * 背景：此前 EditorPanel 直接 `import { setBlogEntryFileId } from '../blog/BlogPanel'`
 * —— 博客入口标记当时是 BlogPanel 的模块级变量，逼出一条生产性的 panel→panel 边。
 * 已改为两端各自依赖 `@services/blogEntry`，本守卫防止该耦合以任何形式回归。
 *
 * 合法项（不计违规）：
 *  - 'aurora-nav'：壳内导航注册表，不是面板；
 *  - *.test/spec  ：测试装配需同时挂载多个面板，不构成生产耦合。
 *
 * 🚨 守卫必须有牙：本文件断言「扫描面非空」（files.length > 0），
 * 否则路径算错时会退化成 0 文件的假绿（与 .workbuddy/artifacts/scan-panel-cross.cjs 同源判据）。
 */
const PANELS_REL = 'src/aurora/panels'
const PANELS_ABS = path.resolve(process.cwd(), PANELS_REL)
const norm = (p: string) => path.normalize(p).replace(/\\/g, '/')
const ALLOWED_TARGETS = new Set(['aurora-nav'])
const isTest = (p: string) => /\.(test|spec)\.tsx?$/.test(p)

function collectFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...collectFiles(p))
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

function scan(): { from: string; to: string; target: string; line: number }[] {
  const hits: { from: string; to: string; target: string; line: number }[] = []
  for (const f of collectFiles(PANELS_ABS)) {
    const filePosix = norm(f)
    const selfDir = path.posix.dirname(filePosix)
    const src = fs.readFileSync(f, 'utf8')
    const re = /(?:from\s+|import\(\s*)['"](\.[^'"]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
      const spec = m[1]
      if (!/^\.\.?\//.test(spec)) continue
      const resolved = norm(path.join(selfDir, spec))
      if (!resolved.startsWith(norm(PANELS_ABS) + '/')) continue
      const target = resolved.slice(norm(PANELS_ABS).length + 1).split('/')[0]
      const self = selfDir.slice(norm(PANELS_ABS).length + 1).split('/')[0]
      if (target === self) continue
      if (ALLOWED_TARGETS.has(target) || isTest(filePosix)) continue
      hits.push({
        from: norm(path.relative(process.cwd(), f)),
        to: spec,
        target,
        line: src.slice(0, m.index).split(/\r?\n/).length,
      })
    }
  }
  return hits
}

describe('P2-1：面板横向 import 守卫', () => {
  it('扫描面非空（否则下面的 0 命中是假绿）', () => {
    expect(collectFiles(PANELS_ABS).length).toBeGreaterThan(20)
  })

  it('平级面板之间不存在直接 import', () => {
    const hits = scan()
    // 命中时打印明细，便于直接定位是哪一行回归
    if (hits.length) {
      console.log('跨面板 import 明细:\n' + hits.map((h) => `  ${h.from}:${h.line} → ${h.to}`).join('\n'))
    }
    expect(hits).toEqual([])
  })

  it('编辑器「发布为博客」走 services 通道，而非 import 博客面板', () => {
    const p = path.resolve(process.cwd(), 'src/aurora/panels/editor/EditorPanel.tsx')
    const src = fs.readFileSync(p, 'utf8')
    expect(src).toContain("@services/blogEntry")
    expect(src).not.toMatch(/from\s+['"]\.\.\/blog\//)
  })
})
