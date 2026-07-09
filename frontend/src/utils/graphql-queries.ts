import { gql } from '@apollo/client';

export const MY_DRONES = gql`
  query MyDrones {
    myDrones {
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
      createdAt
    }
  }
`;

export const UNLINK_DRONE = gql`
  mutation UnlinkDrone($droneId: ID!) {
    unlinkDrone(droneId: $droneId) {
      id
    }
  }
`;

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

export const ME = gql`
  query Me {
    me {
      id
      role
    }
  }
`;

export const USER_ZONES = gql`
  query UserZones {
    userZones {
      id
      name
      shapeType
      geometry
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_USER_ZONE = gql`
  mutation CreateUserZone($input: CreateUserZoneInput!) {
    createUserZone(input: $input) {
      id
      name
      shapeType
      geometry
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER_ZONE = gql`
  mutation UpdateUserZone($input: UpdateUserZoneInput!) {
    updateUserZone(input: $input) {
      id
      name
      shapeType
      geometry
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_USER_ZONE = gql`
  mutation DeleteUserZone($id: ID!) {
    deleteUserZone(id: $id)
  }
`;
