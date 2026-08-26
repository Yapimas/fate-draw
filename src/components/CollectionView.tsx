import { useRef, useState, useMemo } from "react";
import type { Draw, Profile } from "../types";
import { categorySlug } from "../types";
import { formatUtcDate } from "../lib/utc";
import { exportCardImage } from "../lib/exportCard";
import { getUserSeries, getSeriesThreshold } from "../lib/storage";
import FateCard from "./FateCard";
import MiniFateCard from "./MiniFateCard";

interface CollectionViewProps {
  draws: Draw[]; // most recent first
  streak: number;
  profile: Profile;
}

export default function CollectionView({ draws, streak, profile }: CollectionViewProps) {
  const [selected, setSelected] = useState<Draw | null>(null);
  const [saving, setSaving] = useState(false);
  const [showUsername, setShowUsername] = useState(true);
  const modalCardRef = useRef<HTMLDivElement>(null);

  const best = draws.reduce((acc, d) => Math.max(acc, d.score), 0);

  // Compute series info for each draw
  const seriesMap = useMemo(() => {
    const series = getUserSeries(profile.email);
    const map = new Map<string, { level: number; count: number; maxCount: number }>();
    for (const s of series) {
      map.set(`${s.cardName}|${s.category}`, {
        level: s.level,
        count: s.count,
        maxCount: getSeriesThreshold(s.level),
      });
    }
    return map;
  }, [profile.email]);

  async function handleExport() {
    if (!selected || !modalCardRef.current || saving) return;
    setSaving(true);
    try {
      await exportCardImage(
        modalCardRef.current,
        `fate-${selected.drawDate}.png`,
        `${selected.cardName} — ${selected.score}% (${selected.category})`,
        showUsername ? profile.username : undefined
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

      <div className="mini-grid">
        {draws.map((d) => {
          const seriesInfo = seriesMap.get(`${d.cardName}|${d.category}`);
          return (
            <button
              key={d.id}
              className="mini-card-wrapper"
              onClick={() => setSelected(d)}
              data-category={categorySlug(d.category)}
            >
              <MiniFateCard
                draw={d}
                dateLabel={formatUtcDate(d.drawDate)}
                username={profile.username}
                seriesLevel={seriesInfo?.level}
                seriesCount={seriesInfo?.count}
                seriesMax={seriesInfo?.maxCount}
              />
            </button>
          );
        })}
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
              username={showUsername ? profile.username : undefined}
            />
            <div className="save-group">
              <label className="username-checkbox">
                <input
                  type="checkbox"
                  checked={showUsername}
                  onChange={(e) => setShowUsername(e.target.checked)}
                  disabled={saving}
                />
                <span>Include username</span>
              </label>
              <button className="btn-secondary" onClick={handleExport} disabled={saving}>
                {saving ? "Preparing…" : "⬇ Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}