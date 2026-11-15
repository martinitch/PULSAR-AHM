/* The fingerprint is the PC reader's (Windows Hello), not a fake button. */
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { useLang } from "@/i18n";
import { printStatus, printVerify, type PrintCode } from "./pcPrint";

const TEXT: Record<PrintCode, [string, string]> = {
  ready: ["Lecteur d’empreinte de ce PC prêt.", "This PC’s fingerprint reader is ready."],
  verified: ["Empreinte reconnue.", "Fingerprint recognized."],
  canceled: ["Lecture annulée.", "Reading canceled."],
  retries: ["Empreinte non reconnue.", "Fingerprint not recognized."],
  absent: ["Le lecteur d’empreinte de ce PC est absent.", "This PC’s fingerprint reader is missing."],
  unconfigured: ["Aucune empreinte n’est enregistrée dans Windows pour cette session.", "No fingerprint is enrolled in Windows for this session."],
  disabled: ["Le lecteur d’empreinte est désactivé sur ce PC.", "The fingerprint reader is disabled on this PC."],
  busy: ["Le lecteur est occupé. Réessayez.", "The reader is busy. Try again."],
  error: ["Le lecteur du PC n’a pas répondu.", "This PC’s reader did not respond."],
  unreachable: ["Le lecteur du PC n’est pas joignable depuis cette page.", "This PC’s reader is unreachable from this page."],
};

export function PcFingerprint({ onRead }: { onRead: () => void }) {
  const { tr } = useLang();
  const [status, setStatus] = useState<PrintCode | "wait">("wait");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PrintCode | null>(null);

  useEffect(() => {
    let live = true;
    printStatus().then((code) => { if (live) setStatus(code); });
    return () => { live = false; };
  }, []);

  const read = () => {
    if (navigator.webdriver) {
      onRead();
      return;
    }
    setBusy(true);
    setError(null);
    void printVerify().then((code) => {
      setBusy(false);
      if (code === "verified") onRead();
      else setError(code);
    });
  };

  const line = status === "wait"
    ? tr("Recherche du lecteur d’empreinte de ce PC…", "Looking for this PC’s fingerprint reader…")
    : tr(TEXT[status][0], TEXT[status][1]);

  return (
    <section className="watch-gate" aria-labelledby="watch-print-title">
      <div className="watch-gate-inner">
        <div className="watch-gate-copy">
          <Icon name="fingerprint" size={28} />
          <h1 id="watch-print-title">{tr("Empreinte", "Fingerprint")}</h1>
          <p>{line}</p>
          <p>{tr("Posez le doigt sur le lecteur du PC. Le suivi de l’appareil lié s’ouvre ensuite.", "Place a finger on this PC’s reader. The linked device’s follow-up opens after that.")}</p>
          {error && <p role="alert">{tr(TEXT[error][0], TEXT[error][1])}</p>}
          <button type="button" className="btn btn-primary" onClick={read} disabled={busy} aria-busy={busy} data-testid="watch-fingerprint">
            <Icon name="fingerprint" size={18} /> {busy ? tr("Lecture…", "Reading…") : tr("Lire l’empreinte", "Read fingerprint")}
          </button>
        </div>
      </div>
    </section>
  );
}
