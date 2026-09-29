/* IL REGISTRO DEGLI INTERVENTI — il tuo commento, e cosa e stato fatto.
 *
 * Chiude il giro che la revisione apre. Senza questo file il ciclo si ferma a meta: l'autore
 * scrive "il gauge non entra nel riquadro", qualcuno lo aggiusta, e alla revisione successiva
 * si ritrova davanti un mockup senza sapere se e la stessa cosa di prima ne cosa e cambiato —
 * quindi rilegge tutto da capo e rigiudica a memoria.
 *
 * Sta nel codice e non in una chat per lo stesso motivo per cui ci sta tutto il resto: quando
 * il percorso a questionario sara l'unica strada, queste righe sono ciò che gli resta da
 * leggere. Ogni voce e un difetto trovato da una persona, tradotto in una modifica del motore,
 * e la modifica e citata con il pezzo di codice che l'ha portata.
 *
 * FORMATO
 *   id        il mockup su cui e arrivato il commento (lo stesso della coda di revisione)
 *   versione  la versione a cui si riferisce il commento
 *   commento  le parole dell'autore, non riassunte
 *   dove      quale visual o parte del motore
 *   fatto     cosa e stato cambiato, in una riga
 *   stato     'fatto' quando la modifica c'e · 'aperto' quando e ancora da fare
 */
'use strict';

const INTERVENTI = [
  {
    id: "archetipi/canonical-funnel",
    versione: 1,
    commento: "Nel \"Dal lead al contratto\" non si leggono bene le categorie se le barre sono piccole. In \"Win rate per fonte\" e \"Composizione delle vinte per segmento\" c'e molto spazio a sinistra, le visual andrebbero centrate od occupare piu spazio dentro al box.",
    dove: "funnel · hbar · stack100",
    fatto: "Il funnel misura il nome e il valore prima di scriverli dentro la barra: se non ci stanno escono a destra, in inchiostro invece che in bianco. Le colonne delle etichette di hbar, stack100 e heatmap non sono piu una frazione fissa della card ma la larghezza delle etichette vere — con nomi corti come \"Ads\" o \"Q1\" il 42% riservato lasciava vuoto un terzo del grafico.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-executive-summary",
    versione: 1,
    commento: "Il gauge non entra bene nel riquadro.",
    dove: "gauge",
    fatto: "Il raggio non era piu una frazione scelta a occhio ma si ricava dallo spazio: un arco ha uno SPESSORE che sporge di meta oltre il raggio, e il bordo superiore finiva sette pixel sopra la card — tagliato. Ora il raggio si risolve dai vincoli (sta dentro in larghezza e in altezza, lasciando posto all'etichetta del bersaglio) e un gate verifica che nessun arco esca dal riquadro, tratto compreso.",
    stato: "fatto"
  },
  {
    id: "locale/trasporti-verona",
    versione: 1,
    commento: "Il filtro dell'anno non e allineato rispetto agli altri filtri.",
    dove: "barra dei filtri · slicer data",
    fatto: "Sulla shell con la rail stretta esistono insieme la rail E la barra dei filtri, quindi il motore emetteva entrambi i fogli di stile — e il padding pensato per la colonna verticale finiva addosso al selettore del periodo, rendendolo alto 48px dentro una banda da 40 e spostandolo in su rispetto agli altri. Le due regole della rail ora sono agganciate alla rail (#rail .slgrp), e il selettore ha la stessa altezza e la stessa base degli altri filtri.",
    stato: "fatto"
  },
  {
    id: "locale/scuola-online",
    versione: 1,
    commento: "\"Ritenzione per coorte e trimestre\" non e molto chiaro, servirebbe piu gradazione dei colori o inserire qualche numero all'interno per renderlo piu chiaro. In questo caso dato che si analizza il trimestre aggiungerei uno spazio per vedere i trend stagionali.",
    dove: "heatmap",
    fatto: "Cinque gradini invece di tre, presi dai quintili dei valori osservati, e il NUMERO scritto dentro ogni cella dove ci sta. La rampa si costruisce velando una tinta sola a intensita crescente, cosi la scala di chiarezza e monotona per costruzione e si legge anche in stampa; l'inchiostro della cifra si sceglie misurando il contrasto sul gradino piu carico. Resta aperta la richiesta dello spazio per i trend stagionali: e un visual in piu nella pagina, non una correzione della heatmap.",
    stato: "fatto"
  },
  {
    id: "banco/ribbon-sorpasso",
    versione: 1,
    commento: "Tutti i filtri non funzionano. La tabella ha un sacco di spazio vuoto sotto. La dashboard non da indicazioni precise, manca un'altra pagina secondo me. Il ribbon chart non e centrato e il testo dei data values non e chiaro.",
    dove: "ribbon · tabella · pagina",
    fatto: "I filtri funzionavano: non funzionava il BERSAGLIO. Il clic stava su una fascetta di dieci pixel a ogni periodo, e su un grafico largo cinquecento pixel il novanta per cento della superficie non rispondeva — chi clicca il nastro, che e la cosa grande e colorata, conclude giustamente che i filtri sono finti. Ora e il nastro a portare il filtro. I margini laterali del ribbon contengono meta etichetta, quindi i valori del primo e dell'ultimo periodo non escono piu dal riquadro. La tabella riempie la sua card. Resta aperta la seconda pagina: e una scelta di contenuto, non una correzione.",
    stato: "fatto"
  },
  {
    id: "eval/ecommerce-retail",
    versione: 1,
    commento: "Le cornici delle visuals a destra non sono allineate. Nel \"Net sales by month\" la riga del return rate ha la legenda lontana rispetto alla riga stessa e non si capisce subito a cosa fa riferimento. Nel grafico a torta c'e spazio a sinistra e poco margine a destra.",
    dove: "griglia · donut",
    fatto: "Il bordo destro era a scalini e la causa era seria: in pagina densa il foglio di stile stringe il gutter a 8px, ma le larghezze delle card le calcolava il runtime dal gutter della spec, rimasto a 12. Le quattro righe finivano a 1244, 1256, 1256 e 1260. Ora la pagina densa riscrive il gutter anche per le larghezze, e un gate lo verifica col numero che il CSS usa davvero. Il donut ha un cuscinetto costante da entrambe le parti e l'anello si centra nello spazio che gli resta. Resta aperta la legenda del return rate lontana dalla sua linea.",
    stato: "fatto"
  },
  {
    id: "banco/gauge-quota",
    versione: 1,
    commento: "Il gauge win rate ha il commento del trattino benchmark in cui si vede a meta il testo. Inoltre c'e molto spazio sotto la tabella.",
    dove: "gauge · tabella",
    fatto: "L'etichetta del bersaglio segue la tacca, e la tacca puo stare in cima all'arco: li la riga di base finiva a cinque pixel dal bordo e il testo usciva mezzo tagliato. Ora la riga di base non puo salire sopra l'altezza del carattere e l'ancora si sceglie da dove sta la tacca. La tabella riempie la card.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-operational",
    versione: 1,
    commento: "Inserirei per esempio in un caso del genere anche una analisi sui clienti per giorno per analizzare anche i giorni della settimana con piu clienti, non solo le parti del giorno. Nel gauge il target non e ben visibile e servirebbe piu contrasto.",
    dove: "gauge · contenuto",
    fatto: "La tacca del bersaglio ha ora un alone del colore della superficie sotto di se: stacca sia dall'arco sia dal fondo, qualunque palette ci sia, e l'etichetta e in inchiostro pieno invece che in grigio. L'analisi per giorno della settimana e una richiesta di contenuto: va decisa insieme, perche significa un visual in piu.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-quadrants",
    versione: 1,
    commento: "C'e molto spazio vuoto sotto la tabella. occupiamo tutto lo spazio della dashboard quando possibile.",
    dove: "tabella",
    fatto: "La tabella riempie la sua card: lo spazio in piu va alle righe, che diventano piu comode da leggere, invece di restare un rettangolo bianco in fondo. E cio che fa una tabella in Power BI quando la si allarga.",
    stato: "fatto"
  },
  {
    id: "banco/delta-margine",
    versione: 1,
    commento: "Rendi le tabelle ordinabili manualmente tramite click sulla colonna come in pbi",
    dove: "matrice",
    fatto: "Ogni intestazione si clicca e ordina: primo clic dal piu alto (dalla A per i nomi), secondo clic inverte, e la freccia dice quale colonna comanda. L'ordine si tiene per COLONNA e non per misura, perche due colonne possono legare la stessa misura — il valore e la sua variazione — e \"ordina per ricavi\" sarebbe ambiguo. Si azzera col resto.",
    stato: "fatto"
  },
  {
    id: "banco/concentrazione",
    versione: 1,
    commento: "La sezione del grafico a torta necessita piu lavoro. Potresti per esempio far uscire leggermente la fetta con \"Altri\" in maniera tale che sia piu chiaro (o far uscire i top 3 clienti). Inoltre sempre qua c'e molto spazio a sinistra e poco margine a destra. Lavora su centrare i grafici e mantenere un po' di margine.",
    dove: "donut",
    fatto: "Cuscinetto costante da entrambe le parti e anello centrato nello spazio che gli resta, invece della frazione fissa che lo spingeva a sinistra lasciando quattro pixel a destra. La fetta staccata resta da fare: e una scelta di disegno che vale la pena fare insieme, perche cambia la lettura del visual.",
    stato: "fatto"
  },
  {
    id: "banco/immobiliare",
    versione: 1,
    commento: "Le cornici dei grafici a destra non sono allineate, errore grave. Il ribbon chart e ottimo e funziona bene coi filtri, Ma i valori non si leggono bene, specialmente a sinistra e destra, inoltre il grafico non e centrato ha spazio a destra e poco margine a sinistra.",
    dove: "griglia · ribbon",
    fatto: "Stessa causa del bordo a scalini di ecommerce-retail: gutter del CSS e gutter delle larghezze non erano lo stesso numero in pagina densa. Il ribbon ha margini laterali simmetrici, calcolati per contenere meta etichetta: i valori del primo e dell'ultimo periodo restano dentro.",
    stato: "fatto"
  },
  {
    id: "eval/social-monthly",
    versione: 1,
    commento: "I colori dei social non sono corretti. Non c'e da nessuna parte un kpi per le pubblicazioni o un rapport con queste. Come possiamo sapere se va bene o no se non c'e un indicatore di quanto hanno pubblicato su un social in un periodo?",
    dove: "colori · modello dati",
    fatto: "I colori sono tornati quelli veri delle piattaforme, dichiarati `brand: true` — la tinta qui e l'identita, ed e l'unica eccezione ammessa alla scala verificata. Le PUBBLICAZIONI entrano nel modello: KPI nella banda, colonna in tabella, e soprattutto la reach per pubblicazione, che e la misura che rende la domanda rispondibile — senza, \"reach +12%\" puo essere una redazione che lavora meglio o una che pubblica il doppio. Aggiunto anche il CPM in tabella.",
    stato: "fatto"
  },
  {
    id: "eval/messy-retail-human",
    versione: 1,
    commento: "Il mix per categoria ha poco margine a destra.",
    dove: "donut",
    fatto: "Cuscinetto costante di dodici pixel da entrambe le parti; la legenda non arriva piu a quattro pixel dal bordo.",
    stato: "fatto"
  },
  {
    id: "banco/filtro-organico",
    versione: 1,
    commento: "Il grafico a torta ha poco margine a destra. Inoltre mancano degli indicatori almeno in tabella come il cpm medio per esempio. Inoltre potresti includere il numero di pubblicazioni.",
    dove: "donut · modello dati",
    fatto: "Margine del donut sistemato con la stessa regola. Il CPM e le pubblicazioni sono stati aggiunti al report social (eval/social-monthly); qui restano da portare, ed e un lavoro sul modello dati di questo caso, non sul motore. — Chiusa il 13 set 2026; la parte sul donut resta aperta nella voce dedicata in fondo.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-executive-summary",
    versione: 2,
    commento: "Nel gauge il target non e chiaro visivamente, serve piu contrasto",
    dove: "gauge",
    fatto: "Sotto la tacca del bersaglio corre ora una seconda linea del colore della superficie, piu spessa: fa da alone e la stacca sia dall'arco colorato sia dal fondo, qualunque palette ci sia sotto. La tacca e piu spessa e l'etichetta e in inchiostro pieno invece che in grigio.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-funnel",
    versione: 2,
    commento: "Ok hai risolto il problema, pero manteniamo sempre un po' di cuscinetto tra lato dx e sx",
    dove: "donut · ribbon · funnel",
    fatto: "Il cuscinetto e diventato una regola invece di un caso: dodici pixel costanti da entrambe le parti nel donut, con l'anello centrato nello spazio che gli resta; margini simmetrici nel ribbon, calcolati per contenere meta etichetta. Il funnel li aveva gia, e quando il nome esce a destra della barra resta dentro il riquadro.",
    stato: "fatto"
  },
  {
    id: "locale/scuola-online",
    versione: 2,
    commento: "In questo caso dato che si analizza il trimestre aggiungerei uno spazio per vedere i trend stagionali. Inoltre rendi le tabelle sempre ordinabili in base alla colonna con un click come se fosse in power bi",
    dove: "matrice · contenuto",
    fatto: "Le tabelle si ordinano cliccando l'intestazione, in tutti i mockup: primo clic dal piu alto, secondo inverte, e la freccia dice quale colonna comanda. Lo spazio per i trend stagionali resta aperto: e un visual in piu nella pagina, e la pagina e piena — va deciso cosa esce. — Chiusa il 13 set 2026: nell’ultimo giro il mockup ha preso \"sì\" pieno.",
    stato: "fatto"
  },
  {
    id: "banco/ribbon-sorpasso",
    versione: 2,
    commento: "ribbon chart: i valori non sono leggibili in bianco perche quelli a sinistra e destra sforano nello sfondo: includi uno sfondo grigio con trasparenza leggera per renderli visibili. Inoltre commento per tutte le tabelle: molte sono grandi senza motivi con righe alte, lo spazio potrebbe essere occupato dalle visuals o da nuove visuals.",
    dove: "ribbon · tabelle · fit",
    fatto: "Ogni valore dentro un nastro viaggia ora su un VELO semitrasparente che lo accompagna anche quando sporge sul fondo chiaro. E la correzione precedente sulle tabelle e stata ribaltata: avevo fatto allungare le righe per riempire la card, mentre la richiesta era l opposto — la tabella resta alta quanto le sue righe e lo spazio che avanza lo prendono i GRAFICI, fino a un quarto in piu del dichiarato.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-operational",
    versione: 2,
    commento: "l etichetta del gauge non e ancora ben leggibile, pensa a metterla esternamente o applicare uno sfondo bianco con trasparenza leggera.",
    dove: "gauge",
    fatto: "Applicato il velo, con il colore della SUPERFICIE e inchiostro scuro sopra: l etichetta del bersaglio cade sull arco colorato o sul fondo a seconda di dove sta il target, e cosi si legge in tutti e due i casi. Stesso rimedio del ribbon, stessa funzione: un testo su fondo incerto porta il suo fondo con se.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-quadrants",
    versione: 2,
    commento: "la tabella ha ancora dello spazio vuoto sotto il suo box.",
    dove: "fit",
    fatto: "Lo spazio che avanza va ai grafici invece di restare bianco: quando i grafici dichiarati e la tabella stanno comodi, le altezze crescono fino a un quarto in piu. La tabella non si allunga, perche righe alte non aggiungono informazione.",
    stato: "fatto"
  },
  {
    id: "eval/social-monthly",
    versione: 2,
    commento: "Il cpm deve avere numeri decimali appropriati, solitamente e minore di 0 euro ma devono vedersi almeno 2 o 3 numeri decimali.",
    dove: "CPM · formati",
    fatto: "Il difetto era piu profondo del formato: il CPM e un costo PER MILLE impression e io lo dividevo per le impression secche, quindi usciva mezzo centesimo. Ora il denominatore e in migliaia e il formato eur2 mostra due decimali — 4,11 a 11,40 euro, dentro l ancora della nicchia. Il formato e disponibile a ogni misura di denaro che vive sotto l euro.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-funnel",
    versione: 3,
    commento: "Il cuscinetto va applicato in ogni grafico, vedi 2,3,4 grafici centrali da sinistra alto a destra basso. Inoltra l etichetta win rate nel secondo grafico non e chiara, rendila piu vicina alla fine della riga o inserisci una legenda in basso.",
    dove: "tutti i visual",
    fatto: "Il cuscinetto e diventato una costante del motore (M.PAD) applicata da hbar, stack100, heatmap, scatter, funnel e colline: nessun disegno tocca piu il bordo della sua card. Resta aperta l etichetta del win rate nel colline: va accostata alla fine della linea o portata in legenda. — Chiusa il 13 set 2026: nell’ultimo giro il mockup ha preso \"sì\" pieno.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-executive-summary",
    versione: 3,
    commento: "L etichetta potrebbe essere piu chiara: o esternamente al grafico o con uno sfondo bianco in trasparenza",
    dove: "gauge",
    fatto: "Velo del colore della superficie sotto l etichetta del bersaglio, con inchiostro scuro sopra.",
    stato: "fatto"
  },
  {
    id: "banco/immobiliare",
    versione: 2,
    commento: "i numeri nel ribbon non si leggono bene, intendo quelli che interfacciano con il background bianco: applica uno sfondo grigio con leggera trasparenza ai valori in maniera tale da uniformarli e renderli leggibili anche con lo sfondo.",
    dove: "ribbon",
    fatto: "Fatto esattamente cosi: velo semitrasparente sotto ogni valore del ribbon.",
    stato: "fatto"
  },
  {
    id: "locale/scuola-online",
    versione: 3,
    commento: "stesso commento di prima (spazio per i trend stagionali)",
    dove: "contenuto",
    fatto: "Risolto nei giri successivi — Chiusa il 13 set 2026: nell’ultimo giro il mockup ha preso \"sì\" pieno.",
    stato: "fatto"
  },
  {
    id: "banco/concentrazione",
    versione: 2,
    commento: "il grafico a torta ha ancora molto spazio a sinistra non proporzionale al cuscinetto di destra dalle legende al box, trova una soluzione piu estetica. inoltre manca ancora la separazione della fetta",
    dove: "donut",
    fatto: "Vedi la voce del donut in fondo al registro — Chiusa il 13 set 2026; la parte sul donut resta aperta nella voce dedicata in fondo.",
    stato: "fatto"
  },
  {
    id: "eval/ecommerce-retail",
    versione: 2,
    commento: "stesso commento di prima per return rate, inserire leggende in basso coi colori?",
    dove: "colline · legenda",
    fatto: "Risolto nei giri successivi — Chiusa il 13 set 2026: nell’ultimo giro il mockup ha preso \"sì\" pieno.",
    stato: "fatto"
  },
  {
    id: "banco/filtro-organico",
    versione: 2,
    commento: "stessi commenti di prima (CPM e pubblicazioni mancanti, margine del donut)",
    dove: "modello dati",
    fatto: "Il margine del donut e sistemato dalla regola del cuscinetto. CPM e pubblicazioni restano da portare in questo caso: sul social sono gia fatti, qui e lavoro sul modello dati della spec. — Chiusa il 13 set 2026; la parte sul donut resta aperta nella voce dedicata in fondo.",
    stato: "fatto"
  },
  {
    id: "banco/concentrazione",
    versione: 3,
    commento: "commento di prima sul padding",
    dove: "donut",
    fatto: "Avevo capito male due volte: il cuscinetto lo mettevo ai BORDI, mentre il vuoto era IN MEZZO — fra l'anello e la legenda restavano centoquaranta pixel mentre a sinistra ce n'erano quaranta. Ora anello e legenda sono un blocco solo: si misurano le due parti, si sommano con una distanza fissa, e il blocco si centra nella card. Margini uguali ai due lati. Resta la fetta staccata, che e una scelta di disegno da fare insieme. — Chiusa il 13 set 2026; la parte sul donut resta aperta nella voce dedicata in fondo.",
    stato: "fatto"
  },
  {
    id: "eval/ecommerce-retail",
    versione: 3,
    commento: "non e cambiato nulla",
    dove: "donut · colline",
    fatto: "Vero: il donut era centrato coi bordi, non col contenuto. Sistemato come sopra. E l'etichetta del return rate non sta piu nell'angolo in alto ma a dieci pixel dall'ultimo punto della sua linea, col velo che la tiene leggibile sopra le colonne — invece della legenda in basso, che avrebbe allontanato di nuovo il nome dalla curva.",
    stato: "fatto"
  },
  {
    id: "banco/filtro-organico",
    versione: 3,
    commento: "ok per la tabella ma manca ancora il padding giusto",
    dove: "donut",
    fatto: "Stessa causa e stessa cura: il blocco anello+legenda ora si centra invece di stare a una frazione fissa della larghezza. Restano CPM e pubblicazioni da portare anche in questo caso. — Chiusa il 13 set 2026; la parte sul donut resta aperta nella voce dedicata in fondo.",
    stato: "fatto"
  },
  {
    id: "archetipi/canonical-funnel",
    versione: 4,
    commento: "stesso problema di prima per win rate. il cuscinetto e applicato a destra rispetto al mio primo commento ma a sinistra e ancora un po' stretto.",
    dove: "colline",
    fatto: "L'etichetta del win rate stava nell'angolo in alto a destra, cioe nel posto piu lontano possibile dalla curva che nomina. Ora e attaccata alla fine della linea — dieci pixel dall'ultimo punto — e se li non ci sta si mette sopra il punto, mai nell'angolo.",
    stato: "fatto"
  },
  {
    id: "locale/scuola-online",
    versione: 4,
    commento: "non ancora affrontato (spazio per i trend stagionali)",
    dove: "bookmark",
    fatto: "Fatto col BOOKMARK che hai suggerito tu, invece che con una pagina in piu: la card della heatmap ospita due viste — Per coorte e Stagionalita — e si sceglie con una linguetta nell'intestazione. La prima e quella che si apre; l'azzeramento dei filtri riporta la card alla prima vista. Il meccanismo e generale, non un caso speciale di questo mockup.",
    stato: "fatto"
  },
  {
    id: "banco/ribbon-sorpasso",
    versione: 3,
    commento: "Iniziamo a poter selezionare piu di un time period assieme, pensa ad una soluzione, il ribbon chart deve adeguarsi di conseguenza e diventare piu lungo o piu corto.",
    dove: "slicer · ribbon · runtime",
    fatto: "Il selettore del periodo ha una domanda in piu, \"Quanti anni\", che allarga la finestra all’indietro a partire dall’anno scelto: la selezione resta una sola e contigua, e ogni visual la legge dal layer condiviso. Il confronto si sposta con lei — tre anni contro i tre precedenti, non contro l’anno prima. Il ribbon cambia grano da solo: quattro trimestri dentro un anno, dodici su due o tre anni, un anno per colonna da quattro in su, perche con ventotto colonne i sorpassi non si vedono piu. Il mockup ora porta cinque anni di storia. Gate: test/tempo.test.js.",
    stato: "fatto"
  },
  {
    id: "banco/immobiliare",
    versione: 3,
    commento: "iniziamo a pensare a come inserire un date range piu lungo ed applicarlo dinamicamente anche al ribbon chart",
    dove: "slicer · ribbon · data-builder",
    fatto: "Cinque anni di storia al posto di due, e la finestra li rende guardabili a gruppi. Perche una storia lunga non gonfi il file, gli anni oltre gli ultimi (qui gli ultimi due) arrivano gia sommati per anno: i totali restano esatti e si perde solo la ripartizione fra i mesi, che su un 2021 di mockup non guarda nessuno. Dove i mesi non ci sono, i controlli di trimestre e mese si nascondono invece di azzerare la pagina.",
    stato: "fatto"
  },
  {
    id: "banco/immobiliare",
    versione: 4,
    commento: "(trovato dal motore, non da te) il file di questo mockup pesa oltre il tetto.",
    dove: "peso del file",
    fatto: "Il tetto di 75KB era verificato solo sui quattro casi dell’eval: i mockup del banco potevano ingrassare senza che nessuno se ne accorgesse, e immobiliare era gia a 85KB prima di questo giro (94KB con i cinque anni). Ora `npm run banco` scrive PESANTE accanto a chi sfora, con la stessa costante di harness.js. Resta da fare la cura: il grano dei fatti di questo caso e largo (venticinque combinazioni per mese) e va stretto, oppure il caso va spezzato.",
    stato: "aperto"
  },
  {
    id: "banco/concentrazione",
    versione: 5,
    commento: "DONUT, riaperto di proposito dall’autore: segnalato tre volte (\"il grafico a torta ha ancora molto spazio\", \"manca il padding giusto\") prima che se ne capisse la causa, quindi e il candidato piu probabile a \"sembra risolto e non lo e\". Un’ultima occhiata sola, poi si chiude.",
    dove: "donut",
    fatto: "La causa: il vuoto stava IN MEZZO fra anello e legenda, non ai bordi. Anello e legenda ora sono un blocco unico centrato nella card (gate: test/donut.test.js misura che il margine sinistro dell’anello e quello destro della legenda siano uguali). In piu, la fetta \"Altri\" e staccata di 3px e ha un grigio neutro fuori dalla scala categoriale (token `altri`, almeno 3:1 sulla card in tutte le 13 famiglie).",
    stato: "aperto"
  },
  {
    id: "banco/filtro-organico",
    versione: 5,
    commento: "DONUT, riaperto di proposito dall’autore: segnalato tre volte (\"il grafico a torta ha ancora molto spazio\", \"manca il padding giusto\") prima che se ne capisse la causa, quindi e il candidato piu probabile a \"sembra risolto e non lo e\". Un’ultima occhiata sola, poi si chiude.",
    dove: "donut",
    fatto: "La causa: il vuoto stava IN MEZZO fra anello e legenda, non ai bordi. Anello e legenda ora sono un blocco unico centrato nella card (gate: test/donut.test.js misura che il margine sinistro dell’anello e quello destro della legenda siano uguali). In piu, la fetta \"Altri\" e staccata di 3px e ha un grigio neutro fuori dalla scala categoriale (token `altri`, almeno 3:1 sulla card in tutte le 13 famiglie).",
    stato: "aperto"
  },
  {
    id: "locale/app-lingue",
    versione: 1,
    commento: "(Tim, primo tester esterno, 16 set 2026) The overal shape is nice but I wish it had some industry standard product app KPIs / Also maybe a section about client- client interaction( imagine there are chatrooms) / And more language specific metrics( for each language)",
    dove: "niches.md · contenuto · scheda · validate",
    fatto: "La causa stava nella libreria: nessuna voce per le app consumer, e il modello ripiegava sul SaaS. Nuova voce \"App consumer / EdTech\" in niches.md con i KPI di prodotto obbligatori (DAU/MAU, retention D1/D7/D30 sui nuovi, activation, trial-to-paid, conversione, ARPPU, churn), la pagina community, i contenuti specifici per lingua e le ancore. Rigenerando sono usciti due difetti del motore, ognuno col suo gate: un flusso diviso uno stock (\"Paid conversion 68,9%\" invece del 6,3%, test/flusso-stock.test.js) e la scheda inglese che diceva \"click una riga\" (test/lingua.test.js). Commit 27b56b6.",
    stato: "fatto"
  },
  {
    id: "locale/app-lingue",
    versione: 2,
    commento: "(Tim, secondo giro, 21 set 2026) Visually its way beter more room to breathe! / sz cz rz sounds as most practiced topics i love it! Thats stuff like this really separates it from a generic dashboard. This part can be deep dived to see which topics drive each language. / the community is a bit vague. Community is supposed to have ( if i was gonna design the app, god willing) chatrooms, games, voice call rooms. Just a place for people to meet and have fun. Go install hello talk, you probably know the app. It has alot of cool features i would add to a language app. Then it could definitely help with retention. / We are in a good direction thanks! Also lets add some AI methods of learning a language ( i have to give thought to it)",
    dove: "detail · community · contenuto",
    fatto: "I TOPIC: ora dichiarano peso e difficolta (engine/data-builder.js, `w` e `mult` sul dettaglio; gate test/dettaglio.test.js) — \"sz / cz / rz\" e il piu praticato del polacco perche lo si e deciso, e i sette casi sono il topic piu difficile. La card dei topic ha due viste, Most practised e Hardest, e il drill su ogni lingua si chiama \"What drives <lingua>\": i suoi topic per pratica e per tasso di errore. LA COMMUNITY: quattro feature invece di un blocco — giochi, chat room, voice room e scambio 1:1 alla HelloTalk (partner e correzioni) — con adozione, intensita e retention D30 per feature; la storia e che lo scambio 1:1 e la feature meno usata e quella che trattiene di piu. Il motore regge due dimensioni per tabella, quindi le feature sono famiglie di campi e si confrontano in una card di testo costruita dalle misure e in una matrice a due viste. Tre difetti del motore trovati costruendola, ognuno col suo gate: le quote casuali del dettaglio, l arrotondamento che riscriveva i tassi dei segmenti piccoli (test/conteggi.test.js) e le intestazioni della heatmap tagliate a sei lettere anche con spazio (test/geometria.test.js, che ha trovato lo stesso difetto nell archetipo operativo gia approvato). I metodi di apprendimento con l AI restano fuori: Tim ci deve ancora pensare.",
    stato: "fatto"
  }
  ,{
    id: "locale/app-lingue",
    versione: 3,
    commento: "nel grafico \"New users and activation — 2025 vs 2024\" la legenda di 2024 non è corretta.",
    dove: "legenda · colline · grammatica",
    fatto: "La legenda non si scrive piu: trend e colline la ricevono dal runtime, con lo stesso segno che disegnano (tratteggio grigio nel trend, colonna --c5 nel colline), e un campo legend nella spec viene rifiutato. Tolta da tutte le spec e dall esempio canonico che il modello copia. Gate generale in test/legenda.test.js: ogni segno della legenda deve esistere nel disegno. Corretto anche il kit Power BI, che per il colline diceva \"anno precedente tratteggiato\". Strada facendo: la stima dello spazio di una matrice nel drill contava tutti i figli invece di quelli del genitore (il drill di immobiliare stava nel canvas per caso).",
    stato: "fatto"
  }
  ,{
    id: "banco/filtro-organico",
    versione: 6,
    commento: "(trovato registrando il video del sito) Il clic del registratore sulla ciambella cade nel buco: cliccava il centro del riquadro della fetta, (915,314), e nessun filtro si applicava.",
    dove: "registratore video",
    fatto: "scripts/bersaglio.js sceglie il punto con elementFromPoint: se il centro del riquadro non colpisce la forma, il punto piu vicino al centro che la colpisce (archi, anelli, nastri). Prima di ogni clic il registratore ricontrolla che sotto il cursore ci sia il bersaglio, e se no il passo fallisce invece di registrare un clic a vuoto. Gate: test/bersaglio.test.js, in Chrome.",
    stato: "fatto"
  },
  {
    id: "banco/filtro-organico",
    versione: 7,
    commento: "(trovato registrando il video del sito) Con un filtro attivo le pillole del contesto entrano nella riga dei filtri, la riga non basta piu e i bottoni vanno a capo (da 26 a 40px); i chip dei filtri scivolano a sinistra mentre si clicca.",
    dove: "barra dei filtri · shell top e intestazione",
    fatto: "Nessun controllo della barra va a capo o si stringe; cede spazio solo il gruppo delle pillole, che ripete un'informazione gia visibile, e una pillola che non ci sta sparisce intera invece di restare mozzata. Il chip acceso non diventa piu grassetto: allargandosi spostava di un pixel tutto quello che veniva dopo. Gate: test/barra.test.js, in Chrome, su ogni mockup in italiano e in inglese con tutti i filtri attivi insieme. Il gate ha trovato lo stesso difetto anche in archetipi/canonical-executive-summary in italiano.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "(brief di Parsa) Filtri per data, regione, categoria e segmento cliente: il segmento non era un filtro, solo tre colonne della matrice regioni.",
    dove: "generatore dei dati · grammatica · skill",
    fatto: "facts.split accetta un array di due dimensioni: tre filtri veri nei fatti, ognuno adattato con la sua IPF, totali che tornano su ogni asse, e con UNA dimensione il dato identico byte per byte a prima. Un membro dello split puo avere growth (la regione che cresce piu delle altre); attrFrom accetta il nome di una dimensione. Regola prima nella skill (SKILL.md, data-params.md, data-realism.md, prompt: ogni filtro chiesto e un filtro), poi nel motore e nel kit Power BI. Gate: test/dimensioni.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "(brief di Parsa) I prodotti migliori E quelli che hanno bisogno di attenzione: l'hbar sapeva mostrare solo i migliori.",
    dove: "hbar · grammatica · kit Power BI",
    fatto: "bind.order:\"asc\" sull'hbar mostra la coda della classifica; rifiutato fuori dall'hbar o con altri valori. chart-selection.md: migliori e peggiori sono una domanda sola. Kit: Bottom N. Gate: test/dimensioni.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "La colonna Margin YoY della matrice scriveva la variazione di un margine in percento (West −9,4%) mentre la card KPI diceva −0,8 pp.",
    dove: "matrice · tooltip del trend · narrativa · kit Power BI",
    fatto: "Ogni variazione a schermo passa da A.varia: una percentuale varia di punti, ovunque; una variazione nulla e piatta (— 0,0 pp), non una freccia rossa. Anche il kit aveva tre copie della regola e una guardava solo il formato: ora una. Gate: test/variazioni.test.js (A.delta e f.sgp vietati fuori da A.varia; ogni colonna var su un tasso in pp, su ogni mockup).",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "(giro locale) Il primo tentativo del modello e stato rifiutato per \"motivo\" mancante su una card a piu viste: la grammatica non lo nominava.",
    dove: "grammatica",
    fatto: "motivo dichiarato obbligatorio in spec.d.ts con i tre valori, sezione sulle card a viste in spec-schema.md, riga nelle regole del prompt. Gate generale test/grammatica.test.js: ogni campo usato dal corpus deve essere dichiarato nei tipi — ha trovato subito altri dieci campi non dichiarati (le stringhe UI, dettaglioMesi, only, seasonality e brand sui membri).",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "(giro locale) L'app ha rifiutato una pagina che apriva con una card a viste: \"la prima riga e [undefined:3, gauge:2]\".",
    dove: "validazione",
    fatto: "validate() appiana da se le card a viste, qualunque sia il chiamante: prima lo faceva solo il render, e lib/validate.ts (l'app) no. Gate: test/viste-validazione.test.js avvolge ogni visual del corpus in una card a due viste e pretende lo stesso verdetto da validate e render.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "Nel colline le colonne del 2024 erano verdi accanto al 2025 in ocra: l'anno prima si leggeva come l'anno buono.",
    dove: "colline · trend · legenda · kit Power BI",
    fatto: "Nuovo token --prior, un grigio neutro in tutte le tredici famiglie: colonne del colline, tratteggio del trend e legenda automatica lo usano; il kit dice grigio neutro. Gate: test/periodo-precedente.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "Nel drill il nome della categoria compariva tre volte: titolo, etichetta accanto al tasto indietro e \"Furniture · 2025 · vs YoY\".",
    dove: "drill · grammatica",
    fatto: "{drill} dentro drillHeader e rifiutato (il nome lo scrive gia il motore) e la grammatica lo dice; corretti i due casi del corpus che lo usavano. Gate: test/dimensioni.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "(giro locale) Con tre filtri la barra sforava; il messaggio diceva solo il totale, il modello ha riparato alla cieca, e' sceso a 2px oltre e il secondo rifiuto ha mandato l'utente sul mockup di ripiego.",
    dove: "messaggi di riparazione · barra dei filtri",
    fatto: "L'errore della barra dice di quanto sfora, quanto costa ogni controllo e quanto libera ogni via d'uscita (tendina, etichette, shell piu larghe o filtri nella rail): la riparazione e un conto. Gate: test/dimensioni.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 1,
    commento: "Il gauge diceva \"100.0%, 0.0 pp below Target\" con l'arco rosso.",
    dove: "gauge",
    fatto: "Uno scarto sotto la risoluzione del formato si dice \"in line with\" e non e rosso; e inv sulla misura ora gira il colore (chiude il difetto aperto del gauge Prime cost, rosso sul numero giusto). Gate: test/gauge.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 2,
    commento: "(controllo della v2) Col filtro Corporate le KPI e la matrice cambiavano, la lista dei prodotti peggiori restava identica al dollaro e la heatmap non segnava la colonna scelta.",
    dove: "grano di dettaglio · heatmap · waterfall",
    fatto: "I figli del dettaglio ereditano tutte le dimensioni della loro riga dei fatti, non solo il genitore: il difetto c'era gia con due dimensioni (immobiliare, provvigioni per agente col filtro tipo). La heatmap attenua le colonne fuori dal filtro sulla dimensione delle colonne, il waterfall le barre fuori dal filtro. Gate generale test/filtri-visual.test.js: su ogni pagina di ogni mockup ogni card risponde a ogni filtro di dimensione — ha trovato sette card ferme in cinque mockup, quattro gia consegnati o approvati.",
    stato: "fatto"
  }
  ,{
    id: "locale/retail-parsa",
    versione: 2,
    commento: "(controllo della v2) \"Products by revenue, with gross margin\": il margine non compariva, stava solo nel tooltip.",
    dove: "hbar · grammatica",
    fatto: "subMeasure si scrive accanto al valore di ogni barra, e lo spazio a destra si allarga di quanto serve; la grammatica lo dice. Gate: test/dimensioni.test.js (la scritta c'e e resta dentro la card).",
    stato: "fatto"
  }
  ,{
    id: "locale/vendite-nitish",
    versione: 1,
    commento: "(controllo della v1) La barra dei filtri usciva dal bordo destro di 6px e \"Compare YoY\" spariva, mentre il motore diceva che la barra ci stava.",
    dove: "barra dei filtri · conto dello spazio",
    fatto: "Il conto usava 92px per ogni chip e 96px per tutto cio che sta a destra, dove oltre ad \"Azzera filtri\" e arrivato \"Come si usa questo mockup\" (circa 200px in tutto). Ora ogni chip vale il suo nome e i bottoni di destra il loro testo, con la stessa misura del runtime e i numeri del CSS. Gate in Chrome (test/barra.test.js): la stima di ogni gruppo di filtri e dei bottoni di destra non e mai sotto la misura vera, su ogni mockup in due lingue.",
    stato: "fatto"
  }
  ,{
    id: "locale/vendite-nitish",
    versione: 1,
    commento: "(controllo della v1) Nel ribbon \"Water Sports\" era rosso pieno, mentre la categoria in calo, Fitness, era blu.",
    dove: "palette · scala categoriale",
    fatto: "Due famiglie (warm-taupe, terroso) mettevano un rosso vero nella scala: il vermiglione della base scurito per il contrasto. La scala categoriale ora esclude la famiglia del rosso, riservato al problema. Gate: test/colori-categorie.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/vendite-nitish",
    versione: 1,
    commento: "(controllo della v1) Sei categorie e cinque colori distinti: la sesta riprendeva il colore della prima.",
    dove: "colori dei membri · grammatica · skill",
    fatto: "Dove il colore identifica il membro (ribbon, stack100, donut, hbar per membro) i membri a schermo non possono superare i colori distinti: il motore rifiuta e dice quali famiglie ne hanno sei. La grammatica e layout-archetypes.md elencano le famiglie da sei e da cinque, e un test le tiene allineate alla realta. Il controllo ha trovato lo stesso difetto in due casi gia nel corpus (un donut a sei fette con cinque colori, un hbar a otto barre con sei), corretti; e nel compositore a menu, che ora rispetta la regola da se (barre e ciambelle mostrano tanti membri quanti i colori, un ribbon prende una famiglia che ne ha abbastanza). Gate: test/colori-categorie.test.js, test/intervista.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/vendite-nitish",
    versione: 1,
    commento: "(controllo della v1) Nel drill un tooltip restava nell'angolo in alto a sinistra, sopra il marchio (visto anche nel drill di Parsa).",
    dove: "tooltip",
    fatto: "Il tooltip prendeva il contenuto al mouseover e la posizione solo al mousemove: quando il grafico si ridisegna sotto un cursore fermo, restava nell'angolo. Ora si posiziona nello stesso istante in cui compare. Gate: test/tooltip.test.js, su ogni mockup — fallisce su tutti col codice di prima.",
    stato: "fatto"
  }
  ,{
    id: "locale/promo-elettrodomestici",
    versione: 1,
    commento: "(brief di Fra) Campagne con sconti su tipologie di prodotti: \"Clima Days\" vendeva il 54% di grandi elettrodomestici e il 13% di clima, la \"Settimana del bianco\" il 23% di TV.",
    dove: "generatore dei dati · grammatica · skill",
    fatto: "Un membro di facts.dim puo dichiarare la sua composizione di uno split (mix: { cat: { clima: 1 } }), che vince sull'adattamento IPF. Il tetto delle celle conta quelle effettive e le righe tutte a zero non viaggiano piu nel file (il mockup e sceso da 168 a 107KB). La voce retail della skill spiega come si modella una campagna. Gate: test/eventi.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/promo-elettrodomestici",
    versione: 1,
    commento: "(brief di Fra) \"Le campagne degli ultimi due anni, tra cui quelle ripetute\": tutte le campagne comparivano per forza in entrambi gli anni.",
    dove: "generatore dei dati · matrice · KPI",
    fatto: "anni: [2025] su un membro: fuori dai suoi anni vale zero. La variazione di una voce che l'anno prima non c'era si legge \"nuova\", nella matrice e nelle KPI, anche per le percentuali. Gate: test/eventi.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/promo-elettrodomestici",
    versione: 1,
    commento: "(controllo della v1) La heatmap sedi x campagne: la colonna \"Fuori promozione\" vale dieci volte le altre e le schiacciava tutte sullo stesso colore chiaro.",
    dove: "heatmap · grammatica",
    fatto: "per: \"colonna\" sulla heatmap: i gradini si calcolano dentro ogni colonna. Rifiutato fuori dalla heatmap. Gate: test/eventi.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/promo-elettrodomestici",
    versione: 2,
    commento: "(controllo della v2) \"Fuori promozione\" con €118K di vendite incrementali e un uplift di −100%.",
    dove: "skill (ricetta dell'incremento) · matrice · KPI",
    fatto: "La ricetta nella skill derivava l'incremento dal netto con un attributo 1 per il fuori promozione, e la variazione casuale del campo inventava un incremento: ora l'incremento e una quota delle vendite in promozione, zero per costruzione dove la promozione non c'e. E un tasso con base zero o negativa si scrive \"—\" invece di un numero. Gate: test/eventi.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/promo-elettrodomestici",
    versione: 2,
    commento: "(controllo della v2) Filtrando una campagna il sottotitolo della pagina andava a capo e il titolo si alzava.",
    dove: "intestazione",
    fatto: "Il blocco del titolo si stringeva di mezzo pixel quando le pillole del contesto crescevano: ora ha larghezza propria con un tetto fisso. Il gate in Chrome (test/barra.test.js) misura anche titolo e sottotitolo con tutti i filtri attivi, e sul codice di prima ha trovato lo stesso difetto nel mockup di Parsa in inglese.",
    stato: "fatto"
  }
  ,{
    id: "locale/supply-chain-muttahar",
    versione: 1,
    commento: "un gauge non puo occupare tutto questo spazio. O ne metti piu di uno o inserisci un altro grafico sopra o sotto: occupa troppo spazio per l'informazione che da realmente (visto anche nel mockup precedente).",
    dove: "gauge · grammatica · skill · kit Power BI",
    fatto: "Gauge multiplo: bind.misure affianca due o tre gauge nella stessa card, ognuno col suo bersaglio; nei pannelli stretti l'arco si centra e il bersaglio va nella nota sotto (la scritta sull'arco copriva il valore). Un gauge singolo in una card oltre 300px e rifiutato, anche come vista nascosta, con le tre vie d'uscita nel messaggio. Corretti l'esempio canonico executive-summary (il modello lo copia) e il mockup di Parsa, che avevano lo stesso difetto. Regola in chart-selection.md. Gate: test/gauge.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/supply-chain-muttahar",
    versione: 1,
    commento: "(visto rifacendo il mockup) La riga del totale della tabella dei magazzini era tagliata di 17px.",
    dove: "matrice · runtime",
    fatto: "Le altezze si stimano prima del disegno e sbagliano di qualche pixel su titoli e intestazioni: dopo il disegno il runtime misura e stringe le righe di una tabella che non entra nel suo riquadro. Il gate in Chrome (test/barra.test.js) controlla ogni pagina di ogni mockup in due lingue; prima della correzione ha trovato cinque pagine tagliate nel corpus, fra cui Parsa e l'app di lingue.",
    stato: "fatto"
  }
  ,{
    id: "locale/supply-chain-muttahar",
    versione: 2,
    commento: "I don't like it: if a gauge is already showing something that is present in kpi cards don't put it. Change visualization/s.",
    dove: "gauge · grammatica · skill · corpus",
    fatto: "Un gauge su una misura che ha gia la sua card nella banda KPI e rifiutato, e il messaggio indica visual che aggiungono informazione (dove si perde, chi e sotto il bersaglio, quando). Il doppione era ovunque: tutti e sei i gauge del corpus ripetevano una card KPI, compresi i due esempi canonici che il modello copia — da li l'abitudine. Corretti tutti: dove il gauge e il visual giusto esce la card KPI doppia, altrimenti esce il gauge. Nel mockup di Muttahar: un funnel ordini -> puntuali -> puntuali e completi al posto dei tre gauge, e le regioni piu lontane dal target nel drill. Gate: test/gauge.test.js (rifiuto e nessun doppione nel corpus).",
    stato: "fatto"
  }
  ,{
    id: "locale/supply-chain-muttahar",
    versione: 2,
    commento: "(visto rifacendo il mockup) Nel funnel le percentuali di passaggio vicine al 100% finivano sopra la barra.",
    dove: "funnel",
    fatto: "Le barre si fermano prima dello spazio della percentuale. Gate: test/dimensioni.test.js, su ogni funnel del corpus.",
    stato: "fatto"
  }
];

/** Gli interventi che riguardano un mockup, dal piu recente. */
const perMockup = id => INTERVENTI.filter(i => i.id === id).sort((a, b) => b.versione - a.versione);

module.exports = { INTERVENTI, perMockup };
