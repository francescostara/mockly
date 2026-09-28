/* Il corpus dei casi renderizzabili, in un posto solo: archetipi, banco, eval e casi locali.
 *
 * E la cache dei render. Otto file della suite generavano ciascuno gli stessi venti mockup —
 * tre secondi e mezzo a giro, rifatti otto volte — ed erano la parte piu grossa dei minuti che
 * la suite costava. Un mockup ora si genera una volta: la chiave e l'impronta del CODICE DEL
 * MOTORE piu la spec e i parametri del caso, quindi un motore cambiato invalida tutto da solo e
 * nessun test puo leggere un render vecchio. La cache vive nella cartella temporanea di sistema;
 * scritture atomiche, perche la suite gira in parallelo.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

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

const CARTELLA = path.join(os.tmpdir(), 'pruva-render-cache');
let impronta = null;
/* tutto cio che puo cambiare un render: il motore, la skin, la lib che il motore legge */
function improntaMotore() {
  if (impronta) return impronta;
  const h = crypto.createHash('sha1');
  /* tutta la cartella engine, sottocartelle comprese: anche i generatori dei casi (specs,
     templates) cambiano il render */
  const visita = dir => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) visita(p);
    else if (/\.(js|json)$/.test(e.name)) h.update(p).update(fs.readFileSync(p));
  });
  visita(path.join(__dirname, '..', 'engine'));
  return (impronta = h.digest('hex'));
}

/**
 * Il render di un caso del corpus, dalla cache se c'e. `spec` sostituisce quella del caso (una
 * variante: un'altra lingua, un visual avvolto); i dati restano quelli del caso.
 */
function renderCaso(c, spec) {
  const s = spec || c.caso.spec;
  const chiave = crypto.createHash('sha1').update(improntaMotore()).update(c.id)
    .update(JSON.stringify(s)).update(JSON.stringify(c.caso.dataParams || null)).digest('hex');
  const file = path.join(CARTELLA, chiave + '.html');
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { /* non c'e ancora */ }
  const html = require('../engine/render.js').render(s, c.caso.build());
  try {
    fs.mkdirSync(CARTELLA, { recursive: true });
    const tmp = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, html);
    fs.renameSync(tmp, file);
  } catch (e) { /* una cache che non si scrive non ferma la suite */ }
  return html;
}

module.exports = { casi, renderCaso, CARTELLA };
