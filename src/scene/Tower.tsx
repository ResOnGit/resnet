import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LEVEL_COUNT } from "../content/levels";
import {
  browse,
  clearInspect,
  getBrowseSnapshot,
  inspectLevel,
  openStory,
} from "../experience/browse";
import { motion } from "../experience/motion";
import { pointer } from "../experience/pointer";
import { buildSection } from "./buildTower";
import { LoaderCornice } from "./LoaderCornice";
import { drawCabinetBack, drawCabinetSide } from "./cabinetArt";
import { drawScreen } from "./screenArt";
import { attachVhs, staticMix, tickVhs } from "./vhs";
import { cubePose, SCREEN_LIFT } from "./stackLayout";
import { CONCRETE, CUBE, TOP_Y, TOWER, sectionBaseY } from "./towerConfig";

const SLOTS = 10;
const RENDER_ABOVE = 22;

type Screen = {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  material: THREE.MeshBasicMaterial;
  brightness: number;
};

type Mark = {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
};

function createMark(): Mark {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: "#ffffff",
    roughness: 0.78,
    metalness: 0.06,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    side: THREE.DoubleSide,
  });
  return { canvas, texture, material };
}

function createScreen(): Screen {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    transparent: true,
    opacity: 0,
  });
  attachVhs(material);
  return { canvas, texture, material, brightness: 0.55 };
}

export function Tower() {
  const build = useMemo(() => buildSection(), []);
  const materials = useMemo(
    () => ({
      pillar: new THREE.MeshStandardMaterial({
        color: CONCRETE,
        roughness: 0.9,
        metalness: 0.02,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      frontPier: new THREE.MeshStandardMaterial({
        color: CONCRETE,
        roughness: 0.9,
        metalness: 0.02,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      cabinet: new THREE.MeshStandardMaterial({
        color: "#6e6e6e",
        roughness: 0.72,
        metalness: 0.08,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      groove: new THREE.MeshStandardMaterial({
        color: "#2a2a2a",
        roughness: 0.85,
        metalness: 0.04,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      edge: new THREE.LineBasicMaterial({
        color: "#d4d4d4",
        transparent: true,
        opacity: 0,
      }),
    }),
    [],
  );
  const screens = useMemo(
    () => Array.from({ length: SLOTS }, () => createScreen()),
    [],
  );
  const sides = useMemo(() => Array.from({ length: SLOTS }, () => createMark()), []);
  const backs = useMemo(() => Array.from({ length: SLOTS }, () => createMark()), []);

  const spin = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const bodies = useRef<(THREE.Group | null)[]>([]);
  const piers = useRef<(THREE.Mesh | null)[][]>(
    Array.from({ length: SLOTS }, () => Array(TOWER.piers).fill(null)),
  );
  const cubes = useRef<(THREE.Group | null)[]>([]);
  const slotSection = useRef<number[]>(Array(SLOTS).fill(-1));
  const needsRedraw = useRef(false);

  useEffect(() => {
    document.fonts?.ready.then(() => {
      needsRedraw.current = true;
    });
  }, []);

  useLayoutEffect(
    () => () => {
      Object.values(build).forEach((geometry) => {
        if (Array.isArray(geometry)) geometry.forEach((item) => item.dispose());
        else geometry.dispose();
      });
      materials.pillar.dispose();
      materials.frontPier.dispose();
      materials.cabinet.dispose();
      materials.groove.dispose();
      materials.edge.dispose();
      screens.forEach((screen) => {
        screen.texture.dispose();
        screen.material.dispose();
      });
      for (const mark of [...sides, ...backs]) {
        mark.texture.dispose();
        mark.material.dispose();
      }
    },
    [build, materials, screens, sides, backs],
  );

  const levelInSlot = (slot: number) => slotSection.current[slot];

  const onScreenClick = (slot: number) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!getBrowseSnapshot().interactive) return;
    const level = levelInSlot(slot);
    if (level < 0 || level >= LEVEL_COUNT) return;
    if (browse.story >= 0) return;
    inspectLevel(level);
    if (browse.zoom >= 0.55) openStory(level);
  };

  const onScreenOver = (slot: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const level = levelInSlot(slot);
    if (!getBrowseSnapshot().interactive || level < 0 || level >= LEVEL_COUNT) return;
    if (browse.story >= 0) return;
    inspectLevel(level);
    pointer.hot = true;
  };

  const onScreenOut = (slot: number) => (event: ThreeEvent<PointerEvent>) => {
    const group = cubes.current[slot];
    const stillInside = event.intersections.some((hit) => {
      let node: THREE.Object3D | null = hit.object;
      while (node) {
        if (node === group) return true;
        node = node.parent;
      }
      return false;
    });
    if (stillInside) return;
    pointer.hot = false;
    if (browse.inspect === levelInSlot(slot)) clearInspect();
  };

  useFrame((_, delta) => {
    if (spin.current) {
      spin.current.rotation.y += delta * motion.rotationSpeed * (1 - browse.storyBlend);
    }
    if (lean.current) {
      lean.current.rotation.z = motion.lean;
      const shift = (4.2 - 5 * browse.storyBlend) * browse.zoom;
      const glide = 1 - Math.exp(-delta * 3.2);
      lean.current.position.x += (shift - lean.current.position.x) * glide;
    }

    const visible = motion.structure;
    for (const material of [
      materials.pillar,
      materials.cabinet,
      materials.groove,
      materials.edge,
      ...sides.map((mark) => mark.material),
      ...backs.map((mark) => mark.material),
    ]) {
      material.opacity = visible;
      material.depthWrite = visible > 0.02;
    }

    const bearing = Math.atan2(motion.camZ, motion.camX);
    let middlePier = 0;
    let middleDist = Infinity;
    for (let i = 0; i < TOWER.piers; i += 1) {
      const angle = (i / TOWER.piers) * Math.PI * 2;
      const gap = Math.atan2(Math.sin(angle - bearing), Math.cos(angle - bearing));
      if (Math.abs(gap) < middleDist) {
        middleDist = Math.abs(gap);
        middlePier = i;
      }
    }
    materials.frontPier.opacity = visible * (1 - browse.zoom);
    materials.frontPier.depthWrite = materials.frontPier.opacity > 0.02;

    const lookY = motion.lookY - browse.scroll;
    const first = Math.max(
      0,
      Math.floor((TOP_Y - (lookY + RENDER_ABOVE)) / TOWER.sectionGap),
    );
    const redraw = needsRedraw.current;
    needsRedraw.current = false;
    const ease = 1 - Math.exp(-delta * 5);
    const now = performance.now();

    for (let section = first; section < first + SLOTS; section += 1) {
      const slot = section % SLOTS;
      const screen = screens[slot];

      if (slotSection.current[slot] !== section || redraw) {
        slotSection.current[slot] = section;
        const base = sectionBaseY(section);
        const pose = cubePose(section);
        const body = bodies.current[slot];
        if (body) body.position.set(0, base, 0);

        const cube = cubes.current[slot];
        if (cube) {
          cube.position.set(pose.x, base + pose.y, pose.z);
          cube.rotation.order = "YXZ";
        }

        drawScreen(screen.canvas, section);
        screen.texture.needsUpdate = true;
        drawCabinetSide(sides[slot].canvas, section);
        sides[slot].texture.needsUpdate = true;
        drawCabinetBack(backs[slot].canvas, section);
        backs[slot].texture.needsUpdate = true;
      }

      const spinY = spin.current?.rotation.y ?? 0;
      const framed = browse.zoom > 0.02 ? browse.hold : -1;
      const floor = bodies.current[slot];
      if (floor) {
        const want = section === framed ? -spinY : 0;
        const gap = Math.atan2(Math.sin(want - floor.rotation.y), Math.cos(want - floor.rotation.y));
        floor.rotation.y += gap * (1 - Math.exp(-delta * 3.2));
      }
      const columns = piers.current[slot];
      if (columns) {
        for (let i = 0; i < TOWER.piers; i += 1) {
          const pier = columns[i];
          if (!pier) continue;
          pier.material =
            section === framed && i === middlePier ? materials.frontPier : materials.pillar;
        }
      }

      const cube = cubes.current[slot];
      if (cube) {
        const pose = cubePose(section);
        let yaw = pose.yaw;
        if (section === framed) {
          const c = Math.cos(spinY);
          const s = Math.sin(spinY);
          const wx = pose.x * c + pose.z * s;
          const wz = -pose.x * s + pose.z * c;
          const dx = motion.camX - wx;
          const dz = motion.camZ - wz;
          yaw = Math.atan2(dx, dz) - 0.22 + 0.36 * browse.storyBlend - spinY;
        }
        const turn = Math.atan2(Math.sin(yaw - cube.rotation.y), Math.cos(yaw - cube.rotation.y));
        cube.rotation.order = "YXZ";
        cube.rotation.y += turn * (1 - Math.exp(-delta * 3.2));
      }

      const labeled = section < LEVEL_COUNT;
      let target = 0.55;
      if (labeled) {
        const distance = Math.abs(section - browse.focus);
        target = distance === 0 ? 1 : distance === 1 ? 0.78 : 0.62;
      }
      screen.brightness += (target - screen.brightness) * ease;
      const flash =
        browse.flashLevel === section
          ? Math.exp(-(now - browse.flashAt) / 220) * 0.6
          : 0;
      screen.material.color.setScalar(screen.brightness + flash);
      screen.material.opacity = visible;
      const snow = browse.flashLevel === section ? staticMix(now - browse.flashAt) : 0;
      tickVhs(screen.material, now / 1000, snow);
    }
  });

  const slots = Array.from({ length: SLOTS }, (_, slot) => slot);

  return (
    <group ref={lean}>
      <group ref={spin}>
        <LoaderCornice
          geometry={build.topCornice}
          y={TOP_Y - TOWER.corniceHeight}
        />
        {slots.map((slot) => (
          <group
            key={`ring-${slot}`}
            ref={(el) => {
              bodies.current[slot] = el;
            }}
          >
            <mesh geometry={build.body} material={materials.pillar} />
            {build.piers.map((geometry, index) => (
              <mesh
                key={index}
                ref={(el) => {
                  piers.current[slot][index] = el;
                }}
                geometry={geometry}
                material={materials.pillar}
              />
            ))}
          </group>
        ))}
        {slots.map((slot) => (
          <group
            key={`cube-${slot}`}
            ref={(el) => {
              cubes.current[slot] = el;
            }}
            onClick={onScreenClick(slot)}
            onPointerOver={onScreenOver(slot)}
            onPointerOut={onScreenOut(slot)}
          >
            <mesh geometry={build.cube} material={materials.cabinet} />
            <lineSegments geometry={build.edges} material={materials.edge} />
            <mesh
              geometry={build.chin}
              material={materials.cabinet}
              position={[0, -CUBE * 0.468, CUBE / 2 + CUBE * 0.02]}
            />
            <mesh
              geometry={build.groove}
              material={materials.groove}
              position={[0, -CUBE * 0.468, CUBE / 2 + CUBE * 0.07]}
            />
            <mesh
              geometry={build.screen}
              material={screens[slot].material}
              position={[0, SCREEN_LIFT, CUBE / 2 + 0.02]}
            />
            <mesh
              geometry={build.side}
              material={sides[slot].material}
              position={[CUBE / 2 + 0.02, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
            />
            <mesh
              geometry={build.side}
              material={sides[slot].material}
              position={[-CUBE / 2 - 0.02, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[-1, 1, 1]}
            />
            <mesh
              geometry={build.back}
              material={backs[slot].material}
              position={[0, 0, -CUBE / 2 - 0.02]}
              rotation={[0, Math.PI, 0]}
            />
          </group>
        ))}
      </group>
    </group>
  );
}
