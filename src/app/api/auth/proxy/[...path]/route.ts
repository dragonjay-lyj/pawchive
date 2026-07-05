import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Reverse proxy for pawchive.pw
// Forwards all requests, rewrites Set-Cookie (strips Domain),
// and rewrites HTML to keep relative URLs working through proxy.
// ============================================================

const TARGET = "https://pawchive.pw";
const PROXY_PREFIX = "/api/auth/proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(req, await params);
}

async function proxyRequest(
  req: NextRequest,
  params: { path: string[] }
): Promise<NextResponse> {
  const rawPath = params.path ?? [];
  const path = rawPath.length > 0 ? `/${rawPath.join("/")}` : "/";

  // Preserve query string
  const searchParams = req.nextUrl.searchParams.toString();
  const targetUrl = `${TARGET}${path}${searchParams ? `?${searchParams}` : ""}`;

  // Forward request headers (except host/origin)
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "origin" || lower === "referer") return;
    forwardHeaders.set(key, value);
  });
  forwardHeaders.set("Host", "pawchive.pw");
  forwardHeaders.set("Origin", "https://pawchive.pw");
  forwardHeaders.set("Referer", "https://pawchive.pw/");

  // Read body for POST
  let body: string | undefined;
  if (req.method === "POST") {
    body = await req.text();
  }

  const upstreamRes = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body,
    redirect: "manual",
  });

  // Handle redirects — rewrite Location to go through proxy
  if (
    upstreamRes.status === 301 ||
    upstreamRes.status === 302 ||
    upstreamRes.status === 303 ||
    upstreamRes.status === 307 ||
    upstreamRes.status === 308
  ) {
    const location = upstreamRes.headers.get("location");
    const newRes = NextResponse.redirect(
      new URL(rewriteUrl(location), req.url),
      upstreamRes.status === 301 || upstreamRes.status === 308 ? 301 : 302
    );
    copySetCookie(upstreamRes, newRes);
    return newRes;
  }

  // Read response body
  const contentType = upstreamRes.headers.get("content-type") || "";
  const isHtml = contentType.includes("text/html");
  const isCss = contentType.includes("text/css");

  let responseBody: string;
  if (isHtml) {
    responseBody = await upstreamRes.text();
    responseBody = rewriteHtml(responseBody, req.url);
  } else if (isCss) {
    responseBody = await upstreamRes.text();
    responseBody = rewriteCss(responseBody);
  } else {
    // Binary or other — pass through
    const blob = await upstreamRes.arrayBuffer();
    // NextResponse rejects 304; treat as 200
    const status = upstreamRes.status === 304 ? 200 : upstreamRes.status;
    const res = new NextResponse(blob, { status });
    copyHeaders(upstreamRes, res);
    copySetCookie(upstreamRes, res);
    return res;
  }

  const status = upstreamRes.status === 304 ? 200 : upstreamRes.status;
  const res = new NextResponse(responseBody, { status });
  copyHeaders(upstreamRes, res);
  copySetCookie(upstreamRes, res);

  // Override content-type for rewritten HTML
  if (isHtml) {
    res.headers.set("content-type", "text/html; charset=utf-8");
  }

  return res;
}

// ============================================================
// Helpers
// ============================================================

function copyHeaders(from: Response, to: NextResponse) {
  from.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Skip transfer-encoding, content-encoding (we handle body ourselves)
    if (lower === "transfer-encoding" || lower === "content-encoding") return;
    if (lower === "set-cookie") return; // handled separately
    if (lower === "location") return; // handled separately
    if (lower === "content-security-policy") return; // would break iframe
    if (lower === "x-frame-options") return; // would break iframe
    to.headers.set(key, value);
  });
}

function copySetCookie(from: Response, to: NextResponse) {
  const rawCookies = from.headers.getSetCookie?.() ?? [];
  for (const cookie of rawCookies) {
    // Strip Domain=pawchive.pw so cookie falls to our domain
    // Strip SameSite=Lax/Strict if needed, and HttpOnly
    const cleaned = cookie
      .replace(/;\s*Domain=[^;]+/i, "")
      .replace(/;\s*HttpOnly/i, "")
      .replace(/;\s*Secure/i, "; Secure")
      .trim();
    to.headers.append("Set-Cookie", cleaned);
  }
}

function rewriteUrl(url: string | null): string {
  if (!url) return "/";
  // Absolute pawchive.pw URL → proxy URL
  if (url.startsWith("https://pawchive.pw")) {
    return PROXY_PREFIX + url.slice("https://pawchive.pw".length);
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url; // external, leave as-is
  }
  // Relative URL — prepend proxy prefix
  return `${PROXY_PREFIX}${url.startsWith("/") ? "" : "/"}${url}`;
}

function rewriteHtml(html: string, _proxyBase: string): string {
  let result = html;

  // Inject a script to detect login success and notify parent
  result = result.replace(
    "</head>",
    `<script>
(function() {
  // Detect when login is complete by watching for session cookie changes
  var checkCookie = function() {
    var hasSession = document.cookie.indexOf('session=') !== -1;
    if (hasSession) {
      // Notify parent window that login is complete
      window.parent.postMessage({ type: 'pawchive-login', cookie: document.cookie }, '*');
    }
  };
  // Check every 500ms
  setInterval(checkCookie, 500);
  // Also check on any click (form submission)
  document.addEventListener('click', function() { setTimeout(checkCookie, 1000); });
  document.addEventListener('submit', function() { setTimeout(checkCookie, 1000); });
})();
</script></head>`
  );

  // Rewrite absolute pawchive.pw URLs to go through proxy
  result = result.replace(
    /(href|src|action|content)="https:\/\/pawchive\.pw(\/[^"]*)"/gi,
    (_, attr, path) => `${attr}="${PROXY_PREFIX}${path}"`
  );

  // Rewrite root-relative URLs
  result = result.replace(
    /(href|src|action|content)="(\/[^"]*)"/gi,
    (_, attr, path) => {
      // Don't rewrite if it already has proxy prefix
      if (path.startsWith(PROXY_PREFIX)) return `${attr}="${path}"`;
      // Don't rewrite data URIs
      if (path.startsWith("data:")) return `${attr}="${path}"`;
      return `${attr}="${PROXY_PREFIX}${path}"`;
    }
  );

  // Note: root-relative URL rewrite above already covers form actions. No separate form action rewrite (would double-prefix).

  return result;
}

function rewriteCss(css: string): string {
  // Rewrite url() references in CSS
  return css.replace(
    /url\(["']?https:\/\/pawchive\.st(\/[^"')]*)["']?\)/gi,
    `url(${PROXY_PREFIX}$1)`
  );
}
