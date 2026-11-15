/* EN / FR — landing page copy only. English is the default. */
export type Lang = "en" | "fr";

export const LANG_KEY = "pulsar.lang";

export type LandingCopy = {
  skip: string;
  nav: { why: string; how: string; role: string; preview: string };
  ctaLogin: string;
  ctaSpace: string;
  hero: { tag: string; lead: string; why: string };
  showcase: { kicker: string; lines: { fixed: string; word: string }[]; stats: { value: number; suffix?: string; label: string }[] };
  mission: {
    eyebrow: string;
    title: string;
    sub: string;
    risk: string;
    does: string;
    hazards: { title: string; risk: string; pulsar: string }[];
  };
  path: {
    eyebrow: string;
    title: string;
    sub: string;
    needTitle: string;
    need: { title: string; text: string }[];
    steps: { step: string; title: string; text: string }[];
  };
  roles: {
    eyebrow: string;
    title: string;
    sub: string;
    items: { role: "astronaute" | "medecin-bord" | "nasa"; title: string; device: string; access: string; idHint: string; enter: string }[];
  };
  demo: { eyebrow: string; title: string; sub: string; live: string; foot: string };
  next: { eyebrow: string; title: string; text: string };
  footLogin: string;
};

const fr: LandingCopy = {
  skip: "Aller au contenu",
  nav: { why: "Pourquoi", how: "Comment", role: "Rôle", preview: "Aperçu" },
  ctaLogin: "Se connecter",
  ctaSpace: "Mon espace",
  hero: {
    tag: "La santé de l’équipage",
    lead: "Mesures au poignet, alertes claires, conseils simples — même sans liaison avec la Terre.",
    why: "Pourquoi",
  },
  showcase: {
    kicker: "En mission",
    lines: [
      { fixed: "Suivi", word: "montre" },
      { fixed: "Alertes", word: "claires" },
      { fixed: "Prévisions", word: "simples" },
      { fixed: "Médecin", word: "de bord" },
      { fixed: "Houston", word: "au sol" },
      { fixed: "Hors", word: "liaison" },
    ],
    stats: [
      { value: 5, label: "Risques santé suivis" },
      { value: 3, label: "Espaces selon le badge" },
      { value: 4, label: "Étapes montre → Houston" },
      { value: 24, suffix: " h", label: "Mesures en continu" },
    ],
  },
  mission: {
    eyebrow: "Pourquoi",
    title: "Cinq dangers du vol spatial habité",
    sub: "Loin de la Terre, l’équipage gère sa santé seul. PULSAR donne une vue synoptique — risque, mesure, action — sans remplacer un médecin.",
    risk: "Le risque",
    does: "Ce que fait PULSAR",
    hazards: [
      { title: "Rayonnements spatiaux", risk: "Hors magnétosphère, la dose augmente (cancer, système nerveux, cœur).", pulsar: "Dosimètre continu, prévision du débit de dose, consigne d’abri." },
      { title: "Isolement et confinement", risk: "Équipage réduit, espace fermé : sommeil, humeur et cohésion se dégradent.", pulsar: "Scan fatigue, bien-être, objectifs d’équipage sans classement." },
      { title: "Distance de la Terre", risk: "Latence vers Mars, liaisons par fenêtres : pas de médecin au sol en direct.", pulsar: "Médecin de bord autonome, rapports compressés, mode hors ligne." },
      { title: "Gravité modifiée", risk: "Microgravité : os, muscles, fluides, vision (SANS).", pulsar: "Échographie guidée, suivi exercice et tendances cardio." },
      { title: "Environnement fermé", risk: "Air recyclé, CO₂, bruit, microbiologie.", pulsar: "Alertes orange / rouge et détection de dérive." },
    ],
  },
  path: {
    eyebrow: "Comment",
    title: "Du poignet à Houston",
    sub: "Une mesure part de la montre et remonte jusqu’au sol. La consigne redescend.",
    needTitle: "Ce dont vous avez besoin",
    need: [
      { title: "Vos constantes", text: "Pouls, SpO₂, sommeil et dose au poignet, mis à jour en continu." },
      { title: "Vos alertes", text: "Un signal clair si une valeur sort de la plage — avec le geste à faire." },
      { title: "Vos conseils", text: "Prévisions simples et actions du jour, sans jargon médical." },
    ],
    steps: [
      { step: "01", title: "Montre", text: "Mesures automatiques 24 h/24 : FC, SpO₂, sommeil, dose. Alerte au poignet." },
      { step: "02", title: "Tablette astronaute", text: "Vos données, kits, scan fatigue, silhouette santé, conseils simples." },
      { step: "03", title: "Médecin de bord", text: "Voyants de l’équipage, solutions à valider, échographie guidée si besoin." },
      { step: "04", title: "NASA Houston", text: "Rapports à chaque fenêtre de liaison ; recommandations renvoyées à bord." },
    ],
  },
  roles: {
    eyebrow: "Rôle",
    title: "Trois rôles, une interface",
    sub: "Sans protocole de connexion : choisissez un rôle pour ouvrir son interface.",
    items: [
      { role: "astronaute", title: "Astronaute", device: "Tablette + montre + kits", access: "Voit uniquement ses propres données.", idHint: "AST-…", enter: "Ouvrir l’interface" },
      { role: "medecin-bord", title: "Médecin de bord", device: "Tablette médicale", access: "Voit tout l’équipage, valide les actions.", idHint: "CMO-…", enter: "Ouvrir l’interface" },
      { role: "nasa", title: "NASA Houston", device: "Mission Control", access: "Reçoit les rapports à chaque liaison.", idHint: "NASA-FS-…", enter: "Ouvrir l’interface" },
    ],
  },
  demo: {
    eyebrow: "Aperçu",
    title: "Montre et constantes",
    sub: "Données fictives (DÉMO) pour voir le rendu avant de vous connecter.",
    live: "Télémétrie · en direct",
    foot: "LK · cabine · échantillon 2 s",
  },
  next: {
    eyebrow: "Ensuite",
    title: "Entrer dans votre espace",
    text: "Choisissez un rôle. Son interface s’ouvre aussitôt.",
  },
  footLogin: "Connexion",
};

const en: LandingCopy = {
  skip: "Skip to content",
  nav: { why: "Why", how: "How", role: "Role", preview: "Preview" },
  ctaLogin: "Sign in",
  ctaSpace: "My space",
  hero: {
    tag: "Crew health",
    lead: "Wrist readings, clear alerts, plain advice — even without a link to Earth.",
    why: "Why",
  },
  showcase: {
    kicker: "On mission",
    lines: [
      { fixed: "Watch", word: "tracking" },
      { fixed: "Clear", word: "alerts" },
      { fixed: "Simple", word: "forecasts" },
      { fixed: "Crew", word: "surgeon" },
      { fixed: "Houston", word: "ground" },
      { fixed: "Off", word: "link" },
    ],
    stats: [
      { value: 5, label: "Health risks tracked" },
      { value: 3, label: "Spaces by badge" },
      { value: 4, label: "Watch → Houston steps" },
      { value: 24, suffix: " h", label: "Continuous measures" },
    ],
  },
  mission: {
    eyebrow: "Why",
    title: "Five hazards of human spaceflight",
    sub: "Far from Earth, the crew manages health alone. PULSAR gives a synoptic view — risk, measure, action — without replacing a physician.",
    risk: "The risk",
    does: "What PULSAR does",
    hazards: [
      { title: "Space radiation", risk: "Outside the magnetosphere, dose rises (cancer, nervous system, heart).", pulsar: "Continuous dosimeter, dose-rate forecast, shelter cue." },
      { title: "Isolation & confinement", risk: "Small crew, closed space: sleep, mood and cohesion degrade.", pulsar: "Fatigue scan, wellbeing, crew goals without ranking." },
      { title: "Distance from Earth", risk: "Mars latency, contact windows: no live ground physician.", pulsar: "Autonomous crew surgeon, compressed reports, offline mode." },
      { title: "Altered gravity", risk: "Microgravity: bone, muscle, fluids, vision (SANS).", pulsar: "Guided ultrasound, exercise and cardio trends." },
      { title: "Closed environment", risk: "Recycled air, CO₂, noise, microbiology.", pulsar: "Orange / red alerts and drift detection." },
    ],
  },
  path: {
    eyebrow: "How",
    title: "From wrist to Houston",
    sub: "A reading leaves the watch and climbs to the ground. Guidance comes back down.",
    needTitle: "What you need",
    need: [
      { title: "Your vitals", text: "Pulse, SpO₂, sleep and dose on the wrist, updated continuously." },
      { title: "Your alerts", text: "A clear signal when a value leaves range — with the next move." },
      { title: "Your advice", text: "Plain forecasts and daily actions, without medical jargon." },
    ],
    steps: [
      { step: "01", title: "Watch", text: "Automatic 24/7 measures: HR, SpO₂, sleep, dose. Alert on the wrist." },
      { step: "02", title: "Crew tablet", text: "Your data, kits, fatigue scan, health silhouette, plain advice." },
      { step: "03", title: "Crew surgeon", text: "Crew lamps, actions to validate, guided ultrasound if needed." },
      { step: "04", title: "NASA Houston", text: "Reports each contact window; recommendations sent back aboard." },
    ],
  },
  roles: {
    eyebrow: "Role",
    title: "Three roles, one interface",
    sub: "No sign-in protocol: choose a role to open its interface.",
    items: [
      { role: "astronaute", title: "Astronaut", device: "Tablet + watch + kits", access: "Sees only their own data.", idHint: "AST-…", enter: "Open this interface" },
      { role: "medecin-bord", title: "Crew surgeon", device: "Medical tablet", access: "Sees the whole crew, validates actions.", idHint: "CMO-…", enter: "Open this interface" },
      { role: "nasa", title: "NASA Houston", device: "Mission Control", access: "Receives reports each contact.", idHint: "NASA-FS-…", enter: "Open this interface" },
    ],
  },
  demo: {
    eyebrow: "Preview",
    title: "Watch and vitals",
    sub: "Fictional data (DEMO) so you can see the look before signing in.",
    live: "Telemetry · live",
    foot: "LK · cabin · 2 s sample",
  },
  next: {
    eyebrow: "Next",
    title: "Enter your space",
    text: "Choose a role. Its interface opens at once.",
  },
  footLogin: "Sign in",
};

export const COPY: Record<Lang, LandingCopy> = { fr, en };

export function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "en" || v === "fr") return v;
  } catch { /* ignore */ }
  return "en";
}
