import { useState } from "react";
import type { FormEvent } from "react";
import { isValidEmail, isValidUsername, isValidPassword } from "../lib/storage";

interface RegisterViewProps {
  onSubmit: (email: string, username: string, password: string) => Promise<string | null>;
  onSwitchToLogin: () => void;
}

export default function RegisterView({ onSubmit, onSwitchToLogin }: RegisterViewProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isValidUsername(username)) {
      setError("Username must be 3–16 characters: letters, numbers and underscore.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    onSubmit(email, username, password)
      .then((err) => {
        if (err) setError(err);
      })
      .finally(() => setLoading(false));
  }

  return (
    <main className="center-screen">
      <h1 className="app-title">FATE DRAW</h1>
      <p className="tagline">Create your account to begin your journey.</p>

      <form className="panel auth-panel" onSubmit={submit}>
        <label className="field-label" htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          autoFocus
          disabled={loading}
        />

        <label className="field-label" htmlFor="username">Username</label>
        <input
          id="username"
          className="input"
          value={username}
          maxLength={16}
          placeholder="night_owl_42"
          onChange={(e) => { setUsername(e.target.value); setError(""); }}
          disabled={loading}
        />

        <label className="field-label" htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          disabled={loading}
        />

        <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          className="input"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
          disabled={loading}
        />

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create Account →"}
        </button>
      </form>

      <button className="link-btn" onClick={onSwitchToLogin}>
        Already have an account? Sign in
      </button>
    </main>
  );
}