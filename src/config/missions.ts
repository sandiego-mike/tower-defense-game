import { CameraConfig, MissionConfig, MissionId, MissionThemeConfig, MissionThemeId } from "../types";

export const MISSION_ORDER: MissionId[] = ["green-pass", "desert-bend", "lava-spill"];

export const GENERIC_ENEMY_SPRITE_KEYS = {
  basic: "basic-enemy",
  fast: "fast-enemy",
  tank: "tank-enemy",
  swarm: "swarm-enemy",
  boss: "boss-enemy"
} as const;

export const CAMERA_CONFIG: CameraConfig = {
  // Gameplay lives in stable world units. Responsive canvas size and device
  // orientation change the camera only; enemy paths and tower positions do not
  // get recalculated from screen pixels.
  worldWidth: 960,
  worldHeight: 540,
  mobileDefaultZoomMode: "fit-map",
  minZoom: 0.25,
  maxZoom: 2.6,
  allowPan: true,
  allowPinchZoom: true
};

// Mission themes control enemy visuals. Enemy behavior stays in config/enemies.ts:
// the "basic" role keeps the same health, speed, reward, radius, and life damage
// no matter which themed sprite is used for the current map.
//
// To add a themed enemy set, place PNGs under public/assets/enemies/<theme>/,
// add matching asset entries in config/assets.ts, then map every enemy role here.
//
// Bosses can optionally use a sprite sheet while other enemies stay static.
// Put the sheet under public/assets/enemies/<theme>/boss/ and define:
// - frameWidth/frameHeight as the size of one frame inside the sheet
// - frameCount as the number of horizontal frames to play
// - frameRate as frames per second for the boss only
// Then tune bossVisual:
// - displayWidth/displayHeight as the on-screen size, independent of frame size
// - anchorX/anchorY as the normalized point inside the drawn frame that should sit
//   on the enemy position (0.5, 0.5 is centered; a larger anchorY locks tall art
//   by the feet/base instead of the empty transparent space)
// - pingPong to soften loops when a walk cycle snaps too hard from last frame to first
// - breathingScaleAmount to add only a very small idle pulse
// If the sheet is missing, rendering falls back to the themed/static boss PNG,
// then the generic boss PNG, then the placeholder shape.
export const MISSION_THEME_CONFIGS: Record<MissionThemeId, MissionThemeConfig> = {
  forest: {
    id: "forest",
    label: "Forest",
    enemySpriteKeys: {
      basic: "forest-basic-enemy",
      fast: "forest-fast-enemy",
      tank: "forest-tank-enemy",
      swarm: "forest-swarm-enemy",
      boss: "forest-boss-enemy"
    },
    bossVisual: {
      displayWidth: 148,
      displayHeight: 148,
      anchorX: 0.5,
      anchorY: 0.86,
      frameRate: 4,
      pingPong: true,
      breathingScaleAmount: 0,
      breathingRate: 0.42,
      shadowEnabled: true,
      shadowOpacity: 0.24
    }
  },
  desert: {
    id: "desert",
    label: "Desert",
    enemySpriteKeys: {
      basic: "desert-basic-enemy",
      fast: "desert-fast-enemy",
      tank: "desert-tank-enemy",
      swarm: "desert-swarm-enemy",
      boss: "desert-boss-enemy"
    },
    bossVisual: {
      anchorX: 0.5,
      anchorY: 0.86,
      shadowEnabled: true,
      shadowOpacity: 0.22
    },
    // The desert basic sprite art faces upward in its source PNG, while the
    // default enemy art faces downward. This visual override keeps behavior
    // unchanged and only corrects sprite rotation on desert maps.
    enemySpriteForwardAngles: {
      basic: -Math.PI / 2
    }
  },
  lava: {
    id: "lava",
    label: "Lava",
    enemySpriteKeys: {
      basic: "lava-basic-enemy",
      fast: "lava-fast-enemy",
      tank: "lava-tank-enemy",
      swarm: "lava-swarm-enemy",
      boss: "lava-boss-enemy"
    },
    bossVisual: {
      anchorX: 0.5,
      anchorY: 0.86,
      shadowEnabled: true,
      shadowOpacity: 0.26
    }
  }
};

export const MISSION_CONFIGS: Record<MissionId, MissionConfig> = {
  "green-pass": {
    id: "green-pass",
    label: "Green Pass",
    description: "A gentle starter route with two clean turns.",
    // Assign a mission theme to choose enemy sprites. To add a new mission theme,
    // extend MissionThemeId in types.ts and MISSION_THEME_CONFIGS above, then set themeId.
    themeId: "forest",
    // Assign a map background by matching this key to ASSET_MANIFEST in config/assets.ts.
    // Place the file at public/assets/maps/forest-map.png.
    backgroundImageKey: "forest-map",
    path: [
      { x: -0.04, y: 0.28 },
      { x: 0.24, y: 0.28 },
      { x: 0.24, y: 0.7 },
      { x: 0.58, y: 0.7 },
      { x: 0.58, y: 0.4 },
      { x: 1.04, y: 0.4 }
    ]
  },
  "desert-bend": {
    id: "desert-bend",
    label: "Desert Bend",
    description: "A longer route that gives splash towers more time to shine.",
    themeId: "desert",
    backgroundImageKey: "desert-map",
    path: [
      { x: -0.04, y: 0.62 },
      { x: 0.18, y: 0.62 },
      { x: 0.18, y: 0.24 },
      { x: 0.48, y: 0.24 },
      { x: 0.48, y: 0.78 },
      { x: 0.78, y: 0.78 },
      { x: 0.78, y: 0.36 },
      { x: 1.04, y: 0.36 }
    ]
  },
  "lava-spill": {
    id: "lava-spill",
    label: "Lava Spill",
    description: "A compact zig-zag path with tight tower placement choices.",
    themeId: "lava",
    backgroundImageKey: "lava-map",
    path: [
      { x: -0.04, y: 0.2 },
      { x: 0.34, y: 0.2 },
      { x: 0.34, y: 0.43 },
      { x: 0.12, y: 0.43 },
      { x: 0.12, y: 0.72 },
      { x: 0.66, y: 0.72 },
      { x: 0.66, y: 0.48 },
      { x: 1.04, y: 0.48 }
    ]
  }
};
