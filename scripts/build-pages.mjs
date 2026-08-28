import { spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'
const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm'
const argumentsList = isWindows ? ['/d', '/s', '/c', 'npm.cmd run build'] : ['run', 'build']
const result = spawnSync(command, argumentsList, {
  env: { ...process.env, GITHUB_ACTIONS: 'true' },
  stdio: 'inherit',
})

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
