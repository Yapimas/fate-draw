import { useEffect, useRef } from "react";

interface TermsModalProps {
  onClose: () => void;
}

const TERMS_CONTENT = `
# Terms of Service

**Last updated:** ${new Date().toLocaleDateString()}

## 1. Acceptance of Terms
By accessing and using Fate Draw ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.

## 2. Description of Service
Fate Draw is an entertainment web application that generates daily "fate cards" with randomized scores and categories. This service is **for entertainment purposes only** and does not constitute professional advice, fortune-telling, or any form of prediction with real-world consequences.

## 3. User Accounts
- You may create an account using a username and password.
- You are responsible for maintaining the confidentiality of your credentials.
- Account data includes: username, password hash, XP, level, total draws, and draw history.
- **You may reset your account at any time** using the "Reset Account" button in your profile dropdown. This permanently deletes all your data (draws, XP, level, series progress) but keeps your username available for re-registration.

## 4. Data & Privacy
- All data is stored in your browser (localStorage) and optionally synced to Supabase if configured.
- We do not sell your data. See our Privacy Policy for details.
- Passwords are hashed using SHA-256 (Web Crypto API) before storage.

## 5. Fair Play & Limits
- One card draw per UTC day per account.
- Attempts to bypass limits (multiple accounts, date manipulation) may result in data loss.
- Leaderboards are sorted by card rarity and score for entertainment ranking only.

## 6. Intellectual Property
- Card names, artwork, and generated content are part of the Service.
- You may save and share your card images for personal, non-commercial use.

## 7. Disclaimer of Warranties
THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE ACCURACY, RELIABILITY, OR ANY SPECIFIC OUTCOME FROM USING FATE DRAW.

## 8. Limitation of Liability
IN NO EVENT SHALL THE CREATORS BE LIABLE FOR ANY DAMAGES ARISING FROM USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO EMOTIONAL DISTRESS, FINANCIAL LOSS, OR LIFE DECISIONS BASED ON CARD RESULTS.

## 9. Changes to Terms
We may update these terms. Continued use constitutes acceptance of changes.

## 10. Contact
For questions, open an issue on the project repository.
`;

export default function TermsModal({ onClose }: TermsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      prevFocusRef.current?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={modalRef}
        className="modal-body terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        tabIndex={-1}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="terms-title">Terms of Service</h2>
        <div className="terms-content">
          {TERMS_CONTENT.split("\n").map((line, i) => {
            if (line.startsWith("## ")) return <h3 key={i}>{line.slice(3)}</h3>;
            if (line.startsWith("# ")) return <h2 key={i}>{line.slice(2)}</h2>;
            if (line.startsWith("- ")) return <li key={i}>{line.slice(2)}</li>;
            if (line.trim() === "") return <br key={i} />;
            return <p key={i}>{line}</p>;
          })}
        </div>
        <button className="btn-primary" onClick={onClose}>I Understand</button>
      </div>
    </div>
  );
}