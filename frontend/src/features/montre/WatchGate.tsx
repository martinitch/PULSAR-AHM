/* Account watch: already linked over Wi-Fi to the ESP32-C3. No Bluetooth scan. */
import type { ReactNode } from "react";

export type WifiWatch = {
  watchName: string;
  disconnect: () => void;
};

export function WatchSection({ children }: { crewId: string; children: (w: WifiWatch) => ReactNode }) {
  return <>{children({ watchName: "ESP32-C3 · Wi-Fi", disconnect: () => {} })}</>;
}
