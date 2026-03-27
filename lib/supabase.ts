import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface LogSession {
  id?: string
  created_at?: string
  name: string
  rows: number
  duration_min: number | null
  // Temperatures
  ect_mean: number | null
  ect_max: number | null
  ect_above95_pct: number | null
  ect_above100_pct: number | null
  iat_mean: number | null
  iat_max: number | null
  iat_above70_pct: number | null
  // Fuel
  ltft: number | null
  stft_above15_pct: number | null
  lambda: number | null
  flow_mean: number | null
  inj_dur: number | null
  // Engine
  adv_mean: number | null
  adv_neg_pct: number | null
  iacv_mean: number | null
  knock_events: number | null
  vtec_pct: number | null
  // Electrical
  bat_mean: number | null
  bat_min: number | null
  bat_below12_pct: number | null
  eld_mean: number | null
  // Status
  mil_on_pct: number | null
  closed_loop_pct: number | null
  vss_max: number | null
  vss_mean: number | null
  stopped_pct: number | null
  // Consumo & distância
  fuel_flow_mean: number | null    // l/h média
  fuel_flow_max: number | null     // l/h máxima
  inst_consumption: number | null  // km/l média (cruzeiro)
  km_estimated: number | null      // km estimados no log
  // Aceleração
  lng_accel_max: number | null     // G máximo positivo
  lng_accel_min: number | null     // G máximo negativo (frenagem)
  lng_accel_mean: number | null    // G médio absoluto
}
