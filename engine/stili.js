/* GLI STILI DEL FLUSSO GUIDATO — card KPI e pannelli (skill/references/flusso.md).
 *
 * Nomi di Pruva, in inglese come l'interfaccia. Un elenco solo: la card KPI classica di oggi e
 * "plain", la delta-card e le varianti con sparkline prendono il loro posto qui, non in un secondo
 * sistema. In fase A gli stili sono dati: il motore li accetta e li valida; il disegno degli stili
 * nuovi arriva in fase B.
 */
'use strict';

const CARD = [
  { id: 'plain', nome: 'Plain', gruppo: 'number', desc: 'label, value, variation; no ornament beyond the frame' },
  { id: 'badge', nome: 'Badge', gruppo: 'number', desc: 'a small icon next to the label' },
  { id: 'banner', nome: 'Banner', gruppo: 'number', desc: 'a band at the top with the label, in the accent colour' },
  { id: 'ruled', nome: 'Ruled', gruppo: 'number', desc: 'label and value separated by a thin rule' },
  { id: 'wash', nome: 'Wash', gruppo: 'number', desc: 'background lightly tinted with the accent colour' },
  { id: 'outline', nome: 'Outline', gruppo: 'number', desc: 'strong border, neutral background' },
  { id: 'solid', nome: 'Solid', gruppo: 'number', desc: 'body filled with the accent colour, light text' },
  { id: 'columns', nome: 'Columns', gruppo: 'chart', desc: 'value plus mini columns over time', serve: 'serie' },
  { id: 'area', nome: 'Area', gruppo: 'chart', desc: 'value plus a mini area over time', serve: 'serie' },
  { id: 'stack', nome: 'Stack', gruppo: 'chart', desc: 'value plus mini stacked columns (breakdown)', serve: 'scomposizione' },
  { id: 'ring', nome: 'Ring', gruppo: 'chart', desc: 'value plus a share ring', serve: 'quota' }
];
const HEADER = [
  { id: 'quiet', nome: 'Quiet', desc: 'title and a small icon, no separators' },
  { id: 'framed', nome: 'Framed', desc: 'title inside the frame, a rule below' },
  { id: 'band', nome: 'Band', desc: 'a tinted header band' },
  { id: 'tab', nome: 'Tab', desc: 'header in a detached box above the body' }
];
const ID_CARD = CARD.map(c => c.id), ID_HEADER = HEADER.map(h => h.id);

/**
 * Lo stile regge la misura? Le card con grafico mostrano DATI VERI: colonne e area vogliono una
 * serie nel tempo, le colonne impilate una scomposizione, l'anello una quota. Altrimenti lo stile
 * si offre in grigio, con il motivo.
 * @returns {{ ok: boolean, motivo?: string }}
 */
function supporta(stile, misura, data) {
  const s = CARD.find(c => c.id === stile);
  if (!s) return { ok: false, motivo: 'unknown card style "' + stile + '"' };
  if (!s.serve) return { ok: true };
  if (!misura) return { ok: false, motivo: 'no measure' };
  const anni = (data && data.years) || [], mensili = (data && data.mensili) || anni;
  if (s.serve === 'serie') {
    const punti = mensili.length ? 12 : anni.length;
    return punti >= 3 ? { ok: true } : { ok: false, motivo: 'needs a time series: the data has fewer than 3 points in time' };
  }
  if (s.serve === 'scomposizione') {
    const dims = Object.keys((data && data.dims) || {}).filter(d => (data.facts.cols || []).indexOf(d) >= 0);
    if (misura.agg !== 'sum') return { ok: false, motivo: 'needs a measure that adds up (a sum), to split it into parts' };
    return dims.length ? { ok: true } : { ok: false, motivo: 'needs a dimension to break the measure down' };
  }
  if (s.serve === 'quota') return misura.unit === 'pct' ? { ok: true } : { ok: false, motivo: 'needs a share (a percentage measure)' };
  return { ok: true };
}

module.exports = { CARD, HEADER, ID_CARD, ID_HEADER, supporta };
