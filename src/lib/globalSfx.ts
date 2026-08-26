import { playClick, playHoverChime } from "./sounds";

/**
 * Site-wide interaction feedback: every button / card / tile gets a soft
 * hover chime, a press-scale animation and a click blip — without each
 * component wiring handlers by hand.
 *
 * Opt out per element (when it has bespoke SFX) with: data-sfx="off"
 */

const INTERACTIVE = "button, .tile, .pick-card";
const OPT_OUT = '[data-sfx="off"]';

let lastHoverAt = 0;
let lastHoverEl: Element | null = null;

function isDisabled(el: Element): boolean {
  return (
    (el as HTMLButtonElement).disabled === true ||
    el.getAttribute("aria-disabled") === "true"
  );
}

function resolve(target: EventTarget | null): Element | null {
  const el = (target as Element | null)?.closest(INTERACTIVE) ?? null;
  if (!el || el.closest(OPT_OUT) || isDisabled(el)) return null;
  return el;
}

function onOver(e: PointerEvent): void {
  const el = resolve(e.target);
  if (!el || el === lastHoverEl) return;
  lastHoverEl = el;
  const now = performance.now();
  if (now - lastHoverAt < 70) return;
  lastHoverAt = now;
  playHoverChime();
}

function onOut(e: PointerEvent): void {
  const rel = e.relatedTarget as Node | null;
  if (lastHoverEl && (!rel || !lastHoverEl.contains(rel))) {
    lastHoverEl = null;
  }
}

function onDown(e: PointerEvent): void {
  const el = resolve(e.target);
  if (!el) return;
  el.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(.94)" },
      { transform: "scale(1)" },
    ],
    { duration: 170, easing: "ease-out" }
  );
}

function onClick(e: MouseEvent): void {
  if (resolve(e.target)) playClick();
}

export function installGlobalSfx(): () => void {
  document.addEventListener("pointerover", onOver);
  document.addEventListener("pointerout", onOut);
  document.addEventListener("pointerdown", onDown);
  document.addEventListener("click", onClick);
  return () => {
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerout", onOut);
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("click", onClick);
    lastHoverEl = null;
  };
}
