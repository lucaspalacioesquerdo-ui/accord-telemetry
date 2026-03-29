import type { LogSession } from './supabase'

export type AlertType = 'bad' | 'warn' | 'good' | 'info'

export interface Alert {
  type: AlertType
  param: string
  title: string
  detail: string
  severity: number
  correlation?: string
}

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
  const vtecRpm = m.vtec_rpm_mean ?? 0

  // CORRELATION 1: Vacuum leak pattern
  const vacuumLeakScore = (iacv > 45 ? 1 : 0) + (ltft > 2.5 ? 1 : 0) + (lam > 1.10 ? 1 : 0) + (stft > 5 ? 1 : 0)
  if (vacuumLeakScore >= 3) {
    alerts.push({
      type: 'bad', param: 'IACV+LTFT+Lambda', severity: 9,
      title: en ? 'Strong vacuum leak signature' : 'Assinatura forte de vacuum leak',
      detail: en
        ? `3 indicators aligned: IACV ${iacv.toFixed(1)}% (expected 30-38%), LTFT +${ltft.toFixed(2)}%, Lambda ${lam.toFixed(3)}.

WHY THIS HAPPENS: A vacuum (air) leak after the MAP sensor lets unmetered air enter the engine. The ECU does not know this extra air exists, so it keeps the fuel map unchanged — resulting in a lean mixture that shows up as elevated Lambda and rising LTFT as the ECU tries to compensate. The IACV opens wider than normal to maintain idle stability, confirming extra air demand.

LIKELY COMPONENTS (in order of probability):
1. IACV hoses — the two rubber hoses to the idle air control valve crack and split with age/heat. The most common failure on CD5/CD7.
2. Intake manifold gasket — degrades between head and manifold, especially around runners 1 and 4. Spray carb cleaner near the gasket with engine running; RPM will change if there is a leak.
3. PCV valve hose — connects valve cover to intake manifold. A split here lets crankcase air bypass the MAP sensor.
4. Brake booster vacuum line — large hose from intake manifold to brake booster. Cracks at the manifold fitting.
5. IACV body gasket — the gasket between the IACV block and the throttle body can fail.

HOW TO TEST:
- With engine warm at idle, spray small amounts of carb cleaner or unlit propane around each suspect area. Watch for RPM change (+/- 50 rpm = leak found).
- Check for cracked or collapsed vacuum hoses visually and by feel — squeeze them. Hard/brittle hoses are failing even if not visibly cracked.
- Smoke test: shop with smoke machine can pressurize the intake and show any leak in seconds.

FIX: Replace all vacuum hoses (full kit ~R$80), inspect and replace intake manifold gasket if needed.`
        : `3 indicadores alinhados: IACV ${iacv.toFixed(1)}% (esperado 30-38%), LTFT +${ltft.toFixed(2)}%, Lambda ${lam.toFixed(3)}.

POR QUE ACONTECE: Um vazamento de vácuo após o sensor MAP permite que ar não medido entre no motor. A ECU não sabe que esse ar extra existe, então mantém o mapa de combustível — gerando mistura pobre que aparece como Lambda elevado e LTFT crescente. O IACV abre mais que o normal para manter o ralenti, confirmando demanda extra de ar.

COMPONENTES MAIS PROVÁVEIS (em ordem de probabilidade):
1. Mangueiras do IACV — as duas mangueiras de borracha da válvula de ar de marcha lenta racham com calor/idade. Falha mais comum no CD5/CD7.
2. Junta do coletor de admissão — degrada entre cabeçote e coletor, especialmente nos cilindros 1 e 4. Borrifar limpa carburador perto da junta com motor ligado; RPM vai variar se houver vazamento.
3. Mangueira da válvula PCV — conecta tampa de válvulas ao coletor. Rachadura aqui deixa ar do cárter bypassa o MAP.
4. Mangueira de vácuo do servo freio — mangueira grande do coletor ao servo. Racha na conexão do coletor.
5. Junta do corpo do IACV — junta entre o bloco IACV e o corpo da borboleta pode falhar.

COMO TESTAR:
- Com motor quente em ralenti, borrifar limpa carburador perto de cada área suspeita. RPM vai mudar (+/- 50 rpm = vazamento encontrado).
- Verificar mangueiras visual e manualmente — apertar. Mangueiras duras/quebradiças estão falhando mesmo sem rachadura visível.
- Teste de fumaça: oficina com máquina de fumaça pressuriza o intake e mostra qualquer vazamento em segundos.

SOLUÇÃO: Trocar todas as mangueiras de vácuo (kit completo ~R$80), inspecionar e trocar junta do coletor se necessário.`,
      correlation: en ? 'IACV + LTFT + Lambda' : 'Correlacao IACV + LTFT + Lambda'
    })
  } else if (vacuumLeakScore === 2 && iacv > 42) {
    alerts.push({
      type: 'warn', param: 'IACV+LTFT', severity: 6,
      title: en ? 'Possible vacuum leak — 2 indicators' : 'Possivel vacuum leak — 2 indicadores',
      detail: en
        ? `IACV ${iacv.toFixed(1)}% elevated (normal 30-38%) with LTFT +${ltft.toFixed(2)}% — 2 of 3 markers present, Lambda not yet lean enough to confirm.

WHY THIS MATTERS: IACV above 42% at stable idle means the ECU is requesting extra air somewhere. Combined with lean LTFT, a partial vacuum leak is the most probable cause. Could also be: IACV valve wear (carbon deposits on the valve needle reduce flow efficiency, causing the ECU to open it more), or an early-stage manifold gasket failure affecting only one runner.

WHAT TO CHECK FIRST:
- Visual inspection of all vacuum hoses — look for cracks, especially at the hose ends near metal fittings where they harden faster.
- IACV cleaning: remove the valve and soak in carb cleaner for 10 min. A partially stuck IACV reads high without any leak.
- Monitor trend: if IACV continues rising session over session, a vacuum leak is developing.`
        : `IACV ${iacv.toFixed(1)}% elevado (normal 30-38%) com LTFT +${ltft.toFixed(2)}% — 2 de 3 indicadores presentes, Lambda ainda nao pobre o suficiente para confirmar.

POR QUE IMPORTA: IACV acima de 42% em ralenti estável significa que a ECU está pedindo ar extra. Combinado com LTFT positivo, um vazamento de vácuo parcial é a causa mais provável. Pode também ser: desgaste da válvula IACV (depósitos de carbono na agulha reduzem a eficiência, fazendo a ECU abrir mais), ou falha inicial na junta do coletor afetando apenas um cilindro.

O QUE VERIFICAR PRIMEIRO:
- Inspeção visual de todas as mangueiras de vácuo — procure rachaduras, especialmente nas pontas perto das conexões metálicas onde endurecem mais rápido.
- Limpeza do IACV: remover a válvula e deixar de molho em limpa carburador por 10 min. Um IACV parcialmente preso lê alto sem vazamento.
- Monitorar tendência: se IACV continuar subindo sessão após sessão, um vazamento está se desenvolvendo.`,
    })
  }

  // CORRELATION 2: Intake heat-soak
  if (iat > 55 && lam > 1.10 && ltft > 2) {
    alerts.push({
      type: 'warn', param: 'IAT+Lambda', severity: 5,
      title: en ? 'Heat-soak: hot intake air causing lean mixture' : 'Heat-soak: ar de admissao quente causando mistura pobre',
      detail: en
        ? `IAT avg ${iat.toFixed(1)}C is reducing air density and causing lean mixture (Lambda ${lam.toFixed(3)}).

WHY THIS HAPPENS: Hot air is less dense than cold air — every 10C increase reduces air mass by ~3.4%. The ECU is programmed to adjust for this, but without a remap calibrated to your intake, compensation is incomplete. A cold air intake without a heat shield draws engine bay air (60-80C at speed) instead of ambient air, amplifying the problem.

EFFECT ON ENGINE: Lean mixture at high IAT increases knock risk, reduces power output, and forces the ECU to retard timing. Your average advance of ${adv.toFixed(1)}deg may already be partially retarded as a result.

SOLUTIONS (in order of effectiveness):
1. Heat shield: fabricate or buy a heat shield to isolate the intake filter from the engine bay. Sheet aluminum + thermal wrap costs ~R$150, drops IAT by 10-20C.
2. Relocate filter: route the intake to draw from the fender area or a cold air source outside the engine bay.
3. Remap: a proper Neptune/Crome remap calibrated to your IAT sensor will optimize fuel delivery across temperature ranges.`
        : `IAT média ${iat.toFixed(1)}C está reduzindo densidade do ar e causando mistura pobre (Lambda ${lam.toFixed(3)}).

POR QUE ACONTECE: Ar quente é menos denso que ar frio — cada 10C a mais reduz a massa de ar em ~3.4%. A ECU é programada para compensar isso, mas sem remap calibrado para o seu intake, a compensação é incompleta. Um intake frio sem protetor térmico aspira ar do compartimento do motor (60-80C em velocidade) ao invés do ar ambiente.

EFEITO NO MOTOR: Mistura pobre com IAT alta aumenta risco de knock, reduz potência e força a ECU a retardar o avanço. Seu avanço médio de ${adv.toFixed(1)} graus pode já estar parcialmente retardado por isso.

SOLUÇÕES (em ordem de efetividade):
1. Protetor térmico: fabricar ou comprar protetor para isolar o filtro do compartimento. Alumínio + manta térmica ~R$150, reduz IAT em 10-20C.
2. Reposicionar filtro: rotear o intake para aspirar da área do paralama ou fonte de ar frio fora do compartimento.
3. Remap: um remap Neptune/Crome calibrado ao sensor IAT otimizará a entrega de combustível em diferentes temperaturas.`,
    })
  }

  // CORRELATION 3: Ignition timing / knock
  if (knock > 0 && adv < 25) {
    alerts.push({
      type: 'bad', param: 'Knock+ADV', severity: 9,
      title: en ? 'Knock with retarded timing — check fuel grade' : 'Knock com avanco retardado — verificar octanagem',
      detail: en
        ? `${knock} knock events detected. Average ignition advance ${adv.toFixed(1)} degrees — ECU is already retarding timing to protect the engine, and knock is still occurring.

WHY THIS IS SERIOUS: Knock (pre-detonation) means the air-fuel mixture is igniting before the spark plug fires. This creates a pressure wave that hammers the piston and cylinder walls. Even mild knock accelerates wear on piston rings, rod bearings, and can eventually crack pistons.

MOST LIKELY CAUSES:
1. Fuel octane: the F22B1 requires minimum 91 RON (common gasoline). If you are using Podium/Comum (87-89 RON), switch immediately to Aditivada or V-Power (91-95 RON).
2. Carbon deposits: accumulated carbon on piston crowns and combustion chamber raises the effective compression ratio and creates hot spots. Symptoms worsen as mileage increases. Walnut blasting or chemical decarbonization solves this.
3. Coolant temperature: check that ECT is not above 100C during knock events — the ECU does not have enough cooling margin.
4. Timing calibration: if the engine has any cam or head work, factory timing maps may be too aggressive.

IMMEDIATE ACTIONS: Fill up with premium fuel and run at least one full tank before next session. If knock persists, investigate carbon deposits.`
        : `${knock} eventos de knock detectados. Avanço médio ${adv.toFixed(1)} graus — ECU já retardando para proteger o motor, e knock continua ocorrendo.

POR QUE É SÉRIO: Knock (pré-detonação) significa que a mistura está detonando antes da vela disparar. Isso cria uma onda de pressão que marreta o pistão e as paredes do cilindro. Mesmo knock leve acelera o desgaste dos anéis, bronzinas e pode rachar pistões.

CAUSAS MAIS PROVÁVEIS:
1. Octanagem: o F22B1 requer mínimo 91 RON. Se estiver usando gasolina Comum (87-89 RON), trocar imediatamente para Aditivada ou V-Power (91-95 RON).
2. Depósitos de carbono: acúmulo nos pistões e câmara aumenta a taxa de compressão efetiva e cria pontos quentes. Solução: decarbonização química ou walnut blasting.
3. Temperatura: verificar se ECT não está acima de 100C durante os eventos de knock — ECU sem margem de resfriamento suficiente.
4. Calibração de ponto: se o motor tem trabalho em cames ou cabeçote, os mapas de fábrica podem ser agressivos demais.

AÇÃO IMEDIATA: Abastecer com combustível premium e rodar pelo menos um tanque completo antes da próxima sessão. Se knock persistir, investigar depósitos de carbono.`,
    })
  } else if (knock > 5) {
    alerts.push({
      type: 'bad', param: 'Knock', severity: 8,
      title: en ? `${knock} knock events detected` : `${knock} eventos de knock detectados`,
      detail: en
        ? `Significant detonation detected during this session.

WHAT KNOCK MEANS: The knock sensor (KS) detects vibration frequencies characteristic of pre-detonation — when the air-fuel mixture auto-ignites due to excessive heat or pressure before the spark plug fires. Each event creates a shockwave inside the cylinder.

RISKS: Repeated knock causes: piston crown erosion, piston ring wear, rod bearing fatigue, and in severe cases cracked pistons. The ECU retards timing automatically to reduce knock, which costs power and may not fully prevent damage at high frequency.

CHECK THESE IN ORDER:
1. Fuel quality — switch to 95 RON premium for the next 2 sessions and compare knock count.
2. Coolant temperature — if ECT is above 95C during knock events, cooling system needs attention first.
3. Air/fuel ratio — ensure Lambda is not lean (>1.10) under load, which dramatically increases knock susceptibility.
4. Oil consumption — excessive oil entering the combustion chamber from worn valve seals can cause knock.
5. Knock sensor itself — a failing KS may under-report events. If knock count is inconsistent session to session with similar driving, the sensor may need replacement.`
        : `Detonação significativa detectada nesta sessão.

O QUE KNOCK SIGNIFICA: O sensor de knock (KS) detecta frequências de vibração características de pré-detonação — quando a mistura auto-ignita por calor ou pressão excessiva antes da vela disparar. Cada evento cria uma onda de choque dentro do cilindro.

RISCOS: Knock repetido causa: erosão do topo do pistão, desgaste dos anéis, fadiga nas bronzinas e em casos graves, pistões rachados. A ECU retarda o avanço automaticamente, o que custa potência e pode não prevenir totalmente danos em alta frequência.

VERIFICAR NESTA ORDEM:
1. Qualidade do combustível — trocar para gasolina V-Power/Podium nas próximas 2 sessões e comparar contagem de knock.
2. Temperatura do fluido — se ECT está acima de 95C durante eventos de knock, sistema de arrefecimento precisa atenção primeiro.
3. Relação ar/combustível — garantir que Lambda não está pobre (>1.10) sob carga, o que aumenta drasticamente a suscetibilidade a knock.
4. Consumo de óleo — óleo excessivo entrando na câmara por retentores de válvula desgastados pode causar knock.
5. Sensor de knock — um KS falhando pode subnotificar eventos. Se a contagem de knock for inconsistente, o sensor pode precisar de substituição.`,
    })
  }

  // CORRELATION 4: Cooling system
  if (ect100 > 0.5 && ect > 25) {
    alerts.push({
      type: 'bad', param: 'ECT', severity: 8,
      title: en ? 'Engine reaching critical temperature' : 'Motor atingindo temperatura critica',
      detail: en
        ? `Above 100C for ${ect100.toFixed(1)}% of session, above 95C for ${ect.toFixed(1)}% of session.

WHY 100C IS CONCERNING: The F22B1 thermostat is rated to open at 80-88C. Normal operating range is 82-95C. Above 98-100C, coolant approaches boiling point and head gasket stress increases sharply. On the CD5, the head gasket between cylinders 2 and 3 is the first to fail when the engine runs hot regularly.

POSSIBLE CAUSES:
1. Thermostat stuck partially closed — prevents full coolant flow through the radiator. Test: cold start, watch ECT — should rise steadily to ~85C then stabilize. If it overshoots and oscillates, thermostat is failing.
2. Coolant level low — air pockets in the system cause local hot spots that the sensor may not detect until temperature spikes.
3. Radiator partially blocked — check for bugs, fins damage, or internal scaling. A 20% blocked radiator can raise ECT by 10-15C at highway speed.
4. Radiator fan not activating — check fan relay and thermal switch. Fan should activate at ~97C if A/C is off.
5. Water pump impeller worn — the plastic impeller on OEM water pumps can degrade and slip at high RPM, reducing flow exactly when you need it most.

TESTS: After a hot session, let engine cool completely. Check coolant level in reservoir — if it dropped, you have either a leak or air ingestion. Watch ECT on next cold start and log the warm-up curve.`
        : `Acima de 100C por ${ect100.toFixed(1)}% da sessão, acima de 95C por ${ect.toFixed(1)}% da sessão.

POR QUE 100C É PREOCUPANTE: O termostato do F22B1 é calibrado para abrir em 80-88C. Faixa normal é 82-95C. Acima de 98-100C, o fluido se aproxima do ponto de ebulição e o estresse na junta de cabeçote aumenta drasticamente. No CD5, a junta entre os cilindros 2 e 3 é a primeira a falhar quando o motor roda quente regularmente.

CAUSAS POSSÍVEIS:
1. Termostato travado parcialmente fechado — impede fluxo completo pelo radiador. Teste: partida a frio, observar ECT — deve subir até ~85C e estabilizar. Se ultrapassar e oscilar, termostato está falhando.
2. Nível de fluido baixo — bolsas de ar criam pontos quentes locais que o sensor pode não detectar até picos de temperatura.
3. Radiador parcialmente bloqueado — verificar insetos, danos nas aletas ou incrustações internas. Um radiador 20% bloqueado pode elevar ECT em 10-15C em velocidade.
4. Ventoinha não ativando — verificar relé da ventoinha e termostato elétrico. Ventoinha deve ligar em ~97C com A/C desligado.
5. Rotor da bomba d'água desgastado — o rotor plástico OEM pode desgastar e perder eficiência em alta rotação, reduzindo o fluxo exatamente quando mais precisa.

TESTES: Após sessão quente, deixar motor esfriar completamente. Verificar nível do fluido no reservatório — se baixou, há vazamento ou entrada de ar. Observar ECT na próxima partida a frio e registrar a curva de aquecimento.`,
    })
  } else if (ect > 30) {
    alerts.push({
      type: 'warn', param: 'ECT', severity: 5,
      title: en ? 'Coolant temp frequently above 95C' : 'Temperatura do fluido frequentemente acima de 95C',
      detail: en
        ? `${ect.toFixed(1)}% of session time above 95C. Engine is running warm but not yet in the danger zone.

CONTEXT: The F22B1 with a performance exhaust and modified intake will naturally run 3-5C warmer than stock due to changes in heat rejection and airflow patterns. However, consistently above 95C leaves little safety margin.

MONITOR FOR THESE PATTERNS:
- Does ECT spike above 100C at traffic lights after highway driving? This is radiator fan-related — the fan should prevent heat soak.
- Does ECT stay elevated after 15 min of highway driving? Suggests partial radiator blockage or thermostat issue.
- Is the trend worsening session over session? Compare ECT across your logs — a gradually rising average is a sign of developing cooling system degradation.

CHECKS: Verify radiator fan activates automatically. Confirm coolant mix is correct (50/50 distilled water + coolant). Inspect hoses for softness or swelling which indicates internal degradation.`
        : `${ect.toFixed(1)}% do tempo da sessão acima de 95C. Motor rodando quente mas ainda fora da zona de perigo.

CONTEXTO: O F22B1 com escapamento esportivo e intake modificado vai naturalmente rodar 3-5C mais quente que o original devido a mudanças na rejeição de calor e padrões de fluxo de ar. Porém, consistentemente acima de 95C deixa pouca margem de segurança.

MONITORAR ESTES PADRÕES:
- ECT ultrapassa 100C em semáforos após rodagem em estrada? Relacionado à ventoinha — ela deve prevenir heat soak.
- ECT permanece elevado após 15 min de estrada? Sugere obstrução parcial do radiador ou problema no termostato.
- A tendência está piorando sessão após sessão? Compare ECT entre os logs — média gradualmente crescente indica degradação do sistema de arrefecimento.

VERIFICAÇÕES: Confirmar que ventoinha liga automaticamente. Verificar mistura do fluido (50/50 água destilada + fluido). Inspecionar mangueiras por amolecimento ou inchaço, que indica degradação interna.`,
    })
  } else {
    alerts.push({
      type: 'good', param: 'ECT', severity: 0,
      title: en ? 'Cooling system healthy' : 'Sistema de arrefecimento saudavel',
      detail: en
        ? `Max ${m.ect_max?.toFixed(1)}C, avg ${m.ect_mean?.toFixed(1)}C. Radiator, thermostat, and water pump operating correctly.`
        : `Max ${m.ect_max?.toFixed(1)}C, media ${m.ect_mean?.toFixed(1)}C. Radiador, termostato e bomba d'agua funcionando corretamente.`,
    })
  }

  // CORRELATION 5: Electrical / charging
  if (batMin < 12.0 && eld > 60) {
    alerts.push({
      type: 'bad', param: 'BAT+ELD', severity: 7,
      title: en ? 'High electrical load causing voltage drop' : 'Carga eletrica elevada causando queda de tensao',
      detail: en
        ? `Battery dropped to ${batMin.toFixed(2)}V with ELD averaging ${eld.toFixed(0)}A.

WHY THIS MATTERS: Below 12V, the ECU, injectors, and sensors receive reduced supply voltage, causing erratic readings and potential misfires. Sustained operation below 11.5V can cause the ECU to lose adaptive fuel trim data (LTFT reset). At ${batMin.toFixed(2)}V, you are close to that threshold.

MOST LIKELY CAUSES:
1. ELD (Electrical Load Detector) sensor drift: the ELD on D/CD-series Hondas is known to read 10-20A high when it begins to fail. A reading of ${eld.toFixed(0)}A is plausible but verify against actual load. Test: with only the engine running and all accessories off, ELD should read 10-20A at idle.
2. Alternator not charging fully at idle: the stock alternator output starts dropping below 1200 RPM. In heavy traffic, extended idle can discharge the battery. Check alternator output voltage — should be 13.8-14.8V at any RPM above 1200.
3. Battery aging: a battery over 4 years old loses capacity and voltage regulation. Under load, old batteries drop voltage faster than the alternator can recover.
4. Parasitic drain: something drawing current with the engine off (radio, alarm, relay stuck). Check by measuring current draw with engine off.

QUICK TESTS:
- Voltmeter at idle: <13.5V = alternator issue. >14.8V = voltage regulator issue.
- Battery load test: any shop can test in 5 min. A battery showing 12.6V open-circuit but dropping to 10V under load needs replacement.`
        : `Bateria caiu para ${batMin.toFixed(2)}V com ELD média ${eld.toFixed(0)}A.

POR QUE IMPORTA: Abaixo de 12V, a ECU, injetores e sensores recebem tensão reduzida, causando leituras erráticas e possíveis falhas de ignição. Operação sustentada abaixo de 11.5V pode fazer a ECU perder os dados adaptativos de fuel trim (reset do LTFT). A ${batMin.toFixed(2)}V, você está próximo desse limiar.

CAUSAS MAIS PROVÁVEIS:
1. Deriva do sensor ELD: o ELD dos Hondas série D/CD é conhecido por ler 10-20A a mais quando começa a falhar. Uma leitura de ${eld.toFixed(0)}A é plausível, mas verifique com carga real. Teste: com apenas o motor ligado e todos os acessórios desligados, ELD deve ler 10-20A em marcha lenta.
2. Alternador sem carga completa em marcha lenta: a saída do alternador original começa a cair abaixo de 1200 RPM. Em tráfego pesado, ralenti prolongado pode descarregar a bateria. Verificar tensão do alternador — deve ser 13.8-14.8V em qualquer RPM acima de 1200.
3. Bateria envelhecida: bateria com mais de 4 anos perde capacidade e regulação de tensão. Sob carga, baterias velhas caem mais rápido que o alternador consegue recuperar.
4. Dreno parasita: algo drenando com motor desligado (rádio, alarme, relé preso). Verificar corrente com motor desligado.

TESTES RÁPIDOS:
- Voltímetro em marcha lenta: <13.5V = problema no alternador. >14.8V = problema no regulador de tensão.
- Teste de carga da bateria: qualquer oficina faz em 5 min. Bateria que mostra 12.6V em circuito aberto mas cai para 10V sob carga precisa de substituição.`,
    })
  } else if (batMin < 12.2) {
    alerts.push({
      type: 'warn', param: 'BAT', severity: 4,
      title: en ? 'Occasional voltage drop at idle' : 'Queda de tensao ocasional em marcha lenta',
      detail: en
        ? `Battery minimum ${batMin.toFixed(2)}V — dipping slightly below optimal range.

WHAT IS NORMAL: At idle with A/C and headlights on, 12.2-12.5V is acceptable. Above 1500 RPM with accessories on, you should see 13.8-14.2V. If the battery is consistently below 12.5V at idle, the alternator is not keeping up.

LIKELY CAUSE: Either the alternator is undersized for the electrical load (aftermarket audio, LED lighting, etc.), or the alternator belt is slipping. A slipping belt causes output to vary with RPM more than usual.

CHECK:
- Measure voltage at the battery terminals at idle vs. 2000 RPM. Should increase by at least 0.8-1.2V when you rev.
- Inspect the alternator belt — it should deflect no more than 10mm under firm thumb pressure.
- If you have added any electrical accessories (amplifier, LEDs, etc.), the stock alternator may not be rated for the additional load.`
        : `Mínimo de bateria ${batMin.toFixed(2)}V — caindo levemente abaixo do range ideal.

O QUE É NORMAL: Em ralenti com A/C e faróis ligados, 12.2-12.5V é aceitável. Acima de 1500 RPM com acessórios, deve-se ver 13.8-14.2V. Se a bateria está consistentemente abaixo de 12.5V em ralenti, o alternador não está acompanhando.

CAUSA PROVÁVEL: Alternador subdimensionado para a carga elétrica (áudio aftermarket, iluminação LED, etc.), ou correia do alternador escorregando. Correia escorregando causa variação maior de saída com RPM.

VERIFICAR:
- Medir tensão nos terminais da bateria em ralenti vs. 2000 RPM. Deve aumentar pelo menos 0.8-1.2V ao acelerar.
- Inspecionar correia do alternador — deve deflexionar no máximo 10mm com pressão firme do polegar.
- Se adicionou acessórios elétricos (amplificador, LEDs, etc.), o alternador original pode não ser adequado para a carga adicional.`,
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

  // CORRELATION 6: Fuel trim
  if (vacuumLeakScore < 3) {
    if (ltft > 5 || stft > 15) {
      alerts.push({
        type: 'bad', param: 'Fuel Trim', severity: 7,
        title: en ? 'ECU at correction limit — remap needed' : 'ECU no limite de correcao — remap necessario',
        detail: en
          ? `LTFT ${ltft > 0 ? '+' : ''}${ltft.toFixed(2)}%, STFT above +15% for ${stft.toFixed(1)}% of time. The ECU is requesting significantly more fuel than its stock map provides.

WHY THIS HAPPENS: The F22B1 stock ECU fuel map is calibrated for the original airbox and exhaust. A high-flow intake increases air volume, and a performance exhaust changes backpressure — both require more fuel that the stock map does not deliver. The ECU uses STFT and LTFT to compensate, but these have limits (typically ±25%). When LTFT is high and STFT is frequently hitting those limits, engine efficiency and safety are compromised.

CONSEQUENCES OF NOT REMAPPING:
- Lean mixture under load increases knock risk and reduces power
- ECU adaptation limits mean it cannot compensate for all conditions
- Long-term: increased wear on pistons and valves from sustained lean operation

REMAP OPTIONS:
1. Neptune RTP — real-time USB tuning, most common for D/F-series. Requires a wideband O2 sensor for proper calibration. Cost: ~R$800-1500 for tune + cable.
2. Crome — similar capability, slightly older interface. Good community support for CD5.
3. Professional tune: find a tuner experienced with F-series NA engines. Remote tuning available.

PREREQUISITE: Fix any vacuum leaks and mechanical issues before remapping — you cannot tune a leaking engine accurately.`
          : `LTFT ${ltft > 0 ? '+' : ''}${ltft.toFixed(2)}%, STFT acima de +15% por ${stft.toFixed(1)}% do tempo. A ECU está pedindo significativamente mais combustível do que seu mapa stock fornece.

POR QUE ACONTECE: O mapa de combustível stock do F22B1 é calibrado para o airbox e escapamento originais. Um intake de alto fluxo aumenta o volume de ar, e um escapamento esportivo muda a contrapressão — ambos requerem mais combustível que o mapa stock não entrega. A ECU usa STFT e LTFT para compensar, mas esses têm limites (tipicamente ±25%). Quando LTFT está alto e STFT frequentemente bate nesses limites, a eficiência e segurança do motor são comprometidas.

CONSEQUÊNCIAS DE NÃO FAZER REMAP:
- Mistura pobre sob carga aumenta risco de knock e reduz potência
- Os limites de adaptação da ECU significam que ela não consegue compensar todas as condições
- Longo prazo: desgaste acelerado em pistões e válvulas por operação pobre sustentada

OPÇÕES DE REMAP:
1. Neptune RTP — tuning USB em tempo real, mais comum para série D/F. Requer sonda O2 wideband para calibração adequada. Custo: ~R$800-1500 para tune + cabo.
2. Crome — capacidade similar, interface um pouco mais antiga. Boa suporte da comunidade para CD5.
3. Tune profissional: encontrar tuner experiente com motores F-series NA. Tuning remoto disponível.

PRÉ-REQUISITO: Corrigir quaisquer vazamentos de vácuo e problemas mecânicos antes do remap — não é possível calibrar um motor com vazamentos com precisão.`,
      })
    } else if (ltft > 2.5) {
      alerts.push({
        type: 'warn', param: 'LTFT', severity: 4,
        title: en ? 'Lean bias — remap will optimize this' : 'Tendencia pobre — remap vai otimizar',
        detail: en
          ? `LTFT +${ltft.toFixed(2)}% — the ECU has learned to add fuel to compensate for your intake setup.

CONTEXT: A LTFT of +${ltft.toFixed(2)}% means the ECU is adding ${ltft.toFixed(1)}% more fuel than its map originally specified. This is within the normal adaptation range for a modified intake, and the engine is running, but it indicates the fuel map is not optimized.

WHAT THIS MEANS IN PRACTICE: The ECU can compensate at steady cruise, but under rapid load changes (acceleration, gear shifts) the correction lags and causes brief lean spikes. This is where most of your elevated STFT readings come from.

WHEN TO REMAP: If LTFT stays above +3% after checking for vacuum leaks and confirming the intake is properly installed, a remap is the correct solution. Neptune or Crome calibrated to a wideband sensor will bring LTFT to ±1-2% and improve throttle response noticeably.`
          : `LTFT +${ltft.toFixed(2)}% — a ECU aprendeu a adicionar combustível para compensar seu setup de intake.

CONTEXTO: Um LTFT de +${ltft.toFixed(2)}% significa que a ECU está adicionando ${ltft.toFixed(1)}% mais combustível do que seu mapa originalmente especifica. Isso está dentro do range normal de adaptação para um intake modificado, e o motor está funcionando, mas indica que o mapa de combustível não está otimizado.

O QUE SIGNIFICA NA PRÁTICA: A ECU consegue compensar em cruzeiro estável, mas em mudanças rápidas de carga (aceleração, trocas de marcha) a correção atrasa e causa picos breves de mistura pobre. É daí que vêm a maioria das leituras elevadas de STFT.

QUANDO FAZER REMAP: Se LTFT permanecer acima de +3% após verificar vazamentos de vácuo e confirmar que o intake está instalado corretamente, um remap é a solução correta. Neptune ou Crome calibrado com sonda wideband vai trazer LTFT para ±1-2% e melhorar notavelmente a resposta do acelerador.`,
      })
    } else {
      alerts.push({
        type: 'good', param: 'Fuel Trim', severity: 0,
        title: en ? 'Fuel trim within normal range' : 'Fuel trim dentro do normal',
        detail: en
          ? `LTFT ${ltft > 0 ? '+' : ''}${ltft.toFixed(2)}%, STFT nominal. ECU compensating correctly.`
          : `LTFT ${ltft > 0 ? '+' : ''}${ltft.toFixed(2)}%, STFT nominal. ECU compensando corretamente.`,
      })
    }
  }

  // CORRELATION 7: MIL
  if (mil > 0) {
    alerts.push({
      type: 'bad', param: 'MIL', severity: 8,
      title: en ? 'Check Engine active during session' : 'Check Engine ativo durante sessao',
      detail: en
        ? `MIL (Check Engine light) active for ${mil.toFixed(1)}% of session.

WHAT THE MIL MEANS: The ECU detected a fault condition that exceeds its tolerance thresholds and stored a Diagnostic Trouble Code (DTC) in memory. The MIL stays on until the fault is cleared or the condition resolves and the ECU runs its self-test successfully for two consecutive drive cycles.

HOW TO READ THE CODES: The CD5/CD7 uses OBD1, not OBD2. You cannot use a standard OBD2 reader. Options:
1. HondSH app (what you are already using) can read codes via the Bluetooth adapter in the DLC connector.
2. Self-diagnostic: with the ignition ON (engine off), the MIL blinks codes in sequences — count the long blinks (tens digit) and short blinks (units digit).
3. Paper clip method: jump the DLC service check connector (2-pin blue connector under the dash on driver's side) with a paper clip, turn ignition to ON, and count MIL blinks.

COMMON CODES ON F22B1:
- P0170/1 (code 41): O2 sensor circuit — check sensor wiring and heater circuit
- P0300-P0304 (code 43): misfire — check plugs, wires, injectors
- P0113/P0112 (code 10): IAT sensor — check sensor and wiring
- P0505 (code 14): IACV — vacuum leak or valve failure

DO NOT IGNORE: A stored code means the ECU has reduced confidence in one or more sensor readings, which affects fuel trim accuracy. Read and address the code before the next drive.`
        : `MIL (luz check engine) ativa por ${mil.toFixed(1)}% da sessão.

O QUE O MIL SIGNIFICA: A ECU detectou uma condição de falha que excede seus limiares de tolerância e armazenou um Código de Diagnóstico de Falha (DTC) na memória. O MIL permanece aceso até que a falha seja apagada ou a condição se resolva e a ECU execute seu autoteste com sucesso por dois ciclos de condução consecutivos.

COMO LER OS CÓDIGOS: O CD5/CD7 usa OBD1, não OBD2. Não é possível usar um leitor OBD2 padrão. Opções:
1. App HondSH (que você já usa) pode ler códigos via adaptador Bluetooth no conector DLC.
2. Autodiagnóstico: com ignição LIGADA (motor desligado), o MIL pisca os códigos em sequências — contar os piscos longos (dezenas) e curtos (unidades).
3. Método papel-clips: jumpar o conector de verificação de serviço DLC (conector azul de 2 pinos sob o painel do motorista), ligar ignição no ON e contar os piscos do MIL.

CODIGOS COMUNS NO F22B1:
- P0170/1 (código 41): circuito da sonda O2 — verificar fiação e circuito de aquecimento
- P0300-P0304 (código 43): misfire — verificar velas, cabos e injetores
- P0113/P0112 (código 10): sensor IAT — verificar sensor e fiação
- P0505 (código 14): IACV — vazamento de vácuo ou falha da válvula

NAO IGNORE: Um código armazenado significa que a ECU tem confiança reduzida em uma ou mais leituras de sensor, o que afeta a precisão do fuel trim. Ler e corrigir o código antes da próxima viagem.`,
    })
  }

  // CORRELATION 8: VTEC health
  if (vtec > 5 && knock === 0 && stft < 5) {
    alerts.push({
      type: 'good', param: 'VTEC', severity: 0,
      title: en ? 'VTEC engaging cleanly' : 'VTEC acionando sem problemas',
      detail: en
        ? `VTEC active ${vtec.toFixed(1)}% of time${vtecRpm > 0 ? `, avg ${vtecRpm.toFixed(0)} rpm at engagement` : ''}. Zero knock and stable fuel trim during high-rpm operation.`
        : `VTEC ativo ${vtec.toFixed(1)}% do tempo${vtecRpm > 0 ? `, media ${vtecRpm.toFixed(0)} rpm no acionamento` : ''}. Zero knock e fuel trim estavel durante operacao em alta rotacao.`,
    })
  }

  // CORRELATION 9: Closed loop
  if (cl < 30) {
    alerts.push({
      type: 'warn', param: 'Closed Loop', severity: 3,
      title: en ? 'Mostly open loop — O2 sensor cold or disabled' : 'Majoritariamente malha aberta — sonda O2 fria ou desativada',
      detail: en
        ? `Closed loop only ${cl.toFixed(1)}% of session. The ECU is running on its fixed fuel map without real-time O2 feedback for most of this session.

WHY THIS MATTERS: In open loop, the ECU cannot correct for fuel trim errors, vacuum leaks, or sensor drift. All the LTFT learning that was done in previous sessions becomes inactive. This means your actual air-fuel ratio could be significantly off without any indicator in the logs.

CAUSES:
1. Short session: if the engine didn't fully warm up (ECT needs to reach ~70C), the O2 sensor stays in open loop. Check session duration and ECT curve.
2. O2 sensor heater failing: the heater circuit warms the sensor faster after cold start. A failing heater means the sensor takes much longer to reach operating temperature (300-400C).
3. O2 sensor aging: an aged sensor has slower response time and the ECU may disqualify it from closed loop operation.
4. Coolant temperature sensor reading cold: if the ECT sensor reports lower than actual temperature, the ECU delays closed loop entry.

CHECK: If this is a short city session (<20 min), open loop dominance is expected. If the session was longer, the O2 sensor heater circuit should be tested.`
        : `Malha fechada apenas ${cl.toFixed(1)}% da sessão. A ECU está rodando em seu mapa fixo de combustível sem feedback em tempo real da sonda O2 durante a maior parte desta sessão.

POR QUE IMPORTA: Em malha aberta, a ECU não consegue corrigir erros de fuel trim, vazamentos de vácuo ou deriva de sensores. Todo o aprendizado de LTFT feito em sessões anteriores fica inativo. Isso significa que a relação ar/combustível real pode estar significativamente errada sem nenhum indicador nos logs.

CAUSAS:
1. Sessão curta: se o motor não aqueceu completamente (ECT precisa atingir ~70C), a sonda O2 permanece em malha aberta. Verificar duração da sessão e curva de ECT.
2. Aquecedor da sonda O2 falhando: o circuito de aquecimento aquece a sonda mais rápido após partida a frio. Aquecedor falhando significa que a sonda demora muito mais para atingir temperatura de operação (300-400C).
3. Sonda O2 envelhecida: sonda antiga tem tempo de resposta mais lento e a ECU pode desqualificá-la da operação em malha fechada.
4. Sensor ECT lendo frio: se o sensor ECT reporta temperatura menor que a real, a ECU atrasa a entrada em malha fechada.

VERIFICAR: Se esta é uma sessão curta de cidade (<20 min), dominância de malha aberta é esperada. Se a sessão foi mais longa, o circuito de aquecimento da sonda O2 deve ser testado.`,
    })
  }

  return alerts.sort((a, b) => b.severity - a.severity)
}

export function generateAlerts(m: LogSession, lang: 'en' | 'pt' = 'en'): Alert[] {
  return analyzeCorrelations(m, lang)
}
