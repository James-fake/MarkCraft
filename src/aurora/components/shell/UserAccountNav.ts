// aurora/components/shell —— 用户账户导航上下文（ctx + 消费 hook，零依赖）。
//
// Phase 3（2026-09-18）自 aurora/app/UserAccountNav.ts **原样搬迁**（内容零改动）：
// Provider 方在 AuroraShell（app），消费方在 Sidebar（components/shell）——
// 定义寄居 app 会构成 components → app 反向边（环 #8 的第三条边）。
// 归入 components/shell 与既有先例一致：CommandPaletteContext 同理由 app+panels 共同向下引用。
// 文件自身注释即写明「侧栏头像属于常驻外壳 chrome」，落点随之归位。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 3.2。
import { createContext, useContext } from 'react'

/**
 * 用户账户导航上下文
 *
 * 侧栏头像属于常驻外壳 chrome（每个视图都有），其「点击 → 打开账户设置」行为
 * 在 AuroraShell 一处定义并向下提供，避免在每个面板的 PageFrame 调用里重复接线。
 */
export interface UserAccountNavValue {
  /** 打开账户设置（设置面板的「用户」分类） */
  open: () => void
}

export const UserAccountNavContext = createContext<UserAccountNavValue | null>(null)

/**
 * 消费账户导航。无 Provider 时回退为 no-op（如 Sidebar 独立测试），
 * 避免出现 undefined.open 崩溃。
 */
export function useUserAccountNav(): UserAccountNavValue {
  const ctx = useContext(UserAccountNavContext)
  return ctx ?? { open: () => {} }
}
