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
  lat:     ['GPS Latitude [°]', 'Latitude GPS [°]'],
  lon:     ['GPS Longitude [°]', 'Longitude GPS [°]'],
  fuel_r:  ['Pump Relay - Fuel (R-FL) []', 'Relé da bomba - Combustível (R-FL) []'],
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

// Calculate acceleration time from 0 to target speed in km/h - O(n) single pass
function calcAccelTime(vssArr: number[], timeArr: number[], targetKph: number): number | null {
  const n = Math.min(vssArr.length, timeArr.length)
  if (n < 2) return null
  let bestTime: number | null = null
  let runStart = -1

  for (let i = 0; i < n; i++) {
    const v = vssArr[i]
    if (!isFinite(v)) { runStart = -1; continue }

    if (runStart === -1) {
      // Look for standstill start
      if (v <= 5) runStart = i
    } else {
      // In a run - check if we reached target
      if (v >= targetKph) {
        const dt = (timeArr[i] - timeArr[runStart]) / 1000
        if (dt > 1 && dt < 30 && (bestTime === null || dt < bestTime)) bestTime = dt
        runStart = -1  // reset to find next run
      } else if (v < vssArr[Math.max(0, i-1)] - 5) {
        // Speed dropped significantly - abort run
        runStart = v <= 5 ? i : -1
      }
    }
  }
  return bestTime !== null ? Math.round(bestTime * 100) / 100 : null
}

export function extractMetrics(rows: Row[], name: string): LogSession {
  // Engine-on mask: R-FL (Pump Relay Fuel) = 1 means engine running.
  // Rows where R-FL = 0 are pre/post-start artifacts (frozen sensor values,
  // battery discharge readings, STFT=-100 etc.) that skew health metrics.
  // We NaN-out affected columns for those rows, but keep time/VSS/GPS intact.
  const fuelRelay    = getCol(rows, 'fuel_r')
  const engineOnMask = fuelRelay.length > 0
    ? fuelRelay.map(v => v === 1)
    : rows.map(() => true)  // if column missing, treat all rows as engine-on
  const maskArr = <T extends number>(arr: T[]): number[] =>
    arr.map((v, i) => engineOnMask[i] ? v : NaN)

  const ect    = maskArr(getCol(rows, 'ect'))
  const iat    = maskArr(getCol(rows, 'iat'))
  const ltft   = maskArr(getCol(rows, 'ltft'))
  const stft   = maskArr(getCol(rows, 'stft'))
  const lam    = maskArr(getCol(rows, 'lambda')).map(v => (v > 0 && v < 5) ? v : NaN)
  const adv    = maskArr(getCol(rows, 'adv'))
  const ignLim = maskArr(getCol(rows, 'ign_lim'))
  const iacv   = maskArr(getCol(rows, 'iacv'))
  const flow   = maskArr(getCol(rows, 'flow')).map(v => v > 0 ? v : NaN)
  const inj    = maskArr(getCol(rows, 'inj'))
  const injDc  = maskArr(getCol(rows, 'inj_dc'))
  const injFr  = maskArr(getCol(rows, 'inj_fr'))
  const bat    = maskArr(getCol(rows, 'bat'))
  const altFr  = maskArr(getCol(rows, 'alt_fr'))
  const vtec   = maskArr(getCol(rows, 'vtec'))
  const knock  = maskArr(getCol(rows, 'knock'))
  const mil    = getCol(rows, 'mil')   // MIL uses its own 2-min filter below
  const cl     = maskArr(getCol(rows, 'cl'))
  const vss    = getCol(rows, 'vss')   // VSS unmasked: used for km/accel/GPS
  const eld    = maskArr(getCol(rows, 'eld'))
  const time   = getCol(rows, 'time')  // time unmasked: duration/GPS
  const inst   = maskArr(getCol(rows, 'inst')).map(v => (v > 0 && v < 80) ? v : NaN)
  const lnga   = getCol(rows, 'lnga')  // accel unmasked
  const map    = maskArr(getCol(rows, 'map'))
  const clv    = maskArr(getCol(rows, 'clv'))
  const rev    = maskArr(getCol(rows, 'rev')).map(v => v <= 8500 ? v : NaN)
  const egr    = maskArr(getCol(rows, 'egr'))
  const fan    = maskArr(getCol(rows, 'fan'))
  const ac     = maskArr(getCol(rows, 'ac'))
  const brake  = getCol(rows, 'brake') // brake unmasked

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
    vtec_rpm_mean:    (() => {
      // Average RPM while VTEC solenoid is engaged (S-VT = 1), clamped to sane range
      const revRaw = getCol(rows, 'rev')
      const vtecRaw = getCol(rows, 'vtec')
      const n = Math.min(revRaw.length, vtecRaw.length)
      const vals: number[] = []
      for (let i = 0; i < n; i++) {
        if (vtecRaw[i] === 1 && isFinite(revRaw[i]) && revRaw[i] > 0 && revRaw[i] <= 8500)
          vals.push(revRaw[i])
      }
      if (!vals.length) return null
      return r2(vals.reduce((a, b) => a + b, 0) / vals.length)
    })(),
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
    // Performance — calculated from raw VSS data
    t0_60:            calcAccelTime(vss, time, 60),
    t0_100:           calcAccelTime(vss, time, 100),
    t0_140:           calcAccelTime(vss, time, 140),
    vmax:             r2(max(vss)),
    gps_track:        (() => {
      const rawLat = getCol(rows, 'lat')
      const rawLon = getCol(rows, 'lon')
      if (!rawLat.length || !rawLon.length) return null
      // Use raw (unfiltered) columns so row indices stay aligned
      const rawVss = getCol(rows, 'vss')
      const rawEct = getCol(rows, 'ect')
      const rawRev = getCol(rows, 'rev')  // raw, before RPM sanity filter
      const step = Math.max(1, Math.floor(rows.length / 300))
      const track: [number, number, number, number, number][] = []
      const n = Math.min(rawLat.length, rawLon.length, rawVss.length, rawEct.length, rawRev.length)
      for (let i = 0; i < n; i += step) {
        const la = rawLat[i], lo = rawLon[i]
        if (!isFinite(la) || !isFinite(lo) || Math.abs(la) < 0.001 || Math.abs(lo) < 0.001) continue
        const sp  = isFinite(rawVss[i]) ? rawVss[i] : 0
        const tmp = isFinite(rawEct[i]) ? rawEct[i] : 0
        // Clamp RPM to sane range for color display (don't use sensor noise)
        const rpm = isFinite(rawRev[i]) && rawRev[i] <= 8500 ? rawRev[i] : 0
        track.push([la, lo, sp, tmp, rpm])
      }
      return track.length > 5 ? track : null
    })(),
  }
}

export async function parseCSVFile(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ session: LogSession; rows: Row[] }> {
  // Estimate row count from file size (avg ~200 bytes/row for OBD logs)
  const estRows = Math.max(1, Math.round(file.size / 200))
  let rowCount = 0

  return new Promise((resolve, reject) => {
    const rows: Row[] = []
    Papa.parse<Row>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      step: (result: { data: Row }) => {
        rows.push(result.data)
        rowCount++
        if (onProgress) {
          // Use estimate for progress, cap at 95% until complete
          const pct = Math.min(95, Math.round((rowCount / estRows) * 100))
          onProgress(pct)
        }
      },
      complete: () => {
        if (!rows.length) { reject(new Error('CSV vazio')); return }
        const name = file.name.replace(/\.csv$/i, '').replace(/_/g, ' ')
        const session = extractMetrics(rows, name)
        if (onProgress) onProgress(100)
        resolve({ session, rows })
      },
      error: reject,
    })
  })
}

// Baseline historico do Accord — spread from null base for type safety
