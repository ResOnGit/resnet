import "../ui/fonts";
import { TOWER, cameraEnd, CAMERA_START } from "../scene/towerConfig";
import { resetBrowse, setInteractive } from "./browse";
import { motion, resetMotion } from "./motion";

/**
 * Intro timeline, in ms of intro time. About 7.5s end to end (it used to be 10.8s),
 * and any tap, key or scroll fast-forwards the rest. Reduced motion plays it near-instantly.
 */
const BLACK_UNTIL = 600;
const TITLE_END = 2100;
const LOAD_MIN = 600;
const RELEASE = 1000;
const PULL = 4300;
/** Browsing unlocks a little before the camera lands. */
const UNLOCK_AT = 0.82;
const SKIP_RATE = 4;
const META_ALPHA = 0.8;

let fontsReady = false;
let sceneReady = false;

if (document.fonts) {
  // `fonts.ready` alone can resolve before the page has requested any face, so ask for them.
  const wanted = ['700 1em "Trajanus Roman"', "700 1em Cinzel", '500 1em "DM Sans"', '700 1em "DM Sans"'];
  const asked = Promise.allSettled(wanted.map((face) => document.fonts.load(face)));
  Promise.all([asked, document.fonts.ready]).then(() => {
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

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const spin = reduce ? 0 : 0.075;
  const end = cameraEnd(window.innerWidth < 780);

  let rate = reduce ? 8 : 1;
  let clock = 0;
  let last = performance.now();
  let phase: "title" | "load" | "release" | "pull" | "done" = "title";
  let loadFrom = 0;
  let releaseFrom = 0;
  let pullFrom = 0;
  let shown = 0;
  let unlocked = false;
  let frame = 0;

  const fastForward = () => {
    rate = SKIP_RATE;
  };
  const skipEvents = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
  skipEvents.forEach((name) => window.addEventListener(name, fastForward, { passive: true }));
  const unbind = () => skipEvents.forEach((name) => window.removeEventListener(name, fastForward));

  const finish = () => {
    phase = "done";
    motion.settle = 1;
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
    motion.rotationSpeed = spin;
    motion.ringGhost = 0;
    overlay?.setAttribute("data-phase", "settled");
    setOpacity(line1, 1);
    setOpacity(line2, 0.72);
    setInteractive(true);
    unbind();
  };

  const tick = () => {
    if (phase === "done") return;
    const now = performance.now();
    // The cap only guards against a jump after the tab was hidden. It must stay well above
    // a slow frame, or a low-fps machine would play the intro in slow motion.
    const dt = Math.min(now - last, 250) * rate;
    last = now;
    clock += dt;
    const t = clock;

    if (phase === "title") {
      overlay?.setAttribute("data-phase", t < BLACK_UNTIL ? "black" : "title");
      const flickerOn = (t > 200 && t < 320) || (t > 520 && t < 640);
      setOpacity(flicker, flickerOn ? 0.05 : 0);
      setOpacity(word, smooth((t - 450) / 1200));
      motion.ringGhost = smooth((t - 700) / 1200);
      setOpacity(meta, META_ALPHA * smooth((t - 1100) / 600));
      if (t >= TITLE_END) {
        phase = "load";
        loadFrom = t;
        overlay?.setAttribute("data-phase", "loading");
        setOpacity(word, 1);
        motion.ringGhost = 1;
      }
    } else if (phase === "load") {
      const elapsed = t - loadFrom;
      const ready = fontsReady && sceneReady;
      // Ease toward the target so the counter never jumps when loading finishes.
      const target = ready ? 1 : Math.min(0.86, elapsed / 5000);
      shown += (target - shown) * (1 - Math.exp(-(dt / 1000) * 7));
      motion.progress = shown;
      motion.ringGhost = 1;
      motion.structure = 0;
      meta.textContent = String(Math.round(shown * 100)).padStart(3, "0");
      if (ready && elapsed >= LOAD_MIN && shown > 0.995) {
        phase = "release";
        releaseFrom = t;
        motion.progress = 1;
        meta.textContent = "100";
      }
    } else if (phase === "release") {
      const u = Math.min(1, (t - releaseFrom) / RELEASE);
      const e = smooth(u);
      setOpacity(word, 1 - e);
      setOpacity(meta, META_ALPHA * (1 - e));
      motion.ringGhost = 1 - e;
      motion.structure = e;
      motion.progress = 1;
      if (u >= 1) {
        phase = "pull";
        pullFrom = t;
        overlay?.setAttribute("data-phase", "reveal");
        setOpacity(word, 0);
        setOpacity(meta, 0);
        motion.ringGhost = 0;
        motion.structure = 1;
      }
    } else if (phase === "pull") {
      const u = Math.min(1, (t - pullFrom) / PULL);
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
      motion.rotationSpeed = spin * e;
      motion.settle = e;
      motion.structure = 1;
      motion.progress = 1;
      setOpacity(line1, smooth((u - 0.4) / 0.26));
      setOpacity(line2, 0.72 * smooth((u - 0.52) / 0.26));
      if (u > 0.68) overlay?.setAttribute("data-phase", "settled");
      if (!unlocked && u >= UNLOCK_AT) {
        unlocked = true;
        setInteractive(true);
      }
      if (u >= 1) {
        finish();
        return;
      }
    }

    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    unbind();
  };
}
