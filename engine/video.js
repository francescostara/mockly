/* LA SCENEGGIATURA DEL VIDEO — ricavata dalla scheda di interazione, non scritta a mano.
 *
 * Un mockup si capisce cliccandoci dentro, e uno screenshot non lo dice. Questo modulo decide
 * COSA mostrare in un video di trenta secondi: quale grafico cliccare, quale periodo scegliere,
 * dove scendere nel dettaglio, quando azzerare.
 *
 * La sorgente e `scheda.piano(spec, data)`, la stessa che genera la scheda dentro il file e il
 * piano di prova dell'harness. E' gia la dichiarazione di cosa e cliccabile e cosa filtra:
 * scrivere una sceneggiatura a mano per ogni mockup significherebbe avere una seconda verita
 * che invecchia da sola. Se domani un visual smette di essere cliccabile, la scheda lo sa e il
 * video cambia con lei.
 *
 * LA DIVISIONE DEI COMPITI, decisa dall'autore: nella scheda cio che e vero del MOCKUP, qui cio
 * che e vero della RIPRESA. "Questo visual filtra" e del mockup e sta nella scheda, che ha un
 * lettore preciso — il cliente che riceve il file. "Filmiamo prima i donut perche si leggono
 * meglio" e della ripresa e sta qui: metterlo nella scheda inquinerebbe un documento con un
 * destinatario chiaro, e creerebbe la seconda verita che si e evitata per la sceneggiatura.
 *
 * Qui non si tocca il browser: si producono PASSI dichiarativi, e il driver (scripts/video.js)
 * li esegue. Cosi la sceneggiatura si prova in jsdom, senza registrare niente.
 *
 * FORMATO DI UN PASSO
 *   tipo      'pausa' · 'pagina' · 'clic' · 'destro' · 'periodo' · 'indietro' · 'reset'
 *   sel       selettore CSS del bersaglio (assente per 'pausa')
 *   dentro    titolo della card in cui cercarlo, quando il selettore da solo non basta
 *   pagina    la pagina su cui deve stare il mockup perche il passo abbia senso
 *   etichetta una riga in italiano che dice cosa sta succedendo (per il registro, non a video)
 *   attesa    quanto restare fermi DOPO il passo, in ms a velocita 1
 */
'use strict';

const SCHEDA = require('./scheda.js');

/* LA PAUSA E' PROPORZIONALE A QUANTI NUMERI CAMBIANO. Non e una preferenza di ritmo: e quanto
   serve all'occhio. Un clic su una fetta muove qualche KPI e un secondo basta; l'azzeramento e
   il cambio di trimestre RIDISEGNANO la pagina intera, e sotto i due secondi il lettore vede
   uno sfarfallio invece di un cambiamento. Per accorciare un video non si accorciano le pause:
   si tolgono passi (vedi FEED). */
const ATTESE = { apertura: 1400, clic: 1100, periodo: 2100, drill: 2000, indietro: 1600, pagina: 1600, reset: 2100, fine: 1200 };

/* La versione per il feed: tre passi soli. LinkedIn decide nei primi tre secondi, e li deve
   esserci un clic che filtra; chi resta guarda il resto. Il video lungo resta per chi lo chiede. */
const FEED = ['filtro', 'drill', 'reset'];

/* I visual che si leggono meglio in un video: una fetta o una barra che si accende dicono
   "ho filtrato" in un colpo d'occhio, una riga di tabella molto meno. */
const PREFERENZA = { donut: 5, hbar: 4, stack100: 4, ribbon: 3, heatmap: 3, scatter: 2, waterfall: 2, matrix: 1 };

const PASSI_NOTI = ['filtro', 'periodo', 'drill', 'reset'];

/** Il titolo della pagina nel navigatore: serve al passo che cambia pagina. */
const selPagina = id => '.navbtn[data-page="' + id + '"]';

/**
 * Costruisce la sceneggiatura.
 * @param spec, data  gli stessi che si passano a render()
 * @param opt.passi   quali blocchi includere, fra PASSI_NOTI (default: tutti)
 */
function sceneggiatura(spec, data, opt) {
  const o = opt || {};
  const passi = (o.passi && o.passi.length ? o.passi : PASSI_NOTI).filter(p => PASSI_NOTI.indexOf(p) >= 0);
  const P = SCHEDA.piano(spec, data);
  const prima = (spec.pages[0] || {}).id;
  const s = [];
  const agg = (x) => { s.push(Object.assign({ pagina: prima }, x)); return s[s.length - 1]; };

  /* 1. il mockup fermo: si vede l'insieme prima che succeda qualcosa */
  agg({ tipo: 'pausa', etichetta: 'il mockup fermo, si vede l\'insieme', attesa: ATTESE.apertura });

  /* 2. il cross-filter: si sceglie il visual piu leggibile della prima pagina */
  const cross = P.cross.filter(c => c.page !== '__drill__');
  /* un clic in un grafico FILTRA gli altri visual (la regola di Power BI, 4 ott 2026): se filtrasse
     la dimensione della tabella che il video apre col tasto destro, la tabella resterebbe con una
     riga sola — o nessuna, cambiato il periodo. Si preferisce un clic su un'altra dimensione. */
  const dimDrill = (P.drill[0] || {}).dim;
  const ordinati = cross.slice().sort((a, b) => (PREFERENZA[b.tipo] || 0) - (PREFERENZA[a.tipo] || 0));
  const scelto = ordinati.filter(c => !dimDrill || c.dim !== dimDrill)[0] || ordinati[0];
  if (passi.indexOf('filtro') >= 0 && scelto) {
    if (scelto.page !== prima) agg({ tipo: 'pagina', sel: selPagina(scelto.page), pagina: prima,
      etichetta: 'vai alla pagina "' + scelto.page + '"', attesa: ATTESE.pagina });
    agg({ tipo: 'clic', sel: scelto.sel, dentro: scelto.titolo, pagina: scelto.page,
      etichetta: 'clicca ' + scelto.cosa + ' in "' + scelto.titolo + '": filtra ' + scelto.dim,
      attesa: ATTESE.clic });
  }

  /* 3. il periodo: e il filtro che tocca tutto tranne cio che e dichiarato esente, ed e la
     prova piu convincente che il mockup e vivo e non un'immagine */
  const liv = (P.data.livelli || []);
  if (passi.indexOf('periodo') >= 0 && liv.indexOf('quarter') >= 0) {
    const pag = (s[s.length - 1] || {}).pagina || prima;
    /* il selettore del periodo e dichiarato dalla scheda: si apre e si sceglie il terzo trimestre */
    agg({ tipo: 'periodo', sel: P.data.sel.apri, bersaglio: P.data.sel.trimestre.replace('[data-q]', '[data-q="2"]'),
      pagina: pag, etichetta: 'apri il periodo e scegli il terzo trimestre', attesa: ATTESE.periodo });
  }

  /* 4. il drill: tasto destro su una riga, si apre la pagina di dettaglio, poi si torna */
  const dr = P.drill[0];
  if (passi.indexOf('drill') >= 0 && dr) {
    if (dr.page !== (s[s.length - 1] || {}).pagina) agg({ tipo: 'pagina', sel: selPagina(dr.page),
      pagina: (s[s.length - 1] || {}).pagina, etichetta: 'vai alla pagina "' + dr.page + '"', attesa: ATTESE.pagina });
    agg({ tipo: 'destro', sel: dr.sel, dentro: dr.titolo, pagina: dr.page,
      etichetta: 'tasto destro su una riga di "' + dr.titolo + '": apre il dettaglio', attesa: ATTESE.drill });
    agg({ tipo: 'indietro', sel: '#btnBack', pagina: dr.page, etichetta: 'torna indietro', attesa: ATTESE.indietro });
  }

  /* 5. l'azzeramento: chiude il giro e mostra che si torna sempre al punto di partenza */
  if (passi.indexOf('reset') >= 0) {
    agg({ tipo: 'reset', sel: P.reset, pagina: (s[s.length - 1] || {}).pagina || prima,
      etichetta: 'azzera i filtri', attesa: ATTESE.reset });
  }
  /* si chiude dove si e cominciato: un video che finisce su una pagina interna sembra tagliato */
  if (((s[s.length - 1] || {}).pagina || prima) !== prima) agg({ tipo: 'pagina', sel: selPagina(prima),
    pagina: s[s.length - 1].pagina, etichetta: 'torna alla prima pagina', attesa: ATTESE.pagina });
  agg({ tipo: 'pausa', pagina: prima, etichetta: 'l\'ultima inquadratura', attesa: ATTESE.fine });
  return s;
}

/** Quanto dura il video, in secondi, a una data velocita: serve per dirlo prima di registrare. */
function durata(passi, velocita) {
  const v = velocita || 1;
  /* ogni passo con un bersaglio porta con se il movimento del cursore e la pausa prima del clic */
  const movimento = passi.filter(p => p.sel).length * (950 + 260);
  return Math.round((passi.reduce((a, p) => a + p.attesa, 0) + movimento) / v) / 1000;
}

module.exports = { sceneggiatura, durata, PASSI_NOTI, FEED, ATTESE, selPagina };
