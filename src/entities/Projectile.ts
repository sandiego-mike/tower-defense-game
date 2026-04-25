import { Enemy } from "./Enemy";
import { AssetManager } from "../systems/AssetManager";
import { ProjectileImpact, TowerLevelStats, Vector2, distanceSquared } from "../types";

export class Projectile {
  position: Vector2;
  previousPosition: Vector2;
  isDone = false;
  private target!: Enemy;
  private stats!: TowerLevelStats;
  private color = "#ffffff";
  private spriteKey: string | undefined;

  constructor(
    start: Vector2,
    target: Enemy,
    stats: TowerLevelStats,
    color: string,
    spriteKey: string | undefined
  ) {
    this.position = { x: start.x, y: start.y };
    this.previousPosition = { x: start.x, y: start.y };
    this.reset(start, target, stats, color, spriteKey);
  }

  reset(start: Vector2, target: Enemy, stats: TowerLevelStats, color: string, spriteKey: string | undefined): void {
    this.position.x = start.x;
    this.position.y = start.y;
    this.previousPosition.x = start.x;
    this.previousPosition.y = start.y;
    this.target = target;
    this.stats = stats;
    this.color = color;
    this.spriteKey = spriteKey;
    this.isDone = false;
  }

  get hasValidTarget(): boolean {
    return !this.target.isDead && !this.target.reachedBase;
  }

  update(deltaTime: number, enemies: Enemy[]): ProjectileImpact | null {
    if (this.isDone || this.target.isDead || this.target.reachedBase) {
      this.isDone = true;
      return null;
    }

    const targetDistanceSquared = distanceSquared(this.position, this.target.position);
    const stepDistance = this.stats.projectileSpeed * deltaTime;
    const hitDistance = this.target.radius + 4;

    if (targetDistanceSquared <= stepDistance * stepDistance || targetDistanceSquared <= hitDistance * hitDistance) {
      return this.impact(enemies);
    }

    const targetDistance = Math.sqrt(targetDistanceSquared);
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
    this.position.x += ((this.target.position.x - this.position.x) / targetDistance) * stepDistance;
    this.position.y += ((this.target.position.y - this.position.y) / targetDistance) * stepDistance;
    return null;
  }

  draw(ctx: CanvasRenderingContext2D, assets: AssetManager): void {
    const sprite = assets.getImage(this.spriteKey);
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.38;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.previousPosition.x, this.previousPosition.y);
    ctx.lineTo(this.position.x, this.position.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    if (sprite) {
      ctx.drawImage(sprite, this.position.x - 7, this.position.y - 7, 14, 14);
    } else {
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  isFarOutsideViewport(width: number, height: number, padding: number): boolean {
    return (
      this.position.x < -padding ||
      this.position.x > width + padding ||
      this.position.y < -padding ||
      this.position.y > height + padding
    );
  }

  private impact(enemies: Enemy[]): ProjectileImpact {
    const impactPosition = this.target.position;
    if (this.stats.splashRadius) {
      const splashRadiusSquared = this.stats.splashRadius * this.stats.splashRadius;
      for (const enemy of enemies) {
        if (!enemy.isDead && !enemy.reachedBase && distanceSquared(enemy.position, impactPosition) <= splashRadiusSquared) {
          enemy.takeDamage(this.stats.damage);
        }
      }
    } else {
      this.target.takeDamage(this.stats.damage);
    }

    if (this.stats.slowAmount && this.stats.slowDuration && !this.target.isDead) {
      this.target.applySlow(this.stats.slowAmount, this.stats.slowDuration);
    }

    this.isDone = true;
    return {
      position: impactPosition,
      color: this.color,
      splashRadius: this.stats.splashRadius,
      appliedSlow: Boolean(this.stats.slowAmount && this.stats.slowDuration)
    };
  }
}
