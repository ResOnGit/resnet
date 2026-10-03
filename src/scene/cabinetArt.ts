import { cabinetMark, sectionNumber } from "../content/levels";

const STENCIL = '"Big Shoulders Stencil", Impact, sans-serif';

function panel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#6a6a6a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, w - 36, h - 36);
}

function screws(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#3a3a3a";
  for (const [x, y] of [
    [34, 34],
    [w - 34, 34],
    [34, h - 34],
    [w - 34, h - 34],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function sectionMark(section: number) {
  return cabinetMark(section);
}

export function drawCabinetSide(canvas: HTMLCanvasElement, section: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  panel(ctx, w, h);
  screws(ctx, w, h);

  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(w - 54, 90, 16, h - 180);

  const number = sectionNumber(section);
  if (!number) return;
  ctx.fillStyle = "#e8e8e8";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `700 54px ${STENCIL}`;
  ctx.fillText("SECTION", 40, 36);
  fitMark(ctx, number, 800, 148, w - 110);
  ctx.fillText(number, 40, 96);
}

export function drawCabinetBack(canvas: HTMLCanvasElement, section: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  panel(ctx, w, h);
  screws(ctx, w, h);

  ctx.fillStyle = "#1a1a1a";
  for (const band of [58, h - 150]) {
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(64, band + i * 16, w - 128, 7);
    }
  }

  const mark = sectionMark(section);
  if (!mark) return;
  ctx.fillStyle = "#e4e4e4";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitMark(ctx, mark, 800, 140, w - 160);
  ctx.fillText(mark, w / 2, h / 2 + 8);
}

function fitMark(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  maxWidth: number,
) {
  let current = size;
  do {
    ctx.font = `${weight} ${current}px ${STENCIL}`;
    current -= 4;
  } while (ctx.measureText(text).width > maxWidth && current > 28);
}
