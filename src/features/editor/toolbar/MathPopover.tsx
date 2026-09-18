import type { Translations } from '@src/types/translations'
import { useState, useEffect, useRef } from 'react'

interface SymbolItem {
  latex: string
  display: string
  labelKey: string
}

interface TemplateItem {
  nameKey: string
  latex: string
  preview: string
}

interface MathPopoverProps {
  t: Translations
  isOpen: boolean
  onClose: () => void
  mode: 'inline' | 'block'
  anchorPosition: { x: number; y: number } | null
  anchorEl?: HTMLElement | null
  onInsert: (latex: string, isTemplate: boolean) => void
}

const SYMBOL_GROUPS: { nameKey: string; items: SymbolItem[] }[] = [
  {
    nameKey: 'greekLetters',
    items: [
      { latex: '\\alpha', display: 'α', labelKey: 'greekLetters' },
      { latex: '\\beta', display: 'β', labelKey: 'greekLetters' },
      { latex: '\\gamma', display: 'γ', labelKey: 'greekLetters' },
      { latex: '\\delta', display: 'δ', labelKey: 'greekLetters' },
      { latex: '\\epsilon', display: 'ε', labelKey: 'greekLetters' },
      { latex: '\\theta', display: 'θ', labelKey: 'greekLetters' },
      { latex: '\\lambda', display: 'λ', labelKey: 'greekLetters' },
      { latex: '\\mu', display: 'μ', labelKey: 'greekLetters' },
      { latex: '\\pi', display: 'π', labelKey: 'greekLetters' },
      { latex: '\\sigma', display: 'σ', labelKey: 'greekLetters' },
      { latex: '\\tau', display: 'τ', labelKey: 'greekLetters' },
      { latex: '\\phi', display: 'φ', labelKey: 'greekLetters' },
      { latex: '\\omega', display: 'ω', labelKey: 'greekLetters' },
      { latex: '\\Gamma', display: 'Γ', labelKey: 'greekLetters' },
      { latex: '\\Delta', display: 'Δ', labelKey: 'greekLetters' },
      { latex: '\\Sigma', display: 'Σ', labelKey: 'greekLetters' },
      { latex: '\\Omega', display: 'Ω', labelKey: 'greekLetters' },
      { latex: '\\Pi', display: 'Π', labelKey: 'greekLetters' },
    ],
  },
  {
    nameKey: 'operators',
    items: [
      { latex: '\\int', display: '∫', labelKey: 'integral' },
      { latex: '\\sum', display: '∑', labelKey: 'summation' },
      { latex: '\\prod', display: '∏', labelKey: 'product' },
      { latex: '\\sqrt{}', display: '√', labelKey: 'squareRoot' },
      { latex: '\\infty', display: '∞', labelKey: 'infinity' },
      { latex: '\\partial', display: '∂', labelKey: 'partial' },
      { latex: '\\nabla', display: '∇', labelKey: 'gradient' },
      { latex: '\\times', display: '×', labelKey: 'multiply' },
      { latex: '\\div', display: '÷', labelKey: 'divide' },
      { latex: '\\pm', display: '±', labelKey: 'plusMinus' },
      { latex: '\\cdot', display: '·', labelKey: 'dotProduct' },
      { latex: '\\frac{}{}', display: 'a/b', labelKey: 'fraction' },
    ],
  },
  {
    nameKey: 'relations',
    items: [
      { latex: '\\neq', display: '≠', labelKey: 'notEqual' },
      { latex: '\\leq', display: '≤', labelKey: 'lessEqual' },
      { latex: '\\geq', display: '≥', labelKey: 'greaterEqual' },
      { latex: '\\approx', display: '≈', labelKey: 'approx' },
      { latex: '\\equiv', display: '≡', labelKey: 'equivalent' },
      { latex: '\\sim', display: '∼', labelKey: 'similar' },
      { latex: '\\propto', display: '∝', labelKey: 'proportional' },
      { latex: '\\ll', display: '≪', labelKey: 'muchLess' },
      { latex: '\\gg', display: '≫', labelKey: 'muchGreater' },
      { latex: '\\perp', display: '⊥', labelKey: 'perpendicular' },
      { latex: '\\parallel', display: '∥', labelKey: 'parallel' },
      { latex: '\\in', display: '∈', labelKey: 'elementOf' },
    ],
  },
  {
    nameKey: 'setsLogic',
    items: [
      { latex: '\\in', display: '∈', labelKey: 'elementOf' },
      { latex: '\\notin', display: '∉', labelKey: 'notElementOf' },
      { latex: '\\cup', display: '∪', labelKey: 'union' },
      { latex: '\\cap', display: '∩', labelKey: 'intersection' },
      { latex: '\\subseteq', display: '⊆', labelKey: 'subset' },
      { latex: '\\subset', display: '⊂', labelKey: 'properSubset' },
      { latex: '\\forall', display: '∀', labelKey: 'forAll' },
      { latex: '\\exists', display: '∃', labelKey: 'exists' },
      { latex: '\\land', display: '∧', labelKey: 'logicalAnd' },
      { latex: '\\lor', display: '∨', labelKey: 'logicalOr' },
      { latex: '\\neg', display: '¬', labelKey: 'logicalNot' },
      { latex: '\\emptyset', display: '∅', labelKey: 'emptySet' },
    ],
  },
  {
    nameKey: 'arrows',
    items: [
      { latex: '\\rightarrow', display: '→', labelKey: 'rightArrow' },
      { latex: '\\Rightarrow', display: '⇒', labelKey: 'doubleRightArrow' },
      { latex: '\\leftarrow', display: '←', labelKey: 'leftArrow' },
      { latex: '\\Leftarrow', display: '⇐', labelKey: 'doubleLeftArrow' },
      { latex: '\\leftrightarrow', display: '↔', labelKey: 'leftRightArrow' },
      { latex: '\\Leftrightarrow', display: '⇔', labelKey: 'equivalence' },
      { latex: '\\mapsto', display: '↦', labelKey: 'mapsTo' },
      { latex: '\\uparrow', display: '↑', labelKey: 'upArrow' },
      { latex: '\\downarrow', display: '↓', labelKey: 'downArrow' },
      { latex: '\\nearrow', display: '↗', labelKey: 'upRightArrow' },
      { latex: '\\searrow', display: '↘', labelKey: 'downRightArrow' },
      { latex: '\\implies', display: '⟹', labelKey: 'implies' },
    ],
  },
]

const TEMPLATES: TemplateItem[] = [
  { nameKey: 'fraction', latex: '\\frac{}{}', preview: 'a/b' },
  { nameKey: 'squareRoot', latex: '\\sqrt{}', preview: '√x' },
  { nameKey: 'nthRoot', latex: '\\sqrt[n]{}', preview: 'ⁿ√x' },
  { nameKey: 'superscript', latex: '^{}', preview: 'xⁿ' },
  { nameKey: 'subscript', latex: '_{}', preview: 'xᵢ' },
  { nameKey: 'integral', latex: '\\int_{}^{}', preview: '∫ₐᵇ' },
  { nameKey: 'summation', latex: '\\sum_{}^{}', preview: '∑ⁿᵢ' },
  { nameKey: 'limit', latex: '\\lim_{}', preview: 'lim→' },
  { nameKey: 'matrix', latex: '\\begin{pmatrix}  &  \\\\  &  \\end{pmatrix}', preview: '2×2' },
  { nameKey: 'determinant', latex: '\\begin{vmatrix}  &  \\\\  &  \\end{vmatrix}', preview: '|2×2|' },
  { nameKey: 'piecewise', latex: 'f(x) = \\begin{cases}  & x>0 \\\\  & x \\leq 0 \\end{cases}', preview: 'cases' },
  { nameKey: 'system', latex: '\\begin{cases}  \\\\  \\end{cases}', preview: 'system' },
]

export default function MathPopover({ t, isOpen, onClose, mode, anchorPosition, anchorEl, onInsert }: MathPopoverProps) {
  const [tab, setTab] = useState<'symbols' | 'templates'>('symbols')
  const [activeGroup, setActiveGroup] = useState(0)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const groupNameMap: Record<string, string> = {
    greekLetters: t.mathPopover.greekLetters,
    operators: t.mathPopover.operators,
    relations: t.mathPopover.relations,
    setsLogic: t.mathPopover.setsLogic,
    arrows: t.mathPopover.arrows,
  }

  const symbolLabelMap: Record<string, string> = {
    integral: t.mathPopover.integral,
    summation: t.mathPopover.summation,
    product: t.mathPopover.product,
    squareRoot: t.mathPopover.squareRoot,
    infinity: t.mathPopover.infinity,
    partial: t.mathPopover.partial,
    gradient: t.mathPopover.gradient,
    multiply: t.mathPopover.multiply,
    divide: t.mathPopover.divide,
    plusMinus: t.mathPopover.plusMinus,
    dotProduct: t.mathPopover.dotProduct,
    fraction: t.mathPopover.fraction,
    notEqual: t.mathPopover.notEqual,
    lessEqual: t.mathPopover.lessEqual,
    greaterEqual: t.mathPopover.greaterEqual,
    approx: t.mathPopover.approx,
    equivalent: t.mathPopover.equivalent,
    similar: t.mathPopover.similar,
    proportional: t.mathPopover.proportional,
    muchLess: t.mathPopover.muchLess,
    muchGreater: t.mathPopover.muchGreater,
    perpendicular: t.mathPopover.perpendicular,
    parallel: t.mathPopover.parallel,
    elementOf: t.mathPopover.elementOf,
    notElementOf: t.mathPopover.notElementOf,
    union: t.mathPopover.union,
    intersection: t.mathPopover.intersection,
    subset: t.mathPopover.subset,
    properSubset: t.mathPopover.properSubset,
    forAll: t.mathPopover.forAll,
    exists: t.mathPopover.exists,
    logicalAnd: t.mathPopover.logicalAnd,
    logicalOr: t.mathPopover.logicalOr,
    logicalNot: t.mathPopover.logicalNot,
    emptySet: t.mathPopover.emptySet,
    rightArrow: t.mathPopover.rightArrow,
    doubleRightArrow: t.mathPopover.doubleRightArrow,
    leftArrow: t.mathPopover.leftArrow,
    doubleLeftArrow: t.mathPopover.doubleLeftArrow,
    leftRightArrow: t.mathPopover.leftRightArrow,
    equivalence: t.mathPopover.equivalence,
    mapsTo: t.mathPopover.mapsTo,
    upArrow: t.mathPopover.upArrow,
    downArrow: t.mathPopover.downArrow,
    upRightArrow: t.mathPopover.upRightArrow,
    downRightArrow: t.mathPopover.downRightArrow,
    implies: t.mathPopover.implies,
    greekLetters: t.mathPopover.greekLetters,
  }

  const templateNameMap: Record<string, string> = {
    fraction: t.mathPopover.fraction,
    squareRoot: t.mathPopover.squareRoot,
    nthRoot: t.mathPopover.nthRoot,
    superscript: t.mathPopover.superscript,
    subscript: t.mathPopover.subscript,
    integral: t.mathPopover.integral,
    summation: t.mathPopover.summation,
    limit: t.mathPopover.limit,
    matrix: t.mathPopover.matrix,
    determinant: t.mathPopover.determinant,
    piecewise: t.mathPopover.piecewise,
    system: t.mathPopover.system,
  }

  useEffect(() => {
    if (isOpen) {
      setTab('symbols')
      setActiveGroup(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      const popoverWidth = 400
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left: number
      let top: number

      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect()
        left = rect.left
        top = rect.bottom + 4
      } else if (anchorPosition) {
        left = anchorPosition.x
        top = anchorPosition.y + 4
      } else {
        left = viewportWidth / 2 - popoverWidth / 2
        top = 100
      }

      if (left + popoverWidth > viewportWidth - 12) {
        left = viewportWidth - popoverWidth - 12
      }
      if (left < 12) left = 12

      // 如果底部空间不足，显示在锚点上方
      if (top + 400 > viewportHeight) {
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect()
          top = rect.top - 400 - 4
        } else if (anchorPosition) {
          top = anchorPosition.y - 400 - 4
        }
        if (top < 12) top = 12
      }

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [isOpen, anchorPosition, anchorEl])

  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSymbolClick = (latex: string) => {
    onInsert(latex, false)
    onClose()
  }

  const handleTemplateClick = (latex: string) => {
    onInsert(latex, true)
    onClose()
  }

  return (
    <div
      ref={popoverRef}
      className="math-popover"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
      }}
    >
      <div className="math-popover-header-bar">
        <span className="math-popover-mode-label">
          {mode === 'inline' ? t.mathPopover.inlineFormula : t.mathPopover.blockFormula}
        </span>
        <div className="math-popover-tab-group">
          <button
            className={`math-popover-tab-btn ${tab === 'symbols' ? 'active' : ''}`}
            onClick={() => setTab('symbols')}
          >
            {t.mathPopover.symbols}
          </button>
          <button
            className={`math-popover-tab-btn ${tab === 'templates' ? 'active' : ''}`}
            onClick={() => setTab('templates')}
          >
            {t.mathPopover.templates}
          </button>
        </div>
      </div>

      {tab === 'symbols' && (
        <>
          <div className="math-popover-group-tabs">
            {SYMBOL_GROUPS.map((group, i) => (
              <button
                key={group.nameKey}
                className={`math-popover-group-btn ${activeGroup === i ? 'active' : ''}`}
                onClick={() => setActiveGroup(i)}
              >
                {groupNameMap[group.nameKey]}
              </button>
            ))}
          </div>
          <div className="math-popover-symbol-grid">
            {SYMBOL_GROUPS[activeGroup].items.map((sym) => (
              <button
                key={sym.latex + sym.labelKey}
                className="math-popover-symbol-item"
                title={`${symbolLabelMap[sym.labelKey]}: ${sym.latex}`}
                onClick={() => handleSymbolClick(sym.latex)}
              >
                <span className="math-popover-symbol-char">{sym.display}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'templates' && (
        <div className="math-popover-template-grid">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.nameKey}
              className="math-popover-template-item"
              title={tpl.latex}
              onClick={() => handleTemplateClick(tpl.latex)}
            >
              <span className="math-popover-template-name">{templateNameMap[tpl.nameKey]}</span>
              <span className="math-popover-template-preview">{tpl.preview}</span>
            </button>
          ))}
        </div>
      )}

      <div className="math-popover-footer-bar">
        <span className="math-popover-footer-hint">
          {mode === 'inline' ? t.mathPopover.quickInsertInline : t.mathPopover.quickInsertBlock}
        </span>
      </div>
    </div>
  )
}
