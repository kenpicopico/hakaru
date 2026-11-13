import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// @fontsource の CSS は woff2 と woff の両方を指定しているが、Chrome は woff2 しか使わない。
// woff の指定を消して、使われないフォントファイルが拡張機能に含まれないようにする。
const woff2Only = (): Plugin => ({
  name: 'woff2-only',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('@fontsource') || !id.endsWith('.css')) return
    return code.replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, '')
  },
})

export default defineConfig({
  plugins: [react(), woff2Only()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        background: 'src/background.ts'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'
        }
      }
    }
  },
})
