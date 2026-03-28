import type { LogSession } from './supabase'

export type AlertType = 'bad' | 'warn' | 'good' | 'info'

export interface Alert {
  type: AlertType
  param: string
  title: string
  detail: string
  // Smart diagnosis fields
  severity: number      // 0-10, for sorting
  correlation?: string  // related finding
}

// Smart multi-parameter correlations
function analyzeCorrelations(m: LogSession, lang: 'en' | 'pt'): Alert[] {
  const alerts: Alert[] = []
  const en = lang === 'en'

  const stft   = m.stft_above15_pct ?? 0
  const ltft   = m.ltft ?? 0
  const lam    = m.lambda ?? 1
  const iacv   = m.iacv_mean ?? 35
  const ect    = m.ect_above95_pct ?? 0
  const ect100 = m.ect_above100_pct ?? 0
  const knock  = m.knock_events ?? 0
  const bat    = m.bat_mean ?? 13.5
  const batMin = m.bat_min ?? 13.0
  const eld    = m.eld_mean ?? 50
  const mil    = m.mil_on_pct ?? 0
  const iat    = m.iat_mean ?? 40
  const adv    = m.adv_mean ?? 28
  const vtec   = m.vtec_pct ?? 0
  const cl     = m.closed_loop_pct ?? 0

  // ── CORRELATION 1: Vacuum leak pattern ────────────────────────────────────
  // High IACV + elevated LTFT + lean lambda = classic vacuum leak triangle
  const vacuumLeakScore = (iacv > 45 ? 1 : 0) + (ltft > 2.5 ? 1 : 0) + (lam > 1.10 ? 1 : 0) + (stft > 5 ? 1 : 0)
  if (vacuumLeakScore >= 3) {
    alerts.push({
      type: 'bad', param: 'IACV+LTFT+Lambda', severity: 9,
      title: en ? 'Strong vacuum leak signature' : 'Assinatura forte de vacuum leak',
      detail: en
        ? `3 indicators aligned: IACV ${iacv.toFixed(1)}% (expected 30-38%), LTFT +${ltft.toFixed(2)}%, Lambda ${lam.toFixed(3)}. Unmeasured air after MAF sensor is causing lean mixture. Priority: check intake manifold gasket, IACV hoses, and PCV valve.`
        : `3 indicadores alinhados: IACV ${iacv.toFixed(1)}% (esperado 30-38%), LTFT +${ltft.toFixed(2)}%, Lambda ${lam.toFixed(3)}. Ar nao medido apos sensor MAP causa mistura pobre. Prioridade: junta do coletor, mangueiras do IACV e valvula PCV.`,
      correlation: en ? 'IACV + LTFT + Lambda correlation' : 'Correlacao IACV + LTFT + Lambda'
    })
  } else if (vacuumLeakScore === 2 && iacv > 42) {
    alerts.push({
      type: 'warn', param: 'IACV+LTFT', severity: 6,
      title: en ? 'Possible vacuum leak — 2 indicators' : 'Possivel vacuum leak — 2 indicadores',
      detail: en
        ? `IACV ${iacv.toFixed(1)}% elevated with LTFT +${ltft.toFixed(2)}%. Partial vacuum leak or IACV valve wear. Monitor and inspect hoses.`
        : `IACV ${iacv.toFixed(1)}% elevado com LTFT +${ltft.toFixed(2)}%. Vacuum leak parcial ou desgaste da valvula IACV. Monitorar e inspecionar mangueiras.`,
    })
  }

  // ── CORRELATION 2: Intake heat-soak (CAI issue) ───────────────────────────
  // High IAT + lean lambda + elevated LTFT = hot air causing lean mixture
  if (iat > 55 && lam > 1.10 && ltft > 2) {
    alerts.push({
      type: 'warn', param: 'IAT+Lambda', severity: 5,
      title: en ? 'Heat-soak: hot intake air causing lean mixture' : 'Heat-soak: ar de admissao quente causando mistura pobre',
      detail: en
        ? `IAT avg ${iat.toFixed(1)}C — hot air is less dense, causing lean mixture (Lambda ${lam.toFixed(3)}). Cold Air Intake without heat shield worsens this. Consider heat wrap or shield.`
        : `IAT media ${iat.toFixed(1)}C — ar quente e menos denso, causando mistura pobre (Lambda ${lam.toFixed(3)}). CAI sem protetor termico agrava. Considere heat wrap ou protetor.`,
      correlation: en ? 'IAT + Lambda' : 'IAT + Lambda'
    })
  }

  // ── CORRELATION 3: Ignition timing issue ──────────────────────────────────
  // Retarded timing + knock events = detonation under load
  if (knock > 0 && adv < 25) {
    alerts.push({
      type: 'bad', param: 'Knock+ADV', severity: 9,
      title: en ? 'Knock with retarded timing — check fuel grade' : 'Knock com avanco retardado — verificar octanagem',
      detail: en
        ? `${knock} knock events with average advance ${adv.toFixed(1)} deg. ECU already retarding timing to protect engine. Check: fuel octane, carbon deposits, coolant temperature.`
        : `${knock} eventos de knock com avanco medio ${adv.toFixed(1)} graus. ECU ja retardando avanco para proteger o motor. Verificar: octanagem do combustivel, depositos de carbono, temperatura do motor.`,
    })
  } else if (knock > 5) {
    alerts.push({
      type: 'bad', param: 'Knock', severity: 8,
      title: en ? `${knock} knock events detected` : `${knock} eventos de knock detectados`,
      detail: en
        ? `Significant detonation. Check fuel quality, intake temperature, and timing calibration. Persistent knock causes piston damage.`
        : `Detonacao significativa. Verificar qualidade do combustivel, temperatura de admissao e calibracao de avanco. Knock persistente causa danos ao pistao.`,
    })
  }

  // ── CORRELATION 4: Cooling system stress ─────────────────────────────────
  if (ect100 > 0.5 && ect > 25) {
    alerts.push({
      type: 'bad', param: 'ECT', severity: 8,
      title: en ? 'Engine reaching critical temperature' : 'Motor atingindo temperatura critica',
      detail: en
        ? `Above 100C for ${ect100.toFixed(1)}% of session, above 95C for ${ect.toFixed(1)}%. Risk of head gasket failure on sustained climbs. Check thermostat opening temp and coolant level.`
        : `Acima de 100C por ${ect100.toFixed(1)}% da sessao, acima de 95C por ${ect.toFixed(1)}%. Risco de junta de cabecote em subidas longas. Verificar temp de abertura do termostato e nivel do fluido.`,
    })
  } else if (ect > 30) {
    alerts.push({
      type: 'warn', param: 'ECT', severity: 5,
      title: en ? 'Coolant temp frequently above 95C' : 'Temperatura do fluido frequentemente acima de 95C',
      detail: en
        ? `${ect.toFixed(1)}% of time above 95C. Normal for traffic with modified cooling, but monitor on highway climbs.`
        : `${ect.toFixed(1)}% do tempo acima de 95C. Normal em trafego com arrefecimento modificado, mas monitorar em subidas na estrada.`,
    })
  } else {
    alerts.push({
      type: 'good', param: 'ECT', severity: 0,
      title: en ? 'Cooling system healthy' : 'Sistema de arrefecimento saudavel',
      detail: en
        ? `Max ${m.ect_max?.toFixed(1)}C, avg ${m.ect_mean?.toFixed(1)}C. Radiator and thermostat working correctly.`
        : `Max ${m.ect_max?.toFixed(1)}C, media ${m.ect_mean?.toFixed(1)}C. Radiador e termostato funcionando corretamente.`,
    })
  }

  // ── CORRELATION 5: Electrical / charging ─────────────────────────────────
  if (batMin < 12.0 && eld > 60) {
    alerts.push({
      type: 'bad', param: 'BAT+ELD', severity: 7,
      title: en ? 'High electrical load causing voltage drop' : 'Carga eletrica elevada causando queda de tensao',
      detail: en
        ? `Battery dropped to ${batMin.toFixed(2)}V with ELD averaging ${eld.toFixed(0)}A. ELD sensor may be stuck at high reading (known issue). Test: disconnect A/C, check alternator output at idle.`
        : `Bateria caiu para ${batMin.toFixed(2)}V com ELD media ${eld.toFixed(0)}A. Sensor ELD pode estar travado em leitura alta (problema conhecido). Teste: desligar A/C, verificar saida do alternador em marcha lenta.`,
    })
  } else if (batMin < 12.2) {
    alerts.push({
      type: 'warn', param: 'BAT', severity: 4,
      title: en ? 'Occasional voltage drop at idle' : 'Queda de tensao ocasional em marcha lenta',
      detail: en
        ? `Battery min ${batMin.toFixed(2)}V. Alternator may not be fully charging at low RPM. Check belt tension and alternator output.`
        : `Bateria min ${batMin.toFixed(2)}V. Alternador pode nao estar carregando totalmente em baixa rotacao. Verificar tensao da correia e saida do alternador.`,
    })
  } else {
    alerts.push({
      type: 'good', param: 'BAT', severity: 0,
      title: en ? 'Electrical system stable' : 'Sistema eletrico estavel',
      detail: en
        ? `Avg ${bat.toFixed(2)}V, min ${batMin.toFixed(2)}V. Charging system operating normally.`
        : `Media ${bat.toFixed(2)}V, min ${batMin.toFixed(2)}V. Sistema de carga funcionando normalmente.`,
    })
  }

  // ── CORRELATION 6: Fuel trim summary ─────────────────────────────────────
  if (vacuumLeakScore < 3) { // only if no vacuum leak alert already covers this
    if (ltft > 5 || stft > 15) {
      alerts.push({
        type: 'bad', param: 'Fuel Trim', severity: 7,
        title: en ? 'ECU at correction limit — remap needed' : 'ECU no limite de correcao — remap necessario',
        detail: en
          ? `LTFT ${ltft > 0 ? '+' : ''}${ltft.toFixed(2)}%, STFT above +15% for ${stft.toFixed(1)}% of time. Stock ECU cannot compensate for modified intake/exhaust. Neptune or Crome remap strongly recommended.`
          : `LTFT ${ltft > 0 ? '+' : ''}${ltft.toFixed(2)}%, STFT acima de +15% por ${stft.toFixed(1)}% do tempo. ECU stock nao consegue compensar intake/escapamento modificados. Remap Neptune ou Crome fortemente recomendado.`,
      })
    } else if (ltft > 2.5) {
      alerts.push({
        type: 'warn', param: 'LTFT', severity: 4,
        title: en ? 'Lean bias — remap will fix this' : 'Tendencia pobre — remap vai corrigir',
        detail: en
          ? `LTFT +${ltft.toFixed(2)}%. Mixture slightly lean, likely due to 2.75" intake without remap. Expected after engine modifications.`
          : `LTFT +${ltft.toFixed(2)}%. Mistura levemente pobre, provavelmente pelo intake 2.75" sem remap. Esperado apos modificacoes no motor.`,
      })
    } else {
      alerts.push({
        type: 'good', param: 'Fuel Trim', severity: 0,
        title: en ? 'Fuel trim within normal range' : 'Fuel trim dentro do normal',
        detail: en
          ? `LTFT +${ltft.toFixed(2)}%, STFT nominal. ECU compensating correctly.`
          : `LTFT +${ltft.toFixed(2)}%, STFT nominal. ECU compensando corretamente.`,
      })
    }
  }

  // ── CORRELATION 7: MIL + system check ────────────────────────────────────
  if (mil > 0) {
    alerts.push({
      type: 'bad', param: 'MIL', severity: 8,
      title: en ? 'Check Engine active during session' : 'Check Engine ativo durante sessao',
      detail: en
        ? `MIL on for ${mil.toFixed(1)}% of session. Connect HondsH to read fault codes before next drive.`
        : `MIL ligado por ${mil.toFixed(1)}% da sessao. Conectar HondsH para ler codigos de falha antes da proxima viagem.`,
    })
  }

  // ── CORRELATION 8: VTEC engagement health ────────────────────────────────
  if (vtec > 5 && knock === 0 && stft < 5) {
    alerts.push({
      type: 'good', param: 'VTEC', severity: 0,
      title: en ? 'VTEC engaging cleanly' : 'VTEC acionando sem problemas',
      detail: en
        ? `VTEC active ${vtec.toFixed(1)}% of time with zero knock and stable fuel trim. High-rpm operation is healthy.`
        : `VTEC ativo ${vtec.toFixed(1)}% do tempo sem knock e fuel trim estavel. Operacao em alta rotacao saudavel.`,
    })
  }

  // ── CORRELATION 9: Closed loop status ────────────────────────────────────
  if (cl < 30) {
    alerts.push({
      type: 'warn', param: 'Closed Loop', severity: 3,
      title: en ? 'Mostly open loop — O2 sensor cold or disabled' : 'Majoritariamente malha aberta — sonda O2 fria ou desativada',
      detail: en
        ? `Closed loop only ${cl.toFixed(1)}% of time. ECU running on fuel map without O2 feedback. Check O2 sensor heater and warm-up time.`
        : `Malha fechada apenas ${cl.toFixed(1)}% do tempo. ECU rodando em mapa sem feedback da sonda O2. Verificar aquecedor da sonda O2 e tempo de aquecimento.`,
    })
  }

  // Sort by severity descending (bad/high first, good last)
  return alerts.sort((a, b) => b.severity - a.severity)
}

export function generateAlerts(m: LogSession, lang: 'en' | 'pt' = 'en'): Alert[] {
  return analyzeCorrelations(m, lang)
}
