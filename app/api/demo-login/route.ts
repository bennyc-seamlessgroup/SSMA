import { NextResponse } from 'next/server';
import { publicDemoEmail } from '@/lib/public-demo';

export const dynamic = 'force-dynamic';

function cognitoRegion() {
  const configured = process.env.AWS_REGION?.trim();
  if (configured) return configured;
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? '';
  return domain.match(/\.auth\.([a-z0-9-]+)\.amazoncognito\.com$/i)?.[1] ?? '';
}

function noStoreJson(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    },
  });
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return noStoreJson({ message: 'Demo sign in must be started from this portal.' }, 403);
  }

  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  const clientId = (process.env.DEMO_COGNITO_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '').trim();
  const region = cognitoRegion();
  if (!password || !clientId || !region) {
    return noStoreJson({ message: 'Automatic demo sign in is not configured.' }, 503);
  }

  let response: Response;
  try {
    response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: publicDemoEmail,
          PASSWORD: password,
        },
      }),
      cache: 'no-store',
    });
  } catch {
    return noStoreJson({ message: 'The demo authentication service could not be reached.' }, 502);
  }

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const errorType = String(payload.__type ?? '').split('#').at(-1) ?? '';
    const message = errorType === 'InvalidParameterException'
      ? 'The Cognito demo client must enable USER_PASSWORD_AUTH.'
      : errorType === 'UserNotFoundException'
        ? 'The native Cognito demo account was not found.'
        : errorType === 'UserNotConfirmedException'
          ? 'The native Cognito demo account is not confirmed.'
          : errorType === 'PasswordResetRequiredException'
            ? 'The native Cognito demo account requires a password reset.'
            : errorType === 'NotAuthorizedException'
              ? 'The demo account password is not valid.'
              : 'Automatic demo sign in failed.';
    return noStoreJson({ message }, response.status >= 400 && response.status < 600 ? response.status : 502);
  }

  if (payload.ChallengeName) {
    return noStoreJson({ message: 'The demo account requires an unsupported authentication challenge.' }, 409);
  }

  const authentication = payload.AuthenticationResult as Record<string, unknown> | undefined;
  const accessToken = String(authentication?.AccessToken ?? '');
  const idToken = String(authentication?.IdToken ?? '');
  const refreshToken = String(authentication?.RefreshToken ?? '');
  if (!accessToken || !idToken || !refreshToken) {
    return noStoreJson({ message: 'Cognito did not return a complete demo session.' }, 502);
  }

  return noStoreJson({ accessToken, idToken, refreshToken });
}
