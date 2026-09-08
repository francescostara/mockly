/* Il BANCO DI PROVA: spec scritte a mano che esercitano i visual, senza modello e senza crediti.
 *
 * Le fixture in ../index.js sono i casi dell'eval e servono a dimostrare che il motore
 * riproduce report reali. Il banco serve a un'altra cosa: avere sempre qualcosa da aprire e
 * cliccare MENTRE un visual viene costruito, e dare ai test un caso in cui la risposta giusta
 * e nota in partenza.
 *
 * Ogni voce nuova si aggiunge qui e compare automaticamente in out/banco/index.html.
 */
'use strict';

module.exports = {
  'ribbon-sorpasso': require('./ribbon-sorpasso.js'),
  'immobiliare': require('./immobiliare.js'),
  'gauge-quota': require('./gauge-quota.js'),
  'filtro-organico': require('./filtro-organico.js'),
  'heatmap-fascia': require('./heatmap-fascia.js')
  /* in arrivo, uno per visual nuovo:
     'delta-card':      apertura con la variazione come numero grande     */
};
