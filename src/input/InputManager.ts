import { Game } from "../game/Game";
import { TOWER_CONFIGS } from "../config/towers";
import { TowerType, Vector2 } from "../types";

export class InputManager {
  pointerWorldPosition: Vector2 | null = null;
  previewTower: TowerType | null = null;
  isDraggingTower = false;
  private dragCandidate: { towerType: TowerType; pointerId: number; startX: number; startY: number } | null = null;
  private suppressNextPaletteClick = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game
  ) {
    this.registerCanvasEvents();
    this.registerPaletteEvents();
    this.registerKeyboardEvents();
  }

  private registerCanvasEvents(): void {
    this.canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (this.isUiHitZone(event)) return;
      const worldPosition = this.getWorldPosition(event);
      this.pointerWorldPosition = worldPosition;

      this.game.handleMapPress(worldPosition);
    }, { passive: false });

    this.canvas.addEventListener("pointermove", (event) => {
      event.preventDefault();
      this.pointerWorldPosition = this.getWorldPosition(event);
    }, { passive: false });

    this.canvas.addEventListener("pointerleave", () => {
      if (!this.isDraggingTower) {
        this.pointerWorldPosition = null;
      }
    });

    window.addEventListener("pointermove", (event) => {
      if (!this.dragCandidate) return;
      event.preventDefault();

      const deltaX = event.clientX - this.dragCandidate.startX;
      const deltaY = event.clientY - this.dragCandidate.startY;
      if (!this.isDraggingTower && Math.hypot(deltaX, deltaY) > 6) {
        this.isDraggingTower = true;
        this.previewTower = this.dragCandidate.towerType;
      }

      if (this.isDraggingTower) {
        this.pointerWorldPosition = this.getWorldPosition(event);
      }
    }, { passive: false });

    window.addEventListener("pointerup", (event) => {
      const candidate = this.dragCandidate;
      if (!candidate) return;
      event.preventDefault();

      if (this.isDraggingTower) {
        const worldPosition = this.getWorldPosition(event);
        if (this.isInsideCanvas(event) && !this.isUiHitZone(event)) {
          this.game.tryPlaceTower(worldPosition, candidate.towerType);
        }
        this.suppressNextPaletteClick = true;
        window.setTimeout(() => {
          this.suppressNextPaletteClick = false;
        }, 0);
      }

      this.dragCandidate = null;
      this.isDraggingTower = false;
      this.previewTower = null;
      this.pointerWorldPosition = null;
    }, { passive: false });

    window.addEventListener("pointercancel", () => {
      this.dragCandidate = null;
      this.isDraggingTower = false;
      this.previewTower = null;
      this.pointerWorldPosition = null;
    });

    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  private registerPaletteEvents(): void {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tower-button"));

    for (const button of buttons) {
      const towerType = button.dataset.tower as TowerType | undefined;
      if (!towerType || !TOWER_CONFIGS[towerType]) continue;

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.suppressNextPaletteClick) return;
        this.game.toggleTowerPlacement(towerType);
      });

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.dragCandidate = {
          towerType,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY
        };
        if (button.setPointerCapture) {
          button.setPointerCapture(event.pointerId);
        }
      }, { passive: false });

      button.addEventListener("pointermove", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.dragCandidate || this.dragCandidate.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - this.dragCandidate.startX;
        const deltaY = event.clientY - this.dragCandidate.startY;
        if (!this.isDraggingTower && Math.hypot(deltaX, deltaY) > 6) {
          this.isDraggingTower = true;
          this.previewTower = towerType;
        }

        if (!this.isDraggingTower) return;
        this.pointerWorldPosition = this.getWorldPosition(event);
      }, { passive: false });

      button.addEventListener("contextmenu", (event) => event.preventDefault());
    }
  }

  private registerKeyboardEvents(): void {
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      this.game.cancelPlacementMode();
      this.previewTower = null;
      this.dragCandidate = null;
      this.isDraggingTower = false;
      this.pointerWorldPosition = null;
    });
  }

  private getWorldPosition(event: PointerEvent): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const canvasScaleX = rect.width > 0 ? this.canvas.width / rect.width : pixelRatio;
    const canvasScaleY = rect.height > 0 ? this.canvas.height / rect.height : pixelRatio;

    // Convert browser pointer coordinates into the same logical canvas space used by game rendering.
    return {
      x: (event.clientX - rect.left) * (canvasScaleX / pixelRatio),
      y: (event.clientY - rect.top) * (canvasScaleY / pixelRatio)
    };
  }

  private isInsideCanvas(event: PointerEvent): boolean {
    const rect = this.canvas.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }

  private isUiHitZone(event: PointerEvent): boolean {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    return Boolean(
      element?.closest(
        "#tower-palette, #tower-inspector, #hud, #wave-info-panel, #wave-info-button, #message, #start-screen, #loading-screen, #debug-panel"
      )
    );
  }
}
