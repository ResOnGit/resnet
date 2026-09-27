import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { pointer } from "../experience/pointer";

const COLS = 46;
const ROWS = 30;
const WIDTH = 210;
const HEIGHT = 150;
const RADIUS = 16;
const MAX_OFFSET = 1.15;

export function BackgroundMesh() {
  const mesh = useRef<THREE.Mesh>(null);
  const { camera, size, gl } = useThree();

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WIDTH, HEIGHT, COLS, ROWS);
    geo.userData.rest = geo.attributes.position.array.slice();
    const count = geo.attributes.position.count;
    geo.userData.offset = new Float32Array(count * 3);
    geo.userData.velocity = new Float32Array(count * 3);
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        wireframe: true,
        fog: false,
        uniforms: {},
        vertexShader: `
          varying float vFade;
          void main() {
            vec2 centered = uv * 2.0 - 1.0;
            vFade = smoothstep(1.05, 0.2, length(centered));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying float vFade;
          void main() {
            gl_FragColor = vec4(0.165, 0.176, 0.196, vFade * 0.28);
          }
        `,
      }),
    [],
  );

  const scratch = useMemo(
    () => ({
      ndc: new THREE.Vector2(),
      hit: new THREE.Vector3(),
      prev: new THREE.Vector3(),
      contact: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      raycaster: new THREE.Raycaster(),
      ready: false,
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    const current = mesh.current;
    if (!current) return;
    const dt = Math.min(delta, 0.033);
    const time = clock.getElapsedTime();

    current.position.x = camera.position.x * 0.03;
    current.position.y = camera.position.y * 0.035;
    current.updateMatrixWorld();

    const rest = geometry.userData.rest as Float32Array;
    const offset = geometry.userData.offset as Float32Array;
    const velocity = geometry.userData.velocity as Float32Array;
    const position = geometry.attributes.position;
    const array = position.array as Float32Array;

    const rect = gl.domElement.getBoundingClientRect();
    scratch.ndc.set(
      ((pointer.x - rect.left) / size.width) * 2 - 1,
      -((pointer.y - rect.top) / size.height) * 2 + 1,
    );
    scratch.raycaster.setFromCamera(scratch.ndc, camera);
    scratch.plane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).transformDirection(current.matrixWorld),
      current.position,
    );

    const hit = scratch.raycaster.ray.intersectPlane(scratch.plane, scratch.hit);
    let cursorSpeed = 0;
    if (hit && pointer.inside) {
      current.worldToLocal(hit);
      if (!scratch.ready) {
        scratch.prev.copy(hit);
        scratch.contact.copy(hit);
        scratch.ready = true;
      }
      scratch.vel.copy(hit).sub(scratch.prev).divideScalar(Math.max(dt, 0.001));
      cursorSpeed = Math.min(scratch.vel.length(), 40);
      scratch.prev.copy(hit);
      scratch.contact.lerp(hit, 1 - Math.exp(-dt * 5));
    } else {
      scratch.vel.set(0, 0, 0);
      cursorSpeed = 0;
    }

    const radius2 = RADIUS * RADIUS;
    const gain = 0.035 + cursorSpeed * 0.004;

    for (let i = 0; i < position.count; i += 1) {
      const i3 = i * 3;
      const rx = rest[i3];
      const ry = rest[i3 + 1];
      const dx = rx - scratch.contact.x;
      const dy = ry - scratch.contact.y;
      const influence = Math.exp(-(dx * dx + dy * dy) / radius2);

      const forceX = scratch.vel.x * influence * gain;
      const forceY = scratch.vel.y * influence * gain;

      let ox = offset[i3];
      let oy = offset[i3 + 1];
      let oz = offset[i3 + 2];
      let vx = velocity[i3];
      let vy = velocity[i3 + 1];
      let vz = velocity[i3 + 2];

      vx += (forceX - ox * 3.4 - vx * 2.6) * dt;
      vy += (forceY - oy * 3.4 - vy * 2.6) * dt;
      vz += (influence * cursorSpeed * 0.012 - oz * 4.2 - vz * 3.1) * dt;

      ox += vx * dt;
      oy += vy * dt;
      oz += vz * dt;

      const mag = Math.hypot(ox, oy, oz);
      if (mag > MAX_OFFSET) {
        const scale = MAX_OFFSET / mag;
        ox *= scale;
        oy *= scale;
        oz *= scale;
      }

      offset[i3] = ox;
      offset[i3 + 1] = oy;
      offset[i3 + 2] = oz;
      velocity[i3] = vx;
      velocity[i3 + 1] = vy;
      velocity[i3 + 2] = vz;

      const breathe =
        Math.sin(time * 0.13 + rx * 0.045 + ry * 0.03) * 0.045;
      array[i3] = rx + ox;
      array[i3 + 1] = ry + oy;
      array[i3 + 2] = rest[i3 + 2] + oz * 0.35 + breathe;
    }

    position.needsUpdate = true;
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      position={[0, -8, -36]}
      raycast={() => null}
      frustumCulled={false}
    />
  );
}
