/* LA SCHEDA DI INTERAZIONE — cosa si può cliccare, detto a parole.
 *
 * Il problema che chiude: il momento "wow" di questi mockup e cliccare dentro — una fetta che
 * filtra tutto il resto, una riga che apre il dettaglio — e oggi si scopre per caso. Un cliente
 * che riceve il file e lo guarda come un'immagine ha ricevuto meta prodotto.
 *
 * La scheda si GENERA dalla spec, non si scrive a mano: scritta a mano sarebbe vera il giorno
 * che la si scrive e falsa alla prima modifica del report.
 *
 * DOPPIO USO, ed e il punto di questo file: la stessa struttura serve al lettore come prosa
 * ("clicca una fetta per filtrare la piattaforma") e all'harness come PIANO DI PROVA — ogni
 * affermazione della scheda e un'interazione che il test esegue davvero. Cosi la scheda non
 * puo mentire: se dice che una cella e cliccabile e non lo e, il test fallisce.
 */
'use strict';

/* I visual che portano un filtro quando ci si clicca dentro, e il nome della cosa che si
   clicca. Questa tabella e l'unica cosa che il file sa del runtime, ed e verificata dal test:
   `test/scheda.test.js` renderizza e controlla che i data-f ci siano davvero. */
const CLICCABILI = {
  donut: 'una fetta',
  hbar: 'una barra',
  stack100: 'un segmento',
  ribbon: 'un nastro',
  heatmap: 'una cella',
  scatter: 'un punto',
  waterfall: 'una colonna',
  matrix: 'una riga'
};

/* I visual che restano fermi sotto i filtri di periodo, e perche. Non e una dimenticanza: una
   linea a dodici mesi che si accorcia a un mese diventa un punto, e la domanda "come e andato
   l'anno" non ha piu risposta. */
const ESENTI_TIMELINE = { trend: true, colline: true, sparkline: true };

const T = {
  it: {
    titolo: 'Come si usa questo mockup',
    intro: 'Non e un\'immagine: e un report vero, con i dati sintetici. Tutto quello che segue funziona.',
    filtri: 'Filtri',
    periodo: 'Periodo',
    periodoTxt: (liv, anni) => 'In alto il selettore del periodo: ' + liv +
      '. Anni disponibili: ' + anni.join(', ') + '.',
    finestraTxt: (mens) => 'Puoi guardare piu anni insieme: "Quanti anni" allarga la ' +
      'selezione all\u2019indietro a partire dall\u2019anno scelto, e tutta la pagina — numeri, ' +
      'confronto col periodo precedente, grafici — si aggiorna sull\u2019intervallo. Il ' +
      'confronto diventa intervallo su intervallo: tre anni contro i tre precedenti. ' +
      'Il dettaglio mensile e disponibile su ' + mens.join(', ') +
      '; sugli anni piu vecchi il report ragiona per anno e i controlli di trimestre e mese ' +
      'si nascondono, invece di offrire una scelta che il dato non ha.',
    dimTxt: (lab, n, ctrl) => lab + ' — ' + n + (n === 1 ? ' voce' : ' voci') +
      (ctrl === 'dropdown' ? ', a tendina' : ', in elenco') +
      '. Seleziona una voce e tutta la pagina si aggiorna; riselezionala per togliere il filtro.',
    cross: 'Cliccare dentro i grafici',
    crossTxt: (cosa, tit, dim) => 'In "' + tit + '" clicca ' + cosa + ' per filtrare ' + dim +
      ' su tutto il resto della pagina.',
    drill: 'Scendere nel dettaglio',
    /* niente articolo davanti al nome della dimensione: "di quel Rotta" e sbagliato, e il
       genere dell'etichetta non lo sa nessuno — la scrive il cliente nel suo brief */
    drillTxt: (tit, dim) => 'In "' + tit + '" ogni riga apre la pagina di dettaglio della voce ' +
      'scelta (' + dim + '): clicca la riga col tasto destro, e torni indietro col tasto in ' +
      'alto a sinistra.',
    esenti: 'Cosa NON segue i filtri di periodo, e perche',
    esentiTxt: (tit) => '"' + tit + '" mostra sempre i dodici mesi dell\'anno scelto, anche ' +
      'quando selezioni un trimestre o un mese: si evidenzia il periodo scelto invece di ' +
      'accorciare la linea, perche una linea di un mese solo e un punto.',
    fermi: 'Cosa non e interattivo',
    fermiTxt: (elenco, uno) => elenco + (uno ? ': si aggiorna' : ': si aggiornano') +
      ' con i filtri e mostra' + (uno ? '' : 'no') + ' il valore al passaggio del mouse, ma non ' +
      'si clicca dentro per filtrare.',
    reset: 'Azzerare',
    resetTxt: 'Il tasto "Azzera filtri" riporta tutto allo stato iniziale.',
    pagine: 'Pagine',
    pagineTxt: (n) => 'Il report ha ' + n + ' pagine: si passa da una all\'altra dalla navigazione.'
  },
  en: {
    titolo: 'How to use this mockup',
    intro: 'This is not a picture: it is a working report on synthetic data. Everything below works.',
    filtri: 'Filters',
    periodo: 'Period',
    periodoTxt: (liv, anni) => 'The period selector sits at the top: ' + liv +
      '. Years available: ' + anni.join(', ') + '.',
    finestraTxt: (mens) => 'You can look at several years at once: "How many years" widens the ' +
      'selection backwards from the chosen year, and the whole page — figures, prior-period ' +
      'comparison, charts — follows the interval. Monthly detail is available on ' +
      mens.join(', ') + '; older years are read by year, and the quarter and month controls ' +
      'hide instead of offering a choice the data no longer has.',
    dimTxt: (lab, n, ctrl) => lab + ' — ' + n + (n === 1 ? ' item' : ' items') +
      (ctrl === 'dropdown' ? ', dropdown' : ', list') +
      '. Pick one and the whole page updates; pick it again to clear.',
    cross: 'Clicking inside the charts',
    cliccabili: { donut: 'a slice', hbar: 'a bar', stack100: 'a segment', ribbon: 'a ribbon', heatmap: 'a cell',
      scatter: 'a point', waterfall: 'a column', matrix: 'a row' },
    crossTxt: (cosa, tit, dim) => 'In "' + tit + '" click ' + cosa + ' to filter ' + dim +
      ' across the rest of the page.',
    drill: 'Drilling down',
    drillTxt: (tit, dim) => 'In "' + tit + '" every row opens the detail page for that ' + dim +
      ': click the row (or right-click) and come back with the button at the top left.',
    esenti: 'What does NOT follow the period filters, and why',
    esentiTxt: (tit) => '"' + tit + '" always shows the twelve months of the selected year, ' +
      'even when a quarter or a month is picked: the selection is highlighted instead of ' +
      'shortening the line, because a one-month line is a dot.',
    fermi: 'What is not clickable',
    fermiTxt: (elenco, uno) => elenco + ': ' + (uno ? 'it updates' : 'they update') +
      ' with the filters and show' + (uno ? 's' : '') + ' values on hover, but you do not click ' +
      'inside to filter.',
    reset: 'Reset',
    resetTxt: 'The "Reset filters" button puts everything back to the initial state.',
    pagine: 'Pages',
    pagineTxt: (n) => 'The report has ' + n + ' pages: switch between them from the navigation.'
  }
};

const lingua = spec => ((spec.meta || {}).locale || 'it-IT').slice(0, 2) === 'en' ? 'en' : 'it';

const LIVELLI = {
  it: { year: 'anno', quarter: 'trimestre', month: 'mese' },
  en: { year: 'year', quarter: 'quarter', month: 'month' }
};

/* I titoli della spec portano i segnaposto che il runtime risolve a schermo ({y}, {py}...).
   Una scheda che li lascia grezzi — "Coperti per mese — {y} vs {py}" — o che li cancella a
   forza — "Coperti per mese —  vs" — non e la scheda di quel report: e la sua spec letta ad
   alta voce. Si risolvono con lo stesso stato iniziale che vede chi apre il file. */
function risolviTitolo(spec, s) {
  const d = (spec.filters && spec.filters.date && spec.filters.date.default) || {};
  const y = d.y || (spec.filters && spec.filters.date && spec.filters.date.levels ? 0 : 0);
  const basis = d.m !== null && d.m !== undefined ? 'MoM' : 'YoY';
  return String(s)
    .replace(/\{y\}/g, y).replace(/\{py\}/g, y - 1)
    .replace(/\{basis\}/g, basis).replace(/\{period\}/g, String(y))
    .replace(/\{drill\}/g, '').replace(/\s{2,}/g, ' ').trim();
}

/** Tutti i visual di tutte le pagine, con la pagina di appartenenza. */
function visuali(spec) {
  const out = [];
  (spec.pages || []).forEach(pg => (pg.rows || []).forEach(r => (r.visuals || []).forEach(v =>
    out.push({ pg, v }))));
  const dp = spec.drill && spec.drill.page;
  if (dp) (dp.rows || []).forEach(r => (r.visuals || []).forEach(v => out.push({ pg: dp, v, drill: true })));
  return out;
}

/**
 * IL PIANO: la scheda come struttura. E' cio che l'harness esegue e cio da cui nasce la prosa.
 * Ogni voce porta il SELETTORE con cui si raggiunge l'elemento, perche una dichiarazione che
 * non si puo mettere alla prova non e una dichiarazione, e una promessa.
 */
function piano(spec, data) {
  const dims = (data && data.dims) || {};
  const P = {
    filtri: (spec.filters.dims || []).map(fd => ({
      dim: fd.id, label: fd.label || fd.id, control: fd.control || 'list',
      membri: (dims[fd.id] || []).map(m => ({ id: m.id, n: m.n, sel: `[data-f="${fd.id}:${m.id}"]` }))
    })),
    data: {
      livelli: (spec.filters.date || {}).levels || [],
      anni: (data && data.years) || [],
      /* Gli anni a grana mensile: fuori da questi il selettore del mese non c'e, e il piano
         di prova non deve cercarlo (test/interazione.js lo legge da qui). */
      mensili: (data && data.mensili) || (data && data.years) || [],
      /* la finestra esiste solo dove la storia e lunga: sotto i tre anni il controllo non
         viene nemmeno emesso, e prometterlo nella scheda sarebbe una bugia stampata */
      finestra: (((data && data.years) || []).length > 2)
        ? { sel: '#slSpan [data-span]', ampiezze: '#slSpan .slchip' } : null,
      sel: { apri: '#slBtn', anno: '#slYear [data-y]', trimestre: '#slQtr [data-q]', mese: '#slMon [data-m]' }
    },
    cross: [], drill: [], esenti: [], fermi: [], reset: '#btnReset',
    pagine: (spec.pages || []).map(p => ({ id: p.id, titolo: p.title, nav: p.nav }))
  };

  visuali(spec).forEach(({ pg, v, drill }) => {
    const b = v.bind || {}, tit = risolviTitolo(spec, v.title || v.type);
    /* Si dichiara cliccabile solo cio che puo davvero filtrare: una dimensione senza un
       controllo che la governi non e filtrabile, e prometterlo nella scheda sarebbe la stessa
       bugia del filtro decorativo, scritta in italiano. */
    /* Quale dimensione filtra il clic: quella della barra, oppure — in una lista di dettaglio —
       la sua dimensione PADRE, che e l'unica che il report sa governare. Nominare la dimensione
       sbagliata manderebbe il lettore a cercare un filtro che non esiste. */
    const filtrata = (spec.filters.dims || []).some(f => f.id === b.dim) ? b.dim
      : ((spec.filters.dims || []).some(f => f.id === b.parent) ? b.parent : null);
    if (CLICCABILI[v.type] && filtrata) {
      P.cross.push({ page: pg.id, tipo: v.type, cosa: CLICCABILI[v.type], titolo: tit, dim: filtrata,
        sel: `[data-f^="${filtrata}:"]`, drillPage: !!drill });
    } else if (!ESENTI_TIMELINE[v.type]) {
      P.fermi.push({ page: pg.id, tipo: v.type, titolo: tit });
    }
    if (ESENTI_TIMELINE[v.type]) P.esenti.push({ page: pg.id, tipo: v.type, titolo: tit });
    if (v.type === 'matrix' && b.drill !== false && spec.drill) {
      P.drill.push({ page: pg.id, titolo: tit, dim: b.dim, sel: '[data-drill]' });
    }
  });
  return P;
}

/** La scheda a parole, nella lingua del report. */
function testo(spec, data) {
  const P = piano(spec, data), L = T[lingua(spec)];
  const dimLabel = d => {
    const fd = (spec.filters.dims || []).filter(f => f.id === d)[0];
    return (fd && (fd.label || fd.id)) || d;
  };
  const s = [];
  s.push('# ' + L.titolo, '', L.intro, '');

  s.push('## ' + L.filtri, '');
  const LV = LIVELLI[lingua(spec)];
  s.push('- **' + L.periodo + '.** ' + L.periodoTxt(P.data.livelli.map(l => LV[l] || l).join(' › '), P.data.anni));
  if (P.data.finestra) s.push('- **' + L.periodo + ' — ' + (L.piuAnni || 'piu anni') + '.** ' +
    L.finestraTxt(P.data.mensili));
  P.filtri.forEach(f => s.push('- **' + f.label + '.** ' + L.dimTxt(f.label, f.membri.length, f.control)));
  s.push('- ' + L.resetTxt, '');

  if (P.cross.length) {
    s.push('## ' + L.cross, '');
    /* il nome della cosa da cliccare e nella lingua del report: "click una riga" in un report
       inglese e stato il primo difetto segnalato da un tester esterno sulla scheda */
    P.cross.forEach(c => s.push('- ' + L.crossTxt(L.cliccabili ? (L.cliccabili[c.tipo] || c.cosa) : c.cosa, c.titolo, dimLabel(c.dim))));
    s.push('');
  }
  if (P.drill.length) {
    s.push('## ' + L.drill, '');
    P.drill.forEach(d => s.push('- ' + L.drillTxt(d.titolo, dimLabel(d.dim))));
    s.push('');
  }
  if (P.esenti.length) {
    s.push('## ' + L.esenti, '');
    /* una volta sola per titolo: due trend con lo stesso nome non meritano due righe uguali */
    [...new Set(P.esenti.map(e => e.titolo))].forEach(t => s.push('- ' + L.esentiTxt(t)));
    s.push('');
  }
  if (P.fermi.length) {
    const nomi = [...new Set(P.fermi.map(f => '"' + f.titolo + '"'))];
    s.push('## ' + L.fermi, '', '- ' + L.fermiTxt(nomi.join(', '), nomi.length === 1), '');
  }
  if (P.pagine.length > 1) s.push('## ' + L.pagine, '', '- ' + L.pagineTxt(P.pagine.length), '');
  return s.join('\n').trim() + '\n';
}

/** La stessa scheda come pannello dentro il file: e l'unico modo in cui il cliente la riceve. */
function pannello(spec, data, esc) {
  const L = T[lingua(spec)];
  const md = testo(spec, data);
  const html = md.split('\n').map(r => {
    if (r.startsWith('# ')) return '<h3>' + esc(r.slice(2)) + '</h3>';
    if (r.startsWith('## ')) return '<h4>' + esc(r.slice(3)) + '</h4>';
    if (r.startsWith('- ')) {
      return '<p>' + esc(r.slice(2)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') + '</p>';
    }
    return r.trim() ? '<p class="in">' + esc(r) + '</p>' : '';
  }).join('');
  return {
    bottone: `<button class="resetb howb" id="btnHow">${esc(L.titolo)}</button>`,
    pannello: `<div id="howp"><div class="howin">${html}<button class="resetb" id="btnHowX">OK</button></div></div>`
  };
}

module.exports = { piano, testo, pannello, CLICCABILI, ESENTI_TIMELINE };
