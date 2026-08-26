import { useState } from "react";
import type { FormEvent } from "react";

interface UsernameViewProps {
  onSubmit: (username: string) => Promise<string | null>;
  onSignOut: () => void;
}

export default function UsernameView({ onSubmit, onSignOut }: UsernameViewProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const err = await onSubmit(username);
      if (err) setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="center-screen">
      <h1 className="app-title">Choose your name</h1>
      <p className="tagline">This is how you appear in your fate ledger.</p>
      <form className="panel auth-panel" onSubmit={submit}>
        <label className="field-label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="input"
          value={username}
          maxLength={16}
          placeholder="night_owl_42"
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
          }}
          autoFocus
        />
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary btn-block" type="submit" disabled={saving}>
          {saving ? "Claiming…" : "Enter the Deck →"}
        </button>
      </form>
      <button className="link-btn" onClick={onSignOut}>
        Sign out
      </button>
    </main>
  );
}
