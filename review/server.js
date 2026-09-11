#!/usr/bin/env node
/* LO STRUMENTO DI REVISIONE — `npm run review`.
 *
 * Chiude il passo 5 del protocollo locale: aprire, cliccare, giudicare. Senza scaricare file,
 * senza aprirne venti in venti schede, e sempre con le stesse quattro domande — perche i voti
 * di giri diversi devono essere confrontabili, e lo sono solo se il questionario non cambia.
 *
 * Il mockup e SERVITO DALLA MEMORIA, renderizzato al volo dalla spec: cio che si giudica e
 * quello che il motore produce adesso, non un file rimasto in out/ da tre commit fa.
 *
 * LA REGOLA CHE CONTA: il verdetto automatico non viene inviato alla pagina finche il voto non
 * e partito. Non e nascosto — non esce proprio dal server. Se l'autore lo vedesse prima, lo
 * ancorerebbe; mostrandolo dopo si misura una cosa che nessun test sa dire da solo, cioe quanto
 * i gate sono tarati sul gusto di chi decide.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { costruisci } = require('./coda.js');
const { pagina, riepilogo } = require('./pagina.js');

const PORTA = Number(process.env.PRUVA_REVIEW_PORT) || 4173;
const LIMITE = Number((process.argv.find(a => a.startsWith('--solo=')) || '').split('=')[1]) || 0;
const ARCHIVIO = path.join(__dirname, 'reviews.json');

function leggiArchivio() {
  try { return JSON.parse(fs.readFileSync(ARCHIVIO, 'utf8')); }
  catch { return { giudizi: [] }; }
}
function scriviArchivio(a) {
  fs.writeFileSync(ARCHIVIO, JSON.stringify(a, null, 2) + '\n');
}

console.log('\nSTRUMENTO DI REVISIONE');
console.log('='.repeat(60));
process.stdout.write('preparo la coda e i verdetti automatici… ');
const coda = costruisci(LIMITE);
console.log(coda.length + ' mockup');
const perId = {};
coda.forEach(c => { perId[c.id] = c; });
const auto = {};
coda.forEach(c => { auto[c.id] = c.auto; });
console.log('  spedibili secondo la macchina: ' +
  coda.filter(c => c.auto.verdetto === 'SPEDIBILE').length + '/' + coda.length +
  '   (l autore non li vede prima di votare)');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const invia = (tipo, corpo, codice) => {
    res.writeHead(codice || 200, { 'Content-Type': tipo + '; charset=utf-8' });
    res.end(corpo);
  };

  if (url.pathname === '/') return invia('text/html', pagina());

  if (url.pathname === '/api/coda') {
    const gia = leggiArchivio().giudizi.map(g => g.id);
    /* NIENTE verdetto qui dentro: e il punto dello strumento */
    const pubblica = coda.map(c => ({
      id: c.id, fonte: c.fonte, nome: c.nome, titolo: c.titolo,
      archetipo: c.archetipo, scheda: c.scheda
    }));
    return invia('application/json', JSON.stringify({ coda: pubblica, gia }));
  }

  if (url.pathname.startsWith('/mock/')) {
    const id = decodeURIComponent(url.pathname.slice('/mock/'.length));
    const c = perId[id];
    if (!c || !c.html) return invia('text/html', '<p>mockup non renderizzabile</p>', 404);
    return invia('text/html', c.html);
  }

  if (url.pathname === '/api/voto' && req.method === 'POST') {
    let corpo = '';
    req.on('data', d => { corpo += d; });
    req.on('end', () => {
      let voto;
      try { voto = JSON.parse(corpo); } catch { return invia('application/json', '{}', 400); }
      const archivio = leggiArchivio();
      const g = Object.assign({}, voto, {
        data: new Date().toISOString(),
        auto: (auto[voto.id] || {}).verdetto || null
      });
      /* un voto corretto sostituisce il precedente: l'autore puo tornare indietro */
      const i = archivio.giudizi.findIndex(x => x.id === voto.id);
      if (i >= 0) archivio.giudizi[i] = g; else archivio.giudizi.push(g);
      scriviArchivio(archivio);
      console.log('  ' + (i >= 0 ? 'corretto' : 'votato  ') + '  ' + voto.id.padEnd(34) +
        '  ' + voto.numeri + '/' + voto.lingua + '/' + voto.lettura + '  ' + voto.verdetto +
        '   (macchina: ' + ((auto[voto.id] || {}).verdetto || '—') + ')');
      /* SOLO ORA il verdetto della macchina attraversa la rete */
      return invia('application/json', JSON.stringify({ ok: true, auto: auto[voto.id] }));
    });
    return;
  }

  if (url.pathname === '/riepilogo') {
    const archivio = leggiArchivio();
    return invia('text/html', riepilogo(archivio.giudizi, auto));
  }

  invia('text/plain', 'non trovato', 404);
});

server.listen(PORTA, () => {
  const indirizzo = 'http://localhost:' + PORTA;
  console.log('\n  ' + indirizzo + '\n');
  /* si apre da solo: lo strumento serve a togliere attrito, e cercare l'indirizzo nel
     terminale e attrito */
  const cmd = process.platform === 'win32' ? 'start ""' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
  try { require('child_process').exec(cmd + ' ' + indirizzo); } catch { /* pazienza */ }
  console.log('  Ctrl+C per chiudere. I voti finiscono in review/reviews.json.\n');
});
