import { Vector2, clamp } from "../types";

// CSS-transform-based view zoom for the canvas. Scales/pans the canvas element
// visually without touching the rendering pipeline, so existing draw code is
// unaffected. Pointer-to-world mapping continues to work because
// getBoundingClientRect() reflects the applied transform.
export class ViewZoom {
  readonly minZoom = 1;
  readonly maxZoom = 2.5;

  private zoomLevel = 1;
  private panX = 0;
  private panY = 0;
  private enabled = false;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.zoomLevel = 1;
      this.panX = 0;
      this.panY = 0;
    }
    this.applyTransform();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isActive(): boolean {
    return this.enabled && this.zoomLevel > 1.0001;
  }

  getZoom(): number {
    return this.zoomLevel;
  }

  reset(): void {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  zoomBy(multiplier: number): void {
    if (!this.enabled) return;
    const next = clamp(this.zoomLevel * multiplier, this.minZoom, this.maxZoom);
    this.zoomAtCanvasFraction(next, 0.5, 0.5);
  }

  zoomAtCanvasPoint(nextZoom: number, canvasPoint: Vector2): void {
    if (!this.enabled) return;
    const fx = clamp(canvasPoint.x / Math.max(1, this.canvas.width), 0, 1);
    const fy = clamp(canvasPoint.y / Math.max(1, this.canvas.height), 0, 1);
    this.zoomAtCanvasFraction(nextZoom, fx, fy);
  }

  panByCanvasDelta(deltaX: number, deltaY: number): void {
    if (!this.isActive()) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.panX += (deltaX * rect.width) / this.canvas.width;
    this.panY += (deltaY * rect.height) / this.canvas.height;
    this.clampPan();
    this.applyTransform();
  }

  private zoomAtCanvasFraction(nextZoom: number, fx: number, fy: number): void {
    const next = clamp(nextZoom, this.minZoom, this.maxZoom);
    const baseW = this.getBaseDisplayWidth();
    const baseH = this.getBaseDisplayHeight();
    if (baseW <= 0 || baseH <= 0) return;
    this.panX += fx * baseW * (this.zoomLevel - next);
    this.panY += fy * baseH * (this.zoomLevel - next);
    this.zoomLevel = next;
    this.clampPan();
    this.applyTransform();
  }

  private getBaseDisplayWidth(): number {
    const styleW = parseFloat(this.canvas.style.width);
    if (Number.isFinite(styleW) && styleW > 0) return styleW;
    return this.canvas.clientWidth;
  }

  private getBaseDisplayHeight(): number {
    const styleH = parseFloat(this.canvas.style.height);
    if (Number.isFinite(styleH) && styleH > 0) return styleH;
    return this.canvas.clientHeight;
  }

  private clampPan(): void {
    if (this.zoomLevel <= 1) {
      this.panX = 0;
      this.panY = 0;
      return;
    }
    const baseW = this.getBaseDisplayWidth();
    const baseH = this.getBaseDisplayHeight();
    const overflowX = baseW * (this.zoomLevel - 1);
    const overflowY = baseH * (this.zoomLevel - 1);
    this.panX = clamp(this.panX, -overflowX, 0);
    this.panY = clamp(this.panY, -overflowY, 0);
  }

  private applyTransform(): void {
    if (!this.enabled || (this.zoomLevel === 1 && this.panX === 0 && this.panY === 0)) {
      this.canvas.style.transform = "";
      this.canvas.style.transformOrigin = "";
      return;
    }
    this.canvas.style.transformOrigin = "top left";
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
  }
}
