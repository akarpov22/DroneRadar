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
