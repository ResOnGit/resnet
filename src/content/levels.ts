export type Slide = {
  kicker: string;
  line: string;
};

export type Level = {
  id: string;
  title: string;
  slides: Slide[];
};

export const LEVEL_COUNT = 5;

function slidesFor(label: string): Slide[] {
  return [
    { kicker: "PART 01", line: `${label}. Signal pending.` },
    { kicker: "PART 02", line: "More to come." },
    { kicker: "PART 03", line: "Would you like to know more?" },
    { kicker: "PART 04", line: "Another line, still pending." },
  ];
}

export const LEVELS: Level[] = [
  { id: "placeholder-a", title: "PLACEHOLDER A", slides: slidesFor("Placeholder A") },
  { id: "more-1", title: "MORE TO COME", slides: slidesFor("More to come") },
  { id: "placeholder-b", title: "PLACEHOLDER B", slides: slidesFor("Placeholder B") },
  { id: "more-2", title: "MORE TO COME", slides: slidesFor("More to come") },
  { id: "more-3", title: "MORE TO COME", slides: slidesFor("More to come") },
];

export function sectionNumber(index: number) {
  if (index < 0 || index >= LEVEL_COUNT) return "";
  return String(index + 1).padStart(2, "0");
}

export function levelAt(index: number) {
  const wrapped = ((index % LEVEL_COUNT) + LEVEL_COUNT) % LEVEL_COUNT;
  return { ...LEVELS[wrapped], number: sectionNumber(wrapped) };
}
