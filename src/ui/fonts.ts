/**
 * Trajanus Roman is registered here rather than with a CSS @font-face, because a
 * root-absolute `/fonts/...` url does not follow Vite's `base: "./"` and would 404
 * on a GitHub Pages project URL. If the file is missing the load just fails quietly
 * and Cinzel stands in.
 */
if (typeof document !== "undefined" && document.fonts) {
  const roman = new FontFace(
    "Trajanus Roman",
    `url(${import.meta.env.BASE_URL}fonts/TrajanusRoman-Bold.woff2) format("woff2")`,
    { weight: "700", style: "normal", display: "swap" },
  );
  document.fonts.add(roman);
  roman.load().catch(() => {});
}

/** Overlay copy and UI. */
export const FONT_SANS = '"DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * Intro + tower engraving. Drop Trajanus Roman Bold into `public/fonts/` as
 * TrajanusRoman-Bold.woff2 (optional); Cinzel is the web fallback preview.
 */
export const FONT_ROMAN =
  '"Trajanus Roman", Cinzel, "Times New Roman", Times, serif';
