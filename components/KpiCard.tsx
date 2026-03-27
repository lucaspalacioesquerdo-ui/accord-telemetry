'use client'

type Status = 'good' | 'warn' | 'bad' | 'info' | 'neutral'

interface KpiProps {
  label: string
  value: string | number | null
  unit?: string
  sub?: string
  status?: Status
}

const statusColor: Record<Status, string> = {
  good:    'var(--green)',
  warn:    'var(--yellow)',
  bad:     'var(--red)',
  info:    'var(--accent)',
  neutral: 'var(--muted)',
}

const statusBg: Record<Status, string> = {
  good:    'rgba(34,197,94,0.06)',
  warn:    'rgba(234,179,8,0.06)',
  bad:     'rgba(239,68,68,0.06)',
  info:    'rgba(0,180,216,0.06)',
  neutral: 'transparent',
}

export default function KpiCard({ label, value, unit, sub, status = 'neutral' }: KpiProps) {
  return (
    <div
      className="card"
      style={{
        padding: '14px 16px',
        background: statusBg[status],
        borderColor: status !== 'neutral'
          ? statusColor[status].replace(')', ', 0.2)').replace('var(', 'rgba(').replace(', 0.2)', ', 0.2)')
          : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
        background: status !== 'neutral' ? statusColor[status] : 'var(--border)',
        opacity: 0.5,
      }} />

      <div className="label-xs" style={{ marginBottom: 8 }}>{label}</div>

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 24,
        fontWeight: 600,
        lineHeight: 1,
        color: status !== 'neutral' ? statusColor[status] : 'var(--text)',
      }}>
        {value ?? '--'}
        {unit && (
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 3, fontWeight: 400 }}>
            {unit}
          </span>
        )}
      </div>

      {sub && (
        <div className="label-xs" style={{ marginTop: 6, letterSpacing: '0.8px', lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
