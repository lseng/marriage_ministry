import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { MetricCard } from './MetricCard';
import { EmptyState } from '../ui/empty-state';
import { Avatar } from '../ui/avatar';
import { StatusBadge, StatusType } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, ClipboardList, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from '../../lib/date';
import type { Couple } from '../../types/database';

interface PendingReview {
  id: string;
  couple: Couple;
  assignmentTitle: string;
  submittedAt: string;
}

interface UpcomingForCouple {
  assignmentId: string;
  title: string;
  weekNumber: number;
  couplesCount: number;
}

interface CoachDashboardData {
  assignedCouples: Couple[];
  pendingReviews: PendingReview[];
  upcomingForCouples: UpcomingForCouple[];
}

export function CoachDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<CoachDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get coach ID from user
        const { data: coach } = await supabase
          .from('coaches')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!coach) {
          setLoading(false);
          return;
        }

        // Fetch assigned couples
        const { data: couples } = await supabase
          .from('couples')
          .select('*')
          .eq('coach_id', coach.id)
          .order('enrollment_date', { ascending: false });

        const couplesList = couples || [];

        // Fetch pending reviews (submissions that haven't been reviewed yet)
        const coupleIds = couplesList.map(c => c.id);
        const pendingReviews: PendingReview[] = [];

        if (coupleIds.length > 0) {
          const { data: pendingSubmissions } = await supabase
            .from('assignment_responses')
            .select('id, submitted_at, couple_id, assignment_id')
            .is('reviewed_at', null)
            .in('couple_id', coupleIds)
            .order('submitted_at', { ascending: false })
            .limit(10);

          if (pendingSubmissions) {
            for (const sub of pendingSubmissions) {
              const couple = couplesList.find(c => c.id === sub.couple_id);
              if (!couple) continue;

              const { data: assignment } = await supabase
                .from('assignments')
                .select('title')
                .eq('id', sub.assignment_id)
                .single();

              pendingReviews.push({
                id: sub.id,
                couple,
                assignmentTitle: assignment?.title || '',
                submittedAt: sub.submitted_at,
              });
            }
          }
        }

        // Fetch upcoming assignments for these couples
        const upcomingForCouples: UpcomingForCouple[] = [];

        if (coupleIds.length > 0) {
          const { data: upcomingStatuses } = await supabase
            .from('assignment_statuses')
            .select('assignment_id, couple_id')
            .eq('status', 'pending')
            .in('couple_id', coupleIds);

          // Group by assignment
          const assignmentMap = new Map<string, { couplesCount: number }>();
          for (const status of upcomingStatuses || []) {
            const existing = assignmentMap.get(status.assignment_id);
            if (existing) {
              existing.couplesCount++;
            } else {
              assignmentMap.set(status.assignment_id, { couplesCount: 1 });
            }
          }

          // Fetch assignment details
          for (const [assignmentId, data] of assignmentMap.entries()) {
            const { data: assignment } = await supabase
              .from('assignments')
              .select('title, week_number')
              .eq('id', assignmentId)
              .single();

            if (assignment) {
              upcomingForCouples.push({
                assignmentId,
                title: assignment.title,
                weekNumber: assignment.week_number,
                couplesCount: data.couplesCount,
              });
            }
          }
        }

        setData({
          assignedCouples: couplesList,
          pendingReviews,
          upcomingForCouples,
        });
      } catch (error) {
        console.error('Failed to fetch coach dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Assigned Couples"
          value={data?.assignedCouples.length ?? 0}
          icon={Heart}
        />
        <MetricCard
          title="Pending Reviews"
          value={data?.pendingReviews.length ?? 0}
          icon={ClipboardList}
        />
        <MetricCard
          title="Upcoming Assignments"
          value={data?.upcomingForCouples.length ?? 0}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Couples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Couples
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.assignedCouples.length ?? 0) === 0 ? (
              <EmptyState
                title="No couples assigned"
                description="You don't have any couples assigned yet"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {data?.assignedCouples.slice(0, 5).map((couple) => (
                  <div
                    key={couple.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => navigate(`/couples/${couple.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        size="sm"
                        fallback={`${couple.husband_first_name[0]}${couple.wife_first_name[0]}`}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {couple.husband_first_name} & {couple.wife_first_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {couple.email}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={couple.status as StatusType} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.pendingReviews.length ?? 0) === 0 ? (
              <EmptyState
                title="No pending reviews"
                description="All homework submissions have been reviewed"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {data?.pendingReviews.slice(0, 5).map((review) => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {review.couple.husband_first_name} & {review.couple.wife_first_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {review.assignmentTitle}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(review.submittedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
