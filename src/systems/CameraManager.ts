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
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.clampToWorld();
  }

  screenToWorld(screen: Vector2): Vector2 {
    return {
      x: screen.x / this.zoom + this.cameraX,
      y: screen.y / this.zoom + this.cameraY
    };
  }

  worldToScreen(world: Vector2): Vector2 {
    return {
      x: (world.x - this.cameraX) * this.zoom,
      y: (world.y - this.cameraY) * this.zoom
    };
  }

  applyTransform(ctx: CanvasRenderingContext2D): void {
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
    this.cameraX -= deltaX / this.zoom;
    this.cameraY -= deltaY / this.zoom;
    this.clampToWorld();
  }

  zoomAtScreenPoint(nextZoom: number, screenPoint: Vector2): void {
    const before = this.screenToWorld(screenPoint);
    this.setZoom(nextZoom);
    this.cameraX = before.x - screenPoint.x / this.zoom;
    this.cameraY = before.y - screenPoint.y / this.zoom;
    this.clampToWorld();
  }

  getViewportWorldBounds(padding = 0): CameraBounds {
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

  private centerOn(point: Vector2): void {
    this.cameraX = point.x - this.screenWidth / this.zoom / 2;
    this.cameraY = point.y - this.screenHeight / this.zoom / 2;
    this.clampToWorld();
  }

  private setZoom(zoom: number): void {
    this.zoom = clamp(zoom, this.minZoom, this.maxZoom);
  }

  private clampToWorld(): void {
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
}
