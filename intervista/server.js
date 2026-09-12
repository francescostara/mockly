#!/usr/bin/env node
/* L'INTERVISTA, da usare — `npm run intervista`.
 *
 * L'albero delle domande vive in engine/intervista.js; questo e solo il posto dove lo si
 * risponde. Una domanda alla volta, a schermo intero, con il "perche" sotto: chi risponde non
 * deve sapere cos'e un archetipo o una banda KPI, deve sapere che mestiere fa e quanto fattura.
 *
 * Non c'e nessun modello dietro, e nessun credito: le risposte sono un oggetto JSON, la spec
 * ne discende in modo deterministico, e il mockup e lo stesso file che il ciclo locale
 * renderizza e i gate verificano. Le risposte restano nell'indirizzo della pagina, quindi un
 * link e un'intervista salvata: si riapre, si cambia una risposta, si rigenera.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const I = require('../engine/intervista.js');
const { render } = require('../engine/render.js');

const PORTA = Number(process.env.PRUVA_INTERVISTA_PORT) || 4174;
const USCITA = path.join(__dirname, '..', 'out', 'intervista');
fs.mkdirSync(USCITA, { recursive: true });

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const leggiRisposte = url => {
  try { return JSON.parse(url.searchParams.get('r') || '{}'); }
  catch { return {}; }
};

/* La pagina e una sola e non ricarica: cambiare risposta a meta intervista deve costare un
   clic, non un giro di server. Il minimo di JS possibile — l'ironia di uno strumento che
   genera report autonomi servito da un'applicazione pesante non sfugge a nessuno. */
const PAGINA = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Pruva — l'intervista</title>
<style>
*{box-sizing:border-box}
body{margin:0;font:15px/1.6 -apple-system,'Segoe UI',system-ui,sans-serif;background:#0E1A24;color:#E8EEF4}
header{padding:18px 28px;border-bottom:1px solid #1E3040;display:flex;align-items:baseline;gap:14px}
h1{font-size:13px;letter-spacing:2.4px;margin:0;font-weight:700}
.sub{font-size:11.5px;color:#7E98AC}
main{max-width:760px;margin:0 auto;padding:44px 28px 80px}
.passo{font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:#5D7A90;margin-bottom:14px}
h2{font-size:25px;line-height:1.3;margin:0 0 10px;font-weight:600}
.perche{font-size:13px;color:#93AABB;margin:0 0 26px;border-left:2px solid #24425A;padding-left:12px}
.opz{display:flex;flex-direction:column;gap:8px}
button.o{text-align:left;background:#132534;border:1px solid #24425A;color:#E8EEF4;padding:13px 16px;
  border-radius:5px;font:inherit;cursor:pointer;transition:.12s}
button.o:hover{background:#1A3145;border-color:#3E6C8E}
button.o b{display:block;font-weight:600}
button.o span{font-size:12px;color:#8AA5B8}
.num{display:flex;gap:10px;align-items:center}
input{background:#132534;border:1px solid #24425A;color:#E8EEF4;padding:12px 14px;border-radius:5px;
  font:inherit;width:260px}
.unita{color:#8AA5B8;font-size:13px}
button.go{background:#3E8FD0;border:0;color:#06121C;font-weight:700;padding:12px 22px;border-radius:5px;
  font:inherit;cursor:pointer}
.date{margin-top:34px;border-top:1px solid #1E3040;padding-top:16px}
.date h3{font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:#5D7A90;margin:0 0 10px}
.riga{display:flex;justify-content:space-between;gap:16px;padding:5px 0;font-size:13px;border-bottom:1px solid #16283700}
.riga span{color:#8AA5B8}
.riga a{color:#5D7A90;font-size:11.5px;text-decoration:none;border-bottom:1px dotted #3E6C8E}
.fine{background:#132534;border:1px solid #24425A;border-radius:6px;padding:22px}
.fine p{margin:0 0 14px;color:#93AABB;font-size:13.5px}
iframe{width:100%;height:600px;border:1px solid #24425A;border-radius:6px;background:#fff;margin-top:18px}
.peso{font-size:12px;color:#8AA5B8;margin-top:10px}
.peso.oltre{color:#E3A857}
</style></head><body>
<header><h1>PRUVA</h1><div class="sub">il mockup, solo con domande — nessun modello, nessun credito</div></header>
<main id="app"></main>
<script>
var R = {};
try { R = JSON.parse(decodeURIComponent((location.hash || '#').slice(1)) || '{}'); } catch (e) { R = {}; }

function salva() { location.hash = encodeURIComponent(JSON.stringify(R)); }
function rispondi(id, v) { R[id] = v; salva(); carica(); }
function torna(id) { delete R[id]; salva(); carica(); }

function carica() {
  fetch('/api/prossima?r=' + encodeURIComponent(JSON.stringify(R)))
    .then(function (x) { return x.json(); })
    .then(disegna);
}

function disegna(s) {
  var app = document.getElementById('app');
  var h = '';
  if (s.domanda) {
    var d = s.domanda;
    h += '<div class="passo">domanda ' + s.numero + ' di ' + s.totale + '</div>';
    h += '<h2>' + d.testo + '</h2>';
    h += '<p class="perche">' + d.perche + '</p>';
    if (d.tipo === 'scelta') {
      h += '<div class="opz">' + d.opzioni.map(function (o) {
        return '<button class="o" data-v="' + String(o.v).replace(/"/g, '&quot;') + '"><b>' +
          o.testo + '</b>' + (o.aiuto ? '<span>' + o.aiuto + '</span>' : '') + '</button>';
      }).join('') + '</div>';
    } else if (d.tipo === 'numero') {
      h += '<div class="num"><input id="v" type="number" value="' + d.suggerito + '" min="' +
        d.min + '" max="' + d.max + '" step="' + (d.passo || 1) + '">' +
        '<span class="unita">' + (d.unita || '') + '</span>' +
        '<button class="go" id="ok">Avanti</button></div>';
    } else {
      h += '<div class="num"><input id="v" type="text" value="' + (d.suggerito || '') +
        '" maxlength="' + (d.max || 40) + '"><button class="go" id="ok">Avanti</button></div>';
    }
  } else {
    h += '<div class="fine"><h2 style="margin-bottom:8px">Fatto.</h2>' +
      '<p>Le risposte bastano: il mockup qui sotto e generato dal motore, senza modelli. ' +
      'L\\'indirizzo di questa pagina contiene le risposte — salvalo per riaprirlo o cambiarne una.</p>' +
      '<a class="go" style="text-decoration:none;display:inline-block" target="_blank" href="/mock?r=' +
      encodeURIComponent(JSON.stringify(R)) + '">Apri a schermo intero</a>' +
      '<div class="peso' + (s.peso && s.peso.oltre ? ' oltre' : '') + '">' +
      (s.peso ? 'file ' + s.peso.kb + 'KB' + (s.peso.oltre ? ' — oltre il tetto di 75KB' : '') +
        (s.peso && s.peso.leve && s.peso.leve.length ? ' · ridotto: ' + s.peso.leve.join(', ') : '') : '') +
      '</div>' +
      '<iframe src="/mock?r=' + encodeURIComponent(JSON.stringify(R)) + '"></iframe></div>';
  }
  if (s.fatte && s.fatte.length) {
    h += '<div class="date"><h3>risposte date</h3>' + s.fatte.map(function (f) {
      return '<div class="riga"><span>' + f.testo + '</span><a href="#" data-torna="' + f.id + '">' +
        f.valore + ' · cambia</a></div>';
    }).join('') + '</div>';
  }
  app.innerHTML = h;

  var q = app.querySelectorAll('button.o');
  for (var i = 0; i < q.length; i++) {
    q[i].onclick = function () { rispondi(s.domanda.id, this.getAttribute('data-v')); };
  }
  var okb = document.getElementById('ok');
  if (okb) {
    var inv = function () { rispondi(s.domanda.id, document.getElementById('v').value); };
    okb.onclick = inv;
    document.getElementById('v').onkeydown = function (e) { if (e.key === 'Enter') inv(); };
    document.getElementById('v').focus();
  }
  var t = app.querySelectorAll('[data-torna]');
  for (var k = 0; k < t.length; k++) {
    t[k].onclick = function (e) { e.preventDefault(); torna(this.getAttribute('data-torna')); };
  }
}
carica();
</script></body></html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const invia = (tipo, corpo, codice) => {
    res.writeHead(codice || 200, { 'Content-Type': tipo + '; charset=utf-8' });
    res.end(corpo);
  };

  if (url.pathname === '/') return invia('text/html', PAGINA);

  if (url.pathname === '/api/prossima') {
    const r = leggiRisposte(url);
    const domanda = I.prossima(r);
    const percorso = I.percorso(r);
    /* le risposte gia date si mostrano SEMPRE, con il loro valore in chiaro e un modo per
       cambiarle: un questionario in cui non si puo tornare indietro si abbandona */
    const fatte = percorso.filter(d => r[d.id] !== undefined).map(d => {
      const v = r[d.id];
      const opt = (d.opzioni || []).filter(o => String(o.v) === String(v))[0];
      return { id: d.id, testo: d.testo, valore: opt ? opt.testo : String(v) };
    });
    let peso = null;
    if (!domanda) { try { peso = I.componi(r).peso; } catch { peso = null; } }
    return invia('application/json', JSON.stringify({
      domanda, fatte, peso,
      numero: fatte.length + 1, totale: percorso.length
    }));
  }

  if (url.pathname === '/mock') {
    const r = leggiRisposte(url);
    try {
      const m = I.componi(r);
      const html = render(m.spec, m.build());
      /* si salva anche su disco: il file e il prodotto, e deve poter essere mandato a qualcuno
         senza passare da qui */
      fs.writeFileSync(path.join(USCITA, 'ultimo.html'), html);
      fs.writeFileSync(path.join(USCITA, 'ultimo.json'), JSON.stringify(r, null, 2) + '\n');
      return invia('text/html', html);
    } catch (e) {
      return invia('text/html', '<pre style="font:13px monospace;padding:20px;color:#B3261E">' +
        esc(e.message) + '</pre>', 400);
    }
  }

  invia('text/plain', 'non trovato', 404);
});

server.listen(PORTA, () => {
  const indirizzo = 'http://localhost:' + PORTA;
  console.log('\nL INTERVISTA');
  console.log('='.repeat(60));
  console.log('  ' + I.ALBERO.length + ' domande, ' + Object.keys(I.NICCHIE).length + ' mestieri, ' +
    Object.keys(I.ARCHETIPI).length + ' archetipi — nessun credito');
  console.log('\n  ' + indirizzo + '\n');
  console.log('  Il mockup generato finisce anche in out/intervista/ultimo.html');
  console.log('  Ctrl+C per chiudere.\n');
  /* si apre da solo, tranne quando lo sta avviando un test: PRUVA_NO_OPEN=1 */
  if (process.env.PRUVA_NO_OPEN) return;
  const cmd = process.platform === 'win32' ? 'start ""' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
  try { require('child_process').exec(cmd + ' ' + indirizzo); } catch { /* pazienza */ }
});
