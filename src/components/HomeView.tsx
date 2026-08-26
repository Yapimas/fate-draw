import { useEffect, useRef, useState } from "react";
import type { Draw, Profile } from "../types";
import { GUEST_EMAIL } from "../lib/storage";
import { formatUtcDate, msUntilNextUtcMidnight } from "../lib/utc";
import { exportCardImage } from "../lib/exportCard";
import FateCard from "./FateCard";

interface HomeViewProps {
  profile: Profile;
  todayDraw: Draw | null;
  justDrew: boolean;
  streak: number;
  onDraw: () => void;
  onUtcRollover: () => void;
  onOpenLegal: () => void;
}

function Countdown({ onComplete }: { onComplete: () => void }) {
  const [remaining, setRemaining] = useState(() => msUntilNextUtcMidnight());

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = msUntilNextUtcMidnight();
      setRemaining(next);
      if (next <= 1100) onComplete();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onComplete]);

  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");

  return (
    <span className="countdown">
      new fate in {h}:{m}:{s}
    </span>
  );
}

export default function HomeView({
  profile,
  todayDraw,
  justDrew,
  streak,
  onDraw,
  onUtcRollover,
  onOpenLegal,
}: HomeViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showUsername, setShowUsername] = useState(true);

  async function handleExport() {
    if (!todayDraw || !cardRef.current || saving) return;
    setSaving(true);
    try {
      await exportCardImage(
        cardRef.current,
        `fate-${todayDraw.drawDate}.png`,
        `${todayDraw.cardName} — ${todayDraw.score}% (${todayDraw.category})`,
        showUsername ? profile.username : undefined
      );
    } catch (err) {
      console.error("Card export failed", err);
    } finally {
      setSaving(false);
    }
  }

  if (!todayDraw) {
    return (
      <section className="hero">
        <h1>
          What does the universe
          <br />
          have planned for you?
        </h1>
        <div className="deck">
          <div className="ghost g1" aria-hidden="true" />
          <div className="ghost g2" aria-hidden="true" />
          <div className="card-back" />
        </div>
        <button className="btn-primary btn-lg" onClick={onDraw}>
          Reveal Today's Fate
        </button>
        <p className="hint">
          One draw per day · resets at midnight UTC ·{" "}
          {profile.email === GUEST_EMAIL
            ? "playing as guest — sign in anytime"
            : `hey ${profile.username} 👋`}{" "}
          ·{" "}
          <button className="hint-link" onClick={onOpenLegal}>
            Terms & Privacy
          </button>
        </p>
      </section>
    );
  }

  return (
    <section className="result">
      {!justDrew && (
        <div className="notice">
          You already checked your fate today — come back tomorrow for a new one.
        </div>
      )}
      <FateCard
        ref={cardRef}
        draw={todayDraw}
        dateLabel={formatUtcDate(todayDraw.drawDate)}
        username={showUsername ? profile.username : undefined}
      />
      <div className="result-actions">
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
      <div className="result-meta">
        <span className="chip streak-chip">🔥 {streak}-day streak</span>
        <Countdown onComplete={onUtcRollover} />
      </div>
    </section>
  );
}