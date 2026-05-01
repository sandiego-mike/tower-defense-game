import { EnemyConfig, EnemyType } from "../types";

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  basic: {
    id: "basic",
    label: "Basic",
    color: "#ef4444",
    shape: "circle",
    // Enemy configs describe the gameplay role and fallback rendering metadata.
    // Sprite choices live in mission/theme config so this role can look forest,
    // desert, or lava themed without duplicating health, speed, rewards, or waves.
    renderSize: 68,
    // This sprite art faces down, so rotation subtracts PI / 2 before matching path direction.
    spriteForwardAngle: Math.PI / 2,
    radius: 13,
    // Baseline enemy used to teach core targeting and economy pacing.
    health: 45,
    speed: 40,
    lifeDamage: 5,
    reward: 5,
    minPathSpacing: 34
  },
  fast: {
    id: "fast",
    label: "Fast",
    color: "#facc15",
    shape: "diamond",
    renderSize: 60,
    spriteForwardAngle: Math.PI / 2,
    radius: 11,
    // Fragile but quick; introduced early to test coverage and targeting.
    health: 28,
    speed: 70,
    lifeDamage: 5,
    reward: 7,
    minPathSpacing: 28
  },
  tank: {
    id: "tank",
    label: "Tank",
    color: "#a855f7",
    shape: "square",
    renderSize: 88,
    spriteForwardAngle: Math.PI / 2,
    radius: 17,
    // Slow high-health unit that rewards upgraded single-target damage.
    health: 110,
    speed: 25,
    lifeDamage: 8,
    reward: 20,
    minPathSpacing: 50
  },
  swarm: {
    id: "swarm",
    label: "Swarm",
    color: "#fb7185",
    shape: "triangle",
    renderSize: 50,
    spriteForwardAngle: Math.PI / 2,
    radius: 9,
    // Cheap mass unit that gives splash towers a clear purpose.
    health: 18,
    speed: 80,
    lifeDamage: 3,
    reward: 4,
    minPathSpacing: 20
  },
  boss: {
    id: "boss",
    label: "Boss",
    color: "#38bdf8",
    shape: "hexagon",
    renderSize: 148,
    spriteForwardAngle: Math.PI / 2,
    radius: 25,
    // Final-wave anchor. The escort should matter, but this is the distinct threat.
    health: 420,
    speed: 30,
    lifeDamage: 20,
    reward: 100,
    minPathSpacing: 104
  }
};
