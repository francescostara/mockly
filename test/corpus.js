/* Il corpus dei casi renderizzabili, in un posto solo: archetipi, banco, eval e casi locali.
   I test nuovi lo leggono da qui; i vecchi hanno ancora la loro copia della stessa funzione. */
'use strict';
const fs = require('fs');
const path = require('path');

function casi() {
  const out = [];
  const agg = (fonte, m) => Object.keys(m).filter(k => k[0] !== '_')
    .forEach(k => out.push({ id: fonte + '/' + k, caso: m[k] }));
  agg('archetipi', require('../engine/templates/index.js'));
  agg('banco', require('../engine/specs/banco/index.js'));
  agg('eval', require('../engine/specs/index.js'));
  const dir = path.join(__dirname, '..', 'engine', 'specs', 'locale');
  fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js')
    .forEach(f => out.push({ id: 'locale/' + f.replace(/\.js$/, ''), caso: require(path.join(dir, f)) }));
  return out;
}

module.exports = { casi };
