import {
  Box,
  Button,
  Collapse,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useDroneNotifications } from '../drone-notification-provider';
import {
  formatNotificationMessage,
  severityColor,
} from '../../utils/notifications';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

export const NotificationCenter = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const { notifications } = useDroneNotifications();

  return (
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
        onClick={() => setOpen((value) => !value)}
      >
        {t('notifications-title')}
        <Box as="span" fontSize="xs" aria-hidden>
          {open ? '▲' : '▼'}
        </Box>
      </Button>

      <Collapse in={open} animateOpacity>
        <Box maxH="180px" overflowY="auto" pt={2}>
          {notifications.length === 0 && (
            <Text fontSize="sm" color="gray.500">
              {t('notifications-empty')}
            </Text>
          )}
          <VStack align="stretch" spacing={2}>
            {notifications.map((notification) => (
              <Box
                key={notification.id}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                overflow="hidden"
                bg="white"
              >
                <HStack align="stretch" spacing={0}>
                  <Box w="4px" bg={severityColor(notification.severity)} flexShrink={0} />
                  <Box px={2} py={2} flex={1} minW={0}>
                    <Text fontSize="xs" color="gray.500">
                      {formatTime(notification.createdAt)}
                    </Text>
                    <Text fontSize="sm" noOfLines={3}>
                      {formatNotificationMessage(notification, t)}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
};
