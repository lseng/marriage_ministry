import { useState, useEffect, useCallback } from 'react';
import * as couplesService from '../services/couples';
import type { Couple } from '../types/database';

type CoupleWithCoach = Couple & { coach?: { first_name: string; last_name: string } | null };

interface UseCouplesResult {
  couples: CoupleWithCoach[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCouple: (data: couplesService.CreateCoupleData) => Promise<Couple>;
  updateCouple: (id: string, data: couplesService.UpdateCoupleData) => Promise<Couple>;
  deleteCouple: (id: string) => Promise<void>;
  assignCoach: (coupleId: string, coachId: string | null) => Promise<Couple>;
}

export function useCouples(): UseCouplesResult {
  const [couples, setCouples] = useState<CoupleWithCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCouples = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await couplesService.getCouplesWithCoach();
      setCouples(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch couples');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCouples();
  }, [fetchCouples]);

  const createCouple = async (data: couplesService.CreateCoupleData): Promise<Couple> => {
    const couple = await couplesService.createCouple(data);
    await fetchCouples();
    return couple;
  };

  const updateCouple = async (id: string, data: couplesService.UpdateCoupleData): Promise<Couple> => {
    const couple = await couplesService.updateCouple(id, data);
    await fetchCouples();
    return couple;
  };

  const deleteCouple = async (id: string): Promise<void> => {
    await couplesService.deleteCouple(id);
    await fetchCouples();
  };

  const assignCoach = async (coupleId: string, coachId: string | null): Promise<Couple> => {
    const couple = await couplesService.assignCoach(coupleId, coachId);
    await fetchCouples();
    return couple;
  };

  return {
    couples,
    loading,
    error,
    refresh: fetchCouples,
    createCouple,
    updateCouple,
    deleteCouple,
    assignCoach,
  };
}

interface UseCoachOptionsResult {
  coaches: Array<{ id: string; name: string }>;
  loading: boolean;
}

export function useCoachOptions(): UseCoachOptionsResult {
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const data = await couplesService.getCoachOptions();
        setCoaches(data);
      } catch (err) {
        console.error('Failed to fetch coach options:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCoaches();
  }, []);

  return { coaches, loading };
}
