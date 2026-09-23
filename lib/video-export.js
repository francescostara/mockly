/* L'ESPORTAZIONE VIDEO DALL'APP — il bottone "Esporta video" e la route /api/video.
 *
 * Il registratore esiste gia (scripts/video.js): guida un Chrome headless con Playwright, muove
 * il cursore, clicca, filtra, drilla, azzera, e ne esce un mp4. Qui c'e solo la colla fra il
 * bottone e quello script, in un file che i test di node possono leggere senza Next.
 *
 * LA REGOLA CHE GOVERNA IL FILE: il bottone e attivo solo dove l'esportazione funziona davvero.
 * Registrare vuol dire avere Chrome, Playwright e ffmpeg sulla macchina che serve l'app. In
 * locale ci sono; su Vercel no (niente Chrome di sistema, niente ffmpeg, una funzione
 * serverless non tiene aperto un browser per trenta secondi). Li il bottone resta disattivato e
 * dice perche — come "Condividi". Un bottone che risponde con un errore, o peggio con un video
 * finto, sarebbe un percorso che esiste solo nei test.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, spawn } = require('child_process');

const RADICE = path.join(__dirname, '..');
const SCRIPT = path.join(RADICE, 'scripts', 'video.js');
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'
];
/* un mockup e un file solo da 50-130KB: oltre il mezzo mega non e un mockup */
const MAX_HTML = 512 * 1024;

/**
 * L'esportazione e possibile su questa macchina? Restituisce { ok, motivo }: il motivo e cio che
 * il bottone disattivato mostra nel suo title, quindi e scritto per una persona.
 */
function disponibile(env) {
  const e = env || process.env;
  if (e.VERCEL) return { ok: false, motivo: 'serverless' };
  try { require.resolve('playwright', { paths: [RADICE] }); } catch { return { ok: false, motivo: 'playwright' }; }
  if (!CHROME.some(p => fs.existsSync(p))) return { ok: false, motivo: 'chrome' };
  const f = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (f.error || f.status !== 0) return { ok: false, motivo: 'ffmpeg' };
  return { ok: true, motivo: null };
}

/** Gli argomenti dello script: sempre la versione breve (--feed), che e quella che si condivide. */
function argomenti(fileHtml, dest) {
  return [SCRIPT, fileHtml, '--feed', '--dest=' + dest];
}

/** Controlla che quello che arriva sia un mockup di Pruva, non un HTML qualsiasi da far girare. */
function valida(html) {
  if (typeof html !== 'string' || !html.length) return 'manca il mockup';
  if (Buffer.byteLength(html) > MAX_HTML) return 'il file e troppo grande per essere un mockup';
  if (html.indexOf('id="canvas"') < 0 || html.indexOf('var SPEC=') < 0) return 'non e un mockup di Pruva';
  return null;
}

/**
 * Registra il video di un mockup. Scrive l'HTML in una cartella temporanea, lancia lo script e
 * restituisce il percorso dell'mp4. Pulisce sempre, anche se lo script fallisce.
 */
function esporta(html, opts) {
  const o = opts || {};
  const errore = valida(html);
  if (errore) return Promise.reject(Object.assign(new Error(errore), { status: 400 }));
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'pruva-video-'));
  const file = path.join(cartella, 'mockup-' + crypto.randomBytes(4).toString('hex') + '.html');
  const dest = path.join(cartella, 'pruva-demo.mp4');
  fs.writeFileSync(file, html);
  return new Promise((ok, ko) => {
    const figlio = spawn(process.execPath, argomenti(file, dest), { cwd: RADICE, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    figlio.stdout.on('data', d => { log += d; });
    figlio.stderr.on('data', d => { log += d; });
    const timer = setTimeout(() => figlio.kill(), o.timeoutMs || 120000);
    figlio.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(dest)) {
        const buf = fs.readFileSync(dest);
        fs.rmSync(cartella, { recursive: true, force: true });
        ok(buf);
      } else {
        fs.rmSync(cartella, { recursive: true, force: true });
        ko(Object.assign(new Error('registrazione non riuscita'), { status: 500, log: log.slice(-2000) }));
      }
    });
  });
}

module.exports = { disponibile, argomenti, valida, esporta, MAX_HTML };
