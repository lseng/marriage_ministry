import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { MetricCard } from './MetricCard';
import { ViewAllLink } from './ViewAllLink';
import { EmptyState } from '../ui/empty-state';
import { AssignmentDetailModal } from '../assignments/AssignmentDetailModal';
import { useDashboardMetrics, type RecentActivity, type UpcomingAssignment } from '../../hooks/useDashboardMetrics';
import { useAssignments } from '../../hooks/useAssignments';
import { Users, Heart, ClipboardList, CheckCircle, Plus, Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from '../../lib/date';
import type { AssignmentWithStats } from '../../services/assignments';

export function ManagerDashboard() {
  const navigate = useNavigate();
  const { metrics, recentActivity, upcomingAssignments, loading } = useDashboardMetrics();
  const { assignments } = useAssignments();
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithStats | null>(null);

  const handleActivityClick = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'new_couple':
        if (activity.coupleId) {
          navigate(`/couples/${activity.coupleId}`);
        } else {
          navigate('/couples');
        }
        break;
      case 'submission':
        navigate('/reviews');
        break;
      case 'assignment':
        if (activity.assignmentId) {
          const assignment = assignments.find(a => a.id === activity.assignmentId);
          if (assignment) {
            setSelectedAssignment(assignment);
          } else {
            navigate('/assignments');
          }
        } else {
          navigate('/assignments');
        }
        break;
      case 'coach_assigned':
        if (activity.coachId) {
          navigate(`/coaches/${activity.coachId}`);
        } else {
          navigate('/coaches');
        }
        break;
      default:
        break;
    }
  };

  const handleUpcomingAssignmentClick = (upcomingAssignment: UpcomingAssignment) => {
    const assignment = assignments.find(a => a.id === upcomingAssignment.id);
    if (assignment) {
      setSelectedAssignment(assignment);
    } else {
      navigate('/assignments');
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Coaches"
          value={metrics?.totalCoaches ?? 0}
          icon={Users}
          loading={loading}
          href="/coaches"
        />
        <MetricCard
          title="Active Couples"
          value={metrics?.activeCouples ?? 0}
          icon={Heart}
          loading={loading}
          href="/couples?status=active"
        />
        <MetricCard
          title="Pending Assignments"
          value={metrics?.pendingAssignments ?? 0}
          icon={ClipboardList}
          loading={loading}
          href="/assignments"
        />
        <MetricCard
          title="Completed This Week"
          value={metrics?.completedThisWeek ?? 0}
          icon={CheckCircle}
          loading={loading}
          href="/reviews"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/coaches')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Coach
        </Button>
        <Button variant="outline" onClick={() => navigate('/couples')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Couple
        </Button>
        <Button variant="outline" onClick={() => navigate('/assignments')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Activity and Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <ViewAllLink href="/couples" label="View All" />
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Activity will appear here as your ministry grows"
                className="py-8"
              />
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm p-2 -mx-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleActivityClick(activity)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleActivityClick(activity);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <div className="mt-0.5">
                      <ActivityIcon type={activity.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Assignments
            </CardTitle>
            <ViewAllLink href="/assignments" label="View All" />
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length === 0 ? (
              <EmptyState
                title="No upcoming assignments"
                description="Create your first assignment to get started"
                action={{
                  label: 'Create Assignment',
                  onClick: () => navigate('/assignments'),
                }}
                className="py-8"
              />
            ) : (
              <div className="space-y-4">
                {upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleUpcomingAssignmentClick(assignment)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleUpcomingAssignmentClick(assignment);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <div>
                      <p className="font-medium text-sm">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Week {assignment.weekNumber}
                        {assignment.dueDate && ` • Due ${new Date(assignment.dueDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    {assignment.pendingCount > 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 px-2 py-1 rounded-full">
                        {assignment.pendingCount} pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Detail Modal */}
      <AssignmentDetailModal
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        assignment={selectedAssignment}
        onEdit={(assignment) => {
          setSelectedAssignment(null);
          navigate('/assignments', { state: { editAssignment: assignment } });
        }}
        onDistribute={(assignment) => {
          setSelectedAssignment(null);
          navigate('/assignments', { state: { distributeAssignment: assignment } });
        }}
      />
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconClass = 'h-4 w-4';
  switch (type) {
    case 'new_couple':
      return <Heart className={`${iconClass} text-pink-500`} />;
    case 'submission':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    case 'assignment':
      return <ClipboardList className={`${iconClass} text-blue-500`} />;
    case 'coach_assigned':
      return <Users className={`${iconClass} text-purple-500`} />;
    default:
      return <Activity className={`${iconClass} text-gray-500`} />;
  }
}
