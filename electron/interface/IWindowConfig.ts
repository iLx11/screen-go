export default interface IWindowConfig {
  id: number | null
  title: string
  width: number | null
  height: number | null
  minWidth: number | null
  minHeight: number | null
  route: string
  resizable: boolean
  maximize: boolean
  backgroundColor: string
  data: object | null
  isMultiWindow: boolean
  isMainWin: boolean
  parentId: number | null
  modal: boolean
}
