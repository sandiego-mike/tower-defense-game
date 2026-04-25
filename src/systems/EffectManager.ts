import { Vector2 } from "../types";

type Effect = {
  type: "burst" | "ring";
  position: Vector2;
  color: string;
  radius: number;
  maxRadius: number;
  life: number;
  duration: number;
};

export class EffectManager {
  private static readonly MAX_EFFECTS = 80;
  private readonly effects: Effect[] = [];
  private readonly pool: Effect[] = [];

  get activeCount(): number {
    return this.effects.length;
  }

  update(deltaTime: number): void {
    for (const effect of this.effects) {
      effect.life -= deltaTime;
      const progress = 1 - effect.life / effect.duration;
      effect.radius = effect.maxRadius * progress;
    }

    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      if (this.effects[index].life <= 0) {
        this.pool.push(this.effects[index]);
        const lastEffect = this.effects.pop();
        if (lastEffect && index < this.effects.length) {
          this.effects[index] = lastEffect;
        }
      }
    }
  }

  clear(): void {
    for (const effect of this.effects) {
      this.pool.push(effect);
    }
    this.effects.length = 0;
  }

  addImpact(position: Vector2, color: string): void {
    this.addEffect("burst", position, color, 18, 0.22);
  }

  addSplash(position: Vector2, radius: number, color: string): void {
    this.addEffect("ring", position, color, radius, 0.34);
  }

  addBasePulse(position: Vector2): void {
    this.addEffect("ring", position, "#ef4444", 70, 0.42);
  }

  draw(ctx: CanvasRenderingContext2D, isVisible?: (x: number, y: number, radius: number) => boolean): { rendered: number; culled: number } {
    let rendered = 0;
    let culled = 0;

    ctx.save();
    for (const effect of this.effects) {
      if (isVisible && !isVisible(effect.position.x, effect.position.y, effect.radius)) {
        culled += 1;
        continue;
      }

      rendered += 1;
      const alpha = Math.max(0, effect.life / effect.duration);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = effect.color;
      ctx.fillStyle = effect.color;
      ctx.lineWidth = effect.type === "ring" ? 3 : 2;
      ctx.beginPath();
      ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
      if (effect.type === "ring") {
        ctx.stroke();
      } else {
        ctx.fill();
      }
    }
    ctx.restore();
    return { rendered, culled };
  }

  private addEffect(type: Effect["type"], position: Vector2, color: string, maxRadius: number, duration: number): void {
    const effect = this.pool.pop() ?? {
      type,
      position: { x: position.x, y: position.y },
      color,
      radius: 0,
      maxRadius,
      life: duration,
      duration
    };

    effect.type = type;
    effect.position.x = position.x;
    effect.position.y = position.y;
    effect.color = color;
    effect.radius = 0;
    effect.maxRadius = maxRadius;
    effect.life = duration;
    effect.duration = duration;

    if (this.effects.length < EffectManager.MAX_EFFECTS) {
      this.effects.push(effect);
      return;
    }

    let oldestIndex = 0;
    let lowestLife = this.effects[0].life;
    for (let index = 1; index < this.effects.length; index += 1) {
      if (this.effects[index].life < lowestLife) {
        oldestIndex = index;
        lowestLife = this.effects[index].life;
      }
    }

    this.pool.push(this.effects[oldestIndex]);
    this.effects[oldestIndex] = effect;
  }
}
