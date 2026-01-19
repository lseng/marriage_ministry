import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DashboardMetrics {
  totalCoaches: number;
  activeCouples: number;
  pendingAssignments: number;
  completedThisWeek: number;
}

export interface RecentActivity {
  id: string;
  type: 'new_couple' | 'submission' | 'assignment' | 'coach_assigned';
  title: string;
  description: string;
  timestamp: string;
  /** Entity ID for navigation - couple ID for new_couple, submission ID for submission, etc. */
  entityId?: string;
  /** Secondary entity ID - e.g., couple ID for submissions */
  coupleId?: string;
  /** Assignment ID for submission activities */
  assignmentId?: string;
  /** Coach ID for coach_assigned activities */
  coachId?: string;
}

export interface UpcomingAssignment {
  id: string;
  title: string;
  weekNumber: number;
  dueDate: string | null;
  pendingCount: number;
}

interface UseDashboardMetricsResult {
  metrics: DashboardMetrics | null;
  recentActivity: RecentActivity[];
  upcomingAssignments: UpcomingAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardMetrics(): UseDashboardMetricsResult {
  const { role } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<UpcomingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch counts in parallel
      const [coachesResult, couplesResult, pendingResult, completedResult] = await Promise.all([
        supabase.from('coaches').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('couples').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('assignment_statuses').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('assignment_statuses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('completed_at', getStartOfWeek()),
      ]);

      setMetrics({
        totalCoaches: coachesResult.count ?? 0,
        activeCouples: couplesResult.count ?? 0,
        pendingAssignments: pendingResult.count ?? 0,
        completedThisWeek: completedResult.count ?? 0,
      });

      // Fetch recent activity - combine multiple sources
      const activities: RecentActivity[] = [];

      // Get recently enrolled couples
      const { data: recentCouples } = await supabase
        .from('couples')
        .select('id, husband_first_name, wife_first_name, enrollment_date')
        .order('enrollment_date', { ascending: false })
        .limit(3);

      if (recentCouples) {
        for (const couple of recentCouples) {
          activities.push({
            id: `couple-${couple.id}`,
            type: 'new_couple',
            title: 'New couple enrolled',
            description: `${couple.husband_first_name} & ${couple.wife_first_name}`,
            timestamp: couple.enrollment_date,
            entityId: couple.id,
            coupleId: couple.id,
          });
        }
      }

      // Get recent submissions
      const { data: recentSubmissions } = await supabase
        .from('assignment_responses')
        .select('id, submitted_at, couple_id, assignment_id')
        .order('submitted_at', { ascending: false })
        .limit(3);

      if (recentSubmissions) {
        for (const submission of recentSubmissions) {
          // Fetch couple info
          const { data: couple } = await supabase
            .from('couples')
            .select('husband_first_name, wife_first_name')
            .eq('id', submission.couple_id)
            .single();

          // Fetch assignment info
          const { data: assignment } = await supabase
            .from('assignments')
            .select('title')
            .eq('id', submission.assignment_id)
            .single();

          activities.push({
            id: `submission-${submission.id}`,
            type: 'submission',
            title: 'Homework submitted',
            description: `${couple?.husband_first_name ?? ''} & ${couple?.wife_first_name ?? ''} - ${assignment?.title ?? ''}`,
            timestamp: submission.submitted_at,
            entityId: submission.id,
            coupleId: submission.couple_id,
            assignmentId: submission.assignment_id,
          });
        }
      }

      // Sort by timestamp and take latest 5
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 5));

      // Fetch upcoming assignments
      const { data: upcomingData } = await supabase
        .from('assignments')
        .select('id, title, week_number, due_date')
        .order('week_number', { ascending: true })
        .limit(5);

      if (upcomingData) {
        const assignmentsWithCounts = await Promise.all(
          upcomingData.map(async (assignment) => {
            const { count } = await supabase
              .from('assignment_statuses')
              .select('id', { count: 'exact', head: true })
              .eq('assignment_id', assignment.id)
              .eq('status', 'pending');

            return {
              id: assignment.id,
              title: assignment.title,
              weekNumber: assignment.week_number,
              dueDate: assignment.due_date,
              pendingCount: count ?? 0,
            };
          })
        );
        setUpcomingAssignments(assignmentsWithCounts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [role]);

  return {
    metrics,
    recentActivity,
    upcomingAssignments,
    loading,
    error,
    refresh: fetchMetrics,
  };
}

function getStartOfWeek(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}
