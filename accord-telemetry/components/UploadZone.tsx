'use client'

import { useRef, useState } from 'react'

interface UploadZoneProps {
  onFiles: (files: File[]) => void
  loading?: boolean
}

export default function UploadZone({ onFiles, loading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function handleFiles(files: FileList | null) {
    if (!files) return
    onFiles(Array.from(files).filter(f => f.name.endsWith('.csv')))
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
      style={{
        border: `1px dashed ${drag ? 'var(--accent)' : 'var(--border2)'}`,
        borderRadius: 3,
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        transition: 'all 0.15s',
        background: drag ? 'rgba(0,180,216,0.04)' : 'transparent',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      <div style={{ fontSize: 28, opacity: 0.4 }}>📡</div>

      <div className="label-xs" style={{ letterSpacing: 2 }}>
        {loading ? 'Processando...' : 'Arrastar CSV ou clicar para importar'}
      </div>

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        color: 'var(--muted)',
        textAlign: 'center',
        lineHeight: 1.8,
      }}>
        HondsH OBD1 · inglês ou português<br />
        Múltiplos arquivos simultâneos
      </div>
    </div>
  )
}
