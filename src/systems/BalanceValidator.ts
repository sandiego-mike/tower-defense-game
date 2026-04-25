import { DifficultyConfig, DifficultyId, EnemyConfig, EnemyType, TowerConfig, TowerType, WaveConfig } from "../types";
import { WaveManager } from "./WaveManager";

export type BalanceValidationResult = {
  valid: boolean;
  warnings: string[];
};

export function estimateTowerDps(config: TowerConfig, levelIndex = 0): number {
  const stats = config.levels[levelIndex] ?? config.levels[0];
  const splashFactor = stats.splashRadius ? 1.55 : 1;
  return stats.damage * stats.fireRate * splashFactor;
}

export function validateBalance(
  towers: Record<TowerType, TowerConfig>,
  enemies: Record<EnemyType, EnemyConfig>,
  waves: WaveConfig,
  difficulties: Record<DifficultyId, DifficultyConfig>
): BalanceValidationResult {
  const warnings: string[] = [];
  const towerValues = Object.values(towers);
  const cheapestTower = Math.min(...towerValues.map((tower) => tower.placementCost));
  const levelOneValueRatios = towerValues.map((tower) => estimateTowerDps(tower) / tower.placementCost);
  const strongestValue = Math.max(...levelOneValueRatios);
  const weakestValue = Math.min(...levelOneValueRatios);

  if (strongestValue / weakestValue > 2.6) {
    warnings.push("Level 1 tower DPS per gold has too much spread; one tower may dominate early strategy.");
  }

  for (const difficulty of Object.values(difficulties)) {
    if (difficulty.startingGold < cheapestTower) {
      warnings.push(`${difficulty.label} starting gold cannot buy the cheapest tower.`);
    }

    const waveManager = new WaveManager(waves, enemies, difficulty);
    const firstWave = waveManager.waves[0];
    const firstTwoIncome = waveManager.waves.slice(0, 2).reduce((sum, wave) => sum + wave.goldIncome, 0);
    const startingDps = Math.max(...towerValues.map((tower) => estimateTowerDps(tower) * Math.floor(difficulty.startingGold / tower.placementCost)));
    const earlyDamageBudget = startingDps * 28;

    if (firstWave.totalHealth > earlyDamageBudget) {
      warnings.push(`${difficulty.label} wave 1 health exceeds the simple starting-tower damage budget.`);
    }

    if (difficulty.startingGold + firstTwoIncome < cheapestTower * 4) {
      warnings.push(`${difficulty.label} early economy may not support enough placements by wave 3.`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}
