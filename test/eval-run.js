#!/usr/bin/env node
/* Eval harness — misura qualità e costo della generazione end-to-end.
 *
 *   node test/eval-run.js sonnet          run vero, consuma crediti
 *   node test/eval-run.js sonnet --dry    dry-run con la spec canned, costo zero
 *   node test/eval-run.js sonnet --broken dry-run guasto: ripara -> fallback, costo zero
 *
 * Non duplica la pipeline: avvia (o riusa) il server Next e chiama /api/generate, cioè
 * esattamente il percorso che gira in produzione — stessa validazione, stessa riparazione,
 * stesso fallback, stesso metering. I numeri nel CSV vengono da lì, non sono ricalcolati qui.
 *
 * Nessun voto di qualità: quello lo dà una persona aprendo gli HTML.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/* ---------- parametri ---------- */

const RUNS_PER_CASE = 2;          // alzalo se un giorno vuoi più ripetizioni
const PORT = 3123;                // porta dedicata, per non pestare un dev server già aperto
const MAX_ATTEMPTS = 3;           // tentativi per generazione (rete / rate-limit)
const BACKOFF_MS = [5000, 15000]; // attesa fra un tentativo e il successivo
const REQUEST_TIMEOUT_MS = 420000;
const MAX_TOTAL_COST_USD = 2.00;  // tetto duro: se il giro lo supera, si ferma

const MODELS = ['sonnet', 'haiku'];   // haiku è ammesso ma oggi non si lancia

/* I 5 casi. I campi dell'intake sono quelli VERI dell'app (lib/intake.ts):
   audience | branding | comparison | scope. Un intake vuoto è l'equivalente esatto di
   "Salta, decidi tu": nessun vincolo dal questionario, decide il modello. */
const CASES = [
  {
    id: 'social',
    intake: { audience: 'manager', branding: 'none', comparison: 'MoM', scope: 'single' },
    brief: 'Report social mensile multi-piattaforma per un cliente beverage: Instagram, TikTok, LinkedIn, YouTube, Facebook. Focus su reach, engagement e crescita follower, con split paid/organic. Pubblico: il marketing manager del cliente.'
  },
  {
    id: 'ecommerce',
    intake: { audience: 'owner', branding: 'navy', comparison: 'YoY', scope: 'single' },
    brief: 'Monthly e-commerce report for a fashion online store: sales, returns, acquisition channels, repeat-purchase rate. Audience: the founder.'
  },
  {
    id: 'saas',
    intake: { audience: 'board', branding: 'none', comparison: 'YoY', scope: 'single' },
    brief: 'SaaS growth dashboard for a Series A leadership team: MRR, net revenue retention, churn, new vs expansion, CAC payback. Audience: the exec team and board.'
  },
  {
    id: 'retail',
    intake: {},   // "Salta, decidi tu"
    brief: 'mi serve qualcosa per far vedere al cliente come vanno le vendite del negozio, ho i dati su un excel, cose tipo fatturato per mese e per categoria, e quali prodotti vanno meglio. voglio una mock dashboard'
  },
  {
    id: 'gyms',
    intake: {},   // "Salta, decidi tu"
    brief: 'ciao allora avrei bisogno di far vedere a un cliente che ha una catena di 3 palestre come vanno gli abbonamenti, tipo quanti nuovi iscritti al mese, quali corsi riempiono di più, e se la gente rinnova o molla. i dati ce li ho su excel. grazie mille'
  }
];

const COLUMNS = ['id', 'run', 'model', 'valid_first_try', 'repairs', 'fallback',
  'tokens_in', 'tokens_out', 'cost_usd', 'latency_ms', 'fallback_reason', 'error', 'raw_json'];

/* ---------- utilità ---------- */

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

function parseArgs(argv) {
  const args = argv.slice(2);
  /* --broken e un dry-run che sbaglia apposta: serve a provare il percorso
     ripara -> fallback e il salvataggio del JSON grezzo senza spendere un centesimo. */
  const broken = args.includes('--broken');
  const dry = broken || args.includes('--dry');
  const model = args.find(a => !a.startsWith('--'));
  if (!model) {
    console.error('Uso: node test/eval-run.js <' + MODELS.join('|') + '> [--dry] [--broken]');
    process.exit(1);
  }
  if (!MODELS.includes(model)) {
    console.error('Modello "' + model + '" non previsto. Valori: ' + MODELS.join(', '));
    process.exit(1);
  }
  return { model, dry, broken };
}

/** Non sovrascrivere mai un giro precedente: se la cartella o il CSV esistono, versiona. */
function reserveOutputs(model) {
  const root = path.join(process.cwd(), 'eval-out');
  fs.mkdirSync(root, { recursive: true });
  let label = model, n = 1;
  while (fs.existsSync(path.join(root, label)) || fs.existsSync(path.join(root, label + '.csv')) ||
         fs.existsSync(path.join(root, label + '-server.log'))) {
    n += 1;
    label = model + '-' + n;
  }
  const dir = path.join(root, label);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, csv: path.join(root, label + '.csv'), label };
}

const csvCell = v => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

/* ---------- server ---------- */

/* Interroga la HOME, non /api/generate: quell'endpoint chiama il modello, quindi ogni sonda
   sarebbe una generazione a pagamento. Con lo stub non si vedeva (costo zero, 20ms); in
   modalita reale la sonda scadeva prima della generazione e ne lanciava una al secondo. */
async function isUp() {
  try {
    const r = await fetch('http://127.0.0.1:' + PORT + '/', {
      method: 'GET',
      signal: AbortSignal.timeout(4000)
    });
    return r.status < 500;
  } catch { return false; }
}

let serverLogPath = null;

async function startServer(dry, logPath, broken) {
  serverLogPath = logPath;
  if (await isUp()) {
    log('· server già in ascolto su :' + PORT + ', lo riuso');
    return null;
  }
  log('· avvio il server Next su :' + PORT + ' …');
  const env = { ...process.env };
  /* la risposta deve riportare i tentativi rifiutati, altrimenti del fallimento resta solo
     la riga di log e il JSON grezzo si perde di nuovo */
  env.PRUVA_TRACE = '1';
  if (dry) env.PRUVA_STUB = broken ? 'broken' : '1';
  /* un run vero non deve poter finire sullo stub, e vanno tolti ENTRAMBI i prefissi:
     il vecchio nome e ancora letto come ripiego, quindi lasciarlo li basterebbe a
     far passare per vero un giro che non ha chiamato nessun modello. */
  else { delete env.PRUVA_STUB; delete env.MOCKLY_STUB; env.PRUVA_STUB = 'api'; }   /* senza, l'app incolla */

  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'dev', '-p', String(PORT)],
    { env, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });

  const sink = fs.createWriteStream(logPath, { flags: 'a' });
  child.stdout.on('data', d => { sink.write(String(d)); if (/error/i.test(String(d))) process.stderr.write(String(d)); });
  child.stderr.on('data', d => { sink.write(String(d)); process.stderr.write(String(d)); });

  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    if (await isUp()) { log('· server pronto'); return child; }
  }
  throw new Error('il server non è partito entro 90 secondi');
}

function stopServer(child) {
  if (!child) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
    else process.kill(-child.pid);
  } catch { /* già chiuso */ }
}

/* ---------- il JSON grezzo dei tentativi rifiutati ---------- */

/* Nel primo giro a pagamento sono rimasti solo i messaggi d errore: si sapeva che tre
   generazioni avevano dichiarato una dimensione vuota, non COME l avevano scritta, quindi la
   verifica offline ha dovuto ricostruire le forme invece di ripescarle. Qui il payload grezzo
   di ogni tentativo rifiutato finisce su file, parsato quando si parsa e testuale quando no
   (il caso "testo dopo il JSON" e proprio quello che non si parsa). */
let traceWarned = false;

function saveRejected(dir, id, run, meta) {
  const rejected = meta.rejected;
  const andato_storto = meta.fallback || Number(meta.repairs) > 0;

  if (!Array.isArray(rejected)) {
    /* il campo esce solo con PRUVA_TRACE=1: se manca proprio quando servirebbe, il server
       in ascolto e stato avviato senza. Meglio saperlo subito che scoprirlo a giro finito. */
    if (andato_storto && !traceWarned) {
      traceWarned = true;
      log('');
      log('  ATTENZIONE: una generazione e fallita ma la risposta non porta i tentativi grezzi.');
      log('  Il server in ascolto e stato avviato senza PRUVA_TRACE=1: chiudilo e rilancia,');
      log('  altrimenti dei fallimenti resta solo il messaggio d errore.');
      log('');
    }
    return '';
  }
  if (!rejected.length) return '';

  /* fail- quando si e finiti sul fallback, repair- quando il secondo tentativo ha rimediato:
     il nome del file non deve far sembrare perso un giro che invece si e ripreso */
  const name = (meta.fallback ? 'fail-' : 'repair-') + id + '-run' + run + '.json';
  const payload = {
    id, run, model: meta.model,
    fallback: !!meta.fallback,
    repairs: meta.repairs,
    attempts: rejected.map(a => {
      const out = { attempt: a.attempt, errors: a.errors, raw: a.raw };
      try { out.parsed = JSON.parse(a.raw); } catch { out.parsed = null; }
      return out;
    })
  };
  fs.writeFileSync(path.join(dir, name), JSON.stringify(payload, null, 2));
  return name;
}

/* ---------- una generazione ---------- */

async function generateOnce(testCase, model) {
  const res = await fetch('http://127.0.0.1:' + PORT + '/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ brief: testCase.brief, intake: testCase.intake, model }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 503 && data.config) {
    const err = new Error(data.error);
    err.fatal = true;               /* problema di account: inutile insistere */
    throw err;
  }
  if (!res.ok) {
    const err = new Error(data.error || ('HTTP ' + res.status));
    err.retryable = res.status === 503 || res.status >= 500;
    throw err;
  }
  return data;
}

async function generateWithRetry(testCase, model) {
  let last;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await generateOnce(testCase, model);
    } catch (err) {
      if (err.fatal) throw err;
      last = err;
      /* Un timeout NON si ritenta: il server sta ancora lavorando e ogni ritentativo e
         un'altra generazione a pagamento. Nel primo giro vero un solo caso in timeout ha
         fatto partire sei chiamate al modello. Si ritenta solo cio che non e costato nulla:
         connessione rifiutata, 5xx, rate limit. */
      const retryable = err.retryable ||
        /fetch failed|ECONNRESET|ECONNREFUSED|socket/i.test(err.message || '');
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      const wait = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
      log('    tentativo ' + attempt + ' fallito (' + err.message + '); riprovo fra ' + (wait / 1000) + 's');
      await sleep(wait);
    }
  }
  throw last;
}

/* ---------- giro completo ---------- */

async function main() {
  const { model, dry, broken } = parseArgs(process.argv);
  const { dir, csv, label } = reserveOutputs(model);
  const total = CASES.length * RUNS_PER_CASE;

  log('');
  log('Pruva — eval  ·  modello: ' + model + '  ·  ' + CASES.length + ' casi × ' + RUNS_PER_CASE + ' run = ' + total + ' generazioni');
  log(broken ? 'MODALITÀ DRY-RUN GUASTA: spec canned e sbagliata apposta (ripara -> fallback), costo zero'
    : dry ? 'MODALITÀ DRY-RUN: spec canned, nessuna chiamata al modello, costo zero'
      : 'MODALITÀ REALE: ogni generazione consuma crediti');
  log('output: eval-out/' + label + '/  ·  csv: eval-out/' + label + '.csv');
  log('');

  const serverLog = path.join(path.dirname(csv), label + '-server.log');
  const child = await startServer(dry, serverLog, broken);
  const rows = [];
  let modeChecked = false;

  try {
    fs.writeFileSync(csv, COLUMNS.join(',') + '\n');

    for (const testCase of CASES) {
      for (let run = 1; run <= RUNS_PER_CASE; run++) {
        const tag = testCase.id + ' run' + run;
        process.stdout.write('· ' + tag.padEnd(20) + ' ');
        const started = Date.now();
        let row;

        try {
          const data = await generateWithRetry(testCase, model);
          const m = data.meta || {};

          /* la modalità dichiarata deve combaciare con quella effettiva: senza questo
             controllo uno STUB dimenticato in .env.local farebbe passare per vero
             un giro che non ha mai chiamato il modello */
          if (!modeChecked) {
            const isStub = String(m.model || '').startsWith('stub');
            if (isStub && !dry) {
              throw Object.assign(new Error(
                'Il server risponde con la spec canned (PRUVA_STUB o MOCKLY_STUB attivo, probabilmente ' +
                'in .env.local): il giro non chiamerebbe mai il modello. Toglilo e rilancia.'
              ), { fatal: true });
            }
            if (!isStub && dry) {
              throw Object.assign(new Error(
                'Chiesto --dry ma il server chiama il modello davvero: interrompo per non spendere.'
              ), { fatal: true });
            }
            modeChecked = true;
          }

          fs.writeFileSync(path.join(dir, testCase.id + '-run' + run + '.html'), data.html);
          const rawFile = saveRejected(dir, testCase.id, run, m);

          row = {
            id: testCase.id, run, model: m.model,
            valid_first_try: (!m.fallback && m.repairs === 0) ? 'S' : 'N',
            repairs: m.repairs, fallback: m.fallback ? 'S' : 'N',
            tokens_in: m.tokensIn, tokens_out: m.tokensOut,
            cost_usd: (m.costUsd || 0).toFixed(6),
            latency_ms: m.latencyMs,
            fallback_reason: (m.errors && m.errors.length) ? String(m.errors[0]).slice(0, 200) : '',
            error: '', raw_json: rawFile || ''
          };
          const esito = row.valid_first_try === 'S' ? 'ok primo colpo'
            : row.fallback === 'S' ? 'FALLBACK' : 'ok dopo riparazione';
          log(esito.padEnd(20) + (m.latencyMs / 1000).toFixed(1) + 's  $' +
            (m.costUsd || 0).toFixed(4) + '  ' + (m.bytes / 1024).toFixed(0) + 'KB');
        } catch (err) {
          row = {
            id: testCase.id, run, model, valid_first_try: '', repairs: '', fallback: '',
            tokens_in: '', tokens_out: '', cost_usd: '', latency_ms: Date.now() - started, fallback_reason: '',
            error: err.message, raw_json: ''
          };
          log('ERRORE  ' + err.message);
          if (err.fatal) {
            rows.push(row);
            fs.appendFileSync(csv, COLUMNS.map(c => csvCell(row[c])).join(',') + '\n');
            log('\n  Interrompo il giro: è un problema di configurazione, non della generazione.');
            summarise(rows, csv, dir, label);
            return;
          }
        }

        rows.push(row);
        fs.appendFileSync(csv, COLUMNS.map(c => csvCell(row[c])).join(',') + '\n');

        /* tetto duro di spesa: nessun giro puo sfuggire di mano */
        const spent = rows.reduce((a, r) => a + Number(r.cost_usd || 0), 0);
        if (spent > MAX_TOTAL_COST_USD) {
          log('');
          log('  Tetto di spesa raggiunto ($' + spent.toFixed(2) + ' > $' + MAX_TOTAL_COST_USD.toFixed(2) + '): mi fermo.');
          return;
        }
      }
    }
  } finally {
    stopServer(child);
  }

  summarise(rows, csv, dir, label);
}

function summarise(rows, csv, dir, label) {
  const done = rows.filter(r => !r.error);
  const n = done.length;
  const pct = k => n ? Math.round((100 * k) / n) : 0;

  const firstTry = done.filter(r => r.valid_first_try === 'S').length;
  const withinOneRepair = done.filter(r => r.fallback === 'N').length;
  const avgCost = n ? done.reduce((a, r) => a + Number(r.cost_usd || 0), 0) / n : 0;
  const avgLat = n ? done.reduce((a, r) => a + Number(r.latency_ms || 0), 0) / n : 0;
  const failed = rows.length - n;

  log('');
  log('─'.repeat(60));
  log('RIEPILOGO  ·  ' + n + ' generazioni riuscite' + (failed ? ', ' + failed + ' in errore' : ''));
  log('─'.repeat(60));
  log('  valida al primo colpo      ' + pct(firstTry) + '%  (' + firstTry + '/' + n + ')     soglia ≥ 75%');
  log('  valida entro 1 riparazione ' + pct(withinOneRepair) + '%  (' + withinOneRepair + '/' + n + ')     soglia ≥ 95%');
  log('  costo medio                $' + avgCost.toFixed(4) + '   ·  totale $' + (avgCost * n).toFixed(4));
  log('  latenza media              ' + (avgLat / 1000).toFixed(1) + 's');
  log('');
  /* controprova: l'endpoint a pagamento va chiamato una volta per generazione, non una di
     piu. E' esattamente il difetto che la sonda di prontezza aveva introdotto. */
  if (serverLogPath && fs.existsSync(serverLogPath)) {
    const hits = fs.readFileSync(serverLogPath, 'utf8').split('[pruva:meter]').length - 1;
    log('  chiamate a /api/generate   ' + hits + '  (attese ' + rows.length + ')' +
      (hits === rows.length ? '  ok' : '  ATTENZIONE: non combaciano'));
    log('');
  }
  const grezzi = rows.filter(r => r.raw_json).map(r => r.raw_json);
  if (grezzi.length) {
    log('  json grezzi salvati        ' + grezzi.length + '  (' + grezzi.slice(0, 3).join(', ') +
      (grezzi.length > 3 ? ', …' : '') + ')');
    log('');
  }
  log('  csv:   ' + path.relative(process.cwd(), csv));
  log('  html:  ' + path.relative(process.cwd(), dir) + '/  (aprili e dai il voto a mano)');
  log('');
}

main().catch(err => {
  console.error('\nERRORE FATALE:', err.message);
  process.exit(1);
});
