-- Execute isso no SQL Editor do Supabase (https://supabase.com → SQL Editor)

create table if not exists log_sessions (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  name        text not null,
  rows        integer,
  duration_min numeric,

  -- Temperatura
  ect_mean        numeric,
  ect_max         numeric,
  ect_above95_pct numeric,
  ect_above100_pct numeric,
  iat_mean        numeric,
  iat_max         numeric,
  iat_above70_pct numeric,

  -- Combustível
  ltft              numeric,
  stft_above15_pct  numeric,
  lambda            numeric,
  flow_mean         numeric,
  inj_dur           numeric,

  -- Motor
  adv_mean    numeric,
  adv_neg_pct numeric,
  iacv_mean   numeric,
  knock_events integer,
  vtec_pct    numeric,

  -- Elétrico
  bat_mean      numeric,
  bat_min       numeric,
  bat_below12_pct numeric,
  eld_mean      numeric,

  -- Status
  mil_on_pct     numeric,
  closed_loop_pct numeric,
  vss_max        numeric,
  vss_mean       numeric,
  stopped_pct    numeric,
  -- Consumo & distância
  fuel_flow_mean    numeric,
  fuel_flow_max     numeric,
  inst_consumption  numeric,
  km_estimated      numeric,
  -- Aceleração
  lng_accel_max     numeric,
  lng_accel_min     numeric,
  lng_accel_mean    numeric
);

-- Permite leitura pública (sem autenticação)
alter table log_sessions enable row level security;
create policy "Public read" on log_sessions for select using (true);
create policy "Public insert" on log_sessions for insert with check (true);
