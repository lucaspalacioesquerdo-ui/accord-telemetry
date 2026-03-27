import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Accord Telemetry',
  description: 'Honda Accord EX 1995 · F22B1 · OBD1 Data Logger',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
