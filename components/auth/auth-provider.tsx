"use client";
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

interface AuthState {
  mode: "live" | "demo";
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ mode: "demo", user: null, loading: false, signOut: async () => {} });

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(isSupabaseConfigured && !initialUser);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      mode: isSupabaseConfigured ? "live" : "demo",
      user,
      loading,
      signOut: async () => {
        if (isSupabaseConfigured) await supabaseBrowser().auth.signOut();
        setUser(null);
        // Full reload on purpose: clears every cached client state after the session ends.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      },
    }),
    [user, loading],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
