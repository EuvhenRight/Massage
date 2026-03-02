"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Hand, Sparkles, LogOut } from "lucide-react";
import { PLACE_LABELS } from "@/lib/places";
export default function AdminPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-nearBlack text-icyWhite flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl text-icyWhite">Admin</h1>
          <p className="text-icyWhite/60 mt-1">
            Choose which booking system to manage
          </p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/admin/massage"
            className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-gold-soft/30 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-soft/20 border border-gold-soft/40 group-hover:bg-gold-soft/30">
              <Hand className="h-6 w-6 text-gold-glow" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="font-medium text-icyWhite">{PLACE_LABELS.massage}</h2>
              <p className="text-sm text-icyWhite/50">Services, calendar, appointments</p>
            </div>
          </Link>

          <Link
            href="/admin/depilation"
            className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-gold-soft/30 transition-all group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-soft/20 border border-gold-soft/40 group-hover:bg-gold-soft/30">
              <Sparkles className="h-6 w-6 text-gold-glow" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="font-medium text-icyWhite">{PLACE_LABELS.depilation}</h2>
              <p className="text-sm text-icyWhite/50">Services, calendar, appointments</p>
            </div>
          </Link>
        </div>

        {session?.user && (
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-sm text-icyWhite/50 truncate max-w-[200px]">
              {session.user.email}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 text-sm text-icyWhite/60 hover:text-icyWhite transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}

        <Link
          href="/"
          className="block text-center text-sm text-icyWhite/50 hover:text-icyWhite transition-colors"
        >
          ← Back to Aurora
        </Link>
      </div>
    </main>
  );
}
