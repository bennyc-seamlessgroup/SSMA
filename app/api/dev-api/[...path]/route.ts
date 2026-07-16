import { NextRequest, NextResponse } from 'next/server';

const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? '';

async function proxyRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  if (!apiGatewayUrl) {
    return NextResponse.json({ message: 'NEXT_PUBLIC_API_GATEWAY_URL is not configured.' }, { status: 500 });
  }

  const { path } = await context.params;
  const target = `${apiGatewayUrl}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  if (authorization) headers.set('authorization', authorization);
  if (contentType) headers.set('content-type', contentType);

  try {
    const method = request.method.toUpperCase();
    const response = await fetch(target, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
    });
    const responseHeaders = new Headers();
    const responseContentType = response.headers.get('content-type');
    if (responseContentType) responseHeaders.set('content-type', responseContentType);

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to reach API Gateway.' },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
