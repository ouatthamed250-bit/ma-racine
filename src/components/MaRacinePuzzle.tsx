'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './MaRacinePuzzle.module.css';
import { useAuth } from '@/context/AuthContext';
import { ensureUserDoc, loadProgress, saveHighestUnlocked, loadLives, saveLives } from '@/lib/progress';

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

// ---- Fonctions "moteur" pures, hors du composant : ne dépendent que de leurs paramètres ----

const typesArr = (pIdx: number) => PALETTES[pIdx].types;
const randType = (pIdx: number, activeCount: number) =>
  Math.floor(Math.random() * activeCount);

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
const CITY_BACKGROUNDS: (string | null)[] = [
  '/maps/abidjan-route.png',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

const CITY_NODE_PERCENTS: ({ x: number; y: number }[] | null)[] = [
  [
    { x: 44.6, y: 28.11 },
    { x: 53.15, y: 31.43 },
    { x: 42.56, y: 36.69 },
    { x: 49.37, y: 42.21 },
    { x: 56.75, y: 48.83 },
    { x: 37.82, y: 53.59 },
    { x: 47.66, y: 61.49 },
    { x: 64.73, y: 67.78 },
    { x: 51.54, y: 76.12 },
    { x: 39.1, y: 83.82 },
    { x: 45.66, y: 92.86 },
    { x: 62.1, y: 99.94 },
  ],
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

// Tracé invisible (guide de déplacement) pour Abidjan, en coordonnées 0-100
// (correspond au viewBox 0 0 100 100 du <svg> superposé sur l'image).
const ABIDJAN_GUIDE_D =
  'M 44.60,28.11 Q 41.52,29.90 48.01,30.83 Q 54.49,31.76 55.45,32.69 Q 56.40,33.61 53.54,34.54 Q 50.68,35.47 45.25,36.36 Q 39.81,37.26 38.69,38.19 Q 37.57,39.11 39.66,40.04 Q 41.74,40.97 46.96,41.90 Q 52.17,42.82 55.03,43.75 Q 57.88,44.68 59.50,45.57 Q 61.11,46.47 59.74,47.40 Q 58.36,48.33 54.68,49.25 Q 51.00,50.18 46.39,51.11 Q 41.79,52.03 39.60,52.96 Q 37.41,53.89 36.76,54.78 Q 36.11,55.68 36.37,56.61 Q 36.62,57.54 38.58,58.46 Q 40.54,59.39 43.63,60.32 Q 46.71,61.24 50.77,62.17 Q 54.83,63.10 57.10,64.00 Q 59.38,64.89 61.53,65.82 Q 63.68,66.75 64.29,67.67 Q 64.91,68.60 63.99,69.53 Q 63.07,70.45 61.42,71.38 Q 59.78,72.31 58.18,73.21 Q 56.59,74.10 54.36,75.03 Q 52.12,75.96 48.47,76.88 Q 44.82,77.81 42.98,78.74 Q 41.14,79.67 39.85,80.59 Q 38.56,81.52 38.74,82.42 Q 38.92,83.31 38.41,84.24 Q 37.91,85.17 37.89,86.09 Q 37.86,87.02 37.46,87.95 Q 37.07,88.88 38.49,89.80 Q 39.92,90.73 42.34,91.63 Q 44.75,92.52 47.35,93.45 Q 49.95,94.38 52.15,95.31 Q 54.34,96.23 55.81,97.16 Q 57.27,98.09 59.68,99.01 T 62.10,99.94';

// Données de route (tracé + coordonnées des nœuds) pour une ville donnée.
function cityRoute(ci: number): {
  isPercent: boolean;
  pathD: string;
  nodeXs: number[];
  nodeYs: number[];
} {
  if (CITY_NODE_PERCENTS[ci]) {
    const pts = CITY_NODE_PERCENTS[ci]!;
    return {
      isPercent: true,
      pathD: ABIDJAN_GUIDE_D,
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

  // ---- Refs "moteur" (source de vérité synchrone pendant la résolution) ----
  const gridRef = useRef<Cell[][]>([]);
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
  const transitionTimerRef = useRef<number | null>(null);
  const livesRef = useRef(5);
  const nextLifeAtRef = useRef<number | null>(null);
  const routePathRefs = useRef<(SVGPathElement | null)[]>([]);
  const walkerIconRef = useRef<HTMLSpanElement | null>(null);
  const pendingNextRef = useRef(0);

  // ---- Etat d'affichage (déclenche les re-rendus) ----
  const [currentLevel, setCurrentLevel] = useState(1);
  const [highestUnlocked, setHighestUnlocked] = useState(1);
  const [viewMode, setViewMode] = useState<'map' | 'play'>('map');
  const [gridView, setGridView] = useState<Cell[][]>([]);
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
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [transitionLevel, setTransitionLevel] = useState<number | null>(null);
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

  const resolveCascade = async (pIdx: number) => {
    const activeCount = activeTypeCountFor(posInCityFor(levelRef.current));
    let matches = findMatches(gridRef.current);
    let safety = 0;
    while (matches.size > 0 && safety < 6) {
      scoreRef.current += matches.size * 10;
      setScore(scoreRef.current);
      matches.forEach((key) => {
        const [rr, cc] = key.split(',').map(Number);
        if (gridRef.current[rr][cc] === 0) collectRef.current += 1;
        gridRef.current[rr][cc] = null;
      });
      setCollectCount(collectRef.current);
      syncGrid();
      await sleep(150);
      applyGravity(gridRef.current, pIdx, activeCount);
      syncGrid();
      await sleep(150);
      matches = findMatches(gridRef.current);
      safety++;
    }
  };

  const handleVictory = () => {
    setShowVictoryModal(true);
    if (levelRef.current === highestUnlockedRef.current && levelRef.current < LEVELS) {
      highestUnlockedRef.current += 1;
      setHighestUnlocked(highestUnlockedRef.current);
      if (user) {
        saveHighestUnlocked(user.uid, highestUnlockedRef.current).catch(() => {});
      }
    }
  };

  const checkLevelEnd = () => {
    const pos = posInCityFor(levelRef.current);
    const type = levelTypeFor(pos);
    if (type === 'collecte') {
      if (collectRef.current >= collectTargetFor(pos)) handleVictory();
      else if (movesRef.current <= 0) setShowFailureModal(true);
    } else {
      if (scoreRef.current >= targetForLevel(levelRef.current)) handleVictory();
      else if (movesRef.current <= 0) setShowFailureModal(true);
    }
  };

  const swapAndResolve = async (a: Pos, b: Pos, pIdx: number) => {
    busyRef.current = true;
    swapCells(gridRef.current, a, b);
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
    busyRef.current = true;
    const activeCount = activeTypeCountFor(posInCityFor(levelRef.current));
    const g = gridRef.current;
    const rows = g.length;
    const cols = g[0].length;
    let cleared = 0;
    for (let rr = r - 1; rr <= r + 1; rr++) {
      for (let cc = c - 1; cc <= c + 1; cc++) {
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
          if (g[rr][cc] === 0) collectRef.current += 1;
          g[rr][cc] = null;
          cleared++;
        }
      }
    }
    setCollectCount(collectRef.current);
    scoreRef.current += cleared * 10;
    setScore(scoreRef.current);
    syncGrid();
    await sleep(200);
    applyGravity(gridRef.current, pIdx, activeCount);
    syncGrid();
    await sleep(150);
    await resolveCascade(pIdx);
    busyRef.current = false;
    checkLevelEnd();
  };

  const triggerHammer = async (r: number, c: number, pIdx: number) => {
    busyRef.current = true;
    const activeCount = activeTypeCountFor(posInCityFor(levelRef.current));
    const g = gridRef.current;
    let cleared = 0;
    if (g[r][c] !== null) {
      if (g[r][c] === 0) collectRef.current += 1;
      g[r][c] = null;
      cleared = 1;
    }
    setCollectCount(collectRef.current);
    scoreRef.current += cleared * 10;
    setScore(scoreRef.current);
    syncGrid();
    await sleep(200);
    applyGravity(gridRef.current, pIdx, activeCount);
    syncGrid();
    await sleep(150);
    await resolveCascade(pIdx);
    busyRef.current = false;
    checkLevelEnd();
  };

  const triggerBolt = async (r: number, c: number, pIdx: number) => {
    busyRef.current = true;
    const activeCount = activeTypeCountFor(posInCityFor(levelRef.current));
    const g = gridRef.current;
    const rows = g.length;
    const cols = g[0].length;
    let cleared = 0;
    for (let rr = 0; rr < rows; rr++) {
      if (g[rr][c] !== null) {
        if (g[rr][c] === 0) collectRef.current += 1;
        g[rr][c] = null;
        cleared++;
      }
    }
    for (let cc = 0; cc < cols; cc++) {
      if (cc !== c && g[r][cc] !== null) {
        if (g[r][cc] === 0) collectRef.current += 1;
        g[r][cc] = null;
        cleared++;
      }
    }
    setCollectCount(collectRef.current);
    scoreRef.current += cleared * 10;
    setScore(scoreRef.current);
    syncGrid();
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
        await triggerBomb(r, c, pIdx);
      } else if (booster === 'hammer') {
        hammerCountRef.current -= 1;
        setHammerCount(hammerCountRef.current);
        await triggerHammer(r, c, pIdx);
      } else {
        boltCountRef.current -= 1;
        setBoltCount(boltCountRef.current);
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
    shuffleCountRef.current -= 1;
    setShuffleCount(shuffleCountRef.current);
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
    const pIdx = cityForLevel(safeL);
    const activeCount = activeTypeCountFor(pos);
    const size = gridSizeFor(pos);
    const mv = movesForLevel(safeL);
    levelRef.current = safeL;
    setCurrentLevel(safeL);
    paletteRef.current = pIdx;
    movesRef.current = mv;
    bombCountRef.current = 1;
    hammerCountRef.current = 1;
    boltCountRef.current = 1;
    shuffleCountRef.current = 1;
    selectedRef.current = null;
    busyRef.current = false;
    pendingBoosterRef.current = null;
    setMoves(mv);
    setBombCount(1);
    setHammerCount(1);
    setBoltCount(1);
    setShuffleCount(1);
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
        const saved = await loadProgress(user);
        const livesState = await loadLives(user);
        if (!cancelled) {
          highestUnlockedRef.current = saved;
          setHighestUnlocked(saved);
          livesRef.current = livesState.lives;
          nextLifeAtRef.current = livesState.nextLifeAt;
          setLives(livesState.lives);
          setNextLifeAt(livesState.nextLifeAt);
          setMapUnlocked(saved);
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

  const formatRemaining = (ms: number) => {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const applyRecharge = () => {
    const nowMs = Date.now();
    let l = livesRef.current;
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
    const newNext = l >= 5 ? null : t;
    livesRef.current = l;
    nextLifeAtRef.current = newNext;
    setLives(l);
    setNextLifeAt(newNext);
    if (user) saveLives(user.uid, { lives: l, nextLifeAt: newNext }).catch(() => {});
  };

  const consumeLife = () => {
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

  const continueWithMoves = (extra: number) => {
    movesRef.current += extra;
    setMoves(movesRef.current);
    setShowFailureModal(false);
  };

  const goToLevel = (level: number) => {
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
    const next = Math.min(LEVELS, currentLevel + 1);
    setShowVictoryModal(false);
    pendingNextRef.current = next;
    const nextCity = cityForLevel(next);
    const currentCity = cityForLevel(currentLevel);
    if (nextCity === currentCity) {
      // Même ville : marcheur 🚶🏾 le long de la route SVG réelle.
      const pos = posInCityFor(currentLevel);
      setWalker({ cityIndex: currentCity, from: pos - 1, to: pos });
      setViewMode('map');
    } else {
      // Changement de ville : carte de transition bus.
      setTransitionLevel(next);
      transitionTimerRef.current = window.setTimeout(() => {
        setTransitionLevel(null);
        commitNext();
      }, 1200);
    }
  };

  const claimDailyBonus = () => {
    bombCountRef.current += 1;
    setBombCount(bombCountRef.current);
    localStorage.setItem(DAILY_BONUS_KEY, todayStr());
    setShowDailyBonus(false);
  };

  const posInCity = posInCityFor(currentLevel);
  const levelType = levelTypeFor(posInCity);
  const collectTarget = collectTargetFor(posInCity);
  const isCollecte = levelType === 'collecte';
  const paletteIndex = cityForLevel(currentLevel);
  const activeCount = activeTypeCountFor(posInCity);
  const types = typesArr(paletteIndex).slice(0, activeCount);
  const gridCols = gridView[0]?.length ?? 6;

  return (
    <div className={styles.phoneScreen}>
      <div className={styles.livesBar}>
        <span className={styles.livesHearts}>❤️ {lives}/5</span>
        {lives < 5 && nextLifeAt !== null && (
          <span className={styles.livesCountdown}>
            Prochaine vie : {formatRemaining(nextLifeAt - now)}
          </span>
        )}
      </div>
      {viewMode === 'map' ? (
        <div className={styles.travelMap}>
          {PALETTES.map((city, ci) => {
            const cityStart = ci * LEVELS_PER_CITY + 1;
            const route = cityRoute(ci);
            const hasBg = CITY_BACKGROUNDS[ci] !== null;
            const nodePts = CITY_NODE_PERCENTS[ci];
            return (
              <div key={city.city} className={styles.mapCitySection}>
                <div className={styles.mapCityBanner}>{city.city}</div>
                <div className={styles.mapRoute}>
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
                  {Array.from({ length: LEVELS_PER_CITY }, (_, j) => {
                    const level = cityStart + j;
                    const isCompleted = level < mapUnlocked;
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
                          } ${isCompleted ? styles.mapNodeCompleted : ''} ${
                            isLocked ? styles.mapNodeLocked : ''
                          }`}
                          onClick={() => goToLevel(level)}
                        >
                          <span className={styles.mapNodeNum}>{level}</span>
                          {isCompleted && <span className={styles.mapNodeStar}>★</span>}
                          {isLocked && <span className={styles.mapNodeLock}>🔒</span>}
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
            );
          })}
        </div>
      ) : (
        <>
          <div className={styles.topBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setViewMode('map')}
            >
              ← Carte
            </button>
            <div className={styles.cityLabel}>
              Niveau {currentLevel} · {PALETTES[paletteIndex].city} · {LEVEL_TYPE_LABEL[levelType]}
            </div>
            <div className={styles.avatarBadge}>
              <div className={styles.hair} />
              <div className={styles.face} />
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
        <div className={styles.boosterLocked}>🔒 +3 avec 200 🪙</div>
      </div>

      <div className={styles.statusLine}>{statusText}</div>

      <div className={styles.board} style={{ ['--cols' as any]: gridCols }}>
        {gridView.map((row, r) =>
          row.map((val, c) => {
            const isSelected = selected !== null && selected.r === r && selected.c === c;
            const t = val !== null ? types[val] : null;
            return (
              <div
                key={`${r}-${c}`}
                className={`${styles.tile} ${isSelected ? styles.tileSelected : ''}`}
                style={
                  t ? { background: `radial-gradient(circle at 35% 30%, #ffffff, ${t.bg})` } : undefined
                }
                onClick={() => onTileClick(r, c)}
              >
                {t?.emoji}
              </div>
            );
          })
        )}
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
              Tu n&apos;as pas atteint l&apos;objectif :{' '}
              <strong>
                {isCollecte
                  ? `${types[0].emoji} × ${collectTarget} ${types[0].name}`
                  : `${targetForLevel(currentLevel)} points`}
              </strong>
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
              onClick={() => continueWithMoves(5)}
            >
              💳 Payer 100 FCFA · +5 coups
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
          <div className={styles.modalCard}>
            <div className={styles.modalTitle}>Niveau {currentLevel} réussi ! 🎉</div>
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

      {transitionLevel !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.busTransitionBody}>
              <div className={styles.busIcon}>🚌</div>
              <div className={styles.busTransitionText}>
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
              onClick={addLife}
            >
              💳 Payer · +1 vie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
