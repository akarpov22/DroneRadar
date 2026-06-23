import { gql } from '@apollo/client';

export const DRONES = gql`
  query Drones {
    drones {
      id
      name
      serial
      model {
        id
        name
        manufacturer
        maxSpeed
        maxRange
      }
      sessions {
        id
        startedAt
        endedAt
        positions {
          id
          altitude
          latitude
          longitude
          speed
          heading
          recordedAt
        }
      }
      createdAt
    }
  }
`;

export const DRONE_MODELS = gql`
  query DroneModels {
  droneModels {
    id
    manufacturer
    maxRange
    maxSpeed
    name
  }
}`;
  

export const DRONE_UPDATED = gql`
  subscription DroneUpdated {
    droneUpdated {
      id
      name
      serial
      sessions {
        id
        startedAt
        endedAt
        positions {
          id
          altitude
          latitude
          longitude
          speed
          heading
          recordedAt
        }
      }
    }
  }
`;

export const ASSIGN_MODEL = gql`
mutation AssignModel($input: AssignModelInput!) {
  assignModel(input: $input) {
    id
  }
}`;

export const FLIGHT_RESTRICTION_ZONES = gql`
  query FlightRestrictionZones(
    $west: Float!
    $south: Float!
    $east: Float!
    $north: Float!
    $includeNotam: Boolean
  ) {
    flightRestrictionZones(
      west: $west
      south: $south
      east: $east
      north: $north
      includeNotam: $includeNotam
    ) {
      id
      layerType
      name
      description
      lowerLimit
      upperLimit
      validFrom
      validTo
      geometry
    }
  }
`;
