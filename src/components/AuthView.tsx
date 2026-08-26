import { useState } from "react";
import type { FormEvent } from "react";
import { isValidEmail } from "../lib/storage";

interface AuthViewProps {
  /** "supabase" sends a real email; "demo" shows the mock inbox. */
  mode: "supabase" | "demo";
  onSendLink: (email: string) => Promise<void>;
  onOpenLink: (email: string) => void;
  onCancel: () => void;
  onOpenLegal: () => void;
}

export default function AuthView({
  mode,
  onSendLink,
  onOpenLink,
  onCancel,
  onOpenLegal,
}: AuthViewProps) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("That doesn't look like a valid email address.");
      return;
    }
    setError("");
    const normalized = trimmed.toLowerCase();
    try {
      setSending(true);
      await onSendLink(normalized);
      setSentTo(normalized);
    } catch (err) {
      setError(
        (err as Error)?.message ??
          "Something went wrong while sending the link. Try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="center-screen">
      <h1 className="app-title">FATE DRAW</h1>
      <p className="tagline">One card a day. No rerolls. The universe is watching.</p>

      {sentTo === null ? (
        <form className="panel auth-panel" onSubmit={submit}>
          <label className="field-label" htmlFor="email">
            Your email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary btn-block" type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send Magic Link ✨"}
          </button>
          <p className="hint">We'll email you a one-tap sign-in link. No password.</p>
        </form>
      ) : mode === "supabase" ? (
        <div className="panel auth-panel">
          <p className="inbox-note">
            📬 Magic link sent to <strong>{sentTo}</strong>.
          </p>
          <p className="hint">
            Open the link from this device and you'll be signed in automatically.
            If it doesn't arrive within a minute, check your spam folder.
          </p>
          <button
            className="link-btn"
            onClick={() => {
              setSentTo(null);
              setEmail("");
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <div className="panel auth-panel">
          <p className="inbox-note">
            📬 Magic link sent to <strong>{sentTo}</strong>. Tap it below to sign in.
          </p>
          <div className="mail">
            <div className="mail-head">
              <span className="mail-from">Fate Draw &lt;hello@fatedraw.app&gt;</span>
              <span className="mail-time">now</span>
            </div>
            <div className="mail-subject">✨ Tap to reveal today's fate</div>
            <p className="mail-body">
              Your personal link into Fate Draw. One tap and you're in.
            </p>
            <button className="btn-primary btn-block" onClick={() => onOpenLink(sentTo)}>
              Open Magic Link
            </button>
          </div>
          <p className="hint">
            Demo mode — no real email is sent; this stands in for your inbox.
          </p>
          <button
            className="link-btn"
            onClick={() => {
              setSentTo(null);
              setEmail("");
            }}
          >
            Use a different email
          </button>
        </div>
      )}

      <button className="link-btn" onClick={onCancel}>
        Maybe later — keep playing as a guest
      </button>
      <button className="link-btn dim-link" onClick={onOpenLegal}>
        Terms &amp; Privacy
      </button>
    </main>
  );
}
