import { ASSET_MANIFEST } from "./config/assets";
import { Game } from "./game/Game";
import { AssetManager } from "./systems/AssetManager";
import "./styles.css";

const LOGICAL_GAME_WIDTH = 1536;
const LOGICAL_GAME_HEIGHT = 864;

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const gameShell = document.querySelector<HTMLElement>("#game-shell");
const loadingScreen = document.querySelector<HTMLElement>("#loading-screen");
const loadingStatus = document.querySelector<HTMLElement>("#loading-status");

if (!canvas) {
  throw new Error("Missing #game-canvas element.");
}

const gameCanvas = canvas;
let viewportResizeTimer = 0;

function updateGameSurfaceFit(): void {
  const visualViewport = window.visualViewport;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const viewportHeight = visualViewport?.height ?? window.innerHeight;

  document.documentElement.style.setProperty("--visual-viewport-width", `${viewportWidth}px`);
  document.documentElement.style.setProperty("--visual-viewport-height", `${viewportHeight}px`);
  document.documentElement.style.setProperty("--game-width", `${LOGICAL_GAME_WIDTH}px`);
  document.documentElement.style.setProperty("--game-height", `${LOGICAL_GAME_HEIGHT}px`);

  if (!gameShell) return;

  const shellStyle = window.getComputedStyle(gameShell);
  const horizontalPadding = parseFloat(shellStyle.paddingLeft) + parseFloat(shellStyle.paddingRight);
  const verticalPadding = parseFloat(shellStyle.paddingTop) + parseFloat(shellStyle.paddingBottom);
  const availableWidth = Math.max(1, viewportWidth - horizontalPadding);
  const availableHeight = Math.max(1, viewportHeight - verticalPadding);
  const scale = Math.min(availableWidth / LOGICAL_GAME_WIDTH, availableHeight / LOGICAL_GAME_HEIGHT);

  document.documentElement.style.setProperty("--game-scale", `${scale}`);
}

function scheduleGameSurfaceFit(): void {
  window.clearTimeout(viewportResizeTimer);
  viewportResizeTimer = window.setTimeout(updateGameSurfaceFit, 100);
}

updateGameSurfaceFit();
window.addEventListener("resize", scheduleGameSurfaceFit);
window.addEventListener("orientationchange", scheduleGameSurfaceFit);
window.visualViewport?.addEventListener("resize", scheduleGameSurfaceFit);
window.visualViewport?.addEventListener("scroll", scheduleGameSurfaceFit);

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
}

void boot();
