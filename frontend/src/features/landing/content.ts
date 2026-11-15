/* Landing content — astronaut + understandable project (HRP hazards, roles, journey). */

/** Preparation chain (inspired by mission control) — fictional DEMO states. */
export const SYSTEMS: { id: string; label: string; status: "go" | "hold" | "warn" }[] = [
  { id: "watch", label: "Montre", status: "go" },
  { id: "telemetry", label: "Télémétrie", status: "go" },
  { id: "tablet", label: "Tablette", status: "go" },
  { id: "cmo", label: "Médecin de bord", status: "go" },
  { id: "echo", label: "Échographie", status: "hold" },
  { id: "link", label: "Liaison Houston", status: "warn" },
];

export const FOR_YOU: { title: string; text: string }[] = [
  { title: "Vos constantes", text: "Pouls, SpO₂, sommeil et dose au poignet, mis à jour en continu." },
  { title: "Vos alertes", text: "Un signal clair si une valeur sort de la plage — avec le geste à faire." },
  { title: "Vos conseils", text: "Prévisions simples et actions du jour, sans jargon médical." },
];

export const APP_PATH: { step: string; title: string; text: string }[] = [
  { step: "01", title: "Montre", text: "Mesures automatiques 24 h/24 : FC, SpO₂, sommeil, dose. Alerte au poignet." },
  { step: "02", title: "Tablette astronaute", text: "Vos données, kits, scan fatigue, silhouette santé, conseils simples." },
  { step: "03", title: "Médecin de bord", text: "Voyants de l’équipage, solutions à valider, échographie guidée si besoin." },
  { step: "04", title: "NASA Houston", text: "Rapports à chaque fenêtre de liaison ; recommandations renvoyées à bord." },
];

/** Five NASA HRP hazards — essential to understand why PULSAR exists. */
export const HAZARDS: { title: string; risk: string; pulsar: string }[] = [
  { title: "Rayonnements spatiaux", risk: "Hors magnétosphère, la dose augmente (cancer, système nerveux, cœur).", pulsar: "Dosimètre continu, prévision du débit de dose, consigne d’abri." },
  { title: "Isolement et confinement", risk: "Équipage réduit, espace fermé : sommeil, humeur et cohésion se dégradent.", pulsar: "Scan fatigue, bien-être, objectifs d’équipage sans classement." },
  { title: "Distance de la Terre", risk: "Latence vers Mars, liaisons par fenêtres : pas de médecin au sol en direct.", pulsar: "Médecin de bord autonome, rapports compressés, mode hors ligne." },
  { title: "Gravité modifiée", risk: "Microgravité : os, muscles, fluides, vision (SANS).", pulsar: "Échographie guidée, suivi exercice et tendances cardio." },
  { title: "Environnement fermé", risk: "Air recyclé, CO₂, bruit, microbiologie.", pulsar: "Alertes orange / rouge et détection de dérive." },
];

/** Three roles — to understand who sees what. */
export const ROLES: { title: string; device: string; access: string; idHint: string }[] = [
  { title: "Astronaute", device: "Tablette + montre + kits", access: "Voit uniquement ses propres données.", idHint: "AST-…" },
  { title: "Médecin de bord", device: "Tablette médicale", access: "Voit tout l’équipage, valide les actions.", idHint: "CMO-…" },
  { title: "NASA Houston", device: "Mission Control", access: "Reçoit les rapports à chaque liaison.", idHint: "NASA-FS-…" },
];

/** “In brief” figures — simple labels. */
export const SHOWCASE_STATS: { value: number; suffix?: string; label: string }[] = [
  { value: 5, label: "Risques santé suivis" },
  { value: 3, label: "Espaces selon le badge" },
  { value: 4, label: "Étapes montre → Houston" },
  { value: 24, suffix: " h", label: "Mesures en continu" },
];
