'use client'

import { useEffect, useState, useCallback } from 'react'
import KpiCard from '@/components/KpiCard'
import TimelineChart from '@/components/TimelineChart'
import UploadZone from '@/components/UploadZone'
import { parseCSVFile, BASELINE } from '@/lib/parser'
import { generateAlerts } from '@/lib/alerts'
import type { LogSession } from '@/lib/supabase'

type Lang = 'en' | 'pt'
const T: Record<Lang, Record<string, string>> = {
  en: {
    sessions:'Sessions', overview:'Overview', timeline:'Timeline', table:'Table',
    records:'records', imported:'imported', temp:'Temperature',
    mixture:'Mixture & Fuel Trim', consump_sec:'Consumption & Distance',
    elec:'Electrical & Status', diagnosis:'Diagnosis', noFaults:'No active faults',
    active_str:'ACTIVE', filter_charts:'Filter Charts', select_all:'All', clear_sel:'Clear',
    sessions_header:'Sessions', all_logs:'All logs', ignition_sec:'Ignition & Engine Load',
    upload_drag:'Drag CSV or click to import',
    upload_sub:'HondsH OBD1 Â· English or Portuguese\nMultiple files at once',
    collapse:'Collapse', expand:'Expand',
    ect_avg:'ECT Avg', iat_avg:'IAT Avg', ect_hot:'ECT > 95Â°C',
    ltft_lbl:'LTFT', stft_lbl:'STFT > +15%', lambda_lbl:'Lambda', iacv_lbl:'IACV',
    adv_lbl:'Ign. Advance', adv_max_lbl:'Adv. Max',
    knock_lbl:'Knock', map_lbl:'MAP', map_wot_lbl:'MAP @ WOT', clv_lbl:'Calc. Load',
    rev_max_lbl:'Rev Max', inj_dur_lbl:'Inj. Duration', inj_dc_lbl:'Inj. Duty Cycle',
    egr_lbl:'EGR Active', flow_lbl:'Fuel Flow', consump_lbl:'Consumption',
    km_lbl:'Est. Distance', vtec_lbl:'VTEC', bat_lbl:'Battery', eld_lbl:'ELD Current',
    alt_lbl:'Alternator FR', cl_lbl:'Closed Loop', mil_lbl:'Check Engine',
    vmax_lbl:'Max Speed', ac_lbl:'A/C Active', fan_lbl:'Fan Active',
    ch_ltft:'LTFT â€” Long Term Fuel Trim', ch_stft:'STFT â€” Extreme Correction (>+15%)',
    ch_lambda:'Lambda (Oâ‚‚)', ch_iacv:'IACV â€” Idle Air Control',
    ch_ect:'ECT â€” Coolant Temp', ch_iat:'IAT â€” Intake Air Temp',
    ch_bat:'Battery Min', ch_vtec:'VTEC Active Time',
    ch_adv:'Ignition Advance (avg)', ch_adv_max:'Ignition Advance (max)',
    ch_knock:'Knock Events', ch_map:'MAP â€” Manifold Pressure',
    ch_map_wot:'MAP @ WOT', ch_clv:'Calculated Load Value',
    ch_rev:'Engine RPM (max)', ch_inj:'Injection Duration',
    ch_inj_dc:'Injector Duty Cycle', ch_egr:'EGR Active Time',
    ch_flow:'Fuel Flow (l/h)', ch_consump:'Consumption (km/l)',
    ch_km:'Est. Distance per session', ch_accel:'Longitudinal Acceleration',
    ch_vmax:'Max Speed', ch_eld:'ELD Current',
  },
  pt: {
    sessions:'SessÃµes', overview:'VisÃ£o Geral', timeline:'Linha do Tempo', table:'Tabela',
    records:'registros', imported:'importado(s)', temp:'Temperatura',
    mixture:'Mistura & Fuel Trim', consump_sec:'Consumo & DistÃ¢ncia',
    elec:'ElÃ©trico & Status', diagnosis:'DiagnÃ³stico', noFaults:'Sem falhas ativas',
    active_str:'ATIVO', filter_charts:'Filtrar GrÃ¡ficos', select_all:'Todos', clear_sel:'Limpar',
    sessions_header:'SessÃµes', all_logs:'Todos os logs', ignition_sec:'IgniÃ§Ã£o & Carga do Motor',
    upload_drag:'Arrastar CSV ou clicar para importar',
    upload_sub:'HondsH OBD1 Â· InglÃªs ou PortuguÃªs\nMÃºltiplos arquivos simultÃ¢neos',
    collapse:'Recolher', expand:'Expandir',
    ect_avg:'ECT MÃ©dia', iat_avg:'IAT MÃ©dia', ect_hot:'ECT > 95Â°C',
    ltft_lbl:'LTFT', stft_lbl:'STFT > +15%', lambda_lbl:'Lambda', iacv_lbl:'IACV',
    adv_lbl:'AvanÃ§o Ign.', adv_max_lbl:'AvanÃ§o MÃ¡x.',
    knock_lbl:'Knock', map_lbl:'MAP', map_wot_lbl:'MAP @ WOT', clv_lbl:'Carga Calc.',
    rev_max_lbl:'RotaÃ§Ã£o MÃ¡x.', inj_dur_lbl:'Dur. InjeÃ§Ã£o', inj_dc_lbl:'DC InjeÃ§Ã£o',
    egr_lbl:'EGR Ativo', flow_lbl:'Fluxo Comb.', consump_lbl:'Consumo',
    km_lbl:'Dist. Estimada', vtec_lbl:'VTEC', bat_lbl:'Bateria', eld_lbl:'Corrente ELD',
    alt_lbl:'FR Alternador', cl_lbl:'Malha Fechada', mil_lbl:'Check Engine',
    vmax_lbl:'Vel. MÃ¡x.', ac_lbl:'A/C Ativo', fan_lbl:'Ventoinha',
    ch_ltft:'LTFT â€” Trim Longo Prazo', ch_stft:'STFT â€” CorreÃ§Ã£o Extrema (>+15%)',
    ch_lambda:'Lambda (Sonda Oâ‚‚)', ch_iacv:'IACV â€” VÃ¡lvula Marcha Lenta',
    ch_ect:'ECT â€” Temperatura Motor', ch_iat:'IAT â€” Temperatura AdmissÃ£o',
    ch_bat:'Bateria MÃ­nima', ch_vtec:'VTEC Ativo',
    ch_adv:'AvanÃ§o IgniÃ§Ã£o (mÃ©dia)', ch_adv_max:'AvanÃ§o IgniÃ§Ã£o (mÃ¡x)',
    ch_knock:'Eventos Knock', ch_map:'MAP â€” PressÃ£o Coletor',
    ch_map_wot:'MAP @ AceleraÃ§Ã£o Total', ch_clv:'Valor Calculado Carga',
    ch_rev:'RotaÃ§Ã£o MÃ¡xima', ch_inj:'DuraÃ§Ã£o InjeÃ§Ã£o',
    ch_inj_dc:'Duty Cycle Injetor', ch_egr:'EGR Ativo',
    ch_flow:'Fluxo CombustÃ­vel (l/h)', ch_consump:'Consumo (km/l)',
    ch_km:'DistÃ¢ncia Estimada por SessÃ£o', ch_accel:'AceleraÃ§Ã£o Longitudinal',
    ch_vmax:'Velocidade MÃ¡xima', ch_eld:'Corrente ELD',
  },
}

type ChartDef = {
  id: string; group: 'fuel'|'temp'|'ignition'|'consumption'|'electrical'
  titleKey: string; unit?: string; yMin?: number; yMax?: number
  refLine?: { value: number; labelKey: string; color: string }
  datasets: { labelKey: string; field: keyof LogSession; color: string }[]
}
const CHART_DEFS: ChartDef[] = [
  { id:'ltft',    group:'fuel',        titleKey:'ch_ltft',    unit:'%',   yMin:0,  refLine:{value:1.5,labelKey:'ideal',color:'rgba(22,163,74,0.5)'},  datasets:[{labelKey:'ltft_lbl',   field:'ltft',             color:'#ea580c'}] },
  { id:'stft',    group:'fuel',        titleKey:'ch_stft',    unit:'%',   yMin:0,  datasets:[{labelKey:'stft_lbl',  field:'stft_above15_pct',  color:'#dc2626'}] },
  { id:'lambda',  group:'fuel',        titleKey:'ch_lambda',              yMin:0.95,yMax:1.35, refLine:{value:1.0,labelKey:'stoich',color:'rgba(22,163,74,0.5)'}, datasets:[{labelKey:'lambda_lbl',field:'lambda',            color:'#16a34a'}] },
  { id:'iacv',    group:'fuel',        titleKey:'ch_iacv',    unit:'%',   yMin:0,yMax:85, refLine:{value:38,labelKey:'max normal',color:'rgba(37,99,235,0.5)'}, datasets:[{labelKey:'iacv_lbl',  field:'iacv_mean',        color:'#2563eb'}] },
  { id:'ect',     group:'temp',        titleKey:'ch_ect',     unit:'Â°C',  yMin:65, refLine:{value:100,labelKey:'100Â°C',color:'rgba(220,38,38,0.5)'}, datasets:[{labelKey:'ect_avg',   field:'ect_max',  color:'#dc2626'},{labelKey:'ect_avg',field:'ect_mean',color:'#ea580c'}] },
  { id:'iat',     group:'temp',        titleKey:'ch_iat',     unit:'Â°C',  yMin:25, datasets:[{labelKey:'iat_avg',   field:'iat_mean',         color:'#ca8a04'}] },
  { id:'adv',     group:'ignition',    titleKey:'ch_adv',     unit:'Â°',   datasets:[{labelKey:'adv_lbl',   field:'adv_mean',         color:'#7c3aed'}] },
  { id:'adv_max', group:'ignition',    titleKey:'ch_adv_max', unit:'Â°',   datasets:[{labelKey:'adv_max_lbl',field:'adv_max',          color:'#9333ea'}] },
  { id:'knock',   group:'ignition',    titleKey:'ch_knock',               datasets:[{labelKey:'knock_lbl', field:'knock_events',     color:'#dc2626'}] },
  { id:'map',     group:'ignition',    titleKey:'ch_map',     unit:'PSI', datasets:[{labelKey:'map_lbl',   field:'map_mean',         color:'#6366f1'}] },
  { id:'map_wot', group:'ignition',    titleKey:'ch_map_wot', unit:'PSI', datasets:[{labelKey:'map_wot_lbl',field:'map_wot',         color:'#4f46e5'}] },
  { id:'clv',     group:'ignition',    titleKey:'ch_clv',     unit:'%',   datasets:[{labelKey:'clv_lbl',   field:'clv_mean',         color:'#64748b'}] },
  { id:'rev',     group:'ignition',    titleKey:'ch_rev',     unit:'rpm', datasets:[{labelKey:'rev_max_lbl',field:'rev_max',         color:'#db2777'}] },
  { id:'inj',     group:'ignition',    titleKey:'ch_inj',     unit:'ms',  yMin:2,  datasets:[{labelKey:'inj_dur_lbl',field:'inj_dur',         color:'#9d174d'}] },
  { id:'inj_dc',  group:'ignition',    titleKey:'ch_inj_dc',  unit:'%',   datasets:[{labelKey:'inj_dc_lbl',field:'inj_dc_mean',      color:'#be185d'}] },
  { id:'egr',     group:'ignition',    titleKey:'ch_egr',     unit:'%',   datasets:[{labelKey:'egr_lbl',   field:'egr_active_pct',   color:'#475569'}] },
  { id:'flow',    group:'consumption', titleKey:'ch_flow',    unit:'l/h', yMin:0,  datasets:[{labelKey:'flow_lbl',  field:'fuel_flow_mean',   color:'#ea580c'}] },
  { id:'consump', group:'consumption', titleKey:'ch_consump', unit:'km/l',yMin:0,  datasets:[{labelKey:'consump_lbl',field:'inst_consumption', color:'#16a34a'}] },
  { id:'km',      group:'consumption', titleKey:'ch_km',      unit:'km',  yMin:0,  datasets:[{labelKey:'km_lbl',    field:'km_estimated',     color:'#0284c7'}] },
  { id:'vmax',    group:'consumption', titleKey:'ch_vmax',    unit:'km/h',yMin:0,  datasets:[{labelKey:'vmax_lbl',  field:'vss_max',          color:'#0369a1'}] },
  { id:'accel',   group:'consumption', titleKey:'ch_accel',   unit:'G',   datasets:[{labelKey:'adv_max_lbl',field:'lng_accel_max',    color:'#16a34a'},{labelKey:'adv_lbl',field:'lng_accel_min',color:'#dc2626'}] },
  { id:'bat',     group:'electrical',  titleKey:'ch_bat',     unit:'V',   yMin:9,yMax:15, refLine:{value:12,labelKey:'12V',color:'rgba(220,38,38,0.45)'}, datasets:[{labelKey:'bat_lbl',field:'bat_min',color:'#16a34a'}] },
  { id:'eld',     group:'electrical',  titleKey:'ch_eld',     unit:'A',   datasets:[{labelKey:'eld_lbl',   field:'eld_mean',         color:'#ca8a04'}] },
  { id:'vtec',    group:'electrical',  titleKey:'ch_vtec',    unit:'%',   yMin:0,  datasets:[{labelKey:'vtec_lbl',  field:'vtec_pct',         color:'#7c3aed'}] },
]
const GROUP_LABELS: Record<string, string> = {
  fuel:'Fuel & Mixture', temp:'Temperature', ignition:'Ignition & Engine Load',
  consumption:'Consumption & Performance', electrical:'Electrical',
}

function fmt(n: number|null|undefined, d=1) { return n!=null&&isFinite(n)?n.toFixed(d):'--' }
function pillCls(v: number|null, good: number, warn: number) {
  if(v==null)return'pill-n'; if(v<=good)return'pill-g'; if(v<=warn)return'pill-y'; return'pill-r'
}
function kpiStatus(v: number|null, warnAt: number, badAt: number, dir:'up'|'down'='up'): 'good'|'warn'|'bad'|'neutral' {
  if(v==null)return'neutral'
  if(dir==='up'){if(v>=badAt)return'bad';if(v>=warnAt)return'warn';return'good'}
  else{if(v<=badAt)return'bad';if(v<=warnAt)return'warn';return'good'}
}
const AC: Record<string,string> = {bad:'#b91c1c',warn:'#92400e',good:'#166534',info:'#1e40af'}

export default function Home() {
  const [dbSessions, setDbSessions]         = useState<LogSession[]>([])
  const [localSessions, setLocalSessions]   = useState<LogSession[]>([])
  const [uploading, setUploading]           = useState(false)
  const [activeIdx, setActiveIdx]           = useState<number|null>(null)
  const [tab, setTab]                       = useState<'overview'|'timeline'|'table'>('overview')
  const [lang, setLang]                     = useState<Lang>('en')
  const [selectedCharts, setSelectedCharts] = useState<Set<string>>(new Set(CHART_DEFS.map(c=>c.id)))
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)

  const t = (k: string) => T[lang][k]??k

  useEffect(() => {
    fetch('/api/sessions').then(r=>r.json()).then(d=>{if(d.sessions)setDbSessions(d.sessions)}).catch(()=>{})
  }, [])

  const allSessions: LogSession[] = (() => {
    const map = new Map<string,LogSession>()
    BASELINE.forEach(s=>map.set(s.name,s))
    dbSessions.forEach(s=>map.set(s.name,s))
    localSessions.forEach(s=>map.set(s.name,s))
    return Array.from(map.values())
  })()

  const active = activeIdx!=null?allSessions[activeIdx]:allSessions[allSessions.length-1]
  const alerts = active?generateAlerts(active, lang):[]
  const tlLabels = allSessions.map(s=>s.name)
  const isNew = (s: LogSession) => dbSessions.some(d=>d.name===s.name)||localSessions.some(l=>l.name===s.name)

  const handleFiles = useCallback(async (files: File[]) => {
    setUploading(true)
    const newSessions: LogSession[] = []
    for(const file of files){
      try{
        const {session} = await parseCSVFile(file)
        newSessions.push(session)
        try{
          const res = await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(session)})
          if(res.ok){const{session:saved}=await res.json();setDbSessions(prev=>{const i=prev.findIndex(s=>s.name===saved.name);if(i>=0){const n=[...prev];n[i]=saved;return n}return[...prev,saved]})}
        }catch{}
      }catch(e){console.error(e)}
    }
    setLocalSessions(prev=>{const m=new Map(prev.map(s=>[s.name,s]));newSessions.forEach(s=>m.set(s.name,s));return Array.from(m.values())})
    setActiveIdx(allSessions.length+newSessions.length-1)
    setUploading(false)
  },[allSessions.length])

  const toggleChart = (id: string) => setSelectedCharts(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  const toggleGroup = (g: string) => setCollapsedGroups(prev=>{const n=new Set(prev);n.has(g)?n.delete(g):n.add(g);return n})
  const visibleCharts = CHART_DEFS.filter(c=>selectedCharts.has(c.id))
  const groups = Array.from(new Set(CHART_DEFS.map(c=>c.group)))

  const SL: React.CSSProperties = {fontSize:11,letterSpacing:'2px',textTransform:'uppercase' as const,color:'#6b7280',marginBottom:12,display:'block',fontFamily:'IBM Plex Mono,monospace',fontWeight:600}
  const KG: React.CSSProperties = {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12}

  // Sidebar date display
  const getDisplayDate = (s: LogSession) => {
    const ca = (s as any).created_at
    if (ca) {
      const d = new Date(ca)
      if (lang === 'pt') return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
    }
    return null
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'#f5f4f0',fontFamily:"'IBM Plex Sans',sans-serif"}}>

      {/* TOPBAR */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:56,background:'#ffffff',borderBottom:'1px solid #e5e0d8',flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{display:'flex',alignItems:'baseline',gap:4}}>
            <span style={{fontSize:16,fontWeight:800,letterSpacing:3,color:'#1d4ed8',fontFamily:'IBM Plex Mono,monospace'}}>HNDSH</span>
            <span style={{fontSize:13,color:'#9ca3af',letterSpacing:1,fontFamily:'IBM Plex Mono,monospace'}}>.meters</span>
          </div>
          <div style={{width:1,height:20,background:'#e5e0d8'}}/>
          <span style={{fontSize:12,padding:'4px 12px',border:'1px solid #e5e0d8',borderRadius:6,color:'#6b7280',letterSpacing:1.5,background:'#f9f8f5',fontFamily:'IBM Plex Mono,monospace',fontWeight:500}}>Honda OBD1</span>
          {allSessions.length>BASELINE.length&&(
            <span style={{fontSize:12,padding:'4px 12px',border:'1px solid #bbf7d0',borderRadius:6,color:'#15803d',letterSpacing:1.5,background:'#f0fdf4',fontFamily:'IBM Plex Mono,monospace',fontWeight:600}}>
              {allSessions.length-BASELINE.length} {t('imported')}
            </span>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',height:56}}>
          {(['overview','timeline','table'] as const).map(tb=>(
            <button key={tb} onClick={()=>setTab(tb)} style={{padding:'0 22px',height:56,border:'none',borderBottom:tab===tb?'2px solid #1d4ed8':'2px solid transparent',background:'transparent',color:tab===tb?'#1d4ed8':'#6b7280',fontSize:12,letterSpacing:2,textTransform:'uppercase',cursor:'pointer',fontWeight:tab===tb?700:500,fontFamily:'IBM Plex Mono,monospace',transition:'color 0.15s'}}>
              {t(tb==='overview'?'overview':tb==='timeline'?'timeline':'table')}
            </button>
          ))}
          <div style={{marginLeft:20,display:'flex',gap:6,alignItems:'center',paddingLeft:20,borderLeft:'1px solid #e5e0d8'}}>
            <button onClick={()=>setLang('en')} title="English" style={{background:lang==='en'?'#eff6ff':'transparent',border:'1px solid',borderColor:lang==='en'?'#bfdbfe':'#e5e0d8',borderRadius:5,cursor:'pointer',color:lang==='en'?'#1d4ed8':'#9ca3af',fontSize:11,fontFamily:'IBM Plex Mono,monospace',fontWeight:700,padding:'3px 9px',letterSpacing:1,transition:'all 0.15s'}}>EN</button>
            <button onClick={()=>setLang('pt')} title="PortuguÃªs" style={{background:lang==='pt'?'#eff6ff':'transparent',border:'1px solid',borderColor:lang==='pt'?'#bfdbfe':'#e5e0d8',borderRadius:5,cursor:'pointer',color:lang==='pt'?'#1d4ed8':'#9ca3af',fontSize:11,fontFamily:'IBM Plex Mono,monospace',fontWeight:700,padding:'3px 9px',letterSpacing:1,transition:'all 0.15s'}}>PT</button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* SIDEBAR */}
        <div style={{width:230,minWidth:230,flexShrink:0,background:'#ffffff',borderRight:'1px solid #e5e0d8',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'13px 16px 11px',borderBottom:'1px solid #e5e0d8',fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'#9ca3af',fontFamily:'IBM Plex Mono,monospace',fontWeight:600}}>{t('sessions_header')}</div>
          <div style={{flex:1,overflowY:'auto'}}>
            {allSessions.map((s,i)=>{
              const isActive = active?.name===s.name
              const dot = s.ltft!=null?(s.ltft<=2.5?'#15803d':s.ltft<=4?'#a16207':'#b91c1c'):'#d1d5db'
              return (
                <div key={s.name} onClick={()=>setActiveIdx(i)} style={{padding:'12px 16px',borderBottom:'1px solid #f0eeea',cursor:'pointer',position:'relative',background:isActive?'#eff6ff':'transparent',transition:'background 0.15s'}}>
                  {isActive&&<div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:'#1d4ed8',borderRadius:'0 2px 2px 0'}}/>}
                  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:dot,flexShrink:0}}/>
                    {getDisplayDate(s)
                      ? <span style={{fontSize:13,fontWeight:700,color:isActive?'#1d4ed8':'#1a1814',flex:1}}>{getDisplayDate(s)}</span>
                      : <span style={{fontSize:13,fontWeight:700,color:isActive?'#1d4ed8':'#6b7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{s.name}</span>
                    }
                    {isNew(s)&&<span style={{fontSize:9,background:'#dbeafe',color:'#1d4ed8',padding:'1px 5px',borderRadius:3,fontWeight:700,fontFamily:'IBM Plex Mono,monospace'}}>NEW</span>}
                  </div>
                  {getDisplayDate(s) && (
                    <div style={{fontSize:11,color:'#6b7280',paddingLeft:15,fontFamily:'IBM Plex Mono,monospace',fontWeight:500}}>
                      {s.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Upload zone */}
          <div style={{padding:14,borderTop:'1px solid #e5e0d8'}}>
            <div
              onClick={()=>{ const inp=document.getElementById('csv-upload') as HTMLInputElement; inp?.click() }}
              onDragOver={e=>{e.preventDefault();(e.currentTarget as HTMLDivElement).style.background='#eff6ff'}}
              onDragLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}
              onDrop={e=>{e.preventDefault();(e.currentTarget as HTMLDivElement).style.background='transparent';const files=Array.from(e.dataTransfer.files).filter(f=>f.name.endsWith('.csv'));if(files.length)handleFiles(files)}}
              style={{border:'1.5px dashed #c8c3b8',borderRadius:8,padding:'16px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer',transition:'all 0.15s',background:'transparent'}}
            >
              <input id="csv-upload" type="file" accept=".csv" multiple style={{display:'none'}} onChange={e=>{const files=Array.from(e.target.files||[]);if(files.length)handleFiles(files);e.target.value=''}}/>
              
              <span style={{fontSize:11,fontWeight:600,color:'#6b7280',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'0.5px',textAlign:'center'}}>
                {uploading?'Processing...':(lang==='en'?'Drag CSV or click to import':'Arrastar CSV ou clicar para importar')}
              </span>
              <span style={{fontSize:10,color:'#9ca3af',fontFamily:'IBM Plex Mono,monospace',textAlign:'center',lineHeight:1.6}}>
                {lang==='en'?'HondsH OBD1 Â· EN or PT\nMultiple files at once':'HondsH OBD1 Â· EN ou PT\nMÃºltiplos arquivos simultÃ¢neos'}
              </span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{flex:1,overflowY:'auto',padding:'32px 36px'}}>

          {/* OVERVIEW */}
          {tab==='overview'&&active&&(
            <div>
              <div style={{marginBottom:32}}>
                <h1 style={{fontSize:24,fontWeight:800,color:'#1a1814',marginBottom:6}}>{active.name}</h1>
                <span style={{fontSize:12,letterSpacing:'1.5px',textTransform:'uppercase',color:'#9ca3af',fontFamily:'IBM Plex Mono,monospace'}}>
                  {active.rows?.toLocaleString()} {t('records')}{active.duration_min?` Â· ${active.duration_min} min`:''}{active.km_estimated?` Â· ${fmt(active.km_estimated,1)} km`:''}
                </span>
              </div>

              {/* Temperature */}
              <div style={{marginBottom:28}}><span style={SL}>{t('temp')}</span><div style={KG}>
                <KpiCard label={t('ect_avg')} value={fmt(active.ect_mean)} unit="Â°C" sub={`max ${fmt(active.ect_max)}Â°C`} status={kpiStatus(active.ect_max,97,102)}/>
                <KpiCard label={t('iat_avg')} value={fmt(active.iat_mean)} unit="Â°C" sub={`max ${fmt(active.iat_max)}Â°C`} status={kpiStatus(active.iat_mean,55,65)}/>
                <KpiCard label={t('ect_hot')} value={fmt(active.ect_above95_pct)} unit="%" sub="time above 95Â°C" status={kpiStatus(active.ect_above95_pct,20,35)}/>
              </div></div>

              {/* Mixture */}
              <div style={{marginBottom:28}}><span style={SL}>{t('mixture')}</span><div style={KG}>
                <KpiCard label={t('ltft_lbl')} value={(active.ltft!=null&&active.ltft>0?'+':'')+fmt(active.ltft)} unit="%" sub="ideal: Â±1.5%" status={kpiStatus(active.ltft,2.5,4)}/>
                <KpiCard label={t('stft_lbl')} value={fmt(active.stft_above15_pct)} unit="%" sub="extreme correction" status={kpiStatus(active.stft_above15_pct,3,10)}/>
                <KpiCard label={t('lambda_lbl')} value={fmt(active.lambda,3)} sub="ideal: ~1.000" status={kpiStatus(active.lambda,1.05,1.15)}/>
                <KpiCard label={t('iacv_lbl')} value={fmt(active.iacv_mean)} unit="%" sub="expected: 30-38%" status={kpiStatus(active.iacv_mean,42,55)}/>
              </div></div>

              {/* Ignition */}
              <div style={{marginBottom:28}}><span style={SL}>{t('ignition_sec')}</span><div style={KG}>
                <KpiCard label={t('adv_lbl')} value={fmt(active.adv_mean)} unit="Â°" sub={`max ${fmt(active.adv_max)}Â°`} status="info"/>
                <KpiCard label={t('knock_lbl')} value={active.knock_events??'--'} sub={`max ${fmt(active.knock_max,3)}V`} status={active.knock_events===0?'good':'bad'}/>
                <KpiCard label={t('map_lbl')} value={fmt(active.map_mean)} unit="PSI" sub={`WOT: ${fmt(active.map_wot)} PSI`} status="neutral"/>
                <KpiCard label={t('clv_lbl')} value={fmt(active.clv_mean)} unit="%" sub="engine load" status="neutral"/>
                <KpiCard label={t('rev_max_lbl')} value={fmt(active.rev_max,0)} unit="rpm" sub={`avg ${fmt(active.rev_mean,0)} rpm`} status="neutral"/>
                <KpiCard label={t('inj_dur_lbl')} value={fmt(active.inj_dur,2)} unit="ms" sub={`DC: ${fmt(active.inj_dc_mean)}%`} status="neutral"/>
                <KpiCard label={t('egr_lbl')} value={fmt(active.egr_active_pct)} unit="%" sub="recirculation" status="neutral"/>
              </div></div>

              {/* Consumption */}
              <div style={{marginBottom:28}}><span style={SL}>{t('consump_sec')}</span><div style={KG}>
                <KpiCard label={t('flow_lbl')} value={fmt(active.fuel_flow_mean,2)} unit="l/h" sub="avg hourly" status="info"/>
                <KpiCard label={t('consump_lbl')} value={fmt(active.inst_consumption,1)} unit="km/l" sub="cruise avg" status="info"/>
                <KpiCard label={t('km_lbl')} value={fmt(active.km_estimated,1)} unit="km" sub="this session" status="info"/>
                <KpiCard label={t('vtec_lbl')} value={fmt(active.vtec_pct)} unit="%" sub="high RPM time" status="neutral"/>
                <KpiCard label={t('vmax_lbl')} value={fmt(active.vss_max,0)} unit="km/h" sub={`stopped: ${fmt(active.stopped_pct)}%`} status="neutral"/>
              </div></div>

              {/* Electrical */}
              <div style={{marginBottom:28}}><span style={SL}>{t('elec')}</span><div style={KG}>
                <KpiCard label={t('bat_lbl')} value={fmt(active.bat_mean,2)} unit="V" sub={`min ${fmt(active.bat_min,2)}V`} status={kpiStatus(active.bat_below12_pct,1,5)}/>
                <KpiCard label={t('eld_lbl')} value={fmt(active.eld_mean,0)} unit="A" sub="electrical load" status="neutral"/>
                <KpiCard label={t('alt_lbl')} value={fmt(active.alt_fr_mean)} unit="%" sub="alternator load" status="neutral"/>
                <KpiCard label={t('cl_lbl')} value={fmt(active.closed_loop_pct)} unit="%" sub="ECU closed loop" status="info"/>
                <KpiCard label={t('mil_lbl')} value={active.mil_on_pct?t('active_str'):'OFF'} sub={active.mil_on_pct?`${fmt(active.mil_on_pct)}%`:t('noFaults')} status={active.mil_on_pct?'bad':'good'}/>
                {active.ac_on_pct!=null&&<KpiCard label={t('ac_lbl')} value={fmt(active.ac_on_pct)} unit="%" sub="A/C switch" status="neutral"/>}
                {active.fan_on_pct!=null&&<KpiCard label={t('fan_lbl')} value={fmt(active.fan_on_pct)} unit="%" sub="radiator fan" status="neutral"/>}
              </div></div>

              {/* Diagnosis */}
              <div style={{marginBottom:28}}><span style={SL}>{t('diagnosis')}</span>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {alerts.map((a,idx)=>(
                    <div key={idx} style={{display:'flex',gap:14,alignItems:'flex-start',padding:'16px 20px',borderRadius:10,border:`1px solid ${AC[a.type]}30`,background:`${AC[a.type]}08`}}>
                      <div style={{fontSize:11,padding:'4px 10px',borderRadius:5,background:`${AC[a.type]}15`,color:AC[a.type],letterSpacing:1,flexShrink:0,fontFamily:'IBM Plex Mono,monospace',fontWeight:700,marginTop:1}}>{a.param}</div>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:AC[a.type],marginBottom:5}}>{a.title}</div>
                        <div style={{fontSize:13,color:'#4b5563',lineHeight:1.6}}>{a.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {tab==='timeline'&&(
            <div>
              {/* Timeline header + filter button */}
              <div style={{marginBottom:28,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
                <div>
                  <h1 style={{fontSize:24,fontWeight:800,color:'#1a1814',marginBottom:6}}>{t('timeline')}</h1>
                  <span style={{fontSize:12,letterSpacing:'1.5px',textTransform:'uppercase',color:'#9ca3af',fontFamily:'IBM Plex Mono,monospace'}}>
                    {allSessions.length} {t('sessions')} Â· {visibleCharts.length} {lang==='en'?'charts visible':'grÃ¡ficos visÃ­veis'}
                  </span>
                </div>
                <button
                  onClick={()=>setFilterOpen(o=>!o)}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:filterOpen?'#eff6ff':'#ffffff',border:'1px solid',borderColor:filterOpen?'#bfdbfe':'#e5e0d8',borderRadius:8,cursor:'pointer',color:filterOpen?'#1d4ed8':'#6b7280',fontFamily:'IBM Plex Mono,monospace',fontSize:12,fontWeight:600,letterSpacing:1,transition:'all 0.15s',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  {t('filter_charts')}
                </button>
              </div>
              {/* Filter panel - collapsible */}
              {filterOpen && (
                <div style={{background:'#ffffff',border:'1px solid #e5e0d8',borderRadius:12,padding:'18px 22px',marginBottom:28,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#374151',letterSpacing:1.5,textTransform:'uppercase',fontFamily:'IBM Plex Mono,monospace'}}>{t('filter_charts')}</span>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>setSelectedCharts(new Set(CHART_DEFS.map(c=>c.id)))} style={{fontSize:11,padding:'4px 12px',border:'1px solid #e5e0d8',borderRadius:5,background:'#eff6ff',color:'#1d4ed8',cursor:'pointer',fontFamily:'IBM Plex Mono,monospace',fontWeight:600}}>{t('select_all')}</button>
                      <button onClick={()=>setSelectedCharts(new Set())} style={{fontSize:11,padding:'4px 12px',border:'1px solid #e5e0d8',borderRadius:5,background:'transparent',color:'#9ca3af',cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'16px 24px'}}>
                    {groups.map(grp=>(
                      <div key={grp}>
                        <div style={{fontSize:10,fontWeight:700,color:'#1d4ed8',letterSpacing:2,textTransform:'uppercase',marginBottom:8,fontFamily:'IBM Plex Mono,monospace'}}>{GROUP_LABELS[grp]}</div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {CHART_DEFS.filter(c=>c.group===grp).map(c=>(
                            <label key={c.id} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',userSelect:'none'}}>
                              <input type="checkbox" checked={selectedCharts.has(c.id)} onChange={()=>toggleChart(c.id)} style={{accentColor:'#1d4ed8',width:13,height:13,cursor:'pointer'}}/>
                              <span style={{fontSize:12,color:selectedCharts.has(c.id)?'#1a1814':'#9ca3af',fontFamily:'IBM Plex Mono,monospace',transition:'color 0.15s'}}>
                                {c.id.replace(/_/g,' ')}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible groups */}
              {groups.map(grp=>{
                const charts = visibleCharts.filter(c=>c.group===grp)
                if(!charts.length)return null
                const collapsed = collapsedGroups.has(grp)
                return (
                  <div key={grp} style={{marginBottom:36}}>
                    <button onClick={()=>toggleGroup(grp)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',background:'none',border:'none',borderBottom:'2px solid #e5e0d8',paddingBottom:12,marginBottom:collapsed?0:20,cursor:'pointer',textAlign:'left'}}>
                      <span style={{fontSize:18,fontWeight:800,color:'#1a1814'}}>{GROUP_LABELS[grp]}</span>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:12,color:'#9ca3af',fontFamily:'IBM Plex Mono,monospace'}}>{charts.length} {lang==='en'?'charts':'grÃ¡ficos'}</span>
                        <span style={{fontSize:20,color:'#9ca3af',lineHeight:1,transform:collapsed?'rotate(-90deg)':'rotate(0deg)',transition:'transform 0.2s',display:'inline-block'}}>v</span>
                      </div>
                    </button>
                    {!collapsed&&(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(540px,1fr))',gap:20}}>
                        {charts.map(c=>(
                          <TimelineChart
                            key={c.id}
                            title={t(c.titleKey)}
                            unit={c.unit}
                            labels={tlLabels}
                            datasets={c.datasets.map(d=>({
                              label:t(d.labelKey),
                              data:allSessions.map(s=>s[d.field] as number|null),
                              color:d.color,
                            }))}
                            yMin={c.yMin} yMax={c.yMax}
                            refLine={c.refLine?{value:c.refLine.value,label:c.refLine.labelKey,color:c.refLine.color}:undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {visibleCharts.length===0&&(
                <div style={{textAlign:'center',padding:'80px 0',color:'#9ca3af',fontFamily:'IBM Plex Mono,monospace',fontSize:14}}>
                  {lang==='en'?'No charts selected. Use the filter to add charts.':'Nenhum grÃ¡fico selecionado. Use o filtro para adicionar.'}
                </div>
              )}
            </div>
          )}

          {/* TABLE */}
          {tab==='table'&&(
            <div>
              <div style={{marginBottom:28}}>
                <h1 style={{fontSize:24,fontWeight:800,color:'#1a1814',marginBottom:6}}>{t('table')}</h1>
                <span style={{fontSize:12,letterSpacing:'1.5px',textTransform:'uppercase',color:'#9ca3af',fontFamily:'IBM Plex Mono,monospace'}}>{t('all_logs')} Â· {allSessions.length} {t('sessions')}</span>
              </div>
              <div style={{overflowX:'auto',background:'#ffffff',borderRadius:12,border:'1px solid #e5e0d8',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'IBM Plex Mono,monospace',fontSize:12}}>
                  <thead><tr>
                    {['Session','Km','ECT avg','ECT max','IAT','LTFT','STFT%','Lambda','IACV','MAP wot','Adv','Knock','Inj ms','l/h','km/l','VTEC%','Bat V','MIL'].map(h=>(
                      <th key={h} style={{padding:'13px 14px',textAlign:'left',fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:'#9ca3af',borderBottom:'1px solid #e5e0d8',whiteSpace:'nowrap',background:'#f9f8f5',fontWeight:700}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {allSessions.map((s,i)=>(
                      <tr key={s.name} onClick={()=>{setActiveIdx(i);setTab('overview')}} style={{borderBottom:'1px solid #f0eeea',background:isNew(s)?'#eff6ff':'transparent',cursor:'pointer',transition:'background 0.1s'}}>
                        <td style={{padding:'12px 14px',color:isNew(s)?'#1d4ed8':'#1a1814',fontWeight:700,whiteSpace:'nowrap'}}>{s.name}</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.km_estimated,1)}</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.ect_mean)}Â°</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.ect_max)}Â°</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.iat_mean)}Â°</td>
                        <td style={{padding:'12px 14px'}}><span className={`pill ${pillCls(s.ltft,2.5,4)}`}>{s.ltft!=null?(s.ltft>0?'+':'')+fmt(s.ltft):'--'}%</span></td>
                        <td style={{padding:'12px 14px'}}><span className={`pill ${pillCls(s.stft_above15_pct,3,10)}`}>{fmt(s.stft_above15_pct)}%</span></td>
                        <td style={{padding:'12px 14px'}}><span className={`pill ${pillCls(s.lambda,1.05,1.15)}`}>{fmt(s.lambda,3)}</span></td>
                        <td style={{padding:'12px 14px'}}><span className={`pill ${pillCls(s.iacv_mean,42,55)}`}>{fmt(s.iacv_mean)}%</span></td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.map_wot)}</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.adv_mean)}Â°</td>
                        <td style={{padding:'12px 14px'}}><span className={`pill ${s.knock_events===0?'pill-g':'pill-r'}`}>{s.knock_events??'--'}</span></td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.inj_dur,2)}</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.fuel_flow_mean,2)}</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.inst_consumption,1)}</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.vtec_pct)}%</td>
                        <td style={{padding:'12px 14px',color:'#374151'}}>{fmt(s.bat_mean,2)}V</td>
                        <td style={{padding:'12px 14px'}}><span className={`pill ${!s.mil_on_pct?'pill-g':'pill-r'}`}>{s.mil_on_pct?t('active_str'):'OFF'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Global pill styles */}
      <style>{`
        .pill{display:inline-block;padding:2px 8px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;}
        .pill-g{background:#dcfce7;color:#166534;}
        .pill-y{background:#fef9c3;color:#92400e;}
        .pill-r{background:#fee2e2;color:#991b1b;}
        .pill-n{background:#f3f4f6;color:#6b7280;}
        *{box-sizing:border-box;}
        body{background:#f5f4f0;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#d1cfc8;border-radius:3px;}
      `}</style>
    </div>
  )
}
