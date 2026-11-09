import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import dns from 'node:dns'
import {
  assertSafeFetchUrl,
  assertPublicHostLiteral,
  assertPublicHostResolved,
  isBlockedIp,
  safeFetch,
  MAX_NET_REDIRECTS,
  pinningLookup,
  makePinnedAgent,
  resolvePublicAddresses,
} from '../../electron/main/netGuard'

/**
 * 回归锁（2026-11-03 审查 P1，SSRF；2026-11-08 上线前审查 H-1/H-2 加固）。
 * `mc:net:fetch` 由渲染进程传 url 给主进程代发（不受 CORS），不约束即可扫描本机端口、
 * 读云元数据（169.254.169.254）、外传数据。本文件锁死：协议白名单、公网 IP 判定
 * （含 IPv4-mapped IPv6 等漏网段）、DNS 解析结果复查、重定向逐跳校验与显式逃生口。
 */
describe('netGuard · 协议白名单', () => {
  it('http/https 放行', () => {
    expect(assertSafeFetchUrl('https://api.github.com/user').hostname).toBe('api.github.com')
    expect(assertSafeFetchUrl('http://example.com/x').protocol).toBe('http:')
  })

  it('file / data / javascript / ftp 一律拒绝', () => {
    for (const url of [
      'file:///C:/Windows/win.ini',
      'data:text/html,<script>alert(1)</script>',
      'javascript:alert(1)',
      'ftp://example.com/x',
    ]) {
      expect(() => assertSafeFetchUrl(url), url).toThrow(/NET_BAD_URL/)
    }
  })

  it('非法 URL 拒绝', () => {
    expect(() => assertSafeFetchUrl('not a url')).toThrow(/NET_BAD_URL/)
  })
})

describe('netGuard · 内网/本机地址拒绝', () => {
  it('回环与内网段全部拒绝', () => {
    for (const host of [
      '127.0.0.1',
      '127.1.2.3',
      'localhost',
      '0.0.0.0',
      '10.0.0.5',
      '192.168.1.1',
      '172.16.0.1',
      '172.31.255.255',
      '169.254.169.254', // 云元数据
    ]) {
      expect(() => assertPublicHostLiteral(host), host).toThrow(/NET_BLOCKED_HOST/)
    }
  })

  it('IPv6 回环与 ULA 拒绝', () => {
    for (const host of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1']) {
      expect(() => assertPublicHostLiteral(host), host).toThrow(/NET_BLOCKED_HOST/)
    }
  })

  it('公网 IP / 域名放行（172.32 不在私网段）', () => {
    for (const host of ['8.8.8.8', '172.32.0.1', 'api.github.com']) {
      expect(() => assertPublicHostLiteral(host), host).not.toThrow()
    }
  })

  it('[H-1 反例] IPv4-mapped IPv6 不得绕过（::ffff:127.0.0.1 / 云元数据）', () => {
    for (const host of [
      '::ffff:127.0.0.1',
      '[::ffff:127.0.0.1]',
      '::ffff:7f00:1',
      '::ffff:169.254.169.254',
      '::127.0.0.1',
    ]) {
      expect(() => assertPublicHostLiteral(host), host).toThrow(/NET_BLOCKED_HOST/)
    }
  })

  it('[H-1 反例] CGNAT / IETF / benchmark / 组播 / 保留段全部拒绝', () => {
    for (const host of [
      '100.64.0.1', '100.127.255.255',
      '192.0.0.1', '198.18.0.1', '198.19.255.255',
      '224.0.0.1', '240.0.0.1', '255.255.255.255',
    ]) {
      expect(isBlockedIp(host), host).toBe(true)
      expect(() => assertPublicHostLiteral(host), host).toThrow(/NET_BLOCKED_HOST/)
    }
  })

  it('[H-1] 公网 IPv6 全局单播放行，文档保留段拒绝', () => {
    expect(isBlockedIp('2606:4700::1111')).toBe(false)
    expect(isBlockedIp('2001:db8::1')).toBe(true)
    expect(() => assertPublicHostLiteral('2001:db8::1')).toThrow(/NET_BLOCKED_HOST/)
  })

  it('[H-1] localhost 子域与尾点形态拒绝', () => {
    for (const host of ['LOCALHOST', 'localhost.', 'foo.localhost']) {
      expect(() => assertPublicHostLiteral(host), host).toThrow(/NET_BLOCKED_HOST/)
    }
  })

  it('逃生口：MARKCRAFT_ALLOW_PRIVATE_NET=1 时放行内网', () => {
    const prev = process.env.MARKCRAFT_ALLOW_PRIVATE_NET
    process.env.MARKCRAFT_ALLOW_PRIVATE_NET = '1'
    try {
      expect(() => assertPublicHostLiteral('192.168.1.10')).not.toThrow()
      expect(assertSafeFetchUrl('http://127.0.0.1:11434/api/tags').hostname).toBe('127.0.0.1')
    } finally {
      if (prev === undefined) delete process.env.MARKCRAFT_ALLOW_PRIVATE_NET
      else process.env.MARKCRAFT_ALLOW_PRIVATE_NET = prev
    }
  })
})

describe('netGuard · DNS 解析结果复查（fail-closed）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('[H-1] 解析到私网 → 拒绝', async () => {
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '10.0.0.5', family: 4 }])
    await expect(assertPublicHostResolved('evil.example.com')).rejects.toThrow(/NET_BLOCKED_HOST/)
  })

  it('[H-1] 解析到公网 → 放行', async () => {
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    await expect(assertPublicHostResolved('example.com')).resolves.toBeUndefined()
  })

  it('[M-3 反例] 解析失败不得静默放行', async () => {
    vi.spyOn(dns.promises, 'lookup').mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }))
    await expect(assertPublicHostResolved('unknown.example.com')).rejects.toThrow(/NET_DNS_FAILED/)
  })

  it('[H-1] 字面 IPv6 也要走复查（旧实现含冒号直接 return）', async () => {
    await expect(assertPublicHostResolved('::ffff:127.0.0.1')).rejects.toThrow(/NET_BLOCKED_HOST/)
  })
})

describe('netGuard · 重定向逐跳复查', () => {
  beforeEach(() => {
    // jsdom/CI 不保证外网 DNS；预检改 fail-closed 后必须打桩，否则域名请求一律 NET_DNS_FAILED
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('302 跳到内网地址 → 拒绝（redirect: follow 时代的绕过点）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://169.254.169.254/latest/meta-data/' },
        }),
      ),
    )
    await expect(safeFetch('https://evil.example.com/x', {})).rejects.toThrow(/NET_BLOCKED_HOST/)
  })

  it('302 跳到公网 → 跟随并降级为 GET（不重放 POST body）', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init: RequestInit) => {
        calls.push({ url: String(url), init })
        if (calls.length === 1) {
          return new Response(null, { status: 302, headers: { location: 'https://cdn.example.com/ok' } })
        }
        return new Response('ok', { status: 200 })
      }),
    )
    const res = await safeFetch('https://api.example.com/upload', { method: 'POST', body: 'secret' })
    expect(res.status).toBe(200)
    expect(calls).toHaveLength(2)
    expect(calls[1].init.method).toBe('GET')
    expect(calls[1].init.body).toBeUndefined()
  })

  it('[M-2 反例] 307/308 保留 method 与 body，不静默降级 GET', async () => {
    const calls: Array<{ init: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string | URL, init: RequestInit) => {
        calls.push({ init })
        if (calls.length === 1) {
          return new Response(null, { status: 307, headers: { location: 'https://cdn.example.com/ok' } })
        }
        return new Response('ok', { status: 200 })
      }),
    )
    await safeFetch('https://api.example.com/upload', { method: 'PUT', body: 'payload' })
    expect(calls).toHaveLength(2)
    expect(calls[1].init.method).toBe('PUT')
    expect(calls[1].init.body).toBe('payload')
  })

  it('[M-1 反例] 跨 origin 重定向剥离认证头', async () => {
    const calls: Array<{ init: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string | URL, init: RequestInit) => {
        calls.push({ init })
        if (calls.length === 1) {
          return new Response(null, { status: 302, headers: { location: 'https://attacker.example.com/ok' } })
        }
        return new Response('ok', { status: 200 })
      }),
    )
    await safeFetch('https://api.example.com/x', {
      headers: { authorization: 'Bearer SECRET', cookie: 'sid=SECRET', 'x-trace': 'keep' },
    })
    const h = new Headers(calls[1].init.headers)
    expect(h.get('authorization')).toBeNull()
    expect(h.get('cookie')).toBeNull()
    expect(h.get('x-trace')).toBe('keep')
  })

  it('[M-2 反例] signal 透传到每一跳，超时保护整链有效', async () => {
    const calls: Array<{ init: RequestInit }> = []
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string | URL, init: RequestInit) => {
        calls.push({ init })
        if (calls.length === 1) {
          return new Response(null, { status: 302, headers: { location: 'https://cdn.example.com/ok' } })
        }
        return new Response('ok', { status: 200 })
      }),
    )
    await safeFetch('https://api.example.com/x', { signal: controller.signal })
    expect(calls).toHaveLength(2)
    expect(calls[1].init.signal).toBe(controller.signal)
  })

  it('[M-4 反例] 禁止 https 降级到 http', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(null, { status: 302, headers: { location: 'http://api.example.com/plain' } }),
      ),
    )
    await expect(safeFetch('https://api.example.com/x', {})).rejects.toThrow(/NET_PROTOCOL_DOWNGRADE/)
  })

  it('重定向超过上限 → NET_TOO_MANY_REDIRECTS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://loop.example.com/next' } })),
    )
    await expect(safeFetch('https://loop.example.com/start', {})).rejects.toThrow(/NET_TOO_MANY_REDIRECTS/)
    expect(MAX_NET_REDIRECTS).toBe(5)
  })
})

describe('netGuard · [H-2] 固定 IP 防 DNS rebinding TOCTOU', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('pinningLookup 忽略传入主机名、只返回已校验地址（all 模式）', () => {
    const pinned: dns.LookupAddress[] = [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:4700::1111', family: 6 },
    ]
    const lookup = pinningLookup(pinned)
    // 攻击者传入一个全新恶意主机名 —— lookup 必须仍只返回预检阶段已校验的地址，
    // 绝不按该主机名重新解析（这正是堵死 TTL=0 换 IP 的 TOCTOU 窗口的关键）。
    let got: unknown = null
    lookup('attacker-changes-ip.example.com', { all: true }, (_err, addr) => {
      got = addr
    })
    expect(got).toEqual([
      { address: '93.184.216.34', family: 4 },
      { address: '2606:4700::1111', family: 6 },
    ])
  })

  it('pinningLookup 单地址模式返回首个地址与 family', () => {
    const pinned: dns.LookupAddress[] = [{ address: '93.184.216.34', family: 4 }]
    const lookup = pinningLookup(pinned)
    let addr: string | undefined
    let fam: number | undefined
    lookup('anything.example.com', undefined, (_e, a, f) => {
      addr = a as string
      fam = f
    })
    expect(addr).toBe('93.184.216.34')
    expect(fam).toBe(4)
  })

  it('resolvePublicAddresses 字面公网 IP → 返回该地址', async () => {
    const addrs = await resolvePublicAddresses('93.184.216.34')
    expect(addrs).toEqual([{ address: '93.184.216.34', family: 4 }])
  })

  it('resolvePublicAddresses 私网字面 IP → 抛错', async () => {
    await expect(resolvePublicAddresses('127.0.0.1')).rejects.toThrow(/NET_BLOCKED_HOST/)
  })

  it('resolvePublicAddresses 逃生口 → 返回空数组（不校验、不固定）', async () => {
    const prev = process.env.MARKCRAFT_ALLOW_PRIVATE_NET
    process.env.MARKCRAFT_ALLOW_PRIVATE_NET = '1'
    try {
      expect(await resolvePublicAddresses('127.0.0.1')).toEqual([])
    } finally {
      if (prev === undefined) delete process.env.MARKCRAFT_ALLOW_PRIVATE_NET
      else process.env.MARKCRAFT_ALLOW_PRIVATE_NET = prev
    }
  })

  it('makePinnedAgent 返回可 close 的 Agent（域名保留 servername 作 SNI）', () => {
    const agent = makePinnedAgent([{ address: '93.184.216.34', family: 4 }], 'example.com')
    expect(typeof agent.close).toBe('function')
    return agent.close()
  })

  it('safeFetch 把已校验地址通过 dispatcher 固定传给 fetch（不再二次 DNS）', async () => {
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    const fetchCalls: Array<{ dispatcher?: unknown }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u: string | URL, init: { dispatcher?: unknown }) => {
        fetchCalls.push(init)
        return new Response('ok', { status: 200 })
      }),
    )
    const res = await safeFetch('https://api.example.com/x', {})
    expect(res.status).toBe(200)
    expect(fetchCalls.length).toBeGreaterThanOrEqual(1)
    expect(fetchCalls[0].dispatcher).toBeDefined()
    expect(typeof (fetchCalls[0].dispatcher as { close?: unknown }).close).toBe('function')
  })
})
