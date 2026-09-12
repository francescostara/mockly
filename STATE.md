# PRUVA — Stato del progetto (memoria per Claude Code)

Documento-memoria compatto. Tienilo come fonte di verità del repo. Regola d'oro: **una regola
cambia PRIMA in /skill, POI nel motore. Mai il contrario.**

## 1. Cos'è
Genera mockup interattivi di dashboard BI: un file HTML self-contained, 1280x720, con dati
sintetici plausibili, cross-filter, drill-through, tooltip. È l'artefatto di PRE-VENDITA che un
consulente BI manda al cliente prima di costruire il report vero in Power BI. La promessa non è
correttezza, è persuasione (numeri finti ma plausibili). Cliente pagante primario: società di
consulenza BI; freelance = distribuzione bottom-up. Brand consulenza: Northlane Partners.
Posizionamento: "il metodo di veri BI developer, eseguito in automatico" (non "niente AI": il
giudizio è umano, l'esecuzione è automatica).

## 2. Architettura (il fossato)
- **LLM = GIUDIZIO** → produce una SPEC JSON + dataParams (estetica, scelta grafici, storyline,
  etichette, carattere dei dati). NON scrive HTML.
- **MOTORE in codice = DETERMINISMO** → render(spec, data) -> HTML self-contained byte-deterministico
  (griglia, formattazione, aggregazione, filtri, grafici SVG, slicer date, cross-filter, drill,
  tooltip, fit-to-viewport, riconciliazione totali).
- La SPEC è DICHIARATIVA (misure sum/diff/ratio/last, niente codice eseguibile → sicurezza +
  determinismo). Il renderer fa escape delle stringhe (M.esc) → XSS chiuso.

## 3. Dove sta tutto
- Repo: github.com/francescostara/**mockly** (PRIVATO, account francescostara). App:
  **mockly-black.vercel.app**. Vercel: account francescostara (login GitHub).
  NOME: il prodotto e Pruva; repo e progetto Vercel portano ancora il nome vecchio finche non
  li rinomina l'autore a mano — questi due sono URL veri, non occorrenze da sostituire.
  Destinazione dichiarata: francescostara.com/pruva. La consulenza resta francescostara.com:
  sono due livelli separati, come l'app e i mockup che produce.
- Branch: main (skill) · engine-extraction · mvp-webapp (deployato) · + branch di lavoro
  (eval-harness, fix-visual-bugs, fix-data-contract, wire-niches).
- **/engine** (~3000 righe): runtime.js, render.js, data-model.js (rescale + IPF/RAS),
  data-builder.js, spec.d.ts + spec-schema.md + data-params.md. 12 tipi di visual (trend, colonna+
  linea, hbar, donut, stack100, ribbon, funnel, waterfall, scatter, matrice, sparkline, narrativa).
- **/app** (Next.js, deployato): questionario intake client-side (GRATIS), unica azione a
  pagamento /api/generate (chiave server-side, system prompt ~12k token cacheato, 1 retry di
  riparazione, fallback deterministico che non mostra mai errore, iframe sandbox, download,
  metering stub). PRUVA_STUB=1 gira senza crediti (spec canned); PRUVA_STUB=broken esercita
  riparazione→fallback.
- **/skill** = specifica autorevole. SKILL.md + references/ (pattern-library, chart-selection,
  domain-knowledge, data-realism, qa-checklist, house-style, data-availability, **niches**) +
  assets/canonical-retail-fullspec.html (esempio compliant, fonte del motore) + evals/.
- **/test**: `npm test` = 164 check / 1040 stati verdi. Gate 5 (filtro cambia il TESTO di una
  KPI, non solo una classe), Gate 6 (larghezza toolbar), tie-out totali, equivalenza col canonico.

## 4. Regole NON negoziabili (dalla skill)
Canvas 1280x720; griglia condivisa span(k) con bordi allineati su tutte le righe; slicer
Anno>Trimestre>Mese dropdown con timeline esente; KPI card etichettano YoY/MoM con freccia+
valore+colore; colore costante per categoria; OGNI filtro deve filtrare davvero a UN layer di
aggregazione condiviso (mai decorativo); insights solo measure-driven (mai prosa a mano);
matrice congiunta IPF/RAS per due dim sullo stesso totale; output economy (~500 righe/pagina);
ricostruibile 1:1 in Power BI; storia negativa sempre presente; rosso riservato al problema.
**Regole generali recenti:** MAI dare per scontata una pagina sola (struttura guidata dal brief:
filtri se la stessa struttura dati si ripete, pagine se focus distinti); le MAPPE sono un visual
legittimo ovunque ci sia una dimensione geografica; glossario KPI quando ci sono KPI calcolati o
molti segmenti. Model floor: Sonnet (Haiku da testare sulla sola spec).

## 5. Cosa è stato fatto (steps eseguiti)
- Split architetturale + estrazione motore in codice + webapp su Vercel + test 164/1040 verdi.
- Primo eval a pagamento: **50% valida al primo colpo** (soglia 75%). CAUSA UNICA: 3/4 fallback
  hanno lo stesso errore `dataParams.dims["X"] (facts.dim) has no members` → regola mancante nel
  contratto dati, NON varianza del modello. Secondo pattern: testo dopo il JSON. effort:low ha
  dimezzato costo ($0.26→$0.133) e latenza (140s→72s).
- **Libreria nicchie consolidata** in references/niches.md, 11 nicchie con regola di
  riconoscimento. 8 validate una-a-una col fondatore (social, retail, B2B sales, ristorazione,
  finanziario/CFO, logistica, energia/manifattura, creator-economy), 3 starter (e-commerce, SaaS,
  palestre). Ognuna: KPI, split, visual firma, STORIA NEGATIVA, palette, realismo.
- **data-availability.md**: stima probabilistica dei dati (floor/probabile/raro) modulata dalla
  TAGLIA del cliente dedotta dal brief. Non chiedere mai dati mancanti a metà flusso: stimare.
- **Istruzioni pre-prompt**: un solo prompt iniziale (5 punti: attività+taglia, cosa mostrare,
  dati/strumenti, pubblico, brand) → un giro solo di modello, nessuna domanda dopo. Se un punto
  manca, default della nicchia, NON si chiede.
- Ricerca competitor (Mokkup.ai è il diretto; fossato = interattività vera + dati-con-storia +
  dominio + motore) e stack di design gratuita con Claude (niente Higgsfield: l'animazione UI è
  codice).

## 5-bis. Le tre strade aperte in questo giro (tutte a costo zero)

**LA FINESTRA TEMPORALE** (`engine/runtime.js`, gate `test/tempo.test.js`). Il selettore del
periodo ha una domanda che viene prima delle altre: *quanti anni*. La finestra e contigua e si
allarga all'indietro dall'anno scelto; il confronto si sposta con lei (tre anni contro i tre
precedenti). Il disegno segue l'ampiezza: fino a cinque anni il trend mette una linea per anno
sull'asse Gen-Dic, dai sei in su un punto per anno; il ribbon fa lo stesso (dodici trimestri su
due-tre anni, un anno per colonna oltre). **La storia lunga costa**: ogni anno mensile e ~6KB di
righe dentro l'HTML, quindi gli anni oltre gli ultimi (`dataParams.dettaglioMesi`, default 3)
arrivano gia sommati per anno — totali esatti, si perde solo la ripartizione fra i mesi. Dove i
mesi non ci sono, i controlli di trimestre e mese si nascondono e la selezione che c'era si mette
da parte, tornando quando la finestra si restringe. Sotto i tre anni di storia non cambia niente
e il codice non viaggia nemmeno nel file.

**LA DOTTRINA DEL BOOKMARK** (`engine/viste.js`, gate `test/bookmark.test.js`). Una card a piu
viste deve dichiarare `motivo`, e i motivi ammessi sono tre e non altri: `due-lenti` (ricavo e
margine sulla stessa cosa), `altro-taglio` (stessa domanda, altro asse), `pagina-sprecata`
(serve un grafico, la pagina e piena, e da solo non merita una schermata). Se le viste non
condividono ne misura ne dimensione, "altro-taglio" e una dichiarazione falsa e il motore
rifiuta. Tetti: 3 viste per card, 2 sull'apertura, 2 card a linguette per pagina. Il rovescio e
un consiglio: `lint()` segnala dove un bookmark MANCA — due volte lo stesso grafico sulla stessa
dimensione con misure diverse sono due lenti che occupano due riquadri.

**L'ALBERO DELLE DOMANDE** (`engine/intervista.js` + `npm run intervista`, gate
`test/intervista.test.js`). Quattordici domande a risposta chiusa portano a una spec completa
senza linguaggio naturale e senza crediti: ogni domanda dichiara `quando`, quindi il questionario
si ramifica (al funnel le trattative chiuse, all'operativo le transazioni al giorno). Il mockup
non si compone da zero: si veste lo scheletro dell'archetipo col vocabolario della nicchia (8
mestieri x 2 dimensioni), che arriva fino ai titoli, alle colonne e alle etichette delle misure.
**Due ancore, due leve**: la base dei membri e un attributo, con due passate di misura-e-correggi,
portano entrambi i numeri dichiarati a meno dell'1% — un numero solo applicato al campo sbagliato
darebbe nove milioni di lead. Non tutti gli archetipi stanno bene a tutti i mestieri: ogni nicchia
dichiara i suoi. E' la strada (a) del punto 9, costruita.

## 6. Problemi noti / migliorie in sospeso
- **banco/immobiliare pesa 94KB**, oltre il tetto di 75KB: il grano dei fatti e largo
  (25 combinazioni per mese). `npm run banco` ora scrive PESANTE accanto a chi sfora — prima il
  tetto era verificato solo sui quattro casi dell'eval e nessuno se ne accorgeva.
- **6 bug visivi** (IN CORSO su fix-visual-bugs): (1 MAX) riga di visual in basso tagliata/senza
  margine; (2) {y}/{py} non interpolati nei titoli; (3) slicer mese/trimestre richiede re-click
  "tutti i mesi"; (4) AP/AC non chiari; (5) contrasto filtri grigio-su-grigio in dark; (6)
  legende (torta, ribbon).
- **Contratto dati**: rendere `facts.dim` senza membri IMPOSSIBILE (membri obbligatori, min 1,
  co-locati, un esempio canonico) + JSON affidabile via **function-calling/tool-use o prefill "{"
  + stop** (non via istruzione). Verificare offline sui JSON loggati PRIMA di ricaricare crediti.
- **Cablaggio riconoscimento nicchia**: il system prompt di /api/generate deve caricare
  niches.md + data-availability.md + istruzioni pre-prompt, riconoscere la nicchia dal brief,
  stimare i dati dalla taglia, e costruire con KPI + storia negativa di QUELLA nicchia. Mai una
  dashboard vendite generica.
- Prod ha ancora la chiave dell'org VECCHIA → rotta in produzione finché non si aggiorna.
- Credito Anthropic esaurito (org francescostara98@gmail.com).

## 7. PROSSIMI PASSI, in ordine
1. Finire i **6 bug visivi** (in corso).
2. **Cablare il riconoscimento nicchia** (niches.md + data-availability + pre-prompt come system
   prompt). ← è il passo che rende utile tutto il listone. Costo zero (codice + stub).
3. **Fix contratto dati + JSON affidabile** (function-calling). Verifica offline sui log, costo zero.
4. Aggiornare la chiave API prod all'org nuova.
5. **(ricarica ~$1.50) Rigenerare gyms e finance = LA PROVA** che le nicchie funzionano (devono
   parlare la lingua della nicchia, non canali generici). Poi rilanciare l'eval leggero (5 brief
   × 2 run, solo Sonnet, dry-run con stub PRIMA), votare, riportare pass-rate + costo.
6. **Testare Haiku sulla sola spec** (ora l'LLM scrive ~5KB JSON, non 45KB HTML → il pavimento
   modello è probabilmente sceso; costo per generazione = frazione di centesimo).
7. Dopo: percorso a menu CREDITLESS (template dalle nicchie = zero crediti), share-link (Vercel
   Blob), editing leggero (cambia palette/grafico/KPI), export .pbix di partenza.

## 8. Eval (versione leggera, ripetibile)
5 brief (social, ecommerce, saas, retail, gyms-messy) × 2 run = 10 gen, solo Sonnet, <1€.
Script test/eval-run.js chiama la stessa pipeline di /api/generate, salva HTML + una riga CSV per
gen (valid_first_try, repairs, fallback, tokens, cost, latency) dal metering. La macchina genera
e misura; l'UMANO vota (1-5, "lo manderei a un cliente?"). Soglie: valida 1° colpo ≥75%,
dopo ≤1 riparazione ≥95%, voto umano medio ≥4. SEMPRE dry-run con PRUVA_STUB=1 prima di spendere.

## 9. Costi / crediti
Tutto è codice gratis (motore, dati, QA, webapp, intake, TUTTO il listone). L'unico passo a
pagamento è free-text-brief→spec. Due vie a costo zero: (a) percorso a menu/questionario = codice
puro, zero crediti, illimitato (le nicchie SONO le template); (b) Haiku sulla spec ≈ frazione di
centesimo. Il brief libero con IA è la funzione premium, non l'obbligo.
