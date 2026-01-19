import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalFooter } from '../ui/modal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { StatusBadge, StatusType } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { LoadingSpinner } from '../ui/loading-spinner';
import { EmptyState } from '../ui/empty-state';
import { Card } from '../ui/card';
import { formatDate } from '../../lib/date';
import { getAssignmentStatuses } from '../../services/assignments';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar,
  Clock,
  Send,
  CheckCircle,
  Users,
  FileText,
  Edit,
} from 'lucide-react';
import type { AssignmentWithStats } from '../../services/assignments';

interface AssignmentStatus {
  id: string;
  status: string;
  sent_at: string | null;
  completed_at: string | null;
  couple: {
    id: string;
    husband_first_name: string;
    wife_first_name: string;
    husband_last_name: string;
  };
}

export interface AssignmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssignmentWithStats | null;
  onEdit?: (assignment: AssignmentWithStats) => void;
  onDistribute?: (assignment: AssignmentWithStats) => void;
}

export function AssignmentDetailModal({
  isOpen,
  onClose,
  assignment,
  onEdit,
  onDistribute,
}: AssignmentDetailModalProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [statuses, setStatuses] = useState<AssignmentStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && assignment) {
      const fetchStatuses = async () => {
        setLoadingStatuses(true);
        setStatusError(null);
        try {
          const data = await getAssignmentStatuses(assignment.id);
          setStatuses(data);
        } catch (err) {
          setStatusError(err instanceof Error ? err.message : 'Failed to load statuses');
        } finally {
          setLoadingStatuses(false);
        }
      };
      fetchStatuses();
    }
  }, [isOpen, assignment]);

  if (!assignment) return null;

  const sentCount = statuses.filter(s => s.status === 'sent').length;
  const completedCount = statuses.filter(s => s.status === 'completed').length;
  const pendingCount = statuses.filter(s => s.status === 'pending').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assignment.title}
      description={`Week ${assignment.week_number}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Assignment Info */}
        <div className="space-y-4">
          {assignment.description && (
            <p className="text-muted-foreground">{assignment.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Week {assignment.week_number}
            </Badge>
            {assignment.due_date && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Due: {formatDate(assignment.due_date)}
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Created: {formatDate(assignment.created_at)}
            </span>
          </div>
        </div>

        {/* Content Preview */}
        {assignment.content && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Assignment Content</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {assignment.content}
            </p>
          </div>
        )}

        {/* Distribution Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Send className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{assignment.total_distributed}</p>
            <p className="text-xs text-muted-foreground">Distributed</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">{sentCount + pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>
        </div>

        {/* Couples List - Admin Only */}
        {isAdmin && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Distributed To ({statuses.length})
              </h4>
            </div>

            {loadingStatuses ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : statuses.length === 0 ? (
              <EmptyState
                title="Not distributed yet"
                description="This assignment hasn't been sent to any couples."
                className="py-4"
              />
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/couples/${status.couple.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        size="sm"
                        fallback={`${status.couple.husband_first_name[0]}${status.couple.wife_first_name[0]}`}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {status.couple.husband_first_name} & {status.couple.wife_first_name}{' '}
                          {status.couple.husband_last_name}
                        </p>
                        {status.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Completed {formatDate(status.completed_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={status.status as StatusType} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && (onEdit || onDistribute) && (
        <ModalFooter>
          {onDistribute && (
            <Button
              variant="outline"
              onClick={() => onDistribute(assignment)}
            >
              <Send className="h-4 w-4 mr-2" />
              Distribute
            </Button>
          )}
          {onEdit && (
            <Button onClick={() => onEdit(assignment)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </ModalFooter>
      )}
    </Modal>
  );
}
