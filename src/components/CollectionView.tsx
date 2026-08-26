import { useRef, useState } from "react";
import type { Draw } from "../types";
import { CATEGORY_EMOJI, categorySlug } from "../types";
import { formatShortDate, formatUtcDate } from "../lib/utc";
import { exportCardImage } from "../lib/exportCard";
import FateCard from "./FateCard";

interface CollectionViewProps {
  draws: Draw[]; // most recent first
  streak: number;
}

export default function CollectionView({ draws, streak }: CollectionViewProps) {
  const [selected, setSelected] = useState<Draw | null>(null);
  const [saving, setSaving] = useState(false);
  const modalCardRef = useRef<HTMLDivElement>(null);

  const best = draws.reduce((acc, d) => Math.max(acc, d.score), 0);

  async function handleExport() {
    if (!selected || !modalCardRef.current || saving) return;
    setSaving(true);
    try {
      await exportCardImage(
        modalCardRef.current,
        `fate-${selected.drawDate}.png`,
        `${selected.cardName} — ${selected.score}% (${selected.category})`
      );
    } catch (err) {
      console.error("Card export failed", err);
    } finally {
      setSaving(false);
    }
  }

  if (draws.length === 0) {
    return (
      <section className="empty-state">
        <div className="empty-glyph" aria-hidden="true">🂠</div>
        <h2>Your collection is empty</h2>
        <p>Draw your first fate card to start the archive.</p>
      </section>
    );
  }

  return (
    <section className="collection">
      <div className="stats-row">
        <span className="stat">
          <strong>{draws.length}</strong> cards
        </span>
        <span className="stat">
          <strong>{best}%</strong> best score
        </span>
        <span className="stat">
          <strong>{streak}</strong> 🔥 streak
        </span>
      </div>

      <div className="grid">
        {draws.map((d) => (
          <button key={d.id} className="tile" onClick={() => setSelected(d)}>
            <span className={`tile-cat cat-${categorySlug(d.category)}`}>
              {CATEGORY_EMOJI[d.category] ?? "🃏"} {d.category}
            </span>
            <span className="tile-name">{d.cardName}</span>
            <span className="tile-score">{d.score}%</span>
            <span className="tile-date">{formatShortDate(d.drawDate)}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="modal-body">
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ×
            </button>
            <FateCard
              ref={modalCardRef}
              draw={selected}
              dateLabel={formatUtcDate(selected.drawDate)}
            />
            <button className="btn-secondary" onClick={handleExport} disabled={saving}>
              {saving ? "Preparing…" : "⬇ Save / Share"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
