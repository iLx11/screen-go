/********************************************************************************
 * @Author: iLx1
 * @date: 2025-08-18 22:24:51
 * @filepath: \screen-go\src\utils\tools\windowHandle.ts
 * @description:  窗口管理与处理
 * @email: colorful_ilx1@163.com
 * @copyright: Copyright (c) iLx1, All Rights Reserved.
 ********************************************************************************/

import { useConfigStore } from '@/stores/configStore'

const configStore = useConfigStore()
const win = window as any

/********************************************************************************
 * @brief: 屏幕编辑
 * @param {*} curScreen
 * @return {*}
 ********************************************************************************/
export const openScreenPage = (curScreen: number = 0) => {
  createWindow({
    route: '/screen',
    windowName: 'screen',
    modal: true,
  })
}

/********************************************************************************
 * @brief: 打开提醒窗口
 * @return {*}
 ********************************************************************************/
export const openReminderWindow = async () => {
  const screenSizse = await win.api.getScreenSize()
  const windowSize = {
    width: 600,
    height: 400,
  }
  win.api.createNewWindow({
    route: '/reminder',
    width: windowSize.width,
    height: windowSize.height,
    maxWidth: windowSize.width,
    maxHeight: windowSize.height,
    alwaysOnTop: true,
    x: screenSizse.width - windowSize.width,
    y: screenSizse.height - windowSize.height - 50,
    modal: false,
    windowName: 'reminder',
  })
}

/********************************************************************************
 * @brief: 打开键盘窗口
 * @return {*}
 ********************************************************************************/
export const openKeyboardWindow = async () => {
  const windowSize = {
    width: 1100,
    height: 570,
  }
  win.api.createNewWindow({
    route: '/keyboard',
    width: windowSize.width,
    height: windowSize.height,
    // maxWidth: windowSize.width,
    // maxHeight: windowSize.height,
    // alwaysOnTop: true,
    modal: true,
    windowName: 'keyboard',
  })
}

/********************************************************************************
 * @brief: 打开代码模板窗口
 * @return {*}
 ********************************************************************************/
export const openTemplateWindow = async () => {
  const windowSize = {
    width: 1050,
    height: 850,
  }
  win.api.createNewWindow({
    route: '/template',
    width: windowSize.width,
    height: windowSize.height,
    // maxWidth: windowSize.width,
    // maxHeight: windowSize.height,
    // alwaysOnTop: true,
    modal: true,
    windowName: 'template',
  })
}

/********************************************************************************
 * @brief: 打开代码模板设置窗口
 * @return {*}
 ********************************************************************************/
export const openTempSettingWindow = async () => {
  const windowSize = {
    width: 500,
    height: 400,
  }
  win.api.createNewWindow({
    route: '/temp-setting',
    width: windowSize.width,
    height: windowSize.height,
    // maxWidth: windowSize.width,
    // maxHeight: windowSize.height,
    // alwaysOnTop: true,
    modal: true,
    windowName: 'temp-setting',
  })
}

/********************************************************************************
 * @brief: 创建窗口
 * @param {*} route
 * @return {*}
 ********************************************************************************/
export const createWindow = (windowConfig: object = {}) => {
  let config = Object.assign(
    {
      width: 900,
      height: 700,
      // minWidth: 800,
      // minHeight: 630,
      minWidth: 900,
      minHeight: 700,
    },
    windowConfig,
  )
  // console.info(win.api)
  win.api.createNewWindow(config)
}
