import { gql } from '@apollo/client';

export const USERS = gql`
  query Users($search: String) {
    users(search: $search) {
      id
      auth0Sub
      email
      role
      createdAt
    }
  }
`;

export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($userId: ID!, $role: UserRole!) {
    updateUserRole(userId: $userId, role: $role) {
      id
      auth0Sub
      email
      role
      createdAt
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($userId: ID!) {
    deleteUser(userId: $userId)
  }
`;

export const ADMIN_DRONE_MODELS = gql`
  query AdminDroneModels {
    droneModels(activeOnly: false) {
      id
      name
      manufacturer
      maxSpeed
      maxRange
      active
    }
  }
`;

export const ADMIN_REGIONS = gql`
  query AdminRegions {
    regions(activeOnly: false) {
      id
      name
      regionCode
      active
    }
  }
`;

export const CREATE_DRONE_MODEL = gql`
  mutation CreateDroneModel($input: CreateDroneModelInput!) {
    createDroneModel(input: $input) {
      id
      name
      manufacturer
      maxSpeed
      maxRange
      active
    }
  }
`;

export const CREATE_REGION = gql`
  mutation CreateRegion($input: CreateRegionInput!) {
    createRegion(input: $input) {
      id
      name
      regionCode
      active
    }
  }
`;

export const DEACTIVATE_DRONE_MODEL = gql`
  mutation DeactivateDroneModel($id: ID!) {
    deactivateDroneModel(id: $id) {
      id
      active
    }
  }
`;

export const DEACTIVATE_REGION = gql`
  mutation DeactivateRegion($id: ID!) {
    deactivateRegion(id: $id) {
      id
      active
    }
  }
`;
