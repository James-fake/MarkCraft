import type { UserProfile } from '@stores/UserProfileStore'

/**
 * 「先认识一下」档案引导的完成标记。
 *
 * 与 `firstRun.ts` 的播种标记分开：播种管的是「要不要给你写一篇欢迎笔记」，
 * 这里管的是「要不要问你叫什么、生日是哪天」。两者可以独立发生
 * （比如老用户升级后仍然值得被问一次名字）。
 */
export const PROFILE_ONBOARDING_KEY = 'markcraft.onboardingProfile.v1'

/**
 * 是否该展示档案引导。
 *
 * 判定「已经填过名字 → 不打扰」而不是只看标记：用户可能填完名字就直接点开
 * 左侧的文件开始写，从没按过「开始吧」。此时再弹一次问名字是纯粹的打扰。
 */
export function shouldShowProfileOnboarding(profile: Pick<UserProfile, 'nickname'>): boolean {
  if (profile.nickname.trim()) return false
  try {
    return localStorage.getItem(PROFILE_ONBOARDING_KEY) !== '1'
  } catch {
    // 隐私模式：读不到标记就按「该展示」处理（最坏情况是多问一次）
    return true
  }
}

/** 记录「已问过」（无论用户是填完还是跳过，都不再主动弹） */
export function markProfileOnboardingDone(): void {
  try {
    localStorage.setItem(PROFILE_ONBOARDING_KEY, '1')
  } catch {
    /* 写不进去也不影响本次结果 */
  }
}
