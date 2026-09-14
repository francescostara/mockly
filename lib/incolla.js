/* LA MODALITA INCOLLA — il linguaggio naturale provato davvero, senza crediti API.
 *
 * Il problema che risolve. Con PRUVA_STUB=1 l'app risponde sempre con la stessa spec già
 * pronta, qualunque brief si scriva: prova che la pipeline regge, non che il brief venga
 * CAPITO. Per provare la comprensione serve un modello vero, e un modello vero via API costa.
 *
 * La soluzione e un ponte a mano. Con PRUVA_STUB=incolla l'app fa tutto come in produzione —
 * stesso prompt di sistema, stesso messaggio col brief, stessa estrazione del JSON, stessa
 * validazione, stessa riparazione, stesso fallback — tranne UNA cosa: invece di chiamare l'API
 * mostra il messaggio da mandare, e aspetta che la risposta venga incollata. Il messaggio si
 * porta in una chat di claude.ai (abbonamento, non crediti API), la risposta torna nell'app.
 *
 * Il flusso e senza stato lato server: il browser rimanda ogni volta brief, intake e le
 * risposte incollate finora. Al primo giro non c'e risposta e l'app chiede di incollare la
 * prima; se la prima e rifiutata dal motore, chiede di incollare nella STESSA chat il
 * messaggio di riparazione, esattamente come farebbe col modello via API.
 *
 * DUE DIFFERENZE DALLA PRODUZIONE, dichiarate perche i risultati si leggano giusti:
 *   - in produzione il modello risponde attraverso uno strumento con lo schema JSON imposto
 *     (tool_choice); in una chat non c'e, quindi il JSON arriva come testo e passa dalla rete
 *     di sicurezza testuale. Un errore di FORMATO qui e piu probabile che in produzione: non e
 *     un difetto della spec;
 *   - il modello e quello della chat, non quello configurato in PRUVA_MODEL.
 *
 * Ogni scambio si salva in eval-out/incolla/: brief, risposte grezze, errori, esito. Sono le
 * stesse informazioni che l'eval a pagamento conserva, e si rigiocano gratis quando il motore
 * cambia. Il file e CommonJS puro per lo stesso motivo di json-object.js: la suite in node lo
 * prova senza transpilare.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const MODO = 'incolla';

/** Il messaggio del primo giro: in una chat non c'e un campo per il prompt di sistema, quindi
    le istruzioni e la richiesta viaggiano insieme, separate in modo che non si confondano. */
function messaggioIniziale(sistema, utente) {
  return [
    'Stai facendo da generatore per un’applicazione. Segui le ISTRUZIONI qui sotto alla lettera',
    'e rispondi alla RICHIESTA in fondo. La tua risposta viene letta da un programma: deve essere',
    'SOLO l’oggetto JSON { "spec": ..., "dataParams": ... }, senza testo prima o dopo e senza',
    'blocchi di codice.',
    '',
    '<<<<< ISTRUZIONI >>>>>',
    sistema,
    '',
    '<<<<< RICHIESTA >>>>>',
    utente
  ].join('\n');
}

/** La risposta incollata per il tentativo N (0 = primo, 1 = riparazione), o null se manca. */
function rispostaPer(risposte, tentativo) {
  if (!Array.isArray(risposte)) return null;
  const r = risposte[tentativo];
  return typeof r === 'string' && r.trim() ? r : null;
}

/** Il nome del file di uno scambio: data e prime parole del brief, leggibile in una cartella. */
function nomeScambio(brief, adesso) {
  const quando = (adesso || new Date()).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const parole = String(brief || 'senza-brief').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return quando + '__' + (parole || 'senza-brief') + '.json';
}

/** Salva lo scambio. Non fallisce mai la generazione: su un disco in sola lettura si rinuncia. */
function salvaScambio(cartella, record) {
  try {
    fs.mkdirSync(cartella, { recursive: true });
    const file = path.join(cartella, nomeScambio(record.brief));
    fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
    return file;
  } catch (e) {
    return null;
  }
}

module.exports = { MODO, messaggioIniziale, rispostaPer, nomeScambio, salvaScambio };
