/**
 * push-gitee.cjs — 可靠推送到 Gitee（绕开会卡死的凭证助手）
 *
 * 为什么需要它（根因，2026-09-21 实测）：
 *   PortableGit 的**系统级** gitconfig 里设了 `credential.helper=helper-selector`，
 *   它需要约 30s 才返回（15s 超时内无响应）。于是裸 `git push` 会长时间静默卡住，
 *   被上层工具按 SIGTERM 杀掉 —— 表现为「整条命令无声死亡、连退出码都不打印」，
 *   而**远端其实并没有更新**。极易被误判为「管道误报」或「沙箱拦网」。
 *   （同时 http_proxy=127.0.0.1:* 也会掐死 git 的 https；Node fetch 不受影响，
 *    因此可以用 fetch 独立复核远端，不要用本地 ref 自证。）
 *
 * 它做什么：
 *   1. 自管超时（凭证 90s），避免被上层工具的 SIGTERM 打断；
 *   2. `git credential fill` 取一次凭证（给助手足够时间）；
 *   3. 用**内联 URL** push，从此不再咨询凭证助手；
 *   4. 输出全面**脱敏**（token 永不落到 stdout / 日志）；
 *   5. 回写 `origin/master`（推内联 URL 不会更新 remote-tracking ref）；
 *   6. `ls-remote` 复核 local == remote，并打印 divergence。
 *
 * 用法（在仓库根目录）：node scripts/push-gitee.cjs [branch]
 *
 * 安全：本脚本**不含任何密钥**，凭证在运行时从 git 助手读取。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_URL = 'https://gitee.com/James-fake/markcraft.git';
const HOST = 'gitee.com';
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

// ---- 1. 取凭证（助手很慢，给 90s）----
const cred = spawnSync('git', ['credential', 'fill'], {
  ...GITOPTS,
  input: 'protocol=https\nhost=' + HOST + '\n\n',
  timeout: 90000,
});
if (cred.error) { console.log('CRED_SPAWN_ERROR ' + cred.error.message); process.exit(1); }
if (cred.status !== 0) {
  console.log('CRED_FAIL status=' + cred.status + ' ' + String(cred.stderr || '').trim());
  process.exit(1);
}

const lines = String(cred.stdout || '').split(/\r?\n/);
const user = (lines.find((l) => l.startsWith('username=')) || '').slice(9);
const pass = (lines.find((l) => l.startsWith('password=')) || '').slice(9);
if (!user || !pass) { console.log('CRED_MISSING'); process.exit(1); }
console.log('cred=ok user=' + user + ' passLen=' + pass.length);

const enc = encodeURIComponent;
const inlineUrl = 'https://' + enc(user) + ':' + enc(pass) + '@' + HOST + '/James-fake/markcraft.git';

// ---- 2. push（清空代理；绕开助手）----
const t0 = Date.now();
const r = spawnSync('git', [
  '-c', 'credential.helper=',
  '-c', 'http.proxy=',
  '-c', 'https.proxy=',
  'push', inlineUrl, BRANCH,
], { ...GITOPTS, timeout: 180000 });

const redact = (s) => String(s || '')
  .split(pass).join('***')
  .split(enc(pass)).join('***')
  .split(inlineUrl).join(REPO_URL);

console.log('PUSH_STATUS=' + (r.error ? 'ERR:' + r.error.message : r.status) + ' ms=' + (Date.now() - t0));
console.log('--- git stdout ---\n' + redact(r.stdout));
console.log('--- git stderr ---\n' + redact(r.stderr));
if (r.error || r.status !== 0) { console.log('PUSH_FAILED'); process.exit(1); }

// ---- 3. 回写 remote-tracking ref ----
const head = spawnSync('git', ['rev-parse', BRANCH], GITOPTS).stdout.trim();
const refFile = path.join('.git', 'refs', 'remotes', 'origin', BRANCH);
fs.mkdirSync(path.dirname(refFile), { recursive: true });
fs.writeFileSync(refFile, head + '\n');
console.log('wrote ' + refFile + ' = ' + head);

// ---- 4. 以远端为准复核 ----
const lsr = spawnSync('git', ['-c', 'credential.helper=', '-c', 'http.proxy=', '-c', 'https.proxy=', 'ls-remote', 'origin', BRANCH], GITOPTS);
const remoteHead = String(lsr.stdout || '').split(/\s+/)[0];
console.log('local =' + head);
console.log('remote=' + remoteHead);
console.log('MATCH=' + (head === remoteHead));
console.log('divergence=' + spawnSync('git', ['rev-list', '--left-right', '--count', BRANCH + '...origin/' + BRANCH], GITOPTS).stdout.trim());
