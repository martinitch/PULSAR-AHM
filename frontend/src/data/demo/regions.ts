/* Body zones ↔ NASA Human Research Program (HRP) risks. Texts shown by the health silhouette. */
import type { IconName } from "@/components/ui";

export type Posture = { pos: string; action: string };

export const REGIONS: { id: string; side: "front" | "back"; label: string; icon: IconName; fn: string; need: string; fixes: Posture[]; risks: string[]; inds: string[]; x: number; y: number; note?: string }[] = [
  { id: "brain", side: "front", label: "Cerveau et humeur", icon: "neurology", fn: "Pensée, humeur, sommeil, concentration.", need: "Sommeil à récupérer", fixes: [
    { pos: "Couché, lumière ambrée", action: "Écran éteint 30 min" },
    { pos: "Dos au matelas, bras le long du corps", action: "Respiration 4-4 · 5 min" },
    { pos: "Assis au journal", action: "Noter l’humeur, prévenir si ça dure" },
  ], risks: ["Changements cognitifs ou comportementaux et troubles psychiatriques", "Perte de sommeil, désynchronisation circadienne et surcharge de travail", "Coopération et communication insuffisantes au sein de l’équipe"], inds: ["sleep", "mood", "mental"], x: 100, y: 26 },
  { id: "eyes", side: "front", label: "Yeux (SANS)", icon: "visibility", fn: "Vision : lire les instruments, travailler avec précision.", need: "Vision à signaler", fixes: [
    { pos: "Face à un texte, distance de bras", action: "Lire 3 lignes, noter le flou" },
    { pos: "Tête droite, regard au loin", action: "20 s sans écran" },
    { pos: "Assis, examen prévu", action: "Prévenir le médecin de bord" },
  ], risks: ["Syndrome neuro-oculaire lié au vol spatial (SANS)"], inds: [], x: 112, y: 38, note: "Pas de capteur dédié dans PULSAR : signalez toute baisse de vision ; les examens des yeux (images, échographie) sont transmis à l’équipe médicale." },
  { id: "ear", side: "front", label: "Oreille interne", icon: "hearing", fn: "Équilibre et orientation.", need: "Équilibre à stabiliser", fixes: [
    { pos: "Assis, dos au panneau", action: "Fixer un point fixe 20 s" },
    { pos: "Tête immobile", action: "Noter vertige ou nausée" },
    { pos: "Prise stable", action: "Prévenir le médecin si ça revient" },
  ], risks: ["Altération des fonctions sensorimotrices et vestibulaires"], inds: [], x: 124, y: 46, note: "Signalez vertiges ou mal des transports dans le journal du soir." },
  { id: "heart", side: "front", label: "Cœur et vaisseaux", icon: "cardiology", fn: "Pompe le sang et l’oxygène vers les organes.", need: "Pouls à ralentir", fixes: [
    { pos: "Assis, dos au panneau", action: "2 min sans parler" },
    { pos: "Mains sur les cuisses", action: "Inspirer 4 s, expirer 4 s" },
    { pos: "Bras à hauteur du cœur", action: "Remesure du pouls" },
  ], risks: ["Adaptations cardiovasculaires"], inds: ["hr", "bp"], x: 110, y: 112 },
  { id: "lungs", side: "front", label: "Poumons et oxygène", icon: "pulmonology", fn: "Apporte l’oxygène au sang.", need: "Oxygène à vérifier", fixes: [
    { pos: "Buste droit, épaules basses", action: "Inspirer par le nez, lentement" },
    { pos: "Masque à portée de main", action: "Vérifier l’oxygène cabine" },
    { pos: "Assis, stable", action: "Remesure SpO₂, médecin si alerte" },
  ], risks: ["Hypoxie", "Maladie de décompression", "Exposition à la poussière céleste"], inds: ["spo2"], x: 84, y: 104 },
  { id: "immune", side: "front", label: "Système immunitaire", icon: "immunology", fn: "Défend l’organisme contre les infections.", need: "Température à suivre", fixes: [
    { pos: "Au repos, 10 min", action: "Mesure de température" },
    { pos: "Gourde à portée", action: "Boire, noter la soif" },
    { pos: "À l’écart si besoin", action: "Prévenir le médecin de bord" },
  ], risks: ["Altération de la réponse immunitaire", "Interactions hôte-microorganismes"], inds: ["temp"], x: 100, y: 146 },
  { id: "metabolism", side: "front", label: "Métabolisme et nutrition", icon: "nutrition", fn: "Transforme les aliments en énergie.", need: "Repas à reprendre", fixes: [
    { pos: "Assis, tablette repas", action: "Finir la ration prévue" },
    { pos: "À jeun, kit en main", action: "Glycémie si le planning le demande" },
    { pos: "Journal nutrition", action: "Noter un repas sauté" },
  ], risks: ["Alimentation et nutrition inadéquates", "Médicaments inefficaces ou toxiques en mission longue"], inds: ["glu"], x: 100, y: 176 },
  { id: "skin", side: "front", label: "Peau", icon: "dermatology", fn: "Barrière contre les microbes et la poussière.", need: "Peau à inspecter", fixes: [
    { pos: "Zone visible, lumière cabine", action: "Photographier la lésion" },
    { pos: "Ne pas frotter", action: "Laisser à l’air, noter la gêne" },
    { pos: "Journal images", action: "Envoyer au médecin de bord" },
  ], risks: ["Interactions hôte-microorganismes", "Exposition à la poussière céleste"], inds: [], x: 52, y: 150, note: "Pas de capteur dédié : photographiez une lésion ou une irritation depuis l’écran Images." },
  { id: "spine", side: "back", label: "Squelette et colonne", icon: "skeleton", fn: "Soutien et protection des organes.", need: "Dos à protéger", fixes: [
    { pos: "Debout, pieds au rail", action: "Étirement colonne · 30 s" },
    { pos: "ARED, genoux légèrement fléchis", action: "Charge prévue du jour" },
    { pos: "Dos au panneau, assis", action: "Signaler une douleur vive" },
  ], risks: ["Fracture liée aux modifications osseuses du vol spatial", "Blessures dues aux charges dynamiques"], inds: [], x: 100, y: 118, note: "Pas de mesure directe : le suivi passe par l’exercice quotidien (contre-mesure) et les examens prévus par l’équipe médicale." },
  { id: "muscles", side: "back", label: "Muscles", icon: "fitness_center", fn: "Force et mouvement, sorties extravéhiculaires.", need: "Force à entretenir", fixes: [
    { pos: "ARED, sangles réglées", action: "Séance résistance · 30 min" },
    { pos: "Pieds calés, dos droit", action: "Squat lent, amplitude complète" },
    { pos: "Étirement après l’effort", action: "Noter une douleur inhabituelle" },
  ], risks: ["Baisse de la condition cardiorespiratoire et musculosquelettique", "Blessures lors des sorties extravéhiculaires (EVA)"], inds: [], x: 82, y: 230, note: "Suivi par les séances d’exercice du Plan de soins." },
  { id: "kidneys", side: "back", label: "Reins", icon: "nephrology", fn: "Filtrent le sang, équilibre de l’eau et des minéraux.", need: "Hydratation à reprendre", fixes: [
    { pos: "Gourde en main", action: "Boire selon la consigne du jour" },
    { pos: "Debout, quelques pas", action: "Ne pas rester immobile" },
    { pos: "Douleur au flanc", action: "Prévenir le médecin de bord" },
  ], risks: ["Formation de calculs rénaux"], inds: [], x: 116, y: 160, note: "Pas de capteur dédié : l’hydratation régulière fait partie des actions préventives." },
];
