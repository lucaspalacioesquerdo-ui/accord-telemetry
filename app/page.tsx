'use client'

import { useEffect, useState, useCallback } from 'react'
import KpiCard from '@/components/KpiCard'
import TimelineChart from '@/components/TimelineChart'
import UploadZone from '@/components/UploadZone'
import { parseCSVFile, BASELINE } from '@/lib/parser'
import { generateAlerts } from '@/lib/alerts'
import type { LogSession } from '@/lib/supabase'

// ─── i18n ────────────────────────────────────────────────────────────
type Lang = 'en' | 'pt'
const T: Record<Lang, Record<string, string>> = {
  en: {
    sessions: 'Sessions', overview: 'Overview', timeline: 'Timeline',
    table: 'Table', records: 'records', imported: 'imported',
    temp: 'Temperature', mixture: 'Mixture & Fuel Trim',
    consump_sec: 'Consumption & Distance', elec: 'Electrical & Status',
    diagnosis: 'Diagnosis', noFaults: 'No active faults',
    active_str: 'ACTIVE', filter_charts: 'Filter Charts',
    select_all: 'All', clear_sel: 'Clear',
    sessions_header: 'Sessions', all_logs: 'All logs',
    ignition_sec: 'Ignition & Engine Load',
    // KPIs
    ect_avg: 'ECT Avg', iat_avg: 'IAT Avg', ect_hot: 'ECT > 95°C',
    ltft_lbl: 'LTFT', stft_lbl: 'STFT > +15%', lambda_lbl: 'Lambda', iacv_lbl: 'IACV',
    adv_lbl: 'Ign. Advance', adv_max_lbl: 'Adv. Max', ign_lim_lbl: 'Ign. Limit',
    knock_lbl: 'Knock', map_lbl: 'MAP', map_wot_lbl: 'MAP @ WOT', clv_lbl: 'Calc. Load',
    rev_max_lbl: 'Rev Max', inj_dur_lbl: 'Inj. Duration', inj_dc_lbl: 'Inj. Duty Cycle',
    inj_fr_lbl: 'Inj. Flow Rate', egr_lbl: 'EGR Active',
    flow_lbl: 'Fuel Flow', consump_lbl: 'Consumption', km_lbl: 'Est. Distance', vtec_lbl: 'VTEC',
    bat_lbl: 'Battery', eld_lbl: 'ELD Current', alt_lbl: 'Alternator FR',
    cl_lbl: 'Closed Loop', mil_lbl: 'Check Engine', vmax_lbl: 'Max Speed',
    ac_lbl: 'A/C Active', fan_lbl: 'Fan Active', brake_lbl: 'Brake',
    // chart labels
    ch_ltft: 'LTFT — Long Term Fuel Trim', ch_stft: 'STFT — Extreme Correction (>+15%)',
    ch_lambda: 'Lambda (O₂)', ch_iacv: 'IACV — Idle Air Control',
    ch_ect: 'ECT — Coolant Temp', ch_iat: 'IAT — Intake Air Temp',
    ch_bat: 'Battery Min', ch_vtec: 'VTEC Active Time',
    ch_adv: 'Ignition Advance (avg)', ch_adv_max: 'Ignition Advance (max)',
    ch_knock: 'Knock Events', ch_map: 'MAP — Manifold Pressure',
    ch_map_wot: 'MAP @ WOT', ch_clv: 'Calculated Load Value',
    ch_rev: 'Engine RPM (max)', ch_inj: 'Injection Duration',
    ch_inj_dc: 'Injector Duty Cycle', ch_egr: 'EGR Active Time',
    ch_flow: 'Fuel Flow (avg l/h)', ch_consump: 'Consumption (km/l)',
    ch_km: 'Est. Distance per session', ch_accel: 'Longitudinal Acceleration',
    ch_vmax: 'Max Speed', ch_eld: 'ELD Current',
  },
  pt: {
    sessions: 'Sessões', overview: 'Visão Geral', timeline: 'Linha do Tempo',
    table: 'Tabela', records: 'registros', imported: 'importado(s)',
    temp: 'Temperatura', mixture: 'Mistura & Fuel Trim',
    consump_sec: 'Consumo & Distância', elec: 'Elétrico & Status',
    diagnosis: 'Diagnóstico', noFaults: 'Sem falhas ativas',
    active_str: 'ATIVO', filter_charts: 'Filtrar Gráficos',
    select_all: 'Todos', clear_sel: 'Limpar',
    sessions_header: 'Sessões', all_logs: 'Todos os logs',
    ignition_sec: 'Ignição & Carga do Motor',
    ect_avg: 'ECT Média', iat_avg: 'IAT Média', ect_hot: 'ECT > 95°C',
    ltft_lbl: 'LTFT', stft_lbl: 'STFT > +15%', lambda_lbl: 'Lambda', iacv_lbl: 'IACV',
    adv_lbl: 'Avanço Ign.', adv_max_lbl: 'Avanço Máx.', ign_lim_lbl: 'Limite Ign.',
    knock_lbl: 'Knock', map_lbl: 'MAP', map_wot_lbl: 'MAP @ WOT', clv_lbl: 'Carga Calc.',
    rev_max_lbl: 'Rotação Máx.', inj_dur_lbl: 'Dur. Injeção', inj_dc_lbl: 'DC Injeção',
    inj_fr_lbl: 'Fluxo Injetor', egr_lbl: 'EGR Ativo',
    flow_lbl: 'Fluxo Comb.', consump_lbl: 'Consumo', km_lbl: 'Dist. Estimada', vtec_lbl: 'VTEC',
    bat_lbl: 'Bateria', eld_lbl: 'Corrente ELD', alt_lbl: 'FR Alternador',
    cl_lbl: 'Malha Fechada', mil_lbl: 'Check Engine', vmax_lbl: 'Vel. Máx.',
    ac_lbl: 'A/C Ativo', fan_lbl: 'Ventoinha', brake_lbl: 'Freio',
    ch_ltft: 'LTFT — Trim Longo Prazo', ch_stft: 'STFT — Correção Extrema (>+15%)',
    ch_lambda: 'Lambda (Sonda O₂)', ch_iacv: 'IACV — Válvula Marcha Lenta',
    ch_ect: 'ECT — Temperatura Motor', ch_iat: 'IAT — Temperatura Admissão',
    ch_bat: 'Bateria Mínima', ch_vtec: 'VTEC Ativo',
    ch_adv: 'Avanço Ignição (média)', ch_adv_max: 'Avanço Ignição (máx)',
    ch_knock: 'Eventos Knock', ch_map: 'MAP — Pressão Coletor',
    ch_map_wot: 'MAP @ Aceleração Total', ch_clv: 'Valor Calculado Carga',
    ch_rev: 'Rotação Máxima', ch_inj: 'Duração Injeção',
    ch_inj_dc: 'Duty Cycle Injetor', ch_egr: 'EGR Ativo',
    ch_flow: 'Fluxo Combustível (l/h)', ch_consump: 'Consumo (km/l)',
    ch_km: 'Distância Estimada por Sessão', ch_accel: 'Aceleração Longitudinal',
    ch_vmax: 'Velocidade Máxima', ch_eld: 'Corrente ELD',
  },
}

// ─── Chart definitions ───────────────────────────────────────────────
type ChartDef = {
  id: string
  group: 'fuel' | 'temp' | 'ignition' | 'consumption' | 'electrical'
  titleKey: string
  unit?: string
  yMin?: number
  yMax?: number
  refLine?: { value: number; labelKey: string; color: string }
  datasets: { labelKey: string; field: keyof LogSession; color: string }[]
}

const CHART_DEFS: ChartDef[] = [
  // Fuel
  { id: 'ltft',     group: 'fuel',        titleKey: 'ch_ltft',    unit: '%',   yMin: 0, refLine: { value: 1.5, labelKey: 'ideal', color: 'rgba(52,211,153,0.45)' }, datasets: [{ labelKey: 'ltft_lbl',   field: 'ltft',              color: '#fb923c' }] },
  { id: 'stft',     group: 'fuel',        titleKey: 'ch_stft',    unit: '%',   yMin: 0, datasets: [{ labelKey: 'stft_lbl',  field: 'stft_above15_pct',  color: '#f87171' }] },
  { id: 'lambda',   group: 'fuel',        titleKey: 'ch_lambda',              yMin: 0.95, yMax: 1.35, refLine: { value: 1.0, labelKey: 'stoich', color: 'rgba(52,211,153,0.45)' }, datasets: [{ labelKey: 'lambda_lbl', field: 'lambda',            color: '#34d399' }] },
  { id: 'iacv',     group: 'fuel',        titleKey: 'ch_iacv',    unit: '%',   yMin: 0, yMax: 85, refLine: { value: 38, labelKey: 'max normal', color: 'rgba(56,189,248,0.4)' }, datasets: [{ labelKey: 'iacv_lbl',  field: 'iacv_mean',         color: '#38bdf8' }] },
  // Temperature
  { id: 'ect',      group: 'temp',        titleKey: 'ch_ect',     unit: '°C',  yMin: 65, refLine: { value: 100, labelKey: '100°C', color: 'rgba(248,113,113,0.45)' }, datasets: [{ labelKey: 'ect_avg',   field: 'ect_max',  color: '#f87171' }, { labelKey: 'ect_avg', field: 'ect_mean', color: '#fb923c' }] },
  { id: 'iat',      group: 'temp',        titleKey: 'ch_iat',     unit: '°C',  yMin: 25, datasets: [{ labelKey: 'iat_avg',   field: 'iat_mean',          color: '#fbbf24' }] },
  // Ignition
  { id: 'adv',      group: 'ignition',    titleKey: 'ch_adv',     unit: '°',   datasets: [{ labelKey: 'adv_lbl',   field: 'adv_mean',          color: '#a78bfa' }] },
  { id: 'adv_max',  group: 'ignition',    titleKey: 'ch_adv_max', unit: '°',   datasets: [{ labelKey: 'adv_max_lbl', field: 'adv_max',          color: '#c084fc' }] },
  { id: 'knock',    group: 'ignition',    titleKey: 'ch_knock',               datasets: [{ labelKey: 'knock_lbl', field: 'knock_events',      color: '#f87171' }] },
  { id: 'map',      group: 'ignition',    titleKey: 'ch_map',     unit: 'PSI', datasets: [{ labelKey: 'map_lbl',   field: 'map_mean',          color: '#818cf8' }] },
  { id: 'map_wot',  group: 'ignition',    titleKey: 'ch_map_wot', unit: 'PSI', datasets: [{ labelKey: 'map_wot_lbl', field: 'map_wot',         color: '#6366f1' }] },
  { id: 'clv',      group: 'ignition',    titleKey: 'ch_clv',     unit: '%',   datasets: [{ labelKey: 'clv_lbl',   field: 'clv_mean',          color: '#94a3b8' }] },
  { id: 'rev',      group: 'ignition',    titleKey: 'ch_rev',     unit: 'rpm', datasets: [{ labelKey: 'rev_max_lbl', field: 'rev_max',         color: '#f472b6' }] },
  { id: 'inj',      group: 'ignition',    titleKey: 'ch_inj',     unit: 'ms',  yMin: 2,  datasets: [{ labelKey: 'inj_dur_lbl', field: 'inj_dur',         color: '#e879f9' }] },
  { id: 'inj_dc',   group: 'ignition',    titleKey: 'ch_inj_dc',  unit: '%',   datasets: [{ labelKey: 'inj_dc_lbl', field: 'inj_dc_mean',       color: '#d946ef' }] },
  { id: 'egr',      group: 'ignition',    titleKey: 'ch_egr',     unit: '%',   datasets: [{ labelKey: 'egr_lbl',   field: 'egr_active_pct',    color: '#64748b' }] },
  // Consumption
  { id: 'flow',     group: 'consumption', titleKey: 'ch_flow',    unit: 'l/h', yMin: 0,  datasets: [{ labelKey: 'flow_lbl',  field: 'fuel_flow_mean',    color: '#fb923c' }] },
  { id: 'consump',  group: 'consumption', titleKey: 'ch_consump', unit: 'km/l',yMin: 0,  datasets: [{ labelKey: 'consump_lbl', field: 'inst_consumption', color: '#34d399' }] },
  { id: 'km',       group: 'consumption', titleKey: 'ch_km',      unit: 'km',  yMin: 0,  datasets: [{ labelKey: 'km_lbl',    field: 'km_estimated',      color: '#38bdf8' }] },
  { id: 'vmax',     group: 'consumption', titleKey: 'ch_vmax',    unit: 'km/h',yMin: 0,  datasets: [{ labelKey: 'vmax_lbl',  field: 'vss_max',           color: '#60a5fa' }] },
  { id: 'accel',    group: 'consumption', titleKey: 'ch_accel',   unit: 'G',   datasets: [{ labelKey: 'adv_max_lbl', field: 'lng_accel_max',   color: '#34d399' }, { labelKey: 'adv_lbl', field: 'lng_accel_min', color: '#f87171' }] },
  // Electrical
  { id: 'bat',      group: 'electrical',  titleKey: 'ch_bat',     unit: 'V',   yMin: 9, yMax: 15, refLine: { value: 12, labelKey: '12V', color: 'rgba(248,113,113,0.4)' }, datasets: [{ labelKey: 'bat_lbl', field: 'bat_min', color: '#34d399' }] },
  { id: 'eld',      group: 'electrical',  titleKey: 'ch_eld',     unit: 'A',   datasets: [{ labelKey: 'eld_lbl',   field: 'eld_mean',          color: '#fbbf24' }] },
  { id: 'vtec',     group: 'electrical',  titleKey: 'ch_vtec',    unit: '%',   yMin: 0,  datasets: [{ labelKey: 'vtec_lbl',  field: 'vtec_pct',          color: '#a78bfa' }] },
]

const GROUP_LABELS: Record<string, string> = {
  fuel: 'Fuel & Mixture', temp: 'Temperature',
  ignition: 'Ignition & Engine Load', consumption: 'Consumption & Performance', electrical: 'Electrical',
}

// ─── Helpers ─────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, d = 1) { return n != null && isFinite(n) ? n.toFixed(d) : '--' }
function pillCls(v: number | null, good: number, warn: number) {
  if (v == null) return 'pill-n'; if (v <= good) return 'pill-g'; if (v <= warn) return 'pill-y'; return 'pill-r'
}
function kpiStatus(v: number | null, warnAt: number, badAt: number, dir: 'up' | 'down' = 'up'): 'good' | 'warn' | 'bad' | 'neutral' {
  if (v == null) return 'neutral'
  if (dir === 'up') { if (v >= badAt) return 'bad'; if (v >= warnAt) return 'warn'; return 'good' }
  else { if (v <= badAt) return 'bad'; if (v <= warnAt) return 'warn'; return 'good' }
}
const AC: Record<string, string> = { bad: '#f87171', warn: '#fbbf24', good: '#34d399', info: 'var(--accent)' }

// ─── Main ─────────────────────────────────────────────────────────────
export default function Home() {
  const [dbSessions, setDbSessions] = useState<LogSession[]>([])
  const [localSessions, setLocalSessions] = useState<LogSession[]>([])
  const [uploading, setUploading] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [tab, setTab] = useState<'overview' | 'timeline' | 'table'>('overview')
  const [lang, setLang] = useState<Lang>('en')
  const [selectedCharts, setSelectedCharts] = useState<Set<string>>(new Set(CHART_DEFS.map(c => c.id)))

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
  const alerts = active ? generateAlerts(active) : []
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
        } catch {}
      } catch (e) { console.error(e) }
    }
    setLocalSessions(prev => { const m = new Map(prev.map(s => [s.name, s])); newSessions.forEach(s => m.set(s.name, s)); return Array.from(m.values()) })
    setActiveIdx(allSessions.length + newSessions.length - 1)
    setUploading(false)
  }, [allSessions.length])

  const toggleChart = (id: string) => setSelectedCharts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const visibleCharts = CHART_DEFS.filter(c => selectedCharts.has(c.id))
  const groups = Array.from(new Set(visibleCharts.map(c => c.group)))

  // sidebar item
  const SItem = ({ s, i }: { s: LogSession; i: number }) => {
    const isActive = active?.name === s.name
    const dot = s.ltft != null ? (s.ltft <= 2.5 ? 'var(--green)' : s.ltft <= 4 ? 'var(--yellow)' : 'var(--red)') : 'var(--muted)'
    return (
      <div onClick={() => setActiveIdx(i)} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', position: 'relative', background: isActive ? 'rgba(56,189,248,0.06)' : 'transparent', transition: 'background 0.15s' }}>
        {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--accent)' }} />}
        <div className="mono" style={{ fontSize: 10, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.name}</span>
          {isNew(s) && <span style={{ color: 'var(--accent)', fontSize: 8 }}>●</span>}
        </div>
        <div className="label-xs" style={{ paddingLeft: 13 }}>{s.rows?.toLocaleString()} {t('records')}{s.km_estimated ? ` · ${fmt(s.km_estimated, 1)} km` : ''}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 52, background: 'var(--panel)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="mono" style={{ fontSize: 14, fontWeight: 600, letterSpacing: 3, color: 'var(--accent)' }}>HNDSH</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>.meters</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border2)' }} />
          <span className="mono" style={{ fontSize: 9, padding: '3px 8px', border: '1px solid var(--border2)', borderRadius: 4, color: 'var(--muted)', letterSpacing: 1.5 }}>F22B1 · CD5 · OBD1</span>
          {allSessions.length > BASELINE.length && (
            <span className="mono" style={{ fontSize: 9, padding: '3px 8px', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 4, color: 'var(--green)', letterSpacing: 1.5 }}>
              {allSessions.length - BASELINE.length} {t('imported')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, height: 52 }}>
          {(['overview', 'timeline', 'table'] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)} className="mono" style={{ padding: '0 20px', height: 52, border: 'none', borderBottom: tab === tb ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', color: tab === tb ? 'var(--accent)' : 'var(--muted)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>
              {t(tb === 'overview' ? 'overview' : tb === 'timeline' ? 'timeline' : 'table')}
            </button>
          ))}
          {/* Lang flags */}
          <div style={{ marginLeft: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setLang('en')} title="English" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: lang === 'en' ? 1 : 0.35, transition: 'opacity 0.2s', fontSize: 20, padding: '0 2px' }}>🇺🇸</button>
            <button onClick={() => setLang('pt')} title="Português" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: lang === 'pt' ? 1 : 0.35, transition: 'opacity 0.2s', fontSize: 20, padding: '0 2px' }}>🇧🇷</button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* SIDEBAR */}
        <div style={{ width: 220, minWidth: 220, flexShrink: 0, background: 'var(--panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="label-xs" style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)' }}>{t('sessions_header')}</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {allSessions.map((s, i) => <SItem key={s.name} s={s} i={i} />)}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <UploadZone onFiles={handleFiles} loading={uploading} />
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && active && (() => {
            const S: React.CSSProperties = { marginBottom: 28 }
            const SL: React.CSSProperties = { fontFamily: 'IBM Plex Mono,monospace', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }
            const G: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 10 }
            return (
              <div>
                <div style={{ marginBottom: 28 }}>
                  <h1 className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>{active.name}</h1>
                  <span className="label-xs">{active.rows?.toLocaleString()} {t('records')}{active.duration_min ? ` · ${active.duration_min} min` : ''}{active.km_estimated ? ` · ${fmt(active.km_estimated, 1)} km` : ''}</span>
                </div>

                <div style={S}><div style={SL}>{t('temp')}</div><div style={G}>
                  <KpiCard label={t('ect_avg')} value={fmt(active.ect_mean)} unit="°C" sub={`max ${fmt(active.ect_max)}°C`} status={kpiStatus(active.ect_max, 97, 102)} />
                  <KpiCard label={t('iat_avg')} value={fmt(active.iat_mean)} unit="°C" sub={`max ${fmt(active.iat_max)}°C`} status={kpiStatus(active.iat_mean, 55, 65)} />
                  <KpiCard label={t('ect_hot')} value={fmt(active.ect_above95_pct)} unit="%" sub="time above 95°C" status={kpiStatus(active.ect_above95_pct, 20, 35)} />
                </div></div>

                <div style={S}><div style={SL}>{t('mixture')}</div><div style={G}>
                  <KpiCard label={t('ltft_lbl')} value={(active.ltft != null && active.ltft > 0 ? '+' : '') + fmt(active.ltft)} unit="%" sub="ideal: ±1.5%" status={kpiStatus(active.ltft, 2.5, 4)} />
                  <KpiCard label={t('stft_lbl')} value={fmt(active.stft_above15_pct)} unit="%" sub="extreme correction" status={kpiStatus(active.stft_above15_pct, 3, 10)} />
                  <KpiCard label={t('lambda_lbl')} value={fmt(active.lambda, 3)} sub="ideal: ~1.000" status={kpiStatus(active.lambda, 1.05, 1.15)} />
                  <KpiCard label={t('iacv_lbl')} value={fmt(active.iacv_mean)} unit="%" sub="expected: 30-38%" status={kpiStatus(active.iacv_mean, 42, 55)} />
                </div></div>

                <div style={S}><div style={SL}>{t('ignition_sec')}</div><div style={G}>
                  <KpiCard label={t('adv_lbl')} value={fmt(active.adv_mean)} unit="°" sub={`max ${fmt(active.adv_max)}°`} status="info" />
                  <KpiCard label={t('knock_lbl')} value={active.knock_events ?? '--'} sub={`max ${fmt(active.knock_max, 3)}V`} status={active.knock_events === 0 ? 'good' : 'bad'} />
                  <KpiCard label={t('map_lbl')} value={fmt(active.map_mean)} unit="PSI" sub={`WOT: ${fmt(active.map_wot)} PSI`} status="neutral" />
                  <KpiCard label={t('clv_lbl')} value={fmt(active.clv_mean)} unit="%" sub="engine load" status="neutral" />
                  <KpiCard label={t('rev_max_lbl')} value={fmt(active.rev_max, 0)} unit="rpm" sub={`avg ${fmt(active.rev_mean, 0)} rpm`} status="neutral" />
                  <KpiCard label={t('inj_dur_lbl')} value={fmt(active.inj_dur, 2)} unit="ms" sub={`DC: ${fmt(active.inj_dc_mean)}%`} status="neutral" />
                  <KpiCard label={t('egr_lbl')} value={fmt(active.egr_active_pct)} unit="%" sub="recirculation" status="neutral" />
                </div></div>

                <div style={S}><div style={SL}>{t('consump_sec')}</div><div style={G}>
                  <KpiCard label={t('flow_lbl')} value={fmt(active.fuel_flow_mean, 2)} unit="l/h" sub="avg hourly" status="info" />
                  <KpiCard label={t('consump_lbl')} value={fmt(active.inst_consumption, 1)} unit="km/l" sub="cruise avg" status="info" />
                  <KpiCard label={t('km_lbl')} value={fmt(active.km_estimated, 1)} unit="km" sub="this session" status="info" />
                  <KpiCard label={t('vtec_lbl')} value={fmt(active.vtec_pct)} unit="%" sub="high RPM time" status="neutral" />
                  <KpiCard label={t('vmax_lbl')} value={fmt(active.vss_max, 0)} unit="km/h" sub={`stopped: ${fmt(active.stopped_pct)}%`} status="neutral" />
                </div></div>

                <div style={S}><div style={SL}>{t('elec')}</div><div style={G}>
                  <KpiCard label={t('bat_lbl')} value={fmt(active.bat_mean, 2)} unit="V" sub={`min ${fmt(active.bat_min, 2)}V`} status={kpiStatus(active.bat_below12_pct, 1, 5)} />
                  <KpiCard label={t('eld_lbl')} value={fmt(active.eld_mean, 0)} unit="A" sub="electrical load" status="neutral" />
                  <KpiCard label={t('alt_lbl')} value={fmt(active.alt_fr_mean)} unit="%" sub="alternator load" status="neutral" />
                  <KpiCard label={t('cl_lbl')} value={fmt(active.closed_loop_pct)} unit="%" sub="ECU closed loop" status="info" />
                  <KpiCard label={t('mil_lbl')} value={active.mil_on_pct ? t('active_str') : 'OFF'} sub={active.mil_on_pct ? `${fmt(active.mil_on_pct)}%` : t('noFaults')} status={active.mil_on_pct ? 'bad' : 'good'} />
                  {active.ac_on_pct != null && <KpiCard label={t('ac_lbl')} value={fmt(active.ac_on_pct)} unit="%" sub="A/C switch" status="neutral" />}
                  {active.fan_on_pct != null && <KpiCard label={t('fan_lbl')} value={fmt(active.fan_on_pct)} unit="%" sub="radiator fan" status="neutral" />}
                </div></div>

                <div style={S}><div style={SL}>{t('diagnosis')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {alerts.map((a, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 8, border: `1px solid ${AC[a.type]}22`, background: `${AC[a.type]}08` }}>
                        <div className="mono" style={{ fontSize: 9, padding: '3px 7px', borderRadius: 4, background: `${AC[a.type]}18`, color: AC[a.type], letterSpacing: 1, flexShrink: 0 }}>{a.param}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: AC[a.type], marginBottom: 3 }}>{a.title}</div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.6 }}>{a.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── TIMELINE ── */}
          {tab === 'timeline' && (
            <div>
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                <div>
                  <h1 className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>{t('timeline')}</h1>
                  <span className="label-xs">{allSessions.length} {t('sessions')} · {visibleCharts.length} {lang === 'en' ? 'charts visible' : 'gráficos visíveis'}</span>
                </div>

                {/* Filter panel */}
                <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', minWidth: 260, maxWidth: 340 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="label-xs">{t('filter_charts')}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setSelectedCharts(new Set(CHART_DEFS.map(c => c.id)))} className="mono" style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--border2)', borderRadius: 3, background: 'transparent', color: 'var(--accent)', cursor: 'pointer', letterSpacing: 1 }}>{t('select_all')}</button>
                      <button onClick={() => setSelectedCharts(new Set())} className="mono" style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--border2)', borderRadius: 3, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', letterSpacing: 1 }}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  {Object.entries(GROUP_LABELS).map(([grp, grpLabel]) => (
                    <div key={grp} style={{ marginBottom: 10 }}>
                      <div className="label-xs" style={{ marginBottom: 6, color: 'var(--accent)', letterSpacing: 1.5 }}>{grpLabel}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                        {CHART_DEFS.filter(c => c.group === grp).map(c => (
                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={selectedCharts.has(c.id)} onChange={() => toggleChart(c.id)}
                              style={{ accentColor: 'var(--accent)', width: 12, height: 12, cursor: 'pointer' }} />
                            <span className="mono" style={{ fontSize: 9, color: selectedCharts.has(c.id) ? 'var(--text)' : 'var(--muted)', letterSpacing: 0.5, transition: 'color 0.15s' }}>
                              {t('ch_' + c.id).replace(/.*— /, '').replace('(avg)', '').replace('(max)', '').trim().split(' ').slice(0, 3).join(' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts grouped */}
              {groups.map(grp => (
                <div key={grp} style={{ marginBottom: 36 }}>
                  <div className="label-xs" style={{ marginBottom: 14, color: 'var(--accent)', letterSpacing: 2, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    {GROUP_LABELS[grp]}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 16 }}>
                    {visibleCharts.filter(c => c.group === grp).map(c => (
                      <TimelineChart
                        key={c.id}
                        title={t(c.titleKey)}
                        unit={c.unit}
                        labels={tlLabels}
                        datasets={c.datasets.map(d => ({
                          label: t(d.labelKey),
                          data: allSessions.map(s => s[d.field] as number | null),
                          color: d.color,
                        }))}
                        yMin={c.yMin}
                        yMax={c.yMax}
                        refLine={c.refLine ? { value: c.refLine.value, label: c.refLine.labelKey, color: c.refLine.color } : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {visibleCharts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }} className="mono">
                  {lang === 'en' ? 'No charts selected. Use the filter panel to add charts.' : 'Nenhum gráfico selecionado. Use o painel de filtros.'}
                </div>
              )}
            </div>
          )}

          {/* ── TABLE ── */}
          {tab === 'table' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--text)', marginBottom: 4 }}>{t('table')}</h1>
                <span className="label-xs">{t('all_logs')} · {allSessions.length} {t('sessions')}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono,monospace', fontSize: 11 }}>
                  <thead><tr>
                    {['Session','Km','ECT avg','ECT max','IAT','LTFT','STFT%','Lambda','IACV','MAP wot','Adv','Knock','Inj ms','l/h','km/l','VTEC%','Bat V','MIL'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--panel)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {allSessions.map((s, i) => (
                      <tr key={s.name} onClick={() => { setActiveIdx(i); setTab('overview') }} style={{ borderBottom: '1px solid var(--border)', background: isNew(s) ? 'rgba(56,189,248,0.03)' : 'transparent', cursor: 'pointer' }}>
                        <td style={{ padding: '10px 12px', color: isNew(s) ? 'var(--accent)' : 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{s.name}</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.km_estimated, 1)}</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.ect_mean)}°</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.ect_max)}°</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.iat_mean)}°</td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.ltft, 2.5, 4)}`}>{s.ltft != null ? (s.ltft > 0 ? '+' : '') + fmt(s.ltft) : '--'}%</span></td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.stft_above15_pct, 3, 10)}`}>{fmt(s.stft_above15_pct)}%</span></td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.lambda, 1.05, 1.15)}`}>{fmt(s.lambda, 3)}</span></td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${pillCls(s.iacv_mean, 42, 55)}`}>{fmt(s.iacv_mean)}%</span></td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.map_wot)}</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.adv_mean)}°</td>
                        <td style={{ padding: '10px 12px' }}><span className={`pill ${s.knock_events === 0 ? 'pill-g' : 'pill-r'}`}>{s.knock_events ?? '--'}</span></td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.inj_dur, 2)}</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.fuel_flow_mean, 2)}</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.inst_consumption, 1)}</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.vtec_pct)}%</td>
                        <td style={{ padding: '10px 12px' }}>{fmt(s.bat_mean, 2)}V</td>
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
    </div>
  )
}
