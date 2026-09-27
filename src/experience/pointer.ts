export const pointer = {
  x: 0,
  y: 0,
  inside: false,
  hot: false,
  down: false,
};

export function bindPointer() {
  const onMove = (event: PointerEvent) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = true;
  };

  const onLeave = () => {
    pointer.inside = false;
    pointer.hot = false;
    pointer.down = false;
  };

  const onDown = () => {
    pointer.down = true;
  };

  const onUp = () => {
    pointer.down = false;
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  document.documentElement.addEventListener("pointerleave", onLeave);

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  };
}
