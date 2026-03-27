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
function kpiStatus(v: number | null, warnAt: number, badAt: number, dir: 'up' | 'down' = 'up') {
  if (v == null) return 'neutral' as const
  if (dir === 'up')  { if (v >= badAt) return 'bad' as const; if (v >= warnAt) return 'warn' as const; return 'good' as const }
  else               { if (v <= badAt) return 'bad' as const; if (v <= warnAt) return 'warn' as const; return 'good' as const }
}
const ALERT_COLOR: Record<string, string> = { bad:'#ef4444', warn:'#eab308', good:'#22c55e', info:'var(--accent)' }

const TABS = ['overview','timeline','consumo','tabela'] as const
type Tab = typeof TABS[number]

export default function Home() {
  const [dbSessions, setDbSessions]       = useState<LogSession[]>([])
  const [localSessions, setLocalSessions] = useState<LogSession[]>([])
  const [uploading, setUploading]         = useState(false)
  const [activeIdx, setActiveIdx]         = useState<number | null>(null)
  const [tab, setTab]                     = useState<Tab>('overview')

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
          const res = await fetch('/api/sessions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(session) })
          if (res.ok) {
            const { session: saved } = await res.json()
            setDbSessions(prev => { const i = prev.findIndex(s=>s.name===saved.name); if(i>=0){const n=[...prev];n[i]=saved;return n} return [...prev,saved] })
          }
        } catch {}
      } catch(e){ console.error(e) }
    }
    setLocalSessions(prev => { const m=new Map(prev.map(s=>[s.name,s])); newSessions.forEach(s=>m.set(s.name,s)); return Array.from(m.values()) })
    setActiveIdx(allSessions.length + newSessions.length - 1)
    setUploading(false)
  }, [allSessions.length])

  // Sidebar item
  function SidebarItem({ s, i }: { s: LogSession; i: number }) {
    const isActive = active?.name === s.name
    const dot = s.ltft != null ? (s.ltft<=2.5?'var(--green)':s.ltft<=4?'var(--yellow)':'var(--red)') : 'var(--muted)'
    const isNew = dbSessions.some(d=>d.name===s.name)||localSessions.some(l=>l.name===s.name)
    return (
      <div onClick={() => setActiveIdx(i)} style={{
        padding:'9px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer',
        position:'relative', background: isActive?'rgba(0,180,216,0.06)':'transparent', transition:'background 0.12s',
      }}>
        {isActive && <div style={{position:'absolute',left:0,top:0,bottom:0,width:2,background:'var(--accent)'}}/>}
        <div className="mono" style={{fontSize:10,color:'var(--text)',display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
          <span style={{width:5,height:5,borderRadius:'50%',background:dot,flexShrink:0,display:'inline-block'}}/>
          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
          {isNew && <span style={{color:'var(--accent)',fontSize:8,marginLeft:'auto'}}>●</span>}
        </div>
        <div className="label-xs" style={{paddingLeft:11}}>
          {s.rows?.toLocaleString()} reg{s.km_estimated?` · ${fmt(s.km_estimated,1)} km`:''}
        </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>

      {/* TOPBAR */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:48,background:'var(--panel)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <span className="mono" style={{fontSize:12,fontWeight:600,letterSpacing:2,color:'var(--accent)'}}>
            ACCORD <span style={{color:'var(--muted)',fontWeight:300}}>/ TELEMETRY</span>
          </span>
          <span className="mono" style={{fontSize:9,padding:'2px 7px',border:'1px solid var(--border2)',borderRadius:2,color:'var(--muted)',letterSpacing:1.5}}>
            F22B1 · CD5 · OBD1
          </span>
          {allSessions.length > BASELINE.length && (
            <span className="mono" style={{fontSize:9,padding:'2px 7px',border:'1px solid rgba(34,197,94,0.4)',borderRadius:2,color:'var(--green)',letterSpacing:1.5}}>
              {allSessions.length - BASELINE.length} IMPORTADO{allSessions.length-BASELINE.length>1?'S':''}
            </span>
          )}
        </div>
        <div style={{display:'flex',gap:0}}>
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)} className="mono" style={{
              padding:'0 16px',height:48,border:'none',
              borderBottom: tab===t?'2px solid var(--accent)':'2px solid transparent',
              background:'transparent',color:tab===t?'var(--accent)':'var(--muted)',
              fontSize:10,letterSpacing:1.5,textTransform:'uppercase',cursor:'pointer',transition:'color 0.15s',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* SIDEBAR */}
        <div style={{width:210,minWidth:210,flexShrink:0,background:'var(--panel)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div className="label-xs" style={{padding:'12px 14px 8px',borderBottom:'1px solid var(--border)'}}>Sessões</div>
          <div style={{flex:1,overflowY:'auto'}}>
            {allSessions.map((s,i) => <SidebarItem key={s.name} s={s} i={i}/>)}
          </div>
          <div style={{padding:12,borderTop:'1px solid var(--border)'}}>
            <UploadZone onFiles={handleFiles} loading={uploading}/>
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>

          {/* ── OVERVIEW ── */}
          {tab==='overview' && active && (
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              <div>
                <div className="mono" style={{fontSize:11,fontWeight:600,letterSpacing:2,color:'var(--text)',marginBottom:2}}>{active.name}</div>
                <div className="label-xs">
                  {active.rows?.toLocaleString()} registros
                  {active.duration_min ? ` · ${active.duration_min} min` : ''}
                  {active.km_estimated ? ` · ${fmt(active.km_estimated,1)} km estimados` : ''}
                </div>
              </div>

              {/* KPIs - temperatura */}
              <div>
                <div className="label-xs" style={{marginBottom:10}}>Temperatura</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                  <KpiCard label="ECT Média" value={fmt(active.ect_mean)} unit="°C" sub={`máx ${fmt(active.ect_max)}°C · >95°C: ${fmt(active.ect_above95_pct)}%`} status={kpiStatus(active.ect_max,97,102)}/>
                  <KpiCard label="IAT Média" value={fmt(active.iat_mean)} unit="°C" sub={`máx ${fmt(active.iat_max)}°C · >70°C: ${fmt(active.iat_above70_pct)}%`} status={kpiStatus(active.iat_mean,55,65)}/>
                  <KpiCard label="ECT > 95°C" value={fmt(active.ect_above95_pct)} unit="%" sub="tempo com motor quente" status={kpiStatus(active.ect_above95_pct,20,35)}/>
                </div>
              </div>

              {/* KPIs - combustível */}
              <div>
                <div className="label-xs" style={{marginBottom:10}}>Mistura & Fuel Trim</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                  <KpiCard label="LTFT" value={(active.ltft!=null&&active.ltft>0?'+':'')+fmt(active.ltft)} unit="%" sub="ideal: ±1.5%" status={kpiStatus(active.ltft,2.5,4)}/>
                  <KpiCard label="STFT > +15%" value={fmt(active.stft_above15_pct)} unit="%" sub="correção extrema" status={kpiStatus(active.stft_above15_pct,3,10)}/>
                  <KpiCard label="Lambda" value={fmt(active.lambda,3)} sub="ideal: ~1.000" status={kpiStatus(active.lambda,1.05,1.15)}/>
                  <KpiCard label="IACV" value={fmt(active.iacv_mean)} unit="%" sub="esperado: 30-38%" status={kpiStatus(active.iacv_mean,42,55)}/>
                </div>
              </div>

              {/* KPIs - consumo */}
              <div>
                <div className="label-xs" style={{marginBottom:10}}>Consumo & Distância</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                  <KpiCard label="Fluxo Médio" value={fmt(active.fuel_flow_mean,2)} unit="l/h" sub="consumo horário médio" status="info"/>
                  <KpiCard label="Consumo" value={fmt(active.inst_consumption,1)} unit="km/l" sub="média em cruzeiro" status="info"/>
                  <KpiCard label="Km Estimados" value={fmt(active.km_estimated,1)} unit="km" sub="distância neste log" status="info"/>
                  <KpiCard label="VTEC" value={fmt(active.vtec_pct)} unit="%" sub="tempo em alto RPM" status="neutral"/>
                </div>
              </div>

              {/* KPIs - aceleração */}
              {(active.lng_accel_max != null) && (
                <div>
                  <div className="label-xs" style={{marginBottom:10}}>Aceleração Longitudinal</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                    <KpiCard label="Aceleração Máx" value={fmt(active.lng_accel_max,3)} unit="G" sub="pico de aceleração" status="neutral"/>
                    <KpiCard label="Frenagem Máx" value={fmt(active.lng_accel_min,3)} unit="G" sub="pico de frenagem" status="neutral"/>
                    <KpiCard label="Aceleração Média" value={fmt(active.lng_accel_mean,3)} unit="G" sub="intensidade média" status="neutral"/>
                  </div>
                </div>
              )}

              {/* KPIs - elétrico e status */}
              <div>
                <div className="label-xs" style={{marginBottom:10}}>Elétrico & Status</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                  <KpiCard label="Bateria Média" value={fmt(active.bat_mean,2)} unit="V" sub={`mín ${fmt(active.bat_min,2)}V · <12V: ${fmt(active.bat_below12_pct)}%`} status={kpiStatus(active.bat_below12_pct,1,5)}/>
                  <KpiCard label="Knock" value={active.knock_events??'--'} sub="eventos de detonação" status={active.knock_events===0?'good':'bad'}/>
                  <KpiCard label="Closed Loop" value={fmt(active.closed_loop_pct)} unit="%" sub="ECU malha fechada" status="info"/>
                  <KpiCard label="Check Engine" value={active.mil_on_pct?'ATIVO':'OFF'} sub={active.mil_on_pct?`${fmt(active.mil_on_pct)}% do tempo`:'Sem falhas ativas'} status={active.mil_on_pct?'bad':'good'}/>
                  <KpiCard label="Vel. Máxima" value={fmt(active.vss_max,0)} unit="km/h" sub={`parado: ${fmt(active.stopped_pct)}%`} status="neutral"/>
                </div>
              </div>

              {/* Alertas */}
              <div>
                <div className="label-xs" style={{marginBottom:10}}>Diagnóstico Automático</div>
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {alerts.map((a,i) => (
                    <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'10px 14px',borderRadius:2,border:`1px solid ${ALERT_COLOR[a.type]}33`,background:`${ALERT_COLOR[a.type]}09`}}>
                      <div className="mono" style={{fontSize:9,padding:'2px 6px',borderRadius:2,background:`${ALERT_COLOR[a.type]}22`,color:ALERT_COLOR[a.type],letterSpacing:1,flexShrink:0,marginTop:1}}>{a.param}</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:500,color:ALERT_COLOR[a.type],marginBottom:2}}>{a.title}</div>
                        <div className="mono" style={{fontSize:10,color:'var(--muted)',lineHeight:1.5}}>{a.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TIMELINE ── */}
          {tab==='timeline' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <div className="mono" style={{fontSize:11,fontWeight:600,letterSpacing:2,color:'var(--text)',marginBottom:2}}>Linha do Tempo</div>
                <div className="label-xs">{allSessions.length} sessões · evolução histórica completa</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(420px,1fr))',gap:14}}>
                <TimelineChart title="LTFT — Long Term Fuel Trim" unit="%" labels={tlLabels}
                  datasets={[{label:'LTFT %',data:allSessions.map(s=>s.ltft),color:'#f97316'}]}
                  yMin={0} refLine={{value:1.5,label:'ideal ≤1.5%',color:'rgba(34,197,94,0.4)'}}/>
                <TimelineChart title="STFT — Correção Extrema (>+15%)" unit="%" labels={tlLabels}
                  datasets={[{label:'STFT>15%',data:allSessions.map(s=>s.stft_above15_pct),color:'#ef4444'}]}
                  yMin={0}/>
                <TimelineChart title="Lambda Médio" labels={tlLabels}
                  datasets={[{label:'Lambda',data:allSessions.map(s=>s.lambda),color:'#22c55e'}]}
                  yMin={0.95} yMax={1.30} refLine={{value:1.0,label:'estequiométrico',color:'rgba(34,197,94,0.4)'}}/>
                <TimelineChart title="IACV Médio" unit="%" labels={tlLabels}
                  datasets={[{label:'IACV %',data:allSessions.map(s=>s.iacv_mean),color:'#00b4d8'}]}
                  yMin={0} yMax={80} refLine={{value:38,label:'máx normal',color:'rgba(0,180,216,0.35)'}}/>
                <TimelineChart title="ECT — Temperatura" unit="°C" labels={tlLabels}
                  datasets={[{label:'Máx',data:allSessions.map(s=>s.ect_max),color:'#ef4444'},{label:'Média',data:allSessions.map(s=>s.ect_mean),color:'#f97316'}]}
                  yMin={70} refLine={{value:100,label:'100°C',color:'rgba(239,68,68,0.4)'}}/>
                <TimelineChart title="IAT — Temperatura de Admissão" unit="°C" labels={tlLabels}
                  datasets={[{label:'IAT Média',data:allSessions.map(s=>s.iat_mean),color:'#eab308'}]}
                  yMin={30}/>
                <TimelineChart title="Bateria Mínima" unit="V" labels={tlLabels}
                  datasets={[{label:'BAT Mín',data:allSessions.map(s=>s.bat_min),color:'#22c55e'}]}
                  yMin={9} yMax={15} refLine={{value:12,label:'12V mín',color:'rgba(239,68,68,0.4)'}}/>
                <TimelineChart title="VTEC Ativo" unit="%" labels={tlLabels}
                  datasets={[{label:'VTEC %',data:allSessions.map(s=>s.vtec_pct),color:'#a855f7'}]}
                  yMin={0}/>
              </div>
            </div>
          )}

          {/* ── CONSUMO ── */}
          {tab==='consumo' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <div className="mono" style={{fontSize:11,fontWeight:600,letterSpacing:2,color:'var(--text)',marginBottom:2}}>Consumo & Aceleração</div>
                <div className="label-xs">Evolução histórica · dados por sessão</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(420px,1fr))',gap:14}}>
                <TimelineChart title="Fluxo de Combustível Médio" unit="l/h" labels={tlLabels}
                  datasets={[{label:'l/h médio',data:allSessions.map(s=>s.fuel_flow_mean),color:'#f97316'}]}
                  yMin={0}/>
                <TimelineChart title="Consumo Instantâneo (cruzeiro)" unit="km/l" labels={tlLabels}
                  datasets={[{label:'km/l',data:allSessions.map(s=>s.inst_consumption),color:'#22c55e'}]}
                  yMin={0}/>
                <TimelineChart title="Distância Estimada por Sessão" unit="km" labels={tlLabels}
                  datasets={[{label:'km',data:allSessions.map(s=>s.km_estimated),color:'#00b4d8'}]}
                  yMin={0}/>
                <TimelineChart title="Aceleração Máxima" unit="G" labels={tlLabels}
                  datasets={[
                    {label:'Aceleração máx',data:allSessions.map(s=>s.lng_accel_max),color:'#22c55e'},
                    {label:'Frenagem máx',data:allSessions.map(s=>s.lng_accel_min),color:'#ef4444'},
                  ]}/>
                <TimelineChart title="Duração da Injeção" unit="ms" labels={tlLabels}
                  datasets={[{label:'Injeção ms',data:allSessions.map(s=>s.inj_dur),color:'#a855f7'}]}
                  yMin={3}/>
                <TimelineChart title="Velocidade Máxima por Sessão" unit="km/h" labels={tlLabels}
                  datasets={[{label:'VSS Máx',data:allSessions.map(s=>s.vss_max),color:'#00b4d8'}]}
                  yMin={0}/>
              </div>
            </div>
          )}

          {/* ── TABELA ── */}
          {tab==='tabela' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <div className="mono" style={{fontSize:11,fontWeight:600,letterSpacing:2,color:'var(--text)',marginBottom:2}}>Comparativo</div>
                <div className="label-xs">Todos os logs · {allSessions.length} sessões · clique para abrir</div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>
                  <thead>
                    <tr>
                      {['Sessão','Km','ECT Méd','ECT Máx','IAT','LTFT','STFT>15%','Lambda','IACV','Fluxo l/h','km/l','Avanço','VTEC%','Bat V','Knock','MIL'].map(h=>(
                        <th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:9,letterSpacing:1.5,textTransform:'uppercase',color:'var(--muted)',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap',background:'var(--panel)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allSessions.map((s,i)=>{
                      const isNew=dbSessions.some(d=>d.name===s.name)||localSessions.some(l=>l.name===s.name)
                      return (
                        <tr key={s.name} onClick={()=>{setActiveIdx(i);setTab('overview')}} style={{borderBottom:'1px solid var(--border)',background:isNew?'rgba(0,180,216,0.03)':'transparent',cursor:'pointer'}}>
                          <td style={{padding:'9px 10px',color:isNew?'var(--accent)':'var(--text)',fontWeight:500,whiteSpace:'nowrap'}}>{s.name}</td>
                          <td style={{padding:'9px 10px',whiteSpace:'nowrap'}}>{fmt(s.km_estimated,1)}</td>
                          <td style={{padding:'9px 10px'}}>{fmt(s.ect_mean)}°C</td>
                          <td style={{padding:'9px 10px'}}>{fmt(s.ect_max)}°C</td>
                          <td style={{padding:'9px 10px'}}>{fmt(s.iat_mean)}°C</td>
                          <td style={{padding:'9px 10px'}}><span className={`pill ${pillCls(s.ltft,2.5,4)}`}>{s.ltft!=null?(s.ltft>0?'+':'')+fmt(s.ltft):'--'}%</span></td>
                          <td style={{padding:'9px 10px'}}><span className={`pill ${pillCls(s.stft_above15_pct,3,10)}`}>{fmt(s.stft_above15_pct)}%</span></td>
                          <td style={{padding:'9px 10px'}}><span className={`pill ${pillCls(s.lambda,1.05,1.15)}`}>{fmt(s.lambda,3)}</span></td>
                          <td style={{padding:'9px 10px'}}><span className={`pill ${pillCls(s.iacv_mean,42,55)}`}>{fmt(s.iacv_mean)}%</span></td>
                          <td style={{padding:'9px 10px'}}>{fmt(s.fuel_flow_mean,2)}</td>
                          <td style={{padding:'9px 10px'}}>{fmt(s.inst_consumption,1)}</td>
                          <td style={{padding:'9px 10px'}}>{fmt(s.adv_mean)}°</td>
                          <td style={{padding:'9px 10px'}}>{fmt(s.vtec_pct)}%</td>
                          <td style={{padding:'9px 10px'}}>{fmt(s.bat_mean,2)}V</td>
                          <td style={{padding:'9px 10px'}}><span className={`pill ${s.knock_events===0?'pill-g':'pill-r'}`}>{s.knock_events??'--'}</span></td>
                          <td style={{padding:'9px 10px'}}><span className={`pill ${!s.mil_on_pct?'pill-g':'pill-r'}`}>{s.mil_on_pct?'ATIVO':'OFF'}</span></td>
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
