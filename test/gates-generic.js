/* I GATE ANTI-GENERICO — si giudicano su un INSIEME, non su un file.
 *
 * Gli altri gate guardano una spec per volta: i numeri tornano, la pagina ci sta, il filtro
 * filtra. Nessuno di quelli puo accorgersi del difetto peggiore che abbiamo avuto, perche non
 * e un difetto di un file — e un difetto della COLLEZIONE: dieci report per dieci brief
 * diversi con la stessa identica forma. Ogni singolo file passava tutto.
 *
 * "Un consulente BI la riconosce a colpo d'occhio come template" e una frase che si puo
 * misurare: quante generazioni hanno la stessa firma strutturale, quante aprono allo stesso
 * modo, quante chiudono allo stesso modo. Sono queste tre.
 */
'use strict';
const SKIN = require('../engine/skin.js');

/** La firma strutturale di una pagina: i tipi di visual, riga per riga, con gli span. */
const firmaPagina = pg => (pg.rows || [])
  .map(r => r.visuals.map(v => v.type + ':' + v.span).join('+')).join(' | ');

/** La firma di un report: tutte le sue pagine. Due report con la stessa firma sono lo stesso
 *  report con dentro altri numeri. */
const firma = spec => (spec.pages || []).map(firmaPagina).join('  ||  ');

/** La prima riga di contenuto, saltando una fascia di sola narrativa (che e un'intestazione). */
function aperturaDi(spec) {
  const pg = (spec.pages || [])[0];
  if (!pg || !(pg.rows || []).length) return [];
  const NC = spec.grid ? spec.grid.columns : 0;
  const i = pg.rows.findIndex(r =>
    !(r.visuals.length === 1 && r.visuals[0].type === 'narrative' && r.visuals[0].span === NC));
  return (pg.rows[i < 0 ? 0 : i].visuals || []).map(v => v.type);
}

function chiusuraDi(spec) {
  const pg = (spec.pages || [])[0];
  const rows = (pg && pg.rows) || [];
  const ultima = (rows[rows.length - 1] || {}).visuals || [];
  const NC = spec.grid ? spec.grid.columns : 0;
  return {
    matricePiena: ultima.length === 1 && ultima[0].type === 'matrix' && ultima[0].span === NC,
    tipi: ultima.map(v => v.type)
  };
}

/** Quanto e densa la pagina: card della banda KPI piu visual di contenuto. */
const densita = spec => (spec.kpiBand || []).length +
  (((spec.pages || [])[0] || {}).rows || []).reduce((n, r) => n + r.visuals.length, 0);

/** La scheda di una singola spec — serve sia ai gate d'insieme sia al referto per file.
 *  `nicchia` e opzionale: chi chiama la sa (l'eval dal nome del caso), un test sui canonici no. */
function scheda(spec, nome, nicchia) {
  const ap = aperturaDi(spec), ch = chiusuraDi(spec);
  /* La pelle e mezza risposta alla domanda "si somigliano?": due report con la stessa
     composizione ma palette, caratteri e cornice diversi non si riconoscono come gemelli. */
  let pelle = null;
  try {
    const P = SKIN.pelleDi(spec);
    pelle = { shell: P.shell.id, palette: P.id.palette, tipografia: P.id.tipografia, densita: P.id.densita };
  } catch { /* spec di un giro precedente, senza estetica valida: si resta senza pelle */ }
  return {
    nome, nicchia: nicchia || null, pelle,
    combinazione: pelle ? [pelle.palette, pelle.tipografia, pelle.shell].join(' + ') : null,
    archetipo: spec.archetype || null,
    firma: firma(spec),
    apertura: ap,
    formulaPrincipiante: ap.includes('trend') && ap.includes('donut'),
    chiudeMatricePiena: ch.matricePiena,
    densita: densita(spec)
  };
}

/* Le soglie sono quelle del task, e sono soglie di INSIEME: un report che chiude con la
   matrice non ha sbagliato niente — nove su dieci si. */
const SOGLIE = { firmaUguale: 0.40, apertura: 0.40, chiusura: 0.60, pelleUguale: 0.30 };

/** I gate sull'insieme. `pubblici` e opzionale: id -> 'board' | 'operativo' | altro, preso
 *  dal brief quando chi chiama ce l'ha (l'eval si, un test sui canonici no). */
function insieme(schede, pubblici) {
  const n = schede.length, esiti = [];
  if (!n) return esiti;
  const ok = (id, passa, testo) => esiti.push({ id, passa, testo });

  /* 1. DIVERSITA. Il gruppo piu numeroso con la stessa firma non puo superare il 40%. */
  const conteggio = {};
  schede.forEach(s => { conteggio[s.firma] = (conteggio[s.firma] || 0) + 1; });
  const [firmaTop, quante] = Object.entries(conteggio).sort((a, b) => b[1] - a[1])[0];
  ok('diversita', quante / n <= SOGLIE.firmaUguale,
    `${quante} file su ${n} hanno la stessa firma strutturale (${(quante / n * 100).toFixed(0)}%, ` +
    `soglia ${SOGLIE.firmaUguale * 100}%)` + (quante > 1 ? ` — "${firmaTop.slice(0, 70)}"` : ''));

  /* 2. APERTURA. La formula da principiante non puo essere l'apertura di piu del 40%. */
  const formula = schede.filter(s => s.formulaPrincipiante).length;
  ok('apertura', formula / n <= SOGLIE.apertura,
    `${formula} su ${n} aprono con trend + donut sotto la banda KPI ` +
    `(${(formula / n * 100).toFixed(0)}%, soglia ${SOGLIE.apertura * 100}%)`);

  /* 3. CHIUSURA. */
  const chiude = schede.filter(s => s.chiudeMatricePiena).length;
  ok('chiusura', chiude / n <= SOGLIE.chiusura,
    `${chiude} su ${n} chiudono con la matrice a piena larghezza ` +
    `(${(chiude / n * 100).toFixed(0)}%, soglia ${SOGLIE.chiusura * 100}%)`);

  /* 4. DENSITA CONTRO PUBBLICO. Vale solo dove il pubblico e noto: un board che riceve dodici
        riquadri non li guarda, un operativo con quattro non ci lavora. */
  const conPubblico = schede.filter(s => pubblici && pubblici[s.nome]);
  if (conPubblico.length) {
    const sbagliati = conPubblico.filter(s => {
      const p = pubblici[s.nome];
      if (p === 'board') return s.densita > 7;
      if (p === 'operativo') return s.densita < 8;
      return false;
    });
    ok('densita-pubblico', !sbagliati.length,
      sbagliati.length
        ? sbagliati.map(s => `${s.nome}: pubblico ${pubblici[s.nome]}, ${s.densita} fra card e visual`).join('; ')
        : `${conPubblico.length} file con pubblico dichiarato, densita coerente`);
  }

  /* 4b. VARIETA DELLA PELLE. La composizione puo essere legittimamente la stessa — due
         scorecard sono due scorecard — ma se anche colore, caratteri e cornice coincidono, i
         due file si riconoscono come lo stesso template a colpo d'occhio, che e la cosa che
         perde il progetto. */
  const conPelle = schede.filter(s => s.combinazione);
  if (conPelle.length > 1) {
    const combo = {};
    conPelle.forEach(s => { combo[s.combinazione] = (combo[s.combinazione] || 0) + 1; });
    const [comboTop, quanteC] = Object.entries(combo).sort((a, b) => b[1] - a[1])[0];
    ok('varieta-pelle', quanteC / conPelle.length <= SOGLIE.pelleUguale,
      `${quanteC} file su ${conPelle.length} hanno la stessa combinazione palette+tipografia+shell ` +
      `(${(quanteC / conPelle.length * 100).toFixed(0)}%, soglia ${SOGLIE.pelleUguale * 100}%)` +
      (quanteC > 1 ? ` — "${comboTop}"` : ''));

    /* 4c. STESSA NICCHIA, FACCE DIVERSE. E' il caso peggiore e il piu probabile: due brief di
           ristorazione che escono identici. Devono differire in almeno DUE assi su cinque. */
    const perNicchia = {};
    conPelle.filter(s => s.nicchia).forEach(s => {
      (perNicchia[s.nicchia] = perNicchia[s.nicchia] || []).push(s);
    });
    const troppoSimili = [];
    Object.keys(perNicchia).forEach(n => {
      const g = perNicchia[n];
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
        const a = g[i], b = g[j];
        const assi = [
          a.archetipo !== b.archetipo,
          a.pelle.shell !== b.pelle.shell,
          a.pelle.palette !== b.pelle.palette,
          a.pelle.tipografia !== b.pelle.tipografia,
          a.pelle.densita !== b.pelle.densita
        ].filter(Boolean).length;
        if (assi < 2) troppoSimili.push(`${a.nome} e ${b.nome} (nicchia ${n}): ${assi} asse diverso su 5`);
      }
    });
    if (Object.keys(perNicchia).some(n => perNicchia[n].length > 1)) {
      ok('varieta-stessa-nicchia', !troppoSimili.length,
        troppoSimili.length ? troppoSimili.join('; ')
          : 'ogni coppia della stessa nicchia differisce in almeno due assi');
    }
  }

  /* 5. ARCHETIPO DICHIARATO. Il motore lo pretende gia; qui si conta, perche un giro fatto
        prima della regola resta leggibile e si vede subito quanti file sono vecchi. */
  const senza = schede.filter(s => !s.archetipo);
  ok('archetipo-dichiarato', !senza.length,
    senza.length ? `${senza.length} file senza spec.archetype: ${senza.map(s => s.nome).join(', ')}`
      : `tutti dichiarano l'archetipo (${[...new Set(schede.map(s => s.archetipo))].join(', ')})`);

  return esiti;
}

module.exports = { scheda, insieme, firma, aperturaDi, chiusuraDi, densita, SOGLIE };
