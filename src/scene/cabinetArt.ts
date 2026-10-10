import { cabinetMark, sectionNumber } from "../content/levels";
import { etchedText, fitRomanWidth } from "../ui/etchedText";

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
  etchedText(ctx, "SECTION", 40, 36, 44, 700, { baseline: "top", face: "#c9c3b8" });
  const numSize = fitRomanWidth(ctx, number, 700, 148, w - 110);
  etchedText(ctx, number, 40, 96, numSize, 700, { baseline: "top", face: "#ddd8ce" });
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
  const markSize = fitRomanWidth(ctx, mark, 700, 140, w - 160);
  etchedText(ctx, mark, w / 2, h / 2 + 8, markSize, 700, {
    align: "center",
    baseline: "middle",
    face: "#d8d2c8",
  });
}
