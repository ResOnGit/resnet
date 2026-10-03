/**
 * Tower copy. The first floor is the top TV. Add a floor by pasting another block at the bottom.
 *
 * `id` is the section number on the side, the screen, and the SECTION label.
 *   id: "01"
 *
 * `mark` is only the stencil on the back of that TV.
 *   mark: "ABOUT ME"
 *
 * Each floor plays `frames` in order. A frame is one file in public/img and the captions
 * that stay on that picture. The picture changes when the captions enter the next frame.
 *
 *   image: "about/01.png"  →  public/img/about/01.png
 *   image: "about/loop.gif" plays on the screen. PNG and JPG stay still.
 *
 * Leave image as "" for the plain title card.
 */

export type Frame = {
  image: string;
  lines: string[];
};

export type Level = {
  /** Section number. Shown as SECTION {id}. */
  id: string;
  title: string;
  /** Stencil painted on the back of the TV. */
  mark: string;
  frames: Frame[];
};

export const LEVELS: Level[] = [
  {
    id: "01",
    title: "ABOUT ME",
    mark: "ABOUT ME",
    frames: [
      {
        image: "about/01.jpg",
        lines: [
          "Hi!",
          "Welcome to resnet!",
          "Yes.......",
          "This IS a landing page.",
        ],
      },
      {
        image: "about/01.png",
        lines: [
          "Next picture.",
          "Still this picture.",
          "Still this picture.",
          "Still this picture.",
        ],
      },
    ],
  },
  {
    id: "02",
    title: "CREDITS",
    mark: "02",
    frames: [
      {
        image: "credits/01.png",
        lines: ["Name, role.", "Name, role.", "Name, role.", "Name, role."],
      },
    ],
  },
  {
    id: "03",
    title: "MORE TO COME",
    mark: "03",
    frames: [
      {
        image: "",
        lines: ["More to come.", "Would you like to know more?"],
      },
    ],
  },
  {
    id: "04",
    title: "MORE TO COME",
    mark: "04",
    frames: [
      {
        image: "",
        lines: ["More to come.", "Would you like to know more?"],
      },
    ],
  },
  {
    id: "05",
    title: "MORE TO COME",
    mark: "05",
    frames: [
      {
        image: "",
        lines: ["More to come.", "Would you like to know more?"],
      },
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;

export function imageUrl(file: string) {
  const base = import.meta.env.BASE_URL;
  return `${base}img/${file.replace(/^\/+/, "")}`;
}

export function sectionNumber(index: number) {
  if (index < 0 || index >= LEVEL_COUNT) return "";
  return LEVELS[index].id;
}

export function cabinetMark(index: number) {
  if (index < 0 || index >= LEVEL_COUNT) return "";
  return LEVELS[index].mark;
}

export function levelAt(index: number) {
  const wrapped = ((index % LEVEL_COUNT) + LEVEL_COUNT) % LEVEL_COUNT;
  const level = LEVELS[wrapped];
  return {
    ...level,
    number: sectionNumber(wrapped),
    slides: level.frames.flatMap((frame) => frame.lines),
  };
}

/** Picture for this caption. Blank floors and a missing frame return null. */
export function frameOf(section: number, slide: number) {
  if (section < 0 || section >= LEVEL_COUNT) return null;
  const { frames } = LEVELS[section];
  let start = 0;
  for (const frame of frames) {
    if (slide < start + frame.lines.length) return frame;
    start += frame.lines.length;
  }
  return frames[frames.length - 1] ?? null;
}
