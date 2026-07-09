import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import type { Drone } from '../../utils/types';
import { ModelDescription } from './model-description';
import { MY_DRONES, UNLINK_DRONE, DRONES } from '../../utils/graphql-queries';

type DroneDetailsModalProps = {
  drone: Drone;
  isOpen: boolean;
  onClose: () => void;
};

export const DroneDetailsModal = ({ drone, isOpen, onClose }: DroneDetailsModalProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [unlinkDrone, { loading }] = useMutation(UNLINK_DRONE, {
    refetchQueries: [{ query: MY_DRONES }, { query: DRONES }],
  });

  const handleUnlink = async () => {
    try {
      await unlinkDrone({ variables: { droneId: drone.id } });
      toast({
        title: t('drone-unlinked'),
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onClose();
    } catch (err) {
      toast({
        title: t('drone-unlink-error'),
        description: err instanceof Error ? err.message : t('auth-unknown-error'),
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent mx={4} maxW="md" maxH="90vh" display="flex" flexDirection="column">
        <ModalHeader flexShrink={0}>{t('drone-details')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4} overflowY="auto" flex="1" minH={0}>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>{t('auth-serial')}</FormLabel>
              <Input value={drone.serial ?? ''} isReadOnly />
            </FormControl>
            <FormControl>
              <FormLabel>{t('auth-name')}</FormLabel>
              <Input value={drone.name} isReadOnly />
            </FormControl>
            <ModelDescription drone={drone} />
          </VStack>
        </ModalBody>
        <ModalFooter flexShrink={0}>
          <Button
            colorScheme="red"
            variant="outline"
            onClick={handleUnlink}
            isLoading={loading}
          >
            {t('unlink-drone')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
