/* Le regole di contrasto del design system, verificate invece che dichiarate.
 *
 * La route /design mostra i rapporti, ma una pagina che mostra un numero non ferma nessuno: se
 * un livello di grigio scivola sotto 4.5 mentre si cerca quiete, credito e prezzo diventano il
 * testo MENO leggibile dell'app — il contrario di quello che devono essere. Qui la regola ha un
 * modo di fallire.
 *
 * REGOLA DI MISURA: ogni token si misura SOLO contro le superfici del proprio tema. Il
 * confronto fra temi diversi ha già prodotto un errore reale — due token del tema scuro
 * misurati contro la carta chiara, con due numeri che sembravano bocciature e non volevano dire
 * niente. Qui la tavolozza si risolve UNA volta per tema (`paletteOf`) e i confronti leggono
 * solo da quella: non è una cautela, è l'unica strada disponibile.
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

const channel = v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = hex => {
  const h = hex.replace('#', '');
  return 0.2126 * channel(parseInt(h.slice(0, 2), 16)) +
         0.7152 * channel(parseInt(h.slice(2, 4), 16)) +
         0.0722 * channel(parseInt(h.slice(4, 6), 16));
};

/* Una tavolozza risolta = un tema. Da qui in giù non esistono hex sciolti: si confrontano due
   voci della STESSA tavolozza, quindi il confronto incrociato non è esprimibile. */
function paletteOf(theme) {
  const p = { theme };
  COLORS.forEach(c => { p[c.name] = theme === 'dark' ? c.dark : c.light; });
  return Object.freeze(p);
}
function contrastIn(p, fg, bg) {
  assert.ok(p[fg], 'token "' + fg + '" non esiste');
  assert.ok(p[bg], 'token "' + bg + '" non esiste');
  const x = lum(p[fg]), y = lum(p[bg]);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const THEMES = ['light', 'dark'];
const INKS = ['ink', 'ink-secondary', 'ink-muted'];
const SURFACES = ['surface', 'surface-raised', 'surface-sunken'];

ok('ogni token ha valore per entrambi i temi, una famiglia e una riga di ruolo', () => {
  assert.ok(COLORS.length >= 10, 'i ruoli sono troppo pochi per un sistema');
  COLORS.forEach(c => {
    assert.match(c.light, /^#[0-9A-Fa-f]{6}$/, c.name + ': valore chiaro non valido');
    assert.match(c.dark, /^#[0-9A-Fa-f]{6}$/, c.name + ': valore scuro non valido');
    assert.ok(['surface', 'ink', 'line', 'focus', 'state'].includes(c.kind), c.name + ': famiglia mancante o sconosciuta');
    assert.ok(c.role && c.role.length > 12, c.name + ': manca la riga che dice a cosa serve');
  });
});

/* ---- il pavimento: OGNI inchiostro su OGNI superficie, dentro il proprio tema ---- */

THEMES.forEach(theme => {
  const p = paletteOf(theme);
  INKS.forEach(fg => SURFACES.forEach(bg => {
    ok('tema ' + theme + ': ' + fg + ' su ' + bg + ' >= 4.5:1', () => {
      const r = contrastIn(p, fg, bg);
      assert.ok(r >= 4.5,
        fg + ' su ' + bg + ' (tema ' + theme + ') misura ' + r.toFixed(2) + ':1, sotto il pavimento ' +
        'AA di 4.5:1. Scurisci il token finche non passa — e misuralo contro le superfici del SUO tema.');
    });
  }));
});

/* ---- i perimetri: 3:1, la soglia di WCAG 1.4.11 per i confini di un componente ---- */

THEMES.forEach(theme => {
  const p = paletteOf(theme);
  ['surface', 'surface-raised'].forEach(bg => {
    ok('tema ' + theme + ': border-strong su ' + bg + ' >= 3:1', () => {
      const r = contrastIn(p, 'border-strong', bg);
      assert.ok(r >= 3, 'border-strong su ' + bg + ' (' + theme + ') misura ' + r.toFixed(2) +
        ':1: sul perimetro di un controllo il bordo E il controllo, quindi deve reggere 3:1.');
    });
  });
  ok('tema ' + theme + ': il focus da tastiera si vede (>= 3:1)', () => {
    assert.ok(contrastIn(p, 'focus-ring', 'surface-raised') >= 3);
  });
  ok('tema ' + theme + ': il testo sull azione primaria regge (>= 4.5:1)', () => {
    assert.ok(contrastIn(p, 'button-inverted-ink', 'button-inverted-bg') >= 4.5);
  });
});

/* ---- la regola della cornice: il pozzo rientra sempre ---- */

/* In chiaro "rientrare" vuol dire piu scuro della pagina, in scuro anche: il pozzo del mockup
   non deve mai diventare il punto piu luminoso dello schermo, o smette di essere un pozzo e
   diventa un riflettore puntato sulla cornice invece che sul contenuto. È l'errore che si
   commette una volta sola invertendo i due valori del tema scuro. */
THEMES.forEach(theme => {
  ok('tema ' + theme + ': surface-sunken rientra rispetto a surface', () => {
    const p = paletteOf(theme);
    const sunken = lum(p['surface-sunken']), surface = lum(p['surface']);
    assert.ok(sunken < surface,
      'in tema ' + theme + ' surface-sunken (' + p['surface-sunken'] + ', L=' + sunken.toFixed(4) + ') non ' +
      'rientra rispetto a surface (' + p['surface'] + ', L=' + surface.toFixed(4) + '): il pozzo del mockup ' +
      'deve stare sotto la pagina in ENTRAMBI i temi.');
  });
});

/* Il verso NON si inverte in scuro: surface-raised sta piu in ALTO di surface in entrambi i
   temi, come surface-sunken sta piu in basso in entrambi. E la confusione che la regola del
   pozzo vuole prevenire — "in scuro e tutto al contrario" e falso, e invertire lo scalino
   trasforma il pannello in una buca e il pozzo in un riflettore. */
ok('surface-raised sta sopra surface in entrambi i temi (uno scalino, non due)', () => {
  THEMES.forEach(theme => {
    const p = paletteOf(theme);
    const raised = lum(p['surface-raised']), surface = lum(p['surface']);
    assert.ok(raised > surface,
      'in tema ' + theme + ' surface-raised (' + p['surface-raised'] + ', L=' + raised.toFixed(4) + ') non sta ' +
      'sopra surface (' + p['surface'] + ', L=' + surface.toFixed(4) + '): lo scalino non si inverte col tema.');
  });
});

/* ---- la cornice resta sull asse della carta calda ---- */

/* La soglia NON e drift: e tarata sull asse caldo del prototipo. La punta misurata della serie
   e 15, e il tetto sta a 16 — un margine, non un valore cucito addosso all unico token che lo
   toccava. 16 non e "il massimo consentito a un colore": e il punto oltre il quale un colore
   ha smesso di essere carta. Un blu o un verde di passaggio partono da 40 in su, quindi lo
   spazio fra 15 e 16 non lascia entrare niente. Gli stati sono esclusi per definizione: sono
   cromatici perche devono esserlo. */
const CHROMA_CEILING = 16;

ok('nessun token della cornice esce dall asse caldo (dominante <= ' + CHROMA_CEILING + ')', () => {
  const chroma = hex => {
    const h = hex.replace('#', '');
    const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return Math.max(...v) - Math.min(...v);
  };
  COLORS.filter(c => c.kind !== 'state').forEach(c => {
    THEMES.forEach(t => {
      const hex = t === 'dark' ? c.dark : c.light;
      assert.ok(chroma(hex) <= CHROMA_CEILING,
        c.name + ' (' + t + ', ' + hex + ', dominante ' + chroma(hex) + ') esce dall asse della carta calda: ' +
        'la cornice non porta un accento, il colore appartiene al mockup e agli stati.');
    });
  });
});

ok('gli stati esistono, sono cromatici, e sono i soli a poterlo essere', () => {
  const states = COLORS.filter(c => c.kind === 'state').map(c => c.name);
  assert.deepStrictEqual(states, ['state-success', 'state-warning', 'state-danger'],
    'gli stati semantici sono tre: aggiungerne un quarto e una modifica del design system');
});

console.log('  ' + n + ' checks');
