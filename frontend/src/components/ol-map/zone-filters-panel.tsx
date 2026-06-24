import React from 'react';
import { Box, Checkbox, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import {
  ZONE_FILTER_TYPES,
  type ZoneFilters,
  type ZoneFilterType,
} from '../../utils/flight-zones';
import { ZONE_TYPE_I18N } from './types';

interface ZoneFiltersPanelProps {
  showFlightZones: boolean;
  onShowFlightZonesChange: (show: boolean) => void;
  zoneFilters: ZoneFilters;
  onToggleZoneFilter: (type: ZoneFilterType) => void;
  zonesLoading: boolean;
}

export const ZoneFiltersPanel: React.FC<ZoneFiltersPanelProps> = ({
  showFlightZones,
  onShowFlightZonesChange,
  zoneFilters,
  onToggleZoneFilter,
  zonesLoading,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      position="absolute"
      bottom={4}
      right={4}
      zIndex={1000}
      bg="whiteAlpha.900"
      p={3}
      borderRadius="md"
      shadow="md"
      maxW="280px"
    >
      <VStack align="stretch" spacing={2}>
        <Checkbox
          isChecked={showFlightZones}
          onChange={(e) => onShowFlightZonesChange(e.target.checked)}
          size="sm"
        >
          {t('flight-restriction-zones')}
        </Checkbox>
        {showFlightZones && ZONE_FILTER_TYPES.map((type) => (
          <Checkbox
            key={type}
            isChecked={zoneFilters[type]}
            onChange={() => onToggleZoneFilter(type)}
            size="sm"
            pl={4}
          >
            {t(ZONE_TYPE_I18N[type])}
          </Checkbox>
        ))}
        {zonesLoading && (
          <Text fontSize="xs" color="gray.600">{t('flight-zones-loading')}</Text>
        )}
        {showFlightZones && (
          <Text fontSize="xs" color="gray.500">© LFV — Drönarkarta</Text>
        )}
      </VStack>
    </Box>
  );
};
