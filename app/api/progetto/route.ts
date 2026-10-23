/* /api/progetto — il flusso guidato, fase B (Structure, Template, Build senza AI).
 *
 * POST riceve { op, storia, azione, pagina, ... } e restituisce la storia nuova, l'anteprima e le
 * scelte delle schermate. Il server non ricorda niente: la storia viaggia col client, annulla e
 * ripeti compresi. Tutta la logica sta in lib/progetto-api.js, che i test leggono senza Next.
 * Nessun modello: zero crediti, in locale e online.
 */

import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeRequire: NodeRequire = eval('require');
const api: { gestisci: (req: unknown) => Record<string, unknown> } = nodeRequire(path.join(process.cwd(), 'lib', 'progetto-api.js'));

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, errori: ['invalid request'] }, { status: 400 }); }
  return NextResponse.json(api.gestisci(body));
}
