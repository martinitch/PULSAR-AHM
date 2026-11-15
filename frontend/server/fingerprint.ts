/* PC fingerprint reader (Windows Hello). Vite dev server only. */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "winHello.ps1");

export type PrintCode =
  | "ready"
  | "verified"
  | "canceled"
  | "retries"
  | "absent"
  | "unconfigured"
  | "disabled"
  | "busy"
  | "error";

const CHECK: Record<string, PrintCode> = {
  Available: "ready",
  DeviceNotPresent: "absent",
  NotConfiguredForUser: "unconfigured",
  DisabledByPolicy: "disabled",
  DeviceBusy: "busy",
};

const VERIFY: Record<string, PrintCode> = {
  Verified: "verified",
  Canceled: "canceled",
  RetriesExhausted: "retries",
  DeviceNotPresent: "absent",
  NotConfiguredForUser: "unconfigured",
  DisabledByPolicy: "disabled",
  DeviceBusy: "busy",
};

function run(action: "check" | "verify", timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Action", action],
      { windowsHide: true },
    );
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("delai"));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { out += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { err += chunk.toString("utf8"); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("exit", (code) => {
      clearTimeout(timer);
      const word = out.trim().split(/\s+/).pop() ?? "";
      if (code !== 0 || !word) reject(new Error(err.trim() || "empreinte"));
      else resolve(word);
    });
  });
}

let cached: { at: number; code: PrintCode } | null = null;

export async function fingerprintStatus(): Promise<{ ok: boolean; code: PrintCode }> {
  if (cached && Date.now() - cached.at < 60_000) return { ok: cached.code === "ready", code: cached.code };
  try {
    const word = await run("check", 25_000);
    const code = CHECK[word] ?? "error";
    cached = { at: Date.now(), code };
    return { ok: code === "ready", code };
  } catch {
    return { ok: false, code: "error" };
  }
}

export async function fingerprintVerify(): Promise<{ ok: boolean; code: PrintCode }> {
  try {
    const word = await run("verify", 70_000);
    const code = VERIFY[word] ?? "error";
    return { ok: code === "verified", code };
  } catch {
    return { ok: false, code: "error" };
  }
}
