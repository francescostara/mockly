import type { Metadata } from 'next';
import './globals.css';
import { fontClassNames } from './fonts';
import { tokensCss } from './design-tokens';

export const metadata: Metadata = {
  title: 'Mockly — generatore di mockup BI',
  description: 'Descrivi il report, ottieni un mockup interattivo.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* data-theme="light" esplicito: il tema si sceglie, non si eredita dal sistema. Il pannello
       destro mostra il mockup del CLIENTE, e quel contenuto non deve cambiare aspetto perché
       il sistema operativo di chi guarda è in scuro. */
    <html lang="it" data-theme="light" className={fontClassNames}>
      <head>
        {/* Le variabili sono generate da app/design-tokens.ts, l'unica fonte di verità: così la
            pagina e la misura di contrasto in /design non possono divergere. */}
        <style dangerouslySetInnerHTML={{ __html: tokensCss() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
