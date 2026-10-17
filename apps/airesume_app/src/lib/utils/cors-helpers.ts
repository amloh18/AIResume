/**
 * CORS helpers for the Chrome extension.
 *
 * The extension never talks to MongoDB directly — it only calls these API routes
 * with a Bearer token (see docs/13_BROWSER_EXTENSION.md). It also asks for the
 * `<all_urls>` host permission, which exempts its service worker and side-panel
 * pages from CORS, and its content scripts only ever call same-origin endpoints
 * built from `window.location.origin`. These headers are therefore a
 * convenience, not a requirement for the extension to work.
 *
 * That is why the allowed extension origins are configurable rather than
 * "anything that calls itself an extension": reflecting `Access-Control-Allow-
 * Origin` for an arbitrary `chrome-extension://` origin with credentials lets
 * *any* installed extension make credentialed requests to the API and read the
 * responses.
 *
 * Configure with an exact-origin allowlist:
 *   EXTENSION_ORIGINS=chrome-extension://abcdefghijklmnopabcdefghijklmnop
 * Several origins may be comma- or whitespace-separated. When the variable is
 * unset the historical behaviour is kept (any `chrome-extension://` origin is
 * reflected) so an existing deployment is not broken by this change.
 */

import { NextRequest, NextResponse } from 'next/server';

const EXTENSION_SCHEME = 'chrome-extension://';

function configuredExtensionOrigins(): string[] {
  return (process.env.EXTENSION_ORIGINS || '')
    .split(/[\s,]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when `origin` is a Chrome extension origin this deployment accepts.
 * Unset `EXTENSION_ORIGINS` means "accept any extension origin" (legacy).
 */
export function isAllowedExtensionOrigin(origin: string | null | undefined): boolean {
  if (!origin || !origin.toLowerCase().startsWith(EXTENSION_SCHEME)) {
    return false;
  }

  const allowed = configuredExtensionOrigins();
  if (allowed.length === 0) {
    return true;
  }

  return allowed.includes(origin.toLowerCase());
}

function applyExtensionCorsHeaders(
  response: NextResponse | Response,
  origin: string
): NextResponse | Response {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
}

/**
 * Adds CORS headers when the request comes from an allowed extension origin.
 * Leaves the response untouched for website (and unconfigured) origins.
 */
export function setCorsHeaders(response: NextResponse | Response, request: NextRequest): NextResponse | Response {
  const origin = request.headers.get('origin');

  if (isAllowedExtensionOrigin(origin)) {
    applyExtensionCorsHeaders(response, origin as string);
  }

  return response;
}

/**
 * Answers a CORS preflight (OPTIONS) request. Returns 200 with extension CORS
 * headers for allowed extension origins, and a bare 200 otherwise.
 */
export async function handleCorsPreflight(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');

  const response = new NextResponse(null, { status: 200 });

  if (isAllowedExtensionOrigin(origin)) {
    applyExtensionCorsHeaders(response, origin as string);
  }

  return response;
}
