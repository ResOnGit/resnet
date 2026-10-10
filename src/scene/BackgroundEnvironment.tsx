import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HOME_LOOK_Y } from "./towerConfig";

/** Camera sits inside this sphere; we paint the *inside* (BackSide) so empty pixels look like sky, not flat clear color. */
const SKY_RADIUS = 110;

const skyVertex = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const skyFragment = `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uGlow;
  uniform float uTime;
  varying vec3 vDir;

  void main() {
    float y = vDir.y;
    float drift =
      sin(uTime * 0.09 + vDir.x * 4.0) * 0.028 +
      sin(uTime * 0.07 + vDir.z * 3.5) * 0.02;
    float t = smoothstep(-0.2 + drift, 0.55 + drift, y);
    vec3 col = mix(uHorizon, uZenith, t);

    float sun = exp(-pow(length(vDir.xz - vec2(0.22, 0.08)) * 4.2, 2.0));
    sun *= smoothstep(-0.05, 0.35, y);
    col += uGlow * sun * 0.45;

    float haze = smoothstep(0.2, -0.35, y) * 0.22;
    col += uHorizon * haze;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const skylineVertex = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(pos.x * 0.025 + uTime * 0.2) * 0.85;
    pos.z += cos(pos.x * 0.015 - uTime * 0.16 + pos.y * 0.12) * 0.45;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const skylineFragment = `
  varying vec2 vUv;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float skyline(float x) {
    float scale = 28.0;
    float cell = floor(x * scale);
    float f = fract(x * scale);
    float h0 = hash(cell) * 0.42 + 0.12;
    float h1 = hash(cell + 1.0) * 0.42 + 0.12;
    float h = mix(h0, h1, smoothstep(0.0, 1.0, f));
    float spike = hash(cell + 17.0);
    if (spike > 0.82) h += 0.22;
    return h;
  }

  void main() {
    float x = vUv.x;
    float roof = skyline(x);
    float edge = smoothstep(roof + 0.018, roof - 0.04, vUv.y);
    float base = smoothstep(0.0, 0.06, vUv.y);
    float alpha = edge * base;

    vec3 col = vec3(0.045, 0.048, 0.055);
    col += vec3(0.02, 0.012, 0.008) * hash(floor(x * 80.0));

    float mist = smoothstep(0.15, 0.55, vUv.y) * 0.35;
    col = mix(col, vec3(0.09, 0.07, 0.065), mist);
    alpha *= 1.0 - mist * 0.85;

    gl_FragColor = vec4(col, alpha * 0.92);
  }
`;

export function BackgroundEnvironment() {
  const skyRef = useRef<THREE.Mesh>(null);
  const skylineRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const skyGeometry = useMemo(() => new THREE.SphereGeometry(SKY_RADIUS, 40, 22), []);
  const skylineGeometry = useMemo(() => new THREE.PlaneGeometry(280, 56, 1, 1), []);

  const skyMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: true,
        fog: false,
        uniforms: {
          uHorizon: { value: new THREE.Color("#2e241c") },
          uZenith: { value: new THREE.Color("#050607") },
          uGlow: { value: new THREE.Color("#5a3020") },
          uTime: { value: 0 },
        },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
      }),
    [],
  );

  const skylineMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: skylineVertex,
        fragmentShader: skylineFragment,
      }),
    [],
  );

  useLayoutEffect(
    () => () => {
      skyGeometry.dispose();
      skylineGeometry.dispose();
      skyMaterial.dispose();
      skylineMaterial.dispose();
    },
    [skyGeometry, skylineGeometry, skyMaterial, skylineMaterial],
  );

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    skyMaterial.uniforms.uTime.value = time;
    skylineMaterial.uniforms.uTime.value = time;

    if (skyRef.current) skyRef.current.position.copy(camera.position);

    const skyline = skylineRef.current;
    if (skyline) {
      skyline.position.set(
        14 + camera.position.x * 0.05,
        HOME_LOOK_Y - 30 + camera.position.y * 0.03,
        -58,
      );
      skyline.rotation.set(0, 0, 0);
    }
  });

  return (
    <>
      <mesh
        ref={skyRef}
        geometry={skyGeometry}
        material={skyMaterial}
        frustumCulled={false}
        renderOrder={-20}
        raycast={() => null}
      />
      <mesh
        ref={skylineRef}
        geometry={skylineGeometry}
        material={skylineMaterial}
        frustumCulled={false}
        renderOrder={-15}
        raycast={() => null}
      />
    </>
  );
}
