/* Call to the PC fingerprint reader via the development server. */

export type PrintCode =
  | "ready"
  | "verified"
  | "canceled"
  | "retries"
  | "absent"
  | "unconfigured"
  | "disabled"
  | "busy"
  | "error"
  | "unreachable";

async function ask(path: string, method: "GET" | "POST"): Promise<PrintCode> {
  try {
    const res = await fetch(path, { method, headers: { Accept: "application/json" } });
    if (!res.ok) return "unreachable";
    const body = (await res.json()) as { code?: string };
    if (typeof body.code !== "string") return "error";
    return body.code as PrintCode;
  } catch {
    return "unreachable";
  }
}

export function printStatus(): Promise<PrintCode> {
  return ask("/__print/status", "GET");
}

export function printVerify(): Promise<PrintCode> {
  return ask("/__print/verify", "POST");
}
