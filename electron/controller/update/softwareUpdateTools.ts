import { app } from 'electron'
import { createHash } from 'crypto'
import { access, mkdir, readFile, stat } from 'fs/promises'
import { constants } from 'fs'
import path from 'path'

export type SoftwareUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'
  | 'cancelled'

export type SoftwarePackageInfo = {
  currentVersion: string
  latestVersion: string
  platformKey: string
  fileName: string
  fileSize: number
  downloadUrl: string
  pageUrl: string
  releaseNotes: string
  checksum: string
  publishedAt: string
  hasDirectPackage: boolean
}

export type SoftwareUpdateState = {
  phase: SoftwareUpdatePhase
  busy: boolean
  progress: number
  downloadedSize: number
  message: string
  updateInfo: SoftwarePackageInfo | null
  downloadedFilePath: string
  updatedAt: number
}

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  message?: string
}

type GitHubReleaseAsset = {
  name: string
  size: number
  browser_download_url: string
}

export type GitHubReleaseInfo = {
  tag_name?: string
  name?: string
  body?: string
  html_url?: string
  published_at?: string
  assets?: GitHubReleaseAsset[]
}

const DEFAULT_REPOSITORY = 'iLx11/screen-go'

const DIRECT_PACKAGE_FILE_REG =
  /\.(exe|msi|dmg|pkg|appimage|deb|rpm|zip|7z)(\?|#|$)/i

export const successResult = <T>(data: T): ActionResult<T> => {
  return {
    success: true,
    data,
  }
}

export const errorResult = (message: string): ActionResult => {
  return {
    success: false,
    message,
  }
}

export const getSoftwareRepository = () => {
  return (
    process.env.SCREEN_GO_UPDATE_REPOSITORY?.trim() ||
    process.env.GITHUB_REPOSITORY?.trim() ||
    DEFAULT_REPOSITORY
  )
}

export const getSoftwareLatestReleaseApiUrl = () => {
  return `https://api.github.com/repos/${getSoftwareRepository()}/releases/latest`
}

export const getSoftwarePlatformKey = () => {
  return `${process.platform}-${process.arch}`
}

export const createDefaultSoftwareUpdateState = (
  currentVersion: string
): SoftwareUpdateState => {
  return {
    phase: 'idle',
    busy: false,
    progress: 0,
    downloadedSize: 0,
    message: '',
    updateInfo: {
      currentVersion,
      latestVersion: '',
      platformKey: getSoftwarePlatformKey(),
      fileName: '',
      fileSize: 0,
      downloadUrl: '',
      pageUrl: '',
      releaseNotes: '',
      checksum: '',
      publishedAt: '',
      hasDirectPackage: false,
    },
    downloadedFilePath: '',
    updatedAt: Date.now(),
  }
}

export const cloneSoftwareUpdateState = (
  state: SoftwareUpdateState
): SoftwareUpdateState => {
  return {
    ...state,
    updateInfo: state.updateInfo
      ? {
          ...state.updateInfo,
        }
      : null,
  }
}

const normalizeVersionText = (version: string) => {
  return String(version ?? '')
    .trim()
    .replace(/^v/i, '')
}

export const compareVersion = (leftVersion: string, rightVersion: string) => {
  const leftList = normalizeVersionText(leftVersion)
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(item => Number.parseInt(item, 10) || 0)
  const rightList = normalizeVersionText(rightVersion)
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(item => Number.parseInt(item, 10) || 0)
  const maxLen = Math.max(leftList.length, rightList.length, 1)

  for (let index = 0; index < maxLen; index++) {
    const leftValue = leftList[index] ?? 0
    const rightValue = rightList[index] ?? 0

    if (leftValue > rightValue) return 1
    if (leftValue < rightValue) return -1
  }

  return 0
}

const getSoftwarePlatformKeyCandidates = () => {
  const platformAliasMap: Record<string, string[]> = {
    win32: ['win32', 'windows', 'win'],
    darwin: ['darwin', 'macos', 'mac'],
    linux: ['linux'],
  }
  const archAliasMap: Record<string, string[]> = {
    x64: ['x64', 'amd64'],
    arm64: ['arm64', 'aarch64'],
  }
  const platformList = platformAliasMap[process.platform] ?? [process.platform]
  const archList = archAliasMap[process.arch] ?? [process.arch]
  const keyList = platformList.flatMap(platform => {
    return archList.flatMap(arch => [
      `${platform}-${arch}`,
      `${platform}_${arch}`,
      `${platform}.${arch}`,
    ])
  })

  return [...keyList, process.platform, 'default']
}

const getSoftwareAssetScore = (assetName: string) => {
  const normalizedName = assetName.toLowerCase()
  const candidates = getSoftwarePlatformKeyCandidates()
  let score = 0

  if (DIRECT_PACKAGE_FILE_REG.test(normalizedName)) score += 10
  candidates.forEach((key, index) => {
    if (normalizedName.includes(key.toLowerCase())) {
      score += 100 - index
    }
  })

  if (process.platform == 'win32') {
    if (normalizedName.endsWith('.exe')) score += 20
    if (normalizedName.includes('setup')) score += 8
  } else if (process.platform == 'darwin') {
    if (normalizedName.endsWith('.dmg')) score += 20
  } else if (process.platform == 'linux') {
    if (normalizedName.endsWith('.appimage')) score += 20
    if (normalizedName.endsWith('.deb')) score += 12
  }

  return score
}

export const resolveReleaseAssetByPlatform = (release: GitHubReleaseInfo) => {
  const assets = Array.isArray(release.assets) ? release.assets : []
  return assets
    .filter(asset => asset?.browser_download_url && asset?.name)
    .map(asset => ({
      asset,
      score: getSoftwareAssetScore(asset.name),
    }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.asset
}

export const buildSoftwarePackageInfo = (
  release: GitHubReleaseInfo,
  currentVersion: string
): SoftwarePackageInfo => {
  const asset = resolveReleaseAssetByPlatform(release)
  const latestVersion = normalizeVersionText(release.tag_name || release.name || '')
  const pageUrl = String(release.html_url || '').trim()

  return {
    currentVersion,
    latestVersion,
    platformKey: getSoftwarePlatformKey(),
    fileName: sanitizeSoftwareFileName(asset?.name || 'ScreenGo-Setup.exe'),
    fileSize: Number(asset?.size ?? 0) || 0,
    downloadUrl: String(asset?.browser_download_url || '').trim(),
    pageUrl,
    releaseNotes: String(release.body || '').trim(),
    checksum: '',
    publishedAt: String(release.published_at || '').trim(),
    hasDirectPackage: Boolean(asset?.browser_download_url),
  }
}

export const sanitizeSoftwareFileName = (fileName: string) => {
  const normalizedName = String(fileName ?? '').trim()
  if (!normalizedName) return 'ScreenGo-Setup.exe'
  return normalizedName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
}

export const getSoftwareUpdateCacheDir = () => {
  return path.join(app.getPath('temp') || process.cwd(), 'screen-go-update')
}

export const ensureSoftwareUpdateCacheDir = async () => {
  const targetDir = getSoftwareUpdateCacheDir()
  await mkdir(targetDir, { recursive: true })
  return targetDir
}

export const resolveSoftwareDownloadedFilePath = async (fileName: string) => {
  const targetDir = await ensureSoftwareUpdateCacheDir()
  return path.join(targetDir, sanitizeSoftwareFileName(fileName))
}

export const isFileExists = async (filePath: string) => {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch (error) {
    return false
  }
}

export const getFileSizeSafe = async (filePath: string) => {
  try {
    const fileStat = await stat(filePath)
    return Number(fileStat.size ?? 0) || 0
  } catch (error) {
    return 0
  }
}

export const calcFileSHA256 = async (filePath: string) => {
  const fileBuffer = await readFile(filePath)
  const hash = createHash('sha256')
  hash.update(fileBuffer)
  return hash.digest('hex')
}

export const calcSoftwareDownloadProgress = (
  loadedSize: number,
  totalSize: number
) => {
  if (!totalSize || totalSize <= 0) return 0
  const progress = Number(((loadedSize / totalSize) * 100).toFixed(1))
  return Math.max(0, Math.min(100, progress))
}

export const formatSoftwareSizeText = (size: number) => {
  if (!size) return '0 B'

  const unitList = ['B', 'KB', 'MB', 'GB']
  let currentSize = size
  let unitIndex = 0

  while (currentSize >= 1024 && unitIndex < unitList.length - 1) {
    currentSize /= 1024
    unitIndex++
  }

  return `${currentSize.toFixed(currentSize >= 10 ? 1 : 2)} ${unitList[unitIndex]}`
}
