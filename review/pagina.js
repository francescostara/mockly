/* LA PAGINA DI REVISIONE — un mockup alla volta, le stesse quattro domande.
 *
 * Sta in un file a parte perche e lunga e perche e l'unica parte del progetto scritta per
 * ESSERE USATA da una persona per mezz'ora di fila: la fatica di guardare venti report non deve
 * sommarsi alla fatica di capire dove cliccare.
 *
 * La regola che governa il disegno di questa pagina: il verdetto della macchina non arriva
 * finche il voto non e partito. Non e nascosto con un display:none — non viene proprio inviato.
 */
'use strict';

const STILE = `
  *{box-sizing:border-box}
  body{margin:0;background:#EFEDE8;color:#1C1B19;
       font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
  header{display:flex;align-items:baseline;gap:14px;padding:12px 20px;background:#F7F6F3;
         border-bottom:1px solid #D9D5CD;position:sticky;top:0;z-index:10}
  header h1{font-size:14px;margin:0;letter-spacing:.2px}
  header .avanz{color:#6A665F;font-size:12.5px}
  header .spazio{flex:1}
  header a{color:#1C1B19;font-size:12.5px}
  main{display:grid;grid-template-columns:1fr 340px;gap:18px;padding:18px 20px;align-items:start}
  .palco{background:#FFF;border:1px solid #D9D5CD;border-radius:8px;overflow:hidden}
  .palco .barra{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #E7E3DB;
                font-size:12px;color:#6A665F}
  .palco .barra b{color:#1C1B19;font-weight:600}
  .palco .barra .tag{border:1px solid #D9D5CD;border-radius:999px;padding:1px 8px;font-size:11px}
  .tela{position:relative;width:100%;aspect-ratio:16/9;background:#F2F1EE}
  .tela iframe{position:absolute;inset:0;width:1280px;height:720px;border:0;transform-origin:0 0}
  aside{display:flex;flex-direction:column;gap:14px;position:sticky;top:66px}
  .scheda,.modulo,.esito{background:#F7F6F3;border:1px solid #D9D5CD;border-radius:8px;padding:14px 16px}
  .modulo h2{font-size:13px;margin:0 0 2px}
  .modulo p.sub{margin:0 0 12px;font-size:11.5px;color:#6A665F}
  .crit{margin:0 0 12px}
  .crit .dom{font-size:12.5px;font-weight:600;margin-bottom:1px}
  .crit .aiuto{font-size:11px;color:#6A665F;margin-bottom:6px;line-height:1.35}
  .scala{display:flex;gap:6px}
  .scala label{flex:1;position:relative}
  .scala input{position:absolute;opacity:0;pointer-events:none}
  .scala span{display:block;text-align:center;padding:7px 0;border:1px solid #D9D5CD;border-radius:5px;
              background:#FFF;cursor:pointer;font-size:13px;font-variant-numeric:tabular-nums}
  .scala input:checked + span{background:#1C1B19;color:#F7F6F3;border-color:#1C1B19;font-weight:600}
  .scala input:focus-visible + span{outline:2px solid #1C1B19;outline-offset:2px}
  .verd{display:flex;flex-direction:column;gap:5px}
  .verd label{position:relative}
  .verd input{position:absolute;opacity:0;pointer-events:none}
  .verd span{display:block;padding:8px 10px;border:1px solid #D9D5CD;border-radius:5px;background:#FFF;
             cursor:pointer;font-size:12.5px}
  .verd input:checked + span{background:#1C1B19;color:#F7F6F3;border-color:#1C1B19;font-weight:600}
  textarea{width:100%;min-height:52px;border:1px solid #D9D5CD;border-radius:5px;padding:7px 9px;
           font:inherit;font-size:12.5px;resize:vertical;background:#FFF;color:#1C1B19}
  textarea.serve{border-color:#9B3A2E}
  .avvisi{font-size:11.5px;color:#9B3A2E;min-height:16px;margin:4px 0 0}
  .azioni{display:flex;gap:8px;margin-top:12px}
  button{font:inherit;font-size:13px;padding:8px 14px;border-radius:5px;cursor:pointer;
         border:1px solid #1C1B19;background:#1C1B19;color:#F7F6F3}
  button.ghost{background:transparent;color:#1C1B19}
  button:disabled{opacity:.4;cursor:not-allowed}
  .scheda h3{font-size:12px;margin:0;display:flex;justify-content:space-between;align-items:center;cursor:pointer}
  .scheda .corpo{font-size:11.5px;color:#4A473F;margin-top:8px;max-height:210px;overflow:auto;
                 white-space:pre-wrap;line-height:1.45;display:none}
  .scheda.aperta .corpo{display:block}
  .esito{display:none}
  .esito.mostra{display:block}
  .esito h3{font-size:12px;margin:0 0 8px}
  .esito .riga{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:4px}
  .esito .macchina{font-weight:600}
  .esito .accordo{font-size:11.5px;color:#6A665F;margin-top:8px;line-height:1.4}
  .esito ul{margin:8px 0 0;padding-left:16px;font-size:11.5px;color:#9B3A2E}
  .fine{padding:60px 20px;text-align:center}
  .fine a{color:#1C1B19}`;

const SCRIPT = `
const $ = s => document.querySelector(s);
let coda = [], i = 0, voti = {};

const CRITERI = [
  ['numeri', 'I numeri reggono?',
   'Un cliente di questo settore si fermerebbe su una cifra? Ordini di grandezza, rapporti, coerenza fra le misure.'],
  ['lingua', 'Parla la lingua della nicchia?',
   'KPI, segmenti ed etichette sono quelli di QUEL business, o e una dashboard vendite generica?'],
  ['lettura', 'Si legge bene?',
   'Gerarchia, cornici, spaziature, palette, tipografia. L occhio trova subito la cosa importante?']
];
const VERDETTI = [['si', 'Si, cosi com e'], ['ritocco', 'Si, con un ritocco'], ['no', 'No']];

function scala(id) {
  return '<div class="scala">' + [1,2,3,4,5].map(v =>
    '<label><input type="radio" name="' + id + '" value="' + v + '"><span>' + v + '</span></label>'
  ).join('') + '</div>';
}

function modulo() {
  return CRITERI.map(([id, dom, aiuto], n) =>
    '<div class="crit"><div class="dom">' + (n+1) + '. ' + dom + '</div>' +
    '<div class="aiuto">' + aiuto + '</div>' + scala(id) + '</div>').join('') +
    '<div class="crit"><div class="dom">4. Lo manderei a un cliente cosi com e?</div>' +
    '<div class="aiuto">E il verdetto che conta. Gli altri tre spiegano il perche.</div>' +
    '<div class="verd">' + VERDETTI.map(([v, t]) =>
      '<label><input type="radio" name="verdetto" value="' + v + '"><span>' + t + '</span></label>'
    ).join('') + '</div></div>' +
    '<div class="crit"><div class="dom">Nota</div>' +
    '<div class="aiuto">La ragione, non un tema: "scontrino assurdo", "sembra un e-commerce", ' +
    '"tabella tagliata". Obbligatoria se un voto e 3 o meno, o se il verdetto e No.</div>' +
    '<textarea id="nota" rows="2" placeholder="una riga"></textarea></div>' +
    '<p class="avvisi" id="avvisi"></p>';
}

/* Il mockup e disegnato a 1280x720 fissi e va rimpicciolito nello spazio disponibile. Due
   accortezze, ed entrambe nascono da un difetto vero visto qui: una misura di ZERO — la
   finestra in secondo piano, un riflusso a meta — congelava l'iframe a scale(0) per sempre,
   perche l'evento resize non torna a scattare da solo. Quindi: lo zero non si applica mai, e
   si osserva l'elemento invece della finestra, cosi la misura buona arriva appena c'e. */
function scala16by9() {
  const tela = $('.tela'), fr = $('#palco');
  if (!tela || !fr) return;
  const w = tela.clientWidth;
  if (!w) return;
  fr.style.transform = 'scale(' + (w / 1280) + ')';
}
addEventListener('resize', scala16by9);
if (window.ResizeObserver) new ResizeObserver(scala16by9).observe(document.querySelector('.tela'));

function mostra() {
  const c = coda[i];
  if (!c) { fine(); return; }
  $('#avanz').textContent = (i + 1) + ' di ' + coda.length;
  $('#tit').textContent = c.titolo;
  $('#fonte').textContent = c.fonte;
  $('#arche').textContent = c.archetipo || '—';
  $('#palco').src = '/mock/' + encodeURIComponent(c.id);
  $('#schedaCorpo').textContent = c.scheda;
  $('#modulo').innerHTML = modulo();
  const es = $('#esito'), col = es.parentNode;
  es.className = 'esito';
  /* al mockup successivo il pannello torna al suo posto, sotto il questionario */
  if (col.firstChild === es) col.insertBefore(es, $('.modulo').nextSibling);
  const g = voti[c.id];
  if (g) {
    CRITERI.forEach(([k]) => { const el = document.querySelector('[name=' + k + '][value="' + g[k] + '"]'); if (el) el.checked = true; });
    const v = document.querySelector('[name=verdetto][value="' + g.verdetto + '"]'); if (v) v.checked = true;
    $('#nota').value = g.nota || '';
    if (g.auto) rivela(g);
  }
  $('#indietro').disabled = i === 0;
  scala16by9();
}

function raccogli() {
  const g = { nota: $('#nota').value.trim() };
  let mancano = [];
  CRITERI.forEach(([k, dom]) => {
    const el = document.querySelector('[name=' + k + ']:checked');
    if (!el) mancano.push(dom); else g[k] = +el.value;
  });
  const v = document.querySelector('[name=verdetto]:checked');
  if (!v) mancano.push('Lo manderei a un cliente?'); else g.verdetto = v.value;
  if (mancano.length) return { errore: 'Manca: ' + mancano.join(' · ') };
  const basso = CRITERI.some(([k]) => g[k] <= 3) || g.verdetto === 'no';
  if (basso && !g.nota) return { errore: 'Serve la nota: un voto e 3 o meno, oppure il verdetto e No.', nota: true };
  return { voto: g };
}

function rivela(g) {
  const e = $('#esito');
  const umanoPromuove = g.verdetto !== 'no';
  const macchinaPromuove = g.auto.verdetto === 'SPEDIBILE';
  const accordo = umanoPromuove === macchinaPromuove;
  e.innerHTML = '<h3>Cosa ne diceva la macchina</h3>' +
    '<div class="riga"><span>Verdetto automatico</span><span class="macchina">' + g.auto.verdetto + '</span></div>' +
    '<div class="riga"><span>Il tuo</span><span class="macchina">' +
      (VERDETTI.find(v => v[0] === g.verdetto) || ['', g.verdetto])[1] + '</span></div>' +
    '<div class="accordo">' + (accordo
      ? 'D accordo. Il gate e tarato su questo caso.'
      : (macchinaPromuove
        ? 'DISACCORDO: la macchina lo promuove, tu no. Manca un gate — quello che hai visto tu, il motore non lo guarda.'
        : 'DISACCORDO: la macchina lo boccia, tu no. Il gate e troppo severo su questo caso.')) + '</div>' +
    (g.auto.problemi && g.auto.problemi.length
      ? '<ul>' + g.auto.problemi.slice(0, 4).map(p => '<li>' + p + '</li>').join('') + '</ul>' : '');
  e.className = 'esito mostra';
  /* Il confronto col verdetto della macchina e il motivo per cui questo strumento esiste, e
     dopo il voto e la cosa piu importante nella colonna: sale in cima, invece di restare in
     fondo a un questionario gia compilato dove bisogna cercarlo con la rotella. */
  const col = e.parentNode;
  if (col && col.firstChild !== e) col.insertBefore(e, col.firstChild);
}

async function salva(salta) {
  const c = coda[i];
  if (salta) { i++; mostra(); return; }
  const r = raccogli();
  if (r.errore) {
    $('#avvisi').textContent = r.errore;
    $('#nota').classList.toggle('serve', !!r.nota);
    return;
  }
  $('#avvisi').textContent = '';
  const risposta = await fetch('/api/voto', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ id: c.id }, r.voto))
  }).then(x => x.json());
  /* il verdetto della macchina arriva SOLO ORA, nella risposta al voto */
  const g = Object.assign({}, r.voto, { auto: risposta.auto });
  voti[c.id] = g;
  rivela(g);
  $('#avanti').textContent = 'Prossimo';
  $('#avanti').onclick = () => { i++; $('#avanti').textContent = 'Salva e avanti'; $('#avanti').onclick = () => salva(false); mostra(); };
}

async function fine() {
  /* il conto viene dall'ARCHIVIO, non dalla sessione: chi riprende un giro interrotto ha gia
     dei voti salvati, e vedersi dire "1 giudizio" dopo averne dati venti e sconfortante */
  const dati = await fetch('/api/coda').then(r => r.json()).catch(() => ({ gia: [] }));
  const n = dati.gia.length;
  document.body.innerHTML = '<div class="fine"><h1>Giro finito.</h1>' +
    '<p>' + n + (n === 1 ? ' giudizio salvato' : ' giudizi salvati') +
    ' in <code>review/reviews.json</code>.</p>' +
    '<p><a href="/riepilogo">Vai al riepilogo</a></p></div>';
}

(async function avvio() {
  const dati = await fetch('/api/coda').then(r => r.json());
  coda = dati.coda;
  voti = {};
  /* si riprende da dove si era rimasti: i gia votati si saltano, ma restano raggiungibili
     con Indietro, perche correggere un voto e piu utile che rifare tutto il giro */
  i = dati.gia.length ? Math.min(dati.gia.length, coda.length - 1) : 0;
  $('#indietro').onclick = () => { if (i > 0) { i--; mostra(); } };
  $('#salta').onclick = () => salva(true);
  $('#avanti').onclick = () => salva(false);
  $('.scheda h3').onclick = () => $('.scheda').classList.toggle('aperta');
  mostra();
})();`;

function pagina(titolo) {
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>Pruva — revisione</title>
<style>${STILE}</style></head><body>
<header>
  <h1>Revisione</h1>
  <span class="avanz" id="avanz">…</span>
  <span class="spazio"></span>
  <a href="/riepilogo">Riepilogo</a>
</header>
<main>
  <section class="palco">
    <div class="barra">
      <b id="tit">…</b>
      <span class="tag" id="fonte"></span>
      <span class="tag" id="arche"></span>
    </div>
    <div class="tela"><iframe id="palco" src="about:blank"></iframe></div>
  </section>
  <aside>
    <div class="modulo">
      <h2>Le stesse quattro domande</h2>
      <p class="sub">Sempre queste, sempre in quest ordine: i voti di giri diversi devono essere confrontabili.</p>
      <div id="modulo"></div>
      <div class="azioni">
        <button id="avanti">Salva e avanti</button>
        <button class="ghost" id="indietro">Indietro</button>
        <button class="ghost" id="salta">Salta</button>
      </div>
    </div>
    <div class="esito" id="esito"></div>
    <div class="scheda">
      <h3>Come si usa questo mockup <span>▾</span></h3>
      <div class="corpo" id="schedaCorpo"></div>
    </div>
  </aside>
</main>
<script>${SCRIPT}</script>
</body></html>`;
}

/** Il riepilogo: medie, file sotto soglia, note, e l'accordo fra macchina e persona. */
function riepilogo(giudizi, auto) {
  const n = giudizi.length;
  const media = k => n ? (giudizi.reduce((a, g) => a + (g[k] || 0), 0) / n) : 0;
  const CRIT = [['numeri', 'I numeri reggono'], ['lingua', 'Parla la lingua della nicchia'],
    ['lettura', 'Si legge bene']];
  const sottoSoglia = giudizi.filter(g => CRIT.some(([k]) => g[k] <= 3) || g.verdetto === 'no');
  const accordi = giudizi.filter(g => {
    const a = auto[g.id];
    if (!a) return false;
    return (g.verdetto !== 'no') === (a.verdetto === 'SPEDIBILE');
  });
  const mancaGate = giudizi.filter(g => auto[g.id] && auto[g.id].verdetto === 'SPEDIBILE' && g.verdetto === 'no');
  const troppoSevero = giudizi.filter(g => auto[g.id] && auto[g.id].verdetto === 'DA RIVEDERE' && g.verdetto !== 'no');
  const conNota = giudizi.filter(g => (g.nota || '').trim());
  const promossi = giudizi.filter(g => g.verdetto !== 'no').length;

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>Pruva — riepilogo revisione</title>
<style>${STILE}
  .foglio{max-width:860px;margin:0 auto;padding:26px 20px 60px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:14px;margin:26px 0 8px}
  .lede{color:#5A5751;margin:0 0 4px}
  table{width:100%;border-collapse:collapse;font-size:13px;background:#F7F6F3;
        border:1px solid #D9D5CD;border-radius:8px;overflow:hidden}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #E7E3DB}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#6A665F;font-weight:600}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  tr:last-child td{border-bottom:0}
  .nota{background:#F7F6F3;border:1px solid #D9D5CD;border-left:3px solid #1C1B19;border-radius:6px;
        padding:8px 12px;margin-bottom:6px;font-size:13px}
  .nota b{font-size:11.5px;color:#6A665F;font-weight:600;display:block}
</style></head><body>
<div class="foglio">
<h1>Riepilogo della revisione</h1>
<p class="lede">${n} giudizi · ${promossi} manderesti a un cliente${n ? ' (' + Math.round(promossi / n * 100) + '%)' : ''}</p>
<p class="lede"><a href="/">Torna a votare</a></p>

<h2>Medie per criterio</h2>
<table><tr><th>Criterio</th><th style="text-align:right">Media</th><th style="text-align:right">Sotto 4</th></tr>
${CRIT.map(([k, t]) => `<tr><td>${t}</td><td class="num">${media(k).toFixed(2)}</td>
  <td class="num">${giudizi.filter(g => g[k] <= 3).length}</td></tr>`).join('')}
</table>

<h2>Accordo macchina-persona</h2>
<table>
<tr><td>D accordo</td><td class="num">${accordi.length} / ${n}</td></tr>
<tr><td>La macchina promuove, tu no — <b>manca un gate</b></td><td class="num">${mancaGate.length}</td></tr>
<tr><td>La macchina boccia, tu no — <b>gate troppo severo</b></td><td class="num">${troppoSevero.length}</td></tr>
</table>
${mancaGate.length ? `<p class="lede">Gate mancanti da scrivere, uno per riga:<br>${
  mancaGate.map(g => '<code>' + g.id + '</code> — ' + (g.nota || 'senza nota')).join('<br>')}</p>` : ''}

<h2>Sotto soglia (${sottoSoglia.length})</h2>
${sottoSoglia.length ? `<table><tr><th>Mockup</th><th style="text-align:right">Num</th>
<th style="text-align:right">Lingua</th><th style="text-align:right">Lettura</th><th>Verdetto</th></tr>
${sottoSoglia.map(g => `<tr><td>${g.id}</td><td class="num">${g.numeri}</td><td class="num">${g.lingua}</td>
  <td class="num">${g.lettura}</td><td>${g.verdetto}</td></tr>`).join('')}</table>`
    : '<p class="lede">Nessuno.</p>'}

<h2>Le note (${conNota.length})</h2>
<p class="lede">Ognuna diventa un caso nel corpus se e del motore, o una riga di skill se e una
regola che manca.</p>
${conNota.map(g => `<div class="nota"><b>${g.id} · ${g.verdetto}</b>${g.nota}</div>`).join('') ||
  '<p class="lede">Nessuna nota.</p>'}
</div></body></html>`;
}

module.exports = { pagina, riepilogo };
