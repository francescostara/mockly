# Mockly — regole visive della web app

Questo file copre ciò che i token non sanno dire. I valori stanno in
[`app/design-tokens.ts`](app/design-tokens.ts) — unica fonte di verità, da cui vengono generate
sia le variabili CSS sia le misure mostrate in [`/design`](app/design/page.tsx). Qui stanno le
decisioni che nessun colore può esprimere da solo.

Vale per la **web app** (`/app`). Non vale per i mockup generati: quelli hanno le loro tre
estetiche in `engine/render.js` e la loro guida in `skill/references/house-style.md`. Sono due
sistemi separati, e devono restarlo.

---

## Il principio

**L'app è una cornice monocroma quieta attorno a contenuto vivido.**

Il pannello destro mostra il mockup di un cliente finale, con i suoi colori, la sua palette, il
suo brand. Se l'interfaccia porta un proprio accento, le due cose litigano e il lettore non
capisce più quale colore significhi qualcosa. Quindi il colore appartiene al contenuto, e
l'interfaccia è inchiostro su carta.

Corollario pratico: **l'app non deve sembrare una dashboard.** Niente KPI card decorative,
niente pallini colorati di stato, niente grafici nell'interfaccia. Il grafico è il prodotto, non
la confezione.

---

## Le regole

### 1. Nessun accento cromatico
Non esiste un colore "di marca" nell'interfaccia. L'unico elemento forte è il **bottone
invertito**: fondo inchiostro, testo carta. Serve per l'azione primaria di una schermata — una
sola per schermata.

Questa regola è verificata: `test/design-tokens.test.js` rifiuta un token con una dominante
cromatica. Un accento non può rientrare come "piccola eccezione" senza che qualcosa si accorga.

Il caso che mette alla prova la regola sono gli **stati di errore**, tradizionalmente rossi. Qui
un errore si dichiara con le parole e con la forma (contorno pieno, posizione, l'azione di
rimedio accanto), non col colore. Se un giorno servirà davvero un rosso, sarà una decisione
esplicita da prendere insieme — non un `#B3453B` che ricompare in un componente.

### 2. Tema chiaro di default, scuro come scelta
Il tema si commuta scrivendo `data-theme="dark"` su `<html>`. Non si eredita da
`prefers-color-scheme`: il pannello destro mostra il mockup del cliente, e quel contenuto non
deve cambiare aspetto perché il sistema operativo di chi guarda è in scuro.

### 3. L'iframe del mockup NON si ricolora mai col tema dell'app
È la regola che protegge il principio. Il mockup è un artefatto autonomo, byte-identico a quello
che il cliente riceverà: se il tema scuro dell'app lo invertisse, l'app starebbe mentendo su cosa
sta consegnando. Il tema tocca la cornice — barre, pannelli, controlli — e si ferma al bordo
dell'iframe. La superficie incassata (`surface-sunken`) esiste proprio per dare al mockup un
palco senza doverlo toccare.

### 4. Niente ombre, gradienti, blur
La profondità è **uno scalino di superficie più un bordo hairline da 1px**. Non esiste una scala
di elevazione: è assente per scelta, non dimenticata. Un pannello sta un gradino sopra la pagina,
mai due. Se una gerarchia ha bisogno di un terzo livello, il problema è la gerarchia.

### 5. `ink-muted` è il minimo AA, non il grigio più elegante
Il testo attenuato è dove vivono **credito e prezzo**. Sono le due informazioni che l'utente
consulta per decidere se spendere: devono essere il testo più leggibile dell'interfaccia, non il
meno. Il token è tarato sul minimo WCAG AA (4.5:1) su *tutte* le superfici e in *entrambi* i
temi, e il test lo verifica.

Non esiste un terzo livello di grigio sotto `ink-muted`. Un livello del genere sarebbe, per
costruzione, sotto soglia — quindi non c'è.

### 6. Tutti i numeri in mono, con cifre tabellari
JetBrains Mono con `font-variant-numeric: tabular-nums` per ogni cifra dell'interfaccia:
crediti, prezzi, latenze, contatori. Non è un vezzo tipografico — con le cifre proporzionali un
credito che scende da 10 a 9 sposta l'etichetta accanto, e il movimento sembra un errore.

Il display (Newsreader) esiste **solo al peso 400**: è una serif da testo, e il grassetto la
trasforma in un carattere diverso. Compare una volta per schermata, non di più.

I tre caratteri sono ospitati in locale (`public/fonts`, sottoinsieme latin, licenza OFL): il
build non chiede niente a nessuno e la pagina non apre connessioni verso terzi. **Non si usa
Inter.**

### 7. Il movimento è funzionale
Tre durate, e basta: `100ms` (istantaneo — hover, focus), `160ms` (rapido — apertura di un
pannello), `240ms` (assestamento — cambio di vista). Il movimento dice che qualcosa è cambiato;
non intrattiene.

**Unica eccezione: l'animazione di generazione.** È l'attesa più lunga del prodotto (30-140
secondi) e lì il movimento ha un compito vero — dire che il sistema sta lavorando. Quella
libertà resta dentro quel componente e **non si propaga altrove**: non diventa il precedente per
animare le transizioni di pagina.

Tutto rispetta `prefers-reduced-motion: reduce`.

---

## Come si usa

I ruoli si leggono come variabili CSS: `var(--surface)`, `var(--ink-muted)`,
`var(--button-inverted-bg)`. **Un hex scritto in un componente è un bug**: sta dichiarando che
quel valore non cambia col tema, e quasi sempre si sbaglia.

Per vedere il sistema:

```bash
npm run dev
```

poi `http://localhost:3000/design` — ogni token con il suo valore nei due temi e il **contrasto
misurato** contro il fondo su cui compare davvero, più la tabella delle coppie che devono
reggere.

Per verificarlo:

```bash
node test/design-tokens.test.js
```

Se un token scivola sotto soglia il test lo dice, nomina la coppia e il perché. `/design` mostra;
il test ferma.

---

## Cosa NON è ancora fatto

`app/page.tsx` e `app/globals.css` usano ancora la palette precedente, con l'accento blu e gli
hex scritti nei componenti. La migrazione dell'interfaccia a questi token è un passo separato:
questo file e i token descrivono il sistema, non lo hanno ancora applicato alla schermata
principale.
