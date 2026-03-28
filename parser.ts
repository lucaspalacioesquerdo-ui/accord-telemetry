import Papa from 'papaparse'
import type { LogSession } from './supabase'

// Column name aliases (EN + PT)
const COL: Record<string, string[]> = {
  time:    ['Time [ms]', 'Tempo [ms]'],
  ect:     ['Engine Coolant Temperature (ECT) [°C]', 'Temperatura do líquido de arrefecimento do motor (ECT) [°C]'],
  iat:     ['Intake Air Temperature (IAT) [°C]', 'Temperatura do ar de admissão (IAT) [°C]'],
  ltft:    ['Long Term - Fuel Trim - Oxygen Sensor (FTLT-O2S) [%]', 'Longo Prazo - Guarnição de combustível - Sensor de oxigênio (FTLT-O2S) [%]'],
  stft:    ['Short Term - Fuel Trim - Oxygen Sensor (FTST-O2S) [%]', 'Curto Prazo - Guarnição de combustível - Sensor de oxigênio (FTST-O2S) [%]'],
  lambda:  ['Lambda - Oxygen Sensor (λ-O2S) []', 'Lambda - Sensor de oxigênio (λ-O2S) []', 'Lambda - Sensor de oxigênio (»-O2S) []'],
  adv:     ['Ignition Advance - Ignition (ADV-IGN) [°]', 'Avanço da ignição - Ignição (ADV-IGN) [°]'],
  ign_lim: ['Limit - Ignition (LIM-IGN) [°]', 'Limite - Ignição (LIM-IGN) [°]'],
  iacv:    ['Duty Cycle - Idle Air Control Valve (DC-IACV) [%]', 'Ciclo de trabalho - Válvula de controle de ar de marcha lenta (DC-IACV) [%]'],
  flow:    ['Flow - Fuel (FLW-FL) [l/h]', 'Fluxo - Combustível (FLW-FL) [l/h]'],
  inj:     ['Duration - Injection (DUR-INJ) [ms]', 'Duração - Injeção (DUR-INJ) [ms]'],
  inj_dc:  ['Duty Cycle - Injection (DC-INJ) [%]', 'Ciclo de trabalho - Injeção (DC-INJ) [%]'],
  inj_fr:  ['Injector Flow Rate - Injection (FR-INJ) [cc/min]', 'Taxa de fluxo do injetor - Injeção (FR-INJ) [cc/min]'],
  bat:     ['Battery (BAT) [V]', 'Voltagem da bateria (BAT) [V]'],
  alt_fr:  ['FR - Alternator (F-ALT) [%]', 'FR - Alternador (F-ALT) [%]'],
  vtec:    ['Solenoid Valve - VTEC (S-VT) []', 'Válvula solenóide - VTEC (S-VT) []'],
  knock:   ['Knock (KS) [V]'],
  mil:     ['Malfunction Indicator Lamp (MIL) []', 'Luz indicadora de mal funcionamento (MIL) []'],
  cl:      ['Feedback Loop Status - Oxygen Sensor (FLS-O2S) []', 'Status do loop de feedback do HO2S - Sensor de oxigênio (FLS-O2S) []'],
  vss:     ['Vehicle Speed (VSS) [kph]', 'Velocidade do veículo (VSS) [kph]'],
  eld:     ['Current - Electrical Load Detector (ELD) [A]', 'Corrente - Detector de carga elétrica (ELD) [A]'],
  inst:    ['Instantaneous Fuel Consumption - Fuel (INST-FL) [km/l]', 'Consumo instantâneo de combustível - Combustível (INST-FL) [km/l]'],
  lnga:    ['Longitudinal Acceleration - Vehicle Speed (LNGA-VSS) [G]', 'Aceleração longitudinal - Velocidade do veículo (LNGA-VSS) [G]'],
  map:     ['Manifold Absolute Pressure (MAP) [PSI]', 'Pressão absoluta do coletor (MAP) [PSI]'],
  clv:     ['Calculated Load Value (CLV) [%]', 'Valor calculado da carga (CLV) [%]'],
  rev:     ['Engine Rotational Speed (REV) [rpm]', 'Rotação do motor (REV) [rpm]'],
  egr:     ['Position - Exhaust Gas Recirculation Valve (POS-EGR) [%]', 'Posição - Válvula de Recirculação de Gás de Escape (POS-EGR) [%]'],
  fan:     ['Radiator Fan Control (FANC) []', 'Controle da ventoinha do radiador (FANC) []'],
  ac:      ['Switch - A/C (SW-AC) []', 'Interruptor - A/C (SW-AC) []'],
  brake:   ['Brake Switch (BKSW) []', 'Interruptor do freio (BKSW) []'],
}

type Row = Record<string, number | string>

function getCol(rows: Row[], key: string): number[] {
  const candidates = COL[key] || []
  for (const c of candidates) {
    if (rows[0]?.[c] !== undefined) {
      return rows.map(r => {
        const v = parseFloat(r[c] as string)
        return isNaN(v) ? NaN : v
      })
    }
  }
  return []
}

function clean(arr: number[]): number[] {
  return arr.filter(v => isFinite(v) && !isNaN(v))
}
function avg(arr: number[]): number | null {
  const c = clean(arr); return c.length ? c.reduce((a, b) => a + b, 0) / c.length : null
}
function max(arr: number[]): number | null {
  const c = clean(arr); return c.length ? Math.max(...c) : null
}
function min(arr: number[]): number | null {
  const c = clean(arr); return c.length ? Math.min(...c) : null
}
function pct(arr: number[], fn: (v: number) => boolean): number | null {
  const c = clean(arr); return c.length ? (c.filter(fn).length / c.length) * 100 : null
}
function r2(n: number | null): number | null {
  return n != null ? Math.round(n * 100) / 100 : null
}

// Derive ISO date string from Unix ms timestamp
function tsToDate(ms: number): string {
  const d = new Date(ms)
  return d.toISOString().slice(0, 10)  // "YYYY-MM-DD"
}

// Check if timestamp looks like a Unix epoch in ms (> year 2000 in ms)
const MIN_UNIX_MS = 946684800000  // 2000-01-01
const MAX_UNIX_MS = 4102444800000 // 2100-01-01

export function extractMetrics(rows: Row[], name: string): LogSession {
  const ect    = getCol(rows, 'ect')
  const iat    = getCol(rows, 'iat')
  const ltft   = getCol(rows, 'ltft')
  const stft   = getCol(rows, 'stft')
  const lam    = getCol(rows, 'lambda').map(v => (v > 0 && v < 5) ? v : NaN)
  const adv    = getCol(rows, 'adv')
  const ignLim = getCol(rows, 'ign_lim')
  const iacv   = getCol(rows, 'iacv')
  const flow   = getCol(rows, 'flow').map(v => v > 0 ? v : NaN)
  const inj    = getCol(rows, 'inj')
  const injDc  = getCol(rows, 'inj_dc')
  const injFr  = getCol(rows, 'inj_fr')
  const bat    = getCol(rows, 'bat')
  const altFr  = getCol(rows, 'alt_fr')
  const vtec   = getCol(rows, 'vtec')
  const knock  = getCol(rows, 'knock')
  const mil    = getCol(rows, 'mil')
  const cl     = getCol(rows, 'cl')
  const vss    = getCol(rows, 'vss')
  const eld    = getCol(rows, 'eld')
  const time   = getCol(rows, 'time')
  const inst   = getCol(rows, 'inst').map(v => (v > 0 && v < 80) ? v : NaN)
  const lnga   = getCol(rows, 'lnga')
  const map    = getCol(rows, 'map')
  const clv    = getCol(rows, 'clv')
  const rev    = getCol(rows, 'rev')
  const egr    = getCol(rows, 'egr')
  const fan    = getCol(rows, 'fan')
  const ac     = getCol(rows, 'ac')
  const brake  = getCol(rows, 'brake')

  const durationMin = time.length > 1
    ? (time[time.length - 1] - time[0]) / 60000
    : null

  // -- Date extraction from Unix ms timestamps --
  const validTimes = time.filter(v => isFinite(v) && v > MIN_UNIX_MS && v < MAX_UNIX_MS)
  let dateStart: string | null = null
  let dateEnd: string | null = null
  let sortTs: number | null = null

  if (validTimes.length > 0) {
    const firstTs = validTimes[0]
    const lastTs  = validTimes[validTimes.length - 1]
    dateStart = tsToDate(firstTs)
    dateEnd   = tsToDate(lastTs)
    sortTs    = firstTs
    // Same day? collapse dateEnd
    if (dateStart === dateEnd) dateEnd = null
  } else {
    // Fallback: try to parse date from filename pattern log_YYMMDD_HHMMSS
    const m = name.match(/(\d{2})(\d{2})(\d{2})[_\s](\d{2})(\d{2})/)
    if (m) {
      dateStart = `20${m[1]}-${m[2]}-${m[3]}`
      sortTs    = new Date(`20${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00Z`).getTime()
    }
  }

  // -- MIL filter: ignore first 2 minutes (engine pre-start with key-on) --
  // Rows in first 120 seconds of relative time are excluded from MIL calc
  let milFiltered = mil
  if (time.length > 0 && mil.length === time.length) {
    const t0 = time[0]
    const cutoff = t0 + 120000  // 2 minutes in ms
    milFiltered = mil.map((v, i) => time[i] <= cutoff ? 0 : v)
  }

  // Km estimate: integrate speed x time
  let kmEst = 0
  for (let i = 1; i < Math.min(vss.length, time.length); i++) {
    const dt = (time[i] - time[i-1]) / 3600000
    const v  = (vss[i] + vss[i-1]) / 2
    if (isFinite(dt) && isFinite(v) && dt > 0 && dt < 0.01) kmEst += v * dt
  }

  // MAP WOT: 95th percentile of MAP readings
  const mapClean  = clean(map)
  const mapSorted = [...mapClean].sort((a, b) => a - b)
  const mapWot    = mapSorted.length ? mapSorted[Math.floor(mapSorted.length * 0.95)] : null

  return {
    name,
    rows: rows.length,
    duration_min:     r2(durationMin),
    date_start:       dateStart,
    date_end:         dateEnd,
    sort_ts:          sortTs,
    ect_mean:         r2(avg(ect)),
    ect_max:          r2(max(ect)),
    ect_above95_pct:  r2(pct(ect, v => v > 95)),
    ect_above100_pct: r2(pct(ect, v => v > 100)),
    iat_mean:         r2(avg(iat)),
    iat_max:          r2(max(iat)),
    iat_above70_pct:  r2(pct(iat, v => v > 70)),
    ltft:             r2(avg(ltft)),
    stft_above15_pct: r2(pct(stft, v => v > 15)),
    lambda:           r2(avg(lam)),
    flow_mean:        r2(avg(flow)),
    inj_dur:          r2(avg(inj)),
    adv_mean:         r2(avg(adv)),
    adv_neg_pct:      r2(pct(adv, v => v < 0)),
    adv_max:          r2(max(adv)),
    ign_limit_mean:   r2(avg(ignLim)),
    iacv_mean:        r2(avg(iacv)),
    iacv_max:         r2(max(iacv)),
    knock_events:     clean(knock).filter(v => v > 0.1).length,
    knock_max:        r2(max(knock)),
    vtec_pct:         r2(pct(vtec, v => v === 1)),
    map_mean:         r2(avg(map)),
    map_max:          r2(max(map)),
    map_wot:          r2(mapWot),
    clv_mean:         r2(avg(clv)),
    rev_mean:         r2(avg(rev)),
    rev_max:          r2(max(rev)),
    inj_dc_mean:      r2(avg(injDc)),
    inj_fr_mean:      r2(avg(injFr)),
    egr_active_pct:   r2(pct(egr, v => v > 5)),
    bat_mean:         r2(avg(bat)),
    bat_min:          r2(min(bat)),
    bat_below12_pct:  r2(pct(bat, v => v < 12)),
    eld_mean:         r2(avg(eld)),
    alt_fr_mean:      r2(avg(altFr)),
    mil_on_pct:       r2(pct(milFiltered, v => v === 1)),
    closed_loop_pct:  r2(pct(cl, v => v === 8 || v === 1)),
    vss_max:          r2(max(vss)),
    vss_mean:         r2(avg(vss)),
    stopped_pct:      r2(pct(vss, v => v === 0)),
    fuel_flow_mean:   r2(avg(flow)),
    fuel_flow_max:    r2(max(flow)),
    inst_consumption: r2(avg(inst)),
    km_estimated:     r2(kmEst > 0 ? kmEst : null),
    lng_accel_max:    r2(max(lnga)),
    lng_accel_min:    r2(min(lnga)),
    lng_accel_mean:   r2(avg(clean(lnga).map(v => Math.abs(v)))),
    ac_on_pct:        r2(pct(ac, v => v === 1)),
    fan_on_pct:       r2(pct(fan, v => v === 1)),
    brake_pct:        r2(pct(brake, v => v === 1)),
  }
}

export async function parseCSVFile(file: File): Promise<{ session: LogSession; rows: Row[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Row>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result: { data: Row[] }) => {
        const rows = result.data
        if (!rows.length) { reject(new Error('CSV vazio')); return }
        const name = file.name.replace(/\.csv$/i, '').replace(/_/g, ' ')
        const session = extractMetrics(rows, name)
        resolve({ session, rows })
      },
      error: reject,
    })
  })
}

// Baseline historico do Accord — spread from null base for type safety
const B: LogSession = {
  name: '', rows: 0, duration_min: null, date_start: null, date_end: null, sort_ts: null,
  ect_mean: null, ect_max: null, ect_above95_pct: null, ect_above100_pct: null,
  iat_mean: null, iat_max: null, iat_above70_pct: null,
  ltft: null, stft_above15_pct: null, lambda: null, flow_mean: null, inj_dur: null,
  adv_mean: null, adv_neg_pct: null, adv_max: null, ign_limit_mean: null,
  iacv_mean: null, iacv_max: null, knock_events: null, knock_max: null, vtec_pct: null,
  map_mean: null, map_max: null, map_wot: null, clv_mean: null,
  rev_mean: null, rev_max: null, inj_dc_mean: null, inj_fr_mean: null, egr_active_pct: null,
  bat_mean: null, bat_min: null, bat_below12_pct: null, eld_mean: null, alt_fr_mean: null,
  mil_on_pct: null, closed_loop_pct: null,
  vss_max: null, vss_mean: null, stopped_pct: null,
  fuel_flow_mean: null, fuel_flow_max: null, inst_consumption: null, km_estimated: null,
  lng_accel_max: null, lng_accel_min: null, lng_accel_mean: null,
  ac_on_pct: null, fan_on_pct: null, brake_pct: null,
}

export const BASELINE: LogSession[] = [
  { ...B, name: '29 Dez',          sort_ts: 1735430400000, date_start: '2024-12-29', rows: 23417, ect_mean: 85.1, ect_max: 99.5, ect_above95_pct: 16.6, ect_above100_pct: 0,   iat_mean: 55.8, iat_max: 73.8, iat_above70_pct: 7.6,  ltft: 4.81,  stft_above15_pct: 1.1,  lambda: 1.235, flow_mean: 3.79,  inj_dur: 4.10, adv_mean: 28.4, adv_neg_pct: 0.1, iacv_mean: 59.6, knock_events: 0, vtec_pct: 12.0, bat_mean: 13.52, bat_min: 11.80, bat_below12_pct: 7.9,  eld_mean: 62.1, mil_on_pct: 0.1, closed_loop_pct: 0, vss_max: 119, vss_mean: 37.7, stopped_pct: 23.8, fuel_flow_mean: 3.79,  inst_consumption: 6.0  },
  { ...B, name: 'Pre-serv.',        sort_ts: 1741564800000, date_start: '2025-03-07', rows: 23178, ect_mean: 83.0, ect_max: 99.5, ect_above95_pct: 4.5,  ect_above100_pct: 0,   iat_mean: 53.3, iat_max: 72.1, iat_above70_pct: 2.8,  ltft: 2.98,  stft_above15_pct: 0.8,  lambda: 1.228, flow_mean: 8.97,  inj_dur: 4.08, adv_mean: 30.9, adv_neg_pct: 0.1, iacv_mean: 55.0, knock_events: 0, vtec_pct: 9.9,  bat_mean: 13.84, bat_min: 13.10, bat_below12_pct: 1.1,  eld_mean: 58.5, mil_on_pct: 0,   closed_loop_pct: 0, vss_max: 109, vss_mean: 37.3, stopped_pct: 19.8, fuel_flow_mean: 8.97   },
  { ...B, name: 'Pre-troca (pior)', sort_ts: 1772928000000, date_start: '2026-03-05', rows: 100418, ect_mean: 81.9, ect_max: 99.5, ect_above95_pct: 5.4,  ect_above100_pct: 0,   iat_mean: 53.4, iat_max: 74.0, iat_above70_pct: 3.2,  ltft: 5.20,  stft_above15_pct: 16.9, lambda: 1.236, flow_mean: 8.02,  inj_dur: 4.15, adv_mean: 27.2, adv_neg_pct: 0.5, iacv_mean: 59.6, knock_events: 0, vtec_pct: 10.5, bat_mean: 13.52, bat_min: 9.80,  bat_below12_pct: 0.1,  eld_mean: 62.0, mil_on_pct: 0.1, closed_loop_pct: 0, vss_max: 120, vss_mean: 32.0, stopped_pct: 30.0, fuel_flow_mean: 8.02   },
  { ...B, name: 'Pos-radiador',     sort_ts: 1773014400000, date_start: '2026-03-06', rows: 32984, ect_mean: 90.7, ect_max: 99.5, ect_above95_pct: 24.9, ect_above100_pct: 0,   iat_mean: 63.8, iat_max: 74.7, iat_above70_pct: 46.2, ltft: 2.08,  stft_above15_pct: 0.1,  lambda: 1.228, flow_mean: 5.69,  inj_dur: 3.72, adv_mean: 26.5, adv_neg_pct: 0.1, iacv_mean: 42.7, knock_events: 0, vtec_pct: 3.1,  bat_mean: 13.78, bat_min: 13.50, bat_below12_pct: 0,    eld_mean: 53.6, mil_on_pct: 0,   closed_loop_pct: 0, vss_max: 83,  vss_mean: 11.6, stopped_pct: 48.6, fuel_flow_mean: 5.69,  inst_consumption: 4.2  },
  { ...B, name: 'Volta casamento',  sort_ts: 1774310400000, date_start: '2026-03-22', rows: 27383, ect_mean: 89.1, ect_max: 101.1,ect_above95_pct: 22.1, ect_above100_pct: 0.1, iat_mean: 45.0, iat_max: 66.8, iat_above70_pct: 0,    ltft: 3.43,  stft_above15_pct: 2.5,  lambda: 1.236, flow_mean: 13.32, inj_dur: 4.48, adv_mean: 33.5, adv_neg_pct: 0,   iacv_mean: 69.5, knock_events: 0, vtec_pct: 32.6, bat_mean: 13.89, bat_min: 13.60, bat_below12_pct: 0.3,  eld_mean: 64.8, mil_on_pct: 0.1, closed_loop_pct: 0, vss_max: 129, vss_mean: 58.8, stopped_pct: 7.1,  fuel_flow_mean: 13.32  },
  { ...B, name: 'Novo 26/03',       sort_ts: 1774742400000, date_start: '2026-03-26', rows: 29356, ect_mean: 88.4, ect_max: 99.5, ect_above95_pct: 30.6, ect_above100_pct: 0,   iat_mean: 47.9, iat_max: 65.4, iat_above70_pct: 0,    ltft: 2.72,  stft_above15_pct: 0.2,  lambda: 1.219, flow_mean: 6.47,  inj_dur: 3.73, adv_mean: 28.4, adv_neg_pct: 0.1, iacv_mean: 48.2, knock_events: 0, vtec_pct: 6.6,  bat_mean: 13.83, bat_min: 11.84, bat_below12_pct: 0.02, eld_mean: 64.3, mil_on_pct: 0,   closed_loop_pct: 0, vss_max: 71,  vss_mean: 14.8, stopped_pct: 36.4, fuel_flow_mean: 6.47,  inst_consumption: 4.5  },
]
