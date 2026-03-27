import Papa from 'papaparse'
import type { LogSession } from './supabase'

// Column name aliases (EN + PT)
const COL: Record<string, string[]> = {
  time:   ['Time [ms]', 'Tempo [ms]'],
  ect:    ['Engine Coolant Temperature (ECT) [°C]', 'Temperatura do líquido de arrefecimento do motor (ECT) [°C]'],
  iat:    ['Intake Air Temperature (IAT) [°C]', 'Temperatura do ar de admissão (IAT) [°C]'],
  ltft:   ['Long Term - Fuel Trim - Oxygen Sensor (FTLT-O2S) [%]', 'Longo Prazo - Guarnição de combustível - Sensor de oxigênio (FTLT-O2S) [%]'],
  stft:   ['Short Term - Fuel Trim - Oxygen Sensor (FTST-O2S) [%]', 'Curto Prazo - Guarnição de combustível - Sensor de oxigênio (FTST-O2S) [%]'],
  lambda: ['Lambda - Oxygen Sensor (λ-O2S) []', 'Lambda - Sensor de oxigênio (λ-O2S) []', 'Lambda - Sensor de oxigênio (»-O2S) []'],
  adv:    ['Ignition Advance - Ignition (ADV-IGN) [°]', 'Avanço da ignição - Ignição (ADV-IGN) [°]'],
  iacv:   ['Duty Cycle - Idle Air Control Valve (DC-IACV) [%]', 'Ciclo de trabalho - Válvula de controle de ar de marcha lenta (DC-IACV) [%]'],
  flow:   ['Flow - Fuel (FLW-FL) [l/h]', 'Fluxo - Combustível (FLW-FL) [l/h]'],
  inj:    ['Duration - Injection (DUR-INJ) [ms]', 'Duração - Injeção (DUR-INJ) [ms]'],
  bat:    ['Battery (BAT) [V]', 'Voltagem da bateria (BAT) [V]'],
  vtec:   ['Solenoid Valve - VTEC (S-VT) []', 'Válvula solenóide - VTEC (S-VT) []'],
  knock:  ['Knock (KS) [V]'],
  mil:    ['Malfunction Indicator Lamp (MIL) []', 'Luz indicadora de mal funcionamento (MIL) []'],
  cl:     ['Feedback Loop Status - Oxygen Sensor (FLS-O2S) []', 'Status do loop de feedback do HO2S - Sensor de oxigênio (FLS-O2S) []'],
  vss:    ['Vehicle Speed (VSS) [kph]', 'Velocidade do veículo (VSS) [kph]'],
  eld:    ['Current - Electrical Load Detector (ELD) [A]', 'Corrente - Detector de carga elétrica (ELD) [A]'],
  inst:   ['Instantaneous Fuel Consumption - Fuel (INST-FL) [km/l]', 'Consumo instantâneo de combustível - Combustível (INST-FL) [km/l]'],
  lnga:   ['Longitudinal Acceleration - Vehicle Speed (LNGA-VSS) [G]', 'Aceleração longitudinal - Velocidade do veículo (LNGA-VSS) [G]'],
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

export function extractMetrics(rows: Row[], name: string): LogSession {
  const ect   = getCol(rows, 'ect')
  const iat   = getCol(rows, 'iat')
  const ltft  = getCol(rows, 'ltft')
  const stft  = getCol(rows, 'stft')
  const lam   = getCol(rows, 'lambda').map(v => (v > 0 && v < 5) ? v : NaN)
  const adv   = getCol(rows, 'adv')
  const iacv  = getCol(rows, 'iacv')
  const flow  = getCol(rows, 'flow').map(v => v > 0 ? v : NaN)
  const inj   = getCol(rows, 'inj')
  const bat   = getCol(rows, 'bat')
  const vtec  = getCol(rows, 'vtec')
  const knock = getCol(rows, 'knock')
  const mil   = getCol(rows, 'mil')
  const cl    = getCol(rows, 'cl')
  const vss   = getCol(rows, 'vss')
  const eld   = getCol(rows, 'eld')
  const time  = getCol(rows, 'time')
  const inst  = getCol(rows, 'inst').map(v => (v > 0 && v < 80) ? v : NaN)
  const lnga  = getCol(rows, 'lnga')

  const durationMin = time.length > 1
    ? (time[time.length - 1] - time[0]) / 60000
    : null

  // Km estimados: integrar velocidade × tempo
  let kmEst = 0
  const vssArr = getCol(rows, 'vss')
  const timeArr = getCol(rows, 'time')
  for (let i = 1; i < Math.min(vssArr.length, timeArr.length); i++) {
    const dt = (timeArr[i] - timeArr[i-1]) / 3600000  // horas
    const v  = (vssArr[i] + vssArr[i-1]) / 2           // kph média
    if (isFinite(dt) && isFinite(v) && dt > 0 && dt < 0.01) {
      kmEst += v * dt
    }
  }

  return {
    name,
    rows: rows.length,
    duration_min: r2(durationMin),
    ect_mean: r2(avg(ect)),
    ect_max: r2(max(ect)),
    ect_above95_pct: r2(pct(ect, v => v > 95)),
    ect_above100_pct: r2(pct(ect, v => v > 100)),
    iat_mean: r2(avg(iat)),
    iat_max: r2(max(iat)),
    iat_above70_pct: r2(pct(iat, v => v > 70)),
    ltft: r2(avg(ltft)),
    stft_above15_pct: r2(pct(stft, v => v > 15)),
    lambda: r2(avg(lam)),
    flow_mean: r2(avg(flow)),
    inj_dur: r2(avg(inj)),
    adv_mean: r2(avg(adv)),
    adv_neg_pct: r2(pct(adv, v => v < 0)),
    iacv_mean: r2(avg(iacv)),
    knock_events: clean(knock).filter(v => v > 0.1).length,
    vtec_pct: r2(pct(vtec, v => v === 1)),
    bat_mean: r2(avg(bat)),
    bat_min: r2(min(bat)),
    bat_below12_pct: r2(pct(bat, v => v < 12)),
    eld_mean: r2(avg(eld)),
    mil_on_pct: r2(pct(mil, v => v === 1)),
    closed_loop_pct: r2(pct(cl, v => v === 8 || v === 1)),
    vss_max: r2(max(vss)),
    vss_mean: r2(avg(vss)),
    stopped_pct: r2(pct(vss, v => v === 0)),
    // Consumo & distância
    fuel_flow_mean: r2(avg(flow)),
    fuel_flow_max: r2(max(flow)),
    inst_consumption: r2(avg(inst)),
    km_estimated: r2(kmEst > 0 ? kmEst : null),
    // Aceleração
    lng_accel_max: r2(max(lnga)),
    lng_accel_min: r2(min(lnga)),
    lng_accel_mean: r2(avg(clean(lnga).map(v => Math.abs(v)))),
  }
}

export async function parseCSVFile(file: File): Promise<{ session: LogSession; rows: Row[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Row>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
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

// Baseline histórico do seu Accord
export const BASELINE: LogSession[] = [
  { name: '29 Dez', rows: 23417, duration_min: null, ect_mean: 85.1, ect_max: 99.5, ect_above95_pct: 16.6, ect_above100_pct: 0, iat_mean: 55.8, iat_max: 73.8, iat_above70_pct: 7.6, ltft: 4.81, stft_above15_pct: 1.1, lambda: 1.235, flow_mean: 3.79, inj_dur: 4.10, adv_mean: 28.4, adv_neg_pct: 0.1, iacv_mean: 59.6, knock_events: 0, vtec_pct: 12.0, bat_mean: 13.52, bat_min: 11.8, bat_below12_pct: 7.9, eld_mean: 62.1, mil_on_pct: 0.1, closed_loop_pct: 0, vss_max: 119, vss_mean: 37.7, stopped_pct: 23.8, fuel_flow_mean: 3.79, fuel_flow_max: null, inst_consumption: 6.0, km_estimated: null, lng_accel_max: null, lng_accel_min: null, lng_accel_mean: null },
  { name: 'Fita (pré-serv.)', rows: 23178, duration_min: null, ect_mean: 83.0, ect_max: 99.5, ect_above95_pct: 4.5, ect_above100_pct: 0, iat_mean: 53.3, iat_max: 72.1, iat_above70_pct: 2.8, ltft: 2.98, stft_above15_pct: 0.8, lambda: 1.228, flow_mean: 8.97, inj_dur: 4.08, adv_mean: 30.9, adv_neg_pct: 0.1, iacv_mean: 55.0, knock_events: 0, vtec_pct: 9.9, bat_mean: 13.84, bat_min: 13.1, bat_below12_pct: 1.1, eld_mean: 58.5, mil_on_pct: 0, closed_loop_pct: 0, vss_max: 109, vss_mean: 37.3, stopped_pct: 19.8, fuel_flow_mean: 8.97, fuel_flow_max: null, inst_consumption: null, km_estimated: null, lng_accel_max: null, lng_accel_min: null, lng_accel_mean: null },
  { name: 'Pré-troca (pior)', rows: 100418, duration_min: null, ect_mean: 81.9, ect_max: 99.5, ect_above95_pct: 5.4, ect_above100_pct: 0, iat_mean: 53.4, iat_max: 74.0, iat_above70_pct: 3.2, ltft: 5.20, stft_above15_pct: 16.9, lambda: 1.236, flow_mean: 8.02, inj_dur: 4.15, adv_mean: 27.2, adv_neg_pct: 0.5, iacv_mean: 59.6, knock_events: 0, vtec_pct: 10.5, bat_mean: 13.52, bat_min: 9.8, bat_below12_pct: 0.1, eld_mean: 62.0, mil_on_pct: 0.1, closed_loop_pct: 0, vss_max: 120, vss_mean: 32.0, stopped_pct: 30.0, fuel_flow_mean: 8.02, fuel_flow_max: null, inst_consumption: null, km_estimated: null, lng_accel_max: null, lng_accel_min: null, lng_accel_mean: null },
  { name: 'Pós-radiador', rows: 32984, duration_min: null, ect_mean: 90.7, ect_max: 99.5, ect_above95_pct: 24.9, ect_above100_pct: 0, iat_mean: 63.8, iat_max: 74.7, iat_above70_pct: 46.2, ltft: 2.08, stft_above15_pct: 0.1, lambda: 1.228, flow_mean: 5.69, inj_dur: 3.72, adv_mean: 26.5, adv_neg_pct: 0.1, iacv_mean: 42.7, knock_events: 0, vtec_pct: 3.1, bat_mean: 13.78, bat_min: 13.5, bat_below12_pct: 0, eld_mean: 53.6, mil_on_pct: 0, closed_loop_pct: 0, vss_max: 83, vss_mean: 11.6, stopped_pct: 48.6, fuel_flow_mean: 5.69, fuel_flow_max: null, inst_consumption: 4.2, km_estimated: null, lng_accel_max: null, lng_accel_min: null, lng_accel_mean: null },
  { name: 'Volta casamento', rows: 27383, duration_min: null, ect_mean: 89.1, ect_max: 101.1, ect_above95_pct: 22.1, ect_above100_pct: 0.1, iat_mean: 45.0, iat_max: 66.8, iat_above70_pct: 0, ltft: 3.43, stft_above15_pct: 2.5, lambda: 1.236, flow_mean: 13.32, inj_dur: 4.48, adv_mean: 33.5, adv_neg_pct: 0, iacv_mean: 69.5, knock_events: 0, vtec_pct: 32.6, bat_mean: 13.89, bat_min: 13.6, bat_below12_pct: 0.3, eld_mean: 64.8, mil_on_pct: 0.1, closed_loop_pct: 0, vss_max: 129, vss_mean: 58.8, stopped_pct: 7.1, fuel_flow_mean: 13.32, fuel_flow_max: null, inst_consumption: null, km_estimated: null, lng_accel_max: null, lng_accel_min: null, lng_accel_mean: null },
  { name: 'Novo 26/03', rows: 29356, duration_min: null, ect_mean: 88.4, ect_max: 99.5, ect_above95_pct: 30.6, ect_above100_pct: 0, iat_mean: 47.9, iat_max: 65.4, iat_above70_pct: 0, ltft: 2.72, stft_above15_pct: 0.2, lambda: 1.219, flow_mean: 6.47, inj_dur: 3.73, adv_mean: 28.4, adv_neg_pct: 0.1, iacv_mean: 48.2, knock_events: 0, vtec_pct: 6.6, bat_mean: 13.83, bat_min: 11.84, bat_below12_pct: 0.02, eld_mean: 64.3, mil_on_pct: 0, closed_loop_pct: 0, vss_max: 71, vss_mean: 14.8, stopped_pct: 36.4, fuel_flow_mean: 6.47, fuel_flow_max: null, inst_consumption: 4.5, km_estimated: null, lng_accel_max: null, lng_accel_min: null, lng_accel_mean: null },
]
