import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mockly — generatore di mockup BI',
  description: 'Descrivi il report, ottieni un mockup interattivo.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
