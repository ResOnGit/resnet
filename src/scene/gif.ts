import { decompressFrame, parseGIF, type ParsedFrame, type ParsedGif } from "gifuct-js";

/**
 * Decoded frames stay under this budget per gif. A long or huge file is
 * scaled down so playback does not keep a full-size bitmap for every frame.
 */
const MAX_EDGE = 512;
const MAX_BYTES = 24 * 1024 * 1024;

type Clip = {
  status: "loading" | "ready" | "error";
  width: number;
  height: number;
  frames: ImageData[];
  delays: number[];
  total: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  index: number;
  origin: number;
  syncedAt: number;
  changed: boolean;
};

const clips = new Map<string, Clip>();

export function isGif(src: string) {
  const path = src.split("?")[0].split("#")[0];
  return path.toLowerCase().endsWith(".gif");
}

export function warmGif(src: string) {
  ensure(src);
}

export function gifStatus(src: string) {
  return ensure(src).status;
}

export function gifView(src: string) {
  const clip = ensure(src);
  if (clip.status !== "ready" || !clip.ctx) return null;
  return { canvas: clip.canvas, width: clip.width, height: clip.height };
}

/** Steps the shared clock. Safe to call once per screen in the same frame. */
export function advanceGif(src: string, now: number) {
  const clip = clips.get(src);
  if (!clip || clip.status !== "ready" || clip.frames.length < 2 || !clip.ctx) return false;
  if (clip.syncedAt === now) return clip.changed;
  clip.syncedAt = now;
  const index = frameAt(clip, now);
  if (index === clip.index) {
    clip.changed = false;
    return false;
  }
  clip.index = index;
  clip.ctx.putImageData(clip.frames[index], 0, 0);
  clip.changed = true;
  return true;
}

function ensure(src: string) {
  const existing = clips.get(src);
  if (existing) return existing;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const clip: Clip = {
    status: ctx ? "loading" : "error",
    width: 0,
    height: 0,
    frames: [],
    delays: [],
    total: 1,
    canvas,
    ctx,
    index: 0,
    origin: 0,
    syncedAt: -1,
    changed: false,
  };
  clips.set(src, clip);
  if (ctx) void decode(src, clip);
  return clip;
}

function frameDelay(ms: number | undefined) {
  const value = ms ?? 100;
  return value < 20 ? 100 : value;
}

function frameAt(clip: Clip, now: number) {
  let time = (now - clip.origin) % clip.total;
  if (time < 0) time += clip.total;
  let acc = 0;
  for (let i = 0; i < clip.delays.length; i += 1) {
    acc += clip.delays[i];
    if (time < acc) return i;
  }
  return 0;
}

function playbackSize(width: number, height: number, count: number) {
  const longest = Math.max(width, height);
  let edge = Math.min(MAX_EDGE, longest);
  const fit = (next: number) => {
    const scale = next / longest;
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    return { w, h, scale, bytes: w * h * 4 * count };
  };
  let size = fit(edge);
  while (size.bytes > MAX_BYTES && edge > 96) {
    edge = Math.max(96, Math.round(edge * 0.8));
    size = fit(edge);
  }
  return size;
}

type DecoderFrame = Parameters<typeof decompressFrame>[0];

function hasImage(part: ParsedGif["frames"][number]): part is DecoderFrame {
  return "image" in part && Boolean(part.image);
}

async function decode(src: string, clip: Clip) {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(String(response.status));
    const buffer = await response.arrayBuffer();
    const parsed = parseGIF(buffer);
    const parts = parsed.frames.filter(hasImage);
    if (!parsed.lsd.width || !parsed.lsd.height || parts.length === 0) throw new Error("empty gif");

    const size = playbackSize(parsed.lsd.width, parsed.lsd.height, parts.length);
    const work = document.createElement("canvas");
    work.width = size.w;
    work.height = size.h;
    const workCtx = work.getContext("2d", { willReadFrequently: true });
    const scratch = document.createElement("canvas");
    const scratchCtx = scratch.getContext("2d");
    if (!workCtx || !scratchCtx || !clip.ctx) throw new Error("canvas");

    const frames: ImageData[] = [];
    const delays: number[] = [];
    let prev = { disposal: 0, left: 0, top: 0, width: 0, height: 0, saved: null as ImageData | null };

    for (let i = 0; i < parts.length; i += 1) {
      const decoded = decompressFrame(parts[i], parsed.gct, true);
      if (decoded?.patch) prev = paintPatch(workCtx, scratch, scratchCtx, decoded, size.scale, prev);
      frames.push(workCtx.getImageData(0, 0, size.w, size.h));
      delays.push(frameDelay(decoded?.delay));
      if (i % 3 === 2) await yieldFrame();
    }

    clip.canvas.width = size.w;
    clip.canvas.height = size.h;
    clip.width = size.w;
    clip.height = size.h;
    clip.frames = frames;
    clip.delays = delays;
    clip.total = Math.max(1, delays.reduce((sum, delay) => sum + delay, 0));
    clip.index = 0;
    clip.origin = performance.now();
    clip.ctx.putImageData(frames[0], 0, 0);
    clip.status = "ready";
  } catch {
    clip.status = "error";
  }
}

type Prev = {
  disposal: number;
  left: number;
  top: number;
  width: number;
  height: number;
  saved: ImageData | null;
};

function paintPatch(
  ctx: CanvasRenderingContext2D,
  scratch: HTMLCanvasElement,
  scratchCtx: CanvasRenderingContext2D,
  frame: ParsedFrame,
  scale: number,
  prev: Prev,
): Prev {
  if (prev.disposal === 2) ctx.clearRect(prev.left, prev.top, prev.width, prev.height);
  else if (prev.disposal === 3 && prev.saved) ctx.putImageData(prev.saved, 0, 0);

  const saved = frame.disposalType === 3 ? ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height) : null;
  const width = frame.dims.width;
  const height = frame.dims.height;
  if (width > 0 && height > 0) {
    if (scratch.width !== width || scratch.height !== height) {
      scratch.width = width;
      scratch.height = height;
    }
    const image = scratchCtx.createImageData(width, height);
    image.data.set(frame.patch);
    scratchCtx.putImageData(image, 0, 0);
    ctx.drawImage(
      scratch,
      Math.round(frame.dims.left * scale),
      Math.round(frame.dims.top * scale),
      Math.max(1, Math.round(width * scale)),
      Math.max(1, Math.round(height * scale)),
    );
  }

  return {
    disposal: frame.disposalType ?? 1,
    left: Math.round(frame.dims.left * scale),
    top: Math.round(frame.dims.top * scale),
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    saved,
  };
}

function yieldFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
