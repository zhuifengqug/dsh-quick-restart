/**
 * dsh-quick-restart — host half.
 *
 * Registers POST /dsh-quick-restart to trigger restart, and GET /dsh-health
 * as a liveness probe for the client status dot.
 *
 * The restart handler returns BEFORE the restart happens (1s delay), so the
 * browser has time to render the "restarting" state before the page drops.
 */
import { spawn } from 'node:child_process'

export const name = 'dsh-quick-restart'
export const inject = ['webServer', 'commands']

const USAGE = 'Usage: /restart (no arguments)'
const RELAUNCH_SCRIPT = String.raw`
const { spawn } = require('node:child_process')
const [parentText, executable, cwd, argvText] = process.argv.slice(1)
const parent = Number(parentText)
const argv = JSON.parse(argvText)
const wait = () => {
  try {
    process.kill(parent, 0)
    setTimeout(wait, 25)
  } catch {
    const child = spawn(executable, argv, { cwd, detached: true, stdio: 'ignore', windowsHide: true })
    child.unref()
  }
}
wait()
`

function isTrustedRequest(req) {
  const host = req.headers?.host
  if (typeof host !== 'string' || host === '') return false
  let url
  try {
    url = new URL(`http://${host}`)
  } catch {
    return false
  }
  const hostname = url.hostname
  if (hostname !== 'localhost' && hostname !== '[::1]' && !hostname.startsWith('127.')) return false
  if (req.headers?.['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers?.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === url.host
  } catch {
    return false
  }
}

function spawnReplacement() {
  const entry = process.argv[1]
  if (entry === undefined) throw new Error('dsh restart: process entry point is unavailable')
  const argv = [...process.execArgv, entry, ...process.argv.slice(2)]
  const relay = spawn(process.execPath, [
    '--eval', RELAUNCH_SCRIPT, String(process.pid), process.execPath, process.cwd(), JSON.stringify(argv),
  ], { detached: true, stdio: 'ignore', windowsHide: true })
  relay.unref()
}

export function apply(ctx) {
  let restarting = false

  // Health check endpoint for client status dot
  const disposeHealth = ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-health',
    handler: async (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify({ ok: true, ts: Date.now() }))
    }
  })

  // Restart endpoint
  const disposeRoute = ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-quick-restart',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, message: 'method not allowed' }))
        return
      }
      if (!isTrustedRequest(req)) {
        res.writeHead(403, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, message: 'request refused: loopback same-origin only' }))
        return
      }
      if (restarting) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, message: '重启已在进行中，请稍候' }))
        return
      }
      restarting = true

      // Return response first, then restart after 1s delay
      // This gives browser time to render "restarting" state
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, message: '重启已触发，DSH 将断开约 15-20 秒，之后请刷新页面' }))

      // Use native setTimeout (not ctx.effect) because webServer handler
      // runs outside Cordis fiber lifecycle
      setTimeout(() => {
        try {
          spawnReplacement()
          setTimeout(() => {
            try { process.kill(process.pid, 'SIGTERM') } catch {}
          }, 50)
        } catch (error) {
          restarting = false
          console.error('[dsh-quick-restart] restart failed:', error)
        }
      }, 1000)
    }
  })

  // Slash command as fallback
  ctx.commands.register({
    name: 'restart',
    description: 'restart dsh with the current profile and options',
    recordInput: false,
    handler(invocation) {
      if (invocation.rawInput.trim().length > 0) return { kind: 'error', text: USAGE }
      if (invocation.signal.aborted) return { kind: 'error', text: 'Restart cancelled.' }
      spawnReplacement()
      setTimeout(() => process.kill(process.pid, 'SIGTERM'), 50).unref()
      return { kind: 'success', text: 'Restarting dsh...' }
    },
  })

  return () => { disposeHealth(); disposeRoute() }
}
