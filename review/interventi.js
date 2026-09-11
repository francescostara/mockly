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
  }
];

/** Gli interventi che riguardano un mockup, dal piu recente. */
const perMockup = id => INTERVENTI.filter(i => i.id === id).sort((a, b) => b.versione - a.versione);

module.exports = { INTERVENTI, perMockup };
