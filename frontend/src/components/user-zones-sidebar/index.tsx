import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Collapse,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { getZoneDisplayName } from '../../utils/user-zones';
import { useUserZonesContext } from '../user-zones-provider';
import type { DrawMode } from '../ol-map/use-user-zone-draw';

export const UserZonesSidebar: React.FC = () => {
  const { t } = useTranslation();
  const [submenuOpen, setSubmenuOpen] = useState(true);
  const [zoneName, setZoneName] = useState('');
  const [renameName, setRenameName] = useState('');

  const {
    isPilot,
    zones,
    zonesLoading,
    showUserZones,
    setShowUserZones,
    drawMode,
    isEditing,
    pendingZone,
    saving,
    error,
    selectedZoneId,
    startDraw,
    cancelDraw,
    startEdit,
    saveEdit,
    confirmCreate,
    removeZone,
    openRenameZone,
    closeRenameZone,
    renameZone,
    renamingZoneId,
    setSelectedZoneId,
  } = useUserZonesContext();

  useEffect(() => {
    if (!renamingZoneId) return;
    const zone = zones.find((z) => z.id === renamingZoneId);
    setRenameName(zone?.name?.trim() ?? '');
  }, [renamingZoneId, zones]);

  if (!isPilot) return null;

  const defaultZoneLabel = (index: number) => t('user-zone-default-name', { index });
  const renamingZone = zones.find((z) => z.id === renamingZoneId) ?? null;

  const handleOpenRename = (zoneId: string) => {
    openRenameZone(zoneId);
  };

  const drawHint = drawMode === 'POLYGON'
    ? t('user-zone-draw-polygon-hint')
    : drawMode === 'RECTANGLE'
      ? t('user-zone-draw-rectangle-hint')
      : drawMode === 'CIRCLE'
        ? t('user-zone-draw-circle-hint')
        : null;

  const handleStartDraw = (mode: DrawMode) => {
    if (drawMode === mode) {
      cancelDraw();
      return;
    }
    startDraw(mode);
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
          onClick={() => setSubmenuOpen((open) => !open)}
        >
          {t('user-zones-title')}
          <Box as="span" fontSize="xs" aria-hidden>
            {submenuOpen ? '▲' : '▼'}
          </Box>
        </Button>

        <Collapse in={submenuOpen} animateOpacity>
          <VStack align="stretch" spacing={2} pt={2}>
            <Box flexShrink={0}>
              <Checkbox
                isChecked={showUserZones}
                onChange={(e) => setShowUserZones(e.target.checked)}
                size="sm"
              >
                {t('user-zones-show-on-map')}
              </Checkbox>
              <Text fontSize="xs" color="gray.600" mt={1}>
                {t('user-zones-subtitle')}
              </Text>
            </Box>

            <Box flexShrink={0}>
              <ButtonGroup size="xs" isAttached variant="outline" w="full">
                <Button
                  flex={1}
                  colorScheme={drawMode === 'POLYGON' ? 'yellow' : undefined}
                  onClick={() => handleStartDraw('POLYGON')}
                  isDisabled={isEditing || saving}
                >
                  {t('user-zone-polygon')}
                </Button>
                <Button
                  flex={1}
                  colorScheme={drawMode === 'RECTANGLE' ? 'yellow' : undefined}
                  onClick={() => handleStartDraw('RECTANGLE')}
                  isDisabled={isEditing || saving}
                >
                  {t('user-zone-rectangle')}
                </Button>
                <Button
                  flex={1}
                  colorScheme={drawMode === 'CIRCLE' ? 'yellow' : undefined}
                  onClick={() => handleStartDraw('CIRCLE')}
                  isDisabled={isEditing || saving}
                >
                  {t('user-zone-circle')}
                </Button>
              </ButtonGroup>

              {drawHint && (
                <Text fontSize="xs" color="yellow.700" mt={2}>{drawHint}</Text>
              )}

              {isEditing && (
                <>
                  <Text fontSize="xs" color="yellow.700" mt={2}>
                    {t('user-zone-edit-hint')}
                  </Text>
                  <HStack mt={2}>
                    <Button size="xs" colorScheme="yellow" onClick={saveEdit} isLoading={saving}>
                      {t('save')}
                    </Button>
                    <Button size="xs" variant="ghost" onClick={cancelDraw}>
                      {t('user-zone-cancel')}
                    </Button>
                  </HStack>
                </>
              )}

              {error && (
                <Text fontSize="xs" color="red.500" mt={2}>{error}</Text>
              )}
            </Box>

            {zonesLoading && (
              <Text fontSize="xs" color="gray.600" flexShrink={0}>
                {t('user-zones-loading')}
              </Text>
            )}

            {zones.length > 0 && (
              <Box
                maxH="180px"
                overflowY="auto"
                flexShrink={1}
                borderWidth="1px"
                borderColor="gray.100"
                borderRadius="md"
                p={1}
              >
                <VStack align="stretch" spacing={1}>
                  {zones.map((zone) => (
                    <HStack
                      key={zone.id}
                      p={1}
                      borderRadius="sm"
                      bg={selectedZoneId === zone.id ? 'yellow.50' : undefined}
                      borderWidth={selectedZoneId === zone.id ? '1px' : 0}
                      borderColor="yellow.300"
                    >
                      <Text
                        flex={1}
                        fontSize="xs"
                        noOfLines={1}
                        cursor="pointer"
                        onClick={() => setSelectedZoneId(
                          selectedZoneId === zone.id ? null : zone.id,
                        )}
                      >
                        {getZoneDisplayName(zone, zones, defaultZoneLabel)}
                      </Text>
                      <IconButton
                        aria-label={t('user-zone-rename')}
                        size="xs"
                        variant="ghost"
                        onClick={() => handleOpenRename(zone.id)}
                        isDisabled={saving || drawMode !== null || isEditing}
                      >
                        Aa
                      </IconButton>
                      <IconButton
                        aria-label={t('user-zone-resize')}
                        size="xs"
                        variant="ghost"
                        onClick={() => startEdit(zone.id)}
                        isDisabled={saving || drawMode !== null}
                      >
                        ✎
                      </IconButton>
                      <IconButton
                        aria-label={t('user-zone-delete')}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => removeZone(zone.id)}
                        isDisabled={saving}
                      >
                        ×
                      </IconButton>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </Collapse>
      </Box>

      <Modal isOpen={pendingZone != null} onClose={cancelDraw} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('user-zone-name-title')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              placeholder={t('user-zone-name-placeholder')}
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={cancelDraw}>
              {t('user-zone-cancel')}
            </Button>
            <Button
              colorScheme="yellow"
              isLoading={saving}
              onClick={() => {
                confirmCreate(zoneName);
                setZoneName('');
              }}
            >
              {t('user-zone-save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={renamingZone != null}
        onClose={() => {
          closeRenameZone();
          setRenameName('');
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('user-zone-rename-title')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              placeholder={t('user-zone-name-placeholder')}
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renamingZone) {
                  renameZone(renamingZone.id, renameName);
                  setRenameName('');
                }
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                closeRenameZone();
                setRenameName('');
              }}
            >
              {t('user-zone-cancel')}
            </Button>
            <Button
              colorScheme="yellow"
              isLoading={saving}
              onClick={() => {
                if (renamingZone) {
                  renameZone(renamingZone.id, renameName);
                  setRenameName('');
                }
              }}
            >
              {t('save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
