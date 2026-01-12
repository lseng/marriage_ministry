import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';
import { LoadingSpinner } from '../ui/loading-spinner';
import { AssignmentForm, AssignmentFormData } from './AssignmentForm';
import { DistributeModal } from './DistributeModal';
import { useAssignments } from '../../hooks/useAssignments';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, ClipboardList, MoreVertical, Edit, Trash2, Send, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '../../lib/date';

export function AssignmentsList() {
  const { role } = useAuth();
  const { assignments, loading, error, createAssignment, updateAssignment, deleteAssignment, distributeAssignment } = useAssignments();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<typeof assignments[0] | null>(null);
  const [distributingAssignment, setDistributingAssignment] = useState<typeof assignments[0] | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const isAdmin = role === 'admin';

  const filteredAssignments = assignments.filter((assignment) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      assignment.title.toLowerCase().includes(searchLower) ||
      (assignment.description?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const handleSubmit = async (data: AssignmentFormData) => {
    if (editingAssignment) {
      await updateAssignment(editingAssignment.id, data);
    } else {
      await createAssignment(data);
    }
    setEditingAssignment(null);
  };

  const handleEdit = (assignment: typeof assignments[0]) => {
    setEditingAssignment(assignment);
    setIsFormOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (assignment: typeof assignments[0]) => {
    if (window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
      await deleteAssignment(assignment.id);
    }
    setActiveMenu(null);
  };

  const handleDistribute = async (target: 'all' | 'coach', coachId?: string): Promise<number> => {
    if (!distributingAssignment) return 0;
    return distributeAssignment({
      assignmentId: distributingAssignment.id,
      target,
      coachId,
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAssignment(null);
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
          title="Error loading assignments"
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
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground mt-2">
            Manage weekly assignments for couples
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </header>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {filteredAssignments.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={ClipboardList}
            title={searchQuery ? 'No assignments found' : 'No assignments yet'}
            description={
              searchQuery
                ? 'Try adjusting your search query'
                : isAdmin
                ? 'Create your first assignment to get started.'
                : 'No assignments have been created yet.'
            }
            action={
              isAdmin && !searchQuery
                ? {
                    label: 'Create Assignment',
                    onClick: () => setIsFormOpen(true),
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <Card key={assignment.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">
                      Week {assignment.week_number}
                    </Badge>
                    <div>
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-muted-foreground mt-1">{assignment.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    {assignment.due_date && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Due: {formatDate(assignment.due_date)}
                      </span>
                    )}
                    {assignment.total_distributed > 0 && (
                      <>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Send className="h-4 w-4" />
                          {assignment.total_distributed} distributed
                        </span>
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {assignment.completed_count} completed
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDistributingAssignment(assignment)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Distribute
                    </Button>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === assignment.id ? null : assignment.id)}
                        className="p-2 hover:bg-muted rounded"
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {activeMenu === assignment.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenu(null)}
                          />
                          <div className="absolute right-0 top-10 z-20 w-32 rounded-md border bg-popover shadow-md">
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                              onClick={() => handleEdit(assignment)}
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                              onClick={() => handleDelete(assignment)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Form Modal */}
      <AssignmentForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        assignment={editingAssignment}
      />

      {/* Distribute Modal */}
      {distributingAssignment && (
        <DistributeModal
          isOpen={!!distributingAssignment}
          onClose={() => setDistributingAssignment(null)}
          onDistribute={handleDistribute}
          assignmentTitle={distributingAssignment.title}
        />
      )}
    </div>
  );
}
