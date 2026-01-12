import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Modal } from '../ui/modal';
import { HomeworkForm } from './HomeworkForm';
import { useCoupleAssignments } from '../../hooks/useHomework';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDistanceToNow } from '../../lib/date';
import { ClipboardList, Clock, CheckCircle, FileEdit, BookOpen } from 'lucide-react';
import type { FormTemplate } from '../../types/forms';
import type { CoupleAssignment } from '../../services/homework';
import { getFormTemplate } from '../../services/homework';

export function HomeworkPage() {
  const { profile } = useAuth();
  const coupleId = profile?.id || null; // In a real app, we'd get the couple ID from the profile relationship
  const { assignments, loading, error, refresh } = useCoupleAssignments(coupleId);
  const [selectedAssignment, setSelectedAssignment] = useState<CoupleAssignment | null>(null);
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const handleOpenAssignment = async (assignment: CoupleAssignment) => {
    setSelectedAssignment(assignment);

    // Load form template if exists
    if (assignment.assignment.form_template_id) {
      setLoadingTemplate(true);
      try {
        const template = await getFormTemplate(assignment.assignment.form_template_id);
        setFormTemplate(template);
      } catch {
        setFormTemplate(null);
      } finally {
        setLoadingTemplate(false);
      }
    } else {
      setFormTemplate(null);
    }
  };

  const handleCloseForm = () => {
    setSelectedAssignment(null);
    setFormTemplate(null);
    refresh();
  };

  const getStatusBadge = (status: string, homework_response: CoupleAssignment['homework_response']) => {
    if (homework_response?.submitted_at && !homework_response.is_draft) {
      if (homework_response.reviewed_at) {
        return <Badge variant="success">Reviewed</Badge>;
      }
      return <Badge variant="success">Submitted</Badge>;
    }
    if (homework_response?.is_draft) {
      return <Badge variant="warning">Draft</Badge>;
    }
    if (status === 'sent') {
      return <Badge variant="default">Pending</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          title="Error loading assignments"
          description={error}
          action={{
            label: 'Try again',
            onClick: refresh,
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Homework</h1>
        <p className="text-muted-foreground mt-2">
          View and complete your assigned homework
        </p>
      </header>

      {assignments.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="You don't have any homework assignments at the moment. Check back later!"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <Badge variant="outline" className="shrink-0">
                      Week {assignment.assignment.week_number}
                    </Badge>
                    {getStatusBadge(assignment.status, assignment.homework_response)}
                  </div>

                  <h3 className="font-semibold text-lg">{assignment.assignment.title}</h3>

                  {assignment.assignment.description && (
                    <p className="text-muted-foreground mt-1">{assignment.assignment.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    {assignment.sent_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Received {formatDistanceToNow(assignment.sent_at)}
                      </span>
                    )}
                    {assignment.assignment.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Due: {formatDate(assignment.assignment.due_date)}
                      </span>
                    )}
                    {assignment.homework_response?.submitted_at && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Submitted {formatDistanceToNow(assignment.homework_response.submitted_at)}
                      </span>
                    )}
                  </div>

                  {assignment.homework_response?.review_notes && (
                    <div className="mt-4 bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Coach Feedback:</p>
                      <p className="text-sm text-muted-foreground">{assignment.homework_response.review_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {assignment.homework_response?.submitted_at && !assignment.homework_response.is_draft ? (
                    <Button variant="outline" onClick={() => handleOpenAssignment(assignment)}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  ) : (
                    <Button onClick={() => handleOpenAssignment(assignment)}>
                      <FileEdit className="h-4 w-4 mr-2" />
                      {assignment.homework_response?.is_draft ? 'Continue' : 'Start'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Homework Form Modal */}
      {selectedAssignment && (
        <Modal
          isOpen={!!selectedAssignment}
          onClose={handleCloseForm}
          title={selectedAssignment.assignment.title}
          description={`Week ${selectedAssignment.assignment.week_number}`}
          size="lg"
        >
          {loadingTemplate ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <HomeworkForm
              assignmentStatusId={selectedAssignment.id}
              coupleId={coupleId || ''}
              template={formTemplate}
              assignmentContent={selectedAssignment.assignment.content}
              onComplete={handleCloseForm}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
