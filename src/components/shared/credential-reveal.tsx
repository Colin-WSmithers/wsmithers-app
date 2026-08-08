"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows a one-time password once, with a copy button. Deliberately blunt about
 * the fact it won't be shown again — there's no email provider wired up, so
 * the office has to pass this on by phone or in person.
 */
export function CredentialReveal({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — the password is
      // on screen anyway, so this is a nicety, not a failure worth reporting.
    }
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-brand-800">
        <KeyRound className="h-4 w-4" /> First-time password
      </p>
      <p className="mt-1 text-xs leading-relaxed text-brand-900/80">
        Give this to <strong className="font-semibold">{email}</strong> along with the sign-in link.
        It won&apos;t be shown again — if it&apos;s lost, use “Reset password” to issue a new one.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="tnum flex-1 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-semibold tracking-wider text-ink-900">
          {password}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-brand-900/60">
        Ask them to change it once they&apos;re signed in.
      </p>
    </div>
  );
}
