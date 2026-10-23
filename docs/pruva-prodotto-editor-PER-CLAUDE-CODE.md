# Pruva — il prodotto: flusso guidato ed editor

Specifica di prodotto che unisce il flusso deciso l'8 ottobre 2026 con tutte le decisioni prese prima
sull'editor e sul prodotto. Sostituisce l'ordine dei blocchi del file pruva-editor-PER-CLAUDE-CODE.md
(che resta valido come dettaglio delle singole funzioni dell'editor).

Contesto al 23/10: la fase di test con i tester è quasi finita e Pruva aprirà presto alla waiting
list. Il flusso guidato e l'editor sono quindi la priorità: sono ciò che un utente esterno userà.

Regole invariate: una regola cambia prima in /skill, poi nel motore; prima il caso nel corpus, poi il
fix; ogni modifica passa da mutateSpec e dalla validazione; online deve comportarsi come in locale;
niente push né deploy senza conferma; zero crediti API durante lo sviluppo.

Le decisioni marcate **[DECISO 23/10]** erano aperte e ora sono chiuse: costruiscile così. Se in corsa una non regge, fermati e dimmelo prima di cambiarla.

═══════════════════════════════════════════════════════════════
## 1. IL FLUSSO, IN CINQUE FASI
═══════════════════════════════════════════════════════════════
1. **Brief** — l'utente scrive a parole cosa gli serve.
2. **Struttura** — l'AI trasforma il brief in uno schema del report, che l'utente rivede e corregge.
3. **Template** — l'utente sceglie l'aspetto del report fra circa 10 template.
4. **Build, pagina per pagina** — l'utente sceglie riga KPI, stile delle card, KPI, stile dei pannelli
   e layout; poi "Fill page" riempie la pagina con l'AI.
5. **Editor** — a report finito si aggiunge, modifica, duplica, elimina, si cambia formato e tema.

Il cambiamento rispetto a oggi: l'utente decide la FORMA prima, l'AI riempie il CONTENUTO dopo.
L'AI non sceglie più tutto in un colpo solo.

═══════════════════════════════════════════════════════════════
## 2. FASE STRUTTURA (prima chiamata AI)
═══════════════════════════════════════════════════════════════
Dal brief, l'AI produce uno schema JSON:

    {
      "title": "...",
      "purpose": "...",
      "niche": "<id della nicchia riconosciuta>",
      "pages": [
        { "title": "...", "subtitle": "...", "content": "cosa deve mostrare la pagina" }
      ]
    }

- Il numero di pagine lo propone l'AI dal brief; l'utente può aggiungere o togliere pagine.
- La nicchia viene riconosciuta QUI, con la procedura di niches.md, e guida tutte le fasi dopo
  (KPI proposti, template consigliati, layout consigliati).
- Tutti i campi sono modificabili dall'utente prima di andare avanti.
- È una chiamata piccola: deve costare poco ed essere veloce.
- Se l'utente fornisce dati (oggi: tabella o CSV tramite engine/dati-forniti.js, commit 30ea61e), la
  Struttura parte da quelli: pagine, misure e periodo si ricavano dai dati, e il resto del flusso usa
  i dati veri invece di quelli sintetici. Excel, database, PBIX e immagini restano nel backlog.
- Validazione: schema rigido via output strutturato; se manca un campo si usa il default della
  nicchia, mai una domanda di ritorno all'utente.

═══════════════════════════════════════════════════════════════
## 3. FASE TEMPLATE (circa 10)
═══════════════════════════════════════════════════════════════
**[DECISO 23/10]** Un template è un preset completo di aspetto: tema (palette), tipografia, stile
delle card, stile dei pannelli, densità. Si scelgono circa 10 preset dal catalogo curato
(engine/catalogo.js), diversi fra loro per famiglia (chiaro editoriale, corporate, scuro tecnico,
caldo, ecc.).
- Pruva segna con "consigliato" 1-2 template adatti alla nicchia (le nicchie dichiarano già la
  loro pelle plausibile).
- Ogni template ha un'anteprima sul report dell'utente, non su un esempio generico, se il costo lo
  permette; altrimenti su un esempio della stessa nicchia.
- Restano valide tutte le regole: palette verificate (contrasto, daltonismo, scala di grigi),
  numeri con cifre tabulari, cornice su ogni card e visual.

═══════════════════════════════════════════════════════════════
## 4. FASE BUILD, PAGINA PER PAGINA
═══════════════════════════════════════════════════════════════
Per ogni pagina dello schema, nell'ordine:

**Regola sui nomi:** tutti i nomi di template, temi, stili e layout sono di Pruva. Non usare nomi,
etichette o codici presi da altri strumenti o dalle schermate di riferimento. I nomi qui sotto sono
la proposta: brevi, in inglese (la lingua dell'interfaccia), descrittivi.

### a. Riga KPI
- **Full**: valore con variazioni (vs periodo precedente, vs target dove esiste).
- **Value**: solo il valore.
- **Off**: la riga KPI scompare e lo spazio va ai pannelli.

### b. Stile delle card KPI
Due gruppi in un solo elenco.

Solo numero:
- **Plain** — etichetta, valore, variazione; nessun ornamento oltre la cornice.
- **Badge** — piccola icona accanto all'etichetta, in alto.
- **Banner** — fascia in testa alla card con l'etichetta, nel colore d'accento.
- **Ruled** — etichetta separata dal valore da una linea sottile.
- **Wash** — sfondo appena tinto col colore d'accento.
- **Outline** — bordo marcato, sfondo neutro.
- **Solid** — corpo della card pieno nel colore d'accento, testo chiaro.

Con grafico:
- **Columns** — valore più mini colonne nel tempo.
- **Area** — valore più mini area nel tempo.
- **Stack** — valore più mini colonne impilate (scomposizione).
- **Ring** — valore più anello di quota.

- Va unito alle varianti che esistono già (KPI classica, delta-card, varianti con sparkline):
  ognuna prende il suo posto in questo elenco con un nome Pruva. Non due sistemi paralleli.
- Le card con grafico (colonne, area, colonne impilate, donut) mostrano DATI VERI del report:
  colonne e area richiedono una serie temporale della misura; colonne impilate una
  scomposizione; donut una quota. Se la misura non li supporta, quello stile si mostra in grigio
  col motivo, come per il cambio grafico.
- Le tinte di sfondo (Accent Tint, Tinted Body) usano il colore d'accento del tema, MAI il rosso
  riservato al problema.
- Il colore delle variazioni segue i token semantici attuali di Pruva.

### c. KPI count e scelta dei KPI
- Un numero (es. da 0 a 6) e, per ogni posizione, un elenco a discesa dei KPI inseribili.
- L'elenco viene dalla nicchia (niches.md) filtrata dalla disponibilità dei dati per la taglia
  del cliente (data-availability.md), più le misure emerse dalla fase Struttura.
- Pruva preseleziona i KPI consigliati; l'utente può cambiarli.

### d. Stile dei pannelli
Due scelte combinabili invece di una lista piatta:
- Intestazione: **Quiet** (titolo e piccola icona, niente separatori) · **Framed** (titolo
  dentro la cornice, linea sotto) · **Band** (fascia di intestazione tinta) · **Tab** (intestazione
  in un riquadro staccato sopra il corpo).
- Sottotitolo: sì / no.
- Vale per tutti i pannelli della pagina. La cornice resta sempre visibile.

### e. Layout dei pannelli
- Lista di layout per la parte sotto la riga KPI, raggruppati per numero di righe e colonne,
  ognuno con più varianti di proporzione.
- Ricerca per codice compatto. Definisci una grammatica di codici NOSTRA, leggibile (righe e
  proporzioni delle colonne), e documentala. Non riprendere codici di altri strumenti.
- Ogni layout È una combinazione di span sulla griglia condivisa: niente layout liberi fuori
  griglia. Così passa i gate di geometria e resta ricostruibile in Power BI.
- **[DECISO 23/10]** Pruva segna con "consigliato" il layout adatto alla domanda della pagina,
  ricavato dagli archetipi (layout-archetypes.md). L'utente può scegliere qualunque layout.

### f. Fill page (riempimento con AI)
- Una chiamata AI per pagina: riempie i pannelli del layout scelto con visual, misure e dati,
  rispettando riga KPI, KPI scelti, stili e template.
- L'AI sceglie il visual di ogni pannello in base alla domanda e alla classe di scambio, e alla
  dimensione del pannello (un P&L non va in un pannello stretto).
- Se un contenuto non sta nel pannello scelto, Pruva lo dice e propone un'alternativa invece di
  produrre un pannello illeggibile.
- Validazione, riparazione e fallback come oggi. Tutti i gate esistenti si applicano.
- La storia negativa della nicchia resta obbligatoria nel report: va distribuita sulle pagine.

═══════════════════════════════════════════════════════════════
## 5. EDITOR, A REPORT FINITO
═══════════════════════════════════════════════════════════════
Decisioni nuove:
- **Aggiungere, modificare, duplicare, eliminare** elementi (visual, card, pagine).
- **Griglia** attivabile sul canvas.
- **Formato**: 16:9, 4:3, mobile. Il report si adatta da solo, stessi dati e stessi filtri.
- **Tema**: menu con i temi disponibili, tutti modificabili in colori, font, peso e dimensione.

Decisioni già prese (dettaglio in pruva-editor-PER-CLAUDE-CODE.md), che restano valide:
- spostamento e ridimensionamento sempre agganciati alla griglia;
- dopo un'eliminazione Pruva propone come ridimensionare i vicini;
- sotto la misura minima un elemento torna da solo al minimo;
- cambio grafico dal pannello laterale: tutti i tipi, i non adatti in grigio col motivo,
  etichetta "consigliato";
- modifica dei testi (titoli, sottotitoli, titolo report, cliente, etichette KPI);
- pannello dati semplice: categorie modificabili, numeri modificabili in modalità esperti con
  riallineamento dei totali;
- pannello qualità: solo i problemi, correzione automatica dove possibile, solo nell'editor;
- annulla e ripeti;
- niente pattern di lettura; drill-through e tooltip restano automatici.

Sul tema modificabile:
- **[DECISO 23/10]** Colori liberi, ma validati: se un colore non regge il contrasto o si confonde
  sotto daltonismo, Pruva lo corregge e lo dice (già deciso per i colori del brand).
- **[DECISO 23/10]** Font liberi per titoli e testi; per i NUMERI Pruva avvisa (non blocca) se il
  font scelto non ha cifre tabulari, perché senza le colonne si disallineano.

═══════════════════════════════════════════════════════════════
## 6. MODALITÀ VISUALIZZAZIONE ED ESPORTAZIONE (già decise)
═══════════════════════════════════════════════════════════════
- La visualizzazione è la modalità di default; l'editor è una modalità separata.
- Schermo intero, cursore evidenziato per le demo in call, tasto destro, zoom su una riga o un
  visual.
- Consegnabili sempre: link/file HTML interattivo, kit Power BI, dataset, tema, prompt per
  ricostruirlo con un'AI.
- Esportazione PDF e PNG di tutte le pagine; scritta "dati sintetici" a scelta dell'utente.

═══════════════════════════════════════════════════════════════
## 7. GRATIS E A PAGAMENTO (già deciso)
═══════════════════════════════════════════════════════════════
- Gratis: la prima generazione, usabile in modo interattivo nell'app, e il download come immagine.
  Serve email verificata (normalizzata, domini usa-e-getta bloccati); chi arriva dalla waiting
  list ha già i contatti.
- A pagamento: altre generazioni, modifiche nell'editor, export video, e gli altri upsell.
- **[DECISO 23/10]** Con il nuovo flusso, "una generazione" = un report
  intero (fase Struttura + Fill page di tutte le sue pagine). Rigenerare una singola pagina costa
  meno di un report intero.
- Prima di aprire online: tetto di spesa sull'account del modello e tetto giornaliero di
  generazioni gratuite.

═══════════════════════════════════════════════════════════════
## 8. COLLEGATO, NEL BACKLOG
═══════════════════════════════════════════════════════════════
- **Pruva veloce e gratis almeno per Fra**: poterlo usare direttamente dall'app, senza pagare,
  con tempi di generazione brevi. Velocità come requisito, non come rifinitura.
- **Test delle API Groq** (piano già definito nella chat principale: PRUVA_PROVIDER, PRUVA_MODEL,
  output strutturati, voto alla cieca).
- **Registrazione video nel browser** (già ricercata nella chat principale).
- **Outreach automatico per i clienti di Pruva**: un flusso in cui l'utente manda ai suoi
  potenziali clienti un mockup e il video in automatico. Non è il marketing di Fra: è una funzione
  del prodotto, da vendere anche come flusso a sé.
- Export video online, dopo la registrazione nel browser: immagine Docker su Cloud Run, flusso
  asincrono (già ricercato).
- **Input a supporto del testo** ("Start from your data"). Il brief resta l'ingresso principale;
  questi input lo arricchiscono ed entrano tutti nella fase Struttura:
  - file Excel o CSV;
  - database facili da collegare (es. Snowflake);
  - view di database, che dovrebbero funzionare come le tabelle;
  - file Power BI, letti con PBIXRay, prima in modalità solo metadati;
  - immagini (es. uno schizzo, un report esistente da rifare).
- Link condivisibile come salvataggio e condivisione.
- Perché ora il test Groq / Haiku sul corpus: il nuovo flusso rende il lavoro dell'AI più stretto
  (riempire una pagina con forma già decisa), quindi è il momento giusto per misurare se un
  modello economico basta.

═══════════════════════════════════════════════════════════════
## 9. ORDINE DI COSTRUZIONE PROPOSTO
═══════════════════════════════════════════════════════════════
A. Il modello dati del flusso: schema della Struttura, configurazione per pagina (riga KPI, card
   style, KPI, stile e layout dei pannelli), template. Più le fondamenta: mutateSpec, validazione
   dopo ogni azione, annulla/ripeti.
B. Le schermate di Struttura, Template e Build SENZA AI: anteprima deterministica con contenuti
   segnaposto, per provare forma e navigazione a costo zero.
C. "Fill page" per pagina, con validazione e gate. In sviluppo il modello lo fai tu
   (ciclo locale).
D. L'editor a report finito.
E. Editor del tema, formati, esportazioni.

Per ogni fase: prima dimmi come la imposti e quali file tocchi, poi costruisci, poi casi nel corpus
e gate per le nuove azioni. Chiudi ogni fase con screenshot e un video breve.
