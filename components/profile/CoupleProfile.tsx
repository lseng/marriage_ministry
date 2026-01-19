import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCouple } from '../../hooks/useCouples';
import { Card } from '../ui/card';
import { StatusType } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { LoadingSpinner } from '../ui/loading-spinner';
import { EmptyState } from '../ui/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ProfileHeader } from './ProfileHeader';
import { AssignmentHistoryList } from './AssignmentHistoryList';
import { Heart, Mail, Phone, Calendar, User } from 'lucide-react';
import { formatDate } from '../../lib/date';

type AssignmentsFilter = 'all' | 'completed' | 'pending';

export function CoupleProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { couple, loading, error } = useCouple(id || null);
  const [activeTab, setActiveTab] = useState('overview');
  const [assignmentsFilter, setAssignmentsFilter] = useState<AssignmentsFilter>('all');

  const handleStatClick = (filter: AssignmentsFilter) => {
    setAssignmentsFilter(filter);
    setActiveTab('assignments');
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
          title="Error loading couple"
          description={error}
          action={{
            label: 'Go back',
            onClick: () => navigate('/couples'),
          }}
        />
      </div>
    );
  }

  if (!couple) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={Heart}
          title="Couple not found"
          description="The couple you're looking for doesn't exist or has been removed."
          action={{
            label: 'Back to Couples',
            onClick: () => navigate('/couples'),
          }}
        />
      </div>
    );
  }

  const completedAssignments = couple.assignmentHistory.filter((a) => a.status === 'completed');
  const pendingAssignments = couple.assignmentHistory.filter(
    (a) => a.status === 'pending' || a.status === 'sent'
  );

  // Filter assignments based on selected filter
  const filteredAssignments = assignmentsFilter === 'all'
    ? couple.assignmentHistory
    : assignmentsFilter === 'completed'
    ? completedAssignments
    : pendingAssignments;

  return (
    <div className="container mx-auto p-6">
      <ProfileHeader
        name={`${couple.husband_first_name} & ${couple.wife_first_name} ${couple.husband_last_name}`}
        email={couple.email}
        phone={couple.phone || undefined}
        status={couple.status as StatusType}
        backTo="/couples"
        backLabel="Back to Couples"
      />

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments ({filteredAssignments.length})
            {assignmentsFilter !== 'all' && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({assignmentsFilter})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{couple.email}</span>
                </div>
                {couple.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{couple.phone}</span>
                  </div>
                )}
                {couple.wedding_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>Wedding: {formatDate(couple.wedding_date)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Enrolled: {formatDate(couple.enrollment_date)}</span>
                </div>
              </div>
            </Card>

            {/* Assigned Coach */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Assigned Coach</h3>
              {couple.coach ? (
                <div
                  className="flex items-center gap-4 p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => navigate(`/coaches/${couple.coach!.id}`)}
                >
                  <Avatar
                    size="lg"
                    fallback={`${couple.coach.first_name} ${couple.coach.last_name}`}
                  />
                  <div>
                    <h4 className="font-medium">
                      {couple.coach.first_name} {couple.coach.last_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">{couple.coach.email}</p>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={User}
                  title="No coach assigned"
                  description="A coach hasn't been assigned to this couple yet."
                />
              )}
            </Card>

            {/* Progress Statistics */}
            <Card className="p-6 md:col-span-2">
              <h3 className="font-semibold text-lg mb-4">Progress</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                  className="text-center p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleStatClick('all')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatClick('all');
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="View all assignments"
                >
                  <p className="text-3xl font-bold text-primary">{couple.assignmentHistory.length}</p>
                  <p className="text-sm text-muted-foreground">Total Assignments</p>
                </div>
                <div
                  className="text-center p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleStatClick('completed')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatClick('completed');
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="View completed assignments"
                >
                  <p className="text-3xl font-bold text-green-600">{completedAssignments.length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div
                  className="text-center p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleStatClick('pending')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatClick('pending');
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="View pending assignments"
                >
                  <p className="text-3xl font-bold text-yellow-600">{pendingAssignments.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div
                  className="text-center p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleStatClick('all')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatClick('all');
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="View progress details"
                >
                  <p className="text-3xl font-bold text-blue-600">
                    {couple.assignmentHistory.length > 0
                      ? Math.round((completedAssignments.length / couple.assignmentHistory.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          {/* Filter buttons */}
          {couple.assignmentHistory.length > 0 && (
            <div className="flex gap-2 mb-4">
              {(['all', 'completed', 'pending'] as AssignmentsFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAssignmentsFilter(filter)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    assignmentsFilter === filter
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'completed' ? 'Completed' : 'Pending'}
                  {' '}
                  ({filter === 'all' ? couple.assignmentHistory.length : filter === 'completed' ? completedAssignments.length : pendingAssignments.length})
                </button>
              ))}
            </div>
          )}

          <AssignmentHistoryList
            assignments={filteredAssignments}
            emptyMessage={assignmentsFilter === 'all'
              ? "No assignments for this couple"
              : `No ${assignmentsFilter} assignments`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
