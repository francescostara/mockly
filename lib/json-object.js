/* Estrazione JSON tollerante — CommonJS puro cosi la suite in node la puo provare
 * direttamente, senza transpilare lib/model.ts. Nessuna dipendenza: e lavoro su stringhe.
 */

/** Il primo oggetto JSON BILANCIATO, non "dalla prima graffa all ultima": se il modello
 *  aggiunge una frase dopo l oggetto e quella frase contiene una graffa, il taglio ingenuo
 *  includeva anche il commento e il parse moriva. Scansione consapevole di stringhe ed escape. */
function firstBalancedObject(s) {
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === String.fromCharCode(92)) esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

/** Tutti gli oggetti bilanciati di seguito, non solo il primo. */
function balancedObjects(s, max) {
  const out = [];
  let rest = s;
  while (out.length < (max || 4)) {
    const o = firstBalancedObject(rest);
    if (!o) break;
    out.push(o);
    rest = rest.slice(rest.indexOf(o) + o.length);
  }
  return out;
}

/* Il modello puo consegnare la risposta come STRINGA dentro il campo spec invece che come
   oggetto: succede quando lo schema dello strumento dichiara spec come oggetto opaco, e il
   modello ci scrive dentro tutto il testo — a volte i due oggetti di fila, spec e poi
   dataParams. Nell'eval e successo in 8 primi tentativi su 8. La cura vera e dare a spec una
   forma nello schema; questa e la rete che recupera comunque la risposta invece di buttarla. */
function unwrapStringified(parsed) {
  if (typeof parsed.spec !== 'string') return parsed;
  const parti = balancedObjects(parsed.spec, 2).map(o => { try { return JSON.parse(o); } catch { return null; } });
  const spec = parti[0];
  if (!spec) return parsed;
  const dataParams = (parsed.dataParams && typeof parsed.dataParams === 'object')
    ? parsed.dataParams
    : parti[1];
  return dataParams ? { spec, dataParams } : { ...parsed, spec };
}

/** Tolerant JSON extraction: the answer arrives as a tool call, but this stays as the net for
 *  a model that ignored tool_choice — fenced, prefaced, or with a sentence trailing after. */
function extractJson(text) {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const obj = firstBalancedObject(s);
  if (!obj) throw new Error('La risposta del modello non contiene JSON.');
  let parsed = JSON.parse(obj);
  if (!parsed || typeof parsed !== 'object') throw new Error('Il JSON del modello non è un oggetto.');
  parsed = unwrapStringified(parsed);
  if (!parsed.spec || !parsed.dataParams) {
    throw new Error('Il JSON del modello non contiene entrambe le chiavi "spec" e "dataParams".');
  }
  return parsed;
}

module.exports = { firstBalancedObject, balancedObjects, unwrapStringified, extractJson };
