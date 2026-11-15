/* EN / FR dictionary — app shell, landing, sign-in, and navigation. English is the default. */
import type { Role } from "@/data/types";
import type { LandingCopy } from "@/features/landing/locale";
import { COPY as LANDING } from "@/features/landing/locale";

export type Lang = "en" | "fr";
export const LANG_KEY = "pulsar.lang";

export type AppMessages = {
  loading: string;
  skip: string;
  logout: string;
  denied: (role: string) => string;
  homeAria: (role: string) => string;
  tools: string;
  navOpen: string;
  navClose: string;
  roles: Record<Role, string>;
  login: {
    titleDoc: string;
    back: string;
    h1: string;
    lead: string;
    rolesLabel: string;
    rolesLead: string;
    roleDevice: Record<Role, string>;
    protocol: string;
    loggedOut: string;
    idLabel: string;
    idHelp: (role: string) => string;
    codeLabel: string;
    show: string;
    hide: string;
    submit: string;
    submitting: string;
    demoHint: string;
  };
  nav: {
    astro: {
      suivi: string; mesures: string; quotidien: string; compte: string;
      accueil: string; silhouette: string; predictions: string;
      scan: string; kits: string; montre: string;
      bienEtre: string; rappels: string; objectifs: string; reglages: string;
    };
    cmo: {
      equipage: string; clinique: string; ops: string;
      tableau: string; dossier: string; predictions: string; echo: string; journal: string;
    };
    nasa: {
      sol: string; inbox: string; actions: string; reseau: string;
      rapports: string; rapport: string; reponse: string; liaison: string;
    };
  };
  landing: LandingCopy;
  dash: { astro: string; cmo: string };
};

const fr: AppMessages = {
  loading: "Chargement…",
  skip: "Aller au contenu",
  logout: "Se déconnecter",
  denied: (r) => `Accès réservé à un autre rôle (${r}). Vous êtes sur votre propre tableau de bord.`,
  homeAria: (r) => `Accueil ${r}`,
  tools: "Modes et outils",
  navOpen: "Élargir la navigation",
  navClose: "Réduire la navigation",
  roles: {
    astronaute: "Astronaute",
    "medecin-bord": "Médecin de bord",
    nasa: "NASA Houston",
  },
  login: {
    titleDoc: "PULSAR · Connexion",
    back: "Découvrir PULSAR",
    h1: "Votre santé,\nsuivie en mission.",
    lead: "Choisissez un rôle pour ouvrir son interface.",
    rolesLabel: "Entrer par rôle",
    rolesLead: "La revue NASA n’utilise pas le protocole de connexion.",
    roleDevice: {
      astronaute: "Tablette, montre et kits",
      "medecin-bord": "Tablette médicale",
      nasa: "Mission Control",
    },
    protocol: "Protocole de bord",
    loggedOut: "Vous êtes déconnecté.",
    idLabel: "Identifiant personnel",
    idHelp: (r) => `Espace : ${r}`,
    codeLabel: "Code personnel",
    show: "Afficher le code",
    hide: "Masquer le code",
    submit: "Se connecter",
    submitting: "Connexion…",
    demoHint: "Démo : identifiant AST-001 + code 000000",
  },
  nav: {
    astro: {
      suivi: "Suivi", mesures: "Mesures", quotidien: "Quotidien", compte: "Compte",
      accueil: "Accueil", silhouette: "Silhouette", predictions: "Prévisions",
      scan: "Scan visage", kits: "Kits", montre: "Montre",
      bienEtre: "Bien-être", rappels: "Rappels", objectifs: "Objectifs", reglages: "Réglages",
    },
    cmo: {
      equipage: "Équipage", clinique: "Clinique", ops: "Ops",
      tableau: "Tableau", dossier: "Dossier", predictions: "Prédictions", echo: "Échographie", journal: "Journal",
    },
    nasa: {
      sol: "Sol", inbox: "Inbox", actions: "Actions", reseau: "Réseau",
      rapports: "Rapports", rapport: "Rapport", reponse: "Réponse", liaison: "Liaison",
    },
  },
  landing: {
    ...LANDING.fr,
    mission: {
      ...LANDING.fr.mission,
      title: "Cinq dangers\ndu vol spatial habité",
    },
    path: {
      ...LANDING.fr.path,
      title: "Du poignet\nà Houston",
    },
    roles: {
      ...LANDING.fr.roles,
      title: "Trois rôles,\nune interface",
    },
    demo: {
      ...LANDING.fr.demo,
      title: "Montre\net constantes",
    },
    next: {
      ...LANDING.fr.next,
      title: "Entrer dans\nvotre espace",
    },
  },
  dash: {
    astro: "Votre état aujourd’hui",
    cmo: "Surveillance équipage",
  },
};

const en: AppMessages = {
  loading: "Loading…",
  skip: "Skip to content",
  logout: "Sign out",
  denied: (r) => `Access reserved for another role (${r}). You are on your own dashboard.`,
  homeAria: (r) => `${r} home`,
  tools: "Modes and tools",
  navOpen: "Expand navigation",
  navClose: "Collapse navigation",
  roles: {
    astronaute: "Astronaut",
    "medecin-bord": "Crew surgeon",
    nasa: "NASA Houston",
  },
  login: {
    titleDoc: "PULSAR · Sign in",
    back: "Discover PULSAR",
    h1: "Your health,\ntracked on mission.",
    lead: "Choose a role to open its interface.",
    rolesLabel: "Enter by role",
    rolesLead: "The NASA review does not use the sign-in protocol.",
    roleDevice: {
      astronaute: "Tablet, watch and kits",
      "medecin-bord": "Medical tablet",
      nasa: "Mission Control",
    },
    protocol: "Onboard protocol",
    loggedOut: "You are signed out.",
    idLabel: "Personal ID",
    idHelp: (r) => `Space: ${r}`,
    codeLabel: "Personal code",
    show: "Show code",
    hide: "Hide code",
    submit: "Sign in",
    submitting: "Signing in…",
    demoHint: "Demo: ID AST-001 + code 000000",
  },
  nav: {
    astro: {
      suivi: "Track", mesures: "Measures", quotidien: "Daily", compte: "Account",
      accueil: "Home", silhouette: "Silhouette", predictions: "Forecasts",
      scan: "Face scan", kits: "Kits", montre: "Watch",
      bienEtre: "Wellbeing", rappels: "Reminders", objectifs: "Goals", reglages: "Settings",
    },
    cmo: {
      equipage: "Crew", clinique: "Clinic", ops: "Ops",
      tableau: "Board", dossier: "File", predictions: "Predictions", echo: "Ultrasound", journal: "Log",
    },
    nasa: {
      sol: "Ground", inbox: "Inbox", actions: "Actions", reseau: "Network",
      rapports: "Reports", rapport: "Report", reponse: "Reply", liaison: "Link",
    },
  },
  landing: {
    ...LANDING.en,
    mission: {
      ...LANDING.en.mission,
      title: "Five hazards\nof human spaceflight",
    },
    path: {
      ...LANDING.en.path,
      title: "From wrist\nto Houston",
    },
    roles: {
      ...LANDING.en.roles,
      title: "Three roles,\none interface",
    },
    demo: {
      ...LANDING.en.demo,
      title: "Watch\nand vitals",
    },
    next: {
      ...LANDING.en.next,
      title: "Enter\nyour space",
    },
  },
  dash: {
    astro: "Your status today",
    cmo: "Crew monitoring",
  },
};

export const MESSAGES: Record<Lang, AppMessages> = { fr, en };

export function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "en" || v === "fr") return v;
  } catch { /* ignore */ }
  return "en";
}
