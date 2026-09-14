import { useState, useEffect } from 'react'
import { Modal } from '@components/ui/Modal'
import { Icon } from '../../icons'

export type KbImportType = 'obsidian' | 'notion' | 'web'

export interface KbCreateModalProps {
  /** 是否打开 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 轻提示（校验/导入示意） */
  toast?: (msg: string) => void
  /** 创建知识库：返回 true 表示成功（成功后面板刷新列表并自动关弹窗） */
  onCreate: (name: string, desc: string) => Promise<boolean> | boolean
}

/**
 * 知识库「新建 / 导入」统一弹窗
 *
 * 顶部模式分段提供「新建知识库」「导入」两个选项：
 * - 新建知识库：名称 + 描述表单（接真实 createKb）
 * - 导入：Obsidian / Notion / 网页剪藏 三种来源（保持原导入浮层的交互与提示语义）
 *
 * 复用全局 Modal 组件（Esc / 遮罩 / 关闭按钮）与 aurora-kb-* 既有表单/选项样式。
 */
export function KbCreateModal({ open, onClose, toast, onCreate }: KbCreateModalProps) {
  const [mode, setMode] = useState<'create' | 'import'>('create')
  const [importType, setImportType] = useState<KbImportType | null>(null)
  const [webUrl, setWebUrl] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  // 每次打开重置表单与模式（Modal 关闭时卸载内容，但本组件常驻挂载）
  useEffect(() => {
    if (!open) return
    setMode('create')
    setImportType(null)
    setWebUrl('')
    setName('')
    setDesc('')
  }, [open])

  const close = () => onClose?.()

  const handleCreate = async () => {
    if (!name.trim()) {
      toast?.('请输入知识库名称')
      return
    }
    const ok = await onCreate(name.trim(), desc.trim())
    if (ok) close()
  }

  const handleImport = () => {
    if (importType === 'web') {
      if (!webUrl.trim()) {
        toast?.('请输入网页 URL')
        return
      }
      toast?.(`已剪藏 ${webUrl.trim()}（示意，归档至素材库）`)
    } else if (importType === 'obsidian' || importType === 'notion') {
      toast?.(`导入 ${importType === 'obsidian' ? 'Obsidian' : 'Notion'} 压缩包（示意）`)
    }
    close()
  }

  const footer = mode === 'create' ? (
    <>
      <button type="button" className="aurora-kb-btn" onClick={close}>取消</button>
      <button
        type="button"
        className="aurora-kb-btn aurora-kb-btn--primary"
        disabled={!name.trim()}
        onClick={handleCreate}
      >
        创建知识库
      </button>
    </>
  ) : (
    <button type="button" className="aurora-kb-btn" onClick={close}>关闭</button>
  )

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="新建知识库"
      size="md"
      contentClassName="aurora-kb-modal"
      footer={footer}
    >
      {/* 模式分段：新建知识库 / 导入 */}
      <div className="aurora-kb-modal__tabs" role="tablist" aria-label="新建或导入">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          className={`aurora-kb-modal__tab${mode === 'create' ? ' is-active' : ''}`}
          onClick={() => setMode('create')}
        >
          <Icon.plus size={14} /> 新建知识库
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'import'}
          className={`aurora-kb-modal__tab${mode === 'import' ? ' is-active' : ''}`}
          onClick={() => setMode('import')}
        >
          <Icon.download size={14} /> 导入
        </button>
      </div>

      {mode === 'create' ? (
        <div className="aurora-kb-modal__form">
          <div className="aurora-kb-manage__field">
            <label className="aurora-kb-label" htmlFor="kb-create-name">名称 *</label>
            <input
              id="kb-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              placeholder="例如：机器学习笔记"
              className="aurora-kb-input"
              autoFocus
            />
          </div>
          <div className="aurora-kb-manage__field">
            <label className="aurora-kb-label" htmlFor="kb-create-desc">描述</label>
            <textarea
              id="kb-create-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="知识库简介…"
              className="aurora-kb-input aurora-kb-textarea"
            />
          </div>
        </div>
      ) : (
        <div className="aurora-kb-modal__import">
          <div className="aurora-kb-modal__import-title">从外部导入</div>
          <button
            type="button"
            className={`aurora-kb-opt${importType === 'obsidian' ? ' is-active' : ''}`}
            onClick={() => setImportType('obsidian')}
          >
            <span className="aurora-kb-opt__ico"><Icon.layers size={16} /></span>
            <span>
              <div className="aurora-kb-opt__t">Obsidian Vault</div>
              <div className="aurora-kb-opt__d">导入 .zip 导出包，保留双链与 frontmatter</div>
            </span>
          </button>
          <button
            type="button"
            className={`aurora-kb-opt${importType === 'notion' ? ' is-active' : ''}`}
            onClick={() => setImportType('notion')}
          >
            <span className="aurora-kb-opt__ico"><Icon.book size={16} /></span>
            <span>
              <div className="aurora-kb-opt__t">Notion 导出</div>
              <div className="aurora-kb-opt__d">导入 ZIP 包，自动转换为 Markdown</div>
            </span>
          </button>
          <button
            type="button"
            className={`aurora-kb-opt${importType === 'web' ? ' is-active' : ''}`}
            onClick={() => setImportType('web')}
          >
            <span className="aurora-kb-opt__ico"><Icon.globe size={16} /></span>
            <span>
              <div className="aurora-kb-opt__t">网页剪藏</div>
              <div className="aurora-kb-opt__d">输入 URL，抓取正文并转为 Markdown</div>
            </span>
          </button>

          {importType && importType !== 'web' && (
            <div className="aurora-kb-modal__row">
              <button type="button" className="aurora-kb-btn aurora-kb-btn--primary" onClick={handleImport}>
                选择 {importType === 'obsidian' ? 'Obsidian' : 'Notion'} ZIP
              </button>
              <span className="aurora-kb-faint">支持 .zip</span>
            </div>
          )}

          {importType === 'web' && (
            <div className="aurora-kb-modal__row">
              <input
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleImport() }}
                placeholder="https://example.com/article"
                className="aurora-kb-input"
                autoFocus
              />
              <button type="button" className="aurora-kb-btn aurora-kb-btn--primary" onClick={handleImport}>抓取</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
