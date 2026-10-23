/* I LAYOUT DEI PANNELLI — la grammatica dei codici di Pruva (skill/references/flusso.md).
 *
 * Un codice descrive la parte della pagina sotto la riga KPI: le righe sono separate da "/", le
 * colonne di una riga da "+", e ogni numero e uno SPAN sulla griglia della pagina. "3+2/5" sono due
 * pannelli (3 e 2 colonne) sopra un pannello largo 5. Ogni riga somma alle colonne della pagina:
 * non esiste un layout fuori griglia, quindi ogni layout passa i gate di geometria ed e
 * ricostruibile in Power BI.
 */
'use strict';

const MAX_RIGHE = 3, MAX_PER_RIGA = 3, MAX_COLONNE = 12;

/** "3+2/5" -> [[3,2],[5]]; null se il codice non e scritto bene. */
function leggi(codice) {
  if (typeof codice !== 'string' || !/^\d+(\+\d+)*(\/\d+(\+\d+)*)*$/.test(codice.trim())) return null;
  return codice.trim().split('/').map(r => r.split('+').map(Number));
}
function scrivi(righe) { return righe.map(r => r.join('+')).join('/'); }

/** I rifiuti di un codice su una griglia di `nc` colonne. */
function valida(codice, nc) {
  const r = leggi(codice);
  if (!r) return [`layout "${codice}": un codice e fatto di span separati da "+" (colonne) e "/" (righe), es. 3+2/5`];
  const e = [];
  if (r.length > MAX_RIGHE) e.push(`layout "${codice}": al massimo ${MAX_RIGHE} righe di pannelli`);
  r.forEach((riga, i) => {
    if (riga.length > MAX_PER_RIGA) e.push(`layout "${codice}": la riga ${i + 1} ha ${riga.length} pannelli, al massimo ${MAX_PER_RIGA}`);
    if (riga.some(x => x < 1)) e.push(`layout "${codice}": uno span vale almeno 1`);
    const s = riga.reduce((a, b) => a + b, 0);
    if (nc && s !== nc) e.push(`layout "${codice}": la riga ${i + 1} occupa ${s} colonne e la griglia della pagina ne ha ${nc}`);
  });
  return e;
}

/** Le colonne che il codice dichiara (la somma della prima riga). */
function colonne(codice) { const r = leggi(codice); return r ? r[0].reduce((a, b) => a + b, 0) : 0; }

/* le partizioni di n in 1..3 parti, ordinate dalla piu larga a sinistra */
function partizioni(n) {
  const out = [[n]];
  for (let a = n - 1; a >= 1; a--) out.push([a, n - a]);
  for (let a = n - 2; a >= 1; a--) for (let b = n - a - 1; b >= 1; b--) out.push([a, b, n - a - b]);
  return out;
}

/** Il catalogo per una griglia di nc colonne, raggruppato per forma (righe x pannelli). */
function catalogo(nc) {
  if (!nc || nc < 1 || nc > MAX_COLONNE) return [];
  const P = partizioni(nc).filter(p => p.length === 1 || nc >= p.length);
  const codici = new Set();
  P.forEach(a => codici.add(scrivi([a])));
  P.forEach(a => P.forEach(b => codici.add(scrivi([a, b]))));
  P.filter(p => p.length <= 2).forEach(a => P.filter(p => p.length <= 2).forEach(b => codici.add(scrivi([a, b, [nc]]))));
  return [...codici].map(c => {
    const r = leggi(c);
    return { codice: c, righe: r.length, pannelli: r.reduce((a, x) => a + x.length, 0), forma: r.map(x => x.length).join('-') };
  }).sort((x, y) => x.righe - y.righe || x.pannelli - y.pannelli);
}

/** Cerca per codice compatto: "3+2" trova tutti i layout che contengono quella riga. */
function cerca(nc, testo) {
  const t = String(testo || '').replace(/\s/g, '');
  return catalogo(nc).filter(l => !t || l.codice.indexOf(t) >= 0);
}

/* IL LAYOUT CONSIGLIATO, dalla domanda della pagina (layout-archetypes.md): l'apertura e la chiusura
   di ogni archetipo, tradotte in proporzioni sulla griglia della pagina. */
function consigliato(nc, archetipo) {
  const largo = Math.max(1, Math.ceil(nc * 0.6)), stretto = nc - largo;
  const due = stretto ? [largo, stretto] : [nc];
  const forme = {
    scorecard: [due, [nc]],                          // trend + supporto, poi la tabella
    'executive-summary': [[nc], stretto ? [stretto, largo] : [nc]],   // un visual dominante, una riga di supporto
    funnel: [due, [nc]],                             // funnel e conversione, poi le fonti
    quadrants: [due, [nc]],                          // lo scatter grande, poi heatmap o tabella
    bridge: [[nc], due],                             // il ponte, poi il trend di cassa
    cohorts: [[nc], [nc]],                           // la heatmap delle coorti, poi la tabella
    operational: [due, [nc]]                         // heatmap + gauge, poi la tabella densa
  };
  return scrivi(forme[archetipo] || forme.scorecard);
}

module.exports = { leggi, scrivi, valida, colonne, catalogo, cerca, consigliato, MAX_COLONNE };
