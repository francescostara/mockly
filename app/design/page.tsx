/* /design — i token in una pagina sola, col contrasto MISURATO accanto a ogni coppia.
 *
 * Non è una vetrina: è lo strumento con cui si guarda se una regola tiene. I rapporti sono
 * calcolati da app/design-tokens.ts, lo stesso file che genera le variabili CSS della pagina,
 * quindi non possono raccontare un colore diverso da quello che si vede.
 */

import './design.css';
import ThemeToggle from './theme-toggle';
import { COLORS, SPACE, RADIUS, MOTION, audit, contrast, valueOf, type Theme } from '../design-tokens';

export const metadata = { title: 'Mockly — design system' };

const fmt = (n: number) => n.toFixed(2);

/** Il fondo su cui quel ruolo compare davvero: le superfici si guardano contro la pagina, tutto
 *  il resto contro il pannello su cui vive. */
function backdropOf(name: string): string {
  if (name === 'surface') return 'surface';
  if (name === 'surface-raised' || name === 'surface-sunken') return 'surface';
  if (name === 'button-inverted-ink') return 'button-inverted-bg';
  return 'surface-raised';
}

function Swatch({ name, role }: { name: string; role: string }) {
  const bg = backdropOf(name);
  const rows: Array<{ t: Theme; v: string; r: number }> = (['light', 'dark'] as Theme[]).map(t => ({
    t, v: valueOf(name, t), r: contrast(valueOf(name, t), valueOf(bg, t))
  }));

  return (
    <div className="d-card d-swatch">
      <div className="d-chip" style={{ background: 'var(--' + name + ')' }} />
      <span className="nm">{name}</span>
      <span className="rl">{role}</span>
      <div className="vals">
        {rows.map(r => (
          <span key={r.t}>
            {r.t === 'light' ? 'chiaro' : 'scuro'}{' '}
            <span className="num">{r.v}</span>{' · '}
            <span className="num">{fmt(r.r)}:1</span>
          </span>
        ))}
      </div>
      <span className="rl">su <span className="num">{bg}</span></span>
    </div>
  );
}

function ContrastTable({ theme }: { theme: Theme }) {
  const rows = audit(theme);
  const failing = rows.filter(r => !r.passes).length;
  return (
    <div className="d-card" style={{ padding: '2px 0', marginBottom: 'var(--space-4)' }}>
      <table className="d-table">
        <thead>
          <tr>
            <th>{theme === 'light' ? 'Tema chiaro' : 'Tema scuro'}</th>
            <th>a cosa serve</th>
            <th style={{ textAlign: 'right' }}>misurato</th>
            <th style={{ textAlign: 'right' }}>soglia</th>
            <th>esito</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.fg + r.bg}>
              <td><span className="num">{r.fg}</span> su <span className="num">{r.bg}</span></td>
              <td className="why">{r.why}</td>
              <td className="n num">{fmt(r.ratio)}:1</td>
              <td className="n num">{fmt(r.min)}:1</td>
              <td className={'d-verdict' + (r.passes ? '' : ' no')}>{r.passes ? 'passa' : 'SOTTO SOGLIA'}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} className="why">
              {failing === 0
                ? 'Tutte le coppie rispettano la soglia. Lo verifica anche test/design-tokens.test.js, su entrambi i temi.'
                : failing + ' coppie sotto soglia: vanno scurite finché non passano.'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Scale({ title, map, unit }: { title: string; map: Record<string, string>; unit: string }) {
  return (
    <div className="d-card" style={{ padding: 'var(--space-4)' }}>
      <span className="nm" style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
      <div className="vals" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        {Object.entries(map).map(([k, v]) => (
          <span key={k}>
            <span className="num">--{unit}-{k}</span>{' '}
            <span className="num">{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DesignPage() {
  return (
    <main className="d-page">
      <div className="d-wrap">
        <div className="d-head">
          <h1>Design system</h1>
          <div className="spacer" />
          <ThemeToggle />
        </div>
        <p className="d-lede">
          L&apos;app è una cornice monocroma quieta attorno a contenuto vivido: il mockup nel pannello
          destro porta i colori del cliente finale, e l&apos;interfaccia non deve competerci. Qui non
          esiste un accento cromatico, e la profondità è uno scalino di superficie più un bordo di
          un pixel — nessuna ombra, nessun gradiente, nessun blur.
        </p>

        <section className="d-sec">
          <h2>Contrasto</h2>
          <p>
            Misurato, non dichiarato. Il testo attenuato — dove vivono credito e prezzo — è il posto
            in cui un design system monocromo tende a sbagliare: qui è tenuto al minimo AA, non al
            grigio più elegante.
          </p>
          <ContrastTable theme="light" />
          <ContrastTable theme="dark" />
        </section>

        <section className="d-sec">
          <h2>Colore</h2>
          <p>
            Ruoli, non colori. Ogni valore cambia col tema tramite <span className="num">[data-theme]</span>;
            un componente che scrive un hex sta dichiarando che quel valore non cambia mai col tema,
            e quasi sempre si sbaglia.
          </p>
          <div className="d-grid">
            {COLORS.map(c => <Swatch key={c.name} name={c.name} role={c.role} />)}
          </div>
        </section>

        <section className="d-sec">
          <h2>Tipografia</h2>
          <p>
            Newsreader per la voce (solo il peso 400), Public Sans per l&apos;interfaccia, JetBrains Mono
            per tutti i numeri. Le cifre sono tabellari: un credito che scende da 10 a 9 non deve
            spostare l&apos;etichetta accanto.
          </p>
          <div className="d-card d-spec">
            <p className="display">Descrivi il report. Ottieni un mockup che puoi mandare al cliente.</p>
            <p className="body">
              Public Sans a 14,5px con interlinea 1,65: il testo dell&apos;interfaccia deve sparire
              mentre lo si legge. Il carattere display compare una volta per schermata, non di più.
            </p>
            <div className="figures">
              <span className="fig"><span className="k">crediti</span><span className="v num">10</span></span>
              <span className="fig"><span className="k">poi</span><span className="v num">9</span></span>
              <span className="fig"><span className="k">prezzo</span><span className="v num">€0,18</span></span>
              <span className="fig"><span className="k">latenza</span><span className="v num">53,7s</span></span>
            </div>
          </div>
        </section>

        <section className="d-sec">
          <h2>Controlli</h2>
          <p>
            L&apos;unico elemento forte dell&apos;interfaccia è il bottone invertito. Tutto il resto è
            contorno: un bordo visibile, non un&apos;ombra.
          </p>
          <div className="d-card d-row">
            <button className="d-btn">Genera il mockup</button>
            <button className="d-btn ghost">Ricomincia</button>
            <input className="d-field" defaultValue="Report mensile per una catena di palestre" aria-label="esempio di campo" />
          </div>
        </section>

        <section className="d-sec">
          <h2>Superficie incassata</h2>
          <p>
            Il palco su cui poggia il mockup. È l&apos;unico posto dell&apos;app dove il colore è ammesso —
            perché non è colore dell&apos;app: è il contenuto del cliente, dentro un iframe che il tema
            non tocca mai.
          </p>
          <div className="d-sunken">qui vive l&apos;iframe del mockup — l&apos;app non lo ricolora</div>
        </section>

        <section className="d-sec">
          <h2>Spazio, raggi, movimento</h2>
          <p>
            Il movimento è solo funzionale: dice che qualcosa è cambiato. L&apos;unica eccezione è
            l&apos;animazione di generazione, che resta nel suo componente e non si propaga altrove.
          </p>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <Scale title="Spazio" map={SPACE} unit="space" />
            <Scale title="Raggi" map={RADIUS} unit="radius" />
            <Scale title="Movimento" map={MOTION} unit="motion" />
          </div>
        </section>
      </div>
    </main>
  );
}
