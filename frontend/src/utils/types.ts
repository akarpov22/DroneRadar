
export type Region = {
    id: string;
    name: string;
    regionCode: string;
  };

  export type Position = {
    id: string
    altitude: number | null;
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    recordedAt: string
  };
  

export type Session = {
    id: string
    startedAt: string
    endedAt: string | null;
    // region: Region
    positions: Position[]
}

export type Drone = {
    id: string;
    name: string;
    serial: string | null;
    model: Model;
    operator: string;
    alertStatus?: AlertStatus;
    createdAt: string;
    sessions: Session[]
  };

export type AlertStatus = 'GREEN' | 'YELLOW' | 'RED';

export type AlertKind =
  | 'DRONE_PROXIMITY'
  | 'ZONE_APPROACH'
  | 'ZONE_ENTER'
  | 'COLLISION_ALTITUDE'
  | 'CLEARED';

export type AlertSeverity = 'YELLOW' | 'RED' | 'GREEN';

export type DroneNotification = {
  id: string;
  droneId: string;
  droneName: string;
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
  relatedDroneId: string | null;
  relatedDroneName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  createdAt: string;
};

  export type Model = {
    id: string;
    name: string;
    manufacturer: string;
    maxSpeed: number;
    maxRange: number;
  }