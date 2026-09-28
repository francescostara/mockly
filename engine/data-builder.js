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
function evalField(f, row, own, split, ctx, splits) {
  const j = ctx.j, yi = ctx.yi;
  /* `attrFrom`: "split" legge il primo split (la forma storica); il NOME di una dimensione dei
     fatti legge i membri di quella — serve quando gli split sono due e il campo dipende dal
     secondo (lo sconto dalla regione, la quota del segmento dal segmento). */
  const daSplit = f.attrFrom === 'split' ? split
    : f.attrFrom && f.attrFrom !== ctx.dim ? (splits || {})[f.attrFrom] : null;
  if (f.attrFrom && f.attrFrom !== 'split' && f.attrFrom !== ctx.dim && splits && !(f.attrFrom in splits))
    fail(`field "${f.id}": attrFrom "${f.attrFrom}" non e una dimensione dei fatti (usa "split", o il nome di facts.dim o di uno split)`);
  const attrsOf = daSplit ? daSplit.attrs || {} : own.attrs || {};
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
      if (rate === undefined) fail(`field "${f.id}" needs attrs.${f.attr} on the members of ${f.attrFrom && f.attrFrom !== ctx.dim ? (f.attrFrom === 'split' ? 'the split dim' : f.attrFrom) : ctx.dim}`);
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

/** Gli split di facts, sempre come elenco: un oggetto e la forma storica, un array la nuova.
 *  Chi legge facts.split fuori da qui passa da questa funzione, o vede solo il primo. */
const splitsOf = facts => (facts && facts.split) ? (Array.isArray(facts.split) ? facts.split : [facts.split]) : [];

function build(dp) {
  if (!dp || typeof dp !== 'object') fail('dataParams is missing');
  const years = dp.years || [2024, 2025];
  /* DUE ANNI SONO IL MINIMO, NON IL MASSIMO. Il minimo perche senza l'anno precedente ogni
     variazione e inventata; il massimo era una restrizione che non serviva a niente e impediva
     l'unica cosa che una storia lunga permette — guardarne tre dei dieci che si hanno.
     Il tetto e la dimensione del file: gli anni moltiplicano le righe dei fatti, che viaggiano
     dentro l'HTML, e oltre la dozzina il mockup diventa pesante senza diventare piu vero. */
  if (years.length < 2) fail('dataParams.years: servono almeno due anni (il precedente e il corrente) — es. [2024, 2025]');
  if (years.length > 12) fail(`dataParams.years: ${years.length} anni sono troppi (massimo 12): gli anni moltiplicano le righe dei fatti, che viaggiano dentro l'HTML`);
  for (let i = 1; i < years.length; i++) {
    if (years[i] !== years[i - 1] + 1) {
      fail(`dataParams.years deve essere una serie CONTIGUA e crescente (${years.join(', ')}): la finestra temporale del report seleziona un intervallo, e un buco fra gli anni la renderebbe una selezione che il lettore non puo esprimere`);
    }
  }
  const seas = (dp.seasonality && dp.seasonality.length === 12) ? dp.seasonality : DEFAULT_SEAS;
  const facts = dp.facts || fail('dataParams.facts is missing');
  const fields = facts.fields || [];
  if (!fields.length || fields[0].kind !== 'seasonal') fail('facts.fields[0] must be the primary measure with kind:"seasonal"');

  const { j } = DM.rng(dp.seed || 20260101);
  const dimId = facts.dim || fail('facts.dim is missing');
  const own = members(dp, dimId, 'facts.dim');
  own.forEach((m, i) => { if (!m.c) m.c = RAMP[i % RAMP.length]; });

  /* LE DIMENSIONI DELLO SPLIT: una o due. Il brief di Parsa (27 set 2026) chiedeva quattro
     filtri — data, regione, categoria, segmento cliente — e il generatore ne reggeva due: il
     segmento era finito in tre colonne di una matrice, un filtro chiesto e non dato. Il runtime
     filtra gia su qualunque colonna dei fatti; mancava solo chi le scrive.
     `split` e un oggetto (una dimensione) o un array di due (due dimensioni). Ognuna si adatta
     alla dimensione principale con la sua IPF, indipendente dall'altra: il mix dei segmenti
     dipende dalla categoria, non dalla regione. Con una sola dimensione la sequenza casuale e
     identica a prima — i mockup gia consegnati non cambiano di un byte. */
  const splitList = splitsOf(facts);
  if (splitList.length > 2) fail('facts.split: al massimo due dimensioni (tre filtri in tutto con facts.dim): oltre, il grano dei fatti moltiplica le righe che viaggiano dentro il file HTML');
  const splitCfg = splitList[0] || null;
  const splitsM = splitList.map((sc, k) => {
    if (!sc || !sc.dim) fail(`facts.split${splitList.length > 1 ? '[' + k + ']' : ''}.dim is missing`);
    if (sc.dim === dimId || splitList.some((o, h) => h < k && o.dim === sc.dim)) fail(`facts.split: la dimensione "${sc.dim}" compare due volte`);
    const ms = members(dp, sc.dim, 'facts.split.dim');
    ms.forEach((m, i) => { if (!m.c) m.c = RAMP[i % RAMP.length]; });
    return ms;
  });
  const splitMembers = splitsM[0] || null;
  if (splitCfg && own.length * splitMembers.length > 60) fail('the joint grain is too large: keep members(dim) x members(split) under 60');
  /* le celle EFFETTIVE: un membro con una composizione dichiarata (mix) occupa solo le voci che
     nomina — una campagna su una categoria sola non vale quattro celle, ne vale una */
  const celle = own.reduce((a, mb) => a + splitList.reduce((b, sc, k) => {
    const dich = mb.mix && mb.mix[sc.dim];
    return b * (dich ? Math.max(1, Object.keys(dich).filter(id => +dich[id] > 0).length) : splitsM[k].length);
  }, 1), 0);
  if (splitList.length > 1 && celle > 120) fail(`the joint grain is too large: ${celle} celle (membri di facts.dim x quelli di ogni split) — tienilo sotto 120, accorpa i membri minori`);

  /* ---- 1. the primary measure at the facts.dim grain ---- */
  const prim = fields[0];
  const rows = [];
  years.forEach((y, yi) => own.forEach(mb => {
    for (let m = 0; m < 12; m++) {
      const ctx = { j, yi, seas, years, dim: dimId };
      const r = { y, m, [dimId]: mb.id, __own: mb, __splits: {} };
      r[prim.id] = Math.round(evalField(prim, r, mb, null, ctx));
      /* UN MEMBRO PUO ESISTERE SOLO IN ALCUNI ANNI: una campagna fatta una volta, un negozio
         aperto l'anno scorso. Senza `anni` ogni membro compariva in tutti gli anni, e il brief
         "le campagne degli ultimi due anni, tra cui quelle ripetute" non era esprimibile: erano
         ripetute tutte (Fra, 28 set 2026). Fuori dai suoi anni il membro vale zero; il valore
         casuale si calcola lo stesso, perche la sequenza degli altri non cambi. */
      if (Array.isArray(mb.anni) && mb.anni.indexOf(y) < 0) r[prim.id] = 0;
      rows.push(r);
    }
  }));

  /* ---- 2. optional second (and third) dimension: each one a joint grain fitted with IPF ---- */
  let grain = rows;
  splitList.forEach((sc, k) => {
    const sms = splitsM[k];
    const ownTot = own.map(mb => ({ id: mb.id, v: DM.sum(rows.filter(r => r[dimId] === mb.id), prim.id) }));
    const grand = ownTot.reduce((a, o) => a + o.v, 0);
    const shares = sc.shares && sc.shares.length === sms.length
      ? sc.shares
      : sms.map(() => 1 / sms.length);
    const splitTot = sms.map((mb, i) => ({ id: mb.id, v: grand * shares[i] }));
    const joint = DM.jointRows(dimId, sc.dim, ownTot, splitTot, prim.id, () => 1 + j(0, 1.2));
    const mix = {};
    own.forEach(mb => {
      const mine = joint.filter(r => r[dimId] === mb.id), s = DM.sum(mine, prim.id) || 1;
      mix[mb.id] = sms.map(sm => (mine.filter(r => r[sc.dim] === sm.id)[0] || {})[prim.id] / s || 0);
      /* LA COMPOSIZIONE DICHIARATA VINCE SU QUELLA ADATTATA. L'IPF da a ogni membro un mix dello
         split vicino a quello medio, con un po' di rumore: va bene per una regione o un canale,
         e falso per una campagna su una categoria sola — "Clima Days" vendeva il 54% di grandi
         elettrodomestici e il 13% di clima (Fra, 28 set 2026). Con `mix` il membro dice la sua
         composizione — { "cat": { "clima": 1 } } — e quella si usa cosi com'e, normalizzata.
         Le quote totali dello split non tornano piu esatte a `shares`: e il prezzo della verita. */
      const dich = mb.mix && mb.mix[sc.dim];
      if (dich) {
        const ignoti = Object.keys(dich).filter(id => !sms.some(sm => sm.id === id));
        if (ignoti.length) fail(`dataParams.dims["${dimId}"] membro "${mb.id}": mix.${sc.dim} nomina ${ignoti.join(', ')}, che non sono membri di "${sc.dim}" (${sms.map(sm => sm.id).join(', ')})`);
        const v = sms.map(sm => Math.max(0, +dich[sm.id] || 0)), tot = v.reduce((a, x) => a + x, 0);
        if (!(tot > 0)) fail(`dataParams.dims["${dimId}"] membro "${mb.id}": mix.${sc.dim} deve avere almeno un peso positivo`);
        mix[mb.id] = v.map(x => x / tot);
      }
    });
    /* LA CRESCITA DI UN MEMBRO DELLO SPLIT. Senza, le quote dello split sono ferme negli anni
       e ogni regione cresce come il totale: "la regione che cresce ma perde margine" non si
       distingue da quella che cresce e basta. Con `growth` sul membro la sua quota si inclina
       anno dopo anno — (1+growth)^anno, rinormalizzata — e `shares` descrive il primo anno.
       Nessun membro di split del corpus la dichiarava: per loro non cambia niente. */
    const inclina = (quote, yi) => {
      if (!sms.some(sm => sm.growth)) return quote;
      const t = quote.map((q, i) => q * Math.pow(1 + (sms[i].growth || 0), yi));
      const somma = t.reduce((a, x) => a + x, 0) || 1;
      return t.map(x => x / somma);
    };
    const prossimo = [];
    grain.forEach(r => {
      const q = inclina(mix[r[dimId]], years.indexOf(r.y));
      const parts = sms.map((sm, h) => ({ sm: sm, [prim.id]: r[prim.id] * q[h] }));
      DM.rescaleInt(parts, prim.id, r[prim.id], { min: 0 });   /* the split ties to its parent month */
      parts.forEach(p => {
        const o = Object.assign({}, r, { [sc.dim]: p.sm.id, __splits: Object.assign({}, r.__splits, { [sc.dim]: p.sm }) });
        if (k === 0) o.__split = p.sm;
        o[prim.id] = p[prim.id];
        prossimo.push(o);
      });
    });
    grain = prossimo;
  });

  /* ---- 3. the derived fields, in declared order ----
     UN CONTEGGIO SOTTILE DEVE TENERE IL SUO TASSO. Ogni campo e un intero, e arrotondare ogni
     cella per conto suo e innocuo sulle celle grandi e falso su quelle piccole: 3 nuovi utenti
     che trovano un partner, per una retention del 16%, fanno 0,48 — arrotondato, zero — e un
     anno di celle cosi porta un 16% dichiarato a un 10% a schermo. Il resto dell'arrotondamento
     viaggia quindi al mese successivo della stessa serie (stesso membro, stesso membro dello
     split, stesso campo): il totale dell'anno, e ogni tasso costruito sopra, resta quello
     dichiarato. Trovato sul segmento russo dell'app di lingue, dove lo scambio 1:1 usciva meno
     efficace delle voice room per puro arrotondamento. */
  const resti = {};
  years.forEach((y, yi) => {
    grain.filter(r => r.y === y).forEach(r => {
      const ctx = { j, yi, seas, years, dim: dimId };
      const serie = r[dimId] + '|' + splitList.map(sc => r[sc.dim]).join('|') + '|';
      for (let i = 1; i < fields.length; i++) {
        const f = fields[i];
        const k = serie + f.id, v = evalField(f, r, r.__own, r.__split, ctx, r.__splits) + (resti[k] || 0);
        r[f.id] = Math.round(v);
        resti[k] = v - r[f.id];
        /* Un campo puo esistere SOLO per certi membri di una dimensione: la spesa paid non
           esiste sull'organico, il costo di spedizione non esiste sul ritiro in negozio.
           Senza dirlo, il generatore lo distribuisce ovunque e il filtro "Organico" lascia la
           spesa paid invariata — un filtro che non fa niente, travestito da filtro che funziona.
           La cura sta nel DATO, non a valle: fuori dai membri dichiarati il campo vale zero, e
           il filtro lo azzera da solo perche e vero. */
        if (f.only && f.only.dim && Array.isArray(f.only.members)) {
          const mio = r[f.only.dim];
          if (mio !== undefined && f.only.members.indexOf(mio) < 0) { r[f.id] = 0; resti[k] = 0; }
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
  splitList.forEach((sc, k) => { dims[sc.dim] = splitsM[k].map(cm); });

  let detailModel = null;
  if (dp.detail && dp.detail.dim) {
    const d = dp.detail;
    const parentDim = d.parentDim || dimId;
    const parents = dims[parentDim] || fail(`detail.parentDim "${parentDim}" is not a fact dimension`);
    const kids = [], groups = {}, dichiarati = {}, mult = {};
    parents.forEach(p => {
      const names = (d.members || {})[p.id] || [];
      if (!names.length) {
        fail(`dataParams.detail.members non ha voci per il genitore "${p.id}" (${p.n}): ogni ` +
          `membro di "${parentDim}" vuole i suoi figli, es. "members": { "${p.id}": ["Figlio A", ` +
          `"Figlio B", "Figlio C"] }. Genitori da coprire: ${parents.map(x => x.id).join(', ')}.`);
      }
      /* Un figlio e un nome, oppure dichiara il suo carattere: `w` e il suo peso fra i fratelli,
         `mult` il moltiplicatore per campo quando il suo TASSO deve differire da quello del
         genitore. Senza, la quota e casuale e ogni misura si divide con la stessa quota — cosi
         "il topic piu praticato" era un caso e nessun topic poteva essere piu difficile di un
         altro. Il primo tester esterno ha lodato proprio uno di quei primati casuali. */
      const voci = names.map(x => (typeof x === 'string') ? { n: x } : x);
      voci.forEach(v => { if (!v || !v.n) fail(`dataParams.detail.members["${p.id}"]: ogni figlio e un nome o un oggetto con "n"`); });
      groups[p.id] = voci.map(v => p.id + ':' + v.n);
      voci.forEach(v => {
        const id = p.id + ':' + v.n;
        kids.push({ id, n: v.n, c: p.c, parent: p.id, parentDim: parentDim });
        if (v.w !== undefined) {
          if (!(v.w > 0)) fail(`dataParams.detail: il peso "w" di "${v.n}" deve essere un numero positivo`);
          dichiarati[id] = v.w;
        }
        Object.keys(v.mult || {}).forEach(fl => {
          if (!(v.mult[fl] > 0)) fail(`dataParams.detail: mult.${fl} di "${v.n}" deve essere un numero positivo`);
          (mult[fl] = mult[fl] || {})[id] = v.mult[fl];
        });
      });
    });
    dims[d.dim] = kids;
    /* le quote casuali si estraggono comunque per tutti, cosi il seme produce gli stessi numeri
       di prima per ogni spec che non dichiara pesi; poi i pesi dichiarati prendono il loro posto */
    const shares = DM.shareVector(groups, j);
    Object.keys(groups).forEach(gid => {
      const ids = groups[gid];
      if (!ids.some(id => dichiarati[id] !== undefined)) return;
      /* un fratello senza peso, accanto a fratelli pesati, vale la media dei pesati */
      const noti = ids.filter(id => dichiarati[id] !== undefined).map(id => dichiarati[id]);
      const medio = noti.reduce((a, b) => a + b, 0) / noti.length;
      const ws = ids.map(id => dichiarati[id] !== undefined ? dichiarati[id] : medio);
      const tot = ws.reduce((a, b) => a + b, 0);
      ids.forEach((id, k) => shares[id] = ws[k] / tot);
    });
    detailModel = {
      dim: d.dim, parentDim: parentDim,
      fields: (d.fields && d.fields.length) ? d.fields : [prim.id],
      shares: Object.keys(shares).reduce((o, k) => (o[k] = Math.round(shares[k] * 1e5) / 1e5, o), {})
    };
    if (d.counts && d.counts.field) detailModel.counts = { field: d.counts.field, from: d.counts.from || d.counts.field };
    /* il moltiplicatore vale solo su un campo che il dettaglio divide davvero: dichiararlo su un
       altro sarebbe un campo accettato e ignorato in silenzio */
    Object.keys(mult).forEach(fl => {
      if (detailModel.fields.indexOf(fl) < 0) fail(`dataParams.detail: "mult.${fl}" su un campo che il dettaglio non divide. ` +
        `Aggiungi "${fl}" a detail.fields, oppure togli il moltiplicatore.`);
    });
    if (Object.keys(mult).length) detailModel.mult = mult;
  }

  /* ---- 4.5 LA STORIA LONTANA COSTA, E NON LA GUARDA NESSUNO PER MESE ----
     Ogni anno in piu sono dodici righe per membro dentro l'HTML: circa sei kilobyte. Dieci anni
     a grana mensile sono centotredici kilobyte di file per un dettaglio che nessuno aprira mai
     — nel 2017 di un mockup non si va a guardare marzo.
     Quindi la profondita segue l'uso: gli ultimi anni restano mensili perche li si legge la
     stagionalita e ci si confronta col precedente; gli anni piu vecchi si riducono a UNA riga
     per membro, che tiene i totali esatti e perde solo la ripartizione fra i mesi.
     Il report lo sa (`data.mensili`) e si comporta di conseguenza: su una finestra che pesca
     nella storia lontana il trend passa a un punto per anno e i controlli del mese spariscono,
     invece di disegnare undici mesi a zero e un picco a gennaio. */
  const factDims = [dimId].concat(splitList.map(sc => sc.dim));
  /* LE RIGHE TUTTE A ZERO NON VIAGGIANO. Una campagna vale zero undici mesi su dodici, una
     composizione dichiarata azzera le voci che non nomina: righe che non entrano in nessun totale
     e che pesavano sul file. Si tolgono dopo i conti — gli arrotondamenti sono gia fatti — e
     solo se TUTTI i campi sono zero. */
  grain = grain.filter(r => fields.some(f => r[f.id] !== 0));
  const profondita = Math.max(2, dp.dettaglioMesi === undefined ? 3 : dp.dettaglioMesi);
  const mensili = years.slice(-profondita);
  if (mensili.length < years.length) {
    const somme = {}, ordine = [], numerici = fields.map(f => f.id);
    grain.forEach(r => {
      if (mensili.indexOf(r.y) >= 0) { ordine.push(r); return; }
      const k = r.y + '|' + factDims.map(dd => r[dd]).join('|');
      if (!somme[k]) {
        somme[k] = Object.assign({}, r, { m: 0 });
        numerici.forEach(c => { somme[k][c] = 0; });
        ordine.push(somme[k]);
      }
      numerici.forEach(c => { somme[k][c] += r[c] || 0; });
    });
    grain = ordine;
  }

  /* ---- 5. serialise ---- */
  const idx = {};
  Object.keys(dims).forEach(k => { idx[k] = {}; dims[k].forEach((m, i) => idx[k][m.id] = i); });
  const cols = ['y', 'm'].concat(factDims).concat(fields.map(f => f.id));
  const data = {
    dims: dims,
    years: years,
    /* quali anni hanno ancora i dodici mesi: il report ci decide se il mese e una domanda
       che si puo fare */
    mensili: mensili,
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

module.exports = { build, splitsOf };
