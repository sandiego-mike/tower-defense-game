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
      // Before: 6 basic (270 HP total). After: 4 basic (272 HP total). -33% count.
      label: "Scouts",
      spawnInterval: 1.05,
      healthScale: 1,
      countScale: 1,
      groups: [{ enemyType: "basic", count: 4, healthMultiplier: 1.5 }]
    },
    {
      // Before: 8 basic + 3 fast = 11 enemies (523 HP). After: 6 basic + 2 fast = 8 enemies (532 HP). -27% count.
      label: "First Rush",
      spawnInterval: 0.96,
      healthScale: 1.12,
      countScale: 1.08,
      groups: [
        { enemyType: "basic", count: 5, healthMultiplier: 1.35 },
        { enemyType: "fast", count: 2, healthMultiplier: 1.5, spawnInterval: 0.86, minSpacingOverride: 28 }
      ]
    },
    {
      // Before: 8 basic + 8 fast = 16 enemies (808 HP). After: 5 basic + 5 fast = 10 enemies (810 HP). -38% count.
      label: "Fast Lane",
      spawnInterval: 0.86,
      healthScale: 1.24,
      countScale: 1.12,
      groups: [
        { enemyType: "basic", count: 4, healthMultiplier: 1.6 },
        { enemyType: "fast", count: 4, healthMultiplier: 1.6, spawnInterval: 0.76, minSpacingOverride: 26 }
      ]
    },
    {
      // Before: 5 tank + 10 basic + 10 swarm = 25 enemies (1845 HP). After: 4 tank + 6 basic + 6 swarm = 16 enemies (1846 HP). -36% count.
      label: "Heavy Steps",
      spawnInterval: 0.90,
      healthScale: 1.38,
      countScale: 1.15,
      groups: [
        { enemyType: "tank", count: 3, healthMultiplier: 1.25, spawnInterval: 1.06, minSpacingOverride: 56 },
        { enemyType: "basic", count: 5, healthMultiplier: 1.65 },
        { enemyType: "swarm", count: 5, healthMultiplier: 1.5, spawnInterval: 0.52, minSpacingOverride: 20 }
      ]
    },
    {
      // Before: 25 swarm + 11 fast + 4 tank = 40 enemies (2225 HP). After: 15 swarm + 7 fast + 3 tank = 25 enemies (2229 HP). -38% count.
      label: "Swarm Break",
      spawnInterval: 0.66,
      healthScale: 1.52,
      countScale: 1.2,
      groups: [
        { enemyType: "swarm", count: 11, healthMultiplier: 1.65, spawnInterval: 0.50, minSpacingOverride: 18 },
        { enemyType: "fast", count: 5, healthMultiplier: 1.6, spawnInterval: 0.68, minSpacingOverride: 26 },
        { enemyType: "tank", count: 2, healthMultiplier: 1.35, spawnInterval: 1.10, minSpacingOverride: 54 }
      ]
    },
    {
      // Before: 1 boss + 6 tank + 11 fast + 17 swarm = 35 enemies (3969 HP). After: 1 boss + 4 tank + 7 fast + 10 swarm = 22 enemies (3984 HP). -37% count.
      label: "Boss Escort",
      spawnInterval: 0.80,
      healthScale: 1.8,
      countScale: 1.15,
      groups: [
        // Spawn the boss first, then release escorts after a readable gap.
        { enemyType: "boss", count: 1, healthMultiplier: 1.25, minSpacingOverride: 124 },
        { enemyType: "tank", count: 3, healthMultiplier: 1.5, startDelay: 1.9, spawnInterval: 1.16, minSpacingOverride: 60 },
        { enemyType: "fast", count: 5, healthMultiplier: 1.6, startDelay: 2.8, spawnInterval: 0.70, minSpacingOverride: 28 },
        { enemyType: "swarm", count: 7, healthMultiplier: 1.7, startDelay: 3.3, spawnInterval: 0.52, minSpacingOverride: 20 }
      ]
    }
  ]
};
