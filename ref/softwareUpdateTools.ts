import path from 'path'
import { createHash } from 'crypto'
import { access, mkdir, readFile } from 'fs/promises'
import { constants, type Stats } from 'fs'
import { app } from 'electron'
import { fileURLToPath, pathToFileURL } from 'url'

// 软件更新本地测试清单路径，发布时可改为服务器 JSON 地址
// const SOFTWARE_UPDATE_TEST_MANIFEST_PATH = path.resolve(
//   process.cwd(),
//   'software-update-test-manifest.json',
// )

const SOFTWARE_UPDATE_TEST_MANIFEST_PATH =
  'https://dev.qmk.plus/software-update.json'

// 软件更新清单地址，环境变量优先用于切换测试服或正式服
// export const SOFTWARE_UPDATE_MANIFEST_URL =
//   process.env.MULTIPAD_SOFTWARE_UPDATE_MANIFEST_URL?.trim() ||
//   pathToFileURL(SOFTWARE_UPDATE_TEST_MANIFEST_PATH).href

export const SOFTWARE_UPDATE_MANIFEST_URL = SOFTWARE_UPDATE_TEST_MANIFEST_PATH

export type TSoftwareUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'
  | 'cancelled'

export type TSoftwarePackageInfo = {
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

export type TSoftwareUpdateState = {
  phase: TSoftwareUpdatePhase
  busy: boolean
  progress: number
  downloadedSize: number
  message: string
  updateInfo: TSoftwarePackageInfo | null
  downloadedFilePath: string
  updatedAt: number
}

type TSoftwareRemoteManifest = {
  version: string
  platformKey: string
  downloadUrl: string
  pageUrl: string
  fileName: string
  fileSize: number
  checksum: string
  releaseNotes: string
  publishedAt: string
}

const DIRECT_PACKAGE_FILE_REG =
  /\.(exe|msi|zip|7z|dmg|pkg|appimage|deb|rpm)(\?|#|$)/i

/********************************************************************************
 * @brief: 创建默认软件更新状态
 * @param {*} currentVersion
 * @return {*}
 ********************************************************************************/
export const createDefaultSoftwareUpdateState = (
  currentVersion: string,
): TSoftwareUpdateState => {
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

/********************************************************************************
 * @brief: 复制软件更新状态，避免直接暴露内部引用
 * @param {*} state
 * @return {*}
 ********************************************************************************/
export const cloneSoftwareUpdateState = (
  state: TSoftwareUpdateState,
): TSoftwareUpdateState => {
  return {
    ...state,
    updateInfo: state.updateInfo
      ? {
          ...state.updateInfo,
        }
      : null,
  }
}

/********************************************************************************
 * @brief: 获取当前运行平台的软件包匹配键
 * @return {*}
 ********************************************************************************/
export const getSoftwarePlatformKey = () => {
  return `${process.platform}-${process.arch}`
}

/********************************************************************************
 * @brief: 规范化远程软件更新清单数据
 * @param {*} data
 * @param {*} manifestUrl
 * @return {*}
 ********************************************************************************/
export const normalizeSoftwareRemoteManifest = (
  data: any,
  manifestUrl = '',
): TSoftwareRemoteManifest => {
  const releaseData = resolveLatestSoftwareRelease(data)
  if (!releaseData) {
    return createEmptySoftwareRemoteManifest()
  }

  const packageData = resolveSoftwarePackageByPlatform(releaseData)
  const rawDownloadUrl = getSoftwareFirstString(
    packageData?.packageUrl,
    packageData?.downloadUrl,
    packageData?.packageDownloadLink,
    packageData?.downloadLink,
    releaseData.packageUrl,
    releaseData.downloadUrl,
    releaseData.packageDownloadLink,
    releaseData.downloadLink,
  )
  const normalizedDownloadUrl = resolveSoftwareAssetUrl(
    rawDownloadUrl,
    manifestUrl,
  )
  const rawPageUrl = getSoftwareFirstString(
    packageData?.pageUrl,
    releaseData.pageUrl,
    releaseData.downloadPage,
    rawDownloadUrl,
  )
  const normalizedPageUrl = resolveSoftwareAssetUrl(rawPageUrl, manifestUrl)

  return {
    version: getSoftwareFirstString(
      releaseData.latestVersion,
      releaseData.latestVerison,
      releaseData.version,
    ),
    platformKey: getSoftwarePackagePlatformKey(packageData),
    downloadUrl: isDirectSoftwarePackageUrl(normalizedDownloadUrl)
      ? normalizedDownloadUrl
      : '',
    pageUrl: normalizedPageUrl,
    fileName: getSoftwareFirstString(
      packageData?.fileName,
      packageData?.name,
      releaseData.fileName,
      releaseData.name,
    ),
    fileSize: Number(packageData?.fileSize ?? releaseData.fileSize ?? 0) || 0,
    checksum: getSoftwareFirstString(
      packageData?.sha256,
      packageData?.checksum,
      releaseData.sha256,
      releaseData.checksum,
    ),
    releaseNotes: getSoftwareFirstString(
      releaseData.releaseNotes,
      releaseData.notes,
      releaseData.description,
    ),
    publishedAt: getSoftwareFirstString(
      releaseData.publishedAt,
      releaseData.releaseDate,
    ),
  }
}

/********************************************************************************
 * @brief: 创建空的软件更新清单，避免解析异常向外扩散
 * @return {*}
 ********************************************************************************/
const createEmptySoftwareRemoteManifest = (): TSoftwareRemoteManifest => {
  return {
    version: '',
    platformKey: getSoftwarePlatformKey(),
    downloadUrl: '',
    pageUrl: '',
    fileName: '',
    fileSize: 0,
    checksum: '',
    releaseNotes: '',
    publishedAt: '',
  }
}

/********************************************************************************
 * @brief: 从 latest/history 或旧格式中取出最新版本对象
 * @param {*} data
 * @return {*}
 ********************************************************************************/
const resolveLatestSoftwareRelease = (data: any) => {
  if (!data || typeof data !== 'object') {
    return null
  }

  if (data.latest && typeof data.latest === 'object') {
    return data.latest
  }

  if (Array.isArray(data.history) && data.history[0]) {
    return data.history[0]
  }

  return data
}

/********************************************************************************
 * @brief: 根据当前平台从 packages 中选择对应安装包
 * @param {*} releaseData
 * @return {*}
 ********************************************************************************/
const resolveSoftwarePackageByPlatform = (releaseData: any) => {
  const packages = releaseData?.packages
  if (!packages) {
    return null
  }

  if (Array.isArray(packages)) {
    return packages.find(item => isSoftwarePackageMatchedPlatform(item)) ?? null
  }

  if (typeof packages === 'object') {
    const matchedKey = getSoftwarePlatformKeyCandidates().find(key => {
      return packages[key] && typeof packages[key] === 'object'
    })
    return matchedKey ? packages[matchedKey] : null
  }

  return null
}

/********************************************************************************
 * @brief: 生成当前平台可接受的软件包键名
 * @return {*}
 ********************************************************************************/
const getSoftwarePlatformKeyCandidates = () => {
  const platformAliasMap: Record<string, string[]> = {
    win32: ['win32', 'windows'],
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
    ])
  })

  return [...keyList, process.platform, 'default']
}

/********************************************************************************
 * @brief: 判断数组形式的软件包是否匹配当前平台
 * @param {*} packageData
 * @return {*}
 ********************************************************************************/
const isSoftwarePackageMatchedPlatform = (packageData: any) => {
  if (!packageData || typeof packageData !== 'object') {
    return false
  }

  const platformKey = getSoftwarePackagePlatformKey(packageData)
  if (getSoftwarePlatformKeyCandidates().includes(platformKey)) {
    return true
  }

  const packagePlatform = getSoftwareFirstString(
    packageData.platform,
    packageData.os,
  )
  const packageArch = getSoftwareFirstString(packageData.arch, packageData.cpu)

  if (packagePlatform && packageArch) {
    return getSoftwarePlatformKeyCandidates().includes(
      `${packagePlatform}-${packageArch}`,
    )
  }

  return getSoftwarePlatformKeyCandidates().includes(packagePlatform)
}

/********************************************************************************
 * @brief: 获取软件包声明的平台键
 * @param {*} packageData
 * @return {*}
 ********************************************************************************/
const getSoftwarePackagePlatformKey = (packageData: any) => {
  const platformKey = getSoftwareFirstString(packageData?.platformKey)
  if (platformKey) {
    return platformKey
  }

  const platform = getSoftwareFirstString(
    packageData?.platform,
    packageData?.os,
  )
  const arch = getSoftwareFirstString(packageData?.arch, packageData?.cpu)

  if (platform && arch) {
    return `${platform}-${arch}`
  }

  return platform || getSoftwarePlatformKey()
}

/********************************************************************************
 * @brief: 从多个候选值中取第一个有效字符串
 * @param {*} valueList
 * @return {*}
 ********************************************************************************/
const getSoftwareFirstString = (...valueList: unknown[]) => {
  for (const item of valueList) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim()
    }
  }

  return ''
}

/********************************************************************************
 * @brief: 判断远程地址是否为可直接下载的安装包
 * @param {*} url
 * @return {*}
 ********************************************************************************/
export const isDirectSoftwarePackageUrl = (url: string) => {
  return DIRECT_PACKAGE_FILE_REG.test(String(url ?? '').trim())
}

/********************************************************************************
 * @brief: 判断地址是否为本地文件地址
 * @param {*} url
 * @return {*}
 ********************************************************************************/
export const isLocalFileUrl = (url: string) => {
  const normalizedUrl = String(url ?? '').trim()
  return (
    /^file:\/\//i.test(normalizedUrl) || /^[a-zA-Z]:[\\/]/.test(normalizedUrl)
  )
}

/********************************************************************************
 * @brief: 判断软件更新地址是否为本地安装包地址
 * @param {*} url
 * @return {*}
 ********************************************************************************/
export const isLocalSoftwarePackageUrl = (url: string) => {
  return isLocalFileUrl(url) && isDirectSoftwarePackageUrl(url)
}

/********************************************************************************
 * @brief: 将本地安装包链接解析为文件路径
 * @param {*} url
 * @return {*}
 ********************************************************************************/
export const resolveLocalSoftwarePackagePath = (url: string) => {
  const normalizedUrl = String(url ?? '').trim()
  if (/^file:\/\//i.test(normalizedUrl)) {
    return fileURLToPath(normalizedUrl)
  }

  return path.resolve(normalizedUrl)
}

/********************************************************************************
 * @brief: 读取本地软件更新清单 JSON
 * @param {*} manifestUrl
 * @return {*}
 ********************************************************************************/
export const readLocalSoftwareUpdateManifest = async (manifestUrl: string) => {
  const manifestPath = resolveLocalSoftwarePackagePath(manifestUrl)
  return JSON.parse(await readFile(manifestPath, 'utf8'))
}

/********************************************************************************
 * @brief: 基于清单地址解析相对资源地址
 * @param {*} assetUrl
 * @param {*} manifestUrl
 * @return {*}
 ********************************************************************************/
export const resolveSoftwareAssetUrl = (assetUrl: string, manifestUrl = '') => {
  const normalizedAssetUrl = String(assetUrl ?? '').trim()
  if (!normalizedAssetUrl) {
    return ''
  }

  if (
    /^(https?:|file:)/i.test(normalizedAssetUrl) ||
    /^[a-zA-Z]:[\\/]/.test(normalizedAssetUrl)
  ) {
    return normalizedAssetUrl
  }

  if (!manifestUrl) {
    return normalizedAssetUrl
  }

  if (/^https?:/i.test(manifestUrl)) {
    return new URL(normalizedAssetUrl, manifestUrl).href
  }

  const manifestPath = resolveLocalSoftwarePackagePath(manifestUrl)
  return pathToFileURL(
    path.resolve(path.dirname(manifestPath), normalizedAssetUrl),
  ).href
}

/********************************************************************************
 * @brief: 比较两个版本号，返回 1 / 0 / -1
 * @param {*} leftVersion
 * @param {*} rightVersion
 * @return {*}
 ********************************************************************************/
export const compareVersion = (leftVersion: string, rightVersion: string) => {
  const leftList = normalizeVersionPartList(leftVersion)
  const rightList = normalizeVersionPartList(rightVersion)
  const maxLen = Math.max(leftList.length, rightList.length)

  for (let index = 0; index < maxLen; index++) {
    const leftValue = leftList[index] ?? 0
    const rightValue = rightList[index] ?? 0

    if (leftValue > rightValue) {
      return 1
    }

    if (leftValue < rightValue) {
      return -1
    }
  }

  return 0
}

/********************************************************************************
 * @brief: 把版本号拆成数字数组，便于比较
 * @param {*} version
 * @return {*}
 ********************************************************************************/
const normalizeVersionPartList = (version: string) => {
  const matchedList = String(version ?? '')
    .trim()
    .split(/[^0-9]+/)
    .filter(Boolean)

  if (!matchedList.length) {
    return [0]
  }

  return matchedList.map(item => Number.parseInt(item, 10) || 0)
}

/********************************************************************************
 * @brief: 根据清单和当前版本生成软件更新信息
 * @param {*} manifestData
 * @param {*} currentVersion
 * @return {*}
 ********************************************************************************/
export const buildSoftwarePackageInfo = (
  manifestData: any,
  currentVersion: string,
  manifestUrl = '',
): TSoftwarePackageInfo => {
  const normalizedManifest = normalizeSoftwareRemoteManifest(
    manifestData,
    manifestUrl,
  )
  const directDownloadUrl = normalizedManifest.downloadUrl
  const pageUrl = normalizedManifest.pageUrl || directDownloadUrl
  const resolvedFileName =
    normalizedManifest.fileName ||
    resolveSoftwareFileNameFromUrl(directDownloadUrl || pageUrl)

  return {
    currentVersion,
    latestVersion: normalizedManifest.version,
    platformKey: normalizedManifest.platformKey,
    fileName: resolvedFileName,
    fileSize: normalizedManifest.fileSize,
    downloadUrl: directDownloadUrl,
    pageUrl,
    releaseNotes: normalizedManifest.releaseNotes,
    checksum: normalizedManifest.checksum,
    publishedAt: normalizedManifest.publishedAt,
    hasDirectPackage: Boolean(directDownloadUrl),
  }
}

/********************************************************************************
 * @brief: 根据下载地址提取安装包文件名
 * @param {*} url
 * @return {*}
 ********************************************************************************/
export const resolveSoftwareFileNameFromUrl = (url: string) => {
  const normalizedUrl = String(url ?? '').trim()
  if (!normalizedUrl) {
    return ''
  }

  try {
    const urlObj = new URL(normalizedUrl)
    return sanitizeSoftwareFileName(path.basename(urlObj.pathname))
  } catch (error) {
    return sanitizeSoftwareFileName(path.basename(normalizedUrl))
  }
}

/********************************************************************************
 * @brief: 解析 Content-Disposition 头中的文件名
 * @param {*} headerValue
 * @return {*}
 ********************************************************************************/
export const resolveSoftwareFileNameFromHeader = (headerValue: string) => {
  const normalizedValue = String(headerValue ?? '').trim()
  if (!normalizedValue) {
    return ''
  }

  const utf8Matched = normalizedValue.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Matched?.[1]) {
    return sanitizeSoftwareFileName(decodeURIComponent(utf8Matched[1]))
  }

  const normalMatched = normalizedValue.match(/filename=\"?([^\";]+)\"?/i)
  if (normalMatched?.[1]) {
    return sanitizeSoftwareFileName(normalMatched[1])
  }

  return ''
}

/********************************************************************************
 * @brief: 清洗文件名，避免非法字符导致写入失败
 * @param {*} fileName
 * @return {*}
 ********************************************************************************/
export const sanitizeSoftwareFileName = (fileName: string) => {
  const normalizedName = String(fileName ?? '').trim()
  if (!normalizedName) {
    return 'MultiPad-Setup.exe'
  }

  return normalizedName.replace(/[<>:\"/\\|?*\u0000-\u001f]/g, '_')
}

/********************************************************************************
 * @brief: 获取软件更新缓存目录
 * @return {*}
 ********************************************************************************/
export const getSoftwareUpdateCacheDir = () => {
  let tempDir = app.getPath('temp')
  if (!tempDir) {
    tempDir = process.cwd()
  }
  return path.join(tempDir, 'multipad-software-update')
}

/********************************************************************************
 * @brief: 确保软件更新缓存目录已经创建
 * @return {*}
 ********************************************************************************/
export const ensureSoftwareUpdateCacheDir = async () => {
  const targetDir = getSoftwareUpdateCacheDir()
  await mkdir(targetDir, { recursive: true })
  return targetDir
}

/********************************************************************************
 * @brief: 根据文件名生成本地缓存安装包路径
 * @param {*} fileName
 * @return {*}
 ********************************************************************************/
export const resolveSoftwareDownloadedFilePath = async (fileName: string) => {
  const targetDir = await ensureSoftwareUpdateCacheDir()
  return path.join(targetDir, sanitizeSoftwareFileName(fileName))
}

/********************************************************************************
 * @brief: 检查文件是否存在
 * @param {*} filePath
 * @return {*}
 ********************************************************************************/
export const isFileExists = async (filePath: string) => {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch (error) {
    return false
  }
}

/********************************************************************************
 * @brief: 读取文件状态信息
 * @param {*} filePath
 * @return {*}
 ********************************************************************************/
export const getFileStatSafe = async (
  filePath: string,
): Promise<Stats | null> => {
  try {
    const { stat } = await import('fs/promises')
    return await stat(filePath)
  } catch (error) {
    return null
  }
}

/********************************************************************************
 * @brief: 计算本地安装包的 SHA256 校验值
 * @param {*} filePath
 * @return {*}
 ********************************************************************************/
export const calcFileSHA256 = async (filePath: string) => {
  const fileBuffer = await readFile(filePath)
  const hash = createHash('sha256')
  hash.update(fileBuffer)
  return hash.digest('hex')
}

/********************************************************************************
 * @brief: 计算下载进度百分比
 * @param {*} loadedSize
 * @param {*} totalSize
 * @return {*}
 ********************************************************************************/
export const calcSoftwareDownloadProgress = (
  loadedSize: number,
  totalSize: number,
) => {
  if (!totalSize || totalSize <= 0) {
    return 0
  }

  const progress = Number(((loadedSize / totalSize) * 100).toFixed(1))
  return Math.max(0, Math.min(100, progress))
}

/********************************************************************************
 * @brief: 从响应头中解析 content-length 包大小
 * @param {*} headers
 * @return {*}
 ********************************************************************************/
export const resolveSoftwareContentLength = (headers: any) => {
  return Number(headers?.['content-length'] ?? 0) || 0
}

/********************************************************************************
 * @brief: 格式化字节长度，便于在界面上显示
 * @param {*} size
 * @return {*}
 ********************************************************************************/
export const formatSoftwareSizeText = (size: number) => {
  if (!size) {
    return '0 B'
  }

  const unitList = ['B', 'KB', 'MB', 'GB']
  let currentSize = size
  let unitIndex = 0

  while (currentSize >= 1024 && unitIndex < unitList.length - 1) {
    currentSize /= 1024
    unitIndex++
  }

  return `${currentSize.toFixed(currentSize >= 10 ? 1 : 2)} ${unitList[unitIndex]}`
}
