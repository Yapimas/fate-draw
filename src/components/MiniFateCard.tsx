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

function makeStars(seed: string, count = 24): Star[] {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, () => ({
    left: `${(rand() * 94 + 3).toFixed(2)}%`,
    top: `${(rand() * 92 + 4).toFixed(2)}%`,
    size: `${(rand() * 1.5 + 0.5).toFixed(2)}px`,
    opacity: Number((rand() * 0.5 + 0.2).toFixed(2)),
    delay: `${(rand() * 4).toFixed(2)}s`,
    duration: `${(rand() * 3 + 3).toFixed(2)}s`,
  }));
}

interface MiniFateCardProps {
  draw: Pick<Draw, "cardName" | "score" | "category" | "comment">;
  dateLabel: string;
  username?: string;
  seriesLevel?: number;
  seriesCount?: number;
  seriesMax?: number;
}

const MiniFateCard = forwardRef<HTMLDivElement, MiniFateCardProps>(function MiniFateCard(
  { draw, dateLabel, username, seriesLevel, seriesCount, seriesMax },
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
      className={`mini-fate-card cat-${categorySlug(draw.category)}`}
      aria-label={`${draw.cardName}, ${draw.score} percent, ${draw.category}`}
    >
      <div className="mini-stars" aria-hidden="true">
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
      <div className="mini-card-border" aria-hidden="true" />
      <div className="mini-card-content">
        <header className="mini-card-header">
          <span className="mini-card-date">{dateLabel}</span>
          <span className={`mini-card-category cat-${categorySlug(draw.category)}`}>
            {emoji}
          </span>
        </header>
        <div className="mini-card-center">
          <h3 className="mini-card-name">{draw.cardName}</h3>
          <div className="mini-ornament" aria-hidden="true">
            <span />
            <span className="mini-ornament-star" />
            <span />
          </div>
          <div className="mini-card-score">{draw.score}%</div>
          <p className="mini-card-comment">“{draw.comment}”</p>
        </div>
        <footer className="mini-card-footer">
          {username && <span className="mini-card-username">@{username}</span>}
          {(seriesLevel && seriesLevel > 1) && (
            <span className="mini-series-badge">Series {seriesLevel} <span className="series-progress">({seriesCount}/{seriesMax})</span></span>
          )}
        </footer>
      </div>
    </div>
  );
});

export default MiniFateCard;