import { useState } from 'react'

export function useSourceFileOps(): {
  showSaveAsModal: boolean
  setShowSaveAsModal: (show: boolean) => void
  showOptimizeModal: boolean
  setShowOptimizeModal: (show: boolean) => void
  showFrontMatter: boolean
  setShowFrontMatter: (show: boolean) => void
} {
  const [showSaveAsModal, setShowSaveAsModal] = useState(false)
  const [showOptimizeModal, setShowOptimizeModal] = useState(false)
  const [showFrontMatter, setShowFrontMatter] = useState(false)

  return {
    showSaveAsModal,
    setShowSaveAsModal,
    showOptimizeModal,
    setShowOptimizeModal,
    showFrontMatter,
    setShowFrontMatter,
  }
}
