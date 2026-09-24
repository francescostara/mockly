/* DOVE CLICCARE — il punto del bersaglio, scelto perche lo colpisce DAVVERO.
 *
 * Il registratore cliccava il centro del riquadro dell'elemento. Per un rettangolo va bene; per
 * una fetta di ciambella il centro del riquadro cade nel FORO: il clic non colpisce niente, e il
 * video mostra un clic senza effetto — la cosa peggiore che una demo possa mostrare. Trovato
 * registrando filtro-organico: "clicca dentro Paid spend by platform" cliccava (915,314), nel buco.
 *
 * Qui il punto si verifica con document.elementFromPoint: se il centro non colpisce l'elemento
 * (o un suo figlio), si cerca nel riquadro il punto piu vicino al centro che lo colpisce. Vale per
 * ogni forma non convessa — archi, anelli, nastri. E il bersaglio scelto resta marcato
 * (data-pruva-bersaglio), cosi prima del clic si puo ricontrollare che sotto il cursore ci sia
 * ancora lui: se no, il passo fallisce in modo visibile invece di registrare un clic a vuoto.
 *
 * `trova` gira DENTRO la pagina (page.evaluate): niente riferimenti esterni.
 */
'use strict';

function trova(arg) {
  const { sel, dentro, quale } = arg;
  document.querySelectorAll('[data-pruva-bersaglio]').forEach(e => e.removeAttribute('data-pruva-bersaglio'));
  let ambito = document;
  if (dentro) {
    const card = [...document.querySelectorAll('#page .card')]
      .find(c => ((c.querySelector('.ch h3') || {}).textContent || '').indexOf(dentro) === 0);
    if (card) ambito = card;
  }
  let el = [...ambito.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
  if (!el.length) return null;
  /* Se un filtro e attivo, si clicca la voce SELEZIONATA, non una attenuata: un drill su
     "English" con il filtro su "Ukrainian" e un video incoerente, anche se il mockup lo
     permette. E' una scelta della ripresa, non del mockup. */
  const classe = e => ' ' + (e.getAttribute('class') || '') + ' ';
  const accese = el.filter(e => / sel /.test(classe(e)));
  if (accese.length) el = accese;
  else el = el.filter(e => !/ (dim|dimd) /.test(classe(e))).concat(el.filter(e => / (dim|dimd) /.test(classe(e))));
  /* per un clic si prende il bersaglio piu grande: e quello che un umano colpirebbe; per il
     tasto destro si prende la prima riga, che e la piu alta e la piu leggibile */
  if (quale !== 'primo') el = el.slice().sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return rb.width * rb.height - ra.width * ra.height;
  });

  const colpisce = (e, x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)); };
  for (const e of el) {
    const r = e.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let punto = colpisce(e, cx, cy) ? { x: cx, y: cy } : null;
    if (!punto) {
      /* una griglia fitta sul riquadro, e il punto buono piu vicino al centro */
      const N = 24;
      let migliore = null, dist = Infinity;
      for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
        const x = r.left + r.width * i / N, y = r.top + r.height * j / N;
        if (!colpisce(e, x, y)) continue;
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d < dist) { dist = d; migliore = { x, y }; }
      }
      punto = migliore;
    }
    if (punto) {
      e.setAttribute('data-pruva-bersaglio', '1');
      return { x: Math.round(punto.x), y: Math.round(punto.y), spostato: !colpisce(e, cx, cy) };
    }
  }
  return { errore: 'nessun punto visibile colpisce "' + sel + '"' + (dentro ? ' dentro "' + dentro + '"' : '') };
}

/** Sotto il punto c'e ancora il bersaglio marcato? Gira dentro la pagina. */
function ancoraLui(arg) {
  const h = document.elementFromPoint(arg.x, arg.y);
  return !!(h && h.closest && h.closest('[data-pruva-bersaglio]'));
}

module.exports = { trova, ancoraLui };
