import { TowerConfig, TowerType } from "../types";

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  basic: {
    label: "Canon",
    color: "#4f8cff",
    // Efficient single-target baseline. Keep this useful, but not best at every job.
    placementCost: 55,
    renderSize: 81,
    spriteKey: "basic-tower",
    projectileSpriteKey: "projectile-basic",
    levels: [
      { level: 1, upgradeCost: 0, range: 145, damage: 20, fireRate: 1, projectileSpeed: 520 },
      { level: 2, upgradeCost: 75, range: 165, damage: 30, fireRate: 1.15, projectileSpeed: 560 },
      { level: 3, upgradeCost: 160, range: 190, damage: 44, fireRate: 1.35, projectileSpeed: 620 }
    ]
  },
  splash: {
    label: "Bomb",
    color: "#f59e0b",
    // High cost and slow shots pay off against clustered/mixed waves.
    placementCost: 85,
    renderSize: 81,
    spriteKey: "splash-tower",
    projectileSpriteKey: "projectile-splash",
    levels: [
      { level: 1, upgradeCost: 0, range: 125, damage: 24, fireRate: 0.45, projectileSpeed: 430, splashRadius: 56 },
      { level: 2, upgradeCost: 110, range: 140, damage: 36, fireRate: 0.52, projectileSpeed: 460, splashRadius: 68 },
      { level: 3, upgradeCost: 230, range: 158, damage: 54, fireRate: 0.62, projectileSpeed: 500, splashRadius: 82 }
    ]
  },
  slow: {
    label: "Frost",
    color: "#22c55e",
    // Low damage support tower that creates strategic value through speed control.
    placementCost: 70,
    renderSize: 81,
    spriteKey: "slow-tower",
    projectileSpriteKey: "projectile-slow",
    levels: [
      { level: 1, upgradeCost: 0, range: 135, damage: 6, fireRate: 0.8, projectileSpeed: 480, slowAmount: 0.5, slowDuration: 2.4 },
      { level: 2, upgradeCost: 90, range: 155, damage: 10, fireRate: 0.95, projectileSpeed: 520, slowAmount: 0.58, slowDuration: 3 },
      { level: 3, upgradeCost: 190, range: 178, damage: 16, fireRate: 1.1, projectileSpeed: 570, slowAmount: 0.66, slowDuration: 3.8 }
    ]
  }
};
