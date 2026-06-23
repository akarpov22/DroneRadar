import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './i18n';
import { getAuth0Config, isAuth0Disabled } from './auth/config';

export const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
});

const auth0Config = isAuth0Disabled ? null : getAuth0Config();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      {isAuth0Disabled || !auth0Config ? (
        <App />
      ) : (
        <Auth0Provider
          domain={auth0Config.domain}
          clientId={auth0Config.clientId}
          authorizationParams={{
            redirect_uri: window.location.origin,
            audience: auth0Config.audience,
            scope: 'openid profile email',
          }}
          cacheLocation="localstorage"
        >
          <App />
        </Auth0Provider>
      )}
    </ChakraProvider>
  </React.StrictMode>
);
