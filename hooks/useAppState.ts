import { useState, useCallback } from 'react';
import { ViewMode } from '../types';

interface AppState {
  viewMode: ViewMode;
  sidebarOpen: boolean;
  selectedCoachId: string | null;
  selectedCoupleId: string | null;
}

const initialState: AppState = {
  viewMode: 'list',
  sidebarOpen: true,
  selectedCoachId: null,
  selectedCoupleId: null,
};

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const selectCoach = useCallback((coachId: string | null) => {
    setState(prev => ({ ...prev, selectedCoachId: coachId }));
  }, []);

  const selectCouple = useCallback((coupleId: string | null) => {
    setState(prev => ({ ...prev, selectedCoupleId: coupleId }));
  }, []);

  return {
    ...state,
    setViewMode,
    toggleSidebar,
    selectCoach,
    selectCouple,
  };
}
