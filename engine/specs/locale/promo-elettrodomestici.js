/* CICLO LOCALE 6 — le campagne promozionali di una catena di elettrodomestici: il test di Fra.
 *
 * Il brief (28 set 2026, modalita incolla, zero crediti): sei sedi in Piemonte, i risultati e i
 * KPI delle campagne degli ultimi due anni — alcune ripetute —, sconti generali e sconti su
 * categorie, e quali prodotti si vendono molto di piu in offerta. La v1 ha mostrato che la
 * grammatica non sapeva dire tre cose (review/interventi.js): che una campagna vale su una
 * categoria sola (vendeva di tutto), che una campagna puo essere fatta una volta sola, e una
 * heatmap dove una colonna enorme schiaccia le altre. La spec qui e la v2 del modello.
 */
'use strict';
const builder = require('../../data-builder.js');
const { spec, dataParams } = require('./promo-elettrodomestici.json');

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 6 — campagne promozionali (eventi nel tempo, campagne di categoria, una tantum, uplift)'
};
