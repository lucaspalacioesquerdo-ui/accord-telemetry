'use client'

import { useEffect, useState, useCallback } from 'react'
import KpiCard from '@/components/KpiCard'
import TimelineChart from '@/components/TimelineChart'
import UploadZone from '@/components/UploadZone'
import { parseCSVFile, BASELINE } from '@/lib/parser'
import { generateAlerts } from '@/lib/alerts'
import type { LogSession } from '@/lib/supabase'

function fmt(n: number | null | undefined, d = 1): string {
  return n != null && isFinite(n) ? n.toFixed(d) : '--'
}
function pillCls(v: number | null, good: number, warn: number): string {
  if (v == null) return 'pill-n'
  if (v <= good) return 'pill-g'
  if (v <= warn) return 'pill-y'
  return 'pill-r'
}
function kpiStatus(v: number | null, warnAt: number, badAt: number, dir: 'up' | 'down' = 'up'): 'good' | 'warn' | 'bad' | 'neutral' {
  if (v == null) return 'neutral'
  if (dir === 'up') {
    if (v >= badAt) return 'bad'
    if (v >= warnAt) return 'warn'
    return 'good'
  } else {
    if (v <= badAt) return 'bad'
    if (v <= warnAt) return 'warn'
    return 'good'
  }
}

const ALERT_COLOR: Record<string, string> = {
  bad: '#f87171', warn: '#fbbf24', good: '#34d399', info: 'var(--accent)'
}

const TABS = ['overview', 'timeline', 'consumo', 'tabela'] as const
type Tab = typeof TABS[number]

interface SidebarItemProps {
  s: LogSession
  i: number
  activeName: string | undefined
  isNew: boolean
  onClick: (i: number) => void
}

function SidebarItem({ s, i, activeName, isNew, onClick }: SidebarItemProps) {
  const isActive = activeName === s.name
  const dot = s.ltft != null ? (s.ltft <= 2.5 ? 'var(--green)' : s.ltft <= 4 ? 'var(--yellow)' : 'var(--red)') : 'var(--muted)'
  return (
    <div onClick={() => onClick(i)} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', position: 'relative', background: isActive ? 'rgba(56,189,248,0.06)' : 'transparent', transition: 'background 0.15s' }}>
      {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--accent)' }} />}
      <div className="mono" style={{ fontSize: 10, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.name}</span>
        {isNew && <span style={{ color: 'var(--accent)', fontSize: 8 }}>●</span>}
      </div>
      <div className="label-xs" style={{ paddingLeft: 13 }}>
        {s.rows?.toLocaleString()} reg{s.km_estimated ? ` · ${fmt(s.km_estimated, 1)} km` : ''}
      </div>
    </div>
  )
}
export default function Home() {
  const [dbSessions, setDbSessions] = useState<LogSession[]>([])
  const [localSessions, setLocalSessions] = useState<LogSession[]>([])
  const [uploading, setUploading] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.sessions) setDbSessions(d.sessions)
    }).catch(() => {})
  }, [])

  const allSessions: LogSession[] = (() => {
    const map = new Map<string, LogSession>()
    BASELINE.forEach(s => map.set(s.name, s))
    dbSessions.forEach(s => map.set(s.name, s))
    localSessions.forEach(s => map.set(s.name, s))
    return Array.from(map.values())
  })()

  const active = activeIdx != null ? allSessions[activeIdx] : allSessions[allSessions.length - 1]
  const alerts = active ? generateAlerts(active) : []
  const tlLabels = allSessions.map(s => s.name)

  const handleFiles = useCallback(async (files: File[]) => {
    setUploading(true)
    const newSessions: LogSession[] = []
    for (const file of files) {
      try {
        const { session } = await parseCSVFile(file)
        newSessions.push(session)
        try {
          const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) })
          if (res.ok) {
            const { session: saved } = await res.json()
            setDbSessions(prev => {
              const idx = prev.findIndex(s => s.name === saved.name)
              if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
              return [...prev, saved]
            })
          }
        } catch {}
      } catch (e) { console.error(e) }
    }
    setLocalSessions(prev => {
      const m = new Map(prev.map(s => [s.name, s]))
      newSessions.forEach(s => m.set(s.name, s))
      return Array.from(m.values())
    })
    setActiveIdx(allSessions.length + newSessions.length - 1)
    setUploading(false)
  }, [allSessions.length])

  const ST: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }
  const KG: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 10 }
  const SEC: React.CSSProperties = { marginBottom: 28 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 52, background: 'var(--panel)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="mono" style={{ fontSize: 14, fontWeight: 600, letterSpacing: 3, color: 'var(--accent)' }}>HNDSH</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>.meters</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border2)' }} />
          <span className="mono" style={{ fontSize: 9, padding: '3px 8px', border: '1px solid var(--border2)', borderRadius: 4, color: 'var(--muted)', letterSpacing: 1.5 }}>F22B1 · CD7 · OBD1</span>
          {allSessions.length > BASELINE.length && (<span className="mono" style={{ fontSize: 9, padding: '3px 8px', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 4, color: 'var(--green)', letterSpacing: 1.5 }}>{allSessions.length - BASELINE.length} importado{allSessions.length - BASELINE.length > 1 ? 's' : ''}</span>)}
        </div>
        <div style={{ display: 'flex', height: 52 }}>
          {TABS.map(t => (<button key={t} onClick={() => setTab(t)} className="mono" style={{ padding: '0 20px', height: 52, border: 'none', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', color: tab === t ? 'var(--accent)' : 'var(--muted)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>{t}</button>))}
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 220, minWidth: 220, flexShrink: 0, background: 'var(--panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="label-xs" style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)' }}>Sessões</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {allSessions.map((s, i) => (<SidebarItem key={s.name} s={s} i={i} activeName={active?.name} isNew={dbSessions.some(d => d.name === s.name) || localSessions.some(l => l.name === s.name)} onClick={setActiveIdx} />))}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <UploadZone onFiles={handleFiles} loading={uploading} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>          {tab === 'overview' && active && (
            <div>
              <div style={{ marginBottom: 28 }}>
                <h1 className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>{active.name}</h1>
                <span className="label-xs">{active.rows?.toLocaleString()} registros{active.duration_min ? ` · ${active.duration_min} min` : ''}{active.km_estimated ? ` · ${fmt(active.km_estimated, 1)} km` : ''}</span>
              </div>
              <div style={SEC}><div style={ST}>Temperatura</div><div style={KG}>
                <KpiCard label="ECT Média" value={fmt(active.ect_mean)} unit="°C" sub={`máx ${fmt(active.ect_max)}°C`} status={kpiStatus(active.ect_max,97,102)} />
                <KpiCard label="IAT Média" value={fmt(active.iat_mean)} unit="°C" sub={`máx ${fmt(active.iat_max)}°C`} status={kpiStatus(active.iat_mean,55,65)} />
                <KpiCard label="ECT>95°C" value={fmt(active.ect_above95_pct)} unit="%" sub="tempo quente" status={kpiStatus(active.ect_above95_pct,20,35)} />
              </div></div>
              <div style={SEC}><div style={ST}>Mistura &amp; Fuel Trim</div><div style={KG}>
                <KpiCard label="LTFT" value={(active.ltft!=null&&active.ltft>0?'+':'')+fmt(active.ltft)} unit="%" sub="ideal: ±1.5%" status={kpiStatus(active.ltft,2.5,4)} />
                <KpiCard label="STFT>+15%" value={fmt(active.stft_above15_pct)} unit="%" sub="correção extrema" status={kpiStatus(active.stft_above15_pct,3,10)} />
                <KpiCard label="Lambda" value={fmt(active.lambda,3)} sub="ideal: ~1.000" status={kpiStatus(active.lambda,1.05,1.15)} />
                <KpiCard label="IACV" value={fmt(active.iacv_mean)} unit="%" sub="esperado: 30-38%" status={kpiStatus(active.iacv_mean,42,55)} />
              </div></div>
              <div style={SEC}><div style={ST}>Consumo &amp; Distância</div><div style={KG}>
                <KpiCard label="Fluxo Médio" value={fmt(active.fuel_flow_mean,2)} unit="l/h" sub="horário médio" status="info" />
                <KpiCard label="Consumo" value={fmt(active.inst_consumption,1)} unit="km/l" sub="cruzeiro" status="info" />
                <KpiCard label="Km Estimados" value={fmt(active.km_estimated,1)} unit="km" sub="neste log" status="info" />
                <KpiCard label="VTEC" value={fmt(active.vtec_pct)} unit="%" sub="alto RPM" status="neutral" />
              </div></div>
              <div style={SEC}><div style={ST}>Elétrico &amp; Status</div><div style={KG}>
                <KpiCard label="Bateria" value={fmt(active.bat_mean,2)} unit="V" sub={`mín ${fmt(active.bat_min,2)}V`} status={kpiStatus(active.bat_below12_pct,1,5)} />
                <KpiCard label="Knock" value={active.knock_events??'--'} sub="detonação" status={active.knock_events===0?'good':'bad'} />
                <KpiCard label="Closed Loop" value={fmt(active.closed_loop_pct)} unit="%" sub="malha fechada" status="info" />
                <KpiCard label="Check Engine" value={active.mil_on_pct?'ATIVO':'OFF'} sub={active.mil_on_pct?`${fmt(active.mil_on_pct)}%`:'Sem falhas'} status={active.mil_on_pct?'bad':'good'} />
                <KpiCard label="Vel. Máx" value={fmt(active.vss_max,0)} unit="km/h" sub={`parado: ${fmt(active.stopped_pct)}%`} status="neutral" />
              </div></div>
              <div style={SEC}><div style={ST}>Diagnóstico</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.map((a,idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 8, border: `1px solid ${ALERT_COLOR[a.type]}22`, background: `${ALERT_COLOR[a.type]}08` }}>
                      <div className="mono" style={{ fontSize: 9, padding: '3px 7px', borderRadius: 4, background: `${ALERT_COLOR[a.type]}18`, color: ALERT_COLOR[a.type], letterSpacing: 1, flexShrink: 0 }}>{a.param}</div>
                      <div><div style={{ fontSize: 12, fontWeight: 500, color: ALERT_COLOR[a.type], marginBottom: 3 }}>{a.title}</div><div className="mono" style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.6 }}>{a.detail}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}          {tab === 'timeline' && (
            <div>
              <div style={{ marginBottom: 24 }}><h1 className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>Linha do Tempo</h1><span className="label-xs">{allSessions.length} sessões</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(420px,1fr))', gap: 16 }}>
                <TimelineChart title="LTFT" unit="%" labels={tlLabels} datasets={[{label:'LTFT%',data:allSessions.map(s=>s.ltft),color:'#fb923c'}]} yMin={0} refLine={{value:1.5,label:'ideal',color:'rgba(52,211,153,0.4)'}} />
                <TimelineChart title="STFT>+15%" unit="%" labels={tlLabels} datasets={[{label:'STFT',data:allSessions.map(s=>s.stft_above15_pct),color:'#f87171'}]} yMin={0} />
                <TimelineChart title="Lambda" labels={tlLabels} datasets={[{label:'Lambda',data:allSessions.map(s=>s.lambda),color:'#34d399'}]} yMin={0.95} yMax={1.30} refLine={{value:1.0,label:'stoich',color:'rgba(52,211,153,0.4)'}} />
                <TimelineChart title="IACV" unit="%" labels={tlLabels} datasets={[{label:'IACV',data:allSessions.map(s=>s.iacv_mean),color:'#38bdf8'}]} yMin={0} yMax={80} refLine={{value:38,label:'max',color:'rgba(56,189,248,0.35)'}} />
                <TimelineChart title="ECT Temp" unit="°C" labels={tlLabels} datasets={[{label:'Max',data:allSessions.map(s=>s.ect_max),color:'#f87171'},{label:'Media',data:allSessions.map(s=>s.ect_mean),color:'#fb923c'}]} yMin={70} refLine={{value:100,label:'100C',color:'rgba(248,113,113,0.4)'}} />
                <TimelineChart title="IAT Adm" unit="°C" labels={tlLabels} datasets={[{label:'IAT',data:allSessions.map(s=>s.iat_mean),color:'#fbbf24'}]} yMin={30} />
                <TimelineChart title="Bateria" unit="V" labels={tlLabels} datasets={[{label:'BAT Min',data:allSessions.map(s=>s.bat_min),color:'#34d399'}]} yMin={9} yMax={15} refLine={{value:12,label:'12V',color:'rgba(248,113,113,0.4)'}} />
                <TimelineChart title="VTEC" unit="%" labels={tlLabels} datasets={[{label:'VTEC',data:allSessions.map(s=>s.vtec_pct),color:'#a78bfa'}]} yMin={0} />
              </div>
            </div>
          )}
          {tab === 'consumo' && (
            <div>
              <div style={{ marginBottom: 24 }}><h1 className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>Consumo &amp; Aceleração</h1><span className="label-xs">Evolução histórica</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(420px,1fr))', gap: 16 }}>
                <TimelineChart title="Fluxo Comb." unit="l/h" labels={tlLabels} datasets={[{label:'l/h',data:allSessions.map(s=>s.fuel_flow_mean),color:'#fb923c'}]} yMin={0} />
                <TimelineChart title="Consumo" unit="km/l" labels={tlLabels} datasets={[{label:'km/l',data:allSessions.map(s=>s.inst_consumption),color:'#34d399'}]} yMin={0} />
                <TimelineChart title="Distância" unit="km" labels={tlLabels} datasets={[{label:'km',data:allSessions.map(s=>s.km_estimated),color:'#38bdf8'}]} yMin={0} />
                <TimelineChart title="Aceleração" unit="G" labels={tlLabels} datasets={[{label:'Acel',data:allSessions.map(s=>s.lng_accel_max),color:'#34d399'},{label:'Fren',data:allSessions.map(s=>s.lng_accel_min),color:'#f87171'}]} />
                <TimelineChart title="Injeção" unit="ms" labels={tlLabels} datasets={[{label:'ms',data:allSessions.map(s=>s.inj_dur),color:'#a78bfa'}]} yMin={3} />
                <TimelineChart title="Vel. Máx" unit="km/h" labels={tlLabels} datasets={[{label:'km/h',data:allSessions.map(s=>s.vss_max),color:'#38bdf8'}]} yMin={0} />
              </div>
            </div>
          )}
          {tab === 'tabela' && (
            <div>
              <div style={{ marginBottom: 24 }}><h1 className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>Comparativo</h1><span className="label-xs">Todos os logs · {allSessions.length} sessões</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono,monospace', fontSize: 11 }}>
                  <thead><tr>
                    {['Sessao','Km','ECT Med','ECT Max','IAT','LTFT','STFT%','Lambda','IACV','l/h','km/l','Avanco','VTEC%','Bat V','Knock','MIL'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--panel)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {allSessions.map((s, i) => {
                      const isNew = dbSessions.some(d => d.name === s.name) || localSessions.some(l => l.name === s.name)
                      return (
                        <tr key={s.name} onClick={() => { setActiveIdx(i); setTab('overview') }} style={{ borderBottom: '1px solid var(--border)', background: isNew ? 'rgba(56,189,248,0.03)' : 'transparent', cursor: 'pointer' }}>
                          <td style={{ padding: '10px 12px', color: isNew ? 'var(--accent)' : 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{s.name}</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.km_estimated,1)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.ect_mean)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.ect_max)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.iat_mean)}</td>
                          <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.ltft,2.5,4)}`}>{s.ltft!=null?(s.ltft>0?'+':'')+fmt(s.ltft):'--'}%</span></td>
                          <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.stft_above15_pct,3,10)}`}>{fmt(s.stft_above15_pct)}%</span></td>
                          <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.lambda,1.05,1.15)}`}>{fmt(s.lambda,3)}</span></td>
                          <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.iacv_mean,42,55)}`}>{fmt(s.iacv_mean)}%</span></td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.fuel_flow_mean,2)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.inst_consumption,1)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.adv_mean)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.vtec_pct)}%</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(s.bat_mean,2)}V</td>
                          <td style={{ padding: '10px 12px' }}><span className={`pill ${s.knock_events===0?'pill-g':'pill-r'}`}>{s.knock_events??'--'}</span></td>
                          <td style={{ padding: '10px 12px' }}><span className={`pill ${!s.mil_on_pct?'pill-g':'pill-r'}`}>{s.mil_on_pct?'ATIVO':'OFF'}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}