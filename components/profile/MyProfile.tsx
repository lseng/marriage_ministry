import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrentProfile } from '../../hooks/useProfile';
import { Card } from '../ui/card';
import { StatusBadge, StatusType } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { LoadingSpinner } from '../ui/loading-spinner';
import { EmptyState } from '../ui/empty-state';
import { ProfileHeader } from './ProfileHeader';
import { ProfileEditModal } from './ProfileEditModal';
import { NotificationPreferences } from './NotificationPreferences';
import { Mail, Calendar, Users, Heart, Shield, User, Bell } from 'lucide-react';
import { formatDate } from '../../lib/date';

export function MyProfile() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { profile, loading, error, refresh } = useCurrentProfile();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
          title="Error loading profile"
          description={error}
          action={{
            label: 'Try again',
            onClick: refresh,
          }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={User}
          title="Profile not found"
          description="Unable to load your profile information."
          action={{
            label: 'Go to Dashboard',
            onClick: () => navigate('/'),
          }}
        />
      </div>
    );
  }

  const isAdmin = role === 'admin';
  const isCoach = role === 'coach';
  const isCouple = role === 'couple';

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin':
        return 'active';
      case 'coach':
        return 'sent';
      case 'couple':
        return 'completed';
      default:
        return 'pending';
    }
  };

  const handleEditSuccess = () => {
    refresh();
    setIsEditModalOpen(false);
  };

  return (
    <div className="container mx-auto p-6">
      <ProfileHeader
        name={profile.profile.email.split('@')[0]}
        subtitle={`${role?.charAt(0).toUpperCase()}${role?.slice(1)} Account`}
        email={profile.profile.email}
        status={getRoleBadgeColor() as StatusType}
        backTo="/"
        backLabel="Back to Dashboard"
        showEdit={isAdmin}
        onEdit={() => setIsEditModalOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Information */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile.profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Role: {role?.charAt(0).toUpperCase()}{role?.slice(1)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Member since {formatDate(profile.profile.created_at)}</span>
            </div>
          </div>
        </Card>

        {/* Role-specific information */}
        {isAdmin && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Privileges
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Manage all coaches and couples
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Create and distribute assignments
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Build and manage form templates
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Review all homework submissions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Edit account settings
              </li>
            </ul>
          </Card>
        )}

        {isCoach && profile.roleData.coach && (
          <>
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Coach Profile
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {profile.roleData.coach.first_name} {profile.roleData.coach.last_name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.roleData.coach.email}</span>
                </div>
                {profile.roleData.coach.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{profile.roleData.coach.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge status={profile.roleData.coach.status as StatusType} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Assigned Couples
              </h3>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-4xl font-bold text-primary">
                  {profile.roleData.coach.assignedCouplesCount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.roleData.coach.assignedCouplesCount === 1 ? 'Couple' : 'Couples'} Assigned
                </p>
              </div>
            </Card>
          </>
        )}

        {isCouple && profile.roleData.couple && (
          <>
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Couple Profile
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {profile.roleData.couple.husband_first_name} & {profile.roleData.couple.wife_first_name}{' '}
                    {profile.roleData.couple.husband_last_name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.roleData.couple.email}</span>
                </div>
                {profile.roleData.couple.wedding_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>Wedding: {formatDate(profile.roleData.couple.wedding_date)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Enrolled: {formatDate(profile.roleData.couple.enrollment_date)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge status={profile.roleData.couple.status as StatusType} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Coach
              </h3>
              {profile.roleData.couple.coach ? (
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Avatar
                    size="lg"
                    fallback={`${profile.roleData.couple.coach.first_name} ${profile.roleData.couple.coach.last_name}`}
                  />
                  <div>
                    <h4 className="font-medium">
                      {profile.roleData.couple.coach.first_name} {profile.roleData.couple.coach.last_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">Marriage Coach</p>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={User}
                  title="No coach assigned"
                  description="A coach will be assigned to you soon."
                />
              )}
            </Card>
          </>
        )}
      </div>

      {/* Notification Preferences Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </h2>
        <NotificationPreferences />
      </div>

      {/* Edit Modal - Admin only */}
      {isAdmin && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentEmail={profile.profile.email}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
