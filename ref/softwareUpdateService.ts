import axios from 'axios'
import { app, shell } from 'electron'
import { createWriteStream } from 'fs'
import { copyFile, rm } from 'fs/promises'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'
import { errorResult, successResult, type Result } from 'ilx1-x-tool'
import CreateWindow from '../window/CreateWindow'
import {
  SOFTWARE_UPDATE_MANIFEST_URL,
  buildSoftwarePackageInfo,
  calcFileSHA256,
  calcSoftwareDownloadProgress,
  cloneSoftwareUpdateState,
  compareVersion,
  createDefaultSoftwareUpdateState,
  getFileStatSafe,
  isFileExists,
  isLocalFileUrl,
  isLocalSoftwarePackageUrl,
  readLocalSoftwareUpdateManifest,
  resolveSoftwareContentLength,
  resolveSoftwareDownloadedFilePath,
  resolveSoftwareFileNameFromHeader,
  resolveLocalSoftwarePackagePath,
  sanitizeSoftwareFileName,
  formatSoftwareSizeText,
  type TSoftwarePackageInfo,
  type TSoftwareUpdateState,
} from '../utils/softwareUpdateTools'

const SOFTWARE_UPDATE_STATE_CHANNEL = 'softwareUpdate'

class SoftwareUpdateService {
  // 当前软件更新状态
  private updateState: TSoftwareUpdateState =
    createDefaultSoftwareUpdateState(app.getVersion())
  // 当前下载任务的中止控制器
  private downloadAbortController: AbortController | null = null

  /********************************************************************************
   * @brief: 获取当前软件更新状态
   * @return {*}
   ********************************************************************************/
  public getState = () => {
    return cloneSoftwareUpdateState(this.updateState)
  }

  /********************************************************************************
   * @brief: 重置软件更新状态
   * @return {*}
   ********************************************************************************/
  public resetState = async (): Promise<Result> => {
    if (this.downloadAbortController) {
      this.downloadAbortController.abort()
      this.downloadAbortController = null
    }

    this.setState(createDefaultSoftwareUpdateState(app.getVersion()))
    return successResult(true)
  }

  /********************************************************************************
   * @brief: 检查远程是否有可用的软件更新
   * @return {*}
   ********************************************************************************/
  public checkUpdate = async (): Promise<Result> => {
    this.setState({
      phase: 'checking',
      busy: true,
      progress: 0,
      message: 'Checking for updates...',
    })

    try {
      const manifestData = await this.loadSoftwareUpdateManifest()
      const currentVersion = app.getVersion()
      const packageInfo = buildSoftwarePackageInfo(
        manifestData,
        currentVersion,
        SOFTWARE_UPDATE_MANIFEST_URL,
      )
      if (!packageInfo.latestVersion) {
        throw new Error('The remote manifest is missing a version field.')
      }

      const resolvedPackageSize =
        await this.resolveRemotePackageSize(packageInfo)
      packageInfo.fileSize = resolvedPackageSize || packageInfo.fileSize

      if (compareVersion(packageInfo.latestVersion, currentVersion) <= 0) {
      this.setState({
        phase: 'not-available',
        busy: false,
        progress: 0,
        downloadedSize: 0,
        updateInfo: packageInfo,
        downloadedFilePath: '',
        message: 'You already have the latest version.',
      })

        return successResult(packageInfo)
      }

      this.setState({
        phase: 'available',
        busy: false,
        progress: 0,
        downloadedSize: 0,
        updateInfo: packageInfo,
        downloadedFilePath: '',
        message: packageInfo.hasDirectPackage
          ? 'A new version is available for download.'
          : 'A new version is available. Open the download page to continue.',
      })

      return successResult(packageInfo)
    } catch (error) {
      const errorMessage = this.getErrorMessage(
        error,
        'Failed to check for updates.',
      )

      this.setState({
        phase: 'error',
        busy: false,
        progress: 0,
        downloadedFilePath: '',
        message: errorMessage,
      })

      return errorResult(errorMessage)
    }
  }

  /********************************************************************************
   * @brief: 下载远程软件安装包
   * @return {*}
   ********************************************************************************/
  public downloadUpdate = async (): Promise<Result> => {
    if (this.updateState.busy) {
      return errorResult('Another software update task is already running.')
    }

    const packageInfo = await this.ensureAvailablePackageInfo()
    if (!packageInfo) {
      return errorResult('Please check for updates first.')
    }

    if (!packageInfo.hasDirectPackage || !packageInfo.downloadUrl) {
      return errorResult('The current update link is not a direct package URL.')
    }

    const targetFileName = sanitizeSoftwareFileName(
      packageInfo.fileName || 'MultiPad-Setup.exe',
    )
    const targetFilePath = await resolveSoftwareDownloadedFilePath(targetFileName)
    const abortController = new AbortController()
    this.downloadAbortController = abortController

    this.setState({
      phase: 'downloading',
      busy: true,
      progress: 0,
      downloadedSize: 0,
      downloadedFilePath: '',
      message: 'Downloading update package...',
    })

    try {
      await rm(targetFilePath, {
        force: true,
      })

      if (isLocalSoftwarePackageUrl(packageInfo.downloadUrl)) {
        const finishedPackageInfo = await this.copyLocalUpdatePackage(
          packageInfo,
          targetFilePath,
        )

        this.downloadAbortController = null
        return successResult(finishedPackageInfo)
      }

      const response = await axios.get(packageInfo.downloadUrl, {
        responseType: 'stream',
        timeout: 0,
        signal: abortController.signal,
        maxRedirects: 5,
      })

      const fileNameFromHeader = resolveSoftwareFileNameFromHeader(
        response.headers['content-disposition'],
      )
      const finalFilePath = fileNameFromHeader
        ? await resolveSoftwareDownloadedFilePath(fileNameFromHeader)
        : targetFilePath

      if (finalFilePath !== targetFilePath) {
        await rm(finalFilePath, {
          force: true,
        })
      }

      const totalSize = resolveSoftwareContentLength(response.headers)

      const nextPackageInfo: TSoftwarePackageInfo = {
        ...packageInfo,
        fileName: fileNameFromHeader || packageInfo.fileName,
        fileSize: totalSize || packageInfo.fileSize,
      }

      this.setState({
        updateInfo: nextPackageInfo,
      })

      const fileWriter = createWriteStream(finalFilePath)
      const progressStream =
        this.createSoftwareDownloadProgressStream(nextPackageInfo)
      await pipeline(response.data, progressStream, fileWriter)

      this.setState({
        progress: 99,
        message: 'Verifying update package...',
      })

      if (nextPackageInfo.checksum) {
        const fileHash = await calcFileSHA256(finalFilePath)
        if (
          fileHash.toLowerCase() !== nextPackageInfo.checksum.trim().toLowerCase()
        ) {
          await rm(finalFilePath, {
            force: true,
          })
          throw new Error('The downloaded package checksum does not match.')
        }
      }

      const fileStat = await getFileStatSafe(finalFilePath)
      const finishedPackageInfo: TSoftwarePackageInfo = {
        ...nextPackageInfo,
        fileSize: Number(fileStat?.size ?? nextPackageInfo.fileSize ?? 0),
      }

      this.setState({
        phase: 'downloaded',
        busy: false,
        progress: 100,
        downloadedSize: Number(fileStat?.size ?? finishedPackageInfo.fileSize ?? 0),
        updateInfo: finishedPackageInfo,
        downloadedFilePath: finalFilePath,
        message: 'The update package is ready to install.',
      })

      this.downloadAbortController = null
      return successResult(finishedPackageInfo)
    } catch (error) {
      this.downloadAbortController = null

      if (abortController.signal.aborted) {
        this.setState({
          phase: 'cancelled',
          busy: false,
          progress: 0,
          downloadedSize: 0,
          downloadedFilePath: '',
          message: 'The update download has been cancelled.',
        })

        return errorResult('The update download has been cancelled.')
      }

      const errorMessage = this.getErrorMessage(
        error,
        'Failed to download the update package.',
      )
      this.setState({
        phase: 'error',
        busy: false,
        progress: 0,
        downloadedSize: 0,
        downloadedFilePath: '',
        message: errorMessage,
      })

      return errorResult(errorMessage)
    }
  }

  /********************************************************************************
   * @brief: 取消当前的软件更新下载任务
   * @return {*}
   ********************************************************************************/
  public cancelDownload = async (): Promise<Result> => {
    if (!this.downloadAbortController) {
      return errorResult('There is no download task to cancel.')
    }

    this.downloadAbortController.abort()
    this.downloadAbortController = null

    this.setState({
      phase: 'cancelled',
      busy: false,
      progress: 0,
      downloadedSize: 0,
      downloadedFilePath: '',
      message: 'The update download has been cancelled.',
    })

    return successResult(true)
  }

  /********************************************************************************
   * @brief: 安装已下载好的新版本安装包
   * @return {*}
   ********************************************************************************/
  public installUpdate = async (): Promise<Result> => {
    const downloadedFilePath = String(this.updateState.downloadedFilePath ?? '').trim()
    if (!downloadedFilePath) {
      return errorResult('Please download the update package first.')
    }

    const isExists = await isFileExists(downloadedFilePath)
    if (!isExists) {
      return errorResult('The downloaded update package cannot be found.')
    }

    try {
      this.setState({
        phase: 'installing',
        busy: true,
        progress: 100,
        message: 'Launching installer...',
      })

      await this.launchInstaller(downloadedFilePath)
      return successResult(true)
    } catch (error) {
      const errorMessage = this.getErrorMessage(
        error,
        'Failed to launch the installer.',
      )

      this.setState({
        phase: 'error',
        busy: false,
        message: errorMessage,
      })

      return errorResult(errorMessage)
    }
  }

  /********************************************************************************
   * @brief: 打开远程下载页面，用于非直链地址场景
   * @return {*}
   ********************************************************************************/
  public openDownloadPage = async (): Promise<Result> => {
    const packageInfo = await this.ensureAvailablePackageInfo()
    if (!packageInfo?.pageUrl) {
      return errorResult('There is no download page available right now.')
    }

    await shell.openExternal(packageInfo.pageUrl)
    return successResult(true)
  }

  /********************************************************************************
   * @brief: 确保当前已经有可用的更新包信息
   * @return {*}
   ********************************************************************************/
  private ensureAvailablePackageInfo = async () => {
    if (
      this.updateState.updateInfo?.latestVersion &&
      compareVersion(
        this.updateState.updateInfo.latestVersion,
        this.updateState.updateInfo.currentVersion,
      ) > 0
    ) {
      return this.updateState.updateInfo
    }

    const checkResult = await this.checkUpdate()
    if (!checkResult.success) {
      return null
    }

    return (checkResult.data as TSoftwarePackageInfo) ?? null
  }

  /********************************************************************************
   * @brief: 加载软件更新清单，支持远程 JSON 或本地安装包直链测试
   * @return {*}
   ********************************************************************************/
  private loadSoftwareUpdateManifest = async () => {
    if (isLocalFileUrl(SOFTWARE_UPDATE_MANIFEST_URL)) {
      return await readLocalSoftwareUpdateManifest(SOFTWARE_UPDATE_MANIFEST_URL)
    }

    const response = await axios.get(SOFTWARE_UPDATE_MANIFEST_URL, {
      timeout: 10000,
    })
    return response.data
  }

  /********************************************************************************
   * @brief: 尝试获取远程安装包大小，仅用于展示信息
   * @param {*} packageInfo
   * @return {*}
   ********************************************************************************/
  private resolveRemotePackageSize = async (
    packageInfo: TSoftwarePackageInfo,
  ) => {
    if (!packageInfo.hasDirectPackage || !packageInfo.downloadUrl) {
      return 0
    }

    if (isLocalSoftwarePackageUrl(packageInfo.downloadUrl)) {
      const localFilePath = resolveLocalSoftwarePackagePath(
        packageInfo.downloadUrl,
      )
      const fileStat = await getFileStatSafe(localFilePath)
      return Number(fileStat?.size ?? 0) || 0
    }

    try {
      const response = await axios.head(packageInfo.downloadUrl, {
        timeout: 10000,
        maxRedirects: 5,
      })
      const contentLength = resolveSoftwareContentLength(response.headers)
      if (contentLength) {
        return contentLength
      }
    } catch (error) {
      // 部分固定链接不支持 HEAD，继续尝试 Range 请求读取总长度
    }

    return 0
  }

  /********************************************************************************
   * @brief: 创建下载进度统计流，保证进度统计和文件写入在同一条管线内
   * @param {*} packageInfo
   * @return {*}
   ********************************************************************************/
  private createSoftwareDownloadProgressStream = (
    packageInfo: TSoftwarePackageInfo,
  ) => {
    let loadedSize = 0
    let lastProgress = -1
    let lastUpdateTime = 0

    return new Transform({
      transform: (chunk: Buffer, encoding, callback) => {
        loadedSize += chunk.length
        const rawProgress = calcSoftwareDownloadProgress(
          loadedSize,
          packageInfo.fileSize,
        )
        const progress =
          packageInfo.fileSize && rawProgress >= 100 ? 99 : rawProgress
        const nowTime = Date.now()

        if (
          nowTime - lastUpdateTime >= 250 ||
          (progress >= 99 && lastProgress !== progress)
        ) {
          lastProgress = progress
          lastUpdateTime = nowTime

          this.setState({
            progress,
            downloadedSize: loadedSize,
            message: packageInfo.fileSize
              ? `Downloading update package... ${progress}%`
              : `Downloading update package... ${formatSoftwareSizeText(loadedSize)}`,
          })
        }

        callback(null, chunk)
      },
    })
  }

  /********************************************************************************
   * @brief: 复制本地安装包用于软件更新测试
   * @param {*} packageInfo
   * @param {*} targetFilePath
   * @return {*}
   ********************************************************************************/
  private copyLocalUpdatePackage = async (
    packageInfo: TSoftwarePackageInfo,
    targetFilePath: string,
  ) => {
    const localFilePath = resolveLocalSoftwarePackagePath(packageInfo.downloadUrl)
    const fileStat = await getFileStatSafe(localFilePath)

    if (!fileStat) {
      throw new Error('The local update package cannot be found.')
    }

    await copyFile(localFilePath, targetFilePath)

    const finishedPackageInfo: TSoftwarePackageInfo = {
      ...packageInfo,
      fileSize: Number(fileStat.size ?? 0),
    }

    this.setState({
      phase: 'downloaded',
      busy: false,
      progress: 100,
      downloadedSize: Number(fileStat.size ?? 0),
      updateInfo: finishedPackageInfo,
      downloadedFilePath: targetFilePath,
      message: 'The local update package is ready to install.',
    })

    return finishedPackageInfo
  }

  /********************************************************************************
   * @brief: 启动安装包，Windows 下会在退出应用后继续安装
   * @param {*} installerPath
   * @return {*}
   ********************************************************************************/
  private launchInstaller = async (installerPath: string) => {
    const fileExt = installerPath.split('.').pop()?.toLowerCase() ?? ''

    if (process.platform === 'win32' && ['exe', 'msi'].includes(fileExt)) {
      spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore',
      }).unref()

      setTimeout(() => {
        app.quit()
      }, 300)
      return
    }

    const openRes = await shell.openPath(installerPath)
    if (openRes) {
      throw new Error(openRes)
    }
  }

  /********************************************************************************
   * @brief: 统一提取错误信息，避免界面收到模糊提示
   * @param {*} error
   * @param {*} fallbackMessage
   * @return {*}
   ********************************************************************************/
  private getErrorMessage = (error: any, fallbackMessage: string) => {
    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message
    }

    return fallbackMessage
  }

  /********************************************************************************
   * @brief: 合并并广播软件更新状态
   * @param {*} partialState
   * @return {*}
   ********************************************************************************/
  private setState = (partialState: Partial<TSoftwareUpdateState>) => {
    const currentVersion = this.updateState.updateInfo?.currentVersion || app.getVersion()

    this.updateState = {
      ...this.updateState,
      ...partialState,
      updateInfo:
        partialState.updateInfo === undefined
          ? this.updateState.updateInfo
          : partialState.updateInfo,
      updatedAt: Date.now(),
    }

    if (!this.updateState.updateInfo) {
      this.updateState.updateInfo = {
        currentVersion,
        latestVersion: '',
        platformKey: '',
        fileName: '',
        fileSize: 0,
        downloadUrl: '',
        pageUrl: '',
        releaseNotes: '',
        checksum: '',
        publishedAt: '',
        hasDirectPackage: false,
      }
    }

    CreateWindow.travWindowSend({
      [SOFTWARE_UPDATE_STATE_CHANNEL]: cloneSoftwareUpdateState(this.updateState),
    })
  }
}

// 导出单例实例，保持现有调用方式不变
const softwareUpdateService = new SoftwareUpdateService()

export default softwareUpdateService
