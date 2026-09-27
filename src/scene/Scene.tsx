import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { closeStory, getBrowseSnapshot } from "../experience/browse";
import { CAMERA_START } from "./towerConfig";
import { BackgroundMesh } from "./BackgroundMesh";
import { CameraRig } from "./CameraRig";
import { Lights } from "./Lights";
import { Tower } from "./Tower";

export function Scene() {
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      dpr={[1, 1.75]}
      camera={{
        fov: CAMERA_START.fov,
        near: 0.1,
        far: 220,
        position: [CAMERA_START.camX, CAMERA_START.camY, CAMERA_START.camZ],
      }}
      onPointerMissed={() => {
        if (getBrowseSnapshot().interactive) closeStory();
      }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor("#08090a", 1);
        scene.fog = new THREE.Fog(
          "#08090a",
          CAMERA_START.fogNear,
          CAMERA_START.fogFar,
        );
        camera.lookAt(CAMERA_START.lookX, CAMERA_START.lookY, CAMERA_START.lookZ);
      }}
    >
      <BackgroundMesh />
      <Lights />
      <CameraRig />
      <Tower />
    </Canvas>
  );
}
