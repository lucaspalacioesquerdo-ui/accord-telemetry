import type { LogSession } from './supabase'

export type AlertType = 'good' | 'warn' | 'bad' | 'info'

export interface Alert {
  type: AlertType
  title: string
  detail: string
  param: string
}

export function generateAlerts(m: LogSession): Alert[] {
  const alerts: Alert[] = []

  // STFT
  if ((m.stft_above15_pct ?? 0) > 10)
    alerts.push({ type: 'bad', param: 'STFT', title: 'STFT crítico — ECU no limite de correção', detail: `${m.stft_above15_pct?.toFixed(1)}% do tempo acima de +15%. Motor fora de ponto ou vacuum leak severo.` })
  else if ((m.stft_above15_pct ?? 0) > 3)
    alerts.push({ type: 'warn', param: 'STFT', title: 'STFT elevado', detail: `${m.stft_above15_pct?.toFixed(1)}% acima de +15% — monitorar. Possível vacuum leak.` })
  else
    alerts.push({ type: 'good', param: 'STFT', title: 'STFT normalizado', detail: `Apenas ${m.stft_above15_pct?.toFixed(1)}% acima de +15%. Combustão estável.` })

  // LTFT
  if ((m.ltft ?? 0) > 4)
    alerts.push({ type: 'bad', param: 'LTFT', title: 'LTFT alto — mistura pobre crônica', detail: `+${m.ltft?.toFixed(2)}%. ECU compensando muito. Verificar vacuum leaks. Remap necessário pós-swap.` })
  else if ((m.ltft ?? 0) > 2.5)
    alerts.push({ type: 'warn', param: 'LTFT', title: 'LTFT acima do ideal', detail: `+${m.ltft?.toFixed(2)}%. Mistura levemente pobre. Melhora esperada com remap.` })
  else
    alerts.push({ type: 'good', param: 'LTFT', title: 'LTFT dentro do normal', detail: `+${m.ltft?.toFixed(2)}% — bom.` })

  // Lambda
  if ((m.lambda ?? 0) > 1.15)
    alerts.push({ type: 'warn', param: 'Lambda', title: 'Mistura pobre — lambda acima de 1.15', detail: `Lambda médio ${m.lambda?.toFixed(3)}. Ideal: ~1.000. Intake 2.75" sem remap causa isso.` })
  else
    alerts.push({ type: 'good', param: 'Lambda', title: 'Lambda aceitável', detail: `Lambda médio ${m.lambda?.toFixed(3)}.` })

  // IACV
  if ((m.iacv_mean ?? 0) > 55)
    alerts.push({ type: 'bad', param: 'IACV', title: 'IACV muito alto — vacuum leak provável', detail: `${m.iacv_mean?.toFixed(1)}% (esperado 30-38% com motor quente). Ar não medido entrando no motor.` })
  else if ((m.iacv_mean ?? 0) > 42)
    alerts.push({ type: 'warn', param: 'IACV', title: 'IACV elevado — possível vacuum leak', detail: `${m.iacv_mean?.toFixed(1)}% (esperado 30-38%). Checar mangueiras de vacuum no coletor.` })
  else
    alerts.push({ type: 'good', param: 'IACV', title: 'IACV dentro do normal', detail: `${m.iacv_mean?.toFixed(1)}% — marcha lenta estável.` })

  // ECT
  if ((m.ect_above100_pct ?? 0) > 0)
    alerts.push({ type: 'bad', param: 'ECT', title: 'Motor acima de 100°C', detail: `${m.ect_above100_pct?.toFixed(1)}% do tempo acima de 100°C. Verificar arrefecimento em subidas longas.` })
  else if ((m.ect_above95_pct ?? 0) > 25)
    alerts.push({ type: 'warn', param: 'ECT', title: 'ECT alta com frequência', detail: `${m.ect_above95_pct?.toFixed(1)}% do tempo acima de 95°C. Monitorar em subidas.` })
  else
    alerts.push({ type: 'good', param: 'ECT', title: 'Temperatura do motor ok', detail: `Média ${m.ect_mean?.toFixed(1)}°C, pico ${m.ect_max?.toFixed(1)}°C.` })

  // Bateria
  if ((m.bat_below12_pct ?? 0) > 5)
    alerts.push({ type: 'warn', param: 'BAT', title: 'Quedas de tensão recorrentes', detail: `${m.bat_below12_pct?.toFixed(1)}% do tempo abaixo de 12V. Mínimo: ${m.bat_min?.toFixed(2)}V. Verificar ELD e bateria.` })
  else
    alerts.push({ type: 'good', param: 'BAT', title: 'Tensão elétrica estável', detail: `Média ${m.bat_mean?.toFixed(2)}V. Sistema elétrico normal.` })

  // Knock
  if ((m.knock_events ?? 0) === 0)
    alerts.push({ type: 'good', param: 'Knock', title: 'Zero knock', detail: 'Nenhum evento de detonação. Motor saudável.' })
  else
    alerts.push({ type: 'bad', param: 'Knock', title: `${m.knock_events} eventos de knock`, detail: 'Investigar combustível, avanço ou temperatura.' })

  // MIL
  if ((m.mil_on_pct ?? 0) > 0)
    alerts.push({ type: 'bad', param: 'MIL', title: 'Check Engine ativo', detail: `MIL ligado em ${m.mil_on_pct?.toFixed(1)}% do tempo.` })
  else
    alerts.push({ type: 'good', param: 'MIL', title: 'Check Engine desligado', detail: 'Sem falhas ativas registradas.' })

  // IAT
  if ((m.iat_above70_pct ?? 0) > 15)
    alerts.push({ type: 'warn', param: 'IAT', title: 'IAT muito alta', detail: `${m.iat_above70_pct?.toFixed(1)}% acima de 70°C. Ar quente = menos potência. Típico em congestionamento com CAI.` })

  return alerts.sort((a, b) => {
    const order = { bad: 0, warn: 1, good: 2, info: 3 }
    return order[a.type] - order[b.type]
  })
}
