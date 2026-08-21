import type { Metadata } from 'next';
import './globals.css';
import { fontClassNames } from './fonts';
import { tokensCss } from './design-tokens';
import { THEME_BOOT } from './theme';

export const metadata: Metadata = {
  title: 'Mockly — generatore di mockup BI',
  description: 'Descrivi il report, ottieni un mockup interattivo.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* Nessun data-theme scritto qui: lo mette THEME_BOOT prima del primo pixel, leggendo la
       scelta salvata e, se non c'è, prefers-color-scheme. Un valore fisso nel markup
       produrrebbe il lampo di tema sbagliato che quello script esiste per evitare. */
    <html lang="it" className={fontClassNames} suppressHydrationWarning>
      <head>
        {/* Le variabili sono generate da app/design-tokens.ts, l'unica fonte di verità: così la
            pagina e la misura di contrasto in /design non possono divergere. */}
        <style dangerouslySetInnerHTML={{ __html: tokensCss() }} />
        {/* sincrono e prima di tutto: se corresse dopo, il tema arriverebbe a pagina dipinta */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
