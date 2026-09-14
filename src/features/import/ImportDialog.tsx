import React, { useState, useCallback } from 'react'
import { importDocxToMarkdown } from './importDocx'
import { importHtmlToMarkdown } from './importHtml'
import { Modal, Button } from '../../components/ui'

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (fileName: string, content: string) => void
}

const SUPPORTED_TYPES = '.md,.markdown,.txt,.docx,.html,.htm'

export default function ImportDialog({ isOpen, onClose, onImport }: ImportDialogProps) {
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setError('')

    try {
      let content = ''
      const name = file.name
      const ext = name.split('.').pop()?.toLowerCase()

      if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
        content = await file.text()
      } else if (ext === 'docx') {
        content = await importDocxToMarkdown(file)
      } else if (ext === 'html' || ext === 'htm') {
        const html = await file.text()
        content = importHtmlToMarkdown(html)
      } else {
        setError(`不支持的文件格式: .${ext}`)
        setImporting(false)
        return
      }

      const fileName = name.replace(/\.[^.]+$/, '')
      onImport(fileName, content)
      onClose()
    } catch (err) {
      setError(`打开失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setImporting(false)
      // Reset input so the same file can be re-selected
      e.target.value = ''
    }
  }, [onImport, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="打开文件"
      size="sm"
      accent
      footer={<Button variant="secondary" onClick={onClose}>取消</Button>}
    >
      <div
        style={{
          border: '2px dashed var(--mc-border-subtle)',
          borderRadius: 8,
          padding: 32,
          textAlign: 'center',
          color: 'var(--mc-text-secondary)',
          opacity: 0.6,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--button-primary)'
          e.currentTarget.style.opacity = '0.8'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--mc-border-subtle)'
          e.currentTarget.style.opacity = '0.6'
        }}
      >
        <input
          type="file"
          accept={SUPPORTED_TYPES}
          onChange={handleFileChange}
          disabled={importing}
          style={{ display: 'none' }}
          id="import-file-input"
        />
        <label htmlFor="import-file-input" style={{ cursor: importing ? 'not-allowed' : 'pointer' }}>
          {importing ? '正在打开...' : '点击选择文件'}
          <div style={{ fontSize: 12, marginTop: 8 }}>支持 .md .txt .docx .html</div>
        </label>
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</div>}
    </Modal>
  )
}
