import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { browse } from "../experience/browse";
import { motion } from "../experience/motion";
import { clearUniforms } from "./captionClear";
import { frameRefs } from "./frameRefs";
import { levelScreenY } from "./stackLayout";
import { CUBE, TOWER } from "./towerConfig";

/**
 * Layout, measured instead of guessed.
 *
 * Every frame, with the camera exactly as CameraRig left it, the tower's pillar ring
 * (and the TV being looked at) is projected to screen pixels. From those boxes this works
 * out how to compose the shot so the captions never sit on a pillar. In order of preference:
 *
 *   1. Put the captions beyond the pillars, not just beside the TV.
 *   2. If that does not fit, shrink the shot a little (never past a floor) and let the
 *      caption column get narrower.
 *   3. Only if some overlap is still left does captionClear fade the concrete behind the
 *      text, and only by as much as the leftover overlap.
 *
 * The slide is an off-axis lens shift (setViewOffset) and the shrink is camera.zoom, so the
 * camera angle the tower is composed with does not change.
 */

/** Just outside the cornice lip, which is the widest part of a floor. */
const RING = TOWER.radius + 0.4;
const SAMPLES = 16;
const CAPTION_REM = 18;
const CAPTION_MIN = 230;
/** Never shrink a framed TV below this share of its natural size to make room. */
const ZOOM_FLOOR = 0.74;
const HOME_FLOOR = 0.5;

type Box = { minX: number; maxX: number; minY: number; maxY: number };

const point = new THREE.Vector3();
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function emptyBox(): Box {
  return { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
}

function grow(box: Box, camera: THREE.Camera, width: number, height: number) {
  point.project(camera);
  const x = (point.x * 0.5 + 0.5) * width;
  const y = (1 - (point.y * 0.5 + 0.5)) * height;
  box.minX = Math.min(box.minX, x);
  box.maxX = Math.max(box.maxX, x);
  box.minY = Math.min(box.minY, y);
  box.maxY = Math.max(box.maxY, y);
}

/** The pillar ring around where the camera is looking, as it lands on screen. */
function measureTower(camera: THREE.Camera, width: number, height: number): Box | null {
  const lean = frameRefs.lean;
  if (!lean) return null;
  lean.updateWorldMatrix(true, false);
  const box = emptyBox();
  const baseLook = motion.lookY - browse.scroll;
  const aim = browse.hold >= 0 ? levelScreenY(browse.hold) : baseLook;
  const mid = baseLook + (aim - baseLook) * browse.zoom;
  const span = lerp(14, 7, browse.zoom);
  for (let i = 0; i < SAMPLES; i += 1) {
    const angle = (i / SAMPLES) * Math.PI * 2;
    for (const dy of [-span, 0, span]) {
      point.set(Math.cos(angle) * RING, mid + dy, Math.sin(angle) * RING);
      lean.localToWorld(point);
      grow(box, camera, width, height);
    }
  }
  return box;
}

function measureTv(camera: THREE.Camera, width: number, height: number): Box | null {
  const cubes = frameRefs.cubes;
  if (browse.hold < 0 || cubes.length === 0) return null;
  const cube = cubes[browse.hold % cubes.length];
  if (!cube) return null;
  cube.updateWorldMatrix(true, false);
  const box = emptyBox();
  const h = CUBE / 2;
  for (const sx of [-h, h]) {
    for (const sy of [-h, h]) {
      for (const sz of [-h, h]) {
        point.set(sx, sy, sz);
        cube.localToWorld(point);
        grow(box, camera, width, height);
      }
    }
  }
  return box;
}

let narrative: HTMLElement | null = null;
let lastLeft = 0;
let lastKey = "";
let clearAmt = 0;
const drawing = new THREE.Vector2();
/** Feather of the clear zone, in CSS px. The zone itself starts this far outside the text. */
const CLEAR_SOFT = 44;

function publish(stacked: boolean, left: number, width: number) {
  narrative ??= document.querySelector<HTMLElement>(".narrative");
  if (!narrative) return;
  const key = stacked ? "stack" : `${Math.round(left)}|${Math.round(width)}`;
  if (key === lastKey) return;
  lastKey = key;
  narrative.dataset.stack = stacked ? "true" : "false";
  if (stacked) {
    narrative.style.removeProperty("--cap-left");
    narrative.style.removeProperty("--cap-width");
  } else {
    narrative.style.setProperty("--cap-left", `${Math.round(left)}px`);
    narrative.style.setProperty("--cap-width", `${Math.round(width)}px`);
  }
}

/**
 * Last resort. `overlap` is how many px of pillar still reach into the caption column after
 * placement and shrinking; the fade is scaled to that, so it is zero when the layout fits.
 */
function updateClear(
  width: number,
  height: number,
  stacked: boolean,
  overlap: number,
  dt: number,
  gl: THREE.WebGLRenderer,
) {
  narrative ??= document.querySelector<HTMLElement>(".narrative");
  const mode = narrative?.dataset.mode ?? "home";
  const needed = !stacked && mode !== "home" ? clamp(overlap / 50, 0, 1) : 0;
  clearAmt += (needed - clearAmt) * (1 - Math.exp(-dt * 8));
  clearUniforms.uClearAmt.value = clearAmt;
  gl.getDrawingBufferSize(drawing);
  clearUniforms.uRes.value.copy(drawing);
  if (clearAmt < 0.001 || !narrative) return;
  const caption = narrative.querySelector(`.narrative-${mode}`);
  if (!caption) return;
  const rect = caption.getBoundingClientRect();
  if (rect.width < 2) return;
  const reach = CLEAR_SOFT * 1.2;
  clearUniforms.uClear.value.set(
    (rect.left - reach) / width,
    1 - (rect.bottom + reach) / height,
    (rect.right + reach) / width,
    1 - (rect.top - reach) / height,
  );
  clearUniforms.uSoft.value.set(CLEAR_SOFT / width, CLEAR_SOFT / height);
}

export function FrameRig() {
  useFrame(({ camera, size, gl }, delta) => {
    if (!("fov" in camera)) return;
    const cam = camera as THREE.PerspectiveCamera;
    const { width: W, height: H } = size;
    if (W < 2 || H < 2) return;
    const dt = Math.min(delta, 0.1);

    cam.clearViewOffset();
    cam.zoom = 1;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);

    const settle = motion.settle;
    const z = clamp(browse.zoom, 0, 1);

    const sil = measureTower(cam, W, H);
    if (!sil) return;
    const tv = z > 0.01 ? measureTv(cam, W, H) : null;

    const stacked = W < 780 || W / H < 0.95;
    const margin = Math.max(24, W * 0.05);
    const gap = Math.max(36, W * 0.04);

    const silW = sil.maxX - sil.minX;
    const silCx = (sil.minX + sil.maxX) / 2;

    let scale: number;
    let dx: number;
    let dy = 0;
    let captionW: number;

    if (stacked) {
      // Phones and portrait: the subject goes up top, captions in a block along the bottom.
      // Fit the TV itself (not the whole ring) once one is framed.
      const subject: Box = tv
        ? {
            minX: lerp(sil.minX, tv.minX, z),
            maxX: lerp(sil.maxX, tv.maxX, z),
            minY: lerp(sil.minY, tv.minY, z),
            maxY: lerp(sil.maxY, tv.maxY, z),
          }
        : sil;
      const sw = subject.maxX - subject.minX;
      const sh = subject.maxY - subject.minY;
      const cx = (subject.minX + subject.maxX) / 2;
      const cy = (subject.minY + subject.maxY) / 2;
      const byWidth = (W * 0.94) / sw;
      const byHeight = lerp(1, (H * 0.5) / sh, z);
      const fit = clamp(Math.min(1, byWidth, byHeight), lerp(0.62, 0.28, z), 1);
      scale = lerp(1, fit, settle);
      dx = W / 2 - (W / 2 + (cx - W / 2) * scale);
      dy = z * (H * 0.3 - (H / 2 + (cy - H / 2) * scale));
      captionW = W - margin * 2;
    } else {
      // Wide: the whole pillar ring has to clear the captions, not just the TV.
      const captionMax = Math.min(CAPTION_REM * 16, W * 0.3);
      const room = W - margin * 2 - gap;
      const byWidth = (room - captionMax) / silW;
      const tvH = tv ? tv.maxY - tv.minY : 0;
      const byHeight = tv ? lerp(1, (H * 0.86) / tvH, z) : 1;
      const floor = lerp(HOME_FLOOR, ZOOM_FLOOR, z);
      // Shrink only as far as the floor, unless the TV would not fit the screen's height.
      const fit = Math.min(1, Math.max(byWidth, floor), byHeight);
      scale = lerp(1, Math.max(fit, HOME_FLOOR), settle);

      const scaledW = silW * scale;
      // Whatever room the shrink left decides how wide the captions may be.
      captionW = clamp(room - scaledW, CAPTION_MIN, captionMax);

      const scaledCx = W / 2 + (silCx - W / 2) * scale;
      // Home keeps the tower middle-left. A framed TV packs [tower][gap][captions] to the left.
      const wantHome = clamp(W * 0.36, scaledW / 2 + margin, W - captionW - gap - margin - scaledW / 2);
      const spare = Math.max(0, W - margin * 2 - (scaledW + gap + captionW));
      const wantZoom = margin + spare * 0.45 + scaledW / 2;
      dx = lerp(wantHome, wantZoom, z) - scaledCx;
    }

    cam.zoom = scale;
    cam.setViewOffset(W, H, -dx * settle, -dy * settle, W, H);
    cam.updateProjectionMatrix();

    // Captions start just beyond the pillars. They jump out of the way at once when the
    // subject grows and ease back in when there is room again.
    const scaledW = silW * scale;
    const scaledCx = W / 2 + (silCx - W / 2) * scale;
    const silRight = scaledCx + dx * settle + scaledW / 2;
    let target = silRight + gap;
    target = Math.min(target, W - margin - CAPTION_MIN);
    if (target > lastLeft || settle < 1) lastLeft = target;
    else lastLeft += (target - lastLeft) * (1 - Math.exp(-dt * 5));
    publish(stacked, lastLeft, Math.min(captionW, W - lastLeft - margin));

    // Any pillar that still pokes into the caption column (only when even the shrunk shot
    // cannot clear it) gets faded, in proportion.
    updateClear(W, H, stacked, silRight - lastLeft + 10, dt, gl);
  });

  return null;
}
