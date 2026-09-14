#!/usr/bin/env node
/* IL KIT POWER BI, sotto test — su TUTTI i mockup del repo, non su un esempio scelto.
 *
 * Il kit e cio che il consulente segue per costruire il report vero dopo il "si" del cliente.
 * Un errore qui non si vede nel mockup: si vede in Power BI Desktop, un pomeriggio dopo, quando
 * una misura cita una colonna che non esiste o una relazione punta a una tabella che nessuno ha
 * creato. Quindi si verifica cio che un compilatore DAX verificherebbe, per ogni caso:
 *
 *   1. ogni tipo di visual che il motore sa disegnare ha una traduzione in un visual nativo;
 *   2. ogni misura della spec ha la sua DAX, e ogni DAX cita solo misure che esistono e colonne
 *      che la tabella dei fatti ha davvero;
 *   3. ogni relazione collega colonne che le due tabelle dichiarano;
 *   4. il tema porta gli stessi colori del mockup, nello stesso ordine;
 *   5. nessun segnaposto del mockup ({y}, {py}) e nessun valore rotto finisce nel kit;
 *   6. il CSV ha una riga per ogni riga dei fatti;
 *   7. stessa spec, stesso kit.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PBI = require('../engine/powerbi.js');
const SKIN = require('../engine/skin.js');
const builder = require('../engine/data-builder.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('kit Power BI (dal mockup al report vero)');

/* tutti i casi del repo, come li raccoglie la coda di revisione */
function casi() {
  const out = [];
  const da = (fonte, mappa) => Object.keys(mappa).filter(k => k[0] !== '_')
    .forEach(id => out.push({ id: fonte + '/' + id, caso: mappa[id] }));
  da('archetipi', require('../engine/templates/index.js'));
  da('banco', require('../engine/specs/banco/index.js'));
  const dir = path.join(__dirname, '..', 'engine', 'specs', 'locale');
  fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js')
    .forEach(f => out.push({ id: 'locale/' + f, caso: require(path.join(dir, f)) }));
  return out.filter(c => c.caso.spec && c.caso.dataParams);
}
const TUTTI = casi().map(c => {
  const data = builder.build(c.caso.dataParams);
  return Object.assign(c, { data, kit: PBI.kit(c.caso.spec, c.caso.dataParams, data) });
});

ok('i casi ci sono tutti (' + TUTTI.length + ')', () => {
  assert.ok(TUTTI.length >= 10, 'solo ' + TUTTI.length + ' casi: il test deve girare sulla collezione');
});

ok('ogni tipo di visual del motore ha il suo visual nativo, in entrambe le lingue', () => {
  const dts = fs.readFileSync(path.join(__dirname, '..', 'engine', 'spec.d.ts'), 'utf8');
  const blocco = dts.match(/export type VisualType =([\s\S]*?);/)[1];
  const tipi = [...blocco.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]);
  assert.ok(tipi.length >= 15, 'VisualType letto male da spec.d.ts: ' + tipi.join(','));
  ['it', 'en'].forEach(l => tipi.forEach(t => assert.ok(PBI.T[l].vis[t],
    l + ': il tipo "' + t + '" non ha una traduzione in Power BI — il kit lascerebbe un buco')));
});

ok('ogni misura ha la sua DAX, e ogni DAX cita solo cose che esistono', () => {
  TUTTI.forEach(c => {
    const spec = c.caso.spec, dp = c.caso.dataParams;
    const nomi = PBI.nomiMisure(spec);
    const definite = new Set();
    /* ogni blocco "Nome =" dentro i blocchi dax e una definizione */
    const dax = [...c.kit.matchAll(/```dax\n([\s\S]*?)```/g)].map(m => m[1]).join('\n');
    [...dax.matchAll(/^(\S[^\n=]*?) =\s*$/gm)].forEach(m => definite.add(m[1].trim()));
    Object.keys(nomi).forEach(id => assert.ok(definite.has(nomi[id]),
      c.id + ': la misura "' + nomi[id] + '" non ha la sua DAX'));
    /* le misure citate fra parentesi quadre, fuori dai nomi di tabella */
    const citate = [...dax.replace(/'[^']*'\[[^\]]*\]|\b\w+\[[^\]]*\]/g, '').matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
    citate.filter(x => x !== 'Date').forEach(x => assert.ok(definite.has(x),
      c.id + ': una DAX cita [' + x + '], che non e definita da nessuna parte'));
    /* e anche la guida del front end cita solo misure definite: un campo che il consulente
       cerca nel riquadro Dati e non trova e un pomeriggio perso */
    const fronte = c.kit.split(/^## /m).filter(s => /^4\./.test(s)).join('\n');
    [...fronte.replace(/'[^']*'\[[^\]]*\]|’[^’]*’\[[^\]]*\]|\b\w+\[[^\]]*\]/g, '').matchAll(/\[([^\]]+)\]/g)]
      .map(m => m[1]).forEach(x => assert.ok(definite.has(x),
        c.id + ': la guida del front end usa [' + x + '], che non e definita'));
    /* le colonne dei fatti */
    const campi = new Set((dp.facts.fields || []).map(f => f.id));
    [...dax.matchAll(/Facts\[([^\]]+)\]/g)].forEach(m => assert.ok(campi.has(m[1]),
      c.id + ': Facts[' + m[1] + '] non e una colonna della tabella dei fatti'));
  });
});

ok('ogni relazione collega colonne che esistono', () => {
  TUTTI.forEach(c => {
    const md = PBI.modello(c.caso.spec, c.caso.dataParams);
    const col = {};
    md.tabelle.forEach(t => { col[t.nome] = new Set(t.colonne); });
    md.rel.forEach(([t1, c1, t2, c2]) => {
      assert.ok(col[t1] && col[t1].has(c1), c.id + ': ' + t1 + '[' + c1 + '] non esiste');
      assert.ok(col[t2] && col[t2].has(c2), c.id + ': ' + t2 + '[' + c2 + '] non esiste');
    });
  });
});

ok('il tema porta i colori del mockup, nello stesso ordine', () => {
  TUTTI.forEach(c => {
    const t = PBI.tema(c.caso.spec);
    const serie = SKIN.pelleDi(c.caso.spec).tokens.serie;
    assert.deepStrictEqual(t.dataColors, serie, c.id + ': dataColors diversi dalla serie del mockup');
    assert.ok(/^#[0-9A-F]{6}$/i.test(t.background) && /^#[0-9A-F]{6}$/i.test(t.foreground), c.id + ': colori di base non validi');
    JSON.parse(JSON.stringify(t));
  });
});

ok('nessun segnaposto del mockup e nessun valore rotto nel kit', () => {
  TUTTI.forEach(c => {
    assert.ok(!/\{(y|py|period|basis|drill)\}/.test(c.kit), c.id + ': un segnaposto del mockup e finito nel kit');
    assert.ok(!/undefined|NaN|Infinity|\[object Object\]/.test(c.kit), c.id + ': valore rotto nel kit');
  });
});

ok('la lingua e quella del report', () => {
  TUTTI.forEach(c => {
    const en = /^en/i.test(c.caso.spec.meta.locale || '');
    assert.ok(en ? /The data model/.test(c.kit) : /Il modello dati/.test(c.kit), c.id + ': lingua sbagliata');
  });
});

ok('le differenze fra percentuali sono in punti, non in percentuale', () => {
  TUTTI.forEach(c => {
    const { tempo } = PBI.misure(c.caso.spec, c.caso.dataParams);
    tempo.filter(m => / Var pp$/.test(m.nome)).forEach(m => {
      assert.ok(/\*\s*100/.test(m.expr) && /pp/.test(m.formato), c.id + ': ' + m.nome + ' non e espressa in punti');
    });
  });
});

ok('il CSV ha una riga per ogni riga dei fatti', () => {
  TUTTI.forEach(c => {
    const righe = PBI.csv(c.caso.spec, c.data).trim().split('\n');
    assert.strictEqual(righe.length - 1, c.data.facts.rows.length, c.id + ': righe del CSV');
    assert.ok(/^Date,/.test(righe[0]), c.id + ': intestazione');
    assert.ok(/^\d{4}-\d{2}-01,/.test(righe[1]), c.id + ': la data deve essere il primo del mese');
  });
});

ok('stessa spec, stesso kit', () => {
  const c = TUTTI[0];
  assert.strictEqual(PBI.kit(c.caso.spec, c.caso.dataParams, builder.build(c.caso.dataParams)), c.kit);
});

console.log('  ' + n + ' checks · ' + TUTTI.length + ' mockup');
