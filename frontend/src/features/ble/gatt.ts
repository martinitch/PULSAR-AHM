/* Web Bluetooth (Chrome / Edge, localhost or https).
   The browser shows BLE devices actually in range. The choice is the user's.
   Without this API, the app stays on the DEMO simulator. */

export const OPTIONAL_SERVICES = [
  "heart_rate",
  "battery_service",
  "blood_pressure",
  "glucose",
  "health_thermometer",
  "pulse_oximeter",
] as const;

export type BleReading = {
  deviceName: string;
  heartRate?: number;
  spo2?: number;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucoseMgDl?: number;
  temperatureC?: number;
  at: number;
};

type Char = {
  properties: { notify: boolean; indicate: boolean; read: boolean };
  startNotifications: () => Promise<Char>;
  readValue: () => Promise<DataView>;
  addEventListener: (type: "characteristicvaluechanged", fn: (ev: Event) => void) => void;
  value?: DataView | null;
};

type Srv = { getCharacteristic: (name: string) => Promise<Char> };
type Server = { getPrimaryServices: () => Promise<Srv[]> };
export type BleDevice = {
  id: string;
  name?: string;
  gatt?: { connect: () => Promise<Server>; disconnect: () => void; connected: boolean };
  addEventListener: (type: "gattserverdisconnected", fn: () => void) => void;
};

type RequestOpts =
  | { acceptAllDevices: true; optionalServices: string[] }
  | { filters: { name?: string; namePrefix?: string }[]; optionalServices: string[] };

type BluetoothApi = {
  requestDevice: (opts: RequestOpts) => Promise<BleDevice>;
};

const held = new Map<string, BleDevice>();

export function hasWebBluetooth(): boolean {
  return bluetooth() !== null;
}

function bluetooth(): BluetoothApi | null {
  const nav = navigator as Navigator & { bluetooth?: BluetoothApi };
  return typeof nav.bluetooth?.requestDevice === "function" ? nav.bluetooth : null;
}

export function holdDevice(device: BleDevice) {
  held.set(device.id, device);
}

export function takeDevice(id: string) {
  return held.get(id) ?? null;
}

const MAC = /^[0-9A-F]{2}(?::[0-9A-F]{2}){5}$/i;

/** Must be called inside the click. Opens the browser's real picker. */
export function requestNearbyDevice(name?: string): Promise<BleDevice> {
  const api = bluetooth();
  if (!api) return Promise.reject(new Error("Web Bluetooth indisponible"));
  const services = [...OPTIONAL_SERVICES];
  if (name && !MAC.test(name)) return api.requestDevice({ filters: [{ name }], optionalServices: services });
  return api.requestDevice({ acceptAllDevices: true, optionalServices: services });
}

/** IEEE 11073 SFLOAT 16 bits. */
export function decodeSFloat(raw: number): number {
  let mantissa = raw & 0x0fff;
  let exponent = raw >> 12;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  if (exponent >= 0x0008) exponent -= 0x0010;
  if (mantissa === 0x07ff || mantissa === 0x0800) return Number.NaN;
  return mantissa * 10 ** exponent;
}

/** IEEE 11073 FLOAT 32 bits. */
export function decodeFloat(raw: number): number {
  const expByte = (raw >>> 24) & 0xff;
  const exponent = expByte >= 128 ? expByte - 256 : expByte;
  let mantissa = raw & 0x00ffffff;
  if (mantissa & 0x00800000) mantissa -= 0x01000000;
  if (mantissa === 0x7fffff || mantissa === -0x800000) return Number.NaN;
  return mantissa * 10 ** exponent;
}

export function parseHeartRate(view: DataView): number | null {
  if (view.byteLength < 2) return null;
  const flags = view.getUint8(0);
  const hr = flags & 0x01 ? view.getUint16(1, true) : view.getUint8(1);
  return hr > 0 && hr < 250 ? hr : null;
}

export function parseBloodPressure(view: DataView): { systolic: number; diastolic: number; pulse?: number } | null {
  if (view.byteLength < 7) return null;
  const flags = view.getUint8(0);
  const kPa = (flags & 0x01) !== 0;
  const toMmhg = (v: number) => (kPa ? v * 7.50062 : v);
  const systolic = Math.round(toMmhg(decodeSFloat(view.getUint16(1, true))));
  const diastolic = Math.round(toMmhg(decodeSFloat(view.getUint16(3, true))));
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  let offset = 7;
  if (flags & 0x02) offset += 7;
  let pulse: number | undefined;
  if ((flags & 0x04) && view.byteLength >= offset + 2) {
    const p = decodeSFloat(view.getUint16(offset, true));
    if (Number.isFinite(p)) pulse = Math.round(p);
  }
  return { systolic, diastolic, pulse };
}

export function parseGlucoseMgDl(view: DataView): number | null {
  if (view.byteLength < 10) return null;
  const flags = view.getUint8(0);
  if ((flags & 0x02) === 0) return null;
  let offset = 3 + 7;
  if (flags & 0x01) offset += 2;
  if (view.byteLength < offset + 2) return null;
  const raw = decodeSFloat(view.getUint16(offset, true));
  if (!Number.isFinite(raw)) return null;
  const mol = (flags & 0x04) !== 0;
  const mg = mol ? raw * 18015.6 : raw * 100000;
  const rounded = Math.round(mg);
  return rounded > 0 && rounded < 600 ? rounded : null;
}

export function parseTemperatureC(view: DataView): number | null {
  if (view.byteLength < 5) return null;
  const flags = view.getUint8(0);
  const fahrenheit = (flags & 0x01) !== 0;
  const value = decodeFloat(view.getUint32(1, true));
  if (!Number.isFinite(value)) return null;
  const c = fahrenheit ? (value - 32) * 5 / 9 : value;
  return c > 30 && c < 45 ? Math.round(c * 10) / 10 : null;
}

export function parseSpo2(view: DataView): { spo2: number; pulse?: number } | null {
  if (view.byteLength < 5) return null;
  const spo2 = decodeSFloat(view.getUint16(1, true));
  const pulse = decodeSFloat(view.getUint16(3, true));
  if (!Number.isFinite(spo2)) return null;
  return { spo2: Math.round(spo2 * 10) / 10, pulse: Number.isFinite(pulse) ? Math.round(pulse) : undefined };
}

const LISTEN: { char: string; apply: (view: DataView, into: BleReading) => void }[] = [
  { char: "heart_rate_measurement", apply: (v, into) => { const hr = parseHeartRate(v); if (hr != null) into.heartRate = hr; } },
  { char: "blood_pressure_measurement", apply: (v, into) => { const bp = parseBloodPressure(v); if (bp) { into.systolic = bp.systolic; into.diastolic = bp.diastolic; if (bp.pulse != null) into.pulse = bp.pulse; } } },
  { char: "glucose_measurement", apply: (v, into) => { const g = parseGlucoseMgDl(v); if (g != null) into.glucoseMgDl = g; } },
  { char: "temperature_measurement", apply: (v, into) => { const t = parseTemperatureC(v); if (t != null) into.temperatureC = t; } },
  { char: "plx_spot_check_measurement", apply: (v, into) => { const s = parseSpo2(v); if (s) { into.spo2 = s.spo2; if (s.pulse != null) into.pulse = s.pulse; } } },
  { char: "plx_continuous_measurement", apply: (v, into) => { const s = parseSpo2(v); if (s) { into.spo2 = s.spo2; if (s.pulse != null) into.pulse = s.pulse; } } },
];

/** Opens the GATT link. Returns true if a standard measurement (pulse, SpO₂, blood pressure…) is read. */
export async function listen(device: BleDevice, onReading: (reading: BleReading) => void): Promise<boolean> {
  const server = await device.gatt?.connect();
  if (!server) throw new Error("Connexion GATT impossible");
  const name = device.name || "Appareil BLE";
  const emit = (view: DataView, apply: (view: DataView, into: BleReading) => void) => {
    const into: BleReading = { deviceName: name, at: Date.now() };
    apply(view, into);
    if (Object.keys(into).length > 2) onReading(into);
  };
  const services = await server.getPrimaryServices();
  let found = 0;
  await Promise.all(services.map(async (service) => {
    await Promise.all(LISTEN.map(async (item) => {
      try {
        const characteristic = await service.getCharacteristic(item.char);
        found += 1;
        const take = (view: DataView | undefined | null) => { if (view) emit(view, item.apply); };
        if (characteristic.properties.notify || characteristic.properties.indicate) {
          await characteristic.startNotifications();
          characteristic.addEventListener("characteristicvaluechanged", () => take(characteristic.value));
        }
        if (characteristic.properties.read) take(await characteristic.readValue());
      } catch { /* this service does not have this characteristic */ }
    }));
  }));
  return found > 0;
}

export function disconnect(id: string) {
  const device = held.get(id);
  try { device?.gatt?.disconnect(); } catch { /* already disconnected */ }
  held.delete(id);
}
