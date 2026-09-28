/* Run the whole gate: unit tests, then the headless harness over every brief in
 * skill/evals/evals.json. Exit code 1 if anything fails. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const evals = JSON.parse(fs.readFileSync(path.join(root, 'skill', 'evals', 'evals.json'), 'utf8'));

/* TRENTA SECONDI, NON QUINDICI MINUTI. In fila la suite costava minuti, e una suite che si aspetta
   minuti si smette di lanciarla. Tre cose la tengono sotto il tetto:
   - IN PARALLELO: i test si dividono fra piu processi, tanti quanti i core;
   - IN GRUPPO: i test sincroni girano dentro pochi processi di lunga vita (test/gruppo.js), cosi
     jsdom e il motore si caricano una volta per processo e non una per file — gli avvii da soli
     valevano una quarantina di secondi di CPU;
   - I PIU LUNGHI PRIMA, bilanciati sui tempi del giro precedente (salvati in tmp): il tempo della
     suite e quello del gruppo piu lento, non la somma.
   I tre test asincroni (Chrome, video) restano processi a se: hanno il loro browser.
   L'output si stampa nell'ordine di sempre; in fondo il tempo e i piu lenti. */
const FILES = ['runtime.smoke.js', 'data-model.test.js', 'canonical-equivalence.test.js', 'app-fallback.test.js',
  'data-contract.test.js', 'design-tokens.test.js', 'no-raw-color.test.js', 'anchors.test.js', 'ribbon-crossing.test.js',
  'gauge.test.js', 'delta-card.test.js', 'anti-generic.test.js', 'env-names.test.js', 'palette.test.js', 'tipografia.test.js',
  'geometria.test.js', 'tempo.test.js', 'bookmark.test.js', 'intervista.test.js', 'donut.test.js', 'incolla.test.js',
  'powerbi.test.js', 'lingua.test.js', 'flusso-stock.test.js', 'video.test.js', 'dettaglio.test.js', 'conteggi.test.js',
  'legenda.test.js', 'video-export.test.js', 'bersaglio.test.js', 'barra.test.js', 'grammatica.test.js',
  'viste-validazione.test.js', 'variazioni.test.js', 'periodo-precedente.test.js', 'dimensioni.test.js',
  'filtri-visual.test.js', 'colori-categorie.test.js', 'tooltip.test.js', 'eventi.test.js'];
/* hanno un browser o un processo figlio da aspettare: non possono stare in un gruppo sincrono */
const ASINCRONI = ['video-export.test.js', 'bersaglio.test.js', 'barra.test.js'];
const TETTO_MS = 30000;
const FILE_TEMPI = path.join(os.tmpdir(), 'pruva-test-tempi.json');

const lavori = FILES.map(f => ({ nome: f, asincrono: ASINCRONI.indexOf(f) >= 0 }))
  .concat(evals.cases.map(c => ({ nome: 'harness:' + c.id, id: c.id, harness: true })));
let storia = {};
try { storia = JSON.parse(fs.readFileSync(FILE_TEMPI, 'utf8')); } catch (e) { /* primo giro */ }
const stima = j => storia[j.nome] || (j.harness ? 8000 : 1500);

const N = +(process.env.PRUVA_TEST_PROCESSI || Math.max(2, os.cpus().length));
const asincroni = lavori.filter(j => j.asincrono);
const sincroni = lavori.filter(j => !j.asincrono).sort((a, b) => stima(b) - stima(a));
/* i gruppi sono i processi rimasti dopo i tre asincroni; ogni lavoro va al gruppo piu scarico */
const nGruppi = Math.max(1, N - asincroni.length);
const gruppi = Array.from({ length: nGruppi }, () => ({ lavori: [], carico: 0 }));
sincroni.forEach(j => { const g = gruppi.reduce((a, b) => (b.carico < a.carico ? b : a)); g.lavori.push(j); g.carico += stima(j); });

const t0 = Date.now();
const lancia = (args, suRiga) => new Promise(res => {
  const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', d => { out += d; });
  p.stderr.on('data', d => { out += d; });
  p.on('close', code => res({ out, code }));
});

(async () => {
  await Promise.all([
    ...asincroni.map(async j => {
      const t = Date.now();
      const r = await lancia([path.join(__dirname, j.nome)]);
      Object.assign(j, { out: r.out, ok: r.code === 0, ms: Date.now() - t });
    }),
    ...gruppi.filter(g => g.lavori.length).map(async g => {
      const r = await lancia([path.join(__dirname, 'gruppo.js'), JSON.stringify(g.lavori.map(j => ({ nome: j.nome, id: j.id, harness: j.harness })))]);
      const esiti = r.out.split('\n').filter(l => l.startsWith('@@')).map(l => JSON.parse(l.slice(2)));
      g.lavori.forEach(j => {
        const e = esiti.find(x => x.nome === j.nome);
        if (e) Object.assign(j, e);
        else Object.assign(j, { ok: false, ms: 0, out: '  il gruppo si e fermato prima di questo test:\n' + r.out.slice(-2000) });
      });
    })
  ]);
  const ms = Date.now() - t0;

  let failed = 0;
  lavori.filter(j => !j.harness).forEach(j => { process.stdout.write(j.out || ''); if (!j.ok) failed++; });

  console.log('\nevals harness');
  const summary = [];
  lavori.filter(j => j.harness).forEach(j => {
    process.stdout.write(j.out || '');
    const s = j.riepilogo || { id: j.id, checks: 0, fail: 1, states: 0, kb: 0 };
    failed += s.fail;
    summary.push(s);
  });

  console.log('\nsummary');
  summary.forEach(s => console.log(`  ${s.fail ? 'FAIL' : 'PASS'}  ${s.id.padEnd(20)} ${String(s.checks).padStart(3)} checks  ${String(s.states).padStart(4)} states  ${s.kb}KB`));
  const nuovi = {};
  lavori.forEach(j => { if (j.ms) nuovi[j.nome] = j.ms; });
  try { fs.writeFileSync(FILE_TEMPI, JSON.stringify(nuovi)); } catch (e) { /* solo un'ottimizzazione */ }
  const lenti = lavori.slice().sort((a, b) => (b.ms || 0) - (a.ms || 0)).slice(0, 5).map(j => j.nome + ' ' + ((j.ms || 0) / 1000).toFixed(1) + 's');
  console.log(`\ntempo ${(ms / 1000).toFixed(1)}s su ${asincroni.length} processi asincroni + ${nGruppi} gruppi (tetto ${TETTO_MS / 1000}s) · i piu lenti: ${lenti.join(', ')}`);
  if (ms > TETTO_MS) console.log(`ATTENZIONE: la suite ha superato il tetto di ${TETTO_MS / 1000}s — accorcia il test piu lento prima di aggiungerne altri`);
  console.log(failed ? `\n${failed} FAILURES` : '\nall gates green');
  process.exit(failed ? 1 : 0);
})();
