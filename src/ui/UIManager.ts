import { DIFFICULTY_CONFIGS } from "../config/difficulties";
import { ENEMY_CONFIGS } from "../config/enemies";
import { MISSION_CONFIGS } from "../config/missions";
import { TOWER_CONFIGS } from "../config/towers";
import {
  DebugBalanceInfo,
  DifficultyId,
  EnemyType,
  GameState,
  MissionId,
  MissionSelectInfo,
  RunResult,
  SelectedTowerInfo,
  TargetingMode,
  TowerType
} from "../types";

interface UIButtonModel {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  enabled: boolean;
  onClick: (() => void) | null;
}

interface UIElementModel {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  enabled: boolean;
}

class UIControlRegistry {
  private readonly buttons = new Map<string, { model: UIButtonModel; element: HTMLButtonElement; overlay: HTMLDivElement }>();
  private readonly elements = new Map<string, { model: UIElementModel; element: HTMLElement; overlay: HTMLDivElement }>();
  private debugVisible = false;

  constructor(private readonly overlayRoot: HTMLElement) {}

  registerButton(element: HTMLButtonElement | null, id: string, label: string, onClick: () => void): void {
    if (!element) return;
    const overlay = this.createOverlay(id);
    const model: UIButtonModel = {
      id,
      label,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: !element.classList.contains("hidden"),
      enabled: !element.disabled,
      onClick
    };

    element.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!model.visible || !model.enabled) return;
      model.onClick?.();
    });
    element.addEventListener("pointerenter", () => {
      if (model.enabled) element.classList.add("is-hovered");
    });
    element.addEventListener("pointerleave", () => {
      element.classList.remove("is-hovered", "is-pressed");
    });
    element.addEventListener("pointerdown", () => {
      if (model.enabled) element.classList.add("is-pressed");
    });
    element.addEventListener("pointerup", () => {
      element.classList.remove("is-pressed");
    });
    element.addEventListener("pointercancel", () => {
      element.classList.remove("is-pressed");
    });

    this.buttons.set(id, { model, element, overlay });
    this.syncButton(id);
  }

  registerElement(element: HTMLElement | null, id: string, label: string): void {
    if (!element) return;
    const overlay = this.createOverlay(id);
    const model: UIElementModel = {
      id,
      label,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: !element.classList.contains("hidden"),
      enabled: !("disabled" in element) || !(element as HTMLSelectElement).disabled
    };

    this.elements.set(id, { model, element, overlay });
    this.syncElement(id);
  }

  setButtonState(id: string, updates: Partial<Omit<UIButtonModel, "id" | "x" | "y" | "width" | "height" | "onClick">>): void {
    const entry = this.buttons.get(id);
    if (!entry) return;

    Object.assign(entry.model, updates);
    entry.element.disabled = !entry.model.enabled;
    entry.element.classList.toggle("hidden", !entry.model.visible);
    entry.element.classList.toggle("is-disabled", !entry.model.enabled);
    entry.element.setAttribute("aria-disabled", String(!entry.model.enabled));
    this.syncButton(id);
  }

  setElementState(id: string, updates: Partial<Omit<UIElementModel, "id" | "x" | "y" | "width" | "height">>): void {
    const entry = this.elements.get(id);
    if (!entry) return;

    Object.assign(entry.model, updates);
    if ("disabled" in entry.element) {
      (entry.element as HTMLSelectElement).disabled = !entry.model.enabled;
    }
    entry.element.classList.toggle("hidden", !entry.model.visible);
    entry.element.classList.toggle("is-disabled", !entry.model.enabled);
    this.syncElement(id);
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    this.overlayRoot.classList.toggle("hidden", !visible);
    this.syncAll();
  }

  syncAll(): void {
    for (const id of this.buttons.keys()) {
      this.syncButton(id);
    }
    for (const id of this.elements.keys()) {
      this.syncElement(id);
    }
  }

  private syncButton(id: string): void {
    const entry = this.buttons.get(id);
    if (!entry) return;
    const { element, model, overlay } = entry;
    this.updateRect(model, element);
    this.updateOverlay(overlay, model);
  }

  private syncElement(id: string): void {
    const entry = this.elements.get(id);
    if (!entry) return;
    const { element, model, overlay } = entry;
    this.updateRect(model, element);
    this.updateOverlay(overlay, model);
  }

  private updateRect(model: UIButtonModel | UIElementModel, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    model.x = rect.left;
    model.y = rect.top;
    model.width = rect.width;
    model.height = rect.height;
    model.visible = !element.classList.contains("hidden");
    model.enabled = !("disabled" in element) || !(element as HTMLButtonElement | HTMLSelectElement).disabled;
  }

  private updateOverlay(overlay: HTMLDivElement, model: UIButtonModel | UIElementModel): void {
    const shouldShow = this.debugVisible && model.visible && model.width > 0 && model.height > 0;
    overlay.classList.toggle("hidden", !shouldShow);
    if (!shouldShow) return;

    overlay.style.left = `${model.x}px`;
    overlay.style.top = `${model.y}px`;
    overlay.style.width = `${model.width}px`;
    overlay.style.height = `${model.height}px`;
    overlay.textContent = model.label;
    overlay.classList.toggle("disabled", !model.enabled);
  }

  private createOverlay(id: string): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "ui-hitbox-outline hidden";
    overlay.dataset.controlId = id;
    this.overlayRoot.appendChild(overlay);
    return overlay;
  }
}

export class UIManager {
  private readonly startScreen = document.querySelector<HTMLElement>("#start-screen");
  private readonly hud = document.querySelector<HTMLElement>("#hud");
  private readonly towerPalette = document.querySelector<HTMLElement>("#tower-palette");
  private readonly missionSelect = document.querySelector<HTMLSelectElement>("#mission-select");
  private readonly difficultySelect = document.querySelector<HTMLSelectElement>("#difficulty-select");
  private readonly missionDescription = document.querySelector<HTMLElement>("#mission-description");
  private readonly missionProgress = document.querySelector<HTMLElement>("#mission-progress");
  private readonly startButton = document.querySelector<HTMLButtonElement>("#start-button");
  private readonly lifeValue = document.querySelector<HTMLElement>("#life-value");
  private readonly goldValue = document.querySelector<HTMLElement>("#gold-value");
  private readonly waveValue = document.querySelector<HTMLElement>("#wave-value");
  private readonly message = document.querySelector<HTMLElement>("#message");
  private readonly missionValue = document.querySelector<HTMLElement>("#mission-value");
  private readonly difficultyValue = document.querySelector<HTMLElement>("#difficulty-value");
  private readonly enemiesValue = document.querySelector<HTMLElement>("#enemies-value");
  private readonly remainingValue = document.querySelector<HTMLElement>("#remaining-value");
  private readonly countdownValue = document.querySelector<HTMLElement>("#countdown-value");
  private readonly waveInfoButton = document.querySelector<HTMLButtonElement>("#wave-info-button");
  private readonly waveInfoPanel = document.querySelector<HTMLElement>("#wave-info-panel");
  private readonly waveInfoToggle = document.querySelector<HTMLButtonElement>("#wave-info-toggle");
  private readonly waveInfoContent = document.querySelector<HTMLElement>("#wave-info-content");
  private readonly pauseButton = document.querySelector<HTMLButtonElement>("#pause-button");
  private readonly soundToggleButton = document.querySelector<HTMLButtonElement>("#sound-toggle-button");
  private readonly speedSelect = document.querySelector<HTMLSelectElement>("#speed-select");
  private readonly debugPanel = document.querySelector<HTMLElement>("#debug-panel");
  private readonly debugContent = document.querySelector<HTMLElement>("#debug-content");
  private readonly debugHealthBarsButton = document.querySelector<HTMLButtonElement>("#debug-health-bars-button");
  private readonly debugEffectsButton = document.querySelector<HTMLButtonElement>("#debug-effects-button");
  private readonly debugHitboxesButton = document.querySelector<HTMLButtonElement>("#debug-hitboxes-button");
  private readonly debugCullingButton = document.querySelector<HTMLButtonElement>("#debug-culling-button");
  private readonly toast = document.querySelector<HTMLElement>("#toast");
  private readonly towerInspector = document.querySelector<HTMLElement>("#tower-inspector");
  private readonly towerInfo = document.querySelector<HTMLElement>("#tower-info");
  private readonly towerStats = document.querySelector<HTMLElement>("#tower-stats");
  private readonly upgradeButton = document.querySelector<HTMLButtonElement>("#upgrade-button");
  private readonly sellButton = document.querySelector<HTMLButtonElement>("#sell-button");
  private readonly targetingSelect = document.querySelector<HTMLSelectElement>("#targeting-select");
  private readonly cancelPlacementButton = document.querySelector<HTMLButtonElement>("#cancel-placement-button");
  private readonly messageTitle = document.querySelector<HTMLElement>("#message-title");
  private readonly messageBody = document.querySelector<HTMLElement>("#message-body");
  private readonly messageResumeButton = document.querySelector<HTMLButtonElement>("#message-resume-button");
  private readonly messageRestartButton = document.querySelector<HTMLButtonElement>("#message-restart-button");
  private readonly messageMenuButton = document.querySelector<HTMLButtonElement>("#message-menu-button");
  private readonly messageResetCameraButton = document.querySelector<HTMLButtonElement>("#message-reset-camera-button");
  private readonly messageSkipWaveButton = document.querySelector<HTMLButtonElement>("#message-skip-wave-button");
  private readonly messageDebugButton = document.querySelector<HTMLButtonElement>("#message-debug-button");
  private readonly towerButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tower-button"));
  private readonly showDebugControls = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? false;
  private readonly hitboxOverlayRoot = this.createHitboxOverlayRoot();
  private readonly controlRegistry = new UIControlRegistry(this.hitboxOverlayRoot);
  private missionInfos: MissionSelectInfo[] = [];
  private waveInfoOpen = false;
  private lastKnownState: GameState = "menu";

  constructor(
    onStart: (missionId: MissionId, difficultyId: DifficultyId) => void,
    onUpgradeTower: () => void,
    onSellTower: () => void,
    onChangeTargetingMode: (mode: TargetingMode) => void,
    onPause: () => void,
    onResume: () => void,
    onRestart: () => void,
    onReturnToMenu: () => void,
    onToggleDebug: () => void,
    onSkipWave: () => void,
    onSetGameSpeed: (speed: number) => void,
    onCancelPlacement: () => void,
    onToggleHealthBars: () => void,
    onToggleEffects: () => void,
    onToggleDebugHitboxes: () => void,
    onToggleCullingBounds: () => void,
    onResetCamera: () => void,
    onToggleMute: () => void,
    private readonly isMissionUnlocked: (missionId: MissionId) => boolean
  ) {
    this.populateSelects();
    this.updateMissionDescription();
    this.registerControls(
      onStart,
      onUpgradeTower,
      onSellTower,
      onPause,
      onResume,
      onRestart,
      onReturnToMenu,
      onToggleDebug,
      onSkipWave,
      onCancelPlacement,
      onToggleHealthBars,
      onToggleEffects,
      onToggleDebugHitboxes,
      onToggleCullingBounds,
      onResetCamera,
      onToggleMute
    );

    this.missionSelect?.addEventListener("change", () => this.updateMissionDescription());
    this.targetingSelect?.addEventListener("change", () => {
      onChangeTargetingMode(this.targetingSelect?.value as TargetingMode);
    });
    this.speedSelect?.addEventListener("change", () => {
      onSetGameSpeed(Number(this.speedSelect?.value ?? 1));
    });
    window.addEventListener("resize", () => this.controlRegistry.syncAll());
  }

  update(
    life: number,
    maxLife: number,
    currentWave: number,
    totalWaves: number,
    selectedTower: TowerType | null,
    state: GameState,
    missionId: MissionId,
    difficultyId: DifficultyId,
    activeEnemyTypes: EnemyType[],
    selectedTowerInfo: SelectedTowerInfo | null,
    remainingEnemies: number,
    nextWaveCountdown: number,
    placementMessage: string,
    gold: number,
    infiniteGold: boolean,
    runResult: RunResult | null,
    missionInfos: MissionSelectInfo[],
    debugBalanceInfo: DebugBalanceInfo,
    soundMuted: boolean
  ): void {
    this.lastKnownState = state;
    this.missionInfos = missionInfos;
    this.renderMissionOptions();
    this.updateMissionDescription();

    if (this.lifeValue) this.lifeValue.textContent = `${life} / ${maxLife}`;
    if (this.goldValue) this.goldValue.textContent = infiniteGold ? "∞" : String(gold);
    if (this.waveValue) this.waveValue.textContent = `${currentWave} / ${totalWaves}`;
    if (this.missionValue) this.missionValue.textContent = MISSION_CONFIGS[missionId].label;
    if (this.difficultyValue) this.difficultyValue.textContent = DIFFICULTY_CONFIGS[difficultyId].label;
    if (this.enemiesValue) {
      this.enemiesValue.textContent =
        activeEnemyTypes.length > 0 ? activeEnemyTypes.map((enemyType) => ENEMY_CONFIGS[enemyType].label).join(", ") : "None";
    }
    if (this.remainingValue) this.remainingValue.textContent = String(remainingEnemies);
    if (this.countdownValue) this.countdownValue.textContent = nextWaveCountdown > 0 ? `${nextWaveCountdown.toFixed(1)}s` : "-";
    if (this.toast) {
      this.toast.textContent = placementMessage;
      this.toast.classList.toggle("hidden", placementMessage.length === 0);
    }

    for (const button of this.towerButtons) {
      button.classList.toggle("selected", button.dataset.tower === selectedTower);
    }
    this.cancelPlacementButton?.classList.toggle("hidden", selectedTower === null);

    this.startScreen?.classList.toggle("hidden", state !== "menu");
    this.hud?.classList.toggle("hidden", state === "menu");
    this.towerPalette?.classList.toggle("hidden", state === "menu" || state === "paused");
    if (state !== "playing") {
      this.waveInfoOpen = false;
    }
    this.waveInfoButton?.classList.toggle("hidden", state !== "playing");
    this.renderWaveInfoPanel(state);
    this.pauseButton?.classList.toggle("hidden", state !== "playing");
    this.renderSoundToggle(soundMuted, state);
    if (this.speedSelect) this.speedSelect.value = String(debugBalanceInfo.gameSpeed);
    this.renderDebugPanel(debugBalanceInfo, state);
    this.renderTowerInspector(selectedTowerInfo, state, gold, infiniteGold);
    this.controlRegistry.setDebugVisible(debugBalanceInfo.enabled);
    this.controlRegistry.syncAll();

    if (!this.message) return;
    this.message.classList.toggle("hidden", state === "playing" || state === "menu");
    this.renderMessage(state, runResult, debugBalanceInfo);
    // Message buttons change visibility inside renderMessage(). Sync after that
    // so the reusable UI button hitboxes match the visible pause menu controls.
    this.controlRegistry.syncAll();
  }

  private get selectedMissionId(): MissionId {
    return (this.missionSelect?.value as MissionId | undefined) ?? "green-pass";
  }

  private get selectedDifficultyId(): DifficultyId {
    return (this.difficultySelect?.value as DifficultyId | undefined) ?? "normal";
  }

  private populateSelects(): void {
    this.renderMissionOptions();

    if (this.difficultySelect) {
      this.difficultySelect.innerHTML = Object.values(DIFFICULTY_CONFIGS)
        .map((difficulty) => `<option value="${difficulty.id}">${difficulty.label}</option>`)
        .join("");
      this.difficultySelect.value = "normal";
    }

    if (this.targetingSelect) {
      this.targetingSelect.innerHTML = [
        ["first", "First enemy"],
        ["strongest", "Strongest enemy"],
        ["closest", "Closest enemy"],
        ["fastest", "Fastest enemy"]
      ]
        .map(([value, label]) => `<option value="${value}">${label}</option>`)
        .join("");
    }
  }

  private updateMissionDescription(): void {
    const mission = MISSION_CONFIGS[this.selectedMissionId];
    const missionInfo = this.missionInfos.find((info) => info.id === this.selectedMissionId);
    const locked = missionInfo?.locked ?? !this.isMissionUnlocked(this.selectedMissionId);

    if (this.missionDescription) {
      this.missionDescription.textContent = locked ? `${mission.description} Complete the previous mission to unlock.` : mission.description;
    }

    if (this.missionProgress) {
      if (!missionInfo) {
        this.missionProgress.textContent = "";
      } else if (missionInfo.completed) {
        this.missionProgress.textContent = `Completed | Best ${missionInfo.bestScore} | ${"★".repeat(missionInfo.bestStars)}`;
      } else {
        this.missionProgress.textContent = locked ? "Locked" : "Not completed";
      }
    }

    if (this.startButton) {
      this.startButton.disabled = locked;
      this.startButton.textContent = locked ? "Locked" : "Start Game";
    }
  }

  private renderTowerInspector(selectedTowerInfo: SelectedTowerInfo | null, state: GameState, gold: number, infiniteGold: boolean): void {
    const shouldShow = state === "playing" && selectedTowerInfo !== null;
    this.towerInspector?.classList.toggle("hidden", !shouldShow);
    this.controlRegistry.setButtonState("upgrade", { visible: shouldShow, enabled: false });
    this.controlRegistry.setButtonState("sell", { visible: shouldShow, enabled: shouldShow });
    this.controlRegistry.setElementState("targeting", { visible: shouldShow, enabled: shouldShow });
    if (!selectedTowerInfo) return;

    if (this.towerInfo) {
      this.towerInfo.textContent = `${selectedTowerInfo.label} L${selectedTowerInfo.level}/${selectedTowerInfo.maxLevel}`;
    }
    if (this.towerStats) {
      const stats = [
        ["Damage", String(selectedTowerInfo.damage)],
        ["Range", String(selectedTowerInfo.range)],
        ["Fire rate", `${selectedTowerInfo.fireRate.toFixed(2)}/s`],
        ["Targeting", this.formatTargetingMode(selectedTowerInfo.targetingMode)],
        ["Upgrade", selectedTowerInfo.upgradeCost ?? "Max"],
        ["Sell", String(selectedTowerInfo.sellRefund)],
        ["DPS", selectedTowerInfo.dps.toFixed(1)]
      ];

      if (selectedTowerInfo.splashRadius) {
        stats.push(["Bomb radius", String(selectedTowerInfo.splashRadius)]);
      }

      if (selectedTowerInfo.slowAmount && selectedTowerInfo.slowDuration) {
        stats.push(["Frost", `${Math.round(selectedTowerInfo.slowAmount * 100)}% / ${selectedTowerInfo.slowDuration.toFixed(1)}s`]);
      }

      stats.push(["Invested", String(selectedTowerInfo.totalInvestedGold)]);
      this.towerStats.innerHTML = stats
        .map(([label, value]) => `<div class="tower-stat"><span>${label}</span><strong>${value}</strong></div>`)
        .join("");
    }

    if (this.upgradeButton) {
      const isMaxLevel = selectedTowerInfo.level >= selectedTowerInfo.maxLevel;
      this.upgradeButton.textContent = isMaxLevel ? "Max Level" : `Upgrade (${selectedTowerInfo.upgradeCost})`;
      const canAffordUpgrade = infiniteGold || selectedTowerInfo.upgradeCost === null || gold >= selectedTowerInfo.upgradeCost;
      this.controlRegistry.setButtonState("upgrade", {
        label: this.upgradeButton.textContent,
        visible: shouldShow,
        enabled: !isMaxLevel && canAffordUpgrade
      });
    }

    if (this.targetingSelect) {
      this.targetingSelect.value = selectedTowerInfo.targetingMode;
      this.controlRegistry.setElementState("targeting", {
        label: `Targeting ${this.formatTargetingMode(selectedTowerInfo.targetingMode)}`,
        visible: shouldShow,
        enabled: true
      });
    }

    if (this.sellButton) {
      this.sellButton.textContent = `Sell (${selectedTowerInfo.sellRefund})`;
      this.controlRegistry.setButtonState("sell", {
        label: this.sellButton.textContent,
        visible: shouldShow,
        enabled: true
      });
    }
  }

  private renderWaveInfoPanel(state: GameState): void {
    const shouldShow = state === "playing" && this.waveInfoOpen;
    this.waveInfoPanel?.classList.toggle("hidden", !shouldShow);
    this.waveInfoContent?.classList.toggle("hidden", !this.waveInfoOpen);

    if (this.waveInfoButton) {
      this.waveInfoButton.setAttribute("aria-expanded", String(this.waveInfoOpen));
      this.waveInfoButton.classList.toggle("active", this.waveInfoOpen);
      this.controlRegistry.setButtonState("wave-info", { visible: state === "playing", enabled: true });
    }
    if (this.waveInfoToggle) {
      this.waveInfoToggle.textContent = this.waveInfoOpen ? "Close" : "Wave Details";
      this.waveInfoToggle.setAttribute("aria-expanded", String(this.waveInfoOpen));
      this.controlRegistry.setButtonState("wave-info-toggle", { label: this.waveInfoToggle.textContent, visible: shouldShow, enabled: true });
    }
  }

  private renderSoundToggle(soundMuted: boolean, state: GameState): void {
    const visible = state !== "menu";
    this.soundToggleButton?.classList.toggle("hidden", !visible);
    if (!this.soundToggleButton) return;

    this.soundToggleButton.textContent = soundMuted ? "🔇" : "🔊";
    this.soundToggleButton.setAttribute("aria-label", soundMuted ? "Unmute sound" : "Mute sound");
    this.soundToggleButton.setAttribute("aria-pressed", String(soundMuted));
    this.controlRegistry.setButtonState("sound-toggle", {
      label: soundMuted ? "Unmute Sound" : "Mute Sound",
      visible,
      enabled: true
    });
  }

  private formatTargetingMode(mode: TargetingMode): string {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  private renderMessage(state: GameState, runResult: RunResult | null, debugBalanceInfo: DebugBalanceInfo): void {
    if (!this.messageTitle || !this.messageBody) return;

    if (state === "paused") {
      this.messageTitle.textContent = "Paused";
      this.messageBody.textContent = "Take a breath. The wave is waiting.";
    } else if (state === "won") {
      this.messageTitle.textContent = "Victory";
      this.messageBody.textContent = runResult
        ? `Score ${runResult.score} | ${"★".repeat(runResult.stars)} | Defeated ${runResult.enemiesDefeated}`
        : "All waves cleared. The base survived.";
    } else if (state === "lost") {
      this.messageTitle.textContent = "Defeat";
      this.messageBody.textContent = "The base fell. Try a different mission, difficulty, or tower plan.";
    } else {
      this.messageTitle.textContent = "";
      this.messageBody.textContent = "";
    }

    this.messageResumeButton?.classList.toggle("hidden", state !== "paused");
    this.messageRestartButton?.classList.toggle("hidden", state === "menu");
    this.messageMenuButton?.classList.toggle("hidden", state === "menu");
    this.messageResetCameraButton?.classList.toggle("hidden", state === "menu");
    this.messageSkipWaveButton?.classList.toggle("hidden", !debugBalanceInfo.enabled || state !== "paused");
    this.messageDebugButton?.classList.toggle("hidden", !this.showDebugControls || state !== "paused");
    if (this.messageDebugButton) {
      this.messageDebugButton.textContent = debugBalanceInfo.enabled ? "Debug On" : "Debug";
    }
  }

  private renderDebugPanel(debugBalanceInfo: DebugBalanceInfo, state: GameState): void {
    const shouldShow = debugBalanceInfo.enabled && state !== "menu";
    this.debugPanel?.classList.toggle("hidden", !shouldShow);
    if (!this.debugContent || !debugBalanceInfo.currentWave) return;

    const multipliers = debugBalanceInfo.currentMultipliers;
    const currentWave = debugBalanceInfo.currentWave;
    const performance = debugBalanceInfo.performance;
    const toggles = debugBalanceInfo.toggles;
    const path = debugBalanceInfo.path;
    const towerDps = debugBalanceInfo.towerDps.map((tower) => `${tower.label} ${tower.dps.toFixed(1)}`).join(" | ");
    const enemyTypes = currentWave.enemyTypes.map((enemyType) => ENEMY_CONFIGS[enemyType].label).join(", ");
    const hoveredProgress =
      path.hoveredEnemyProgress === null ? "none" : `${Math.round(path.hoveredEnemyProgress * 100)}% seg ${path.hoveredEnemySegment ?? 0}`;

    this.debugContent.textContent = [
      `Speed ${debugBalanceInfo.gameSpeed}x`,
      `FPS ${performance.fps} | E ${performance.enemies} | P ${performance.projectiles} | FX ${performance.effects} | T ${performance.towers}`,
      `Rendered E ${performance.renderedEnemies}/${performance.enemies} | P ${performance.renderedProjectiles}/${performance.projectiles} | FX ${performance.renderedEffects}/${performance.effects}`,
      `Culled E ${performance.culledEnemies} | P ${performance.culledProjectiles} | FX ${performance.culledEffects}`,
      `Render health ${toggles.healthBars ? "on" : "off"} | effects ${toggles.effects ? "on" : "off"} | hitboxes ${toggles.hitboxes ? "on" : "off"} | cull ${toggles.cullingBounds ? "on" : "off"}`,
      `Path ${path.totalLength}px | Hover ${hoveredProgress}`,
      `Camera x ${path.cameraX.toFixed(1)} y ${path.cameraY.toFixed(1)} z ${path.cameraZoom.toFixed(2)}`,
      `Multipliers H ${multipliers.health} | S ${multipliers.speed} | C ${multipliers.count} | R ${multipliers.rewards} | Spawn ${multipliers.spawnInterval}`,
      `Wave ${currentWave.waveNumber}: ${currentWave.label} | ${currentWave.totalEnemies} enemies | ${currentWave.totalHealth} HP | ${currentWave.goldIncome} gold`,
      `Types ${enemyTypes}`,
      `Tower DPS ${towerDps}`
    ].join("\n");

    if (this.debugHealthBarsButton) this.debugHealthBarsButton.textContent = `Health Bars ${toggles.healthBars ? "On" : "Off"}`;
    if (this.debugEffectsButton) this.debugEffectsButton.textContent = `Effects ${toggles.effects ? "On" : "Off"}`;
    if (this.debugHitboxesButton) this.debugHitboxesButton.textContent = `Hitboxes ${toggles.hitboxes ? "On" : "Off"}`;
    if (this.debugCullingButton) this.debugCullingButton.textContent = `Cull Bounds ${toggles.cullingBounds ? "On" : "Off"}`;
  }

  private renderMissionOptions(): void {
    if (!this.missionSelect) return;

    const selectedMission = this.missionSelect.value || "green-pass";
    const infos =
      this.missionInfos.length > 0
        ? this.missionInfos
        : Object.values(MISSION_CONFIGS).map((mission) => ({
            id: mission.id,
            label: mission.label,
            locked: !this.isMissionUnlocked(mission.id),
            completed: false,
            bestScore: 0,
            bestStars: 0
          }));

    this.missionSelect.innerHTML = infos
      .map((info) => {
        const status = info.locked ? "Locked" : info.completed ? `Done ${info.bestScore} ${"★".repeat(info.bestStars)}` : "Open";
        return `<option value="${info.id}" ${info.locked ? "disabled" : ""}>${info.label} - ${status}</option>`;
      })
      .join("");

    if (infos.some((info) => info.id === selectedMission && !info.locked)) {
      this.missionSelect.value = selectedMission;
    } else {
      this.missionSelect.value = infos.find((info) => !info.locked)?.id ?? "green-pass";
    }
  }

  private registerControls(
    onStart: (missionId: MissionId, difficultyId: DifficultyId) => void,
    onUpgradeTower: () => void,
    onSellTower: () => void,
    onPause: () => void,
    onResume: () => void,
    onRestart: () => void,
    onReturnToMenu: () => void,
    onToggleDebug: () => void,
    onSkipWave: () => void,
    onCancelPlacement: () => void,
    onToggleHealthBars: () => void,
    onToggleEffects: () => void,
    onToggleDebugHitboxes: () => void,
    onToggleCullingBounds: () => void,
    onResetCamera: () => void,
    onToggleMute: () => void
  ): void {
    this.controlRegistry.registerButton(this.startButton, "start", "Start", () => onStart(this.selectedMissionId, this.selectedDifficultyId));
    this.controlRegistry.registerButton(this.pauseButton, "pause", "Pause", onPause);
    this.controlRegistry.registerButton(this.soundToggleButton, "sound-toggle", "Mute Sound", onToggleMute);
    this.controlRegistry.registerButton(this.waveInfoButton, "wave-info", "Wave Details", () => {
      this.waveInfoOpen = !this.waveInfoOpen;
      this.renderWaveInfoPanel(this.lastKnownState);
    });
    this.controlRegistry.registerButton(this.waveInfoToggle, "wave-info-toggle", "Wave Details", () => {
      this.waveInfoOpen = !this.waveInfoOpen;
      this.renderWaveInfoPanel(this.lastKnownState);
    });
    this.controlRegistry.registerButton(this.cancelPlacementButton, "cancel-placement", "Cancel Placement", onCancelPlacement);
    this.controlRegistry.registerButton(this.upgradeButton, "upgrade", "Upgrade", onUpgradeTower);
    this.controlRegistry.registerButton(this.sellButton, "sell", "Sell", onSellTower);
    this.controlRegistry.registerElement(this.targetingSelect, "targeting", "Targeting");
    this.controlRegistry.registerButton(this.messageResumeButton, "resume", "Resume", onResume);
    this.controlRegistry.registerButton(this.messageRestartButton, "restart", "Restart", onRestart);
    this.controlRegistry.registerButton(this.messageMenuButton, "mission-menu", "Mission Select", onReturnToMenu);
    this.controlRegistry.registerButton(this.messageResetCameraButton, "reset-camera", "Reset Camera", onResetCamera);
    this.controlRegistry.registerButton(this.messageSkipWaveButton, "skip-wave", "Skip Wave", onSkipWave);
    this.controlRegistry.registerButton(this.messageDebugButton, "toggle-debug", "Debug", onToggleDebug);
    this.controlRegistry.registerButton(this.debugHealthBarsButton, "debug-health-bars", "Health Bars", onToggleHealthBars);
    this.controlRegistry.registerButton(this.debugEffectsButton, "debug-effects", "Effects", onToggleEffects);
    this.controlRegistry.registerButton(this.debugHitboxesButton, "debug-hitboxes", "Hitboxes", onToggleDebugHitboxes);
    this.controlRegistry.registerButton(this.debugCullingButton, "debug-culling", "Culling", onToggleCullingBounds);
  }

  private createHitboxOverlayRoot(): HTMLElement {
    const existing = document.querySelector<HTMLElement>("#ui-hitbox-overlay");
    if (existing) return existing;

    const overlay = document.createElement("div");
    overlay.id = "ui-hitbox-overlay";
    overlay.className = "ui-hitbox-overlay hidden";
    document.body.appendChild(overlay);
    return overlay;
  }
}
