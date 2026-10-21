/* IL KIT POWER BI — dal mockup al report vero, generato dalla spec e non scritto a mano.
 *
 * Pruva e l'artefatto di PRE-VENDITA: il consulente lo manda al cliente PRIMA di costruire il
 * report in Power BI. Il passo dopo il "si" e quindi sempre lo stesso — ricostruirlo — e finora
 * la guida per farlo esisteva solo come promessa nella skill ("offrila su richiesta"), cioe come
 * testo che un modello avrebbe dovuto scrivere, a pagamento, ogni volta in modo diverso.
 *
 * Qui nasce dalla spec, come la scheda di interazione: stessa spec, stesso kit, byte per byte,
 * nessun credito. E dice solo cose vere, perche le legge da cio che il motore ha davvero reso:
 *
 *   1. il PROMPT per far generare a una GenAI un dataset su cui lavorare — con le tabelle, le
 *      colonne, i membri, il carattere di ogni membro e i rapporti che il dato deve centrare;
 *   2. il MODELLO DATI — stella: una tabella dei fatti, le dimensioni, il calendario, le
 *      relazioni con cardinalita e direzione;
 *   3. le MISURE DAX — una per misura della spec, piu il confronto col periodo precedente (con
 *      la regola del mockup: mese selezionato -> MoM, altrimenti YoY), la quota e i bersagli;
 *   4. il FRONT END — pagina per pagina, riga per riga: quale visual nativo, quali campi, dove
 *      metterlo sulla tela 1280x720, e come impostare slicer, interazioni e drill-through;
 *   5. il TEMA — un JSON importabile in Power BI con i colori verificati e i font della pelle.
 *
 * Tre regole del file:
 *   - nessun visual resta senza traduzione: un tipo che il motore renderizza e che qui manca e
 *     un errore (test/powerbi.test.js);
 *   - le posizioni in pixel sono ESATTE in larghezza (vengono dalla griglia) e INDICATIVE in
 *     altezza (Power BI non ha il fit del motore, e dirle esatte sarebbe mentire);
 *   - la lingua e quella del report, come ogni altra parola che il cliente legge.
 */
'use strict';

/* Una percentuale varia di punti: la stessa regola di A.punti nel runtime, in un posto solo
   anche qui. Il kit ne aveva tre copie, e una guardava solo il formato: una misura dichiarata
   unit:"pct" senza format:"pc" definiva la misura "Var pp" e la matrice chiamava "Var %". */
const inPunti = m => !!m && (m.unit === 'pct' || m.unit === 'pp' || m.format === 'pc');
const SKIN = require('./skin.js');
const { splitsOf } = require('./data-builder.js');

/* ------------------------------------------------------------------ le parole, in due lingue */
const T = {
  it: {
    titolo: 'Kit Power BI', intro: (t) => 'Tutto cio che serve per ricostruire "' + t + '" in Power BI Desktop: ' +
      'il dataset da generare, il modello, le misure DAX, le pagine visual per visual e il tema. ' +
      'Generato dalla stessa spec del mockup: quello che trovi qui e quello che il mockup fa.',
    s1f: '1. Il dataset — i dati forniti',
    s1fa: (fonte, n, cols, annuale) => 'Il report e costruito sui dati forniti' + (fonte ? ' (' + fonte + ')' : '') + ', non su dati sintetici: non serve nessun prompt. ' +
      'Importa in Power BI il CSV che accompagna il mockup (Recupera dati → Testo/CSV): ' + n + ' righe, colonne ' + cols + '. ' +
      (annuale ? 'I dati sono ANNUALI: una riga per anno, Date = 1 gennaio dell\'anno; il calendario e i visual nel tempo usano l\'anno, mai il mese. ' : '') +
      'Cio che nei dati manca resta vuoto: Power BI mostrera celle vuote, che e il comportamento giusto.',
    fattiAnno: 'fatti — grano: un anno per',
    s1: '1. Il dataset — prompt per una GenAI', s1a: 'Copia il blocco qui sotto in una chat (Claude, ChatGPT, ' +
      'Gemini). Risponde con dei CSV da salvare e importare in Power BI con Recupera dati → Testo/CSV. ' +
      'In alternativa puoi partire dal CSV esportato dal mockup (bottone "Dati CSV"): stessi numeri che vedi a schermo.',
    s2: '2. Il modello dati', s2a: 'Schema a stella. Una tabella dei fatti al grano mensile, una tabella per ' +
      'dimensione, un calendario. Tutte le relazioni sono uno-a-molti, direzione singola (dalla dimensione ai fatti).',
    tabella: 'Tabella', colonne: 'Colonne', ruolo: 'Ruolo', fatti: 'fatti — grano: un mese per',
    dimensione: 'dimensione', calendario: 'calendario — segnala come tabella data (Strumenti tabella → Segna come tabella data)',
    relazioni: 'Relazioni', dettaglio: 'fatti di dettaglio — grano: un mese per', peso: 'peso', piuDi: 'rispetto alla media dei fratelli',
    s3: '3. Le misure DAX', s3a: 'Crea una tabella vuota "_Misure" (Immetti dati → carica senza righe) e ' +
      'mettici tutte le misure: il modello resta leggibile e le misure non si perdono fra le colonne.',
    base: 'Misure di base', tempo: 'Confronto col periodo precedente',
    tempoA: 'Il mockup confronta col mese precedente quando e selezionato un mese, altrimenti con lo stesso ' +
      'periodo dell’anno prima. Queste misure fanno la stessa cosa. Le percentuali variano in PUNTI, non in percentuale di se stesse.',
    quote: 'Quote e bersagli',
    s4: '4. Il front end, pagina per pagina', s4a: (w, s) => 'Imposta la pagina a 1280 × 720 (Formato pagina → ' +
      'Tipo: Personalizzato). Area utile per i visual: larghezza ' + w + ' px, spazio fra i riquadri ' + s +
      ' px. Le larghezze qui sotto sono esatte; le altezze sono indicative, adattale finche la riga di chiusura non tocca il fondo.',
    slicer: 'Filtri (su ogni pagina, sincronizzati: Visualizza → Sincronizza filtri dei dati)',
    slicerData: 'Periodo — filtro dati a elenco a discesa con la gerarchia Anno › Trimestre › Mese di ’Date’.',
    slicerDim: (l, n, c) => l + ' — filtro dati su ’' + n + '’[Name], ' + (c === 'dropdown' ? 'a discesa' : 'a elenco orizzontale') + '.',
    banda: 'Banda KPI (in cima a ogni pagina)', riga: 'Riga', pagina: 'Pagina', drill: 'Pagina di drill-through',
    drillA: (d) => 'Nella pagina, trascina ’' + d + '’[Name] nel campo Drill-through. Power BI aggiunge da solo il pulsante Indietro. ' +
      'Dalla matrice: tasto destro su una riga → Drill-through.',
    esenzione: 'Modifica interazioni: questo visual NON deve reagire ai filtri di Trimestre e Mese (resta sui 12 mesi ed evidenzia il periodo).',
    viste: 'Due viste nella stessa posizione: crea i due visual sovrapposti, poi due segnalibri (Visualizza → Segnalibri) che mostrano uno e nascondono l’altro (riquadro Selezione), e due pulsanti che li richiamano.',
    pos: 'posizione', larghezza: 'larghezza', altezza: 'altezza ~',
    s5: '5. Il tema', s5a: 'Salva il blocco come tema.json e importalo: Visualizza → Temi → Sfoglia i temi. ' +
      'I colori delle categorie sono gli stessi del mockup e seguono lo stesso ordine dei membri.',
    promptTesta: 'Genera un dataset sintetico ma plausibile per un report Power BI. Rispondi SOLO con i file CSV richiesti, ognuno in un blocco di codice separato preceduto dal nome del file, con la riga di intestazione. Niente spiegazioni.',
    promptFatti: 'FILE', righe: 'righe', colDate: 'primo giorno del mese, formato AAAA-MM-GG',
    membri: 'MEMBRI E CARATTERE', stag: 'STAGIONALITA (moltiplicatori mese per mese, gennaio → dicembre)',
    derivate: 'COME SI DERIVANO LE COLONNE (arrotonda sempre a interi)', vincoli: 'VINCOLI',
    v1: 'Ogni valore e un intero non negativo. Le righe di dettaglio sommano esattamente alla riga dei fatti corrispondente.',
    v0: 'Le colonne Key sono interi da 1; SortOrder e l’ordine dei membri come elencati sotto. I file dei fatti usano le Key, non i nomi.',
    ordinamento: 'Ordina ’Date’[Month] per ’Date’[MonthNo], e ogni [Name] delle dimensioni per [SortOrder] (Strumenti colonna → Ordina per colonna): senza, i mesi escono in ordine alfabetico.',
    v2: 'La crescita e annua e composta: il valore di un membro nell’anno N e base × (1 + crescita)^(N − primo anno).',
    v3: 'Aggiungi un rumore casuale fra ±5% su ogni riga, mai tanto da cambiare i rapporti sotto.',
    v4: 'Nell’ultimo anno il totale deve centrare questi rapporti (±5%):',
    primaria: 'misura primaria: base mensile nel primo anno', crescita: 'crescita annua',
    formula: { seasonal: (f) => f + ' = base del membro × (1 + crescita)^anno × stagionalita del mese',
      share: (f, of, a, s) => f + ' = ' + of + ' × ' + a + (s ? ' (attributo della ' + s + ')' : '') ,
      divide: (f, of, a, s) => f + ' = ' + of + ' ÷ ' + a + (s ? ' (attributo della ' + s + ')' : '') + ', minimo 1',
      combine: (f, p, m) => f + ' = ' + (p || []).join(' + ') + ((m || []).length ? ' − ' + m.join(' − ') : ''),
      complemento: ' (usa 1 − valore)', solo: (d, ms) => ', vale 0 fuori da ' + d + ' = ' + ms.join('/') },
    vis: {
      trend: 'Grafico a linee', colline: 'Grafico a linee e istogramma raggruppato', donut: 'Grafico ad anello',
      hbar: 'Grafico a barre raggruppate', stack100: 'Grafico a barre in pila 100%', ribbon: 'Grafico a nastro',
      funnel: 'Imbuto', waterfall: 'Grafico a cascata', scatter: 'Grafico a dispersione', matrix: 'Matrice', statement: 'Matrice (conto economico)',
      sparkline: 'Scheda (nuova) con sparkline', narrative: 'Narrazione intelligente / casella di testo con valori dinamici',
      gauge: 'Misuratore', heatmap: 'Matrice con formattazione condizionale (mappa di calore)',
      'delta-card': 'Scheda (nuova) — variazione come valore principale', kpi: 'Scheda (nuova)'
    },
    campi: 'Campi', impostazioni: 'Impostazioni',
    ordina: 'Ordina per valore decrescente.', mediane: 'Riquadro Analisi: linea mediana su X e su Y (i quattro quadranti).',
    bottomn: (n) => 'Filtri del visual: Primi N → Ultimi ' + n + ' per la misura (i ' + n + ' piu deboli); ordina per valore crescente.',
    topn: (n) => 'Filtri del visual: Primi N = ' + n + ' per la misura; il resto si raccoglie in "Altri" con un gruppo (tasto destro sul campo → Nuovo gruppo).',
    heatCF: (m, lo, hi) => 'Formattazione condizionale → Colore di sfondo su ' + m + ': sfumatura' + (lo !== undefined ? ' da ' + lo + ' a ' + hi : '') + '.',
    varCF: 'Formattazione condizionale → Icone (▲ ▼) sulla colonna di variazione.',
    totali: 'Totali di riga attivi.', target: (t) => 'Valore di destinazione: ' + t + '.',
    linea: (m) => 'Asse Y secondario: ' + m + '.', legendaAnni: 'Legenda: ’Date’[Year] (anno corrente pieno, anno precedente tratteggiato).', legendaColonne: 'Legenda: ’Date’[Year] (anno corrente e anno precedente come due colonne affiancate, l’anno precedente in grigio neutro: Formato → Colonne → colore della serie, mai un colore dei dati).',
    colore: (d) => 'Colore per categoria: legenda = ' + d + ' (lo stesso colore su ogni pagina).',
    alert: (m) => 'Evidenzia in rosso lo spicchio "' + m + '" (colore dati → formattazione condizionale).',
    deltaCard: (m) => 'Valore principale: ' + m + '; etichetta di riferimento: periodo precedente → periodo corrente; aggiungi la sparkline mensile.',
    stadi: 'Crea la tabella Stages (sezione 3) e usa [Stage value] come valore, Stages[Stage] come categoria.',
    narr: 'Solo testo costruito con misure: niente frasi scritte a mano su numeri specifici.'
  },
  en: {
    titolo: 'Power BI kit', intro: (t) => 'Everything you need to rebuild "' + t + '" in Power BI Desktop: ' +
      'the dataset to generate, the model, the DAX measures, the pages visual by visual, and the theme. ' +
      'Generated from the same spec as the mockup: what you read here is what the mockup does.',
    s1f: '1. The dataset — the data provided',
    s1fa: (fonte, n, cols, annuale) => 'The report is built on the data provided' + (fonte ? ' (' + fonte + ')' : '') + ', not on synthetic data: there is no prompt to run. ' +
      'Import the CSV that comes with the mockup into Power BI (Get data → Text/CSV): ' + n + ' rows, columns ' + cols + '. ' +
      (annuale ? 'The data is ANNUAL: one row per year, Date = 1 January of the year; the calendar and every visual over time use the year, never the month. ' : '') +
      'What the data does not have stays empty: Power BI will show blank cells, which is the right behaviour.',
    fattiAnno: 'facts — grain: one year per',
    s1: '1. The dataset — prompt for a GenAI', s1a: 'Paste the block below into a chat (Claude, ChatGPT, Gemini). ' +
      'It answers with CSV files to save and import with Get data → Text/CSV. ' +
      'Alternatively start from the CSV exported from the mockup ("Data CSV" button): the same numbers you see on screen.',
    s2: '2. The data model', s2a: 'Star schema. One fact table at monthly grain, one table per dimension, a ' +
      'calendar. Every relationship is one-to-many, single direction (from the dimension to the facts).',
    tabella: 'Table', colonne: 'Columns', ruolo: 'Role', fatti: 'facts — grain: one month per',
    dimensione: 'dimension', calendario: 'calendar — mark as date table (Table tools → Mark as date table)',
    relazioni: 'Relationships', dettaglio: 'detail facts — grain: one month per', peso: 'weight', piuDi: 'against the siblings’ average',
    s3: '3. The DAX measures', s3a: 'Create an empty "_Measures" table (Enter data → load with no rows) and put every ' +
      'measure in it: the model stays readable and measures do not get lost among the columns.',
    base: 'Base measures', tempo: 'Prior-period comparison',
    tempoA: 'The mockup compares with the previous month when a month is selected, otherwise with the same period ' +
      'last year. These measures do the same. Percentages move in POINTS, not in percent of themselves.',
    quote: 'Shares and targets',
    s4: '4. The front end, page by page', s4a: (w, s) => 'Set the page to 1280 × 720 (Page format → Type: Custom). ' +
      'Usable area for visuals: width ' + w + ' px, gap between tiles ' + s + ' px. Widths below are exact; ' +
      'heights are indicative — adjust them until the closing row reaches the bottom.',
    slicer: 'Slicers (on every page, synced: View → Sync slicers)',
    slicerData: 'Period — dropdown slicer on the Year › Quarter › Month hierarchy of ’Date’.',
    slicerDim: (l, n, c) => l + ' — slicer on ’' + n + '’[Name], ' + (c === 'dropdown' ? 'dropdown' : 'horizontal tiles') + '.',
    banda: 'KPI band (top of every page)', riga: 'Row', pagina: 'Page', drill: 'Drill-through page',
    drillA: (d) => 'On the page, drag ’' + d + '’[Name] into the Drill-through field. Power BI adds the Back button. ' +
      'From the matrix: right-click a row → Drill through.',
    esenzione: 'Edit interactions: this visual must NOT react to the Quarter and Month slicers (it keeps 12 months and highlights the period).',
    viste: 'Two views in one position: stack both visuals, then two bookmarks (View → Bookmarks) that show one and hide the other (Selection pane), and two buttons that call them.',
    pos: 'position', larghezza: 'width', altezza: 'height ~',
    s5: '5. The theme', s5a: 'Save the block as theme.json and import it: View → Themes → Browse for themes. ' +
      'Category colours are the mockup’s, in the same member order.',
    promptTesta: 'Generate a synthetic but plausible dataset for a Power BI report. Reply ONLY with the requested CSV files, each in its own code block preceded by the file name, with a header row. No explanations.',
    promptFatti: 'FILE', righe: 'rows', colDate: 'first day of the month, YYYY-MM-DD',
    membri: 'MEMBERS AND CHARACTER', stag: 'SEASONALITY (monthly multipliers, January → December)',
    derivate: 'HOW COLUMNS DERIVE (always round to integers)', vincoli: 'CONSTRAINTS',
    v1: 'Every value is a non-negative integer. Detail rows add up exactly to their fact row.',
    v0: 'Key columns are integers from 1; SortOrder is the member order as listed below. Fact files use the Keys, not the names.',
    ordinamento: 'Sort ’Date’[Month] by ’Date’[MonthNo], and every dimension [Name] by [SortOrder] (Column tools → Sort by column): otherwise months come out alphabetically.',
    v2: 'Growth is yearly and compound: a member’s value in year N is base × (1 + growth)^(N − first year).',
    v3: 'Add random noise within ±5% on each row, never enough to break the ratios below.',
    v4: 'In the last year the totals must hit these ratios (±5%):',
    primaria: 'primary measure: monthly base in the first year', crescita: 'yearly growth',
    formula: { seasonal: (f) => f + ' = member base × (1 + growth)^year × month seasonality',
      share: (f, of, a, s) => f + ' = ' + of + ' × ' + a + (s ? ' (attribute of the ' + s + ')' : ''),
      divide: (f, of, a, s) => f + ' = ' + of + ' ÷ ' + a + (s ? ' (attribute of the ' + s + ')' : '') + ', at least 1',
      combine: (f, p, m) => f + ' = ' + (p || []).join(' + ') + ((m || []).length ? ' − ' + m.join(' − ') : ''),
      complemento: ' (use 1 − value)', solo: (d, ms) => ', 0 outside ' + d + ' = ' + ms.join('/') },
    vis: {
      trend: 'Line chart', colline: 'Line and clustered column chart', donut: 'Donut chart',
      hbar: 'Clustered bar chart', stack100: '100% stacked bar chart', ribbon: 'Ribbon chart',
      funnel: 'Funnel', waterfall: 'Waterfall chart', scatter: 'Scatter chart', matrix: 'Matrix', statement: 'Matrix (income statement)',
      sparkline: 'Card (new) with sparkline', narrative: 'Smart narrative / text box with dynamic values',
      gauge: 'Gauge', heatmap: 'Matrix with conditional formatting (heatmap)',
      'delta-card': 'Card (new) — change as the main value', kpi: 'Card (new)'
    },
    campi: 'Fields', impostazioni: 'Settings',
    ordina: 'Sort descending by value.', mediane: 'Analytics pane: median line on X and on Y (the four quadrants).',
    bottomn: (n) => 'Visual filters: Top N → Bottom ' + n + ' by the measure (the weakest ' + n + '); sort ascending.',
    topn: (n) => 'Visual filters: Top N = ' + n + ' by the measure; group the rest into "Other" (right-click the field → New group).',
    heatCF: (m, lo, hi) => 'Conditional formatting → Background colour on ' + m + ': gradient' + (lo !== undefined ? ' from ' + lo + ' to ' + hi : '') + '.',
    varCF: 'Conditional formatting → Icons (▲ ▼) on the change column.',
    totali: 'Row totals on.', target: (t) => 'Target value: ' + t + '.',
    linea: (m) => 'Secondary Y axis: ' + m + '.', legendaAnni: 'Legend: ’Date’[Year] (current year solid, prior year dashed).', legendaColonne: 'Legend: ’Date’[Year] (current and prior year as two columns side by side, the prior year in neutral grey: Format → Columns → series colour, never a data colour).',
    colore: (d) => 'Colour by category: legend = ' + d + ' (the same colour on every page).',
    alert: (m) => 'Highlight the "' + m + '" slice in red (data colours → conditional formatting).',
    deltaCard: (m) => 'Main value: ' + m + '; reference label: prior period → current period; add the monthly sparkline.',
    stadi: 'Create the Stages table (section 3) and use [Stage value] as value, Stages[Stage] as category.',
    narr: 'Text built from measures only: no hand-written sentences about specific numbers.'
  }
};

const linguaDi = spec => /^en/i.test((spec.meta && spec.meta.locale) || '') ? 'en' : 'it';

/* ------------------------------------------------------------------ nomi */

/** Il nome di una dimensione nel modello: l'etichetta del filtro se c'e, altrimenti l'id. */
/* le etichette delle dimensioni dei dati forniti ("Settore", "Decennio"): una dimensione senza filtro
   altrimenti si chiamava "Dim Sett" */
let ETICHETTE = {};
function nomeDim(spec, id) {
  const f = ((spec.filters && spec.filters.dims) || []).filter(d => d.id === id)[0];
  const base = f && f.label ? f.label : ETICHETTE[id] || id.charAt(0).toUpperCase() + id.slice(1);
  return 'Dim ' + base;
}

/** Il nome DAX di ogni misura: l'etichetta, resa unica. Due misure con la stessa etichetta
    in Power BI non possono esistere, e la seconda sparirebbe senza avviso. */
function nomiMisure(spec) {
  const visti = {}, out = {};
  ((spec.model && spec.model.measures) || []).forEach(m => {
    let n = String(m.label || m.id).replace(/[\[\]]/g, '');
    if (visti[n.toLowerCase()]) n = n + ' (' + m.id + ')';
    visti[n.toLowerCase()] = true;
    out[m.id] = n;
  });
  return out;
}

const q = s => "'" + String(s).replace(/'/g, "''") + "'";

/* ------------------------------------------------------------------ 2. il modello */

function modello(spec, dp) {
  const facts = (dp && dp.facts) || {};
  const dimsFatti = [facts.dim].concat(splitsOf(facts).map(sc => sc.dim)).filter(Boolean);
  const campi = (facts.fields || []).map(f => f.id);
  const tabelle = [];
  tabelle.push({ nome: 'Date', ruolo: 'calendario', colonne: ['Date', 'Year', 'Quarter', 'MonthNo', 'Month', 'YearMonth'] });
  dimsFatti.forEach(d => tabelle.push({ nome: nomeDim(spec, d), ruolo: 'dimensione', dim: d, colonne: ['Key', 'Name', 'SortOrder'] }));
  tabelle.push({ nome: 'Facts', ruolo: 'fatti', grano: dimsFatti,
    colonne: ['Date'].concat(dimsFatti.map(d => nomeDim(spec, d).replace(/^Dim /, '') + 'Key')).concat(campi) });
  const det = dp && dp.detail;
  if (det && det.dim) {
    tabelle.push({ nome: nomeDim(spec, det.dim), ruolo: 'dimensione', dim: det.dim,
      colonne: ['Key', 'Name', nomeDim(spec, det.parentDim || facts.dim).replace(/^Dim /, '') + 'Key', 'SortOrder'] });
    const gr = dimsFatti.concat([det.dim]);
    tabelle.push({ nome: 'FactsDetail', ruolo: 'dettaglio', grano: gr,
      colonne: ['Date'].concat(gr.map(d => nomeDim(spec, d).replace(/^Dim /, '') + 'Key')).concat(det.fields || [campi[0]]) });
  }
  const rel = [];
  tabelle.filter(t => t.ruolo === 'fatti' || t.ruolo === 'dettaglio').forEach(f => {
    rel.push(['Date', 'Date', f.nome, 'Date']);
    f.grano.forEach(d => rel.push([nomeDim(spec, d), 'Key', f.nome, nomeDim(spec, d).replace(/^Dim /, '') + 'Key']));
  });
  return { tabelle, rel, dimsFatti, campi };
}

/* ------------------------------------------------------------------ 3. le misure */

function misure(spec, dp) {
  const N = nomiMisure(spec);
  const perId = {};
  ((spec.model && spec.model.measures) || []).forEach(m => { perId[m.id] = m; });
  const rif = id => perId[id] ? '[' + N[id] + ']' : 'SUM ( Facts[' + id + '] )';
  const base = ((spec.model && spec.model.measures) || []).map(m => {
    let expr;
    if (m.agg === 'sum') expr = 'SUM ( Facts[' + (m.field || m.id) + '] )';
    /* una differenza fra due percentuali e in PUNTI: il valore si moltiplica per cento e il
       formato dice "pp", o Power BI stamperebbe +24,9% e il lettore capirebbe una crescita */
    else if (m.agg === 'diff') expr = m.unit === 'pp' ? '( ' + rif(m.a) + ' - ' + rif(m.b) + ' ) * 100' : rif(m.a) + ' - ' + rif(m.b);
    else if (m.agg === 'ratio') expr = 'DIVIDE ( ' + rif(m.num) + ', ' + rif(m.den) + ' )';
    else if (m.agg === 'last') {
      /* uno stock non si somma nei mesi: si legge l'ultimo mese che ha dati nel periodo */
      expr = 'CALCULATE (\n    SUM ( Facts[' + m.field + '] ),\n    LASTNONBLANK ( \'Date\'[Date], CALCULATE ( SUM ( Facts[' + m.field + '] ) ) )\n)';
    } else expr = 'BLANK ()';
    return { id: m.id, nome: N[m.id], expr, formato: formatoPbi(m) };
  });

  /* il confronto serve dove il mockup lo mostra: la banda KPI, le delta-card, le colonne var */
  const conConfronto = [];
  const aggiungi = id => { if (perId[id] && conConfronto.indexOf(id) < 0) conConfronto.push(id); };
  (spec.kpiBand || []).forEach(k => aggiungi(k.measure));
  const quote = [], bersagli = [];
  visuali(spec).forEach(({ v }) => {
    const b = v.bind || {};
    if (v.type === 'delta-card') aggiungi(b.measure);
    (b.columns || []).forEach(c => {
      if (c.kind === 'var') aggiungi(c.measure);
      if (c.kind === 'share' && quote.every(x => x.id !== c.measure || x.dim !== b.dim)) quote.push({ id: c.measure, dim: b.dim });
    });
    if (v.type === 'gauge') (b.misure || [b]).forEach(g => { if (g.target !== undefined) bersagli.push({ id: g.measure, target: g.target }); });
  });
  const tempo = [];
  conConfronto.forEach(id => {
    const m = perId[id], n = N[id], punti = inPunti(m);
    tempo.push({ nome: n + ' PY', formato: formatoPbi(m),
      expr: 'IF (\n    HASONEVALUE ( \'Date\'[MonthNo] ),\n    CALCULATE ( [' + n + '], DATEADD ( \'Date\'[Date], -1, MONTH ) ),\n    CALCULATE ( [' + n + '], SAMEPERIODLASTYEAR ( \'Date\'[Date] ) )\n)' });
    tempo.push(punti
      ? { nome: n + ' Var pp', formato: '+0.0" pp";-0.0" pp";0.0" pp"', expr: '( [' + n + '] - [' + n + ' PY] ) * 100' }
      : { nome: n + ' Var %', formato: '+0.0%;-0.0%;0.0%', expr: 'DIVIDE ( [' + n + '] - [' + n + ' PY], ABS ( [' + n + ' PY] ) )' });
  });
  const extra = [];
  quote.forEach(s => extra.push({ nome: N[s.id] + ' % ' + nomeDim(spec, s.dim).replace(/^Dim /, ''), formato: '0.0%',
    expr: 'DIVIDE ( [' + N[s.id] + '], CALCULATE ( [' + N[s.id] + '], ALLSELECTED ( ' + q(nomeDim(spec, s.dim)) + ' ) ) )' }));
  bersagli.forEach(t => extra.push({ nome: 'Target ' + N[t.id], formato: formatoPbi(perId[t.id] || {}),
    expr: typeof t.target === 'number' ? String(t.target) : rif(t.target) }));
  visuali(spec).filter(({ v }) => v.type === 'funnel').forEach(({ v }) => {
    const st = (v.bind || {}).stages || [];
    extra.push({ nome: 'Stages', tabella: true,
      expr: 'DATATABLE ( "Order", INTEGER, "Stage", STRING, {\n' + st.map((s, i) => '    { ' + (i + 1) + ', "' + String(s.label).replace(/"/g, '""') + '" }').join(',\n') + '\n} )' });
    extra.push({ nome: 'Stage value', formato: '#,0',
      expr: 'SWITCH (\n    SELECTEDVALUE ( Stages[Order] ),\n' + st.map((s, i) => '    ' + (i + 1) + ', ' + rif(s.measure)).join(',\n') + '\n)' });
  });
  /* YTD E SCOSTAMENTI DAL BUDGET (Bodan, 3 ott 2026): le card finance e il conto economico
     leggono il YTD fino al mese scelto e lo scostamento dal budget, assoluto e percentuale */
  const ytd = [], bud = [];
  const r = id => perId[id] ? '[' + N[id] + ']' : 'BLANK ()';
  const aggYtd = id => { if (perId[id] && ytd.every(x => x.id !== id)) ytd.push({ id, nome: N[id] + ' YTD', formato: formatoPbi(perId[id]), expr: "TOTALYTD ( [" + N[id] + "], 'Date'[Date] )" }); };
  const aggBud = (id, bid) => {
    if (!perId[id] || !perId[bid] || bud.some(x => x.id === id)) return;
    const n = N[id], pp = inPunti(perId[id]);
    bud.push({ id, nome: n + ' vs Budget', formato: pp ? '+0.0" pp";-0.0" pp"' : formatoPbi(perId[id]), expr: pp ? '( [' + n + '] - [' + N[bid] + '] ) * 100' : '[' + n + '] - [' + N[bid] + ']' });
    if (!pp) bud.push({ id: id + '%', nome: n + ' vs Budget %', formato: '+0.0%;-0.0%;0.0%', expr: 'DIVIDE ( [' + n + '] - [' + N[bid] + '], ABS ( [' + N[bid] + '] ) )' });
  };
  (spec.kpiBand || []).forEach(k => { if (k.ytd) { aggYtd(k.measure); if (k.budget) aggYtd(k.budget); } if (k.budget) aggBud(k.measure, k.budget); });
  visuali(spec).forEach(({ v }) => {
    const b = v.bind || {};
    (b.columns || []).filter(c => c.kind === 'bud').forEach(c => aggBud(c.measure, c.budget));
    if (v.type === 'statement') (b.lines || []).forEach(l => { aggYtd(l.measure); if (l.budget) { aggYtd(l.budget); aggBud(l.measure, l.budget); } });
  });
  ytd.concat(bud).forEach(x => extra.push(x));
  /* IL TARGET DI UNA MISURA: il valore e il colore per la formattazione condizionale (Format →
     Conditional formatting → Font color → Field value), verde dal lato giusto, rosso dall'altro */
  ((spec.model && spec.model.measures) || []).filter(m => typeof m.target === 'number').forEach(m => {
    extra.push({ nome: 'Target ' + N[m.id], formato: formatoPbi(m), expr: String(m.target) });
    extra.push({ nome: N[m.id] + ' status colour', formato: 'General',
      expr: 'IF ( [' + N[m.id] + '] ' + (m.inv ? '<=' : '>=') + ' [Target ' + N[m.id] + '], "#1E8449", "#C0392B" )' });
  });
  /* il conto economico: una tabella delle voci in ordine e una misura SWITCH per colonna, cosi i
     subtotali restano le loro misure e non si sommano mai dalle righe */
  const NL = '\n';
  const lit = t => '"' + String(t).replace(/"/g, '""') + '"';
  visuali(spec).filter(({ v }) => v.type === 'statement').slice(0, 1).forEach(({ v }) => {
    const ls = (v.bind || {}).lines || [];
    extra.push({ nome: 'P&L line', tabella: true,
      expr: 'DATATABLE ( "Sort", INTEGER, "Line", STRING, {' + NL + ls.map((l, i) => '    { ' + (i + 1) + ', ' + lit(l.label) + ' }').join(',' + NL) + NL + '} )' });
    const sw = (nome, f) => extra.push({ nome, formato: '#,0.0,"K"',
      expr: 'SWITCH (' + NL + "    SELECTEDVALUE ( 'P&L line'[Sort] )," + NL + ls.map((l, i) => '    ' + (i + 1) + ', ' + f(l)).join(',' + NL) + NL + ')' });
    sw('Line actual', l => r(l.measure));
    sw('Line budget', l => l.budget ? r(l.budget) : 'BLANK ()');
    sw('Line vs budget', l => l.budget ? '[Line actual] - [Line budget]' : 'BLANK ()');
    extra.push({ nome: 'Line vs budget %', formato: '+0.0%;-0.0%;0.0%', expr: 'DIVIDE ( [Line vs budget], ABS ( [Line budget] ) )' });
    sw('Line actual YTD', l => perId[l.measure] ? '[' + N[l.measure] + ' YTD]' : 'BLANK ()');
    sw('Line budget YTD', l => l.budget && perId[l.budget] ? '[' + N[l.budget] + ' YTD]' : 'BLANK ()');
  });
  /* il ponte di cassa: i passi come tabella, e il valore di ogni passo */
  visuali(spec).filter(({ v }) => v.type === 'waterfall' && (v.bind || {}).steps).slice(0, 1).forEach(({ v }) => {
    const b = v.bind, st = [{ label: b.startLabel || 'Opening' }].concat(b.steps, [{ label: b.endLabel || 'Closing' }]);
    extra.push({ nome: 'Cash flow step', tabella: true,
      expr: 'DATATABLE ( "Order", INTEGER, "Step", STRING, {' + NL + st.map((x, i) => '    { ' + (i + 1) + ', ' + lit(x.label || N[x.measure]) + ' }').join(',' + NL) + NL + '} )' });
    const somma = b.steps.map(x => (x.sign === -1 ? '- ' : '+ ') + r(x.measure)).join(' ');
    extra.push({ nome: 'Cash flow step value', formato: '#,0.0,"K"',
      expr: 'SWITCH (' + NL + "    SELECTEDVALUE ( 'Cash flow step'[Order] )," + NL + '    1, ' + r(b.stock) + ' - ( ' + somma + ' ),' + NL +
        b.steps.map((x, i) => '    ' + (i + 2) + ', ' + (x.sign === -1 ? '- ' : '') + r(x.measure)).join(',' + NL) + ',' + NL + '    ' + (b.steps.length + 2) + ', ' + r(b.stock) + NL + ')' });
  });
  return { base, tempo, extra, N };
}

/** Il formato di Power BI che corrisponde al formato del motore. */
let VALUTA = '€';
function formatoPbi(m) {
  const f = m.format || 'N', v = VALUTA;
  if (m.unit === 'pp' || f === 'pp') return '+0.0" pp";-0.0" pp";0.0" pp"';
  return ({ eur: v + '#,0.0,,"M";-' + v + '#,0.0,,"M"', eurF: v + '#,0', pc: '0.0%', sgp: '+0.0%;-0.0%',
    bps: '+0" bps"', N: '#,0', x: '0.0"×"', days: '#,0" d"', months: '0.0', raw: 'General',
    /* una durata: formato dinamico (Format → Dynamic) con questa espressione */
    dur: 'dynamic: VAR s = SELECTEDMEASURE() RETURN IF ( s < 60, "0\" s\"", IF ( s < 3600, FORMAT ( INT ( s / 60 ), "0" ) & ":" & FORMAT ( MOD ( s, 60 ), "00" ) & " min", FORMAT ( INT ( s / 3600 ), "0" ) & " h " & FORMAT ( INT ( MOD ( s, 3600 ) / 60 ), "00" ) ) )' })[f] || '#,0';
}

/* ------------------------------------------------------------------ 4. il front end */

function visuali(spec) {
  const out = [];
  const pagine = (spec.pages || []).concat(spec.drill && spec.drill.page ? [spec.drill.page] : []);
  pagine.forEach(pg => (pg.rows || []).forEach((row, ri) => (row.visuals || []).forEach(v => {
    if (v.viste && v.viste.length) v.viste.forEach(vi => out.push({ pg, ri, v: Object.assign({}, vi, { span: v.span }) }));
    else out.push({ pg, ri, v });
  })));
  return out;
}

const pxW = (spec, span) => {
  const g = spec.grid, col = (g.contentWidth - g.gutter * (g.columns - 1)) / g.columns;
  return Math.round(col * span + g.gutter * (span - 1));
};

function descriviVisual(spec, v, L, N) {
  const b = v.bind || {}, righe = [];
  const m = id => id ? '[' + (N[id] || id) + ']' : '';
  const dim = d => d === 'q' ? "'Date'[Quarter]" : d === 'm' ? "'Date'[Month]" : d ? q(nomeDim(spec, d)) + '[Name]' : '';
  const campi = [];
  /* un visual staccato da un filtro: in Power BI si fa con Format → Edit interactions → None */
  if (Array.isArray(b.ignoreFilters) && b.ignoreFilters.length) righe.push('Interactions: select the ' + b.ignoreFilters.map(d => d === 'date' ? '"Period" slicer' : q(nomeDim(spec, d)) + ' slicer').join(' and the ') + ', then Format → Edit interactions → None on this visual: it ' + (b.ignoreFilters.indexOf('date') >= 0 ? 'keeps every year' : 'keeps every member') + ' and ignores that filter.');
  if (b.crossFilter === false) righe.push('Interactions: select this visual, then Format → Edit interactions → None on every other visual: clicking it filters nothing; it still follows the slicers.');
  if (v.type === 'hbar' && b.parent && b.crossFilter !== false && !((spec.filters || {}).dims || []).some(f => f.id === b.dim)) righe.push('Interactions: its items are not a slicer of the report, so set Edit interactions → None from this visual to the others: it follows the slicers only.');
  switch (v.type) {
    case 'trend': if (b.grain === 'year') { campi.push("X: 'Date'[Year]", 'Y: ' + m(b.measure)); break; }
      campi.push("X: 'Date'[Month]", 'Y: ' + m(b.measure)); righe.push(L.legendaAnni, L.esenzione); break;
    case 'colline': campi.push("X: 'Date'[Month]", 'Y: ' + m(b.measure)); if (b.line) righe.push(L.linea(m(b.line))); righe.push(L.legendaColonne); break;   /* nel colline l'anno prima e una colonna, non un tratteggio */
    case 'donut': campi.push('Legend: ' + dim(b.dim), 'Values: ' + m(b.measure)); if (b.topN) righe.push(L.topn(b.topN)); if (b.alert) righe.push(L.alert(b.alert)); break;
    case 'hbar': campi.push('Y: ' + dim(b.dim), 'X: ' + m(b.measure)); if (b.order !== 'asc') righe.push(L.ordina); if (b.top) righe.push(b.order === 'asc' ? L.bottomn(b.top) : L.topn(b.top)); if (b.parent) righe.push(L.colore(dim(b.parent))); break;
    case 'stack100': campi.push('Y: ' + dim(b.dim), 'Legend: ' + dim(b.by), 'X: ' + m(b.measure)); break;
    case 'ribbon': campi.push("X: " + dim(b.by || 'q'), 'Legend: ' + dim(b.dim), 'Y: ' + m(b.measure)); break;
    case 'funnel': campi.push('Category: Stages[Stage]', 'Values: [Stage value]'); righe.push(L.stadi); break;
    case 'waterfall':
      if (b.steps) { campi.push("Category: 'Cash flow step'[Step]", 'Y: [Cash flow step value]'); righe.push(L.ponte ? L.ponte(m(b.stock), b.steps.map(x => (x.sign === -1 ? '− ' : '+ ') + m(x.measure)).join(' ')) : 'Opening = ' + m(b.stock) + ' at the end of the previous period; steps: ' + b.steps.map(x => (x.sign === -1 ? '− ' : '+ ') + m(x.measure)).join(' ') + '; closing = ' + m(b.stock) + '. Build a disconnected table of steps and a SWITCH measure, as for the funnel stages.'); }
      else campi.push('Category: ' + dim(b.dim), 'Y: ' + m(b.measure));
      break;
    case 'statement':
      campi.push("Rows: 'P&L line'[Line] → 'Account'[Account] (drill down with +/−)", (b.lines || []).some(l => l.budget) ? 'Values: [Line actual], [Line budget], [Line vs budget], [Line vs budget %] and the same four in YTD' : 'Values: [Line actual] (no budget in this report: no budget or variance columns)');
      righe.push('A disconnected table of P&L lines in order (' + (b.lines || []).map(l => l.label).join(', ') + '), sorted by a Sort column; a SWITCH measure returns, for each line, its own measure (' + (b.lines || []).map(l => m(l.measure)).join(', ') + '), so subtotals stay calculated measures and are never summed from the rows. Accounts are a child level of each line. Conditional formatting on the variance columns: red when unfavourable, green when favourable, using the line cost or revenue sign.');
      break;
    case 'scatter': campi.push('Values: ' + dim(b.dim), 'X: ' + m(b.x), 'Y: ' + m(b.y)); if (b.size) campi.push('Size: ' + m(b.size)); righe.push(L.mediane); break;
    /* il gauge multiplo in Power BI sono due o tre visual Gauge affiancati, uno per misura */
    case 'gauge': (b.misure || [b]).forEach((g, i, tutti) => {
      const pre = tutti.length > 1 ? '(' + (i + 1) + ') ' : '';
      campi.push(pre + 'Value: ' + m(g.measure));
      if (g.target !== undefined) { campi.push(pre + 'Target: [Target ' + (N[g.measure] || g.measure) + ']'); righe.push(L.target(g.target)); }
      if (g.max) campi.push(pre + 'Max: ' + g.max);
    }); break;
    case 'heatmap': campi.push('Rows: ' + dim(b.dim), 'Columns: ' + dim(b.by), 'Values: ' + m(b.measure));
      righe.push(L.heatCF(m(b.measure), b.scale && b.scale[0], b.scale && b.scale[1])); break;
    case 'delta-card': {
      const mm = ((spec.model && spec.model.measures) || []).filter(x => x.id === b.measure)[0] || {};
      const pp = inPunti(mm);
      const nomeVar = '[' + (N[b.measure] || b.measure) + (pp ? ' Var pp]' : ' Var %]');
      campi.push('Value: ' + nomeVar);
      righe.push(L.deltaCard(nomeVar), L.esenzione);
      break;
    }
    case 'sparkline': campi.push('Value: ' + m(b.measure), "Sparkline: 'Date'[Month]"); break;
    case 'narrative': righe.push(L.narr); break;
    case 'matrix': {
      campi.push('Rows: ' + dim(b.dim));
      (b.columns || []).forEach(c => {
        const nm = N[c.measure] || c.measure;
        const col = c.kind === 'bud' ? '[' + nm + (c.show === 'abs' ? ' vs Budget]' : (inPunti((spec.model.measures || []).filter(x => x.id === c.measure)[0]) ? ' vs Budget]' : ' vs Budget %]'))
          : c.kind === 'var' ? '[' + nm + (inPunti((spec.model.measures || []).filter(x => x.id === c.measure)[0]) ? ' Var pp]' : ' Var %]')
          : c.kind === 'share' ? '[' + nm + ' % ' + nomeDim(spec, b.dim).replace(/^Dim /, '') + ']' : '[' + nm + ']';
        campi.push('Values: ' + col + (c.label && !/\{/.test(c.label) ? '  → "' + c.label + '"' : ''));
        if (c.kind === 'heat') righe.push(L.heatCF('[' + nm + ']', c.scale && c.scale[0], c.scale && c.scale[1]));
      });
      if ((b.columns || []).some(c => c.kind === 'var')) righe.push(L.varCF);
      if ((b.columns || []).some(c => c.kind === 'bud')) righe.push('Budget variance columns use the measures named "<measure> vs Budget" and "<measure> vs Budget %", with red/green conditional formatting by finance logic (costs above budget are unfavourable).');
      righe.push(L.totali);
      break;
    }
    default: break;
  }
  return { campi, righe };
}

function frontEnd(spec, L, N) {
  const out = [];
  const pel = SKIN.pelleDi(spec);
  const x0 = Math.round(pel.shell.rail + (1280 - pel.shell.rail - spec.grid.contentWidth) / 2);
  out.push(L.s4a(spec.grid.contentWidth, spec.grid.gutter), '');
  out.push('### ' + L.slicer, '', '- ' + L.slicerData);
  ((spec.filters && spec.filters.dims) || []).forEach(d => out.push('- ' + L.slicerDim(d.label || d.id, nomeDim(spec, d.id), d.control)));
  out.push('', '### ' + L.banda, '');
  (spec.kpiBand || []).forEach(k => {
    const nm = N[k.measure] || k.measure;
    out.push('- **' + k.label + '** — ' + L.vis.kpi + ': [' + nm + ']; ' + L.larghezza + ' ' + pxW(spec, k.span || 1) + ' px');
  });
  const pagine = (spec.pages || []).map(p => ({ p, drill: false }))
    .concat(spec.drill && spec.drill.page ? [{ p: spec.drill.page, drill: true }] : []);
  pagine.forEach(({ p, drill }) => {
    out.push('', '### ' + (drill ? L.drill : L.pagina + ': ' + (p.title || p.id)), '');
    if (drill) out.push(L.drillA(nomeDim(spec, spec.drill.dim)), '');
    (p.rows || []).forEach((row, ri) => {
      let x = x0;
      out.push('**' + L.riga + ' ' + (ri + 1) + '**', '');
      (row.visuals || []).forEach(v => {
        const w = pxW(spec, v.span);
        const vs = v.viste && v.viste.length ? v.viste : [v];
        vs.forEach((vi, k) => {
          const d = descriviVisual(spec, vi, L, N);
          out.push('- **' + pulisciTitolo(vi.title || vi.etichetta || vi.type) + '** — ' +
            (L.vis[vi.type] || vi.type) + ' · ' + L.pos + ' x ' + x + ' px · ' + L.larghezza + ' ' + w + ' px' +
            (v.h ? ' · ' + L.altezza + (v.h + 34) + ' px' : ''));
          if (d.campi.length) out.push('  - ' + L.campi + ': ' + d.campi.join(' · '));
          d.righe.forEach(r => out.push('  - ' + r));
          if (vs.length > 1 && k === vs.length - 1) out.push('  - ' + L.viste);
        });
        x += w + spec.grid.gutter;
      });
      out.push('');
    });
  });
  return out;
}

/* ------------------------------------------------------------------ 5. il tema */

function tema(spec) {
  const pel = SKIN.pelleDi(spec), t = pel.tokens;
  const font = s => String(s || '').split(',')[0].replace(/"/g, '').trim() || 'Segoe UI';
  const solido = c => [{ color: { solid: { color: c } } }];
  return {
    name: 'Pruva · ' + pel.id.palette + ' · ' + pel.tipo.id,
    dataColors: (t.serie || []).slice(),
    background: t.card, foreground: t.ink, tableAccent: t.c2,
    good: t.good, bad: t.bad, neutral: t.muted2,
    maximum: t.heat5, center: t.heat3, minimum: t.heat1,
    textClasses: {
      callout: { fontFace: font(pel.tipo.num), color: t.ink },
      title: { fontFace: font(pel.tipo.display), color: t.ink },
      header: { fontFace: font(pel.tipo.display), color: t.ink2 },
      label: { fontFace: font(pel.tipo.ui), color: t.muted }
    },
    visualStyles: {
      '*': { '*': {
        background: [{ color: { solid: { color: t.card } }, transparency: 0 }],
        border: [{ show: true, color: { solid: { color: t.line } }, radius: Number(t.radius) || 6 }],
        dropShadow: [{ show: !!pel.densita.ombra }]
      } },
      page: { '*': { background: [{ color: { solid: { color: t.canvas } }, transparency: 0 }], outspace: solido(t.canvas) } }
    }
  };
}

/* ------------------------------------------------------------------ 1. il prompt del dataset */

function promptDataset(spec, dp, data, L) {
  const md = modello(spec, dp);
  const facts = dp.facts || {};
  const anni = dp.years || [];
  const righe = [];
  const nomeMembro = (dim, id) => ((dp.dims[dim] || {}).members || []).filter(m => m.id === id).map(m => m.n)[0] || id;
  righe.push(L.promptTesta, '');
  md.tabelle.filter(t => t.ruolo !== 'calendario').forEach(t => {
    let n = '';
    if (t.ruolo === 'fatti' || t.ruolo === 'dettaglio') {
      const det = dp.detail || {};
      const figli = det.members ? Object.keys(det.members).reduce((a, k) => a + det.members[k].length, 0) : 1;
      /* nel dettaglio il genitore non moltiplica: ogni argomento appartiene a UNA categoria */
      const per = t.grano
        .filter(d => !(t.ruolo === 'dettaglio' && d === (det.parentDim || facts.dim)))
        .map(d => d === det.dim ? figli : ((dp.dims[d] || {}).members || []).length || 1);
      n = ' — ' + (anni.length * 12 * per.reduce((a, b) => a * b, 1)).toLocaleString('en-US') + ' ' + L.righe;
    }
    righe.push(L.promptFatti + ' ' + t.nome.replace(/\s+/g, '') + '.csv' + n + ': ' + t.colonne.join(', ') +
      (t.colonne.indexOf('Date') >= 0 && t.ruolo !== 'dimensione' ? '  (Date = ' + L.colDate + ')' : ''));
  });
  righe.push('', 'Date: ' + anni[0] + '-01-01 → ' + anni[anni.length - 1] + '-12-01.', '', L.membri);
  md.dimsFatti.forEach(d => {
    righe.push('- ' + nomeDim(spec, d) + ':');
    ((dp.dims[d] || {}).members || []).forEach(m => {
      const attrs = Object.keys(m.attrs || {}).map(k => k + ' ' + (Array.isArray(m.attrs[k]) ? m.attrs[k].map(v => +(+v).toFixed(4)).join(' → ') : +(+m.attrs[k]).toFixed(4))).join(', ');
      righe.push('    ' + m.n + (d === facts.dim ? ' — ' + L.primaria + ' ' + Math.round(m.base).toLocaleString('en-US') +
        ', ' + L.crescita + ' ' + (m.growth >= 0 ? '+' : '') + Math.round((m.growth || 0) * 100) + '%' : '') +
        (splitsOf(facts).filter(sc => sc.dim === d).map(sc => ' — ' + Math.round(((sc.shares || [])[((dp.dims[d] || {}).members || []).indexOf(m)] || 0) * 100) + '%' +
          (m.growth ? ', ' + L.crescita + ' ' + (m.growth >= 0 ? '+' : '') + Math.round(m.growth * 100) + '%' : '')).join('')) +
        (attrs ? ' — ' + attrs : ''));
    });
  });
  if (dp.detail && dp.detail.members) {
    righe.push('- ' + nomeDim(spec, dp.detail.dim) + ':');
    /* un figlio puo dichiarare peso e difficolta: la GenAI che genera il dataset deve saperlo,
       o ricostruisce topic tutti uguali e il drill del report vero non dice niente */
    const figlio = x => (typeof x === 'string') ? x : x.n +
      (x.w !== undefined || x.mult ? ' (' + [x.w !== undefined ? L.peso + ' ' + x.w : null]
        .concat(Object.keys(x.mult || {}).map(k => k + ' ×' + x.mult[k] + ' ' + L.piuDi)).filter(Boolean).join(', ') + ')' : '');
    Object.keys(dp.detail.members).forEach(p => righe.push('    ' + nomeMembro(dp.detail.parentDim || facts.dim, p) + ': ' + dp.detail.members[p].map(figlio).join(', ')));
  }
  if (dp.seasonality) righe.push('', L.stag + ': ' + dp.seasonality.join(', '));
  righe.push('', L.derivate);
  (facts.fields || []).forEach(f => {
    const dimAttr = f.attrFrom === 'split' ? (splitsOf(facts)[0] || {}).dim : (f.attrFrom && f.attrFrom !== facts.dim ? f.attrFrom : null);
    const sp = dimAttr ? nomeDim(spec, dimAttr).replace(/^Dim /, '') : null;
    let s = f.kind === 'seasonal' ? L.formula.seasonal(f.id)
      : f.kind === 'share' ? L.formula.share(f.id, f.of, f.attr, sp) + (f.complement ? L.formula.complemento : '')
        : f.kind === 'divide' ? L.formula.divide(f.id, f.of, f.attr, sp)
          : f.kind === 'combine' ? L.formula.combine(f.id, f.plus, f.minus) : f.id;
    if (f.only && f.only.dim) s += L.formula.solo(f.only.dim, f.only.members || []);
    righe.push('- ' + s);
  });
  righe.push('', L.vincoli, '- ' + L.v1, '- ' + L.v0, '- ' + L.v2, '- ' + L.v3);
  const ancore = ancoreDaDati(spec, data);
  if (ancore.length) { righe.push('- ' + L.v4); ancore.forEach(a => righe.push('    ' + a)); }
  return righe.join('\n');
}

/** I rapporti che il mockup mostra davvero nell'ultimo anno: sono il bersaglio del dataset. */
function ancoreDaDati(spec, data) {
  if (!data || !data.facts) return [];
  const cols = data.facts.cols, iy = cols.indexOf('y');
  const ultimo = data.years[data.years.length - 1];
  const tot = {};
  data.facts.rows.forEach(r => { if (r[iy] !== ultimo) return; cols.forEach((c, i) => { if (typeof r[i] === 'number') tot[c] = (tot[c] || 0) + r[i]; }); });
  const N = nomiMisure(spec);
  return ((spec.model && spec.model.measures) || []).filter(m => m.agg === 'ratio' && tot[m.num] !== undefined && tot[m.den]).map(m => {
    const v = tot[m.num] / tot[m.den];
    const s = m.unit === 'pct' || m.format === 'pc' ? (v * 100).toFixed(1) + '%' : (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2));
    return N[m.id] + ' = ' + m.num + ' / ' + m.den + ' ≈ ' + s;
  });
}

/* ------------------------------------------------------------------ il CSV del mockup */

/** I fatti del mockup in un CSV denormalizzato, pronto per Recupera dati → Testo/CSV. */
function csv(spec, data) {
  if (!data || !data.facts) return '';
  const cols = data.facts.cols;
  const dimCols = cols.filter(c => data.dims[c]);
  const numCols = cols.filter(c => c !== 'y' && c !== 'm' && !data.dims[c]);
  const esc = s => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
  const testa = ['Date'].concat(dimCols.map(d => nomeDim(spec, d).replace(/^Dim /, ''))).concat(numCols);
  const righe = data.facts.rows.map(r => {
    const get = c => r[cols.indexOf(c)];
    const data0 = get('y') + '-' + String(get('m') + 1).padStart(2, '0') + '-01';
    return [data0].concat(dimCols.map(d => ((data.dims[d] || [])[get(d)] || {}).n || '')).concat(numCols.map(get)).map(esc).join(',');
  });
  return testa.map(esc).join(',') + '\n' + righe.join('\n') + '\n';
}

/* ------------------------------------------------------------------ il kit intero */

function kit(spec, dataParams, data) {
  /* con i dati forniti non c'e un generatore: il modello del kit si ricava dalle colonne dei fatti */
  if (data && data.facts && (data.fonte || !(dataParams && dataParams.dims))) {
    const cols = data.facts.cols, dimsF = cols.filter(c => data.dims[c]);
    dataParams = { years: data.years, facts: { dim: dimsF[0], split: dimsF.slice(1).map(d => ({ dim: d })),
      fields: cols.filter(c => c !== 'y' && c !== 'm' && !data.dims[c]).map(id => ({ id })) } };
    if (!data.fonte) data = Object.assign({}, data, { fonte: null });
  }
  const lang = linguaDi(spec), L0 = T[lang];
  ETICHETTE = (data && data.etichette) || {};
  VALUTA = (spec.meta && spec.meta.currency) || '€';
  /* dati forniti e annuali: niente "dataset da generare" ne "grano mensile" */
  const annualeA = !!(data && Array.isArray(data.mensili) && !data.mensili.length);
  const L = Object.assign({}, L0, (data && data.fonte) || annualeA ? {
    intro: t => L0.intro(t).replace('il dataset da generare', 'il dataset').replace('the dataset to generate', 'the dataset'),
    s2a: annualeA ? L0.s2a.replace('al grano mensile', 'al grano annuale').replace('at monthly grain', 'at annual grain') : L0.s2a
  } : {});
  const md = modello(spec, dataParams || {});
  const ms = misure(spec, dataParams || {});
  const titolo = (spec.meta && spec.meta.title) || 'Report';
  const out = ['# ' + L.titolo + ' — ' + titolo, '', L.intro(titolo), ''];
  /* I DATI FORNITI (engine/dati-forniti.js) non hanno un generatore da descrivere: il kit diceva "genera
     un dataset sintetico… 0 righe… undefined-01-01" (Nicola v3, 20 ott 2026). Si importa il CSV. */
  const fornito = !!(data && data.facts) && !(dataParams && dataParams.dims);
  const annuale = !!(data && Array.isArray(data.mensili) && !data.mensili.length);
  if (fornito && data && data.facts) {
    out.push('## ' + L.s1f, '', L.s1fa(data.fonte, data.facts.rows.length, data.facts.cols.filter(c => c !== 'm').map(c => c === 'y' ? 'Date' : c).join(', '), annuale), '');
  } else out.push('## ' + L.s1, '', L.s1a, '', '```text', promptDataset(spec, dataParams || {}, data, L), '```', '');

  out.push('## ' + L.s2, '', L.s2a, '', '| ' + L.tabella + ' | ' + L.ruolo + ' | ' + L.colonne + ' |', '|---|---|---|');
  md.tabelle.forEach(t => {
    const ruolo = t.ruolo === 'fatti' ? (annuale ? L.fattiAnno : L.fatti) + ' ' + t.grano.map(d => nomeDim(spec, d).replace(/^Dim /, '')).join(' × ')
      : t.ruolo === 'dettaglio' ? L.dettaglio + ' ' + t.grano.map(d => nomeDim(spec, d).replace(/^Dim /, '')).join(' × ')
        : t.ruolo === 'calendario' ? L.calendario : L.dimensione;
    out.push('| ' + t.nome + ' | ' + ruolo + ' | ' + t.colonne.join(', ') + ' |');
  });
  const anni = (dataParams && dataParams.years) || (data && data.years) || [];
  out.push('', '```dax', 'Date =', 'ADDCOLUMNS (', '    CALENDAR ( DATE ( ' + anni[0] + ', 1, 1 ), DATE ( ' + anni[anni.length - 1] + ', 12, 31 ) ),',
    '    "Year", YEAR ( [Date] ),', '    "Quarter", "Q" & QUARTER ( [Date] ),', '    "MonthNo", MONTH ( [Date] ),',
    '    "Month", FORMAT ( [Date], "MMM" ),', '    "YearMonth", FORMAT ( [Date], "YYYY-MM" )', ')', '```', '', L.ordinamento, '');
  out.push('**' + L.relazioni + '**', '');
  md.rel.forEach(r => out.push('- ' + q(r[0]) + '[' + r[1] + '] 1 → * ' + q(r[2]) + '[' + r[3] + ']'));
  out.push('');

  out.push('## ' + L.s3, '', L.s3a, '', '### ' + L.base, '', '```dax');
  ms.base.forEach(m => out.push(m.nome + ' =\n' + indenta(m.expr), '-- format: ' + m.formato, ''));
  out.push('```', '');
  if (ms.tempo.length) {
    out.push('### ' + L.tempo, '', L.tempoA, '', '```dax');
    ms.tempo.forEach(m => out.push(m.nome + ' =\n' + indenta(m.expr), '-- format: ' + m.formato, ''));
    out.push('```', '');
  }
  if (ms.extra.length) {
    out.push('### ' + L.quote, '', '```dax');
    ms.extra.forEach(m => out.push(m.nome + ' =\n' + indenta(m.expr), m.formato ? '-- format: ' + m.formato : '', ''));
    out.push('```', '');
  }

  out.push('## ' + L.s4, '');
  frontEnd(spec, L, ms.N).forEach(r => out.push(r));

  out.push('## ' + L.s5, '', L.s5a, '', '```json', JSON.stringify(tema(spec), null, 2), '```', '');
  return out.join('\n');
}

/* I titoli del mockup portano segnaposto ({y}, {py}, {period}) che in Power BI non esistono:
   si tolgono insieme ai separatori che restano appesi, "Ricavi — 2025 vs 2024" -> "Ricavi". */
const pulisciTitolo = s => String(s)
  .replace(/\s*[—·-]?\s*\{y\}\s*vs\s*\{py\}/g, '')
  .replace(/\{[a-z]+\}/g, '')
  .replace(/(\s*[—·-]\s*)+$/, '')
  .replace(/\s{2,}/g, ' ').trim();

const indenta = s => String(s).split('\n').map(r => '    ' + r).join('\n');

module.exports = { kit, tema, csv, modello, misure, visuali, T, nomiMisure };
