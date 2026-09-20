#!/usr/bin/env node
/* REGISTRAZIONE VIDEO DI UN MOCKUP — `npm run video <caso|file.html>`.
 *
 * Uno screenshot non dice che il mockup e vivo. Questo script lo guida come lo guiderebbe una
 * persona — il cursore si muove, clicca, il report si filtra, si scende nel dettaglio, si
 * azzera — e ne esce un mp4 1280x720.
 *
 * DUE SCELTE CHE VALE LA PENA SPIEGARE.
 *
 * 1. IL CURSORE E' NOSTRO, NON QUELLO DI PLAYWRIGHT. Playwright sa gia annotare le azioni nel
 *    video (`recordVideo.showActions`), e il cursore lo disegna bene; ma stampa anche il
 *    sottotitolo dell'azione, che e il codice del test — `Click locator('.slchip')...`. Sembra
 *    un test automatico, ed e esattamente cio che un video di vendita non deve sembrare. Qui
 *    Playwright fa solo due cose: guida il browser e registra. Il cursore e il cerchio del clic
 *    sono un overlay iniettato con addInitScript, quindi esiste prima del contenuto della pagina.
 *
 * 2. IL MOUSE SI MUOVE DAVVERO. `click()` non muove il mouse: ci si teletrasporta, e il video
 *    sembra rotto. Ogni spostamento e interpolato passo per passo con una curva di
 *    accelerazione, e prima di ogni clic c'e una pausa: l'occhio deve arrivare prima della mano.
 *
 * La sceneggiatura non sta qui: la costruisce engine/video.js leggendo la scheda di interazione
 * del mockup. Qui si esegue e basta.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const VIDEO = require('../engine/video.js');

const RADICE = path.join(__dirname, '..');
const OUT = path.join(RADICE, 'out', 'video');
const TELA = { width: 1280, height: 720 };

/* ---------- argomenti ---------- */
const argv = process.argv.slice(2);
const opt = { velocita: 1, passi: null, out: null, tieni: false };
const liberi = [];
argv.forEach(a => {
  const m = a.match(/^--([a-z]+)(?:=(.*))?$/);
  if (!m) return liberi.push(a);
  if (m[1] === 'velocita') opt.velocita = Math.max(0.25, Math.min(4, parseFloat(m[2]) || 1));
  else if (m[1] === 'passi') opt.passi = m[2].split(',').map(s => s.trim()).filter(Boolean);
  else if (m[1] === 'out') opt.out = m[2];
  else if (m[1] === 'tieni') opt.tieni = true;
  /* --feed: la versione corta per il feed, tre passi soli, senza toccare le pause */
  else if (m[1] === 'feed') opt.passi = VIDEO.FEED.slice();
});
if (!liberi.length) {
  console.log('uso: npm run video -- <caso|file.html> [--velocita=1] [--feed] [--passi=' + VIDEO.PASSI_NOTI.join(',') + '] [--out=nome.mp4]');
  console.log('esempi:');
  console.log('  npm run video -- archetipi/canonical-executive-summary');
  console.log('  npm run video -- out/powerbi/mockup-app-lingue-v2.html --feed');
  process.exit(1);
}
const bersaglio = liberi[0];

/* ---------- il mockup: un caso del repo, oppure un file HTML gia pronto ---------- */
function casiDelRepo() {
  const out = {};
  const agg = (fonte, mappa) => Object.keys(mappa).filter(k => k[0] !== '_')
    .forEach(id => { out[fonte + '/' + id] = mappa[id]; });
  agg('archetipi', require('../engine/templates/index.js'));
  agg('banco', require('../engine/specs/banco/index.js'));
  agg('eval', require('../engine/specs/index.js'));
  const dirLoc = path.join(RADICE, 'engine', 'specs', 'locale');
  fs.readdirSync(dirLoc).filter(f => f.endsWith('.js') && f !== 'index.js')
    .forEach(f => { out['locale/' + f.replace(/\.js$/, '')] = require(path.join(dirLoc, f)); });
  return out;
}

function preparaSorgente() {
  const casi = casiDelRepo();
  if (casi[bersaglio]) {
    /* dal caso si ricava la SCENEGGIATURA dalla scheda, che e la strada buona: il video resta
       coerente col mockup anche quando il mockup cambia */
    const { render } = require('../engine/render.js');
    const caso = casi[bersaglio], data = caso.build();
    fs.mkdirSync(OUT, { recursive: true });
    const file = path.join(OUT, '.' + bersaglio.replace(/\//g, '__') + '.html');
    fs.writeFileSync(file, render(caso.spec, data));
    return { file, nome: bersaglio.replace(/\//g, '__'), passi: VIDEO.sceneggiatura(caso.spec, data, { passi: opt.passi }), fonte: 'scheda' };
  }
  const file = path.isAbsolute(bersaglio) ? bersaglio : path.join(RADICE, bersaglio);
  if (!fs.existsSync(file)) {
    console.error('non trovo ne un caso del repo ne il file: ' + bersaglio);
    console.error('casi disponibili: ' + Object.keys(casi).join(', '));
    process.exit(1);
  }
  /* un file HTML senza la sua spec non ha una scheda da leggere: la sceneggiatura si ricava
     dal DOM, che dichiara le stesse cose (data-f, data-drill, il selettore del periodo) */
  return { file, nome: path.basename(file, '.html'), passi: null, fonte: 'dom' };
}

/* ---------- l'overlay: cursore e cerchio del clic ----------
   UN PALLINO, NON UNA FRECCIA, e la scelta e dell'autore: qui non si documenta uno schermo, si
   dimostra che una cosa risponde al tocco. In un video piccolo, muto, in mezzo a uno scroll, il
   segno "da tutorial" e leggibilita: la freccia sparisce sul fondo chiaro del report, il pallino
   con l'alone no. */
/* Gira dentro la pagina, prima del contenuto. Non tocca nessun evento: pointer-events none su
   tutto, e z-index sopra qualunque cosa il mockup disegni. */
function overlay() {
  const monta = () => {
    const st = document.createElement('style');
    st.textContent = `
      @keyframes pruvaOnda { from { transform: translate(-50%,-50%) scale(.3); opacity: .6 }
                             to   { transform: translate(-50%,-50%) scale(1);  opacity: 0 } }
      #pruvaCur { position: fixed; left: 0; top: 0; width: 16px; height: 16px; margin: -8px 0 0 -8px;
        border-radius: 50%; background: rgba(224,32,27,.88); box-shadow: 0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,.35);
        z-index: 999999; pointer-events: none; opacity: 0; transition: transform 30ms linear, opacity 180ms linear }
      .pruvaOnda { position: fixed; width: 48px; height: 48px; border-radius: 50%; pointer-events: none;
        border: 2px solid rgba(224,32,27,.9); background: rgba(224,32,27,.16); z-index: 999998;
        animation: pruvaOnda 520ms ease-out forwards }
      * { cursor: none !important }`;
    document.head.appendChild(st);
    const cur = document.createElement('div');
    cur.id = 'pruvaCur';
    document.body.appendChild(cur);
    document.addEventListener('mousemove', e => {
      cur.style.opacity = '1';
      cur.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    }, true);
    document.addEventListener('mousedown', e => {
      const o = document.createElement('div');
      o.className = 'pruvaOnda';
      o.style.left = e.clientX + 'px'; o.style.top = e.clientY + 'px';
      document.body.appendChild(o);
      setTimeout(() => o.remove(), 600);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta);
  else monta();
}

/* ---------- movimento del mouse ---------- */
const dormi = ms => new Promise(r => setTimeout(r, ms));

async function muovi(page, da, a, durata) {
  const n = Math.max(10, Math.round(durata / 14));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    /* accelera e rallenta: un movimento a velocita costante sembra una macchina */
    const e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    await page.mouse.move(da.x + (a.x - da.x) * e, da.y + (a.y - da.y) * e);
    await dormi(durata / n);
  }
  return a;
}

/** Il centro del bersaglio: dentro la card indicata, l'elemento piu grande che corrisponde. */
async function centro(page, sel, dentro, quale) {
  return page.evaluate(({ sel, dentro, quale }) => {
    let ambito = document;
    if (dentro) {
      const card = [...document.querySelectorAll('#page .card')]
        .find(c => ((c.querySelector('.ch h3') || {}).textContent || '').indexOf(dentro) === 0);
      if (card) ambito = card;
    }
    let el = [...ambito.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
    if (!el.length) return null;
    /* per un clic si prende il bersaglio piu grande: e quello che un umano colpirebbe; per il
       tasto destro si prende la prima riga, che e la piu alta e la piu leggibile */
    el = quale === 'primo' ? el : el.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    const r = el[0].getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, { sel, dentro, quale: quale || 'grande' });
}

/* ---------- la sceneggiatura ricavata dal DOM, per un HTML senza spec ---------- */
async function sceneggiaturaDaDom(page) {
  const d = await page.evaluate(() => {
    const tit = c => ((c.querySelector('.ch h3') || {}).textContent || '').trim();
    const card = [...document.querySelectorAll('#page .card')];
    const conHit = card.map(c => ({ t: tit(c), n: c.querySelectorAll('[data-f]').length,
      drill: c.querySelectorAll('[data-drill]').length, svg: !!c.querySelector('svg') }))
      .filter(x => x.n > 0);
    return {
      cross: conHit.filter(x => x.svg).map(x => x.t),
      drill: conHit.filter(x => x.drill).map(x => x.t),
      pagine: [...document.querySelectorAll('.navbtn')].map(b => b.dataset.page),
      periodo: !!document.querySelector('#slBtn') && !!document.querySelector('#slQtr, .slchip[data-q]'),
      reset: !!document.querySelector('#btnReset')
    };
  });
  const A = VIDEO.ATTESE, pg = d.pagine[0] || null, s = [];
  s.push({ tipo: 'pausa', pagina: pg, etichetta: 'il mockup fermo, si vede l\'insieme', attesa: A.apertura });
  if ((!opt.passi || opt.passi.includes('filtro')) && d.cross[0])
    s.push({ tipo: 'clic', sel: '[data-f]', dentro: d.cross[0], pagina: pg, etichetta: 'clicca dentro "' + d.cross[0] + '"', attesa: A.clic });
  if ((!opt.passi || opt.passi.includes('periodo')) && d.periodo)
    s.push({ tipo: 'periodo', sel: '#slBtn', bersaglio: '#slQtr [data-q="2"]', pagina: pg, etichetta: 'scegli il terzo trimestre', attesa: A.periodo });
  if ((!opt.passi || opt.passi.includes('drill')) && d.drill[0]) {
    s.push({ tipo: 'destro', sel: '[data-drill]', dentro: d.drill[0], pagina: pg, etichetta: 'tasto destro su una riga di "' + d.drill[0] + '"', attesa: A.drill });
    s.push({ tipo: 'indietro', sel: '#btnBack', pagina: pg, etichetta: 'torna indietro', attesa: A.indietro });
  } else if ((!opt.passi || opt.passi.includes('drill')) && d.pagine[1]) {
    /* senza drill, la seconda pagina e comunque una cosa che uno screenshot non mostra */
    s.push({ tipo: 'pagina', sel: '.navbtn[data-page="' + d.pagine[1] + '"]', pagina: pg, etichetta: 'vai alla pagina "' + d.pagine[1] + '"', attesa: A.clic });
  }
  if ((!opt.passi || opt.passi.includes('reset')) && d.reset)
    s.push({ tipo: 'reset', sel: '#btnReset', pagina: pg, etichetta: 'azzera i filtri', attesa: A.reset });
  s.push({ tipo: 'pausa', pagina: pg, etichetta: 'l\'ultima inquadratura', attesa: A.fine });
  return s;
}

/* ---------- ffmpeg: da webm a mp4 ---------- */
function ffmpeg(da, a) {
  const prova = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (prova.error) {
    console.error('\nffmpeg non e nel PATH: il webm resta in ' + da);
    return null;
  }
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', da, '-r', '30',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', a],
    { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); return null; }
  return a;
}

/* ---------- il giro ---------- */
(async () => {
  const src = preparaSorgente();
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch { console.error('manca playwright: npm i -D playwright'); process.exit(1); }

  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, '.grezzo');
  fs.mkdirSync(tmp, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({
    viewport: TELA, deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: TELA }
  });
  await ctx.addInitScript(overlay);
  const page = await ctx.newPage();
  await page.goto('file:///' + src.file.replace(/\\/g, '/'));
  await page.waitForTimeout(1200);

  const passi = src.passi || await sceneggiaturaDaDom(page);
  const v = opt.velocita;
  console.log('mockup: ' + bersaglio + '   sceneggiatura: ' + (src.fonte === 'scheda' ? 'dalla scheda di interazione' : 'dal DOM'));
  console.log('durata stimata: ' + VIDEO.durata(passi, v) + 's a velocita ' + v + '\n');

  /* si parte da un angolo: il cursore entra in scena invece di comparire sul bersaglio */
  let da = { x: 40, y: TELA.height - 40 };
  await page.mouse.move(da.x, da.y);

  for (const p of passi) {
    const t0 = Date.now();
    process.stdout.write('  · ' + p.etichetta);
    if (p.tipo !== 'pausa') {
      const quale = p.tipo === 'destro' ? 'primo' : 'grande';
      const c = await centro(page, p.sel, p.dentro, quale);
      if (!c) { console.log('   — bersaglio non trovato (' + p.sel + '), passo saltato'); continue; }
      da = await muovi(page, da, c, 700 / v);
      await dormi(260 / v);                       /* l'occhio arriva prima della mano */
      if (p.tipo === 'destro') await page.mouse.click(c.x, c.y, { button: 'right' });
      else { await page.mouse.down(); await page.mouse.up(); }
      if (p.tipo === 'periodo' && p.bersaglio) {
        await dormi(500 / v);
        const b = await centro(page, p.bersaglio, null, 'primo');
        if (b) { da = await muovi(page, da, b, 520 / v); await dormi(220 / v); await page.mouse.down(); await page.mouse.up(); }
        /* il pannello resta aperto dopo la scelta e coprirebbe mezza pagina per tutto il resto
           del video — e anche il tasto "indietro" del drill. Si richiude, come farebbe una persona. */
        await dormi(420 / v);
        const chiudi = await centro(page, p.sel, null, 'primo');
        if (chiudi) { da = await muovi(page, da, chiudi, 420 / v); await dormi(160 / v); await page.mouse.down(); await page.mouse.up(); }
      }
    }
    await dormi(p.attesa / v);
    console.log('   [' + ((Date.now() - t0) / 1000).toFixed(1) + 's]');
  }

  await ctx.close();
  await browser.close();

  const grezzo = fs.readdirSync(tmp).filter(f => f.endsWith('.webm')).map(f => path.join(tmp, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  const finale = path.join(OUT, opt.out || (src.nome + '.mp4'));
  const fatto = ffmpeg(grezzo, finale);
  if (fatto) {
    fs.rmSync(tmp, { recursive: true, force: true });
    if (!opt.tieni && src.fonte === 'scheda') fs.rmSync(src.file, { force: true });
    const kb = Math.round(fs.statSync(fatto).size / 1024);
    console.log('\nvideo: ' + path.relative(RADICE, fatto) + '   ' + TELA.width + 'x' + TELA.height + ' · 30fps · ' + kb + 'KB');
  }
})().catch(e => { console.error(e); process.exit(1); });
