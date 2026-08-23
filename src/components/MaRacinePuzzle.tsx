'use client';

import { Fragment, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import styles from './MaRacinePuzzle.module.css';
import TrophyScene from './TrophyScene';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  playSound,
  useSound,
  useMusic,
  isSoundOn,
  isMusicOn,
  MUSIC_TRACKS,
  FETICHE_TRACK,
} from '@/lib/sound';
import {
  ensureUserDoc,
  loadProgress,
  saveHighestUnlocked,
  loadLives,
  saveLives,
  loadLevelStars,
  saveLevelStars,
  loadBoosters,
  saveBoosters,
  loadCoins,
  saveCoins,
  phoneFromUser,
  loadProfile,
  type LevelStars,
} from '@/lib/progress';

type TileType = { emoji: string; name: string; bg: string };
type Palette = { city: string; types: TileType[] };
type Pos = { r: number; c: number };
type Cell = number | null;
type BoosterType = 'bomb' | 'hammer' | 'bolt';

const PALETTES: Palette[] = [
  {
    city: 'Abidjan',
    types: [
      { emoji: '🍌', name: 'banane', bg: '#FFE9A8' },
      { emoji: '🍫', name: 'cacao', bg: '#DCC2AE' },
      { emoji: '🥜', name: 'anacarde*', bg: '#F0DFC0' },
      { emoji: '🍚', name: 'attiéké*', bg: '#FFFFFF' },
      { emoji: '🌶️', name: 'piment', bg: '#FBCFC7' },
      { emoji: '☁️', name: 'coton*', bg: '#F5F5F5' },
    ],
  },
  {
    city: 'Accra',
    types: [
      { emoji: '🍫', name: 'cacao', bg: '#DCC2AE' },
      { emoji: '🪙', name: 'or*', bg: '#FFE9A0' },
      { emoji: '🍍', name: 'ananas', bg: '#F0EDB0' },
      { emoji: '🌶️', name: 'piment', bg: '#FBCFC7' },
      { emoji: '🍌', name: 'banane', bg: '#FFE9A8' },
      { emoji: '🥥', name: 'coco', bg: '#F3EDE3' },
    ],
  },
  {
    city: 'Lagos',
    types: [
      { emoji: '🛢️', name: 'pétrole', bg: '#DCD8D3' },
      { emoji: '🍅', name: 'tomate', bg: '#FBD2C9' },
      { emoji: '🍌', name: 'plantain*', bg: '#FFE9A8' },
      { emoji: '🌶️', name: 'piment', bg: '#FBCFC7' },
      { emoji: '⚡', name: 'courant', bg: '#FFF3C0' },
      { emoji: '🍍', name: 'ananas', bg: '#F0EDB0' },
    ],
  },
  {
    city: 'Dakar',
    types: [
      { emoji: '🐟', name: 'poisson', bg: '#D6E8F0' },
      { emoji: '🥜', name: 'arachide', bg: '#F0DFC0' },
      { emoji: '🍚', name: 'riz', bg: '#FFFFFF' },
      { emoji: '🧂', name: 'sel', bg: '#F7F2EC' },
      { emoji: '🥭', name: 'mangue', bg: '#FFD9A0' },
      { emoji: '🐚', name: 'coquillage*', bg: '#F5EFE0' },
    ],
  },
  {
    city: 'Ouagadougou',
    types: [
      { emoji: '☁️', name: 'coton*', bg: '#F5F5F5' },
      { emoji: '🪙', name: 'or*', bg: '#FFE9A0' },
      { emoji: '🐄', name: 'bétail', bg: '#EAE2D6' },
      { emoji: '🧈', name: 'karité*', bg: '#FFF6E0' },
      { emoji: '🌾', name: 'mil*', bg: '#F0E4B8' },
      { emoji: '🎭', name: 'artisanat*', bg: '#EDD9C4' },
    ],
  },
  {
    city: 'Cotonou',
    types: [
      { emoji: '☁️', name: 'coton*', bg: '#F5F5F5' },
      { emoji: '🌴', name: 'huile de palme*', bg: '#E5F0D8' },
      { emoji: '🥜', name: 'anacarde*', bg: '#F0DFC0' },
      { emoji: '🐟', name: 'poisson', bg: '#D6E8F0' },
      { emoji: '🌽', name: 'maïs', bg: '#FFE9A0' },
      { emoji: '⚓', name: 'commerce*', bg: '#DCE6EA' },
    ],
  },
  {
    city: 'Douala',
    types: [
      { emoji: '🍫', name: 'cacao', bg: '#DCC2AE' },
      { emoji: '🛢️', name: 'pétrole', bg: '#DCD8D3' },
      { emoji: '🪵', name: 'bois*', bg: '#E8D3B0' },
      { emoji: '🍌', name: 'banane', bg: '#FFE9A8' },
      { emoji: '☕', name: 'café', bg: '#E0CCB8' },
      { emoji: '🎷', name: 'makossa*', bg: '#F0DDD0' },
    ],
  },
  {
    city: 'Addis Abeba',
    types: [
      { emoji: '☕', name: 'café', bg: '#E0CCB8' },
      { emoji: '🌾', name: 'teff*', bg: '#F0E4B8' },
      { emoji: '🪙', name: 'or*', bg: '#FFE9A0' },
      { emoji: '🐄', name: 'bétail', bg: '#EAE2D6' },
      { emoji: '🌹', name: 'fleurs', bg: '#FBD9E5' },
      { emoji: '🍯', name: 'miel', bg: '#FFE9A0' },
    ],
  },
];

const LEVELS = 96;
const LEVELS_PER_CITY = 12;
const DAILY_BONUS_KEY = 'maRacineLastBonusDate';

// ---- Boutique de pièces : Wave/Orange Money, validation manuelle par l'admin ----
const WAVE_NUMBER = '0749883981';
const OM_NUMBER = '0749883981';

type CoinPack = { id: string; label: string; coins: number; priceFcfa: number };
const COIN_PACKS: CoinPack[] = [
  { id: 'petit', label: 'Petit', coins: 100, priceFcfa: 200 },
  { id: 'moyen', label: 'Moyen', coins: 350, priceFcfa: 500 },
  { id: 'grand', label: 'Grand', coins: 1000, priceFcfa: 1000 },
];
const MOVES_COST_COINS = 50;
const LIFE_COST_COINS = 100;

type BoosterShopItem = {
  id: 'bomb' | 'hammer' | 'bolt' | 'shuffle' | 'life';
  emoji: string;
  label: string;
  cost: number;
};
const BOOSTER_SHOP_ITEMS: BoosterShopItem[] = [
  { id: 'bomb', emoji: '💣', label: 'Bombe', cost: 40 },
  { id: 'hammer', emoji: '🔨', label: 'Marteau', cost: 30 },
  { id: 'bolt', emoji: '⚡', label: 'Éclair', cost: 40 },
  { id: 'shuffle', emoji: '🔀', label: 'Mélange', cost: 25 },
  { id: 'life', emoji: '❤️', label: 'Vie', cost: LIFE_COST_COINS },
];
const REFILL_MS = 3 * 60 * 1000; // 3 minutes par vie
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

// ---- Progression à 96 niveaux : formules de difficulté ----
const posInCityFor = (L: number) => ((L - 1) % LEVELS_PER_CITY) + 1;

type LevelType = 'classique' | 'boss' | 'collecte' | 'court';
const LEVEL_TYPE_LABEL: Record<LevelType, string> = {
  classique: 'CLASSIQUE',
  boss: 'BOSS',
  collecte: 'COLLECTE',
  court: 'COURT',
};

const levelTypeFor = (pos: number): LevelType =>
  pos === 12
    ? 'boss'
    : pos === 4 || pos === 8
    ? 'collecte'
    : pos === 2 || pos === 6 || pos === 10
    ? 'court'
    : 'classique';

const activeTypeCountFor = (pos: number) => (pos <= 4 ? 4 : pos <= 8 ? 5 : 6);
const gridSizeFor = (pos: number) => (levelTypeFor(pos) === 'boss' ? 7 : 6);
const collectTargetFor = (pos: number) => 12 + pos;

const movesForLevel = (L: number) => {
  const pos = posInCityFor(L);
  const base = Math.max(12, 25 - Math.floor((L - 1) / 6));
  return levelTypeFor(pos) === 'court' ? Math.max(10, base - 5) : base;
};
const targetForLevel = (L: number) => {
  const pos = posInCityFor(L);
  const base = 600 + L * 120;
  return levelTypeFor(pos) === 'boss' ? Math.round(base * 1.5) : base;
};
const cityForLevel = (L: number) => Math.floor((L - 1) / LEVELS_PER_CITY);

// ---- Étoiles (1-3) selon la performance vs l'objectif de score du niveau ----
const starsForScore = (level: number, finalScore: number): 1 | 2 | 3 => {
  const target = targetForLevel(level);
  if (finalScore >= target * 1.75) return 3;
  if (finalScore >= target * 1.35) return 2;
  return 1;
};

// ---- Obstacles "fétiches" 🗿 : nombre + coups pour les casser, selon la position dans la ville ----
type ObstacleSpec = { count: number; hits: number };
const obstacleSpecFor = (pos: number): ObstacleSpec | null => {
  if (pos >= 12) return { count: 4, hits: 3 };
  if (pos >= 10) return { count: 3, hits: 2 };
  if (pos >= 7) return { count: 2, hits: 2 };
  if (pos >= 5) return { count: 1, hits: 1 };
  return null;
};

// ---- Fonctions "moteur" pures, hors du composant : ne dépendent que de leurs paramètres ----

const typesArr = (pIdx: number) => PALETTES[pIdx].types;
const randType = (pIdx: number, activeCount: number) =>
  Math.floor(Math.random() * activeCount);

// ---- Objectifs bonus multi-ingrédients : 2e voie (optionnelle) vers 3 étoiles,
// sur tous les niveaux. Le score seul reste suffisant pour gagner le niveau. ----
const objectiveCountFor = (pos: number) => (pos <= 3 ? 1 : pos <= 7 ? 2 : 3);
const objectiveTargetFor = (pos: number) => 6 + Math.floor(pos / 2);
const objectiveIngredientsFor = (pIdx: number, pos: number) =>
  typesArr(pIdx).slice(0, objectiveCountFor(pos));

const createGrid = (pIdx: number, rows: number, cols: number, activeCount: number): Cell[][] => {
  const g: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    g.push([]);
    for (let c = 0; c < cols; c++) {
      let t: number;
      do {
        t = randType(pIdx, activeCount);
      } while (
        (c >= 2 && g[r][c - 1] === t && g[r][c - 2] === t) ||
        (r >= 2 && g[r - 1][c] === t && g[r - 2][c] === t)
      );
      g[r].push(t);
    }
  }
  return g;
};

const findMatches = (g: Cell[][]): Set<string> => {
  const rows = g.length;
  const cols = g[0].length;
  const matched = new Set<string>();
  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      if (c < cols && g[r][c] !== null && g[r][c] === g[r][runStart]) {
        continue;
      } else {
        if (c - runStart >= 3 && g[r][runStart] !== null) {
          for (let k = runStart; k < c; k++) matched.add(`${r},${k}`);
        }
        runStart = c;
      }
    }
  }
  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      if (r < rows && g[r][c] !== null && g[r][c] === g[runStart][c]) {
        continue;
      } else {
        if (r - runStart >= 3 && g[runStart][c] !== null) {
          for (let k = runStart; k < r; k++) matched.add(`${k},${c}`);
        }
        runStart = r;
      }
    }
  }
  return matched;
};

const applyGravity = (g: Cell[][], pIdx: number, activeCount: number) => {
  const rows = g.length;
  const cols = g[0].length;
  for (let c = 0; c < cols; c++) {
    const colVals: number[] = [];
    for (let r = 0; r < rows; r++) {
      const v = g[r][c];
      if (v !== null) colVals.push(v);
    }
    const missing = rows - colVals.length;
    const newCol: number[] = [];
    for (let i = 0; i < missing; i++) newCol.push(randType(pIdx, activeCount));
    for (let i = 0; i < colVals.length; i++) newCol.push(colVals[i]);
    for (let r = 0; r < rows; r++) g[r][c] = newCol[r];
  }
};

const areAdjacent = (a: Pos, b: Pos) =>
  (a.r === b.r && Math.abs(a.c - b.c) === 1) || (a.c === b.c && Math.abs(a.r - b.r) === 1);

const swapCells = (g: Cell[][], a: Pos, b: Pos) => {
  const tmp = g[a.r][a.c];
  g[a.r][a.c] = g[b.r][b.c];
  g[b.r][b.c] = tmp;
};

// ---- Carte SVG : route par ville (12 nœuds) ----
const ROUTE_CX = 130;
const ROUTE_AMP = 78;
const ROUTE_FREQ = 0.85;
const ROUTE_SPACING = 78;
const ROUTE_START_Y = 50;

const routeXs = Array.from({ length: 12 }, (_, i) =>
  ROUTE_CX + ROUTE_AMP * Math.sin(i * ROUTE_FREQ)
);
const routeYs = Array.from({ length: 12 }, (_, i) => ROUTE_START_Y + i * ROUTE_SPACING);

function buildRoutePath(xs: number[], ys: number[]): string {
  let d = `M ${xs[0]},${ys[0]}`;
  for (let i = 1; i <= 10; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    const my = (ys[i] + ys[i + 1]) / 2;
    d += ` Q ${xs[i]},${ys[i]} ${mx},${my}`;
  }
  d += ` T ${xs[11]},${ys[11]}`;
  return d;
}

const ROUTE_PATH_D = buildRoutePath(routeXs, routeYs);

// Ville avec fond peint personnalisé : image de fond + nœuds en %.
// Pour ajouter une nouvelle ville : ajouter son entrée aux 3 tableaux ci-dessous
// (même index dans les trois), rien d'autre à toucher dans cityRoute()/le rendu.
const CITY_BACKGROUNDS: (string | null)[] = [
  '/maps/abidjan-route.png',
  '/maps/accra-route-verifiee.png',
  null,
  null,
  null,
  null,
  null,
  null,
];

const CITY_NODE_PERCENTS: ({ x: number; y: number }[] | null)[] = [
  // Abidjan
  [
    { x: 49.52, y: 38.58 },
    { x: 46.93, y: 46.29 },
    { x: 54.86, y: 52.69 },
    { x: 43.98, y: 57.66 },
    { x: 50.06, y: 64.65 },
    { x: 62.38, y: 68.24 },
    { x: 55.83, y: 75.12 },
    { x: 43.75, y: 78.89 },
    { x: 36.78, y: 85.65 },
    { x: 42.21, y: 92.82 },
    { x: 53.14, y: 97.67 },
    { x: 60.53, y: 99.94 },
  ],
  // Accra
  [
    { x: 63.76, y: 36.18 },
    { x: 60.11, y: 43.81 },
    { x: 49.87, y: 48.62 },
    { x: 51.22, y: 56.1 },
    { x: 59.08, y: 62.14 },
    { x: 47.19, y: 65.73 },
    { x: 37.94, y: 71.17 },
    { x: 46.25, y: 77.15 },
    { x: 57.13, y: 81.52 },
    { x: 57.06, y: 89.0 },
    { x: 48.88, y: 94.98 },
    { x: 38.43, y: 99.94 },
  ],
  null,
  null,
  null,
  null,
  null,
  null,
];

// Tracés invisibles (guides de déplacement du marcheur), un par ville à fond
// peint, en coordonnées 0-100 (correspond au viewBox 0 0 100 100 du <svg>
// superposé sur l'image). null pour les villes sans fond peint (route SVG classique).
const CITY_GUIDE_PATHS: (string | null)[] = [
  // Abidjan
  'M 49.52,38.58 Q 43.57,40.13 49.90,40.91 Q 56.24,41.69 57.46,42.46 Q 58.67,43.24 56.92,44.05 Q 55.17,44.86 50.68,45.63 Q 46.20,46.41 43.88,47.19 Q 41.57,47.97 41.75,48.77 Q 41.94,49.58 45.04,50.36 Q 48.13,51.14 51.50,51.91 Q 54.86,52.69 55.24,53.50 Q 55.62,54.31 53.47,55.08 Q 51.33,55.86 48.04,56.64 Q 44.76,57.42 42.82,58.22 Q 40.89,59.03 40.95,59.81 Q 41.00,60.59 41.65,61.36 Q 42.30,62.14 44.39,62.92 Q 46.48,63.70 49.70,64.50 Q 52.92,65.31 55.90,66.09 Q 58.87,66.87 60.80,67.64 Q 62.72,68.42 63.29,69.23 Q 63.86,70.04 63.36,70.81 Q 62.86,71.59 61.60,72.37 Q 60.33,73.15 58.58,73.95 Q 56.82,74.76 54.32,75.54 Q 51.82,76.32 49.23,77.09 Q 46.64,77.87 44.45,78.68 Q 42.25,79.49 40.57,80.26 Q 38.89,81.04 38.17,81.82 Q 37.44,82.60 37.15,83.37 Q 36.85,84.15 36.84,84.96 Q 36.83,85.77 36.41,86.54 Q 35.99,87.32 35.41,88.10 Q 34.83,88.88 35.65,89.68 Q 36.46,90.49 38.40,91.27 Q 40.33,92.05 42.37,92.82 Q 44.41,93.60 46.23,94.41 Q 48.05,95.22 49.42,95.99 Q 50.79,96.77 53.61,97.55 Q 56.43,98.33 58.48,99.13 T 60.53,99.94',
  // Accra
  'M 63.76,36.18 Q 59.10,45.93 56.83,46.80 Q 54.57,47.67 51.01,48.36 Q 47.46,49.04 44.53,49.76 Q 41.59,50.48 40.64,51.20 Q 39.69,51.91 40.39,52.60 Q 41.09,53.29 43.33,54.01 Q 45.57,54.72 48.39,55.41 Q 51.22,56.10 53.61,56.82 Q 56.01,57.54 57.72,58.25 Q 59.43,58.97 59.74,59.66 Q 60.06,60.35 59.74,61.06 Q 59.41,61.78 57.90,62.50 Q 56.38,63.22 54.09,63.91 Q 51.79,64.59 48.89,65.31 Q 45.99,66.03 44.23,66.72 Q 42.47,67.40 41.33,68.12 Q 40.19,68.84 39.19,69.56 Q 38.18,70.28 38.00,70.96 Q 37.83,71.65 38.37,72.37 Q 38.91,73.09 39.76,73.77 Q 40.62,74.46 41.89,75.18 Q 43.17,75.90 44.99,76.61 Q 46.81,77.33 48.92,78.02 Q 51.03,78.71 52.63,79.43 Q 54.24,80.14 55.76,80.86 Q 57.28,81.58 58.47,82.27 Q 59.65,82.95 60.49,83.67 Q 61.32,84.39 61.27,85.08 Q 61.22,85.77 60.75,86.48 Q 60.28,87.20 58.92,87.92 Q 57.55,88.64 56.91,89.32 Q 56.28,90.01 55.49,90.73 Q 54.71,91.45 53.31,92.14 Q 51.91,92.82 50.80,93.54 Q 49.69,94.26 49.05,94.98 Q 48.41,95.69 46.74,96.38 Q 45.08,97.07 42.76,97.79 Q 40.44,98.50 39.44,99.22 T 38.43,99.94',
  null,
  null,
  null,
  null,
  null,
  null,
];

// Tracé invisible du bus sur la scène de transition entre villes (coordonnées
// 0-100, superposé au <svg> par-dessus /maps/transition-fond.png).
const BUS_TRANSITION_GUIDE_D =
  'M 25.41,91.16 Q 32.30,89.50 32.82,88.63 Q 33.33,87.75 33.76,86.88 Q 34.20,86.00 34.14,85.13 Q 34.09,84.25 33.91,83.38 Q 33.72,82.50 34.59,81.63 Q 35.45,80.76 36.37,79.88 Q 37.30,79.01 37.97,78.18 Q 38.65,77.35 39.33,76.47 Q 40.01,75.60 40.92,74.72 Q 41.83,73.85 42.85,72.97 Q 43.86,72.10 45.21,71.22 Q 46.56,70.35 48.31,69.48 Q 50.07,68.60 52.19,67.73 Q 54.31,66.85 56.70,65.98 Q 59.08,65.10 61.46,64.27 Q 63.83,63.44 65.56,62.57 Q 67.29,61.69 68.09,60.82 Q 68.90,59.94 68.57,59.07 Q 68.25,58.20 66.65,57.32 Q 65.05,56.45 61.96,55.57 Q 58.87,54.70 53.88,53.82 Q 48.89,52.95 46.33,52.07 T 43.77,51.20';

// Éclair en zigzag pour la scène d'intro du boss d'Abidjan (viewBox 0 0 20 100).
const BOSS_BOLT_D = 'M 10,0 L 4,22 L 12,26 L 3,50 L 13,54 L 5,78 L 15,80 L 8,100';

// Données de route (tracé + coordonnées des nœuds) pour une ville donnée.
function cityRoute(ci: number): {
  isPercent: boolean;
  pathD: string;
  nodeXs: number[];
  nodeYs: number[];
} {
  const pts = CITY_NODE_PERCENTS[ci];
  if (pts) {
    return {
      isPercent: true,
      pathD: CITY_GUIDE_PATHS[ci] ?? '',
      nodeXs: pts.map((p) => p.x),
      nodeYs: pts.map((p) => p.y),
    };
  }
  return { isPercent: false, pathD: ROUTE_PATH_D, nodeXs: routeXs, nodeYs: routeYs };
}

// Convertit la position d'un nœud (x, y) en % de la longueur du path,
// en trouvant le point du path le plus proche via getPointAtLength (petits pas).
function percentAtNode(pathEl: SVGPathElement, xi: number, yi: number, total: number): number {
  const steps = 400;
  let bestStep = 0;
  let bestDist = Infinity;
  for (let s = 0; s <= steps; s++) {
    const pt = pathEl.getPointAtLength((s / steps) * total);
    const d = (pt.x - xi) * (pt.x - xi) + (pt.y - yi) * (pt.y - yi);
    if (d < bestDist) {
      bestDist = d;
      bestStep = s;
    }
  }
  return (bestStep / steps) * 100;
}

export default function MaRacinePuzzle() {
  const { user } = useAuth();
  const router = useRouter();
  const { soundOn, toggle: toggleSoundPref } = useSound();
  const { musicOn, toggle: toggleMusicPref } = useMusic();

  // ---- Refs "moteur" (source de vérité synchrone pendant la résolution) ----
  const gridRef = useRef<Cell[][]>([]);
  // Obstacles "fétiches" : liés à la position (r,c) du plateau, pas à une tuile.
  // Valeur = coups restants pour casser le fétiche sur cette case, null = pas d'obstacle.
  const obstacleGridRef = useRef<(number | null)[][]>([]);
  // Compteur de tuiles réellement vidées par type (index 0-5), pour les objectifs bonus.
  const tileClearCountsRef = useRef<number[]>(new Array(6).fill(0));
  const movesRef = useRef(movesForLevel(1));
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const collectRef = useRef(0);
  const bombCountRef = useRef(1);
  const hammerCountRef = useRef(1);
  const boltCountRef = useRef(1);
  const shuffleCountRef = useRef(1);
  const busyRef = useRef(false);
  const pendingBoosterRef = useRef<BoosterType | null>(null);
  const selectedRef = useRef<Pos | null>(null);
  const paletteRef = useRef(0);
  const highestUnlockedRef = useRef(1);
  const levelStarsRef = useRef<LevelStars>({});
  const transitionTimerRef = useRef<number | null>(null);
  const livesRef = useRef(5);
  const nextLifeAtRef = useRef<number | null>(null);
  const routePathRefs = useRef<(SVGPathElement | null)[]>([]);
  const walkerIconRef = useRef<HTMLSpanElement | null>(null);
  const transitionPathRef = useRef<SVGPathElement | null>(null);
  const transitionBusRef = useRef<HTMLImageElement | null>(null);
  const transitionSmokeLayerRef = useRef<HTMLDivElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const busEngineRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);
  const musicTrackIndexRef = useRef(0);
  const inFeticheMusicRef = useRef(false);
  const pendingNextRef = useRef(0);

  // ---- Etat d'affichage (déclenche les re-rendus) ----
  const [currentLevel, setCurrentLevel] = useState(1);
  const [highestUnlocked, setHighestUnlocked] = useState(1);
  const [levelStars, setLevelStars] = useState<LevelStars>({});
  const [viewMode, setViewMode] = useState<'map' | 'play' | 'profile' | 'shop'>('map');
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'om'>('wave');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [coins, setCoins] = useState(0);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState('');
  const [gridView, setGridView] = useState<Cell[][]>([]);
  const [obstacleView, setObstacleView] = useState<(number | null)[][]>([]);
  const [tileClearCounts, setTileClearCounts] = useState<number[]>(new Array(6).fill(0));
  const [boostFx, setBoostFx] = useState<
    ({ id: number; r: number; c: number } & ({ kind: 'bomb' } | { kind: 'hammer' } | { kind: 'bolt' }))[]
  >([]);
  const boostFxIdRef = useRef(0);
  const [shardTiles, setShardTiles] = useState<
    { id: number; r: number; c: number; emoji: string; shards: { angle: number; scale: number; rotate: number }[] }[]
  >([]);
  const [flashCells, setFlashCells] = useState<{ id: number; r: number; c: number; color: string }[]>(
    []
  );
  const [flinchTiles, setFlinchTiles] = useState<{ id: number; r: number; c: number }[]>([]);
  const [swapArcTiles, setSwapArcTiles] = useState<{ id: number; r: number; c: number }[]>([]);
  const [matchPopTiles, setMatchPopTiles] = useState<
    { id: number; r: number; c: number; combo: boolean }[]
  >([]);
  const [floatingScores, setFloatingScores] = useState<
    { id: number; r: number; c: number; points: number; combo: boolean }[]
  >([]);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [score, setScore] = useState(0);
  const [collectCount, setCollectCount] = useState(0);
  const [moves, setMoves] = useState(movesForLevel(1));
  const [bombCount, setBombCount] = useState(1);
  const [hammerCount, setHammerCount] = useState(1);
  const [boltCount, setBoltCount] = useState(1);
  const [shuffleCount, setShuffleCount] = useState(1);
  const [statusText, setStatusText] = useState(
    'Touche deux ingrédients voisins pour les échanger'
  );
  const [showTutorial, setShowTutorial] = useState(true);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [lastCoinsEarned, setLastCoinsEarned] = useState(0);
  const [lastEarnedStars, setLastEarnedStars] = useState(0);
  const [lastObjectivesComplete, setLastObjectivesComplete] = useState(false);
  const [coinsCountUp, setCoinsCountUp] = useState(0);
  const [confetti, setConfetti] = useState<
    { id: number; left: number; color: string; delay: number; duration: number; drift: number }[]
  >([]);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [transitionLevel, setTransitionLevel] = useState<number | null>(null);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [bossBtnVisible, setBossBtnVisible] = useState(false);
  const [bossLightning, setBossLightning] = useState<{ id: number; x: number } | null>(null);
  const [lives, setLives] = useState(5);
  const [nextLifeAt, setNextLifeAt] = useState<number | null>(null);
  const [showNoLives, setShowNoLives] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [mapUnlocked, setMapUnlocked] = useState(1);
  const [walker, setWalker] = useState<{
    cityIndex: number;
    from: number;
    to: number;
  } | null>(null);

  const syncGrid = () => setGridView(gridRef.current.map((row) => [...row]));

  // Persiste les compteurs de boosters (bombe/marteau/éclair/mélange) dans Firestore,
  // pour qu'un bonus gagné (ex: bonus quotidien) survive au changement/relance de niveau.
  const persistBoosters = () => {
    if (!user) return;
    saveBoosters(user.uid, {
      bombCount: bombCountRef.current,
      hammerCount: hammerCountRef.current,
      boltCount: boltCountRef.current,
      shuffleCount: shuffleCountRef.current,
    }).catch(() => {});
  };
  const syncObstacles = () => setObstacleView(obstacleGridRef.current.map((row) => [...row]));
  const syncTileClearCounts = () => setTileClearCounts([...tileClearCountsRef.current]);

  // Effets visuels des boosters (bombe/marteau/éclair) : ajoutés au déclenchement,
  // retirés tout seuls après leur durée d'animation — ne bloque jamais la logique
  // de jeu (cascade/vérification de victoire), qui continue en parallèle.
  const spawnBoostFx = (
    fx: { kind: 'bomb' | 'hammer' | 'bolt'; r: number; c: number },
    durationMs: number
  ) => {
    const id = ++boostFxIdRef.current;
    setBoostFx((prev) => [...prev, { ...fx, id }]);
    window.setTimeout(() => {
      setBoostFx((prev) => prev.filter((f) => f.id !== id));
    }, durationMs);
  };

  // Mini-répliques de l'emoji réel d'une tuile détruite, giclant en éventail
  // avec une légère chute avant de s'effacer.
  const spawnShardTile = (
    r: number,
    c: number,
    emoji: string,
    durationMs: number,
    countRange: [number, number] = [2, 3]
  ) => {
    const id = ++boostFxIdRef.current;
    const [minCount, maxCount] = countRange;
    const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
    const shards = Array.from({ length: count }, () => ({
      angle: Math.random() * 360,
      scale: 0.6 + Math.random() * 0.3,
      rotate: Math.random() * 360,
    }));
    setShardTiles((prev) => [...prev, { id, r, c, emoji, shards }]);
    window.setTimeout(() => {
      setShardTiles((prev) => prev.filter((s) => s.id !== id));
    }, durationMs);
  };

  // Flash de couleur (halo radial) teinté avec la couleur du type majoritairement détruit.
  const spawnFlash = (r: number, c: number, color: string, durationMs: number) => {
    const id = ++boostFxIdRef.current;
    setFlashCells((prev) => [...prev, { id, r, c, color }]);
    window.setTimeout(() => {
      setFlashCells((prev) => prev.filter((f) => f.id !== id));
    }, durationMs);
  };

  // Léger tressaillement d'une tuile adjacente non détruite, pour vendre l'impact de zone.
  const spawnFlinch = (r: number, c: number, durationMs: number) => {
    const id = ++boostFxIdRef.current;
    setFlinchTiles((prev) => [...prev, { id, r, c }]);
    window.setTimeout(() => {
      setFlinchTiles((prev) => prev.filter((f) => f.id !== id));
    }, durationMs);
  };

  // Léger arc en Z sur les deux tuiles échangées, pour que le swap semble
  // passer par-dessus le plateau plutôt qu'à plat.
  const spawnSwapArc = (r: number, c: number, durationMs: number) => {
    const id = ++boostFxIdRef.current;
    setSwapArcTiles((prev) => [...prev, { id, r, c }]);
    window.setTimeout(() => {
      setSwapArcTiles((prev) => prev.filter((s) => s.id !== id));
    }, durationMs);
  };

  // Pop d'une tuile matchée juste avant qu'elle ne soit vidée (encore visible à cet instant).
  const spawnMatchPop = (r: number, c: number, combo: boolean, durationMs: number) => {
    const id = ++boostFxIdRef.current;
    setMatchPopTiles((prev) => [...prev, { id, r, c, combo }]);
    window.setTimeout(() => {
      setMatchPopTiles((prev) => prev.filter((p) => p.id !== id));
    }, durationMs);
  };

  // Texte flottant "+N" centré sur le groupe matché, monte en s'estompant.
  const spawnFloatingScore = (r: number, c: number, points: number, combo: boolean, durationMs: number) => {
    const id = ++boostFxIdRef.current;
    setFloatingScores((prev) => [...prev, { id, r, c, points, combo }]);
    window.setTimeout(() => {
      setFloatingScores((prev) => prev.filter((f) => f.id !== id));
    }, durationMs);
  };

  // Déclenche les éclats/flash/tressaillement d'un booster à partir des tuiles
  // réellement détruites (avec leur type, pour l'emoji et la couleur de flash).
  const triggerBoosterVisuals = (
    destroyed: { r: number; c: number; val: number }[],
    typesForFx: TileType[],
    centerR: number,
    centerC: number,
    rows: number,
    cols: number,
    kind: 'bomb' | 'hammer' | 'bolt'
  ) => {
    if (destroyed.length === 0) return;

    destroyed.forEach(({ r, c, val }) => {
      const emoji = typesForFx[val]?.emoji ?? '✨';
      spawnShardTile(r, c, emoji, 580);
    });

    const counts = new Map<number, number>();
    destroyed.forEach(({ val }) => counts.set(val, (counts.get(val) ?? 0) + 1));
    let majorityVal = destroyed[0].val;
    let best = 0;
    counts.forEach((n, val) => {
      if (n > best) {
        best = n;
        majorityVal = val;
      }
    });
    spawnFlash(centerR, centerC, typesForFx[majorityVal]?.bg ?? '#ffe29a', 200);

    const destroyedSet = new Set(destroyed.map((d) => `${d.r},${d.c}`));
    const flinchCandidates: { r: number; c: number }[] = [];
    if (kind === 'bomb') {
      for (let rr = centerR - 2; rr <= centerR + 2; rr++) {
        for (let cc = centerC - 2; cc <= centerC + 2; cc++) {
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          const onRing = Math.max(Math.abs(rr - centerR), Math.abs(cc - centerC)) === 2;
          if (onRing && !destroyedSet.has(`${rr},${cc}`)) flinchCandidates.push({ r: rr, c: cc });
        }
      }
    } else if (kind === 'hammer') {
      for (let rr = centerR - 1; rr <= centerR + 1; rr++) {
        for (let cc = centerC - 1; cc <= centerC + 1; cc++) {
          if (rr === centerR && cc === centerC) continue;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          if (!destroyedSet.has(`${rr},${cc}`)) flinchCandidates.push({ r: rr, c: cc });
        }
      }
    } else {
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          if (destroyedSet.has(`${rr},${cc}`)) continue;
          if (Math.abs(rr - centerR) === 1 || Math.abs(cc - centerC) === 1) {
            flinchCandidates.push({ r: rr, c: cc });
          }
        }
      }
    }
    flinchCandidates.forEach(({ r, c }) => spawnFlinch(r, c, 120));
  };

  // Construit un tracé en zigzag (coordonnées en unités de cellule de grille)
  // pour l'éclair, le long d'un axe (horizontal = ligne, vertical = colonne).
  const buildZigzag = (to: number, cross: number, horizontal: boolean): string => {
    const segments = Math.max(4, Math.round(to * 2));
    const amplitude = 0.14;
    const pts: string[] = [];
    for (let i = 0; i <= segments; i++) {
      const main = (to / segments) * i;
      const off = i === 0 || i === segments ? 0 : i % 2 === 0 ? -amplitude : amplitude;
      const x = horizontal ? main : cross + off;
      const y = horizontal ? cross + off : main;
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(' ');
  };

  // Décrémente le fétiche sur (r,c) si son contenu vient de disparaître ; le retire à 0 coup.
  const damageObstacle = (r: number, c: number) => {
    const row = obstacleGridRef.current[r];
    if (!row) return;
    const hits = row[c];
    if (hits === null || hits <= 0) return;
    row[c] = hits - 1 > 0 ? hits - 1 : null;
  };

  const obstaclesRemaining = () =>
    obstacleGridRef.current.reduce((acc, row) => acc + row.filter((v) => v !== null).length, 0);

  const resolveCascade = async (pIdx: number) => {
    const activeCount = activeTypeCountFor(posInCityFor(levelRef.current));
    const typesForFx = typesArr(pIdx).slice(0, activeCount);
    let matches = findMatches(gridRef.current);
    let safety = 0;
    while (matches.size > 0 && safety < 6) {
      const isCombo = safety >= 1;
      playSound('match.mp3');
      if (isCombo) playSound('combo.mp3');

      // Capture les tuiles avant de les vider : leur émoji est encore affiché à cet
      // instant, nécessaire pour les éclats, le pop et le flash de combo.
      const matchedCells: { r: number; c: number; val: number }[] = [];
      matches.forEach((key) => {
        const [rr, cc] = key.split(',').map(Number);
        const val = gridRef.current[rr][cc];
        if (val !== null) matchedCells.push({ r: rr, c: cc, val });
      });

      scoreRef.current += matches.size * 10;
      setScore(scoreRef.current);

      matchedCells.forEach(({ r, c, val }) => {
        spawnMatchPop(r, c, isCombo, 260);
        const emoji = typesForFx[val]?.emoji ?? '✨';
        spawnShardTile(r, c, emoji, 500, [1, 2]);
      });

      if (matchedCells.length > 0) {
        const centerR = matchedCells.reduce((acc, m) => acc + m.r, 0) / matchedCells.length;
        const centerC = matchedCells.reduce((acc, m) => acc + m.c, 0) / matchedCells.length;
        spawnFloatingScore(centerR, centerC, matches.size * 10, isCombo, 700);
        if (isCombo) {
          spawnFlash(Math.round(centerR), Math.round(centerC), '#ffd76b', 220);
        }
      }

      // Laisse le pop se voir avant que la case ne change de contenu.
      await sleep(220);

      matchedCells.forEach(({ r, c, val }) => {
        if (val === 0) collectRef.current += 1;
        if (tileClearCountsRef.current[val] !== undefined) tileClearCountsRef.current[val] += 1;
        gridRef.current[r][c] = null;
        damageObstacle(r, c);
      });
      setCollectCount(collectRef.current);
      syncGrid();
      syncObstacles();
      syncTileClearCounts();
      await sleep(150);
      applyGravity(gridRef.current, pIdx, activeCount);
      syncGrid();
      await sleep(150);
      matches = findMatches(gridRef.current);
      safety++;
    }
  };

  const handleVictory = () => {
    playSound('victoire.mp3');
    resumePlaylistIfNeeded();
    setShowVictoryModal(true);

    // Objectifs bonus multi-ingrédients : 2e voie (optionnelle) vers 3 étoiles.
    // Le score seul reste suffisant pour gagner le niveau (logique inchangée ci-dessous).
    const pos = posInCityFor(levelRef.current);
    const objectiveCount = objectiveCountFor(pos);
    const objectiveTarget = objectiveTargetFor(pos);
    let allObjectivesComplete = true;
    for (let i = 0; i < objectiveCount; i++) {
      if ((tileClearCountsRef.current[i] ?? 0) < objectiveTarget) {
        allObjectivesComplete = false;
        break;
      }
    }
    setLastObjectivesComplete(allObjectivesComplete);

    // Étoiles : ne jamais diminuer un score déjà acquis pour ce niveau. 3 étoiles si
    // le score l'aurait déjà donné OU si les objectifs bonus sont tous complétés (OU,
    // pas un remplacement — les seuils 1/2 étoiles restent ceux de starsForScore).
    const baseStars = starsForScore(levelRef.current, scoreRef.current);
    const earnedStars: 1 | 2 | 3 = baseStars === 3 || allObjectivesComplete ? 3 : baseStars;
    setLastEarnedStars(earnedStars);
    const prevStars = levelStarsRef.current[levelRef.current] ?? 0;
    if (earnedStars > prevStars) {
      levelStarsRef.current = { ...levelStarsRef.current, [levelRef.current]: earnedStars };
      setLevelStars(levelStarsRef.current);
      if (user) {
        saveLevelStars(user.uid, levelRef.current, earnedStars).catch(() => {});
      }
    }

    // Première réussite de ce niveau : même condition que celle qui débloque le
    // niveau suivant ci-dessous, capturée avant l'incrémentation de highestUnlockedRef.
    const isFirstClear = levelRef.current >= highestUnlockedRef.current;

    if (levelRef.current === highestUnlockedRef.current && levelRef.current < LEVELS) {
      highestUnlockedRef.current += 1;
      setHighestUnlocked(highestUnlockedRef.current);
      if (user) {
        saveHighestUnlocked(user.uid, highestUnlockedRef.current).catch(() => {});
      }
    }

    // Récompense en pièces : uniquement à la toute première réussite du niveau,
    // jamais en rejouant un niveau déjà battu.
    const coinsEarned = isFirstClear ? earnedStars * 10 : 0;
    setLastCoinsEarned(coinsEarned);
    setCoins((prev) => {
      const next = prev + coinsEarned;
      if (user) saveCoins(user.uid, next).catch(() => {});
      return next;
    });
  };

  const checkLevelEnd = () => {
    const pos = posInCityFor(levelRef.current);
    const type = levelTypeFor(pos);
    const objectiveReached =
      type === 'collecte'
        ? collectRef.current >= collectTargetFor(pos)
        : scoreRef.current >= targetForLevel(levelRef.current);
    // Avec des fétiches actifs, la victoire exige l'objectif existant ET tous les fétiches cassés.
    if (objectiveReached && obstaclesRemaining() === 0) {
      handleVictory();
    } else if (movesRef.current <= 0) {
      playSound('echec.mp3');
      resumePlaylistIfNeeded();
      setShowFailureModal(true);
    }
  };

  const swapAndResolve = async (a: Pos, b: Pos, pIdx: number) => {
    busyRef.current = true;
    swapCells(gridRef.current, a, b);
    spawnSwapArc(a.r, a.c, 280);
    spawnSwapArc(b.r, b.c, 280);
    syncGrid();
    await sleep(140);
    const matches = findMatches(gridRef.current);
    if (matches.size === 0) {
      swapCells(gridRef.current, a, b);
      syncGrid();
      busyRef.current = false;
      return;
    }
    movesRef.current = Math.max(0, movesRef.current - 1);
    setMoves(movesRef.current);
    await resolveCascade(pIdx);
    busyRef.current = false;
    checkLevelEnd();
  };

  const triggerBomb = async (r: number, c: number, pIdx: number) => {
    playSound('booster.mp3');
    spawnBoostFx({ kind: 'bomb', r, c }, 500);
    busyRef.current = true;
    const activeCount = activeTypeCountFor(posInCityFor(levelRef.current));
    const typesForFx = typesArr(pIdx).slice(0, activeCount);
    const g = gridRef.current;
    const rows = g.length;
    const cols = g[0].length;
    let cleared = 0;
    const destroyed: { r: number; c: number; val: number }[] = [];
    for (let rr = r - 1; rr <= r + 1; rr++) {
      for (let cc = c - 1; cc <= c + 1; cc++) {
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
          const val = g[rr][cc];
          if (val !== null) destroyed.push({ r: rr, c: cc, val });
          if (val === 0) collectRef.current += 1;
          if (val !== null && tileClearCountsRef.current[val] !== undefined) {
            tileClearCountsRef.current[val] += 1;
          }
          g[rr][cc] = null;
          damageObstacle(rr, cc);
          cleared++;
        }
      }
    }
    triggerBoosterVisuals(destroyed, typesForFx, r, c, rows, cols, 'bomb');
    setCollectCount(collectRef.current);
    scoreRef.current += cleared * 10;
    setScore(scoreRef.current);
    syncGrid();
    syncObstacles();
    syncTileClearCounts();
    await sleep(200);
    applyGravity(gridRef.current, pIdx, activeCount);
    syncGrid();
    await sleep(150);
    await resolveCascade(pIdx);
    busyRef.current = false;
    checkLevelEnd();
  };

  const triggerHammer = async (r: number, c: number, pIdx: number) => {
    playSound('booster.mp3');
    spawnBoostFx({ kind: 'hammer', r, c }, 500);
    busyRef.current = true;
    const activeCount = activeTypeCountFor(posInCityFor(levelRef.current));
    const typesForFx = typesArr(pIdx).slice(0, activeCount);
    const g = gridRef.current;
    const rows = g.length;
    const cols = g[0].length;
    let cleared = 0;
    const destroyed: { r: number; c: number; val: number }[] = [];
    if (g[r][c] !== null) {
      const val = g[r][c]!;
      destroyed.push({ r, c, val });
      if (val === 0) collectRef.current += 1;
      if (tileClearCountsRef.current[val] !== undefined) tileClearCountsRef.current[val] += 1;
      g[r][c] = null;
      damageObstacle(r, c);
      cleared = 1;
    }
    triggerBoosterVisuals(destroyed, typesForFx, r, c, rows, cols, 'hammer');
    setCollectCount(collectRef.current);
    scoreRef.current += cleared * 10;
    setScore(scoreRef.current);
    syncGrid();
    syncObstacles();
    syncTileClearCounts();
    await sleep(200);
    applyGravity(gridRef.current, pIdx, activeCount);
    syncGrid();
    await sleep(150);
    await resolveCascade(pIdx);
    busyRef.current = false;
    checkLevelEnd();
  };

  const triggerBolt = async (r: number, c: number, pIdx: number) => {
    playSound('booster.mp3');
    spawnBoostFx({ kind: 'bolt', r, c }, 250);
    busyRef.current = true;
    const activeCount = activeTypeCountFor(posInCityFor(levelRef.current));
    const typesForFx = typesArr(pIdx).slice(0, activeCount);
    const g = gridRef.current;
    const rows = g.length;
    const cols = g[0].length;
    let cleared = 0;
    const destroyed: { r: number; c: number; val: number }[] = [];
    for (let rr = 0; rr < rows; rr++) {
      if (g[rr][c] !== null) {
        const val = g[rr][c]!;
        destroyed.push({ r: rr, c, val });
        if (val === 0) collectRef.current += 1;
        if (tileClearCountsRef.current[val] !== undefined) tileClearCountsRef.current[val] += 1;
        g[rr][c] = null;
        damageObstacle(rr, c);
        cleared++;
      }
    }
    for (let cc = 0; cc < cols; cc++) {
      if (cc !== c && g[r][cc] !== null) {
        const val = g[r][cc]!;
        destroyed.push({ r, c: cc, val });
        if (val === 0) collectRef.current += 1;
        if (tileClearCountsRef.current[val] !== undefined) tileClearCountsRef.current[val] += 1;
        g[r][cc] = null;
        damageObstacle(r, cc);
        cleared++;
      }
    }
    triggerBoosterVisuals(destroyed, typesForFx, r, c, rows, cols, 'bolt');
    setCollectCount(collectRef.current);
    scoreRef.current += cleared * 10;
    setScore(scoreRef.current);
    syncGrid();
    syncObstacles();
    syncTileClearCounts();
    await sleep(200);
    applyGravity(gridRef.current, pIdx, activeCount);
    syncGrid();
    await sleep(150);
    await resolveCascade(pIdx);
    busyRef.current = false;
    checkLevelEnd();
  };

  const onTileClick = async (r: number, c: number) => {
    if (busyRef.current || movesRef.current <= 0) return;
    const pIdx = paletteRef.current;

    const booster = pendingBoosterRef.current;
    if (booster) {
      pendingBoosterRef.current = null;
      setStatusText('Touche deux ingrédients voisins pour les échanger');
      if (booster === 'bomb') {
        bombCountRef.current -= 1;
        setBombCount(bombCountRef.current);
        persistBoosters();
        await triggerBomb(r, c, pIdx);
      } else if (booster === 'hammer') {
        hammerCountRef.current -= 1;
        setHammerCount(hammerCountRef.current);
        persistBoosters();
        await triggerHammer(r, c, pIdx);
      } else {
        boltCountRef.current -= 1;
        setBoltCount(boltCountRef.current);
        persistBoosters();
        await triggerBolt(r, c, pIdx);
      }
      return;
    }

    const sel = selectedRef.current;
    if (!sel) {
      selectedRef.current = { r, c };
      setSelected({ r, c });
      return;
    }
    if (sel.r === r && sel.c === c) {
      selectedRef.current = null;
      setSelected(null);
      return;
    }
    if (!areAdjacent(sel, { r, c })) {
      selectedRef.current = { r, c };
      setSelected({ r, c });
      return;
    }
    const a = sel;
    const b = { r, c };
    selectedRef.current = null;
    setSelected(null);
    await swapAndResolve(a, b, pIdx);
  };

  const activateBomb = () => {
    if (busyRef.current || bombCountRef.current <= 0 || movesRef.current <= 0) return;
    pendingBoosterRef.current = 'bomb';
    setStatusText('Touche une case pour faire exploser la zone (3x3)');
  };
  const activateHammer = () => {
    if (busyRef.current || hammerCountRef.current <= 0 || movesRef.current <= 0) return;
    pendingBoosterRef.current = 'hammer';
    setStatusText('Touche une tuile pour la détruire');
  };
  const activateBolt = () => {
    if (busyRef.current || boltCountRef.current <= 0 || movesRef.current <= 0) return;
    pendingBoosterRef.current = 'bolt';
    setStatusText('Touche une tuile pour détruire sa ligne et sa colonne');
  };
  const triggerShuffle = () => {
    if (busyRef.current || shuffleCountRef.current <= 0 || movesRef.current <= 0) return;
    playSound('booster.mp3');
    shuffleCountRef.current -= 1;
    setShuffleCount(shuffleCountRef.current);
    persistBoosters();
    const g = gridRef.current;
    let attempts = 0;
    do {
      const tiles: number[] = [];
      for (let r = 0; r < g.length; r++) {
        for (let c = 0; c < g[0].length; c++) {
          const v = g[r][c];
          if (v !== null) tiles.push(v);
        }
      }
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = tiles[i];
        tiles[i] = tiles[j];
        tiles[j] = tmp;
      }
      let idx = 0;
      for (let r = 0; r < g.length; r++) {
        for (let c = 0; c < g[0].length; c++) {
          if (g[r][c] !== null) {
            g[r][c] = tiles[idx];
            idx++;
          }
        }
      }
      attempts++;
    } while (findMatches(g).size > 0 && attempts < 20);
    syncGrid();
  };

  const startLevel = (L: number) => {
    if (L > highestUnlockedRef.current) return;
    const safeL = Math.max(1, Math.min(LEVELS, L));
    const pos = posInCityFor(safeL);

    // Musique : bascule sur la piste fétiche pour les niveaux à obstacles
    // (mêmes conditions que obstacleSpecFor), reprend la playlist sinon.
    if (pos >= 5) {
      if (!inFeticheMusicRef.current) startFeticheMusic();
    } else {
      resumePlaylistIfNeeded();
    }

    const pIdx = cityForLevel(safeL);
    const activeCount = activeTypeCountFor(pos);
    const size = gridSizeFor(pos);
    const mv = movesForLevel(safeL);
    levelRef.current = safeL;
    setCurrentLevel(safeL);
    paletteRef.current = pIdx;
    movesRef.current = mv;
    // max(1, valeur persistée) : un booster gagné (bonus quotidien, achat...) reste
    // disponible d'un niveau à l'autre, sans jamais descendre sous l'allocation gratuite de 1.
    bombCountRef.current = Math.max(1, bombCountRef.current);
    hammerCountRef.current = Math.max(1, hammerCountRef.current);
    boltCountRef.current = Math.max(1, boltCountRef.current);
    shuffleCountRef.current = Math.max(1, shuffleCountRef.current);
    selectedRef.current = null;
    busyRef.current = false;
    pendingBoosterRef.current = null;
    setMoves(mv);
    setBombCount(bombCountRef.current);
    setHammerCount(hammerCountRef.current);
    setBoltCount(boltCountRef.current);
    setShuffleCount(shuffleCountRef.current);
    setSelected(null);
    scoreRef.current = 0;
    collectRef.current = 0;
    setScore(0);
    setCollectCount(0);
    setStatusText('Touche deux ingrédients voisins pour les échanger');
    setShowFailureModal(false);
    setShowVictoryModal(false);
    gridRef.current = createGrid(pIdx, size, size, activeCount);
    syncGrid();

    // Fétiches 🗿 : placés aléatoirement sur des cases distinctes selon la table de difficulté.
    const obstacleSpec = obstacleSpecFor(pos);
    const newObstacles: (number | null)[][] = Array.from({ length: size }, () =>
      Array<number | null>(size).fill(null)
    );
    if (obstacleSpec) {
      const cells: Pos[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) cells.push({ r, c });
      }
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      for (let i = 0; i < obstacleSpec.count && i < cells.length; i++) {
        const { r, c } = cells[i];
        newObstacles[r][c] = obstacleSpec.hits;
      }
    }
    obstacleGridRef.current = newObstacles;
    syncObstacles();

    // Objectifs bonus : remet à zéro le compteur de tuiles vidées par type.
    tileClearCountsRef.current = new Array(6).fill(0);
    syncTileClearCounts();
  };

  // Initialise le niveau au montage. React 19 préfère éviter le setState en
  // effet ; ce pattern reste correct et très répandu, mais si ton lint est
  // configuré aussi strictement que ce sandbox, tu peux le voir signalé.
  useEffect(() => {
    startLevel(1);
    if (localStorage.getItem(DAILY_BONUS_KEY) !== todayStr()) {
      setShowDailyBonus(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charge la progression Firestore au chargement (si connecté).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      try {
        await ensureUserDoc(user);

        // Avatar + pseudo obligatoires : redirige avant de charger/afficher le reste
        // si le joueur (nouveau ou compte existant) n'a jamais fait ce choix.
        const profile = await loadProfile(user);
        if (!profile.avatarId || !profile.pseudo) {
          if (!cancelled) router.replace('/choix-avatar');
          return;
        }
        if (!cancelled) {
          setAvatarId(profile.avatarId);
          setPseudo(profile.pseudo);
        }

        const saved = await loadProgress(user);
        const livesState = await loadLives(user);
        const stars = await loadLevelStars(user);
        const boosters = await loadBoosters(user);
        const coinsSaved = await loadCoins(user);
        if (!cancelled) {
          setCoins(coinsSaved);
          highestUnlockedRef.current = saved;
          setHighestUnlocked(saved);
          livesRef.current = livesState.lives;
          nextLifeAtRef.current = livesState.nextLifeAt;
          setLives(livesState.lives);
          setNextLifeAt(livesState.nextLifeAt);
          setMapUnlocked(saved);
          levelStarsRef.current = stars;
          setLevelStars(stars);
          bombCountRef.current = Math.max(1, boosters.bombCount);
          hammerCountRef.current = Math.max(1, boosters.hammerCount);
          boltCountRef.current = Math.max(1, boosters.boltCount);
          shuffleCountRef.current = Math.max(1, boosters.shuffleCount);
          setBombCount(bombCountRef.current);
          setHammerCount(hammerCountRef.current);
          setBoltCount(boltCountRef.current);
          setShuffleCount(shuffleCountRef.current);
          applyRecharge();
        }
      } catch {
        // Firestore indisponible : on garde la valeur par défaut.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Nettoie le timer de transition au démontage.
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Musique de fond : volume fixé une fois au montage.
  useEffect(() => {
    if (bgMusicRef.current) bgMusicRef.current.volume = 0.35;
  }, []);

  // Joue/coupe l'audio actuellement chargé selon isMusicOn() ; ne fait rien
  // tant que l'utilisateur n'a pas encore interagi avec la page (politique
  // autoplay des navigateurs). Ne change jamais la piste elle-même.
  const tryPlayCurrentMusic = () => {
    const audio = bgMusicRef.current;
    if (!audio || !hasInteractedRef.current) return;
    if (isMusicOn()) {
      audio.muted = false;
      if (audio.paused) audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  // Charge la piste `index` de la playlist normale (pas de loop : onEnded
  // enchaîne la suivante) et tente de la jouer.
  const startPlaylistTrack = (index: number) => {
    const audio = bgMusicRef.current;
    if (!audio) return;
    const normalized =
      ((index % MUSIC_TRACKS.length) + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    musicTrackIndexRef.current = normalized;
    inFeticheMusicRef.current = false;
    audio.loop = false;
    audio.src = MUSIC_TRACKS[normalized];
    tryPlayCurrentMusic();
  };

  // Bascule sur la piste fétiche (obstacles), en boucle sur elle-même.
  const startFeticheMusic = () => {
    const audio = bgMusicRef.current;
    if (!audio) return;
    inFeticheMusicRef.current = true;
    audio.loop = true;
    audio.src = FETICHE_TRACK;
    tryPlayCurrentMusic();
  };

  // À la sortie d'un niveau à fétiches (victoire/échec/retour carte) :
  // reprend la playlist normale là où l'index en était.
  const resumePlaylistIfNeeded = () => {
    if (inFeticheMusicRef.current) startPlaylistTrack(musicTrackIndexRef.current);
  };

  // Playlist normale : à la fin d'une piste, enchaîne la suivante (boucle sur
  // les 4 pistes, pas sur un seul fichier). Ne se déclenche jamais pour la
  // piste fétiche (loop=true empêche l'événement 'ended' de se produire).
  const handleMusicEnded = () => {
    startPlaylistTrack(musicTrackIndexRef.current + 1);
  };

  // Bruit de moteur du bus pendant la scène de transition entre villes :
  // effet sonore (isSoundOn()), pas de musique de fond, élément <audio> dédié.
  const startBusEngineSound = () => {
    const audio = busEngineRef.current;
    if (!audio || !hasInteractedRef.current || !isSoundOn()) return;
    audio.muted = false;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const stopBusEngineSound = () => {
    const audio = busEngineRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  };

  // Démarre la musique au tout premier clic/tap n'importe où dans l'app
  // (contournement de la politique autoplay) — listener unique, retiré après
  // son premier déclenchement.
  useEffect(() => {
    const onFirstInteraction = () => {
      hasInteractedRef.current = true;
      tryPlayCurrentMusic();
      window.removeEventListener('click', onFirstInteraction);
      window.removeEventListener('touchstart', onFirstInteraction);
    };
    window.addEventListener('click', onFirstInteraction);
    window.addEventListener('touchstart', onFirstInteraction);
    startPlaylistTrack(0);
    return () => {
      window.removeEventListener('click', onFirstInteraction);
      window.removeEventListener('touchstart', onFirstInteraction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coupe/reprend immédiatement la musique quand la préférence musique change
  // (indépendante des effets sonores : soundOn n'entre pas en jeu ici).
  useEffect(() => {
    tryPlayCurrentMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicOn]);

  // Modale de victoire : confettis + compteur de pièces animé, générés une seule
  // fois à l'ouverture, nettoyés à la fermeture ou au démontage.
  useEffect(() => {
    if (!showVictoryModal) {
      setConfetti([]);
      setCoinsCountUp(0);
      return;
    }
    const colors = ['#e0472b', '#ffb627', '#2ca9d1', '#5aa84f', '#b8622b'];
    const pieces = Array.from({ length: 20 + Math.floor(Math.random() * 6) }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 300,
      duration: 1800 + Math.random() * 400,
      drift: (Math.random() - 0.5) * 40,
    }));
    setConfetti(pieces);
    const confettiClearTimer = window.setTimeout(() => setConfetti([]), 2600);

    setCoinsCountUp(0);
    let countUpRaf = 0;
    const countUpStartTimer = window.setTimeout(() => {
      const total = lastCoinsEarned;
      const start = performance.now();
      const durationMs = 600;
      const step = (nowMs: number) => {
        const t = Math.min(1, (nowMs - start) / durationMs);
        setCoinsCountUp(Math.round(total * t));
        if (t < 1) countUpRaf = requestAnimationFrame(step);
      };
      countUpRaf = requestAnimationFrame(step);
    }, 900);

    return () => {
      window.clearTimeout(confettiClearTimer);
      window.clearTimeout(countUpStartTimer);
      cancelAnimationFrame(countUpRaf);
    };
  }, [showVictoryModal, lastCoinsEarned]);

  const formatRemaining = (ms: number) => {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const applyRecharge = () => {
    const nowMs = Date.now();
    let l = livesRef.current;
    const before = l;
    let next = nextLifeAtRef.current;
    if (l >= 5) {
      if (next !== null) {
        nextLifeAtRef.current = null;
        setNextLifeAt(null);
        if (user) saveLives(user.uid, { lives: l, nextLifeAt: null }).catch(() => {});
      }
      return;
    }
    if (next === null || next > nowMs) return;
    let t = next;
    while (l < 5 && t <= nowMs) {
      l += 1;
      t += REFILL_MS;
    }
    // Une seule lecture même si la boucle de rattrapage a ajouté plusieurs vies d'un coup.
    if (l > before) playSound('vie-gagnee.mp3');
    const newNext = l >= 5 ? null : t;
    livesRef.current = l;
    nextLifeAtRef.current = newNext;
    setLives(l);
    setNextLifeAt(newNext);
    if (user) saveLives(user.uid, { lives: l, nextLifeAt: newNext }).catch(() => {});
  };

  const consumeLife = () => {
    if (livesRef.current > 0) playSound('vie-perdue.mp3');
    const wasFull = livesRef.current >= 5;
    const newLives = Math.max(0, livesRef.current - 1);
    let next = nextLifeAtRef.current;
    if (wasFull) next = Date.now() + REFILL_MS;
    livesRef.current = newLives;
    nextLifeAtRef.current = next;
    setLives(newLives);
    setNextLifeAt(next);
    if (user) saveLives(user.uid, { lives: newLives, nextLifeAt: next }).catch(() => {});
  };

  const addLife = () => {
    playSound('vie-gagnee.mp3');
    const newLives = Math.min(5, livesRef.current + 1);
    const next = newLives >= 5 ? null : nextLifeAtRef.current;
    livesRef.current = newLives;
    nextLifeAtRef.current = next;
    setLives(newLives);
    setNextLifeAt(next);
    if (user) saveLives(user.uid, { lives: newLives, nextLifeAt: next }).catch(() => {});
    setShowNoLives(false);
  };

  const retryLevel = () => {
    playSound('clic.mp3');
    if (livesRef.current <= 0) {
      setShowNoLives(true);
      return;
    }
    consumeLife();
    startLevel(currentLevel);
  };

  const commitNext = () => {
    const next = pendingNextRef.current;
    if (next <= 0) return;
    setMapUnlocked((m) => Math.max(m, next));
    startLevel(next);
  };

  const finishWalker = () => {
    setWalker(null);
    commitNext();
  };

  // Recharge les vies toutes les 15 s tant que l'app est ouverte.
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => applyRecharge(), 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Tick 1 s pour le compte à rebours des vies.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Animation du marcheur le long de la route (même ville).
  useEffect(() => {
    if (!walker) return;
    const pathEl = routePathRefs.current[walker.cityIndex];
    const iconEl = walkerIconRef.current;
    const finish = () => finishWalker();
    if (!pathEl || !iconEl) {
      finish();
      return;
    }
    const route = cityRoute(walker.cityIndex);
    const total = pathEl.getTotalLength();
    const fromPct = percentAtNode(
      pathEl,
      route.nodeXs[walker.from],
      route.nodeYs[walker.from],
      total
    );
    const toPct = percentAtNode(pathEl, route.nodeXs[walker.to], route.nodeYs[walker.to], total);

    if (route.isPercent) {
      // Villes à fond peint : on suit le guide invisible via getPointAtLength
      // (coordonnées 0-100 = % du conteneur). CSS offset-path ne peut pas se
      // superposer à un path en viewBox 0 0 100 100, donc on anime left/top.
      const duration = 900;
      const start = performance.now();
      let raf = 0;
      const easeInOut = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const step = (nowMs: number) => {
        const t = Math.min(1, (nowMs - start) / duration);
        const dist =
          (fromPct / 100) * total + ((toPct - fromPct) / 100) * total * easeInOut(t);
        const pt = pathEl.getPointAtLength(dist);
        iconEl.style.left = `${pt.x}%`;
        iconEl.style.top = `${pt.y}%`;
        if (t < 1) raf = requestAnimationFrame(step);
        else finish();
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }

    // Autres villes : offset-path classique.
    const anim = iconEl.animate(
      [{ offsetDistance: `${fromPct}%` }, { offsetDistance: `${toPct}%` }],
      { duration: 900, easing: 'ease-in-out', fill: 'forwards' }
    );
    anim.onfinish = finish;
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walker]);

  // Animation du bus + fumée sur la scène de transition entre villes.
  useEffect(() => {
    if (transitionLevel === null) return;
    const pathEl = transitionPathRef.current;
    const busEl = transitionBusRef.current;
    const smokeLayer = transitionSmokeLayerRef.current;
    if (!pathEl || !busEl) return;

    const total = pathEl.getTotalLength();
    const duration = 11500; // ~11-12 s : le trajet doit être visible, pas un survol.
    const backwardOffset = total * 0.04;
    const start = performance.now();
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    let raf = 0;
    const step = (nowMs: number) => {
      const t = Math.min(1, (nowMs - start) / duration);
      const eased = easeInOut(t);
      const pt = pathEl.getPointAtLength(eased * total);
      const scale = 1 - 0.55 * eased; // 1.0 (départ) -> 0.45 (arrivée, effet de perspective)
      busEl.style.left = `${pt.x}%`;
      busEl.style.top = `${pt.y}%`;
      busEl.style.transform = `translate(-50%, -50%) scale(${scale})`;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // Fumée : un rond toutes les ~220ms, légèrement en arrière du bus sur le tracé.
    const smokeTimers: number[] = [];
    const smokeInterval = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      if (t >= 1 || !smokeLayer) return;
      const dist = easeInOut(t) * total;
      const pt = pathEl.getPointAtLength(Math.max(0, dist - backwardOffset));
      const size = 8 + Math.random() * 6;
      const smoke = document.createElement('span');
      smoke.className = styles.transitionSmoke;
      smoke.style.width = `${size}px`;
      smoke.style.height = `${size}px`;
      smoke.style.marginLeft = `${-size / 2}px`;
      smoke.style.marginTop = `${-size / 2}px`;
      smoke.style.left = `${pt.x}%`;
      smoke.style.top = `${pt.y}%`;
      smoke.style.setProperty('--smoke-drift-x', `${(Math.random() - 0.5) * 10}px`);
      smoke.style.setProperty('--smoke-drift-y', `${-4 - Math.random() * 6}px`);
      smokeLayer.appendChild(smoke);
      smokeTimers.push(window.setTimeout(() => smoke.remove(), 700));
    }, 220);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(smokeInterval);
      smokeTimers.forEach((id) => window.clearTimeout(id));
      if (smokeLayer) smokeLayer.innerHTML = '';
    };
  }, [transitionLevel]);

  const continueWithMoves = (extra: number) => {
    movesRef.current += extra;
    setMoves(movesRef.current);
    setShowFailureModal(false);
  };

  // Dépense `amount` pièces si le solde le permet ; persiste le nouveau total.
  const spendCoins = (amount: number): boolean => {
    if (coins < amount) return false;
    const next = coins - amount;
    setCoins(next);
    if (user) saveCoins(user.uid, next).catch(() => {});
    return true;
  };

  // Achat boutique d'un booster ou d'une vie contre des pièces.
  const buyBoosterItem = (item: BoosterShopItem) => {
    if (!spendCoins(item.cost)) return;
    if (item.id === 'life') {
      addLife();
      return;
    }
    if (item.id === 'bomb') {
      bombCountRef.current += 1;
      setBombCount(bombCountRef.current);
    } else if (item.id === 'hammer') {
      hammerCountRef.current += 1;
      setHammerCount(hammerCountRef.current);
    } else if (item.id === 'bolt') {
      boltCountRef.current += 1;
      setBoltCount(boltCountRef.current);
    } else if (item.id === 'shuffle') {
      shuffleCountRef.current += 1;
      setShuffleCount(shuffleCountRef.current);
    }
    persistBoosters();
  };

  // Bouton "Payer" de la modale d'échec : dépense de vraies pièces au lieu
  // d'accorder la récompense gratuitement. Solde insuffisant -> direction boutique.
  const paidContinueWithMoves = (extra: number) => {
    if (spendCoins(MOVES_COST_COINS)) {
      continueWithMoves(extra);
    } else {
      setShowFailureModal(false);
      setViewMode('shop');
    }
  };

  // Bouton "Payer" de la modale "plus de vies" : même principe.
  const paidAddLife = () => {
    if (spendCoins(LIFE_COST_COINS)) {
      addLife();
    } else {
      setShowNoLives(false);
      setViewMode('shop');
    }
  };

  const goToLevel = (level: number) => {
    playSound('clic.mp3');
    if (level === levelRef.current && gridRef.current.length > 0) {
      setViewMode('play');
      return;
    }
    if (livesRef.current <= 0) {
      setShowNoLives(true);
      return;
    }
    consumeLife();
    startLevel(level);
    setViewMode('play');
  };

  const goNextLevel = () => {
    playSound('clic.mp3');
    if (currentLevel >= LEVELS) {
      // Dernier niveau du jeu (96) : pas de niveau suivant, pas d'animation à
      // déclencher (sinon walker.to viserait l'index 12 d'un tableau de 12
      // nœuds, 0-11). On reste simplement sur la modale de victoire.
      return;
    }
    const next = Math.min(LEVELS, currentLevel + 1);
    setShowVictoryModal(false);
    pendingNextRef.current = next;

    if (next === 12 && cityForLevel(currentLevel) === 0) {
      // Scène d'intro dramatique avant le boss d'Abidjan : remplace la
      // transition normale, bloque commitNext() jusqu'au clic "Commencer".
      if (!inFeticheMusicRef.current) startFeticheMusic();
      setShowBossIntro(true);
      return;
    }

    const nextCity = cityForLevel(next);
    const currentCity = cityForLevel(currentLevel);
    if (nextCity === currentCity) {
      // Même ville : marcheur 🚶🏾 le long de la route SVG réelle.
      const pos = posInCityFor(currentLevel);
      playSound('transition-pas.mp3');
      setWalker({ cityIndex: currentCity, from: pos - 1, to: pos });
      setViewMode('map');
    } else {
      // Changement de ville : carte de transition bus.
      setTransitionLevel(next);
      startBusEngineSound();
      transitionTimerRef.current = window.setTimeout(() => {
        stopBusEngineSound();
        setTransitionLevel(null);
        commitNext();
      }, 15000);
    }
  };

  const startBossIntroLevel = () => {
    playSound('clic.mp3');
    setShowBossIntro(false);
    commitNext();
  };

  // Scène d'intro du boss : affiche le bouton "Commencer" après l'animation
  // d'entrée de la statue (~2.5s), et programme des éclairs à intervalle
  // aléatoire (1.5-3s) tant que la scène est affichée.
  useEffect(() => {
    if (!showBossIntro) {
      setBossBtnVisible(false);
      setBossLightning(null);
      return;
    }
    const btnTimer = window.setTimeout(() => setBossBtnVisible(true), 2500);

    let lightningTimer = 0;
    let flashOffTimer = 0;
    const scheduleLightning = () => {
      const delay = 1500 + Math.random() * 1500;
      lightningTimer = window.setTimeout(() => {
        setBossLightning({ id: Date.now(), x: 10 + Math.random() * 80 });
        flashOffTimer = window.setTimeout(() => setBossLightning(null), 200);
        scheduleLightning();
      }, delay);
    };
    scheduleLightning();

    return () => {
      window.clearTimeout(btnTimer);
      window.clearTimeout(lightningTimer);
      window.clearTimeout(flashOffTimer);
    };
  }, [showBossIntro]);

  const skipTransition = () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    stopBusEngineSound();
    setTransitionLevel(null);
    commitNext();
  };

  const claimDailyBonus = () => {
    playSound('piece.mp3');
    bombCountRef.current += 1;
    setBombCount(bombCountRef.current);
    persistBoosters();
    localStorage.setItem(DAILY_BONUS_KEY, todayStr());
    setShowDailyBonus(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      // Déconnexion best-effort : on redirige de toute façon.
    }
    router.replace('/connexion');
  };

  const resetShopFlow = () => {
    setSelectedPack(null);
    setPaymentReference('');
    setPaymentSubmitted(false);
    setPaymentError('');
  };

  const submitPaymentRequest = async () => {
    if (!user || !selectedPack || !paymentReference.trim() || paymentSubmitting) return;
    setPaymentSubmitting(true);
    setPaymentError('');
    try {
      await addDoc(collection(db, 'paymentRequests'), {
        uid: user.uid,
        pseudo: pseudo || 'Joueur',
        phone: phoneFromUser(user),
        pack: selectedPack.id,
        coinsAmount: selectedPack.coins,
        priceFcfa: selectedPack.priceFcfa,
        method: paymentMethod,
        reference: paymentReference.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setPaymentSubmitted(true);
    } catch {
      setPaymentError("Impossible d'envoyer la demande. Réessaie.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const posInCity = posInCityFor(currentLevel);
  const levelType = levelTypeFor(posInCity);
  const collectTarget = collectTargetFor(posInCity);
  const isCollecte = levelType === 'collecte';
  const paletteIndex = cityForLevel(currentLevel);
  const activeCount = activeTypeCountFor(posInCity);
  const types = typesArr(paletteIndex).slice(0, activeCount);
  const gridCols = gridView[0]?.length ?? 6;
  const levelObstacleSpec = obstacleSpecFor(posInCity);
  const obstaclesLeftCount = obstacleView.reduce(
    (acc, row) => acc + row.filter((v) => v !== null).length,
    0
  );
  const objectiveTarget = objectiveTargetFor(posInCity);
  const objectiveIngredients = objectiveIngredientsFor(paletteIndex, posInCity);
  const objectiveWasReached = isCollecte
    ? collectCount >= collectTarget
    : score >= targetForLevel(currentLevel);
  const totalStars = Object.values(levelStars).reduce((acc, n) => acc + n, 0);

  return (
    <div className={styles.phoneScreen}>
      <audio ref={bgMusicRef} muted onEnded={handleMusicEnded} style={{ display: 'none' }} />
      <audio
        ref={busEngineRef}
        src="/sounds/bus-moteur.mp3"
        loop
        muted
        style={{ display: 'none' }}
      />
      <div className={styles.livesBar}>
        <div className={styles.livesInfo}>
          <span className={styles.livesHearts}>❤️ {lives}/5</span>
          {lives < 5 && nextLifeAt !== null && (
            <span className={styles.livesCountdown}>
              Prochaine vie : {formatRemaining(nextLifeAt - now)}
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setViewMode('profile')}
          aria-label="Profil"
        >
          ☰
        </button>
      </div>
      {viewMode === 'map' && (
        <div className={styles.shopFabWrap}>
          <button
            type="button"
            className={styles.shopFab}
            onClick={() => setViewMode('shop')}
            aria-label="Boutique"
          >
            <img src="/maps/panier-icone.png" alt="" className={styles.shopFabImg} />
          </button>
          <span className={styles.shopFabCoins}>🪙 {coins}</span>
        </div>
      )}
      {viewMode === 'profile' ? (
        <div className={styles.profileScreen}>
          <div className={styles.topBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setViewMode('map')}
            >
              ← Carte
            </button>
            <div className={styles.cityLabel}>Profil</div>
            <div style={{ width: 34 }} />
          </div>

          <div className={styles.profileBody}>
            <div className={styles.modalCard}>
              {avatarId && (
                <img
                  src={`/avatars/${avatarId}.png`}
                  alt=""
                  className={styles.profileAvatarLarge}
                />
              )}
              <div className={styles.modalTitle}>{pseudo || 'Joueur'}</div>
              <div className={styles.profilePhoneSecondary}>
                📱 {user ? `+${phoneFromUser(user)}` : 'Non connecté'}
              </div>
            </div>

            <div className={styles.modalCard}>
              <div className={styles.scoreRow} style={{ padding: 0 }}>
                <div className={styles.pillStat}>
                  <div className={styles.pillLabel}>Niveau atteint</div>
                  <div className={styles.pillVal}>{highestUnlocked}</div>
                </div>
                <div className={styles.pillStat}>
                  <div className={styles.pillLabel}>Étoiles</div>
                  <div className={styles.pillVal}>⭐ {totalStars}</div>
                </div>
                <div className={styles.pillStat}>
                  <div className={styles.pillLabel}>Pièces</div>
                  <div className={styles.pillVal}>🪙 {coins}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className={`${styles.modalBtn} ${styles.pay}`}
              onClick={() => {
                resetShopFlow();
                setViewMode('shop');
              }}
            >
              🪙 Acheter des pièces
            </button>

            <a
              href="https://wa.me/225554233234"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.modalBtn} ${styles.ad}`}
              style={{ textDecoration: 'none', textAlign: 'center' }}
            >
              💬 Contacter le support WhatsApp
            </a>

            <div className={styles.profileBtnRow}>
              <button
                type="button"
                className={`${styles.modalBtn} ${styles.ghost}`}
                onClick={toggleSoundPref}
                style={{ marginBottom: 0 }}
              >
                {soundOn ? '🔊 Effets' : '🔇 Effets'}
              </button>
              <button
                type="button"
                className={`${styles.modalBtn} ${styles.ghost}`}
                onClick={toggleMusicPref}
                style={{ marginBottom: 0 }}
              >
                {musicOn ? '🎵 Musique' : '🔇 Musique'}
              </button>
            </div>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.ghost}`}
              onClick={handleSignOut}
            >
              Déconnexion
            </button>
          </div>
        </div>
      ) : viewMode === 'shop' ? (
        <div className={styles.profileScreen}>
          <div className={styles.topBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => {
                resetShopFlow();
                setViewMode('map');
              }}
            >
              ← Carte
            </button>
            <div className={styles.cityLabel}>Boutique</div>
            <div style={{ width: 34 }} />
          </div>

          <div className={styles.shopCoinsBanner}>🪙 {coins}</div>

          <div className={styles.profileBody}>
            {!selectedPack ? (
              <>
                <div className={styles.shopPackGrid}>
                  {COIN_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      className={styles.shopPackCard}
                      onClick={() => setSelectedPack(pack)}
                    >
                      <div className={styles.shopPackLabel}>{pack.label}</div>
                      <div className={styles.shopPackCoins}>🪙 {pack.coins}</div>
                      <div className={styles.shopPackPrice}>{pack.priceFcfa} FCFA</div>
                    </button>
                  ))}
                </div>

                <div className={styles.shopSectionTitle}>Boosters &amp; Vies</div>
                <div className={styles.shopBoosterGrid}>
                  {BOOSTER_SHOP_ITEMS.map((item) => (
                    <div key={item.id} className={styles.shopBoosterCard}>
                      <span className={styles.shopBoosterEmoji}>{item.emoji}</span>
                      <span className={styles.shopBoosterLabel}>{item.label}</span>
                      <button
                        type="button"
                        className={`${styles.modalBtn} ${styles.pay}`}
                        style={{ marginBottom: 0 }}
                        disabled={coins < item.cost}
                        onClick={() => buyBoosterItem(item)}
                      >
                        Acheter · {item.cost} 🪙
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : paymentSubmitted ? (
              <div className={styles.modalCard}>
                <div className={styles.modalTitle}>Demande envoyée ✅</div>
                <div className={styles.modalBody} style={{ textAlign: 'center' }}>
                  En attente de validation par un administrateur. Tes pièces
                  seront créditées dès confirmation du paiement.
                </div>
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.pay}`}
                  onClick={resetShopFlow}
                >
                  Retour à la boutique
                </button>
              </div>
            ) : (
              <div className={styles.modalCard}>
                <div className={styles.modalTitle}>
                  {selectedPack.label} — {selectedPack.coins} 🪙
                </div>
                <div className={styles.modalBody}>
                  Envoie {selectedPack.priceFcfa} FCFA au numéro Wave{' '}
                  <strong>{WAVE_NUMBER}</strong> ou Orange Money{' '}
                  <strong>{OM_NUMBER}</strong>, puis colle l&apos;ID de
                  transaction ci-dessous.
                </div>
                <div className={styles.shopMethodRow}>
                  <button
                    type="button"
                    className={`${styles.shopMethodBtn} ${
                      paymentMethod === 'wave' ? styles.shopMethodBtnActive : ''
                    }`}
                    onClick={() => setPaymentMethod('wave')}
                  >
                    Wave
                  </button>
                  <button
                    type="button"
                    className={`${styles.shopMethodBtn} ${
                      paymentMethod === 'om' ? styles.shopMethodBtnActive : ''
                    }`}
                    onClick={() => setPaymentMethod('om')}
                  >
                    Orange Money
                  </button>
                </div>
                <input
                  className={styles.shopInput}
                  type="text"
                  placeholder="Référence / ID de transaction"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
                {paymentError && <p className={styles.shopError}>{paymentError}</p>}
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.pay}`}
                  disabled={!paymentReference.trim() || paymentSubmitting}
                  onClick={submitPaymentRequest}
                >
                  {paymentSubmitting ? 'Envoi…' : 'Envoyer la demande'}
                </button>
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.ghost}`}
                  onClick={() => setSelectedPack(null)}
                >
                  ← Choisir un autre pack
                </button>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <div className={styles.travelMap}>
          {PALETTES.map((city, ci) => {
            const cityStart = ci * LEVELS_PER_CITY + 1;
            const route = cityRoute(ci);
            const hasBg = CITY_BACKGROUNDS[ci] !== null;
            const nodePts = CITY_NODE_PERCENTS[ci];
            const prevHasBg = ci > 0 && CITY_BACKGROUNDS[ci - 1] !== null;
            return (
              <Fragment key={city.city}>
                {prevHasBg && hasBg && (
                  <img
                    src="/maps/nuage-voile.png?v=6"
                    alt=""
                    className={styles.mapCloudVeil}
                  />
                )}
                <div className={styles.mapCitySection}>
                {!hasBg && <div className={styles.mapCityBanner}>{city.city}</div>}
                <div className={hasBg ? styles.mapRoutePercent : styles.mapRoute}>
                  {hasBg ? (
                    <>
                      <img
                        src={CITY_BACKGROUNDS[ci]!}
                        alt={city.city}
                        className={styles.mapRouteBg}
                      />
                      <svg viewBox="0 0 100 100" className={styles.mapGuideSvg}>
                        <path
                          ref={(el) => {
                            routePathRefs.current[ci] = el;
                          }}
                          d={route.pathD}
                          className={styles.mapGuidePath}
                        />
                      </svg>
                    </>
                  ) : (
                    <svg className={styles.mapRouteSvg} viewBox="0 0 260 960">
                      <path
                        ref={(el) => {
                          routePathRefs.current[ci] = el;
                        }}
                        d={route.pathD}
                        className={styles.mapRouteSolid}
                      />
                      <path d={route.pathD} className={styles.mapRouteDashed} />
                    </svg>
                  )}
                  <div className={styles.mapNodeLayer}>
                    {Array.from({ length: LEVELS_PER_CITY }, (_, j) => {
                      const level = cityStart + j;
                      const isActive = level === mapUnlocked;
                      const isLocked = level > mapUnlocked;
                      const left = nodePts ? `${nodePts[j].x}%` : routeXs[j];
                      const top = nodePts ? `${nodePts[j].y}%` : routeYs[j];
                      return (
                        <div
                          key={level}
                          className={styles.mapNodeWrap}
                          style={{ left, top }}
                        >
                          <button
                            type="button"
                            disabled={isLocked}
                            className={`${styles.mapNode} ${
                              isActive ? styles.mapNodeActive : ''
                            } ${isLocked ? styles.mapNodeLocked : ''}`}
                            onClick={() => goToLevel(level)}
                          >
                            <span className={styles.mapNodeNum}>{level}</span>
                            {isLocked && <span className={styles.mapNodeLock}>🔒</span>}
                            {levelStars[level] !== undefined && (
                              <span className={styles.mapNodeStarsBadge}>
                                {([1, 2, 3] as const).map((n) => (
                                  <span
                                    key={n}
                                    className={`${styles.mapNodeStarMini} ${
                                      levelStars[level]! >= n ? styles.mapNodeStarMiniFilled : ''
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </span>
                            )}
                          </button>
                          {isActive && (
                            <span className={styles.mapActiveLabel}>Toi es ici</span>
                          )}
                        </div>
                      );
                    })}
                    {walker !== null && walker.cityIndex === ci && (
                      <span
                        ref={walkerIconRef}
                        className={styles.walkerIcon}
                        style={
                          route.isPercent
                            ? undefined
                            : { ['--route-path' as any]: `path("${route.pathD}")` }
                        }
                      >
                        🚶🏾
                      </span>
                    )}
                  </div>
                </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      ) : (
        <>
          <div className={styles.topBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => {
                resumePlaylistIfNeeded();
                setViewMode('map');
              }}
            >
              ← Carte
            </button>
            <div className={styles.cityLabel}>
              Niveau {currentLevel} · {PALETTES[paletteIndex].city} · {LEVEL_TYPE_LABEL[levelType]}
            </div>
            <div className={styles.avatarBadge}>
              {avatarId ? (
                <img src={`/avatars/${avatarId}.png`} alt="" className={styles.avatarImg} />
              ) : (
                <>
                  <div className={styles.hair} />
                  <div className={styles.face} />
                </>
              )}
            </div>
          </div>

          <div className={styles.scoreRow}>
        <div className={styles.pillStat}>
          <div className={styles.pillLabel}>Score</div>
          <div className={styles.pillVal}>{score}</div>
        </div>
        <div className={styles.pillStat}>
          <div className={styles.pillLabel}>Objectif</div>
          <div className={styles.pillVal}>
            {isCollecte
              ? `${types[0].emoji} ${collectCount}/${collectTarget}`
              : targetForLevel(currentLevel)}
          </div>
        </div>
        <div className={styles.pillStat}>
          <div className={styles.pillLabel}>Coups</div>
          <div className={styles.pillVal}>{moves}</div>
        </div>
        <div className={styles.pillStat}>
          <div className={styles.pillLabel}>Pièces</div>
          <div className={styles.pillVal}>🪙 {coins}</div>
        </div>
        {levelObstacleSpec && (
          <div className={styles.pillStat}>
            <div className={styles.pillLabel}>Fétiches</div>
            <div className={styles.pillVal}>🗿 × {obstaclesLeftCount}</div>
          </div>
        )}
      </div>

      <div className={styles.bonusObjectiveRow}>
        {objectiveIngredients.map((ing, i) => (
          <div key={ing.name} className={styles.bonusObjectiveBadge}>
            <span>{ing.emoji}</span>
            <span>
              {Math.min(tileClearCounts[i] ?? 0, objectiveTarget)}/{objectiveTarget}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.boosterRow}>
        <button
          type="button"
          className={`${styles.boosterBtn} ${bombCount <= 0 ? styles.disabled : ''}`}
          onClick={activateBomb}
        >
          💣 Bombe ({bombCount})
        </button>
        <button
          type="button"
          className={`${styles.boosterBtn} ${hammerCount <= 0 ? styles.disabled : ''}`}
          onClick={activateHammer}
        >
          🔨 Marteau ({hammerCount})
        </button>
        <button
          type="button"
          className={`${styles.boosterBtn} ${boltCount <= 0 ? styles.disabled : ''}`}
          onClick={activateBolt}
        >
          ⚡ Éclair ({boltCount})
        </button>
        <button
          type="button"
          className={`${styles.boosterBtn} ${shuffleCount <= 0 ? styles.disabled : ''}`}
          onClick={triggerShuffle}
        >
          🔀 Mélange ({shuffleCount})
        </button>
        <button
          type="button"
          className={styles.boosterLocked}
          onClick={() => setViewMode('shop')}
        >
          🧺 Boutique
        </button>
      </div>

      <div className={styles.statusLine}>{statusText}</div>

      <div className={styles.boardWrapper}>
      <div className={styles.board} style={{ ['--cols' as any]: gridCols }}>
        {gridView.map((row, r) =>
          row.map((val, c) => {
            const isSelected = selected !== null && selected.r === r && selected.c === c;
            const t = val !== null ? types[val] : null;
            const obstacleHits = obstacleView[r]?.[c] ?? null;
            const maxHits = levelObstacleSpec?.hits ?? 1;
            const cellFx = boostFx.filter((f) => f.r === r && f.c === c && f.kind !== 'bolt');
            const cellShards = shardTiles.filter((s) => s.r === r && s.c === c);
            const cellFlashes = flashCells.filter((f) => f.r === r && f.c === c);
            const isFlinching = flinchTiles.some((f) => f.r === r && f.c === c);
            const isSwapArc = swapArcTiles.some((s) => s.r === r && s.c === c);
            const matchPop = matchPopTiles.find((p) => p.r === r && p.c === c);
            const matchPopClass = matchPop
              ? matchPop.combo
                ? styles.tileMatchPopCombo
                : styles.tileMatchPop
              : '';
            return (
              <div
                key={`${r}-${c}`}
                className={`${styles.tile} ${isSelected ? styles.tileSelected : ''} ${
                  isFlinching ? styles.tileFlinch : ''
                } ${isSwapArc ? styles.tileSwapArc : ''} ${matchPopClass}`}
                style={
                  t ? { background: `radial-gradient(circle at 35% 30%, #ffffff, ${t.bg})` } : undefined
                }
                onClick={() => onTileClick(r, c)}
              >
                {t?.emoji}
                {obstacleHits !== null && (
                  <span
                    className={styles.obstacleIcon}
                    style={{ opacity: 0.35 + 0.65 * (obstacleHits / maxHits) }}
                  >
                    🗿
                  </span>
                )}
                {cellFx.map((fx) =>
                  fx.kind === 'bomb' ? (
                    <span key={fx.id} className={styles.bombFx}>
                      <span className={styles.bombShock} />
                    </span>
                  ) : (
                    <span key={fx.id} className={styles.hammerFx}>
                      <span className={styles.hammerIcon}>🔨</span>
                    </span>
                  )
                )}
                {cellFlashes.map((fx) => (
                  <span
                    key={fx.id}
                    className={styles.boostFlash}
                    style={{ ['--flash-color' as any]: fx.color }}
                  />
                ))}
                {cellShards.map((s) => (
                  <span key={s.id} className={styles.tileShardBurst}>
                    {s.shards.map((sh, i) => (
                      <span
                        key={i}
                        className={styles.tileShard}
                        style={{
                          ['--sangle' as any]: `${sh.angle}deg`,
                          ['--srotate' as any]: `${sh.rotate}deg`,
                          ['--sscale' as any]: sh.scale,
                        }}
                      >
                        {s.emoji}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            );
          })
        )}
        {boostFx
          .filter((f) => f.kind === 'bolt')
          .map((fx) => {
            const rows = gridView.length;
            const cols = gridView[0]?.length ?? 6;
            return (
              <svg
                key={fx.id}
                viewBox={`0 0 ${cols} ${rows}`}
                preserveAspectRatio="none"
                className={styles.boltFx}
              >
                <path d={buildZigzag(cols, fx.r + 0.5, true)} className={styles.boltPath} />
                <path d={buildZigzag(rows, fx.c + 0.5, false)} className={styles.boltPath} />
              </svg>
            );
          })}
        {floatingScores.map((fx) => {
          const rows = gridView.length;
          const cols = gridView[0]?.length ?? 6;
          return (
            <span
              key={fx.id}
              className={`${styles.floatingScore} ${fx.combo ? styles.floatingScoreCombo : ''}`}
              style={{
                left: `${((fx.c + 0.5) / cols) * 100}%`,
                top: `${((fx.r + 0.5) / rows) * 100}%`,
              }}
            >
              +{fx.points}
            </span>
          );
        })}
      </div>
      </div>

      <div className={styles.legend}>
        {types.map((t) => (
          <div key={t.name}>
            <span>{t.emoji}</span>
            {t.name}
          </div>
        ))}
      </div>
      <div className={styles.legendNote}>
        * repère provisoire — à remplacer par une vraie icône
      </div>

      <button type="button" className={styles.resetBtn} onClick={retryLevel}>
        🔄 Recommencer le niveau
      </button>
        </>
      )}

      {showTutorial && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalTitle}>Comment jouer</div>
            <div className={styles.modalBody}>
              Touche deux ingrédients voisins pour les échanger.
              <br />
              <br />
              Aligne 3 ingrédients identiques ou plus pour les faire disparaître et gagner des
              points.
              <br />
              <br />
              Chaque ville a ses propres ingrédients, liés à ce qu&apos;elle produit vraiment.
              <br />
              <br />
              Réussis un niveau pour la première fois pour gagner des pièces 🪙 !
              Utilise-les dans la boutique (icône panier 🧺 sur la carte) pour
              acheter des boosters ou des vies.
            </div>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.pay}`}
              onClick={() => setShowTutorial(false)}
            >
              C&apos;est parti !
            </button>
          </div>
        </div>
      )}

      {showFailureModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalTitle}>Niveau {currentLevel} échoué 💔</div>
            <div className={styles.modalBody} style={{ textAlign: 'center' }}>
              {objectiveWasReached ? (
                <>Objectif atteint, mais il restait des fétiches 🗿 à casser.</>
              ) : (
                <>
                  Tu n&apos;as pas atteint l&apos;objectif :{' '}
                  <strong>
                    {isCollecte
                      ? `${types[0].emoji} × ${collectTarget} ${types[0].name}`
                      : `${targetForLevel(currentLevel)} points`}
                  </strong>
                </>
              )}
              <br />
              <br />
              {isCollecte ? (
                <>
                  Collecte : <strong>{collectCount}</strong> / {collectTarget}
                </>
              ) : (
                <>
                  Score : <strong>{score}</strong>
                </>
              )}{' '}
              · Coups épuisés.
              {levelObstacleSpec && (
                <>
                  <br />
                  🗿 Fétiches restants : <strong>{obstaclesLeftCount}</strong>
                </>
              )}
            </div>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.ad}`}
              onClick={() => continueWithMoves(5)}
            >
              🎬 Regarder une pub · +5 coups
            </button>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.pay}`}
              onClick={() => paidContinueWithMoves(5)}
            >
              💳 {MOVES_COST_COINS} 🪙 · +5 coups
            </button>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.ghost}`}
              onClick={retryLevel}
            >
              🔄 Réessayer le niveau
            </button>
          </div>
        </div>
      )}

      {showVictoryModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} ${styles.victoryCardEnter}`}>
            <div className={styles.confettiLayer}>
              {confetti.map((cf) => (
                <span
                  key={cf.id}
                  className={styles.confettiPiece}
                  style={{
                    left: `${cf.left}%`,
                    background: cf.color,
                    animationDuration: `${cf.duration}ms`,
                    animationDelay: `${cf.delay}ms`,
                    ['--cf-drift' as any]: `${cf.drift}px`,
                  }}
                />
              ))}
            </div>
            {lastEarnedStars === 3 && (
              <div className={styles.trophyWrap}>
                <TrophyScene />
              </div>
            )}
            <div className={styles.modalTitle}>Niveau {currentLevel} réussi ! 🎉</div>
            <div className={styles.starRow}>
              {([1, 2, 3] as const).map((n) => {
                const filledCount = levelStars[currentLevel] ?? 0;
                const filled = filledCount >= n;
                const delay = filled
                  ? (n - 1) * 150
                  : filledCount * 150 + 200 + (n - filledCount - 1) * 100;
                return (
                  <span
                    key={n}
                    className={`${styles.star} ${filled ? styles.starFilled : ''} ${
                      filled ? styles.starPop : styles.starFade
                    }`}
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    ★
                  </span>
                );
              })}
            </div>
            {lastCoinsEarned > 0 && (
              <div className={styles.coinsEarnedRow}>
                <span className={styles.coinsEarnedIcon}>🪙</span>
                <span>+{coinsCountUp}</span>
              </div>
            )}
            {lastObjectivesComplete && (
              <div className={styles.objectivesCompleteBadge}>
                🎯 Tous les ingrédients récoltés !
              </div>
            )}
            <div className={styles.modalBody} style={{ textAlign: 'center' }}>
              {isCollecte ? (
                <>
                  Collecte : <strong>{collectCount}</strong> / {collectTarget}{' '}
                  {types[0].emoji}
                </>
              ) : (
                <>
                  Objectif atteint : <strong>{score}</strong> /{' '}
                  {targetForLevel(currentLevel)} points.
                </>
              )}
            </div>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.pay}`}
              onClick={goNextLevel}
            >
              Continuer
            </button>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.ghost}`}
              onClick={retryLevel}
            >
              Rejouer
            </button>
          </div>
        </div>
      )}

      {showDailyBonus && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalTitle}>Bonus du jour 🎁</div>
            <div className={styles.modalBody} style={{ textAlign: 'center' }}>
              Reviens chaque jour pour un bonus !
              <br />
              <br />
              +1 💣 Bombe
            </div>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.pay}`}
              onClick={claimDailyBonus}
            >
              Réclamer
            </button>
          </div>
        </div>
      )}

      {showBossIntro && (
        <div className={styles.bossIntro}>
          <div className={styles.bossIntroSky} />
          <div className={styles.bossIntroVeil} />
          <div className={`${styles.bossIntroCloud} ${styles.bossIntroCloud1}`} />
          <div className={`${styles.bossIntroCloud} ${styles.bossIntroCloud2}`} />
          <div className={`${styles.bossIntroCloud} ${styles.bossIntroCloud3}`} />
          <div className={`${styles.bossIntroCloud} ${styles.bossIntroCloud4}`} />
          {bossLightning && (
            <>
              <div key={`flash-${bossLightning.id}`} className={styles.bossFlash} />
              <svg
                key={`bolt-${bossLightning.id}`}
                viewBox="0 0 20 100"
                className={styles.bossBoltSvg}
                style={{ left: `${bossLightning.x}%` }}
              >
                <path d={BOSS_BOLT_D} className={styles.bossBoltPath} />
              </svg>
            </>
          )}
          <div className={styles.bossStatueEnter}>
            <div className={styles.bossStatueSway}>
              <div className={styles.bossStatueBreathe}>
                <div className={styles.bossStatueImgWrap}>
                  <img
                    src="/maps/fetiche-abidjan.png"
                    alt=""
                    className={styles.bossStatueImg}
                  />
                  <span className={styles.bossEye} style={{ left: '41%', top: '23%' }} />
                  <span className={styles.bossEye} style={{ left: '59%', top: '23%' }} />
                </div>
              </div>
            </div>
          </div>
          {bossBtnVisible && (
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.pay} ${styles.bossStartBtn}`}
              onClick={startBossIntroLevel}
            >
              Commencer
            </button>
          )}
        </div>
      )}

      {transitionLevel !== null && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} ${styles.transitionCard}`}>
            <div className={styles.transitionScene}>
              <img src="/maps/transition-fond.png" alt="" className={styles.transitionBg} />
              <svg viewBox="0 0 100 100" className={styles.mapGuideSvg}>
                <path
                  ref={transitionPathRef}
                  d={BUS_TRANSITION_GUIDE_D}
                  className={styles.mapGuidePath}
                />
              </svg>
              <img
                ref={transitionBusRef}
                src="/maps/transition-bus.png"
                alt=""
                className={styles.transitionBusIcon}
              />
              <div className={styles.transitionSmokeLayer} ref={transitionSmokeLayerRef} />
              <button
                type="button"
                className={styles.transitionSkipBtn}
                onClick={skipTransition}
              >
                Passer →
              </button>
              <div className={styles.transitionTextBand}>
                En route vers {PALETTES[cityForLevel(transitionLevel)].city}...
              </div>
            </div>
          </div>
        </div>
      )}

      {showNoLives && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalTitle}>Plus de vies ! 💔</div>
            <div className={styles.modalBody} style={{ textAlign: 'center' }}>
              Prochaine vie dans{' '}
              <strong>{formatRemaining(nextLifeAt !== null ? nextLifeAt - now : 0)}</strong>
            </div>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.ad}`}
              onClick={addLife}
            >
              🎬 Regarder une pub · +1 vie
            </button>
            <button
              type="button"
              className={`${styles.modalBtn} ${styles.pay}`}
              onClick={paidAddLife}
            >
              💳 {LIFE_COST_COINS} 🪙 · +1 vie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
