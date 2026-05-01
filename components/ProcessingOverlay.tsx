'use client'

import { useRef } from 'react'
import type { ProcessingStage } from '@/types'

interface Props {
  stage: ProcessingStage
  progress: number
  message: string
  fileName: string
}

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: 'En espera',
  loading: '⚙️ Cargando motores',
  'extracting-audio': '🎵 Extrayendo audio',
  transcribing: '🤖 Analizando con IA',
  'detecting-clips': '✂️ Detectando cortes',
  exporting: '📦 Exportando clips',
  done: '✅ Completado',
  error: '❌ Error',
}

const FAKE_STEPS = [
  { at: 5,  label: 'Verificando compatibilidad del archivo...' },
  { at: 12, label: 'Inicializando WebAssembly runtime...' },
  { at: 20, label: 'Decodificando stream de video...' },
  { at: 28, label: 'Separando canales de audio...' },
  { at: 36, label: 'Normalizando frecuencias...' },
  { at: 45, label: 'Ejecutando modelo Whisper-Tiny...' },
  { at: 55, label: 'Tokenizando transcripcion...' },
  { at: 63, label: 'Calculando ventanas de silencio...' },
  { at: 72, label: 'Puntuando relevancia de segmentos...' },
  { at: 80, label: 'Aplicando filtro de corte 9:16...' },
  { at: 88, label: 'Reencuadrando frames...' },
  { at: 94, label: 'Codificando clips finales...' },
]

export function ProcessingOverlay({ stage, progress, message, fileName }: Props) {
  // Fijo el valor random para que no cause re-renders
  const dotsRef = useRef('░'.repeat(15))
  const visibleSteps = FAKE_STEPS.filter(s => s.at <= progress)

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-100 font-bold text-xl">{STAGE_LABELS[stage]}</h2>
          <p className="text-slate-400 text-sm mt-0.5 truncate max-w-xs">{fileName}</p>
        </div>
        <span className="text-sky-400 font-mono text-3xl font-bold">{progress}%</span>
      </div>

      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #0284c7, #38bdf8, #0284c7)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }}
        />
      </div>

      {/* Aviso si estamos transcribiendo — el momento que mas congela */}
      {stage === 'transcribing' && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-amber-300 text-xs leading-relaxed">
            La IA esta procesando el audio. El navegador puede parecer pausado — <b>es normal</b>. No lo cierres, volvera en unos minutos.
          </p>
        </div>
      )}

      <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 h-36 overflow-hidden font-mono text-xs relative">
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-10" />
        <div className="space-y-1 pt-4">
          {visibleSteps.slice(-6).map((step, i, arr) => (
            <p key={step.at} className={i === arr.length - 1 ? 'text-sky-400' : 'text-slate-500'}>
              {i === arr.length - 1 ? '▶ ' : '✓ '}
              {step.label}
            </p>
          ))}
          {visibleSteps.length > 0 && (
            <p className="text-slate-600 animate-pulse">{dotsRef.current}</p>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
      </div>

      <div className="w-full h-24 bg-slate-800/60 border border-slate-700 border-dashed rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-xs uppercase tracking-widest mb-1">Publicidad</p>
          <div className="w-80 h-10 bg-slate-700 rounded-lg animate-pulse" />
        </div>
      </div>

      <p className="text-slate-500 text-xs text-center">{message}</p>
    </div>
  )
}