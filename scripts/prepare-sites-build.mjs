import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const distDirectory = resolve(projectRoot, 'dist')
const serverDirectory = resolve(projectRoot, 'dist', 'server')
const metadataDirectory = resolve(projectRoot, 'dist', '.openai')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'server' || entry.name === '.openai') continue
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(path))
    else files.push(path)
  }
  return files
}

const assets = {}
for (const file of await listFiles(distDirectory)) {
  const path = `/${relative(distDirectory, file).split(sep).join('/')}`
  const extension = path.slice(path.lastIndexOf('.'))
  assets[path] = {
    body: (await readFile(file)).toString('base64'),
    type: mimeTypes[extension] ?? 'application/octet-stream',
  }
}
assets['/'] = assets['/index.html']

await Promise.all([
  mkdir(serverDirectory, { recursive: true }),
  mkdir(metadataDirectory, { recursive: true }),
])

await writeFile(
  resolve(serverDirectory, 'index.js'),
  `const assets = ${JSON.stringify(assets)}
const decode = (base64) => Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const wantsHtml = (request.headers.get('accept') || '').includes('text/html')
    const asset = assets[url.pathname] || (wantsHtml ? assets['/'] : undefined)
    if (!asset) return new Response('Not found', { status: 404 })
    const immutable = url.pathname.startsWith('/assets/')
    return new Response(decode(asset.body), {
      headers: {
        'content-type': asset.type,
        'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
        'x-content-type-options': 'nosniff',
      },
    })
  },
}\n`,
  'utf8',
)

await copyFile(
  resolve(projectRoot, '.openai', 'hosting.json'),
  resolve(metadataDirectory, 'hosting.json'),
)
