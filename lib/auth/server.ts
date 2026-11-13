import { waitUntil } from "@vercel/functions";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { getAuthDb } from "@/db/auth-client";
import * as authSchema from "@/db/auth-schema";
import { getMailProvider } from "@/lib/mail/provider-factory";

const secret = process.env.BETTER_AUTH_SECRET?.trim();
if (!secret) {
  throw new Error("BETTER_AUTH_SECRET must be configured");
}

const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function sendVerificationCode(email: string, otp: string, type: string) {
  const result = await getMailProvider().send({
    from: process.env.MAIL_FROM ?? "Mogen <info@mogen.co.za>",
    to: email,
    subject: type === "email-verification" ? "Verify your Mogen email" : "Your Mogen verification code",
    text: `Your Mogen verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your Mogen verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:0.12em">${otp}</p><p>It expires in 10 minutes.</p>`,
  });
  if (!result.success) throw new Error(result.error.message);
}

export const auth = betterAuth({
  appName: "Mogen",
  baseURL,
  secret,
  database: drizzleAdapter(getAuthDb(), {
    provider: "pg",
    schema: authSchema,
    schemaName: "better_auth",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [
    emailOTP({
      expiresIn: 600,
      otpLength: 6,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        waitUntil(sendVerificationCode(email, otp, type).catch(error => {
          console.error("[better-auth] Could not send verification code:", error instanceof Error ? error.message : error);
        }));
      },
    }),
    nextCookies(),
  ],
});
