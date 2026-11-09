import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FileNode } from '../types/fileManager';
import type { FileManagerState } from '../types/fileManager';
import { loadState, loadStateAsync, saveState, generateId, findNode, searchFiles } from '../services/fileService';
import { platform } from '../platform';
import {
  loadVault,
  syncTree,
  resetSync,
  readLastVault,
  persistVaultRoot,
  readSetupVaultApplied,
  markSetupVaultApplied,
  checkVaultWritable,
  flattenNotes,
  flushSync,
} from '../services/vaultService';
import { useLanguage } from './LanguageStore';
import { useUndoRedo } from './UndoRedoStore';
import { getRecentFiles, removeRecentFile } from '@core/files/recentFiles';
import { resolveUsageDocsScope } from '@core/files/usageDocs';
import { loadSessionSnapshot, saveSessionSnapshot } from '../services/sessionSnapshot';
import { bindRuntimeFiles } from '../services/backupService';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentZh } from '@core/data/defaultDocs/zh';
import { knowledgeLinkGuideContent as knowledgeLinkGuideContentEn } from '@core/data/defaultDocs/en';
import { logger } from '@utils/logger';
// —— P5-2 拆分：类型/落盘净化下沉 fileStoreShared，Tab 方法组与文件树方法组各成 hook ——
// 本文件保留 Provider 编排（两阶段初始化 / 自动保存 / 一次性迁移）与读取型 getter。
import { stripTransientTabs, stripLegacyUsageDocTabs, pathOfNode, nodeByPath, mergeUnsavedEdits } from './fileStoreShared';
import type { FileManagerContextType } from './fileStoreShared';
import { useTabActions } from './useTabActions';
import { useFileTreeActions } from './useFileTreeActions';

// 对外类型路径保稳（消费方从本模块导入）
export type { FileManagerContextType } from './fileStoreShared';

const FileManagerContext = createContext<FileManagerContextType | undefined>(undefined);

/** P4-D：用户点过「暂不迁移」后置位，避免每次启动都弹（localStorage 级，仅桌面端） */
const LEGACY_MIGRATION_DISMISSED = 'markcraft.legacyMigrationDismissed';

/**
 * 按**相对路径**对齐两棵树的节点 id，返回「旧 id → 新 id」映射。
 * 用于 Vault 重载后把标签页的旧 id 迁移到新 id（重载会为同一批文件重新生成 id）。
 */
function buildIdRemap(oldRoot: FileNode, newRoot: FileNode): Map<string, string> {
  const index = (root: FileNode): Map<string, string> => {
    const out = new Map<string, string>();
    const walk = (node: FileNode, prefix: string): void => {
      const rel = prefix ? `${prefix}/${node.name}` : node.name;
      out.set(rel, node.id);
      for (const c of node.children || []) walk(c, rel);
    };
    walk(root, '');
    return out;
  };
  const oldMap = index(oldRoot);
  const newMap = index(newRoot);
  const remap = new Map<string, string>();
  for (const [rel, oldId] of oldMap) {
    const newId = newMap.get(rel);
    if (newId && newId !== oldId) remap.set(oldId, newId);
  }
  return remap;
}

export const FileManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const undoRedo = useUndoRedo();

  // ⚠️ 同步兜底树也要过一遍「旧版落盘使用文档标签」迁移：IDB 为空的老用户走的就是
  //    localStorage 这条路，若不拦，旧标签会熬到 hydrated 后被 save effect 转正进 IDB。
  const [state, setState] = useState<FileManagerState>(() => stripLegacyUsageDocTabs(loadState(language)));
  // 「权威树是否就位」——初始 false；loadStateAsync 返回后置 true（无论有没有读到树）。
  // 该窗口内 state 可能只是 T0（同步兜底树），故：① 不可据此做程序化写入（会落在随后
  // 被丢弃的幽灵节点上）；② 不可回存 IDB（会以 T0 覆盖用户真实的旧树）。
  const [hydrated, setHydrated] = useState(false);
  // 当前打开的 Vault 根路径（桌面端）；首次从 localStorage 恢复上次打开的 Vault
  const [vaultRoot, setVaultRoot] = useState<string | null>(() => readLastVault());
  // P4-D：桌面端检测到 IndexedDB 有旧笔记、但尚未选 Vault → 提示一次性迁移（count = 可迁移笔记数）
  const [legacyMigration, setLegacyMigration] = useState<{ count: number } | null>(null);
  /**
   * 目标 Vault 不可写（或写盘中途失败）时的告警。
   * 存在即代表「当前没在用磁盘 Vault，笔记暂存应用内部」—— 必须让用户看见，
   * 否则就是静默数据丢失。
   */
  const [vaultError, setVaultError] = useState<{ path: string } | null>(null);
  const stateRef = useRef(state)
  stateRef.current = state

  // 备份子系统绑定运行时树（2026-11-03 审查 P1）：桌面 Vault 模式不写 IndexedDB，
  // 而备份只从 IDB 读 → 自动备份永不产生、恢复写回后加载不到。这里把「当前树」
  // 与「恢复落点」都接到运行时 state 上，浏览器形态不受影响（provider 有值，
  // applier 会把恢复结果写回内存树 → save effect 再按平台落 IDB/磁盘）。
  useEffect(() => {
    bindRuntimeFiles(
      () => stateRef.current,
      async (next) => {
        setState((prev) => ({ ...prev, rootFolder: next.rootFolder }))
        // ⚠️ 恢复/导入必须等到**真正落盘**（2026-11-08 审查 M-C-2）：save effect 的
        //    syncTree 是 300ms 防抖 + 串行补跑，applier 若只把树塞回内存就返回，恢复流程
        //    会在文件落盘前宣告成功 —— 用户此刻退出应用，刚恢复的文件全部丢失。
        //    这里直接冲刷一次并 await，给 backupService 一个「已落盘」的确定信号。
        if (platform.kind !== 'electron' || !vaultRoot) return
        syncTree(next.rootFolder, vaultRoot, (err) => {
          logger.error('[FileStore] 恢复数据写盘失败：', err)
          setVaultError((prev) => prev ?? { path: vaultRoot })
        })
        await flushSync()
      },
    )
    return () => bindRuntimeFiles(null, null)
  }, [vaultRoot])

  // —— Tab 方法组（P5-2：openFile/closeTab/…/isAnyTabDirty 见 useTabActions）——
  const tabActions = useTabActions(setState, stateRef);

  // —— 文件树方法组（P5-2：createFile/deleteNode/moveNode/… 见 useFileTreeActions；
  //     依赖 Tab 组的 openFile / updateTabName / removeTabsByFileIds 单向装配）——
  const fileActions = useFileTreeActions({
    setState,
    stateRef,
    undoRedo,
    openFile: tabActions.openFile,
    updateTabName: tabActions.updateTabName,
    removeTabsByFileIds: tabActions.removeTabsByFileIds,
  });

  // 启动后异步加载最新数据：
  //  - 桌面端且已选 Vault → 从**真实磁盘**读（P4，磁盘为真相源）；
  //  - 其余（浏览器 / jsdom / 桌面未选 Vault）→ 从 IndexedDB 读（既有行为不变）。
  useEffect(() => {
    let cancelled = false

    // P4-D：桌面端 + IDB 里确有旧笔记 + 用户未忽略过 → 提示一次性迁移
    // （抽出复用：IndexedDB 分支，以及「采用安装向导默认 Vault」分支 —— 后者若不检查，
    //   仍躺在 IDB 里的旧笔记会在新 Vault 之外「消失」，用户以为丢了。）
    const detectLegacyIdbNotes = (cleaned: FileManagerState | null) => {
      if (platform.kind !== 'electron' || !cleaned) return
      if (localStorage.getItem(LEGACY_MIGRATION_DISMISSED)) return
      const builtin = resolveUsageDocsScope(cleaned.rootFolder).builtinFileIds
      const count = flattenNotes(cleaned.rootFolder, builtin).length
      if (count > 0) setLegacyMigration({ count })
    }

    // —— IndexedDB 分支（浏览器 / jsdom / 桌面未选 Vault）——
    const hydrateFromIdb = () => {
      loadStateAsync(language).then(asyncState => {
        if (cancelled) return
        const cleaned = asyncState ? stripLegacyUsageDocTabs(asyncState) : null
        if (cleaned) {
          // ⚠️ setState 前剥掉旧版永久落盘的使用文档标签（stripLegacyUsageDocTabs 的说明）。
          //    必须在 setState 之前：随后 hydrated 翻转会触发 save effect 把净化版回写 IndexedDB，
          //    落盘里的旧标签借此一并清掉 —— 若在 setState 之后修，则要再补一次显式回写。
          setState(cleaned)
        }
        // 无论读没读到，都算「水合完成」：读不到时 T0 本身就是应然状态（新用户首启 / 版本升级重建）
        setHydrated(true)
        detectLegacyIdbNotes(cleaned)
        logger.info('[FileStore] hydrated=true；来源 =', asyncState ? 'IndexedDB 权威树' : '无（新用户首启或已清空，沿用同步树）')
      })
    }

    // —— 磁盘 Vault 分支 ——
    // ⚠️ 采用前先预检**可写性**：Windows 上目录可能对当前用户只给 RX（只读），
    //    此时所有写盘都会 EPERM。若照样采用为 Vault，用户会进入「界面一切正常、文件却
    //    一个都不落盘」的静默失败状态（真实事故）。不可写 → 保持内部存储（数据不丢）
    //    + 弹告警让用户换位置，而不是把笔记写进一个永远写不进去的目录。
    const hydrateFromVault = async (root: string): Promise<void> => {
      // ⚠️ 顺序铁律（2026-11-09 回归修复）：**先登记根，再做可写性探针**。
      //    checkVaultWritable 的探针写走 mc:fs:writeFile → assertAllowedPath（fs 白名单）。
      //    若此时根尚未登记进 allowedRoots（升级首启 / 通过 localStorage 恢复的历史 Vault /
      //    安装向导选的目录），探针写会被 OUT_OF_BOUNDS 拒绝 → 误报「文件夹无法写入」并回退
      //    内部存储（真实事故：v11 升级后 E 盘 Vault 即使管理员也报无法写入）。
      //    先登记后探针：registerRoot 走 C-1 授权（老版本升级迁移窗口会放行首个合法根），
      //    把根加入白名单，探针才能正常落盘、真实反映 OS 权限。
      // ⚠️ 必须 **await**（2026-11-08 审查 M-C-3）：registerRoot 与 loadVault 的 readDir
      //    是两次独立 invoke，主进程可并发处理 —— 不 await 时 readDir 完全可能先到，
      //    命中白名单缺位被整体拒绝。登记失败仅记日志：后续 fs 会继续拒绝，错误在
      //    loadVault / 探针处可见，这里不额外阻断启动。
      try {
        await platform.vault?.registerRoot(root)
      } catch (err) {
        logger.error('[FileStore] Vault 根登记失败：', err)
      }
      const writable = await checkVaultWritable(root)
      if (cancelled) return
      if (!writable) {
        logger.error('[FileStore] 目标文件夹不可写，保持内部存储：', root)
        setVaultError({ path: root })
        hydrateFromIdb()
        return
      }
      const tree = await loadVault(root)
      if (cancelled) return
      setVaultRoot(root)
      // 磁盘来源无需 stripLegacyUsageDocTabs（说明书不落盘）；rootFolder 直接替换
      // 会话恢复（2026-11-03 审查 P1）：按相对路径把上次的标签页映射到新树的 id。
      // 路径找不到（文件被外部删除/改名）的标签直接跳过，不留悬空 tab。
      const session = await loadSessionSnapshot()
      if (cancelled) return
      if (session && session.tabs.length > 0) {
        const restoredTabs = session.tabs
          .map((t) => {
            const node = nodeByPath(tree, t.path)
            if (!node || node.type !== 'file') return null
            return {
              id: generateId(),
              fileId: node.id,
              name: node.name,
              isActive: false,
              isDirty: false, // 磁盘是真相源，重启后不应带脏标记
            }
          })
          .filter((t): t is { id: string; fileId: string; name: string; isActive: boolean; isDirty: boolean } => t !== null)
        const activeNode = session.activeTabPath ? nodeByPath(tree, session.activeTabPath) : null
        const activeTab = activeNode ? restoredTabs.find((t) => t.fileId === activeNode.id) : null
        setState((prev) => ({
          ...prev,
          rootFolder: tree,
          tabs: restoredTabs.map((t) => ({ ...t, isActive: t === activeTab })),
          activeTabId: activeTab ? activeTab.id : null,
          searchQuery: session.searchQuery,
          sidebarVisible: session.sidebarVisible,
        }))
        logger.info('[FileStore] 会话恢复：', restoredTabs.length, '个标签')
      } else {
        setState((prev) => ({ ...prev, rootFolder: tree }))
      }
      setHydrated(true)
      logger.info('[FileStore] hydrated=true；来源 = 磁盘 Vault', root)
    }

    // 从未选过 Vault（首启）/ 已记录的 Vault 已失效 → 采用**安装向导指定的默认存储位置**
    // （若有；路径不存在时 setup 层已过滤为 null），再不行才回退 IndexedDB。
    const adoptSetupVaultOrIdb = () => {
      platform.setup
        .defaultVault()
        .then((setupVault) => {
          if (cancelled) return
          if (!setupVault) {
            hydrateFromIdb()
            return
          }
          logger.info('[FileStore] 采用安装向导指定的默认存储位置：', setupVault)
          // ⚠️ 采用新 Vault 的同时，仍要检查 IDB 里有没有旧笔记 —— 有则给一次性迁移入口，
          //    否则它们会「消失」在新 Vault 之外（用户以为丢了）。
          loadStateAsync(language)
            .then((s) => {
              if (!cancelled) detectLegacyIdbNotes(s ? stripLegacyUsageDocTabs(s) : null)
            })
            .catch(() => {
              /* 读不到就没什么可迁移的 */
            })
          return hydrateFromVault(setupVault).catch((err) => {
            logger.error('[FileStore] 采用安装默认 Vault 失败，回退 IndexedDB：', err)
            hydrateFromIdb()
          })
        })
        .catch(() => {
          if (!cancelled) hydrateFromIdb()
        })
    }

    // 历史 lastVault → 失效则转「安装向导默认位置」→ 再不行才 IndexedDB
    const adoptLastVaultOrIdb = () => {
      const lastVault = readLastVault()
      if (lastVault) {
        hydrateFromVault(lastVault).catch((err) => {
          // ⚠️ 已记录的 Vault 失效（目录被删/移动/在已拔出的盘上）时，**不要直接落 IndexedDB** ——
          // 那样笔记会静默存进应用内部、用户在自己的文件夹里永远看不到（正是「新建文件后
          // 文件夹还是空的」的成因）。改为再试安装向导指定的默认位置，最后才回退 IDB。
          logger.error('[FileStore] 已记录的 Vault 不可用，改试安装向导默认位置：', err)
          adoptSetupVaultOrIdb()
        })
        return
      }
      adoptSetupVaultOrIdb()
    }

    if (platform.kind === 'electron') {
      // ⚠️ 安装向导指定的存储位置**优先于历史 lastVault**。
      //    用户在安装时明确选了目录，若被上一版遗留的 lastVault 压住，新建的文件就会落到
      //    旧目录、用户在自己选的新目录里永远看不到 —— 正是「新建文件后文件夹是空的」成因。
      //    只在「该选择尚未采用过」时生效一次（读/写 markcraft.setupVaultApplied 标记）→
      //    之后用户在应用内改的目录仍然优先。
      platform.setup
        .defaultVault()
        .then((setupVault) => {
          if (cancelled) return
          if (setupVault && setupVault !== readSetupVaultApplied()) {
            markSetupVaultApplied(setupVault)
            persistVaultRoot(setupVault)
            logger.info('[FileStore] 采用安装向导指定的默认存储位置：', setupVault)
            // 采用新 Vault 的同时，仍要检查 IDB 里有没有旧笔记 —— 有则给一次性迁移入口，
            // 否则它们会「消失」在新 Vault 之外（用户以为丢了）。
            loadStateAsync(language)
              .then((s) => {
                if (!cancelled) detectLegacyIdbNotes(s ? stripLegacyUsageDocTabs(s) : null)
              })
              .catch(() => {
                /* 读不到就没什么可迁移的 */
              })
            return hydrateFromVault(setupVault).catch((err) => {
              logger.error('[FileStore] 采用安装默认 Vault 失败，回退历史记录：', err)
              adoptLastVaultOrIdb()
            })
          }
          adoptLastVaultOrIdb()
        })
        .catch(() => {
          if (!cancelled) adoptLastVaultOrIdb()
        })
      return () => { cancelled = true }
    }

    hydrateFromIdb()
    return () => { cancelled = true }
  }, [language])

  // 自动保存状态
  // ⚠️ hydrated 之前不回存：此时 state 可能还是 T0，早于 IndexedDB 读取返回写入会**覆盖
  //    用户真实的旧树**（比「进库 0 篇」更严重的静默数据丢失）。读取结束后立即恢复保存。
  useEffect(() => {
    if (!hydrated) return;
    // ⚠️ 落盘前剥掉瞬态标签（内置使用文档，见 stripTransientTabs 的说明）——
    //    「看着说明书时刷新」不得把说明书记成「上次打开的文档」。
    const toPersist = stripTransientTabs(state)
    if (platform.kind === 'electron' && vaultRoot) {
      // 桌面 Vault 模式：内存树增量写回真实磁盘（P4，磁盘为真相源，不再写内部存储）
      // ⚠️ onError 不可省：写盘失败（如目录中途变只读 / 被外部删除）必须冒到 UI
      syncTree(toPersist.rootFolder, vaultRoot, (err) => {
        logger.error('[FileStore] 写盘失败：', err)
        setVaultError((prev) => prev ?? { path: vaultRoot })
      })
      // 会话态（标签页/活动标签/侧栏）独立落盘（2026-11-03 审查 P1）：树以磁盘为真相源
      // 不冲突，但此前这里直接 return 导致**重启后标签全丢**。
      const sessionTabs = toPersist.tabs
        .map((t) => {
          const rel = pathOfNode(toPersist.rootFolder, t.fileId)
          return rel ? { path: rel, name: t.name } : null
        })
        .filter((t): t is { path: string; name: string } => t !== null)
      const activeRel = toPersist.activeTabId
        ? pathOfNode(toPersist.rootFolder, toPersist.tabs.find((t) => t.id === toPersist.activeTabId)?.fileId ?? '')
        : null
      void saveSessionSnapshot({
        tabs: sessionTabs,
        activeTabPath: activeRel,
        searchQuery: toPersist.searchQuery,
        sidebarVisible: toPersist.sidebarVisible,
      })
      return
    }
    saveState(toPersist);
  }, [state, hydrated, vaultRoot]);

  // —— P4-C：外部文件改动监听 ——
  // 桌面端选中 Vault 后挂上 fs.watch；外部（资源管理器 / git / IDE）改了 .md 或
  // 增删目录 → 防抖 500ms → loadVault 重建内存树 + resetSync（清基线，避免接下来
  // save effect 把刚 reload 的全树再写一遍）→ setState。文件树立刻跟随。
  // 冲突策略（2026-11-08 H-7）：只有 `isDirty`（确有未落盘编辑）的标签才由
  // mergeUnsavedEdits 保留内存版本并写回；纯外部改动（标签非 dirty）一律采用磁盘新内容，
  // 不会再被内存旧内容覆盖写回，外部修改不再丢失。双方同时改动同一文件时仍以本地编辑
  // 优先（MVP 权衡，完整冲突解决留待 P4-C+），但至少不会静默吞掉纯外部改动。
  useEffect(() => {
    if (platform.kind !== 'electron' || !vaultRoot) return
    let cancelled = false
    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    const reload = () => {
      if (cancelled) return
      loadVault(vaultRoot)
        .then((tree) => {
          if (cancelled) return
          resetSync(tree, vaultRoot)
          setState((prev) => {
            // ⚠️ 安全网：重载会为同一批文件生成**全新 id**。若标签页仍拿着旧 id，
            //    后续所有编辑都会因「按 id 找不到节点」被静默丢弃（真实事故：内容只剩前半截）。
            //    这里按**相对路径**把旧 id 重映射到新 id，保证打开中的标签页继续有效。
            const remap = buildIdRemap(prev.rootFolder, tree)

            // —— 未落盘编辑保护（2026-11-03 审查 P1；2026-11-08 H-7 收口）——
            // 触发场景：用户输入 → state 更新 → syncTree 的 300ms 防抖未到盘 → 外部事件
            // 触发 reload → loadVault 从磁盘读到旧内容 → setState 整树替换 → 这批编辑
            // 从 state 和磁盘**双双消失**。mergeUnsavedEdits 仅对 `isDirty` 标签保留内存
            // 版本并回传其新 id 以维持 isDirty（下次 save effect 写回磁盘）；非 dirty 标签
            // 一律采用磁盘内容，避免用旧内容覆盖外部改动（H-7）。
            const { root: nextRoot, dirtyNewIds } = mergeUnsavedEdits(prev.rootFolder, tree, prev.tabs)
            const dirtyByNewId = dirtyNewIds

            if (remap.size === 0) {
              return { ...prev, rootFolder: nextRoot }
            }
            return {
              ...prev,
              rootFolder: nextRoot,
              tabs: prev.tabs.map((t) => {
                if (!remap.has(t.fileId)) return t
                const newId = remap.get(t.fileId)!
                return {
                  ...t,
                  fileId: newId,
                  isDirty: dirtyByNewId.has(newId) ? true : t.isDirty,
                }
              }),
            }
          })
          logger.info('[FileStore] 外部改动触发 Vault reload：', vaultRoot)
        })
        .catch((err) => logger.error('[FileStore] 外部改动 reload 失败：', err))
    }
    const unsubscribe = platform.fs.watch(vaultRoot, (event) => {
      // 只对 .md 与目录事件做整树重载：其它类型（临时文件、非笔记文件）与树无关，
      // 让它们触发重载只会白白换掉全部节点 id（进而让打开中的标签页失效）。
      const lower = (event?.path || '').toLowerCase()
      if (lower && /\.[a-z0-9]+$/.test(lower) && !lower.endsWith('.md') && !lower.endsWith('.markdown')) {
        return
      }
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(reload, 500)
    })
    return () => {
      cancelled = true
      if (reloadTimer) clearTimeout(reloadTimer)
      unsubscribe()
    }
  }, [vaultRoot]);

  // 一次性净化：清掉**历史遗留在「最近文件」里的内置使用文档条目**。
  //
  // 这些条目是旧版 openFile「无条件 addRecentFile」的产物。留着的危害不只是「最近列表多一条」：
  // 编辑器内文件树的最近列表有 hiddenIds 过滤（看不见），但另有两处**直接读 getRecentFiles()**
  // 的消费者看不到该过滤 —— ① 欢迎页「继续《…》」取 `getRecentFiles()[0]` 当英雄卡；
  // ② 格式工具条的「插入双链」用最近文件名做候选。两者都会把写死的说明书当成用户文档。
  //
  // 幂等：没有命中时零写入；跑在 hydrated 之后（需要权威树才能算出 builtinFileIds 集合）。
  useEffect(() => {
    if (!hydrated) return;
    const builtin = resolveUsageDocsScope(stateRef.current.rootFolder).builtinFileIds;
    if (builtin.size === 0) return;
    for (const f of getRecentFiles()) {
      if (builtin.has(f.fileId)) removeRecentFile(f.fileId);
    }
  }, [hydrated]);

  // 一次性迁移：添加知识链接体系指南
  useEffect(() => {
    const MIGRATION_KEY = 'markcraft-link-guide-added';
    if (localStorage.getItem(MIGRATION_KEY)) return;
    // ⚠️ 磁盘 Vault 模式跳过（2026-11-03 审查 P2）：Vault 是用户自己的目录，
    //    应用不应未经确认往里塞 .md 文件。该迁移只服务「从 IndexedDB 继承旧树」的
    //    浏览器/内部存储形态；Vault 用户要指南可以自己从知识库打开。
    if (platform.kind === 'electron' && vaultRoot) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    const isEn = language === 'en';
    const guideName = isEn ? 'Knowledge Linking Guide.md' : '知识链接体系指南.md';

    // 检查是否已存在
    const checkExists = (node: FileNode): boolean => {
      if (node.type === 'file' && (node.name === guideName || node.name === '知识链接体系指南.md' || node.name === 'Knowledge Linking Guide.md')) return true;
      return node.children?.some(checkExists) ?? false;
    };

    if (checkExists(state.rootFolder)) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    // 找到包含内置文档的文件夹
    const guideContent = isEn ? knowledgeLinkGuideContentEn : knowledgeLinkGuideContentZh;
    const newFileId = generateId();

    const addGuide = (node: FileNode): FileNode => {
      if (node.type === 'folder' && node.children) {
        const hasDocs = node.children.some(
          c => c.type === 'file' && (
            c.name.includes('手册') || c.name.includes('Manual') ||
            c.name.includes('教程') || c.name.includes('Tutorial')
          )
        );
        if (hasDocs) {
          return {
            ...node,
            children: [...node.children, {
              id: newFileId,
              name: guideName,
              type: 'file' as const,
              content: guideContent,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }],
          };
        }
        return { ...node, children: node.children.map(addGuide) };
      }
      return node;
    };

    setState(prev => ({ ...prev, rootFolder: addGuide(prev.rootFolder) }));
    localStorage.setItem(MIGRATION_KEY, '1');
    // 只运行一次：MIGRATION_KEY 幂等守卫使重复运行零写入，补 deps 顺带修复
    // 「语言在首帧后才就绪时建错语言指南」与「两阶段初始化覆盖 rootFolder 后的过期读取」
  }, [language, state.rootFolder, vaultRoot]);

  const getActiveFileContent = useCallback((): string | null => {
    if (!state.activeTabId) return null;
    const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
    if (!activeTab) return null;
    const fileNode = findNode(state.rootFolder, activeTab.fileId);
    return fileNode?.content !== undefined ? fileNode.content : null;
  }, [state.activeTabId, state.tabs, state.rootFolder]);

  const getActiveFileId = useCallback((): string | null => {
    if (!state.activeTabId) return null;
    const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
    return activeTab?.fileId || null;
  }, [state.activeTabId, state.tabs]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  // V5-L4: Use fine-grained dependencies instead of entire state object
  const getSearchResults = useCallback((): FileNode[] => {
    if (!state.searchQuery) return [];
    return searchFiles(state.rootFolder, state.searchQuery);
  }, [state.searchQuery, state.rootFolder]);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({
      ...prev,
      sidebarVisible: !prev.sidebarVisible,
    }));
  }, []);

  /** 打开一个文件夹作为 Vault（桌面端）；浏览器 / 取消选择时无副作用 */
  const openVault = useCallback(async (): Promise<void> => {
    if (platform.kind !== 'electron') return
    const root = await platform.dialog.openDirectory()
    if (!root) return
    // ⚠️ 先预检可写性：选到只读目录时直接拒绝 + 告警，避免进入静默失败状态
    const writable = await checkVaultWritable(root)
    if (!writable) {
      logger.error('[FileStore] 所选文件夹不可写：', root)
      setVaultError({ path: root })
      return
    }
    try {
      const tree = await loadVault(root)
      setVaultRoot(root)
      persistVaultRoot(root)
      resetSync(tree, root)
      setState((prev) => ({ ...prev, rootFolder: tree }))
      setHydrated(true)
      setVaultError(null)
      logger.info('[FileStore] 已打开 Vault：', root)
    } catch (err) {
      logger.error('[FileStore] 打开 Vault 失败：', err)
      setVaultError({ path: root })
    }
  }, [setState]);

  /** 关闭「文件夹不可写」告警 */
  const dismissVaultError = useCallback((): void => {
    setVaultError(null)
  }, []);

  /** 忽略旧数据迁移提示（不再弹；不影响已有 IDB 数据） */
  const dismissLegacyMigration = useCallback((): void => {
    try { localStorage.setItem(LEGACY_MIGRATION_DISMISSED, '1') } catch { /* localStorage 不可用则忽略 */ }
    setLegacyMigration(null)
  }, [])

  /**
   * P4-D：把当前（IndexedDB）树里的全部笔记写成真实 `.md` 落到用户选定文件夹，并采用为 Vault。
   * - **保留 IDB 不破坏**：只读内存树写盘，不删 IDB（迁移失败/后悔都可回退）。
   * - 跳过内置「使用文档」（builtinFileIds），它们不该落成真实文件。
   */
  const migrateLegacyToVault = useCallback(async (): Promise<void> => {
    if (platform.kind !== 'electron') return
    const root = await platform.dialog.openDirectory()
    if (!root) return
    // 迁移前同样预检可写性 —— 否则「迁移成功」的假象会让用户以为笔记已安全落盘
    if (!(await checkVaultWritable(root))) {
      logger.error('[FileStore] 迁移目标文件夹不可写：', root)
      setVaultError({ path: root })
      return
    }
    try {
      const builtin = resolveUsageDocsScope(stateRef.current.rootFolder).builtinFileIds
      const notes = flattenNotes(stateRef.current.rootFolder, builtin)
      const sep = root.includes('\\') ? '\\' : '/'
      await platform.fs.mkdir(root).catch(() => {})
      for (const n of notes) {
        await platform.fs.writeFile(`${root}${sep}${n.relPath.split('/').join(sep)}`, n.content)
      }
      // 采用为 Vault：从磁盘回读建树（与 openVault 同一收尾路径）
      const tree = await loadVault(root)
      setVaultRoot(root)
      persistVaultRoot(root)
      resetSync(tree, root)
      setState((prev) => ({ ...prev, rootFolder: tree }))
      setLegacyMigration(null)
      try { localStorage.setItem(LEGACY_MIGRATION_DISMISSED, '1') } catch { /* ignore */ }
      logger.info('[FileStore] 旧笔记已迁移到 Vault：', root, `(${notes.length} 篇)`)
    } catch (err) {
      logger.error('[FileStore] 迁移到 Vault 失败：', err)
    }
  }, [setState]);

  const contextValue: FileManagerContextType = {
    rootFolder: state.rootFolder,
    hydrated,
    vaultRoot,
    openVault,
    legacyMigration,
    vaultError,
    dismissVaultError,
    migrateLegacyToVault,
    dismissLegacyMigration,
    searchQuery: state.searchQuery,
    sidebarVisible: state.sidebarVisible,
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    createFile: fileActions.createFile,
    createFolder: fileActions.createFolder,
    renameNode: fileActions.renameNode,
    deleteNode: fileActions.deleteNode,
    batchDeleteNodes: fileActions.batchDeleteNodes,
    toggleFolder: fileActions.toggleFolder,
    moveNode: fileActions.moveNode,
    isDescendant: fileActions.isDescendant,
    openFile: tabActions.openFile,
    closeTab: tabActions.closeTab,
    closeAllTabs: tabActions.closeAllTabs,
    switchTab: tabActions.switchTab,
    reorderTabs: tabActions.reorderTabs,
    closeOtherTabs: tabActions.closeOtherTabs,
    closeTabsToRight: tabActions.closeTabsToRight,
    closeTransientTabs: tabActions.closeTransientTabs,
    updateFileContent: fileActions.updateFileContent,
    getFileContent: fileActions.getFileContent,
    getActiveFileContent,
    getActiveFileId,
    markTabDirty: tabActions.markTabDirty,
    isAnyTabDirty: tabActions.isAnyTabDirty,
    setSearchQuery,
    getSearchResults,
    toggleSidebar,
  };

  return (
    <FileManagerContext.Provider value={contextValue}>
      {children}
    </FileManagerContext.Provider>
  );
};

export function useFileManager(): FileManagerContextType {
  const context = useContext(FileManagerContext);
  if (!context) {
    throw new Error('useFileManager must be used within a FileManagerProvider');
  }
  return context;
}
