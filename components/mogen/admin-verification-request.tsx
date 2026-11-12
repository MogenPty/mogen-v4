"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function AdminVerificationRequest({ email }: Readonly<{ email: string }>) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function resend() {
    setPending(true);
    setMessage("");
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/admin",
      });
      setMessage(error
        ? (error.message ?? "Could not send the verification email. Check your Neon Better Auth email settings.")
        : "Request submitted. Check your inbox and spam folder for a verification link.");
    } catch {
      setMessage("Verification request failed. Check that email verification is enabled in your Neon Better Auth configuration.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={pending}
        onClick={resend}
        className="rounded-lg bg-[#247f52] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1a6943] disabled:opacity-60"
      >
        {pending ? "Requesting email…" : "Send verification email"}
      </button>
      {message && <p role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed text-[#d9e4dc]">{message}</p>}
    </div>
  );
}
