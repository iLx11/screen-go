const Store = require('electron-store') 
 
const store = new Store();
 
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