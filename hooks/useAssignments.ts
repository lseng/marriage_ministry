import { useState, useEffect, useCallback } from 'react';
import * as assignmentsService from '../services/assignments';
import { useAuth } from '../contexts/AuthContext';

interface UseAssignmentsResult {
  assignments: assignmentsService.AssignmentWithStats[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createAssignment: (data: assignmentsService.CreateAssignmentData) => Promise<void>;
  updateAssignment: (id: string, data: assignmentsService.UpdateAssignmentData) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  distributeAssignment: (options: assignmentsService.DistributeOptions) => Promise<number>;
}

export function useAssignments(): UseAssignmentsResult {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<assignmentsService.AssignmentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assignmentsService.getAssignments();
      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = async (data: assignmentsService.CreateAssignmentData): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    await assignmentsService.createAssignment(data, user.id);
    await fetchAssignments();
  };

  const updateAssignment = async (id: string, data: assignmentsService.UpdateAssignmentData): Promise<void> => {
    await assignmentsService.updateAssignment(id, data);
    await fetchAssignments();
  };

  const deleteAssignment = async (id: string): Promise<void> => {
    await assignmentsService.deleteAssignment(id);
    await fetchAssignments();
  };

  const distributeAssignment = async (options: assignmentsService.DistributeOptions): Promise<number> => {
    const count = await assignmentsService.distributeAssignment(options);
    await fetchAssignments();
    return count;
  };

  return {
    assignments,
    loading,
    error,
    refresh: fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    distributeAssignment,
  };
}
