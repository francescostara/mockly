# Data availability — STIMA probabilistica, non supposizione fissa

## Il principio (attenzione: è una stima, non una certezza)
Quali dati ha un cliente NON è binario: **dipende dalla sua taglia e maturità**. Un piccolo
negozio singolo ha molto meno di una catena; una startup appena nata ha meno di un'azienda
strutturata. Quindi non "questa nicchia ha X", ma "**quanto è probabile che QUESTO cliente
abbia X, data la sua nicchia E la sua dimensione stimata dal brief**".

Regola operativa, su tre livelli di probabilità:
1. **Floor (quasi sempre):** ciò che anche il cliente più piccolo ha. **Costruisci i KPI di
   default qui** — è terreno sicuro.
2. **In media (probabile, dipende dalla taglia):** ciò che un cliente tipico/strutturato ha.
   Includilo **se il brief lascia intendere abbastanza scala/maturità**; altrimenti modellalo
   ed etichettalo, o lascialo fuori.
3. **Solo se evoluti o citati (raro):** ciò che hanno solo i clienti grandi/maturi o che
   nominano lo strumento. **Gate:** includi solo se il brief lo cita o dice di avere quei dati.

Non chiedere mai dati mancanti a metà flusso: stima. Le istruzioni pre-chat (in fondo) fanno
dichiarare le fonti a monte.

## Il modificatore TAGLIA/MATURITÀ (sposta i livelli 2 e 3)
Stima la dimensione del cliente dal brief e alza o abbassa la stima:
- **Segnali che ALZANO** (probabile anche il livello 2-3): più sedi/negozi, team dedicato,
  "enterprise", volumi alti, strumenti citati (CRM, BI, ERP), budget/target menzionati.
- **Segnali che ABBASSANO** (tieni al floor): "piccolo", "appena aperto", "ho solo un excel",
  singola sede, nessuno strumento nominato.
Se il brief non dà segnali, assumi un cliente **piccolo-medio**: floor + parte del livello 2.

## Profilo per nicchia (floor → probabile → raro)

| Nicchia | Floor (quasi sempre) | Probabile (dipende dalla taglia) | Raro (solo se citato/evoluto) |
|---|---|---|---|
| **Social** | follower, pubblicazioni, interazioni | reach/views/ER, spesa+CTR/CPC (se fanno adv) | sentiment, talent, competitor, reach TikTok/YT |
| **Retail fisico** | ricavo, scontrini, AOV | margine, categoria, like-for-like | footfall/conversione, dwell, loyalty/CRM |
| **E-commerce** | vendite, ordini, AOV, canale | resi, repeat rate, traffico (GA4), margine | CRM, LTV per coorte, attribuzione fine |
| **SaaS** | MRR/ARR, new, churn | expansion, NRR | coorti, CAC (join mktg), product analytics |
| **B2B sales** | deal, stage, ricavo, rep, date | win rate, fonte, pipeline value | quota/target, forecast, attività, CAC |
| **Ristorazione** | vendite, scontrino, coperti | food/labor cost, canale, daypart | table turns, RevPASH, sprechi |
| **Finanziario/CFO** | ricavo, costi, P&L base | margine, EBITDA, AR/AP, budget-vs-actual | forecast rolling, centro di costo fine, unit economics |
| **Logistica** | spedizioni, ricavo, costi, cliente | rotte, carrier vs propria | margine per km (distanze), telematica |
| **Energia/manifattura** | ricavo, COGS, cliente, SKU | gross margin, utilization | what-if cost rate, service-level fine |
| **Creator-economy** | ricavo, creator, tipo prodotto | margine, target | OTM/NOT-OTM (soglia), sentiment, launch detail |
| **Palestre/fitness** | soci, ricavo, tipo abbonamento | nuovi/churn, prenotazioni corsi | retention coorti, footfall |

I confini tra le colonne NON sono fissi: sono la posizione più probabile, spostata dal
modificatore taglia. In caso di dubbio, resta più in basso (floor) e modella+etichetta il resto.

## Istruzioni pre-chat (testo per l'onboarding, prima del primo messaggio)
> **Per un mockup su misura, nel tuo primo messaggio scrivici:**
> 1. **Che attività è** (settore/nicchia) **e quanto è grande** (una sede o più? team? volumi?).
> 2. **Cosa vuoi mostrare** — quali domande deve rispondere il report.
> 3. **Che dati/strumenti hai** — es. POS, gestionale, CRM, Google Analytics, Meta Business
>    Suite, ERP, contabilità, piattaforma delivery… (Se non lo dici, stimeremo in base alla tua
>    nicchia e taglia.)
> 4. **Chi lo guarderà** (titolare, direzione, board…).
> 5. **Colori o brand** se ne hai.

Il punto 1 (taglia) e il 3 (strumenti) sono quelli che rendono la stima dei dati accurata invece
che una supposizione.
