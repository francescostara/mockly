/* GLI SCHELETRI DEGLI ARCHETIPI — un artefatto, due usi.
 *
 * Sono gli ESEMPI CANONICI che il modello copia (esportati in skill/assets/canonical-*.json
 * con `npm run templates`) e sono i TEMPLATE del percorso a menu senza crediti: la stessa
 * spec, renderizzata da render(spec, data) senza chiamare nessun modello.
 *
 * Nascono una volta sola di proposito. Se fossero due file diversi divergerebbero al primo
 * ritocco, e la divergenza fra l'esempio che il modello imita e il template che l'utente apre
 * non la vedrebbe nessuno finche non e tardi.
 *
 * Ognuno dichiara il suo `archetype` e il motore verifica che la composizione corrisponda:
 * apertura col visual dominante giusto, chiusura giusta, densita nella fascia giusta.
 */
'use strict';

module.exports = {
  'canonical-executive-summary': require('./executive-summary.js'),
  'canonical-funnel': require('./funnel.js'),
  'canonical-quadrants': require('./quadrants.js'),
  'canonical-operational': require('./operational.js')
};
