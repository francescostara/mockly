/* LA DOTTRINA DEL BOOKMARK — quando una card puo ospitare piu viste, e quando non deve.
 *
 * Il bookmark e potente e per questo pericoloso: risolve il problema piu comune di un report
 * — "servirebbe un altro grafico e non c'e posto" — al prezzo di NASCONDERE qualcosa. Ogni
 * vista che non e la prima e una cosa che il lettore vedra solo se clicca, e in un mockup che
 * qualcuno guarda per dieci secondi vale come se non ci fosse.
 *
 * Da qui la regola che governa tutto il file: UNA CARD A PIU VISTE DEVE DICHIARARE PERCHE.
 * Non e burocrazia — e il modo in cui si distingue il bookmark che risolve un problema reale
 * dal bookmark messo "perche si puo", che e il modo tipico in cui i report di Power BI
 * diventano cacce al tesoro. Un contenitore senza `motivo` viene rifiutato dal motore.
 *
 * I TRE MOTIVI AMMESSI, e non altri:
 *
 *   due-lenti          la stessa cosa guardata con due metriche che si contraddicono a
 *                      vicenda — ricavo e margine, volume e prezzo medio, iscritti e
 *                      abbandoni. E' il caso classico: il fatturato per prodotto e il margine
 *                      per prodotto rispondono alla stessa domanda ("dove sto guadagnando?")
 *                      e messi uno accanto all'altro occupano due riquadri per dire una cosa
 *                      sola. Uno sopra l'altro, con la linguetta, si CONFRONTANO: si clicca
 *                      avanti e indietro e il ribaltamento salta all'occhio.
 *
 *   altro-taglio       la stessa domanda, un taglio diverso dello stesso dato: per coorte o
 *                      per stagione, per area o per canale. La domanda non cambia, cambia
 *                      l'asse con cui la si guarda, e tenerne due a schermo raddoppia lo
 *                      spazio senza raddoppiare l'informazione.
 *
 *   pagina-sprecata    serve un grafico in piu, la pagina e piena, e quel grafico da solo non
 *                      giustifica una pagina. Una pagina con un grafico solo e peggio di un
 *                      bookmark: il lettore ci arriva, vede il vuoto e torna indietro. Questo
 *                      motivo si usa quando la risposta onesta e "non ci sta, e non merita
 *                      una schermata sua".
 *
 * QUANDO NON SI USA — e sono i casi in cui il motore lo rifiuta o lo sconsiglia:
 *   - con piu di due viste sul visual di APERTURA. L'apertura e l'identita della pagina: un
 *     bookmark li e ammesso — e il modo in cui una domanda in piu entra in una pagina piena —
 *     ma con due viste, non con un menu di tre;
 *   - per mettere insieme due cose che non c'entrano niente. Due viste che non condividono ne
 *     la misura ne la dimensione non sono due lenti sulla stessa domanda: sono due grafici
 *     che qualcuno voleva far stare nello stesso posto;
 *   - piu di due card a bookmark nella stessa pagina, o piu di tre viste in una card. Oltre,
 *     la pagina diventa un'interfaccia da esplorare invece di un report da leggere;
 *   - quando lo spazio C'E. Se la pagina ha ancora una riga libera, il grafico ci va e basta:
 *     nascondere qualcosa che poteva stare a schermo e una perdita netta.
 */
'use strict';

const MOTIVI = {
  'due-lenti': {
    quando: 'due metriche che raccontano la stessa domanda da versi opposti (ricavo/margine, volume/prezzo)',
    esempio: 'Fatturato per prodotto | Margine per prodotto'
  },
  'altro-taglio': {
    quando: 'la stessa domanda con un altro asse (per coorte / per stagione)',
    esempio: 'Per coorte | Stagionalita'
  },
  'pagina-sprecata': {
    quando: 'serve un grafico in piu, la pagina e piena, e da solo non merita una pagina',
    esempio: 'Distribuzione | Andamento'
  }
};

/** Le card a piu viste di una spec, con la pagina e la posizione in cui stanno. */
function contenitori(spec) {
  const out = [];
  const pagine = (spec.pages || []).concat(spec.drill && spec.drill.page ? [spec.drill.page] : []);
  pagine.forEach(pg => (pg.rows || []).forEach((row, ri) => {
    (row.visuals || []).forEach((v, vi) => {
      if (v.viste && v.viste.length) out.push({ pagina: pg.id || 'drill', riga: ri, indice: vi, v: v });
    });
  }));
  return out;
}

/** Il visual di apertura di una pagina: la prima posizione della prima riga di contenuto. */
const aperturaDi = pg => (((pg.rows || [])[0] || {}).visuals || [])[0];

/**
 * I RIFIUTI. Tornano dentro gli errori di validate(): una spec che li viola non renderizza.
 * Sono deliberatamente pochi e tutti verificabili guardando solo la spec — una regola che ha
 * bisogno di un giudizio non e un gate, e un'opinione con l'aria di un gate.
 */
function valida(spec) {
  const e = [];
  const perPagina = {};
  contenitori(spec).forEach(c => {
    const v = c.v, dove = 'pagina "' + c.pagina + '", riga ' + (c.riga + 1);
    perPagina[c.pagina] = (perPagina[c.pagina] || 0) + 1;

    if (!v.motivo) {
      e.push(dove + ': una card a piu viste deve dichiarare "motivo" (' +
        Object.keys(MOTIVI).join(' | ') + '). Ogni vista oltre la prima e una cosa che il ' +
        'lettore vedra solo se clicca: se non c\'e un motivo scrivibile in una parola, i due ' +
        'grafici vanno messi tutti e due a schermo, oppure uno va tolto.');
    } else if (!MOTIVI[v.motivo]) {
      e.push(dove + ': motivo "' + v.motivo + '" sconosciuto. Ammessi: ' +
        Object.keys(MOTIVI).map(k => k + ' (' + MOTIVI[k].quando + ')').join(' · '));
    }

    if (v.viste.length > 3) {
      e.push(dove + ': ' + v.viste.length + ' viste in una card. Il massimo e 3: le linguette ' +
        'stanno nell\'intestazione, e oltre tre non ci stanno ne si ricordano.');
    }
    v.viste.forEach((vi, k) => {
      if (!vi.etichetta && !vi.title) {
        e.push(dove + ', vista ' + (k + 1) + ': manca "etichetta". La linguetta e cio che il ' +
          'lettore legge per decidere se cliccare: senza nome non clicca.');
      }
      if (!vi.type) e.push(dove + ', vista ' + (k + 1) + ': manca "type".');
    });

    /* Le viste devono parlare della stessa cosa. Il legame minimo verificabile: condividono la
       misura, oppure la dimensione. Due viste che non condividono nulla sono due grafici
       diversi messi nello stesso posto per far quadrare la pagina. */
    if (v.viste.length > 1 && v.motivo !== 'pagina-sprecata') {
      /* le misure di una vista: quella del bind e, per una matrice, quelle delle colonne — due
         tabelle per valuta e per paese con le stesse colonne guardano la stessa domanda (Luca) */
      const mis = vi => { const b = vi.bind || {}; return [b.measure].concat((b.columns || []).map(c => c.measure)).filter(Boolean); };
      const dim = vi => (vi.bind || {}).dim;
      const m0 = mis(v.viste[0]), d0 = dim(v.viste[0]);
      const legate = v.viste.slice(1).every(vi =>
        mis(vi).some(x => m0.indexOf(x) >= 0) || (d0 !== undefined && dim(vi) === d0));
      if (!legate) {
        e.push(dove + ': le viste non condividono ne la misura ne la dimensione, quindi non sono ' +
          'due modi di guardare la stessa domanda. Se il motivo vero e "non ci stava", si ' +
          'dichiara motivo:"pagina-sprecata" e si e onesti; altrimenti sono due grafici da separare.');
      }
    }
  });

  /* L'APERTURA PUO OSPITARNE UNO, MA CORTO.
     La prima versione di questa regola lo vietava del tutto, con un argomento buono — se la
     prima cosa che si vede cambia, la pagina ha due identita. Ma il caso reale che l'ha
     motivata (la mappa delle coorti che diventa la stagionalita) e proprio il modo in cui una
     domanda in piu entra in una pagina piena senza sprecare una schermata, ed e stato chiesto
     cosi. Quindi: ammesso, con due viste al massimo. Il lettore che clicca deve poter tornare
     indietro con un colpo solo; tre linguette sull'apertura sono un menu, e un report che si
     apre su un menu ha perso. Il resto — "sei sicuro?" — e un consiglio, non un divieto. */
  const pagine = (spec.pages || []).concat(spec.drill && spec.drill.page ? [spec.drill.page] : []);
  pagine.forEach(pg => {
    const ap = aperturaDi(pg);
    if (ap && ap.viste && ap.viste.length > 2) {
      e.push('pagina "' + (pg.id || 'drill') + '": il visual di APERTURA ha ' + ap.viste.length +
        ' viste. Sull\'apertura il massimo e 2: la prima cosa che si vede e l\'identita della ' +
        'pagina, e tre linguette la trasformano in un menu.');
    }
  });

  Object.keys(perPagina).forEach(p => {
    if (perPagina[p] > 2) {
      e.push('pagina "' + p + '": ' + perPagina[p] + ' card a piu viste. Il massimo e 2 — oltre, ' +
        'la pagina smette di essere un report e diventa qualcosa da esplorare.');
    }
  });
  return e;
}

/**
 * I CONSIGLI. Non fermano niente: dicono dove un bookmark ci starebbe e dove e sprecato.
 * Il primo caso e quello che l'autore chiede piu spesso senza saperlo — due visual dello
 * stesso tipo, sulla stessa dimensione, con misure diverse: sono due lenti, e stanno
 * occupando due riquadri.
 */
function consiglia(spec) {
  const a = [];
  (spec.pages || []).forEach(pg => {
    const ap = aperturaDi(pg);
    if (ap && ap.viste && ap.viste.length > 1) {
      a.push('pagina "' + pg.id + '": il bookmark sta sull\'APERTURA. Va bene se la prima vista ' +
        'resta il visual dominante dell\'archetipo — e quella che decide di cosa parla la pagina; ' +
        'la seconda e un di piu, non un\'alternativa alla pari.');
    }
  });
  (spec.pages || []).forEach(pg => {
    const visuali = [];
    (pg.rows || []).forEach((row, ri) => (row.visuals || []).forEach((v, vi) => {
      if (!v.viste) visuali.push({ v: v, ri: ri, vi: vi });
    }));
    visuali.forEach((x, i) => visuali.slice(i + 1).forEach(y => {
      const bx = x.v.bind || {}, by = y.v.bind || {};
      if (x.v.type !== y.v.type || !bx.dim || bx.dim !== by.dim) return;
      if (!bx.measure || !by.measure || bx.measure === by.measure) return;
      /* l'apertura resta l'apertura: se una delle due e la prima della pagina, non si tocca */
      if (x.ri === 0 && x.vi === 0) return;
      a.push('pagina "' + pg.id + '": "' + (x.v.title || x.v.type) + '" e "' +
        (y.v.title || y.v.type) + '" sono lo stesso grafico sulla stessa dimensione con due ' +
        'misure diverse — sono due lenti sulla stessa domanda, e una card a due viste ' +
        '(motivo:"due-lenti") libererebbe un riquadro.');
    }));
  });
  return a;
}

module.exports = { MOTIVI, contenitori, valida, consiglia };
