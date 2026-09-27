import { CUBE, TOWER, sectionBaseY } from "./towerConfig";

const STEP = (72 * Math.PI) / 180;
const GROUP = (36 * Math.PI) / 180;

/** One shared shift, so the column sits off the drum's center. */
const SHIFT_X = 0.42;
const SHIFT_Z = 0.62;

export function cubePose(section: number) {
  const yaw = (section % 5) * STEP + Math.floor(section / 5) * GROUP;
  return {
    x: SHIFT_X,
    y: TOWER.sectionGap * 0.5,
    z: SHIFT_Z,
    yaw,
    pitch: 0,
    roll: 0,
  };
}

export function levelScreenY(level: number) {
  return sectionBaseY(level) + cubePose(level).y + SCREEN_LIFT;
}

export const SCREEN_W = CUBE * 0.88;
export const SCREEN_H = CUBE * 0.76;
/** Lifts the glass so the front still has a chin, just a thinner one. */
export const SCREEN_LIFT = CUBE * 0.035;
