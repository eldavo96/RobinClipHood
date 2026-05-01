import { FFmpeg } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'
import { fetchFile, toBlobURL } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js'

const CDN = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'
let ff = null

async function load() {
  ff = new FFmpeg()
  ff.on('progress', ({ progress }) => {
    self.postMessage({ type: 'progress', progress: Math.round(progress * 100) })
  })
  await ff.load({
    coreURL: await toBlobURL(`${CDN}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${CDN}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  self.postMessage({ type: 'ready' })
}

async function extractAudio(buffer) {
  await ff.writeFile('input.mp4', new Uint8Array(buffer))
  await ff.exec(['-i', 'input.mp4', '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', 'audio.wav'])
  const data = await ff.readFile('audio.wav')
  await ff.deleteFile('input.mp4')
  await ff.deleteFile('audio.wav')
  self.postMessage({ type: 'audioReady', buffer: data.buffer }, [data.buffer])
}

async function exportClip(buffer, startTime, endTime, clipId) {
  const inp = `inp_${clipId}.mp4`
  const out = `out_${clipId}.mp4`
  await ff.writeFile(inp, new Uint8Array(buffer))
  await ff.exec([
    '-ss', String(startTime), '-to', String(endTime),
    '-i', inp,
    '-vf', 'crop=ih*9/16:ih,scale=1080:1920,setsar=1',
    '-c:v', 'libx264', '-crf', '23', '-preset', 'fast',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
    out,
  ])
  const clipData = await ff.readFile(out)
  await ff.deleteFile(inp)
  await ff.deleteFile(out)
  self.postMessage({ type: 'clipReady', clipId, buffer: clipData.buffer }, [clipData.buffer])
}

self.onmessage = async (e) => {
  const { type, buffer, startTime, endTime, clipId } = e.data
  try {
    if (type === 'load') await load()
    else if (type === 'extractAudio') await extractAudio(buffer)
    else if (type === 'exportClip') await exportClip(buffer, startTime, endTime, clipId)
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message })
  }
}