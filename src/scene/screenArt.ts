import { LEVEL_COUNT, levelAt } from "../content/levels";

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const DISPLAY = 'Syne, "Helvetica Neue", Arial, sans-serif';

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

export function drawScreen(canvas: HTMLCanvasElement, section: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;

  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#2a2a2a");
  base.addColorStop(1, "#121212");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  if (section < 0 || section >= LEVEL_COUNT) {
    blankFace(ctx, w, h);
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

  ctx.font = `400 15px ${MONO}`;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(item.slides[0]?.line ?? "SIGNAL PENDING", 40, h - 46);

  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
