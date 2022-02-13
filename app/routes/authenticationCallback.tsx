import { LoaderFunction } from 'remix';
import { handleAuthenticationCallback } from '~/lib/authentication.server';

export const loader: LoaderFunction = async ({ request }) => {
  return handleAuthenticationCallback(request, '/');
};