import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCoach } from '../../hooks/useCoaches';
import { Card } from '../ui/card';
import { StatusBadge, StatusType } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { LoadingSpinner } from '../ui/loading-spinner';
import { EmptyState } from '../ui/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ProfileHeader } from './ProfileHeader';
import { Users, Heart, Mail, Phone, Calendar } from 'lucide-react';
import { formatDate } from '../../lib/date';

type CouplesFilter = 'all' | 'active' | 'completed';

export function CoachProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coach, couples, loading, error } = useCoach(id || null);
  const [activeTab, setActiveTab] = useState('overview');
  const [couplesFilter, setCouplesFilter] = useState<CouplesFilter>('all');

  const handleStatClick = (filter: CouplesFilter) => {
    setCouplesFilter(filter);
    setActiveTab('couples');
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
          title="Error loading coach"
          description={error}
          action={{
            label: 'Go back',
            onClick: () => navigate('/coaches'),
          }}
        />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={Users}
          title="Coach not found"
          description="The coach you're looking for doesn't exist or has been removed."
          action={{
            label: 'Back to Coaches',
            onClick: () => navigate('/coaches'),
          }}
        />
      </div>
    );
  }

  const activeCouples = couples.filter((c) => c.status === 'active');
  const completedCouples = couples.filter((c) => c.status === 'completed');

  // Filter couples based on selected filter
  const filteredCouples = couplesFilter === 'all'
    ? couples
    : couplesFilter === 'active'
    ? activeCouples
    : completedCouples;

  return (
    <div className="container mx-auto p-6">
      <ProfileHeader
        name={`${coach.first_name} ${coach.last_name}`}
        email={coach.email}
        phone={coach.phone || undefined}
        status={coach.status as StatusType}
        backTo="/coaches"
        backLabel="Back to Coaches"
      />

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="couples">
            Assigned Couples ({filteredCouples.length})
            {couplesFilter !== 'all' && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({couplesFilter})
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
                  <span>{coach.email}</span>
                </div>
                {coach.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{coach.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {formatDate(coach.created_at)}</span>
                </div>
              </div>
            </Card>

            {/* Statistics */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
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
                  aria-label="View all couples"
                >
                  <p className="text-3xl font-bold text-primary">{couples.length}</p>
                  <p className="text-sm text-muted-foreground">Total Couples</p>
                </div>
                <div
                  className="text-center p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleStatClick('active')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatClick('active');
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="View active couples"
                >
                  <p className="text-3xl font-bold text-green-600">{activeCouples.length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
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
                  aria-label="View completed couples"
                >
                  <p className="text-3xl font-bold text-blue-600">{completedCouples.length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <StatusBadge status={coach.status as StatusType} />
                  <p className="text-sm text-muted-foreground mt-1">Status</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="couples">
          {/* Filter buttons */}
          {couples.length > 0 && (
            <div className="flex gap-2 mb-4">
              {(['all', 'active', 'completed'] as CouplesFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCouplesFilter(filter)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    couplesFilter === filter
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Completed'}
                  {' '}
                  ({filter === 'all' ? couples.length : filter === 'active' ? activeCouples.length : completedCouples.length})
                </button>
              ))}
            </div>
          )}

          {filteredCouples.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Heart}
                title={couplesFilter === 'all' ? "No couples assigned" : `No ${couplesFilter} couples`}
                description={couplesFilter === 'all'
                  ? "This coach doesn't have any couples assigned yet."
                  : `This coach doesn't have any ${couplesFilter} couples.`}
              />
            </Card>
          ) : (
            <Card>
              <div className="divide-y">
                {filteredCouples.map((couple) => (
                  <div
                    key={couple.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/couples/${couple.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar
                        size="md"
                        fallback={`${couple.husband_first_name[0]}${couple.wife_first_name[0]}`}
                      />
                      <div>
                        <h4 className="font-medium">
                          {couple.husband_first_name} & {couple.wife_first_name} {couple.husband_last_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">{couple.email}</p>
                      </div>
                    </div>
                    <StatusBadge status={couple.status as StatusType} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
