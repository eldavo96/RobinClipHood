'use client'

import { useState, useEffect } from 'react'
import { useAutoClipper } from '@/hooks/useAutoClipper'
import { VideoUploader } from '@/components/VideoUploader'
import type { ClipOptions } from '@/components/VideoUploader'
import { ProcessingOverlay } from '@/components/ProcessingOverlay'
import { ClipPreview } from '@/components/ClipPreview'
import { ManualEditor } from '@/components/ManualEditor'

type Mode = 'ai' | 'manual'

function RobinClipHoodLogo() {
  return (
    <div className="flex items-center justify-center gap-0 select-none">
      <span className="relative inline-block">
        <svg viewBox="0 0 60 32" className="absolute -top-8 -left-1 w-14 h-8" fill="none">
          <ellipse cx="30" cy="26" rx="28" ry="5" fill="#14532d" />
          <rect x="10" y="6" width="40" height="22" rx="4" fill="#166534" />
          <path d="M46 8 Q54 2 56 10 Q50 8 46 8Z" fill="#ca8a04" />
          <path d="M46 8 Q52 5 54 12 Q49 10 46 8Z" fill="#eab308" />
          <rect x="10" y="20" width="40" height="5" rx="1" fill="#15803d" />
          <rect x="27" y="21" width="6" height="3" rx="0.5" fill="#eab308" />
        </svg>
        <span className="text-5xl sm:text-6xl font-black tracking-tight text-emerald-400"
          style={{ textShadow: '0 0 30px rgba(52,211,153,0.4)' }}>R</span>
      </span>
      <span className="text-5xl sm:text-6xl font-black tracking-tight text-white">obin</span>
      <span className="text-5xl sm:text-6xl font-black tracking-tight text-emerald-400"
        style={{ textShadow: '0 0 20px rgba(52,211,153,0.2)' }}>Clip</span>
      <span className="text-5xl sm:text-6xl font-black tracking-tight text-white">Hood</span>
    </div>
  )
}

function StickyVideoAd({ visible }: { visible: boolean }) {
  const [closed, setClosed] = useState(false)
  if (closed || !visible) return null
  return (
    <div className="fixed bottom-20 right-4 z-50 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700">
        <span className="text-slate-500 text-xs uppercase tracking-widest">Publicidad</span>
        <button onClick={() => setClosed(true)} className="text-slate-500 hover:text-slate-300 text-lg leading-none transition-colors">×</button>
      </div>
      <div className="w-full h-32 bg-slate-800 flex items-center justify-center">
        <div className="w-44 h-8 bg-slate-700 rounded animate-pulse" />
      </div>
    </div>
  )
}

function AnchorAd() {
  const [closed, setClosed] = useState(false)
  if (closed) return null
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center bg-slate-950/95 backdrop-blur border-t border-slate-800 py-2 px-4 gap-3">
      <span className="text-slate-600 text-xs uppercase tracking-widest shrink-0">Publicidad</span>
      <div className="w-72 h-10 bg-slate-800 rounded-lg animate-pulse" />
      <button onClick={() => setClosed(true)} className="text-slate-600 hover:text-slate-400 text-sm shrink-0 transition-colors">✕</button>
    </div>
  )
}

const BADGES = [
  { icon: '✓', text: 'Sin registro' },
  { icon: '✓', text: 'Sin marca de agua' },
  { icon: '✓', text: 'Hasta 30 min de video recomendado' },
  { icon: '✓', text: '100% privado' },
]

const FEATURES = [
  {
    icon: '🔒',
    title: 'Tu video nunca sale de tu PC',
    desc: 'Todo el procesado ocurre en tu navegador. No subimos nada a ningun servidor. Tu contenido es tuyo.',
  },
  {
    icon: '🤖',
    title: 'IA que entiende tu contenido',
    desc: 'Whisper analiza lo que se dice en tu video y selecciona los momentos con mas engagement automaticamente.',
  },
  {
    icon: '📊',
    title: 'Editor profesional incluido',
    desc: 'Forma de onda de audio, scrubbing en tiempo real y cortes precisos. Sin instalar nada.',
  },
]

export default function Home() {
  const { state, processVideo, reset } = useAutoClipper()
  const [fileName, setFileName] = useState('')
  const [mode, setMode] = useState<Mode>('ai')
  const [manualFile, setManualFile] = useState<File | null>(null)
  const [showStickyAd, setShowStickyAd] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isIdle = state.stage === 'idle'
  const isProcessing = ['loading', 'extracting-audio', 'transcribing', 'detecting-clips', 'exporting'].includes(state.stage)
  const isDone = state.stage === 'done'
  const isError = state.stage === 'error'

  useEffect(() => {
    if (isProcessing || manualFile) {
      const t = setTimeout(() => setShowStickyAd(true), 10000)
      return () => clearTimeout(t)
    } else {
      setShowStickyAd(false)
    }
  }, [isProcessing, manualFile])

  const handleFile = (file: File, options: ClipOptions) => {
    setFileName(file.name)
    processVideo(file, options)
  }

  const handleReset = () => { reset(); setFileName('') }
  const showTabs = (isIdle || !manualFile) && !isProcessing && !isDone

  return (
    <main className="min-h-screen text-slate-100 pb-20 relative overflow-x-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #0a1f12 0%, #020617 60%)' }}>

      {/* Grid de fondo sutil */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <AnchorAd />
      <StickyVideoAd visible={showStickyAd} />

      {/* Ad lateral pantallas grandes */}
      <div className="hidden xl:block fixed left-3 top-1/2 -translate-y-1/2 w-32 z-10">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-2 py-1.5 border-b border-slate-800">
            <span className="text-slate-700 text-xs uppercase tracking-widest">Ad</span>
          </div>
          <div className="h-64 bg-slate-800/30 flex items-center justify-center">
            <div className="w-20 h-40 bg-slate-700/40 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      <div className={`max-w-3xl mx-auto px-4 py-10 xl:px-8 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

        {/* Header */}
        <header className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/40 rounded-full px-4 py-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-widest">
            🎯 100% en tu navegador — gratis para siempre
          </div>

          <div className="pt-5 pb-2">
            <RobinClipHoodLogo />
          </div>

          <p className="text-slate-400 text-base max-w-md mx-auto leading-relaxed">
            Sube tu video. La IA encuentra los mejores momentos. Descarga clips 9:16 listos para publicar.
            <span className="text-emerald-500 font-medium"> Sin registro. Sin coste. Sin límite</span>
          </p>

          {/* Badges de confianza */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {BADGES.map((b) => (
              <div key={b.text}
                className="inline-flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/60 rounded-full px-3 py-1.5 text-emerald-300 text-xs font-medium">
                <span className="text-emerald-400 font-bold">{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </header>

        {/* Ad horizontal sutil */}
        <div className="mb-6 w-full h-16 bg-slate-900/40 border border-slate-800/60 border-dashed rounded-2xl flex items-center justify-center gap-4">
          <span className="text-slate-700 text-xs uppercase tracking-widest">Publicidad — gracias por apoyar la herramienta</span>
          <div className="w-64 h-8 bg-slate-800/60 rounded-lg animate-pulse hidden sm:block" />
        </div>

        {/* Tabs */}
        {showTabs && (
          <div className="flex gap-2 mb-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 backdrop-blur">
            <button
              onClick={() => { setMode('ai'); setManualFile(null) }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                mode === 'ai'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              🤖 Modo IA
              <span className="block text-xs font-normal opacity-70 mt-0.5">
                Detecta los mejores momentos
              </span>
            </button>
            <button
              onClick={() => { setMode('manual'); reset() }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                mode === 'manual'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              ✂️ Modo Manual
              <span className="block text-xs font-normal opacity-70 mt-0.5">
                Tu decides los cortes
              </span>
            </button>
          </div>
        )}

        {/* Panel principal con glassmorphism */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(71,85,105,0.4)', backdropFilter: 'blur(12px)' }}>
          {/* Brillo sutil en el borde superior */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

          <div className="p-6 sm:p-8">
            {/* MODO IA */}
            {mode === 'ai' && (
              <>
                {isIdle && (
                  <>
                    {/* Aviso honesto con psicologia positiva */}
                    <div className="bg-amber-950/30 border border-amber-800/30 rounded-2xl px-4 py-4 mb-6">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">⏱</span>
                        <div>
                          <p className="text-amber-300 text-sm font-semibold mb-1">La IA trabaja en tu PC — videos hasta 30 min</p>
                          <p className="text-amber-400/70 text-xs leading-relaxed">
                            El analisis puede tardar varios minutos — es la IA procesando el audio directamente en tu navegador, sin enviar nada a internet. El navegador puede parecer pausado. Es completamente normal.
                          </p>
                          <p className="text-amber-500/50 text-xs mt-2 italic">
                            Proximamente: version turbo con procesado instantaneo.
                          </p>
                        </div>
                      </div>
                    </div>
                    <VideoUploader onFile={handleFile} disabled={isProcessing} />
                  </>
                )}
                {isProcessing && (
                  <ProcessingOverlay stage={state.stage} progress={state.progress} message={state.message} fileName={fileName} />
                )}
                {isDone && <ClipPreview segments={state.segments} onReset={handleReset} />}
                {isError && (
                  <div className="text-center py-16 space-y-4">
                    <p className="text-5xl">⚠️</p>
                    <p className="text-red-400 font-semibold">{state.error}</p>
                    <button onClick={handleReset}
                      className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors">
                      Reintentar
                    </button>
                  </div>
                )}
              </>
            )}

            {/* MODO MANUAL */}
            {mode === 'manual' && (
              <>
                {!manualFile ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-2xl px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">✂️</span>
                        <div>
                          <p className="text-emerald-300 text-sm font-semibold mb-1">Tu decides exactamente que clips quieres</p>
                          <p className="text-emerald-400/70 text-xs leading-relaxed">
                            Ve la forma de onda del audio, navega el video arrastrando y marca los cortes donde quieras. Sin IA, sin esperas de transcripcion. Perfecto cuando ya sabes que momentos quieres clipear.
                          </p>
                        </div>
                      </div>
                    </div>
                    <label className="flex flex-col items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/30 hover:border-emerald-600/60 hover:bg-slate-800/60 cursor-pointer transition-all duration-200 group">
                      <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setManualFile(f) }} />
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">🎬</div>
                      <p className="text-slate-200 font-semibold">Arrastra tu video aqui</p>
                      <p className="text-slate-500 text-sm mt-1">o <span className="text-emerald-400 underline underline-offset-2">selecciona un archivo</span></p>
                      <p className="text-slate-600 text-xs mt-3">Sin limite de duracion · MP4, WebM, MOV, AVI</p>
                    </label>
                  </div>
                ) : (
                  <ManualEditor file={manualFile} onBack={() => setManualFile(null)} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Features — solo en idle */}
        {isIdle && !manualFile && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className="group bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 hover:border-emerald-900/60 hover:bg-slate-900/70 transition-all duration-200 cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}>
                <p className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-200 inline-block">{f.icon}</p>
                <p className="text-slate-200 font-semibold text-sm mb-1">{f.title}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Ad intermedio */}
        {isIdle && !manualFile && (
          <div className="mt-6 w-full h-20 bg-slate-900/30 border border-slate-800/40 border-dashed rounded-2xl flex items-center justify-center gap-4">
            <span className="text-slate-700 text-xs uppercase tracking-widest">Publicidad</span>
            <div className="w-80 h-10 bg-slate-800/40 rounded-lg animate-pulse hidden sm:block" />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 text-center space-y-3">
          <p className="text-slate-700 text-xs">
            RobinClipHood es gratuito gracias a la publicidad. Tu privacidad siempre esta protegida.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-700">
            <a href="/privacidad" className="hover:text-slate-500 transition-colors">Privacidad</a>
            <span>·</span>
            <a href="/terminos" className="hover:text-slate-500 transition-colors">Terminos</a>
            <span>·</span>
            <a href="mailto:hola@robincliphood.com" className="hover:text-slate-500 transition-colors">Contacto</a>
          </div>
        </footer>
      </div>
    </main>
  )
}