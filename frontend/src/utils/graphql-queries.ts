import { gql } from "@apollo/client";

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
  subscription {
    droneUpdated {
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
        }
    }
      createdAt
    }
  }
`;

export const ASSIGN_MODEL = gql`
mutation AssignModel($input: AssignModelInput!) {
  assignModel(input: $input) {
    id
  }
}`;