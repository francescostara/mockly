/* I tre caratteri, ospitati in locale.
 *
 * I .woff2 stanno in public/fonts (sottoinsieme latin, licenza OFL per tutti e tre): il build
 * non chiede niente a nessuno e la pagina non apre connessioni verso terzi. next/font/local
 * genera le @font-face e le `variable` CSS, e aggiunge size-adjust sul fallback, così lo
 * scambio di carattere non fa saltare il layout.
 *
 * Perché tre e non uno: il display porta la voce (Newsreader, SOLO 400 — è una serif da testo,
 * il grassetto la trasforma in un'altra cosa), il testo porta l'interfaccia, il mono porta
 * TUTTI i numeri. I numeri in mono non sono un vezzo: con le cifre tabellari un credito che
 * scende da 10 a 9 non sposta l'etichetta accanto.
 */

import localFont from 'next/font/local';

export const display = localFont({
  src: '../public/fonts/newsreader-latin-400.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-display',
  fallback: ['Georgia', 'Times New Roman', 'serif']
});

export const text = localFont({
  src: '../public/fonts/public-sans-latin-var.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  variable: '--font-text',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
});

export const mono = localFont({
  src: '../public/fonts/jetbrains-mono-latin-var.woff2',
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  variable: '--font-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
});

export const fontClassNames = [display.variable, text.variable, mono.variable].join(' ');
