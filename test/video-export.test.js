#!/usr/bin/env node
/* IL BOTTONE "ESPORTA VIDEO" — attivo solo dove funziona, e quando funziona produce un video vero.
 *
 * Tre cose: il bottone si spegne dove l'esportazione non puo funzionare (su Vercel, o senza
 * Chrome/Playwright/ffmpeg) invece di fallire al clic; la route accetta solo un mockup di Pruva,
 * non un HTML qualsiasi da far girare in un browser; e sulla macchina dove e attiva, un clic
 * produce davvero un mp4 del mockup — lo stesso registratore di `npm run video`, non una copia.
 */
'use strict';
const assert = require('assert');
const { spawnSync } = require('child_process');
const V = require('../lib/video-export.js');
const { render } = require('../engine/render.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const okAsync = async (label, fn) => { await fn(); n++; console.log('  ok  ' + label); };

console.log('export video dall app (attivo solo dove funziona davvero)');

(async () => {
  ok('su Vercel il bottone e spento, e dice perche', () => {
    const d = V.disponibile({ VERCEL: '1' });
    assert.strictEqual(d.ok, false);
    assert.strictEqual(d.motivo, 'serverless');
  });

  ok('la route accetta solo un mockup di Pruva', () => {
    assert.ok(V.valida(''), 'vuoto');
    assert.ok(V.valida('<html><script>alert(1)</script></html>'), 'un HTML qualsiasi non e un mockup');
    assert.ok(V.valida('x'.repeat(V.MAX_HTML + 1)), 'troppo grande');
    const c = require('../engine/templates/index.js')['canonical-funnel'];
    assert.strictEqual(V.valida(render(c.spec, c.build())), null, 'un mockup vero deve passare');
  });

  ok('esporta sempre la versione breve, con lo script di npm run video', () => {
    const a = V.argomenti('m.html', 'out.mp4');
    assert.ok(/scripts[\\/]video\.js$/.test(a[0]), 'deve usare il registratore esistente');
    assert.ok(a.includes('--feed') && a.includes('--dest=out.mp4'));
    assert.ok(!a.some(x => /^--passi/.test(x)), 'il bottone registra sempre la versione breve intera, senza restringere i passi');
  });

  const d = V.disponibile();
  if (!d.ok) {
    console.log('  --  registrazione vera saltata: qui manca ' + d.motivo + ' (il bottone sarebbe spento)');
  } else {
    await okAsync('dove e attivo, un clic produce un mp4 vero del mockup', async () => {
      const c = require('../engine/templates/index.js')['canonical-funnel'];
      /* un blocco solo (il reset): stesso registratore, stessa risoluzione e codifica del
         bottone, un video di tre secondi e mezzo invece di venti — mezzo minuto in meno a giro */
      const mp4 = await V.esporta(render(c.spec, c.build()), { passi: ['reset'] });
      assert.ok(mp4.length > 30 * 1024, 'un video di pochi KB non e un video: ' + mp4.length);
      /* "ftyp" nei primi byte: e davvero un mp4, non un messaggio d'errore salvato come file */
      assert.strictEqual(mp4.slice(4, 8).toString('ascii'), 'ftyp');
      const tmp = require('path').join(require('os').tmpdir(), 'pruva-video-test.mp4');
      require('fs').writeFileSync(tmp, mp4);
      const p = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', tmp], { encoding: 'utf8' });
      require('fs').rmSync(tmp, { force: true });
      assert.strictEqual(p.stdout.trim().split(',').slice(0, 2).join(','), '2560,1440');
    });
  }
  console.log('  ' + n + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
