#!/usr/bin/env node
/* LE PALETTE, messe alla prova come prescrive la ricerca — non come piacciono.
 *
 * Quattro verifiche, e nessuna e negoziabile:
 *   3:1     gli elementi non testuali (barre, tratti, celle) contro la superficie;
 *   4,5:1   le etichette di testo dentro i grafici;
 *   DeltaE76 >= 10 fra due voci categoriali, altrimenti per molte persone sono lo stesso colore;
 *   distinguibili sotto protanopia, deuteranopia, tritanopia E in scala di grigi.
 *
 * Il grigio e quello che frega: le scale sicure per i daltonici separano per TINTA, quindi due
 * voci diversissime possono avere la stessa luminanza e diventare identiche in stampa. E un
 * report si stampa.
 */
const assert = require('assert');
const SKIN = require('../engine/skin.js');
const C = require('../engine/colore.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('palette accessibili (13 famiglie, basi CVD-safe)');

const ID = Object.keys(SKIN.FAMIGLIE);

ok('tredici famiglie, tutte derivate da una base misurata', () => {
  assert.ok(ID.length >= 13, 'famiglie: ' + ID.length);
  ID.forEach(id => {
    const f = SKIN.FAMIGLIE[id];
    assert.ok(f.base, id + ': non dichiara da quale base CVD-safe deriva la scala');
  });
});

ok('ogni voce categoriale stacca 3:1 dalla superficie', () => {
  ID.forEach(id => {
    const t = SKIN.palette(id);
    t.serie.forEach(c => {
      const r = C.contrasto(c, t.card);
      assert.ok(r >= 3, `${id}: ${c} contro ${t.card} = ${r.toFixed(2)}:1, sotto il 3:1 ` +
        'richiesto agli elementi non testuali');
    });
  });
});

ok('le etichette di testo stanno a 4,5:1', () => {
  ID.forEach(id => {
    const t = SKIN.palette(id);
    [['ink', 7], ['ink2', 4.5], ['flab', 4.5], ['good', 4.5], ['bad', 4.5]].forEach(([k, min]) => {
      const r = C.contrasto(t[k], t.card);
      assert.ok(r >= min, `${id}: --${k} ${t[k]} su ${t.card} = ${r.toFixed(2)}:1, minimo ${min}`);
    });
  });
});

ok('DeltaE76 >= 10 fra due voci, anche sotto le tre dicromazie', () => {
  ID.forEach(id => {
    const t = SKIN.palette(id), s = t.serie;
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) {
        const e = C.separati(s[i], s[j]).esiti;
        ['normale', 'protanopia', 'deuteranopia', 'tritanopia'].forEach(k => {
          assert.ok(e[k] >= 10, `${id}: ${s[i]} e ${s[j]} distano ${e[k].toFixed(1)} sotto ${k} ` +
            '(minimo 10: sotto quella soglia sono lo stesso colore)');
        });
      }
    }
  });
});

ok('le voci restano separate anche in scala di grigi', () => {
  ID.forEach(id => {
    const t = SKIN.palette(id), s = t.serie;
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) {
        const g = C.separati(s[i], s[j]).esiti.grigio;
        assert.ok(g >= 8, `${id}: ${s[i]} e ${s[j]} hanno la stessa luminanza (${g.toFixed(1)}): ` +
          'in stampa diventano la stessa voce');
      }
    }
  });
});

ok('almeno cinque voci per famiglia, mai piu di sette', () => {
  ID.forEach(id => {
    const s = SKIN.palette(id).serie;
    assert.ok(s.length >= 5, `${id}: solo ${s.length} voci verificate — un report con cinque ` +
      'categorie si ritroverebbe due colori uguali');
    assert.ok(s.length <= 7, `${id}: ${s.length} voci, oltre il tetto di sette`);
  });
});

ok('gli stati opposti non sono mai rosso e verde', () => {
  ID.forEach(id => {
    const t = SKIN.palette(id);
    /* la coppia si giudica dalla tinta: un positivo verde contro un negativo rosso e la
       combinazione che sparisce per prima, ed e ancora la piu diffusa nei report */
    const tinta = c => {
      const [r, g, b] = C.hex2rgb(c);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max === min) return 'neutro';
      let h;
      if (max === r) h = ((g - b) / (max - min) + 6) % 6;
      else if (max === g) h = (b - r) / (max - min) + 2;
      else h = (r - g) / (max - min) + 4;
      h *= 60;
      if (h >= 75 && h < 165) return 'verde';
      if (h < 20 || h >= 330) return 'rosso';
      if (h >= 165 && h < 260) return 'blu';
      return 'altro';
    };
    const g = tinta(t.good), b = tinta(t.bad);
    assert.ok(!(g === 'verde' && b === 'rosso'),
      `${id}: positivo ${t.good} (${g}) contro negativo ${t.bad} (${b}) — la coppia rosso/verde ` +
      'e la prima a sparire, la sostituta collaudata e blu/arancio');
    assert.strictEqual(g, 'blu', `${id}: il positivo dovrebbe essere blu, e ${g}`);
  });
});

ok('la rampa sequenziale e percettivamente uniforme (Viridis o Cividis)', () => {
  ID.forEach(id => {
    const t = SKIN.palette(id);
    const stop = [t.seq1, t.seq2, t.seq3, t.seq4, t.seq5];
    /* la luminanza deve salire in modo monotono: e cio che rende una rampa leggibile in grigio
       e sotto ogni dicromazia, ed e cio che le rampe arcobaleno non fanno */
    for (let i = 1; i < stop.length; i++) {
      assert.ok(C.lum(stop[i]) > C.lum(stop[i - 1]),
        `${id}: la rampa sequenziale non sale in luminanza fra ${stop[i - 1]} e ${stop[i]}`);
    }
    const dentro = [COLNOMI(t.seq1)].every(Boolean);
    assert.ok(dentro, id + ': la rampa non viene da Viridis o Cividis');
  });
  function COLNOMI(c) {
    return C.VIRIDIS.indexOf(c) >= 0 || C.CIVIDIS.indexOf(c) >= 0;
  }
});

ok('la rampa divergente ha un punto medio neutro e non e rosso-verde', () => {
  ID.forEach(id => {
    const t = SKIN.palette(id);
    const [r, g, b] = C.hex2rgb(t.div3);
    const scarto = Math.max(r, g, b) - Math.min(r, g, b);
    assert.ok(scarto <= 26, `${id}: il punto medio della divergente (${t.div3}) non e neutro`);
    const estremi = C.separati(t.div1, t.div5).esiti;
    ['protanopia', 'deuteranopia', 'tritanopia'].forEach(k => {
      assert.ok(estremi[k] >= 10,
        `${id}: i due estremi della divergente si confondono sotto ${k}`);
    });
  });
});

ok('i colori di un utente illeggibili vengono corretti, non accettati', () => {
  /* la validazione dei colori del cliente: un rosa pallido su carta bianca sta a 2:1, e il
     sistema deve scurirlo e dirlo, non produrre un mockup che non si vede */
  const pallido = '#FFD9E8';
  const corretto = C.aggiusta(pallido, '#FFFFFF', 3);
  assert.ok(C.contrasto(pallido, '#FFFFFF') < 3, 'il caso di prova non era illeggibile');
  assert.ok(C.contrasto(corretto, '#FFFFFF') >= 3,
    'il colore corretto sta ancora sotto il 3:1: ' + corretto);
  assert.notStrictEqual(corretto, pallido);
});

console.log('  ' + n + ' checks · ' + ID.length + ' famiglie');
