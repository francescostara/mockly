# Mockly

Generatore di mockup di dashboard BI: descrivi il report a voce tua, ottieni un file HTML
singolo, interattivo, 1280x720, con dati sintetici plausibili, cross-filter, drill-through e
tooltip — pronto da mandare al cliente.

```
/ skill   -> la specifica autorevole (SKILL.md + references + assets + evals).
/ engine  -> il motore deterministico: runtime.js, render(spec,data), data-model.js,
             data-builder.js, la grammatica della spec.
/ app     -> l'MVP web (Next.js): chat di intake + una API route che genera.
/ lib     -> il collante dell'app: prompt, chiamata al modello, validazione, fallback, metering.
/ test    -> unit test + harness headless sui brief di /skill/evals.
```

Regola: **la skill è la specifica, il motore è l'implementazione.** Quando cambia una regola,
cambia prima in `/skill`, poi in `/engine`. Mai il contrario.

## Come è diviso il lavoro

| | chi | cosa produce |
|---|---|---|
| **giudizio** | l'LLM | la SPEC: estetica, palette, quale visual risponde a quale domanda, storyline, etichette — più i `dataParams`: carattere dei segmenti, crescita, stagionalità |
| **determinismo** | il motore | griglia, formattazione, aggregazione, filtri, grafici SVG, slicer date, cross-filter, drill-through, tooltip, fit-to-viewport, riconciliazione |

Stessa spec + stessi dati ⇒ stesso HTML, byte per byte.

## L'app in locale

```bash
npm install
```

Poi crea `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npm run dev
```

Apri <http://localhost:3000>, rispondi alle cinque domande, premi **Genera mockup**.

### Variabili d'ambiente

| variabile | obbligatoria | default | a cosa serve |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | sì (in produzione) | — | la chiave. Vive **solo server-side**, non arriva mai al browser |
| `MOCKLY_MODEL` | no | `claude-sonnet-5` | il modello che scrive la spec |
| `MOCKLY_STUB` | no | — | `1` usa una spec canned (nessuna chiamata, nessun credito); `broken` forza il percorso riparazione → fallback. Per lavorare sulla UI senza spendere |

Con `MOCKLY_STUB=1` l'app gira **senza chiave**: utile per sviluppare l'interfaccia.

## Come funziona una generazione

1. **La chat non costa nulla.** L'intake (le 5 domande di `SKILL.md`) è scriptato lato client:
   nessuna chiamata al modello finché non premi «Genera mockup».
2. **Una sola chiamata a pagamento** verso `/api/generate`. Il system prompt (~12k token) è
   costruito dai file su disco ed è byte-stabile, quindi va in **prompt cache**: dalla seconda
   generazione in poi quel prefisso costa ~0,1×.
3. Il modello restituisce `{ spec, dataParams }`. Il server espande i dati
   (`engine/data-builder.js`), valida e renderizza (`engine/render.js`).
4. **Se la spec non è valida**, gli errori esatti tornano al modello per **una** riparazione
   mirata. Se fallisce ancora, parte una **spec di fallback** deterministica costruita
   dall'intake: l'utente ottiene comunque un mockup funzionante, mai una pagina di errore.
5. Il mockup vive in un `<iframe sandbox="allow-scripts">`: gli script del report girano, ma
   l'iframe è origine opaca e non può toccare la pagina che lo ospita.

### Metering (stub, niente fatturazione)

Ogni generazione emette una riga strutturata su stdout:

```
[mockly:meter] {"model":"claude-sonnet-5","valid":true,"repairs":0,"fallback":false,
"tokensIn":812,"tokensOut":4210,"cacheRead":12088,"costUsd":0.0672,"cacheHitRate":0.937,
"latencyMs":31840,"run":7,"avgCostUsd":0.0689,"fallbackRate":0.0}
```

Sono i numeri che servono a calibrare i crediti: costo per generazione, hit rate della cache,
quante volte la spec ha avuto bisogno di riparazione o è finita in fallback. L'aggregato è in
memoria di processo (le istanze serverless sono effimere): la riga di log è il record durevole,
da instradare a un log drain quando arriverà il billing vero.

## Deploy su Vercel

Il progetto è un'app Next.js standard: nessun `vercel.json` necessario.

1. Push del repo su GitHub.
2. Su Vercel: **Add New → Project → Import** il repo. Framework rilevato: Next.js. Root
   directory: la radice del repo. Build command e output: quelli di default.
3. **Settings → Environment Variables**: aggiungi `ANTHROPIC_API_KEY` (Production, Preview,
   Development). Non serve nessun prefisso `NEXT_PUBLIC_`: la chiave deve restare server-side.
4. Deploy.

Oppure da CLI:

```bash
npx vercel link
npx vercel env add ANTHROPIC_API_KEY
npx vercel --prod
```

Due dettagli che contano:

- **`maxDuration`**: la route dichiara 300s. Il piano **Hobby taglia a 60s**; una generazione
  sta tipicamente in 20–60s, quindi ci sta, ma senza margine. Su **Pro** i 300s valgono davvero.
- **Il motore non viene bundlato.** È CommonJS e legge `engine/runtime.js` da disco, quindi
  `lib/engine.ts` lo carica a runtime e `next.config.ts` (`outputFileTracingIncludes`) dice a
  Vercel di spedire `engine/**` e i file di `skill/references` insieme alla funzione. Se sposti
  quelle cartelle, aggiorna anche quella lista.

## Il motore, senza l'app

```bash
npm test                      # unit test + equivalenza col canonico + harness sui brief
node engine/build-all.js      # renderizza le fixture in out/
```

`npm test` — 159 check, 1040 stati renderizzati. `test/canonical-equivalence.test.js` confronta
la firma strutturale dell'output con `skill/assets/canonical-retail-fullspec.html`.

## Stato e limiti noti

- **Gli eval a contesto pulito non sono ancora stati eseguiti.** Le spec nelle fixture di test
  sono scritte a mano: provano che la grammatica sa esprimere quei brief, non che il modello la
  scriva bene. La misura di quanto spesso il modello produce una spec valida al primo colpo è
  il prossimo passo, ed è quello che fissa il prezzo in crediti.
- **«Condividi link» è uno stub.** Serve uno storage per l'HTML (Vercel Blob o simile).
- **Una riparazione sola.** Se serve di più, meglio capire *perché* la spec esce male e
  correggere il prompt, non aggiungere tentativi.
- **Structured outputs non attivi.** Il JSON si estrae con un parser tollerante; passare a
  `output_config.format` toglierebbe una classe di errori, ma va testato contro l'API vera.
