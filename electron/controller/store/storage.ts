import Store from 'electron-store'
import { ipcMain } from 'electron'

const store = new Store()

export const setItem = (name: string, item: string) => {
  store.set(name, item)
  // localStorage.setItem(name, item)
}

export const getItem = (name: string): any => {
  return store.get(name)
  // return localStorage.getItem(name) ? localStorage.getItem(name) : null
}

export const delItem = (name: string) => {
  store.delete(name)
  // localStorage.removeItem(name)
}

export const storeListener = () => {
  ipcMain.on('set-item', (event, name: string, item: string) => {
    setItem(name, item)
  })

  ipcMain.on('del-item', (event, name: string) => {
    delItem(name)
  })

  ipcMain.handle('get-item', async (event, name: string) => {
    return await getItem(name)
  })
}
