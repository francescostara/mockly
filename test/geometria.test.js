#!/usr/bin/env node
/* LA GEOMETRIA DEL DISEGNO — il gate che mancava, scritto dalla revisione umana.
 *
 * Il primo giro di revisione ha detto una cosa sola, quattro volte: la macchina promuoveva
 * tutto (SPEDIBILE 4 su 4) e la persona dava tre su cinque a "si legge bene", sempre. Non era
 * un caso: i gate guardavano i NUMERI e le INTERAZIONI, e del disegno non misuravano niente.
 * Un gauge tagliato dal bordo, un'etichetta sovrapposta al suo valore, un terzo di grafico
 * lasciato vuoto — tutte cose che un occhio vede in un secondo e che nessun controllo guardava.
 *
 * Qui ci sono i controlli corrispondenti, uno per ogni difetto trovato. Non pretendono di
 * misurare la bellezza: misurano il fatto che una forma stia dentro il suo riquadro, che un
 * testo non finisca sopra un altro, e che lo spazio della card sia usato.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('geometria del disegno (il gate nato dalla revisione)');

const { casi, renderCaso } = require('./corpus.js');

const renderizzati = casi().map(c => {
  const data = c.caso.build();
  const dom = new JSDOM(renderCaso(c), { runScripts: 'dangerously', pretendToBeVisual: true });
  /* i nomi dei membri servono a riconoscere un'etichetta troncata: e un prefisso di un nome vero */
  const nomi = [].concat(...Object.values(data.dims || {}).map(ms => ms.map(m => String(m.n))));
  return { id: c.id, doc: dom.window.document, nomi, chiudi: () => dom.window.close() };
});

/** Ogni SVG dentro una card, col suo riquadro. */
function svgs(doc) {
  return [...doc.querySelectorAll('#page .card svg')].map(s => ({
    el: s,
    w: parseFloat(s.getAttribute('width')) || 0,
    h: parseFloat(s.getAttribute('height')) || 0,
    titolo: ((s.closest('.card').querySelector('.ch h3') || {}).textContent || '').trim()
  }));
}

ok('nessuna forma esce dal proprio riquadro', () => {
  const fuori = [];
  renderizzati.forEach(r => {
    svgs(r.doc).forEach(s => {
      [...s.el.querySelectorAll('rect,circle,text')].forEach(e => {
        const num = a => parseFloat(e.getAttribute(a));
        let x0, x1, y0, y1;
        if (e.tagName === 'circle') {
          const cx = num('cx'), cy = num('cy'), rr = num('r') || 0;
          x0 = cx - rr; x1 = cx + rr; y0 = cy - rr; y1 = cy + rr;
        } else if (e.tagName === 'rect') {
          x0 = num('x'); y0 = num('y'); x1 = x0 + (num('width') || 0); y1 = y0 + (num('height') || 0);
        } else {
          /* il testo: la x e un'ancora, quindi si controlla solo che l'ancora e la riga di
             base stiano dentro — la larghezza vera la sa solo il browser */
          x0 = x1 = num('x'); y0 = y1 = num('y');
        }
        if ([x0, x1, y0, y1].some(v => !isFinite(v))) return;
        const t = 1.5;
        if (x0 < -t || y0 < -t || x1 > s.w + t || y1 > s.h + t) {
          fuori.push(`${r.id} · "${s.titolo}" · <${e.tagName.toLowerCase()}> ` +
            `[${x0.toFixed(0)},${y0.toFixed(0)} → ${x1.toFixed(0)},${y1.toFixed(0)}] ` +
            `fuori da ${s.w}x${s.h}`);
        }
      });
    });
  });
  assert.deepStrictEqual(fuori.slice(0, 5), [], fuori.length + ' forme fuori riquadro');
});

ok('gli archi restano dentro il riquadro, spessore compreso', () => {
  /* Il caso del gauge: il raggio stava nel riquadro, il TRATTO no. Un arco spesso venti pixel
     sporge di dieci oltre il raggio, e il bordo superiore finiva sette pixel sopra la card —
     tagliato. E' il difetto che la revisione ha segnalato come "il gauge non entra bene nel
     riquadro", ed e invisibile a qualunque controllo che guardi solo il raggio. */
  const fuori = [];
  renderizzati.forEach(r => {
    svgs(r.doc).forEach(s => {
      [...s.el.querySelectorAll('path[stroke-width]')].forEach(p => {
        const d = p.getAttribute('d') || '';
        /* Solo gli archi TRACCIATI: un arco disegnato col tratto, aperto, senza spezzate ne
           chiusura. Le fette di un donut sono anche loro archi, ma sono spicchi PIENI — hanno
           una L e una Z — e il loro punto di partenza non sta a sinistra del centro, quindi
           dedurne il centro come si fa qui darebbe un centro sbagliato e un allarme falso. */
        if (p.getAttribute('fill') !== 'none' || /[LZ]/.test(d)) return;
        const m = d.match(/^M\s*([\d.-]+),\s*([\d.-]+)\s*A\s*([\d.-]+),([\d.-]+)/);
        if (!m) return;
        const x0 = +m[1], y0 = +m[2], rr = +m[3];
        const sw = parseFloat(p.getAttribute('stroke-width')) || 0;
        /* il centro si ricava dal punto iniziale di un semicerchio che parte a sinistra */
        const cx = x0 + rr, cy = y0;
        const su = cy - rr - sw / 2, sx = cx - rr - sw / 2, dx = cx + rr + sw / 2;
        if (su < -1 || sx < -1 || dx > s.w + 1) {
          fuori.push(`${r.id} · "${s.titolo}": arco r=${rr.toFixed(0)} tratto=${sw.toFixed(0)} ` +
            `esce (alto ${su.toFixed(0)}, sinistra ${sx.toFixed(0)}, destra ${dx.toFixed(0)} di ${s.w})`);
        }
      });
    });
  });
  assert.deepStrictEqual(fuori, [], fuori.join(' | '));
});

ok('due testi non si sovrappongono sulla stessa riga', () => {
  /* Il caso del funnel: nome dello stadio a sinistra e valore a destra, dentro una barra che
     verso il fondo si stringe — e sugli ultimi stadi finivano uno sopra l'altro. Si confronta
     l'ancora sinistra col bordo destro del testo ancorato a destra, sulla stessa riga di base. */
  const largh = (s, px) => {
    let w = 0;
    for (const c of String(s)) {
      if (/[A-ZÀÈÉÌÒÙ0-9%€]/.test(c)) w += 0.66;
      else if (/[ .,:;'·|!ilIJ]/.test(c)) w += 0.30;
      else if (/[mwMW]/.test(c)) w += 0.82;
      else w += 0.54;
    }
    return w * px;
  };
  const scontri = [];
  renderizzati.forEach(r => {
    svgs(r.doc).forEach(s => {
      const righe = {};
      [...s.el.querySelectorAll('text')].forEach(t => {
        const y = Math.round(parseFloat(t.getAttribute('y')) || 0);
        (righe[y] = righe[y] || []).push(t);
      });
      Object.keys(righe).forEach(y => {
        const testi = righe[y].map(t => {
          const px = parseFloat(t.getAttribute('font-size')) || 10;
          const w = largh(t.textContent, px);
          const x = parseFloat(t.getAttribute('x')) || 0;
          const anc = t.getAttribute('text-anchor');
          const x0 = anc === 'end' ? x - w : anc === 'middle' ? x - w / 2 : x;
          return { x0, x1: x0 + w, testo: t.textContent };
        }).sort((a, b) => a.x0 - b.x0);
        for (let i = 1; i < testi.length; i++) {
          if (testi[i].x0 < testi[i - 1].x1 - 1.5) {
            scontri.push(`${r.id} · "${s.titolo}" riga y=${y}: ` +
              `"${testi[i - 1].testo}" e "${testi[i].testo}" si sovrappongono`);
          }
        }
      });
    });
  });
  assert.deepStrictEqual(scontri.slice(0, 5), [], scontri.length + ' sovrapposizioni');
});

ok('la colonna delle etichette non si mangia il grafico', () => {
  /* Il caso di hbar e stack100: la colonna delle etichette era una frazione fissa della card,
     e con nomi corti — "Ads", "Q1" — restava vuoto un terzo del riquadro. Si misura da dove
     comincia il primo elemento disegnato rispetto alla larghezza dell'SVG. */
  const sprechi = [];
  renderizzati.forEach(r => {
    svgs(r.doc).forEach(s => {
      /* Il donut disegna l'anello a sinistra e la legenda a destra: i suoi rettangoli sono
         pastiglie di legenda, non barre, e cominciare a meta larghezza e la sua forma, non uno
         spreco. Si riconosce dagli spicchi, che sono path cliccabili. */
      if (s.el.querySelector('path[data-f]')) return;
      const barre = [...s.el.querySelectorAll('g.hit rect[width], rect[data-f]')]
        .map(e => parseFloat(e.getAttribute('x')))
        .filter(v => isFinite(v) && v > 0);
      if (barre.length < 3) return;
      const inizio = Math.min.apply(null, barre);
      if (inizio > s.w * 0.45) {
        sprechi.push(`${r.id} · "${s.titolo}": il disegno comincia a ${inizio.toFixed(0)}px ` +
          `su ${s.w} (${Math.round(inizio / s.w * 100)}% di riquadro vuoto a sinistra)`);
      }
    });
  });
  assert.deepStrictEqual(sprechi, [], sprechi.join(' | '));
});

ok('il bordo destro e lo stesso per tutte le righe', () => {
  /* L'errore piu grave del primo giro, e il piu invisibile: in pagina densa il foglio di stile
     stringeva il gutter a 8px mentre le larghezze delle card restavano calcolate su 12. Ogni
     riga tornava — col gutter sbagliato — e il bordo destro del report finiva A SCALINI, in un
     punto diverso a seconda di quante card aveva la riga.
     Il controllo si fa con il gutter che il CSS USA DAVVERO, letto dal foglio emesso: e l'unico
     modo di accorgersi che i due numeri hanno smesso di essere lo stesso numero. */
  const storti = [];
  renderizzati.forEach(r => {
    const css = r.doc.querySelector('style').textContent;
    /* l'ultima regola .row{gap:...} vince: in pagina densa e quella del blocco compatto */
    const gaps = [...css.matchAll(/\.row\{[^}]*gap:([\d.]+)px/g)].map(m => parseFloat(m[1]));
    const gap = gaps.length ? gaps[gaps.length - 1] : null;
    if (gap === null) return;
    /* La banda a blocco unico (skin.banda "blocco") non da larghezze alle sue card: crescono in
       proporzione allo span dentro l'unica superficie, quindi finiscono dove finisce la riga per
       costruzione. Senza layout (jsdom) la loro larghezza e zero: la riga si esclude, non si
       misura sbagliata. Il primo caso del corpus col blocco e stato retail-parsa (27 set 2026). */
    const righe = [...r.doc.querySelectorAll('#page > .row')]
      .filter(rw => ![...rw.children].some(x => !parseFloat(x.style.width) && /flex:/.test(x.getAttribute('style') || '')));
    const larghezze = righe.map(rw => {
      const c = [...rw.children].map(x => parseFloat(x.style.width) || 0);
      return Math.round((c.reduce((a, b) => a + b, 0) + gap * (c.length - 1)) * 10) / 10;
    });
    const distinte = [...new Set(larghezze)];
    if (distinte.length > 1) {
      storti.push(`${r.id}: le righe finiscono a ${distinte.join(', ')} (gutter del CSS ${gap}px)`);
    }
  });
  assert.deepStrictEqual(storti, [], storti.join(' | '));
});

ok('la heatmap ha almeno cinque gradini e scrive i suoi numeri', () => {
  /* Il caso della ritenzione per coorte: con tre gradini una mappa i cui valori stanno vicini
     diventa un muro di due tinte, e il colore da solo non dice quanto. */
  const problemi = [];
  renderizzati.forEach(r => {
    svgs(r.doc).forEach(s => {
      const celle = [...s.el.querySelectorAll('rect[data-f][rx="1"]')];
      if (celle.length < 8) return;
      const tinte = new Set(celle.map(c => c.getAttribute('fill')));
      const cifre = s.el.querySelectorAll('text.tnum').length;
      if (tinte.size < 3) {
        problemi.push(`${r.id} · "${s.titolo}": ${celle.length} celle con sole ${tinte.size} tinte`);
      }
      if (!cifre) {
        problemi.push(`${r.id} · "${s.titolo}": nessun valore scritto dentro le celle`);
      }
    });
  });
  assert.deepStrictEqual(problemi, [], problemi.join(' | '));
});

ok('le intestazioni della heatmap non si troncano se c e spazio', () => {
  /* Il caso delle categorie dell'app di lingue: ogni intestazione era tagliata a sei lettere,
     anche su colonne larghe centottanta pixel — "Vocabulary & idioms" usciva "Vocabu", senza
     nemmeno i puntini a dire che mancava qualcosa. Un'etichetta accorciata deve dirlo. */
  const tronche = [];
  renderizzati.forEach(r => {
    svgs(r.doc).forEach(s => {
      if (s.el.querySelectorAll('rect[data-f][rx="1"]').length < 8) return;
      [...s.el.querySelectorAll('text[y="10"]')].map(t => t.textContent).forEach(t => {
        if (t.endsWith('…')) return;
        const intero = r.nomi.find(n => n !== t && n.startsWith(t));
        if (intero && !r.nomi.includes(t)) tronche.push(`${r.id} · "${s.titolo}": "${t}" al posto di "${intero}", senza puntini`);
      });
    });
  });
  assert.deepStrictEqual(tronche, [], tronche.join(' | '));
});

renderizzati.forEach(r => r.chiudi());
console.log('  ' + n + ' checks · ' + renderizzati.length + ' mockup');
