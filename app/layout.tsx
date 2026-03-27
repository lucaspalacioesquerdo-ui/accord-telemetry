import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HNDSH.meters',
  description: 'Honda Accord CD7 — Telemetria OBD1 · F22B1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}