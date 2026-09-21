/**
 * push-gitee.cjs — 可靠推送到 Gitee（绕开会卡死的凭证助手）
 *
 * ── 为什么需要它（2026-09-21 实测记录）──────────────────────────────
 * 症状：裸 `git push` 长时间静默卡住 → 被上层工具按 SIGTERM 杀掉，
 *      表现为「整条命令无声死亡、连退出码都不打印」，且**远端其实没更新**。
 *      极易被误判为「管道误报」或「沙箱拦网」。
 *
 * 实测定因（不要再重复排查）：
 *   1) PortableGit 系统 gitconfig 设了 `credential.helper = helper-selector`；
 *      本机 ~/.gitconfig 里 `credential.helperselector.selected = manager`、
 *      `credential.https://gitee.com.provider = generic` ⇒ 实际转给 GCM 的 generic provider。
 *   2) 该链路在非交互会话下会**挂住不返回**：`git credential fill` 90s 也未返回
 *      （早前某次约 30–45s 能回，说明它不稳定 —— 不稳定就等于不可用）。
 *   3) 凭据本身**没丢**：Windows 凭据管理器里有
 *      `LegacyGeneric:target=git:https://gitee.com`（用户名 + 32 位 token）。
 *   4) 也**不是网络**：Node fetch 到 gitee 200 / ~465ms。
 *      但 `http_proxy=127.0.0.1:*` 会掐死 git 的 https ⇒ 需显式清空代理。
 *
 * ── 它做什么 ──────────────────────────────────────────────────────
 *   A. 优先**直读 Windows 凭据管理器**（CredRead，约 1s，确定性）；
 *      A 失败才退回 `git credential fill`（给足 60s）。
 *   B. 用**内联 URL** push，此后不再咨询凭证助手。
 *   C. 输出全程**脱敏**：token 不落 stdout、不落磁盘。
 *   D. 回写 `origin/master`（推内联 URL 不会更新 remote-tracking ref）。
 *   E. `ls-remote` 以**远端为准**复核 local == remote，并打印 divergence。
 *
 * ── 用法（在仓库根目录）───────────────────────────────────────────
 *   node scripts/push-gitee.cjs [branch]       # 默认 master
 *
 * ── 安全 ─────────────────────────────────────────────────────────
 *   本脚本**不含任何密钥**：凭据运行时读取，且只存在于内存。
 *   临时 .ps1 只有读取逻辑（无密钥），用完即删。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_URL = 'https://gitee.com/James-fake/markcraft.git';
const HOST = 'gitee.com';
const CRED_TARGET = 'git:https://gitee.com';
const BRANCH = process.argv[2] || 'master';

if (!fs.existsSync('.git')) {
  console.log('ABORT: 请在仓库根目录运行（当前目录找不到 .git）');
  process.exit(1);
}

const GITOPTS = {
  encoding: 'utf8',
  cwd: process.cwd(),
  env: Object.assign({}, process.env, { GIT_TERMINAL_PROMPT: '0' }),
};

// ── 策略 A：直读 Windows 凭据管理器（CredRead）────────────────────
// 注：PS 源码里没有 `${` 序列，可安全放进模板字符串。
const PS_SRC = `$ErrorActionPreference = 'Stop'
$src = @'
using System;
using System.Runtime.InteropServices;
public class McCred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type;
    public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public int CredentialBlobSize;
    public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes;
    public IntPtr TargetAlias; public IntPtr UserName;
  }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr credential);
  [DllImport("advapi32.dll")]
  public static extern void CredFree(IntPtr cred);
}
'@
Add-Type -TypeDefinition $src
$ptr = [IntPtr]::Zero
$ok = [McCred]::CredRead('${CRED_TARGET}', 1, 0, [ref]$ptr)
if (-not $ok) { Write-Output 'CREDREAD_FAIL'; exit 0 }
$c = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][McCred+CREDENTIAL])
$blob = New-Object byte[] $c.CredentialBlobSize
[Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $blob, 0, $c.CredentialBlobSize)
$user = [Runtime.InteropServices.Marshal]::PtrToStringUni($c.UserName)
$pass = [System.Text.Encoding]::Unicode.GetString($blob)
Write-Output ('USER=' + $user)
Write-Output ('PASS_B64=' + [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pass)))
[McCred]::CredFree($ptr)
`;

function pick(out, key) {
  const line = String(out || '').split(/\r?\n/).find((l) => l.startsWith(key + '='));
  return line ? line.slice(key.length + 1).trim() : '';
}

// bash 会话的 PATH 里通常没有 powershell.exe（它在 WindowsPowerShell\v1.0\），
// 所以必须按绝对路径探测，不能只写 'powershell'。
function resolvePowerShell() {
  const sysRoot = process.env.SystemRoot || 'C:\\Windows';
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const abs = [
    process.env.MC_PWSH,
    path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    path.join(pf, 'PowerShell', '7', 'pwsh.exe'),
  ].filter(Boolean);
  for (const exe of abs) { if (fs.existsSync(exe)) return exe; }
  return 'powershell'; // 最后退回裸名，交给 OS 解析
}

function viaWindowsCredManager(timeoutMs) {
  const tmp = path.join(os.tmpdir(), 'mc-credread-' + process.pid + '.ps1');
  fs.writeFileSync(tmp, PS_SRC);
  try {
    const t = Date.now();
    const exe = resolvePowerShell();
    const r = spawnSync(exe, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmp], {
      ...GITOPTS,
      timeout: timeoutMs,
    });
    const ms = Date.now() - t;
    const user = pick(r.stdout, 'USER');
    const b64 = pick(r.stdout, 'PASS_B64');
    if (r.error || !user || !b64) {
      const why = r.error ? r.error.message : (String(r.stdout || '').trim() || String(r.stderr || '').trim()).slice(0, 140);
      console.log('  [win-cred] FAIL ms=' + ms + ' (' + why + ')');
      return null;
    }
    console.log('  [win-cred] OK ms=' + ms);
    return { user, pass: Buffer.from(b64, 'base64').toString('utf8'), via: 'win-cred' };
  } finally {
    try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }
  }
}

// ── 策略 B：git credential fill（助手不稳定，给足 60s）──────────────
function viaGitHelper(timeoutMs) {
  const t = Date.now();
  const r = spawnSync('git', ['credential', 'fill'], {
    ...GITOPTS,
    input: 'protocol=https\nhost=' + HOST + '\n\n',
    timeout: timeoutMs,
  });
  const ms = Date.now() - t;
  const user = pick(r.stdout, 'username');
  const pass = pick(r.stdout, 'password');
  if (r.error || !user || !pass) {
    console.log('  [git-helper] FAIL ms=' + ms + ' (' + (r.error ? r.error.message : 'no cred') + ')');
    return null;
  }
  console.log('  [git-helper] OK ms=' + ms);
  return { user, pass, via: 'git-helper' };
}

console.log('== 1/3 解析凭证（绕开会挂住的 helper-selector）==');
const cred = viaWindowsCredManager(30000) || viaGitHelper(25000);
if (!cred) {
  console.log('NO_CREDENTIAL: 两条策略都失败。请检查 Windows 凭据管理器中的 ' + CRED_TARGET);
  process.exit(1);
}
console.log('cred=ok via=' + cred.via + ' user=' + cred.user + ' passLen=' + cred.pass.length);

// ── 2/3 push（清空代理；绕开助手）─────────────────────────────────
const enc = encodeURIComponent;
const inlineUrl = 'https://' + enc(cred.user) + ':' + enc(cred.pass) + '@' + HOST + '/James-fake/markcraft.git';

const t0 = Date.now();
const r = spawnSync('git', [
  '-c', 'credential.helper=',
  '-c', 'http.proxy=',
  '-c', 'https.proxy=',
  'push', inlineUrl, BRANCH,
], { ...GITOPTS, timeout: 180000 });

const redact = (s) => String(s || '')
  .split(cred.pass).join('***')
  .split(enc(cred.pass)).join('***')
  .split(inlineUrl).join(REPO_URL);

console.log('== 2/3 push ==');
console.log('PUSH_STATUS=' + (r.error ? 'ERR:' + r.error.message : r.status) + ' ms=' + (Date.now() - t0));
console.log('--- git stdout ---\n' + redact(r.stdout).trim());
console.log('--- git stderr ---\n' + redact(r.stderr).trim());
if (r.error || r.status !== 0) { console.log('PUSH_FAILED'); process.exit(1); }

// ── 3/3 回写 remote-tracking ref + 以远端为准复核 ──────────────────
const head = spawnSync('git', ['rev-parse', BRANCH], GITOPTS).stdout.trim();
const refFile = path.join('.git', 'refs', 'remotes', 'origin', BRANCH);
fs.mkdirSync(path.dirname(refFile), { recursive: true });
fs.writeFileSync(refFile, head + '\n');

const lsr = spawnSync('git', ['-c', 'credential.helper=', '-c', 'http.proxy=', '-c', 'https.proxy=', 'ls-remote', 'origin', BRANCH], GITOPTS);
const remoteHead = String(lsr.stdout || '').split(/\s+/)[0];
console.log('== 3/3 复核 ==');
console.log('local =' + head);
console.log('remote=' + remoteHead);
console.log('MATCH=' + (head === remoteHead));
console.log('divergence=' + spawnSync('git', ['rev-list', '--left-right', '--count', BRANCH + '...origin/' + BRANCH], GITOPTS).stdout.trim());
