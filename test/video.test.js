/* LA SCENEGGIATURA DEL VIDEO DEVE ESSERE ESEGUIBILE — il gate della nuova funzione.
 *
 * Un video promette una cosa sola: che il mockup e vivo. Se un passo della sceneggiatura punta
 * a un bersaglio che non c'e piu — un visual che ha smesso di essere cliccabile, una pagina
 * rinominata, un drill tolto — il video esce con un buco e nessuno se ne accorge finche non lo
 * si guarda. Qui si esegue la sceneggiatura in jsdom, senza registrare niente: ogni passo deve
 * trovare il suo bersaglio, e ogni passo che clicca deve cambiare davvero qualcosa in pagina.
 *
 * E' lo stesso patto della scheda di interazione, da cui la sceneggiatura nasce: cio che si
 * dichiara viene eseguito.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');
const VIDEO = require('../engine/video.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

function casi() {
  const out = [];
  const agg = (fonte, m) => Object.keys(m).filter(k => k[0] !== '_')
    .forEach(k => out.push({ id: fonte + '/' + k, caso: m[k] }));
  agg('archetipi', require('../engine/templates/index.js'));
  agg('banco', require('../engine/specs/banco/index.js'));
  agg('eval', require('../engine/specs/index.js'));
  const dir = path.join(__dirname, '..', 'engine', 'specs', 'locale');
  fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js')
    .forEach(f => out.push({ id: 'locale/' + f.replace(/\.js$/, ''), caso: require(path.join(dir, f)) }));
  return out;
}

console.log('video (la sceneggiatura ricavata dalla scheda si esegue davvero)');

const CASI = casi().map(c => ({ id: c.id, spec: c.caso.spec, data: c.caso.build() }));

/** Il bersaglio di un passo, cercato come lo cerca il driver: dentro la sua card, se dichiarata. */
function bersaglio(doc, p) {
  let ambito = doc;
  if (p.dentro) {
    const card = [...doc.querySelectorAll('#page .card')]
      .find(c => ((c.querySelector('.ch h3') || {}).textContent || '').indexOf(p.dentro) === 0);
    if (card) ambito = card;
  }
  return ambito.querySelector(p.sel);
}

const clic = (win, el, destro) => el.dispatchEvent(new win.MouseEvent(destro ? 'contextmenu' : 'click',
  { bubbles: true, cancelable: true }));

ok('ogni caso ha una sceneggiatura che comincia e finisce ferma sulla prima pagina', () => {
  CASI.forEach(c => {
    const s = VIDEO.sceneggiatura(c.spec, c.data);
    const prima = c.spec.pages[0].id;
    assert.ok(s.length >= 3, c.id + ': sceneggiatura di ' + s.length + ' passi, troppo corta per un video');
    assert.strictEqual(s[0].tipo, 'pausa', c.id + ': il video deve aprirsi sul mockup fermo');
    assert.strictEqual(s[s.length - 1].tipo, 'pausa', c.id + ': il video deve chiudersi su un fermo immagine');
    assert.strictEqual(s[s.length - 1].pagina, prima, c.id + ': deve chiudersi sulla pagina da cui e partito');
    assert.ok(s.some(p => p.tipo === 'clic'), c.id + ': senza un clic dentro un visual il video non mostra niente');
  });
});

ok('ogni passo trova il suo bersaglio, e ogni clic cambia davvero la pagina', () => {
  const guasti = [];
  CASI.forEach(c => {
    const dom = new JSDOM(render(c.spec, c.data), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document;
    VIDEO.sceneggiatura(c.spec, c.data).forEach(p => {
      if (p.tipo === 'pausa') return;
      const el = bersaglio(doc, p);
      if (!el) { guasti.push(c.id + ' · ' + p.tipo + ': nessun bersaglio per "' + p.sel + '"' +
        (p.dentro ? ' dentro "' + p.dentro + '"' : '')); return; }
      const prima = doc.querySelector('#page').textContent;
      clic(dom.window, el, p.tipo === 'destro');
      if (p.tipo === 'periodo' && p.bersaglio) {
        const q = doc.querySelector(p.bersaglio);
        if (!q) { guasti.push(c.id + ' · periodo: manca il trimestre "' + p.bersaglio + '"'); return; }
        clic(dom.window, q, false);
      }
      const dopo = doc.querySelector('#page').textContent;
      if (dopo === prima) guasti.push(c.id + ' · ' + p.tipo + ' su "' + p.sel + '": la pagina non cambia, ' +
        'nel video sarebbe un clic a vuoto');
    });
    dom.window.close();
  });
  assert.deepStrictEqual(guasti, [], guasti.join('\n       '));
});

ok('il passo del periodo esiste solo dove il trimestre esiste', () => {
  CASI.forEach(c => {
    const s = VIDEO.sceneggiatura(c.spec, c.data);
    const liv = (c.spec.filters.date || {}).levels || [];
    const haPeriodo = s.some(p => p.tipo === 'periodo');
    assert.strictEqual(haPeriodo, liv.indexOf('quarter') >= 0,
      c.id + ': il passo del periodo non combacia con i livelli dichiarati (' + liv.join(',') + ')');
  });
});

ok('i passi si possono scegliere, e la durata cresce con quello che si include', () => {
  const c = CASI[0];
  const corta = VIDEO.sceneggiatura(c.spec, c.data, { passi: ['filtro'] });
  const piena = VIDEO.sceneggiatura(c.spec, c.data);
  assert.ok(corta.length < piena.length, 'con --passi=filtro la sceneggiatura deve essere piu corta');
  assert.ok(VIDEO.durata(corta, 1) < VIDEO.durata(piena, 1), 'e piu breve');
  /* la velocita accorcia: e il parametro che serve quando un video di trenta secondi e troppo */
  assert.ok(VIDEO.durata(piena, 2) < VIDEO.durata(piena, 1) * 0.6, 'velocita 2 deve dimezzare la durata');
});

console.log('  ' + n + ' checks');
