import { AdminShell } from '@/components/AdminShell';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <AdminShell>
      <Dashboard />
    </AdminShell>
  );
}
