import { FONT_ROMAN } from "./fonts";

type EtchedOpts = {
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  face?: string;
  shadow?: string;
  highlight?: string;
};

export function setRomanFont(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FONT_ROMAN}`;
}

export function etchedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight = 700,
  opts: EtchedOpts = {},
) {
  const {
    align = "left",
    baseline = "alphabetic",
    face = "#b8b2a6",
    shadow = "rgba(0,0,0,0.52)",
    highlight = "rgba(255,255,255,0.2)",
  } = opts;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  setRomanFont(ctx, weight, size);
  ctx.fillStyle = shadow;
  ctx.fillText(text, x + 1.5, y + 1.5);
  ctx.fillStyle = highlight;
  ctx.fillText(text, x - 1, y - 1);
  ctx.fillStyle = face;
  ctx.fillText(text, x, y);
}

export function fitRomanWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  maxWidth: number,
) {
  let current = size;
  do {
    setRomanFont(ctx, weight, current);
    current -= 3;
  } while (ctx.measureText(text).width > maxWidth && current > 20);
  return current;
}
