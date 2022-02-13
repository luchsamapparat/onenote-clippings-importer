import { ConfidentialClientApplication, ICachePlugin, LogLevel } from '@azure/msal-node';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { redirect } from 'remix';
import { removeFromSessionStorage, retrieveFromSessionStorage, storeInSessionStorage } from './session.server';

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error('CLIENT_ID and/or CLIENT_SECRET environment variables not set.');
}

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const scopes = ['user.read', 'Notes.Read'];
const sessionKey = 'authentication';
const cachePath = resolve(__dirname, '../.cache/auth');

const cachePlugin: ICachePlugin = {
  async beforeCacheAccess(cacheContext) {
    try {
      const cacheContents = await readFile(cachePath, 'utf8');
      cacheContext.tokenCache.deserialize(cacheContents);
    } catch (error: unknown) {
      return;
    }
  },

  async afterCacheAccess(cacheContext) {
    if (cacheContext.cacheHasChanged) {
      await writeFile(
        cachePath,
        cacheContext.tokenCache.serialize()
      );
    }
  }
};

const clientApplication = new ConfidentialClientApplication({
  cache: {
    cachePlugin
  },
  auth: {
    clientId,
    clientSecret
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(loglevel, message, containsPii);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    }
  }
});

export async function getAuthenticationUrl(request: Request) {
  return clientApplication.getAuthCodeUrl({
    scopes,
    prompt: 'select_account',
    redirectUri: getRedirectUri(request)
  });
}

export async function logout(request: Request, redirectTo: string) {
  const account = await getAccount(request);

  if (!account) {
    return redirect(redirectTo);
  }

  await clientApplication.getTokenCache().removeAccount(account);
  return removeFromSessionStorage(request, sessionKey, redirectTo);
}

export async function handleAuthenticationCallback(request: Request, redirectTo: string) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    throw new Error('No code in authentication callback.');
  }

  const response = await clientApplication.acquireTokenByCode({
    scopes,
    code,
    redirectUri: getRedirectUri(request)
  });

  if (!response?.account?.homeAccountId) {
    throw new Error('Failed to retrieve home account ID.');
  }

  return storeInSessionStorage(request, sessionKey, response.account?.homeAccountId, redirectTo);
}

export async function getAccount(request: Request) {
  const homeAccountId = await retrieveFromSessionStorage(request, sessionKey);

  if (!homeAccountId) {
    return null;
  }

  const msalTokenCache = clientApplication.getTokenCache();
  const account = await msalTokenCache.getAccountByHomeId(homeAccountId);

  return account ?? null;
}

export async function isAuthenticated(request: Request) {
  const account = await getAccount(request);
  return account !== null;
}

export async function getAccessToken(request: Request): Promise<string | null> {
  try {
    const authentication = await trySilentAuthentication(request);
    console.warn('⏰', authentication?.expiresOn);
    return authentication?.accessToken ?? null;
  } catch (error: unknown) {
    return null;
  }
}

async function trySilentAuthentication(request: Request) {
  const account = await getAccount(request);

  if (!account) {
    return null;
  }

  try {
    return clientApplication.acquireTokenSilent({ account, scopes });
  } catch (error: unknown) {
    return null;
  }
}

function getRedirectUri(request: Request) {
  const redirectUri = new URL(request.url);
  redirectUri.pathname = '/authenticationCallback';
  redirectUri.search = new URLSearchParams().toString();
  return redirectUri.toString();
}
