/* CICLO LOCALE 5 — performance di vendita di una catena di articoli sportivi: il terzo tester
 * esterno (Nitish).
 *
 * Brief breve (28 set 2026, modalita incolla, zero crediti): ricavi, trend mensili, prodotti
 * migliori, vendite per regione, crescita anno su anno, filtri per data, categoria e regione,
 * "facile vedere trend e anomalie". Il primo tentativo del modello era VALIDO per il motore di
 * allora e aveva tre difetti visibili, tutti del prodotto (review/interventi.js): la barra dei
 * filtri usciva dal bordo con una stima che diceva "ci sta", una categoria qualunque era rosso
 * pieno, e la sesta categoria riprendeva un colore gia usato. Il motore ora li rifiuta; la spec
 * qui e quella dopo la riparazione.
 */
'use strict';
const builder = require('../../data-builder.js');
const { spec, dataParams } = require('./vendite-nitish.json');

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 5 — vendite articoli sportivi (stagionalita per categoria, ribbon dei sorpassi, migliori e peggiori)'
};
