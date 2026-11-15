/* Client for the Bluetooth bridge served by Vite in development (`/__ble/*`).
   The computer's radio lists the names actually advertised, then opens the link. */
import type { BleReading } from "./gatt";

export type RadioDevice = { id: string; name: string; rssi: number; esp: boolean };

export type RadioLink = {
  id: string;
  name: string;
  connected: boolean;
  services: string[];
  reading: Partial<BleReading>;
};

async function readJson(path: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(path, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("json")) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function radioStatus(): Promise<boolean> {
  const body = await readJson("/__ble/status");
  return body?.ok === true;
}

export async function startRadioScan(): Promise<string | null> {
  const body = await readJson("/__ble/start", { method: "POST" });
  if (!body) return "La recherche Bluetooth n’a pas répondu.";
  if (body.ok === true) return null;
  return typeof body.error === "string" ? body.error : "La recherche Bluetooth a échoué.";
}

export async function radioDevices(): Promise<RadioDevice[]> {
  const body = await readJson("/__ble/devices");
  const list = body?.devices;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") return [];
    return [{ id: row.id, name: row.name, rssi: typeof row.rssi === "number" ? row.rssi : 0, esp: row.esp === true }];
  });
}

export async function stopRadioScan(): Promise<void> {
  await readJson("/__ble/stop", { method: "POST" });
}

export async function connectRadio(id: string, name: string): Promise<string | null> {
  const body = await readJson("/__ble/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name }),
  });
  if (!body) return "La liaison Bluetooth a échoué. Rapprochez l’appareil et réessayez.";
  if (body.ok === true) return null;
  return typeof body.error === "string" ? body.error : "Impossible de joindre cet appareil. Laissez-le allumé, à portée, puis réessayez.";
}

export async function radioLink(): Promise<RadioLink | null> {
  const body = await readJson("/__ble/link");
  const link = body?.link;
  if (!link || typeof link !== "object") return null;
  const row = link as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string" || row.connected !== true) return null;
  const services = Array.isArray(row.services) ? row.services.filter((item): item is string => typeof item === "string") : [];
  const reading: Partial<BleReading> = {};
  const raw = row.reading;
  if (raw && typeof raw === "object") {
    const values = raw as Record<string, unknown>;
    for (const key of ["heartRate", "spo2", "systolic", "diastolic", "pulse", "glucoseMgDl", "temperatureC"] as const) {
      if (typeof values[key] === "number") reading[key] = values[key];
    }
  }
  return { id: row.id, name: row.name, connected: true, services, reading };
}

export async function disconnectRadio(): Promise<void> {
  await readJson("/__ble/disconnect", { method: "POST" });
}

/** Follows the link opened by the computer's radio. */
export function followRadioLink(onLink: (link: RadioLink) => void): () => void {
  let stop = false;
  const tick = () => {
    if (stop) return;
    void radioLink().then((link) => { if (!stop && link) onLink(link); });
  };
  tick();
  const id = window.setInterval(tick, 1000);
  return () => {
    stop = true;
    window.clearInterval(id);
  };
}
