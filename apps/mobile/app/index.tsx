import { Redirect } from 'expo-router';
import { useAuth, homeFor } from '@/lib/auth';

/** `/` (cold start / web root): send to onboarding, the role home, or login. */
export default function Index() {
  const { session, needsOnboarding } = useAuth();
  const href = !session ? '/(auth)/login' : needsOnboarding ? '/(auth)/onboarding' : homeFor(session.activeRole);
  return <Redirect href={href as any} />;
}
