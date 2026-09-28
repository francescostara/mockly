# Archetipi di layout — come si compone una pagina, e perche non sempre allo stesso modo

## Il difetto che questo file esiste per chiudere

Ogni report apriva con **banda KPI → trend → donut** e chiudeva con **la matrice a piena
larghezza**. Non e una scelta neutra: e la formula per principianti di Power BI, venduta nei
cheat-sheet come "layout a quattro blocchi — KPI, Trend, Categorie, Tabella". Un consulente BI
la riconosce a colpo d'occhio come template, e il posizionamento del prodotto — *il metodo di
veri BI developer eseguito in automatico* — la contraddice direttamente.

La causa tecnica e nota: esisteva UN solo esempio canonico e il modello lo copiava. La regola
"il modello copia gli esempi piu della prosa" e vera e lavorava contro di noi. Per questo il
file arriva insieme a **quattro nuovi esempi canonici**: senza quelli, questa prosa non cambia
niente.

**Il centro della pagina gia variava.** Il difetto sta nell'**apertura** e nella **chiusura**,
sempre identiche. E' li che va speso il lavoro.

---

## 1. Fondamenta — cosa dice la pratica, non il buon senso

### A. Il layout si sceglie dalla DENSITA e dalla DOMANDA, mai per default

Una vista executive — pochi KPI, un grafico dominante — si legge a **Z**: percorso diagonale,
spazio generoso. Una vista operativa — molti widget, tabelle — si legge a **F**: colonne,
allineamento rigido, densita alta.

Usare il pattern sbagliato per la densita spreca il percorso dell'occhio: una vista executive
su griglia a F butta via la diagonale, una vista densa costruita sull'ipotesi a Z lascia
contenuto non letto. **Prima si stabilisce la densita, poi si sceglie il pattern.**

### B. In alto a sinistra atterra l'occhio

La metrica piu importante va li, mai sepolta al centro o in una barra laterale. E' logica
giornalistica: prima la conclusione, poi il contesto, infine il dettaglio.

### C. Tre famiglie, distinte da "quanto in fretta si deve agire"

| famiglia | domanda | forma |
|---|---|---|
| **operativa** | cosa sta succedendo adesso | densa, tabellare, stato in evidenza |
| **analitica** | cosa sta andando storto e perche | data-centrica, sempre confrontata col periodo precedente, molte viste correlate |
| **strategica** | siamo sulla rotta verso l'obiettivo | poche metriche, molto spazio, confronto col traguardo |

Pruva produce quasi sempre l'analitica. Le altre due sono legittime e vanno usate quando il
brief le chiede.

### D. Pattern osservati in dashboard reali — vocabolario, non lista da esaurire

- **APERTO** — widget di dimensioni diverse su griglia, nessuna gerarchia semantica fra le
  posizioni; ogni widget pesa quanto gli altri.
- **STRATIFICATO** — bande orizzontali con funzioni diverse (numeri in alto, visualizzazioni
  sotto). E' il nostro storico, ed e solo UNO dei possibili.
- **RAGGRUPPATO** — widget raccolti in gruppi semantici visibili.
- **TABELLARE** — la tabella e la struttura portante, i visual la corredano.
- **SCHEMATICO** — la posizione deriva da una proprieta esterna: una mappa, un flusso, una
  pianta. (E' il geografico, ed e il funnel.)
- **SEMANTICO (multi-pagina)** — le pagine seguono la struttura del business.

### E. Tre strutture nominate dalla letteratura

- **PIRAMIDE INVERTITA** — sintesi in alto, dettaglio progressivo sotto.
- **QUARTETTO** — 2x2 bilanciato, quattro metriche a peso uguale da confrontare.
- **EXECUTIVE SUMMARY** — UNA visualizzazione dominante grande, pannelli di supporto attorno.
  E' l'archetipo che ci mancava di piu: non avevamo mai un visual dominante.

### F. Vincoli pratici (community Power BI)

Massimo ~8-10 visual per pagina; nessuna barra di scorrimento; nessun visual sovrapposto;
intestazioni disattivate per slicer e single-value; lo spazio bianco e un alleato; raggruppare
per prossimita; griglia condivisa.

---

## 2. Gli otto archetipi

Per ognuno: la domanda, la densita, la scansione, **l'apertura**, il centro, **la chiusura**,
le nicchie tipiche.

> **Regola trasversale, la piu importante.** Apertura e chiusura DEVONO variare per archetipo.
> Il centro gia varia da solo.

### 1. `scorecard` — stratificato (l'attuale, non piu il default)
- **Domanda:** "come sta andando in generale?"
- **Densita** media · **scansione** F
- **Apertura:** banda KPI + trend.
- **Chiusura:** matrice a piena larghezza.
- **Nicchie:** retail, F&B, social overview.
- **VINCOLO:** usabile solo se il brief chiede davvero una panoramica generale, e la scelta va
  giustificata. In assenza di giustificazione si sceglie un altro archetipo.

### 2. `executive-summary` — visual dominante
- **Domanda:** "qual e la cosa che devo sapere?"
- **Densita BASSA** (≤ 6 visual) · **scansione** Z
- **Apertura:** UN visual grande che occupa meta pagina — il trend chiave, il waterfall o lo
  scatter — con 2-3 card a lato. La **delta-card** e qui l'apertura di elezione.
- **Chiusura:** una riga di supporto, **non** una matrice densa. Il dettaglio vive nella pagina
  di drill-through.
- **Nicchie:** board e C-level di qualunque nicchia; SaaS e finanziario per il board.

### 3. `funnel` — schematico
- **Domanda:** "dove perdo le persone?"
- **Densita** media · **scansione** a flusso
- **Apertura:** funnel dominante a sinistra + conversione per stadio a destra.
- **Centro:** confronto per fonte o canale.
- **Chiusura:** tabella delle fonti con il tasso di conversione.
- **Nicchie:** B2B sales, acquisizione e-commerce, iscrizioni palestre, lancio creator.

### 4. `quadrants` — segmentazione
- **Domanda:** "chi o cosa rende davvero?"
- **Densita** media-bassa
- **Apertura:** **scatter con le mediane, grande** (meta pagina, mai un riquadro piccolo) + 2 card.
- **Centro:** dispersione per una dimensione secondaria.
- **Chiusura:** heatmap MoM, oppure matrice per entita ordinata per margine.
- **Nicchie:** energia/manifattura, finanziario, margine per categoria e-commerce, logistica.

### 5. `bridge` — finanziario
- **Domanda:** "dove sono finiti i soldi?"
- **Densita** media
- **Apertura:** **waterfall dominante**.
- **Centro:** varianza budget, aging.
- **Chiusura:** trend di cassa con proiezione tratteggiata — **non** una matrice.
- **Nicchie:** finanziario/CFO, manifattura.

### 6. `geo` — schematico *(NON ANCORA RENDERIZZABILE — manca il visual mappa)*
- **Domanda:** "dove va bene e dove va male?"
- **Densita** media
- **Apertura:** mappa a bolle dominante + card a lato.
- **Centro:** trend per area. **Chiusura:** matrice per localita.
- **Nicchie:** logistica, retail multi-sede, sales per territorio, F&B multi-locale.
- **STATO:** il motore non ha un visual `map`. Finche non c'e, questo archetipo non va scelto:
  il ripiego onesto e `quadrants` o `scorecard` con la localita come dimensione primaria.

### 7. `cohorts` — ritenzione
- **Domanda:** "la gente resta o se ne va?"
- **Densita** medio-alta · **scansione** F
- **Apertura:** **heatmap coorti dominante**.
- **Centro:** curve di ritenzione, churn contro nuovi.
- **Chiusura:** tabella per coorte o segmento.
- **Nicchie:** SaaS, palestre, riacquisto e-commerce, creator.

### 8. `operational` — capacita
- **Domanda:** "stiamo usando bene cio che abbiamo?"
- **Densita ALTA** (≥ 8 visual) · **scansione** F, tabellare
- **Apertura:** **heatmap fascia-oraria x giorno dominante**, gauge di utilizzo accanto.
- **Centro:** gauge di occupazione, confronti per turno o linea.
- **Chiusura:** tabella operativa densa.
- **Nicchie:** F&B (daypart), palestre (riempimento corsi), manifattura (utilization), logistica.

---

## 3. Regole di selezione

- L'archetipo si sceglie dalle **domande di decisione del brief** e dalla **densita richiesta**
  (quante entita, quante metriche, quale pubblico), **non dalla nicchia**.
- Pubblico board/C-level → densita bassa → archetipo 2. Pubblico operativo o analista →
  densita alta → archetipi 7-8. Titolare → media.
- **Quando domanda e pubblico indicano archetipi diversi, VINCE LA DOMANDA**, e la densita si
  adatta scendendo. Un consiglio che chiede "perdiamo studenti dopo il primo corso" riceve
  l'archetipo a coorti, non l'executive summary: l'executive summary sarebbe la forma giusta
  per il pubblico e la risposta sbagliata alla domanda, e un report che non risponde alla
  domanda non serve a nessuno per quanto sia elegante. Si tiene il conteggio basso — poche
  righe, nessun riquadro di contorno — ma la heatmap delle coorti resta.
- Ogni voce di `niches.md` elenca 2-3 **ARCHETIPI PLAUSIBILI**: si sceglie fra quelli.
- Se il brief pone domande di forma diversa → **pagine diverse, una per archetipo**.
- **Vietato lo scorecard come default automatico.**
- **Divieto della formula da principiante:** mai la sequenza KPI → trend → donut → tabella, a
  meno che lo scorecard non sia stato scelto ed esplicitamente giustificato.
- La spec **dichiara** il proprio archetipo (`spec.archetype`). Se la composizione non
  corrisponde alla dichiarazione, il motore rifiuta: una dichiarazione che nessuno verifica
  vale meno di nessuna dichiarazione.

### La chiusura, e l'unico gate che questa riforma tocca

La regola storica era "ogni pagina chiude con la matrice a piena larghezza". Due archetipi la
contraddicono per costruzione (2 e 5: chiudere un executive summary con una tabella densa lo
trasforma in uno scorecard). La regola diventa quindi, senza perdere niente:

> **Il report deve offrire il dettaglio tabellare da qualche parte** — nella pagina, in una
> seconda pagina, o nella pagina di drill-through. **La pagina** deve chiudere con la matrice
> **solo negli archetipi ad alta densita** (1, 3, 4, 7, 8).

---

## 3-bis. La PELLE: quattro assi in piu, indipendenti dall'archetipo

L'archetipo decide la COMPOSIZIONE. La faccia la decidono altri quattro assi, che si combinano
liberamente con esso (`engine/skin.js`, `spec.skin`):

| asse | valori | cosa cambia |
|---|---|---|
| `shell` | rail · rail-slim · top · bare | dove stanno navigazione e filtri, e quanta larghezza resta |
| `palette` | 13 famiglie | il colore: scala categoriale, sequenziale e divergente |
| `tipografia` | 8 abbinamenti | display + interfaccia; le cifre sono sempre tabulari e lining |
| `densita` | arioso · medio · denso | spaziature, raggi, peso dell'ombra |
| `banda` | box · blocco | la banda KPI: quattro riquadri separati, o una superficie sola con separatori |

**Ogni card ha un bordo, sempre.** Non esiste una densita che lo tolga: un grafico che
galleggia sul fondo senza separazione lascia il lettore a indovinare dove finisce e dove
comincia quello accanto. La scelta fra riquadri e blocco unico vale per l'INTERA pagina — meta
e meta e l'unico modo di sbagliarla.

**Quanti colori ha una palette.** Dove il colore identifica il membro (ribbon, stack100, donut,
hbar per membro), i membri a schermo non superano i colori distinti della famiglia: sei per
slate-freddo, dark-agency, dark-tecnico, salvia, jewel-desaturati e pastello-sobrio; cinque per
le altre. Con sei categorie colorate in una pelle da cinque si sceglie una famiglia da sei, si
accorpa un membro, o si usa `topN`/`top`. Nessuna scala contiene il rosso: e del problema.

**I colori dei dati non si scrivono nella spec.** La scala categoriale la assegna il motore
dalla famiglia scelta, verificata su contrasto, DeltaE76, le tre dicromazie e la scala di
grigi. L'unica eccezione e dichiarata dal dato: `brand: true` su un membro tiene il colore di
piattaforma, perche li la tinta E' l'identita.

8 x 4 x 13 x 8 x 3 = quasi diecimila combinazioni, senza mantenere diecimila file.

**Due valori non sono liberi e discendono dagli assi:** `grid.contentWidth` dalla shell (rail
1044, rail-slim 1116, top e bare 1248) e `grid.gutter` dalla densita (16, 12, 8). Il motore
rifiuta gli altri, perche sono i numeri con cui calcola il layout: sbagliarli fa strizzare le
card mentre gli SVG restano larghi quanto la spec crede.

**Come si sceglie:** la nicchia dichiara la sua PELLE PLAUSIBILE (`niches.md`), il brand del
cliente vince su tutto, e dentro il recinto la scelta RUOTA col brief. Il gate di varieta lo
verifica su una collezione: mai la stessa combinazione oltre il 30% dei file, e due report della
stessa nicchia devono differire in almeno **due assi su cinque**.

## 4. Le classi di scambio — la personalizzazione, progettata ora e costruita dopo

Cambiare `type: "donut"` in `type: "hbar"` e ri-renderizzare non chiama nessun modello: e
codice puro, istantaneo, gratuito. E' la superficie del percorso a menu. Ma non tutto e
scambiabile con tutto: **ogni visual dichiara la sua classe, e lo scambio e permesso solo
dentro la classe e solo se il bind e compatibile.**

| classe | visual | la domanda che risponde |
|---|---|---|
| `composizione` | donut · hbar ordinata · stack100 | quota di un totale per categoria |
| `serie` | trend · colline · sparkline | come si muove nel tempo |
| `confronto` | hbar ordinata · ribbon | chi sta davanti, e come cambia la classifica |
| `relazione` | scatter | due misure sono legate? |
| `flusso` | funnel · waterfall | dove si perde, fra uno stadio e l'altro |
| `densita` | heatmap · matrix | dove si concentra, incrociando due assi |
| `bersaglio` | gauge | siamo arrivati dove dovevamo |
| `sintesi` | kpi · delta-card | il numero che apre il discorso |

**Il criterio di appartenenza e la DOMANDA ANALITICA, mai la forma.** Se una classe raggruppa
due visual che rispondono a domande diverse, la classe e sbagliata anche se le forme si
somigliano. Se ci si ritrova a giustificare uno scambio con "tanto ci sta graficamente", si sta
classificando per forma.

Note che discendono dal criterio, non dalla comodita:
- `hbar` sta in **due** classi (composizione e confronto) perche risponde davvero a due
  domande diverse a seconda del bind. E' l'unica ambiguita legittima.
- `ribbon` esce dalla classe sopra le **sette** entita: li smette di mostrare il sorpasso, che
  e la sua ragione d'essere, e il motore lo rifiuta.
- `gauge` sta da solo: accetta solo misure di tipo tasso, quindi nessun altro visual della
  griglia puo prenderne il posto senza cambiare la misura.
- `scatter` non e scambiabile con `composizione`: due misure non sono una quota.

### La linea gratis / a pagamento

**Gratis — manipolare cio che ESISTE gia nella spec:** cambiare tipo di grafico dentro la
classe, cambiare tema o palette, riordinare i filtri, scambiare la misura di una KPI card con
un'altra gia dichiarata, **commutare fra KPI card e delta-card**, mostrare o nascondere un
visual, cambiare l'ordinamento di una tabella.

**A pagamento — creare cio che NON esiste:** aggiungere una misura o una dimensione, cambiare
la storia negativa, riscrivere gli insight, aggiungere una pagina, **cambiare archetipo**,
rigenerare da un brief modificato.

L'utente lo capisce senza spiegazioni: riorganizzo quello che ho = gratis, chiedo qualcosa di
nuovo = costa.

### Regole dello scambio (quando sara implementato)

1. Lo scambio e permesso solo se il bind soddisfa i requisiti del visual di destinazione. Se
   non li soddisfa, l'opzione **non compare** — mai disabilitata e muta.
2. Dopo lo scambio la spec deve passare **tutti** i gate esistenti. L'utente non deve poter
   creare uno stato invalido.
3. Le regole di house-style valgono dopo ogni scambio: colore costante per entita, rosso solo
   al problema, area della delta-card sempre monocroma.

Forma prevista: `mutateSpec(spec, action) -> spec'`, azioni tipizzate (`swapVisualType`,
`setTheme`, `reorderFilters`, `swapKpiMeasure`, `toggleCardVariant`, `toggleVisual`, `setSort`),
ognuna che valida prima di restituire, e `render(spec', data)` con lo stesso dato.

---

## 5. Gli esempi canonici — e perche sono gli stessi dei template

I quattro scheletri vivono in `engine/templates/` come spec + dataParams renderizzabili, e da
li vengono esportati in `skill/assets/canonical-*.json`. **Sono un solo artefatto con due usi:**
esempio per il modello, e template del percorso a menu senza crediti. Nascono una volta sola —
se fossero due cose, divergerebbero al primo ritocco e nessuno se ne accorgerebbe.

| archetipo | template | apertura | chiusura |
|---|---|---|---|
| 2 `executive-summary` | `executive-summary` | delta-card + trend dominante | riga di supporto |
| 3 `funnel` | `funnel` | funnel dominante + conversione | tabella fonti |
| 4 `quadrants` | `quadrants` | scatter grande con mediane | heatmap |
| 8 `operational` | `operational` | heatmap fascia x giorno + gauge | tabella operativa densa |
| 1 `scorecard` | `canonical-retail-fullspec.html` (storico) | banda KPI + trend | matrice |

Comando: `npm run templates` rigenera gli asset e rende visibili i quattro file in
`out/banco/`, a costo zero.
