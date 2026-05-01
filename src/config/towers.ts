import { TowerConfig, TowerType } from "../types";

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  basic: {
    label: "Cannon",
    color: "#4f8cff",
    // Efficient single-target baseline. Keep this useful, but not best at every job.
    placementCost: 40,
    renderSize: 81,
    spriteKey: "basic-tower",
    projectileSpriteKey: "projectile-basic",
    levels: [
      { level: 1, upgradeCost: 0, range: 145, damage: 20, fireRate: 1, projectileSpeed: 520 },
      { level: 2, upgradeCost: 40, range: 165, damage: 30, fireRate: 1.15, projectileSpeed: 560 },
      { level: 3, upgradeCost: 80, range: 190, damage: 44, fireRate: 1.35, projectileSpeed: 620 }
    ]
  },
  splash: {
    label: "Bomb",
    color: "#f59e0b",
    // High cost and slow shots pay off against clustered/mixed waves.
    placementCost: 60,
    renderSize: 81,
    spriteKey: "splash-tower",
    projectileSpriteKey: "projectile-splash",
    levels: [
      { level: 1, upgradeCost: 0, range: 125, damage: 30, fireRate: 0.45, projectileSpeed: 430, splashRadius: 56 },
      { level: 2, upgradeCost: 60, range: 140, damage: 45, fireRate: 0.52, projectileSpeed: 460, splashRadius: 68 },
      { level: 3, upgradeCost: 120, range: 158, damage: 60, fireRate: 0.62, projectileSpeed: 500, splashRadius: 82 }
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
      { level: 2, upgradeCost: 70, range: 155, damage: 10, fireRate: 0.95, projectileSpeed: 520, slowAmount: 0.60, slowDuration: 3 },
      { level: 3, upgradeCost: 140, range: 178, damage: 16, fireRate: 1.1, projectileSpeed: 570, slowAmount: 0.70, slowDuration: 3.8 }
    ]
  }
};
