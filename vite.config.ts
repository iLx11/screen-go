import { fileURLToPath, URL } from 'node:url'
import * as path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron/renderer'
import polyfillExports from 'vite-plugin-electron/polyfill-exports'
// import optimizer from 'vite-plugin-optimizer'

let getReplacer = () => {
  let externalModels = ["electron", "os", "fs-extra", "path", "events", "child_process", "crypto", "http", "buffer", "url", "better-sqlite3", "knex"];
  let result = {};
  for (let item of externalModels) {
    (result as any)[item] = () => ({
      find: new RegExp(`^${item}$`),
      code: `const ${item} = require('${item}');export { ${item} as default }`,
    });
  }
  return result;
};

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",   
  plugins: [
    // optimizer(getReplacer()),
    vue(), 
    electron({
      main:{
        // 入口文件的路径
        entry: "electron/main/main.ts",
        vite: {
          build: {
            // 将入口文件转为 js 后输出到指定目录
            outDir: "appDir/main"
          }
        }
      },
      preload: {
        // 预加载文件的绝对路径 
        input: path.join(__dirname, "./electron/main/preload.ts"), // 预加载文件
        vite: {
          build: {
            // 将预加载文件转为 js 后输出到指定目录
            outDir: "appDir/preload"
          }
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        javascriptEnabled: true,
        additionalData: '@import "./src/styles/global.scss";',
      },
    },
  },
  build: {
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 分包
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id
              .toString()
              .split("node_modules/")[1]
              .split("/")[0]
              .toString();
          }
        },
      },
    },
  }
})
