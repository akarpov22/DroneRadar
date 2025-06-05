import { GraphQLClient, gql } from 'graphql-request';
import { v4 as uuidv4 } from 'uuid';

const client = new GraphQLClient('http://localhost:4000/graphql');

const REGISTER_DRONE = gql`
  mutation RegisterDroneIfNotExists($serial: String!, $regionCode: String!, $name: String!) {
    registerDroneIfNotExists(input: { serial: $serial, regionCode: $regionCode, name: $name }) {
      id
    }
  }
`;

const CREATE_SESSION = gql`
  mutation CreateSession($droneId: ID!, $regionId: ID!) {
    createSession(input: { droneId: $droneId, regionId: $regionId }) {
      id
    }
  }
`;

const APPEND_POSITION = gql`
  mutation AppendPosition($input: AppendPositionInput!) {
    appendPosition(input: $input) {
      id
    }
  }
`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔧 Starting drone simulation...');

  const serial = 'SN-' + Math.floor(Math.random() * 100000);
  const name = 'Drone-' + uuidv4().slice(0, 8);
  const regionCode = 'UA-KY';

  const regRes = await client.request(REGISTER_DRONE, { serial, regionCode, name });
  const droneId = regRes.registerDroneIfNotExists.id;

  const sessionRes = await client.request(CREATE_SESSION, { droneId, regionId: regionCode });
  const sessionId = sessionRes.createSession.id;

  console.log(`🚁 Drone "${name}" (serial: ${serial}) registered and session ${sessionId} started.`);

  while (true) {
    const input = {
      droneId,
      latitude: 30.52 + Math.random() * 0.01,
      longitude: 50.45 + Math.random() * 0.01,
      altitude: 100 + Math.random() * 20,
      speed: 10 + Math.random() * 5,
      heading: Math.random() * 360,
      timestamp: new Date().toISOString()
    };

    await client.request(APPEND_POSITION, { input });
    console.log('📡 Sent position:', input);
    console.log("Serial: ", serial)
    await delay(5_000);
  }
}

main().catch(console.error);
