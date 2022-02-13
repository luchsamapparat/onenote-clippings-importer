import { createCookieSessionStorage, redirect, Session } from 'remix';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable not set.');
}

const sessionSecret = process.env.SESSION_SECRET;

const storage = createCookieSessionStorage({
  cookie: {
    name: 'onci_session',
    secure: true,
    secrets: [sessionSecret],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true
  }
});

export async function storeInSessionStorage(request: Request, key: string, value: string, redirectTo: string) {
  const session = await storage.getSession(request.headers.get('Cookie'));
  session.set(key, value);
  return updateCookie(session, redirectTo);
}

export async function retrieveFromSessionStorage(request: Request, key: string): Promise<string | null> {
  const session = await storage.getSession(request.headers.get('Cookie'));
  return session.get(key);
}

export async function removeFromSessionStorage(request: Request, key: string, redirectTo: string) {
  const session = await storage.getSession(request.headers.get('Cookie'));
  session.unset(key);
  return updateCookie(session, redirectTo);
}

async function updateCookie(session: Session, redirectTo: string) {
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await storage.commitSession(session)
    }
  });
}