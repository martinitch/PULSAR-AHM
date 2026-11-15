/* Latest reading received from a BLE device, shared between the watch and the kits. */
import { useSyncExternalStore } from "react";
import type { BleReading } from "./gatt";

let current: BleReading | null = null;
const listeners = new Set<() => void>();

export function publishReading(partial: BleReading) {
  current = { ...current, ...partial, deviceName: partial.deviceName, at: partial.at };
  listeners.forEach((fn) => fn());
}

export function clearReading() {
  current = null;
  listeners.forEach((fn) => fn());
}

export function useBleReading(): BleReading | null {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => current,
    () => null,
  );
}
