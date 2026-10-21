import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { createClient, Session } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { AppConfig } from "../config/AppConfig";

const supabase = createClient(AppConfig.supabaseURL, AppConfig.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

type SessionState = {
  isSignedIn: boolean;
  email?: string | null;
  fullName?: string | null;
  pictureURL?: string | null;
  errorMessage?: string | null;
  isBusy: boolean;
  cachedToken?: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  accessToken: () => Promise<string | null>;
};

const SessionContext = createContext<SessionState | null>(null);

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function applyGoogleProfile(session: Session) {
  const meta = session.user.user_metadata ?? {};
  const identity = session.user.identities?.find((i) => i.provider === "google")?.identity_data ?? {};
  const fullName = firstString(meta.name, meta.full_name, identity.name, identity.full_name);
  const picture = firstString(meta.picture, meta.avatar_url, identity.picture, identity.avatar_url);
  return { fullName, pictureURL: picture };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>();
  const [fullName, setFullName] = useState<string | null>();
  const [pictureURL, setPictureURL] = useState<string | null>();
  const [errorMessage, setError] = useState<string | null>();
  const [isBusy, setBusy] = useState(false);
  const [cachedToken, setCachedToken] = useState<string | null>();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: AppConfig.googleWebClientID,
      iosClientId: AppConfig.googleIOSClientID,
      offlineAccess: false,
      profileImageSize: 256,
      accountName: AppConfig.googleHintEmail,
    });
  }, []);

  const hydrate = useCallback(async (session: Session | null) => {
    if (!session) {
      setSignedIn(false);
      setEmail(null);
      setFullName(null);
      setPictureURL(null);
      setCachedToken(null);
      return;
    }
    setSignedIn(true);
    setEmail(session.user.email ?? null);
    setCachedToken(session.access_token);
    const profile = applyGoogleProfile(session);
    setFullName(profile.fullName ?? null);
    setPictureURL(profile.pictureURL ?? null);
    const current = GoogleSignin.getCurrentUser();
    if (current?.user.name) setFullName(current.user.name);
    if (current?.user.photo) setPictureURL(current.user.photo);
    await api.registerTimezone(session.access_token);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) await hydrate(data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signInWithGoogle = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type !== "success") {
        setBusy(false);
        return;
      }
      const idToken = result.data.idToken;
      if (!idToken) throw new Error("Google did not return an ID token.");
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      await hydrate(data.session);
      if (result.data.user.name) setFullName(result.data.user.name);
      if (result.data.user.photo) setPictureURL(result.data.user.photo);
    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
        setBusy(false);
        return;
      }
      setError(err?.message ?? String(err));
      setSignedIn(false);
    } finally {
      setBusy(false);
    }
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    try {
      await GoogleSignin.signOut();
    } catch {
      /* ignore */
    }
    await hydrate(null);
  }, [hydrate]);

  const accessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    if (token) setCachedToken(token);
    return token;
  }, []);

  const value = useMemo(
    () => ({
      isSignedIn,
      email,
      fullName,
      pictureURL,
      errorMessage,
      isBusy,
      cachedToken,
      signInWithGoogle,
      signOut,
      accessToken,
    }),
    [isSignedIn, email, fullName, pictureURL, errorMessage, isBusy, cachedToken, signInWithGoogle, signOut, accessToken],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
