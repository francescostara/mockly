/* I DATI FORNITI — una tabella vera al posto del generatore sintetico (Fra, 20 ott 2026: "immaginiamo
 * come se lui ci avesse fornito i dati… potremmo partire anche da una base di dati").
 *
 * `render(spec, data)` ha sempre disegnato qualunque `data` nel formato del motore: il generatore
 * (data-builder.js) e solo UN modo di produrlo. Questo modulo e l'altro: prende una tabella "tidy"
 * — una riga per anno (e mese, se ci sono) e per membro di ogni dimensione, con colonne numeriche —
 * e la porta nello stesso formato. Il resto del motore non sa da dove vengono i numeri.
 *
 * Tre regole, quelle della skill (references/data-realism.md):
 *  - il grano e quello dei dati: senza colonna del mese, nessun anno ha i mesi (data.mensili = []),
 *    e il report non mostra mai trimestre e mese;
 *  - cio che manca resta mancante: una combinazione assente non viene inventata;
 *  - niente tetto dei dodici anni del generatore: il tetto e sulle celle, cioe sul peso del file.
 *
 * Gli errori sono rifiuti espliciti, mai correzioni silenziose: un membro che non esiste, un numero
 * che non e un numero, un anno che non e un anno.
 */
'use strict';

const TETTO_CELLE = 60000;   // righe x colonne: oltre, il file supera il peso che un mockup puo avere

function fail(msg) { const e = new Error('dati forniti: ' + msg); e.datiForniti = true; throw e; }

/** CSV semplice: separatore virgola o punto e virgola, prima riga = intestazione, virgolette ammesse. */
function leggiCSV(testo) {
  const righe = String(testo).replace(/\r/g, '').split('\n').filter(r => r.trim() !== '');
  if (righe.length < 2) fail('il CSV non ha righe di dati');
  const sep = (righe[0].match(/;/g) || []).length > (righe[0].match(/,/g) || []).length ? ';' : ',';
  const spezza = r => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '"') { if (q && r[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(x => x.trim());
  };
  const hdr = spezza(righe[0]);
  return righe.slice(1).map(r => { const v = spezza(r), o = {}; hdr.forEach((h, i) => { o[h] = v[i] === undefined ? '' : v[i]; }); return o; });
}

/**
 * @param cfg.righe      array di oggetti, oppure
 * @param cfg.csv        il testo di un CSV
 * @param cfg.anno       la colonna dell'anno (default "anno")
 * @param cfg.mese       la colonna del mese, 1-12 (assente = dati annuali)
 * @param cfg.dimensioni [{ id, colonna, etichetta?, membri: [{ id, n, c?, parent? }], parentDim? }]
 *                       i membri dichiarati sono gli unici ammessi, nell'ordine dichiarato;
 *                       una dimensione padre (senza colonna) si dichiara con solo id e membri
 * @param cfg.campi      le colonne numeriche (i nomi diventano i campi dei fatti)
 * @returns il `data` del motore: { dims, years, mensili, facts: {cols, rows}, fonte }
 */
function carica(cfg) {
  if (!cfg || typeof cfg !== 'object') fail('manca la configurazione');
  const righe = cfg.righe || (cfg.csv !== undefined ? leggiCSV(cfg.csv) : null);
  if (!Array.isArray(righe) || !righe.length) fail('nessuna riga');
  const colAnno = cfg.anno || 'anno', colMese = cfg.mese || null;
  const dimsCfg = cfg.dimensioni || [];
  const campi = cfg.campi || [];
  if (!campi.length) fail('nessun campo numerico dichiarato ("campi")');
  const fatti = dimsCfg.filter(d => d.colonna);
  if (!fatti.length) fail('serve almeno una dimensione con la sua colonna');

  const dims = {};
  dimsCfg.forEach(d => {
    if (!d.id || !Array.isArray(d.membri) || !d.membri.length) fail(`la dimensione "${d.id}" non ha membri`);
    const visti = new Set();
    dims[d.id] = d.membri.map(m => {
      if (!m.id || !m.n) fail(`un membro di "${d.id}" non ha id e nome`);
      if (visti.has(m.id)) fail(`il membro "${m.id}" di "${d.id}" e dichiarato due volte`);
      visti.add(m.id);
      const o = { id: m.id, n: m.n, c: m.c || null };
      if (m.parent) o.parent = m.parent;
      if (m.parentDim || d.parentDim) o.parentDim = m.parentDim || d.parentDim;
      if (m.brand) o.brand = true;
      return o;
    });
  });

  const idx = {};
  Object.keys(dims).forEach(k => { idx[k] = {}; dims[k].forEach((m, i) => { idx[k][m.id] = i; }); });
  const num = (v, dove) => {
    if (v === '' || v === null || v === undefined) return 0;
    const x = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(x)) fail(`${dove}: "${v}" non e un numero`);
    return x;
  };

  /* le righe con la stessa chiave si sommano: e cio che fa Power BI con una tabella non aggregata */
  const somme = new Map();
  let annoMin = Infinity, annoMax = -Infinity;
  const anniConMesi = new Set();
  righe.forEach((r, i) => {
    const y = Number(r[colAnno]);
    if (!Number.isInteger(y) || y < 1800 || y > 2200) fail(`riga ${i + 1}: l'anno "${r[colAnno]}" non e un anno`);
    let m = 0;
    if (colMese) {
      m = Number(r[colMese]);
      if (!Number.isInteger(m) || m < 1 || m > 12) fail(`riga ${i + 1}: il mese "${r[colMese]}" non e fra 1 e 12`);
      m -= 1; anniConMesi.add(y);
    }
    annoMin = Math.min(annoMin, y); annoMax = Math.max(annoMax, y);
    const chiave = [y, m].concat(fatti.map(d => {
      const v = r[d.colonna];
      if (!(v in idx[d.id])) fail(`riga ${i + 1}: "${v}" non e un membro di "${d.id}" (membri: ${dims[d.id].map(x => x.id).join(', ')})`);
      return idx[d.id][v];
    }));
    const k = chiave.join('|');
    if (!somme.has(k)) somme.set(k, chiave.concat(campi.map(() => 0)));
    const riga = somme.get(k);
    campi.forEach((c, j) => { riga[chiave.length + j] += num(r[c], `riga ${i + 1}, colonna "${c}"`); });
  });

  /* gli anni sono una serie contigua: la finestra del report seleziona un intervallo */
  const years = [];
  for (let y = annoMin; y <= annoMax; y++) years.push(y);
  const cols = ['y', 'm'].concat(fatti.map(d => d.id)).concat(campi);
  const rows = [...somme.values()].filter(r => r.slice(2 + fatti.length).some(x => x !== 0));
  if (rows.length * cols.length > TETTO_CELLE)
    fail(`${rows.length} righe per ${cols.length} colonne sono troppe per un mockup (tetto ${TETTO_CELLE} celle): aggrega una dimensione o accorcia il periodo`);
  rows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const etichette = {};
  dimsCfg.forEach(d => { if (d.etichetta) etichette[d.id] = d.etichetta; });
  return {
    dims, years, etichette,
    /* quali anni hanno i dodici mesi: nessuno, se i dati sono annuali */
    mensili: colMese ? years.filter(y => anniConMesi.has(y)) : [],
    facts: { cols, rows },
    fonte: cfg.fonte || null,
    tieOut: {}
  };
}

module.exports = { carica, leggiCSV, TETTO_CELLE };
