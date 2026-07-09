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
  Spinner,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useMutation, useQuery } from '@apollo/client';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ADMIN_DRONE_MODELS,
  ADMIN_REGIONS,
  CREATE_DRONE_MODEL,
  CREATE_REGION,
  DEACTIVATE_DRONE_MODEL,
  DEACTIVATE_REGION,
} from '../../utils/admin-graphql-queries';
import { DRONE_MODELS } from '../../utils/graphql-queries';

type CatalogItem = {
  id: string;
  active: boolean;
};

type DroneModelItem = CatalogItem & {
  name: string;
  manufacturer: string;
  maxSpeed: number | null;
  maxRange: number;
};

type RegionItem = CatalogItem & {
  name: string;
  regionCode: string;
};

type AdminCatalogTabProps = {
  isActive: boolean;
};

export const AdminCatalogTab = ({ isActive }: AdminCatalogTabProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const hideDialog = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [hideTarget, setHideTarget] = useState<{ type: 'model' | 'region'; id: string; label: string } | null>(null);

  const [modelName, setModelName] = useState('');
  const [modelManufacturer, setModelManufacturer] = useState('');
  const [modelMaxRange, setModelMaxRange] = useState('');
  const [modelMaxSpeed, setModelMaxSpeed] = useState('');

  const [regionName, setRegionName] = useState('');
  const [regionCode, setRegionCode] = useState('');

  const refetchQueries = [{ query: ADMIN_DRONE_MODELS }, { query: ADMIN_REGIONS }, { query: DRONE_MODELS }];

  const { data: modelsData, loading: modelsLoading, refetch: refetchModels } = useQuery(ADMIN_DRONE_MODELS, {
    skip: !isActive,
    fetchPolicy: 'network-only',
  });

  const { data: regionsData, loading: regionsLoading, refetch: refetchRegions } = useQuery(ADMIN_REGIONS, {
    skip: !isActive,
    fetchPolicy: 'network-only',
  });

  const [createDroneModel, { loading: creatingModel }] = useMutation(CREATE_DRONE_MODEL, { refetchQueries });
  const [createRegion, { loading: creatingRegion }] = useMutation(CREATE_REGION, { refetchQueries });
  const [deactivateDroneModel, { loading: hidingModel }] = useMutation(DEACTIVATE_DRONE_MODEL, { refetchQueries });
  const [deactivateRegion, { loading: hidingRegion }] = useMutation(DEACTIVATE_REGION, { refetchQueries });

  const models: DroneModelItem[] = modelsData?.droneModels ?? [];
  const regions: RegionItem[] = regionsData?.regions ?? [];

  const resetModelForm = () => {
    setModelName('');
    setModelManufacturer('');
    setModelMaxRange('');
    setModelMaxSpeed('');
  };

  const resetRegionForm = () => {
    setRegionName('');
    setRegionCode('');
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    const maxRange = Number(modelMaxRange);
    if (!modelName.trim() || !modelManufacturer.trim() || !Number.isFinite(maxRange)) return;

    try {
      await createDroneModel({
        variables: {
          input: {
            name: modelName.trim(),
            manufacturer: modelManufacturer.trim(),
            maxRange,
            maxSpeed: modelMaxSpeed.trim() ? Number(modelMaxSpeed) : null,
          },
        },
      });
      resetModelForm();
      await refetchModels();
      toast({ title: t('admin-model-created'), status: 'success', duration: 4000, isClosable: true });
    } catch (err) {
      toast({
        title: t('admin-model-create-error'),
        description: err instanceof Error ? err.message : t('auth-unknown-error'),
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionName.trim() || !regionCode.trim()) return;

    try {
      await createRegion({
        variables: {
          input: {
            name: regionName.trim(),
            regionCode: regionCode.trim().toUpperCase(),
          },
        },
      });
      resetRegionForm();
      await refetchRegions();
      toast({ title: t('admin-region-created'), status: 'success', duration: 4000, isClosable: true });
    } catch (err) {
      toast({
        title: t('admin-region-create-error'),
        description: err instanceof Error ? err.message : t('auth-unknown-error'),
        status: 'error',
        duration: 5000,
      });
    }
  };

  const openHideDialog = (type: 'model' | 'region', id: string, label: string) => {
    setHideTarget({ type, id, label });
    hideDialog.onOpen();
  };

  const handleHide = async () => {
    if (!hideTarget) return;

    try {
      if (hideTarget.type === 'model') {
        await deactivateDroneModel({ variables: { id: hideTarget.id } });
      } else {
        await deactivateRegion({ variables: { id: hideTarget.id } });
      }
      hideDialog.onClose();
      setHideTarget(null);
      toast({ title: t('admin-item-hidden'), status: 'success', duration: 4000, isClosable: true });
    } catch (err) {
      toast({
        title: t('admin-item-hide-error'),
        description: err instanceof Error ? err.message : t('auth-unknown-error'),
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <>
      <VStack spacing={6} align="stretch">
        <Box>
          <Text fontWeight="semibold" mb={3}>
            {t('admin-drone-models')}
          </Text>

          <Box as="form" onSubmit={handleCreateModel} borderWidth="1px" borderRadius="md" p={4} mb={4}>
            <VStack spacing={3} align="stretch">
              <FormControl isRequired>
                <FormLabel>{t('name')}</FormLabel>
                <Input value={modelName} onChange={(e) => setModelName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>{t('manufacturer')}</FormLabel>
                <Input value={modelManufacturer} onChange={(e) => setModelManufacturer(e.target.value)} />
              </FormControl>
              <HStack align="start">
                <FormControl isRequired>
                  <FormLabel>{t('max-range')}</FormLabel>
                  <Input type="number" min={0} step="any" value={modelMaxRange} onChange={(e) => setModelMaxRange(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>{t('max-speed')}</FormLabel>
                  <Input type="number" min={0} step="any" value={modelMaxSpeed} onChange={(e) => setModelMaxSpeed(e.target.value)} />
                </FormControl>
              </HStack>
              <Button type="submit" colorScheme="blue" alignSelf="flex-start" isLoading={creatingModel}>
                {t('admin-add-model')}
              </Button>
            </VStack>
          </Box>

          {modelsLoading ? (
            <HStack justify="center" py={2}>
              <Spinner size="sm" />
            </HStack>
          ) : (
            <VStack spacing={1} align="stretch" maxH="180px" overflowY="auto" borderWidth="1px" borderRadius="md" p={2}>
              {models.length === 0 ? (
                <Text fontSize="sm" color="gray.500">{t('admin-no-models')}</Text>
              ) : (
                models.map((model) => (
                  <HStack key={model.id} justify="space-between" p={2} borderRadius="md" _hover={{ bg: 'gray.50' }}>
                    <Box flex={1} minW={0}>
                      <Text fontSize="sm" noOfLines={1}>
                        {model.manufacturer} {model.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {t('max-range')}: {model.maxRange}
                        {model.maxSpeed != null ? ` · ${t('max-speed')}: ${model.maxSpeed}` : ''}
                      </Text>
                    </Box>
                    <HStack flexShrink={0}>
                      {!model.active && <Badge colorScheme="gray">{t('admin-hidden')}</Badge>}
                      {model.active && (
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => openHideDialog('model', model.id, `${model.manufacturer} ${model.name}`)}
                        >
                          {t('admin-hide-item')}
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                ))
              )}
            </VStack>
          )}
        </Box>

        <Box>
          <Text fontWeight="semibold" mb={3}>
            {t('admin-regions')}
          </Text>

          <Box as="form" onSubmit={handleCreateRegion} borderWidth="1px" borderRadius="md" p={4} mb={4}>
            <VStack spacing={3} align="stretch">
              <FormControl isRequired>
                <FormLabel>{t('name')}</FormLabel>
                <Input value={regionName} onChange={(e) => setRegionName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>{t('auth-region-code')}</FormLabel>
                <Input value={regionCode} onChange={(e) => setRegionCode(e.target.value.toUpperCase())} placeholder="UA" />
              </FormControl>
              <Button type="submit" colorScheme="blue" alignSelf="flex-start" isLoading={creatingRegion}>
                {t('admin-add-region')}
              </Button>
            </VStack>
          </Box>

          {regionsLoading ? (
            <HStack justify="center" py={2}>
              <Spinner size="sm" />
            </HStack>
          ) : (
            <VStack spacing={1} align="stretch" maxH="180px" overflowY="auto" borderWidth="1px" borderRadius="md" p={2}>
              {regions.length === 0 ? (
                <Text fontSize="sm" color="gray.500">{t('admin-no-regions')}</Text>
              ) : (
                regions.map((region) => (
                  <HStack key={region.id} justify="space-between" p={2} borderRadius="md" _hover={{ bg: 'gray.50' }}>
                    <Box flex={1} minW={0}>
                      <Text fontSize="sm" noOfLines={1}>
                        {region.regionCode} — {region.name}
                      </Text>
                    </Box>
                    <HStack flexShrink={0}>
                      {!region.active && <Badge colorScheme="gray">{t('admin-hidden')}</Badge>}
                      {region.active && (
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => openHideDialog('region', region.id, `${region.regionCode} — ${region.name}`)}
                        >
                          {t('admin-hide-item')}
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                ))
              )}
            </VStack>
          )}
        </Box>
      </VStack>

      <AlertDialog isOpen={hideDialog.isOpen} leastDestructiveRef={cancelRef} onClose={hideDialog.onClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader>{t('admin-hide-item')}</AlertDialogHeader>
            <AlertDialogBody>
              {t('admin-hide-confirm', { name: hideTarget?.label ?? '' })}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={hideDialog.onClose}>
                {t('user-zone-cancel')}
              </Button>
              <Button
                colorScheme="red"
                onClick={handleHide}
                isLoading={hidingModel || hidingRegion}
                ml={3}
              >
                {t('admin-hide-item')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
