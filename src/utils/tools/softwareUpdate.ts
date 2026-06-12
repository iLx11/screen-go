const win = window as any

export type SoftwareUpdateViewInfo = {
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

export type SoftwareUpdateViewState = {
  phase: string
  busy: boolean
  progress: number
  downloadedSize: number
  message: string
  updateInfo: SoftwareUpdateViewInfo | null
  downloadedFilePath: string
  updatedAt: number
}

export const createDefaultSoftwareUpdateViewState =
  (): SoftwareUpdateViewState => {
    return {
      phase: 'idle',
      busy: false,
      progress: 0,
      downloadedSize: 0,
      message: '',
      updateInfo: null,
      downloadedFilePath: '',
      updatedAt: 0,
    }
  }

export const normalizeSoftwareUpdateState = (
  data: any
): SoftwareUpdateViewState => {
  const defaultState = createDefaultSoftwareUpdateViewState()

  if (!data || typeof data !== 'object') {
    return defaultState
  }

  return {
    phase: typeof data.phase === 'string' ? data.phase : defaultState.phase,
    busy: Boolean(data.busy),
    progress:
      typeof data.progress === 'number' && !Number.isNaN(data.progress)
        ? data.progress
        : 0,
    downloadedSize:
      typeof data.downloadedSize === 'number' &&
      !Number.isNaN(data.downloadedSize)
        ? data.downloadedSize
        : 0,
    message: typeof data.message === 'string' ? data.message : '',
    updateInfo:
      data.updateInfo && typeof data.updateInfo === 'object'
        ? {
            currentVersion: String(data.updateInfo.currentVersion ?? ''),
            latestVersion: String(data.updateInfo.latestVersion ?? ''),
            platformKey: String(data.updateInfo.platformKey ?? ''),
            fileName: String(data.updateInfo.fileName ?? ''),
            fileSize: Number(data.updateInfo.fileSize ?? 0),
            downloadUrl: String(data.updateInfo.downloadUrl ?? ''),
            pageUrl: String(data.updateInfo.pageUrl ?? ''),
            releaseNotes: String(data.updateInfo.releaseNotes ?? ''),
            checksum: String(data.updateInfo.checksum ?? ''),
            publishedAt: String(data.updateInfo.publishedAt ?? ''),
            hasDirectPackage: Boolean(data.updateInfo.hasDirectPackage),
          }
        : null,
    downloadedFilePath: String(data.downloadedFilePath ?? ''),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  }
}

const getUpdateApi = (name: string) => {
  const handler = win.api?.[name] || win.api?.update?.[name]
  if (typeof handler != 'function') {
    throw new TypeError(`${name} is not exposed in preload`)
  }
  return handler
}

export const getSoftwareUpdateState = async () => {
  return normalizeSoftwareUpdateState(
    await getUpdateApi('getSoftwareUpdateState')()
  )
}

export const resetSoftwareUpdateState = async () => {
  return await getUpdateApi('resetSoftwareUpdateState')()
}

export const checkSoftwareUpdate = async () => {
  return await getUpdateApi('checkSoftwareUpdate')()
}

export const downloadSoftwareUpdate = async () => {
  return await getUpdateApi('downloadSoftwareUpdate')()
}

export const cancelSoftwareUpdate = async () => {
  return await getUpdateApi('cancelSoftwareUpdate')()
}

export const installSoftwareUpdate = async () => {
  return await getUpdateApi('installSoftwareUpdate')()
}

export const openSoftwareUpdatePage = async () => {
  return await getUpdateApi('openSoftwareUpdatePage')()
}

export const formatSoftwarePackageSize = (size: number) => {
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
