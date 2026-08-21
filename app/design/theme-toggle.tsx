'use client';

import { useEffect, useState } from 'react';
import type { Theme } from '../design-tokens';

/* Il tema si commuta scrivendo data-theme su <html>: è lo stesso interruttore che userà
 * l'applicazione vera, quindi questa pagina prova il meccanismo, non una sua imitazione. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <button className="d-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Tema: <span className="num">{theme === 'light' ? 'chiaro' : 'scuro'}</span>
    </button>
  );
}
