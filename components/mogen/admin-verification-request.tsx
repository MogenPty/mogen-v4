"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function AdminVerificationRequest({ email }: Readonly<{ email: string }>) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState<"send" | "verify" | null>(null);

  async function resend() {
    if (pending) return;
    setPending("send");
    setMessage("");
    setErrorMessage("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (result.error) {
        setErrorMessage(result.error.message ?? "Could not request a verification code.");
      } else {
        setMessage("A verification code has been requested. Check your inbox and spam folder. Use the latest code received.");
      }
    } catch {
      setErrorMessage("Could not request the code. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !otp.trim()) return;
    setPending("verify");
    setMessage("");
    setErrorMessage("");
    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: otp.trim(),
      });
      if (result.error) {
        setErrorMessage(result.error.message ?? "That verification code was not accepted. Request a new code if it has expired.");
        return;
      }
      setMessage("Email verified. Opening the admin dashboard…");
      setOtp("");
      router.refresh();
      router.replace("/admin");
    } catch {
      setErrorMessage("Verification failed. Please check the code and try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[#3b5747] bg-[#25342b] p-5">
      <h3 className="text-lg font-bold text-[#f5f8f6]">Enter your email verification code</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#c6d3cb]">
        Enter the one-time code sent to <span className="font-semibold text-white">{email}</span>.
        The code expires after a limited time.
      </p>
      <form onSubmit={verify} className="mt-5">
        <label htmlFor="admin-email-otp" className="block text-sm font-semibold text-[#e4eee6]">
          Verification code
        </label>
        <input
          id="admin-email-otp"
          type="text"
          name="otp"
          value={otp}
          onChange={event => setOtp(event.target.value.replace(/\s+/g, ""))}
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={12}
          required
          placeholder="Enter code from email"
          className="mt-2 w-full rounded-lg border border-[#668873] bg-[#111a14] px-4 py-3 text-lg tracking-[0.12em] text-white placeholder:text-[#9baea0] focus:border-[#93e3ac] focus:outline-2 focus:outline-[#93e3ac]"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" disabled={pending !== null || otp.trim().length === 0}
            className="rounded-lg bg-[#247f52] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1a6943] disabled:opacity-60">
            {pending === "verify" ? "Verifying…" : "Verify email"}
          </button>
          <button type="button" disabled={pending !== null} onClick={resend}
            className="rounded-lg border border-[#63836e] px-5 py-3 text-sm font-bold text-[#dceee0] hover:bg-[#34513d] disabled:opacity-60">
            {pending === "send" ? "Sending code…" : "Send a new code"}
          </button>
        </div>
      </form>
      {errorMessage && <p role="alert" className="mt-4 text-sm leading-relaxed text-[#ffb8ae]">{errorMessage}</p>}
      {message && <p role="status" aria-live="polite" className="mt-4 text-sm leading-relaxed text-[#b0edbf]">{message}</p>}
    </div>
  );
}
