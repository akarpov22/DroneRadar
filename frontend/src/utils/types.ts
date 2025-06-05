
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
    createdAt: string;
    sessions: Session[]
  };

  export type Model = {
    id: string;
    name: string;
    manufacturer: string;
    maxSpeed: number;
    maxRange: number;
  }