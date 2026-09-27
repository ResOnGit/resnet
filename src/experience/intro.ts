import { TOWER, cameraEnd, CAMERA_START } from "../scene/towerConfig";
import { resetBrowse, setInteractive } from "./browse";
import { motion, resetMotion } from "./motion";

let fontsReady = false;
let sceneReady = false;

if (document.fonts) {
  document.fonts.ready.then(() => {
    fontsReady = true;
  });
} else {
  fontsReady = true;
}

export function markSceneReady() {
  sceneReady = true;
}

function setOpacity(el: Element | null, value: number) {
  if (el instanceof HTMLElement) el.style.opacity = String(value);
}

function requireEl(selector: string) {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) {
    throw new Error(`Missing intro element: ${selector}`);
  }
  return el;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Slow at both ends, so the landing does not kick. */
function glide(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
}

export function startIntro() {
  resetMotion();
  resetBrowse();
  sceneReady = false;

  const word = requireEl('[data-intro="word"]');
  const meta = requireEl('[data-intro="meta"]');
  const flicker = requireEl('[data-intro="flicker"]');
  const line1 = requireEl('[data-intro="line1"]');
  const line2 = requireEl('[data-intro="line2"]');
  const overlay = document.querySelector(".overlay");

  overlay?.setAttribute("data-phase", "black");
  setOpacity(word, 0);
  setOpacity(meta, 0);
  setOpacity(flicker, 0);
  setOpacity(line1, 0);
  setOpacity(line2, 0);

  const end = cameraEnd(window.innerWidth < 780);
  const started = performance.now();
  let phase: "title" | "load" | "release" | "pull" | "done" = "title";
  let loadFrom = 0;
  let releaseFrom = 0;
  let pullFrom = 0;
  let frame = 0;

  const tick = () => {
    if (phase === "done") return;
    const now = performance.now();
    const t = now - started;

    if (phase === "title") {
      overlay?.setAttribute("data-phase", t < 1100 ? "black" : "title");
      const flickerOn = (t > 360 && t < 520) || (t > 980 && t < 1140);
      setOpacity(flicker, flickerOn ? 0.05 : 0);
      setOpacity(word, smooth((t - 900) / 1500));
      motion.ringGhost = smooth((t - 1200) / 1400);
      setOpacity(meta, 0.55 * smooth((t - 1800) / 700));
      if (t >= 2800) {
        phase = "load";
        loadFrom = now;
        overlay?.setAttribute("data-phase", "loading");
        setOpacity(word, 1);
        motion.ringGhost = 1;
      }
    } else if (phase === "load") {
      const elapsed = now - loadFrom;
      const ready = fontsReady && sceneReady;
      const progress = ready
        ? Math.min(1, elapsed / 900)
        : Math.min(0.86, elapsed / 5000);
      motion.progress = progress;
      motion.ringGhost = 1;
      motion.structure = 0;
      meta.textContent = String(Math.round(progress * 100)).padStart(3, "0");
      if (ready && elapsed >= 900) {
        phase = "release";
        releaseFrom = now;
        motion.progress = 1;
        meta.textContent = "100";
      }
    } else if (phase === "release") {
      const u = Math.min(1, (now - releaseFrom) / 1400);
      const e = smooth(u);
      setOpacity(word, 1 - e);
      setOpacity(meta, 0.55 * (1 - e));
      motion.ringGhost = 1 - e;
      motion.structure = e;
      motion.progress = 1;
      if (u >= 1) {
        phase = "pull";
        pullFrom = now;
        overlay?.setAttribute("data-phase", "reveal");
        setOpacity(word, 0);
        setOpacity(meta, 0);
        motion.ringGhost = 0;
        motion.structure = 1;
      }
    } else if (phase === "pull") {
      const u = Math.min(1, (now - pullFrom) / 5600);
      const e = glide(u);
      motion.camX = lerp(CAMERA_START.camX, end.camX, e);
      motion.camY = lerp(CAMERA_START.camY, end.camY, e);
      motion.camZ = lerp(CAMERA_START.camZ, end.camZ, e);
      motion.lookX = lerp(CAMERA_START.lookX, end.lookX, e);
      motion.lookY = lerp(CAMERA_START.lookY, end.lookY, e);
      motion.lookZ = lerp(CAMERA_START.lookZ, end.lookZ, e);
      motion.upX = lerp(CAMERA_START.upX, end.upX, e);
      motion.upY = lerp(CAMERA_START.upY, end.upY, e);
      motion.upZ = lerp(CAMERA_START.upZ, end.upZ, e);
      motion.fov = lerp(CAMERA_START.fov, end.fov, e);
      motion.fogNear = lerp(CAMERA_START.fogNear, end.fogNear, e);
      motion.fogFar = lerp(CAMERA_START.fogFar, end.fogFar, e);
      motion.lean = TOWER.lean * e;
      motion.rotationSpeed = 0.075 * e;
      motion.structure = 1;
      motion.progress = 1;
      setOpacity(line1, smooth((u - 0.62) / 0.28));
      setOpacity(line2, 0.72 * smooth((u - 0.72) / 0.28));
      if (u > 0.72) overlay?.setAttribute("data-phase", "settled");
      if (u >= 1) {
        phase = "done";
        motion.camX = end.camX;
        motion.camY = end.camY;
        motion.camZ = end.camZ;
        motion.lookX = end.lookX;
        motion.lookY = end.lookY;
        motion.lookZ = end.lookZ;
        motion.upX = end.upX;
        motion.upY = end.upY;
        motion.upZ = end.upZ;
        motion.fov = end.fov;
        motion.fogNear = end.fogNear;
        motion.fogFar = end.fogFar;
        motion.lean = TOWER.lean;
        motion.rotationSpeed = 0.075;
        motion.ringGhost = 0;
        overlay?.setAttribute("data-phase", "settled");
        setOpacity(line1, 1);
        setOpacity(line2, 0.72);
        setInteractive(true);
        return;
      }
    }

    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
