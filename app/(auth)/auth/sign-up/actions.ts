'use server';

import { auth } from '@/lib/auth/server';
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from 'next/navigation';

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: "Email address must be provided." }
  }

  // Optionally restrict sign ups based on email address
  // if (!email.trim().endsWith("@my-company.com")) {
  //  return { error: 'Email must be from my-company.com' };
  // }

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        name: formData.get('name') as string,
        password: formData.get('password') as string,
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: isAPIError(error) ? error.message : 'Failed to create account' };
  }

  redirect('/');
}
