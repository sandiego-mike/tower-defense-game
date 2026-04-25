import { ActiveEnemySpawnState, DifficultyConfig, EnemyConfig, EnemyType, SpawnRequest, WaveConfig, WaveDebugSummary, WaveStartEvent } from "../types";

type ScheduledSpawnRequest = SpawnRequest & {
  scheduledTime: number;
  groupIndex: number;
};

type Wave = {
  label: string;
  spawnQueue: ScheduledSpawnRequest[];
  enemyTypes: EnemyType[];
  totalHealth: number;
  goldIncome: number;
};

export class WaveManager {
  readonly waves: Wave[];

  currentWaveIndex = 0;

  private spawnedThisWave = 0;
  private waveElapsed = 0;
  private betweenWaveTimer = 0;
  private allWavesSpawned = false;
  private activeEnemyCount = 0;
  private waveStartEvent: WaveStartEvent | null = null;
  private readonly pendingSpawnProgresses: number[] = [];

  constructor(
    private readonly waveConfig: WaveConfig,
    private readonly enemyConfigs: Record<EnemyType, EnemyConfig>,
    private readonly difficultyConfig: DifficultyConfig
  ) {
    this.waves = this.buildWaves();
  }

  update(deltaTime: number, activeEnemyCount: number, activeEnemiesNearSpawn: readonly ActiveEnemySpawnState[]): SpawnRequest[] {
    this.activeEnemyCount = activeEnemyCount;
    if (this.allWavesSpawned) return [];

    const wave = this.waves[this.currentWaveIndex];
    const spawns: SpawnRequest[] = [];

    if (this.betweenWaveTimer > 0) {
      this.betweenWaveTimer -= deltaTime;
      return spawns;
    }

    this.waveElapsed += deltaTime;
    this.pendingSpawnProgresses.length = 0;
    while (this.spawnedThisWave < wave.spawnQueue.length) {
      const nextSpawn = wave.spawnQueue[this.spawnedThisWave];
      const scheduledTime = this.getScheduledSpawnTime(wave, this.spawnedThisWave);
      if (this.waveElapsed < scheduledTime) {
        break;
      }
      if (!this.hasSpawnSpacing(nextSpawn, activeEnemiesNearSpawn, this.pendingSpawnProgresses)) {
        break;
      }
      if (this.spawnedThisWave === 0) {
        this.waveStartEvent = {
          waveNumber: this.currentWaveNumber,
          isFinalWave: this.currentWaveIndex === this.waves.length - 1
        };
      }
      spawns.push(nextSpawn);
      this.spawnedThisWave += 1;
      this.pendingSpawnProgresses.push(0);
    }

    if (this.spawnedThisWave >= wave.spawnQueue.length && activeEnemyCount === 0) {
      this.advanceWave();
    }

    return spawns;
  }

  get currentWaveNumber(): number {
    return Math.min(this.currentWaveIndex + 1, this.waves.length);
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  get currentWaveEnemyTypes(): EnemyType[] {
    return this.waves[this.currentWaveIndex]?.enemyTypes ?? [];
  }

  get currentWaveDebugSummary(): WaveDebugSummary | null {
    const wave = this.waves[this.currentWaveIndex];
    if (!wave) return null;

    return {
      waveNumber: this.currentWaveNumber,
      label: wave.label,
      totalEnemies: wave.spawnQueue.length,
      totalHealth: wave.totalHealth,
      goldIncome: wave.goldIncome,
      enemyTypes: wave.enemyTypes
    };
  }

  get remainingEnemiesInCurrentWave(): number {
    const wave = this.waves[this.currentWaveIndex];
    if (!wave || this.allWavesSpawned) return this.activeEnemyCount;
    return Math.max(0, wave.spawnQueue.length - this.spawnedThisWave + this.activeEnemyCount);
  }

  get nextWaveCountdown(): number {
    if (this.betweenWaveTimer > 0) return Math.max(0, this.betweenWaveTimer);
    const wave = this.waves[this.currentWaveIndex];
    if (wave && this.spawnedThisWave < wave.spawnQueue.length) {
      return Math.max(0, this.getScheduledSpawnTime(wave, this.spawnedThisWave) - this.waveElapsed);
    }
    return 0;
  }

  consumeWaveStartEvent(): WaveStartEvent | null {
    const event = this.waveStartEvent;
    this.waveStartEvent = null;
    return event;
  }

  get isComplete(): boolean {
    return this.allWavesSpawned;
  }

  skipToNextWave(): boolean {
    if (this.allWavesSpawned || this.currentWaveIndex >= this.waves.length - 1) {
      return false;
    }

    this.currentWaveIndex += 1;
    this.spawnedThisWave = 0;
    this.waveElapsed = this.waveConfig.initialSpawnDelay;
    this.betweenWaveTimer = 0;
    this.waveStartEvent = {
      waveNumber: this.currentWaveNumber,
      isFinalWave: this.currentWaveIndex === this.waves.length - 1
    };
    return true;
  }

  private advanceWave(): void {
    if (this.currentWaveIndex >= this.waves.length - 1) {
      this.allWavesSpawned = true;
      return;
    }

    this.currentWaveIndex += 1;
    this.spawnedThisWave = 0;
    this.waveElapsed = 0;
    this.betweenWaveTimer = this.waveConfig.betweenWaveDelay;
  }

  private buildWaves(): Wave[] {
    return this.waveConfig.waves.map((waveDefinition, waveIndex) => {
      const waveHealthScale = waveDefinition.healthScale * (1 + waveIndex * this.waveConfig.healthGrowthPerWave);
      const waveCountScale = waveDefinition.countScale * (1 + waveIndex * this.waveConfig.countGrowthPerWave);
      const spawnQueue = waveDefinition.groups.flatMap((group, groupIndex) => {
        const enemyConfig = this.enemyConfigs[group.enemyType];
        const count = Math.max(1, Math.round(group.count * waveCountScale * this.difficultyConfig.enemyCountMultiplier));
        const healthMultiplier = group.healthMultiplier ?? 1;
        const speedMultiplier = group.speedMultiplier ?? 1;
        const groupSpawnInterval = Math.max(
          this.waveConfig.minSpawnInterval,
          (group.spawnInterval ?? waveDefinition.spawnInterval) * this.difficultyConfig.spawnIntervalMultiplier
        );
        const startDelay = Math.max(0, group.startDelay ?? 0);
        const minPathSpacing = Math.max(enemyConfig.radius * 1.6, group.minSpacingOverride ?? enemyConfig.minPathSpacing);

        return Array.from({ length: count }, (_, spawnIndex) => ({
          enemyType: group.enemyType,
          enemyHealth: Math.round(enemyConfig.health * waveHealthScale * healthMultiplier * this.difficultyConfig.enemyHealthMultiplier),
          enemySpeed: Math.round(enemyConfig.speed * speedMultiplier * this.difficultyConfig.enemySpeedMultiplier),
          enemyReward: Math.max(1, Math.round(enemyConfig.reward * this.difficultyConfig.enemyRewardMultiplier)),
          minPathSpacing,
          scheduledTime: this.waveConfig.initialSpawnDelay + startDelay + spawnIndex * groupSpawnInterval,
          groupIndex
        }));
      });
      const totalHealth = spawnQueue.reduce((sum, spawn) => sum + spawn.enemyHealth, 0);
      const goldIncome = spawnQueue.reduce((sum, spawn) => sum + spawn.enemyReward, 0);
      const orderedSpawnQueue: ScheduledSpawnRequest[] = spawnQueue
        .sort((left, right) => left.scheduledTime - right.scheduledTime || left.groupIndex - right.groupIndex)
        .map((spawn) => ({ ...spawn }));

      return {
        label: waveDefinition.label,
        spawnQueue: orderedSpawnQueue,
        enemyTypes: [...new Set(waveDefinition.groups.map((group) => group.enemyType))],
        totalHealth,
        goldIncome
      };
    });
  }

  private getScheduledSpawnTime(wave: Wave, spawnIndex: number): number {
    return wave.spawnQueue[spawnIndex]?.scheduledTime ?? 0;
  }

  private hasSpawnSpacing(
    spawn: SpawnRequest,
    activeEnemiesNearSpawn: readonly ActiveEnemySpawnState[],
    pendingProgresses: readonly number[]
  ): boolean {
    for (const enemy of activeEnemiesNearSpawn) {
      if (enemy.progress < spawn.minPathSpacing + enemy.radius && enemy.progress < spawn.minPathSpacing) {
        return false;
      }
    }

    for (const progress of pendingProgresses) {
      if (progress < spawn.minPathSpacing) {
        return false;
      }
    }

    return true;
  }
}
