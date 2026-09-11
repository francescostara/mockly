# Il ciclo locale — come si lavora, a costo zero

## REGOLA DI PROGETTO (non è una fase)

Il ciclo locale **non** è un ripiego in attesa di "passare all'API". È il modo in cui si
lavora, da qui fino a un eventuale go-live e oltre.

- **Nessun credito API viene speso, punto.** Non c'è un momento futuro in cui "poi però si
  spende". Se una cosa non si può provare localmente, si progetta in modo che si possa provare
  localmente.
- **Il prodotto potrebbe non andare mai live** e restare uno strumento personale dell'autore,
  usato nella sua consulenza. È una possibilità legittima, non un fallimento.
- **Se un giorno andrà live, dovrà comportarsi esattamente come nei test locali.** Quindi tutto
  ciò che il ciclo locale prova è lo stesso codice, la stessa skill, gli stessi gate che
  girerebbero in produzione. Nessun percorso "solo per i test", nessuna scorciatoia locale che
  in produzione non esista.
- **Conseguenza sull'architettura:** il percorso a questionario — deterministico, senza
  modello — è la strada principale del prodotto, non un'alternativa. È l'unica che si può
  provare, spedire e far usare a chiunque senza costi. Il brief a testo libero resta possibile,
  ma è un'aggiunta, non ciò che fa funzionare il prodotto.
- **Come si misura il progresso senza spendere:** il verdetto di spedibilità sui mockup
  generati localmente. È la stessa domanda del giro a pagamento — *quanti ne manderei a un
  cliente?* — con la risposta gratis.

Se un giorno l'autore deciderà diversamente, lo dirà esplicitamente. Fino ad allora: zero
crediti, sempre.

---

## Il protocollo

1. **Fra manda un BRIEF** come lo scriverebbe un utente vero. Anche sporco, anche incompleto:
   i brief puliti non esistono e un ciclo che li assume prova la cosa sbagliata.

2. **Claude si comporta come il modello in produzione**, seguendo la stessa procedura del
   system prompt, nello stesso ordine:
   nicchia (`niches.md`) → taglia e dati disponibili (`data-availability.md`) → domande di
   decisione → **archetipo** (`layout-archetypes.md`) → **pelle** (`engine/skin.js`, dentro la
   PELLE PLAUSIBILE della nicchia) → **àncore di grandezza** → conte derivate → spec +
   dataParams.

   > **Vincolo che rende il ciclo onesto:** non si usa conoscenza che il modello in produzione
   > non avrebbe. Se una regola non è scritta nella skill, non la si applica — si segnala che
   > manca. È così che si trovano i buchi.

3. **Si renderizza col motore** e il risultato va in `out/locale/<brief-id>.html`, più la card
   nel banco.

4. **Girano i gate e il verdetto di spedibilità**, e l'esito si dice **prima** che Fra apra il
   file. Un difetto che il motore ha già visto non deve costare a nessuno il tempo di guardarlo.

5. **Fra apre, clicca, giudica** — con `npm run review`, che è il posto dove questo passo
   avviene: un mockup alla volta a schermo, interattivo (si clicca dentro davvero, non è uno
   screenshot), con accanto le stesse quattro domande e la scheda di interazione.

   > **Il verdetto automatico non si vede prima del voto.** Non è nascosto: non esce proprio
   > dal server finché il voto non è partito. Se lo si vedesse prima lo si prenderebbe come
   > ancora; mostrandolo dopo si misura una cosa che nessun test sa dire da solo — **quanto i
   > gate sono tarati sul gusto di chi decide**. Macchina SPEDIBILE e umano "No" significa che
   > manca un gate; macchina DA RIVEDERE e umano "Sì" che il gate è troppo severo. Il riepilogo
   > riporta lo scarto come riga a sé.

   Ogni difetto trovato si classifica, e la classificazione decide dove va la correzione:
   - **del MOTORE** → un caso nel corpus, poi il fix;
   - **della SKILL** (regola mancante o ambigua) → si corregge la skill, e si annota che il
     modello in produzione avrebbe sbagliato allo stesso modo.

6. Si ripete. Corpus e skill migliorano a ogni giro, a costo zero.

## Il ragionamento va SEMPRE dichiarato

Prima della spec, cinque righe:

```
nicchia      <quale, e da quale parola del brief>
taglia       <stimata, e perché — quali segnali>
domanda      <la decisione principale che il lettore deve prendere>
archetipo    <quale, e perché quello>
pelle        <shell · palette · tipografia · densità, e perché>
àncore       <i rapporti fissati PRIMA delle conte, coi loro valori>
```

È la parte più preziosa del ciclo: Fra corregge **il ragionamento**, non solo l'output — e ciò
che si corregge finisce nella skill, che è ciò che il modello in produzione leggerà.

## Onestà metodologica

Claude legge la skill con più calma di quanta ne abbia un modello che riceve 25k token in un
colpo solo. Non è un motivo per rinviare: è un vincolo **di progetto**. Poiché non verificheremo
via API, la skill deve essere scritta in modo che **non serva calma per applicarla**: regole
esplicite, esempi canonici, vincoli strutturali al posto delle raccomandazioni.

Regola operativa: **ogni volta che qui bisogna "ragionarci su" per applicare una regola, quella
regola è scritta male.** Si segnala e si riscrive.

Il percorso a questionario, essendo deterministico, non ha questo problema per costruzione — ed
è un motivo in più per cui è la strada principale.

## I comandi

```bash
npm run banco        # rigenera tutto: archetipi, campionario delle pelli, banco, fixture
npm test             # unit + harness sui casi dell'eval
npm run templates    # riesporta gli esempi canonici in skill/assets
npm run locale       # renderizza i giri del ciclo e dà il verdetto di spedibilità
npm run catalogo     # genera il campionario delle pelli da curare
npm run review       # lo strumento di revisione: un mockup alla volta, questionario fisso
```

**Il questionario è fisso e resta fisso** — tre criteri da 1 a 5 (i numeri reggono · parla la
lingua della nicchia · si legge bene), il verdetto (sì / sì con un ritocco / no) e una nota,
obbligatoria solo quando un voto è ≤ 3 o il verdetto è No. Se un giorno si aggiunge un
criterio, i voti dei giri precedenti smettono di essere confrontabili: è il motivo per cui non
si aggiunge a cuor leggero. I voti vivono in `review/reviews.json`, versionato.

I file finiscono in `out/banco/` (`index.html` è l'indice cliccabile,
`banco-standalone.html` è il file unico da aprire col doppio clic, senza server).
I giri del ciclo locale finiscono in `out/locale/`, con l'indice `out/locale/index.html`.

## Per i tester esterni

La stessa infrastruttura: mockup generati localmente più il percorso a questionario
deterministico. Nessun credito, risultati sempre validi — e ciò che il tester vede è ciò che il
prodotto fa davvero, perché è lo stesso codice.

---

# Registro dei giri

Ogni giro lascia qui il suo ragionamento dichiarato, il verdetto e cosa ha trovato. Il valore
del registro non sono i mockup: sono i **buchi della skill** che ogni giro fa emergere.

<!-- I giri sono in ordine cronologico. Il più recente in fondo. -->

## Giro 1 — trasporti, Verona (`out/locale/trasporti-verona.html`)

**Brief:** *"ciao, ho una piccola azienda di trasporti a Verona, 18 mezzi, facciamo consegne per
e-commerce nel nord italia. vorrei far vedere ai miei soci quali rotte ci fanno guadagnare e
quali no, perché ho il sospetto che su alcune ci rimettiamo. non ho un CRM, uso excel e il
gestionale del trasporto"*

```
nicchia      logistica / trasporti
taglia       PICCOLA — "piccola", 18 mezzi, "non ho un CRM", "uso excel". Nessun segnale
             che alza: floor + le rotte, che il brief nomina e il gestionale ha.
domanda      "quali rotte guadagnano e quali no" — redditività per entità, e la risposta
             deve poter essere "questa perde".
archetipo    quadrants — lo scatter con le mediane isola le rotte in perdita. Uno scorecard
             direbbe "va tutto bene, +8%".
pelle        rail-slim · dark-tecnico · condensato · medio (ruotata dal seme del brief)
àncore       margine netto ~10% · costo per spedizione 3-30 € · carrier ~85% dei costi
```

**Verdetto:** SPEDIBILE. Margine 10,5%, costo per spedizione €7–17, due rotte su otto in
perdita (−2,0% e −4,0%), 617k spedizioni/anno su 18 mezzi ≈ 130 consegne per mezzo al giorno.

**Buco della skill trovato:** `niches.md` dichiara il **margine per km** come "unità di verità"
della logistica, ma `data-availability.md` mette le distanze nella colonna *raro — solo se
citato*. Il brief non le cita. Le due regole si contraddicevano e in produzione il modello
avrebbe scelto a caso. **Chiuso:** la voce logistica ora dice esplicitamente che senza distanze
la metrica principale diventa il margine per spedizione.

## Giro 2 — scuola online (`out/locale/scuola-online.html`)

**Brief:** *"Report per il consiglio di una scuola online di design, circa 4.000 iscritti attivi
e 6 docenti. Vogliamo capire se la crescita è sana o se perdiamo studenti dopo il primo corso.
Confronto anno su anno."*

```
nicchia      creator economy / education
taglia       MEDIA — 4.000 iscritti, sei docenti, un consiglio. Nessuno strumento nominato:
             niente livello raro, ritenzione per coorte modellata e dichiarata.
domanda      ritenzione, non fatturato: "perdiamo studenti dopo il primo corso".
archetipo    cohorts — la heatmap per coorte è l'unico visual che fa vedere se chi è entrato
             dopo resta meno di chi è entrato prima.
pelle        top · jewel-desaturati · editoriale · arioso (ruotata dal seme del brief)
àncore       prezzo medio 30-900 € · margine operativo 60-70% · ritenzione 34-71% per coorte
```

**Verdetto:** SPEDIBILE **al secondo tentativo**. Ritenzione che scende da 71,7% (coorte 2024
Q1) a 34,6% (coorte 2025 Q2): la crescita compra studenti che non restano, che è esattamente la
domanda del consiglio.

**Due buchi trovati, uno dei quali ha fatto sbagliare il giro:**

1. **Le volumetrie dichiarate nel brief sono un'àncora, e nessuna regola lo diceva.** Il primo
   tentativo aveva tutti i rapporti giusti — prezzo €336, margine 64% — e produceva **28.000
   iscrizioni e €9,5M per una scuola con sei docenti**. Internamente coerente, assurdo. È lo
   scontrino da 24 centesimi visto dall'altro lato: lì si sceglieva la conta sperando nel
   rapporto, qui si rispettava il rapporto ignorando la scala che il cliente aveva già scritto.
   **Chiuso:** `data-realism.md` apre ora con la regola zero — la volumetria del brief fissa la
   scala, le àncore fissano i rapporti, il totale si deriva da entrambi.
2. **Domanda e pubblico indicavano archetipi diversi** (consiglio → executive-summary, ma la
   domanda è ritenzione → cohorts) e nessuna regola diceva quale vince. **Chiuso:**
   `layout-archetypes.md` dichiara che vince la domanda, con la densità che si adatta scendendo.

## Nota metodologica dal primo ciclo

I gate proporzionali (diversità, apertura, chiusura, varietà della pelle) sono stati messi a
tacere sotto i **quattro file**: con due giri il gruppo più numeroso vale meccanicamente il 50%
e il gate "fallisce" anche quando i due file sono diversissimi. Un gate che grida al lupo su un
campione di due viene ignorato proprio quando conta. Sotto la soglia riferiscono e non bocciano;
i gate per-file (archetipo dichiarato, densità contro pubblico) valgono sempre.
