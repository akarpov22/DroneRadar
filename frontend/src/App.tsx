import { DroneRadar } from './components/drone-radar';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';
import { DroneDataProvider } from './components/drone-data-provider';
import { DroneSelectionProvider } from './components/drone-selection-provider';

function App() {
  return (
    <ApolloProvider client={client}>
      <DroneDataProvider>
        <DroneSelectionProvider>
          <DroneRadar />
        </DroneSelectionProvider>
      </DroneDataProvider>
    </ApolloProvider>
  );
}

export default App;
