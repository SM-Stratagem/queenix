import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';
import { DashboardHome } from '@/components/admin/DashboardHome';

export default function Home() {
  return (
    <RequireAuth>
      <AdminShell>
        <DashboardHome />
      </AdminShell>
    </RequireAuth>
  );
}
