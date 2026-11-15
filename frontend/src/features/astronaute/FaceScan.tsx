/* Camera viewfinder: permission request, local stream, framing square.
   Fatigue rates are simulated (scanSim) until the backend analyzes the image.
   The image is never recorded or sent.
   Sound: face framed or scan started → strong burst (buzzer + speaker).
   High fatigue at the end of the scan → same burst. Low fatigue → silence. */
import { useEffect, useRef, useState } from "react";
import { Demo, Icon, Lamp, Card } from "@/components/ui";
import type { Go } from "@/app/types";
import { useSound } from "@/features/sound";
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
      title: "Fatigue élevée · scan visage",
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
      setError("Ce navigateur ne donne pas accès à la caméra.");
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
        ? "Autorisation refusée. Autorisez la caméra pour ce site, puis réessayez."
        : "Caméra indisponible. Vérifiez qu’elle n’est pas utilisée par une autre application.");
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

  const status = step === "done" ? "1 correspondance" : step === "scan" ? "Analyse" : box ? "Visage cadré" : "Cadrage";
  const fatigue = FATIGUE[sample.fatigue];

  return (
    <div className="two-col scan-board">
      <div className="scan-stage">
        {step === "ask" && (
          <div className="cam-note is-ask" role="region" aria-labelledby="cam-ask-title">
            <span className="cam-note-ico" aria-hidden="true"><Icon name="videocam" size={22} /></span>
            <div>
              <p id="cam-ask-title"><strong>Autoriser la caméra ?</strong></p>
              <p>PULSAR demande la caméra avant pour cadrer votre visage. L’image reste sur cette page et n’est pas enregistrée.</p>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" disabled={pending} onClick={() => void openCamera()}>{pending ? "Ouverture…" : "Autoriser"}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep("off")}>Annuler</button>
            </div>
          </div>
        )}
        {error && <p className="cam-error" role="alert">{error}</p>}
        {note && live && (
          <div className="cam-note" role="status">
            <span className="cam-note-ico" aria-hidden="true"><Icon name="videocam" size={22} /></span>
            <div>
              <p><strong>Caméra activée</strong></p>
              <p>La caméra avant est allumée. Le flux reste local : rien n’est enregistré ni envoyé.</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setNote(false)} aria-label="Masquer la notification">
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        <figure className={`face-vf ${step}`}>
          {!live ? (
            <>
              <div className="face-off">
                <Icon name="videocam" size={28} />
                <p>Caméra éteinte</p>
              </div>
              <div className="vf-status">
                <span className="vf-cam is-off"><i aria-hidden="true" /> Éteinte</span>
                <span className="mono">En attente</span>
              </div>
              <div className="vf-square is-fixed" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <figcaption className="vf-caption">L’autorisation du navigateur est demandée avant l’ouverture.</figcaption>
            </>
          ) : (
            <>
              <video ref={videoRef} className="face-video" autoPlay playsInline muted />
              <div className="vf-status">
                <span className="vf-cam"><i aria-hidden="true" /> Direct</span>
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
              <figcaption className="vf-caption">Placez le visage dans le carré</figcaption>
            </>
          )}
        </figure>
      </div>

      <Card title={step === "done" || step === "scan" ? "Résultat" : "Préparation"} icon="face" aside={<Demo />}>
        {step === "off" && (
          <>
            <ol className="kit-steps">
              <li><b>1</b> Autorisez la caméra de la tablette</li>
              <li><b>2</b> Visage dégagé, pas de visière, ~40 cm</li>
              <li><b>3</b> Le carré se place sur le visage, puis le scan dure 3 s</li>
            </ol>
            <button type="button" className="btn btn-primary lg" onClick={() => { setError(null); setStep("ask"); }}>
              <Icon name="videocam" size={20} /> Activer la caméra
            </button>
          </>
        )}
        {step === "ask" && (
          <p className="r-note">En attente de votre autorisation. Le navigateur affichera ensuite sa propre demande.</p>
        )}
        {live && (
          <>
            {step === "done" && (
              <div className="big-res"><Lamp l="ok" /><strong>1 correspondance</strong></div>
            )}
            <div className="big-res"><Lamp l={fatigue.light} /><strong>{fatigue.word}</strong></div>
            <p className="r-note">{name} · {crewId}. Taux simulés, mis à jour chaque seconde. Le backend visage les remplacera. <Demo /></p>
            <div className="rate-list">
              <RateScale label="Fermeture des paupières" value={sample.eyelids} unit="% vs référence" min={0} max={40} caution={15} high={22} />
              <RateScale label="Clignements" value={sample.blinks} unit="/ min" min={8} max={36} caution={12} high={10} direction="below" />
              <RateScale label="Sommeil (montre)" value={parseSleepHours(sleep)} unit="h" min={0} max={9} caution={6} high={5} direction="below" />
            </div>
            {step === "done" && fatigue.light !== "ok" && (
              <p className="r-note">Conseil : pause 20 min, hydratation. Le médecin de bord (CMO-001) est notifié.</p>
            )}
            <div className="btn-row">
              {step === "live" && (
                <button type="button" className="btn btn-primary lg" onClick={() => { setStep("scan"); loudFace(); }}>
                  <Icon name="photo_camera" size={20} /> Lancer le scan
                </button>
              )}
              {step === "scan" && (
                <button type="button" className="btn btn-primary lg" disabled>Analyse…</button>
              )}
              {step === "done" && (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => go("/astronaute/bien-etre")}>Exercice de récupération</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep("live")}>Refaire</button>
                </>
              )}
              <button type="button" className="btn btn-ghost" onClick={closeCamera}>Éteindre la caméra</button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
