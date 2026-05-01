#!/usr/bin/env node
// scripts/copy-ffmpeg.js
// Copia los binarios de FFmpeg.wasm a /public/ffmpeg/ después de npm install

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
const DEST = path.join(__dirname, '..', 'public', 'ffmpeg')

const FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js']

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true })

let ok = 0
FILES.forEach((file) => {
  const src = path.join(SRC, file)
  const dest = path.join(DEST, file)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
    console.log(`✓ Copiado: ${file} (${(fs.statSync(dest).size / 1024 / 1024).toFixed(1)} MB)`)
    ok++
  } else {
    console.warn(`✗ No encontrado: ${src}`)
    console.warn('  Asegúrate de que @ffmpeg/core está instalado: npm install @ffmpeg/core')
  }
})

if (ok === FILES.length) {
  console.log('\n✅ FFmpeg WASM listo en /public/ffmpeg/')
} else {
  console.error('\n❌ Faltan archivos. Ejecuta: npm install @ffmpeg/core')
  process.exit(1)
}
