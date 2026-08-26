import { useEffect, useRef, useState } from "react";
import { getXpForNextLevel, getXpForLevel } from "../lib/storage";
import type { Profile } from "../types";

interface ProfileDropdownProps {
  profile: Profile;
  streak: number;
  onSignOut: () => void;
  onOpenLeaderboard: () => void;
  onOpenTerms: () => void;
  onResetAccount: () => void;
}

export default function ProfileDropdown({ profile, streak, onSignOut, onOpenLeaderboard, onOpenTerms, onResetAccount }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const xp = profile.xp ?? 0;
  const level = profile.level ?? 1;
  const nextLevelXp = getXpForNextLevel(level);
  const currentLevelXp = getXpForLevel(level);
  const progress = xp > currentLevelXp ? (xp - currentLevelXp) / (nextLevelXp - currentLevelXp) : 0;

  const isGuest = profile.email === "guest";

  if (isGuest) return null;

  return (
    <div className="profile-dropdown-wrapper" ref={dropdownRef}>
      <button
        className="profile-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="avatar">{profile.username.charAt(0).toUpperCase()}</span>
        <span className="username">@{profile.username}</span>
        <span className="chevron" aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="dropdown-header">
            <div className="xp-bar">
              <div className="xp-labels">
                <span>Level {level}</span>
                <span>{xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
              </div>
              <div className="xp-track">
                <div
                  className="xp-fill"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="dropdown-stats">
            <div className="stat-item">
              <span className="stat-label">Total Draws</span>
              <span className="stat-value">{profile.totalDraws ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current Streak</span>
              <span className="stat-value">🔥 {streak}</span>
            </div>
          </div>

          <div className="dropdown-divider" />

          <button className="dropdown-item" role="menuitem" onClick={onOpenLeaderboard}>
            <span>🏆</span> Leaderboard
          </button>

          <div className="dropdown-divider" />

          <button className="dropdown-item" role="menuitem" onClick={onOpenTerms}>
            <span>📜</span> Terms of Service
          </button>

          <button className="dropdown-item danger" role="menuitem" onClick={onResetAccount}>
            <span>🗑️</span> Reset Account
          </button>

          <div className="dropdown-divider" />

          <button className="dropdown-item danger" role="menuitem" onClick={onSignOut}>
            <span>🚪</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}