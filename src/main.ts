import { ASSET_MANIFEST } from "./config/assets";
import { Game } from "./game/Game";
import { AssetManager } from "./systems/AssetManager";
import "./styles.css";

const GAME_WIDTH = 1536;
const GAME_HEIGHT = 864;

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const appContainer = document.querySelector<HTMLElement>("#app");
const loadingScreen = document.querySelector<HTMLElement>("#loading-screen");
const loadingStatus = document.querySelector<HTMLElement>("#loading-status");

if (!canvas) {
  throw new Error("Missing #game-canvas element.");
}

const gameCanvas = canvas;
let viewportResizeTimer = 0;
const debugViewportEnabled = new URLSearchParams(window.location.search).get("debugViewport") === "1";
let viewportDebugOverlay: HTMLPreElement | null = null;
let safeAreaProbe: HTMLDivElement | null = null;

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
}

function getSafeAreaInsets(): SafeAreaInsets {
  if (!safeAreaProbe) {
    safeAreaProbe = document.createElement("div");
    safeAreaProbe.style.position = "fixed";
    safeAreaProbe.style.inset = "0";
    safeAreaProbe.style.visibility = "hidden";
    safeAreaProbe.style.pointerEvents = "none";
    safeAreaProbe.style.paddingTop = "env(safe-area-inset-top)";
    safeAreaProbe.style.paddingRight = "env(safe-area-inset-right)";
    safeAreaProbe.style.paddingBottom = "env(safe-area-inset-bottom)";
    safeAreaProbe.style.paddingLeft = "env(safe-area-inset-left)";
    document.body.appendChild(safeAreaProbe);
  }

  const styles = window.getComputedStyle(safeAreaProbe);
  return {
    top: parseFloat(styles.paddingTop) || 0,
    right: parseFloat(styles.paddingRight) || 0,
    bottom: parseFloat(styles.paddingBottom) || 0,
    left: parseFloat(styles.paddingLeft) || 0
  };
}

function getMeasuredViewport(): MeasuredViewport {
  const visualViewport = window.visualViewport;
  const width = visualViewport?.width ?? window.innerWidth;
  const height = visualViewport?.height ?? window.innerHeight;
  const safeArea = getSafeAreaInsets();

  return {
    width,
    height,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    safeArea,
    availableWidth: Math.max(1, width - safeArea.left - safeArea.right),
    availableHeight: Math.max(1, height - safeArea.top - safeArea.bottom)
  };
}

function resizeCanvas(): void {
  const viewport = getMeasuredViewport();
  const scale = Math.min(viewport.availableWidth / GAME_WIDTH, viewport.availableHeight / GAME_HEIGHT);
  const displayWidth = GAME_WIDTH * scale;
  const displayHeight = GAME_HEIGHT * scale;
  const isPortrait = viewport.height > viewport.width;
  const centeredTop = (viewport.availableHeight - displayHeight) / 2;
  const portraitTop = Math.min(Math.max(44, viewport.availableHeight * 0.08), centeredTop);
  const displayTop = isPortrait ? portraitTop : centeredTop;
  const displayLeft = (viewport.availableWidth - displayWidth) / 2;

  gameCanvas.style.position = "absolute";
  gameCanvas.style.width = `${displayWidth}px`;
  gameCanvas.style.height = `${displayHeight}px`;
  gameCanvas.style.left = `${displayLeft}px`;
  gameCanvas.style.top = `${displayTop}px`;

  document.documentElement.style.setProperty("--game-canvas-top", `${displayTop}px`);
  document.documentElement.style.setProperty("--game-canvas-left", `${displayLeft}px`);
  document.documentElement.style.setProperty("--game-canvas-display-width", `${displayWidth}px`);
  document.documentElement.style.setProperty("--game-canvas-display-height", `${displayHeight}px`);
  document.documentElement.style.setProperty("--portrait-tower-top", `${displayTop + displayHeight + 8}px`);
}

function updateViewportFallbackSize(): void {
  const viewport = getMeasuredViewport();

  document.documentElement.style.setProperty("--visual-viewport-width", `${viewport.width}px`);
  document.documentElement.style.setProperty("--visual-viewport-height", `${viewport.height}px`);
  document.documentElement.style.setProperty("--safe-area-top", `${viewport.safeArea.top}px`);
  document.documentElement.style.setProperty("--safe-area-right", `${viewport.safeArea.right}px`);
  document.documentElement.style.setProperty("--safe-area-bottom", `${viewport.safeArea.bottom}px`);
  document.documentElement.style.setProperty("--safe-area-left", `${viewport.safeArea.left}px`);
}

function getViewportClass(width: number, height: number): string {
  if (width <= 560) return "mobile";
  if (width <= 900) return "tablet";
  if (height <= 560) return "mobile-landscape";
  return "desktop";
}

function createViewportDebugOverlay(): HTMLPreElement {
  const existing = document.querySelector<HTMLPreElement>("#viewport-debug-overlay");
  if (existing) return existing;

  const overlay = document.createElement("pre");
  overlay.id = "viewport-debug-overlay";
  overlay.className = "viewport-debug-overlay";
  document.body.appendChild(overlay);
  return overlay;
}

function collectViewportDiagnostics(label: string): Record<string, unknown> {
  const canvasRect = gameCanvas.getBoundingClientRect();
  const appRect = appContainer?.getBoundingClientRect();
  const viewport = getMeasuredViewport();
  const orientation = viewport.width >= viewport.height ? "landscape" : "portrait";
  const viewportClass = getViewportClass(viewport.width, viewport.height);

  return {
    label,
    orientation,
    viewportClass,
    cssMedia: {
      mobileMax420: window.matchMedia("(max-width: 420px)").matches,
      mobileMax560: window.matchMedia("(max-width: 560px)").matches,
      tabletMax900: window.matchMedia("(max-width: 900px)").matches
    },
    classes: {
      html: document.documentElement.className || "(none)",
      body: document.body.className || "(none)",
      app: appContainer?.className || "(none)",
      canvas: gameCanvas.className || "(none)"
    },
    window: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight
    },
    measuredViewport: {
      width: viewport.width,
      height: viewport.height,
      availableWidth: viewport.availableWidth,
      availableHeight: viewport.availableHeight,
      safeArea: viewport.safeArea
    },
    visualViewport: window.visualViewport
      ? {
          width: window.visualViewport.width,
          height: window.visualViewport.height,
          scale: window.visualViewport.scale,
          offsetLeft: window.visualViewport.offsetLeft,
          offsetTop: window.visualViewport.offsetTop
        }
      : null,
    devicePixelRatio: window.devicePixelRatio || 1,
    canvas: {
      width: gameCanvas.width,
      height: gameCanvas.height,
      rect: {
        x: canvasRect.x,
        y: canvasRect.y,
        width: canvasRect.width,
        height: canvasRect.height,
        top: canvasRect.top,
        right: canvasRect.right,
        bottom: canvasRect.bottom,
        left: canvasRect.left
      }
    },
    appContainer: appContainer
      ? {
          clientWidth: appContainer.clientWidth,
          clientHeight: appContainer.clientHeight,
          rect: appRect
            ? {
                x: appRect.x,
                y: appRect.y,
                width: appRect.width,
                height: appRect.height,
                top: appRect.top,
                right: appRect.right,
                bottom: appRect.bottom,
                left: appRect.left
              }
            : null
        }
      : null
  };
}

function updateViewportDiagnostics(label: string): void {
  if (!debugViewportEnabled) return;

  const diagnostics = collectViewportDiagnostics(label);
  console.info("[viewport diagnostics]", diagnostics);
  viewportDebugOverlay ??= createViewportDebugOverlay();
  viewportDebugOverlay.textContent = JSON.stringify(diagnostics, null, 2);
}

function logMobileStartupDiagnostics(label: string): void {
  if (!debugViewportEnabled) return;

  const diagnostics = collectViewportDiagnostics(label);
  console.info(`[mobile viewport] ${label}`, {
    canvasWidth: gameCanvas.width,
    canvasHeight: gameCanvas.height,
    ...diagnostics
  });
}

function scheduleViewportFallbackSize(): void {
  window.clearTimeout(viewportResizeTimer);
  viewportResizeTimer = window.setTimeout(() => {
    updateViewportFallbackSize();
    resizeCanvas();
    updateViewportDiagnostics("viewport resize");
  }, 100);
}

updateViewportFallbackSize();
resizeCanvas();
updateViewportDiagnostics("initial");
window.addEventListener("resize", scheduleViewportFallbackSize);
window.addEventListener("orientationchange", scheduleViewportFallbackSize);
window.visualViewport?.addEventListener("resize", scheduleViewportFallbackSize);
window.visualViewport?.addEventListener("scroll", scheduleViewportFallbackSize);

async function boot(): Promise<void> {
  const assets = new AssetManager(ASSET_MANIFEST);

  try {
    await assets.loadAll();
    if (loadingStatus) {
      loadingStatus.textContent = "Assets ready.";
    }
  } catch {
    if (loadingStatus) {
      loadingStatus.textContent = "Asset loading failed. Using placeholders.";
    }
  }

  loadingScreen?.classList.add("hidden");
  resizeCanvas();
  const game = new Game(gameCanvas, assets);
  game.start();
  window.setTimeout(() => {
    logMobileStartupDiagnostics("startup");
    updateViewportDiagnostics("startup");
  }, 0);
}

void boot();
