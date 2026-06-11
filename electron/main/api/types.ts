export type VideoFrameData = Array<Array<number | string>>

export interface VideoFrameProgress {
  progress: number
  message: string
}

export interface VideoInfo {
  width: number
  height: number
  duration: number
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
