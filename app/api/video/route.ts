/* /api/video — il bottone "Esporta video".
 *
 * GET  dice se l'esportazione e possibile su questa macchina (il bottone si attiva solo allora).
 * POST riceve il mockup a schermo e restituisce l'mp4 registrato da scripts/video.js.
 *
 * Tutta la logica sta in lib/video-export.js, che i test leggono senza Next. Qui niente crediti:
 * la registrazione non chiama nessun modello.
 */

import { NextRequest, NextResponse } from 'next/server';
import { disponibile, esporta } from '@/lib/video-export.js';

export const runtime = 'nodejs';
/* una registrazione dura 20-40 secondi */
export const maxDuration = 120;

export async function GET() {
  return NextResponse.json(disponibile());
}

export async function POST(req: NextRequest) {
  const d = disponibile();
  if (!d.ok) return NextResponse.json({ error: 'export video non disponibile qui', motivo: d.motivo }, { status: 501 });
  let body: { html?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'richiesta non valida' }, { status: 400 }); }
  try {
    const mp4: Buffer = await esporta(body.html || '');
    return new NextResponse(new Uint8Array(mp4), {
      headers: { 'content-type': 'video/mp4', 'content-disposition': 'attachment; filename="pruva-demo.mp4"' }
    });
  } catch (e) {
    const err = e as Error & { status?: number; log?: string };
    if (err.log) console.error('[video]', err.log);
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
