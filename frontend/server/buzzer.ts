/* Relay to the ESP32 buzzer: POST http://<ip>/bip (2 s timeout).
   The IP comes from the dev server environment, never from the browser. */

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const DEFAULT_IP = "192.168.137.11";

export function buzzerIp(raw: string | undefined): string {
  const ip = (raw ?? "").trim() || DEFAULT_IP;
  if (!IPV4.test(ip)) return DEFAULT_IP;
  const ok = ip.split(".").every((part) => {
    const n = Number(part);
    return n >= 0 && n <= 255 && String(n) === part;
  });
  return ok ? ip : DEFAULT_IP;
}

/** Burst: several POST /bip in a row. The firmware has no volume, so repetition carries louder. */
export async function bipFort(ip: string, times = 8): Promise<{ ok: boolean; text?: string; error?: string; beeps: number }> {
  let beeps = 0;
  let last: { ok: boolean; text?: string; error?: string } = { ok: false, error: "ESP32 injoignable" };
  for (let i = 0; i < times; i++) {
    last = await bipEsp(ip);
    if (!last.ok) break;
    beeps += 1;
  }
  return { ...last, ok: beeps > 0, beeps };
}

export async function bipEsp(ip: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(`http://${ip}/bip`, { method: "POST", signal: ctrl.signal });
    const text = await res.text();
    return res.ok ? { ok: true, text } : { ok: false, text, error: `HTTP ${res.status}` };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, error: aborted ? "Délai dépassé (2 s)" : "ESP32 injoignable" };
  } finally {
    clearTimeout(timer);
  }
}
