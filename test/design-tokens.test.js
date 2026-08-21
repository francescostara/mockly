/* Le regole di contrasto del design system, verificate invece che dichiarate.
 *
 * La route /design mostra i rapporti, ma una pagina che mostra un numero rosso non ferma
 * nessuno: se ink-muted scivola sotto 4.5 mentre si sistema un grigio, il credito e il prezzo
 * diventano il testo MENO leggibile dell'app — esattamente il contrario di quello che devono
 * essere. Qui la regola ha un modo di fallire.
 *
 * app/design-tokens.ts è TypeScript: si legge dal sorgente e se ne valutano gli array, come fa
 * app-fallback.test.js. Il punto è provare i valori, non il compilatore.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('design system (contrasto dei token)');

const src = fs.readFileSync(path.join(ROOT, 'app', 'design-tokens.ts'), 'utf8');

/** Estrae un array letterale esportato, spogliato dell'annotazione di tipo. */
function literal(name) {
  const at = src.indexOf('export const ' + name);
  assert.ok(at >= 0, name + ' non trovato in app/design-tokens.ts');
  /* dopo l'uguale, non dopo il nome: l'annotazione di tipo "ColorToken[]" porta le sue
     parentesi quadre e il taglio partirebbe da li */
  const open = src.indexOf('[', src.indexOf('=', at));
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return eval('(' + src.slice(open, end) + ')');
}

const COLORS = literal('COLORS');
const CONTRACTS = literal('CONTRACTS');

const channel = v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = hex => {
  const h = hex.replace('#', '');
  return 0.2126 * channel(parseInt(h.slice(0, 2), 16)) +
         0.7152 * channel(parseInt(h.slice(2, 4), 16)) +
         0.0722 * channel(parseInt(h.slice(4, 6), 16));
};
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const valueOf = (name, theme) => {
  const t = COLORS.find(c => c.name === name);
  assert.ok(t, 'token "' + name + '" non esiste');
  return theme === 'dark' ? t.dark : t.light;
};

ok('ogni token ha un valore per entrambi i temi e una riga di ruolo', () => {
  assert.ok(COLORS.length >= 8, 'i ruoli sono troppo pochi per un sistema');
  COLORS.forEach(c => {
    assert.match(c.light, /^#[0-9A-Fa-f]{6}$/, c.name + ': valore chiaro non valido');
    assert.match(c.dark, /^#[0-9A-Fa-f]{6}$/, c.name + ': valore scuro non valido');
    assert.ok(c.role && c.role.length > 12, c.name + ': manca la riga che dice a cosa serve');
  });
});

['light', 'dark'].forEach(theme => {
  CONTRACTS.forEach(r => {
    ok('tema ' + theme + ': ' + r.fg + ' su ' + r.bg + ' >= ' + r.min + ':1', () => {
      const ratio = contrast(valueOf(r.fg, theme), valueOf(r.bg, theme));
      assert.ok(ratio >= r.min,
        r.fg + ' su ' + r.bg + ' (' + theme + ') misura ' + ratio.toFixed(2) + ':1, sotto ' + r.min +
        ':1 — ' + r.why + '. Scurisci il token finche non passa.');
    });
  });
});

/* Il testo attenuato è il caso che si rompe per primo: è il grigio che si alleggerisce "solo
   un po'" quando si cerca quiete, ed è dove vivono credito e prezzo. */
ok('ink-muted regge la soglia del testo normale su ogni superficie, in entrambi i temi', () => {
  ['light', 'dark'].forEach(theme => {
    ['surface', 'surface-raised', 'surface-sunken'].forEach(bg => {
      const ratio = contrast(valueOf('ink-muted', theme), valueOf(bg, theme));
      assert.ok(ratio >= 4.5,
        'ink-muted su ' + bg + ' (' + theme + ') misura ' + ratio.toFixed(2) + ':1: credito e prezzo ' +
        'diventerebbero il testo meno leggibile dell app.');
    });
  });
});

/* La cornice è monocroma per decisione: un accento rientrerebbe da una "piccola eccezione". */
ok('nessun token porta un accento cromatico', () => {
  const chroma = hex => {
    const h = hex.replace('#', '');
    const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return Math.max(...v) - Math.min(...v);
  };
  COLORS.forEach(c => {
    ['light', 'dark'].forEach(t => {
      const hex = t === 'dark' ? c.dark : c.light;
      assert.ok(chroma(hex) <= 12,
        c.name + ' (' + t + ', ' + hex + ') ha una dominante cromatica: la cornice resta monocroma, ' +
        'il colore appartiene al mockup.');
    });
  });
});

console.log('  ' + n + ' checks');
