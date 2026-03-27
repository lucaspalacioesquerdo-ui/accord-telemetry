import type { LogSession } from './supabase'

export type AlertType = 'good' | 'warn' | 'bad' | 'info'

export interface Alert {
  type: AlertType
  title: string
  detail: string
  param: string
}

export function generateAlerts(m: LogSession, lang: 'en' | 'pt' = 'en'): Alert[] {
  const alerts: Alert[] = []
  const en = lang === 'en'

  // STFT
  if ((m.stft_above15_pct ?? 0) > 10)
    alerts.push({ type: 'bad', param: 'STFT',
      title: en ? 'STFT critical — ECU at correction limit' : 'STFT crítico — ECU no limite de correção',
      detail: en ? `${m.stft_above15_pct?.toFixed(1)}% of time above +15%. Timing off or severe vacuum leak.` : `${m.stft_above15_pct?.toFixed(1)}% do tempo acima de +15%. Motor fora de ponto ou vacuum leak severo.` })
  else if ((m.stft_above15_pct ?? 0) > 3)
    alerts.push({ type: 'warn', param: 'STFT',
      title: en ? 'STFT elevated' : 'STFT elevado',
      detail: en ? `${m.stft_above15_pct?.toFixed(1)}% above +15% — monitor. Possible vacuum leak.` : `${m.stft_above15_pct?.toFixed(1)}% acima de +15% — monitorar. Possível vacuum leak.` })
  else
    alerts.push({ type: 'good', param: 'STFT',
      title: en ? 'STFT normalized' : 'STFT normalizado',
      detail: en ? `Only ${m.stft_above15_pct?.toFixed(1)}% above +15%. Combustion stable.` : `Apenas ${m.stft_above15_pct?.toFixed(1)}% acima de +15%. Combustão estável.` })

  // LTFT
  if ((m.ltft ?? 0) > 4)
    alerts.push({ type: 'bad', param: 'LTFT',
      title: en ? 'LTFT high — chronic lean mixture' : 'LTFT alto — mistura pobre crônica',
      detail: en ? `+${m.ltft?.toFixed(2)}%. ECU compensating heavily. Check vacuum leaks. Remap needed post-swap.` : `+${m.ltft?.toFixed(2)}%. ECU compensando muito. Verificar vacuum leaks. Remap necessário pós-swap.` })
  else if ((m.ltft ?? 0) > 2.5)
    alerts.push({ type: 'warn', param: 'LTFT',
      title: en ? 'LTFT above ideal' : 'LTFT acima do ideal',
      detail: en ? `+${m.ltft?.toFixed(2)}%. Slightly lean. Expected to improve with remap.` : `+${m.ltft?.toFixed(2)}%. Mistura levemente pobre. Melhora esperada com remap.` })
  else
    alerts.push({ type: 'good', param: 'LTFT',
      title: en ? 'LTFT within normal range' : 'LTFT dentro do normal',
      detail: en ? `+${m.ltft?.toFixed(2)}% — good.` : `+${m.ltft?.toFixed(2)}% — bom.` })

  // Lambda
  if ((m.lambda ?? 0) > 1.15)
    alerts.push({ type: 'warn', param: 'Lambda',
      title: en ? 'Lean mixture — lambda above 1.15' : 'Mistura pobre — lambda acima de 1.15',
      detail: en ? `Avg lambda ${m.lambda?.toFixed(3)}. Ideal: ~1.000. 2.75" intake without remap causes this.` : `Lambda médio ${m.lambda?.toFixed(3)}. Ideal: ~1.000. Intake 2.75" sem remap causa isso.` })
  else
    alerts.push({ type: 'good', param: 'Lambda',
      title: en ? 'Lambda acceptable' : 'Lambda aceitável',
      detail: en ? `Avg lambda ${m.lambda?.toFixed(3)}.` : `Lambda médio ${m.lambda?.toFixed(3)}.` })

  // IACV
  if ((m.iacv_mean ?? 0) > 55)
    alerts.push({ type: 'bad', param: 'IACV',
      title: en ? 'IACV very high — vacuum leak likely' : 'IACV muito alto — vacuum leak provável',
      detail: en ? `${m.iacv_mean?.toFixed(1)}% (expected 30-38% warm). Unmeasured air entering engine.` : `${m.iacv_mean?.toFixed(1)}% (esperado 30-38% quente). Ar não medido entrando no motor.` })
  else if ((m.iacv_mean ?? 0) > 42)
    alerts.push({ type: 'warn', param: 'IACV',
      title: en ? 'IACV elevated — possible vacuum leak' : 'IACV elevado — possível vacuum leak',
      detail: en ? `${m.iacv_mean?.toFixed(1)}% (expected 30-38%). Check vacuum hoses at manifold.` : `${m.iacv_mean?.toFixed(1)}% (esperado 30-38%). Checar mangueiras de vacuum no coletor.` })
  else
    alerts.push({ type: 'good', param: 'IACV',
      title: en ? 'IACV within normal range' : 'IACV dentro do normal',
      detail: en ? `${m.iacv_mean?.toFixed(1)}% — idle stable.` : `${m.iacv_mean?.toFixed(1)}% — marcha lenta estável.` })

  // ECT
  if ((m.ect_above100_pct ?? 0) > 0)
    alerts.push({ type: 'bad', param: 'ECT',
      title: en ? 'Engine above 100°C' : 'Motor acima de 100°C',
      detail: en ? `${m.ect_above100_pct?.toFixed(1)}% of time above 100°C. Check cooling on long climbs.` : `${m.ect_above100_pct?.toFixed(1)}% do tempo acima de 100°C. Verificar arrefecimento em subidas longas.` })
  else if ((m.ect_above95_pct ?? 0) > 25)
    alerts.push({ type: 'warn', param: 'ECT',
      title: en ? 'ECT frequently high' : 'ECT alta com frequência',
      detail: en ? `${m.ect_above95_pct?.toFixed(1)}% of time above 95°C. Monitor on climbs.` : `${m.ect_above95_pct?.toFixed(1)}% do tempo acima de 95°C. Monitorar em subidas.` })
  else
    alerts.push({ type: 'good', param: 'ECT',
      title: en ? 'Engine temperature OK' : 'Temperatura do motor ok',
      detail: en ? `Avg ${m.ect_mean?.toFixed(1)}°C, peak ${m.ect_max?.toFixed(1)}°C.` : `Média ${m.ect_mean?.toFixed(1)}°C, pico ${m.ect_max?.toFixed(1)}°C.` })

  // Battery
  if ((m.bat_below12_pct ?? 0) > 5)
    alerts.push({ type: 'warn', param: 'BAT',
      title: en ? 'Recurring voltage drops' : 'Quedas de tensão recorrentes',
      detail: en ? `${m.bat_below12_pct?.toFixed(1)}% of time below 12V. Min: ${m.bat_min?.toFixed(2)}V. Check ELD and battery.` : `${m.bat_below12_pct?.toFixed(1)}% do tempo abaixo de 12V. Mínimo: ${m.bat_min?.toFixed(2)}V. Verificar ELD e bateria.` })
  else
    alerts.push({ type: 'good', param: 'BAT',
      title: en ? 'Voltage stable' : 'Tensão elétrica estável',
      detail: en ? `Avg ${m.bat_mean?.toFixed(2)}V. Electrical system normal.` : `Média ${m.bat_mean?.toFixed(2)}V. Sistema elétrico normal.` })

  // Knock
  if ((m.knock_events ?? 0) === 0)
    alerts.push({ type: 'good', param: 'Knock',
      title: en ? 'Zero knock' : 'Zero knock',
      detail: en ? 'No detonation events detected. Engine healthy.' : 'Nenhum evento de detonação. Motor saudável.' })
  else
    alerts.push({ type: 'bad', param: 'Knock',
      title: en ? `${m.knock_events} knock events` : `${m.knock_events} eventos de knock`,
      detail: en ? 'Investigate fuel, timing or temperature.' : 'Investigar combustível, avanço ou temperatura.' })

  // MIL
  if ((m.mil_on_pct ?? 0) > 0)
    alerts.push({ type: 'bad', param: 'MIL',
      title: en ? 'Check Engine active' : 'Check Engine ativo',
      detail: en ? `MIL on for ${m.mil_on_pct?.toFixed(1)}% of session.` : `MIL ligado em ${m.mil_on_pct?.toFixed(1)}% do tempo.` })
  else
    alerts.push({ type: 'good', param: 'MIL',
      title: en ? 'Check Engine off' : 'Check Engine desligado',
      detail: en ? 'No active faults recorded.' : 'Sem falhas ativas registradas.' })

  // IAT
  if ((m.iat_above70_pct ?? 0) > 15)
    alerts.push({ type: 'warn', param: 'IAT',
      title: en ? 'IAT very high' : 'IAT muito alta',
      detail: en ? `${m.iat_above70_pct?.toFixed(1)}% above 70°C. Hot air = less power. Typical in traffic with CAI.` : `${m.iat_above70_pct?.toFixed(1)}% acima de 70°C. Ar quente = menos potência. Típico em congestionamento com CAI.` })

  return alerts.sort((a, b) => {
    const order = { bad: 0, warn: 1, good: 2, info: 3 }
    return order[a.type] - order[b.type]
  })
}
