import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { browse, updateBrowse } from "../experience/browse";
import { markSceneReady } from "../experience/intro";
import { motion } from "../experience/motion";
import { levelScreenY } from "./stackLayout";

function leanPoint(x: number, y: number, z: number, lean: number) {
  const c = Math.cos(lean);
  const s = Math.sin(lean);
  return { x: x * c - y * s, y: x * s + y * c, z };
}

const ZOOM_DEPTH = 0.62;

export function CameraRig() {
  const { camera, scene } = useThree();

  useLayoutEffect(() => {
    camera.up.set(motion.upX, motion.upY, motion.upZ);
    camera.position.set(motion.camX, motion.camY, motion.camZ);
    camera.lookAt(motion.lookX, motion.lookY, motion.lookZ);
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((_, delta) => {
    markSceneReady();
    updateBrowse(Math.min(delta, 0.05));

    const zoom = browse.zoom;
    const pull = 1 - ZOOM_DEPTH * zoom;
    const lookY = motion.lookY - browse.scroll;
    const aimY = browse.hold >= 0 ? levelScreenY(browse.hold) : lookY;
    const localLookX = motion.lookX * pull;
    const localLookY = lookY + (aimY - lookY) * zoom;
    const localLookZ = motion.lookZ;
    const look = leanPoint(localLookX, localLookY, localLookZ, motion.lean);

    camera.up.set(motion.upX, motion.upY, motion.upZ).normalize();
    camera.position.set(
      look.x + (motion.camX - motion.lookX) * pull,
      look.y + (motion.camY - motion.lookY) * pull,
      look.z + (motion.camZ - motion.lookZ) * pull,
    );
    camera.lookAt(look.x, look.y, look.z);

    if ("fov" in camera && camera.fov !== motion.fov) {
      camera.fov = motion.fov;
      camera.updateProjectionMatrix();
    }

    const fog = scene.fog;
    if (fog && "near" in fog && "far" in fog) {
      fog.near = motion.fogNear;
      fog.far = motion.fogFar;
    }
  });

  return null;
}
