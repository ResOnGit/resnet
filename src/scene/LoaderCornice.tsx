import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { motion } from "../experience/motion";
import { CONCRETE } from "./towerConfig";
import type { BufferGeometry } from "three";

type LoaderCorniceProps = {
  geometry: BufferGeometry;
  y: number;
};

export function LoaderCornice({ geometry, y }: LoaderCorniceProps) {
  const solid = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: CONCRETE,
      roughness: 0.9,
      metalness: 0.02,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0.55,
      side: THREE.DoubleSide,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uProgress = { value: 0 };
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
         varying vec3 vObjPos;`,
      ).replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vObjPos = position;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
         uniform float uProgress;
         varying vec3 vObjPos;`,
      ).replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         float angle = atan(vObjPos.x, -vObjPos.z);
         float t = angle / 6.28318530718;
         if (t < 0.0) t += 1.0;
         float edge = 0.008;
         float vis = 1.0 - smoothstep(uProgress, uProgress + edge, t);
         if (uProgress > 0.997) vis = 1.0;
         if (vis < 0.02) discard;
         float head = 1.0 - smoothstep(0.0, 0.018, abs(t - uProgress));
         gl_FragColor.rgb += vec3(head) * 0.12 * step(uProgress, 0.996);`,
      );
      material.userData.shader = shader;
    };

    return material;
  }, []);

  const ghost = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#f2f2f2",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame(() => {
    const shader = solid.userData.shader as
      | { uniforms: { uProgress: { value: number } } }
      | undefined;
    if (shader) shader.uniforms.uProgress.value = motion.progress;
    solid.emissiveIntensity = 0.02 + (1 - motion.progress) * 0.7;
    ghost.opacity = motion.ringGhost * 0.16;
  });

  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geometry} material={ghost} />
      <mesh geometry={geometry} material={solid} />
    </group>
  );
}
