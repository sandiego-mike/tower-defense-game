import { ASSET_MANIFEST } from "./config/assets";
import { Game } from "./game/Game";
import { AssetManager } from "./systems/AssetManager";
import "./styles.css";

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

function updateViewportFallbackSize(): void {
  const visualViewport = window.visualViewport;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const viewportHeight = visualViewport?.height ?? window.innerHeight;

  document.documentElement.style.setProperty("--visual-viewport-width", `${viewportWidth}px`);
  document.documentElement.style.setProperty("--visual-viewport-height", `${viewportHeight}px`);
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
  const orientation = window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
  const viewportClass = getViewportClass(window.innerWidth, window.innerHeight);

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
    updateViewportDiagnostics("viewport resize");
  }, 100);
}

updateViewportFallbackSize();
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
  const game = new Game(gameCanvas, assets);
  game.start();
  window.setTimeout(() => {
    logMobileStartupDiagnostics("startup");
    updateViewportDiagnostics("startup");
  }, 0);
}

void boot();
