import { frameOf, imageUrl, LEVEL_COUNT, levelAt } from "../content/levels";
import { advanceGif, gifStatus, gifView, isGif, warmGif } from "./gif";

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const DISPLAY = 'Syne, "Helvetica Neue", Arial, sans-serif';

type Shot = {
  img: HTMLImageElement;
  status: "loading" | "ready" | "error";
};

const shots = new Map<string, Shot>();

function acquire(src: string) {
  const cached = shots.get(src);
  if (cached) return cached;
  const img = new Image();
  const shot: Shot = { img, status: "loading" };
  shots.set(src, shot);
  img.onload = () => {
    shot.status = "ready";
  };
  img.onerror = () => {
    shot.status = "error";
  };
  img.src = src;
  return shot;
}

export function screenSrc(section: number, slide: number) {
  const frame = frameOf(section, slide);
  return frame?.image ? imageUrl(frame.image) : "";
}

export function screenStatus(src: string) {
  if (!src) return "empty" as const;
  if (isGif(src)) return gifStatus(src);
  return acquire(src).status;
}

/** Start fetches during the intro, before a floor is on screen. */
export function primeScreenImages() {
  for (let section = 0; section < LEVEL_COUNT; section += 1) {
    const level = levelAt(section);
    for (const frame of level.frames) {
      if (frame.image) {
        const src = imageUrl(frame.image);
        if (isGif(src)) warmGif(src);
        else acquire(src);
      }
    }
  }
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  maxWidth: number,
) {
  let current = size;
  do {
    ctx.font = `${weight} ${current}px ${DISPLAY}`;
    current -= 2;
  } while (ctx.measureText(text).width > maxWidth && current > 14);
}

function blankFace(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(28, 28, w - 56, h - 56);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, w - 56, h - 56);
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  for (let y = 36; y < h - 36; y += 5) ctx.fillRect(36, y, w - 72, 1);
  const glare = ctx.createLinearGradient(0, 0, w, h);
  glare.addColorStop(0, "rgba(255,255,255,0.08)");
  glare.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, w, h);
}

function paintPhoto(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = "#101010";
  ctx.fillRect(0, 0, w, h);
  const scale = Math.max(w / sourceWidth, h / sourceHeight);
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function paintTitle(ctx: CanvasRenderingContext2D, section: number, missing: string) {
  const w = 512;
  const h = 512;
  ctx.save();
  ctx.scale(ctx.canvas.width / w, ctx.canvas.height / h);

  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#2a2a2a");
  base.addColorStop(1, "#121212");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  if (section < 0 || section >= LEVEL_COUNT) {
    blankFace(ctx, w, h);
    ctx.restore();
    return;
  }

  const item = levelAt(section);
  ctx.textBaseline = "alphabetic";

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 17px ${MONO}`;
  ctx.fillText(`SECTION ${item.number}`, 40, 60);

  ctx.fillStyle = "#f2f2f2";
  fitFont(ctx, item.title, 800, 42, w - 80);
  ctx.fillText(item.title, 40, h / 2 + 16);

  if (missing) {
    ctx.font = `400 15px ${MONO}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(missing, 40, h - 46);
  }

  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawScreen(canvas: HTMLCanvasElement, section: number, slide = 0) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const frame = frameOf(section, slide);
  const src = frame?.image ? imageUrl(frame.image) : "";
  if (src && isGif(src)) {
    const view = gifView(src);
    if (view) {
      paintPhoto(ctx, view.canvas, view.width, view.height, w, h);
      return;
    }
    paintTitle(ctx, section, gifStatus(src) === "error" ? (frame?.image ?? "") : "");
    return;
  }

  const shot = src ? acquire(src) : null;
  if (shot?.status === "ready" && shot.img.naturalWidth > 0) {
    paintPhoto(ctx, shot.img, shot.img.naturalWidth, shot.img.naturalHeight, w, h);
    return;
  }

  paintTitle(ctx, section, shot?.status === "error" ? (frame?.image ?? "") : "");
}

/** True when a playing gif moved to its next frame and the screen should repaint. */
export function advanceScreen(src: string, now: number) {
  if (!src || !isGif(src)) return false;
  return advanceGif(src, now);
}
