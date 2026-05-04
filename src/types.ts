export type Vector2 = {
  x: number;
  y: number;
};

export type TowerType = "basic" | "splash" | "slow";

export type TargetingMode = "first" | "strongest" | "closest" | "fastest";

export type EnemyType = "basic" | "fast" | "tank" | "swarm" | "boss";

export type DifficultyId = "easy" | "normal" | "hard";

export type MissionId = "green-pass" | "desert-bend" | "lava-spill" | "ice-tundra" | "island-cove" | "city-grid";

export type MissionThemeId = "forest" | "desert" | "lava" | "ice" | "island" | "city";

export type GameState = "menu" | "playing" | "paused" | "won" | "lost";

export type TowerLevelStats = {
  level: 1 | 2 | 3;
  upgradeCost: number;
  range: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  projectileSpriteKey?: string;
  splashRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
};

export type TowerConfig = {
  label: string;
  color: string;
  placementCost: number;
  renderSize?: number;
  spriteKey?: string;
  projectileSpriteKey?: string;
  levels: TowerLevelStats[];
};

export type SelectedTowerInfo = {
  type: TowerType;
  label: string;
  level: number;
  maxLevel: number;
  damage: number;
  range: number;
  fireRate: number;
  dps: number;
  upgradeCost: number | null;
  sellRefund: number;
  totalInvestedGold: number;
  targetingMode: TargetingMode;
  splashRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
};

export type SpawnRequest = {
  enemyType: EnemyType;
  enemyHealth: number;
  enemySpeed: number;
  enemyReward: number;
  minPathSpacing: number;
};

export type ActiveEnemySpawnState = {
  progress: number;
  radius: number;
};

export type WaveDebugSummary = {
  waveNumber: number;
  label: string;
  totalEnemies: number;
  totalHealth: number;
  goldIncome: number;
  enemyTypes: EnemyType[];
};

export type DebugBalanceInfo = {
  enabled: boolean;
  gameSpeed: number;
  toggles: {
    healthBars: boolean;
    effects: boolean;
    hitboxes: boolean;
    cullingBounds: boolean;
  };
  performance: {
    fps: number;
    enemies: number;
    projectiles: number;
    effects: number;
    towers: number;
    renderedEnemies: number;
    culledEnemies: number;
    renderedProjectiles: number;
    culledProjectiles: number;
    renderedEffects: number;
    culledEffects: number;
  };
  path: {
    totalLength: number;
    hoveredEnemyProgress: number | null;
    hoveredEnemySegment: number | null;
    cameraZoom: number;
    cameraX: number;
    cameraY: number;
  };
  currentMultipliers: {
    health: number;
    speed: number;
    count: number;
    rewards: number;
    spawnInterval: number;
  };
  currentWave: WaveDebugSummary | null;
  towerDps: { label: string; dps: number }[];
};

export type ProjectileImpact = {
  position: Vector2;
  color: string;
  splashRadius?: number;
  appliedSlow: boolean;
};

export type WaveStartEvent = {
  waveNumber: number;
  isFinalWave: boolean;
};

export type EnemyConfig = {
  id: EnemyType;
  label: string;
  color: string;
  shape: "circle" | "diamond" | "square" | "triangle" | "hexagon";
  renderSize?: number;
  spriteForwardAngle?: number;
  radius: number;
  health: number;
  speed: number;
  lifeDamage: number;
  reward: number;
  minPathSpacing: number;
};

export type DifficultyConfig = {
  id: DifficultyId;
  label: string;
  enemyHealthMultiplier: number;
  enemySpeedMultiplier: number;
  enemyCountMultiplier: number;
  enemyRewardMultiplier: number;
  spawnIntervalMultiplier: number;
  startingLife: number;
  startingGold: number;
  scoreMultiplier: number;
};

export type WaveEnemyGroupConfig = {
  enemyType: EnemyType;
  count: number;
  healthMultiplier?: number;
  speedMultiplier?: number;
  spawnInterval?: number;
  startDelay?: number;
  minSpacingOverride?: number;
};

export type WaveDefinition = {
  label: string;
  spawnInterval: number;
  healthScale: number;
  countScale: number;
  groups: WaveEnemyGroupConfig[];
};

export type WaveConfig = {
  initialSpawnDelay: number;
  firstWaveInitialSpawnDelay?: number;
  betweenWaveDelay: number;
  minSpawnInterval: number;
  healthGrowthPerWave: number;
  countGrowthPerWave: number;
  waves: WaveDefinition[];
};

export type MissionConfig = {
  id: MissionId;
  label: string;
  description: string;
  themeId: MissionThemeId;
  backgroundImageKey?: string;
  path: Vector2[];
};

export type CameraZoomMode = "fit-path" | "fit-map";

export type CameraConfig = {
  useCameraManager: boolean;
  worldWidth: number;
  worldHeight: number;
  mobileDefaultZoomMode: CameraZoomMode;
  minZoom: number;
  maxZoom: number;
  allowPan: boolean;
  allowPinchZoom: boolean;
};

export type EnemySpriteKeyMap = Record<EnemyType, string>;

export type EnemySpriteAnimationConfig = {
  spriteSheetKey: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  loop: boolean;
  crowdedFrameRate?: number;
  hitFlashDuration?: number;
  spawnPulseDuration?: number;
};

export type BossVisualConfig = {
  displayWidth?: number;
  displayHeight?: number;
  anchorX?: number;
  anchorY?: number;
  frameRate?: number;
  pingPong?: boolean;
  breathingScaleAmount?: number;
  breathingRate?: number;
  shadowEnabled?: boolean;
  shadowOpacity?: number;
};

export type MissionThemeConfig = {
  id: MissionThemeId;
  label: string;
  enemySpriteKeys: EnemySpriteKeyMap;
  enemySpriteForwardAngles?: Partial<Record<EnemyType, number>>;
  enemySpriteAnimations?: Partial<Record<EnemyType, EnemySpriteAnimationConfig>>;
  bossVisual?: BossVisualConfig;
};

export type EnemySpriteOption = {
  key: string;
  spriteForwardAngle?: number;
  animation?: EnemySpriteAnimationConfig;
  bossVisual?: BossVisualConfig;
};

export type AssetDefinition = {
  key: string;
  src: string;
  removeBackground?: boolean;
};

export type VisualTheme = {
  name: string;
  backgroundColor: string;
  backgroundGridColor: string;
  pathOuterColor: string;
  pathInnerColor: string;
  startColor: string;
  baseColor: string;
  towerStrokeColor: string;
  enemyStrokeColor: string;
};

export type EconomyConfig = {
  debugInfiniteGold: boolean;
  debugUnlockAllMissions: boolean;
  sellRefundRate: number;
};

export type ScoreConfig = {
  lifeMultiplier: number;
  goldMultiplier: number;
  enemyDefeatMultiplier: number;
  starThresholds: {
    twoStar: number;
    threeStar: number;
  };
};

export type MissionRecord = {
  completed: boolean;
  bestScore: number;
  bestStars: number;
};

export type SaveData = {
  version: number;
  missions: Partial<Record<MissionId, MissionRecord>>;
};

export type MissionSelectInfo = {
  id: MissionId;
  label: string;
  locked: boolean;
  completed: boolean;
  bestScore: number;
  bestStars: number;
};

export type RunResult = {
  score: number;
  stars: number;
  enemiesDefeated: number;
};

export function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceSquared(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
