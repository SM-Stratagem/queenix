import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { authClient, MOBILE_HOME, type Role } from '@queenix/auth';
import { clearPushToken } from './push';

/**
 * The role *view* a multi-role user last switched to, remembered per user on
 * this device. Deliberately not written to the server: Convex users.activeRole
 * classifies the account (staff vs member directories, PT eligibility), and a
 * view switch must not reclassify anyone.
 */
const viewKey = (userId: string) => `queenix_view_${userId}`;
async function storedView(userId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(viewKey(userId));
  } catch {
    return null; // web / unavailable keystore: fall back to the server role
  }
}

async function toSession(u: any, fullName?: string): Promise<AuthSession> {
  const roles = (u.roles ?? ['member']) as Role[];
  const view = await storedView(u.id);
  return {
    userId: u.id,
    email: u.email,
    fullName: fullName ?? u.fullName ?? u.name ?? 'Member',
    activeRole: (view && roles.includes(view as Role) ? view : (u.activeRole ?? 'member')) as Role,
    roles,
    avatarUrl: u.image ?? undefined,
    emailVerified: Boolean(u.emailVerified),
    phoneNumber: u.phoneNumberVerified ? u.phoneNumber ?? undefined : undefined,
  };
}

/** better-auth error → one friendly sentence. */
function authError(e: { code?: string; message?: string } | null | undefined, fallback: string): string {
  if (!e) return fallback;
  if (e.code === 'FAILED_TO_UPDATE_USER' || e.code === 'USER_NOT_FOUND') {
    return 'No account uses this number yet. Sign in with email, then add your phone in Profile.';
  }
  if (e.code === 'INVALID_OTP' || e.code === 'OTP_EXPIRED' || e.code === 'TOO_MANY_ATTEMPTS') return e.message ?? 'That code did not work.';
  return e.message ?? fallback;
}

export const homeFor = (role: Role | undefined) => (role && MOBILE_HOME[role]) || '/(member)/home';

interface AuthSession {
  userId: string;
  email: string;
  fullName: string;
  activeRole: Role;
  roles: Role[];
  avatarUrl?: string;
  emailVerified: boolean;
  phoneNumber?: string;
}

type Result = { ok: boolean; error?: string };

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  /** True right after sign-up until onboarding is finished (this app run). */
  needsOnboarding: boolean;
  finishOnboarding: () => void;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  /** SMS sign-in for accounts with a verified phone. */
  sendPhoneCode: (phone: string) => Promise<Result>;
  signInWithPhone: (phone: string, code: string) => Promise<Result>;
  /** Email-code password reset. */
  requestPasswordReset: (email: string) => Promise<Result>;
  resetPassword: (email: string, code: string, password: string) => Promise<Result>;
  /** Verify the signed-in user's email (code sent at sign-up; resendable). */
  sendEmailCode: () => Promise<Result>;
  verifyEmail: (code: string) => Promise<Result>;
  /** Add/replace the signed-in user's phone: send a code, then confirm it. */
  confirmPhone: (phone: string, code: string) => Promise<Result>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // ponytail: in-memory only — a sign-up killed mid-onboarding skips it next launch; persist (server flag) if that matters.
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Bootstrap from stored session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await authClient.getSession();
        if (stored?.data?.user) {
          const next = await toSession(stored.data.user);
          if (mounted) setSession(next);
        }
      } catch (e) {
        // Silent — user is signed out
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Role-based routing
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const role = session?.activeRole;

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (needsOnboarding) {
      if ((segments as string[])[1] !== 'onboarding') router.replace('/(auth)/onboarding');
      return;
    }
    if (inAuthGroup) router.replace(homeFor(role) as any);
  }, [session, segments, isLoading, router, needsOnboarding]);

  const finishOnboarding = useCallback(() => setNeedsOnboarding(false), []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) return { ok: false, error: res.error.message };
      const u: any = res.data?.user;
      if (u) setSession(await toSession(u));
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Sign in failed' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const res = await authClient.signUp.email({ email, password, name: fullName, fullName } as any);
      if (res.error) return { ok: false, error: res.error.message };
      const u: any = res.data?.user;
      if (u) {
        const next = await toSession({ ...u, roles: ['member'], activeRole: 'member' }, fullName);
        setNeedsOnboarding(true);
        setSession(next);
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Sign up failed' };
    }
  }, []);

  const refresh = useCallback(async () => {
    const res = await authClient.getSession();
    const u = res?.data?.user;
    setSession(u ? await toSession(u) : null);
  }, []);

  const sendPhoneCode = useCallback(async (phone: string): Promise<Result> => {
    const res = await authClient.phoneNumber.sendOtp({ phoneNumber: phone.trim() });
    return res.error ? { ok: false, error: authError(res.error, 'Could not send the code') } : { ok: true };
  }, []);

  const signInWithPhone = useCallback(async (phone: string, code: string): Promise<Result> => {
    const res = await authClient.phoneNumber.verify({ phoneNumber: phone.trim(), code: code.trim() });
    if (res.error) return { ok: false, error: authError(res.error, 'That code did not work') };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const requestPasswordReset = useCallback(async (email: string): Promise<Result> => {
    const res = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
    return res.error ? { ok: false, error: authError(res.error, 'Could not send the code') } : { ok: true };
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, password: string): Promise<Result> => {
    const res = await authClient.emailOtp.resetPassword({ email: email.trim(), otp: code.trim(), password });
    return res.error ? { ok: false, error: authError(res.error, 'Could not reset the password') } : { ok: true };
  }, []);

  const sendEmailCode = useCallback(async (): Promise<Result> => {
    if (!session) return { ok: false, error: 'Not signed in' };
    const res = await authClient.emailOtp.sendVerificationOtp({ email: session.email, type: 'email-verification' });
    return res.error ? { ok: false, error: authError(res.error, 'Could not send the code') } : { ok: true };
  }, [session]);

  const verifyEmail = useCallback(async (code: string): Promise<Result> => {
    if (!session) return { ok: false, error: 'Not signed in' };
    const res = await authClient.emailOtp.verifyEmail({ email: session.email, otp: code.trim() });
    if (res.error) return { ok: false, error: authError(res.error, 'That code did not work') };
    await refresh();
    return { ok: true };
  }, [session, refresh]);

  const confirmPhone = useCallback(async (phone: string, code: string): Promise<Result> => {
    const res = await authClient.phoneNumber.verify({ phoneNumber: phone.trim(), code: code.trim(), updatePhoneNumber: true });
    if (res.error) return { ok: false, error: authError(res.error, 'That code did not work') };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await clearPushToken(); // while the session can still call Convex
    await authClient.signOut();
    setNeedsOnboarding(false);
    setSession(null);
    router.replace('/(auth)/login');
  }, [router]);

  const switchRole = useCallback(async (role: Role) => {
    if (!session) return;
    if (!session.roles.includes(role)) return;
    setSession({ ...session, activeRole: role });
    SecureStore.setItemAsync(viewKey(session.userId), role).catch(() => {});
    router.replace(homeFor(role) as any);
  }, [session, router]);



  const value: AuthContextValue = {
    session,
    isLoading,
    needsOnboarding,
    finishOnboarding,
    signIn,
    signUp,
    signOut,
    switchRole,
    sendPhoneCode,
    signInWithPhone,
    requestPasswordReset,
    resetPassword,
    sendEmailCode,
    verifyEmail,
    confirmPhone,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
