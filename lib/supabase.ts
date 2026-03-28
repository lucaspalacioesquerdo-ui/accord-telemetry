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
  // Date range from timestamps
  date_start: string | null   // ISO date string "2026-03-22"
  date_end: string | null     // ISO date string - same as start if single day
  sort_ts: number | null      // Unix ms of first row, for sorting
  // Temperatures
  ect_mean: number | null; ect_max: number | null; ect_above95_pct: number | null; ect_above100_pct: number | null
  iat_mean: number | null; iat_max: number | null; iat_above70_pct: number | null
  // Fuel trim
  ltft: number | null; stft_above15_pct: number | null; lambda: number | null
  flow_mean: number | null; inj_dur: number | null
  // Engine
  adv_mean: number | null; adv_neg_pct: number | null; adv_max: number | null
  ign_limit_mean: number | null
  iacv_mean: number | null; iacv_max: number | null
  knock_events: number | null; knock_max: number | null
  vtec_pct: number | null
  map_mean: number | null; map_max: number | null; map_wot: number | null
  clv_mean: number | null
  rev_mean: number | null; rev_max: number | null
  inj_dc_mean: number | null; inj_fr_mean: number | null
  egr_active_pct: number | null
  // Electrical
  bat_mean: number | null; bat_min: number | null; bat_below12_pct: number | null
  eld_mean: number | null; alt_fr_mean: number | null
  // Status
  mil_on_pct: number | null; closed_loop_pct: number | null
  vss_max: number | null; vss_mean: number | null; stopped_pct: number | null
  // Consumption & distance
  fuel_flow_mean: number | null; fuel_flow_max: number | null
  inst_consumption: number | null; km_estimated: number | null
  // Acceleration
  lng_accel_max: number | null; lng_accel_min: number | null; lng_accel_mean: number | null
  // Two-state counts (% time active)
  ac_on_pct: number | null; fan_on_pct: number | null; brake_pct: number | null
  // Performance
  t0_60: number | null    // 0-60 km/h time in seconds
  t0_100: number | null   // 0-100 km/h time in seconds
  t0_140: number | null   // 0-140 km/h time in seconds
  vmax: number | null     // max speed km/h (already have vss_max but alias for clarity)
}
