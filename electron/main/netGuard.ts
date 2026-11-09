import dns from 'node:dns'
import net from 'node:net'
import { Agent } from 'undici'

// Node 全局 fetch 的 `dispatcher` 选项来自 @types/node 内嵌的 undici-types，
// 与 npm `undici` 包自身的类型符号不同但运行时结构一致；用一次断言桥接。
type FetchDispatcher = NonNullable<RequestInit['dispatcher']>

/**
 * 主进程网络请求的目标校验（2026-11-03 审查 P1，SSRF 防护；2026-11-08 上线前审查加固）。
 *
 * 独立成模块的原因：① 这是安全关键逻辑，必须能脱离 Electron 单测；
 * ② `mc:net:fetch` 由渲染进程传 url 给主进程代发（不受 CORS），不约束即 SSRF ——
 *    扫描本机端口、访问云元数据（169.254.169.254）、携带任意头把数据外传。
 *
 * 三条约束：
 *   ① 协议白名单 http/https（拒绝 file:/data:/gopher: 等），且禁止 https→http 降级；
 *   ② 目标主机不得是本机/内网/保留地址 —— 字面 IP 与 DNS 解析结果走**同一套**
 *      「只允许公网」判定（不再用会漏网段的拒绝列表）；
 *   ③ 重定向逐跳复查（最多 5 跳），跳到内网同样被拦，跨 origin 剥离认证头。
 *
 * ⚠️ DNS rebinding（TOCTOU）：预检解析能拦「域名稳定解析到私网 IP」的静态情形、
 *   含 IPv4-mapped IPv6 等绕过；但早期实现里 `fetch` 实际连接仍按域名重新解析，TTL=0
 *   的攻击者域名可在「预检（公网 IP）」与「连接（127.0.0.1）」之间换 IP。
 *   **已彻底修复（H-2）**：解析 + 校验后立即把已确认安全的地址固定到 undici `Agent`
 *   的自定义 `connect.lookup`，实际连接**不再询问 DNS**、只用已校验地址，并把
 *   TLS `servername` 保留为原主机名（SNI 不被破坏）。TOCTOU 窗口被堵死。该修复
 *   引入 undici 作为直接依赖（dispatcher 固定 IP），已并入主进程打包。
 *   解析失败一律 fail-closed。
 *
 * 逃生口：环境变量 `MARKCRAFT_ALLOW_PRIVATE_NET=1`（用户确有内网自建端点时显式开启）。
 */
export const MAX_NET_REDIRECTS = 5

/** 非公网 IPv4 段（含闭区间端点，网络字节序整数比较）。 */
const BLOCKED_V4_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8 本网络
  [0x0a000000, 0x0affffff], // 10.0.0.0/8 私有
  [0x64400000, 0x647fffff], // 100.64.0.0/10 CGNAT
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8 回环
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 链路本地 + 云元数据
  [0xac100000, 0xac1fffff], // 172.16.0.0/12 私有
  [0xc0000000, 0xc00000ff], // 192.0.0.0/24 IETF 协议分配
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16 私有
  [0xc6120000, 0xc613ffff], // 198.18.0.0/15 基准测试
  [0xe0000000, 0xffffffff], // 224.0.0.0/4 组播 + 240.0.0.0/4 保留 + 广播
]

let warnedPrivateNet = false
export function allowPrivateNet(): boolean {
  const allowed = process.env.MARKCRAFT_ALLOW_PRIVATE_NET === '1'
  // 逃生口启用即等于关闭 SSRF 防护，须显式告警让运维/用户知情（仅提示一次）。
  if (allowed && !warnedPrivateNet) {
    warnedPrivateNet = true
    console.warn(
      '[netGuard] MARKCRAFT_ALLOW_PRIVATE_NET=1 已启用：已关闭内网/本机地址访问限制（SSRF 防护失效），仅在你确有内网自建端点时临时使用。',
    )
  }
  return allowed
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const v = Number(p)
    if (v > 255) return null
    n = (n * 256 + v) >>> 0
  }
  return n >>> 0
}

function isBlockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true
  return BLOCKED_V4_RANGES.some(([from, to]) => n >= from && n <= to)
}

/** 展开 IPv6 为 8 个 16 位组；兼容 `::ffff:127.0.0.1` 这种点分尾写法。 */
function expandIpv6(host: string): number[] | null {
  const lastColon = host.lastIndexOf(':')
  const tail = host.slice(lastColon + 1)
  let core = host
  if (tail.includes('.')) {
    const v = ipv4ToInt(tail)
    if (v === null) return null
    core = `${host.slice(0, lastColon + 1)}${((v >>> 16) & 0xffff).toString(16)}:${(v & 0xffff).toString(16)}`
  }
  const halves = core.split('::')
  if (halves.length > 2) return null
  const groupsOf = (s: string): number[] =>
    s === '' ? [] : s.split(':').map((x) => (x === '' ? NaN : parseInt(x, 16)))
  const left = groupsOf(halves[0])
  const right = halves.length === 2 ? groupsOf(halves[1]) : []
  if (left.some(Number.isNaN) || right.some(Number.isNaN)) return null
  if (halves.length === 1 && left.length !== 8) return null
  if (left.length + right.length > 8) return null
  return [...left, ...Array(8 - left.length - right.length).fill(0), ...right]
}

/** IPv4-mapped / IPv4-compatible IPv6 → 点分十进制，交给 IPv4 规则判定。 */
function mappedV4(host: string): string | null {
  const g = expandIpv6(host)
  if (!g) return null
  if (!g.slice(0, 5).every((x) => x === 0)) return null
  if (g[5] !== 0 && g[5] !== 0xffff) return null
  const n = ((g[6] << 16) | g[7]) >>> 0
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`
}

/**
 * 「只允许公网」判定：返回 true 表示该 IP 应被拒绝。
 * 未知形态 / 无法解析一律 true（fail-closed）。域名返回 false（交给 DNS 复查）。
 */
export function isBlockedIp(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  const version = net.isIP(h)
  if (version === 4) return isBlockedV4(h)
  if (version === 6) {
    const mapped = mappedV4(h)
    if (mapped) return isBlockedV4(mapped)
    const g = expandIpv6(h)
    if (!g) return true
    // 仅 2000::/3 全局单播放行；::1 / :: / fc00::/7 / fe80::/10 / ff00::/8 全否
    if ((g[0] & 0xe000) !== 0x2000) return true
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true // 文档保留段
    return false
  }
  return false
}

/** 字面 IP / localhost 直接拒绝（快路径，不做 DNS） */
export function assertPublicHostLiteral(hostname: string): void {
  if (allowPrivateNet()) return
  const h = hostname.replace(/^\[|\]$/g, '')
  const isLocalName = /^(localhost|localhost\.|[^.]+\.localhost)$/i.test(h)
  if (isLocalName || isBlockedIp(h)) {
    throw new Error(`NET_BLOCKED_HOST: 禁止访问本机/内网地址（${h}）`)
  }
}

/** undici connector 的 lookup 回调签名（与 Node `dns.lookup` 一致）。 */
type UndiciLookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number,
) => void

/**
 * 把一组「已校验过的地址」固定为连接目标，**完全跳过 DNS 重新解析**（H-2 核心）。
 * 攻击者用 TTL=0 域名在「预检解析」与「实际连接」间换 IP（预检公网、连接私网）的
 * 窗口被彻底堵死 —— 因为实际连接根本不再询问 DNS，只用预检阶段已确认安全的地址。
 * `options.all` 时返回完整数组（交由 undici 自行做 happy-eyeballs），否则返回首个。
 */
export function pinningLookup(pinned: dns.LookupAddress[]) {
  return (
    hostname: string,
    options: { all?: boolean } | undefined,
    callback: UndiciLookupCallback,
  ): void => {
    void hostname // 故意忽略入参主机名：绝不再按域名解析，只用已校验地址
    if (options?.all) {
      callback(null, pinned.map((a) => ({ address: a.address, family: a.family })))
    } else {
      const a = pinned[0]
      callback(null, a.address, a.family)
    }
  }
}

/** 为给定主机构造「固定 IP」dispatcher；`servername` 保留原主机名（TLS SNI 不被破坏）。 */
export function makePinnedAgent(pinned: dns.LookupAddress[], hostname: string): Agent {
  const isIp = net.isIP(hostname) !== 0
  return new Agent({
    connect: {
      lookup: pinningLookup(pinned),
      servername: isIp ? undefined : hostname,
    },
  })
}

/**
 * 解析域名并逐个校验地址是否公网；全部公网才放行，返回已校验地址列表。
 * 失败 / 任一地址私网 一律抛错（fail-closed）。`allowPrivateNet()` 逃生口下返回 `[]`（不校验）。
 * 这是 H-2 修复的「校验 + 取地址」单一来源，供 `safeFetch` 固定到 dispatcher。
 */
export async function resolvePublicAddresses(hostname: string): Promise<dns.LookupAddress[]> {
  if (allowPrivateNet()) return []
  const h = hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(h)) {
    assertPublicHostLiteral(h)
    return [{ address: h, family: net.isIP(h) }]
  }
  let addrs: dns.LookupAddress[]
  try {
    addrs = await dns.promises.lookup(h, { all: true })
  } catch {
    throw new Error(`NET_DNS_FAILED: 无法确认目标主机安全性（${h}）`)
  }
  for (const a of addrs) {
    if (isBlockedIp(a.address)) {
      throw new Error(`NET_BLOCKED_HOST: 目标域名解析到内网地址（${h} → ${a.address}）`)
    }
  }
  return addrs
}

/** 向后兼容：仅校验、不返回地址（旧调用方/单测仍可用）。 */
export async function assertPublicHostResolved(hostname: string): Promise<void> {
  await resolvePublicAddresses(hostname)
}

export function assertSafeFetchUrl(raw: string): URL {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new Error(`NET_BAD_URL: 非法 URL（${raw}）`)
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error(`NET_BAD_URL: 仅允许 http/https（收到 ${u.protocol}）`)
  }
  assertPublicHostLiteral(u.hostname)
  return u
}

/**
 * 带逐跳校验 + 固定 IP 的 fetch（重定向手动跟随）。
 *
 * H-2 修复要点：每一跳都先 `resolvePublicAddresses` 解析并校验，再把已确认安全的地址
 * 通过 undici `Agent` 的自定义 `connect.lookup` **固定**到实际连接（不再二次 DNS 解析），
 * 因此 TTL=0 攻击者域名无法在「预检」与「连接」之间换 IP。dispatcher 为逐跳临时 Agent，
 * 用完（读完响应体后）即 `close()` 释放 socket，不长期池化；终态把 body 完整缓冲成
 * 与 dispatcher 解耦的原生 `Response` 返回，避免 agent 泄漏。
 */
export async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  const initialProtocol = new URL(url).protocol
  let current = assertSafeFetchUrl(url)
  let currentInit: RequestInit = init
  const signal = init.signal
  for (let hop = 0; hop <= MAX_NET_REDIRECTS; hop++) {
    const pinned = await resolvePublicAddresses(current.hostname)
    const dispatcher: FetchDispatcher | undefined =
      pinned.length > 0
        ? (makePinnedAgent(pinned, current.hostname) as unknown as FetchDispatcher)
        : undefined
    let raw: Response
    try {
      raw = await fetch(current, { ...currentInit, redirect: 'manual', dispatcher })
    } catch (e) {
      if (dispatcher) await (dispatcher as unknown as Agent).close()
      throw e
    }
    if (raw.status >= 300 && raw.status < 400) {
      // 排空 3xx 响应体（释放 socket）后再关闭临时 agent
      await raw.arrayBuffer().catch(() => undefined)
      if (dispatcher) await dispatcher.close()
      const loc = raw.headers.get('location')
      if (!loc) return raw
      const nextUrl = new URL(loc, current).toString()
      if (initialProtocol === 'https:' && new URL(nextUrl).protocol !== 'https:') {
        throw new Error('NET_PROTOCOL_DOWNGRADE: 禁止 https 降级到 http')
      }
      const prevOrigin = current.origin
      current = assertSafeFetchUrl(nextUrl)
      const headers = new Headers(currentInit.headers)
      if (current.origin !== prevOrigin) {
        headers.delete('authorization')
        headers.delete('cookie')
        headers.delete('proxy-authorization')
      }
      // 307/308 保留 method 与 body；仅 301/302/303 降级 GET
      const keepMethod = raw.status === 307 || raw.status === 308
      currentInit = keepMethod
        ? { ...currentInit, headers, signal }
        : { method: 'GET', headers, body: undefined, signal }
      continue
    }
    // 终态：完整缓冲 body，关闭临时 agent，返回与 dispatcher 解耦的 Response
    const buf = Buffer.from(await raw.arrayBuffer())
    if (dispatcher) await dispatcher.close()
    return new Response(buf, {
      status: raw.status,
      statusText: raw.statusText,
      headers: raw.headers,
    })
  }
  throw new Error(`NET_TOO_MANY_REDIRECTS: 重定向超过 ${MAX_NET_REDIRECTS} 跳`)
}
