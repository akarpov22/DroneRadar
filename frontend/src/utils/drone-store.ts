import type { Drone } from './types';

type Listener = () => void;

let snapshot: Drone[] = [];
const listeners = new Set<Listener>();

export function setDroneSnapshot(drones: Drone[]): void {
  snapshot = drones;
  for (const listener of listeners) {
    listener();
  }
}

export function getDroneSnapshot(): Drone[] {
  return snapshot;
}

export function subscribeDrones(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
