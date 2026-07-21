import { NextRequest, NextResponse } from 'next/server';

const TARGET = 'https://pawchive.pw/api';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxyRequest(req, await params); }
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxyRequest(req, await params); }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxyRequest(req, await params); }

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cookie, X-Pawchive-Session',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function proxyRequest(req: NextRequest, params: { path: string[] }): Promise<NextResponse> {
  const rawPath = params.path ?? [];
  const path = rawPath.length > 0 ? '/' + rawPath.join('/') : '';
  const search = req.nextUrl.searchParams.toString();
  const targetUrl = TARGET + path + (search ? '?' + search : '');

  const forwardHeaders = new Headers();
  req.headers.forEach((v, k) => {
    const lo = k.toLowerCase();
    if (lo === 'host' || lo === 'origin' || lo === 'referer') return;
    if (lo === 'cookie') return; // rebuilt below
    if (lo === 'x-pawchive-session') return; // internal, don't leak
    forwardHeaders.set(k, v);
  });
  forwardHeaders.set('Host', 'pawchive.pw');
  forwardHeaders.set('Origin', 'https://pawchive.pw');
  forwardHeaders.set('Referer', 'https://pawchive.pw/');

  // Merge browser cookies with client-provided session (localStorage) so
  // that the upstream `session=…` cookie is set even though browsers
  // forbid JS from writing a `Cookie` header directly.
  const cookieParts: string[] = [];
  const browserCookie = req.headers.get('cookie');
  const sessionOverride = req.headers.get('x-pawchive-session');

  if (browserCookie) {
    if (sessionOverride) {
      // Replace existing session= value with the override
      const cleaned = browserCookie.replace(/(^|;\s*)session=[^;]*/, '').replace(/^;\s*/, '');
      if (cleaned) cookieParts.push(cleaned);
    } else {
      cookieParts.push(browserCookie);
    }
  }
  if (sessionOverride) cookieParts.push(`session=${sessionOverride}`);
  if (cookieParts.length) forwardHeaders.set('Cookie', cookieParts.join('; '));

  // Present as a real browser — the upstream Cloudflare rules are UA-gated.
  if (!forwardHeaders.has('user-agent')) {
    forwardHeaders.set(
      'user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    );
  }
  forwardHeaders.set('accept-language', 'en-US,en;q=0.9');

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') body = await req.text();

  // Retry transient upstream failures (rate limit / gateway) with backoff.
  // Only idempotent GETs are retried; POST/DELETE go through once.
  const RETRYABLE = new Set([429, 502, 503, 504, 520, 521, 522, 523, 524]);
  const maxAttempts = req.method === 'GET' ? 3 : 1;
  let up: Response | null = null;
  let lastStatus = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Honor Retry-After when present, else exponential backoff (capped).
      const retryAfter = up?.headers.get('retry-after');
      let waitMs = Math.min(2000 * 2 ** (attempt - 1), 6000);
      if (retryAfter) {
        const secs = Number(retryAfter);
        if (Number.isFinite(secs)) waitMs = Math.min(secs * 1000, 8000);
      }
      await new Promise((r) => setTimeout(r, waitMs));
    }
    try {
      up = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body,
        redirect: 'follow',
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      lastStatus = 502;
      up = null;
      continue;
    }
    lastStatus = up.status;
    if (!RETRYABLE.has(up.status)) break;
  }

  if (!up) {
    return NextResponse.json(
      { error: 'upstream-unreachable', status: lastStatus },
      { status: 502, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }

  const h = new Headers();
  up.headers.forEach((v, k) => {
    const lo = k.toLowerCase();
    if (lo === 'transfer-encoding' || lo === 'content-encoding') return;
    h.set(k, v);
  });
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, Cookie, X-Pawchive-Session');
  return new NextResponse(await up.arrayBuffer(), {
    status: up.status,
    statusText: up.statusText,
    headers: h,
  });
}