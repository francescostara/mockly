/* Build the Nodo & Trama report: generate the data, render, write out/nodo-trama.html.
 *
 * The generator mirrors the canonical's model exactly — same seed, same draw order — so the
 * figures land on the canonical's numbers, not merely on plausible ones.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const MK = require('../runtime.js');
const { render, lint, toolbarBudget } = require('../render.js');
const DM = require('../data-model.js');
const spec = require('./nodo-trama.spec.js');

const SEED = 90417;

/* categories carry a character each: a declining flagship, a growing modern line, … */
const CATS = [
  { id: 'per', n: 'Persiani & Orientali', aov: 1200, base: 41000, gr: -.086, mg: .42, onl: .05, c: '#12304F' }, /* the negative storyline */
  { id: 'mod', n: 'Moderni Design', aov: 560, base: 30000, gr: .224, mg: .52, onl: .28, c: '#1F4E79' },
  { id: 'sum', n: 'Su Misura', aov: 1850, base: 22000, gr: .141, mg: .63, onl: .04, c: '#4A7FA8' },
  { id: 'kil', n: 'Kilim & Berberi', aov: 330, base: 16500, gr: .061, mg: .55, onl: .19, c: '#7FA8C6' },
  { id: 'pas', n: 'Passatoie', aov: 185, base: 9000, gr: .028, mg: .48, onl: .22, c: '#8FB3CC' },
  { id: 'vin', n: 'Vintage', aov: 880, base: 7000, gr: -.012, mg: .58, onl: .12, c: '#C6D7E4' }
];
const MODELS = {
  per: ['Tabriz 200×300', 'Kashan medaglione', 'Heriz antico', 'Nain in seta', 'Bidjar rosso', 'Shirvan caucasico'],
  mod: ['Astratto grigio 170×240', 'Shaggy panna', 'Geometrico ottanio', 'Optical B/N', 'Sfumato blu', 'Minimal sabbia'],
  sum: ['Su misura salotto', 'Su misura scale', 'Su misura ufficio', 'Intarsio logo', 'Tondo su misura'],
  kil: ['Kilim anatolico', 'Beni Ourain', 'Kilim navajo', 'Zanafi crema'],
  pas: ['Passatoia classica 80×300', 'Runner moderno', 'Passatoia cucina', 'Guida orientale'],
  vin: ['Vintage overdyed', 'Patchwork vintage', 'Vintage distressed', 'Heriz rimodernato']
};
const YRS = [2024, 2025];
const SEAS = [.82, .80, .92, .95, .88, .74, .62, .70, 1.12, 1.30, 1.42, 1.28];   /* autumn/winter peak */
const ONLGROW = 1.9;                                                            /* online nearly doubles YoY off a small base */

function build() {
  const R = MK.mulberry32(SEED), j = (a, b) => a + R() * (b - a);
  const catIdx = {}; CATS.forEach((c, i) => catIdx[c.id] = i);
  const modMembers = [];
  /* parentDim lets the runtime derive r.cat from the model, so detail rows need no cat column */
  Object.keys(MODELS).forEach(cid => MODELS[cid].forEach(n => modMembers.push({ id: cid + ':' + n, n: n, c: CATS[catIdx[cid]].c, parent: cid, parentDim: 'cat' })));

  /* ---- category grain: trend x seasonality x modest jitter ---- */
  const facts = DM.genMonthly({
    j, years: YRS, seas: SEAS, dim: 'cat',
    members: CATS.map(c => Object.assign({ growth: c.gr }, c)),
    row: (rev, cat, yi) => {
      const onlShare = cat.onl * (yi === 1 ? ONLGROW : 1) * j(.85, 1.15);
      const mg = cat.mg * j(.97, 1.03);
      return {
        rev: Math.round(rev),
        cost: Math.round(rev * (1 - mg)),
        pieces: Math.max(1, Math.round(rev / (cat.aov * j(.85, 1.18)))),
        online: Math.round(rev * Math.min(.6, onlShare))
      };
    }
  });

  /* ---- model grain: a share vector per category, not ~700 literal rows.
         The runtime expands it against each fact row, so models always tie to their
         category exactly (data-realism.md "rescale to target", done at read time). ---- */
  const shares = DM.shareVector(
    Object.keys(MODELS).reduce((o, cid) => (o[cid] = MODELS[cid].map(n => cid + ':' + n), o), {}), j);

  const dims = { cat: CATS.map(c => ({ id: c.id, n: c.n, c: c.c })), mod: modMembers };
  return {
    dims, years: YRS,
    facts: {
      cols: ['y', 'm', 'cat', 'rev', 'cost', 'pieces', 'online'],
      rows: facts.map(f => [f.y, f.m, catIdx[f.cat], f.rev, f.cost, f.pieces, f.online])
    },
    detailModel: {
      dim: 'mod', parentDim: 'cat', fields: ['rev'],
      counts: { field: 'pieces', from: 'pieces' },
      shares: Object.keys(shares).reduce((o, k) => (o[k] = Math.round(shares[k] * 1e5) / 1e5, o), {})
    },
    tieOut: DM.tieOut(facts, MK.expandDetail(MK.materialize(
      { cols: ['y', 'm', 'cat', 'rev', 'cost', 'pieces', 'online'], rows: facts.map(f => [f.y, f.m, catIdx[f.cat], f.rev, f.cost, f.pieces, f.online]) },
      dims), dims, { dim: 'mod', parentDim: 'cat', fields: ['rev'], counts: { field: 'pieces', from: 'pieces' }, shares }),
      ['rev', 'pieces'])
  };
}

if (require.main === module) {
  const data = build();
  const html = render(spec, data);
  const out = path.join(__dirname, '..', '..', 'out');
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, 'nodo-trama.html');
  fs.writeFileSync(file, html);

  const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`wrote ${path.relative(process.cwd(), file)}  ${kb}KB  ${html.split('\n').length} lines`);
  console.log('tie-out:', JSON.stringify(data.tieOut));
  const tb = toolbarBudget(spec, data);
  console.log(`toolbar (${tb.axis}): ${tb.used}px / ${tb.available}px available`);
  lint(spec, data).forEach(w => console.log('advisory:', w));
}

module.exports = { build, CATS, MODELS, SEED };
