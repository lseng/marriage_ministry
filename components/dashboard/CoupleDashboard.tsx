import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { StatusBadge, StatusType } from '../ui/badge';
import { Modal } from '../ui/modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, Clock, CheckCircle, FileText, User, Eye } from 'lucide-react';
import { formatDate } from '../../lib/date';

interface CoupleAssignment {
  id: string;
  assignmentId: string;
  title: string;
  description: string | null;
  weekNumber: number;
  dueDate: string | null;
  status: 'pending' | 'sent' | 'completed' | 'overdue';
  submittedAt: string | null;
}

interface CoupleDashboardData {
  currentAssignment: CoupleAssignment | null;
  completedAssignments: CoupleAssignment[];
  coachName: string | null;
  coachId: string | null;
}

export function CoupleDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<CoupleDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<CoupleAssignment | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get couple ID from user's profile email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        const { data: couple } = await supabase
          .from('couples')
          .select('id, coach_id')
          .eq('email', profile.email)
          .single();

        if (!couple) {
          setLoading(false);
          return;
        }

        // Get coach name if assigned
        let coachName = null;
        if (couple.coach_id) {
          const { data: coach } = await supabase
            .from('coaches')
            .select('first_name, last_name')
            .eq('id', couple.coach_id)
            .single();

          if (coach) {
            coachName = `${coach.first_name} ${coach.last_name}`;
          }
        }

        // Fetch assignment statuses for this couple
        const { data: statuses } = await supabase
          .from('assignment_statuses')
          .select('id, status, assignment_id, completed_at')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false });

        const assignments: CoupleAssignment[] = [];

        for (const s of statuses || []) {
          const { data: assignment } = await supabase
            .from('assignments')
            .select('title, description, week_number, due_date')
            .eq('id', s.assignment_id)
            .single();

          if (assignment) {
            assignments.push({
              id: s.id,
              assignmentId: s.assignment_id,
              title: assignment.title,
              description: assignment.description,
              weekNumber: assignment.week_number,
              dueDate: assignment.due_date,
              status: s.status as 'pending' | 'sent' | 'completed' | 'overdue',
              submittedAt: s.completed_at,
            });
          }
        }

        // Split into current and completed
        const pending = assignments.filter(a => a.status !== 'completed');
        const completed = assignments.filter(a => a.status === 'completed');

        setData({
          currentAssignment: pending[0] || null,
          completedAssignments: completed,
          coachName,
          coachId: couple.coach_id,
        });
      } catch (error) {
        console.error('Failed to fetch couple dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coach Info */}
      {data?.coachName && (
        <Card
          className="bg-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-all"
          onClick={() => {
            // Note: Couples typically can't view coach profiles, but we make the card clickable
            // for future enhancement. For now, it shows a visual feedback.
          }}
        >
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Coach</p>
                <p className="font-semibold">{data.coachName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Assignment */}
      <Card
        className={data?.currentAssignment ? 'cursor-pointer hover:shadow-md transition-all' : ''}
        onClick={() => {
          if (data?.currentAssignment) {
            navigate('/homework');
          }
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Current Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.currentAssignment ? (
            <EmptyState
              icon={CheckCircle}
              title="All caught up!"
              description="You don't have any pending assignments. Great work!"
              className="py-8"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {data.currentAssignment.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Week {data.currentAssignment.weekNumber}
                  </p>
                </div>
                <StatusBadge status={data.currentAssignment.status as StatusType} />
              </div>

              {data.currentAssignment.description && (
                <p className="text-sm text-muted-foreground">
                  {data.currentAssignment.description}
                </p>
              )}

              {data.currentAssignment.dueDate && (
                <p className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Due: {formatDate(data.currentAssignment.dueDate)}
                </p>
              )}

              <Button
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/homework');
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Start Assignment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.completedAssignments.length ?? 0) === 0 ? (
            <EmptyState
              title="No completed assignments yet"
              description="Complete your first assignment to see your progress"
              className="py-8"
            />
          ) : (
            <div className="space-y-4">
              {data?.completedAssignments.map((assignment, index) => (
                <div
                  key={assignment.id}
                  className="flex items-start gap-4 relative cursor-pointer hover:bg-muted/50 rounded-md p-2 -ml-2 transition-colors"
                  onClick={() => setSelectedAssignment(assignment)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedAssignment(assignment);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  {/* Timeline line */}
                  {index < (data.completedAssignments.length - 1) && (
                    <div className="absolute left-[11px] top-8 w-0.5 h-full bg-muted" />
                  )}

                  {/* Timeline dot */}
                  <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Week {assignment.weekNumber}
                        {assignment.submittedAt && ` • Completed ${formatDate(assignment.submittedAt)}`}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Assignment Detail Modal */}
      {selectedAssignment && (
        <Modal
          isOpen={!!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          title={selectedAssignment.title}
          description={`Week ${selectedAssignment.weekNumber} • Completed`}
        >
          <div className="space-y-4">
            {selectedAssignment.description && (
              <p className="text-muted-foreground">{selectedAssignment.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Completed {selectedAssignment.submittedAt && formatDate(selectedAssignment.submittedAt)}
              </span>
              {selectedAssignment.dueDate && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Due date: {formatDate(selectedAssignment.dueDate)}
                </span>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                You've successfully completed this assignment. Great work!
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
