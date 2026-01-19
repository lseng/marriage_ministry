import { Card } from '../ui/card';
import { StatusBadge, StatusType } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';
import { ClipboardList } from 'lucide-react';
import { formatDate } from '../../lib/date';

interface AssignmentHistoryItem {
  id: string;
  assignment_id: string;
  status: string;
  sent_at: string | null;
  completed_at: string | null;
  assignment: {
    id: string;
    title: string;
    week_number: number;
    due_date: string | null;
  };
}

interface AssignmentHistoryListProps {
  assignments: AssignmentHistoryItem[];
  emptyMessage?: string;
}

export function AssignmentHistoryList({
  assignments,
  emptyMessage = 'No assignments yet',
}: AssignmentHistoryListProps) {
  if (assignments.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={ClipboardList}
          title={emptyMessage}
          description="Assignments will appear here when distributed."
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y">
        {assignments.map((item) => (
          <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-medium">
                  Week {item.assignment.week_number}: {item.assignment.title}
                </h4>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                  {item.assignment.due_date && (
                    <span>Due: {formatDate(item.assignment.due_date)}</span>
                  )}
                  {item.sent_at && (
                    <span>Sent: {formatDate(item.sent_at)}</span>
                  )}
                  {item.completed_at && (
                    <span>Completed: {formatDate(item.completed_at)}</span>
                  )}
                </div>
              </div>
              <StatusBadge status={item.status as StatusType} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
