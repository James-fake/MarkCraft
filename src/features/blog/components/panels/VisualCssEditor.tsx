import { useState, useCallback, useEffect } from 'react'
import { ThemeTokens, getTokensForMode } from './themeTokens'
import { BoxShadowEditor } from './BoxShadowEditor'
import { AuroraSelect } from '@components/ui/AuroraSelect'

interface SelectedElement {
  selector: string
  tagName: string
  className: string
  styles: {
    fontSize: string
    color: string
    fontWeight: string
    lineHeight: string
    letterSpacing: string
    textAlign: string
    backgroundColor: string
    marginTop: string
    marginBottom: string
    padding: string
    borderRadius: string
    // ─── G1 新增第一批属性 ───
    fontFamily: string
    fontStyle: string
    textDecoration: string
    textTransform: string
    borderWidth: string
    borderStyle: string
    borderColor: string
    boxShadow: string
    opacity: string
    width: string
    height: string
    paddingTop: string
    paddingBottom: string
    paddingLeft: string
    paddingRight: string
    marginLeft: string
    marginRight: string
    marginTopComputed: string
    marginBottomComputed: string
  }
}

interface VisualCssEditorProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  onGenerateCss: (selector: string, css: string) => void
  isDark: boolean
  previewDevice?: 'desktop' | 'tablet' | 'mobile'
}

// 设备断点映射 — 非桌面模式下生成的 CSS 自动包裹 @media 查询
const DEVICE_BREAKPOINTS: Record<'desktop' | 'tablet' | 'mobile', string | null> = {
  desktop: null,                                                    // 桌面：不包裹 @media
  tablet: '(max-width: 768px)',                                     // 平板：≤768px
  mobile: '(max-width: 375px)',                                     // 手机：≤375px
}

// Script to inject into iframe for element selection
const INSPECTOR_SCRIPT = `
(function() {
  if (window.__markcraftInspector) return;
  window.__markcraftInspector = true;

  let overlay = null;
  let selectedOutline = null;
  let selectedElement = null;

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'mc-inspect-overlay';
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #6366f1;background:rgba(99,102,241,0.08);z-index:99999;transition:all 0.1s ease;border-radius:2px;display:none;';
    document.body.appendChild(overlay);
    return overlay;
  }

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    let sel = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\\s+/).filter(c => c && !c.startsWith('mc-') && c !== 'active');
      if (classes.length > 0) sel += '.' + classes.slice(0, 2).join('.');
    }
    return sel;
  }

  function getComputedStyles(el) {
    const cs = window.getComputedStyle(el);
    return {
      fontSize: cs.fontSize,
      color: cs.color,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textAlign: cs.textAlign,
      backgroundColor: cs.backgroundColor,
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom,
      padding: cs.padding,
      borderRadius: cs.borderRadius,
      // ─── G1 新增第一批属性 ───
      fontFamily: cs.fontFamily,
      fontStyle: cs.fontStyle,
      textDecoration: cs.textDecoration,
      textTransform: cs.textTransform,
      borderWidth: cs.borderWidth,
      borderStyle: cs.borderStyle,
      borderColor: cs.borderColor,
      boxShadow: cs.boxShadow,
      opacity: cs.opacity,
      width: cs.width,
      height: cs.height,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      paddingRight: cs.paddingRight,
      marginLeft: cs.marginLeft,
      marginRight: cs.marginRight,
      marginTopComputed: cs.marginTop,
      marginBottomComputed: cs.marginBottom,
    };
  }

  function showOverlay(el) {
    const ov = createOverlay();
    const rect = el.getBoundingClientRect();
    ov.style.display = 'block';
    ov.style.left = rect.left + 'px';
    ov.style.top = rect.top + 'px';
    ov.style.width = rect.width + 'px';
    ov.style.height = rect.height + 'px';
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
  }

  // ─── 命名函数引用（用于后续 removeEventListener 移除） ───
  function onMouseOver(e) {
    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.id === 'mc-inspect-overlay' || el.id === 'mc-selected-outline') return;
    showOverlay(el);
  }

  function onMouseOut(e) {
    hideOverlay();
  }

  function onClick(e) {
    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.id === 'mc-inspect-overlay' || el.id === 'mc-selected-outline') return;

    e.preventDefault();
    e.stopPropagation();

    // Remove previous selection outline
    if (selectedOutline) selectedOutline.remove();

    // Store selected element reference
    selectedElement = el;

    // Create selection outline
    selectedOutline = document.createElement('div');
    selectedOutline.id = 'mc-selected-outline';
    const rect = el.getBoundingClientRect();
    selectedOutline.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #34d399;background:rgba(52,211,153,0.06);z-index:99998;transition:all 0.15s ease;border-radius:2px;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;';
    document.body.appendChild(selectedOutline);

    // Send element info to parent
    const info = {
      type: 'mc-element-selected',
      selector: getSelector(el),
      tagName: el.tagName.toLowerCase(),
      className: (el.className && typeof el.className === 'string') ? el.className : '',
      styles: getComputedStyles(el),
    };
    window.parent.postMessage(info, '*');
  }

  // Apply style directly to selected element for instant preview
  // 同时记录被修改过的属性，便于后续重置
  // 修改后同步更新选中框的位置和大小
  var modifiedElements = []; // [{el, props: {propName: originalValue}}]
  window.__mcApplyStyle = function(property, value) {
    if (!selectedElement) return;
    // 记录原始值（仅首次记录）
    var entry = modifiedElements.find(function(m) { return m.el === selectedElement; });
    if (!entry) {
      entry = { el: selectedElement, props: {} };
      modifiedElements.push(entry);
    }
    if (!(property in entry.props)) {
      entry.props[property] = selectedElement.style[property];
    }
    selectedElement.style[property] = value;

    // 同步更新选中框的位置和大小 — 适应元素尺寸变化
    if (selectedOutline && selectedElement) {
      // 使用 requestAnimationFrame 确保浏览器完成布局计算后再获取尺寸
      requestAnimationFrame(function() {
        if (!selectedOutline || !selectedElement) return;
        var newRect = selectedElement.getBoundingClientRect();
        selectedOutline.style.left = newRect.left + 'px';
        selectedOutline.style.top = newRect.top + 'px';
        selectedOutline.style.width = newRect.width + 'px';
        selectedOutline.style.height = newRect.height + 'px';
      });
    }
  };

  // Reset inline styles on selected element
  window.__mcResetStyle = function(property) {
    if (!selectedElement) return;
    selectedElement.style[property] = '';
  };

  // 重置所有被可视化编辑器修改过的 inline style — 恢复到修改前
  window.__mcResetAllInlineStyles = function() {
    modifiedElements.forEach(function(m) {
      for (var prop in m.props) {
        m.el.style[prop] = m.props[prop];
      }
    });
    modifiedElements = [];
  };

  // ─── 注册事件监听（使用命名函数引用，便于后续移除） ───
  document.addEventListener('mouseover', onMouseOver);
  document.addEventListener('mouseout', onMouseOut);
  document.addEventListener('click', onClick, true);

  // ─── 清理函数：移除所有事件监听和 DOM 元素 ───
  window.__mcCleanupInspector = function() {
    document.removeEventListener('mouseover', onMouseOver);
    document.removeEventListener('mouseout', onMouseOut);
    document.removeEventListener('click', onClick, true);
    if (overlay) { overlay.remove(); overlay = null; }
    if (selectedOutline) { selectedOutline.remove(); selectedOutline = null; }
    selectedElement = null;
    // 重置所有被修改的 inline style
    if (typeof window.__mcResetAllInlineStyles === 'function') {
      window.__mcResetAllInlineStyles();
    }
    delete window.__mcApplyStyle;
    delete window.__mcResetStyle;
    delete window.__mcResetAllInlineStyles;
    window.__markcraftInspector = false;
  };
})();
`

export function VisualCssEditor({ iframeRef, onGenerateCss, isDark, previewDevice }: VisualCssEditorProps) {
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [inspectMode, setInspectMode] = useState(false)

  // 输出单位选择 — 影响生成的 CSS 中的数值单位
  const [outputUnit, setOutputUnit] = useState<'px' | 'rem' | 'em' | 'vw'>('px')

  // px → 目标单位转换（以 16px 根字号为基准，375px 视口为 vw 基准）
  const convertPx = useCallback((px: number, unit: 'px' | 'rem' | 'em' | 'vw'): string => {
    switch (unit) {
      case 'rem': return (px / 16).toFixed(2) + 'rem'
      case 'em': return (px / 16).toFixed(2) + 'em'
      case 'vw': return (px / 3.75).toFixed(1) + 'vw'
      default: return px + 'px'
    }
  }, [])

  // Inject inspector script into iframe
  const injectInspector = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument
      if (!doc || !doc.head) return
      // Remove existing inspector script
      const existing = doc.getElementById('mc-inspector-script')
      if (existing) existing.remove()
      if (!inspectMode) return
      const script = doc.createElement('script')
      script.id = 'mc-inspector-script'
      script.textContent = INSPECTOR_SCRIPT
      doc.head.appendChild(script)
    } catch {
      // cross-origin
    }
  }, [iframeRef, inspectMode])

  useEffect(() => {
    injectInspector()
  }, [injectInspector, inspectMode])

  // Re-inject after iframe loads
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const handleLoad = () => injectInspector()
    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [iframeRef, injectInspector])

  // Listen for postMessage from iframe
  useEffect(() => {
    if (!inspectMode) return
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'mc-element-selected') {
        setSelectedElement({
          selector: e.data.selector,
          tagName: e.data.tagName,
          className: e.data.className,
          styles: e.data.styles,
        })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [inspectMode])

  // Clean up inspector when mode is off — 调用 __mcCleanupInspector 移除事件监听
  useEffect(() => {
    if (inspectMode) return
    setSelectedElement(null)
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const win = iframe.contentWindow as unknown as Record<string, unknown>
      // 调用清理函数：移除所有事件监听器 + DOM 元素 + 重置标志
      if (typeof win.__mcCleanupInspector === 'function') {
        (win.__mcCleanupInspector as () => void)()
      }
      // 兜底：移除 script 和残留 DOM
      const doc = iframe.contentDocument
      if (doc) {
        const script = doc.getElementById('mc-inspector-script')
        if (script) script.remove()
        const overlay = doc.getElementById('mc-inspect-overlay')
        if (overlay) overlay.remove()
        const outline = doc.getElementById('mc-selected-outline')
        if (outline) outline.remove()
      }
    } catch {
      // cross-origin
    }
  }, [inspectMode, iframeRef])

  // Apply style directly to iframe element for instant preview (no CSS rule generated)
  // 同时更新 selectedElement 状态，使滑块位置实时跟随
  const applyStylePreview = useCallback((property: string, value: string) => {
    // 1. 直接修改 iframe 元素的 inline style — 即时预览
    try {
      const iframe = iframeRef.current
      if (iframe && iframe.contentWindow) {
        const win = iframe.contentWindow as unknown as Record<string, unknown>
        if (typeof win.__mcApplyStyle === 'function') {
          (win.__mcApplyStyle as (prop: string, val: string) => void)(property, value)
        }
      }
    } catch {
      // cross-origin
    }

    // 2. 更新 selectedElement 状态 — 使滑块/输入框位置实时跟随拖动
    setSelectedElement(prev => {
      if (!prev) return prev
      // 将 CSS 属性名映射到 styles 对象的 key
      // font-size → fontSize, line-height → lineHeight, etc.
      const camelKey = property.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())
      // 特殊映射：margin-top → marginTopComputed 等
      let styleKey = camelKey
      if (property === 'margin-top') styleKey = 'marginTopComputed'
      if (property === 'margin-bottom') styleKey = 'marginBottomComputed'

      return {
        ...prev,
        styles: {
          ...prev.styles,
          [styleKey]: value,
        },
      }
    })
  }, [iframeRef])

  // Commit CSS rule to editor (called on mouse up / change confirm)
  const commitCssRule = useCallback((property: string, value: string) => {
    if (!selectedElement) return
    const selector = selectedElement.selector

    // 如果输出单位非 px，将值中的 px 数值转换为目标单位
    let finalValue = value
    if (outputUnit !== 'px') {
      finalValue = value.replace(/(\d+(?:\.\d+)?)px/g, (_match, num) => convertPx(parseFloat(num), outputUnit))
    }

    const rule = `${selector} {\n  ${property}: ${finalValue};\n}`

    // 根据当前预览设备自动包裹 @media 查询
    const breakpoint = previewDevice ? DEVICE_BREAKPOINTS[previewDevice] : null
    const css = breakpoint
      ? `/* ${previewDevice === 'mobile' ? '手机 ≤375px' : '平板 ≤768px'} */\n@media ${breakpoint} {\n  ${rule.replace(/\n/g, '\n  ')}\n}`
      : rule

    onGenerateCss(selector, css)
  }, [selectedElement, onGenerateCss, previewDevice, outputUnit, convertPx])

  // Parse rgb() to hex for color input
  const rgbToHex = (rgb: string): string => {
    if (rgb.startsWith('#')) return rgb
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (!match) return '#000000'
    const r = parseInt(match[1])
    const g = parseInt(match[2])
    const b = parseInt(match[3])
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
  }

  // Parse px value to number
  const pxToNum = (val: string): number => {
    const m = val.match(/([\d.]+)/)
    return m ? parseFloat(m[1]) : 0
  }

  const tk: ThemeTokens = getTokensForMode(isDark)

  return (
    <div>
      {/* Toggle inspect mode */}
      <button
        onClick={() => setInspectMode(prev => !prev)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '8px 12px', borderRadius: 8,
          border: `1px solid ${inspectMode ? 'rgba(52,211,153,0.5)' : tk.border}`,
          background: inspectMode ? 'rgba(52,211,153,0.08)' : tk.inputBg,
          color: inspectMode ? '#34d399' : tk.textSub,
          cursor: 'pointer', fontSize: 11, fontWeight: 600,
          transition: 'all 0.2s ease',
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        {inspectMode ? '检查模式已开启（点击预览区元素）' : '开启元素检查模式'}
      </button>

      {/* Device breakpoint hint — shows when non-desktop device is active */}
      {inspectMode && previewDevice && previewDevice !== 'desktop' && (
        <div style={{
          marginTop: 6, padding: '6px 10px', borderRadius: 6,
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.25)',
          fontSize: 9, color: '#fbbf24', lineHeight: 1.5,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 11 }}>📱</span>
          <span>
            当前: {previewDevice === 'mobile' ? '手机 (≤375px)' : '平板 (≤768px)'} —
            生成的 CSS 将自动包裹 <code style={{ fontFamily: "'Fira Code', monospace", color: '#fbbf24' }}>@media</code> 查询
          </span>
        </div>
      )}

      {/* Output unit switcher — shows when inspect mode is active */}
      {inspectMode && (
        <div style={{
          marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 6,
          background: tk.inputBg, border: `1px solid ${tk.border}`,
        }}>
          <span style={{ fontSize: 9, color: tk.textMuted }}>输出单位:</span>
          {(['px', 'rem', 'em', 'vw'] as const).map(u => (
            <button
              key={u}
              onClick={() => setOutputUnit(u)}
              style={{
                padding: '2px 8px', borderRadius: 4, border: 'none',
                background: outputUnit === u ? tk.accentBg : 'transparent',
                color: outputUnit === u ? tk.accentText : tk.textMuted,
                cursor: 'pointer', fontSize: 9, fontWeight: 600,
                fontFamily: "'Fira Code', monospace",
                transition: 'all 0.15s ease',
              }}
            >
              {u}
            </button>
          ))}
          {outputUnit !== 'px' && (
            <span style={{ fontSize: 8, color: tk.textFaint, marginLeft: 'auto' }}>
              (px 自动转换)
            </span>
          )}
        </div>
      )}

      {/* Selected element panel */}
      {selectedElement && inspectMode && (
        <div style={{
          marginTop: 8, padding: 10, borderRadius: 8,
          background: tk.inputBg, border: `1px solid ${tk.border}`,
        }}>
          {/* Selector display */}
          <div style={{
            fontSize: 10, fontWeight: 700, color: tk.propertyColor,
            fontFamily: "'Fira Code', monospace",
            marginBottom: 8, padding: '4px 8px',
            background: isDark ? 'rgba(125,211,252,0.08)' : 'rgba(3,105,161,0.08)', borderRadius: 4,
            wordBreak: 'break-all',
          }}>
            {selectedElement.selector}
          </div>

          {/* Editable properties - grouped */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* ─── 字体组 ─── */}
            <PropertyGroup title="字体" icon="Aa" tk={tk}>
              <PropertyRow label="字号" value={`${pxToNum(selectedElement.styles.fontSize).toFixed(0)}px`} tk={tk}>
                <input type="range" min={10} max={72} value={pxToNum(selectedElement.styles.fontSize)}
                  onChange={(e) => applyStylePreview('font-size', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('font-size', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>

              <PropertyRow label="字重" value={selectedElement.styles.fontWeight} tk={tk}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <AuroraSelect
                    value={String(selectedElement.styles.fontWeight)}
                    onChange={(v) => { applyStylePreview('font-weight', v); commitCssRule('font-weight', v) }}
                    options={['300', '400', '500', '600', '700', '800', '900'].map(w => ({ value: w, label: w }))}
                    className="aurora-select--block"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="字体" value={selectedElement.styles.fontFamily} tk={tk}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <AuroraSelect
                    value={String(selectedElement.styles.fontFamily)}
                    onChange={(v) => { applyStylePreview('font-family', v); commitCssRule('font-family', v) }}
                    options={['sans-serif', 'serif', 'monospace', '"Noto Serif SC", serif', '"Playfair Display", serif', '"Fira Code", monospace'].map(f => ({ value: f, label: f.replace(/"/g, '') }))}
                    className="aurora-select--block"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="风格" value={selectedElement.styles.fontStyle} tk={tk}>
                <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                  {['normal', 'italic'].map(style => (
                    <button key={style} onClick={() => { applyStylePreview('font-style', style); commitCssRule('font-style', style) }}
                      style={{
                        flex: 1, padding: '2px 0', borderRadius: 4,
                        border: `1px solid ${selectedElement.styles.fontStyle === style ? tk.accentBorder : tk.inputBorder}`,
                        background: selectedElement.styles.fontStyle === style ? tk.accentBg : 'transparent',
                        color: selectedElement.styles.fontStyle === style ? tk.accentText : tk.textSub,
                        cursor: 'pointer', fontSize: 9, fontStyle: style === 'italic' ? 'italic' : 'normal',
                      }}
                    >{style === 'italic' ? '斜' : '正'}</button>
                  ))}
                </div>
              </PropertyRow>

              <PropertyRow label="装饰" value={selectedElement.styles.textDecoration} tk={tk}>
                <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                  {['none', 'underline', 'line-through'].map(deco => (
                    <button key={deco} onClick={() => { applyStylePreview('text-decoration', deco); commitCssRule('text-decoration', deco) }}
                      style={{
                        flex: 1, padding: '2px 0', borderRadius: 4,
                        border: `1px solid ${selectedElement.styles.textDecoration.includes(deco) ? tk.accentBorder : tk.inputBorder}`,
                        background: selectedElement.styles.textDecoration.includes(deco) ? tk.accentBg : 'transparent',
                        color: selectedElement.styles.textDecoration.includes(deco) ? tk.accentText : tk.textSub,
                        cursor: 'pointer', fontSize: 9,
                      }}
                    >{deco === 'none' ? '无' : deco === 'underline' ? '下划' : '删除'}</button>
                  ))}
                </div>
              </PropertyRow>

              <PropertyRow label="行高" value={selectedElement.styles.lineHeight} tk={tk}>
                <input type="range" min={1} max={3} step={0.1}
                  value={pxToNum(selectedElement.styles.lineHeight) / pxToNum(selectedElement.styles.fontSize) || 1.6}
                  onChange={(e) => applyStylePreview('line-height', e.target.value)}
                  onPointerUp={(e) => commitCssRule('line-height', (e.target as HTMLInputElement).value)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>

              <PropertyRow label="字距" value={selectedElement.styles.letterSpacing} tk={tk}>
                <input type="range" min={-2} max={8} step={0.5}
                  value={pxToNum(selectedElement.styles.letterSpacing)}
                  onChange={(e) => applyStylePreview('letter-spacing', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('letter-spacing', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>

              <PropertyRow label="对齐" value={selectedElement.styles.textAlign} tk={tk}>
                <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                  {['left', 'center', 'right', 'justify'].map(align => (
                    <button key={align} onClick={() => { applyStylePreview('text-align', align); commitCssRule('text-align', align) }}
                      style={{
                        flex: 1, padding: '2px 0', borderRadius: 4,
                        border: `1px solid ${selectedElement.styles.textAlign === align ? tk.accentBorder : tk.inputBorder}`,
                        background: selectedElement.styles.textAlign === align ? tk.accentBg : 'transparent',
                        color: selectedElement.styles.textAlign === align ? tk.accentText : tk.textSub,
                        cursor: 'pointer', fontSize: 9, textTransform: 'capitalize',
                      }}
                    >{align === 'justify' ? '两端' : align === 'left' ? '左' : align === 'center' ? '中' : '右'}</button>
                  ))}
                </div>
              </PropertyRow>
            </PropertyGroup>

            {/* ─── 色彩组 ─── */}
            <PropertyGroup title="色彩" icon="🎨" tk={tk} defaultOpen={true}>
              <PropertyRow label="颜色" value={rgbToHex(selectedElement.styles.color)} tk={tk}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                  <input type="color" value={rgbToHex(selectedElement.styles.color)}
                    onChange={(e) => applyStylePreview('color', e.target.value)}
                    onPointerUp={(e) => commitCssRule('color', (e.target as HTMLInputElement).value)}
                    style={{ width: 24, height: 20, border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 9, color: tk.textSub, fontFamily: "'Fira Code', monospace" }}>{rgbToHex(selectedElement.styles.color)}</span>
                </div>
              </PropertyRow>

              <PropertyRow label="背景色" value={rgbToHex(selectedElement.styles.backgroundColor)} tk={tk}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                  <input type="color" value={rgbToHex(selectedElement.styles.backgroundColor)}
                    onChange={(e) => applyStylePreview('background-color', e.target.value)}
                    onPointerUp={(e) => commitCssRule('background-color', (e.target as HTMLInputElement).value)}
                    style={{ width: 24, height: 20, border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 9, color: tk.textSub, fontFamily: "'Fira Code', monospace" }}>{rgbToHex(selectedElement.styles.backgroundColor)}</span>
                </div>
              </PropertyRow>

              <PropertyRow label="透明度" value={parseFloat(selectedElement.styles.opacity).toFixed(2)} tk={tk}>
                <input type="range" min={0} max={1} step={0.05}
                  value={parseFloat(selectedElement.styles.opacity) || 1}
                  onChange={(e) => applyStylePreview('opacity', e.target.value)}
                  onPointerUp={(e) => commitCssRule('opacity', (e.target as HTMLInputElement).value)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
            </PropertyGroup>

            {/* ─── 边框组 ─── */}
            <PropertyGroup title="边框" icon="☐" tk={tk} defaultOpen={false}>
              <PropertyRow label="圆角" value={selectedElement.styles.borderRadius} tk={tk}>
                <input type="range" min={0} max={32} value={pxToNum(selectedElement.styles.borderRadius)}
                  onChange={(e) => applyStylePreview('border-radius', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('border-radius', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>

              <PropertyRow label="边框宽" value={`${pxToNum(selectedElement.styles.borderWidth)}px`} tk={tk}>
                <input type="range" min={0} max={10} step={1} value={pxToNum(selectedElement.styles.borderWidth)}
                  onChange={(e) => applyStylePreview('border-width', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('border-width', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>

              <PropertyRow label="边框式" value={selectedElement.styles.borderStyle} tk={tk}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <AuroraSelect
                    value={String(selectedElement.styles.borderStyle)}
                    onChange={(v) => { applyStylePreview('border-style', v); commitCssRule('border-style', v) }}
                    options={['none', 'solid', 'dashed', 'dotted', 'double'].map(s => ({ value: s, label: s === 'none' ? '无' : s }))}
                    className="aurora-select--block"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="边框色" value={rgbToHex(selectedElement.styles.borderColor)} tk={tk}>
                <input type="color" value={rgbToHex(selectedElement.styles.borderColor)}
                  onChange={(e) => applyStylePreview('border-color', e.target.value)}
                  onPointerUp={(e) => commitCssRule('border-color', (e.target as HTMLInputElement).value)}
                  style={{ width: 24, height: 20, border: 'none', padding: 0, cursor: 'pointer' }}
                />
              </PropertyRow>

              <PropertyRow label="阴影" value={selectedElement.styles.boxShadow} tk={tk}>
                <BoxShadowEditor
                  value={selectedElement.styles.boxShadow}
                  onPreview={applyStylePreview}
                  onCommit={commitCssRule}
                  tk={tk}
                />
              </PropertyRow>
            </PropertyGroup>

            {/* ─── 间距组 ─── */}
            <PropertyGroup title="间距" icon="↕" tk={tk} defaultOpen={false}>
              <PropertyRow label="上内距" value={`${pxToNum(selectedElement.styles.paddingTop)}px`} tk={tk}>
                <input type="range" min={0} max={60} value={pxToNum(selectedElement.styles.paddingTop)}
                  onChange={(e) => applyStylePreview('padding-top', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('padding-top', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
              <PropertyRow label="下内距" value={`${pxToNum(selectedElement.styles.paddingBottom)}px`} tk={tk}>
                <input type="range" min={0} max={60} value={pxToNum(selectedElement.styles.paddingBottom)}
                  onChange={(e) => applyStylePreview('padding-bottom', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('padding-bottom', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
              <PropertyRow label="左内距" value={`${pxToNum(selectedElement.styles.paddingLeft)}px`} tk={tk}>
                <input type="range" min={0} max={60} value={pxToNum(selectedElement.styles.paddingLeft)}
                  onChange={(e) => applyStylePreview('padding-left', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('padding-left', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
              <PropertyRow label="右内距" value={`${pxToNum(selectedElement.styles.paddingRight)}px`} tk={tk}>
                <input type="range" min={0} max={60} value={pxToNum(selectedElement.styles.paddingRight)}
                  onChange={(e) => applyStylePreview('padding-right', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('padding-right', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
              <PropertyRow label="上外距" value={`${pxToNum(selectedElement.styles.marginTopComputed)}px`} tk={tk}>
                <input type="range" min={0} max={80} value={pxToNum(selectedElement.styles.marginTopComputed)}
                  onChange={(e) => applyStylePreview('margin-top', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('margin-top', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
              <PropertyRow label="下外距" value={`${pxToNum(selectedElement.styles.marginBottomComputed)}px`} tk={tk}>
                <input type="range" min={0} max={80} value={pxToNum(selectedElement.styles.marginBottomComputed)}
                  onChange={(e) => applyStylePreview('margin-bottom', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('margin-bottom', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
              <PropertyRow label="左外距" value={`${pxToNum(selectedElement.styles.marginLeft)}px`} tk={tk}>
                <input type="range" min={0} max={80} value={pxToNum(selectedElement.styles.marginLeft)}
                  onChange={(e) => applyStylePreview('margin-left', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('margin-left', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
              <PropertyRow label="右外距" value={`${pxToNum(selectedElement.styles.marginRight)}px`} tk={tk}>
                <input type="range" min={0} max={80} value={pxToNum(selectedElement.styles.marginRight)}
                  onChange={(e) => applyStylePreview('margin-right', `${e.target.value}px`)}
                  onPointerUp={(e) => commitCssRule('margin-right', `${(e.target as HTMLInputElement).value}px`)}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
              </PropertyRow>
            </PropertyGroup>

            {/* ─── 尺寸组 ─── */}
            <PropertyGroup title="尺寸" icon="📐" tk={tk} defaultOpen={false}>
              <PropertyRow label="宽" value={selectedElement.styles.width} tk={tk}>
                <span style={{ fontSize: 9, color: tk.textSub, fontFamily: "'Fira Code', monospace" }}>{selectedElement.styles.width}</span>
              </PropertyRow>
              <PropertyRow label="高" value={selectedElement.styles.height} tk={tk}>
                <span style={{ fontSize: 9, color: tk.textSub, fontFamily: "'Fira Code', monospace" }}>{selectedElement.styles.height}</span>
              </PropertyRow>
            </PropertyGroup>
          </div>
        </div>
      )}
    </div>
  )
}

function PropertyRow({ label, children, tk }: {
  label: string
  value: string
  children: React.ReactNode
  tk: ThemeTokens
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 9, color: tk.textMuted, width: 32, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  )
}

function PropertyGroup({ title, icon, children, tk, defaultOpen }: {
  title: string
  icon: string
  children: React.ReactNode
  tk: ThemeTokens
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
        padding: '4px 0', border: 'none', background: 'transparent',
        cursor: 'pointer', fontSize: 10, fontWeight: 700,
        color: tk.textSub, letterSpacing: '0.04em',
      }}>
        <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', fontSize: 8 }}>▸</span>
        <span>{icon}</span>
        <span>{title}</span>
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>{children}</div>}
    </div>
  )
}
