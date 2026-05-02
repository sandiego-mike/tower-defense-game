import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Tower } from "../entities/Tower";
import { DIFFICULTY_CONFIGS } from "../config/difficulties";
import { ENEMY_CONFIGS } from "../config/enemies";
import { ECONOMY_CONFIG, SCORE_CONFIG } from "../config/economy";
import { CAMERA_CONFIG, GENERIC_ENEMY_SPRITE_KEYS, MISSION_CONFIGS, MISSION_ORDER, MISSION_THEME_CONFIGS } from "../config/missions";
import { getPathStyleForTheme, PROTOTYPE_FOREST_THEME } from "../config/theme";
import { TOWER_CONFIGS } from "../config/towers";
import { DEFAULT_WAVE_CONFIG } from "../config/waves";
import { InputManager } from "../input/InputManager";
import { AssetManager } from "../systems/AssetManager";
import { CameraManager } from "../systems/CameraManager";
import { EffectManager } from "../systems/EffectManager";
import { PathManager } from "../systems/PathManager";
import { ProgressionManager } from "../systems/ProgressionManager";
import { SoundManager } from "../systems/SoundManager";
import { AmbientKey } from "../config/sounds";
import { estimateTowerDps, validateBalance } from "../systems/BalanceValidator";
import { ViewZoom } from "../systems/ViewZoom";
import { WaveManager } from "../systems/WaveManager";
import { UIManager } from "../ui/UIManager";
import {
  DebugBalanceInfo,
  DifficultyId,
  EnemyType,
  EnemySpriteOption,
  GameState,
  MissionId,
  RunResult,
  SelectedTowerInfo,
  TargetingMode,
  TowerLevelStats,
  TowerType,
  Vector2,
  clamp,
  distanceSquared
} from "../types";

export class Game {
  private static readonly GAME_WIDTH = 1536;
  private static readonly GAME_HEIGHT = 864;
  private static readonly VIEWPORT_PADDING = 100;

  readonly path: Vector2[] = [];
  selectedTowerType: TowerType | null = null;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly pathManager = new PathManager();
  private readonly camera = new CameraManager(CAMERA_CONFIG);
  private readonly viewZoom: ViewZoom;
  private readonly towers: Tower[] = [];
  private readonly enemies: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly projectilePool: Projectile[] = [];
  private readonly projectileFactory = (
    start: Vector2,
    target: Enemy,
    stats: TowerLevelStats,
    color: string,
    spriteKey: string | undefined
  ): Projectile => this.createProjectile(start, target, stats, color, spriteKey);
  private readonly effects = new EffectManager();
  private readonly sound = new SoundManager();
  private readonly progression = new ProgressionManager();
  private readonly ui: UIManager;
  private readonly input: InputManager;
  private waveManager: WaveManager;
  private selectedPlacedTower: Tower | null = null;

  private state: GameState = "menu";
  private life = 100;
  private maxLife = 100;
  private gold = 0;
  private enemiesDefeated = 0;
  private runResult: RunResult | null = null;
  private missionId: MissionId = "green-pass";
  private difficultyId: DifficultyId = "normal";
  private lastTime = 0;
  private width = 960;
  private height = 540;
  private pixelRatio = 1;
  private animationId = 0;
  private feedbackMessage = "";
  private feedbackTimer = 0;
  private screenShakeTimer = 0;
  private screenShakeIntensity = 0;
  private debugMode = false;
  private gameSpeed = 1;
  private fps = 0;
  private fpsSampleTime = 0;
  private fpsSampleFrames = 0;
  private showHealthBars = true;
  private showEffects = true;
  private showDebugHitboxes = false;
  private showCullingBounds = false;
  private resizeTimer = 0;
  private readonly renderStats = {
    renderedEnemies: 0,
    culledEnemies: 0,
    renderedProjectiles: 0,
    culledProjectiles: 0,
    renderedEffects: 0,
    culledEffects: 0
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: AssetManager
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is not available.");
    }

    this.ctx = ctx;
    this.viewZoom = new ViewZoom(canvas);
    this.waveManager = this.createWaveManager();
    this.reportBalanceValidation();
    this.ui = new UIManager(
      (missionId, difficultyId) => this.startMission(missionId, difficultyId),
      () => this.upgradeSelectedTower(),
      () => this.sellSelectedTower(),
      (mode) => this.setSelectedTowerTargetingMode(mode),
      () => this.pause(),
      () => this.resume(),
      () => this.restartMission(),
      () => this.returnToMenu(),
      () => this.continueAfterVictory(),
      () => this.toggleDebugMode(),
      () => this.skipToNextWave(),
      (speed) => this.setGameSpeed(speed),
      () => this.cancelPlacementMode(),
      () => this.toggleHealthBars(),
      () => this.toggleEffects(),
      () => this.toggleDebugHitboxes(),
      () => this.toggleCullingBounds(),
      () => this.resetCamera(),
      () => this.toggleMute(),
      () => this.resetProgress(),
      (missionId) => this.isMissionUnlocked(missionId)
    );
    this.input = new InputManager(canvas, this);
    this.resize();
    window.addEventListener("resize", () => this.scheduleResize());
    window.addEventListener("orientationchange", () => this.scheduleResize());
    window.visualViewport?.addEventListener("resize", () => this.scheduleResize());
  }

  start(): void {
    this.updateUi();
    this.animationId = requestAnimationFrame((time) => this.loop(time));
  }

  startMission(missionId: MissionId, difficultyId: DifficultyId): void {
    this.sound.unlock();
    if (!this.isMissionUnlocked(missionId)) {
      this.showFeedback("Complete the previous mission to unlock this one.");
      this.updateUi();
      return;
    }

    this.sound.stopAllLoops();
    this.missionId = missionId;
    this.difficultyId = difficultyId;
    this.selectedTowerType = null;
    this.state = "playing";
    this.maxLife = DIFFICULTY_CONFIGS[difficultyId].startingLife;
    this.life = this.maxLife;
    this.gold = DIFFICULTY_CONFIGS[difficultyId].startingGold;
    this.enemiesDefeated = 0;
    this.runResult = null;
    this.towers.length = 0;
    this.enemies.length = 0;
    this.clearProjectiles();
    this.effects.clear();
    this.selectedPlacedTower = null;
    this.waveManager = this.createWaveManager();
    this.feedbackMessage = "Wave 1 incoming";
    this.feedbackTimer = 1.4;
    this.screenShakeTimer = 0;
    this.screenShakeIntensity = 0;
    this.buildPath();
    this.resetCamera(true);
    this.sound.fadeInLoop(this.getAmbientKeyForMission(missionId), 1200);
    this.updateUi();
  }

  setPlacementTower(type: TowerType): void {
    this.selectedTowerType = type;
    this.selectedPlacedTower = null;
    this.updateUi();
  }

  toggleTowerPlacement(type: TowerType): void {
    if (this.selectedTowerType === type) {
      this.cancelPlacementMode();
      return;
    }

    this.setPlacementTower(type);
  }

  cancelPlacementMode(): void {
    this.selectedTowerType = null;
    this.updateUi();
  }

  tryPlaceTower(position: Vector2, towerType = this.selectedTowerType): boolean {
    this.sound.unlock();
    if (this.state !== "playing") return false;
    if (!towerType) return false;

    const validation = this.validateTowerPlacement(position, towerType);
    if (!validation.canPlace) {
      this.showFeedback(validation.reason);
      this.sound.invalidPlacement();
      return false;
    }

    const placementCost = TOWER_CONFIGS[towerType].placementCost;
    if (!this.canAfford(placementCost)) {
      this.showFeedback(`Need ${placementCost} gold to place ${TOWER_CONFIGS[towerType].label}.`);
      this.sound.invalidPlacement();
      return false;
    }

    this.spendGold(placementCost);
    const tower = new Tower(position, towerType, placementCost);
    this.towers.push(tower);
    this.selectedPlacedTower = null;
    this.selectedTowerType = null;
    this.sound.towerPlaced();
    this.updateUi();
    return true;
  }

  handleMapPress(position: Vector2): void {
    this.sound.unlock();
    if (this.state !== "playing") return;

    if (this.selectedTowerType) {
      this.tryPlaceTower(position);
      return;
    }

    const tower = this.findTowerAt(position);
    if (tower) {
      this.selectedPlacedTower = tower;
      this.selectedTowerType = null;
      this.updateUi();
      return;
    }

    this.selectedPlacedTower = null;
    this.updateUi();
  }

  screenToWorld(position: Vector2): Vector2 {
    if (!CAMERA_CONFIG.useCameraManager) return position;
    return this.camera.screenToWorld(position);
  }

  panCameraByScreenDelta(deltaX: number, deltaY: number): void {
    if (CAMERA_CONFIG.useCameraManager) {
      this.camera.panByScreenDelta(deltaX, deltaY);
      return;
    }
    this.viewZoom.panByCanvasDelta(deltaX, deltaY);
  }

  zoomCameraAtScreenPoint(nextZoom: number, screenPoint: Vector2): void {
    if (CAMERA_CONFIG.useCameraManager) {
      if (!CAMERA_CONFIG.allowPinchZoom) return;
      this.camera.zoomAtScreenPoint(nextZoom, screenPoint);
      return;
    }
    this.viewZoom.zoomAtCanvasPoint(nextZoom, screenPoint);
  }

  zoomViewBy(multiplier: number): void {
    if (CAMERA_CONFIG.useCameraManager) {
      this.camera.zoomAtScreenPoint(this.camera.zoom * multiplier, {
        x: this.width / 2,
        y: this.height / 2
      });
      return;
    }
    this.viewZoom.zoomBy(multiplier);
  }

  resetCamera(silent = false): void {
    if (CAMERA_CONFIG.useCameraManager) {
      this.camera.resetToDefault(this.pathManager.getBounds());
    } else {
      this.viewZoom.reset();
    }
    if (!silent) {
      this.showFeedback("Camera reset");
      this.updateUi();
    }
  }

  get cameraZoom(): number {
    if (CAMERA_CONFIG.useCameraManager) return this.camera.zoom;
    return this.viewZoom.getZoom();
  }

  isViewZoomActive(): boolean {
    return !CAMERA_CONFIG.useCameraManager && this.viewZoom.isActive();
  }

  upgradeSelectedTower(): void {
    if (!this.selectedPlacedTower) return;
    const upgradeCost = this.selectedPlacedTower.nextUpgradeCost;
    if (upgradeCost === null) return;
    if (!this.canAfford(upgradeCost)) {
      this.showFeedback(`Need ${upgradeCost} gold to upgrade.`);
      return;
    }

    this.spendGold(upgradeCost);
    this.selectedPlacedTower.upgrade();
    this.selectedPlacedTower.recordUpgradeCost(upgradeCost);
    this.sound.towerUpgraded();
    this.updateUi();
  }

  sellSelectedTower(): void {
    if (!this.selectedPlacedTower) return;

    const refund = this.getTowerSellRefund(this.selectedPlacedTower);
    this.gold += refund;
    const towerIndex = this.towers.indexOf(this.selectedPlacedTower);
    if (towerIndex >= 0) {
      this.towers.splice(towerIndex, 1);
    }
    this.selectedPlacedTower = null;
    this.showFeedback(`Sold tower for ${refund} gold.`);
    this.sound.towerSold();
    this.updateUi();
  }

  setSelectedTowerTargetingMode(mode: TargetingMode): void {
    if (!this.selectedPlacedTower) return;
    this.selectedPlacedTower.setTargetingMode(mode);
    this.updateUi();
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.sound.pauseAllLoops();
    this.updateUi();
  }

  resume(): void {
    this.sound.unlock();
    if (this.state !== "paused") return;
    this.state = "playing";
    this.lastTime = performance.now();
    this.sound.resumeAllLoops();
    this.updateUi();
  }

  restartMission(): void {
    this.startMission(this.missionId, this.difficultyId);
  }

  returnToMenu(): void {
    this.sound.fadeOutAllLoops(800);
    this.state = "menu";
    this.towers.length = 0;
    this.enemies.length = 0;
    this.clearProjectiles();
    this.effects.clear();
    this.selectedPlacedTower = null;
    this.waveManager = this.createWaveManager();
    this.runResult = null;
    this.updateUi();
  }

  continueAfterVictory(): void {
    if (this.state !== "won") return;

    const currentIndex = MISSION_ORDER.indexOf(this.missionId);
    const nextMissionId = MISSION_ORDER[currentIndex + 1];
    if (nextMissionId) {
      this.startMission(nextMissionId, this.difficultyId);
      return;
    }

    this.returnToMenu();
  }

  private loop(time: number): void {
    const deltaTime = Math.min((time - this.lastTime) / 1000 || 0, 0.05);
    this.lastTime = time;
    this.updatePerformanceDiagnostics(deltaTime);

    if (this.state === "playing") {
      this.update(deltaTime * this.gameSpeed);
    } else {
      if (this.showEffects) this.effects.update(deltaTime);
      this.updateFeedback(deltaTime);
      this.updateScreenShake(deltaTime);
    }

    this.draw();
    this.animationId = requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  private update(deltaTime: number): void {
    const spawnRequests = this.waveManager.update(
      deltaTime,
      this.enemies.length,
      this.enemies
    );
    for (const request of spawnRequests) {
      const enemyConfig = ENEMY_CONFIGS[request.enemyType];
      const enemy = new Enemy(this.pathManager, request.enemyHealth, request.enemySpeed, request.enemyReward, enemyConfig);
      this.enemies.push(enemy);
      if (request.enemyType === "boss") {
        this.showFeedback("Boss incoming");
        this.sound.bossSpawn();
        if (this.showEffects) this.effects.addSplash(enemy.position, 100, enemyConfig.color);
        this.triggerScreenShake(0.45, 7);
      }
    }

    const waveStartEvent = this.waveManager.consumeWaveStartEvent();
    if (waveStartEvent) {
      this.showFeedback(waveStartEvent.isFinalWave ? "Final wave" : `Wave ${waveStartEvent.waveNumber} started`);
      this.sound.waveStart();
      if (waveStartEvent.isFinalWave) {
        this.triggerScreenShake(0.35, 5);
      }
    }

    for (const enemy of this.enemies) enemy.update(deltaTime);
    for (const tower of this.towers) {
      if (tower.update(deltaTime, this.enemies, this.projectiles, this.projectileFactory)) {
        this.sound.fireTower();
      }
    }
    for (const projectile of this.projectiles) {
      const impact = projectile.update(deltaTime, this.enemies);
      if (!impact) continue;
      if (this.showEffects) this.effects.addImpact(impact.position, impact.color);
      if (impact.splashRadius) {
        if (this.showEffects) this.effects.addSplash(impact.position, impact.splashRadius, impact.color);
      }
      this.sound.enemyHit();
    }

    for (const enemy of this.enemies) {
      if (enemy.reachedBase) {
        enemy.isDead = true;
        this.life = clamp(this.life - enemy.lifeDamage, 0, this.maxLife);
        if (this.showEffects) this.effects.addBasePulse(enemy.position);
        this.triggerScreenShake(0.24, 5);
      }
    }

    if (this.showEffects) this.effects.update(deltaTime);
    this.updateFeedback(deltaTime);
    this.updateScreenShake(deltaTime);
    this.removeFinishedEntities();
    this.checkEndState();
    this.updateUi();
  }

  private draw(): void {
    this.resetRenderStats();
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    const shakeOffset = this.getScreenShakeOffset();
    this.ctx.translate(shakeOffset.x, shakeOffset.y);
    // TODO: Re-enable CameraManager transforms once world rendering and input
    // are validated together. For now, restore the pre-camera canvas-space draw path.
    if (CAMERA_CONFIG.useCameraManager) {
      this.camera.applyTransform(this.ctx);
    }
    this.drawBackground();
    this.drawPath();

    for (const tower of this.towers) {
      tower.draw(this.ctx, this.assets, tower === this.selectedPlacedTower);
    }

    const hoveredEnemy = this.showHealthBars && this.input.pointerWorldPosition ? this.findEnemyAt(this.input.pointerWorldPosition) : undefined;
    for (const enemy of this.enemies) {
      const enemyVisualRadius = this.getEnemyVisualRadius(enemy);
      if (!this.isCircleInViewport(enemy.position.x, enemy.position.y, enemyVisualRadius, Game.VIEWPORT_PADDING)) {
        this.renderStats.culledEnemies += 1;
        continue;
      }

      this.renderStats.renderedEnemies += 1;
      enemy.draw(
        this.ctx,
        this.assets,
        this.getEnemySpriteOptions(enemy.config.id),
        this.enemies.length,
        this.showHealthBars,
        this.showDebugHitboxes,
        enemy === hoveredEnemy
      );
      if (this.debugMode) this.drawEnemyDebugLabel(enemy);
    }
    for (const projectile of this.projectiles) {
      if (!this.isProjectileInViewport(projectile, Game.VIEWPORT_PADDING)) {
        this.renderStats.culledProjectiles += 1;
        continue;
      }
      this.renderStats.renderedProjectiles += 1;
      projectile.draw(this.ctx, this.assets);
    }
    if (this.showEffects) {
      const effectStats = this.effects.draw(this.ctx, (x, y, radius) => this.isCircleInViewport(x, y, radius, Game.VIEWPORT_PADDING));
      this.renderStats.renderedEffects = effectStats.rendered;
      this.renderStats.culledEffects = effectStats.culled;
    }
    this.drawPlacementPreview();
    if (this.debugMode && CAMERA_CONFIG.useCameraManager) {
      this.drawWorldDebugOverlay();
    }
    if (this.debugMode && this.showCullingBounds) {
      this.drawCullingBounds();
    }
    this.ctx.restore();
  }

  private drawBackground(): void {
    this.ctx.save();
    const mission = MISSION_CONFIGS[this.missionId];
    const background = this.assets.getImage(mission.backgroundImageKey);

    if (background) {
      this.drawCoverImage(background);
      this.ctx.restore();
      return;
    }

    this.ctx.fillStyle = PROTOTYPE_FOREST_THEME.backgroundColor;
    this.ctx.fillRect(0, 0, this.getWorldWidth(), this.getWorldHeight());

    this.ctx.strokeStyle = PROTOTYPE_FOREST_THEME.backgroundGridColor;
    this.ctx.lineWidth = 1;
    const gridSize = 48;
    for (let x = 0; x <= this.getWorldWidth(); x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.getWorldHeight());
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.getWorldHeight(); y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.getWorldWidth(), y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawCoverImage(image: HTMLImageElement | HTMLCanvasElement): void {
    // Map backgrounds use cover scaling: fill the whole responsive canvas, preserve
    // aspect ratio, and crop only the overflow. Path points and gameplay stay unchanged.
    const imageWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const imageHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
    if (imageWidth <= 0 || imageHeight <= 0) return;

    const scale = Math.max(this.getWorldWidth() / imageWidth, this.getWorldHeight() / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const drawX = (this.getWorldWidth() - drawWidth) / 2;
    const drawY = (this.getWorldHeight() - drawHeight) / 2;
    this.ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  private drawPath(): void {
    const mission = MISSION_CONFIGS[this.missionId];
    const pathStyle = getPathStyleForTheme(mission.themeId);

    this.ctx.save();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = 46;
    this.ctx.strokeStyle = pathStyle.outerColor;
    this.strokePath();

    this.ctx.lineWidth = 32;
    this.ctx.strokeStyle = pathStyle.innerColor;
    this.strokePath();

    if (pathStyle.highlightColor) {
      this.ctx.save();
      this.ctx.globalAlpha = pathStyle.highlightAlpha ?? 0.24;
      this.ctx.lineWidth = pathStyle.highlightWidth ?? 5;
      this.ctx.strokeStyle = pathStyle.highlightColor;
      this.strokePath();
      this.ctx.restore();
    }

    if (pathStyle.accentColor) {
      this.ctx.save();
      this.ctx.globalAlpha = pathStyle.accentAlpha ?? 0.22;
      this.ctx.lineWidth = pathStyle.accentWidth ?? 3;
      this.ctx.strokeStyle = pathStyle.accentColor;
      this.ctx.setLineDash(pathStyle.accentDash ?? [14, 26]);
      this.strokePath();
      this.ctx.restore();
    }

    const start = this.path[0];
    const end = this.path[this.path.length - 1];
    this.ctx.fillStyle = PROTOTYPE_FOREST_THEME.startColor;
    this.ctx.fillRect(start.x - 16, start.y - 16, 32, 32);
    this.ctx.fillStyle = PROTOTYPE_FOREST_THEME.baseColor;
    this.ctx.fillRect(end.x - 19, end.y - 19, 38, 38);
    this.ctx.restore();
  }

  private drawPlacementPreview(): void {
    const position = this.input.pointerWorldPosition;
    const type = this.input.previewTower ?? this.selectedTowerType;
    if (!position || this.state !== "playing") return;
    if (!type) return;

    const config = TOWER_CONFIGS[type];
    const stats = config.levels[0];
    const validation = this.validateTowerPlacement(position, type);

    this.ctx.save();
    this.ctx.globalAlpha = 0.32;
    this.ctx.fillStyle = validation.canPlace ? config.color : "#ef4444";
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, stats.range, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = 0.85;
    const previewSize = Math.max(28, (config.renderSize ?? 28) * 0.55);
    this.ctx.fillRect(position.x - previewSize / 2, position.y - previewSize / 2, previewSize, previewSize);
    this.ctx.restore();
  }

  private strokePath(): void {
    this.ctx.beginPath();
    this.ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let index = 1; index < this.path.length; index += 1) {
      this.ctx.lineTo(this.path[index].x, this.path[index].y);
    }
    this.ctx.stroke();
  }

  private resize(): void {
    this.pixelRatio = 1;
    this.width = Game.GAME_WIDTH;
    this.height = Game.GAME_HEIGHT;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.camera.resize(this.width, this.height);
    this.syncViewZoomEnabled();
    this.resetCamera(true);
    if (!CAMERA_CONFIG.useCameraManager) {
      this.buildPath();
    }
  }

  private syncViewZoomEnabled(): void {
    if (CAMERA_CONFIG.useCameraManager) {
      this.viewZoom.setEnabled(false);
      return;
    }
    const layoutMode = document.documentElement.dataset.layoutMode ?? "";
    const isMobileLayout = layoutMode === "mobilePortrait" || layoutMode === "mobileLandscape";
    this.viewZoom.setEnabled(isMobileLayout);
  }

  private scheduleResize(): void {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.resize(), 100);
  }

  private buildPath(): void {
    const mission = MISSION_CONFIGS[this.missionId];
    this.path.length = 0;
    const pathWidth = CAMERA_CONFIG.useCameraManager ? this.camera.worldWidth : this.width;
    const pathHeight = CAMERA_CONFIG.useCameraManager ? this.camera.worldHeight : this.height;
    this.path.push(...mission.path.map((point) => ({ x: point.x * pathWidth, y: point.y * pathHeight })));
    this.pathManager.rebuild(this.path);
  }

  private isNearPath(position: Vector2, padding: number): boolean {
    return this.pathManager.distanceToPath(position) < padding;
  }

  private removeFinishedEntities(): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      if (this.enemies[index].isDead) {
        if (!this.enemies[index].reachedBase) {
          this.gold += this.enemies[index].reward;
          this.enemiesDefeated += 1;
          if (this.enemies[index].config.id === "boss") {
            this.sound.bossDestroyed();
          } else {
            this.sound.enemyDestroyed();
          }
        }
        this.enemies.splice(index, 1);
      }
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      const worldWidth = this.getWorldWidth();
      const worldHeight = this.getWorldHeight();
      const shouldRecycle =
        projectile.isDone ||
        (!projectile.hasValidTarget && projectile.isFarOutsideWorld(worldWidth, worldHeight, Game.VIEWPORT_PADDING * 2));
      if (shouldRecycle) {
        this.projectilePool.push(this.projectiles[index]);
        const lastProjectile = this.projectiles.pop();
        if (lastProjectile && index < this.projectiles.length) {
          this.projectiles[index] = lastProjectile;
        }
      }
    }
  }

  private checkEndState(): void {
    if (this.life <= 0) {
      if (this.state !== "lost") {
        this.sound.fadeOutAllLoops(1500);
        this.sound.defeat();
        this.triggerScreenShake(0.5, 7);
      }
      this.state = "lost";
      return;
    }

    if (this.waveManager.isComplete && this.enemies.length === 0) {
      if (this.state !== "won") {
        this.runResult = this.calculateRunResult();
        this.progression.completeMission(this.missionId, this.runResult.score, this.runResult.stars);
        this.sound.fadeOutAllLoops(1500);
        this.sound.victory();
        this.triggerScreenShake(0.4, 4);
      }
      this.state = "won";
    }
  }

  private createWaveManager(): WaveManager {
    const difficultyConfig = DIFFICULTY_CONFIGS[this.difficultyId];
    return new WaveManager(DEFAULT_WAVE_CONFIG, ENEMY_CONFIGS, difficultyConfig);
  }

  private getActiveEnemyTypes(): EnemyType[] {
    return [...new Set([...this.waveManager.currentWaveEnemyTypes, ...this.enemies.map((enemy) => enemy.config.id)])];
  }

  private getEnemySpriteOptions(enemyType: EnemyType): EnemySpriteOption[] {
    const mission = MISSION_CONFIGS[this.missionId];
    const theme = MISSION_THEME_CONFIGS[mission.themeId];

    // Rendering resolves visuals as behavior type + current mission theme first.
    // If that themed PNG is missing, AssetManager skips to the generic enemy sprite;
    // if both images are unavailable, Enemy.draw uses its placeholder shape.
    return [
      {
        key: theme.enemySpriteKeys[enemyType],
        spriteForwardAngle: theme.enemySpriteForwardAngles?.[enemyType],
        animation: theme.enemySpriteAnimations?.[enemyType],
        bossVisual: enemyType === "boss" ? theme.bossVisual : undefined
      },
      {
        key: GENERIC_ENEMY_SPRITE_KEYS[enemyType],
        bossVisual: enemyType === "boss" ? theme.bossVisual : undefined
      }
    ];
  }

  private findTowerAt(position: Vector2): Tower | undefined {
    return this.towers.find((tower) => tower.containsPoint(position));
  }

  private findEnemyAt(position: Vector2): Enemy | undefined {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      if (!enemy.isDead && !enemy.reachedBase && distanceSquared(enemy.position, position) <= enemy.radius * enemy.radius) {
        return enemy;
      }
    }
    return undefined;
  }

  private getSelectedTowerInfo(): SelectedTowerInfo | null {
    if (!this.selectedPlacedTower) return null;

    const tower = this.selectedPlacedTower;
    const config = TOWER_CONFIGS[tower.type];
    const stats = tower.stats;
    return {
      type: tower.type,
      label: config.label,
      level: tower.level,
      maxLevel: tower.maxLevel,
      damage: stats.damage,
      range: stats.range,
      fireRate: stats.fireRate,
      upgradeCost: tower.nextUpgradeCost,
      sellRefund: this.getTowerSellRefund(tower),
      totalInvestedGold: tower.totalInvestedGold,
      targetingMode: tower.targetingMode,
      splashRadius: stats.splashRadius,
      slowAmount: stats.slowAmount,
      slowDuration: stats.slowDuration,
      dps: estimateTowerDps(config, tower.level - 1)
    };
  }

  private toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    this.showFeedback(this.debugMode ? "Debug balancing on" : "Debug balancing off");
    this.updateUi();
  }

  private toggleHealthBars(): void {
    this.showHealthBars = !this.showHealthBars;
    this.updateUi();
  }

  private toggleEffects(): void {
    this.showEffects = !this.showEffects;
    if (!this.showEffects) {
      this.effects.clear();
    }
    this.updateUi();
  }

  private toggleDebugHitboxes(): void {
    this.showDebugHitboxes = !this.showDebugHitboxes;
    this.updateUi();
  }

  private toggleCullingBounds(): void {
    this.showCullingBounds = !this.showCullingBounds;
    this.updateUi();
  }

  private toggleMute(): void {
    this.sound.unlock();
    this.sound.toggleMuted();
    this.showFeedback(this.sound.isMuted ? "Sound muted" : "Sound on");
    this.updateUi();
  }

  private resetProgress(): void {
    this.progression.reset();
    this.showFeedback("Progress reset");
    this.updateUi();
  }

  private skipToNextWave(): void {
    if (this.state !== "playing") return;
    if (this.waveManager.skipToNextWave()) {
      this.showFeedback("Skipped to next wave");
    } else {
      this.showFeedback("Already on final wave");
    }
    this.updateUi();
  }

  private setGameSpeed(speed: number): void {
    this.gameSpeed = clamp(speed, 1, 4);
    this.showFeedback(`${this.gameSpeed}x speed`);
    this.updateUi();
  }

  private canAfford(amount: number): boolean {
    return ECONOMY_CONFIG.debugInfiniteGold || this.gold >= amount;
  }

  private spendGold(amount: number): void {
    if (ECONOMY_CONFIG.debugInfiniteGold) return;
    this.gold = Math.max(0, this.gold - amount);
  }

  private getTowerSellRefund(tower: Tower): number {
    return Math.floor(tower.totalInvestedGold * ECONOMY_CONFIG.sellRefundRate);
  }

  private calculateRunResult(): RunResult {
    const difficulty = DIFFICULTY_CONFIGS[this.difficultyId];
    const score = Math.round(
      (this.life * SCORE_CONFIG.lifeMultiplier + this.gold * SCORE_CONFIG.goldMultiplier + this.enemiesDefeated * SCORE_CONFIG.enemyDefeatMultiplier) *
        difficulty.scoreMultiplier
    );
    const stars = score >= SCORE_CONFIG.starThresholds.threeStar ? 3 : score >= SCORE_CONFIG.starThresholds.twoStar ? 2 : 1;

    return {
      score,
      stars,
      enemiesDefeated: this.enemiesDefeated
    };
  }

  private isMissionUnlocked(missionId: MissionId): boolean {
    return this.progression.isUnlocked(missionId, ECONOMY_CONFIG.debugUnlockAllMissions);
  }

  private validateTowerPlacement(position: Vector2, towerType: TowerType): { canPlace: boolean; reason: string } {
    const insideMap =
      position.x >= 18 && position.y >= 18 && position.x <= this.getWorldWidth() - 18 && position.y <= this.getWorldHeight() - 18;
    if (!insideMap) {
      return { canPlace: false, reason: "Place towers inside the map." };
    }

    if (this.isNearPath(position, 42)) {
      return { canPlace: false, reason: "Cannot build on the enemy path." };
    }

    const selectedTowerSize = TOWER_CONFIGS[towerType].renderSize ?? 28;
    if (
      this.towers.some((existingTower) => {
        const minDistance = (existingTower.interactionSize + selectedTowerSize * 0.6) / 2;
        return distanceSquared(existingTower.position, position) < minDistance * minDistance;
      })
    ) {
      return { canPlace: false, reason: "Too close to another tower." };
    }

    return { canPlace: true, reason: "" };
  }

  private showFeedback(message: string): void {
    this.feedbackMessage = message;
    this.feedbackTimer = 1.5;
  }

  private updateFeedback(deltaTime: number): void {
    if (this.feedbackTimer <= 0) return;
    this.feedbackTimer -= deltaTime;
    if (this.feedbackTimer <= 0) {
      this.feedbackMessage = "";
    }
  }

  private triggerScreenShake(duration: number, intensity: number): void {
    this.screenShakeTimer = Math.max(this.screenShakeTimer, duration);
    this.screenShakeIntensity = Math.max(this.screenShakeIntensity, intensity);
  }

  private updateScreenShake(deltaTime: number): void {
    this.screenShakeTimer = Math.max(0, this.screenShakeTimer - deltaTime);
    if (this.screenShakeTimer <= 0) {
      this.screenShakeIntensity = 0;
    }
  }

  private getScreenShakeOffset(): Vector2 {
    if (this.screenShakeTimer <= 0) return { x: 0, y: 0 };
    const falloff = this.screenShakeTimer / 0.5;
    const intensity = this.screenShakeIntensity * Math.min(1, falloff);
    return {
      x: (Math.random() - 0.5) * intensity,
      y: (Math.random() - 0.5) * intensity
    };
  }

  private drawEnemyDebugLabel(enemy: Enemy): void {
    this.ctx.save();
    this.ctx.font = "700 11px system-ui, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "bottom";
    this.ctx.fillStyle = "#f8fafc";
    this.ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
    this.ctx.lineWidth = 3;
    const label = `${Math.ceil(enemy.health)}/${enemy.maxHealth}`;
    this.ctx.strokeText(label, enemy.position.x, enemy.position.y - enemy.radius - 18);
    this.ctx.fillText(label, enemy.position.x, enemy.position.y - enemy.radius - 18);
    this.ctx.restore();
  }

  private resetRenderStats(): void {
    this.renderStats.renderedEnemies = 0;
    this.renderStats.culledEnemies = 0;
    this.renderStats.renderedProjectiles = 0;
    this.renderStats.culledProjectiles = 0;
    this.renderStats.renderedEffects = 0;
    this.renderStats.culledEffects = 0;
  }

  private getEnemyVisualRadius(enemy: Enemy): number {
    const renderSize = enemy.config.renderSize ?? enemy.radius * 2.6;
    return Math.max(enemy.radius, renderSize / 2) + 28;
  }

  private isCircleInViewport(x: number, y: number, radius: number, padding: number): boolean {
    if (CAMERA_CONFIG.useCameraManager) {
      return this.camera.isCircleVisible(x, y, radius, padding);
    }

    return x + radius >= -padding && x - radius <= this.width + padding && y + radius >= -padding && y - radius <= this.height + padding;
  }

  private isProjectileInViewport(projectile: Projectile, padding: number): boolean {
    return (
      this.isCircleInViewport(projectile.position.x, projectile.position.y, 18, padding) ||
      this.isCircleInViewport(projectile.previousPosition.x, projectile.previousPosition.y, 18, padding)
    );
  }

  private drawCullingBounds(): void {
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(45, 212, 191, 0.85)";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 6]);
    if (CAMERA_CONFIG.useCameraManager) {
      const bounds = this.camera.getViewportWorldBounds(Game.VIEWPORT_PADDING);
      this.ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    } else {
      this.ctx.strokeRect(-Game.VIEWPORT_PADDING, -Game.VIEWPORT_PADDING, this.width + Game.VIEWPORT_PADDING * 2, this.height + Game.VIEWPORT_PADDING * 2);
    }
    this.ctx.restore();
  }

  private getWorldWidth(): number {
    return CAMERA_CONFIG.useCameraManager ? this.camera.worldWidth : this.width;
  }

  private getWorldHeight(): number {
    return CAMERA_CONFIG.useCameraManager ? this.camera.worldHeight : this.height;
  }

  private drawWorldDebugOverlay(): void {
    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
    this.ctx.setLineDash([10, 8]);
    this.ctx.strokeRect(0, 0, this.getWorldWidth(), this.getWorldHeight());
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = "rgba(59, 130, 246, 0.95)";
    for (const point of this.path) {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
    for (const enemy of this.enemies) {
      this.ctx.beginPath();
      this.ctx.arc(enemy.position.x, enemy.position.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private getDebugBalanceInfo(): DebugBalanceInfo {
    const difficulty = DIFFICULTY_CONFIGS[this.difficultyId];
    const camera = this.camera.getDebugState();

    return {
      enabled: this.debugMode,
      gameSpeed: this.gameSpeed,
      toggles: {
        healthBars: this.showHealthBars,
        effects: this.showEffects,
        hitboxes: this.showDebugHitboxes,
        cullingBounds: this.showCullingBounds
      },
      performance: {
        fps: this.fps,
        enemies: this.enemies.length,
        projectiles: this.projectiles.length,
        effects: this.effects.activeCount,
        towers: this.towers.length,
        renderedEnemies: this.renderStats.renderedEnemies,
        culledEnemies: this.renderStats.culledEnemies,
        renderedProjectiles: this.renderStats.renderedProjectiles,
        culledProjectiles: this.renderStats.culledProjectiles,
        renderedEffects: this.renderStats.renderedEffects,
        culledEffects: this.renderStats.culledEffects
      },
      path: {
        totalLength: Math.round(this.pathManager.totalDistance),
        hoveredEnemyProgress: this.input.pointerWorldPosition ? this.findEnemyAt(this.input.pointerWorldPosition)?.normalizedPathProgress ?? null : null,
        hoveredEnemySegment: this.input.pointerWorldPosition ? this.findEnemyAt(this.input.pointerWorldPosition)?.currentSegmentIndex ?? null : null,
        cameraZoom: camera.zoom,
        cameraX: camera.x,
        cameraY: camera.y
      },
      currentMultipliers: {
        health: difficulty.enemyHealthMultiplier,
        speed: difficulty.enemySpeedMultiplier,
        count: difficulty.enemyCountMultiplier,
        rewards: difficulty.enemyRewardMultiplier,
        spawnInterval: difficulty.spawnIntervalMultiplier
      },
      currentWave: this.waveManager.currentWaveDebugSummary,
      towerDps: Object.values(TOWER_CONFIGS).map((tower) => ({
        label: tower.label,
        dps: estimateTowerDps(tower)
      }))
    };
  }

  private getAmbientKeyForMission(missionId: MissionId): AmbientKey {
    const themeId = MISSION_CONFIGS[missionId].themeId;
    const map: Record<string, AmbientKey> = {
      forest: "forest-ambient",
      desert: "desert-ambient",
      lava: "lava-ambient",
      ice: "ice-ambient",
      island: "island-ambient"
    };
    return map[themeId] ?? "forest-ambient";
  }

  private reportBalanceValidation(): void {
    const result = validateBalance(TOWER_CONFIGS, ENEMY_CONFIGS, DEFAULT_WAVE_CONFIG, DIFFICULTY_CONFIGS);
    if (!result.valid) {
      console.warn("Balance validation warnings:", result.warnings);
    }
  }

  private updatePerformanceDiagnostics(deltaTime: number): void {
    this.fpsSampleTime += deltaTime;
    this.fpsSampleFrames += 1;

    if (this.fpsSampleTime < 0.35) return;

    this.fps = Math.round(this.fpsSampleFrames / this.fpsSampleTime);
    this.fpsSampleTime = 0;
    this.fpsSampleFrames = 0;
  }

  private createProjectile(
    start: Vector2,
    target: Enemy,
    stats: TowerLevelStats,
    color: string,
    spriteKey: string | undefined
  ): Projectile {
    const projectile = this.projectilePool.pop();
    if (projectile) {
      projectile.reset(start, target, stats, color, spriteKey);
      return projectile;
    }

    return new Projectile(start, target, stats, color, spriteKey);
  }

  private clearProjectiles(): void {
    for (const projectile of this.projectiles) {
      this.projectilePool.push(projectile);
    }
    this.projectiles.length = 0;
  }

  private updateUi(): void {
    this.ui.update(
      this.life,
      this.maxLife,
      this.waveManager.currentWaveNumber,
      this.waveManager.totalWaves,
      this.selectedTowerType,
      this.state,
      this.missionId,
      this.difficultyId,
      this.getActiveEnemyTypes(),
      this.getSelectedTowerInfo(),
      this.waveManager.remainingEnemiesInCurrentWave,
      this.waveManager.nextWaveCountdown,
      this.feedbackMessage,
      this.gold,
      ECONOMY_CONFIG.debugInfiniteGold,
      this.runResult,
      this.progression.getMissionSelectInfo(ECONOMY_CONFIG.debugUnlockAllMissions),
      this.getDebugBalanceInfo(),
      this.sound.isMuted
    );
  }
}
