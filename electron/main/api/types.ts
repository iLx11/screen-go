export type VideoFrameData = Array<Array<number | string>>

export interface VideoFrameProgress {
  progress: number
  message: string
}

export interface VideoFrameError {
  phase?: string
  name?: string
  message?: string
  stack?: string
  code?: string
  errno?: number
  syscall?: string
  path?: string
  exitCode?: number
  stderr?: string
  args?: string[]
  binaryPath?: string
  ffmpegPath?: string
  ffprobePath?: string
  platform?: string
  arch?: string
  videoPath?: string
  tempDirPath?: string
  width?: unknown
  height?: unknown
  videoStart?: unknown
  videoDur?: unknown
  videoFrame?: unknown
  scaleMode?: unknown
  threshold?: unknown
  configArray?: unknown[]
}

export interface VideoInfo {
  width: number
  height: number
  duration: number
}

export interface SoftwareUpdateInfo {
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

export interface SoftwareUpdateState {
  phase: string
  busy: boolean
  progress: number
  downloadedSize: number
  message: string
  updateInfo: SoftwareUpdateInfo | null
  downloadedFilePath: string
  updatedAt: number
}

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

export interface SelectFileResult {
  canceled?: boolean
  filePaths: string[]
}

export interface IStore {
  setItem(name: string, item: string): void
  getItem(name: string): Promise<string>
  delItem(name: string): void
}

export interface IWindow {
  createNewWindow(option: unknown, config: unknown): void
  getScreenSize(): Promise<{ width: number; height: number }>
  setWindowOnTop(state: boolean): void
  minimizeWindow(): void
  maximizeWindow(state: boolean, size?: unknown): void
  closeWindow(): void
  hideWindow(): void
  getWindowPosition(): Promise<{ x: number; y: number }>
}

export interface IData {
  getVideoFrameData(...args: unknown[]): Promise<VideoFrameData | null>
  getVideoInfo(videoPath: string): Promise<VideoInfo | null>
  cancelVideoFrameData(): Promise<boolean>
  videoFrameProgressListener(cb: (data: VideoFrameProgress) => void): () => void
  videoFrameErrorListener(cb: (data: VideoFrameError) => void): () => void
}

export interface IFile {
  getImgPath(): Promise<string>
  getFilePath(): Promise<string>
  getDirPath(): Promise<string>
  readClipboard(): Promise<string>
  writeClipboard(text: string): void
  openPath(path: string): void
  readShortcutsFile(path: string): Promise<string>
  writeConfigFile(context: string): void
  getConfigFile(): Promise<string>
  selectVideoFile(): Promise<SelectFileResult>
  saveBinFile(data: number[], fileName?: string): Promise<boolean>
}

export interface IConfig {
  setConfigStore(obj: unknown): void
  storeChangeListener(cb: (data: unknown) => void): void
}

export interface IUpdate {
  getSoftwareUpdateState(): Promise<SoftwareUpdateState>
  resetSoftwareUpdateState(): Promise<ActionResult<boolean>>
  checkSoftwareUpdate(): Promise<ActionResult<SoftwareUpdateInfo>>
  downloadSoftwareUpdate(): Promise<ActionResult<SoftwareUpdateInfo>>
  cancelSoftwareUpdate(): Promise<ActionResult<boolean>>
  installSoftwareUpdate(): Promise<ActionResult<boolean>>
  openSoftwareUpdatePage(): Promise<ActionResult<boolean>>
  softwareUpdateListener(cb: (data: SoftwareUpdateState) => void): () => void
}
