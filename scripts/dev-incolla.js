#!/usr/bin/env node
/* `npm run dev:incolla` — l'app vera, in modalita incolla (lib/incolla.js).
 *
 * Esiste per non doversi ricordare di impostare una variabile d'ambiente, e soprattutto per
 * non dimenticarsene: una sessione avviata con `npm run dev` e un .env.local con la chiave
 * chiama l'API e spende. Questo comando, per costruzione, non puo farlo — il ramo della route
 * che chiama il modello non viene mai raggiunto con PRUVA_STUB=incolla.
 */
'use strict';
const { spawn } = require('child_process');

const env = Object.assign({}, process.env, { PRUVA_STUB: 'incolla' });
console.log('\nPRUVA — modalita incolla: nessuna chiamata API, nessun credito.');
console.log('Il messaggio da portare in chat compare nell app dopo "Genera".\n');
const figlio = spawn('npx', ['next', 'dev'].concat(process.argv.slice(2)), { env, stdio: 'inherit', shell: true });
figlio.on('exit', code => process.exit(code || 0));
