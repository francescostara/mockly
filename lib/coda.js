/* LE AZIONI DEL FLUSSO IN FILA (app/progetto/page.tsx).
 *
 * Difetto trovato provando la fase B nel browser (23 ott 2026): due campi lasciati uno dopo l'altro
 * mandavano due azioni costruite sulla STESSA storia; la seconda risposta arrivava dopo e
 * sostituiva la prima, e il titolo della pagina appena rinominata spariva. La cura: ogni lavoro
 * parte quando il precedente e finito, e costruisce la sua richiesta in quel momento, leggendo lo
 * stato piu recente — non quello che c'era al clic. Gate: test/progetto-api.test.js.
 */
'use strict';

/** Una fila: `metti(lavoro)` esegue `lavoro()` dopo tutti quelli messi prima; ne restituisce l'esito. */
function creaCoda() {
  let ultima = Promise.resolve();
  return function metti(lavoro) {
    const giro = ultima.then(() => lavoro());
    ultima = giro.catch(() => undefined);
    return giro;
  };
}

module.exports = { creaCoda };
