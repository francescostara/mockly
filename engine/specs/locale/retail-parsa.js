/* CICLO LOCALE 4 — vendite e redditivita di un retailer: il secondo tester esterno (Parsa).
 *
 * Il brief (27 set 2026, modalita incolla, zero crediti) chiedeva quattro filtri — data,
 * regione, categoria, segmento cliente —, i prodotti migliori E quelli che hanno bisogno di
 * attenzione, e di vedere a colpo d'occhio la regione che cresce mentre perde margine. La v1 ha
 * trovato sette difetti del prodotto (review/interventi.js): il generatore reggeva due
 * dimensioni, l'hbar solo la testa della classifica, la matrice scriveva in percento le
 * variazioni di un margine, la grammatica taceva `motivo`, l'app giudicava l'archetipo su una
 * card a viste senza tipo, il colline colorava l'anno prima, il drill ripeteva il nome.
 *
 * La spec vive in retail-parsa.json perche e un'uscita del modello (la v2, dopo una
 * riparazione): si confronta cosi com'e con lo scambio salvato in out/parsa-retail/scambi/.
 */
'use strict';
const builder = require('../../data-builder.js');
const { spec, dataParams } = require('./retail-parsa.json');

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 4 — retail, vendite e redditivita (tre filtri, migliori e peggiori, regione che cresce e perde margine)'
};
