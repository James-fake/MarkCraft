import { useMemo } from 'react'
import { Modal } from '@components/ui/Modal'
import { useLanguage } from '@stores/LanguageStore'
import { markdownToHtml } from '@features/editor/mdToHtml'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'
import policyZh from '../../../docs/PRIVACY_POLICY_zh.md?raw'
import policyEn from '../../../docs/PRIVACY_POLICY_en.md?raw'

const noopImageStore = {
  getBase64Image: () => null,
  hasImage: () => false,
  saveImage: () => '',
} as unknown as ImageStoreAPI

export interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  /** 标题，国际化由调用方传入 */
  title: string
}

/**
 * 应用内隐私政策查看器。
 * 直接复用仓库内 docs/PRIVACY_POLICY_*.md（单一事实来源），用产品自身的 Markdown 渲染管线呈现。
 */
export function PrivacyPolicyModal({ isOpen, onClose, title }: PrivacyPolicyModalProps) {
  const { language } = useLanguage()
  const html = useMemo(() => {
    const md = language === 'zh' ? policyZh : policyEn
    return markdownToHtml(md, noopImageStore)
  }, [language])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {/* 文档为产品自带的静态内容，无外部输入，安全 */}
      <div
        className="aurora-prose aurora-privacy-policy"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Modal>
  )
}
