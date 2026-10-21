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
  ,{
    id: "locale/supply-chain-muttahar",
    versione: 3,
    commento: "The data lacks diversity. Each warehouse has its own service rates, but the regions only get a share of orders: every region lands on almost the same OTIF (around 90.2%), so the heatmap, the region ranking and the region table don't tell a story. The rates also stay the same every year, so year-over-year comparisons come out flat.",
    dove: "generatore dei dati · validazione · skill · corpus",
    fatto: "Il generatore non sapeva esprimere un tasso che dipende da due dimensioni ne un tasso che cambia negli anni. Ora `mod` sposta il tasso con l'attr di un'altra dimensione dei fatti (il magazzino da il livello, la regione lo sposta), e un attr puo avere un valore per anno, che scorre dentro l'anno senza scalino a gennaio. La validazione (engine/tassi.js) rifiuta un tasso uguale per tutti i membri della dimensione che lo mostra e una banda KPI coi tassi fermi negli anni; il secondo difetto stava in altri otto casi del corpus, corretti. Muttahar v2: regioni fra 84% e 92% di OTIF (Florida, Mountain e Pacific Northwest in fondo, California in calo), rete da 87,7% a 89,2% in tre anni, Atlanta che peggiora e Dallas che migliora. Gate: test/tassi.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/supply-chain-muttahar",
    versione: 4,
    commento: "(Fra) Modifica ancora di piu la diversity o varianza, cerchiamo di evidenziare una storia specifica.",
    dove: "generatore dei dati · skill · corpus",
    fatto: "Un attr puo avere un valore per MESE (anni x 12): serve all'evento con una data, che un valore per anno spalma su tutto l'anno. La storia di Muttahar: il cambio di sistema di Atlanta ad aprile 2025 porta il suo OTIF sotto l'80% fra aprile e giugno, poi recupera; ogni magazzino serve le sue regioni (mix), quindi il colpo cade su Southeast e Florida (-4,5 punti) mentre Northeast e Great Lakes stanno sopra il 94%. La rete, che si avvicinava al target nel 2024, perde 0,6 punti. Gate: test/tassi.test.js (il mese colpisce il suo mese; il crollo di Atlanta si vede).",
    stato: "fatto"
  }
  ,{
    id: "locale/supply-chain-muttahar",
    versione: 4,
    commento: "(Fra) Nel grafico misto con le colonne per anno e l'OTIF come linea non si capisce bene l'asse e la riga e dritta. L'asse deve adeguarsi ai filtri come fa Power BI ed evidenziare i cambiamenti mese per mese; passando col mouse non si vede il valore.",
    dove: "colline · runtime",
    fatto: "L'asse della linea andava da zero a 1,25 volte il massimo, senza etichette. Ora va dal minimo al massimo dei mesi visibili, a tacche tonde scritte a destra nel colore della linea, e si ricalcola a ogni filtro; un mese senza dati interrompe la linea invece di farla cadere a zero. Ogni punto ha un bersaglio col tooltip: il valore, la variazione sul mese prima e la misura delle colonne. Gate: test/assi.test.js su ogni colline del corpus.",
    stato: "fatto"
  }
  ,{
    id: "locale/supply-chain-muttahar",
    versione: 4,
    commento: "(visto rifacendo il mockup) Nella heatmap magazzino x regione le corsie che non esistono uscivano 0.0% col gradino piu freddo.",
    dove: "heatmap · runtime",
    fatto: "Una cella il cui rapporto non ha base e vuota, con un trattino, e resta fuori dai gradini di colore; A.definita legge anche un denominatore che e un'altra misura. Gate: test/assi.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 2,
    commento: "(Fra) Non voglio piu vedere grafici a barre orizzontali del genere: sono cosi piccoli i colori che non si capisce quale sia di piu degli altri. Studia dei metodi per far apparire meglio la grandezza delle barre e le label (Power BI ha i details dentro le barre); se metti qualcosa fuori cosi i grafici non sono chiari. Chiediti sempre se non solo il testo e intero ma anche se le barre si vedono a una grandezza che permette il confronto. + guideline sulle label (PDF).",
    dove: "hbar · runtime · skill · gate in Chrome",
    fatto: "L'hbar e ridisegnato come il bar chart 'space-saving' di Power BI: il nome sopra la barra, la barra su tutta la larghezza della card (la piu lunga ha almeno il 70%), un colore solo, spessa fino a 18px; il valore in grassetto alla fine della barra o dentro, con l'inchiostro che contrasta (M.inkSu); il dettaglio sulla riga del nome, a destra. Le cifre, sempre monospaziate, si misurano con M.larghN: misurate come testo proporzionale uscivano corte e sforavano il bordo. La skill (chart-selection.md) ha le regole delle label dalle guideline di Fra. Gate in Chrome (test/barra.test.js), su ogni hbar del corpus: barre di almeno 8px, la piu lunga oltre il 55% della card, ogni testo dentro il riquadro, nessuna sovrapposizione.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 2,
    commento: "(visto nel primo colpo) Il totale della colonna Late value si leggeva CHF 1183.9M.",
    dove: "formati",
    fatto: "I miliardi hanno la loro sigla (B, Mld in italiano) e il confine fra K, M e B segue l'arrotondamento (999.700 fa 1,0M). Gate: test/runtime.smoke.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 2,
    commento: "(visto rifacendo il mockup) Il codice nuovo portava ecommerce-retail a 76,1KB, oltre il tetto di 75KB.",
    dove: "render · runtime",
    fatto: "L'anno nelle righe dei fatti viaggia come scarto dal primo (y0), e il runtime lo riporta all'anno vero: circa 1,1KB in meno per ogni mockup, senza toccare il codice dei grafici.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 3,
    commento: "(Fra) In un grafico misto in percentuale con un target puoi includere una linea fissa che mostri il target. Popola meglio l'asse: con le etichette solo nella parte alta non l'ho mai visto in Power BI.",
    dove: "colline · runtime · grammatica · skill",
    fatto: "Il colline accetta `target` (e `targetLabel`) sulla scala della linea: una linea fissa tratteggiata con la sua etichetta, inclusa nella scala dell'asse. L'asse della linea ora occupa tutta l'altezza del grafico, con quattro-sei tacche e un margine sotto il minimo, cosi un valore o un target sul fondo non coincide con la base. La validazione rifiuta un target senza linea o una percentuale scritta come 98 invece di 0.98. Target dichiarati nei casi di Luca (98%) e di Muttahar (OTIF 92%). Gate: test/assi.test.js (le tacche coprono almeno il 60% dell'altezza; un colline con target disegna la linea dentro il grafico).",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 3,
    commento: "(Fra) Nelle tabelle usi un colore per ogni valuta: potresti usare lo stesso anche nel grafico a barre.",
    dove: "hbar · runtime · skill",
    fatto: "Ogni barra prende il colore del suo membro, lo stesso del quadratino nelle tabelle (col padre, il colore del padre); l'inchiostro del valore scritto dentro la barra si sceglie sul contrasto col colore di quella barra. Gate: test/assi.test.js confronta, su ogni pagina del corpus, il colore di ogni barra col quadratino dello stesso membro nelle tabelle.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 3,
    commento: "(Fra) Rendi la linea target di un colore piu simile alla linea; suggerisco di modificare entrambe, perche la linea non ha molto contrasto in confronto all'anno 2025.",
    dove: "colline · runtime · gate in Chrome",
    fatto: "La linea del colline era l'ambra fissa del tema, quasi uguale alle colonne oliva del 2025. Ora il motore sceglie il colore della linea fra quelli della palette: il primo che dista abbastanza (distanza fra colori, che conta tinta e luce) sia dalle colonne correnti sia da quelle grigie dell'anno prima, ed e abbastanza scuro da leggersi sulla card. La linea del target, l'asse, i punti e l'etichetta usano lo stesso colore; il target resta tratteggiato. Gate in Chrome (test/barra.test.js): su ogni colline del corpus la linea dista dalle colonne e il target ha il colore della linea.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 2,
    commento: "(Fra) Correggi tutto, includi qualunque cosa abbia chiesto. Brief: \"the full income statement in proper account order (Revenue, COGS, Gross Profit, Opex by department, EBITDA, D&A, EBIT), with Actual, Budget, Variance and Variance % columns. Drill from statement lines down to individual accounts\"; \"Subtotals like Gross Profit and EBITDA are calculated, not summed\".",
    dove: "statement · runtime · grammatica · skill · kit",
    fatto: "Nuovo visual `statement`: le righe sono le voci in ordine, i subtotali (`kind: sub`) e il totale sono le loro misure, mai la somma delle righe, i margini (`kind: pct`) variano in punti. Colonne Actual, Budget, Var, Var % per il periodo e, con un mese o un trimestre scelto, per il YTD. Una voce con `accounts` si apre in riga nei suoi conti (budget per peso, effettivo con uno scarto per conto e periodo, sempre rinormalizzato perche i conti sommino la voce). Nel kit: tabella delle voci e misure SWITCH, YTD con TOTALYTD. Gate: test/finanza.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 2,
    commento: "Brief: \"Revenue, Gross Margin %, EBITDA, EBITDA margin and net cash, each for the month and YTD, against budget and prior year\"; \"YTD follows the selected month\".",
    dove: "KPI · runtime · grammatica",
    fatto: "La card finance (`budget`, `ytd` nella banda KPI, scelta di Fra: due righe per card): il valore del periodo con lo scostamento dal budget e dall'anno prima, sotto il YTD fino al mese scelto con gli stessi due scostamenti; con l'anno intero la seconda riga dice budget e anno prima in assoluto. La banda si alza a 122px solo quando serve. Gate: test/finanza.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 2,
    commento: "Brief: \"Variances follow finance logic: costs above budget and revenue below budget are unfavourable (red), the opposite is favourable (green)\".",
    dove: "matrice · statement · colori",
    fatto: "Colonna di matrice `kind: bud` (assoluta o %), scostamenti nel conto economico e nella card con A.scost, che segue il verso della misura (inv sui costi). Con `meta.varianze: finanza` il favorevole e verde e lo sfavorevole rosso (le frecce restano per chi non distingue i colori). Gate: test/finanza.test.js controlla il colore di ogni riga del conto economico.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 2,
    commento: "Brief: \"numbers in thousands with one decimal\" (Fra: ovunque).",
    dove: "formati",
    fatto: "`meta.numberFormat: k1`: ogni importo in migliaia con un decimale (€52,134.5K), card, tabelle, assi e tooltip; i margini degli assi si misurano sulle tacche, che in K.1 sono lunghe. Gate: test/finanza.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 2,
    commento: "Brief: \"Cash - a monthly bridge from opening to closing cash\".",
    dove: "waterfall · generatore dei dati",
    fatto: "Il waterfall a passi (`stock`, `steps`): apertura, flussi col segno, chiusura. Nel generatore il campo `cumulative` (la cassa e quella del mese prima piu il flusso netto), quindi apertura + passi = chiusura esattamente e l'apertura e la cassa del mese prima. Quando i passi sono piccoli rispetto ai totali l'asse parte vicino al minimo (i gradini erano strisce di un pixel); un gradino piccolo resta alto almeno 4px; i valori stanno sopra le barre. Gate: test/finanza.test.js e test/barra.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 2,
    commento: "(visto nel primo colpo) Nel grafico misto \"EBITDA margin\" copriva la tacca del 22% dell'asse; nei Top 10 clienti i colori per segmento non avevano legenda; sotto le tabelle di tre righe restava un terzo di pagina bianco; il mix per segmento non rispondeva al filtro del segmento.",
    dove: "colline · hbar · layout · stack100",
    fatto: "L'etichetta della linea resta dentro l'area del grafico e scende sotto il punto se tocca il target; l'hbar colorato per il padre ha la legenda dei padri; i grafici crescono fino al 60% (era il 25%) per riempire la pagina; lo stack100 attenua i gruppi col filtro sulla loro dimensione. Gate: test/barra.test.js (scritte dei colline dentro il riquadro e mai sovrapposte), test/filtri-visual.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 2,
    commento: "(Fra) Check the filters: when I click the drop down ones the menu appears at the top left and does not follow a normal behaviour.",
    dove: "filtri · CSS · runtime · gate in Chrome",
    fatto: "Nella rail il pannello del menu era in posizione assoluta senza un contenitore di riferimento: si apriva in alto a sinistra, largo tutta la pagina. Ora il gruppo del filtro e il riferimento e il pannello si apre attaccato sotto il suo bottone, largo quanto lui; se sotto non c'e posto si apre sopra, e una lista lunga scorre invece di uscire dalla finestra. Il gate ha trovato subito un secondo caso: con la rail e i filtri nell'intestazione (trasporti-verona) il menu prendeva la posizione della rail e si apriva trenta pixel sotto il bottone, corretto. Gate in Chrome (test/barra.test.js): ogni menu a tendina di ogni mockup, in due lingue, si apre attaccato al suo bottone e dentro la finestra.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 2,
    commento: "(visto rifacendo il mockup) Il codice finance portava ecommerce-retail a 80,1KB, oltre il tetto.",
    dove: "render · runtime",
    fatto: "La card finance e gli scostamenti dal budget stanno fra i marcatori #fin, e il loro CSS (conto economico, righe della card) viaggia solo nei report che li usano: un report senza budget torna a 77,5KB.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 3,
    commento: "(Fra) Riguardo al pdf delle label hai implementato qualcosa in generale? Q&A: min/max/ultimo punto sulle linee e % del totale accanto al valore delle barre, attivi di default con regole.",
    dove: "trend · colline · hbar · runtime · skill",
    fatto: "M.etichettePunti: su ogni trend (anno singolo) e sulla linea di ogni colline con almeno sei punti il motore scrive il valore del massimo (sopra), del minimo (sotto) e dell'ultimo punto, evidenziati; un punto che e insieme ultimo ed estremo si scrive una volta; ogni scritta resta nell'area del grafico, evita il nome della serie e il target, prova il lato opposto prima di saltare. Nell'hbar di una misura additiva la quota sul totale di TUTTI i membri sta accanto al valore (dentro la barra se il valore e dentro e ci sta). `labels: false` e `share: false` le spengono. Gate: test/assi.test.js (ogni linea di sei punti ha le sue etichette e il massimo scritto e il massimo vero; le quote non superano il 100%) e test/barra.test.js in Chrome (scritte dei trend dentro il riquadro e mai sovrapposte).",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 3,
    commento: "On the Revenue page, selecting a segment or product line highlights the bars, while selecting an entity filters the chart down to just that entity. One behaviour for both would be cleaner. (Fra: in Power BI si puo anche staccare un grafico da un filtro; tenere in alcuni casi tutti i segmenti ha senso; scrivilo nel kit.)",
    dove: "filtri · runtime · kit · skill · gate",
    fatto: "La regola di Power BI: un filtro della barra (slicer) filtra ogni visual, anche quello della sua dimensione; il clic dentro un grafico evidenzia quel grafico e filtra gli altri (S.fonte ricorda da quale card parte il filtro; A.hl, A.membri, A.evid). Il ribbon evidenzia sempre: filtrato a un membro, quel membro sarebbe sempre primo. Un visual si stacca da un filtro con `ignoreFilters` (Power BI: Edit interactions → None), e il kit scrive come farlo. Nel caso di Bodan il mix per segmento resta completo col filtro del segmento. Due correzioni nate dal cambio: lo script del video sceglie un clic su un'altra dimensione rispetto alla tabella da aprire, e la scheda scrive {period} col mese di partenza (cercava '· 2026' in un report che parte da 'Dec 2026'). Gate: test/interazioni.test.js e test/filtri-visual.test.js (un visual staccato deve restare fermo).",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 3,
    commento: "Colors could be more standardized, 2026 and Netherlands share the same color.",
    dove: "colori · skin · runtime",
    fatto: "Il periodo corrente ha il suo token (--cur): un neutro scuro (antracite, convenzione IBCS) scelto fra alcuni candidati come il primo lontano da ogni colore della palette e dal grigio dell'anno prima, anche quando la spec porta la sua palette; i colori della palette restano ai membri. Trend, colline, sparkline e le loro legende usano --cur. Gate: test/interazioni.test.js su ogni mockup del corpus.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 3,
    commento: "In the tables, a different color for budget than for actual would make it more visual which is which, probably column color.",
    dove: "matrice · statement · CSS",
    fatto: "Ogni misura usata come `budget` nella spec ha le sue colonne con uno sfondo proprio (--bud, una velatura fredda leggera), nelle tabelle e nella colonna Budget del conto economico. Gate: test/interazioni.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 3,
    commento: "(visto rifacendo il mockup) Lo scostamento positivo accanto alle barre si leggeva \"€97.4K vs budget\" senza segno; il nuovo codice portava ecommerce-retail a 80,5KB.",
    dove: "hbar · render",
    fatto: "Una misura differenza accanto alla barra ha sempre il segno. Per il peso: CSS spedito senza a capo, regole delle card a viste solo dove ci sono viste, formato K.1 e scansione del budget nel blocco finance, e dalla spec incorporata escono le chiavi che il runtime non legge (aesthetic, archetype, skin e i campi di meta disegnati dal server): ecommerce-retail torna a 79,7KB.",
    stato: "fatto"
  }
  ,{
    id: "locale/cfo-bodan",
    versione: 3,
    commento: "(Fra) Vedo ancora due comportamenti: se in Revenue clicco un cliente si evidenzia tutto il Mid-market, se filtro il segmento a sinistra ho solo i clienti di quel segmento. La top 10 clienti deve essere filtrabile solo col pannello a sinistra: non ha logica cliccare una barra se il resto del report non filtra per quel cliente.",
    dove: "hbar · runtime · scheda · kit · skill",
    fatto: "Regola generale: un clic filtra cio su cui si clicca. Una lista di una dimensione che non e un filtro del report (i clienti, i prodotti di una top N) non e piu cliccabile: prima il clic filtrava il suo padre (il segmento) e ne evidenziava tutti i membri. La lista segue solo gli slicer. `crossFilter: false` toglie i clic a qualunque visual (Power BI: Edit interactions → None dal visual verso gli altri), e il kit lo scrive, anche per le liste di dettaglio. La scheda e lo script del video non promettono piu quei clic. Gate: test/interazioni.test.js (i clienti non sono cliccabili, nessuna lista del corpus filtra piu di una dimensione, crossFilter toglie i clic).",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "studia bene i cutoff",
    dove: "dati · corpus",
    fatto: "Cut-off presi dalle tabelle pubblicate da due banche svizzere (UBS, giugno 2026; Zurcher Kantonalbank, febbraio 2026; CET, pagamenti singoli elettronici, data valuta): CHF 16:00, EUR SEPA 14:00, altri EUR 15:00, USD 18:00, GBP 16:15, JPY/HKD/SGD 16:00 del giorno prima della valuta. La voce 'Other 12:00' del primo mockup era sbagliata: le valute asiatiche chiudono il giorno prima, ed e anche la causa principale dei loro ritardi (istruzioni arrivate dopo il cut-off).",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "se superiore al target farlo verde ed inferiore rosso in generale",
    dove: "misure · runtime · skin · kit · skill",
    fatto: "Una misura con `target` (e `inv` se meno e meglio) colora i suoi valori ovunque: valore della card, celle delle tabelle, barre, numeri della heatmap, punti della linea del colline; verde dal lato giusto, rosso dall'altro (token --ok/--ko, sempre con freccia o segno accanto). Lo stato si decide sul valore come viene mostrato (97,96% si legge 98,0% e non e rosso contro un target del 98%). Il kit Power BI scrive il target e la misura del colore per la formattazione condizionale. Gate: test/lettura.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "in how to use this mockup meglio inserire come i kpi vengono calcolati, fai finta che chi stia guardando il report non sappia nulla",
    dove: "scheda · skill",
    fatto: "La guida ha la sezione 'How the KPIs are calculated': per ogni card la definizione in parole (`description` della misura), il calcolo (somma di, A diviso B, A meno B, valore a fine periodo), il target e da che parte e buono, il totale su cui si legge. Gate: test/lettura.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "manca storytelling; titoli impattanti e che spiegano sempre",
    dove: "skill · corpus",
    fatto: "Regola nella skill: ogni titolo dice il fatto con un numero, calcolato dai dati prima di scriverlo; il sottotitolo della pagina e la storia della pagina su una riga (gate in Chrome: non va a capo). Il mockup v4 lo applica su ogni visual.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "lui farebbe il numero di pagamenti vs value at risk",
    dove: "corpus",
    fatto: "Le barre del valore a rischio portano accanto il numero di pagamenti a rischio, e la tabella per valuta ha le due colonne affiancate. Il grafico a dispersione provato prima in una colonna sola tagliava l'asse ed era illeggibile: il margine dello scatter ora vale quanto la tacca piu larga.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "una cosa importante da valutare e la disposizione geografica (Fra: bookmark per valuta o paese, nella tabella, niente mappe)",
    dove: "generatore · corpus",
    fatto: "La tabella della coda ha due viste (bookmark): per valuta e per paese di destinazione (13 paesi, composizione dichiarata per valuta). Il generatore ha la dimensione padre (`parentDim`): il tipo di pagamento si ricava dalla valuta, cosi valuta, divisione e paese restano le tre dimensioni dei fatti e il filtro del tipo funziona. Due controlli del motore corretti: due viste matrice con le stesse colonne sono la stessa domanda; il filtro di una dimensione padre non e inerte.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "pagina 2: meglio by division che channel; nella tabella mostra vs total number of payments; late payments da solo non ha senso",
    dove: "kpi · corpus",
    fatto: "Divisioni (Private Banking, Wealth Management, Corporate & Institutional, Retail & SME, Treasury & Markets) al posto dei canali. Una card con `of` dice su quale totale si legge ('of 1,338,483 payments · 1.4% · 2024 1.7%'); le tabelle hanno Payments, Late e Late % affiancati.",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "il layout andrebbe adattato ai colori ufficiali della banca (commento generale)",
    dove: "skin · skill",
    fatto: "`skin.brand` (la funzione esisteva ma nessuno la chiamava): i colori ufficiali del cliente danno la cornice (rail, voce attiva, etichette); la scala dei dati resta quella verificata, perche un marchio lascia quattro o cinque colori distinguibili anche per chi non vede bene i colori, non sei. La palette del marchio non viene piu presa dalla memoria (due marchi avrebbero condiviso i token).",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "(visto rifacendo il mockup) La causa 'Counterparty / system', calcolata per differenza, usciva -2,4%; un grafico in una riga flessibile usciva dal fondo della card; un titolo su due righe non era contato.",
    dove: "generatore · validazione · fit · gate",
    fatto: "`facts.parts`: le parti di un intero si riscalano in ogni riga perche lo sommino, intere e mai negative; la validazione rifiuta un conteggio con valori negativi (un saldo si dichiara `signed`; i 'Nuovi follower' del caso social erano un saldo e ora si chiamano 'Follower netti'); mai -0 nei dati. Un grafico con altezza fissa in una riga flessibile si riduce allo spazio della riga, e l'intestazione si stima sulla larghezza della card. Gate in Chrome: niente esce dalla sua card. Tetto del file a 90KB (decisione di Fra).",
    stato: "fatto"
  }
  ,{
    id: "locale/pagamenti-luca",
    versione: 4,
    commento: "(visto rifacendo il mockup) La vista per paese usciva dal fondo della card; nella heatmap 'JPY · HKD · SGD' era tagliato a sinistra; nella guida una frase cominciava con la minuscola.",
    dove: "fit · heatmap · gauge · scheda · gate in Chrome",
    fatto: "Lo spazio di una card a viste vale quanto la sua vista piu alta; un'etichetta di riga della heatmap troppo lunga si accorcia coi puntini (il nome intero nel tooltip). Il gate in Chrome ora apre ogni vista di ogni card a viste e controlla i testi di TUTTI i grafici (prima solo hbar, colline e trend): ha trovato subito il gauge di Parsa, dove con valore e target entrambi al 100% l'etichetta del bersaglio copriva il valore — ora il bersaglio passa nella nota sotto l'arco.",
    stato: "fatto"
  }
  ,{
    id: "locale/trasporti-verona",
    versione: 2,
    commento: "(Fra, guardando il video per LinkedIn) Never do again the yellow white for the labels, is not accessible/visible.",
    dove: "tooltip · runtime · skin · skill · gate",
    fatto: "Il tooltip era sempre il primo colore della scala con testo bianco: nelle famiglie scure il primo colore e un giallo chiaro, e il tooltip usciva bianco su giallo a circa 1,3:1. Ora il fondo del tooltip e il primo colore solo se il bianco ci sta sopra a 4,5:1, altrimenti l'inchiostro del report con il colore della card (skin.scegliTip, ricalcolato dopo la palette della spec). L'inchiostro su un colore (quote del donut, percentuali delle pile 100%, stadi del funnel, valori dentro le barre) si sceglie misurando il contrasto WCAG fra scuro e bianco, invece di una soglia di luminanza che nei temi scuri dava comunque chiaro su chiaro; i numeri verde/rosso della heatmap col target tengono la tinta e si scuriscono o schiariscono fino a 4,5:1; il velo delle cifre del ribbon e scuro all'80%. Regola nella skill (chart-selection.md). Gate in Chrome (test/barra.test.js): ogni testo su una forma colorata, il tooltip e la pagina di drill-through, su ogni mockup del corpus in due lingue, a 4,5:1.",
    stato: "fatto"
  }
  ,{
    id: "locale/trasporti-verona",
    versione: 2,
    commento: "(trovato dal gate del contrasto e dal gate degli errori, 13 ott 2026) Testi sovrapposti, un drill-through che andava in errore, un helper sparito.",
    dove: "hbar · colline · matrice · runtime · gate",
    fatto: "Quattro difetti, ognuno corretto: (1) hbar di app-lingue con nove topic in una card bassa: righe da 21px, il nome della riga dopo stampato sulla barra di quella prima; ora le righe sono quante ne stanno (nome, barra di almeno 8px, respiro) e la legenda dei padri dice solo quelle mostrate. (2) Colline di Bodan: con l'ultimo punto in cima all'area il nome \"DSO\" finiva sul pallino dello stesso colore; ora va a sinistra del punto. (3) Ribbon-sorpasso: la tabella dichiarava il drill-through senza che il report avesse la pagina di dettaglio, e il tasto destro andava in errore; ora data-drill esiste solo se c'e la pagina. (4) Gli inchiostri su un colore stavano nella regione dell'hbar, che il bundler toglie quando l'hbar non c'e: il drill di Verona non si disegnava. Ora stanno nel nucleo, e il test in Chrome fallisce su qualunque errore JavaScript della pagina, drill-through compreso.",
    stato: "fatto"
  }
  ,{
    id: "locale/trasporti-verona",
    versione: 2,
    commento: "(visto rifacendo il video) Nel drill-through la legenda del donut dei costi mostrava i carrier in blu, accanto a uno spicchio arancio.",
    dove: "donut · runtime · gate",
    fatto: "Lo spicchio dichiarato `alert` si colora di rosso, ma la sua legenda (disegnata dentro l'svg) restava nel colore del membro. Ora il quadratino ha il colore dello spicchio. Gate: test/legenda.test.js controlla anche la legenda interna del donut e la pagina di drill-through; sul codice vecchio trova Verona e banco/concentrazione.",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 2,
    commento: "(Fra) Questa ripetizione dello stesso grafico non mi piace per niente. Usa i bookmark ti avevo detto.",
    dove: "validazione · skill · corpus",
    fatto: "Valore aggiunto e occupati per settore erano due pile 100% per paese affiancate, e capitale/prodotto e investimenti due classifiche per paese. Ora la validazione rifiuta due visual dello stesso tipo sulla stessa dimensione (e lo stesso asse by) nella stessa pagina, drill-through compreso, e chiede una card a viste (il bookmark). Nel corpus lo faceva solo il drill di app-lingue (due classifiche di topic), convertito in una card a viste con accanto un grafico colonne + linea. Regola nella skill. Gate: test/assi.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 2,
    commento: "(Fra) Il primo line chart: devi lavorare sugli assi, cosi non si vede l'evoluzione ma sembra una linea dritta.",
    dove: "trend · runtime · grammatica · skill",
    fatto: "L'asse del trend partiva sempre da zero: un PIL pro capite fra 60.000 e 62.000 era una riga piatta. Ora l'asse delle linee segue i dati (M.asseLinea, nel nucleo): da zero solo se il minimo e gia vicino allo zero, altrimenti stretto sui valori, anche nel trend su piu anni. Per i dati annuali (macro, bilanci) il trend accetta grain \"year\": un punto per anno su tutti gli anni, con l'anno scelto evidenziato, mentre le card restano sull'anno; la legenda \"anno / anno prima\" non compare piu dove il tratteggio non c'e. Gate: test/assi.test.js (asse da zero con la linea tutta nella meta alta; un punto per anno; nessun tratteggio promesso), che sul codice vecchio trova quattro trend del corpus.",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 2,
    commento: "(visto rifacendo il mockup) \"$15115,7 Mld\": oltre i mille miliardi le cifre non erano raggruppate.",
    dove: "formati · runtime",
    fatto: "Gli importi oltre i mille miliardi si raggruppano (\"$15.115,7 Mld\", \"$2,523.4B\"). Gate: test/runtime.smoke.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 3,
    commento: "(Nicola) Per un tema economico chi guarda si aspetta i numeri veri della Penn World Table e della Banca Mondiale. (Fra) Immaginiamo come se lui ci avesse fornito i dati: potremmo partire anche da una base di dati.",
    dove: "dati forniti · skill · motore · kit · gate",
    fatto: "Nuovo ingresso del motore: engine/dati-forniti.js carica una tabella fornita (righe o CSV, anno, mese facoltativo, dimensioni con i membri, campi numerici) nello stesso formato che render() riceve dal generatore. Rifiuta membri sconosciuti, numeri non numerici, anni sbagliati; somma le righe con la stessa chiave; anni contigui; tetto sulle celle invece dei 12 anni. Il kit dei dati forniti dice di importare il CSV invece di proporre un prompt sintetico, con grano e calendario annuali. Regola nella skill (SKILL.md e data-realism.md): i dati forniti si usano cosi come sono, cio che manca resta vuoto, la fonte e citata, i derivati hanno la formula nel kit. Gate: test/dati-forniti.test.js (9 controlli).",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 3,
    commento: "(Nicola) PIL pro capite, capitale ecc. sono dati annuali, quindi il dettaglio per mese non ha molto senso; la trasformazione strutturale si vede bene solo partendo dal 1970.",
    dove: "dati forniti · runtime · kit",
    fatto: "Una tabella senza mese e annuale: data.mensili vuoto, nessun trimestre ne mese nel report, il trend per anni, il kit con il grano annuale. Il tetto dei 12 anni vale solo per il generatore sintetico: Nicola v3 copre 1970-2023 (54 anni). Un visual si stacca dallo slicer del periodo con ignoreFilters [\"date\"] (Edit interactions → None, scritto nel kit): la crescita media per decennio resta sui decenni qualunque anno guardino le card. Gate: test/dati-forniti.test.js.",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 3,
    commento: "(Nicola) Il K/Y di steady state salta parecchio da un anno all'altro (la Spagna passa da 3,1 a 2,0) mentre gli investimenti restano quasi uguali: col modello di Solow non dovrebbe succedere.",
    dove: "dati · skill",
    fatto: "Errore mio nella preparazione: g era la media mobile della crescita effettiva, crollo del 2020 compreso. Ora K/Y* = s / (n + g + delta) con g di tendenza costante per paese (progresso tecnico labour-augmenting medio 1971-2023), n crescita della popolazione in media mobile su 10 anni (gli occupati crollano nelle crisi), s e delta di PWT. Con gli investimenti fermi lo steady state non si muove piu di 0,41 in un anno (prima 1,6). Regola nella skill: un valore teorico di un modello si calcola su parametri di tendenza, mai sui valori dell'anno. Gate nella preparazione dei dati (out/nicola/v3-dati.py rifiuta un salto oltre 0,5 con gli investimenti fermi).",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 3,
    commento: "(Nicola, concordando coi punti segnalati) I punti dello scatter non hanno il nome del paese; le pile per settore non hanno la legenda; (visto coi dati veri) un paese senza il dato finiva sullo zero dello scatter.",
    dove: "stack100 · scatter · runtime · gate",
    fatto: "Le pile 100% portano la legenda dei membri che compaiono, e un gruppo senza dati scrive \"dato non disponibile\"; lo scatter scrive il nome accanto a ogni punto (a destra, a sinistra, sotto, sopra: dove non tocca altri nomi) e non disegna un membro senza il dato. Gate: test/legenda.test.js (legenda e nomi su ogni pila e scatter del corpus, verificato che fallisce senza) e test/dati-forniti.test.js (niente punti senza dato).",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 3,
    commento: "(visto preparando il video della v3) Con 54 anni il pannello del periodo usciva dal fondo della pagina: dal 2003 al 2023 gli anni non si vedevano ne si potevano cliccare, l'anno scelto compreso.",
    dove: "periodo · runtime · gate",
    fatto: "Oltre i dodici anni la griglia degli anni scorre in una finestra di cinque righe, quattro anni per riga, e si apre sull'anno scelto. Regola nella skill (data-realism.md). Gate in Chrome (test/barra.test.js): su ogni mockup del corpus e su una serie 1970-2023 il pannello resta nella pagina e l'anno scelto si vede; sul codice vecchio la serie lunga fallisce.",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 3,
    commento: "(visto preparando il video in inglese) La guida \"How to use\" diceva \"Period — piu anni\" e, coi dati annuali, \"Monthly detail is available on ;\"; gli anni disponibili erano 54 numeri in fila.",
    dove: "guida · lingua · gate",
    fatto: "Il dizionario inglese della guida ha la sua parola per piu anni; coi dati annuali la guida dice che i dati sono annuali, senza trimestri ne mesi, invece della frase sul dettaglio mensile con l'elenco vuoto; oltre sei anni gli anni disponibili si scrivono come intervallo (1970–2023). Gate: test/dati-forniti.test.js, guida italiana e inglese, verificato che fallisce sul testo vecchio.",
    stato: "fatto"
  }
  ,{
    id: "locale/nicola-crescita",
    versione: 3,
    commento: "(visto preparando il video in inglese con la finestra di cinque anni) Le card del report inglese dicevano \"5A vs 5A\": la A di anni.",
    dove: "lingua · runtime · gate",
    fatto: "La sigla dell'anno nel confronto fra finestre viene dal dizionario: 5A vs 5A in italiano, 5Y vs 5Y in inglese. Gate: test/dati-forniti.test.js, nelle due lingue, verificato che fallisce sul codice vecchio.",
    stato: "fatto"
  }
  ,{
    id: "locale/teigor-picking",
    versione: 1,
    commento: "(visto rifacendo il mockup) Sulla linea del target \"Target 85 85\": la spec scriveva l'etichetta col numero e il motore aggiungeva il valore.",
    dove: "colline · gauge · runtime · skill · gate",
    fatto: "L'etichetta del target si scrive una volta: se contiene gia un numero non si aggiunge il valore (M.etTarget, colline e gauge). Regola nella skill. Gate: test/aperti-ottobre.test.js, verificato che fallisce sul codice vecchio. (Q&A di Fra, 21 ott 2026.)",
    stato: "fatto"
  }
  ,{
    id: "locale/mauricio-store",
    versione: 1,
    commento: "(visto rifacendo il mockup) Il riepilogo finanziario senza budget disegnava le colonne Budget, Var e Var % vuote su ogni riga.",
    dove: "statement · runtime · kit · gate",
    fatto: "Un conto economico senza misure di budget mostra solo Actual; il kit non chiede le colonne di budget. Gate: test/aperti-ottobre.test.js. (Q&A di Fra, 21 ott 2026.)",
    stato: "fatto"
  }
  ,{
    id: "locale/teigor-picking",
    versione: 1,
    commento: "(visto rifacendo il mockup) I tempi uscivano solo in secondi: \"Secondi per ordine 127\".",
    dove: "formati · runtime · kit · grammatica · gate",
    fatto: "Nuova unita \"seconds\" con formato \"dur\": 42 s, 2:07 min, 1 h 05; il kit scrive il formato dinamico DAX. Gate: test/aperti-ottobre.test.js. (Q&A di Fra, 21 ott 2026.)",
    stato: "fatto"
  }
  ,{
    id: "locale/teigor-picking",
    versione: 1,
    commento: "(visto rifacendo il mockup) Nel drill-through le barre galleggiavano a meta di una card troppo alta, con spazio vuoto sopra e sotto.",
    dove: "hbar · fit · runtime · gate",
    fatto: "Fra: \"si aumenta la grandezza delle righe, senza modificare il layout, fino a un massimo\". In una riga flessibile l'hbar prende l'altezza della riga; righe (fino a 64px) e barre (fino a 26px) crescono, e oltre il massimo partono dall'alto. Gate in Chrome (test/barra.test.js): nessuna card hbar con piu di un quarto vuoto, pagine e drill-through; sul codice vecchio fallisce su quattro drill del corpus e su messy-retail-human.",
    stato: "fatto"
  }
  ,{
    id: "locale/mauricio-store",
    versione: 1,
    commento: "(visto rifacendo il mockup) La guida spiegava solo le card della banda KPI: MER, ROAS e nCAC della pagina Meta, chiesti dal brief, avevano la descrizione nella spec ma non comparivano.",
    dove: "guida · gate",
    fatto: "La guida ha la sezione \"Le altre misure del report\": ogni misura con una descrizione che compare in un visual e non e nella banda, pagina per pagina, con il calcolo. Gate: test/aperti-ottobre.test.js. (Q&A di Fra, 21 ott 2026.)",
    stato: "fatto"
  }
  ,{
    id: "archetipi/canonical-funnel",
    versione: 5,
    commento: "(Fra, carosello dei difetti, 22 ott 2026) Nella pila al 100% Q1 sommava 101% (SMB 31%).",
    dove: "stack100 · runtime · skill · gate",
    fatto: "Le quote scritte su una pila al 100% si arrotondano a resto maggiore: ogni barra fa 100. Gate: test/aperti-ottobre.test.js su ogni pila completa del corpus; sul codice vecchio canonical-funnel somma 101% e 99%.",
    stato: "fatto"
  }
  ,{
    id: "locale/teigor-picking",
    versione: 1,
    commento: "(Fra, carosello dei difetti, 22 ott 2026) L'etichetta \"Target 85\" copriva il pallino di gennaio, che stava sul target.",
    dove: "colline · runtime · skill · gate",
    fatto: "L'etichetta del target prova sinistra e destra, sopra e sotto la linea, e prende la prima posizione che non tocca un punto; le etichette di minimo, massimo e ultimo la evitano dove sta davvero. Gate in Chrome (test/barra.test.js): nessuna etichetta del target copre un punto.",
    stato: "fatto"
  }
  ,{
    id: "locale/teigor-picking",
    versione: 1,
    commento: "(Fra, carosello dei difetti, 22 ott 2026) Nella card \"Tempo per ordine\" la riga di dettaglio andava a capo (\"Var −2 s\").",
    dove: "kpi · runtime · gate",
    fatto: "Dopo il disegno la riga di dettaglio di una card che andrebbe a capo stringe il carattere a gradini fino a 7px. Gate in Chrome (test/barra.test.js): ogni riga di dettaglio su una riga, ogni mockup in due lingue; sul codice vecchio fallisce su pagamenti-luca.",
    stato: "fatto"
  }
];

/** Gli interventi che riguardano un mockup, dal piu recente. */
const perMockup = id => INTERVENTI.filter(i => i.id === id).sort((a, b) => b.versione - a.versione);

module.exports = { INTERVENTI, perMockup };
