'use client'

import { useEffect, useState, useCallback } from 'react'
import TimelineChart from '@/components/TimelineChart'
import { parseCSVFile, BASELINE } from '@/lib/parser'
import { generateAlerts } from '@/lib/alerts'
import type { LogSession } from '@/lib/supabase'

// --- Types ------------------------------------------------------------
type Lang = 'en' | 'pt'
type Tab = 'overview' | 'timeline' | 'table' | 'score' | 'compat'
type SectionKey = 'elec' | 'fuel' | 'air' | 'afr' | 'ign' | 'temp' | 'idle' | 'motion' | 'act' | 'diag'

// --- Constants --------------------------------------------------------
const ALL_SECTIONS: SectionKey[] = ['elec','fuel','air','afr','ign','temp','idle','motion','act','diag']

// HondaSH color palette
const C = {
  cyan:   '#00cfff', teal:   '#00b4a0', green:  '#00e060', lime:   '#80e000',
  yellow: '#ffe000', orange: '#ff9000', red:    '#ff3030', pink:   '#ff60a0',
  purple: '#c060ff', blue:   '#4080ff', indigo: '#6060ff', gray:   '#8090a0',
}

// --- i18n -------------------------------------------------------------
const T: Record<Lang, Record<string, string>> = {
  en: {
    overview:'Overview', timeline:'Timeline', table:'Table', sessions:'Sessions',
    imported:'imported', filter_charts:'Filter Charts', select_all:'All', clear_sel:'Clear',
    all_logs:'All logs', upload_drag:'Drag CSV or click to import',
    upload_sub:'HondsH OBD1 - EN or PT - Multiple files',
    sec_elec:'Electrical & Charging', sec_fuel:'Fuel & Injection',
    sec_air:'Air / Intake / Load', sec_afr:'Mixture & Correction (AFR)',
    sec_ign:'Ignition', sec_temp:'Temperature & Cooling',
    sec_idle:'Idle Control', sec_motion:'Motion & Dynamics',
    sec_act:'Actuators & Emissions', sec_diag:'Diagnosis',
    bat:'Battery', alt_fr:'Alternator FR', eld_curr:'ELD Current', eld_volt:'ELD Voltage',
    fuel_flow:'Fuel Flow', fuel_inst:'Consumption',
    inj_dur:'Inj. Duration', inj_dc:'Inj. Duty Cycle', inj_fr:'Inj. Flow Rate',
    map_psi:'MAP', iat:'IAT', clv:'Calc. Load',
    ltft:'LTFT', stft:'STFT >+15%', lambda:'Lambda', iacv:'IACV', fls:'Closed Loop',
    ign_adv:'Ign. Advance', ign_lim:'Ign. Limit', knock:'Knock',
    ect:'ECT', ect_hot:'ECT >95C', fan:'Radiator Fan',
    idle_iacv:'IACV DC', rev:'Engine RPM',
    vss:'Vehicle Speed', lng_accel:'Long. Accel', km_est:'Est. Distance', vtec:'VTEC',
    egr:'EGR Active', mil:'Check Engine', active_str:'ACTIVE', noFaults:'No active faults',
    sections:'Sections',
    ch_ltft:'LTFT Long Term Fuel Trim', ch_stft:'STFT Extreme Correction',
    ch_lambda:'Lambda (O2)', ch_iacv:'IACV Idle Air Control',
    ch_ect:'ECT Coolant Temp', ch_iat:'IAT Intake Air Temp',
    ch_bat:'Battery Min', ch_vtec:'VTEC Active Time',
    ch_adv:'Ignition Advance (avg)', ch_knock:'Knock Events',
    ch_map:'MAP Manifold Pressure', ch_clv:'Calculated Load Value',
    ch_rev:'Engine RPM (max)', ch_inj:'Injection Duration', ch_inj_dc:'Injector Duty Cycle',
    ch_egr:'EGR Active Time', ch_flow:'Fuel Flow (l/h)', ch_consump:'Consumption (km/l)',
    ch_km:'Est. Distance', ch_vmax:'Max Speed', ch_eld:'ELD Current',
    th_session:'Session', th_km:'Km', th_ect_avg:'ECT avg', th_ect_max:'ECT max',
    th_iat:'IAT', th_ltft:'LTFT', th_stft:'STFT%', th_lambda:'Lambda',
    th_iacv:'IACV', th_map_wot:'MAP wot', th_adv:'Adv', th_knock:'Knock',
    th_inj:'Inj ms', th_lh:'l/h', th_kml:'km/l', th_vtec:'VTEC%', th_bat:'Bat V', th_mil:'MIL',
    charts_visible:'charts visible', no_charts:'No charts selected.',
  },
  pt: {
    overview:'Visao Geral', timeline:'Linha do Tempo', table:'Tabela', sessions:'Sessoes',
    imported:'importado(s)', filter_charts:'Filtrar Graficos', select_all:'Todos', clear_sel:'Limpar',
    all_logs:'Todos os logs', upload_drag:'Arrastar CSV ou clicar para importar',
    upload_sub:'HondsH OBD1 - EN ou PT - Multiplos arquivos',
    sec_elec:'Eletrica / Carregamento', sec_fuel:'Combustivel / Injecao',
    sec_air:'Ar / Admissao / Carga', sec_afr:'Mistura e Correcao (AFR)',
    sec_ign:'Ignicao', sec_temp:'Temperatura e Arrefecimento',
    sec_idle:'Marcha Lenta / Controle de Ar', sec_motion:'Movimento / Dinamica',
    sec_act:'Atuadores e Emissoes', sec_diag:'Diagnostico',
    bat:'Bateria', alt_fr:'Alternador FR', eld_curr:'ELD Corrente', eld_volt:'ELD Tensao',
    fuel_flow:'Fluxo Comb.', fuel_inst:'Consumo',
    inj_dur:'Dur. Injecao', inj_dc:'DC Injecao', inj_fr:'Fluxo Injetor',
    map_psi:'MAP', iat:'IAT', clv:'Carga Calc.',
    ltft:'LTFT', stft:'STFT >+15%', lambda:'Lambda', iacv:'IACV', fls:'Malha Fechada',
    ign_adv:'Avanco Ign.', ign_lim:'Limite Ign.', knock:'Knock',
    ect:'ECT', ect_hot:'ECT >95C', fan:'Ventoinha',
    idle_iacv:'IACV DC', rev:'Rotacao Motor',
    vss:'Velocidade', lng_accel:'Acel. Long.', km_est:'Dist. Estimada', vtec:'VTEC',
    egr:'EGR Ativo', mil:'Check Engine', active_str:'ATIVO', noFaults:'Sem falhas ativas',
    sections:'Secoes',
    ch_ltft:'LTFT Trim Longo Prazo', ch_stft:'STFT Correcao Extrema',
    ch_lambda:'Lambda (Sonda O2)', ch_iacv:'IACV Valvula Marcha Lenta',
    ch_ect:'ECT Temperatura Motor', ch_iat:'IAT Temperatura Admissao',
    ch_bat:'Bateria Minima', ch_vtec:'VTEC Ativo',
    ch_adv:'Avanco Ignicao (media)', ch_knock:'Eventos Knock',
    ch_map:'MAP Pressao Coletor', ch_clv:'Valor Calculado Carga',
    ch_rev:'Rotacao Maxima', ch_inj:'Duracao Injecao', ch_inj_dc:'Duty Cycle Injetor',
    ch_egr:'EGR Ativo', ch_flow:'Fluxo Combustivel (l/h)', ch_consump:'Consumo (km/l)',
    ch_km:'Distancia Est.', ch_vmax:'Velocidade Maxima', ch_eld:'Corrente ELD',
    th_session:'Sessao', th_km:'Km', th_ect_avg:'ECT med', th_ect_max:'ECT max',
    th_iat:'IAT', th_ltft:'LTFT', th_stft:'STFT%', th_lambda:'Lambda',
    th_iacv:'IACV', th_map_wot:'MAP wot', th_adv:'Avanco', th_knock:'Knock',
    th_inj:'Inj ms', th_lh:'l/h', th_kml:'km/l', th_vtec:'VTEC%', th_bat:'Bat V', th_mil:'MIL',
    charts_visible:'graficos visiveis', no_charts:'Nenhum grafico selecionado.',
  },
}

// --- Chart definitions ------------------------------------------------
type ChartDef = {
  id: string
  group: string
  titleKey: string
  unit?: string
  yMin?: number
  yMax?: number
  refLine?: { value: number; label: string; color: string }
  datasets: { label: string; field: keyof LogSession; color: string }[]
}

const CHART_DEFS: ChartDef[] = [
  { id:'bat',     group:'elec',  titleKey:'ch_bat',     unit:'V',   yMin:9,yMax:15,  refLine:{value:12,label:'12V',color:'rgba(255,48,48,0.5)'},  datasets:[{label:'BAT',field:'bat_min',color:C.green}] },
  { id:'eld',     group:'elec',  titleKey:'ch_eld',     unit:'A',   datasets:[{label:'ELD',field:'eld_mean',color:C.yellow}] },
  { id:'flow',    group:'fuel',  titleKey:'ch_flow',    unit:'l/h', yMin:0, datasets:[{label:'Flow',field:'fuel_flow_mean',color:C.orange}] },
  { id:'consump', group:'fuel',  titleKey:'ch_consump', unit:'km/l',yMin:0, datasets:[{label:'Consump',field:'inst_consumption',color:C.lime}] },
  { id:'inj',     group:'fuel',  titleKey:'ch_inj',     unit:'ms',  yMin:2, datasets:[{label:'Inj Dur',field:'inj_dur',color:C.pink}] },
  { id:'inj_dc',  group:'fuel',  titleKey:'ch_inj_dc',  unit:'%',   datasets:[{label:'Inj DC',field:'inj_dc_mean',color:C.purple}] },
  { id:'map',     group:'air',   titleKey:'ch_map',     unit:'PSI', datasets:[{label:'MAP',field:'map_mean',color:C.cyan}] },
  { id:'clv',     group:'air',   titleKey:'ch_clv',     unit:'%',   datasets:[{label:'CLV',field:'clv_mean',color:C.gray}] },
  { id:'ltft',    group:'afr',   titleKey:'ch_ltft',    unit:'%',   yMin:0, refLine:{value:1.5,label:'ideal',color:'rgba(0,224,96,0.5)'}, datasets:[{label:'LTFT',field:'ltft',color:C.orange}] },
  { id:'stft',    group:'afr',   titleKey:'ch_stft',    unit:'%',   yMin:0, datasets:[{label:'STFT',field:'stft_above15_pct',color:C.red}] },
  { id:'lambda',  group:'afr',   titleKey:'ch_lambda',  yMin:0.9,yMax:1.4, refLine:{value:1.0,label:'stoich',color:'rgba(0,224,96,0.5)'}, datasets:[{label:'Lambda',field:'lambda',color:C.green}] },
  { id:'iacv',    group:'afr',   titleKey:'ch_iacv',    unit:'%',   yMin:0,yMax:90, refLine:{value:38,label:'max ok',color:'rgba(0,207,255,0.45)'}, datasets:[{label:'IACV',field:'iacv_mean',color:C.cyan}] },
  { id:'adv',     group:'ign',   titleKey:'ch_adv',     unit:'deg', datasets:[{label:'Adv',field:'adv_mean',color:C.purple}] },
  { id:'knock',   group:'ign',   titleKey:'ch_knock',   datasets:[{label:'Knock',field:'knock_events',color:C.red}] },
  { id:'ect',     group:'temp',  titleKey:'ch_ect',     unit:'C',   yMin:60, refLine:{value:100,label:'100C',color:'rgba(255,48,48,0.5)'}, datasets:[{label:'ECT max',field:'ect_max',color:C.red},{label:'ECT avg',field:'ect_mean',color:C.orange}] },
  { id:'iat',     group:'temp',  titleKey:'ch_iat',     unit:'C',   yMin:20, datasets:[{label:'IAT',field:'iat_mean',color:C.yellow}] },
  { id:'rev',     group:'motion',titleKey:'ch_rev',     unit:'rpm', datasets:[{label:'RPM',field:'rev_max',color:C.pink}] },
  { id:'vmax',    group:'motion',titleKey:'ch_vmax',    unit:'km/h',yMin:0, datasets:[{label:'Speed',field:'vss_max',color:C.blue}] },
  { id:'km',      group:'motion',titleKey:'ch_km',      unit:'km',  yMin:0, datasets:[{label:'Distance',field:'km_estimated',color:C.teal}] },
  { id:'vtec',    group:'motion',titleKey:'ch_vtec',    unit:'%',   yMin:0, datasets:[{label:'VTEC',field:'vtec_pct',color:C.purple}] },
  { id:'egr',     group:'act',   titleKey:'ch_egr',     unit:'%',   datasets:[{label:'EGR',field:'egr_active_pct',color:C.gray}] },
]

const CHART_GROUPS: Record<string, string> = {
  elec:'Electrical', fuel:'Fuel & Injection', air:'Air / Intake',
  afr:'Mixture & AFR', ign:'Ignition', temp:'Temperature',
  motion:'Motion & Dynamics', act:'Actuators',
}

// --- Compatible vehicles ----------------------------------------------
const COMPAT_VEHICLES = [
  { model:'Honda Civic / CRX / Del Sol', years:'1992-2000', dlc:'3-pin', engines:'D15B, D16Z6, D16Y7/8, B16A, B16A2', notes:'EG, EK chassis. Del Sol (CRX successor) included.' },
  { model:'Honda Civic Type R', years:'1997-2001', dlc:'3-pin', engines:'B16B 185ps DOHC VTEC', notes:'JDM EK9 only.' },
  { model:'Honda Accord', years:'1992-2001', dlc:'3-pin', engines:'F22A, F22B1, F22B2, F23A, H23A', notes:'CB7 (92-93), CD5/CD7 (94-97), CF8/CG5 (98-01). Includes your 1995 CD5 F22B1.' },
  { model:'Honda Prelude', years:'1992-2001', dlc:'3-pin', engines:'F22A, F22B, H22A, H23A', notes:'BB1/BB4 (92-96), BB6 (97-01). H22A VTEC is the performance variant.' },
  { model:'Honda Integra / Acura Integra', years:'1992-2001', dlc:'3-pin', engines:'B17A1, B18A1, B18B1, B18C, B18C1, B18C5', notes:'DA/DC chassis. Includes Type R DC2 ITR.' },
  { model:'Honda CR-V', years:'1997-2001', dlc:'3-pin', engines:'B20B, B20Z2', notes:'RD1/RD3 chassis. AWD variant. Non-VTEC B20.' },
  { model:'Honda HR-V', years:'1999-2001', dlc:'3-pin', engines:'D13B, D16W', notes:'Subcompact. EU/JDM markets primarily.' },
  { model:'Honda Odyssey (JDM)', years:'1994-1999', dlc:'3-pin', engines:'F22B, F23A', notes:'JDM RA1/RA2. US Odyssey uses different connector.' },
  { model:'Honda Stepwgn', years:'1996-2001', dlc:'3-pin', engines:'B20B', notes:'JDM minivan. OBD1 3-pin DLC variants.' },
  { model:'Honda Orthia / Partner', years:'1996-2002', dlc:'3-pin', engines:'B20B, D16A', notes:'JDM wagon based on CR-V platform.' },
  { model:'Honda Domani / Integra SJ', years:'1996-2001', dlc:'3-pin', engines:'D15B, D16A', notes:'JDM sedan variant of Civic platform.' },
  { model:'Acura NSX', years:'1991-2001', dlc:'3-pin', engines:'C30A, C32B', notes:'NA1/NA2. 3.0L/3.2L DOHC VTEC V6.' },
  { model:'Acura Legend / Honda Legend', years:'1991-1995', dlc:'3-pin', engines:'C32A 3.2L V6', notes:'KA7/KA8. Last OBD1 generation.' },
  { model:'Acura Vigor / Honda Ascot', years:'1992-1994', dlc:'3-pin', engines:'G25A 2.5L inline-5', notes:'CC2 chassis. Rare.' },
  { model:'Honda Logo / Capa', years:'1996-2001', dlc:'3-pin', engines:'D13B', notes:'JDM subcompact. Some EU variants.' },
  { model:'Honda S-MX', years:'1996-2001', dlc:'3-pin', engines:'B20B', notes:'JDM compact MPV.' },
  { model:'Honda Stream (early JDM)', years:'2000-2001', dlc:'3-pin', engines:'D17A, K20A', notes:'Pre-OBD2 JDM variants only.' },
  { model:'Honda Acty / Beat', years:'1992-1999', dlc:'3-pin', engines:'E07A', notes:'Kei car. JDM market only.' },
]

// --- Helpers ----------------------------------------------------------
function fmt(n: number | null | undefined, d = 1): string {
  return n != null && isFinite(n) ? n.toFixed(d) : '--'
}

function pillClass(v: number | null, goodAt: number, warnAt: number): string {
  if (v == null) return 'pn'
  if (v <= goodAt) return 'pg'
  if (v <= warnAt) return 'py'
  return 'pr'
}

function healthScore(m: LogSession): number {
  let score = 100
  const stft = m.stft_above15_pct ?? 0
  if (stft > 15) score -= 20
  else if (stft > 5) score -= 10
  else if (stft > 2) score -= 4

  const ltftAbs = Math.abs(m.ltft ?? 0)
  if (ltftAbs > 6) score -= 15
  else if (ltftAbs > 4) score -= 10
  else if (ltftAbs > 2.5) score -= 5

  const lam = m.lambda ?? 1
  const lamDev = Math.abs(lam - 1.0)
  if (lamDev > 0.25) score -= 15
  else if (lamDev > 0.15) score -= 10
  else if (lamDev > 0.05) score -= 4

  if ((m.ect_above100_pct ?? 0) > 0) score -= 15
  else if ((m.ect_above95_pct ?? 0) > 30) score -= 10
  else if ((m.ect_above95_pct ?? 0) > 15) score -= 5

  const iacv = m.iacv_mean ?? 35
  if (iacv > 65) score -= 10
  else if (iacv > 50) score -= 6
  else if (iacv > 42) score -= 3

  const knock = m.knock_events ?? 0
  if (knock > 10) score -= 15
  else if (knock > 3) score -= 8
  else if (knock > 0) score -= 4

  if ((m.mil_on_pct ?? 0) > 0) score -= 5
  if ((m.bat_below12_pct ?? 0) > 5) score -= 5
  else if ((m.bat_below12_pct ?? 0) > 1) score -= 2

  return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreColor(s: number): string {
  if (s >= 80) return C.green
  if (s >= 55) return C.yellow
  return C.red
}

// --- Sub-components ---------------------------------------------------
function Kpi({ label, value, unit, sub, color }: {
  label: string; value: string | number | null; unit?: string; sub?: string; color?: string
}) {
  const vc = color ?? '#94a3b8'
  return (
    <div style={{ background:'#1a1f2e', border:'1px solid #2a3040', borderRadius:8, padding:'12px 14px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:vc }} />
      <div style={{ fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase' as const, color:'#64748b', fontFamily:'IBM Plex Mono,monospace', fontWeight:600, marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:24, fontWeight:700, lineHeight:1, color:vc }}>
        {value ?? '--'}{unit && <span style={{ fontSize:11, color:'#64748b', marginLeft:2 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace', marginTop:6 }}>{sub}</div>}
    </div>
  )
}

function SecHeader({ title, color }: { title: string; color: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:28, marginBottom:14 }}>
      <div style={{ width:3, height:16, background:color, borderRadius:2 }} />
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' as const, color:'#94a3b8', fontFamily:'IBM Plex Mono,monospace' }}>{title}</span>
      <div style={{ flex:1, height:1, background:'#1e2740' }} />
    </div>
  )
}

const GRID: React.CSSProperties = { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }

// --- Main component ---------------------------------------------------
export default function Home() {
  // State - all declared once, clearly named
  const [dbSessions, setDbSessions]       = useState<LogSession[]>([])
  const [localSessions, setLocalSessions] = useState<LogSession[]>([])
  const [uploading, setUploading]         = useState(false)
  const [activeIdx, setActiveIdx]         = useState<number | null>(null)
  const [tab, setTab]                     = useState<Tab>('overview')
  const [lang, setLang]                   = useState<Lang>('en')

  // Timeline chart filter
  const [visibleCharts, setVisibleCharts]     = useState<Set<string>>(new Set(CHART_DEFS.map(c => c.id)))
  const [chartFilterOpen, setChartFilterOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Overview section filter
  const [visibleSections, setVisibleSections]       = useState<Set<SectionKey>>(new Set(ALL_SECTIONS))
  const [sectionFilterOpen, setSectionFilterOpen]   = useState(false)

  const t = (k: string): string => T[lang][k] ?? k

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.sessions) setDbSessions(d.sessions)
    }).catch(() => {})
  }, [])

  // Merge sessions: baseline < db < local (local wins)
  const allSessions: LogSession[] = (() => {
    const map = new Map<string, LogSession>()
    BASELINE.forEach(s => map.set(s.name, s))
    dbSessions.forEach(s => map.set(s.name, s))
    localSessions.forEach(s => map.set(s.name, s))
    return Array.from(map.values())
  })()

  const active = activeIdx != null ? allSessions[activeIdx] : allSessions[allSessions.length - 1]
  const alerts = active ? generateAlerts(active, lang) : []
  const tlLabels = allSessions.map(s => s.name)
  const isNew = (s: LogSession) => dbSessions.some(d => d.name === s.name) || localSessions.some(l => l.name === s.name)

  const handleFiles = useCallback(async (files: File[]) => {
    setUploading(true)
    const added: LogSession[] = []
    for (const file of files) {
      try {
        const { session } = await parseCSVFile(file)
        added.push(session)
        try {
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session),
          })
          if (res.ok) {
            const { session: saved } = await res.json()
            setDbSessions(prev => {
              const i = prev.findIndex(s => s.name === saved.name)
              if (i >= 0) { const n = [...prev]; n[i] = saved; return n }
              return [...prev, saved]
            })
          }
        } catch { /* save failed, local only */ }
      } catch (e) { console.error(e) }
    }
    setLocalSessions(prev => {
      const m = new Map(prev.map(s => [s.name, s]))
      added.forEach(s => m.set(s.name, s))
      return Array.from(m.values())
    })
    setActiveIdx(allSessions.length + added.length - 1)
    setUploading(false)
  }, [allSessions.length])

  // Toggle helpers
  const toggleChart   = (id: string)      => setVisibleCharts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleGroup   = (g: string)       => setCollapsedGroups(p => { const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n })
  const toggleSection = (s: SectionKey)   => setVisibleSections(p => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); return n })
  const showSec       = (s: SectionKey)   => visibleSections.has(s)

  const filteredCharts = CHART_DEFS.filter(c => visibleCharts.has(c.id))
  const chartGroups    = Array.from(new Set(CHART_DEFS.map(c => c.group)))

  const getDate = (s: LogSession): string | null => {
    const ca = (s as any).created_at
    if (!ca) return null
    const d = new Date(ca)
    return lang === 'pt'
      ? d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })
      : d.toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'2-digit' })
  }

  const AC: Record<string, string> = { bad:C.red, warn:C.orange, good:C.green, info:C.blue }

  // --- Render ---------------------------------------------------------
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#0f1117', fontFamily:"'IBM Plex Sans',sans-serif", color:'#e2e8f0' }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:52, background:'#111827', borderBottom:'1px solid #1e2740', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
            <span style={{ fontSize:15, fontWeight:800, letterSpacing:3, color:'#f97316', fontFamily:'IBM Plex Mono,monospace' }}>HNDSH</span>
            <span style={{ fontSize:12, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>.meters</span>
          </div>
          <div style={{ width:1, height:18, background:'#1e2740' }} />
          <span style={{ fontSize:11, padding:'3px 10px', border:'1px solid #1e2740', borderRadius:5, color:'#64748b', letterSpacing:1.5, background:'#161c2a', fontFamily:'IBM Plex Mono,monospace' }}>Honda OBD1</span>
          {allSessions.length > BASELINE.length && (
            <span style={{ fontSize:11, padding:'3px 10px', border:'1px solid #14532d', borderRadius:5, color:C.green, background:'#052e16', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>
              {allSessions.length - BASELINE.length} {t('imported')}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', height:52 }}>
          {(['overview','timeline','table','score','compat'] as Tab[]).map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{ padding:'0 18px', height:52, border:'none', borderBottom: tab===tb ? '2px solid #f97316' : '2px solid transparent', background:'transparent', color: tab===tb ? '#f97316' : '#64748b', fontSize:11, letterSpacing:2, textTransform:'uppercase', cursor:'pointer', fontWeight: tab===tb ? 700 : 400, fontFamily:'IBM Plex Mono,monospace' }}>
              {tb === 'score' ? 'Score' : tb === 'compat' ? 'Compat' : t(tb)}
            </button>
          ))}
          <div style={{ marginLeft:16, display:'flex', gap:6, paddingLeft:16, borderLeft:'1px solid #1e2740' }}>
            {(['en','pt'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ background: lang===l ? '#1e3a5f' : 'transparent', border:'1px solid', borderColor: lang===l ? '#3b82f6' : '#1e2740', borderRadius:4, cursor:'pointer', color: lang===l ? '#60a5fa' : '#475569', fontSize:10, fontFamily:'IBM Plex Mono,monospace', fontWeight:700, padding:'3px 8px', letterSpacing:1 }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* SIDEBAR */}
        <div style={{ width:220, flexShrink:0, background:'#111827', borderRight:'1px solid #1e2740', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid #1e2740', fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>{t('sessions')}</div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {allSessions.map((s, i) => {
              const isActive = active?.name === s.name
              const dot = s.ltft != null ? (s.ltft <= 2.5 ? C.green : s.ltft <= 4 ? C.yellow : C.red) : '#334155'
              const dateStr = getDate(s)
              return (
                <div key={s.name} onClick={() => setActiveIdx(i)} style={{ padding:'10px 14px', borderBottom:'1px solid #161c2a', cursor:'pointer', position:'relative', background: isActive ? '#1a2035' : 'transparent' }}>
                  {isActive && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:'#f97316' }} />}
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }} />
                    <span style={{ fontSize:12, fontWeight:700, color: isActive ? '#f97316' : (dateStr ? '#e2e8f0' : '#94a3b8'), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, fontFamily:'IBM Plex Mono,monospace' }}>
                      {dateStr ?? s.name}
                    </span>
                    {isNew(s) && <span style={{ fontSize:8, background:'#1e3a5f', color:'#60a5fa', padding:'1px 5px', borderRadius:3, fontWeight:700, fontFamily:'IBM Plex Mono,monospace' }}>NEW</span>}
                  </div>
                  {dateStr && <div style={{ fontSize:10, color:'#475569', paddingLeft:14, fontFamily:'IBM Plex Mono,monospace' }}>{s.name}</div>}
                </div>
              )
            })}
          </div>
          {/* Upload zone */}
          <div style={{ padding:12, borderTop:'1px solid #1e2740' }}>
            <div
              onClick={() => (document.getElementById('csv-up') as HTMLInputElement)?.click()}
              onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#f97316' }}
              onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2740' }}
              onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2740'; const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv')); if (files.length) handleFiles(files) }}
              style={{ border:'1.5px dashed #1e2740', borderRadius:8, padding:'14px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer' }}
            >
              <input id="csv-up" type="file" accept=".csv" multiple style={{ display:'none' }} onChange={e => { const files = Array.from(e.target.files || []); if (files.length) handleFiles(files); e.target.value = '' }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span style={{ fontSize:10, fontWeight:600, color:'#64748b', fontFamily:'IBM Plex Mono,monospace', textAlign:'center' }}>
                {uploading ? 'Processing...' : t('upload_drag')}
              </span>
              <span style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono,monospace', textAlign:'center', lineHeight:1.6 }}>{t('upload_sub')}</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

          {/* -- OVERVIEW -- */}
          {tab === 'overview' && active && (
            <div>
              {/* Header + section filter button */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:20 }}>
                <div>
                  <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{active.name}</h1>
                  <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>
                    {active.rows?.toLocaleString()} rows{active.duration_min ? ` - ${active.duration_min} min` : ''}{active.km_estimated ? ` - ${fmt(active.km_estimated, 1)} km` : ''}
                  </span>
                </div>
                <button
                  onClick={() => setSectionFilterOpen(o => !o)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', background: sectionFilterOpen ? '#1e3a5f' : '#161c2a', border:'1px solid', borderColor: sectionFilterOpen ? '#3b82f6' : '#1e2740', borderRadius:7, cursor:'pointer', color: sectionFilterOpen ? '#60a5fa' : '#64748b', fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:600, letterSpacing:1 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  {t('sections')}
                </button>
              </div>

              {/* Section filter panel */}
              {sectionFilterOpen && (
                <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:2, textTransform:'uppercase', fontFamily:'IBM Plex Mono,monospace' }}>{t('sections')}</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setVisibleSections(new Set(ALL_SECTIONS))} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e3a5f', borderRadius:4, background:'#0f1f3a', color:'#60a5fa', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600 }}>{t('select_all')}</button>
                      <button onClick={() => setVisibleSections(new Set())} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e2740', borderRadius:4, background:'transparent', color:'#475569', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 20px' }}>
                    {ALL_SECTIONS.map(sk => (
                      <label key={sk} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none' }}>
                        <input type="checkbox" checked={visibleSections.has(sk)} onChange={() => toggleSection(sk)} style={{ accentColor:'#f97316', width:13, height:13 }} />
                        <span style={{ fontSize:11, color: visibleSections.has(sk) ? '#e2e8f0' : '#334155', fontFamily:'IBM Plex Mono,monospace' }}>{t('sec_' + sk)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Electrical & Charging */}
              {showSec('elec') && (<>
                <SecHeader title={t('sec_elec')} color={C.green} />
                <div style={GRID}>
                  <Kpi label={t('bat')} value={fmt(active.bat_mean, 2)} unit="V" sub={`min ${fmt(active.bat_min, 2)}V`} color={C.green} />
                  <Kpi label={t('alt_fr')} value={fmt(active.alt_fr_mean)} unit="%" color={C.yellow} />
                  <Kpi label={t('eld_curr')} value={fmt(active.eld_mean, 0)} unit="A" color={C.cyan} />
                </div>
              </>)}

              {/* 2. Fuel & Injection */}
              {showSec('fuel') && (<>
                <SecHeader title={t('sec_fuel')} color={C.orange} />
                <div style={GRID}>
                  <Kpi label={t('fuel_flow')} value={fmt(active.fuel_flow_mean, 2)} unit="l/h" color={C.orange} />
                  <Kpi label={t('fuel_inst')} value={fmt(active.inst_consumption, 1)} unit="km/l" color={C.lime} />
                  <Kpi label={t('inj_dur')} value={fmt(active.inj_dur, 2)} unit="ms" sub={`DC: ${fmt(active.inj_dc_mean)}%`} color={C.pink} />
                  <Kpi label={t('inj_dc')} value={fmt(active.inj_dc_mean)} unit="%" color={C.purple} />
                  <Kpi label={t('inj_fr')} value={fmt(active.inj_fr_mean, 0)} unit="cc/min" color={C.pink} />
                </div>
              </>)}

              {/* 3. Air / Intake / Load */}
              {showSec('air') && (<>
                <SecHeader title={t('sec_air')} color={C.cyan} />
                <div style={GRID}>
                  <Kpi label={t('map_psi')} value={fmt(active.map_mean)} unit="PSI" sub={`WOT: ${fmt(active.map_wot)} PSI`} color={C.cyan} />
                  <Kpi label={t('iat')} value={fmt(active.iat_mean)} unit="C" sub={`max ${fmt(active.iat_max)}C`} color={C.yellow} />
                  <Kpi label={t('clv')} value={fmt(active.clv_mean)} unit="%" color={C.gray} />
                </div>
              </>)}

              {/* 4. Mixture & AFR */}
              {showSec('afr') && (<>
                <SecHeader title={t('sec_afr')} color={C.green} />
                <div style={GRID}>
                  <Kpi label={t('ltft')} value={(active.ltft != null && active.ltft > 0 ? '+' : '') + fmt(active.ltft)} unit="%" sub="ideal: +-1.5%" color={C.orange} />
                  <Kpi label={t('stft')} value={fmt(active.stft_above15_pct)} unit="%" color={C.red} />
                  <Kpi label={t('lambda')} value={fmt(active.lambda, 3)} sub="ideal: ~1.000" color={C.green} />
                  <Kpi label={t('iacv')} value={fmt(active.iacv_mean)} unit="%" sub="expected: 30-38%" color={C.cyan} />
                  <Kpi label={t('fls')} value={fmt(active.closed_loop_pct)} unit="%" color={C.blue} />
                </div>
              </>)}

              {/* 5. Ignition */}
              {showSec('ign') && (<>
                <SecHeader title={t('sec_ign')} color={C.purple} />
                <div style={GRID}>
                  <Kpi label={t('ign_adv')} value={fmt(active.adv_mean)} unit="deg" sub={`max ${fmt(active.adv_max)}deg`} color={C.purple} />
                  <Kpi label={t('ign_lim')} value={fmt(active.ign_limit_mean)} unit="deg" color={C.indigo} />
                  <Kpi label={t('knock')} value={active.knock_events ?? '--'} sub={`max ${fmt(active.knock_max, 3)}V`} color={active.knock_events === 0 ? C.green : C.red} />
                </div>
              </>)}

              {/* 6. Temperature & Cooling */}
              {showSec('temp') && (<>
                <SecHeader title={t('sec_temp')} color={C.red} />
                <div style={GRID}>
                  <Kpi label={t('ect')} value={fmt(active.ect_mean)} unit="C" sub={`max ${fmt(active.ect_max)}C`} color={C.red} />
                  <Kpi label={t('ect_hot')} value={fmt(active.ect_above95_pct)} unit="%" color={C.orange} />
                  <Kpi label={t('fan')} value={fmt(active.fan_on_pct)} unit="%" color={C.cyan} />
                </div>
              </>)}

              {/* 7. Idle Control */}
              {showSec('idle') && (<>
                <SecHeader title={t('sec_idle')} color={C.teal} />
                <div style={GRID}>
                  <Kpi label={t('idle_iacv')} value={fmt(active.iacv_mean)} unit="%" sub="expected: 30-38%" color={C.teal} />
                  <Kpi label={t('rev')} value={fmt(active.rev_mean, 0)} unit="rpm" sub={`max ${fmt(active.rev_max, 0)} rpm`} color={C.pink} />
                </div>
              </>)}

              {/* 8. Motion & Dynamics */}
              {showSec('motion') && (<>
                <SecHeader title={t('sec_motion')} color={C.blue} />
                <div style={GRID}>
                  <Kpi label={t('vss')} value={fmt(active.vss_mean)} unit="km/h" sub={`max ${fmt(active.vss_max, 0)} km/h`} color={C.blue} />
                  <Kpi label={t('lng_accel')} value={fmt(active.lng_accel_max, 3)} unit="G" sub={`brake ${fmt(active.lng_accel_min, 3)}G`} color={C.cyan} />
                  <Kpi label={t('km_est')} value={fmt(active.km_estimated, 1)} unit="km" color={C.teal} />
                  <Kpi label={t('vtec')} value={fmt(active.vtec_pct)} unit="%" color={C.purple} />
                </div>
              </>)}

              {/* 9. Actuators & Emissions */}
              {showSec('act') && (<>
                <SecHeader title={t('sec_act')} color={C.gray} />
                <div style={GRID}>
                  <Kpi label={t('egr')} value={fmt(active.egr_active_pct)} unit="%" color={C.gray} />
                </div>
              </>)}

              {/* 10. Diagnosis */}
              {showSec('diag') && (<>
                <SecHeader title={t('sec_diag')} color={C.red} />
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {alerts.map((a, idx) => (
                    <div key={idx} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 16px', borderRadius:8, border:`1px solid ${AC[a.type]}30`, background:`${AC[a.type]}0a` }}>
                      <div style={{ fontSize:10, padding:'3px 8px', borderRadius:4, background:`${AC[a.type]}20`, color:AC[a.type], letterSpacing:1, flexShrink:0, fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>{a.param}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:AC[a.type], marginBottom:4 }}>{a.title}</div>
                        <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>{a.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>)}
            </div>
          )}

          {/* -- TIMELINE -- */}
          {tab === 'timeline' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, gap:16 }}>
                <div>
                  <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{t('timeline')}</h1>
                  <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>
                    {allSessions.length} {t('sessions')} - {filteredCharts.length} {t('charts_visible')}
                  </span>
                </div>
                <button
                  onClick={() => setChartFilterOpen(o => !o)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background: chartFilterOpen ? '#1e3a5f' : '#161c2a', border:'1px solid', borderColor: chartFilterOpen ? '#3b82f6' : '#1e2740', borderRadius:7, cursor:'pointer', color: chartFilterOpen ? '#60a5fa' : '#64748b', fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:600, letterSpacing:1 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  {t('filter_charts')}
                </button>
              </div>

              {/* Chart filter panel */}
              {chartFilterOpen && (
                <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:10, padding:'18px 20px', marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:2, textTransform:'uppercase', fontFamily:'IBM Plex Mono,monospace' }}>{t('filter_charts')}</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setVisibleCharts(new Set(CHART_DEFS.map(c => c.id)))} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e3a5f', borderRadius:4, background:'#0f1f3a', color:'#60a5fa', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600 }}>{t('select_all')}</button>
                      <button onClick={() => setVisibleCharts(new Set())} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e2740', borderRadius:4, background:'transparent', color:'#475569', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'16px 20px' }}>
                    {chartGroups.map(grp => (
                      <div key={grp}>
                        <div style={{ fontSize:9, fontWeight:700, color:'#f97316', letterSpacing:2, textTransform:'uppercase', marginBottom:8, fontFamily:'IBM Plex Mono,monospace' }}>{CHART_GROUPS[grp] ?? grp}</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                          {CHART_DEFS.filter(c => c.group === grp).map(c => (
                            <label key={c.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none' }}>
                              <input type="checkbox" checked={visibleCharts.has(c.id)} onChange={() => toggleChart(c.id)} style={{ accentColor:'#f97316', width:12, height:12 }} />
                              <span style={{ fontSize:11, color: visibleCharts.has(c.id) ? '#e2e8f0' : '#334155', fontFamily:'IBM Plex Mono,monospace' }}>{c.id.replace(/_/g,' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart groups - collapsible */}
              {chartGroups.map(grp => {
                const charts = filteredCharts.filter(c => c.group === grp)
                if (!charts.length) return null
                const collapsed = collapsedGroups.has(grp)
                return (
                  <div key={grp} style={{ marginBottom:32 }}>
                    <button onClick={() => toggleGroup(grp)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', border:'none', borderBottom:'1px solid #1e2740', paddingBottom:10, marginBottom: collapsed ? 0 : 18, cursor:'pointer', textAlign:'left' }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', fontFamily:'IBM Plex Mono,monospace' }}>{CHART_GROUPS[grp] ?? grp}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{charts.length} charts</span>
                        <span style={{ fontSize:14, color:'#475569', display:'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>v</span>
                      </div>
                    </button>
                    {!collapsed && (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(520px,1fr))', gap:16 }}>
                        {charts.map(c => (
                          <TimelineChart
                            key={c.id}
                            title={t(c.titleKey)}
                            unit={c.unit}
                            labels={tlLabels}
                            datasets={c.datasets.map(d => ({
                              label: d.label,
                              data: allSessions.map(s => s[d.field] as number | null),
                              color: d.color,
                            }))}
                            yMin={c.yMin}
                            yMax={c.yMax}
                            refLine={c.refLine}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredCharts.length === 0 && (
                <div style={{ textAlign:'center', padding:'80px 0', color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontSize:13 }}>{t('no_charts')}</div>
              )}
            </div>
          )}

          {/* -- TABLE -- */}
          {tab === 'table' && (
            <div>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{t('table')}</h1>
                <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{t('all_logs')} - {allSessions.length} {t('sessions')}</span>
              </div>
              <div style={{ overflowX:'auto', background:'#111827', borderRadius:10, border:'1px solid #1e2740' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'IBM Plex Mono,monospace', fontSize:11 }}>
                  <thead>
                    <tr>
                      {[t('th_session'),t('th_km'),t('th_ect_avg'),t('th_ect_max'),t('th_iat'),t('th_ltft'),t('th_stft'),t('th_lambda'),t('th_iacv'),t('th_map_wot'),t('th_adv'),t('th_knock'),t('th_inj'),t('th_lh'),t('th_kml'),t('th_vtec'),t('th_bat'),t('th_mil')].map(h => (
                        <th key={h} style={{ padding:'11px 12px', textAlign:'left', fontSize:9, letterSpacing:1.5, textTransform:'uppercase', color:'#475569', borderBottom:'1px solid #1e2740', whiteSpace:'nowrap', background:'#0f1117', fontWeight:700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allSessions.map((s, i) => (
                      <tr key={s.name} onClick={() => { setActiveIdx(i); setTab('overview') }} style={{ borderBottom:'1px solid #161c2a', background: isNew(s) ? '#1a2035' : 'transparent', cursor:'pointer' }}>
                        <td style={{ padding:'10px 12px', color: isNew(s) ? '#f97316' : '#e2e8f0', fontWeight:700, whiteSpace:'nowrap' }}>{s.name}</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.km_estimated, 1)}</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.ect_mean)}C</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.ect_max)}C</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.iat_mean)}C</td>
                        <td style={{ padding:'10px 12px' }}><span className={pillClass(s.ltft, 2.5, 4)}>{s.ltft != null ? (s.ltft > 0 ? '+' : '') + fmt(s.ltft) : '--'}%</span></td>
                        <td style={{ padding:'10px 12px' }}><span className={pillClass(s.stft_above15_pct, 3, 10)}>{fmt(s.stft_above15_pct)}%</span></td>
                        <td style={{ padding:'10px 12px' }}><span className={pillClass(s.lambda, 1.05, 1.15)}>{fmt(s.lambda, 3)}</span></td>
                        <td style={{ padding:'10px 12px' }}><span className={pillClass(s.iacv_mean, 42, 55)}>{fmt(s.iacv_mean)}%</span></td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.map_wot)}</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.adv_mean)}</td>
                        <td style={{ padding:'10px 12px' }}><span className={s.knock_events === 0 ? 'pg' : 'pr'}>{s.knock_events ?? '--'}</span></td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.inj_dur, 2)}</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.fuel_flow_mean, 2)}</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.inst_consumption, 1)}</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.vtec_pct)}%</td>
                        <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{fmt(s.bat_mean, 2)}V</td>
                        <td style={{ padding:'10px 12px' }}><span className={!s.mil_on_pct ? 'pg' : 'pr'}>{s.mil_on_pct ? t('active_str') : 'OFF'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -- SCORE -- */}
          {tab === 'score' && active && (
            <div>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>Engine Health Score</h1>
                <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{active.name} - weighted composite</span>
              </div>

              {(() => {
                const sc = healthScore(active)
                const col = scoreColor(sc)
                const label = sc >= 80 ? 'HEALTHY' : sc >= 55 ? 'NEEDS ATTENTION' : 'CRITICAL'
                const breakdown = [
                  { key:'STFT', val:active.stft_above15_pct, weight:20, good:2,   bad:15,  desc:'Short term correction' },
                  { key:'LTFT', val:Math.abs(active.ltft ?? 0), weight:15, good:2.5, bad:6,  desc:'Long term trim' },
                  { key:'Lambda', val:Math.abs((active.lambda ?? 1) - 1), weight:15, good:0.05, bad:0.25, desc:'Mixture deviation' },
                  { key:'ECT',  val:active.ect_above95_pct,  weight:15, good:15,  bad:35,  desc:'Coolant temp' },
                  { key:'IACV', val:(active.iacv_mean ?? 35) - 35, weight:10, good:7, bad:30, desc:'Idle air control' },
                  { key:'Knock', val:active.knock_events,    weight:15, good:0,   bad:10,  desc:'Detonation events' },
                  { key:'BAT',  val:active.bat_below12_pct,  weight:5,  good:0,   bad:5,   desc:'Voltage drops' },
                  { key:'MIL',  val:active.mil_on_pct,       weight:5,  good:0,   bad:1,   desc:'Check engine' },
                ]
                return (
                  <>
                    <div style={{ background:'#111827', border:`1px solid ${col}40`, borderRadius:16, padding:'32px 36px', marginBottom:24, display:'flex', alignItems:'center', gap:48 }}>
                      <div style={{ textAlign:'center', minWidth:120 }}>
                        <div style={{ fontSize:80, fontWeight:900, color:col, fontFamily:'IBM Plex Mono,monospace', lineHeight:1 }}>{sc}</div>
                        <div style={{ fontSize:11, letterSpacing:3, color:col, fontFamily:'IBM Plex Mono,monospace', fontWeight:700, marginTop:8 }}>{label}</div>
                        <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace', marginTop:4 }}>out of 100</div>
                      </div>
                      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
                        {breakdown.map(b => {
                          const range = b.bad - b.good
                          const raw = range > 0 ? Math.min(1, Math.max(0, ((b.val ?? 0) - b.good) / range)) : 0
                          const bScore = Math.round((1 - raw) * 100)
                          const bCol = scoreColor(bScore)
                          return (
                            <div key={b.key} style={{ display:'grid', gridTemplateColumns:'70px 1fr 45px 40px', alignItems:'center', gap:12 }}>
                              <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:'#94a3b8', letterSpacing:1 }}>{b.key}</span>
                              <div style={{ height:5, background:'#1e2740', borderRadius:3, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${bScore}%`, background:bCol, borderRadius:3 }} />
                              </div>
                              <span style={{ fontSize:11, fontFamily:'IBM Plex Mono,monospace', color:bCol, fontWeight:700, textAlign:'right' }}>{bScore}</span>
                              <span style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono,monospace', textAlign:'right' }}>w:{b.weight}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Score evolution */}
                    <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:12, padding:'18px 20px' }}>
                      <div style={{ fontSize:10, letterSpacing:2, color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontWeight:700, textTransform:'uppercase', marginBottom:14 }}>Score Evolution</div>
                      <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:100 }}>
                        {allSessions.map((s, idx) => {
                          const sScore = healthScore(s)
                          const sCol = scoreColor(sScore)
                          const isAct = s.name === active.name
                          return (
                            <div key={s.name} onClick={() => setActiveIdx(idx)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer' }}>
                              <div style={{ fontSize:9, fontFamily:'IBM Plex Mono,monospace', color:sCol, fontWeight:700 }}>{sScore}</div>
                              <div style={{ width:'100%', height:`${sScore}%`, minHeight:4, background:sCol, borderRadius:'3px 3px 0 0', opacity: isAct ? 1 : 0.5, outline: isAct ? `1px solid ${sCol}` : 'none' }} />
                              <div style={{ fontSize:7, color:'#334155', fontFamily:'IBM Plex Mono,monospace', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>{s.name.split(' ')[0]}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* -- COMPAT -- */}
          {tab === 'compat' && (
            <div>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:8 }}>Compatible Vehicles</h1>
                <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7, maxWidth:680 }}>
                  All Honda/Acura gasoline models from 1992 to 2001 that use the proprietary 3-pin or 5-pin DLC diagnostic connector are compatible with HondsH. Vehicles with the standard 16-pin OBD2 port (US/CA from 1996+) are not supported.
                </p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {COMPAT_VEHICLES.map((v, i) => (
                  <div key={i} style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:10, padding:'14px 18px', display:'grid', gridTemplateColumns:'200px 70px 1fr 1fr', gap:'0 16px', alignItems:'start' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', marginBottom:4 }}>{v.model}</div>
                      <div style={{ fontSize:10, background:'#1e3a5f', color:'#60a5fa', padding:'2px 7px', borderRadius:3, display:'inline-block', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>{v.years}</div>
                    </div>
                    <div style={{ fontSize:10, color:'#64748b', fontFamily:'IBM Plex Mono,monospace', paddingTop:2 }}>OBD1<br/>{v.dlc}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'IBM Plex Mono,monospace', lineHeight:1.6 }}>{v.engines}</div>
                    <div style={{ fontSize:11, color:'#475569', lineHeight:1.6 }}>{v.notes}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16, padding:'14px 18px', background:'#1a1f2e', border:'1px solid #1e2740', borderRadius:8 }}>
                <p style={{ fontSize:12, color:'#475569', lineHeight:1.7 }}>
                  Note: Some 92-95 models have the 3-pin connector with only 2 wires (no power pin) - requires external power source. US/CA vehicles from 1996+ use the 16-pin OBD2 port and are not compatible.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; }
        body { background: #0f1117; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2740; border-radius: 3px; }
        .pg { display:inline-block; padding:2px 7px; border-radius:4px; font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; background:#052e16; color:#00e060; border:1px solid #14532d; }
        .py { display:inline-block; padding:2px 7px; border-radius:4px; font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; background:#3a2700; color:#ffe000; border:1px solid #6b4f00; }
        .pr { display:inline-block; padding:2px 7px; border-radius:4px; font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; background:#2d0a0a; color:#ff3030; border:1px solid #7f1d1d; }
        .pn { display:inline-block; padding:2px 7px; border-radius:4px; font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; background:#161c2a; color:#475569; border:1px solid #1e2740; }
        tr:hover td { background: rgba(249,115,22,0.04) !important; }
      `}</style>
    </div>
  )
}
