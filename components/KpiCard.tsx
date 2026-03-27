'use client'

type Status = 'good' | 'warn' | 'bad' | 'info' | 'neutral'

interface KpiProps {
  label: string
  value: string | number | null
  unit?: string
  sub?: string
  status?: Status
}

const statusStyles: Record<Status, { bg: string; border: string; valueColor: string; topBar: string }> = {
  good:    { bg: '#f0fdf4', border: '#bbf7d0', valueColor: '#15803d', topBar: '#16a34a' },
  warn:    { bg: '#fffbeb', border: '#fde68a', valueColor: '#92400e', topBar: '#ca8a04' },
  bad:     { bg: '#fef2f2', border: '#fecaca', valueColor: '#991b1b', topBar: '#dc2626' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', valueColor: '#1e40af', topBar: '#2563eb' },
  neutral: { bg: '#ffffff', border: '#e5e0d8', valueColor: '#1a1814', topBar: '#e5e0d8' },
}

export default function KpiCard({ label, value, unit, sub, status = 'neutral' }: KpiProps) {
  const s = statusStyles[status]
  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 10,
      padding: '16px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.topBar, borderRadius: '10px 10px 0 0' }} />

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        letterSpacing: '1.8px',
        textTransform: 'uppercase',
        color: '#9ca3af',
        marginBottom: 10,
        marginTop: 4,
        fontWeight: 600,
      }}>
        {label}
      </div>

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 28,
        fontWeight: 700,
        lineHeight: 1,
        color: s.valueColor,
      }}>
        {value ?? '--'}
        {unit && (
          <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 3, fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>

      {sub && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: '#6b7280',
          marginTop: 8,
          lineHeight: 1.4,
          letterSpacing: '0.5px',
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}
