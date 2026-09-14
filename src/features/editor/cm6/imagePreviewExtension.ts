import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import type { ImageStoreAPI } from '../../shared/storage/imageStoreTypes'

/**
 * 图片内联预览扩展
 * 在 Markdown 图片语法 ![alt](url) 位置渲染缩略图
 */
export function createImagePreviewExtension(imageStore: ImageStoreAPI) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const doc = view.state.doc
      const text = doc.toString()

      // 匹配 Markdown 图片语法
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
      let match

      while ((match = imageRegex.exec(text)) !== null) {
        const from = match.index
        const [, altText, url] = match

        // 检查是否在可视区域内
        const pos = doc.lineAt(from).from
        if (!view.visibleRanges.some(r => pos >= r.from && pos <= r.to)) continue

        let imgSrc = url
        if (imageStore.isImagePlaceholder(url)) {
          const placeholderId = imageStore.getPlaceholderId(url)
          if (placeholderId) {
            const base64Data = imageStore.getBase64Image(placeholderId)
            if (base64Data) imgSrc = base64Data
          }
        }

        const widget = Decoration.widget({
          widget: new ImagePreviewWidget(imgSrc, altText),
          side: 1,
        })
        builder.add(from, from, widget)
      }

      return builder.finish()
    }
  }, {
    decorations: v => v.decorations,
  })
}

class ImagePreviewWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) {
    super()
  }

  toDOM() {
    const wrapper = document.createElement('div')
    wrapper.className = 'cm-image-preview'
    wrapper.style.cssText = 'margin: 4px 0; max-width: 100%;'

    const img = document.createElement('img')
    img.src = this.src
    img.alt = this.alt
    img.style.cssText = 'max-width: 100%; max-height: 150px; border-radius: 4px; border: 1px solid var(--editor-border, #e0e0e0);'
    img.loading = 'lazy'

    wrapper.appendChild(img)
    return wrapper
  }

  ignoreEvent() {
    return false
  }
}
