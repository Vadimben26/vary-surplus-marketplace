import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  company_description: string | null;
  user_type: "buyer" | "seller" | "both";
  siret: string | null;
  stripe_account_id: string | null;
  buyer_access_level?: number | null;
  suspended_until?: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  isVerified: () => boolean;
  getUserType: () => "buyer" | "seller" | "both" | null;
  canAccessBuyer: () => boolean;
  canAccessSeller: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (_userId: string) => {
    // Use security-definer RPC so the owner can read sensitive fields (email, phone, siret).
    // Direct table SELECT is column-restricted for non-owners.
    const { data } = await (supabase as any).rpc("get_my_full_profile");
    const row = Array.isArray(data) ? data[0] : null;
    if (row) setProfile(row as Profile);
    return (row as Profile) ?? null;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          // Use setTimeout to avoid deadlock with Supabase auth
          setTimeout(() => fetchProfile(newSession.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    // Clean up legacy localStorage
    localStorage.removeItem("vary_verified");
    localStorage.removeItem("vary_user_type");
    localStorage.removeItem("vary_seller_visibility");
    localStorage.removeItem("vary_profile");
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return { error: new Error("No profile") };
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
    }
    return { error };
  };

  const isVerified = () => !!user;
  const getUserType = () => profile?.user_type ?? null;
  const canAccessBuyer = () => {
    const t = profile?.user_type;
    return t === "buyer" || t === "both";
  };
  const canAccessSeller = () => {
    const t = profile?.user_type;
    return t === "seller" || t === "both";
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, loading,
        signUp, signIn, signOut, refreshProfile, updateProfile,
        isVerified, getUserType, canAccessBuyer, canAccessSeller,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
