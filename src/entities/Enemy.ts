import { AssetManager } from "../systems/AssetManager";
import { PathManager } from "../systems/PathManager";
import { BossVisualConfig, EnemyConfig, EnemySpriteAnimationConfig, EnemySpriteOption, Vector2, clamp } from "../types";

export class Enemy {
  private static readonly CROWD_THRESHOLD = 30;

  position: Vector2;
  readonly maxHealth: number;
  health: number;
  readonly baseSpeed: number;
  readonly radius: number;
  readonly lifeDamage: number;
  readonly reward: number;
  progress = 0;
  currentSegmentIndex = 0;
  distanceAlongPath = 0;
  totalPathDistance = 0;
  normalizedPathProgress = 0;
  reachedBase = false;
  isDead = false;

  private slowTimer = 0;
  private slowMultiplier = 1;
  private animationTime = 0;
  private facingAngle = Math.PI / 2;
  private hitFlashTimer = 0;
  private recentHitTimer = 0;
  private spawnPulseTimer = 0;

  constructor(
    private readonly pathManager: PathManager,
    health: number,
    speed: number,
    reward: number,
    readonly config: EnemyConfig
  ) {
    const start = pathManager.startPoint;
    this.position = { x: start.x, y: start.y };
    this.maxHealth = health;
    this.health = health;
    this.baseSpeed = speed;
    this.radius = config.radius;
    this.lifeDamage = config.lifeDamage;
    this.reward = reward;
    this.totalPathDistance = pathManager.totalDistance;
    this.spawnPulseTimer = config.id === "boss" ? 0.2 : 0;
    this.updateFacingAngle();
  }

  update(deltaTime: number): void {
    if (this.isDead || this.reachedBase) return;
    this.animationTime += deltaTime;

    if (this.slowTimer > 0) {
      this.slowTimer -= deltaTime;
      if (this.slowTimer <= 0) {
        this.slowMultiplier = 1;
      }
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - deltaTime);
    }
    if (this.recentHitTimer > 0) {
      this.recentHitTimer = Math.max(0, this.recentHitTimer - deltaTime);
    }
    if (this.spawnPulseTimer > 0) {
      this.spawnPulseTimer = Math.max(0, this.spawnPulseTimer - deltaTime);
    }

    const segment = this.pathManager.getSegment(this.currentSegmentIndex);
    if (!segment) {
      this.reachedBase = true;
      this.updatePathProgressCache(0);
      return;
    }
    this.updateFacingAngle();

    const stepDistance = this.baseSpeed * this.slowMultiplier * deltaTime;
    const remainingX = segment.end.x - this.position.x;
    const remainingY = segment.end.y - this.position.y;
    const remaining = Math.sqrt(remainingX * remainingX + remainingY * remainingY);

    if (remaining <= stepDistance) {
      this.position.x = segment.end.x;
      this.position.y = segment.end.y;
      this.updatePathProgressCache(remaining);
      this.currentSegmentIndex += 1;
      if (this.currentSegmentIndex >= this.pathManager.segments.length) {
        this.reachedBase = true;
      }
      return;
    }

    const directionX = remainingX / remaining;
    const directionY = remainingY / remaining;
    this.position.x += directionX * stepDistance;
    this.position.y += directionY * stepDistance;
    this.updatePathProgressCache(stepDistance);
  }

  takeDamage(amount: number): void {
    this.health = clamp(this.health - amount, 0, this.maxHealth);
    if (amount > 0) {
      this.recentHitTimer = 0.45;
      if (this.config.id === "boss") {
        this.hitFlashTimer = 0.12;
      }
    }
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  applySlow(amount: number, duration: number): void {
    this.slowMultiplier = Math.min(this.slowMultiplier, 1 - amount);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    assets: AssetManager,
    spriteOptions: readonly EnemySpriteOption[],
    activeEnemyCount: number,
    showHealthBars = true,
    showDebugHitboxes = false,
    forceHealthBar = false
  ): void {
    ctx.save();
    const bob = this.config.id === "boss" ? 0 : Math.sin(this.animationTime * this.baseSpeed * 0.08) * Math.min(3, this.radius * 0.14);
    ctx.translate(0, bob);

    const spriteOption = this.getFirstAvailableSprite(assets, spriteOptions);
    if (spriteOption) {
      // Enemy PNGs are resolved by behavior role plus mission theme before falling back
      // to generic art. Collision/path hitboxes still use radius for gameplay balance.
      const drawSize = this.config.renderSize ?? this.radius * 2.6;
      if (this.config.id === "boss" && spriteOption.animation) {
        this.drawBossSprite(ctx, spriteOption, drawSize, activeEnemyCount, showDebugHitboxes);
      } else if (this.config.id === "boss") {
        this.drawBossStaticSprite(ctx, spriteOption, drawSize, showDebugHitboxes);
      } else {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.facingAngle - (spriteOption.spriteForwardAngle ?? this.config.spriteForwardAngle ?? 0));
        ctx.drawImage(spriteOption.image, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      }
    } else {
      // If a PNG is missing or failed to load, keep the original shape rendering as fallback.
      ctx.fillStyle = this.slowTimer > 0 ? "#86efac" : this.config.color;
      this.drawBody(ctx);
    }
    this.drawSlowIndicator(ctx);

    // Compact health bar for quick combat readability.
    const isBoss = this.config.id === "boss";
    const shouldDrawHealthBar = showHealthBars && (isBoss || forceHealthBar || this.health < this.maxHealth || this.recentHitTimer > 0);
    if (shouldDrawHealthBar) {
      const barWidth = isBoss ? Math.max(70, this.radius * 3.2) : Math.max(30, this.radius * 2.2);
      const barHeight = isBoss ? 8 : 5;
      const barOffset = isBoss ? 20 : 14;
      const healthPercent = this.health / this.maxHealth;
      ctx.fillStyle = "#2f3542";
      ctx.fillRect(this.position.x - barWidth / 2, this.position.y - this.radius - barOffset, barWidth, barHeight);
      ctx.fillStyle = isBoss ? "#38bdf8" : "#f8fafc";
      ctx.fillRect(this.position.x - barWidth / 2, this.position.y - this.radius - barOffset, barWidth * healthPercent, barHeight);
    }
    if (showDebugHitboxes) {
      this.drawHitboxDebug(ctx);
    }
    ctx.restore();
  }

  private getFirstAvailableSprite(
    assets: AssetManager,
    spriteOptions: readonly EnemySpriteOption[]
  ): { image: HTMLImageElement | HTMLCanvasElement; spriteForwardAngle?: number; animation?: EnemySpriteAnimationConfig; bossVisual?: BossVisualConfig } | null {
    for (const option of spriteOptions) {
      const animatedImage = option.animation ? assets.getImage(option.animation.spriteSheetKey) : null;
      if (animatedImage && option.animation) {
        return {
          image: animatedImage,
          spriteForwardAngle: option.spriteForwardAngle,
          animation: option.animation,
          bossVisual: option.bossVisual
        };
      }

      const staticImage = assets.getImage(option.key);
      if (staticImage) {
        return {
          image: staticImage,
          spriteForwardAngle: option.spriteForwardAngle,
          animation: undefined,
          bossVisual: option.bossVisual
        };
      }
    }

    return null;
  }

  private drawAnimatedSprite(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement | HTMLCanvasElement,
    animation: EnemySpriteAnimationConfig,
    bossVisual: BossVisualConfig | undefined,
    drawSize: number,
    activeEnemyCount: number
  ): void {
    const safeFrameCount = Math.max(1, animation.frameCount);
    const crowdedFrameRate = animation.crowdedFrameRate ?? bossVisual?.frameRate ?? animation.frameRate;
    const targetFrameRate =
      activeEnemyCount > Enemy.CROWD_THRESHOLD ? crowdedFrameRate : (bossVisual?.frameRate ?? animation.frameRate);
    const safeFrameRate = Math.max(1, Math.min(6, targetFrameRate));
    const frameDuration = 1 / safeFrameRate;
    const rawFrameIndex = Math.floor(this.animationTime / frameDuration);
    const frameIndex = this.getFrameIndex(rawFrameIndex, safeFrameCount, animation.loop, bossVisual?.pingPong ?? false);
    const displayWidth = bossVisual?.displayWidth ?? drawSize;
    const displayHeight = bossVisual?.displayHeight ?? drawSize;
    const anchorX = bossVisual?.anchorX ?? 0.5;
    const anchorY = bossVisual?.anchorY ?? 0.5;
    const destinationX = -displayWidth * anchorX;
    const destinationY = -displayHeight * anchorY;

    // Boss-only sprite sheets are assumed to be laid out horizontally.
    // Frame cropping uses the raw sprite sheet dimensions, while display size and
    // anchor keep the boss visually centered even if the frame itself is very tall.
    ctx.drawImage(
      image,
      frameIndex * animation.frameWidth,
      0,
      animation.frameWidth,
      animation.frameHeight,
      destinationX,
      destinationY,
      displayWidth,
      displayHeight
    );
  }

  private drawBossSprite(
    ctx: CanvasRenderingContext2D,
    spriteOption: {
      image: HTMLImageElement | HTMLCanvasElement;
      spriteForwardAngle?: number;
      animation?: EnemySpriteAnimationConfig;
      bossVisual?: BossVisualConfig;
    },
    drawSize: number,
    activeEnemyCount: number,
    showDebugVisuals: boolean
  ): void {
    const animation = spriteOption.animation;
    if (!animation) return;

    const bossVisual = spriteOption.bossVisual;
    const breathingAmplitude = bossVisual?.breathingScaleAmount ?? 0.012;
    const breathingRate = bossVisual?.breathingRate ?? 0.42;
    const shadowEnabled = bossVisual?.shadowEnabled ?? true;
    const shadowOpacity = bossVisual?.shadowOpacity ?? 0.24;
    const hitFlashDuration = animation.hitFlashDuration ?? 0.12;
    const spawnPulseDuration = animation.spawnPulseDuration ?? 0.2;
    const breathingScale = 1 + breathingAmplitude * ((Math.sin(this.animationTime * breathingRate * Math.PI * 2) + 1) * 0.5);
    const spawnPulseProgress = spawnPulseDuration > 0 ? this.spawnPulseTimer / spawnPulseDuration : 0;
    const spawnScaleBoost = spawnPulseProgress > 0 ? 0.14 * spawnPulseProgress : 0;
    const visualScale = breathingScale + spawnScaleBoost;
    const rotation = this.facingAngle - (spriteOption.spriteForwardAngle ?? this.config.spriteForwardAngle ?? 0);

    if (shadowEnabled) {
      this.drawBossShadow(ctx, bossVisual, drawSize, shadowOpacity, breathingAmplitude, breathingScale);
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(rotation);
    ctx.scale(visualScale, visualScale);
    this.drawAnimatedSprite(ctx, spriteOption.image, animation, bossVisual, drawSize, activeEnemyCount);

    if (this.hitFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.42 * (this.hitFlashTimer / hitFlashDuration);
      ctx.globalCompositeOperation = "screen";
      this.drawAnimatedSprite(ctx, spriteOption.image, animation, bossVisual, drawSize, activeEnemyCount);
      ctx.restore();
    }

    if (showDebugVisuals) {
      this.drawBossDebugOverlay(ctx, animation, bossVisual, drawSize);
    }

    ctx.restore();
  }

  private drawBossStaticSprite(
    ctx: CanvasRenderingContext2D,
    spriteOption: {
      image: HTMLImageElement | HTMLCanvasElement;
      spriteForwardAngle?: number;
      bossVisual?: BossVisualConfig;
    },
    drawSize: number,
    showDebugVisuals: boolean
  ): void {
    const bossVisual = spriteOption.bossVisual;
    const displayWidth = bossVisual?.displayWidth ?? drawSize;
    const displayHeight = bossVisual?.displayHeight ?? drawSize;
    const anchorX = bossVisual?.anchorX ?? 0.5;
    const anchorY = bossVisual?.anchorY ?? 0.5;
    const destinationX = -displayWidth * anchorX;
    const destinationY = -displayHeight * anchorY;
    const rotation = this.facingAngle - (spriteOption.spriteForwardAngle ?? this.config.spriteForwardAngle ?? 0);
    const shadowEnabled = bossVisual?.shadowEnabled ?? true;
    const shadowOpacity = bossVisual?.shadowOpacity ?? 0.24;
    const breathingAmount = bossVisual?.breathingScaleAmount ?? 0.012;
    const breathingRate = bossVisual?.breathingRate ?? 0.42;
    const breathingScale = 1 + breathingAmount * ((Math.sin(this.animationTime * breathingRate * Math.PI * 2) + 1) * 0.5);

    if (shadowEnabled) {
      this.drawBossShadow(ctx, bossVisual, drawSize, shadowOpacity, breathingAmount, breathingScale);
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(rotation);
    ctx.scale(breathingScale, breathingScale);
    ctx.drawImage(spriteOption.image, destinationX, destinationY, displayWidth, displayHeight);

    if (this.hitFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(spriteOption.image, destinationX, destinationY, displayWidth, displayHeight);
      ctx.restore();
    }

    if (showDebugVisuals) {
      this.drawBossDebugOverlay(ctx, undefined, bossVisual, drawSize);
    }

    ctx.restore();
  }

  private drawBossShadow(
    ctx: CanvasRenderingContext2D,
    bossVisual: BossVisualConfig | undefined,
    drawSize: number,
    shadowOpacity: number,
    breathingAmount: number,
    breathingScale: number
  ): void {
    const displayWidth = bossVisual?.displayWidth ?? drawSize;
    const displayHeight = bossVisual?.displayHeight ?? drawSize;
    const subtleScale = 1 + (breathingScale - 1) * Math.min(0.35, breathingAmount * 20);
    const shadowWidth = displayWidth * 0.26 * subtleScale;
    const shadowHeight = displayHeight * 0.075 * subtleScale;

    ctx.save();
    ctx.translate(this.position.x, this.position.y + this.radius * 0.9);
    ctx.fillStyle = `rgba(15, 23, 42, ${shadowOpacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBossDebugOverlay(
    ctx: CanvasRenderingContext2D,
    animation: EnemySpriteAnimationConfig | undefined,
    bossVisual: BossVisualConfig | undefined,
    drawSize: number
  ): void {
    const displayWidth = bossVisual?.displayWidth ?? drawSize;
    const displayHeight = bossVisual?.displayHeight ?? drawSize;
    const anchorX = bossVisual?.anchorX ?? 0.5;
    const anchorY = bossVisual?.anchorY ?? 0.5;
    const destinationX = -displayWidth * anchorX;
    const destinationY = -displayHeight * anchorY;

    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(destinationX, destinationY, displayWidth, displayHeight);

    ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.stroke();

    ctx.fillStyle = "rgba(34, 197, 94, 0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(244, 114, 182, 0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (animation) {
      const frameWidth = Math.max(1, animation.frameWidth * (displayWidth / animation.frameWidth));
      const frameHeight = Math.max(1, animation.frameHeight * (displayHeight / animation.frameHeight));
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.strokeRect(-frameWidth * anchorX, -frameHeight * anchorY, frameWidth, frameHeight);
    }

    ctx.restore();
  }

  private getFrameIndex(rawFrameIndex: number, frameCount: number, loop: boolean, pingPong: boolean): number {
    if (frameCount <= 1) return 0;
    if (!loop) return Math.min(rawFrameIndex, frameCount - 1);
    if (!pingPong) return rawFrameIndex % frameCount;

    const cycleLength = frameCount * 2 - 2;
    const cycleIndex = rawFrameIndex % cycleLength;
    return cycleIndex < frameCount ? cycleIndex : cycleLength - cycleIndex;
  }

  private drawSlowIndicator(ctx: CanvasRenderingContext2D): void {
    if (this.slowTimer <= 0) return;

    ctx.strokeStyle = "rgba(134, 239, 172, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawHitboxDebug(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = "rgba(244, 114, 182, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private updateFacingAngle(): void {
    const segment = this.pathManager.getSegment(this.currentSegmentIndex);
    if (!segment) return;
    this.facingAngle = Math.atan2(segment.end.y - this.position.y, segment.end.x - this.position.x);
  }

  private updatePathProgressCache(distanceMoved: number): void {
    this.distanceAlongPath += distanceMoved;
    this.progress = this.distanceAlongPath;
    this.totalPathDistance = this.pathManager.totalDistance;
    this.normalizedPathProgress = this.totalPathDistance > 0 ? clamp(this.distanceAlongPath / this.totalPathDistance, 0, 1) : 0;
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position;
    const r = this.radius;

    ctx.beginPath();
    if (this.config.shape === "circle") {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else if (this.config.shape === "diamond") {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
    } else if (this.config.shape === "square") {
      ctx.rect(x - r, y - r, r * 2, r * 2);
    } else {
      const sides = this.config.shape === "triangle" ? 3 : 6;
      const startAngle = this.config.shape === "triangle" ? -Math.PI / 2 : Math.PI / 6;
      for (let index = 0; index < sides; index += 1) {
        const angle = startAngle + (index / sides) * Math.PI * 2;
        const pointX = x + Math.cos(angle) * r;
        const pointY = y + Math.sin(angle) * r;
        if (index === 0) {
          ctx.moveTo(pointX, pointY);
        } else {
          ctx.lineTo(pointX, pointY);
        }
      }
      ctx.closePath();
    }

    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
