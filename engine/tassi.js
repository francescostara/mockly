/* I TASSI DEVONO RACCONTARE QUALCOSA — per dimensione e negli anni.
 *
 * Nel mockup di Muttahar (2 ott 2026) i tassi di servizio stavano sui magazzini e le regioni
 * ricevevano solo una quota degli ordini: dieci regioni tutte al 90,2% di OTIF, una heatmap senza
 * celle calde, una classifica di pareggi, una tabella per regione che non diceva niente. E i tassi
 * erano gli stessi ogni anno, quindi ogni confronto con l'anno prima usciva piatto. Il tester:
 * "the data lacks diversity". Nessun gate guardava i NUMERI di un tasso, solo la sua forma.
 *
 * Due controlli sui dati generati, letti attraverso le misure della spec:
 *  - un tasso (misura ratio in percentuale) mostrato per una dimensione deve differire fra i suoi
 *    membri: se tutti stanno entro un punto, il visual mostra pareggi;
 *  - fra i tassi della banda KPI almeno uno deve muoversi fra gli anni: se tutti stanno fermi
 *    entro due decimi di punto, ogni confronto col periodo precedente e piatto.
 * La cura sta nei dati: `mod` (il tasso spostato da un'altra dimensione) e gli attr con un valore
 * per anno (engine/data-params.md).
 */
'use strict';

/* piatto = sotto la soglia in punti E in proporzione: un engagement dello 0,6% che sale al 0,7%
   si muove (+15%) anche se in punti fa un decimo */
const SOGLIA_MEMBRI = 0.01, REL_MEMBRI = 0.05;    // un punto, 5%
const SOGLIA_ANNI = 0.002, REL_ANNI = 0.03;       // due decimi di punto, 3%
const fermo = (a, b, ass, rel) => Math.abs(a - b) < ass && Math.abs(a - b) < rel * Math.max(Math.abs(a), Math.abs(b));

function tassiPiatti(spec, data) {
  const out = [];
  if (!data || !data.facts || !data.facts.cols || !spec || !spec.model) return out;
  const cols = data.facts.cols, ix = {};
  cols.forEach((c, i) => { ix[c] = i; });
  const mis = {};
  (spec.model.measures || []).forEach(m => { mis[m.id] = m; });
  const sums = new Set(spec.model.sums || []);
  /* il valore di una misura su un gruppo di righe; null se non si sa calcolare qui */
  const valore = (id, righe, prof) => {
    if ((prof || 0) > 8) return null;
    const m = mis[id];
    if (!m) return sums.has(id) && id in ix ? righe.reduce((a, r) => a + (+r[ix[id]] || 0), 0) : null;
    if (m.agg === 'sum') return m.field in ix ? righe.reduce((a, r) => a + (+r[ix[m.field]] || 0), 0) : null;
    if (m.agg === 'diff') { const a = valore(m.a, righe, (prof || 0) + 1), b = valore(m.b, righe, (prof || 0) + 1); return a === null || b === null ? null : a - b; }
    if (m.agg === 'ratio') { const n = valore(m.num, righe, (prof || 0) + 1), d = valore(m.den, righe, (prof || 0) + 1); return n === null || !d ? null : n / d; }
    return null;
  };
  const tasso = id => mis[id] && mis[id].agg === 'ratio' && mis[id].unit === 'pct';
  const righe = data.facts.rows;
  const anni = [...new Set(righe.map(r => r[ix.y]))].sort();
  const ultimo = righe.filter(r => r[ix.y] === anni[anni.length - 1]);

  /* 1. per dimensione */
  const coppie = new Map();
  const visita = v => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(visita); return; }
    const b = v.bind;
    if (b && typeof b === 'object') {
      const dims = [b.dim, b.by].filter(d => typeof d === 'string' && d in ix);
      const ms = [b.measure, b.line, b.subMeasure, ...((b.columns || []).filter(c => c && c.kind !== 'var').map(c => c.measure))]
        .filter(m => typeof m === 'string' && tasso(m));
      dims.forEach(d => ms.forEach(m => coppie.set(d + '|' + m, [d, m, v.title || v.type])));
    }
    Object.keys(v).forEach(k => { if (k !== 'bind') visita(v[k]); });
  };
  visita(spec.pages);
  coppie.forEach(([d, m, dove]) => {
    const gruppi = {};
    ultimo.forEach(r => { (gruppi[r[ix[d]]] = gruppi[r[ix[d]]] || []).push(r); });
    const val = Object.keys(gruppi).map(k => valore(m, gruppi[k])).filter(x => x !== null && isFinite(x));
    if (val.length < 3) return;
    const lo = Math.min(...val), hi = Math.max(...val);
    if (fermo(lo, hi, SOGLIA_MEMBRI, REL_MEMBRI))
      out.push(`"${dove}": ${mis[m].label || m} is the same for every ${d} (${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}%), so the visual shows ties — give ${d} its own rates: "mod": { "from": "${d}", "attr": … } on the rate field, or attrFrom`);
  });

  /* 2. negli anni */
  if (anni.length >= 2) {
    const kpi = [...new Set((spec.kpiBand || []).map(k => k.measure).filter(tasso))];
    const perAnno = kpi.map(m => anni.map(y => valore(m, righe.filter(r => r[ix.y] === y))));
    if (kpi.length && perAnno.every(s => s.every(x => x !== null) && s.every((x, i) => !i || fermo(x, s[i - 1], SOGLIA_ANNI, REL_ANNI))))
      out.push(`every KPI rate (${kpi.join(', ')}) is flat across the years, so every comparison with the prior period is flat — give the rates that tell the story a value per year: "attr": [v${anni[0]}, …, v${anni[anni.length - 1]}]`);
  }
  return out;
}

module.exports = { tassiPiatti };
