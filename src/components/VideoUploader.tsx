'use client'

import { useCallback, useState } from 'react'

interface Props {
  onFile: (file: File, options: ClipOptions) => void
  disabled?: boolean
}

export interface ClipOptions {
  minDuration: number
  maxDuration: number
  maxClips: number
  background: 'blur' | 'black'
}

const ACCEPTED = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
const MAX_SIZE_GB = 4

function getWarning(file: File): { level: 'ok' | 'slow' | 'veryslow'; time: string; tip: string } | null {
  const gb = file.size / 1024 ** 3
  const mb = file.size / 1024 ** 2
  if (mb < 200) return null
  if (gb >= 2) return { level: 'veryslow', time: '45-90 min', tip: 'Considera recortar el video antes de subirlo.' }
  if (gb >= 1) return { level: 'slow', time: '20-45 min', tip: 'Puedes dejarlo en segundo plano.' }
  if (mb >= 500) return { level: 'slow', time: '10-20 min', tip: 'No cierres el navegador mientras procesa.' }
  return { level: 'ok', time: '3-10 min', tip: 'Tamano ideal.' }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB'
  return Math.round(bytes / 1024 ** 2) + ' MB'
}

function estimateClips(fileSizeMb: number, maxDuration: number): number {
  const estimatedMinutes = fileSizeMb / 100
  const clipDurationMinutes = maxDuration / 60
  const raw = Math.floor(estimatedMinutes / clipDurationMinutes)
  return Math.min(Math.max(raw, 1), 20)
}

interface Warning { file: File; level: 'ok' | 'slow' | 'veryslow'; time: string; tip: string }

const DURATION_PRESETS = [
  { label: '15-30s', hint: 'TikTok / Reels', min: 15, max: 30 },
  { label: '30-60s', hint: 'Estandar', min: 30, max: 60 },
  { label: '60-90s', hint: 'Largo', min: 60, max: 90 },
  { label: 'Custom', hint: 'Personalizado', min: 0, max: 0 },
]

const VALUE_PROPS = [
  { icon: '🎯', title: 'Calidad original preservada', desc: 'Los clips mantienen la resolucion y calidad de tu video. Sin perdida visible.' },
  { icon: '📱', title: 'Fondo borroso o negro', desc: 'Tu eliges el estilo del fondo en los clips 9:16. Profesional en cualquier caso.' },
  { icon: '👤', title: 'Encuadre inteligente', desc: 'Detecta caras y centra el recorte en ellas automaticamente.' },
  { icon: '🔒', title: 'Tu contenido es tuyo', desc: 'Nadie ve tu video. Todo ocurre en tu PC. Cero subidas a servidores.' },
]

export function VideoUploader({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<Warning | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [durationPreset, setDurationPreset] = useState(1)
  const [customMin, setCustomMin] = useState(20)
  const [customMax, setCustomMax] = useState(60)
  const [background, setBackground] = useState<'blur' | 'black'>('blur')

  const getOptions = (file?: File): ClipOptions => {
    const preset = DURATION_PRESETS[durationPreset]
    const min = preset.min === 0 ? customMin : preset.min
    const max = preset.max === 0 ? customMax : preset.max
    const sizeMb = file ? file.size / 1024 ** 2 : (pendingFile ? pendingFile.size / 1024 ** 2 : 500)
    return { minDuration: min, maxDuration: max, maxClips: estimateClips(sizeMb, max), background }
  }

  const validate = (file: File): string | null => {
    if (!ACCEPTED.includes(file.type)) return 'Formato no soportado. Usa MP4, WebM, MOV o AVI.'
    if (file.size > MAX_SIZE_GB * 1024 ** 3) return `El archivo supera los ${MAX_SIZE_GB}GB.`
    return null
  }

  const handleFile = useCallback((file: File) => {
    const err = validate(file)
    if (err) { setError(err); setWarning(null); return }
    setError(null)
    const w = getWarning(file)
    setPendingFile(file)
    if (w) setWarning({ file, ...w })
    else onFile(file, getOptions(file))
  }, [durationPreset, customMin, customMax, background])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const confirmAndProcess = () => {
    if (pendingFile) { onFile(pendingFile, getOptions(pendingFile)); setWarning(null) }
  }

  const cancelWarning = () => { setWarning(null); setPendingFile(null) }

  const previewClips = pendingFile
    ? estimateClips(pendingFile.size / 1024 ** 2, DURATION_PRESETS[durationPreset].max || customMax)
    : estimateClips(500, DURATION_PRESETS[durationPreset].max || customMax)

  if (warning && pendingFile) {
    const colors = {
      ok:       { border: 'border-emerald-600/60', icon: '✅', title: 'text-emerald-400' },
      slow:     { border: 'border-amber-600/60',   icon: '⚠️', title: 'text-amber-400' },
      veryslow: { border: 'border-red-600/60',      icon: '🐢', title: 'text-red-400' },
    }[warning.level]

    return (
      <div className={`w-full bg-slate-800/40 border-2 ${colors.border} rounded-2xl p-6 space-y-4`}>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{colors.icon}</span>
          <div className="flex-1">
            <h3 className={`font-bold text-lg ${colors.title}`}>
              {warning.level === 'veryslow' ? 'Video muy largo' : warning.level === 'slow' ? 'Video largo — ten paciencia' : 'Tamano perfecto'}
            </h3>
            <p className="text-slate-400 text-sm mt-1 truncate">{pendingFile.name}</p>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded-lg bg-slate-700 text-slate-300">
            {formatSize(pendingFile.size)}
          </span>
        </div>

        <div className="bg-slate-900/60 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Tiempo estimado</span>
            <span className={`font-bold font-mono ${colors.title}`}>{warning.time}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Clips en 9:16 que obtendras</span>
            <span className="font-bold font-mono text-emerald-400">
              ~{estimateClips(pendingFile.size / 1024 ** 2, DURATION_PRESETS[durationPreset].max || customMax)} clips
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Calidad de salida</span>
            <span className="font-bold text-emerald-400 text-sm">Original preservada</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Fondo del clip</span>
            <span className="font-bold text-emerald-400 text-sm">{background === 'blur' ? 'Borroso (recomendado)' : 'Negro'}</span>
          </div>
          <p className="text-slate-600 text-xs pt-2 border-t border-slate-700/50">{warning.tip}</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 flex items-start gap-2">
          <span className="text-base mt-0.5 shrink-0">💡</span>
          <p className="text-slate-400 text-xs leading-relaxed">
            La IA analiza el audio directamente en tu PC. El navegador puede parecer pausado — es normal.{' '}
            <strong className="text-slate-300">No cierres la pestana.</strong>{' '}
            La segunda vez ira mas rapido porque los modelos quedan en cache.
          </p>
        </div>

        {warning.level === 'veryslow' && (
          <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-xs text-red-300 leading-relaxed">
            Videos de mas de 2GB pueden agotar la memoria del navegador. Si falla, prueba con una parte del video.
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={cancelWarning}
            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={confirmAndProcess}
            className={`flex-1 py-2.5 font-semibold rounded-xl text-sm transition-colors text-white ${
              warning.level === 'veryslow' ? 'bg-red-700 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}>
            {warning.level === 'veryslow' ? 'Procesar igualmente' : 'Entendido, empezar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">

      {/* Value props */}
      <div className="grid grid-cols-2 gap-2">
        {VALUE_PROPS.map((vp, i) => (
          <div key={i} className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-3 flex items-start gap-2.5">
            <span className="text-xl shrink-0">{vp.icon}</span>
            <div>
              <p className="text-slate-200 text-xs font-semibold leading-tight">{vp.title}</p>
              <p className="text-slate-500 text-xs mt-0.5 leading-tight">{vp.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Aviso de tiempos */}
      <div className="bg-amber-950/20 border border-amber-800/25 rounded-2xl px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="text-base mt-0.5 shrink-0">⏱</span>
          <div>
            <p className="text-amber-300 text-xs font-semibold mb-2">Tiempo de procesado segun tu video</p>
            <div className="flex gap-3 flex-wrap">
              <span className="text-amber-500/70 text-xs">📹 3-5 min de video → ~5-10 min</span>
              <span className="text-amber-500/70 text-xs">📹 15-30 min de video → ~20-40 min</span>
              <span className="text-amber-500/70 text-xs">⚡ La 2a vez va mas rapido</span>
            </div>
            <p className="text-amber-600/50 text-xs mt-2">
              El navegador puede parecer congelado mientras la IA trabaja. Es completamente normal.
            </p>
          </div>
        </div>
      </div>

      {/* Configuracion */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5 space-y-4">
        <h3 className="text-slate-200 font-semibold text-sm">Configurar clips</h3>

        {/* Duracion */}
        <div>
          <p className="text-slate-400 text-xs mb-2">Duracion de cada clip</p>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => setDurationPreset(i)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                  durationPreset === i
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                    : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:border-slate-500'
                }`}>
                <div>{p.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{p.hint}</div>
              </button>
            ))}
          </div>

          {durationPreset === 3 && (
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <p className="text-slate-500 text-xs mb-1">Minimo (seg)</p>
                <input type="number" min={5} max={120} value={customMin}
                  onChange={(e) => setCustomMin(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-slate-500 text-xs mb-1">Maximo (seg)</p>
                <input type="number" min={10} max={300} value={customMax}
                  onChange={(e) => setCustomMax(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}
        </div>

        {/* Fondo del clip */}
        <div>
          <p className="text-slate-400 text-xs mb-2">Fondo del clip 9:16</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setBackground('blur')}
              className={`py-3 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                background === 'blur'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:border-slate-500'
              }`}>
              <span className="text-base">🌫️</span>
              <div className="text-left">
                <div>Borroso</div>
                <div className="text-[10px] opacity-70">Queda mas profesional</div>
              </div>
            </button>
            <button onClick={() => setBackground('black')}
              className={`py-3 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                background === 'black'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:border-slate-500'
              }`}>
              <span className="text-base">⬛</span>
              <div className="text-left">
                <div>Negro</div>
                <div className="text-[10px] opacity-70">Clasico y limpio</div>
              </div>
            </button>
          </div>
        </div>

        {/* Preview clips */}
        <div className="bg-slate-900/50 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-slate-300 text-xs font-medium">Clips que obtendras</p>
            <p className="text-slate-600 text-xs mt-0.5">Calidad original · 9:16 · Sin marca de agua</p>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 font-bold font-mono text-2xl">~{previewClips}</p>
            <p className="text-slate-600 text-xs">clips listos</p>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <label
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        className={`
          flex flex-col items-center justify-center w-full h-44 rounded-2xl border-2 border-dashed
          cursor-pointer transition-all duration-200 select-none
          ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
          ${dragging
            ? 'border-emerald-400 bg-emerald-950/20 scale-[1.02]'
            : 'border-slate-600/50 bg-slate-800/20 hover:border-emerald-600/50 hover:bg-slate-800/40'}
        `}>
        <input type="file" accept={ACCEPTED.join(',')} onChange={onInput} disabled={disabled} className="hidden" />
        <div className="text-4xl mb-2">{dragging ? '🎯' : '🎬'}</div>
        <p className="text-slate-200 font-semibold">{dragging ? 'Suelta el video aqui' : 'Arrastra tu video aqui'}</p>
        <p className="text-slate-400 text-sm mt-1">
          o <span className="text-emerald-400 underline underline-offset-2">selecciona un archivo</span>
        </p>
        <p className="text-slate-600 text-xs mt-2">MP4 · WebM · MOV · AVI — max. 4GB</p>
      </label>

      {error && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}
    </div>
  )
}