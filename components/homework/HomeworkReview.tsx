import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { EmptyState } from '../ui/empty-state';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Modal, ModalFooter } from '../ui/modal';
import { usePendingReviews } from '../../hooks/useHomework';
import type { HomeworkResponseWithDetails, FormField, FormResponses } from '../../types/forms';
import { formatDate, formatDateTime, formatDistanceToNow } from '../../lib/date';
import { CheckCircle, Clock, FileText, User, Calendar, MessageSquare } from 'lucide-react';

interface HomeworkReviewProps {
  coachId?: string;
}

export function HomeworkReview({ coachId }: HomeworkReviewProps) {
  const { reviews, loading, error, reviewHomework, refresh } = usePendingReviews(coachId);
  const [selectedReview, setSelectedReview] = useState<HomeworkResponseWithDetails | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReview = async () => {
    if (!selectedReview) return;

    try {
      setSubmitting(true);
      await reviewHomework(selectedReview.id, reviewNotes);
      setSelectedReview(null);
      setReviewNotes('');
    } catch (err) {
      console.error('Failed to review homework:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCoupleDisplayName = (couple: HomeworkResponseWithDetails['couple']) => {
    return `${couple.husband_first_name} & ${couple.wife_first_name} ${couple.husband_last_name}`;
  };

  const renderResponseValue = (field: FormField, value: FormResponses[string]) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">No response</span>;
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : <span className="text-muted-foreground italic">No selection</span>;
    }

    if (field.type === 'scale') {
      const min = field.min ?? 1;
      const max = field.max ?? 10;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
          <span className="text-sm text-muted-foreground">
            out of {min}-{max}
          </span>
        </div>
      );
    }

    return <span className="whitespace-pre-wrap">{String(value)}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading reviews"
        description={error}
        action={{
          label: 'Try again',
          onClick: refresh,
        }}
      />
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="p-12">
        <EmptyState
          icon={CheckCircle}
          title="All caught up!"
          description="There are no pending homework submissions to review."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          {reviews.length} submission{reviews.length !== 1 ? 's' : ''} pending review
        </p>
        <Button variant="outline" size="sm" onClick={refresh}>
          Refresh
        </Button>
      </div>

      {reviews.map((review) => (
        <Card key={review.id} className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="warning">Pending Review</Badge>
                <span className="text-sm text-muted-foreground">
                  Week {review.assignment.week_number}
                </span>
              </div>

              <h3 className="font-semibold text-lg">{review.assignment.title}</h3>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {getCoupleDisplayName(review.couple)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Submitted {formatDistanceToNow(review.submitted_at!)}
                </span>
                {review.assignment.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Due: {formatDate(review.assignment.due_date)}
                  </span>
                )}
              </div>
            </div>

            <Button onClick={() => setSelectedReview(review)}>
              <FileText className="h-4 w-4 mr-2" />
              Review
            </Button>
          </div>
        </Card>
      ))}

      {/* Review Modal */}
      {selectedReview && (
        <Modal
          isOpen={!!selectedReview}
          onClose={() => {
            setSelectedReview(null);
            setReviewNotes('');
          }}
          title="Review Homework"
          description={`${getCoupleDisplayName(selectedReview.couple)} - ${selectedReview.assignment.title}`}
          size="lg"
        >
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Assignment Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Week {selectedReview.assignment.week_number}</Badge>
                {selectedReview.assignment.due_date && (
                  <span className="text-sm text-muted-foreground">
                    Due: {formatDate(selectedReview.assignment.due_date)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Submitted: {formatDateTime(selectedReview.submitted_at!)}
              </p>
            </div>

            {/* Responses */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Responses
              </h4>

              {selectedReview.assignment.form_template ? (
                selectedReview.assignment.form_template.fields.map((field) => (
                  <div key={field.id} className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    <div className="text-foreground">
                      {renderResponseValue(field, selectedReview.responses[field.id])}
                    </div>
                  </div>
                ))
              ) : (
                <div className="border rounded-lg p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Response</p>
                  <p className="whitespace-pre-wrap">
                    {String(selectedReview.responses.response || 'No response provided')}
                  </p>
                </div>
              )}
            </div>

            {/* Review Notes */}
            <div className="border-t pt-6">
              <Textarea
                label="Review Notes (optional)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any feedback or notes for this couple..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReview(null);
                setReviewNotes('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={submitting}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {submitting ? 'Marking...' : 'Mark as Reviewed'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

// Individual review card for embedding in other views
interface ReviewCardProps {
  review: HomeworkResponseWithDetails;
  onReview: (id: string, notes?: string) => Promise<void>;
}

export function ReviewCard({ review, onReview }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [notes, setNotes] = useState('');

  const handleReview = async () => {
    setReviewing(true);
    try {
      await onReview(review.id, notes);
    } finally {
      setReviewing(false);
    }
  };

  const getCoupleDisplayName = (couple: HomeworkResponseWithDetails['couple']) => {
    return `${couple.husband_first_name} & ${couple.wife_first_name} ${couple.husband_last_name}`;
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="warning" className="text-xs">Pending</Badge>
            <span className="text-xs text-muted-foreground">
              Week {review.assignment.week_number}
            </span>
          </div>
          <h4 className="font-medium">{review.assignment.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {getCoupleDisplayName(review.couple)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Submitted {formatDistanceToNow(review.submitted_at!)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide' : 'View'}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* Show responses */}
          <div className="space-y-3">
            {review.assignment.form_template ? (
              review.assignment.form_template.fields.map((field) => (
                <div key={field.id} className="bg-muted/50 rounded p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {field.label}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {Array.isArray(review.responses[field.id])
                      ? (review.responses[field.id] as string[]).join(', ')
                      : String(review.responses[field.id] || '-')}
                  </p>
                </div>
              ))
            ) : (
              <div className="bg-muted/50 rounded p-3">
                <p className="text-sm whitespace-pre-wrap">
                  {String(review.responses.response || 'No response')}
                </p>
              </div>
            )}
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional feedback..."
            className="min-h-[80px]"
          />

          <Button
            size="sm"
            onClick={handleReview}
            disabled={reviewing}
            className="w-full"
          >
            {reviewing ? 'Marking...' : 'Mark as Reviewed'}
          </Button>
        </div>
      )}
    </Card>
  );
}
