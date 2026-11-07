import { NextResponse } from "next/server";

// PASS 02 — Security Stabilization
// Both legacy actions are intentionally disabled until real systems replace them:
//   persist_images -> was an unauthenticated write of client data into /public (and
//                     Vercel's runtime filesystem is read-only / non-persistent anyway).
//   checkout       -> was returning fake order confirmations with no payment.
// Replacements: object storage + admin-only upload (later pass), Stripe Checkout
// with verified webhooks + server-side entitlements (PASS 07).

const MAX_BODY_BYTES = 4 * 1024; // nothing legitimate is posted here anymore

type Action = "persist_images" | "checkout";

const DISABLED: Record<Action, string> = {
  persist_images: "Image saving is turned off. Images now ship with the site.",
  checkout: "Checkout is not open yet. No order was placed and no payment was taken.",
};

function isAction(value: unknown): value is Action {
  return value === "persist_images" || value === "checkout";
}

function tooLarge() {
  return NextResponse.json({ ok: false, error: "Request too large" }, { status: 413 });
}

/**
 * Reads the request body as UTF-8 text, stopping as soon as more than `limit`
 * bytes have arrived. Returns null when the limit is exceeded.
 * Counting streamed bytes (not trusting Content-Length) covers chunked bodies
 * and clients that send a false Content-Length.
 * MDN: Request.body, ReadableStream.getReader(), ReadableStreamDefaultReader.cancel(), TextDecoder.
 */
async function readBodyWithLimit(req: Request, limit: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(req: Request) {
  // Fast path: reject an honest oversized Content-Length without reading anything.
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return tooLarge();

  let raw: string | null;
  try {
    raw = await readBodyWithLimit(req, MAX_BODY_BYTES);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (raw === null) return tooLarge();

  let action: unknown;
  try {
    const parsed: unknown = JSON.parse(raw);
    action =
      parsed && typeof parsed === "object" ? (parsed as { action?: unknown }).action : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (isAction(action)) {
    return NextResponse.json(
      { ok: false, disabled: true, action, error: DISABLED[action] },
      { status: 503 }
    );
  }

  // Never echo internal error text back to the client.
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
