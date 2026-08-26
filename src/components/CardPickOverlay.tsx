import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Draw } from "../types";
import { categorySlug } from "../types";
import { formatUtcDate } from "../lib/utc";
import FateCard from "./FateCard";
import {
  playCardHover,
  playClaimClick,
  playHoverChime,
  playPick,
  playReward,
  playShatter,
  playWhoosh,
  rewardTierFor,
  tick,
} from "../lib/sounds";

type Phase = "burst" | "pick" | "move" | "spin" | "reveal";

interface CardPickOverlayProps {
  draw: Draw;
  onFinish: () => void;
}

const CARD_COUNT = 3;

interface ShardSpec {
  left: number;
  top: number;
  w: number;
  h: number;
  bx: number;
  by: number;
  dx: number;
  dy: number;
  rot: number;
  dur: number;
  delay: number;
}

/** Slices a card rect into fragments that blow outward and fade. */
function ShatterField({ rects }: { rects: Array<DOMRect | null> }) {
  const groups = useMemo(
    () =>
      rects.map((r) => {
        if (!r) return null;
        const COLS = 5;
        const ROWS = 9;
        const cw = r.width / COLS;
        const chh = r.height / ROWS;
        const shards: ShardSpec[] = [];
        for (let cIdx = 0; cIdx < COLS; cIdx++) {
          for (let rIdx = 0; rIdx < ROWS; rIdx++) {
            const cxp = (cIdx + 0.5) / COLS - 0.5;
            const cyp = (rIdx + 0.5) / ROWS - 0.5;
            shards.push({
              left: r.left + cIdx * cw,
              top: r.top + rIdx * chh,
              w: cw,
              h: chh,
              bx: -(cIdx * cw),
              by: -(rIdx * chh),
              dx: cxp * 210 + (Math.random() - 0.5) * 100,
              dy: cyp * 170 + 80 + Math.random() * 130,
              rot: (Math.random() - 0.5) * 320,
              dur: 520 + Math.random() * 260,
              delay: Math.random() * 90,
            });
          }
        }
        return { shards, w: r.width, h: r.height };
      }),
    [rects]
  );

  return (
    <>
      {groups.map((group, gi) =>
        group
          ? group.shards.map((s, si) => (
              <span
                key={`${gi}-${si}`}
                className="shard"
                style={
                  {
                    left: s.left,
                    top: s.top,
                    width: s.w,
                    height: s.h,
                    backgroundPosition: `${s.bx}px ${s.by}px`,
                    "--gw": `${group.w}px`,
                    "--gh": `${group.h}px`,
                    "--dx": `${s.dx}px`,
                    "--dy": `${s.dy}px`,
                    "--rot": `${s.rot}deg`,
                    animationDuration: `${s.dur}ms`,
                    animationDelay: `${s.delay}ms`,
                  } as CSSProperties
                }
              />
            ))
          : null
      )}
    </>
  );
}

export default function CardPickOverlay({ draw, onFinish }: CardPickOverlayProps) {
  const [phase, setPhase] = useState<Phase>("burst");
  const [picked, setPicked] = useState<number | null>(null);
  const [shatterRects, setShatterRects] = useState<Array<DOMRect | null>>([
    null,
    null,
    null,
  ]);
  const [displayScore, setDisplayScore] = useState(0);
  const [rolled, setRolled] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  const layerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([null, null, null]);
  const flipWrapRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const timersRef = useRef<number[]>([]);
  const flyersRef = useRef<HTMLDivElement[]>([]);
  const rafRef = useRef(0);
  const claimedRef = useRef(false);
  const lastHoverRef = useRef(0);
  const lastCardHoverRef = useRef(0);

  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* ---- phase 1: ~3s card storm covering the screen, three survivors land ---- */
  useEffect(() => {
    // This effect may run twice under StrictMode — always start from scratch.
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    cancelAnimationFrame(rafRef.current);
    flyersRef.current.forEach((m) => m.remove());
    flyersRef.current = [];

    if (reduceMotion) {
      setDisplayScore(draw.score);
      setRolled(true);
      setShowContinue(true);
      setPhase("reveal");
      return;
    }

    playWhoosh();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const diag = Math.hypot(vw, vh);

    const layer = layerRef.current;
    if (layer) {
      const COUNT = 64;
      for (let i = 0; i < COUNT; i++) {
        const m = document.createElement("div");
        m.className = "flyer";
        m.style.width = `${26 + Math.random() * 30}px`;
        const ang = Math.random() * Math.PI * 2;
        const dist = 160 + Math.random() * diag * 0.62;
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist * 0.9;
        const rot = `${(Math.random() - 0.5) * 720}deg`;
        const dur = 1300 + Math.random() * 1000;
        const delay = Math.random() * 700;
        const anim = m.animate(
          [
            {
              transform: "translate(-50%,-50%) translate(0px,0px) rotate(0deg)",
              opacity: 1,
            },
            {
              transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(${rot})`,
              opacity: 0,
            },
          ],
          { duration: dur, delay, easing: "cubic-bezier(.15,.7,.35,1)", fill: "both" }
        );
        layer.appendChild(m);
        flyersRef.current.push(m);
        later(
          () => {
            anim.cancel();
            m.remove();
          },
          delay + dur + 80
        );
      }
    }

    // Three survivors glide out of the thinning storm into their slots.
    const restPose = (i: number): string =>
      i === 1 ? "translate(0px,0px)" : `rotate(${i === 0 ? -7 : 7}deg) translateY(16px)`;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const sx = vw / 2 - (r.left + r.width / 2);
      const sy = vh / 2 - (r.top + r.height / 2);
      el.animate(
        [
          {
            transform: `translate(${sx}px,${sy}px) scale(.35) rotate(0deg)`,
            opacity: 0,
          },
          {
            transform: `translate(${sx * 0.22}px,${sy * 0.22}px) scale(1.07) ${restPose(i)}`,
            opacity: 1,
            offset: 0.74,
          },
          { transform: restPose(i), opacity: 1 },
        ],
        {
          duration: 1050,
          delay: 1550 + i * 220,
          easing: "cubic-bezier(.2,.8,.3,1)",
          fill: "backwards",
        }
      );
      later(() => tick(300 + i * 70, 0.13, 0.07), 2450 + i * 220);
    });

    later(() => setPhase("pick"), 3150);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      flyersRef.current.forEach((m) => m.remove());
      flyersRef.current = [];
    };
  }, [draw.score, later, reduceMotion]);

  /* ---- pick: chosen glides to centre, losers shatter ---- */
  function choose(i: number) {
    if (phase !== "pick") return;
    setPicked(i);
    playPick();

    if (reduceMotion) {
      setPhase("spin");
      return;
    }

    const el = cardRefs.current[i];
    if (!el) {
      setPhase("spin");
      return;
    }
    const r = el.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (r.left + r.width / 2);
    const dy = window.innerHeight * 0.44 - (r.top + r.height / 2);
    const tilt = i === 1 ? 0 : i === 0 ? -7 : 7;
    const lift = i === 1 ? "" : " translateY(16px)";
    el.animate(
      [
        { transform: `translate(0px,0px) rotate(${tilt}deg)${lift}` },
        { transform: `translate(${dx}px,${dy}px) rotate(0deg)` },
      ],
      { duration: 520, easing: "cubic-bezier(.3,.7,.25,1)", fill: "forwards" }
    );

    const rects: Array<DOMRect | null> = [null, null, null];
    cardRefs.current.forEach((other, j) => {
      if (j !== i && other) rects[j] = other.getBoundingClientRect();
    });
    setShatterRects(rects);
    playShatter();
    later(() => setPhase("spin"), 540);
  }

  /* ---- spin: fast rotateY decelerating; motion blur fades as it slows ---- */
  useEffect(() => {
    if (phase !== "spin" || reduceMotion) return;
    const el = flipRef.current;
    const wrap = flipWrapRef.current;
    if (!el) return;

    const T = 2600;
    const THETA = 6 * 360 + 180; // ends on the front face
    const t0 = performance.now();
    let lastHalf = -1;
    let lastTickAt = 0;
    let prevTh = 0;
    let prevT = t0;

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / T);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const th = THETA * e;
      el.style.transform = `rotateY(${th}deg)`;

      const speed = Math.abs(th - prevTh) / Math.max(1, now - prevT); // deg/ms
      prevTh = th;
      prevT = now;
      if (wrap) wrap.style.filter = `blur(${Math.min(9, speed * 3.4).toFixed(2)}px)`;

      const half = Math.floor(th / 180);
      if (half > lastHalf && now - lastTickAt > 42) {
        lastHalf = half;
        lastTickAt = now;
        tick(1050 - 320 * p, 0.09 + 0.04 * (1 - p), 0.03);
      }
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        el.style.transform = "rotateY(180deg)";
        if (wrap) wrap.style.filter = "";
        setPhase("reveal");
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, reduceMotion]);

  /* ---- reveal: slot-machine score roll, then rarity-scaled fanfare ---- */
  useEffect(() => {
    if (phase !== "reveal") return;
    const flipEl = flipRef.current;
    if (flipEl && !flipEl.style.transform) {
      flipEl.style.transform = "rotateY(180deg)";
    }
    if (flipWrapRef.current) flipWrapRef.current.style.filter = "";
    if (rolled) return;

    const T = 1150;
    const t0 = performance.now();
    let lastTickAt = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / T);
      const e = 1 - Math.pow(1 - p, 2.2);
      setDisplayScore(Math.round(e * draw.score));
      if (now - lastTickAt > 55 && p < 0.97) {
        lastTickAt = now;
        tick(520 + 900 * p, 0.08, 0.03);
      }
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayScore(draw.score);
        setRolled(true);
        later(() => {
          const dur = playReward(rewardTierFor(draw.category));
          later(() => setShowContinue(true), Math.max(500, dur * 1000 - 500));
        }, 260);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, rolled, draw.score, draw.category, later]);

  /* ---- claim: pulse animation + confirm sound, then hand back to the app ---- */
  function handleClaim() {
    if (claimedRef.current) return;
    claimedRef.current = true;
    playClaimClick();
    continueRef.current?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(.92)", offset: 0.35 },
        { transform: "scale(1.06)", offset: 0.72 },
        { transform: "scale(1)" },
      ],
      { duration: 340, easing: "ease-out" }
    );
    window.setTimeout(onFinish, 320);
  }

  function handleClaimEnter() {
    const now = Date.now();
    if (now - lastHoverRef.current < 200) return;
    lastHoverRef.current = now;
    playHoverChime();
  }

  function handleCardEnter() {
    if (phase !== "pick") return;
    const now = Date.now();
    if (now - lastCardHoverRef.current < 150) return;
    lastCardHoverRef.current = now;
    playCardHover();
  }

  const showSlots = phase === "burst" || phase === "pick" || phase === "move";
  const showSpinStage = phase === "spin" || phase === "reveal";

  return (
    <div className="overlay">
      <div ref={layerRef} aria-hidden="true" />

      {showSlots && (
        <div className="pick-slots">
          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <div key={i} className="pick-slot">
              <button
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={`pick-card${i === 0 ? " tilt-l" : i === 2 ? " tilt-r" : ""}${
                  picked !== null && picked !== i ? " gone" : ""
                }`}
                data-sfx="off"
                onMouseEnter={handleCardEnter}
                onFocus={handleCardEnter}
                onClick={() => choose(i)}
                disabled={phase !== "pick"}
                tabIndex={phase === "pick" ? 0 : -1}
                aria-label={`Mystery card ${i + 1}`}
              >
                <span className="pick-card-face" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(phase === "move" || phase === "spin") && shatterRects.some(Boolean) && (
        <ShatterField rects={shatterRects} />
      )}

      {phase === "pick" && (
        <div className="pick-prompt">
          <h2>Choose your fate</h2>
          <p>Only one card holds your destiny</p>
        </div>
      )}

      {showSpinStage && (
        <div
          className={`spin-stage tier-${categorySlug(draw.category)}${
            rolled ? " revealed" : ""
          }`}
        >
          <div className="glow" aria-hidden="true" />
          <div className="flip" ref={flipWrapRef}>
            <div className="flip-inner" ref={flipRef}>
              <div className="face back" />
              <div className="face front">
                <FateCard
                  draw={{ ...draw, score: displayScore }}
                  dateLabel={formatUtcDate(draw.drawDate)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showContinue && (
        <div className="continue-wrap">
          <button
            ref={continueRef}
            className="btn-primary continue-btn"
            data-sfx="off"
            onMouseEnter={handleClaimEnter}
            onFocus={handleClaimEnter}
            onClick={handleClaim}
          >
            Claim Your Fate
          </button>
        </div>
      )}
    </div>
  );
}
