import { useCallback, useEffect, useRef, useState } from "react";
import type { Draw, Profile } from "./types";
import { getTodayUTC } from "./lib/utc";
import { computeStreak, generateDraw, calculateXpGain } from "./lib/fate";
import { installGlobalSfx } from "./lib/globalSfx";
import { SUPABASE_READY, supabase } from "./lib/supabase";
import { hashPassword } from "./lib/auth";
import {
  fetchDraws,
  fetchProfile,
  migrateGuestDraws,
  saveDrawDb,
  saveUsername as saveUsernameDb,
} from "./lib/account";
import {
  GUEST_EMAIL,
  getAllDraws,
  getSession,
  getTodayDraw,
  getUserDrawDates,
  isValidUsername,
  loginUser,
  registerUser,
  saveDraw,
  setUsername,
  signOut,
  startAsGuest,
  addXp,
  clearUserData,
} from "./lib/storage";
import UsernameView from "./components/UsernameView";
import HomeView from "./components/HomeView";
import CollectionView from "./components/CollectionView";
import LeaderboardView from "./components/LeaderboardView";
import CardPickOverlay from "./components/CardPickOverlay";
import LegalModal from "./components/LegalModal";
import TermsModal from "./components/TermsModal";
import LoginView from "./components/LoginView";
import RegisterView from "./components/RegisterView";
import ProfileDropdown from "./components/ProfileDropdown";
import BackgroundParticles from "./components/BackgroundParticles";

type View = "loading" | "auth" | "username" | "home" | "collection" | "leaderboard";

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayDraw, setTodayDraw] = useState<Draw | null>(null);
  const [justDrew, setJustDrew] = useState(false);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [streak, setStreak] = useState(0);
  const [pendingDraw, setPendingDraw] = useState<Draw | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [particlesEnabled, setParticlesEnabled] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const bootedRef = useRef(false);

  const refresh = useCallback(async (p: Profile) => {
    const today = getTodayUTC();
    if (p.id && supabase) {
      try {
        const all = await fetchDraws(p.id);
        setDraws(all);
        setTodayDraw(all.find((d) => d.drawDate === today) ?? null);
        setStreak(computeStreak(new Set(all.map((d) => d.drawDate)), today));
      } catch (err) {
        console.error("Failed to load draws", err);
      }
      return;
    }
    setTodayDraw(getTodayDraw(p.email, getTodayUTC()));
    setDraws(getAllDraws(p.email));
    setStreak(computeStreak(getUserDrawDates(p.email), getTodayUTC()));
  }, []);

  function enter(p: Profile) {
    setProfile(p);
    if (!p.username) {
      setView("username");
      return;
    }
    void refresh(p);
    setView("home");
  }

  /** Restore a session from localStorage or Supabase. */
  async function restoreSession() {
    if (SUPABASE_READY && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (user) {
          await enterAccount(user.id, user.email ?? "");
          return;
        }
      } catch (err) {
        console.error("Session restore failed", err);
      }
    }
    // No account session — play as guest immediately, no login wall.
    enter(getSession() ?? startAsGuest());
  }

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => installGlobalSfx(), []);

  const handleUtcRollover = useCallback(() => {
    if (profile?.username) void refresh(profile);
  }, [profile, refresh]);

  /** Restore a Supabase session (incl. magic-link redirects) and migrate guest cards. */
  async function enterAccount(userId: string, email: string) {
    if (supabase) {
      try {
        await migrateGuestDraws(userId, getAllDraws(GUEST_EMAIL));
      } catch (err) {
        console.warn("Guest migration skipped", err);
      }
      const prof = await fetchProfile(userId);
      const p: Profile = { id: userId, email, username: prof?.username ?? "", xp: 0, level: 1, totalDraws: 0 };
      setProfile(p);
      if (!p.username) {
        setView("username");
        return;
      }
      await refresh(p);
      setView("home");
    }
  }

  async function handleRegister(email: string, username: string, password: string): Promise<string | null> {
    const passwordHash = await hashPassword(password);
    const result = registerUser(email, username, passwordHash);
    if ("error" in result) return result.error;
    const p: Profile = { id: "", email: result.email, username: result.username, xp: 0, level: 1, totalDraws: 0 };
    setProfile(p);
    await refresh(p);
    setView("home");
    return null;
  }

  async function handleLogin(email: string, password: string): Promise<string | null> {
    const passwordHash = await hashPassword(password);
    const result = loginUser(email, passwordHash);
    if ("error" in result) return result.error;
    const p: Profile = { id: "", email: result.email, username: result.username, xp: result.xp, level: result.level, totalDraws: result.totalDraws };
    setProfile(p);
    await refresh(p);
    setView("home");
    return null;
  }

  async function handleSaveUsername(username: string): Promise<string | null> {
    if (!profile) return "Not signed in.";
    const usernameTrimmed = username.trim();
    if (!isValidUsername(usernameTrimmed)) {
      return "Usernames are 3–16 characters: letters, numbers and underscore.";
    }
    if (profile.id && supabase) {
      const res = await saveUsernameDb(profile.id, usernameTrimmed);
      if (!res.ok) return res.error;
      const updated: Profile = { ...profile, username: usernameTrimmed };
      setProfile(updated);
      await refresh(updated);
      setView("home");
      return null;
    }
    const result = setUsername(profile.email, usernameTrimmed);
    if ("error" in result) return result.error;
    setProfile(result);
    setJustDrew(false);
    void refresh(result);
    setView("home");
    return null;
  }

  function handleDraw() {
    if (!profile || pendingDraw || todayDraw) return;
    setPendingDraw(generateDraw(profile.email));
  }

  async function handleCeremonyFinish() {
    if (!profile || !pendingDraw) return;
    try {
      if (profile.id && supabase) {
        await saveDrawDb(pendingDraw, profile.id);
      } else {
        const seriesResult = saveDraw(pendingDraw);
        // Award series bonus XP
        if (seriesResult.seriesLeveledUp && profile.email !== GUEST_EMAIL) {
          const result = addXp(profile.email, seriesResult.bonusXp);
          setProfile((prev) => prev ? { ...prev, xp: result.xp, level: result.level } : null);
        }
      }
    } catch (err) {
      // already recorded (other tab) — surface the existing card instead
      if ((err as Error).message !== "already-drawn") {
        console.error("Saving draw failed", err);
      }
    }

    // Award base XP
    const xpGain = calculateXpGain(pendingDraw.category, streak);
    if (profile.email !== GUEST_EMAIL) {
      const result = addXp(profile.email, xpGain);
      setProfile((prev) => prev ? { ...prev, xp: result.xp, level: result.level } : null);
    }

    await refresh(profile);
    setJustDrew(true);
    setPendingDraw(null);
  }

  /* Signing out of an account returns you to the anonymous guest slot — never a wall. */
  async function handleSignOut() {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // local cleanup below still applies
      }
    }
    const p = signOut();
    setProfile(p);
    setJustDrew(false);
    setPendingDraw(null);
    await refresh(p);
    setView("home");
  }

  function handleOpenTerms() {
    setTermsOpen(true);
  }

  async function handleConfirmReset() {
    if (!profile) return;
    if (profile.id && supabase) {
      // For Supabase users, we'd need a backend function to delete the account
      // For now, just clear local data and sign out
      await clearUserData(profile.email);
    } else {
      await clearUserData(profile.email);
    }
    const p = signOut();
    setProfile(p);
    setJustDrew(false);
    setPendingDraw(null);
    setDraws([]);
    setStreak(0);
    setTodayDraw(null);
    await refresh(p);
    setView("home");
    setResetConfirmOpen(false);
  }

  const handleOpenLeaderboard = () => {
    setView("leaderboard");
  };

  if (view === "loading") {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (view === "auth") {
    if (authMode === "login") {
      return (
        <LoginView
          onSubmit={handleLogin}
          onSwitchToRegister={() => setAuthMode("register")}
          onCancel={() => setView("home")}
        />
      );
    } else {
      return (
        <RegisterView
          onSubmit={handleRegister}
          onSwitchToLogin={() => setAuthMode("login")}
        />
      );
    }
  }

  if (view === "username") {
    return <UsernameView onSubmit={handleSaveUsername} onSignOut={handleSignOut} />;
  }

  const isSignedIn = Boolean(profile?.username) && profile?.email !== GUEST_EMAIL;

  return (
    <>
      {particlesEnabled && <BackgroundParticles />}
      <div className="app-shell">
        <header className="topbar">
          <button className="logo" onClick={() => setView("home")}>
            FATE DRAW
          </button>
          <nav className="topnav">
            <button
              className={`nav-link${view === "home" ? " active" : ""}`}
              onClick={() => setView("home")}
            >
              Today
            </button>
            <button
              className={`nav-link${view === "collection" ? " active" : ""}`}
              onClick={() => {
                if (profile) void refresh(profile);
                setView("collection");
              }}
            >
              Collection
            </button>
            <button
              className={`nav-link${view === "leaderboard" ? " active" : ""}`}
              onClick={() => {
                if (profile) void refresh(profile);
                setView("leaderboard");
              }}
            >
              Leaderboard
            </button>
            <span className="chip streak-chip">🔥 {streak}</span>
            <button
              className="btn-particles-toggle"
              onClick={() => setParticlesEnabled((p) => !p)}
              aria-pressed={particlesEnabled}
              aria-label={particlesEnabled ? "Disable background particles" : "Enable background particles"}
              title={particlesEnabled ? "Disable snowfall" : "Enable snowfall"}
            >
              {particlesEnabled ? "❄️" : "☀️"}
            </button>
            {isSignedIn ? (
              <ProfileDropdown
                profile={profile!}
                streak={streak}
                onSignOut={handleSignOut}
                onOpenLeaderboard={handleOpenLeaderboard}
                onOpenTerms={handleOpenTerms}
                onResetAccount={() => setResetConfirmOpen(true)}
              />
            ) : (
              <button className="btn-signin" onClick={() => setView("auth")}>
                Sign in
              </button>
            )}
          </nav>
        </header>

        {view === "home" && profile ? (
          <HomeView
            profile={profile}
            todayDraw={todayDraw}
            justDrew={justDrew}
            streak={streak}
            onDraw={handleDraw}
            onUtcRollover={handleUtcRollover}
            onOpenLegal={() => setLegalOpen(true)}
          />
        ) : view === "collection" && profile ? (
          <CollectionView draws={draws} streak={streak} profile={profile} />
        ) : view === "leaderboard" ? (
          <LeaderboardView />
        ) : (
          <CollectionView draws={draws} streak={streak} profile={profile!} />
        )}
      </div>

      {pendingDraw && (
        <CardPickOverlay draw={pendingDraw} onFinish={handleCeremonyFinish} />
      )}

      {legalOpen && <LegalModal onClose={() => setLegalOpen(false)} />}
      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
      {resetConfirmOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setResetConfirmOpen(false)}
        >
          <div className="modal-body reset-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <h2 id="reset-title">Reset Account?</h2>
            <p>This will permanently delete <strong>all your data</strong>:</p>
            <ul>
              <li>All drawn cards & collection</li>
              <li>XP, level & streak</li>
              <li>Collection series progress</li>
            </ul>
            <p>Your username <strong>@{profile?.username}</strong> will be available for re-registration.</p>
            <p className="warning">This action cannot be undone.</p>
            <div className="reset-actions">
              <button className="btn-secondary" onClick={() => setResetConfirmOpen(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleConfirmReset}>
                Yes, Reset My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}