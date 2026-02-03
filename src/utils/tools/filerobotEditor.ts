import VanillaFilerobotImageEditor from 'filerobot-image-editor'

const { TABS, TOOLS } = VanillaFilerobotImageEditor

export const getFilerobotEditorConfig = (onSave, onClose) => {
  return {
    // 编辑图片背景
    source: './img/black.png',
    // source: 'https://i.ibb.co/KjzPgsnC/City.jpg',
    // theme: themeColor,
    // 保存回调
    onSave,
    // 默认颜色选择
    annotationsCommon: {
      fill: '#ffffff',
    },
    // 关闭回调， 不配置则不显示
    onClose,
    // text 默认文本
    Text: { text: '双击可编辑，\n点击可移动' },
    Rotate: { angle: 90, componentType: 'slider' },
    // 编辑工具栏
    tabsIds: [TABS.ADJUST, TABS.ANNOTATE, TABS.FINETUNE, TABS.FILTERS],
    // 默认选中的编辑工具
    defaultTabId: TABS.ANNOTATE,
    // 工具的默认选中
    defaultToolId: TOOLS.IMAGE,
    // 关闭按钮
    showBackButton: true,
    // 后端翻译
    useBackendTranslations: false,
    // 翻译对象
    translations: transText,
    // 禁止离开页面时是否提示未保存的更改
    avoidChangesNotSavedAlertOnLeave: true,
    // 裁剪配置
    Crop: {
      ratio: 80 / 43,
      ratioTitleKey: '屏幕比例',
      // 是否禁用裁剪预设
      noPresets: false,
      presetsItems: [
        {
          titleKey: '屏幕比例',
          descriptionKey: '80:43',
          ratio: 80 / 43,
          // icon: CropClassicTv, // optional, CropClassicTv is a React Function component. Possible (React Function component, string or HTML Element)
        },
        // {
        //   titleKey: '单色屏幕比例',
        //   descriptionKey: '9:5',
        //   ratio: 9 / 5,
        //   // icon: CropCinemaScope, // optional, CropCinemaScope is a React Function component.  Possible (React Function component, string or HTML Element)
        // },
      ],
    },
    // 保存按钮，自定义保存逻辑
    removeSaveButton: true,
    // resetOnImageSourceChange: true,
  }
}

export const transText = {
  name: '文件名',
  save: '保存',
  saveAs: '另存为',
  back: '返回',
  loading: '加载中...',
  resetOperations: '重置/删除所有操作',
  changesLoseWarningHint: '若点击「重置」按钮，所有修改将会丢失，是否继续？',
  discardChangesWarningHint: '若关闭弹窗，最近的修改将不会保存。',
  cancel: '取消',
  apply: '应用',
  warning: '警告',
  confirm: '确认',
  discardChanges: '放弃修改',
  undoTitle: '撤销上一步操作',
  redoTitle: '重做上一步操作',
  showImageTitle: '显示原图',
  zoomInTitle: '放大',
  zoomOutTitle: '缩小',
  toggleZoomMenuTitle: '展开/收起缩放菜单',
  adjustTab: '裁剪',
  finetuneTab: '图片效果',
  filtersTab: '滤镜',
  watermarkTab: '水印',
  annotateTabLabel: '标注',
  resize: '调整尺寸',
  resizeTab: '调整尺寸',
  imageName: '图片名称',
  invalidImageError: '提供的图片无效。',
  uploadImageError: '图片上传失败。',
  areNotImages: '不是有效图片文件',
  isNotImage: '不是有效图片文件',
  toBeUploaded: '待上传',
  cropTool: '裁剪工具',
  original: '原图比例',
  custom: '自定义比例',
  square: '正方形',
  landscape: '横屏',
  portrait: '竖屏',
  ellipse: '椭圆形',
  classicTv: '经典电视（4:3）',
  cinemascope: '宽屏电影（21:9）',
  arrowTool: '箭头工具',
  blurTool: '模糊工具',
  brightnessTool: '亮度调节',
  contrastTool: '对比度调节',
  ellipseTool: '椭圆工具',
  unFlipX: '取消水平翻转',
  flipX: '水平翻转',
  unFlipY: '取消垂直翻转',
  flipY: '垂直翻转',
  hsvTool: 'HSV调节',
  hue: '色相',
  brightness: '亮度',
  saturation: '饱和度',
  value: '明度',
  imageTool: '图片工具',
  importing: '导入中...',
  addImage: '+ 添加图片',
  uploadImage: '上传图片',
  fromGallery: '从图库选择',
  lineTool: '直线工具',
  penTool: '画笔工具',
  polygonTool: '多边形工具',
  sides: '边数',
  rectangleTool: '矩形工具',
  cornerRadius: '圆角半径',
  resizeWidthTitle: '宽度（像素）',
  resizeHeightTitle: '高度（像素）',
  toggleRatioLockTitle: '锁定/解锁比例',
  resetSize: '恢复原图尺寸',
  rotateTool: '旋转工具',
  textTool: '文字工具',
  textSpacings: '文字间距设置',
  textAlignment: '文字对齐',
  fontFamily: '字体',
  size: '字号',
  letterSpacing: '字间距',
  lineHeight: '行高',
  warmthTool: '色温调节',
  addWatermark: '+ 添加水印',
  addTextWatermark: '+ 添加文字水印',
  addWatermarkTitle: '选择水印类型',
  uploadWatermark: '上传水印图片',
  addWatermarkAsText: '添加为文字水印',
  padding: '内边距',
  paddings: '内边距设置',
  shadow: '阴影',
  horizontal: '水平方向',
  vertical: '垂直方向',
  blur: '模糊度',
  opacity: '不透明度',
  transparency: '透明度',
  position: '位置',
  stroke: '描边',
  saveAsModalTitle: '另存为',
  extension: '文件后缀',
  format: '文件格式',
  nameIsRequired: '文件名不能为空。',
  quality: '保存质量',
  imageDimensionsHoverTitle: '保存图片尺寸（宽 × 高）',
  cropSizeLowerThanResizedWarning:
    '注意：所选裁剪区域小于已设置的调整尺寸，可能导致图片质量下降',
  actualSize: '实际尺寸（100%）',
  fitSize: '适配画布',
  addImageTitle: '选择要添加的图片...',
  mutualizedFailedToLoadImg: '图片加载失败。',
  tabsMenu: '功能菜单',
  download: '下载',
  width: '宽度',
  height: '高度',
  plus: '+',
  cropItemNoEffect: '此裁剪比例无预览效果',
}

export const themeColor = {
  palette: {
    // 编辑器边栏背景颜色
    'bg-secondary': '#222426',
    // 'bg-primary': '#d54e3f',
    // 工具激活背景颜色
    'bg-primary-active': '#3c3c3c',
    // 工具未选中背景颜色
    'bg-stateless': '#181a1b',
    'accent-primary': '#d54e3f',
    // 工具激活字体颜色
    'accent-primary-active': '#6879eb',
    'icons-primary': '#ffffff',
    'icons-secondary': '#d54e3f',
    // 边框分界颜色
    'borders-secondary': '#9f9f9f',
    // 'borders-primary': '#d54e3f',
    // 'borders-strong': '#d54e3f',
    // 'light-shadow': '#d54e3f',
    'txt-primary': '#f9fbfc',
    // warning: '#57a679',
  },
}
