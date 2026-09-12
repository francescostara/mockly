/* L'ALBERO DELLE DOMANDE — un mockup intero senza scrivere una frase.
 *
 * A cosa serve. Oggi un report nasce da un brief in linguaggio naturale che un modello legge e
 * traduce in una spec: costa crediti, e soprattutto costa GIUDIZIO — due brief uguali possono
 * dare due report diversi. Questo file e la strada opposta: una sequenza di domande a risposta
 * chiusa (scelta, numero, si/no) che porta esattamente alla stessa spec, in modo deterministico
 * e senza chiamare nessun modello. Stesse risposte, stesso mockup, byte per byte.
 *
 * COME E FATTO L'ALBERO. Non e un modulo: le domande dipendono le une dalle altre. Ognuna
 * dichiara `quando`, una condizione sulle risposte gia date; `prossima()` restituisce la prima
 * domanda applicabile ancora senza risposta. Cosi la seconda domanda cambia in base alla prima
 * — se scegli il funnel ti chiedo quante trattative chiudi, se scegli l'operativo ti chiedo
 * quante transazioni al giorno — e non si chiede mai qualcosa che le risposte precedenti
 * rendono inutile.
 *
 * PERCHE LE RISPOSTE SONO CHIUSE. Una domanda aperta rimanda il problema: qualcuno dovra pur
 * interpretarla. Una domanda chiusa e gia una decisione presa, e l'insieme delle risposte e un
 * oggetto JSON che si puo salvare, ripetere, diffare. Le uniche due risposte libere sono il
 * nome dell'azienda e quello del report, che sono etichette, non descrizioni.
 *
 * DA DOVE VIENE IL MOCKUP. Non si compone una spec da zero: si parte dallo SCHELETRO
 * dell'archetipo scelto (engine/templates/), che e gia una composizione valida e passata dai
 * gate, e lo si veste con le risposte — il vocabolario della nicchia, la scala delle
 * volumetrie, gli anni di storia, la pelle. Comporre da zero significherebbe reinventare a
 * ogni intervista le regole che gli scheletri gia incarnano.
 *
 * LA REGOLA DELLE VOLUMETRIE. Il numero che l'utente dichiara e la SCALA, non un'indicazione:
 * si genera, si misura quanto e venuto, e si riscala perche il totale dell'ultimo anno sia
 * quello dichiarato. Fissare il rapporto e derivare la conta e la stessa regola delle ancore
 * di grandezza (skill/references/niches.md), applicata all'ingresso invece che in revisione.
 */
'use strict';

const templates = require('./templates/index.js');
const builder = require('./data-builder.js');
const catalogo = require('./catalogo.js');
const SKIN = require('./skin.js');
/* render.js richiede questo file? No — ma questo richiede render.js, e caricarlo in cima
   creerebbe un anello se un giorno il verso si invertisse. Si prende quando serve. */
const RENDER = () => require('./render.js');

/* Il tetto del file spedito. E' lo stesso numero che i gate verificano: qui serve a scegliere,
   non a bocciare, ma deve essere lo stesso o l'intervista consegnerebbe mockup che il ciclo
   poi rifiuta. */
const TETTO = 75 * 1024;

/* ------------------------------------------------------------------ il vocabolario per nicchia
 * Ogni nicchia porta due modi di dividere il business — quasi sempre "da dove arriva" e "che
 * cosa e" — perche la dimensione principale e la scelta che cambia di piu la faccia del report,
 * e va chiesta invece che indovinata. I nomi sono quelli che si usano nel mestiere: e la
 * differenza fra un mockup che parla la lingua del cliente e uno che dice "Categoria A".
 */
const NICCHIE = {
  retail: {
    archetipi: ['operational', 'quadrants', 'executive-summary'],
    parole: { 'Soci attivi': 'Clienti serviti', 'Soci-mese': 'Clienti-mese', 'Soci': 'Clienti', 'socio': 'cliente', 'Presenze': 'Scontrini', 'presenze': 'scontrini', 'Posti disponibili': 'Capacita di cassa', 'Club Aurora': 'La rete', 'club': 'rete', 'sale': 'punti vendita' },
    nome: 'Retail fisico', valuta: '€', misura: 'fatturato', unita: 'money',
    palette: ['navy-corporate', 'slate-freddo', 'carta-inchiostro'],
    dimensioni: {
      punti: { label: 'Punto vendita', plurale: 'Punti vendita', membri: ['Centro', 'Nord', 'Outlet', 'Stazione', 'Sud', 'Aeroporto'] },
      reparti: { label: 'Reparto', plurale: 'Reparti', membri: ['Alimentari', 'Casa', 'Abbigliamento', 'Elettronica', 'Bellezza', 'Giardino'] }
    }
  },
  'b2b-sales': {
    archetipi: ['funnel', 'quadrants', 'executive-summary'],
    parole: { 'Northwind Cloud': 'Il portafoglio', 'Clienti-mese': 'Clienti-mese' },
    nome: 'Vendite B2B', valuta: '€', misura: 'valore contrattualizzato', unita: 'money',
    palette: ['slate-freddo', 'navy-corporate', 'blu-ghiaccio'],
    dimensioni: {
      fonti: { label: 'Fonte', plurale: 'Fonti', membri: ['Fiere', 'Ads', 'Outbound', 'Referral', 'Partner', 'Inbound'] },
      segmenti: { label: 'Segmento', plurale: 'Segmenti', membri: ['Enterprise', 'Mid-market', 'SMB', 'Pubblica amm.', 'Startup', 'Estero'] }
    }
  },
  saas: {
    archetipi: ['executive-summary', 'funnel', 'quadrants'],
    parole: { 'Northwind Cloud': 'La piattaforma' },
    nome: 'SaaS / abbonamenti', valuta: '€', misura: 'ricavo ricorrente annuo', unita: 'money',
    palette: ['blu-ghiaccio', 'slate-freddo', 'dark-tecnico'],
    dimensioni: {
      piani: { label: 'Piano', plurale: 'Piani', membri: ['Enterprise', 'Pro', 'Standard', 'Starter', 'Free', 'Legacy'] },
      canali: { label: 'Canale', plurale: 'Canali', membri: ['Diretto', 'Self-serve', 'Partner', 'Marketplace', 'Rivenditori', 'Referral'] }
    }
  },
  ristorazione: {
    archetipi: ['operational', 'quadrants'],
    parole: { 'Soci attivi': 'Clienti serviti', 'Soci-mese': 'Clienti-mese', 'Soci': 'Clienti', 'socio': 'coperto', 'Presenze': 'Coperti', 'presenze': 'coperti', 'Posti disponibili': 'Coperti disponibili', 'Club Aurora': 'I locali', 'club': 'insegna', 'sale': 'sale' },
    nome: 'Ristorazione / F&B', valuta: '€', misura: 'incasso', unita: 'money',
    palette: ['salvia', 'carta-inchiostro', 'terracotta'],
    dimensioni: {
      locali: { label: 'Locale', plurale: 'Locali', membri: ['Centro', 'Navigli', 'Stazione', 'Fiera', 'Lago', 'Porto'] },
      servizi: { label: 'Servizio', plurale: 'Servizi', membri: ['Sala', 'Asporto', 'Delivery', 'Banqueting', 'Colazioni', 'Bar'] }
    }
  },
  palestre: {
    archetipi: ['operational', 'executive-summary', 'quadrants'],
    parole: {},
    nome: 'Palestre / fitness', valuta: '€', misura: 'ricavo da abbonamenti', unita: 'money',
    palette: ['salvia', 'slate-freddo', 'carta-inchiostro'],
    dimensioni: {
      corsi: { label: 'Corso', plurale: 'Corsi', membri: ['Sala pesi', 'Spinning', 'Functional', 'Yoga', 'Nuoto', 'Pilates'] },
      sedi: { label: 'Sede', plurale: 'Sedi', membri: ['Centro', 'Nord', 'Sud', 'Est', 'Ovest', 'Universita'] }
    }
  },
  ecommerce: {
    archetipi: ['funnel', 'quadrants', 'operational'],
    parole: { 'Soci attivi': 'Clienti attivi', 'Soci-mese': 'Clienti-mese', 'Soci': 'Clienti', 'socio': 'cliente', 'Presenze': 'Ordini', 'presenze': 'ordini', 'Posti disponibili': 'Capacita di evasione', 'Club Aurora': 'Il negozio online', 'club': 'negozio', 'sale': 'categorie' },
    nome: 'E-commerce', valuta: '€', misura: 'fatturato online', unita: 'money',
    palette: ['navy-corporate', 'dark-agency', 'blu-ghiaccio'],
    dimensioni: {
      categorie: { label: 'Categoria', plurale: 'Categorie', membri: ['Abbigliamento', 'Accessori', 'Calzature', 'Beauty', 'Casa', 'Sport'] },
      canali: { label: 'Canale', plurale: 'Canali', membri: ['Organico', 'Paid search', 'Social', 'Email', 'Marketplace', 'Diretto'] }
    }
  },
  immobiliare: {
    archetipi: ['funnel', 'quadrants'],
    parole: { 'Northwind Cloud': 'Il portafoglio' },
    nome: 'Immobiliare', valuta: '€', misura: 'valore transato', unita: 'money',
    palette: ['carta-inchiostro', 'slate-freddo', 'navy-corporate'],
    dimensioni: {
      zone: { label: 'Zona', plurale: 'Zone', membri: ['Centro', 'Semicentro', 'Periferia', 'Hinterland', 'Lago', 'Collina'] },
      tipologie: { label: 'Tipologia', plurale: 'Tipologie', membri: ['Bilocali', 'Trilocali', 'Ville', 'Uffici', 'Negozi', 'Box'] }
    }
  },
  logistica: {
    archetipi: ['operational', 'quadrants'],
    parole: { 'Soci attivi': 'Clienti serviti', 'Soci-mese': 'Clienti-mese', 'Soci': 'Clienti', 'socio': 'cliente', 'Presenze': 'Spedizioni', 'presenze': 'spedizioni', 'Posti disponibili': 'Capacita di carico', 'Club Aurora': 'La rete', 'club': 'rete', 'sale': 'tratte' },
    nome: 'Logistica / trasporti', valuta: '€', misura: 'ricavo da trasporto', unita: 'money',
    palette: ['dark-tecnico', 'slate-freddo', 'navy-corporate'],
    dimensioni: {
      tratte: { label: 'Tratta', plurale: 'Tratte', membri: ['Nord-Sud', 'Nord-Est', 'Centro', 'Isole', 'Estero', 'Urbano'] },
      clienti: { label: 'Cliente', plurale: 'Clienti', membri: ['Grande distr.', 'Industria', 'E-commerce', 'Farmaceutico', 'Automotive', 'Food'] }
    }
  }
};

/* ------------------------------------------------------------------ le domande
 * `tipo` dice all'interfaccia che controllo mostrare: `scelta` un elenco di bottoni, `numero`
 * un campo numerico con minimo e massimo, `testo` una riga (solo per i nomi propri).
 * `perche` non e decorazione: e cio che rende la domanda rispondibile da chi non sa come e
 * fatto un report — dice a cosa servira la risposta.
 */
/*
 * LE DUE ANCORE DI OGNI ARCHETIPO.
 *
 * Un numero solo non basta a tenere in piedi un report: "nove milioni" applicato al campo
 * sbagliato produce nove milioni di LEAD e un valore medio da ventimila euro a contratto, cioe
 * lo stesso genere di assurdita che le ancore di grandezza esistono per impedire (scontrino
 * medio da 24 centesimi, CPM da mezzo centesimo). Servono due numeri e due leve:
 *
 *   `base`  la scala di tutti i membri, che muove la misura PRIMARIA dello scheletro;
 *   `attr`  un attributo dei membri — il valore medio di un contratto, il ricavo per cliente,
 *           lo scontrino — che muove la seconda grandezza SENZA toccare la prima.
 *
 * Con le due leve il rapporto fra le due risposte diventa esatto: se dichiari nove milioni di
 * valore e trecentoventi contratti, il valore medio che il report stampa e 28.125 euro, e non
 * un numero che capita. E' la regola "fissa il rapporto, deriva la conta" applicata
 * all'ingresso invece che in revisione.
 *
 * `verso: -1` per gli attributi che stanno al DENOMINATORE (clienti = ricavo / arpa): alzarli
 * abbassa la conta, quindi il fattore va rovesciato.
 * `stock: true` per le grandezze che non si sommano nei mesi — i clienti attivi a fine anno
 * sono l'ultimo mese, non la somma di dodici.
 */
const ARCHETIPI = {
  'executive-summary': {
    template: 'canonical-executive-summary',
    domanda: 'Com’e andato il periodo, e dove si e rotto qualcosa?',
    quando: 'per il consiglio, la proprieta, la direzione — si legge in trenta secondi',
    dimTesti: { sing: 'Piano', plur: 'Piani' },
    scala: {
      base: { campo: 'mrr', risposta: 'volume' },
      attr: { nome: 'arpa', campo: 'clienti', risposta: 'clienti', verso: -1, stock: true }
    }
  },
  funnel: {
    template: 'canonical-funnel',
    domanda: 'Dove perdo le persone lungo il percorso?',
    quando: 'quando c’e un imbuto: lead che diventano clienti, visite che diventano ordini',
    dimTesti: { sing: 'Fonte', plur: 'Fonti' },
    /* qui la leva della base porta la CONTA (le trattative vinte) e l'attributo porta il
       VALORE: e l'imbuto a decidere quante ne chiudi, il deal medio a decidere quanto valgono */
    scala: {
      base: { campo: 'vinte', risposta: 'trattative' },
      attr: { nome: 'deal', campo: 'valore', risposta: 'volume', verso: 1 }
    }
  },
  quadrants: {
    template: 'canonical-quadrants',
    domanda: 'Chi sono i miei migliori e chi mi sta costando?',
    quando: 'quando la domanda e un confronto fra entita: clienti, prodotti, sedi',
    dimTesti: { sing: 'Cliente', plur: 'Clienti' },
    scala: {
      base: { campo: 'ricavi', risposta: 'volume' },
      attr: { nome: 'prezzo', campo: 'unita', risposta: 'unita', verso: -1 }
    }
  },
  operational: {
    template: 'canonical-operational',
    domanda: 'Come sta andando adesso, giorno per giorno?',
    quando: 'per chi lavora dentro l’operativo e guarda il report ogni mattina',
    dimTesti: { sing: 'Corso', plur: 'Corsi' },
    scala: {
      base: { campo: 'ricavi', risposta: 'volume' },
      /* la risposta e al giorno, il dato e annuo: trecentosessantacinque volte */
      attr: { nome: 'prezzo', campo: 'presenze', risposta: 'transazioni', verso: -1, fattore: 365 }
    }
  }
};

const ALBERO = [
  {
    id: 'nicchia', tipo: 'scelta',
    testo: 'Di che mestiere parla il report?',
    perche: 'decide il vocabolario: i nomi delle voci, la valuta, le palette proponibili',
    opzioni: Object.keys(NICCHIE).map(k => ({ v: k, testo: NICCHIE[k].nome }))
  },
  {
    id: 'archetipo', tipo: 'scelta',
    quando: r => !!NICCHIE[r.nicchia],
    testo: 'Qual e LA domanda a cui il report deve rispondere?',
    perche: 'e la scelta che decide la composizione della pagina: cosa apre, cosa chiude',
    /* Non tutti gli archetipi stanno bene a tutti i mestieri, e non per gusto: lo scheletro
       della sintesi direzionale e costruito attorno al ricavo RICORRENTE (MRR, churn, NRR), che
       in un'osteria non esiste; quello operativo ragiona per capacita e riempimento, che in una
       pipeline B2B non vogliono dire niente. Proporre la combinazione sbagliata produrrebbe un
       report che parla di cose che il cliente non ha — il difetto piu difficile da correggere
       dopo, perche non e un numero storto ma un discorso storto. */
    opzioni: r => (NICCHIE[r.nicchia].archetipi || Object.keys(ARCHETIPI))
      .map(k => ({ v: k, testo: ARCHETIPI[k].domanda, aiuto: ARCHETIPI[k].quando }))
  },
  {
    id: 'dimensione', tipo: 'scelta',
    /* Dipende dalla nicchia, quindi non esiste finche la nicchia non c'e. Il guardiano non e
       una cautela: senza, l'elenco delle domande da fare andrebbe costruito leggendo una
       risposta che non e ancora stata data. */
    quando: r => !!NICCHIE[r.nicchia],
    testo: 'Come si divide il business, nel modo in cui ne parlate voi?',
    perche: 'e la dimensione principale: quella per cui si filtra e su cui si spezzano i grafici',
    opzioni: r => Object.keys(NICCHIE[r.nicchia].dimensioni).map(k => ({
      v: k, testo: NICCHIE[r.nicchia].dimensioni[k].label,
      aiuto: NICCHIE[r.nicchia].dimensioni[k].membri.slice(0, 4).join(', ') + '…'
    }))
  },
  {
    id: 'quante', tipo: 'numero', min: 3, max: 6, passo: 1, suggerito: 4,
    testo: 'Quante voci ha questa divisione?',
    perche: 'sopra le sei un elenco diventa illeggibile e il filtro passa a tendina',
    unita: 'voci'
  },
  {
    id: 'volume', tipo: 'numero', min: 1000, max: 2000000000, passo: 1000, suggerito: 12000000,
    quando: r => !!NICCHIE[r.nicchia],
    testo: r => 'Quanto vale il ' + NICCHIE[r.nicchia].misura + ' dell’ultimo anno?',
    perche: 'e la SCALA di tutto il resto: i numeri generati vengono riscalati su questo totale, ' +
      'cosi i rapporti derivati (scontrino, valore medio, costo per unita) cadono nell’ordine di grandezza giusto',
    unita: r => NICCHIE[r.nicchia].valuta
  },
  {
    id: 'trattative', tipo: 'numero', min: 10, max: 100000, passo: 10, suggerito: 320,
    quando: r => r.archetipo === 'funnel',
    testo: 'Quante trattative chiudete in un anno?',
    perche: 'insieme al valore fissa il deal medio: e l’ancora che tiene il funnel dentro numeri veri',
    unita: 'contratti'
  },
  {
    id: 'clienti', tipo: 'numero', min: 10, max: 5000000, passo: 10, suggerito: 4800,
    quando: r => r.archetipo === 'executive-summary',
    testo: 'Quanti clienti attivi avete oggi?',
    perche: 'insieme al ricavo fissa il ricavo per cliente, il rapporto che da solo rende ' +
      'credibile o assurdo tutto il resto',
    unita: 'clienti'
  },
  {
    id: 'unita', tipo: 'numero', min: 10, max: 50000000, passo: 10, suggerito: 26000,
    quando: r => r.archetipo === 'quadrants',
    testo: 'Quante unita vendete in un anno?',
    perche: 'insieme al ricavo fissa il prezzo medio: e il numero che dice se stai vendendo ' +
      'pochi pezzi cari o tanti pezzi economici, e cambia tutta la lettura',
    unita: 'pezzi / ordini'
  },
  {
    id: 'transazioni', tipo: 'numero', min: 5, max: 200000, passo: 5, suggerito: 260,
    quando: r => r.archetipo === 'operational',
    testo: 'Quante transazioni al giorno, in media?',
    perche: 'un report operativo vive di conte giornaliere: da qui si deriva lo scontrino medio',
    unita: 'al giorno'
  },
  {
    id: 'storia', tipo: 'numero', min: 2, max: 12, passo: 1, suggerito: 3,
    testo: 'Quanti anni di storia avete?',
    perche: 'da tre anni in su il report guadagna il selettore "Quanti anni", che permette di ' +
      'guardarne piu di uno insieme. Gli anni oltre i piu recenti restano a grana annuale, per non gonfiare il file',
    unita: 'anni'
  },
  {
    id: 'apertura', tipo: 'scelta',
    quando: r => Number(r.storia) > 2,
    testo: 'Aprendo il report, quanti anni si vedono?',
    perche: 'l’apertura e la risposta di default: un anno e la scelta normale, di piu solo se il ' +
      'confronto pluriennale E la domanda',
    opzioni: r => {
      const n = Number(r.storia);
      const o = [{ v: 1, testo: 'Un anno (consigliato)' }];
      if (n >= 3) o.push({ v: 3, testo: 'Tre anni' });
      if (n >= 5) o.push({ v: 5, testo: 'Cinque anni' });
      return o;
    }
  },
  {
    id: 'stagione', tipo: 'scelta',
    testo: 'Il vostro anno ha una stagionalita marcata?',
    perche: 'una stagionalita finta e uno dei modi piu rapidi per far sembrare un mockup inventato',
    opzioni: [
      { v: 'piatta', testo: 'No, il lavoro e distribuito', aiuto: 'B2B, servizi, abbonamenti' },
      { v: 'natale', testo: 'Si, con il picco a fine anno', aiuto: 'retail, e-commerce, regali' },
      { v: 'estate', testo: 'Si, con il picco d’estate', aiuto: 'turismo, ristorazione, gelaterie' },
      { v: 'rientro', testo: 'Si, a settembre e gennaio', aiuto: 'palestre, scuole, corsi' }
    ]
  },
  {
    id: 'pelle', tipo: 'scelta',
    quando: r => !!NICCHIE[r.nicchia],
    testo: 'Che faccia deve avere?',
    perche: 'la pelle non cambia i numeri: cambia a chi somiglia il report',
    opzioni: r => {
      const nic = NICCHIE[r.nicchia];
      const pres = catalogo.PRESET_APPROVATI
        .filter(p => !p.nicchie || !p.nicchie.length || p.nicchie.indexOf(r.nicchia) >= 0 ||
          nic.palette.indexOf(p.skin.palette) >= 0)
        .slice(0, 5)
        .map(p => ({ v: p.id, testo: p.nome, aiuto: p.skin.palette + ' · ' + p.skin.tipografia }));
      pres.push({ v: '__auto', testo: 'Scegli tu, per la nicchia', aiuto: 'la prima palette consigliata per questo mestiere' });
      return pres;
    }
  },
  {
    id: 'azienda', tipo: 'testo', max: 28,
    testo: 'Come si chiama l’azienda?',
    perche: 'finisce nel marchio in alto a sinistra: e la prima cosa che il cliente riconosce',
    suggerito: 'Acme'
  },
  {
    id: 'lingua', tipo: 'scelta',
    testo: 'In che lingua?',
    perche: 'cambia le etichette del motore, i mesi e il formato dei numeri',
    opzioni: [{ v: 'it', testo: 'Italiano' }, { v: 'en', testo: 'English' }]
  }
];

/** Il valore di un campo che puo essere una funzione delle risposte gia date.
    Se la funzione inciampa su una risposta che non c'e, il campo resta vuoto invece di far
    cadere tutto: e una domanda che non andava ancora mostrata, non un guasto. */
const risolvi = (x, r) => {
  if (typeof x !== 'function') return x;
  try { return x(r); } catch (e) { return undefined; }
};

/** La domanda applicabile che non ha ancora risposta, o null se l'intervista e finita. */
function prossima(risposte) {
  const r = risposte || {};
  for (let i = 0; i < ALBERO.length; i++) {
    const d = ALBERO[i];
    if (d.quando && !d.quando(r)) continue;
    if (r[d.id] === undefined || r[d.id] === null || r[d.id] === '') return vestita(d, r);
  }
  return null;
}

/** La domanda con i campi dinamici gia risolti: e cio che l'interfaccia mostra. */
function vestita(d, r) {
  return Object.assign({}, d, {
    testo: risolvi(d.testo, r),
    unita: risolvi(d.unita, r),
    opzioni: d.opzioni ? risolvi(d.opzioni, r) : undefined
  });
}

/** Tutte le domande applicabili date le risposte: serve a mostrare a che punto si e. */
function percorso(risposte) {
  const r = risposte || {};
  return ALBERO.filter(d => !d.quando || d.quando(r)).map(d => vestita(d, r));
}

const completa = risposte => prossima(risposte) === null;

/* ------------------------------------------------------------------ dalle risposte al mockup */

const STAGIONI = {
  piatta: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  natale: [0.82, 0.80, 0.88, 0.92, 0.96, 0.98, 0.90, 0.70, 1.02, 1.14, 1.34, 1.54],
  estate: [0.74, 0.72, 0.84, 0.94, 1.08, 1.24, 1.42, 1.46, 1.10, 0.90, 0.80, 0.76],
  rientro: [1.22, 1.06, 0.98, 0.94, 0.90, 0.78, 0.62, 0.58, 1.36, 1.18, 1.08, 1.30]
};

/* Una distribuzione con una testa e una coda, invece di fette uguali. Le fette uguali sono il
   segno piu riconoscibile del dato inventato: in nessuna azienda i quattro canali fanno il 25%
   a testa. La forma e sempre la stessa a parita di conta, quindi il render resta deterministico. */
function quote(n) {
  const grezze = [];
  for (let i = 0; i < n; i++) grezze.push(Math.pow(0.68, i) + 0.06);
  const tot = grezze.reduce((a, x) => a + x, 0);
  return grezze.map(x => x / tot);
}

const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '').slice(0, 8) || 'v';

/**
 * Quanto vale un campo nell'ultimo anno, misurato sul dato generato DAVVERO.
 *
 * Non si stima: si genera, si guarda, si corregge. Stimare vorrebbe dire rifare a mano i conti
 * del generatore (stagionalita, jitter, riconciliazione IPF) e sbagliarli in modo diverso ogni
 * volta che il generatore cambia.
 *
 * `stock` per le grandezze che non si sommano: i clienti attivi non sono la somma dei dodici
 * mesi, sono l'ultimo mese. Sommarli darebbe dodici volte il numero vero, ed e esattamente il
 * genere di errore che nessuno nota finche non lo cerca.
 */
function totaleUltimoAnno(dp, campo, stock) {
  const dati = builder.build(dp);
  const iy = dati.facts.cols.indexOf('y');
  const im = dati.facts.cols.indexOf('m');
  const ip = dati.facts.cols.indexOf(campo || dp.facts.fields[0].id);
  if (ip < 0) return 0;
  const ultimo = dati.years[dati.years.length - 1];
  const righe = dati.facts.rows.filter(row => row[iy] === ultimo);
  if (!righe.length) return 0;
  if (stock) {
    const meseMax = righe.reduce((a, row) => Math.max(a, row[im]), 0);
    return righe.filter(row => row[im] === meseMax).reduce((a, row) => a + (row[ip] || 0), 0);
  }
  return righe.reduce((a, row) => a + (row[ip] || 0), 0);
}

/**
 * Le risposte diventano una spec e i suoi dataParams.
 *
 * Si parte dallo scheletro dell'archetipo — una composizione gia valida — e lo si veste. Cio
 * che si cambia e sempre e solo: il vocabolario, la scala, gli anni, la pelle, le parole
 * dell'intestazione. La STRUTTURA non si tocca: e la parte che i gate proteggono, ed e la
 * ragione per cui questa strada non puo produrre un layout sbagliato.
 */
function componi(risposte) {
  const r = Object.assign({}, risposte);
  const mancante = prossima(r);
  if (mancante) throw new Error('intervista incompleta: manca la risposta a "' + mancante.id + '"');

  const nic = NICCHIE[r.nicchia];
  const arche = ARCHETIPI[r.archetipo];
  const base = templates[arche.template];
  const dp = JSON.parse(JSON.stringify(base.dataParams));
  const spec = JSON.parse(JSON.stringify(base.spec));

  /* --- 1. gli anni, e la finestra con cui il report si apre --- */
  const anni = Math.max(2, Math.min(12, Number(r.storia)));
  const ultimo = (dp.years || [])[(dp.years || []).length - 1] || 2025;
  dp.years = [];
  for (let i = anni - 1; i >= 0; i--) dp.years.push(ultimo - i);
  dp.seasonality = STAGIONI[r.stagione] || STAGIONI.piatta;

  /* --- 2. il vocabolario: la dimensione principale prende i nomi del mestiere --- */
  const voc = nic.dimensioni[r.dimensione];
  const dimId = dp.facts.dim;
  const modelli = dp.dims[dimId].members;
  const quanti = Math.max(3, Math.min(6, Math.min(Number(r.quante), voc.membri.length)));
  const q = quote(quanti);
  const totMod = modelli.reduce((a, m) => a + m.base, 0);
  dp.dims[dimId].members = voc.membri.slice(0, quanti).map((nome, i) => {
    /* gli attributi vengono dal membro modello corrispondente: sono loro a portare la storia
       dell'archetipo (il canale che converte male, il piano che perde clienti), e inventarli
       qui vorrebbe dire inventare la storia */
    const mod = modelli[i % modelli.length];
    return Object.assign({}, mod, {
      id: slug(nome), n: nome, base: Math.round(totMod * q[i]),
      c: undefined, brand: undefined
    });
  });

  /* --- 3. la scala: due risposte, due leve, un rapporto esatto ---
     Prima la base, che muove la grandezza primaria; poi l'attributo, che muove la seconda
     senza toccare la prima. L'ordine conta: al contrario, la base rovinerebbe il lavoro
     dell'attributo. Fra un passo e l'altro si RIMISURA, perche il generatore non e lineare in
     modo perfetto (arrotondamenti, riconciliazione) e un fattore calcolato una volta sola
     lascerebbe qualche punto percentuale di scarto. */
  const sc = arche.scala || {};
  const membri = dp.dims[dimId].members;

  /* DUE PASSATE PER LEVA, non una. Il generatore arrotonda a ogni riga e riconcilia i totali:
     su una conta piccola — trecento contratti sparsi su dodici mesi e quattro voci — gli
     arrotondamenti mangiano qualche punto percentuale, e un fattore calcolato una volta sola
     lascia un 4% di scarto fra cio che l'utente ha chiesto e cio che il report stampa. La
     seconda passata corregge la prima e porta lo scarto sotto l'uno per cento. */
  const passate = 2;
  if (sc.base) {
    const obiettivo = Number(r[sc.base.risposta]);
    for (let p = 0; p < passate && obiettivo > 0; p++) {
      const misurato = totaleUltimoAnno(dp, sc.base.campo, sc.base.stock);
      if (misurato <= 0) break;
      const k = obiettivo / misurato;
      if (Math.abs(k - 1) < 0.0005) break;
      membri.forEach(m => { m.base = Math.max(1, m.base * k); });
    }
  }

  if (sc.attr) {
    const fattore = sc.attr.fattore || 1;
    const obiettivo = Number(r[sc.attr.risposta]) * fattore;
    for (let p = 0; p < passate && obiettivo > 0; p++) {
      const misurato = totaleUltimoAnno(dp, sc.attr.campo, sc.attr.stock);
      if (misurato <= 0) break;
      /* un attributo al denominatore va nel verso opposto: se i clienti sono ricavo / arpa,
         per avere piu clienti l'arpa deve scendere */
      const f = sc.attr.verso < 0 ? misurato / obiettivo : obiettivo / misurato;
      if (Math.abs(f - 1) < 0.0005) break;
      membri.forEach(m => {
        m.attrs = Object.assign({}, m.attrs);
        if (typeof m.attrs[sc.attr.nome] === 'number') m.attrs[sc.attr.nome] *= f;
      });
    }
  }
  membri.forEach(m => { m.base = Math.max(1, Math.round(m.base)); });

  /* --- 4. le parole --- */
  const azienda = String(r.azienda || 'Acme').slice(0, 28);
  spec.meta.brand = Object.assign({}, spec.meta.brand, { name: azienda });
  spec.meta.locale = r.lingua === 'en' ? 'en-GB' : 'it-IT';
  spec.meta.currency = nic.valuta;
  spec.meta.watermark = r.lingua === 'en'
    ? 'Demonstration mockup · synthetic data'
    : 'Mockup dimostrativo · dati sintetici';
  if (r.lingua === 'en') delete spec.meta.months;

  /* --- 5. la pelle --- */
  const preset = catalogo.PRESET_APPROVATI.filter(p => p.id === r.pelle)[0];
  spec.skin = preset ? Object.assign({}, preset.skin) : { palette: nic.palette[0] };
  /* La griglia SEGUE la pelle, non la precede: shell e densita decidono quanta larghezza resta
     al contenuto e quanto spazio c'e fra le card, e sono numeri, non preferenze. Lasciando la
     griglia dello scheletro, una pelle con la rail avrebbe strizzato le card di 204px mentre
     gli SVG restavano larghi quanto la spec credeva — il motore infatti si rifiuta di
     renderizzarla, ed e giusto cosi. Qui la si allinea invece di aggirare il rifiuto. */
  const pel = SKIN.pelleDi(spec);
  spec.grid = Object.assign({}, spec.grid, {
    contentWidth: pel.shell.contentWidth,
    gutter: pel.densita.gutter
  });

  /* --- 6. la finestra di apertura, se la storia la permette --- */
  spec.filters = spec.filters || {};
  spec.filters.date = spec.filters.date || { levels: ['year', 'quarter', 'month'] };
  const apre = Math.max(1, Math.min(Number(r.apertura || 1), anni));
  spec.filters.date.default = Object.assign({}, spec.filters.date.default, {
    y: ultimo, y0: ultimo - apre + 1, q: null, m: null
  });

  /* IL VOCABOLARIO ARRIVA FINO AI TITOLI.
     Rinominare i membri e lasciare "Win rate per fonte" sopra un grafico di punti vendita e
     peggio che non rinominarli: il report si contraddice da solo, e il lettore se ne accorge
     prima di guardare i numeri. Quindi la parola dello scheletro — quella con cui i suoi
     titoli chiamano la dimensione — viene sostituita ovunque compaia, singolare e plurale. */
  const dt = arche.dimTesti || {};
  /* Le sostituzioni piu lunghe per prime, o "Soci" mangerebbe "Soci attivi" lasciando
     "Clienti attivi" a meta strada fra due vocabolari. */
  const sostituzioni = Object.keys(nic.parole || {})
    .map(k => [k, nic.parole[k]])
    .concat(dt.plur ? [[dt.plur, voc.plurale || voc.label]] : [])
    .concat(dt.sing ? [[dt.sing, voc.label]] : [])
    .sort((a, b) => b[0].length - a[0].length);
  const fuga = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const traduci = s => {
    let out = String(s);
    sostituzioni.forEach(([da, a]) => {
      out = out.replace(new RegExp(fuga(da), 'g'), a);
      /* la stessa parola in mezzo a una frase: "presenze per corso" — minuscola con minuscola,
         cosi la maiuscola di inizio titolo non si sposta dove non deve */
      const dam = da.toLowerCase();
      if (dam === da) return;      /* gia minuscola: l'ha gia sostituita il passaggio sopra */
      out = out.replace(new RegExp(fuga(dam), 'g'), a.toLowerCase());
    });
    return out;
  };
  /* SI TRADUCE TUTTO CIO CHE SI LEGGE, ovunque stia.
     La prima versione elencava i posti da tradurre — titoli, sottotitoli, colonne, misure — e
     ne dimenticava tre: la colonna di una matrice diceva ancora "Soci" sotto un'intestazione
     che diceva "Clienti serviti". Un elenco di posti va aggiornato ogni volta che la spec
     cresce, e nessuno se ne ricorda. Qui si cammina su tutta la spec e si traduce ogni valore
     che sta sotto una chiave che il lettore VEDE: gli id, le misure e i formati non si toccano,
     perche sono nomi interni e tradurli romperebbe i riferimenti. */
  const VISIBILI = { title: 1, subtitle: 1, label: 1, note: 1, etichetta: 1, nav: 1, drillHeader: 1, l: 1, backLabel: 1, allLabel: 1, pill: 1, totalsLabel: 1 };
  /* I nomi dei membri dello scheletro (Yoga, Enterprise, Referral) sopravvivono nelle frasi
     scritte a mano: "Nuoto e Yoga a meta sala" sotto un grafico che ora parla di locali e una
     didascalia su cose che nel report non ci sono piu. Non si traducono — si TOLGONO: erano
     l'osservazione dell'autore su QUEL dato, e il dato e cambiato. */
  const vecchiNomi = modelli.map(m => m.n).filter(Boolean);
  const parlaDelVecchio = s => vecchiNomi.some(nome => String(s).indexOf(nome) >= 0);
  const cammina = o => {
    if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach(k => {
      const v = o[k];
      if (typeof v === 'string') { if (VISIBILI[k]) o[k] = traduci(v); }
      else cammina(v);
    });
  };
  /* prima si tolgono le frasi che parlano dei membri di prima, poi si traduce cio che resta */
  const ripulisci = o => {
    if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach(k => {
      const v = o[k];
      if (typeof v === 'string') {
        if ((k === 'subtitle' || k === 'note') && parlaDelVecchio(v)) delete o[k];
      } else ripulisci(v);
    });
  };
  ripulisci(spec.pages);
  if (spec.meta.subtitle && parlaDelVecchio(spec.meta.subtitle)) delete spec.meta.subtitle;
  cammina(spec.pages);
  cammina(spec.drill);
  cammina(spec.model.measures);
  cammina(spec.kpiBand);
  ['title', 'subtitle'].forEach(k => { if (spec.meta[k]) spec.meta[k] = traduci(spec.meta[k]); });
  /* Il nome dello scheletro non sopravvive. L'azienda NON si aggiunge qui: il motore la
     antepone gia lui al titolo della finestra, e scriverla due volte darebbe "Osteria Vera —
     Osteria Vera — capacita e riempimento". */
  const senzaMarchio = String(spec.meta.title).replace(/^[^—]+—\s*/, '');
  spec.meta.title = senzaMarchio.charAt(0).toUpperCase() + senzaMarchio.slice(1);

  /* il filtro sulla dimensione principale porta l'etichetta del mestiere */
  (spec.filters.dims || []).forEach(fd => {
    if (fd.id === dimId) { fd.label = voc.label; fd.pill = voc.label; }
  });
  if (dp.dims[dimId].members.length > 5) {
    (spec.filters.dims || []).forEach(fd => { if (fd.id === dimId) fd.control = 'dropdown'; });
  }

  /* --- 7. il budget del file, prima di consegnare ---
     Il peso non e un dettaglio tecnico da scoprire dopo: e una risposta all'intervista come le
     altre, perche dipende dalle scelte fatte — sei voci invece di tre e tre anni mensili
     invece di due possono aggiungere venti kilobyte. Qui si prova a rientrare nel tetto con le
     leve che NON cambiano cio che l'utente ha chiesto, in ordine di invisibilita:
       1. la profondita mensile (gli anni lontani si sommano per anno: i totali non cambiano);
       2. la seconda dimensione, quella dello spacchettamento interno, portata a tre voci.
     Se non basta, non si taglia di nascosto cio che e stato chiesto: si consegna e lo si dice. */
  const misuraPeso = () => {
    try { return Buffer.byteLength(RENDER().render(spec, builder.build(dp))); }
    catch (e) { return 0; }        /* se non renderizza, il peso non e il problema di adesso */
  };
  const tirate = [];
  const leve = [
    () => { dp.dettaglioMesi = 2; tirate.push('dettaglio mensile sugli ultimi due anni'); },
    () => {
      const sp = dp.facts.split;
      if (!sp || !dp.dims[sp.dim] || dp.dims[sp.dim].members.length <= 3) return false;
      dp.dims[sp.dim].members = dp.dims[sp.dim].members.slice(0, 3);
      if (sp.shares) sp.shares = [0.5, 0.3, 0.2];
      tirate.push('seconda dimensione a tre voci');
      return true;
    }
  ];
  let peso = misuraPeso();
  for (let i = 0; i < leve.length && peso > TETTO; i++) {
    if (leve[i]() === false) continue;
    peso = misuraPeso();
  }

  return {
    spec: spec, dataParams: dp, build: () => builder.build(dp), risposte: r,
    /* `leve` dice cosa e stato ridotto per rientrare, e `oltre` ammette quando non e bastato:
       un mockup consegnato sopra il tetto va detto, non scoperto in revisione. */
    peso: { byte: peso, kb: Math.round(peso / 102.4) / 10, oltre: peso > TETTO, leve: tirate }
  };
}

module.exports = { ALBERO, NICCHIE, ARCHETIPI, prossima, percorso, completa, componi, quote };
