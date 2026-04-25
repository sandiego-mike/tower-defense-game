import { ASSET_MANIFEST } from "./config/assets";
import { Game } from "./game/Game";
import { AssetManager } from "./systems/AssetManager";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const loadingScreen = document.querySelector<HTMLElement>("#loading-screen");
const loadingStatus = document.querySelector<HTMLElement>("#loading-status");

if (!canvas) {
  throw new Error("Missing #game-canvas element.");
}

const gameCanvas = canvas;

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
