'use server';

import { auth } from '@/lib/auth/server';
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from 'next/navigation';

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  try {
    await auth.api.signInEmail({
      body: {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: isAPIError(error) ? error.message : 'Failed to sign in. Try again' };
  }

  redirect('/');
}
