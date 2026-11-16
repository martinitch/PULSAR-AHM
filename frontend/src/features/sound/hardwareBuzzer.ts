/* ESP32-C3 buzzer, Wi-Fi only (POST http://<ip>/bip).
   When the ESP32 confirms, a message and a confirmation sound. */
import { notifyOk, pushNotice } from "@/components/ui/noticeStore";
import { readLang } from "@/i18n/messages";
import { playPattern, unlock, type SoundId } from "./engine";

const HARDWARE = new Set<SoundId>(["alarmHigh", "fatiguePim"]);
const FORT = new Set<SoundId>(["fatiguePim"]);

async function sendBip(path: "/__buzzer/fort" | "/__buzzer/bip"): Promise<void> {
  try {
    const res = await fetch(path, { method: "POST" });
    const body = (await res.json()) as { ok?: boolean; text?: string; error?: string };
    const en = readLang() === "en";
    if (body.ok) {
      notifyOk(
        en ? "Beep received" : "Bip reçu",
        body.text
          ? (en ? `The ESP32-C3 replied: ${body.text}.` : `L’ESP32-C3 a répondu : ${body.text}.`)
          : (en ? "The ESP32-C3 confirmed receipt." : "L’ESP32-C3 a confirmé la réception."),
      );
      if (await unlock()) playPattern("ack", 0.85);
      return;
    }
    pushNotice({
      kind: "backend",
      title: en ? "Beep not received" : "Bip non reçu",
      detail: body.error || (en ? "The ESP32-C3 did not confirm." : "L’ESP32-C3 n’a pas confirmé."),
    });
  } catch {
    const en = readLang() === "en";
    pushNotice({
      kind: "backend",
      title: en ? "Beep not received" : "Bip non reçu",
      detail: en ? "No reply from the ESP32-C3." : "Pas de réponse de l’ESP32-C3.",
    });
  }
}

/** Burst to the ESP32-C3. Each time the digital device is put on. */
export function buzzEspFort(): void {
  void sendBip("/__buzzer/fort");
}

export function pingHardwareBuzzer(id: SoundId): void {
  if (!HARDWARE.has(id)) return;
  void sendBip(FORT.has(id) ? "/__buzzer/fort" : "/__buzzer/bip");
}
