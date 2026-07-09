import { Box, Button, HStack, useBreakpointValue } from '@chakra-ui/react';
import { OlMap } from '../ol-map';
import { useDroneSelection } from '../drone-selection-provider';
import { DroneMenu } from '../drone-menu';
import { MobileDroneMenu } from '../mobile-drone-menu';
import { AuthOverlay } from '../auth-overlay';
import { useShowSidebar } from '../../auth/use-auth-session';
import { useUserZonesContext } from '../user-zones-provider';
import { useEffect, useState } from 'react';

export const DroneRadar = () => {
  const { selectedDrone, setSelectedDrone } = useDroneSelection();
  const { interactionActive } = useUserZonesContext();
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useBreakpointValue({ base: false, md: true });
  const showSidebar = useShowSidebar();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (!!selectedDrone && !isDesktop && showSidebar) {
      setIsOpen(true);
    }
  }, [selectedDrone, isDesktop, showSidebar]);

  useEffect(() => {
    if (!selectedDrone) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (interactionActive) return;
      setSelectedDrone(undefined);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDrone, setSelectedDrone, interactionActive]);

  return (
    <HStack w="100%" h="100vh" spacing={0} align="stretch">
      {showSidebar && (isDesktop ? <DroneMenu /> : (
        <MobileDroneMenu isOpen={isOpen} onClose={() => setIsOpen(false)} />
      ))}
      <Box
        flex={1}
        position="relative"
        w={showSidebar && isDesktop ? '80%' : '100%'}
        h="100%"
      >
        <Box
          position="absolute"
          inset={0}
          w="100%"
          h="100%"
          filter={loginModalOpen ? 'blur(6px)' : undefined}
          transition="filter 0.25s ease"
          pointerEvents={loginModalOpen ? 'none' : undefined}
        >
          <OlMap />
        </Box>
        {showSidebar && !isDesktop && (
          <Button
            position="absolute"
            bottom={4}
            left={4}
            zIndex={1000}
            size="sm"
            colorScheme="blue"
            shadow="md"
            onClick={() => setIsOpen(true)}
          >
            Меню
          </Button>
        )}
        <AuthOverlay onLoginModalOpenChange={setLoginModalOpen} />
      </Box>
    </HStack>
  );
};
