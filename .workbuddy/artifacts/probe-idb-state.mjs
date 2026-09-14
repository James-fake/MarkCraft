/**
 * 探针前置调查：IndexedDB 里到底有多少笔记数据？
 * 用途：判断图谱为空是因为「库空」还是「读取链路问题」，从而决定性能测量是否可行。
 */
import { spawn } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9336
const APP = 'http://127.0.0.1:5174/#view=graph'

const userDataDir = mkdtempSync(join(tmpdir(), 'mc-cdp-idb-'))
const edge = spawn(EDGE, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDataDir}`,
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=1600,1000', APP,
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const l = await r.json()
      const p = l.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (p) return p.webSocketDebuggerUrl
    } catch {}
    await sleep(300)
  }
  throw new Error('CDP 未就绪')
}

let seq = 0
const pending = new Map()

async function main() {
  const ws = new WebSocket(await getWsUrl())
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
    }
  }
  const send = (method, params = {}) => {
    const id = ++seq
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  }
  const evalJs = async (expression, awaitPromise = false) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (r.exceptionDetails) return { __err: r.exceptionDetails.exception?.description }
    return r.result.value
  }

  await send('Page.enable'); await send('Runtime.enable')
  for (let i = 0; i < 50; i++) {
    if (await evalJs(`!!document.querySelector('#aurora-root')?.children.length`)) break
    await sleep(300)
  }
  await sleep(1500)

  // 列 IndexedDB 数据库与 store
  const idb = await evalJs(`
    new Promise(async (resolve) => {
      try {
        const dbs = await indexedDB.databases();
        const out = [];
        for (const d of dbs) {
          const info = { name: d.name, version: d.version, stores: {} };
          const db = await new Promise((res, rej) => {
            const rq = indexedDB.open(d.name);
            rq.onsuccess = () => res(rq.result);
            rq.onerror = () => rej(rq.error);
          });
          for (const s of [...db.objectStoreNames]) {
            try {
              const tx = db.transaction(s, 'readonly');
              const cnt = await new Promise((res) => {
                const rq = tx.objectStore(s).count();
                rq.onsuccess = () => res(rq.result);
                rq.onerror = () => res(-1);
              });
              info.stores[s] = cnt;
            } catch (e) { info.stores[s] = 'err'; }
          }
          db.close();
          out.push(info);
        }
        resolve(out);
      } catch (e) { resolve({ __err: String(e) }); }
    })
  `, true)
  console.log('=== IndexedDB 概览 ===')
  console.log(JSON.stringify(idb, null, 2))

  // localStorage 线索
  const ls = await evalJs(`
    (() => { const o = {}; for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); o[k]=String(localStorage.getItem(k)).slice(0,120); } return o; })()
  `)
  console.log('\n=== localStorage ===')
  console.log(JSON.stringify(ls, null, 2))

  // 图谱 DOM 状态
  const g = await evalJs(`
    (() => ({
      nodes: document.querySelectorAll('.aurora-graph__node').length,
      dots: document.querySelectorAll('.aurora-graph__dot').length,
      svgHtmlHead: (document.querySelector('.aurora-graph__svg')?.outerHTML || '').slice(0, 400),
      emptyHint: [...document.querySelectorAll('.aurora-graph *')].map(e=>e.textContent).filter(t=>t&&t.length<40).slice(0,10),
    }))()
  `)
  console.log('\n=== 图谱 DOM ===')
  console.log(JSON.stringify(g, null, 2))

  ws.close(); edge.kill()
  setTimeout(() => { try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}; process.exit(0) }, 400)
}

main().catch((e) => { console.error('FATAL', e); try { edge.kill() } catch {}; process.exit(2) })
