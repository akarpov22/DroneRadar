import { useAuth0 } from '@auth0/auth0-react';
import { isAuth0Disabled } from './config';

export function useShowSidebar(): boolean {
  if (isAuth0Disabled) return true;
  const { isAuthenticated, isLoading } = useAuth0();
  return !isLoading && isAuthenticated;
}

export function useAuthSession() {
  if (isAuth0Disabled) {
    return {
      isLoading: false,
      isAuthenticated: true,
      isGuest: false,
    };
  }

  const { isLoading, isAuthenticated } = useAuth0();
  return {
    isLoading,
    isAuthenticated,
    isGuest: !isLoading && !isAuthenticated,
  };
}
