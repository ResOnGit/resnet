import { CUBE, TOWER, sectionBaseY } from "./towerConfig";

/**
 * Six piers, six gaps, 60° apart. A cube's front/back are 180° apart, so both
 * can sit in gaps at once. Sides are 90° off — 90 mod 60 = 30 — so they land
 * on piers whenever front/back land on gaps. Hover/click still override yaw.
 */
const STEP = Math.PI / 3;

/** One shared shift, so the column sits off the drum's center. */
const SHIFT_X = 0.42;
const SHIFT_Z = 0.62;

export function cubePose(section: number) {
  const yaw = section * STEP;
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
