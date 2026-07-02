import { NextRequest, NextResponse } from 'next/server';

const TARGET = 'https://pawchive.st/api';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxyRequest(req, await params); }
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxyRequest(req, await params); }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) { return proxyRequest(req, await params); }

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Cookie', 'Access-Control-Max-Age': '86400' } });
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
  forwardHeaders.set('Host', 'pawchive.st');

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

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') body = await req.text();

  const up = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body,
    redirect: 'follow',
  });

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