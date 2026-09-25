"use client";

import type { CaptchaType } from "captchakit";
import dynamic from "next/dynamic";
import { FormEvent, useState } from "react";
import "captchakit/styles.css";

// Avoid SSR for the CAPTCHA widget when linking the local package (dual-React risk).
const Captcha = dynamic(
  () => import("captchakit").then((mod) => mod.Captcha),
  {
    ssr: false,
    loading: () => <p>Loading CAPTCHA…</p>,
  },
);

/**
 * Browser solves CAPTCHA → receives proof token → form submits proof to server.
 * Final CAPTCHA verification happens on the server (`/api/register`).
 */
export default function HomePage() {
  const [type, setType] = useState<CaptchaType>("math");
  const [email, setEmail] = useState("");
  const [proofToken, setProofToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!proofToken) {
      setError("Please solve the CAPTCHA first.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, captchaToken: proofToken }),
      });
      const body = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !body.success) {
        setError(body.error ?? "Registration failed");
        setProofToken(null);
        return;
      }

      setMessage(body.message ?? "Success");
      setProofToken(null);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>CaptchaKit example</h1>
      <p>
        Solve the CAPTCHA, then submit the form. The server verifies the proof
        token — answers are never trusted from the browser alone.
      </p>

      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label>
          CAPTCHA type
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as CaptchaType);
              setProofToken(null);
              setError(null);
            }}
          >
            <option value="math">math</option>
            <option value="text">text</option>
            <option value="number">number</option>
            <option value="image">image</option>
          </select>
        </label>

        <Captcha
          key={type}
          type={type}
          locale="en"
          difficulty="medium"
          endpoint="/api/captcha"
          onVerify={(token) => {
            setProofToken(token);
            setError(null);
          }}
          onError={() => {
            setProofToken(null);
          }}
        />

        <button type="submit" disabled={submitting || !proofToken}>
          {submitting ? "Submitting…" : "Register"}
        </button>
      </form>

      {message ? <p className="msg ok">{message}</p> : null}
      {error ? <p className="msg err">{error}</p> : null}
    </main>
  );
}
