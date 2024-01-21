# SCREEN-GO

此项目基于大佬 [yhf](https://github.com/yhf98 ) 的项目思路所开发，并遵循 MIT 开源协议

 此项目为图片取模软件

🍚 可以直接模拟对硬件屏幕的布局和显示进行编辑和调整

 🍫  可以导入任何类型的图片

🍜 编辑文字与图形

🥘 添加与调整不同滤镜

🥠 任意缩放与裁剪图片

🍵 支持单色和彩色图片取模，并直接生成可修改可一键复制的图片取模数组（支持正则替换修改）。

 之后应该会不断优化此软件或开发更多有意思的软件，感谢您的支持！！！



### 安装项目所需包文件

需要安装 node ，可以访问 nodejs 官网安装；还需安装 pnpm，也可以不安装，直接把 pnpm 替换为 npm run 即可

```sh
pnpm install
```

### 项目开发

```sh
pnpm start
```

### 项目打包

```sh
pnpm electron:build
```



## 项目结构

```bash
│  .gitignore
	// 2.0.0 版本的图标 PS 文件
│  2_0_0icon.psd
│  env.d.ts
│  icon.psd
│  index.html
│  package.json
│  pnpm-lock.yaml
	// 介绍文件
│  README.md
│  tsconfig.app.json
│  tsconfig.json
│  tsconfig.node.json
	// 修改的 tui-image-editor 组件的样式，导入包后替换即可
│  tui-image-editor.css
│  vite.config.ts
│  
	// 主进程
├─electron
		// 主进程逻辑的执行层
│  ├─controller
			// 包检查脚本
│  │      checkPackage.js
			// 图片信息转取模数组的执行脚本
│  │      ImageToHexArray.js
			// 图片编辑与裁剪的执行脚本
│  │      picDataEditor.js
			// 窗口事件的执行
│  │      windowControl.js
│  │      
│  └─main
			// 主进程入口文件
│          main.js
			// 预加载文件，渲染进程与主进程在此文件中交互
│          preload.js
│          
├─public
│  │  favicon.ico
		// 软件图标文件，可以进行替换
│  │  icon.ico
│  │  
│  └─img
			// 黑白色的画布基础图片
│          black.png
│          blank.png
│  
	// 渲染进程
└─src
    │  App.vue
    │  main.ts
    │  
    ├─assets
    │  ├─font
    │  │      ceyy.ttf
    │  │      
    │  └─img
    │          black.png
    │          blank.png
    │    
    	// 所有没有通过路由显示的组件
    ├─components
    │      CommitBox.vue
    │      CropConfig.vue
    │      FuncBox.vue
    │      HeadMessage.vue
    │      ImageConfig.vue
    │      ImageEditor.vue
    │      PopBox.vue
    │      ResultData.vue
    │      ResultDataConfig.vue
    │      ThresholdConfig.vue
    │      WindowTools.vue
    │      
    ├─router
    │      index.ts
    │      
    	// pinia stores （没有进一步解耦，所有的都写在一起了）
    ├─stores
    │      counter.ts
    │      store.ts
    │  
    	// 默认与基础样式
    ├─styles
    │      index.scss
    │      reset.scss
    │      variable.scss
    │  
    	// 渲染进程所使用的工具函数，操作图片的函数适用于渲染层使用 Node 包，但是不推荐
    ├─utils
    │      ImageToHexArray.ts
    │      imgTools.ts
    │      storage.ts
    │      theme.ts
    │      
    └─window
            HomePage.vue
```



 
