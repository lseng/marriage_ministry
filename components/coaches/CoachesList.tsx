import { useState, useEffect } from 'react';
import { Coach } from '../../types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

export function CoachesList() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch coaches from Supabase
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-6">Loading coaches...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Coaches</h1>
          <p className="text-muted-foreground mt-2">
            Manage your marriage ministry coaches
          </p>
        </div>
        <Button>Add Coach</Button>
      </header>

      {coaches.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No coaches yet. Add your first coach to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map(coach => (
            <Card key={coach.id} className="p-6">
              <h3 className="font-semibold">{coach.first_name} {coach.last_name}</h3>
              <p className="text-sm text-muted-foreground">{coach.email}</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm">
                  {coach.assigned_couples_count} couples assigned
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  coach.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {coach.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
