import { WaveConfig } from "../types";

export const DEFAULT_WAVE_CONFIG: WaveConfig = {
  initialSpawnDelay: 1.2,
  betweenWaveDelay: 2,
  minSpawnInterval: 0.42,
  // Global growth keeps later waves rising even when individual wave definitions stay readable.
  healthGrowthPerWave: 0.06,
  countGrowthPerWave: 0.04,
  waves: [
    {
      label: "Scouts",
      spawnInterval: 0.9,
      healthScale: 1,
      countScale: 1,
      groups: [{ enemyType: "basic", count: 6 }]
    },
    {
      label: "First Rush",
      spawnInterval: 0.82,
      healthScale: 1.12,
      countScale: 1.08,
      groups: [
        { enemyType: "basic", count: 7 },
        { enemyType: "fast", count: 3, spawnInterval: 0.74, minSpacingOverride: 26 }
      ]
    },
    {
      label: "Fast Lane",
      spawnInterval: 0.72,
      healthScale: 1.24,
      countScale: 1.12,
      groups: [
        { enemyType: "basic", count: 7 },
        { enemyType: "fast", count: 7, spawnInterval: 0.64, minSpacingOverride: 24 }
      ]
    },
    {
      label: "Heavy Steps",
      spawnInterval: 0.78,
      healthScale: 1.38,
      countScale: 1.15,
      groups: [
        { enemyType: "tank", count: 4, spawnInterval: 0.92, minSpacingOverride: 54 },
        { enemyType: "basic", count: 8 },
        { enemyType: "swarm", count: 8, healthMultiplier: 0.9, spawnInterval: 0.44, minSpacingOverride: 18 }
      ]
    },
    {
      label: "Swarm Break",
      spawnInterval: 0.56,
      healthScale: 1.52,
      countScale: 1.2,
      groups: [
        { enemyType: "swarm", count: 18, spawnInterval: 0.42, minSpacingOverride: 16 },
        { enemyType: "fast", count: 8, spawnInterval: 0.58, minSpacingOverride: 24 },
        { enemyType: "tank", count: 3, spawnInterval: 0.96, minSpacingOverride: 52 }
      ]
    },
    {
      label: "Boss Escort",
      spawnInterval: 0.68,
      healthScale: 1.8,
      countScale: 1.15,
      groups: [
        // Spawn the boss first, then release escorts after a readable gap.
        { enemyType: "boss", count: 1, healthMultiplier: 1.25, minSpacingOverride: 124 },
        { enemyType: "tank", count: 4, startDelay: 1.9, spawnInterval: 1.04, minSpacingOverride: 58 },
        { enemyType: "fast", count: 8, startDelay: 2.8, spawnInterval: 0.6, minSpacingOverride: 26 },
        { enemyType: "swarm", count: 12, startDelay: 3.3, spawnInterval: 0.42, minSpacingOverride: 18 }
      ]
    }
  ]
};
