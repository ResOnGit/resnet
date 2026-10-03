import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative paths so the built site loads from a GitHub Pages project URL.
  base: "./",
  plugins: [react()],
});
