"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Join a game or host your own league.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-lg border border-border-glass bg-transparent px-3 py-2 outline-none focus:border-royal-blue"
          />
        </label>

        {state.error && <p className="text-sm text-red-400">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-royal-blue px-4 py-2 font-medium text-white transition-colors hover:bg-royal-blue-deep disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-royal-blue hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
