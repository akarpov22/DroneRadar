import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Spinner,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useMutation, useQuery } from '@apollo/client';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DELETE_USER, UPDATE_USER_ROLE, USERS } from '../../utils/admin-graphql-queries';

type AdminUser = {
  id: string;
  auth0Sub: string;
  email: string | null;
  role: string;
  createdAt: string;
};

function userLabel(user: AdminUser): string {
  return user.email ?? user.auth0Sub;
}

type AdminUsersTabProps = {
  isActive: boolean;
  currentUserId?: string;
};

export const AdminUsersTab = ({ isActive, currentUserId }: AdminUsersTabProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const deleteDialog = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');

  const { data, loading, refetch } = useQuery(USERS, {
    variables: { search: debouncedSearch || null },
    skip: !isActive,
    fetchPolicy: 'network-only',
  });

  const [updateUserRole, { loading: updatingRole }] = useMutation(UPDATE_USER_ROLE);
  const [deleteUser, { loading: deletingUser }] = useMutation(DELETE_USER);

  const users: AdminUser[] = data?.users ?? [];
  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const isSelf = selectedUserId === currentUserId;

  const roleLabels: Record<string, string> = {
    ADMIN: t('auth-role-admin'),
    PILOT: t('auth-role-pilot'),
    OBSERVER: t('auth-role-observer'),
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isActive) {
      setSearch('');
      setDebouncedSearch('');
      setSelectedUserId(null);
      setSelectedRole('');
    }
  }, [isActive]);

  useEffect(() => {
    if (selectedUser) {
      setSelectedRole(selectedUser.role);
    }
  }, [selectedUser]);

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUserId(user.id);
    setSelectedRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!selectedUserId || !selectedRole) return;

    try {
      await updateUserRole({
        variables: { userId: selectedUserId, role: selectedRole },
      });
      await refetch();
      toast({
        title: t('admin-role-updated'),
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: t('admin-role-update-error'),
        description: err instanceof Error ? err.message : t('auth-unknown-error'),
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    try {
      await deleteUser({ variables: { userId: selectedUserId } });
      await refetch();
      setSelectedUserId(null);
      setSelectedRole('');
      deleteDialog.onClose();
      toast({
        title: t('admin-user-deleted'),
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: t('admin-user-delete-error'),
        description: err instanceof Error ? err.message : t('auth-unknown-error'),
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <>
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>{t('admin-search-users')}</FormLabel>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin-search-placeholder')}
          />
        </FormControl>

        <Box>
          <Text fontWeight="semibold" mb={2}>
            {t('admin-users')}
          </Text>
          {loading ? (
            <HStack justify="center" py={4}>
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.500">
                {t('admin-users-loading')}
              </Text>
            </HStack>
          ) : users.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              {t('admin-no-users')}
            </Text>
          ) : (
            <VStack
              spacing={1}
              align="stretch"
              maxH="200px"
              overflowY="auto"
              borderWidth="1px"
              borderRadius="md"
              p={2}
            >
              {users.map((user) => (
                <Box
                  key={user.id}
                  p={2}
                  borderRadius="md"
                  cursor="pointer"
                  bg={selectedUserId === user.id ? 'blue.50' : 'transparent'}
                  _hover={{ bg: selectedUserId === user.id ? 'blue.50' : 'gray.50' }}
                  onClick={() => handleSelectUser(user)}
                >
                  <HStack justify="space-between">
                    <Text fontSize="sm" noOfLines={1}>
                      {userLabel(user)}
                    </Text>
                    <Badge colorScheme={user.role === 'ADMIN' ? 'purple' : user.role === 'PILOT' ? 'blue' : 'gray'}>
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>

        {selectedUser && (
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>{t('auth-email')}</FormLabel>
                <Input value={selectedUser.email ?? selectedUser.auth0Sub} isReadOnly />
              </FormControl>

              <FormControl isDisabled={isSelf}>
                <FormLabel>{t('admin-change-role')}</FormLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="ADMIN">{t('auth-role-admin')}</option>
                  <option value="PILOT">{t('auth-role-pilot')}</option>
                  <option value="OBSERVER">{t('auth-role-observer')}</option>
                </Select>
              </FormControl>

              {isSelf && (
                <Text fontSize="sm" color="gray.500">
                  {t('admin-cannot-modify-self')}
                </Text>
              )}

              <HStack>
                <Button
                  colorScheme="blue"
                  onClick={handleSaveRole}
                  isLoading={updatingRole}
                  isDisabled={isSelf || selectedRole === selectedUser.role}
                >
                  {t('admin-save-role')}
                </Button>
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={deleteDialog.onOpen}
                  isDisabled={isSelf}
                >
                  {t('admin-delete-user')}
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}
      </VStack>

      <AlertDialog
        isOpen={deleteDialog.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={deleteDialog.onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader>{t('admin-delete-user')}</AlertDialogHeader>
            <AlertDialogBody>{t('admin-delete-confirm')}</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={deleteDialog.onClose}>
                {t('user-zone-cancel')}
              </Button>
              <Button colorScheme="red" onClick={handleDeleteUser} isLoading={deletingUser} ml={3}>
                {t('admin-delete-user')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
