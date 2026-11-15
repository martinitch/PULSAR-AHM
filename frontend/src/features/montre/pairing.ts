/* Pairing: the radio lists devices actually in range, then opens the link.
   localStorage persistence per astronaut. The "in progress" state stays local. */
import { useCallback, useEffect, useRef, useState } from "react";
import { disconnect as disconnectBle, hasWebBluetooth, holdDevice, listen, requestNearbyDevice, takeDevice } from "@/features/ble/gatt";
import { connectRadio, disconnectRadio, followRadioLink, radioDevices, radioLink, radioStatus, startRadioScan, stopRadioScan } from "@/features/ble/radio";
import { buzzEspFort } from "@/features/sound/hardwareBuzzer";
import { clearReading, publishReading } from "@/features/ble/store";

export type WatchPairState = "idle" | "enabling" | "scanning" | "paired";

export type NearbyWatch = { id: string; name: string; rssi: number; live?: boolean; esp?: boolean };

export type WatchPairing = {
  state: WatchPairState;
  watchId: string | null;
  watchName: string | null;
  pairedAt: string | null;
};

const key = (crewId: string) => `pulsar.watch.${crewId}`;
const MAC = /^[0-9A-F]{2}(?::[0-9A-F]{2}){5}$/i;
const NO_RADIO = "Cette page ne joint pas la radio Bluetooth. Ouvrez l’application avec npm run dev pour voir les appareils réellement à portée.";

const EMPTY: WatchPairing = { state: "idle", watchId: null, watchName: null, pairedAt: null };

const listeners = new Set<() => void>();
function emit() { listeners.forEach((fn) => fn()); }

export function loadPairing(crewId: string): WatchPairing {
  try {
    const raw = JSON.parse(localStorage.getItem(key(crewId)) || "null");
    if (!raw || typeof raw !== "object") return { ...EMPTY };
    return {
      state: raw.watchId ? "paired" : "idle",
      watchId: raw.watchId ?? null,
      watchName: raw.watchName ?? null,
      pairedAt: raw.pairedAt ?? null,
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(crewId: string, p: WatchPairing) {
  localStorage.setItem(key(crewId), JSON.stringify({ watchId: p.watchId, watchName: p.watchName, pairedAt: p.pairedAt }));
  emit();
}

export function useWatchPairing(crewId: string) {
  const [p, setP] = useState<WatchPairing>(() => (typeof localStorage === "undefined" ? EMPTY : loadPairing(crewId)));
  const [nearby, setNearby] = useState<NearbyWatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bridge, setBridge] = useState(false);
  const [radioPending, setRadioPending] = useState(true);
  const [liveLink, setLiveLink] = useState(false);
  const timers = useRef<number[]>([]);
  const scanning = useRef(false);
  const stopFollow = useRef<(() => void) | null>(null);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const stopFollowLink = () => {
    stopFollow.current?.();
    stopFollow.current = null;
  };

  const follow = useCallback((name: string) => {
    stopFollowLink();
    stopFollow.current = followRadioLink((link) => {
      publishReading({ deviceName: link.name || name, at: Date.now(), ...link.reading });
      setLiveLink(true);
    });
  }, []);

  useEffect(() => {
    let live = true;
    setRadioPending(true);
    radioStatus().then((ok) => {
      if (!live) return;
      setBridge(ok);
      setRadioPending(false);
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    setP(loadPairing(crewId));
    setNearby([]);
    setLiveLink(false);
    scanning.current = false;
    let live = true;
    void radioLink().then((link) => {
      if (!live || !link) return;
      const next: WatchPairing = { state: "paired", watchId: link.id, watchName: link.name, pairedAt: new Date().toISOString() };
      save(crewId, next);
      setP(next);
      setLiveLink(true);
      follow(link.name);
    });
    return () => {
      live = false;
      clearTimers();
      scanning.current = false;
      stopFollowLink();
      void stopRadioScan();
    };
  }, [crewId, follow]);

  useEffect(() => {
    const pull = () => {
      if (scanning.current) return;
      setP(loadPairing(crewId));
    };
    listeners.add(pull);
    return () => { listeners.delete(pull); };
  }, [crewId]);

  const enableBluetooth = useCallback(() => {
    clearTimers();
    scanning.current = true;
    setNearby([]);
    setError(null);
    clearReading();
    setLiveLink(false);
    setP((cur) => ({ ...cur, state: "enabling" }));
    const useBrowser = () => {
      requestNearbyDevice().then((device) => {
        if (!scanning.current) return;
        holdDevice(device);
        setNearby([{ id: device.id, name: device.name || "Appareil Bluetooth", rssi: 0, live: true }]);
        setP((cur) => ({ ...cur, state: "scanning" }));
      }).catch((err: Error) => {
        scanning.current = false;
        if (err.name === "NotFoundError") {
          setP(loadPairing(crewId));
          return;
        }
        setError("Le Bluetooth du navigateur n’a pas pu lister les appareils. Vérifiez qu’il est allumé, puis réessayez.");
        setP(loadPairing(crewId));
      });
    };
    void radioStatus().then(async (ok) => {
      if (!scanning.current) return;
      setBridge(ok);
      setRadioPending(false);
      if (ok) {
        const failure = await startRadioScan();
        if (!scanning.current) {
          void stopRadioScan();
          return;
        }
        if (failure) {
          scanning.current = false;
          setError(failure);
          setP(loadPairing(crewId));
          return;
        }
        setP((cur) => ({ ...cur, state: "scanning" }));
        const tick = window.setInterval(() => {
          void radioDevices().then((list) => {
            if (!scanning.current) return;
            setNearby(list.map((d) => ({ id: d.id, name: d.name, rssi: d.rssi, esp: d.esp, live: true })));
          });
        }, 800);
        timers.current.push(tick);
        return;
      }
      if (hasWebBluetooth()) {
        useBrowser();
        return;
      }
      scanning.current = false;
      setError(NO_RADIO);
      setP(loadPairing(crewId));
    });
  }, [crewId]);

  const pair = useCallback((w: NearbyWatch) => {
    clearTimers();
    scanning.current = false;
    const openBrowser = (device: NonNullable<ReturnType<typeof takeDevice>>) => {
      void listen(device, publishReading).then(() => {
        publishReading({ deviceName: device.name || w.name, at: Date.now() });
      }).catch(() => {
        setError("La liaison Bluetooth a échoué. Rapprochez l’appareil et réessayez.");
        setLiveLink(false);
      });
    };
    const done = () => {
      const next: WatchPairing = { state: "paired", watchId: w.id, watchName: w.name, pairedAt: new Date().toISOString() };
      save(crewId, next);
      setP(next);
      setNearby([]);
      setLiveLink(true);
      publishReading({ deviceName: w.name, at: Date.now() });
      buzzEspFort();
    };
    void (async () => {
      await stopRadioScan();
      if (w.live && MAC.test(w.id)) {
        const failure = await connectRadio(w.id, w.name);
        if (failure) {
          setError(failure);
          setP(loadPairing(crewId));
          setLiveLink(false);
          return;
        }
        done();
        follow(w.name);
        return;
      }
      done();
      const held = takeDevice(w.id);
      if (held) {
        openBrowser(held);
        return;
      }
      if (w.live && hasWebBluetooth()) {
        requestNearbyDevice(w.name).then((device) => {
          holdDevice(device);
          openBrowser(device);
        }).catch((err: Error) => {
          if (err.name === "NotFoundError") return;
          setError("La liaison Bluetooth a échoué. Rapprochez l’appareil et réessayez.");
        });
      }
    })();
  }, [crewId, follow]);

  const disconnect = useCallback(() => {
    clearTimers();
    scanning.current = false;
    stopFollowLink();
    if (p.watchId) disconnectBle(p.watchId);
    void disconnectRadio();
    void stopRadioScan();
    clearReading();
    save(crewId, { ...EMPTY });
    setP({ ...EMPTY });
    setNearby([]);
    setLiveLink(false);
    setError(null);
  }, [crewId, p.watchId]);

  const cancelScan = useCallback(() => {
    clearTimers();
    scanning.current = false;
    void stopRadioScan();
    setNearby([]);
    setP(loadPairing(crewId));
  }, [crewId]);

  return {
    ...p,
    nearby,
    error,
    enableBluetooth,
    pair,
    disconnect,
    cancelScan,
    active: liveLink && !!p.watchId && p.watchId !== "pc-print",
    liveRadio: hasWebBluetooth() || bridge,
    radioPending,
  };
}
