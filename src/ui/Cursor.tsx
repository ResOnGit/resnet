import { useEffect, useRef, useState } from "react";
import { pointer } from "../experience/pointer";

export function Cursor() {
  const ringRef = useRef<SVGSVGElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [fine, setFine] = useState(() => window.matchMedia("(pointer: fine)").matches);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const onChange = () => setFine(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!fine) return;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ringX = pointer.x;
    let ringY = pointer.y;
    let angle = 0;
    let stretch = 1;
    let grip = 0;
    let press = 0;
    let visible = 0;
    let wasInside = false;
    let hot = false;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (pointer.inside && !wasInside) {
        ringX = pointer.x;
        ringY = pointer.y;
        stretch = 1;
      }
      wasInside = pointer.inside;

      const follow = reduce ? 1 : 1 - Math.exp(-dt * 10);
      ringX += (pointer.x - ringX) * follow;
      ringY += (pointer.y - ringY) * follow;

      const dx = pointer.x - ringX;
      const dy = pointer.y - ringY;
      const pull = Math.hypot(dx, dy);
      let aligned = 1;
      if (!reduce && pull > 3) {
        const next = Math.atan2(dy, dx);
        let turn = next - angle;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        aligned = Math.max(0, 1 - Math.abs(turn) / 0.5);
        angle = next;
      } else if (!reduce) {
        aligned = 0;
      }

      const raw = reduce ? 0 : Math.min(Math.max(pull - 3, 0) * 0.009, 0.34);
      const targetStretch = 1 + raw * aligned;
      const settle = 1 - Math.exp(-dt * (aligned < 0.5 || pull < 8 ? 20 : 10));
      stretch += (targetStretch - stretch) * settle;
      const shown = 1 + (stretch - 1) * aligned;
      const squash = 1 / Math.pow(shown, 0.55);

      const ease = 1 - Math.exp(-dt * 14);
      grip += ((pointer.hot ? 1 : 0) - grip) * ease;
      press += ((pointer.down ? 1 : 0) - press) * ease;
      visible += ((pointer.inside ? 1 : 0) - visible) * (1 - Math.exp(-dt * 18));

      if (hot !== pointer.hot) {
        hot = pointer.hot;
        const flag = hot ? "true" : "false";
        ring.dataset.hot = flag;
        dot.dataset.hot = flag;
      }

      const hold = 1 - grip * 0.34 - press * 0.1;
      const reach = (shown - 1) * 16 * hold;
      const aimX = ringX + Math.cos(angle) * reach;
      const aimY = ringY + Math.sin(angle) * reach;
      dot.style.opacity = String(visible);
      ring.style.opacity = String(visible);
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%) scale(${1 - press * 0.18})`;
      ring.style.transform = `translate3d(${aimX}px, ${aimY}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${shown * hold}, ${squash * hold})`;

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fine]);

  if (!fine) return null;

  return (
    <>
      <svg ref={ringRef} className="cursor-ring" viewBox="0 0 54 54" aria-hidden="true">
        <ellipse cx="27" cy="27" rx="26" ry="26" />
      </svg>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
