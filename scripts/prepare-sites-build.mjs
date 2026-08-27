import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const serverDirectory = resolve(projectRoot, 'dist', 'server')
const metadataDirectory = resolve(projectRoot, 'dist', '.openai')

await Promise.all([
  mkdir(serverDirectory, { recursive: true }),
  mkdir(metadataDirectory, { recursive: true }),
])

await writeFile(
  resolve(serverDirectory, 'index.js'),
  `export default {
  async fetch(request, env) {
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request)
    }
    return new Response('DAILO assets are unavailable.', { status: 503 })
  },
}\n`,
  'utf8',
)

await copyFile(
  resolve(projectRoot, '.openai', 'hosting.json'),
  resolve(metadataDirectory, 'hosting.json'),
)
