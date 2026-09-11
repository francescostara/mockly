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
const { perMockup } = require('./interventi.js');

const PORTA = Number(process.env.PRUVA_REVIEW_PORT) || 4173;
const LIMITE = Number((process.argv.find(a => a.startsWith('--solo=')) || '').split('=')[1]) || 0;
/* Di norma si rivede solo cio che ha ancora qualcosa in sospeso: rimettere in coda un mockup
   gia approvato costa attenzione e non produce niente. `--tutti` rimette tutto in fila, che
   serve quando si vuole un giro completo di controllo. */
const TUTTI = process.argv.indexOf('--tutti') >= 0;
const ARCHIVIO = path.join(__dirname, 'reviews.json');
const VERSIONI = path.join(__dirname, 'versioni');
fs.mkdirSync(VERSIONI, { recursive: true });

const fileVersione = (id, v) => path.join(VERSIONI, id.replace(/\//g, '__') + '__v' + v + '.html');

/* Che versione e questa, per questo mockup. Il conto si fa sulle IMPRONTE gia giudicate: se
   l'impronta e nuova, e la prossima versione; se e gia stata vista, si sta correggendo un voto
   sulla stessa versione, non giudicandone una nuova. */
function versioneDi(id, impronta, giudizi) {
  const passate = giudizi.filter(g => g.id === id);
  const vecchia = passate.find(g => g.impronta && g.impronta === impronta);
  if (vecchia) return vecchia.versione || 1;
  /* I giudizi dati prima che esistessero le impronte contano lo stesso come una versione
     vista: sono i primi quattro di questo archivio, e sono proprio quelli che non vanno persi
     — il ciclo comincia da li. */
  const viste = new Set(passate.map(g => g.impronta || 'senza-impronta:v' + (g.versione || 1)));
  return viste.size + 1;
}

/**
 * Ha ancora qualcosa in sospeso?
 *
 * Tre modi di essere in sospeso, e bastano uno:
 *   - l'ultimo giudizio non e un "si" pieno — c'e un ritocco chiesto, o un no;
 *   - alla domanda "e risolto?" la risposta e stata "in parte" o "no";
 *   - resta un intervento aperto o parziale nel registro.
 * Un mockup mai giudicato non e in sospeso: non e ancora stato chiesto niente.
 */
function inSospeso(id, giudizi) {
  const suoi = giudizi.filter(g => g.id === id);
  if (!suoi.length) return true;                       /* mai visto: va visto */
  const ult = suoi[suoi.length - 1];
  if (ult.verdetto !== 'si') return true;
  if (ult.risolto === 'parte' || ult.risolto === 'no') return true;
  return perMockup(id).some(i => i.stato !== 'fatto');
}

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
{
  const g0 = leggiArchivio().giudizi;
  const sosp = coda.filter(c => inSospeso(c.id, g0));
  console.log('  in sospeso: ' + sosp.length + '/' + coda.length +
    (TUTTI ? '   (--tutti: in coda ci sono comunque tutti)' : '   (gli altri non entrano in coda)'));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const invia = (tipo, corpo, codice) => {
    res.writeHead(codice || 200, { 'Content-Type': tipo + '; charset=utf-8' });
    res.end(corpo);
  };

  if (url.pathname === '/') return invia('text/html', pagina());

  if (url.pathname === '/api/coda') {
    /* NIENTE verdetto qui dentro: e il punto dello strumento */
    const giudizi = leggiArchivio().giudizi;
    const gia = giudizi.map(g => g.id);
    const pubblica = coda.filter(c => TUTTI || inSospeso(c.id, giudizi)).map(c => {
      const versione = versioneDi(c.id, c.impronta, giudizi);
      /* I giudizi precedenti SI mostrano: sono parole dell'autore, non il verdetto della
         macchina. Servono proprio a ricordargli cosa aveva scritto, per poter dire se il
         problema e stato risolto davvero. */
      const precedenti = giudizi.filter(g => g.id === c.id && (g.versione || 1) < versione)
        .map(g => ({ versione: g.versione || 1, nota: g.nota, verdetto: g.verdetto,
          numeri: g.numeri, lingua: g.lingua, lettura: g.lettura,
          disponibile: fs.existsSync(fileVersione(c.id, g.versione || 1)) }));
      /* "Gia visto" non basta piu: un mockup corretto dopo un commento e una VERSIONE NUOVA,
         e va rivisto. Quello che conta e se esiste un voto per QUESTA versione. */
      const votato = giudizi.some(g => g.id === c.id && (g.versione || 1) === versione);
      return {
        id: c.id, fonte: c.fonte, nome: c.nome, titolo: c.titolo,
        archetipo: c.archetipo, scheda: c.scheda,
        versione, votato, precedenti, interventi: perMockup(c.id)
      };
    });
    /* quanti sono rimasti fuori, e perche: il conto va detto, non nascosto */
    const aPosto = coda.length - pubblica.length;
    return invia('application/json', JSON.stringify({ coda: pubblica, gia, aPosto, tutti: TUTTI }));
  }

  if (url.pathname.startsWith('/mock/')) {
    const id = decodeURIComponent(url.pathname.slice('/mock/'.length));
    const v = url.searchParams.get('v');
    /* con ?v=N si riapre una versione conservata: e cosi che si confronta il prima col dopo
       senza fidarsi della memoria */
    if (v) {
      const f = fileVersione(id, v);
      if (fs.existsSync(f)) return invia('text/html', fs.readFileSync(f, 'utf8'));
      return invia('text/html', '<p>versione ' + v + ' non conservata</p>', 404);
    }
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
      const c = perId[voto.id] || {};
      const versione = versioneDi(voto.id, c.impronta, archivio.giudizi);
      const g = Object.assign({}, voto, {
        versione, impronta: c.impronta || null,
        data: new Date().toISOString(),
        auto: (auto[voto.id] || {}).verdetto || null
      });
      /* LA VERSIONE GIUDICATA SI CONSERVA. Senza il file, alla revisione successiva si puo
         rileggere il commento ma non rivedere cio a cui si riferiva, e "e risolto?" diventa una
         domanda a memoria. Sono sessanta kilobyte per versione, ed e il prezzo piu basso che
         questo ciclo paga. */
      if (c.html) {
        try { fs.writeFileSync(fileVersione(voto.id, versione), c.html); } catch { /* pazienza */ }
      }
      /* un voto sulla STESSA versione sostituisce il precedente (si sta correggendo); un voto
         su una versione nuova si aggiunge, perche la storia e il valore dell'archivio */
      const i = archivio.giudizi.findIndex(x => x.id === voto.id && (x.versione || 1) === versione);
      if (i >= 0) archivio.giudizi[i] = g; else archivio.giudizi.push(g);
      scriviArchivio(archivio);
      console.log('  ' + (i >= 0 ? 'corretto' : 'votato  ') + '  v' + versione + '  ' + voto.id.padEnd(34) +
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
