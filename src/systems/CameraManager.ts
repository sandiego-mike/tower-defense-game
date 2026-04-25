import { CameraConfig, Vector2, clamp } from "../types";

export type CameraBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export class CameraManager {
  cameraX = 0;
  cameraY = 0;
  zoom = 1;
  minZoom: number;
  maxZoom: number;
  readonly worldWidth: number;
  readonly worldHeight: number;

  private screenWidth = 960;
  private screenHeight = 540;

  constructor(private readonly config: CameraConfig) {
    this.worldWidth = config.worldWidth;
    this.worldHeight = config.worldHeight;
    this.minZoom = config.minZoom;
    this.maxZoom = config.maxZoom;
  }

  resize(screenWidth: number, screenHeight: number): void {
    this.screenWidth = this.sanitizeDimension(screenWidth, 1);
    this.screenHeight = this.sanitizeDimension(screenHeight, 1);
    this.clampToWorld();
  }

  screenToWorld(screen: Vector2): Vector2 {
    this.ensureValidState();
    return {
      x: screen.x / this.zoom + this.cameraX,
      y: screen.y / this.zoom + this.cameraY
    };
  }

  worldToScreen(world: Vector2): Vector2 {
    this.ensureValidState();
    return {
      x: (world.x - this.cameraX) * this.zoom,
      y: (world.y - this.cameraY) * this.zoom
    };
  }

  applyTransform(ctx: CanvasRenderingContext2D): void {
    this.ensureValidState();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.cameraX, -this.cameraY);
  }

  fitToMap(): void {
    const zoom = Math.min(this.screenWidth / this.worldWidth, this.screenHeight / this.worldHeight);
    this.setZoom(zoom);
    this.centerOn({ x: this.worldWidth / 2, y: this.worldHeight / 2 });
  }

  fitToBounds(bounds: CameraBounds, padding = 80): void {
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const zoom = Math.min(this.screenWidth / width, this.screenHeight / height);
    this.setZoom(zoom);
    this.centerOn({ x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 });
  }

  resetToDefault(pathBounds?: CameraBounds): void {
    if (this.config.mobileDefaultZoomMode === "fit-path" && pathBounds) {
      this.fitToBounds(pathBounds);
      return;
    }

    this.fitToMap();
  }

  panByScreenDelta(deltaX: number, deltaY: number): void {
    if (!this.config.allowPan) return;
    this.ensureValidState();
    this.cameraX -= deltaX / this.zoom;
    this.cameraY -= deltaY / this.zoom;
    this.clampToWorld();
  }

  zoomAtScreenPoint(nextZoom: number, screenPoint: Vector2): void {
    this.ensureValidState();
    const before = this.screenToWorld(screenPoint);
    this.setZoom(nextZoom);
    this.cameraX = before.x - screenPoint.x / this.zoom;
    this.cameraY = before.y - screenPoint.y / this.zoom;
    this.clampToWorld();
  }

  getViewportWorldBounds(padding = 0): CameraBounds {
    this.ensureValidState();
    const min = this.screenToWorld({ x: -padding, y: -padding });
    const max = this.screenToWorld({ x: this.screenWidth + padding, y: this.screenHeight + padding });
    return {
      minX: min.x,
      minY: min.y,
      maxX: max.x,
      maxY: max.y
    };
  }

  isCircleVisible(x: number, y: number, radius: number, padding = 0): boolean {
    const bounds = this.getViewportWorldBounds(padding);
    return x + radius >= bounds.minX && x - radius <= bounds.maxX && y + radius >= bounds.minY && y - radius <= bounds.maxY;
  }

  getDebugState(): { x: number; y: number; zoom: number; screenWidth: number; screenHeight: number; worldWidth: number; worldHeight: number } {
    this.ensureValidState();
    return {
      x: this.cameraX,
      y: this.cameraY,
      zoom: this.zoom,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight
    };
  }

  private centerOn(point: Vector2): void {
    this.cameraX = point.x - this.screenWidth / this.zoom / 2;
    this.cameraY = point.y - this.screenHeight / this.zoom / 2;
    this.clampToWorld();
  }

  private setZoom(zoom: number): void {
    const safeMinZoom = Math.max(0.05, this.minZoom);
    const safeMaxZoom = Math.max(safeMinZoom, this.maxZoom);
    this.zoom = clamp(Number.isFinite(zoom) && zoom > 0 ? zoom : 1, safeMinZoom, safeMaxZoom);
  }

  private clampToWorld(): void {
    this.ensureValidState(false);
    const visibleWidth = this.screenWidth / this.zoom;
    const visibleHeight = this.screenHeight / this.zoom;

    if (visibleWidth >= this.worldWidth) {
      this.cameraX = (this.worldWidth - visibleWidth) / 2;
    } else {
      this.cameraX = clamp(this.cameraX, 0, this.worldWidth - visibleWidth);
    }

    if (visibleHeight >= this.worldHeight) {
      this.cameraY = (this.worldHeight - visibleHeight) / 2;
    } else {
      this.cameraY = clamp(this.cameraY, 0, this.worldHeight - visibleHeight);
    }
  }

  private ensureValidState(shouldClamp = true): void {
    if (!Number.isFinite(this.screenWidth) || this.screenWidth <= 0) {
      this.screenWidth = 960;
    }
    if (!Number.isFinite(this.screenHeight) || this.screenHeight <= 0) {
      this.screenHeight = 540;
    }
    const invalidCameraX = !Number.isFinite(this.cameraX);
    const invalidCameraY = !Number.isFinite(this.cameraY);
    const invalidZoom = !Number.isFinite(this.zoom) || this.zoom <= 0 || this.zoom < this.minZoom * 0.5 || this.zoom > this.maxZoom * 2;

    if (invalidCameraX) {
      this.cameraX = 0;
    }
    if (invalidCameraY) {
      this.cameraY = 0;
    }
    if (invalidZoom) {
      this.zoom = clamp(Math.min(this.screenWidth / this.worldWidth, this.screenHeight / this.worldHeight), this.minZoom, this.maxZoom);
      this.cameraX = this.worldWidth / 2 - this.screenWidth / this.zoom / 2;
      this.cameraY = this.worldHeight / 2 - this.screenHeight / this.zoom / 2;
    }
    if (shouldClamp) {
      this.clampToWorld();
    }
  }

  private sanitizeDimension(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
