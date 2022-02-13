import { AccountInfo } from '@azure/msal-node';
import { ActionFunction, LoaderFunction, useActionData, useLoaderData } from 'remix';
import { getAccount, getAuthenticationUrl, isAuthenticated } from '~/lib/authentication.server';
import { sendRequest } from '~/lib/graph.server';

type LoaderData = {
  isAuthenticated: boolean;
  account: AccountInfo | null;
  loginUrl: string;
};

export const loader: LoaderFunction = async ({ request }): Promise<LoaderData> => ({
  isAuthenticated: await isAuthenticated(request),
  account: await getAccount(request),
  loginUrl: await getAuthenticationUrl(request)
});

export const action: ActionFunction = async ({ request }) => {
  return sendRequest(request);
};

export default function Index() {
  const { isAuthenticated, loginUrl, account } = useLoaderData<LoaderData>();
  const response = useActionData();
  return (
    isAuthenticated ? (<>
      <h1>Hallo {account?.username}</h1>
      <form method="post" action="/logout">
        <button>Logout</button>
      </form>
      <form method="post" action="?index">
        <button>Send Graph Request</button>
      </form>
      <ul>
        {response?.value.map((notebook: any) => (
          <li key={notebook.id}>{notebook.displayName} ({notebook.id})</li>
        ))}
      </ul>
    </>) : (
      <a href={loginUrl}>Login</a>
    )
  );
}
