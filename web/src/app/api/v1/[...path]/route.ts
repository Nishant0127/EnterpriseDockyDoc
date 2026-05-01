import { NextRequest, NextResponse } from 'next/server';

/**
 * Catch-all proxy: /api/v1/* → Render backend.
 *
 * Browser always calls same-origin Vercel, so CORS is never an issue.
 * The Authorization header (Clerk JWT) is forwarded as-is; the Render
 * ClerkAuthGuard validates it there.
 *
 * BACKEND_URL resolution order:
 *   1. API_URL env var (Vercel dashboard → server-side only, no NEXT_PUBLIC_)
 *   2. NEXT_PUBLIC_API_URL env var (legacy; still works)
 *   3. Hardcoded staging URL (zero-config fallback for Vercel deploys)
 *   4. localhost:8081 (local dev without any env vars)
 */
const BACKEND_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://dockydoc-api-staging.onrender.com'
    : 'http://localhost:8081');

const FORWARDED_REQUEST_HEADERS = [
  'authorization',
  'content-type',
  'x-dev-user-email',
];

async function proxy(
  req: NextRequest,
  params: { path: string[] },
): Promise<NextResponse> {
  const segment = params.path.join('/');
  const targetUrl = new URL(`${BACKEND_URL}/api/v1/${segment}`);

  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const forwardHeaders = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) forwardHeaders.set(name, value);
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method);

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: forwardHeaders,
      ...(hasBody
        ? { body: req.body, duplex: 'half' }
        : {}),
    } as RequestInit & { duplex?: string });
  } catch {
    return NextResponse.json(
      { message: 'Upstream API unreachable', url: targetUrl.origin },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) responseHeaders.set('content-type', ct);
  const cd = upstream.headers.get('content-disposition');
  if (cd) responseHeaders.set('content-disposition', cd);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, await ctx.params);
}
