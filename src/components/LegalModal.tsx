import { useEffect } from "react";

interface LegalModalProps {
  onClose: () => void;
}

export default function LegalModal({ onClose }: LegalModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel legal-modal" role="dialog" aria-label="Terms and Privacy">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="legal-body">
          <h2>Terms &amp; Privacy</h2>

          <h3>✦ For entertainment only</h3>
          <p>
            Fate Draw is a game. The cards, scores and "prophecies" are random
            entertainment — not real predictions, advice, or guidance of any
            kind. Please don't make life decisions based on a Feral Landlord.
          </p>

          <h3>✦ What we store</h3>
          <p>
            If you sign in, we store your <strong>email address</strong> (for
            the magic-link login) and the <strong>cards you draw</strong> (name,
            score, category, date) so your collection and streak work across
            devices. Authentication and data storage are handled by Supabase.
          </p>
          <p>
            Playing as a guest? Everything stays <strong>in your browser</strong>{" "}
            (localStorage) and never leaves your device.
          </p>

          <h3>✦ What we don't do</h3>
          <p>
            No ads. No trackers. No analytics. No selling or sharing of your
            data. Nothing beyond what the game needs to function.
          </p>

          <h3>✦ Deleting your data</h3>
          <p>
            Guests can wipe everything by clearing site data in their browser.
            Signed-in users can request full account deletion at any time —
            reach out through the project's GitHub page and your email and
            cards will be removed.
          </p>

          <h3>✦ The service itself</h3>
          <p>
            Fate Draw is provided "as is", free of charge, without warranties
            of any kind. Features may change or break; streaks, however, will
            always be brutally honest.
          </p>

          <p className="hint">Last updated: August 2026</p>
        </div>
      </div>
    </div>
  );
}
