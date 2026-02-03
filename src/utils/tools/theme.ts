// default keys and styles
export const defaultCustomTheme = {
  'common.bi.image': 'https://uicdn.toast.com/toastui/img/tui-image-editor-bi.png',
  'common.bisize.width': '251px',
  'common.bisize.height': '21px',
  'common.backgroundImage': 'none',
  'common.backgroundColor': '#1e1e1e',
  'common.border': '0px',

  // header
  'header.backgroundImage': 'none',
  'header.backgroundColor': 'transparent',
  'header.border': '0px',

  // load button
  'loadButton.backgroundColor': '#fff',
  'loadButton.border': '1px solid #ddd',
  'loadButton.color': '#222',
  'loadButton.fontFamily': 'NotoSans, sans-serif',
  'loadButton.fontSize': '12px',

  // download button
  'downloadButton.backgroundColor': '#fdba3b',
  'downloadButton.border': '1px solid #fdba3b',
  'downloadButton.color': '#fff',
  'downloadButton.fontFamily': 'NotoSans, sans-serif',
  'downloadButton.fontSize': '12px',

  // icons default
  'menu.normalIcon.color': '#8a8a8a',
  'menu.activeIcon.color': '#555555',
  'menu.disabledIcon.color': '#434343',
  'menu.hoverIcon.color': '#e9e9e9',
  'submenu.normalIcon.color': '#8a8a8a',
  'submenu.activeIcon.color': '#e9e9e9',

  'menu.iconSize.width': '24px',
  'menu.iconSize.height': '24px',
  'submenu.iconSize.width': '32px',
  'submenu.iconSize.height': '32px',

  // submenu primary color
  'submenu.backgroundColor': '#1e1e1e',
  'submenu.partition.color': '#858585',

  // submenu labels
  'submenu.normalLabel.color': '#858585',
  'submenu.normalLabel.fontWeight': 'lighter',
  'submenu.activeLabel.color': '#fff',
  'submenu.activeLabel.fontWeight': 'lighter',

  // checkbox style
  'checkbox.border': '1px solid #ccc',
  'checkbox.backgroundColor': '#fff',

  // rango style
  'range.pointer.color': '#fff',
  'range.bar.color': '#666',
  'range.subbar.color': '#d1d1d1',

  'range.disabledPointer.color': '#414141',
  'range.disabledBar.color': '#282828',
  'range.disabledSubbar.color': '#414141',

  'range.value.color': '#fff',
  'range.value.fontWeight': 'lighter',
  'range.value.fontSize': '11px',
  'range.value.border': '1px solid #353535',
  'range.value.backgroundColor': '#151515',
  'range.title.color': '#fff',
  'range.title.fontWeight': 'lighter',

  // colorpicker style
  'colorpicker.button.border': '1px solid #1e1e1e',
  'colorpicker.title.color': '#fff'
};

export const customImgEditorTheme = {
  // image 左上角度图片
  'common.bi.image': '', // 在这里换上你喜欢的logo图片
  'common.bisize.width': '0px',
  'common.bisize.height': '0px',
  'common.backgroundImage': 'none',
  'common.backgroundColor': '#f3f4f6',
  // "common.border": "1px solid #444",

  // load button
  'loadButton.backgroundColor': '#90989e',
  'loadButton.border': '1px solid #ddd',
  'loadButton.color': 'white',
  'loadButton.fontFamily': 'NotoSans, sans-serif',
  'loadButton.fontSize': '12px',
  'loadButton.cusor': 'pointer',
  // "loadButton.display": "none", // 可以直接隐藏掉

  // download button
  'downloadButton.backgroundColor': '#fdba3b',
  'downloadButton.border': '1px solid #fdba3b',
  'downloadButton.color': '#fff',
  'downloadButton.fontFamily': 'NotoSans, sans-serif',
  'downloadButton.fontSize': '12px',
  'downloadButton.display': 'none', // 可以直接隐藏掉

  // header
  'header.backgroundImage': 'none',
  'header.backgroundColor': '#f3f4f6',
  'header.border': '0px',
  'header.margin': '0px auto',

  // icons default
  'menu.normalIcon.color': '#8a8a8a',
  'menu.activeIcon.color': '#555555',
  'menu.disabledIcon.color': '#434343',
  'menu.hoverIcon.color': '#e9e9e9',
  'submenu.normalIcon.color': '#8a8a8a',
  'submenu.activeIcon.color': '#e9e9e9',

  'menu.iconSize.width': '24px',
  'menu.iconSize.height': '24px',
  'submenu.iconSize.width': '32px',
  'submenu.iconSize.height': '32px',

  // submenu primary color
  'submenu.backgroundColor': '#1e1e1e',
  'submenu.partition.color': '#858585',

  // submenu labels
  'submenu.normalLabel.color': '#ffffff',
  'submenu.normalLabel.fontWeight': 'lighter',
  'submenu.activeLabel.color': '#fff',
  'submenu.activeLabel.fontWeight': 'lighter',

  // checkbox style
  'checkbox.border': '1px solid #ccc',
  'checkbox.borderRadius': '50%',
  'checkbox.backgroundColor': '#fff',

  // rango style
  "range.pointer.color": "#fff",
  'range.bar.color': '#666',
  'range.subbar.color': '#d1d1d1',

  // "range.disabledPointer.color": "#414141",
  'range.disabledBar.color': '#282828',
  'range.disabledSubbar.color': '#414141',

  'range.value.color': '#fff',
  'range.value.fontWeight': 'lighter',
  'range.value.fontSize': '11px',
  'range.value.border': '1px solid #353535',
  'range.value.backgroundColor': '#151515',
  'range.title.color': '#fff',
  'range.title.fontWeight': 'lighter',

  // colorpicker style
  'colorpicker.button.border': '1px solid #1e1e1e',
  'colorpicker.title.color': '#fff',
}

export const editorConfig = {
  usageStatistics: false, //这个一定要写要不然会报错
  includeUI: {
    // 装载图片
    loadImage: {
      path: './img/black.png', //加载的图片链接
      name: 'image', //图片名称（不重要）
    },
    //操作菜单栏
    menu: [
      'crop', // 裁切
      'flip', // 翻转
      'rotate', // 旋转
      'draw', // 添加绘画
      'shape', // 添加形状
      'icon', // 添加图标
      'text', // 添加文本
      'mask', // 添加覆盖
      'filter', // 添加滤镜
    ],
    menuBarPosition: 'bottom', //操作栏位置
    locale: {
      Crop: '裁剪',
      Load: '加载图片背景',
      DeleteAll: '删除全部',
      Delete: '删除',
      Undo: '前一步',
      Redo: '后一步',
      Reset: '重置',
      Flip: '镜像',
      Rotate: '旋转',
      Draw: '画笔',
      Shape: '图形',
      Icon: '图标',
      Text: '文字',
      Mask: '图片遮罩',
      Filter: '滤镜',
      History: '历史',
      Hand: '手型',
      ZoomIn: '放大',
      ZoomOut: '缩小',
      Bold: '加粗',
      Italic: '斜体',
      Underline: '下划线',
      Left: '左',
      Center: '中',
      Right: '右',
      Color: '颜色',
      'Text size': '字体大小',
      Custom: '用户配置',
      Square: '正方形',
      Apply: '应用',
      Cancel: '取消',
      'Flip X': 'X镜像',
      'Flip Y': 'Y镜像',
      Range: '范围',
      Stroke: '边框',
      Fill: '填充',
      Circle: '圆',
      Triangle: '三角形',
      Rectangle: '多边形',
      Free: '自由曲线',
      Straight: '直线',
      Arrow: '箭头',
      'Arrow-2': '箭头2',
      'Arrow-3': '箭头3',
      'Star-1': '星1',
      'Star-2': '星2',
      Polygon: '多边形',
      Location: '定位标',
      Heart: '心',
      Bubble: '对话框',
      'Custom icon': '用户图标',
      'Load Mask Image': '加载图片遮罩',
      Grayscale: '去色灰色',
      Blur: '模糊',
      Sharpen: '锐化',
      Emboss: '浮雕',
      'Remove White': '去除白色',
      Distance: '距离',
      Brightness: '亮度',
      Noise: '噪点',
      'Color Filter': '彩色滤光',
      Sepia: '怀旧风',
      Sepia2: '怀旧风2',
      Invert: '反色',
      Pixelate: '像素化',
      Threshold: '阈值',
      Tint: '色调',
      Multiply: '加倍的',
      Blend: '混合',
      Double: '双倍的',
      // Download: '324',
      BGColor: '背景颜色',
    },
    theme: customImgEditorTheme, //主题样式
  },
}
