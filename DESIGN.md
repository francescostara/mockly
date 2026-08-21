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

**L'app è una cornice quieta attorno a contenuto vivido.**

Il pannello destro mostra il mockup di un cliente finale, con i suoi colori, la sua palette, il
suo brand. Se l'interfaccia porta un proprio accento, le due cose litigano e il lettore non
capisce più quale colore significhi qualcosa. Quindi il colore appartiene al contenuto, e
l'interfaccia è inchiostro su carta.

**La carta è calda, non neutra** (`#F7F6F3` chiaro, `#171614` scuro). Un grigio neutro accanto a
un mockup con la sua palette legge come "spento"; una carta calda legge come carta.

Corollario pratico: **l'app non deve sembrare una dashboard.** Niente KPI card decorative,
niente pallini colorati di stato, niente grafici nell'interfaccia. Il grafico è il prodotto, non
la confezione.

---

## Come si misura il contrasto

**Ogni token si misura solo contro le superfici del proprio tema.** Un inchiostro del tema scuro
confrontato con la carta chiara produce un numero che sembra una bocciatura e non vuole dire
niente — è un errore già commesso in revisione, e ha fatto sembrare fuori norma due token che
nel loro tema stanno a 6,64:1 e 4,86:1.

Nel codice non è una cautela, è l'unica strada: la funzione che confronta due hex sciolti è
privata, e l'unica API pubblica è `contrastIn(theme, fg, bg)`, che risolve **entrambi** i colori
dalla stessa tavolozza. Il confronto incrociato non è "da evitare": è inesprimibile.

---

## Le regole

### 1. Nessun accento cromatico nella cornice
Non esiste un colore "di marca" nell'interfaccia. L'unico elemento forte è il **bottone
invertito**: fondo inchiostro, testo carta. Serve per l'azione primaria di una schermata — una
sola per schermata.

`test/design-tokens.test.js` rifiuta un token della cornice con dominante cromatica sopra 17.
Quel tetto **non è deriva**: è tarato sull'asse della carta calda, la cui punta misurata è
esattamente 17 (`border-strong` chiaro, `#948E83`). È abbastanza largo da accogliere il caldo,
abbastanza stretto da fermare un blu o un verde di passaggio, che partono da 40 in su. Gli stati
semantici sono esclusi per definizione.

### 2. Due ruoli di bordo, deliberatamente diversi
- **`border-hairline`** (`#E4E1DA` / `#2E2C28`) — divisori, bordi di pannello e di card, cornice
  del mockup. **Separa**, non identifica. Contrasto basso di proposito: 1,21:1.
- **`border-strong`** (`#948E83` / `#6E6860`, ≥3:1 su `surface` e `surface-raised`) — **solo** il
  perimetro dei controlli interattivi: campi di testo, bottoni opzione, traccia del segmented
  control, chip.

La ragione della differenza: sul perimetro di un controllo **il bordo È il controllo.** Il
riempimento di un campo sta appena 1,06:1 sopra la carta, quindi se il bordo scende sotto 3:1
non c'è più niente che dica dove finisce l'interfaccia e comincia lo sfondo — è WCAG 1.4.11, ed
è il punto in cui il prototipo di riferimento sbagliava (linea a 1,44:1 sui perimetri).

**Non usare `border-strong` come decorazione, non usare `border-hairline` su un perimetro
interattivo.** E `border-strong` non va usato dentro il pozzo (`surface-sunken`): lì misura
2,73:1 nel tema chiaro. Non è un problema perché nel pozzo non vivono controlli — ma se un
giorno ce ne mettessimo uno, quella è la cosa che si rompe.

### 3. Il pozzo rientra sempre
`surface-sunken` sta **sotto** `surface` in entrambi i temi. Se in scuro si invertisse, il pozzo
diventerebbe il punto più luminoso dello schermo: un riflettore puntato sulla cornice invece che
sul contenuto. È verificato dal test in entrambi i temi, non lasciato all'occhio.

### 4. Tre livelli di inchiostro, tutti sopra AA
`ink` per il testo primario, `ink-secondary` per valori ed etichette, `ink-muted` per note e
suggerimenti. Il terzo livello esiste per restituire gamma tonale, non per scendere: il pavimento
è **4,5:1 su tutte e tre le superfici, in entrambi i temi**, e il test lo genera per ogni
combinazione — un quarto livello aggiunto domani è coperto dal giorno zero.

**Credito e prezzo non usano mai `ink-muted`.** Sono le due informazioni che l'utente consulta
per decidere se spendere: vanno su `ink-secondary` o `ink`. Metterli sul grigio più tenue è un
difetto già intercettato in revisione.

### 5. Il colore semantico è riservato agli stati
`state-success`, `state-warning`, `state-danger` esistono nel sistema e oggi hanno **zero
consumatori**. La regola:

> Il colore semantico vale solo per uno stato funzionale — mai decorazione, mai enfasi, mai un
> grafico. Un errore si dichiara con le parole, con la forma e con l'azione di rimedio; il colore
> è al massimo il quarto segnale e non è mai l'unico. Aggiungere un quarto colore semantico, o
> usarne uno esistente fuori da uno stato, è una modifica del design system e richiede una
> decisione.

Non contraddice la regola 1: **un accento è decorazione ricorrente, uno stato è un evento raro e
informativo.**

### 6. Tema chiaro di default, scuro come scelta
Il tema si commuta scrivendo `data-theme="dark"` su `<html>`. Non si eredita da
`prefers-color-scheme`: il pannello destro mostra il mockup del cliente, e quel contenuto non
deve cambiare aspetto perché il sistema operativo di chi guarda è in scuro.

### 7. L'iframe del mockup NON si ricolora mai col tema dell'app
È la regola che protegge il principio. Il mockup è un artefatto autonomo, byte-identico a quello
che il cliente riceverà: se il tema scuro dell'app lo invertisse, l'app starebbe mentendo su cosa
sta consegnando. Il tema tocca la cornice e si ferma al bordo dell'iframe.

### 8. Niente ombre, gradienti, blur
La profondità è **uno scalino di superficie più un bordo hairline da 1px**. Non esiste una scala
di elevazione: è assente per scelta, non dimenticata. Un pannello sta un gradino sopra la pagina,
mai due. Se una gerarchia ha bisogno di un terzo livello, il problema è la gerarchia.

### 9. Tutti i numeri in mono, con cifre tabellari
JetBrains Mono con `font-variant-numeric: tabular-nums` per ogni cifra dell'interfaccia. Non è un
vezzo: con le cifre proporzionali un credito che scende da 10 a 9 sposta l'etichetta accanto, e
il movimento sembra un errore.

Il display (Newsreader) esiste **solo al peso 400**: è una serif da testo, e il grassetto la
trasforma in un carattere diverso. Compare una volta per schermata, non di più.

I tre caratteri sono ospitati in locale (`public/fonts`, sottoinsieme latin, licenza OFL): il
build non chiede niente a nessuno e la pagina non apre connessioni verso terzi. **Non si usa
Inter.**

---

## Il movimento

Quattro durate: `--motion-instant` 100ms (hover, focus, pressione), `--motion-quick` 160ms
(selezione di un'opzione, chip, cambio tema), `--motion-settle` 240ms con
`cubic-bezier(.2,0,0,1)` (collasso, cambio di stato di un pannello), `--motion-build` 750ms —
**solo** la sequenza di generazione, mai la cornice dell'interfaccia.

Le regole in vigore:

- **Bottoni opzione:** bordo e superficie cambiano a `instant`. **Nessuno scale, nessun lift.**
- **Cambio tema:** crossfade `quick` delle sole superfici. **Layout e tipo non si muovono mai.**
- **Niente si anima al caricamento.** L'app appare; non arriva.
- **Domanda risposta → riga di riepilogo:** `settle`, solo altezza e opacità.
- **I numeri** cambiano con un calo di opacità di 100ms e **non si spostano mai
  orizzontalmente** (cifre tabellari).
- **Sotto `prefers-reduced-motion`** la sequenza di costruzione collassa in un crossfade sul
  mockup finito, e ogni transizione scende a un cambio di opacità di 100ms.

`--motion-build` è l'unica libertà del sistema, e vive dentro il suo componente: non diventa il
precedente per animare le transizioni di pagina.

---

## Pattern composti

Tre cose che il layout richiede e che nessun ruolo singolo esprime. Si costruiscono componendo i
ruoli esistenti — **nessuno introduce un valore nuovo**. Sono dichiarati in `PATTERNS` e mostrati
in `/design`.

- **Segmented control** — traccia `surface-sunken` con perimetro `border-strong`; segmento
  selezionato `surface-raised` + testo `ink`; non selezionato trasparente + `ink-muted`. Il
  selezionato **non** usa il bottone invertito: la barra ne porterebbe tre, e l'elemento forte
  deve restare uno per schermata.
- **Chip di raffinamento** — perimetro `border-strong` (è un controllo), etichetta `ink`, costo
  in crediti `ink-secondary` in mono tabellare.
- **Pozzo del mockup** — fondo `surface-sunken`, cornice `border-hairline` (separa, non
  identifica: non è un controllo).

---

## Costanti di layout ≠ spaziature

`--layout-header` (48px) e `--layout-panel` (400px) stanno in un gruppo **separato** dalla scala
di 4px. Non sono passi di ritmo: sono decisioni di composizione. Il gruppo è separato apposta,
perché prima o poi qualcuno prova a "correggere" 400px portandolo sulla scala — e romperebbe il
layout invece di allinearlo.

---

## Come si usa

I ruoli si leggono come variabili CSS: `var(--surface)`, `var(--ink-secondary)`,
`var(--button-inverted-bg)`. **Un hex scritto in un componente è un bug**: sta dichiarando che
quel valore non cambia col tema, e quasi sempre si sbaglia.

Per vedere il sistema:

```bash
npm run dev
```

poi `http://localhost:3000/design` — ogni token con il suo valore nei due temi e il **contrasto
misurato** contro il fondo su cui compare davvero, più le tabelle delle coppie che devono
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
