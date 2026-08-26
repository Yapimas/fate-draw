import { useState } from "react";
import type { FormEvent } from "react";
import { isValidEmail, isValidPassword } from "../lib/storage";

interface LoginViewProps {
  onSubmit: (email: string, password: string) => Promise<string | null>;
  onSwitchToRegister: () => void;
  onCancel: () => void;
}

export default function LoginView({ onSubmit, onSwitchToRegister, onCancel }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    onSubmit(email, password)
      .then((err) => {
        if (err) setError(err);
      })
      .finally(() => setLoading(false));
  }

  return (
    <main className="center-screen">
      <h1 className="app-title">FATE DRAW</h1>
      <p className="tagline">Welcome back. Sign in to continue your journey.</p>

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

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In →"}
        </button>
      </form>

      <div className="auth-footer">
        <button className="link-btn" onClick={onSwitchToRegister}>
          Don't have an account? Register
        </button>
        <button className="link-btn" onClick={onCancel}>
          Continue as guest
        </button>
      </div>
    </main>
  );
}