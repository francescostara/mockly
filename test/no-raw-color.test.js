/* Nessun colore letterale sotto app/, e nessuna profondità finta.
 *
 * Il prototipo di riferimento è arrivato a 599 attributi `style=` con gli hex scritti a mano.
 * Da lì il tema non si poteva più cambiare: si poteva solo SIMULARE, con uno script che
 * riscriveva quegli attributi a runtime mappando diciassette colori chiari sui diciassette
 * scuri. Non era una scorciatoia di prototipazione andata male — era la conseguenza inevitabile
 * di avere i valori nei componenti invece che nei ruoli.
 *
 * Un hex in un componente dichiara che quel valore non cambia col tema, e quasi sempre si
 * sbaglia. Come per contrastIn(), la regola non va raccomandata: va resa impossibile da
 * violare. Questo test è il posto dove la violazione si ferma.
 *
 * app/design-tokens.ts è escluso: è la fonte, ed è l'unico file dove un colore ha il diritto di
 * essere scritto per esteso.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const FONTE = path.join(APP, 'design-tokens.ts');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('cornice (nessun colore letterale sotto app/)');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.(ts|tsx|js|jsx|css)$/.test(e.name) ? [full] : [];
  });
}

const FILES = walk(APP).filter(f => f !== FONTE);
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');

/* Righe da non contare: i commenti che PARLANO di un colore non lo usano. Un esempio dentro
   una spiegazione ("#1F4E79 e #C08A2E") è documentazione, non uno stile. */
const isComment = line => /^\s*(\/\/|\/\*|\*)/.test(line);

function offenders(re) {
  const out = [];
  FILES.forEach(f => {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (isComment(line)) return;
      const m = line.match(re);
      if (m) out.push(rel(f) + ':' + (i + 1) + '  ' + m[0].trim());
    });
  });
  return out;
}

ok('nessun hex, rgb() o hsl() fuori da app/design-tokens.ts', () => {
  const found = offenders(/#[0-9A-Fa-f]{6}\b|\brgba?\s*\(|\bhsla?\s*\(/);
  assert.strictEqual(found.length, 0,
    'colori letterali trovati:\n    ' + found.join('\n    ') +
    '\n  Un valore letterale dichiara che quel colore non cambia col tema. Usa un ruolo: ' +
    'var(--surface), var(--ink-secondary), var(--border-strong). Se il ruolo non esiste, ' +
    'aggiungilo in app/design-tokens.ts — non nel componente.');
});

/* Stesso spirito, l'altra metà della regola: la profondità è UNO scalino di superficie più un
   hairline. Un'ombra è il modo più veloce per far sembrare l'app una dashboard, cioè per
   mettersi in concorrenza col mockup che sta nel pannello destro. */
ok('nessuna ombra, gradiente o blur sotto app/', () => {
  const found = offenders(/box-shadow\s*:|text-shadow\s*:|linear-gradient\(|radial-gradient\(|conic-gradient\(|backdrop-filter\s*:|filter\s*:\s*blur\(/);
  assert.strictEqual(found.length, 0,
    'profondità finta trovata:\n    ' + found.join('\n    ') +
    '\n  La profondità è uno scalino di superficie (surface -> surface-raised) piu un bordo ' +
    'border-hairline da 1px. Non esiste una scala di elevazione: è assente per scelta.');
});

/* Traccia dell'accento blu precedente: i valori della palette vecchia non devono sopravvivere
   da nessuna parte, nemmeno in un commento dimenticato. */
ok('nessuna traccia della vecchia palette blu', () => {
  const vecchi = ['1F4E79', '12304F', '4A7FA8', '16202E', '7A879B', 'E2E5EA', 'EEF2F6', 'DDE1E7'];
  const found = [];
  FILES.forEach(f => {
    const src = fs.readFileSync(f, 'utf8');
    vecchi.forEach(v => { if (src.toUpperCase().includes(v)) found.push(rel(f) + ' contiene #' + v); });
  });
  assert.strictEqual(found.length, 0, 'accento blu superstite:\n    ' + found.join('\n    '));
});

ok('ogni file sotto app/ e stato guardato', () => {
  assert.ok(FILES.length >= 6, 'trovati solo ' + FILES.length + ' file: il walk non sta leggendo app/');
});

console.log('  ' + n + ' checks · ' + FILES.length + ' file');
