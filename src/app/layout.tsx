import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RobinClipHood — Clips 9:16 gratis para TikTok, Reels y Shorts',
  description: 'Convierte videos largos en clips virales 9:16 para TikTok, Reels e YT Shorts. IA local, gratis, sin registro, sin marca de agua.',
  keywords: ['video clipper', 'clips tiktok', 'reels automaticos', 'youtube shorts', 'cortar video gratis', 'robincliphood'],
  openGraph: {
    title: 'RobinClipHood — Clips virales gratis',
    description: 'Convierte tus streams y videos en clips 9:16 para TikTok, Reels y Shorts. Gratis, sin registro.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Google AdSense — reemplaza ca-pub-XXXX con tu Publisher ID */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        />
        {/* Auto ads de AdSense — muestra ads automaticamente en el mejor sitio */}
      </head>
      <body className="bg-slate-950 antialiased">{children}</body>
    </html>
  )
}