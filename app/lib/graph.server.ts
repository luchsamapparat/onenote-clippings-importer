import { Client, ResponseType } from '@microsoft/microsoft-graph-client';
import { getAccessToken } from './authentication.server';

async function getClient(request: Request) {
  return Client.initWithMiddleware({
    authProvider: {
      async getAccessToken() {
        const accessToken = await getAccessToken(request);

        if (!accessToken) {
          throw new Error('Not authenticated');
        }

        return accessToken;
      }
    }
  });
}

export async function sendRequest(request: Request) {
  const client = await getClient(request);
  return client
    .api('/me/onenote/notebooks')
    .version('v1.0')
    .responseType(ResponseType.JSON)
    .get();
}