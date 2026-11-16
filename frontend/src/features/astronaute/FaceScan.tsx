/* Camera viewfinder: permission request, local stream, framing square.
   Fatigue rates are simulated (scanSim) until the backend analyzes the image.
   The image is never recorded or sent.
   Sound: face framed or scan started → strong burst (buzzer + speaker).
   High fatigue at the end of the scan → same burst. Low fatigue → silence. */
import { useEffect, useRef, useState } from "react";
import { Demo, Icon, Lamp, Card } from "@/components/ui";
import type { Go } from "@/app/types";
import { useSound } from "@/features/sound";
import { useLang } from "@/i18n";
import { scanSample, parseSleepHours, type ScanSample } from "./scanSim";
import { RateScale } from "./RateScale";

type Step = "off" | "ask" | "live" | "scan" | "done";
type Box = { x: number; y: number; w: number; h: number };

type FaceBox = { boundingBox: DOMRectReadOnly };
type FaceDetectorLike = { detect: (source: HTMLVideoElement) => Promise<FaceBox[]> };

function detector(): FaceDetectorLike | null {
  const Ctor = (window as unknown as { FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike }).FaceDetector;
  if (!Ctor) return null;
  try { return new Ctor({ fastMode: true, maxDetectedFaces: 1 }); } catch { return null; }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

const FATIGUE: Record<ScanSample["fatigue"], { word: string; light: "ok" | "caution" | "warning" }> = {
  faible: { word: "Fatigue faible", light: "ok" },
  moderee: { word: "Fatigue modérée", light: "caution" },
  elevee: { word: "Fatigue élevée", light: "warning" },
};

export function FaceScan({ name, crewId, sleep, go }: { name: string; crewId: string; sleep: string; go: Go }) {
  const { raise, play } = useSound();
  const { tr } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("off");
  const [note, setNote] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [pending, setPending] = useState(false);
  const [sample, setSample] = useState<ScanSample>(() => scanSample());
  const live = step === "live" || step === "scan" || step === "done";
  const framed = useRef(false);
  const bipAt = useRef(0);
  const loudFace = () => {
    const now = Date.now();
    if (now - bipAt.current < 5000) return;
    bipAt.current = now;
    play("fatiguePim");
  };

  useEffect(() => {
    if (!box) return;
    if (framed.current) return;
    framed.current = true;
    loudFace();
  }, [box]); // eslint-disable-line react-hooks/exhaustive-deps -- one burst on the first framed face

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || !live) return;
    video.srcObject = streamRef.current;
    void video.play().catch(() => {});
  }, [live, step]);

  useEffect(() => () => stopStream(streamRef.current), []);

  useEffect(() => {
    if (step !== "live" && step !== "scan") return;
    setSample(scanSample());
    const id = window.setInterval(() => setSample(scanSample()), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== "scan") return;
    const t = window.setTimeout(() => setStep("done"), 2800);
    return () => window.clearTimeout(t);
  }, [step]);

  /** Once the scan is finished: high → strong burst. Low or moderate → no sound. */
  useEffect(() => {
    if (step !== "done" || sample.fatigue !== "elevee") return;
    raise({
      id: `FATIGUE-${crewId}-${Date.now()}`,
      level: "rouge",
      title: tr("Fatigue élevée · scan visage", "High fatigue · face scan"),
      detail: `${name} · ${crewId}`,
      sound: "fatiguePim",
    });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps -- once, on the transition to « done »

  useEffect(() => {
    if (!live) return;
    const det = detector();
    if (!det) return;
    let stop = false;
    let timer = 0;
    const tick = async () => {
      if (stop) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const faces = await det.detect(video);
          const b = faces[0]?.boundingBox;
          if (!stop && b) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            setBox({
              x: (1 - (b.x + b.width) / vw) * 100,
              y: (b.y / vh) * 100,
              w: (b.width / vw) * 100,
              h: (b.height / vh) * 100,
            });
          }
        } catch { /* the fixed square stays on screen */ }
      }
      if (!stop) timer = window.setTimeout(tick, 220);
    };
    void tick();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [live]);

  const openCamera = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(tr("Ce navigateur ne donne pas accès à la caméra.", "This browser does not expose the camera."));
      setStep("off");
      setPending(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      stopStream(streamRef.current);
      streamRef.current = stream;
      setNote(true);
      setStep("live");
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setError(denied
        ? tr("Autorisation refusée. Autorisez la caméra pour ce site, puis réessayez.", "Permission denied. Allow the camera for this site, then try again.")
        : tr("Caméra indisponible. Vérifiez qu’elle n’est pas utilisée par une autre application.", "Camera unavailable. Check that another application is not using it."));
      setStep("off");
    } finally {
      setPending(false);
    }
  };

  const closeCamera = () => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setBox(null);
    framed.current = false;
    setStep("off");
    setNote(false);
  };

  const status = step === "done" ? tr("1 correspondance", "1 match") : step === "scan" ? tr("Analyse", "Analysis") : box ? tr("Visage cadré", "Face framed") : tr("Cadrage", "Framing");
  const fatigue = FATIGUE[sample.fatigue];
  const fatigueWord = tr(fatigue.word, sample.fatigue === "faible" ? "Low fatigue" : sample.fatigue === "moderee" ? "Moderate fatigue" : "High fatigue");

  return (
    <div className="two-col scan-board">
      <div className="scan-stage">
        {step === "ask" && (
          <div className="cam-note is-ask" role="region" aria-labelledby="cam-ask-title">
            <span className="cam-note-ico" aria-hidden="true"><Icon name="videocam" size={22} /></span>
            <div>
              <p id="cam-ask-title"><strong>{tr("Autoriser la caméra ?", "Allow the camera?")}</strong></p>
              <p>{tr("PULSAR demande la caméra avant pour cadrer votre visage. L’image reste sur cette page et n’est pas enregistrée.", "PULSAR asks for the front camera to frame your face. The image stays on this page and is not recorded.")}</p>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" disabled={pending} onClick={() => void openCamera()}>{pending ? tr("Ouverture…", "Opening…") : tr("Autoriser", "Allow")}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep("off")}>{tr("Annuler", "Cancel")}</button>
            </div>
          </div>
        )}
        {error && <p className="cam-error" role="alert">{error}</p>}
        {note && live && (
          <div className="cam-note" role="status">
            <span className="cam-note-ico" aria-hidden="true"><Icon name="videocam" size={22} /></span>
            <div>
              <p><strong>{tr("Caméra activée", "Camera on")}</strong></p>
              <p>{tr("La caméra avant est allumée. Le flux reste local : rien n’est enregistré ni envoyé.", "The front camera is on. The stream stays local: nothing is recorded or sent.")}</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setNote(false)} aria-label={tr("Masquer la notification", "Hide the notice")}>
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        <figure className={`face-vf ${step}`}>
          {!live ? (
            <>
              <div className="face-off">
                <Icon name="videocam" size={28} />
                <p>{tr("Caméra éteinte", "Camera off")}</p>
              </div>
              <div className="vf-status">
                <span className="vf-cam is-off"><i aria-hidden="true" /> {tr("Éteinte", "Off")}</span>
                <span className="mono">{tr("En attente", "Waiting")}</span>
              </div>
              <div className="vf-square is-fixed" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <figcaption className="vf-caption">{tr("L’autorisation du navigateur est demandée avant l’ouverture.", "The browser asks for permission before the camera opens.")}</figcaption>
            </>
          ) : (
            <>
              <video ref={videoRef} className="face-video" autoPlay playsInline muted />
              <div className="vf-status">
                <span className="vf-cam"><i aria-hidden="true" /> {tr("Direct", "Live")}</span>
                <span className="mono">{status}</span>
              </div>
              <div
                className={`vf-square${box ? "" : " is-fixed"}`}
                style={box ? { left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` } : undefined}
                aria-hidden="true"
              >
                <span /><span /><span /><span />
                {step === "scan" && <i className="face-scanline" />}
              </div>
              {(step === "scan" || step === "done") && (
                <p className="vf-id">
                  <strong>{name}</strong>
                  <span className="mono">{crewId}</span>
                </p>
              )}
              <figcaption className="vf-caption">{tr("Placez le visage dans le carré", "Place the face in the square")}</figcaption>
            </>
          )}
        </figure>
      </div>

      <Card title={step === "done" || step === "scan" ? tr("Résultat", "Result") : tr("Préparation", "Preparation")} icon="face" aside={<Demo />}>
        {step === "off" && (
          <>
            <ol className="kit-steps">
              <li><b>1</b> {tr("Autorisez la caméra de la tablette", "Allow the tablet camera")}</li>
              <li><b>2</b> {tr("Visage dégagé, pas de visière, ~40 cm", "Face clear, no visor, ~40 cm")}</li>
              <li><b>3</b> {tr("Le carré se place sur le visage, puis le scan dure 3 s", "The square settles on the face, then the scan lasts 3 s")}</li>
            </ol>
            <button type="button" className="btn btn-primary lg" onClick={() => { setError(null); setStep("ask"); }}>
              <Icon name="videocam" size={20} /> {tr("Activer la caméra", "Turn the camera on")}
            </button>
          </>
        )}
        {step === "ask" && (
          <p className="r-note">{tr("En attente de votre autorisation. Le navigateur affichera ensuite sa propre demande.", "Waiting for your permission. The browser will then show its own prompt.")}</p>
        )}
        {live && (
          <>
            {step === "done" && (
              <div className="big-res"><Lamp l="ok" /><strong>{tr("1 correspondance", "1 match")}</strong></div>
            )}
            <div className="big-res"><Lamp l={fatigue.light} /><strong>{fatigueWord}</strong></div>
            <p className="r-note">{name} · {crewId}. {tr("Taux simulés, mis à jour chaque seconde. Le backend visage les remplacera.", "Simulated rates, updated every second. The face backend will replace them.")} <Demo /></p>
            <div className="rate-list">
              <RateScale label={tr("Fermeture des paupières", "Eyelid closure")} value={sample.eyelids} unit={tr("% vs référence", "% vs reference")} min={0} max={40} caution={15} high={22} />
              <RateScale label={tr("Clignements", "Blinks")} value={sample.blinks} unit={tr("/ min", "/ min")} min={8} max={36} caution={12} high={10} direction="below" />
              <RateScale label={tr("Sommeil (montre)", "Sleep (watch)")} value={parseSleepHours(sleep)} unit="h" min={0} max={9} caution={6} high={5} direction="below" />
            </div>
            {step === "done" && fatigue.light !== "ok" && (
              <p className="r-note">{tr("Conseil : pause 20 min, hydratation. Le médecin de bord (CMO-001) est notifié.", "Advice: rest 20 min, hydrate. The crew surgeon (CMO-001) is notified.")}</p>
            )}
            <div className="btn-row">
              {step === "live" && (
                <button type="button" className="btn btn-primary lg" onClick={() => { setStep("scan"); loudFace(); }}>
                  <Icon name="photo_camera" size={20} /> {tr("Lancer le scan", "Start the scan")}
                </button>
              )}
              {step === "scan" && (
                <button type="button" className="btn btn-primary lg" disabled>{tr("Analyse…", "Analyzing…")}</button>
              )}
              {step === "done" && (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => go("/astronaute/bien-etre")}>{tr("Exercice de récupération", "Recovery exercise")}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep("live")}>{tr("Refaire", "Redo")}</button>
                </>
              )}
              <button type="button" className="btn btn-ghost" onClick={closeCamera}>{tr("Éteindre la caméra", "Turn the camera off")}</button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
