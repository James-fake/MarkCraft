// 可视化 CSS 编辑器的 iframe 检查脚本（P4-3 自 VisualCssEditor.tsx 抽离）。
// 注入预览 iframe 后提供：元素悬停高亮 / 点选回传（postMessage 'mc-element-selected'）/
// inline style 即时预览与重置（window.__mcApplyStyle / __mcResetStyle / __mcResetAllInlineStyles）
// 及清理函数 window.__mcCleanupInspector。内容为纯浏览器端 IIFE 字符串，不参与打包运行时。
export const INSPECTOR_SCRIPT = `
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
