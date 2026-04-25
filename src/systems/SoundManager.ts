import { SOUND_CONFIGS, SoundConfig, SoundKey } from "../config/sounds";

type SoundEntry = {
  config: SoundConfig;
  pool: HTMLAudioElement[];
  nextIndex: number;
  lastPlayedAt: number;
  available: boolean;
};

type AudioSkipReason = "muted" | "not unlocked" | "missing file" | "cooldown" | "pool busy" | "browser play rejected";

type AudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export class SoundManager {
  private static readonly STORAGE_KEY = "tower-defense-muted";
  private static readonly QUEUED_SOUND_KEYS = new Set<SoundKey>(["wave-start", "victory", "defeat", "boss-spawn"]);

  private readonly sounds = new Map<SoundKey, SoundEntry>();
  private readonly queuedSounds: SoundKey[] = [];
  private readonly debugAudio = this.isDebugAudioEnabled();
  private muted = false;
  private unlocked = false;
  private unlockStarted = false;
  private audioReady = false;

  constructor(configs: readonly SoundConfig[] = SOUND_CONFIGS) {
    this.muted = this.loadMutePreference();
    this.preload(configs);
    this.registerUnlockListeners();
  }

  preload(configs: readonly SoundConfig[]): void {
    if (typeof Audio === "undefined") return;

    for (const config of configs) {
      const poolSize = Math.max(1, config.poolSize ?? 1);
      const pool = Array.from({ length: poolSize }, () => this.createAudio(config));
      this.sounds.set(config.key, {
        config,
        pool,
        nextIndex: 0,
        lastPlayedAt: Number.NEGATIVE_INFINITY,
        available: true
      });
    }
  }

  play(key: SoundKey): void {
    this.debug("requested", key);
    const entry = this.sounds.get(key);
    if (!entry || !entry.config.enabled || !entry.available) {
      this.logSkipped(key, "missing file");
      return;
    }
    if (this.muted) {
      this.logSkipped(key, "muted");
      return;
    }
    if (!this.unlocked) {
      this.queueBeforeUnlock(key);
      this.logSkipped(key, "not unlocked");
      return;
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - entry.lastPlayedAt < entry.config.cooldownMs) {
      this.logSkipped(key, "cooldown");
      return;
    }

    const audio = this.getAvailableAudio(entry);
    if (!audio) {
      this.logSkipped(key, "pool busy");
      return;
    }

    entry.lastPlayedAt = now;

    try {
      audio.currentTime = 0;
      audio.volume = entry.config.volume;
      audio.muted = false;
      const result = audio.play();
      if (result) {
        result.then(() => this.debug("played", key)).catch(() => {
          this.logSkipped(key, "browser play rejected");
        });
      } else {
        this.debug("played", key);
      }
    } catch {
      this.logSkipped(key, "browser play rejected");
    }
  }

  unlock(): void {
    if (this.unlocked || this.unlockStarted) return;
    this.unlockStarted = true;
    this.debug("unlock requested");

    this.unlockAudioContext()
      .then(() => {
        this.unlocked = true;
        this.audioReady = true;
        this.debug("unlock succeeded");
        this.flushQueuedSounds();
      })
      .catch(() => {
        this.unlocked = true;
        this.audioReady = true;
        this.debug("unlock marked ready after browser rejection");
        this.flushQueuedSounds();
      })
      .finally(() => {
        this.unlockStarted = false;
      });

    // Best-effort priming for media elements on iOS/Safari. Rejections are normal
    // when files are absent, so readiness is owned by the audio context unlock.
    for (const entry of this.sounds.values()) {
      for (const audio of entry.pool) {
        this.primeAudio(audio);
      }
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.saveMutePreference();
    for (const entry of this.sounds.values()) {
      for (const audio of entry.pool) {
        audio.muted = muted;
      }
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  fireTower(): void {
    this.play("tower-fire");
  }

  enemyHit(): void {
    this.play("enemy-hit");
  }

  enemyDestroyed(): void {
    this.play("enemy-destroyed");
  }

  waveStart(): void {
    this.play("wave-start");
  }

  bossSpawn(): void {
    this.play("boss-spawn");
  }

  towerPlaced(): void {
    this.play("tower-placed");
  }

  towerUpgraded(): void {
    this.play("tower-upgraded");
  }

  towerSold(): void {
    this.play("tower-sold");
  }

  victory(): void {
    this.play("victory");
  }

  defeat(): void {
    this.play("defeat");
  }

  invalidPlacement(): void {
    this.play("invalid-placement");
  }

  private createAudio(config: SoundConfig): HTMLAudioElement {
    const audio = new Audio(config.path);
    audio.preload = "auto";
    audio.volume = config.volume;
    audio.muted = this.muted;
    audio.addEventListener("error", () => {
      const entry = this.sounds.get(config.key);
      if (entry) entry.available = false;
      this.logSkipped(config.key, "missing file");
    });
    audio.load();
    return audio;
  }

  private primeAudio(audio: HTMLAudioElement): void {
    try {
      audio.muted = true;
      audio.volume = 0;
      const result = audio.play();
      result
        ?.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = this.muted;
        })
        .catch(() => {
          audio.muted = this.muted;
        });
    } catch {
      audio.muted = this.muted;
    }
  }

  private registerUnlockListeners(): void {
    if (typeof window === "undefined") return;

    const unlock = (): void => this.unlock();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("click", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
  }

  private loadMutePreference(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SoundManager.STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  private saveMutePreference(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SoundManager.STORAGE_KEY, String(this.muted));
    } catch {
      // Storage can be blocked in private contexts; audio should keep working.
    }
  }

  private queueBeforeUnlock(key: SoundKey): void {
    if (!SoundManager.QUEUED_SOUND_KEYS.has(key)) return;
    if (this.queuedSounds.includes(key)) return;
    this.queuedSounds.push(key);
    this.debug("queued until unlock", key);
  }

  private getAvailableAudio(entry: SoundEntry): HTMLAudioElement | null {
    for (let offset = 0; offset < entry.pool.length; offset += 1) {
      const index = (entry.nextIndex + offset) % entry.pool.length;
      const audio = entry.pool[index];
      if (audio.paused || audio.ended) {
        entry.nextIndex = (index + 1) % entry.pool.length;
        return audio;
      }
    }

    return null;
  }

  private flushQueuedSounds(): void {
    if (this.queuedSounds.length === 0) return;

    const queued = this.queuedSounds.splice(0);
    this.debug(`flushing ${queued.length} queued sound(s): ${queued.join(", ")}`);
    for (const key of queued) {
      this.play(key);
    }
  }

  private async unlockAudioContext(): Promise<void> {
    if (typeof window === "undefined") return;

    const audioWindow = window as AudioContextWindow;
    const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    if (context.state === "suspended") {
      await context.resume();
    }

    const buffer = context.createBuffer(1, 1, 22050);
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = 0.00001;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(0);
  }

  private isDebugAudioEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debugAudio") === "1";
  }

  private logSkipped(key: SoundKey, reason: AudioSkipReason): void {
    this.debug(`skipped (${reason})`, key);
  }

  private debug(message: string, key?: SoundKey): void {
    if (!this.debugAudio) return;
    const readyState = this.audioReady ? "ready" : "not-ready";
    const unlockState = this.unlocked ? "unlocked" : "locked";
    console.info(`[audio] ${key ? `${key}: ` : ""}${message} [${unlockState}, ${readyState}]`);
  }
}
