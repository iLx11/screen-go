import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
// import VueDevTools from 'vite-plugin-vue-devtools'
// import electronRenderer from 'vite-plugin-electron/renderer'
// import polyfillExports from 'vite-plugin-electron/polyfill-exports'
// import optimizer from 'vite-plugin-optimizer'
// import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'path'

let getReplacer = () => {
  let externalModels = [
    'electron',
    'os',
    'fs-extra',
    'path',
    'events',
    'child_process',
    'crypto',
    'http',
    'buffer',
    'url',
    'better-sqlite3',
    'knex',
  ]
  let result = {}
  for (let item of externalModels) {
    ;(result as any)[item] = () => ({
      find: new RegExp(`^${item}$`),
      code: `const ${item} = require('${item}');export { ${item} as default }`,
    })
  }
  return result
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  define: {
    // 过滤 React defaultProps 警告
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  plugins: [
    // optimizer(getReplacer()),
    // VueDevTools(),
    vue(),

    electron([
      {
        entry: 'electron/main/main.ts',
        vite: {
          build: {
            outDir: 'appDir/main',
          },
        },
      },
      {
        entry: 'electron/main/preload.ts',
        vite: {
          build: {
            outDir: 'appDir/preload',
          },
        },
      },
    ]),
  ],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "ilx1-x-style/base/global.scss" as global;',
        api: 'modern', // 添加这一行以使用新的JS API
        silenceDeprecations: ['legacy-js-api'], // 可选：静默此特定警告
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
          if (id.includes('node_modules')) {
            return id
              .toString()
              .split('node_modules/')[1]
              .split('/')[0]
              .toString()
          }
        },
      },
    },
  },
})
