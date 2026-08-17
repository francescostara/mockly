/* Fixture registry: eval case id (skill/evals/evals.json) -> { spec, build }.
 * Each fixture is what an LLM would author for that brief; the engine renders it. */
'use strict';
const nodoSpec = require('./nodo-trama.spec.js');
const nodoBuild = require('./nodo-trama.build.js');

module.exports = {
  'messy-retail-human': { spec: nodoSpec, build: nodoBuild.build, name: 'Nodo & Trama' },
  'social-monthly': require('./social-monthly.js'),
  'ecommerce-retail': require('./ecommerce-retail.js'),
  'saas-metrics': require('./saas-metrics.js')
};
