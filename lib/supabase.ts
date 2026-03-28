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
  date_start: string | null
  date_end: string | null
  sort_ts: number | null
  ect_mean: number | null; ect_max: number | null; ect_above95_pct: number | null; ect_above100_pct: number | null
  iat_mean: number | null; iat_max: number | null; iat_above70_pct: number | null
  ltft: number | null; stft_above15_pct: number | null; lambda: number | null
  flow_mean: number | null; inj_dur: number | null
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
  bat_mean: number | null; bat_min: number | null; bat_below12_pct: number | null
  eld_mean: number | null; alt_fr_mean: number | null
  mil_on_pct: number | null; closed_loop_pct: number | null
  vss_max: number | null; vss_mean: number | null; stopped_pct: number | null
  fuel_flow_mean: number | null; fuel_flow_max: number | null
  inst_consumption: number | null; km_estimated: number | null
  lng_accel_max: number | null; lng_accel_min: number | null; lng_accel_mean: number | null
  ac_on_pct: number | null; fan_on_pct: number | null; brake_pct: number | null
  t0_60: number | null; t0_100: number | null; t0_140: number | null; vmax: number | null
  gps_track: [number, number, number][] | null  // [lat, lon, speed_kmh][]
}
