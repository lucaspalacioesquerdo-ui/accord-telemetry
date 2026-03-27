'use client'

import { useEffect, useState, useCallback } from 'react'
import KpiCard from '@/components/KpiCard'
import TimelineChart from '@/components/TimelineChart'
import { parseCSVFile, BASELINE } from '@/lib/parser'
import { generateAlerts } from '@/lib/alerts'
import type { LogSession } from '@/lib/supabase'

// --- i18n (no accented chars hardcoded - all via this dict) ----------
type Lang = 'en' | 'pt'
const T: Record<Lang, Record<string, string>> = {
  en: {
    sessions: 'Sessions', overview: 'Overview', timeline: 'Timeline', table: 'Table',
    imported: 'imported', noFaults: 'No active faults', active_str: 'ACTIVE',
    filter_charts: 'Filter Charts', select_all: 'All', clear_sel: 'Clear',
    sessions_header: 'Sessions', all_logs: 'All logs', collapse: 'Collapse', expand: 'Expand',
    upload_drag: 'Drag CSV or click to import',
    upload_sub: 'HondsH OBD1  -  EN or PT  -  Multiple files',
    // Section headers
    sec_elec: 'Electrical & Charging',
    sec_fuel: 'Fuel & Injection',
    sec_air: 'Air / Intake / Load',
    sec_afr: 'Mixture & Correction',
    sec_ign: 'Ignition',
    sec_temp: 'Temperature & Cooling',
    sec_idle: 'Idle Control',
    sec_motion: 'Motion & Dynamics',
    sec_trans: 'Transmission',
    sec_act: 'Actuators & Emissions',
    sec_vtec: 'VTEC',
    sec_sw: 'Sensors & Switches',
    sec_diag: 'Diagnosis / System',
    sec_diagnosis: 'Diagnosis',
    // KPI labels
    bat: 'Battery', alt_fr: 'Alternator FR', alt_frv: 'Alt. FR Voltage', alt_ctrl: 'Alt. Control',
    eld_curr: 'ELD Current', eld_volt: 'ELD Voltage',
    fuel_pump: 'Fuel Pump Relay', fuel_ss: 'Fuel System Status', fuel_flow: 'Fuel Flow', fuel_inst: 'Consumption',
    inj_dur: 'Inj. Duration', inj_dc: 'Inj. Duty Cycle', inj_fr: 'Inj. Flow Rate',
    map_psi: 'MAP', map_volt: 'MAP Voltage', map_clv: 'MAP Load',
    baro: 'Baro Pressure', baro_volt: 'Baro Voltage',
    iat: 'IAT', iat_volt: 'IAT Voltage',
    tps: 'TPS', tps_volt: 'TPS Voltage',
    clv: 'Calc. Load', iab: 'IAB Valve',
    o2s_volt: 'O2S Voltage', stft: 'STFT', ltft: 'LTFT',
    afr: 'Air Fuel Ratio', lambda: 'Lambda', afr_cmd: 'AFR Command',
    fls: 'Feedback Loop', hc: 'O2 Heater',
    ign_adv: 'Ign. Advance', ign_lim: 'Ign. Limit', knock: 'Knock',
    ect: 'ECT', ect_volt: 'ECT Voltage', fan: 'Radiator Fan',
    iacv_dc: 'IACV Duty Cycle', iacv_curr: 'IACV Current', idle_cmd: 'Idle Command',
    rev: 'Engine RPM', vss: 'Vehicle Speed', vss_cal: 'Speed (Cal.)',
    gps_spd: 'GPS Speed', lng_accel: 'Long. Acceleration',
    gear: 'Gear', at_mnt: 'A/T Mounts', at_ppn: 'A/T Gear Pos.',
    egr_volt: 'EGR Voltage', egr_cmd: 'EGR Command', egr_pos: 'EGR Position',
    pcs: 'EVAP PCS', pcs_pos: 'PCS Position',
    vtec_il: 'VTEC Lamp', vtec_psw: 'VTEC Press. SW', vtec_sv: 'VTEC Solenoid', vtec_sf: 'VTEC Feedback',
    brake: 'Brake Switch', starter: 'Starter Switch',
    ac_relay: 'A/C Relay', ac_sw: 'A/C Switch', pspsw: 'P/S Oil Press.',
    mil: 'Check Engine', scs: 'Service Check', lat: 'Comm. Latency',
    // Chart titles
    ch_ltft: 'LTFT - Long Term Fuel Trim', ch_stft: 'STFT - Extreme Correction (>+15%)',
    ch_lambda: 'Lambda (O2)', ch_iacv: 'IACV - Idle Air Control',
    ch_ect: 'ECT - Coolant Temp', ch_iat: 'IAT - Intake Air Temp',
    ch_bat: 'Battery Min', ch_vtec: 'VTEC Active Time',
    ch_adv: 'Ignition Advance (avg)', ch_adv_max: 'Ignition Advance (max)',
    ch_knock: 'Knock Events', ch_map: 'MAP - Manifold Pressure',
    ch_map_wot: 'MAP at WOT', ch_clv: 'Calculated Load Value',
    ch_rev: 'Engine RPM (max)', ch_inj: 'Injection Duration',
    ch_inj_dc: 'Injector Duty Cycle', ch_egr: 'EGR Active Time',
    ch_flow: 'Fuel Flow (l/h)', ch_consump: 'Consumption (km/l)',
    ch_km: 'Est. Distance per session', ch_accel: 'Longitudinal Acceleration',
    ch_vmax: 'Max Speed', ch_eld: 'ELD Current',
    // Table headers
    th_session: 'Session', th_km: 'Km', th_ect_avg: 'ECT avg', th_ect_max: 'ECT max',
    th_iat: 'IAT', th_ltft: 'LTFT', th_stft: 'STFT%', th_lambda: 'Lambda',
    th_iacv: 'IACV', th_map_wot: 'MAP wot', th_adv: 'Adv', th_knock: 'Knock',
    th_inj: 'Inj ms', th_lh: 'l/h', th_kml: 'km/l', th_vtec: 'VTEC%',
    th_bat: 'Bat V', th_mil: 'MIL',
    // Misc
    records: 'records', charts_visible: 'charts visible', vehicles_tab: 'Vehicles',
    no_charts: 'No charts selected.',
    time_above: 'time above 95',
    ideal: 'ideal',
    expected: 'expected 30-38%',
    max_str: 'max',
    avg_str: 'avg',
    this_session: 'this session',
    high_rpm: 'high RPM time',
    stopped: 'stopped',
    elec_load: 'electrical load',
    alt_load: 'alternator load',
    closed_loop: 'ECU closed loop',
    no_faults: 'no active faults',
    cruise_avg: 'cruise avg',
  },
  pt: {
    sessions: 'Sessoes', overview: 'Visao Geral', timeline: 'Linha do Tempo', table: 'Tabela',
    imported: 'importado(s)', noFaults: 'Sem falhas ativas', active_str: 'ATIVO',
    filter_charts: 'Filtrar Graficos', select_all: 'Todos', clear_sel: 'Limpar',
    sessions_header: 'Sessoes', all_logs: 'Todos os logs', collapse: 'Recolher', expand: 'Expandir',
    upload_drag: 'Arrastar CSV ou clicar para importar',
    upload_sub: 'HondsH OBD1  -  EN ou PT  -  Multiplos arquivos',
    sec_elec: 'Eletrica / Carregamento',
    sec_fuel: 'Combustivel / Injecao',
    sec_air: 'Ar / Admissao / Carga',
    sec_afr: 'Mistura e Correcao',
    sec_ign: 'Ignicao',
    sec_temp: 'Temperatura e Arrefecimento',
    sec_idle: 'Marcha Lenta / Controle de Ar',
    sec_motion: 'Movimento / Dinamica',
    sec_trans: 'Transmissao / Drivetrain',
    sec_act: 'Atuadores e Emissoes',
    sec_vtec: 'VTEC',
    sec_sw: 'Sensores e Interruptores',
    sec_diag: 'Diagnostico / Sistema',
    sec_diagnosis: 'Diagnostico',
    bat: 'Bateria', alt_fr: 'Alternador FR', alt_frv: 'Alt. FR Tensao', alt_ctrl: 'Alt. Controle',
    eld_curr: 'ELD Corrente', eld_volt: 'ELD Tensao',
    fuel_pump: 'Rele Bomba', fuel_ss: 'Status Combustivel', fuel_flow: 'Fluxo Comb.', fuel_inst: 'Consumo',
    inj_dur: 'Dur. Injecao', inj_dc: 'DC Injecao', inj_fr: 'Fluxo Injetor',
    map_psi: 'MAP', map_volt: 'MAP Tensao', map_clv: 'MAP Carga',
    baro: 'Pressao Barom.', baro_volt: 'Baro Tensao',
    iat: 'IAT', iat_volt: 'IAT Tensao',
    tps: 'TPS', tps_volt: 'TPS Tensao',
    clv: 'Carga Calc.', iab: 'Valv. IAB',
    o2s_volt: 'O2S Tensao', stft: 'STFT', ltft: 'LTFT',
    afr: 'Relacao A/F', lambda: 'Lambda', afr_cmd: 'Cmd AFR',
    fls: 'Loop Feedback', hc: 'Aquec. O2',
    ign_adv: 'Avanco Ign.', ign_lim: 'Limite Ign.', knock: 'Knock',
    ect: 'ECT', ect_volt: 'ECT Tensao', fan: 'Ventoinha Rad.',
    iacv_dc: 'IACV Duty Cycle', iacv_curr: 'IACV Corrente', idle_cmd: 'Cmd Marcha Lenta',
    rev: 'Rotacao Motor', vss: 'Velocidade', vss_cal: 'Velocidade (Cal.)',
    gps_spd: 'Veloc. GPS', lng_accel: 'Acel. Longitudinal',
    gear: 'Marcha', at_mnt: 'A/T Montagens', at_ppn: 'A/T Posicao',
    egr_volt: 'EGR Tensao', egr_cmd: 'EGR Comando', egr_pos: 'EGR Posicao',
    pcs: 'EVAP PCS', pcs_pos: 'PCS Posicao',
    vtec_il: 'VTEC Lampada', vtec_psw: 'VTEC Press. SW', vtec_sv: 'VTEC Solenoide', vtec_sf: 'VTEC Feedback',
    brake: 'Interruptor Freio', starter: 'Interruptor Partida',
    ac_relay: 'Rele A/C', ac_sw: 'Interruptor A/C', pspsw: 'Press. Oleo Dir.',
    mil: 'Check Engine', scs: 'Verificacao Servico', lat: 'Latencia Comm.',
    ch_ltft: 'LTFT - Trim Longo Prazo', ch_stft: 'STFT - Correcao Extrema (>+15%)',
    ch_lambda: 'Lambda (Sonda O2)', ch_iacv: 'IACV - Valvula Marcha Lenta',
    ch_ect: 'ECT - Temperatura Motor', ch_iat: 'IAT - Temperatura Admissao',
    ch_bat: 'Bateria Minima', ch_vtec: 'VTEC Ativo',
    ch_adv: 'Avanco Ignicao (media)', ch_adv_max: 'Avanco Ignicao (max)',
    ch_knock: 'Eventos Knock', ch_map: 'MAP - Pressao Coletor',
    ch_map_wot: 'MAP Aceleracao Total', ch_clv: 'Valor Calculado Carga',
    ch_rev: 'Rotacao Maxima', ch_inj: 'Duracao Injecao',
    ch_inj_dc: 'Duty Cycle Injetor', ch_egr: 'EGR Ativo',
    ch_flow: 'Fluxo Combustivel (l/h)', ch_consump: 'Consumo (km/l)',
    ch_km: 'Distancia Est. por Sessao', ch_accel: 'Aceleracao Longitudinal',
    ch_vmax: 'Velocidade Maxima', ch_eld: 'Corrente ELD',
    th_session: 'Sessao', th_km: 'Km', th_ect_avg: 'ECT med', th_ect_max: 'ECT max',
    th_iat: 'IAT', th_ltft: 'LTFT', th_stft: 'STFT%', th_lambda: 'Lambda',
    th_iacv: 'IACV', th_map_wot: 'MAP wot', th_adv: 'Avanco', th_knock: 'Knock',
    th_inj: 'Inj ms', th_lh: 'l/h', th_kml: 'km/l', th_vtec: 'VTEC%',
    th_bat: 'Bat V', th_mil: 'MIL',
    records: 'registros', charts_visible: 'graficos visiveis', vehicles_tab: 'Veiculos',
    no_charts: 'Nenhum grafico selecionado.',
    time_above: 'tempo acima de 95',
    ideal: 'ideal',
    expected: 'esperado 30-38%',
    max_str: 'max',
    avg_str: 'media',
    this_session: 'nesta sessao',
    high_rpm: 'tempo em alto RPM',
    stopped: 'parado',
    elec_load: 'carga eletrica',
    alt_load: 'carga alternador',
    closed_loop: 'ECU malha fechada',
    no_faults: 'sem falhas ativas',
    cruise_avg: 'media cruzeiro',
  },
}

// --- Chart defs -------------------------------------------------------
type ChartDef = {
  id: string; group: string; titleKey: string; unit?: string
  yMin?: number; yMax?: number
  refLine?: { value: number; label: string; color: string }
  datasets: { label: string; field: keyof LogSession; color: string }[]
}

// HondaSH color palette from screenshots
const C = {
  cyan:   '#00cfff', teal:   '#00b4a0', green:  '#00e060', lime:   '#80e000',
  yellow: '#ffe000', orange: '#ff9000', red:    '#ff3030', pink:   '#ff60a0',
  purple: '#c060ff', blue:   '#4080ff', indigo: '#6060ff', gray:   '#8090a0',
}

const CHART_DEFS: ChartDef[] = [
  // Electrical
  { id:'bat',     group:'elec',    titleKey:'ch_bat',     unit:'V',   yMin:9, yMax:15,
    refLine:{value:12,label:'12V',color:'rgba(255,48,48,0.5)'},
    datasets:[{label:'BAT',field:'bat_min',color:C.green}] },
  { id:'eld',     group:'elec',    titleKey:'ch_eld',     unit:'A',
    datasets:[{label:'ELD',field:'eld_mean',color:C.yellow}] },
  // Fuel
  { id:'flow',    group:'fuel',    titleKey:'ch_flow',    unit:'l/h', yMin:0,
    datasets:[{label:'Flow',field:'fuel_flow_mean',color:C.orange}] },
  { id:'consump', group:'fuel',    titleKey:'ch_consump', unit:'km/l',yMin:0,
    datasets:[{label:'Consumption',field:'inst_consumption',color:C.lime}] },
  { id:'inj',     group:'fuel',    titleKey:'ch_inj',     unit:'ms',  yMin:2,
    datasets:[{label:'Inj Dur',field:'inj_dur',color:C.pink}] },
  { id:'inj_dc',  group:'fuel',    titleKey:'ch_inj_dc',  unit:'%',
    datasets:[{label:'Inj DC',field:'inj_dc_mean',color:C.purple}] },
  // Air
  { id:'map',     group:'air',     titleKey:'ch_map',     unit:'PSI',
    datasets:[{label:'MAP',field:'map_mean',color:C.cyan}] },
  { id:'map_wot', group:'air',     titleKey:'ch_map_wot', unit:'PSI',
    datasets:[{label:'MAP WOT',field:'map_wot',color:C.teal}] },
  { id:'clv',     group:'air',     titleKey:'ch_clv',     unit:'%',
    datasets:[{label:'CLV',field:'clv_mean',color:C.gray}] },
  // AFR
  { id:'ltft',    group:'afr',     titleKey:'ch_ltft',    unit:'%',   yMin:0,
    refLine:{value:1.5,label:'ideal',color:'rgba(0,224,96,0.5)'},
    datasets:[{label:'LTFT',field:'ltft',color:C.orange}] },
  { id:'stft',    group:'afr',     titleKey:'ch_stft',    unit:'%',   yMin:0,
    datasets:[{label:'STFT',field:'stft_above15_pct',color:C.red}] },
  { id:'lambda',  group:'afr',     titleKey:'ch_lambda',  yMin:0.9,   yMax:1.4,
    refLine:{value:1.0,label:'stoich',color:'rgba(0,224,96,0.5)'},
    datasets:[{label:'Lambda',field:'lambda',color:C.green}] },
  // Ignition
  { id:'adv',     group:'ign',     titleKey:'ch_adv',     unit:'deg',
    datasets:[{label:'Adv',field:'adv_mean',color:C.purple}] },
  { id:'adv_max', group:'ign',     titleKey:'ch_adv_max', unit:'deg',
    datasets:[{label:'Adv Max',field:'adv_max',color:C.indigo}] },
  { id:'knock',   group:'ign',     titleKey:'ch_knock',
    datasets:[{label:'Knock',field:'knock_events',color:C.red}] },
  // Temperature
  { id:'ect',     group:'temp',    titleKey:'ch_ect',     unit:'C',   yMin:60,
    refLine:{value:100,label:'100C',color:'rgba(255,48,48,0.5)'},
    datasets:[{label:'ECT max',field:'ect_max',color:C.red},{label:'ECT avg',field:'ect_mean',color:C.orange}] },
  { id:'iat',     group:'temp',    titleKey:'ch_iat',     unit:'C',   yMin:20,
    datasets:[{label:'IAT',field:'iat_mean',color:C.yellow}] },
  // Idle
  { id:'iacv',    group:'idle',    titleKey:'ch_iacv',    unit:'%',   yMin:0,yMax:90,
    refLine:{value:38,label:'max normal',color:'rgba(0,207,255,0.45)'},
    datasets:[{label:'IACV',field:'iacv_mean',color:C.cyan}] },
  // Motion
  { id:'rev',     group:'motion',  titleKey:'ch_rev',     unit:'rpm',
    datasets:[{label:'RPM',field:'rev_max',color:C.pink}] },
  { id:'vmax',    group:'motion',  titleKey:'ch_vmax',    unit:'km/h',yMin:0,
    datasets:[{label:'Speed',field:'vss_max',color:C.blue}] },
  { id:'accel',   group:'motion',  titleKey:'ch_accel',   unit:'G',
    datasets:[{label:'Accel',field:'lng_accel_max',color:C.green},{label:'Brake',field:'lng_accel_min',color:C.red}] },
  { id:'km',      group:'motion',  titleKey:'ch_km',      unit:'km',  yMin:0,
    datasets:[{label:'Distance',field:'km_estimated',color:C.teal}] },
  // VTEC
  { id:'vtec',    group:'vtec',    titleKey:'ch_vtec',    unit:'%',   yMin:0,
    datasets:[{label:'VTEC',field:'vtec_pct',color:C.purple}] },
  // EGR
  { id:'egr',     group:'act',     titleKey:'ch_egr',     unit:'%',
    datasets:[{label:'EGR',field:'egr_active_pct',color:C.gray}] },
]

const GROUP_LABELS_EN: Record<string, string> = {
  elec:'Electrical', fuel:'Fuel & Injection', air:'Air / Intake',
  afr:'Mixture & AFR', ign:'Ignition', temp:'Temperature',
  idle:'Idle Control', motion:'Motion', vtec:'VTEC', act:'Actuators',
}

// --- Helpers ----------------------------------------------------------
function fmt(n: number | null | undefined, d = 1) {
  return n != null && isFinite(n) ? n.toFixed(d) : '--'
}
function pillCls(v: number | null, good: number, warn: number) {
  if (v == null) return 'pill-n'
  if (v <= good) return 'pill-g'
  if (v <= warn) return 'pill-y'
  return 'pill-r'
}
function kpiStatus(v: number | null, warnAt: number, badAt: number, dir: 'up' | 'down' = 'up'): 'good' | 'warn' | 'bad' | 'neutral' {
  if (v == null) return 'neutral'
  if (dir === 'up') { if (v >= badAt) return 'bad'; if (v >= warnAt) return 'warn'; return 'good' }
  else { if (v <= badAt) return 'bad'; if (v <= warnAt) return 'warn'; return 'good' }
}
const AC: Record<string, string> = { bad: '#ff3030', warn: '#ff9000', good: '#00e060', info: '#4080ff' }

// --- KPI mini card (inline, Track Titan style) -----------------------
function Kpi({ label, value, unit, sub, status = 'neutral', color }: {
  label: string; value: string | number | null; unit?: string
  sub?: string; status?: 'good' | 'warn' | 'bad' | 'info' | 'neutral'; color?: string
}) {
  const vc = color ?? (status === 'good' ? C.green : status === 'warn' ? C.yellow : status === 'bad' ? C.red : status === 'info' ? C.blue : '#e2e8f0')
  return (
    <div style={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: vc, opacity: 0.8 }} />
      <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 24, fontWeight: 700, lineHeight: 1, color: vc }}>
        {value ?? '--'}{unit && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 2 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, color: '#475569', fontFamily: 'IBM Plex Mono, monospace', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// --- Section header ---------------------------------------------------
function SectionHeader({ title, accent }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 28 }}>
      {accent && <div style={{ width: 3, height: 18, background: accent, borderRadius: 2 }} />}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#1e2740' }} />
    </div>
  )
}

// --- Main -------------------------------------------------------------
export default function Home() {
  const [dbSessions, setDbSessions]           = useState<LogSession[]>([])
  const [localSessions, setLocalSessions]     = useState<LogSession[]>([])
  const [uploading, setUploading]             = useState(false)
  const [activeIdx, setActiveIdx]             = useState<number | null>(null)
  const [tab, setTab]                         = useState<'overview' | 'timeline' | 'table' | 'score' | 'compat'>('overview')
  const [lang, setLang]                       = useState<Lang>('en')
  const [selectedCharts, setSelectedCharts]   = useState<Set<string>>(new Set(CHART_DEFS.map(c => c.id)))
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen]           = useState(false)
  const [sectionFilter, setSectionFilter]      = useState<Set<string>>(new Set(['elec','fuel','air','afr','ign','temp','idle','motion','act','sec_diagnosis']))
  const [sectionFilterOpen, setSectionFilterOpen] = useState(false)
  const [sectionFilter, setSectionFilter]     = useState(false)
  const [hiddenSections, setHiddenSections]   = useState<Set<string>>(new Set())

  const t = (k: string) => T[lang][k] ?? k

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => { if (d.sessions) setDbSessions(d.sessions) }).catch(() => {})
  }, [])

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
    const newSessions: LogSession[] = []
    for (const file of files) {
      try {
        const { session } = await parseCSVFile(file)
        newSessions.push(session)
        try {
          const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) })
          if (res.ok) {
            const { session: saved } = await res.json()
            setDbSessions(prev => { const i = prev.findIndex(s => s.name === saved.name); if (i >= 0) { const n = [...prev]; n[i] = saved; return n } return [...prev, saved] })
          }
        } catch { /**/ }
      } catch (e) { console.error(e) }
    }
    setLocalSessions(prev => { const m = new Map(prev.map(s => [s.name, s])); newSessions.forEach(s => m.set(s.name, s)); return Array.from(m.values()) })
    setActiveIdx(allSessions.length + newSessions.length - 1)
    setUploading(false)
  }, [allSessions.length])

  const toggleChart = (id: string) => setSelectedCharts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleGroup = (g: string) => setCollapsedGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n })
  const toggleSection = (s: string) => setHiddenSections(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  const sectionVisible = (s: string) => !hiddenSections.has(s)
  const visibleCharts = CHART_DEFS.filter(c => selectedCharts.has(c.id))
  const groups = Array.from(new Set(CHART_DEFS.map(c => c.group)))

  const toggleSection = (s: string) => setSectionFilter(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  const showSec = (s: string) => sectionFilter.has(s)

  const getDisplayDate = (s: LogSession) => {
    const ca = (s as any).created_at
    if (!ca) return null
    const d = new Date(ca)
    return lang === 'pt'
      ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
  }

  // Health score: weighted multi-criteria formula (0-100)
  const healthScore = active ? (() => {
    const m = active
    let score = 100
    // STFT (weight 20) - most immediate indicator
    const stft = m.stft_above15_pct ?? 0
    if (stft > 15) { score -= 20 }
    else if (stft > 5) { score -= 10 }
    else if (stft > 2) { score -= 4 }
    // LTFT (weight 15)
    const ltft = Math.abs(m.ltft ?? 0)
    if (ltft > 6) { score -= 15 }
    else if (ltft > 4) { score -= 10 }
    else if (ltft > 2.5) { score -= 5 }
    // Lambda (weight 15)
    const lam = m.lambda ?? 1
    const lamDev = Math.abs(lam - 1.0)
    if (lamDev > 0.25) { score -= 15 }
    else if (lamDev > 0.15) { score -= 10 }
    else if (lamDev > 0.05) { score -= 4 }
    // ECT (weight 15)
    if ((m.ect_above100_pct ?? 0) > 0) { score -= 15 }
    else if ((m.ect_above95_pct ?? 0) > 30) { score -= 10 }
    else if ((m.ect_above95_pct ?? 0) > 15) { score -= 5 }
    // IACV (weight 10) - vacuum leak indicator
    const iacv = m.iacv_mean ?? 35
    if (iacv > 65) { score -= 10 }
    else if (iacv > 50) { score -= 6 }
    else if (iacv > 42) { score -= 3 }
    // Knock (weight 15)
    const knock = m.knock_events ?? 0
    if (knock > 10) { score -= 15 }
    else if (knock > 3) { score -= 8 }
    else if (knock > 0) { score -= 4 }
    // MIL (weight 5)
    if ((m.mil_on_pct ?? 0) > 0) { score -= 5 }
    // Battery (weight 5)
    if ((m.bat_below12_pct ?? 0) > 5) { score -= 5 }
    else if ((m.bat_below12_pct ?? 0) > 1) { score -= 2 }
    // Closed loop (weight 5)
    const cl = m.closed_loop_pct ?? 0
    if (cl < 50) { score -= 5 }
    else if (cl < 70) { score -= 2 }
    return Math.max(0, Math.min(100, Math.round(score)))
  })() : null

  const healthColor = healthScore == null ? '#475569'
    : healthScore >= 85 ? '#00e060'
    : healthScore >= 65 ? '#ffe000'
    : healthScore >= 40 ? '#ff9000'
    : '#ff3030'

  const G: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f1117', fontFamily: "'IBM Plex Sans', sans-serif", color: '#e2e8f0' }}>

      {/* -- TOPBAR -- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, background: '#111827', borderBottom: '1px solid #1e2740', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 3, color: '#f97316', fontFamily: 'IBM Plex Mono, monospace' }}>HNDSH</span>
            <span style={{ fontSize: 12, color: '#475569', letterSpacing: 1, fontFamily: 'IBM Plex Mono, monospace' }}>.meters</span>
          </div>
          <div style={{ width: 1, height: 18, background: '#1e2740' }} />
          <span style={{ fontSize: 11, padding: '3px 10px', border: '1px solid #1e2740', borderRadius: 5, color: '#64748b', letterSpacing: 1.5, background: '#161c2a', fontFamily: 'IBM Plex Mono, monospace' }}>Honda OBD1</span>
          {allSessions.length > BASELINE.length && (
            <span style={{ fontSize: 11, padding: '3px 10px', border: '1px solid #14532d', borderRadius: 5, color: C.green, letterSpacing: 1.5, background: '#052e16', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>
              {allSessions.length - BASELINE.length} {t('imported')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', height: 52 }}>
          {(['overview', 'timeline', 'table', 'score', 'compat'] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{ padding: '0 20px', height: 52, border: 'none', borderBottom: tab === tb ? '2px solid #f97316' : '2px solid transparent', background: 'transparent', color: tab === tb ? '#f97316' : '#64748b', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontWeight: tab === tb ? 700 : 400, fontFamily: 'IBM Plex Mono, monospace' }}>
              {tb === 'overview' ? t('overview') : tb === 'timeline' ? t('timeline') : tb === 'table' ? t('table') : tb === 'score' ? 'Score' : 'Compat'}
            </button>
          ))}
          <div style={{ marginLeft: 16, display: 'flex', gap: 6, alignItems: 'center', paddingLeft: 16, borderLeft: '1px solid #1e2740' }}>
            <button onClick={() => setLang('en')} style={{ background: lang === 'en' ? '#1e3a5f' : 'transparent', border: '1px solid', borderColor: lang === 'en' ? '#3b82f6' : '#1e2740', borderRadius: 4, cursor: 'pointer', color: lang === 'en' ? '#60a5fa' : '#475569', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, padding: '3px 8px', letterSpacing: 1 }}>EN</button>
            <button onClick={() => setLang('pt')} style={{ background: lang === 'pt' ? '#1e3a5f' : 'transparent', border: '1px solid', borderColor: lang === 'pt' ? '#3b82f6' : '#1e2740', borderRadius: 4, cursor: 'pointer', color: lang === 'pt' ? '#60a5fa' : '#475569', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, padding: '3px 8px', letterSpacing: 1 }}>PT</button>
          </div>
        </div>
      </div>

      {/* -- BODY -- */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* -- SIDEBAR -- */}
        <div style={{ width: 220, minWidth: 220, flexShrink: 0, background: '#111827', borderRight: '1px solid #1e2740', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #1e2740', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{t('sessions_header')}</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {allSessions.map((s, i) => {
              const isActive = active?.name === s.name
              const dot = s.ltft != null ? (s.ltft <= 2.5 ? C.green : s.ltft <= 4 ? C.yellow : C.red) : '#334155'
              const dateStr = getDisplayDate(s)
              return (
                <div key={s.name} onClick={() => setActiveIdx(i)} style={{ padding: '10px 14px', borderBottom: '1px solid #161c2a', cursor: 'pointer', position: 'relative', background: isActive ? '#1a2035' : 'transparent', transition: 'background 0.15s' }}>
                  {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#f97316' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#f97316' : (dateStr ? '#e2e8f0' : '#94a3b8'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'IBM Plex Mono, monospace' }}>
                      {dateStr ?? s.name}
                    </span>
                    {isNew(s) && <span style={{ fontSize: 8, background: '#1e3a5f', color: '#60a5fa', padding: '1px 5px', borderRadius: 3, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>NEW</span>}
                  </div>
                  {dateStr && <div style={{ fontSize: 10, color: '#475569', paddingLeft: 14, fontFamily: 'IBM Plex Mono, monospace' }}>{s.name}</div>}
                </div>
              )
            })}
          </div>
          {/* Upload */}
          <div style={{ padding: 12, borderTop: '1px solid #1e2740' }}>
            <div
              onClick={() => { const inp = document.getElementById('csv-upload') as HTMLInputElement; inp?.click() }}
              onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#f97316' }}
              onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2740' }}
              onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2740'; const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv')); if (files.length) handleFiles(files) }}
              style={{ border: '1.5px dashed #1e2740', borderRadius: 8, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'border-color 0.15s' }}
            >
              <input id="csv-upload" type="file" accept=".csv" multiple style={{ display: 'none' }} onChange={e => { const files = Array.from(e.target.files || []); if (files.length) handleFiles(files); e.target.value = '' }} />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.5px', textAlign: 'center' }}>
                {uploading ? 'Processing...' : t('upload_drag')}
              </span>
              <span style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', lineHeight: 1.6 }}>{t('upload_sub')}</span>
            </div>
          </div>
        </div>

        {/* -- CONTENT -- */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* -- OVERVIEW -- */}
          {tab === 'overview' && active && (
            <div>
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{active.name}</h1>
                  <span style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#475569', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {active.rows?.toLocaleString()} rows{active.duration_min ? `  -  ${active.duration_min} min` : ''}{active.km_estimated ? `  -  ${fmt(active.km_estimated, 1)} km` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  {/* Health Score */}
                  {healthScore != null && (
                    <div style={{ background: '#111827', border: `1px solid ${healthColor}40`, borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#475569', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 2 }}>Health</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: healthColor, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>{healthScore}</div>
                      <div style={{ fontSize: 8, color: '#334155', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>/100</div>
                    </div>
                  )}
                  {/* Section filter button */}
                  <button onClick={() => setSectionFilter(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: sectionFilter ? '#1e3a5f' : '#161c2a', border: '1px solid', borderColor: sectionFilter ? '#3b82f6' : '#1e2740', borderRadius: 7, cursor: 'pointer', color: sectionFilter ? '#60a5fa' : '#64748b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    Sections
                  </button>
                </div>
              </div>
              {/* Section filter panel */}
              {sectionFilter && (
                <div style={{ background: '#111827', border: '1px solid #1e2740', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>Show / Hide Sections</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setHiddenSections(new Set())} style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #1e3a5f', borderRadius: 4, background: '#0f1f3a', color: '#60a5fa', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{t('select_all')}</button>
                      <button onClick={() => setHiddenSections(new Set(['elec','fuel','air','afr','ign','temp','idle','motion','act','diagnosis']))} style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #1e2740', borderRadius: 4, background: 'transparent', color: '#475569', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                    {[['elec',t('sec_elec')],['fuel',t('sec_fuel')],['air',t('sec_air')],['afr',t('sec_afr')],['ign',t('sec_ign')],['temp',t('sec_temp')],['idle',t('sec_idle')],['motion',t('sec_motion')],['act',t('sec_act')],['sec_diagnosis',t('sec_diagnosis')]].map(([id,label]) => (
                      <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={!hiddenSections.has(id)} onChange={() => toggleSection(id as string)} style={{ accentColor: '#f97316', width: 13, height: 13, cursor: 'pointer' }} />
                        <span style={{ fontSize: 11, color: !hiddenSections.has(id) ? '#e2e8f0' : '#334155', fontFamily: 'IBM Plex Mono, monospace', transition: 'color 0.15s' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}


              {showSec('elec') && (<>
              {/* 1. Electrical & Charging */}
              <SectionHeader title={t('sec_elec')} accent={C.green} />
              <div style={G}>
                <Kpi label={t('bat')} value={fmt(active.bat_mean, 2)} unit="V" sub={`min ${fmt(active.bat_min, 2)}V`} status={kpiStatus(active.bat_below12_pct, 1, 5)} color={C.green} />
                <Kpi label={t('alt_fr')} value={fmt(active.alt_fr_mean)} unit="%" sub="alternator FR" color={C.yellow} />
                <Kpi label={t('eld_curr')} value={fmt(active.eld_mean, 0)} unit="A" sub={t('elec_load')} color={C.cyan} />
              </div>


              
              </>
              )}
{showSec('fuel') && (<>
              {/* 2. Fuel & Injection */}
              <SectionHeader title={t('sec_fuel')} accent={C.orange} />
              <div style={G}>
                <Kpi label={t('fuel_flow')} value={fmt(active.fuel_flow_mean, 2)} unit="l/h" sub="avg hourly" color={C.orange} />
                <Kpi label={t('fuel_inst')} value={fmt(active.inst_consumption, 1)} unit="km/l" sub={t('cruise_avg')} color={C.lime} />
                <Kpi label={t('inj_dur')} value={fmt(active.inj_dur, 2)} unit="ms" sub={`DC: ${fmt(active.inj_dc_mean)}%`} color={C.pink} />
                <Kpi label={t('inj_dc')} value={fmt(active.inj_dc_mean)} unit="%" color={C.purple} />
                <Kpi label={t('inj_fr')} value={fmt(active.inj_fr_mean, 0)} unit="cc/min" color={C.pink} />
              </div>


              
              </>
              )}
{showSec('air') && (<>
              {/* 3. Air / Intake / Load */}
              <SectionHeader title={t('sec_air')} accent={C.cyan} />
              <div style={G}>
                <Kpi label={t('map_psi')} value={fmt(active.map_mean)} unit="PSI" sub={`WOT: ${fmt(active.map_wot)} PSI`} color={C.cyan} />
                <Kpi label={t('iat')} value={fmt(active.iat_mean)} unit="C" sub={`max ${fmt(active.iat_max)}C`} status={kpiStatus(active.iat_mean, 55, 65)} color={C.yellow} />
                <Kpi label={t('clv')} value={fmt(active.clv_mean)} unit="%" sub="engine load" color={C.gray} />
              </div>


              
              </>
              )}
{showSec('afr') && (<>
              {/* 4. Mixture & AFR */}
              <SectionHeader title={t('sec_afr')} accent={C.green} />
              <div style={G}>
                <Kpi label={t('ltft')} value={(active.ltft != null && active.ltft > 0 ? '+' : '') + fmt(active.ltft)} unit="%" sub="ideal: +-1.5%" status={kpiStatus(active.ltft, 2.5, 4)} color={C.orange} />
                <Kpi label={t('stft')} value={fmt(active.stft_above15_pct)} unit="%" sub=">+15% of time" status={kpiStatus(active.stft_above15_pct, 3, 10)} color={C.red} />
                <Kpi label={t('lambda')} value={fmt(active.lambda, 3)} sub="ideal: ~1.000" status={kpiStatus(active.lambda, 1.05, 1.15)} color={C.green} />
                <Kpi label={t('iacv_dc')} value={fmt(active.iacv_mean)} unit="%" sub={t('expected')} status={kpiStatus(active.iacv_mean, 42, 55)} color={C.cyan} />
                <Kpi label={t('fls')} value={fmt(active.closed_loop_pct)} unit="%" sub="closed loop" status="info" color={C.blue} />
              </div>


              
              </>
              )}
{showSec('ign') && (<>
              {/* 5. Ignition */}
              <SectionHeader title={t('sec_ign')} accent={C.purple} />
              <div style={G}>
                <Kpi label={t('ign_adv')} value={fmt(active.adv_mean)} unit="deg" sub={`max ${fmt(active.adv_max)}deg`} color={C.purple} />
                <Kpi label={t('ign_lim')} value={fmt(active.ign_limit_mean)} unit="deg" color={C.indigo} />
                <Kpi label={t('knock')} value={active.knock_events ?? '--'} sub={`max ${fmt(active.knock_max, 3)}V`} status={active.knock_events === 0 ? 'good' : 'bad'} color={active.knock_events === 0 ? C.green : C.red} />
              </div>


              
              </>
              )}
{showSec('temp') && (<>
              {/* 6. Temperature & Cooling */}
              <SectionHeader title={t('sec_temp')} accent={C.red} />
              <div style={G}>
                <Kpi label={t('ect')} value={fmt(active.ect_mean)} unit="C" sub={`max ${fmt(active.ect_max)}C`} status={kpiStatus(active.ect_max, 97, 102)} color={C.red} />
                <Kpi label="ECT >95C" value={fmt(active.ect_above95_pct)} unit="%" sub={`${t('time_above')}C`} status={kpiStatus(active.ect_above95_pct, 20, 35)} color={C.orange} />
                <Kpi label={t('fan')} value={fmt(active.fan_on_pct)} unit="%" sub="radiator fan" color={C.cyan} />
              </div>


              
              </>
              )}
{showSec('idle') && (<>
              {/* 7. Idle Control */}
              <SectionHeader title={t('sec_idle')} accent={C.teal} />
              <div style={G}>
                <Kpi label={t('iacv_dc')} value={fmt(active.iacv_mean)} unit="%" sub="expected: 30-38%" status={kpiStatus(active.iacv_mean, 42, 55)} color={C.teal} />
                <Kpi label={t('rev')} value={fmt(active.rev_mean, 0)} unit="rpm" sub={`max ${fmt(active.rev_max, 0)} rpm`} color={C.pink} />
              </div>


              
              </>
              )}
{showSec('motion') && (<>
              {/* 8. Motion & Dynamics */}
              <SectionHeader title={t('sec_motion')} accent={C.blue} />
              <div style={G}>
                <Kpi label={t('vss')} value={fmt(active.vss_mean)} unit="km/h" sub={`max ${fmt(active.vss_max, 0)} km/h`} color={C.blue} />
                <Kpi label={t('lng_accel')} value={fmt(active.lng_accel_max, 3)} unit="G" sub={`brake ${fmt(active.lng_accel_min, 3)}G`} color={C.cyan} />
                <Kpi label="Est. Distance" value={fmt(active.km_estimated, 1)} unit="km" sub={t('this_session')} color={C.teal} />
                <Kpi label="VTEC" value={fmt(active.vtec_pct)} unit="%" sub={t('high_rpm')} color={C.purple} />
              </div>


              
              </>
              )}
{showSec('act') && (<>
              {/* 9. Actuators & Emissions */}
              <SectionHeader title={t('sec_act')} accent={C.gray} />
              <div style={G}>
                <Kpi label="EGR" value={fmt(active.egr_active_pct)} unit="%" sub="recirculation" color={C.gray} />
              </div>


              
              </>
              )}
{showSec('sec_diagnosis') && (<>
              {/* 10. Diagnosis */}
              <SectionHeader title={t('sec_diagnosis')} accent={C.red} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 8, border: `1px solid ${AC[a.type]}30`, background: `${AC[a.type]}0a` }}>
                    <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: `${AC[a.type]}20`, color: AC[a.type], letterSpacing: 1, flexShrink: 0, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{a.param}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: AC[a.type], marginBottom: 4 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{a.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              </>
              )}
            </div>
          )}

          {/* -- TIMELINE -- */}
          {tab === 'timeline' && (
            <div>
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{t('timeline')}</h1>
                  <span style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#475569', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {allSessions.length} {t('sessions')}  -  {visibleCharts.length} {t('charts_visible')}
                  </span>
                </div>
                <button onClick={() => setFilterOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: filterOpen ? '#1e3a5f' : '#161c2a', border: '1px solid', borderColor: filterOpen ? '#3b82f6' : '#1e2740', borderRadius: 7, cursor: 'pointer', color: filterOpen ? '#60a5fa' : '#64748b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: 1, transition: 'all 0.15s' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  {t('filter_charts')}
                </button>
              </div>

              {filterOpen && (
                <div style={{ background: '#111827', border: '1px solid #1e2740', borderRadius: 10, padding: '18px 20px', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace' }}>{t('filter_charts')}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setSelectedCharts(new Set(CHART_DEFS.map(c => c.id)))} style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #1e3a5f', borderRadius: 4, background: '#0f1f3a', color: '#60a5fa', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{t('select_all')}</button>
                      <button onClick={() => setSelectedCharts(new Set())} style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #1e2740', borderRadius: 4, background: 'transparent', color: '#475569', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px 20px' }}>
                    {groups.map(grp => (
                      <div key={grp}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#f97316', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace' }}>{GROUP_LABELS_EN[grp] ?? grp}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {CHART_DEFS.filter(c => c.group === grp).map(c => (
                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                              <input type="checkbox" checked={selectedCharts.has(c.id)} onChange={() => toggleChart(c.id)} style={{ accentColor: '#f97316', width: 12, height: 12, cursor: 'pointer' }} />
                              <span style={{ fontSize: 11, color: selectedCharts.has(c.id) ? '#e2e8f0' : '#334155', fontFamily: 'IBM Plex Mono, monospace', transition: 'color 0.15s' }}>{c.id.replace(/_/g, ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groups.map(grp => {
                const charts = visibleCharts.filter(c => c.group === grp)
                if (!charts.length) return null
                const collapsed = collapsedGroups.has(grp)
                return (
                  <div key={grp} style={{ marginBottom: 32 }}>
                    <button onClick={() => toggleGroup(grp)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #1e2740', paddingBottom: 10, marginBottom: collapsed ? 0 : 18, cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.5, fontFamily: 'IBM Plex Mono, monospace' }}>{GROUP_LABELS_EN[grp] ?? grp}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'IBM Plex Mono, monospace' }}>{charts.length} charts</span>
                        <span style={{ fontSize: 16, color: '#475569', lineHeight: 1, transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>v</span>
                      </div>
                    </button>
                    {!collapsed && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))', gap: 16 }}>
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
                            yMin={c.yMin} yMax={c.yMax}
                            refLine={c.refLine}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {visibleCharts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>
                  {t('no_charts')}
                </div>
              )}
            </div>
          )}

          {/* -- TABLE -- */}
          {tab === 'table' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{t('table')}</h1>
                <span style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#475569', fontFamily: 'IBM Plex Mono, monospace' }}>{t('all_logs')}  -  {allSessions.length} {t('sessions')}</span>
              </div>
              <div style={{ overflowX: 'auto', background: '#111827', borderRadius: 10, border: '1px solid #1e2740' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
                  <thead><tr>
                    {[t('th_session'), t('th_km'), t('th_ect_avg'), t('th_ect_max'), t('th_iat'), t('th_ltft'), t('th_stft'), t('th_lambda'), t('th_iacv'), t('th_map_wot'), t('th_adv'), t('th_knock'), t('th_inj'), t('th_lh'), t('th_kml'), t('th_vtec'), t('th_bat'), t('th_mil')].map(h => (
                      <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#475569', borderBottom: '1px solid #1e2740', whiteSpace: 'nowrap', background: '#0f1117', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {allSessions.map((s, i) => (
                      <tr key={s.name} onClick={() => { setActiveIdx(i); setTab('overview') }} style={{ borderBottom: '1px solid #161c2a', background: isNew(s) ? '#1a2035' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}>
                        <td style={{ padding: '10px 12px', color: isNew(s) ? '#f97316' : '#e2e8f0', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.km_estimated, 1)}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.ect_mean)}C</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.ect_max)}C</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.iat_mean)}C</td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.ltft, 2.5, 4)}`}>{s.ltft != null ? (s.ltft > 0 ? '+' : '') + fmt(s.ltft) : '--'}%</span></td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.stft_above15_pct, 3, 10)}`}>{fmt(s.stft_above15_pct)}%</span></td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.lambda, 1.05, 1.15)}`}>{fmt(s.lambda, 3)}</span></td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.iacv_mean, 42, 55)}`}>{fmt(s.iacv_mean)}%</span></td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.map_wot)}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.adv_mean)}</td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${s.knock_events === 0 ? 'pill-g' : 'pill-r'}`}>{s.knock_events ?? '--'}</span></td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.inj_dur, 2)}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.fuel_flow_mean, 2)}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.inst_consumption, 1)}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.vtec_pct)}%</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmt(s.bat_mean, 2)}V</td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${!s.mil_on_pct ? 'pill-g' : 'pill-r'}`}>{s.mil_on_pct ? t('active_str') : 'OFF'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

          {/* -- SCORE -- */}
          {tab === 'score' && active && (() => {
            // Weighted health score 0-100
            const w = {
              ltft:   { val: active.ltft,               weight: 25, goodAt: 1.5,  badAt: 5.0,  invert: true },
              lambda: { val: active.lambda,              weight: 20, goodAt: 1.05, badAt: 1.20, invert: true },
              stft:   { val: active.stft_above15_pct,    weight: 15, goodAt: 2,    badAt: 10,   invert: true },
              iacv:   { val: active.iacv_mean,           weight: 15, goodAt: 42,   badAt: 60,   invert: true },
              ect:    { val: active.ect_above95_pct,     weight: 10, goodAt: 15,   badAt: 35,   invert: true },
              knock:  { val: active.knock_events,        weight: 10, goodAt: 0,    badAt: 5,    invert: true },
              bat:    { val: active.bat_below12_pct,     weight:  5, goodAt: 0,    badAt: 5,    invert: true },
            }
            let totalScore = 0
            let totalWeight = 0
            const breakdown: {key:string;label:string;score:number;weight:number;val:string;color:string}[] = []
            for (const [key, cfg] of Object.entries(w)) {
              if (cfg.val == null) continue
              const range = cfg.badAt - cfg.goodAt
              let raw = range > 0 ? Math.min(1, Math.max(0, (cfg.val - cfg.goodAt) / range)) : 0
              const componentScore = Math.round((1 - raw) * 100)
              const color = componentScore >= 80 ? '#00e060' : componentScore >= 50 ? '#ffe000' : '#ff3030'
              breakdown.push({ key, label: key.toUpperCase(), score: componentScore, weight: cfg.weight, val: fmt(cfg.val, 2), color })
              totalScore += componentScore * cfg.weight
              totalWeight += cfg.weight
            }
            const finalScore = Math.round(totalScore / (totalWeight || 1))
            const scoreColor = finalScore >= 80 ? '#00e060' : finalScore >= 55 ? '#ffe000' : '#ff3030'
            const scoreLabel = finalScore >= 80 ? 'HEALTHY' : finalScore >= 55 ? 'NEEDS ATTENTION' : 'CRITICAL'
            return (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>Engine Health Score</h1>
                  <span style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#475569', fontFamily: 'IBM Plex Mono, monospace' }}>{active.name}  -  weighted composite</span>
                </div>
                {/* Big score */}
                <div style={{ background: '#111827', border: `1px solid ${scoreColor}40`, borderRadius: 16, padding: '32px 36px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 40 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 80, fontWeight: 900, color: scoreColor, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>{finalScore}</div>
                    <div style={{ fontSize: 11, letterSpacing: 3, color: scoreColor, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, marginTop: 8 }}>{scoreLabel}</div>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'IBM Plex Mono, monospace', marginTop: 4 }}>out of 100</div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {breakdown.map(b => (
                      <div key={b.key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 50px 40px', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#94a3b8', letterSpacing: 1 }}>{b.label}</span>
                        <div style={{ height: 6, background: '#1e2740', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${b.score}%`, background: b.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: b.color, fontWeight: 700, textAlign: 'right' }}>{b.score}</span>
                        <span style={{ fontSize: 9, color: '#334155', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}>w:{b.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Score over time */}
                <div style={{ background: '#111827', border: '1px solid #1e2740', borderRadius: 12, padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: '#475569', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, textTransform: 'uppercase', marginBottom: 14 }}>Score Evolution</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 100 }}>
                    {allSessions.map((s, idx) => {
                      let sc = 0, tw = 0
                      const ww = [
                        { val: s.ltft,             w: 25, g: 1.5,  b: 5.0  },
                        { val: s.lambda,            w: 20, g: 1.05, b: 1.20 },
                        { val: s.stft_above15_pct,  w: 15, g: 2,    b: 10   },
                        { val: s.iacv_mean,         w: 15, g: 42,   b: 60   },
                        { val: s.ect_above95_pct,   w: 10, g: 15,   b: 35   },
                        { val: s.knock_events,      w: 10, g: 0,    b: 5    },
                        { val: s.bat_below12_pct,   w:  5, g: 0,    b: 5    },
                      ]
                      for (const c of ww) {
                        if (c.val == null) continue
                        const r = c.b - c.g > 0 ? Math.min(1, Math.max(0, (c.val - c.g) / (c.b - c.g))) : 0
                        sc += (1 - r) * 100 * c.w; tw += c.w
                      }
                      const sScore = tw > 0 ? Math.round(sc / tw) : 0
                      const sColor = sScore >= 80 ? '#00e060' : sScore >= 55 ? '#ffe000' : '#ff3030'
                      const isAct = s.name === active.name
                      return (
                        <div key={s.name} onClick={() => setActiveIdx(idx)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: sColor, fontWeight: 700 }}>{sScore}</div>
                          <div style={{ width: '100%', height: `${sScore}%`, minHeight: 4, background: sColor, borderRadius: '3px 3px 0 0', opacity: isAct ? 1 : 0.5, border: isAct ? `1px solid ${sColor}` : 'none' }} />
                          <div style={{ fontSize: 8, color: '#334155', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{s.name.split(' ')[0]}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* -- COMPAT -- */}
          {tab === 'compat' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Compatible Vehicles</h1>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, maxWidth: 680 }}>
                  All Honda/Acura gasoline models produced from 1992 to 2001 that use the proprietary 3-pin or 5-pin DLC diagnostic connector are compatible with HondsH OBD1 scanner. Vehicles using the standard 16-pin OBD2 port (US/CA from 1996+) are not supported.
                </p>
              </div>
              {[
                { model: 'Honda Civic / CRX', years: '1992-2000', engines: 'D15B, D15Z1, D16Z6, D16Y5, D16Y7, D16Y8, B16A, B16A2', notes: 'EG, EK chassis. Includes Del Sol (CRX successor).' },
                { model: 'Honda Civic Type R', years: '1997-2001', engines: 'B16B', notes: 'JDM EK9 only. 185ps DOHC VTEC. 3-pin DLC.' },
                { model: 'Honda Accord', years: '1992-2001', engines: 'F22A, F22B1, F22B2, F23A, H23A, F18B', notes: 'CB7 (92-93), CD5/CD7 (94-97), CF8/CG5 (98-01). Your car: 1995 CD5 F22B1.' },
                { model: 'Honda Prelude', years: '1992-2001', engines: 'F22A, F22B, H22A, H23A', notes: 'BB1/BB4 (92-96), BB6 (97-01). H22A VTEC is the performance variant.' },
                { model: 'Honda Integra / Acura Integra', years: '1992-2001', engines: 'B17A1, B18A1, B18B1, B18C, B18C1, B18C5', notes: 'DA/DC chassis. Includes Type R (DC2 ITR).' },
                { model: 'Honda CR-V', years: '1997-2001', engines: 'B20B, B20Z2', notes: 'RD1/RD3 chassis. 4WD variant. Non-VTEC B20.' },
                { model: 'Honda HR-V / Logo', years: '1999-2001', engines: 'D13B, D16W', notes: 'Subcompact. EU/JDM markets primarily.' },
                { model: 'Honda Orthia / Partner', years: '1996-2002', engines: 'B20B, D16A', notes: 'JDM wagon based on CR-V platform.' },
                { model: 'Honda Stream (early)', years: '2000-2001', engines: 'D17A, K20A', notes: 'Pre-OBD2 JDM variants with 3-pin DLC.' },
                { model: 'Honda Odyssey (JDM)', years: '1994-1999', engines: 'F22B, F23A', notes: 'JDM RA1/RA2. US Odyssey uses different connector.' },
                { model: 'Honda Stepwgn', years: '1996-2001', engines: 'B20B', notes: 'JDM minivan. OBD1 3-pin DLC variants.' },
                { model: 'Honda S-MX / Mobilio', years: '1996-2001', engines: 'B20B, L15A', notes: 'JDM compact MPV.' },
                { model: 'Honda Domani / Integra SJ', years: '1992-2001', engines: 'D15B, D16A', notes: 'JDM sedan variant of Civic platform.' },
                { model: 'Honda Logo / Capa', years: '1996-2001', engines: 'D13B', notes: 'JDM subcompact. Some EU variants included.' },
                { model: 'Acura NSX', years: '1991-2001', engines: 'C30A, C32B', notes: 'NA1/NA2 chassis. 3.0L/3.2L DOHC VTEC V6. OBD1 variants.' },
                { model: 'Acura Legend / Honda Legend', years: '1991-1995', engines: 'C32A', notes: 'KA7/KA8. V6 3.2L. JDM/EU markets. Last OBD0/1 generation.' },
                { model: 'Acura Vigor / Honda Ascot', years: '1992-1994', engines: 'G25A', notes: 'CC2/CB chassis. Inline-5 2.5L. Rare.' },
                { model: 'Acura TL / Honda Inspire (1st gen)', years: '1996-1998', engines: 'G25A4, G25A5', notes: 'UA3 chassis. Some variants use 3-pin DLC.' },
              ].map((v, i) => (
                <div key={i} style={{ background: '#111827', border: '1px solid #1e2740', borderRadius: 10, padding: '16px 20px', marginBottom: 10, display: 'grid', gridTemplateColumns: '200px 80px 1fr 1fr', gap: '0 20px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{v.model}</div>
                    <div style={{ fontSize: 10, background: '#1e3a5f', color: '#60a5fa', padding: '2px 7px', borderRadius: 3, display: 'inline-block', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{v.years}</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', paddingTop: 2 }}>OBD1<br/>3/5-pin</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.6 }}>{v.engines}</div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{v.notes}</div>
                </div>
              ))}
              <div style={{ marginTop: 20, padding: '14px 18px', background: '#1a1f2e', border: '1px solid #1e2740', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                  <strong style={{ color: '#94a3b8' }}>Note:</strong> Some early 92-95 models may have the 3-pin connector with only 2 wires connected (no power pin). In this case, the scanner requires an external power source. US/CA vehicles from 1996+ use the standard 16-pin OBD2 port and are not compatible. EU and JDM models from 1999+ with the 5-pin DLC but without the ECU communication wire are also not compatible.
                </p>
              </div>
            </div>
          )}


      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; }
        body { background: #0f1117; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2740; border-radius: 3px; }
        .pill { display: inline-block; padding: 2px 7px; border-radius: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700; }
        .pill-g { background: #052e16; color: #00e060; border: 1px solid #14532d; }
        .pill-y { background: #3a2700; color: #ffe000; border: 1px solid #6b4f00; }
        .pill-r { background: #2d0a0a; color: #ff3030; border: 1px solid #7f1d1d; }
        .pill-n { background: #161c2a; color: #475569; border: 1px solid #1e2740; }
        tr:hover td { background: rgba(249,115,22,0.04) !important; }
      `}</style>
    </div>
  )
}
