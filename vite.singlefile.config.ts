import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'node:fs'
import path from 'path'

/**
 * Inline the icon links so the output is genuinely ONE file.
 *
 * viteSingleFile inlines JS and CSS but leaves `<link rel="icon">` pointing at a sibling
 * asset — which 404s the moment someone copies just the HTML somewhere else. The favicon
 * becomes a data URI; the apple-touch-icon is dropped, since a 180px PNG is ~10KB of
 * base64 for something only iOS home-screen bookmarks read.
 */
function inlineIcons(): Plugin {
  return {
    name: 'inline-icons',
    enforce: 'post',
    transformIndexHtml(html) {
      const favicon = path.resolve(__dirname, 'public/favicon.svg')
      let out = html.replace(
        /<link rel="apple-touch-icon"[^>]*>\s*/,
        '',
      )
      if (fs.existsSync(favicon)) {
        const dataUri = `data:image/svg+xml;base64,${fs.readFileSync(favicon).toString('base64')}`
        out = out.replace(/(<link rel="icon"[^>]*href=")[^"]*(")/, `$1${dataUri}$2`)
      }
      return out
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    inlineIcons(),
  ],
  build: {
    outDir: 'dist-single',
    // Keeps every small asset inline rather than emitting a sibling file the single-file
    // output would not carry. Note this does NOT cover the DM Sans @import in index.css —
    // that is a runtime fetch to Google Fonts, which an offline single-file copy cannot
    // reach (roadmap R-37), nor public/easter_egg.jpg, which is loaded by URL at runtime.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
