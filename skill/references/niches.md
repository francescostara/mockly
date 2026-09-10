# Libreria delle nicchie (consolidata) — la conoscenza di dominio del prodotto

## REGOLA DI RICONOSCIMENTO (come usare questa libreria)
1. Dal brief, **identifica la nicchia** (mappa il tipo di attività a una delle voci sotto).
2. **Carica quella voce** e costruisci con i SUOI KPI, dimensioni, visual firma e storia negativa.
3. **Stima i dati disponibili** con data-availability.md (floor / probabile / raro, aggiustato
   dalla taglia del cliente dedotta dal brief).
4. Se nessuna nicchia combacia, usa la più vicina + la house-style generale.
5. **Mai produrre una dashboard vendite generica a prescindere dalla nicchia** — è il difetto
   numero uno da evitare. Ogni nicchia ha i SUOI KPI e la SUA storia negativa.

Nicchie validate dall'autore: social, retail fisico, B2B sales, ristorazione, finanziario/CFO,
logistica, energia/manifattura, creator-economy. Starter (non ancora validate col sondaggio):
e-commerce, SaaS, palestre.

---



## COME SI SCEGLIE LA PELLE (vale per ogni voce)

Ogni voce dichiara **ARCHETIPI PLAUSIBILI** e **PELLE PLAUSIBILE**. Non sono la scelta: sono il
recinto dentro cui si sceglie. Tre regole, in ordine di precedenza:

1. **Il brand del cliente vince su tutto.** Se il brief dichiara colori o un logo, la palette
   nasce da li e gli altri assi si adattano.
2. **Nicchia e pubblico restringono.** Un CFO non prende il pastello, un brand beverage non
   prende il navy corporate, un operativo di magazzino non prende l'editoriale.
3. **Dentro il recinto, la scelta RUOTA col brief.** Due generazioni della stessa nicchia non
   devono uscire con la stessa combinazione: il seme viene dal testo del brief, quindi e
   deterministica — lo stesso brief da sempre la stessa faccia — ma cambia da un brief all'altro.

Il gate di varieta lo verifica su una collezione: nessuna combinazione di palette, tipografia e
shell oltre il 30% dei file, e due report della stessa nicchia devono differire in almeno due
assi su cinque. Definizioni degli assi: `layout-archetypes.md` e `engine/skin.js`.

# Nicchia: SOCIAL / report agenzia (voce ricca, da lavoro reale — v2)

**ARCHETIPI PLAUSIBILI:** 1 `scorecard` · 3 `funnel` · 2 `executive-summary`
**PELLE PLAUSIBILE:** palette `dark-agency` · `jewel-desaturati` · `monocromo-accento` — tipografia `geometrico` o `condensato` — shell `top` o `bare`. Un report social non prende il navy corporate: il cliente ha un brand, e se lo dichiara vince lui.
L'archetipo si sceglie dalla DOMANDA e dalla DENSITA, non dalla nicchia: questi sono i tre
plausibili, non un ordine di preferenza. Definizioni in `layout-archetypes.md`.

Estratta da un report social mensile reale e corretta col feedback dell'autore. La nicchia core.
Ciò che è AUTOREVOLE qui è la LOGICA degli split e dei KPI; i grafici del report originale erano
scelte del cliente, non vincoli — la scelta del visual segue chart-selection.md.

## Inquadramento
- **Utente finale:** social/marketing manager del brand, o agenzia che consegna al cliente →
  agency-modern o brandizzato coi colori del cliente.
- **Struttura: UNA PAGINA + filtro piattaforma.** La struttura dati è identica su ogni social,
  quindi **la piattaforma è un filtro (slicer), non una pagina.** KPI e split ricalcolano al
  cambio piattaforma; drill-through per il dettaglio. NON generare una pagina per piattaforma.
- **Multi-pagina SOLO se richiesto un focus specifico**, es. un confronto dedicato
  **Totale vs Ads (paid)**, o un approfondimento organico-vs-paid. In quel caso, una seconda
  pagina con quel taglio. Altrimenti, pagina singola.
- Talent / Sentiment / Takeaways: opzionali e specifici del cliente, non standard della nicchia.

## KPI che contano
- **Organici:** Views/Impressions, Reach, Interactions, ER (= interactions / impressions),
  Pubblicazioni (per formato), Followers (base / new / unfollow / netto).
- **Paid:** Spesa, n° campagne, CPM, % Views Paid, e le PONDERATE con benchmark: CTR, VTR 100%,
  CPC, CPV.
- **Ogni KPI mostra MoM e YoY in modo evidente: freccia ▲/▼, valore della variazione, e colore
  (verde meglio / rosso peggio).** Il colpo d'occhio sulla situazione vs mese e vs anno è
  essenziale per l'utente finale — non un numero nudo.

## Dimensioni / split (composizione → di norma barre 100%, ma la scelta segue chart-selection)
- Piattaforma (FILTRO) · Paid vs Organico · Dark vs Boost · UM vs PERF (tipologie di campagna
  interne all'agenzia) · Obiettivo (Copertura, Lead Generation, Traffico, Video Views) ·
  Formato (Reel vs Stories).

## Logica dei visual (la LOGICA è il punto, non i grafici specifici del cliente)
- Composizione/quota (paid/organico, dark/boost, obiettivo, formato) → barre 100% o stacked.
- Follower base nel tempo → linea (multi-linea se si confrontano piattaforme, doppio asse per
  scale diverse).
- Spesa per piattaforma → donut (2-5 voci, ok).
- Migliori campagne per obiettivo → tabelle top-N.
- Il visual esatto lo decide chart-selection.md dall'intento, non questa lista.

## Storie negative FIRMA del social (questo è ciò che "dà vita")
- **Crescita drogata dal paid:** views ~97% paid, organico fermo. La vanity sale, la salute no.
- **ER strutturalmente compresso:** cala perché le impression paid gonfiano il denominatore,
  non perché crollano le interazioni. Spiegare QUESTO è l'insight.
- **Qualità del pubblico dalle boost:** rapporto unfollow/nuovi alto (es. 54%) → pubblico poco
  fidelizzato.
- **Reach giù, views su:** ottimizzazione sulla frequenza → rischio fatigue.
- **Una piattaforma in declino strutturale** (spesso Facebook) che erode il totale.

## Realismo dati (specifico social)
- **ER su impressions/views → BASSO (~0,4–0,9%)**, non i 3-5% dell'ER su reach. Dichiarare la
  base; cambia di un ordine di grandezza.
- **Reach solo su Meta;** su TikTok/YouTube spesso "non disponibile" → modellare l'assenza.
- **Paid ha sempre spesa/costo; l'organico no.** Ponderate solo su campagne eleggibili.
- **Scala con la dimensione dell'account** (enterprise 1M+ follower vs PMI ordini meno).
- Follower base di brand maturo spesso **quasi piatta** (<1% MoM): la storia è nel mix e nella
  qualità, non nella crescita assoluta.

## Palette delle piattaforme (colore costante per piattaforma)

Ogni piattaforma tiene il SUO colore-brand su tutti i visual (è la regola colore-per-categoria
applicata al social): nel multi-linea della follower base, nel donut spesa-per-piattaforma, nei
segmenti, la stessa piattaforma ha sempre lo stesso colore, così è riconoscibile a colpo d'occhio.
Valori ufficiali correnti:

- Facebook: #1877F2  (vecchio #3B5998)
- Instagram: gradiente viola->magenta->arancio (#833AB4 -> #C13584 -> #E4405F -> #F46F30 -> #FCAF45);
  swatch singolo per barre/linee: #E4405F (o #C13584)
- LinkedIn: #0A66C2  (classico #0077B5)
- YouTube: #FF0000
- TikTok: nero #000000, con accenti cyan #25F4EE e rosso #FE2C55
- X/Twitter: #000000  (vecchio #1DA1F2)

CAVEAT importante: poiché YouTube e' rosso e TikTok ha un accento rosso, nei visual
multi-piattaforma NON usare il rosso-riempimento come segnale di "problema" (entrerebbe in
conflitto con l'identita' di piattaforma). Segnala il problema con freccia v, bordo/badge o
dimming del segmento, non col colore di riempimento. Fuori dai visual multi-piattaforma vale la
regola normale (rosso = problema).


## ÀNCORE DI GRANDEZZA — social

**Si fissano PRIMA di generare le conte.** Il rapporto è il vincolo, la conta è ciò che ne
discende: `conta = totale / rapporto_bersaglio`. Scegliere le conte a caso e sperare che il
rapporto torni produce numeri interni coerenti e assurdi — scontrino medio da 24 centesimi,
CAC payback di zero giorni, ricavo per socio di 89 centesimi.

| rapporto | intervallo plausibile | la conta si deriva così |
|---|---|---|
| ER = interazioni / impression | 0,4% – 0,9% (dipende da piattaforma e formato) | `interazioni = impression × ER` |
| CPM = spesa / impression × 1000 | 3 – 15 € per mille (unità di euro, MAI centesimi) | `impression = spesa / CPM × 1000` |
| reach / impression | 0,35 – 0,70 — il reach è sempre sensibilmente MINORE | `reach = impression × copertura`, mai ≈ impression |
| costo per follower acquisito | 0,10 – 2 € — un brand con €2M di paid annuo non arriva a 300M di follower | `nuovi follower = spesa / costo per follower (0,10 – 2 €)` |

## Estetica
Agency-modern o brand-colored; composizioni pulite; rosso riservato a ER compresso / declino /
churn follower.

---

# Nicchia: RETAIL FISICO / negozio (voce validata dall'autore)

**ARCHETIPI PLAUSIBILI:** 1 `scorecard` · 4 `quadrants` · 8 `operational`
**PELLE PLAUSIBILE:** palette `warm-taupe` · `terroso` · `navy-corporate` — tipografia `humanist` o `sans-sistema` — shell `rail` o `rail-slim`.
L'archetipo si sceglie dalla DOMANDA e dalla DENSITA, non dalla nicchia: questi sono i tre
plausibili, non un ordine di preferenza. Definizioni in `layout-archetypes.md`.

Vendite di un negozio o catena. Ricavata da ricerca sui KPI/design retail e validata sui dubbi.

## Inquadramento
- **Utente finale:** titolare / direttore negozio o area manager → corporate-sober (default) o
  variante calda-neutra per fashion/lifestyle; accento del brand del retailer se disponibile.
- **Struttura: guidata dal brief — non dare mai per scontata una pagina sola.** Filtri quando la stessa struttura dati si ripete su una dimensione; PAGINE distinte quando il brief ha focus o temi diversi (overview + approfondimenti). Drill-through per il dettaglio.
- **Scope dipende dal brief:** se il brief cita PIÙ sedi → catena (negozio = filtro, si
  confrontano le sedi, la matrice di chiusura è per-negozio); altrimenti → negozio singolo
  (la matrice di chiusura è per-categoria).

## KPI che contano
- **Default (da POS, universali):** ricavo netto (lordo − resi − sconti), **like-for-like /
  same-store** (stesso periodo anno prima, solo negozi comparabili), n° scontrini, scontrino
  medio (AOV), **unità per scontrino (UPT)**, margine lordo %.
- **Solo se il brief lo indica** (dati che non tutti hanno): footfall, **conversione**
  (scontrini/footfall), capture rate, vendite per mq, vendite per addetto, giacenze /
  sell-through. Non inventarli di default; aggiungerli quando il cliente dice di avere quei dati.
- **Ogni KPI mostra MoM e YoY in evidenza:** freccia ▲/▼, valore della variazione, colore
  (verde meglio / rosso peggio). Il colpo d'occhio su "vs mese / vs anno" è essenziale.

## Dimensioni / split / filtri
- Negozio/sede · categoria/reparto · fascia oraria (daypart) · canale (in-store vs
  click&collect) · addetto · metodo di pagamento.
- Filtri tipici: negozio, categoria, periodo Anno>Q>Mese, canale.
- **Colore costante per categoria** su tutti i visual.

## Logica dei visual (il visual esatto lo decide chart-selection.md)
- Andamento ricavo nel tempo → linea (timeline-exempt dal filtro mese/trimestre).
- Mix per categoria → donut (2-5) o barra ordinata; composizione → barre 100%.
- Top prodotti/modelli → barre orizzontali ordinate.
- Chiusura → matrice a piena larghezza (per-negozio se catena, per-categoria se singolo) con
  totali, formattazione condizionale sul margine, e drill-through.

## Storia negativa FIRMA del retail (scelta dall'autore)
- **Un negozio o una categoria che trascina giù il totale:** il gruppo cresce ma una sede o un
  reparto è in calo YoY ed erode il risultato. È l'aggancio: "questa sede/categoria ti sta
  costando". (Combinabile con la tensione ricavo-vs-margine quando i dati la reggono.)

## Realismo dati (retail)
- **Margine lordo varia molto per sotto-settore:** alimentari ~25-30%, fashion ~50-60%,
  elettronica ~15-25%, arredo ~40-45%. Adeguare al settore del brief, non un valore unico.
- **AOV varia per settore** di ordini di grandezza (convenience pochi €, arredo/elettronica
  centinaia). Coerente col sotto-settore.
- **Stagionalità:** picco nov-dic (feste); fashion ha picchi primavera/autunno.
- **Like-for-like** confronta solo negozi comparabili (aperti da >1 anno): se una sede è nuova,
  escluderla dal LFL e dirlo.
- **Conversione in-store** plausibile ~20-40% (fashion più bassa, convenience più alta); footfall
  solo se ci sono contapersone → altrimenti modellare l'assenza, non inventare.
- **Tasso di reso** basso per alimentari, più alto per fashion.


## ÀNCORE DI GRANDEZZA — retail fisico

**Si fissano PRIMA di generare le conte.** Il rapporto è il vincolo, la conta è ciò che ne
discende: `conta = totale / rapporto_bersaglio`. Scegliere le conte a caso e sperare che il
rapporto torni produce numeri interni coerenti e assurdi — scontrino medio da 24 centesimi,
CAC payback di zero giorni, ricavo per socio di 89 centesimi.

| rapporto | intervallo plausibile | la conta si deriva così |
|---|---|---|
| AOV = fatturato / scontrini | alimentari 10 – 40 € · fashion 60 – 150 € · elettronica 150 – 600 € · arredo 300 – 1500 € | `scontrini = fatturato / AOV` |
| margine lordo % | alimentari 25 – 30% · fashion 50 – 60% · elettronica 15 – 25% · arredo 40 – 45% | `costo = fatturato × (1 − margine)` |
| conversione in-store | 20 – 40% (fashion più bassa, convenience più alta) | `footfall = scontrini / conversione` — solo se ci sono contapersone |

## Estetica
Corporate-sober di default (palette navy/steel o slate); variante calda-neutra
(charcoal/bronze/taupe) per fashion/lifestyle; accento del brand del retailer se dato. Rosso
riservato al problema (la sede/categoria in calo).

---

# Nicchia: VENDITE B2B / pipeline CRM (voce validata dall'autore)

**ARCHETIPI PLAUSIBILI:** 3 `funnel` · 4 `quadrants` · 2 `executive-summary`
**PELLE PLAUSIBILE:** palette `navy-corporate` · `slate-freddo` · `blu-ghiaccio` — tipografia `sans-sistema` o `slab` — shell `rail` o `top`.
L'archetipo si sceglie dalla DOMANDA e dalla DENSITA, non dalla nicchia: questi sono i tre
plausibili, non un ordine di preferenza. Definizioni in `layout-archetypes.md`.

Costruita dal lavoro reale dell'autore (funnel, scoreboard, gauge-target, ribbon) e arricchita
con ricerca sui KPI B2B/CRM e i benchmark 2026.

## Inquadramento
- **Utente finale:** sales leader / CRO / sales manager → corporate-sober.
- **Struttura: guidata dal brief — non dare mai per scontata una pagina sola.** Filtri quando la stessa struttura dati si ripete su una dimensione; PAGINE distinte quando il brief ha focus o temi diversi (overview + approfondimenti). Drill-through per il dettaglio.
- **Layout IBRIDO (scelta autore):** in alto i KPI di *risultato* (backward); sotto la *salute
  pipeline* (forward). Le due lenti nella stessa pagina.

## KPI che contano
- **Risultato (in alto):** Ricavo/bookings (closed-won), **Win rate**, **Quota attainment %**
  (vs target, con gauge e annotazione), scontrino/deal size medio, nuovi clienti, LTV.
- **Salute pipeline (sotto):** **Pipeline coverage ratio** (pipeline qualificata / target),
  **Sales cycle length** (giorni a chiusura), **Sales velocity** (= opp × deal size × win rate
  / ciclo), **weighted pipeline** (pesata per probabilità di stage), forecast.
- **Funnel di stage:** Lead → MQL/SQL → Opportunità → Proposta → Won, con conversione per stage.
- **Ogni KPI mostra la variazione vs periodo precedente** con freccia ▲/▼, valore e colore.

## Dimensioni / split / filtri
- **Primaria: segmento/settore o territorio** (scelta autore). Secondarie: fonte/canale, rep,
  stage, prodotto/linea.
- Filtri: segmento, territorio, periodo Anno>Q>Mese, fonte, rep.
- **Colore costante per categoria** (qui: per segmento/territorio) su tutti i visual.

## Logica dei visual (firma dell'autore + chart-selection)
- Funnel di stato (conversione per stage).
- Gauge con marcatore target + annotazione testuale ("Win rate 24%, +3pp sul target").
- **Ribbon** per l'evoluzione del ranking nel tempo (segmenti/territori/rep).
- Small multiples 4-up per confrontare segmenti/territori su più metriche; toggle Chart/Table.
- Linea ricavo vs banda target (timeline-exempt dal filtro mese/trimestre).
- Chiusura: matrice a piena larghezza per segmento/territorio, totali, formattazione condizionale
  sul win rate / coverage, drill-through.

## Storia negativa FIRMA del B2B sales (scelta autore)
- **Fonte con tanti lead ma bassa conversione — qualità vs quantità.** Una fonte riempie il CRM
  di volume ma non chiude: "stai pagando lead che non convertono". È l'equivalente sales della
  tensione ricavo-vs-margine dell'autore: volume alto, valore reale basso. Evidenziare la fonte
  problematica (in rosso / dimming) nel confronto per-fonte.

## Realismo dati (B2B sales, benchmark 2026)
- **Win rate B2B ~20-25%** (mid-market), media ~21%. Non mettere win rate del 60%.
- **Pipeline coverage 3x-5x** il target: sotto 3x non si fa quota; sopra 5x è pipeline "gonfia".
- **Sales cycle 60-90 giorni SMB, 90-180 mid-market/enterprise** (manifattura ~130, pharma >150).
- **LTV/CAC > 3** per unit economics sane.
- **Quota attainment medio ~74%, solo ~51% dei rep centra la quota** → realistico avere
  segmenti/rep sotto quota.
- Deal size varia molto per segmento; il B2B ha cicli lunghi e più stakeholder (non è B2C).
- Weighted pipeline = valore pesato per probabilità di stage, sempre < pipeline grezza.


## ÀNCORE DI GRANDEZZA — vendite B2B

**Si fissano PRIMA di generare le conte.** Il rapporto è il vincolo, la conta è ciò che ne
discende: `conta = totale / rapporto_bersaglio`. Scegliere le conte a caso e sperare che il
rapporto torni produce numeri interni coerenti e assurdi — scontrino medio da 24 centesimi,
CAC payback di zero giorni, ricavo per socio di 89 centesimi.

| rapporto | intervallo plausibile | la conta si deriva così |
|---|---|---|
| win rate = vinte / chiuse | 20 – 25% mid-market (media ~21%). Mai 60%. | `vinte = chiuse × win rate` |
| pipeline coverage = pipeline / target | 3× – 5× | `pipeline = target × coverage` |
| ciclo di vendita | 60 – 90 giorni SMB · 90 – 180 mid-market/enterprise | in GIORNI, mai zero |
| LTV / CAC | > 3 | `LTV = CAC × rapporto` |

## Estetica
Corporate-sober; firme dell'autore (gauge+target+annotazione, ribbon, colore per
segmento/territorio, small multiples, funnel, toggle Chart/Table). Rosso riservato al problema
(la fonte a bassa conversione, un segmento sotto quota).

---

# Nicchia: RISTORAZIONE / F&B (voce validata dall'autore)

**ARCHETIPI PLAUSIBILI:** 8 `operational` · 4 `quadrants` · 1 `scorecard`
**PELLE PLAUSIBILE:** palette `terroso` · `warm-taupe` · `salvia` — tipografia `slab` o `editoriale` — shell `rail-slim` o `bare`. Il caldo appartiene al cibo piu del blu.
L'archetipo si sceglie dalla DOMANDA e dalla DENSITA, non dalla nicchia: questi sono i tre
plausibili, non un ordine di preferenza. Definizioni in `layout-archetypes.md`.

Ristoranti, catene food, bar. Da ricerca sui KPI/benchmark F&B, validata sui dubbi.

## Inquadramento
- **Utente finale:** titolare / direttore operativo / area manager → corporate-sober (default),
  variante calda-neutra per il feel "food brand".
- **Struttura: guidata dal brief — non dare mai per scontata una pagina sola.** Filtri quando la stessa struttura dati si ripete su una dimensione; PAGINE distinte quando il brief ha focus o temi diversi (overview + approfondimenti). Drill-through per il dettaglio.
- **Scope dipende dal brief:** più sedi citate → catena (sede = filtro, matrice per-sede);
  altrimenti → locale singolo (matrice per fascia oraria / categoria).

## KPI che contano
- **Scorecard bilanciata (core, scelta autore): Prime Cost + RevPASH + scontrino medio.**
- **Prime Cost = COGS (food) + costo lavoro** — il numero re. Target 55-65% dei ricavi;
  oltre 70% insostenibile. Mostrarlo vs target con verde/giallo/rosso.
- **RevPASH** = ricavi / (posti × ore aperte) — l'efficienza della capacità.
- **Scontrino medio** (spesa per coperto), meglio se per fascia oraria e con/senza bevande.
- Supporto: Food Cost % (25-32%), Labor Cost % (25-35%), coperti, table turns (1,5-2,5 serale
  full-service), occupazione posti, voids/comps, top e bottom seller.
- **Ogni KPI mostra la variazione vs periodo precedente** con freccia, valore e colore, e lo
  stato vs target (verde/giallo/rosso).

## Dimensioni / split / filtri
- Sede/locale · brand · canale (sala vs delivery vs asporto) · **fascia oraria (daypart)** ·
  categoria menù · giorno della settimana · turno (FOH/BOH).
- Filtri: sede, canale, fascia oraria, periodo Anno>Q>Mese, categoria.
- **Colore costante per categoria** su tutti i visual.

## Logica dei visual (il visual esatto lo decide chart-selection.md)
- Andamento ricavi/prime cost nel tempo → linea/combo (timeline-exempt dal filtro mese/trim.).
- Mix vendite per categoria menù e canale → barre 100% / donut (2-5).
- Top e bottom seller → barre orizzontali ordinate (aggancio menu engineering).
- **Heatmap fascia-oraria × giorno della settimana** → rivela dove si perde (vedi storia neg.).
- Chiusura: matrice a piena larghezza (per-sede se catena, per fascia/categoria se singolo),
  totali, formattazione condizionale verde/giallo/rosso su prime cost e margine, drill-through.

## Storia negativa FIRMA della ristorazione (scelta autore)
- **Una sede o una fascia oraria che perde, nascosta dalla media.** Il totale sembra sano, ma
  il martedì a pranzo (o una sede) va in perdita mentre il sabato sera regge il numero. La media
  settimanale/complessiva lo nasconde; la heatmap fascia×giorno (o il confronto per-sede) lo
  fa emergere. È l'aggancio: "questo turno/sede ti sta bruciando margine e non te ne accorgi".

## Realismo dati (F&B, benchmark)
- **Prime cost 55-65%** dei ricavi (>70% insostenibile). **Food cost 25-28% quick / 28-32%
  full-service. Labor 25-35%.**
- **RevPASH ~10-15$ (€) per posto/ora** per operazioni sane.
- **Table turns 1,5-2,5** a servizio (serale full-service); occupazione posti ~60-70% nel picco.
- **Delivery: le piattaforme trattengono ~25-35% di commissione** → il delivery ha margine
  molto più basso della sala (utile per il mix canale).
- Forte **stagionalità e ciclo settimanale**; le fasce orarie sono "business diversi dalla
  stessa cucina" (pranzo vs cena). Scontrino medio varia molto per concept.


## ÀNCORE DI GRANDEZZA — ristorazione / F&B

**Si fissano PRIMA di generare le conte.** Il rapporto è il vincolo, la conta è ciò che ne
discende: `conta = totale / rapporto_bersaglio`. Scegliere le conte a caso e sperare che il
rapporto torni produce numeri interni coerenti e assurdi — scontrino medio da 24 centesimi,
CAC payback di zero giorni, ricavo per socio di 89 centesimi.

| rapporto | intervallo plausibile | la conta si deriva così |
|---|---|---|
| prime cost = (food + labour) / ricavi | 55 – 65% | `food + labour = ricavi × prime cost` |
| food cost = costo merci / ricavi | 25 – 32% | `costo merci = ricavi × food cost` |
| scontrino medio | 12 – 45 € a coperto secondo la formula | `coperti = ricavi / scontrino medio` |
| RevPASH | 10 – 15 € per posto per ora | `posti × ore = ricavi / RevPASH` |

## Estetica
Corporate-sober di default; variante calda-neutra per food brand; formattazione condizionale
verde/giallo/rosso vs target (firma dell'autore). Rosso riservato al problema (la sede/fascia
in perdita).

---

# Nicchia: FINANZIARIO / controllo di gestione (CFO) (voce validata dall'autore)

**ARCHETIPI PLAUSIBILI:** 5 `bridge` · 2 `executive-summary` · 4 `quadrants`
**PELLE PLAUSIBILE:** palette `carta-inchiostro` · `slate-freddo` · `navy-corporate` — tipografia `editoriale` o `sans-sistema` — shell `bare` o `rail`. Un CFO non prende il pastello ne il dark agency: quella pelle dice "campagna", non "chiusura di bilancio".
L'archetipo si sceglie dalla DOMANDA e dalla DENSITA, non dalla nicchia: questi sono i tre
plausibili, non un ordine di preferenza. Definizioni in `layout-archetypes.md`.

P&L, margini, cassa, budget-vs-actual, per business unit / centro di costo. Da ricerca sui KPI
CFO, validata sui dubbi.

## Inquadramento
- **Utente finale:** CFO / controller → corporate-sober; board / C-level → executive-minimal.
- **Struttura: guidata dal brief — non dare mai per scontata una pagina sola.** Filtri quando la stessa struttura dati si ripete su una dimensione; PAGINE distinte quando il brief ha focus o temi diversi (overview + approfondimenti). Drill-through per il dettaglio.
- **La LENTE segue il brief — NON ammucchiare tutto in una pagina (regola autore).** Il CFO è
  un dominio ampio: scegli il focus che il brief chiede e costruisci quello, non un cruscotto
  che stipa redditività + cassa + varianza + ratio insieme. Le lenti tipiche:
  - **Redditività P&L** (ricavo, margine, EBITDA, utile)
  - **Cassa e liquidità** (cash flow, runway, capitale circolante, AR/AP)
  - **Budget vs actual** (varianza per centro di costo)
- **Scope e dimensione primaria dipendono dal brief** (business unit / centro di costo /
  prodotto-segmento).

## KPI che contano (raggruppati per lente — usa quelli della lente scelta)
- **Redditività:** ricavo (mensile + YTD), margine lordo %, EBITDA / margine operativo, utile
  netto, ricavo per segmento/prodotto.
- **Cassa & liquidità:** cash flow operativo, free cash flow, cassa disponibile, giorni di
  cassa, **cash runway**, forecast di cassa rolling 13 settimane.
- **Capitale circolante:** **AR aging** (corrente / 30 / 60 / 90+), AP aging, DSO, working
  capital. Segnale = movimento nelle fasce 60 e 90+.
- **Budget vs actual:** varianza per centro di costo in valore assoluto e %, forecast variance.
- **Ratio:** current/quick ratio, debt-to-equity, interest coverage, net debt/EBITDA.
- **Scenario come dimensione:** Actual / Budget / Forecast (il budget-vs-actual è tavola
  imbandita, non opzionale).
- **Ogni KPI mostra la variazione** (vs periodo prec. e/o vs budget) con freccia, valore, colore.

## Logica dei visual (il visual esatto lo decide chart-selection.md)
- **Waterfall / bridge** della varianza P&L (budget → actual) — il visual firma del CFO.
- Budget-vs-actual → barre con varianza % + banda di riferimento.
- **Trend di cassa a 13 mesi** rolling con proiezione futura tratteggiata (actual vs forecast).
- AR/AP aging → barra impilata per fascia di scaduto.
- **Scatter di segmentazione** (margine % vs ricavo, con mediane a quadranti) per la tensione
  ricavo-vs-margine (firma autore).
- Chiusura: matrice a piena larghezza per business unit / centro di costo, con formattazione
  condizionale sulla varianza, totali, drill-through.

## Storia negativa FIRMA del finanziario (scelta autore)
- **Erosione del margine: ricavo su, margine giù.** La firma dell'autore. Il fatturato cresce
  ma il margine si comprime — un prodotto/cliente/BU ad alto ricavo e basso margine tira giù la
  redditività. Farla emergere con lo scatter a quadranti o col trend margine% che diverge dal
  trend ricavo.

## Realismo dati (finanziario)
- **Margini per settore** (lordo ed EBITDA molto diversi tra industrie): coerenti col settore
  del brief, non un valore unico.
- **AR aging:** la maggior parte in "corrente", quote decrescenti nelle fasce più vecchie; il
  peggioramento sta nel 60/90+.
- **Varianza budget** plausibile (pochi punti %, non 200%); forecast < actual o > actual di
  poco.
- **Cash runway** in mesi coerente col burn; per aziende in crescita è la metrica-allarme.
- **Colore varianza favorevole/sfavorevole:** per i COSTI sopra-budget = rosso; per i RICAVI
  sotto-budget = rosso. Non è "su=verde" meccanico, dipende dal segno della voce.


## ÀNCORE DI GRANDEZZA — finanziario / CFO

**Si fissano PRIMA di generare le conte.** Il rapporto è il vincolo, la conta è ciò che ne
discende: `conta = totale / rapporto_bersaglio`. Scegliere le conte a caso e sperare che il
rapporto torni produce numeri interni coerenti e assurdi — scontrino medio da 24 centesimi,
CAC payback di zero giorni, ricavo per socio di 89 centesimi.

| rapporto | intervallo plausibile | la conta si deriva così |
|---|---|---|
| EBITDA % | 5 – 20% secondo il settore | `EBITDA = ricavi × margine` |
| DSO (giorni di incasso) | 30 – 90 giorni, mai zero | `crediti = ricavi / 365 × DSO` |
| scostamento budget | −15% – +10%: un actual che centra il budget al centesimo non è credibile | `actual = budget × (1 + scostamento)` |

## Estetica
Corporate-sober (controller) o executive-minimal (board); waterfall e varianza puliti; colore
varianza per significato (vedi sopra). Rosso riservato al problema (margine eroso, sforamento,
scaduto in crescita).

---

# Nicchia: LOGISTICA / trasporti (voce validata dall'autore, dal suo report reale)

**ARCHETIPI PLAUSIBILI:** 4 `quadrants` · 8 `operational` · (6 `geo` quando il motore avra la mappa)
**PELLE PLAUSIBILE:** palette `slate-freddo` · `blu-ghiaccio` · `dark-tecnico` — tipografia `condensato` o `tecnico` — shell `rail-slim` o `top`.
L'archetipo si sceglie dalla DOMANDA e dalla DENSITA, non dalla nicchia: questi sono i tre
plausibili, non un ordine di preferenza. Definizioni in `layout-archetypes.md`.

Costruita dal report trasporti reale dell'autore e dalla sua filosofia scritta. Il suo lavoro
è l'autorità qui.

## Inquadramento
- **Utente finale:** direttore operativo / titolare azienda di trasporti → corporate-sober o
  brand teal/verde (stile del suo report). Filtri sull'asse superiore (strisce slicer).
- **Struttura: guidata dal brief — non dare mai per scontata una pagina sola.** Filtri quando la stessa struttura dati si ripete su una dimensione; PAGINE distinte quando il brief ha focus o temi diversi (overview + approfondimenti). Drill-through per il dettaglio.
- **Dimensione primaria: PER ROTTA** (scelta autore). Secondarie: cliente, tratta
  (mittente–destinatario), carrier vs flotta propria.

## KPI che contano
- Ricavo, Costi, **Profitto**, **Margine %**, % ricavo internazionale, costo medio per
  spedizione, split **carrier vs flotta propria**.
- **Unità di verità (scelta autore): margine per km come metrica principale, margine per
  spedizione a supporto.** Perché il ricavo per rotta favorisce le rotte lunghe e il costo per
  rotta favorisce le corte: normalizzare a per-km rende rotte, veicoli, clienti confrontabili.
- **Ogni KPI mostra la variazione** (MoM/WoW) con freccia, valore, colore.

## Dimensioni / split / filtri
- Rotta (primaria) · tratta mittente–destinatario · cliente · carrier vs flotta propria ·
  spedizione · settimana.
- Filtri: mittente, destinatario, cliente, periodo, spedizione.
- **Colore costante per categoria** su tutti i visual.

## Logica dei visual (firma dell'autore + chart-selection)
- Ricavo/costi e profitto per settimana → linea con trend (timeline-exempt).
- **Tabella leakage:** spedizioni/rotte con flag Healthy/Leakage, rosso condizionale sulle
  perdite. Firma della nicchia.
- Split carrier vs flotta propria → pie (2 voci) o barra impilata; per settimana → colonne.
- **Top clienti/rotte per costo** con highlight condizionale (rosso sul problema).
- **Mappa geografica (elemento firma della logistica):** bubble map di profitto/ricavo/costo per paese, tratta o rotta — o una pagina Geografico dedicata. Le mappe sono centrali qui, non opzionali: mostrano subito quali aree rendono e quali no.
- Variazione MoM/WoW → colonne raggruppate con % .
- Chiusura: matrice a piena larghezza per rotta, margine per km, formattazione condizionale,
  drill-through.

## Storia negativa FIRMA della logistica (scelta in base ai dati — tre spunti validi)
- **Leakage:** rotte/spedizioni che vanno in perdita (flag rosso). Il margine per km rivela
  quali perdono davvero, a prescindere dalla lunghezza.
- **Cliente che porta ricavo ma uccide il margine** (la tensione firma dell'autore).
- **Costo flotta propria vs carrier fuori controllo** su certe tratte.
Scegli quella che i dati sintetici rendono più netta; spesso leakage + tensione-cliente
convivono.

## Realismo dati (logistica)
- **Margini sottili:** profit margin a una cifra è normale (il report reale ~10-11%). Non
  gonfiare.
- **I costi carrier dominano** sulla flotta propria (nel report reale ~91% carrier / 9%
  propria). Coerente.
- **Esiste leakage reale:** alcune rotte/spedizioni con profitto negativo o vicino a zero.
- **Margine per km** è la metrica equa; rotte lunghe alto ricavo non implica alto margine.
- Cadenza spesso settimanale; forte componente internazionale.


## ÀNCORE DI GRANDEZZA — logistica / trasporti

**Si fissano PRIMA di generare le conte.** Il rapporto è il vincolo, la conta è ciò che ne
discende: `conta = totale / rapporto_bersaglio`. Scegliere le conte a caso e sperare che il
rapporto torni produce numeri interni coerenti e assurdi — scontrino medio da 24 centesimi,
CAC payback di zero giorni, ricavo per socio di 89 centesimi.

| rapporto | intervallo plausibile | la conta si deriva così |
|---|---|---|
| margine netto | ~10% (settore a margine sottile) | `costi = ricavi × (1 − margine)` |
| costo per spedizione | 3 – 30 € (mai centesimi) | `spedizioni = costi carrier / costo per spedizione` |
| margine per km | 0,05 – 0,50 €/km | `km = margine totale / margine per km` |

## Estetica
Teal/verde (stile autore) o corporate-sober; flag leakage rosso/verde; rosso riservato al
problema (rotta/cliente in perdita).

---

# Nicchia: ENERGIA / MANIFATTURA (gross margin) — voce validata dall'autore, dal suo report reale

**ARCHETIPI PLAUSIBILI:** 4 `quadrants` · 8 `operational` · 5 `bridge`
**PELLE PLAUSIBILE:** palette `dark-tecnico` · `slate-freddo` · `monocromo-accento` — tipografia `tecnico` o `condensato` — shell `rail` o `rail-slim`.
L'archetipo si sceglie dalla DOMANDA e dalla DENSITA, non dalla nicchia: questi sono i tre
plausibili, non un ordine di preferenza. Definizioni in `layout-archetypes.md`.

Produttore di pezzi / servizi industriali con focus su gross margin. Il Gross Margin Report reale
dell'autore è l'autorità.

## Inquadramento
- **Utente finale:** controller / direzione operativa / plant manager → corporate-sober chiaro
  con accento periwinkle/viola (stile del suo report); rail sinistra con molti filtri.
- **Struttura: guidata dal brief — spesso MULTI-PAGINA (come il suo report reale).** Il core è
  il Gross Margin (cliente×SKU); il report reale aggiunge pagine Service Utilization, Inventory,
  Tickets/Timecards. Includi le pagine ulteriori quando il brief o i dati le supportano.
- **Dimensione primaria: per cliente** (scatter di segmentazione), con **SKU/pezzo in drill**;
  altrimenti dipende dal brief.

## KPI che contano
- **Core gross margin:** Revenue, **Gross Margin $**, **Gross Margin %**, **MoM GM%**, tutti
  vs anno prima.
- **Se multi-pagina (dati permettendo):** Service Utilization %, Billed Utilization %, Inventory
  Value/Qty, costo per pezzo, ore fatturabili vs non.
- **Ogni KPI mostra la variazione** (vs LY e MoM) con freccia, valore, colore.

## Dimensioni / split / filtri
- **Cliente (primaria)** · SKU/pezzo · tipo prodotto / classe · status · sede di servizio ·
  dipendente · event type · mese.
- Filtri (rail sinistra): data, type, prodotto, classe, cliente, SKU.
- **Slider parametrici (Labor Cost Rate / Shop Hourly Rate): SOLO se abbiamo i dati per il
  what-if o se richiesti dall'utente** (scelta autore). Non di default.
- **Colore costante per categoria** su tutti i visual.

## Logica dei visual (firma dell'autore + chart-selection)
- **Trend combo** ricavo (colonne) + GM% (linea), doppio asse (timeline-exempt).
- **Scatter di segmentazione clienti (firma):** GM% vs ricavo con **mediane a quadranti** →
  rivela i clienti ad alto ricavo e basso margine.
- **Matrice MoM densa (firma):** cliente → SKU, con Revenue/Gross Margin/GM%/MoM, **heatmap
  condizionale verde/giallo/rosso** e frecce MoM. Toggle Summary/MoM.
- (pagine ulteriori) 100% stacked per ore non-fatturabili; **waterfall** per movimento
  inventory + area con slider data.
- Chiusura: matrice a piena larghezza per cliente/SKU con formattazione condizionale,
  drill-through.

## Storia negativa FIRMA (revenue-vs-margine — firma inequivocabile dell'autore)
- **Clienti o SKU ad alto ricavo e basso/negativo margine**, evidenziati dallo scatter a
  quadranti (quadrante basso-destra: molto ricavo, poco margine). Combinabile con **GM% in calo
  YoY** che erode la redditività. È letteralmente la tensione ricavo-vs-margine dell'autore.

## Realismo dati (energia/manifattura)
- **GM% plausibile ~45-55%** (il report reale ~52%); la storia sta nel **GM% in calo YoY** e
  nella dispersione tra clienti.
- Utilization ~60-80%; inventory value elevato; costi labor guidati dagli slider (se presenti).
- Margini molto diversi per SKU/servizio → lo scatter mostra la dispersione, non un valore unico.
- Cadenza mensile con vista MoM; clienti B2B industriali (nomi tipo società oil/gas, resource).


## ÀNCORE DI GRANDEZZA — energia / manifattura

**Si fissano PRIMA di generare le conte.** Il rapporto è il vincolo, la conta è ciò che ne
discende: `conta = totale / rapporto_bersaglio`. Scegliere le conte a caso e sperare che il
rapporto torni produce numeri interni coerenti e assurdi — scontrino medio da 24 centesimi,
CAC payback di zero giorni, ricavo per socio di 89 centesimi.

| rapporto | intervallo plausibile | la conta si deriva così |
|---|---|---|
| gross margin % | 45 – 55% | `COGS = ricavi × (1 − GM%)` |
| utilization impianti | 65 – 90% | `ore usate = capacità × utilization` |
| prezzo medio per unità | ≥ 1 €, tipicamente 10 – 1000 € secondo il prodotto | `unità vendute = ricavi / prezzo medio` |

## Estetica
Corporate-sober chiaro con accento periwinkle/viola (stile autore); heatmap condizionale nella
matrice; scatter con mediane; rosso riservato al problema (cliente/SKU a margine eroso).

---

# Nicchia: CREATOR ECONOMY / education (voce validata dall'autore, dal report WeLearn)

**ARCHETIPI PLAUSIBILI:** 3 `funnel` · 7 `cohorts` · 1 `scorecard`
**PELLE PLAUSIBILE:** palette `jewel-desaturati` · `pastello-sobrio` · `dark-agency` — tipografia `geometrico` o `editoriale` — shell `top` o `bare`.
L'archetipo si sceglie dalla DOMANDA e dalla DENSITA, non dalla nicchia: questi sono i tre
plausibili, non un ordine di preferenza. Definizioni in `layout-archetypes.md`.

Piattaforma/agenzia che gestisce creator (corsi, webinar). Il report WeLearn reale è l'autorità.

## Inquadramento
- **Utente finale:** piattaforma/agenzia creator-economy → tema scuro brandizzato (stile
  WeLearn, accento rosa) o agency-modern.
- **Struttura: guidata dal brief — tipicamente MULTI-PAGINA** (come il suo report): Creators,
  Leaderboard, Launches, Webinars, più la pagina glossario KPI.
- **Dimensione primaria: per NICCHIA di default** (se ci sono nicchie). La grana del livello
  "persone" è **adattiva al numero**: pochi → per creator; molti → si aggrega su AM; moltissimi
  → su team (soglie indicative: creator gestibile fino a ~10-25, poi AM, oltre ~50 team).
  Regola: mostra il livello più granulare che resta leggibile.

## KPI che contano
- Revenue, **Operative Margin**, **Margin %**, **Net Achieved** (ricavo netto realizzato nel
  trimestre, solo transazioni completate, × quota piattaforma ~50%), **Target**, **Target
  Achievement %**, **Creators OTM** (attivi con ≥1 vendita qualificante $10+) vs **Creators NOT
  OTM** (mai venduto).
- Revenue/margine per creator, AM, nicchia, tipo prodotto.
- **Ogni KPI mostra la variazione** con freccia, valore, colore.

## Dimensioni / split / filtri
- **Nicchia (primaria)** · creator · AM · team · tipo prodotto (course/webinar/membership/
  affiliate) · launch · mese.
- Filtri: periodo (gerarchico), AM, team/planet, tipo prodotto.
- **Colore costante per categoria** su tutti i visual.

## Logica dei visual (firma dell'autore + chart-selection)
- **Pagina glossario KPI** (Net Achieved, OTM sono calcolati + molti segmenti → sempre utile).
- **Treemap** del mix per tipo prodotto (spesso Course dominante = Pareto).
- **Donut 2-categorie OTM / NOT OTM** (Pareto: chi produce vs peso morto).
- **Ribbon** dell'evoluzione ricavo per team/nicchia nel tempo.
- **Gauge vs target** per Target Achievement %.
- Matrice per creator/AM con Revenue/Operative Margin/Margin % e heatmap condizionale.
- **"Best X for Y"** liste ordinate (best creator per ricavo, best launch, ecc.).
- Revenue per mese → area con etichette.
- Chiusura: matrice a piena larghezza per nicchia/creator, formattazione condizionale, drill.

## Storia negativa FIRMA della creator-economy (scelta autore)
- **Una nicchia o un team a basso margine** che tira giù la redditività complessiva: alto ricavo
  ma margine sotto la media, evidenziato nella matrice (heatmap) o nelle barre ricavo/margine
  per nicchia. (Combinabile con NOT OTM alto = molti creator attivati ma improduttivi.)

## Realismo dati (creator-economy)
- **Operative margin alto** (il report reale ~60-70%); la storia sta nella dispersione tra
  nicchie/team, non nel livello assoluto.
- **Target achievement varia** per trimestre (alcuni sotto 100%).
- **OTM ~75-80% / NOT OTM ~20-25%**: c'è sempre una coda di creator attivati che non vendono.
- **Mix prodotto sbilanciato** (Course dominante) → treemap/Pareto.
- Net Achieved < Revenue (solo transazioni completate × quota piattaforma).


## ÀNCORE DI GRANDEZZA — creator economy

**Si fissano PRIMA di generare le conte.** Il rapporto è il vincolo, la conta è ciò che ne
discende: `conta = totale / rapporto_bersaglio`. Scegliere le conte a caso e sperare che il
rapporto torni produce numeri interni coerenti e assurdi — scontrino medio da 24 centesimi,
CAC payback di zero giorni, ricavo per socio di 89 centesimi.

| rapporto | intervallo plausibile | la conta si deriva così |
|---|---|---|
| operative margin | 60 – 70% | `costi = ricavi × (1 − margine)` |
| target achievement | 70 – 120%, con trimestri sotto il 100% | `achieved = target × achievement` |
| prezzo medio del corso/prodotto | 30 – 900 € | `transazioni = ricavi / prezzo medio` |

## Estetica
Tema scuro brandizzato (stile WeLearn, accento rosa) o agency-modern; treemap/ribbon/gauge;
heatmap condizionale; rosso riservato al problema (nicchia/team a basso margine).

---

# STARTER (non ancora validate col sondaggio — usare con cautela)

## 3 voci compilate come MODELLO (correggile: sei tu l'esperto)

### Palestre / catena fitness
- **ARCHETIPI PLAUSIBILI:** 7 `cohorts` · 8 `operational` · 3 `funnel`
- **PELLE PLAUSIBILE:** palette `salvia` · `pastello-sobrio` · `warm-taupe` — tipografia `geometrico` o `humanist` — shell `rail-slim` o `top`.
- **Utente finale:** titolare / direttore club → corporate-sober, tono energico ma pulito.
- **Domande:** stiamo trattenendo i soci o li perdiamo? quali corsi riempiono e quali no?
  i nuovi iscritti coprono gli abbandoni? quali sedi rendono?
- **KPI:** soci attivi, nuovi iscritti/mese, **tasso di rinnovo (retention)**, **churn**,
  **tasso di riempimento corsi**, ricavo per socio (o per sede).
- **Dimensioni:** sede (Centro, Nord, Sud), tipo abbonamento (Mensile/Annuale/Open), corso
  (Sala pesi, Spinning, Yoga, Funzionale, Nuoto), canale acquisizione.
- **Storia negativa:** una sede o una fascia d'abbonamento con churn in salita che erode la
  crescita dei nuovi iscritti; oppure corsi a bassa occupazione che costano quanto quelli pieni.
- **Estetica:** corporate-sober, accenti puliti; rosso solo su churn/abbandoni.
- **ÀNCORE DI GRANDEZZA (fissale prima delle conte):** ricavo per socio = quota mensile plausibile, **20 – 90 €/mese** (mai centesimi) → `soci = ricavi / quota`; churn mensile **2 – 6%**; tasso di riempimento corsi **50 – 85%** → `presenze = posti × riempimento`; tasso di rinnovo **60 – 80%**.

### E-commerce moda
- **ARCHETIPI PLAUSIBILI:** 3 `funnel` · 4 `quadrants` · 7 `cohorts`
- **PELLE PLAUSIBILE:** palette `monocromo-accento` · `pastello-sobrio` · `jewel-desaturati` — tipografia `geometrico` o `condensato` — shell `top` o `bare`.
- **Utente finale:** founder → corporate-sober o agency-modern.
- **Domande:** quali canali portano clienti che poi RESTANO? quali categorie hanno troppi resi?
  il costo di acquisizione sta salendo? chi ricompra?
- **KPI:** fatturato netto (dei resi), **tasso di reso**, **CAC per canale**, **repeat-purchase
  rate**, AOV, margine per categoria.
- **Dimensioni:** canale (Meta/Google/TikTok/Organico/Influencer), categoria prodotto, cliente
  nuovo/di ritorno, device.
- **Storia negativa:** un canale con CAC in salita e clienti che non ricomprano; una categoria
  con alto fatturato ma tasso di reso che ne mangia il margine (tensione ricavo-vs-margine).
- **Estetica:** corporate-sober se founder analitico, agency-modern se brand giovane.
- **ÀNCORE DI GRANDEZZA (fissale prima delle conte):** AOV **60 – 150 €** per il fashion → `ordini = fatturato / AOV` (mai ordini scelti a caso); tasso di reso **20 – 40%**; CAC **15 – 60 €** → `nuovi clienti = spesa / CAC`; repeat-purchase rate **20 – 35%**.

### SaaS (per board / leadership)
- **ARCHETIPI PLAUSIBILI:** 2 `executive-summary` · 7 `cohorts` · 5 `bridge`
- **PELLE PLAUSIBILE:** palette `carta-inchiostro` · `alto-contrasto` · `dark-tecnico` — tipografia `editoriale` o `sans-sistema` — shell `bare` o `top`.
- **Utente finale:** board / exec → executive-minimal, con frase narrativa.
- **Domande:** cresciamo in modo sano o riempiamo un secchio bucato? l'espansione batte il
  churn? quanto ci mettiamo a ripagare l'acquisizione?
- **KPI:** **MRR** e sua scomposizione (new/expansion/churn), **NRR**, **churn logo e $**,
  **CAC payback**, magic number.
- **Dimensioni:** piano (Starter/Pro/Enterprise), coorte di ingresso, segmento cliente,
  canale.
- **Storia negativa:** una coorte che si sfalda dopo N mesi, o CAC payback che si allunga
  mentre l'espansione rallenta — il "secchio bucato".
- **Estetica:** executive-minimal, monocromo + colore solo sulla varianza.
- **ÀNCORE DI GRANDEZZA (fissale prima delle conte):** CAC payback **12 – 24 MESI** (mai zero, mai giorni) → `CAC = ARPA mensile × payback`; NRR **95 – 120%**; churn logo mensile **0,5 – 2%**; ARPA coerente col piano, **decine o centinaia di euro al mese**.

---

