import { CameraConfig, MissionConfig, MissionId, MissionThemeConfig, MissionThemeId } from "../types";

export const MISSION_ORDER: MissionId[] = ["green-pass", "desert-bend", "lava-spill", "ice-tundra", "island-cove"];

export const GENERIC_ENEMY_SPRITE_KEYS = {
  basic: "basic-enemy",
  fast: "fast-enemy",
  tank: "tank-enemy",
  swarm: "swarm-enemy",
  boss: "boss-enemy"
} as const;

export const CAMERA_CONFIG: CameraConfig = {
  // TODO: Re-enable after the camera rendering pipeline is rebuilt and tested
  // end-to-end. With this false, gameplay uses the pre-camera canvas-space path.
  useCameraManager: false,
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
  },
  ice: {
    id: "ice",
    label: "Ice",
    enemySpriteKeys: {
      basic: "ice-basic-enemy",
      fast: "ice-fast-enemy",
      tank: "ice-tank-enemy",
      swarm: "ice-swarm-enemy",
      boss: "ice-boss-enemy"
    },
    bossVisual: {
      anchorX: 0.5,
      anchorY: 0.86,
      shadowEnabled: true,
      shadowOpacity: 0.24
    }
  },
  island: {
    id: "island",
    label: "Island",
    enemySpriteKeys: {
      basic: "island-basic-enemy",
      fast: "island-fast-enemy",
      tank: "island-tank-enemy",
      swarm: "island-swarm-enemy",
      boss: "island-boss-enemy"
    },
    bossVisual: {
      anchorX: 0.5,
      anchorY: 0.86,
      shadowEnabled: true,
      shadowOpacity: 0.23
    }
  }
};

// Path coordinate guide
// ─────────────────────────────────────────────────────────────────────────────
// All path points use normalized canvas coordinates: (0, 0) top-left, (1, 1)
// bottom-right. Values slightly outside [0, 1] place entry/exit off-screen.
//
// Entry/exit convention:
//   Start at { x: -0.04, y: <height> } — enters from the left edge.
//   End at   { x:  1.04, y: <height> } — exits to the right edge.
//
// Segment style:
//   Alternate horizontal (same y) and vertical (same x) segments.
//   Each pair of consecutive points forms one straight segment.
//
// Tuning difficulty via parallel-segment spacing:
//   ≥ 0.40 apart  → open map, easy tower placement (beginner-friendly)
//   0.22–0.35     → moderate spacing (medium challenge)
//   ≤ 0.22        → tight corridors, limited placement spots (hard)
//
// Backtracks (a segment going left after going right) create column chokepoints
// where only a narrow strip of ground flanks both sides of the path — useful for
// hard maps where tower positioning becomes a meaningful constraint.
//
// Tower placement is blocked within 42 px of the path center, which equals
// roughly 0.027 of canvas width (1536 px) or 0.049 of canvas height (864 px).
// ─────────────────────────────────────────────────────────────────────────────
export const MISSION_CONFIGS: Record<MissionId, MissionConfig> = {
  "green-pass": {
    id: "green-pass",
    label: "Green Pass",
    description: "An open U-shaped route — wide gaps between segments give plenty of space to build.",
    // Assign a mission theme to choose enemy sprites. To add a new mission theme,
    // extend MissionThemeId in types.ts and MISSION_THEME_CONFIGS above, then set themeId.
    themeId: "forest",
    // Assign a map background by matching this key to ASSET_MANIFEST in config/assets.ts.
    // Place the file at public/assets/maps/forest-map.png.
    backgroundImageKey: "forest-map",
    // Shape: symmetric U — enter and exit at the same height (y=0.26).
    // Parallel horizontal segments are 0.48 apart, leaving a large open central
    // area that beginners can easily fill with towers. 4 turns total.
    path: [
      { x: -0.04, y: 0.26 }, // Enter left, upper third
      { x: 0.30,  y: 0.26 }, // Right across upper section
      { x: 0.30,  y: 0.74 }, // Down (0.48 gap — very open centre)
      { x: 0.70,  y: 0.74 }, // Right across lower section
      { x: 0.70,  y: 0.26 }, // Up to entry height (closes the U)
      { x: 1.04,  y: 0.26 }  // Exit right, upper third
    ]
  },
  "desert-bend": {
    id: "desert-bend",
    label: "Desert Bend",
    description: "A winding S-curve that covers the full map — six turns demand broad coverage.",
    themeId: "desert",
    backgroundImageKey: "desert-map",
    // Shape: extended S-curve — enters lower-left, climbs to the top, sweeps
    // back down to the bottom, then rises again to exit mid-right.
    // Parallel segments are 0.40–0.56 apart: enough room for towers but more
    // ground to cover than Forest. 6 turns, longer total path distance.
    path: [
      { x: -0.04, y: 0.70 }, // Enter left, lower third
      { x: 0.20,  y: 0.70 }, // Short right along bottom
      { x: 0.20,  y: 0.22 }, // Up (0.48 rise — first big sweep)
      { x: 0.50,  y: 0.22 }, // Right across the top
      { x: 0.50,  y: 0.78 }, // Down (0.56 drop — second big sweep)
      { x: 0.80,  y: 0.78 }, // Right along the bottom
      { x: 0.80,  y: 0.40 }, // Up (0.38 rise — exit sweep)
      { x: 1.04,  y: 0.40 }  // Exit right, middle height
    ]
  },
  "lava-spill": {
    id: "lava-spill",
    label: "Lava Spill",
    description: "A descending staircase with tight parallel bands — limited placement space and backtracks make every tower count.",
    themeId: "lava",
    backgroundImageKey: "lava-map",
    // Shape: staircase descent with backtracks — enters upper-left, zigzags
    // down to lower-right in three tight horizontal bands.
    // Parallel segments are only 0.20 apart (≈173 px on a 864 px canvas),
    // leaving just 1–2 tower widths between them. Backtracks at x=0.48→0.12
    // create a narrow left-side corridor that forces difficult positioning.
    // 6 turns total; the path ends near the bottom-right corner.
    path: [
      { x: -0.04, y: 0.18 }, // Enter left, near top
      { x: 0.48,  y: 0.18 }, // Right across upper band (long exposure)
      { x: 0.48,  y: 0.38 }, // Down (0.20 gap — tight)
      { x: 0.12,  y: 0.38 }, // Left backtrack (creates left-side chokepoint)
      { x: 0.12,  y: 0.58 }, // Down (0.20 gap — tight)
      { x: 0.64,  y: 0.58 }, // Right across middle band
      { x: 0.64,  y: 0.78 }, // Down (0.20 gap — tight)
      { x: 1.04,  y: 0.78 }  // Exit right, near bottom
    ]
  },
  "ice-tundra": {
    id: "ice-tundra",
    label: "Ice Tundra",
    description: "A frozen switchback route with icy chokepoints — long sightlines reward careful tower placement.",
    themeId: "ice",
    backgroundImageKey: "ice-map",
    // Shape: frozen switchback — tighter than Forest and Desert, but with
    // wider bands than Lava so careful long-range coverage still has room.
    path: [
      { x: -0.04, y: 0.32 },
      { x: 0.22,  y: 0.32 },
      { x: 0.22,  y: 0.16 },
      { x: 0.58,  y: 0.16 },
      { x: 0.58,  y: 0.50 },
      { x: 0.34,  y: 0.50 },
      { x: 0.34,  y: 0.76 },
      { x: 0.78,  y: 0.76 },
      { x: 0.78,  y: 0.36 },
      { x: 1.04,  y: 0.36 }
    ]
  },
  "island-cove": {
    id: "island-cove",
    label: "Island Cove",
    description: "A tropical island route with wide beach bends and palm-lined chokepoints — balanced placement rewards smart coverage.",
    themeId: "island",
    backgroundImageKey: "island-map",
    // Shape: beach switchback — a medium route with broad turns and several
    // useful coverage lanes, less compressed than Ice or Lava.
    path: [
      { x: -0.04, y: 0.62 },
      { x: 0.18,  y: 0.62 },
      { x: 0.18,  y: 0.28 },
      { x: 0.42,  y: 0.28 },
      { x: 0.42,  y: 0.72 },
      { x: 0.68,  y: 0.72 },
      { x: 0.68,  y: 0.38 },
      { x: 0.86,  y: 0.38 },
      { x: 0.86,  y: 0.58 },
      { x: 1.04,  y: 0.58 }
    ]
  }
};
