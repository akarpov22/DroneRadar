import { DroneRadar } from './components/drone-radar';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';
import { DroneDataProvider } from './components/drone-data-provider';

function App() {
  return (
    <ApolloProvider client={client}>
      <DroneDataProvider>
      <DroneRadar />
      </DroneDataProvider>
      </ApolloProvider>
  );
}

export default App;
