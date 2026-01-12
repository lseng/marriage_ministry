import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { StatusBadge, StatusType } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { EmptyState } from '../ui/empty-state';
import { LoadingSpinner } from '../ui/loading-spinner';
import { CoachForm, CoachFormData } from './CoachForm';
import { useCoaches } from '../../hooks/useCoaches';
import { Plus, Search, Users, LayoutGrid, List, MoreVertical, Edit, Trash2 } from 'lucide-react';

type ViewMode = 'grid' | 'list';

export function CoachesList() {
  const navigate = useNavigate();
  const { coaches, loading, error, createCoach, updateCoach, deleteCoach } = useCoaches();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<typeof coaches[0] | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filteredCoaches = coaches.filter((coach) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      coach.first_name.toLowerCase().includes(searchLower) ||
      coach.last_name.toLowerCase().includes(searchLower) ||
      coach.email.toLowerCase().includes(searchLower)
    );
  });

  const handleSubmit = async (data: CoachFormData) => {
    if (editingCoach) {
      await updateCoach(editingCoach.id, data);
    } else {
      await createCoach(data);
    }
    setEditingCoach(null);
  };

  const handleEdit = (coach: typeof coaches[0]) => {
    setEditingCoach(coach);
    setIsFormOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (coach: typeof coaches[0]) => {
    if (window.confirm(`Are you sure you want to delete ${coach.first_name} ${coach.last_name}?`)) {
      await deleteCoach(coach.id);
    }
    setActiveMenu(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCoach(null);
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
          title="Error loading coaches"
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
          <h1 className="text-3xl font-bold text-foreground">Coaches</h1>
          <p className="text-muted-foreground mt-2">
            Manage your marriage ministry coaches
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Coach
        </Button>
      </header>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coaches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
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

      {/* Content */}
      {filteredCoaches.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Users}
            title={searchQuery ? 'No coaches found' : 'No coaches yet'}
            description={
              searchQuery
                ? 'Try adjusting your search query'
                : 'Add your first coach to get started.'
            }
            action={
              !searchQuery
                ? {
                    label: 'Add Coach',
                    onClick: () => setIsFormOpen(true),
                  }
                : undefined
            }
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach) => (
            <Card
              key={coach.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => navigate(`/coaches/${coach.id}`)}
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === coach.id ? null : coach.id);
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                {activeMenu === coach.id && (
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
                          handleEdit(coach);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(coach);
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
                  fallback={`${coach.first_name} ${coach.last_name}`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {coach.first_name} {coach.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {coach.email}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {(coach as { assigned_couples_count?: number }).assigned_couples_count || 0} couples assigned
                </span>
                <StatusBadge status={coach.status as StatusType} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filteredCoaches.map((coach) => (
              <div
                key={coach.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/coaches/${coach.id}`)}
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    size="md"
                    fallback={`${coach.first_name} ${coach.last_name}`}
                  />
                  <div>
                    <h3 className="font-medium">
                      {coach.first_name} {coach.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{coach.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {(coach as { assigned_couples_count?: number }).assigned_couples_count || 0} couples
                  </span>
                  <StatusBadge status={coach.status as StatusType} />
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === coach.id ? null : coach.id);
                      }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {activeMenu === coach.id && (
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
                              handleEdit(coach);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(coach);
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

      {/* Coach Form Modal */}
      <CoachForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        coach={editingCoach}
      />
    </div>
  );
}
