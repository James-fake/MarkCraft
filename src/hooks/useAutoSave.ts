import { useCallback, useRef, useEffect, useState } from 'react'
import { saveBackup, clearBackup } from '../services/crashRecovery'

export function useAutoSave(
  activeFileId: string | undefined,
  activeFileName: string | undefined,
  updateFileContent: (id: string, content: string) => void,
  autoSaveInterval: number = 30000
) {
  const debouncedUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeFileIdRef = useRef(activeFileId)
  const activeFileNameRef = useRef(activeFileName)
  activeFileIdRef.current = activeFileId
  activeFileNameRef.current = activeFileName

  const isDirtyRef = useRef(false)
  const currentContentRef = useRef<string>('')
  const [isDirty, setIsDirty] = useState(false)

  // Debounced save (existing behavior, enhanced)
  const scheduleSave = useCallback((content: string) => {
    if (debouncedUpdateRef.current) {
      clearTimeout(debouncedUpdateRef.current)
    }
    currentContentRef.current = content
    // 捕获当前的 fileId，防止切换文件后定时器将内容保存到错误的文件
    const targetFileId = activeFileIdRef.current
    if (targetFileId) {
      isDirtyRef.current = true
      setIsDirty(true)
      // Save crash backup
      saveBackup(targetFileId, activeFileNameRef.current || '', content)

      debouncedUpdateRef.current = setTimeout(() => {
        updateFileContent(targetFileId, content)
        isDirtyRef.current = false
        setIsDirty(false)
        clearBackup()
      }, 500)
    }
  }, [updateFileContent])

  // 切换文件时立即保存当前未保存的内容
  useEffect(() => {
    return () => {
      // 组件卸载时保存
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current)
        const targetFileId = activeFileIdRef.current
        if (targetFileId && isDirtyRef.current && currentContentRef.current) {
          updateFileContent(targetFileId, currentContentRef.current)
          isDirtyRef.current = false
          clearBackup()
        }
      }
    }
  }, [updateFileContent])

  // 当 activeFileId 变化时，立即保存上一个文件的未保存内容
  const prevFileIdRef = useRef(activeFileId)
  useEffect(() => {
    if (prevFileIdRef.current !== activeFileId) {
      // 切换文件：立即保存上一个文件的内容
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current)
        debouncedUpdateRef.current = null
      }
      if (isDirtyRef.current && prevFileIdRef.current && currentContentRef.current) {
        updateFileContent(prevFileIdRef.current, currentContentRef.current)
        isDirtyRef.current = false
        setIsDirty(false)
        clearBackup()
      }
      // 重置状态，准备接收新文件的内容
      currentContentRef.current = ''
      prevFileIdRef.current = activeFileId
    }
  }, [activeFileId, updateFileContent])

  // Interval auto-save
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (isDirtyRef.current && activeFileIdRef.current) {
        updateFileContent(activeFileIdRef.current, currentContentRef.current)
        isDirtyRef.current = false
        setIsDirty(false)
        clearBackup()
      }
    }, autoSaveInterval)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoSaveInterval, updateFileContent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debouncedUpdateRef.current) clearTimeout(debouncedUpdateRef.current)
    }
  }, [])

  return { scheduleSave, isDirty }
}
