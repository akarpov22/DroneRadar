import { ApolloProvider } from '@apollo/client';
import { useAuth0 } from '@auth0/auth0-react';
import { useMemo, useRef } from 'react';
import { isAuth0Disabled } from '../../auth/config';
import { createApolloClient, client as devClient, subscriptionClient as devSubscriptionClient, SubscriptionClientContext } from '../../apollo-client';

export const ApolloAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const getTokenRef = useRef<() => Promise<string | null>>(async () => null);

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

  const bundle = useMemo(() => {
    if (isAuth0Disabled) {
      return { client: devClient, subscriptionClient: devSubscriptionClient };
    }
    return createApolloClient(() => getTokenRef.current());
  }, []);

  return (
    <SubscriptionClientContext.Provider value={bundle.subscriptionClient}>
      <ApolloProvider client={bundle.client}>{children}</ApolloProvider>
    </SubscriptionClientContext.Provider>
  );
};
