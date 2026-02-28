"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AdminSignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, callbackUrl });
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-nearBlack text-icyWhite flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-nearBlack/80 p-8 shadow-xl">
          <h1 className="font-serif text-2xl text-icyWhite mb-2">Admin sign in</h1>
          <p className="text-icyWhite/60 text-sm mb-8">
            Sign in with email and password to access the admin panel.
          </p>

          {error === "AccessDenied" && (
            <div className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Access denied. Only authorized administrators can sign in.
            </div>
          )}

          {error === "CredentialsSignin" && (
            <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Invalid email or password.
            </div>
          )}

          {error && error !== "AccessDenied" && error !== "CredentialsSignin" && (
            <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Sign in failed. Please try again.
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="mb-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-icyWhite/80 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-icyWhite placeholder:text-icyWhite/40 focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm text-icyWhite/80 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-icyWhite placeholder:text-icyWhite/40 focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-gold-soft/50 bg-gold-soft/20 px-6 py-3 font-medium text-icyWhite transition-colors hover:bg-gold-soft/30 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs text-icyWhite/50">
              <span className="bg-nearBlack/80 px-2">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 font-medium text-icyWhite transition-colors hover:bg-white/10"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <Link
            href="/"
            className="mt-6 block text-center text-sm text-icyWhite/50 hover:text-icyWhite/80 transition-colors"
          >
            ← Back to Aurora
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AdminSignInPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-nearBlack text-icyWhite flex items-center justify-center p-8">
        <div className="text-icyWhite/60">Loading...</div>
      </main>
    }>
      <AdminSignInForm />
    </Suspense>
  );
}
