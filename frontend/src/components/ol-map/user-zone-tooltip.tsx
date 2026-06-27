import React from 'react';
import { Box, Button, CloseButton, Flex, HStack, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import type { UserZoneResult } from '../../utils/user-zones';
import { getZoneDisplayName } from '../../utils/user-zones';

interface UserZoneTooltipProps {
  zone: UserZoneResult;
  zones: UserZoneResult[];
  isEditing: boolean;
  saving: boolean;
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
}

export const UserZoneTooltip: React.FC<UserZoneTooltipProps> = ({
  zone,
  zones,
  isEditing,
  saving,
  onEdit,
  onRename,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      position="absolute"
      top={4}
      left="50%"
      transform="translateX(-50%)"
      zIndex={1000}
      bg="rgba(255, 255, 255, 0.95)"
      border="1px solid"
      borderColor="yellow.300"
      borderRadius="md"
      shadow="lg"
      w="min(360px, calc(100% - 2rem))"
      fontSize="sm"
      overflow="hidden"
    >
      <Flex
        align="center"
        justify="space-between"
        gap={2}
        px={3}
        py={2}
        borderBottomWidth="1px"
        borderColor="yellow.100"
        bg="yellow.50"
      >
        <Text fontWeight="semibold" fontSize="sm" lineHeight="short">
          {getZoneDisplayName(zone, zones, (index) => t('user-zone-default-name', { index }))}
        </Text>
        <CloseButton size="sm" onClick={onClose} />
      </Flex>
      <Box px={3} py={3}>
        {isEditing && (
          <Text fontSize="xs" color="gray.600" mb={2}>
            {t('user-zone-edit-hint')}
          </Text>
        )}
        <HStack spacing={2}>
          {isEditing ? (
            <>
              <Button size="xs" colorScheme="yellow" onClick={onSaveEdit} isLoading={saving}>
                {t('save')}
              </Button>
              <Button size="xs" variant="ghost" onClick={onCancelEdit}>
                {t('user-zone-cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button size="xs" colorScheme="yellow" variant="outline" onClick={onRename}>
                {t('user-zone-rename')}
              </Button>
              <Button size="xs" colorScheme="yellow" variant="outline" onClick={onEdit}>
                {t('user-zone-resize')}
              </Button>
              <Button size="xs" colorScheme="red" variant="outline" onClick={onDelete} isLoading={saving}>
                {t('user-zone-delete')}
              </Button>
            </>
          )}
        </HStack>
      </Box>
    </Box>
  );
};
