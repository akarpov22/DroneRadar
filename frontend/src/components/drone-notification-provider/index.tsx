import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery } from '@apollo/client';
import { print } from 'graphql';
import { useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import {
  DRONE_NOTIFICATION,
  DRONE_NOTIFICATIONS,
  DRONE_UPDATED,
  MY_DRONES,
} from '../../utils/graphql-queries';
import type { AlertStatus, Drone, DroneNotification } from '../../utils/types';
import { SubscriptionClientContext } from '../../apollo-client';
import { useDroneSelection } from '../drone-selection-provider';
import {
  formatNotificationMessage,
  notificationToastStatus,
} from '../../utils/notifications';

const MAX_NOTIFICATIONS = 50;
const MAX_VISIBLE_TOASTS = 2;

type DroneNotificationContextValue = {
  notifications: DroneNotification[];
  alertStatusByDroneId: Record<string, AlertStatus>;
  dismissNotification: (id: string) => void;
};

const DroneNotificationContext = createContext<DroneNotificationContextValue | null>(null);

export const DroneNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const toast = useToast({ position: 'bottom', duration: 6000, isClosable: true });
  const wsClient = useContext(SubscriptionClientContext);
  const { canManageDrones } = useDroneSelection();
  const [notifications, setNotifications] = useState<DroneNotification[]>([]);
  const [alertStatusByDroneId, setAlertStatusByDroneId] = useState<Record<string, AlertStatus>>({});
  const seenIdsRef = useRef<Set<string>>(new Set());
  const activeToastIdsRef = useRef<string[]>([]);

  const { data: myDronesData } = useQuery<{ myDrones: Drone[] }>(MY_DRONES, {
    skip: !canManageDrones,
  });

  useQuery<{ droneNotifications: DroneNotification[] }>(DRONE_NOTIFICATIONS, {
    skip: !canManageDrones,
    variables: { limit: MAX_NOTIFICATIONS },
    onCompleted: (data) => {
      const items = data.droneNotifications ?? [];
      setNotifications(items);
      items.forEach((item) => seenIdsRef.current.add(item.id));
    },
  });

  useEffect(() => {
    if (!myDronesData?.myDrones) return;
    setAlertStatusByDroneId((prev) => {
      const next = { ...prev };
      for (const drone of myDronesData.myDrones) {
        if (drone.alertStatus) {
          next[drone.id] = drone.alertStatus;
        }
      }
      return next;
    });
  }, [myDronesData]);

  const pushNotification = useCallback(
    (notification: DroneNotification) => {
      if (seenIdsRef.current.has(notification.id)) return;
      seenIdsRef.current.add(notification.id);

      setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));

      const toastId = notification.id;
      if (toast.isActive(toastId)) return;

      while (activeToastIdsRef.current.length >= MAX_VISIBLE_TOASTS) {
        const oldestId = activeToastIdsRef.current.shift();
        if (oldestId) toast.close(oldestId);
      }

      toast({
        id: toastId,
        title: notification.droneName,
        description: formatNotificationMessage(notification, t),
        status: notificationToastStatus(notification.severity),
        onCloseComplete: () => {
          activeToastIdsRef.current = activeToastIdsRef.current.filter((id) => id !== toastId);
        },
      });

      activeToastIdsRef.current.push(toastId);
    },
    [t, toast],
  );

  useEffect(() => {
    if (!wsClient || !canManageDrones) return;

    const notificationSub = wsClient.request({ query: print(DRONE_NOTIFICATION) }).subscribe({
      next: (result: { data?: { droneNotification?: DroneNotification } }) => {
        const incoming = result.data?.droneNotification;
        if (!incoming) return;
        pushNotification(incoming);
      },
      error: (error: unknown) => {
        console.error('Drone notification subscription error:', error);
      },
    });

    const droneSub = wsClient.request({ query: print(DRONE_UPDATED) }).subscribe({
      next: (result: { data?: { droneUpdated?: Drone } }) => {
        const incoming = result.data?.droneUpdated;
        if (!incoming?.alertStatus) return;
        setAlertStatusByDroneId((prev) => ({
          ...prev,
          [incoming.id]: incoming.alertStatus as AlertStatus,
        }));
      },
      error: (error: unknown) => {
        console.error('Drone alert status subscription error:', error);
      },
    });

    return () => {
      notificationSub.unsubscribe();
      droneSub.unsubscribe();
    };
  }, [wsClient, canManageDrones, pushNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({ notifications, alertStatusByDroneId, dismissNotification }),
    [notifications, alertStatusByDroneId, dismissNotification],
  );

  if (!canManageDrones) {
    return <>{children}</>;
  }

  return (
    <DroneNotificationContext.Provider value={value}>
      {children}
    </DroneNotificationContext.Provider>
  );
};

export const useDroneNotifications = () => {
  const context = useContext(DroneNotificationContext);
  if (!context) {
    return {
      notifications: [] as DroneNotification[],
      alertStatusByDroneId: {} as Record<string, AlertStatus>,
      dismissNotification: () => {},
    };
  }
  return context;
};
