// 启动 MarkCraft dev server 为"脱离父进程的独立守护进程"，并在退出前自检端口是否成功监听。
// 用法：node scripts/dev-server.cjs
// 背景：run_in_background 的 bash 任务在回合结束会被回收，连坐杀掉 vite 子进程。
//       用 spawn(detached:true)+unref() 让 vite 成为孤儿进程，独立于调用它的 bash 任务存活。
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const logPath = path.join(ROOT, 'scripts', 'dev-server.log');
const log = (m) => { try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${m}\n`); } catch {} };

const nodeBin = process.execPath;
const viteEntry = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

const out = fs.openSync(logPath, 'a');
const child = spawn(
  nodeBin,
  [viteEntry, '--port', '5174', '--host'],
  {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', out, out],
    detached: true,
    windowsHide: true,
  }
);
child.unref();
log(`[dev-server] launched vite pid=${child.pid}`);

function probe() {
  return new Promise((resolve) => {
    const sock = net.connect(5174, '127.0.0.1');
    const to = setTimeout(() => { sock.destroy(); resolve(false); }, 600);
    sock.on('connect', () => { clearTimeout(to); sock.destroy(); resolve(true); });
    sock.on('error', () => { clearTimeout(to); resolve(false); });
  });
}

(async () => {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await probe()) { log('[dev-server] LISTENING on 5174 OK'); console.log('LISTENING on http://localhost:5174/ (pid ' + child.pid + ')'); process.exit(0); }
  }
  log('[dev-server] NOT listening after 10s; child alive=' + child.killed);
  console.log('NOT listening after 10s (see scripts/dev-server.log)');
  process.exit(0);
})();
