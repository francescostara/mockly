'use client';

/* Il tema: ereditato alla prima visita, scelto per sempre alla prima scelta.
 *
 * Alla prima visita si eredita da `prefers-color-scheme` — è quello che l'utente ha già detto
 * al sistema operativo, e chiederglielo di nuovo sarebbe far finta di non aver sentito. Una
 * scelta esplicita vince e persiste in localStorage: da quel momento il sistema non conta più.
 *
 * Il mockup del cliente resta comunque fuori da questa storia: lo protegge la regola
 * dell'iframe, che non eredita il tema in nessun caso. Quindi il tema dell'app può seguire chi
 * guarda senza toccare quello che si sta guardando.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Theme } from './design-tokens';

export const THEME_KEY = 'mockly-theme';

/* Gira nel <head>, PRIMA che il corpo venga dipinto: senza questo la pagina apparirebbe chiara
   per un fotogramma e poi diventerebbe scura, che è il lampo che si nota di più. Deve restare
   sincrono, minuscolo e senza dipendenze — è l'unico script che precede il rendering. */
export const THEME_BOOT = [
  '(function(){try{',
  'var s=localStorage.getItem("' + THEME_KEY + '");',
  'var t=(s==="light"||s==="dark")?s:',
  '(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");',
  'document.documentElement.setAttribute("data-theme",t);',
  '}catch(e){document.documentElement.setAttribute("data-theme","light");}})()'
].join('');

function current(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function useTheme(): [Theme, (t: Theme) => void] {
  /* si parte da 'light' e si allinea al montaggio: lo stato iniziale del server non conosce
     né localStorage né il sistema, e indovinare qui produrrebbe un mismatch di idratazione.
     L'attributo giusto è già sull'elemento, messo da THEME_BOOT prima del primo pixel. */
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => { setThemeState(current()); }, []);

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch { /* modalità privata: vale per la sessione */ }
    setThemeState(t);
  }, []);

  return [theme, setTheme];
}
