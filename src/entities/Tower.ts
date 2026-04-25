import { Enemy } from "./Enemy";
import { Projectile } from "./Projectile";
import { TOWER_CONFIGS } from "../config/towers";
import { AssetManager } from "../systems/AssetManager";
import { TargetingMode, TowerLevelStats, TowerType, Vector2, distanceSquared } from "../types";

export class Tower {
  private static readonly TARGET_REACQUIRE_INTERVAL = 0.12;

  readonly size = 28;
  readonly maxHealth = 100;
  health = 100;
  level = 1;
  targetingMode: TargetingMode = "first";
  totalInvestedGold: number;

  private cooldown = 0;
  private turretTurn = 1;
  private currentTarget: Enemy | undefined;
  private targetReacquireTimer = 0;
  private cachedRange = 0;
  private cachedRangeSquared = 0;

  constructor(
    readonly position: Vector2,
    readonly type: TowerType,
    placementCost: number
  ) {
    this.totalInvestedGold = placementCost;
  }

  update(
    deltaTime: number,
    enemies: Enemy[],
    projectiles: Projectile[],
    createProjectile: (start: Vector2, target: Enemy, stats: TowerLevelStats, color: string, spriteKey: string | undefined) => Projectile
  ): boolean {
    const stats = this.stats;
    const config = TOWER_CONFIGS[this.type];
    this.cooldown = Math.max(0, this.cooldown - deltaTime);
    this.targetReacquireTimer = Math.max(0, this.targetReacquireTimer - deltaTime);

    if (this.cooldown > 0) return false;

    const target = this.getTarget(enemies, this.getRangeSquared(stats.range));
    if (!target) return false;

    this.turretTurn = target.position.x < this.position.x ? -1 : 1;
    projectiles.push(createProjectile(this.position, target, stats, config.color, stats.projectileSpriteKey ?? config.projectileSpriteKey));
    this.cooldown = 1 / stats.fireRate;
    return true;
  }

  get stats(): TowerLevelStats {
    return TOWER_CONFIGS[this.type].levels[this.level - 1];
  }

  get maxLevel(): number {
    return TOWER_CONFIGS[this.type].levels.length;
  }

  get nextUpgradeCost(): number | null {
    return this.level < this.maxLevel ? TOWER_CONFIGS[this.type].levels[this.level].upgradeCost : null;
  }

  get interactionSize(): number {
    return Math.max(this.size, (TOWER_CONFIGS[this.type].renderSize ?? this.size) * 0.6);
  }

  upgrade(): boolean {
    if (this.level >= this.maxLevel) return false;
    this.level += 1;
    this.currentTarget = undefined;
    this.cachedRange = 0;
    return true;
  }

  recordUpgradeCost(cost: number): void {
    this.totalInvestedGold += cost;
  }

  setTargetingMode(mode: TargetingMode): void {
    this.targetingMode = mode;
    this.currentTarget = undefined;
    this.targetReacquireTimer = 0;
  }

  containsPoint(point: Vector2): boolean {
    return (
      point.x >= this.position.x - this.interactionSize / 2 &&
      point.x <= this.position.x + this.interactionSize / 2 &&
      point.y >= this.position.y - this.interactionSize / 2 &&
      point.y <= this.position.y + this.interactionSize / 2
    );
  }

  draw(ctx: CanvasRenderingContext2D, assets: AssetManager, showRange = false): void {
    const config = TOWER_CONFIGS[this.type];
    const stats = this.stats;

    ctx.save();
    if (showRange) {
      ctx.fillStyle = "rgba(79, 140, 255, 0.12)";
      ctx.strokeStyle = "rgba(226, 232, 240, 0.28)";
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, stats.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const sprite = assets.getImage(config.spriteKey);
    const drawSize = config.renderSize ?? this.size + 8;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    if (sprite) {
      ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      this.drawSpriteTurretOverlay(ctx, sprite, drawSize);
    } else {
      this.drawPlaceholder(ctx, config.color, drawSize);
    }
    ctx.restore();

    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(this.position.x - 18, this.position.y + 20, 36, 5);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(this.position.x - 18, this.position.y + 20, 36 * healthPercent, 5);

    ctx.restore();
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, color: string, drawSize: number): void {
    const placeholderSize = Math.max(this.size, drawSize * 0.55);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#12301e";
    ctx.lineWidth = 3;
    ctx.fillRect(-placeholderSize / 2, -placeholderSize / 2, placeholderSize, placeholderSize);
    ctx.strokeRect(-placeholderSize / 2, -placeholderSize / 2, placeholderSize, placeholderSize);

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.save();
    ctx.rotate(this.turretTurn * 0.35);
    ctx.fillRect(placeholderSize * 0.12, -placeholderSize / 2 - 5, 8, 10);
    ctx.restore();
  }

  private drawSpriteTurretOverlay(ctx: CanvasRenderingContext2D, sprite: HTMLImageElement | HTMLCanvasElement, drawSize: number): void {
    const sourceY = 0;
    const sourceHeight = sprite.height * 0.58;
    const overlayHeight = drawSize * 0.58;
    const pivotY = -drawSize * 0.18;

    ctx.save();
    ctx.translate(0, pivotY);
    ctx.rotate(this.turretTurn * 0.22);
    ctx.drawImage(sprite, 0, sourceY, sprite.width, sourceHeight, -drawSize / 2, -drawSize / 2 - pivotY, drawSize, overlayHeight);
    ctx.restore();
  }

  private getTarget(enemies: Enemy[], rangeSquared: number): Enemy | undefined {
    if (this.currentTarget && this.isValidTarget(this.currentTarget, rangeSquared)) {
      return this.currentTarget;
    }

    this.currentTarget = undefined;
    if (this.targetReacquireTimer > 0) return undefined;

    this.targetReacquireTimer = Tower.TARGET_REACQUIRE_INTERVAL;
    this.currentTarget = this.findTarget(enemies, rangeSquared);
    return this.currentTarget;
  }

  private isValidTarget(enemy: Enemy, rangeSquared: number): boolean {
    return !enemy.isDead && !enemy.reachedBase && distanceSquared(this.position, enemy.position) <= rangeSquared;
  }

  private getRangeSquared(range: number): number {
    if (this.cachedRange !== range) {
      this.cachedRange = range;
      this.cachedRangeSquared = range * range;
    }
    return this.cachedRangeSquared;
  }

  private findTarget(enemies: Enemy[], rangeSquared: number): Enemy | undefined {
    let bestTarget: Enemy | undefined;
    let bestScore = this.targetingMode === "closest" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    for (const enemy of enemies) {
      if (enemy.isDead || enemy.reachedBase) continue;

      const enemyDistanceSquared = distanceSquared(this.position, enemy.position);
      if (enemyDistanceSquared > rangeSquared) continue;

      let score: number;
      if (this.targetingMode === "strongest") {
        score = enemy.health;
      } else if (this.targetingMode === "closest") {
        score = enemyDistanceSquared;
      } else if (this.targetingMode === "fastest") {
        score = enemy.baseSpeed;
      } else {
        score = enemy.distanceAlongPath;
      }

      const isBetter = this.targetingMode === "closest" ? score < bestScore : score > bestScore;
      if (isBetter) {
        bestScore = score;
        bestTarget = enemy;
      }
    }

    return bestTarget;
  }
}
