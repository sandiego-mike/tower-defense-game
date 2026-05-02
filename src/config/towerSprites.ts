import { AssetDefinition, TowerType } from "../types";

export const TOWER_UPGRADE_SPRITE_KEYS: Record<TowerType, readonly string[]> = {
  basic: ["basic-tower-lvl1", "basic-tower-lvl2", "basic-tower-lvl3"],
  splash: ["splash-tower-lvl1", "splash-tower-lvl2", "splash-tower-lvl3"],
  slow: ["slow-tower-lvl1", "slow-tower-lvl2", "slow-tower-lvl3"]
};

export const TOWER_UPGRADE_ASSETS: AssetDefinition[] = [
  { key: "basic-tower-lvl1", src: "/assets/towers/cannon/cannon_lvl1.png" },
  { key: "basic-tower-lvl2", src: "/assets/towers/cannon/cannon_lvl2.png" },
  { key: "basic-tower-lvl3", src: "/assets/towers/cannon/cannon_lvl3.png" },
  { key: "splash-tower-lvl1", src: "/assets/towers/bomb/bomb_lvl1.png" },
  { key: "splash-tower-lvl2", src: "/assets/towers/bomb/bomb_lvl2.png" },
  { key: "splash-tower-lvl3", src: "/assets/towers/bomb/bomb_lvl3.png" },
  { key: "slow-tower-lvl1", src: "/assets/towers/frost/frost_lvl1.png" },
  { key: "slow-tower-lvl2", src: "/assets/towers/frost/frost_lvl2.png" },
  { key: "slow-tower-lvl3", src: "/assets/towers/frost/frost_lvl3.png" }
];

export function getTowerVisualLevel(level: number, availableLevels: number): number {
  return Math.max(1, Math.min(Math.floor(level), availableLevels));
}

export function getTowerSpriteKeyCandidates(towerType: TowerType, level: number, baseSpriteKey: string | undefined): string[] {
  const upgradeSpriteKeys = TOWER_UPGRADE_SPRITE_KEYS[towerType];
  const visualLevel = getTowerVisualLevel(level, upgradeSpriteKeys.length);
  const candidates = upgradeSpriteKeys.slice(0, visualLevel).reverse();

  if (baseSpriteKey) {
    candidates.push(baseSpriteKey);
  }

  return candidates;
}
