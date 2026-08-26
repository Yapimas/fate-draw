import { forwardRef, useMemo } from "react";
import type { Draw } from "../types";
import { CATEGORY_EMOJI, categorySlug } from "../types";

interface Star {
  left: string;
  top: string;
  size: string;
  opacity: number;
  delay: string;
  duration: string;
}

function seededRandom(seed: string): () => number {
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Deterministic per-card starfield so screen and exported PNG match.
function makeStars(seed: string, count = 42): Star[] {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, () => ({
    left: `${(rand() * 94 + 3).toFixed(2)}%`,
    top: `${(rand() * 92 + 4).toFixed(2)}%`,
    size: `${(rand() * 2 + 1).toFixed(2)}px`,
    opacity: Number((rand() * 0.55 + 0.25).toFixed(2)),
    delay: `${(rand() * 5).toFixed(2)}s`,
    duration: `${(rand() * 3 + 3).toFixed(2)}s`,
  }));
}

interface FateCardProps {
  draw: Pick<Draw, "cardName" | "score" | "category" | "comment">;
  dateLabel: string;
}

const FateCard = forwardRef<HTMLDivElement, FateCardProps>(function FateCard(
  { draw, dateLabel },
  ref
) {
  const stars = useMemo(
    () => makeStars(`${draw.cardName}|${draw.score}`),
    [draw.cardName, draw.score]
  );
  const emoji = CATEGORY_EMOJI[draw.category] ?? "🃏";

  return (
    <div
      ref={ref}
      className="fate-card"
      aria-label={`${draw.cardName}, ${draw.score} percent, ${draw.category}`}
    >
      <div className="stars" aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>
      <div className="card-border" aria-hidden="true" />
      <div className="card-content">
        <header className="card-header">
          <span className="card-date">{dateLabel}</span>
        </header>
        <div className="card-center">
          <h2 className={`card-name${draw.cardName.length > 22 ? " compact" : ""}`}>
            {draw.cardName}
          </h2>
          <div className="ornament" aria-hidden="true">
            <span />
            ✦
            <span />
          </div>
          <div className="card-score">{draw.score}%</div>
          <div className={`card-category cat-${categorySlug(draw.category)}`}>
            {emoji}&nbsp;&nbsp;{draw.category}
          </div>
          <p className="card-comment">“{draw.comment}”</p>
        </div>
        <footer className="card-footer">✦&nbsp;&nbsp;FATE DRAW&nbsp;&nbsp;✦</footer>
      </div>
    </div>
  );
});

export default FateCard;
