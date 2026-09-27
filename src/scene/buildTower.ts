import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CUBE, TOWER, pierOrbit, ringInner } from "./towerConfig";
import { SCREEN_H, SCREEN_W } from "./stackLayout";

/** Top lip only. Wider than the floor rings so it caps the pier ends. */
function createTopCorniceGeometry() {
  const r = pierOrbit();
  const pts = [
    new THREE.Vector2(r - 0.46, 0),
    new THREE.Vector2(r + 0.5, 0),
    new THREE.Vector2(r + 0.56, 0.06),
    new THREE.Vector2(r + 0.28, TOWER.corniceHeight),
    new THREE.Vector2(r - 0.28, TOWER.corniceHeight),
    new THREE.Vector2(r - 0.46, 0.06),
  ];
  const geometry = new THREE.LatheGeometry(pts, 96);
  geometry.computeVertexNormals();
  return geometry;
}

export function createCorniceGeometry(radius: number) {
  const pts = [
    new THREE.Vector2(radius - 0.22, 0),
    new THREE.Vector2(radius + 0.28, 0),
    new THREE.Vector2(radius + 0.34, 0.06),
    new THREE.Vector2(radius + 0.1, TOWER.corniceHeight),
    new THREE.Vector2(radius - 0.1, TOWER.corniceHeight),
    new THREE.Vector2(radius - 0.22, 0.06),
  ];
  const geometry = new THREE.LatheGeometry(pts, 96);
  geometry.computeVertexNormals();
  return geometry;
}

/** Chamfered concrete pier. Wider along the ring, slightly narrower toward the bay. */
function createColumnGeometry(height: number) {
  const radial = 0.58;
  const tangent = 0.86;
  const cr = 0.07;
  const hx = radial / 2;
  const hy = tangent / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hx + cr, -hy);
  shape.lineTo(hx - cr, -hy);
  shape.absarc(hx - cr, -hy + cr, cr, -Math.PI / 2, 0, false);
  shape.lineTo(hx, hy - cr);
  shape.absarc(hx - cr, hy - cr, cr, 0, Math.PI / 2, false);
  shape.lineTo(-hx + cr, hy);
  shape.absarc(-hx + cr, hy - cr, cr, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hx, -hy + cr);
  shape.absarc(-hx + cr, -hy + cr, cr, Math.PI, Math.PI * 1.5, false);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 2,
  });
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const scale = 1 - (y / height) * 0.06;
    pos.setX(i, pos.getX(i) * scale);
    pos.setZ(i, pos.getZ(i) * scale);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createSlabGeometry() {
  const inner = ringInner();
  const outer = TOWER.radius + 0.16;
  const pts = [
    new THREE.Vector2(inner, 0),
    new THREE.Vector2(outer, 0),
    new THREE.Vector2(outer, TOWER.slabThickness),
    new THREE.Vector2(inner, TOWER.slabThickness),
  ];
  const geometry = new THREE.LatheGeometry(pts, 80);
  geometry.computeVertexNormals();
  return geometry;
}

export type SectionBuild = {
  body: THREE.BufferGeometry;
  topCornice: THREE.BufferGeometry;
  cube: THREE.BoxGeometry;
  edges: THREE.EdgesGeometry;
  screen: THREE.BufferGeometry;
  chin: THREE.BoxGeometry;
  groove: THREE.BoxGeometry;
  side: THREE.PlaneGeometry;
  back: THREE.PlaneGeometry;
  piers: THREE.BufferGeometry[];
};

function createTubeScreen(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 32, 24);
  const pos = geometry.attributes.position;
  const hw = width * 0.5;
  const hh = height * 0.5;
  const bulge = Math.min(width, height) * 0.055;
  for (let i = 0; i < pos.count; i += 1) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const nx = x / hw;
    const ny = y / hh;
    const corner = Math.max(0, Math.abs(nx) + Math.abs(ny) - 1.12);
    const inset = corner * corner * 0.12;
    x *= 1 - inset;
    y *= 1 - inset;
    const dome = Math.max(0, 1 - nx * nx * 0.9 - ny * ny * 0.9);
    pos.setXYZ(i, x, y, bulge * dome * dome);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function buildSection(): SectionBuild {
  const rings: THREE.BufferGeometry[] = [createSlabGeometry()];

  const cornice = createCorniceGeometry(TOWER.radius);
  cornice.translate(0, -TOWER.corniceHeight, 0);
  rings.push(cornice);

  const radius = pierOrbit();
  const start = 0.04;
  const end = TOWER.sectionGap - TOWER.corniceHeight * 0.4;
  const height = end - start;
  const pierParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < TOWER.piers; i += 1) {
    const angle = (i / TOWER.piers) * Math.PI * 2;
    const pier = createColumnGeometry(height);
    pier.rotateY(-angle);
    pier.translate(Math.cos(angle) * radius, start, Math.sin(angle) * radius);
    pierParts.push(pier);
  }

  const prepare = (geometry: THREE.BufferGeometry) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    for (const key of Object.keys(flat.attributes)) {
      if (key !== "position" && key !== "normal" && key !== "uv") {
        flat.deleteAttribute(key);
      }
    }
    if (!flat.getAttribute("normal")) flat.computeVertexNormals();
    if (!flat.getAttribute("uv")) {
      const count = flat.getAttribute("position").count;
      flat.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (flat !== geometry) geometry.dispose();
    return flat;
  };

  const ringParts = rings.map(prepare);
  const body = mergeGeometries(ringParts, false);
  if (!body) throw new Error("Failed to merge section geometry");
  ringParts.forEach((geometry) => geometry.dispose());
  const piers = pierParts.map(prepare);

  const cube = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
  return {
    body,
    topCornice: createTopCorniceGeometry(),
    cube,
    edges: new THREE.EdgesGeometry(cube, 40),
    screen: createTubeScreen(SCREEN_W, SCREEN_H),
    chin: new THREE.BoxGeometry(CUBE * 0.96, CUBE * 0.065, CUBE * 0.08),
    groove: new THREE.BoxGeometry(CUBE * 0.55, CUBE * 0.025, CUBE * 0.02),
    side: new THREE.PlaneGeometry(CUBE * 0.9, CUBE * 0.9),
    back: new THREE.PlaneGeometry(CUBE * 0.9, CUBE * 0.9),
    piers,
  };
}
