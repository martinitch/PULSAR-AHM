/* Real Bluetooth search for the Vite development server.
   Windows: bleak (machine radio, advertised names). Linux: bluetoothctl.
   Absent from `vite preview` and from tests. */
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

export type SeenDevice = { id: string; name: string; rssi: number; named: boolean; esp: boolean; seenAt: number };

export type LiveReading = {
  heartRate?: number;
  spo2?: number;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucoseMgDl?: number;
  temperatureC?: number;
};

export type LiveLink = {
  id: string;
  name: string;
  connected: boolean;
  services: string[];
  reading: LiveReading;
};

const ANSI = /\u001b\[[0-9;]*m/g;
const MAC_NAME = /^[0-9A-F]{2}([:-][0-9A-F]{2}){5}$/i;
const ESP_NAME = /ESP[\s-]?32|ESPRESSIF|^ESP/i;
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(serverDir, "ble_scan.py");

const devices = new Map<string, SeenDevice>();
let scanProc: ChildProcess | null = null;
let linkProc: ChildProcess | null = null;
let starting: Promise<{ ok: boolean; error?: string }> | null = null;
let connecting: Promise<{ ok: boolean; error?: string; services?: string[] }> | null = null;
let link: LiveLink | null = null;
let pythonBin: string | null | undefined;

function bluezAvailable(): boolean {
  return (existsSync("/bin/bluetoothctl") || existsSync("/usr/bin/bluetoothctl"))
    && (existsSync("/bin/stdbuf") || existsSync("/usr/bin/stdbuf"));
}

function pythonCandidates(): string[] {
  if (process.platform === "win32") {
    return [path.join(serverDir, "..", ".venv", "Scripts", "python.exe"), "python"];
  }
  return [path.join(serverDir, "..", ".venv", "bin", "python3"), "python3", "python"];
}

function pythonWithBleak(): string | null {
  if (pythonBin !== undefined) return pythonBin;
  pythonBin = null;
  for (const bin of pythonCandidates()) {
    if (bin.includes(path.sep) && !existsSync(bin)) continue;
    const result = spawnSync(bin, ["-c", "import bleak"], { windowsHide: true, timeout: 20_000, stdio: "ignore" });
    if (result.status === 0) {
      pythonBin = bin;
      break;
    }
  }
  return pythonBin;
}

export function radioAvailable(): boolean {
  return bluezAvailable() || pythonWithBleak() !== null;
}

export function isScanning(): boolean {
  return scanProc !== null && scanProc.exitCode === null && !scanProc.killed;
}

export function listDevices(): { id: string; name: string; rssi: number; esp: boolean }[] {
  const now = Date.now();
  return [...devices.values()]
    .filter((device) => now - device.seenAt < 15_000 && (device.named || device.esp))
    .sort((a, b) => {
      if (a.esp !== b.esp) return a.esp ? -1 : 1;
      return (b.rssi || -200) - (a.rssi || -200);
    })
    .slice(0, 24)
    .map(({ id, name, rssi, esp }) => ({ id, name, rssi, esp }));
}

export function linkSnapshot(): LiveLink | null {
  return link ? { ...link, services: [...link.services], reading: { ...link.reading } } : null;
}

function displayName(id: string, raw: string): { name: string; named: boolean } {
  const trimmed = raw.trim();
  const dashed = id.replace(/:/g, "-");
  if (!trimmed || MAC_NAME.test(trimmed) || trimmed.toUpperCase() === id.toUpperCase() || trimmed.toUpperCase() === dashed.toUpperCase()) {
    return { name: id, named: false };
  }
  return { name: trimmed, named: true };
}

function remember(id: string, name: string, named: boolean, rssi: number, esp: boolean) {
  const cur = devices.get(id) ?? { id, name: id, rssi: 0, named: false, esp: false, seenAt: 0 };
  if (named || !cur.named) {
    cur.name = name;
    cur.named = named;
  }
  if (rssi) cur.rssi = rssi;
  if (esp || ESP_NAME.test(cur.name)) cur.esp = true;
  cur.seenAt = Date.now();
  devices.set(id, cur);
}

/** Parses a bluetoothctl line (color codes already stripped). */
export function ingestLine(line: string) {
  const text = line.replace(ANSI, "").trim();
  const hit = text.match(/^\[(NEW|CHG)\] Device ([0-9A-F:]{17}) (.*)$/i);
  if (!hit) return;
  const id = hit[2].toUpperCase();
  const rest = hit[3];
  const cur = devices.get(id) ?? { id, name: id, rssi: 0, named: false, esp: false, seenAt: 0 };
  if (hit[1].toUpperCase() === "NEW") {
    const shown = displayName(id, rest);
    if (shown.named || !cur.named) {
      cur.name = shown.name;
      cur.named = shown.named;
    }
  }
  const rssi = rest.match(/RSSI:.*\((-?\d+)\)/);
  if (rssi) cur.rssi = Number(rssi[1]);
  const named = rest.match(/^(?:Name|Alias): (.*)$/);
  if (named) {
    const shown = displayName(id, named[1]);
    if (shown.named) {
      cur.name = shown.name;
      cur.named = true;
    }
  }
  if (/0x0*2e5/i.test(rest)) cur.esp = true;
  if (ESP_NAME.test(cur.name)) cur.esp = true;
  cur.seenAt = Date.now();
  devices.set(id, cur);
}

function ingestBleak(line: string) {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return;
  }
  if (msg.evt !== "device" || typeof msg.id !== "string") return;
  const id = msg.id.toUpperCase();
  const shown = displayName(id, typeof msg.name === "string" ? msg.name : "");
  remember(id, shown.name, shown.named, typeof msg.rssi === "number" ? msg.rssi : 0, msg.esp === true);
}

function humanError(raw: string): string {
  const text = raw.trim();
  if (text.startsWith("Le ") || text.startsWith("La ") || text.startsWith("Impossible")) return text;
  const folded = text.toLowerCase();
  if (folded.includes("not available") || folded.includes("turned off") || folded.includes("radio") || folded.includes("éteint")) {
    return "Le Bluetooth est éteint. Allumez-le, puis relancez la recherche.";
  }
  if (folded.includes("timeout") || folded.includes("unreachable") || folded.includes("not found") || folded.includes("failed") || folded.includes("denied")) {
    return "Impossible de joindre cet appareil. Laissez-le allumé, à portée, puis réessayez.";
  }
  return "La liaison Bluetooth a échoué. Rapprochez l’appareil et réessayez.";
}

function pipeLines(proc: ChildProcess, onLine: (line: string) => void) {
  let buf = "";
  proc.stdout?.on("data", (chunk: Buffer) => {
    buf += chunk.toString("utf8");
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onLine(line);
  });
}

function stopProcess(proc: ChildProcess | null): Promise<void> {
  if (!proc || proc.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (proc.exitCode === null) proc.kill();
    }, 800);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    try { proc.stdin?.write("stop\n"); } catch { proc.kill(); }
  });
}

async function stopScanProcess() {
  const proc = scanProc;
  scanProc = null;
  await stopProcess(proc);
  if (bluezAvailable()) {
    const off = spawn("bluetoothctl", ["scan", "off"], { stdio: "ignore" });
    off.on("error", () => {});
  }
}

async function stopLinkProcess() {
  const proc = linkProc;
  linkProc = null;
  link = link ? { ...link, connected: false } : null;
  await stopProcess(proc);
  link = null;
}

function spawnBleak(args: string[]): ChildProcess | null {
  const bin = pythonWithBleak();
  if (!bin) return null;
  return spawn(bin, ["-u", scriptPath, ...args], {
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" },
  });
}

function execBluez(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("bluetoothctl", args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk: Buffer) => { err += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `bluetoothctl ${args.join(" ")}`))));
  });
}

async function startBluez(): Promise<{ ok: boolean; error?: string }> {
  try {
    await execBluez(["power", "on"]);
  } catch {
    return { ok: false, error: "Le Bluetooth est éteint. Allumez-le, puis relancez la recherche." };
  }
  const child = spawn("stdbuf", ["-oL", "bluetoothctl", "--timeout", "45", "scan", "on"], { stdio: ["ignore", "pipe", "pipe"] });
  scanProc = child;
  pipeLines(child, ingestLine);
  child.on("exit", () => { if (scanProc === child) scanProc = null; });
  child.on("error", () => { if (scanProc === child) scanProc = null; });
  return { ok: true };
}

async function startBleak(): Promise<{ ok: boolean; error?: string }> {
  const child = spawnBleak(["scan"]);
  if (!child) return { ok: false, error: "La recherche Bluetooth n’est pas disponible sur cet ordinateur." };
  scanProc = child;
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
    if (stderr.length > 4000) stderr = stderr.slice(-4000);
  });
  const outcome = new Promise<{ ok: boolean; error?: string }>((resolve) => {
    let settled = false;
    const finish = (result: { ok: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, error: "La recherche Bluetooth n’a pas répondu." }), 8000);
    pipeLines(child, (line) => {
      let msg: Record<string, unknown> | null = null;
      try { msg = JSON.parse(line) as Record<string, unknown>; } catch { msg = null; }
      if (msg?.evt === "ready") {
        clearTimeout(timer);
        finish({ ok: true });
      } else if (msg?.evt === "error") {
        clearTimeout(timer);
        finish({ ok: false, error: humanError(typeof msg.error === "string" ? msg.error : "") });
      } else {
        ingestBleak(line);
      }
    });
    child.on("exit", () => {
      if (scanProc === child) scanProc = null;
      clearTimeout(timer);
      finish({ ok: false, error: humanError(stderr || "La recherche Bluetooth n’a pas démarré.") });
    });
    child.on("error", () => {
      if (scanProc === child) scanProc = null;
      clearTimeout(timer);
      finish({ ok: false, error: "La recherche Bluetooth n’est pas disponible sur cet ordinateur." });
    });
  });
  const result = await outcome;
  if (!result.ok) await stopScanProcess();
  return result;
}

async function doStart(): Promise<{ ok: boolean; error?: string }> {
  if (!radioAvailable()) return { ok: false, error: "La recherche Bluetooth n’est pas disponible sur cet ordinateur." };
  if (isScanning()) return { ok: true };
  await stopLinkProcess();
  devices.clear();
  if (pythonWithBleak() && !bluezAvailable()) return startBleak();
  if (bluezAvailable()) return startBluez();
  return startBleak();
}

export function startScan(): Promise<{ ok: boolean; error?: string }> {
  if (isScanning()) return Promise.resolve({ ok: true });
  if (starting) return starting;
  starting = doStart().finally(() => { starting = null; });
  return starting;
}

export function stopScan() {
  void stopScanProcess();
}

const MAC = /^[0-9A-F]{2}(?::[0-9A-F]{2}){5}$/i;

export function connectDevice(id: string, name: string): Promise<{ ok: boolean; error?: string; services?: string[] }> {
  const address = id.toUpperCase();
  if (!MAC.test(address)) return Promise.resolve({ ok: false, error: "Impossible de joindre cet appareil. Laissez-le allumé, à portée, puis réessayez." });
  if (connecting) return connecting;
  connecting = doConnect(address, name.trim() || address).finally(() => { connecting = null; });
  return connecting;
}

async function doConnect(address: string, name: string): Promise<{ ok: boolean; error?: string; services?: string[] }> {
  await stopScanProcess();
  await stopLinkProcess();
  const child = spawnBleak(["connect", address]);
  if (!child) return { ok: false, error: "La recherche Bluetooth n’est pas disponible sur cet ordinateur." };
  linkProc = child;
  link = { id: address, name, connected: false, services: [], reading: {} };
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
    if (stderr.length > 4000) stderr = stderr.slice(-4000);
  });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { ok: boolean; error?: string; services?: string[] }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!result.ok) void stopLinkProcess();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, error: "Impossible de joindre cet appareil. Laissez-le allumé, à portée, puis réessayez." }), 22_000);
    pipeLines(child, (line) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(line) as Record<string, unknown>; } catch { return; }
      if (!link || linkProc !== child) return;
      if (msg.evt === "connected") {
        const services = Array.isArray(msg.services) ? msg.services.filter((item): item is string => typeof item === "string") : [];
        link = { ...link, connected: true, services };
        finish({ ok: true, services });
      } else if (msg.evt === "reading") {
        const reading = { ...link.reading };
        for (const key of ["heartRate", "spo2", "systolic", "diastolic", "pulse", "glucoseMgDl", "temperatureC"] as const) {
          if (typeof msg[key] === "number") reading[key] = msg[key];
        }
        link = { ...link, reading };
      } else if (msg.evt === "error") {
        finish({ ok: false, error: humanError(typeof msg.error === "string" ? msg.error : stderr) });
      } else if (msg.evt === "disconnected") {
        link = { ...link, connected: false };
      }
    });
    child.on("exit", () => {
      if (linkProc === child) linkProc = null;
      if (link && link.id === address) link = { ...link, connected: false };
      finish({ ok: false, error: humanError(stderr || "La liaison Bluetooth a échoué. Rapprochez l’appareil et réessayez.") });
    });
  });
}

export function disconnectDevice() {
  void stopLinkProcess();
}

export function shutdownRadio() {
  void stopScanProcess();
  void stopLinkProcess();
}
