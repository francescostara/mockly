/* CICLO LOCALE 8 — controllo dei cut-off dei pagamenti di una banca privata svizzera: il tester
 * Luca (3 ott 2026), in modalita veloce (primo colpo, senza revisione).
 *
 * Sei binari (CHF SIC, EUR SEPA ed euroSIC, USD, GBP e altre valute via SWIFT) col loro cut-off,
 * quattro canali e tre tipi di pagamento. Dal primo colpo: l'hbar "space-saving" con le barre
 * confrontabili e le scritte intere, i miliardi con la loro sigla (review/interventi.js).
 */
'use strict';
const builder = require('../../data-builder.js');
const { spec, dataParams } = require('./pagamenti-luca.json');

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 8 — cut-off dei pagamenti (compliance, coda a rischio, cause dei ritardi, STP)'
};
