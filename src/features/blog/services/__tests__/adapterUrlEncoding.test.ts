import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * 回归锁（2026-11-08 审查 C 组）：owner/repo/branch 未 encodeURIComponent，
 * branch 含 `?`/`#`/`../` 时可造成查询注入或路径穿越。
 * 修复：URL 各段逐段编码（path segment），不编码整个 URL。
 */
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }))

vi.mock('../fetchWithTimeout', () => ({
  fetchWithTimeout: fetchMock,
  FetchTimeoutError: class FetchTimeoutError extends Error {},
}))

import { giteeAdapter } from '../giteeAdapter'
import { githubAdapter } from '../githubAdapter'

function ok(body: unknown = {}) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  }
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(ok())
})

describe('giteeAdapter · URL path segment 编码', () => {
  it('updateBranchRef 对 owner/repo/branch 逐段编码', async () => {
    await giteeAdapter.updateBranchRef('own/er', 're po', 'x?y#z', 'sha1', 'token')

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toBe(
      'https://gitee.com/api/v5/repos/own%2Fer/re%20po/git/refs/heads/x%3Fy%23z',
    )
  })

  it('branch 含 ../ 时被编码，URL 中不出现路径穿越', async () => {
    await giteeAdapter.updateBranchRef('o', 'r', '../../evil', 'sha1', 'token')

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('heads/..%2F..%2Fevil')
    expect(url).not.toContain('/../')
  })

  it('getBranchHead 的分支查询路径同样编码', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ default_branch: 'main' }))
      .mockResolvedValueOnce(ok({ commit: { sha: 'c1' } }))
      .mockResolvedValueOnce(ok({ tree: { sha: 't1' } }))

    const head = await giteeAdapter.getBranchHead('o', 'r', 'a?b', 'token')

    expect(head).toEqual({ commitSha: 'c1', treeSha: 't1' })
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://gitee.com/api/v5/repos/o/r/branches/a%3Fb',
    )
  })
})

describe('githubAdapter · URL path segment 编码', () => {
  it('updateBranchRef 对 owner/repo/branch 逐段编码', async () => {
    await githubAdapter.updateBranchRef('o/r', 'r x', 'a?b', 'sha2', 'token')

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toBe(
      'https://api.github.com/repos/o%2Fr/r%20x/git/refs/heads/a%3Fb',
    )
  })

  it('getBranchHead 的分支查询路径同样编码', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ default_branch: 'main' }))
      .mockResolvedValueOnce(ok({ object: { sha: 'c2' } }))
      .mockResolvedValueOnce(ok({ tree: { sha: 't2' } }))

    const head = await githubAdapter.getBranchHead('o', 'r', 'a?b', 'token')

    expect(head).toEqual({ commitSha: 'c2', treeSha: 't2' })
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.github.com/repos/o/r/git/ref/heads/a%3Fb',
    )
  })
})
