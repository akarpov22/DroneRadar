import { DroneRadar } from './components/drone-radar';
import { DroneDataProvider } from './components/drone-data-provider';
import { DroneSelectionProvider } from './components/drone-selection-provider';
import { ApolloAuthProvider } from './components/apollo-auth-provider';
import { isAuth0Disabled } from './auth/config';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';

function AppShell() {
  return (
    <DroneDataProvider>
      <DroneSelectionProvider>
        <DroneRadar />
      </DroneSelectionProvider>
    </DroneDataProvider>
  );
}

function App() {
  if (isAuth0Disabled) {
    return (
      <ApolloProvider client={client}>
        <AppShell />
      </ApolloProvider>
    );
  }

  return (
    <ApolloAuthProvider>
      <AppShell />
    </ApolloAuthProvider>
  );
}

export default App;
