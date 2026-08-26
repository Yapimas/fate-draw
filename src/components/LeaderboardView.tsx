import { useEffect, useState } from "react";
import { getTodayUTC } from "../lib/utc";
import { getDailyLeaderboard } from "../lib/storage";
import { CATEGORY_EMOJI, categorySlug } from "../types";

export default function LeaderboardView() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const date = getTodayUTC();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  function loadLeaderboard() {
    setLoading(true);
    // Small delay to allow UI to update
    setTimeout(() => {
      const data = getDailyLeaderboard(date);
      setEntries(data);
      setLoading(false);
    }, 50);
  }

  function formatDateLabel(d: string): string {
    const [year, month, day] = d.split("-");
    const dateObj = new Date(Date.UTC(+year, +month - 1, +day));
    return dateObj.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }

  if (loading) {
    return (
      <section className="leaderboard">
        <div className="leaderboard-header">
          <h1>Daily Leaderboard</h1>
          <span className="leaderboard-date">{formatDateLabel(date)}</span>
        </div>
        <div className="leaderboard-loading">Loading...</div>
      </section>
    );
  }

  return (
    <section className="leaderboard">
      <div className="leaderboard-header">
        <h1>Daily Leaderboard</h1>
        <span className="leaderboard-date">{formatDateLabel(date)}</span>
      </div>

      {entries.length === 0 ? (
        <div className="leaderboard-empty">
          <div className="empty-glyph" aria-hidden="true">🏆</div>
          <h2>No draws yet today</h2>
          <p>Be the first to draw your fate and claim the top spot!</p>
        </div>
      ) : (
        <ol className="leaderboard-list">
          {entries.map((entry, index) => (
            <li key={`${entry.username}-${entry.drawDate}-${index}`} className="leaderboard-entry">
              <span className="rank {index < 3 ? `top-${index + 1}` : ''}">
                {index + 1}
              </span>
              <div className="entry-info">
                <span className="entry-username">@{entry.username}</span>
                <span className={`entry-category cat-${categorySlug(entry.category)}`}>
                  {CATEGORY_EMOJI[entry.category] ?? "🃏"} {entry.category}
                </span>
              </div>
              <div className="entry-card">
                <span className="entry-card-name">{entry.cardName}</span>
                <span className="entry-score">{entry.score}%</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

interface LeaderboardEntry {
  username: string;
  cardName: string;
  score: number;
  category: string;
  drawDate: string;
}