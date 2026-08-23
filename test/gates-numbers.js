#!/usr/bin/env node
/* I gate sui NUMERI, applicabili a qualunque mockup — fixture o output vero dell'eval.
 *
 * Nascono da difetti reali trovati aprendo a mano i file del primo giro a pagamento:
 *   · lo stesso Engagement Rate valeva 0,9% nella matrice e 0,0% nelle barre accanto;
 *   · lo scontrino medio diceva "€0" con fatturato e ordini entrambi diversi da zero;
 *   · una barra 100% mostrava cinque segmenti identici perche dim e by erano la stessa cosa.
 *
 * Nessuno di questi rende il file invalido secondo i gate strutturali: il documento e ben
 * formato, i totali riconciliano, l'HTML sta sotto i 60KB. Sono numeri sbagliati dentro un
 * contenitore giusto — ed e la categoria che l'harness non guardava, perche girava solo sulle
 * quattro fixture scritte da noi, dove non capita mai.
 *
 * Ogni funzione prende il DOM gia renderizzato (piu spec e data) e ritorna una lista di
 * problemi. Nessuna stampa: chi chiama decide come riportarli.
 */
'use strict';

const txt = e => ((e && e.textContent) || '').replace(/\s+/g, ' ').trim();

/** Un numero formattato conta come "zero" se non contiene una cifra diversa da zero. */
const leggeZero = s => !/[1-9]/.test(String(s));

/* ---------------------------------------------------------------------------
 * 1. La stessa misura, sullo stesso filtro, deve dare lo stesso valore OVUNQUE
 * ------------------------------------------------------------------------- */

/* Il confronto e fra valori RENDERIZZATI, non fra ricalcoli: un ricalcolo userebbe lo stesso
   codice che si vuole controllare, e concorderebbe con se stesso anche sbagliando. Qui si
   legge cio che l'utente vede in un visual e lo si confronta con cio che vede in un altro. */
/* La misura di un visual si legge dal BIND della spec, non dal suo titolo: dedurla dal testo
   accoppia due visual che parlano della stessa dimensione ma mostrano misure diverse, e
   produce un allarme giusto per la ragione sbagliata. I visual renderizzati stanno nello
   stesso ordine dei visual dichiarati, quindi si appaiano per posizione. */
function visualiDellaSpec(spec) {
  const out = [];
  ((spec.pages || [])[0] || {}).rows?.forEach(r => (r.visuals || []).forEach(v => out.push(v)));
  return out;
}

function coerenzaFraVisual(dom, spec) {
  const problemi = [];
  const visto = {};                      /* "misura|membro" -> { valore, dove } */

  const nota = (misura, membro, valore, dove) => {
    if (!misura || !membro || !valore) return;
    const k = misura + '|' + membro;
    if (!visto[k]) { visto[k] = { valore, dove }; return; }
    if (visto[k].valore !== valore) {
      problemi.push('la misura "' + misura + '" per "' + membro + '": ' +
        visto[k].dove + ' dice ' + visto[k].valore + ', ' + dove + ' dice ' + valore +
        ' — la stessa misura sullo stesso filtro deve dare lo stesso valore in ogni visual');
    }
  };

  if (!spec) return problemi;
  const dichiarati = visualiDellaSpec(spec);
  const carte = [...dom.querySelectorAll('.card')].filter(c => !c.classList.contains('kpi'));

  carte.forEach((card, i) => {
    const v = dichiarati[i];
    if (!v) return;
    const b = v.bind || {};
    const titolo = txt(card.querySelector('.ch h3')) || v.type;

    /* la matrice: una misura per colonna, un membro per riga */
    const tab = card.querySelector('table');
    if (tab && b.columns) {
      [...tab.querySelectorAll('tbody tr')].forEach(tr => {
        const celle = [...tr.children].map(txt);
        const membro = celle[0].replace(/›$/, '').trim();
        b.columns.forEach((c, k) => {
          /* Una cella "heat" stampa il valore e cambia solo lo sfondo: e confrontabile.
             "var" mostra la variazione e "share" la quota sul totale: sono altre letture della
             stessa misura, e metterle a confronto darebbe un allarme per costruzione. */
          if (c.kind !== 'var' && c.kind !== 'share' && celle[k + 1]) {
            nota(c.measure, membro, celle[k + 1], 'la matrice');
          }
        });
      });
      return;
    }

    /* Solo i visual che stampano il VALORE della misura, formattato come lo stampa la matrice.
       Il donut, per esempio, scrive la quota percentuale accanto a ogni fetta: e una lettura
       diversa della stessa misura, non un valore in disaccordo, e confrontarla con la matrice
       darebbe un allarme giusto solo per caso. */
    if (v.type === 'hbar' && b.dim && b.measure) {
      [...card.querySelectorAll('g.hit')].forEach(g => {
        const t = [...g.querySelectorAll('text')].map(txt).filter(Boolean);
        if (t.length >= 2) nota(b.measure, t[0], t[t.length - 1], '"' + titolo + '"');
      });
    }
  });

  return problemi;
}

/* ---------------------------------------------------------------------------
 * 2. Un numero che legge zero mentre i suoi ingredienti non lo sono
 * ------------------------------------------------------------------------- */

/* "€0" per lo scontrino medio con fatturato €525K e 2,7M ordini non e un valore basso: e un
   numero rotto. Il tie-out non se ne accorge perche verifica la coerenza interna, non la
   plausibilita. */
function zeriImpossibili(dom, spec, aggregato) {
  const problemi = [];
  const misure = ((spec.model || {}).measures) || [];
  const perId = {};
  misure.forEach(m => { perId[m.id] = m; });

  /* le KPI sono il posto dove un valore rotto fa piu danno */
  [...dom.querySelectorAll('.kpi')].forEach(card => {
    const etichetta = txt(card.querySelector('.k'));
    const valore = txt(card.querySelector('.v'));
    if (!leggeZero(valore)) return;
    const m = misure.find(x => (x.label || '') === etichetta);
    if (!m) return;
    const ing = ingredienti(m, aggregato);
    if (ing.tutteNonZero) {
      problemi.push('la KPI "' + etichetta + '" legge ' + valore + ' ma ' + ing.descrizione +
        ' — un rapporto che si azzera con ingredienti non nulli e un numero rotto, non un valore basso');
    }
  });

  /* un rapporto in valuta sotto l'unita monetaria: scontrino medio di 24 centesimi significa
     che il denominatore e stato generato con un ordine di grandezza sbagliato */
  misure.filter(m => m.agg === 'ratio' && /^eur/.test(m.format || '')).forEach(m => {
    const v = aggregato[m.id];
    if (v > 0 && v < 1) {
      problemi.push('"' + (m.label || m.id) + '" vale ' + v.toFixed(4) + ': un valore medio in valuta ' +
        'sotto l unita monetaria vuol dire che ' + m.den + ' e stato generato con un ordine di ' +
        'grandezza sbagliato rispetto a ' + m.num);
    }
  });

  return problemi;
}

function ingredienti(m, a) {
  const parti = m.agg === 'ratio' ? [m.num, m.den] : m.agg === 'diff' ? [m.a, m.b] : [];
  if (!parti.length) return { tutteNonZero: false, descrizione: '' };
  const vals = parti.map(p => a[p] || 0);
  return {
    tutteNonZero: vals.every(v => Math.abs(v) > 0),
    descrizione: parti.map((p, i) => p + ' = ' + Math.round(vals[i]).toLocaleString('it-IT')).join(' e ')
  };
}

/* ---------------------------------------------------------------------------
 * 3. Composizioni finte: tutti i segmenti uguali
 * ------------------------------------------------------------------------- */

/* Cinque segmenti da 20% esatti non sono una distribuzione: sono 100 diviso 5. Succede quando
   una barra 100% ha `dim` e `by` sulla stessa dimensione, o quando la misura non si distribuisce
   sulla dimensione richiesta. */
/* Si guarda SOLO dove il valore e codificato nella larghezza: barre 100% e barre orizzontali.
   In un grafico a colonne le barre hanno tutte la stessa larghezza per costruzione — il valore
   sta nell'altezza — e misurare la larghezza li dentro accusa ogni istogramma del mondo. */
const LARGHEZZA_E_VALORE = { stack100: 1, hbar: 1 };

function segmentiFinti(dom, spec) {
  const problemi = [];
  const dichiarati = spec ? visualiDellaSpec(spec) : null;
  const carte = [...dom.querySelectorAll('.card')].filter(c => !c.classList.contains('kpi'));
  carte.forEach((card, i) => {
    const v = dichiarati ? dichiarati[i] : null;
    if (v && !LARGHEZZA_E_VALORE[v.type]) return;
    const titolo = txt(card.querySelector('.ch h3')) || '(composizione)';
    const svg = card.querySelector('svg');
    if (!svg) return;
    const w = [...svg.querySelectorAll('rect')]
      .map(r => Number(r.getAttribute('width')))
      .filter(v => v > 0.5);
    if (w.length < 3) return;
    const uniq = [...new Set(w.map(v => Math.round(v * 10) / 10))];
    if (uniq.length === 1) {
      problemi.push('"' + titolo + '": ' + w.length + ' segmenti tutti larghi ' + uniq[0] +
        'px — una distribuzione uniforme esatta non e un dato, e un fallback');
    }
  });
  return problemi;
}

/* ---------------------------------------------------------------------------
 * 4. Serie temporali piatte
 * ------------------------------------------------------------------------- */

function seriePiatte(dom) {
  const problemi = [];
  [...dom.querySelectorAll('.card')].forEach(card => {
    const titolo = txt(card.querySelector('.ch h3')) || '(serie)';
    [...card.querySelectorAll('path')].forEach(p => {
      const d = p.getAttribute('d') || '';
      const ys = [...d.matchAll(/[ML][-\d.]+,([-\d.]+)/g)].map(m => Number(m[1]));
      if (ys.length < 6) return;
      const uniq = [...new Set(ys.map(v => Math.round(v)))];
      if (uniq.length === 1) {
        problemi.push('"' + titolo + '": la serie e piatta su tutti e ' + ys.length +
          ' i punti — di norma vuol dire che la misura legge zero, non che il dato e stabile');
      }
    });
  });
  return problemi;
}

/* ---------------------------------------------------------------------------
 * 5. Due misure diverse che rendono la stessa identica stringa
 * ------------------------------------------------------------------------- */

/* Reach e Impression scritte entrambe "€6,8M" nella banda: o sono lo stesso numero (e allora
   una delle due e legata al campo sbagliato), o sono diversi e il formato compatto li rende
   indistinguibili. In entrambi i casi il lettore non puo dire quale sia quale. */
function kpiIndistinguibili(dom) {
  const visti = {}, problemi = [];
  [...dom.querySelectorAll('.kpi')].forEach(card => {
    const e = txt(card.querySelector('.k')), v = txt(card.querySelector('.v'));
    if (!v || leggeZero(v)) return;
    if (visti[v] && visti[v] !== e) {
      problemi.push('"' + visti[v] + '" e "' + e + '" mostrano entrambe ' + v +
        ' — o e lo stesso numero, o il formato compatto nasconde la differenza');
    }
    visti[v] = e;
  });
  return problemi;
}

/* ---------------------------------------------------------------------------
 * l'insieme
 * ------------------------------------------------------------------------- */

function tutti(dom, spec, aggregato) {
  return [
    ...coerenzaFraVisual(dom, spec),
    ...zeriImpossibili(dom, spec, aggregato || {}),
    ...segmentiFinti(dom, spec),
    ...seriePiatte(dom),
    ...kpiIndistinguibili(dom)
  ];
}

module.exports = {
  tutti, coerenzaFraVisual, zeriImpossibili, segmentiFinti, seriePiatte, kpiIndistinguibili
};
