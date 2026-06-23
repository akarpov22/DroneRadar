import { ApolloProvider } from '@apollo/client';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useMemo, useRef } from 'react';
import { createApolloClient } from '../../apollo-client';
import { isAuth0Disabled } from '../../auth/config';
import { client as devClient } from '../../apollo-client';

export const ApolloAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const getTokenRef = useRef<() => Promise<string | null>>(async () => null);

  useEffect(() => {
    getTokenRef.current = async () => {
      if (!isAuthenticated) return null;
      try {
        return await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
      } catch (err) {
        console.error('Auth0 getAccessTokenSilently failed:', err);
        return null;
      }
    };
  }, [getAccessTokenSilently, isAuthenticated]);

  const client = useMemo(() => {
    if (isAuth0Disabled) return devClient;
    return createApolloClient(() => getTokenRef.current());
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
