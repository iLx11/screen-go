import { app, BrowserWindow, shell } from 'electron'
import { createWriteStream } from 'fs'
import { rm } from 'fs/promises'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'
import CreateWindow from '../window/createWindow'
import {
  buildSoftwarePackageInfo,
  calcFileSHA256,
  calcSoftwareDownloadProgress,
  cloneSoftwareUpdateState,
  compareVersion,
  createDefaultSoftwareUpdateState,
  errorResult,
  formatSoftwareSizeText,
  getFileSizeSafe,
  getSoftwareLatestReleaseApiUrl,
  isFileExists,
  resolveSoftwareDownloadedFilePath,
  successResult,
  type ActionResult,
  type GitHubReleaseInfo,
  type SoftwarePackageInfo,
  type SoftwareUpdateState,
} from './softwareUpdateTools'

const SOFTWARE_UPDATE_STATE_CHANNEL = 'softwareUpdate'

class SoftwareUpdateService {
  private updateState: SoftwareUpdateState =
    createDefaultSoftwareUpdateState(app.getVersion())
  private downloadAbortController: AbortController | null = null

  public getState = () => {
    return cloneSoftwareUpdateState(this.updateState)
  }

  public resetState = async (): Promise<ActionResult<boolean>> => {
    if (this.downloadAbortController) {
      this.downloadAbortController.abort()
      this.downloadAbortController = null
    }

    this.setState(createDefaultSoftwareUpdateState(app.getVersion()))
    return successResult(true)
  }

  public checkUpdate = async (): Promise<ActionResult<SoftwarePackageInfo>> => {
    this.setState({
      phase: 'checking',
      busy: true,
      progress: 0,
      downloadedSize: 0,
      downloadedFilePath: '',
      message: '正在检查更新...',
    })

    try {
      const releaseData = await this.fetchLatestRelease()
      const currentVersion = app.getVersion()
      const packageInfo = buildSoftwarePackageInfo(releaseData, currentVersion)

      if (!packageInfo.latestVersion) {
        throw new Error('GitHub Release 缺少有效版本号')
      }

      if (compareVersion(packageInfo.latestVersion, currentVersion) <= 0) {
        this.setState({
          phase: 'not-available',
          busy: false,
          progress: 0,
          downloadedSize: 0,
          updateInfo: packageInfo,
          downloadedFilePath: '',
          message: '当前已是最新版本',
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
          ? '发现新版本，可以下载安装包'
          : '发现新版本，请打开 Release 页面下载',
      })

      return successResult(packageInfo)
    } catch (error) {
      const message = this.getErrorMessage(error, '检查更新失败')
      this.setState({
        phase: 'error',
        busy: false,
        progress: 0,
        downloadedSize: 0,
        downloadedFilePath: '',
        message,
      })

      return errorResult(message)
    }
  }

  public downloadUpdate = async (): Promise<ActionResult<SoftwarePackageInfo>> => {
    if (this.updateState.busy) {
      return errorResult('已有更新任务正在执行')
    }

    const packageInfo = await this.ensureAvailablePackageInfo()
    if (!packageInfo) {
      return errorResult('请先检查更新')
    }

    if (!packageInfo.hasDirectPackage || !packageInfo.downloadUrl) {
      return errorResult('当前版本没有匹配本机平台的安装包')
    }

    const targetFilePath = await resolveSoftwareDownloadedFilePath(
      packageInfo.fileName
    )
    const abortController = new AbortController()
    this.downloadAbortController = abortController

    this.setState({
      phase: 'downloading',
      busy: true,
      progress: 0,
      downloadedSize: 0,
      downloadedFilePath: '',
      message: '正在下载安装包...',
    })

    try {
      await rm(targetFilePath, { force: true })

      const response = await fetch(packageInfo.downloadUrl, {
        signal: abortController.signal,
        headers: {
          'User-Agent': 'ScreenGo-Updater',
          Accept: 'application/octet-stream',
        },
      })

      if (!response.ok || !response.body) {
        throw new Error(`安装包下载失败：${response.status}`)
      }

      const totalSize =
        Number(response.headers.get('content-length') || 0) ||
        packageInfo.fileSize
      let loadedSize = 0
      let lastUpdateTime = 0
      const sourceStream = Readable.fromWeb(response.body as any)

      sourceStream.on('data', chunk => {
        loadedSize += Buffer.byteLength(chunk)
        const progress = calcSoftwareDownloadProgress(loadedSize, totalSize)
        const nextProgress = totalSize && progress >= 100 ? 99 : progress
        const nowTime = Date.now()

        if (nowTime - lastUpdateTime < 250 && nextProgress < 99) return
        lastUpdateTime = nowTime
        this.setState({
          progress: nextProgress,
          downloadedSize: loadedSize,
          message: totalSize
            ? `正在下载安装包... ${nextProgress}%`
            : `正在下载安装包... ${formatSoftwareSizeText(loadedSize)}`,
        })
      })

      await pipeline(sourceStream, createWriteStream(targetFilePath))

      this.setState({
        progress: 99,
        message: '正在校验安装包...',
      })

      if (packageInfo.checksum) {
        const fileHash = await calcFileSHA256(targetFilePath)
        if (fileHash.toLowerCase() !== packageInfo.checksum.toLowerCase()) {
          await rm(targetFilePath, { force: true })
          throw new Error('安装包校验失败')
        }
      }

      const fileSize = await getFileSizeSafe(targetFilePath)
      const finishedPackageInfo = {
        ...packageInfo,
        fileSize: fileSize || packageInfo.fileSize,
      }

      this.downloadAbortController = null
      this.setState({
        phase: 'downloaded',
        busy: false,
        progress: 100,
        downloadedSize: finishedPackageInfo.fileSize,
        updateInfo: finishedPackageInfo,
        downloadedFilePath: targetFilePath,
        message: '安装包已下载完成',
      })

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
          message: '已取消更新下载',
        })
        return errorResult('已取消更新下载')
      }

      const message = this.getErrorMessage(error, '下载更新失败')
      this.setState({
        phase: 'error',
        busy: false,
        progress: 0,
        downloadedSize: 0,
        downloadedFilePath: '',
        message,
      })

      return errorResult(message)
    }
  }

  public cancelDownload = async (): Promise<ActionResult<boolean>> => {
    if (!this.downloadAbortController) {
      return errorResult('没有正在下载的更新任务')
    }

    this.downloadAbortController.abort()
    this.downloadAbortController = null
    this.setState({
      phase: 'cancelled',
      busy: false,
      progress: 0,
      downloadedSize: 0,
      downloadedFilePath: '',
      message: '已取消更新下载',
    })

    return successResult(true)
  }

  public installUpdate = async (): Promise<ActionResult<boolean>> => {
    const downloadedFilePath = String(this.updateState.downloadedFilePath || '')
    if (!downloadedFilePath) {
      return errorResult('请先下载安装包')
    }

    if (!(await isFileExists(downloadedFilePath))) {
      return errorResult('安装包不存在，请重新下载')
    }

    try {
      this.setState({
        phase: 'installing',
        busy: true,
        progress: 100,
        message: '正在启动安装包...',
      })

      await this.launchInstaller(downloadedFilePath)
      return successResult(true)
    } catch (error) {
      const message = this.getErrorMessage(error, '启动安装包失败')
      this.setState({
        phase: 'error',
        busy: false,
        message,
      })
      return errorResult(message)
    }
  }

  public openDownloadPage = async (): Promise<ActionResult<boolean>> => {
    const packageInfo = this.updateState.updateInfo
    const pageUrl = packageInfo?.pageUrl || packageInfo?.downloadUrl

    if (!pageUrl) {
      return errorResult('没有可打开的下载页面')
    }

    await shell.openExternal(pageUrl)
    return successResult(true)
  }

  private fetchLatestRelease = async (): Promise<GitHubReleaseInfo> => {
    const response = await fetch(getSoftwareLatestReleaseApiUrl(), {
      headers: {
        'User-Agent': 'ScreenGo-Updater',
        Accept: 'application/vnd.github+json',
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub Release 获取失败：${response.status}`)
    }

    return (await response.json()) as GitHubReleaseInfo
  }

  private ensureAvailablePackageInfo = async () => {
    if (
      this.updateState.updateInfo?.latestVersion &&
      compareVersion(
        this.updateState.updateInfo.latestVersion,
        this.updateState.updateInfo.currentVersion
      ) > 0
    ) {
      return this.updateState.updateInfo
    }

    const checkResult = await this.checkUpdate()
    if (!checkResult.success) return null
    return (checkResult.data as SoftwarePackageInfo) || null
  }

  private launchInstaller = async (installerPath: string) => {
    const fileExt = installerPath.split('.').pop()?.toLowerCase() || ''

    if (process.platform == 'win32' && ['exe', 'msi'].includes(fileExt)) {
      spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      }).unref()

      setTimeout(() => {
        app.quit()
      }, 300)
      return
    }

    const openResult = await shell.openPath(installerPath)
    if (openResult) {
      throw new Error(openResult)
    }
  }

  private getErrorMessage = (error: unknown, fallbackMessage: string) => {
    if (error instanceof Error && error.message.trim()) {
      return error.message
    }

    return fallbackMessage
  }

  private setState = (partialState: Partial<SoftwareUpdateState>) => {
    this.updateState = {
      ...this.updateState,
      ...partialState,
      updateInfo:
        partialState.updateInfo === undefined
          ? this.updateState.updateInfo
          : partialState.updateInfo,
      updatedAt: Date.now(),
    }

    CreateWindow.travWindowSend({
      [SOFTWARE_UPDATE_STATE_CHANNEL]: cloneSoftwareUpdateState(this.updateState),
    })
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.webContents.isDestroyed()) {
        window.webContents.send(
          'software-update-state',
          cloneSoftwareUpdateState(this.updateState)
        )
      }
    })
  }
}

const softwareUpdateService = new SoftwareUpdateService()

export default softwareUpdateService
