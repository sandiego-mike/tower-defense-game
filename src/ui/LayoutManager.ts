export type LayoutMode = "desktop" | "tablet" | "mobilePortrait" | "mobileLandscape";

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface MeasuredViewport {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  safeArea: SafeAreaInsets;
  availableWidth: number;
  availableHeight: number;
  aspectRatio: number;
  hasTouch: boolean;
}

type CanvasFit = "center" | "portrait-top";

interface LayoutProfile {
  mode: LayoutMode;
  canvasFit: CanvasFit;
  cssVars: Record<string, string>;
}

export interface AppliedLayout {
  mode: LayoutMode;
  profile: LayoutProfile;
  viewport: MeasuredViewport;
  canvasDisplay: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
}

const LAYOUT_CLASS_NAMES: Record<LayoutMode, string> = {
  desktop: "layout-desktop",
  tablet: "layout-tablet",
  mobilePortrait: "layout-mobilePortrait",
  mobileLandscape: "layout-mobileLandscape"
};

export const layoutProfiles: Record<LayoutMode, LayoutProfile> = {
  desktop: {
    mode: "desktop",
    canvasFit: "center",
    cssVars: {
      "--hud-top": "12px",
      "--hud-scale": "1",
      "--mission-scale": "1",
      "--controls-scale": "1",
      "--tower-bar-scale": "1",
      "--hud-side": "12px",
      "--hud-gap": "8px",
      "--hud-group-min-height": "38px",
      "--hud-group-padding": "6px",
      "--hud-group-gap": "6px",
      "--hud-metric-padding": "2px 6px",
      "--hud-metric-min-width": "64px",
      "--hud-label-font": "10px",
      "--hud-value-font": "13px",
      "--mission-gap": "8px",
      "--mission-font": "14px",
      "--mission-sub-font": "12px",
      "--start-panel-width": "420px",
      "--start-panel-padding": "18px",
      "--start-title-font": "28px",
      "--start-title-margin": "0 0 16px",
      "--start-label-margin": "12px 0 6px",
      "--start-label-font": "12px",
      "--start-select-min-height": "42px",
      "--start-select-padding": "8px 10px",
      "--start-description-min-height": "38px",
      "--start-description-margin": "8px 0 2px",
      "--start-description-font": "14px",
      "--start-button-min-height": "46px",
      "--start-button-margin-top": "16px",
      "--icon-button-size": "36px",
      "--icon-button-font": "18px",
      "--speed-min-height": "34px",
      "--speed-padding": "0 8px",
      "--speed-gap": "6px",
      "--speed-select-width": "62px",
      "--speed-select-min-height": "28px",
      "--speed-font": "13px",
      "--wave-button-top": "70px",
      "--wave-button-left": "12px",
      "--wave-button-size": "34px",
      "--wave-panel-top": "108px",
      "--wave-panel-left": "12px",
      "--wave-panel-width": "300px",
      "--tower-bar-width": "420px",
      "--tower-bar-bottom": "12px",
      "--tower-bar-min-height": "52px",
      "--tower-bar-padding": "7px",
      "--tower-bar-gap": "7px",
      "--tower-button-width": "auto",
      "--tower-button-height": "auto",
      "--tower-button-min-height": "auto",
      "--tower-button-padding": "8px 6px",
      "--tower-button-font": "inherit",
      "--tower-button-gap": "6px",
      "--tower-chip-size": "16px",
      "--cancel-button-size": "38px",
      "--cancel-button-font": "20px",
      "--tower-inspector-top": "108px",
      "--tower-inspector-right": "12px",
      "--tower-inspector-width": "280px",
      "--tower-inspector-padding": "10px",
      "--tower-inspector-gap": "10px",
      "--tower-stat-padding": "8px",
      "--panel-control-min-height": "36px",
      "--tower-inspector-bottom": "auto",
      "--tower-inspector-max-height": "min(70vh, 520px)"
    }
  },
  tablet: {
    mode: "tablet",
    canvasFit: "center",
    cssVars: {
      "--hud-top": "10px",
      "--hud-scale": "1",
      "--mission-scale": "1",
      "--controls-scale": "1",
      "--tower-bar-scale": "1",
      "--hud-side": "10px",
      "--hud-gap": "6px",
      "--hud-group-min-height": "34px",
      "--hud-group-padding": "5px",
      "--hud-group-gap": "5px",
      "--hud-metric-padding": "2px 5px",
      "--hud-metric-min-width": "64px",
      "--hud-label-font": "9px",
      "--hud-value-font": "12px",
      "--mission-gap": "8px",
      "--mission-font": "13px",
      "--mission-sub-font": "11px",
      "--start-panel-width": "400px",
      "--start-panel-padding": "16px",
      "--start-title-font": "26px",
      "--start-title-margin": "0 0 14px",
      "--start-label-margin": "10px 0 5px",
      "--start-label-font": "11px",
      "--start-select-min-height": "40px",
      "--start-select-padding": "7px 9px",
      "--start-description-min-height": "34px",
      "--start-description-margin": "7px 0 2px",
      "--start-description-font": "13px",
      "--start-button-min-height": "44px",
      "--start-button-margin-top": "14px",
      "--icon-button-size": "34px",
      "--icon-button-font": "17px",
      "--speed-min-height": "32px",
      "--speed-padding": "0 7px",
      "--speed-gap": "5px",
      "--speed-select-width": "58px",
      "--speed-select-min-height": "26px",
      "--speed-font": "12px",
      "--wave-button-top": "64px",
      "--wave-button-left": "10px",
      "--wave-button-size": "32px",
      "--wave-panel-top": "100px",
      "--wave-panel-left": "10px",
      "--wave-panel-width": "280px",
      "--tower-bar-width": "420px",
      "--tower-bar-bottom": "12px",
      "--tower-bar-min-height": "52px",
      "--tower-bar-padding": "7px",
      "--tower-bar-gap": "7px",
      "--tower-button-width": "auto",
      "--tower-button-height": "auto",
      "--tower-button-min-height": "auto",
      "--tower-button-padding": "8px 6px",
      "--tower-button-font": "inherit",
      "--tower-button-gap": "6px",
      "--tower-chip-size": "16px",
      "--cancel-button-size": "38px",
      "--cancel-button-font": "20px",
      "--tower-inspector-top": "108px",
      "--tower-inspector-right": "12px",
      "--tower-inspector-width": "280px",
      "--tower-inspector-padding": "10px",
      "--tower-inspector-gap": "10px",
      "--tower-stat-padding": "8px",
      "--panel-control-min-height": "36px",
      "--tower-inspector-bottom": "auto",
      "--tower-inspector-max-height": "min(70vh, 520px)"
    }
  },
  mobilePortrait: {
    mode: "mobilePortrait",
    canvasFit: "portrait-top",
    cssVars: {
      "--hud-top": "4px",
      "--hud-scale": "0.65",
      "--mission-scale": "0.65",
      "--controls-scale": "0.65",
      "--tower-bar-scale": "0.65",
      "--hud-side": "4px",
      "--hud-gap": "4px",
      "--hud-group-min-height": "26px",
      "--hud-group-padding": "2px",
      "--hud-group-gap": "2px",
      "--hud-metric-padding": "1px 3px",
      "--hud-metric-min-width": "42px",
      "--hud-label-font": "7px",
      "--hud-value-font": "9px",
      "--mission-gap": "4px",
      "--mission-font": "9px",
      "--mission-sub-font": "7px",
      "--start-panel-width": "min(340px, calc(100vw - 16px))",
      "--start-panel-padding": "10px",
      "--start-title-font": "20px",
      "--start-title-margin": "0 0 8px",
      "--start-label-margin": "7px 0 3px",
      "--start-label-font": "10px",
      "--start-select-min-height": "36px",
      "--start-select-padding": "5px 7px",
      "--start-description-min-height": "0px",
      "--start-description-margin": "5px 0 0",
      "--start-description-font": "12px",
      "--start-button-min-height": "44px",
      "--start-button-margin-top": "10px",
      // .hud-actions applies transform: scale(--controls-scale, 0.65) on mobilePortrait.
      // iOS suppresses synthesized clicks when finger movement exceeds the cancel
      // threshold relative to the hit box, so the post-scale tap target needs to
      // clear ~44px (Apple HIG). 68px * 0.65 ≈ 44px.
      "--icon-button-size": "68px",
      "--icon-button-font": "26px",
      "--speed-min-height": "44px",
      "--speed-padding": "0 6px",
      "--speed-gap": "4px",
      "--speed-select-width": "60px",
      "--speed-select-min-height": "36px",
      "--speed-font": "13px",
      "--wave-button-top": "42px",
      "--wave-button-left": "6px",
      "--wave-button-size": "26px",
      "--wave-panel-top": "72px",
      "--wave-panel-left": "6px",
      "--wave-panel-width": "230px",
      "--tower-bar-width": "fit-content",
      "--tower-bar-bottom": "max(6px, var(--safe-area-bottom, 0px))",
      "--tower-bar-min-height": "42px",
      "--tower-bar-padding": "4px",
      "--tower-bar-gap": "4px",
      "--tower-button-width": "84px",
      "--tower-button-height": "46px",
      "--tower-button-min-height": "46px",
      "--tower-button-padding": "4px 3px",
      "--tower-button-font": "12px",
      "--tower-button-gap": "4px",
      "--tower-chip-size": "14px",
      "--cancel-button-size": "46px",
      "--cancel-button-font": "19px",
      "--tower-inspector-top": "auto",
      "--tower-inspector-right": "8px",
      "--tower-inspector-width": "auto",
      "--tower-inspector-padding": "7px",
      "--tower-inspector-gap": "6px",
      "--tower-stat-padding": "5px",
      "--panel-control-min-height": "38px",
      "--tower-inspector-bottom": "62px",
      "--tower-inspector-max-height": "250px"
    }
  },
  mobileLandscape: {
    mode: "mobileLandscape",
    canvasFit: "center",
    cssVars: {
      "--hud-top": "max(6px, var(--safe-area-top, 0px))",
      "--hud-scale": "0.8",
      "--mission-scale": "0.8",
      "--controls-scale": "0.8",
      "--tower-bar-scale": "0.75",
      "--hud-side": "max(8px, var(--safe-area-left, 0px), var(--safe-area-right, 0px))",
      "--hud-gap": "4px",
      "--hud-group-min-height": "30px",
      "--hud-group-padding": "3px",
      "--hud-group-gap": "3px",
      "--hud-metric-padding": "1px 4px",
      "--hud-metric-min-width": "48px",
      "--hud-label-font": "8px",
      "--hud-value-font": "11px",
      "--mission-gap": "5px",
      "--mission-font": "11px",
      "--mission-sub-font": "9px",
      "--start-panel-width": "min(380px, calc(100vw - 16px))",
      "--start-panel-padding": "10px",
      "--start-title-font": "20px",
      "--start-title-margin": "0 0 8px",
      "--start-label-margin": "6px 0 3px",
      "--start-label-font": "10px",
      "--start-select-min-height": "34px",
      "--start-select-padding": "4px 7px",
      "--start-description-min-height": "0px",
      "--start-description-margin": "4px 0 0",
      "--start-description-font": "11px",
      "--start-button-min-height": "40px",
      "--start-button-margin-top": "8px",
      // .hud-actions scales by --controls-scale (0.8) on mobileLandscape.
      // 56px * 0.8 ≈ 44px hit area to satisfy iOS minimum tap target.
      "--icon-button-size": "56px",
      "--icon-button-font": "22px",
      "--speed-min-height": "30px",
      "--speed-padding": "0 5px",
      "--speed-gap": "4px",
      "--speed-select-width": "48px",
      "--speed-select-min-height": "24px",
      "--speed-font": "12px",
      "--wave-button-top": "62px",
      "--wave-button-left": "max(8px, var(--safe-area-left, 0px))",
      "--wave-button-size": "30px",
      "--wave-panel-top": "96px",
      "--wave-panel-left": "max(8px, var(--safe-area-left, 0px))",
      "--wave-panel-width": "250px",
      "--tower-bar-width": "360px",
      "--tower-bar-bottom": "max(8px, var(--safe-area-bottom, 0px))",
      "--tower-bar-min-height": "48px",
      "--tower-bar-padding": "5px",
      "--tower-bar-gap": "4px",
      "--tower-button-width": "84px",
      "--tower-button-height": "44px",
      "--tower-button-min-height": "44px",
      "--tower-button-padding": "6px 4px",
      "--tower-button-font": "11px",
      "--tower-button-gap": "4px",
      "--tower-chip-size": "14px",
      "--cancel-button-size": "44px",
      "--cancel-button-font": "18px",
      "--tower-inspector-top": "auto",
      "--tower-inspector-right": "12px",
      "--tower-inspector-width": "auto",
      "--tower-inspector-padding": "8px",
      "--tower-inspector-gap": "8px",
      "--tower-stat-padding": "6px",
      "--panel-control-min-height": "40px",
      "--tower-inspector-bottom": "88px",
      "--tower-inspector-max-height": "260px"
    }
  }
};

export class LayoutManager {
  private safeAreaProbe: HTMLDivElement | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gameWidth: number,
    private readonly gameHeight: number
  ) {}

  apply(): AppliedLayout {
    const viewport = this.measureViewport();
    const mode = this.detectMode(viewport);
    const profile = layoutProfiles[mode];
    const canvasDisplay = this.fitCanvas(viewport, profile);

    this.applyModeClass(mode);
    this.applyCssVars(profile, viewport, canvasDisplay);
    this.applyCanvasStyle(canvasDisplay);

    return { mode, profile, viewport, canvasDisplay };
  }

  measureViewport(): MeasuredViewport {
    const visualViewport = window.visualViewport;
    const width = visualViewport?.width ?? window.innerWidth;
    const height = visualViewport?.height ?? window.innerHeight;
    const safeArea = this.getSafeAreaInsets();
    const hasTouch = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

    return {
      width,
      height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      safeArea,
      availableWidth: Math.max(1, width - safeArea.left - safeArea.right),
      availableHeight: Math.max(1, height - safeArea.top - safeArea.bottom),
      aspectRatio: width / Math.max(1, height),
      hasTouch
    };
  }

  detectMode(viewport = this.measureViewport()): LayoutMode {
    const isPortrait = viewport.height >= viewport.width;

    if (viewport.hasTouch && isPortrait && viewport.width <= 700) {
      return "mobilePortrait";
    }

    if (viewport.hasTouch && !isPortrait && viewport.height <= 560) {
      return "mobileLandscape";
    }

    if (viewport.width <= 1024 || viewport.hasTouch) {
      return "tablet";
    }

    return "desktop";
  }

  private getSafeAreaInsets(): SafeAreaInsets {
    if (!this.safeAreaProbe) {
      this.safeAreaProbe = document.createElement("div");
      this.safeAreaProbe.style.position = "fixed";
      this.safeAreaProbe.style.inset = "0";
      this.safeAreaProbe.style.visibility = "hidden";
      this.safeAreaProbe.style.pointerEvents = "none";
      this.safeAreaProbe.style.paddingTop = "env(safe-area-inset-top)";
      this.safeAreaProbe.style.paddingRight = "env(safe-area-inset-right)";
      this.safeAreaProbe.style.paddingBottom = "env(safe-area-inset-bottom)";
      this.safeAreaProbe.style.paddingLeft = "env(safe-area-inset-left)";
      document.body.appendChild(this.safeAreaProbe);
    }

    const styles = window.getComputedStyle(this.safeAreaProbe);
    return {
      top: parseFloat(styles.paddingTop) || 0,
      right: parseFloat(styles.paddingRight) || 0,
      bottom: parseFloat(styles.paddingBottom) || 0,
      left: parseFloat(styles.paddingLeft) || 0
    };
  }

  private fitCanvas(viewport: MeasuredViewport, profile: LayoutProfile): AppliedLayout["canvasDisplay"] {
    const scale = Math.min(viewport.availableWidth / this.gameWidth, viewport.availableHeight / this.gameHeight);
    const width = this.gameWidth * scale;
    const height = this.gameHeight * scale;
    const centeredTop = (viewport.availableHeight - height) / 2;
    const y = profile.canvasFit === "portrait-top" ? Math.min(Math.max(44, viewport.availableHeight * 0.08), centeredTop) : centeredTop;

    return {
      x: (viewport.availableWidth - width) / 2,
      y,
      width,
      height,
      scale
    };
  }

  private applyModeClass(mode: LayoutMode): void {
    const elements = [document.documentElement, document.body, this.canvas.closest("#app")].filter(Boolean) as HTMLElement[];
    for (const className of Object.values(LAYOUT_CLASS_NAMES)) {
      for (const element of elements) {
        element.classList.remove(className);
      }
    }
    for (const element of elements) {
      element.classList.add(LAYOUT_CLASS_NAMES[mode]);
      element.dataset.layoutMode = mode;
    }
  }

  private applyCssVars(profile: LayoutProfile, viewport: MeasuredViewport, canvasDisplay: AppliedLayout["canvasDisplay"]): void {
    const style = document.documentElement.style;
    style.setProperty("--visual-viewport-width", `${viewport.width}px`);
    style.setProperty("--visual-viewport-height", `${viewport.height}px`);
    style.setProperty("--safe-area-top", `${viewport.safeArea.top}px`);
    style.setProperty("--safe-area-right", `${viewport.safeArea.right}px`);
    style.setProperty("--safe-area-bottom", `${viewport.safeArea.bottom}px`);
    style.setProperty("--safe-area-left", `${viewport.safeArea.left}px`);
    style.setProperty("--game-canvas-top", `${canvasDisplay.y}px`);
    style.setProperty("--game-canvas-left", `${canvasDisplay.x}px`);
    style.setProperty("--game-canvas-display-width", `${canvasDisplay.width}px`);
    style.setProperty("--game-canvas-display-height", `${canvasDisplay.height}px`);
    style.setProperty("--game-canvas-scale", `${canvasDisplay.scale}`);
    style.setProperty("--portrait-tower-top", `${canvasDisplay.y + canvasDisplay.height + 8}px`);

    for (const [name, value] of Object.entries(profile.cssVars)) {
      style.setProperty(name, value);
    }
  }

  private applyCanvasStyle(canvasDisplay: AppliedLayout["canvasDisplay"]): void {
    this.canvas.style.position = "absolute";
    this.canvas.style.width = `${canvasDisplay.width}px`;
    this.canvas.style.height = `${canvasDisplay.height}px`;
    this.canvas.style.left = `${canvasDisplay.x}px`;
    this.canvas.style.top = `${canvasDisplay.y}px`;
  }
}
