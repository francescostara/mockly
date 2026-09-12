/* LA VERIFICA ESAUSTIVA DELL'INTERATTIVITA.
 *
 * Il piano di prova non e scritto qui: e la SCHEDA DI INTERAZIONE (`engine/scheda.js`), la
 * stessa che finisce dentro il file per il cliente. Ogni sua affermazione — "clicca una cella
 * per filtrare la fascia", "ogni riga apre il dettaglio" — viene eseguita davvero. Se la scheda
 * promette qualcosa che il report non fa, il test fallisce: e l'unico modo perche una
 * descrizione a parole resti vera nel tempo invece di diventare una bugia gentile.
 *
 * Per ogni interazione si verifica che:
 *   - qualcosa cambi DAVVERO — il TESTO della pagina, non una classe CSS. Una classe che si
 *     accende senza che nessun numero si muova e esattamente il filtro decorativo che il
 *     motore esiste per rendere impossibile;
 *   - nessun valore diventi NaN, undefined o Infinity;
 *   - i totali continuino a riconciliare: il totale della matrice resta uguale alla card KPI;
 *   - la matrice non cresca oltre le righe per cui il fit ha riservato lo spazio.
 */
'use strict';

const ROTTO = /NaN|undefined|Infinity/;

/** Il testo della pagina: e cio che vede il lettore, ed e l'unica prova che qualcosa e successo. */
const testo = B => B.q('#page').textContent.replace(/\s+/g, ' ').trim();

/** Il valore della prima card KPI, e il totale della matrice per la stessa misura. */
function tieOut(B, spec) {
  const kpi = B.qa('#page .kpi');
  const tot = B.q('#page tr.tot');
  if (!kpi.length || !tot) return null;
  const primo = (kpi[0].querySelector('.v') || {}).textContent;
  const celle = [...tot.children].map(td => td.textContent.trim());
  return { kpi: (primo || '').trim(), celle };
}

/**
 * Esegue il piano. `B` e il browser finto dell'harness, `P` la scheda strutturata.
 * Ritorna { prove, problemi } — le prove sono il conto di cio che e stato davvero cliccato.
 */
function esegui(B, spec, data, P) {
  const problemi = [];
  let prove = 0;
  const guasto = (dove, che) => problemi.push(dove + ': ' + che);

  /* Lo stato di partenza, a cui si torna dopo ogni prova. */
  const reset = () => B.clk('#btnReset');
  const primaPagina = (P.pagine[0] || {}).id;
  const vaiA = id => { if (id && B.q(`[data-page="${id}"]`)) B.clk(`[data-page="${id}"]`); };
  const base = testo(B);

  /** Una prova: fai la cosa, guarda che sia successo qualcosa di sano. */
  function prova(dove, azione, opz) {
    opz = opz || {};
    const prima = testo(B);
    /* La forma della riga dei totali si confronta con quella di UN ATTIMO PRIMA, non con la
       prima pagina: pagine diverse hanno matrici diverse, e paragonarle direbbe "e cambiata"
       di una tabella che non e mai stata quella. */
    const tiePrima = tieOut(B, spec);
    azione();
    const dopo = testo(B);
    prove++;
    if (ROTTO.test(dopo)) {
      const m = dopo.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/);
      guasto(dove, 'valore rotto nella pagina — "' + (m ? m[0].trim() : '') + '"');
    }
    if (opz.deveCambiare !== false && prima === dopo) {
      guasto(dove, 'nessun cambiamento nel testo della pagina: il controllo si accende ma non filtra');
    }
    if (opz.tieOut !== false) {
      const t = tieOut(B, spec);
      if (t && tiePrima && t.celle.length !== tiePrima.celle.length) {
        guasto(dove, 'la riga dei totali ha cambiato forma');
      }
    }
    if (opz.poi) opz.poi();
  }

  /* ---------- 1. ogni membro di ogni filtro, non i primi tre ---------- */
  P.filtri.forEach(f => {
    f.membri.forEach(mb => {
      prova(`filtro ${f.dim}:${mb.id}`, () => {
        if (!B.clk(`#page ${mb.sel}`)) B.clk(mb.sel);
      });
      /* la pill del contesto deve nominare cio che si e scelto: un filtro attivo che non si
         vede da nessuna parte e un report che mente sullo stato in cui si trova */
      const ctx = (B.q('#hCtx') || { textContent: '' }).textContent;
      if (ctx && !ctx.includes(mb.n)) {
        guasto(`filtro ${f.dim}:${mb.id}`, 'il filtro attivo non compare fra le pill di contesto');
      }
      reset();
    });
  });

  /* ---------- 2. combinazioni ragionevoli: due filtri insieme ---------- */
  if (P.filtri.length > 1) {
    const [a, b] = P.filtri;
    if (a.membri.length && b.membri.length) {
      prova(`filtri ${a.dim}+${b.dim} insieme`, () => {
        B.clk(`#page ${a.membri[0].sel}`) || B.clk(a.membri[0].sel);
        B.clk(`#page ${b.membri[0].sel}`) || B.clk(b.membri[0].sel);
      });
      reset();
    }
  }

  /* ---------- 3. il cross-filter da OGNI visual che la scheda dichiara cliccabile ---------- */
  P.cross.filter(c => !c.drillPage).forEach(c => {
    vaiA(c.page);
    const el = B.q(`#page ${c.sel}`);
    if (!el) {
      guasto(`cross-filter ${c.tipo} su ${c.dim}`,
        'la scheda promette che si clicca ' + c.cosa + ' in "' + c.titolo + '", ma nel report ' +
        'non c\'e nessun elemento cliccabile per quella dimensione');
      return;
    }
    prova(`cross-filter ${c.tipo} su ${c.dim}`, () => B.clk(el));
    reset();
  });

  /* ---------- 4. il drill-through da ogni riga, e il ritorno ---------- */
  P.drill.forEach(d => {
    vaiA(d.page);
    const righe = B.qa('#page [data-drill]');
    if (!righe.length) {
      guasto('drill su ' + d.dim, 'la scheda promette il dettaglio ma nessuna riga lo espone');
      return;
    }
    /* Per INDICE, non per riferimento: ogni drill e ogni ritorno rifanno l'innerHTML di
       #page, quindi le righe raccolte prima del primo giro sono gia staccate dal documento.
       E' lo stesso inciampo dello slicer, e da lo stesso falso allarme — "la riga non apre
       nessun dettaglio" di una riga che funziona. */
    righe.forEach((_, i) => {
      const prima = testo(B);
      const r = B.qa('#page [data-drill]')[i];
      if (!r) { guasto('drill su ' + d.dim, 'la riga ' + (i + 1) + ' e sparita dopo un ritorno'); return; }
      B.rmb(r);
      const dentro = testo(B);
      prove++;
      if (dentro === prima) guasto('drill su ' + d.dim, 'la riga non apre nessun dettaglio');
      if (ROTTO.test(dentro)) guasto('drill su ' + d.dim, 'valore rotto nella pagina di dettaglio');
      if (!B.q('#btnBack')) guasto('drill su ' + d.dim, 'la pagina di dettaglio non ha il tasto per tornare');
      B.clk('#btnBack');
      if (testo(B) !== prima) guasto('drill su ' + d.dim, 'il ritorno non riporta alla pagina di partenza');
    });
    reset();
  });

  /* ---------- 5. lo slicer data su ogni livello, e l'esenzione della timeline ---------- */
  const punti = () => B.qa('#page circle.hit').length;
  const puntiBase = punti();
  /* I bottoni dello slicer si cliccano PER SELETTORE, uno alla volta. Tenerne in mano l'elenco
     non funziona: ogni scelta fa un A.render() che riscrive l'innerHTML del pannello, e i nodi
     raccolti prima restano staccati dal documento — si continuerebbe a cliccare fantasmi, e il
     test direbbe "non cambia niente" di un controllo che funziona benissimo. */
  const apri = () => { if (!B.q('#slPanel.open')) B.clk('#slBtn'); };
  apri();
  const anni = B.qa('#slYear [data-y]').map(e => e.getAttribute('data-y'));
  const trim = B.qa('#slQtr [data-q]').map(e => e.getAttribute('data-q'));
  const mesi = B.qa('#slMon [data-m]').map(e => e.getAttribute('data-m'));
  anni.forEach(y => {
    apri();
    prova('slicer anno ' + y, () => B.clk(`#slYear [data-y="${y}"]`), { deveCambiare: false });
  });
  trim.forEach(q => {
    apri();
    prova('slicer trimestre ' + q, () => B.clk(`#slQtr [data-q="${q}"]`),
      { deveCambiare: q !== 'all' });
    if (q !== 'all') { apri(); B.clk('#slQtr [data-q="all"]'); }
  });
  mesi.forEach(m => {
    apri();
    prova('slicer mese ' + m, () => B.clk(`#slMon [data-m="${m}"]`), { deveCambiare: m !== 'all' });
    if (m !== 'all') { apri(); B.clk('#slMon [data-m="all"]'); }
  });
  /* LA FINESTRA DI PIU ANNI, quando la scheda la dichiara. Il difetto da cui questa prova
     difende non e un errore visibile: e un controllo che si accende e non cambia niente — tre
     chip evidenziati e la pagina ferma su un anno solo. Quindi ogni ampiezza oltre 1 DEVE
     muovere i numeri, e l'ampiezza 1 deve riportarli dov'erano. */
  const fin = (P.data || {}).finestra;
  if (fin) {
    apri();
    const ampiezze = B.qa('#slSpan [data-span]').map(e => e.getAttribute('data-span'));
    const partenza = testo(B);
    ampiezze.forEach(n => {
      apri();
      prova('finestra ' + n + ' anni', () => B.clk(`#slSpan [data-span="${n}"]`),
        { deveCambiare: n !== '1' });
      if (n !== '1') {
        apri(); B.clk('#slSpan [data-span="1"]');
        if (testo(B) !== partenza) {
          guasto('finestra ' + n + ' anni',
            'tornando a un anno i numeri non tornano quelli di partenza: la finestra lascia uno strascico');
        }
        prove++;
      }
    });
    reset();
  }

  /* l'esenzione: sotto un mese il trend deve avere ancora i suoi dodici punti */
  if (puntiBase) {
    apri();
    B.clk('#slMon [data-m="5"]');
    if (punti() !== puntiBase) {
      guasto('esenzione timeline', `il trend passa da ${puntiBase} a ${punti()} punti sotto un ` +
        `filtro di mese: la scheda dichiara che resta a dodici`);
    }
    prove++;
  }
  reset();

  /* ---------- 6. i tooltip, su ogni tipo di visual ---------- */
  const perTipo = {};
  P.cross.concat(P.esenti).forEach(v => { perTipo[v.tipo] = perTipo[v.tipo] || v; });
  /* Solo i visual DISEGNATI. Una tabella mostra gia ogni cifra per esteso: pretendere un
     tooltip su ogni cella significherebbe ripetere al lettore il numero che sta leggendo — e
     la regola "tooltip su ogni elemento di dato" esiste per il caso opposto, la forma che
     rappresenta un valore senza scriverlo. */
  B.qa('#page .card').forEach(card => {
    const tips = card.querySelectorAll('[data-tip]');
    if (!card.querySelector('svg')) return;
    if (!tips.length) {
      const tit = (card.querySelector('.ch h3') || { textContent: card.className }).textContent;
      guasto('tooltip', `"${tit.trim()}" non ha nessun elemento con tooltip`);
    } else {
      prove++;
      const vuoti = [...tips].filter(t => !(t.getAttribute('data-tip') || '').trim() ||
        ROTTO.test(t.getAttribute('data-tip')));
      if (vuoti.length) guasto('tooltip', `${vuoti.length} tooltip vuoti o rotti`);
    }
  });

  /* ---------- 7. il reset riporta davvero allo stato iniziale ---------- */
  vaiA(primaPagina);
  P.filtri.forEach(f => { if (f.membri[0]) B.clk(`#page ${f.membri[0].sel}`) || B.clk(f.membri[0].sel); });
  apri(); B.clk('#slQtr [data-q="2"]');
  reset();
  vaiA(primaPagina);
  prove++;
  if (testo(B) !== base) {
    guasto('reset', 'dopo l\'azzeramento la pagina non e tornata allo stato iniziale');
  }

  return { prove, problemi };
}

module.exports = { esegui };
