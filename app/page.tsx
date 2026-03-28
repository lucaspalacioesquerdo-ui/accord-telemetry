'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import TimelineChart from '@/components/TimelineChart'
import { parseCSVFile, BASELINE } from '@/lib/parser'
import { generateAlerts } from '@/lib/alerts'
import type { LogSession } from '@/lib/supabase'

// ---- Types ------------------------------------------------------------------
type Lang    = 'en' | 'pt'
type Tab     = 'overview' | 'timeline' | 'table' | 'score' | 'compat'
type SecKey  = 'elec' | 'fuel' | 'air' | 'afr' | 'ign' | 'temp' | 'idle' | 'motion' | 'act' | 'diag'

// ---- Palette (HondaSH) ------------------------------------------------------
const C = {
  cyan:'#00cfff', teal:'#00b4a0', green:'#00e060', lime:'#80e000',
  yellow:'#ffe000', orange:'#ff9000', red:'#ff3030', pink:'#ff60a0',
  purple:'#c060ff', blue:'#4080ff', indigo:'#6060ff', gray:'#8090a0',
}

// ---- i18n -------------------------------------------------------------------
const T: Record<Lang, Record<string,string>> = {
  en:{
    overview:'Overview', timeline:'Timeline', table:'Table', sessions:'Sessions',
    imported:'imported', filter:'Filter', select_all:'All', clear_sel:'Clear',
    all_logs:'All logs', sections:'Sections', collapse:'Collapse', expand:'Expand',
    upload_drag:'Drag CSV or click to import',
    upload_sub:'HondsH OBD1 - EN or PT - Multiple files',
    car_profile:'Car Profile', select_car:'Select car profile',
    no_car:'No car selected', change:'Change',
    sec_elec:'Electrical & Charging', sec_fuel:'Fuel & Injection',
    sec_air:'Air / Intake / Load', sec_afr:'Mixture & Correction (AFR)',
    sec_ign:'Ignition', sec_temp:'Temperature & Cooling',
    sec_idle:'Idle Control', sec_motion:'Motion & Dynamics',
    sec_act:'Actuators & Emissions', sec_diag:'Diagnosis',
    bat:'Battery', alt_fr:'Alternator FR', eld_curr:'ELD Current',
    fuel_flow:'Fuel Flow', fuel_inst:'Consumption',
    inj_dur:'Inj. Duration', inj_dc:'Inj. Duty Cycle', inj_fr:'Inj. Flow Rate',
    map_psi:'MAP', map_wot:'MAP WOT', baro:'BARO', iat:'IAT', tps:'TPS',
    clv:'Calc. Load', iab:'IAB Valve',
    o2s:'O2S Voltage', ltft:'LTFT', stft:'STFT >+15%', afr:'Air Fuel Ratio',
    lambda:'Lambda', afr_cmd:'AFR Command', fls:'Closed Loop', hc:'O2 Heater',
    ign_adv:'Ign. Advance', ign_lim:'Ign. Limit', knock:'Knock',
    ect:'ECT', ect_hot:'ECT >95C', ect_volt:'ECT Voltage', fan:'Radiator Fan',
    iacv_dc:'IACV DC', iacv_curr:'IACV Current', idle_cmd:'Idle Command',
    rev:'Engine RPM', vss:'Vehicle Speed', vss_cal:'Speed (Cal.)',
    gps:'GPS Speed', lng_accel:'Long. Accel',
    gear:'Gear', at_mnt:'A/T Mounts', at_ppn:'A/T Gear Pos.',
    egr_volt:'EGR Voltage', egr_cmd:'EGR Command', egr_pos:'EGR Position',
    pcs:'EVAP PCS', pcs_pos:'PCS Position',
    vtec_il:'VTEC Lamp', vtec_psw:'VTEC Press.SW', vtec_sv:'VTEC Solenoid', vtec_sf:'VTEC Feedback',
    brake:'Brake SW', starter:'Starter SW', ac_relay:'A/C Relay', ac_sw:'A/C SW', pspsw:'P/S Oil Press.',
    mil:'Check Engine', scs:'Service Check', lat_comm:'Comm. Latency',
    km_est:'Est. Distance', vtec:'VTEC', egr:'EGR Active',
    active_str:'ACTIVE', noFaults:'No active faults',
    ch_ltft:'LTFT Long Term', ch_stft:'STFT Extreme Correction',
    ch_lambda:'Lambda (O2)', ch_iacv:'IACV Idle Control',
    ch_ect:'ECT Coolant Temp', ch_iat:'IAT Intake Air',
    ch_bat:'Battery Min', ch_vtec:'VTEC Active',
    ch_adv:'Ignition Advance', ch_knock:'Knock Events',
    ch_map:'MAP Manifold Pressure', ch_clv:'Calc. Load Value',
    ch_rev:'Engine RPM max', ch_inj:'Injection Duration',
    ch_inj_dc:'Injector Duty Cycle', ch_egr:'EGR Active',
    ch_flow:'Fuel Flow l/h', ch_consump:'Consumption km/l',
    ch_km:'Est. Distance', ch_vmax:'Max Speed', ch_eld:'ELD Current',
    th_session:'Session', th_km:'Km', th_ect_avg:'ECT avg', th_ect_max:'ECT max',
    th_iat:'IAT', th_ltft:'LTFT', th_stft:'STFT%', th_lambda:'Lambda',
    th_iacv:'IACV', th_map_wot:'MAP wot', th_adv:'Adv', th_knock:'Knock',
    th_inj:'Inj ms', th_lh:'l/h', th_kml:'km/l', th_vtec:'VTEC%',
    th_bat:'Bat V', th_mil:'MIL',
    charts_visible:'charts visible', no_charts:'No charts selected.',
  },
  pt:{
    overview:'Visao Geral', timeline:'Linha do Tempo', table:'Tabela', sessions:'Sessoes',
    imported:'importado(s)', filter:'Filtrar', select_all:'Todos', clear_sel:'Limpar',
    all_logs:'Todos os logs', sections:'Secoes', collapse:'Recolher', expand:'Expandir',
    upload_drag:'Arrastar CSV ou clicar para importar',
    upload_sub:'HondsH OBD1 - EN ou PT - Multiplos arquivos',
    car_profile:'Perfil do Carro', select_car:'Selecionar perfil do carro',
    no_car:'Nenhum carro selecionado', change:'Trocar',
    sec_elec:'Eletrica / Carregamento', sec_fuel:'Combustivel / Injecao',
    sec_air:'Ar / Admissao / Carga', sec_afr:'Mistura e Correcao (AFR)',
    sec_ign:'Ignicao', sec_temp:'Temperatura e Arrefecimento',
    sec_idle:'Marcha Lenta / Controle de Ar', sec_motion:'Movimento / Dinamica',
    sec_act:'Atuadores e Emissoes', sec_diag:'Diagnostico',
    bat:'Bateria', alt_fr:'Alternador FR', eld_curr:'ELD Corrente',
    fuel_flow:'Fluxo Comb.', fuel_inst:'Consumo',
    inj_dur:'Dur. Injecao', inj_dc:'DC Injecao', inj_fr:'Fluxo Injetor',
    map_psi:'MAP', map_wot:'MAP WOT', baro:'BARO', iat:'IAT', tps:'TPS',
    clv:'Carga Calc.', iab:'Valv. IAB',
    o2s:'O2S Tensao', ltft:'LTFT', stft:'STFT >+15%', afr:'Relacao A/F',
    lambda:'Lambda', afr_cmd:'Cmd AFR', fls:'Malha Fechada', hc:'Aquec. O2',
    ign_adv:'Avanco Ign.', ign_lim:'Limite Ign.', knock:'Knock',
    ect:'ECT', ect_hot:'ECT >95C', ect_volt:'ECT Tensao', fan:'Ventoinha',
    iacv_dc:'IACV DC', iacv_curr:'IACV Corrente', idle_cmd:'Cmd Marcha Lenta',
    rev:'Rotacao Motor', vss:'Velocidade', vss_cal:'Veloc. (Cal.)',
    gps:'Veloc. GPS', lng_accel:'Acel. Long.',
    gear:'Marcha', at_mnt:'A/T Montagens', at_ppn:'A/T Posicao',
    egr_volt:'EGR Tensao', egr_cmd:'EGR Comando', egr_pos:'EGR Posicao',
    pcs:'EVAP PCS', pcs_pos:'PCS Posicao',
    vtec_il:'VTEC Lampada', vtec_psw:'VTEC Press.SW', vtec_sv:'VTEC Solenoide', vtec_sf:'VTEC Feedback',
    brake:'Interr. Freio', starter:'Interr. Partida', ac_relay:'Rele A/C', ac_sw:'Interr. A/C', pspsw:'Press. Oleo Dir.',
    mil:'Check Engine', scs:'Verif. Servico', lat_comm:'Latencia Comm.',
    km_est:'Dist. Estimada', vtec:'VTEC', egr:'EGR Ativo',
    active_str:'ATIVO', noFaults:'Sem falhas ativas',
    ch_ltft:'LTFT Trim Longo', ch_stft:'STFT Correcao Extrema',
    ch_lambda:'Lambda (Sonda O2)', ch_iacv:'IACV Marcha Lenta',
    ch_ect:'ECT Temperatura Motor', ch_iat:'IAT Temperatura Admissao',
    ch_bat:'Bateria Minima', ch_vtec:'VTEC Ativo',
    ch_adv:'Avanco Ignicao', ch_knock:'Eventos Knock',
    ch_map:'MAP Pressao Coletor', ch_clv:'Valor Calculado Carga',
    ch_rev:'Rotacao Maxima', ch_inj:'Duracao Injecao',
    ch_inj_dc:'Duty Cycle Injetor', ch_egr:'EGR Ativo',
    ch_flow:'Fluxo Combustivel l/h', ch_consump:'Consumo km/l',
    ch_km:'Distancia Est.', ch_vmax:'Velocidade Maxima', ch_eld:'Corrente ELD',
    th_session:'Sessao', th_km:'Km', th_ect_avg:'ECT med', th_ect_max:'ECT max',
    th_iat:'IAT', th_ltft:'LTFT', th_stft:'STFT%', th_lambda:'Lambda',
    th_iacv:'IACV', th_map_wot:'MAP wot', th_adv:'Avanco', th_knock:'Knock',
    th_inj:'Inj ms', th_lh:'l/h', th_kml:'km/l', th_vtec:'VTEC%',
    th_bat:'Bat V', th_mil:'MIL',
    charts_visible:'graficos visiveis', no_charts:'Nenhum grafico selecionado.',
  },
}

// ---- Section + param definitions -------------------------------------------
type ParamDef = { id: string; labelKey: string; color: string; getValue: (s: LogSession) => string | number | null; unit?: string; subFn?: (s: LogSession) => string }

const SECTIONS: { key: SecKey; color: string; params: ParamDef[] }[] = [
  { key:'elec', color: C.green, params: [
    { id:'bat',      labelKey:'bat',      color:C.green,  unit:'V',      getValue:s=>s.bat_mean,      subFn:s=>`min ${s.bat_min?.toFixed(2)}V` },
    { id:'alt_fr',   labelKey:'alt_fr',   color:C.yellow, unit:'%',      getValue:s=>s.alt_fr_mean },
    { id:'eld_curr', labelKey:'eld_curr', color:C.cyan,   unit:'A',      getValue:s=>s.eld_mean },
  ]},
  { key:'fuel', color: C.orange, params: [
    { id:'fuel_flow', labelKey:'fuel_flow', color:C.orange, unit:'l/h',    getValue:s=>s.fuel_flow_mean },
    { id:'fuel_inst', labelKey:'fuel_inst', color:C.lime,   unit:'km/l',   getValue:s=>s.inst_consumption },
    { id:'inj_dur',   labelKey:'inj_dur',   color:C.pink,   unit:'ms',     getValue:s=>s.inj_dur,      subFn:s=>`DC: ${s.inj_dc_mean?.toFixed(1)}%` },
    { id:'inj_dc',    labelKey:'inj_dc',    color:C.purple, unit:'%',      getValue:s=>s.inj_dc_mean },
    { id:'inj_fr',    labelKey:'inj_fr',    color:C.pink,   unit:'cc/min', getValue:s=>s.inj_fr_mean },
  ]},
  { key:'air', color: C.cyan, params: [
    { id:'map_psi',  labelKey:'map_psi',  color:C.cyan,   unit:'PSI',   getValue:s=>s.map_mean,     subFn:s=>`WOT: ${s.map_wot?.toFixed(1)} PSI` },
    { id:'map_wot',  labelKey:'map_wot',  color:C.teal,   unit:'PSI',   getValue:s=>s.map_wot },
    { id:'iat',      labelKey:'iat',      color:C.yellow, unit:'C',     getValue:s=>s.iat_mean,     subFn:s=>`max ${s.iat_max?.toFixed(1)}C` },
    { id:'tps',      labelKey:'tps',      color:C.lime,   unit:'%',     getValue:s=>s.clv_mean },
    { id:'clv',      labelKey:'clv',      color:C.gray,   unit:'%',     getValue:s=>s.clv_mean },
  ]},
  { key:'afr', color: C.green, params: [
    { id:'ltft',     labelKey:'ltft',     color:C.orange, unit:'%',     getValue:s=>s.ltft,          subFn:_=>'ideal: +-1.5%' },
    { id:'stft',     labelKey:'stft',     color:C.red,    unit:'%',     getValue:s=>s.stft_above15_pct },
    { id:'lambda',   labelKey:'lambda',   color:C.green,               getValue:s=>s.lambda,        subFn:_=>'ideal: ~1.000' },
    { id:'fls',      labelKey:'fls',      color:C.blue,   unit:'%',     getValue:s=>s.closed_loop_pct, subFn:_=>'closed loop' },
    { id:'iacv_dc',  labelKey:'iacv_dc',  color:C.cyan,   unit:'%',     getValue:s=>s.iacv_mean,    subFn:_=>'expected: 30-38%' },
  ]},
  { key:'ign', color: C.purple, params: [
    { id:'ign_adv',  labelKey:'ign_adv',  color:C.purple, unit:'deg',   getValue:s=>s.adv_mean,     subFn:s=>`max ${s.adv_max?.toFixed(1)}deg` },
    { id:'ign_lim',  labelKey:'ign_lim',  color:C.indigo, unit:'deg',   getValue:s=>s.ign_limit_mean },
    { id:'knock',    labelKey:'knock',    color:C.red,                  getValue:s=>s.knock_events, subFn:s=>`max ${s.knock_max?.toFixed(3)}V` },
  ]},
  { key:'temp', color: C.red, params: [
    { id:'ect',      labelKey:'ect',      color:C.red,    unit:'C',     getValue:s=>s.ect_mean,     subFn:s=>`max ${s.ect_max?.toFixed(1)}C` },
    { id:'ect_hot',  labelKey:'ect_hot',  color:C.orange, unit:'%',     getValue:s=>s.ect_above95_pct },
    { id:'fan',      labelKey:'fan',      color:C.cyan,   unit:'%',     getValue:s=>s.fan_on_pct },
  ]},
  { key:'idle', color: C.teal, params: [
    { id:'iacv_dc2', labelKey:'iacv_dc',  color:C.teal,   unit:'%',     getValue:s=>s.iacv_mean,    subFn:_=>'expected: 30-38%' },
    { id:'rev',      labelKey:'rev',      color:C.pink,   unit:'rpm',   getValue:s=>s.rev_mean,     subFn:s=>`max ${s.rev_max?.toFixed(0)} rpm` },
  ]},
  { key:'motion', color: C.blue, params: [
    { id:'vss',      labelKey:'vss',      color:C.blue,   unit:'km/h',  getValue:s=>s.vss_mean,     subFn:s=>`max ${s.vss_max?.toFixed(0)} km/h` },
    { id:'lng_accel',labelKey:'lng_accel',color:C.cyan,   unit:'G',     getValue:s=>s.lng_accel_max,subFn:s=>`brake ${s.lng_accel_min?.toFixed(3)}G` },
    { id:'km_est',   labelKey:'km_est',   color:C.teal,   unit:'km',    getValue:s=>s.km_estimated },
    { id:'vtec',     labelKey:'vtec',     color:C.purple, unit:'%',     getValue:s=>s.vtec_pct },
  ]},
  { key:'act', color: C.gray, params: [
    { id:'egr',      labelKey:'egr',      color:C.gray,   unit:'%',     getValue:s=>s.egr_active_pct },
    { id:'mil',      labelKey:'mil',      color:C.red,                  getValue:s=>s.mil_on_pct ? 'ON' : 'OFF' },
  ]},
  { key:'diag', color: C.red, params: [] }, // rendered specially
]

// ---- Chart definitions -------------------------------------------------------
type ChartDef = {
  id: string; group: string; titleKey: string; unit?: string
  yMin?: number; yMax?: number
  refLine?: { value: number; label: string; color: string }
  datasets: { label: string; field: keyof LogSession; color: string }[]
}

const CHART_DEFS: ChartDef[] = [
  { id:'bat',     group:'elec',   titleKey:'ch_bat',     unit:'V',   yMin:9,yMax:15, refLine:{value:12,label:'12V',color:'rgba(255,48,48,0.5)'}, datasets:[{label:'BAT',field:'bat_min',color:C.green}] },
  { id:'eld',     group:'elec',   titleKey:'ch_eld',     unit:'A',   datasets:[{label:'ELD',field:'eld_mean',color:C.yellow}] },
  { id:'flow',    group:'fuel',   titleKey:'ch_flow',    unit:'l/h', yMin:0, datasets:[{label:'Flow',field:'fuel_flow_mean',color:C.orange}] },
  { id:'consump', group:'fuel',   titleKey:'ch_consump', unit:'km/l',yMin:0, datasets:[{label:'Consump',field:'inst_consumption',color:C.lime}] },
  { id:'inj',     group:'fuel',   titleKey:'ch_inj',     unit:'ms',  yMin:2, datasets:[{label:'Inj Dur',field:'inj_dur',color:C.pink}] },
  { id:'inj_dc',  group:'fuel',   titleKey:'ch_inj_dc',  unit:'%',   datasets:[{label:'Inj DC',field:'inj_dc_mean',color:C.purple}] },
  { id:'map',     group:'air',    titleKey:'ch_map',     unit:'PSI', datasets:[{label:'MAP',field:'map_mean',color:C.cyan}] },
  { id:'clv',     group:'air',    titleKey:'ch_clv',     unit:'%',   datasets:[{label:'CLV',field:'clv_mean',color:C.gray}] },
  { id:'ltft',    group:'afr',    titleKey:'ch_ltft',    unit:'%',   yMin:0, refLine:{value:1.5,label:'ideal',color:'rgba(0,224,96,0.5)'}, datasets:[{label:'LTFT',field:'ltft',color:C.orange}] },
  { id:'stft',    group:'afr',    titleKey:'ch_stft',    unit:'%',   yMin:0, datasets:[{label:'STFT',field:'stft_above15_pct',color:C.red}] },
  { id:'lambda',  group:'afr',    titleKey:'ch_lambda',  yMin:0.9,yMax:1.4, refLine:{value:1.0,label:'stoich',color:'rgba(0,224,96,0.5)'}, datasets:[{label:'Lambda',field:'lambda',color:C.green}] },
  { id:'iacv',    group:'afr',    titleKey:'ch_iacv',    unit:'%',   yMin:0,yMax:90, refLine:{value:38,label:'max ok',color:'rgba(0,207,255,0.45)'}, datasets:[{label:'IACV',field:'iacv_mean',color:C.cyan}] },
  { id:'adv',     group:'ign',    titleKey:'ch_adv',     unit:'deg', datasets:[{label:'Adv',field:'adv_mean',color:C.purple}] },
  { id:'knock',   group:'ign',    titleKey:'ch_knock',   datasets:[{label:'Knock',field:'knock_events',color:C.red}] },
  { id:'ect',     group:'temp',   titleKey:'ch_ect',     unit:'C',   yMin:60, refLine:{value:100,label:'100C',color:'rgba(255,48,48,0.5)'}, datasets:[{label:'ECT max',field:'ect_max',color:C.red},{label:'ECT avg',field:'ect_mean',color:C.orange}] },
  { id:'iat',     group:'temp',   titleKey:'ch_iat',     unit:'C',   yMin:20, datasets:[{label:'IAT',field:'iat_mean',color:C.yellow}] },
  { id:'rev',     group:'motion', titleKey:'ch_rev',     unit:'rpm', datasets:[{label:'RPM',field:'rev_max',color:C.pink}] },
  { id:'vmax',    group:'motion', titleKey:'ch_vmax',    unit:'km/h',yMin:0, datasets:[{label:'Speed',field:'vss_max',color:C.blue}] },
  { id:'km',      group:'motion', titleKey:'ch_km',      unit:'km',  yMin:0, datasets:[{label:'Distance',field:'km_estimated',color:C.teal}] },
  { id:'vtec',    group:'motion', titleKey:'ch_vtec',    unit:'%',   yMin:0, datasets:[{label:'VTEC',field:'vtec_pct',color:C.purple}] },
  { id:'egr',     group:'act',    titleKey:'ch_egr',     unit:'%',   datasets:[{label:'EGR',field:'egr_active_pct',color:C.gray}] },
]

const CHART_GROUPS: Record<string,string> = {
  elec:'Electrical', fuel:'Fuel & Injection', air:'Air / Intake',
  afr:'Mixture & AFR', ign:'Ignition', temp:'Temperature',
  motion:'Motion & Dynamics', act:'Actuators',
}


// ---- Car catalog (year / trim / engine) ------------------------------------
type TrimDef = { trim: string; engine: string; hp: number; notes: string }
type YearDef = { year: number; trims: TrimDef[] }
type CarDef  = { model: string; years: YearDef[] }

const CAR_CATALOG: CarDef[] = [
  { model: 'Honda Accord', years: [
    { year: 1992, trims: [
      { trim: 'DX', engine: 'F22A1', hp: 125, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F22A1', hp: 125, notes: 'SOHC non-VTEC' },
      { trim: 'EX', engine: 'F22A6', hp: 140, notes: 'SOHC non-VTEC, IAB' },
      { trim: 'SE', engine: 'F22A6', hp: 140, notes: 'SOHC non-VTEC, IAB' },
    ]},
    { year: 1993, trims: [
      { trim: 'DX', engine: 'F22A1', hp: 125, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F22A1', hp: 125, notes: 'SOHC non-VTEC' },
      { trim: 'EX', engine: 'F22A6', hp: 140, notes: 'SOHC non-VTEC, IAB' },
      { trim: 'SE', engine: 'F22A6', hp: 140, notes: 'SOHC non-VTEC, IAB' },
    ]},
    { year: 1994, trims: [
      { trim: 'DX', engine: 'F22B2', hp: 130, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F22B2', hp: 130, notes: 'SOHC non-VTEC' },
      { trim: 'EX', engine: 'F22B1', hp: 145, notes: 'SOHC VTEC - your engine' },
      { trim: 'EX-L', engine: 'F22B1', hp: 145, notes: 'SOHC VTEC, leather' },
    ]},
    { year: 1995, trims: [
      { trim: 'DX', engine: 'F22B2', hp: 130, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F22B2', hp: 130, notes: 'SOHC non-VTEC' },
      { trim: 'EX', engine: 'F22B1', hp: 145, notes: 'SOHC VTEC - your engine' },
      { trim: 'EX-L', engine: 'F22B1', hp: 145, notes: 'SOHC VTEC, leather' },
    ]},
    { year: 1996, trims: [
      { trim: 'DX', engine: 'F22B2', hp: 130, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F22B2', hp: 130, notes: 'SOHC non-VTEC' },
      { trim: 'EX', engine: 'F22B1', hp: 145, notes: 'SOHC VTEC' },
      { trim: 'EX-L', engine: 'F22B1', hp: 145, notes: 'SOHC VTEC, leather' },
    ]},
    { year: 1997, trims: [
      { trim: 'DX', engine: 'F22B2', hp: 130, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F22B2', hp: 130, notes: 'SOHC non-VTEC' },
      { trim: 'EX', engine: 'F22B1', hp: 145, notes: 'SOHC VTEC' },
      { trim: 'V6 LX', engine: 'C27A4', hp: 170, notes: '2.7L V6 SOHC' },
      { trim: 'V6 EX', engine: 'C27A4', hp: 170, notes: '2.7L V6 SOHC' },
    ]},
    { year: 1998, trims: [
      { trim: 'DX', engine: 'F23A5', hp: 135, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'EX', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'EX (ULEV)', engine: 'F23A4', hp: 148, notes: 'SOHC VTEC ULEV' },
      { trim: 'V6 LX', engine: 'J30A1', hp: 200, notes: '3.0L V6 VTEC' },
      { trim: 'V6 EX', engine: 'J30A1', hp: 200, notes: '3.0L V6 VTEC' },
    ]},
    { year: 1999, trims: [
      { trim: 'DX', engine: 'F23A5', hp: 135, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'EX', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'EX (ULEV)', engine: 'F23A4', hp: 148, notes: 'SOHC VTEC ULEV' },
      { trim: 'V6 LX', engine: 'J30A1', hp: 200, notes: '3.0L V6 VTEC' },
      { trim: 'V6 EX', engine: 'J30A1', hp: 200, notes: '3.0L V6 VTEC' },
    ]},
    { year: 2000, trims: [
      { trim: 'DX', engine: 'F23A5', hp: 135, notes: 'SOHC non-VTEC' },
      { trim: 'LX', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'EX', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'EX (ULEV)', engine: 'F23A4', hp: 148, notes: 'SOHC VTEC ULEV' },
      { trim: 'SE', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'V6 LX', engine: 'J30A1', hp: 200, notes: '3.0L V6 VTEC' },
      { trim: 'V6 EX', engine: 'J30A1', hp: 200, notes: '3.0L V6 VTEC' },
    ]},
    { year: 2001, trims: [
      { trim: 'LX', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'EX', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'EX (ULEV)', engine: 'F23A4', hp: 148, notes: 'SOHC VTEC ULEV' },
      { trim: 'SE', engine: 'F23A1', hp: 150, notes: 'SOHC VTEC LEV' },
      { trim: 'V6 EX', engine: 'J30A1', hp: 200, notes: '3.0L V6 VTEC' },
    ]},
  ]},
  { model: 'Honda Civic', years: [
    { year: 1992, trims: [{ trim: 'CX', engine: 'D15B8', hp: 70, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D15B7', hp: 102, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Z6', hp: 125, notes: 'SOHC VTEC' }, { trim: 'Si', engine: 'D16Z6', hp: 125, notes: 'SOHC VTEC' }, { trim: 'VX', engine: 'D15Z1', hp: 92, notes: 'SOHC VTEC-E' }]},
    { year: 1993, trims: [{ trim: 'CX', engine: 'D15B8', hp: 70, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D15B7', hp: 102, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Z6', hp: 125, notes: 'SOHC VTEC' }, { trim: 'Si', engine: 'D16Z6', hp: 125, notes: 'SOHC VTEC' }, { trim: 'VX', engine: 'D15Z1', hp: 92, notes: 'SOHC VTEC-E' }]},
    { year: 1994, trims: [{ trim: 'CX', engine: 'D15B8', hp: 70, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D15B7', hp: 102, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Z6', hp: 125, notes: 'SOHC VTEC' }, { trim: 'Si', engine: 'D16Z6', hp: 125, notes: 'SOHC VTEC' }, { trim: 'VX', engine: 'D15Z1', hp: 92, notes: 'SOHC VTEC-E' }]},
    { year: 1995, trims: [{ trim: 'CX', engine: 'D15B8', hp: 70, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D15B7', hp: 102, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Z6', hp: 125, notes: 'SOHC VTEC' }, { trim: 'Si', engine: 'D16Z6', hp: 125, notes: 'SOHC VTEC' }, { trim: 'VX', engine: 'D15Z1', hp: 92, notes: 'SOHC VTEC-E' }]},
    { year: 1996, trims: [{ trim: 'CX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Y8', hp: 127, notes: 'SOHC VTEC' }, { trim: 'HX', engine: 'D16Y5', hp: 115, notes: 'SOHC VTEC-E' }, { trim: 'LX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }]},
    { year: 1997, trims: [{ trim: 'CX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Y8', hp: 127, notes: 'SOHC VTEC' }, { trim: 'HX', engine: 'D16Y5', hp: 115, notes: 'SOHC VTEC-E' }, { trim: 'LX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }]},
    { year: 1998, trims: [{ trim: 'CX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Y8', hp: 127, notes: 'SOHC VTEC' }, { trim: 'HX', engine: 'D16Y5', hp: 115, notes: 'SOHC VTEC-E' }, { trim: 'LX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }]},
    { year: 1999, trims: [{ trim: 'CX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Y8', hp: 127, notes: 'SOHC VTEC' }, { trim: 'Si', engine: 'B16A2', hp: 160, notes: 'DOHC VTEC' }, { trim: 'LX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }]},
    { year: 2000, trims: [{ trim: 'CX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'DX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }, { trim: 'EX', engine: 'D16Y8', hp: 127, notes: 'SOHC VTEC' }, { trim: 'Si', engine: 'B16A2', hp: 160, notes: 'DOHC VTEC' }, { trim: 'LX', engine: 'D16Y7', hp: 106, notes: 'SOHC non-VTEC' }]},
  ]},
  { model: 'Honda Prelude', years: [
    { year: 1992, trims: [{ trim: 'S', engine: 'F22A1', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Si', engine: 'F22A1', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Si VTEC', engine: 'H22A', hp: 190, notes: 'DOHC VTEC JDM' }]},
    { year: 1993, trims: [{ trim: 'S', engine: 'F22A1', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Si', engine: 'F22A1', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'VTEC', engine: 'H22A1', hp: 190, notes: 'DOHC VTEC' }]},
    { year: 1994, trims: [{ trim: 'S', engine: 'F22A1', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Si', engine: 'F22A1', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'VTEC', engine: 'H22A1', hp: 190, notes: 'DOHC VTEC' }]},
    { year: 1995, trims: [{ trim: 'S', engine: 'F22A1', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Si', engine: 'H23A1', hp: 160, notes: 'DOHC non-VTEC' }, { trim: 'VTEC', engine: 'H22A1', hp: 190, notes: 'DOHC VTEC' }]},
    { year: 1996, trims: [{ trim: 'S', engine: 'F22A1', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Si', engine: 'H23A1', hp: 160, notes: 'DOHC non-VTEC' }, { trim: 'VTEC', engine: 'H22A1', hp: 190, notes: 'DOHC VTEC' }]},
    { year: 1997, trims: [{ trim: 'Base', engine: 'F22A2', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Type SH', engine: 'H22A4', hp: 195, notes: 'DOHC VTEC ATTS' }]},
    { year: 1998, trims: [{ trim: 'Base', engine: 'F22A2', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Type SH', engine: 'H22A4', hp: 195, notes: 'DOHC VTEC ATTS' }]},
    { year: 1999, trims: [{ trim: 'Base', engine: 'F22A2', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Type SH', engine: 'H22A4', hp: 195, notes: 'DOHC VTEC ATTS' }]},
    { year: 2000, trims: [{ trim: 'Base', engine: 'F22A2', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Type SH', engine: 'H22A4', hp: 195, notes: 'DOHC VTEC ATTS' }]},
    { year: 2001, trims: [{ trim: 'Base', engine: 'F22A2', hp: 135, notes: 'SOHC non-VTEC' }, { trim: 'Type SH', engine: 'H22A4', hp: 195, notes: 'DOHC VTEC ATTS' }]},
  ]},
  { model: 'Honda Integra / Acura Integra', years: [
    { year: 1992, trims: [{ trim: 'RS', engine: 'B18A1', hp: 140, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18A1', hp: 140, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18A1', hp: 140, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B17A1', hp: 160, notes: 'DOHC VTEC' }]},
    { year: 1993, trims: [{ trim: 'RS', engine: 'B18A1', hp: 140, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18A1', hp: 140, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18A1', hp: 140, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B17A1', hp: 160, notes: 'DOHC VTEC' }]},
    { year: 1994, trims: [{ trim: 'RS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B18C1', hp: 170, notes: 'DOHC VTEC' }]},
    { year: 1995, trims: [{ trim: 'RS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B18C1', hp: 170, notes: 'DOHC VTEC' }]},
    { year: 1996, trims: [{ trim: 'RS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B18C1', hp: 170, notes: 'DOHC VTEC' }]},
    { year: 1997, trims: [{ trim: 'RS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B18C1', hp: 170, notes: 'DOHC VTEC' }, { trim: 'Type R', engine: 'B18C5', hp: 195, notes: 'DOHC VTEC High-comp' }]},
    { year: 1998, trims: [{ trim: 'RS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B18C1', hp: 170, notes: 'DOHC VTEC' }, { trim: 'Type R', engine: 'B18C5', hp: 195, notes: 'DOHC VTEC High-comp' }]},
    { year: 1999, trims: [{ trim: 'RS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B18C1', hp: 170, notes: 'DOHC VTEC' }, { trim: 'Type R', engine: 'B18C5', hp: 195, notes: 'DOHC VTEC High-comp' }]},
    { year: 2000, trims: [{ trim: 'RS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B18C1', hp: 170, notes: 'DOHC VTEC' }, { trim: 'Type R', engine: 'B18C5', hp: 195, notes: 'DOHC VTEC High-comp' }]},
    { year: 2001, trims: [{ trim: 'RS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'LS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS', engine: 'B18B1', hp: 142, notes: 'DOHC non-VTEC' }, { trim: 'GS-R', engine: 'B18C1', hp: 170, notes: 'DOHC VTEC' }, { trim: 'Type R', engine: 'B18C5', hp: 195, notes: 'DOHC VTEC High-comp' }]},
  ]},
  { model: 'Honda CR-V', years: [
    { year: 1997, trims: [{ trim: 'Base', engine: 'B20B', hp: 126, notes: 'DOHC non-VTEC' }]},
    { year: 1998, trims: [{ trim: 'LX', engine: 'B20B', hp: 126, notes: 'DOHC non-VTEC' }, { trim: 'EX', engine: 'B20Z2', hp: 146, notes: 'DOHC non-VTEC higher comp' }]},
    { year: 1999, trims: [{ trim: 'LX', engine: 'B20B', hp: 126, notes: 'DOHC non-VTEC' }, { trim: 'EX', engine: 'B20Z2', hp: 146, notes: 'DOHC non-VTEC higher comp' }]},
    { year: 2000, trims: [{ trim: 'LX', engine: 'B20B', hp: 126, notes: 'DOHC non-VTEC' }, { trim: 'EX', engine: 'B20Z2', hp: 146, notes: 'DOHC non-VTEC higher comp' }]},
    { year: 2001, trims: [{ trim: 'LX', engine: 'B20B', hp: 126, notes: 'DOHC non-VTEC' }, { trim: 'EX', engine: 'B20Z2', hp: 146, notes: 'DOHC non-VTEC higher comp' }]},
  ]},
  { model: 'Acura NSX', years: [
    { year: 1991, trims: [{ trim: 'Base', engine: 'C30A', hp: 270, notes: 'DOHC VTEC V6 3.0L' }]},
    { year: 1995, trims: [{ trim: 'Base', engine: 'C30A', hp: 270, notes: 'DOHC VTEC V6 3.0L' }, { trim: 'T', engine: 'C30A', hp: 270, notes: 'Targa roof' }]},
    { year: 1997, trims: [{ trim: 'Base', engine: 'C32B', hp: 290, notes: 'DOHC VTEC V6 3.2L' }, { trim: 'T', engine: 'C32B', hp: 290, notes: 'Targa roof' }]},
    { year: 2001, trims: [{ trim: 'Base', engine: 'C32B', hp: 290, notes: 'DOHC VTEC V6 3.2L' }]},
  ]},
]

type ProfileKey = string // "model|year|trim"

// ---- Compatible vehicles ----------------------------------------------------
const COMPAT = [
  { model:'Honda Civic / CRX / Del Sol', years:'1992-2000', engines:'D15B, D16Z6, D16Y7/8, B16A, B16A2' },
  { model:'Honda Civic Type R', years:'1997-2001', engines:'B16B 185ps DOHC VTEC' },
  { model:'Honda Accord', years:'1992-2001', engines:'F22A, F22B1, F22B2, F23A, H23A' },
  { model:'Honda Prelude', years:'1992-2001', engines:'F22A, F22B, H22A, H23A' },
  { model:'Honda Integra / Acura Integra', years:'1992-2001', engines:'B17A1, B18A1, B18B1, B18C, B18C1, B18C5' },
  { model:'Honda CR-V', years:'1997-2001', engines:'B20B, B20Z2' },
  { model:'Honda HR-V', years:'1999-2001', engines:'D13B, D16W' },
  { model:'Honda Odyssey (JDM)', years:'1994-1999', engines:'F22B, F23A' },
  { model:'Honda Stepwgn', years:'1996-2001', engines:'B20B' },
  { model:'Honda Orthia / Partner', years:'1996-2002', engines:'B20B, D16A' },
  { model:'Honda Domani / Integra SJ', years:'1996-2001', engines:'D15B, D16A' },
  { model:'Acura NSX', years:'1991-2001', engines:'C30A, C32B 3.0/3.2L V6' },
  { model:'Acura Legend / Honda Legend', years:'1991-1995', engines:'C32A 3.2L V6' },
  { model:'Acura Vigor / Honda Ascot', years:'1992-1994', engines:'G25A 2.5L inline-5' },
  { model:'Honda Logo / Capa', years:'1996-2001', engines:'D13B' },
  { model:'Honda S-MX', years:'1996-2001', engines:'B20B' },
  { model:'Honda Stream (early JDM)', years:'2000-2001', engines:'D17A, K20A' },
  { model:'Honda Acty / Beat', years:'1992-1999', engines:'E07A (Kei car)' },
]

// ---- Helpers ----------------------------------------------------------------
function fmt(n: number | null | undefined, d = 1): string {
  return n != null && isFinite(n) ? n.toFixed(d) : '--'
}

function pillCls(v: number | null, g: number, w: number): string {
  if (v == null) return 'pn'
  if (v <= g) return 'pg'
  if (v <= w) return 'py'
  return 'pr'
}

function calcHealth(m: LogSession): number {
  let s = 100
  const stft = m.stft_above15_pct ?? 0
  if (stft > 15) s -= 20; else if (stft > 5) s -= 10; else if (stft > 2) s -= 4

  const la = Math.abs(m.ltft ?? 0)
  if (la > 6) s -= 15; else if (la > 4) s -= 10; else if (la > 2.5) s -= 5

  const ld = Math.abs((m.lambda ?? 1) - 1)
  if (ld > 0.25) s -= 15; else if (ld > 0.15) s -= 10; else if (ld > 0.05) s -= 4

  if ((m.ect_above100_pct ?? 0) > 0) s -= 15
  else if ((m.ect_above95_pct ?? 0) > 30) s -= 10
  else if ((m.ect_above95_pct ?? 0) > 15) s -= 5

  const iv = m.iacv_mean ?? 35
  if (iv > 65) s -= 10; else if (iv > 50) s -= 6; else if (iv > 42) s -= 3

  const k = m.knock_events ?? 0
  if (k > 10) s -= 15; else if (k > 3) s -= 8; else if (k > 0) s -= 4

  if ((m.mil_on_pct ?? 0) > 0) s -= 5
  if ((m.bat_below12_pct ?? 0) > 5) s -= 5; else if ((m.bat_below12_pct ?? 0) > 1) s -= 2

  return Math.max(0, Math.min(100, Math.round(s)))
}

function scoreCol(s: number): string {
  return s >= 80 ? C.green : s >= 55 ? C.yellow : C.red
}

// ---- Sub-components ---------------------------------------------------------
function Kpi({ label, value, unit, sub, color }: {
  label: string; value: string | number | null; unit?: string; sub?: string; color?: string
}) {
  const vc = color ?? '#94a3b8'
  return (
    <div style={{ background:'#1a1f2e', border:'1px solid #2a3040', borderRadius:8, padding:'12px 14px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:vc }} />
      <div style={{ fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase' as const, color:'#64748b', fontFamily:'IBM Plex Mono,monospace', fontWeight:600, marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:22, fontWeight:700, lineHeight:1, color:vc }}>
        {value ?? '--'}{unit && <span style={{ fontSize:11, color:'#64748b', marginLeft:2 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace', marginTop:6 }}>{sub}</div>}
    </div>
  )
}

function SecHead({ title, color, open, onToggle }: { title:string; color:string; open:boolean; onToggle:()=>void }) {
  return (
    <button onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:10, marginTop:24, marginBottom: open ? 14 : 4, width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
      <div style={{ width:3, height:16, background:color, borderRadius:2 }} />
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' as const, color:'#94a3b8', fontFamily:'IBM Plex Mono,monospace', flex:1 }}>{title}</span>
      <div style={{ flex:1, height:1, background:'#1e2740', maxWidth:200 }} />
      <span style={{ fontSize:11, color:'#475569', fontFamily:'IBM Plex Mono,monospace', marginRight:4 }}>{open ? 'v' : '>'}</span>
    </button>
  )
}

// ---- Main -------------------------------------------------------------------
export default function Home() {
  // Core state
  const [dbSessions, setDbSessions]       = useState<LogSession[]>([])
  const [localSessions, setLocalSessions] = useState<LogSession[]>([])
  const [uploading, setUploading]         = useState(false)
  const [activeIdx, setActiveIdx]         = useState<number | null>(null)
  const [tab, setTab]                     = useState<Tab>('overview')
  const [lang, setLang]                   = useState<Lang>('en')

  // Section collapse (per section key)
  const [collapsedSecs, setCollapsedSecs] = useState<Set<SecKey>>(new Set())

  // Overview parameter filter (by param id)
  const allParamIds = SECTIONS.flatMap(s => s.params.map(p => p.id))
  const [visibleParams, setVisibleParams] = useState<Set<string>>(new Set(allParamIds))
  const [paramFilterOpen, setParamFilterOpen] = useState(false)

  // Timeline chart filter
  const [visibleCharts, setVisibleCharts]     = useState<Set<string>>(new Set(CHART_DEFS.map(c => c.id)))
  const [chartFilterOpen, setChartFilterOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Car profile: model + year + trim selection, per-profile session storage
  const [carModalOpen, setCarModalOpen]     = useState(false)
  const [carModalStep, setCarModalStep]     = useState<'model' | 'year' | 'trim'>('model')
  const [selectedModel, setSelectedModel]   = useState<string | null>(null)
  const [selectedYear, setSelectedYear]     = useState<number | null>(null)
  const [selectedTrim, setSelectedTrim]     = useState<string | null>(null)
  // profileKey = "model|year|trim" - used to scope sessions per car
  const [activeProfile, setActiveProfile]   = useState<ProfileKey | null>(null)
  // perProfile sessions: { [profileKey]: LogSession[] }
  const [profileSessions, setProfileSessions] = useState<Record<string, LogSession[]>>({})
  const carModalRef                           = useRef<HTMLDivElement>(null)

  // Derive selected car display name
  const selectedCarDef = activeProfile ? (() => {
    const [m, y, tr] = activeProfile.split('|')
    const modelDef = CAR_CATALOG.find(c => c.model === m)
    const yearDef  = modelDef?.years.find(y2 => y2.year === parseInt(y))
    const trimDef  = yearDef?.trims.find(t => t.trim === tr)
    return trimDef ? { model: m, year: parseInt(y), trim: tr, engine: trimDef.engine, hp: trimDef.hp, notes: trimDef.notes } : null
  })() : null

  const t = (k: string): string => T[lang][k] ?? k

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.sessions) setDbSessions(d.sessions)
    }).catch(() => {})
  }, [])

  // Close car modal on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (carModalRef.current && !carModalRef.current.contains(e.target as Node)) {
        setCarModalOpen(false)
      }
    }
    if (carModalOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [carModalOpen])

  // Sessions scoped to active profile (or global if no profile)
  const profileLocalSessions = activeProfile ? (profileSessions[activeProfile] ?? []) : localSessions
  const allSessions: LogSession[] = (() => {
    const map = new Map<string, LogSession>()
    if (!activeProfile) BASELINE.forEach(s => map.set(s.name, s))
    dbSessions.filter(s => !activeProfile || (s as any).profile === activeProfile).forEach(s => map.set(s.name, s))
    profileLocalSessions.forEach(s => map.set(s.name, s))
    return Array.from(map.values())
  })()

  const active    = activeIdx != null ? (allSessions[activeIdx] ?? allSessions[allSessions.length - 1]) : allSessions[allSessions.length - 1]
  const alerts    = active ? generateAlerts(active, lang) : []
  const tlLabels  = allSessions.map(s => s.name)
  const isNew     = (s: LogSession) => dbSessions.some(d => d.name === s.name) || profileLocalSessions.some(l => l.name === s.name)
  const hs        = active ? calcHealth(active) : null
  const hsColor   = hs != null ? scoreCol(hs) : '#475569'

  const handleFiles = useCallback(async (files: File[]) => {
    setUploading(true)
    const added: LogSession[] = []
    for (const file of files) {
      try {
        const { session } = await parseCSVFile(file)
        added.push(session)
        try {
          const res = await fetch('/api/sessions', {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(session),
          })
          if (res.ok) {
            const { session: saved } = await res.json()
            setDbSessions(prev => {
              const i = prev.findIndex(s => s.name === saved.name)
              if (i >= 0) { const n = [...prev]; n[i] = saved; return n }
              return [...prev, saved]
            })
          }
        } catch { /* local only */ }
      } catch (e) { console.error(e) }
    }
    if (activeProfile) {
      setProfileSessions(prev => {
        const existing = prev[activeProfile] ?? []
        const m = new Map(existing.map(s => [s.name, s]))
        added.forEach(s => m.set(s.name, s))
        return { ...prev, [activeProfile]: Array.from(m.values()) }
      })
    } else {
      setLocalSessions(prev => {
        const m = new Map(prev.map(s => [s.name, s]))
        added.forEach(s => m.set(s.name, s))
        return Array.from(m.values())
      })
    }
    setActiveIdx(allSessions.length + added.length - 1)
    setUploading(false)
  }, [allSessions.length])

  // Toggle helpers
  const toggleSec     = (k: SecKey)  => setCollapsedSecs(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n })
  const toggleParam   = (id: string) => setVisibleParams(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleChart   = (id: string) => setVisibleCharts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleGroup   = (g: string)  => setCollapsedGroups(p => { const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n })

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

  const AC: Record<string,string> = { bad:C.red, warn:C.orange, good:C.green, info:C.blue }
  const showSidebar = tab === 'overview'

  // ---- Render ---------------------------------------------------------------
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#0f1117', fontFamily:"'IBM Plex Sans',sans-serif", color:'#e2e8f0' }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:52, background:'#111827', borderBottom:'1px solid #1e2740', flexShrink:0, position:'relative', zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
            <span style={{ fontSize:15, fontWeight:800, letterSpacing:3, color:'#f97316', fontFamily:'IBM Plex Mono,monospace' }}>HNDSH</span>
            <span style={{ fontSize:12, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>.meters</span>
          </div>
          <div style={{ width:1, height:18, background:'#1e2740' }} />

          {/* Car profile button */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => { setCarModalOpen(o => !o); setCarModalStep('model') }}
              style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, padding:'4px 12px', border:'1px solid', borderColor: carModalOpen ? '#f97316' : '#1e2740', borderRadius:6, background: carModalOpen ? '#2a1a0a' : '#161c2a', color: activeProfile ? '#f97316' : '#64748b', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600, letterSpacing:1 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              {selectedCarDef ? `${selectedCarDef.year} ${selectedCarDef.model.split('/')[0].trim()} ${selectedCarDef.trim}` : t('no_car')}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {carModalOpen && (
              <div ref={carModalRef} style={{ position:'absolute', top:'calc(100% + 8px)', left:0, width:460, background:'#111827', border:'1px solid #1e2740', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', zIndex:100, overflow:'hidden' }}>
                {/* Modal header */}
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e2740', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', gap:8 }}>
                    {(['model','year','trim'] as const).map((step, i) => (
                      <button key={step} onClick={() => { if(i === 0 || (i === 1 && selectedModel) || (i === 2 && selectedModel && selectedYear)) setCarModalStep(step) }}
                        style={{ fontSize:10, padding:'2px 8px', borderRadius:4, border:'1px solid', borderColor: carModalStep === step ? '#f97316' : '#1e2740', background: carModalStep === step ? '#2a1a0a' : 'transparent', color: carModalStep === step ? '#f97316' : '#475569', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>
                        {step === 'model' ? 'Model' : step === 'year' ? (selectedYear ? `${selectedYear}` : 'Year') : (selectedTrim ? selectedTrim : 'Trim')}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {activeProfile && <button onClick={() => { setActiveProfile(null); setSelectedModel(null); setSelectedYear(null); setSelectedTrim(null); setActiveIdx(null); setCarModalOpen(false) }} style={{ fontSize:9, color:'#475569', background:'none', border:'1px solid #1e2740', borderRadius:3, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', padding:'2px 7px' }}>Clear profile</button>}
                    <button onClick={() => setCarModalOpen(false)} style={{ fontSize:14, color:'#475569', background:'none', border:'none', cursor:'pointer', lineHeight:1 }}>x</button>
                  </div>
                </div>

                {/* Step 1: Model */}
                {carModalStep === 'model' && (
                  <div style={{ maxHeight:300, overflowY:'auto' }}>
                    {CAR_CATALOG.map((car) => (
                      <div key={car.model} onClick={() => { setSelectedModel(car.model); setSelectedYear(null); setSelectedTrim(null); setCarModalStep('year') }}
                        style={{ padding:'10px 16px', borderBottom:'1px solid #161c2a', cursor:'pointer', background: selectedModel === car.model ? '#1a2035' : 'transparent' }}>
                        <div style={{ fontSize:12, fontWeight:600, color: selectedModel === car.model ? '#f97316' : '#e2e8f0' }}>{car.model}</div>
                        <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{car.years[0].year} - {car.years[car.years.length-1].year}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Step 2: Year */}
                {carModalStep === 'year' && selectedModel && (
                  <div style={{ maxHeight:300, overflowY:'auto' }}>
                    {(CAR_CATALOG.find(c => c.model === selectedModel)?.years ?? []).map((yd) => (
                      <div key={yd.year} onClick={() => { setSelectedYear(yd.year); setSelectedTrim(null); setCarModalStep('trim') }}
                        style={{ padding:'10px 16px', borderBottom:'1px solid #161c2a', cursor:'pointer', background: selectedYear === yd.year ? '#1a2035' : 'transparent', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:13, fontWeight:700, color: selectedYear === yd.year ? '#f97316' : '#e2e8f0', fontFamily:'IBM Plex Mono,monospace' }}>{yd.year}</span>
                        <span style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{yd.trims.length} trims</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Step 3: Trim */}
                {carModalStep === 'trim' && selectedModel && selectedYear && (
                  <div style={{ maxHeight:300, overflowY:'auto' }}>
                    {(CAR_CATALOG.find(c => c.model === selectedModel)?.years.find(y => y.year === selectedYear)?.trims ?? []).map((td) => {
                      const key = `${selectedModel}|${selectedYear}|${td.trim}`
                      const isSelected = activeProfile === key
                      return (
                        <div key={td.trim} onClick={() => { setSelectedTrim(td.trim); setActiveProfile(key); setActiveIdx(null); setCarModalOpen(false) }}
                          style={{ padding:'12px 16px', borderBottom:'1px solid #161c2a', cursor:'pointer', background: isSelected ? '#1a2035' : 'transparent' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                            <span style={{ fontSize:13, fontWeight:700, color: isSelected ? '#f97316' : '#e2e8f0' }}>{td.trim}</span>
                            <span style={{ fontSize:12, fontFamily:'IBM Plex Mono,monospace', color: isSelected ? '#f97316' : C.cyan, fontWeight:700 }}>{td.engine}</span>
                          </div>
                          <div style={{ display:'flex', gap:12 }}>
                            <span style={{ fontSize:10, color:'#64748b', fontFamily:'IBM Plex Mono,monospace' }}>{td.hp} hp</span>
                            <span style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{td.notes}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ padding:'8px 16px', borderTop:'1px solid #1e2740' }}>
                  <p style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono,monospace' }}>Logs are scoped per profile. Switching profiles resets the log view.</p>
                </div>
              </div>
            )}
          </div>

          {allSessions.length > BASELINE.length && (
            <span style={{ fontSize:11, padding:'3px 10px', border:'1px solid #14532d', borderRadius:5, color:C.green, background:'#052e16', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>
              {allSessions.length - BASELINE.length} {t('imported')}
            </span>
          )}
        </div>

        {/* Tabs + lang */}
        <div style={{ display:'flex', alignItems:'center', height:52 }}>
          {(['overview','timeline','table','score','compat'] as Tab[]).map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{ padding:'0 16px', height:52, border:'none', borderBottom: tab===tb ? '2px solid #f97316' : '2px solid transparent', background:'transparent', color: tab===tb ? '#f97316' : '#64748b', fontSize:11, letterSpacing:2, textTransform:'uppercase', cursor:'pointer', fontWeight: tab===tb ? 700 : 400, fontFamily:'IBM Plex Mono,monospace' }}>
              {tb === 'score' ? 'Score' : tb === 'compat' ? 'Compat' : t(tb)}
            </button>
          ))}
          <div style={{ marginLeft:12, display:'flex', gap:6, paddingLeft:12, borderLeft:'1px solid #1e2740' }}>
            {(['en','pt'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ background: lang===l ? '#1e3a5f' : 'transparent', border:'1px solid', borderColor: lang===l ? '#3b82f6' : '#1e2740', borderRadius:4, cursor:'pointer', color: lang===l ? '#60a5fa' : '#475569', fontSize:10, fontFamily:'IBM Plex Mono,monospace', fontWeight:700, padding:'3px 8px' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* SIDEBAR - only on overview */}
        {showSidebar && (
          <div style={{ width:200, flexShrink:0, background:'#111827', borderRight:'1px solid #1e2740', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Big health score circle */}
            {hs != null && (
              <button onClick={() => setTab('score')} style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%', padding:'16px 14px 12px', background:'none', border:'none', cursor:'pointer', gap:4, borderBottom:'1px solid #1e2740' }}>
                <div style={{ width:72, height:72, borderRadius:'50%', border:`3px solid ${hsColor}`, display:'flex', alignItems:'center', justifyContent:'center', background:`${hsColor}12` }}>
                  <span style={{ fontSize:28, fontWeight:900, color:hsColor, fontFamily:'IBM Plex Mono,monospace', lineHeight:1 }}>{hs}</span>
                </div>
                <span style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono,monospace', letterSpacing:1.5, textTransform:'uppercase' }}>health score</span>
              </button>
            )}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:'1px solid #1e2740' }}>
              <span style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>{t('sessions')}</span>
              {allSessions.length > 0 && (
                <button
                  onClick={() => { if(activeProfile) { setProfileSessions(p => ({ ...p, [activeProfile]: [] })) } else { setLocalSessions([]); setDbSessions([]) }; setActiveIdx(null) }}
                  style={{ fontSize:9, color:'#475569', background:'none', border:'1px solid #1e2740', borderRadius:3, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', padding:'2px 6px' }}>
                  Clear
                </button>
              )}
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {allSessions.map((s, i) => {
                const isActive  = active?.name === s.name
                const dot       = s.ltft != null ? (s.ltft <= 2.5 ? C.green : s.ltft <= 4 ? C.yellow : C.red) : '#334155'
                const dateStr   = getDate(s)
                const sc        = calcHealth(s)
                const scCol     = scoreCol(sc)
                return (
                  <div key={s.name} onClick={() => setActiveIdx(i)} style={{ padding:'10px 14px', borderBottom:'1px solid #161c2a', cursor:'pointer', position:'relative', background: isActive ? '#1a2035' : 'transparent' }}>
                    {isActive && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:'#f97316' }} />}
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }} />
                      <span style={{ fontSize:11, fontWeight:700, color: isActive ? '#f97316' : (dateStr ? '#e2e8f0' : '#94a3b8'), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, fontFamily:'IBM Plex Mono,monospace' }}>
                        {dateStr ?? s.name}
                      </span>
                      {/* Health score circle */}
                      <button
                        onClick={e => { e.stopPropagation(); setActiveIdx(i); setTab('score') }}
                        title="Health Score"
                        style={{ width:24, height:24, borderRadius:'50%', border:`2px solid ${scCol}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:0 }}
                      >
                        <span style={{ fontSize:8, fontFamily:'IBM Plex Mono,monospace', fontWeight:800, color:scCol }}>{sc}</span>
                      </button>
                    </div>
                    {dateStr && <div style={{ fontSize:10, color:'#475569', paddingLeft:14, fontFamily:'IBM Plex Mono,monospace' }}>{s.name}</div>}
                    {isNew(s) && <span style={{ fontSize:8, background:'#1e3a5f', color:'#60a5fa', padding:'1px 5px', borderRadius:3, fontWeight:700, fontFamily:'IBM Plex Mono,monospace', marginLeft:14 }}>NEW</span>}
                  </div>
                )
              })}
            </div>
            {/* Upload */}
            <div style={{ padding:10, borderTop:'1px solid #1e2740' }}>
              <div
                onClick={() => (document.getElementById('csv-up') as HTMLInputElement)?.click()}
                onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#f97316' }}
                onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2740' }}
                onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2740'; const f = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv')); if (f.length) handleFiles(f) }}
                style={{ border:'1.5px dashed #1e2740', borderRadius:8, padding:'12px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}
              >
                <input id="csv-up" type="file" accept=".csv" multiple style={{ display:'none' }} onChange={e => { const f = Array.from(e.target.files || []); if (f.length) handleFiles(f); e.target.value = '' }} />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ fontSize:10, fontWeight:600, color:'#64748b', fontFamily:'IBM Plex Mono,monospace', textAlign:'center' }}>{uploading ? 'Processing...' : t('upload_drag')}</span>
                <span style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono,monospace', textAlign:'center', lineHeight:1.5 }}>{t('upload_sub')}</span>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* ---- OVERVIEW ---- */}
          {tab === 'overview' && active && (
            <div>
              {/* Header row */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16, flexWrap:'wrap' }}>
                <div>
                  <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{active.name}</h1>
                  <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>
                    {active.rows?.toLocaleString()} rows{active.duration_min ? ` - ${active.duration_min} min` : ''}{active.km_estimated ? ` - ${fmt(active.km_estimated, 1)} km` : ''}
                  </span>
                </div>
                {/* Param filter button */}
                <button
                  onClick={() => setParamFilterOpen(o => !o)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', background: paramFilterOpen ? '#1e3a5f' : '#161c2a', border:'1px solid', borderColor: paramFilterOpen ? '#3b82f6' : '#1e2740', borderRadius:7, cursor:'pointer', color: paramFilterOpen ? '#60a5fa' : '#64748b', fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:600, letterSpacing:1 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  {t('filter')}
                </button>
              </div>

              {/* Param filter panel */}
              {paramFilterOpen && (
                <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:10, padding:'14px 16px', marginBottom:18 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:2, textTransform:'uppercase', fontFamily:'IBM Plex Mono,monospace' }}>Parameters</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setVisibleParams(new Set(allParamIds))} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e3a5f', borderRadius:4, background:'#0f1f3a', color:'#60a5fa', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600 }}>{t('select_all')}</button>
                      <button onClick={() => setVisibleParams(new Set())} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e2740', borderRadius:4, background:'transparent', color:'#475569', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  {/* Grouped by section */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'14px 20px' }}>
                    {SECTIONS.filter(s => s.params.length > 0).map(sec => (
                      <div key={sec.key}>
                        <div style={{ fontSize:9, fontWeight:700, color:sec.color, letterSpacing:2, textTransform:'uppercase', marginBottom:6, fontFamily:'IBM Plex Mono,monospace' }}>{t('sec_' + sec.key)}</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          {sec.params.map(p => (
                            <label key={p.id} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', userSelect:'none' }}>
                              <input type="checkbox" checked={visibleParams.has(p.id)} onChange={() => toggleParam(p.id)} style={{ accentColor:'#f97316', width:12, height:12 }} />
                              <span style={{ fontSize:11, color: visibleParams.has(p.id) ? '#e2e8f0' : '#334155', fontFamily:'IBM Plex Mono,monospace' }}>{t(p.labelKey)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis - always first, full width */}
              {(() => {
                const diagSec = SECTIONS.find(s => s.key === 'diag')!
                const open = !collapsedSecs.has('diag')
                return (
                  <div style={{ marginBottom:4 }}>
                    <SecHead title={t('sec_diag')} color={C.red} open={open} onToggle={() => toggleSec('diag')} />
                    {open && (
                      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:8 }}>
                        {alerts.map((a, idx) => (
                          <div key={idx} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 14px', borderRadius:8, border:`1px solid ${AC[a.type]}30`, background:`${AC[a.type]}0a` }}>
                            <div style={{ fontSize:9, padding:'3px 7px', borderRadius:4, background:`${AC[a.type]}20`, color:AC[a.type], letterSpacing:1, flexShrink:0, fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>{a.param}</div>
                            <div>
                              <div style={{ fontSize:12, fontWeight:700, color:AC[a.type], marginBottom:3 }}>{a.title}</div>
                              <div style={{ fontSize:11, color:'#64748b', lineHeight:1.6 }}>{a.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* KPI sections - 2 column layout when wide enough */}
              <div style={{ columns:'2 400px', columnGap:20 }}>
                {SECTIONS.filter(sec => sec.key !== 'diag').map(sec => {
                  const open = !collapsedSecs.has(sec.key)
                  const params = sec.params.filter(p => visibleParams.has(p.id))
                  if (params.length === 0 && !open) return null
                  return (
                    <div key={sec.key} style={{ breakInside:'avoid', marginBottom:4 }}>
                      <SecHead title={t('sec_' + sec.key)} color={sec.color} open={open} onToggle={() => toggleSec(sec.key)} />
                      {open && params.length > 0 && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:8 }}>
                          {params.map(p => {
                            const raw = p.getValue(active)
                            const val = typeof raw === 'number' ? fmt(raw, p.unit === 'V' || p.unit === 'G' ? 2 : p.id === 'lambda' ? 3 : 1) : (raw ?? '--')
                            const sub = p.subFn ? p.subFn(active) : undefined
                            return (
                              <Kpi key={p.id} label={t(p.labelKey)} value={p.id === 'ltft' && typeof raw === 'number' && raw > 0 ? '+' + val : val} unit={p.unit} sub={sub} color={p.color} />
                            )
                          })}
                        </div>
                      )}
                      {open && params.length === 0 && (
                        <div style={{ fontSize:10, color:'#334155', fontFamily:'IBM Plex Mono,monospace', marginBottom:8 }}>All params hidden</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ---- TIMELINE ---- */}
          {tab === 'timeline' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:12 }}>
                <div>
                  <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{t('timeline')}</h1>
                  <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>
                    {allSessions.length} {t('sessions')} - {filteredCharts.length} {t('charts_visible')}
                  </span>
                </div>
                <button onClick={() => setChartFilterOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', background: chartFilterOpen ? '#1e3a5f' : '#161c2a', border:'1px solid', borderColor: chartFilterOpen ? '#3b82f6' : '#1e2740', borderRadius:7, cursor:'pointer', color: chartFilterOpen ? '#60a5fa' : '#64748b', fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:600, letterSpacing:1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  {t('filter')}
                </button>
              </div>
              {chartFilterOpen && (
                <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:10, padding:'16px 18px', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:2, textTransform:'uppercase', fontFamily:'IBM Plex Mono,monospace' }}>{t('filter_charts' in T.en ? 'filter_charts' : 'filter')}</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setVisibleCharts(new Set(CHART_DEFS.map(c => c.id)))} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e3a5f', borderRadius:4, background:'#0f1f3a', color:'#60a5fa', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600 }}>{t('select_all')}</button>
                      <button onClick={() => setVisibleCharts(new Set())} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e2740', borderRadius:4, background:'transparent', color:'#475569', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'14px 20px' }}>
                    {chartGroups.map(grp => (
                      <div key={grp}>
                        <div style={{ fontSize:9, fontWeight:700, color:'#f97316', letterSpacing:2, textTransform:'uppercase', marginBottom:7, fontFamily:'IBM Plex Mono,monospace' }}>{CHART_GROUPS[grp] ?? grp}</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                          {CHART_DEFS.filter(c => c.group === grp).map(c => (
                            <label key={c.id} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', userSelect:'none' }}>
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
              {/* Health Score evolution chart - always first */}
              <div style={{ marginBottom:28 }}>
                <div style={{ borderBottom:'1px solid #1e2740', paddingBottom:10, marginBottom:16 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', fontFamily:'IBM Plex Mono,monospace' }}>Health Score</span>
                </div>
                <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:10, padding:'16px 18px' }}>
                  <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:90 }}>
                    {allSessions.map((s, idx) => {
                      const sScore = calcHealth(s)
                      const sCol = scoreCol(sScore)
                      const isAct = s.name === active?.name
                      return (
                        <div key={s.name} onClick={() => { setActiveIdx(idx); setTab('score') }} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer' }}>
                          <div style={{ fontSize:9, fontFamily:'IBM Plex Mono,monospace', color:sCol, fontWeight:700 }}>{sScore}</div>
                          <div style={{ width:'100%', height:`${sScore}%`, minHeight:3, background:sCol, borderRadius:'2px 2px 0 0', opacity: isAct ? 1 : 0.5, outline: isAct ? `1px solid ${sCol}` : 'none' }} />
                          <div style={{ fontSize:7, color:'#334155', fontFamily:'IBM Plex Mono,monospace', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>{s.name.split(' ')[0]}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {chartGroups.map(grp => {
                const charts = filteredCharts.filter(c => c.group === grp)
                if (!charts.length) return null
                const collapsed = collapsedGroups.has(grp)
                return (
                  <div key={grp} style={{ marginBottom:28 }}>
                    <button onClick={() => toggleGroup(grp)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', border:'none', borderBottom:'1px solid #1e2740', paddingBottom:10, marginBottom: collapsed ? 0 : 16, cursor:'pointer', textAlign:'left' }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', fontFamily:'IBM Plex Mono,monospace' }}>{CHART_GROUPS[grp] ?? grp}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{charts.length} charts</span>
                        <span style={{ fontSize:12, color:'#475569', display:'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>v</span>
                      </div>
                    </button>
                    {!collapsed && (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(480px,1fr))', gap:14 }}>
                        {charts.map(c => (
                          <TimelineChart
                            key={c.id} title={t(c.titleKey)} unit={c.unit} labels={tlLabels}
                            datasets={c.datasets.map(d => ({ label:d.label, data:allSessions.map(s => s[d.field] as number|null), color:d.color }))}
                            yMin={c.yMin} yMax={c.yMax} refLine={c.refLine}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredCharts.length === 0 && <div style={{ textAlign:'center', padding:'60px 0', color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontSize:13 }}>{t('no_charts')}</div>}
            </div>
          )}

          {/* ---- TABLE ---- */}
          {tab === 'table' && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{t('table')}</h1>
                <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{t('all_logs')} - {allSessions.length} {t('sessions')}</span>
              </div>
              <div style={{ overflowX:'auto', background:'#111827', borderRadius:10, border:'1px solid #1e2740' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'IBM Plex Mono,monospace', fontSize:11 }}>
                  <thead><tr>
                    {[t('th_session'),t('th_km'),t('th_ect_avg'),t('th_ect_max'),t('th_iat'),t('th_ltft'),t('th_stft'),t('th_lambda'),t('th_iacv'),t('th_map_wot'),t('th_adv'),t('th_knock'),t('th_inj'),t('th_lh'),t('th_kml'),t('th_vtec'),t('th_bat'),t('th_mil'),'Score'].map(h => (
                      <th key={h} style={{ padding:'10px 11px', textAlign:'left', fontSize:9, letterSpacing:1.5, textTransform:'uppercase', color:'#475569', borderBottom:'1px solid #1e2740', whiteSpace:'nowrap', background:'#0f1117', fontWeight:700 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {allSessions.map((s, i) => {
                      const sc = calcHealth(s)
                      const scCol = scoreCol(sc)
                      return (
                        <tr key={s.name} onClick={() => { setActiveIdx(i); setTab('overview') }} style={{ borderBottom:'1px solid #161c2a', background: isNew(s) ? '#1a2035' : 'transparent', cursor:'pointer' }}>
                          <td style={{ padding:'9px 11px', color: isNew(s) ? '#f97316' : '#e2e8f0', fontWeight:700, whiteSpace:'nowrap' }}>{s.name}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.km_estimated, 1)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.ect_mean)}C</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.ect_max)}C</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.iat_mean)}C</td>
                          <td style={{ padding:'9px 11px' }}><span className={pillCls(s.ltft, 2.5, 4)}>{s.ltft != null ? (s.ltft > 0 ? '+' : '') + fmt(s.ltft) : '--'}%</span></td>
                          <td style={{ padding:'9px 11px' }}><span className={pillCls(s.stft_above15_pct, 3, 10)}>{fmt(s.stft_above15_pct)}%</span></td>
                          <td style={{ padding:'9px 11px' }}><span className={pillCls(s.lambda, 1.05, 1.15)}>{fmt(s.lambda, 3)}</span></td>
                          <td style={{ padding:'9px 11px' }}><span className={pillCls(s.iacv_mean, 42, 55)}>{fmt(s.iacv_mean)}%</span></td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.map_wot)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.adv_mean)}</td>
                          <td style={{ padding:'9px 11px' }}><span className={s.knock_events === 0 ? 'pg' : 'pr'}>{s.knock_events ?? '--'}</span></td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.inj_dur, 2)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.fuel_flow_mean, 2)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.inst_consumption, 1)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.vtec_pct)}%</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.bat_mean, 2)}V</td>
                          <td style={{ padding:'9px 11px' }}><span className={!s.mil_on_pct ? 'pg' : 'pr'}>{s.mil_on_pct ? t('active_str') : 'OFF'}</span></td>
                          <td style={{ padding:'9px 11px' }}><span style={{ fontSize:10, fontWeight:700, color:scCol, fontFamily:'IBM Plex Mono,monospace' }}>{sc}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---- SCORE ---- */}
          {tab === 'score' && active && (() => {
            const sc = calcHealth(active)
            const col = scoreCol(sc)
            const label = sc >= 80 ? 'HEALTHY' : sc >= 55 ? 'NEEDS ATTENTION' : 'CRITICAL'
            const breakdown = [
              { key:'STFT',   val:active.stft_above15_pct,             weight:20, good:2,    bad:15,  desc:'Short term correction' },
              { key:'LTFT',   val:Math.abs(active.ltft ?? 0),           weight:15, good:2.5,  bad:6,   desc:'Long term fuel trim' },
              { key:'Lambda', val:Math.abs((active.lambda ?? 1) - 1),   weight:15, good:0.05, bad:0.25,desc:'Mixture deviation from stoich' },
              { key:'ECT',    val:active.ect_above95_pct,               weight:15, good:15,   bad:35,  desc:'Coolant temp frequency' },
              { key:'IACV',   val:(active.iacv_mean ?? 35) - 35,        weight:10, good:7,    bad:30,  desc:'Idle air control (vacuum leak)' },
              { key:'Knock',  val:active.knock_events,                  weight:15, good:0,    bad:10,  desc:'Detonation events' },
              { key:'BAT',    val:active.bat_below12_pct,               weight:5,  good:0,    bad:5,   desc:'Voltage drops below 12V' },
              { key:'MIL',    val:active.mil_on_pct,                    weight:5,  good:0,    bad:1,   desc:'Check engine lamp' },
            ]
            return (
              <div>
                <div style={{ marginBottom:20 }}>
                  <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>Engine Health Score</h1>
                  <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{active.name} - weighted composite</span>
                </div>
                <div style={{ background:'#111827', border:`1px solid ${col}40`, borderRadius:14, padding:'28px 32px', marginBottom:20, display:'flex', alignItems:'center', gap:40, flexWrap:'wrap' }}>
                  <div style={{ textAlign:'center', minWidth:110 }}>
                    <div style={{ fontSize:72, fontWeight:900, color:col, fontFamily:'IBM Plex Mono,monospace', lineHeight:1 }}>{sc}</div>
                    <div style={{ fontSize:10, letterSpacing:3, color:col, fontFamily:'IBM Plex Mono,monospace', fontWeight:700, marginTop:6 }}>{label}</div>
                    <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono,monospace', marginTop:3 }}>out of 100</div>
                  </div>
                  <div style={{ flex:1, minWidth:280, display:'flex', flexDirection:'column', gap:10 }}>
                    {breakdown.map(b => {
                      const range = b.bad - b.good
                      const raw = range > 0 ? Math.min(1, Math.max(0, ((b.val ?? 0) - b.good) / range)) : 0
                      const bScore = Math.round((1 - raw) * 100)
                      const bCol = scoreCol(bScore)
                      return (
                        <div key={b.key} style={{ display:'grid', gridTemplateColumns:'60px 1fr 42px 50px', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:'#94a3b8', letterSpacing:1 }}>{b.key}</span>
                          <div style={{ height:4, background:'#1e2740', borderRadius:2, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${bScore}%`, background:bCol, borderRadius:2 }} />
                          </div>
                          <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:bCol, fontWeight:700, textAlign:'right' }}>{bScore}</span>
                          <span style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono,monospace', textAlign:'right' }}>w:{b.weight}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Score evolution */}
                <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:12, padding:'16px 18px' }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontWeight:700, textTransform:'uppercase', marginBottom:12 }}>Score Evolution</div>
                  <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:90 }}>
                    {allSessions.map((s, idx) => {
                      const sScore = calcHealth(s)
                      const sCol = scoreCol(sScore)
                      const isAct = s.name === active.name
                      return (
                        <div key={s.name} onClick={() => setActiveIdx(idx)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer' }}>
                          <div style={{ fontSize:8, fontFamily:'IBM Plex Mono,monospace', color:sCol, fontWeight:700 }}>{sScore}</div>
                          <div style={{ width:'100%', height:`${sScore}%`, minHeight:3, background:sCol, borderRadius:'2px 2px 0 0', opacity: isAct ? 1 : 0.45, outline: isAct ? `1px solid ${sCol}` : 'none' }} />
                          <div style={{ fontSize:7, color:'#334155', fontFamily:'IBM Plex Mono,monospace', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>{s.name.split(' ')[0]}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ---- COMPAT ---- */}
          {tab === 'compat' && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:8 }}>Compatible Vehicles</h1>
                <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7, maxWidth:640 }}>
                  All Honda/Acura gasoline models from 1992 to 2001 that use the proprietary 3-pin or 5-pin DLC diagnostic connector. Vehicles with the standard 16-pin OBD2 port (US/CA from 1996+) are not supported.
                </p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {COMPAT.map((v, i) => (
                  <div key={i} style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:8, padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr 80px 1fr', gap:'0 16px', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:2 }}>{v.model}</div>
                      <div style={{ fontSize:10, color:'#64748b', fontFamily:'IBM Plex Mono,monospace' }}>{v.engines}</div>
                    </div>
                    <div style={{ fontSize:10, background:'#1e3a5f', color:'#60a5fa', padding:'2px 7px', borderRadius:3, display:'inline-block', fontFamily:'IBM Plex Mono,monospace', fontWeight:700, textAlign:'center' }}>{v.years}</div>
                    <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>OBD1 - 3/5-pin DLC</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, padding:'12px 16px', background:'#1a1f2e', border:'1px solid #1e2740', borderRadius:8 }}>
                <p style={{ fontSize:11, color:'#475569', lineHeight:1.7 }}>
                  Note: Some 92-95 models have the 3-pin connector with only 2 wires (no power pin) and require an external power source. US/CA vehicles from 1996+ use the 16-pin OBD2 port and are not compatible.
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
