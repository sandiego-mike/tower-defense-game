import { EconomyConfig, ScoreConfig } from "../types";

export const ECONOMY_CONFIG: EconomyConfig = {
  debugInfiniteGold: false,
  debugUnlockAllMissions: false,
  sellRefundRate: 0.7
};

export const SCORE_CONFIG: ScoreConfig = {
  lifeMultiplier: 10,
  goldMultiplier: 1,
  enemyDefeatMultiplier: 15,
  starThresholds: {
    twoStar: 900,
    threeStar: 1500
  }
};
