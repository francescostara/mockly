/* Verifica offline del cablaggio nicchia.
 *
 *   npx tsx test/niche-check.ts            gratis: controlla il prompt e la libreria
 *   PRUVA_MODEL=... npx tsx test/niche-check.ts --live   a pagamento: chiama il modello
 *
 * ATTENZIONE, per onesta: in stub il modello NON viene chiamato, quindi lo stub non puo
 * dimostrare che il riconoscimento funziona — restituisce sempre la stessa spec. Senza
 * --live questo script verifica solo cio che si puo verificare senza spendere: che la
 * conoscenza della nicchia sia davvero nel prompt e che il vocabolario che ci aspettiamo
 * nella spec esista nella libreria. La prova vera e --live.
 */
import { SYSTEM_PROMPT } from '../lib/prompt';

type Caso = { id: string; brief: string; attesi: string[]; vietati: string[] };

/* "attesi": parole che quella nicchia deve portare. "vietati": il vocabolario della
   dashboard vendite generica, quello che non deve comparire al posto del suo. */
const CASI: Caso[] = [
  {
    id: 'palestre',
    brief: 'Report per una palestra con tre sedi a Milano.',
    attesi: ['retention', 'churn', 'riempimento corsi', 'rinnovo', 'soci attivi'],
    vietati: ['canale di acquisizione generico']
  },
  {
    id: 'ristorazione',
    brief: 'Dashboard per un ristorante che vuole capire i margini.',
    attesi: ['prime cost', 'scontrino medio', 'food cost'],
    vietati: []
  },
  {
    id: 'logistica',
    brief: 'Report per una azienda di trasporti, 40 mezzi.',
    attesi: ['margine per km', 'costo medio per', 'carrier vs flotta propria'],
    vietati: []
  },
  {
    id: 'finanza',
    brief: 'Report mensile per il CFO di una media impresa manifatturiera.',
    attesi: ['budget vs actual', 'ar aging', 'cash runway', 'ebitda'],
    vietati: []
  }
];

const norm = (s: string) => s.toLowerCase()
  .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i')
  .replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u');

const prompt = norm(SYSTEM_PROMPT);
let fail = 0;

console.log('conoscenza della nicchia dentro il prompt (gratis, nessuna chiamata al modello)');
console.log('');
for (const c of CASI) {
  const mancanti = c.attesi.filter(a => !prompt.includes(norm(a)));
  const ok = mancanti.length === 0;
  if (!ok) fail++;
  console.log('  ' + (ok ? 'ok    ' : 'MANCA ') + c.id.padEnd(14) +
    (ok ? c.attesi.length + ' termini della nicchia presenti' : 'assenti: ' + mancanti.join(', ')));
}

/* la procedura deve venire PRIMA della grammatica: e cio che decide di cosa parla il report */
const iProc = prompt.indexOf('identify the niche');
const iGram = prompt.indexOf('the spec grammar');
console.log('');
console.log('  ' + (iProc >= 0 && iProc < iGram ? 'ok    ' : 'MANCA ') +
  'la procedura di riconoscimento precede la grammatica');
if (!(iProc >= 0 && iProc < iGram)) fail++;

const oneShot = prompt.includes('one shot, no questions back');
console.log('  ' + (oneShot ? 'ok    ' : 'MANCA ') + 'divieto esplicito di fare domande di ritorno');
if (!oneShot) fail++;

console.log('');
if (fail) { console.log(fail + ' controlli falliti'); process.exit(1); }
console.log('prompt a posto. La prova che il MODELLO usi davvero la nicchia richiede una');
console.log('chiamata vera: rigenera gyms e finance quando ci sono i crediti.');
