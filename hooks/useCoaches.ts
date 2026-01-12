import { useState, useEffect, useCallback } from 'react';
import * as coachesService from '../services/coaches';
import type { Coach } from '../types/database';

interface UseCoachesResult {
  coaches: Coach[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCoach: (data: coachesService.CreateCoachData) => Promise<Coach>;
  updateCoach: (id: string, data: coachesService.UpdateCoachData) => Promise<Coach>;
  deleteCoach: (id: string) => Promise<void>;
}

export function useCoaches(): UseCoachesResult {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoaches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await coachesService.getCoaches();

      // Get assigned couples count for each coach
      const coachesWithCount = await Promise.all(
        data.map(async (coach) => {
          const count = await coachesService.getCoachAssignedCouplesCount(coach.id);
          return { ...coach, assigned_couples_count: count };
        })
      );

      setCoaches(coachesWithCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coaches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  const createCoach = async (data: coachesService.CreateCoachData): Promise<Coach> => {
    const coach = await coachesService.createCoach(data);
    await fetchCoaches();
    return coach;
  };

  const updateCoach = async (id: string, data: coachesService.UpdateCoachData): Promise<Coach> => {
    const coach = await coachesService.updateCoach(id, data);
    await fetchCoaches();
    return coach;
  };

  const deleteCoach = async (id: string): Promise<void> => {
    await coachesService.deleteCoach(id);
    await fetchCoaches();
  };

  return {
    coaches,
    loading,
    error,
    refresh: fetchCoaches,
    createCoach,
    updateCoach,
    deleteCoach,
  };
}

interface UseCoachResult {
  coach: Coach | null;
  couples: Array<{
    id: string;
    husband_first_name: string;
    wife_first_name: string;
    husband_last_name: string;
    email: string;
    status: string;
  }>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCoach(id: string | null): UseCoachResult {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [couples, setCouples] = useState<UseCoachResult['couples']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoach = useCallback(async () => {
    if (!id) {
      setCoach(null);
      setCouples([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await coachesService.getCoachWithCouples(id);
      if (result) {
        setCoach(result.coach);
        setCouples(result.couples);
      } else {
        setCoach(null);
        setCouples([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coach');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCoach();
  }, [fetchCoach]);

  return {
    coach,
    couples,
    loading,
    error,
    refresh: fetchCoach,
  };
}
