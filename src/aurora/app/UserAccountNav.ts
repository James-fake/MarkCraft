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
