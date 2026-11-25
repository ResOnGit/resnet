import type { Group } from "three";

/** Handles the tower shares so the framing pass can measure it without owning it. */
export const frameRefs = {
  lean: null as Group | null,
  cubes: [] as (Group | null)[],
};
