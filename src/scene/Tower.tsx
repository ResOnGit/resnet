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
import { advanceScreen, drawScreen, primeScreenImages, screenSrc, screenStatus } from "./screenArt";
import { attachVhs, staticMix, tickVhs } from "./vhs";
import { cubePose, SCREEN_LIFT } from "./stackLayout";
import { CAMERA_START, CONCRETE, CUBE, TOP_Y, TOWER, sectionBaseY } from "./towerConfig";

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

const stickerRay = new THREE.Raycaster();
const topPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP_Y);

function pointOnLid(camera: THREE.Camera, x: number, y: number) {
  stickerRay.setFromCamera(
    new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1),
    camera,
  );
  const hit = new THREE.Vector3();
  return stickerRay.ray.intersectPlane(topPlane, hit) ? hit : null;
}

/** Overhead loading camera, so the sticker lands where the title sat on the lid. */
function loadingCamera() {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_START.fov,
    window.innerWidth / window.innerHeight,
    0.1,
    220,
  );
  camera.position.set(CAMERA_START.camX, CAMERA_START.camY, CAMERA_START.camZ);
  camera.up.set(CAMERA_START.upX, CAMERA_START.upY, CAMERA_START.upZ);
  camera.lookAt(CAMERA_START.lookX, CAMERA_START.lookY, CAMERA_START.lookZ);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

function paintLoadingWord(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const scale = 4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(rect.width * scale));
  canvas.height = Math.max(2, Math.round(rect.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx || rect.width < 2 || rect.height < 2) return null;
  ctx.scale(scale, scale);
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  ctx.letterSpacing = style.letterSpacing;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText((el.textContent ?? "RESNET").trim(), parseFloat(style.paddingLeft) || 0, rect.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.premultiplyAlpha = true;
  texture.needsUpdate = true;
  return { texture, rect };
}

function createScreen(): Screen {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
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
  const screenPaint = useRef<string[]>(Array(SLOTS).fill(""));
  const shownSrc = useRef<string[]>(Array(SLOTS).fill(""));
  const cutAt = useRef<number[]>(Array(SLOTS).fill(-1e9));
  const needsRedraw = useRef(false);
  const sticker = useRef<THREE.Mesh>(null);
  const stickerPlaced = useRef(false);

  useEffect(() => {
    primeScreenImages();
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
      const stuck = sticker.current?.material;
      if (stuck instanceof THREE.MeshBasicMaterial) stuck.map?.dispose();
    },
    [build, materials, screens, sides, backs],
  );

  const levelInSlot = (slot: number) => slotSection.current[slot];

  const levelOfObject = (object: THREE.Object3D) => {
    let node: THREE.Object3D | null = object;
    while (node) {
      const slot = cubes.current.indexOf(node as THREE.Group);
      if (slot >= 0) return levelInSlot(slot);
      node = node.parent;
    }
    return -1;
  };

  const onScreenClick = (slot: number) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!getBrowseSnapshot().interactive) return;
    const level = levelInSlot(slot);
    if (level < 0 || level >= LEVEL_COUNT) return;
    if (browse.story >= 0) return;
    if (browse.inspect >= 0 && browse.inspect !== level) return;
    inspectLevel(level);
    if (browse.zoom >= 0.55 && browse.inspect === level) openStory(level);
  };

  const onScreenOver = (slot: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const level = levelInSlot(slot);
    if (!getBrowseSnapshot().interactive || level < 0 || level >= LEVEL_COUNT) return;
    if (browse.story >= 0) return;
    if (browse.inspect >= 0 && browse.inspect !== level) return;
    inspectLevel(level);
    if (browse.inspect === level) pointer.hot = true;
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
    if (browse.story >= 0) return;
    const overSection = event.intersections.some((hit) => levelOfObject(hit.object) >= 0);
    if (!overSection) clearInspect();
  };

  useFrame((_, delta) => {
    if (spin.current) {
      spin.current.rotation.y += delta * motion.rotationSpeed * (1 - browse.storyBlend);
    }
    if (lean.current) {
      lean.current.rotation.z = motion.lean;
      // Captions sit just right of center, so the cabinet has to park further left.
      const wide = window.innerWidth >= 780;
      const hoverShift = wide ? 1.05 : 4.2;
      const storyPull = wide ? 2.4 : 5;
      const shift = (hoverShift - storyPull * browse.storyBlend) * browse.zoom;
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

      const previous = slotSection.current[slot];
      if (previous !== section || redraw) {
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

        drawCabinetSide(sides[slot].canvas, section);
        sides[slot].texture.needsUpdate = true;
        drawCabinetBack(backs[slot].canvas, section);
        backs[slot].texture.needsUpdate = true;
      }

      const slide = browse.story === section ? browse.slide : 0;
      const incoming = screenSrc(section, slide);
      const status = incoming ? screenStatus(incoming) : "empty";
      const waiting =
        status === "loading" &&
        previous === section &&
        shownSrc.current[slot] !== "" &&
        shownSrc.current[slot] !== incoming;
      const paintKey = `${section}|${incoming}|${status}`;
      const moved = !waiting && advanceScreen(incoming, now);
      if (!waiting && (paintKey !== screenPaint.current[slot] || redraw || moved)) {
        if (
          shownSrc.current[slot] &&
          incoming &&
          shownSrc.current[slot] !== incoming &&
          browse.story === section
        ) {
          cutAt.current[slot] = now;
        }
        shownSrc.current[slot] = incoming;
        screenPaint.current[slot] = paintKey;
        drawScreen(screen.canvas, section, slide);
        screen.texture.needsUpdate = true;
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
      const openSnow = browse.flashLevel === section ? staticMix(now - browse.flashAt) : 0;
      const cutSnow = staticMix(now - cutAt.current[slot]);
      tickVhs(screen.material, now / 1000, Math.max(openSnow, cutSnow));
    }

    const stuck = sticker.current;
    if (stuck) {
      const onTop = slotSection.current[0] === 0;
      if (!stickerPlaced.current && motion.structure > 0 && onTop) {
        const word = document.querySelector('[data-intro="word"]');
        const painted = word instanceof HTMLElement ? paintLoadingWord(word) : null;
        const pose = cubePose(0);
        const camera = loadingCamera();
        if (painted) {
          const { rect, texture } = painted;
          const midX = rect.left + rect.width / 2;
          const midY = rect.top + rect.height / 2;
          const center = pointOnLid(camera, midX, midY);
          const left = pointOnLid(camera, rect.left, midY);
          const right = pointOnLid(camera, rect.right, midY);
          const top = pointOnLid(camera, midX, rect.top);
          const bottom = pointOnLid(camera, midX, rect.bottom);
          const material = stuck.material;
          if (center && left && right && top && bottom && material instanceof THREE.MeshBasicMaterial) {
            material.map?.dispose();
            material.map = texture;
            material.premultipliedAlpha = true;
            material.needsUpdate = true;
            stuck.position.set(center.x - pose.x, CUBE / 2 + 0.04, center.z - pose.z);
            stuck.scale.set(left.distanceTo(right), top.distanceTo(bottom), 1);
            stickerPlaced.current = true;
          } else {
            texture.dispose();
          }
        }
      }
      stuck.visible = stickerPlaced.current && onTop && motion.structure > 0.01;
      const material = stuck.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = stuck.visible ? motion.structure : 0;
      }
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
            {slot === 0 && (
              <mesh ref={sticker} rotation={[-Math.PI / 2, 0, 0]} visible={false} raycast={() => null}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                  transparent
                  opacity={0}
                  toneMapped={false}
                  fog={false}
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-4}
                  polygonOffsetUnits={-4}
                />
              </mesh>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
