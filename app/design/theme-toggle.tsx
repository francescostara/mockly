'use client';

import { useTheme } from '../theme';

/* Il tema si commuta con lo stesso meccanismo dell'applicazione vera (attributo su <html> +
 * scelta salvata), quindi questa pagina prova il meccanismo e non una sua imitazione. */
export default function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  return (
    <button className="d-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Tema: <span className="num">{theme === 'light' ? 'chiaro' : 'scuro'}</span>
    </button>
  );
}
