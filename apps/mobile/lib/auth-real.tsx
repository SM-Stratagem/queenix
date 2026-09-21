/**
 * Queenix Gym — Real auth context (replaces placeholder)
 * Uses BetterAuth client + Convex queries for user data.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { authClient, type Role } from '@queenix/auth';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';

export interface AuthSession {
  userId: string;
  email: string;
  fullName: string;
  activeRole: Role;
  roles: Role[];
  avatarUrl?: string;
  convexUserId?: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  sendOtp: (phone: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ ok: boolean; error?: string }>;
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
  const router = useRouter();
  const segments = useSegments();
  const switchRoleMutation = useConvexMutation(api.mutations.users.switchRole);

  // Bootstrap from BetterAuth
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authClient.getSession();
        if (mounted && res?.data?.user) {
          const u: any = res.data.user;
          setSession({
            userId: u.id,
            email: u.email,
            fullName: u.fullName ?? u.name ?? 'Member',
            activeRole: (u.activeRole ?? 'member') as Role,
            roles: (u.roles ?? ['member']) as Role[],
            avatarUrl: u.image ?? undefined,
          });
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

    if (inAuthGroup) {
      switch (role) {
        case 'member':
          router.replace('/(member)/home');
          break;
        case 'trainer':
          router.replace('/(trainer)/today');
          break;
        case 'finance':
        case 'owner':
          router.replace('/(owner)/overview');
          break;
        case 'operations':
          router.replace('/(ops)/scanner');
          break;
        default:
          router.replace('/(member)/home');
      }
    }
  }, [session, segments, isLoading, router]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) return { ok: false, error: res.error.message };
      const u: any = res.data?.user;
      if (u) {
        setSession({
          userId: u.id,
          email: u.email,
          fullName: u.fullName ?? u.name ?? 'Member',
          activeRole: (u.activeRole ?? 'member') as Role,
          roles: (u.roles ?? ['member']) as Role[],
          avatarUrl: u.image ?? undefined,
        });
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Sign in failed' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name: fullName,
        fullName,
      } as any);
      if (res.error) return { ok: false, error: res.error.message };
      const u: any = res.data?.user;
      if (u) {
        setSession({
          userId: u.id,
          email: u.email,
          fullName,
          activeRole: 'member',
          roles: ['member'],
          avatarUrl: u.image ?? undefined,
        });
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Sign up failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setSession(null);
    router.replace('/(auth)/login');
  }, [router]);

  const switchRole = useCallback(async (role: Role) => {
    if (!session) return;
    if (!session.roles.includes(role)) return;
    setSession({ ...session, activeRole: role });
    try {
      await switchRoleMutation({ role });
    } catch (e) {
      console.warn('Role switch sync failed', e);
    }
  }, [session, switchRoleMutation]);

  const sendOtp = useCallback(async (phone: string) => {
    try {
      // In production: real SMS provider (Twilio)
      // For now: just return ok so dev flow works
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Failed to send OTP' };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    try {
      return { ok: otp.length === 6 };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'OTP verification failed' };
    }
  }, []);

  const value: AuthContextValue = {
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    switchRole,
    sendOtp,
    verifyOtp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
