import { DifficultyConfig, DifficultyId } from "../types";

export const DIFFICULTY_CONFIGS: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    // Former Normal tuning: the new baseline entry point.
    enemyHealthMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyCountMultiplier: 0.75,
    enemyRewardMultiplier: 1,
    spawnIntervalMultiplier: 1,
    startingLife: 100,
    startingGold: 320,
    scoreMultiplier: 1
  },
  normal: {
    id: "normal",
    label: "Normal",
    // Former Hard tuning: a sharper middle difficulty.
    enemyHealthMultiplier: 1.25,
    enemySpeedMultiplier: 1.12,
    enemyCountMultiplier: 0.75,
    enemyRewardMultiplier: 0.88,
    spawnIntervalMultiplier: 0.82,
    startingLife: 80,
    startingGold: 280,
    scoreMultiplier: 1.25
  },
  hard: {
    id: "hard",
    label: "Hard",
    // Former Insane tuning: toughest available mode, without increasing enemy counts.
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
