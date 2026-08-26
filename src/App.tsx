import { useCallback, useEffect, useRef, useState } from "react";
import type { Draw, Profile } from "./types";
import { getTodayUTC } from "./lib/utc";
import { computeStreak, generateDraw } from "./lib/fate";
import { installGlobalSfx } from "./lib/globalSfx";
import { SUPABASE_READY, supabase } from "./lib/supabase";
import {
  deleteDrawForDate,
  fetchDraws,
  fetchProfile,
  migrateGuestDraws,
  saveDrawDb,
  saveUsername as saveUsernameDb,
} from "./lib/account";
import {
  GUEST_EMAIL,
  consumeMagicLink,
  deleteDrawsForDate,
  getAllDraws,
  getSession,
  getTodayDraw,
  getUserDrawDates,
  isValidUsername,
  saveDraw,
  sendMagicLink,
  setUsername,
  signOut,
  startAsGuest,
} from "./lib/storage";
import AuthView from "./components/AuthView";
import UsernameView from "./components/UsernameView";
import HomeView from "./components/HomeView";
import CollectionView from "./components/CollectionView";
import CardPickOverlay from "./components/CardPickOverlay";

type View = "loading" | "auth" | "username" | "home" | "collection";

const TEST_MODE_KEY = "fatedraw.testMode.v1";

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayDraw, setTodayDraw] = useState<Draw | null>(null);
  const [justDrew, setJustDrew] = useState(false);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [streak, setStreak] = useState(0);
  const [pendingDraw, setPendingDraw] = useState<Draw | null>(null);
  const [testMode, setTestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TEST_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });

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
    setTodayDraw(getTodayDraw(p.email, today));
    setDraws(getAllDraws(p.email));
    setStreak(computeStreak(getUserDrawDates(p.email), today));
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

  /** Restore a Supabase session (incl. magic-link redirects) and migrate guest cards. */
  async function enterAccount(userId: string, email: string) {
    if (supabase) {
      try {
        await migrateGuestDraws(userId, getAllDraws(GUEST_EMAIL));
      } catch (err) {
        console.warn("Guest migration skipped", err);
      }
      const prof = await fetchProfile(userId);
      const p: Profile = { id: userId, email, username: prof?.username ?? "" };
      setProfile(p);
      if (!p.username) {
        setView("username");
        return;
      }
      await refresh(p);
      setView("home");
    }
  }

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    void (async () => {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const user = data.session?.user;
          if (user) {
            await enterAccount(user.id, user.email ?? "");
            return;
          }
        }
      } catch (err) {
        console.error("Session restore failed", err);
      }
      // No account session — play as guest immediately, no login wall.
      enter(getSession() ?? startAsGuest());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => installGlobalSfx(), []);

  const handleUtcRollover = useCallback(() => {
    if (profile?.username) void refresh(profile);
  }, [profile, refresh]);

  function toggleTestMode() {
    setTestMode((v) => {
      const next = !v;
      try {
        localStorage.setItem(TEST_MODE_KEY, next ? "1" : "0");
      } catch {
        // private mode etc — session-only fallback
      }
      return next;
    });
  }

  /** Real OTP when Supabase is configured; simulated link in demo mode. */
  async function handleSendLink(email: string) {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      return;
    }
    sendMagicLink(email); // demo mode: no network call
  }

  function handleOpenLink(email: string) {
    const p = consumeMagicLink(email); // guest data migrates into the demo account
    if (p) {
      setJustDrew(false);
      enter(p);
    }
  }

  async function handleSaveUsername(rawUsername: string): Promise<string | null> {
    if (!profile) return "Not signed in.";
    const username = rawUsername.trim();
    if (!isValidUsername(username)) {
      return "Usernames are 3–16 characters: letters, numbers and underscore.";
    }
    if (profile.id && supabase) {
      const res = await saveUsernameDb(profile.id, username);
      if (!res.ok) return res.error;
      const updated: Profile = { ...profile, username };
      setProfile(updated);
      await refresh(updated);
      setView("home");
      return null;
    }
    const result = setUsername(profile.email, username);
    if ("error" in result) return result.error;
    setProfile(result);
    setJustDrew(false);
    void refresh(result);
    setView("home");
    return null;
  }

  /* The draw is generated up front but only recorded once the card-pick
     ceremony completes, so closing the tab mid-animation never burns a day. */
  function handleDraw() {
    if (!profile || pendingDraw || todayDraw) return;
    setPendingDraw(generateDraw(profile.email));
  }

  /* 🧪 testing: discard today's card and run the ceremony again. */
  async function handleRedraw() {
    if (!profile || !todayDraw || pendingDraw) return;
    try {
      if (profile.id && supabase) {
        await deleteDrawForDate(profile.id, getTodayUTC());
      } else {
        deleteDrawsForDate(profile.email, getTodayUTC());
      }
    } catch (err) {
      console.error("Redraw cleanup failed", err);
    }
    await refresh(profile);
    setJustDrew(false);
    setPendingDraw(generateDraw(profile.email));
  }

  async function handleCeremonyFinish() {
    if (!profile || !pendingDraw) return;
    try {
      if (profile.id && supabase) {
        await saveDrawDb(pendingDraw, profile.id);
      } else {
        saveDraw(pendingDraw);
      }
    } catch (err) {
      // already recorded (other tab) — surface the existing card instead
      if ((err as Error).message !== "already-drawn") {
        console.error("Saving draw failed", err);
      }
    }
    await refresh(profile);
    setJustDrew(true);
    setPendingDraw(null);
  }

  /* Signing out of an account returns you to the guest slot — never a wall. */
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

  if (view === "loading") {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (view === "auth") {
    return (
      <AuthView
        mode={SUPABASE_READY ? "supabase" : "demo"}
        onSendLink={handleSendLink}
        onOpenLink={handleOpenLink}
        onCancel={() => setView("home")}
      />
    );
  }

  if (view === "username") {
    return <UsernameView onSubmit={handleSaveUsername} onSignOut={handleSignOut} />;
  }

  const isSignedIn = Boolean(profile?.id);

  return (
    <>
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
            <span className="chip streak-chip">🔥 {streak}</span>
            <button
              className={`chip test-chip${testMode ? " on" : ""}`}
              onClick={toggleTestMode}
              title="Testing: allow unlimited redraws"
              aria-pressed={testMode}
            >
              🧪
            </button>
            {isSignedIn ? (
              <>
                <span className="chip user-chip">@{profile?.username}</span>
                <button className="nav-link muted" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
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
            showRedraw={testMode && Boolean(todayDraw)}
            onDraw={handleDraw}
            onRedraw={handleRedraw}
            onUtcRollover={handleUtcRollover}
          />
        ) : (
          <CollectionView draws={draws} streak={streak} />
        )}
      </div>

      {pendingDraw && (
        <CardPickOverlay draw={pendingDraw} onFinish={handleCeremonyFinish} />
      )}
    </>
  );
}
