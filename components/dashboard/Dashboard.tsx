import { useAuth } from '../../contexts/AuthContext';
import { ManagerDashboard } from './ManagerDashboard';
import { CoachDashboard } from './CoachDashboard';
import { CoupleDashboard } from './CoupleDashboard';
import { LoadingPage } from '../ui/loading-spinner';

export function Dashboard() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingPage message="Loading dashboard..." />;
  }

  const displayName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {role === 'admin' && 'Ministry Dashboard'}
          {role === 'coach' && 'Coach Dashboard'}
          {role === 'couple' && 'My Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Welcome back{displayName ? `, ${displayName}` : ''}
        </p>
      </header>

      {role === 'admin' && <ManagerDashboard />}
      {role === 'coach' && <CoachDashboard />}
      {role === 'couple' && <CoupleDashboard />}
    </div>
  );
}
