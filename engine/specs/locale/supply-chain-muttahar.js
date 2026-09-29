/* CICLO LOCALE 7 — performance della supply chain di un'azienda di beni di consumo: il tester
 * Muttahar (29 set 2026), in modalita veloce (primo colpo, senza revisione).
 *
 * Sei magazzini, dieci regioni degli Stati Uniti, tre anni; OTIF, puntualita e fill rate coi loro
 * target. Il primo colpo aveva un gauge da solo in una card da 410px: l'autore l'ha segnalato
 * ("occupa troppo spazio per l'informazione che da"), e da li il gauge multiplo, il rifiuto del
 * gauge singolo largo e le tabelle che non si tagliano (review/interventi.js).
 */
'use strict';
const builder = require('../../data-builder.js');
const { spec, dataParams } = require('./supply-chain-muttahar.json');

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 7 — supply chain (OTIF, puntualita e fill rate contro target, gauge multiplo)'
};
