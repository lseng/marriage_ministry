import { useState, useEffect } from 'react';
import { Assignment } from '../../types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

export function AssignmentsList() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch assignments from Supabase
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-6">Loading assignments...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground mt-2">
            Manage weekly assignments for couples
          </p>
        </div>
        <Button>Create Assignment</Button>
      </header>

      {assignments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No assignments yet. Create your first assignment to get started.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <Card key={assignment.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{assignment.title}</h3>
                  <p className="text-muted-foreground mt-1">{assignment.description}</p>
                </div>
                <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                  Week {assignment.week_number}
                </span>
              </div>
              {assignment.due_date && (
                <p className="text-sm text-muted-foreground mt-4">
                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
