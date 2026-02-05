"use strict";
const require$$1 = require("electron");
const require$$1$1 = require("path");
const require$$4 = require("util");
const require$$0 = require("fs");
const require$$3$1 = require("crypto");
const require$$5$1 = require("assert");
const require$$5 = require("events");
const require$$1$2 = require("os");
const path$7 = require("path");
const DEV = true;
const _CreateWindow = class _CreateWindow {
  constructor() {
    this.getWindowById = (id2) => {
      return require$$1.BrowserWindow.fromId(id2);
    };
    this.debounce = (func, wait) => {
      let timeout;
      return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, wait);
      };
    };
    this.moveDepWindow = (win) => {
      if (_CreateWindow.windowMap.get("bottom")) {
        const bottomWin = _CreateWindow.windowMap.get("bottom").window;
        bottomWin.setBounds({
          x: win.getPosition()[0],
          y: win.getPosition()[1] + win.getSize()[1],
          width: 680,
          height: 400
        });
      }
      if (_CreateWindow.windowMap.get("right")) {
        const rightWin = _CreateWindow.windowMap.get("right").window;
        rightWin.setBounds({
          x: win.getPosition()[0] + win.getSize()[0],
          y: win.getPosition()[1],
          width: rightWin.getSize()[0],
          height: rightWin.getSize()[1]
        });
      }
    };
    this.defaultConfig = {
      // 页面路由
      route: "",
      parentId: null,
      isMainWin: false,
      width: 900,
      height: 700,
      //窗口是否在屏幕居中. 默认值为 false
      center: true,
      transparent: true,
      //设置为 false 时可以创建一个无边框窗口 默认值为 true。
      frame: false,
      titleBarStyle: "hidden",
      backgroundColor: "#00000000",
      //窗口是否在创建时显示。 默认值为 true。
      show: false,
      maxWidth: null,
      maxHeight: null,
      minWidth: null,
      minHeight: null,
      autoHideMenuBar: true,
      resizable: true,
      minimizable: true,
      maximizable: true,
      windowName: "",
      /* 
        【父窗口不能操作】
         模态窗口 -- 模态窗口是禁用父窗口的子窗口，创
         建模态窗口必须设置 parent 和 modal 选项
      */
      modal: false,
      parent: null,
      titleBarOverlay: false,
      maximize: false,
      webPreferences: {
        devTools: DEV,
        // nodeIntegration: true,
        contextIsolation: true,
        // nodeIntegrationInWorker: true,
        webSecurity: false,
        // sandbox: false,
        nodeIntegration: true,
        preload: path$7.join(__dirname, "../preload/preload.js"),
        // 禁用离屏渲染
        offscreen: false,
        // 防止后台渲染节流
        backgroundThrottling: false
      }
    };
  }
  /********************************************************************************
   * @brief: 创建窗口
   * @param {object} configurations
   * @param {object} options
   * @return {*}
   ********************************************************************************/
  createWindow(configurations) {
    if (!configurations.windowName) {
      console.info("window name is required");
      return;
    }
    if (_CreateWindow.windowMap.has(configurations.windowName)) {
      console.info("window is already created");
      _CreateWindow.windowMap.get(configurations.windowName).window.blur();
      return;
    }
    let windowConfig = Object.assign({}, this.defaultConfig, configurations);
    if (!windowConfig.isMainWin) {
      windowConfig.parent = _CreateWindow.getMainWindow();
    }
    let win = new require$$1.BrowserWindow(windowConfig);
    win.setTitle("");
    console.log("window id:" + win.id);
    _CreateWindow.windowMap.set(windowConfig.windowName, {
      windowId: win.id,
      route: windowConfig.route,
      windowName: windowConfig.windowName,
      window: win
    });
    if (windowConfig.maximize && windowConfig.resizable) {
      win.maximize();
    }
    if (process.platform == "darwin") {
      win.setWindowButtonVisibility(false);
    }
    win.on("close", () => {
      if (win == _CreateWindow.windowMap.get("main").window) {
        require$$1.app.quit();
        return;
      }
      _CreateWindow.windowMap.forEach((value, key) => {
        if (value.window == win) {
          win.webContents.closeDevTools();
          _CreateWindow.windowMap.delete(key);
        }
      });
      win.setOpacity(0);
    });
    win.on("ready-to-show", () => {
      win.show();
      win.focus();
    });
    let winURL;
    if (require$$1.app.isPackaged) {
      win.loadFile(require$$1$1.join(__dirname, "../../dist/index.html"), {
        hash: windowConfig.route
      });
    } else {
      winURL = windowConfig.route ? `${process.env.VITE_DEV_SERVER_URL}/#${windowConfig.route}` : `${process.env.VITE_DEV_SERVER_URL}}/#`;
      win.loadURL(winURL);
    }
    win.setMenu(null);
    {
      win.webContents.once("did-finish-load", () => {
        win.webContents.openDevTools({ mode: "detach" });
      });
      win.on("hide", () => win.webContents.closeDevTools());
      require$$1.globalShortcut.register("CommandOrControl+Shift+i", function() {
        win.webContents.openDevTools();
      });
    }
    return win;
  }
};
_CreateWindow.windowMap = /* @__PURE__ */ new Map();
_CreateWindow.travWindowSend = (data, curWindow = null) => {
  _CreateWindow.windowMap.forEach((value, key) => {
    if (curWindow && value.window == curWindow) {
      return;
    }
    value.window.webContents.send("store-get", data);
  });
};
_CreateWindow.sendToWindow = (windowName, data) => {
  if (_CreateWindow.windowMap.has(windowName)) {
    _CreateWindow.windowMap.get(windowName).window.webContents.send("store-get", data);
  }
};
_CreateWindow.getMainWindow = () => {
  return _CreateWindow.windowMap.get("main").window;
};
let CreateWindow = _CreateWindow;
const { ipcMain: ipcMain$2, BrowserWindow, screen } = require("electron");
const windowControlListener = () => {
  ipcMain$2.on("window-create", (event, configObj) => {
    let cw = new CreateWindow();
    cw.createWindow(configObj);
  });
  ipcMain$2.handle("get-screen-size", () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    return primaryDisplay.size;
  });
  ipcMain$2.on("window-on-top", (event, state) => {
    const webContent = event.sender;
    const win = BrowserWindow.fromWebContents(webContent);
    win.setAlwaysOnTop(state);
  });
  ipcMain$2.on("window-min", (event) => {
    const webContent = event.sender;
    const win = BrowserWindow.fromWebContents(webContent);
    win.minimize();
  });
  ipcMain$2.on("window-max", (event, state, windowSize = {}) => {
    const webContent = event.sender;
    const win = BrowserWindow.fromWebContents(webContent);
    if (state) {
      const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
      const x = Math.round((screenWidth - windowSize.width) / 2);
      const y = Math.round((screenHeight - windowSize.height) / 2);
      win.setBounds({ ...windowSize, x, y });
    } else {
      win.maximize();
    }
  });
  ipcMain$2.on("window-close", (event) => {
    const webContent = event.sender;
    const win = BrowserWindow.fromWebContents(webContent);
    win.close();
  });
  ipcMain$2.handle("get-window-position", async (event) => {
    const webContent = event.sender;
    const win = BrowserWindow.fromWebContents(webContent);
    return win.getPosition();
  });
};
const PI_OVER_180 = Math.PI / 180;
function detectBrowser() {
  return typeof window !== "undefined" && ({}.toString.call(window) === "[object Window]" || {}.toString.call(window) === "[object global]");
}
const glob = typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : typeof WorkerGlobalScope !== "undefined" ? self : {};
const Konva$1 = {
  _global: glob,
  version: "10.2.0",
  isBrowser: detectBrowser(),
  isUnminified: /param/.test((function(param) {
  }).toString()),
  dblClickWindow: 400,
  getAngle(angle) {
    return Konva$1.angleDeg ? angle * PI_OVER_180 : angle;
  },
  enableTrace: false,
  pointerEventsEnabled: true,
  autoDrawEnabled: true,
  hitOnDragEnabled: false,
  capturePointerEventsEnabled: false,
  _mouseListenClick: false,
  _touchListenClick: false,
  _pointerListenClick: false,
  _mouseInDblClickWindow: false,
  _touchInDblClickWindow: false,
  _pointerInDblClickWindow: false,
  _mouseDblClickPointerId: null,
  _touchDblClickPointerId: null,
  _pointerDblClickPointerId: null,
  _renderBackend: "web",
  legacyTextRendering: false,
  pixelRatio: typeof window !== "undefined" && window.devicePixelRatio || 1,
  dragDistance: 3,
  angleDeg: true,
  showWarnings: true,
  dragButtons: [0, 1],
  isDragging() {
    return Konva$1["DD"].isDragging;
  },
  isTransforming() {
    var _a, _b;
    return (_b = (_a = Konva$1["Transformer"]) === null || _a === void 0 ? void 0 : _a.isTransforming()) !== null && _b !== void 0 ? _b : false;
  },
  isDragReady() {
    return !!Konva$1["DD"].node;
  },
  releaseCanvasOnDestroy: true,
  document: glob.document,
  _injectGlobal(Konva2) {
    if (typeof glob.Konva !== "undefined") {
      console.error("Several Konva instances detected. It is not recommended to use multiple Konva instances in the same environment.");
    }
    glob.Konva = Konva2;
  }
};
const _registerNode = (NodeClass) => {
  Konva$1[NodeClass.prototype.getClassName()] = NodeClass;
};
Konva$1._injectGlobal(Konva$1);
const NODE_ERROR = `Konva.js unsupported environment.

Looks like you are trying to use Konva.js in Node.js environment. because "document" object is undefined.

To use Konva.js in Node.js environment, you need to use the "canvas-backend" or "skia-backend" module.

bash: npm install canvas
js: import "konva/canvas-backend";

or

bash: npm install skia-canvas
js: import "konva/skia-backend";
`;
const ensureBrowser = () => {
  if (typeof document === "undefined") {
    throw new Error(NODE_ERROR);
  }
};
class Transform {
  constructor(m = [1, 0, 0, 1, 0, 0]) {
    this.dirty = false;
    this.m = m && m.slice() || [1, 0, 0, 1, 0, 0];
  }
  reset() {
    this.m[0] = 1;
    this.m[1] = 0;
    this.m[2] = 0;
    this.m[3] = 1;
    this.m[4] = 0;
    this.m[5] = 0;
  }
  copy() {
    return new Transform(this.m);
  }
  copyInto(tr) {
    tr.m[0] = this.m[0];
    tr.m[1] = this.m[1];
    tr.m[2] = this.m[2];
    tr.m[3] = this.m[3];
    tr.m[4] = this.m[4];
    tr.m[5] = this.m[5];
  }
  point(point) {
    const m = this.m;
    return {
      x: m[0] * point.x + m[2] * point.y + m[4],
      y: m[1] * point.x + m[3] * point.y + m[5]
    };
  }
  translate(x, y) {
    this.m[4] += this.m[0] * x + this.m[2] * y;
    this.m[5] += this.m[1] * x + this.m[3] * y;
    return this;
  }
  scale(sx, sy) {
    this.m[0] *= sx;
    this.m[1] *= sx;
    this.m[2] *= sy;
    this.m[3] *= sy;
    return this;
  }
  rotate(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const m11 = this.m[0] * c + this.m[2] * s;
    const m12 = this.m[1] * c + this.m[3] * s;
    const m21 = this.m[0] * -s + this.m[2] * c;
    const m22 = this.m[1] * -s + this.m[3] * c;
    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
    return this;
  }
  getTranslation() {
    return {
      x: this.m[4],
      y: this.m[5]
    };
  }
  skew(sx, sy) {
    const m11 = this.m[0] + this.m[2] * sy;
    const m12 = this.m[1] + this.m[3] * sy;
    const m21 = this.m[2] + this.m[0] * sx;
    const m22 = this.m[3] + this.m[1] * sx;
    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
    return this;
  }
  multiply(matrix) {
    const m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
    const m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];
    const m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
    const m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];
    const dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
    const dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];
    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
    this.m[4] = dx;
    this.m[5] = dy;
    return this;
  }
  invert() {
    const d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
    const m0 = this.m[3] * d;
    const m1 = -this.m[1] * d;
    const m2 = -this.m[2] * d;
    const m3 = this.m[0] * d;
    const m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
    const m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
    this.m[0] = m0;
    this.m[1] = m1;
    this.m[2] = m2;
    this.m[3] = m3;
    this.m[4] = m4;
    this.m[5] = m5;
    return this;
  }
  getMatrix() {
    return this.m;
  }
  decompose() {
    const a = this.m[0];
    const b = this.m[1];
    const c = this.m[2];
    const d = this.m[3];
    const e = this.m[4];
    const f = this.m[5];
    const delta = a * d - b * c;
    const result = {
      x: e,
      y: f,
      rotation: 0,
      scaleX: 0,
      scaleY: 0,
      skewX: 0,
      skewY: 0
    };
    if (a != 0 || b != 0) {
      const r = Math.sqrt(a * a + b * b);
      result.rotation = b > 0 ? Math.acos(a / r) : -Math.acos(a / r);
      result.scaleX = r;
      result.scaleY = delta / r;
      result.skewX = (a * c + b * d) / delta;
      result.skewY = 0;
    } else if (c != 0 || d != 0) {
      const s = Math.sqrt(c * c + d * d);
      result.rotation = Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s));
      result.scaleX = delta / s;
      result.scaleY = s;
      result.skewX = 0;
      result.skewY = (a * c + b * d) / delta;
    } else ;
    result.rotation = Util._getRotation(result.rotation);
    return result;
  }
}
const OBJECT_ARRAY = "[object Array]", OBJECT_NUMBER = "[object Number]", OBJECT_STRING = "[object String]", OBJECT_BOOLEAN = "[object Boolean]", PI_OVER_DEG180 = Math.PI / 180, DEG180_OVER_PI = 180 / Math.PI, HASH = "#", EMPTY_STRING$1 = "", ZERO = "0", KONVA_WARNING = "Konva warning: ", KONVA_ERROR = "Konva error: ", RGB_PAREN = "rgb(", COLORS = {
  aliceblue: [240, 248, 255],
  antiquewhite: [250, 235, 215],
  aqua: [0, 255, 255],
  aquamarine: [127, 255, 212],
  azure: [240, 255, 255],
  beige: [245, 245, 220],
  bisque: [255, 228, 196],
  black: [0, 0, 0],
  blanchedalmond: [255, 235, 205],
  blue: [0, 0, 255],
  blueviolet: [138, 43, 226],
  brown: [165, 42, 42],
  burlywood: [222, 184, 135],
  cadetblue: [95, 158, 160],
  chartreuse: [127, 255, 0],
  chocolate: [210, 105, 30],
  coral: [255, 127, 80],
  cornflowerblue: [100, 149, 237],
  cornsilk: [255, 248, 220],
  crimson: [220, 20, 60],
  cyan: [0, 255, 255],
  darkblue: [0, 0, 139],
  darkcyan: [0, 139, 139],
  darkgoldenrod: [184, 132, 11],
  darkgray: [169, 169, 169],
  darkgreen: [0, 100, 0],
  darkgrey: [169, 169, 169],
  darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139],
  darkolivegreen: [85, 107, 47],
  darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204],
  darkred: [139, 0, 0],
  darksalmon: [233, 150, 122],
  darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139],
  darkslategray: [47, 79, 79],
  darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209],
  darkviolet: [148, 0, 211],
  deeppink: [255, 20, 147],
  deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  dodgerblue: [30, 144, 255],
  firebrick: [178, 34, 34],
  floralwhite: [255, 255, 240],
  forestgreen: [34, 139, 34],
  fuchsia: [255, 0, 255],
  gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255],
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  gray: [128, 128, 128],
  green: [0, 128, 0],
  greenyellow: [173, 255, 47],
  grey: [128, 128, 128],
  honeydew: [240, 255, 240],
  hotpink: [255, 105, 180],
  indianred: [205, 92, 92],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  lavenderblush: [255, 240, 245],
  lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205],
  lightblue: [173, 216, 230],
  lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255],
  lightgoldenrodyellow: [250, 250, 210],
  lightgray: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightgrey: [211, 211, 211],
  lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122],
  lightseagreen: [32, 178, 170],
  lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153],
  lightslategrey: [119, 136, 153],
  lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limegreen: [50, 205, 50],
  linen: [250, 240, 230],
  magenta: [255, 0, 255],
  maroon: [128, 0, 0],
  mediumaquamarine: [102, 205, 170],
  mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211],
  mediumpurple: [147, 112, 219],
  mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238],
  mediumspringgreen: [0, 250, 154],
  mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133],
  midnightblue: [25, 25, 112],
  mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225],
  moccasin: [255, 228, 181],
  navajowhite: [255, 222, 173],
  navy: [0, 0, 128],
  oldlace: [253, 245, 230],
  olive: [128, 128, 0],
  olivedrab: [107, 142, 35],
  orange: [255, 165, 0],
  orangered: [255, 69, 0],
  orchid: [218, 112, 214],
  palegoldenrod: [238, 232, 170],
  palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238],
  palevioletred: [219, 112, 147],
  papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185],
  peru: [205, 133, 63],
  pink: [255, 192, 203],
  plum: [221, 160, 203],
  powderblue: [176, 224, 230],
  purple: [128, 0, 128],
  rebeccapurple: [102, 51, 153],
  red: [255, 0, 0],
  rosybrown: [188, 143, 143],
  royalblue: [65, 105, 225],
  saddlebrown: [139, 69, 19],
  salmon: [250, 128, 114],
  sandybrown: [244, 164, 96],
  seagreen: [46, 139, 87],
  seashell: [255, 245, 238],
  sienna: [160, 82, 45],
  silver: [192, 192, 192],
  skyblue: [135, 206, 235],
  slateblue: [106, 90, 205],
  slategray: [119, 128, 144],
  slategrey: [119, 128, 144],
  snow: [255, 255, 250],
  springgreen: [0, 255, 127],
  steelblue: [70, 130, 180],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  thistle: [216, 191, 216],
  transparent: [255, 255, 255, 0],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
  white: [255, 255, 255],
  whitesmoke: [245, 245, 245],
  yellow: [255, 255, 0],
  yellowgreen: [154, 205, 5]
}, RGB_REGEX = /rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/;
let animQueue = [];
let _isCanvasFarblingActive = null;
const req = typeof requestAnimationFrame !== "undefined" && requestAnimationFrame || function(f) {
  setTimeout(f, 16);
};
const Util = {
  _isElement(obj) {
    return !!(obj && obj.nodeType == 1);
  },
  _isFunction(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  },
  _isPlainObject(obj) {
    return !!obj && obj.constructor === Object;
  },
  _isArray(obj) {
    return Object.prototype.toString.call(obj) === OBJECT_ARRAY;
  },
  _isNumber(obj) {
    return Object.prototype.toString.call(obj) === OBJECT_NUMBER && !isNaN(obj) && isFinite(obj);
  },
  _isString(obj) {
    return Object.prototype.toString.call(obj) === OBJECT_STRING;
  },
  _isBoolean(obj) {
    return Object.prototype.toString.call(obj) === OBJECT_BOOLEAN;
  },
  isObject(val) {
    return val instanceof Object;
  },
  isValidSelector(selector) {
    if (typeof selector !== "string") {
      return false;
    }
    const firstChar = selector[0];
    return firstChar === "#" || firstChar === "." || firstChar === firstChar.toUpperCase();
  },
  _sign(number) {
    if (number === 0) {
      return 1;
    }
    if (number > 0) {
      return 1;
    } else {
      return -1;
    }
  },
  requestAnimFrame(callback) {
    animQueue.push(callback);
    if (animQueue.length === 1) {
      req(function() {
        const queue = animQueue;
        animQueue = [];
        queue.forEach(function(cb) {
          cb();
        });
      });
    }
  },
  createCanvasElement() {
    ensureBrowser();
    const canvas = document.createElement("canvas");
    try {
      canvas.style = canvas.style || {};
    } catch (e) {
    }
    return canvas;
  },
  createImageElement() {
    ensureBrowser();
    return document.createElement("img");
  },
  _isInDocument(el) {
    while (el = el.parentNode) {
      if (el == document) {
        return true;
      }
    }
    return false;
  },
  _urlToImage(url, callback) {
    const imageObj = Util.createImageElement();
    imageObj.onload = function() {
      callback(imageObj);
    };
    imageObj.src = url;
  },
  _rgbToHex(r, g, b) {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },
  _hexToRgb(hex) {
    hex = hex.replace(HASH, EMPTY_STRING$1);
    const bigint = parseInt(hex, 16);
    return {
      r: bigint >> 16 & 255,
      g: bigint >> 8 & 255,
      b: bigint & 255
    };
  },
  getRandomColor() {
    let randColor = (Math.random() * 16777215 << 0).toString(16);
    while (randColor.length < 6) {
      randColor = ZERO + randColor;
    }
    return HASH + randColor;
  },
  isCanvasFarblingActive() {
    if (_isCanvasFarblingActive !== null) {
      return _isCanvasFarblingActive;
    }
    if (typeof document === "undefined") {
      _isCanvasFarblingActive = false;
      return false;
    }
    const c = this.createCanvasElement();
    c.width = 10;
    c.height = 10;
    const ctx = c.getContext("2d", {
      willReadFrequently: true
    });
    ctx.clearRect(0, 0, 10, 10);
    ctx.fillStyle = "#282828";
    ctx.fillRect(0, 0, 10, 10);
    const d = ctx.getImageData(0, 0, 10, 10).data;
    let isFarbling = false;
    for (let i = 0; i < 100; i++) {
      if (d[i * 4] !== 40 || d[i * 4 + 1] !== 40 || d[i * 4 + 2] !== 40 || d[i * 4 + 3] !== 255) {
        isFarbling = true;
        break;
      }
    }
    _isCanvasFarblingActive = isFarbling;
    this.releaseCanvas(c);
    return _isCanvasFarblingActive;
  },
  getHitColor() {
    const color = this.getRandomColor();
    return this.isCanvasFarblingActive() ? this.getSnappedHexColor(color) : color;
  },
  getHitColorKey(r, g, b) {
    if (this.isCanvasFarblingActive()) {
      r = Math.round(r / 5) * 5;
      g = Math.round(g / 5) * 5;
      b = Math.round(b / 5) * 5;
    }
    return HASH + this._rgbToHex(r, g, b);
  },
  getSnappedHexColor(hex) {
    const rgb = this._hexToRgb(hex);
    return HASH + this._rgbToHex(Math.round(rgb.r / 5) * 5, Math.round(rgb.g / 5) * 5, Math.round(rgb.b / 5) * 5);
  },
  getRGB(color) {
    let rgb;
    if (color in COLORS) {
      rgb = COLORS[color];
      return {
        r: rgb[0],
        g: rgb[1],
        b: rgb[2]
      };
    } else if (color[0] === HASH) {
      return this._hexToRgb(color.substring(1));
    } else if (color.substr(0, 4) === RGB_PAREN) {
      rgb = RGB_REGEX.exec(color.replace(/ /g, ""));
      return {
        r: parseInt(rgb[1], 10),
        g: parseInt(rgb[2], 10),
        b: parseInt(rgb[3], 10)
      };
    } else {
      return {
        r: 0,
        g: 0,
        b: 0
      };
    }
  },
  colorToRGBA(str) {
    str = str || "black";
    return Util._namedColorToRBA(str) || Util._hex3ColorToRGBA(str) || Util._hex4ColorToRGBA(str) || Util._hex6ColorToRGBA(str) || Util._hex8ColorToRGBA(str) || Util._rgbColorToRGBA(str) || Util._rgbaColorToRGBA(str) || Util._hslColorToRGBA(str);
  },
  _namedColorToRBA(str) {
    const c = COLORS[str.toLowerCase()];
    if (!c) {
      return null;
    }
    return {
      r: c[0],
      g: c[1],
      b: c[2],
      a: 1
    };
  },
  _rgbColorToRGBA(str) {
    if (str.indexOf("rgb(") === 0) {
      str = str.match(/rgb\(([^)]+)\)/)[1];
      const parts = str.split(/ *, */).map(Number);
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: 1
      };
    }
  },
  _rgbaColorToRGBA(str) {
    if (str.indexOf("rgba(") === 0) {
      str = str.match(/rgba\(([^)]+)\)/)[1];
      const parts = str.split(/ *, */).map((n, index) => {
        if (n.slice(-1) === "%") {
          return index === 3 ? parseInt(n) / 100 : parseInt(n) / 100 * 255;
        }
        return Number(n);
      });
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts[3]
      };
    }
  },
  _hex8ColorToRGBA(str) {
    if (str[0] === "#" && str.length === 9) {
      return {
        r: parseInt(str.slice(1, 3), 16),
        g: parseInt(str.slice(3, 5), 16),
        b: parseInt(str.slice(5, 7), 16),
        a: parseInt(str.slice(7, 9), 16) / 255
      };
    }
  },
  _hex6ColorToRGBA(str) {
    if (str[0] === "#" && str.length === 7) {
      return {
        r: parseInt(str.slice(1, 3), 16),
        g: parseInt(str.slice(3, 5), 16),
        b: parseInt(str.slice(5, 7), 16),
        a: 1
      };
    }
  },
  _hex4ColorToRGBA(str) {
    if (str[0] === "#" && str.length === 5) {
      return {
        r: parseInt(str[1] + str[1], 16),
        g: parseInt(str[2] + str[2], 16),
        b: parseInt(str[3] + str[3], 16),
        a: parseInt(str[4] + str[4], 16) / 255
      };
    }
  },
  _hex3ColorToRGBA(str) {
    if (str[0] === "#" && str.length === 4) {
      return {
        r: parseInt(str[1] + str[1], 16),
        g: parseInt(str[2] + str[2], 16),
        b: parseInt(str[3] + str[3], 16),
        a: 1
      };
    }
  },
  _hslColorToRGBA(str) {
    if (/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.test(str)) {
      const [_, ...hsl] = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(str);
      const h = Number(hsl[0]) / 360;
      const s = Number(hsl[1]) / 100;
      const l = Number(hsl[2]) / 100;
      let t2;
      let t3;
      let val;
      if (s === 0) {
        val = l * 255;
        return {
          r: Math.round(val),
          g: Math.round(val),
          b: Math.round(val),
          a: 1
        };
      }
      if (l < 0.5) {
        t2 = l * (1 + s);
      } else {
        t2 = l + s - l * s;
      }
      const t1 = 2 * l - t2;
      const rgb = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        t3 = h + 1 / 3 * -(i - 1);
        if (t3 < 0) {
          t3++;
        }
        if (t3 > 1) {
          t3--;
        }
        if (6 * t3 < 1) {
          val = t1 + (t2 - t1) * 6 * t3;
        } else if (2 * t3 < 1) {
          val = t2;
        } else if (3 * t3 < 2) {
          val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
        } else {
          val = t1;
        }
        rgb[i] = val * 255;
      }
      return {
        r: Math.round(rgb[0]),
        g: Math.round(rgb[1]),
        b: Math.round(rgb[2]),
        a: 1
      };
    }
  },
  haveIntersection(r1, r2) {
    return !(r2.x > r1.x + r1.width || r2.x + r2.width < r1.x || r2.y > r1.y + r1.height || r2.y + r2.height < r1.y);
  },
  cloneObject(obj) {
    const retObj = {};
    for (const key in obj) {
      if (this._isPlainObject(obj[key])) {
        retObj[key] = this.cloneObject(obj[key]);
      } else if (this._isArray(obj[key])) {
        retObj[key] = this.cloneArray(obj[key]);
      } else {
        retObj[key] = obj[key];
      }
    }
    return retObj;
  },
  cloneArray(arr) {
    return arr.slice(0);
  },
  degToRad(deg) {
    return deg * PI_OVER_DEG180;
  },
  radToDeg(rad) {
    return rad * DEG180_OVER_PI;
  },
  _degToRad(deg) {
    Util.warn("Util._degToRad is removed. Please use public Util.degToRad instead.");
    return Util.degToRad(deg);
  },
  _radToDeg(rad) {
    Util.warn("Util._radToDeg is removed. Please use public Util.radToDeg instead.");
    return Util.radToDeg(rad);
  },
  _getRotation(radians) {
    return Konva$1.angleDeg ? Util.radToDeg(radians) : radians;
  },
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  throw(str) {
    throw new Error(KONVA_ERROR + str);
  },
  error(str) {
    console.error(KONVA_ERROR + str);
  },
  warn(str) {
    if (!Konva$1.showWarnings) {
      return;
    }
    console.warn(KONVA_WARNING + str);
  },
  each(obj, func) {
    for (const key in obj) {
      func(key, obj[key]);
    }
  },
  _inRange(val, left, right) {
    return left <= val && val < right;
  },
  _getProjectionToSegment(x1, y1, x2, y2, x3, y3) {
    let x, y, dist2;
    const pd2 = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
    if (pd2 == 0) {
      x = x1;
      y = y1;
      dist2 = (x3 - x2) * (x3 - x2) + (y3 - y2) * (y3 - y2);
    } else {
      const u = ((x3 - x1) * (x2 - x1) + (y3 - y1) * (y2 - y1)) / pd2;
      if (u < 0) {
        x = x1;
        y = y1;
        dist2 = (x1 - x3) * (x1 - x3) + (y1 - y3) * (y1 - y3);
      } else if (u > 1) {
        x = x2;
        y = y2;
        dist2 = (x2 - x3) * (x2 - x3) + (y2 - y3) * (y2 - y3);
      } else {
        x = x1 + u * (x2 - x1);
        y = y1 + u * (y2 - y1);
        dist2 = (x - x3) * (x - x3) + (y - y3) * (y - y3);
      }
    }
    return [x, y, dist2];
  },
  _getProjectionToLine(pt, line, isClosed) {
    const pc = Util.cloneObject(pt);
    let dist2 = Number.MAX_VALUE;
    line.forEach(function(p1, i) {
      if (!isClosed && i === line.length - 1) {
        return;
      }
      const p2 = line[(i + 1) % line.length];
      const proj = Util._getProjectionToSegment(p1.x, p1.y, p2.x, p2.y, pt.x, pt.y);
      const px = proj[0], py = proj[1], pdist = proj[2];
      if (pdist < dist2) {
        pc.x = px;
        pc.y = py;
        dist2 = pdist;
      }
    });
    return pc;
  },
  _prepareArrayForTween(startArray, endArray, isClosed) {
    const start = [], end = [];
    if (startArray.length > endArray.length) {
      const temp2 = endArray;
      endArray = startArray;
      startArray = temp2;
    }
    for (let n = 0; n < startArray.length; n += 2) {
      start.push({
        x: startArray[n],
        y: startArray[n + 1]
      });
    }
    for (let n = 0; n < endArray.length; n += 2) {
      end.push({
        x: endArray[n],
        y: endArray[n + 1]
      });
    }
    const newStart = [];
    end.forEach(function(point) {
      const pr = Util._getProjectionToLine(point, start, isClosed);
      newStart.push(pr.x);
      newStart.push(pr.y);
    });
    return newStart;
  },
  _prepareToStringify(obj) {
    let desc;
    obj.visitedByCircularReferenceRemoval = true;
    for (const key in obj) {
      if (!(obj.hasOwnProperty(key) && obj[key] && typeof obj[key] == "object")) {
        continue;
      }
      desc = Object.getOwnPropertyDescriptor(obj, key);
      if (obj[key].visitedByCircularReferenceRemoval || Util._isElement(obj[key])) {
        if (desc.configurable) {
          delete obj[key];
        } else {
          return null;
        }
      } else if (Util._prepareToStringify(obj[key]) === null) {
        if (desc.configurable) {
          delete obj[key];
        } else {
          return null;
        }
      }
    }
    delete obj.visitedByCircularReferenceRemoval;
    return obj;
  },
  _assign(target, source2) {
    for (const key in source2) {
      target[key] = source2[key];
    }
    return target;
  },
  _getFirstPointerId(evt) {
    if (!evt.touches) {
      return evt.pointerId || 999;
    } else {
      return evt.changedTouches[0].identifier;
    }
  },
  releaseCanvas(...canvases) {
    if (!Konva$1.releaseCanvasOnDestroy)
      return;
    canvases.forEach((c) => {
      c.width = 0;
      c.height = 0;
    });
  },
  drawRoundedRectPath(context, width, height, cornerRadius) {
    let xOrigin = width < 0 ? width : 0;
    let yOrigin = height < 0 ? height : 0;
    width = Math.abs(width);
    height = Math.abs(height);
    let topLeft = 0;
    let topRight = 0;
    let bottomLeft = 0;
    let bottomRight = 0;
    if (typeof cornerRadius === "number") {
      topLeft = topRight = bottomLeft = bottomRight = Math.min(cornerRadius, width / 2, height / 2);
    } else {
      topLeft = Math.min(cornerRadius[0] || 0, width / 2, height / 2);
      topRight = Math.min(cornerRadius[1] || 0, width / 2, height / 2);
      bottomRight = Math.min(cornerRadius[2] || 0, width / 2, height / 2);
      bottomLeft = Math.min(cornerRadius[3] || 0, width / 2, height / 2);
    }
    context.moveTo(xOrigin + topLeft, yOrigin);
    context.lineTo(xOrigin + width - topRight, yOrigin);
    context.arc(xOrigin + width - topRight, yOrigin + topRight, topRight, Math.PI * 3 / 2, 0, false);
    context.lineTo(xOrigin + width, yOrigin + height - bottomRight);
    context.arc(xOrigin + width - bottomRight, yOrigin + height - bottomRight, bottomRight, 0, Math.PI / 2, false);
    context.lineTo(xOrigin + bottomLeft, yOrigin + height);
    context.arc(xOrigin + bottomLeft, yOrigin + height - bottomLeft, bottomLeft, Math.PI / 2, Math.PI, false);
    context.lineTo(xOrigin, yOrigin + topLeft);
    context.arc(xOrigin + topLeft, yOrigin + topLeft, topLeft, Math.PI, Math.PI * 3 / 2, false);
  },
  drawRoundedPolygonPath(context, points, sides, radius, cornerRadius) {
    radius = Math.abs(radius);
    for (let i = 0; i < sides; i++) {
      const prev = points[(i - 1 + sides) % sides];
      const curr = points[i];
      const next = points[(i + 1) % sides];
      const vec1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const vec2 = { x: next.x - curr.x, y: next.y - curr.y };
      const len1 = Math.hypot(vec1.x, vec1.y);
      const len2 = Math.hypot(vec2.x, vec2.y);
      let currCornerRadius;
      if (typeof cornerRadius === "number") {
        currCornerRadius = cornerRadius;
      } else {
        currCornerRadius = i < cornerRadius.length ? cornerRadius[i] : 0;
      }
      const maxCornerRadius = radius * Math.cos(Math.PI / sides);
      currCornerRadius = maxCornerRadius * Math.min(1, currCornerRadius / radius * 2);
      const normalVec1 = { x: vec1.x / len1, y: vec1.y / len1 };
      const normalVec2 = { x: vec2.x / len2, y: vec2.y / len2 };
      const p1 = {
        x: curr.x - normalVec1.x * currCornerRadius,
        y: curr.y - normalVec1.y * currCornerRadius
      };
      const p2 = {
        x: curr.x + normalVec2.x * currCornerRadius,
        y: curr.y + normalVec2.y * currCornerRadius
      };
      if (i === 0) {
        context.moveTo(p1.x, p1.y);
      } else {
        context.lineTo(p1.x, p1.y);
      }
      context.arcTo(curr.x, curr.y, p2.x, p2.y, currCornerRadius);
    }
  }
};
function simplifyArray(arr) {
  const retArr = [], len = arr.length, util2 = Util;
  for (let n = 0; n < len; n++) {
    let val = arr[n];
    if (util2._isNumber(val)) {
      val = Math.round(val * 1e3) / 1e3;
    } else if (!util2._isString(val)) {
      val = val + "";
    }
    retArr.push(val);
  }
  return retArr;
}
const COMMA = ",", OPEN_PAREN = "(", CLOSE_PAREN = ")", OPEN_PAREN_BRACKET = "([", CLOSE_BRACKET_PAREN = "])", SEMICOLON = ";", DOUBLE_PAREN = "()", EQUALS = "=", CONTEXT_METHODS = [
  "arc",
  "arcTo",
  "beginPath",
  "bezierCurveTo",
  "clearRect",
  "clip",
  "closePath",
  "createLinearGradient",
  "createPattern",
  "createRadialGradient",
  "drawImage",
  "ellipse",
  "fill",
  "fillText",
  "getImageData",
  "createImageData",
  "lineTo",
  "moveTo",
  "putImageData",
  "quadraticCurveTo",
  "rect",
  "roundRect",
  "restore",
  "rotate",
  "save",
  "scale",
  "setLineDash",
  "setTransform",
  "stroke",
  "strokeText",
  "transform",
  "translate"
];
const CONTEXT_PROPERTIES = [
  "fillStyle",
  "strokeStyle",
  "shadowColor",
  "shadowBlur",
  "shadowOffsetX",
  "shadowOffsetY",
  "letterSpacing",
  "lineCap",
  "lineDashOffset",
  "lineJoin",
  "lineWidth",
  "miterLimit",
  "direction",
  "font",
  "textAlign",
  "textBaseline",
  "globalAlpha",
  "globalCompositeOperation",
  "imageSmoothingEnabled",
  "filter"
];
const traceArrMax = 100;
let _cssFiltersSupported = null;
function isCSSFiltersSupported() {
  if (_cssFiltersSupported !== null) {
    return _cssFiltersSupported;
  }
  try {
    const canvas = Util.createCanvasElement();
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      _cssFiltersSupported = false;
      return false;
    }
    return !!ctx && "filter" in ctx;
  } catch (e) {
    _cssFiltersSupported = false;
    return false;
  }
}
class Context {
  constructor(canvas) {
    this.canvas = canvas;
    if (Konva$1.enableTrace) {
      this.traceArr = [];
      this._enableTrace();
    }
  }
  fillShape(shape) {
    if (shape.fillEnabled()) {
      this._fill(shape);
    }
  }
  _fill(shape) {
  }
  strokeShape(shape) {
    if (shape.hasStroke()) {
      this._stroke(shape);
    }
  }
  _stroke(shape) {
  }
  fillStrokeShape(shape) {
    if (shape.attrs.fillAfterStrokeEnabled) {
      this.strokeShape(shape);
      this.fillShape(shape);
    } else {
      this.fillShape(shape);
      this.strokeShape(shape);
    }
  }
  getTrace(relaxed, rounded) {
    let traceArr = this.traceArr, len = traceArr.length, str = "", n, trace, method, args;
    for (n = 0; n < len; n++) {
      trace = traceArr[n];
      method = trace.method;
      if (method) {
        args = trace.args;
        str += method;
        if (relaxed) {
          str += DOUBLE_PAREN;
        } else {
          if (Util._isArray(args[0])) {
            str += OPEN_PAREN_BRACKET + args.join(COMMA) + CLOSE_BRACKET_PAREN;
          } else {
            if (rounded) {
              args = args.map((a) => typeof a === "number" ? Math.floor(a) : a);
            }
            str += OPEN_PAREN + args.join(COMMA) + CLOSE_PAREN;
          }
        }
      } else {
        str += trace.property;
        if (!relaxed) {
          str += EQUALS + trace.val;
        }
      }
      str += SEMICOLON;
    }
    return str;
  }
  clearTrace() {
    this.traceArr = [];
  }
  _trace(str) {
    let traceArr = this.traceArr, len;
    traceArr.push(str);
    len = traceArr.length;
    if (len >= traceArrMax) {
      traceArr.shift();
    }
  }
  reset() {
    const pixelRatio = this.getCanvas().getPixelRatio();
    this.setTransform(1 * pixelRatio, 0, 0, 1 * pixelRatio, 0, 0);
  }
  getCanvas() {
    return this.canvas;
  }
  clear(bounds) {
    const canvas = this.getCanvas();
    if (bounds) {
      this.clearRect(bounds.x || 0, bounds.y || 0, bounds.width || 0, bounds.height || 0);
    } else {
      this.clearRect(0, 0, canvas.getWidth() / canvas.pixelRatio, canvas.getHeight() / canvas.pixelRatio);
    }
  }
  _applyLineCap(shape) {
    const lineCap = shape.attrs.lineCap;
    if (lineCap) {
      this.setAttr("lineCap", lineCap);
    }
  }
  _applyOpacity(shape) {
    const absOpacity = shape.getAbsoluteOpacity();
    if (absOpacity !== 1) {
      this.setAttr("globalAlpha", absOpacity);
    }
  }
  _applyLineJoin(shape) {
    const lineJoin = shape.attrs.lineJoin;
    if (lineJoin) {
      this.setAttr("lineJoin", lineJoin);
    }
  }
  _applyMiterLimit(shape) {
    const miterLimit = shape.attrs.miterLimit;
    if (miterLimit != null) {
      this.setAttr("miterLimit", miterLimit);
    }
  }
  setAttr(attr, val) {
    this._context[attr] = val;
  }
  arc(x, y, radius, startAngle, endAngle, counterClockwise) {
    this._context.arc(x, y, radius, startAngle, endAngle, counterClockwise);
  }
  arcTo(x1, y1, x2, y2, radius) {
    this._context.arcTo(x1, y1, x2, y2, radius);
  }
  beginPath() {
    this._context.beginPath();
  }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    this._context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }
  clearRect(x, y, width, height) {
    this._context.clearRect(x, y, width, height);
  }
  clip(...args) {
    this._context.clip.apply(this._context, args);
  }
  closePath() {
    this._context.closePath();
  }
  createImageData(width, height) {
    const a = arguments;
    if (a.length === 2) {
      return this._context.createImageData(width, height);
    } else if (a.length === 1) {
      return this._context.createImageData(width);
    }
  }
  createLinearGradient(x0, y0, x1, y1) {
    return this._context.createLinearGradient(x0, y0, x1, y1);
  }
  createPattern(image, repetition) {
    return this._context.createPattern(image, repetition);
  }
  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return this._context.createRadialGradient(x0, y0, r0, x1, y1, r1);
  }
  drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    const a = arguments, _context = this._context;
    if (a.length === 3) {
      _context.drawImage(image, sx, sy);
    } else if (a.length === 5) {
      _context.drawImage(image, sx, sy, sWidth, sHeight);
    } else if (a.length === 9) {
      _context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }
  }
  ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise) {
    this._context.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise);
  }
  isPointInPath(x, y, path2, fillRule) {
    if (path2) {
      return this._context.isPointInPath(path2, x, y, fillRule);
    }
    return this._context.isPointInPath(x, y, fillRule);
  }
  fill(...args) {
    this._context.fill.apply(this._context, args);
  }
  fillRect(x, y, width, height) {
    this._context.fillRect(x, y, width, height);
  }
  strokeRect(x, y, width, height) {
    this._context.strokeRect(x, y, width, height);
  }
  fillText(text, x, y, maxWidth) {
    if (maxWidth) {
      this._context.fillText(text, x, y, maxWidth);
    } else {
      this._context.fillText(text, x, y);
    }
  }
  measureText(text) {
    return this._context.measureText(text);
  }
  getImageData(sx, sy, sw, sh) {
    return this._context.getImageData(sx, sy, sw, sh);
  }
  lineTo(x, y) {
    this._context.lineTo(x, y);
  }
  moveTo(x, y) {
    this._context.moveTo(x, y);
  }
  rect(x, y, width, height) {
    this._context.rect(x, y, width, height);
  }
  roundRect(x, y, width, height, radii) {
    this._context.roundRect(x, y, width, height, radii);
  }
  putImageData(imageData, dx, dy) {
    this._context.putImageData(imageData, dx, dy);
  }
  quadraticCurveTo(cpx, cpy, x, y) {
    this._context.quadraticCurveTo(cpx, cpy, x, y);
  }
  restore() {
    this._context.restore();
  }
  rotate(angle) {
    this._context.rotate(angle);
  }
  save() {
    this._context.save();
  }
  scale(x, y) {
    this._context.scale(x, y);
  }
  setLineDash(segments) {
    if (this._context.setLineDash) {
      this._context.setLineDash(segments);
    } else if ("mozDash" in this._context) {
      this._context["mozDash"] = segments;
    } else if ("webkitLineDash" in this._context) {
      this._context["webkitLineDash"] = segments;
    }
  }
  getLineDash() {
    return this._context.getLineDash();
  }
  setTransform(a, b, c, d, e, f) {
    this._context.setTransform(a, b, c, d, e, f);
  }
  stroke(path2d) {
    if (path2d) {
      this._context.stroke(path2d);
    } else {
      this._context.stroke();
    }
  }
  strokeText(text, x, y, maxWidth) {
    this._context.strokeText(text, x, y, maxWidth);
  }
  transform(a, b, c, d, e, f) {
    this._context.transform(a, b, c, d, e, f);
  }
  translate(x, y) {
    this._context.translate(x, y);
  }
  _enableTrace() {
    let that = this, len = CONTEXT_METHODS.length, origSetter = this.setAttr, n, args;
    const func = function(methodName) {
      let origMethod = that[methodName], ret;
      that[methodName] = function() {
        args = simplifyArray(Array.prototype.slice.call(arguments, 0));
        ret = origMethod.apply(that, arguments);
        that._trace({
          method: methodName,
          args
        });
        return ret;
      };
    };
    for (n = 0; n < len; n++) {
      func(CONTEXT_METHODS[n]);
    }
    that.setAttr = function() {
      origSetter.apply(that, arguments);
      const prop = arguments[0];
      let val = arguments[1];
      if (prop === "shadowOffsetX" || prop === "shadowOffsetY" || prop === "shadowBlur") {
        val = val / this.canvas.getPixelRatio();
      }
      that._trace({
        property: prop,
        val
      });
    };
  }
  _applyGlobalCompositeOperation(node) {
    const op = node.attrs.globalCompositeOperation;
    const def2 = !op || op === "source-over";
    if (!def2) {
      this.setAttr("globalCompositeOperation", op);
    }
  }
}
CONTEXT_PROPERTIES.forEach(function(prop) {
  Object.defineProperty(Context.prototype, prop, {
    get() {
      return this._context[prop];
    },
    set(val) {
      this._context[prop] = val;
    }
  });
});
class SceneContext extends Context {
  constructor(canvas, { willReadFrequently = false } = {}) {
    super(canvas);
    this._context = canvas._canvas.getContext("2d", {
      willReadFrequently
    });
  }
  _fillColor(shape) {
    const fill = shape.fill();
    this.setAttr("fillStyle", fill);
    shape._fillFunc(this);
  }
  _fillPattern(shape) {
    this.setAttr("fillStyle", shape._getFillPattern());
    shape._fillFunc(this);
  }
  _fillLinearGradient(shape) {
    const grd = shape._getLinearGradient();
    if (grd) {
      this.setAttr("fillStyle", grd);
      shape._fillFunc(this);
    }
  }
  _fillRadialGradient(shape) {
    const grd = shape._getRadialGradient();
    if (grd) {
      this.setAttr("fillStyle", grd);
      shape._fillFunc(this);
    }
  }
  _fill(shape) {
    const hasColor = shape.fill(), fillPriority = shape.getFillPriority();
    if (hasColor && fillPriority === "color") {
      this._fillColor(shape);
      return;
    }
    const hasPattern = shape.getFillPatternImage();
    if (hasPattern && fillPriority === "pattern") {
      this._fillPattern(shape);
      return;
    }
    const hasLinearGradient = shape.getFillLinearGradientColorStops();
    if (hasLinearGradient && fillPriority === "linear-gradient") {
      this._fillLinearGradient(shape);
      return;
    }
    const hasRadialGradient = shape.getFillRadialGradientColorStops();
    if (hasRadialGradient && fillPriority === "radial-gradient") {
      this._fillRadialGradient(shape);
      return;
    }
    if (hasColor) {
      this._fillColor(shape);
    } else if (hasPattern) {
      this._fillPattern(shape);
    } else if (hasLinearGradient) {
      this._fillLinearGradient(shape);
    } else if (hasRadialGradient) {
      this._fillRadialGradient(shape);
    }
  }
  _strokeLinearGradient(shape) {
    const start = shape.getStrokeLinearGradientStartPoint(), end = shape.getStrokeLinearGradientEndPoint(), colorStops = shape.getStrokeLinearGradientColorStops(), grd = this.createLinearGradient(start.x, start.y, end.x, end.y);
    if (colorStops) {
      for (let n = 0; n < colorStops.length; n += 2) {
        grd.addColorStop(colorStops[n], colorStops[n + 1]);
      }
      this.setAttr("strokeStyle", grd);
    }
  }
  _stroke(shape) {
    const dash = shape.dash(), strokeScaleEnabled = shape.getStrokeScaleEnabled();
    if (shape.hasStroke()) {
      if (!strokeScaleEnabled) {
        this.save();
        const pixelRatio = this.getCanvas().getPixelRatio();
        this.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      }
      this._applyLineCap(shape);
      if (dash && shape.dashEnabled()) {
        this.setLineDash(dash);
        this.setAttr("lineDashOffset", shape.dashOffset());
      }
      this.setAttr("lineWidth", shape.strokeWidth());
      if (!shape.getShadowForStrokeEnabled()) {
        this.setAttr("shadowColor", "rgba(0,0,0,0)");
      }
      const hasLinearGradient = shape.getStrokeLinearGradientColorStops();
      if (hasLinearGradient) {
        this._strokeLinearGradient(shape);
      } else {
        this.setAttr("strokeStyle", shape.stroke());
      }
      shape._strokeFunc(this);
      if (!strokeScaleEnabled) {
        this.restore();
      }
    }
  }
  _applyShadow(shape) {
    var _a, _b, _c;
    const color = (_a = shape.getShadowRGBA()) !== null && _a !== void 0 ? _a : "black", blur = (_b = shape.getShadowBlur()) !== null && _b !== void 0 ? _b : 5, offset = (_c = shape.getShadowOffset()) !== null && _c !== void 0 ? _c : {
      x: 0,
      y: 0
    }, scale = shape.getAbsoluteScale(), ratio = this.canvas.getPixelRatio(), scaleX = scale.x * ratio, scaleY = scale.y * ratio;
    this.setAttr("shadowColor", color);
    this.setAttr("shadowBlur", blur * Math.min(Math.abs(scaleX), Math.abs(scaleY)));
    this.setAttr("shadowOffsetX", offset.x * scaleX);
    this.setAttr("shadowOffsetY", offset.y * scaleY);
  }
}
class HitContext extends Context {
  constructor(canvas) {
    super(canvas);
    this._context = canvas._canvas.getContext("2d", {
      willReadFrequently: true
    });
  }
  _fill(shape) {
    this.save();
    this.setAttr("fillStyle", shape.colorKey);
    shape._fillFuncHit(this);
    this.restore();
  }
  strokeShape(shape) {
    if (shape.hasHitStroke()) {
      this._stroke(shape);
    }
  }
  _stroke(shape) {
    if (shape.hasHitStroke()) {
      const strokeScaleEnabled = shape.getStrokeScaleEnabled();
      if (!strokeScaleEnabled) {
        this.save();
        const pixelRatio = this.getCanvas().getPixelRatio();
        this.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      }
      this._applyLineCap(shape);
      const hitStrokeWidth = shape.hitStrokeWidth();
      const strokeWidth = hitStrokeWidth === "auto" ? shape.strokeWidth() : hitStrokeWidth;
      this.setAttr("lineWidth", strokeWidth);
      this.setAttr("strokeStyle", shape.colorKey);
      shape._strokeFuncHit(this);
      if (!strokeScaleEnabled) {
        this.restore();
      }
    }
  }
}
let _pixelRatio;
function getDevicePixelRatio() {
  if (_pixelRatio) {
    return _pixelRatio;
  }
  const canvas = Util.createCanvasElement();
  const context = canvas.getContext("2d");
  _pixelRatio = function() {
    const devicePixelRatio = Konva$1._global.devicePixelRatio || 1, backingStoreRatio = context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio || context.backingStorePixelRatio || 1;
    return devicePixelRatio / backingStoreRatio;
  }();
  Util.releaseCanvas(canvas);
  return _pixelRatio;
}
class Canvas {
  constructor(config) {
    this.pixelRatio = 1;
    this.width = 0;
    this.height = 0;
    this.isCache = false;
    const conf = config || {};
    const pixelRatio = conf.pixelRatio || Konva$1.pixelRatio || getDevicePixelRatio();
    this.pixelRatio = pixelRatio;
    this._canvas = Util.createCanvasElement();
    this._canvas.style.padding = "0";
    this._canvas.style.margin = "0";
    this._canvas.style.border = "0";
    this._canvas.style.background = "transparent";
    this._canvas.style.position = "absolute";
    this._canvas.style.top = "0";
    this._canvas.style.left = "0";
  }
  getContext() {
    return this.context;
  }
  getPixelRatio() {
    return this.pixelRatio;
  }
  setPixelRatio(pixelRatio) {
    const previousRatio = this.pixelRatio;
    this.pixelRatio = pixelRatio;
    this.setSize(this.getWidth() / previousRatio, this.getHeight() / previousRatio);
  }
  setWidth(width) {
    this.width = this._canvas.width = width * this.pixelRatio;
    this._canvas.style.width = width + "px";
    const pixelRatio = this.pixelRatio, _context = this.getContext()._context;
    _context.scale(pixelRatio, pixelRatio);
  }
  setHeight(height) {
    this.height = this._canvas.height = height * this.pixelRatio;
    this._canvas.style.height = height + "px";
    const pixelRatio = this.pixelRatio, _context = this.getContext()._context;
    _context.scale(pixelRatio, pixelRatio);
  }
  getWidth() {
    return this.width;
  }
  getHeight() {
    return this.height;
  }
  setSize(width, height) {
    this.setWidth(width || 0);
    this.setHeight(height || 0);
  }
  toDataURL(mimeType, quality) {
    try {
      return this._canvas.toDataURL(mimeType, quality);
    } catch (e) {
      try {
        return this._canvas.toDataURL();
      } catch (err) {
        Util.error("Unable to get data URL. " + err.message + " For more info read https://konvajs.org/docs/posts/Tainted_Canvas.html.");
        return "";
      }
    }
  }
}
class SceneCanvas extends Canvas {
  constructor(config = { width: 0, height: 0, willReadFrequently: false }) {
    super(config);
    this.context = new SceneContext(this, {
      willReadFrequently: config.willReadFrequently
    });
    this.setSize(config.width, config.height);
  }
}
class HitCanvas extends Canvas {
  constructor(config = { width: 0, height: 0 }) {
    super(config);
    this.hitCanvas = true;
    this.context = new HitContext(this);
    this.setSize(config.width, config.height);
  }
}
const DD = {
  get isDragging() {
    let flag = false;
    DD._dragElements.forEach((elem) => {
      if (elem.dragStatus === "dragging") {
        flag = true;
      }
    });
    return flag;
  },
  justDragged: false,
  get node() {
    let node;
    DD._dragElements.forEach((elem) => {
      node = elem.node;
    });
    return node;
  },
  _dragElements: /* @__PURE__ */ new Map(),
  _drag(evt) {
    const nodesToFireEvents = [];
    DD._dragElements.forEach((elem, key) => {
      const { node } = elem;
      const stage = node.getStage();
      stage.setPointersPositions(evt);
      if (elem.pointerId === void 0) {
        elem.pointerId = Util._getFirstPointerId(evt);
      }
      const pos = stage._changedPointerPositions.find((pos2) => pos2.id === elem.pointerId);
      if (!pos) {
        return;
      }
      if (elem.dragStatus !== "dragging") {
        const dragDistance = node.dragDistance();
        const distance = Math.max(Math.abs(pos.x - elem.startPointerPos.x), Math.abs(pos.y - elem.startPointerPos.y));
        if (distance < dragDistance) {
          return;
        }
        node.startDrag({ evt });
        if (!node.isDragging()) {
          return;
        }
      }
      node._setDragPosition(evt, elem);
      nodesToFireEvents.push(node);
    });
    nodesToFireEvents.forEach((node) => {
      node.fire("dragmove", {
        type: "dragmove",
        target: node,
        evt
      }, true);
    });
  },
  _endDragBefore(evt) {
    const drawNodes = [];
    DD._dragElements.forEach((elem) => {
      const { node } = elem;
      const stage = node.getStage();
      if (evt) {
        stage.setPointersPositions(evt);
      }
      const pos = stage._changedPointerPositions.find((pos2) => pos2.id === elem.pointerId);
      if (!pos) {
        return;
      }
      if (elem.dragStatus === "dragging" || elem.dragStatus === "stopped") {
        DD.justDragged = true;
        Konva$1._mouseListenClick = false;
        Konva$1._touchListenClick = false;
        Konva$1._pointerListenClick = false;
        elem.dragStatus = "stopped";
      }
      const drawNode = elem.node.getLayer() || elem.node instanceof Konva$1["Stage"] && elem.node;
      if (drawNode && drawNodes.indexOf(drawNode) === -1) {
        drawNodes.push(drawNode);
      }
    });
    drawNodes.forEach((drawNode) => {
      drawNode.draw();
    });
  },
  _endDragAfter(evt) {
    DD._dragElements.forEach((elem, key) => {
      if (elem.dragStatus === "stopped") {
        elem.node.fire("dragend", {
          type: "dragend",
          target: elem.node,
          evt
        }, true);
      }
      if (elem.dragStatus !== "dragging") {
        DD._dragElements.delete(key);
      }
    });
  }
};
if (Konva$1.isBrowser) {
  window.addEventListener("mouseup", DD._endDragBefore, true);
  window.addEventListener("touchend", DD._endDragBefore, true);
  window.addEventListener("touchcancel", DD._endDragBefore, true);
  window.addEventListener("mousemove", DD._drag);
  window.addEventListener("touchmove", DD._drag);
  window.addEventListener("mouseup", DD._endDragAfter, false);
  window.addEventListener("touchend", DD._endDragAfter, false);
  window.addEventListener("touchcancel", DD._endDragAfter, false);
}
function _formatValue(val) {
  if (Util._isString(val)) {
    return '"' + val + '"';
  }
  if (Object.prototype.toString.call(val) === "[object Number]") {
    return val;
  }
  if (Util._isBoolean(val)) {
    return val;
  }
  return Object.prototype.toString.call(val);
}
function RGBComponent(val) {
  if (val > 255) {
    return 255;
  } else if (val < 0) {
    return 0;
  }
  return Math.round(val);
}
function getNumberValidator() {
  if (Konva$1.isUnminified) {
    return function(val, attr) {
      if (!Util._isNumber(val)) {
        Util.warn(_formatValue(val) + ' is a not valid value for "' + attr + '" attribute. The value should be a number.');
      }
      return val;
    };
  }
}
function getNumberOrArrayOfNumbersValidator(noOfElements) {
  if (Konva$1.isUnminified) {
    return function(val, attr) {
      let isNumber = Util._isNumber(val);
      let isValidArray = Util._isArray(val) && val.length == noOfElements;
      if (!isNumber && !isValidArray) {
        Util.warn(_formatValue(val) + ' is a not valid value for "' + attr + '" attribute. The value should be a number or Array<number>(' + noOfElements + ")");
      }
      return val;
    };
  }
}
function getNumberOrAutoValidator() {
  if (Konva$1.isUnminified) {
    return function(val, attr) {
      const isNumber = Util._isNumber(val);
      const isAuto = val === "auto";
      if (!(isNumber || isAuto)) {
        Util.warn(_formatValue(val) + ' is a not valid value for "' + attr + '" attribute. The value should be a number or "auto".');
      }
      return val;
    };
  }
}
function getStringValidator() {
  if (Konva$1.isUnminified) {
    return function(val, attr) {
      if (!Util._isString(val)) {
        Util.warn(_formatValue(val) + ' is a not valid value for "' + attr + '" attribute. The value should be a string.');
      }
      return val;
    };
  }
}
function getStringOrGradientValidator() {
  if (Konva$1.isUnminified) {
    return function(val, attr) {
      const isString = Util._isString(val);
      const isGradient = Object.prototype.toString.call(val) === "[object CanvasGradient]" || val && val["addColorStop"];
      if (!(isString || isGradient)) {
        Util.warn(_formatValue(val) + ' is a not valid value for "' + attr + '" attribute. The value should be a string or a native gradient.');
      }
      return val;
    };
  }
}
function getNumberArrayValidator() {
  if (Konva$1.isUnminified) {
    return function(val, attr) {
      const TypedArray = Int8Array ? Object.getPrototypeOf(Int8Array) : null;
      if (TypedArray && val instanceof TypedArray) {
        return val;
      }
      if (!Util._isArray(val)) {
        Util.warn(_formatValue(val) + ' is a not valid value for "' + attr + '" attribute. The value should be a array of numbers.');
      } else {
        val.forEach(function(item) {
          if (!Util._isNumber(item)) {
            Util.warn('"' + attr + '" attribute has non numeric element ' + item + ". Make sure that all elements are numbers.");
          }
        });
      }
      return val;
    };
  }
}
function getBooleanValidator() {
  if (Konva$1.isUnminified) {
    return function(val, attr) {
      const isBool = val === true || val === false;
      if (!isBool) {
        Util.warn(_formatValue(val) + ' is a not valid value for "' + attr + '" attribute. The value should be a boolean.');
      }
      return val;
    };
  }
}
function getComponentValidator(components) {
  if (Konva$1.isUnminified) {
    return function(val, attr) {
      if (val === void 0 || val === null) {
        return val;
      }
      if (!Util.isObject(val)) {
        Util.warn(_formatValue(val) + ' is a not valid value for "' + attr + '" attribute. The value should be an object with properties ' + components);
      }
      return val;
    };
  }
}
const GET = "get";
const SET$1 = "set";
const Factory = {
  addGetterSetter(constructor, attr, def2, validator, after) {
    Factory.addGetter(constructor, attr, def2);
    Factory.addSetter(constructor, attr, validator, after);
    Factory.addOverloadedGetterSetter(constructor, attr);
  },
  addGetter(constructor, attr, def2) {
    const method = GET + Util._capitalize(attr);
    constructor.prototype[method] = constructor.prototype[method] || function() {
      const val = this.attrs[attr];
      return val === void 0 ? def2 : val;
    };
  },
  addSetter(constructor, attr, validator, after) {
    const method = SET$1 + Util._capitalize(attr);
    if (!constructor.prototype[method]) {
      Factory.overWriteSetter(constructor, attr, validator, after);
    }
  },
  overWriteSetter(constructor, attr, validator, after) {
    const method = SET$1 + Util._capitalize(attr);
    constructor.prototype[method] = function(val) {
      if (validator && val !== void 0 && val !== null) {
        val = validator.call(this, val, attr);
      }
      this._setAttr(attr, val);
      if (after) {
        after.call(this);
      }
      return this;
    };
  },
  addComponentsGetterSetter(constructor, attr, components, validator, after) {
    const len = components.length, capitalize = Util._capitalize, getter = GET + capitalize(attr), setter = SET$1 + capitalize(attr);
    constructor.prototype[getter] = function() {
      const ret = {};
      for (let n = 0; n < len; n++) {
        const component = components[n];
        ret[component] = this.getAttr(attr + capitalize(component));
      }
      return ret;
    };
    const basicValidator = getComponentValidator(components);
    constructor.prototype[setter] = function(val) {
      const oldVal = this.attrs[attr];
      if (validator) {
        val = validator.call(this, val, attr);
      }
      if (basicValidator) {
        basicValidator.call(this, val, attr);
      }
      for (const key in val) {
        if (!val.hasOwnProperty(key)) {
          continue;
        }
        this._setAttr(attr + capitalize(key), val[key]);
      }
      if (!val) {
        components.forEach((component) => {
          this._setAttr(attr + capitalize(component), void 0);
        });
      }
      this._fireChangeEvent(attr, oldVal, val);
      if (after) {
        after.call(this);
      }
      return this;
    };
    Factory.addOverloadedGetterSetter(constructor, attr);
  },
  addOverloadedGetterSetter(constructor, attr) {
    const capitalizedAttr = Util._capitalize(attr), setter = SET$1 + capitalizedAttr, getter = GET + capitalizedAttr;
    constructor.prototype[attr] = function() {
      if (arguments.length) {
        this[setter](arguments[0]);
        return this;
      }
      return this[getter]();
    };
  },
  addDeprecatedGetterSetter(constructor, attr, def2, validator) {
    Util.error("Adding deprecated " + attr);
    const method = GET + Util._capitalize(attr);
    const message = attr + " property is deprecated and will be removed soon. Look at Konva change log for more information.";
    constructor.prototype[method] = function() {
      Util.error(message);
      const val = this.attrs[attr];
      return val === void 0 ? def2 : val;
    };
    Factory.addSetter(constructor, attr, validator, function() {
      Util.error(message);
    });
    Factory.addOverloadedGetterSetter(constructor, attr);
  },
  backCompat(constructor, methods) {
    Util.each(methods, function(oldMethodName, newMethodName) {
      const method = constructor.prototype[newMethodName];
      const oldGetter = GET + Util._capitalize(oldMethodName);
      const oldSetter = SET$1 + Util._capitalize(oldMethodName);
      function deprecated() {
        method.apply(this, arguments);
        Util.error('"' + oldMethodName + '" method is deprecated and will be removed soon. Use ""' + newMethodName + '" instead.');
      }
      constructor.prototype[oldMethodName] = deprecated;
      constructor.prototype[oldGetter] = deprecated;
      constructor.prototype[oldSetter] = deprecated;
    });
  },
  afterSetFilter() {
    this._filterUpToDate = false;
  }
};
function parseCSSFilters(cssFilter) {
  const filterRegex = /(\w+)\(([^)]+)\)/g;
  let match;
  while ((match = filterRegex.exec(cssFilter)) !== null) {
    const [, filterName, filterValue] = match;
    switch (filterName) {
      case "blur": {
        const blurRadius = parseFloat(filterValue.replace("px", ""));
        return function(imageData) {
          this.blurRadius(blurRadius * 0.5);
          const KonvaFilters = Konva$1.Filters;
          if (KonvaFilters && KonvaFilters.Blur) {
            KonvaFilters.Blur.call(this, imageData);
          }
        };
      }
      case "brightness": {
        const brightness = filterValue.includes("%") ? parseFloat(filterValue) / 100 : parseFloat(filterValue);
        return function(imageData) {
          this.brightness(brightness);
          const KonvaFilters = Konva$1.Filters;
          if (KonvaFilters && KonvaFilters.Brightness) {
            KonvaFilters.Brightness.call(this, imageData);
          }
        };
      }
      case "contrast": {
        const contrast = parseFloat(filterValue);
        return function(imageData) {
          const konvaContrast = 100 * (Math.sqrt(contrast) - 1);
          this.contrast(konvaContrast);
          const KonvaFilters = Konva$1.Filters;
          if (KonvaFilters && KonvaFilters.Contrast) {
            KonvaFilters.Contrast.call(this, imageData);
          }
        };
      }
      case "grayscale": {
        return function(imageData) {
          const KonvaFilters = Konva$1.Filters;
          if (KonvaFilters && KonvaFilters.Grayscale) {
            KonvaFilters.Grayscale.call(this, imageData);
          }
        };
      }
      case "sepia": {
        return function(imageData) {
          const KonvaFilters = Konva$1.Filters;
          if (KonvaFilters && KonvaFilters.Sepia) {
            KonvaFilters.Sepia.call(this, imageData);
          }
        };
      }
      case "invert": {
        return function(imageData) {
          const KonvaFilters = Konva$1.Filters;
          if (KonvaFilters && KonvaFilters.Invert) {
            KonvaFilters.Invert.call(this, imageData);
          }
        };
      }
      default:
        Util.warn(`CSS filter "${filterName}" is not supported in fallback mode. Consider using function filters for better compatibility.`);
        break;
    }
  }
  return () => {
  };
}
const ABSOLUTE_OPACITY = "absoluteOpacity", ALL_LISTENERS = "allEventListeners", ABSOLUTE_TRANSFORM = "absoluteTransform", ABSOLUTE_SCALE = "absoluteScale", CANVAS = "canvas", CHANGE = "Change", CHILDREN = "children", KONVA = "konva", LISTENING = "listening", MOUSEENTER$1 = "mouseenter", MOUSELEAVE$1 = "mouseleave", POINTERENTER$1 = "pointerenter", POINTERLEAVE$1 = "pointerleave", TOUCHENTER = "touchenter", TOUCHLEAVE = "touchleave", SET = "set", SHAPE = "Shape", SPACE$1 = " ", STAGE$1 = "stage", TRANSFORM = "transform", UPPER_STAGE = "Stage", VISIBLE = "visible", TRANSFORM_CHANGE_STR$1 = [
  "xChange.konva",
  "yChange.konva",
  "scaleXChange.konva",
  "scaleYChange.konva",
  "skewXChange.konva",
  "skewYChange.konva",
  "rotationChange.konva",
  "offsetXChange.konva",
  "offsetYChange.konva",
  "transformsEnabledChange.konva"
].join(SPACE$1);
let idCounter$1 = 1;
class Node {
  constructor(config) {
    this._id = idCounter$1++;
    this.eventListeners = {};
    this.attrs = {};
    this.index = 0;
    this._allEventListeners = null;
    this.parent = null;
    this._cache = /* @__PURE__ */ new Map();
    this._attachedDepsListeners = /* @__PURE__ */ new Map();
    this._lastPos = null;
    this._batchingTransformChange = false;
    this._needClearTransformCache = false;
    this._filterUpToDate = false;
    this._isUnderCache = false;
    this._dragEventId = null;
    this._shouldFireChangeEvents = false;
    this.setAttrs(config);
    this._shouldFireChangeEvents = true;
  }
  hasChildren() {
    return false;
  }
  _clearCache(attr) {
    if ((attr === TRANSFORM || attr === ABSOLUTE_TRANSFORM) && this._cache.get(attr)) {
      this._cache.get(attr).dirty = true;
    } else if (attr) {
      this._cache.delete(attr);
    } else {
      this._cache.clear();
    }
  }
  _getCache(attr, privateGetter) {
    let cache = this._cache.get(attr);
    const isTransform = attr === TRANSFORM || attr === ABSOLUTE_TRANSFORM;
    const invalid = cache === void 0 || isTransform && cache.dirty === true;
    if (invalid) {
      cache = privateGetter.call(this);
      this._cache.set(attr, cache);
    }
    return cache;
  }
  _calculate(name, deps, getter) {
    if (!this._attachedDepsListeners.get(name)) {
      const depsString = deps.map((dep) => dep + "Change.konva").join(SPACE$1);
      this.on(depsString, () => {
        this._clearCache(name);
      });
      this._attachedDepsListeners.set(name, true);
    }
    return this._getCache(name, getter);
  }
  _getCanvasCache() {
    return this._cache.get(CANVAS);
  }
  _clearSelfAndDescendantCache(attr) {
    this._clearCache(attr);
    if (attr === ABSOLUTE_TRANSFORM) {
      this.fire("absoluteTransformChange");
    }
  }
  clearCache() {
    if (this._cache.has(CANVAS)) {
      const { scene, filter, hit } = this._cache.get(CANVAS);
      Util.releaseCanvas(scene._canvas, filter._canvas, hit._canvas);
      this._cache.delete(CANVAS);
    }
    this._clearSelfAndDescendantCache();
    this._requestDraw();
    return this;
  }
  cache(config) {
    const conf = config || {};
    let rect = {};
    if (conf.x === void 0 || conf.y === void 0 || conf.width === void 0 || conf.height === void 0) {
      rect = this.getClientRect({
        skipTransform: true,
        relativeTo: this.getParent() || void 0
      });
    }
    let width = Math.ceil(conf.width || rect.width), height = Math.ceil(conf.height || rect.height), pixelRatio = conf.pixelRatio, x = conf.x === void 0 ? Math.floor(rect.x) : conf.x, y = conf.y === void 0 ? Math.floor(rect.y) : conf.y, offset = conf.offset || 0, drawBorder = conf.drawBorder || false, hitCanvasPixelRatio = conf.hitCanvasPixelRatio || 1;
    if (!width || !height) {
      Util.error("Can not cache the node. Width or height of the node equals 0. Caching is skipped.");
      return;
    }
    const extraPaddingX = Math.abs(Math.round(rect.x) - x) > 0.5 ? 1 : 0;
    const extraPaddingY = Math.abs(Math.round(rect.y) - y) > 0.5 ? 1 : 0;
    width += offset * 2 + extraPaddingX;
    height += offset * 2 + extraPaddingY;
    x -= offset;
    y -= offset;
    const cachedSceneCanvas = new SceneCanvas({
      pixelRatio,
      width,
      height
    }), cachedFilterCanvas = new SceneCanvas({
      pixelRatio,
      width: 0,
      height: 0,
      willReadFrequently: true
    }), cachedHitCanvas = new HitCanvas({
      pixelRatio: hitCanvasPixelRatio,
      width,
      height
    }), sceneContext = cachedSceneCanvas.getContext(), hitContext = cachedHitCanvas.getContext();
    const bufferCanvas = new SceneCanvas({
      width: cachedSceneCanvas.width / cachedSceneCanvas.pixelRatio + Math.abs(x),
      height: cachedSceneCanvas.height / cachedSceneCanvas.pixelRatio + Math.abs(y),
      pixelRatio: cachedSceneCanvas.pixelRatio
    }), bufferContext = bufferCanvas.getContext();
    cachedHitCanvas.isCache = true;
    cachedSceneCanvas.isCache = true;
    this._cache.delete(CANVAS);
    this._filterUpToDate = false;
    if (conf.imageSmoothingEnabled === false) {
      cachedSceneCanvas.getContext()._context.imageSmoothingEnabled = false;
      cachedFilterCanvas.getContext()._context.imageSmoothingEnabled = false;
    }
    sceneContext.save();
    hitContext.save();
    bufferContext.save();
    sceneContext.translate(-x, -y);
    hitContext.translate(-x, -y);
    bufferContext.translate(-x, -y);
    bufferCanvas.x = x;
    bufferCanvas.y = y;
    this._isUnderCache = true;
    this._clearSelfAndDescendantCache(ABSOLUTE_OPACITY);
    this._clearSelfAndDescendantCache(ABSOLUTE_SCALE);
    this.drawScene(cachedSceneCanvas, this, bufferCanvas);
    this.drawHit(cachedHitCanvas, this);
    this._isUnderCache = false;
    sceneContext.restore();
    hitContext.restore();
    if (drawBorder) {
      sceneContext.save();
      sceneContext.beginPath();
      sceneContext.rect(0, 0, width, height);
      sceneContext.closePath();
      sceneContext.setAttr("strokeStyle", "red");
      sceneContext.setAttr("lineWidth", 5);
      sceneContext.stroke();
      sceneContext.restore();
    }
    Util.releaseCanvas(bufferCanvas._canvas);
    this._cache.set(CANVAS, {
      scene: cachedSceneCanvas,
      filter: cachedFilterCanvas,
      hit: cachedHitCanvas,
      x,
      y
    });
    this._requestDraw();
    return this;
  }
  isCached() {
    return this._cache.has(CANVAS);
  }
  getClientRect(config) {
    throw new Error('abstract "getClientRect" method call');
  }
  _transformedRect(rect, top) {
    const points = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height }
    ];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const trans = this.getAbsoluteTransform(top);
    points.forEach(function(point) {
      const transformed = trans.point(point);
      if (minX === void 0) {
        minX = maxX = transformed.x;
        minY = maxY = transformed.y;
      }
      minX = Math.min(minX, transformed.x);
      minY = Math.min(minY, transformed.y);
      maxX = Math.max(maxX, transformed.x);
      maxY = Math.max(maxY, transformed.y);
    });
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  _drawCachedSceneCanvas(context) {
    context.save();
    context._applyOpacity(this);
    context._applyGlobalCompositeOperation(this);
    const canvasCache = this._getCanvasCache();
    context.translate(canvasCache.x, canvasCache.y);
    const cacheCanvas = this._getCachedSceneCanvas();
    const ratio = cacheCanvas.pixelRatio;
    context.drawImage(cacheCanvas._canvas, 0, 0, cacheCanvas.width / ratio, cacheCanvas.height / ratio);
    context.restore();
  }
  _drawCachedHitCanvas(context) {
    const canvasCache = this._getCanvasCache(), hitCanvas = canvasCache.hit;
    context.save();
    context.translate(canvasCache.x, canvasCache.y);
    context.drawImage(hitCanvas._canvas, 0, 0, hitCanvas.width / hitCanvas.pixelRatio, hitCanvas.height / hitCanvas.pixelRatio);
    context.restore();
  }
  _getCachedSceneCanvas() {
    let filters = this.filters(), cachedCanvas = this._getCanvasCache(), sceneCanvas = cachedCanvas.scene, filterCanvas = cachedCanvas.filter, filterContext = filterCanvas.getContext(), len, imageData, n, filter;
    if (!filters || filters.length === 0) {
      return sceneCanvas;
    }
    if (this._filterUpToDate) {
      return filterCanvas;
    }
    let useNativeOnly = true;
    for (let i = 0; i < filters.length; i++) {
      typeof filters[i] === "string" && !isCSSFiltersSupported();
      if (typeof filters[i] !== "string" || !isCSSFiltersSupported()) {
        useNativeOnly = false;
        break;
      }
    }
    const ratio = sceneCanvas.pixelRatio;
    filterCanvas.setSize(sceneCanvas.width / sceneCanvas.pixelRatio, sceneCanvas.height / sceneCanvas.pixelRatio);
    if (useNativeOnly) {
      const finalFilter = filters.join(" ");
      filterContext.save();
      filterContext.setAttr("filter", finalFilter);
      filterContext.drawImage(sceneCanvas._canvas, 0, 0, sceneCanvas.getWidth() / ratio, sceneCanvas.getHeight() / ratio);
      filterContext.restore();
      this._filterUpToDate = true;
      return filterCanvas;
    }
    try {
      len = filters.length;
      filterContext.clear();
      filterContext.drawImage(sceneCanvas._canvas, 0, 0, sceneCanvas.getWidth() / ratio, sceneCanvas.getHeight() / ratio);
      imageData = filterContext.getImageData(0, 0, filterCanvas.getWidth(), filterCanvas.getHeight());
      for (n = 0; n < len; n++) {
        filter = filters[n];
        if (typeof filter === "string") {
          filter = parseCSSFilters(filter);
        }
        filter.call(this, imageData);
        filterContext.putImageData(imageData, 0, 0);
      }
    } catch (e) {
      Util.error("Unable to apply filter. " + e.message + " This post my help you https://konvajs.org/docs/posts/Tainted_Canvas.html.");
    }
    this._filterUpToDate = true;
    return filterCanvas;
  }
  on(evtStr, handler) {
    if (this._cache) {
      this._cache.delete(ALL_LISTENERS);
    }
    if (arguments.length === 3) {
      return this._delegate.apply(this, arguments);
    }
    const events = evtStr.split(SPACE$1);
    for (let n = 0; n < events.length; n++) {
      const event = events[n];
      const parts = event.split(".");
      const baseEvent = parts[0];
      const name = parts[1] || "";
      if (!this.eventListeners[baseEvent]) {
        this.eventListeners[baseEvent] = [];
      }
      this.eventListeners[baseEvent].push({ name, handler });
    }
    return this;
  }
  off(evtStr, callback) {
    let events = (evtStr || "").split(SPACE$1), len = events.length, n, t2, event, parts, baseEvent, name;
    this._cache && this._cache.delete(ALL_LISTENERS);
    if (!evtStr) {
      for (t2 in this.eventListeners) {
        this._off(t2);
      }
    }
    for (n = 0; n < len; n++) {
      event = events[n];
      parts = event.split(".");
      baseEvent = parts[0];
      name = parts[1];
      if (baseEvent) {
        if (this.eventListeners[baseEvent]) {
          this._off(baseEvent, name, callback);
        }
      } else {
        for (t2 in this.eventListeners) {
          this._off(t2, name, callback);
        }
      }
    }
    return this;
  }
  dispatchEvent(evt) {
    const e = {
      target: this,
      type: evt.type,
      evt
    };
    this.fire(evt.type, e);
    return this;
  }
  addEventListener(type2, handler) {
    this.on(type2, function(evt) {
      handler.call(this, evt.evt);
    });
    return this;
  }
  removeEventListener(type2) {
    this.off(type2);
    return this;
  }
  _delegate(event, selector, handler) {
    const stopNode = this;
    this.on(event, function(evt) {
      const targets = evt.target.findAncestors(selector, true, stopNode);
      for (let i = 0; i < targets.length; i++) {
        evt = Util.cloneObject(evt);
        evt.currentTarget = targets[i];
        handler.call(targets[i], evt);
      }
    });
  }
  remove() {
    if (this.isDragging()) {
      this.stopDrag();
    }
    DD._dragElements.delete(this._id);
    this._remove();
    return this;
  }
  _clearCaches() {
    this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
    this._clearSelfAndDescendantCache(ABSOLUTE_OPACITY);
    this._clearSelfAndDescendantCache(ABSOLUTE_SCALE);
    this._clearSelfAndDescendantCache(STAGE$1);
    this._clearSelfAndDescendantCache(VISIBLE);
    this._clearSelfAndDescendantCache(LISTENING);
  }
  _remove() {
    this._clearCaches();
    const parent = this.getParent();
    if (parent && parent.children) {
      parent.children.splice(this.index, 1);
      parent._setChildrenIndices();
      this.parent = null;
    }
  }
  destroy() {
    this.remove();
    this.clearCache();
    return this;
  }
  getAttr(attr) {
    const method = "get" + Util._capitalize(attr);
    if (Util._isFunction(this[method])) {
      return this[method]();
    }
    return this.attrs[attr];
  }
  getAncestors() {
    let parent = this.getParent(), ancestors = [];
    while (parent) {
      ancestors.push(parent);
      parent = parent.getParent();
    }
    return ancestors;
  }
  getAttrs() {
    return this.attrs || {};
  }
  setAttrs(config) {
    this._batchTransformChanges(() => {
      let key, method;
      if (!config) {
        return this;
      }
      for (key in config) {
        if (key === CHILDREN) {
          continue;
        }
        method = SET + Util._capitalize(key);
        if (Util._isFunction(this[method])) {
          this[method](config[key]);
        } else {
          this._setAttr(key, config[key]);
        }
      }
    });
    return this;
  }
  isListening() {
    return this._getCache(LISTENING, this._isListening);
  }
  _isListening(relativeTo) {
    const listening = this.listening();
    if (!listening) {
      return false;
    }
    const parent = this.getParent();
    if (parent && parent !== relativeTo && this !== relativeTo) {
      return parent._isListening(relativeTo);
    } else {
      return true;
    }
  }
  isVisible() {
    return this._getCache(VISIBLE, this._isVisible);
  }
  _isVisible(relativeTo) {
    const visible = this.visible();
    if (!visible) {
      return false;
    }
    const parent = this.getParent();
    if (parent && parent !== relativeTo && this !== relativeTo) {
      return parent._isVisible(relativeTo);
    } else {
      return true;
    }
  }
  shouldDrawHit(top, skipDragCheck = false) {
    if (top) {
      return this._isVisible(top) && this._isListening(top);
    }
    const layer = this.getLayer();
    let layerUnderDrag = false;
    DD._dragElements.forEach((elem) => {
      if (elem.dragStatus !== "dragging") {
        return;
      } else if (elem.node.nodeType === "Stage") {
        layerUnderDrag = true;
      } else if (elem.node.getLayer() === layer) {
        layerUnderDrag = true;
      }
    });
    const dragSkip = !skipDragCheck && !Konva$1.hitOnDragEnabled && (layerUnderDrag || Konva$1.isTransforming());
    return this.isListening() && this.isVisible() && !dragSkip;
  }
  show() {
    this.visible(true);
    return this;
  }
  hide() {
    this.visible(false);
    return this;
  }
  getZIndex() {
    return this.index || 0;
  }
  getAbsoluteZIndex() {
    let depth = this.getDepth(), that = this, index = 0, nodes, len, n, child;
    function addChildren(children) {
      nodes = [];
      len = children.length;
      for (n = 0; n < len; n++) {
        child = children[n];
        index++;
        if (child.nodeType !== SHAPE) {
          nodes = nodes.concat(child.getChildren().slice());
        }
        if (child._id === that._id) {
          n = len;
        }
      }
      if (nodes.length > 0 && nodes[0].getDepth() <= depth) {
        addChildren(nodes);
      }
    }
    const stage = this.getStage();
    if (that.nodeType !== UPPER_STAGE && stage) {
      addChildren(stage.getChildren());
    }
    return index;
  }
  getDepth() {
    let depth = 0, parent = this.parent;
    while (parent) {
      depth++;
      parent = parent.parent;
    }
    return depth;
  }
  _batchTransformChanges(func) {
    this._batchingTransformChange = true;
    func();
    this._batchingTransformChange = false;
    if (this._needClearTransformCache) {
      this._clearCache(TRANSFORM);
      this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
    }
    this._needClearTransformCache = false;
  }
  setPosition(pos) {
    this._batchTransformChanges(() => {
      this.x(pos.x);
      this.y(pos.y);
    });
    return this;
  }
  getPosition() {
    return {
      x: this.x(),
      y: this.y()
    };
  }
  getRelativePointerPosition() {
    const stage = this.getStage();
    if (!stage) {
      return null;
    }
    const pos = stage.getPointerPosition();
    if (!pos) {
      return null;
    }
    const transform = this.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pos);
  }
  getAbsolutePosition(top) {
    let haveCachedParent = false;
    let parent = this.parent;
    while (parent) {
      if (parent.isCached()) {
        haveCachedParent = true;
        break;
      }
      parent = parent.parent;
    }
    if (haveCachedParent && !top) {
      top = true;
    }
    const absoluteMatrix = this.getAbsoluteTransform(top).getMatrix(), absoluteTransform = new Transform(), offset = this.offset();
    absoluteTransform.m = absoluteMatrix.slice();
    absoluteTransform.translate(offset.x, offset.y);
    return absoluteTransform.getTranslation();
  }
  setAbsolutePosition(pos) {
    const { x, y, ...origTrans } = this._clearTransform();
    this.attrs.x = x;
    this.attrs.y = y;
    this._clearCache(TRANSFORM);
    const it = this._getAbsoluteTransform().copy();
    it.invert();
    it.translate(pos.x, pos.y);
    pos = {
      x: this.attrs.x + it.getTranslation().x,
      y: this.attrs.y + it.getTranslation().y
    };
    this._setTransform(origTrans);
    this.setPosition({ x: pos.x, y: pos.y });
    this._clearCache(TRANSFORM);
    this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
    return this;
  }
  _setTransform(trans) {
    let key;
    for (key in trans) {
      this.attrs[key] = trans[key];
    }
  }
  _clearTransform() {
    const trans = {
      x: this.x(),
      y: this.y(),
      rotation: this.rotation(),
      scaleX: this.scaleX(),
      scaleY: this.scaleY(),
      offsetX: this.offsetX(),
      offsetY: this.offsetY(),
      skewX: this.skewX(),
      skewY: this.skewY()
    };
    this.attrs.x = 0;
    this.attrs.y = 0;
    this.attrs.rotation = 0;
    this.attrs.scaleX = 1;
    this.attrs.scaleY = 1;
    this.attrs.offsetX = 0;
    this.attrs.offsetY = 0;
    this.attrs.skewX = 0;
    this.attrs.skewY = 0;
    return trans;
  }
  move(change) {
    let changeX = change.x, changeY = change.y, x = this.x(), y = this.y();
    if (changeX !== void 0) {
      x += changeX;
    }
    if (changeY !== void 0) {
      y += changeY;
    }
    this.setPosition({ x, y });
    return this;
  }
  _eachAncestorReverse(func, top) {
    let family = [], parent = this.getParent(), len, n;
    if (top && top._id === this._id) {
      return;
    }
    family.unshift(this);
    while (parent && (!top || parent._id !== top._id)) {
      family.unshift(parent);
      parent = parent.parent;
    }
    len = family.length;
    for (n = 0; n < len; n++) {
      func(family[n]);
    }
  }
  rotate(theta) {
    this.rotation(this.rotation() + theta);
    return this;
  }
  moveToTop() {
    if (!this.parent) {
      Util.warn("Node has no parent. moveToTop function is ignored.");
      return false;
    }
    const index = this.index, len = this.parent.getChildren().length;
    if (index < len - 1) {
      this.parent.children.splice(index, 1);
      this.parent.children.push(this);
      this.parent._setChildrenIndices();
      return true;
    }
    return false;
  }
  moveUp() {
    if (!this.parent) {
      Util.warn("Node has no parent. moveUp function is ignored.");
      return false;
    }
    const index = this.index, len = this.parent.getChildren().length;
    if (index < len - 1) {
      this.parent.children.splice(index, 1);
      this.parent.children.splice(index + 1, 0, this);
      this.parent._setChildrenIndices();
      return true;
    }
    return false;
  }
  moveDown() {
    if (!this.parent) {
      Util.warn("Node has no parent. moveDown function is ignored.");
      return false;
    }
    const index = this.index;
    if (index > 0) {
      this.parent.children.splice(index, 1);
      this.parent.children.splice(index - 1, 0, this);
      this.parent._setChildrenIndices();
      return true;
    }
    return false;
  }
  moveToBottom() {
    if (!this.parent) {
      Util.warn("Node has no parent. moveToBottom function is ignored.");
      return false;
    }
    const index = this.index;
    if (index > 0) {
      this.parent.children.splice(index, 1);
      this.parent.children.unshift(this);
      this.parent._setChildrenIndices();
      return true;
    }
    return false;
  }
  setZIndex(zIndex) {
    if (!this.parent) {
      Util.warn("Node has no parent. zIndex parameter is ignored.");
      return this;
    }
    if (zIndex < 0 || zIndex >= this.parent.children.length) {
      Util.warn("Unexpected value " + zIndex + " for zIndex property. zIndex is just index of a node in children of its parent. Expected value is from 0 to " + (this.parent.children.length - 1) + ".");
    }
    const index = this.index;
    this.parent.children.splice(index, 1);
    this.parent.children.splice(zIndex, 0, this);
    this.parent._setChildrenIndices();
    return this;
  }
  getAbsoluteOpacity() {
    return this._getCache(ABSOLUTE_OPACITY, this._getAbsoluteOpacity);
  }
  _getAbsoluteOpacity() {
    let absOpacity = this.opacity();
    const parent = this.getParent();
    if (parent && !parent._isUnderCache) {
      absOpacity *= parent.getAbsoluteOpacity();
    }
    return absOpacity;
  }
  moveTo(newContainer) {
    if (this.getParent() !== newContainer) {
      this._remove();
      newContainer.add(this);
    }
    return this;
  }
  toObject() {
    let attrs = this.getAttrs(), key, val, getter, defaultValue, nonPlainObject;
    const obj = {
      attrs: {},
      className: this.getClassName()
    };
    for (key in attrs) {
      val = attrs[key];
      nonPlainObject = Util.isObject(val) && !Util._isPlainObject(val) && !Util._isArray(val);
      if (nonPlainObject) {
        continue;
      }
      getter = typeof this[key] === "function" && this[key];
      delete attrs[key];
      defaultValue = getter ? getter.call(this) : null;
      attrs[key] = val;
      if (defaultValue !== val) {
        obj.attrs[key] = val;
      }
    }
    return Util._prepareToStringify(obj);
  }
  toJSON() {
    return JSON.stringify(this.toObject());
  }
  getParent() {
    return this.parent;
  }
  findAncestors(selector, includeSelf, stopNode) {
    const res = [];
    if (includeSelf && this._isMatch(selector)) {
      res.push(this);
    }
    let ancestor = this.parent;
    while (ancestor) {
      if (ancestor === stopNode) {
        return res;
      }
      if (ancestor._isMatch(selector)) {
        res.push(ancestor);
      }
      ancestor = ancestor.parent;
    }
    return res;
  }
  isAncestorOf(node) {
    return false;
  }
  findAncestor(selector, includeSelf, stopNode) {
    return this.findAncestors(selector, includeSelf, stopNode)[0];
  }
  _isMatch(selector) {
    if (!selector) {
      return false;
    }
    if (typeof selector === "function") {
      return selector(this);
    }
    let selectorArr = selector.replace(/ /g, "").split(","), len = selectorArr.length, n, sel;
    for (n = 0; n < len; n++) {
      sel = selectorArr[n];
      if (!Util.isValidSelector(sel)) {
        Util.warn('Selector "' + sel + '" is invalid. Allowed selectors examples are "#foo", ".bar" or "Group".');
        Util.warn('If you have a custom shape with such className, please change it to start with upper letter like "Triangle".');
        Util.warn("Konva is awesome, right?");
      }
      if (sel.charAt(0) === "#") {
        if (this.id() === sel.slice(1)) {
          return true;
        }
      } else if (sel.charAt(0) === ".") {
        if (this.hasName(sel.slice(1))) {
          return true;
        }
      } else if (this.className === sel || this.nodeType === sel) {
        return true;
      }
    }
    return false;
  }
  getLayer() {
    const parent = this.getParent();
    return parent ? parent.getLayer() : null;
  }
  getStage() {
    return this._getCache(STAGE$1, this._getStage);
  }
  _getStage() {
    const parent = this.getParent();
    if (parent) {
      return parent.getStage();
    } else {
      return null;
    }
  }
  fire(eventType, evt = {}, bubble) {
    evt.target = evt.target || this;
    if (bubble) {
      this._fireAndBubble(eventType, evt);
    } else {
      this._fire(eventType, evt);
    }
    return this;
  }
  getAbsoluteTransform(top) {
    if (top) {
      return this._getAbsoluteTransform(top);
    } else {
      return this._getCache(ABSOLUTE_TRANSFORM, this._getAbsoluteTransform);
    }
  }
  _getAbsoluteTransform(top) {
    let at;
    if (top) {
      at = new Transform();
      this._eachAncestorReverse(function(node) {
        const transformsEnabled = node.transformsEnabled();
        if (transformsEnabled === "all") {
          at.multiply(node.getTransform());
        } else if (transformsEnabled === "position") {
          at.translate(node.x() - node.offsetX(), node.y() - node.offsetY());
        }
      }, top);
      return at;
    } else {
      at = this._cache.get(ABSOLUTE_TRANSFORM) || new Transform();
      if (this.parent) {
        this.parent.getAbsoluteTransform().copyInto(at);
      } else {
        at.reset();
      }
      const transformsEnabled = this.transformsEnabled();
      if (transformsEnabled === "all") {
        at.multiply(this.getTransform());
      } else if (transformsEnabled === "position") {
        const x = this.attrs.x || 0;
        const y = this.attrs.y || 0;
        const offsetX = this.attrs.offsetX || 0;
        const offsetY = this.attrs.offsetY || 0;
        at.translate(x - offsetX, y - offsetY);
      }
      at.dirty = false;
      return at;
    }
  }
  getAbsoluteScale(top) {
    let parent = this;
    while (parent) {
      if (parent._isUnderCache) {
        top = parent;
      }
      parent = parent.getParent();
    }
    const transform = this.getAbsoluteTransform(top);
    const attrs = transform.decompose();
    return {
      x: attrs.scaleX,
      y: attrs.scaleY
    };
  }
  getAbsoluteRotation() {
    return this.getAbsoluteTransform().decompose().rotation;
  }
  getTransform() {
    return this._getCache(TRANSFORM, this._getTransform);
  }
  _getTransform() {
    var _a, _b;
    const m = this._cache.get(TRANSFORM) || new Transform();
    m.reset();
    const x = this.x(), y = this.y(), rotation = Konva$1.getAngle(this.rotation()), scaleX = (_a = this.attrs.scaleX) !== null && _a !== void 0 ? _a : 1, scaleY = (_b = this.attrs.scaleY) !== null && _b !== void 0 ? _b : 1, skewX = this.attrs.skewX || 0, skewY = this.attrs.skewY || 0, offsetX = this.attrs.offsetX || 0, offsetY = this.attrs.offsetY || 0;
    if (x !== 0 || y !== 0) {
      m.translate(x, y);
    }
    if (rotation !== 0) {
      m.rotate(rotation);
    }
    if (skewX !== 0 || skewY !== 0) {
      m.skew(skewX, skewY);
    }
    if (scaleX !== 1 || scaleY !== 1) {
      m.scale(scaleX, scaleY);
    }
    if (offsetX !== 0 || offsetY !== 0) {
      m.translate(-1 * offsetX, -1 * offsetY);
    }
    m.dirty = false;
    return m;
  }
  clone(obj) {
    let attrs = Util.cloneObject(this.attrs), key, allListeners, len, n, listener;
    for (key in obj) {
      attrs[key] = obj[key];
    }
    const node = new this.constructor(attrs);
    for (key in this.eventListeners) {
      allListeners = this.eventListeners[key];
      len = allListeners.length;
      for (n = 0; n < len; n++) {
        listener = allListeners[n];
        if (listener.name.indexOf(KONVA) < 0) {
          if (!node.eventListeners[key]) {
            node.eventListeners[key] = [];
          }
          node.eventListeners[key].push(listener);
        }
      }
    }
    return node;
  }
  _toKonvaCanvas(config) {
    config = config || {};
    const box = this.getClientRect();
    const stage = this.getStage(), x = config.x !== void 0 ? config.x : Math.floor(box.x), y = config.y !== void 0 ? config.y : Math.floor(box.y), pixelRatio = config.pixelRatio || 1, canvas = new SceneCanvas({
      width: config.width || Math.ceil(box.width) || (stage ? stage.width() : 0),
      height: config.height || Math.ceil(box.height) || (stage ? stage.height() : 0),
      pixelRatio
    }), context = canvas.getContext();
    const bufferCanvas = new SceneCanvas({
      width: canvas.width / canvas.pixelRatio + Math.abs(x),
      height: canvas.height / canvas.pixelRatio + Math.abs(y),
      pixelRatio: canvas.pixelRatio
    });
    if (config.imageSmoothingEnabled === false) {
      context._context.imageSmoothingEnabled = false;
    }
    context.save();
    if (x || y) {
      context.translate(-1 * x, -1 * y);
    }
    this.drawScene(canvas, void 0, bufferCanvas);
    context.restore();
    return canvas;
  }
  toCanvas(config) {
    return this._toKonvaCanvas(config)._canvas;
  }
  toDataURL(config) {
    config = config || {};
    const mimeType = config.mimeType || null, quality = config.quality || null;
    const url = this._toKonvaCanvas(config).toDataURL(mimeType, quality);
    if (config.callback) {
      config.callback(url);
    }
    return url;
  }
  toImage(config) {
    return new Promise((resolve2, reject) => {
      try {
        const callback = config === null || config === void 0 ? void 0 : config.callback;
        if (callback)
          delete config.callback;
        Util._urlToImage(this.toDataURL(config), function(img) {
          resolve2(img);
          callback === null || callback === void 0 ? void 0 : callback(img);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  toBlob(config) {
    return new Promise((resolve2, reject) => {
      try {
        const callback = config === null || config === void 0 ? void 0 : config.callback;
        if (callback)
          delete config.callback;
        this.toCanvas(config).toBlob((blob) => {
          resolve2(blob);
          callback === null || callback === void 0 ? void 0 : callback(blob);
        }, config === null || config === void 0 ? void 0 : config.mimeType, config === null || config === void 0 ? void 0 : config.quality);
      } catch (err) {
        reject(err);
      }
    });
  }
  setSize(size) {
    this.width(size.width);
    this.height(size.height);
    return this;
  }
  getSize() {
    return {
      width: this.width(),
      height: this.height()
    };
  }
  getClassName() {
    return this.className || this.nodeType;
  }
  getType() {
    return this.nodeType;
  }
  getDragDistance() {
    if (this.attrs.dragDistance !== void 0) {
      return this.attrs.dragDistance;
    } else if (this.parent) {
      return this.parent.getDragDistance();
    } else {
      return Konva$1.dragDistance;
    }
  }
  _off(type2, name, callback) {
    let evtListeners = this.eventListeners[type2], i, evtName, handler;
    for (i = 0; i < evtListeners.length; i++) {
      evtName = evtListeners[i].name;
      handler = evtListeners[i].handler;
      if ((evtName !== "konva" || name === "konva") && (!name || evtName === name) && (!callback || callback === handler)) {
        evtListeners.splice(i, 1);
        if (evtListeners.length === 0) {
          delete this.eventListeners[type2];
          break;
        }
        i--;
      }
    }
  }
  _fireChangeEvent(attr, oldVal, newVal) {
    this._fire(attr + CHANGE, {
      oldVal,
      newVal
    });
  }
  addName(name) {
    if (!this.hasName(name)) {
      const oldName = this.name();
      const newName = oldName ? oldName + " " + name : name;
      this.name(newName);
    }
    return this;
  }
  hasName(name) {
    if (!name) {
      return false;
    }
    const fullName = this.name();
    if (!fullName) {
      return false;
    }
    const names2 = (fullName || "").split(/\s/g);
    return names2.indexOf(name) !== -1;
  }
  removeName(name) {
    const names2 = (this.name() || "").split(/\s/g);
    const index = names2.indexOf(name);
    if (index !== -1) {
      names2.splice(index, 1);
      this.name(names2.join(" "));
    }
    return this;
  }
  setAttr(attr, val) {
    const func = this[SET + Util._capitalize(attr)];
    if (Util._isFunction(func)) {
      func.call(this, val);
    } else {
      this._setAttr(attr, val);
    }
    return this;
  }
  _requestDraw() {
    if (Konva$1.autoDrawEnabled) {
      const drawNode = this.getLayer() || this.getStage();
      drawNode === null || drawNode === void 0 ? void 0 : drawNode.batchDraw();
    }
  }
  _setAttr(key, val) {
    const oldVal = this.attrs[key];
    if (oldVal === val && !Util.isObject(val)) {
      return;
    }
    if (val === void 0 || val === null) {
      delete this.attrs[key];
    } else {
      this.attrs[key] = val;
    }
    if (this._shouldFireChangeEvents) {
      this._fireChangeEvent(key, oldVal, val);
    }
    this._requestDraw();
  }
  _setComponentAttr(key, component, val) {
    let oldVal;
    if (val !== void 0) {
      oldVal = this.attrs[key];
      if (!oldVal) {
        this.attrs[key] = this.getAttr(key);
      }
      this.attrs[key][component] = val;
      this._fireChangeEvent(key, oldVal, val);
    }
  }
  _fireAndBubble(eventType, evt, compareShape) {
    if (evt && this.nodeType === SHAPE) {
      evt.target = this;
    }
    const nonBubbling = [
      MOUSEENTER$1,
      MOUSELEAVE$1,
      POINTERENTER$1,
      POINTERLEAVE$1,
      TOUCHENTER,
      TOUCHLEAVE
    ];
    const shouldStop = nonBubbling.indexOf(eventType) !== -1 && (compareShape && (this === compareShape || this.isAncestorOf && this.isAncestorOf(compareShape)) || this.nodeType === "Stage" && !compareShape);
    if (!shouldStop) {
      this._fire(eventType, evt);
      const stopBubble = nonBubbling.indexOf(eventType) !== -1 && compareShape && compareShape.isAncestorOf && compareShape.isAncestorOf(this) && !compareShape.isAncestorOf(this.parent);
      if ((evt && !evt.cancelBubble || !evt) && this.parent && this.parent.isListening() && !stopBubble) {
        if (compareShape && compareShape.parent) {
          this._fireAndBubble.call(this.parent, eventType, evt, compareShape);
        } else {
          this._fireAndBubble.call(this.parent, eventType, evt);
        }
      }
    }
  }
  _getProtoListeners(eventType) {
    var _a, _b;
    const { nodeType } = this;
    const allListeners = Node.protoListenerMap.get(nodeType) || {};
    let events = allListeners === null || allListeners === void 0 ? void 0 : allListeners[eventType];
    if (events === void 0) {
      events = [];
      let obj = Object.getPrototypeOf(this);
      while (obj) {
        const hierarchyEvents = (_b = (_a = obj.eventListeners) === null || _a === void 0 ? void 0 : _a[eventType]) !== null && _b !== void 0 ? _b : [];
        events.push(...hierarchyEvents);
        obj = Object.getPrototypeOf(obj);
      }
      allListeners[eventType] = events;
      Node.protoListenerMap.set(nodeType, allListeners);
    }
    return events;
  }
  _fire(eventType, evt) {
    evt = evt || {};
    evt.currentTarget = this;
    evt.type = eventType;
    const topListeners = this._getProtoListeners(eventType);
    if (topListeners) {
      for (let i = 0; i < topListeners.length; i++) {
        topListeners[i].handler.call(this, evt);
      }
    }
    const selfListeners = this.eventListeners[eventType];
    if (selfListeners) {
      for (let i = 0; i < selfListeners.length; i++) {
        selfListeners[i].handler.call(this, evt);
      }
    }
  }
  draw() {
    this.drawScene();
    this.drawHit();
    return this;
  }
  _createDragElement(evt) {
    const pointerId = evt ? evt.pointerId : void 0;
    const stage = this.getStage();
    const ap = this.getAbsolutePosition();
    if (!stage) {
      return;
    }
    const pos = stage._getPointerById(pointerId) || stage._changedPointerPositions[0] || ap;
    DD._dragElements.set(this._id, {
      node: this,
      startPointerPos: pos,
      offset: {
        x: pos.x - ap.x,
        y: pos.y - ap.y
      },
      dragStatus: "ready",
      pointerId
    });
  }
  startDrag(evt, bubbleEvent = true) {
    if (!DD._dragElements.has(this._id)) {
      this._createDragElement(evt);
    }
    const elem = DD._dragElements.get(this._id);
    elem.dragStatus = "dragging";
    this.fire("dragstart", {
      type: "dragstart",
      target: this,
      evt: evt && evt.evt
    }, bubbleEvent);
  }
  _setDragPosition(evt, elem) {
    const pos = this.getStage()._getPointerById(elem.pointerId);
    if (!pos) {
      return;
    }
    let newNodePos = {
      x: pos.x - elem.offset.x,
      y: pos.y - elem.offset.y
    };
    const dbf = this.dragBoundFunc();
    if (dbf !== void 0) {
      const bounded = dbf.call(this, newNodePos, evt);
      if (!bounded) {
        Util.warn("dragBoundFunc did not return any value. That is unexpected behavior. You must return new absolute position from dragBoundFunc.");
      } else {
        newNodePos = bounded;
      }
    }
    if (!this._lastPos || this._lastPos.x !== newNodePos.x || this._lastPos.y !== newNodePos.y) {
      this.setAbsolutePosition(newNodePos);
      this._requestDraw();
    }
    this._lastPos = newNodePos;
  }
  stopDrag(evt) {
    const elem = DD._dragElements.get(this._id);
    if (elem) {
      elem.dragStatus = "stopped";
    }
    DD._endDragBefore(evt);
    DD._endDragAfter(evt);
  }
  setDraggable(draggable) {
    this._setAttr("draggable", draggable);
    this._dragChange();
  }
  isDragging() {
    const elem = DD._dragElements.get(this._id);
    return elem ? elem.dragStatus === "dragging" : false;
  }
  _listenDrag() {
    this._dragCleanup();
    this.on("mousedown.konva touchstart.konva", function(evt) {
      const shouldCheckButton = evt.evt["button"] !== void 0;
      const canDrag = !shouldCheckButton || Konva$1.dragButtons.indexOf(evt.evt["button"]) >= 0;
      if (!canDrag) {
        return;
      }
      if (this.isDragging()) {
        return;
      }
      let hasDraggingChild = false;
      DD._dragElements.forEach((elem) => {
        if (this.isAncestorOf(elem.node)) {
          hasDraggingChild = true;
        }
      });
      if (!hasDraggingChild) {
        this._createDragElement(evt);
      }
    });
  }
  _dragChange() {
    if (this.attrs.draggable) {
      this._listenDrag();
    } else {
      this._dragCleanup();
      const stage = this.getStage();
      if (!stage) {
        return;
      }
      const dragElement = DD._dragElements.get(this._id);
      const isDragging = dragElement && dragElement.dragStatus === "dragging";
      const isReady = dragElement && dragElement.dragStatus === "ready";
      if (isDragging) {
        this.stopDrag();
      } else if (isReady) {
        DD._dragElements.delete(this._id);
      }
    }
  }
  _dragCleanup() {
    this.off("mousedown.konva");
    this.off("touchstart.konva");
  }
  isClientRectOnScreen(margin = { x: 0, y: 0 }) {
    const stage = this.getStage();
    if (!stage) {
      return false;
    }
    const screenRect = {
      x: -margin.x,
      y: -margin.y,
      width: stage.width() + 2 * margin.x,
      height: stage.height() + 2 * margin.y
    };
    return Util.haveIntersection(screenRect, this.getClientRect());
  }
  static create(data, container) {
    if (Util._isString(data)) {
      data = JSON.parse(data);
    }
    return this._createNode(data, container);
  }
  static _createNode(obj, container) {
    let className = Node.prototype.getClassName.call(obj), children = obj.children, no, len, n;
    if (container) {
      obj.attrs.container = container;
    }
    if (!Konva$1[className]) {
      Util.warn('Can not find a node with class name "' + className + '". Fallback to "Shape".');
      className = "Shape";
    }
    const Class = Konva$1[className];
    no = new Class(obj.attrs);
    if (children) {
      len = children.length;
      for (n = 0; n < len; n++) {
        no.add(Node._createNode(children[n]));
      }
    }
    return no;
  }
}
Node.protoListenerMap = /* @__PURE__ */ new Map();
Node.prototype.nodeType = "Node";
Node.prototype._attrsAffectingSize = [];
Node.prototype.eventListeners = {};
Node.prototype.on.call(Node.prototype, TRANSFORM_CHANGE_STR$1, function() {
  if (this._batchingTransformChange) {
    this._needClearTransformCache = true;
    return;
  }
  this._clearCache(TRANSFORM);
  this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
});
Node.prototype.on.call(Node.prototype, "visibleChange.konva", function() {
  this._clearSelfAndDescendantCache(VISIBLE);
});
Node.prototype.on.call(Node.prototype, "listeningChange.konva", function() {
  this._clearSelfAndDescendantCache(LISTENING);
});
Node.prototype.on.call(Node.prototype, "opacityChange.konva", function() {
  this._clearSelfAndDescendantCache(ABSOLUTE_OPACITY);
});
const addGetterSetter = Factory.addGetterSetter;
addGetterSetter(Node, "zIndex");
addGetterSetter(Node, "absolutePosition");
addGetterSetter(Node, "position");
addGetterSetter(Node, "x", 0, getNumberValidator());
addGetterSetter(Node, "y", 0, getNumberValidator());
addGetterSetter(Node, "globalCompositeOperation", "source-over", getStringValidator());
addGetterSetter(Node, "opacity", 1, getNumberValidator());
addGetterSetter(Node, "name", "", getStringValidator());
addGetterSetter(Node, "id", "", getStringValidator());
addGetterSetter(Node, "rotation", 0, getNumberValidator());
Factory.addComponentsGetterSetter(Node, "scale", ["x", "y"]);
addGetterSetter(Node, "scaleX", 1, getNumberValidator());
addGetterSetter(Node, "scaleY", 1, getNumberValidator());
Factory.addComponentsGetterSetter(Node, "skew", ["x", "y"]);
addGetterSetter(Node, "skewX", 0, getNumberValidator());
addGetterSetter(Node, "skewY", 0, getNumberValidator());
Factory.addComponentsGetterSetter(Node, "offset", ["x", "y"]);
addGetterSetter(Node, "offsetX", 0, getNumberValidator());
addGetterSetter(Node, "offsetY", 0, getNumberValidator());
addGetterSetter(Node, "dragDistance", void 0, getNumberValidator());
addGetterSetter(Node, "width", 0, getNumberValidator());
addGetterSetter(Node, "height", 0, getNumberValidator());
addGetterSetter(Node, "listening", true, getBooleanValidator());
addGetterSetter(Node, "preventDefault", true, getBooleanValidator());
addGetterSetter(Node, "filters", void 0, function(val) {
  this._filterUpToDate = false;
  return val;
});
addGetterSetter(Node, "visible", true, getBooleanValidator());
addGetterSetter(Node, "transformsEnabled", "all", getStringValidator());
addGetterSetter(Node, "size");
addGetterSetter(Node, "dragBoundFunc");
addGetterSetter(Node, "draggable", false, getBooleanValidator());
Factory.backCompat(Node, {
  rotateDeg: "rotate",
  setRotationDeg: "setRotation",
  getRotationDeg: "getRotation"
});
class Container extends Node {
  constructor() {
    super(...arguments);
    this.children = [];
  }
  getChildren(filterFunc) {
    const children = this.children || [];
    if (filterFunc) {
      return children.filter(filterFunc);
    }
    return children;
  }
  hasChildren() {
    return this.getChildren().length > 0;
  }
  removeChildren() {
    this.getChildren().forEach((child) => {
      child.parent = null;
      child.index = 0;
      child.remove();
    });
    this.children = [];
    this._requestDraw();
    return this;
  }
  destroyChildren() {
    this.getChildren().forEach((child) => {
      child.parent = null;
      child.index = 0;
      child.destroy();
    });
    this.children = [];
    this._requestDraw();
    return this;
  }
  add(...children) {
    if (children.length === 0) {
      return this;
    }
    if (children.length > 1) {
      for (let i = 0; i < children.length; i++) {
        this.add(children[i]);
      }
      return this;
    }
    const child = children[0];
    if (child.getParent()) {
      child.moveTo(this);
      return this;
    }
    this._validateAdd(child);
    child.index = this.getChildren().length;
    child.parent = this;
    child._clearCaches();
    this.getChildren().push(child);
    this._fire("add", {
      child
    });
    this._requestDraw();
    return this;
  }
  destroy() {
    if (this.hasChildren()) {
      this.destroyChildren();
    }
    super.destroy();
    return this;
  }
  find(selector) {
    return this._generalFind(selector, false);
  }
  findOne(selector) {
    const result = this._generalFind(selector, true);
    return result.length > 0 ? result[0] : void 0;
  }
  _generalFind(selector, findOne) {
    const retArr = [];
    this._descendants((node) => {
      const valid2 = node._isMatch(selector);
      if (valid2) {
        retArr.push(node);
      }
      if (valid2 && findOne) {
        return true;
      }
      return false;
    });
    return retArr;
  }
  _descendants(fn) {
    let shouldStop = false;
    const children = this.getChildren();
    for (const child of children) {
      shouldStop = fn(child);
      if (shouldStop) {
        return true;
      }
      if (!child.hasChildren()) {
        continue;
      }
      shouldStop = child._descendants(fn);
      if (shouldStop) {
        return true;
      }
    }
    return false;
  }
  toObject() {
    const obj = Node.prototype.toObject.call(this);
    obj.children = [];
    this.getChildren().forEach((child) => {
      obj.children.push(child.toObject());
    });
    return obj;
  }
  isAncestorOf(node) {
    let parent = node.getParent();
    while (parent) {
      if (parent._id === this._id) {
        return true;
      }
      parent = parent.getParent();
    }
    return false;
  }
  clone(obj) {
    const node = Node.prototype.clone.call(this, obj);
    this.getChildren().forEach(function(no) {
      node.add(no.clone());
    });
    return node;
  }
  getAllIntersections(pos) {
    const arr = [];
    this.find("Shape").forEach((shape) => {
      if (shape.isVisible() && shape.intersects(pos)) {
        arr.push(shape);
      }
    });
    return arr;
  }
  _clearSelfAndDescendantCache(attr) {
    var _a;
    super._clearSelfAndDescendantCache(attr);
    if (this.isCached()) {
      return;
    }
    (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach(function(node) {
      node._clearSelfAndDescendantCache(attr);
    });
  }
  _setChildrenIndices() {
    var _a;
    (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach(function(child, n) {
      child.index = n;
    });
    this._requestDraw();
  }
  drawScene(can, top, bufferCanvas) {
    const layer = this.getLayer(), canvas = can || layer && layer.getCanvas(), context = canvas && canvas.getContext(), cachedCanvas = this._getCanvasCache(), cachedSceneCanvas = cachedCanvas && cachedCanvas.scene;
    const caching = canvas && canvas.isCache;
    if (!this.isVisible() && !caching) {
      return this;
    }
    if (cachedSceneCanvas) {
      context.save();
      const m = this.getAbsoluteTransform(top).getMatrix();
      context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      this._drawCachedSceneCanvas(context);
      context.restore();
    } else {
      this._drawChildren("drawScene", canvas, top, bufferCanvas);
    }
    return this;
  }
  drawHit(can, top) {
    if (!this.shouldDrawHit(top)) {
      return this;
    }
    const layer = this.getLayer(), canvas = can || layer && layer.hitCanvas, context = canvas && canvas.getContext(), cachedCanvas = this._getCanvasCache(), cachedHitCanvas = cachedCanvas && cachedCanvas.hit;
    if (cachedHitCanvas) {
      context.save();
      const m = this.getAbsoluteTransform(top).getMatrix();
      context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      this._drawCachedHitCanvas(context);
      context.restore();
    } else {
      this._drawChildren("drawHit", canvas, top);
    }
    return this;
  }
  _drawChildren(drawMethod, canvas, top, bufferCanvas) {
    var _a;
    const context = canvas && canvas.getContext(), clipWidth = this.clipWidth(), clipHeight = this.clipHeight(), clipFunc = this.clipFunc(), hasClip = typeof clipWidth === "number" && typeof clipHeight === "number" || clipFunc;
    const selfCache = top === this;
    if (hasClip) {
      context.save();
      const transform = this.getAbsoluteTransform(top);
      let m = transform.getMatrix();
      context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      context.beginPath();
      let clipArgs;
      if (clipFunc) {
        clipArgs = clipFunc.call(this, context, this);
      } else {
        const clipX = this.clipX();
        const clipY = this.clipY();
        context.rect(clipX || 0, clipY || 0, clipWidth, clipHeight);
      }
      context.clip.apply(context, clipArgs);
      m = transform.copy().invert().getMatrix();
      context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    }
    const hasComposition = !selfCache && this.globalCompositeOperation() !== "source-over" && drawMethod === "drawScene";
    if (hasComposition) {
      context.save();
      context._applyGlobalCompositeOperation(this);
    }
    (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach(function(child) {
      child[drawMethod](canvas, top, bufferCanvas);
    });
    if (hasComposition) {
      context.restore();
    }
    if (hasClip) {
      context.restore();
    }
  }
  getClientRect(config = {}) {
    var _a;
    const skipTransform = config.skipTransform;
    const relativeTo = config.relativeTo;
    let minX, minY, maxX, maxY;
    let selfRect = {
      x: Infinity,
      y: Infinity,
      width: 0,
      height: 0
    };
    const that = this;
    (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach(function(child) {
      if (!child.visible()) {
        return;
      }
      const rect = child.getClientRect({
        relativeTo: that,
        skipShadow: config.skipShadow,
        skipStroke: config.skipStroke
      });
      if (rect.width === 0 && rect.height === 0) {
        return;
      }
      if (minX === void 0) {
        minX = rect.x;
        minY = rect.y;
        maxX = rect.x + rect.width;
        maxY = rect.y + rect.height;
      } else {
        minX = Math.min(minX, rect.x);
        minY = Math.min(minY, rect.y);
        maxX = Math.max(maxX, rect.x + rect.width);
        maxY = Math.max(maxY, rect.y + rect.height);
      }
    });
    const shapes2 = this.find("Shape");
    let hasVisible = false;
    for (let i = 0; i < shapes2.length; i++) {
      const shape = shapes2[i];
      if (shape._isVisible(this)) {
        hasVisible = true;
        break;
      }
    }
    if (hasVisible && minX !== void 0) {
      selfRect = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    } else {
      selfRect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }
    if (!skipTransform) {
      return this._transformedRect(selfRect, relativeTo);
    }
    return selfRect;
  }
}
Factory.addComponentsGetterSetter(Container, "clip", [
  "x",
  "y",
  "width",
  "height"
]);
Factory.addGetterSetter(Container, "clipX", void 0, getNumberValidator());
Factory.addGetterSetter(Container, "clipY", void 0, getNumberValidator());
Factory.addGetterSetter(Container, "clipWidth", void 0, getNumberValidator());
Factory.addGetterSetter(Container, "clipHeight", void 0, getNumberValidator());
Factory.addGetterSetter(Container, "clipFunc");
const Captures = /* @__PURE__ */ new Map();
const SUPPORT_POINTER_EVENTS = Konva$1._global["PointerEvent"] !== void 0;
function getCapturedShape(pointerId) {
  return Captures.get(pointerId);
}
function createEvent(evt) {
  return {
    evt,
    pointerId: evt.pointerId
  };
}
function hasPointerCapture(pointerId, shape) {
  return Captures.get(pointerId) === shape;
}
function setPointerCapture(pointerId, shape) {
  releaseCapture(pointerId);
  const stage = shape.getStage();
  if (!stage)
    return;
  Captures.set(pointerId, shape);
  if (SUPPORT_POINTER_EVENTS) {
    shape._fire("gotpointercapture", createEvent(new PointerEvent("gotpointercapture")));
  }
}
function releaseCapture(pointerId, target) {
  const shape = Captures.get(pointerId);
  if (!shape)
    return;
  const stage = shape.getStage();
  if (stage && stage.content) ;
  Captures.delete(pointerId);
  if (SUPPORT_POINTER_EVENTS) {
    shape._fire("lostpointercapture", createEvent(new PointerEvent("lostpointercapture")));
  }
}
const STAGE = "Stage", STRING = "string", PX = "px", MOUSEOUT = "mouseout", MOUSELEAVE = "mouseleave", MOUSEOVER = "mouseover", MOUSEENTER = "mouseenter", MOUSEMOVE = "mousemove", MOUSEDOWN = "mousedown", MOUSEUP = "mouseup", POINTERMOVE = "pointermove", POINTERDOWN = "pointerdown", POINTERUP = "pointerup", POINTERCANCEL = "pointercancel", LOSTPOINTERCAPTURE = "lostpointercapture", POINTEROUT = "pointerout", POINTERLEAVE = "pointerleave", POINTEROVER = "pointerover", POINTERENTER = "pointerenter", CONTEXTMENU = "contextmenu", TOUCHSTART = "touchstart", TOUCHEND = "touchend", TOUCHMOVE = "touchmove", TOUCHCANCEL = "touchcancel", WHEEL = "wheel", MAX_LAYERS_NUMBER = 5, EVENTS = [
  [MOUSEENTER, "_pointerenter"],
  [MOUSEDOWN, "_pointerdown"],
  [MOUSEMOVE, "_pointermove"],
  [MOUSEUP, "_pointerup"],
  [MOUSELEAVE, "_pointerleave"],
  [TOUCHSTART, "_pointerdown"],
  [TOUCHMOVE, "_pointermove"],
  [TOUCHEND, "_pointerup"],
  [TOUCHCANCEL, "_pointercancel"],
  [MOUSEOVER, "_pointerover"],
  [WHEEL, "_wheel"],
  [CONTEXTMENU, "_contextmenu"],
  [POINTERDOWN, "_pointerdown"],
  [POINTERMOVE, "_pointermove"],
  [POINTERUP, "_pointerup"],
  [POINTERCANCEL, "_pointercancel"],
  [POINTERLEAVE, "_pointerleave"],
  [LOSTPOINTERCAPTURE, "_lostpointercapture"]
];
const EVENTS_MAP = {
  mouse: {
    [POINTEROUT]: MOUSEOUT,
    [POINTERLEAVE]: MOUSELEAVE,
    [POINTEROVER]: MOUSEOVER,
    [POINTERENTER]: MOUSEENTER,
    [POINTERMOVE]: MOUSEMOVE,
    [POINTERDOWN]: MOUSEDOWN,
    [POINTERUP]: MOUSEUP,
    [POINTERCANCEL]: "mousecancel",
    pointerclick: "click",
    pointerdblclick: "dblclick"
  },
  touch: {
    [POINTEROUT]: "touchout",
    [POINTERLEAVE]: "touchleave",
    [POINTEROVER]: "touchover",
    [POINTERENTER]: "touchenter",
    [POINTERMOVE]: TOUCHMOVE,
    [POINTERDOWN]: TOUCHSTART,
    [POINTERUP]: TOUCHEND,
    [POINTERCANCEL]: TOUCHCANCEL,
    pointerclick: "tap",
    pointerdblclick: "dbltap"
  },
  pointer: {
    [POINTEROUT]: POINTEROUT,
    [POINTERLEAVE]: POINTERLEAVE,
    [POINTEROVER]: POINTEROVER,
    [POINTERENTER]: POINTERENTER,
    [POINTERMOVE]: POINTERMOVE,
    [POINTERDOWN]: POINTERDOWN,
    [POINTERUP]: POINTERUP,
    [POINTERCANCEL]: POINTERCANCEL,
    pointerclick: "pointerclick",
    pointerdblclick: "pointerdblclick"
  }
};
const getEventType = (type2) => {
  if (type2.indexOf("pointer") >= 0) {
    return "pointer";
  }
  if (type2.indexOf("touch") >= 0) {
    return "touch";
  }
  return "mouse";
};
const getEventsMap = (eventType) => {
  const type2 = getEventType(eventType);
  if (type2 === "pointer") {
    return Konva$1.pointerEventsEnabled && EVENTS_MAP.pointer;
  }
  if (type2 === "touch") {
    return EVENTS_MAP.touch;
  }
  if (type2 === "mouse") {
    return EVENTS_MAP.mouse;
  }
};
function checkNoClip(attrs = {}) {
  if (attrs.clipFunc || attrs.clipWidth || attrs.clipHeight) {
    Util.warn("Stage does not support clipping. Please use clip for Layers or Groups.");
  }
  return attrs;
}
const NO_POINTERS_MESSAGE = `Pointer position is missing and not registered by the stage. Looks like it is outside of the stage container. You can set it manually from event: stage.setPointersPositions(event);`;
const stages = [];
class Stage extends Container {
  constructor(config) {
    super(checkNoClip(config));
    this._pointerPositions = [];
    this._changedPointerPositions = [];
    this._buildDOM();
    this._bindContentEvents();
    stages.push(this);
    this.on("widthChange.konva heightChange.konva", this._resizeDOM);
    this.on("visibleChange.konva", this._checkVisibility);
    this.on("clipWidthChange.konva clipHeightChange.konva clipFuncChange.konva", () => {
      checkNoClip(this.attrs);
    });
    this._checkVisibility();
  }
  _validateAdd(child) {
    const isLayer = child.getType() === "Layer";
    const isFastLayer = child.getType() === "FastLayer";
    const valid2 = isLayer || isFastLayer;
    if (!valid2) {
      Util.throw("You may only add layers to the stage.");
    }
  }
  _checkVisibility() {
    if (!this.content) {
      return;
    }
    const style = this.visible() ? "" : "none";
    this.content.style.display = style;
  }
  setContainer(container) {
    if (typeof container === STRING) {
      let id2;
      if (container.charAt(0) === ".") {
        const className = container.slice(1);
        container = document.getElementsByClassName(className)[0];
      } else {
        if (container.charAt(0) !== "#") {
          id2 = container;
        } else {
          id2 = container.slice(1);
        }
        container = document.getElementById(id2);
      }
      if (!container) {
        throw "Can not find container in document with id " + id2;
      }
    }
    this._setAttr("container", container);
    if (this.content) {
      if (this.content.parentElement) {
        this.content.parentElement.removeChild(this.content);
      }
      container.appendChild(this.content);
    }
    return this;
  }
  shouldDrawHit() {
    return true;
  }
  clear() {
    const layers = this.children, len = layers.length;
    for (let n = 0; n < len; n++) {
      layers[n].clear();
    }
    return this;
  }
  clone(obj) {
    if (!obj) {
      obj = {};
    }
    obj.container = typeof document !== "undefined" && document.createElement("div");
    return Container.prototype.clone.call(this, obj);
  }
  destroy() {
    super.destroy();
    const content = this.content;
    if (content && Util._isInDocument(content)) {
      this.container().removeChild(content);
    }
    const index = stages.indexOf(this);
    if (index > -1) {
      stages.splice(index, 1);
    }
    Util.releaseCanvas(this.bufferCanvas._canvas, this.bufferHitCanvas._canvas);
    return this;
  }
  getPointerPosition() {
    const pos = this._pointerPositions[0] || this._changedPointerPositions[0];
    if (!pos) {
      Util.warn(NO_POINTERS_MESSAGE);
      return null;
    }
    return {
      x: pos.x,
      y: pos.y
    };
  }
  _getPointerById(id2) {
    return this._pointerPositions.find((p) => p.id === id2);
  }
  getPointersPositions() {
    return this._pointerPositions;
  }
  getStage() {
    return this;
  }
  getContent() {
    return this.content;
  }
  _toKonvaCanvas(config) {
    config = { ...config };
    config.x = config.x || 0;
    config.y = config.y || 0;
    config.width = config.width || this.width();
    config.height = config.height || this.height();
    const canvas = new SceneCanvas({
      width: config.width,
      height: config.height,
      pixelRatio: config.pixelRatio || 1
    });
    const _context = canvas.getContext()._context;
    const layers = this.children;
    if (config.x || config.y) {
      _context.translate(-1 * config.x, -1 * config.y);
    }
    layers.forEach(function(layer) {
      if (!layer.isVisible()) {
        return;
      }
      const layerCanvas = layer._toKonvaCanvas(config);
      _context.drawImage(layerCanvas._canvas, config.x, config.y, layerCanvas.getWidth() / layerCanvas.getPixelRatio(), layerCanvas.getHeight() / layerCanvas.getPixelRatio());
    });
    return canvas;
  }
  getIntersection(pos) {
    if (!pos) {
      return null;
    }
    const layers = this.children, len = layers.length, end = len - 1;
    for (let n = end; n >= 0; n--) {
      const shape = layers[n].getIntersection(pos);
      if (shape) {
        return shape;
      }
    }
    return null;
  }
  _resizeDOM() {
    const width = this.width();
    const height = this.height();
    if (this.content) {
      this.content.style.width = width + PX;
      this.content.style.height = height + PX;
    }
    this.bufferCanvas.setSize(width, height);
    this.bufferHitCanvas.setSize(width, height);
    this.children.forEach((layer) => {
      layer.setSize({ width, height });
      layer.draw();
    });
  }
  add(layer, ...rest) {
    if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; i++) {
        this.add(arguments[i]);
      }
      return this;
    }
    super.add(layer);
    const length = this.children.length;
    if (length > MAX_LAYERS_NUMBER) {
      Util.warn("The stage has " + length + " layers. Recommended maximum number of layers is 3-5. Adding more layers into the stage may drop the performance. Rethink your tree structure, you can use Konva.Group.");
    }
    layer.setSize({ width: this.width(), height: this.height() });
    layer.draw();
    if (Konva$1.isBrowser) {
      this.content.appendChild(layer.canvas._canvas);
    }
    return this;
  }
  getParent() {
    return null;
  }
  getLayer() {
    return null;
  }
  hasPointerCapture(pointerId) {
    return hasPointerCapture(pointerId, this);
  }
  setPointerCapture(pointerId) {
    setPointerCapture(pointerId, this);
  }
  releaseCapture(pointerId) {
    releaseCapture(pointerId);
  }
  getLayers() {
    return this.children;
  }
  _bindContentEvents() {
    if (!Konva$1.isBrowser) {
      return;
    }
    EVENTS.forEach(([event, methodName]) => {
      this.content.addEventListener(event, (evt) => {
        this[methodName](evt);
      }, { passive: false });
    });
  }
  _pointerenter(evt) {
    this.setPointersPositions(evt);
    const events = getEventsMap(evt.type);
    if (events) {
      this._fire(events.pointerenter, {
        evt,
        target: this,
        currentTarget: this
      });
    }
  }
  _pointerover(evt) {
    this.setPointersPositions(evt);
    const events = getEventsMap(evt.type);
    if (events) {
      this._fire(events.pointerover, {
        evt,
        target: this,
        currentTarget: this
      });
    }
  }
  _getTargetShape(evenType) {
    let shape = this[evenType + "targetShape"];
    if (shape && !shape.getStage()) {
      shape = null;
    }
    return shape;
  }
  _pointerleave(evt) {
    const events = getEventsMap(evt.type);
    const eventType = getEventType(evt.type);
    if (!events) {
      return;
    }
    this.setPointersPositions(evt);
    const targetShape = this._getTargetShape(eventType);
    const eventsEnabled = !(Konva$1.isDragging() || Konva$1.isTransforming()) || Konva$1.hitOnDragEnabled;
    if (targetShape && eventsEnabled) {
      targetShape._fireAndBubble(events.pointerout, { evt });
      targetShape._fireAndBubble(events.pointerleave, { evt });
      this._fire(events.pointerleave, {
        evt,
        target: this,
        currentTarget: this
      });
      this[eventType + "targetShape"] = null;
    } else if (eventsEnabled) {
      this._fire(events.pointerleave, {
        evt,
        target: this,
        currentTarget: this
      });
      this._fire(events.pointerout, {
        evt,
        target: this,
        currentTarget: this
      });
    }
    this.pointerPos = null;
    this._pointerPositions = [];
  }
  _pointerdown(evt) {
    const events = getEventsMap(evt.type);
    const eventType = getEventType(evt.type);
    if (!events) {
      return;
    }
    this.setPointersPositions(evt);
    let triggeredOnShape = false;
    this._changedPointerPositions.forEach((pos) => {
      const shape = this.getIntersection(pos);
      DD.justDragged = false;
      Konva$1["_" + eventType + "ListenClick"] = true;
      if (!shape || !shape.isListening()) {
        this[eventType + "ClickStartShape"] = void 0;
        return;
      }
      if (Konva$1.capturePointerEventsEnabled) {
        shape.setPointerCapture(pos.id);
      }
      this[eventType + "ClickStartShape"] = shape;
      shape._fireAndBubble(events.pointerdown, {
        evt,
        pointerId: pos.id
      });
      triggeredOnShape = true;
      const isTouch = evt.type.indexOf("touch") >= 0;
      if (shape.preventDefault() && evt.cancelable && isTouch) {
        evt.preventDefault();
      }
    });
    if (!triggeredOnShape) {
      this._fire(events.pointerdown, {
        evt,
        target: this,
        currentTarget: this,
        pointerId: this._pointerPositions[0].id
      });
    }
  }
  _pointermove(evt) {
    const events = getEventsMap(evt.type);
    const eventType = getEventType(evt.type);
    if (!events) {
      return;
    }
    const isTouchPointer = evt.type.indexOf("touch") >= 0 || evt.pointerType === "touch";
    if (Konva$1.isDragging() && DD.node.preventDefault() && evt.cancelable && isTouchPointer) {
      evt.preventDefault();
    }
    this.setPointersPositions(evt);
    const eventsEnabled = !(Konva$1.isDragging() || Konva$1.isTransforming()) || Konva$1.hitOnDragEnabled;
    if (!eventsEnabled) {
      return;
    }
    const processedShapesIds = {};
    let triggeredOnShape = false;
    const targetShape = this._getTargetShape(eventType);
    this._changedPointerPositions.forEach((pos) => {
      const shape = getCapturedShape(pos.id) || this.getIntersection(pos);
      const pointerId = pos.id;
      const event = { evt, pointerId };
      const differentTarget = targetShape !== shape;
      if (differentTarget && targetShape) {
        targetShape._fireAndBubble(events.pointerout, { ...event }, shape);
        targetShape._fireAndBubble(events.pointerleave, { ...event }, shape);
      }
      if (shape) {
        if (processedShapesIds[shape._id]) {
          return;
        }
        processedShapesIds[shape._id] = true;
      }
      if (shape && shape.isListening()) {
        triggeredOnShape = true;
        if (differentTarget) {
          shape._fireAndBubble(events.pointerover, { ...event }, targetShape);
          shape._fireAndBubble(events.pointerenter, { ...event }, targetShape);
          this[eventType + "targetShape"] = shape;
        }
        shape._fireAndBubble(events.pointermove, { ...event });
      } else {
        if (targetShape) {
          this._fire(events.pointerover, {
            evt,
            target: this,
            currentTarget: this,
            pointerId
          });
          this[eventType + "targetShape"] = null;
        }
      }
    });
    if (!triggeredOnShape) {
      this._fire(events.pointermove, {
        evt,
        target: this,
        currentTarget: this,
        pointerId: this._changedPointerPositions[0].id
      });
    }
  }
  _pointerup(evt) {
    const events = getEventsMap(evt.type);
    const eventType = getEventType(evt.type);
    if (!events) {
      return;
    }
    this.setPointersPositions(evt);
    const clickStartShape = this[eventType + "ClickStartShape"];
    const clickEndShape = this[eventType + "ClickEndShape"];
    const processedShapesIds = {};
    let skipPointerUpTrigger = false;
    this._changedPointerPositions.forEach((pos) => {
      const shape = getCapturedShape(pos.id) || this.getIntersection(pos);
      if (shape) {
        shape.releaseCapture(pos.id);
        if (processedShapesIds[shape._id]) {
          return;
        }
        processedShapesIds[shape._id] = true;
      }
      const pointerId = pos.id;
      const event = { evt, pointerId };
      let fireDblClick = false;
      if (Konva$1["_" + eventType + "InDblClickWindow"]) {
        fireDblClick = true;
        clearTimeout(this[eventType + "DblTimeout"]);
      } else if (!DD.justDragged) {
        Konva$1["_" + eventType + "InDblClickWindow"] = true;
        clearTimeout(this[eventType + "DblTimeout"]);
      }
      this[eventType + "DblTimeout"] = setTimeout(function() {
        Konva$1["_" + eventType + "InDblClickWindow"] = false;
      }, Konva$1.dblClickWindow);
      if (shape && shape.isListening()) {
        skipPointerUpTrigger = true;
        this[eventType + "ClickEndShape"] = shape;
        shape._fireAndBubble(events.pointerup, { ...event });
        if (Konva$1["_" + eventType + "ListenClick"] && clickStartShape && clickStartShape === shape) {
          shape._fireAndBubble(events.pointerclick, { ...event });
          if (fireDblClick && clickEndShape && clickEndShape === shape) {
            shape._fireAndBubble(events.pointerdblclick, { ...event });
          }
        }
      } else {
        this[eventType + "ClickEndShape"] = null;
        if (!skipPointerUpTrigger) {
          this._fire(events.pointerup, {
            evt,
            target: this,
            currentTarget: this,
            pointerId: this._changedPointerPositions[0].id
          });
          skipPointerUpTrigger = true;
        }
        if (Konva$1["_" + eventType + "ListenClick"]) {
          this._fire(events.pointerclick, {
            evt,
            target: this,
            currentTarget: this,
            pointerId
          });
        }
        if (fireDblClick) {
          this._fire(events.pointerdblclick, {
            evt,
            target: this,
            currentTarget: this,
            pointerId
          });
        }
      }
    });
    if (!skipPointerUpTrigger) {
      this._fire(events.pointerup, {
        evt,
        target: this,
        currentTarget: this,
        pointerId: this._changedPointerPositions[0].id
      });
    }
    Konva$1["_" + eventType + "ListenClick"] = false;
    if (evt.cancelable && eventType !== "touch" && eventType !== "pointer") {
      evt.preventDefault();
    }
  }
  _contextmenu(evt) {
    this.setPointersPositions(evt);
    const shape = this.getIntersection(this.getPointerPosition());
    if (shape && shape.isListening()) {
      shape._fireAndBubble(CONTEXTMENU, { evt });
    } else {
      this._fire(CONTEXTMENU, {
        evt,
        target: this,
        currentTarget: this
      });
    }
  }
  _wheel(evt) {
    this.setPointersPositions(evt);
    const shape = this.getIntersection(this.getPointerPosition());
    if (shape && shape.isListening()) {
      shape._fireAndBubble(WHEEL, { evt });
    } else {
      this._fire(WHEEL, {
        evt,
        target: this,
        currentTarget: this
      });
    }
  }
  _pointercancel(evt) {
    this.setPointersPositions(evt);
    const shape = getCapturedShape(evt.pointerId) || this.getIntersection(this.getPointerPosition());
    if (shape) {
      shape._fireAndBubble(POINTERUP, createEvent(evt));
    }
    releaseCapture(evt.pointerId);
  }
  _lostpointercapture(evt) {
    releaseCapture(evt.pointerId);
  }
  setPointersPositions(evt) {
    const contentPosition = this._getContentPosition();
    let x = null, y = null;
    evt = evt ? evt : window.event;
    if (evt.touches !== void 0) {
      this._pointerPositions = [];
      this._changedPointerPositions = [];
      Array.prototype.forEach.call(evt.touches, (touch) => {
        this._pointerPositions.push({
          id: touch.identifier,
          x: (touch.clientX - contentPosition.left) / contentPosition.scaleX,
          y: (touch.clientY - contentPosition.top) / contentPosition.scaleY
        });
      });
      Array.prototype.forEach.call(evt.changedTouches || evt.touches, (touch) => {
        this._changedPointerPositions.push({
          id: touch.identifier,
          x: (touch.clientX - contentPosition.left) / contentPosition.scaleX,
          y: (touch.clientY - contentPosition.top) / contentPosition.scaleY
        });
      });
    } else {
      x = (evt.clientX - contentPosition.left) / contentPosition.scaleX;
      y = (evt.clientY - contentPosition.top) / contentPosition.scaleY;
      this.pointerPos = {
        x,
        y
      };
      this._pointerPositions = [{ x, y, id: Util._getFirstPointerId(evt) }];
      this._changedPointerPositions = [
        { x, y, id: Util._getFirstPointerId(evt) }
      ];
    }
  }
  _setPointerPosition(evt) {
    Util.warn('Method _setPointerPosition is deprecated. Use "stage.setPointersPositions(event)" instead.');
    this.setPointersPositions(evt);
  }
  _getContentPosition() {
    if (!this.content || !this.content.getBoundingClientRect) {
      return {
        top: 0,
        left: 0,
        scaleX: 1,
        scaleY: 1
      };
    }
    const rect = this.content.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      scaleX: rect.width / this.content.clientWidth || 1,
      scaleY: rect.height / this.content.clientHeight || 1
    };
  }
  _buildDOM() {
    this.bufferCanvas = new SceneCanvas({
      width: this.width(),
      height: this.height()
    });
    this.bufferHitCanvas = new HitCanvas({
      pixelRatio: 1,
      width: this.width(),
      height: this.height()
    });
    if (!Konva$1.isBrowser) {
      return;
    }
    const container = this.container();
    if (!container) {
      throw "Stage has no container. A container is required.";
    }
    container.innerHTML = "";
    this.content = document.createElement("div");
    this.content.style.position = "relative";
    this.content.style.userSelect = "none";
    this.content.className = "konvajs-content";
    this.content.setAttribute("role", "presentation");
    container.appendChild(this.content);
    this._resizeDOM();
  }
  cache() {
    Util.warn("Cache function is not allowed for stage. You may use cache only for layers, groups and shapes.");
    return this;
  }
  clearCache() {
    return this;
  }
  batchDraw() {
    this.getChildren().forEach(function(layer) {
      layer.batchDraw();
    });
    return this;
  }
}
Stage.prototype.nodeType = STAGE;
_registerNode(Stage);
Factory.addGetterSetter(Stage, "container");
if (Konva$1.isBrowser) {
  document.addEventListener("visibilitychange", () => {
    stages.forEach((stage) => {
      stage.batchDraw();
    });
  });
}
const HAS_SHADOW = "hasShadow";
const SHADOW_RGBA = "shadowRGBA";
const patternImage = "patternImage";
const linearGradient = "linearGradient";
const radialGradient = "radialGradient";
let dummyContext$1;
function getDummyContext$1() {
  if (dummyContext$1) {
    return dummyContext$1;
  }
  dummyContext$1 = Util.createCanvasElement().getContext("2d");
  return dummyContext$1;
}
const shapes = {};
function _fillFunc$2(context) {
  const fillRule = this.attrs.fillRule;
  if (fillRule) {
    context.fill(fillRule);
  } else {
    context.fill();
  }
}
function _strokeFunc$2(context) {
  context.stroke();
}
function _fillFuncHit(context) {
  const fillRule = this.attrs.fillRule;
  if (fillRule) {
    context.fill(fillRule);
  } else {
    context.fill();
  }
}
function _strokeFuncHit(context) {
  context.stroke();
}
function _clearHasShadowCache() {
  this._clearCache(HAS_SHADOW);
}
function _clearGetShadowRGBACache() {
  this._clearCache(SHADOW_RGBA);
}
function _clearFillPatternCache() {
  this._clearCache(patternImage);
}
function _clearLinearGradientCache() {
  this._clearCache(linearGradient);
}
function _clearRadialGradientCache() {
  this._clearCache(radialGradient);
}
class Shape extends Node {
  constructor(config) {
    super(config);
    let key;
    let attempts = 0;
    while (true) {
      key = Util.getHitColor();
      if (key && !(key in shapes)) {
        break;
      }
      attempts++;
      if (attempts >= 1e4) {
        Util.warn("Failed to find a unique color key for a shape. Konva may work incorrectly. Most likely your browser is using canvas farbling. Consider disabling it.");
        key = Util.getRandomColor();
        break;
      }
    }
    this.colorKey = key;
    shapes[key] = this;
  }
  getContext() {
    Util.warn("shape.getContext() method is deprecated. Please do not use it.");
    return this.getLayer().getContext();
  }
  getCanvas() {
    Util.warn("shape.getCanvas() method is deprecated. Please do not use it.");
    return this.getLayer().getCanvas();
  }
  getSceneFunc() {
    return this.attrs.sceneFunc || this["_sceneFunc"];
  }
  getHitFunc() {
    return this.attrs.hitFunc || this["_hitFunc"];
  }
  hasShadow() {
    return this._getCache(HAS_SHADOW, this._hasShadow);
  }
  _hasShadow() {
    return this.shadowEnabled() && this.shadowOpacity() !== 0 && !!(this.shadowColor() || this.shadowBlur() || this.shadowOffsetX() || this.shadowOffsetY());
  }
  _getFillPattern() {
    return this._getCache(patternImage, this.__getFillPattern);
  }
  __getFillPattern() {
    if (this.fillPatternImage()) {
      const ctx = getDummyContext$1();
      const pattern2 = ctx.createPattern(this.fillPatternImage(), this.fillPatternRepeat() || "repeat");
      if (pattern2 && pattern2.setTransform) {
        const tr = new Transform();
        tr.translate(this.fillPatternX(), this.fillPatternY());
        tr.rotate(Konva$1.getAngle(this.fillPatternRotation()));
        tr.scale(this.fillPatternScaleX(), this.fillPatternScaleY());
        tr.translate(-1 * this.fillPatternOffsetX(), -1 * this.fillPatternOffsetY());
        const m = tr.getMatrix();
        const matrix = typeof DOMMatrix === "undefined" ? {
          a: m[0],
          b: m[1],
          c: m[2],
          d: m[3],
          e: m[4],
          f: m[5]
        } : new DOMMatrix(m);
        pattern2.setTransform(matrix);
      }
      return pattern2;
    }
  }
  _getLinearGradient() {
    return this._getCache(linearGradient, this.__getLinearGradient);
  }
  __getLinearGradient() {
    const colorStops = this.fillLinearGradientColorStops();
    if (colorStops) {
      const ctx = getDummyContext$1();
      const start = this.fillLinearGradientStartPoint();
      const end = this.fillLinearGradientEndPoint();
      const grd = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      for (let n = 0; n < colorStops.length; n += 2) {
        grd.addColorStop(colorStops[n], colorStops[n + 1]);
      }
      return grd;
    }
  }
  _getRadialGradient() {
    return this._getCache(radialGradient, this.__getRadialGradient);
  }
  __getRadialGradient() {
    const colorStops = this.fillRadialGradientColorStops();
    if (colorStops) {
      const ctx = getDummyContext$1();
      const start = this.fillRadialGradientStartPoint();
      const end = this.fillRadialGradientEndPoint();
      const grd = ctx.createRadialGradient(start.x, start.y, this.fillRadialGradientStartRadius(), end.x, end.y, this.fillRadialGradientEndRadius());
      for (let n = 0; n < colorStops.length; n += 2) {
        grd.addColorStop(colorStops[n], colorStops[n + 1]);
      }
      return grd;
    }
  }
  getShadowRGBA() {
    return this._getCache(SHADOW_RGBA, this._getShadowRGBA);
  }
  _getShadowRGBA() {
    if (!this.hasShadow()) {
      return;
    }
    const rgba = Util.colorToRGBA(this.shadowColor());
    if (rgba) {
      return "rgba(" + rgba.r + "," + rgba.g + "," + rgba.b + "," + rgba.a * (this.shadowOpacity() || 1) + ")";
    }
  }
  hasFill() {
    return this._calculate("hasFill", [
      "fillEnabled",
      "fill",
      "fillPatternImage",
      "fillLinearGradientColorStops",
      "fillRadialGradientColorStops"
    ], () => {
      return this.fillEnabled() && !!(this.fill() || this.fillPatternImage() || this.fillLinearGradientColorStops() || this.fillRadialGradientColorStops());
    });
  }
  hasStroke() {
    return this._calculate("hasStroke", [
      "strokeEnabled",
      "strokeWidth",
      "stroke",
      "strokeLinearGradientColorStops"
    ], () => {
      return this.strokeEnabled() && this.strokeWidth() && !!(this.stroke() || this.strokeLinearGradientColorStops());
    });
  }
  hasHitStroke() {
    const width = this.hitStrokeWidth();
    if (width === "auto") {
      return this.hasStroke();
    }
    return this.strokeEnabled() && !!width;
  }
  intersects(point) {
    const stage = this.getStage();
    if (!stage) {
      return false;
    }
    const bufferHitCanvas = stage.bufferHitCanvas;
    bufferHitCanvas.getContext().clear();
    this.drawHit(bufferHitCanvas, void 0, true);
    const p = bufferHitCanvas.context.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data;
    return p[3] > 0;
  }
  destroy() {
    Node.prototype.destroy.call(this);
    delete shapes[this.colorKey];
    delete this.colorKey;
    return this;
  }
  _useBufferCanvas(forceFill) {
    var _a;
    const perfectDrawEnabled = (_a = this.attrs.perfectDrawEnabled) !== null && _a !== void 0 ? _a : true;
    if (!perfectDrawEnabled) {
      return false;
    }
    const hasFill = forceFill || this.hasFill();
    const hasStroke = this.hasStroke();
    const isTransparent = this.getAbsoluteOpacity() !== 1;
    if (hasFill && hasStroke && isTransparent) {
      return true;
    }
    const hasShadow = this.hasShadow();
    const strokeForShadow = this.shadowForStrokeEnabled();
    if (hasFill && hasStroke && hasShadow && strokeForShadow) {
      return true;
    }
    return false;
  }
  setStrokeHitEnabled(val) {
    Util.warn("strokeHitEnabled property is deprecated. Please use hitStrokeWidth instead.");
    if (val) {
      this.hitStrokeWidth("auto");
    } else {
      this.hitStrokeWidth(0);
    }
  }
  getStrokeHitEnabled() {
    if (this.hitStrokeWidth() === 0) {
      return false;
    } else {
      return true;
    }
  }
  getSelfRect() {
    const size = this.size();
    return {
      x: this._centroid ? -size.width / 2 : 0,
      y: this._centroid ? -size.height / 2 : 0,
      width: size.width,
      height: size.height
    };
  }
  getClientRect(config = {}) {
    let hasCachedParent = false;
    let parent = this.getParent();
    while (parent) {
      if (parent.isCached()) {
        hasCachedParent = true;
        break;
      }
      parent = parent.getParent();
    }
    const skipTransform = config.skipTransform;
    const relativeTo = config.relativeTo || hasCachedParent && this.getStage() || void 0;
    const fillRect = this.getSelfRect();
    const applyStroke = !config.skipStroke && this.hasStroke();
    const strokeWidth = applyStroke && this.strokeWidth() || 0;
    const fillAndStrokeWidth = fillRect.width + strokeWidth;
    const fillAndStrokeHeight = fillRect.height + strokeWidth;
    const applyShadow = !config.skipShadow && this.hasShadow();
    const shadowOffsetX = applyShadow ? this.shadowOffsetX() : 0;
    const shadowOffsetY = applyShadow ? this.shadowOffsetY() : 0;
    const preWidth = fillAndStrokeWidth + Math.abs(shadowOffsetX);
    const preHeight = fillAndStrokeHeight + Math.abs(shadowOffsetY);
    const blurRadius = applyShadow && this.shadowBlur() || 0;
    const width = preWidth + blurRadius * 2;
    const height = preHeight + blurRadius * 2;
    const rect = {
      width,
      height,
      x: -(strokeWidth / 2 + blurRadius) + Math.min(shadowOffsetX, 0) + fillRect.x,
      y: -(strokeWidth / 2 + blurRadius) + Math.min(shadowOffsetY, 0) + fillRect.y
    };
    if (!skipTransform) {
      return this._transformedRect(rect, relativeTo);
    }
    return rect;
  }
  drawScene(can, top, bufferCanvas) {
    const layer = this.getLayer();
    const canvas = can || layer.getCanvas(), context = canvas.getContext(), cachedCanvas = this._getCanvasCache(), drawFunc = this.getSceneFunc(), hasShadow = this.hasShadow();
    let stage;
    const cachingSelf = top === this;
    if (!this.isVisible() && !cachingSelf) {
      return this;
    }
    if (cachedCanvas) {
      context.save();
      const m = this.getAbsoluteTransform(top).getMatrix();
      context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      this._drawCachedSceneCanvas(context);
      context.restore();
      return this;
    }
    if (!drawFunc) {
      return this;
    }
    context.save();
    if (this._useBufferCanvas() && true) {
      stage = this.getStage();
      const bc = bufferCanvas || stage.bufferCanvas;
      const bufferContext = bc.getContext();
      if (bufferCanvas) {
        bufferContext.save();
        bufferContext.setTransform(1, 0, 0, 1, 0, 0);
        bufferContext.clearRect(0, 0, bc.width, bc.height);
        bufferContext.restore();
      } else {
        bufferContext.clear();
      }
      bufferContext.save();
      bufferContext._applyLineJoin(this);
      bufferContext._applyMiterLimit(this);
      const o = this.getAbsoluteTransform(top).getMatrix();
      bufferContext.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
      drawFunc.call(this, bufferContext, this);
      bufferContext.restore();
      const ratio = bc.pixelRatio;
      if (hasShadow) {
        context._applyShadow(this);
      }
      if (!cachingSelf) {
        context._applyOpacity(this);
        context._applyGlobalCompositeOperation(this);
      }
      context.drawImage(bc._canvas, bc.x || 0, bc.y || 0, bc.width / ratio, bc.height / ratio);
    } else {
      context._applyLineJoin(this);
      context._applyMiterLimit(this);
      if (!cachingSelf) {
        const o = this.getAbsoluteTransform(top).getMatrix();
        context.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
        context._applyOpacity(this);
        context._applyGlobalCompositeOperation(this);
      }
      if (hasShadow) {
        context._applyShadow(this);
      }
      drawFunc.call(this, context, this);
    }
    context.restore();
    return this;
  }
  drawHit(can, top, skipDragCheck = false) {
    if (!this.shouldDrawHit(top, skipDragCheck)) {
      return this;
    }
    const layer = this.getLayer(), canvas = can || layer.hitCanvas, context = canvas && canvas.getContext(), drawFunc = this.hitFunc() || this.sceneFunc(), cachedCanvas = this._getCanvasCache(), cachedHitCanvas = cachedCanvas && cachedCanvas.hit;
    if (!this.colorKey) {
      Util.warn("Looks like your canvas has a destroyed shape in it. Do not reuse shape after you destroyed it. If you want to reuse shape you should call remove() instead of destroy()");
    }
    if (cachedHitCanvas) {
      context.save();
      const m = this.getAbsoluteTransform(top).getMatrix();
      context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      this._drawCachedHitCanvas(context);
      context.restore();
      return this;
    }
    if (!drawFunc) {
      return this;
    }
    context.save();
    context._applyLineJoin(this);
    context._applyMiterLimit(this);
    const selfCache = this === top;
    if (!selfCache) {
      const o = this.getAbsoluteTransform(top).getMatrix();
      context.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
    }
    drawFunc.call(this, context, this);
    context.restore();
    return this;
  }
  drawHitFromCache(alphaThreshold = 0) {
    const cachedCanvas = this._getCanvasCache(), sceneCanvas = this._getCachedSceneCanvas(), hitCanvas = cachedCanvas.hit, hitContext = hitCanvas.getContext(), hitWidth = hitCanvas.getWidth(), hitHeight = hitCanvas.getHeight();
    hitContext.clear();
    hitContext.drawImage(sceneCanvas._canvas, 0, 0, hitWidth, hitHeight);
    try {
      const hitImageData = hitContext.getImageData(0, 0, hitWidth, hitHeight);
      const hitData = hitImageData.data;
      const len = hitData.length;
      const rgbColorKey = Util._hexToRgb(this.colorKey);
      for (let i = 0; i < len; i += 4) {
        const alpha = hitData[i + 3];
        if (alpha > alphaThreshold) {
          hitData[i] = rgbColorKey.r;
          hitData[i + 1] = rgbColorKey.g;
          hitData[i + 2] = rgbColorKey.b;
          hitData[i + 3] = 255;
        } else {
          hitData[i + 3] = 0;
        }
      }
      hitContext.putImageData(hitImageData, 0, 0);
    } catch (e) {
      Util.error("Unable to draw hit graph from cached scene canvas. " + e.message);
    }
    return this;
  }
  hasPointerCapture(pointerId) {
    return hasPointerCapture(pointerId, this);
  }
  setPointerCapture(pointerId) {
    setPointerCapture(pointerId, this);
  }
  releaseCapture(pointerId) {
    releaseCapture(pointerId);
  }
}
Shape.prototype._fillFunc = _fillFunc$2;
Shape.prototype._strokeFunc = _strokeFunc$2;
Shape.prototype._fillFuncHit = _fillFuncHit;
Shape.prototype._strokeFuncHit = _strokeFuncHit;
Shape.prototype._centroid = false;
Shape.prototype.nodeType = "Shape";
_registerNode(Shape);
Shape.prototype.eventListeners = {};
Shape.prototype.on.call(Shape.prototype, "shadowColorChange.konva shadowBlurChange.konva shadowOffsetChange.konva shadowOpacityChange.konva shadowEnabledChange.konva", _clearHasShadowCache);
Shape.prototype.on.call(Shape.prototype, "shadowColorChange.konva shadowOpacityChange.konva shadowEnabledChange.konva", _clearGetShadowRGBACache);
Shape.prototype.on.call(Shape.prototype, "fillPriorityChange.konva fillPatternImageChange.konva fillPatternRepeatChange.konva fillPatternScaleXChange.konva fillPatternScaleYChange.konva fillPatternOffsetXChange.konva fillPatternOffsetYChange.konva fillPatternXChange.konva fillPatternYChange.konva fillPatternRotationChange.konva", _clearFillPatternCache);
Shape.prototype.on.call(Shape.prototype, "fillPriorityChange.konva fillLinearGradientColorStopsChange.konva fillLinearGradientStartPointXChange.konva fillLinearGradientStartPointYChange.konva fillLinearGradientEndPointXChange.konva fillLinearGradientEndPointYChange.konva", _clearLinearGradientCache);
Shape.prototype.on.call(Shape.prototype, "fillPriorityChange.konva fillRadialGradientColorStopsChange.konva fillRadialGradientStartPointXChange.konva fillRadialGradientStartPointYChange.konva fillRadialGradientEndPointXChange.konva fillRadialGradientEndPointYChange.konva fillRadialGradientStartRadiusChange.konva fillRadialGradientEndRadiusChange.konva", _clearRadialGradientCache);
Factory.addGetterSetter(Shape, "stroke", void 0, getStringOrGradientValidator());
Factory.addGetterSetter(Shape, "strokeWidth", 2, getNumberValidator());
Factory.addGetterSetter(Shape, "fillAfterStrokeEnabled", false);
Factory.addGetterSetter(Shape, "hitStrokeWidth", "auto", getNumberOrAutoValidator());
Factory.addGetterSetter(Shape, "strokeHitEnabled", true, getBooleanValidator());
Factory.addGetterSetter(Shape, "perfectDrawEnabled", true, getBooleanValidator());
Factory.addGetterSetter(Shape, "shadowForStrokeEnabled", true, getBooleanValidator());
Factory.addGetterSetter(Shape, "lineJoin");
Factory.addGetterSetter(Shape, "lineCap");
Factory.addGetterSetter(Shape, "miterLimit");
Factory.addGetterSetter(Shape, "sceneFunc");
Factory.addGetterSetter(Shape, "hitFunc");
Factory.addGetterSetter(Shape, "dash");
Factory.addGetterSetter(Shape, "dashOffset", 0, getNumberValidator());
Factory.addGetterSetter(Shape, "shadowColor", void 0, getStringValidator());
Factory.addGetterSetter(Shape, "shadowBlur", 0, getNumberValidator());
Factory.addGetterSetter(Shape, "shadowOpacity", 1, getNumberValidator());
Factory.addComponentsGetterSetter(Shape, "shadowOffset", ["x", "y"]);
Factory.addGetterSetter(Shape, "shadowOffsetX", 0, getNumberValidator());
Factory.addGetterSetter(Shape, "shadowOffsetY", 0, getNumberValidator());
Factory.addGetterSetter(Shape, "fillPatternImage");
Factory.addGetterSetter(Shape, "fill", void 0, getStringOrGradientValidator());
Factory.addGetterSetter(Shape, "fillPatternX", 0, getNumberValidator());
Factory.addGetterSetter(Shape, "fillPatternY", 0, getNumberValidator());
Factory.addGetterSetter(Shape, "fillLinearGradientColorStops");
Factory.addGetterSetter(Shape, "strokeLinearGradientColorStops");
Factory.addGetterSetter(Shape, "fillRadialGradientStartRadius", 0);
Factory.addGetterSetter(Shape, "fillRadialGradientEndRadius", 0);
Factory.addGetterSetter(Shape, "fillRadialGradientColorStops");
Factory.addGetterSetter(Shape, "fillPatternRepeat", "repeat");
Factory.addGetterSetter(Shape, "fillEnabled", true);
Factory.addGetterSetter(Shape, "strokeEnabled", true);
Factory.addGetterSetter(Shape, "shadowEnabled", true);
Factory.addGetterSetter(Shape, "dashEnabled", true);
Factory.addGetterSetter(Shape, "strokeScaleEnabled", true);
Factory.addGetterSetter(Shape, "fillPriority", "color");
Factory.addComponentsGetterSetter(Shape, "fillPatternOffset", ["x", "y"]);
Factory.addGetterSetter(Shape, "fillPatternOffsetX", 0, getNumberValidator());
Factory.addGetterSetter(Shape, "fillPatternOffsetY", 0, getNumberValidator());
Factory.addComponentsGetterSetter(Shape, "fillPatternScale", ["x", "y"]);
Factory.addGetterSetter(Shape, "fillPatternScaleX", 1, getNumberValidator());
Factory.addGetterSetter(Shape, "fillPatternScaleY", 1, getNumberValidator());
Factory.addComponentsGetterSetter(Shape, "fillLinearGradientStartPoint", [
  "x",
  "y"
]);
Factory.addComponentsGetterSetter(Shape, "strokeLinearGradientStartPoint", [
  "x",
  "y"
]);
Factory.addGetterSetter(Shape, "fillLinearGradientStartPointX", 0);
Factory.addGetterSetter(Shape, "strokeLinearGradientStartPointX", 0);
Factory.addGetterSetter(Shape, "fillLinearGradientStartPointY", 0);
Factory.addGetterSetter(Shape, "strokeLinearGradientStartPointY", 0);
Factory.addComponentsGetterSetter(Shape, "fillLinearGradientEndPoint", [
  "x",
  "y"
]);
Factory.addComponentsGetterSetter(Shape, "strokeLinearGradientEndPoint", [
  "x",
  "y"
]);
Factory.addGetterSetter(Shape, "fillLinearGradientEndPointX", 0);
Factory.addGetterSetter(Shape, "strokeLinearGradientEndPointX", 0);
Factory.addGetterSetter(Shape, "fillLinearGradientEndPointY", 0);
Factory.addGetterSetter(Shape, "strokeLinearGradientEndPointY", 0);
Factory.addComponentsGetterSetter(Shape, "fillRadialGradientStartPoint", [
  "x",
  "y"
]);
Factory.addGetterSetter(Shape, "fillRadialGradientStartPointX", 0);
Factory.addGetterSetter(Shape, "fillRadialGradientStartPointY", 0);
Factory.addComponentsGetterSetter(Shape, "fillRadialGradientEndPoint", [
  "x",
  "y"
]);
Factory.addGetterSetter(Shape, "fillRadialGradientEndPointX", 0);
Factory.addGetterSetter(Shape, "fillRadialGradientEndPointY", 0);
Factory.addGetterSetter(Shape, "fillPatternRotation", 0);
Factory.addGetterSetter(Shape, "fillRule", void 0, getStringValidator());
Factory.backCompat(Shape, {
  dashArray: "dash",
  getDashArray: "getDash",
  setDashArray: "getDash",
  drawFunc: "sceneFunc",
  getDrawFunc: "getSceneFunc",
  setDrawFunc: "setSceneFunc",
  drawHitFunc: "hitFunc",
  getDrawHitFunc: "getHitFunc",
  setDrawHitFunc: "setHitFunc"
});
const BEFORE_DRAW = "beforeDraw", DRAW = "draw", INTERSECTION_OFFSETS = [
  { x: 0, y: 0 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 }
], INTERSECTION_OFFSETS_LEN = INTERSECTION_OFFSETS.length;
class Layer extends Container {
  constructor(config) {
    super(config);
    this.canvas = new SceneCanvas();
    this.hitCanvas = new HitCanvas({
      pixelRatio: 1
    });
    this._waitingForDraw = false;
    this.on("visibleChange.konva", this._checkVisibility);
    this._checkVisibility();
    this.on("imageSmoothingEnabledChange.konva", this._setSmoothEnabled);
    this._setSmoothEnabled();
  }
  createPNGStream() {
    const c = this.canvas._canvas;
    return c.createPNGStream();
  }
  getCanvas() {
    return this.canvas;
  }
  getNativeCanvasElement() {
    return this.canvas._canvas;
  }
  getHitCanvas() {
    return this.hitCanvas;
  }
  getContext() {
    return this.getCanvas().getContext();
  }
  clear(bounds) {
    this.getContext().clear(bounds);
    this.getHitCanvas().getContext().clear(bounds);
    return this;
  }
  setZIndex(index) {
    super.setZIndex(index);
    const stage = this.getStage();
    if (stage && stage.content) {
      stage.content.removeChild(this.getNativeCanvasElement());
      if (index < stage.children.length - 1) {
        stage.content.insertBefore(this.getNativeCanvasElement(), stage.children[index + 1].getCanvas()._canvas);
      } else {
        stage.content.appendChild(this.getNativeCanvasElement());
      }
    }
    return this;
  }
  moveToTop() {
    Node.prototype.moveToTop.call(this);
    const stage = this.getStage();
    if (stage && stage.content) {
      stage.content.removeChild(this.getNativeCanvasElement());
      stage.content.appendChild(this.getNativeCanvasElement());
    }
    return true;
  }
  moveUp() {
    const moved = Node.prototype.moveUp.call(this);
    if (!moved) {
      return false;
    }
    const stage = this.getStage();
    if (!stage || !stage.content) {
      return false;
    }
    stage.content.removeChild(this.getNativeCanvasElement());
    if (this.index < stage.children.length - 1) {
      stage.content.insertBefore(this.getNativeCanvasElement(), stage.children[this.index + 1].getCanvas()._canvas);
    } else {
      stage.content.appendChild(this.getNativeCanvasElement());
    }
    return true;
  }
  moveDown() {
    if (Node.prototype.moveDown.call(this)) {
      const stage = this.getStage();
      if (stage) {
        const children = stage.children;
        if (stage.content) {
          stage.content.removeChild(this.getNativeCanvasElement());
          stage.content.insertBefore(this.getNativeCanvasElement(), children[this.index + 1].getCanvas()._canvas);
        }
      }
      return true;
    }
    return false;
  }
  moveToBottom() {
    if (Node.prototype.moveToBottom.call(this)) {
      const stage = this.getStage();
      if (stage) {
        const children = stage.children;
        if (stage.content) {
          stage.content.removeChild(this.getNativeCanvasElement());
          stage.content.insertBefore(this.getNativeCanvasElement(), children[1].getCanvas()._canvas);
        }
      }
      return true;
    }
    return false;
  }
  getLayer() {
    return this;
  }
  remove() {
    const _canvas = this.getNativeCanvasElement();
    Node.prototype.remove.call(this);
    if (_canvas && _canvas.parentNode && Util._isInDocument(_canvas)) {
      _canvas.parentNode.removeChild(_canvas);
    }
    return this;
  }
  getStage() {
    return this.parent;
  }
  setSize({ width, height }) {
    this.canvas.setSize(width, height);
    this.hitCanvas.setSize(width, height);
    this._setSmoothEnabled();
    return this;
  }
  _validateAdd(child) {
    const type2 = child.getType();
    if (type2 !== "Group" && type2 !== "Shape") {
      Util.throw("You may only add groups and shapes to a layer.");
    }
  }
  _toKonvaCanvas(config) {
    config = { ...config };
    config.width = config.width || this.getWidth();
    config.height = config.height || this.getHeight();
    config.x = config.x !== void 0 ? config.x : this.x();
    config.y = config.y !== void 0 ? config.y : this.y();
    return Node.prototype._toKonvaCanvas.call(this, config);
  }
  _checkVisibility() {
    const visible = this.visible();
    if (visible) {
      this.canvas._canvas.style.display = "block";
    } else {
      this.canvas._canvas.style.display = "none";
    }
  }
  _setSmoothEnabled() {
    this.getContext()._context.imageSmoothingEnabled = this.imageSmoothingEnabled();
  }
  getWidth() {
    if (this.parent) {
      return this.parent.width();
    }
  }
  setWidth() {
    Util.warn('Can not change width of layer. Use "stage.width(value)" function instead.');
  }
  getHeight() {
    if (this.parent) {
      return this.parent.height();
    }
  }
  setHeight() {
    Util.warn('Can not change height of layer. Use "stage.height(value)" function instead.');
  }
  batchDraw() {
    if (!this._waitingForDraw) {
      this._waitingForDraw = true;
      Util.requestAnimFrame(() => {
        this.draw();
        this._waitingForDraw = false;
      });
    }
    return this;
  }
  getIntersection(pos) {
    if (!this.isListening() || !this.isVisible()) {
      return null;
    }
    let spiralSearchDistance = 1;
    let continueSearch = false;
    while (true) {
      for (let i = 0; i < INTERSECTION_OFFSETS_LEN; i++) {
        const intersectionOffset = INTERSECTION_OFFSETS[i];
        const obj = this._getIntersection({
          x: pos.x + intersectionOffset.x * spiralSearchDistance,
          y: pos.y + intersectionOffset.y * spiralSearchDistance
        });
        const shape = obj.shape;
        if (shape) {
          return shape;
        }
        continueSearch = !!obj.antialiased;
        if (!obj.antialiased) {
          break;
        }
      }
      if (continueSearch) {
        spiralSearchDistance += 1;
      } else {
        return null;
      }
    }
  }
  _getIntersection(pos) {
    const ratio = this.hitCanvas.pixelRatio;
    const p = this.hitCanvas.context.getImageData(Math.round(pos.x * ratio), Math.round(pos.y * ratio), 1, 1).data;
    const p3 = p[3];
    if (p3 === 255) {
      const colorKey = Util.getHitColorKey(p[0], p[1], p[2]);
      const shape = shapes[colorKey];
      if (shape) {
        return {
          shape
        };
      }
      return {
        antialiased: true
      };
    } else if (p3 > 0) {
      return {
        antialiased: true
      };
    }
    return {};
  }
  drawScene(can, top, bufferCanvas) {
    const layer = this.getLayer(), canvas = can || layer && layer.getCanvas();
    this._fire(BEFORE_DRAW, {
      node: this
    });
    if (this.clearBeforeDraw()) {
      canvas.getContext().clear();
    }
    Container.prototype.drawScene.call(this, canvas, top, bufferCanvas);
    this._fire(DRAW, {
      node: this
    });
    return this;
  }
  drawHit(can, top) {
    const layer = this.getLayer(), canvas = can || layer && layer.hitCanvas;
    if (layer && layer.clearBeforeDraw()) {
      layer.getHitCanvas().getContext().clear();
    }
    Container.prototype.drawHit.call(this, canvas, top);
    return this;
  }
  enableHitGraph() {
    this.hitGraphEnabled(true);
    return this;
  }
  disableHitGraph() {
    this.hitGraphEnabled(false);
    return this;
  }
  setHitGraphEnabled(val) {
    Util.warn("hitGraphEnabled method is deprecated. Please use layer.listening() instead.");
    this.listening(val);
  }
  getHitGraphEnabled(val) {
    Util.warn("hitGraphEnabled method is deprecated. Please use layer.listening() instead.");
    return this.listening();
  }
  toggleHitCanvas() {
    if (!this.parent || !this.parent["content"]) {
      return;
    }
    const parent = this.parent;
    const added = !!this.hitCanvas._canvas.parentNode;
    if (added) {
      parent.content.removeChild(this.hitCanvas._canvas);
    } else {
      parent.content.appendChild(this.hitCanvas._canvas);
    }
  }
  destroy() {
    Util.releaseCanvas(this.getNativeCanvasElement(), this.getHitCanvas()._canvas);
    return super.destroy();
  }
}
Layer.prototype.nodeType = "Layer";
_registerNode(Layer);
Factory.addGetterSetter(Layer, "imageSmoothingEnabled", true);
Factory.addGetterSetter(Layer, "clearBeforeDraw", true);
Factory.addGetterSetter(Layer, "hitGraphEnabled", true, getBooleanValidator());
class FastLayer extends Layer {
  constructor(attrs) {
    super(attrs);
    this.listening(false);
    Util.warn('Konva.Fast layer is deprecated. Please use "new Konva.Layer({ listening: false })" instead.');
  }
}
FastLayer.prototype.nodeType = "FastLayer";
_registerNode(FastLayer);
class Group extends Container {
  _validateAdd(child) {
    const type2 = child.getType();
    if (type2 !== "Group" && type2 !== "Shape") {
      Util.throw("You may only add groups and shapes to groups.");
    }
  }
}
Group.prototype.nodeType = "Group";
_registerNode(Group);
const now = function() {
  if (glob.performance && glob.performance.now) {
    return function() {
      return glob.performance.now();
    };
  }
  return function() {
    return (/* @__PURE__ */ new Date()).getTime();
  };
}();
class Animation {
  constructor(func, layers) {
    this.id = Animation.animIdCounter++;
    this.frame = {
      time: 0,
      timeDiff: 0,
      lastTime: now(),
      frameRate: 0
    };
    this.func = func;
    this.setLayers(layers);
  }
  setLayers(layers) {
    let lays = [];
    if (layers) {
      lays = Array.isArray(layers) ? layers : [layers];
    }
    this.layers = lays;
    return this;
  }
  getLayers() {
    return this.layers;
  }
  addLayer(layer) {
    const layers = this.layers;
    const len = layers.length;
    for (let n = 0; n < len; n++) {
      if (layers[n]._id === layer._id) {
        return false;
      }
    }
    this.layers.push(layer);
    return true;
  }
  isRunning() {
    const a = Animation;
    const animations = a.animations;
    const len = animations.length;
    for (let n = 0; n < len; n++) {
      if (animations[n].id === this.id) {
        return true;
      }
    }
    return false;
  }
  start() {
    this.stop();
    this.frame.timeDiff = 0;
    this.frame.lastTime = now();
    Animation._addAnimation(this);
    return this;
  }
  stop() {
    Animation._removeAnimation(this);
    return this;
  }
  _updateFrameObject(time) {
    this.frame.timeDiff = time - this.frame.lastTime;
    this.frame.lastTime = time;
    this.frame.time += this.frame.timeDiff;
    this.frame.frameRate = 1e3 / this.frame.timeDiff;
  }
  static _addAnimation(anim) {
    this.animations.push(anim);
    this._handleAnimation();
  }
  static _removeAnimation(anim) {
    const id2 = anim.id;
    const animations = this.animations;
    const len = animations.length;
    for (let n = 0; n < len; n++) {
      if (animations[n].id === id2) {
        this.animations.splice(n, 1);
        break;
      }
    }
  }
  static _runFrames() {
    const layerHash = {};
    const animations = this.animations;
    for (let n = 0; n < animations.length; n++) {
      const anim = animations[n];
      const layers = anim.layers;
      const func = anim.func;
      anim._updateFrameObject(now());
      const layersLen = layers.length;
      let needRedraw;
      if (func) {
        needRedraw = func.call(anim, anim.frame) !== false;
      } else {
        needRedraw = true;
      }
      if (!needRedraw) {
        continue;
      }
      for (let i = 0; i < layersLen; i++) {
        const layer = layers[i];
        if (layer._id !== void 0) {
          layerHash[layer._id] = layer;
        }
      }
    }
    for (const key in layerHash) {
      if (!layerHash.hasOwnProperty(key)) {
        continue;
      }
      layerHash[key].batchDraw();
    }
  }
  static _animationLoop() {
    const Anim = Animation;
    if (Anim.animations.length) {
      Anim._runFrames();
      Util.requestAnimFrame(Anim._animationLoop);
    } else {
      Anim.animRunning = false;
    }
  }
  static _handleAnimation() {
    if (!this.animRunning) {
      this.animRunning = true;
      Util.requestAnimFrame(this._animationLoop);
    }
  }
}
Animation.animations = [];
Animation.animIdCounter = 0;
Animation.animRunning = false;
const blacklist = {
  node: 1,
  duration: 1,
  easing: 1,
  onFinish: 1,
  yoyo: 1
}, PAUSED = 1, PLAYING = 2, REVERSING = 3, colorAttrs = ["fill", "stroke", "shadowColor"];
let idCounter = 0;
class TweenEngine {
  constructor(prop, propFunc, func, begin, finish, duration, yoyo) {
    this.prop = prop;
    this.propFunc = propFunc;
    this.begin = begin;
    this._pos = begin;
    this.duration = duration;
    this._change = 0;
    this.prevPos = 0;
    this.yoyo = yoyo;
    this._time = 0;
    this._position = 0;
    this._startTime = 0;
    this._finish = 0;
    this.func = func;
    this._change = finish - this.begin;
    this.pause();
  }
  fire(str) {
    const handler = this[str];
    if (handler) {
      handler();
    }
  }
  setTime(t2) {
    if (t2 > this.duration) {
      if (this.yoyo) {
        this._time = this.duration;
        this.reverse();
      } else {
        this.finish();
      }
    } else if (t2 < 0) {
      if (this.yoyo) {
        this._time = 0;
        this.play();
      } else {
        this.reset();
      }
    } else {
      this._time = t2;
      this.update();
    }
  }
  getTime() {
    return this._time;
  }
  setPosition(p) {
    this.prevPos = this._pos;
    this.propFunc(p);
    this._pos = p;
  }
  getPosition(t2) {
    if (t2 === void 0) {
      t2 = this._time;
    }
    return this.func(t2, this.begin, this._change, this.duration);
  }
  play() {
    this.state = PLAYING;
    this._startTime = this.getTimer() - this._time;
    this.onEnterFrame();
    this.fire("onPlay");
  }
  reverse() {
    this.state = REVERSING;
    this._time = this.duration - this._time;
    this._startTime = this.getTimer() - this._time;
    this.onEnterFrame();
    this.fire("onReverse");
  }
  seek(t2) {
    this.pause();
    this._time = t2;
    this.update();
    this.fire("onSeek");
  }
  reset() {
    this.pause();
    this._time = 0;
    this.update();
    this.fire("onReset");
  }
  finish() {
    this.pause();
    this._time = this.duration;
    this.update();
    this.fire("onFinish");
  }
  update() {
    this.setPosition(this.getPosition(this._time));
    this.fire("onUpdate");
  }
  onEnterFrame() {
    const t2 = this.getTimer() - this._startTime;
    if (this.state === PLAYING) {
      this.setTime(t2);
    } else if (this.state === REVERSING) {
      this.setTime(this.duration - t2);
    }
  }
  pause() {
    this.state = PAUSED;
    this.fire("onPause");
  }
  getTimer() {
    return (/* @__PURE__ */ new Date()).getTime();
  }
}
class Tween {
  constructor(config) {
    const that = this, node = config.node, nodeId = node._id, easing = config.easing || Easings.Linear, yoyo = !!config.yoyo;
    let duration, key;
    if (typeof config.duration === "undefined") {
      duration = 0.3;
    } else if (config.duration === 0) {
      duration = 1e-3;
    } else {
      duration = config.duration;
    }
    this.node = node;
    this._id = idCounter++;
    const layers = node.getLayer() || (node instanceof Konva$1["Stage"] ? node.getLayers() : null);
    if (!layers) {
      Util.error("Tween constructor have `node` that is not in a layer. Please add node into layer first.");
    }
    this.anim = new Animation(function() {
      that.tween.onEnterFrame();
    }, layers);
    this.tween = new TweenEngine(key, function(i) {
      that._tweenFunc(i);
    }, easing, 0, 1, duration * 1e3, yoyo);
    this._addListeners();
    if (!Tween.attrs[nodeId]) {
      Tween.attrs[nodeId] = {};
    }
    if (!Tween.attrs[nodeId][this._id]) {
      Tween.attrs[nodeId][this._id] = {};
    }
    if (!Tween.tweens[nodeId]) {
      Tween.tweens[nodeId] = {};
    }
    for (key in config) {
      if (blacklist[key] === void 0) {
        this._addAttr(key, config[key]);
      }
    }
    this.reset();
    this.onFinish = config.onFinish;
    this.onReset = config.onReset;
    this.onUpdate = config.onUpdate;
  }
  _addAttr(key, end) {
    const node = this.node, nodeId = node._id;
    let diff2, len, trueEnd, trueStart, endRGBA;
    const tweenId = Tween.tweens[nodeId][key];
    if (tweenId) {
      delete Tween.attrs[nodeId][tweenId][key];
    }
    let start = node.getAttr(key);
    if (Util._isArray(end)) {
      diff2 = [];
      len = Math.max(end.length, start.length);
      if (key === "points" && end.length !== start.length) {
        if (end.length > start.length) {
          trueStart = start;
          start = Util._prepareArrayForTween(start, end, node.closed());
        } else {
          trueEnd = end;
          end = Util._prepareArrayForTween(end, start, node.closed());
        }
      }
      if (key.indexOf("fill") === 0) {
        for (let n = 0; n < len; n++) {
          if (n % 2 === 0) {
            diff2.push(end[n] - start[n]);
          } else {
            const startRGBA = Util.colorToRGBA(start[n]);
            endRGBA = Util.colorToRGBA(end[n]);
            start[n] = startRGBA;
            diff2.push({
              r: endRGBA.r - startRGBA.r,
              g: endRGBA.g - startRGBA.g,
              b: endRGBA.b - startRGBA.b,
              a: endRGBA.a - startRGBA.a
            });
          }
        }
      } else {
        for (let n = 0; n < len; n++) {
          diff2.push(end[n] - start[n]);
        }
      }
    } else if (colorAttrs.indexOf(key) !== -1) {
      start = Util.colorToRGBA(start);
      endRGBA = Util.colorToRGBA(end);
      diff2 = {
        r: endRGBA.r - start.r,
        g: endRGBA.g - start.g,
        b: endRGBA.b - start.b,
        a: endRGBA.a - start.a
      };
    } else {
      diff2 = end - start;
    }
    Tween.attrs[nodeId][this._id][key] = {
      start,
      diff: diff2,
      end,
      trueEnd,
      trueStart
    };
    Tween.tweens[nodeId][key] = this._id;
  }
  _tweenFunc(i) {
    const node = this.node, attrs = Tween.attrs[node._id][this._id];
    let key, attr, start, diff2, newVal, n, len, end;
    for (key in attrs) {
      attr = attrs[key];
      start = attr.start;
      diff2 = attr.diff;
      end = attr.end;
      if (Util._isArray(start)) {
        newVal = [];
        len = Math.max(start.length, end.length);
        if (key.indexOf("fill") === 0) {
          for (n = 0; n < len; n++) {
            if (n % 2 === 0) {
              newVal.push((start[n] || 0) + diff2[n] * i);
            } else {
              newVal.push("rgba(" + Math.round(start[n].r + diff2[n].r * i) + "," + Math.round(start[n].g + diff2[n].g * i) + "," + Math.round(start[n].b + diff2[n].b * i) + "," + (start[n].a + diff2[n].a * i) + ")");
            }
          }
        } else {
          for (n = 0; n < len; n++) {
            newVal.push((start[n] || 0) + diff2[n] * i);
          }
        }
      } else if (colorAttrs.indexOf(key) !== -1) {
        newVal = "rgba(" + Math.round(start.r + diff2.r * i) + "," + Math.round(start.g + diff2.g * i) + "," + Math.round(start.b + diff2.b * i) + "," + (start.a + diff2.a * i) + ")";
      } else {
        newVal = start + diff2 * i;
      }
      node.setAttr(key, newVal);
    }
  }
  _addListeners() {
    this.tween.onPlay = () => {
      this.anim.start();
    };
    this.tween.onReverse = () => {
      this.anim.start();
    };
    this.tween.onPause = () => {
      this.anim.stop();
    };
    this.tween.onFinish = () => {
      const node = this.node;
      const attrs = Tween.attrs[node._id][this._id];
      if (attrs.points && attrs.points.trueEnd) {
        node.setAttr("points", attrs.points.trueEnd);
      }
      if (this.onFinish) {
        this.onFinish.call(this);
      }
    };
    this.tween.onReset = () => {
      const node = this.node;
      const attrs = Tween.attrs[node._id][this._id];
      if (attrs.points && attrs.points.trueStart) {
        node.points(attrs.points.trueStart);
      }
      if (this.onReset) {
        this.onReset();
      }
    };
    this.tween.onUpdate = () => {
      if (this.onUpdate) {
        this.onUpdate.call(this);
      }
    };
  }
  play() {
    this.tween.play();
    return this;
  }
  reverse() {
    this.tween.reverse();
    return this;
  }
  reset() {
    this.tween.reset();
    return this;
  }
  seek(t2) {
    this.tween.seek(t2 * 1e3);
    return this;
  }
  pause() {
    this.tween.pause();
    return this;
  }
  finish() {
    this.tween.finish();
    return this;
  }
  destroy() {
    const nodeId = this.node._id, thisId = this._id, attrs = Tween.tweens[nodeId];
    this.pause();
    if (this.anim) {
      this.anim.stop();
    }
    for (const key in attrs) {
      delete Tween.tweens[nodeId][key];
    }
    delete Tween.attrs[nodeId][thisId];
    if (Tween.tweens[nodeId]) {
      if (Object.keys(Tween.tweens[nodeId]).length === 0) {
        delete Tween.tweens[nodeId];
      }
      if (Object.keys(Tween.attrs[nodeId]).length === 0) {
        delete Tween.attrs[nodeId];
      }
    }
  }
}
Tween.attrs = {};
Tween.tweens = {};
Node.prototype.to = function(params) {
  const onFinish = params.onFinish;
  params.node = this;
  params.onFinish = function() {
    this.destroy();
    if (onFinish) {
      onFinish();
    }
  };
  const tween = new Tween(params);
  tween.play();
};
const Easings = {
  BackEaseIn(t2, b, c, d) {
    const s = 1.70158;
    return c * (t2 /= d) * t2 * ((s + 1) * t2 - s) + b;
  },
  BackEaseOut(t2, b, c, d) {
    const s = 1.70158;
    return c * ((t2 = t2 / d - 1) * t2 * ((s + 1) * t2 + s) + 1) + b;
  },
  BackEaseInOut(t2, b, c, d) {
    let s = 1.70158;
    if ((t2 /= d / 2) < 1) {
      return c / 2 * (t2 * t2 * (((s *= 1.525) + 1) * t2 - s)) + b;
    }
    return c / 2 * ((t2 -= 2) * t2 * (((s *= 1.525) + 1) * t2 + s) + 2) + b;
  },
  ElasticEaseIn(t2, b, c, d, a, p) {
    let s = 0;
    if (t2 === 0) {
      return b;
    }
    if ((t2 /= d) === 1) {
      return b + c;
    }
    if (!p) {
      p = d * 0.3;
    }
    if (!a || a < Math.abs(c)) {
      a = c;
      s = p / 4;
    } else {
      s = p / (2 * Math.PI) * Math.asin(c / a);
    }
    return -(a * Math.pow(2, 10 * (t2 -= 1)) * Math.sin((t2 * d - s) * (2 * Math.PI) / p)) + b;
  },
  ElasticEaseOut(t2, b, c, d, a, p) {
    let s = 0;
    if (t2 === 0) {
      return b;
    }
    if ((t2 /= d) === 1) {
      return b + c;
    }
    if (!p) {
      p = d * 0.3;
    }
    if (!a || a < Math.abs(c)) {
      a = c;
      s = p / 4;
    } else {
      s = p / (2 * Math.PI) * Math.asin(c / a);
    }
    return a * Math.pow(2, -10 * t2) * Math.sin((t2 * d - s) * (2 * Math.PI) / p) + c + b;
  },
  ElasticEaseInOut(t2, b, c, d, a, p) {
    let s = 0;
    if (t2 === 0) {
      return b;
    }
    if ((t2 /= d / 2) === 2) {
      return b + c;
    }
    if (!p) {
      p = d * (0.3 * 1.5);
    }
    if (!a || a < Math.abs(c)) {
      a = c;
      s = p / 4;
    } else {
      s = p / (2 * Math.PI) * Math.asin(c / a);
    }
    if (t2 < 1) {
      return -0.5 * (a * Math.pow(2, 10 * (t2 -= 1)) * Math.sin((t2 * d - s) * (2 * Math.PI) / p)) + b;
    }
    return a * Math.pow(2, -10 * (t2 -= 1)) * Math.sin((t2 * d - s) * (2 * Math.PI) / p) * 0.5 + c + b;
  },
  BounceEaseOut(t2, b, c, d) {
    if ((t2 /= d) < 1 / 2.75) {
      return c * (7.5625 * t2 * t2) + b;
    } else if (t2 < 2 / 2.75) {
      return c * (7.5625 * (t2 -= 1.5 / 2.75) * t2 + 0.75) + b;
    } else if (t2 < 2.5 / 2.75) {
      return c * (7.5625 * (t2 -= 2.25 / 2.75) * t2 + 0.9375) + b;
    } else {
      return c * (7.5625 * (t2 -= 2.625 / 2.75) * t2 + 0.984375) + b;
    }
  },
  BounceEaseIn(t2, b, c, d) {
    return c - Easings.BounceEaseOut(d - t2, 0, c, d) + b;
  },
  BounceEaseInOut(t2, b, c, d) {
    if (t2 < d / 2) {
      return Easings.BounceEaseIn(t2 * 2, 0, c, d) * 0.5 + b;
    } else {
      return Easings.BounceEaseOut(t2 * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
    }
  },
  EaseIn(t2, b, c, d) {
    return c * (t2 /= d) * t2 + b;
  },
  EaseOut(t2, b, c, d) {
    return -c * (t2 /= d) * (t2 - 2) + b;
  },
  EaseInOut(t2, b, c, d) {
    if ((t2 /= d / 2) < 1) {
      return c / 2 * t2 * t2 + b;
    }
    return -c / 2 * (--t2 * (t2 - 2) - 1) + b;
  },
  StrongEaseIn(t2, b, c, d) {
    return c * (t2 /= d) * t2 * t2 * t2 * t2 + b;
  },
  StrongEaseOut(t2, b, c, d) {
    return c * ((t2 = t2 / d - 1) * t2 * t2 * t2 * t2 + 1) + b;
  },
  StrongEaseInOut(t2, b, c, d) {
    if ((t2 /= d / 2) < 1) {
      return c / 2 * t2 * t2 * t2 * t2 * t2 + b;
    }
    return c / 2 * ((t2 -= 2) * t2 * t2 * t2 * t2 + 2) + b;
  },
  Linear(t2, b, c, d) {
    return c * t2 / d + b;
  }
};
const Konva = Util._assign(Konva$1, {
  Util,
  Transform,
  Node,
  Container,
  Stage,
  stages,
  Layer,
  FastLayer,
  Group,
  DD,
  Shape,
  shapes,
  Animation,
  Tween,
  Easings,
  Context,
  Canvas
});
class Arc extends Shape {
  _sceneFunc(context) {
    const angle = Konva$1.getAngle(this.angle()), clockwise = this.clockwise();
    context.beginPath();
    context.arc(0, 0, this.outerRadius(), 0, angle, clockwise);
    context.arc(0, 0, this.innerRadius(), angle, 0, !clockwise);
    context.closePath();
    context.fillStrokeShape(this);
  }
  getWidth() {
    return this.outerRadius() * 2;
  }
  getHeight() {
    return this.outerRadius() * 2;
  }
  setWidth(width) {
    this.outerRadius(width / 2);
  }
  setHeight(height) {
    this.outerRadius(height / 2);
  }
  getSelfRect() {
    const innerRadius = this.innerRadius();
    const outerRadius = this.outerRadius();
    const clockwise = this.clockwise();
    const angle = Konva$1.getAngle(clockwise ? 360 - this.angle() : this.angle());
    const boundLeftRatio = Math.cos(Math.min(angle, Math.PI));
    const boundRightRatio = 1;
    const boundTopRatio = Math.sin(Math.min(Math.max(Math.PI, angle), 3 * Math.PI / 2));
    const boundBottomRatio = Math.sin(Math.min(angle, Math.PI / 2));
    const boundLeft = boundLeftRatio * (boundLeftRatio > 0 ? innerRadius : outerRadius);
    const boundRight = boundRightRatio * outerRadius;
    const boundTop = boundTopRatio * (boundTopRatio > 0 ? innerRadius : outerRadius);
    const boundBottom = boundBottomRatio * (boundBottomRatio > 0 ? outerRadius : innerRadius);
    return {
      x: boundLeft,
      y: clockwise ? -1 * boundBottom : boundTop,
      width: boundRight - boundLeft,
      height: boundBottom - boundTop
    };
  }
}
Arc.prototype._centroid = true;
Arc.prototype.className = "Arc";
Arc.prototype._attrsAffectingSize = [
  "innerRadius",
  "outerRadius",
  "angle",
  "clockwise"
];
_registerNode(Arc);
Factory.addGetterSetter(Arc, "innerRadius", 0, getNumberValidator());
Factory.addGetterSetter(Arc, "outerRadius", 0, getNumberValidator());
Factory.addGetterSetter(Arc, "angle", 0, getNumberValidator());
Factory.addGetterSetter(Arc, "clockwise", false, getBooleanValidator());
function getControlPoints(x0, y0, x1, y1, x2, y2, t2) {
  const d01 = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)), d12 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)), fa = t2 * d01 / (d01 + d12), fb = t2 * d12 / (d01 + d12), p1x = x1 - fa * (x2 - x0), p1y = y1 - fa * (y2 - y0), p2x = x1 + fb * (x2 - x0), p2y = y1 + fb * (y2 - y0);
  return [p1x, p1y, p2x, p2y];
}
function expandPoints(p, tension) {
  const len = p.length, allPoints = [];
  for (let n = 2; n < len - 2; n += 2) {
    const cp = getControlPoints(p[n - 2], p[n - 1], p[n], p[n + 1], p[n + 2], p[n + 3], tension);
    if (isNaN(cp[0])) {
      continue;
    }
    allPoints.push(cp[0]);
    allPoints.push(cp[1]);
    allPoints.push(p[n]);
    allPoints.push(p[n + 1]);
    allPoints.push(cp[2]);
    allPoints.push(cp[3]);
  }
  return allPoints;
}
function getBezierExtremaPoints(points) {
  const axisPoints = [
    [points[0], points[2], points[4], points[6]],
    [points[1], points[3], points[5], points[7]]
  ];
  const extremaTs = [];
  for (const axis of axisPoints) {
    const a = -3 * axis[0] + 9 * axis[1] - 9 * axis[2] + 3 * axis[3];
    if (a !== 0) {
      const b = 6 * axis[0] - 12 * axis[1] + 6 * axis[2];
      const c = -3 * axis[0] + 3 * axis[1];
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const d = Math.sqrt(discriminant);
        extremaTs.push((-b + d) / (2 * a));
        extremaTs.push((-b - d) / (2 * a));
      }
    }
  }
  return extremaTs.filter((t2) => t2 > 0 && t2 < 1).flatMap((t2) => axisPoints.map((axis) => {
    const mt = 1 - t2;
    return mt * mt * mt * axis[0] + 3 * mt * mt * t2 * axis[1] + 3 * mt * t2 * t2 * axis[2] + t2 * t2 * t2 * axis[3];
  }));
}
class Line extends Shape {
  constructor(config) {
    super(config);
    this.on("pointsChange.konva tensionChange.konva closedChange.konva bezierChange.konva", function() {
      this._clearCache("tensionPoints");
    });
  }
  _sceneFunc(context) {
    const points = this.points(), length = points.length, tension = this.tension(), closed = this.closed(), bezier = this.bezier();
    if (!length) {
      return;
    }
    let n = 0;
    context.beginPath();
    context.moveTo(points[0], points[1]);
    if (tension !== 0 && length > 4) {
      const tp = this.getTensionPoints();
      const len = tp.length;
      n = closed ? 0 : 4;
      if (!closed) {
        context.quadraticCurveTo(tp[0], tp[1], tp[2], tp[3]);
      }
      while (n < len - 2) {
        context.bezierCurveTo(tp[n++], tp[n++], tp[n++], tp[n++], tp[n++], tp[n++]);
      }
      if (!closed) {
        context.quadraticCurveTo(tp[len - 2], tp[len - 1], points[length - 2], points[length - 1]);
      }
    } else if (bezier) {
      n = 2;
      while (n < length) {
        context.bezierCurveTo(points[n++], points[n++], points[n++], points[n++], points[n++], points[n++]);
      }
    } else {
      for (n = 2; n < length; n += 2) {
        context.lineTo(points[n], points[n + 1]);
      }
    }
    if (closed) {
      context.closePath();
      context.fillStrokeShape(this);
    } else {
      context.strokeShape(this);
    }
  }
  getTensionPoints() {
    return this._getCache("tensionPoints", this._getTensionPoints);
  }
  _getTensionPoints() {
    if (this.closed()) {
      return this._getTensionPointsClosed();
    } else {
      return expandPoints(this.points(), this.tension());
    }
  }
  _getTensionPointsClosed() {
    const p = this.points(), len = p.length, tension = this.tension(), firstControlPoints = getControlPoints(p[len - 2], p[len - 1], p[0], p[1], p[2], p[3], tension), lastControlPoints = getControlPoints(p[len - 4], p[len - 3], p[len - 2], p[len - 1], p[0], p[1], tension), middle = expandPoints(p, tension), tp = [firstControlPoints[2], firstControlPoints[3]].concat(middle).concat([
      lastControlPoints[0],
      lastControlPoints[1],
      p[len - 2],
      p[len - 1],
      lastControlPoints[2],
      lastControlPoints[3],
      firstControlPoints[0],
      firstControlPoints[1],
      p[0],
      p[1]
    ]);
    return tp;
  }
  getWidth() {
    return this.getSelfRect().width;
  }
  getHeight() {
    return this.getSelfRect().height;
  }
  getSelfRect() {
    let points = this.points();
    if (points.length < 4) {
      return {
        x: points[0] || 0,
        y: points[1] || 0,
        width: 0,
        height: 0
      };
    }
    if (this.tension() !== 0) {
      points = [
        points[0],
        points[1],
        ...this._getTensionPoints(),
        points[points.length - 2],
        points[points.length - 1]
      ];
    } else if (this.bezier()) {
      points = [
        points[0],
        points[1],
        ...getBezierExtremaPoints(this.points()),
        points[points.length - 2],
        points[points.length - 1]
      ];
    } else {
      points = this.points();
    }
    let minX = points[0];
    let maxX = points[0];
    let minY = points[1];
    let maxY = points[1];
    let x, y;
    for (let i = 0; i < points.length / 2; i++) {
      x = points[i * 2];
      y = points[i * 2 + 1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}
Line.prototype.className = "Line";
Line.prototype._attrsAffectingSize = ["points", "bezier", "tension"];
_registerNode(Line);
Factory.addGetterSetter(Line, "closed", false);
Factory.addGetterSetter(Line, "bezier", false);
Factory.addGetterSetter(Line, "tension", 0, getNumberValidator());
Factory.addGetterSetter(Line, "points", [], getNumberArrayValidator());
const tValues = [
  [],
  [],
  [
    -0.5773502691896257,
    0.5773502691896257
  ],
  [
    0,
    -0.7745966692414834,
    0.7745966692414834
  ],
  [
    -0.33998104358485626,
    0.33998104358485626,
    -0.8611363115940526,
    0.8611363115940526
  ],
  [
    0,
    -0.5384693101056831,
    0.5384693101056831,
    -0.906179845938664,
    0.906179845938664
  ],
  [
    0.6612093864662645,
    -0.6612093864662645,
    -0.2386191860831969,
    0.2386191860831969,
    -0.932469514203152,
    0.932469514203152
  ],
  [
    0,
    0.4058451513773972,
    -0.4058451513773972,
    -0.7415311855993945,
    0.7415311855993945,
    -0.9491079123427585,
    0.9491079123427585
  ],
  [
    -0.1834346424956498,
    0.1834346424956498,
    -0.525532409916329,
    0.525532409916329,
    -0.7966664774136267,
    0.7966664774136267,
    -0.9602898564975363,
    0.9602898564975363
  ],
  [
    0,
    -0.8360311073266358,
    0.8360311073266358,
    -0.9681602395076261,
    0.9681602395076261,
    -0.3242534234038089,
    0.3242534234038089,
    -0.6133714327005904,
    0.6133714327005904
  ],
  [
    -0.14887433898163122,
    0.14887433898163122,
    -0.4333953941292472,
    0.4333953941292472,
    -0.6794095682990244,
    0.6794095682990244,
    -0.8650633666889845,
    0.8650633666889845,
    -0.9739065285171717,
    0.9739065285171717
  ],
  [
    0,
    -0.26954315595234496,
    0.26954315595234496,
    -0.5190961292068118,
    0.5190961292068118,
    -0.7301520055740494,
    0.7301520055740494,
    -0.8870625997680953,
    0.8870625997680953,
    -0.978228658146057,
    0.978228658146057
  ],
  [
    -0.1252334085114689,
    0.1252334085114689,
    -0.3678314989981802,
    0.3678314989981802,
    -0.5873179542866175,
    0.5873179542866175,
    -0.7699026741943047,
    0.7699026741943047,
    -0.9041172563704749,
    0.9041172563704749,
    -0.9815606342467192,
    0.9815606342467192
  ],
  [
    0,
    -0.2304583159551348,
    0.2304583159551348,
    -0.44849275103644687,
    0.44849275103644687,
    -0.6423493394403402,
    0.6423493394403402,
    -0.8015780907333099,
    0.8015780907333099,
    -0.9175983992229779,
    0.9175983992229779,
    -0.9841830547185881,
    0.9841830547185881
  ],
  [
    -0.10805494870734367,
    0.10805494870734367,
    -0.31911236892788974,
    0.31911236892788974,
    -0.5152486363581541,
    0.5152486363581541,
    -0.6872929048116855,
    0.6872929048116855,
    -0.827201315069765,
    0.827201315069765,
    -0.9284348836635735,
    0.9284348836635735,
    -0.9862838086968123,
    0.9862838086968123
  ],
  [
    0,
    -0.20119409399743451,
    0.20119409399743451,
    -0.3941513470775634,
    0.3941513470775634,
    -0.5709721726085388,
    0.5709721726085388,
    -0.7244177313601701,
    0.7244177313601701,
    -0.8482065834104272,
    0.8482065834104272,
    -0.937273392400706,
    0.937273392400706,
    -0.9879925180204854,
    0.9879925180204854
  ],
  [
    -0.09501250983763744,
    0.09501250983763744,
    -0.2816035507792589,
    0.2816035507792589,
    -0.45801677765722737,
    0.45801677765722737,
    -0.6178762444026438,
    0.6178762444026438,
    -0.755404408355003,
    0.755404408355003,
    -0.8656312023878318,
    0.8656312023878318,
    -0.9445750230732326,
    0.9445750230732326,
    -0.9894009349916499,
    0.9894009349916499
  ],
  [
    0,
    -0.17848418149584785,
    0.17848418149584785,
    -0.3512317634538763,
    0.3512317634538763,
    -0.5126905370864769,
    0.5126905370864769,
    -0.6576711592166907,
    0.6576711592166907,
    -0.7815140038968014,
    0.7815140038968014,
    -0.8802391537269859,
    0.8802391537269859,
    -0.9506755217687678,
    0.9506755217687678,
    -0.9905754753144174,
    0.9905754753144174
  ],
  [
    -0.0847750130417353,
    0.0847750130417353,
    -0.2518862256915055,
    0.2518862256915055,
    -0.41175116146284263,
    0.41175116146284263,
    -0.5597708310739475,
    0.5597708310739475,
    -0.6916870430603532,
    0.6916870430603532,
    -0.8037049589725231,
    0.8037049589725231,
    -0.8926024664975557,
    0.8926024664975557,
    -0.9558239495713977,
    0.9558239495713977,
    -0.9915651684209309,
    0.9915651684209309
  ],
  [
    0,
    -0.16035864564022537,
    0.16035864564022537,
    -0.31656409996362983,
    0.31656409996362983,
    -0.46457074137596094,
    0.46457074137596094,
    -0.600545304661681,
    0.600545304661681,
    -0.7209661773352294,
    0.7209661773352294,
    -0.8227146565371428,
    0.8227146565371428,
    -0.9031559036148179,
    0.9031559036148179,
    -0.96020815213483,
    0.96020815213483,
    -0.9924068438435844,
    0.9924068438435844
  ],
  [
    -0.07652652113349734,
    0.07652652113349734,
    -0.22778585114164507,
    0.22778585114164507,
    -0.37370608871541955,
    0.37370608871541955,
    -0.5108670019508271,
    0.5108670019508271,
    -0.636053680726515,
    0.636053680726515,
    -0.7463319064601508,
    0.7463319064601508,
    -0.8391169718222188,
    0.8391169718222188,
    -0.912234428251326,
    0.912234428251326,
    -0.9639719272779138,
    0.9639719272779138,
    -0.9931285991850949,
    0.9931285991850949
  ],
  [
    0,
    -0.1455618541608951,
    0.1455618541608951,
    -0.2880213168024011,
    0.2880213168024011,
    -0.4243421202074388,
    0.4243421202074388,
    -0.5516188358872198,
    0.5516188358872198,
    -0.6671388041974123,
    0.6671388041974123,
    -0.7684399634756779,
    0.7684399634756779,
    -0.8533633645833173,
    0.8533633645833173,
    -0.9200993341504008,
    0.9200993341504008,
    -0.9672268385663063,
    0.9672268385663063,
    -0.9937521706203895,
    0.9937521706203895
  ],
  [
    -0.06973927331972223,
    0.06973927331972223,
    -0.20786042668822127,
    0.20786042668822127,
    -0.34193582089208424,
    0.34193582089208424,
    -0.469355837986757,
    0.469355837986757,
    -0.5876404035069116,
    0.5876404035069116,
    -0.6944872631866827,
    0.6944872631866827,
    -0.7878168059792081,
    0.7878168059792081,
    -0.8658125777203002,
    0.8658125777203002,
    -0.926956772187174,
    0.926956772187174,
    -0.9700604978354287,
    0.9700604978354287,
    -0.9942945854823992,
    0.9942945854823992
  ],
  [
    0,
    -0.1332568242984661,
    0.1332568242984661,
    -0.26413568097034495,
    0.26413568097034495,
    -0.3903010380302908,
    0.3903010380302908,
    -0.5095014778460075,
    0.5095014778460075,
    -0.6196098757636461,
    0.6196098757636461,
    -0.7186613631319502,
    0.7186613631319502,
    -0.8048884016188399,
    0.8048884016188399,
    -0.8767523582704416,
    0.8767523582704416,
    -0.9329710868260161,
    0.9329710868260161,
    -0.9725424712181152,
    0.9725424712181152,
    -0.9947693349975522,
    0.9947693349975522
  ],
  [
    -0.06405689286260563,
    0.06405689286260563,
    -0.1911188674736163,
    0.1911188674736163,
    -0.3150426796961634,
    0.3150426796961634,
    -0.4337935076260451,
    0.4337935076260451,
    -0.5454214713888396,
    0.5454214713888396,
    -0.6480936519369755,
    0.6480936519369755,
    -0.7401241915785544,
    0.7401241915785544,
    -0.820001985973903,
    0.820001985973903,
    -0.8864155270044011,
    0.8864155270044011,
    -0.9382745520027328,
    0.9382745520027328,
    -0.9747285559713095,
    0.9747285559713095,
    -0.9951872199970213,
    0.9951872199970213
  ]
];
const cValues = [
  [],
  [],
  [1, 1],
  [
    0.8888888888888888,
    0.5555555555555556,
    0.5555555555555556
  ],
  [
    0.6521451548625461,
    0.6521451548625461,
    0.34785484513745385,
    0.34785484513745385
  ],
  [
    0.5688888888888889,
    0.47862867049936647,
    0.47862867049936647,
    0.23692688505618908,
    0.23692688505618908
  ],
  [
    0.3607615730481386,
    0.3607615730481386,
    0.46791393457269104,
    0.46791393457269104,
    0.17132449237917036,
    0.17132449237917036
  ],
  [
    0.4179591836734694,
    0.3818300505051189,
    0.3818300505051189,
    0.27970539148927664,
    0.27970539148927664,
    0.1294849661688697,
    0.1294849661688697
  ],
  [
    0.362683783378362,
    0.362683783378362,
    0.31370664587788727,
    0.31370664587788727,
    0.22238103445337448,
    0.22238103445337448,
    0.10122853629037626,
    0.10122853629037626
  ],
  [
    0.3302393550012598,
    0.1806481606948574,
    0.1806481606948574,
    0.08127438836157441,
    0.08127438836157441,
    0.31234707704000286,
    0.31234707704000286,
    0.26061069640293544,
    0.26061069640293544
  ],
  [
    0.29552422471475287,
    0.29552422471475287,
    0.26926671930999635,
    0.26926671930999635,
    0.21908636251598204,
    0.21908636251598204,
    0.1494513491505806,
    0.1494513491505806,
    0.06667134430868814,
    0.06667134430868814
  ],
  [
    0.2729250867779006,
    0.26280454451024665,
    0.26280454451024665,
    0.23319376459199048,
    0.23319376459199048,
    0.18629021092773426,
    0.18629021092773426,
    0.1255803694649046,
    0.1255803694649046,
    0.05566856711617366,
    0.05566856711617366
  ],
  [
    0.24914704581340277,
    0.24914704581340277,
    0.2334925365383548,
    0.2334925365383548,
    0.20316742672306592,
    0.20316742672306592,
    0.16007832854334622,
    0.16007832854334622,
    0.10693932599531843,
    0.10693932599531843,
    0.04717533638651183,
    0.04717533638651183
  ],
  [
    0.2325515532308739,
    0.22628318026289723,
    0.22628318026289723,
    0.2078160475368885,
    0.2078160475368885,
    0.17814598076194574,
    0.17814598076194574,
    0.13887351021978725,
    0.13887351021978725,
    0.09212149983772845,
    0.09212149983772845,
    0.04048400476531588,
    0.04048400476531588
  ],
  [
    0.2152638534631578,
    0.2152638534631578,
    0.2051984637212956,
    0.2051984637212956,
    0.18553839747793782,
    0.18553839747793782,
    0.15720316715819355,
    0.15720316715819355,
    0.12151857068790319,
    0.12151857068790319,
    0.08015808715976021,
    0.08015808715976021,
    0.03511946033175186,
    0.03511946033175186
  ],
  [
    0.2025782419255613,
    0.19843148532711158,
    0.19843148532711158,
    0.1861610000155622,
    0.1861610000155622,
    0.16626920581699392,
    0.16626920581699392,
    0.13957067792615432,
    0.13957067792615432,
    0.10715922046717194,
    0.10715922046717194,
    0.07036604748810812,
    0.07036604748810812,
    0.03075324199611727,
    0.03075324199611727
  ],
  [
    0.1894506104550685,
    0.1894506104550685,
    0.18260341504492358,
    0.18260341504492358,
    0.16915651939500254,
    0.16915651939500254,
    0.14959598881657674,
    0.14959598881657674,
    0.12462897125553388,
    0.12462897125553388,
    0.09515851168249279,
    0.09515851168249279,
    0.062253523938647894,
    0.062253523938647894,
    0.027152459411754096,
    0.027152459411754096
  ],
  [
    0.17944647035620653,
    0.17656270536699264,
    0.17656270536699264,
    0.16800410215645004,
    0.16800410215645004,
    0.15404576107681028,
    0.15404576107681028,
    0.13513636846852548,
    0.13513636846852548,
    0.11188384719340397,
    0.11188384719340397,
    0.08503614831717918,
    0.08503614831717918,
    0.0554595293739872,
    0.0554595293739872,
    0.02414830286854793,
    0.02414830286854793
  ],
  [
    0.1691423829631436,
    0.1691423829631436,
    0.16427648374583273,
    0.16427648374583273,
    0.15468467512626524,
    0.15468467512626524,
    0.14064291467065065,
    0.14064291467065065,
    0.12255520671147846,
    0.12255520671147846,
    0.10094204410628717,
    0.10094204410628717,
    0.07642573025488905,
    0.07642573025488905,
    0.0497145488949698,
    0.0497145488949698,
    0.02161601352648331,
    0.02161601352648331
  ],
  [
    0.1610544498487837,
    0.15896884339395434,
    0.15896884339395434,
    0.15276604206585967,
    0.15276604206585967,
    0.1426067021736066,
    0.1426067021736066,
    0.12875396253933621,
    0.12875396253933621,
    0.11156664554733399,
    0.11156664554733399,
    0.09149002162245,
    0.09149002162245,
    0.06904454273764123,
    0.06904454273764123,
    0.0448142267656996,
    0.0448142267656996,
    0.019461788229726478,
    0.019461788229726478
  ],
  [
    0.15275338713072584,
    0.15275338713072584,
    0.14917298647260374,
    0.14917298647260374,
    0.14209610931838204,
    0.14209610931838204,
    0.13168863844917664,
    0.13168863844917664,
    0.11819453196151841,
    0.11819453196151841,
    0.10193011981724044,
    0.10193011981724044,
    0.08327674157670475,
    0.08327674157670475,
    0.06267204833410907,
    0.06267204833410907,
    0.04060142980038694,
    0.04060142980038694,
    0.017614007139152118,
    0.017614007139152118
  ],
  [
    0.14608113364969041,
    0.14452440398997005,
    0.14452440398997005,
    0.13988739479107315,
    0.13988739479107315,
    0.13226893863333747,
    0.13226893863333747,
    0.12183141605372853,
    0.12183141605372853,
    0.10879729916714838,
    0.10879729916714838,
    0.09344442345603386,
    0.09344442345603386,
    0.0761001136283793,
    0.0761001136283793,
    0.057134425426857205,
    0.057134425426857205,
    0.036953789770852494,
    0.036953789770852494,
    0.016017228257774335,
    0.016017228257774335
  ],
  [
    0.13925187285563198,
    0.13925187285563198,
    0.13654149834601517,
    0.13654149834601517,
    0.13117350478706238,
    0.13117350478706238,
    0.12325237681051242,
    0.12325237681051242,
    0.11293229608053922,
    0.11293229608053922,
    0.10041414444288096,
    0.10041414444288096,
    0.08594160621706773,
    0.08594160621706773,
    0.06979646842452049,
    0.06979646842452049,
    0.052293335152683286,
    0.052293335152683286,
    0.03377490158481415,
    0.03377490158481415,
    0.0146279952982722,
    0.0146279952982722
  ],
  [
    0.13365457218610619,
    0.1324620394046966,
    0.1324620394046966,
    0.12890572218808216,
    0.12890572218808216,
    0.12304908430672953,
    0.12304908430672953,
    0.11499664022241136,
    0.11499664022241136,
    0.10489209146454141,
    0.10489209146454141,
    0.09291576606003515,
    0.09291576606003515,
    0.07928141177671895,
    0.07928141177671895,
    0.06423242140852585,
    0.06423242140852585,
    0.04803767173108467,
    0.04803767173108467,
    0.030988005856979445,
    0.030988005856979445,
    0.013411859487141771,
    0.013411859487141771
  ],
  [
    0.12793819534675216,
    0.12793819534675216,
    0.1258374563468283,
    0.1258374563468283,
    0.12167047292780339,
    0.12167047292780339,
    0.1155056680537256,
    0.1155056680537256,
    0.10744427011596563,
    0.10744427011596563,
    0.09761865210411388,
    0.09761865210411388,
    0.08619016153195327,
    0.08619016153195327,
    0.0733464814110803,
    0.0733464814110803,
    0.05929858491543678,
    0.05929858491543678,
    0.04427743881741981,
    0.04427743881741981,
    0.028531388628933663,
    0.028531388628933663,
    0.0123412297999872,
    0.0123412297999872
  ]
];
const binomialCoefficients = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1]];
const getCubicArcLength = (xs, ys, t2) => {
  let sum;
  let correctedT;
  const n = 20;
  const z = t2 / 2;
  sum = 0;
  for (let i = 0; i < n; i++) {
    correctedT = z * tValues[n][i] + z;
    sum += cValues[n][i] * BFunc(xs, ys, correctedT);
  }
  return z * sum;
};
const getQuadraticArcLength = (xs, ys, t2) => {
  if (t2 === void 0) {
    t2 = 1;
  }
  const ax = xs[0] - 2 * xs[1] + xs[2];
  const ay = ys[0] - 2 * ys[1] + ys[2];
  const bx = 2 * xs[1] - 2 * xs[0];
  const by = 2 * ys[1] - 2 * ys[0];
  const A2 = 4 * (ax * ax + ay * ay);
  const B2 = 4 * (ax * bx + ay * by);
  const C2 = bx * bx + by * by;
  if (A2 === 0) {
    return t2 * Math.sqrt(Math.pow(xs[2] - xs[0], 2) + Math.pow(ys[2] - ys[0], 2));
  }
  const b = B2 / (2 * A2);
  const c = C2 / A2;
  const u = t2 + b;
  const k = c - b * b;
  const uuk = u * u + k > 0 ? Math.sqrt(u * u + k) : 0;
  const bbk = b * b + k > 0 ? Math.sqrt(b * b + k) : 0;
  const term = b + Math.sqrt(b * b + k) !== 0 ? k * Math.log(Math.abs((u + uuk) / (b + bbk))) : 0;
  return Math.sqrt(A2) / 2 * (u * uuk - b * bbk + term);
};
function BFunc(xs, ys, t2) {
  const xbase = getDerivative(1, t2, xs);
  const ybase = getDerivative(1, t2, ys);
  const combined = xbase * xbase + ybase * ybase;
  return Math.sqrt(combined);
}
const getDerivative = (derivative, t2, vs) => {
  const n = vs.length - 1;
  let _vs;
  let value;
  if (n === 0) {
    return 0;
  }
  if (derivative === 0) {
    value = 0;
    for (let k = 0; k <= n; k++) {
      value += binomialCoefficients[n][k] * Math.pow(1 - t2, n - k) * Math.pow(t2, k) * vs[k];
    }
    return value;
  } else {
    _vs = new Array(n);
    for (let k = 0; k < n; k++) {
      _vs[k] = n * (vs[k + 1] - vs[k]);
    }
    return getDerivative(derivative - 1, t2, _vs);
  }
};
const t2length = (length, totalLength, func) => {
  let error2 = 1;
  let t2 = length / totalLength;
  let step = (length - func(t2)) / totalLength;
  let numIterations = 0;
  while (error2 > 1e-3) {
    const increasedTLength = func(t2 + step);
    const increasedTError = Math.abs(length - increasedTLength) / totalLength;
    if (increasedTError < error2) {
      error2 = increasedTError;
      t2 += step;
    } else {
      const decreasedTLength = func(t2 - step);
      const decreasedTError = Math.abs(length - decreasedTLength) / totalLength;
      if (decreasedTError < error2) {
        error2 = decreasedTError;
        t2 -= step;
      } else {
        step /= 2;
      }
    }
    numIterations++;
    if (numIterations > 500) {
      break;
    }
  }
  return t2;
};
class Path extends Shape {
  constructor(config) {
    super(config);
    this.dataArray = [];
    this.pathLength = 0;
    this._readDataAttribute();
    this.on("dataChange.konva", function() {
      this._readDataAttribute();
    });
  }
  _readDataAttribute() {
    this.dataArray = Path.parsePathData(this.data());
    this.pathLength = Path.getPathLength(this.dataArray);
  }
  _sceneFunc(context) {
    const ca = this.dataArray;
    context.beginPath();
    let isClosed = false;
    for (let n = 0; n < ca.length; n++) {
      const c = ca[n].command;
      const p = ca[n].points;
      switch (c) {
        case "L":
          context.lineTo(p[0], p[1]);
          break;
        case "M":
          context.moveTo(p[0], p[1]);
          break;
        case "C":
          context.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
          break;
        case "Q":
          context.quadraticCurveTo(p[0], p[1], p[2], p[3]);
          break;
        case "A":
          const cx = p[0], cy = p[1], rx = p[2], ry = p[3], theta = p[4], dTheta = p[5], psi = p[6], fs2 = p[7];
          const r = rx > ry ? rx : ry;
          const scaleX = rx > ry ? 1 : rx / ry;
          const scaleY = rx > ry ? ry / rx : 1;
          context.translate(cx, cy);
          context.rotate(psi);
          context.scale(scaleX, scaleY);
          context.arc(0, 0, r, theta, theta + dTheta, 1 - fs2);
          context.scale(1 / scaleX, 1 / scaleY);
          context.rotate(-psi);
          context.translate(-cx, -cy);
          break;
        case "z":
          isClosed = true;
          context.closePath();
          break;
      }
    }
    if (!isClosed && !this.hasFill()) {
      context.strokeShape(this);
    } else {
      context.fillStrokeShape(this);
    }
  }
  getSelfRect() {
    let points = [];
    this.dataArray.forEach(function(data) {
      if (data.command === "A") {
        const start = data.points[4];
        const dTheta = data.points[5];
        const end = data.points[4] + dTheta;
        let inc2 = Math.PI / 180;
        if (Math.abs(start - end) < inc2) {
          inc2 = Math.abs(start - end);
        }
        if (dTheta < 0) {
          for (let t2 = start - inc2; t2 > end; t2 -= inc2) {
            const point = Path.getPointOnEllipticalArc(data.points[0], data.points[1], data.points[2], data.points[3], t2, 0);
            points.push(point.x, point.y);
          }
        } else {
          for (let t2 = start + inc2; t2 < end; t2 += inc2) {
            const point = Path.getPointOnEllipticalArc(data.points[0], data.points[1], data.points[2], data.points[3], t2, 0);
            points.push(point.x, point.y);
          }
        }
      } else if (data.command === "C") {
        for (let t2 = 0; t2 <= 1; t2 += 0.01) {
          const point = Path.getPointOnCubicBezier(t2, data.start.x, data.start.y, data.points[0], data.points[1], data.points[2], data.points[3], data.points[4], data.points[5]);
          points.push(point.x, point.y);
        }
      } else {
        points = points.concat(data.points);
      }
    });
    let minX = points[0];
    let maxX = points[0];
    let minY = points[1];
    let maxY = points[1];
    let x, y;
    for (let i = 0; i < points.length / 2; i++) {
      x = points[i * 2];
      y = points[i * 2 + 1];
      if (!isNaN(x)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
      if (!isNaN(y)) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  getLength() {
    return this.pathLength;
  }
  getPointAtLength(length) {
    return Path.getPointAtLengthOfDataArray(length, this.dataArray);
  }
  static getLineLength(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  }
  static getPathLength(dataArray) {
    let pathLength = 0;
    for (let i = 0; i < dataArray.length; ++i) {
      pathLength += dataArray[i].pathLength;
    }
    return pathLength;
  }
  static getPointAtLengthOfDataArray(length, dataArray) {
    let points, i = 0, ii = dataArray.length;
    if (!ii) {
      return null;
    }
    while (i < ii && length > dataArray[i].pathLength) {
      length -= dataArray[i].pathLength;
      ++i;
    }
    if (i === ii) {
      points = dataArray[i - 1].points.slice(-2);
      return {
        x: points[0],
        y: points[1]
      };
    }
    if (length < 0.01) {
      const cmd = dataArray[i].command;
      if (cmd === "M") {
        points = dataArray[i].points.slice(0, 2);
        return {
          x: points[0],
          y: points[1]
        };
      } else {
        return {
          x: dataArray[i].start.x,
          y: dataArray[i].start.y
        };
      }
    }
    const cp = dataArray[i];
    const p = cp.points;
    switch (cp.command) {
      case "L":
        return Path.getPointOnLine(length, cp.start.x, cp.start.y, p[0], p[1]);
      case "C":
        return Path.getPointOnCubicBezier(t2length(length, Path.getPathLength(dataArray), (i2) => {
          return getCubicArcLength([cp.start.x, p[0], p[2], p[4]], [cp.start.y, p[1], p[3], p[5]], i2);
        }), cp.start.x, cp.start.y, p[0], p[1], p[2], p[3], p[4], p[5]);
      case "Q":
        return Path.getPointOnQuadraticBezier(t2length(length, Path.getPathLength(dataArray), (i2) => {
          return getQuadraticArcLength([cp.start.x, p[0], p[2]], [cp.start.y, p[1], p[3]], i2);
        }), cp.start.x, cp.start.y, p[0], p[1], p[2], p[3]);
      case "A":
        const cx = p[0], cy = p[1], rx = p[2], ry = p[3], dTheta = p[5], psi = p[6];
        let theta = p[4];
        theta += dTheta * length / cp.pathLength;
        return Path.getPointOnEllipticalArc(cx, cy, rx, ry, theta, psi);
    }
    return null;
  }
  static getPointOnLine(dist2, P1x, P1y, P2x, P2y, fromX, fromY) {
    fromX = fromX !== null && fromX !== void 0 ? fromX : P1x;
    fromY = fromY !== null && fromY !== void 0 ? fromY : P1y;
    const len = this.getLineLength(P1x, P1y, P2x, P2y);
    if (len < 1e-10) {
      return { x: P1x, y: P1y };
    }
    if (P2x === P1x) {
      return { x: fromX, y: fromY + (P2y > P1y ? dist2 : -dist2) };
    }
    const m = (P2y - P1y) / (P2x - P1x);
    const run = Math.sqrt(dist2 * dist2 / (1 + m * m)) * (P2x < P1x ? -1 : 1);
    const rise = m * run;
    if (Math.abs(fromY - P1y - m * (fromX - P1x)) < 1e-10) {
      return { x: fromX + run, y: fromY + rise };
    }
    const u = ((fromX - P1x) * (P2x - P1x) + (fromY - P1y) * (P2y - P1y)) / (len * len);
    const ix = P1x + u * (P2x - P1x);
    const iy = P1y + u * (P2y - P1y);
    const pRise = this.getLineLength(fromX, fromY, ix, iy);
    const pRun = Math.sqrt(dist2 * dist2 - pRise * pRise);
    const adjustedRun = Math.sqrt(pRun * pRun / (1 + m * m)) * (P2x < P1x ? -1 : 1);
    const adjustedRise = m * adjustedRun;
    return { x: ix + adjustedRun, y: iy + adjustedRise };
  }
  static getPointOnCubicBezier(pct, P1x, P1y, P2x, P2y, P3x, P3y, P4x, P4y) {
    function CB1(t2) {
      return t2 * t2 * t2;
    }
    function CB2(t2) {
      return 3 * t2 * t2 * (1 - t2);
    }
    function CB3(t2) {
      return 3 * t2 * (1 - t2) * (1 - t2);
    }
    function CB4(t2) {
      return (1 - t2) * (1 - t2) * (1 - t2);
    }
    const x = P4x * CB1(pct) + P3x * CB2(pct) + P2x * CB3(pct) + P1x * CB4(pct);
    const y = P4y * CB1(pct) + P3y * CB2(pct) + P2y * CB3(pct) + P1y * CB4(pct);
    return { x, y };
  }
  static getPointOnQuadraticBezier(pct, P1x, P1y, P2x, P2y, P3x, P3y) {
    function QB1(t2) {
      return t2 * t2;
    }
    function QB2(t2) {
      return 2 * t2 * (1 - t2);
    }
    function QB3(t2) {
      return (1 - t2) * (1 - t2);
    }
    const x = P3x * QB1(pct) + P2x * QB2(pct) + P1x * QB3(pct);
    const y = P3y * QB1(pct) + P2y * QB2(pct) + P1y * QB3(pct);
    return { x, y };
  }
  static getPointOnEllipticalArc(cx, cy, rx, ry, theta, psi) {
    const cosPsi = Math.cos(psi), sinPsi = Math.sin(psi);
    const pt = {
      x: rx * Math.cos(theta),
      y: ry * Math.sin(theta)
    };
    return {
      x: cx + (pt.x * cosPsi - pt.y * sinPsi),
      y: cy + (pt.x * sinPsi + pt.y * cosPsi)
    };
  }
  static parsePathData(data) {
    if (!data) {
      return [];
    }
    let cs = data;
    const cc = [
      "m",
      "M",
      "l",
      "L",
      "v",
      "V",
      "h",
      "H",
      "z",
      "Z",
      "c",
      "C",
      "q",
      "Q",
      "t",
      "T",
      "s",
      "S",
      "a",
      "A"
    ];
    cs = cs.replace(new RegExp(" ", "g"), ",");
    for (let n = 0; n < cc.length; n++) {
      cs = cs.replace(new RegExp(cc[n], "g"), "|" + cc[n]);
    }
    const arr = cs.split("|");
    const ca = [];
    const coords = [];
    let cpx = 0;
    let cpy = 0;
    const re2 = /([-+]?((\d+\.\d+)|((\d+)|(\.\d+)))(?:e[-+]?\d+)?)/gi;
    let match;
    for (let n = 1; n < arr.length; n++) {
      let str = arr[n];
      let c = str.charAt(0);
      str = str.slice(1);
      coords.length = 0;
      while (match = re2.exec(str)) {
        coords.push(match[0]);
      }
      let p = [];
      let arcParamIndex = c === "A" || c === "a" ? 0 : -1;
      for (let j = 0, jlen = coords.length; j < jlen; j++) {
        const token = coords[j];
        if (token === "00") {
          p.push(0, 0);
          if (arcParamIndex >= 0) {
            arcParamIndex += 2;
            if (arcParamIndex >= 7)
              arcParamIndex -= 7;
          }
          continue;
        }
        if (arcParamIndex >= 0) {
          if (arcParamIndex === 3) {
            if (/^[01]{2}\d+(?:\.\d+)?$/.test(token)) {
              p.push(parseInt(token[0], 10));
              p.push(parseInt(token[1], 10));
              p.push(parseFloat(token.slice(2)));
              arcParamIndex += 3;
              if (arcParamIndex >= 7)
                arcParamIndex -= 7;
              continue;
            }
            if (token === "11" || token === "10" || token === "01") {
              p.push(parseInt(token[0], 10));
              p.push(parseInt(token[1], 10));
              arcParamIndex += 2;
              if (arcParamIndex >= 7)
                arcParamIndex -= 7;
              continue;
            }
            if (token === "0" || token === "1") {
              p.push(parseInt(token, 10));
              arcParamIndex += 1;
              if (arcParamIndex >= 7)
                arcParamIndex -= 7;
              continue;
            }
          } else if (arcParamIndex === 4) {
            if (/^[01]\d+(?:\.\d+)?$/.test(token)) {
              p.push(parseInt(token[0], 10));
              p.push(parseFloat(token.slice(1)));
              arcParamIndex += 2;
              if (arcParamIndex >= 7)
                arcParamIndex -= 7;
              continue;
            }
            if (token === "0" || token === "1") {
              p.push(parseInt(token, 10));
              arcParamIndex += 1;
              if (arcParamIndex >= 7)
                arcParamIndex -= 7;
              continue;
            }
          }
          const parsedArc = parseFloat(token);
          if (!isNaN(parsedArc)) {
            p.push(parsedArc);
          } else {
            p.push(0);
          }
          arcParamIndex += 1;
          if (arcParamIndex >= 7)
            arcParamIndex -= 7;
        } else {
          const parsed = parseFloat(token);
          if (!isNaN(parsed)) {
            p.push(parsed);
          } else {
            p.push(0);
          }
        }
      }
      while (p.length > 0) {
        if (isNaN(p[0])) {
          break;
        }
        let cmd = "";
        let points = [];
        const startX = cpx, startY = cpy;
        let prevCmd, ctlPtx, ctlPty;
        let rx, ry, psi, fa, fs2, x1, y1;
        switch (c) {
          case "l":
            cpx += p.shift();
            cpy += p.shift();
            cmd = "L";
            points.push(cpx, cpy);
            break;
          case "L":
            cpx = p.shift();
            cpy = p.shift();
            points.push(cpx, cpy);
            break;
          case "m":
            const dx = p.shift();
            const dy = p.shift();
            cpx += dx;
            cpy += dy;
            cmd = "M";
            if (ca.length > 2 && ca[ca.length - 1].command === "z") {
              for (let idx = ca.length - 2; idx >= 0; idx--) {
                if (ca[idx].command === "M") {
                  cpx = ca[idx].points[0] + dx;
                  cpy = ca[idx].points[1] + dy;
                  break;
                }
              }
            }
            points.push(cpx, cpy);
            c = "l";
            break;
          case "M":
            cpx = p.shift();
            cpy = p.shift();
            cmd = "M";
            points.push(cpx, cpy);
            c = "L";
            break;
          case "h":
            cpx += p.shift();
            cmd = "L";
            points.push(cpx, cpy);
            break;
          case "H":
            cpx = p.shift();
            cmd = "L";
            points.push(cpx, cpy);
            break;
          case "v":
            cpy += p.shift();
            cmd = "L";
            points.push(cpx, cpy);
            break;
          case "V":
            cpy = p.shift();
            cmd = "L";
            points.push(cpx, cpy);
            break;
          case "C":
            points.push(p.shift(), p.shift(), p.shift(), p.shift());
            cpx = p.shift();
            cpy = p.shift();
            points.push(cpx, cpy);
            break;
          case "c":
            points.push(cpx + p.shift(), cpy + p.shift(), cpx + p.shift(), cpy + p.shift());
            cpx += p.shift();
            cpy += p.shift();
            cmd = "C";
            points.push(cpx, cpy);
            break;
          case "S":
            ctlPtx = cpx;
            ctlPty = cpy;
            prevCmd = ca[ca.length - 1];
            if (prevCmd.command === "C") {
              ctlPtx = cpx + (cpx - prevCmd.points[2]);
              ctlPty = cpy + (cpy - prevCmd.points[3]);
            }
            points.push(ctlPtx, ctlPty, p.shift(), p.shift());
            cpx = p.shift();
            cpy = p.shift();
            cmd = "C";
            points.push(cpx, cpy);
            break;
          case "s":
            ctlPtx = cpx;
            ctlPty = cpy;
            prevCmd = ca[ca.length - 1];
            if (prevCmd.command === "C") {
              ctlPtx = cpx + (cpx - prevCmd.points[2]);
              ctlPty = cpy + (cpy - prevCmd.points[3]);
            }
            points.push(ctlPtx, ctlPty, cpx + p.shift(), cpy + p.shift());
            cpx += p.shift();
            cpy += p.shift();
            cmd = "C";
            points.push(cpx, cpy);
            break;
          case "Q":
            points.push(p.shift(), p.shift());
            cpx = p.shift();
            cpy = p.shift();
            points.push(cpx, cpy);
            break;
          case "q":
            points.push(cpx + p.shift(), cpy + p.shift());
            cpx += p.shift();
            cpy += p.shift();
            cmd = "Q";
            points.push(cpx, cpy);
            break;
          case "T":
            ctlPtx = cpx;
            ctlPty = cpy;
            prevCmd = ca[ca.length - 1];
            if (prevCmd.command === "Q") {
              ctlPtx = cpx + (cpx - prevCmd.points[0]);
              ctlPty = cpy + (cpy - prevCmd.points[1]);
            }
            cpx = p.shift();
            cpy = p.shift();
            cmd = "Q";
            points.push(ctlPtx, ctlPty, cpx, cpy);
            break;
          case "t":
            ctlPtx = cpx;
            ctlPty = cpy;
            prevCmd = ca[ca.length - 1];
            if (prevCmd.command === "Q") {
              ctlPtx = cpx + (cpx - prevCmd.points[0]);
              ctlPty = cpy + (cpy - prevCmd.points[1]);
            }
            cpx += p.shift();
            cpy += p.shift();
            cmd = "Q";
            points.push(ctlPtx, ctlPty, cpx, cpy);
            break;
          case "A":
            rx = p.shift();
            ry = p.shift();
            psi = p.shift();
            fa = p.shift();
            fs2 = p.shift();
            x1 = cpx;
            y1 = cpy;
            cpx = p.shift();
            cpy = p.shift();
            cmd = "A";
            points = this.convertEndpointToCenterParameterization(x1, y1, cpx, cpy, fa, fs2, rx, ry, psi);
            break;
          case "a":
            rx = p.shift();
            ry = p.shift();
            psi = p.shift();
            fa = p.shift();
            fs2 = p.shift();
            x1 = cpx;
            y1 = cpy;
            cpx += p.shift();
            cpy += p.shift();
            cmd = "A";
            points = this.convertEndpointToCenterParameterization(x1, y1, cpx, cpy, fa, fs2, rx, ry, psi);
            break;
        }
        ca.push({
          command: cmd || c,
          points,
          start: {
            x: startX,
            y: startY
          },
          pathLength: this.calcLength(startX, startY, cmd || c, points)
        });
      }
      if (c === "z" || c === "Z") {
        ca.push({
          command: "z",
          points: [],
          start: void 0,
          pathLength: 0
        });
      }
    }
    return ca;
  }
  static calcLength(x, y, cmd, points) {
    let len, p1, p2, t2;
    const path2 = Path;
    switch (cmd) {
      case "L":
        return path2.getLineLength(x, y, points[0], points[1]);
      case "C":
        return getCubicArcLength([x, points[0], points[2], points[4]], [y, points[1], points[3], points[5]], 1);
      case "Q":
        return getQuadraticArcLength([x, points[0], points[2]], [y, points[1], points[3]], 1);
      case "A":
        len = 0;
        const start = points[4];
        const dTheta = points[5];
        const end = points[4] + dTheta;
        let inc2 = Math.PI / 180;
        if (Math.abs(start - end) < inc2) {
          inc2 = Math.abs(start - end);
        }
        p1 = path2.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], start, 0);
        if (dTheta < 0) {
          for (t2 = start - inc2; t2 > end; t2 -= inc2) {
            p2 = path2.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], t2, 0);
            len += path2.getLineLength(p1.x, p1.y, p2.x, p2.y);
            p1 = p2;
          }
        } else {
          for (t2 = start + inc2; t2 < end; t2 += inc2) {
            p2 = path2.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], t2, 0);
            len += path2.getLineLength(p1.x, p1.y, p2.x, p2.y);
            p1 = p2;
          }
        }
        p2 = path2.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], end, 0);
        len += path2.getLineLength(p1.x, p1.y, p2.x, p2.y);
        return len;
    }
    return 0;
  }
  static convertEndpointToCenterParameterization(x1, y1, x2, y2, fa, fs2, rx, ry, psiDeg) {
    const psi = psiDeg * (Math.PI / 180);
    const xp = Math.cos(psi) * (x1 - x2) / 2 + Math.sin(psi) * (y1 - y2) / 2;
    const yp = -1 * Math.sin(psi) * (x1 - x2) / 2 + Math.cos(psi) * (y1 - y2) / 2;
    const lambda = xp * xp / (rx * rx) + yp * yp / (ry * ry);
    if (lambda > 1) {
      rx *= Math.sqrt(lambda);
      ry *= Math.sqrt(lambda);
    }
    let f = Math.sqrt((rx * rx * (ry * ry) - rx * rx * (yp * yp) - ry * ry * (xp * xp)) / (rx * rx * (yp * yp) + ry * ry * (xp * xp)));
    if (fa === fs2) {
      f *= -1;
    }
    if (isNaN(f)) {
      f = 0;
    }
    const cxp = f * rx * yp / ry;
    const cyp = f * -ry * xp / rx;
    const cx = (x1 + x2) / 2 + Math.cos(psi) * cxp - Math.sin(psi) * cyp;
    const cy = (y1 + y2) / 2 + Math.sin(psi) * cxp + Math.cos(psi) * cyp;
    const vMag = function(v2) {
      return Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
    };
    const vRatio = function(u2, v2) {
      return (u2[0] * v2[0] + u2[1] * v2[1]) / (vMag(u2) * vMag(v2));
    };
    const vAngle = function(u2, v2) {
      return (u2[0] * v2[1] < u2[1] * v2[0] ? -1 : 1) * Math.acos(vRatio(u2, v2));
    };
    const theta = vAngle([1, 0], [(xp - cxp) / rx, (yp - cyp) / ry]);
    const u = [(xp - cxp) / rx, (yp - cyp) / ry];
    const v = [(-1 * xp - cxp) / rx, (-1 * yp - cyp) / ry];
    let dTheta = vAngle(u, v);
    if (vRatio(u, v) <= -1) {
      dTheta = Math.PI;
    }
    if (vRatio(u, v) >= 1) {
      dTheta = 0;
    }
    if (fs2 === 0 && dTheta > 0) {
      dTheta = dTheta - 2 * Math.PI;
    }
    if (fs2 === 1 && dTheta < 0) {
      dTheta = dTheta + 2 * Math.PI;
    }
    return [cx, cy, rx, ry, theta, dTheta, psi, fs2];
  }
}
Path.prototype.className = "Path";
Path.prototype._attrsAffectingSize = ["data"];
_registerNode(Path);
Factory.addGetterSetter(Path, "data");
class Arrow extends Line {
  _sceneFunc(ctx) {
    super._sceneFunc(ctx);
    const PI2 = Math.PI * 2;
    const points = this.points();
    let tp = points;
    const fromTension = this.tension() !== 0 && points.length > 4;
    if (fromTension) {
      tp = this.getTensionPoints();
    }
    const length = this.pointerLength();
    const n = points.length;
    let dx, dy;
    if (fromTension) {
      const lp = [
        tp[tp.length - 4],
        tp[tp.length - 3],
        tp[tp.length - 2],
        tp[tp.length - 1],
        points[n - 2],
        points[n - 1]
      ];
      const lastLength = Path.calcLength(tp[tp.length - 4], tp[tp.length - 3], "C", lp);
      const previous = Path.getPointOnQuadraticBezier(Math.min(1, 1 - length / lastLength), lp[0], lp[1], lp[2], lp[3], lp[4], lp[5]);
      dx = points[n - 2] - previous.x;
      dy = points[n - 1] - previous.y;
    } else {
      dx = points[n - 2] - points[n - 4];
      dy = points[n - 1] - points[n - 3];
    }
    const radians = (Math.atan2(dy, dx) + PI2) % PI2;
    const width = this.pointerWidth();
    if (this.pointerAtEnding()) {
      ctx.save();
      ctx.beginPath();
      ctx.translate(points[n - 2], points[n - 1]);
      ctx.rotate(radians);
      ctx.moveTo(0, 0);
      ctx.lineTo(-length, width / 2);
      ctx.lineTo(-length, -width / 2);
      ctx.closePath();
      ctx.restore();
      this.__fillStroke(ctx);
    }
    if (this.pointerAtBeginning()) {
      ctx.save();
      ctx.beginPath();
      ctx.translate(points[0], points[1]);
      if (fromTension) {
        dx = (tp[0] + tp[2]) / 2 - points[0];
        dy = (tp[1] + tp[3]) / 2 - points[1];
      } else {
        dx = points[2] - points[0];
        dy = points[3] - points[1];
      }
      ctx.rotate((Math.atan2(-dy, -dx) + PI2) % PI2);
      ctx.moveTo(0, 0);
      ctx.lineTo(-length, width / 2);
      ctx.lineTo(-length, -width / 2);
      ctx.closePath();
      ctx.restore();
      this.__fillStroke(ctx);
    }
  }
  __fillStroke(ctx) {
    const isDashEnabled = this.dashEnabled();
    if (isDashEnabled) {
      this.attrs.dashEnabled = false;
      ctx.setLineDash([]);
    }
    ctx.fillStrokeShape(this);
    if (isDashEnabled) {
      this.attrs.dashEnabled = true;
    }
  }
  getSelfRect() {
    const lineRect = super.getSelfRect();
    const offset = this.pointerWidth() / 2;
    return {
      x: lineRect.x,
      y: lineRect.y - offset,
      width: lineRect.width,
      height: lineRect.height + offset * 2
    };
  }
}
Arrow.prototype.className = "Arrow";
_registerNode(Arrow);
Factory.addGetterSetter(Arrow, "pointerLength", 10, getNumberValidator());
Factory.addGetterSetter(Arrow, "pointerWidth", 10, getNumberValidator());
Factory.addGetterSetter(Arrow, "pointerAtBeginning", false);
Factory.addGetterSetter(Arrow, "pointerAtEnding", true);
class Circle extends Shape {
  _sceneFunc(context) {
    context.beginPath();
    context.arc(0, 0, this.attrs.radius || 0, 0, Math.PI * 2, false);
    context.closePath();
    context.fillStrokeShape(this);
  }
  getWidth() {
    return this.radius() * 2;
  }
  getHeight() {
    return this.radius() * 2;
  }
  setWidth(width) {
    if (this.radius() !== width / 2) {
      this.radius(width / 2);
    }
  }
  setHeight(height) {
    if (this.radius() !== height / 2) {
      this.radius(height / 2);
    }
  }
}
Circle.prototype._centroid = true;
Circle.prototype.className = "Circle";
Circle.prototype._attrsAffectingSize = ["radius"];
_registerNode(Circle);
Factory.addGetterSetter(Circle, "radius", 0, getNumberValidator());
class Ellipse extends Shape {
  _sceneFunc(context) {
    const rx = this.radiusX(), ry = this.radiusY();
    context.beginPath();
    context.save();
    if (rx !== ry) {
      context.scale(1, ry / rx);
    }
    context.arc(0, 0, rx, 0, Math.PI * 2, false);
    context.restore();
    context.closePath();
    context.fillStrokeShape(this);
  }
  getWidth() {
    return this.radiusX() * 2;
  }
  getHeight() {
    return this.radiusY() * 2;
  }
  setWidth(width) {
    this.radiusX(width / 2);
  }
  setHeight(height) {
    this.radiusY(height / 2);
  }
}
Ellipse.prototype.className = "Ellipse";
Ellipse.prototype._centroid = true;
Ellipse.prototype._attrsAffectingSize = ["radiusX", "radiusY"];
_registerNode(Ellipse);
Factory.addComponentsGetterSetter(Ellipse, "radius", ["x", "y"]);
Factory.addGetterSetter(Ellipse, "radiusX", 0, getNumberValidator());
Factory.addGetterSetter(Ellipse, "radiusY", 0, getNumberValidator());
let Image$1 = class Image2 extends Shape {
  constructor(attrs) {
    super(attrs);
    this._loadListener = () => {
      this._requestDraw();
    };
    this.on("imageChange.konva", (props) => {
      this._removeImageLoad(props.oldVal);
      this._setImageLoad();
    });
    this._setImageLoad();
  }
  _setImageLoad() {
    const image = this.image();
    if (image && image.complete) {
      return;
    }
    if (image && image.readyState === 4) {
      return;
    }
    if (image && image["addEventListener"]) {
      image["addEventListener"]("load", this._loadListener);
    }
  }
  _removeImageLoad(image) {
    if (image && image["removeEventListener"]) {
      image["removeEventListener"]("load", this._loadListener);
    }
  }
  destroy() {
    this._removeImageLoad(this.image());
    super.destroy();
    return this;
  }
  _useBufferCanvas() {
    const hasCornerRadius = !!this.cornerRadius();
    const hasShadow = this.hasShadow();
    if (hasCornerRadius && hasShadow) {
      return true;
    }
    return super._useBufferCanvas(true);
  }
  _sceneFunc(context) {
    const width = this.getWidth();
    const height = this.getHeight();
    const cornerRadius = this.cornerRadius();
    const image = this.attrs.image;
    let params;
    if (image) {
      const cropWidth = this.attrs.cropWidth;
      const cropHeight = this.attrs.cropHeight;
      if (cropWidth && cropHeight) {
        params = [
          image,
          this.cropX(),
          this.cropY(),
          cropWidth,
          cropHeight,
          0,
          0,
          width,
          height
        ];
      } else {
        params = [image, 0, 0, width, height];
      }
    }
    if (this.hasFill() || this.hasStroke() || cornerRadius) {
      context.beginPath();
      cornerRadius ? Util.drawRoundedRectPath(context, width, height, cornerRadius) : context.rect(0, 0, width, height);
      context.closePath();
      context.fillStrokeShape(this);
    }
    if (image) {
      if (cornerRadius) {
        context.clip();
      }
      context.drawImage.apply(context, params);
    }
  }
  _hitFunc(context) {
    const width = this.width(), height = this.height(), cornerRadius = this.cornerRadius();
    context.beginPath();
    if (!cornerRadius) {
      context.rect(0, 0, width, height);
    } else {
      Util.drawRoundedRectPath(context, width, height, cornerRadius);
    }
    context.closePath();
    context.fillStrokeShape(this);
  }
  getWidth() {
    var _a, _b, _c;
    return (_c = (_a = this.attrs.width) !== null && _a !== void 0 ? _a : (_b = this.image()) === null || _b === void 0 ? void 0 : _b.width) !== null && _c !== void 0 ? _c : 0;
  }
  getHeight() {
    var _a, _b, _c;
    return (_c = (_a = this.attrs.height) !== null && _a !== void 0 ? _a : (_b = this.image()) === null || _b === void 0 ? void 0 : _b.height) !== null && _c !== void 0 ? _c : 0;
  }
  static fromURL(url, callback, onError = null) {
    const img = Util.createImageElement();
    img.onload = function() {
      const image = new Image2({
        image: img
      });
      callback(image);
    };
    img.onerror = onError;
    img.crossOrigin = "Anonymous";
    img.src = url;
  }
};
Image$1.prototype.className = "Image";
Image$1.prototype._attrsAffectingSize = ["image"];
_registerNode(Image$1);
Factory.addGetterSetter(Image$1, "cornerRadius", 0, getNumberOrArrayOfNumbersValidator(4));
Factory.addGetterSetter(Image$1, "image");
Factory.addComponentsGetterSetter(Image$1, "crop", ["x", "y", "width", "height"]);
Factory.addGetterSetter(Image$1, "cropX", 0, getNumberValidator());
Factory.addGetterSetter(Image$1, "cropY", 0, getNumberValidator());
Factory.addGetterSetter(Image$1, "cropWidth", 0, getNumberValidator());
Factory.addGetterSetter(Image$1, "cropHeight", 0, getNumberValidator());
const ATTR_CHANGE_LIST$2 = [
  "fontFamily",
  "fontSize",
  "fontStyle",
  "padding",
  "lineHeight",
  "text",
  "width",
  "height",
  "pointerDirection",
  "pointerWidth",
  "pointerHeight"
], CHANGE_KONVA$1 = "Change.konva", NONE$1 = "none", UP = "up", RIGHT$1 = "right", DOWN = "down", LEFT$1 = "left", attrChangeListLen$1 = ATTR_CHANGE_LIST$2.length;
class Label extends Group {
  constructor(config) {
    super(config);
    this.on("add.konva", function(evt) {
      this._addListeners(evt.child);
      this._sync();
    });
  }
  getText() {
    return this.find("Text")[0];
  }
  getTag() {
    return this.find("Tag")[0];
  }
  _addListeners(text) {
    let that = this, n;
    const func = function() {
      that._sync();
    };
    for (n = 0; n < attrChangeListLen$1; n++) {
      text.on(ATTR_CHANGE_LIST$2[n] + CHANGE_KONVA$1, func);
    }
  }
  getWidth() {
    return this.getText().width();
  }
  getHeight() {
    return this.getText().height();
  }
  _sync() {
    let text = this.getText(), tag = this.getTag(), width, height, pointerDirection, pointerWidth, x, y, pointerHeight;
    if (text && tag) {
      width = text.width();
      height = text.height();
      pointerDirection = tag.pointerDirection();
      pointerWidth = tag.pointerWidth();
      pointerHeight = tag.pointerHeight();
      x = 0;
      y = 0;
      switch (pointerDirection) {
        case UP:
          x = width / 2;
          y = -1 * pointerHeight;
          break;
        case RIGHT$1:
          x = width + pointerWidth;
          y = height / 2;
          break;
        case DOWN:
          x = width / 2;
          y = height + pointerHeight;
          break;
        case LEFT$1:
          x = -1 * pointerWidth;
          y = height / 2;
          break;
      }
      tag.setAttrs({
        x: -1 * x,
        y: -1 * y,
        width,
        height
      });
      text.setAttrs({
        x: -1 * x,
        y: -1 * y
      });
    }
  }
}
Label.prototype.className = "Label";
_registerNode(Label);
class Tag extends Shape {
  _sceneFunc(context) {
    const width = this.width(), height = this.height(), pointerDirection = this.pointerDirection(), pointerWidth = this.pointerWidth(), pointerHeight = this.pointerHeight(), cornerRadius = this.cornerRadius();
    let topLeft = 0;
    let topRight = 0;
    let bottomLeft = 0;
    let bottomRight = 0;
    if (typeof cornerRadius === "number") {
      topLeft = topRight = bottomLeft = bottomRight = Math.min(cornerRadius, width / 2, height / 2);
    } else {
      topLeft = Math.min(cornerRadius[0] || 0, width / 2, height / 2);
      topRight = Math.min(cornerRadius[1] || 0, width / 2, height / 2);
      bottomRight = Math.min(cornerRadius[2] || 0, width / 2, height / 2);
      bottomLeft = Math.min(cornerRadius[3] || 0, width / 2, height / 2);
    }
    context.beginPath();
    context.moveTo(topLeft, 0);
    if (pointerDirection === UP) {
      context.lineTo((width - pointerWidth) / 2, 0);
      context.lineTo(width / 2, -1 * pointerHeight);
      context.lineTo((width + pointerWidth) / 2, 0);
    }
    context.lineTo(width - topRight, 0);
    context.arc(width - topRight, topRight, topRight, Math.PI * 3 / 2, 0, false);
    if (pointerDirection === RIGHT$1) {
      context.lineTo(width, (height - pointerHeight) / 2);
      context.lineTo(width + pointerWidth, height / 2);
      context.lineTo(width, (height + pointerHeight) / 2);
    }
    context.lineTo(width, height - bottomRight);
    context.arc(width - bottomRight, height - bottomRight, bottomRight, 0, Math.PI / 2, false);
    if (pointerDirection === DOWN) {
      context.lineTo((width + pointerWidth) / 2, height);
      context.lineTo(width / 2, height + pointerHeight);
      context.lineTo((width - pointerWidth) / 2, height);
    }
    context.lineTo(bottomLeft, height);
    context.arc(bottomLeft, height - bottomLeft, bottomLeft, Math.PI / 2, Math.PI, false);
    if (pointerDirection === LEFT$1) {
      context.lineTo(0, (height + pointerHeight) / 2);
      context.lineTo(-1 * pointerWidth, height / 2);
      context.lineTo(0, (height - pointerHeight) / 2);
    }
    context.lineTo(0, topLeft);
    context.arc(topLeft, topLeft, topLeft, Math.PI, Math.PI * 3 / 2, false);
    context.closePath();
    context.fillStrokeShape(this);
  }
  getSelfRect() {
    let x = 0, y = 0, pointerWidth = this.pointerWidth(), pointerHeight = this.pointerHeight(), direction = this.pointerDirection(), width = this.width(), height = this.height();
    if (direction === UP) {
      y -= pointerHeight;
      height += pointerHeight;
    } else if (direction === DOWN) {
      height += pointerHeight;
    } else if (direction === LEFT$1) {
      x -= pointerWidth * 1.5;
      width += pointerWidth;
    } else if (direction === RIGHT$1) {
      width += pointerWidth * 1.5;
    }
    return {
      x,
      y,
      width,
      height
    };
  }
}
Tag.prototype.className = "Tag";
_registerNode(Tag);
Factory.addGetterSetter(Tag, "pointerDirection", NONE$1);
Factory.addGetterSetter(Tag, "pointerWidth", 0, getNumberValidator());
Factory.addGetterSetter(Tag, "pointerHeight", 0, getNumberValidator());
Factory.addGetterSetter(Tag, "cornerRadius", 0, getNumberOrArrayOfNumbersValidator(4));
class Rect extends Shape {
  _sceneFunc(context) {
    const cornerRadius = this.cornerRadius(), width = this.width(), height = this.height();
    context.beginPath();
    if (!cornerRadius) {
      context.rect(0, 0, width, height);
    } else {
      Util.drawRoundedRectPath(context, width, height, cornerRadius);
    }
    context.closePath();
    context.fillStrokeShape(this);
  }
}
Rect.prototype.className = "Rect";
_registerNode(Rect);
Factory.addGetterSetter(Rect, "cornerRadius", 0, getNumberOrArrayOfNumbersValidator(4));
class RegularPolygon extends Shape {
  _sceneFunc(context) {
    const points = this._getPoints(), radius = this.radius(), sides = this.sides(), cornerRadius = this.cornerRadius();
    context.beginPath();
    if (!cornerRadius) {
      context.moveTo(points[0].x, points[0].y);
      for (let n = 1; n < points.length; n++) {
        context.lineTo(points[n].x, points[n].y);
      }
    } else {
      Util.drawRoundedPolygonPath(context, points, sides, radius, cornerRadius);
    }
    context.closePath();
    context.fillStrokeShape(this);
  }
  _getPoints() {
    const sides = this.attrs.sides;
    const radius = this.attrs.radius || 0;
    const points = [];
    for (let n = 0; n < sides; n++) {
      points.push({
        x: radius * Math.sin(n * 2 * Math.PI / sides),
        y: -1 * radius * Math.cos(n * 2 * Math.PI / sides)
      });
    }
    return points;
  }
  getSelfRect() {
    const points = this._getPoints();
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  getWidth() {
    return this.radius() * 2;
  }
  getHeight() {
    return this.radius() * 2;
  }
  setWidth(width) {
    this.radius(width / 2);
  }
  setHeight(height) {
    this.radius(height / 2);
  }
}
RegularPolygon.prototype.className = "RegularPolygon";
RegularPolygon.prototype._centroid = true;
RegularPolygon.prototype._attrsAffectingSize = ["radius"];
_registerNode(RegularPolygon);
Factory.addGetterSetter(RegularPolygon, "radius", 0, getNumberValidator());
Factory.addGetterSetter(RegularPolygon, "sides", 0, getNumberValidator());
Factory.addGetterSetter(RegularPolygon, "cornerRadius", 0, getNumberOrArrayOfNumbersValidator(4));
const PIx2 = Math.PI * 2;
class Ring extends Shape {
  _sceneFunc(context) {
    context.beginPath();
    context.arc(0, 0, this.innerRadius(), 0, PIx2, false);
    context.moveTo(this.outerRadius(), 0);
    context.arc(0, 0, this.outerRadius(), PIx2, 0, true);
    context.closePath();
    context.fillStrokeShape(this);
  }
  getWidth() {
    return this.outerRadius() * 2;
  }
  getHeight() {
    return this.outerRadius() * 2;
  }
  setWidth(width) {
    this.outerRadius(width / 2);
  }
  setHeight(height) {
    this.outerRadius(height / 2);
  }
}
Ring.prototype.className = "Ring";
Ring.prototype._centroid = true;
Ring.prototype._attrsAffectingSize = ["innerRadius", "outerRadius"];
_registerNode(Ring);
Factory.addGetterSetter(Ring, "innerRadius", 0, getNumberValidator());
Factory.addGetterSetter(Ring, "outerRadius", 0, getNumberValidator());
class Sprite extends Shape {
  constructor(config) {
    super(config);
    this._updated = true;
    this.anim = new Animation(() => {
      const updated = this._updated;
      this._updated = false;
      return updated;
    });
    this.on("animationChange.konva", function() {
      this.frameIndex(0);
    });
    this.on("frameIndexChange.konva", function() {
      this._updated = true;
    });
    this.on("frameRateChange.konva", function() {
      if (!this.anim.isRunning()) {
        return;
      }
      clearInterval(this.interval);
      this._setInterval();
    });
  }
  _sceneFunc(context) {
    const anim = this.animation(), index = this.frameIndex(), ix4 = index * 4, set = this.animations()[anim], offsets = this.frameOffsets(), x = set[ix4 + 0], y = set[ix4 + 1], width = set[ix4 + 2], height = set[ix4 + 3], image = this.image();
    if (this.hasFill() || this.hasStroke()) {
      context.beginPath();
      context.rect(0, 0, width, height);
      context.closePath();
      context.fillStrokeShape(this);
    }
    if (image) {
      if (offsets) {
        const offset = offsets[anim], ix2 = index * 2;
        context.drawImage(image, x, y, width, height, offset[ix2 + 0], offset[ix2 + 1], width, height);
      } else {
        context.drawImage(image, x, y, width, height, 0, 0, width, height);
      }
    }
  }
  _hitFunc(context) {
    const anim = this.animation(), index = this.frameIndex(), ix4 = index * 4, set = this.animations()[anim], offsets = this.frameOffsets(), width = set[ix4 + 2], height = set[ix4 + 3];
    context.beginPath();
    if (offsets) {
      const offset = offsets[anim];
      const ix2 = index * 2;
      context.rect(offset[ix2 + 0], offset[ix2 + 1], width, height);
    } else {
      context.rect(0, 0, width, height);
    }
    context.closePath();
    context.fillShape(this);
  }
  _useBufferCanvas() {
    return super._useBufferCanvas(true);
  }
  _setInterval() {
    const that = this;
    this.interval = setInterval(function() {
      that._updateIndex();
    }, 1e3 / this.frameRate());
  }
  start() {
    if (this.isRunning()) {
      return;
    }
    const layer = this.getLayer();
    this.anim.setLayers(layer);
    this._setInterval();
    this.anim.start();
  }
  stop() {
    this.anim.stop();
    clearInterval(this.interval);
  }
  isRunning() {
    return this.anim.isRunning();
  }
  _updateIndex() {
    const index = this.frameIndex(), animation = this.animation(), animations = this.animations(), anim = animations[animation], len = anim.length / 4;
    if (index < len - 1) {
      this.frameIndex(index + 1);
    } else {
      this.frameIndex(0);
    }
  }
}
Sprite.prototype.className = "Sprite";
_registerNode(Sprite);
Factory.addGetterSetter(Sprite, "animation");
Factory.addGetterSetter(Sprite, "animations");
Factory.addGetterSetter(Sprite, "frameOffsets");
Factory.addGetterSetter(Sprite, "image");
Factory.addGetterSetter(Sprite, "frameIndex", 0, getNumberValidator());
Factory.addGetterSetter(Sprite, "frameRate", 17, getNumberValidator());
Factory.backCompat(Sprite, {
  index: "frameIndex",
  getIndex: "getFrameIndex",
  setIndex: "setFrameIndex"
});
class Star extends Shape {
  _sceneFunc(context) {
    const innerRadius = this.innerRadius(), outerRadius = this.outerRadius(), numPoints = this.numPoints();
    context.beginPath();
    context.moveTo(0, 0 - outerRadius);
    for (let n = 1; n < numPoints * 2; n++) {
      const radius = n % 2 === 0 ? outerRadius : innerRadius;
      const x = radius * Math.sin(n * Math.PI / numPoints);
      const y = -1 * radius * Math.cos(n * Math.PI / numPoints);
      context.lineTo(x, y);
    }
    context.closePath();
    context.fillStrokeShape(this);
  }
  getWidth() {
    return this.outerRadius() * 2;
  }
  getHeight() {
    return this.outerRadius() * 2;
  }
  setWidth(width) {
    this.outerRadius(width / 2);
  }
  setHeight(height) {
    this.outerRadius(height / 2);
  }
}
Star.prototype.className = "Star";
Star.prototype._centroid = true;
Star.prototype._attrsAffectingSize = ["innerRadius", "outerRadius"];
_registerNode(Star);
Factory.addGetterSetter(Star, "numPoints", 5, getNumberValidator());
Factory.addGetterSetter(Star, "innerRadius", 0, getNumberValidator());
Factory.addGetterSetter(Star, "outerRadius", 0, getNumberValidator());
function stringToArray(string) {
  return [...string].reduce((acc, char, index, array) => {
    if (new RegExp("\\p{Emoji}", "u").test(char)) {
      const nextChar = array[index + 1];
      if (nextChar && new RegExp("\\p{Emoji_Modifier}|\\u200D", "u").test(nextChar)) {
        acc.push(char + nextChar);
        array[index + 1] = "";
      } else {
        acc.push(char);
      }
    } else if (new RegExp("\\p{Regional_Indicator}{2}", "u").test(char + (array[index + 1] || ""))) {
      acc.push(char + array[index + 1]);
    } else if (index > 0 && new RegExp("\\p{Mn}|\\p{Me}|\\p{Mc}", "u").test(char)) {
      acc[acc.length - 1] += char;
    } else if (char) {
      acc.push(char);
    }
    return acc;
  }, []);
}
const AUTO = "auto", CENTER = "center", INHERIT = "inherit", JUSTIFY = "justify", CHANGE_KONVA = "Change.konva", CONTEXT_2D = "2d", DASH = "-", LEFT = "left", TEXT = "text", TEXT_UPPER = "Text", TOP = "top", BOTTOM = "bottom", MIDDLE = "middle", NORMAL$1 = "normal", PX_SPACE = "px ", SPACE = " ", RIGHT = "right", RTL = "rtl", WORD = "word", CHAR = "char", NONE = "none", ELLIPSIS = "…", ATTR_CHANGE_LIST$1 = [
  "direction",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontVariant",
  "padding",
  "align",
  "verticalAlign",
  "lineHeight",
  "text",
  "width",
  "height",
  "wrap",
  "ellipsis",
  "letterSpacing"
], attrChangeListLen = ATTR_CHANGE_LIST$1.length;
function normalizeFontFamily(fontFamily) {
  return fontFamily.split(",").map((family) => {
    family = family.trim();
    const hasSpace = family.indexOf(" ") >= 0;
    const hasQuotes = family.indexOf('"') >= 0 || family.indexOf("'") >= 0;
    if (hasSpace && !hasQuotes) {
      family = `"${family}"`;
    }
    return family;
  }).join(", ");
}
let dummyContext;
function getDummyContext() {
  if (dummyContext) {
    return dummyContext;
  }
  dummyContext = Util.createCanvasElement().getContext(CONTEXT_2D);
  return dummyContext;
}
function _fillFunc$1(context) {
  context.fillText(this._partialText, this._partialTextX, this._partialTextY);
}
function _strokeFunc$1(context) {
  context.setAttr("miterLimit", 2);
  context.strokeText(this._partialText, this._partialTextX, this._partialTextY);
}
function checkDefaultFill(config) {
  config = config || {};
  if (!config.fillLinearGradientColorStops && !config.fillRadialGradientColorStops && !config.fillPatternImage) {
    config.fill = config.fill || "black";
  }
  return config;
}
class Text extends Shape {
  constructor(config) {
    super(checkDefaultFill(config));
    this._partialTextX = 0;
    this._partialTextY = 0;
    for (let n = 0; n < attrChangeListLen; n++) {
      this.on(ATTR_CHANGE_LIST$1[n] + CHANGE_KONVA, this._setTextData);
    }
    this._setTextData();
  }
  _sceneFunc(context) {
    var _a, _b;
    const textArr = this.textArr, textArrLen = textArr.length;
    if (!this.text()) {
      return;
    }
    let padding = this.padding(), fontSize = this.fontSize(), lineHeightPx = this.lineHeight() * fontSize, verticalAlign = this.verticalAlign(), direction = this.direction(), alignY = 0, align = this.align(), totalWidth = this.getWidth(), letterSpacing = this.letterSpacing(), charRenderFunc = this.charRenderFunc(), fill = this.fill(), textDecoration = this.textDecoration(), underlineOffset = this.underlineOffset(), shouldUnderline = textDecoration.indexOf("underline") !== -1, shouldLineThrough = textDecoration.indexOf("line-through") !== -1, n;
    direction = direction === INHERIT ? context.direction : direction;
    let translateY = lineHeightPx / 2;
    let baseline = MIDDLE;
    if (!Konva$1.legacyTextRendering) {
      const metrics = this.measureSize("M");
      baseline = "alphabetic";
      const ascent = (_a = metrics.fontBoundingBoxAscent) !== null && _a !== void 0 ? _a : metrics.actualBoundingBoxAscent;
      const descent = (_b = metrics.fontBoundingBoxDescent) !== null && _b !== void 0 ? _b : metrics.actualBoundingBoxDescent;
      translateY = (ascent - descent) / 2 + lineHeightPx / 2;
    }
    if (direction === RTL) {
      context.setAttr("direction", direction);
    }
    context.setAttr("font", this._getContextFont());
    context.setAttr("textBaseline", baseline);
    context.setAttr("textAlign", LEFT);
    if (verticalAlign === MIDDLE) {
      alignY = (this.getHeight() - textArrLen * lineHeightPx - padding * 2) / 2;
    } else if (verticalAlign === BOTTOM) {
      alignY = this.getHeight() - textArrLen * lineHeightPx - padding * 2;
    }
    context.translate(padding, alignY + padding);
    for (n = 0; n < textArrLen; n++) {
      let lineTranslateX = 0;
      let lineTranslateY = 0;
      const obj = textArr[n], text = obj.text, width = obj.width, lastLine = obj.lastInParagraph;
      context.save();
      if (align === RIGHT) {
        lineTranslateX += totalWidth - width - padding * 2;
      } else if (align === CENTER) {
        lineTranslateX += (totalWidth - width - padding * 2) / 2;
      }
      if (shouldUnderline) {
        context.save();
        context.beginPath();
        const yOffset = underlineOffset !== null && underlineOffset !== void 0 ? underlineOffset : !Konva$1.legacyTextRendering ? Math.round(fontSize / 4) : Math.round(fontSize / 2);
        const x = lineTranslateX;
        const y = translateY + lineTranslateY + yOffset;
        context.moveTo(x, y);
        const lineWidth = align === JUSTIFY && !lastLine ? totalWidth - padding * 2 : width;
        context.lineTo(x + Math.round(lineWidth), y);
        context.lineWidth = fontSize / 15;
        const gradient = this._getLinearGradient();
        context.strokeStyle = gradient || fill;
        context.stroke();
        context.restore();
      }
      const lineThroughStartX = lineTranslateX;
      if (direction !== RTL && (letterSpacing !== 0 || align === JUSTIFY || charRenderFunc)) {
        const spacesNumber = text.split(" ").length - 1;
        const array = stringToArray(text);
        for (let li = 0; li < array.length; li++) {
          const letter = array[li];
          if (letter === " " && !lastLine && align === JUSTIFY) {
            lineTranslateX += (totalWidth - padding * 2 - width) / spacesNumber;
          }
          this._partialTextX = lineTranslateX;
          this._partialTextY = translateY + lineTranslateY;
          this._partialText = letter;
          if (charRenderFunc) {
            context.save();
            const previousLines = textArr.slice(0, n);
            const previousGraphemes = previousLines.reduce((acc, line) => acc + stringToArray(line.text).length, 0);
            const charIndex = li + previousGraphemes;
            charRenderFunc({
              char: letter,
              index: charIndex,
              x: lineTranslateX,
              y: translateY + lineTranslateY,
              lineIndex: n,
              column: li,
              isLastInLine: lastLine,
              width: this.measureSize(letter).width,
              context
            });
          }
          context.fillStrokeShape(this);
          if (charRenderFunc) {
            context.restore();
          }
          lineTranslateX += this.measureSize(letter).width + letterSpacing;
        }
      } else {
        if (letterSpacing !== 0) {
          context.setAttr("letterSpacing", `${letterSpacing}px`);
        }
        this._partialTextX = lineTranslateX;
        this._partialTextY = translateY + lineTranslateY;
        this._partialText = text;
        context.fillStrokeShape(this);
      }
      if (shouldLineThrough) {
        context.save();
        context.beginPath();
        const yOffset = !Konva$1.legacyTextRendering ? -Math.round(fontSize / 4) : 0;
        const x = lineThroughStartX;
        context.moveTo(x, translateY + lineTranslateY + yOffset);
        const lineWidth = align === JUSTIFY && !lastLine ? totalWidth - padding * 2 : width;
        context.lineTo(x + Math.round(lineWidth), translateY + lineTranslateY + yOffset);
        context.lineWidth = fontSize / 15;
        const gradient = this._getLinearGradient();
        context.strokeStyle = gradient || fill;
        context.stroke();
        context.restore();
      }
      context.restore();
      if (textArrLen > 1) {
        translateY += lineHeightPx;
      }
    }
  }
  _hitFunc(context) {
    const width = this.getWidth(), height = this.getHeight();
    context.beginPath();
    context.rect(0, 0, width, height);
    context.closePath();
    context.fillStrokeShape(this);
  }
  setText(text) {
    const str = Util._isString(text) ? text : text === null || text === void 0 ? "" : text + "";
    this._setAttr(TEXT, str);
    return this;
  }
  getWidth() {
    const isAuto = this.attrs.width === AUTO || this.attrs.width === void 0;
    return isAuto ? this.getTextWidth() + this.padding() * 2 : this.attrs.width;
  }
  getHeight() {
    const isAuto = this.attrs.height === AUTO || this.attrs.height === void 0;
    return isAuto ? this.fontSize() * this.textArr.length * this.lineHeight() + this.padding() * 2 : this.attrs.height;
  }
  getTextWidth() {
    return this.textWidth;
  }
  getTextHeight() {
    Util.warn("text.getTextHeight() method is deprecated. Use text.height() - for full height and text.fontSize() - for one line height.");
    return this.textHeight;
  }
  measureSize(text) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    let _context = getDummyContext(), fontSize = this.fontSize(), metrics;
    _context.save();
    _context.font = this._getContextFont();
    metrics = _context.measureText(text);
    _context.restore();
    const scaleFactor = fontSize / 100;
    return {
      actualBoundingBoxAscent: (_a = metrics.actualBoundingBoxAscent) !== null && _a !== void 0 ? _a : 71.58203125 * scaleFactor,
      actualBoundingBoxDescent: (_b = metrics.actualBoundingBoxDescent) !== null && _b !== void 0 ? _b : 0,
      actualBoundingBoxLeft: (_c = metrics.actualBoundingBoxLeft) !== null && _c !== void 0 ? _c : -7.421875 * scaleFactor,
      actualBoundingBoxRight: (_d = metrics.actualBoundingBoxRight) !== null && _d !== void 0 ? _d : 75.732421875 * scaleFactor,
      alphabeticBaseline: (_e = metrics.alphabeticBaseline) !== null && _e !== void 0 ? _e : 0,
      emHeightAscent: (_f = metrics.emHeightAscent) !== null && _f !== void 0 ? _f : 100 * scaleFactor,
      emHeightDescent: (_g = metrics.emHeightDescent) !== null && _g !== void 0 ? _g : -20 * scaleFactor,
      fontBoundingBoxAscent: (_h = metrics.fontBoundingBoxAscent) !== null && _h !== void 0 ? _h : 91 * scaleFactor,
      fontBoundingBoxDescent: (_j = metrics.fontBoundingBoxDescent) !== null && _j !== void 0 ? _j : 21 * scaleFactor,
      hangingBaseline: (_k = metrics.hangingBaseline) !== null && _k !== void 0 ? _k : 72.80000305175781 * scaleFactor,
      ideographicBaseline: (_l = metrics.ideographicBaseline) !== null && _l !== void 0 ? _l : -21 * scaleFactor,
      width: metrics.width,
      height: fontSize
    };
  }
  _getContextFont() {
    return this.fontStyle() + SPACE + this.fontVariant() + SPACE + (this.fontSize() + PX_SPACE) + normalizeFontFamily(this.fontFamily());
  }
  _addTextLine(line) {
    const align = this.align();
    if (align === JUSTIFY) {
      line = line.trim();
    }
    const width = this._getTextWidth(line);
    return this.textArr.push({
      text: line,
      width,
      lastInParagraph: false
    });
  }
  _getTextWidth(text) {
    const letterSpacing = this.letterSpacing();
    const length = text.length;
    return getDummyContext().measureText(text).width + letterSpacing * length;
  }
  _setTextData() {
    let lines = this.text().split("\n"), fontSize = +this.fontSize(), textWidth = 0, lineHeightPx = this.lineHeight() * fontSize, width = this.attrs.width, height = this.attrs.height, fixedWidth = width !== AUTO && width !== void 0, fixedHeight = height !== AUTO && height !== void 0, padding = this.padding(), maxWidth = width - padding * 2, maxHeightPx = height - padding * 2, currentHeightPx = 0, wrap = this.wrap(), shouldWrap = wrap !== NONE, wrapAtWord = wrap !== CHAR && shouldWrap, shouldAddEllipsis = this.ellipsis();
    this.textArr = [];
    getDummyContext().font = this._getContextFont();
    const additionalWidth = shouldAddEllipsis ? this._getTextWidth(ELLIPSIS) : 0;
    for (let i = 0, max = lines.length; i < max; ++i) {
      let line = lines[i];
      let lineWidth = this._getTextWidth(line);
      if (fixedWidth && lineWidth > maxWidth) {
        while (line.length > 0) {
          let low = 0, high = stringToArray(line).length, match = "", matchWidth = 0;
          while (low < high) {
            const mid = low + high >>> 1, lineArray = stringToArray(line), substr = lineArray.slice(0, mid + 1).join(""), substrWidth = this._getTextWidth(substr);
            const shouldConsiderEllipsis = shouldAddEllipsis && fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx;
            const effectiveWidth = shouldConsiderEllipsis ? substrWidth + additionalWidth : substrWidth;
            if (effectiveWidth <= maxWidth) {
              low = mid + 1;
              match = substr;
              matchWidth = substrWidth;
            } else {
              high = mid;
            }
          }
          if (match) {
            if (wrapAtWord) {
              const lineArray2 = stringToArray(line);
              const matchArray = stringToArray(match);
              const nextChar = lineArray2[matchArray.length];
              const nextIsSpaceOrDash = nextChar === SPACE || nextChar === DASH;
              let wrapIndex;
              if (nextIsSpaceOrDash && matchWidth <= maxWidth) {
                wrapIndex = matchArray.length;
              } else {
                const lastSpaceIndex = matchArray.lastIndexOf(SPACE);
                const lastDashIndex = matchArray.lastIndexOf(DASH);
                wrapIndex = Math.max(lastSpaceIndex, lastDashIndex) + 1;
              }
              if (wrapIndex > 0) {
                low = wrapIndex;
                match = lineArray2.slice(0, low).join("");
                matchWidth = this._getTextWidth(match);
              }
            }
            match = match.trimRight();
            this._addTextLine(match);
            textWidth = Math.max(textWidth, matchWidth);
            currentHeightPx += lineHeightPx;
            const shouldHandleEllipsis = this._shouldHandleEllipsis(currentHeightPx);
            if (shouldHandleEllipsis) {
              this._tryToAddEllipsisToLastLine();
              break;
            }
            const lineArray = stringToArray(line);
            line = lineArray.slice(low).join("").trimLeft();
            if (line.length > 0) {
              lineWidth = this._getTextWidth(line);
              if (lineWidth <= maxWidth) {
                this._addTextLine(line);
                currentHeightPx += lineHeightPx;
                textWidth = Math.max(textWidth, lineWidth);
                break;
              }
            }
          } else {
            break;
          }
        }
      } else {
        this._addTextLine(line);
        currentHeightPx += lineHeightPx;
        textWidth = Math.max(textWidth, lineWidth);
        if (this._shouldHandleEllipsis(currentHeightPx) && i < max - 1) {
          this._tryToAddEllipsisToLastLine();
        }
      }
      if (this.textArr[this.textArr.length - 1]) {
        this.textArr[this.textArr.length - 1].lastInParagraph = true;
      }
      if (fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx) {
        break;
      }
    }
    this.textHeight = fontSize;
    this.textWidth = textWidth;
  }
  _shouldHandleEllipsis(currentHeightPx) {
    const fontSize = +this.fontSize(), lineHeightPx = this.lineHeight() * fontSize, height = this.attrs.height, fixedHeight = height !== AUTO && height !== void 0, padding = this.padding(), maxHeightPx = height - padding * 2, wrap = this.wrap(), shouldWrap = wrap !== NONE;
    return !shouldWrap || fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx;
  }
  _tryToAddEllipsisToLastLine() {
    const width = this.attrs.width, fixedWidth = width !== AUTO && width !== void 0, padding = this.padding(), maxWidth = width - padding * 2, shouldAddEllipsis = this.ellipsis();
    const lastLine = this.textArr[this.textArr.length - 1];
    if (!lastLine || !shouldAddEllipsis) {
      return;
    }
    if (fixedWidth) {
      const haveSpace = this._getTextWidth(lastLine.text + ELLIPSIS) < maxWidth;
      if (!haveSpace) {
        lastLine.text = lastLine.text.slice(0, lastLine.text.length - 3);
      }
    }
    this.textArr.splice(this.textArr.length - 1, 1);
    this._addTextLine(lastLine.text + ELLIPSIS);
  }
  getStrokeScaleEnabled() {
    return true;
  }
  _useBufferCanvas() {
    const hasLine = this.textDecoration().indexOf("underline") !== -1 || this.textDecoration().indexOf("line-through") !== -1;
    const hasShadow = this.hasShadow();
    if (hasLine && hasShadow) {
      return true;
    }
    return super._useBufferCanvas();
  }
}
Text.prototype._fillFunc = _fillFunc$1;
Text.prototype._strokeFunc = _strokeFunc$1;
Text.prototype.className = TEXT_UPPER;
Text.prototype._attrsAffectingSize = [
  "text",
  "fontSize",
  "padding",
  "wrap",
  "lineHeight",
  "letterSpacing"
];
_registerNode(Text);
Factory.overWriteSetter(Text, "width", getNumberOrAutoValidator());
Factory.overWriteSetter(Text, "height", getNumberOrAutoValidator());
Factory.addGetterSetter(Text, "direction", INHERIT);
Factory.addGetterSetter(Text, "fontFamily", "Arial");
Factory.addGetterSetter(Text, "fontSize", 12, getNumberValidator());
Factory.addGetterSetter(Text, "fontStyle", NORMAL$1);
Factory.addGetterSetter(Text, "fontVariant", NORMAL$1);
Factory.addGetterSetter(Text, "padding", 0, getNumberValidator());
Factory.addGetterSetter(Text, "align", LEFT);
Factory.addGetterSetter(Text, "verticalAlign", TOP);
Factory.addGetterSetter(Text, "lineHeight", 1, getNumberValidator());
Factory.addGetterSetter(Text, "wrap", WORD);
Factory.addGetterSetter(Text, "ellipsis", false, getBooleanValidator());
Factory.addGetterSetter(Text, "letterSpacing", 0, getNumberValidator());
Factory.addGetterSetter(Text, "text", "", getStringValidator());
Factory.addGetterSetter(Text, "textDecoration", "");
Factory.addGetterSetter(Text, "underlineOffset", void 0, getNumberValidator());
Factory.addGetterSetter(Text, "charRenderFunc", void 0);
const EMPTY_STRING = "", NORMAL = "normal";
function _fillFunc(context) {
  context.fillText(this.partialText, 0, 0);
}
function _strokeFunc(context) {
  context.strokeText(this.partialText, 0, 0);
}
class TextPath extends Shape {
  constructor(config) {
    super(config);
    this.dummyCanvas = Util.createCanvasElement();
    this.dataArray = [];
    this._readDataAttribute();
    this.on("dataChange.konva", function() {
      this._readDataAttribute();
      this._setTextData();
    });
    this.on("textChange.konva alignChange.konva letterSpacingChange.konva kerningFuncChange.konva fontSizeChange.konva fontFamilyChange.konva", this._setTextData);
    this._setTextData();
  }
  _getTextPathLength() {
    return Path.getPathLength(this.dataArray);
  }
  _getPointAtLength(length) {
    if (!this.attrs.data) {
      return null;
    }
    const totalLength = this.pathLength;
    if (length > totalLength) {
      return null;
    }
    return Path.getPointAtLengthOfDataArray(length, this.dataArray);
  }
  _readDataAttribute() {
    this.dataArray = Path.parsePathData(this.attrs.data);
    this.pathLength = this._getTextPathLength();
  }
  _sceneFunc(context) {
    context.setAttr("font", this._getContextFont());
    context.setAttr("textBaseline", this.textBaseline());
    context.setAttr("textAlign", "left");
    context.save();
    const textDecoration = this.textDecoration();
    const fill = this.fill();
    const fontSize = this.fontSize();
    const glyphInfo = this.glyphInfo;
    const hasUnderline = textDecoration.indexOf("underline") !== -1;
    const hasLineThrough = textDecoration.indexOf("line-through") !== -1;
    if (hasUnderline) {
      context.beginPath();
    }
    for (let i = 0; i < glyphInfo.length; i++) {
      context.save();
      const p0 = glyphInfo[i].p0;
      context.translate(p0.x, p0.y);
      context.rotate(glyphInfo[i].rotation);
      this.partialText = glyphInfo[i].text;
      context.fillStrokeShape(this);
      if (hasUnderline) {
        if (i === 0) {
          context.moveTo(0, fontSize / 2 + 1);
        }
        context.lineTo(glyphInfo[i].width, fontSize / 2 + 1);
      }
      context.restore();
    }
    if (hasUnderline) {
      context.strokeStyle = fill;
      context.lineWidth = fontSize / 20;
      context.stroke();
    }
    if (hasLineThrough) {
      context.beginPath();
      for (let i = 0; i < glyphInfo.length; i++) {
        context.save();
        const p0 = glyphInfo[i].p0;
        context.translate(p0.x, p0.y);
        context.rotate(glyphInfo[i].rotation);
        if (i === 0) {
          context.moveTo(0, 0);
        }
        context.lineTo(glyphInfo[i].width, 0);
        context.restore();
      }
      context.strokeStyle = fill;
      context.lineWidth = fontSize / 20;
      context.stroke();
    }
    context.restore();
  }
  _hitFunc(context) {
    context.beginPath();
    const glyphInfo = this.glyphInfo;
    if (glyphInfo.length >= 1) {
      const p0 = glyphInfo[0].p0;
      context.moveTo(p0.x, p0.y);
    }
    for (let i = 0; i < glyphInfo.length; i++) {
      const p1 = glyphInfo[i].p1;
      context.lineTo(p1.x, p1.y);
    }
    context.setAttr("lineWidth", this.fontSize());
    context.setAttr("strokeStyle", this.colorKey);
    context.stroke();
  }
  getTextWidth() {
    return this.textWidth;
  }
  getTextHeight() {
    Util.warn("text.getTextHeight() method is deprecated. Use text.height() - for full height and text.fontSize() - for one line height.");
    return this.textHeight;
  }
  setText(text) {
    return Text.prototype.setText.call(this, text);
  }
  _getContextFont() {
    return Text.prototype._getContextFont.call(this);
  }
  _getTextSize(text) {
    const dummyCanvas = this.dummyCanvas;
    const _context = dummyCanvas.getContext("2d");
    _context.save();
    _context.font = this._getContextFont();
    const metrics = _context.measureText(text);
    _context.restore();
    return {
      width: metrics.width,
      height: parseInt(`${this.fontSize()}`, 10)
    };
  }
  _setTextData() {
    const charArr = stringToArray(this.text());
    const chars = [];
    let width = 0;
    for (let i = 0; i < charArr.length; i++) {
      chars.push({
        char: charArr[i],
        width: this._getTextSize(charArr[i]).width
      });
      width += chars[i].width;
    }
    const { height } = this._getTextSize(this.attrs.text);
    this.textWidth = width;
    this.textHeight = height;
    this.glyphInfo = [];
    if (!this.attrs.data) {
      return null;
    }
    const letterSpacing = this.letterSpacing();
    const align = this.align();
    const kerningFunc = this.kerningFunc();
    const textWidth = Math.max(this.textWidth + ((this.attrs.text || "").length - 1) * letterSpacing, 0);
    let offset = 0;
    if (align === "center") {
      offset = Math.max(0, this.pathLength / 2 - textWidth / 2);
    }
    if (align === "right") {
      offset = Math.max(0, this.pathLength - textWidth);
    }
    let offsetToGlyph = offset;
    for (let i = 0; i < chars.length; i++) {
      const charStartPoint = this._getPointAtLength(offsetToGlyph);
      if (!charStartPoint)
        return;
      const char = chars[i].char;
      let glyphWidth = chars[i].width + letterSpacing;
      if (char === " " && align === "justify") {
        const numberOfSpaces = this.text().split(" ").length - 1;
        glyphWidth += (this.pathLength - textWidth) / numberOfSpaces;
      }
      const charEndPoint = this._getPointAtLength(offsetToGlyph + glyphWidth);
      if (!charEndPoint) {
        return;
      }
      const width2 = Path.getLineLength(charStartPoint.x, charStartPoint.y, charEndPoint.x, charEndPoint.y);
      let kern = 0;
      if (kerningFunc) {
        try {
          kern = kerningFunc(chars[i - 1].char, char) * this.fontSize();
        } catch (e) {
          kern = 0;
        }
      }
      charStartPoint.x += kern;
      charEndPoint.x += kern;
      this.textWidth += kern;
      const midpoint = Path.getPointOnLine(kern + width2 / 2, charStartPoint.x, charStartPoint.y, charEndPoint.x, charEndPoint.y);
      const rotation = Math.atan2(charEndPoint.y - charStartPoint.y, charEndPoint.x - charStartPoint.x);
      this.glyphInfo.push({
        transposeX: midpoint.x,
        transposeY: midpoint.y,
        text: charArr[i],
        rotation,
        p0: charStartPoint,
        p1: charEndPoint,
        width: width2
      });
      offsetToGlyph += glyphWidth;
    }
  }
  getSelfRect() {
    if (!this.glyphInfo.length) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }
    const points = [];
    this.glyphInfo.forEach(function(info) {
      points.push(info.p0.x);
      points.push(info.p0.y);
      points.push(info.p1.x);
      points.push(info.p1.y);
    });
    let minX = points[0] || 0;
    let maxX = points[0] || 0;
    let minY = points[1] || 0;
    let maxY = points[1] || 0;
    let x, y;
    for (let i = 0; i < points.length / 2; i++) {
      x = points[i * 2];
      y = points[i * 2 + 1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const fontSize = this.fontSize();
    return {
      x: minX - fontSize / 2,
      y: minY - fontSize / 2,
      width: maxX - minX + fontSize,
      height: maxY - minY + fontSize
    };
  }
  destroy() {
    Util.releaseCanvas(this.dummyCanvas);
    return super.destroy();
  }
}
TextPath.prototype._fillFunc = _fillFunc;
TextPath.prototype._strokeFunc = _strokeFunc;
TextPath.prototype._fillFuncHit = _fillFunc;
TextPath.prototype._strokeFuncHit = _strokeFunc;
TextPath.prototype.className = "TextPath";
TextPath.prototype._attrsAffectingSize = ["text", "fontSize", "data"];
_registerNode(TextPath);
Factory.addGetterSetter(TextPath, "data");
Factory.addGetterSetter(TextPath, "fontFamily", "Arial");
Factory.addGetterSetter(TextPath, "fontSize", 12, getNumberValidator());
Factory.addGetterSetter(TextPath, "fontStyle", NORMAL);
Factory.addGetterSetter(TextPath, "align", "left");
Factory.addGetterSetter(TextPath, "letterSpacing", 0, getNumberValidator());
Factory.addGetterSetter(TextPath, "textBaseline", "middle");
Factory.addGetterSetter(TextPath, "fontVariant", NORMAL);
Factory.addGetterSetter(TextPath, "text", EMPTY_STRING);
Factory.addGetterSetter(TextPath, "textDecoration", "");
Factory.addGetterSetter(TextPath, "kerningFunc", void 0);
const EVENTS_NAME = "tr-konva";
const ATTR_CHANGE_LIST = [
  "resizeEnabledChange",
  "rotateAnchorOffsetChange",
  "rotateAnchorAngleChange",
  "rotateEnabledChange",
  "enabledAnchorsChange",
  "anchorSizeChange",
  "borderEnabledChange",
  "borderStrokeChange",
  "borderStrokeWidthChange",
  "borderDashChange",
  "anchorStrokeChange",
  "anchorStrokeWidthChange",
  "anchorFillChange",
  "anchorCornerRadiusChange",
  "ignoreStrokeChange",
  "anchorStyleFuncChange"
].map((e) => e + `.${EVENTS_NAME}`).join(" ");
const NODES_RECT = "nodesRect";
const TRANSFORM_CHANGE_STR = [
  "widthChange",
  "heightChange",
  "scaleXChange",
  "scaleYChange",
  "skewXChange",
  "skewYChange",
  "rotationChange",
  "offsetXChange",
  "offsetYChange",
  "transformsEnabledChange",
  "strokeWidthChange",
  "draggableChange"
];
const ANGLES = {
  "top-left": -45,
  "top-center": 0,
  "top-right": 45,
  "middle-right": -90,
  "middle-left": 90,
  "bottom-left": -135,
  "bottom-center": 180,
  "bottom-right": 135
};
const TOUCH_DEVICE = "ontouchstart" in Konva$1._global;
function getCursor(anchorName, rad, rotateCursor) {
  if (anchorName === "rotater") {
    return rotateCursor;
  }
  rad += Util.degToRad(ANGLES[anchorName] || 0);
  const angle = (Util.radToDeg(rad) % 360 + 360) % 360;
  if (Util._inRange(angle, 315 + 22.5, 360) || Util._inRange(angle, 0, 22.5)) {
    return "ns-resize";
  } else if (Util._inRange(angle, 45 - 22.5, 45 + 22.5)) {
    return "nesw-resize";
  } else if (Util._inRange(angle, 90 - 22.5, 90 + 22.5)) {
    return "ew-resize";
  } else if (Util._inRange(angle, 135 - 22.5, 135 + 22.5)) {
    return "nwse-resize";
  } else if (Util._inRange(angle, 180 - 22.5, 180 + 22.5)) {
    return "ns-resize";
  } else if (Util._inRange(angle, 225 - 22.5, 225 + 22.5)) {
    return "nesw-resize";
  } else if (Util._inRange(angle, 270 - 22.5, 270 + 22.5)) {
    return "ew-resize";
  } else if (Util._inRange(angle, 315 - 22.5, 315 + 22.5)) {
    return "nwse-resize";
  } else {
    Util.error("Transformer has unknown angle for cursor detection: " + angle);
    return "pointer";
  }
}
const ANCHORS_NAMES = [
  "top-left",
  "top-center",
  "top-right",
  "middle-right",
  "middle-left",
  "bottom-left",
  "bottom-center",
  "bottom-right"
];
function getCenter(shape) {
  return {
    x: shape.x + shape.width / 2 * Math.cos(shape.rotation) + shape.height / 2 * Math.sin(-shape.rotation),
    y: shape.y + shape.height / 2 * Math.cos(shape.rotation) + shape.width / 2 * Math.sin(shape.rotation)
  };
}
function rotateAroundPoint(shape, angleRad, point) {
  const x = point.x + (shape.x - point.x) * Math.cos(angleRad) - (shape.y - point.y) * Math.sin(angleRad);
  const y = point.y + (shape.x - point.x) * Math.sin(angleRad) + (shape.y - point.y) * Math.cos(angleRad);
  return {
    ...shape,
    rotation: shape.rotation + angleRad,
    x,
    y
  };
}
function rotateAroundCenter(shape, deltaRad) {
  const center = getCenter(shape);
  return rotateAroundPoint(shape, deltaRad, center);
}
function getSnap(snaps, newRotationRad, tol) {
  let snapped = newRotationRad;
  for (let i = 0; i < snaps.length; i++) {
    const angle = Konva$1.getAngle(snaps[i]);
    const absDiff = Math.abs(angle - newRotationRad) % (Math.PI * 2);
    const dif = Math.min(absDiff, Math.PI * 2 - absDiff);
    if (dif < tol) {
      snapped = angle;
    }
  }
  return snapped;
}
let activeTransformersCount = 0;
class Transformer extends Group {
  constructor(config) {
    super(config);
    this._movingAnchorName = null;
    this._transforming = false;
    this._createElements();
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this.update = this.update.bind(this);
    this.on(ATTR_CHANGE_LIST, this.update);
    if (this.getNode()) {
      this.update();
    }
  }
  attachTo(node) {
    this.setNode(node);
    return this;
  }
  setNode(node) {
    Util.warn("tr.setNode(shape), tr.node(shape) and tr.attachTo(shape) methods are deprecated. Please use tr.nodes(nodesArray) instead.");
    return this.setNodes([node]);
  }
  getNode() {
    return this._nodes && this._nodes[0];
  }
  _getEventNamespace() {
    return EVENTS_NAME + this._id;
  }
  setNodes(nodes = []) {
    if (this._nodes && this._nodes.length) {
      this.detach();
    }
    const filteredNodes = nodes.filter((node) => {
      if (node.isAncestorOf(this)) {
        Util.error("Konva.Transformer cannot be an a child of the node you are trying to attach");
        return false;
      }
      return true;
    });
    this._nodes = nodes = filteredNodes;
    if (nodes.length === 1 && this.useSingleNodeRotation()) {
      this.rotation(nodes[0].getAbsoluteRotation());
    } else {
      this.rotation(0);
    }
    this._nodes.forEach((node) => {
      const onChange = () => {
        if (this.nodes().length === 1 && this.useSingleNodeRotation()) {
          this.rotation(this.nodes()[0].getAbsoluteRotation());
        }
        this._resetTransformCache();
        if (!this._transforming && !this.isDragging()) {
          this.update();
        }
      };
      if (node._attrsAffectingSize.length) {
        const additionalEvents = node._attrsAffectingSize.map((prop) => prop + "Change." + this._getEventNamespace()).join(" ");
        node.on(additionalEvents, onChange);
      }
      node.on(TRANSFORM_CHANGE_STR.map((e) => e + `.${this._getEventNamespace()}`).join(" "), onChange);
      node.on(`absoluteTransformChange.${this._getEventNamespace()}`, onChange);
      this._proxyDrag(node);
    });
    this._resetTransformCache();
    const elementsCreated = !!this.findOne(".top-left");
    if (elementsCreated) {
      this.update();
    }
    return this;
  }
  _proxyDrag(node) {
    let lastPos;
    node.on(`dragstart.${this._getEventNamespace()}`, (e) => {
      lastPos = node.getAbsolutePosition();
      if (!this.isDragging() && node !== this.findOne(".back")) {
        this.startDrag(e, false);
      }
    });
    node.on(`dragmove.${this._getEventNamespace()}`, (e) => {
      if (!lastPos) {
        return;
      }
      const abs = node.getAbsolutePosition();
      const dx = abs.x - lastPos.x;
      const dy = abs.y - lastPos.y;
      this.nodes().forEach((otherNode) => {
        if (otherNode === node) {
          return;
        }
        if (otherNode.isDragging()) {
          return;
        }
        const otherAbs = otherNode.getAbsolutePosition();
        otherNode.setAbsolutePosition({
          x: otherAbs.x + dx,
          y: otherAbs.y + dy
        });
        otherNode.startDrag(e);
      });
      lastPos = null;
    });
  }
  getNodes() {
    return this._nodes || [];
  }
  getActiveAnchor() {
    return this._movingAnchorName;
  }
  detach() {
    if (this._nodes) {
      this._nodes.forEach((node) => {
        node.off("." + this._getEventNamespace());
      });
    }
    this._nodes = [];
    this._resetTransformCache();
  }
  _resetTransformCache() {
    this._clearCache(NODES_RECT);
    this._clearCache("transform");
    this._clearSelfAndDescendantCache("absoluteTransform");
  }
  _getNodeRect() {
    return this._getCache(NODES_RECT, this.__getNodeRect);
  }
  __getNodeShape(node, rot = this.rotation(), relative) {
    const rect = node.getClientRect({
      skipTransform: true,
      skipShadow: true,
      skipStroke: this.ignoreStroke()
    });
    const absScale = node.getAbsoluteScale(relative);
    const absPos = node.getAbsolutePosition(relative);
    const dx = rect.x * absScale.x - node.offsetX() * absScale.x;
    const dy = rect.y * absScale.y - node.offsetY() * absScale.y;
    const rotation = (Konva$1.getAngle(node.getAbsoluteRotation()) + Math.PI * 2) % (Math.PI * 2);
    const box = {
      x: absPos.x + dx * Math.cos(rotation) + dy * Math.sin(-rotation),
      y: absPos.y + dy * Math.cos(rotation) + dx * Math.sin(rotation),
      width: rect.width * absScale.x,
      height: rect.height * absScale.y,
      rotation
    };
    return rotateAroundPoint(box, -Konva$1.getAngle(rot), {
      x: 0,
      y: 0
    });
  }
  __getNodeRect() {
    const node = this.getNode();
    if (!node) {
      return {
        x: -1e8,
        y: -1e8,
        width: 0,
        height: 0,
        rotation: 0
      };
    }
    const totalPoints = [];
    this.nodes().map((node2) => {
      const box = node2.getClientRect({
        skipTransform: true,
        skipShadow: true,
        skipStroke: this.ignoreStroke()
      });
      const points = [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height }
      ];
      const trans = node2.getAbsoluteTransform();
      points.forEach(function(point) {
        const transformed = trans.point(point);
        totalPoints.push(transformed);
      });
    });
    const tr = new Transform();
    tr.rotate(-Konva$1.getAngle(this.rotation()));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    totalPoints.forEach(function(point) {
      const transformed = tr.point(point);
      if (minX === void 0) {
        minX = maxX = transformed.x;
        minY = maxY = transformed.y;
      }
      minX = Math.min(minX, transformed.x);
      minY = Math.min(minY, transformed.y);
      maxX = Math.max(maxX, transformed.x);
      maxY = Math.max(maxY, transformed.y);
    });
    tr.invert();
    const p = tr.point({ x: minX, y: minY });
    return {
      x: p.x,
      y: p.y,
      width: maxX - minX,
      height: maxY - minY,
      rotation: Konva$1.getAngle(this.rotation())
    };
  }
  getX() {
    return this._getNodeRect().x;
  }
  getY() {
    return this._getNodeRect().y;
  }
  getWidth() {
    return this._getNodeRect().width;
  }
  getHeight() {
    return this._getNodeRect().height;
  }
  _createElements() {
    this._createBack();
    ANCHORS_NAMES.forEach((name) => {
      this._createAnchor(name);
    });
    this._createAnchor("rotater");
  }
  _createAnchor(name) {
    const anchor = new Rect({
      stroke: "rgb(0, 161, 255)",
      fill: "white",
      strokeWidth: 1,
      name: name + " _anchor",
      dragDistance: 0,
      draggable: true,
      hitStrokeWidth: TOUCH_DEVICE ? 10 : "auto"
    });
    const self2 = this;
    anchor.on("mousedown touchstart", function(e) {
      self2._handleMouseDown(e);
    });
    anchor.on("dragstart", (e) => {
      anchor.stopDrag();
      e.cancelBubble = true;
    });
    anchor.on("dragend", (e) => {
      e.cancelBubble = true;
    });
    anchor.on("mouseenter", () => {
      const rad = Konva$1.getAngle(this.rotation());
      const rotateCursor = this.rotateAnchorCursor();
      const cursor = getCursor(name, rad, rotateCursor);
      anchor.getStage().content && (anchor.getStage().content.style.cursor = cursor);
      this._cursorChange = true;
    });
    anchor.on("mouseout", () => {
      anchor.getStage().content && (anchor.getStage().content.style.cursor = "");
      this._cursorChange = false;
    });
    this.add(anchor);
  }
  _createBack() {
    const back = new Shape({
      name: "back",
      width: 0,
      height: 0,
      sceneFunc(ctx, shape) {
        const tr = shape.getParent();
        const padding = tr.padding();
        const width = shape.width();
        const height = shape.height();
        ctx.beginPath();
        ctx.rect(-padding, -padding, width + padding * 2, height + padding * 2);
        if (tr.rotateEnabled() && tr.rotateLineVisible()) {
          const rotateAnchorAngle = tr.rotateAnchorAngle();
          const rotateAnchorOffset = tr.rotateAnchorOffset();
          const rad = Util.degToRad(rotateAnchorAngle);
          const dirX = Math.sin(rad);
          const dirY = -Math.cos(rad);
          const cx = width / 2;
          const cy = height / 2;
          let t2 = Infinity;
          if (dirY < 0) {
            t2 = Math.min(t2, -cy / dirY);
          } else if (dirY > 0) {
            t2 = Math.min(t2, (height - cy) / dirY);
          }
          if (dirX < 0) {
            t2 = Math.min(t2, -cx / dirX);
          } else if (dirX > 0) {
            t2 = Math.min(t2, (width - cx) / dirX);
          }
          const edgeX = cx + dirX * t2;
          const edgeY = cy + dirY * t2;
          const sign = Util._sign(height);
          const endX = edgeX + dirX * rotateAnchorOffset * sign;
          const endY = edgeY + dirY * rotateAnchorOffset * sign;
          ctx.moveTo(edgeX, edgeY);
          ctx.lineTo(endX, endY);
        }
        ctx.fillStrokeShape(shape);
      },
      hitFunc: (ctx, shape) => {
        if (!this.shouldOverdrawWholeArea()) {
          return;
        }
        const padding = this.padding();
        ctx.beginPath();
        ctx.rect(-padding, -padding, shape.width() + padding * 2, shape.height() + padding * 2);
        ctx.fillStrokeShape(shape);
      }
    });
    this.add(back);
    this._proxyDrag(back);
    back.on("dragstart", (e) => {
      e.cancelBubble = true;
    });
    back.on("dragmove", (e) => {
      e.cancelBubble = true;
    });
    back.on("dragend", (e) => {
      e.cancelBubble = true;
    });
    this.on("dragmove", (e) => {
      this.update();
    });
  }
  _handleMouseDown(e) {
    if (this._transforming) {
      return;
    }
    this._movingAnchorName = e.target.name().split(" ")[0];
    const attrs = this._getNodeRect();
    const width = attrs.width;
    const height = attrs.height;
    const hypotenuse = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
    this.sin = Math.abs(height / hypotenuse);
    this.cos = Math.abs(width / hypotenuse);
    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", this._handleMouseMove);
      window.addEventListener("touchmove", this._handleMouseMove);
      window.addEventListener("mouseup", this._handleMouseUp, true);
      window.addEventListener("touchend", this._handleMouseUp, true);
    }
    this._transforming = true;
    const ap = e.target.getAbsolutePosition();
    const pos = e.target.getStage().getPointerPosition();
    this._anchorDragOffset = {
      x: pos.x - ap.x,
      y: pos.y - ap.y
    };
    activeTransformersCount++;
    this._fire("transformstart", { evt: e.evt, target: this.getNode() });
    this._nodes.forEach((target) => {
      target._fire("transformstart", { evt: e.evt, target });
    });
  }
  _handleMouseMove(e) {
    let x, y, newHypotenuse;
    const anchorNode = this.findOne("." + this._movingAnchorName);
    const stage = anchorNode.getStage();
    stage.setPointersPositions(e);
    const pp = stage.getPointerPosition();
    let newNodePos = {
      x: pp.x - this._anchorDragOffset.x,
      y: pp.y - this._anchorDragOffset.y
    };
    const oldAbs = anchorNode.getAbsolutePosition();
    if (this.anchorDragBoundFunc()) {
      newNodePos = this.anchorDragBoundFunc()(oldAbs, newNodePos, e);
    }
    anchorNode.setAbsolutePosition(newNodePos);
    const newAbs = anchorNode.getAbsolutePosition();
    if (oldAbs.x === newAbs.x && oldAbs.y === newAbs.y) {
      return;
    }
    if (this._movingAnchorName === "rotater") {
      const attrs = this._getNodeRect();
      x = anchorNode.x() - attrs.width / 2;
      y = -anchorNode.y() + attrs.height / 2;
      const rotateAnchorAngleRad = Konva$1.getAngle(this.rotateAnchorAngle());
      let delta = Math.atan2(-y, x) + Math.PI / 2 - rotateAnchorAngleRad;
      if (attrs.height < 0) {
        delta -= Math.PI;
      }
      const oldRotation = Konva$1.getAngle(this.rotation());
      const newRotation = oldRotation + delta;
      const tol = Konva$1.getAngle(this.rotationSnapTolerance());
      const snappedRot = getSnap(this.rotationSnaps(), newRotation, tol);
      const diff2 = snappedRot - attrs.rotation;
      const shape = rotateAroundCenter(attrs, diff2);
      this._fitNodesInto(shape, e);
      return;
    }
    const shiftBehavior = this.shiftBehavior();
    let keepProportion;
    if (shiftBehavior === "inverted") {
      keepProportion = this.keepRatio() && !e.shiftKey;
    } else if (shiftBehavior === "none") {
      keepProportion = this.keepRatio();
    } else {
      keepProportion = this.keepRatio() || e.shiftKey;
    }
    let centeredScaling = this.centeredScaling() || e.altKey;
    if (this._movingAnchorName === "top-left") {
      if (keepProportion) {
        const comparePoint = centeredScaling ? {
          x: this.width() / 2,
          y: this.height() / 2
        } : {
          x: this.findOne(".bottom-right").x(),
          y: this.findOne(".bottom-right").y()
        };
        newHypotenuse = Math.sqrt(Math.pow(comparePoint.x - anchorNode.x(), 2) + Math.pow(comparePoint.y - anchorNode.y(), 2));
        const reverseX = this.findOne(".top-left").x() > comparePoint.x ? -1 : 1;
        const reverseY = this.findOne(".top-left").y() > comparePoint.y ? -1 : 1;
        x = newHypotenuse * this.cos * reverseX;
        y = newHypotenuse * this.sin * reverseY;
        this.findOne(".top-left").x(comparePoint.x - x);
        this.findOne(".top-left").y(comparePoint.y - y);
      }
    } else if (this._movingAnchorName === "top-center") {
      this.findOne(".top-left").y(anchorNode.y());
    } else if (this._movingAnchorName === "top-right") {
      if (keepProportion) {
        const comparePoint = centeredScaling ? {
          x: this.width() / 2,
          y: this.height() / 2
        } : {
          x: this.findOne(".bottom-left").x(),
          y: this.findOne(".bottom-left").y()
        };
        newHypotenuse = Math.sqrt(Math.pow(anchorNode.x() - comparePoint.x, 2) + Math.pow(comparePoint.y - anchorNode.y(), 2));
        const reverseX = this.findOne(".top-right").x() < comparePoint.x ? -1 : 1;
        const reverseY = this.findOne(".top-right").y() > comparePoint.y ? -1 : 1;
        x = newHypotenuse * this.cos * reverseX;
        y = newHypotenuse * this.sin * reverseY;
        this.findOne(".top-right").x(comparePoint.x + x);
        this.findOne(".top-right").y(comparePoint.y - y);
      }
      var pos = anchorNode.position();
      this.findOne(".top-left").y(pos.y);
      this.findOne(".bottom-right").x(pos.x);
    } else if (this._movingAnchorName === "middle-left") {
      this.findOne(".top-left").x(anchorNode.x());
    } else if (this._movingAnchorName === "middle-right") {
      this.findOne(".bottom-right").x(anchorNode.x());
    } else if (this._movingAnchorName === "bottom-left") {
      if (keepProportion) {
        const comparePoint = centeredScaling ? {
          x: this.width() / 2,
          y: this.height() / 2
        } : {
          x: this.findOne(".top-right").x(),
          y: this.findOne(".top-right").y()
        };
        newHypotenuse = Math.sqrt(Math.pow(comparePoint.x - anchorNode.x(), 2) + Math.pow(anchorNode.y() - comparePoint.y, 2));
        const reverseX = comparePoint.x < anchorNode.x() ? -1 : 1;
        const reverseY = anchorNode.y() < comparePoint.y ? -1 : 1;
        x = newHypotenuse * this.cos * reverseX;
        y = newHypotenuse * this.sin * reverseY;
        anchorNode.x(comparePoint.x - x);
        anchorNode.y(comparePoint.y + y);
      }
      pos = anchorNode.position();
      this.findOne(".top-left").x(pos.x);
      this.findOne(".bottom-right").y(pos.y);
    } else if (this._movingAnchorName === "bottom-center") {
      this.findOne(".bottom-right").y(anchorNode.y());
    } else if (this._movingAnchorName === "bottom-right") {
      if (keepProportion) {
        const comparePoint = centeredScaling ? {
          x: this.width() / 2,
          y: this.height() / 2
        } : {
          x: this.findOne(".top-left").x(),
          y: this.findOne(".top-left").y()
        };
        newHypotenuse = Math.sqrt(Math.pow(anchorNode.x() - comparePoint.x, 2) + Math.pow(anchorNode.y() - comparePoint.y, 2));
        const reverseX = this.findOne(".bottom-right").x() < comparePoint.x ? -1 : 1;
        const reverseY = this.findOne(".bottom-right").y() < comparePoint.y ? -1 : 1;
        x = newHypotenuse * this.cos * reverseX;
        y = newHypotenuse * this.sin * reverseY;
        this.findOne(".bottom-right").x(comparePoint.x + x);
        this.findOne(".bottom-right").y(comparePoint.y + y);
      }
    } else {
      console.error(new Error("Wrong position argument of selection resizer: " + this._movingAnchorName));
    }
    centeredScaling = this.centeredScaling() || e.altKey;
    if (centeredScaling) {
      const topLeft = this.findOne(".top-left");
      const bottomRight = this.findOne(".bottom-right");
      const topOffsetX = topLeft.x();
      const topOffsetY = topLeft.y();
      const bottomOffsetX = this.getWidth() - bottomRight.x();
      const bottomOffsetY = this.getHeight() - bottomRight.y();
      bottomRight.move({
        x: -topOffsetX,
        y: -topOffsetY
      });
      topLeft.move({
        x: bottomOffsetX,
        y: bottomOffsetY
      });
    }
    const absPos = this.findOne(".top-left").getAbsolutePosition();
    x = absPos.x;
    y = absPos.y;
    const width = this.findOne(".bottom-right").x() - this.findOne(".top-left").x();
    const height = this.findOne(".bottom-right").y() - this.findOne(".top-left").y();
    this._fitNodesInto({
      x,
      y,
      width,
      height,
      rotation: Konva$1.getAngle(this.rotation())
    }, e);
  }
  _handleMouseUp(e) {
    this._removeEvents(e);
  }
  getAbsoluteTransform() {
    return this.getTransform();
  }
  _removeEvents(e) {
    var _a;
    if (this._transforming) {
      this._transforming = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("mousemove", this._handleMouseMove);
        window.removeEventListener("touchmove", this._handleMouseMove);
        window.removeEventListener("mouseup", this._handleMouseUp, true);
        window.removeEventListener("touchend", this._handleMouseUp, true);
      }
      const node = this.getNode();
      activeTransformersCount--;
      this._fire("transformend", { evt: e, target: node });
      (_a = this.getLayer()) === null || _a === void 0 ? void 0 : _a.batchDraw();
      if (node) {
        this._nodes.forEach((target) => {
          var _a2;
          target._fire("transformend", { evt: e, target });
          (_a2 = target.getLayer()) === null || _a2 === void 0 ? void 0 : _a2.batchDraw();
        });
      }
      this._movingAnchorName = null;
    }
  }
  _fitNodesInto(newAttrs, evt) {
    const oldAttrs = this._getNodeRect();
    const minSize = 1;
    if (Util._inRange(newAttrs.width, -this.padding() * 2 - minSize, minSize)) {
      this.update();
      return;
    }
    if (Util._inRange(newAttrs.height, -this.padding() * 2 - minSize, minSize)) {
      this.update();
      return;
    }
    const t2 = new Transform();
    t2.rotate(Konva$1.getAngle(this.rotation()));
    if (this._movingAnchorName && newAttrs.width < 0 && this._movingAnchorName.indexOf("left") >= 0) {
      const offset = t2.point({
        x: -this.padding() * 2,
        y: 0
      });
      newAttrs.x += offset.x;
      newAttrs.y += offset.y;
      newAttrs.width += this.padding() * 2;
      this._movingAnchorName = this._movingAnchorName.replace("left", "right");
      this._anchorDragOffset.x -= offset.x;
      this._anchorDragOffset.y -= offset.y;
    } else if (this._movingAnchorName && newAttrs.width < 0 && this._movingAnchorName.indexOf("right") >= 0) {
      const offset = t2.point({
        x: this.padding() * 2,
        y: 0
      });
      this._movingAnchorName = this._movingAnchorName.replace("right", "left");
      this._anchorDragOffset.x -= offset.x;
      this._anchorDragOffset.y -= offset.y;
      newAttrs.width += this.padding() * 2;
    }
    if (this._movingAnchorName && newAttrs.height < 0 && this._movingAnchorName.indexOf("top") >= 0) {
      const offset = t2.point({
        x: 0,
        y: -this.padding() * 2
      });
      newAttrs.x += offset.x;
      newAttrs.y += offset.y;
      this._movingAnchorName = this._movingAnchorName.replace("top", "bottom");
      this._anchorDragOffset.x -= offset.x;
      this._anchorDragOffset.y -= offset.y;
      newAttrs.height += this.padding() * 2;
    } else if (this._movingAnchorName && newAttrs.height < 0 && this._movingAnchorName.indexOf("bottom") >= 0) {
      const offset = t2.point({
        x: 0,
        y: this.padding() * 2
      });
      this._movingAnchorName = this._movingAnchorName.replace("bottom", "top");
      this._anchorDragOffset.x -= offset.x;
      this._anchorDragOffset.y -= offset.y;
      newAttrs.height += this.padding() * 2;
    }
    if (this.boundBoxFunc()) {
      const bounded = this.boundBoxFunc()(oldAttrs, newAttrs);
      if (bounded) {
        newAttrs = bounded;
      } else {
        Util.warn("boundBoxFunc returned falsy. You should return new bound rect from it!");
      }
    }
    const baseSize = 1e7;
    const oldTr = new Transform();
    oldTr.translate(oldAttrs.x, oldAttrs.y);
    oldTr.rotate(oldAttrs.rotation);
    oldTr.scale(oldAttrs.width / baseSize, oldAttrs.height / baseSize);
    const newTr = new Transform();
    const newScaleX = newAttrs.width / baseSize;
    const newScaleY = newAttrs.height / baseSize;
    if (this.flipEnabled() === false) {
      newTr.translate(newAttrs.x, newAttrs.y);
      newTr.rotate(newAttrs.rotation);
      newTr.translate(newAttrs.width < 0 ? newAttrs.width : 0, newAttrs.height < 0 ? newAttrs.height : 0);
      newTr.scale(Math.abs(newScaleX), Math.abs(newScaleY));
    } else {
      newTr.translate(newAttrs.x, newAttrs.y);
      newTr.rotate(newAttrs.rotation);
      newTr.scale(newScaleX, newScaleY);
    }
    const delta = newTr.multiply(oldTr.invert());
    this._nodes.forEach((node) => {
      var _a;
      if (!node.getStage()) {
        return;
      }
      const parentTransform = node.getParent().getAbsoluteTransform();
      const localTransform = node.getTransform().copy();
      localTransform.translate(node.offsetX(), node.offsetY());
      const newLocalTransform = new Transform();
      newLocalTransform.multiply(parentTransform.copy().invert()).multiply(delta).multiply(parentTransform).multiply(localTransform);
      const attrs = newLocalTransform.decompose();
      node.setAttrs(attrs);
      (_a = node.getLayer()) === null || _a === void 0 ? void 0 : _a.batchDraw();
    });
    this.rotation(Util._getRotation(newAttrs.rotation));
    this._nodes.forEach((node) => {
      this._fire("transform", { evt, target: node });
      node._fire("transform", { evt, target: node });
    });
    this._resetTransformCache();
    this.update();
    this.getLayer().batchDraw();
  }
  forceUpdate() {
    this._resetTransformCache();
    this.update();
  }
  _batchChangeChild(selector, attrs) {
    const anchor = this.findOne(selector);
    anchor.setAttrs(attrs);
  }
  update() {
    var _a;
    const attrs = this._getNodeRect();
    this.rotation(Util._getRotation(attrs.rotation));
    const width = attrs.width;
    const height = attrs.height;
    const enabledAnchors = this.enabledAnchors();
    const resizeEnabled = this.resizeEnabled();
    const padding = this.padding();
    const anchorSize = this.anchorSize();
    const anchors = this.find("._anchor");
    anchors.forEach((node) => {
      node.setAttrs({
        width: anchorSize,
        height: anchorSize,
        offsetX: anchorSize / 2,
        offsetY: anchorSize / 2,
        stroke: this.anchorStroke(),
        strokeWidth: this.anchorStrokeWidth(),
        fill: this.anchorFill(),
        cornerRadius: this.anchorCornerRadius()
      });
    });
    this._batchChangeChild(".top-left", {
      x: 0,
      y: 0,
      offsetX: anchorSize / 2 + padding,
      offsetY: anchorSize / 2 + padding,
      visible: resizeEnabled && enabledAnchors.indexOf("top-left") >= 0
    });
    this._batchChangeChild(".top-center", {
      x: width / 2,
      y: 0,
      offsetY: anchorSize / 2 + padding,
      visible: resizeEnabled && enabledAnchors.indexOf("top-center") >= 0
    });
    this._batchChangeChild(".top-right", {
      x: width,
      y: 0,
      offsetX: anchorSize / 2 - padding,
      offsetY: anchorSize / 2 + padding,
      visible: resizeEnabled && enabledAnchors.indexOf("top-right") >= 0
    });
    this._batchChangeChild(".middle-left", {
      x: 0,
      y: height / 2,
      offsetX: anchorSize / 2 + padding,
      visible: resizeEnabled && enabledAnchors.indexOf("middle-left") >= 0
    });
    this._batchChangeChild(".middle-right", {
      x: width,
      y: height / 2,
      offsetX: anchorSize / 2 - padding,
      visible: resizeEnabled && enabledAnchors.indexOf("middle-right") >= 0
    });
    this._batchChangeChild(".bottom-left", {
      x: 0,
      y: height,
      offsetX: anchorSize / 2 + padding,
      offsetY: anchorSize / 2 - padding,
      visible: resizeEnabled && enabledAnchors.indexOf("bottom-left") >= 0
    });
    this._batchChangeChild(".bottom-center", {
      x: width / 2,
      y: height,
      offsetY: anchorSize / 2 - padding,
      visible: resizeEnabled && enabledAnchors.indexOf("bottom-center") >= 0
    });
    this._batchChangeChild(".bottom-right", {
      x: width,
      y: height,
      offsetX: anchorSize / 2 - padding,
      offsetY: anchorSize / 2 - padding,
      visible: resizeEnabled && enabledAnchors.indexOf("bottom-right") >= 0
    });
    const rotateAnchorAngle = this.rotateAnchorAngle();
    const rotateAnchorOffset = this.rotateAnchorOffset();
    const rad = Util.degToRad(rotateAnchorAngle);
    const dirX = Math.sin(rad);
    const dirY = -Math.cos(rad);
    const cx = width / 2;
    const cy = height / 2;
    let t2 = Infinity;
    if (dirY < 0) {
      t2 = Math.min(t2, -cy / dirY);
    } else if (dirY > 0) {
      t2 = Math.min(t2, (height - cy) / dirY);
    }
    if (dirX < 0) {
      t2 = Math.min(t2, -cx / dirX);
    } else if (dirX > 0) {
      t2 = Math.min(t2, (width - cx) / dirX);
    }
    const edgeX = cx + dirX * t2;
    const edgeY = cy + dirY * t2;
    const sign = Util._sign(height);
    this._batchChangeChild(".rotater", {
      x: edgeX + dirX * rotateAnchorOffset * sign,
      y: edgeY + dirY * rotateAnchorOffset * sign - padding * dirY,
      visible: this.rotateEnabled()
    });
    this._batchChangeChild(".back", {
      width,
      height,
      visible: this.borderEnabled(),
      stroke: this.borderStroke(),
      strokeWidth: this.borderStrokeWidth(),
      dash: this.borderDash(),
      draggable: this.nodes().some((node) => node.draggable()),
      x: 0,
      y: 0
    });
    const styleFunc = this.anchorStyleFunc();
    if (styleFunc) {
      anchors.forEach((node) => {
        styleFunc(node);
      });
    }
    (_a = this.getLayer()) === null || _a === void 0 ? void 0 : _a.batchDraw();
  }
  isTransforming() {
    return this._transforming;
  }
  stopTransform() {
    if (this._transforming) {
      this._removeEvents();
      const anchorNode = this.findOne("." + this._movingAnchorName);
      if (anchorNode) {
        anchorNode.stopDrag();
      }
    }
  }
  destroy() {
    if (this.getStage() && this._cursorChange) {
      this.getStage().content && (this.getStage().content.style.cursor = "");
    }
    Group.prototype.destroy.call(this);
    this.detach();
    this._removeEvents();
    return this;
  }
  toObject() {
    return Node.prototype.toObject.call(this);
  }
  clone(obj) {
    const node = Node.prototype.clone.call(this, obj);
    return node;
  }
  getClientRect() {
    if (this.nodes().length > 0) {
      return super.getClientRect();
    } else {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
  }
}
Transformer.isTransforming = () => {
  return activeTransformersCount > 0;
};
function validateAnchors(val) {
  if (!(val instanceof Array)) {
    Util.warn("enabledAnchors value should be an array");
  }
  if (val instanceof Array) {
    val.forEach(function(name) {
      if (ANCHORS_NAMES.indexOf(name) === -1) {
        Util.warn("Unknown anchor name: " + name + ". Available names are: " + ANCHORS_NAMES.join(", "));
      }
    });
  }
  return val || [];
}
Transformer.prototype.className = "Transformer";
_registerNode(Transformer);
Factory.addGetterSetter(Transformer, "enabledAnchors", ANCHORS_NAMES, validateAnchors);
Factory.addGetterSetter(Transformer, "flipEnabled", true, getBooleanValidator());
Factory.addGetterSetter(Transformer, "resizeEnabled", true);
Factory.addGetterSetter(Transformer, "anchorSize", 10, getNumberValidator());
Factory.addGetterSetter(Transformer, "rotateEnabled", true);
Factory.addGetterSetter(Transformer, "rotateLineVisible", true);
Factory.addGetterSetter(Transformer, "rotationSnaps", []);
Factory.addGetterSetter(Transformer, "rotateAnchorOffset", 50, getNumberValidator());
Factory.addGetterSetter(Transformer, "rotateAnchorAngle", 0, getNumberValidator());
Factory.addGetterSetter(Transformer, "rotateAnchorCursor", "crosshair");
Factory.addGetterSetter(Transformer, "rotationSnapTolerance", 5, getNumberValidator());
Factory.addGetterSetter(Transformer, "borderEnabled", true);
Factory.addGetterSetter(Transformer, "anchorStroke", "rgb(0, 161, 255)");
Factory.addGetterSetter(Transformer, "anchorStrokeWidth", 1, getNumberValidator());
Factory.addGetterSetter(Transformer, "anchorFill", "white");
Factory.addGetterSetter(Transformer, "anchorCornerRadius", 0, getNumberValidator());
Factory.addGetterSetter(Transformer, "borderStroke", "rgb(0, 161, 255)");
Factory.addGetterSetter(Transformer, "borderStrokeWidth", 1, getNumberValidator());
Factory.addGetterSetter(Transformer, "borderDash");
Factory.addGetterSetter(Transformer, "keepRatio", true);
Factory.addGetterSetter(Transformer, "shiftBehavior", "default");
Factory.addGetterSetter(Transformer, "centeredScaling", false);
Factory.addGetterSetter(Transformer, "ignoreStroke", false);
Factory.addGetterSetter(Transformer, "padding", 0, getNumberValidator());
Factory.addGetterSetter(Transformer, "nodes");
Factory.addGetterSetter(Transformer, "node");
Factory.addGetterSetter(Transformer, "boundBoxFunc");
Factory.addGetterSetter(Transformer, "anchorDragBoundFunc");
Factory.addGetterSetter(Transformer, "anchorStyleFunc");
Factory.addGetterSetter(Transformer, "shouldOverdrawWholeArea", false);
Factory.addGetterSetter(Transformer, "useSingleNodeRotation", true);
Factory.backCompat(Transformer, {
  lineEnabled: "borderEnabled",
  rotateHandlerOffset: "rotateAnchorOffset",
  enabledHandlers: "enabledAnchors"
});
class Wedge extends Shape {
  _sceneFunc(context) {
    context.beginPath();
    context.arc(0, 0, this.radius(), 0, Konva$1.getAngle(this.angle()), this.clockwise());
    context.lineTo(0, 0);
    context.closePath();
    context.fillStrokeShape(this);
  }
  getWidth() {
    return this.radius() * 2;
  }
  getHeight() {
    return this.radius() * 2;
  }
  setWidth(width) {
    this.radius(width / 2);
  }
  setHeight(height) {
    this.radius(height / 2);
  }
}
Wedge.prototype.className = "Wedge";
Wedge.prototype._centroid = true;
Wedge.prototype._attrsAffectingSize = ["radius"];
_registerNode(Wedge);
Factory.addGetterSetter(Wedge, "radius", 0, getNumberValidator());
Factory.addGetterSetter(Wedge, "angle", 0, getNumberValidator());
Factory.addGetterSetter(Wedge, "clockwise", false);
Factory.backCompat(Wedge, {
  angleDeg: "angle",
  getAngleDeg: "getAngle",
  setAngleDeg: "setAngle"
});
function BlurStack() {
  this.r = 0;
  this.g = 0;
  this.b = 0;
  this.a = 0;
  this.next = null;
}
const mul_table = [
  512,
  512,
  456,
  512,
  328,
  456,
  335,
  512,
  405,
  328,
  271,
  456,
  388,
  335,
  292,
  512,
  454,
  405,
  364,
  328,
  298,
  271,
  496,
  456,
  420,
  388,
  360,
  335,
  312,
  292,
  273,
  512,
  482,
  454,
  428,
  405,
  383,
  364,
  345,
  328,
  312,
  298,
  284,
  271,
  259,
  496,
  475,
  456,
  437,
  420,
  404,
  388,
  374,
  360,
  347,
  335,
  323,
  312,
  302,
  292,
  282,
  273,
  265,
  512,
  497,
  482,
  468,
  454,
  441,
  428,
  417,
  405,
  394,
  383,
  373,
  364,
  354,
  345,
  337,
  328,
  320,
  312,
  305,
  298,
  291,
  284,
  278,
  271,
  265,
  259,
  507,
  496,
  485,
  475,
  465,
  456,
  446,
  437,
  428,
  420,
  412,
  404,
  396,
  388,
  381,
  374,
  367,
  360,
  354,
  347,
  341,
  335,
  329,
  323,
  318,
  312,
  307,
  302,
  297,
  292,
  287,
  282,
  278,
  273,
  269,
  265,
  261,
  512,
  505,
  497,
  489,
  482,
  475,
  468,
  461,
  454,
  447,
  441,
  435,
  428,
  422,
  417,
  411,
  405,
  399,
  394,
  389,
  383,
  378,
  373,
  368,
  364,
  359,
  354,
  350,
  345,
  341,
  337,
  332,
  328,
  324,
  320,
  316,
  312,
  309,
  305,
  301,
  298,
  294,
  291,
  287,
  284,
  281,
  278,
  274,
  271,
  268,
  265,
  262,
  259,
  257,
  507,
  501,
  496,
  491,
  485,
  480,
  475,
  470,
  465,
  460,
  456,
  451,
  446,
  442,
  437,
  433,
  428,
  424,
  420,
  416,
  412,
  408,
  404,
  400,
  396,
  392,
  388,
  385,
  381,
  377,
  374,
  370,
  367,
  363,
  360,
  357,
  354,
  350,
  347,
  344,
  341,
  338,
  335,
  332,
  329,
  326,
  323,
  320,
  318,
  315,
  312,
  310,
  307,
  304,
  302,
  299,
  297,
  294,
  292,
  289,
  287,
  285,
  282,
  280,
  278,
  275,
  273,
  271,
  269,
  267,
  265,
  263,
  261,
  259
];
const shg_table = [
  9,
  11,
  12,
  13,
  13,
  14,
  14,
  15,
  15,
  15,
  15,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  18,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  19,
  19,
  19,
  19,
  19,
  19,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  21,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  22,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  23,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24,
  24
];
function filterGaussBlurRGBA(imageData, radius) {
  const pixels = imageData.data, width = imageData.width, height = imageData.height;
  let p, yi, yw, r_sum, g_sum, b_sum, a_sum, r_out_sum, g_out_sum, b_out_sum, a_out_sum, r_in_sum, g_in_sum, b_in_sum, a_in_sum, pr, pg, pb, pa, rbs;
  const div = radius + radius + 1, widthMinus1 = width - 1, heightMinus1 = height - 1, radiusPlus1 = radius + 1, sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2, stackStart = new BlurStack(), mul_sum = mul_table[radius], shg_sum = shg_table[radius];
  let stackEnd = null, stack = stackStart, stackIn = null, stackOut = null;
  for (let i = 1; i < div; i++) {
    stack = stack.next = new BlurStack();
    if (i === radiusPlus1) {
      stackEnd = stack;
    }
  }
  stack.next = stackStart;
  yw = yi = 0;
  for (let y = 0; y < height; y++) {
    r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;
    r_out_sum = radiusPlus1 * (pr = pixels[yi]);
    g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
    b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
    a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);
    r_sum += sumFactor * pr;
    g_sum += sumFactor * pg;
    b_sum += sumFactor * pb;
    a_sum += sumFactor * pa;
    stack = stackStart;
    for (let i = 0; i < radiusPlus1; i++) {
      stack.r = pr;
      stack.g = pg;
      stack.b = pb;
      stack.a = pa;
      stack = stack.next;
    }
    for (let i = 1; i < radiusPlus1; i++) {
      p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
      r_sum += (stack.r = pr = pixels[p]) * (rbs = radiusPlus1 - i);
      g_sum += (stack.g = pg = pixels[p + 1]) * rbs;
      b_sum += (stack.b = pb = pixels[p + 2]) * rbs;
      a_sum += (stack.a = pa = pixels[p + 3]) * rbs;
      r_in_sum += pr;
      g_in_sum += pg;
      b_in_sum += pb;
      a_in_sum += pa;
      stack = stack.next;
    }
    stackIn = stackStart;
    stackOut = stackEnd;
    for (let x = 0; x < width; x++) {
      pixels[yi + 3] = pa = a_sum * mul_sum >> shg_sum;
      if (pa !== 0) {
        pa = 255 / pa;
        pixels[yi] = (r_sum * mul_sum >> shg_sum) * pa;
        pixels[yi + 1] = (g_sum * mul_sum >> shg_sum) * pa;
        pixels[yi + 2] = (b_sum * mul_sum >> shg_sum) * pa;
      } else {
        pixels[yi] = pixels[yi + 1] = pixels[yi + 2] = 0;
      }
      r_sum -= r_out_sum;
      g_sum -= g_out_sum;
      b_sum -= b_out_sum;
      a_sum -= a_out_sum;
      r_out_sum -= stackIn.r;
      g_out_sum -= stackIn.g;
      b_out_sum -= stackIn.b;
      a_out_sum -= stackIn.a;
      p = yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1) << 2;
      r_in_sum += stackIn.r = pixels[p];
      g_in_sum += stackIn.g = pixels[p + 1];
      b_in_sum += stackIn.b = pixels[p + 2];
      a_in_sum += stackIn.a = pixels[p + 3];
      r_sum += r_in_sum;
      g_sum += g_in_sum;
      b_sum += b_in_sum;
      a_sum += a_in_sum;
      stackIn = stackIn.next;
      r_out_sum += pr = stackOut.r;
      g_out_sum += pg = stackOut.g;
      b_out_sum += pb = stackOut.b;
      a_out_sum += pa = stackOut.a;
      r_in_sum -= pr;
      g_in_sum -= pg;
      b_in_sum -= pb;
      a_in_sum -= pa;
      stackOut = stackOut.next;
      yi += 4;
    }
    yw += width;
  }
  for (let x = 0; x < width; x++) {
    g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;
    yi = x << 2;
    r_out_sum = radiusPlus1 * (pr = pixels[yi]);
    g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
    b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
    a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);
    r_sum += sumFactor * pr;
    g_sum += sumFactor * pg;
    b_sum += sumFactor * pb;
    a_sum += sumFactor * pa;
    stack = stackStart;
    for (let i = 0; i < radiusPlus1; i++) {
      stack.r = pr;
      stack.g = pg;
      stack.b = pb;
      stack.a = pa;
      stack = stack.next;
    }
    let yp = width;
    for (let i = 1; i <= radius; i++) {
      yi = yp + x << 2;
      r_sum += (stack.r = pr = pixels[yi]) * (rbs = radiusPlus1 - i);
      g_sum += (stack.g = pg = pixels[yi + 1]) * rbs;
      b_sum += (stack.b = pb = pixels[yi + 2]) * rbs;
      a_sum += (stack.a = pa = pixels[yi + 3]) * rbs;
      r_in_sum += pr;
      g_in_sum += pg;
      b_in_sum += pb;
      a_in_sum += pa;
      stack = stack.next;
      if (i < heightMinus1) {
        yp += width;
      }
    }
    yi = x;
    stackIn = stackStart;
    stackOut = stackEnd;
    for (let y = 0; y < height; y++) {
      p = yi << 2;
      pixels[p + 3] = pa = a_sum * mul_sum >> shg_sum;
      if (pa > 0) {
        pa = 255 / pa;
        pixels[p] = (r_sum * mul_sum >> shg_sum) * pa;
        pixels[p + 1] = (g_sum * mul_sum >> shg_sum) * pa;
        pixels[p + 2] = (b_sum * mul_sum >> shg_sum) * pa;
      } else {
        pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
      }
      r_sum -= r_out_sum;
      g_sum -= g_out_sum;
      b_sum -= b_out_sum;
      a_sum -= a_out_sum;
      r_out_sum -= stackIn.r;
      g_out_sum -= stackIn.g;
      b_out_sum -= stackIn.b;
      a_out_sum -= stackIn.a;
      p = x + ((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width << 2;
      r_sum += r_in_sum += stackIn.r = pixels[p];
      g_sum += g_in_sum += stackIn.g = pixels[p + 1];
      b_sum += b_in_sum += stackIn.b = pixels[p + 2];
      a_sum += a_in_sum += stackIn.a = pixels[p + 3];
      stackIn = stackIn.next;
      r_out_sum += pr = stackOut.r;
      g_out_sum += pg = stackOut.g;
      b_out_sum += pb = stackOut.b;
      a_out_sum += pa = stackOut.a;
      r_in_sum -= pr;
      g_in_sum -= pg;
      b_in_sum -= pb;
      a_in_sum -= pa;
      stackOut = stackOut.next;
      yi += width;
    }
  }
}
const Blur = function Blur2(imageData) {
  const radius = Math.round(this.blurRadius());
  if (radius > 0) {
    filterGaussBlurRGBA(imageData, radius);
  }
};
Factory.addGetterSetter(Node, "blurRadius", 0, getNumberValidator(), Factory.afterSetFilter);
const Brighten = function(imageData) {
  const brightness = this.brightness() * 255, data = imageData.data, len = data.length;
  for (let i = 0; i < len; i += 4) {
    data[i] += brightness;
    data[i + 1] += brightness;
    data[i + 2] += brightness;
  }
};
Factory.addGetterSetter(Node, "brightness", 0, getNumberValidator(), Factory.afterSetFilter);
const Brightness = function(imageData) {
  const brightness = this.brightness(), data = imageData.data, len = data.length;
  for (let i = 0; i < len; i += 4) {
    data[i] = Math.min(255, data[i] * brightness);
    data[i + 1] = Math.min(255, data[i + 1] * brightness);
    data[i + 2] = Math.min(255, data[i + 2] * brightness);
  }
};
const Contrast = function(imageData) {
  const adjust = Math.pow((this.contrast() + 100) / 100, 2);
  const data = imageData.data, nPixels = data.length;
  let red = 150, green = 150, blue = 150;
  for (let i = 0; i < nPixels; i += 4) {
    red = data[i];
    green = data[i + 1];
    blue = data[i + 2];
    red /= 255;
    red -= 0.5;
    red *= adjust;
    red += 0.5;
    red *= 255;
    green /= 255;
    green -= 0.5;
    green *= adjust;
    green += 0.5;
    green *= 255;
    blue /= 255;
    blue -= 0.5;
    blue *= adjust;
    blue += 0.5;
    blue *= 255;
    red = red < 0 ? 0 : red > 255 ? 255 : red;
    green = green < 0 ? 0 : green > 255 ? 255 : green;
    blue = blue < 0 ? 0 : blue > 255 ? 255 : blue;
    data[i] = red;
    data[i + 1] = green;
    data[i + 2] = blue;
  }
};
Factory.addGetterSetter(Node, "contrast", 0, getNumberValidator(), Factory.afterSetFilter);
const Emboss = function(imageData) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j;
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const strength01 = Math.min(1, Math.max(0, (_b = (_a = this.embossStrength) === null || _a === void 0 ? void 0 : _a.call(this)) !== null && _b !== void 0 ? _b : 0.5));
  const whiteLevel01 = Math.min(1, Math.max(0, (_d = (_c = this.embossWhiteLevel) === null || _c === void 0 ? void 0 : _c.call(this)) !== null && _d !== void 0 ? _d : 0.5));
  const directionMap = {
    "top-left": 315,
    top: 270,
    "top-right": 225,
    right: 180,
    "bottom-right": 135,
    bottom: 90,
    "bottom-left": 45,
    left: 0
  };
  const directionDeg = (_g = directionMap[(_f = (_e = this.embossDirection) === null || _e === void 0 ? void 0 : _e.call(this)) !== null && _f !== void 0 ? _f : "top-left"]) !== null && _g !== void 0 ? _g : 315;
  const blend = !!((_j = (_h = this.embossBlend) === null || _h === void 0 ? void 0 : _h.call(this)) !== null && _j !== void 0 ? _j : false);
  const strength = strength01 * 10;
  const bias = whiteLevel01 * 255;
  const dirRad = directionDeg * Math.PI / 180;
  const cx = Math.cos(dirRad);
  const cy = Math.sin(dirRad);
  const SCALE = 128 / 1020 * strength;
  const src = new Uint8ClampedArray(data);
  const lum = new Float32Array(w * h);
  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    lum[p] = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
  }
  const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const OFF = [-w - 1, -w, -w + 1, -1, 0, 1, w - 1, w, w + 1];
  const clamp8 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      let sx = 0, sy = 0;
      sx += lum[p + OFF[0]] * Gx[0];
      sy += lum[p + OFF[0]] * Gy[0];
      sx += lum[p + OFF[1]] * Gx[1];
      sy += lum[p + OFF[1]] * Gy[1];
      sx += lum[p + OFF[2]] * Gx[2];
      sy += lum[p + OFF[2]] * Gy[2];
      sx += lum[p + OFF[3]] * Gx[3];
      sy += lum[p + OFF[3]] * Gy[3];
      sx += lum[p + OFF[5]] * Gx[5];
      sy += lum[p + OFF[5]] * Gy[5];
      sx += lum[p + OFF[6]] * Gx[6];
      sy += lum[p + OFF[6]] * Gy[6];
      sx += lum[p + OFF[7]] * Gx[7];
      sy += lum[p + OFF[7]] * Gy[7];
      sx += lum[p + OFF[8]] * Gx[8];
      sy += lum[p + OFF[8]] * Gy[8];
      const r = cx * sx + cy * sy;
      const outGray = clamp8(bias + r * SCALE);
      const o = p * 4;
      if (blend) {
        const delta = outGray - bias;
        data[o] = clamp8(src[o] + delta);
        data[o + 1] = clamp8(src[o + 1] + delta);
        data[o + 2] = clamp8(src[o + 2] + delta);
        data[o + 3] = src[o + 3];
      } else {
        data[o] = data[o + 1] = data[o + 2] = outGray;
        data[o + 3] = src[o + 3];
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let oTop = x * 4, oBot = ((h - 1) * w + x) * 4;
    data[oTop] = src[oTop];
    data[oTop + 1] = src[oTop + 1];
    data[oTop + 2] = src[oTop + 2];
    data[oTop + 3] = src[oTop + 3];
    data[oBot] = src[oBot];
    data[oBot + 1] = src[oBot + 1];
    data[oBot + 2] = src[oBot + 2];
    data[oBot + 3] = src[oBot + 3];
  }
  for (let y = 1; y < h - 1; y++) {
    let oL = y * w * 4, oR = (y * w + (w - 1)) * 4;
    data[oL] = src[oL];
    data[oL + 1] = src[oL + 1];
    data[oL + 2] = src[oL + 2];
    data[oL + 3] = src[oL + 3];
    data[oR] = src[oR];
    data[oR + 1] = src[oR + 1];
    data[oR + 2] = src[oR + 2];
    data[oR + 3] = src[oR + 3];
  }
  return imageData;
};
Factory.addGetterSetter(Node, "embossStrength", 0.5, getNumberValidator(), Factory.afterSetFilter);
Factory.addGetterSetter(Node, "embossWhiteLevel", 0.5, getNumberValidator(), Factory.afterSetFilter);
Factory.addGetterSetter(Node, "embossDirection", "top-left", void 0, Factory.afterSetFilter);
Factory.addGetterSetter(Node, "embossBlend", false, void 0, Factory.afterSetFilter);
function remap(fromValue, fromMin, fromMax, toMin, toMax) {
  const fromRange = fromMax - fromMin, toRange = toMax - toMin;
  if (fromRange === 0) {
    return toMin + toRange / 2;
  }
  if (toRange === 0) {
    return toMin;
  }
  let toValue = (fromValue - fromMin) / fromRange;
  toValue = toRange * toValue + toMin;
  return toValue;
}
const Enhance = function(imageData) {
  const data = imageData.data, nSubPixels = data.length;
  let rMin = data[0], rMax = rMin, r, gMin = data[1], gMax = gMin, g, bMin = data[2], bMax = bMin, b;
  const enhanceAmount = this.enhance();
  if (enhanceAmount === 0) {
    return;
  }
  for (let i = 0; i < nSubPixels; i += 4) {
    r = data[i + 0];
    if (r < rMin) {
      rMin = r;
    } else if (r > rMax) {
      rMax = r;
    }
    g = data[i + 1];
    if (g < gMin) {
      gMin = g;
    } else if (g > gMax) {
      gMax = g;
    }
    b = data[i + 2];
    if (b < bMin) {
      bMin = b;
    } else if (b > bMax) {
      bMax = b;
    }
  }
  if (rMax === rMin) {
    rMax = 255;
    rMin = 0;
  }
  if (gMax === gMin) {
    gMax = 255;
    gMin = 0;
  }
  if (bMax === bMin) {
    bMax = 255;
    bMin = 0;
  }
  let rGoalMax, rGoalMin, gGoalMax, gGoalMin, bGoalMax, bGoalMin;
  if (enhanceAmount > 0) {
    rGoalMax = rMax + enhanceAmount * (255 - rMax);
    rGoalMin = rMin - enhanceAmount * (rMin - 0);
    gGoalMax = gMax + enhanceAmount * (255 - gMax);
    gGoalMin = gMin - enhanceAmount * (gMin - 0);
    bGoalMax = bMax + enhanceAmount * (255 - bMax);
    bGoalMin = bMin - enhanceAmount * (bMin - 0);
  } else {
    const rMid = (rMax + rMin) * 0.5;
    rGoalMax = rMax + enhanceAmount * (rMax - rMid);
    rGoalMin = rMin + enhanceAmount * (rMin - rMid);
    const gMid = (gMax + gMin) * 0.5;
    gGoalMax = gMax + enhanceAmount * (gMax - gMid);
    gGoalMin = gMin + enhanceAmount * (gMin - gMid);
    const bMid = (bMax + bMin) * 0.5;
    bGoalMax = bMax + enhanceAmount * (bMax - bMid);
    bGoalMin = bMin + enhanceAmount * (bMin - bMid);
  }
  for (let i = 0; i < nSubPixels; i += 4) {
    data[i + 0] = remap(data[i + 0], rMin, rMax, rGoalMin, rGoalMax);
    data[i + 1] = remap(data[i + 1], gMin, gMax, gGoalMin, gGoalMax);
    data[i + 2] = remap(data[i + 2], bMin, bMax, bGoalMin, bGoalMax);
  }
};
Factory.addGetterSetter(Node, "enhance", 0, getNumberValidator(), Factory.afterSetFilter);
const Grayscale = function(imageData) {
  const data = imageData.data, len = data.length;
  for (let i = 0; i < len; i += 4) {
    const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
    data[i] = brightness;
    data[i + 1] = brightness;
    data[i + 2] = brightness;
  }
};
Factory.addGetterSetter(Node, "hue", 0, getNumberValidator(), Factory.afterSetFilter);
Factory.addGetterSetter(Node, "saturation", 0, getNumberValidator(), Factory.afterSetFilter);
Factory.addGetterSetter(Node, "luminance", 0, getNumberValidator(), Factory.afterSetFilter);
const HSL = function(imageData) {
  const data = imageData.data, nPixels = data.length, v = 1, s = Math.pow(2, this.saturation()), h = Math.abs(this.hue() + 360) % 360, l = this.luminance() * 127;
  const vsu = v * s * Math.cos(h * Math.PI / 180), vsw = v * s * Math.sin(h * Math.PI / 180);
  const rr = 0.299 * v + 0.701 * vsu + 0.167 * vsw, rg = 0.587 * v - 0.587 * vsu + 0.33 * vsw, rb = 0.114 * v - 0.114 * vsu - 0.497 * vsw;
  const gr = 0.299 * v - 0.299 * vsu - 0.328 * vsw, gg = 0.587 * v + 0.413 * vsu + 0.035 * vsw, gb = 0.114 * v - 0.114 * vsu + 0.293 * vsw;
  const br = 0.299 * v - 0.3 * vsu + 1.25 * vsw, bg = 0.587 * v - 0.586 * vsu - 1.05 * vsw, bb = 0.114 * v + 0.886 * vsu - 0.2 * vsw;
  let r, g, b, a;
  for (let i = 0; i < nPixels; i += 4) {
    r = data[i + 0];
    g = data[i + 1];
    b = data[i + 2];
    a = data[i + 3];
    data[i + 0] = rr * r + rg * g + rb * b + l;
    data[i + 1] = gr * r + gg * g + gb * b + l;
    data[i + 2] = br * r + bg * g + bb * b + l;
    data[i + 3] = a;
  }
};
const HSV = function(imageData) {
  const data = imageData.data, nPixels = data.length, v = Math.pow(2, this.value()), s = Math.pow(2, this.saturation()), h = Math.abs(this.hue() + 360) % 360;
  const vsu = v * s * Math.cos(h * Math.PI / 180), vsw = v * s * Math.sin(h * Math.PI / 180);
  const rr = 0.299 * v + 0.701 * vsu + 0.167 * vsw, rg = 0.587 * v - 0.587 * vsu + 0.33 * vsw, rb = 0.114 * v - 0.114 * vsu - 0.497 * vsw;
  const gr = 0.299 * v - 0.299 * vsu - 0.328 * vsw, gg = 0.587 * v + 0.413 * vsu + 0.035 * vsw, gb = 0.114 * v - 0.114 * vsu + 0.293 * vsw;
  const br = 0.299 * v - 0.3 * vsu + 1.25 * vsw, bg = 0.587 * v - 0.586 * vsu - 1.05 * vsw, bb = 0.114 * v + 0.886 * vsu - 0.2 * vsw;
  for (let i = 0; i < nPixels; i += 4) {
    const r = data[i + 0];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    data[i + 0] = rr * r + rg * g + rb * b;
    data[i + 1] = gr * r + gg * g + gb * b;
    data[i + 2] = br * r + bg * g + bb * b;
    data[i + 3] = a;
  }
};
Factory.addGetterSetter(Node, "hue", 0, getNumberValidator(), Factory.afterSetFilter);
Factory.addGetterSetter(Node, "saturation", 0, getNumberValidator(), Factory.afterSetFilter);
Factory.addGetterSetter(Node, "value", 0, getNumberValidator(), Factory.afterSetFilter);
const Invert = function(imageData) {
  const data = imageData.data, len = data.length;
  for (let i = 0; i < len; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
};
const ToPolar = function(src, dst, opt) {
  const srcPixels = src.data, dstPixels = dst.data, xSize = src.width, ySize = src.height, xMid = opt.polarCenterX || xSize / 2, yMid = opt.polarCenterY || ySize / 2;
  let rMax = Math.sqrt(xMid * xMid + yMid * yMid);
  let x = xSize - xMid;
  let y = ySize - yMid;
  const rad = Math.sqrt(x * x + y * y);
  rMax = rad > rMax ? rad : rMax;
  const rSize = ySize, tSize = xSize;
  const conversion = 360 / tSize * Math.PI / 180;
  for (let theta = 0; theta < tSize; theta += 1) {
    const sin = Math.sin(theta * conversion);
    const cos = Math.cos(theta * conversion);
    for (let radius = 0; radius < rSize; radius += 1) {
      x = Math.floor(xMid + rMax * radius / rSize * cos);
      y = Math.floor(yMid + rMax * radius / rSize * sin);
      let i = (y * xSize + x) * 4;
      const r = srcPixels[i + 0];
      const g = srcPixels[i + 1];
      const b = srcPixels[i + 2];
      const a = srcPixels[i + 3];
      i = (theta + radius * xSize) * 4;
      dstPixels[i + 0] = r;
      dstPixels[i + 1] = g;
      dstPixels[i + 2] = b;
      dstPixels[i + 3] = a;
    }
  }
};
const FromPolar = function(src, dst, opt) {
  const srcPixels = src.data, dstPixels = dst.data, xSize = src.width, ySize = src.height, xMid = opt.polarCenterX || xSize / 2, yMid = opt.polarCenterY || ySize / 2;
  let rMax = Math.sqrt(xMid * xMid + yMid * yMid);
  let x = xSize - xMid;
  let y = ySize - yMid;
  const rad = Math.sqrt(x * x + y * y);
  rMax = rad > rMax ? rad : rMax;
  const rSize = ySize, tSize = xSize, phaseShift = 0;
  let x1, y1;
  for (x = 0; x < xSize; x += 1) {
    for (y = 0; y < ySize; y += 1) {
      const dx = x - xMid;
      const dy = y - yMid;
      const radius = Math.sqrt(dx * dx + dy * dy) * rSize / rMax;
      let theta = (Math.atan2(dy, dx) * 180 / Math.PI + 360 + phaseShift) % 360;
      theta = theta * tSize / 360;
      x1 = Math.floor(theta);
      y1 = Math.floor(radius);
      let i = (y1 * xSize + x1) * 4;
      const r = srcPixels[i + 0];
      const g = srcPixels[i + 1];
      const b = srcPixels[i + 2];
      const a = srcPixels[i + 3];
      i = (y * xSize + x) * 4;
      dstPixels[i + 0] = r;
      dstPixels[i + 1] = g;
      dstPixels[i + 2] = b;
      dstPixels[i + 3] = a;
    }
  }
};
const Kaleidoscope = function(imageData) {
  const xSize = imageData.width, ySize = imageData.height;
  let x, y, xoff, i, r, g, b, a, srcPos, dstPos;
  let power = Math.round(this.kaleidoscopePower());
  const angle = Math.round(this.kaleidoscopeAngle());
  const offset = Math.floor(xSize * (angle % 360) / 360);
  if (power < 1) {
    return;
  }
  const tempCanvas = Util.createCanvasElement();
  tempCanvas.width = xSize;
  tempCanvas.height = ySize;
  const scratchData = tempCanvas.getContext("2d").getImageData(0, 0, xSize, ySize);
  Util.releaseCanvas(tempCanvas);
  ToPolar(imageData, scratchData, {
    polarCenterX: xSize / 2,
    polarCenterY: ySize / 2
  });
  let minSectionSize = xSize / Math.pow(2, power);
  while (minSectionSize <= 8) {
    minSectionSize = minSectionSize * 2;
    power -= 1;
  }
  minSectionSize = Math.ceil(minSectionSize);
  let sectionSize = minSectionSize;
  let xStart = 0, xEnd = sectionSize, xDelta = 1;
  if (offset + minSectionSize > xSize) {
    xStart = sectionSize;
    xEnd = 0;
    xDelta = -1;
  }
  for (y = 0; y < ySize; y += 1) {
    for (x = xStart; x !== xEnd; x += xDelta) {
      xoff = Math.round(x + offset) % xSize;
      srcPos = (xSize * y + xoff) * 4;
      r = scratchData.data[srcPos + 0];
      g = scratchData.data[srcPos + 1];
      b = scratchData.data[srcPos + 2];
      a = scratchData.data[srcPos + 3];
      dstPos = (xSize * y + x) * 4;
      scratchData.data[dstPos + 0] = r;
      scratchData.data[dstPos + 1] = g;
      scratchData.data[dstPos + 2] = b;
      scratchData.data[dstPos + 3] = a;
    }
  }
  for (y = 0; y < ySize; y += 1) {
    sectionSize = Math.floor(minSectionSize);
    for (i = 0; i < power; i += 1) {
      for (x = 0; x < sectionSize + 1; x += 1) {
        srcPos = (xSize * y + x) * 4;
        r = scratchData.data[srcPos + 0];
        g = scratchData.data[srcPos + 1];
        b = scratchData.data[srcPos + 2];
        a = scratchData.data[srcPos + 3];
        dstPos = (xSize * y + sectionSize * 2 - x - 1) * 4;
        scratchData.data[dstPos + 0] = r;
        scratchData.data[dstPos + 1] = g;
        scratchData.data[dstPos + 2] = b;
        scratchData.data[dstPos + 3] = a;
      }
      sectionSize *= 2;
    }
  }
  FromPolar(scratchData, imageData, {});
};
Factory.addGetterSetter(Node, "kaleidoscopePower", 2, getNumberValidator(), Factory.afterSetFilter);
Factory.addGetterSetter(Node, "kaleidoscopeAngle", 0, getNumberValidator(), Factory.afterSetFilter);
function pixelAt(idata, x, y) {
  let idx = (y * idata.width + x) * 4;
  const d = [];
  d.push(idata.data[idx++], idata.data[idx++], idata.data[idx++], idata.data[idx++]);
  return d;
}
function rgbDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2) + Math.pow(p1[2] - p2[2], 2));
}
function rgbMean(pTab) {
  const m = [0, 0, 0];
  for (let i = 0; i < pTab.length; i++) {
    m[0] += pTab[i][0];
    m[1] += pTab[i][1];
    m[2] += pTab[i][2];
  }
  m[0] /= pTab.length;
  m[1] /= pTab.length;
  m[2] /= pTab.length;
  return m;
}
function backgroundMask(idata, threshold) {
  const rgbv_no = pixelAt(idata, 0, 0);
  const rgbv_ne = pixelAt(idata, idata.width - 1, 0);
  const rgbv_so = pixelAt(idata, 0, idata.height - 1);
  const rgbv_se = pixelAt(idata, idata.width - 1, idata.height - 1);
  const thres = threshold || 10;
  if (rgbDistance(rgbv_no, rgbv_ne) < thres && rgbDistance(rgbv_ne, rgbv_se) < thres && rgbDistance(rgbv_se, rgbv_so) < thres && rgbDistance(rgbv_so, rgbv_no) < thres) {
    const mean = rgbMean([rgbv_ne, rgbv_no, rgbv_se, rgbv_so]);
    const mask = [];
    for (let i = 0; i < idata.width * idata.height; i++) {
      const d = rgbDistance(mean, [
        idata.data[i * 4],
        idata.data[i * 4 + 1],
        idata.data[i * 4 + 2]
      ]);
      mask[i] = d < thres ? 0 : 255;
    }
    return mask;
  }
}
function applyMask(idata, mask) {
  for (let i = 0; i < idata.width * idata.height; i++) {
    idata.data[4 * i + 3] = mask[i];
  }
}
function erodeMask(mask, sw, sh) {
  const weights = [1, 1, 1, 1, 0, 1, 1, 1, 1];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const maskResult = [];
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const so = y * sw + x;
      let a = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            const srcOff = scy * sw + scx;
            const wt = weights[cy * side + cx];
            a += mask[srcOff] * wt;
          }
        }
      }
      maskResult[so] = a === 255 * 8 ? 255 : 0;
    }
  }
  return maskResult;
}
function dilateMask(mask, sw, sh) {
  const weights = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const maskResult = [];
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const so = y * sw + x;
      let a = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            const srcOff = scy * sw + scx;
            const wt = weights[cy * side + cx];
            a += mask[srcOff] * wt;
          }
        }
      }
      maskResult[so] = a >= 255 * 4 ? 255 : 0;
    }
  }
  return maskResult;
}
function smoothEdgeMask(mask, sw, sh) {
  const weights = [
    1 / 9,
    1 / 9,
    1 / 9,
    1 / 9,
    1 / 9,
    1 / 9,
    1 / 9,
    1 / 9,
    1 / 9
  ];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const maskResult = [];
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const so = y * sw + x;
      let a = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            const srcOff = scy * sw + scx;
            const wt = weights[cy * side + cx];
            a += mask[srcOff] * wt;
          }
        }
      }
      maskResult[so] = a;
    }
  }
  return maskResult;
}
const Mask = function(imageData) {
  const threshold = this.threshold();
  let mask = backgroundMask(imageData, threshold);
  if (mask) {
    mask = erodeMask(mask, imageData.width, imageData.height);
    mask = dilateMask(mask, imageData.width, imageData.height);
    mask = smoothEdgeMask(mask, imageData.width, imageData.height);
    applyMask(imageData, mask);
  }
  return imageData;
};
Factory.addGetterSetter(Node, "threshold", 0, getNumberValidator(), Factory.afterSetFilter);
const Noise = function(imageData) {
  const amount = this.noise() * 255, data = imageData.data, nPixels = data.length, half = amount / 2;
  for (let i = 0; i < nPixels; i += 4) {
    data[i + 0] += half - 2 * half * Math.random();
    data[i + 1] += half - 2 * half * Math.random();
    data[i + 2] += half - 2 * half * Math.random();
  }
};
Factory.addGetterSetter(Node, "noise", 0.2, getNumberValidator(), Factory.afterSetFilter);
const Pixelate = function(imageData) {
  let pixelSize = Math.ceil(this.pixelSize()), width = imageData.width, height = imageData.height, nBinsX = Math.ceil(width / pixelSize), nBinsY = Math.ceil(height / pixelSize), data = imageData.data;
  if (pixelSize <= 0) {
    Util.error("pixelSize value can not be <= 0");
    return;
  }
  for (let xBin = 0; xBin < nBinsX; xBin += 1) {
    for (let yBin = 0; yBin < nBinsY; yBin += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      const xBinStart = xBin * pixelSize;
      const xBinEnd = xBinStart + pixelSize;
      const yBinStart = yBin * pixelSize;
      const yBinEnd = yBinStart + pixelSize;
      let pixelsInBin = 0;
      for (let x = xBinStart; x < xBinEnd; x += 1) {
        if (x >= width) {
          continue;
        }
        for (let y = yBinStart; y < yBinEnd; y += 1) {
          if (y >= height) {
            continue;
          }
          const i = (width * y + x) * 4;
          red += data[i + 0];
          green += data[i + 1];
          blue += data[i + 2];
          alpha += data[i + 3];
          pixelsInBin += 1;
        }
      }
      red = red / pixelsInBin;
      green = green / pixelsInBin;
      blue = blue / pixelsInBin;
      alpha = alpha / pixelsInBin;
      for (let x = xBinStart; x < xBinEnd; x += 1) {
        if (x >= width) {
          continue;
        }
        for (let y = yBinStart; y < yBinEnd; y += 1) {
          if (y >= height) {
            continue;
          }
          const i = (width * y + x) * 4;
          data[i + 0] = red;
          data[i + 1] = green;
          data[i + 2] = blue;
          data[i + 3] = alpha;
        }
      }
    }
  }
};
Factory.addGetterSetter(Node, "pixelSize", 8, getNumberValidator(), Factory.afterSetFilter);
const Posterize = function(imageData) {
  const levels = Math.round(this.levels() * 254) + 1, data = imageData.data, len = data.length, scale = 255 / levels;
  for (let i = 0; i < len; i += 1) {
    data[i] = Math.floor(data[i] / scale) * scale;
  }
};
Factory.addGetterSetter(Node, "levels", 0.5, getNumberValidator(), Factory.afterSetFilter);
const RGB = function(imageData) {
  const data = imageData.data, nPixels = data.length, red = this.red(), green = this.green(), blue = this.blue();
  for (let i = 0; i < nPixels; i += 4) {
    const brightness = (0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2]) / 255;
    data[i] = brightness * red;
    data[i + 1] = brightness * green;
    data[i + 2] = brightness * blue;
    data[i + 3] = data[i + 3];
  }
};
Factory.addGetterSetter(Node, "red", 0, function(val) {
  this._filterUpToDate = false;
  if (val > 255) {
    return 255;
  } else if (val < 0) {
    return 0;
  } else {
    return Math.round(val);
  }
});
Factory.addGetterSetter(Node, "green", 0, function(val) {
  this._filterUpToDate = false;
  if (val > 255) {
    return 255;
  } else if (val < 0) {
    return 0;
  } else {
    return Math.round(val);
  }
});
Factory.addGetterSetter(Node, "blue", 0, RGBComponent, Factory.afterSetFilter);
const RGBA = function(imageData) {
  const data = imageData.data, nPixels = data.length, red = this.red(), green = this.green(), blue = this.blue(), alpha = this.alpha();
  for (let i = 0; i < nPixels; i += 4) {
    const ia = 1 - alpha;
    data[i] = red * alpha + data[i] * ia;
    data[i + 1] = green * alpha + data[i + 1] * ia;
    data[i + 2] = blue * alpha + data[i + 2] * ia;
  }
};
Factory.addGetterSetter(Node, "red", 0, function(val) {
  this._filterUpToDate = false;
  if (val > 255) {
    return 255;
  } else if (val < 0) {
    return 0;
  } else {
    return Math.round(val);
  }
});
Factory.addGetterSetter(Node, "green", 0, function(val) {
  this._filterUpToDate = false;
  if (val > 255) {
    return 255;
  } else if (val < 0) {
    return 0;
  } else {
    return Math.round(val);
  }
});
Factory.addGetterSetter(Node, "blue", 0, RGBComponent, Factory.afterSetFilter);
Factory.addGetterSetter(Node, "alpha", 1, function(val) {
  this._filterUpToDate = false;
  if (val > 1) {
    return 1;
  } else if (val < 0) {
    return 0;
  } else {
    return val;
  }
});
const Sepia = function(imageData) {
  const data = imageData.data, nPixels = data.length;
  for (let i = 0; i < nPixels; i += 4) {
    const r = data[i + 0];
    const g = data[i + 1];
    const b = data[i + 2];
    data[i + 0] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
  }
};
const Solarize = function(imageData) {
  const threshold = 128;
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (L >= threshold) {
      d[i] = 255 - r;
      d[i + 1] = 255 - g;
      d[i + 2] = 255 - b;
    }
  }
  return imageData;
};
const Threshold = function(imageData) {
  const level = this.threshold() * 255, data = imageData.data, len = data.length;
  for (let i = 0; i < len; i += 1) {
    data[i] = data[i] < level ? 0 : 255;
  }
};
Factory.addGetterSetter(Node, "threshold", 0.5, getNumberValidator(), Factory.afterSetFilter);
Konva.Util._assign(Konva, {
  Arc,
  Arrow,
  Circle,
  Ellipse,
  Image: Image$1,
  Label,
  Tag,
  Line,
  Path,
  Rect,
  RegularPolygon,
  Ring,
  Sprite,
  Star,
  Text,
  TextPath,
  Transformer,
  Wedge,
  Filters: {
    Blur,
    Brightness,
    Brighten,
    Contrast,
    Emboss,
    Enhance,
    Grayscale,
    HSL,
    HSV,
    Invert,
    Kaleidoscope,
    Mask,
    Noise,
    Pixelate,
    Posterize,
    RGB,
    RGBA,
    Sepia,
    Solarize,
    Threshold
  }
});
var B = typeof window < "u", W = () => {
  var _a, _b;
  return typeof process < "u" && ((_a = process.env) == null ? void 0 : _a.NODE_ENV) ? process.env.NODE_ENV === "development" : B && ((_b = window.__ENV__) == null ? void 0 : _b.MODE) ? window.__ENV__.MODE === "development" : true;
};
({ enable: W() });
async function V(e, r, n) {
  try {
    let t2 = await M(e), o = A(t2, r, n);
    return n[3] === 0 ? H(U(o)) : o;
  } catch (t2) {
    throw console.error("生成十六进制数组时出错:", t2), t2;
  }
}
function A(e, r, n) {
  let t2 = e.data, o = e.height, a = e.width, s = t2.length;
  if (n[4] == 1) {
    let l = [];
    for (let u = 0; u < s; u += 4) {
      let h = t2[u] * 0.299 + t2[u + 1] * 0.587 + t2[u + 2] * 0.114 > r ? 1 : 0;
      l[u / 4] = h;
    }
    let i = n[1], c;
    switch (i) {
      case 0:
        c = E;
        break;
      case 1:
        c = S;
        break;
      case 2:
        c = C;
        break;
      case 3:
        c = P;
        break;
      default:
        c = E;
    }
    if (typeof c != "function") throw new Error(`取模函数未定义，samplingMode: ${i}`);
    return c.call(this, l, a, o, n);
  } else return I(t2, a, o, n);
}
function I(e, r, n, t2) {
  let o = new Uint8Array(r * n * 2), a = 0, s = 0;
  for (; a < o.length && s < e.length; ) {
    let l = e[s], d = e[s + 1], i = e[s + 2], c = l >> 3 & 31, u = d >> 2 & 63, f = i >> 3 & 31, h = c << 11 | u << 5 | f;
    o[a] = h >> 8 & 255, o[a + 1] = h & 255, (t2[0] == 0 || t2[2] == 1) && (o[a] = ~o[a] & 255, o[a + 1] = ~o[a + 1] & 255), a += 2, s += 4;
  }
  return o;
}
function E(e, r, n, t2) {
  let o = Math.ceil(r / 8), a = new Uint8Array(o * n);
  for (let s = 0; s < e.length; s++) {
    let l = s % r, i = Math.floor(s / r), c = l % 8, u = 1 << c;
    t2[2] != 0 && (u = 1 << 7 - c);
    let f = i * o + Math.floor(l / 8), h = e[s];
    t2[0] !== 0 && (h = h === 0 ? 1 : 0), h === 0 ? a[f] |= u : a[f] &= ~u;
  }
  return a;
}
function S(e, r, n, t2) {
  let o = Math.ceil(n / 8), a = new Uint8Array(o * r);
  for (let s = 0; s < e.length; s++) {
    let l = s % r, d = Math.floor(s / r), i = l, c = d % 8, u = 1 << c;
    t2[2] != 0 && (u = 1 << 7 - c);
    let f = i * o + Math.floor(d / 8), h = e[s];
    t2[0] !== 0 && (h = h === 0 ? 1 : 0), h === 0 ? a[f] |= u : a[f] &= ~u;
  }
  return a;
}
function C(e, r, n, t2) {
  let o = Math.ceil(n / 8), a = new Uint8Array(o * r);
  for (let s = 0; s < e.length; s++) {
    let l = s % r, d = Math.floor(s / r), i = Math.floor(d / 8), c = d % 8, u = 1 << c;
    t2[2] != 0 && (u = 1 << 7 - c);
    let f = l + i * r, h = e[s];
    t2[0] !== 0 && (h = h === 0 ? 1 : 0), h === 0 ? a[f] |= u : a[f] &= ~u;
  }
  return a;
}
function P(e, r, n, t2) {
  let o = Math.ceil(r / 8), a = new Uint8Array(o * n);
  for (let s = 0; s < e.length; s++) {
    let l = s % r, d = Math.floor(s / r), i = Math.floor(l / 8), c = l % 8, u = 1 << c;
    t2[2] != 0 && (u = 1 << 7 - c);
    let f = i * n + d, h = e[s];
    t2[0] !== 0 && (h = h === 0 ? 1 : 0), h === 0 ? a[f] |= u : a[f] &= ~u;
  }
  return a;
}
function M(e) {
  return new Promise((r, n) => {
    let t2 = new Image();
    t2.crossOrigin = "anonymous", t2.src = e, t2.onload = () => {
      try {
        let o = document.createElement("canvas");
        o.width = t2.width, o.height = t2.height;
        let a = o.getContext("2d");
        a.drawImage(t2, 0, 0);
        let s = a.getImageData(0, 0, o.width, o.height);
        r(s);
      } catch (o) {
        n(new Error(`转换图像数据失败: ${o.message}`));
      }
    }, t2.onerror = () => {
      n(new Error("加载图像失败"));
    }, t2.src = e;
  });
}
function U(e) {
  return !e || e.length === 0 ? "" : Array.from(e).map((r) => Number(r).toString(16).padStart(2, "0")).join("");
}
function H(e) {
  if (!e || e.length === 0) return [];
  let r = [];
  for (let n = 0; n < e.length; n += 2) r.push("0x" + e.substring(n, n + 2));
  return r;
}
const { ipcMain: ipcMain$1 } = require("electron");
const fs$3 = require("fs-extra");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
const ffmpeg = require("fluent-ffmpeg");
const path$6 = require("path");
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const ffmpegScreenShot = async (videoPath, timeArr, tempPath, sizedata) => {
  return new Promise((resolve2, reject) => {
    ffmpeg(videoPath).on("end", () => {
      resolve2(true);
      console.info("screeshot ok");
    }).on("error", (err) => {
      console.info("error ->", err);
      reject(err);
    }).screenshots({
      timestamps: timeArr,
      filename: "temp_%i.png",
      folder: tempPath,
      size: `${sizedata}`
    });
  });
};
const ffmpegListener = async () => {
  ipcMain$1.handle(
    "get-video-frame-data",
    async (event, videoPath, width, height, videoDur, videoFrame, threshold, ...configArray) => {
      const tempDirPath = path$6.join(__dirname, "../../temp");
      if (!fs$3.existsSync(tempDirPath)) {
        fs$3.mkdirSync(tempDirPath);
      }
      const frameStrArr = genTimestampArr(videoDur, videoFrame);
      const result = await ffmpegScreenShot(
        videoPath,
        frameStrArr,
        tempDirPath,
        `${width}x${height}`
      );
      if (!result) {
        console.info("video frame error");
        return;
      }
      let resultData = [];
      const files = fs$3.readdirSync(tempDirPath, {
        withFileTypes: true
      });
      for (let o of files) {
        try {
          const imageBuffer = fs$3.readFileSync(path$6.join(tempDirPath, o.name));
          const base64Image = imageBuffer.toString("base64");
          const arrData = await V(base64Image, threshold, configArray);
          resultData.push(arrData);
        } catch (error2) {
          console.error("Error reading image:", error2);
          return null;
        }
        fs$3.unlinkSync(path$6.join(tempDirPath, o.name));
      }
      fs$3.rmdir(tempDirPath);
      return resultData;
    }
  );
};
const genTimestampArr = (videoDur, videoFrame) => {
  let temp2 = 1 / videoFrame;
  let strArr = [];
  for (let i = 0; i < videoDur; i++) {
    for (let j = 0; j < videoFrame; j++) {
      strArr.push(String((i + temp2 * j).toFixed(2)));
    }
  }
  return strArr;
};
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
require("path");
const getFilePath = async () => {
  let filePath = await require$$1.dialog.showOpenDialog({
    title: "选择一个文件",
    buttonLabel: "确认选择",
    properties: ["openFile"],
    filters: [
      {
        name: "视频资源",
        extensions: [
          "mp4",
          "avi",
          "mkv",
          "mov",
          "flv",
          "wmv",
          "webm",
          "mpeg",
          "mpg",
          "ogv",
          "3gp",
          "m4v",
          "asf",
          "rm",
          "rmvb",
          "ts"
        ]
      }
    ]
  });
  return filePath;
};
const fileListener = () => {
  require$$1.ipcMain.handle("select-video-file", async (event, arg) => {
    let filePath = await getFilePath();
    return filePath;
  });
};
var source = { exports: {} };
var isObj$1 = (value) => {
  const type2 = typeof value;
  return value !== null && (type2 === "object" || type2 === "function");
};
const isObj = isObj$1;
const disallowedKeys = /* @__PURE__ */ new Set([
  "__proto__",
  "prototype",
  "constructor"
]);
const isValidPath = (pathSegments) => !pathSegments.some((segment) => disallowedKeys.has(segment));
function getPathSegments(path2) {
  const pathArray = path2.split(".");
  const parts = [];
  for (let i = 0; i < pathArray.length; i++) {
    let p = pathArray[i];
    while (p[p.length - 1] === "\\" && pathArray[i + 1] !== void 0) {
      p = p.slice(0, -1) + ".";
      p += pathArray[++i];
    }
    parts.push(p);
  }
  if (!isValidPath(parts)) {
    return [];
  }
  return parts;
}
var dotProp = {
  get(object, path2, value) {
    if (!isObj(object) || typeof path2 !== "string") {
      return value === void 0 ? object : value;
    }
    const pathArray = getPathSegments(path2);
    if (pathArray.length === 0) {
      return;
    }
    for (let i = 0; i < pathArray.length; i++) {
      object = object[pathArray[i]];
      if (object === void 0 || object === null) {
        if (i !== pathArray.length - 1) {
          return value;
        }
        break;
      }
    }
    return object === void 0 ? value : object;
  },
  set(object, path2, value) {
    if (!isObj(object) || typeof path2 !== "string") {
      return object;
    }
    const root = object;
    const pathArray = getPathSegments(path2);
    for (let i = 0; i < pathArray.length; i++) {
      const p = pathArray[i];
      if (!isObj(object[p])) {
        object[p] = {};
      }
      if (i === pathArray.length - 1) {
        object[p] = value;
      }
      object = object[p];
    }
    return root;
  },
  delete(object, path2) {
    if (!isObj(object) || typeof path2 !== "string") {
      return false;
    }
    const pathArray = getPathSegments(path2);
    for (let i = 0; i < pathArray.length; i++) {
      const p = pathArray[i];
      if (i === pathArray.length - 1) {
        delete object[p];
        return true;
      }
      object = object[p];
      if (!isObj(object)) {
        return false;
      }
    }
  },
  has(object, path2) {
    if (!isObj(object) || typeof path2 !== "string") {
      return false;
    }
    const pathArray = getPathSegments(path2);
    if (pathArray.length === 0) {
      return false;
    }
    for (let i = 0; i < pathArray.length; i++) {
      if (isObj(object)) {
        if (!(pathArray[i] in object)) {
          return false;
        }
        object = object[pathArray[i]];
      } else {
        return false;
      }
    }
    return true;
  }
};
var pkgUp = { exports: {} };
var findUp$1 = { exports: {} };
var locatePath$1 = { exports: {} };
var pathExists$1 = { exports: {} };
const fs$2 = require$$0;
pathExists$1.exports = (fp) => new Promise((resolve2) => {
  fs$2.access(fp, (err) => {
    resolve2(!err);
  });
});
pathExists$1.exports.sync = (fp) => {
  try {
    fs$2.accessSync(fp);
    return true;
  } catch (err) {
    return false;
  }
};
var pathExistsExports = pathExists$1.exports;
var pLimit$2 = { exports: {} };
var pTry$2 = { exports: {} };
const pTry$1 = (fn, ...arguments_) => new Promise((resolve2) => {
  resolve2(fn(...arguments_));
});
pTry$2.exports = pTry$1;
pTry$2.exports.default = pTry$1;
var pTryExports = pTry$2.exports;
const pTry = pTryExports;
const pLimit$1 = (concurrency) => {
  if (!((Number.isInteger(concurrency) || concurrency === Infinity) && concurrency > 0)) {
    return Promise.reject(new TypeError("Expected `concurrency` to be a number from 1 and up"));
  }
  const queue = [];
  let activeCount = 0;
  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()();
    }
  };
  const run = (fn, resolve2, ...args) => {
    activeCount++;
    const result = pTry(fn, ...args);
    resolve2(result);
    result.then(next, next);
  };
  const enqueue = (fn, resolve2, ...args) => {
    if (activeCount < concurrency) {
      run(fn, resolve2, ...args);
    } else {
      queue.push(run.bind(null, fn, resolve2, ...args));
    }
  };
  const generator = (fn, ...args) => new Promise((resolve2) => enqueue(fn, resolve2, ...args));
  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount
    },
    pendingCount: {
      get: () => queue.length
    },
    clearQueue: {
      value: () => {
        queue.length = 0;
      }
    }
  });
  return generator;
};
pLimit$2.exports = pLimit$1;
pLimit$2.exports.default = pLimit$1;
var pLimitExports = pLimit$2.exports;
const pLimit = pLimitExports;
class EndError extends Error {
  constructor(value) {
    super();
    this.value = value;
  }
}
const testElement = (el, tester) => Promise.resolve(el).then(tester);
const finder = (el) => Promise.all(el).then((val) => val[1] === true && Promise.reject(new EndError(val[0])));
var pLocate$1 = (iterable, tester, opts) => {
  opts = Object.assign({
    concurrency: Infinity,
    preserveOrder: true
  }, opts);
  const limit2 = pLimit(opts.concurrency);
  const items2 = [...iterable].map((el) => [el, limit2(testElement, el, tester)]);
  const checkLimit = pLimit(opts.preserveOrder ? 1 : Infinity);
  return Promise.all(items2.map((el) => checkLimit(finder, el))).then(() => {
  }).catch((err) => err instanceof EndError ? err.value : Promise.reject(err));
};
const path$5 = require$$1$1;
const pathExists = pathExistsExports;
const pLocate = pLocate$1;
locatePath$1.exports = (iterable, options) => {
  options = Object.assign({
    cwd: process.cwd()
  }, options);
  return pLocate(iterable, (el) => pathExists(path$5.resolve(options.cwd, el)), options);
};
locatePath$1.exports.sync = (iterable, options) => {
  options = Object.assign({
    cwd: process.cwd()
  }, options);
  for (const el of iterable) {
    if (pathExists.sync(path$5.resolve(options.cwd, el))) {
      return el;
    }
  }
};
var locatePathExports = locatePath$1.exports;
const path$4 = require$$1$1;
const locatePath = locatePathExports;
findUp$1.exports = (filename, opts = {}) => {
  const startDir = path$4.resolve(opts.cwd || "");
  const { root } = path$4.parse(startDir);
  const filenames = [].concat(filename);
  return new Promise((resolve2) => {
    (function find(dir) {
      locatePath(filenames, { cwd: dir }).then((file) => {
        if (file) {
          resolve2(path$4.join(dir, file));
        } else if (dir === root) {
          resolve2(null);
        } else {
          find(path$4.dirname(dir));
        }
      });
    })(startDir);
  });
};
findUp$1.exports.sync = (filename, opts = {}) => {
  let dir = path$4.resolve(opts.cwd || "");
  const { root } = path$4.parse(dir);
  const filenames = [].concat(filename);
  while (true) {
    const file = locatePath.sync(filenames, { cwd: dir });
    if (file) {
      return path$4.join(dir, file);
    }
    if (dir === root) {
      return null;
    }
    dir = path$4.dirname(dir);
  }
};
var findUpExports = findUp$1.exports;
const findUp = findUpExports;
pkgUp.exports = async ({ cwd } = {}) => findUp("package.json", { cwd });
pkgUp.exports.sync = ({ cwd } = {}) => findUp.sync("package.json", { cwd });
var pkgUpExports = pkgUp.exports;
var envPaths$1 = { exports: {} };
const path$3 = require$$1$1;
const os = require$$1$2;
const homedir = os.homedir();
const tmpdir = os.tmpdir();
const { env } = process;
const macos = (name) => {
  const library = path$3.join(homedir, "Library");
  return {
    data: path$3.join(library, "Application Support", name),
    config: path$3.join(library, "Preferences", name),
    cache: path$3.join(library, "Caches", name),
    log: path$3.join(library, "Logs", name),
    temp: path$3.join(tmpdir, name)
  };
};
const windows = (name) => {
  const appData = env.APPDATA || path$3.join(homedir, "AppData", "Roaming");
  const localAppData = env.LOCALAPPDATA || path$3.join(homedir, "AppData", "Local");
  return {
    // Data/config/cache/log are invented by me as Windows isn't opinionated about this
    data: path$3.join(localAppData, name, "Data"),
    config: path$3.join(appData, name, "Config"),
    cache: path$3.join(localAppData, name, "Cache"),
    log: path$3.join(localAppData, name, "Log"),
    temp: path$3.join(tmpdir, name)
  };
};
const linux = (name) => {
  const username = path$3.basename(homedir);
  return {
    data: path$3.join(env.XDG_DATA_HOME || path$3.join(homedir, ".local", "share"), name),
    config: path$3.join(env.XDG_CONFIG_HOME || path$3.join(homedir, ".config"), name),
    cache: path$3.join(env.XDG_CACHE_HOME || path$3.join(homedir, ".cache"), name),
    // https://wiki.debian.org/XDGBaseDirectorySpecification#state
    log: path$3.join(env.XDG_STATE_HOME || path$3.join(homedir, ".local", "state"), name),
    temp: path$3.join(tmpdir, username, name)
  };
};
const envPaths = (name, options) => {
  if (typeof name !== "string") {
    throw new TypeError(`Expected string, got ${typeof name}`);
  }
  options = Object.assign({ suffix: "nodejs" }, options);
  if (options.suffix) {
    name += `-${options.suffix}`;
  }
  if (process.platform === "darwin") {
    return macos(name);
  }
  if (process.platform === "win32") {
    return windows(name);
  }
  return linux(name);
};
envPaths$1.exports = envPaths;
envPaths$1.exports.default = envPaths;
var envPathsExports = envPaths$1.exports;
var dist$1 = {};
var consts = {};
Object.defineProperty(consts, "__esModule", { value: true });
consts.NOOP = consts.LIMIT_FILES_DESCRIPTORS = consts.LIMIT_BASENAME_LENGTH = consts.IS_USER_ROOT = consts.IS_POSIX = consts.DEFAULT_TIMEOUT_SYNC = consts.DEFAULT_TIMEOUT_ASYNC = consts.DEFAULT_WRITE_OPTIONS = consts.DEFAULT_READ_OPTIONS = consts.DEFAULT_FOLDER_MODE = consts.DEFAULT_FILE_MODE = consts.DEFAULT_ENCODING = void 0;
const DEFAULT_ENCODING = "utf8";
consts.DEFAULT_ENCODING = DEFAULT_ENCODING;
const DEFAULT_FILE_MODE = 438;
consts.DEFAULT_FILE_MODE = DEFAULT_FILE_MODE;
const DEFAULT_FOLDER_MODE = 511;
consts.DEFAULT_FOLDER_MODE = DEFAULT_FOLDER_MODE;
const DEFAULT_READ_OPTIONS = {};
consts.DEFAULT_READ_OPTIONS = DEFAULT_READ_OPTIONS;
const DEFAULT_WRITE_OPTIONS = {};
consts.DEFAULT_WRITE_OPTIONS = DEFAULT_WRITE_OPTIONS;
const DEFAULT_TIMEOUT_ASYNC = 5e3;
consts.DEFAULT_TIMEOUT_ASYNC = DEFAULT_TIMEOUT_ASYNC;
const DEFAULT_TIMEOUT_SYNC = 100;
consts.DEFAULT_TIMEOUT_SYNC = DEFAULT_TIMEOUT_SYNC;
const IS_POSIX = !!process.getuid;
consts.IS_POSIX = IS_POSIX;
const IS_USER_ROOT = process.getuid ? !process.getuid() : false;
consts.IS_USER_ROOT = IS_USER_ROOT;
const LIMIT_BASENAME_LENGTH = 128;
consts.LIMIT_BASENAME_LENGTH = LIMIT_BASENAME_LENGTH;
const LIMIT_FILES_DESCRIPTORS = 1e4;
consts.LIMIT_FILES_DESCRIPTORS = LIMIT_FILES_DESCRIPTORS;
const NOOP = () => {
};
consts.NOOP = NOOP;
var fs$1 = {};
var attemptify = {};
Object.defineProperty(attemptify, "__esModule", { value: true });
attemptify.attemptifySync = attemptify.attemptifyAsync = void 0;
const consts_1$4 = consts;
const attemptifyAsync = (fn, onError = consts_1$4.NOOP) => {
  return function() {
    return fn.apply(void 0, arguments).catch(onError);
  };
};
attemptify.attemptifyAsync = attemptifyAsync;
const attemptifySync = (fn, onError = consts_1$4.NOOP) => {
  return function() {
    try {
      return fn.apply(void 0, arguments);
    } catch (error2) {
      return onError(error2);
    }
  };
};
attemptify.attemptifySync = attemptifySync;
var fs_handlers = {};
Object.defineProperty(fs_handlers, "__esModule", { value: true });
const consts_1$3 = consts;
const Handlers = {
  isChangeErrorOk: (error2) => {
    const { code: code2 } = error2;
    if (code2 === "ENOSYS")
      return true;
    if (!consts_1$3.IS_USER_ROOT && (code2 === "EINVAL" || code2 === "EPERM"))
      return true;
    return false;
  },
  isRetriableError: (error2) => {
    const { code: code2 } = error2;
    if (code2 === "EMFILE" || code2 === "ENFILE" || code2 === "EAGAIN" || code2 === "EBUSY" || code2 === "EACCESS" || code2 === "EACCS" || code2 === "EPERM")
      return true;
    return false;
  },
  onChangeError: (error2) => {
    if (Handlers.isChangeErrorOk(error2))
      return;
    throw error2;
  }
};
fs_handlers.default = Handlers;
var retryify = {};
var retryify_queue = {};
Object.defineProperty(retryify_queue, "__esModule", { value: true });
const consts_1$2 = consts;
const RetryfyQueue = {
  interval: 25,
  intervalId: void 0,
  limit: consts_1$2.LIMIT_FILES_DESCRIPTORS,
  queueActive: /* @__PURE__ */ new Set(),
  queueWaiting: /* @__PURE__ */ new Set(),
  init: () => {
    if (RetryfyQueue.intervalId)
      return;
    RetryfyQueue.intervalId = setInterval(RetryfyQueue.tick, RetryfyQueue.interval);
  },
  reset: () => {
    if (!RetryfyQueue.intervalId)
      return;
    clearInterval(RetryfyQueue.intervalId);
    delete RetryfyQueue.intervalId;
  },
  add: (fn) => {
    RetryfyQueue.queueWaiting.add(fn);
    if (RetryfyQueue.queueActive.size < RetryfyQueue.limit / 2) {
      RetryfyQueue.tick();
    } else {
      RetryfyQueue.init();
    }
  },
  remove: (fn) => {
    RetryfyQueue.queueWaiting.delete(fn);
    RetryfyQueue.queueActive.delete(fn);
  },
  schedule: () => {
    return new Promise((resolve2) => {
      const cleanup = () => RetryfyQueue.remove(resolver);
      const resolver = () => resolve2(cleanup);
      RetryfyQueue.add(resolver);
    });
  },
  tick: () => {
    if (RetryfyQueue.queueActive.size >= RetryfyQueue.limit)
      return;
    if (!RetryfyQueue.queueWaiting.size)
      return RetryfyQueue.reset();
    for (const fn of RetryfyQueue.queueWaiting) {
      if (RetryfyQueue.queueActive.size >= RetryfyQueue.limit)
        break;
      RetryfyQueue.queueWaiting.delete(fn);
      RetryfyQueue.queueActive.add(fn);
      fn();
    }
  }
};
retryify_queue.default = RetryfyQueue;
Object.defineProperty(retryify, "__esModule", { value: true });
retryify.retryifySync = retryify.retryifyAsync = void 0;
const retryify_queue_1 = retryify_queue;
const retryifyAsync = (fn, isRetriableError) => {
  return function(timestamp) {
    return function attempt() {
      return retryify_queue_1.default.schedule().then((cleanup) => {
        return fn.apply(void 0, arguments).then((result) => {
          cleanup();
          return result;
        }, (error2) => {
          cleanup();
          if (Date.now() >= timestamp)
            throw error2;
          if (isRetriableError(error2)) {
            const delay = Math.round(100 + 400 * Math.random()), delayPromise = new Promise((resolve2) => setTimeout(resolve2, delay));
            return delayPromise.then(() => attempt.apply(void 0, arguments));
          }
          throw error2;
        });
      });
    };
  };
};
retryify.retryifyAsync = retryifyAsync;
const retryifySync = (fn, isRetriableError) => {
  return function(timestamp) {
    return function attempt() {
      try {
        return fn.apply(void 0, arguments);
      } catch (error2) {
        if (Date.now() > timestamp)
          throw error2;
        if (isRetriableError(error2))
          return attempt.apply(void 0, arguments);
        throw error2;
      }
    };
  };
};
retryify.retryifySync = retryifySync;
Object.defineProperty(fs$1, "__esModule", { value: true });
const fs = require$$0;
const util_1$r = require$$4;
const attemptify_1 = attemptify;
const fs_handlers_1 = fs_handlers;
const retryify_1 = retryify;
const FS = {
  chmodAttempt: attemptify_1.attemptifyAsync(util_1$r.promisify(fs.chmod), fs_handlers_1.default.onChangeError),
  chownAttempt: attemptify_1.attemptifyAsync(util_1$r.promisify(fs.chown), fs_handlers_1.default.onChangeError),
  closeAttempt: attemptify_1.attemptifyAsync(util_1$r.promisify(fs.close)),
  fsyncAttempt: attemptify_1.attemptifyAsync(util_1$r.promisify(fs.fsync)),
  mkdirAttempt: attemptify_1.attemptifyAsync(util_1$r.promisify(fs.mkdir)),
  realpathAttempt: attemptify_1.attemptifyAsync(util_1$r.promisify(fs.realpath)),
  statAttempt: attemptify_1.attemptifyAsync(util_1$r.promisify(fs.stat)),
  unlinkAttempt: attemptify_1.attemptifyAsync(util_1$r.promisify(fs.unlink)),
  closeRetry: retryify_1.retryifyAsync(util_1$r.promisify(fs.close), fs_handlers_1.default.isRetriableError),
  fsyncRetry: retryify_1.retryifyAsync(util_1$r.promisify(fs.fsync), fs_handlers_1.default.isRetriableError),
  openRetry: retryify_1.retryifyAsync(util_1$r.promisify(fs.open), fs_handlers_1.default.isRetriableError),
  readFileRetry: retryify_1.retryifyAsync(util_1$r.promisify(fs.readFile), fs_handlers_1.default.isRetriableError),
  renameRetry: retryify_1.retryifyAsync(util_1$r.promisify(fs.rename), fs_handlers_1.default.isRetriableError),
  statRetry: retryify_1.retryifyAsync(util_1$r.promisify(fs.stat), fs_handlers_1.default.isRetriableError),
  writeRetry: retryify_1.retryifyAsync(util_1$r.promisify(fs.write), fs_handlers_1.default.isRetriableError),
  chmodSyncAttempt: attemptify_1.attemptifySync(fs.chmodSync, fs_handlers_1.default.onChangeError),
  chownSyncAttempt: attemptify_1.attemptifySync(fs.chownSync, fs_handlers_1.default.onChangeError),
  closeSyncAttempt: attemptify_1.attemptifySync(fs.closeSync),
  mkdirSyncAttempt: attemptify_1.attemptifySync(fs.mkdirSync),
  realpathSyncAttempt: attemptify_1.attemptifySync(fs.realpathSync),
  statSyncAttempt: attemptify_1.attemptifySync(fs.statSync),
  unlinkSyncAttempt: attemptify_1.attemptifySync(fs.unlinkSync),
  closeSyncRetry: retryify_1.retryifySync(fs.closeSync, fs_handlers_1.default.isRetriableError),
  fsyncSyncRetry: retryify_1.retryifySync(fs.fsyncSync, fs_handlers_1.default.isRetriableError),
  openSyncRetry: retryify_1.retryifySync(fs.openSync, fs_handlers_1.default.isRetriableError),
  readFileSyncRetry: retryify_1.retryifySync(fs.readFileSync, fs_handlers_1.default.isRetriableError),
  renameSyncRetry: retryify_1.retryifySync(fs.renameSync, fs_handlers_1.default.isRetriableError),
  statSyncRetry: retryify_1.retryifySync(fs.statSync, fs_handlers_1.default.isRetriableError),
  writeSyncRetry: retryify_1.retryifySync(fs.writeSync, fs_handlers_1.default.isRetriableError)
};
fs$1.default = FS;
var lang = {};
Object.defineProperty(lang, "__esModule", { value: true });
const Lang = {
  isFunction: (x) => {
    return typeof x === "function";
  },
  isString: (x) => {
    return typeof x === "string";
  },
  isUndefined: (x) => {
    return typeof x === "undefined";
  }
};
lang.default = Lang;
var scheduler = {};
Object.defineProperty(scheduler, "__esModule", { value: true });
const Queues = {};
const Scheduler = {
  next: (id2) => {
    const queue = Queues[id2];
    if (!queue)
      return;
    queue.shift();
    const job = queue[0];
    if (job) {
      job(() => Scheduler.next(id2));
    } else {
      delete Queues[id2];
    }
  },
  schedule: (id2) => {
    return new Promise((resolve2) => {
      let queue = Queues[id2];
      if (!queue)
        queue = Queues[id2] = [];
      queue.push(resolve2);
      if (queue.length > 1)
        return;
      resolve2(() => Scheduler.next(id2));
    });
  }
};
scheduler.default = Scheduler;
var temp = {};
Object.defineProperty(temp, "__esModule", { value: true });
const path$2 = require$$1$1;
const consts_1$1 = consts;
const fs_1$1 = fs$1;
const Temp = {
  store: {},
  create: (filePath) => {
    const randomness = `000000${Math.floor(Math.random() * 16777215).toString(16)}`.slice(-6), timestamp = Date.now().toString().slice(-10), prefix = "tmp-", suffix = `.${prefix}${timestamp}${randomness}`, tempPath = `${filePath}${suffix}`;
    return tempPath;
  },
  get: (filePath, creator, purge = true) => {
    const tempPath = Temp.truncate(creator(filePath));
    if (tempPath in Temp.store)
      return Temp.get(filePath, creator, purge);
    Temp.store[tempPath] = purge;
    const disposer = () => delete Temp.store[tempPath];
    return [tempPath, disposer];
  },
  purge: (filePath) => {
    if (!Temp.store[filePath])
      return;
    delete Temp.store[filePath];
    fs_1$1.default.unlinkAttempt(filePath);
  },
  purgeSync: (filePath) => {
    if (!Temp.store[filePath])
      return;
    delete Temp.store[filePath];
    fs_1$1.default.unlinkSyncAttempt(filePath);
  },
  purgeSyncAll: () => {
    for (const filePath in Temp.store) {
      Temp.purgeSync(filePath);
    }
  },
  truncate: (filePath) => {
    const basename = path$2.basename(filePath);
    if (basename.length <= consts_1$1.LIMIT_BASENAME_LENGTH)
      return filePath;
    const truncable = /^(\.?)(.*?)((?:\.[^.]+)?(?:\.tmp-\d{10}[a-f0-9]{6})?)$/.exec(basename);
    if (!truncable)
      return filePath;
    const truncationLength = basename.length - consts_1$1.LIMIT_BASENAME_LENGTH;
    return `${filePath.slice(0, -basename.length)}${truncable[1]}${truncable[2].slice(0, -truncationLength)}${truncable[3]}`;
  }
};
process.on("exit", Temp.purgeSyncAll);
temp.default = Temp;
Object.defineProperty(dist$1, "__esModule", { value: true });
dist$1.writeFileSync = dist$1.writeFile = dist$1.readFileSync = dist$1.readFile = void 0;
const path$1 = require$$1$1;
const consts_1 = consts;
const fs_1 = fs$1;
const lang_1 = lang;
const scheduler_1 = scheduler;
const temp_1 = temp;
function readFile(filePath, options = consts_1.DEFAULT_READ_OPTIONS) {
  var _a;
  if (lang_1.default.isString(options))
    return readFile(filePath, { encoding: options });
  const timeout = Date.now() + ((_a = options.timeout) !== null && _a !== void 0 ? _a : consts_1.DEFAULT_TIMEOUT_ASYNC);
  return fs_1.default.readFileRetry(timeout)(filePath, options);
}
dist$1.readFile = readFile;
function readFileSync(filePath, options = consts_1.DEFAULT_READ_OPTIONS) {
  var _a;
  if (lang_1.default.isString(options))
    return readFileSync(filePath, { encoding: options });
  const timeout = Date.now() + ((_a = options.timeout) !== null && _a !== void 0 ? _a : consts_1.DEFAULT_TIMEOUT_SYNC);
  return fs_1.default.readFileSyncRetry(timeout)(filePath, options);
}
dist$1.readFileSync = readFileSync;
const writeFile = (filePath, data, options, callback) => {
  if (lang_1.default.isFunction(options))
    return writeFile(filePath, data, consts_1.DEFAULT_WRITE_OPTIONS, options);
  const promise = writeFileAsync(filePath, data, options);
  if (callback)
    promise.then(callback, callback);
  return promise;
};
dist$1.writeFile = writeFile;
const writeFileAsync = async (filePath, data, options = consts_1.DEFAULT_WRITE_OPTIONS) => {
  var _a;
  if (lang_1.default.isString(options))
    return writeFileAsync(filePath, data, { encoding: options });
  const timeout = Date.now() + ((_a = options.timeout) !== null && _a !== void 0 ? _a : consts_1.DEFAULT_TIMEOUT_ASYNC);
  let schedulerCustomDisposer = null, schedulerDisposer = null, tempDisposer = null, tempPath = null, fd = null;
  try {
    if (options.schedule)
      schedulerCustomDisposer = await options.schedule(filePath);
    schedulerDisposer = await scheduler_1.default.schedule(filePath);
    filePath = await fs_1.default.realpathAttempt(filePath) || filePath;
    [tempPath, tempDisposer] = temp_1.default.get(filePath, options.tmpCreate || temp_1.default.create, !(options.tmpPurge === false));
    const useStatChown = consts_1.IS_POSIX && lang_1.default.isUndefined(options.chown), useStatMode = lang_1.default.isUndefined(options.mode);
    if (useStatChown || useStatMode) {
      const stat = await fs_1.default.statAttempt(filePath);
      if (stat) {
        options = { ...options };
        if (useStatChown)
          options.chown = { uid: stat.uid, gid: stat.gid };
        if (useStatMode)
          options.mode = stat.mode;
      }
    }
    const parentPath = path$1.dirname(filePath);
    await fs_1.default.mkdirAttempt(parentPath, {
      mode: consts_1.DEFAULT_FOLDER_MODE,
      recursive: true
    });
    fd = await fs_1.default.openRetry(timeout)(tempPath, "w", options.mode || consts_1.DEFAULT_FILE_MODE);
    if (options.tmpCreated)
      options.tmpCreated(tempPath);
    if (lang_1.default.isString(data)) {
      await fs_1.default.writeRetry(timeout)(fd, data, 0, options.encoding || consts_1.DEFAULT_ENCODING);
    } else if (!lang_1.default.isUndefined(data)) {
      await fs_1.default.writeRetry(timeout)(fd, data, 0, data.length, 0);
    }
    if (options.fsync !== false) {
      if (options.fsyncWait !== false) {
        await fs_1.default.fsyncRetry(timeout)(fd);
      } else {
        fs_1.default.fsyncAttempt(fd);
      }
    }
    await fs_1.default.closeRetry(timeout)(fd);
    fd = null;
    if (options.chown)
      await fs_1.default.chownAttempt(tempPath, options.chown.uid, options.chown.gid);
    if (options.mode)
      await fs_1.default.chmodAttempt(tempPath, options.mode);
    try {
      await fs_1.default.renameRetry(timeout)(tempPath, filePath);
    } catch (error2) {
      if (error2.code !== "ENAMETOOLONG")
        throw error2;
      await fs_1.default.renameRetry(timeout)(tempPath, temp_1.default.truncate(filePath));
    }
    tempDisposer();
    tempPath = null;
  } finally {
    if (fd)
      await fs_1.default.closeAttempt(fd);
    if (tempPath)
      temp_1.default.purge(tempPath);
    if (schedulerCustomDisposer)
      schedulerCustomDisposer();
    if (schedulerDisposer)
      schedulerDisposer();
  }
};
const writeFileSync = (filePath, data, options = consts_1.DEFAULT_WRITE_OPTIONS) => {
  var _a;
  if (lang_1.default.isString(options))
    return writeFileSync(filePath, data, { encoding: options });
  const timeout = Date.now() + ((_a = options.timeout) !== null && _a !== void 0 ? _a : consts_1.DEFAULT_TIMEOUT_SYNC);
  let tempDisposer = null, tempPath = null, fd = null;
  try {
    filePath = fs_1.default.realpathSyncAttempt(filePath) || filePath;
    [tempPath, tempDisposer] = temp_1.default.get(filePath, options.tmpCreate || temp_1.default.create, !(options.tmpPurge === false));
    const useStatChown = consts_1.IS_POSIX && lang_1.default.isUndefined(options.chown), useStatMode = lang_1.default.isUndefined(options.mode);
    if (useStatChown || useStatMode) {
      const stat = fs_1.default.statSyncAttempt(filePath);
      if (stat) {
        options = { ...options };
        if (useStatChown)
          options.chown = { uid: stat.uid, gid: stat.gid };
        if (useStatMode)
          options.mode = stat.mode;
      }
    }
    const parentPath = path$1.dirname(filePath);
    fs_1.default.mkdirSyncAttempt(parentPath, {
      mode: consts_1.DEFAULT_FOLDER_MODE,
      recursive: true
    });
    fd = fs_1.default.openSyncRetry(timeout)(tempPath, "w", options.mode || consts_1.DEFAULT_FILE_MODE);
    if (options.tmpCreated)
      options.tmpCreated(tempPath);
    if (lang_1.default.isString(data)) {
      fs_1.default.writeSyncRetry(timeout)(fd, data, 0, options.encoding || consts_1.DEFAULT_ENCODING);
    } else if (!lang_1.default.isUndefined(data)) {
      fs_1.default.writeSyncRetry(timeout)(fd, data, 0, data.length, 0);
    }
    if (options.fsync !== false) {
      if (options.fsyncWait !== false) {
        fs_1.default.fsyncSyncRetry(timeout)(fd);
      } else {
        fs_1.default.fsyncAttempt(fd);
      }
    }
    fs_1.default.closeSyncRetry(timeout)(fd);
    fd = null;
    if (options.chown)
      fs_1.default.chownSyncAttempt(tempPath, options.chown.uid, options.chown.gid);
    if (options.mode)
      fs_1.default.chmodSyncAttempt(tempPath, options.mode);
    try {
      fs_1.default.renameSyncRetry(timeout)(tempPath, filePath);
    } catch (error2) {
      if (error2.code !== "ENAMETOOLONG")
        throw error2;
      fs_1.default.renameSyncRetry(timeout)(tempPath, temp_1.default.truncate(filePath));
    }
    tempDisposer();
    tempPath = null;
  } finally {
    if (fd)
      fs_1.default.closeSyncAttempt(fd);
    if (tempPath)
      temp_1.default.purge(tempPath);
  }
};
dist$1.writeFileSync = writeFileSync;
var ajv = { exports: {} };
var core$2 = {};
var validate = {};
var boolSchema = {};
var errors = {};
var codegen = {};
var code$1 = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.regexpCode = exports$1.getEsmExportName = exports$1.getProperty = exports$1.safeStringify = exports$1.stringify = exports$1.strConcat = exports$1.addCodeArg = exports$1.str = exports$1._ = exports$1.nil = exports$1._Code = exports$1.Name = exports$1.IDENTIFIER = exports$1._CodeOrName = void 0;
  class _CodeOrName {
  }
  exports$1._CodeOrName = _CodeOrName;
  exports$1.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class Name extends _CodeOrName {
    constructor(s) {
      super();
      if (!exports$1.IDENTIFIER.test(s))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = s;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return false;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  exports$1.Name = Name;
  class _Code extends _CodeOrName {
    constructor(code2) {
      super();
      this._items = typeof code2 === "string" ? [code2] : code2;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return false;
      const item = this._items[0];
      return item === "" || item === '""';
    }
    get str() {
      var _a;
      return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
    }
    get names() {
      var _a;
      return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names2, c) => {
        if (c instanceof Name)
          names2[c.str] = (names2[c.str] || 0) + 1;
        return names2;
      }, {});
    }
  }
  exports$1._Code = _Code;
  exports$1.nil = new _Code("");
  function _(strs, ...args) {
    const code2 = [strs[0]];
    let i = 0;
    while (i < args.length) {
      addCodeArg(code2, args[i]);
      code2.push(strs[++i]);
    }
    return new _Code(code2);
  }
  exports$1._ = _;
  const plus = new _Code("+");
  function str(strs, ...args) {
    const expr = [safeStringify(strs[0])];
    let i = 0;
    while (i < args.length) {
      expr.push(plus);
      addCodeArg(expr, args[i]);
      expr.push(plus, safeStringify(strs[++i]));
    }
    optimize(expr);
    return new _Code(expr);
  }
  exports$1.str = str;
  function addCodeArg(code2, arg) {
    if (arg instanceof _Code)
      code2.push(...arg._items);
    else if (arg instanceof Name)
      code2.push(arg);
    else
      code2.push(interpolate(arg));
  }
  exports$1.addCodeArg = addCodeArg;
  function optimize(expr) {
    let i = 1;
    while (i < expr.length - 1) {
      if (expr[i] === plus) {
        const res = mergeExprItems(expr[i - 1], expr[i + 1]);
        if (res !== void 0) {
          expr.splice(i - 1, 3, res);
          continue;
        }
        expr[i++] = "+";
      }
      i++;
    }
  }
  function mergeExprItems(a, b) {
    if (b === '""')
      return a;
    if (a === '""')
      return b;
    if (typeof a == "string") {
      if (b instanceof Name || a[a.length - 1] !== '"')
        return;
      if (typeof b != "string")
        return `${a.slice(0, -1)}${b}"`;
      if (b[0] === '"')
        return a.slice(0, -1) + b.slice(1);
      return;
    }
    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
      return `"${a}${b.slice(1)}`;
    return;
  }
  function strConcat(c1, c2) {
    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
  }
  exports$1.strConcat = strConcat;
  function interpolate(x) {
    return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
  }
  function stringify(x) {
    return new _Code(safeStringify(x));
  }
  exports$1.stringify = stringify;
  function safeStringify(x) {
    return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  exports$1.safeStringify = safeStringify;
  function getProperty(key) {
    return typeof key == "string" && exports$1.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
  }
  exports$1.getProperty = getProperty;
  function getEsmExportName(key) {
    if (typeof key == "string" && exports$1.IDENTIFIER.test(key)) {
      return new _Code(`${key}`);
    }
    throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
  }
  exports$1.getEsmExportName = getEsmExportName;
  function regexpCode(rx) {
    return new _Code(rx.toString());
  }
  exports$1.regexpCode = regexpCode;
})(code$1);
var scope = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.ValueScope = exports$1.ValueScopeName = exports$1.Scope = exports$1.varKinds = exports$1.UsedValueState = void 0;
  const code_12 = code$1;
  class ValueError extends Error {
    constructor(name) {
      super(`CodeGen: "code" for ${name} not defined`);
      this.value = name.value;
    }
  }
  var UsedValueState;
  (function(UsedValueState2) {
    UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
    UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
  })(UsedValueState || (exports$1.UsedValueState = UsedValueState = {}));
  exports$1.varKinds = {
    const: new code_12.Name("const"),
    let: new code_12.Name("let"),
    var: new code_12.Name("var")
  };
  class Scope {
    constructor({ prefixes, parent } = {}) {
      this._names = {};
      this._prefixes = prefixes;
      this._parent = parent;
    }
    toName(nameOrPrefix) {
      return nameOrPrefix instanceof code_12.Name ? nameOrPrefix : this.name(nameOrPrefix);
    }
    name(prefix) {
      return new code_12.Name(this._newName(prefix));
    }
    _newName(prefix) {
      const ng = this._names[prefix] || this._nameGroup(prefix);
      return `${prefix}${ng.index++}`;
    }
    _nameGroup(prefix) {
      var _a, _b;
      if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
        throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
      }
      return this._names[prefix] = { prefix, index: 0 };
    }
  }
  exports$1.Scope = Scope;
  class ValueScopeName extends code_12.Name {
    constructor(prefix, nameStr) {
      super(nameStr);
      this.prefix = prefix;
    }
    setValue(value, { property, itemIndex }) {
      this.value = value;
      this.scopePath = (0, code_12._)`.${new code_12.Name(property)}[${itemIndex}]`;
    }
  }
  exports$1.ValueScopeName = ValueScopeName;
  const line = (0, code_12._)`\n`;
  class ValueScope extends Scope {
    constructor(opts) {
      super(opts);
      this._values = {};
      this._scope = opts.scope;
      this.opts = { ...opts, _n: opts.lines ? line : code_12.nil };
    }
    get() {
      return this._scope;
    }
    name(prefix) {
      return new ValueScopeName(prefix, this._newName(prefix));
    }
    value(nameOrPrefix, value) {
      var _a;
      if (value.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const name = this.toName(nameOrPrefix);
      const { prefix } = name;
      const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
      let vs = this._values[prefix];
      if (vs) {
        const _name = vs.get(valueKey);
        if (_name)
          return _name;
      } else {
        vs = this._values[prefix] = /* @__PURE__ */ new Map();
      }
      vs.set(valueKey, name);
      const s = this._scope[prefix] || (this._scope[prefix] = []);
      const itemIndex = s.length;
      s[itemIndex] = value.ref;
      name.setValue(value, { property: prefix, itemIndex });
      return name;
    }
    getValue(prefix, keyOrRef) {
      const vs = this._values[prefix];
      if (!vs)
        return;
      return vs.get(keyOrRef);
    }
    scopeRefs(scopeName, values = this._values) {
      return this._reduceValues(values, (name) => {
        if (name.scopePath === void 0)
          throw new Error(`CodeGen: name "${name}" has no value`);
        return (0, code_12._)`${scopeName}${name.scopePath}`;
      });
    }
    scopeCode(values = this._values, usedValues, getCode) {
      return this._reduceValues(values, (name) => {
        if (name.value === void 0)
          throw new Error(`CodeGen: name "${name}" has no value`);
        return name.value.code;
      }, usedValues, getCode);
    }
    _reduceValues(values, valueCode, usedValues = {}, getCode) {
      let code2 = code_12.nil;
      for (const prefix in values) {
        const vs = values[prefix];
        if (!vs)
          continue;
        const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
        vs.forEach((name) => {
          if (nameSet.has(name))
            return;
          nameSet.set(name, UsedValueState.Started);
          let c = valueCode(name);
          if (c) {
            const def2 = this.opts.es5 ? exports$1.varKinds.var : exports$1.varKinds.const;
            code2 = (0, code_12._)`${code2}${def2} ${name} = ${c};${this.opts._n}`;
          } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
            code2 = (0, code_12._)`${code2}${c}${this.opts._n}`;
          } else {
            throw new ValueError(name);
          }
          nameSet.set(name, UsedValueState.Completed);
        });
      }
      return code2;
    }
  }
  exports$1.ValueScope = ValueScope;
})(scope);
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.or = exports$1.and = exports$1.not = exports$1.CodeGen = exports$1.operators = exports$1.varKinds = exports$1.ValueScopeName = exports$1.ValueScope = exports$1.Scope = exports$1.Name = exports$1.regexpCode = exports$1.stringify = exports$1.getProperty = exports$1.nil = exports$1.strConcat = exports$1.str = exports$1._ = void 0;
  const code_12 = code$1;
  const scope_1 = scope;
  var code_2 = code$1;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return code_2._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return code_2.str;
  } });
  Object.defineProperty(exports$1, "strConcat", { enumerable: true, get: function() {
    return code_2.strConcat;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return code_2.nil;
  } });
  Object.defineProperty(exports$1, "getProperty", { enumerable: true, get: function() {
    return code_2.getProperty;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return code_2.stringify;
  } });
  Object.defineProperty(exports$1, "regexpCode", { enumerable: true, get: function() {
    return code_2.regexpCode;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return code_2.Name;
  } });
  var scope_2 = scope;
  Object.defineProperty(exports$1, "Scope", { enumerable: true, get: function() {
    return scope_2.Scope;
  } });
  Object.defineProperty(exports$1, "ValueScope", { enumerable: true, get: function() {
    return scope_2.ValueScope;
  } });
  Object.defineProperty(exports$1, "ValueScopeName", { enumerable: true, get: function() {
    return scope_2.ValueScopeName;
  } });
  Object.defineProperty(exports$1, "varKinds", { enumerable: true, get: function() {
    return scope_2.varKinds;
  } });
  exports$1.operators = {
    GT: new code_12._Code(">"),
    GTE: new code_12._Code(">="),
    LT: new code_12._Code("<"),
    LTE: new code_12._Code("<="),
    EQ: new code_12._Code("==="),
    NEQ: new code_12._Code("!=="),
    NOT: new code_12._Code("!"),
    OR: new code_12._Code("||"),
    AND: new code_12._Code("&&"),
    ADD: new code_12._Code("+")
  };
  class Node2 {
    optimizeNodes() {
      return this;
    }
    optimizeNames(_names, _constants) {
      return this;
    }
  }
  class Def extends Node2 {
    constructor(varKind, name, rhs) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.rhs = rhs;
    }
    render({ es5, _n }) {
      const varKind = es5 ? scope_1.varKinds.var : this.varKind;
      const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${varKind} ${this.name}${rhs};` + _n;
    }
    optimizeNames(names2, constants2) {
      if (!names2[this.name.str])
        return;
      if (this.rhs)
        this.rhs = optimizeExpr(this.rhs, names2, constants2);
      return this;
    }
    get names() {
      return this.rhs instanceof code_12._CodeOrName ? this.rhs.names : {};
    }
  }
  class Assign extends Node2 {
    constructor(lhs, rhs, sideEffects) {
      super();
      this.lhs = lhs;
      this.rhs = rhs;
      this.sideEffects = sideEffects;
    }
    render({ _n }) {
      return `${this.lhs} = ${this.rhs};` + _n;
    }
    optimizeNames(names2, constants2) {
      if (this.lhs instanceof code_12.Name && !names2[this.lhs.str] && !this.sideEffects)
        return;
      this.rhs = optimizeExpr(this.rhs, names2, constants2);
      return this;
    }
    get names() {
      const names2 = this.lhs instanceof code_12.Name ? {} : { ...this.lhs.names };
      return addExprNames(names2, this.rhs);
    }
  }
  class AssignOp extends Assign {
    constructor(lhs, op, rhs, sideEffects) {
      super(lhs, rhs, sideEffects);
      this.op = op;
    }
    render({ _n }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
    }
  }
  class Label2 extends Node2 {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `${this.label}:` + _n;
    }
  }
  class Break extends Node2 {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      const label = this.label ? ` ${this.label}` : "";
      return `break${label};` + _n;
    }
  }
  class Throw extends Node2 {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render({ _n }) {
      return `throw ${this.error};` + _n;
    }
    get names() {
      return this.error.names;
    }
  }
  class AnyCode extends Node2 {
    constructor(code2) {
      super();
      this.code = code2;
    }
    render({ _n }) {
      return `${this.code};` + _n;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(names2, constants2) {
      this.code = optimizeExpr(this.code, names2, constants2);
      return this;
    }
    get names() {
      return this.code instanceof code_12._CodeOrName ? this.code.names : {};
    }
  }
  class ParentNode extends Node2 {
    constructor(nodes = []) {
      super();
      this.nodes = nodes;
    }
    render(opts) {
      return this.nodes.reduce((code2, n) => code2 + n.render(opts), "");
    }
    optimizeNodes() {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i].optimizeNodes();
        if (Array.isArray(n))
          nodes.splice(i, 1, ...n);
        else if (n)
          nodes[i] = n;
        else
          nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    optimizeNames(names2, constants2) {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i];
        if (n.optimizeNames(names2, constants2))
          continue;
        subtractNames(names2, n.names);
        nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((names2, n) => addNames(names2, n.names), {});
    }
  }
  class BlockNode extends ParentNode {
    render(opts) {
      return "{" + opts._n + super.render(opts) + "}" + opts._n;
    }
  }
  class Root extends ParentNode {
  }
  class Else extends BlockNode {
  }
  Else.kind = "else";
  class If extends BlockNode {
    constructor(condition, nodes) {
      super(nodes);
      this.condition = condition;
    }
    render(opts) {
      let code2 = `if(${this.condition})` + super.render(opts);
      if (this.else)
        code2 += "else " + this.else.render(opts);
      return code2;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const cond = this.condition;
      if (cond === true)
        return this.nodes;
      let e = this.else;
      if (e) {
        const ns = e.optimizeNodes();
        e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
      }
      if (e) {
        if (cond === false)
          return e instanceof If ? e : e.nodes;
        if (this.nodes.length)
          return this;
        return new If(not2(cond), e instanceof If ? [e] : e.nodes);
      }
      if (cond === false || !this.nodes.length)
        return void 0;
      return this;
    }
    optimizeNames(names2, constants2) {
      var _a;
      this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants2);
      if (!(super.optimizeNames(names2, constants2) || this.else))
        return;
      this.condition = optimizeExpr(this.condition, names2, constants2);
      return this;
    }
    get names() {
      const names2 = super.names;
      addExprNames(names2, this.condition);
      if (this.else)
        addNames(names2, this.else.names);
      return names2;
    }
  }
  If.kind = "if";
  class For extends BlockNode {
  }
  For.kind = "for";
  class ForLoop extends For {
    constructor(iteration) {
      super();
      this.iteration = iteration;
    }
    render(opts) {
      return `for(${this.iteration})` + super.render(opts);
    }
    optimizeNames(names2, constants2) {
      if (!super.optimizeNames(names2, constants2))
        return;
      this.iteration = optimizeExpr(this.iteration, names2, constants2);
      return this;
    }
    get names() {
      return addNames(super.names, this.iteration.names);
    }
  }
  class ForRange extends For {
    constructor(varKind, name, from, to) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.from = from;
      this.to = to;
    }
    render(opts) {
      const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
      const { name, from, to } = this;
      return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
    }
    get names() {
      const names2 = addExprNames(super.names, this.from);
      return addExprNames(names2, this.to);
    }
  }
  class ForIter extends For {
    constructor(loop, varKind, name, iterable) {
      super();
      this.loop = loop;
      this.varKind = varKind;
      this.name = name;
      this.iterable = iterable;
    }
    render(opts) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
    }
    optimizeNames(names2, constants2) {
      if (!super.optimizeNames(names2, constants2))
        return;
      this.iterable = optimizeExpr(this.iterable, names2, constants2);
      return this;
    }
    get names() {
      return addNames(super.names, this.iterable.names);
    }
  }
  class Func extends BlockNode {
    constructor(name, args, async) {
      super();
      this.name = name;
      this.args = args;
      this.async = async;
    }
    render(opts) {
      const _async = this.async ? "async " : "";
      return `${_async}function ${this.name}(${this.args})` + super.render(opts);
    }
  }
  Func.kind = "func";
  class Return extends ParentNode {
    render(opts) {
      return "return " + super.render(opts);
    }
  }
  Return.kind = "return";
  class Try extends BlockNode {
    render(opts) {
      let code2 = "try" + super.render(opts);
      if (this.catch)
        code2 += this.catch.render(opts);
      if (this.finally)
        code2 += this.finally.render(opts);
      return code2;
    }
    optimizeNodes() {
      var _a, _b;
      super.optimizeNodes();
      (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
      (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
      return this;
    }
    optimizeNames(names2, constants2) {
      var _a, _b;
      super.optimizeNames(names2, constants2);
      (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names2, constants2);
      (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names2, constants2);
      return this;
    }
    get names() {
      const names2 = super.names;
      if (this.catch)
        addNames(names2, this.catch.names);
      if (this.finally)
        addNames(names2, this.finally.names);
      return names2;
    }
  }
  class Catch extends BlockNode {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render(opts) {
      return `catch(${this.error})` + super.render(opts);
    }
  }
  Catch.kind = "catch";
  class Finally extends BlockNode {
    render(opts) {
      return "finally" + super.render(opts);
    }
  }
  Finally.kind = "finally";
  class CodeGen {
    constructor(extScope, opts = {}) {
      this._values = {};
      this._blockStarts = [];
      this._constants = {};
      this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
      this._extScope = extScope;
      this._scope = new scope_1.Scope({ parent: extScope });
      this._nodes = [new Root()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(prefix) {
      return this._scope.name(prefix);
    }
    // reserves unique name in the external scope
    scopeName(prefix) {
      return this._extScope.name(prefix);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(prefixOrName, value) {
      const name = this._extScope.value(prefixOrName, value);
      const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
      vs.add(name);
      return name;
    }
    getScopeValue(prefix, keyOrRef) {
      return this._extScope.getValue(prefix, keyOrRef);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(scopeName) {
      return this._extScope.scopeRefs(scopeName, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(varKind, nameOrPrefix, rhs, constant) {
      const name = this._scope.toName(nameOrPrefix);
      if (rhs !== void 0 && constant)
        this._constants[name.str] = rhs;
      this._leafNode(new Def(varKind, name, rhs));
      return name;
    }
    // `const` declaration (`var` in es5 mode)
    const(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
    }
    // `var` declaration with optional assignment
    var(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
    }
    // assignment code
    assign(lhs, rhs, sideEffects) {
      return this._leafNode(new Assign(lhs, rhs, sideEffects));
    }
    // `+=` code
    add(lhs, rhs) {
      return this._leafNode(new AssignOp(lhs, exports$1.operators.ADD, rhs));
    }
    // appends passed SafeExpr to code or executes Block
    code(c) {
      if (typeof c == "function")
        c();
      else if (c !== code_12.nil)
        this._leafNode(new AnyCode(c));
      return this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...keyValues) {
      const code2 = ["{"];
      for (const [key, value] of keyValues) {
        if (code2.length > 1)
          code2.push(",");
        code2.push(key);
        if (key !== value || this.opts.es5) {
          code2.push(":");
          (0, code_12.addCodeArg)(code2, value);
        }
      }
      code2.push("}");
      return new code_12._Code(code2);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(condition, thenBody, elseBody) {
      this._blockNode(new If(condition));
      if (thenBody && elseBody) {
        this.code(thenBody).else().code(elseBody).endIf();
      } else if (thenBody) {
        this.code(thenBody).endIf();
      } else if (elseBody) {
        throw new Error('CodeGen: "else" body without "then" body');
      }
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(condition) {
      return this._elseNode(new If(condition));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new Else());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(If, Else);
    }
    _for(node, forBody) {
      this._blockNode(node);
      if (forBody)
        this.code(forBody).endFor();
      return this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(iteration, forBody) {
      return this._for(new ForLoop(iteration), forBody);
    }
    // `for` statement for a range of values
    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
      const name = this._scope.toName(nameOrPrefix);
      if (this.opts.es5) {
        const arr = iterable instanceof code_12.Name ? iterable : this.var("_arr", iterable);
        return this.forRange("_i", 0, (0, code_12._)`${arr}.length`, (i) => {
          this.var(name, (0, code_12._)`${arr}[${i}]`);
          forBody(name);
        });
      }
      return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
      if (this.opts.ownProperties) {
        return this.forOf(nameOrPrefix, (0, code_12._)`Object.keys(${obj})`, forBody);
      }
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(For);
    }
    // `label` statement
    label(label) {
      return this._leafNode(new Label2(label));
    }
    // `break` statement
    break(label) {
      return this._leafNode(new Break(label));
    }
    // `return` statement
    return(value) {
      const node = new Return();
      this._blockNode(node);
      this.code(value);
      if (node.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(Return);
    }
    // `try` statement
    try(tryBody, catchCode, finallyCode) {
      if (!catchCode && !finallyCode)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const node = new Try();
      this._blockNode(node);
      this.code(tryBody);
      if (catchCode) {
        const error2 = this.name("e");
        this._currNode = node.catch = new Catch(error2);
        catchCode(error2);
      }
      if (finallyCode) {
        this._currNode = node.finally = new Finally();
        this.code(finallyCode);
      }
      return this._endBlockNode(Catch, Finally);
    }
    // `throw` statement
    throw(error2) {
      return this._leafNode(new Throw(error2));
    }
    // start self-balancing block
    block(body, nodeCount) {
      this._blockStarts.push(this._nodes.length);
      if (body)
        this.code(body).endBlock(nodeCount);
      return this;
    }
    // end the current self-balancing block
    endBlock(nodeCount) {
      const len = this._blockStarts.pop();
      if (len === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const toClose = this._nodes.length - len;
      if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
        throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
      }
      this._nodes.length = len;
      return this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(name, args = code_12.nil, async, funcBody) {
      this._blockNode(new Func(name, args, async));
      if (funcBody)
        this.code(funcBody).endFunc();
      return this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(Func);
    }
    optimize(n = 1) {
      while (n-- > 0) {
        this._root.optimizeNodes();
        this._root.optimizeNames(this._root.names, this._constants);
      }
    }
    _leafNode(node) {
      this._currNode.nodes.push(node);
      return this;
    }
    _blockNode(node) {
      this._currNode.nodes.push(node);
      this._nodes.push(node);
    }
    _endBlockNode(N1, N2) {
      const n = this._currNode;
      if (n instanceof N1 || N2 && n instanceof N2) {
        this._nodes.pop();
        return this;
      }
      throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
    }
    _elseNode(node) {
      const n = this._currNode;
      if (!(n instanceof If)) {
        throw new Error('CodeGen: "else" without "if"');
      }
      this._currNode = n.else = node;
      return this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const ns = this._nodes;
      return ns[ns.length - 1];
    }
    set _currNode(node) {
      const ns = this._nodes;
      ns[ns.length - 1] = node;
    }
  }
  exports$1.CodeGen = CodeGen;
  function addNames(names2, from) {
    for (const n in from)
      names2[n] = (names2[n] || 0) + (from[n] || 0);
    return names2;
  }
  function addExprNames(names2, from) {
    return from instanceof code_12._CodeOrName ? addNames(names2, from.names) : names2;
  }
  function optimizeExpr(expr, names2, constants2) {
    if (expr instanceof code_12.Name)
      return replaceName(expr);
    if (!canOptimize(expr))
      return expr;
    return new code_12._Code(expr._items.reduce((items2, c) => {
      if (c instanceof code_12.Name)
        c = replaceName(c);
      if (c instanceof code_12._Code)
        items2.push(...c._items);
      else
        items2.push(c);
      return items2;
    }, []));
    function replaceName(n) {
      const c = constants2[n.str];
      if (c === void 0 || names2[n.str] !== 1)
        return n;
      delete names2[n.str];
      return c;
    }
    function canOptimize(e) {
      return e instanceof code_12._Code && e._items.some((c) => c instanceof code_12.Name && names2[c.str] === 1 && constants2[c.str] !== void 0);
    }
  }
  function subtractNames(names2, from) {
    for (const n in from)
      names2[n] = (names2[n] || 0) - (from[n] || 0);
  }
  function not2(x) {
    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_12._)`!${par(x)}`;
  }
  exports$1.not = not2;
  const andCode = mappend(exports$1.operators.AND);
  function and(...args) {
    return args.reduce(andCode);
  }
  exports$1.and = and;
  const orCode = mappend(exports$1.operators.OR);
  function or(...args) {
    return args.reduce(orCode);
  }
  exports$1.or = or;
  function mappend(op) {
    return (x, y) => x === code_12.nil ? y : y === code_12.nil ? x : (0, code_12._)`${par(x)} ${op} ${par(y)}`;
  }
  function par(x) {
    return x instanceof code_12.Name ? x : (0, code_12._)`(${x})`;
  }
})(codegen);
var util = {};
Object.defineProperty(util, "__esModule", { value: true });
util.checkStrictMode = util.getErrorPath = util.Type = util.useFunc = util.setEvaluated = util.evaluatedPropsToName = util.mergeEvaluated = util.eachItem = util.unescapeJsonPointer = util.escapeJsonPointer = util.escapeFragment = util.unescapeFragment = util.schemaRefOrVal = util.schemaHasRulesButRef = util.schemaHasRules = util.checkUnknownRules = util.alwaysValidSchema = util.toHash = void 0;
const codegen_1$v = codegen;
const code_1$a = code$1;
function toHash(arr) {
  const hash = {};
  for (const item of arr)
    hash[item] = true;
  return hash;
}
util.toHash = toHash;
function alwaysValidSchema(it, schema) {
  if (typeof schema == "boolean")
    return schema;
  if (Object.keys(schema).length === 0)
    return true;
  checkUnknownRules(it, schema);
  return !schemaHasRules(schema, it.self.RULES.all);
}
util.alwaysValidSchema = alwaysValidSchema;
function checkUnknownRules(it, schema = it.schema) {
  const { opts, self: self2 } = it;
  if (!opts.strictSchema)
    return;
  if (typeof schema === "boolean")
    return;
  const rules2 = self2.RULES.keywords;
  for (const key in schema) {
    if (!rules2[key])
      checkStrictMode(it, `unknown keyword: "${key}"`);
  }
}
util.checkUnknownRules = checkUnknownRules;
function schemaHasRules(schema, rules2) {
  if (typeof schema == "boolean")
    return !schema;
  for (const key in schema)
    if (rules2[key])
      return true;
  return false;
}
util.schemaHasRules = schemaHasRules;
function schemaHasRulesButRef(schema, RULES) {
  if (typeof schema == "boolean")
    return !schema;
  for (const key in schema)
    if (key !== "$ref" && RULES.all[key])
      return true;
  return false;
}
util.schemaHasRulesButRef = schemaHasRulesButRef;
function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword2, $data) {
  if (!$data) {
    if (typeof schema == "number" || typeof schema == "boolean")
      return schema;
    if (typeof schema == "string")
      return (0, codegen_1$v._)`${schema}`;
  }
  return (0, codegen_1$v._)`${topSchemaRef}${schemaPath}${(0, codegen_1$v.getProperty)(keyword2)}`;
}
util.schemaRefOrVal = schemaRefOrVal;
function unescapeFragment(str) {
  return unescapeJsonPointer(decodeURIComponent(str));
}
util.unescapeFragment = unescapeFragment;
function escapeFragment(str) {
  return encodeURIComponent(escapeJsonPointer(str));
}
util.escapeFragment = escapeFragment;
function escapeJsonPointer(str) {
  if (typeof str == "number")
    return `${str}`;
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
util.escapeJsonPointer = escapeJsonPointer;
function unescapeJsonPointer(str) {
  return str.replace(/~1/g, "/").replace(/~0/g, "~");
}
util.unescapeJsonPointer = unescapeJsonPointer;
function eachItem(xs, f) {
  if (Array.isArray(xs)) {
    for (const x of xs)
      f(x);
  } else {
    f(xs);
  }
}
util.eachItem = eachItem;
function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
  return (gen, from, to, toName) => {
    const res = to === void 0 ? from : to instanceof codegen_1$v.Name ? (from instanceof codegen_1$v.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1$v.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
    return toName === codegen_1$v.Name && !(res instanceof codegen_1$v.Name) ? resultToName(gen, res) : res;
  };
}
util.mergeEvaluated = {
  props: makeMergeEvaluated({
    mergeNames: (gen, from, to) => gen.if((0, codegen_1$v._)`${to} !== true && ${from} !== undefined`, () => {
      gen.if((0, codegen_1$v._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1$v._)`${to} || {}`).code((0, codegen_1$v._)`Object.assign(${to}, ${from})`));
    }),
    mergeToName: (gen, from, to) => gen.if((0, codegen_1$v._)`${to} !== true`, () => {
      if (from === true) {
        gen.assign(to, true);
      } else {
        gen.assign(to, (0, codegen_1$v._)`${to} || {}`);
        setEvaluated(gen, to, from);
      }
    }),
    mergeValues: (from, to) => from === true ? true : { ...from, ...to },
    resultToName: evaluatedPropsToName
  }),
  items: makeMergeEvaluated({
    mergeNames: (gen, from, to) => gen.if((0, codegen_1$v._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1$v._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
    mergeToName: (gen, from, to) => gen.if((0, codegen_1$v._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1$v._)`${to} > ${from} ? ${to} : ${from}`)),
    mergeValues: (from, to) => from === true ? true : Math.max(from, to),
    resultToName: (gen, items2) => gen.var("items", items2)
  })
};
function evaluatedPropsToName(gen, ps) {
  if (ps === true)
    return gen.var("props", true);
  const props = gen.var("props", (0, codegen_1$v._)`{}`);
  if (ps !== void 0)
    setEvaluated(gen, props, ps);
  return props;
}
util.evaluatedPropsToName = evaluatedPropsToName;
function setEvaluated(gen, props, ps) {
  Object.keys(ps).forEach((p) => gen.assign((0, codegen_1$v._)`${props}${(0, codegen_1$v.getProperty)(p)}`, true));
}
util.setEvaluated = setEvaluated;
const snippets = {};
function useFunc(gen, f) {
  return gen.scopeValue("func", {
    ref: f,
    code: snippets[f.code] || (snippets[f.code] = new code_1$a._Code(f.code))
  });
}
util.useFunc = useFunc;
var Type;
(function(Type2) {
  Type2[Type2["Num"] = 0] = "Num";
  Type2[Type2["Str"] = 1] = "Str";
})(Type || (util.Type = Type = {}));
function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
  if (dataProp instanceof codegen_1$v.Name) {
    const isNumber = dataPropType === Type.Num;
    return jsPropertySyntax ? isNumber ? (0, codegen_1$v._)`"[" + ${dataProp} + "]"` : (0, codegen_1$v._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1$v._)`"/" + ${dataProp}` : (0, codegen_1$v._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return jsPropertySyntax ? (0, codegen_1$v.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
}
util.getErrorPath = getErrorPath;
function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
  if (!mode)
    return;
  msg = `strict mode: ${msg}`;
  if (mode === true)
    throw new Error(msg);
  it.self.logger.warn(msg);
}
util.checkStrictMode = checkStrictMode;
var names$1 = {};
Object.defineProperty(names$1, "__esModule", { value: true });
const codegen_1$u = codegen;
const names = {
  // validation function arguments
  data: new codegen_1$u.Name("data"),
  // data passed to validation function
  // args passed from referencing schema
  valCxt: new codegen_1$u.Name("valCxt"),
  // validation/data context - should not be used directly, it is destructured to the names below
  instancePath: new codegen_1$u.Name("instancePath"),
  parentData: new codegen_1$u.Name("parentData"),
  parentDataProperty: new codegen_1$u.Name("parentDataProperty"),
  rootData: new codegen_1$u.Name("rootData"),
  // root data - same as the data passed to the first/top validation function
  dynamicAnchors: new codegen_1$u.Name("dynamicAnchors"),
  // used to support recursiveRef and dynamicRef
  // function scoped variables
  vErrors: new codegen_1$u.Name("vErrors"),
  // null or array of validation errors
  errors: new codegen_1$u.Name("errors"),
  // counter of validation errors
  this: new codegen_1$u.Name("this"),
  // "globals"
  self: new codegen_1$u.Name("self"),
  scope: new codegen_1$u.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new codegen_1$u.Name("json"),
  jsonPos: new codegen_1$u.Name("jsonPos"),
  jsonLen: new codegen_1$u.Name("jsonLen"),
  jsonPart: new codegen_1$u.Name("jsonPart")
};
names$1.default = names;
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.extendErrors = exports$1.resetErrorsCount = exports$1.reportExtraError = exports$1.reportError = exports$1.keyword$DataError = exports$1.keywordError = void 0;
  const codegen_12 = codegen;
  const util_12 = util;
  const names_12 = names$1;
  exports$1.keywordError = {
    message: ({ keyword: keyword2 }) => (0, codegen_12.str)`must pass "${keyword2}" keyword validation`
  };
  exports$1.keyword$DataError = {
    message: ({ keyword: keyword2, schemaType }) => schemaType ? (0, codegen_12.str)`"${keyword2}" keyword must be ${schemaType} ($data)` : (0, codegen_12.str)`"${keyword2}" keyword is invalid ($data)`
  };
  function reportError(cxt, error2 = exports$1.keywordError, errorPaths, overrideAllErrors) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2, errorPaths);
    if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
      addError(gen, errObj);
    } else {
      returnErrors(it, (0, codegen_12._)`[${errObj}]`);
    }
  }
  exports$1.reportError = reportError;
  function reportExtraError(cxt, error2 = exports$1.keywordError, errorPaths) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2, errorPaths);
    addError(gen, errObj);
    if (!(compositeRule || allErrors)) {
      returnErrors(it, names_12.default.vErrors);
    }
  }
  exports$1.reportExtraError = reportExtraError;
  function resetErrorsCount(gen, errsCount) {
    gen.assign(names_12.default.errors, errsCount);
    gen.if((0, codegen_12._)`${names_12.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_12._)`${names_12.default.vErrors}.length`, errsCount), () => gen.assign(names_12.default.vErrors, null)));
  }
  exports$1.resetErrorsCount = resetErrorsCount;
  function extendErrors({ gen, keyword: keyword2, schemaValue, data, errsCount, it }) {
    if (errsCount === void 0)
      throw new Error("ajv implementation error");
    const err = gen.name("err");
    gen.forRange("i", errsCount, names_12.default.errors, (i) => {
      gen.const(err, (0, codegen_12._)`${names_12.default.vErrors}[${i}]`);
      gen.if((0, codegen_12._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_12._)`${err}.instancePath`, (0, codegen_12.strConcat)(names_12.default.instancePath, it.errorPath)));
      gen.assign((0, codegen_12._)`${err}.schemaPath`, (0, codegen_12.str)`${it.errSchemaPath}/${keyword2}`);
      if (it.opts.verbose) {
        gen.assign((0, codegen_12._)`${err}.schema`, schemaValue);
        gen.assign((0, codegen_12._)`${err}.data`, data);
      }
    });
  }
  exports$1.extendErrors = extendErrors;
  function addError(gen, errObj) {
    const err = gen.const("err", errObj);
    gen.if((0, codegen_12._)`${names_12.default.vErrors} === null`, () => gen.assign(names_12.default.vErrors, (0, codegen_12._)`[${err}]`), (0, codegen_12._)`${names_12.default.vErrors}.push(${err})`);
    gen.code((0, codegen_12._)`${names_12.default.errors}++`);
  }
  function returnErrors(it, errs) {
    const { gen, validateName, schemaEnv } = it;
    if (schemaEnv.$async) {
      gen.throw((0, codegen_12._)`new ${it.ValidationError}(${errs})`);
    } else {
      gen.assign((0, codegen_12._)`${validateName}.errors`, errs);
      gen.return(false);
    }
  }
  const E2 = {
    keyword: new codegen_12.Name("keyword"),
    schemaPath: new codegen_12.Name("schemaPath"),
    // also used in JTD errors
    params: new codegen_12.Name("params"),
    propertyName: new codegen_12.Name("propertyName"),
    message: new codegen_12.Name("message"),
    schema: new codegen_12.Name("schema"),
    parentSchema: new codegen_12.Name("parentSchema")
  };
  function errorObjectCode(cxt, error2, errorPaths) {
    const { createErrors } = cxt.it;
    if (createErrors === false)
      return (0, codegen_12._)`{}`;
    return errorObject(cxt, error2, errorPaths);
  }
  function errorObject(cxt, error2, errorPaths = {}) {
    const { gen, it } = cxt;
    const keyValues = [
      errorInstancePath(it, errorPaths),
      errorSchemaPath(cxt, errorPaths)
    ];
    extraErrorProps(cxt, error2, keyValues);
    return gen.object(...keyValues);
  }
  function errorInstancePath({ errorPath }, { instancePath }) {
    const instPath = instancePath ? (0, codegen_12.str)`${errorPath}${(0, util_12.getErrorPath)(instancePath, util_12.Type.Str)}` : errorPath;
    return [names_12.default.instancePath, (0, codegen_12.strConcat)(names_12.default.instancePath, instPath)];
  }
  function errorSchemaPath({ keyword: keyword2, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
    let schPath = parentSchema ? errSchemaPath : (0, codegen_12.str)`${errSchemaPath}/${keyword2}`;
    if (schemaPath) {
      schPath = (0, codegen_12.str)`${schPath}${(0, util_12.getErrorPath)(schemaPath, util_12.Type.Str)}`;
    }
    return [E2.schemaPath, schPath];
  }
  function extraErrorProps(cxt, { params, message }, keyValues) {
    const { keyword: keyword2, data, schemaValue, it } = cxt;
    const { opts, propertyName, topSchemaRef, schemaPath } = it;
    keyValues.push([E2.keyword, keyword2], [E2.params, typeof params == "function" ? params(cxt) : params || (0, codegen_12._)`{}`]);
    if (opts.messages) {
      keyValues.push([E2.message, typeof message == "function" ? message(cxt) : message]);
    }
    if (opts.verbose) {
      keyValues.push([E2.schema, schemaValue], [E2.parentSchema, (0, codegen_12._)`${topSchemaRef}${schemaPath}`], [names_12.default.data, data]);
    }
    if (propertyName)
      keyValues.push([E2.propertyName, propertyName]);
  }
})(errors);
Object.defineProperty(boolSchema, "__esModule", { value: true });
boolSchema.boolOrEmptySchema = boolSchema.topBoolOrEmptySchema = void 0;
const errors_1$3 = errors;
const codegen_1$t = codegen;
const names_1$6 = names$1;
const boolError = {
  message: "boolean schema is false"
};
function topBoolOrEmptySchema(it) {
  const { gen, schema, validateName } = it;
  if (schema === false) {
    falseSchemaError(it, false);
  } else if (typeof schema == "object" && schema.$async === true) {
    gen.return(names_1$6.default.data);
  } else {
    gen.assign((0, codegen_1$t._)`${validateName}.errors`, null);
    gen.return(true);
  }
}
boolSchema.topBoolOrEmptySchema = topBoolOrEmptySchema;
function boolOrEmptySchema(it, valid2) {
  const { gen, schema } = it;
  if (schema === false) {
    gen.var(valid2, false);
    falseSchemaError(it);
  } else {
    gen.var(valid2, true);
  }
}
boolSchema.boolOrEmptySchema = boolOrEmptySchema;
function falseSchemaError(it, overrideAllErrors) {
  const { gen, data } = it;
  const cxt = {
    gen,
    keyword: "false schema",
    data,
    schema: false,
    schemaCode: false,
    schemaValue: false,
    params: {},
    it
  };
  (0, errors_1$3.reportError)(cxt, boolError, void 0, overrideAllErrors);
}
var dataType = {};
var rules = {};
Object.defineProperty(rules, "__esModule", { value: true });
rules.getRules = rules.isJSONType = void 0;
const _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
const jsonTypes = new Set(_jsonTypes);
function isJSONType(x) {
  return typeof x == "string" && jsonTypes.has(x);
}
rules.isJSONType = isJSONType;
function getRules() {
  const groups = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...groups, integer: true, boolean: true, null: true },
    rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
rules.getRules = getRules;
var applicability = {};
Object.defineProperty(applicability, "__esModule", { value: true });
applicability.shouldUseRule = applicability.shouldUseGroup = applicability.schemaHasRulesForType = void 0;
function schemaHasRulesForType({ schema, self: self2 }, type2) {
  const group = self2.RULES.types[type2];
  return group && group !== true && shouldUseGroup(schema, group);
}
applicability.schemaHasRulesForType = schemaHasRulesForType;
function shouldUseGroup(schema, group) {
  return group.rules.some((rule) => shouldUseRule(schema, rule));
}
applicability.shouldUseGroup = shouldUseGroup;
function shouldUseRule(schema, rule) {
  var _a;
  return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
}
applicability.shouldUseRule = shouldUseRule;
Object.defineProperty(dataType, "__esModule", { value: true });
dataType.reportTypeError = dataType.checkDataTypes = dataType.checkDataType = dataType.coerceAndCheckDataType = dataType.getJSONTypes = dataType.getSchemaTypes = dataType.DataType = void 0;
const rules_1 = rules;
const applicability_1$1 = applicability;
const errors_1$2 = errors;
const codegen_1$s = codegen;
const util_1$q = util;
var DataType;
(function(DataType2) {
  DataType2[DataType2["Correct"] = 0] = "Correct";
  DataType2[DataType2["Wrong"] = 1] = "Wrong";
})(DataType || (dataType.DataType = DataType = {}));
function getSchemaTypes(schema) {
  const types2 = getJSONTypes(schema.type);
  const hasNull = types2.includes("null");
  if (hasNull) {
    if (schema.nullable === false)
      throw new Error("type: null contradicts nullable: false");
  } else {
    if (!types2.length && schema.nullable !== void 0) {
      throw new Error('"nullable" cannot be used without "type"');
    }
    if (schema.nullable === true)
      types2.push("null");
  }
  return types2;
}
dataType.getSchemaTypes = getSchemaTypes;
function getJSONTypes(ts) {
  const types2 = Array.isArray(ts) ? ts : ts ? [ts] : [];
  if (types2.every(rules_1.isJSONType))
    return types2;
  throw new Error("type must be JSONType or JSONType[]: " + types2.join(","));
}
dataType.getJSONTypes = getJSONTypes;
function coerceAndCheckDataType(it, types2) {
  const { gen, data, opts } = it;
  const coerceTo = coerceToTypes(types2, opts.coerceTypes);
  const checkTypes = types2.length > 0 && !(coerceTo.length === 0 && types2.length === 1 && (0, applicability_1$1.schemaHasRulesForType)(it, types2[0]));
  if (checkTypes) {
    const wrongType = checkDataTypes(types2, data, opts.strictNumbers, DataType.Wrong);
    gen.if(wrongType, () => {
      if (coerceTo.length)
        coerceData(it, types2, coerceTo);
      else
        reportTypeError(it);
    });
  }
  return checkTypes;
}
dataType.coerceAndCheckDataType = coerceAndCheckDataType;
const COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function coerceToTypes(types2, coerceTypes) {
  return coerceTypes ? types2.filter((t2) => COERCIBLE.has(t2) || coerceTypes === "array" && t2 === "array") : [];
}
function coerceData(it, types2, coerceTo) {
  const { gen, data, opts } = it;
  const dataType2 = gen.let("dataType", (0, codegen_1$s._)`typeof ${data}`);
  const coerced = gen.let("coerced", (0, codegen_1$s._)`undefined`);
  if (opts.coerceTypes === "array") {
    gen.if((0, codegen_1$s._)`${dataType2} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1$s._)`${data}[0]`).assign(dataType2, (0, codegen_1$s._)`typeof ${data}`).if(checkDataTypes(types2, data, opts.strictNumbers), () => gen.assign(coerced, data)));
  }
  gen.if((0, codegen_1$s._)`${coerced} !== undefined`);
  for (const t2 of coerceTo) {
    if (COERCIBLE.has(t2) || t2 === "array" && opts.coerceTypes === "array") {
      coerceSpecificType(t2);
    }
  }
  gen.else();
  reportTypeError(it);
  gen.endIf();
  gen.if((0, codegen_1$s._)`${coerced} !== undefined`, () => {
    gen.assign(data, coerced);
    assignParentData(it, coerced);
  });
  function coerceSpecificType(t2) {
    switch (t2) {
      case "string":
        gen.elseIf((0, codegen_1$s._)`${dataType2} == "number" || ${dataType2} == "boolean"`).assign(coerced, (0, codegen_1$s._)`"" + ${data}`).elseIf((0, codegen_1$s._)`${data} === null`).assign(coerced, (0, codegen_1$s._)`""`);
        return;
      case "number":
        gen.elseIf((0, codegen_1$s._)`${dataType2} == "boolean" || ${data} === null
              || (${dataType2} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1$s._)`+${data}`);
        return;
      case "integer":
        gen.elseIf((0, codegen_1$s._)`${dataType2} === "boolean" || ${data} === null
              || (${dataType2} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1$s._)`+${data}`);
        return;
      case "boolean":
        gen.elseIf((0, codegen_1$s._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1$s._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
        return;
      case "null":
        gen.elseIf((0, codegen_1$s._)`${data} === "" || ${data} === 0 || ${data} === false`);
        gen.assign(coerced, null);
        return;
      case "array":
        gen.elseIf((0, codegen_1$s._)`${dataType2} === "string" || ${dataType2} === "number"
              || ${dataType2} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1$s._)`[${data}]`);
    }
  }
}
function assignParentData({ gen, parentData, parentDataProperty }, expr) {
  gen.if((0, codegen_1$s._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1$s._)`${parentData}[${parentDataProperty}]`, expr));
}
function checkDataType(dataType2, data, strictNums, correct = DataType.Correct) {
  const EQ = correct === DataType.Correct ? codegen_1$s.operators.EQ : codegen_1$s.operators.NEQ;
  let cond;
  switch (dataType2) {
    case "null":
      return (0, codegen_1$s._)`${data} ${EQ} null`;
    case "array":
      cond = (0, codegen_1$s._)`Array.isArray(${data})`;
      break;
    case "object":
      cond = (0, codegen_1$s._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
      break;
    case "integer":
      cond = numCond((0, codegen_1$s._)`!(${data} % 1) && !isNaN(${data})`);
      break;
    case "number":
      cond = numCond();
      break;
    default:
      return (0, codegen_1$s._)`typeof ${data} ${EQ} ${dataType2}`;
  }
  return correct === DataType.Correct ? cond : (0, codegen_1$s.not)(cond);
  function numCond(_cond = codegen_1$s.nil) {
    return (0, codegen_1$s.and)((0, codegen_1$s._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1$s._)`isFinite(${data})` : codegen_1$s.nil);
  }
}
dataType.checkDataType = checkDataType;
function checkDataTypes(dataTypes, data, strictNums, correct) {
  if (dataTypes.length === 1) {
    return checkDataType(dataTypes[0], data, strictNums, correct);
  }
  let cond;
  const types2 = (0, util_1$q.toHash)(dataTypes);
  if (types2.array && types2.object) {
    const notObj = (0, codegen_1$s._)`typeof ${data} != "object"`;
    cond = types2.null ? notObj : (0, codegen_1$s._)`!${data} || ${notObj}`;
    delete types2.null;
    delete types2.array;
    delete types2.object;
  } else {
    cond = codegen_1$s.nil;
  }
  if (types2.number)
    delete types2.integer;
  for (const t2 in types2)
    cond = (0, codegen_1$s.and)(cond, checkDataType(t2, data, strictNums, correct));
  return cond;
}
dataType.checkDataTypes = checkDataTypes;
const typeError = {
  message: ({ schema }) => `must be ${schema}`,
  params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1$s._)`{type: ${schema}}` : (0, codegen_1$s._)`{type: ${schemaValue}}`
};
function reportTypeError(it) {
  const cxt = getTypeErrorContext(it);
  (0, errors_1$2.reportError)(cxt, typeError);
}
dataType.reportTypeError = reportTypeError;
function getTypeErrorContext(it) {
  const { gen, data, schema } = it;
  const schemaCode = (0, util_1$q.schemaRefOrVal)(it, schema, "type");
  return {
    gen,
    keyword: "type",
    data,
    schema: schema.type,
    schemaCode,
    schemaValue: schemaCode,
    parentSchema: schema,
    params: {},
    it
  };
}
var defaults = {};
Object.defineProperty(defaults, "__esModule", { value: true });
defaults.assignDefaults = void 0;
const codegen_1$r = codegen;
const util_1$p = util;
function assignDefaults(it, ty) {
  const { properties: properties2, items: items2 } = it.schema;
  if (ty === "object" && properties2) {
    for (const key in properties2) {
      assignDefault(it, key, properties2[key].default);
    }
  } else if (ty === "array" && Array.isArray(items2)) {
    items2.forEach((sch, i) => assignDefault(it, i, sch.default));
  }
}
defaults.assignDefaults = assignDefaults;
function assignDefault(it, prop, defaultValue) {
  const { gen, compositeRule, data, opts } = it;
  if (defaultValue === void 0)
    return;
  const childData = (0, codegen_1$r._)`${data}${(0, codegen_1$r.getProperty)(prop)}`;
  if (compositeRule) {
    (0, util_1$p.checkStrictMode)(it, `default is ignored for: ${childData}`);
    return;
  }
  let condition = (0, codegen_1$r._)`${childData} === undefined`;
  if (opts.useDefaults === "empty") {
    condition = (0, codegen_1$r._)`${condition} || ${childData} === null || ${childData} === ""`;
  }
  gen.if(condition, (0, codegen_1$r._)`${childData} = ${(0, codegen_1$r.stringify)(defaultValue)}`);
}
var keyword = {};
var code = {};
Object.defineProperty(code, "__esModule", { value: true });
code.validateUnion = code.validateArray = code.usePattern = code.callValidateCode = code.schemaProperties = code.allSchemaProperties = code.noPropertyInData = code.propertyInData = code.isOwnProperty = code.hasPropFunc = code.reportMissingProp = code.checkMissingProp = code.checkReportMissingProp = void 0;
const codegen_1$q = codegen;
const util_1$o = util;
const names_1$5 = names$1;
const util_2$1 = util;
function checkReportMissingProp(cxt, prop) {
  const { gen, data, it } = cxt;
  gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
    cxt.setParams({ missingProperty: (0, codegen_1$q._)`${prop}` }, true);
    cxt.error();
  });
}
code.checkReportMissingProp = checkReportMissingProp;
function checkMissingProp({ gen, data, it: { opts } }, properties2, missing) {
  return (0, codegen_1$q.or)(...properties2.map((prop) => (0, codegen_1$q.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1$q._)`${missing} = ${prop}`)));
}
code.checkMissingProp = checkMissingProp;
function reportMissingProp(cxt, missing) {
  cxt.setParams({ missingProperty: missing }, true);
  cxt.error();
}
code.reportMissingProp = reportMissingProp;
function hasPropFunc(gen) {
  return gen.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, codegen_1$q._)`Object.prototype.hasOwnProperty`
  });
}
code.hasPropFunc = hasPropFunc;
function isOwnProperty(gen, data, property) {
  return (0, codegen_1$q._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
}
code.isOwnProperty = isOwnProperty;
function propertyInData(gen, data, property, ownProperties) {
  const cond = (0, codegen_1$q._)`${data}${(0, codegen_1$q.getProperty)(property)} !== undefined`;
  return ownProperties ? (0, codegen_1$q._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
}
code.propertyInData = propertyInData;
function noPropertyInData(gen, data, property, ownProperties) {
  const cond = (0, codegen_1$q._)`${data}${(0, codegen_1$q.getProperty)(property)} === undefined`;
  return ownProperties ? (0, codegen_1$q.or)(cond, (0, codegen_1$q.not)(isOwnProperty(gen, data, property))) : cond;
}
code.noPropertyInData = noPropertyInData;
function allSchemaProperties(schemaMap) {
  return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
}
code.allSchemaProperties = allSchemaProperties;
function schemaProperties(it, schemaMap) {
  return allSchemaProperties(schemaMap).filter((p) => !(0, util_1$o.alwaysValidSchema)(it, schemaMap[p]));
}
code.schemaProperties = schemaProperties;
function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
  const dataAndSchema = passSchema ? (0, codegen_1$q._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
  const valCxt = [
    [names_1$5.default.instancePath, (0, codegen_1$q.strConcat)(names_1$5.default.instancePath, errorPath)],
    [names_1$5.default.parentData, it.parentData],
    [names_1$5.default.parentDataProperty, it.parentDataProperty],
    [names_1$5.default.rootData, names_1$5.default.rootData]
  ];
  if (it.opts.dynamicRef)
    valCxt.push([names_1$5.default.dynamicAnchors, names_1$5.default.dynamicAnchors]);
  const args = (0, codegen_1$q._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
  return context !== codegen_1$q.nil ? (0, codegen_1$q._)`${func}.call(${context}, ${args})` : (0, codegen_1$q._)`${func}(${args})`;
}
code.callValidateCode = callValidateCode;
const newRegExp = (0, codegen_1$q._)`new RegExp`;
function usePattern({ gen, it: { opts } }, pattern2) {
  const u = opts.unicodeRegExp ? "u" : "";
  const { regExp } = opts.code;
  const rx = regExp(pattern2, u);
  return gen.scopeValue("pattern", {
    key: rx.toString(),
    ref: rx,
    code: (0, codegen_1$q._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2$1.useFunc)(gen, regExp)}(${pattern2}, ${u})`
  });
}
code.usePattern = usePattern;
function validateArray(cxt) {
  const { gen, data, keyword: keyword2, it } = cxt;
  const valid2 = gen.name("valid");
  if (it.allErrors) {
    const validArr = gen.let("valid", true);
    validateItems(() => gen.assign(validArr, false));
    return validArr;
  }
  gen.var(valid2, true);
  validateItems(() => gen.break());
  return valid2;
  function validateItems(notValid) {
    const len = gen.const("len", (0, codegen_1$q._)`${data}.length`);
    gen.forRange("i", 0, len, (i) => {
      cxt.subschema({
        keyword: keyword2,
        dataProp: i,
        dataPropType: util_1$o.Type.Num
      }, valid2);
      gen.if((0, codegen_1$q.not)(valid2), notValid);
    });
  }
}
code.validateArray = validateArray;
function validateUnion(cxt) {
  const { gen, schema, keyword: keyword2, it } = cxt;
  if (!Array.isArray(schema))
    throw new Error("ajv implementation error");
  const alwaysValid = schema.some((sch) => (0, util_1$o.alwaysValidSchema)(it, sch));
  if (alwaysValid && !it.opts.unevaluated)
    return;
  const valid2 = gen.let("valid", false);
  const schValid = gen.name("_valid");
  gen.block(() => schema.forEach((_sch, i) => {
    const schCxt = cxt.subschema({
      keyword: keyword2,
      schemaProp: i,
      compositeRule: true
    }, schValid);
    gen.assign(valid2, (0, codegen_1$q._)`${valid2} || ${schValid}`);
    const merged = cxt.mergeValidEvaluated(schCxt, schValid);
    if (!merged)
      gen.if((0, codegen_1$q.not)(valid2));
  }));
  cxt.result(valid2, () => cxt.reset(), () => cxt.error(true));
}
code.validateUnion = validateUnion;
Object.defineProperty(keyword, "__esModule", { value: true });
keyword.validateKeywordUsage = keyword.validSchemaType = keyword.funcKeywordCode = keyword.macroKeywordCode = void 0;
const codegen_1$p = codegen;
const names_1$4 = names$1;
const code_1$9 = code;
const errors_1$1 = errors;
function macroKeywordCode(cxt, def2) {
  const { gen, keyword: keyword2, schema, parentSchema, it } = cxt;
  const macroSchema = def2.macro.call(it.self, schema, parentSchema, it);
  const schemaRef = useKeyword(gen, keyword2, macroSchema);
  if (it.opts.validateSchema !== false)
    it.self.validateSchema(macroSchema, true);
  const valid2 = gen.name("valid");
  cxt.subschema({
    schema: macroSchema,
    schemaPath: codegen_1$p.nil,
    errSchemaPath: `${it.errSchemaPath}/${keyword2}`,
    topSchemaRef: schemaRef,
    compositeRule: true
  }, valid2);
  cxt.pass(valid2, () => cxt.error(true));
}
keyword.macroKeywordCode = macroKeywordCode;
function funcKeywordCode(cxt, def2) {
  var _a;
  const { gen, keyword: keyword2, schema, parentSchema, $data, it } = cxt;
  checkAsyncKeyword(it, def2);
  const validate2 = !$data && def2.compile ? def2.compile.call(it.self, schema, parentSchema, it) : def2.validate;
  const validateRef = useKeyword(gen, keyword2, validate2);
  const valid2 = gen.let("valid");
  cxt.block$data(valid2, validateKeyword);
  cxt.ok((_a = def2.valid) !== null && _a !== void 0 ? _a : valid2);
  function validateKeyword() {
    if (def2.errors === false) {
      assignValid();
      if (def2.modifying)
        modifyData(cxt);
      reportErrs(() => cxt.error());
    } else {
      const ruleErrs = def2.async ? validateAsync() : validateSync();
      if (def2.modifying)
        modifyData(cxt);
      reportErrs(() => addErrs(cxt, ruleErrs));
    }
  }
  function validateAsync() {
    const ruleErrs = gen.let("ruleErrs", null);
    gen.try(() => assignValid((0, codegen_1$p._)`await `), (e) => gen.assign(valid2, false).if((0, codegen_1$p._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1$p._)`${e}.errors`), () => gen.throw(e)));
    return ruleErrs;
  }
  function validateSync() {
    const validateErrs = (0, codegen_1$p._)`${validateRef}.errors`;
    gen.assign(validateErrs, null);
    assignValid(codegen_1$p.nil);
    return validateErrs;
  }
  function assignValid(_await = def2.async ? (0, codegen_1$p._)`await ` : codegen_1$p.nil) {
    const passCxt = it.opts.passContext ? names_1$4.default.this : names_1$4.default.self;
    const passSchema = !("compile" in def2 && !$data || def2.schema === false);
    gen.assign(valid2, (0, codegen_1$p._)`${_await}${(0, code_1$9.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def2.modifying);
  }
  function reportErrs(errors2) {
    var _a2;
    gen.if((0, codegen_1$p.not)((_a2 = def2.valid) !== null && _a2 !== void 0 ? _a2 : valid2), errors2);
  }
}
keyword.funcKeywordCode = funcKeywordCode;
function modifyData(cxt) {
  const { gen, data, it } = cxt;
  gen.if(it.parentData, () => gen.assign(data, (0, codegen_1$p._)`${it.parentData}[${it.parentDataProperty}]`));
}
function addErrs(cxt, errs) {
  const { gen } = cxt;
  gen.if((0, codegen_1$p._)`Array.isArray(${errs})`, () => {
    gen.assign(names_1$4.default.vErrors, (0, codegen_1$p._)`${names_1$4.default.vErrors} === null ? ${errs} : ${names_1$4.default.vErrors}.concat(${errs})`).assign(names_1$4.default.errors, (0, codegen_1$p._)`${names_1$4.default.vErrors}.length`);
    (0, errors_1$1.extendErrors)(cxt);
  }, () => cxt.error());
}
function checkAsyncKeyword({ schemaEnv }, def2) {
  if (def2.async && !schemaEnv.$async)
    throw new Error("async keyword in sync schema");
}
function useKeyword(gen, keyword2, result) {
  if (result === void 0)
    throw new Error(`keyword "${keyword2}" failed to compile`);
  return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1$p.stringify)(result) });
}
function validSchemaType(schema, schemaType, allowUndefined = false) {
  return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
}
keyword.validSchemaType = validSchemaType;
function validateKeywordUsage({ schema, opts, self: self2, errSchemaPath }, def2, keyword2) {
  if (Array.isArray(def2.keyword) ? !def2.keyword.includes(keyword2) : def2.keyword !== keyword2) {
    throw new Error("ajv implementation error");
  }
  const deps = def2.dependencies;
  if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
    throw new Error(`parent schema must have dependencies of ${keyword2}: ${deps.join(",")}`);
  }
  if (def2.validateSchema) {
    const valid2 = def2.validateSchema(schema[keyword2]);
    if (!valid2) {
      const msg = `keyword "${keyword2}" value is invalid at path "${errSchemaPath}": ` + self2.errorsText(def2.validateSchema.errors);
      if (opts.validateSchema === "log")
        self2.logger.error(msg);
      else
        throw new Error(msg);
    }
  }
}
keyword.validateKeywordUsage = validateKeywordUsage;
var subschema = {};
Object.defineProperty(subschema, "__esModule", { value: true });
subschema.extendSubschemaMode = subschema.extendSubschemaData = subschema.getSubschema = void 0;
const codegen_1$o = codegen;
const util_1$n = util;
function getSubschema(it, { keyword: keyword2, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
  if (keyword2 !== void 0 && schema !== void 0) {
    throw new Error('both "keyword" and "schema" passed, only one allowed');
  }
  if (keyword2 !== void 0) {
    const sch = it.schema[keyword2];
    return schemaProp === void 0 ? {
      schema: sch,
      schemaPath: (0, codegen_1$o._)`${it.schemaPath}${(0, codegen_1$o.getProperty)(keyword2)}`,
      errSchemaPath: `${it.errSchemaPath}/${keyword2}`
    } : {
      schema: sch[schemaProp],
      schemaPath: (0, codegen_1$o._)`${it.schemaPath}${(0, codegen_1$o.getProperty)(keyword2)}${(0, codegen_1$o.getProperty)(schemaProp)}`,
      errSchemaPath: `${it.errSchemaPath}/${keyword2}/${(0, util_1$n.escapeFragment)(schemaProp)}`
    };
  }
  if (schema !== void 0) {
    if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
      throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
    }
    return {
      schema,
      schemaPath,
      topSchemaRef,
      errSchemaPath
    };
  }
  throw new Error('either "keyword" or "schema" must be passed');
}
subschema.getSubschema = getSubschema;
function extendSubschemaData(subschema2, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
  if (data !== void 0 && dataProp !== void 0) {
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  }
  const { gen } = it;
  if (dataProp !== void 0) {
    const { errorPath, dataPathArr, opts } = it;
    const nextData = gen.let("data", (0, codegen_1$o._)`${it.data}${(0, codegen_1$o.getProperty)(dataProp)}`, true);
    dataContextProps(nextData);
    subschema2.errorPath = (0, codegen_1$o.str)`${errorPath}${(0, util_1$n.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
    subschema2.parentDataProperty = (0, codegen_1$o._)`${dataProp}`;
    subschema2.dataPathArr = [...dataPathArr, subschema2.parentDataProperty];
  }
  if (data !== void 0) {
    const nextData = data instanceof codegen_1$o.Name ? data : gen.let("data", data, true);
    dataContextProps(nextData);
    if (propertyName !== void 0)
      subschema2.propertyName = propertyName;
  }
  if (dataTypes)
    subschema2.dataTypes = dataTypes;
  function dataContextProps(_nextData) {
    subschema2.data = _nextData;
    subschema2.dataLevel = it.dataLevel + 1;
    subschema2.dataTypes = [];
    it.definedProperties = /* @__PURE__ */ new Set();
    subschema2.parentData = it.data;
    subschema2.dataNames = [...it.dataNames, _nextData];
  }
}
subschema.extendSubschemaData = extendSubschemaData;
function extendSubschemaMode(subschema2, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
  if (compositeRule !== void 0)
    subschema2.compositeRule = compositeRule;
  if (createErrors !== void 0)
    subschema2.createErrors = createErrors;
  if (allErrors !== void 0)
    subschema2.allErrors = allErrors;
  subschema2.jtdDiscriminator = jtdDiscriminator;
  subschema2.jtdMetadata = jtdMetadata;
}
subschema.extendSubschemaMode = extendSubschemaMode;
var resolve$2 = {};
var fastDeepEqual = function equal(a, b) {
  if (a === b) return true;
  if (a && b && typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor) return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0; )
        if (!equal(a[i], b[i])) return false;
      return true;
    }
    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;
    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    for (i = length; i-- !== 0; ) {
      var key = keys[i];
      if (!equal(a[key], b[key])) return false;
    }
    return true;
  }
  return a !== a && b !== b;
};
var jsonSchemaTraverse = { exports: {} };
var traverse$1 = jsonSchemaTraverse.exports = function(schema, opts, cb) {
  if (typeof opts == "function") {
    cb = opts;
    opts = {};
  }
  cb = opts.cb || cb;
  var pre = typeof cb == "function" ? cb : cb.pre || function() {
  };
  var post = cb.post || function() {
  };
  _traverse(opts, pre, post, schema, "", schema);
};
traverse$1.keywords = {
  additionalItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  propertyNames: true,
  not: true,
  if: true,
  then: true,
  else: true
};
traverse$1.arrayKeywords = {
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};
traverse$1.propsKeywords = {
  $defs: true,
  definitions: true,
  properties: true,
  patternProperties: true,
  dependencies: true
};
traverse$1.skipKeywords = {
  default: true,
  enum: true,
  const: true,
  required: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};
function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  if (schema && typeof schema == "object" && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (var key in schema) {
      var sch = schema[key];
      if (Array.isArray(sch)) {
        if (key in traverse$1.arrayKeywords) {
          for (var i = 0; i < sch.length; i++)
            _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
        }
      } else if (key in traverse$1.propsKeywords) {
        if (sch && typeof sch == "object") {
          for (var prop in sch)
            _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
        }
      } else if (key in traverse$1.keywords || opts.allKeys && !(key in traverse$1.skipKeywords)) {
        _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
      }
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}
function escapeJsonPtr(str) {
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
var jsonSchemaTraverseExports = jsonSchemaTraverse.exports;
Object.defineProperty(resolve$2, "__esModule", { value: true });
resolve$2.getSchemaRefs = resolve$2.resolveUrl = resolve$2.normalizeId = resolve$2._getFullPath = resolve$2.getFullPath = resolve$2.inlineRef = void 0;
const util_1$m = util;
const equal$3 = fastDeepEqual;
const traverse = jsonSchemaTraverseExports;
const SIMPLE_INLINED = /* @__PURE__ */ new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const"
]);
function inlineRef(schema, limit2 = true) {
  if (typeof schema == "boolean")
    return true;
  if (limit2 === true)
    return !hasRef(schema);
  if (!limit2)
    return false;
  return countKeys(schema) <= limit2;
}
resolve$2.inlineRef = inlineRef;
const REF_KEYWORDS = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function hasRef(schema) {
  for (const key in schema) {
    if (REF_KEYWORDS.has(key))
      return true;
    const sch = schema[key];
    if (Array.isArray(sch) && sch.some(hasRef))
      return true;
    if (typeof sch == "object" && hasRef(sch))
      return true;
  }
  return false;
}
function countKeys(schema) {
  let count = 0;
  for (const key in schema) {
    if (key === "$ref")
      return Infinity;
    count++;
    if (SIMPLE_INLINED.has(key))
      continue;
    if (typeof schema[key] == "object") {
      (0, util_1$m.eachItem)(schema[key], (sch) => count += countKeys(sch));
    }
    if (count === Infinity)
      return Infinity;
  }
  return count;
}
function getFullPath(resolver, id2 = "", normalize2) {
  if (normalize2 !== false)
    id2 = normalizeId(id2);
  const p = resolver.parse(id2);
  return _getFullPath(resolver, p);
}
resolve$2.getFullPath = getFullPath;
function _getFullPath(resolver, p) {
  const serialized = resolver.serialize(p);
  return serialized.split("#")[0] + "#";
}
resolve$2._getFullPath = _getFullPath;
const TRAILING_SLASH_HASH = /#\/?$/;
function normalizeId(id2) {
  return id2 ? id2.replace(TRAILING_SLASH_HASH, "") : "";
}
resolve$2.normalizeId = normalizeId;
function resolveUrl(resolver, baseId, id2) {
  id2 = normalizeId(id2);
  return resolver.resolve(baseId, id2);
}
resolve$2.resolveUrl = resolveUrl;
const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
function getSchemaRefs(schema, baseId) {
  if (typeof schema == "boolean")
    return {};
  const { schemaId, uriResolver } = this.opts;
  const schId = normalizeId(schema[schemaId] || baseId);
  const baseIds = { "": schId };
  const pathPrefix = getFullPath(uriResolver, schId, false);
  const localRefs = {};
  const schemaRefs = /* @__PURE__ */ new Set();
  traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
    if (parentJsonPtr === void 0)
      return;
    const fullPath = pathPrefix + jsonPtr;
    let innerBaseId = baseIds[parentJsonPtr];
    if (typeof sch[schemaId] == "string")
      innerBaseId = addRef.call(this, sch[schemaId]);
    addAnchor.call(this, sch.$anchor);
    addAnchor.call(this, sch.$dynamicAnchor);
    baseIds[jsonPtr] = innerBaseId;
    function addRef(ref2) {
      const _resolve = this.opts.uriResolver.resolve;
      ref2 = normalizeId(innerBaseId ? _resolve(innerBaseId, ref2) : ref2);
      if (schemaRefs.has(ref2))
        throw ambiguos(ref2);
      schemaRefs.add(ref2);
      let schOrRef = this.refs[ref2];
      if (typeof schOrRef == "string")
        schOrRef = this.refs[schOrRef];
      if (typeof schOrRef == "object") {
        checkAmbiguosRef(sch, schOrRef.schema, ref2);
      } else if (ref2 !== normalizeId(fullPath)) {
        if (ref2[0] === "#") {
          checkAmbiguosRef(sch, localRefs[ref2], ref2);
          localRefs[ref2] = sch;
        } else {
          this.refs[ref2] = fullPath;
        }
      }
      return ref2;
    }
    function addAnchor(anchor) {
      if (typeof anchor == "string") {
        if (!ANCHOR.test(anchor))
          throw new Error(`invalid anchor "${anchor}"`);
        addRef.call(this, `#${anchor}`);
      }
    }
  });
  return localRefs;
  function checkAmbiguosRef(sch1, sch2, ref2) {
    if (sch2 !== void 0 && !equal$3(sch1, sch2))
      throw ambiguos(ref2);
  }
  function ambiguos(ref2) {
    return new Error(`reference "${ref2}" resolves to more than one schema`);
  }
}
resolve$2.getSchemaRefs = getSchemaRefs;
Object.defineProperty(validate, "__esModule", { value: true });
validate.getData = validate.KeywordCxt = validate.validateFunctionCode = void 0;
const boolSchema_1 = boolSchema;
const dataType_1$1 = dataType;
const applicability_1 = applicability;
const dataType_2 = dataType;
const defaults_1 = defaults;
const keyword_1 = keyword;
const subschema_1 = subschema;
const codegen_1$n = codegen;
const names_1$3 = names$1;
const resolve_1$2 = resolve$2;
const util_1$l = util;
const errors_1 = errors;
function validateFunctionCode(it) {
  if (isSchemaObj(it)) {
    checkKeywords(it);
    if (schemaCxtHasRules(it)) {
      topSchemaObjCode(it);
      return;
    }
  }
  validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
}
validate.validateFunctionCode = validateFunctionCode;
function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
  if (opts.code.es5) {
    gen.func(validateName, (0, codegen_1$n._)`${names_1$3.default.data}, ${names_1$3.default.valCxt}`, schemaEnv.$async, () => {
      gen.code((0, codegen_1$n._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
      destructureValCxtES5(gen, opts);
      gen.code(body);
    });
  } else {
    gen.func(validateName, (0, codegen_1$n._)`${names_1$3.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
  }
}
function destructureValCxt(opts) {
  return (0, codegen_1$n._)`{${names_1$3.default.instancePath}="", ${names_1$3.default.parentData}, ${names_1$3.default.parentDataProperty}, ${names_1$3.default.rootData}=${names_1$3.default.data}${opts.dynamicRef ? (0, codegen_1$n._)`, ${names_1$3.default.dynamicAnchors}={}` : codegen_1$n.nil}}={}`;
}
function destructureValCxtES5(gen, opts) {
  gen.if(names_1$3.default.valCxt, () => {
    gen.var(names_1$3.default.instancePath, (0, codegen_1$n._)`${names_1$3.default.valCxt}.${names_1$3.default.instancePath}`);
    gen.var(names_1$3.default.parentData, (0, codegen_1$n._)`${names_1$3.default.valCxt}.${names_1$3.default.parentData}`);
    gen.var(names_1$3.default.parentDataProperty, (0, codegen_1$n._)`${names_1$3.default.valCxt}.${names_1$3.default.parentDataProperty}`);
    gen.var(names_1$3.default.rootData, (0, codegen_1$n._)`${names_1$3.default.valCxt}.${names_1$3.default.rootData}`);
    if (opts.dynamicRef)
      gen.var(names_1$3.default.dynamicAnchors, (0, codegen_1$n._)`${names_1$3.default.valCxt}.${names_1$3.default.dynamicAnchors}`);
  }, () => {
    gen.var(names_1$3.default.instancePath, (0, codegen_1$n._)`""`);
    gen.var(names_1$3.default.parentData, (0, codegen_1$n._)`undefined`);
    gen.var(names_1$3.default.parentDataProperty, (0, codegen_1$n._)`undefined`);
    gen.var(names_1$3.default.rootData, names_1$3.default.data);
    if (opts.dynamicRef)
      gen.var(names_1$3.default.dynamicAnchors, (0, codegen_1$n._)`{}`);
  });
}
function topSchemaObjCode(it) {
  const { schema, opts, gen } = it;
  validateFunction(it, () => {
    if (opts.$comment && schema.$comment)
      commentKeyword(it);
    checkNoDefault(it);
    gen.let(names_1$3.default.vErrors, null);
    gen.let(names_1$3.default.errors, 0);
    if (opts.unevaluated)
      resetEvaluated(it);
    typeAndKeywords(it);
    returnResults(it);
  });
  return;
}
function resetEvaluated(it) {
  const { gen, validateName } = it;
  it.evaluated = gen.const("evaluated", (0, codegen_1$n._)`${validateName}.evaluated`);
  gen.if((0, codegen_1$n._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1$n._)`${it.evaluated}.props`, (0, codegen_1$n._)`undefined`));
  gen.if((0, codegen_1$n._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1$n._)`${it.evaluated}.items`, (0, codegen_1$n._)`undefined`));
}
function funcSourceUrl(schema, opts) {
  const schId = typeof schema == "object" && schema[opts.schemaId];
  return schId && (opts.code.source || opts.code.process) ? (0, codegen_1$n._)`/*# sourceURL=${schId} */` : codegen_1$n.nil;
}
function subschemaCode(it, valid2) {
  if (isSchemaObj(it)) {
    checkKeywords(it);
    if (schemaCxtHasRules(it)) {
      subSchemaObjCode(it, valid2);
      return;
    }
  }
  (0, boolSchema_1.boolOrEmptySchema)(it, valid2);
}
function schemaCxtHasRules({ schema, self: self2 }) {
  if (typeof schema == "boolean")
    return !schema;
  for (const key in schema)
    if (self2.RULES.all[key])
      return true;
  return false;
}
function isSchemaObj(it) {
  return typeof it.schema != "boolean";
}
function subSchemaObjCode(it, valid2) {
  const { schema, gen, opts } = it;
  if (opts.$comment && schema.$comment)
    commentKeyword(it);
  updateContext(it);
  checkAsyncSchema(it);
  const errsCount = gen.const("_errs", names_1$3.default.errors);
  typeAndKeywords(it, errsCount);
  gen.var(valid2, (0, codegen_1$n._)`${errsCount} === ${names_1$3.default.errors}`);
}
function checkKeywords(it) {
  (0, util_1$l.checkUnknownRules)(it);
  checkRefsAndKeywords(it);
}
function typeAndKeywords(it, errsCount) {
  if (it.opts.jtd)
    return schemaKeywords(it, [], false, errsCount);
  const types2 = (0, dataType_1$1.getSchemaTypes)(it.schema);
  const checkedTypes = (0, dataType_1$1.coerceAndCheckDataType)(it, types2);
  schemaKeywords(it, types2, !checkedTypes, errsCount);
}
function checkRefsAndKeywords(it) {
  const { schema, errSchemaPath, opts, self: self2 } = it;
  if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1$l.schemaHasRulesButRef)(schema, self2.RULES)) {
    self2.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
  }
}
function checkNoDefault(it) {
  const { schema, opts } = it;
  if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
    (0, util_1$l.checkStrictMode)(it, "default is ignored in the schema root");
  }
}
function updateContext(it) {
  const schId = it.schema[it.opts.schemaId];
  if (schId)
    it.baseId = (0, resolve_1$2.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
}
function checkAsyncSchema(it) {
  if (it.schema.$async && !it.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
  const msg = schema.$comment;
  if (opts.$comment === true) {
    gen.code((0, codegen_1$n._)`${names_1$3.default.self}.logger.log(${msg})`);
  } else if (typeof opts.$comment == "function") {
    const schemaPath = (0, codegen_1$n.str)`${errSchemaPath}/$comment`;
    const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
    gen.code((0, codegen_1$n._)`${names_1$3.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
  }
}
function returnResults(it) {
  const { gen, schemaEnv, validateName, ValidationError: ValidationError2, opts } = it;
  if (schemaEnv.$async) {
    gen.if((0, codegen_1$n._)`${names_1$3.default.errors} === 0`, () => gen.return(names_1$3.default.data), () => gen.throw((0, codegen_1$n._)`new ${ValidationError2}(${names_1$3.default.vErrors})`));
  } else {
    gen.assign((0, codegen_1$n._)`${validateName}.errors`, names_1$3.default.vErrors);
    if (opts.unevaluated)
      assignEvaluated(it);
    gen.return((0, codegen_1$n._)`${names_1$3.default.errors} === 0`);
  }
}
function assignEvaluated({ gen, evaluated, props, items: items2 }) {
  if (props instanceof codegen_1$n.Name)
    gen.assign((0, codegen_1$n._)`${evaluated}.props`, props);
  if (items2 instanceof codegen_1$n.Name)
    gen.assign((0, codegen_1$n._)`${evaluated}.items`, items2);
}
function schemaKeywords(it, types2, typeErrors, errsCount) {
  const { gen, schema, data, allErrors, opts, self: self2 } = it;
  const { RULES } = self2;
  if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1$l.schemaHasRulesButRef)(schema, RULES))) {
    gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
    return;
  }
  if (!opts.jtd)
    checkStrictTypes(it, types2);
  gen.block(() => {
    for (const group of RULES.rules)
      groupKeywords(group);
    groupKeywords(RULES.post);
  });
  function groupKeywords(group) {
    if (!(0, applicability_1.shouldUseGroup)(schema, group))
      return;
    if (group.type) {
      gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
      iterateKeywords(it, group);
      if (types2.length === 1 && types2[0] === group.type && typeErrors) {
        gen.else();
        (0, dataType_2.reportTypeError)(it);
      }
      gen.endIf();
    } else {
      iterateKeywords(it, group);
    }
    if (!allErrors)
      gen.if((0, codegen_1$n._)`${names_1$3.default.errors} === ${errsCount || 0}`);
  }
}
function iterateKeywords(it, group) {
  const { gen, schema, opts: { useDefaults } } = it;
  if (useDefaults)
    (0, defaults_1.assignDefaults)(it, group.type);
  gen.block(() => {
    for (const rule of group.rules) {
      if ((0, applicability_1.shouldUseRule)(schema, rule)) {
        keywordCode(it, rule.keyword, rule.definition, group.type);
      }
    }
  });
}
function checkStrictTypes(it, types2) {
  if (it.schemaEnv.meta || !it.opts.strictTypes)
    return;
  checkContextTypes(it, types2);
  if (!it.opts.allowUnionTypes)
    checkMultipleTypes(it, types2);
  checkKeywordTypes(it, it.dataTypes);
}
function checkContextTypes(it, types2) {
  if (!types2.length)
    return;
  if (!it.dataTypes.length) {
    it.dataTypes = types2;
    return;
  }
  types2.forEach((t2) => {
    if (!includesType(it.dataTypes, t2)) {
      strictTypesError(it, `type "${t2}" not allowed by context "${it.dataTypes.join(",")}"`);
    }
  });
  narrowSchemaTypes(it, types2);
}
function checkMultipleTypes(it, ts) {
  if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
    strictTypesError(it, "use allowUnionTypes to allow union type keyword");
  }
}
function checkKeywordTypes(it, ts) {
  const rules2 = it.self.RULES.all;
  for (const keyword2 in rules2) {
    const rule = rules2[keyword2];
    if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
      const { type: type2 } = rule.definition;
      if (type2.length && !type2.some((t2) => hasApplicableType(ts, t2))) {
        strictTypesError(it, `missing type "${type2.join(",")}" for keyword "${keyword2}"`);
      }
    }
  }
}
function hasApplicableType(schTs, kwdT) {
  return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
}
function includesType(ts, t2) {
  return ts.includes(t2) || t2 === "integer" && ts.includes("number");
}
function narrowSchemaTypes(it, withTypes) {
  const ts = [];
  for (const t2 of it.dataTypes) {
    if (includesType(withTypes, t2))
      ts.push(t2);
    else if (withTypes.includes("integer") && t2 === "number")
      ts.push("integer");
  }
  it.dataTypes = ts;
}
function strictTypesError(it, msg) {
  const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
  msg += ` at "${schemaPath}" (strictTypes)`;
  (0, util_1$l.checkStrictMode)(it, msg, it.opts.strictTypes);
}
class KeywordCxt {
  constructor(it, def2, keyword2) {
    (0, keyword_1.validateKeywordUsage)(it, def2, keyword2);
    this.gen = it.gen;
    this.allErrors = it.allErrors;
    this.keyword = keyword2;
    this.data = it.data;
    this.schema = it.schema[keyword2];
    this.$data = def2.$data && it.opts.$data && this.schema && this.schema.$data;
    this.schemaValue = (0, util_1$l.schemaRefOrVal)(it, this.schema, keyword2, this.$data);
    this.schemaType = def2.schemaType;
    this.parentSchema = it.schema;
    this.params = {};
    this.it = it;
    this.def = def2;
    if (this.$data) {
      this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
    } else {
      this.schemaCode = this.schemaValue;
      if (!(0, keyword_1.validSchemaType)(this.schema, def2.schemaType, def2.allowUndefined)) {
        throw new Error(`${keyword2} value must be ${JSON.stringify(def2.schemaType)}`);
      }
    }
    if ("code" in def2 ? def2.trackErrors : def2.errors !== false) {
      this.errsCount = it.gen.const("_errs", names_1$3.default.errors);
    }
  }
  result(condition, successAction, failAction) {
    this.failResult((0, codegen_1$n.not)(condition), successAction, failAction);
  }
  failResult(condition, successAction, failAction) {
    this.gen.if(condition);
    if (failAction)
      failAction();
    else
      this.error();
    if (successAction) {
      this.gen.else();
      successAction();
      if (this.allErrors)
        this.gen.endIf();
    } else {
      if (this.allErrors)
        this.gen.endIf();
      else
        this.gen.else();
    }
  }
  pass(condition, failAction) {
    this.failResult((0, codegen_1$n.not)(condition), void 0, failAction);
  }
  fail(condition) {
    if (condition === void 0) {
      this.error();
      if (!this.allErrors)
        this.gen.if(false);
      return;
    }
    this.gen.if(condition);
    this.error();
    if (this.allErrors)
      this.gen.endIf();
    else
      this.gen.else();
  }
  fail$data(condition) {
    if (!this.$data)
      return this.fail(condition);
    const { schemaCode } = this;
    this.fail((0, codegen_1$n._)`${schemaCode} !== undefined && (${(0, codegen_1$n.or)(this.invalid$data(), condition)})`);
  }
  error(append, errorParams, errorPaths) {
    if (errorParams) {
      this.setParams(errorParams);
      this._error(append, errorPaths);
      this.setParams({});
      return;
    }
    this._error(append, errorPaths);
  }
  _error(append, errorPaths) {
    (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
  }
  $dataError() {
    (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
  }
  ok(cond) {
    if (!this.allErrors)
      this.gen.if(cond);
  }
  setParams(obj, assign) {
    if (assign)
      Object.assign(this.params, obj);
    else
      this.params = obj;
  }
  block$data(valid2, codeBlock, $dataValid = codegen_1$n.nil) {
    this.gen.block(() => {
      this.check$data(valid2, $dataValid);
      codeBlock();
    });
  }
  check$data(valid2 = codegen_1$n.nil, $dataValid = codegen_1$n.nil) {
    if (!this.$data)
      return;
    const { gen, schemaCode, schemaType, def: def2 } = this;
    gen.if((0, codegen_1$n.or)((0, codegen_1$n._)`${schemaCode} === undefined`, $dataValid));
    if (valid2 !== codegen_1$n.nil)
      gen.assign(valid2, true);
    if (schemaType.length || def2.validateSchema) {
      gen.elseIf(this.invalid$data());
      this.$dataError();
      if (valid2 !== codegen_1$n.nil)
        gen.assign(valid2, false);
    }
    gen.else();
  }
  invalid$data() {
    const { gen, schemaCode, schemaType, def: def2, it } = this;
    return (0, codegen_1$n.or)(wrong$DataType(), invalid$DataSchema());
    function wrong$DataType() {
      if (schemaType.length) {
        if (!(schemaCode instanceof codegen_1$n.Name))
          throw new Error("ajv implementation error");
        const st = Array.isArray(schemaType) ? schemaType : [schemaType];
        return (0, codegen_1$n._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
      }
      return codegen_1$n.nil;
    }
    function invalid$DataSchema() {
      if (def2.validateSchema) {
        const validateSchemaRef = gen.scopeValue("validate$data", { ref: def2.validateSchema });
        return (0, codegen_1$n._)`!${validateSchemaRef}(${schemaCode})`;
      }
      return codegen_1$n.nil;
    }
  }
  subschema(appl, valid2) {
    const subschema2 = (0, subschema_1.getSubschema)(this.it, appl);
    (0, subschema_1.extendSubschemaData)(subschema2, this.it, appl);
    (0, subschema_1.extendSubschemaMode)(subschema2, appl);
    const nextContext = { ...this.it, ...subschema2, items: void 0, props: void 0 };
    subschemaCode(nextContext, valid2);
    return nextContext;
  }
  mergeEvaluated(schemaCxt, toName) {
    const { it, gen } = this;
    if (!it.opts.unevaluated)
      return;
    if (it.props !== true && schemaCxt.props !== void 0) {
      it.props = util_1$l.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
    }
    if (it.items !== true && schemaCxt.items !== void 0) {
      it.items = util_1$l.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
    }
  }
  mergeValidEvaluated(schemaCxt, valid2) {
    const { it, gen } = this;
    if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
      gen.if(valid2, () => this.mergeEvaluated(schemaCxt, codegen_1$n.Name));
      return true;
    }
  }
}
validate.KeywordCxt = KeywordCxt;
function keywordCode(it, keyword2, def2, ruleType) {
  const cxt = new KeywordCxt(it, def2, keyword2);
  if ("code" in def2) {
    def2.code(cxt, ruleType);
  } else if (cxt.$data && def2.validate) {
    (0, keyword_1.funcKeywordCode)(cxt, def2);
  } else if ("macro" in def2) {
    (0, keyword_1.macroKeywordCode)(cxt, def2);
  } else if (def2.compile || def2.validate) {
    (0, keyword_1.funcKeywordCode)(cxt, def2);
  }
}
const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function getData($data, { dataLevel, dataNames, dataPathArr }) {
  let jsonPointer;
  let data;
  if ($data === "")
    return names_1$3.default.rootData;
  if ($data[0] === "/") {
    if (!JSON_POINTER.test($data))
      throw new Error(`Invalid JSON-pointer: ${$data}`);
    jsonPointer = $data;
    data = names_1$3.default.rootData;
  } else {
    const matches = RELATIVE_JSON_POINTER.exec($data);
    if (!matches)
      throw new Error(`Invalid JSON-pointer: ${$data}`);
    const up = +matches[1];
    jsonPointer = matches[2];
    if (jsonPointer === "#") {
      if (up >= dataLevel)
        throw new Error(errorMsg("property/index", up));
      return dataPathArr[dataLevel - up];
    }
    if (up > dataLevel)
      throw new Error(errorMsg("data", up));
    data = dataNames[dataLevel - up];
    if (!jsonPointer)
      return data;
  }
  let expr = data;
  const segments = jsonPointer.split("/");
  for (const segment of segments) {
    if (segment) {
      data = (0, codegen_1$n._)`${data}${(0, codegen_1$n.getProperty)((0, util_1$l.unescapeJsonPointer)(segment))}`;
      expr = (0, codegen_1$n._)`${expr} && ${data}`;
    }
  }
  return expr;
  function errorMsg(pointerType, up) {
    return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
  }
}
validate.getData = getData;
var validation_error = {};
Object.defineProperty(validation_error, "__esModule", { value: true });
class ValidationError extends Error {
  constructor(errors2) {
    super("validation failed");
    this.errors = errors2;
    this.ajv = this.validation = true;
  }
}
validation_error.default = ValidationError;
var ref_error = {};
Object.defineProperty(ref_error, "__esModule", { value: true });
const resolve_1$1 = resolve$2;
class MissingRefError extends Error {
  constructor(resolver, baseId, ref2, msg) {
    super(msg || `can't resolve reference ${ref2} from id ${baseId}`);
    this.missingRef = (0, resolve_1$1.resolveUrl)(resolver, baseId, ref2);
    this.missingSchema = (0, resolve_1$1.normalizeId)((0, resolve_1$1.getFullPath)(resolver, this.missingRef));
  }
}
ref_error.default = MissingRefError;
var compile = {};
Object.defineProperty(compile, "__esModule", { value: true });
compile.resolveSchema = compile.getCompilingSchema = compile.resolveRef = compile.compileSchema = compile.SchemaEnv = void 0;
const codegen_1$m = codegen;
const validation_error_1 = validation_error;
const names_1$2 = names$1;
const resolve_1 = resolve$2;
const util_1$k = util;
const validate_1$1 = validate;
class SchemaEnv {
  constructor(env2) {
    var _a;
    this.refs = {};
    this.dynamicAnchors = {};
    let schema;
    if (typeof env2.schema == "object")
      schema = env2.schema;
    this.schema = env2.schema;
    this.schemaId = env2.schemaId;
    this.root = env2.root || this;
    this.baseId = (_a = env2.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env2.schemaId || "$id"]);
    this.schemaPath = env2.schemaPath;
    this.localRefs = env2.localRefs;
    this.meta = env2.meta;
    this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
    this.refs = {};
  }
}
compile.SchemaEnv = SchemaEnv;
function compileSchema(sch) {
  const _sch = getCompilingSchema.call(this, sch);
  if (_sch)
    return _sch;
  const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
  const { es5, lines } = this.opts.code;
  const { ownProperties } = this.opts;
  const gen = new codegen_1$m.CodeGen(this.scope, { es5, lines, ownProperties });
  let _ValidationError;
  if (sch.$async) {
    _ValidationError = gen.scopeValue("Error", {
      ref: validation_error_1.default,
      code: (0, codegen_1$m._)`require("ajv/dist/runtime/validation_error").default`
    });
  }
  const validateName = gen.scopeName("validate");
  sch.validateName = validateName;
  const schemaCxt = {
    gen,
    allErrors: this.opts.allErrors,
    data: names_1$2.default.data,
    parentData: names_1$2.default.parentData,
    parentDataProperty: names_1$2.default.parentDataProperty,
    dataNames: [names_1$2.default.data],
    dataPathArr: [codegen_1$m.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1$m.stringify)(sch.schema) } : { ref: sch.schema }),
    validateName,
    ValidationError: _ValidationError,
    schema: sch.schema,
    schemaEnv: sch,
    rootId,
    baseId: sch.baseId || rootId,
    schemaPath: codegen_1$m.nil,
    errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, codegen_1$m._)`""`,
    opts: this.opts,
    self: this
  };
  let sourceCode;
  try {
    this._compilations.add(sch);
    (0, validate_1$1.validateFunctionCode)(schemaCxt);
    gen.optimize(this.opts.code.optimize);
    const validateCode = gen.toString();
    sourceCode = `${gen.scopeRefs(names_1$2.default.scope)}return ${validateCode}`;
    if (this.opts.code.process)
      sourceCode = this.opts.code.process(sourceCode, sch);
    const makeValidate = new Function(`${names_1$2.default.self}`, `${names_1$2.default.scope}`, sourceCode);
    const validate2 = makeValidate(this, this.scope.get());
    this.scope.value(validateName, { ref: validate2 });
    validate2.errors = null;
    validate2.schema = sch.schema;
    validate2.schemaEnv = sch;
    if (sch.$async)
      validate2.$async = true;
    if (this.opts.code.source === true) {
      validate2.source = { validateName, validateCode, scopeValues: gen._values };
    }
    if (this.opts.unevaluated) {
      const { props, items: items2 } = schemaCxt;
      validate2.evaluated = {
        props: props instanceof codegen_1$m.Name ? void 0 : props,
        items: items2 instanceof codegen_1$m.Name ? void 0 : items2,
        dynamicProps: props instanceof codegen_1$m.Name,
        dynamicItems: items2 instanceof codegen_1$m.Name
      };
      if (validate2.source)
        validate2.source.evaluated = (0, codegen_1$m.stringify)(validate2.evaluated);
    }
    sch.validate = validate2;
    return sch;
  } catch (e) {
    delete sch.validate;
    delete sch.validateName;
    if (sourceCode)
      this.logger.error("Error compiling schema, function code:", sourceCode);
    throw e;
  } finally {
    this._compilations.delete(sch);
  }
}
compile.compileSchema = compileSchema;
function resolveRef(root, baseId, ref2) {
  var _a;
  ref2 = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref2);
  const schOrFunc = root.refs[ref2];
  if (schOrFunc)
    return schOrFunc;
  let _sch = resolve$1.call(this, root, ref2);
  if (_sch === void 0) {
    const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref2];
    const { schemaId } = this.opts;
    if (schema)
      _sch = new SchemaEnv({ schema, schemaId, root, baseId });
  }
  if (_sch === void 0)
    return;
  return root.refs[ref2] = inlineOrCompile.call(this, _sch);
}
compile.resolveRef = resolveRef;
function inlineOrCompile(sch) {
  if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
    return sch.schema;
  return sch.validate ? sch : compileSchema.call(this, sch);
}
function getCompilingSchema(schEnv) {
  for (const sch of this._compilations) {
    if (sameSchemaEnv(sch, schEnv))
      return sch;
  }
}
compile.getCompilingSchema = getCompilingSchema;
function sameSchemaEnv(s1, s2) {
  return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
}
function resolve$1(root, ref2) {
  let sch;
  while (typeof (sch = this.refs[ref2]) == "string")
    ref2 = sch;
  return sch || this.schemas[ref2] || resolveSchema.call(this, root, ref2);
}
function resolveSchema(root, ref2) {
  const p = this.opts.uriResolver.parse(ref2);
  const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
  let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
  if (Object.keys(root.schema).length > 0 && refPath === baseId) {
    return getJsonPointer.call(this, p, root);
  }
  const id2 = (0, resolve_1.normalizeId)(refPath);
  const schOrRef = this.refs[id2] || this.schemas[id2];
  if (typeof schOrRef == "string") {
    const sch = resolveSchema.call(this, root, schOrRef);
    if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
      return;
    return getJsonPointer.call(this, p, sch);
  }
  if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
    return;
  if (!schOrRef.validate)
    compileSchema.call(this, schOrRef);
  if (id2 === (0, resolve_1.normalizeId)(ref2)) {
    const { schema } = schOrRef;
    const { schemaId } = this.opts;
    const schId = schema[schemaId];
    if (schId)
      baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
    return new SchemaEnv({ schema, schemaId, root, baseId });
  }
  return getJsonPointer.call(this, p, schOrRef);
}
compile.resolveSchema = resolveSchema;
const PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function getJsonPointer(parsedRef, { baseId, schema, root }) {
  var _a;
  if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
    return;
  for (const part of parsedRef.fragment.slice(1).split("/")) {
    if (typeof schema === "boolean")
      return;
    const partSchema = schema[(0, util_1$k.unescapeFragment)(part)];
    if (partSchema === void 0)
      return;
    schema = partSchema;
    const schId = typeof schema === "object" && schema[this.opts.schemaId];
    if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
      baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
    }
  }
  let env2;
  if (typeof schema != "boolean" && schema.$ref && !(0, util_1$k.schemaHasRulesButRef)(schema, this.RULES)) {
    const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
    env2 = resolveSchema.call(this, root, $ref);
  }
  const { schemaId } = this.opts;
  env2 = env2 || new SchemaEnv({ schema, schemaId, root, baseId });
  if (env2.schema !== env2.root.schema)
    return env2;
  return void 0;
}
const $id$1 = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
const description = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
const type$1 = "object";
const required$1 = [
  "$data"
];
const properties$2 = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
};
const additionalProperties$1 = false;
const require$$9 = {
  $id: $id$1,
  description,
  type: type$1,
  required: required$1,
  properties: properties$2,
  additionalProperties: additionalProperties$1
};
var uri$1 = {};
var fastUri$1 = { exports: {} };
const HEX$1 = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  A: 10,
  b: 11,
  B: 11,
  c: 12,
  C: 12,
  d: 13,
  D: 13,
  e: 14,
  E: 14,
  f: 15,
  F: 15
};
var scopedChars = {
  HEX: HEX$1
};
const { HEX } = scopedChars;
function normalizeIPv4$1(host) {
  if (findToken(host, ".") < 3) {
    return { host, isIPV4: false };
  }
  const matches = host.match(/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/u) || [];
  const [address] = matches;
  if (address) {
    return { host: stripLeadingZeros(address, "."), isIPV4: true };
  } else {
    return { host, isIPV4: false };
  }
}
function stringArrayToHexStripped(input, keepZero = false) {
  let acc = "";
  let strip = true;
  for (const c of input) {
    if (HEX[c] === void 0) return void 0;
    if (c !== "0" && strip === true) strip = false;
    if (!strip) acc += c;
  }
  if (keepZero && acc.length === 0) acc = "0";
  return acc;
}
function getIPV6(input) {
  let tokenCount = 0;
  const output = { error: false, address: "", zone: "" };
  const address = [];
  const buffer = [];
  let isZone = false;
  let endipv6Encountered = false;
  let endIpv6 = false;
  function consume() {
    if (buffer.length) {
      if (isZone === false) {
        const hex = stringArrayToHexStripped(buffer);
        if (hex !== void 0) {
          address.push(hex);
        } else {
          output.error = true;
          return false;
        }
      }
      buffer.length = 0;
    }
    return true;
  }
  for (let i = 0; i < input.length; i++) {
    const cursor = input[i];
    if (cursor === "[" || cursor === "]") {
      continue;
    }
    if (cursor === ":") {
      if (endipv6Encountered === true) {
        endIpv6 = true;
      }
      if (!consume()) {
        break;
      }
      tokenCount++;
      address.push(":");
      if (tokenCount > 7) {
        output.error = true;
        break;
      }
      if (i - 1 >= 0 && input[i - 1] === ":") {
        endipv6Encountered = true;
      }
      continue;
    } else if (cursor === "%") {
      if (!consume()) {
        break;
      }
      isZone = true;
    } else {
      buffer.push(cursor);
      continue;
    }
  }
  if (buffer.length) {
    if (isZone) {
      output.zone = buffer.join("");
    } else if (endIpv6) {
      address.push(buffer.join(""));
    } else {
      address.push(stringArrayToHexStripped(buffer));
    }
  }
  output.address = address.join("");
  return output;
}
function normalizeIPv6$1(host, opts = {}) {
  if (findToken(host, ":") < 2) {
    return { host, isIPV6: false };
  }
  const ipv6 = getIPV6(host);
  if (!ipv6.error) {
    let newHost = ipv6.address;
    let escapedHost = ipv6.address;
    if (ipv6.zone) {
      newHost += "%" + ipv6.zone;
      escapedHost += "%25" + ipv6.zone;
    }
    return { host: newHost, escapedHost, isIPV6: true };
  } else {
    return { host, isIPV6: false };
  }
}
function stripLeadingZeros(str, token) {
  let out = "";
  let skip = true;
  const l = str.length;
  for (let i = 0; i < l; i++) {
    const c = str[i];
    if (c === "0" && skip) {
      if (i + 1 <= l && str[i + 1] === token || i + 1 === l) {
        out += c;
        skip = false;
      }
    } else {
      if (c === token) {
        skip = true;
      } else {
        skip = false;
      }
      out += c;
    }
  }
  return out;
}
function findToken(str, token) {
  let ind = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === token) ind++;
  }
  return ind;
}
const RDS1 = /^\.\.?\//u;
const RDS2 = /^\/\.(?:\/|$)/u;
const RDS3 = /^\/\.\.(?:\/|$)/u;
const RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/u;
function removeDotSegments$1(input) {
  const output = [];
  while (input.length) {
    if (input.match(RDS1)) {
      input = input.replace(RDS1, "");
    } else if (input.match(RDS2)) {
      input = input.replace(RDS2, "/");
    } else if (input.match(RDS3)) {
      input = input.replace(RDS3, "/");
      output.pop();
    } else if (input === "." || input === "..") {
      input = "";
    } else {
      const im = input.match(RDS5);
      if (im) {
        const s = im[0];
        input = input.slice(s.length);
        output.push(s);
      } else {
        throw new Error("Unexpected dot segment condition");
      }
    }
  }
  return output.join("");
}
function normalizeComponentEncoding$1(components, esc) {
  const func = esc !== true ? escape : unescape;
  if (components.scheme !== void 0) {
    components.scheme = func(components.scheme);
  }
  if (components.userinfo !== void 0) {
    components.userinfo = func(components.userinfo);
  }
  if (components.host !== void 0) {
    components.host = func(components.host);
  }
  if (components.path !== void 0) {
    components.path = func(components.path);
  }
  if (components.query !== void 0) {
    components.query = func(components.query);
  }
  if (components.fragment !== void 0) {
    components.fragment = func(components.fragment);
  }
  return components;
}
function recomposeAuthority$1(components, options) {
  const uriTokens = [];
  if (components.userinfo !== void 0) {
    uriTokens.push(components.userinfo);
    uriTokens.push("@");
  }
  if (components.host !== void 0) {
    let host = unescape(components.host);
    const ipV4res = normalizeIPv4$1(host);
    if (ipV4res.isIPV4) {
      host = ipV4res.host;
    } else {
      const ipV6res = normalizeIPv6$1(ipV4res.host, {});
      if (ipV6res.isIPV6 === true) {
        host = `[${ipV6res.escapedHost}]`;
      } else {
        host = components.host;
      }
    }
    uriTokens.push(host);
  }
  if (typeof components.port === "number" || typeof components.port === "string") {
    uriTokens.push(":");
    uriTokens.push(String(components.port));
  }
  return uriTokens.length ? uriTokens.join("") : void 0;
}
var utils = {
  recomposeAuthority: recomposeAuthority$1,
  normalizeComponentEncoding: normalizeComponentEncoding$1,
  removeDotSegments: removeDotSegments$1,
  normalizeIPv4: normalizeIPv4$1,
  normalizeIPv6: normalizeIPv6$1
};
const UUID_REG = /^[\da-f]{8}\b-[\da-f]{4}\b-[\da-f]{4}\b-[\da-f]{4}\b-[\da-f]{12}$/iu;
const URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
function isSecure(wsComponents) {
  return typeof wsComponents.secure === "boolean" ? wsComponents.secure : String(wsComponents.scheme).toLowerCase() === "wss";
}
function httpParse(components) {
  if (!components.host) {
    components.error = components.error || "HTTP URIs must have a host.";
  }
  return components;
}
function httpSerialize(components) {
  const secure = String(components.scheme).toLowerCase() === "https";
  if (components.port === (secure ? 443 : 80) || components.port === "") {
    components.port = void 0;
  }
  if (!components.path) {
    components.path = "/";
  }
  return components;
}
function wsParse(wsComponents) {
  wsComponents.secure = isSecure(wsComponents);
  wsComponents.resourceName = (wsComponents.path || "/") + (wsComponents.query ? "?" + wsComponents.query : "");
  wsComponents.path = void 0;
  wsComponents.query = void 0;
  return wsComponents;
}
function wsSerialize(wsComponents) {
  if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === "") {
    wsComponents.port = void 0;
  }
  if (typeof wsComponents.secure === "boolean") {
    wsComponents.scheme = wsComponents.secure ? "wss" : "ws";
    wsComponents.secure = void 0;
  }
  if (wsComponents.resourceName) {
    const [path2, query] = wsComponents.resourceName.split("?");
    wsComponents.path = path2 && path2 !== "/" ? path2 : void 0;
    wsComponents.query = query;
    wsComponents.resourceName = void 0;
  }
  wsComponents.fragment = void 0;
  return wsComponents;
}
function urnParse(urnComponents, options) {
  if (!urnComponents.path) {
    urnComponents.error = "URN can not be parsed";
    return urnComponents;
  }
  const matches = urnComponents.path.match(URN_REG);
  if (matches) {
    const scheme = options.scheme || urnComponents.scheme || "urn";
    urnComponents.nid = matches[1].toLowerCase();
    urnComponents.nss = matches[2];
    const urnScheme = `${scheme}:${options.nid || urnComponents.nid}`;
    const schemeHandler = SCHEMES$1[urnScheme];
    urnComponents.path = void 0;
    if (schemeHandler) {
      urnComponents = schemeHandler.parse(urnComponents, options);
    }
  } else {
    urnComponents.error = urnComponents.error || "URN can not be parsed.";
  }
  return urnComponents;
}
function urnSerialize(urnComponents, options) {
  const scheme = options.scheme || urnComponents.scheme || "urn";
  const nid = urnComponents.nid.toLowerCase();
  const urnScheme = `${scheme}:${options.nid || nid}`;
  const schemeHandler = SCHEMES$1[urnScheme];
  if (schemeHandler) {
    urnComponents = schemeHandler.serialize(urnComponents, options);
  }
  const uriComponents = urnComponents;
  const nss = urnComponents.nss;
  uriComponents.path = `${nid || options.nid}:${nss}`;
  options.skipEscape = true;
  return uriComponents;
}
function urnuuidParse(urnComponents, options) {
  const uuidComponents = urnComponents;
  uuidComponents.uuid = uuidComponents.nss;
  uuidComponents.nss = void 0;
  if (!options.tolerant && (!uuidComponents.uuid || !UUID_REG.test(uuidComponents.uuid))) {
    uuidComponents.error = uuidComponents.error || "UUID is not valid.";
  }
  return uuidComponents;
}
function urnuuidSerialize(uuidComponents) {
  const urnComponents = uuidComponents;
  urnComponents.nss = (uuidComponents.uuid || "").toLowerCase();
  return urnComponents;
}
const http = {
  scheme: "http",
  domainHost: true,
  parse: httpParse,
  serialize: httpSerialize
};
const https = {
  scheme: "https",
  domainHost: http.domainHost,
  parse: httpParse,
  serialize: httpSerialize
};
const ws = {
  scheme: "ws",
  domainHost: true,
  parse: wsParse,
  serialize: wsSerialize
};
const wss = {
  scheme: "wss",
  domainHost: ws.domainHost,
  parse: ws.parse,
  serialize: ws.serialize
};
const urn = {
  scheme: "urn",
  parse: urnParse,
  serialize: urnSerialize,
  skipNormalize: true
};
const urnuuid = {
  scheme: "urn:uuid",
  parse: urnuuidParse,
  serialize: urnuuidSerialize,
  skipNormalize: true
};
const SCHEMES$1 = {
  http,
  https,
  ws,
  wss,
  urn,
  "urn:uuid": urnuuid
};
var schemes = SCHEMES$1;
const { normalizeIPv6, normalizeIPv4, removeDotSegments, recomposeAuthority, normalizeComponentEncoding } = utils;
const SCHEMES = schemes;
function normalize(uri2, options) {
  if (typeof uri2 === "string") {
    uri2 = serialize(parse$7(uri2, options), options);
  } else if (typeof uri2 === "object") {
    uri2 = parse$7(serialize(uri2, options), options);
  }
  return uri2;
}
function resolve(baseURI, relativeURI, options) {
  const schemelessOptions = Object.assign({ scheme: "null" }, options);
  const resolved = resolveComponents(parse$7(baseURI, schemelessOptions), parse$7(relativeURI, schemelessOptions), schemelessOptions, true);
  return serialize(resolved, { ...schemelessOptions, skipEscape: true });
}
function resolveComponents(base, relative, options, skipNormalization) {
  const target = {};
  if (!skipNormalization) {
    base = parse$7(serialize(base, options), options);
    relative = parse$7(serialize(relative, options), options);
  }
  options = options || {};
  if (!options.tolerant && relative.scheme) {
    target.scheme = relative.scheme;
    target.userinfo = relative.userinfo;
    target.host = relative.host;
    target.port = relative.port;
    target.path = removeDotSegments(relative.path || "");
    target.query = relative.query;
  } else {
    if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
      target.userinfo = relative.userinfo;
      target.host = relative.host;
      target.port = relative.port;
      target.path = removeDotSegments(relative.path || "");
      target.query = relative.query;
    } else {
      if (!relative.path) {
        target.path = base.path;
        if (relative.query !== void 0) {
          target.query = relative.query;
        } else {
          target.query = base.query;
        }
      } else {
        if (relative.path.charAt(0) === "/") {
          target.path = removeDotSegments(relative.path);
        } else {
          if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
            target.path = "/" + relative.path;
          } else if (!base.path) {
            target.path = relative.path;
          } else {
            target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
          }
          target.path = removeDotSegments(target.path);
        }
        target.query = relative.query;
      }
      target.userinfo = base.userinfo;
      target.host = base.host;
      target.port = base.port;
    }
    target.scheme = base.scheme;
  }
  target.fragment = relative.fragment;
  return target;
}
function equal$2(uriA, uriB, options) {
  if (typeof uriA === "string") {
    uriA = unescape(uriA);
    uriA = serialize(normalizeComponentEncoding(parse$7(uriA, options), true), { ...options, skipEscape: true });
  } else if (typeof uriA === "object") {
    uriA = serialize(normalizeComponentEncoding(uriA, true), { ...options, skipEscape: true });
  }
  if (typeof uriB === "string") {
    uriB = unescape(uriB);
    uriB = serialize(normalizeComponentEncoding(parse$7(uriB, options), true), { ...options, skipEscape: true });
  } else if (typeof uriB === "object") {
    uriB = serialize(normalizeComponentEncoding(uriB, true), { ...options, skipEscape: true });
  }
  return uriA.toLowerCase() === uriB.toLowerCase();
}
function serialize(cmpts, opts) {
  const components = {
    host: cmpts.host,
    scheme: cmpts.scheme,
    userinfo: cmpts.userinfo,
    port: cmpts.port,
    path: cmpts.path,
    query: cmpts.query,
    nid: cmpts.nid,
    nss: cmpts.nss,
    uuid: cmpts.uuid,
    fragment: cmpts.fragment,
    reference: cmpts.reference,
    resourceName: cmpts.resourceName,
    secure: cmpts.secure,
    error: ""
  };
  const options = Object.assign({}, opts);
  const uriTokens = [];
  const schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
  if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options);
  if (components.path !== void 0) {
    if (!options.skipEscape) {
      components.path = escape(components.path);
      if (components.scheme !== void 0) {
        components.path = components.path.split("%3A").join(":");
      }
    } else {
      components.path = unescape(components.path);
    }
  }
  if (options.reference !== "suffix" && components.scheme) {
    uriTokens.push(components.scheme);
    uriTokens.push(":");
  }
  const authority = recomposeAuthority(components, options);
  if (authority !== void 0) {
    if (options.reference !== "suffix") {
      uriTokens.push("//");
    }
    uriTokens.push(authority);
    if (components.path && components.path.charAt(0) !== "/") {
      uriTokens.push("/");
    }
  }
  if (components.path !== void 0) {
    let s = components.path;
    if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
      s = removeDotSegments(s);
    }
    if (authority === void 0) {
      s = s.replace(/^\/\//u, "/%2F");
    }
    uriTokens.push(s);
  }
  if (components.query !== void 0) {
    uriTokens.push("?");
    uriTokens.push(components.query);
  }
  if (components.fragment !== void 0) {
    uriTokens.push("#");
    uriTokens.push(components.fragment);
  }
  return uriTokens.join("");
}
const hexLookUp = Array.from({ length: 127 }, (v, k) => /[^!"$&'()*+,\-.;=_`a-z{}~]/u.test(String.fromCharCode(k)));
function nonSimpleDomain(value) {
  let code2 = 0;
  for (let i = 0, len = value.length; i < len; ++i) {
    code2 = value.charCodeAt(i);
    if (code2 > 126 || hexLookUp[code2]) {
      return true;
    }
  }
  return false;
}
const URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
function parse$7(uri2, opts) {
  const options = Object.assign({}, opts);
  const parsed = {
    scheme: void 0,
    userinfo: void 0,
    host: "",
    port: void 0,
    path: "",
    query: void 0,
    fragment: void 0
  };
  const gotEncoding = uri2.indexOf("%") !== -1;
  let isIP = false;
  if (options.reference === "suffix") uri2 = (options.scheme ? options.scheme + ":" : "") + "//" + uri2;
  const matches = uri2.match(URI_PARSE);
  if (matches) {
    parsed.scheme = matches[1];
    parsed.userinfo = matches[3];
    parsed.host = matches[4];
    parsed.port = parseInt(matches[5], 10);
    parsed.path = matches[6] || "";
    parsed.query = matches[7];
    parsed.fragment = matches[8];
    if (isNaN(parsed.port)) {
      parsed.port = matches[5];
    }
    if (parsed.host) {
      const ipv4result = normalizeIPv4(parsed.host);
      if (ipv4result.isIPV4 === false) {
        const ipv6result = normalizeIPv6(ipv4result.host, { isIPV4: false });
        parsed.host = ipv6result.host.toLowerCase();
        isIP = ipv6result.isIPV6;
      } else {
        parsed.host = ipv4result.host;
        isIP = true;
      }
    }
    if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && !parsed.path && parsed.query === void 0) {
      parsed.reference = "same-document";
    } else if (parsed.scheme === void 0) {
      parsed.reference = "relative";
    } else if (parsed.fragment === void 0) {
      parsed.reference = "absolute";
    } else {
      parsed.reference = "uri";
    }
    if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
      parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
    }
    const schemeHandler = SCHEMES[(options.scheme || parsed.scheme || "").toLowerCase()];
    if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
      if (parsed.host && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
        try {
          parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
        } catch (e) {
          parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
        }
      }
    }
    if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
      if (gotEncoding && parsed.scheme !== void 0) {
        parsed.scheme = unescape(parsed.scheme);
      }
      if (gotEncoding && parsed.userinfo !== void 0) {
        parsed.userinfo = unescape(parsed.userinfo);
      }
      if (gotEncoding && parsed.host !== void 0) {
        parsed.host = unescape(parsed.host);
      }
      if (parsed.path !== void 0 && parsed.path.length) {
        parsed.path = escape(unescape(parsed.path));
      }
      if (parsed.fragment !== void 0 && parsed.fragment.length) {
        parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
      }
    }
    if (schemeHandler && schemeHandler.parse) {
      schemeHandler.parse(parsed, options);
    }
  } else {
    parsed.error = parsed.error || "URI can not be parsed.";
  }
  return parsed;
}
const fastUri = {
  SCHEMES,
  normalize,
  resolve,
  resolveComponents,
  equal: equal$2,
  serialize,
  parse: parse$7
};
fastUri$1.exports = fastUri;
fastUri$1.exports.default = fastUri;
fastUri$1.exports.fastUri = fastUri;
var fastUriExports = fastUri$1.exports;
Object.defineProperty(uri$1, "__esModule", { value: true });
const uri = fastUriExports;
uri.code = 'require("ajv/dist/runtime/uri").default';
uri$1.default = uri;
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.CodeGen = exports$1.Name = exports$1.nil = exports$1.stringify = exports$1.str = exports$1._ = exports$1.KeywordCxt = void 0;
  var validate_12 = validate;
  Object.defineProperty(exports$1, "KeywordCxt", { enumerable: true, get: function() {
    return validate_12.KeywordCxt;
  } });
  var codegen_12 = codegen;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return codegen_12._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return codegen_12.str;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return codegen_12.stringify;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return codegen_12.nil;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return codegen_12.Name;
  } });
  Object.defineProperty(exports$1, "CodeGen", { enumerable: true, get: function() {
    return codegen_12.CodeGen;
  } });
  const validation_error_12 = validation_error;
  const ref_error_12 = ref_error;
  const rules_12 = rules;
  const compile_12 = compile;
  const codegen_2 = codegen;
  const resolve_12 = resolve$2;
  const dataType_12 = dataType;
  const util_12 = util;
  const $dataRefSchema = require$$9;
  const uri_1 = uri$1;
  const defaultRegExp = (str, flags) => new RegExp(str, flags);
  defaultRegExp.code = "new RegExp";
  const META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
  const EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]);
  const removedOptions = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  };
  const deprecatedOptions = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  };
  const MAX_EXPRESSION = 200;
  function requiredOptions(o) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    const s = o.strict;
    const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
    const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
    const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
    const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
    return {
      strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
      strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
      strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
      strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
      strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
      code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
      loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
      loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
      meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
      messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
      inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
      schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
      addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
      validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
      validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
      unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
      int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
      uriResolver
    };
  }
  class Ajv {
    constructor(opts = {}) {
      this.schemas = {};
      this.refs = {};
      this.formats = {};
      this._compilations = /* @__PURE__ */ new Set();
      this._loading = {};
      this._cache = /* @__PURE__ */ new Map();
      opts = this.opts = { ...opts, ...requiredOptions(opts) };
      const { es5, lines } = this.opts.code;
      this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
      this.logger = getLogger(opts.logger);
      const formatOpt = opts.validateFormats;
      opts.validateFormats = false;
      this.RULES = (0, rules_12.getRules)();
      checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
      checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
      this._metaOpts = getMetaSchemaOptions.call(this);
      if (opts.formats)
        addInitialFormats.call(this);
      this._addVocabularies();
      this._addDefaultMetaSchema();
      if (opts.keywords)
        addInitialKeywords.call(this, opts.keywords);
      if (typeof opts.meta == "object")
        this.addMetaSchema(opts.meta);
      addInitialSchemas.call(this);
      opts.validateFormats = formatOpt;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data, meta, schemaId } = this.opts;
      let _dataRefSchema = $dataRefSchema;
      if (schemaId === "id") {
        _dataRefSchema = { ...$dataRefSchema };
        _dataRefSchema.id = _dataRefSchema.$id;
        delete _dataRefSchema.$id;
      }
      if (meta && $data)
        this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
    }
    defaultMeta() {
      const { meta, schemaId } = this.opts;
      return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
    }
    validate(schemaKeyRef, data) {
      let v;
      if (typeof schemaKeyRef == "string") {
        v = this.getSchema(schemaKeyRef);
        if (!v)
          throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
      } else {
        v = this.compile(schemaKeyRef);
      }
      const valid2 = v(data);
      if (!("$async" in v))
        this.errors = v.errors;
      return valid2;
    }
    compile(schema, _meta) {
      const sch = this._addSchema(schema, _meta);
      return sch.validate || this._compileSchemaEnv(sch);
    }
    compileAsync(schema, meta) {
      if (typeof this.opts.loadSchema != "function") {
        throw new Error("options.loadSchema should be a function");
      }
      const { loadSchema } = this.opts;
      return runCompileAsync.call(this, schema, meta);
      async function runCompileAsync(_schema, _meta) {
        await loadMetaSchema.call(this, _schema.$schema);
        const sch = this._addSchema(_schema, _meta);
        return sch.validate || _compileAsync.call(this, sch);
      }
      async function loadMetaSchema($ref) {
        if ($ref && !this.getSchema($ref)) {
          await runCompileAsync.call(this, { $ref }, true);
        }
      }
      async function _compileAsync(sch) {
        try {
          return this._compileSchemaEnv(sch);
        } catch (e) {
          if (!(e instanceof ref_error_12.default))
            throw e;
          checkLoaded.call(this, e);
          await loadMissingSchema.call(this, e.missingSchema);
          return _compileAsync.call(this, sch);
        }
      }
      function checkLoaded({ missingSchema: ref2, missingRef }) {
        if (this.refs[ref2]) {
          throw new Error(`AnySchema ${ref2} is loaded but ${missingRef} cannot be resolved`);
        }
      }
      async function loadMissingSchema(ref2) {
        const _schema = await _loadSchema.call(this, ref2);
        if (!this.refs[ref2])
          await loadMetaSchema.call(this, _schema.$schema);
        if (!this.refs[ref2])
          this.addSchema(_schema, ref2, meta);
      }
      async function _loadSchema(ref2) {
        const p = this._loading[ref2];
        if (p)
          return p;
        try {
          return await (this._loading[ref2] = loadSchema(ref2));
        } finally {
          delete this._loading[ref2];
        }
      }
    }
    // Adds schema to the instance
    addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
      if (Array.isArray(schema)) {
        for (const sch of schema)
          this.addSchema(sch, void 0, _meta, _validateSchema);
        return this;
      }
      let id2;
      if (typeof schema === "object") {
        const { schemaId } = this.opts;
        id2 = schema[schemaId];
        if (id2 !== void 0 && typeof id2 != "string") {
          throw new Error(`schema ${schemaId} must be string`);
        }
      }
      key = (0, resolve_12.normalizeId)(key || id2);
      this._checkUnique(key);
      this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
      return this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
      this.addSchema(schema, key, true, _validateSchema);
      return this;
    }
    //  Validate schema against its meta-schema
    validateSchema(schema, throwOrLogError) {
      if (typeof schema == "boolean")
        return true;
      let $schema2;
      $schema2 = schema.$schema;
      if ($schema2 !== void 0 && typeof $schema2 != "string") {
        throw new Error("$schema must be a string");
      }
      $schema2 = $schema2 || this.opts.defaultMeta || this.defaultMeta();
      if (!$schema2) {
        this.logger.warn("meta-schema not available");
        this.errors = null;
        return true;
      }
      const valid2 = this.validate($schema2, schema);
      if (!valid2 && throwOrLogError) {
        const message = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(message);
        else
          throw new Error(message);
      }
      return valid2;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(keyRef) {
      let sch;
      while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
        keyRef = sch;
      if (sch === void 0) {
        const { schemaId } = this.opts;
        const root = new compile_12.SchemaEnv({ schema: {}, schemaId });
        sch = compile_12.resolveSchema.call(this, root, keyRef);
        if (!sch)
          return;
        this.refs[keyRef] = sch;
      }
      return sch.validate || this._compileSchemaEnv(sch);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(schemaKeyRef) {
      if (schemaKeyRef instanceof RegExp) {
        this._removeAllSchemas(this.schemas, schemaKeyRef);
        this._removeAllSchemas(this.refs, schemaKeyRef);
        return this;
      }
      switch (typeof schemaKeyRef) {
        case "undefined":
          this._removeAllSchemas(this.schemas);
          this._removeAllSchemas(this.refs);
          this._cache.clear();
          return this;
        case "string": {
          const sch = getSchEnv.call(this, schemaKeyRef);
          if (typeof sch == "object")
            this._cache.delete(sch.schema);
          delete this.schemas[schemaKeyRef];
          delete this.refs[schemaKeyRef];
          return this;
        }
        case "object": {
          const cacheKey = schemaKeyRef;
          this._cache.delete(cacheKey);
          let id2 = schemaKeyRef[this.opts.schemaId];
          if (id2) {
            id2 = (0, resolve_12.normalizeId)(id2);
            delete this.schemas[id2];
            delete this.refs[id2];
          }
          return this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(definitions2) {
      for (const def2 of definitions2)
        this.addKeyword(def2);
      return this;
    }
    addKeyword(kwdOrDef, def2) {
      let keyword2;
      if (typeof kwdOrDef == "string") {
        keyword2 = kwdOrDef;
        if (typeof def2 == "object") {
          this.logger.warn("these parameters are deprecated, see docs for addKeyword");
          def2.keyword = keyword2;
        }
      } else if (typeof kwdOrDef == "object" && def2 === void 0) {
        def2 = kwdOrDef;
        keyword2 = def2.keyword;
        if (Array.isArray(keyword2) && !keyword2.length) {
          throw new Error("addKeywords: keyword must be string or non-empty array");
        }
      } else {
        throw new Error("invalid addKeywords parameters");
      }
      checkKeyword.call(this, keyword2, def2);
      if (!def2) {
        (0, util_12.eachItem)(keyword2, (kwd) => addRule.call(this, kwd));
        return this;
      }
      keywordMetaschema.call(this, def2);
      const definition = {
        ...def2,
        type: (0, dataType_12.getJSONTypes)(def2.type),
        schemaType: (0, dataType_12.getJSONTypes)(def2.schemaType)
      };
      (0, util_12.eachItem)(keyword2, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t2) => addRule.call(this, k, definition, t2)));
      return this;
    }
    getKeyword(keyword2) {
      const rule = this.RULES.all[keyword2];
      return typeof rule == "object" ? rule.definition : !!rule;
    }
    // Remove keyword
    removeKeyword(keyword2) {
      const { RULES } = this;
      delete RULES.keywords[keyword2];
      delete RULES.all[keyword2];
      for (const group of RULES.rules) {
        const i = group.rules.findIndex((rule) => rule.keyword === keyword2);
        if (i >= 0)
          group.rules.splice(i, 1);
      }
      return this;
    }
    // Add format
    addFormat(name, format2) {
      if (typeof format2 == "string")
        format2 = new RegExp(format2);
      this.formats[name] = format2;
      return this;
    }
    errorsText(errors2 = this.errors, { separator = ", ", dataVar = "data" } = {}) {
      if (!errors2 || errors2.length === 0)
        return "No errors";
      return errors2.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
    }
    $dataMetaSchema(metaSchema, keywordsJsonPointers) {
      const rules2 = this.RULES.all;
      metaSchema = JSON.parse(JSON.stringify(metaSchema));
      for (const jsonPointer of keywordsJsonPointers) {
        const segments = jsonPointer.split("/").slice(1);
        let keywords = metaSchema;
        for (const seg of segments)
          keywords = keywords[seg];
        for (const key in rules2) {
          const rule = rules2[key];
          if (typeof rule != "object")
            continue;
          const { $data } = rule.definition;
          const schema = keywords[key];
          if ($data && schema)
            keywords[key] = schemaOrData(schema);
        }
      }
      return metaSchema;
    }
    _removeAllSchemas(schemas, regex) {
      for (const keyRef in schemas) {
        const sch = schemas[keyRef];
        if (!regex || regex.test(keyRef)) {
          if (typeof sch == "string") {
            delete schemas[keyRef];
          } else if (sch && !sch.meta) {
            this._cache.delete(sch.schema);
            delete schemas[keyRef];
          }
        }
      }
    }
    _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
      let id2;
      const { schemaId } = this.opts;
      if (typeof schema == "object") {
        id2 = schema[schemaId];
      } else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        else if (typeof schema != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let sch = this._cache.get(schema);
      if (sch !== void 0)
        return sch;
      baseId = (0, resolve_12.normalizeId)(id2 || baseId);
      const localRefs = resolve_12.getSchemaRefs.call(this, schema, baseId);
      sch = new compile_12.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
      this._cache.set(sch.schema, sch);
      if (addSchema && !baseId.startsWith("#")) {
        if (baseId)
          this._checkUnique(baseId);
        this.refs[baseId] = sch;
      }
      if (validateSchema)
        this.validateSchema(schema, true);
      return sch;
    }
    _checkUnique(id2) {
      if (this.schemas[id2] || this.refs[id2]) {
        throw new Error(`schema with key or id "${id2}" already exists`);
      }
    }
    _compileSchemaEnv(sch) {
      if (sch.meta)
        this._compileMetaSchema(sch);
      else
        compile_12.compileSchema.call(this, sch);
      if (!sch.validate)
        throw new Error("ajv implementation error");
      return sch.validate;
    }
    _compileMetaSchema(sch) {
      const currentOpts = this.opts;
      this.opts = this._metaOpts;
      try {
        compile_12.compileSchema.call(this, sch);
      } finally {
        this.opts = currentOpts;
      }
    }
  }
  Ajv.ValidationError = validation_error_12.default;
  Ajv.MissingRefError = ref_error_12.default;
  exports$1.default = Ajv;
  function checkOptions(checkOpts, options, msg, log = "error") {
    for (const key in checkOpts) {
      const opt = key;
      if (opt in options)
        this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
    }
  }
  function getSchEnv(keyRef) {
    keyRef = (0, resolve_12.normalizeId)(keyRef);
    return this.schemas[keyRef] || this.refs[keyRef];
  }
  function addInitialSchemas() {
    const optsSchemas = this.opts.schemas;
    if (!optsSchemas)
      return;
    if (Array.isArray(optsSchemas))
      this.addSchema(optsSchemas);
    else
      for (const key in optsSchemas)
        this.addSchema(optsSchemas[key], key);
  }
  function addInitialFormats() {
    for (const name in this.opts.formats) {
      const format2 = this.opts.formats[name];
      if (format2)
        this.addFormat(name, format2);
    }
  }
  function addInitialKeywords(defs) {
    if (Array.isArray(defs)) {
      this.addVocabulary(defs);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const keyword2 in defs) {
      const def2 = defs[keyword2];
      if (!def2.keyword)
        def2.keyword = keyword2;
      this.addKeyword(def2);
    }
  }
  function getMetaSchemaOptions() {
    const metaOpts = { ...this.opts };
    for (const opt of META_IGNORE_OPTIONS)
      delete metaOpts[opt];
    return metaOpts;
  }
  const noLogs = { log() {
  }, warn() {
  }, error() {
  } };
  function getLogger(logger) {
    if (logger === false)
      return noLogs;
    if (logger === void 0)
      return console;
    if (logger.log && logger.warn && logger.error)
      return logger;
    throw new Error("logger must implement log, warn and error methods");
  }
  const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
  function checkKeyword(keyword2, def2) {
    const { RULES } = this;
    (0, util_12.eachItem)(keyword2, (kwd) => {
      if (RULES.keywords[kwd])
        throw new Error(`Keyword ${kwd} is already defined`);
      if (!KEYWORD_NAME.test(kwd))
        throw new Error(`Keyword ${kwd} has invalid name`);
    });
    if (!def2)
      return;
    if (def2.$data && !("code" in def2 || "validate" in def2)) {
      throw new Error('$data keyword must have "code" or "validate" function');
    }
  }
  function addRule(keyword2, definition, dataType2) {
    var _a;
    const post = definition === null || definition === void 0 ? void 0 : definition.post;
    if (dataType2 && post)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES } = this;
    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t2 }) => t2 === dataType2);
    if (!ruleGroup) {
      ruleGroup = { type: dataType2, rules: [] };
      RULES.rules.push(ruleGroup);
    }
    RULES.keywords[keyword2] = true;
    if (!definition)
      return;
    const rule = {
      keyword: keyword2,
      definition: {
        ...definition,
        type: (0, dataType_12.getJSONTypes)(definition.type),
        schemaType: (0, dataType_12.getJSONTypes)(definition.schemaType)
      }
    };
    if (definition.before)
      addBeforeRule.call(this, ruleGroup, rule, definition.before);
    else
      ruleGroup.rules.push(rule);
    RULES.all[keyword2] = rule;
    (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
  }
  function addBeforeRule(ruleGroup, rule, before) {
    const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
    if (i >= 0) {
      ruleGroup.rules.splice(i, 0, rule);
    } else {
      ruleGroup.rules.push(rule);
      this.logger.warn(`rule ${before} is not defined`);
    }
  }
  function keywordMetaschema(def2) {
    let { metaSchema } = def2;
    if (metaSchema === void 0)
      return;
    if (def2.$data && this.opts.$data)
      metaSchema = schemaOrData(metaSchema);
    def2.validateSchema = this.compile(metaSchema, true);
  }
  const $dataRef = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function schemaOrData(schema) {
    return { anyOf: [schema, $dataRef] };
  }
})(core$2);
var draft7 = {};
var core$1 = {};
var id = {};
Object.defineProperty(id, "__esModule", { value: true });
const def$s = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
id.default = def$s;
var ref = {};
Object.defineProperty(ref, "__esModule", { value: true });
ref.callRef = ref.getValidate = void 0;
const ref_error_1$1 = ref_error;
const code_1$8 = code;
const codegen_1$l = codegen;
const names_1$1 = names$1;
const compile_1$1 = compile;
const util_1$j = util;
const def$r = {
  keyword: "$ref",
  schemaType: "string",
  code(cxt) {
    const { gen, schema: $ref, it } = cxt;
    const { baseId, schemaEnv: env2, validateName, opts, self: self2 } = it;
    const { root } = env2;
    if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
      return callRootRef();
    const schOrEnv = compile_1$1.resolveRef.call(self2, root, baseId, $ref);
    if (schOrEnv === void 0)
      throw new ref_error_1$1.default(it.opts.uriResolver, baseId, $ref);
    if (schOrEnv instanceof compile_1$1.SchemaEnv)
      return callValidate(schOrEnv);
    return inlineRefSchema(schOrEnv);
    function callRootRef() {
      if (env2 === root)
        return callRef(cxt, validateName, env2, env2.$async);
      const rootName = gen.scopeValue("root", { ref: root });
      return callRef(cxt, (0, codegen_1$l._)`${rootName}.validate`, root, root.$async);
    }
    function callValidate(sch) {
      const v = getValidate(cxt, sch);
      callRef(cxt, v, sch, sch.$async);
    }
    function inlineRefSchema(sch) {
      const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1$l.stringify)(sch) } : { ref: sch });
      const valid2 = gen.name("valid");
      const schCxt = cxt.subschema({
        schema: sch,
        dataTypes: [],
        schemaPath: codegen_1$l.nil,
        topSchemaRef: schName,
        errSchemaPath: $ref
      }, valid2);
      cxt.mergeEvaluated(schCxt);
      cxt.ok(valid2);
    }
  }
};
function getValidate(cxt, sch) {
  const { gen } = cxt;
  return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1$l._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
}
ref.getValidate = getValidate;
function callRef(cxt, v, sch, $async) {
  const { gen, it } = cxt;
  const { allErrors, schemaEnv: env2, opts } = it;
  const passCxt = opts.passContext ? names_1$1.default.this : codegen_1$l.nil;
  if ($async)
    callAsyncRef();
  else
    callSyncRef();
  function callAsyncRef() {
    if (!env2.$async)
      throw new Error("async schema referenced by sync schema");
    const valid2 = gen.let("valid");
    gen.try(() => {
      gen.code((0, codegen_1$l._)`await ${(0, code_1$8.callValidateCode)(cxt, v, passCxt)}`);
      addEvaluatedFrom(v);
      if (!allErrors)
        gen.assign(valid2, true);
    }, (e) => {
      gen.if((0, codegen_1$l._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
      addErrorsFrom(e);
      if (!allErrors)
        gen.assign(valid2, false);
    });
    cxt.ok(valid2);
  }
  function callSyncRef() {
    cxt.result((0, code_1$8.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
  }
  function addErrorsFrom(source2) {
    const errs = (0, codegen_1$l._)`${source2}.errors`;
    gen.assign(names_1$1.default.vErrors, (0, codegen_1$l._)`${names_1$1.default.vErrors} === null ? ${errs} : ${names_1$1.default.vErrors}.concat(${errs})`);
    gen.assign(names_1$1.default.errors, (0, codegen_1$l._)`${names_1$1.default.vErrors}.length`);
  }
  function addEvaluatedFrom(source2) {
    var _a;
    if (!it.opts.unevaluated)
      return;
    const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
    if (it.props !== true) {
      if (schEvaluated && !schEvaluated.dynamicProps) {
        if (schEvaluated.props !== void 0) {
          it.props = util_1$j.mergeEvaluated.props(gen, schEvaluated.props, it.props);
        }
      } else {
        const props = gen.var("props", (0, codegen_1$l._)`${source2}.evaluated.props`);
        it.props = util_1$j.mergeEvaluated.props(gen, props, it.props, codegen_1$l.Name);
      }
    }
    if (it.items !== true) {
      if (schEvaluated && !schEvaluated.dynamicItems) {
        if (schEvaluated.items !== void 0) {
          it.items = util_1$j.mergeEvaluated.items(gen, schEvaluated.items, it.items);
        }
      } else {
        const items2 = gen.var("items", (0, codegen_1$l._)`${source2}.evaluated.items`);
        it.items = util_1$j.mergeEvaluated.items(gen, items2, it.items, codegen_1$l.Name);
      }
    }
  }
}
ref.callRef = callRef;
ref.default = def$r;
Object.defineProperty(core$1, "__esModule", { value: true });
const id_1 = id;
const ref_1 = ref;
const core = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  id_1.default,
  ref_1.default
];
core$1.default = core;
var validation$1 = {};
var limitNumber = {};
Object.defineProperty(limitNumber, "__esModule", { value: true });
const codegen_1$k = codegen;
const ops = codegen_1$k.operators;
const KWDs = {
  maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
  minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
  exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
  exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
};
const error$i = {
  message: ({ keyword: keyword2, schemaCode }) => (0, codegen_1$k.str)`must be ${KWDs[keyword2].okStr} ${schemaCode}`,
  params: ({ keyword: keyword2, schemaCode }) => (0, codegen_1$k._)`{comparison: ${KWDs[keyword2].okStr}, limit: ${schemaCode}}`
};
const def$q = {
  keyword: Object.keys(KWDs),
  type: "number",
  schemaType: "number",
  $data: true,
  error: error$i,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    cxt.fail$data((0, codegen_1$k._)`${data} ${KWDs[keyword2].fail} ${schemaCode} || isNaN(${data})`);
  }
};
limitNumber.default = def$q;
var multipleOf = {};
Object.defineProperty(multipleOf, "__esModule", { value: true });
const codegen_1$j = codegen;
const error$h = {
  message: ({ schemaCode }) => (0, codegen_1$j.str)`must be multiple of ${schemaCode}`,
  params: ({ schemaCode }) => (0, codegen_1$j._)`{multipleOf: ${schemaCode}}`
};
const def$p = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: true,
  error: error$h,
  code(cxt) {
    const { gen, data, schemaCode, it } = cxt;
    const prec = it.opts.multipleOfPrecision;
    const res = gen.let("res");
    const invalid = prec ? (0, codegen_1$j._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1$j._)`${res} !== parseInt(${res})`;
    cxt.fail$data((0, codegen_1$j._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
  }
};
multipleOf.default = def$p;
var limitLength = {};
var ucs2length$1 = {};
Object.defineProperty(ucs2length$1, "__esModule", { value: true });
function ucs2length(str) {
  const len = str.length;
  let length = 0;
  let pos = 0;
  let value;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 55296 && value <= 56319 && pos < len) {
      value = str.charCodeAt(pos);
      if ((value & 64512) === 56320)
        pos++;
    }
  }
  return length;
}
ucs2length$1.default = ucs2length;
ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(limitLength, "__esModule", { value: true });
const codegen_1$i = codegen;
const util_1$i = util;
const ucs2length_1 = ucs2length$1;
const error$g = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxLength" ? "more" : "fewer";
    return (0, codegen_1$i.str)`must NOT have ${comp} than ${schemaCode} characters`;
  },
  params: ({ schemaCode }) => (0, codegen_1$i._)`{limit: ${schemaCode}}`
};
const def$o = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: true,
  error: error$g,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode, it } = cxt;
    const op = keyword2 === "maxLength" ? codegen_1$i.operators.GT : codegen_1$i.operators.LT;
    const len = it.opts.unicode === false ? (0, codegen_1$i._)`${data}.length` : (0, codegen_1$i._)`${(0, util_1$i.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
    cxt.fail$data((0, codegen_1$i._)`${len} ${op} ${schemaCode}`);
  }
};
limitLength.default = def$o;
var pattern = {};
Object.defineProperty(pattern, "__esModule", { value: true });
const code_1$7 = code;
const codegen_1$h = codegen;
const error$f = {
  message: ({ schemaCode }) => (0, codegen_1$h.str)`must match pattern "${schemaCode}"`,
  params: ({ schemaCode }) => (0, codegen_1$h._)`{pattern: ${schemaCode}}`
};
const def$n = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: true,
  error: error$f,
  code(cxt) {
    const { data, $data, schema, schemaCode, it } = cxt;
    const u = it.opts.unicodeRegExp ? "u" : "";
    const regExp = $data ? (0, codegen_1$h._)`(new RegExp(${schemaCode}, ${u}))` : (0, code_1$7.usePattern)(cxt, schema);
    cxt.fail$data((0, codegen_1$h._)`!${regExp}.test(${data})`);
  }
};
pattern.default = def$n;
var limitProperties = {};
Object.defineProperty(limitProperties, "__esModule", { value: true });
const codegen_1$g = codegen;
const error$e = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxProperties" ? "more" : "fewer";
    return (0, codegen_1$g.str)`must NOT have ${comp} than ${schemaCode} properties`;
  },
  params: ({ schemaCode }) => (0, codegen_1$g._)`{limit: ${schemaCode}}`
};
const def$m = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: true,
  error: error$e,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    const op = keyword2 === "maxProperties" ? codegen_1$g.operators.GT : codegen_1$g.operators.LT;
    cxt.fail$data((0, codegen_1$g._)`Object.keys(${data}).length ${op} ${schemaCode}`);
  }
};
limitProperties.default = def$m;
var required = {};
Object.defineProperty(required, "__esModule", { value: true });
const code_1$6 = code;
const codegen_1$f = codegen;
const util_1$h = util;
const error$d = {
  message: ({ params: { missingProperty } }) => (0, codegen_1$f.str)`must have required property '${missingProperty}'`,
  params: ({ params: { missingProperty } }) => (0, codegen_1$f._)`{missingProperty: ${missingProperty}}`
};
const def$l = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: true,
  error: error$d,
  code(cxt) {
    const { gen, schema, schemaCode, data, $data, it } = cxt;
    const { opts } = it;
    if (!$data && schema.length === 0)
      return;
    const useLoop = schema.length >= opts.loopRequired;
    if (it.allErrors)
      allErrorsMode();
    else
      exitOnErrorMode();
    if (opts.strictRequired) {
      const props = cxt.parentSchema.properties;
      const { definedProperties } = cxt.it;
      for (const requiredKey of schema) {
        if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
          const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
          const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
          (0, util_1$h.checkStrictMode)(it, msg, it.opts.strictRequired);
        }
      }
    }
    function allErrorsMode() {
      if (useLoop || $data) {
        cxt.block$data(codegen_1$f.nil, loopAllRequired);
      } else {
        for (const prop of schema) {
          (0, code_1$6.checkReportMissingProp)(cxt, prop);
        }
      }
    }
    function exitOnErrorMode() {
      const missing = gen.let("missing");
      if (useLoop || $data) {
        const valid2 = gen.let("valid", true);
        cxt.block$data(valid2, () => loopUntilMissing(missing, valid2));
        cxt.ok(valid2);
      } else {
        gen.if((0, code_1$6.checkMissingProp)(cxt, schema, missing));
        (0, code_1$6.reportMissingProp)(cxt, missing);
        gen.else();
      }
    }
    function loopAllRequired() {
      gen.forOf("prop", schemaCode, (prop) => {
        cxt.setParams({ missingProperty: prop });
        gen.if((0, code_1$6.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
      });
    }
    function loopUntilMissing(missing, valid2) {
      cxt.setParams({ missingProperty: missing });
      gen.forOf(missing, schemaCode, () => {
        gen.assign(valid2, (0, code_1$6.propertyInData)(gen, data, missing, opts.ownProperties));
        gen.if((0, codegen_1$f.not)(valid2), () => {
          cxt.error();
          gen.break();
        });
      }, codegen_1$f.nil);
    }
  }
};
required.default = def$l;
var limitItems = {};
Object.defineProperty(limitItems, "__esModule", { value: true });
const codegen_1$e = codegen;
const error$c = {
  message({ keyword: keyword2, schemaCode }) {
    const comp = keyword2 === "maxItems" ? "more" : "fewer";
    return (0, codegen_1$e.str)`must NOT have ${comp} than ${schemaCode} items`;
  },
  params: ({ schemaCode }) => (0, codegen_1$e._)`{limit: ${schemaCode}}`
};
const def$k = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: true,
  error: error$c,
  code(cxt) {
    const { keyword: keyword2, data, schemaCode } = cxt;
    const op = keyword2 === "maxItems" ? codegen_1$e.operators.GT : codegen_1$e.operators.LT;
    cxt.fail$data((0, codegen_1$e._)`${data}.length ${op} ${schemaCode}`);
  }
};
limitItems.default = def$k;
var uniqueItems = {};
var equal$1 = {};
Object.defineProperty(equal$1, "__esModule", { value: true });
const equal2 = fastDeepEqual;
equal2.code = 'require("ajv/dist/runtime/equal").default';
equal$1.default = equal2;
Object.defineProperty(uniqueItems, "__esModule", { value: true });
const dataType_1 = dataType;
const codegen_1$d = codegen;
const util_1$g = util;
const equal_1$2 = equal$1;
const error$b = {
  message: ({ params: { i, j } }) => (0, codegen_1$d.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
  params: ({ params: { i, j } }) => (0, codegen_1$d._)`{i: ${i}, j: ${j}}`
};
const def$j = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: true,
  error: error$b,
  code(cxt) {
    const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
    if (!$data && !schema)
      return;
    const valid2 = gen.let("valid");
    const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
    cxt.block$data(valid2, validateUniqueItems, (0, codegen_1$d._)`${schemaCode} === false`);
    cxt.ok(valid2);
    function validateUniqueItems() {
      const i = gen.let("i", (0, codegen_1$d._)`${data}.length`);
      const j = gen.let("j");
      cxt.setParams({ i, j });
      gen.assign(valid2, true);
      gen.if((0, codegen_1$d._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
    }
    function canOptimize() {
      return itemTypes.length > 0 && !itemTypes.some((t2) => t2 === "object" || t2 === "array");
    }
    function loopN(i, j) {
      const item = gen.name("item");
      const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
      const indices = gen.const("indices", (0, codegen_1$d._)`{}`);
      gen.for((0, codegen_1$d._)`;${i}--;`, () => {
        gen.let(item, (0, codegen_1$d._)`${data}[${i}]`);
        gen.if(wrongType, (0, codegen_1$d._)`continue`);
        if (itemTypes.length > 1)
          gen.if((0, codegen_1$d._)`typeof ${item} == "string"`, (0, codegen_1$d._)`${item} += "_"`);
        gen.if((0, codegen_1$d._)`typeof ${indices}[${item}] == "number"`, () => {
          gen.assign(j, (0, codegen_1$d._)`${indices}[${item}]`);
          cxt.error();
          gen.assign(valid2, false).break();
        }).code((0, codegen_1$d._)`${indices}[${item}] = ${i}`);
      });
    }
    function loopN2(i, j) {
      const eql = (0, util_1$g.useFunc)(gen, equal_1$2.default);
      const outer = gen.name("outer");
      gen.label(outer).for((0, codegen_1$d._)`;${i}--;`, () => gen.for((0, codegen_1$d._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1$d._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
        cxt.error();
        gen.assign(valid2, false).break(outer);
      })));
    }
  }
};
uniqueItems.default = def$j;
var _const = {};
Object.defineProperty(_const, "__esModule", { value: true });
const codegen_1$c = codegen;
const util_1$f = util;
const equal_1$1 = equal$1;
const error$a = {
  message: "must be equal to constant",
  params: ({ schemaCode }) => (0, codegen_1$c._)`{allowedValue: ${schemaCode}}`
};
const def$i = {
  keyword: "const",
  $data: true,
  error: error$a,
  code(cxt) {
    const { gen, data, $data, schemaCode, schema } = cxt;
    if ($data || schema && typeof schema == "object") {
      cxt.fail$data((0, codegen_1$c._)`!${(0, util_1$f.useFunc)(gen, equal_1$1.default)}(${data}, ${schemaCode})`);
    } else {
      cxt.fail((0, codegen_1$c._)`${schema} !== ${data}`);
    }
  }
};
_const.default = def$i;
var _enum = {};
Object.defineProperty(_enum, "__esModule", { value: true });
const codegen_1$b = codegen;
const util_1$e = util;
const equal_1 = equal$1;
const error$9 = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode }) => (0, codegen_1$b._)`{allowedValues: ${schemaCode}}`
};
const def$h = {
  keyword: "enum",
  schemaType: "array",
  $data: true,
  error: error$9,
  code(cxt) {
    const { gen, data, $data, schema, schemaCode, it } = cxt;
    if (!$data && schema.length === 0)
      throw new Error("enum must have non-empty array");
    const useLoop = schema.length >= it.opts.loopEnum;
    let eql;
    const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1$e.useFunc)(gen, equal_1.default);
    let valid2;
    if (useLoop || $data) {
      valid2 = gen.let("valid");
      cxt.block$data(valid2, loopEnum);
    } else {
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const vSchema = gen.const("vSchema", schemaCode);
      valid2 = (0, codegen_1$b.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
    }
    cxt.pass(valid2);
    function loopEnum() {
      gen.assign(valid2, false);
      gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1$b._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid2, true).break()));
    }
    function equalCode(vSchema, i) {
      const sch = schema[i];
      return typeof sch === "object" && sch !== null ? (0, codegen_1$b._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1$b._)`${data} === ${sch}`;
    }
  }
};
_enum.default = def$h;
Object.defineProperty(validation$1, "__esModule", { value: true });
const limitNumber_1 = limitNumber;
const multipleOf_1 = multipleOf;
const limitLength_1 = limitLength;
const pattern_1 = pattern;
const limitProperties_1 = limitProperties;
const required_1 = required;
const limitItems_1 = limitItems;
const uniqueItems_1 = uniqueItems;
const const_1 = _const;
const enum_1 = _enum;
const validation = [
  // number
  limitNumber_1.default,
  multipleOf_1.default,
  // string
  limitLength_1.default,
  pattern_1.default,
  // object
  limitProperties_1.default,
  required_1.default,
  // array
  limitItems_1.default,
  uniqueItems_1.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  const_1.default,
  enum_1.default
];
validation$1.default = validation;
var applicator = {};
var additionalItems = {};
Object.defineProperty(additionalItems, "__esModule", { value: true });
additionalItems.validateAdditionalItems = void 0;
const codegen_1$a = codegen;
const util_1$d = util;
const error$8 = {
  message: ({ params: { len } }) => (0, codegen_1$a.str)`must NOT have more than ${len} items`,
  params: ({ params: { len } }) => (0, codegen_1$a._)`{limit: ${len}}`
};
const def$g = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: error$8,
  code(cxt) {
    const { parentSchema, it } = cxt;
    const { items: items2 } = parentSchema;
    if (!Array.isArray(items2)) {
      (0, util_1$d.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    validateAdditionalItems(cxt, items2);
  }
};
function validateAdditionalItems(cxt, items2) {
  const { gen, schema, data, keyword: keyword2, it } = cxt;
  it.items = true;
  const len = gen.const("len", (0, codegen_1$a._)`${data}.length`);
  if (schema === false) {
    cxt.setParams({ len: items2.length });
    cxt.pass((0, codegen_1$a._)`${len} <= ${items2.length}`);
  } else if (typeof schema == "object" && !(0, util_1$d.alwaysValidSchema)(it, schema)) {
    const valid2 = gen.var("valid", (0, codegen_1$a._)`${len} <= ${items2.length}`);
    gen.if((0, codegen_1$a.not)(valid2), () => validateItems(valid2));
    cxt.ok(valid2);
  }
  function validateItems(valid2) {
    gen.forRange("i", items2.length, len, (i) => {
      cxt.subschema({ keyword: keyword2, dataProp: i, dataPropType: util_1$d.Type.Num }, valid2);
      if (!it.allErrors)
        gen.if((0, codegen_1$a.not)(valid2), () => gen.break());
    });
  }
}
additionalItems.validateAdditionalItems = validateAdditionalItems;
additionalItems.default = def$g;
var prefixItems = {};
var items = {};
Object.defineProperty(items, "__esModule", { value: true });
items.validateTuple = void 0;
const codegen_1$9 = codegen;
const util_1$c = util;
const code_1$5 = code;
const def$f = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(cxt) {
    const { schema, it } = cxt;
    if (Array.isArray(schema))
      return validateTuple(cxt, "additionalItems", schema);
    it.items = true;
    if ((0, util_1$c.alwaysValidSchema)(it, schema))
      return;
    cxt.ok((0, code_1$5.validateArray)(cxt));
  }
};
function validateTuple(cxt, extraItems, schArr = cxt.schema) {
  const { gen, parentSchema, data, keyword: keyword2, it } = cxt;
  checkStrictTuple(parentSchema);
  if (it.opts.unevaluated && schArr.length && it.items !== true) {
    it.items = util_1$c.mergeEvaluated.items(gen, schArr.length, it.items);
  }
  const valid2 = gen.name("valid");
  const len = gen.const("len", (0, codegen_1$9._)`${data}.length`);
  schArr.forEach((sch, i) => {
    if ((0, util_1$c.alwaysValidSchema)(it, sch))
      return;
    gen.if((0, codegen_1$9._)`${len} > ${i}`, () => cxt.subschema({
      keyword: keyword2,
      schemaProp: i,
      dataProp: i
    }, valid2));
    cxt.ok(valid2);
  });
  function checkStrictTuple(sch) {
    const { opts, errSchemaPath } = it;
    const l = schArr.length;
    const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
    if (opts.strictTuples && !fullTuple) {
      const msg = `"${keyword2}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
      (0, util_1$c.checkStrictMode)(it, msg, opts.strictTuples);
    }
  }
}
items.validateTuple = validateTuple;
items.default = def$f;
Object.defineProperty(prefixItems, "__esModule", { value: true });
const items_1$1 = items;
const def$e = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (cxt) => (0, items_1$1.validateTuple)(cxt, "items")
};
prefixItems.default = def$e;
var items2020 = {};
Object.defineProperty(items2020, "__esModule", { value: true });
const codegen_1$8 = codegen;
const util_1$b = util;
const code_1$4 = code;
const additionalItems_1$1 = additionalItems;
const error$7 = {
  message: ({ params: { len } }) => (0, codegen_1$8.str)`must NOT have more than ${len} items`,
  params: ({ params: { len } }) => (0, codegen_1$8._)`{limit: ${len}}`
};
const def$d = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: error$7,
  code(cxt) {
    const { schema, parentSchema, it } = cxt;
    const { prefixItems: prefixItems2 } = parentSchema;
    it.items = true;
    if ((0, util_1$b.alwaysValidSchema)(it, schema))
      return;
    if (prefixItems2)
      (0, additionalItems_1$1.validateAdditionalItems)(cxt, prefixItems2);
    else
      cxt.ok((0, code_1$4.validateArray)(cxt));
  }
};
items2020.default = def$d;
var contains = {};
Object.defineProperty(contains, "__esModule", { value: true });
const codegen_1$7 = codegen;
const util_1$a = util;
const error$6 = {
  message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1$7.str)`must contain at least ${min} valid item(s)` : (0, codegen_1$7.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
  params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1$7._)`{minContains: ${min}}` : (0, codegen_1$7._)`{minContains: ${min}, maxContains: ${max}}`
};
const def$c = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: true,
  error: error$6,
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    let min;
    let max;
    const { minContains, maxContains } = parentSchema;
    if (it.opts.next) {
      min = minContains === void 0 ? 1 : minContains;
      max = maxContains;
    } else {
      min = 1;
    }
    const len = gen.const("len", (0, codegen_1$7._)`${data}.length`);
    cxt.setParams({ min, max });
    if (max === void 0 && min === 0) {
      (0, util_1$a.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
      return;
    }
    if (max !== void 0 && min > max) {
      (0, util_1$a.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
      cxt.fail();
      return;
    }
    if ((0, util_1$a.alwaysValidSchema)(it, schema)) {
      let cond = (0, codegen_1$7._)`${len} >= ${min}`;
      if (max !== void 0)
        cond = (0, codegen_1$7._)`${cond} && ${len} <= ${max}`;
      cxt.pass(cond);
      return;
    }
    it.items = true;
    const valid2 = gen.name("valid");
    if (max === void 0 && min === 1) {
      validateItems(valid2, () => gen.if(valid2, () => gen.break()));
    } else if (min === 0) {
      gen.let(valid2, true);
      if (max !== void 0)
        gen.if((0, codegen_1$7._)`${data}.length > 0`, validateItemsWithCount);
    } else {
      gen.let(valid2, false);
      validateItemsWithCount();
    }
    cxt.result(valid2, () => cxt.reset());
    function validateItemsWithCount() {
      const schValid = gen.name("_valid");
      const count = gen.let("count", 0);
      validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
    }
    function validateItems(_valid, block) {
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema({
          keyword: "contains",
          dataProp: i,
          dataPropType: util_1$a.Type.Num,
          compositeRule: true
        }, _valid);
        block();
      });
    }
    function checkLimits(count) {
      gen.code((0, codegen_1$7._)`${count}++`);
      if (max === void 0) {
        gen.if((0, codegen_1$7._)`${count} >= ${min}`, () => gen.assign(valid2, true).break());
      } else {
        gen.if((0, codegen_1$7._)`${count} > ${max}`, () => gen.assign(valid2, false).break());
        if (min === 1)
          gen.assign(valid2, true);
        else
          gen.if((0, codegen_1$7._)`${count} >= ${min}`, () => gen.assign(valid2, true));
      }
    }
  }
};
contains.default = def$c;
var dependencies = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.validateSchemaDeps = exports$1.validatePropertyDeps = exports$1.error = void 0;
  const codegen_12 = codegen;
  const util_12 = util;
  const code_12 = code;
  exports$1.error = {
    message: ({ params: { property, depsCount, deps } }) => {
      const property_ies = depsCount === 1 ? "property" : "properties";
      return (0, codegen_12.str)`must have ${property_ies} ${deps} when property ${property} is present`;
    },
    params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_12._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
    // TODO change to reference
  };
  const def2 = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: exports$1.error,
    code(cxt) {
      const [propDeps, schDeps] = splitDependencies(cxt);
      validatePropertyDeps(cxt, propDeps);
      validateSchemaDeps(cxt, schDeps);
    }
  };
  function splitDependencies({ schema }) {
    const propertyDeps = {};
    const schemaDeps = {};
    for (const key in schema) {
      if (key === "__proto__")
        continue;
      const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
      deps[key] = schema[key];
    }
    return [propertyDeps, schemaDeps];
  }
  function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
    const { gen, data, it } = cxt;
    if (Object.keys(propertyDeps).length === 0)
      return;
    const missing = gen.let("missing");
    for (const prop in propertyDeps) {
      const deps = propertyDeps[prop];
      if (deps.length === 0)
        continue;
      const hasProperty = (0, code_12.propertyInData)(gen, data, prop, it.opts.ownProperties);
      cxt.setParams({
        property: prop,
        depsCount: deps.length,
        deps: deps.join(", ")
      });
      if (it.allErrors) {
        gen.if(hasProperty, () => {
          for (const depProp of deps) {
            (0, code_12.checkReportMissingProp)(cxt, depProp);
          }
        });
      } else {
        gen.if((0, codegen_12._)`${hasProperty} && (${(0, code_12.checkMissingProp)(cxt, deps, missing)})`);
        (0, code_12.reportMissingProp)(cxt, missing);
        gen.else();
      }
    }
  }
  exports$1.validatePropertyDeps = validatePropertyDeps;
  function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
    const { gen, data, keyword: keyword2, it } = cxt;
    const valid2 = gen.name("valid");
    for (const prop in schemaDeps) {
      if ((0, util_12.alwaysValidSchema)(it, schemaDeps[prop]))
        continue;
      gen.if(
        (0, code_12.propertyInData)(gen, data, prop, it.opts.ownProperties),
        () => {
          const schCxt = cxt.subschema({ keyword: keyword2, schemaProp: prop }, valid2);
          cxt.mergeValidEvaluated(schCxt, valid2);
        },
        () => gen.var(valid2, true)
        // TODO var
      );
      cxt.ok(valid2);
    }
  }
  exports$1.validateSchemaDeps = validateSchemaDeps;
  exports$1.default = def2;
})(dependencies);
var propertyNames = {};
Object.defineProperty(propertyNames, "__esModule", { value: true });
const codegen_1$6 = codegen;
const util_1$9 = util;
const error$5 = {
  message: "property name must be valid",
  params: ({ params }) => (0, codegen_1$6._)`{propertyName: ${params.propertyName}}`
};
const def$b = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: error$5,
  code(cxt) {
    const { gen, schema, data, it } = cxt;
    if ((0, util_1$9.alwaysValidSchema)(it, schema))
      return;
    const valid2 = gen.name("valid");
    gen.forIn("key", data, (key) => {
      cxt.setParams({ propertyName: key });
      cxt.subschema({
        keyword: "propertyNames",
        data: key,
        dataTypes: ["string"],
        propertyName: key,
        compositeRule: true
      }, valid2);
      gen.if((0, codegen_1$6.not)(valid2), () => {
        cxt.error(true);
        if (!it.allErrors)
          gen.break();
      });
    });
    cxt.ok(valid2);
  }
};
propertyNames.default = def$b;
var additionalProperties = {};
Object.defineProperty(additionalProperties, "__esModule", { value: true });
const code_1$3 = code;
const codegen_1$5 = codegen;
const names_1 = names$1;
const util_1$8 = util;
const error$4 = {
  message: "must NOT have additional properties",
  params: ({ params }) => (0, codegen_1$5._)`{additionalProperty: ${params.additionalProperty}}`
};
const def$a = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: true,
  trackErrors: true,
  error: error$4,
  code(cxt) {
    const { gen, schema, parentSchema, data, errsCount, it } = cxt;
    if (!errsCount)
      throw new Error("ajv implementation error");
    const { allErrors, opts } = it;
    it.props = true;
    if (opts.removeAdditional !== "all" && (0, util_1$8.alwaysValidSchema)(it, schema))
      return;
    const props = (0, code_1$3.allSchemaProperties)(parentSchema.properties);
    const patProps = (0, code_1$3.allSchemaProperties)(parentSchema.patternProperties);
    checkAdditionalProperties();
    cxt.ok((0, codegen_1$5._)`${errsCount} === ${names_1.default.errors}`);
    function checkAdditionalProperties() {
      gen.forIn("key", data, (key) => {
        if (!props.length && !patProps.length)
          additionalPropertyCode(key);
        else
          gen.if(isAdditional(key), () => additionalPropertyCode(key));
      });
    }
    function isAdditional(key) {
      let definedProp;
      if (props.length > 8) {
        const propsSchema = (0, util_1$8.schemaRefOrVal)(it, parentSchema.properties, "properties");
        definedProp = (0, code_1$3.isOwnProperty)(gen, propsSchema, key);
      } else if (props.length) {
        definedProp = (0, codegen_1$5.or)(...props.map((p) => (0, codegen_1$5._)`${key} === ${p}`));
      } else {
        definedProp = codegen_1$5.nil;
      }
      if (patProps.length) {
        definedProp = (0, codegen_1$5.or)(definedProp, ...patProps.map((p) => (0, codegen_1$5._)`${(0, code_1$3.usePattern)(cxt, p)}.test(${key})`));
      }
      return (0, codegen_1$5.not)(definedProp);
    }
    function deleteAdditional(key) {
      gen.code((0, codegen_1$5._)`delete ${data}[${key}]`);
    }
    function additionalPropertyCode(key) {
      if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
        deleteAdditional(key);
        return;
      }
      if (schema === false) {
        cxt.setParams({ additionalProperty: key });
        cxt.error();
        if (!allErrors)
          gen.break();
        return;
      }
      if (typeof schema == "object" && !(0, util_1$8.alwaysValidSchema)(it, schema)) {
        const valid2 = gen.name("valid");
        if (opts.removeAdditional === "failing") {
          applyAdditionalSchema(key, valid2, false);
          gen.if((0, codegen_1$5.not)(valid2), () => {
            cxt.reset();
            deleteAdditional(key);
          });
        } else {
          applyAdditionalSchema(key, valid2);
          if (!allErrors)
            gen.if((0, codegen_1$5.not)(valid2), () => gen.break());
        }
      }
    }
    function applyAdditionalSchema(key, valid2, errors2) {
      const subschema2 = {
        keyword: "additionalProperties",
        dataProp: key,
        dataPropType: util_1$8.Type.Str
      };
      if (errors2 === false) {
        Object.assign(subschema2, {
          compositeRule: true,
          createErrors: false,
          allErrors: false
        });
      }
      cxt.subschema(subschema2, valid2);
    }
  }
};
additionalProperties.default = def$a;
var properties$1 = {};
Object.defineProperty(properties$1, "__esModule", { value: true });
const validate_1 = validate;
const code_1$2 = code;
const util_1$7 = util;
const additionalProperties_1$1 = additionalProperties;
const def$9 = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(cxt) {
    const { gen, schema, parentSchema, data, it } = cxt;
    if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
      additionalProperties_1$1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1$1.default, "additionalProperties"));
    }
    const allProps = (0, code_1$2.allSchemaProperties)(schema);
    for (const prop of allProps) {
      it.definedProperties.add(prop);
    }
    if (it.opts.unevaluated && allProps.length && it.props !== true) {
      it.props = util_1$7.mergeEvaluated.props(gen, (0, util_1$7.toHash)(allProps), it.props);
    }
    const properties2 = allProps.filter((p) => !(0, util_1$7.alwaysValidSchema)(it, schema[p]));
    if (properties2.length === 0)
      return;
    const valid2 = gen.name("valid");
    for (const prop of properties2) {
      if (hasDefault(prop)) {
        applyPropertySchema(prop);
      } else {
        gen.if((0, code_1$2.propertyInData)(gen, data, prop, it.opts.ownProperties));
        applyPropertySchema(prop);
        if (!it.allErrors)
          gen.else().var(valid2, true);
        gen.endIf();
      }
      cxt.it.definedProperties.add(prop);
      cxt.ok(valid2);
    }
    function hasDefault(prop) {
      return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
    }
    function applyPropertySchema(prop) {
      cxt.subschema({
        keyword: "properties",
        schemaProp: prop,
        dataProp: prop
      }, valid2);
    }
  }
};
properties$1.default = def$9;
var patternProperties = {};
Object.defineProperty(patternProperties, "__esModule", { value: true });
const code_1$1 = code;
const codegen_1$4 = codegen;
const util_1$6 = util;
const util_2 = util;
const def$8 = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(cxt) {
    const { gen, schema, data, parentSchema, it } = cxt;
    const { opts } = it;
    const patterns = (0, code_1$1.allSchemaProperties)(schema);
    const alwaysValidPatterns = patterns.filter((p) => (0, util_1$6.alwaysValidSchema)(it, schema[p]));
    if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
      return;
    }
    const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
    const valid2 = gen.name("valid");
    if (it.props !== true && !(it.props instanceof codegen_1$4.Name)) {
      it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
    }
    const { props } = it;
    validatePatternProperties();
    function validatePatternProperties() {
      for (const pat of patterns) {
        if (checkProperties)
          checkMatchingProperties(pat);
        if (it.allErrors) {
          validateProperties(pat);
        } else {
          gen.var(valid2, true);
          validateProperties(pat);
          gen.if(valid2);
        }
      }
    }
    function checkMatchingProperties(pat) {
      for (const prop in checkProperties) {
        if (new RegExp(pat).test(prop)) {
          (0, util_1$6.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
        }
      }
    }
    function validateProperties(pat) {
      gen.forIn("key", data, (key) => {
        gen.if((0, codegen_1$4._)`${(0, code_1$1.usePattern)(cxt, pat)}.test(${key})`, () => {
          const alwaysValid = alwaysValidPatterns.includes(pat);
          if (!alwaysValid) {
            cxt.subschema({
              keyword: "patternProperties",
              schemaProp: pat,
              dataProp: key,
              dataPropType: util_2.Type.Str
            }, valid2);
          }
          if (it.opts.unevaluated && props !== true) {
            gen.assign((0, codegen_1$4._)`${props}[${key}]`, true);
          } else if (!alwaysValid && !it.allErrors) {
            gen.if((0, codegen_1$4.not)(valid2), () => gen.break());
          }
        });
      });
    }
  }
};
patternProperties.default = def$8;
var not = {};
Object.defineProperty(not, "__esModule", { value: true });
const util_1$5 = util;
const def$7 = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: true,
  code(cxt) {
    const { gen, schema, it } = cxt;
    if ((0, util_1$5.alwaysValidSchema)(it, schema)) {
      cxt.fail();
      return;
    }
    const valid2 = gen.name("valid");
    cxt.subschema({
      keyword: "not",
      compositeRule: true,
      createErrors: false,
      allErrors: false
    }, valid2);
    cxt.failResult(valid2, () => cxt.reset(), () => cxt.error());
  },
  error: { message: "must NOT be valid" }
};
not.default = def$7;
var anyOf = {};
Object.defineProperty(anyOf, "__esModule", { value: true });
const code_1 = code;
const def$6 = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: true,
  code: code_1.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
anyOf.default = def$6;
var oneOf = {};
Object.defineProperty(oneOf, "__esModule", { value: true });
const codegen_1$3 = codegen;
const util_1$4 = util;
const error$3 = {
  message: "must match exactly one schema in oneOf",
  params: ({ params }) => (0, codegen_1$3._)`{passingSchemas: ${params.passing}}`
};
const def$5 = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: true,
  error: error$3,
  code(cxt) {
    const { gen, schema, parentSchema, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    if (it.opts.discriminator && parentSchema.discriminator)
      return;
    const schArr = schema;
    const valid2 = gen.let("valid", false);
    const passing = gen.let("passing", null);
    const schValid = gen.name("_valid");
    cxt.setParams({ passing });
    gen.block(validateOneOf);
    cxt.result(valid2, () => cxt.reset(), () => cxt.error(true));
    function validateOneOf() {
      schArr.forEach((sch, i) => {
        let schCxt;
        if ((0, util_1$4.alwaysValidSchema)(it, sch)) {
          gen.var(schValid, true);
        } else {
          schCxt = cxt.subschema({
            keyword: "oneOf",
            schemaProp: i,
            compositeRule: true
          }, schValid);
        }
        if (i > 0) {
          gen.if((0, codegen_1$3._)`${schValid} && ${valid2}`).assign(valid2, false).assign(passing, (0, codegen_1$3._)`[${passing}, ${i}]`).else();
        }
        gen.if(schValid, () => {
          gen.assign(valid2, true);
          gen.assign(passing, i);
          if (schCxt)
            cxt.mergeEvaluated(schCxt, codegen_1$3.Name);
        });
      });
    }
  }
};
oneOf.default = def$5;
var allOf = {};
Object.defineProperty(allOf, "__esModule", { value: true });
const util_1$3 = util;
const def$4 = {
  keyword: "allOf",
  schemaType: "array",
  code(cxt) {
    const { gen, schema, it } = cxt;
    if (!Array.isArray(schema))
      throw new Error("ajv implementation error");
    const valid2 = gen.name("valid");
    schema.forEach((sch, i) => {
      if ((0, util_1$3.alwaysValidSchema)(it, sch))
        return;
      const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid2);
      cxt.ok(valid2);
      cxt.mergeEvaluated(schCxt);
    });
  }
};
allOf.default = def$4;
var _if = {};
Object.defineProperty(_if, "__esModule", { value: true });
const codegen_1$2 = codegen;
const util_1$2 = util;
const error$2 = {
  message: ({ params }) => (0, codegen_1$2.str)`must match "${params.ifClause}" schema`,
  params: ({ params }) => (0, codegen_1$2._)`{failingKeyword: ${params.ifClause}}`
};
const def$3 = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: true,
  error: error$2,
  code(cxt) {
    const { gen, parentSchema, it } = cxt;
    if (parentSchema.then === void 0 && parentSchema.else === void 0) {
      (0, util_1$2.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
    }
    const hasThen = hasSchema(it, "then");
    const hasElse = hasSchema(it, "else");
    if (!hasThen && !hasElse)
      return;
    const valid2 = gen.let("valid", true);
    const schValid = gen.name("_valid");
    validateIf();
    cxt.reset();
    if (hasThen && hasElse) {
      const ifClause = gen.let("ifClause");
      cxt.setParams({ ifClause });
      gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
    } else if (hasThen) {
      gen.if(schValid, validateClause("then"));
    } else {
      gen.if((0, codegen_1$2.not)(schValid), validateClause("else"));
    }
    cxt.pass(valid2, () => cxt.error(true));
    function validateIf() {
      const schCxt = cxt.subschema({
        keyword: "if",
        compositeRule: true,
        createErrors: false,
        allErrors: false
      }, schValid);
      cxt.mergeEvaluated(schCxt);
    }
    function validateClause(keyword2, ifClause) {
      return () => {
        const schCxt = cxt.subschema({ keyword: keyword2 }, schValid);
        gen.assign(valid2, schValid);
        cxt.mergeValidEvaluated(schCxt, valid2);
        if (ifClause)
          gen.assign(ifClause, (0, codegen_1$2._)`${keyword2}`);
        else
          cxt.setParams({ ifClause: keyword2 });
      };
    }
  }
};
function hasSchema(it, keyword2) {
  const schema = it.schema[keyword2];
  return schema !== void 0 && !(0, util_1$2.alwaysValidSchema)(it, schema);
}
_if.default = def$3;
var thenElse = {};
Object.defineProperty(thenElse, "__esModule", { value: true });
const util_1$1 = util;
const def$2 = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: keyword2, parentSchema, it }) {
    if (parentSchema.if === void 0)
      (0, util_1$1.checkStrictMode)(it, `"${keyword2}" without "if" is ignored`);
  }
};
thenElse.default = def$2;
Object.defineProperty(applicator, "__esModule", { value: true });
const additionalItems_1 = additionalItems;
const prefixItems_1 = prefixItems;
const items_1 = items;
const items2020_1 = items2020;
const contains_1 = contains;
const dependencies_1 = dependencies;
const propertyNames_1 = propertyNames;
const additionalProperties_1 = additionalProperties;
const properties_1 = properties$1;
const patternProperties_1 = patternProperties;
const not_1 = not;
const anyOf_1 = anyOf;
const oneOf_1 = oneOf;
const allOf_1 = allOf;
const if_1 = _if;
const thenElse_1 = thenElse;
function getApplicator(draft2020 = false) {
  const applicator2 = [
    // any
    not_1.default,
    anyOf_1.default,
    oneOf_1.default,
    allOf_1.default,
    if_1.default,
    thenElse_1.default,
    // object
    propertyNames_1.default,
    additionalProperties_1.default,
    dependencies_1.default,
    properties_1.default,
    patternProperties_1.default
  ];
  if (draft2020)
    applicator2.push(prefixItems_1.default, items2020_1.default);
  else
    applicator2.push(additionalItems_1.default, items_1.default);
  applicator2.push(contains_1.default);
  return applicator2;
}
applicator.default = getApplicator;
var format$2 = {};
var format$1 = {};
Object.defineProperty(format$1, "__esModule", { value: true });
const codegen_1$1 = codegen;
const error$1 = {
  message: ({ schemaCode }) => (0, codegen_1$1.str)`must match format "${schemaCode}"`,
  params: ({ schemaCode }) => (0, codegen_1$1._)`{format: ${schemaCode}}`
};
const def$1 = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: true,
  error: error$1,
  code(cxt, ruleType) {
    const { gen, data, $data, schema, schemaCode, it } = cxt;
    const { opts, errSchemaPath, schemaEnv, self: self2 } = it;
    if (!opts.validateFormats)
      return;
    if ($data)
      validate$DataFormat();
    else
      validateFormat();
    function validate$DataFormat() {
      const fmts = gen.scopeValue("formats", {
        ref: self2.formats,
        code: opts.code.formats
      });
      const fDef = gen.const("fDef", (0, codegen_1$1._)`${fmts}[${schemaCode}]`);
      const fType = gen.let("fType");
      const format2 = gen.let("format");
      gen.if((0, codegen_1$1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1$1._)`${fDef}.type || "string"`).assign(format2, (0, codegen_1$1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1$1._)`"string"`).assign(format2, fDef));
      cxt.fail$data((0, codegen_1$1.or)(unknownFmt(), invalidFmt()));
      function unknownFmt() {
        if (opts.strictSchema === false)
          return codegen_1$1.nil;
        return (0, codegen_1$1._)`${schemaCode} && !${format2}`;
      }
      function invalidFmt() {
        const callFormat = schemaEnv.$async ? (0, codegen_1$1._)`(${fDef}.async ? await ${format2}(${data}) : ${format2}(${data}))` : (0, codegen_1$1._)`${format2}(${data})`;
        const validData = (0, codegen_1$1._)`(typeof ${format2} == "function" ? ${callFormat} : ${format2}.test(${data}))`;
        return (0, codegen_1$1._)`${format2} && ${format2} !== true && ${fType} === ${ruleType} && !${validData}`;
      }
    }
    function validateFormat() {
      const formatDef = self2.formats[schema];
      if (!formatDef) {
        unknownFormat();
        return;
      }
      if (formatDef === true)
        return;
      const [fmtType, format2, fmtRef] = getFormat(formatDef);
      if (fmtType === ruleType)
        cxt.pass(validCondition());
      function unknownFormat() {
        if (opts.strictSchema === false) {
          self2.logger.warn(unknownMsg());
          return;
        }
        throw new Error(unknownMsg());
        function unknownMsg() {
          return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
        }
      }
      function getFormat(fmtDef) {
        const code2 = fmtDef instanceof RegExp ? (0, codegen_1$1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1$1._)`${opts.code.formats}${(0, codegen_1$1.getProperty)(schema)}` : void 0;
        const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code: code2 });
        if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
          return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1$1._)`${fmt}.validate`];
        }
        return ["string", fmtDef, fmt];
      }
      function validCondition() {
        if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
          if (!schemaEnv.$async)
            throw new Error("async format in sync schema");
          return (0, codegen_1$1._)`await ${fmtRef}(${data})`;
        }
        return typeof format2 == "function" ? (0, codegen_1$1._)`${fmtRef}(${data})` : (0, codegen_1$1._)`${fmtRef}.test(${data})`;
      }
    }
  }
};
format$1.default = def$1;
Object.defineProperty(format$2, "__esModule", { value: true });
const format_1$1 = format$1;
const format = [format_1$1.default];
format$2.default = format;
var metadata = {};
Object.defineProperty(metadata, "__esModule", { value: true });
metadata.contentVocabulary = metadata.metadataVocabulary = void 0;
metadata.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
metadata.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(draft7, "__esModule", { value: true });
const core_1 = core$1;
const validation_1 = validation$1;
const applicator_1 = applicator;
const format_1 = format$2;
const metadata_1 = metadata;
const draft7Vocabularies = [
  core_1.default,
  validation_1.default,
  (0, applicator_1.default)(),
  format_1.default,
  metadata_1.metadataVocabulary,
  metadata_1.contentVocabulary
];
draft7.default = draft7Vocabularies;
var discriminator = {};
var types = {};
Object.defineProperty(types, "__esModule", { value: true });
types.DiscrError = void 0;
var DiscrError;
(function(DiscrError2) {
  DiscrError2["Tag"] = "tag";
  DiscrError2["Mapping"] = "mapping";
})(DiscrError || (types.DiscrError = DiscrError = {}));
Object.defineProperty(discriminator, "__esModule", { value: true });
const codegen_1 = codegen;
const types_1 = types;
const compile_1 = compile;
const ref_error_1 = ref_error;
const util_1 = util;
const error = {
  message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
  params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
};
const def = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error,
  code(cxt) {
    const { gen, data, schema, parentSchema, it } = cxt;
    const { oneOf: oneOf2 } = parentSchema;
    if (!it.opts.discriminator) {
      throw new Error("discriminator: requires discriminator option");
    }
    const tagName = schema.propertyName;
    if (typeof tagName != "string")
      throw new Error("discriminator: requires propertyName");
    if (schema.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!oneOf2)
      throw new Error("discriminator: requires oneOf keyword");
    const valid2 = gen.let("valid", false);
    const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
    gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
    cxt.ok(valid2);
    function validateMapping() {
      const mapping = getMapping();
      gen.if(false);
      for (const tagValue in mapping) {
        gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
        gen.assign(valid2, applyTagSchema(mapping[tagValue]));
      }
      gen.else();
      cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
      gen.endIf();
    }
    function applyTagSchema(schemaProp) {
      const _valid = gen.name("valid");
      const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
      cxt.mergeEvaluated(schCxt, codegen_1.Name);
      return _valid;
    }
    function getMapping() {
      var _a;
      const oneOfMapping = {};
      const topRequired = hasRequired(parentSchema);
      let tagRequired = true;
      for (let i = 0; i < oneOf2.length; i++) {
        let sch = oneOf2[i];
        if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
          const ref2 = sch.$ref;
          sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref2);
          if (sch instanceof compile_1.SchemaEnv)
            sch = sch.schema;
          if (sch === void 0)
            throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref2);
        }
        const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
        if (typeof propSch != "object") {
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
        }
        tagRequired = tagRequired && (topRequired || hasRequired(sch));
        addMappings(propSch, i);
      }
      if (!tagRequired)
        throw new Error(`discriminator: "${tagName}" must be required`);
      return oneOfMapping;
      function hasRequired({ required: required2 }) {
        return Array.isArray(required2) && required2.includes(tagName);
      }
      function addMappings(sch, i) {
        if (sch.const) {
          addMapping(sch.const, i);
        } else if (sch.enum) {
          for (const tagValue of sch.enum) {
            addMapping(tagValue, i);
          }
        } else {
          throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
        }
      }
      function addMapping(tagValue, i) {
        if (typeof tagValue != "string" || tagValue in oneOfMapping) {
          throw new Error(`discriminator: "${tagName}" values must be unique strings`);
        }
        oneOfMapping[tagValue] = i;
      }
    }
  }
};
discriminator.default = def;
const $schema = "http://json-schema.org/draft-07/schema#";
const $id = "http://json-schema.org/draft-07/schema#";
const title = "Core schema meta-schema";
const definitions = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $ref: "#"
    }
  },
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    allOf: [
      {
        $ref: "#/definitions/nonNegativeInteger"
      },
      {
        "default": 0
      }
    ]
  },
  simpleTypes: {
    "enum": [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: true,
    "default": []
  }
};
const type = [
  "object",
  "boolean"
];
const properties = {
  $id: {
    type: "string",
    format: "uri-reference"
  },
  $schema: {
    type: "string",
    format: "uri"
  },
  $ref: {
    type: "string",
    format: "uri-reference"
  },
  $comment: {
    type: "string"
  },
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  "default": true,
  readOnly: {
    type: "boolean",
    "default": false
  },
  examples: {
    type: "array",
    items: true
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  additionalItems: {
    $ref: "#"
  },
  items: {
    anyOf: [
      {
        $ref: "#"
      },
      {
        $ref: "#/definitions/schemaArray"
      }
    ],
    "default": true
  },
  maxItems: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    "default": false
  },
  contains: {
    $ref: "#"
  },
  maxProperties: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/definitions/stringArray"
  },
  additionalProperties: {
    $ref: "#"
  },
  definitions: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    "default": {}
  },
  properties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    "default": {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    propertyNames: {
      format: "regex"
    },
    "default": {}
  },
  dependencies: {
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $ref: "#"
        },
        {
          $ref: "#/definitions/stringArray"
        }
      ]
    }
  },
  propertyNames: {
    $ref: "#"
  },
  "const": true,
  "enum": {
    type: "array",
    items: true,
    minItems: 1,
    uniqueItems: true
  },
  type: {
    anyOf: [
      {
        $ref: "#/definitions/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/definitions/simpleTypes"
        },
        minItems: 1,
        uniqueItems: true
      }
    ]
  },
  format: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentEncoding: {
    type: "string"
  },
  "if": {
    $ref: "#"
  },
  then: {
    $ref: "#"
  },
  "else": {
    $ref: "#"
  },
  allOf: {
    $ref: "#/definitions/schemaArray"
  },
  anyOf: {
    $ref: "#/definitions/schemaArray"
  },
  oneOf: {
    $ref: "#/definitions/schemaArray"
  },
  not: {
    $ref: "#"
  }
};
const require$$3 = {
  $schema,
  $id,
  title,
  definitions,
  type,
  properties,
  "default": true
};
(function(module, exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.MissingRefError = exports$1.ValidationError = exports$1.CodeGen = exports$1.Name = exports$1.nil = exports$1.stringify = exports$1.str = exports$1._ = exports$1.KeywordCxt = exports$1.Ajv = void 0;
  const core_12 = core$2;
  const draft7_1 = draft7;
  const discriminator_1 = discriminator;
  const draft7MetaSchema = require$$3;
  const META_SUPPORT_DATA = ["/properties"];
  const META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
  class Ajv extends core_12.default {
    _addVocabularies() {
      super._addVocabularies();
      draft7_1.default.forEach((v) => this.addVocabulary(v));
      if (this.opts.discriminator)
        this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      if (!this.opts.meta)
        return;
      const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
      this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
    }
  }
  exports$1.Ajv = Ajv;
  module.exports = exports$1 = Ajv;
  module.exports.Ajv = Ajv;
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.default = Ajv;
  var validate_12 = validate;
  Object.defineProperty(exports$1, "KeywordCxt", { enumerable: true, get: function() {
    return validate_12.KeywordCxt;
  } });
  var codegen_12 = codegen;
  Object.defineProperty(exports$1, "_", { enumerable: true, get: function() {
    return codegen_12._;
  } });
  Object.defineProperty(exports$1, "str", { enumerable: true, get: function() {
    return codegen_12.str;
  } });
  Object.defineProperty(exports$1, "stringify", { enumerable: true, get: function() {
    return codegen_12.stringify;
  } });
  Object.defineProperty(exports$1, "nil", { enumerable: true, get: function() {
    return codegen_12.nil;
  } });
  Object.defineProperty(exports$1, "Name", { enumerable: true, get: function() {
    return codegen_12.Name;
  } });
  Object.defineProperty(exports$1, "CodeGen", { enumerable: true, get: function() {
    return codegen_12.CodeGen;
  } });
  var validation_error_12 = validation_error;
  Object.defineProperty(exports$1, "ValidationError", { enumerable: true, get: function() {
    return validation_error_12.default;
  } });
  var ref_error_12 = ref_error;
  Object.defineProperty(exports$1, "MissingRefError", { enumerable: true, get: function() {
    return ref_error_12.default;
  } });
})(ajv, ajv.exports);
var ajvExports = ajv.exports;
var dist = { exports: {} };
var formats = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.formatNames = exports$1.fastFormats = exports$1.fullFormats = void 0;
  function fmtDef(validate2, compare2) {
    return { validate: validate2, compare: compare2 };
  }
  exports$1.fullFormats = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: fmtDef(date, compareDate),
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: fmtDef(time, compareTime),
    "date-time": fmtDef(date_time, compareDateTime),
    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri: uri2,
    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    // uri-template: https://tools.ietf.org/html/rfc6570
    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    // For the source: https://gist.github.com/dperini/729294
    // For test cases: https://mathiasbynens.be/demo/url-regex
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
    // byte: https://github.com/miguelmota/is-base64
    byte,
    // signed 32 bit integer
    int32: { type: "number", validate: validateInt32 },
    // signed 64 bit integer
    int64: { type: "number", validate: validateInt64 },
    // C-type float
    float: { type: "number", validate: validateNumber },
    // C-type double
    double: { type: "number", validate: validateNumber },
    // hint to the UI to hide input strings
    password: true,
    // unchecked string payload
    binary: true
  };
  exports$1.fastFormats = {
    ...exports$1.fullFormats,
    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareTime),
    "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  };
  exports$1.formatNames = Object.keys(exports$1.fullFormats);
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function date(str) {
    const matches = DATE.exec(str);
    if (!matches)
      return false;
    const year = +matches[1];
    const month = +matches[2];
    const day = +matches[3];
    return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
  }
  function compareDate(d1, d2) {
    if (!(d1 && d2))
      return void 0;
    if (d1 > d2)
      return 1;
    if (d1 < d2)
      return -1;
    return 0;
  }
  const TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
  function time(str, withTimeZone) {
    const matches = TIME.exec(str);
    if (!matches)
      return false;
    const hour = +matches[1];
    const minute = +matches[2];
    const second = +matches[3];
    const timeZone = matches[5];
    return (hour <= 23 && minute <= 59 && second <= 59 || hour === 23 && minute === 59 && second === 60) && (!withTimeZone || timeZone !== "");
  }
  function compareTime(t1, t2) {
    if (!(t1 && t2))
      return void 0;
    const a1 = TIME.exec(t1);
    const a2 = TIME.exec(t2);
    if (!(a1 && a2))
      return void 0;
    t1 = a1[1] + a1[2] + a1[3] + (a1[4] || "");
    t2 = a2[1] + a2[2] + a2[3] + (a2[4] || "");
    if (t1 > t2)
      return 1;
    if (t1 < t2)
      return -1;
    return 0;
  }
  const DATE_TIME_SEPARATOR = /t|\s/i;
  function date_time(str) {
    const dateTime = str.split(DATE_TIME_SEPARATOR);
    return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1], true);
  }
  function compareDateTime(dt1, dt2) {
    if (!(dt1 && dt2))
      return void 0;
    const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
    const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
    const res = compareDate(d1, d2);
    if (res === void 0)
      return void 0;
    return res || compareTime(t1, t2);
  }
  const NOT_URI_FRAGMENT = /\/|:/;
  const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function uri2(str) {
    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
  }
  const BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function byte(str) {
    BYTE.lastIndex = 0;
    return BYTE.test(str);
  }
  const MIN_INT32 = -2147483648;
  const MAX_INT32 = 2 ** 31 - 1;
  function validateInt32(value) {
    return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
  }
  function validateInt64(value) {
    return Number.isInteger(value);
  }
  function validateNumber() {
    return true;
  }
  const Z_ANCHOR = /[^\\]\\Z/;
  function regex(str) {
    if (Z_ANCHOR.test(str))
      return false;
    try {
      new RegExp(str);
      return true;
    } catch (e) {
      return false;
    }
  }
})(formats);
var limit = {};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.formatLimitDefinition = void 0;
  const ajv_1 = ajvExports;
  const codegen_12 = codegen;
  const ops2 = codegen_12.operators;
  const KWDs2 = {
    formatMaximum: { okStr: "<=", ok: ops2.LTE, fail: ops2.GT },
    formatMinimum: { okStr: ">=", ok: ops2.GTE, fail: ops2.LT },
    formatExclusiveMaximum: { okStr: "<", ok: ops2.LT, fail: ops2.GTE },
    formatExclusiveMinimum: { okStr: ">", ok: ops2.GT, fail: ops2.LTE }
  };
  const error2 = {
    message: ({ keyword: keyword2, schemaCode }) => codegen_12.str`should be ${KWDs2[keyword2].okStr} ${schemaCode}`,
    params: ({ keyword: keyword2, schemaCode }) => codegen_12._`{comparison: ${KWDs2[keyword2].okStr}, limit: ${schemaCode}}`
  };
  exports$1.formatLimitDefinition = {
    keyword: Object.keys(KWDs2),
    type: "string",
    schemaType: "string",
    $data: true,
    error: error2,
    code(cxt) {
      const { gen, data, schemaCode, keyword: keyword2, it } = cxt;
      const { opts, self: self2 } = it;
      if (!opts.validateFormats)
        return;
      const fCxt = new ajv_1.KeywordCxt(it, self2.RULES.all.format.definition, "format");
      if (fCxt.$data)
        validate$DataFormat();
      else
        validateFormat();
      function validate$DataFormat() {
        const fmts = gen.scopeValue("formats", {
          ref: self2.formats,
          code: opts.code.formats
        });
        const fmt = gen.const("fmt", codegen_12._`${fmts}[${fCxt.schemaCode}]`);
        cxt.fail$data(codegen_12.or(codegen_12._`typeof ${fmt} != "object"`, codegen_12._`${fmt} instanceof RegExp`, codegen_12._`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
      }
      function validateFormat() {
        const format2 = fCxt.schema;
        const fmtDef = self2.formats[format2];
        if (!fmtDef || fmtDef === true)
          return;
        if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
          throw new Error(`"${keyword2}": format "${format2}" does not define "compare" function`);
        }
        const fmt = gen.scopeValue("formats", {
          key: format2,
          ref: fmtDef,
          code: opts.code.formats ? codegen_12._`${opts.code.formats}${codegen_12.getProperty(format2)}` : void 0
        });
        cxt.fail$data(compareCode(fmt));
      }
      function compareCode(fmt) {
        return codegen_12._`${fmt}.compare(${data}, ${schemaCode}) ${KWDs2[keyword2].fail} 0`;
      }
    },
    dependencies: ["format"]
  };
  const formatLimitPlugin = (ajv2) => {
    ajv2.addKeyword(exports$1.formatLimitDefinition);
    return ajv2;
  };
  exports$1.default = formatLimitPlugin;
})(limit);
(function(module, exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  const formats_1 = formats;
  const limit_1 = limit;
  const codegen_12 = codegen;
  const fullName = new codegen_12.Name("fullFormats");
  const fastName = new codegen_12.Name("fastFormats");
  const formatsPlugin = (ajv2, opts = { keywords: true }) => {
    if (Array.isArray(opts)) {
      addFormats(ajv2, opts, formats_1.fullFormats, fullName);
      return ajv2;
    }
    const [formats2, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
    const list = opts.formats || formats_1.formatNames;
    addFormats(ajv2, list, formats2, exportName);
    if (opts.keywords)
      limit_1.default(ajv2);
    return ajv2;
  };
  formatsPlugin.get = (name, mode = "full") => {
    const formats2 = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
    const f = formats2[name];
    if (!f)
      throw new Error(`Unknown format "${name}"`);
    return f;
  };
  function addFormats(ajv2, list, fs2, exportName) {
    var _a;
    var _b;
    (_a = (_b = ajv2.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = codegen_12._`require("ajv-formats/dist/formats").${exportName}`;
    for (const f of list)
      ajv2.addFormat(f, fs2[f]);
  }
  module.exports = exports$1 = formatsPlugin;
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.default = formatsPlugin;
})(dist, dist.exports);
var distExports = dist.exports;
const copyProperty = (to, from, property, ignoreNonConfigurable) => {
  if (property === "length" || property === "prototype") {
    return;
  }
  if (property === "arguments" || property === "caller") {
    return;
  }
  const toDescriptor = Object.getOwnPropertyDescriptor(to, property);
  const fromDescriptor = Object.getOwnPropertyDescriptor(from, property);
  if (!canCopyProperty(toDescriptor, fromDescriptor) && ignoreNonConfigurable) {
    return;
  }
  Object.defineProperty(to, property, fromDescriptor);
};
const canCopyProperty = function(toDescriptor, fromDescriptor) {
  return toDescriptor === void 0 || toDescriptor.configurable || toDescriptor.writable === fromDescriptor.writable && toDescriptor.enumerable === fromDescriptor.enumerable && toDescriptor.configurable === fromDescriptor.configurable && (toDescriptor.writable || toDescriptor.value === fromDescriptor.value);
};
const changePrototype = (to, from) => {
  const fromPrototype = Object.getPrototypeOf(from);
  if (fromPrototype === Object.getPrototypeOf(to)) {
    return;
  }
  Object.setPrototypeOf(to, fromPrototype);
};
const wrappedToString = (withName, fromBody) => `/* Wrapped ${withName}*/
${fromBody}`;
const toStringDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, "toString");
const toStringName = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name");
const changeToString = (to, from, name) => {
  const withName = name === "" ? "" : `with ${name.trim()}() `;
  const newToString = wrappedToString.bind(null, withName, from.toString());
  Object.defineProperty(newToString, "name", toStringName);
  Object.defineProperty(to, "toString", { ...toStringDescriptor, value: newToString });
};
const mimicFn$4 = (to, from, { ignoreNonConfigurable = false } = {}) => {
  const { name } = to;
  for (const property of Reflect.ownKeys(from)) {
    copyProperty(to, from, property, ignoreNonConfigurable);
  }
  changePrototype(to, from);
  changeToString(to, from, name);
  return to;
};
var mimicFn_1 = mimicFn$4;
const mimicFn$3 = mimicFn_1;
var debounceFn = (inputFunction, options = {}) => {
  if (typeof inputFunction !== "function") {
    throw new TypeError(`Expected the first argument to be a function, got \`${typeof inputFunction}\``);
  }
  const {
    wait = 0,
    before = false,
    after = true
  } = options;
  if (!before && !after) {
    throw new Error("Both `before` and `after` are false, function wouldn't be called.");
  }
  let timeout;
  let result;
  const debouncedFunction = function(...arguments_) {
    const context = this;
    const later = () => {
      timeout = void 0;
      if (after) {
        result = inputFunction.apply(context, arguments_);
      }
    };
    const shouldCallNow = before && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (shouldCallNow) {
      result = inputFunction.apply(context, arguments_);
    }
    return result;
  };
  mimicFn$3(debouncedFunction, inputFunction);
  debouncedFunction.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = void 0;
    }
  };
  return debouncedFunction;
};
var re$2 = { exports: {} };
const SEMVER_SPEC_VERSION = "2.0.0";
const MAX_LENGTH$1 = 256;
const MAX_SAFE_INTEGER$1 = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991;
const MAX_SAFE_COMPONENT_LENGTH = 16;
const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH$1 - 6;
const RELEASE_TYPES = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var constants$1 = {
  MAX_LENGTH: MAX_LENGTH$1,
  MAX_SAFE_COMPONENT_LENGTH,
  MAX_SAFE_BUILD_LENGTH,
  MAX_SAFE_INTEGER: MAX_SAFE_INTEGER$1,
  RELEASE_TYPES,
  SEMVER_SPEC_VERSION,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const debug$1 = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
};
var debug_1 = debug$1;
(function(module, exports$1) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: MAX_SAFE_COMPONENT_LENGTH2,
    MAX_SAFE_BUILD_LENGTH: MAX_SAFE_BUILD_LENGTH2,
    MAX_LENGTH: MAX_LENGTH2
  } = constants$1;
  const debug2 = debug_1;
  exports$1 = module.exports = {};
  const re2 = exports$1.re = [];
  const safeRe = exports$1.safeRe = [];
  const src = exports$1.src = [];
  const t2 = exports$1.t = {};
  let R = 0;
  const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
  const safeRegexReplacements = [
    ["\\s", 1],
    ["\\d", MAX_LENGTH2],
    [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH2]
  ];
  const makeSafeRegex = (value) => {
    for (const [token, max] of safeRegexReplacements) {
      value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
    }
    return value;
  };
  const createToken = (name, value, isGlobal) => {
    const safe = makeSafeRegex(value);
    const index = R++;
    debug2(name, index, value);
    t2[name] = index;
    src[index] = value;
    re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
    safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
  };
  createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
  createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
  createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
  createToken("MAINVERSION", `(${src[t2.NUMERICIDENTIFIER]})\\.(${src[t2.NUMERICIDENTIFIER]})\\.(${src[t2.NUMERICIDENTIFIER]})`);
  createToken("MAINVERSIONLOOSE", `(${src[t2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t2.NUMERICIDENTIFIERLOOSE]})`);
  createToken("PRERELEASEIDENTIFIER", `(?:${src[t2.NUMERICIDENTIFIER]}|${src[t2.NONNUMERICIDENTIFIER]})`);
  createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t2.NUMERICIDENTIFIERLOOSE]}|${src[t2.NONNUMERICIDENTIFIER]})`);
  createToken("PRERELEASE", `(?:-(${src[t2.PRERELEASEIDENTIFIER]}(?:\\.${src[t2.PRERELEASEIDENTIFIER]})*))`);
  createToken("PRERELEASELOOSE", `(?:-?(${src[t2.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t2.PRERELEASEIDENTIFIERLOOSE]})*))`);
  createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
  createToken("BUILD", `(?:\\+(${src[t2.BUILDIDENTIFIER]}(?:\\.${src[t2.BUILDIDENTIFIER]})*))`);
  createToken("FULLPLAIN", `v?${src[t2.MAINVERSION]}${src[t2.PRERELEASE]}?${src[t2.BUILD]}?`);
  createToken("FULL", `^${src[t2.FULLPLAIN]}$`);
  createToken("LOOSEPLAIN", `[v=\\s]*${src[t2.MAINVERSIONLOOSE]}${src[t2.PRERELEASELOOSE]}?${src[t2.BUILD]}?`);
  createToken("LOOSE", `^${src[t2.LOOSEPLAIN]}$`);
  createToken("GTLT", "((?:<|>)?=?)");
  createToken("XRANGEIDENTIFIERLOOSE", `${src[t2.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
  createToken("XRANGEIDENTIFIER", `${src[t2.NUMERICIDENTIFIER]}|x|X|\\*`);
  createToken("XRANGEPLAIN", `[v=\\s]*(${src[t2.XRANGEIDENTIFIER]})(?:\\.(${src[t2.XRANGEIDENTIFIER]})(?:\\.(${src[t2.XRANGEIDENTIFIER]})(?:${src[t2.PRERELEASE]})?${src[t2.BUILD]}?)?)?`);
  createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t2.XRANGEIDENTIFIERLOOSE]})(?:${src[t2.PRERELEASELOOSE]})?${src[t2.BUILD]}?)?)?`);
  createToken("XRANGE", `^${src[t2.GTLT]}\\s*${src[t2.XRANGEPLAIN]}$`);
  createToken("XRANGELOOSE", `^${src[t2.GTLT]}\\s*${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH2}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH2}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH2}}))?`);
  createToken("COERCE", `${src[t2.COERCEPLAIN]}(?:$|[^\\d])`);
  createToken("COERCEFULL", src[t2.COERCEPLAIN] + `(?:${src[t2.PRERELEASE]})?(?:${src[t2.BUILD]})?(?:$|[^\\d])`);
  createToken("COERCERTL", src[t2.COERCE], true);
  createToken("COERCERTLFULL", src[t2.COERCEFULL], true);
  createToken("LONETILDE", "(?:~>?)");
  createToken("TILDETRIM", `(\\s*)${src[t2.LONETILDE]}\\s+`, true);
  exports$1.tildeTrimReplace = "$1~";
  createToken("TILDE", `^${src[t2.LONETILDE]}${src[t2.XRANGEPLAIN]}$`);
  createToken("TILDELOOSE", `^${src[t2.LONETILDE]}${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("LONECARET", "(?:\\^)");
  createToken("CARETTRIM", `(\\s*)${src[t2.LONECARET]}\\s+`, true);
  exports$1.caretTrimReplace = "$1^";
  createToken("CARET", `^${src[t2.LONECARET]}${src[t2.XRANGEPLAIN]}$`);
  createToken("CARETLOOSE", `^${src[t2.LONECARET]}${src[t2.XRANGEPLAINLOOSE]}$`);
  createToken("COMPARATORLOOSE", `^${src[t2.GTLT]}\\s*(${src[t2.LOOSEPLAIN]})$|^$`);
  createToken("COMPARATOR", `^${src[t2.GTLT]}\\s*(${src[t2.FULLPLAIN]})$|^$`);
  createToken("COMPARATORTRIM", `(\\s*)${src[t2.GTLT]}\\s*(${src[t2.LOOSEPLAIN]}|${src[t2.XRANGEPLAIN]})`, true);
  exports$1.comparatorTrimReplace = "$1$2$3";
  createToken("HYPHENRANGE", `^\\s*(${src[t2.XRANGEPLAIN]})\\s+-\\s+(${src[t2.XRANGEPLAIN]})\\s*$`);
  createToken("HYPHENRANGELOOSE", `^\\s*(${src[t2.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t2.XRANGEPLAINLOOSE]})\\s*$`);
  createToken("STAR", "(<|>)?=?\\s*\\*");
  createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
  createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})(re$2, re$2.exports);
var reExports = re$2.exports;
const looseOption = Object.freeze({ loose: true });
const emptyOpts = Object.freeze({});
const parseOptions$1 = (options) => {
  if (!options) {
    return emptyOpts;
  }
  if (typeof options !== "object") {
    return looseOption;
  }
  return options;
};
var parseOptions_1 = parseOptions$1;
const numeric = /^[0-9]+$/;
const compareIdentifiers$1 = (a, b) => {
  const anum = numeric.test(a);
  const bnum = numeric.test(b);
  if (anum && bnum) {
    a = +a;
    b = +b;
  }
  return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
};
const rcompareIdentifiers = (a, b) => compareIdentifiers$1(b, a);
var identifiers$1 = {
  compareIdentifiers: compareIdentifiers$1,
  rcompareIdentifiers
};
const debug = debug_1;
const { MAX_LENGTH, MAX_SAFE_INTEGER } = constants$1;
const { safeRe: re$1, t: t$1 } = reExports;
const parseOptions = parseOptions_1;
const { compareIdentifiers } = identifiers$1;
let SemVer$d = class SemVer {
  constructor(version, options) {
    options = parseOptions(options);
    if (version instanceof SemVer) {
      if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
        return version;
      } else {
        version = version.version;
      }
    } else if (typeof version !== "string") {
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
    }
    if (version.length > MAX_LENGTH) {
      throw new TypeError(
        `version is longer than ${MAX_LENGTH} characters`
      );
    }
    debug("SemVer", version, options);
    this.options = options;
    this.loose = !!options.loose;
    this.includePrerelease = !!options.includePrerelease;
    const m = version.trim().match(options.loose ? re$1[t$1.LOOSE] : re$1[t$1.FULL]);
    if (!m) {
      throw new TypeError(`Invalid Version: ${version}`);
    }
    this.raw = version;
    this.major = +m[1];
    this.minor = +m[2];
    this.patch = +m[3];
    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
      throw new TypeError("Invalid major version");
    }
    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
      throw new TypeError("Invalid minor version");
    }
    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
      throw new TypeError("Invalid patch version");
    }
    if (!m[4]) {
      this.prerelease = [];
    } else {
      this.prerelease = m[4].split(".").map((id2) => {
        if (/^[0-9]+$/.test(id2)) {
          const num = +id2;
          if (num >= 0 && num < MAX_SAFE_INTEGER) {
            return num;
          }
        }
        return id2;
      });
    }
    this.build = m[5] ? m[5].split(".") : [];
    this.format();
  }
  format() {
    this.version = `${this.major}.${this.minor}.${this.patch}`;
    if (this.prerelease.length) {
      this.version += `-${this.prerelease.join(".")}`;
    }
    return this.version;
  }
  toString() {
    return this.version;
  }
  compare(other) {
    debug("SemVer.compare", this.version, this.options, other);
    if (!(other instanceof SemVer)) {
      if (typeof other === "string" && other === this.version) {
        return 0;
      }
      other = new SemVer(other, this.options);
    }
    if (other.version === this.version) {
      return 0;
    }
    return this.compareMain(other) || this.comparePre(other);
  }
  compareMain(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
  }
  comparePre(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    if (this.prerelease.length && !other.prerelease.length) {
      return -1;
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1;
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0;
    }
    let i = 0;
    do {
      const a = this.prerelease[i];
      const b = other.prerelease[i];
      debug("prerelease compare", i, a, b);
      if (a === void 0 && b === void 0) {
        return 0;
      } else if (b === void 0) {
        return 1;
      } else if (a === void 0) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers(a, b);
      }
    } while (++i);
  }
  compareBuild(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    let i = 0;
    do {
      const a = this.build[i];
      const b = other.build[i];
      debug("build compare", i, a, b);
      if (a === void 0 && b === void 0) {
        return 0;
      } else if (b === void 0) {
        return 1;
      } else if (a === void 0) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers(a, b);
      }
    } while (++i);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(release, identifier, identifierBase) {
    switch (release) {
      case "premajor":
        this.prerelease.length = 0;
        this.patch = 0;
        this.minor = 0;
        this.major++;
        this.inc("pre", identifier, identifierBase);
        break;
      case "preminor":
        this.prerelease.length = 0;
        this.patch = 0;
        this.minor++;
        this.inc("pre", identifier, identifierBase);
        break;
      case "prepatch":
        this.prerelease.length = 0;
        this.inc("patch", identifier, identifierBase);
        this.inc("pre", identifier, identifierBase);
        break;
      case "prerelease":
        if (this.prerelease.length === 0) {
          this.inc("patch", identifier, identifierBase);
        }
        this.inc("pre", identifier, identifierBase);
        break;
      case "major":
        if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
          this.major++;
        }
        this.minor = 0;
        this.patch = 0;
        this.prerelease = [];
        break;
      case "minor":
        if (this.patch !== 0 || this.prerelease.length === 0) {
          this.minor++;
        }
        this.patch = 0;
        this.prerelease = [];
        break;
      case "patch":
        if (this.prerelease.length === 0) {
          this.patch++;
        }
        this.prerelease = [];
        break;
      case "pre": {
        const base = Number(identifierBase) ? 1 : 0;
        if (!identifier && identifierBase === false) {
          throw new Error("invalid increment argument: identifier is empty");
        }
        if (this.prerelease.length === 0) {
          this.prerelease = [base];
        } else {
          let i = this.prerelease.length;
          while (--i >= 0) {
            if (typeof this.prerelease[i] === "number") {
              this.prerelease[i]++;
              i = -2;
            }
          }
          if (i === -1) {
            if (identifier === this.prerelease.join(".") && identifierBase === false) {
              throw new Error("invalid increment argument: identifier already exists");
            }
            this.prerelease.push(base);
          }
        }
        if (identifier) {
          let prerelease2 = [identifier, base];
          if (identifierBase === false) {
            prerelease2 = [identifier];
          }
          if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
            if (isNaN(this.prerelease[1])) {
              this.prerelease = prerelease2;
            }
          } else {
            this.prerelease = prerelease2;
          }
        }
        break;
      }
      default:
        throw new Error(`invalid increment argument: ${release}`);
    }
    this.raw = this.format();
    if (this.build.length) {
      this.raw += `+${this.build.join(".")}`;
    }
    return this;
  }
};
var semver$1 = SemVer$d;
const SemVer$c = semver$1;
const parse$6 = (version, options, throwErrors = false) => {
  if (version instanceof SemVer$c) {
    return version;
  }
  try {
    return new SemVer$c(version, options);
  } catch (er) {
    if (!throwErrors) {
      return null;
    }
    throw er;
  }
};
var parse_1 = parse$6;
const parse$5 = parse_1;
const valid$2 = (version, options) => {
  const v = parse$5(version, options);
  return v ? v.version : null;
};
var valid_1 = valid$2;
const parse$4 = parse_1;
const clean$1 = (version, options) => {
  const s = parse$4(version.trim().replace(/^[=v]+/, ""), options);
  return s ? s.version : null;
};
var clean_1 = clean$1;
const SemVer$b = semver$1;
const inc$1 = (version, release, options, identifier, identifierBase) => {
  if (typeof options === "string") {
    identifierBase = identifier;
    identifier = options;
    options = void 0;
  }
  try {
    return new SemVer$b(
      version instanceof SemVer$b ? version.version : version,
      options
    ).inc(release, identifier, identifierBase).version;
  } catch (er) {
    return null;
  }
};
var inc_1 = inc$1;
const parse$3 = parse_1;
const diff$1 = (version1, version2) => {
  const v1 = parse$3(version1, null, true);
  const v2 = parse$3(version2, null, true);
  const comparison = v1.compare(v2);
  if (comparison === 0) {
    return null;
  }
  const v1Higher = comparison > 0;
  const highVersion = v1Higher ? v1 : v2;
  const lowVersion = v1Higher ? v2 : v1;
  const highHasPre = !!highVersion.prerelease.length;
  const lowHasPre = !!lowVersion.prerelease.length;
  if (lowHasPre && !highHasPre) {
    if (!lowVersion.patch && !lowVersion.minor) {
      return "major";
    }
    if (highVersion.patch) {
      return "patch";
    }
    if (highVersion.minor) {
      return "minor";
    }
    return "major";
  }
  const prefix = highHasPre ? "pre" : "";
  if (v1.major !== v2.major) {
    return prefix + "major";
  }
  if (v1.minor !== v2.minor) {
    return prefix + "minor";
  }
  if (v1.patch !== v2.patch) {
    return prefix + "patch";
  }
  return "prerelease";
};
var diff_1 = diff$1;
const SemVer$a = semver$1;
const major$1 = (a, loose) => new SemVer$a(a, loose).major;
var major_1 = major$1;
const SemVer$9 = semver$1;
const minor$1 = (a, loose) => new SemVer$9(a, loose).minor;
var minor_1 = minor$1;
const SemVer$8 = semver$1;
const patch$1 = (a, loose) => new SemVer$8(a, loose).patch;
var patch_1 = patch$1;
const parse$2 = parse_1;
const prerelease$1 = (version, options) => {
  const parsed = parse$2(version, options);
  return parsed && parsed.prerelease.length ? parsed.prerelease : null;
};
var prerelease_1 = prerelease$1;
const SemVer$7 = semver$1;
const compare$b = (a, b, loose) => new SemVer$7(a, loose).compare(new SemVer$7(b, loose));
var compare_1 = compare$b;
const compare$a = compare_1;
const rcompare$1 = (a, b, loose) => compare$a(b, a, loose);
var rcompare_1 = rcompare$1;
const compare$9 = compare_1;
const compareLoose$1 = (a, b) => compare$9(a, b, true);
var compareLoose_1 = compareLoose$1;
const SemVer$6 = semver$1;
const compareBuild$3 = (a, b, loose) => {
  const versionA = new SemVer$6(a, loose);
  const versionB = new SemVer$6(b, loose);
  return versionA.compare(versionB) || versionA.compareBuild(versionB);
};
var compareBuild_1 = compareBuild$3;
const compareBuild$2 = compareBuild_1;
const sort$1 = (list, loose) => list.sort((a, b) => compareBuild$2(a, b, loose));
var sort_1 = sort$1;
const compareBuild$1 = compareBuild_1;
const rsort$1 = (list, loose) => list.sort((a, b) => compareBuild$1(b, a, loose));
var rsort_1 = rsort$1;
const compare$8 = compare_1;
const gt$4 = (a, b, loose) => compare$8(a, b, loose) > 0;
var gt_1 = gt$4;
const compare$7 = compare_1;
const lt$3 = (a, b, loose) => compare$7(a, b, loose) < 0;
var lt_1 = lt$3;
const compare$6 = compare_1;
const eq$2 = (a, b, loose) => compare$6(a, b, loose) === 0;
var eq_1 = eq$2;
const compare$5 = compare_1;
const neq$2 = (a, b, loose) => compare$5(a, b, loose) !== 0;
var neq_1 = neq$2;
const compare$4 = compare_1;
const gte$3 = (a, b, loose) => compare$4(a, b, loose) >= 0;
var gte_1 = gte$3;
const compare$3 = compare_1;
const lte$3 = (a, b, loose) => compare$3(a, b, loose) <= 0;
var lte_1 = lte$3;
const eq$1 = eq_1;
const neq$1 = neq_1;
const gt$3 = gt_1;
const gte$2 = gte_1;
const lt$2 = lt_1;
const lte$2 = lte_1;
const cmp$1 = (a, op, b, loose) => {
  switch (op) {
    case "===":
      if (typeof a === "object") {
        a = a.version;
      }
      if (typeof b === "object") {
        b = b.version;
      }
      return a === b;
    case "!==":
      if (typeof a === "object") {
        a = a.version;
      }
      if (typeof b === "object") {
        b = b.version;
      }
      return a !== b;
    case "":
    case "=":
    case "==":
      return eq$1(a, b, loose);
    case "!=":
      return neq$1(a, b, loose);
    case ">":
      return gt$3(a, b, loose);
    case ">=":
      return gte$2(a, b, loose);
    case "<":
      return lt$2(a, b, loose);
    case "<=":
      return lte$2(a, b, loose);
    default:
      throw new TypeError(`Invalid operator: ${op}`);
  }
};
var cmp_1 = cmp$1;
const SemVer$5 = semver$1;
const parse$1 = parse_1;
const { safeRe: re, t } = reExports;
const coerce$1 = (version, options) => {
  if (version instanceof SemVer$5) {
    return version;
  }
  if (typeof version === "number") {
    version = String(version);
  }
  if (typeof version !== "string") {
    return null;
  }
  options = options || {};
  let match = null;
  if (!options.rtl) {
    match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
  } else {
    const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
    let next;
    while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
      if (!match || next.index + next[0].length !== match.index + match[0].length) {
        match = next;
      }
      coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
    }
    coerceRtlRegex.lastIndex = -1;
  }
  if (match === null) {
    return null;
  }
  const major2 = match[2];
  const minor2 = match[3] || "0";
  const patch2 = match[4] || "0";
  const prerelease2 = options.includePrerelease && match[5] ? `-${match[5]}` : "";
  const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
  return parse$1(`${major2}.${minor2}.${patch2}${prerelease2}${build}`, options);
};
var coerce_1 = coerce$1;
class LRUCache {
  constructor() {
    this.max = 1e3;
    this.map = /* @__PURE__ */ new Map();
  }
  get(key) {
    const value = this.map.get(key);
    if (value === void 0) {
      return void 0;
    } else {
      this.map.delete(key);
      this.map.set(key, value);
      return value;
    }
  }
  delete(key) {
    return this.map.delete(key);
  }
  set(key, value) {
    const deleted = this.delete(key);
    if (!deleted && value !== void 0) {
      if (this.map.size >= this.max) {
        const firstKey = this.map.keys().next().value;
        this.delete(firstKey);
      }
      this.map.set(key, value);
    }
    return this;
  }
}
var lrucache = LRUCache;
var range;
var hasRequiredRange;
function requireRange() {
  if (hasRequiredRange) return range;
  hasRequiredRange = 1;
  const SPACE_CHARACTERS = /\s+/g;
  class Range2 {
    constructor(range2, options) {
      options = parseOptions2(options);
      if (range2 instanceof Range2) {
        if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
          return range2;
        } else {
          return new Range2(range2.raw, options);
        }
      }
      if (range2 instanceof Comparator2) {
        this.raw = range2.value;
        this.set = [[range2]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range2.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) {
          this.set = [first];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
          }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) {
            this.formatted += "||";
          }
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) {
              this.formatted += " ";
            }
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range2) {
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ":" + range2;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re2[t2.HYPHENRANGELOOSE] : re2[t2.HYPHENRANGE];
      range2 = range2.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug2("hyphen replace", range2);
      range2 = range2.replace(re2[t2.COMPARATORTRIM], comparatorTrimReplace);
      debug2("comparator trim", range2);
      range2 = range2.replace(re2[t2.TILDETRIM], tildeTrimReplace);
      debug2("tilde trim", range2);
      range2 = range2.replace(re2[t2.CARETTRIM], caretTrimReplace);
      debug2("caret trim", range2);
      let rangeList = range2.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
      if (loose) {
        rangeList = rangeList.filter((comp) => {
          debug2("loose invalid filter", comp, this.options);
          return !!comp.match(re2[t2.COMPARATORLOOSE]);
        });
      }
      debug2("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator2(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [comp];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) {
        rangeMap.delete("");
      }
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range2, options) {
      if (!(range2 instanceof Range2)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some((thisComparators) => {
        return isSatisfiable(thisComparators, options) && range2.set.some((rangeComparators) => {
          return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
            return rangeComparators.every((rangeComparator) => {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(version) {
      if (!version) {
        return false;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer3(version, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  range = Range2;
  const LRU = lrucache;
  const cache = new LRU();
  const parseOptions2 = parseOptions_1;
  const Comparator2 = requireComparator();
  const debug2 = debug_1;
  const SemVer3 = semver$1;
  const {
    safeRe: re2,
    t: t2,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace
  } = reExports;
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = constants$1;
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    debug2("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug2("caret", comp);
    comp = replaceTildes(comp, options);
    debug2("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug2("xrange", comp);
    comp = replaceStars(comp, options);
    debug2("stars", comp);
    return comp;
  };
  const isX = (id2) => !id2 || id2.toLowerCase() === "x" || id2 === "*";
  const replaceTildes = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re2[t2.TILDELOOSE] : re2[t2.TILDE];
    return comp.replace(r, (_, M2, m, p, pr) => {
      debug2("tilde", comp, _, M2, m, p, pr);
      let ret;
      if (isX(M2)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M2}.0.0 <${+M2 + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M2}.${m}.0 <${M2}.${+m + 1}.0-0`;
      } else if (pr) {
        debug2("replaceTilde pr", pr);
        ret = `>=${M2}.${m}.${p}-${pr} <${M2}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M2}.${m}.${p} <${M2}.${+m + 1}.0-0`;
      }
      debug2("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug2("caret", comp, options);
    const r = options.loose ? re2[t2.CARETLOOSE] : re2[t2.CARET];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M2, m, p, pr) => {
      debug2("caret", comp, _, M2, m, p, pr);
      let ret;
      if (isX(M2)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M2}.0.0${z} <${+M2 + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M2 === "0") {
          ret = `>=${M2}.${m}.0${z} <${M2}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M2}.${m}.0${z} <${+M2 + 1}.0.0-0`;
        }
      } else if (pr) {
        debug2("replaceCaret pr", pr);
        if (M2 === "0") {
          if (m === "0") {
            ret = `>=${M2}.${m}.${p}-${pr} <${M2}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M2}.${m}.${p}-${pr} <${M2}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M2}.${m}.${p}-${pr} <${+M2 + 1}.0.0-0`;
        }
      } else {
        debug2("no pr");
        if (M2 === "0") {
          if (m === "0") {
            ret = `>=${M2}.${m}.${p}${z} <${M2}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M2}.${m}.${p}${z} <${M2}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M2}.${m}.${p} <${+M2 + 1}.0.0-0`;
        }
      }
      debug2("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug2("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re2[t2.XRANGELOOSE] : re2[t2.XRANGE];
    return comp.replace(r, (ret, gtlt, M2, m, p, pr) => {
      debug2("xRange", comp, ret, gtlt, M2, m, p, pr);
      const xM = isX(M2);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M2 = +M2 + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M2 = +M2 + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === "<") {
          pr = "-0";
        }
        ret = `${gtlt + M2}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M2}.0.0${pr} <${+M2 + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M2}.${m}.0${pr} <${M2}.${+m + 1}.0-0`;
      }
      debug2("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug2("replaceStars", comp, options);
    return comp.trim().replace(re2[t2.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug2("replaceGTE0", comp, options);
    return comp.trim().replace(re2[options.includePrerelease ? t2.GTE0PRE : t2.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? "-0" : ""}`;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version, options) => {
    for (let i = 0; i < set.length; i++) {
      if (!set[i].test(version)) {
        return false;
      }
    }
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug2(set[i].semver);
        if (set[i].semver === Comparator2.ANY) {
          continue;
        }
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
  return range;
}
var comparator;
var hasRequiredComparator;
function requireComparator() {
  if (hasRequiredComparator) return comparator;
  hasRequiredComparator = 1;
  const ANY2 = Symbol("SemVer ANY");
  class Comparator2 {
    static get ANY() {
      return ANY2;
    }
    constructor(comp, options) {
      options = parseOptions2(options);
      if (comp instanceof Comparator2) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug2("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY2) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug2("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re2[t2.COMPARATORLOOSE] : re2[t2.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY2;
      } else {
        this.semver = new SemVer3(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug2("Comparator.test", version, this.options.loose);
      if (this.semver === ANY2 || version === ANY2) {
        return true;
      }
      if (typeof version === "string") {
        try {
          version = new SemVer3(version, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp2(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator2)) {
        throw new TypeError("a Comparator is required");
      }
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        return new Range2(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        return new Range2(this.value, options).test(comp.semver);
      }
      options = parseOptions2(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
        return false;
      }
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
        return true;
      }
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
        return true;
      }
      if (cmp2(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
        return true;
      }
      if (cmp2(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
        return true;
      }
      return false;
    }
  }
  comparator = Comparator2;
  const parseOptions2 = parseOptions_1;
  const { safeRe: re2, t: t2 } = reExports;
  const cmp2 = cmp_1;
  const debug2 = debug_1;
  const SemVer3 = semver$1;
  const Range2 = requireRange();
  return comparator;
}
const Range$9 = requireRange();
const satisfies$4 = (version, range2, options) => {
  try {
    range2 = new Range$9(range2, options);
  } catch (er) {
    return false;
  }
  return range2.test(version);
};
var satisfies_1 = satisfies$4;
const Range$8 = requireRange();
const toComparators$1 = (range2, options) => new Range$8(range2, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
var toComparators_1 = toComparators$1;
const SemVer$4 = semver$1;
const Range$7 = requireRange();
const maxSatisfying$1 = (versions, range2, options) => {
  let max = null;
  let maxSV = null;
  let rangeObj = null;
  try {
    rangeObj = new Range$7(range2, options);
  } catch (er) {
    return null;
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      if (!max || maxSV.compare(v) === -1) {
        max = v;
        maxSV = new SemVer$4(max, options);
      }
    }
  });
  return max;
};
var maxSatisfying_1 = maxSatisfying$1;
const SemVer$3 = semver$1;
const Range$6 = requireRange();
const minSatisfying$1 = (versions, range2, options) => {
  let min = null;
  let minSV = null;
  let rangeObj = null;
  try {
    rangeObj = new Range$6(range2, options);
  } catch (er) {
    return null;
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      if (!min || minSV.compare(v) === 1) {
        min = v;
        minSV = new SemVer$3(min, options);
      }
    }
  });
  return min;
};
var minSatisfying_1 = minSatisfying$1;
const SemVer$2 = semver$1;
const Range$5 = requireRange();
const gt$2 = gt_1;
const minVersion$1 = (range2, loose) => {
  range2 = new Range$5(range2, loose);
  let minver = new SemVer$2("0.0.0");
  if (range2.test(minver)) {
    return minver;
  }
  minver = new SemVer$2("0.0.0-0");
  if (range2.test(minver)) {
    return minver;
  }
  minver = null;
  for (let i = 0; i < range2.set.length; ++i) {
    const comparators = range2.set[i];
    let setMin = null;
    comparators.forEach((comparator2) => {
      const compver = new SemVer$2(comparator2.semver.version);
      switch (comparator2.operator) {
        case ">":
          if (compver.prerelease.length === 0) {
            compver.patch++;
          } else {
            compver.prerelease.push(0);
          }
          compver.raw = compver.format();
        case "":
        case ">=":
          if (!setMin || gt$2(compver, setMin)) {
            setMin = compver;
          }
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${comparator2.operator}`);
      }
    });
    if (setMin && (!minver || gt$2(minver, setMin))) {
      minver = setMin;
    }
  }
  if (minver && range2.test(minver)) {
    return minver;
  }
  return null;
};
var minVersion_1 = minVersion$1;
const Range$4 = requireRange();
const validRange$1 = (range2, options) => {
  try {
    return new Range$4(range2, options).range || "*";
  } catch (er) {
    return null;
  }
};
var valid$1 = validRange$1;
const SemVer$1 = semver$1;
const Comparator$2 = requireComparator();
const { ANY: ANY$1 } = Comparator$2;
const Range$3 = requireRange();
const satisfies$3 = satisfies_1;
const gt$1 = gt_1;
const lt$1 = lt_1;
const lte$1 = lte_1;
const gte$1 = gte_1;
const outside$3 = (version, range2, hilo, options) => {
  version = new SemVer$1(version, options);
  range2 = new Range$3(range2, options);
  let gtfn, ltefn, ltfn, comp, ecomp;
  switch (hilo) {
    case ">":
      gtfn = gt$1;
      ltefn = lte$1;
      ltfn = lt$1;
      comp = ">";
      ecomp = ">=";
      break;
    case "<":
      gtfn = lt$1;
      ltefn = gte$1;
      ltfn = gt$1;
      comp = "<";
      ecomp = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (satisfies$3(version, range2, options)) {
    return false;
  }
  for (let i = 0; i < range2.set.length; ++i) {
    const comparators = range2.set[i];
    let high = null;
    let low = null;
    comparators.forEach((comparator2) => {
      if (comparator2.semver === ANY$1) {
        comparator2 = new Comparator$2(">=0.0.0");
      }
      high = high || comparator2;
      low = low || comparator2;
      if (gtfn(comparator2.semver, high.semver, options)) {
        high = comparator2;
      } else if (ltfn(comparator2.semver, low.semver, options)) {
        low = comparator2;
      }
    });
    if (high.operator === comp || high.operator === ecomp) {
      return false;
    }
    if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
      return false;
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false;
    }
  }
  return true;
};
var outside_1 = outside$3;
const outside$2 = outside_1;
const gtr$1 = (version, range2, options) => outside$2(version, range2, ">", options);
var gtr_1 = gtr$1;
const outside$1 = outside_1;
const ltr$1 = (version, range2, options) => outside$1(version, range2, "<", options);
var ltr_1 = ltr$1;
const Range$2 = requireRange();
const intersects$1 = (r1, r2, options) => {
  r1 = new Range$2(r1, options);
  r2 = new Range$2(r2, options);
  return r1.intersects(r2, options);
};
var intersects_1 = intersects$1;
const satisfies$2 = satisfies_1;
const compare$2 = compare_1;
var simplify = (versions, range2, options) => {
  const set = [];
  let first = null;
  let prev = null;
  const v = versions.sort((a, b) => compare$2(a, b, options));
  for (const version of v) {
    const included = satisfies$2(version, range2, options);
    if (included) {
      prev = version;
      if (!first) {
        first = version;
      }
    } else {
      if (prev) {
        set.push([first, prev]);
      }
      prev = null;
      first = null;
    }
  }
  if (first) {
    set.push([first, null]);
  }
  const ranges = [];
  for (const [min, max] of set) {
    if (min === max) {
      ranges.push(min);
    } else if (!max && min === v[0]) {
      ranges.push("*");
    } else if (!max) {
      ranges.push(`>=${min}`);
    } else if (min === v[0]) {
      ranges.push(`<=${max}`);
    } else {
      ranges.push(`${min} - ${max}`);
    }
  }
  const simplified = ranges.join(" || ");
  const original = typeof range2.raw === "string" ? range2.raw : String(range2);
  return simplified.length < original.length ? simplified : range2;
};
const Range$1 = requireRange();
const Comparator$1 = requireComparator();
const { ANY } = Comparator$1;
const satisfies$1 = satisfies_1;
const compare$1 = compare_1;
const subset$1 = (sub, dom, options = {}) => {
  if (sub === dom) {
    return true;
  }
  sub = new Range$1(sub, options);
  dom = new Range$1(dom, options);
  let sawNonNull = false;
  OUTER: for (const simpleSub of sub.set) {
    for (const simpleDom of dom.set) {
      const isSub = simpleSubset(simpleSub, simpleDom, options);
      sawNonNull = sawNonNull || isSub !== null;
      if (isSub) {
        continue OUTER;
      }
    }
    if (sawNonNull) {
      return false;
    }
  }
  return true;
};
const minimumVersionWithPreRelease = [new Comparator$1(">=0.0.0-0")];
const minimumVersion = [new Comparator$1(">=0.0.0")];
const simpleSubset = (sub, dom, options) => {
  if (sub === dom) {
    return true;
  }
  if (sub.length === 1 && sub[0].semver === ANY) {
    if (dom.length === 1 && dom[0].semver === ANY) {
      return true;
    } else if (options.includePrerelease) {
      sub = minimumVersionWithPreRelease;
    } else {
      sub = minimumVersion;
    }
  }
  if (dom.length === 1 && dom[0].semver === ANY) {
    if (options.includePrerelease) {
      return true;
    } else {
      dom = minimumVersion;
    }
  }
  const eqSet = /* @__PURE__ */ new Set();
  let gt2, lt2;
  for (const c of sub) {
    if (c.operator === ">" || c.operator === ">=") {
      gt2 = higherGT(gt2, c, options);
    } else if (c.operator === "<" || c.operator === "<=") {
      lt2 = lowerLT(lt2, c, options);
    } else {
      eqSet.add(c.semver);
    }
  }
  if (eqSet.size > 1) {
    return null;
  }
  let gtltComp;
  if (gt2 && lt2) {
    gtltComp = compare$1(gt2.semver, lt2.semver, options);
    if (gtltComp > 0) {
      return null;
    } else if (gtltComp === 0 && (gt2.operator !== ">=" || lt2.operator !== "<=")) {
      return null;
    }
  }
  for (const eq2 of eqSet) {
    if (gt2 && !satisfies$1(eq2, String(gt2), options)) {
      return null;
    }
    if (lt2 && !satisfies$1(eq2, String(lt2), options)) {
      return null;
    }
    for (const c of dom) {
      if (!satisfies$1(eq2, String(c), options)) {
        return false;
      }
    }
    return true;
  }
  let higher, lower;
  let hasDomLT, hasDomGT;
  let needDomLTPre = lt2 && !options.includePrerelease && lt2.semver.prerelease.length ? lt2.semver : false;
  let needDomGTPre = gt2 && !options.includePrerelease && gt2.semver.prerelease.length ? gt2.semver : false;
  if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt2.operator === "<" && needDomLTPre.prerelease[0] === 0) {
    needDomLTPre = false;
  }
  for (const c of dom) {
    hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
    hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
    if (gt2) {
      if (needDomGTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
          needDomGTPre = false;
        }
      }
      if (c.operator === ">" || c.operator === ">=") {
        higher = higherGT(gt2, c, options);
        if (higher === c && higher !== gt2) {
          return false;
        }
      } else if (gt2.operator === ">=" && !satisfies$1(gt2.semver, String(c), options)) {
        return false;
      }
    }
    if (lt2) {
      if (needDomLTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
          needDomLTPre = false;
        }
      }
      if (c.operator === "<" || c.operator === "<=") {
        lower = lowerLT(lt2, c, options);
        if (lower === c && lower !== lt2) {
          return false;
        }
      } else if (lt2.operator === "<=" && !satisfies$1(lt2.semver, String(c), options)) {
        return false;
      }
    }
    if (!c.operator && (lt2 || gt2) && gtltComp !== 0) {
      return false;
    }
  }
  if (gt2 && hasDomLT && !lt2 && gtltComp !== 0) {
    return false;
  }
  if (lt2 && hasDomGT && !gt2 && gtltComp !== 0) {
    return false;
  }
  if (needDomGTPre || needDomLTPre) {
    return false;
  }
  return true;
};
const higherGT = (a, b, options) => {
  if (!a) {
    return b;
  }
  const comp = compare$1(a.semver, b.semver, options);
  return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
};
const lowerLT = (a, b, options) => {
  if (!a) {
    return b;
  }
  const comp = compare$1(a.semver, b.semver, options);
  return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
};
var subset_1 = subset$1;
const internalRe = reExports;
const constants = constants$1;
const SemVer2 = semver$1;
const identifiers = identifiers$1;
const parse = parse_1;
const valid = valid_1;
const clean = clean_1;
const inc = inc_1;
const diff = diff_1;
const major = major_1;
const minor = minor_1;
const patch = patch_1;
const prerelease = prerelease_1;
const compare = compare_1;
const rcompare = rcompare_1;
const compareLoose = compareLoose_1;
const compareBuild = compareBuild_1;
const sort = sort_1;
const rsort = rsort_1;
const gt = gt_1;
const lt = lt_1;
const eq = eq_1;
const neq = neq_1;
const gte = gte_1;
const lte = lte_1;
const cmp = cmp_1;
const coerce = coerce_1;
const Comparator = requireComparator();
const Range = requireRange();
const satisfies = satisfies_1;
const toComparators = toComparators_1;
const maxSatisfying = maxSatisfying_1;
const minSatisfying = minSatisfying_1;
const minVersion = minVersion_1;
const validRange = valid$1;
const outside = outside_1;
const gtr = gtr_1;
const ltr = ltr_1;
const intersects = intersects_1;
const simplifyRange = simplify;
const subset = subset_1;
var semver = {
  parse,
  valid,
  clean,
  inc,
  diff,
  major,
  minor,
  patch,
  prerelease,
  compare,
  rcompare,
  compareLoose,
  compareBuild,
  sort,
  rsort,
  gt,
  lt,
  eq,
  neq,
  gte,
  lte,
  cmp,
  coerce,
  Comparator,
  Range,
  satisfies,
  toComparators,
  maxSatisfying,
  minSatisfying,
  minVersion,
  validRange,
  outside,
  gtr,
  ltr,
  intersects,
  simplifyRange,
  subset,
  SemVer: SemVer2,
  re: internalRe.re,
  src: internalRe.src,
  tokens: internalRe.t,
  SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: constants.RELEASE_TYPES,
  compareIdentifiers: identifiers.compareIdentifiers,
  rcompareIdentifiers: identifiers.rcompareIdentifiers
};
var onetime$1 = { exports: {} };
var mimicFn$2 = { exports: {} };
const mimicFn$1 = (to, from) => {
  for (const prop of Reflect.ownKeys(from)) {
    Object.defineProperty(to, prop, Object.getOwnPropertyDescriptor(from, prop));
  }
  return to;
};
mimicFn$2.exports = mimicFn$1;
mimicFn$2.exports.default = mimicFn$1;
var mimicFnExports = mimicFn$2.exports;
const mimicFn = mimicFnExports;
const calledFunctions = /* @__PURE__ */ new WeakMap();
const onetime = (function_, options = {}) => {
  if (typeof function_ !== "function") {
    throw new TypeError("Expected a function");
  }
  let returnValue;
  let callCount = 0;
  const functionName = function_.displayName || function_.name || "<anonymous>";
  const onetime2 = function(...arguments_) {
    calledFunctions.set(onetime2, ++callCount);
    if (callCount === 1) {
      returnValue = function_.apply(this, arguments_);
      function_ = null;
    } else if (options.throw === true) {
      throw new Error(`Function \`${functionName}\` can only be called once`);
    }
    return returnValue;
  };
  mimicFn(onetime2, function_);
  calledFunctions.set(onetime2, callCount);
  return onetime2;
};
onetime$1.exports = onetime;
onetime$1.exports.default = onetime;
onetime$1.exports.callCount = (function_) => {
  if (!calledFunctions.has(function_)) {
    throw new Error(`The given function \`${function_.name}\` is not wrapped by the \`onetime\` package`);
  }
  return calledFunctions.get(function_);
};
var onetimeExports = onetime$1.exports;
(function(module, exports$1) {
  var __classPrivateFieldSet = commonjsGlobal && commonjsGlobal.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  };
  var __classPrivateFieldGet = commonjsGlobal && commonjsGlobal.__classPrivateFieldGet || function(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  };
  var _a, _b;
  var _Conf_validator, _Conf_encryptionKey, _Conf_options, _Conf_defaultValues;
  Object.defineProperty(exports$1, "__esModule", { value: true });
  const util_12 = require$$4;
  const fs2 = require$$0;
  const path2 = require$$1$1;
  const crypto = require$$3$1;
  const assert = require$$5$1;
  const events_1 = require$$5;
  const dotProp$1 = dotProp;
  const pkgUp2 = pkgUpExports;
  const envPaths2 = envPathsExports;
  const atomically = dist$1;
  const ajv_1 = ajvExports;
  const ajv_formats_1 = distExports;
  const debounceFn$1 = debounceFn;
  const semver$12 = semver;
  const onetime2 = onetimeExports;
  const encryptionAlgorithm = "aes-256-cbc";
  const createPlainObject = () => {
    return /* @__PURE__ */ Object.create(null);
  };
  const isExist = (data) => {
    return data !== void 0 && data !== null;
  };
  let parentDir = "";
  try {
    delete require.cache[__filename];
    parentDir = path2.dirname((_b = (_a = module.parent) === null || _a === void 0 ? void 0 : _a.filename) !== null && _b !== void 0 ? _b : ".");
  } catch (_c) {
  }
  const checkValueType = (key, value) => {
    const nonJsonTypes = /* @__PURE__ */ new Set([
      "undefined",
      "symbol",
      "function"
    ]);
    const type2 = typeof value;
    if (nonJsonTypes.has(type2)) {
      throw new TypeError(`Setting a value of type \`${type2}\` for key \`${key}\` is not allowed as it's not supported by JSON`);
    }
  };
  const INTERNAL_KEY = "__internal__";
  const MIGRATION_KEY = `${INTERNAL_KEY}.migrations.version`;
  class Conf2 {
    constructor(partialOptions = {}) {
      var _a2;
      _Conf_validator.set(this, void 0);
      _Conf_encryptionKey.set(this, void 0);
      _Conf_options.set(this, void 0);
      _Conf_defaultValues.set(this, {});
      this._deserialize = (value) => JSON.parse(value);
      this._serialize = (value) => JSON.stringify(value, void 0, "	");
      const options = {
        configName: "config",
        fileExtension: "json",
        projectSuffix: "nodejs",
        clearInvalidConfig: false,
        accessPropertiesByDotNotation: true,
        configFileMode: 438,
        ...partialOptions
      };
      const getPackageData = onetime2(() => {
        const packagePath = pkgUp2.sync({ cwd: parentDir });
        const packageData = packagePath && JSON.parse(fs2.readFileSync(packagePath, "utf8"));
        return packageData !== null && packageData !== void 0 ? packageData : {};
      });
      if (!options.cwd) {
        if (!options.projectName) {
          options.projectName = getPackageData().name;
        }
        if (!options.projectName) {
          throw new Error("Project name could not be inferred. Please specify the `projectName` option.");
        }
        options.cwd = envPaths2(options.projectName, { suffix: options.projectSuffix }).config;
      }
      __classPrivateFieldSet(this, _Conf_options, options, "f");
      if (options.schema) {
        if (typeof options.schema !== "object") {
          throw new TypeError("The `schema` option must be an object.");
        }
        const ajv2 = new ajv_1.default({
          allErrors: true,
          useDefaults: true
        });
        (0, ajv_formats_1.default)(ajv2);
        const schema = {
          type: "object",
          properties: options.schema
        };
        __classPrivateFieldSet(this, _Conf_validator, ajv2.compile(schema), "f");
        for (const [key, value] of Object.entries(options.schema)) {
          if (value === null || value === void 0 ? void 0 : value.default) {
            __classPrivateFieldGet(this, _Conf_defaultValues, "f")[key] = value.default;
          }
        }
      }
      if (options.defaults) {
        __classPrivateFieldSet(this, _Conf_defaultValues, {
          ...__classPrivateFieldGet(this, _Conf_defaultValues, "f"),
          ...options.defaults
        }, "f");
      }
      if (options.serialize) {
        this._serialize = options.serialize;
      }
      if (options.deserialize) {
        this._deserialize = options.deserialize;
      }
      this.events = new events_1.EventEmitter();
      __classPrivateFieldSet(this, _Conf_encryptionKey, options.encryptionKey, "f");
      const fileExtension = options.fileExtension ? `.${options.fileExtension}` : "";
      this.path = path2.resolve(options.cwd, `${(_a2 = options.configName) !== null && _a2 !== void 0 ? _a2 : "config"}${fileExtension}`);
      const fileStore = this.store;
      const store2 = Object.assign(createPlainObject(), options.defaults, fileStore);
      this._validate(store2);
      try {
        assert.deepEqual(fileStore, store2);
      } catch (_b2) {
        this.store = store2;
      }
      if (options.watch) {
        this._watch();
      }
      if (options.migrations) {
        if (!options.projectVersion) {
          options.projectVersion = getPackageData().version;
        }
        if (!options.projectVersion) {
          throw new Error("Project version could not be inferred. Please specify the `projectVersion` option.");
        }
        this._migrate(options.migrations, options.projectVersion, options.beforeEachMigration);
      }
    }
    get(key, defaultValue) {
      if (__classPrivateFieldGet(this, _Conf_options, "f").accessPropertiesByDotNotation) {
        return this._get(key, defaultValue);
      }
      const { store: store2 } = this;
      return key in store2 ? store2[key] : defaultValue;
    }
    set(key, value) {
      if (typeof key !== "string" && typeof key !== "object") {
        throw new TypeError(`Expected \`key\` to be of type \`string\` or \`object\`, got ${typeof key}`);
      }
      if (typeof key !== "object" && value === void 0) {
        throw new TypeError("Use `delete()` to clear values");
      }
      if (this._containsReservedKey(key)) {
        throw new TypeError(`Please don't use the ${INTERNAL_KEY} key, as it's used to manage this module internal operations.`);
      }
      const { store: store2 } = this;
      const set = (key2, value2) => {
        checkValueType(key2, value2);
        if (__classPrivateFieldGet(this, _Conf_options, "f").accessPropertiesByDotNotation) {
          dotProp$1.set(store2, key2, value2);
        } else {
          store2[key2] = value2;
        }
      };
      if (typeof key === "object") {
        const object = key;
        for (const [key2, value2] of Object.entries(object)) {
          set(key2, value2);
        }
      } else {
        set(key, value);
      }
      this.store = store2;
    }
    /**
        Check if an item exists.
    
        @param key - The key of the item to check.
        */
    has(key) {
      if (__classPrivateFieldGet(this, _Conf_options, "f").accessPropertiesByDotNotation) {
        return dotProp$1.has(this.store, key);
      }
      return key in this.store;
    }
    /**
        Reset items to their default values, as defined by the `defaults` or `schema` option.
    
        @see `clear()` to reset all items.
    
        @param keys - The keys of the items to reset.
        */
    reset(...keys) {
      for (const key of keys) {
        if (isExist(__classPrivateFieldGet(this, _Conf_defaultValues, "f")[key])) {
          this.set(key, __classPrivateFieldGet(this, _Conf_defaultValues, "f")[key]);
        }
      }
    }
    /**
        Delete an item.
    
        @param key - The key of the item to delete.
        */
    delete(key) {
      const { store: store2 } = this;
      if (__classPrivateFieldGet(this, _Conf_options, "f").accessPropertiesByDotNotation) {
        dotProp$1.delete(store2, key);
      } else {
        delete store2[key];
      }
      this.store = store2;
    }
    /**
        Delete all items.
    
        This resets known items to their default values, if defined by the `defaults` or `schema` option.
        */
    clear() {
      this.store = createPlainObject();
      for (const key of Object.keys(__classPrivateFieldGet(this, _Conf_defaultValues, "f"))) {
        this.reset(key);
      }
    }
    /**
        Watches the given `key`, calling `callback` on any changes.
    
        @param key - The key wo watch.
        @param callback - A callback function that is called on any changes. When a `key` is first set `oldValue` will be `undefined`, and when a key is deleted `newValue` will be `undefined`.
        @returns A function, that when called, will unsubscribe.
        */
    onDidChange(key, callback) {
      if (typeof key !== "string") {
        throw new TypeError(`Expected \`key\` to be of type \`string\`, got ${typeof key}`);
      }
      if (typeof callback !== "function") {
        throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof callback}`);
      }
      return this._handleChange(() => this.get(key), callback);
    }
    /**
        Watches the whole config object, calling `callback` on any changes.
    
        @param callback - A callback function that is called on any changes. When a `key` is first set `oldValue` will be `undefined`, and when a key is deleted `newValue` will be `undefined`.
        @returns A function, that when called, will unsubscribe.
        */
    onDidAnyChange(callback) {
      if (typeof callback !== "function") {
        throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof callback}`);
      }
      return this._handleChange(() => this.store, callback);
    }
    get size() {
      return Object.keys(this.store).length;
    }
    get store() {
      try {
        const data = fs2.readFileSync(this.path, __classPrivateFieldGet(this, _Conf_encryptionKey, "f") ? null : "utf8");
        const dataString = this._encryptData(data);
        const deserializedData = this._deserialize(dataString);
        this._validate(deserializedData);
        return Object.assign(createPlainObject(), deserializedData);
      } catch (error2) {
        if ((error2 === null || error2 === void 0 ? void 0 : error2.code) === "ENOENT") {
          this._ensureDirectory();
          return createPlainObject();
        }
        if (__classPrivateFieldGet(this, _Conf_options, "f").clearInvalidConfig && error2.name === "SyntaxError") {
          return createPlainObject();
        }
        throw error2;
      }
    }
    set store(value) {
      this._ensureDirectory();
      this._validate(value);
      this._write(value);
      this.events.emit("change");
    }
    *[(_Conf_validator = /* @__PURE__ */ new WeakMap(), _Conf_encryptionKey = /* @__PURE__ */ new WeakMap(), _Conf_options = /* @__PURE__ */ new WeakMap(), _Conf_defaultValues = /* @__PURE__ */ new WeakMap(), Symbol.iterator)]() {
      for (const [key, value] of Object.entries(this.store)) {
        yield [key, value];
      }
    }
    _encryptData(data) {
      if (!__classPrivateFieldGet(this, _Conf_encryptionKey, "f")) {
        return data.toString();
      }
      try {
        if (__classPrivateFieldGet(this, _Conf_encryptionKey, "f")) {
          try {
            if (data.slice(16, 17).toString() === ":") {
              const initializationVector = data.slice(0, 16);
              const password = crypto.pbkdf2Sync(__classPrivateFieldGet(this, _Conf_encryptionKey, "f"), initializationVector.toString(), 1e4, 32, "sha512");
              const decipher = crypto.createDecipheriv(encryptionAlgorithm, password, initializationVector);
              data = Buffer.concat([decipher.update(Buffer.from(data.slice(17))), decipher.final()]).toString("utf8");
            } else {
              const decipher = crypto.createDecipher(encryptionAlgorithm, __classPrivateFieldGet(this, _Conf_encryptionKey, "f"));
              data = Buffer.concat([decipher.update(Buffer.from(data)), decipher.final()]).toString("utf8");
            }
          } catch (_a2) {
          }
        }
      } catch (_b2) {
      }
      return data.toString();
    }
    _handleChange(getter, callback) {
      let currentValue = getter();
      const onChange = () => {
        const oldValue = currentValue;
        const newValue = getter();
        if ((0, util_12.isDeepStrictEqual)(newValue, oldValue)) {
          return;
        }
        currentValue = newValue;
        callback.call(this, newValue, oldValue);
      };
      this.events.on("change", onChange);
      return () => this.events.removeListener("change", onChange);
    }
    _validate(data) {
      if (!__classPrivateFieldGet(this, _Conf_validator, "f")) {
        return;
      }
      const valid2 = __classPrivateFieldGet(this, _Conf_validator, "f").call(this, data);
      if (valid2 || !__classPrivateFieldGet(this, _Conf_validator, "f").errors) {
        return;
      }
      const errors2 = __classPrivateFieldGet(this, _Conf_validator, "f").errors.map(({ instancePath, message = "" }) => `\`${instancePath.slice(1)}\` ${message}`);
      throw new Error("Config schema violation: " + errors2.join("; "));
    }
    _ensureDirectory() {
      fs2.mkdirSync(path2.dirname(this.path), { recursive: true });
    }
    _write(value) {
      let data = this._serialize(value);
      if (__classPrivateFieldGet(this, _Conf_encryptionKey, "f")) {
        const initializationVector = crypto.randomBytes(16);
        const password = crypto.pbkdf2Sync(__classPrivateFieldGet(this, _Conf_encryptionKey, "f"), initializationVector.toString(), 1e4, 32, "sha512");
        const cipher = crypto.createCipheriv(encryptionAlgorithm, password, initializationVector);
        data = Buffer.concat([initializationVector, Buffer.from(":"), cipher.update(Buffer.from(data)), cipher.final()]);
      }
      if (process.env.SNAP) {
        fs2.writeFileSync(this.path, data, { mode: __classPrivateFieldGet(this, _Conf_options, "f").configFileMode });
      } else {
        try {
          atomically.writeFileSync(this.path, data, { mode: __classPrivateFieldGet(this, _Conf_options, "f").configFileMode });
        } catch (error2) {
          if ((error2 === null || error2 === void 0 ? void 0 : error2.code) === "EXDEV") {
            fs2.writeFileSync(this.path, data, { mode: __classPrivateFieldGet(this, _Conf_options, "f").configFileMode });
            return;
          }
          throw error2;
        }
      }
    }
    _watch() {
      this._ensureDirectory();
      if (!fs2.existsSync(this.path)) {
        this._write(createPlainObject());
      }
      if (process.platform === "win32") {
        fs2.watch(this.path, { persistent: false }, debounceFn$1(() => {
          this.events.emit("change");
        }, { wait: 100 }));
      } else {
        fs2.watchFile(this.path, { persistent: false }, debounceFn$1(() => {
          this.events.emit("change");
        }, { wait: 5e3 }));
      }
    }
    _migrate(migrations, versionToMigrate, beforeEachMigration) {
      let previousMigratedVersion = this._get(MIGRATION_KEY, "0.0.0");
      const newerVersions = Object.keys(migrations).filter((candidateVersion) => this._shouldPerformMigration(candidateVersion, previousMigratedVersion, versionToMigrate));
      let storeBackup = { ...this.store };
      for (const version of newerVersions) {
        try {
          if (beforeEachMigration) {
            beforeEachMigration(this, {
              fromVersion: previousMigratedVersion,
              toVersion: version,
              finalVersion: versionToMigrate,
              versions: newerVersions
            });
          }
          const migration = migrations[version];
          migration(this);
          this._set(MIGRATION_KEY, version);
          previousMigratedVersion = version;
          storeBackup = { ...this.store };
        } catch (error2) {
          this.store = storeBackup;
          throw new Error(`Something went wrong during the migration! Changes applied to the store until this failed migration will be restored. ${error2}`);
        }
      }
      if (this._isVersionInRangeFormat(previousMigratedVersion) || !semver$12.eq(previousMigratedVersion, versionToMigrate)) {
        this._set(MIGRATION_KEY, versionToMigrate);
      }
    }
    _containsReservedKey(key) {
      if (typeof key === "object") {
        const firsKey = Object.keys(key)[0];
        if (firsKey === INTERNAL_KEY) {
          return true;
        }
      }
      if (typeof key !== "string") {
        return false;
      }
      if (__classPrivateFieldGet(this, _Conf_options, "f").accessPropertiesByDotNotation) {
        if (key.startsWith(`${INTERNAL_KEY}.`)) {
          return true;
        }
        return false;
      }
      return false;
    }
    _isVersionInRangeFormat(version) {
      return semver$12.clean(version) === null;
    }
    _shouldPerformMigration(candidateVersion, previousMigratedVersion, versionToMigrate) {
      if (this._isVersionInRangeFormat(candidateVersion)) {
        if (previousMigratedVersion !== "0.0.0" && semver$12.satisfies(previousMigratedVersion, candidateVersion)) {
          return false;
        }
        return semver$12.satisfies(versionToMigrate, candidateVersion);
      }
      if (semver$12.lte(candidateVersion, previousMigratedVersion)) {
        return false;
      }
      if (semver$12.gt(candidateVersion, versionToMigrate)) {
        return false;
      }
      return true;
    }
    _get(key, defaultValue) {
      return dotProp$1.get(this.store, key, defaultValue);
    }
    _set(key, value) {
      const { store: store2 } = this;
      dotProp$1.set(store2, key, value);
      this.store = store2;
    }
  }
  exports$1.default = Conf2;
  module.exports = Conf2;
  module.exports.default = Conf2;
})(source, source.exports);
var sourceExports = source.exports;
const path = require$$1$1;
const { app, ipcMain, ipcRenderer, shell } = require$$1;
const Conf = sourceExports;
let isInitialized = false;
const initDataListener = () => {
  if (!ipcMain || !app) {
    throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
  }
  const appData = {
    defaultCwd: app.getPath("userData"),
    appVersion: app.getVersion()
  };
  if (isInitialized) {
    return appData;
  }
  ipcMain.on("electron-store-get-data", (event) => {
    event.returnValue = appData;
  });
  isInitialized = true;
  return appData;
};
class ElectronStore extends Conf {
  constructor(options) {
    let defaultCwd;
    let appVersion;
    if (ipcRenderer) {
      const appData = ipcRenderer.sendSync("electron-store-get-data");
      if (!appData) {
        throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
      }
      ({ defaultCwd, appVersion } = appData);
    } else if (ipcMain && app) {
      ({ defaultCwd, appVersion } = initDataListener());
    }
    options = {
      name: "config",
      ...options
    };
    if (!options.projectVersion) {
      options.projectVersion = appVersion;
    }
    if (options.cwd) {
      options.cwd = path.isAbsolute(options.cwd) ? options.cwd : path.join(defaultCwd, options.cwd);
    } else {
      options.cwd = defaultCwd;
    }
    options.configName = options.name;
    delete options.name;
    super(options);
  }
  static initRenderer() {
    initDataListener();
  }
  async openInEditor() {
    const error2 = await shell.openPath(this.path);
    if (error2) {
      throw new Error(error2);
    }
  }
}
var electronStore = ElectronStore;
const Store = /* @__PURE__ */ getDefaultExportFromCjs(electronStore);
const store = new Store();
const setItem = (name, item) => {
  store.set(name, item);
};
const getItem = (name) => {
  return store.get(name);
};
const delItem = (name) => {
  store.delete(name);
};
const storeListener = () => {
  require$$1.ipcMain.on("set-item", (event, name, item) => {
    setItem(name, item);
  });
  require$$1.ipcMain.on("del-item", (event, name) => {
    delItem(name);
  });
  require$$1.ipcMain.handle("get-item", async (event, name) => {
    return await getItem(name);
  });
};
windowControlListener();
fileListener();
ffmpegListener();
storeListener();
require$$1.ipcMain.on("store-set", (event, objData) => {
  CreateWindow.travWindowSend(
    objData,
    require$$1.BrowserWindow.fromWebContents(event.sender)
  );
});
require$$1.app.commandLine.appendSwitch("--ignore-certificate-errors", "true");
require$$1.protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } }
]);
require$$1.app.whenReady().then(() => {
  createMainWindow();
  require$$1.app.on("activate", () => {
    if (require$$1.BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});
const WINDOW_WIDTH = 1e3;
const WINDOW_HEIGHT = 830;
const createMainWindow = async () => {
  let mainW = new CreateWindow();
  console.info("createMainWindow");
  mainW.createWindow({
    route: "/",
    isMainWin: true,
    // maxWidth: WINDOW_WIDTH,
    // maxHeight: WINDOW_HEIGHT,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 800,
    minHeight: 680,
    resizable: true,
    windowName: "main"
  });
};
require$$1.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") require$$1.app.quit();
});
