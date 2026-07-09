import {
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
  Select,
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
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../language-switcher';
import { useDrones } from '../drone-data-provider';
import { DRONES, MY_DRONES } from '../../utils/graphql-queries';
import { AdminPanel } from '../admin-panel';

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
    }
  }
`;

const modalOverlayProps = {
  bg: 'blackAlpha.500',
  backdropFilter: 'blur(12px)',
};

function AdminIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

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
  const adminModal = useDisclosure();
  const toast = useToast();
  const hasAutoOpened = useRef(false);
  const [registerFormKey, setRegisterFormKey] = useState(0);
  const { models } = useDrones();

  const { data: meData } = useQuery(ME, {
    skip: !isAuthenticated || isLoading,
    fetchPolicy: 'network-only',
  });
  const [registerDrone, { loading: registering }] = useMutation(REGISTER_DRONE, {
    refetchQueries: [{ query: MY_DRONES }, { query: DRONES }],
  });

  const role = meData?.me?.role;
  const currentUserId = meData?.me?.id;
  const email = user?.email ?? meData?.me?.email ?? '';
  const canRegisterDrone = role === 'ADMIN' || role === 'PILOT';
  const isAdmin = role === 'ADMIN';

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
    const regionCode = String(form.get('regionCode') ?? '');
    const modelId = String(form.get('modelId') ?? '');

    try {
      await registerDrone({
        variables: { input: { serial, name, regionCode, modelId } },
      });

      toast({
        title: t('auth-drone-registered'),
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      registerModal.onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth-unknown-error');
      toast({
        title: t('auth-register-error'),
        description: message === 'Drone not found' ? t('auth-drone-not-found') : message,
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
          <>
            {isAdmin && (
              <IconButton
                aria-label={t('admin-panel')}
                icon={<AdminIcon />}
                size="md"
                isRound
                bg="whiteAlpha.900"
                backdropFilter="blur(8px)"
                shadow="md"
                color="gray.700"
                _hover={{ bg: 'white' }}
                onClick={adminModal.onOpen}
              />
            )}
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
          </>
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
                  setRegisterFormKey((k) => k + 1);
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
            <form key={registerFormKey} id="register-drone-form" onSubmit={handleRegister}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('auth-serial')}</FormLabel>
                  <Input name="serial" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{t('auth-name')}</FormLabel>
                  <Input name="name" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{t('auth-region-code')}</FormLabel>
                  <Input name="regionCode" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>{t('drone-model')}</FormLabel>
                  <Select name="modelId" placeholder={t('select-model')}>
                    {models.map((model) => (
                      <option value={model.id} key={model.id}>
                        {`${model.manufacturer} ${model.name}`}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <Code fontSize="xs" p={2} w="full">
                  {t('auth-register-drone-hint')}
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

      <AdminPanel
        isOpen={adminModal.isOpen}
        onClose={adminModal.onClose}
        currentUserId={currentUserId}
      />
    </>
  );
}

function AuthOverlayDev() {
  const { t } = useTranslation();
  const adminModal = useDisclosure();
  const { data: meData } = useQuery(ME, { fetchPolicy: 'network-only' });
  const isAdmin = meData?.me?.role === 'ADMIN';

  return (
    <>
      <HStack position="absolute" top={3} right={3} zIndex={1000} spacing={2}>
        <LanguageSwitcher />
        {isAdmin && (
          <IconButton
            aria-label={t('admin-panel')}
            icon={<AdminIcon />}
            size="md"
            isRound
            bg="whiteAlpha.900"
            backdropFilter="blur(8px)"
            shadow="md"
            color="gray.700"
            _hover={{ bg: 'white' }}
            onClick={adminModal.onOpen}
          />
        )}
      </HStack>
      <AdminPanel
        isOpen={adminModal.isOpen}
        onClose={adminModal.onClose}
        currentUserId={meData?.me?.id}
      />
    </>
  );
}

export const AuthOverlay = (props: AuthOverlayProps) => {
  if (isAuth0Disabled) {
    return <AuthOverlayDev />;
  }
  return <AuthOverlayInner {...props} />;
};
