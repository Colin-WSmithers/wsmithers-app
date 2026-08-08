"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLockup } from "@/components/shared/logo";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-ink-50 px-4 py-10">
      {/* Warm brand wash behind the card, kept subtle so it reads as paper */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-brand-100),transparent_70%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoLockup className="w-48" />
        </div>

        <div className="rounded-card border border-ink-200/80 bg-white p-6 shadow-raised sm:p-7">
          <div className="mb-5">
            <p className="eyebrow mb-1.5">Job Management</p>
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900">Sign in</h1>
            <p className="mt-1 text-sm text-ink-500">
              Use the email and password provided by your office.
            </p>
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@wsmithers.co.uk"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>

            {state.error ? (
              <p role="alert" className="rounded-lg border border-red-200/70 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            ) : null}

            <Button type="submit" variant="primary" size="lg" className="mt-1 w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          Trouble signing in? Contact the office.
        </p>
      </div>
    </div>
  );
}
