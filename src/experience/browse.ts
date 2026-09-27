import { useSyncExternalStore } from "react";
import { LEVEL_COUNT, levelAt } from "../content/levels";
import { HOME_LOOK_Y, nominalLevelY } from "../scene/towerConfig";

/** A short flick crosses about one floor. A single notch does not. */
const WHEEL_SCALE = 0.012;
const KEY_NUDGE = 1.7;
const SLIDE_WHEEL = 90;

export const browse = {
  scroll: 0,
  target: 0,
  zoom: 0,
  storyBlend: 0,
  focus: -1,
  inspect: -1,
  hold: -1,
  story: -1,
  slide: 0,
  flashLevel: -99,
  flashAt: 0,
};

type Snapshot = {
  focus: number;
  story: number;
  slide: number;
  interactive: boolean;
};

let snapshot: Snapshot = { focus: -1, story: -1, slide: 0, interactive: false };
const listeners = new Set<() => void>();

function emit(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBrowseSnapshot() {
  return snapshot;
}

export function useBrowse() {
  return useSyncExternalStore(subscribe, getBrowseSnapshot);
}

export function setInteractive(value: boolean) {
  if (snapshot.interactive !== value) emit({ interactive: value });
}

export function resetBrowse() {
  browse.scroll = 0;
  browse.target = 0;
  browse.zoom = 0;
  browse.storyBlend = 0;
  browse.focus = -1;
  browse.inspect = -1;
  browse.hold = -1;
  browse.story = -1;
  browse.slide = 0;
  emit({ focus: -1, story: -1, slide: 0, interactive: false });
}

function scrollCeiling() {
  return Math.max(0, HOME_LOOK_Y - nominalLevelY(LEVEL_COUNT - 1));
}

export function inspectLevel(index: number) {
  if (browse.story >= 0 || index < 0 || index >= LEVEL_COUNT) return;
  browse.inspect = index;
  browse.hold = index;
  if (browse.focus !== index) {
    browse.focus = index;
    emit({ focus: index });
  }
}

export function clearInspect() {
  if (browse.story >= 0) return;
  browse.inspect = -1;
  if (browse.focus !== -1) {
    browse.focus = -1;
    emit({ focus: -1 });
  }
}

export function openStory(index: number) {
  if (index < 0 || index >= LEVEL_COUNT) return;
  browse.story = index;
  browse.slide = 0;
  browse.inspect = index;
  browse.focus = index;
  browse.flashLevel = index;
  browse.flashAt = performance.now();
  emit({ focus: index, story: index, slide: 0 });
}

export function closeStory() {
  if (browse.story < 0) {
    clearInspect();
    return;
  }
  browse.story = -1;
  browse.slide = 0;
  browse.inspect = -1;
  browse.focus = -1;
  emit({ focus: -1, story: -1, slide: 0 });
}

export function stepSlide(delta: number) {
  if (browse.story < 0 || delta === 0) return;
  const count = levelAt(browse.story).slides.length;
  const next = Math.min(count - 1, Math.max(0, browse.slide + delta));
  if (next === browse.slide) return;
  browse.slide = next;
  emit({ slide: next });
}

function nudge(delta: number) {
  if (browse.story >= 0) return;
  const ceiling = scrollCeiling();
  browse.target = Math.min(ceiling, Math.max(0, browse.target + delta));
}

export function updateBrowse(delta: number) {
  browse.scroll += (browse.target - browse.scroll) * (1 - Math.exp(-delta * 4.2));

  const wantZoom = browse.inspect >= 0 ? 1 : 0;
  browse.zoom += (wantZoom - browse.zoom) * (1 - Math.exp(-delta * 3.2));
  if (browse.inspect >= 0) browse.hold = browse.inspect;
  else if (browse.zoom < 0.02) browse.hold = -1;

  const wantStory = browse.story >= 0 ? 1 : 0;
  browse.storyBlend += (wantStory - browse.storyBlend) * (1 - Math.exp(-delta * 3.2));
}

export function bindBrowseInput() {
  let touchY: number | null = null;
  let slideWheel = 0;

  const onWheel = (event: WheelEvent) => {
    if (!snapshot.interactive) return;
    if (browse.story >= 0) {
      slideWheel += event.deltaY;
      while (slideWheel >= SLIDE_WHEEL) {
        stepSlide(1);
        slideWheel -= SLIDE_WHEEL;
      }
      while (slideWheel <= -SLIDE_WHEEL) {
        stepSlide(-1);
        slideWheel += SLIDE_WHEEL;
      }
      return;
    }
    const scale = event.deltaMode === 1 ? 16 : 1;
    nudge(event.deltaY * scale * WHEEL_SCALE);
  };

  const onKey = (event: KeyboardEvent) => {
    if (!snapshot.interactive) return;
    const down = ["ArrowDown", "PageDown", " "].includes(event.key);
    const up = ["ArrowUp", "PageUp"].includes(event.key);
    if (!down && !up && event.key !== "Home") return;
    event.preventDefault();
    if (browse.story >= 0) {
      if (event.key === "Home") stepSlide(-browse.slide);
      else stepSlide(down ? 1 : -1);
      return;
    }
    if (event.key === "Home") browse.target = 0;
    else nudge(down ? KEY_NUDGE : -KEY_NUDGE);
  };

  const onTouchStart = (event: TouchEvent) => {
    touchY = event.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!snapshot.interactive || touchY === null) return;
    const y = event.touches[0].clientY;
    const delta = touchY - y;
    touchY = y;
    if (browse.story >= 0) {
      slideWheel += delta;
      while (slideWheel >= SLIDE_WHEEL) {
        stepSlide(1);
        slideWheel -= SLIDE_WHEEL;
      }
      while (slideWheel <= -SLIDE_WHEEL) {
        stepSlide(-1);
        slideWheel += SLIDE_WHEEL;
      }
      return;
    }
    nudge(delta * 0.018);
  };

  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });

  return () => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
  };
}
