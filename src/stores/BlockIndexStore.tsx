import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { FileNode } from '../types/fileManager'
import { BlockInfo, BlockReferenceRecord, extractBlocks, parseBlockReferences } from '../services/blockReference'
import { collectAllFiles } from '@core/files/fileTree'

interface BlockIndexContextType {
  /** blockId -> BlockInfo */
  blockMap: Map<string, BlockInfo>
  /** fileId -> 该文件包含的块引用 */
  fileBlockRefs: Map<string, BlockReferenceRecord[]>
  /** blockId -> 引用了该块的记录（块反链） */
  blockBacklinks: Map<string, BlockReferenceRecord[]>
  indexVersion: number
  rebuildIndex: (rootFolder: FileNode) => void
  updateFileBlocks: (fileId: string, content: string, fileName: string) => void
  getBlock: (blockId: string) => BlockInfo | undefined
  getBlockBacklinks: (blockId: string) => BlockReferenceRecord[]
  getFileBlockRefs: (fileId: string) => BlockReferenceRecord[]
}

const BlockIndexContext = createContext<BlockIndexContextType | undefined>(undefined)


export const BlockIndexProvider: React.FC<{ children: React.ReactNode; rootFolder: FileNode }> = ({ children, rootFolder }) => {
  const [blockMap, setBlockMap] = useState<Map<string, BlockInfo>>(new Map())
  const [fileBlockRefs, setFileBlockRefs] = useState<Map<string, BlockReferenceRecord[]>>(new Map())
  const [blockBacklinks, setBlockBacklinks] = useState<Map<string, BlockReferenceRecord[]>>(new Map())
  const [indexVersion, setIndexVersion] = useState(0)
  const rebuildTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 缓存文件内容，用于增量更新
  const contentCacheRef = useRef<Map<string, { content: string; fileName: string }>>(new Map())

  /** 重新计算 blockBacklinks：扫描所有文件块引用，按 targetBlockId 分组 */
  const recomputeBacklinks = useCallback((
    blocks: Map<string, BlockInfo>,
    refs: Map<string, BlockReferenceRecord[]>
  ): Map<string, BlockReferenceRecord[]> => {
    const backlinks = new Map<string, BlockReferenceRecord[]>()
    for (const [, fileRefs] of refs) {
      for (const r of fileRefs) {
        // 只为已存在的块建反链（避免无效引用）
        if (blocks.has(r.targetBlockId)) {
          const arr = backlinks.get(r.targetBlockId)
          if (arr) arr.push(r)
          else backlinks.set(r.targetBlockId, [r])
        }
      }
    }
    return backlinks
  }, [])

  const doRebuild = useCallback((folder: FileNode) => {
    const allFiles = collectAllFiles(folder)
    const newBlocks = new Map<string, BlockInfo>()
    const newRefs = new Map<string, BlockReferenceRecord[]>()
    const cache = new Map<string, { content: string; fileName: string }>()

    for (const file of allFiles) {
      const content = file.content ?? ''
      cache.set(file.id, { content, fileName: file.name })
      const blocks = extractBlocks(content, file.id, file.name)
      for (const [id, info] of blocks) {
        if (!newBlocks.has(id)) newBlocks.set(id, info)
      }
      newRefs.set(file.id, parseBlockReferences(file.id, file.name, content))
    }

    contentCacheRef.current = cache
    setBlockMap(newBlocks)
    setFileBlockRefs(newRefs)
    setBlockBacklinks(recomputeBacklinks(newBlocks, newRefs))
    setIndexVersion(v => v + 1)
  }, [recomputeBacklinks])

  const rebuildIndex = useCallback((folder: FileNode) => {
    if (rebuildTimer.current) clearTimeout(rebuildTimer.current)
    rebuildTimer.current = setTimeout(() => {
      doRebuild(folder)
      rebuildTimer.current = null
    }, 300)
  }, [doRebuild])

  useEffect(() => {
    rebuildIndex(rootFolder)
    return () => { if (rebuildTimer.current) clearTimeout(rebuildTimer.current) }
  }, [rootFolder, rebuildIndex])

  const updateFileBlocks = useCallback((fileId: string, content: string, fileName: string) => {
    contentCacheRef.current.set(fileId, { content, fileName })

    setBlockMap(prevBlocks => {
      const newBlocks = new Map(prevBlocks)
      // 移除属于该文件的旧块
      for (const [id, info] of newBlocks) {
        if (info.fileId === fileId) newBlocks.delete(id)
      }
      // 添加新块
      const blocks = extractBlocks(content, fileId, fileName)
      for (const [id, info] of blocks) {
        if (!newBlocks.has(id)) newBlocks.set(id, info)
      }
      return newBlocks
    })

    setFileBlockRefs(prevRefs => {
      const newRefs = new Map(prevRefs)
      newRefs.set(fileId, parseBlockReferences(fileId, fileName, content))
      return newRefs
    })

    // 反链依赖 blockMap 和 fileBlockRefs 的最新值，在下一轮计算
    // 用 setTimeout 确保拿到更新后的 state
    setTimeout(() => {
      setBlockMap(currentBlocks => {
        setFileBlockRefs(currentRefs => {
          setBlockBacklinks(recomputeBacklinks(currentBlocks, currentRefs))
          return currentRefs
        })
        return currentBlocks
      })
    }, 0)

    setIndexVersion(v => v + 1)
  }, [recomputeBacklinks])

  const getBlock = useCallback((blockId: string) => blockMap.get(blockId), [blockMap])
  const getBlockBacklinks = useCallback((blockId: string) => blockBacklinks.get(blockId) ?? [], [blockBacklinks])
  const getFileBlockRefs = useCallback((fileId: string) => fileBlockRefs.get(fileId) ?? [], [fileBlockRefs])

  return (
    <BlockIndexContext.Provider value={{
      blockMap,
      fileBlockRefs,
      blockBacklinks,
      indexVersion,
      rebuildIndex,
      updateFileBlocks,
      getBlock,
      getBlockBacklinks,
      getFileBlockRefs,
    }}>
      {children}
    </BlockIndexContext.Provider>
  )
}

export function useBlockIndex(): BlockIndexContextType {
  const ctx = useContext(BlockIndexContext)
  if (!ctx) throw new Error('useBlockIndex must be used within a BlockIndexProvider')
  return ctx
}
