"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import type { RedirectSourceConflict } from "@/lib/admin/redirect-actions";

export default function RedirectRuleForm({ action, children, className }: Readonly<{
  action: (previous: RedirectSourceConflict | null, data: FormData) => Promise<RedirectSourceConflict | null>;
  children: ReactNode;
  className?: string;
}>) {
  const [conflict, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className} aria-busy={pending} onReset={(event) => event.preventDefault()}>
      {children}
      {conflict && (
        <div role="alert" className="col-span-full rounded-md border border-destructive/40 p-3 text-sm">
          <p><code className="break-all">{conflict.sourcePath}</code> is already reserved by {conflict.owner.kind === "redirect" ? "a redirect" : "a 410 Gone rule"}.</p>
          <Link
            href={conflict.owner.kind === "redirect"
              ? `/admin/redirects/${conflict.owner.id}`
              : `/admin/redirects?goneSource=${encodeURIComponent(conflict.sourcePath)}#gone-rules`}
            className="mt-1 inline-block font-semibold underline"
          >
            Manage existing rule
          </Link>
        </div>
      )}
    </form>
  );
}
