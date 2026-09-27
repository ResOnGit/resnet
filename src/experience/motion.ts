import { CAMERA_START } from "../scene/towerConfig";

export const motion = {
  progress: 0,
  lean: 0,
  rotationSpeed: 0,
  ringGhost: 0,
  structure: 0,
  camX: CAMERA_START.camX,
  camY: CAMERA_START.camY,
  camZ: CAMERA_START.camZ,
  lookX: CAMERA_START.lookX,
  lookY: CAMERA_START.lookY,
  lookZ: CAMERA_START.lookZ,
  upX: CAMERA_START.upX,
  upY: CAMERA_START.upY,
  upZ: CAMERA_START.upZ,
  fov: CAMERA_START.fov,
  fogNear: CAMERA_START.fogNear,
  fogFar: CAMERA_START.fogFar,
};

export function resetMotion() {
  motion.progress = 0;
  motion.lean = 0;
  motion.rotationSpeed = 0;
  motion.ringGhost = 0;
  motion.structure = 0;
  motion.camX = CAMERA_START.camX;
  motion.camY = CAMERA_START.camY;
  motion.camZ = CAMERA_START.camZ;
  motion.lookX = CAMERA_START.lookX;
  motion.lookY = CAMERA_START.lookY;
  motion.lookZ = CAMERA_START.lookZ;
  motion.upX = CAMERA_START.upX;
  motion.upY = CAMERA_START.upY;
  motion.upZ = CAMERA_START.upZ;
  motion.fov = CAMERA_START.fov;
  motion.fogNear = CAMERA_START.fogNear;
  motion.fogFar = CAMERA_START.fogFar;
}
