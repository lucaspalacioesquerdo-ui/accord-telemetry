'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import TimelineChart from '@/components/TimelineChart'
import { parseCSVFile, BASELINE } from '@/lib/parser'
import { generateAlerts, type Alert } from '@/lib/alerts'
import type { LogSession } from '@/lib/supabase'

// -- Types -------------------------------------------------------------
type Lang    = 'en' | 'pt'
type Tab     = 'overview' | 'timeline' | 'table' | 'score'
type SecKey  = 'elec' | 'fuel' | 'air' | 'afr' | 'ign' | 'temp' | 'idle' | 'motion' | 'act' | 'diag' | 'perf'
type Profile = { key: string; name: string }

// -- Palette -----------------------------------------------------------
const C = {
  cyan:'#00cfff', teal:'#00b4a0', green:'#00e060', lime:'#80e000',
  yellow:'#ffe000', orange:'#ff9000', red:'#ff3030', pink:'#ff60a0',
  purple:'#c060ff', blue:'#4080ff', indigo:'#6060ff', gray:'#8090a0',
}

// -- i18n --------------------------------------------------------------
const T: Record<Lang, Record<string,string>> = {
  en: {
    overview:'Overview', timeline:'Timeline', table:'Table', sessions:'Sessions',
    imported:'imported', filter:'Filter', select_all:'All', clear_sel:'Clear',
    all_logs:'All logs', upload_drag:'Drag CSV or click to import',
    upload_sub:'HondsH OBD1 - EN or PT',
    my_cars:'My Cars', add_car:'Add Car', no_car:'No car selected',
    car_name_label:'Profile name (optional)', car_name_ph:'e.g. My Daily Driver',
    saved_profiles:'Saved Profiles', step_model:'Model', step_year:'Year', step_trim:'Trim',
    confirm_save:'Save Profile',
    sec_elec:'Electrical & Charging', sec_fuel:'Fuel & Injection',
    sec_air:'Air / Intake / Load', sec_afr:'Mixture & Correction (AFR)',
    sec_ign:'Ignition', sec_temp:'Temperature & Cooling',
    sec_idle:'Idle Control', sec_motion:'Motion & Dynamics',
    sec_act:'Actuators & Emissions', sec_diag:'Diagnosis', sec_perf:'Performance',
    bat:'Battery', alt_fr:'Alternator FR', eld_curr:'ELD Current',
    fuel_flow:'Fuel Flow', fuel_inst:'Consumption',
    inj_dur:'Inj. Duration', inj_dc:'Inj. Duty Cycle', inj_fr:'Inj. Flow Rate',
    map_psi:'MAP', map_wot:'MAP WOT', iat:'IAT', clv:'Calc. Load',
    ltft:'LTFT', stft:'STFT >+15%', lambda:'Lambda', fls:'Closed Loop', iacv_dc:'IACV',
    ign_adv:'Ign. Advance', ign_lim:'Ign. Limit', knock:'Knock',
    ect:'ECT', ect_hot:'ECT >95C', fan:'Radiator Fan',
    iacv_dc2:'IACV DC', rev:'Engine RPM',
    vss:'Vehicle Speed', lng_accel:'Long. Accel', km_est:'Est. Distance', vtec:'VTEC',
    egr:'EGR Active', mil:'Check Engine', active_str:'ACTIVE', noFaults:'No active faults',
    ch_ltft:'LTFT Long Term Fuel Trim', ch_stft:'STFT Extreme Correction',
    ch_lambda:'Lambda (O2)', ch_iacv:'IACV Idle Air Control',
    ch_ect:'ECT Coolant Temp', ch_iat:'IAT Intake Air Temp',
    ch_bat:'Battery Min', ch_vtec:'VTEC Active Time',
    ch_adv:'Ignition Advance', ch_knock:'Knock Events',
    ch_map:'MAP Manifold Pressure', ch_clv:'Calculated Load Value',
    ch_rev:'Engine RPM max', ch_inj:'Injection Duration',
    ch_inj_dc:'Injector Duty Cycle', ch_egr:'EGR Active Time',
    ch_flow:'Fuel Flow l/h', ch_consump:'Consumption km/l',
    ch_km:'Est. Distance', ch_vmax:'Max Speed', ch_eld:'ELD Current',
    th_session:'Session', th_km:'Km', th_ect_avg:'ECT avg', th_ect_max:'ECT max',
    th_iat:'IAT', th_ltft:'LTFT', th_stft:'STFT%', th_lambda:'Lambda',
    th_iacv:'IACV', th_map_wot:'MAP wot', th_adv:'Adv', th_knock:'Knock',
    th_inj:'Inj ms', th_lh:'l/h', th_kml:'km/l', th_vtec:'VTEC%',
    th_bat:'Bat V', th_mil:'MIL',
    charts_visible:'charts visible', no_charts:'No charts selected.',
    performance:'Performance', t0_60:'0-60 km/h', t0_100:'0-100 km/h', t0_140:'0-140 km/h',
    perf_sub:'Best sprint detected', perf_none:'No sprint detected (requires standing start)',
  },
  pt: {
    overview:'Visao Geral', timeline:'Linha do Tempo', table:'Tabela', sessions:'Sessoes',
    imported:'importado(s)', filter:'Filtrar', select_all:'Todos', clear_sel:'Limpar',
    all_logs:'Todos os logs', upload_drag:'Arrastar CSV ou clicar',
    upload_sub:'HondsH OBD1 - EN ou PT',
    my_cars:'Meus Carros', add_car:'Adicionar Carro', no_car:'Nenhum carro selecionado',
    car_name_label:'Nome do perfil (opcional)', car_name_ph:'Ex.: Meu Carro',
    saved_profiles:'Perfis Salvos', step_model:'Modelo', step_year:'Ano', step_trim:'Versao',
    confirm_save:'Salvar Perfil',
    sec_elec:'Eletrica / Carregamento', sec_fuel:'Combustivel / Injecao',
    sec_air:'Ar / Admissao / Carga', sec_afr:'Mistura e Correcao (AFR)',
    sec_ign:'Ignicao', sec_temp:'Temperatura e Arrefecimento',
    sec_idle:'Marcha Lenta', sec_motion:'Movimento / Dinamica',
    sec_act:'Atuadores e Emissoes', sec_diag:'Diagnostico', sec_perf:'Performance',
    bat:'Bateria', alt_fr:'Alternador FR', eld_curr:'ELD Corrente',
    fuel_flow:'Fluxo Comb.', fuel_inst:'Consumo',
    inj_dur:'Dur. Injecao', inj_dc:'DC Injecao', inj_fr:'Fluxo Injetor',
    map_psi:'MAP', map_wot:'MAP WOT', iat:'IAT', clv:'Carga Calc.',
    ltft:'LTFT', stft:'STFT >+15%', lambda:'Lambda', fls:'Malha Fechada', iacv_dc:'IACV',
    ign_adv:'Avanco Ign.', ign_lim:'Limite Ign.', knock:'Knock',
    ect:'ECT', ect_hot:'ECT >95C', fan:'Ventoinha',
    iacv_dc2:'IACV DC', rev:'Rotacao Motor',
    vss:'Velocidade', lng_accel:'Acel. Long.', km_est:'Dist. Est.', vtec:'VTEC',
    egr:'EGR Ativo', mil:'Check Engine', active_str:'ATIVO', noFaults:'Sem falhas ativas',
    ch_ltft:'LTFT Trim Longo Prazo', ch_stft:'STFT Correcao Extrema',
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
    performance:'Performance', t0_60:'0-60 km/h', t0_100:'0-100 km/h', t0_140:'0-140 km/h',
    perf_sub:'Melhor arrancada detectada', perf_none:'Nenhuma arrancada (partida do 0)',
  },
}

// -- Car catalog -------------------------------------------------------
type TrimDef = { trim: string; engine: string; hp: number; notes: string }
type YearDef = { year: number; trims: TrimDef[] }
type CarDef  = { model: string; years: YearDef[] }

const CAR_CATALOG: CarDef[] = [
  { model:'Honda Accord', years:[
    {year:1992,trims:[{trim:'DX',engine:'F22A1',hp:125,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F22A1',hp:125,notes:'SOHC non-VTEC'},{trim:'EX',engine:'F22A6',hp:140,notes:'SOHC non-VTEC, IAB'},{trim:'SE',engine:'F22A6',hp:140,notes:'SOHC non-VTEC, IAB'}]},
    {year:1993,trims:[{trim:'DX',engine:'F22A1',hp:125,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F22A1',hp:125,notes:'SOHC non-VTEC'},{trim:'EX',engine:'F22A6',hp:140,notes:'SOHC non-VTEC, IAB'},{trim:'SE',engine:'F22A6',hp:140,notes:'SOHC non-VTEC'}]},
    {year:1994,trims:[{trim:'DX',engine:'F22B2',hp:130,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F22B2',hp:130,notes:'SOHC non-VTEC'},{trim:'EX',engine:'F22B1',hp:145,notes:'SOHC VTEC'},{trim:'EX-L',engine:'F22B1',hp:145,notes:'SOHC VTEC, leather'}]},
    {year:1995,trims:[{trim:'DX',engine:'F22B2',hp:130,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F22B2',hp:130,notes:'SOHC non-VTEC'},{trim:'EX',engine:'F22B1',hp:145,notes:'SOHC VTEC - F22B1'},{trim:'EX-L',engine:'F22B1',hp:145,notes:'SOHC VTEC, leather'}]},
    {year:1996,trims:[{trim:'DX',engine:'F22B2',hp:130,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F22B2',hp:130,notes:'SOHC non-VTEC'},{trim:'EX',engine:'F22B1',hp:145,notes:'SOHC VTEC'},{trim:'V6 LX',engine:'C27A4',hp:170,notes:'2.7L V6'},{trim:'V6 EX',engine:'C27A4',hp:170,notes:'2.7L V6'}]},
    {year:1997,trims:[{trim:'DX',engine:'F22B2',hp:130,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F22B2',hp:130,notes:'SOHC non-VTEC'},{trim:'EX',engine:'F22B1',hp:145,notes:'SOHC VTEC'},{trim:'V6 LX',engine:'C27A4',hp:170,notes:'2.7L V6'},{trim:'V6 EX',engine:'C27A4',hp:170,notes:'2.7L V6'}]},
    {year:1998,trims:[{trim:'DX',engine:'F23A5',hp:135,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F23A1',hp:150,notes:'SOHC VTEC LEV'},{trim:'EX',engine:'F23A1',hp:150,notes:'SOHC VTEC LEV'},{trim:'EX ULEV',engine:'F23A4',hp:148,notes:'SOHC VTEC ULEV'},{trim:'V6 EX',engine:'J30A1',hp:200,notes:'3.0L V6 VTEC'}]},
    {year:1999,trims:[{trim:'DX',engine:'F23A5',hp:135,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F23A1',hp:150,notes:'SOHC VTEC LEV'},{trim:'EX',engine:'F23A1',hp:150,notes:'SOHC VTEC LEV'},{trim:'EX ULEV',engine:'F23A4',hp:148,notes:'SOHC VTEC ULEV'},{trim:'V6 EX',engine:'J30A1',hp:200,notes:'3.0L V6 VTEC'}]},
    {year:2000,trims:[{trim:'DX',engine:'F23A5',hp:135,notes:'SOHC non-VTEC'},{trim:'LX',engine:'F23A1',hp:150,notes:'SOHC VTEC LEV'},{trim:'EX',engine:'F23A1',hp:150,notes:'SOHC VTEC LEV'},{trim:'SE',engine:'F23A1',hp:150,notes:'SOHC VTEC'},{trim:'V6 EX',engine:'J30A1',hp:200,notes:'3.0L V6 VTEC'}]},
    {year:2001,trims:[{trim:'LX',engine:'F23A1',hp:150,notes:'SOHC VTEC LEV'},{trim:'EX',engine:'F23A1',hp:150,notes:'SOHC VTEC LEV'},{trim:'SE',engine:'F23A1',hp:150,notes:'SOHC VTEC'},{trim:'V6 EX',engine:'J30A1',hp:200,notes:'3.0L V6 VTEC'}]},
  ]},
  { model:'Honda Civic', years:[
    {year:1992,trims:[{trim:'CX',engine:'D15B8',hp:70,notes:'SOHC non-VTEC'},{trim:'DX',engine:'D15B7',hp:102,notes:'SOHC non-VTEC'},{trim:'EX',engine:'D16Z6',hp:125,notes:'SOHC VTEC'},{trim:'Si',engine:'D16Z6',hp:125,notes:'SOHC VTEC'},{trim:'VX',engine:'D15Z1',hp:92,notes:'SOHC VTEC-E'}]},
    {year:1993,trims:[{trim:'CX',engine:'D15B8',hp:70,notes:'SOHC'},{trim:'DX',engine:'D15B7',hp:102,notes:'SOHC'},{trim:'EX',engine:'D16Z6',hp:125,notes:'SOHC VTEC'},{trim:'Si',engine:'D16Z6',hp:125,notes:'SOHC VTEC'}]},
    {year:1994,trims:[{trim:'CX',engine:'D15B8',hp:70,notes:'SOHC'},{trim:'DX',engine:'D15B7',hp:102,notes:'SOHC'},{trim:'EX',engine:'D16Z6',hp:125,notes:'SOHC VTEC'},{trim:'Si',engine:'D16Z6',hp:125,notes:'SOHC VTEC'}]},
    {year:1995,trims:[{trim:'CX',engine:'D15B8',hp:70,notes:'SOHC'},{trim:'DX',engine:'D15B7',hp:102,notes:'SOHC'},{trim:'EX',engine:'D16Z6',hp:125,notes:'SOHC VTEC'},{trim:'Si',engine:'D16Z6',hp:125,notes:'SOHC VTEC'}]},
    {year:1996,trims:[{trim:'CX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'DX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'LX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'EX',engine:'D16Y8',hp:127,notes:'SOHC VTEC'},{trim:'HX',engine:'D16Y5',hp:115,notes:'SOHC VTEC-E'}]},
    {year:1997,trims:[{trim:'CX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'DX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'LX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'EX',engine:'D16Y8',hp:127,notes:'SOHC VTEC'}]},
    {year:1998,trims:[{trim:'CX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'DX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'LX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'EX',engine:'D16Y8',hp:127,notes:'SOHC VTEC'}]},
    {year:1999,trims:[{trim:'CX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'DX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'LX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'EX',engine:'D16Y8',hp:127,notes:'SOHC VTEC'},{trim:'Si',engine:'B16A2',hp:160,notes:'DOHC VTEC'}]},
    {year:2000,trims:[{trim:'CX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'DX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'LX',engine:'D16Y7',hp:106,notes:'SOHC'},{trim:'EX',engine:'D16Y8',hp:127,notes:'SOHC VTEC'},{trim:'Si',engine:'B16A2',hp:160,notes:'DOHC VTEC'}]},
  ]},
  { model:'Honda Prelude', years:[
    {year:1992,trims:[{trim:'S',engine:'F22A1',hp:135,notes:'SOHC'},{trim:'Si',engine:'F22A1',hp:135,notes:'SOHC'},{trim:'VTEC',engine:'H22A',hp:190,notes:'DOHC VTEC'}]},
    {year:1993,trims:[{trim:'S',engine:'F22A1',hp:135,notes:'SOHC'},{trim:'Si',engine:'F22A1',hp:135,notes:'SOHC'},{trim:'VTEC',engine:'H22A1',hp:190,notes:'DOHC VTEC'}]},
    {year:1994,trims:[{trim:'S',engine:'F22A1',hp:135,notes:'SOHC'},{trim:'Si',engine:'H23A1',hp:160,notes:'DOHC'},{trim:'VTEC',engine:'H22A1',hp:190,notes:'DOHC VTEC'}]},
    {year:1995,trims:[{trim:'S',engine:'F22A1',hp:135,notes:'SOHC'},{trim:'Si',engine:'H23A1',hp:160,notes:'DOHC'},{trim:'VTEC',engine:'H22A1',hp:190,notes:'DOHC VTEC'}]},
    {year:1996,trims:[{trim:'S',engine:'F22A1',hp:135,notes:'SOHC'},{trim:'Si',engine:'H23A1',hp:160,notes:'DOHC'},{trim:'VTEC',engine:'H22A1',hp:190,notes:'DOHC VTEC'}]},
    {year:1997,trims:[{trim:'Base',engine:'F22A2',hp:135,notes:'SOHC'},{trim:'Type SH',engine:'H22A4',hp:195,notes:'DOHC VTEC ATTS'}]},
    {year:1998,trims:[{trim:'Base',engine:'F22A2',hp:135,notes:'SOHC'},{trim:'Type SH',engine:'H22A4',hp:195,notes:'DOHC VTEC ATTS'}]},
    {year:1999,trims:[{trim:'Base',engine:'F22A2',hp:135,notes:'SOHC'},{trim:'Type SH',engine:'H22A4',hp:195,notes:'DOHC VTEC ATTS'}]},
    {year:2000,trims:[{trim:'Base',engine:'F22A2',hp:135,notes:'SOHC'},{trim:'Type SH',engine:'H22A4',hp:195,notes:'DOHC VTEC ATTS'}]},
    {year:2001,trims:[{trim:'Base',engine:'F22A2',hp:135,notes:'SOHC'},{trim:'Type SH',engine:'H22A4',hp:195,notes:'DOHC VTEC ATTS'}]},
  ]},
  { model:'Honda Integra / Acura Integra', years:[
    {year:1992,trims:[{trim:'RS',engine:'B18A1',hp:140,notes:'DOHC'},{trim:'LS',engine:'B18A1',hp:140,notes:'DOHC'},{trim:'GS',engine:'B18A1',hp:140,notes:'DOHC'},{trim:'GS-R',engine:'B17A1',hp:160,notes:'DOHC VTEC'}]},
    {year:1994,trims:[{trim:'RS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'LS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'GS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'GS-R',engine:'B18C1',hp:170,notes:'DOHC VTEC'}]},
    {year:1997,trims:[{trim:'RS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'LS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'GS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'GS-R',engine:'B18C1',hp:170,notes:'DOHC VTEC'},{trim:'Type R',engine:'B18C5',hp:195,notes:'DOHC VTEC high-comp'}]},
    {year:1999,trims:[{trim:'RS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'LS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'GS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'GS-R',engine:'B18C1',hp:170,notes:'DOHC VTEC'},{trim:'Type R',engine:'B18C5',hp:195,notes:'DOHC VTEC'}]},
    {year:2001,trims:[{trim:'RS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'LS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'GS',engine:'B18B1',hp:142,notes:'DOHC'},{trim:'GS-R',engine:'B18C1',hp:170,notes:'DOHC VTEC'},{trim:'Type R',engine:'B18C5',hp:195,notes:'DOHC VTEC'}]},
  ]},
  { model:'Honda CR-V', years:[
    {year:1997,trims:[{trim:'Base',engine:'B20B',hp:126,notes:'DOHC non-VTEC'}]},
    {year:1998,trims:[{trim:'LX',engine:'B20B',hp:126,notes:'DOHC non-VTEC'},{trim:'EX',engine:'B20Z2',hp:146,notes:'DOHC higher-comp'}]},
    {year:1999,trims:[{trim:'LX',engine:'B20B',hp:126,notes:'DOHC non-VTEC'},{trim:'EX',engine:'B20Z2',hp:146,notes:'DOHC higher-comp'}]},
    {year:2001,trims:[{trim:'LX',engine:'B20B',hp:126,notes:'DOHC non-VTEC'},{trim:'EX',engine:'B20Z2',hp:146,notes:'DOHC higher-comp'}]},
  ]},
  { model:'Acura NSX', years:[
    {year:1991,trims:[{trim:'Base',engine:'C30A',hp:270,notes:'DOHC VTEC V6 3.0L'}]},
    {year:1995,trims:[{trim:'Base',engine:'C30A',hp:270,notes:'DOHC VTEC V6 3.0L'},{trim:'T',engine:'C30A',hp:270,notes:'Targa'}]},
    {year:1997,trims:[{trim:'Base',engine:'C32B',hp:290,notes:'DOHC VTEC V6 3.2L'},{trim:'T',engine:'C32B',hp:290,notes:'Targa'}]},
    {year:2001,trims:[{trim:'Base',engine:'C32B',hp:290,notes:'DOHC VTEC V6 3.2L'}]},
  ]},
]

// -- Chart definitions -------------------------------------------------
type ChartDef = {
  id: string; group: string; titleKey: string; unit?: string
  yMin?: number; yMax?: number
  refLine?: { value: number; label: string; color: string }
  datasets: { label: string; field: keyof LogSession; color: string; alarmThreshold?: number; alarmAbove?: boolean }[]
}

const CHART_DEFS: ChartDef[] = [
  {id:'bat',group:'elec',titleKey:'ch_bat',unit:'V',yMin:9,yMax:15,refLine:{value:12,label:'12V',color:'rgba(255,48,48,0.5)'},datasets:[{label:'BAT',field:'bat_min',color:C.green,alarmThreshold:12,alarmAbove:false}]},
  {id:'eld',group:'elec',titleKey:'ch_eld',unit:'A',datasets:[{label:'ELD',field:'eld_mean',color:C.yellow}]},
  {id:'flow',group:'fuel',titleKey:'ch_flow',unit:'l/h',yMin:0,datasets:[{label:'Flow',field:'fuel_flow_mean',color:C.orange}]},
  {id:'consump',group:'fuel',titleKey:'ch_consump',unit:'km/l',yMin:0,datasets:[{label:'Consump',field:'inst_consumption',color:C.lime}]},
  {id:'inj',group:'fuel',titleKey:'ch_inj',unit:'ms',yMin:2,datasets:[{label:'Inj Dur',field:'inj_dur',color:C.pink}]},
  {id:'inj_dc',group:'fuel',titleKey:'ch_inj_dc',unit:'%',datasets:[{label:'Inj DC',field:'inj_dc_mean',color:C.purple}]},
  {id:'map',group:'air',titleKey:'ch_map',unit:'PSI',datasets:[{label:'MAP',field:'map_mean',color:C.cyan}]},
  {id:'clv',group:'air',titleKey:'ch_clv',unit:'%',datasets:[{label:'CLV',field:'clv_mean',color:C.gray}]},
  {id:'ltft',group:'afr',titleKey:'ch_ltft',unit:'%',yMin:0,refLine:{value:1.5,label:'ideal',color:'rgba(0,224,96,0.5)'},datasets:[{label:'LTFT',field:'ltft',color:C.orange,alarmThreshold:5,alarmAbove:true}]},
  {id:'stft',group:'afr',titleKey:'ch_stft',unit:'%',yMin:0,datasets:[{label:'STFT',field:'stft_above15_pct',color:C.red}]},
  {id:'lambda',group:'afr',titleKey:'ch_lambda',yMin:0.9,yMax:1.4,refLine:{value:1.0,label:'stoich',color:'rgba(0,224,96,0.5)'},datasets:[{label:'Lambda',field:'lambda',color:C.green}]},
  {id:'iacv',group:'afr',titleKey:'ch_iacv',unit:'%',yMin:0,yMax:90,refLine:{value:38,label:'max ok',color:'rgba(0,207,255,0.45)'},datasets:[{label:'IACV',field:'iacv_mean',color:C.cyan}]},
  {id:'adv',group:'ign',titleKey:'ch_adv',unit:'deg',datasets:[{label:'Adv',field:'adv_mean',color:C.purple}]},
  {id:'knock',group:'ign',titleKey:'ch_knock',datasets:[{label:'Knock',field:'knock_events',color:C.red,alarmThreshold:1,alarmAbove:true}]},
  {id:'ect',group:'temp',titleKey:'ch_ect',unit:'C',yMin:60,refLine:{value:100,label:'100C',color:'rgba(255,48,48,0.5)'},datasets:[{label:'ECT max',field:'ect_max',color:C.red,alarmThreshold:100,alarmAbove:true},{label:'ECT avg',field:'ect_mean',color:C.orange}]},
  {id:'iat',group:'temp',titleKey:'ch_iat',unit:'C',yMin:20,datasets:[{label:'IAT',field:'iat_mean',color:C.yellow}]},
  {id:'rev',group:'motion',titleKey:'ch_rev',unit:'rpm',datasets:[{label:'RPM',field:'rev_max',color:C.pink}]},
  {id:'vmax',group:'motion',titleKey:'ch_vmax',unit:'km/h',yMin:0,datasets:[{label:'Speed',field:'vss_max',color:C.blue}]},
  {id:'km',group:'motion',titleKey:'ch_km',unit:'km',yMin:0,datasets:[{label:'Dist',field:'km_estimated',color:C.teal}]},
  {id:'vtec',group:'motion',titleKey:'ch_vtec',unit:'%',yMin:0,datasets:[{label:'VTEC',field:'vtec_pct',color:C.purple}]},
  {id:'egr',group:'act',titleKey:'ch_egr',unit:'%',datasets:[{label:'EGR',field:'egr_active_pct',color:C.gray}]},
]

const CHART_GROUPS: Record<string,string> = {
  elec:'Electrical',fuel:'Fuel & Injection',air:'Air / Intake',
  afr:'Mixture & AFR',ign:'Ignition',temp:'Temperature',
  motion:'Motion & Dynamics',act:'Actuators',
}

// -- Helpers -----------------------------------------------------------
function fmt(n: number | null | undefined, d = 1): string {
  return (n != null && isFinite(n)) ? n.toFixed(d) : '--'
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

// -- ScoreLineChart -------------------------------------------------------
function ScoreLineChart({ sessions, activeIdx, onSelect }: {
  sessions: { name: string; score: number; col: string }[]
  activeIdx: number
  onSelect: (i: number) => void
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<{destroy:()=>void}|null>(null)

  useEffect(() => {
    if (!canvasRef.current || !sessions.length) return
    import('chart.js').then(({ Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip }) => {
      Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip)
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
      const ctx = canvasRef.current!.getContext('2d')!
      const gradient = ctx.createLinearGradient(0, 0, 0, 120)
      gradient.addColorStop(0, 'rgba(249,115,22,0.18)')
      gradient.addColorStop(1, 'rgba(249,115,22,0.0)')
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sessions.map(s => s.name),
          datasets: [{
            data: sessions.map(s => s.score),
            borderColor: '#f97316',
            pointBackgroundColor: sessions.map((s, i) => i === activeIdx ? s.col : '#1e2740'),
            pointBorderColor: sessions.map((s, i) => i === activeIdx ? s.col : s.col + '80'),
            pointBorderWidth: 2,
            pointRadius: sessions.map((_, i) => i === activeIdx ? 7 : 4),
            pointHoverRadius: 8,
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            backgroundColor: gradient,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          onClick: (_e: unknown, elements: {index: number}[]) => { if (elements[0]) onSelect(elements[0].index) },
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index' as const,
              intersect: false,
              backgroundColor: '#0c0f14', borderColor: '#1a2330', borderWidth: 1,
              titleColor: '#f97316', bodyColor: '#94a3b8',
              titleFont: { family: "'IBM Plex Mono'", size: 11, weight: 'bold' as const },
              bodyFont:  { family: "'IBM Plex Mono'", size: 10 },
              padding: 10,
              callbacks: {
                title: (items: import('chart.js').TooltipItem<'line'>[]) => items[0]?.label ?? '',
                label: (item: import('chart.js').TooltipItem<'line'>) => {
                  const sc = item.parsed.y
                  const col = sessions[item.dataIndex]?.col
                  const status = col === '#00e060' ? 'Healthy' : col === '#ffe000' ? 'Attention' : 'Critical'
                  return ' Score: ' + sc + ' (' + status + ')'
                },
              },
            },
          },
          scales: {
            x: { grid: { color: '#1a2330' }, ticks: { color: '#465a6e', font: { family: "'IBM Plex Mono'", size: 9 }, maxRotation: 30 } },
            y: { grid: { color: '#1a2330' }, ticks: { color: '#465a6e', font: { family: "'IBM Plex Mono'", size: 9 } }, min: 0, max: 100 },
          },
        },
      })
      chartRef.current = chart
    })
    return () => { chartRef.current?.destroy() }
  }, [sessions, activeIdx])

  return <div style={{ position:'relative', height:140 }}><canvas ref={canvasRef} /></div>
}

// -- MiniGauge: semicircle gauge (0-100%) --------------------------------
function MiniGauge({ value, min, max, goodMin, goodMax, color, label }: {
  value: number | null; min: number; max: number
  goodMin: number; goodMax: number; color: string; label: string
}): React.ReactElement {
  const pct = value != null ? Math.max(0, Math.min(1, (value - min) / (max - min))) : null
  const angle = pct != null ? -180 + pct * 180 : null  // -180 = left, 0 = right
  const inGood = value != null && value >= goodMin && value <= goodMax
  const needleColor = inGood ? '#00e060' : '#ff3030'
  // SVG arc helper
  const arc = (pct0: number, pct1: number, r: number, col: string) => {
    const a0 = Math.PI * pct0 - Math.PI
    const a1 = Math.PI * pct1 - Math.PI
    const x0 = 50 + r * Math.cos(a0), y0 = 50 + r * Math.sin(a0)
    const x1 = 50 + r * Math.cos(a1), y1 = 50 + r * Math.sin(a1)
    return <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`} stroke={col} strokeWidth={8} fill="none" strokeLinecap="round" />
  }
  const goodP0 = (goodMin - min) / (max - min)
  const goodP1 = (goodMax - min) / (max - min)
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <svg viewBox="0 0 100 55" style={{ width:100, overflow:'visible' }}>
        {arc(0, 1, 38, '#1e2740')}
        {arc(goodP0, goodP1, 38, color + '60')}
        {angle != null && (() => {
          const rad = angle * Math.PI / 180
          const nx = 50 + 30 * Math.cos(rad), ny = 50 + 30 * Math.sin(rad)
          return <>
            <line x1="50" y1="50" x2={nx} y2={ny} stroke={needleColor} strokeWidth={2} strokeLinecap="round" />
            <circle cx="50" cy="50" r="3" fill={needleColor} />
          </>
        })()}
      </svg>
      <div style={{ fontSize:11, fontWeight:700, color: pct != null ? needleColor : '#475569', fontFamily:'IBM Plex Mono,monospace', marginTop:-8 }}>
        {value != null ? value.toFixed(1) + '%' : '--'}
      </div>
      <div style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono,monospace' }}>{label}</div>
    </div>
  )
}

// -- MiniDonut: small donut chart -----------------------------------------
function MiniDonut({ slices, size }: {
  slices: { value: number; color: string; label: string }[]
  size?: number
}): React.ReactElement {
  const sz = size ?? 80
  const r = sz * 0.38, cx = sz / 2, cy = sz / 2
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0)
  if (total === 0) return <div style={{ width:sz, height:sz }} />
  let angle = -Math.PI / 2
  const paths = slices.map(s => {
    const frac = Math.max(0, s.value) / total
    const sweep = frac * 2 * Math.PI
    const x0 = cx + r * Math.cos(angle), y0 = cy + r * Math.sin(angle)
    const x1 = cx + r * Math.cos(angle + sweep), y1 = cy + r * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    const path = sweep > 0.01
      ? `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
      : ''
    angle += sweep
    return { path, color: s.color, label: s.label, pct: Math.round(frac * 100) }
  })
  return (
    <div style={{ position:'relative', width:sz, height:sz }}>
      <svg viewBox={`0 0 ${sz} ${sz}`} style={{ width:sz, height:sz }}>
        {/* hole */}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#0f1117" />
        {paths.map((p, i) => p.path ? <path key={i} d={p.path} fill={p.color} opacity={0.85} /> : null)}
      </svg>
      {/* Legend */}
      <div style={{ position:'absolute', bottom:-28, left:0, right:0, display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
        {paths.map((p, i) => (
          <span key={i} style={{ fontSize:8, color:p.color, fontFamily:'IBM Plex Mono,monospace' }}>
            {p.label} {p.pct}%
          </span>
        ))}
      </div>
    </div>
  )
}

// -- DiagList component ------------------------------------------------
function DiagList({ alerts, AC }: { alerts: Alert[]; AC: Record<string,string> }): React.ReactElement {
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set())
  const toggle = (i: number): void => setExpanded((p: Set<number>) => {
    const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n
  })
  const icon: Record<string,string> = { bad:'x', warn:'!', good:'v', info:'i' }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:8 }}>
      {alerts.map((a, idx) => {
        const col = AC[a.type]
        const open = expanded.has(idx)
        return (
          <div key={idx} style={{ border:`1px solid ${col}25`, borderRadius:8, overflow:'hidden' }}>
            <button onClick={() => toggle(idx)} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:`${col}08`, border:'none', cursor:'pointer', textAlign:'left' }}>
              <div style={{ width:18, height:18, borderRadius:'50%', border:`1.5px solid ${col}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:9, color:col, fontWeight:800, fontFamily:'IBM Plex Mono,monospace', lineHeight:1 }}>{icon[a.type]}</span>
              </div>
              <span style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:`${col}18`, color:col, letterSpacing:1, flexShrink:0, fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>{a.param}</span>
              <span style={{ fontSize:11, fontWeight:600, color: a.type === 'good' ? '#64748b' : col, flex:1 }}>{a.title}</span>
              <span style={{ fontSize:10, color:'#334155', transform: open ? 'rotate(180deg)' : 'none', display:'inline-block', transition:'transform 0.15s' }}>v</span>
            </button>
            {open && (
              <div style={{ padding:'8px 12px 10px 40px', background:`${col}04`, borderTop:`1px solid ${col}15` }}>
                <p style={{ fontSize:11, color:'#64748b', lineHeight:1.7, fontFamily:'IBM Plex Mono,monospace' }}>{a.detail}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// -- Kpi card ----------------------------------------------------------
function Kpi({ label, value, unit, sub, color, prevValue, lowerIsBetter }: {
  label: string
  value: string | number | null
  unit?: string
  sub?: string
  color?: string
  prevValue?: number | null   // value from previous session for trend arrow
  lowerIsBetter?: boolean     // true = lower value is better (e.g. ECT, LTFT)
}): React.ReactElement {
  const vc = color ?? '#94a3b8'
  // Compute trend
  const numVal = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : null)
  let trend: 'up' | 'down' | null = null
  let trendColor = '#475569'
  let deltaTxt = ''
  if (numVal != null && prevValue != null && isFinite(numVal) && isFinite(prevValue) && prevValue !== 0) {
    const delta = numVal - prevValue
    const pct   = Math.abs(delta / prevValue * 100)
    if (Math.abs(delta) > 0.001) {
      trend = delta > 0 ? 'up' : 'down'
      const improved = lowerIsBetter ? delta < 0 : delta > 0
      trendColor = improved ? '#00e060' : '#ff3030'
      deltaTxt = (delta > 0 ? '+' : '') + (pct < 10 ? delta.toFixed(1) : Math.round(delta).toString()) + (unit ?? '')
    }
  }
  return (
    <div style={{ background:'#1a1f2e', border:'1px solid #2a3040', borderRadius:8, padding:'12px 14px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:vc }} />
      <div style={{ fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase' as const, color:'#64748b', fontFamily:'IBM Plex Mono,monospace', fontWeight:600, marginBottom:8 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:22, fontWeight:700, lineHeight:1, color:vc }}>
          {value ?? '--'}{unit && <span style={{ fontSize:11, color:'#64748b', marginLeft:2 }}>{unit}</span>}
        </div>
        {trend && (
          <div style={{ display:'flex', alignItems:'center', gap:2 }}>
            <span style={{ fontSize:10, color:trendColor, fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>
              {trend === 'up' ? 'u' : 'd'} {deltaTxt}
            </span>
          </div>
        )}
      </div>
      {sub && <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace', marginTop:6 }}>{sub}</div>}
    </div>
  )
}

// -- SecHead -----------------------------------------------------------
function SecHead({ title, color, open, onToggle }: {
  title: string; color: string; open: boolean; onToggle: () => void
}): React.ReactElement {
  return (
    <button onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:10, marginTop:24, marginBottom: open ? 14 : 4, width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
      <div style={{ width:3, height:16, background:color, borderRadius:2 }} />
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' as const, color:'#94a3b8', fontFamily:'IBM Plex Mono,monospace', flex:1 }}>{title}</span>
      <div style={{ flex:1, height:1, background:'#1e2740', maxWidth:200 }} />
      <span style={{ fontSize:11, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{open ? 'v' : '>'}</span>
    </button>
  )
}

// -- Main --------------------------------------------------------------
export default function Home(): React.ReactElement {
  // -- State ------------------------------------------------------------
  const [dbSessions, setDbSessions]             = useState<LogSession[]>([])
  const [localSessions, setLocalSessions]       = useState<LogSession[]>([])
  const [uploading, setUploading]               = useState(false)
  const [uploadProgress, setUploadProgress]     = useState<{current:number;total:number}|null>(null)
  const [activeIdx, setActiveIdx]               = useState<number|null>(null)
  const [tab, setTab]                           = useState<Tab>('overview')
  const [lang, setLang]                         = useState<Lang>('en')
  const [collapsedSecs, setCollapsedSecs]       = useState<Set<SecKey>>(new Set())
  const DEFAULT_SECTION_ORDER: SecKey[] = ['diag','elec','fuel','air','afr','ign','temp','idle','motion','act','perf']
  const [sectionOrder, setSectionOrder]         = useState<SecKey[]>(DEFAULT_SECTION_ORDER)
  const [dragSec, setDragSec]                   = useState<SecKey|null>(null)
  const [formulaOpen, setFormulaOpen]           = useState(false)
  const [dragOverSec, setDragOverSec]           = useState<SecKey|null>(null)
  // Session notes: { [profileKey]: { [sessionName]: string } }
  const [sessionNotes, setSessionNotes]         = useState<Record<string,Record<string,string>>>({})
  const [editingNote, setEditingNote]           = useState<string|null>(null)  // session name being edited
  const [compareIdx, setCompareIdx]             = useState<number|null>(null)   // index of session to compare with
  const allParamKeys                            = ['bat','alt_fr','eld_curr','fuel_flow','fuel_inst','inj_dur','inj_dc','inj_fr','map_psi','map_wot','iat','clv','ltft','stft','lambda','fls','iacv_dc','ign_adv','ign_lim','knock','ect','ect_hot','fan','iacv_dc2','rev','vss','lng_accel','km_est','vtec','egr','mil']
  const [visibleParams, setVisibleParams]       = useState<Set<string>>(new Set(allParamKeys))
  const [paramFilterOpen, setParamFilterOpen]   = useState(false)
  const [visibleCharts, setVisibleCharts]       = useState<Set<string>>(new Set(CHART_DEFS.map(c => c.id)))
  const [chartFilterOpen, setChartFilterOpen]   = useState(false)
  const [collapsedGroups, setCollapsedGroups]   = useState<Set<string>>(new Set())
  // Car profiles
  const [carModalOpen, setCarModalOpen]         = useState(false)
  const [carModalMode, setCarModalMode]         = useState<'list'|'add'>('list')
  const [carModalStep, setCarModalStep]         = useState<'model'|'year'|'trim'>('model')
  const [selModel, setSelModel]                 = useState<string|null>(null)
  const [selYear, setSelYear]                   = useState<number|null>(null)
  const [selTrim, setSelTrim]                   = useState<string|null>(null)
  const [profileName, setProfileName]           = useState('')
  const [savedProfiles, setSavedProfiles]       = useState<Profile[]>([])
  const [activeProfileKey, setActiveProfileKey] = useState<string|null>(null)
  const [profileSessions, setProfileSessions]   = useState<Record<string,LogSession[]>>({})
  const [hydrated, setHydrated]                 = useState(false)
  const carModalRef                             = useRef<HTMLDivElement>(null)

  const t = (k: string): string => (T[lang as Lang] ?? T.en)[k as string] ?? k

  // -- Effects -----------------------------------------------------------
  // Load from localStorage on mount (client only)
  useEffect(() => {
    try {
      const profiles = JSON.parse(localStorage.getItem('hndsh_profiles') || '[]')
      const activeKey = localStorage.getItem('hndsh_active_profile')
      const sessions  = JSON.parse(localStorage.getItem('hndsh_sessions') || '{}')
      if (profiles.length) setSavedProfiles(profiles)
      if (activeKey) setActiveProfileKey(activeKey)
      if (Object.keys(sessions).length) setProfileSessions(sessions)
      const notes = JSON.parse(localStorage.getItem('hndsh_notes') || '{}')
      if (Object.keys(notes).length) setSessionNotes(notes)
    } catch {}
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever state changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem('hndsh_profiles', JSON.stringify(savedProfiles)) } catch {}
  }, [savedProfiles, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { if (activeProfileKey) localStorage.setItem('hndsh_active_profile', activeProfileKey)
          else localStorage.removeItem('hndsh_active_profile') } catch {}
  }, [activeProfileKey, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem('hndsh_sessions', JSON.stringify(profileSessions)) } catch {}
  }, [profileSessions, hydrated])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem('hndsh_notes', JSON.stringify(sessionNotes)) } catch {}
  }, [sessionNotes, hydrated])

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then((d: {sessions?: LogSession[]}) => {
      if (d.sessions) setDbSessions(d.sessions)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (carModalRef.current && !carModalRef.current.contains(e.target as Node)) {
        setCarModalOpen(false)
      }
    }
    if (carModalOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [carModalOpen])

  // -- Sessions ----------------------------------------------------------
  const profileLocal = activeProfileKey ? (profileSessions[activeProfileKey] ?? []) : localSessions
  const allSessions: LogSession[] = (() => {
    const map = new Map<string,LogSession>()
    if (!activeProfileKey) BASELINE.forEach((s: LogSession) => map.set(s.name, s))
    dbSessions
      .filter((s: LogSession) => !activeProfileKey || (s as LogSession & {profile?: string}).profile === activeProfileKey)
      .forEach((s: LogSession) => map.set(s.name, s))
    profileLocal.forEach((s: LogSession) => map.set(s.name, s))
    // Sort by sort_ts (date of log) ascending, null timestamps go last
    return Array.from(map.values()).sort((a, b) => {
      const ta = a.sort_ts ?? Infinity
      const tb = b.sort_ts ?? Infinity
      return ta - tb
    })
  })()

  const active    = allSessions[activeIdx ?? allSessions.length - 1] ?? null
  const activeI   = activeIdx ?? allSessions.length - 1
  const prevSession = activeI > 0 ? allSessions[activeI - 1] : null
  const alerts    = active ? generateAlerts(active, lang) : []
  const tlLabels  = allSessions.map(s => s.name)
  const isNew     = (s: LogSession) =>
    dbSessions.some((d: LogSession) => d.name === s.name) ||
    profileLocal.some((l: LogSession) => l.name === s.name)
  const hs        = active ? calcHealth(active) : null
  const hsColor   = hs != null ? scoreCol(hs) : '#475569'
  const AC: Record<string,string> = { bad:C.red, warn:C.orange, good:C.green, info:C.blue }

  // -- File upload -------------------------------------------------------
  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    setUploadProgress({ current:0, total:files.length })
    const added: LogSession[] = []
    for (let fi = 0; fi < files.length; fi++) {
      setUploadProgress({ current:fi+1, total:files.length })
      try {
        const { session } = await parseCSVFile(files[fi])
        added.push(session)
        try {
          const res = await fetch('/api/sessions', {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(session),
          })
          if (res.ok) {
            const { session: saved } = await res.json() as { session: LogSession }
            setDbSessions((prev: LogSession[]) => {
              const i = prev.findIndex((s: LogSession) => s.name === saved.name)
              if (i >= 0) { const n = [...prev]; n[i] = saved; return n }
              return [...prev, saved]
            })
          }
        } catch { /* local only */ }
      } catch (e) { console.error('Parse error:', files[fi].name, e) }
    }
    if (activeProfileKey) {
      setProfileSessions((prev: Record<string,LogSession[]>) => {
        const existing = prev[activeProfileKey] ?? []
        const m = new Map(existing.map((s: LogSession) => [s.name, s]))
        added.forEach((s: LogSession) => m.set(s.name, s))
        return { ...prev, [activeProfileKey]: Array.from(m.values()) }
      })
    } else {
      setLocalSessions((prev: LogSession[]) => {
        const m = new Map(prev.map((s: LogSession) => [s.name, s]))
        added.forEach((s: LogSession) => m.set(s.name, s))
        return Array.from(m.values())
      })
    }
    if (added.length > 0) setActiveIdx(allSessions.length + added.length - 1)
    setUploading(false)
    setUploadProgress(null)
  }, [allSessions.length, activeProfileKey])

  // -- Toggles -----------------------------------------------------------
  const toggleSec    = (k: SecKey)  => setCollapsedSecs((p: Set<SecKey>) => { const n = new Set(p); n.has(k)?n.delete(k):n.add(k); return n })
  const toggleParam  = (id: string) => setVisibleParams((p: Set<string>) => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n })
  const toggleChart  = (id: string) => setVisibleCharts((p: Set<string>) => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n })
  const toggleGroup  = (g: string)  => setCollapsedGroups((p: Set<string>) => { const n = new Set(p); n.has(g)?n.delete(g):n.add(g); return n })

  const filteredCharts = CHART_DEFS.filter(c => visibleCharts.has(c.id))
  const chartGroups    = Array.from(new Set(CHART_DEFS.map(c => c.group)))

  const getDate = (s: LogSession): string|null => {
    // Prefer date_start from parsed timestamps
    if (s.date_start) {
      const fmtD = (iso: string): string => {
        const d = new Date(iso + 'T12:00:00Z')
        return lang === 'pt'
          ? d.toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})
          : d.toLocaleDateString('en-US', {month:'short', day:'numeric'})
      }
      const start = fmtD(s.date_start)
      if (s.date_end) {
        const end = fmtD(s.date_end)
        return `${start} - ${end}`
      }
      return start
    }
    // Fallback: created_at from DB
    const ca = (s as LogSession & {created_at?: string}).created_at
    if (!ca) return null
    const d = new Date(ca)
    return lang === 'pt'
      ? d.toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})
      : d.toLocaleDateString('en-US', {month:'short', day:'numeric'})
  }

  // -- Profile helpers ---------------------------------------------------
  const activeProfile = savedProfiles.find((p: Profile) => p.key === activeProfileKey) ?? null
  const profileLabel = activeProfile?.name ?? t('no_car')

  const activateProfile = (key: string) => {
    setActiveProfileKey(key)
    setActiveIdx(null)
    setCarModalOpen(false)
  }

  const deleteProfile = (key: string) => {
    setSavedProfiles((prev: Profile[]) => prev.filter((x: Profile) => x.key !== key))
    setProfileSessions((p: Record<string,LogSession[]>) => { const n = {...p}; delete n[key]; return n })
    if (activeProfileKey === key) { setActiveProfileKey(null); setActiveIdx(null) }
  }

  const saveProfile = () => {
    if (!selModel || !selYear || !selTrim) return
    const key = `${selModel}|${selYear}|${selTrim}`
    const car = CAR_CATALOG.find(c => c.model === selModel)
    const yearDef = car?.years.find(y => y.year === selYear)
    const trimDef = yearDef?.trims.find(tr => tr.trim === selTrim)
    const defaultName = `${selYear} ${selModel.split('/')[0].trim()} ${selTrim}${trimDef ? ` (${trimDef.engine})` : ''}`
    const name = profileName.trim() || defaultName
    setSavedProfiles((prev: Profile[]) => {
      const existing = prev.find((x: Profile) => x.key === key)
      if (existing) return prev.map((x: Profile) => x.key === key ? { ...x, name } : x)
      return [...prev, { key, name }]
    })
    setActiveProfileKey(key)
    setActiveIdx(null)
    setCarModalOpen(false)
    setCarModalMode('list')
    setProfileName('')
  }

  const clearLogs = () => {
    if (activeProfileKey) {
      setProfileSessions((p: Record<string,LogSession[]>) => ({ ...p, [activeProfileKey]: [] }))
    } else {
      setLocalSessions([])
      setDbSessions([])
    }
    setActiveIdx(null)
  }

  // -- Sections data -----------------------------------------------------
  const ALL_SECS: SecKey[] = ['elec','fuel','air','afr','ign','temp','idle','motion','act','diag']

  // Helper to render KPI grid for a section
  const renderSection = (key: SecKey): React.ReactElement|null => {
    if (collapsedSecs.has(key) || !active) return null
    const show = (id: string) => visibleParams.has(id)
    const v = active
    const pv = prevSession  // previous session for trend
    switch(key) {
      case 'elec': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('bat')     && <Kpi label={t('bat')}      value={fmt(v.bat_mean,2)}  unit="V"  sub={`min ${fmt(v.bat_min,2)}V`}  color="#00e060" prevValue={pv?.bat_mean ?? null} lowerIsBetter={false} />}
          {show('alt_fr')  && <Kpi label={t('alt_fr')}   value={fmt(v.alt_fr_mean)} unit="%"                                    color="#00a848" />}
          {show('eld_curr')&& <Kpi label={t('eld_curr')} value={fmt(v.eld_mean,0)}  unit="A"  sub="electrical load"             color="#00cc58" prevValue={pv?.eld_mean ?? null} lowerIsBetter={true} />}
        </div>
      )
      case 'fuel': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('fuel_flow') && <Kpi label={t('fuel_flow')} value={fmt(v.fuel_flow_mean,2)}    unit="l/h"    color="#ff9000" />}
          {show('fuel_inst') && <Kpi label={t('fuel_inst')} value={fmt(v.inst_consumption,1)}  unit="km/l"   color="#ffb040" />}
          {show('inj_dur')   && <Kpi label={t('inj_dur')}   value={fmt(v.inj_dur,2)}           unit="ms"     sub={`DC: ${fmt(v.inj_dc_mean)}%`} color="#ffd080" />}
          {show('inj_dc')    && <Kpi label={t('inj_dc')}    value={fmt(v.inj_dc_mean)}         unit="%"      color="#ff9000" />}
          {show('inj_fr')    && <Kpi label={t('inj_fr')}    value={fmt(v.inj_fr_mean,0)}       unit="cc/min" color="#ffa830" />}

        </div>
      )
      case 'air': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('map_psi') && <Kpi label={t('map_psi')} value={fmt(v.map_mean)} unit="PSI" sub={`WOT: ${fmt(v.map_wot)} PSI`} color="#00cfff" />}
          {show('map_wot') && <Kpi label={t('map_wot')} value={fmt(v.map_wot)} unit="PSI"                                     color="#00b4e0" />}
          {show('iat')     && <Kpi label={t('iat')}     value={fmt(v.iat_mean)} unit="C"   sub={`max ${fmt(v.iat_max)}C`}     color="#80dfff" />}
          {show('clv')     && <Kpi label={t('clv')}     value={fmt(v.clv_mean)} unit="%"   sub="engine load"                  color="#60c8e8" />}
        </div>
      )
      case 'afr': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('ltft')    && <Kpi label={t('ltft')}    value={(v.ltft != null && v.ltft > 0 ? '+' : '') + fmt(v.ltft)} unit="%" sub="ideal: +-1.5%" color="#80e000" prevValue={pv?.ltft ?? null} lowerIsBetter={true} />}
          {show('stft')    && <Kpi label={t('stft')}    value={fmt(v.stft_above15_pct)} unit="%"                                                    color="#a0f020"  prevValue={pv?.stft_above15_pct ?? null} lowerIsBetter={true} />}
          {show('lambda')  && <Kpi label={t('lambda')}  value={fmt(v.lambda,3)}         sub="ideal: ~1.000"                                         color="#c0ff60"  prevValue={pv?.lambda ?? null} lowerIsBetter={true} />}
          {show('fls')     && <Kpi label={t('fls')}     value={fmt(v.closed_loop_pct)} unit="%" sub="closed loop"                                    color="#60b800"  />}
          {show('iacv_dc') && <Kpi label={t('iacv_dc')} value={fmt(v.iacv_mean)} unit="%" sub="expected: 30-38%"                                     color="#50a000"  prevValue={pv?.iacv_mean ?? null} lowerIsBetter={true} />}

        </div>
      )
      case 'ign': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('ign_adv') && <Kpi label={t('ign_adv')} value={fmt(v.adv_mean)}       unit="deg" sub={`max ${fmt(v.adv_max)}deg`} color="#c060ff" />}
          {show('ign_lim') && <Kpi label={t('ign_lim')} value={fmt(v.ign_limit_mean)} unit="deg"                                  color="#9040dd" />}
          {show('knock')   && <Kpi label={t('knock')}   value={v.knock_events ?? '--'} sub={`max ${fmt(v.knock_max,3)}V`}          color={v.knock_events === 0 ? '#c060ff' : C.red} prevValue={pv?.knock_events ?? null} lowerIsBetter={true} />}
        </div>
      )
      case 'temp': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('ect')     && <Kpi label={t('ect')}     value={fmt(v.ect_mean)} unit="C" sub={`max ${fmt(v.ect_max)}C`}  color="#ff3030" prevValue={pv?.ect_mean ?? null} lowerIsBetter={true} />}
          {show('ect_hot') && <Kpi label={t('ect_hot')} value={fmt(v.ect_above95_pct)} unit="%"                           color="#ff6060" />}
          {show('fan')     && <Kpi label={t('fan')}     value={fmt(v.fan_on_pct)} unit="%"                                color="#ff9090" />}
        </div>
      )
      case 'idle': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('iacv_dc2') && <Kpi label={t('iacv_dc2')} value={fmt(v.iacv_mean)}   unit="%" sub="expected: 30-38%"         color="#00b4a0" />}
          {show('rev')      && <Kpi label={t('rev')}       value={fmt(v.rev_mean,0)} unit="rpm" sub={`max ${fmt(v.rev_max,0)} rpm`} color="#00d4bc" />}
        </div>
      )
      case 'motion': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('vss')       && <Kpi label={lang==='en'?'Avg Speed':'Veloc. Media'} value={fmt(v.vss_mean)} unit="km/h" color="#4080ff" />}
          {show('vss')       && <Kpi label={lang==='en'?'Top Speed':'Veloc. Max.'}  value={fmt(v.vss_max,0)} unit="km/h" color="#2060ff" />}
          {show('lng_accel') && <Kpi label={t('lng_accel')} value={fmt(v.lng_accel_max,3)} unit="G" sub={`brake ${fmt(v.lng_accel_min,3)}G`} color="#80a8ff" />}
          {show('km_est')    && <Kpi label={t('km_est')}    value={fmt(v.km_estimated,1)} unit="km"                                    color="#2060e0" />}
          {show('vtec')      && <Kpi label={lang==='en'?'VTEC Active':'VTEC Ativo'} value={fmt(v.vtec_pct)} unit="%" color="#60a0ff" />}
        </div>
      )
      case 'act': return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:8 }}>
          {show('egr') && <Kpi label={t('egr')} value={fmt(v.egr_active_pct)} unit="%" color="#8090a0" />}
          {show('mil') && <Kpi label={t('mil')} value={v.mil_on_pct ? t('active_str') : 'OFF'} sub={v.mil_on_pct ? `${fmt(v.mil_on_pct)}%` : t('noFaults')} color={v.mil_on_pct ? '#ff3030' : '#a0b8a0'} />}
        </div>
      )
      case 'perf': {
        // Values from the currently active session
        const t60  = active.t0_60
        const t100 = active.t0_100
        const t140 = active.t0_140
        const vmax = active.vmax ?? active.vss_max
        const noData = t60 === null && t100 === null && t140 === null
        if (noData) return (
          <div style={{ padding:'10px 0 6px', color:'#334155', fontSize:11, fontFamily:'IBM Plex Mono,monospace' }}>
            {lang === 'en' ? 'No sprint detected. Logs must start from standstill (<5 km/h).' : 'Nenhuma arrancada detectada. Log precisa partir do 0 (< 5 km/h).'}
          </div>
        )
        return (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:8 }}>
            {t60  != null && <Kpi label={t('t0_60')}  value={t60.toFixed(2)}  unit="s"    color="#00e060" />}
            {t100 != null && <Kpi label={t('t0_100')} value={t100.toFixed(2)} unit="s"    color="#f97316" />}
            {t140 != null && <Kpi label={t('t0_140')} value={t140.toFixed(2)} unit="s"    color="#ff3030" />}
            {vmax != null && <Kpi label={lang==='en'?'Top Speed':'V. Max.'} value={vmax.toFixed(0)} unit="km/h" color="#c060ff" />}
          </div>
        )
      }
      default: return null
    }
  }

  // -- Render ------------------------------------------------------------
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#0f1117', fontFamily:"'IBM Plex Sans',sans-serif", color:'#e2e8f0' }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:52, background:'#111827', borderBottom:'1px solid #1e2740', flexShrink:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
            <span style={{ fontSize:15, fontWeight:800, letterSpacing:3, color:'#f97316', fontFamily:'IBM Plex Mono,monospace' }}>HNDSH</span>
            <span style={{ fontSize:12, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>.meters</span>
          </div>
          <div style={{ width:1, height:18, background:'#1e2740' }} />

          {/* Car profile button */}
          <div style={{ position:'relative' }} ref={carModalRef}>
            <button
              onClick={() => { setCarModalOpen((o: boolean) => !o); setCarModalMode(savedProfiles.length > 0 ? 'list' : 'add'); setCarModalStep('model') }}
              style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, padding:'4px 12px', border:'1px solid', borderColor: carModalOpen ? '#f97316' : '#1e2740', borderRadius:6, background: carModalOpen ? '#2a1a0a' : '#161c2a', color: activeProfileKey ? '#f97316' : '#64748b', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600, letterSpacing:1 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              {profileLabel}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {/* Car modal */}
            {carModalOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, width:460, background:'#111827', border:'1px solid #1e2740', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', zIndex:100, overflow:'hidden' }}>
                {/* Modal header */}
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e2740', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#f97316', letterSpacing:2, textTransform:'uppercase', fontFamily:'IBM Plex Mono,monospace' }}>{t('my_cars')}</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {carModalMode === 'list' && (
                      <button onClick={() => { setCarModalMode('add'); setCarModalStep('model'); setSelModel(null); setSelYear(null); setSelTrim(null); setProfileName('') }}
                        style={{ fontSize:10, padding:'3px 10px', border:'1px solid #f97316', borderRadius:4, background:'transparent', color:'#f97316', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600 }}>
                        + {t('add_car')}
                      </button>
                    )}
                    {carModalMode === 'add' && savedProfiles.length > 0 && (
                      <button onClick={() => setCarModalMode('list')} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e2740', borderRadius:4, background:'transparent', color:'#64748b', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>
                        {lang === 'en' ? 'Back' : 'Voltar'}
                      </button>
                    )}
                    <button onClick={() => setCarModalOpen(false)} style={{ fontSize:16, color:'#475569', background:'none', border:'none', cursor:'pointer', lineHeight:1, padding:'0 2px' }}>x</button>
                  </div>
                </div>

                {/* List mode */}
                {carModalMode === 'list' && (
                  <div style={{ maxHeight:320, overflowY:'auto' }}>
                    {savedProfiles.length === 0 ? (
                      <div style={{ padding:'24px 16px', textAlign:'center' }}>
                        <p style={{ fontSize:12, color:'#475569', fontFamily:'IBM Plex Mono,monospace', marginBottom:12 }}>{lang === 'en' ? 'No saved profiles yet.' : 'Nenhum perfil salvo ainda.'}</p>
                        <button onClick={() => { setCarModalMode('add'); setCarModalStep('model') }} style={{ fontSize:11, padding:'6px 16px', border:'1px solid #f97316', borderRadius:6, background:'transparent', color:'#f97316', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600 }}>
                          + {t('add_car')}
                        </button>
                      </div>
                    ) : savedProfiles.map((prof: Profile) => {
                      const isAct = activeProfileKey === prof.key
                      return (
                        <div key={prof.key} style={{ padding:'12px 16px', borderBottom:'1px solid #161c2a', cursor:'pointer', background: isAct ? '#1a2035' : 'transparent', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}
                          onClick={() => activateProfile(prof.key)}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color: isAct ? '#f97316' : '#e2e8f0', marginBottom:2 }}>{prof.name}</div>
                            <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{prof.key.split('|').join(' - ')}</div>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            {isAct && <span style={{ fontSize:9, background:'#1a2a0a', color:C.green, padding:'2px 7px', borderRadius:3, fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>ACTIVE</span>}
                            <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteProfile(prof.key) }}
                              style={{ fontSize:9, color:'#dc2626', background:'none', border:'1px solid #7f1d1d', borderRadius:3, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', padding:'2px 6px' }}>
                              x
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add mode */}
                {carModalMode === 'add' && (
                  <div>
                    {/* Breadcrumbs */}
                    <div style={{ display:'flex', gap:6, padding:'8px 16px', borderBottom:'1px solid #1e2740' }}>
                      {(['model','year','trim'] as const).map((step, i) => (
                        <button key={step}
                          onClick={() => { if(i===0 || (i===1&&selModel) || (i===2&&selModel&&selYear)) setCarModalStep(step) }}
                          style={{ fontSize:10, padding:'2px 8px', borderRadius:4, border:'1px solid', borderColor: carModalStep===step ? '#f97316' : '#1e2740', background: carModalStep===step ? '#2a1a0a' : 'transparent', color: carModalStep===step ? '#f97316' : '#475569', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>
                          {i===0 ? t('step_model') : i===1 ? (selYear ? `${selYear}` : t('step_year')) : (selTrim || t('step_trim'))}
                        </button>
                      ))}
                    </div>
                    {/* Step: Model */}
                    {carModalStep === 'model' && (
                      <div style={{ maxHeight:260, overflowY:'auto' }}>
                        {CAR_CATALOG.map(car => (
                          <div key={car.model} onClick={() => { setSelModel(car.model); setSelYear(null); setSelTrim(null); setCarModalStep('year') }}
                            style={{ padding:'10px 16px', borderBottom:'1px solid #161c2a', cursor:'pointer', background: selModel===car.model ? '#1a2035' : 'transparent' }}>
                            <div style={{ fontSize:12, fontWeight:600, color: selModel===car.model ? '#f97316' : '#e2e8f0' }}>{car.model}</div>
                            <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{car.years[0].year} - {car.years[car.years.length-1].year}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Step: Year */}
                    {carModalStep === 'year' && selModel && (
                      <div style={{ maxHeight:260, overflowY:'auto' }}>
                        {(CAR_CATALOG.find(c => c.model === selModel)?.years ?? []).map(yd => (
                          <div key={yd.year} onClick={() => { setSelYear(yd.year); setSelTrim(null); setCarModalStep('trim') }}
                            style={{ padding:'10px 16px', borderBottom:'1px solid #161c2a', cursor:'pointer', background: selYear===yd.year ? '#1a2035' : 'transparent', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ fontSize:13, fontWeight:700, color: selYear===yd.year ? '#f97316' : '#e2e8f0', fontFamily:'IBM Plex Mono,monospace' }}>{yd.year}</span>
                            <span style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{yd.trims.length} {lang==='en'?'trims':'versoes'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Step: Trim + name */}
                    {carModalStep === 'trim' && selModel && selYear && (
                      <div>
                        <div style={{ maxHeight:180, overflowY:'auto' }}>
                          {(CAR_CATALOG.find(c => c.model === selModel)?.years.find(y => y.year === selYear)?.trims ?? []).map(td => (
                            <div key={td.trim} onClick={() => setSelTrim(td.trim)}
                              style={{ padding:'10px 16px', borderBottom:'1px solid #161c2a', cursor:'pointer', background: selTrim===td.trim ? '#1a2035' : 'transparent' }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                                <span style={{ fontSize:12, fontWeight:700, color: selTrim===td.trim ? '#f97316' : '#e2e8f0' }}>{td.trim}</span>
                                <span style={{ fontSize:11, fontFamily:'IBM Plex Mono,monospace', color:C.cyan, fontWeight:700 }}>{td.engine} - {td.hp}hp</span>
                              </div>
                              <div style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{td.notes}</div>
                            </div>
                          ))}
                        </div>
                        {selTrim && (
                          <div style={{ padding:'12px 16px', borderTop:'1px solid #1e2740', background:'#0f1117' }}>
                            <div style={{ fontSize:10, color:'#64748b', fontFamily:'IBM Plex Mono,monospace', marginBottom:6 }}>{t('car_name_label')}</div>
                            <div style={{ display:'flex', gap:8 }}>
                              <input type="text" value={profileName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileName(e.target.value)}
                                placeholder={t('car_name_ph')}
                                style={{ flex:1, background:'#161c2a', border:'1px solid #1e2740', borderRadius:5, padding:'6px 10px', color:'#e2e8f0', fontSize:12, fontFamily:'IBM Plex Mono,monospace', outline:'none' }}
                              />
                              <button onClick={saveProfile} style={{ padding:'6px 14px', background:'#f97316', border:'none', borderRadius:5, color:'#000', fontSize:11, fontFamily:'IBM Plex Mono,monospace', fontWeight:700, cursor:'pointer' }}>
                                {t('confirm_save')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding:'6px 16px', borderTop:'1px solid #1e2740' }}>
                  <p style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono,monospace' }}>
                    {lang==='en' ? 'Each profile has its own log history.' : 'Cada perfil tem seu proprio historico de logs.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {allSessions.length > 0 && activeProfileKey && (
            <span style={{ fontSize:11, padding:'3px 10px', border:'1px solid #14532d', borderRadius:5, color:C.green, background:'#052e16', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>
              {allSessions.length} {lang === 'en' ? 'logs' : 'logs'}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', alignItems:'center', height:52 }}>
          {(['overview','timeline','table','score'] as Tab[])
            .filter(tb => activeProfileKey || tb === 'overview')
            .map(tb => (
              <button key={tb} onClick={() => setTab(tb)} style={{ padding:'0 16px', height:52, border:'none', borderBottom: tab===tb ? '2px solid #f97316' : '2px solid transparent', background:'transparent', color: tab===tb ? '#f97316' : '#64748b', fontSize:11, letterSpacing:2, textTransform:'uppercase', cursor:'pointer', fontWeight: tab===tb ? 700 : 400, fontFamily:'IBM Plex Mono,monospace' }}>
                {tb === 'score' ? 'Score' : t(tb)}
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

        {/* SIDEBAR - only on overview when profile active */}
        {tab === 'overview' && activeProfileKey && (
          <div style={{ width:200, flexShrink:0, background:'#111827', borderRight:'1px solid #1e2740', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Health score circle */}
            {hs != null && (
              <button onClick={() => setTab('score')} style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%', padding:'16px 14px 12px', background:'none', border:'none', cursor:'pointer', gap:4, borderBottom:'1px solid #1e2740' }}>
                <div style={{ width:72, height:72, borderRadius:'50%', border:`3px solid ${hsColor}`, display:'flex', alignItems:'center', justifyContent:'center', background:`${hsColor}12` }}>
                  <span style={{ fontSize:28, fontWeight:900, color:hsColor, fontFamily:'IBM Plex Mono,monospace', lineHeight:1 }}>{hs}</span>
                </div>
                <span style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono,monospace', letterSpacing:1.5, textTransform:'uppercase' }}>health score</span>
              </button>
            )}
            {/* Sessions header + clear */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:'1px solid #1e2740' }}>
              <span style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontWeight:700 }}>{t('sessions')}</span>
              {allSessions.length > 0 && (
                <button onClick={clearLogs} style={{ fontSize:9, color:'#475569', background:'none', border:'1px solid #1e2740', borderRadius:3, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', padding:'2px 6px' }}>
                  {lang === 'en' ? 'Clear' : 'Limpar'}
                </button>
              )}
            </div>
            {/* Session list */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {allSessions.map((s, i) => {
                const isActive = s.name === active?.name
                const dot = s.ltft != null ? (s.ltft <= 2.5 ? C.green : s.ltft <= 4 ? C.yellow : C.red) : '#334155'
                const dateStr = getDate(s)
                const sc = calcHealth(s)
                const scCol = scoreCol(sc)
                return (
                  <div key={s.name} onClick={() => setActiveIdx(i)} style={{ padding:'10px 14px', borderBottom:'1px solid #161c2a', cursor:'pointer', position:'relative', background: isActive ? '#1a2035' : 'transparent' }}>
                    {isActive && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:'#f97316' }} />}
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }} />
                      <span style={{ fontSize:11, fontWeight:700, color: isActive ? '#f97316' : (dateStr ? '#e2e8f0' : '#94a3b8'), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, fontFamily:'IBM Plex Mono,monospace' }}>
                        {dateStr ?? s.name}
                      </span>
                      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveIdx(i); setTab('score') }}
                        style={{ width:22, height:22, borderRadius:'50%', border:`1.5px solid ${scCol}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:0 }}>
                        <span style={{ fontSize:8, fontFamily:'IBM Plex Mono,monospace', fontWeight:800, color:scCol }}>{sc}</span>
                      </button>
                      {!isActive && (
                        <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setCompareIdx(compareIdx === i ? null : i) }}
                          title={lang === 'en' ? 'Compare with active' : 'Comparar com ativo'}
                          style={{ width:18, height:18, borderRadius:3, border:`1px solid ${compareIdx === i ? '#f97316' : '#1e2740'}`, background: compareIdx === i ? '#2a1a0a' : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:0 }}>
                          <span style={{ fontSize:7, color: compareIdx === i ? '#f97316' : '#334155', fontFamily:'IBM Plex Mono,monospace', fontWeight:800 }}>VS</span>
                        </button>
                      )}
                    </div>
                    {dateStr && <div style={{ fontSize:10, color:'#475569', paddingLeft:14, fontFamily:'IBM Plex Mono,monospace' }}>{s.name}</div>}
                    {isNew(s) && <span style={{ fontSize:8, background:'#1e3a5f', color:'#60a5fa', padding:'1px 5px', borderRadius:3, fontWeight:700, fontFamily:'IBM Plex Mono,monospace', marginLeft:14 }}>NEW</span>}
                    {/* Note display/edit */}
                    {editingNote === s.name ? (
                      <input
                        autoFocus
                        defaultValue={(sessionNotes[activeProfileKey!] ?? {})[s.name] ?? ''}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          const note = e.target.value.trim()
                          setSessionNotes((prev: Record<string,Record<string,string>>) => ({
                            ...prev,
                            [activeProfileKey!]: { ...(prev[activeProfileKey!] ?? {}), [s.name]: note }
                          }))
                          setEditingNote(null)
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        placeholder={lang === 'en' ? 'Add note...' : 'Adicionar nota...'}
                        style={{ width:'100%', marginTop:4, marginLeft:14, background:'#1e2740', border:'1px solid #f97316', borderRadius:3, padding:'2px 6px', color:'#e2e8f0', fontSize:9, fontFamily:'IBM Plex Mono,monospace', outline:'none' }}
                      />
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:14, marginTop:2 }}>
                        {(sessionNotes[activeProfileKey!] ?? {})[s.name] ? (
                          <span style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono,monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {(sessionNotes[activeProfileKey!] ?? {})[s.name]}
                          </span>
                        ) : null}
                        <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditingNote(s.name) }}
                          style={{ fontSize:8, color:'#334155', background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
                          {(sessionNotes[activeProfileKey!] ?? {})[s.name] ? 'edit' : '+note'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Upload zone */}
            <div style={{ padding:10, borderTop:'1px solid #1e2740' }}>
              <div
                onClick={() => (document.getElementById('csv-up') as HTMLInputElement|null)?.click()}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#f97316' }}
                onDragLeave={(e: React.DragEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2740' }}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2740'; const fs = (Array.from(e.dataTransfer.files) as File[]).filter((f: File) => f.name.endsWith('.csv')); if (fs.length) handleFiles(fs) }}
                style={{ border:'1.5px dashed #1e2740', borderRadius:8, padding:'12px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}
              >
                <input id="csv-up" type="file" accept=".csv" multiple style={{ display:'none' }} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = Array.from(e.target.files ?? []) as File[]; if (f.length) handleFiles(f); e.target.value = '' }} />
                {uploading && uploadProgress ? (
                  <>
                    <span style={{ fontSize:10, fontWeight:600, color:'#f97316', fontFamily:'IBM Plex Mono,monospace', textAlign:'center' }}>{uploadProgress.current}/{uploadProgress.total}</span>
                    <div style={{ width:'100%', height:4, background:'#1e2740', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.round(uploadProgress.current/uploadProgress.total*100)}%`, background:'#f97316', borderRadius:2, transition:'width 0.3s ease' }} />
                    </div>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style={{ fontSize:10, fontWeight:600, color:'#64748b', fontFamily:'IBM Plex Mono,monospace', textAlign:'center' }}>{t('upload_drag')}</span>
                    <span style={{ fontSize:9, color:'#334155', fontFamily:'IBM Plex Mono,monospace', textAlign:'center', lineHeight:1.5 }}>{t('upload_sub')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* Welcome screen */}
          {!activeProfileKey && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:24, textAlign:'center' }}>
              <div style={{ fontSize:48, color:'#f97316', fontFamily:'IBM Plex Mono,monospace', fontWeight:900, letterSpacing:4 }}>HNDSH</div>
              <div>
                <h1 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', marginBottom:8 }}>{lang === 'en' ? 'Welcome to HNDSH.meters' : 'Bem-vindo ao HNDSH.meters'}</h1>
                <p style={{ fontSize:14, color:'#64748b', maxWidth:400, lineHeight:1.7 }}>
                  {lang === 'en' ? 'Select your car profile to start analyzing your OBD1 logs.' : 'Selecione o perfil do seu carro para comecar a analisar seus logs OBD1.'}
                </p>
              </div>
              <button
                onClick={() => { setCarModalOpen(true); setCarModalMode(savedProfiles.length > 0 ? 'list' : 'add'); setCarModalStep('model') }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 28px', background:'#f97316', border:'none', borderRadius:10, color:'#000', fontSize:14, fontFamily:'IBM Plex Mono,monospace', fontWeight:800, cursor:'pointer', letterSpacing:1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                {t('my_cars')}
              </button>
              <p style={{ fontSize:11, color:'#334155', fontFamily:'IBM Plex Mono,monospace' }}>Honda/Acura OBD1 1992-2001</p>
            </div>
          )}

          {/* OVERVIEW */}
          {activeProfileKey && tab === 'overview' && active && (
            <div>
              {/* Compare banner */}
              {compareIdx !== null && allSessions[compareIdx] && (() => {
                const cmp = allSessions[compareIdx]
                const fields: {key: keyof typeof active; label: string; unit: string; lowerBetter: boolean}[] = [
                  {key:'ltft',             label:'LTFT',          unit:'%',    lowerBetter:true},
                  {key:'stft_above15_pct', label:'STFT >15%',     unit:'%',    lowerBetter:true},
                  {key:'lambda',           label:'Lambda',        unit:'',     lowerBetter:true},
                  {key:'iacv_mean',        label:'IACV',          unit:'%',    lowerBetter:true},
                  {key:'ect_mean',         label:'ECT avg',       unit:'C',    lowerBetter:true},
                  {key:'bat_mean',         label:'BAT avg',       unit:'V',    lowerBetter:false},
                  {key:'knock_events',     label:'Knock',         unit:'',     lowerBetter:true},
                  {key:'vtec_pct',         label:'VTEC',          unit:'%',    lowerBetter:false},
                  {key:'inst_consumption', label:'km/l',          unit:'km/l', lowerBetter:false},
                  {key:'vss_max',          label:'Top Speed',     unit:'km/h', lowerBetter:false},
                ]
                const activeScore = calcHealth(active)
                const cmpScore    = calcHealth(cmp)
                return (
                  <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:'#f97316', fontFamily:'IBM Plex Mono,monospace', textTransform:'uppercase' }}>
                        {lang === 'en' ? 'Comparing Sessions' : 'Comparando Sessoes'}
                      </span>
                      <button onClick={() => setCompareIdx(null)} style={{ fontSize:10, color:'#475569', background:'none', border:'1px solid #1e2740', borderRadius:4, cursor:'pointer', padding:'2px 8px', fontFamily:'IBM Plex Mono,monospace' }}>
                        {lang === 'en' ? 'Close' : 'Fechar'}
                      </button>
                    </div>
                    {/* Header row */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 40px', gap:8, marginBottom:10, paddingBottom:8, borderBottom:'1px solid #1e2740' }}>
                      <span style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontWeight:700, letterSpacing:1 }}>PARAM</span>
                      <span style={{ fontSize:9, color:'#f97316', fontFamily:'IBM Plex Mono,monospace', fontWeight:700, textAlign:'right' }}>{active.name}</span>
                      <span style={{ fontSize:9, color:'#60a5fa', fontFamily:'IBM Plex Mono,monospace', fontWeight:700, textAlign:'right' }}>{cmp.name}</span>
                      <span style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontWeight:700, textAlign:'center' }}>delta</span>
                    </div>
                    {/* Score row */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 40px', gap:8, padding:'5px 0', borderBottom:'1px solid #161c2a' }}>
                      <span style={{ fontSize:10, color:'#64748b', fontFamily:'IBM Plex Mono,monospace' }}>Health Score</span>
                      <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:scoreCol(activeScore), fontWeight:700, textAlign:'right' }}>{activeScore}</span>
                      <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:scoreCol(cmpScore),    fontWeight:700, textAlign:'right' }}>{cmpScore}</span>
                      <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color: activeScore > cmpScore ? '#00e060' : activeScore < cmpScore ? '#ff3030' : '#475569', textAlign:'center', fontWeight:700 }}>
                        {activeScore > cmpScore ? '+' : ''}{activeScore - cmpScore}
                      </span>
                    </div>
                    {/* Data rows */}
                    {fields.map(f => {
                      const av = active[f.key] as number | null
                      const cv = cmp[f.key]    as number | null
                      if (av == null && cv == null) return null
                      const delta = av != null && cv != null ? av - cv : null
                      const improved = delta != null ? (f.lowerBetter ? delta < 0 : delta > 0) : null
                      const dCol = improved === true ? '#00e060' : improved === false ? '#ff3030' : '#475569'
                      return (
                        <div key={f.key as string} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 40px', gap:8, padding:'5px 0', borderBottom:'1px solid #161c2a' }}>
                          <span style={{ fontSize:10, color:'#64748b', fontFamily:'IBM Plex Mono,monospace' }}>{f.label}</span>
                          <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:'#f97316', fontWeight:600, textAlign:'right' }}>{av != null ? av.toFixed(2) : '--'}{f.unit}</span>
                          <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:'#60a5fa', fontWeight:600, textAlign:'right' }}>{cv != null ? cv.toFixed(2) : '--'}{f.unit}</span>
                          <span style={{ fontSize:9, fontFamily:'IBM Plex Mono,monospace', color:dCol, textAlign:'center', fontWeight:700 }}>
                            {delta != null ? (delta > 0 ? '+' : '') + delta.toFixed(1) : '--'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              {/* Header */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16, flexWrap:'wrap' }}>
                <div>
                  <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{active.name}</h1>
                  <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>
                    {active.rows?.toLocaleString()} rows{active.duration_min ? ` - ${active.duration_min} min` : ''}{active.km_estimated ? ` - ${fmt(active.km_estimated,1)} km` : ''}
                  </span>
                </div>
                <button onClick={() => setParamFilterOpen((o: boolean) => !o)} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', background: paramFilterOpen ? '#1e3a5f' : '#161c2a', border:'1px solid', borderColor: paramFilterOpen ? '#3b82f6' : '#1e2740', borderRadius:7, cursor:'pointer', color: paramFilterOpen ? '#60a5fa' : '#64748b', fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:600, letterSpacing:1 }}>
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
                      <button onClick={() => setVisibleParams(new Set(allParamKeys))} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e3a5f', borderRadius:4, background:'#0f1f3a', color:'#60a5fa', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontWeight:600 }}>{t('select_all')}</button>
                      <button onClick={() => setVisibleParams(new Set())} style={{ fontSize:10, padding:'3px 10px', border:'1px solid #1e2740', borderRadius:4, background:'transparent', color:'#475569', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace' }}>{t('clear_sel')}</button>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:'10px 16px' }}>
                    {allParamKeys.map(id => (
                      <label key={id} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', userSelect:'none' }}>
                        <input type="checkbox" checked={visibleParams.has(id)} onChange={() => toggleParam(id)} style={{ accentColor:'#f97316', width:12, height:12 }} />
                        <span style={{ fontSize:11, color: visibleParams.has(id) ? '#e2e8f0' : '#334155', fontFamily:'IBM Plex Mono,monospace' }}>{id.replace(/_/g,' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis - always first, full width */}
              <SecHead title={t('sec_diag')} color={C.red} open={!collapsedSecs.has('diag')} onToggle={() => toggleSec('diag')} />
              {!collapsedSecs.has('diag') && <DiagList alerts={alerts} AC={AC} />}

              {/* KPI sections - 2 column when wide */}
              <div style={{ columns:'2 400px', columnGap:20 }}>
                {sectionOrder.filter((k: SecKey) => k !== 'diag').map((key: SecKey) => {
                  const colors: Record<string,string> = { elec:C.green, fuel:C.orange, air:C.cyan, afr:C.green, ign:C.purple, temp:C.red, idle:C.teal, motion:C.blue, act:C.gray, perf:'#c060ff' }
                  const rendered = renderSection(key)
                  if (!rendered && collapsedSecs.has(key)) return (
                    <div key={key}
                      draggable
                      onDragStart={() => setDragSec(key)}
                      onDragEnd={() => { setDragSec(null); setDragOverSec(null) }}
                      onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOverSec(key) }}
                      onDragLeave={() => setDragOverSec(null)}
                      onDrop={() => {
                        if (!dragSec || dragSec === key) return
                        setSectionOrder((prev: SecKey[]) => {
                          const next = prev.filter((k: SecKey) => k !== dragSec)
                          const idx  = next.indexOf(key)
                          next.splice(idx, 0, dragSec)
                          return next
                        })
                        setDragSec(null); setDragOverSec(null)
                      }}
                      style={{ breakInside:'avoid', marginBottom:4, cursor:'grab', opacity: dragSec === key ? 0.4 : 1 }}>
                      <SecHead title={t(`sec_${key}`)} color={colors[key] ?? C.gray} open={false} onToggle={() => toggleSec(key)} />
                    </div>
                  )
                  if (!rendered) return null
                  const isDragOver = dragOverSec === key && dragSec !== key
                  return (
                    <div key={key}
                      draggable
                      onDragStart={() => setDragSec(key)}
                      onDragEnd={() => { setDragSec(null); setDragOverSec(null) }}
                      onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOverSec(key) }}
                      onDragLeave={() => setDragOverSec(null)}
                      onDrop={() => {
                        if (!dragSec || dragSec === key) return
                        setSectionOrder((prev: SecKey[]) => {
                          const next = prev.filter((k: SecKey) => k !== dragSec)
                          const idx  = next.indexOf(key)
                          next.splice(idx, 0, dragSec)
                          return next
                        })
                        setDragSec(null); setDragOverSec(null)
                      }}
                      style={{ breakInside:'avoid', marginBottom:4, opacity: dragSec === key ? 0.4 : 1,
                        outline: isDragOver ? `2px dashed ${colors[key] ?? C.gray}` : 'none',
                        borderRadius: isDragOver ? 8 : 0, cursor:'grab', transition:'opacity 0.15s' }}>
                      <SecHead title={t(`sec_${key}`)} color={colors[key] ?? C.gray} open={!collapsedSecs.has(key)} onToggle={() => toggleSec(key)} />
                      {rendered}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {activeProfileKey && tab === 'timeline' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:12 }}>
                <div>
                  <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{t('timeline')}</h1>
                  <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>
                    {allSessions.length} {t('sessions')} - {filteredCharts.length} {t('charts_visible')}
                  </span>
                </div>
                <button onClick={() => setChartFilterOpen((o: boolean) => !o)} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', background: chartFilterOpen ? '#1e3a5f' : '#161c2a', border:'1px solid', borderColor: chartFilterOpen ? '#3b82f6' : '#1e2740', borderRadius:7, cursor:'pointer', color: chartFilterOpen ? '#60a5fa' : '#64748b', fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:600, letterSpacing:1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  {t('filter')}
                </button>
              </div>

              {/* Chart filter */}
              {chartFilterOpen && (
                <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:10, padding:'16px 18px', marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:2, textTransform:'uppercase', fontFamily:'IBM Plex Mono,monospace' }}>Charts</span>
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

              {/* Health score line chart - always first */}
              {allSessions.length > 0 && (
                <div style={{ marginBottom:28 }}>
                  <div style={{ borderBottom:'1px solid #1e2740', paddingBottom:10, marginBottom:16 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', fontFamily:'IBM Plex Mono,monospace' }}>Health Score</span>
                  </div>
                  <ScoreLineChart
                    sessions={allSessions.map(s => ({ name: s.name, score: calcHealth(s), col: scoreCol(calcHealth(s)) }))}
                    activeIdx={activeI}
                    onSelect={(i) => { setActiveIdx(i); setTab('score') }}
                  />
                </div>
              )}

              {/* Chart groups */}
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
                        {charts.map(c => {
                          const chartProps = {
                            title: t(c.titleKey),
                            unit: c.unit,
                            labels: tlLabels,
                            datasets: c.datasets.map(d => ({
                              label: d.label,
                              data: allSessions.map((s: LogSession) => s[d.field] as number|null),
                              color: d.color,
                              ...(d.alarmThreshold != null ? {
                                alarmFn: (v: number) => d.alarmAbove === true ? v >= (d.alarmThreshold as number) : v <= (d.alarmThreshold as number)
                              } : {}),
                            })),
                            yMin: c.yMin,
                            yMax: c.yMax,
                            refLine: c.refLine as {value:number;label:string;color?:string}|undefined,
                          }
                          // key is handled by React runtime, not part of TimelineChartProps
                          return React.createElement(TimelineChart, Object.assign({ key: c.id }, chartProps))
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredCharts.length === 0 && (
                <div style={{ textAlign:'center', padding:'60px 0', color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontSize:13 }}>{t('no_charts')}</div>
              )}
            </div>
          )}

          {/* TABLE */}
          {activeProfileKey && tab === 'table' && (
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
                      const sc = calcHealth(s); const scCol = scoreCol(sc)
                      return (
                        <tr key={s.name} onClick={() => { setActiveIdx(i); setTab('overview') }} style={{ borderBottom:'1px solid #161c2a', background: isNew(s) ? '#1a2035' : 'transparent', cursor:'pointer' }}>
                          <td style={{ padding:'9px 11px', color: isNew(s) ? '#f97316' : '#e2e8f0', fontWeight:700, whiteSpace:'nowrap' }}>{s.name}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.km_estimated,1)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.ect_mean)}C</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.ect_max)}C</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.iat_mean)}C</td>
                          <td style={{ padding:'9px 11px' }}><span className={pillCls(s.ltft,2.5,4)}>{s.ltft != null ? (s.ltft > 0 ? '+':'') + fmt(s.ltft) : '--'}%</span></td>
                          <td style={{ padding:'9px 11px' }}><span className={pillCls(s.stft_above15_pct,3,10)}>{fmt(s.stft_above15_pct)}%</span></td>
                          <td style={{ padding:'9px 11px' }}><span className={pillCls(s.lambda,1.05,1.15)}>{fmt(s.lambda,3)}</span></td>
                          <td style={{ padding:'9px 11px' }}><span className={pillCls(s.iacv_mean,42,55)}>{fmt(s.iacv_mean)}%</span></td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.map_wot)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.adv_mean)}</td>
                          <td style={{ padding:'9px 11px' }}><span className={s.knock_events === 0 ? 'pg':'pr'}>{s.knock_events ?? '--'}</span></td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.inj_dur,2)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.fuel_flow_mean,2)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.inst_consumption,1)}</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.vtec_pct)}%</td>
                          <td style={{ padding:'9px 11px', color:'#94a3b8' }}>{fmt(s.bat_mean,2)}V</td>
                          <td style={{ padding:'9px 11px' }}><span className={!s.mil_on_pct ? 'pg':'pr'}>{s.mil_on_pct ? t('active_str') : 'OFF'}</span></td>
                          <td style={{ padding:'9px 11px' }}><span style={{ fontSize:10, fontWeight:700, color:scCol, fontFamily:'IBM Plex Mono,monospace' }}>{sc}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SCORE */}
          {activeProfileKey && tab === 'score' && active && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>Engine Health Score</h1>
                <span style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{active.name} - weighted composite</span>
              </div>
              {(() => {
                const sc = calcHealth(active)
                const col = scoreCol(sc)
                const label = sc >= 80 ? 'HEALTHY' : sc >= 55 ? 'NEEDS ATTENTION' : 'CRITICAL'
                const breakdown = [
                  {key:'STFT',val:active.stft_above15_pct,weight:20,good:2,bad:15,desc:'Short term correction'},
                  {key:'LTFT',val:Math.abs(active.ltft??0),weight:15,good:2.5,bad:6,desc:'Long term fuel trim'},
                  {key:'Lambda',val:Math.abs((active.lambda??1)-1),weight:15,good:0.05,bad:0.25,desc:'Mixture deviation'},
                  {key:'ECT',val:active.ect_above95_pct,weight:15,good:15,bad:35,desc:'Coolant temp'},
                  {key:'IACV',val:(active.iacv_mean??35)-35,weight:10,good:7,bad:30,desc:'Idle air control'},
                  {key:'Knock',val:active.knock_events,weight:15,good:0,bad:10,desc:'Detonation events'},
                  {key:'BAT',val:active.bat_below12_pct,weight:5,good:0,bad:5,desc:'Voltage drops'},
                  {key:'MIL',val:active.mil_on_pct,weight:5,good:0,bad:1,desc:'Check engine'},
                ]
                return (
                  <>
                    <div style={{ background:'#111827', border:`1px solid ${col}40`, borderRadius:14, padding:'28px 32px', marginBottom:20, display:'flex', alignItems:'center', gap:40, flexWrap:'wrap' }}>
                      <div style={{ textAlign:'center', minWidth:110 }}>
                        <div style={{ fontSize:72, fontWeight:900, color:col, fontFamily:'IBM Plex Mono,monospace', lineHeight:1 }}>{sc}</div>
                        <div style={{ fontSize:10, letterSpacing:3, color:col, fontFamily:'IBM Plex Mono,monospace', fontWeight:700, marginTop:6 }}>{label}</div>
                        <div style={{ fontSize:9, color:'#475569', fontFamily:'IBM Plex Mono,monospace', marginTop:3 }}>out of 100</div>
                      </div>
                      <div style={{ flex:1, minWidth:280, display:'flex', flexDirection:'column', gap:10 }}>
                        {breakdown.map(b => {
                          const range = b.bad - b.good
                          const raw = range > 0 ? Math.min(1, Math.max(0, ((b.val??0) - b.good) / range)) : 0
                          const bScore = Math.round((1-raw)*100)
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
                    <div style={{ background:'#111827', border:'1px solid #1e2740', borderRadius:12, padding:'16px 18px' }}>
                      <div style={{ fontSize:9, letterSpacing:2, color:'#475569', fontFamily:'IBM Plex Mono,monospace', fontWeight:700, textTransform:'uppercase', marginBottom:12 }}>Score Evolution</div>
                      <ScoreLineChart
                        sessions={allSessions.map(s => ({ name: s.name, score: calcHealth(s), col: scoreCol(calcHealth(s)) }))}
                        activeIdx={activeI}
                        onSelect={(i) => setActiveIdx(i)}
                      />
                    </div>
                    {/* Formula explanation - collapsible */}
                    <div style={{ marginTop:20, background:'#0f1117', border:'1px solid #1e2740', borderRadius:10, overflow:'hidden' }}>
                      <button onClick={() => setFormulaOpen((o: boolean) => !o)}
                        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                        <span style={{ fontSize:11, color:'#64748b', fontFamily:'IBM Plex Mono,monospace' }}>
                          {lang==='en' ? 'Click to understand the score' : 'Clique para entender o score'}
                        </span>
                        <span style={{ fontSize:11, color:'#475569', fontFamily:'IBM Plex Mono,monospace', display:'inline-block', transition:'transform 0.2s', transform: formulaOpen ? 'rotate(180deg)' : 'none' }}>v</span>
                      </button>
                      {formulaOpen && (
                        <div style={{ padding:'0 20px 18px' }}>
                          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:'#f97316', fontFamily:'IBM Plex Mono,monospace', textTransform:'uppercase', marginBottom:14 }}>
                            {lang==='en' ? 'Score Formula' : 'Formula do Score'}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            {[
                              { param:'STFT >15%', weight:'20%', ideal:'<2%',  bad:'>15%', desc:lang==='en'?'Short-term correction frequency':'Frequencia de correcao de curto prazo' },
                              { param:'LTFT',      weight:'15%', ideal:'<2.5%',bad:'>6%',  desc:lang==='en'?'Long-term fuel trim':'Trim de combustivel longo prazo' },
                              { param:'Lambda',    weight:'15%', ideal:'<0.05',bad:'>0.25',desc:lang==='en'?'Deviation from stoichiometric (1.0)':'Desvio do estequiometrico (1.0)' },
                              { param:'ECT',       weight:'15%', ideal:'<15%', bad:'>35%', desc:lang==='en'?'Time above 95C':'Tempo acima de 95C' },
                              { param:'IACV',      weight:'10%', ideal:'<42%', bad:'>65%', desc:lang==='en'?'Idle air control (vacuum leak indicator)':'Valvula de ar de marcha lenta (vacuum leak)' },
                              { param:'Knock',     weight:'15%', ideal:'0',    bad:'>10',  desc:lang==='en'?'Detonation events':'Eventos de detonacao' },
                              { param:'Battery',   weight:'5%',  ideal:'0%',   bad:'>5%',  desc:lang==='en'?'Time below 12V':'Tempo abaixo de 12V' },
                              { param:'MIL',       weight:'5%',  ideal:'0%',   bad:'>0%',  desc:lang==='en'?'Check engine on during session':'Check engine ativo na sessao' },
                            ].map(row => (
                              <div key={row.param} style={{ display:'grid', gridTemplateColumns:'80px 40px 1fr 80px 80px', gap:'0 12px', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #1e2740' }}>
                                <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:'#e2e8f0', fontWeight:700 }}>{row.param}</span>
                                <span style={{ fontSize:10, fontFamily:'IBM Plex Mono,monospace', color:'#f97316', fontWeight:700, textAlign:'right' }}>{row.weight}</span>
                                <span style={{ fontSize:10, color:'#475569', fontFamily:'IBM Plex Mono,monospace' }}>{row.desc}</span>
                                <span style={{ fontSize:9, color:'#00e060', fontFamily:'IBM Plex Mono,monospace', textAlign:'right' }}>ok: {row.ideal}</span>
                                <span style={{ fontSize:9, color:'#ff3030', fontFamily:'IBM Plex Mono,monospace', textAlign:'right' }}>bad: {row.bad}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop:12, fontSize:10, color:'#334155', fontFamily:'IBM Plex Mono,monospace', lineHeight:1.7 }}>
                            {lang==='en'
                              ? 'Score = 100 minus weighted deductions. Each parameter is scored 0-100 based on where it falls between the ideal and bad thresholds.'
                              : 'Score = 100 menos deducoes ponderadas. Cada parametro e avaliado de 0-100 com base na posicao entre o ideal e o limite critico.'}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
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
