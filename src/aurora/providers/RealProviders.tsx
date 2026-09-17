// aurora/providers —— 真实运行时 Provider 地基（被装配层与测试夹具共同复用）。
//
// Phase 3（2026-09-18）自 aurora/app/RealProviders.tsx **原样搬迁**（内容零改动；
// 本文件对 stores/components/ui 的相对深度与旧位置相同，内部 import 无需调整）：
// 它被 AuroraShell（真实运行）与 12 个 .smoke.test.tsx（夹具）共用 ——
// 留在 app/ 会让「测试夹具寄居装配层」长期成立，并逼守卫为测试留例外。
// 移出后 panels → app / components → app 的边（含测试边）真正归零。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 3.3。
import type { ReactNode } from 'react'
import { LanguageProvider, useLanguage } from '../../stores/LanguageStore'
import { ModalProvider } from '../../stores/ModalStore'
import { UndoRedoProvider } from '../../stores/UndoRedoStore'
import { SettingsProvider } from '../../stores/SettingsStore'
import { FileManagerProvider, useFileManager } from '../../stores/FileStore'
import { LinkIndexProvider } from '../../stores/LinkIndexStore'
import { TagIndexProvider } from '../../stores/TagIndexStore'
import { BlockIndexProvider } from '../../stores/BlockIndexStore'
import { BookmarkProvider } from '../../stores/BookmarkStore'
import { NoteVersionProvider } from '../../stores/NoteVersionStore'
// 真实项目的 Toast / Confirm（真实 feature 组件依赖其 context；Aurora 外壳命令面板仍用 Aurora 原生 toast，两套 context 互不干扰）
import { ToastProvider } from '../../components/ui/ToastProvider'
import { ConfirmProvider } from '../../components/ui/ConfirmProvider'

// 模块级副作用：markdown 渲染配置 + katex 样式（原 App.tsx 顶部引入，真实 feature 渲染所必需）
import '../../services/markedConfig'
import 'katex/dist/katex.min.css'

/**
 * RealProviders —— 迁移 Phase 2 的地基层。
 *
 * 精确复刻 `src/App.tsx` 的 Provider 嵌套链（App.tsx:1684-1728），
 * 把原 `<AppContent />` 换成 `children`，使 Aurora 面板子树（含后续换芯的真实 feature）
 * 具备与真实 `/` 入口完全一致的运行时上下文。
 *
 * 刻意**不**搬迁 AppContent 的 40+ 命令注册、自动保存、键盘快捷键、崩溃恢复等
 * 旧壳副作用逻辑——那些属于"应用级"逻辑，将在 Phase 3（全局弹层与命令收口）按需接入。
 *
 * Provider 顺序（与真实 App 严格一致，避免 context 取值为 undefined）：
 *   Language > Modal(createFileTitle) > UndoRedo > Settings > FileManager
 *     > LinkIndex(rootFolder) > TagIndex(rootFolder) > BlockIndex(rootFolder)
 *       > Bookmark > NoteVersion > Toast(真实) > Confirm(真实) > children
 */
function ModalProviderWrapper({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  return <ModalProvider createFileTitle={t.createFileExtra.title}>{children}</ModalProvider>
}

function LinkIndexProviderWrapper({ children }: { children: ReactNode }) {
  const { rootFolder } = useFileManager()
  return (
    <LinkIndexProvider rootFolder={rootFolder}>
      <TagIndexProvider rootFolder={rootFolder}>
        <BlockIndexProvider rootFolder={rootFolder}>{children}</BlockIndexProvider>
      </TagIndexProvider>
    </LinkIndexProvider>
  )
}

export function RealProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ModalProviderWrapper>
        <UndoRedoProvider>
          <SettingsProvider>
            <FileManagerProvider>
              <LinkIndexProviderWrapper>
                <BookmarkProvider>
                  <NoteVersionProvider>
                    <ToastProvider>
                      <ConfirmProvider>{children}</ConfirmProvider>
                    </ToastProvider>
                  </NoteVersionProvider>
                </BookmarkProvider>
              </LinkIndexProviderWrapper>
            </FileManagerProvider>
          </SettingsProvider>
        </UndoRedoProvider>
      </ModalProviderWrapper>
    </LanguageProvider>
  )
}
