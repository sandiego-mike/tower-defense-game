import { MissionThemeId, VisualTheme } from "../types";

export const PROTOTYPE_FOREST_THEME: VisualTheme = {
  name: "Prototype Forest Defense",
  backgroundColor: "#24432e",
  backgroundGridColor: "rgba(214, 255, 202, 0.08)",
  pathOuterColor: "#7a5130",
  pathInnerColor: "#b88752",
  startColor: "#d9f99d",
  baseColor: "#60a5fa",
  towerStrokeColor: "#12301e",
  enemyStrokeColor: "#17201a"
};

export type PathVisualStyle = {
  outerColor: string;
  innerColor: string;
  highlightColor?: string;
  highlightWidth?: number;
  highlightAlpha?: number;
  accentColor?: string;
  accentWidth?: number;
  accentAlpha?: number;
  accentDash?: number[];
  segmentColor?: string;
  segmentWidth?: number;
  segmentAlpha?: number;
  segmentSpacing?: number;
  segmentLength?: number;
};

export const DEFAULT_PATH_STYLE: PathVisualStyle = {
  outerColor: PROTOTYPE_FOREST_THEME.pathOuterColor,
  innerColor: PROTOTYPE_FOREST_THEME.pathInnerColor
};

export const PATH_STYLES_BY_THEME: Partial<Record<MissionThemeId, PathVisualStyle>> = {
  forest: {
    outerColor: "#6c5a30",
    innerColor: "#c99a5a",
    highlightColor: "#e6bd72",
    highlightWidth: 7,
    highlightAlpha: 0.28,
    accentColor: "#f0d18b",
    accentWidth: 2,
    accentAlpha: 0.18,
    accentDash: [16, 30],
    segmentColor: "#7d5a33",
    segmentWidth: 2,
    segmentAlpha: 0.2,
    segmentSpacing: 34,
    segmentLength: 23
  },
  desert: {
    outerColor: "#745436",
    innerColor: "#b78a5c",
    highlightColor: "#e3c38c",
    highlightWidth: 5,
    highlightAlpha: 0.22,
    accentColor: "#6b4a2d",
    accentWidth: 3,
    accentAlpha: 0.16,
    accentDash: [2, 22]
  },
  lava: {
    outerColor: "#211714",
    innerColor: "#4a4038",
    highlightColor: "#2e2722",
    highlightWidth: 8,
    highlightAlpha: 0.32,
    accentColor: "#f97316",
    accentWidth: 3,
    accentAlpha: 0.3,
    accentDash: [18, 34, 3, 22]
  },
  ice: {
    outerColor: "#6f8591",
    innerColor: "#b9ddea",
    highlightColor: "#f8fbff",
    highlightWidth: 6,
    highlightAlpha: 0.34,
    accentColor: "#74b9d5",
    accentWidth: 3,
    accentAlpha: 0.24,
    accentDash: [26, 24]
  },
  island: {
    outerColor: "#9b6a35",
    innerColor: "#d9b46f",
    highlightColor: "#f1d99a",
    highlightWidth: 5,
    highlightAlpha: 0.28,
    accentColor: "#fff2bd",
    accentWidth: 3,
    accentAlpha: 0.22,
    accentDash: [3, 18]
  }
};

export function getPathStyleForTheme(themeId: MissionThemeId): PathVisualStyle {
  return PATH_STYLES_BY_THEME[themeId] ?? DEFAULT_PATH_STYLE;
}
