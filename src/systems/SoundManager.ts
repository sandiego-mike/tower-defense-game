import { AMBIENT_CONFIGS, AmbientConfig, AmbientKey, SOUND_CONFIGS, SoundConfig, SoundKey } from "../config/sounds";

type SoundEntry = {
  config: SoundConfig;
  arrayBuffer: ArrayBuffer | null;
  buffer: AudioBuffer | null;
  fetchPromise: Promise<void> | null;
  decodePromise: Promise<AudioBuffer | null> | null;
  failed: boolean;
  lastPlayedAt: number;
  fallbackPool: SoundPoolItem[];
  nextFallbackIndex: number;
};

type SoundPoolItem = {
  audio: HTMLAudioElement;
  lastStartedAt: number;
};

type AmbientEntry = {
  config: AmbientConfig;
  arrayBuffer: ArrayBuffer | null;
  buffer: AudioBuffer | null;
  fetchPromise: Promise<void> | null;
  decodePromise: Promise<AudioBuffer | null> | null;
  failed: boolean;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  activeGainValue: number;
  fallbackAudio: HTMLAudioElement | null;
  fadeTimeoutId: ReturnType<typeof setTimeout> | null;
  fadeIntervalId: ReturnType<typeof setInterval> | null;
  suspended: boolean;
  startGeneration: number;
};

type AudioSkipReason = "muted" | "locked" | "missing" | "cooldown" | "pool busy" | "rejected";

type AudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export class SoundManager {
  private static readonly STORAGE_KEY = "tower-defense-muted";
  private static readonly QUEUED_SOUND_KEYS = new Set<SoundKey>([
    "tower-placed",
    "tower-upgraded",
    "tower-sold",
    "invalid-placement",
    "wave-start",
    "boss-spawn",
    "victory",
    "defeat"
  ]);
  private static readonly SPAMMY_SOUND_KEYS = new Set<SoundKey>(["tower-fire", "enemy-hit"]);

  private readonly sounds = new Map<SoundKey, SoundEntry>();
  private readonly ambients = new Map<AmbientKey, AmbientEntry>();
  private readonly queuedSounds: SoundKey[] = [];
  private readonly debugAudio = this.isDebugAudioEnabled();
  private readonly webAudioSupported = this.hasWebAudioSupport();
  private muted = false;
  private unlocked = false;
  private unlockStarted = false;
  private audioReady = false;
  private audioContext: AudioContext | null = null;
  private pendingAmbient: { key: AmbientKey; durationMs: number } | null = null;

  constructor(
    configs: readonly SoundConfig[] = SOUND_CONFIGS,
    ambientConfigs: readonly AmbientConfig[] = AMBIENT_CONFIGS
  ) {
    this.muted = this.loadMutePreference();
    this.preload(configs);
    this.preloadAmbient(ambientConfigs);
    this.registerUnlockListeners();
  }

  preload(configs: readonly SoundConfig[]): void {
    this.sounds.clear();

    for (const config of configs) {
      const entry: SoundEntry = {
        config,
        arrayBuffer: null,
        buffer: null,
        fetchPromise: null,
        decodePromise: null,
        failed: false,
        lastPlayedAt: Number.NEGATIVE_INFINITY,
        fallbackPool: this.webAudioSupported ? [] : this.createFallbackPool(config),
        nextFallbackIndex: 0
      };

      this.sounds.set(config.key, entry);
      if (this.webAudioSupported) {
        entry.fetchPromise = this.fetchSound(entry);
      }
    }
  }

  preloadAmbient(configs: readonly AmbientConfig[]): void {
    this.ambients.clear();

    for (const config of configs) {
      const entry: AmbientEntry = {
        config,
        arrayBuffer: null,
        buffer: null,
        fetchPromise: null,
        decodePromise: null,
        failed: false,
        source: null,
        gainNode: null,
        activeGainValue: 0,
        fallbackAudio: !this.webAudioSupported ? this.createAmbientFallbackAudio(config) : null,
        fadeTimeoutId: null,
        fadeIntervalId: null,
        suspended: false,
        startGeneration: 0
      };

      this.ambients.set(config.key, entry);
      if (this.webAudioSupported) {
        entry.fetchPromise = this.fetchAmbient(entry);
      }
    }
  }

  play(key: SoundKey): void {
    this.debug("requested", key);
    const entry = this.sounds.get(key);
    if (!entry || !entry.config.enabled || entry.failed) {
      this.logSkipped(key, "missing");
      return;
    }
    if (this.muted) {
      this.logSkipped(key, "muted");
      return;
    }
    if (!this.unlocked) {
      this.queueBeforeUnlock(key);
      this.logSkipped(key, "locked");
      return;
    }

    const now = this.now();
    if (this.shouldApplyCooldown(key) && now - entry.lastPlayedAt < entry.config.cooldownMs) {
      this.logSkipped(key, "cooldown");
      return;
    }
    entry.lastPlayedAt = now;

    if (this.webAudioSupported) {
      void this.playWithWebAudio(entry, key);
      return;
    }

    this.playWithFallbackAudio(entry, key, now);
  }

  unlock(): void {
    if (this.unlocked || this.unlockStarted) return;
    this.unlockStarted = true;
    this.debug("unlock requested");

    const unlockPromise = this.webAudioSupported ? this.unlockWebAudio() : this.unlockFallbackAudio();
    unlockPromise
      .then(() => {
        this.unlocked = true;
        this.audioReady = true;
        this.debug("unlock succeeded");
        if (this.webAudioSupported) {
          void this.decodeAllSounds();
        }
        this.flushQueuedSounds();
      })
      .catch(() => {
        this.unlocked = true;
        this.audioReady = true;
        this.debug("unlock marked ready after rejection");
        this.flushQueuedSounds();
      })
      .finally(() => {
        this.unlockStarted = false;
      });
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.saveMutePreference();
    for (const entry of this.sounds.values()) {
      for (const item of entry.fallbackPool) {
        item.audio.muted = muted;
      }
    }
    for (const entry of this.ambients.values()) {
      if (entry.gainNode && this.audioContext && !entry.suspended) {
        const target = muted ? 0 : entry.activeGainValue;
        entry.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        entry.gainNode.gain.linearRampToValueAtTime(target, this.audioContext.currentTime + 0.6);
      }
      if (entry.fallbackAudio) {
        entry.fallbackAudio.muted = muted;
      }
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- Ambient loop API ---

  playLoop(key: AmbientKey): void {
    this.fadeInLoop(key, 0);
  }

  stopLoop(key: AmbientKey): void {
    const entry = this.ambients.get(key);
    if (entry) this.stopAmbientEntry(entry);
  }

  stopAllLoops(): void {
    for (const entry of this.ambients.values()) {
      this.stopAmbientEntry(entry);
    }
    this.pendingAmbient = null;
  }

  fadeInLoop(key: AmbientKey, durationMs: number): void {
    if (!this.unlocked) {
      this.pendingAmbient = { key, durationMs };
      return;
    }

    const entry = this.ambients.get(key);
    if (!entry || !entry.config.enabled || entry.failed) return;

    this.stopAllLoopsExcept(key);

    if (this.isAmbientActive(entry)) return;

    if (this.webAudioSupported) {
      void this.startAmbientWebAudio(entry, durationMs);
    } else {
      this.startAmbientFallback(entry, durationMs);
    }
  }

  fadeOutLoop(key: AmbientKey, durationMs: number): void {
    const entry = this.ambients.get(key);
    if (!entry) return;

    if (this.webAudioSupported && entry.gainNode && entry.source && this.audioContext) {
      this.clearAmbientFadeTimers(entry);
      const context = this.audioContext;
      const currentGain = entry.gainNode.gain.value;
      entry.gainNode.gain.cancelScheduledValues(context.currentTime);
      entry.gainNode.gain.setValueAtTime(currentGain, context.currentTime);
      entry.gainNode.gain.linearRampToValueAtTime(0, context.currentTime + durationMs / 1000);
      entry.activeGainValue = 0;
      entry.fadeTimeoutId = setTimeout(() => this.stopAmbientEntry(entry), durationMs + 60);
    } else if (entry.fallbackAudio && !entry.fallbackAudio.paused) {
      this.fadeOutAmbientFallback(entry, durationMs);
    }
  }

  fadeOutAllLoops(durationMs: number): void {
    for (const [key, entry] of this.ambients) {
      if (this.isAmbientActive(entry)) {
        this.fadeOutLoop(key, durationMs);
      }
    }
    this.pendingAmbient = null;
  }

  pauseAllLoops(): void {
    for (const entry of this.ambients.values()) {
      if (!this.isAmbientActive(entry)) continue;
      entry.suspended = true;
      if (entry.gainNode && this.audioContext) {
        entry.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        entry.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      } else if (entry.fallbackAudio && !entry.fallbackAudio.paused) {
        entry.fallbackAudio.pause();
      }
    }
  }

  resumeAllLoops(): void {
    for (const entry of this.ambients.values()) {
      if (!entry.suspended) continue;
      entry.suspended = false;
      if (this.muted) continue;
      if (entry.gainNode && this.audioContext) {
        entry.gainNode.gain.setValueAtTime(entry.activeGainValue, this.audioContext.currentTime);
      } else if (entry.fallbackAudio) {
        entry.fallbackAudio.play().catch(() => {
          entry.failed = true;
        });
      }
    }
  }

  // --- Convenience aliases ---

  fireTower(): void {
    this.play("tower-fire");
  }

  enemyHit(): void {
    this.play("enemy-hit");
  }

  enemyDestroyed(): void {
    this.play("enemy-destroyed");
  }

  bossDestroyed(): void {
    this.play("boss-destroyed");
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

  // --- Regular sound internals ---

  private async playWithWebAudio(entry: SoundEntry, key: SoundKey): Promise<void> {
    try {
      const context = await this.resumeAudioContext();
      const buffer = await this.ensureDecodedBuffer(entry);
      if (!buffer) {
        this.logSkipped(key, "missing");
        return;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = entry.config.volume;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(context.destination);
      source.start(0);
      this.debug("played", key);
    } catch {
      this.logSkipped(key, "rejected");
    }
  }

  private playWithFallbackAudio(entry: SoundEntry, key: SoundKey, now: number): void {
    const poolItem = this.getFallbackPoolItem(entry, key);
    if (!poolItem) {
      this.logSkipped(key, "pool busy");
      return;
    }

    poolItem.lastStartedAt = now;
    try {
      const { audio } = poolItem;
      if (!audio.paused && !audio.ended) {
        audio.pause();
      }
      audio.currentTime = 0;
      audio.volume = entry.config.volume;
      audio.muted = false;
      const result = audio.play();
      if (result) {
        result.then(() => this.debug("played", key)).catch(() => this.logSkipped(key, "rejected"));
      } else {
        this.debug("played", key);
      }
    } catch {
      this.logSkipped(key, "rejected");
    }
  }

  private async fetchSound(entry: SoundEntry): Promise<void> {
    if (typeof fetch === "undefined") {
      entry.failed = true;
      this.debug("fetch unavailable", entry.config.key);
      return;
    }

    try {
      const response = await fetch(entry.config.path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      entry.arrayBuffer = await response.arrayBuffer();
      this.debug("fetched", entry.config.key);
    } catch {
      entry.failed = true;
      this.debug("failed to fetch", entry.config.key);
    }
  }

  private async ensureDecodedBuffer(entry: SoundEntry): Promise<AudioBuffer | null> {
    if (entry.buffer) return entry.buffer;
    if (entry.failed) return null;
    if (entry.decodePromise) return entry.decodePromise;

    entry.decodePromise = this.decodeSound(entry);
    return entry.decodePromise;
  }

  private async decodeSound(entry: SoundEntry): Promise<AudioBuffer | null> {
    const context = await this.resumeAudioContext();
    if (!entry.fetchPromise) {
      entry.fetchPromise = this.fetchSound(entry);
    }

    await entry.fetchPromise;
    if (!entry.arrayBuffer || entry.failed) return null;

    try {
      entry.buffer = await context.decodeAudioData(entry.arrayBuffer.slice(0));
      entry.arrayBuffer = null;
      this.debug(`decoded (${this.decodedBufferCount()} ready)`, entry.config.key);
      return entry.buffer;
    } catch {
      entry.failed = true;
      this.debug("failed to decode", entry.config.key);
      return null;
    }
  }

  private async decodeAllSounds(): Promise<void> {
    await Promise.all([
      ...Array.from(this.sounds.values()).map((entry) => this.ensureDecodedBuffer(entry)),
      ...Array.from(this.ambients.values()).map((entry) => this.ensureDecodedAmbient(entry))
    ]);
    this.debug(`decoded buffer count ${this.decodedBufferCount()}`);
  }

  private createFallbackPool(config: SoundConfig): SoundPoolItem[] {
    if (typeof Audio === "undefined") return [];

    const poolSize = Math.max(1, config.poolSize ?? 1);
    return Array.from({ length: poolSize }, () => ({
      audio: this.createFallbackAudio(config),
      lastStartedAt: Number.NEGATIVE_INFINITY
    }));
  }

  private createFallbackAudio(config: SoundConfig): HTMLAudioElement {
    const audio = new Audio(config.path);
    audio.preload = "auto";
    audio.volume = config.volume;
    audio.muted = this.muted;
    audio.addEventListener("error", () => {
      const entry = this.sounds.get(config.key);
      if (entry) entry.failed = true;
      this.debug("fallback missing", config.key);
    });
    audio.load();
    return audio;
  }

  // --- Ambient internals ---

  private async fetchAmbient(entry: AmbientEntry): Promise<void> {
    if (typeof fetch === "undefined") {
      entry.failed = true;
      return;
    }
    try {
      const response = await fetch(entry.config.path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      entry.arrayBuffer = await response.arrayBuffer();
      this.debugAmbient("fetched", entry.config.key);
    } catch {
      entry.failed = true;
      this.debugAmbient("failed to fetch", entry.config.key);
    }
  }

  private async ensureDecodedAmbient(entry: AmbientEntry): Promise<AudioBuffer | null> {
    if (entry.buffer) return entry.buffer;
    if (entry.failed) return null;
    if (entry.decodePromise) return entry.decodePromise;
    entry.decodePromise = this.decodeAmbient(entry);
    return entry.decodePromise;
  }

  private async decodeAmbient(entry: AmbientEntry): Promise<AudioBuffer | null> {
    const context = await this.resumeAudioContext();
    if (!entry.fetchPromise) {
      entry.fetchPromise = this.fetchAmbient(entry);
    }
    await entry.fetchPromise;
    if (!entry.arrayBuffer || entry.failed) return null;
    try {
      entry.buffer = await context.decodeAudioData(entry.arrayBuffer.slice(0));
      entry.arrayBuffer = null;
      this.debugAmbient("decoded", entry.config.key);
      return entry.buffer;
    } catch {
      entry.failed = true;
      this.debugAmbient("failed to decode", entry.config.key);
      return null;
    }
  }

  private async startAmbientWebAudio(entry: AmbientEntry, fadeInDurationMs: number): Promise<void> {
    const gen = ++entry.startGeneration;
    try {
      const context = await this.resumeAudioContext();
      const buffer = await this.ensureDecodedAmbient(entry);
      if (!buffer || entry.failed || entry.startGeneration !== gen) return;

      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;

      gain.gain.setValueAtTime(0, context.currentTime);
      if (!this.muted && !entry.suspended) {
        const target = entry.config.volume;
        if (fadeInDurationMs > 0) {
          gain.gain.linearRampToValueAtTime(target, context.currentTime + fadeInDurationMs / 1000);
        } else {
          gain.gain.setValueAtTime(target, context.currentTime);
        }
      }

      entry.activeGainValue = entry.config.volume;
      source.connect(gain);
      gain.connect(context.destination);
      source.start(0);

      entry.source = source;
      entry.gainNode = gain;
      this.debugAmbient("started loop", entry.config.key);
    } catch {
      this.debugAmbient("failed to start loop", entry.config.key);
    }
  }

  private createAmbientFallbackAudio(config: AmbientConfig): HTMLAudioElement | null {
    if (typeof Audio === "undefined") return null;
    const audio = new Audio(config.path);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audio.muted = this.muted;
    audio.addEventListener("error", () => {
      const entry = this.ambients.get(config.key);
      if (entry) entry.failed = true;
      this.debugAmbient("fallback missing", config.key);
    });
    audio.load();
    return audio;
  }

  private startAmbientFallback(entry: AmbientEntry, fadeInDurationMs: number): void {
    if (typeof Audio === "undefined") return;

    if (!entry.fallbackAudio) {
      entry.fallbackAudio = this.createAmbientFallbackAudio(entry.config);
      if (!entry.fallbackAudio) return;
    }

    const audio = entry.fallbackAudio;
    audio.currentTime = 0;
    audio.volume = 0;
    audio.muted = this.muted;
    entry.activeGainValue = entry.config.volume;

    const result = audio.play();
    result?.catch(() => {
      entry.failed = true;
    });

    if (!this.muted && !entry.suspended) {
      if (fadeInDurationMs > 0) {
        this.rampAmbientFallbackVolume(entry, entry.config.volume, fadeInDurationMs);
      } else {
        audio.volume = entry.config.volume;
      }
    }
  }

  private rampAmbientFallbackVolume(entry: AmbientEntry, targetVolume: number, durationMs: number): void {
    if (!entry.fallbackAudio) return;
    this.clearAmbientFadeTimers(entry);

    const startVolume = entry.fallbackAudio.volume;
    const startTime = Date.now();

    entry.fadeIntervalId = setInterval(() => {
      if (!entry.fallbackAudio) {
        this.clearAmbientFadeTimers(entry);
        return;
      }
      const t = Math.min((Date.now() - startTime) / durationMs, 1);
      entry.fallbackAudio.volume = startVolume + (targetVolume - startVolume) * t;
      if (t >= 1) this.clearAmbientFadeTimers(entry);
    }, 50);
  }

  private fadeOutAmbientFallback(entry: AmbientEntry, durationMs: number): void {
    if (!entry.fallbackAudio) return;
    this.clearAmbientFadeTimers(entry);

    const startVolume = entry.fallbackAudio.volume;
    const startTime = Date.now();

    entry.fadeIntervalId = setInterval(() => {
      if (!entry.fallbackAudio) {
        this.clearAmbientFadeTimers(entry);
        return;
      }
      const t = Math.min((Date.now() - startTime) / durationMs, 1);
      entry.fallbackAudio.volume = startVolume * (1 - t);
      if (t >= 1) {
        this.clearAmbientFadeTimers(entry);
        this.stopAmbientEntry(entry);
      }
    }, 50);
  }

  private stopAmbientEntry(entry: AmbientEntry): void {
    entry.startGeneration += 1;
    this.clearAmbientFadeTimers(entry);

    if (entry.source) {
      try {
        entry.source.stop();
      } catch {
        // Already stopped
      }
      entry.source = null;
    }
    entry.gainNode = null;
    entry.activeGainValue = 0;
    entry.suspended = false;

    if (entry.fallbackAudio) {
      entry.fallbackAudio.pause();
      entry.fallbackAudio.currentTime = 0;
      entry.fallbackAudio.volume = 0;
    }
  }

  private clearAmbientFadeTimers(entry: AmbientEntry): void {
    if (entry.fadeTimeoutId !== null) {
      clearTimeout(entry.fadeTimeoutId);
      entry.fadeTimeoutId = null;
    }
    if (entry.fadeIntervalId !== null) {
      clearInterval(entry.fadeIntervalId);
      entry.fadeIntervalId = null;
    }
  }

  private stopAllLoopsExcept(excludeKey: AmbientKey): void {
    for (const [key, entry] of this.ambients) {
      if (key !== excludeKey) this.stopAmbientEntry(entry);
    }
  }

  private isAmbientActive(entry: AmbientEntry): boolean {
    if (entry.source !== null) return true;
    if (entry.fallbackAudio && !entry.fallbackAudio.paused) return true;
    return false;
  }

  // --- Unlock / context ---

  private async unlockWebAudio(): Promise<void> {
    // iOS Safari only unlocks the AudioContext when the priming buffer is
    // started inside the same synchronous frame as the user gesture. Any
    // `await` before `source.start(0)` defers it to a microtask and the
    // gesture credit is lost, leaving the context permanently suspended.
    const context = this.getAudioContext();
    try {
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = 0.00001;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(context.destination);
      source.start(0);
    } catch {
      this.debug("silent prime failed");
    }

    if (context.state === "suspended") {
      await context.resume();
    }
  }

  private async unlockFallbackAudio(): Promise<void> {
    for (const entry of this.sounds.values()) {
      for (const item of entry.fallbackPool) {
        this.primeFallbackAudio(item.audio);
      }
    }
    for (const entry of this.ambients.values()) {
      if (entry.fallbackAudio) {
        this.primeFallbackAudio(entry.fallbackAudio);
      }
    }
  }

  private primeFallbackAudio(audio: HTMLAudioElement): void {
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

  private async resumeAudioContext(): Promise<AudioContext> {
    const context = this.getAudioContext();
    if (context.state === "suspended") {
      await context.resume();
    }
    return context;
  }

  private getAudioContext(): AudioContext {
    if (this.audioContext) return this.audioContext;

    const audioWindow = window as AudioContextWindow;
    const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio is not available.");
    }

    this.audioContext = new AudioContextClass();
    this.debug("created audio context");
    return this.audioContext;
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

  private getFallbackPoolItem(entry: SoundEntry, key: SoundKey): SoundPoolItem | null {
    for (let offset = 0; offset < entry.fallbackPool.length; offset += 1) {
      const index = (entry.nextFallbackIndex + offset) % entry.fallbackPool.length;
      const item = entry.fallbackPool[index];
      if (item.audio.paused || item.audio.ended) {
        entry.nextFallbackIndex = (index + 1) % entry.fallbackPool.length;
        return item;
      }
    }

    if (this.shouldApplyCooldown(key)) return null;

    const oldestItem = entry.fallbackPool.reduce((oldest, item) => (item.lastStartedAt < oldest.lastStartedAt ? item : oldest), entry.fallbackPool[0]);
    entry.nextFallbackIndex = (entry.fallbackPool.indexOf(oldestItem) + 1) % entry.fallbackPool.length;
    this.debug("fallback reusing oldest busy pool item", key);
    return oldestItem;
  }

  private flushQueuedSounds(): void {
    const queued = this.queuedSounds.splice(0);
    if (queued.length > 0) {
      this.debug(`flushing ${queued.length} queued sound(s): ${queued.join(", ")}`);
      for (const key of queued) {
        this.play(key);
      }
    }

    if (this.pendingAmbient) {
      const { key, durationMs } = this.pendingAmbient;
      this.pendingAmbient = null;
      this.fadeInLoop(key, durationMs);
    }
  }

  private shouldApplyCooldown(key: SoundKey): boolean {
    return SoundManager.SPAMMY_SOUND_KEYS.has(key);
  }

  private hasWebAudioSupport(): boolean {
    if (typeof window === "undefined") return false;
    // iOS Safari (including standalone PWAs) routes Web Audio through policies
    // that often leave the context "running" while producing no audible
    // output — silent switch, audio session category, suspend-on-background,
    // etc. HTMLAudioElement plays through the standard media path and has been
    // reliable on iOS for years, so we fall back to it there.
    if (this.isIOS()) return false;
    const audioWindow = window as AudioContextWindow;
    return Boolean((audioWindow.AudioContext || audioWindow.webkitAudioContext) && typeof fetch !== "undefined");
  }

  private isIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS 13+ reports as Macintosh in the UA string; disambiguate via touch.
    return /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  }

  private decodedBufferCount(): number {
    let count = 0;
    for (const entry of this.sounds.values()) {
      if (entry.buffer) count += 1;
    }
    return count;
  }

  private now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
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
    const contextState = this.audioContext?.state ?? (this.webAudioSupported ? "not-created" : "fallback");
    console.info(
      `[audio] ${key ? `${key}: ` : ""}${message} [${unlockState}, ${readyState}, context=${contextState}, decoded=${this.decodedBufferCount()}]`
    );
  }

  private debugAmbient(message: string, key?: AmbientKey): void {
    if (!this.debugAudio) return;
    console.info(`[ambient] ${key ? `${key}: ` : ""}${message}`);
  }
}
