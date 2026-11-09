import { useEffect, useRef } from 'react'
import type { FileNode } from '../../types/fileManager'
import { useLanguage } from '@stores/LanguageStore'
import { flattenNotes } from '../../services/vaultService'
import { resolveUsageDocsScope } from '@core/files/usageDocs'
import { logger } from '@utils/logger'
import { readSeedRecord, writeSeedRecord } from './firstRun'
import { buildWelcomeDoc, welcomeDocFileName } from './welcomeDoc'

export interface FirstRunSeedDeps {
  /** 权威文件树是否就位 —— 未就位时写入会落在随后被丢弃的幽灵节点上 */
  hydrated: boolean
  rootFolder: FileNode
  createFile: (parentId: string, name: string, content?: string, openAfterCreate?: boolean) => string
}

/**
 * 首启播种：给第一次打开 MarkCraft 的用户写一篇真实的欢迎笔记。
 *
 * 为什么不做全屏 tour：安装向导已经问过存储位置，桌面写作工具的用户来是为了写字，
 * 再挡一层模态只会被直接关掉。让文档自己介绍自己 —— 用户改一个字就已经在写了。
 *
 * 判定顺序（任何一步不满足都不播种）：
 * 1. 权威树已水合（`hydrated`）—— 否则 createFile 会写进 T0 兜底树，随后被整体覆盖；
 * 2. 从未跑过播种（`markcraft.firstRunSeed.v1` 不存在）—— 用户删掉欢迎笔记后不复活；
 * 3. 用户自己还没有任何笔记（排除内置说明书）—— 老用户升级不该被塞新文件。
 *
 * 不自动跳转编辑器：首屏仍是欢迎页，欢迎页左大卡会指向这篇笔记，用户点一下即进。
 */
export function useFirstRunSeed({ hydrated, rootFolder, createFile }: FirstRunSeedDeps): void {
  const { language } = useLanguage()
  // ⚠️ 一次性闸门：rootFolder 每次变更都会让 effect 重跑，靠 ref 保证同一挂载周期只判一次。
  //    StrictMode 的双调用是同一实例重放 effect，ref 保留，故不会重复播种。
  const attempted = useRef(false)

  useEffect(() => {
    if (!hydrated || attempted.current) return
    attempted.current = true

    if (readSeedRecord()) return

    const { builtinFileIds } = resolveUsageDocsScope(rootFolder)
    const userNotes = flattenNotes(rootFolder, builtinFileIds)
    if (userNotes.length > 0) {
      // 老用户：只落「已判过」标记，不建文件（docId 空串 = 跳过）
      writeSeedRecord('')
      logger.info('[firstRun] 检测到已有笔记，跳过首启播种：', userNotes.length)
      return
    }

    const lang = language === 'en' ? 'en' : 'zh'
    const name = welcomeDocFileName(lang)
    try {
      const docId = createFile(rootFolder.id, name, buildWelcomeDoc(lang), false)
      writeSeedRecord(docId)
      logger.info('[firstRun] 已播种欢迎笔记：', name)
    } catch (err) {
      // 建不出来也不能反复重试刷日志（标记仍写入，避免每次启动都尝试）
      writeSeedRecord('')
      logger.error('[firstRun] 播种欢迎笔记失败：', err)
    }
  }, [hydrated, rootFolder, createFile, language])
}
