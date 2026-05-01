# No-Server AI Video Clipper

> Web app de edición automática de videos 100% client-side.
> Stack: Next.js 14 · FFmpeg.wasm · Whisper (transformers.js) · Tailwind CSS

## Setup rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar binarios de FFmpeg a /public/ffmpeg/
# Ver sección "FFmpeg WASM Binaries" más abajo

# 3. Desarrollo local
npm run dev

# 4. Build para producción
npm run build && npm run start
```

## FFmpeg WASM Binaries

Los binarios de FFmpeg.wasm deben copiarse manualmente a `/public/ffmpeg/`:

```bash
# Ejecuta este script después de npm install
node scripts/copy-ffmpeg.js
```

O manualmente:
```bash
cp node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js public/ffmpeg/
cp node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm public/ffmpeg/
cp node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.worker.js public/ffmpeg/
```

## Configuración de AdSense

1. Crea cuenta en [Google AdSense](https://adsense.google.com)
2. Obtén tu Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
3. Reemplaza en `src/app/layout.tsx` y `src/components/AdSlot.tsx`
4. Crea slots de anuncios en el panel de AdSense
5. Reemplaza los slotIds en `src/app/page.tsx`

## Deploy en Vercel

```bash
npx vercel --prod
```

Los headers COOP/COEP están configurados automáticamente en `next.config.js`.

## Estructura

```
src/
├── app/           # Next.js App Router
├── components/    # UI components
├── hooks/         # useFFmpeg, useWhisper, useAutoClipper
├── lib/           # clipDetector, memoryManager, adController
└── types/         # TypeScript interfaces
```
