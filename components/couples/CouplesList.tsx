import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { StatusBadge, StatusType } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { EmptyState } from '../ui/empty-state';
import { LoadingSpinner } from '../ui/loading-spinner';
import { CoupleForm, CoupleFormData } from './CoupleForm';
import { InviteUserModal } from '../admin/InviteUserModal';
import { useCouples, useCoachOptions } from '../../hooks/useCouples';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Heart, LayoutGrid, List, MoreVertical, Edit, Trash2, UserPlus, Mail } from 'lucide-react';
import { formatDate } from '../../lib/date';

type ViewMode = 'grid' | 'list';

export function CouplesList() {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { couples, loading, error, createCouple, updateCouple, deleteCouple } = useCouples();
  const { coaches } = useCoachOptions();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [coachFilter, setCoachFilter] = useState<string>(searchParams.get('coach') || '');

  // Sync status filter to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (statusFilter) {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }
    if (coachFilter) {
      params.set('coach', coachFilter);
    } else {
      params.delete('coach');
    }
    setSearchParams(params, { replace: true });
  }, [statusFilter, coachFilter, setSearchParams, searchParams]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingCouple, setEditingCouple] = useState<typeof couples[0] | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filteredCouples = couples.filter((couple) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      couple.husband_first_name.toLowerCase().includes(searchLower) ||
      couple.wife_first_name.toLowerCase().includes(searchLower) ||
      couple.husband_last_name.toLowerCase().includes(searchLower) ||
      couple.email.toLowerCase().includes(searchLower);

    const matchesStatus = !statusFilter || couple.status === statusFilter;
    const matchesCoach =
      !coachFilter ||
      (coachFilter === 'unassigned' ? !couple.coach_id : couple.coach_id === coachFilter);

    return matchesSearch && matchesStatus && matchesCoach;
  });

  const handleSubmit = async (data: CoupleFormData) => {
    if (editingCouple) {
      await updateCouple(editingCouple.id, data);
    } else {
      await createCouple(data);
    }
    setEditingCouple(null);
  };

  const handleEdit = (couple: typeof couples[0]) => {
    setEditingCouple(couple);
    setIsFormOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (couple: typeof couples[0]) => {
    if (window.confirm(`Are you sure you want to delete ${couple.husband_first_name} & ${couple.wife_first_name}?`)) {
      await deleteCouple(couple.id);
    }
    setActiveMenu(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCouple(null);
  };

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'completed', label: 'Completed' },
  ];

  const coachFilterOptions = [
    { value: 'unassigned', label: 'Unassigned' },
    ...coaches.map(c => ({ value: c.id, label: c.name })),
  ];

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
          title="Error loading couples"
          description={error}
          action={{
            label: 'Try again',
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Couples</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage couples in the ministry
          </p>
        </div>
        <div className="flex gap-2">
          {permissions.canManageCouples && (
            <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Invite Couple
            </Button>
          )}
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Couple
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search couples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
            placeholder="All statuses"
            className="w-32"
          />
          <Select
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            options={coachFilterOptions}
            placeholder="All coaches"
            className="w-40"
          />
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredCouples.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Heart}
            title={searchQuery || statusFilter || coachFilter ? 'No couples found' : 'No couples yet'}
            description={
              searchQuery || statusFilter || coachFilter
                ? 'Try adjusting your filters'
                : 'Add your first couple to get started.'
            }
            action={
              !(searchQuery || statusFilter || coachFilter)
                ? {
                    label: 'Add Couple',
                    onClick: () => setIsFormOpen(true),
                  }
                : undefined
            }
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCouples.map((couple) => (
            <Card
              key={couple.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => navigate(`/couples/${couple.id}`)}
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === couple.id ? null : couple.id);
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                {activeMenu === couple.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                      }}
                    />
                    <div className="absolute right-0 top-8 z-20 w-32 rounded-md border bg-popover shadow-md">
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(couple);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(couple);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Avatar
                  size="lg"
                  fallback={`${couple.husband_first_name[0]}${couple.wife_first_name[0]}`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {couple.husband_first_name} & {couple.wife_first_name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {couple.husband_last_name}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground truncate">
                  {couple.email}
                </p>
                {couple.coach && (
                  <p className="text-sm flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    {couple.coach.first_name} {couple.coach.last_name}
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Enrolled {formatDate(couple.enrollment_date)}
                </span>
                <StatusBadge status={couple.status as StatusType} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filteredCouples.map((couple) => (
              <div
                key={couple.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/couples/${couple.id}`)}
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    size="md"
                    fallback={`${couple.husband_first_name[0]}${couple.wife_first_name[0]}`}
                  />
                  <div>
                    <h3 className="font-medium">
                      {couple.husband_first_name} & {couple.wife_first_name} {couple.husband_last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{couple.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {couple.coach && (
                    <span className="text-sm text-muted-foreground hidden md:block">
                      {couple.coach.first_name} {couple.coach.last_name}
                    </span>
                  )}
                  <StatusBadge status={couple.status as StatusType} />
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === couple.id ? null : couple.id);
                      }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {activeMenu === couple.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(null);
                          }}
                        />
                        <div className="absolute right-0 top-8 z-20 w-32 rounded-md border bg-popover shadow-md">
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(couple);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(couple);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Couple Form Modal */}
      <CoupleForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        couple={editingCouple}
      />

      {/* Invite Couple Modal */}
      <InviteUserModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        defaultRole="couple"
      />
    </div>
  );
}
