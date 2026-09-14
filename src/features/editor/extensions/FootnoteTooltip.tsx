import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'

const footnoteTooltipKey = new PluginKey('footnoteTooltip')

let tooltipEl: HTMLDivElement | null = null

function showFootnoteTooltip(_view: EditorView, anchor: HTMLElement, content: string) {
  hideFootnoteTooltip()
  tooltipEl = document.createElement('div')
  tooltipEl.className = 'footnote-tooltip'
  tooltipEl.textContent = content
  tooltipEl.style.cssText = `
    position: fixed; z-index: 1000; max-width: 300px;
    padding: 8px 12px; border-radius: 6px;
    background: var(--editor-bg, #fff); color: var(--editor-text);
    border: 1px solid var(--editor-border, #e5e7eb);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    font-size: 13px; line-height: 1.5;
  `
  document.body.appendChild(tooltipEl)
  const rect = anchor.getBoundingClientRect()
  tooltipEl.style.left = rect.left + 'px'
  tooltipEl.style.top = (rect.bottom + 4) + 'px'
}

function hideFootnoteTooltip() {
  if (tooltipEl) {
    tooltipEl.remove()
    tooltipEl = null
  }
}

const FootnoteTooltip = Extension.create({
  name: 'footnoteTooltip',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: footnoteTooltipKey,
        props: {
          handleDOMEvents: {
            mouseover: (view: EditorView, event: MouseEvent) => {
              const target = event.target as HTMLElement
              const fnRef = target.closest('sup[data-type="footnoteReference"]')
              if (!fnRef) return false

              const footnoteId = fnRef.getAttribute('data-footnote-id') || ''
              if (!footnoteId) return false

              // Find the footnote content from the same node or descendants
              let footnoteContent = fnRef.getAttribute('data-footnote-content') || ''
              if (!footnoteContent) {
                // Search document for matching footnote reference nodes
                view.state.doc.descendants((node) => {
                  if (node.type.name === 'footnoteReference' && node.attrs.id === footnoteId) {
                    footnoteContent = (node.attrs.content as string) || ''
                  }
                })
              }

              if (!footnoteContent) return false

              showFootnoteTooltip(view, fnRef as HTMLElement, footnoteContent)
              return false
            },
            mouseout: (_view: EditorView, event: MouseEvent) => {
              const target = event.target as HTMLElement
              if (target.closest('sup[data-type="footnoteReference"]')) {
                hideFootnoteTooltip()
              }
              return false
            },
          },
        },
      }),
    ]
  },
})

export default FootnoteTooltip
