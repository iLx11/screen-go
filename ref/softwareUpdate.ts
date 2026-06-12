const win = window as any

export type TSoftwareUpdateViewInfo = {
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

export type TSoftwareUpdateViewState = {
  phase: string
  busy: boolean
  progress: number
  downloadedSize: number
  message: string
  updateInfo: TSoftwareUpdateViewInfo | null
  downloadedFilePath: string
  updatedAt: number
}

/********************************************************************************
 * @brief: 创建默认软件更新视图状态
 * @return {*}
 ********************************************************************************/
export const createDefaultSoftwareUpdateViewState =
  (): TSoftwareUpdateViewState => {
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

/********************************************************************************
 * @brief: 规范化主进程返回的软件更新状态
 * @param {*} data
 * @return {*}
 ********************************************************************************/
export const normalizeSoftwareUpdateState = (
  data: any,
): TSoftwareUpdateViewState => {
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
      typeof data.downloadedSize === 'number' && !Number.isNaN(data.downloadedSize)
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

/********************************************************************************
 * @brief: 获取当前软件更新状态
 * @return {*}
 ********************************************************************************/
export const getSoftwareUpdateState = async () => {
  return normalizeSoftwareUpdateState(await win.api.getSoftwareUpdateState())
}

/********************************************************************************
 * @brief: 重置软件更新状态
 * @return {*}
 ********************************************************************************/
export const resetSoftwareUpdateState = async () => {
  return await win.api.resetSoftwareUpdateState()
}

/********************************************************************************
 * @brief: 检查是否有可用的软件更新
 * @return {*}
 ********************************************************************************/
export const checkSoftwareUpdate = async () => {
  return await win.api.checkSoftwareUpdate()
}

/********************************************************************************
 * @brief: 下载软件更新安装包
 * @return {*}
 ********************************************************************************/
export const downloadSoftwareUpdate = async () => {
  return await win.api.downloadSoftwareUpdate()
}

/********************************************************************************
 * @brief: 取消软件更新下载
 * @return {*}
 ********************************************************************************/
export const cancelSoftwareUpdate = async () => {
  return await win.api.cancelSoftwareUpdate()
}

/********************************************************************************
 * @brief: 启动已下载好的新版本安装包
 * @return {*}
 ********************************************************************************/
export const installSoftwareUpdate = async () => {
  return await win.api.installSoftwareUpdate()
}

/********************************************************************************
 * @brief: 打开远程下载页面
 * @return {*}
 ********************************************************************************/
export const openSoftwareUpdatePage = async () => {
  return await win.api.openSoftwareUpdatePage()
}

/********************************************************************************
 * @brief: 格式化软件包大小文本
 * @param {*} size
 * @return {*}
 ********************************************************************************/
export const formatSoftwarePackageSize = (size: number) => {
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
