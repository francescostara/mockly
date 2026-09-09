/* Fa girare la pipeline vera di /api/generate senza server e senza crediti.
 *
 *   npx tsx test/generate-offline.ts
 *
 * PRUVA_STUB=1 e impostato qui dentro: il modello non viene chiamato. Serve a dimostrare
 * che il percorso regge (parse -> dati -> validazione -> render), che non torna una domanda
 * e che un errore degrada invece di far crashare. NON dimostra il riconoscimento nicchia:
 * lo stub risponde sempre la stessa spec, per quello serve una chiamata vera.
 */
process.env.PRUVA_STUB = process.env.PRUVA_STUB || process.env.MOCKLY_STUB || '1';

const BRIEFS = [
  'Report per una palestra con tre sedi a Milano.',
  'Report mensile per il CFO di una media impresa manifatturiera.'
];

async function main() {
  const { POST } = await import('../app/api/generate/route');
  for (const brief of BRIEFS) {
    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brief, intake: { audience: 'owner', branding: 'none', comparison: 'YoY', scope: 'single' } })
    });
    const res = await POST(req as never);
    const body = await res.json() as Record<string, unknown>;
    const meta = (body.meta || {}) as Record<string, unknown>;
    const html = String(body.html || '');
    console.log('  ' + (res.status === 200 ? 'ok ' : 'ERRORE ' + res.status) +
      ' | modello ' + meta.model +
      ' | valida ' + meta.valid + ' | riparazioni ' + meta.repairs + ' | fallback ' + meta.fallback +
      ' | html ' + Math.round(html.length / 1024) + 'KB' +
      ' | ' + brief.slice(0, 38));
    if (!html.includes('<!DOCTYPE html>')) console.log('     ATTENZIONE: html non renderizzato');
  }
}
main();
