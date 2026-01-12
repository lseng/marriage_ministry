import { HomeworkReview } from './HomeworkReview';
import { useAuth } from '../../contexts/AuthContext';

export function ReviewsPage() {
  const { role, profile } = useAuth();

  // For coaches, filter to their assigned couples
  // For admins, show all pending reviews
  const coachId = role === 'coach' ? profile?.id : undefined;

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Homework Reviews</h1>
        <p className="text-muted-foreground mt-2">
          Review submitted homework from couples
        </p>
      </header>

      <HomeworkReview coachId={coachId} />
    </div>
  );
}
