#!/usr/bin/env node
/* GLI ABBINAMENTI TIPOGRAFICI, e le regole che non si negoziano.
 *
 * Le regole vengono dalla pratica documentata, non dal gusto: cifre tabulari e lining ovunque,
 * sans per numeri ed etichette, massimo due famiglie piu la mono, e una lista di caratteri da
 * evitare per ragioni misurabili — cifre proporzionali, cifre oldstyle, tratti che spariscono
 * a nove pixel.
 */
const assert = require('assert');
const SKIN = require('../engine/skin.js');
const { css } = require('../engine/render.js');
const banco = require('../engine/specs/banco/index.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('tipografia (8 abbinamenti)');

const ID = Object.keys(SKIN.TIPOGRAFIE);

/* I caratteri da evitare, con la ragione. La ragione conta: un divieto senza motivo dura fino
   al primo che ha voglia di infrangerlo. */
const VIETATI = [
  ['Montserrat', 'cifre proporzionali: le colonne di numeri si disallineano'],
  ['Raleway', 'cifre oldstyle: in tabella salgono e scendono'],
  ['Didot', 'serif display ad alto contrasto: i tratti sottili spariscono a 9px'],
  ['Bodoni', 'serif display ad alto contrasto: idem'],
  ['Playfair', 'serif display ad alto contrasto: idem'],
  ['Thin', 'peso hairline: sparisce a piccole dimensioni e su fondo scuro'],
  ['Hairline', 'peso hairline: idem']
];

ok('otto abbinamenti, ognuno col suo caso d uso', () => {
  assert.strictEqual(ID.length, 8, 'abbinamenti: ' + ID.join(', '));
  ID.forEach(id => {
    const t = SKIN.TIPOGRAFIE[id];
    assert.ok(t.display && t.ui && t.num, id + ': pila incompleta');
    assert.ok(t.uso, id + ': non dichiara per quale caso serve');
  });
});

ok('nessun carattere della lista dei vietati compare in una pila', () => {
  ID.forEach(id => {
    const t = SKIN.TIPOGRAFIE[id];
    const pila = [t.display, t.ui, t.num].join(' ');
    VIETATI.forEach(([nome, perche]) => {
      assert.ok(!new RegExp(nome, 'i').test(pila),
        `${id} nomina ${nome} — ${perche}`);
    });
  });
});

ok('numeri ed etichette sono sempre sans o mono, mai serif', () => {
  ID.forEach(id => {
    const t = SKIN.TIPOGRAFIE[id];
    [['num', t.num], ['ui', t.ui]].forEach(([ruolo, pila]) => {
      assert.ok(/sans-serif|monospace/.test(pila),
        `${id}: la pila "${ruolo}" non finisce in sans-serif o monospace — ${pila.slice(0, 60)}`);
      assert.ok(!/^(Georgia|Merriweather|Lora|"Palatino)/.test(pila.trim()),
        `${id}: la pila "${ruolo}" apre con un serif; il serif sta nei titoli, mai sulle cifre`);
    });
  });
});

ok('al massimo due famiglie, piu la mono per i numeri', () => {
  ID.forEach(id => {
    const t = SKIN.TIPOGRAFIE[id];
    /* il primo nome di ogni pila e la famiglia scelta; i successivi sono ripieghi di sistema */
    const primo = s => (s.match(/^"?([^",]+)"?/) || [])[1];
    const famiglie = new Set([primo(t.display), primo(t.ui)]);
    assert.ok(famiglie.size <= 2,
      `${id}: ${famiglie.size} famiglie fra titoli e interfaccia — tre famiglie sono il segnale ` +
      'che si sta risolvendo con la tipografia un problema di gerarchia');
  });
});

ok('ogni pila ha un ripiego di sistema: il file non scarica niente', () => {
  ID.forEach(id => {
    const t = SKIN.TIPOGRAFIE[id];
    [t.display, t.ui, t.num].forEach(pila => {
      const voci = pila.split(',');
      assert.ok(voci.length >= 3,
        `${id}: la pila "${pila.slice(0, 40)}" non ha ripieghi — su una macchina senza quel ` +
        'carattere il report cambierebbe faccia');
    });
  });
});

ok('le cifre sono tabulari E lining nel CSS emesso', () => {
  const spec = banco['heatmap-fascia'].spec;
  const foglio = css(spec, false);
  assert.match(foglio, /font-variant-numeric:tabular-nums lining-nums/,
    'il foglio non chiede cifre tabulari e lining');
  assert.match(foglio, /font-feature-settings:"tnum","lnum"/,
    'manca il fallback per i caratteri che non leggono font-variant-numeric');
});

ok('sul tema scuro il testo corrente sale di un gradino di peso', () => {
  const chiaro = css(banco['heatmap-fascia'].spec, false);
  const scuroSpec = JSON.parse(JSON.stringify(banco['heatmap-fascia'].spec));
  scuroSpec.skin = Object.assign({}, scuroSpec.skin, { palette: 'dark-tecnico' });
  const scuro = css(scuroSpec, false);
  assert.match(chiaro, /font-weight:400/, 'il tema chiaro non usa il peso normale');
  assert.match(scuro, /font-weight:500/,
    'sul fondo scuro lo stesso peso appare piu leggero: il testo corrente deve salire');
});

ok('i nomi vecchi continuano a risolvere', () => {
  Object.keys(SKIN.ALIAS_TIPO).forEach(vecchio => {
    const nuovo = SKIN.ALIAS_TIPO[vecchio];
    assert.ok(SKIN.TIPOGRAFIE[nuovo], `l'alias ${vecchio} punta a ${nuovo}, che non esiste`);
  });
  const spec = JSON.parse(JSON.stringify(banco['heatmap-fascia'].spec));
  spec.skin = { tipografia: 'sans-sistema' };
  assert.strictEqual(SKIN.pelleDi(spec).tipo.id, 'neutro-ui',
    'una spec scritta col nome vecchio deve continuare a renderizzare');
});

console.log('  ' + n + ' checks · ' + ID.length + ' abbinamenti');
