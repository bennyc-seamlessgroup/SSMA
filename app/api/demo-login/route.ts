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

type CognitoAuthAttempt = {
  response: Response;
  payload: Record<string, unknown>;
  errorType: string;
};

async function authenticateDemoAccount({
  clientId,
  password,
  region,
}: {
  clientId: string;
  password: string;
  region: string;
}): Promise<CognitoAuthAttempt> {
  const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
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
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  return {
    response,
    payload,
    errorType: String(payload.__type ?? '').split('#').at(-1) ?? '',
  };
}

function authenticationError(attempt: CognitoAuthAttempt) {
  const message = attempt.errorType === 'InvalidParameterException'
    ? 'The Cognito demo client must enable USER_PASSWORD_AUTH.'
    : attempt.errorType === 'UserNotFoundException'
      ? 'The native Cognito demo account was not found.'
      : attempt.errorType === 'UserNotConfirmedException'
        ? 'The native Cognito demo account is not confirmed.'
        : attempt.errorType === 'PasswordResetRequiredException'
          ? 'The native Cognito demo account requires a password reset.'
          : attempt.errorType === 'NotAuthorizedException'
            ? 'The demo account password is not valid.'
            : 'Automatic demo sign in failed.';
  const status = attempt.response.status >= 400 && attempt.response.status < 600
    ? attempt.response.status
    : 502;
  return { message, status };
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return noStoreJson({ message: 'Demo sign in must be started from this portal.' }, 403);
  }

  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  const demoClientId = (process.env.DEMO_COGNITO_CLIENT_ID || '').trim();
  const portalClientId = (process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '').trim();
  const clientIds = [...new Set([demoClientId, portalClientId].filter(Boolean))];
  const region = cognitoRegion();
  if (!password || !clientIds.length || !region) {
    return noStoreJson({ message: 'Automatic demo sign in is not configured.' }, 503);
  }

  let attempt: CognitoAuthAttempt | null = null;
  try {
    for (const clientId of clientIds) {
      attempt = await authenticateDemoAccount({ clientId, password, region });
      if (attempt.response.ok) break;

      // A stale dedicated demo client can belong to an older user pool or can
      // lack password-auth support. In those two configuration cases, retry
      // with the portal client used by the known-working manual login flow.
      const canTryPortalClient = clientId !== portalClientId
        && Boolean(portalClientId)
        && ['UserNotFoundException', 'InvalidParameterException'].includes(attempt.errorType);
      if (!canTryPortalClient) break;
    }
  } catch {
    return noStoreJson({ message: 'The demo authentication service could not be reached.' }, 502);
  }

  if (!attempt || !attempt.response.ok) {
    const error = attempt
      ? authenticationError(attempt)
      : { message: 'Automatic demo sign in failed.', status: 502 };
    return noStoreJson({ message: error.message }, error.status);
  }

  const payload = attempt.payload;

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
