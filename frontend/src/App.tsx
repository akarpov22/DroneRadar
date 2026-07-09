import { DroneRadar } from './components/drone-radar';
import { DroneDataProvider } from './components/drone-data-provider';
import { DroneSelectionProvider } from './components/drone-selection-provider';
import { DroneNotificationProvider } from './components/drone-notification-provider';
import { UserZonesProvider } from './components/user-zones-provider';
import { ApolloAuthProvider } from './components/apollo-auth-provider';
import { isAuth0Disabled } from './auth/config';
import { ApolloProvider } from '@apollo/client';
import { client, subscriptionClient } from './apollo-client';
import { SubscriptionClientContext } from './apollo-client';

function AppShell() {
  return (
    <DroneDataProvider>
      <DroneSelectionProvider>
        <DroneNotificationProvider>
          <UserZonesProvider>
            <DroneRadar />
          </UserZonesProvider>
        </DroneNotificationProvider>
      </DroneSelectionProvider>
    </DroneDataProvider>
  );
}

function App() {
  if (isAuth0Disabled) {
    return (
      <SubscriptionClientContext.Provider value={subscriptionClient}>
        <ApolloProvider client={client}>
          <AppShell />
        </ApolloProvider>
      </SubscriptionClientContext.Provider>
    );
  }

  return (
    <ApolloAuthProvider>
      <AppShell />
    </ApolloAuthProvider>
  );
}

export default App;
