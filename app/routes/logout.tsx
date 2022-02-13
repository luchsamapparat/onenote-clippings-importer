import { ActionFunction } from 'remix';
import { logout } from '~/lib/authentication.server';

export const action: ActionFunction = async ({ request }) => {
  return logout(request, '/');
};