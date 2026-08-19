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
}
