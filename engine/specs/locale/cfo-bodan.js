/* CICLO LOCALE 9 — report mensile per il CFO di un gruppo software B2B europeo: il tester Bodan
 * (3 ott 2026). Tre entita, actual, budget e anno precedente, 24 mesi.
 *
 * Dal primo colpo sono nati il conto economico vero (`statement`: voci in ordine, subtotali
 * calcolati, Actual/Budget/Var/Var% per periodo e YTD, conti espandibili), la card finance (mese e
 * YTD contro budget e anno prima), le colonne di scostamento `bud`, i colori finance, le migliaia
 * con un decimale, il ponte di cassa da apertura a chiusura su uno stock cumulativo
 * (review/interventi.js).
 */
'use strict';
const builder = require('../../data-builder.js');
const { spec, dataParams } = require('./cfo-bodan.json');

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 9 — report CFO (conto economico, budget e YTD, ponte di cassa)'
};
