import { AssetDefinition } from "../types";
import { TOWER_UPGRADE_ASSETS } from "./towerSprites";

// Paths point to files in /public. Vite serves public assets from the site root.
// Enemy PNGs are organized by theme under public/assets/enemies/<theme>/.
// Use filenames like forest-basic-enemy.png so each file remains clear even when
// moved between folders, then map their keys in config/missions.ts.
// Map PNGs should be placed in public/assets/maps/ and referenced by mission backgroundImageKey.
export const ASSET_MANIFEST: AssetDefinition[] = [
  { key: "basic-tower", src: "/assets/towers/basic-tower.png" },
  { key: "splash-tower", src: "/assets/towers/splash-tower.png" },
  { key: "slow-tower", src: "/assets/towers/slow-tower.png" },
  ...TOWER_UPGRADE_ASSETS,
  // Generic enemy sprite keys currently reuse forest art as the fallback set.
  { key: "basic-enemy", src: "/assets/enemies/forest/forest-basic-enemy.png", removeBackground: true },
  { key: "fast-enemy", src: "/assets/enemies/forest/forest-fast-enemy.png", removeBackground: true },
  { key: "tank-enemy", src: "/assets/enemies/forest/forest-tank-enemy.png", removeBackground: true },
  { key: "swarm-enemy", src: "/assets/enemies/forest/forest-swarm-enemy.png", removeBackground: true },
  { key: "boss-enemy", src: "/assets/enemies/forest/forest-boss-enemy.png", removeBackground: true },
  { key: "forest-basic-enemy", src: "/assets/enemies/forest/forest-basic-enemy.png", removeBackground: true },
  { key: "forest-fast-enemy", src: "/assets/enemies/forest/forest-fast-enemy.png", removeBackground: true },
  { key: "forest-tank-enemy", src: "/assets/enemies/forest/forest-tank-enemy.png", removeBackground: true },
  { key: "forest-swarm-enemy", src: "/assets/enemies/forest/forest-swarm-enemy.png", removeBackground: true },
  { key: "forest-boss-enemy", src: "/assets/enemies/forest/forest-boss-enemy.png", removeBackground: true },
  { key: "desert-basic-enemy", src: "/assets/enemies/desert/desert-basic-enemy.png", removeBackground: true },
  { key: "desert-fast-enemy", src: "/assets/enemies/desert/desert-fast-enemy.png", removeBackground: true },
  { key: "desert-tank-enemy", src: "/assets/enemies/desert/desert-tank-enemy.png", removeBackground: true },
  { key: "desert-swarm-enemy", src: "/assets/enemies/desert/desert-swarm-enemy.png", removeBackground: true },
  { key: "desert-boss-enemy", src: "/assets/enemies/desert/desert-boss-enemy.png", removeBackground: true },
  { key: "lava-basic-enemy", src: "/assets/enemies/lava/lava-basic-enemy.png", removeBackground: true },
  { key: "lava-fast-enemy", src: "/assets/enemies/lava/lava-fast-enemy.png", removeBackground: true },
  { key: "lava-tank-enemy", src: "/assets/enemies/lava/lava-tank-enemy.png", removeBackground: true },
  { key: "lava-swarm-enemy", src: "/assets/enemies/lava/lava-swarm-enemy.png", removeBackground: true },
  { key: "lava-boss-enemy", src: "/assets/enemies/lava/lava-boss-enemy.png", removeBackground: true },
  { key: "ice-basic-enemy", src: "/assets/enemies/ice/ice-basic-enemy.png", removeBackground: true },
  { key: "ice-fast-enemy", src: "/assets/enemies/ice/ice-fast-enemy.png", removeBackground: true },
  { key: "ice-tank-enemy", src: "/assets/enemies/ice/ice-tank-enemy.png", removeBackground: true },
  { key: "ice-swarm-enemy", src: "/assets/enemies/ice/ice-swarm-enemy.png", removeBackground: true },
  { key: "ice-boss-enemy", src: "/assets/enemies/ice/ice-boss-enemy.png", removeBackground: true },
  { key: "forest-map", src: "/assets/maps/forest-map.png" },
  { key: "desert-map", src: "/assets/maps/desert-map.png" },
  { key: "lava-map", src: "/assets/maps/lava-map.png" },
  { key: "ice-map", src: "/assets/maps/ice-map.png" }
];
