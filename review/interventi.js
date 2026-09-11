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
    id: 'archetipi/canonical-funnel', versione: 1,
    commento: 'Nel "Dal lead al contratto" non si leggono bene le categorie se le barre sono ' +
      'piccole. In "Win rate per fonte" e "Composizione delle vinte per segmento" c\'e molto ' +
      'spazio a sinistra, le visual andrebbero centrate od occupare piu spazio dentro al box.',
    dove: 'funnel · hbar · stack100',
    fatto: 'Il funnel misura il nome e il valore prima di scriverli dentro la barra: se non ' +
      'ci stanno escono a destra, in inchiostro invece che in bianco. Le colonne delle ' +
      'etichette di hbar, stack100 e heatmap non sono piu una frazione fissa della card ma la ' +
      'larghezza delle etichette vere — con nomi corti come "Ads" o "Q1" il 42% riservato ' +
      'lasciava vuoto un terzo del grafico.',
    stato: 'fatto'
  },
  {
    id: 'archetipi/canonical-executive-summary', versione: 1,
    commento: 'Il gauge non entra bene nel riquadro.',
    dove: 'gauge',
    fatto: 'Il raggio non era piu una frazione scelta a occhio ma si ricava dallo spazio: un ' +
      'arco ha uno SPESSORE che sporge di meta oltre il raggio, e il bordo superiore finiva ' +
      'sette pixel sopra la card — tagliato. Ora il raggio si risolve dai vincoli (sta dentro ' +
      'in larghezza e in altezza, lasciando posto all\'etichetta del bersaglio) e un gate ' +
      'verifica che nessun arco esca dal riquadro, tratto compreso.',
    stato: 'fatto'
  },
  {
    id: 'locale/trasporti-verona', versione: 1,
    commento: 'Il filtro dell\'anno non e allineato rispetto agli altri filtri.',
    dove: 'barra dei filtri · slicer data',
    fatto: 'Sulla shell con la rail stretta esistono insieme la rail E la barra dei filtri, ' +
      'quindi il motore emetteva entrambi i fogli di stile — e il padding pensato per la ' +
      'colonna verticale finiva addosso al selettore del periodo, rendendolo alto 48px dentro ' +
      'una banda da 40 e spostandolo in su rispetto agli altri. Le due regole della rail ora ' +
      'sono agganciate alla rail (#rail .slgrp), e il selettore ha la stessa altezza e la ' +
      'stessa base degli altri filtri.',
    stato: 'fatto'
  },
  {
    id: 'locale/scuola-online', versione: 1,
    commento: '"Ritenzione per coorte e trimestre" non e molto chiaro, servirebbe piu ' +
      'gradazione dei colori o inserire qualche numero all\'interno per renderlo piu chiaro. ' +
      'In questo caso dato che si analizza il trimestre aggiungerei uno spazio per vedere i ' +
      'trend stagionali.',
    dove: 'heatmap',
    fatto: 'Cinque gradini invece di tre, presi dai quintili dei valori osservati, e il NUMERO ' +
      'scritto dentro ogni cella dove ci sta. La rampa si costruisce velando una tinta sola a ' +
      'intensita crescente, cosi la scala di chiarezza e monotona per costruzione e si legge ' +
      'anche in stampa; l\'inchiostro della cifra si sceglie misurando il contrasto sul ' +
      'gradino piu carico. Resta aperta la richiesta dello spazio per i trend stagionali: e ' +
      'un visual in piu nella pagina, non una correzione della heatmap.',
    stato: 'fatto'
  },

  /* ---------------------------------------------------------------- secondo giro (v1 e v2) */
  {
    id: 'banco/ribbon-sorpasso', versione: 1,
    commento: 'Tutti i filtri non funzionano. La tabella ha un sacco di spazio vuoto sotto. La ' +
      'dashboard non da indicazioni precise, manca un\'altra pagina secondo me. Il ribbon chart ' +
      'non e centrato e il testo dei data values non e chiaro.',
    dove: 'ribbon · tabella · pagina',
    fatto: 'I filtri funzionavano: non funzionava il BERSAGLIO. Il clic stava su una fascetta ' +
      'di dieci pixel a ogni periodo, e su un grafico largo cinquecento pixel il novanta per ' +
      'cento della superficie non rispondeva — chi clicca il nastro, che e la cosa grande e ' +
      'colorata, conclude giustamente che i filtri sono finti. Ora e il nastro a portare il ' +
      'filtro. I margini laterali del ribbon contengono meta etichetta, quindi i valori del ' +
      'primo e dell\'ultimo periodo non escono piu dal riquadro. La tabella riempie la sua ' +
      'card. Resta aperta la seconda pagina: e una scelta di contenuto, non una correzione.',
    stato: 'fatto'
  },
  {
    id: 'eval/ecommerce-retail', versione: 1,
    commento: 'Le cornici delle visuals a destra non sono allineate. Nel "Net sales by month" ' +
      'la riga del return rate ha la legenda lontana rispetto alla riga stessa e non si capisce ' +
      'subito a cosa fa riferimento. Nel grafico a torta c\'e spazio a sinistra e poco margine ' +
      'a destra.',
    dove: 'griglia · donut',
    fatto: 'Il bordo destro era a scalini e la causa era seria: in pagina densa il foglio di ' +
      'stile stringe il gutter a 8px, ma le larghezze delle card le calcolava il runtime dal ' +
      'gutter della spec, rimasto a 12. Le quattro righe finivano a 1244, 1256, 1256 e 1260. ' +
      'Ora la pagina densa riscrive il gutter anche per le larghezze, e un gate lo verifica ' +
      'col numero che il CSS usa davvero. Il donut ha un cuscinetto costante da entrambe le ' +
      'parti e l\'anello si centra nello spazio che gli resta. Resta aperta la legenda del ' +
      'return rate lontana dalla sua linea.',
    stato: 'fatto'
  },
  {
    id: 'banco/gauge-quota', versione: 1,
    commento: 'Il gauge win rate ha il commento del trattino benchmark in cui si vede a meta ' +
      'il testo. Inoltre c\'e molto spazio sotto la tabella.',
    dove: 'gauge · tabella',
    fatto: 'L\'etichetta del bersaglio segue la tacca, e la tacca puo stare in cima all\'arco: ' +
      'li la riga di base finiva a cinque pixel dal bordo e il testo usciva mezzo tagliato. Ora ' +
      'la riga di base non puo salire sopra l\'altezza del carattere e l\'ancora si sceglie da ' +
      'dove sta la tacca. La tabella riempie la card.',
    stato: 'fatto'
  },
  {
    id: 'archetipi/canonical-operational', versione: 1,
    commento: 'Inserirei per esempio in un caso del genere anche una analisi sui clienti per ' +
      'giorno per analizzare anche i giorni della settimana con piu clienti, non solo le parti ' +
      'del giorno. Nel gauge il target non e ben visibile e servirebbe piu contrasto.',
    dove: 'gauge · contenuto',
    fatto: 'La tacca del bersaglio ha ora un alone del colore della superficie sotto di se: ' +
      'stacca sia dall\'arco sia dal fondo, qualunque palette ci sia, e l\'etichetta e in ' +
      'inchiostro pieno invece che in grigio. L\'analisi per giorno della settimana e una ' +
      'richiesta di contenuto: va decisa insieme, perche significa un visual in piu.',
    stato: 'fatto'
  },
  {
    id: 'archetipi/canonical-quadrants', versione: 1,
    commento: 'C\'e molto spazio vuoto sotto la tabella. occupiamo tutto lo spazio della ' +
      'dashboard quando possibile.',
    dove: 'tabella',
    fatto: 'La tabella riempie la sua card: lo spazio in piu va alle righe, che diventano piu ' +
      'comode da leggere, invece di restare un rettangolo bianco in fondo. E cio che fa una ' +
      'tabella in Power BI quando la si allarga.',
    stato: 'fatto'
  },
  {
    id: 'banco/delta-margine', versione: 1,
    commento: 'Rendi le tabelle ordinabili manualmente tramite click sulla colonna come in pbi',
    dove: 'matrice',
    fatto: 'Ogni intestazione si clicca e ordina: primo clic dal piu alto (dalla A per i nomi), ' +
      'secondo clic inverte, e la freccia dice quale colonna comanda. L\'ordine si tiene per ' +
      'COLONNA e non per misura, perche due colonne possono legare la stessa misura — il valore ' +
      'e la sua variazione — e "ordina per ricavi" sarebbe ambiguo. Si azzera col resto.',
    stato: 'fatto'
  },
  {
    id: 'banco/concentrazione', versione: 1,
    commento: 'La sezione del grafico a torta necessita piu lavoro. Potresti per esempio far ' +
      'uscire leggermente la fetta con "Altri" in maniera tale che sia piu chiaro (o far uscire ' +
      'i top 3 clienti). Inoltre sempre qua c\'e molto spazio a sinistra e poco margine a ' +
      'destra. Lavora su centrare i grafici e mantenere un po\' di margine.',
    dove: 'donut',
    fatto: 'Cuscinetto costante da entrambe le parti e anello centrato nello spazio che gli ' +
      'resta, invece della frazione fissa che lo spingeva a sinistra lasciando quattro pixel a ' +
      'destra. La fetta staccata resta da fare: e una scelta di disegno che vale la pena fare ' +
      'insieme, perche cambia la lettura del visual.',
    stato: 'fatto'
  },
  {
    id: 'banco/immobiliare', versione: 1,
    commento: 'Le cornici dei grafici a destra non sono allineate, errore grave. Il ribbon ' +
      'chart e ottimo e funziona bene coi filtri, Ma i valori non si leggono bene, specialmente ' +
      'a sinistra e destra, inoltre il grafico non e centrato ha spazio a destra e poco margine ' +
      'a sinistra.',
    dove: 'griglia · ribbon',
    fatto: 'Stessa causa del bordo a scalini di ecommerce-retail: gutter del CSS e gutter delle ' +
      'larghezze non erano lo stesso numero in pagina densa. Il ribbon ha margini laterali ' +
      'simmetrici, calcolati per contenere meta etichetta: i valori del primo e dell\'ultimo ' +
      'periodo restano dentro.',
    stato: 'fatto'
  },
  {
    id: 'eval/social-monthly', versione: 1,
    commento: 'I colori dei social non sono corretti. Non c\'e da nessuna parte un kpi per le ' +
      'pubblicazioni o un rapport con queste. Come possiamo sapere se va bene o no se non c\'e ' +
      'un indicatore di quanto hanno pubblicato su un social in un periodo?',
    dove: 'colori · modello dati',
    fatto: 'I colori sono tornati quelli veri delle piattaforme, dichiarati `brand: true` — la ' +
      'tinta qui e l\'identita, ed e l\'unica eccezione ammessa alla scala verificata. Le ' +
      'PUBBLICAZIONI entrano nel modello: KPI nella banda, colonna in tabella, e soprattutto la ' +
      'reach per pubblicazione, che e la misura che rende la domanda rispondibile — senza, ' +
      '"reach +12%" puo essere una redazione che lavora meglio o una che pubblica il doppio. ' +
      'Aggiunto anche il CPM in tabella.',
    stato: 'fatto'
  },
  {
    id: 'eval/messy-retail-human', versione: 1,
    commento: 'Il mix per categoria ha poco margine a destra.',
    dove: 'donut',
    fatto: 'Cuscinetto costante di dodici pixel da entrambe le parti; la legenda non arriva ' +
      'piu a quattro pixel dal bordo.',
    stato: 'fatto'
  },
  {
    id: 'banco/filtro-organico', versione: 1,
    commento: 'Il grafico a torta ha poco margine a destra. Inoltre mancano degli indicatori ' +
      'almeno in tabella come il cpm medio per esempio. Inoltre potresti includere il numero di ' +
      'pubblicazioni.',
    dove: 'donut · modello dati',
    fatto: 'Margine del donut sistemato con la stessa regola. Il CPM e le pubblicazioni sono ' +
      'stati aggiunti al report social (eval/social-monthly); qui restano da portare, ed e un ' +
      'lavoro sul modello dati di questo caso, non sul motore.',
    stato: 'parziale'
  },

  /* ---- i commenti sulla VERSIONE 2, cioe sulle correzioni stesse ---- */
  {
    id: 'archetipi/canonical-executive-summary', versione: 2,
    commento: 'Nel gauge il target non e chiaro visivamente, serve piu contrasto',
    dove: 'gauge',
    fatto: 'Sotto la tacca del bersaglio corre ora una seconda linea del colore della ' +
      'superficie, piu spessa: fa da alone e la stacca sia dall\'arco colorato sia dal fondo, ' +
      'qualunque palette ci sia sotto. La tacca e piu spessa e l\'etichetta e in inchiostro ' +
      'pieno invece che in grigio.',
    stato: 'fatto'
  },
  {
    id: 'archetipi/canonical-funnel', versione: 2,
    commento: 'Ok hai risolto il problema, pero manteniamo sempre un po\' di cuscinetto tra ' +
      'lato dx e sx',
    dove: 'donut · ribbon · funnel',
    fatto: 'Il cuscinetto e diventato una regola invece di un caso: dodici pixel costanti da ' +
      'entrambe le parti nel donut, con l\'anello centrato nello spazio che gli resta; margini ' +
      'simmetrici nel ribbon, calcolati per contenere meta etichetta. Il funnel li aveva gia, e ' +
      'quando il nome esce a destra della barra resta dentro il riquadro.',
    stato: 'fatto'
  },
  {
    id: 'locale/scuola-online', versione: 2,
    commento: 'In questo caso dato che si analizza il trimestre aggiungerei uno spazio per ' +
      'vedere i trend stagionali. Inoltre rendi le tabelle sempre ordinabili in base alla ' +
      'colonna con un click come se fosse in power bi',
    dove: 'matrice · contenuto',
    fatto: 'Le tabelle si ordinano cliccando l\'intestazione, in tutti i mockup: primo clic dal ' +
      'piu alto, secondo inverte, e la freccia dice quale colonna comanda. Lo spazio per i ' +
      'trend stagionali resta aperto: e un visual in piu nella pagina, e la pagina e piena — ' +
      'va deciso cosa esce.',
    stato: 'parziale'
  }
];

/** Gli interventi che riguardano un mockup, dal piu recente. */
const perMockup = id => INTERVENTI.filter(i => i.id === id).sort((a, b) => b.versione - a.versione);

module.exports = { INTERVENTI, perMockup };
