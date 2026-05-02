export type AmbientKey = "forest-ambient" | "desert-ambient" | "lava-ambient" | "ice-ambient" | "island-ambient";

export type AmbientConfig = {
  key: AmbientKey;
  path: string;
  volume: number;
  enabled: boolean;
};

export const AMBIENT_CONFIGS: AmbientConfig[] = [
  { key: "forest-ambient", path: "/assets/sounds/ambient/forest-ambient.mp3", volume: 0.10, enabled: true },
  { key: "desert-ambient", path: "/assets/sounds/ambient/desert-ambient.mp3", volume: 0.10, enabled: true },
  { key: "lava-ambient", path: "/assets/sounds/ambient/lava-ambient.mp3", volume: 0.12, enabled: true },
  { key: "ice-ambient", path: "/assets/sounds/ambient/ice-ambient.mp3", volume: 0.10, enabled: true },
  { key: "island-ambient", path: "/assets/sounds/ambient/island-ambient.mp3", volume: 0.10, enabled: true }
];

export type SoundKey =
  | "tower-fire"
  | "enemy-hit"
  | "enemy-destroyed"
  | "boss-destroyed"
  | "wave-start"
  | "boss-spawn"
  | "tower-placed"
  | "tower-upgraded"
  | "tower-sold"
  | "victory"
  | "defeat"
  | "invalid-placement";

export type SoundConfig = {
  key: SoundKey;
  path: string;
  volume: number;
  cooldownMs: number;
  enabled: boolean;
  poolSize?: number;
};

export const SOUND_CONFIGS: SoundConfig[] = [
  { key: "tower-fire", path: "/assets/sounds/tower-fire.mp3", volume: 0.28, cooldownMs: 70, enabled: true, poolSize: 4 },
  { key: "enemy-hit", path: "/assets/sounds/enemy-hit.mp3", volume: 0.22, cooldownMs: 90, enabled: true, poolSize: 3 },
  { key: "enemy-destroyed", path: "/assets/sounds/enemy-destroyed.mp3", volume: 0.18, cooldownMs: 80, enabled: true, poolSize: 2 },
  { key: "boss-destroyed", path: "/assets/sounds/boss-destroyed.mp3", volume: 0.62, cooldownMs: 0, enabled: true },
  { key: "wave-start", path: "/assets/sounds/wave-start.mp3", volume: 0.42, cooldownMs: 500, enabled: true },
  { key: "boss-spawn", path: "/assets/sounds/boss-spawn.mp3", volume: 0.52, cooldownMs: 800, enabled: true },
  { key: "tower-placed", path: "/assets/sounds/tower-placed.mp3", volume: 0.36, cooldownMs: 25, enabled: true, poolSize: 3 },
  { key: "tower-upgraded", path: "/assets/sounds/tower-upgraded.mp3", volume: 0.4, cooldownMs: 0, enabled: true, poolSize: 2 },
  { key: "tower-sold", path: "/assets/sounds/tower-sold.mp3", volume: 0.32, cooldownMs: 0, enabled: true, poolSize: 2 },
  { key: "victory", path: "/assets/sounds/victory.mp3", volume: 0.58, cooldownMs: 1200, enabled: true },
  { key: "defeat", path: "/assets/sounds/defeat.mp3", volume: 0.5, cooldownMs: 1200, enabled: true },
  { key: "invalid-placement", path: "/assets/sounds/invalid-placement.mp3", volume: 0.26, cooldownMs: 0, enabled: true, poolSize: 2 }
];
