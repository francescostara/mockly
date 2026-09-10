/* data-builder.js — run a declarative `dataParams` (see data-params.md) into a reconciled
 * dataset for render(spec, data).
 *
 * This is the bridge between the judgement layer (an LLM declares segment character and how
 * each measure derives) and data-model.js (seeded generation, rescale, IPF). It adds no new
 * statistics — it only sequences the primitives that already exist.
 */
'use strict';
const MK = require('./runtime.js');
const DM = require('./data-model.js');

const RAMP = ['#12304F', '#1F4E79', '#4A7FA8', '#7FA8C6', '#8FB3CC', '#C6D7E4', '#A8926E', '#D8C7A6'];
const DEFAULT_SEAS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

function fail(msg) { const e = new Error(msg); e.dataParams = true; throw e; }

/* Un esempio minimo ma COMPLETO, incollabile: l'errore non descrive il problema, mostra la
   cura. Il modello copia la forma che vede, quindi la forma va messa nel messaggio. */
function dimExample(dimId) {
  return `"${dimId}": { "members": [ ` +
    `{ "id": "a", "n": "Nome A", "base": 42000, "growth": 0.14, "attrs": {} }, ` +
    `{ "id": "b", "n": "Nome B", "base": 31000, "growth": -0.09, "attrs": {} } ] }`;
}

/* I membri NON sono un accessorio della dimensione: sono la dimensione. Ogni messaggio qui
   dice il nome della dim, dove va messo l'array e come e fatto un membro — perche il giro di
   riparazione sia chirurgico invece di un tiro a indovinare (nell'eval un giro di riparazione
   ha ripetuto lo stesso errore: il messaggio non insegnava dove intervenire). */
function members(dp, dimId, what) {
  const dims = (dp && dp.dims) || {};
  const present = Object.keys(dims);
  const d = dims[dimId];
  if (!d || typeof d !== 'object' || Array.isArray(d)) {
    fail(`dataParams.dims["${dimId}"] non esiste, ma ${what} la richiede: aggiungila dentro ` +
      `dataParams.dims con i suoi membri co-locati — ${dimExample(dimId)}. ` +
      `Dimensioni dichiarate: ${present.length ? present.join(', ') : 'nessuna'}.`);
  }
  if (!Array.isArray(d.members) || !d.members.length) {
    const stray = Object.keys(d).filter(k => k !== 'members');
    fail(`dataParams.dims["${dimId}"] manca "members" (la usa ${what}): aggiungi l'array dei ` +
      `membri DENTRO questa dimensione, non altrove — ${dimExample(dimId)}. ` +
      (stray.length ? `Qui dentro c'e solo: ${stray.join(', ')}.` : `L'oggetto e vuoto.`) +
      ` Una dimensione senza membri non e dichiarabile: dichiararla significa popolarla.`);
  }
  d.members.forEach((m, i) => {
    const where = `dataParams.dims["${dimId}"].members[${i}]`;
    if (!m || typeof m !== 'object') fail(`${where} non e un oggetto membro — ${dimExample(dimId)}.`);
    if (!m.id) fail(`${where} manca "id" (slug breve, es. "a") — ${dimExample(dimId)}.`);
    if (!m.n) fail(`${where} ("${m.id}") manca "n", l'etichetta che il lettore vede — ${dimExample(dimId)}.`);
    if (typeof m.base !== 'number' || !isFinite(m.base)) {
      fail(`${where} ("${m.id}") manca "base" numerico: e il valore mensile della misura primaria ` +
        `nel primo anno, senza il quale ogni numero del membro esce NaN — ${dimExample(dimId)}.`);
    }
  });
  return d.members;
}

/* one field's value for one row */
function evalField(f, row, own, split, ctx) {
  const j = ctx.j, yi = ctx.yi;
  const attrsOf = f.attrFrom === 'split' ? (split && split.attrs) || {} : own.attrs || {};
  switch (f.kind) {
    case 'seasonal': {
      const jit = f.jitter || [.93, 1.07];
      /* La stagionalita del membro vince su quella globale. Senza, dentro un anno i ranghi fra
         i membri non cambiano mai — la crescita agisce FRA gli anni — e un ribbon, che esiste
         per mostrare i sorpassi, degenera in un area chart con le fasce parallele. */
      const seas = (own.seasonality && own.seasonality.length === 12) ? own.seasonality : ctx.seas;
      return own.base * Math.pow(1 + (own.growth || 0), yi) * seas[row.m] * j(jit[0], jit[1]);
    }
    case 'share': {
      const base = row[f.of];
      if (base === undefined) fail(`field "${f.id}" reads "${f.of}" before it is declared`);
      let rate = attrsOf[f.attr];
      if (rate === undefined) fail(`field "${f.id}" needs attrs.${f.attr} on the members of ${f.attrFrom === 'split' ? 'the split dim' : ctx.dim}`);
      if (f.growthFactor && yi === ctx.years.length - 1) rate *= f.growthFactor;
      const jit = f.jitter || [.9, 1.1];
      rate *= j(jit[0], jit[1]);
      if (f.cap !== undefined) rate = Math.min(f.cap, rate);
      return base * (f.complement ? 1 - rate : rate);
    }
    case 'divide': {
      const base = row[f.of];
      if (base === undefined) fail(`field "${f.id}" reads "${f.of}" before it is declared`);
      const den = attrsOf[f.attr];
      if (!den) fail(`field "${f.id}" needs a non-zero attrs.${f.attr}`);
      const jit = f.jitter || [.85, 1.15];
      return Math.max(f.min === undefined ? 1 : f.min, Math.round(base / (den * j(jit[0], jit[1]))));
    }
    case 'combine': {
      const plus = (f.plus || []).reduce((a, k) => a + (row[k] || 0), 0);
      const minus = (f.minus || []).reduce((a, k) => a + (row[k] || 0), 0);
      return plus - minus;
    }
    default:
      fail(`field "${f.id}": unknown kind "${f.kind}" (seasonal | share | divide | combine)`);
  }
}

function build(dp) {
  if (!dp || typeof dp !== 'object') fail('dataParams is missing');
  const years = dp.years || [2024, 2025];
  if (years.length !== 2) fail('dataParams.years must hold exactly two years (prior, current)');
  const seas = (dp.seasonality && dp.seasonality.length === 12) ? dp.seasonality : DEFAULT_SEAS;
  const facts = dp.facts || fail('dataParams.facts is missing');
  const fields = facts.fields || [];
  if (!fields.length || fields[0].kind !== 'seasonal') fail('facts.fields[0] must be the primary measure with kind:"seasonal"');

  const { j } = DM.rng(dp.seed || 20260101);
  const dimId = facts.dim || fail('facts.dim is missing');
  const own = members(dp, dimId, 'facts.dim');
  own.forEach((m, i) => { if (!m.c) m.c = RAMP[i % RAMP.length]; });

  const splitCfg = facts.split || null;
  let splitMembers = null;
  if (splitCfg) {
    splitMembers = members(dp, splitCfg.dim, 'facts.split.dim');
    splitMembers.forEach((m, i) => { if (!m.c) m.c = RAMP[i % RAMP.length]; });
    if (own.length * splitMembers.length > 60) fail('the joint grain is too large: keep members(dim) x members(split) under 60');
  }

  /* ---- 1. the primary measure at the facts.dim grain ---- */
  const prim = fields[0];
  const rows = [];
  years.forEach((y, yi) => own.forEach(mb => {
    for (let m = 0; m < 12; m++) {
      const ctx = { j, yi, seas, years, dim: dimId };
      const r = { y, m, [dimId]: mb.id, __own: mb };
      r[prim.id] = Math.round(evalField(prim, r, mb, null, ctx));
      rows.push(r);
    }
  }));

  /* ---- 2. optional second dimension: one joint grain fitted with IPF ---- */
  let grain = rows;
  if (splitCfg) {
    const ownTot = own.map(mb => ({ id: mb.id, v: DM.sum(rows.filter(r => r[dimId] === mb.id), prim.id) }));
    const grand = ownTot.reduce((a, o) => a + o.v, 0);
    const shares = splitCfg.shares && splitCfg.shares.length === splitMembers.length
      ? splitCfg.shares
      : splitMembers.map(() => 1 / splitMembers.length);
    const splitTot = splitMembers.map((mb, i) => ({ id: mb.id, v: grand * shares[i] }));
    const joint = DM.jointRows(dimId, splitCfg.dim, ownTot, splitTot, prim.id, () => 1 + j(0, 1.2));
    const mix = {};
    own.forEach(mb => {
      const mine = joint.filter(r => r[dimId] === mb.id), s = DM.sum(mine, prim.id) || 1;
      mix[mb.id] = splitMembers.map(sm => (mine.filter(r => r[splitCfg.dim] === sm.id)[0] || {})[prim.id] / s || 0);
    });
    grain = [];
    rows.forEach(r => {
      const parts = splitMembers.map((sm, k) => ({ sm: sm, [prim.id]: r[prim.id] * mix[r[dimId]][k] }));
      DM.rescaleInt(parts, prim.id, r[prim.id], { min: 0 });   /* the split ties to its parent month */
      parts.forEach(p => {
        const o = { y: r.y, m: r.m, [dimId]: r[dimId], [splitCfg.dim]: p.sm.id, __own: r.__own, __split: p.sm };
        o[prim.id] = p[prim.id];
        grain.push(o);
      });
    });
  }

  /* ---- 3. the derived fields, in declared order ---- */
  years.forEach((y, yi) => {
    grain.filter(r => r.y === y).forEach(r => {
      const ctx = { j, yi, seas, years, dim: dimId };
      for (let i = 1; i < fields.length; i++) {
        const f = fields[i];
        r[f.id] = Math.round(evalField(f, r, r.__own, r.__split, ctx));
        /* Un campo puo esistere SOLO per certi membri di una dimensione: la spesa paid non
           esiste sull'organico, il costo di spedizione non esiste sul ritiro in negozio.
           Senza dirlo, il generatore lo distribuisce ovunque e il filtro "Organico" lascia la
           spesa paid invariata — un filtro che non fa niente, travestito da filtro che funziona.
           La cura sta nel DATO, non a valle: fuori dai membri dichiarati il campo vale zero, e
           il filtro lo azzera da solo perche e vero. */
        if (f.only && f.only.dim && Array.isArray(f.only.members)) {
          const mio = r[f.only.dim];
          if (mio !== undefined && f.only.members.indexOf(mio) < 0) r[f.id] = 0;
        }
      }
    });
  });

  /* ---- 4. optional detail grain as a share model ---- */
  /* `brand` viaggia fino al render: e il flag che dice "questa tinta e l'identita, non una
     scelta estetica" — Instagram rosa, TikTok nero — e senza di lui il motore sostituirebbe
     quei colori con la scala verificata della palette, che qui sarebbe la cosa sbagliata. */
  const cm = m => Object.assign({ id: m.id, n: m.n, c: m.c }, m.brand ? { brand: true } : {});
  const dims = { [dimId]: own.map(cm) };
  if (splitCfg) dims[splitCfg.dim] = splitMembers.map(cm);

  let detailModel = null;
  if (dp.detail && dp.detail.dim) {
    const d = dp.detail;
    const parentDim = d.parentDim || dimId;
    const parents = dims[parentDim] || fail(`detail.parentDim "${parentDim}" is not a fact dimension`);
    const kids = [], groups = {};
    parents.forEach(p => {
      const names = (d.members || {})[p.id] || [];
      if (!names.length) {
        fail(`dataParams.detail.members non ha voci per il genitore "${p.id}" (${p.n}): ogni ` +
          `membro di "${parentDim}" vuole i suoi figli, es. "members": { "${p.id}": ["Figlio A", ` +
          `"Figlio B", "Figlio C"] }. Genitori da coprire: ${parents.map(x => x.id).join(', ')}.`);
      }
      groups[p.id] = names.map(n => p.id + ':' + n);
      names.forEach(n => kids.push({ id: p.id + ':' + n, n: n, c: p.c, parent: p.id, parentDim: parentDim }));
    });
    dims[d.dim] = kids;
    const shares = DM.shareVector(groups, j);
    detailModel = {
      dim: d.dim, parentDim: parentDim,
      fields: (d.fields && d.fields.length) ? d.fields : [prim.id],
      shares: Object.keys(shares).reduce((o, k) => (o[k] = Math.round(shares[k] * 1e5) / 1e5, o), {})
    };
    if (d.counts && d.counts.field) detailModel.counts = { field: d.counts.field, from: d.counts.from || d.counts.field };
  }

  /* ---- 5. serialise ---- */
  const idx = {};
  Object.keys(dims).forEach(k => { idx[k] = {}; dims[k].forEach((m, i) => idx[k][m.id] = i); });
  const factDims = splitCfg ? [dimId, splitCfg.dim] : [dimId];
  const cols = ['y', 'm'].concat(factDims).concat(fields.map(f => f.id));
  const data = {
    dims: dims,
    years: years,
    facts: { cols: cols, rows: grain.map(r => cols.map(c => idx[c] ? idx[c][r[c]] : r[c])) },
    tieOut: {}
  };
  if (detailModel) data.detailModel = detailModel;

  /* the tie-out the harness checks: the detail grain reproduces its parent exactly */
  if (detailModel) {
    const F = MK.materialize(data.facts, dims);
    const kids = MK.expandDetail(F, dims, detailModel);
    detailModel.fields.forEach(f => {
      const a = Math.round(DM.sum(F, f)), b = Math.round(DM.sum(kids, f));
      data.tieOut[f + '_facts'] = a; data.tieOut[f + '_detail'] = b; data.tieOut[f + '_delta'] = a - b;
    });
  }
  data.tieOut[prim.id + '_total'] = Math.round(DM.sum(grain, prim.id));
  return data;
}

module.exports = { build };
