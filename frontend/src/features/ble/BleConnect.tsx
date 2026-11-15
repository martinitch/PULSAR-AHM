/* Button that starts a real Bluetooth search (BlueZ) or the browser picker. */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { useLang } from "@/i18n";
import { hasWebBluetooth, holdDevice, listen, requestNearbyDevice } from "./gatt";
import { connectRadio, followRadioLink, radioDevices, radioStatus, startRadioScan, stopRadioScan, type RadioDevice } from "./radio";
import { clearReading, publishReading, useBleReading } from "./store";
import { buzzEspFort } from "@/features/sound/hardwareBuzzer";

export function BleConnect() {
  const { tr } = useLang();
  const reading = useBleReading();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bridge, setBridge] = useState(false);
  const [radioPending, setRadioPending] = useState(true);
  const [found, setFound] = useState<RadioDevice[]>([]);
  const supported = hasWebBluetooth();
  const alive = useRef(true);
  const poll = useRef<number | null>(null);
  const stopFollow = useRef<(() => void) | null>(null);
  const scanGen = useRef(0);

  useEffect(() => {
    alive.current = true;
    radioStatus().then((ok) => {
      if (!alive.current) return;
      setBridge(ok);
      setRadioPending(false);
    });
    return () => {
      alive.current = false;
      scanGen.current += 1;
      if (poll.current != null) window.clearInterval(poll.current);
      stopFollow.current?.();
      void stopRadioScan();
    };
  }, []);

  const stop = () => {
    scanGen.current += 1;
    setBusy(false);
    if (poll.current != null) window.clearInterval(poll.current);
    poll.current = null;
    void stopRadioScan();
  };

  const pick = () => {
    setError(null);
    const gen = ++scanGen.current;
    if (bridge) {
      setBusy(true);
      setFound([]);
      void startRadioScan().then(async (failure) => {
        if (!alive.current || gen !== scanGen.current) return;
        if (failure) {
          setError(failure);
          setBusy(false);
          return;
        }
        const pull = async () => {
          if (!alive.current || gen !== scanGen.current) return;
          setFound(await radioDevices());
        };
        await pull();
        if (!alive.current || gen !== scanGen.current) return;
        if (poll.current != null) window.clearInterval(poll.current);
        poll.current = window.setInterval(() => { void pull(); }, 800);
      });
      return;
    }
    if (!supported) {
      setError(tr("Ce navigateur ne donne pas accès au Bluetooth, et la radio de cet ordinateur n’est pas joignable. Ouvrez http://localhost:5173 avec le serveur de développement.", "This browser does not expose Bluetooth, and this computer’s radio is unreachable. Open http://localhost:5173 with the development server."));
      return;
    }
    setBusy(true);
    requestNearbyDevice()
      .then(async (device) => {
        holdDevice(device);
        await listen(device, publishReading);
        publishReading({ deviceName: device.name || tr("Appareil Bluetooth", "Bluetooth device"), at: Date.now() });
        buzzEspFort();
      })
      .catch((err: Error) => {
        if (err.name !== "NotFoundError") setError(tr("Connexion interrompue. L’appareil doit être allumé et à portée.", "Connection interrupted. The device must be on and in range."));
      })
      .finally(() => setBusy(false));
  };

  const connect = (device: RadioDevice) => {
    setError(null);
    setFound([]);
    if (poll.current != null) window.clearInterval(poll.current);
    poll.current = null;
    setBusy(true);
    void (async () => {
      await stopRadioScan();
      if (!alive.current) return;
      if (device.id.includes(":")) {
        const failure = await connectRadio(device.id, device.name);
        if (!alive.current) return;
        if (failure) {
          setError(failure);
          setBusy(false);
          return;
        }
        publishReading({ deviceName: device.name, at: Date.now() });
        buzzEspFort();
        stopFollow.current?.();
        stopFollow.current = followRadioLink((link) => {
          publishReading({ deviceName: link.name, at: Date.now(), ...link.reading });
        });
        setBusy(false);
        return;
      }
      if (!supported) {
        setBusy(false);
        return;
      }
      try {
        const chosen = await requestNearbyDevice(device.name);
        holdDevice(chosen);
        await listen(chosen, publishReading);
        publishReading({ deviceName: chosen.name || device.name, at: Date.now() });
        buzzEspFort();
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name !== "NotFoundError") setError(tr("Connexion interrompue. L’appareil doit être allumé et à portée.", "Connection interrupted. The device must be on and in range."));
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="ble-panel">
      <div className="kit-card-head">
        <button type="button" className="btn btn-secondary sm" onClick={busy ? stop : () => { clearReading(); pick(); }} disabled={radioPending}>
          <Icon name="bluetooth" size={16} /> {busy ? tr("Arrêter", "Stop") : tr("Détecter un appareil", "Detect a device")}
        </button>
        <span className={reading ? "chip ok" : "chip"}>
          <Icon name={reading ? "bluetooth_connected" : "bluetooth"} size={14} />
          {reading ? reading.deviceName : bridge || supported ? tr("Aucun appareil", "No device") : tr("Bluetooth indisponible", "Bluetooth unavailable")}
        </span>
      </div>
      <p className="r-note">{tr("Noms annoncés par les appareils à portée. L’ESP porte son propre nom Bluetooth.", "Names advertised by devices in range. The ESP uses its own Bluetooth name.")}</p>
      {error && <p className="r-note" role="alert">{error}</p>}
      {found.length > 0 && (
        <ul className="watch-scan-list" aria-label={tr("Appareils Bluetooth à portée", "Bluetooth devices in range")}>
          {found.map((device) => (
            <li key={device.id}>
              <span>
                <Icon name="bluetooth" size={16} />
                <b className={device.name === device.id ? "mono" : undefined}>{device.name}</b>
                {device.rssi !== 0 && <span className="mono">{device.rssi} dBm</span>}
                {device.esp && <span className="chip">ESP</span>}
              </span>
              <button type="button" className="btn btn-primary sm" onClick={() => connect(device)}>{tr("Connecter", "Connect")}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
