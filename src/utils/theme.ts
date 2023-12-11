/*
 * @Author: 姚恒锋 1921934563@qq.com
 * @Date: 2023-08-15 13:35:44
 * @LastEditors: 姚恒锋 1921934563@qq.com
 * @LastEditTime: 2023-08-19 15:26:35
 * @FilePath: \electron-v3-ts-tempalte\src\renderer\utils\theme.ts
 * @Description: 主题设置
 */
import { getItem, setItem } from "../utils/storage";

export function setTheme(color = null) {
  console.info("设置颜色: ", color);
  let data = color ? color : getItem("theme");
  let theme = {
    bg: "rgb(47, 50, 65)",
    btn: "rgb(159, 234, 249)",
    font: "rgb(255, 255, 255)",
    key: "rgb(47, 50, 65)",
    screen: "rgba(0, 0, 0, 0.2)",
    keyBtn: "rgba(175, 175, 175, 0.2)",
  };
  if (data == "light") {
    theme = {
      bg: "rgb(255, 255, 255)",
      btn: "rgb(0, 0, 0, 0.2)",
      font: "rgb(0, 0, 0)",
      key: "rgba(241, 241, 247, 0.5)",
      screen: "rgba(0, 0, 0, 0.1)",
      keyBtn: "rgba(95, 95, 95, 0.3)",
    };
  } else {
    theme = {
      bg: "rgb(47, 50, 65)",
      btn: "rgb(159, 234, 249)",
      font: "rgb(255, 255, 255)",
      key: "rgb(47, 50, 65)",
      screen: "rgba(0, 0, 0, 0.2)",
      keyBtn: "rgba(175, 175, 175, 0.2)",
    };
  }
  document.documentElement.style.setProperty("--theme-bg-color", theme.bg);
  document.documentElement.style.setProperty("--theme-btn-color", theme.btn);
  document.documentElement.style.setProperty("--theme-font-color", theme.font);
  document.documentElement.style.setProperty("--theme-key-bg-color", theme.key);
  document.documentElement.style.setProperty("--theme-sreen-bg-color", theme.screen);
  document.documentElement.style.setProperty("--theme-key-btn-color", theme.keyBtn);
  setItem("theme", data);
}

export const customImgEditorTheme = {
  // image 坐上角度图片
  "common.bi.image": "", // 在这里换上你喜欢的logo图片
  "common.bisize.width": "0px",
  "common.bisize.height": "0px",
  "common.backgroundImage": "none",
  "common.backgroundColor": "#f3f4f6",
  // "common.border": "1px solid #444",

  // header
  "header.backgroundImage": "none",
  "header.backgroundColor": "#f3f4f6",
  "header.border": "0px",
  "header.margin": "0px auto",

  // load button
  "loadButton.backgroundColor": "#fff",
  "loadButton.border": "1px solid #ddd",
  "loadButton.color": "#222",
  "loadButton.fontFamily": "NotoSans, sans-serif",
  "loadButton.fontSize": "12px",
  "loadButton.position": "absolution",
  "loadButton.top": "30px",
  "loadButton.right": "-30px",
  "loadButton.height": "30px",
  "loadButton.cursor": "pointer",
  // "loadButton.display": "none", // 可以直接隐藏掉

  // download button
  "downloadButton.backgroundColor": "#fdba3b",
  "downloadButton.border": "1px solid #fdba3b",
  "downloadButton.color": "#fff",
  "downloadButton.fontFamily": "NotoSans, sans-serif",
  "downloadButton.fontSize": "12px",
  "downloadButton.display": "none", // 可以直接隐藏掉

  // icons default
  "menu.normalIcon.color": "#8a8a8a",
  "menu.activeIcon.color": "#555555",
  "menu.disabledIcon.color": "#434343",
  "menu.hoverIcon.color": "#e9e9e9",
  "submenu.normalIcon.color": "#8a8a8a",
  "submenu.activeIcon.color": "#e9e9e9",

  "menu.iconSize.width": "24px",
  "menu.iconSize.height": "24px",
  "submenu.iconSize.width": "32px",
  "submenu.iconSize.height": "32px",

  // submenu primary color
  "submenu.backgroundColor": "#1e1e1e",
  "submenu.partition.color": "#858585",

  // submenu labels
  "submenu.normalLabel.color": "#858585",
  "submenu.normalLabel.fontWeight": "lighter",
  "submenu.activeLabel.color": "#fff",
  "submenu.activeLabel.fontWeight": "lighter",

  // checkbox style
  "checkbox.border": "1px solid #ccc",
  "checkbox.backgroundColor": "#fff",

  // rango style
  // "range.pointer.color": "#fff",
  "range.bar.color": "#666",
  "range.subbar.color": "#d1d1d1",

  // "range.disabledPointer.color": "#414141",
  "range.disabledBar.color": "#282828",
  "range.disabledSubbar.color": "#414141",

  "range.value.color": "#fff",
  "range.value.fontWeight": "lighter",
  "range.value.fontSize": "11px",
  "range.value.border": "1px solid #353535",
  "range.value.backgroundColor": "#151515",
  "range.title.color": "#fff",
  "range.title.fontWeight": "lighter",

  // colorpicker style
  "colorpicker.button.border": "1px solid #1e1e1e",
  "colorpicker.title.color": "#fff"
};
