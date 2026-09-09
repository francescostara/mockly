/* Le variabili d'ambiente del prodotto, lette da un posto solo.
 *
 * Il prodotto si chiamava Mockly e ora si chiama Pruva. Le variabili seguono il nome —
 * PRUVA_STUB, PRUVA_MODEL, PRUVA_TRACE, PRUVA_NICHE_CALL — ma il vecchio prefisso continua a
 * funzionare: un .env.local scritto la settimana scorsa, uno script salvato, un comando nella
 * cronologia del terminale non devono smettere di funzionare per un cambio di nome. Il costo
 * della retrocompatibilita e questa funzione; il costo di non averla e un pomeriggio a capire
 * perche il giro dell'eval non parte piu.
 *
 * Vince sempre PRUVA_: se ci fossero entrambe, quella nuova e quella che l'utente ha scritto
 * per ultima con l'intenzione di usarla.
 */

/** Il valore di una variabile, cercata prima come PRUVA_<nome> e poi come MOCKLY_<nome>. */
export function env(nome: string): string | undefined {
  const nuova = process.env['PRUVA_' + nome];
  return nuova !== undefined && nuova !== '' ? nuova : process.env['MOCKLY_' + nome];
}

/** Vero quando la variabile vale esattamente "1". */
export const flag = (nome: string): boolean => env(nome) === '1';

/** I nomi vecchi ancora in giro nell'ambiente: serve a dirlo, non a impedirlo. */
export function nomiVecchiInUso(): string[] {
  return ['STUB', 'MODEL', 'TRACE', 'NICHE_CALL']
    .filter(n => process.env['MOCKLY_' + n] !== undefined && process.env['PRUVA_' + n] === undefined)
    .map(n => 'MOCKLY_' + n);
}
