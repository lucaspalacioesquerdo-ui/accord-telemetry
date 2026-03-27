import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HNDSH.meters',
  description: 'Honda Accord EX 1995 Â· F22B1 Â· OBD1 Telemetry',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
