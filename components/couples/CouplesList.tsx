import { useState, useEffect } from 'react';
import { Couple } from '../../types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

export function CouplesList() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch couples from Supabase
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-6">Loading couples...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Couples</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage couples in the ministry
          </p>
        </div>
        <Button>Add Couple</Button>
      </header>

      {couples.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No couples yet. Add your first couple to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {couples.map(couple => (
            <Card key={couple.id} className="p-6">
              <h3 className="font-semibold">
                {couple.husband_first_name} & {couple.wife_first_name} {couple.husband_last_name}
              </h3>
              <p className="text-sm text-muted-foreground">{couple.email}</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Enrolled: {new Date(couple.enrollment_date).toLocaleDateString()}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  couple.status === 'active' ? 'bg-green-100 text-green-800' :
                  couple.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {couple.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
