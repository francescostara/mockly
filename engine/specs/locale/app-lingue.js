/* CICLO LOCALE 3 — l'app per imparare le lingue: il primo mockup giudicato da un tester esterno.
 *
 * Il brief e il primo test del linguaggio naturale fatto a costo zero (modalita incolla, 14 set
 * 2026); la spec e quella che il modello ha prodotto, riparazioni comprese. Sta qui, fra i casi
 * locali, per la stessa ragione degli altri: i commenti del tester arrivano nel registro degli
 * interventi e ogni correzione si misura su un caso che resta nel corpus.
 *
 * La spec vive in app-lingue.json perche e un'uscita del modello, non codice scritto a mano: si
 * confronta cosi com'e con lo scambio salvato in eval-out/incolla/.
 */
'use strict';
const builder = require('../../data-builder.js');
const { spec, dataParams } = require('./app-lingue.json');

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 3 — app di lingue (il tester esterno: KPI di prodotto, community, per lingua)'
};
