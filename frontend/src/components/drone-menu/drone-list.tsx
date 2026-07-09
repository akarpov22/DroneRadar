import {
  Box,
  Button,
  Collapse,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { MY_DRONES } from '../../utils/graphql-queries';
import type { Drone } from '../../utils/types';
import { getDroneSnapshot } from '../../utils/drone-store';
import { useDroneSelection } from '../drone-selection-provider';
import { DroneDetailsModal } from './drone-details-modal';

function resolveDrone(drone: Drone): Drone {
  return getDroneSnapshot().find((d) => d.id === drone.id) ?? drone;
}

export const DroneList = () => {
  const { t } = useTranslation();
  const [listOpen, setListOpen] = useState(true);
  const [detailsDrone, setDetailsDrone] = useState<Drone | null>(null);
  const { selectedDrone, setSelectedDrone, canManageDrones } = useDroneSelection();

  const { data, loading } = useQuery<{ myDrones: Drone[] }>(MY_DRONES, {
    skip: !canManageDrones,
  });

  if (!canManageDrones) return null;

  const drones = data?.myDrones ?? [];

  const handleDroneClick = (drone: Drone) => {
    const resolved = resolveDrone(drone);
    if (selectedDrone?.id === drone.id) {
      setDetailsDrone(resolved);
    } else {
      setSelectedDrone(resolved);
    }
  };

  return (
    <>
      <Box
        w="100%"
        borderTopWidth="1px"
        borderColor="gray.200"
        pt={3}
        mt={2}
        flexShrink={0}
      >
        <Button
          w="100%"
          size="sm"
          variant="ghost"
          justifyContent="space-between"
          fontWeight="semibold"
          onClick={() => setListOpen((open) => !open)}
        >
          {t('my-drones-title')}
          <Box as="span" fontSize="xs" aria-hidden>
            {listOpen ? '▲' : '▼'}
          </Box>
        </Button>

        <Collapse in={listOpen} animateOpacity>
          <Box maxH="200px" overflowY="auto" pt={2}>
            {loading && (
              <Text fontSize="sm" color="gray.500">
                {t('my-drones-loading')}
              </Text>
            )}
            {!loading && drones.length === 0 && (
              <Text fontSize="sm" color="gray.500">
                {t('no-drones')}
              </Text>
            )}
            <VStack align="stretch" spacing={1}>
              {drones.map((drone) => {
                const isSelected = selectedDrone?.id === drone.id;
                return (
                  <Button
                    key={drone.id}
                    size="sm"
                    variant={isSelected ? 'solid' : 'ghost'}
                    colorScheme={isSelected ? 'blue' : undefined}
                    justifyContent="flex-start"
                    fontWeight="normal"
                    h="auto"
                    py={2}
                    whiteSpace="normal"
                    textAlign="left"
                    onClick={() => handleDroneClick(drone)}
                  >
                    <Box>
                      <Text fontSize="sm" fontWeight="normal">
                        {drone.name}
                      </Text>
                      {drone.serial && (
                        <Text fontSize="xs" color={isSelected ? 'blue.100' : 'gray.500'}>
                          {drone.serial}
                        </Text>
                      )}
                    </Box>
                  </Button>
                );
              })}
            </VStack>
          </Box>
        </Collapse>
      </Box>

      {detailsDrone && (
        <DroneDetailsModal
          drone={detailsDrone}
          isOpen={!!detailsDrone}
          onClose={() => setDetailsDrone(null)}
        />
      )}
    </>
  );
};
