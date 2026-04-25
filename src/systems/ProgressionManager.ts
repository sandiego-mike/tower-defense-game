import { MISSION_CONFIGS, MISSION_ORDER } from "../config/missions";
import { MissionId, MissionRecord, MissionSelectInfo, SaveData } from "../types";

const SAVE_KEY = "tower-defense-mvp-save-v1";

export class ProgressionManager {
  private saveData: SaveData = {
    version: 1,
    missions: {}
  };

  constructor() {
    this.load();
  }

  getMissionSelectInfo(unlockAll: boolean): MissionSelectInfo[] {
    return MISSION_ORDER.map((missionId, index) => {
      const record = this.getRecord(missionId);
      return {
        id: missionId,
        label: MISSION_CONFIGS[missionId].label,
        locked: !unlockAll && !this.isMissionUnlocked(missionId, index),
        completed: record.completed,
        bestScore: record.bestScore,
        bestStars: record.bestStars
      };
    });
  }

  isUnlocked(missionId: MissionId, unlockAll: boolean): boolean {
    if (unlockAll) return true;
    const index = MISSION_ORDER.indexOf(missionId);
    return this.isMissionUnlocked(missionId, index);
  }

  completeMission(missionId: MissionId, score: number, stars: number): void {
    const record = this.getRecord(missionId);
    this.saveData.missions[missionId] = {
      completed: true,
      bestScore: Math.max(record.bestScore, score),
      bestStars: Math.max(record.bestStars, stars)
    };
    this.save();
  }

  private isMissionUnlocked(missionId: MissionId, index: number): boolean {
    if (index <= 0) return true;
    if (this.getRecord(missionId).completed) return true;

    const previousMission = MISSION_ORDER[index - 1];
    return this.getRecord(previousMission).completed;
  }

  private getRecord(missionId: MissionId): MissionRecord {
    return (
      this.saveData.missions[missionId] ?? {
        completed: false,
        bestScore: 0,
        bestStars: 0
      }
    );
  }

  private load(): void {
    try {
      const rawSave = localStorage.getItem(SAVE_KEY);
      if (!rawSave) return;
      const parsed = JSON.parse(rawSave) as SaveData;
      if (parsed.version === 1 && parsed.missions) {
        this.saveData = parsed;
      }
    } catch {
      this.saveData = { version: 1, missions: {} };
    }
  }

  private save(): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveData));
  }
}
