import fs from 'node:fs'
import path from 'node:path'

const platformNames = new Set([
  'win32-x64',
  'win32-ia32',
  'darwin-x64',
  'darwin-arm64',
  'linux-x64',
  'linux-ia32',
  'linux-arm',
  'linux-arm64'
])

const readArg = name => {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]

  const prefix = `--${name}=`
  const match = process.argv.find(item => item.startsWith(prefix))
  return match ? match.slice(prefix.length) : null
}

const targetPlatform = readArg('platform') || process.env.npm_config_platform || process.platform
const targetArch = readArg('arch') || process.env.npm_config_arch || process.arch
const targetName = `${targetPlatform}-${targetArch}`

if (!platformNames.has(targetName)) {
  throw new Error(`Unsupported ffmpeg platform: ${targetName}`)
}

const rootPath = process.cwd()
const moduleScopes = ['@ffmpeg-installer', '@ffprobe-installer']

const removePath = removeTarget => {
  if (!fs.existsSync(removeTarget)) return
  fs.rmSync(removeTarget, { recursive: true, force: true })
  console.log(`remove ${path.relative(rootPath, removeTarget)}`)
}

for (const scopeName of moduleScopes) {
  const scopePath = path.join(rootPath, 'node_modules', scopeName)
  if (fs.existsSync(scopePath)) {
    for (const itemName of fs.readdirSync(scopePath)) {
      if (platformNames.has(itemName) && itemName !== targetName) {
        removePath(path.join(scopePath, itemName))
      }
    }
  }
}

const pnpmStorePath = path.join(rootPath, 'node_modules', '.pnpm')
if (fs.existsSync(pnpmStorePath)) {
  const platformPattern = /^@(ffmpeg-installer|ffprobe-installer)\+(.+)@\d/

  for (const itemName of fs.readdirSync(pnpmStorePath)) {
    const match = itemName.match(platformPattern)
    if (match && platformNames.has(match[2]) && match[2] !== targetName) {
      removePath(path.join(pnpmStorePath, itemName))
    }
  }
}

console.log(`keep ffmpeg platform ${targetName}`)
