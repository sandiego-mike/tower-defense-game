import { DifficultyConfig, DifficultyId } from "../types";

export const DIFFICULTY_CONFIGS: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    // Forgiving health/count and slower spawns let newer players recover from imperfect tower placement.
    enemyHealthMultiplier: 0.85,
    enemySpeedMultiplier: 0.9,
    enemyCountMultiplier: 0.75,
    enemyRewardMultiplier: 1.18,
    spawnIntervalMultiplier: 1.15,
    startingLife: 120,
    startingGold: 400,
    scoreMultiplier: 0.85
  },
  normal: {
    id: "normal",
    label: "Normal",
    // Baseline tuning target. Adjust tower/enemy configs against Normal first.
    enemyHealthMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyCountMultiplier: 0.75,
    enemyRewardMultiplier: 1,
    spawnIntervalMultiplier: 1,
    startingLife: 100,
    startingGold: 320,
    scoreMultiplier: 1
  },
  hard: {
    id: "hard",
    label: "Hard",
    // Punishing pressure: more bodies, tougher enemies, faster pacing, and tighter economy.
    enemyHealthMultiplier: 1.25,
    enemySpeedMultiplier: 1.12,
    enemyCountMultiplier: 0.75,
    enemyRewardMultiplier: 0.88,
    spawnIntervalMultiplier: 0.82,
    startingLife: 80,
    startingGold: 280,
    scoreMultiplier: 1.25
  },
  insane: {
    id: "insane",
    label: "Insane",
    // Scales beyond Hard through tougher, faster enemies and tighter economy while keeping enemy counts unchanged.
    enemyHealthMultiplier: 1.55,
    enemySpeedMultiplier: 1.22,
    enemyCountMultiplier: 0.75,
    enemyRewardMultiplier: 0.78,
    spawnIntervalMultiplier: 0.72,
    startingLife: 60,
    startingGold: 240,
    scoreMultiplier: 1.6
  }
};
