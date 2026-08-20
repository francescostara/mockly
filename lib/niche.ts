/* Riconoscimento nicchia come passo a se stante — PREDISPOSTO, NON CABLATO.
 *
 * Oggi la nicchia la riconosce il passo generativo, leggendo la libreria dentro il system
 * prompt cachato (skill/references/niches.md, procedura in 5 punti). Funziona ed e gia pagato:
 * la libreria e nel prefisso cachato, quindi rileggerla costa ~0.1x.
 *
 * L alternativa qui sotto la spezza in due: una mini-chiamata che riceve il brief e restituisce
 * UNA etichetta fra le 11, poi la generazione vera che parte gia sapendo quale voce caricare.
 * E categorizzazione pura, il compito piu facile che esista, e costa qualche centinaio di token
 * invece di un prefisso intero.
 *
 * Perche non e attiva:
 *  - aggiunge un round-trip (latenza) e un punto di rottura in piu su un percorso che oggi ha
 *    un solo passo;
 *  - se sbaglia etichetta, sbaglia TUTTO il report a valle, e con piu sicurezza di adesso:
 *    la generazione non avrebbe piu modo di correggersi leggendo il brief;
 *  - non e misurata. Si accende quando l eval, con le stesse soglie, dice che conviene.
 *
 * Per accenderla: MOCKLY_NICHE_CALL=1 e chiamare recogniseNiche() prima di buildUserMessage,
 * passando l etichetta al messaggio utente. Il punto d innesto e in app/api/generate/route.ts,
 * segnato da un commento che rimanda qui.
 */

import { callModel, MODEL, type Usage } from './model';

/** Le 11 voci di skill/references/niches.md. `generica` non e una nicchia: e l ammissione che
 *  nessuna combacia, e manda la generazione sulla house-style (mai una dashboard vendite
 *  generica travestita da nicchia). */
export const NICHE_LABELS = [
  'social', 'retail', 'b2b-sales', 'ristorazione', 'finanziario',
  'logistica', 'energia-manifattura', 'creator-economy',
  'palestre', 'ecommerce-moda', 'saas', 'generica'
] as const;

export type NicheLabel = (typeof NICHE_LABELS)[number];

/** Spenta finche non lo decide una misura, non un'intuizione. */
export const NICHE_CALL_ENABLED = process.env.MOCKLY_NICHE_CALL === '1';

const CLASSIFIER_SYSTEM =
  'Classifichi un brief di report BI in una sola categoria. ' +
  'Rispondi SOLO con una di queste etichette, in minuscolo, senza altro testo: ' +
  NICHE_LABELS.join(', ') + '. ' +
  'Usa "generica" solo se nessuna delle altre combacia davvero.';

/** Il brief -> una etichetta. Nessuna eccezione esce da qui: se la classificazione fallisce o
 *  risponde qualcosa fuori lista, si torna a 'generica' e la generazione riconosce da se, come
 *  fa oggi. Un passo di ottimizzazione non deve poter rompere il percorso che ottimizza. */
export async function recogniseNiche(
  brief: string,
  model: string = MODEL
): Promise<{ niche: NicheLabel; usage: Usage | null }> {
  try {
    /* Senza structured:false la chiamata userebbe emit_report e il prefisso cachato da 24k
       token: sarebbe la generazione intera, non una classificazione. Il senso di questo passo
       e mandare qualche centinaio di token, non riusare il percorso caro. */
    const { text, usage } = await callModel(
      [{ role: 'user', content: 'Brief:' + '\n' + brief }],
      model,
      { system: CLASSIFIER_SYSTEM, maxTokens: 16, structured: false }
    );
    const found = NICHE_LABELS.find(l => text.toLowerCase().includes(l));
    return { niche: found || 'generica', usage };
  } catch {
    return { niche: 'generica', usage: null };
  }
}
