import {
  Box,
  Button,
  HStack,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Code,
  useToast,
  Text,
} from '@chakra-ui/react';
import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { isAuth0Disabled } from '../../auth/config';
import { useAuthSession } from '../../auth/use-auth-session';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../language-switcher';

const ME = gql`
  query Me {
    me {
      id
      email
      role
    }
  }
`;

const REGISTER_DRONE = gql`
  mutation RegisterDrone($input: RegisterDroneInput!) {
    registerDrone(input: $input) {
      drone {
        id
        serial
        name
      }
      deviceToken
    }
  }
`;

const modalOverlayProps = {
  bg: 'blackAlpha.500',
  backdropFilter: 'blur(12px)',
};

function AccountIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

type AuthOverlayProps = {
  onLoginModalOpenChange?: (open: boolean) => void;
};

function AuthOverlayInner({ onLoginModalOpenChange }: AuthOverlayProps) {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user, error } = useAuth0();
  const { isGuest } = useAuthSession();
  const { i18n, t } = useTranslation();
  const loginModal = useDisclosure();
  const accountModal = useDisclosure();
  const registerModal = useDisclosure();
  const toast = useToast();
  const hasAutoOpened = useRef(false);

  const { data: meData } = useQuery(ME, {
    skip: !isAuthenticated || isLoading,
    fetchPolicy: 'network-only',
  });
  const [registerDrone, { loading: registering }] = useMutation(REGISTER_DRONE);

  const role = meData?.me?.role;
  const email = user?.email ?? meData?.me?.email ?? '';
  const canRegisterDrone = role === 'ADMIN' || role === 'PILOT';

  const roleLabels: Record<string, string> = {
    ADMIN: t('auth-role-admin'),
    PILOT: t('auth-role-pilot'),
    OBSERVER: t('auth-role-observer'),
  };

  const loginParams = () => ({
    authorizationParams: {
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      ui_locales: i18n.language?.startsWith('uk') ? 'uk' : 'en',
    },
  });

  useEffect(() => {
    if (isGuest && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      loginModal.onOpen();
    }
  }, [isGuest, loginModal.onOpen]);

  useEffect(() => {
    if (isAuthenticated) {
      loginModal.onClose();
    }
  }, [isAuthenticated, loginModal.onClose]);

  useEffect(() => {
    onLoginModalOpenChange?.(loginModal.isOpen);
  }, [loginModal.isOpen, onLoginModalOpenChange]);

  const handleLogin = async () => {
    try {
      await loginWithRedirect({
        ...loginParams(),
        appState: { returnTo: window.location.pathname + window.location.search },
      });
    } catch (err) {
      toast({
        title: t('auth-login-error'),
        description: err instanceof Error ? err.message : t('auth-unknown-error'),
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const serial = String(form.get('serial') ?? '');
    const name = String(form.get('name') ?? '');
    const regionCode = String(form.get('regionCode') ?? 'UA-KY');

    try {
      const { data } = await registerDrone({
        variables: { input: { serial, name, regionCode } },
      });

      toast({
        title: t('auth-drone-registered'),
        description: t('auth-device-token', { token: data.registerDrone.deviceToken }),
        status: 'success',
        duration: null,
        isClosable: true,
      });
      registerModal.onClose();
    } catch (err) {
      toast({
        title: t('auth-register-error'),
        description: err instanceof Error ? err.message : t('auth-unknown-error'),
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <>
      <HStack position="absolute" top={3} right={3} zIndex={1000} spacing={2}>
        <LanguageSwitcher />
        {isLoading ? null : isGuest ? (
          <Button
            colorScheme="blue"
            size="sm"
            shadow="md"
            onClick={loginModal.onOpen}
          >
            {t('auth-login')}
          </Button>
        ) : (
          <IconButton
            aria-label={t('auth-account')}
            icon={<AccountIcon />}
            size="md"
            isRound
            bg="whiteAlpha.900"
            backdropFilter="blur(8px)"
            shadow="md"
            color="gray.700"
            _hover={{ bg: 'white' }}
            onClick={accountModal.onOpen}
          />
        )}
      </HStack>

      <Modal
        isOpen={loginModal.isOpen}
        onClose={loginModal.onClose}
        isCentered
        size="md"
        closeOnOverlayClick
      >
        <ModalOverlay {...modalOverlayProps} />
        <ModalContent mx={4} shadow="2xl">
          <ModalHeader>Drone Radar</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text color="gray.600">
                {t('auth-login-description')}
              </Text>
              {error && (
                <Text color="red.500" fontSize="sm">
                  {error.message}
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={loginModal.onClose}>
              {t('auth-view-map')}
            </Button>
            <Button colorScheme="blue" onClick={handleLogin}>
              {t('auth-login-signup')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={accountModal.isOpen} onClose={accountModal.onClose} isCentered size="sm">
        <ModalOverlay {...modalOverlayProps} />
        <ModalContent mx={4}>
          <ModalHeader>{t('auth-account')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>{t('auth-email')}</FormLabel>
                <Input value={email} isReadOnly />
              </FormControl>
              <FormControl>
                <FormLabel>{t('auth-role')}</FormLabel>
                <Input
                  value={role ? (roleLabels[role] ?? role) : '—'}
                  isReadOnly
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter flexDirection="column" gap={2}>
            {canRegisterDrone && (
              <Button
                w="full"
                variant="outline"
                onClick={() => {
                  accountModal.onClose();
                  registerModal.onOpen();
                }}
              >
                {t('auth-register-drone')}
              </Button>
            )}
            <Button
              w="full"
              colorScheme="red"
              variant="outline"
              onClick={() => {
                accountModal.onClose();
                logout({ logoutParams: { returnTo: window.location.origin } });
              }}
            >
              {t('auth-logout')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={registerModal.isOpen} onClose={registerModal.onClose} isCentered>
        <ModalOverlay {...modalOverlayProps} />
        <ModalContent mx={4}>
          <ModalHeader>{t('auth-register-drone-title')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <form id="register-drone-form" onSubmit={handleRegister}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('auth-serial')}</FormLabel>
                  <Input name="serial" defaultValue="7777MYDRONE7" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{t('auth-name')}</FormLabel>
                  <Input name="name" defaultValue="My Drone" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{t('auth-region-code')}</FormLabel>
                  <Input name="regionCode" defaultValue="UA-KY" />
                </FormControl>
                <Code fontSize="xs" p={2} w="full">
                  {t('auth-device-token-hint')}
                </Code>
              </VStack>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button type="submit" form="register-drone-form" colorScheme="blue" isLoading={registering}>
              {t('auth-register')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export const AuthOverlay = (props: AuthOverlayProps) => {
  if (isAuth0Disabled) {
    return (
      <Box position="absolute" top={3} right={3} zIndex={1000}>
        <LanguageSwitcher />
      </Box>
    );
  }
  return <AuthOverlayInner {...props} />;
};
