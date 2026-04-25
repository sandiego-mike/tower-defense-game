import { ASSET_MANIFEST } from "./config/assets";
import { Game } from "./game/Game";
import { AssetManager } from "./systems/AssetManager";
import { LayoutManager } from "./ui/LayoutManager";
import type { AppliedLayout } from "./ui/LayoutManager";
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
const layoutManager = new LayoutManager(gameCanvas, GAME_WIDTH, GAME_HEIGHT);
let viewportResizeTimer = 0;
const debugViewportEnabled = new URLSearchParams(window.location.search).get("debugViewport") === "1";
let viewportDebugOverlay: HTMLPreElement | null = null;
let layoutDebugLabel: HTMLDivElement | null = null;
let lastLayout = layoutManager.apply();

function createViewportDebugOverlay(): HTMLPreElement {
  const existing = document.querySelector<HTMLPreElement>("#viewport-debug-overlay");
  if (existing) return existing;

  const overlay = document.createElement("pre");
  overlay.id = "viewport-debug-overlay";
  overlay.className = "viewport-debug-overlay";
  document.body.appendChild(overlay);
  return overlay;
}

function createLayoutDebugLabel(): HTMLDivElement {
  const existing = document.querySelector<HTMLDivElement>("#layout-debug-label");
  if (existing) return existing;

  const label = document.createElement("div");
  label.id = "layout-debug-label";
  label.className = "layout-debug-label";
  document.body.appendChild(label);
  return label;
}

function collectViewportDiagnostics(label: string, layout: AppliedLayout = lastLayout): Record<string, unknown> {
  const canvasRect = gameCanvas.getBoundingClientRect();
  const appRect = appContainer?.getBoundingClientRect();
  const viewport = layout.viewport;
  const orientation = viewport.width >= viewport.height ? "landscape" : "portrait";

  return {
    label,
    orientation,
    layoutMode: layout.mode,
    canvasFit: layout.profile.canvasFit,
    appliedCssVars: layout.profile.cssVars,
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
      aspectRatio: viewport.aspectRatio,
      hasTouch: viewport.hasTouch,
      safeArea: viewport.safeArea
    },
    canvasDisplay: layout.canvasDisplay,
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
  layoutDebugLabel ??= createLayoutDebugLabel();
  layoutDebugLabel.textContent = [
    `layout: ${lastLayout.mode}`,
    `viewport: ${Math.round(lastLayout.viewport.width)} x ${Math.round(lastLayout.viewport.height)}`,
    `classes: ${document.documentElement.className || "(none)"}`,
    `hud: ${lastLayout.profile.cssVars["--hud-scale"]} mission: ${lastLayout.profile.cssVars["--mission-scale"]} controls: ${lastLayout.profile.cssVars["--controls-scale"]}`,
    `tower: ${lastLayout.profile.cssVars["--tower-bar-scale"]}`,
    `gap: ${lastLayout.profile.cssVars["--hud-gap"]} towerGap: ${lastLayout.profile.cssVars["--tower-bar-gap"]}`
  ].join("\n");
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
    lastLayout = layoutManager.apply();
    updateViewportDiagnostics("viewport resize");
  }, 100);
}

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
  lastLayout = layoutManager.apply();
  const game = new Game(gameCanvas, assets);
  game.start();
  window.setTimeout(() => {
    logMobileStartupDiagnostics("startup");
    updateViewportDiagnostics("startup");
  }, 0);
}

void boot();
