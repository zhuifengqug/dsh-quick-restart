import { spawn } from 'node:child_process'

export const name = 'dsh-quick-restart'
export const inject = ['commands']

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

function requestRestart() {
  spawnReplacement()
  setTimeout(() => process.kill(process.pid, 'SIGTERM'), 50).unref()
}

function registerWebRoute(ctx) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (scope) => {
    scope.webServer.register({
      name: 'dsh-quick-restart',
      kind: 'exact',
      path: '/dsh-quick-restart',
      handler: (req, res) => {
        const send = (status, body) => {
          res.writeHead(status, { 'content-type': 'application/json' })
          res.end(JSON.stringify(body))
        }
        if (!isTrustedRequest(req)) return send(403, { error: 'request refused: loopback same-origin only' })
        if (req.method !== 'POST') return send(405, { error: 'method not allowed' })
        try {
          requestRestart()
          return send(202, { restarting: true })
        } catch (error) {
          return send(500, { error: String(error?.message ?? error) })
        }
      },
    })
  })
}

export function apply(ctx) {
  ctx.commands.register({
    name: 'restart',
    description: 'restart dsh with the current profile and options',
    recordInput: false,
    handler(invocation) {
      if (invocation.rawInput.trim().length > 0) return { kind: 'error', text: USAGE }
      if (invocation.signal.aborted) return { kind: 'error', text: 'Restart cancelled.' }
      requestRestart()
      return { kind: 'success', text: 'Restarting dsh...' }
    },
  })
  registerWebRoute(ctx)
}
