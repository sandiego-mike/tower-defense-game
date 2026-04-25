import { Game } from "../game/Game";
import { TOWER_CONFIGS } from "../config/towers";
import { TowerType, Vector2 } from "../types";

export class InputManager {
  pointerWorldPosition: Vector2 | null = null;
  previewTower: TowerType | null = null;
  isDraggingTower = false;
  private dragCandidate: { towerType: TowerType; pointerId: number; startX: number; startY: number } | null = null;
  private suppressNextPaletteClick = false;
  private readonly activePointers = new Map<number, Vector2>();
  private pendingMapPress: { pointerId: number; startScreen: Vector2; lastScreen: Vector2; moved: boolean } | null = null;
  private lastPinchDistance = 0;
  private isCameraGesture = false;
  private spacePanActive = false;

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
      const screenPosition = this.getScreenPosition(event);
      const worldPosition = this.game.screenToWorld(screenPosition);
      this.pointerWorldPosition = worldPosition;
      this.activePointers.set(event.pointerId, screenPosition);
      this.pendingMapPress = {
        pointerId: event.pointerId,
        startScreen: screenPosition,
        lastScreen: screenPosition,
        moved: false
      };
      if (this.canvas.setPointerCapture) {
        this.canvas.setPointerCapture(event.pointerId);
      }
    }, { passive: false });

    this.canvas.addEventListener("pointermove", (event) => {
      event.preventDefault();
      const screenPosition = this.getScreenPosition(event);
      this.pointerWorldPosition = this.game.screenToWorld(screenPosition);
      this.handleCameraMove(event, screenPosition);
    }, { passive: false });

    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      if (this.isUiHitZone(event)) return;
      const screenPosition = this.getScreenPosition(event);
      const zoomFactor = event.deltaY < 0 ? 1.12 : 0.9;
      this.game.zoomCameraAtScreenPoint(this.game.cameraZoom * zoomFactor, screenPosition);
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
        this.pointerWorldPosition = this.game.screenToWorld(this.getScreenPosition(event));
      }
    }, { passive: false });

    window.addEventListener("pointerup", (event) => {
      this.handleCanvasPointerUp(event);
      const candidate = this.dragCandidate;
      if (!candidate) return;
      event.preventDefault();

      if (this.isDraggingTower) {
        const worldPosition = this.game.screenToWorld(this.getScreenPosition(event));
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
      this.activePointers.clear();
      this.pendingMapPress = null;
      this.lastPinchDistance = 0;
      this.isCameraGesture = false;
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
        this.pointerWorldPosition = this.game.screenToWorld(this.getScreenPosition(event));
      }, { passive: false });

      button.addEventListener("contextmenu", (event) => event.preventDefault());
    }
  }

  private registerKeyboardEvents(): void {
    window.addEventListener("keydown", (event) => {
      if (event.key === " ") {
        event.preventDefault();
        this.spacePanActive = true;
        return;
      }

      if (event.key === "Escape") {
        this.game.cancelPlacementMode();
        this.previewTower = null;
        this.dragCandidate = null;
        this.isDraggingTower = false;
        this.pointerWorldPosition = null;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === " ") {
        this.spacePanActive = false;
      }
    });
  }

  private getScreenPosition(event: Pick<PointerEvent | WheelEvent, "clientX" | "clientY">): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    const canvasScaleX = rect.width > 0 ? this.canvas.width / rect.width : 1;
    const canvasScaleY = rect.height > 0 ? this.canvas.height / rect.height : 1;

    // Convert browser pointer coordinates into logical canvas screen space.
    // The canvas is visually scaled with CSS, while the backing store stays at
    // the fixed game resolution, so browser coordinates must be scaled back up.
    return {
      x: (event.clientX - rect.left) * canvasScaleX,
      y: (event.clientY - rect.top) * canvasScaleY
    };
  }

  private handleCameraMove(event: PointerEvent, screenPosition: Vector2): void {
    if (!this.activePointers.has(event.pointerId)) return;

    const previous = this.activePointers.get(event.pointerId) ?? screenPosition;
    this.activePointers.set(event.pointerId, screenPosition);

    if (this.activePointers.size >= 2) {
      const [first, second] = Array.from(this.activePointers.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      if (this.lastPinchDistance > 0) {
        this.game.zoomCameraAtScreenPoint(this.game.cameraZoom * (distance / this.lastPinchDistance), midpoint);
      }
      this.lastPinchDistance = distance;
      this.isCameraGesture = true;
      this.pendingMapPress = null;
      return;
    }

    const pending = this.pendingMapPress;
    if (!pending || pending.pointerId !== event.pointerId) return;

    const movedDistance = Math.hypot(screenPosition.x - pending.startScreen.x, screenPosition.y - pending.startScreen.y);
    if (movedDistance > 8) {
      pending.moved = true;
    }

    const shouldPan =
      pending.moved &&
      !this.isDraggingTower &&
      (event.pointerType === "touch" || event.button === 1 || event.buttons === 4 || this.spacePanActive);
    if (!shouldPan) return;

    this.game.panCameraByScreenDelta(screenPosition.x - previous.x, screenPosition.y - previous.y);
    this.isCameraGesture = true;
    pending.lastScreen = screenPosition;
  }

  private handleCanvasPointerUp(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) return;

    const screenPosition = this.getScreenPosition(event);
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) {
      this.lastPinchDistance = 0;
    }

    const pending = this.pendingMapPress;
    const wasTap =
      pending?.pointerId === event.pointerId &&
      !pending.moved &&
      !this.isCameraGesture &&
      this.isInsideCanvas(event) &&
      !this.isUiHitZone(event);

    if (wasTap) {
      this.game.handleMapPress(this.game.screenToWorld(screenPosition));
    }

    if (pending?.pointerId === event.pointerId) {
      this.pendingMapPress = null;
    }
    if (this.activePointers.size === 0) {
      this.isCameraGesture = false;
    }
  }

  private isInsideCanvas(event: PointerEvent): boolean {
    const rect = this.canvas.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }

  private isUiHitZone(event: Pick<PointerEvent | WheelEvent, "clientX" | "clientY">): boolean {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    return Boolean(
      element?.closest(
        "#tower-palette, #tower-inspector, #hud, #wave-info-panel, #wave-info-button, #message, #start-screen, #loading-screen, #debug-panel"
      )
    );
  }
}
