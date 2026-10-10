/** Shared by the floor rings and the piers. */
export const CONCRETE = "#d2d2d2";

export const TOWER = {
  radius: 7.2,
  sectionGap: 7.8,
  piers: 6,
  slabThickness: 0.16,
  corniceHeight: 0.18,
  pierWidth: 0.9,
  pierDepth: 0.75,
  lean: 0.04,
} as const;

export const CUBE = 7.8;

export const TOP_Y = 0;

export function pierOrbit() {
  return TOWER.radius - TOWER.pierDepth * 0.35;
}

/** Inner edge of the floor ring. The opening inside is the cube bay. */
export function ringInner() {
  return pierOrbit() - TOWER.pierDepth * 0.55;
}

export function sectionBaseY(section: number) {
  return TOP_Y - (section + 1) * TOWER.sectionGap;
}

export function nominalLevelY(level: number) {
  return sectionBaseY(level) + TOWER.sectionGap * 0.5;
}

/** Home looks into the upper floors, so the lip sits high in the frame. */
export const HOME_LOOK_Y = -8;

export function pierHeight() {
  return TOWER.sectionGap - TOWER.slabThickness - TOWER.corniceHeight;
}

export const CAMERA_START = {
  camX: 0,
  camY: TOP_Y + 32,
  camZ: 0.05,
  lookX: 0,
  lookY: TOP_Y,
  lookZ: 0,
  upX: 0,
  upY: 0,
  upZ: -1,
  fov: 32,
  fogNear: 24,
  fogFar: 55,
};

export function cameraEnd(narrow: boolean) {
  const lookY = HOME_LOOK_Y - 1.5;

  if (narrow) {
    return {
      camX: 2,
      camY: lookY + 2.5,
      camZ: 38,
      lookX: 2,
      lookY,
      lookZ: 0,
      upX: 0,
      upY: 1,
      upZ: 0,
      fov: 33,
      fogNear: 24,
      fogFar: 90,
    };
  }

  return {
    camX: 24,
    camY: lookY + 2.5,
    camZ: 55,
    lookX: 16,
    lookY,
    lookZ: 0,
    upX: 0,
    upY: 1,
    upZ: 0,
    fov: 30,
    fogNear: 28,
    fogFar: 115,
  };
}
