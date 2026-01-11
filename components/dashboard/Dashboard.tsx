import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Marriage Ministry Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back{user?.email ? `, ${user.email}` : ''}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Coaches</h3>
          <p className="text-3xl font-bold mt-2">--</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Active Couples</h3>
          <p className="text-3xl font-bold mt-2">--</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Pending Assignments</h3>
          <p className="text-3xl font-bold mt-2">--</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Completed This Week</h3>
          <p className="text-3xl font-bold mt-2">--</p>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <p className="text-muted-foreground">No recent activity</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Assignments</h2>
          <p className="text-muted-foreground">No upcoming assignments</p>
        </Card>
      </div>
    </div>
  );
}
